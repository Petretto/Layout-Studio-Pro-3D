import {parseDomainProjectV6, type DomainProjectV6} from './domainProject';
import {topologicalSort} from './validation';
import {createWorkerRunPlan} from './workerRunPlan';
import {createWorkerReservationBook, releaseWorkerTeam, reserveWorkerTeam,
  type WorkerReservationBook} from './workerReservations';
import type {Job} from './algorithms/simulation';

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
  waitCauses: readonly ('workers' | 'station' | 'same-job')[];
  reserveStartSeconds: number;
  reserveEndSeconds: number;
}

export interface WorkerScheduleResult {
  jobs: readonly Job[];
  runs: readonly WorkerScheduleRun[];
  reservations: WorkerReservationBook;
  operationIds: readonly string[];
}

type EventInput =
  | {kind: 'arrival'; at: number; job: number}
  | {kind: 'completion'; at: number; job: number; step: number; stationId: string; copy: number}
  | {kind: 'release'; at: number; reservationId: string}
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

/** Draft-only logical schedule. No transport, equipment, calendars or physical body state is inferred. */
export function scheduleWorkerRun(project: DomainProjectV6, arrivalIntervalSeconds: number,
  batch: number): WorkerScheduleResult {
  if (!Number.isFinite(arrivalIntervalSeconds) || arrivalIntervalSeconds <= 0 ||
      !Number.isSafeInteger(batch) || batch < 1 || batch > 10000) {
    throw new Error('Partia: 1–10000; jawny odstęp przybycia musi być dodatni.');
  }
  const checked = parseDomainProjectV6(JSON.stringify(project));
  if (!checked.workerRunSelection) throw new Error('Brak zapisanego wyboru składu przebiegu.');
  const steps = topologicalSort(checked.operations);
  if (!steps.length || steps.length * batch > 5000) {
    throw new Error('Szkic harmonogramu wymaga operacji i dopuszcza najwyżej 5000 wykonań.');
  }
  const plan = createWorkerRunPlan(checked, checked.workerRunSelection.teamWorkerIds,
    checked.workerRunSelection.operations);
  const byOperation = new Map(plan.operations.map(item => [item.operationId, item]));
  const stationByOperation = new Map<string, string>();
  for (const station of checked.stations) for (const operationId of station.operationIds) {
    stationByOperation.set(operationId, station.id);
  }
  const copies = new Map<string, boolean[]>();
  for (const step of steps) {
    const stationId = stationByOperation.get(step.id);
    if (!stationId) throw new Error(`Operacja ${step.id}: brak jawnego przypisania do stanowiska.`);
    if (!copies.has(stationId)) {
      const count = checked.stationSettings[stationId]?.parallelStations;
      if (!Number.isSafeInteger(count) || !count || count < 1) {
        throw new Error(`Stanowisko ${stationId}: brak jawnej liczby kopii.`);
      }
      copies.set(stationId, Array(count).fill(true));
    }
  }
  const successors = steps.map(step => steps.flatMap((other, i) =>
    other.predecessorIds.includes(step.id) ? [i] : []));
  const jobs: Job[] = Array.from({length: batch}, (_, job) => ({id: job + 1,
    arrival: job * arrivalIntervalSeconds, starts: Array(steps.length).fill(Infinity),
    ends: Array(steps.length).fill(Infinity), finish: Infinity}));
  const remaining = jobs.map(() => steps.map(step => step.predecessorIds.length));
  const inFlight = jobs.map(() => false);
  const waiting: {job: number; step: number; ready: number;
    causes: Set<'workers' | 'station' | 'same-job'>}[] = [];
  const events = new EventQueue();
  const wakeTimes = new Set<number>();
  let book = createWorkerReservationBook(plan.teamWorkerIds);
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
      } else {
        copies.get(event.stationId)![event.copy] = true;
        inFlight[event.job] = false;
        completed++;
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
        if (inFlight[task.job]) { task.causes.add('same-job'); continue; }
        const step = steps[task.step];
        const stationId = stationByOperation.get(step.id)!;
        const free = copies.get(stationId)!;
        const copy = free.indexOf(true);
        if (copy < 0) { task.causes.add('station'); continue; }
        const operation = byOperation.get(step.id)!;
        const reserveStart = now + operation.reserveFromSeconds;
        const reserveEnd = now + operation.reserveUntilSeconds;
        const end = now + operation.durationSeconds;
        if (![reserveStart, reserveEnd, end].every(Number.isFinite)) {
          throw new Error('Harmonogram przekroczył poprawny zakres czasu.');
        }
        const conflicts = book.reservations.filter(reservation =>
          reserveStart < reservation.endSeconds && reservation.startSeconds < reserveEnd);
        const workerIds = operation.eligibleWorkerIds.filter(workerId =>
          !conflicts.some(reservation => reservation.workerIds.includes(workerId))).slice(0, operation.workerCount);
        if (workerIds.length < operation.workerCount) {
          task.causes.add('workers');
          for (const conflict of conflicts) {
            if (!conflict.workerIds.some(workerId => operation.eligibleWorkerIds.includes(workerId))) continue;
            const candidate = conflict.endSeconds - operation.reserveFromSeconds;
            const wake = candidate > now ? candidate : conflict.endSeconds;
            if (wake > now && !wakeTimes.has(wake)) {
              wakeTimes.add(wake);
              events.push({kind: 'wake', at: wake});
            }
          }
          continue;
        }
        const reservationId = `${task.job + 1}:${step.id}`;
        book = reserveWorkerTeam(book, {reservationId, workerIds,
          startSeconds: reserveStart, endSeconds: reserveEnd});
        free[copy] = false;
        inFlight[task.job] = true;
        jobs[task.job].starts[task.step] = now;
        jobs[task.job].ends[task.step] = end;
        runs.push({job: task.job + 1, operationId: step.id, stationId, copy: copy + 1,
          workerIds: [...workerIds], readySeconds: task.ready, startSeconds: now,
          endSeconds: end, waitSeconds: now - task.ready, waitCauses: [...task.causes],
          reserveStartSeconds: reserveStart, reserveEndSeconds: reserveEnd});
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
    throw new Error('Harmonogram nie zakończył wszystkich operacji lub rezerwacji.');
  }
  jobs.forEach(job => { job.finish = Math.max(...job.ends); });
  if (jobs.some(job => !Number.isFinite(job.finish))) throw new Error('Proces nie został ukończony.');
  return {jobs, runs, reservations: book, operationIds: steps.map(step => step.id)};
}
