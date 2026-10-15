import {planDirectOperation,type BufferedOperationChoice} from './directHandoffPlan';
import {prepareBodyRun,type BodyRunInput} from './bodyRunInput';
import {bodyAvailableAt,type BodyEvent} from './bodyState';
import {applyBufferedBodyEvent} from './bufferedBodyState';
import {previewAssemblyDispatch,previewEmptyDispatch,type AssemblyDispatch,type TransportDeviceReservation} from './assemblyDispatch';
import {createCartBook,finishCartMovement} from './transportState';
import {resolveTransportTime} from './transportTime';
import {MaterialStockRun} from './materialStock';
import type {AssemblyTransportMovement} from './workerSchedule';
import {parseDomainProjectV6,type DomainProjectV6} from './domainProject';
import {topologicalSort} from './validation';
import {createWorkerRunPlan} from './workerRunPlan';
import {sharedAvailability} from './resourceCalendar';
import {projectWork} from './workProjection';
import {createWorkerReservationBook,reserveWorkerTeam,releaseWorkerTeam} from './workerReservations';
import {createBufferBook,applyBufferEvent,bufferHasSpace,type BufferRef,type BufferBook} from './bufferState';
import type {StationCandidate} from './stationRouting';
import type {WorkerScheduleRun,WorkerScheduleResult} from './workerSchedule';

export interface BufferedProcessEvent {job:number;atSeconds:number;kind:'input'|'output'|'handoff'|'blocked'|'released';stationId:string;copy:number}
type Stage={job:number;step:number;ready:number;status:'outside'|'input'|'processing'|'blocked'|'output'|'moving'|'finished';run?:number;direct?:true;transport?:WorkerScheduleRun['transport'];causes:Set<WorkerScheduleRun['waitCauses'][number]>};
const copyKey=(ref:{stationId:string;copy:number})=>JSON.stringify([ref.stationId,ref.copy]);

