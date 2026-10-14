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
type Stage={job:number;step:number;ready:number;status:'outside'|'input'|'processing'|'blocked'|'output'|'finished';run?:number;causes:Set<WorkerScheduleRun['waitCauses'][number]>};
const copyKey=(ref:{stationId:string;copy:number})=>JSON.stringify([ref.stationId,ref.copy]);

/** Bounded process-only path: transport is omitted only by the explicit JIT option. */
export function scheduleBufferedProcess(input:DomainProjectV6,interval:number,batch:number,onProgress?:(done:number,total:number)=>void):WorkerScheduleResult{
  const project=parseDomainProjectV6(JSON.stringify(input)),steps=topologicalSort(project.operations);
  if(!steps.length||steps.length*batch>5000)throw new Error('Podgląd buforów dopuszcza 1–5000 wykonań.');
  if(steps.some((step,i)=>step.predecessorIds.length!==(i?1:0)||(i&&step.predecessorIds[0]!==steps[i-1].id)))throw new Error('3.5b2b: podgląd buforów JIT wymaga jednego ciągu operacji; gałęzie są poza tym zakresem.');
  if(!project.workerRunSelection)throw new Error('Brak zapisanego wyboru składu przebiegu.');
  const plan=createWorkerRunPlan(project,project.workerRunSelection.teamWorkerIds,project.workerRunSelection.operations);
  const operations=steps.map(step=>plan.operations.find(operation=>operation.operationId===step.id)!);
  const candidates:StationCandidate[]=steps.map(step=>{
    const declared=project.stationRouting?.operations.find(operation=>operation.operationId===step.id);
    if(project.stationRouting&&!declared)throw new Error(`Operacja ${step.id}: brak jawnych dopuszczeń kopii stanowisk.`);
    const station=project.stations.find(station=>station.operationIds.includes(step.id));
    const count=station?project.stationSettings[station.id]?.parallelStations:undefined;
    const refs=declared?.candidates??(station&&count?Array.from({length:count},(_,i)=>({stationId:station.id,copy:i+1,requiredEquipmentIds:[]})):[]);
    if(refs.length!==1)throw new Error('3.5b2b: pierwszy podgląd buforów JIT wymaga jednej jawnej kopii dla każdej operacji.');
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
  const retainsWorkers=places.some(place=>place.side==='output'&&place.capacity!==null&&place.blockingPolicy==='bbas');
  operations.forEach((operation,i)=>{
    if(retainsWorkers&&(operation.reserveFromSeconds!==0||operation.reserveUntilSeconds!==operation.durationSeconds))throw new Error('3.5b2b: polityka zatrzymania operatora wymaga w tym zakresie obecności przez całą każdą operację; częściowa obecność wymaga dalszej integracji.');
    if(project.resourceCalendars&&!project.resourceCalendars.stations[candidates[i].stationId])throw new Error('Stanowisko: brak jawnego kalendarza.');
  });
  for(const id of plan.teamWorkerIds)if(project.resourceCalendars&&!project.resourceCalendars.workers[id])throw new Error(`Pracownik ${id}: brak jawnego kalendarza.`);
  const jobs=Array.from({length:batch},(_,i)=>({id:i+1,arrival:i*interval,starts:Array(steps.length).fill(Infinity),ends:Array(steps.length).fill(Infinity),finish:Infinity}));
  const stages:Stage[]=jobs.map(job=>({job:job.id,step:0,ready:job.arrival,status:'outside',causes:new Set()}));
  const runs:WorkerScheduleRun[]=[],active=new Set<number>(),held=new Set<number>(),bufferEvents:BufferedProcessEvent[]=[];
  let book=createWorkerReservationBook(plan.teamWorkerIds),completed=0,sequence=0;
  const events:{at:number;order:number;kind:'arrival'|'completion'|'release'|'wake';stage?:Stage;run?:number}[]=jobs.map(job=>({at:job.arrival,order:sequence++,kind:'arrival'}));
  const push=(at:number,kind:'completion'|'release'|'wake',stage?:Stage,run?:number)=>{if(!Number.isFinite(at))throw new Error('Bufory: niepoprawny czas zdarzenia.');events.push({at,kind,stage,run,order:sequence++});};
  const token=(stage:Stage)=>`job:${stage.job}`;
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
    buffers=applyBufferEvent(buffers,{kind:'reserve',id:token(stage),to:ref(step,side),atSeconds:now});
    buffers=applyBufferEvent(buffers,{kind:'arrive',id:token(stage),atSeconds:now});log(stage,side,now,step);
  };
  onProgress?.(0,steps.length*batch);
  while(events.length){
    events.sort((a,b)=>a.at-b.at||a.order-b.order);const now=events[0].at;
    while(events.length&&events[0].at===now){
      const event=events.shift()!;
      if(event.kind==='release'){
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
    let changed=true;
    while(changed){
      changed=false;
      for(const stage of [...stages].sort((a,b)=>a.ready-b.ready||a.job-b.job)){
        if(stage.ready>now||stage.status==='processing'||stage.status==='finished')continue;
        if(stage.status==='blocked'&&place(stage.step-1,'output').capacity!==0){
          if(bufferHasSpace(buffers,ref(stage.step-1,'output'))){deposit(stage,'output',now,stage.step-1);release(stage,now);stage.status='output';changed=true;}
          else continue;
        }
        const target=candidates[stage.step],inputPlace=place(stage.step,'input');
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
        const operation=operations[stage.step];let selected:{workers:string[];projection:NonNullable<ReturnType<typeof projectWork>>;from:number;until:number}|undefined,combinations=0;
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
        if(stage.status==='input'||stage.status==='output')buffers=applyBufferEvent(buffers,{kind:'remove',id:token(stage),atSeconds:now});
        if(stage.status!=='input')log(stage,'handoff',now);
        const runIndex=runs.length,id=`${stage.job}:${steps[stage.step].id}`;
        book=reserveWorkerTeam(book,{reservationId:id,workerIds:chosen.workers,startSeconds:chosen.from,endSeconds:chosen.until});
        const end=chosen.projection.end;
        runs.push({job:stage.job,operationId:steps[stage.step].id,stationId:target.stationId,copy:target.copy,workerIds:chosen.workers,
          equipmentIds:target.requiredEquipmentIds,readySeconds:stage.ready,startSeconds:now,endSeconds:end,waitSeconds:now-stage.ready,
          waitCauses:[...stage.causes],reserveStartSeconds:chosen.from,reserveEndSeconds:chosen.until,workWindows:chosen.projection.workWindows,pauses:chosen.projection.pauses});
        stage.run=runIndex;stage.status='processing';active.add(runIndex);changed=true;
        jobs[stage.job-1].starts[stage.step]=now;jobs[stage.job-1].ends[stage.step]=end;
        push(end,'completion',stage,runIndex);if(chosen.until<end)push(chosen.until,'release',stage,runIndex);
      }
    }
    wakes.forEach(at=>push(at,'wake'));
  }
  if(stages.some(stage=>stage.status!=='finished')||active.size||book.reservations.some(reservation=>reservation.releasedAtSeconds===undefined))throw new Error('Bufory: zakleszczenie lub brak okna pracowników/kalendarzy; nie ukończono całego przebiegu.');
  return {mode:project.resourceCalendars?'calendar':'logical',transportMode:'just-in-time',jobs,runs,reservations:book,operationIds:steps.map(step=>step.id),bufferBook:buffers,bufferEvents};
}
