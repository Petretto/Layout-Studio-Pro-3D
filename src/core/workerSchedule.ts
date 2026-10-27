import {projectWork} from './workProjection';
import {planDirectOperation, type BufferedOperationChoice} from './directHandoffPlan';
import {scheduleBufferedProcess} from './bufferedProcessSchedule';
import {MaterialStockRun, type MaterialStock, type MaterialStockEvent} from './materialStock';
import {SubassemblyRun, type SubassemblyLotState, type SubassemblyEvent} from './subassemblyState';
import {SubassemblyBufferRun} from './subassemblyBufferRun';
import {GraphBodyBuffers} from './graphBodyBuffers';
import {previewAssemblyDispatch,previewEmptyDispatch,type AssemblyDispatch,type TransportDeviceReservation} from './assemblyDispatch';
import {createCartBook,finishCartMovement,startCartMovement,type CartBook,type CartMotionRoute} from './transportState';
import {parseDomainProjectV6, domainOperationOrder, type DomainProjectV6} from './domainProject';
import {createWorkerRunPlan} from './workerRunPlan';
import {teamCoversCompetencies} from './competencies';
import {sharedAvailability, type CalendarWindow} from './resourceCalendar';
import {createWorkerReservationBook, releaseWorkerTeam, reserveWorkerTeam,
  type WorkerReservationBook} from './workerReservations';
import type {Job} from './algorithms/simulation';
import type {StationCandidate, StationCopyRef, DeclaredTransportRoute} from './stationRouting';
import {createStationRoutePlan, compareForwardRoutes, createBodyBranchRoutePlan, compareBodyBranchPreferences} from './stationRoutePlan';
import {prepareBodyRun, type BodyRunInput} from './bodyRunInput';
import {applyBodyEvent, bodyAllowsOperation, type BodyBook, type BodyEvent} from './bodyState';
import {matchingConcurrencyGroup} from './physicalConcurrency';
import {resolveTransportTime,type TransportBreakdown,type ResolvedTransportTime} from './transportTime';
import {buildJobVariantMap, resolveChangeover, type ChangeoverRun} from './changeoverMatrix';
import {ProcessStallError, diagnoseUnbufferedProcessStall} from './processStallDetection';

export interface WorkerScheduleRun {
  job: number;
  operationId: string;
  stationId: string;
  copy: number;
  workerIds: readonly string[];
  readySeconds: number;
  startSeconds: number;
  endSeconds: number;
  stationReleaseSeconds?: number;
  blockedSeconds?: number;
  continuationWaitSeconds?: number;
  waitSeconds: number;
  waitCauses: readonly ('workers' | 'station' | 'same-job' | 'calendar' | 'equipment' | 'body' | 'transport' | 'subassembly' | 'material' | 'buffer')[];
  reserveStartSeconds: number;
  reserveEndSeconds: number;
  workWindows: readonly CalendarWindow[];
  pauses: readonly CalendarWindow[];
  equipmentIds?: readonly string[];
  selectionRouteId?: string;
  selectionDistanceMm?: number;
  arrivalRouteId?: string;
  arrivalDistanceMm?: number;
  bodyId?: string;
  stationReserveStartSeconds?: number;
  transport?: {workerIds?: readonly string[]; equipmentIds?: readonly string[]; routeId: string; startSeconds: number; endSeconds: number; basis: 'measured' | 'assumed'; breakdown?:TransportBreakdown};
  variantId?: string;
  changeoverBeforeSeconds?: number;
}

export interface AssemblyTransportMovement {kind:'loaded'|'empty';purpose:'transfer'|'approach'|'return';routeId:string;workerIds:readonly string[];equipmentIds:readonly string[];startSeconds:number;endSeconds:number;lotId?:string}

export type TransportSimulationMode = 'configured' | 'just-in-time';

export interface WorkerScheduleResult {
  bufferBook?: import('./bufferState').BufferBook;
  bufferEvents?: readonly import('./bufferedProcessSchedule').BufferedProcessEvent[];
  materialStocks?: readonly MaterialStock[];
  materialEvents?: readonly MaterialStockEvent[];
  subassemblyLots?: readonly SubassemblyLotState[];
  subassemblyEvents?: readonly SubassemblyEvent[];
  subassemblyBufferBooks?: readonly import('./subassemblyBufferState').SubassemblyBufferBook[];
  transportMode?: 'just-in-time';
  mode: 'logical' | 'calendar';
  jobs: readonly Job[];
  runs: readonly WorkerScheduleRun[];
  reservations: WorkerReservationBook;
  operationIds: readonly string[];
  bodyBook?: BodyBook;
  bodyEvents?: readonly BodyEvent[];
  transportReservations?: readonly TransportDeviceReservation[];
  cartBook?: CartBook;
  transportMovements?: readonly AssemblyTransportMovement[];
  changeovers?: readonly ChangeoverRun[];
}

type EventInput =
  | {kind: 'material-consume'; at: number; job: number; operationId: string}
  | {kind: 'lot-end'; at: number; lotId: string}
  | {kind: 'lot-consume'; at: number; job: number; operationId: string; location: StationCopyRef}
  | {kind: 'arrival'; at: number; job: number}
  | {kind: 'completion'; at: number; job: number; step: number; stationId: string; copy: number}
  | {kind: 'release'; at: number; reservationId: string}
  | {kind: 'transport-end'; at: number; bodyId: string}
  | {kind: 'cart-end'; at: number; equipmentId: string; returnToInitial?: boolean}
  | {kind: 'cart-start'; at: number; route: CartMotionRoute}
  | {kind: 'body-start'; at: number; bodyId: string; operationId: string; end: number; basis: 'confirmed' | 'assumed'}
  | {kind: 'wake'; at: number};
type Event = EventInput & {order: number};

class EventQueue {
  private heap: Event[] = [];
  private sequence = 0;
  private earlier(a: Event, b: Event) { return a.at < b.at || (a.at === b.at && a.order < b.order); }
  get length() { return this.heap.length; }
  peek() { return this.heap[0]; }
  push(event: EventInput) {
    const item = {...event, order: this.sequence++} as Event;
    const heap = this.heap;
    heap.push(item);
    let i = heap.length - 1;
    while (i > 0) {
      const parent = (i - 1) >> 1;
      if (!this.earlier(item, heap[parent])) break;
      heap[i] = heap[parent];
      i = parent;
    }
    heap[i] = item;
  }
  pop(): Event {
    const heap = this.heap;
    const first = heap[0];
    const last = heap.pop()!;
    if (heap.length) {
      let i = 0;
      while (i * 2 + 1 < heap.length) {
        let child = i * 2 + 1;
        if (child + 1 < heap.length && this.earlier(heap[child + 1], heap[child])) child++;
        if (!this.earlier(heap[child], last)) break;
        heap[i] = heap[child];
        i = child;
      }
      heap[i] = last;
    }
    return first;
  }
}

