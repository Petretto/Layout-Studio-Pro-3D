import type {DomainProjectV6} from './domainProject';
import {availableWindows, intersectWindows} from './resourceCalendar';
import {resolveTransportTime} from './transportTime';
import {reserveWorkerTeam, type WorkerReservationBook} from './workerReservations';
import {startCartMovement, type CartBook} from './transportState';

export interface TransportDeviceReservation {
  reservationId: string; equipmentIds: readonly string[]; startSeconds: number; endSeconds: number;
}
export interface AssemblyDispatch {
  reservationId: string; routeId: string; workerIds: readonly string[]; equipmentIds: readonly string[];
  startSeconds: number; endSeconds: number; waitCauses: readonly ('workers' | 'calendar' | 'transport')[];
  workers: WorkerReservationBook; carts: CartBook; devices: readonly TransportDeviceReservation[];
}

/** Candidate planning is immutable. Only the selected candidate may publish these ledgers. */
export function previewAssemblyDispatch(project: DomainProjectV6, routeId: string, carts: CartBook,
  workers: WorkerReservationBook, devices: readonly TransportDeviceReservation[], earliest: number,
  reservationId: string): AssemblyDispatch {
  const rules = project.assemblyTransport!, rule = rules.routes.find(r => r.stationRouteId === routeId);
  const route = project.stationRouting?.routes.find(r => r.id === routeId);
  if(!rule || !route) throw new Error(`3.4.3: trasa ${routeId} wymaga jawnego zestawu transportu montażu.`);
  const duration = resolveTransportTime(route)!.durationSeconds;
  let best: AssemblyDispatch | undefined;
  const failures: string[] = [];
  for(const alternative of rule.alternatives) {
    try {
      const cartIds = alternative.equipmentIds.filter(id => rules.carts.some(c => c.equipmentId === id));
      if(cartIds.length > 1) throw new Error('3.4.3: wspólny przewóz wieloma wózkami oczekuje na integrację.');
      let windows = [{startSeconds: earliest, endSeconds: Number.MAX_VALUE}];
      for(const id of alternative.workerIds) {
        const calendar = project.resourceCalendars?.workers[id];
        if(!calendar) throw new Error(`3.4.3: osoba transportu ${id} wymaga jawnego kalendarza.`);
        windows = intersectWindows(windows, availableWindows(calendar));
      }
      for(const id of alternative.equipmentIds) {
        const declaration = rules.carts.find(c => c.equipmentId === id) ?? rules.conveyors.find(c => c.equipmentId === id)!;
        windows = intersectWindows(windows, availableWindows(declaration.calendar));
      }
      let probe = earliest;
      const causes = new Set<'workers' | 'calendar' | 'transport'>();
      for(let attempt = 0; attempt < 10000; attempt++) {
        const window = windows.find(w => Math.max(probe, w.startSeconds) + duration <= w.endSeconds);
        if(!window) throw new Error('3.4.3: brak wspólnego ciągłego okna transportu.');
        const start = Math.max(probe, window.startSeconds), end = start + duration;
        if(!Number.isFinite(end) || end <= start) throw new Error('3.4.3: niepoprawny koniec transportu.');
        if(start > probe) causes.add('calendar');
        const people = workers.reservations.filter(r => r.startSeconds < end && start < r.endSeconds && r.workerIds.some(id => alternative.workerIds.includes(id)));
        const equipment = devices.filter(r => r.startSeconds < end && start < r.endSeconds && r.equipmentIds.some(id => alternative.equipmentIds.includes(id)));
        if(people.length || equipment.length) {
          if(people.length) causes.add('workers');if(equipment.length) causes.add('transport');
          probe = Math.max(...[...people, ...equipment].map(r => r.endSeconds));continue;
        }
        let nextCarts = carts;
        if(cartIds.length) {
          const cart = carts.carts.find(c => c.equipmentId === cartIds[0])!;
          if(cart.movement) throw new Error('3.4.3: wózek oczekuje na zakończenie aktywnego ruchu.');
          if(!cart.location || cart.location.stationId !== route.from.stationId || cart.location.copy !== route.from.copy) {
            throw new Error('3.4.3: wózek wymaga jawnego dojazdu; nie wolno teleportować urządzenia.');
          }
          nextCarts = startCartMovement(project, carts, {...route, equipmentId: cartIds[0]}, 'loaded', start);
        }
        const nextWorkers = alternative.workerIds.length ? reserveWorkerTeam(workers, {reservationId,
          workerIds: alternative.workerIds, startSeconds: start, endSeconds: end}) : workers;
        const nextDevices = alternative.equipmentIds.length ? [...devices, {reservationId,
          equipmentIds: [...alternative.equipmentIds], startSeconds: start, endSeconds: end}] : devices;
        const candidate: AssemblyDispatch = {reservationId, routeId, workerIds: [...alternative.workerIds], equipmentIds: [...alternative.equipmentIds],
          startSeconds: start, endSeconds: end, waitCauses: [...causes], workers: nextWorkers, carts: nextCarts, devices: nextDevices};
        if(!best || start < best.startSeconds) best = candidate;
        break;
      }
    } catch(error) {failures.push((error as Error).message);}
  }
  if(!best) throw new Error(failures.join(' ') || '3.4.3: brak wykonalnego zestawu transportu.');
  return best;
}