/** Bounded linear path. Physical transport and assumed JIT availability remain explicit separate modes. */
export function scheduleBufferedProcess(input:DomainProjectV6,interval:number,batch:number,onProgress?:(done:number,total:number)=>void,physicalInput?:{bodyInput?:BodyRunInput}):WorkerScheduleResult{
  const project=parseDomainProjectV6(JSON.stringify(input)),steps=topologicalSort(project.operations);
  const physical=physicalInput!==undefined;
  if(physical&&(!project.assemblyTransport||project.operations.some(operation=>operation.physicalRole?.kind!=='body-work')))
    throw new Error('3.5b2c2: ograniczona pojemność buforów z fizycznym transportem wymaga jawnych ról korpusu i zasobów transportu montażu.');
  if(physical&&project.subassemblyFlow?.lots.length)throw new Error('3.5b2c2: bufory z partiami podzespołów wymagają dalszej integracji; nie pomijamy partii.');
  const bodyRun=physical?prepareBodyRun(project,batch,physicalInput.bodyInput):undefined;
  let bodyBook=bodyRun?.book;
  const bodyEvents:BodyEvent[]=[],transportMovements:AssemblyTransportMovement[]=[];
  let carts=createCartBook(project,(physical?project.assemblyTransport!.carts:[]).map(({afterUnload,source,...cart})=>cart));
  let devices:readonly TransportDeviceReservation[]=[];
  const returnLocks=new Set<string>(),returns=new Map<string,string>();
  const stock=physical&&project.materialSupply?.items.length?new MaterialStockRun(project):undefined;
  if(!steps.length||steps.length*batch>5000)throw new Error('Podgląd buforów dopuszcza 1–5000 wykonań.');
  if(steps.some((step,i)=>step.predecessorIds.length!==(i?1:0)||(i&&step.predecessorIds[0]!==steps[i-1].id)))throw new Error('3.5b2: podgląd buforów wymaga jednego ciągu operacji; gałęzie są poza tym zakresem.');
  if(!project.workerRunSelection)throw new Error('Brak zapisanego wyboru składu przebiegu.');
  const plan=createWorkerRunPlan(project,project.workerRunSelection.teamWorkerIds,project.workerRunSelection.operations);
  const operations=steps.map(step=>plan.operations.find(operation=>operation.operationId===step.id)!);
  const profiles=steps.map((step,i)=>project.operations.find(operation=>operation.id===step.id)!.staffing!.timeVariants.find(variant=>variant.workerCount===operations[i].workerCount)!.timeProfile);
  const candidates:StationCandidate[]=steps.map(step=>{
    const declared=project.stationRouting?.operations.find(operation=>operation.operationId===step.id);
    if(project.stationRouting&&!declared)throw new Error(`Operacja ${step.id}: brak jawnych dopuszczeń kopii stanowisk.`);
    const station=project.stations.find(station=>station.operationIds.includes(step.id));
    const count=station?project.stationSettings[station.id]?.parallelStations:undefined;
    const refs=declared?.candidates??(station&&count?Array.from({length:count},(_,i)=>({stationId:station.id,copy:i+1,requiredEquipmentIds:[]})):[]);
    if(refs.length!==1)throw new Error('3.5b2: podgląd buforów wymaga jednej jawnej kopii dla każdej operacji.');
    return refs[0];
  });
  let buffers=createBufferBook(project);
  // Undeclared copies retain the existing unlimited capacity, not a fabricated finite limit.
  const places=[...buffers.places];
  for(const candidate of candidates)for(const side of ['input','output'] as const)if(!places.some(place=>copyKey(place)===copyKey(candidate)&&place.side===side))places.push({stationId:candidate.stationId,copy:candidate.copy,side,capacity:null});
  buffers={...buffers,places};
  const ref=(step:number,side:'input'|'output'):BufferRef=>({stationId:candidates[step].stationId,copy:candidates[step].copy,side});
  const place=(step:number,side:'input'|'output')=>places.find(place=>copyKey(place)===copyKey(candidates[step])&&place.side===side)!;
  if(place(steps.length-1,'output').capacity!==null)throw new Error('3.5b2b: ograniczony bufor końcowy wymaga jawnego odbioru gotowych wyrobów; także w trybie JIT nie dopowiadamy wyjścia.');
  if(physical){
    if(candidates.some((candidate,i)=>i&&copyKey(candidate)===copyKey(candidates[i-1])))throw new Error('3.5b2c2: kolejne operacje tej samej kopii wymagają lokalnego przekazania; ten zakres jeszcze nie jest podłączony.');
    for(const id of bodyRun!.bodyByJob.values())if(!bodyAvailableAt(bodyBook!,id,candidates[0]))throw new Error('3.5b2c2: jawna lokalizacja początkowa korpusu musi wskazywać pierwszą kopię procesu.');
  }
  const retainsWorkers=places.some(place=>place.side==='output'&&place.capacity!==null&&place.blockingPolicy==='bbas');
  operations.forEach((operation,i)=>{
    if(retainsWorkers&&(operation.reserveFromSeconds!==0||operation.reserveUntilSeconds!==operation.durationSeconds))throw new Error('3.5b2b: polityka zatrzymania operatora wymaga w tym zakresie obecności przez całą każdą operację; częściowa obecność wymaga dalszej integracji.');
    if(stock&&!stock.permits(steps[i].id,candidates[i].stationId))throw new Error('Zaopatrzenie: stanowisko zapasu nie pasuje do operacji.');
    if(project.resourceCalendars&&!project.resourceCalendars.stations[candidates[i].stationId])throw new Error('Stanowisko: brak jawnego kalendarza.');
  });
  for(const id of plan.teamWorkerIds)if(project.resourceCalendars&&!project.resourceCalendars.workers[id])throw new Error(`Pracownik ${id}: brak jawnego kalendarza.`);
  const jobs=Array.from({length:batch},(_,i)=>({id:i+1,arrival:i*interval,starts:Array(steps.length).fill(Infinity),ends:Array(steps.length).fill(Infinity),finish:Infinity}));
  const stages:Stage[]=jobs.map(job=>({job:job.id,step:0,ready:job.arrival,status:'outside',causes:new Set()}));
  const runs:WorkerScheduleRun[]=[],active=new Set<number>(),held=new Set<number>(),bufferEvents:BufferedProcessEvent[]=[];
  let book=createWorkerReservationBook(physical?project.workers.map(worker=>worker.id):plan.teamWorkerIds),completed=0,sequence=0;
  const events:{at:number;order:number;kind:'arrival'|'completion'|'release'|'wake'|'transport';stage?:Stage;run?:number;dispatch?:AssemblyDispatch;purpose?:AssemblyTransportMovement['purpose']}[]=jobs.map(job=>({at:job.arrival,order:sequence++,kind:'arrival'}));
  const push=(at:number,kind:'completion'|'release'|'wake',stage?:Stage,run?:number)=>{if(!Number.isFinite(at))throw new Error('Bufory: niepoprawny czas zdarzenia.');events.push({at,kind,stage,run,order:sequence++});};
  const token=(stage:Stage)=>physical?bodyRun!.bodyByJob.get(stage.job)!:`job:${stage.job}`;
  const log=(stage:Stage,kind:BufferedProcessEvent['kind'],now:number,step=stage.step)=>bufferEvents.push({job:stage.job,kind,atSeconds:now,stationId:candidates[step].stationId,copy:candidates[step].copy});
  const release=(stage:Stage,now:number)=>{
    const index=stage.run!,run=runs[index],id=`${run.job}:${run.operationId}`,reservation=book.reservations.find(reservation=>reservation.reservationId===id)!;
    if(reservation.releasedAtSeconds===undefined){
      if(held.has(index))book={...book,reservations:book.reservations.map(value=>value.reservationId===id?{...value,endSeconds:now}:value)};
      book=releaseWorkerTeam(book,id,now);run.reserveEndSeconds=now;
    }
    active.delete(index);held.delete(index);run.stationReleaseSeconds=now;run.blockedSeconds=now-run.endSeconds;
    log(stage,'released',now,stage.step-1);
  };
  const deposit=(stage:Stage,side:'input'|'output',now:number,step=stage.step)=>{
    if(physical&&side==='output'){
      const event={kind:'release' as const,bodyId:token(stage),atSeconds:now,operationId:steps[step].id};
      const next=applyBufferedBodyEvent({bodies:bodyBook!,buffers},{...event,kind:'complete-to-output',to:ref(step,side)});
      bodyBook=next.bodies;buffers=next.buffers;bodyEvents.push(event);
    }else{
      buffers=applyBufferEvent(buffers,{kind:'reserve',id:token(stage),to:ref(step,side),atSeconds:now});
      buffers=applyBufferEvent(buffers,{kind:'arrive',id:token(stage),atSeconds:now});
    }
    log(stage,side,now,step);
  };
  const recordRun=(stage:Stage,chosen:BufferedOperationChoice,start:number,holdFrom?:number)=>{
    const runIndex=runs.length,id=`${stage.job}:${steps[stage.step].id}`,target=candidates[stage.step];
    book=reserveWorkerTeam(book,{reservationId:id,workerIds:chosen.workers,startSeconds:chosen.from,endSeconds:chosen.until});
    stock?.reserve(stage.job,steps[stage.step].id,start);
    const end=chosen.projection.end;
    runs.push({job:stage.job,operationId:steps[stage.step].id,stationId:target.stationId,copy:target.copy,workerIds:chosen.workers,
      equipmentIds:target.requiredEquipmentIds,readySeconds:stage.ready,startSeconds:start,endSeconds:end,
      waitSeconds:start-stage.ready-(stage.transport?stage.transport.endSeconds-stage.transport.startSeconds:0),
      waitCauses:[...stage.causes],reserveStartSeconds:chosen.from,reserveEndSeconds:chosen.until,workWindows:chosen.projection.workWindows,pauses:chosen.projection.pauses,
      ...(holdFrom!==undefined?{stationReserveStartSeconds:holdFrom}:{}),
      ...(physical?{bodyId:token(stage),...(stage.transport?{transport:stage.transport}:{})}:{})});
    stage.transport=undefined;stage.run=runIndex;stage.status='processing';active.add(runIndex);
    jobs[stage.job-1].starts[stage.step]=start;jobs[stage.job-1].ends[stage.step]=end;
    push(end,'completion',stage,runIndex);if(chosen.until<end)push(chosen.until,'release',stage,runIndex);
  };
  onProgress?.(0,steps.length*batch);
  while(events.length){
    events.sort((a,b)=>a.at-b.at||a.order-b.order);const now=events[0].at;
    if(completed<steps.length*batch)stock?.advance(now);
    while(events.length&&events[0].at===now){
      const event=events.shift()!;
      if(event.kind==='transport'){
        const dispatch=event.dispatch!;
        for(const id of dispatch.equipmentIds)if(carts.carts.some(cart=>cart.equipmentId===id)){
          carts=finishCartMovement(carts,id,now);
          if(event.purpose==='return')returnLocks.delete(id);
          else if(event.purpose==='transfer'){
            const declaration=project.assemblyTransport!.carts.find(cart=>cart.equipmentId===id)!;
            const current=carts.carts.find(cart=>cart.equipmentId===id)!.location!;
            if(declaration.afterUnload==='return-to-initial'&&copyKey(current)!==copyKey(declaration.initialLocation)){
              const route=project.assemblyTransport!.emptyRoutes.find(route=>route.equipmentId===id&&copyKey(route.from)===copyKey(current)&&copyKey(route.to)===copyKey(declaration.initialLocation));
              if(!route)throw new Error('Transport: zadeklarowany powrót wymaga jawnej trasy do lokalizacji początkowej.');
              returns.set(id,route.id);returnLocks.add(id);
            }
          }
        }
        if(dispatch.workerIds.length)book=releaseWorkerTeam(book,dispatch.reservationId,now);
        if(event.purpose==='transfer'){
          const stage=event.stage!;
          if(stage.direct){
            const run=runs[stage.run!],basis=profiles[stage.step].durationBasis==='measured'?'confirmed' as const:'assumed' as const;
            const next=applyBufferedBodyEvent({bodies:bodyBook!,buffers},{kind:'arrive-direct',bodyId:token(stage),atSeconds:now,
              operationId:run.operationId,endSeconds:run.endSeconds,basis});
            bodyBook=next.bodies;buffers=next.buffers;
            bodyEvents.push({kind:'finish-transfer',bodyId:token(stage),atSeconds:now},{kind:'reserve',bodyId:token(stage),atSeconds:now,operationId:run.operationId,endSeconds:run.endSeconds,basis});
            stock?.consume(stage.job,run.operationId,now);stage.direct=undefined;stage.status='processing';log(stage,'handoff',now);
          }else{
            const next=applyBufferedBodyEvent({bodies:bodyBook!,buffers},{kind:'arrive',bodyId:token(stage),atSeconds:now});
            bodyBook=next.bodies;buffers=next.buffers;bodyEvents.push({kind:'finish-transfer',bodyId:token(stage),atSeconds:now});
            stage.status='input';log(stage,'input',now);
          }
        }
      }else if(event.kind==='release'){
        const run=runs[event.run!];book=releaseWorkerTeam(book,`${run.job}:${run.operationId}`,now);
      }else if(event.kind==='completion'){
        const stage=event.stage!,old=stage.step;stage.step++;stage.ready=now;stage.causes=new Set();
        completed++;onProgress?.(completed,steps.length*batch);
        if(old===steps.length-1){deposit(stage,'output',now,old);release(stage,now);stage.status='finished';jobs[stage.job-1].finish=now;}
        else if(place(old,'output').capacity!==0&&bufferHasSpace(buffers,ref(old,'output'))){deposit(stage,'output',now,old);release(stage,now);stage.status='output';}
        else{stage.status='blocked';stage.causes.add('buffer');log(stage,'blocked',now,old);
          if(place(old,'output').blockingPolicy==='bbas')held.add(stage.run!);
          else{const run=runs[stage.run!],id=`${run.job}:${run.operationId}`;if(book.reservations.find(reservation=>reservation.reservationId===id)!.releasedAtSeconds===undefined)book=releaseWorkerTeam(book,id,now);}
        }
      }
    }
    const wakes=new Set<number>();const wake=(at:number)=>{if(Number.isFinite(at)&&at>now)wakes.add(at);};
    const heldWorkers=()=>new Set([...held].flatMap(index=>[...runs[index].workerIds]));
    const publish=(dispatch:AssemblyDispatch,purpose:AssemblyTransportMovement['purpose'],stage?:Stage)=>{
      book=dispatch.workers;carts=dispatch.carts;devices=dispatch.devices;
      transportMovements.push({kind:purpose==='transfer'?'loaded':'empty',purpose,routeId:dispatch.routeId,workerIds:dispatch.workerIds,
        equipmentIds:dispatch.equipmentIds,startSeconds:dispatch.startSeconds,endSeconds:dispatch.endSeconds});
      events.push({kind:'transport',at:dispatch.endSeconds,order:sequence++,dispatch,purpose,stage});
    };
    let transportFailure='';
    let changed=true;
    while(changed){
      changed=false;
      for(const [id,routeId] of returns){
        const route=project.assemblyTransport!.emptyRoutes.find(route=>route.id===routeId)!;
        if(route.workerAssignment?.workerIds.some(id=>heldWorkers().has(id)))continue;
        try{
          const dispatch=previewEmptyDispatch(project,routeId,carts,book,devices,now,`return:${id}:${now}`);
          if(dispatch.startSeconds>now){wake(dispatch.startSeconds);continue;}
          publish(dispatch,'return');returns.delete(id);changed=true;
        }catch(error){transportFailure=(error as Error).message;}
      }
      for(const stage of [...stages].sort((a,b)=>(physical?Number(b.status==='output'||b.status==='blocked')-Number(a.status==='output'||a.status==='blocked'):0)||a.ready-b.ready||a.job-b.job)){
        if(stage.ready>now||stage.status==='processing'||stage.status==='finished'||stage.status==='moving')continue;
        if(stage.status==='blocked'&&place(stage.step-1,'output').capacity!==0){
          if(bufferHasSpace(buffers,ref(stage.step-1,'output'))){deposit(stage,'output',now,stage.step-1);release(stage,now);stage.status='output';changed=true;}
          else continue;
        }
        const target=candidates[stage.step],inputPlace=place(stage.step,'input');
        if(physical&&(stage.status==='output'||stage.status==='blocked')){
          const fromOperation=stage.status==='blocked',direct=inputPlace.capacity===0,own=fromOperation?stage.run:undefined;
          if(!direct&&!bufferHasSpace(buffers,ref(stage.step,'input'))){stage.causes.add('buffer');continue;}
          const route=project.stationRouting?.routes.find(route=>copyKey(route.from)===copyKey(candidates[stage.step-1])&&copyKey(route.to)===copyKey(target));
          if(!route||!resolveTransportTime(route))throw new Error('Transport buforów: brak jawnej trasy i czasu pomiędzy kopiami.');
          const blocked=new Set([...held].filter(index=>index!==own).flatMap(index=>[...runs[index].workerIds])),allHeld=heldWorkers(),rules=project.assemblyTransport!;
          // Unknown blocking ends must never be treated as finite available worker windows.
          const availableProject={...project,assemblyTransport:{...rules,
            routes:rules.routes.map(rule=>({...rule,alternatives:rule.alternatives.filter(alt=>!alt.workerIds.some(id=>blocked.has(id)))})),
            emptyRoutes:rules.emptyRoutes.filter(route=>!route.workerAssignment?.workerIds.some(id=>allHeld.has(id)))}};
          let committing=false;
          try{
            const planned=previewAssemblyDispatch(availableProject,route.id,carts,book,devices,now,`transfer:${stage.job}:${stage.step}:${now}`,now,returnLocks);
            let dispatch=planned.prefix??planned;
            if(dispatch.startSeconds>now){wake(dispatch.startSeconds);dispatch.waitCauses.forEach(cause=>stage.causes.add(cause));continue;}
            if(planned.prefix){publish(dispatch,'approach');stage.causes.add('transport');changed=true;continue;}
            let directChoice:BufferedOperationChoice|undefined;
            if(direct){
              const arrival=dispatch.endSeconds,duration=arrival-now;
              let resourceReady=true;
              for(const index of active){
                if(index===own)continue;
                const run=runs[index],sameStation=copyKey(run)===copyKey(target),sameEquipment=run.equipmentIds?.some(id=>target.requiredEquipmentIds.includes(id));
                if(!sameStation&&!sameEquipment)continue;
                // Only an unlimited output guarantees release at the recorded processing end.
                const guaranteed=place(steps.findIndex(step=>step.id===run.operationId),'output').capacity===null;
                if(!guaranteed||run.endSeconds>arrival){
                  stage.causes.add(sameStation?'station':'equipment');resourceReady=false;
                  if(guaranteed)wake(run.endSeconds-duration);
                }
              }
              if(!resourceReady)continue;
              const materialAt=stock?.earliest(steps[stage.step].id,arrival)??arrival;
              if(materialAt>arrival){stage.causes.add('material');wake(materialAt-duration);continue;}
              const unsafe=new Set([...active].filter(index=>index!==own&&place(steps.findIndex(step=>step.id===runs[index].operationId),'output').capacity!==null&&place(steps.findIndex(step=>step.id===runs[index].operationId),'output').blockingPolicy==='bbas').flatMap(index=>[...runs[index].workerIds]));
              const admission=planDirectOperation(project,operations[stage.step],target,arrival,dispatch.workers,unsafe);
              if(!admission.choice){if(admission.cause)stage.causes.add(admission.cause);if(admission.retryAt!==undefined)wake(admission.retryAt-duration);continue;}
              directChoice=admission.choice;
            }
            const timing=resolveTransportTime(route)!,basis=timing.basis==='measured'?'confirmed' as const:'assumed' as const;
            let next;
            if(direct)next=applyBufferedBodyEvent({bodies:bodyBook!,buffers},{kind:'depart-direct',bodyId:token(stage),atSeconds:now,
              to:ref(stage.step,'input'),endSeconds:dispatch.endSeconds,basis,...(fromOperation?{releaseOperationId:steps[stage.step-1].id}:{})});
            else if(fromOperation)next=applyBufferedBodyEvent({bodies:bodyBook!,buffers},{kind:'depart-from-operation',bodyId:token(stage),atSeconds:now,
              operationId:steps[stage.step-1].id,to:ref(stage.step,'input'),endSeconds:dispatch.endSeconds,basis});
            else{
              next=applyBufferedBodyEvent({bodies:bodyBook!,buffers},{kind:'reserve-input',bodyId:token(stage),atSeconds:now,to:ref(stage.step,'input')});
              next=applyBufferedBodyEvent(next,{kind:'depart',bodyId:token(stage),atSeconds:now,endSeconds:dispatch.endSeconds,basis});
            }
            committing=true;
            if(fromOperation){
              release(stage,now);
              dispatch={...dispatch,workers:{...dispatch.workers,reservations:dispatch.workers.reservations.map(value=>book.reservations.find(old=>old.reservationId===value.reservationId)??value)}};
              bodyEvents.push({kind:'release',bodyId:token(stage),atSeconds:now,operationId:steps[stage.step-1].id});
            }
            bodyBook=next.bodies;buffers=next.buffers;
            bodyEvents.push({kind:'start-transfer',bodyId:token(stage),atSeconds:now,to:{stationId:target.stationId,copy:target.copy},endSeconds:dispatch.endSeconds,basis:timing.basis==='measured'?'confirmed':'assumed'});
            stage.transport={routeId:route.id,startSeconds:now,endSeconds:dispatch.endSeconds,basis:timing.basis,breakdown:timing.breakdown,
              workerIds:dispatch.workerIds,equipmentIds:dispatch.equipmentIds};
            publish(dispatch,'transfer',stage);
            if(directChoice){recordRun(stage,directChoice,dispatch.endSeconds,dispatch.endSeconds);stage.direct=true;}
            stage.status='moving';changed=true;
          }catch(error){if(committing)throw error;transportFailure=(error as Error).message;stage.causes.add('transport');}
          continue;
        }
        if(stage.status!=='input'&&inputPlace.capacity!==0){
          if(!bufferHasSpace(buffers,ref(stage.step,'input'))){stage.causes.add('buffer');continue;}
          if(stage.status==='output'){
            buffers=applyBufferEvent(buffers,{kind:'reserve',id:token(stage),to:ref(stage.step,'input'),atSeconds:now});
            buffers=applyBufferEvent(buffers,{kind:'depart',id:token(stage),atSeconds:now});
            buffers=applyBufferEvent(buffers,{kind:'arrive',id:token(stage),atSeconds:now});log(stage,'handoff',now);
          }else{deposit(stage,'input',now);if(stage.status==='blocked')release(stage,now);}
          stage.status='input';changed=true;
        }
        const ignore=stage.status==='blocked'?stage.run:undefined;
        if([...active].some(index=>index!==ignore&&copyKey(runs[index])===copyKey(target))){stage.causes.add('station');continue;}
        if([...active].some(index=>index!==ignore&&runs[index].equipmentIds?.some(id=>target.requiredEquipmentIds.includes(id)))){stage.causes.add('equipment');continue;}
        if(stock){const at=stock.earliest(steps[stage.step].id,now);if(at>now){stage.causes.add('material');wake(at);continue;}}
        const operation=operations[stage.step];let selected:BufferedOperationChoice|undefined,combinations=0;
        const choose=(workers:string[],from:number)=>{
          if(selected)return;
          if(workers.length<operation.workerCount){for(let i=from;i<=operation.eligibleWorkerIds.length-(operation.workerCount-workers.length);i++)choose([...workers,operation.eligibleWorkerIds[i]],i+1);return;}
          if(++combinations>10000)throw new Error('Bufory: zbyt wiele kombinacji pracowników.');
          if([...active].some(index=>index!==ignore&&place(steps.findIndex(step=>step.id===runs[index].operationId),'output').capacity!==null&&place(steps.findIndex(step=>step.id===runs[index].operationId),'output').blockingPolicy==='bbas'&&runs[index].workerIds.some(id=>workers.includes(id)))){stage.causes.add('workers');return;}
          const windows=project.resourceCalendars?sharedAvailability(project.resourceCalendars,target.stationId,workers):[{startSeconds:now,endSeconds:now+operation.durationSeconds}];
          const next=windows.find(window=>window.endSeconds>now);if(!next)return;
          const start=Math.max(now,next.startSeconds),projection=projectWork(windows,start,operation.durationSeconds);if(!projection)return;
          if(start>now){stage.causes.add('calendar');wake(start);return;}
          const reserveStart=projection.atOffset(operation.reserveFromSeconds,false),reserveEnd=projection.atOffset(operation.reserveUntilSeconds,true);
          const conflicts=book.reservations.filter(reservation=>reservation.startSeconds<reserveEnd&&reserveStart<reservation.endSeconds&&reservation.workerIds.some(id=>workers.includes(id)));
          if(conflicts.length){stage.causes.add('workers');conflicts.forEach(conflict=>wake(conflict.endSeconds));return;}
          selected={workers,projection,from:reserveStart,until:reserveEnd};
        };
        choose([],0);if(!selected)continue;
        const chosen=selected as NonNullable<typeof selected>;
        if(stage.status==='blocked')release(stage,now);
        if(physical){
          const event={kind:'reserve' as const,bodyId:token(stage),atSeconds:now,operationId:steps[stage.step].id,endSeconds:chosen.projection.end,
            basis:profiles[stage.step].durationBasis==='measured'?'confirmed' as const:'assumed' as const};
          const next=applyBufferedBodyEvent({bodies:bodyBook!,buffers},{...event,kind:inputPlace.capacity===0?'start-direct':'start-operation'});
          bodyBook=next.bodies;buffers=next.buffers;bodyEvents.push(event);
        }else if(stage.status==='input'||stage.status==='output')buffers=applyBufferEvent(buffers,{kind:'remove',id:token(stage),atSeconds:now});
        if(stage.status!=='input')log(stage,'handoff',now);
        recordRun(stage,chosen,now);stock?.consume(stage.job,steps[stage.step].id,now);changed=true;
      }
    }
    wakes.forEach(at=>push(at,'wake'));
    if(!events.length&&(returns.size||stages.some(stage=>stage.status!=='finished'))&&transportFailure)
      throw new Error(`Bufory: zakleszczenie lub brak wykonalnego transportu. ${transportFailure}`);
  }
  if(returns.size||returnLocks.size||stages.some(stage=>stage.status!=='finished')||active.size||book.reservations.some(reservation=>reservation.releasedAtSeconds===undefined))throw new Error('Bufory: zakleszczenie lub brak okna pracowników/kalendarzy; nie ukończono całego przebiegu.');
  return {mode:project.resourceCalendars?'calendar':'logical',...(!physical?{transportMode:'just-in-time' as const}:{}),jobs,runs,reservations:book,operationIds:steps.map(step=>step.id),bufferBook:buffers,bufferEvents,
    ...(physical?{bodyBook,bodyEvents,cartBook:carts,transportMovements,transportReservations:devices}:{}),
    ...(stock?{materialStocks:stock.stocks,materialEvents:stock.events}: {})};
}