/** Draft-only event schedule. Transport time and physical body state are not inferred. */
function scheduleWorkerRunFixed(project: DomainProjectV6, arrivalIntervalSeconds: number,
  batch: number, bodyInput?: BodyRunInput, onProgress?: (completed: number, total: number) => void, options: {transportMode?: TransportSimulationMode} = {}, recipientCopies: ReadonlyMap<string, StationCandidate> = new Map()): WorkerScheduleResult {
  if (!Number.isFinite(arrivalIntervalSeconds) || arrivalIntervalSeconds <= 0 ||
      !Number.isSafeInteger(batch) || batch < 1 || batch > 10000) {
    throw new Error('Partia: 1–10000; jawny odstęp przybycia musi być dodatni.');
  }
  if(options.transportMode!==undefined&&options.transportMode!=='configured'&&options.transportMode!=='just-in-time')throw new Error('Nieznany tryb transportu symulacji.');
  const justInTime=options.transportMode==='just-in-time';
  const parsed = parseDomainProjectV6(JSON.stringify(project));
  const finiteBodyBuffers=parsed.stationBuffers?.buffers.some(buffer=>buffer.inputCapacity!=null||buffer.outputCapacity!=null);
  if (finiteBodyBuffers && (!parsed.subassemblyFlow || justInTime)) {
    throw new Error('3.5b: ograniczona pojemność buforów z fizycznym transportem oczekuje na integrację. Można jawnie wybrać JIT dla pojedynczego ciągu operacji.');
  }
  const stockRun = !justInTime && parsed.materialSupply?.items.length ? new MaterialStockRun(parsed) : undefined;
  const lotRun = !justInTime && parsed.subassemblyFlow ? new SubassemblyRun(parsed, batch) : undefined;
  const {assemblyTransport:_transport,bodyRunInput:_bodyInput,...processOnly}=parsed;
  // A transient logical process view; saved transport declarations and physical locations remain untouched.
  const checked: DomainProjectV6 = justInTime ? processOnly : parsed;
  let cartBook = createCartBook(checked, (checked.assemblyTransport?.carts ?? []).map(({afterUnload,source,...cart}) => cart));
  let transportDevices: readonly TransportDeviceReservation[] = [];
  const cartLocks = new Map<string,number>();
  const transportMovements: AssemblyTransportMovement[] = [];
  const bodyRun = justInTime ? undefined : prepareBodyRun(checked, batch, bodyInput);
  if(checked.assemblyTransport && !bodyRun && !lotRun) throw new Error('3.4.3: transport zasobowy wymaga fizycznego przebiegu korpusu; transport podzespołów oczekuje na integrację.');
  let bodyBook = bodyRun?.book;
  let bodyBuffers:GraphBodyBuffers|undefined;
  const bodyEvents: BodyEvent[] = [];
  const recordBody = (event: BodyEvent) => {
    const next=bodyBuffers?bodyBuffers.event(bodyBook!,event):applyBodyEvent(bodyBook!,event);
    if(!next)return false;
    bodyBook = next;
    bodyEvents.push(event);
    return true;
  };
  if (!checked.workerRunSelection) throw new Error('Brak zapisanego wyboru składu przebiegu.');
  const domainOperations = new Map(checked.operations.map(operation => [operation.id, operation]));
  const steps = domainOperationOrder(checked).map(operation => domainOperations.get(operation.id)!);
  if (!steps.length || steps.length * batch > 5000) {
    throw new Error('Szkic harmonogramu wymaga operacji i dopuszcza najwyżej 5000 wykonań.');
  }
  const plan = createWorkerRunPlan(checked, checked.workerRunSelection.teamWorkerIds,
    checked.workerRunSelection.operations);
  const calendars = checked.resourceCalendars;
  for (const workerId of plan.teamWorkerIds) if (calendars && !calendars.workers[workerId]) {
    throw new Error(`Pracownik ${workerId}: brak jawnego kalendarza.`);
  }
  const byOperation = new Map(plan.operations.map(item => [item.operationId, item]));
  const stationByOperation = new Map<string, string>();
  for (const station of checked.stations) for (const operationId of station.operationIds) {
    stationByOperation.set(operationId, station.id);
  }
  const copies = new Map<string, boolean[]>();
  const copyReady = new Map<string, number[]>();
  // Resolve a transient execution view. Keep the stored route's parameters as its source of truth.
  const timingByRoute=new Map<string,ResolvedTransportTime>();
  const routing = checked.stationRouting ? {...checked.stationRouting,routes:checked.stationRouting.routes.map(original=>{
    if(justInTime)return original;
    const timing=resolveTransportTime(original);if(timing)timingByRoute.set(original.id,timing);
    const {transportCalculation:_calculation,...route}=original;
    return {...route,...(timing?{transportTime:timing}:{})};
  })} : undefined;
  const candidatesByOperation = new Map<string, StationCandidate[]>();
  for (const step of steps) {
    const declared = routing?.operations.find(item => item.operationId === step.id);
    if (routing && !declared) throw new Error(`Operacja ${step.id}: brak jawnych dopuszczeń kopii stanowisk.`);
    const baseStationId = stationByOperation.get(step.id);
    if (!declared && !baseStationId) throw new Error(`Operacja ${step.id}: brak jawnego przypisania do stanowiska.`);
    const declaredCandidates = declared?.candidates.filter(item => !step.lockedWorkstation || item.stationId === baseStationId);
    if (declaredCandidates && !declaredCandidates.length) throw new Error(`Operacja ${step.id}: brak dopuszczonej kopii na zablokowanym stanowisku.`);
    const stationIds = declaredCandidates ? [...new Set(declaredCandidates.map(item => item.stationId))] : [baseStationId!];
    for (const stationId of stationIds) {
      if (calendars && !calendars.stations[stationId]) {
        throw new Error(`Stanowisko ${stationId}: brak jawnego kalendarza.`);
      }
      if (!copies.has(stationId)) {
        const count = checked.stationSettings[stationId]?.parallelStations;
        if (!Number.isSafeInteger(count) || !count || count < 1) {
          throw new Error(`Stanowisko ${stationId}: brak jawnej liczby kopii.`);
        }
        copies.set(stationId, Array(count).fill(true));
        copyReady.set(stationId, Array(count).fill(0));
      }
    }
    candidatesByOperation.set(step.id, declaredCandidates ?? copies.get(baseStationId!)!.map((_, index) =>
      ({stationId: baseStationId!, copy: index + 1, requiredEquipmentIds: []})));
    if(stockRun?.applies(step.id)&&!candidatesByOperation.get(step.id)!.some(candidate=>stockRun.permits(step.id,candidate.stationId))) {
      throw new Error(`Zużycie operacji ${step.id}: pozycje zaopatrzenia nie pasują do żadnego dopuszczonego stanowiska.`);
    }
  }
  const successors = steps.map(step => steps.flatMap((other, i) =>
    other.predecessorIds.includes(step.id) ? [i] : []));
  if(finiteBodyBuffers&&!justInTime){
    if(!bodyRun)throw new Error('C2-B3b: bufory korpusów z gałęziami wymagają jawnych instancji korpusu.');
    bodyBuffers=new GraphBodyBuffers(checked,steps.map(step=>step.id),candidatesByOperation);
    const first=bodyBuffers.target(bodyBuffers.firstOperationId);
    for(const body of bodyBook!.bodies)if(body.location.kind!=='station'||body.location.stationId!==first.stationId||body.location.copy!==first.copy)throw new Error('C2-B3b: początkowy korpus musi być w pierwszej jawnej kopii ścieżki.');
  }
  if (!justInTime && checked.subassemblyBuffers?.buffers.length && !lotRun) throw new Error('Bufory podmontaży wymagają jawnych partii podzespołów.');
  const lotBuffers = !justInTime && checked.subassemblyBuffers?.buffers.length ? new SubassemblyBufferRun(checked,candidatesByOperation) : undefined;
  const sameCopy = (from: StationCopyRef, to: StationCopyRef) => from.stationId === to.stationId && from.copy === to.copy;
  const bodyRoute = (from: StationCopyRef, to: StationCopyRef) => {
    if (sameCopy(from, to)) return undefined;
    const route = routing?.routes.find(route => sameCopy(route.from, from) && sameCopy(route.to, to));
    if (!route?.transportTime) throw new Error(`Wymagane przemieszczenie: brak jawnej trasy lub czasu transportu z ${from.stationId}/${from.copy} do ${to.stationId}/${to.copy}.`);
    return route;
  };
  if (bodyRun && !routing) for (const body of bodyRun.book.bodies) for (const step of steps) {
    if (step.physicalRole?.kind !== 'body-work') continue;
    const location = body.location;
    if (location.kind !== 'station' || !candidatesByOperation.get(step.id)!.some(candidate =>
      candidate.stationId === location.stationId && candidate.copy === location.copy)) {
      throw new Error(`Korpus ${body.id}, operacja ${step.id}: wymagane przemieszczenie; brak jawnych tras i czasu transportu.`);
    }
  }
  onProgress?.(0, steps.length * batch);
  const linear = steps.every((step, index) => step.predecessorIds.length === (index ? 1 : 0) &&
    successors[index].length === (index < steps.length - 1 ? 1 : 0));
  const routePlan = !justInTime && !lotRun && routing && (!checked.physicalConcurrency || linear) ?
    createStationRoutePlan(checked, steps.map(step => step.id), candidatesByOperation) : null;
  const branchPlan = !justInTime && !lotRun && routing && checked.physicalConcurrency && !linear ?
    createBodyBranchRoutePlan(checked, steps.map(step => step.id), candidatesByOperation) : null;
  const previousCopies = new Map<number, StationCandidate>();
  const jobs: Job[] = Array.from({length: batch}, (_, job) => ({id: job + 1,
    arrival: job * arrivalIntervalSeconds, starts: Array(steps.length).fill(Infinity),
    ends: Array(steps.length).fill(Infinity), finish: Infinity}));
  const remaining = jobs.map(() => steps.map(step => step.predecessorIds.length));
  const inFlight = jobs.map(() => new Set<number>());
  const waiting: {job: number; step: number; ready: number;
    causes: Set<'workers' | 'station' | 'same-job' | 'calendar' | 'equipment' | 'body' | 'transport' | 'subassembly' | 'material' | 'buffer'>}[] = [];
  const bufferWaiting = new Set<(typeof waiting)[number]>();
  const events = new EventQueue();
  const wakeTimes = new Set<number>();
  const wakeAt = (at: number, now: number) => {
    if (Number.isFinite(at) && at > now && !wakeTimes.has(at)) {
      wakeTimes.add(at);
      events.push({kind: 'wake', at});
    }
  };
  let book = createWorkerReservationBook(checked.assemblyTransport ? checked.workers.map(w => w.id) : plan.teamWorkerIds);
  const runs: WorkerScheduleRun[] = [];
  const blockedBodies=new Map<WorkerScheduleRun,Extract<BodyEvent,{kind:'release'}>>();
  const bodyDeliveries=new Map<string,NonNullable<WorkerScheduleRun['transport']>>();
  const bodyBufferEvents:NonNullable<WorkerScheduleResult['bufferEvents']>[number][]=[];
  const blockedProducers = new Map<WorkerScheduleRun, readonly SubassemblyLotState[]>();
  const heldProducers = new Set<WorkerScheduleRun>();
  const mayHoldExecution=(job:number,operationId:string,location:StationCopyRef)=>!!lotBuffers&&!!lotRun?.lots.some(lot=>lot.declaration.producer.job===job&&lot.declaration.producer.operationId===operationId&&lotBuffers.holdsWorkers(lot.declaration.subassemblyId,location));
  const holdingOperations=new Set<string>();
  if(lotBuffers)for(const step of steps)for(const target of candidatesByOperation.get(step.id)!)if(lotBuffers.mayHoldAt(step.id,target,checked))holdingOperations.add(step.id);
  for(const id of holdingOperations){const operation=byOperation.get(id)!;
    if(operation.reserveFromSeconds!==0||operation.reserveUntilSeconds!==operation.durationSeconds)throw new Error('C2-B2b: zatrzymanie operatora wymaga jawnej obecności od początku do końca operacji producenta; częściowa obecność wymaga dalszej integracji, a wcześniejsze wyjście wymaga reguły powrotu.');
  }
  const unsafeWorkers=(now:number,except?:WorkerScheduleRun)=>new Set(runs.filter(run=>run!==except&&mayHoldExecution(run.job,run.operationId,run)&&(run.endSeconds>now||heldProducers.has(run))).flatMap(run=>[...run.workerIds]));
  const copyBusy = (run: WorkerScheduleRun, now: number) => run.endSeconds > now || blockedProducers.has(run) || blockedBodies.has(run);
  const releaseProducer = (run: WorkerScheduleRun, now: number) => {
    blockedProducers.delete(run);
    if(heldProducers.has(run)){
      const id=`${run.job}:${run.operationId}`,reservation=book.reservations.find(item=>item.reservationId===id)!;
      if(reservation.releasedAtSeconds===undefined)book=releaseWorkerTeam(book,id,now);
      run.reserveEndSeconds=now;heldProducers.delete(run);
    }else if(holdingOperations.has(run.operationId)){
      const id=`${run.job}:${run.operationId}`,reservation=book.reservations.find(item=>item.reservationId===id)!;
      if(reservation.releasedAtSeconds===undefined)book=releaseWorkerTeam(book,id,now);
    }
    run.stationReleaseSeconds=now;run.blockedSeconds=now-run.endSeconds;
    copies.get(run.stationId)![run.copy-1]=!runs.some(other=>sameCopy(other,run)&&copyBusy(other,now));
  };
  const consumeLots = (job: number, operationId: string, location: StationCopyRef, now: number) => {
    const incoming=lotRun!.incoming(job,operationId);
    lotBuffers?.consume(incoming,location,now);
    lotRun!.consume(job,operationId,location,now);
  };
  const changeovers: ChangeoverRun[] = [];
  const jobVariantMap = buildJobVariantMap(checked, batch);
  const lastProcessedOnCopy = new Map<string, {variantId: string; job: number; endSeconds: number}>();
  let completed = 0;
  jobs.forEach((job, i) => events.push({kind: 'arrival', at: job.arrival, job: i}));
  let currentSimulationTime = 0;
  const pendingReturns=new Map<string,string>();
  const startReturn=(equipmentId:string,routeId:string,now:number)=>{
    const route=checked.assemblyTransport!.emptyRoutes.find(route=>route.id===routeId)!;
    if(route.workerAssignment?.workerIds.some(id=>unsafeWorkers(now).has(id)))return false;
    const dispatch=previewEmptyDispatch(checked,route.id,cartBook,book,transportDevices,now,`return:${equipmentId}:${now}`);
    book=dispatch.workers;transportDevices=dispatch.devices;cartLocks.set(equipmentId,dispatch.endSeconds);
    if(dispatch.startSeconds===now)cartBook=dispatch.carts;else events.push({kind:'cart-start',at:dispatch.startSeconds,route});
    events.push({kind:'cart-end',at:dispatch.endSeconds,equipmentId});
    if(dispatch.workerIds.length)events.push({kind:'release',at:dispatch.endSeconds,reservationId:dispatch.reservationId});
    transportMovements.push({kind:'empty',purpose:'return',routeId:route.id,workerIds:dispatch.workerIds,equipmentIds:dispatch.equipmentIds,startSeconds:dispatch.startSeconds,endSeconds:dispatch.endSeconds});
    return true;
  };

  while (events.length) {
    const now = events.peek().at;
    currentSimulationTime = now;
    if (!Number.isFinite(now)) throw new Error('Harmonogram przekroczył poprawny zakres czasu.');
    if(completed < steps.length * batch)stockRun?.advance(now);
    while (events.length && events.peek().at === now) {
      const event = events.pop();
      if (event.kind === 'material-consume') stockRun!.consume(event.job,event.operationId,now);
      else if (event.kind === 'lot-end') {
        lotBuffers?.arrive(lotRun!.lots.find(lot=>lot.declaration.id===event.lotId)!,now);
        lotRun!.arrive(event.lotId, now);
      }
      else if (event.kind === 'lot-consume') consumeLots(event.job,event.operationId,event.location,now);
      else if (event.kind === 'wake') wakeTimes.delete(now);
      else if (event.kind === 'arrival') {
        steps.forEach((step, i) => { if (!step.predecessorIds.length) waiting.push({job: event.job, step: i,
          ready: now, causes: new Set()}); });
      } else if (event.kind === 'release') {
        const producer=runs.find(run=>holdingOperations.has(run.operationId)&&`${run.job}:${run.operationId}`===event.reservationId);
        if(!producer)book = releaseWorkerTeam(book, event.reservationId, now);
      } else if (event.kind === 'cart-start') {
        cartBook = startCartMovement(checked,cartBook,event.route,'empty',now);
      } else if (event.kind === 'cart-end') {
        cartBook = finishCartMovement(cartBook,event.equipmentId,now);
        cartLocks.delete(event.equipmentId);
        if(event.returnToInitial) {
          const declaration = checked.assemblyTransport!.carts.find(c => c.equipmentId === event.equipmentId)!;
          const current = cartBook.carts.find(c => c.equipmentId === event.equipmentId)!.location!;
          if(!sameCopy(current,declaration.initialLocation)) {
            const route = checked.assemblyTransport!.emptyRoutes.find(r => r.equipmentId === event.equipmentId &&
              sameCopy(r.from,current) && sameCopy(r.to,declaration.initialLocation));
            if(!route) throw new Error('3.4.3: zadeklarowany powrót wózka wymaga skierowanej trasy do lokalizacji początkowej.');
            if(!startReturn(event.equipmentId,route.id,now)){pendingReturns.set(event.equipmentId,route.id);cartLocks.set(event.equipmentId,Infinity);}
          }
        }
      } else if (event.kind === 'transport-end') {
        recordBody({kind: 'finish-transfer', bodyId: event.bodyId, atSeconds: now});
        if(bodyBuffers){const body=bodyBook!.bodies.find(body=>body.id===event.bodyId)!;if(body.location.kind==='station')bodyBufferEvents.push({job:[...bodyRun!.bodyByJob].find(([,id])=>id===event.bodyId)![0],atSeconds:now,kind:'input',stationId:body.location.stationId,copy:body.location.copy});}
      } else if (event.kind === 'body-start') {
        recordBody({kind: 'reserve', bodyId: event.bodyId, atSeconds: now, operationId: event.operationId,
          endSeconds: event.end, basis: event.basis});
      } else {
        const completedStep = steps[event.step];
        if (bodyRun && completedStep.physicalRole?.kind === 'body-work') {
          const release:Extract<BodyEvent,{kind:'release'}>={kind:'release',bodyId:bodyRun!.bodyByJob.get(event.job+1)!,atSeconds:now,operationId:completedStep.id};
          const released=recordBody(release);
          if(bodyBuffers){
            const run=runs.find(run=>run.job===event.job+1&&run.operationId===completedStep.id)!;
            if(!released)blockedBodies.set(run,release);else{run.stationReleaseSeconds=now;run.blockedSeconds=0;}
            bodyBufferEvents.push({job:run.job,atSeconds:now,kind:released?(bodyBuffers.hasToken(release.bodyId)?'output':'released'):'blocked',stationId:run.stationId,copy:run.copy});
          }
        }
        lotRun?.produce(event.job + 1, completedStep.id, {stationId:event.stationId,copy:event.copy+1}, now);
        if (lotBuffers) {
          const produced=lotRun!.lots.filter(lot=>lot.declaration.producer.job===event.job+1&&lot.declaration.producer.operationId===completedStep.id);
          if(produced.length){
            const run=runs.find(run=>run.job===event.job+1&&run.operationId===completedStep.id)!;
            if(lotBuffers.deposit(produced,run,now))releaseProducer(run,now);
            else {
              blockedProducers.set(run,produced);
              // Mixed output policies hold the common crew until all pending lots leave the producer.
              if(mayHoldExecution(run.job,run.operationId,run)){
                heldProducers.add(run);
                book={...book,reservations:book.reservations.map(item=>item.reservationId===`${run.job}:${run.operationId}`?{...item,endSeconds:Number.MAX_VALUE}:item)};
              }else if(holdingOperations.has(run.operationId)){
                book=releaseWorkerTeam(book,`${run.job}:${run.operationId}`,now);
              }
            }
          }else if(holdingOperations.has(completedStep.id)){
            book=releaseWorkerTeam(book,`${event.job+1}:${completedStep.id}`,now);
          }
        }
        inFlight[event.job].delete(event.step);
        copies.get(event.stationId)![event.copy] = !runs.some(run => run.stationId === event.stationId &&
          run.copy === event.copy + 1 && copyBusy(run,now));
        completed++;
        onProgress?.(completed, steps.length * batch);
        for (const next of successors[event.step]) if (--remaining[event.job][next] === 0) {
          waiting.push({job: event.job, step: next, ready: now, causes: new Set()});
        }
      }
    }
    waiting.sort((a, b) => a.ready - b.ready || a.job - b.job || a.step - b.step);
    let started = true;
    while (started) {
      started = false;
      for(const [run,release] of blockedBodies)if(recordBody({...release,atSeconds:now})){
        blockedBodies.delete(run);run.stationReleaseSeconds=now;run.blockedSeconds=now-run.endSeconds;
        copies.get(run.stationId)![run.copy-1]=!runs.some(other=>sameCopy(other,run)&&copyBusy(other,now));
        bodyBufferEvents.push({job:run.job,atSeconds:now,kind:'released',stationId:run.stationId,copy:run.copy});started=true;
      }
      for(const [run,lots] of blockedProducers)if(lotBuffers!.deposit(lots,run,now)){
        releaseProducer(run,now);started=true;
      }
      for(const [equipmentId,routeId] of pendingReturns)if(startReturn(equipmentId,routeId,now)){pendingReturns.delete(equipmentId);started=true;}
      for (let i = 0; i < waiting.length; i++) {
        const task = waiting[i];
        bufferWaiting.delete(task);
        const step = steps[task.step];
        if (inFlight[task.job].size && !matchingConcurrencyGroup(checked.physicalConcurrency,
          [...inFlight[task.job]].map(index => steps[index].id).concat(step.id))) {
          task.causes.add('same-job'); continue;
        }
        if(bodyBuffers&&step.physicalRole?.kind==='body-work'){
          const bodyId=bodyRun!.bodyByJob.get(task.job+1)!,target=bodyBuffers.target(step.id);
          const body=bodyBook!.bodies.find(body=>body.id===bodyId)!;
          if(body.status!=='available'||body.location.kind!=='station'){task.causes.add('body');continue;}
          if(!bodyBuffers.hasToken(bodyId)){
            if(step.id!==bodyBuffers.firstOperationId)throw new Error('C2-B3b: korpus poza oczekiwanym buforem ścieżki.');
            if(!bodyBuffers.hasInputSpace(step.id)){task.causes.add('buffer');bufferWaiting.add(task);continue;}
            bodyBuffers.input(bodyId,step.id,now);
            bodyBufferEvents.push({job:task.job+1,atSeconds:now,kind:'input',stationId:target.stationId,copy:target.copy});
          }
          if(!sameCopy(body.location,target)){
            if(!bodyBuffers.hasInputSpace(step.id)){task.causes.add('buffer');bufferWaiting.add(task);continue;}
            const route=bodyRoute(body.location,target)!;
            if(!checked.assemblyTransport)throw new Error('C2-B3b: bufory korpusów z gałęziami wymagają jawnych zasobów transportu montażu.');
            const rule=checked.assemblyTransport.routes.find(item=>item.stationRouteId===route.id);
            if(!rule)throw new Error(`C2-B3b: brak jawnego zestawu dla trasy ${route.id}.`);
            const unsafe=unsafeWorkers(now),alternatives=rule.alternatives.filter(alternative=>!alternative.workerIds.some(id=>unsafe.has(id)));
            if(!alternatives.length){task.causes.add('workers');continue;}
            let dispatch:AssemblyDispatch;
            try{
              const view={...checked,assemblyTransport:{...checked.assemblyTransport,routes:checked.assemblyTransport.routes.map(item=>item===rule?{...item,alternatives}:item)}};
              dispatch=previewAssemblyDispatch(view,route.id,cartBook,book,transportDevices,now,`body-buffer:${task.job+1}:${step.id}`,now,new Set(cartLocks.keys()));
            }catch(failure){
              if(!cartLocks.size&&!cartBook.carts.some(cart=>cart.movement)&&!unsafe.size)throw failure;
              cartLocks.forEach(end=>wakeAt(end,now));cartBook.carts.forEach(cart=>{if(cart.movement)wakeAt(cart.movement.endSeconds,now);});task.causes.add('transport');continue;
            }
            const movement=dispatch.prefix??dispatch;
            if(movement.workerIds.some(id=>unsafe.has(id))){task.causes.add('workers');continue;}
            if(movement.startSeconds>now){wakeAt(movement.startSeconds,now);task.causes.add('transport');continue;}
            if(!dispatch.prefix){
              recordBody({kind:'start-transfer',bodyId,atSeconds:now,to:target,endSeconds:movement.endSeconds,basis:route.transportTime!.basis==='measured'?'confirmed':'assumed'});
              const breakdown=timingByRoute.get(route.id)?.breakdown;
              bodyDeliveries.set(`${task.job+1}:${step.id}`,{routeId:route.id,startSeconds:now,endSeconds:movement.endSeconds,basis:route.transportTime!.basis,workerIds:movement.workerIds,equipmentIds:movement.equipmentIds,...(breakdown?{breakdown:{...breakdown}}:{})});
              events.push({kind:'transport-end',bodyId,at:movement.endSeconds});
            }
            book=movement.workers;cartBook=movement.carts;transportDevices=movement.devices;
            if(movement.workerIds.length)events.push({kind:'release',at:movement.endSeconds,reservationId:movement.reservationId});
            for(const id of movement.equipmentIds)if(cartBook.carts.some(cart=>cart.equipmentId===id)){
              if(dispatch.prefix)cartLocks.set(id,movement.endSeconds);
              events.push({kind:'cart-end',at:movement.endSeconds,equipmentId:id,returnToInitial:!dispatch.prefix&&checked.assemblyTransport.carts.find(cart=>cart.equipmentId===id)!.afterUnload==='return-to-initial'});
            }
            transportMovements.push({kind:dispatch.prefix?'empty':'loaded',purpose:dispatch.prefix?'approach':'transfer',routeId:movement.routeId,workerIds:movement.workerIds,equipmentIds:movement.equipmentIds,startSeconds:now,endSeconds:movement.endSeconds});
            task.causes.add('transport');started=true;break;
          }
        }
        const incoming = lotRun?.incoming(task.job + 1, step.id) ?? [];
        if (incoming.length) {
          const target = recipientCopies.get(JSON.stringify([task.job+1,step.id])) ?? candidatesByOperation.get(step.id)![0];
          const directIncoming=incoming.filter(lot=>lotBuffers?.inputIsDirect(lot,target));
          if(directIncoming.length){
            if(directIncoming.length!==1)throw new Error('C2-B3a: wspólny odbiór kilku partii na wejściu 0 wymaga dalszej integracji; obsługiwana jest jedna partia bezpośrednia i osobne dodatnie bufory pozostałych partii.');
            if(mayHoldExecution(task.job+1,step.id,target))throw new Error('C2-B2b: bezpośredni odbiorca z zatrzymaniem własnej obsady na wyjściu wymaga integracji B3.');
            if(directIncoming[0].declaration.quantity!==directIncoming[0].declaration.consumptionQuantity)throw new Error('C2-B2b: wejście 0 wymaga pełnego pobrania bez reszty.');
            if(checked.changeoverMatrix||checked.physicalConcurrency?.groups.some(group=>group.operationIds.includes(step.id)))throw new Error('C2-B2b: wejście 0 z przezbrojeniem lub równoległą operacją odbiorcy wymaga dalszej integracji.');
            if(directIncoming[0].location&&sameCopy(directIncoming[0].location,target)&&lotBuffers!.outputIsDirect(directIncoming[0],target))throw new Error('C2-B2b: lokalne wejście i wyjście 0 na tej samej kopii wymagają wspólnego przekazania stanowiska w B3.');
          }
          const missing = incoming.filter(lot => lot.status === 'available' && !sameCopy(lot.location!, target))
            // Stockable companions must arrive before the direct delivery can promise the recipient start.
            .sort((a,b)=>Number(!!lotBuffers?.inputIsDirect(a,target))-Number(!!lotBuffers?.inputIsDirect(b,target)));
          // Validate all required legs before publishing any movement for this recipient.
          for (const lot of missing) bodyRoute(lot.location!, target);
          if (missing.length) {
            const lot = missing[0], route = bodyRoute(lot.location!, target)!;
            if(lotBuffers&&!lotBuffers.canDepart(lot,target)){task.causes.add('buffer');bufferWaiting.add(task);continue;}
            const direct=!!lotBuffers?.inputIsDirect(lot,target);
            if(direct){
              const companions=incoming.filter(other=>other!==lot);
              if(companions.some(other=>other.status!=='available'||!other.location||!sameCopy(other.location,target))){task.causes.add('subassembly');continue;}
              if(!lotBuffers!.local(companions,target,now)){task.causes.add('buffer');bufferWaiting.add(task);continue;}
            }
            const owner=[...blockedProducers].find(([run,lots])=>heldProducers.has(run)&&lots.includes(lot)&&lots.every(other=>other===lot||!lotBuffers!.isOnProducer(other)))?.[0];
            const previewBook=owner?releaseWorkerTeam(book,`${owner.job}:${owner.operationId}`,now):book;
            const unsafe=unsafeWorkers(now,owner);
            let dispatch: AssemblyDispatch | undefined;
            if (checked.assemblyTransport) {
              try {
                if(!holdingOperations.size)dispatch = previewAssemblyDispatch(checked,route.id,cartBook,book,transportDevices,now,`lot:${lot.declaration.id}`,now,new Set(cartLocks.keys()));
                else{
                  const rule=checked.assemblyTransport.routes.find(rule=>rule.stationRouteId===route.id)!;
                  if(!rule)throw new Error(`3.4.3: trasa ${route.id} wymaga jawnego zestawu transportu montażu.`);
                  for(const alternative of rule.alternatives){
                    if(alternative.workerIds.some(id=>unsafe.has(id)))continue;
                    const view={...checked,assemblyTransport:{...checked.assemblyTransport,routes:checked.assemblyTransport.routes.map(item=>item===rule?{...item,alternatives:[alternative]}:item)}};
                    try{
                      const candidate=previewAssemblyDispatch(view,route.id,cartBook,previewBook,transportDevices,now,`lot:${lot.declaration.id}`,now,new Set(cartLocks.keys()));
                      if(candidate.prefix?.workerIds.some(id=>unsafeWorkers(now).has(id)))continue;
                      if(!dispatch||candidate.startSeconds<dispatch.startSeconds)dispatch=candidate;
                    }catch{/* Another explicit alternative may remain feasible. */}
                  }
                  if(!dispatch)throw new Error('Transport podmontażu: brak zestawu bez zatrzymanych lub potencjalnie blokowanych monterów.');
                }
              } catch (failure) {
                if (!cartLocks.size && !cartBook.carts.some(cart => cart.movement)&&!unsafeWorkers(now).size) throw failure;
                cartLocks.forEach(end => wakeAt(end,now));
                cartBook.carts.forEach(cart => {if(cart.movement)wakeAt(cart.movement.endSeconds,now);});
                task.causes.add('transport');continue;
              }
              const movement = dispatch.prefix ?? dispatch;
              movement.waitCauses.forEach(cause => task.causes.add(cause));
              if (movement.startSeconds > now) {task.causes.add('transport');wakeAt(movement.startSeconds,now);continue;}
              if(dispatch.prefix&&owner){
                const ownId=`${owner.job}:${owner.operationId}`;
                movement.workers={...movement.workers,reservations:movement.workers.reservations.map(item=>item.reservationId===ownId?book.reservations.find(original=>original.reservationId===ownId)!:item)};
              }
            }
            const end = dispatch?.endSeconds ?? now + route.transportTime!.durationSeconds;
            let directChoice:BufferedOperationChoice|undefined,directBodyId:string|undefined;
            if(direct&&!dispatch?.prefix){
              const duration=end-now,operation=byOperation.get(step.id)!;
              const occupants=runs.filter(run=>sameCopy(run,target)&&copyBusy(run,now)||copyBusy(run,now)&&run.equipmentIds?.some(id=>target.requiredEquipmentIds.includes(id)));
              const uncertain=occupants.filter(run=>blockedProducers.has(run)||mayHoldExecution(run.job,run.operationId,run)||run.endSeconds>end);
              if(uncertain.length){task.causes.add('station');uncertain.filter(run=>!blockedProducers.has(run)).forEach(run=>wakeAt(run.endSeconds-duration,now));continue;}
              if(bodyRun&&step.physicalRole?.kind==='body-work'){
                directBodyId=bodyRun.bodyByJob.get(task.job+1)!;
                const body=bodyBook!.bodies.find(body=>body.id===directBodyId)!;
                if(body.location.kind!=='station'||!sameCopy(body.location,target))throw new Error('C2-B2b: wejście 0 z równoczesnym przewozem korpusu pozostaje do B3.');
                if(body.status!=='available'){task.causes.add('body');continue;}
              }
              if(stockRun){
                if(!stockRun.permits(step.id,target.stationId)){task.causes.add('material');continue;}
                try{const materialAt=stockRun.earliest(step.id,end);if(materialAt>end){task.causes.add('material');wakeAt(materialAt-duration,now);continue;}}
                catch{task.causes.add('material');continue;}
              }
              const admission=planDirectOperation(checked,operation,target,end,dispatch?.workers??previewBook,unsafe,mayHoldExecution(task.job+1,step.id,target));
              if(!admission.choice){if(admission.cause)task.causes.add(admission.cause);if(admission.retryAt!==undefined)wakeAt(admission.retryAt-duration,now);continue;}
              directChoice=admission.choice;
            }
            if(!dispatch?.prefix)lotBuffers?.depart(lot,target,now,directChoice?end:undefined);
            if(dispatch){
              const movement=dispatch.prefix??dispatch;
              book = movement.workers;cartBook = movement.carts;transportDevices = movement.devices;
              if(movement.workerIds.length)events.push({kind:'release',at:movement.endSeconds,reservationId:movement.reservationId});
              for(const id of movement.equipmentIds)if(cartBook.carts.some(cart=>cart.equipmentId===id)){
                if(dispatch.prefix)cartLocks.set(id,movement.endSeconds);
                events.push({kind:'cart-end',at:movement.endSeconds,equipmentId:id,
                  returnToInitial:!dispatch.prefix && checked.assemblyTransport!.carts.find(cart=>cart.equipmentId===id)!.afterUnload==='return-to-initial'});
              }
              transportMovements.push({kind:dispatch.prefix?'empty':'loaded',purpose:dispatch.prefix?'approach':'transfer',
                routeId:movement.routeId,workerIds:movement.workerIds,equipmentIds:movement.equipmentIds,
                startSeconds:now,endSeconds:movement.endSeconds,lotId:lot.declaration.id});
              if(dispatch.prefix){task.causes.add('transport');started=true;break;}
            }
            lotRun!.start(lot,target,now,end);events.push({kind:'lot-end',at:end,lotId:lot.declaration.id});
            if(!dispatch)transportMovements.push({kind:'loaded',purpose:'transfer',routeId:route.id,workerIds:[],equipmentIds:[],startSeconds:now,endSeconds:end,lotId:lot.declaration.id});
            if(directChoice){
              const operation=byOperation.get(step.id)!,reservationId=`${task.job+1}:${step.id}`,finish=directChoice.projection.end;
              book=reserveWorkerTeam(book,{reservationId,workerIds:directChoice.workers,startSeconds:directChoice.from,endSeconds:directChoice.until});
              if(directBodyId){
                const profile=step.staffing!.timeVariants.find(variant=>variant.workerCount===operation.workerCount)!.timeProfile;
                events.push({kind:'body-start',at:end,bodyId:directBodyId,operationId:step.id,end:finish,basis:profile.durationBasis==='measured'?'confirmed':'assumed'});
              }
              if(stockRun?.applies(step.id)){stockRun.reserve(task.job+1,step.id,end);events.push({kind:'material-consume',at:end,job:task.job+1,operationId:step.id});}
              events.push({kind:'lot-consume',at:end,job:task.job+1,operationId:step.id,location:target});
              runs.push({job:task.job+1,operationId:step.id,stationId:target.stationId,copy:target.copy,workerIds:directChoice.workers,equipmentIds:target.requiredEquipmentIds,
                readySeconds:task.ready,startSeconds:end,endSeconds:finish,reserveStartSeconds:directChoice.from,reserveEndSeconds:directChoice.until,
                stationReserveStartSeconds:end,workWindows:directChoice.projection.workWindows,pauses:directChoice.projection.pauses,
                waitSeconds:end-task.ready-(end-now),waitCauses:[...task.causes,'subassembly'],...(directBodyId?{bodyId:directBodyId}:{})});
              copies.get(target.stationId)![target.copy-1]=false;copyReady.get(target.stationId)![target.copy-1]=finish;
              jobs[task.job].starts[task.step]=end;jobs[task.job].ends[task.step]=finish;inFlight[task.job].add(task.step);
              events.push({kind:'release',at:directChoice.until,reservationId});events.push({kind:'completion',at:finish,job:task.job,step:task.step,stationId:target.stationId,copy:target.copy-1});
              waiting.splice(i,1);
            }
            task.causes.add('subassembly');started=true;break;
          }
          if(incoming.some(lot=>lot.status==='pending'||lot.status==='moving')){task.causes.add('subassembly');continue;}
          if(lotBuffers&&!lotBuffers.local(incoming,target,now)){task.causes.add('buffer');bufferWaiting.add(task);continue;}
          for(const [run,lots] of blockedProducers)if(lotBuffers!.deposit(lots,run,now)){releaseProducer(run,now);started=true;}
        }
        const bodyId = bodyRun && step.physicalRole?.kind === 'body-work' ? bodyRun.bodyByJob.get(task.job + 1)! : undefined;
        const operation = byOperation.get(step.id)!;
        type SelectedRun = {workerIds: string[]; projected: NonNullable<ReturnType<typeof projectWork>>;
          reserveStart: number; reserveEnd: number; candidate: StationCandidate; departure: number; transportRoute?: DeclaredTransportRoute;
          dispatch?: AssemblyDispatch; futureWaitCauses?: ('workers' | 'calendar' | 'material')[]};
        const feasible: SelectedRun[] = [];
        let calendarWait = false;
        let workerWait = false;
        let stationWait = false;
        let bodyWait = false;
        let equipmentWait = false;
        let hasFreeCopy = false;
        let combinations = 0;
        const transportFailures: string[] = [];
        for (const candidate of candidatesByOperation.get(step.id)!) {
          if(stockRun&&!stockRun.permits(step.id,candidate.stationId)){task.causes.add('material');continue;}
          const target = incoming.length ? recipientCopies.get(JSON.stringify([task.job+1,step.id])) ?? candidatesByOperation.get(step.id)![0] : undefined;
          if(target && !sameCopy(target,candidate))continue;
          const body = bodyId ? bodyBook!.bodies.find(body => body.id === bodyId)! : undefined;
          if (body && (body.status !== 'available' && body.status !== 'reserved' || body.location.kind !== 'station')) {
            bodyWait = true; continue;
          }
          if (body?.status === 'reserved' && !bodyAllowsOperation(bodyBook!, bodyId!, step.id, candidate)) {
            bodyWait = true; continue;
          }
          if (bodyId && !routing && !bodyAllowsOperation(bodyBook!, bodyId, step.id, candidate)) continue;
          const stationId = candidate.stationId;
          const occupants = runs.filter(run => run.stationId === stationId && run.copy === candidate.copy && copyBusy(run,now));
          const sharing = !!bodyId && !!checked.physicalConcurrency && body?.location.kind === 'station' && sameCopy(body.location, candidate) &&
            occupants.length > 0 && occupants.every(run => run.bodyId === bodyId) &&
            !!matchingConcurrencyGroup(checked.physicalConcurrency, occupants.map(run => run.operationId).concat(step.id));
          const copyFree = copies.get(stationId)![candidate.copy - 1] || sharing;
          if (candidate.requiredEquipmentIds.some(id => runs.some(run => copyBusy(run,now) && run.equipmentIds?.includes(id)))) {
            equipmentWait = true; continue;
          }
          if (!copyFree && !bodyId) {stationWait = true; continue;}
          if (bodyId && occupants.some(run=>blockedProducers.has(run)||blockedBodies.has(run))) {stationWait = true;continue;}
          hasFreeCopy ||= copyFree;
          let departure = copyFree ? now : copyReady.get(stationId)![candidate.copy - 1];
          const transportRoute = body?.location.kind === 'station' ? bodyRoute(body.location, candidate) : undefined;
          let dispatch: AssemblyDispatch | undefined;
          if(transportRoute && checked.assemblyTransport) {
            const busy = cartBook.carts.filter(c => c.movement);
            if(busy.length) {busy.forEach(c => wakeAt(c.movement!.endSeconds,now));}
            cartLocks.forEach(end => wakeAt(end,now));
            try {
              dispatch = previewAssemblyDispatch(checked,transportRoute.id,cartBook,book,transportDevices,departure,`transport:${task.job+1}:${step.id}`,now,new Set(cartLocks.keys()));
            } catch(failure) {
              transportFailures.push((failure as Error).message);task.causes.add('transport');continue;
            }
            departure = dispatch.startSeconds;
          }
          const arrival = departure + (transportRoute?.transportTime?.durationSeconds ?? 0);
          if (!Number.isFinite(arrival)) throw new Error('Transport przekroczył poprawny zakres czasu.');
          let selected: SelectedRun | null = null;
          const choose = (workerIds: string[], from: number) => {
            if ((!bodyId && selected) || combinations > 10000) return;
            if (workerIds.length < operation.workerCount) {
              for (let index = from; index <= operation.eligibleWorkerIds.length -
                  (operation.workerCount - workerIds.length); index++) {
                choose([...workerIds, operation.eligibleWorkerIds[index]], index + 1);
                if ((!bodyId && selected) || combinations > 10000) return;
              }
              return;
            }
            combinations++;
            if (!teamCoversCompetencies(checked, step.id, workerIds)) return;
            if(workerIds.some(id=>unsafeWorkers(now).has(id))){workerWait=true;return;}
            if (bodyId) {
              let probe = arrival;
              const futureWaitCauses = new Set<'workers' | 'calendar' | 'material'>();
              for (let attempt = 0; attempt < 10000; attempt++) {
                const windows = calendars ? sharedAvailability(calendars, stationId, workerIds) :
                  [{startSeconds: probe, endSeconds: probe + operation.durationSeconds}];
                const window = windows.find(window => window.endSeconds > probe);
                if (!window) { if (calendars) calendarWait = true; return; }
                const start = Math.max(probe, window.startSeconds);
                if (start > probe) futureWaitCauses.add('calendar');
                const projected = projectWork(windows, start, operation.durationSeconds);
                if (!projected) { if (calendars) calendarWait = true; return; }
                const reserveStart = projected.atOffset(operation.reserveFromSeconds, false);
                const reserveEnd = projected.atOffset(operation.reserveUntilSeconds, true);
                if (![reserveStart, reserveEnd, projected.end].every(Number.isFinite)) throw new Error('Harmonogram przekroczył poprawny zakres czasu.');
                const conflicts = (dispatch?.workers ?? book).reservations.filter(reservation => reserveStart < reservation.endSeconds &&
                  (mayHoldExecution(task.job+1,step.id,candidate)||reservation.startSeconds < reserveEnd) && reservation.workerIds.some(id => workerIds.includes(id)));
                if (conflicts.length) {
                  workerWait = true;
                  futureWaitCauses.add('workers');
                  probe = start + Math.max(...conflicts.map(conflict => conflict.endSeconds - reserveStart));
                  continue;
                }
                let materialStart = start;
                if (stockRun) {
                  try {
                    materialStart = stockRun.earliest(step.id, start);
                  } catch {
                    futureWaitCauses.add('material');
                    task.causes.add('material');
                    return;
                  }
                }
                if(materialStart > start){futureWaitCauses.add('material');probe=materialStart;continue;}
                if (start > arrival) calendarWait = true;
                if (!selected || start < selected.projected.workWindows[0].startSeconds) {
                  selected = {workerIds, projected, reserveStart, reserveEnd, candidate, departure, transportRoute, dispatch,
                    futureWaitCauses: [...futureWaitCauses]};
                }
                return;
              }
              throw new Error('Nie można rozstrzygnąć rezerwacji zespołu po transporcie.');
            }
            const logicalEnd = now + operation.durationSeconds;
            if (!Number.isFinite(logicalEnd)) throw new Error('Harmonogram przekroczył poprawny zakres czasu.');
            const windows = calendars ? sharedAvailability(calendars, stationId, workerIds) :
              [{startSeconds: now, endSeconds: logicalEnd}];
            const next = windows.find(window => window.endSeconds > now);
            if (!next) { if (calendars) calendarWait = true; return; }
            if (next.startSeconds > now) {
              if (calendars) { calendarWait = true; wakeAt(next.startSeconds, now); }
              return;
            }
            const projected = projectWork(windows, now, operation.durationSeconds);
            if (!projected) {
              if (calendars) {
                calendarWait = true;
                const following = windows.find(w => w.startSeconds > now);
                if (following) wakeAt(following.startSeconds, now);
              }
              return;
            }
            const reserveStart = projected.atOffset(operation.reserveFromSeconds, false);
            const reserveEnd = projected.atOffset(operation.reserveUntilSeconds, true);
            if (![reserveStart, reserveEnd, projected.end].every(Number.isFinite)) {
              throw new Error('Harmonogram przekroczył poprawny zakres czasu.');
            }
            const conflicts = book.reservations.filter(reservation =>
              reserveStart < reservation.endSeconds && (mayHoldExecution(task.job+1,step.id,candidate)||reservation.startSeconds < reserveEnd) &&
              reservation.workerIds.some(id => workerIds.includes(id)));
            if (conflicts.length) {
              workerWait = true;
              conflicts.forEach(conflict => wakeAt(
                Math.max(now, conflict.endSeconds - operation.reserveFromSeconds), now));
              return;
            }
            let materialStart = now;
            if (stockRun) {
              try {
                materialStart = stockRun.earliest(step.id, now);
              } catch {
                task.causes.add('material');
                return;
              }
            }
            if(materialStart > now){task.causes.add('material');wakeAt(materialStart,now);return;}
            selected = {workerIds, projected, reserveStart, reserveEnd, candidate, departure};
          };
          choose([], 0);
          if (combinations > 10000) throw new Error('Zbyt wiele kombinacji przydziału pracowników.');
          if (selected) feasible.push(selected);
          // Preserve the legacy first-copy and worker order when no routing was declared.
          if (!routing && selected) break;
        }
        let chosen = feasible[0];
        let selectedRoute: {id: string; distanceMm: number} | undefined;
        if (feasible.length && (routePlan || branchPlan || bodyId)) {
          const previous = previousCopies.get(task.job);
          feasible.sort((a, b) => {
            const start = a.projected.workWindows[0].startSeconds - b.projected.workWindows[0].startSeconds;
            if (start) return start;
            if (bodyId) {
              const incoming = (a.transportRoute?.distanceMm ?? 0) - (b.transportRoute?.distanceMm ?? 0);
              if (incoming) return incoming;
            }
            // At a later step, honor the shortest actual incoming leg among starts possible now.
            const incoming = !bodyId && previous && routePlan ? routePlan.routeBetween(previous, a.candidate).distanceMm -
              routePlan.routeBetween(previous, b.candidate).distanceMm : 0;
            return incoming || (routePlan ? compareForwardRoutes(routePlan.forward(step.id, a.candidate), routePlan.forward(step.id, b.candidate)) :
              branchPlan ? compareBodyBranchPreferences(branchPlan.forward(step.id, a.candidate), branchPlan.forward(step.id, b.candidate)) : 0);
          });
          chosen = feasible[0];
          selectedRoute = routePlan?.forward(step.id, chosen.candidate)?.route ?? branchPlan?.forward(step.id, chosen.candidate)[0]?.route;
        }
        if (!chosen) {
          if(transportFailures.length && !cartLocks.size && !cartBook.carts.some(c => c.movement)) throw new Error(transportFailures.join(' '));
          if (bodyWait) task.causes.add('body');
          if (equipmentWait) task.causes.add('equipment');
          if (stationWait && !hasFreeCopy) task.causes.add('station');
          if (calendarWait) task.causes.add('calendar');
          if (workerWait) task.causes.add('workers');
          continue;
        }
        if(chosen.dispatch?.prefix) {
          const prefix = chosen.dispatch.prefix;
          task.causes.add('transport');prefix.waitCauses.forEach(cause => task.causes.add(cause));
          if(prefix.startSeconds > now) {wakeAt(prefix.startSeconds,now);continue;}
          book = prefix.workers;cartBook = prefix.carts;transportDevices = prefix.devices;
          for(const id of prefix.equipmentIds) {cartLocks.set(id,prefix.endSeconds);events.push({kind:'cart-end',at:prefix.endSeconds,equipmentId:id});}
          if(prefix.workerIds.length) events.push({kind:'release',at:prefix.endSeconds,reservationId:prefix.reservationId});
          transportMovements.push({kind:'empty',purpose:'approach',routeId:prefix.routeId,workerIds:prefix.workerIds,
            equipmentIds:prefix.equipmentIds,startSeconds:prefix.startSeconds,endSeconds:prefix.endSeconds});
          started = true;break;
        }
        const {workerIds, projected, reserveStart, reserveEnd} = chosen;
        if (chosen.departure > now) {
          task.causes.add(chosen.dispatch ? 'transport' : 'station');
          chosen.dispatch?.waitCauses.forEach(cause => task.causes.add(cause));
          wakeAt(chosen.departure, now);
          continue;
        }
        const {stationId, copy: copyNumber, requiredEquipmentIds} = chosen.candidate;
        const free = copies.get(stationId)!;
        const copy = copyNumber - 1;
        const end = projected.end;
        const start = projected.workWindows[0].startSeconds;
        if(bodyBuffers&&bodyId&&start>now){chosen.futureWaitCauses?.forEach(cause=>task.causes.add(cause));wakeAt(start,now);continue;}
        chosen.futureWaitCauses?.forEach(cause => task.causes.add(cause));
        if(chosen.dispatch) {
          book = chosen.dispatch.workers;cartBook = chosen.dispatch.carts;transportDevices = chosen.dispatch.devices;
          chosen.dispatch.waitCauses.forEach(cause => task.causes.add(cause));
          transportMovements.push({kind:'loaded',purpose:'transfer',routeId:chosen.dispatch.routeId,workerIds:chosen.dispatch.workerIds,
            equipmentIds:chosen.dispatch.equipmentIds,startSeconds:chosen.dispatch.startSeconds,endSeconds:chosen.dispatch.endSeconds});
          if(chosen.dispatch.workerIds.length) events.push({kind:'release',at:chosen.dispatch.endSeconds,reservationId:chosen.dispatch.reservationId});
          for(const id of chosen.dispatch.equipmentIds) if(cartBook.carts.some(c => c.equipmentId === id)) {
            events.push({kind:'cart-end',at:chosen.dispatch.endSeconds,equipmentId:id,returnToInitial:checked.assemblyTransport!.carts.find(c => c.equipmentId === id)!.afterUnload === 'return-to-initial'});
          }
        }
        if (bodyId) {
          const profile = step.staffing!.timeVariants.find(variant => variant.workerCount === operation.workerCount)!.timeProfile;
          if (chosen.transportRoute) {
            const timing = chosen.transportRoute.transportTime!;
            const arrival = now + timing.durationSeconds;
            recordBody({kind: 'start-transfer', bodyId, atSeconds: now, to: chosen.candidate,
              endSeconds: arrival, basis: timing.basis === 'measured' ? 'confirmed' : 'assumed'});
            events.push({kind: 'transport-end', at: arrival, bodyId});
          }
          if (start === now) recordBody({kind: 'reserve', bodyId, atSeconds: start, operationId: step.id,
            endSeconds: end, basis: profile.durationBasis === 'measured' ? 'confirmed' : 'assumed'});
          else events.push({kind: 'body-start', at: start, bodyId, operationId: step.id, end,
            basis: profile.durationBasis === 'measured' ? 'confirmed' : 'assumed'});
        }
        if(stockRun?.applies(step.id)){
          stockRun.reserve(task.job+1,step.id,start);
          if(start===now)stockRun.consume(task.job+1,step.id,now);
          else events.push({kind:'material-consume',at:start,job:task.job+1,operationId:step.id});
        }
        if(incoming.length) {
          if(start===now)consumeLots(task.job+1,step.id,chosen.candidate,now);
          else events.push({kind:'lot-consume',at:start,job:task.job+1,operationId:step.id,location:chosen.candidate});
        }
        const reservationId = `${task.job + 1}:${step.id}`;
        book = reserveWorkerTeam(book, {reservationId, workerIds,
          startSeconds: reserveStart, endSeconds: reserveEnd});
        free[copy] = false;
        copyReady.get(stationId)![copy] = Math.max(copyReady.get(stationId)![copy], end);
        inFlight[task.job].add(task.step);
        jobs[task.job].starts[task.step] = start;
        jobs[task.job].ends[task.step] = end;
        runs.push({job: task.job + 1, operationId: step.id, stationId, copy: copy + 1,
          workerIds: [...workerIds], readySeconds: task.ready, startSeconds: start,
          endSeconds: end, waitSeconds: start - task.ready - (chosen.transportRoute?.transportTime?.durationSeconds ?? 0), waitCauses: [...task.causes],
          reserveStartSeconds: reserveStart, reserveEndSeconds: reserveEnd,
          workWindows: projected.workWindows, pauses: projected.pauses});
        if (bodyId) {
          const run = runs[runs.length - 1];
          run.bodyId = bodyId;
          run.stationReserveStartSeconds = now;
          if (chosen.transportRoute) run.transport = {routeId: chosen.transportRoute.id, startSeconds: now,
            endSeconds: now + chosen.transportRoute.transportTime!.durationSeconds, basis: chosen.transportRoute.transportTime!.basis};
          if(run.transport && chosen.dispatch) {run.transport.workerIds = chosen.dispatch.workerIds;run.transport.equipmentIds = chosen.dispatch.equipmentIds;}
          if(run.transport){const breakdown=timingByRoute.get(run.transport.routeId)?.breakdown;if(breakdown)run.transport.breakdown={...breakdown};}
          const bufferedDelivery=bodyDeliveries.get(`${task.job+1}:${step.id}`);
          if(bufferedDelivery){run.transport=bufferedDelivery;run.waitSeconds-=bufferedDelivery.endSeconds-bufferedDelivery.startSeconds;}
        }
        if (routing) {
          const run = runs[runs.length - 1];
          run.equipmentIds = [...requiredEquipmentIds];
          if (selectedRoute) {run.selectionRouteId = selectedRoute.id; run.selectionDistanceMm = selectedRoute.distanceMm;}
          const previous = previousCopies.get(task.job);
          if (previous && routePlan) {
            const arrival = routePlan.routeBetween(previous, chosen.candidate);
            run.arrivalRouteId = arrival.id; run.arrivalDistanceMm = arrival.distanceMm;
          }
          previousCopies.set(task.job, chosen.candidate);
        }
        events.push({kind: 'release', at: reserveEnd, reservationId});
        events.push({kind: 'completion', at: end, job: task.job, step: task.step, stationId, copy});
        if (start > now) wakeAt(start, now);
        waiting.splice(i, 1);
        started = true;
        break;
      }
    }
  }
  if((lotBuffers||bodyBuffers)&&(blockedProducers.size||blockedBodies.size||bufferWaiting.size)){
    throw new ProcessStallError({type:'buffer-deadlock',atSeconds:currentSimulationTime,title:bodyBuffers?'Brak miejsca w osobnych buforach korpusów lub podmontaży':'Brak miejsca w buforach podmontaży',
      summary:bodyBuffers?'Proces nie może kontynuować: korpusy, partie, rezerwacje celu lub reszty zajmują swoje osobne pojemności.':'Proces nie może kontynuować: całe partie, rezerwacje celu lub pozostawione reszty zajmują osobne pojemności podzespołów.',
      stalledOperations:waiting.map(task=>({job:task.job+1,operationId:steps[task.step].id,operationName:steps[task.step].name,
        stationId:candidatesByOperation.get(steps[task.step].id)![0].stationId,copy:candidatesByOperation.get(steps[task.step].id)![0].copy,
        status:'waiting',waitCauses:[...task.causes],missingResourceExplanation:'Sprawdź zajętość i reszty partii w buforach podmontaży.'})),
      blockedStations:[...blockedProducers.keys(),...blockedBodies.keys()].map(run=>({stationId:run.stationId,stationName:checked.stations.find(station=>station.id===run.stationId)!.name,
        copy:run.copy,blockedByJob:run.job,blockedByOperationId:run.operationId,holdingWorkerIds:heldProducers.has(run)?[...run.workerIds]:[],blockingPolicy:heldProducers.has(run)?'bbas':'bbas-worker-released'})),
      recommendation:'Sprawdź jawne pojemności w sztukach, ilości partii i pobrań oraz przypisania odbiorców; reszty pozostają w buforze.'});
  }
  if (completed !== steps.length * batch || waiting.length ||pendingReturns.size||
      book.reservations.some(item => item.releasedAtSeconds !== item.endSeconds)) {
    throw new ProcessStallError(diagnoseUnbufferedProcessStall({
      now: currentSimulationTime,
      completed,
      total: steps.length * batch,
      waiting,
      steps,
      project: checked,
      book,
      stockRun,
      lotRun,
      candidateOf: (stepId) => candidatesByOperation.get(stepId)![0],
    }));
  }
  if(lotRun?.lots.some(lot=>lot.status!=='consumed'))throw new Error('Podzespoły: nie zakończono wszystkich pobrań; sprawdź zależności i przypisania partii.');
  jobs.forEach(job => { job.finish = Math.max(...job.ends); });
  if (jobs.some(job => !Number.isFinite(job.finish))) throw new Error('Proces nie został ukończony.');
  return {mode: calendars ? 'calendar' : 'logical', ...(justInTime?{transportMode:'just-in-time' as const}:{}), jobs, runs, reservations: book,
    ...(stockRun?{materialStocks:stockRun.stocks,materialEvents:[...stockRun.events].sort((a,b)=>a.atSeconds-b.atSeconds||(a.kind===b.kind?0:a.kind==='delivery'?-1:1))}:{}),
    ...(lotRun?{subassemblyLots:lotRun.lots,subassemblyEvents:lotRun.events,...(!checked.assemblyTransport?{transportMovements}:{} )}:{}),
    ...(lotBuffers?{subassemblyBufferBooks:lotBuffers.snapshot()}:{}),
    ...(bodyBuffers?{bufferBook:bodyBuffers.buffers,bufferEvents:bodyBufferEvents}:{}),
    operationIds: steps.map(step => step.id), ...(bodyBook ? {bodyBook, bodyEvents} : {}), ...(checked.assemblyTransport ? {transportReservations:transportDevices,cartBook,transportMovements} : {})};
}


