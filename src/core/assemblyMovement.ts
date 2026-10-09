import {parseDomainProjectV6, type DomainProjectV6} from './domainProject';
import {validateAssemblyTransport} from './assemblyTransport';
import {availableWindows, intersectWindows} from './resourceCalendar';
import {resolveTransportTime} from './transportTime';
import {startCartMovement, finishCartMovement, type CartBook, type CartMotionRoute} from './transportState';
import {reserveWorkerTeam, releaseWorkerTeam, type WorkerReservationBook} from './workerReservations';

export type AssemblyMovementRequest = {
  reservationId: string; earliestSeconds: number;
} & (
  {kind: 'loaded'; stationRouteId: string; alternativeIndex: number} |
  {kind: 'empty'; emptyRouteId: string; workerIds: readonly string[]; assignmentSource: string}
);
export interface AssemblyMovementResult {
  carts: CartBook;
  workers: WorkerReservationBook;
  equipmentId: string;
  reservationId: string;
  kind: 'loaded' | 'empty';
  routeId: string;
  workerIds: readonly string[];
  startSeconds: number;
  endSeconds: number;
  waitSeconds: number;
  waitCauses: readonly ('workers' | 'calendar')[];
}

/** One explicit physical leg, sharing the assembly worker ledger. No implicit empty-leg crew or return. */
export function reserveAssemblyMovement(projectInput: DomainProjectV6, carts: CartBook, workers: WorkerReservationBook,
  request: AssemblyMovementRequest): AssemblyMovementResult {
  const project = parseDomainProjectV6(JSON.stringify(projectInput));
  if(!Number.isFinite(request.earliestSeconds) || request.earliestSeconds < carts.atSeconds ||
    typeof request.reservationId !== 'string' || !request.reservationId.trim()) {
    throw new Error('Transport montażu: niepoprawny czas lub ID rezerwacji.');
  }
  const rules = validateAssemblyTransport(project, project.assemblyTransport);
  let route: CartMotionRoute, workerIds: readonly string[];
  if(request.kind === 'loaded') {
    const rule = rules.routes.find(r => r.stationRouteId === request.stationRouteId);
    if(!rule || !Number.isSafeInteger(request.alternativeIndex) || request.alternativeIndex < 0) {
      throw new Error('Transport montażu: brak jawnego wymagania lub alternatywy przewozu.');
    }
    const alternative = rule.alternatives[request.alternativeIndex];
    if(!alternative || alternative.equipmentIds.length !== 1 ||
      !rules.carts.some(cart => cart.equipmentId === alternative.equipmentIds[0])) {
      throw new Error('Transport montażu: ten etap ruchu wymaga jednego jawnego wózka; pozostałych zestawów nie pomija.');
    }
    const declared = project.stationRouting!.routes.find(r => r.id === request.stationRouteId)!;
    route = {...declared, equipmentId: alternative.equipmentIds[0]};
    workerIds = alternative.workerIds;
  } else if(request.kind === 'empty') {
    const declared = rules.emptyRoutes.find(r => r.id === request.emptyRouteId);
    if(!declared || typeof request.assignmentSource !== 'string' || !request.assignmentSource.trim()) {
      throw new Error('Transport montażu: dojazd wymaga jawnej trasy i źródła przydziału osób.');
    }
    route = declared;workerIds = request.workerIds;
  } else throw new Error('Transport montażu: nieznany rodzaj ruchu.');
  if(!Array.isArray(workerIds) || new Set(workerIds).size !== workerIds.length ||
    workerIds.some(id => !project.workers.some(w => w.id === id) || !workers.workerIds.includes(id))) {
    throw new Error('Transport montażu: nieznane lub powtórzone osoby przydziału.');
  }
  const cart = carts.carts.find(c => c.equipmentId === route.equipmentId);
  if(!cart || cart.movement || !cart.location || cart.location.stationId !== route.from.stationId || cart.location.copy !== route.from.copy) {
    throw new Error('Transport montażu: wózek jest zajęty lub wymaga wcześniejszego jawnego dojazdu.');
  }
  const declaration = rules.carts.find(c => c.equipmentId === route.equipmentId)!;
  if(JSON.stringify(cart.calendar) !== JSON.stringify(declaration.calendar)) {
    throw new Error('Transport montażu: rejestr wózka ma inny kalendarz niż deklaracja.');
  }
  let windows = availableWindows(declaration.calendar);
  for(const id of workerIds) {
    const calendar = project.resourceCalendars?.workers[id];
    if(!calendar) throw new Error(`Transport montażu: osoba ${id} wymaga jawnego kalendarza.`);
    windows = intersectWindows(windows, availableWindows(calendar));
  }
  const duration = resolveTransportTime(route)!.durationSeconds;
  const causes = new Set<'workers' | 'calendar'>();
  let probe = request.earliestSeconds;
  for(let attempt = 0; attempt < 10000; attempt++) {
    const window = windows.find(w => Math.max(w.startSeconds, probe) + duration <= w.endSeconds);
    if(!window) throw new Error('Transport montażu: brak ciągłego wspólnego okna dla przewozu.');
    const start = Math.max(probe, window.startSeconds), end = start + duration;
    if(!Number.isFinite(end) || end <= start) throw new Error('Transport montażu: niepoprawny koniec ruchu.');
    if(start > probe) causes.add('calendar');
    const conflicts = workers.reservations.filter(r => r.startSeconds < end && start < r.endSeconds &&
      r.workerIds.some(id => workerIds.includes(id)));
    if(conflicts.length) {causes.add('workers');probe = Math.max(...conflicts.map(r => r.endSeconds));continue;}
    // Both operations are immutable: failure of either never publishes a half-reservation.
    const nextCarts = startCartMovement(project, carts, route, request.kind, start);
    const nextWorkers = workerIds.length ? reserveWorkerTeam(workers, {reservationId: request.reservationId,
      workerIds, startSeconds: start, endSeconds: end}) : workers;
    return {carts: nextCarts, workers: nextWorkers, equipmentId: route.equipmentId, reservationId: request.reservationId,
      kind: request.kind, routeId: route.id, workerIds: [...workerIds], startSeconds: start, endSeconds: end,
      waitSeconds: start - request.earliestSeconds, waitCauses: [...causes]};
  }
  throw new Error('Transport montażu: przekroczono limit wyszukiwania wspólnej rezerwacji.');
}

export function finishAssemblyMovement(movement: AssemblyMovementResult, currentCarts: CartBook,
  currentWorkers: WorkerReservationBook, at: number): AssemblyMovementResult {
  const active = currentCarts.carts.find(cart => cart.equipmentId === movement.equipmentId)?.movement;
  const reservation = currentWorkers.reservations.find(item => item.reservationId === movement.reservationId);
  if(!active || active.routeId !== movement.routeId || active.kind !== movement.kind ||
    active.startSeconds !== movement.startSeconds || active.endSeconds !== movement.endSeconds ||
    (movement.workerIds.length && (!reservation || reservation.startSeconds !== movement.startSeconds ||
      reservation.endSeconds !== movement.endSeconds || reservation.workerIds.length !== movement.workerIds.length ||
      reservation.workerIds.some(id => !movement.workerIds.includes(id))))) {
    throw new Error('Transport montażu: zakończenie nie odpowiada aktualnej wspólnej rezerwacji.');
  }
  const carts = finishCartMovement(currentCarts, movement.equipmentId, at);
  const workers = movement.workerIds.length ? releaseWorkerTeam(currentWorkers, movement.reservationId, at) : currentWorkers;
  return {...movement, carts, workers};
}
