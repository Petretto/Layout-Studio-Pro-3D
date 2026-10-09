import {previewAssemblyDispatch,type AssemblyDispatch,type TransportDeviceReservation} from './assemblyDispatch';
import {createCartBook,finishCartMovement,type CartBook} from './transportState';
import {parseDomainProjectV6, type DomainProjectV6} from './domainProject';
import {topologicalSort} from './validation';
import {createWorkerRunPlan} from './workerRunPlan';
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

export interface WorkerScheduleRun {
  job: number;
  operationId: string;
  stationId: string;
  copy: number;
  workerIds: readonly string[];
  readySeconds: number;
  startSeconds: number;
  endSeconds: number;
  waitSeconds: number;
  waitCauses: readonly ('workers' | 'station' | 'same-job' | 'calendar' | 'equipment' | 'body' | 'transport')[];
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
}

export interface WorkerScheduleResult {
  mode: 'logical' | 'calendar';
  jobs: readonly Job[];
  runs: readonly WorkerScheduleRun[];
  reservations: WorkerReservationBook;
  operationIds: readonly string[];
  bodyBook?: BodyBook;
  bodyEvents?: readonly BodyEvent[];
  transportReservations?: readonly TransportDeviceReservation[];
  cartBook?: CartBook;
}

type EventInput =
  | {kind: 'arrival'; at: number; job: number}
  | {kind: 'completion'; at: number; job: number; step: number; stationId: string; copy: number}
  | {kind: 'release'; at: number; reservationId: string}
  | {kind: 'transport-end'; at: number; bodyId: string}
  | {kind: 'cart-end'; at: number; equipmentId: string}
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

function projectWork(windows: readonly CalendarWindow[], now: number, duration: number) {
  const workWindows: CalendarWindow[] = [];
  let remaining = duration;
  for (const window of windows) {
    if (window.endSeconds <= now) continue;
    const startSeconds = workWindows.length ? window.startSeconds : Math.max(now, window.startSeconds);
    if (startSeconds >= window.endSeconds) continue;
    const endSeconds = Math.min(window.endSeconds, startSeconds + remaining);
    workWindows.push({startSeconds, endSeconds});
    remaining -= endSeconds - startSeconds;
    if (remaining <= 0) break;
  }
  if (remaining > 0) return null;
  const pauses = workWindows.slice(1).map((window, i) => ({
    startSeconds: workWindows[i].endSeconds, endSeconds: window.startSeconds,
  })).filter(window => window.startSeconds < window.endSeconds);
  const atOffset = (offset: number, endBoundary: boolean) => {
    let progress = 0;
    for (const window of workWindows) {
      const next = progress + window.endSeconds - window.startSeconds;
      if (offset < next || (endBoundary && offset === next)) return window.startSeconds + offset - progress;
      progress = next;
    }
    return workWindows[workWindows.length - 1].endSeconds;
  };
  return {workWindows, pauses, end: workWindows[workWindows.length - 1].endSeconds, atOffset};
}