/** Compare complete, isolated ledgers; failed or losing assignments never publish reservations. */
export function scheduleWorkerRun(project: DomainProjectV6, arrivalIntervalSeconds: number,
  batch: number, bodyInput?: BodyRunInput, onProgress?: (completed: number, total: number) => void,
  options: {transportMode?: TransportSimulationMode} = {}): WorkerScheduleResult {
  if (!Number.isFinite(arrivalIntervalSeconds) || arrivalIntervalSeconds <= 0 || !Number.isSafeInteger(batch) || batch < 1 || batch > 10000) {
    throw new Error('Partia: 1–10000; jawny odstęp przybycia musi być dodatni.');
  }
  if(options.transportMode!==undefined&&options.transportMode!=='configured'&&options.transportMode!=='just-in-time')throw new Error('Nieznany tryb transportu symulacji.');
  if(project.stationBuffers?.buffers.some(buffer=>buffer.inputCapacity!=null||buffer.outputCapacity!=null)&&(!project.subassemblyFlow||options.transportMode==='just-in-time') ||
     (project.changeoverMatrix && project.operations.every((op, idx) => op.predecessorIds.length === (idx ? 1 : 0)))) {
    return scheduleBufferedProcess(project,arrivalIntervalSeconds,batch,onProgress,options.transportMode==='just-in-time'?undefined:{bodyInput});
  }
  if (!project.subassemblyFlow || options.transportMode === 'just-in-time') {
    return scheduleWorkerRunFixed(project, arrivalIntervalSeconds, batch, bodyInput, onProgress, options);
  }
  const checked = parseDomainProjectV6(JSON.stringify(project));
  // Verify coverage/range before expanding candidate assignments.
  const lots = new SubassemblyRun(checked, batch);
  const operationOrder = domainOperationOrder(checked).map(operation => operation.id);
  const recipients = [...new Map(lots.lots.map(lot => {
    const ref = lot.declaration.consumer;
    return [JSON.stringify([ref.job,ref.operationId]),ref] as const;
  })).entries()].map(([key,ref]) => {
    const declared = checked.stationRouting?.operations.find(operation => operation.operationId === ref.operationId);
    const station = checked.stations.find(station => station.operationIds.includes(ref.operationId));
    const count = station ? checked.stationSettings[station.id]?.parallelStations : undefined;
    const locked = checked.operations.find(operation => operation.id === ref.operationId)!.lockedWorkstation;
    const candidates = declared?.candidates.filter(item => !locked || item.stationId === station?.id) ?? (station && count ? Array.from({length:count},(_,i)=>({stationId:station.id,copy:i+1,requiredEquipmentIds:[]})) : []);
    if(!candidates.length)throw new Error(`Odbiorca ${ref.job}:${ref.operationId}: brak jawnych dopuszczeń kopii.`);
    return {key,...ref,candidates};
  });
  if(recipients.every(ref=>ref.candidates.length===1)) {
    return scheduleWorkerRunFixed(checked,arrivalIntervalSeconds,batch,bodyInput,onProgress,options);
  }
  let combinations = 1;
  for(const ref of recipients) {
    combinations *= ref.candidates.length;
    if(combinations > 64)throw new Error('3.4m2b: ponad 64 kombinacje kopii odbiorców podzespołów. Zawęź jawne dopuszczenia albo zmniejsz partię podglądu; żaden wariant nie został wybrany.');
  }
  if(checked.operations.length * batch > 5000)throw new Error('Szkic harmonogramu dopuszcza najwyżej 5000 wykonań.');
  const variants: WorkerScheduleResult[] = [], failures = new Set<string>();
  const assignment = new Map<string,StationCandidate>();
  const variable = recipients.filter(ref=>ref.candidates.length>1);
  for(const ref of recipients.filter(ref=>ref.candidates.length===1))assignment.set(ref.key,ref.candidates[0]);
  const total = checked.operations.length * batch;
  onProgress?.(0,total);
  const visit = (index:number) => {
    if(index < variable.length) {
      const ref = variable[index];
      for(const candidate of ref.candidates){assignment.set(ref.key,candidate);visit(index+1);}
      return;
    }
    try{variants.push(scheduleWorkerRunFixed(checked,arrivalIntervalSeconds,batch,bodyInput,undefined,options,assignment));}
    catch(failure){failures.add((failure as Error).message);}
  };
  visit(0);
  if(!variants.length)throw new Error(`3.4m2b: brak wykonalnego przypisania kopii. ${[...failures].join(' ')}`);
  const findRun = (result:WorkerScheduleResult,ref:typeof recipients[number])=>result.runs.find(run=>run.job===ref.job&&run.operationId===ref.operationId)!;
  // Earlier ready recipients retain priority; job and technological order resolve equal readiness.
  recipients.sort((a,b)=>Math.min(...variants.map(result=>findRun(result,a).readySeconds))-Math.min(...variants.map(result=>findRun(result,b).readySeconds)) || a.job-b.job || operationOrder.indexOf(a.operationId)-operationOrder.indexOf(b.operationId));
  const routeDistance = new Map((checked.stationRouting?.routes ?? []).map(route=>[route.id,route.distanceMm] as const));
  const emptyDistance = new Map((checked.assemblyTransport?.emptyRoutes ?? []).map(route=>[route.id,route.distanceMm] as const));
  const distance = (result:WorkerScheduleResult,ref:typeof recipients[number]) => {
    const ids = new Set(lots.incoming(ref.job,ref.operationId).map(lot=>lot.declaration.id));
    const deliveries = (result.transportMovements ?? []).filter(movement=>movement.lotId&&ids.has(movement.lotId));
    return deliveries.reduce((sum,movement)=>sum+((movement.kind==='empty'?emptyDistance:routeDistance).get(movement.routeId)??0),0) + (findRun(result,ref).transport ? routeDistance.get(findRun(result,ref).transport!.routeId)??0 : 0);
  };
  variants.sort((a,b)=>{
    for(const ref of recipients){
      const start = findRun(a,ref).startSeconds-findRun(b,ref).startSeconds;
      if(start)return start;
      const route = distance(a,ref)-distance(b,ref);
      if(route)return route;
    }
    return 0; // Stable stored candidate order for an exact tie.
  });
  onProgress?.(total,total);
  return variants[0];
}