/** Draft-only event schedule. Transport time and physical body state are not inferred. */
export function scheduleWorkerRun(project: DomainProjectV6, arrivalIntervalSeconds: number,
  batch: number, bodyInput?: BodyRunInput, onProgress?: (completed: number, total: number) => void): WorkerScheduleResult {
  if (!Number.isFinite(arrivalIntervalSeconds) || arrivalIntervalSeconds <= 0 ||
      !Number.isSafeInteger(batch) || batch < 1 || batch > 10000) {
    throw new Error('Partia: 1–10000; jawny odstęp przybycia musi być dodatni.');
  }
  const checked = parseDomainProjectV6(JSON.stringify(project));
  if(checked.assemblyTransport?.carts.some(c => c.afterUnload === 'return-to-initial')) throw new Error('3.4.3: jawne powroty wózków oczekują na integrację; harmonogram nie może ich pominąć.');
  let cartBook = createCartBook(checked, (checked.assemblyTransport?.carts ?? []).map(({afterUnload,source,...cart}) => cart));
  let transportDevices: readonly TransportDeviceReservation[] = [];
  const bodyRun = prepareBodyRun(checked, batch, bodyInput);
  if(checked.assemblyTransport && !bodyRun) throw new Error('3.4.3: transport zasobowy wymaga fizycznego przebiegu korpusu; transport podzespołów oczekuje na integrację.');
  let bodyBook = bodyRun?.book;
  const bodyEvents: BodyEvent[] = [];
  const recordBody = (event: BodyEvent) => {
    bodyBook = applyBodyEvent(bodyBook!, event);
    bodyEvents.push(event);
  };
  if (!checked.workerRunSelection) throw new Error('Brak zapisanego wyboru składu przebiegu.');
  const domainOperations = new Map(checked.operations.map(operation => [operation.id, operation]));
  const steps = topologicalSort(checked.operations).map(operation => domainOperations.get(operation.id)!);
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
    const stationIds = declared ? [...new Set(declared.candidates.map(item => item.stationId))] : [baseStationId!];
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
    candidatesByOperation.set(step.id, declared?.candidates ?? copies.get(baseStationId!)!.map((_, index) =>
      ({stationId: baseStationId!, copy: index + 1, requiredEquipmentIds: []})));
  }
  const successors = steps.map(step => steps.flatMap((other, i) =>
    other.predecessorIds.includes(step.id) ? [i] : []));
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
  const routePlan = routing && (!checked.physicalConcurrency || linear) ?
    createStationRoutePlan(checked, steps.map(step => step.id), candidatesByOperation) : null;
  const branchPlan = routing && checked.physicalConcurrency && !linear ?
    createBodyBranchRoutePlan(checked, steps.map(step => step.id), candidatesByOperation) : null;
  const previousCopies = new Map<number, StationCandidate>();
  const jobs: Job[] = Array.from({length: batch}, (_, job) => ({id: job + 1,
    arrival: job * arrivalIntervalSeconds, starts: Array(steps.length).fill(Infinity),
    ends: Array(steps.length).fill(Infinity), finish: Infinity}));
  const remaining = jobs.map(() => steps.map(step => step.predecessorIds.length));
  const inFlight = jobs.map(() => new Set<number>());
  const waiting: {job: number; step: number; ready: number;
    causes: Set<'workers' | 'station' | 'same-job' | 'calendar' | 'equipment' | 'body' | 'transport'>}[] = [];
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
  let completed = 0;
  jobs.forEach((job, i) => events.push({kind: 'arrival', at: job.arrival, job: i}));

  while (events.length) {
    const now = events.peek().at;
    if (!Number.isFinite(now)) throw new Error('Harmonogram przekroczył poprawny zakres czasu.');
    while (events.length && events.peek().at === now) {
      const event = events.pop();
      if (event.kind === 'wake') wakeTimes.delete(now);
      else if (event.kind === 'arrival') {
        steps.forEach((step, i) => { if (!step.predecessorIds.length) waiting.push({job: event.job, step: i,
          ready: now, causes: new Set()}); });
      } else if (event.kind === 'release') {
        book = releaseWorkerTeam(book, event.reservationId, now);
      } else if (event.kind === 'cart-end') {
        cartBook = finishCartMovement(cartBook,event.equipmentId,now);
      } else if (event.kind === 'transport-end') {
        recordBody({kind: 'finish-transfer', bodyId: event.bodyId, atSeconds: now});
      } else if (event.kind === 'body-start') {
        recordBody({kind: 'reserve', bodyId: event.bodyId, atSeconds: now, operationId: event.operationId,
          endSeconds: event.end, basis: event.basis});
      } else {
        const completedStep = steps[event.step];
        if (completedStep.physicalRole?.kind === 'body-work') {
          recordBody({kind: 'release', bodyId: bodyRun!.bodyByJob.get(event.job + 1)!,
            atSeconds: now, operationId: completedStep.id});
        }
        inFlight[event.job].delete(event.step);
        copies.get(event.stationId)![event.copy] = !runs.some(run => run.stationId === event.stationId &&
          run.copy === event.copy + 1 && run.endSeconds > now);
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
      for (let i = 0; i < waiting.length; i++) {
        const task = waiting[i];
        const step = steps[task.step];
        if (inFlight[task.job].size && !matchingConcurrencyGroup(checked.physicalConcurrency,
          [...inFlight[task.job]].map(index => steps[index].id).concat(step.id))) {
          task.causes.add('same-job'); continue;
        }
        const bodyId = step.physicalRole?.kind === 'body-work' ? bodyRun!.bodyByJob.get(task.job + 1)! : undefined;
        const operation = byOperation.get(step.id)!;
        type SelectedRun = {workerIds: string[]; projected: NonNullable<ReturnType<typeof projectWork>>;
          reserveStart: number; reserveEnd: number; candidate: StationCandidate; departure: number; transportRoute?: DeclaredTransportRoute;
          dispatch?: AssemblyDispatch; futureWaitCauses?: ('workers' | 'calendar')[]};
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
          const body = bodyId ? bodyBook!.bodies.find(body => body.id === bodyId)! : undefined;
          if (body && (body.status !== 'available' && body.status !== 'reserved' || body.location.kind !== 'station')) {
            bodyWait = true; continue;
          }
          if (body?.status === 'reserved' && !bodyAllowsOperation(bodyBook!, bodyId!, step.id, candidate)) {
            bodyWait = true; continue;
          }
          if (bodyId && !routing && !bodyAllowsOperation(bodyBook!, bodyId, step.id, candidate)) continue;
          const stationId = candidate.stationId;
          const occupants = runs.filter(run => run.stationId === stationId && run.copy === candidate.copy && run.endSeconds > now);
          const sharing = !!bodyId && !!checked.physicalConcurrency && body?.location.kind === 'station' && sameCopy(body.location, candidate) &&
            occupants.length > 0 && occupants.every(run => run.bodyId === bodyId) &&
            !!matchingConcurrencyGroup(checked.physicalConcurrency, occupants.map(run => run.operationId).concat(step.id));
          const copyFree = copies.get(stationId)![candidate.copy - 1] || sharing;
          if (candidate.requiredEquipmentIds.some(id => runs.some(run => run.endSeconds > now && run.equipmentIds?.includes(id)))) {
            equipmentWait = true; continue;
          }
          if (!copyFree && !bodyId) {stationWait = true; continue;}
          hasFreeCopy ||= copyFree;
          let departure = copyFree ? now : copyReady.get(stationId)![candidate.copy - 1];
          const transportRoute = body?.location.kind === 'station' ? bodyRoute(body.location, candidate) : undefined;
          let dispatch: AssemblyDispatch | undefined;
          if(transportRoute && checked.assemblyTransport) {
            const busy = cartBook.carts.filter(c => c.movement);
            if(busy.length) {busy.forEach(c => wakeAt(c.movement!.endSeconds,now));}
            try {
              dispatch = previewAssemblyDispatch(checked,transportRoute.id,cartBook,book,transportDevices,departure,`transport:${task.job+1}:${step.id}`);
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
            if (bodyId) {
              let probe = arrival;
              const futureWaitCauses = new Set<'workers' | 'calendar'>();
              for (let attempt = 0; attempt < 10000; attempt++) {
                const windows = calendars ? sharedAvailability(calendars, stationId, workerIds) :
                  [{startSeconds: probe, endSeconds: probe + operation.durationSeconds}];
                const window = windows.find(window => window.endSeconds > probe);
                if (!window) return;
                const start = Math.max(probe, window.startSeconds);
                if (start > probe) futureWaitCauses.add('calendar');
                const projected = projectWork(windows, start, operation.durationSeconds);
                if (!projected) return;
                const reserveStart = projected.atOffset(operation.reserveFromSeconds, false);
                const reserveEnd = projected.atOffset(operation.reserveUntilSeconds, true);
                if (![reserveStart, reserveEnd, projected.end].every(Number.isFinite)) throw new Error('Harmonogram przekroczył poprawny zakres czasu.');
                const conflicts = (dispatch?.workers ?? book).reservations.filter(reservation => reserveStart < reservation.endSeconds &&
                  reservation.startSeconds < reserveEnd && reservation.workerIds.some(id => workerIds.includes(id)));
                if (conflicts.length) {
                  workerWait = true;
                  futureWaitCauses.add('workers');
                  probe = start + Math.max(...conflicts.map(conflict => conflict.endSeconds - reserveStart));
                  continue;
                }
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
            if (!next) return;
            if (next.startSeconds > now) {
              const future = projectWork(windows, next.startSeconds, operation.durationSeconds);
              if (future) { calendarWait = true; wakeAt(next.startSeconds, now); }
              return;
            }
            const projected = projectWork(windows, now, operation.durationSeconds);
            if (!projected) return;
            const reserveStart = projected.atOffset(operation.reserveFromSeconds, false);
            const reserveEnd = projected.atOffset(operation.reserveUntilSeconds, true);
            if (![reserveStart, reserveEnd, projected.end].every(Number.isFinite)) {
              throw new Error('Harmonogram przekroczył poprawny zakres czasu.');
            }
            const conflicts = book.reservations.filter(reservation =>
              reserveStart < reservation.endSeconds && reservation.startSeconds < reserveEnd &&
              reservation.workerIds.some(id => workerIds.includes(id)));
            if (conflicts.length) {
              workerWait = true;
              conflicts.forEach(conflict => wakeAt(
                Math.max(now, conflict.endSeconds - operation.reserveFromSeconds), now));
              return;
            }
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
          if(transportFailures.length && !cartBook.carts.some(c => c.movement)) throw new Error(transportFailures.join(' '));
          if (bodyWait) task.causes.add('body');
          if (equipmentWait) task.causes.add('equipment');
          if (stationWait && !hasFreeCopy) task.causes.add('station');
          if (calendarWait) task.causes.add('calendar');
          if (workerWait) task.causes.add('workers');
          continue;
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
        chosen.futureWaitCauses?.forEach(cause => task.causes.add(cause));
        if(chosen.dispatch) {
          book = chosen.dispatch.workers;cartBook = chosen.dispatch.carts;transportDevices = chosen.dispatch.devices;
          chosen.dispatch.waitCauses.forEach(cause => task.causes.add(cause));
          if(chosen.dispatch.workerIds.length) events.push({kind:'release',at:chosen.dispatch.endSeconds,reservationId:chosen.dispatch.reservationId});
          for(const id of chosen.dispatch.equipmentIds) if(cartBook.carts.some(c => c.equipmentId === id)) {
            events.push({kind:'cart-end',at:chosen.dispatch.endSeconds,equipmentId:id});
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
        waiting.splice(i, 1);
        started = true;
        break;
      }
    }
  }
  if (completed !== steps.length * batch || waiting.length ||
      book.reservations.some(item => item.releasedAtSeconds !== item.endSeconds)) {
    throw new Error('Harmonogram nie zakończył wszystkich operacji lub rezerwacji; sprawdź jawne okna kalendarzy.');
  }
  jobs.forEach(job => { job.finish = Math.max(...job.ends); });
  if (jobs.some(job => !Number.isFinite(job.finish))) throw new Error('Proces nie został ukończony.');
  return {mode: calendars ? 'calendar' : 'logical', jobs, runs, reservations: book,
    operationIds: steps.map(step => step.id), ...(bodyBook ? {bodyBook, bodyEvents} : {}), ...(checked.assemblyTransport ? {transportReservations:transportDevices,cartBook} : {})};
}
