import type {DomainProjectV6} from './domainProject';
import {availableWindows, intersectWindows} from './resourceCalendar';
import {resolveTransportTime} from './transportTime';
import {reserveWorkerTeam, type WorkerReservationBook} from './workerReservations';
import {startCartMovement, finishCartMovement, type CartBook} from './transportState';
import {reserveAssemblyMovement} from './assemblyMovement';

export interface TransportDeviceReservation {
  reservationId: string; equipmentIds: readonly string[]; startSeconds: number; endSeconds: number;
}
export interface AssemblyDispatch {
  reservationId: string; routeId: string; workerIds: readonly string[]; equipmentIds: readonly string[];
  startSeconds: number; endSeconds: number; waitCauses: readonly ('workers' | 'calendar' | 'transport')[];
  workers: WorkerReservationBook; carts: CartBook; devices: readonly TransportDeviceReservation[];
  prefix?: AssemblyDispatch;
}

export function previewEmptyDispatch(project: DomainProjectV6, routeId: string, carts: CartBook,
  workers: WorkerReservationBook, devices: readonly TransportDeviceReservation[], earliest: number,
  reservationId: string): AssemblyDispatch {
  const route = project.assemblyTransport!.emptyRoutes.find(r => r.id === routeId);
  if(!route?.workerAssignment) throw new Error(`3.4.3: dojazd ${routeId} wymaga jawnej obsady ze źródłem, także dla braku osób.`);
  const movement = reserveAssemblyMovement(project,carts,workers,{kind:'empty',emptyRouteId:routeId,
    workerIds:route.workerAssignment.workerIds,assignmentSource:route.workerAssignment.source,reservationId,earliestSeconds:earliest});
  return {...movement, equipmentIds:[movement.equipmentId], devices:[...devices,{reservationId,
    equipmentIds:[movement.equipmentId],startSeconds:movement.startSeconds,endSeconds:movement.endSeconds}]};
}

/** Candidate planning is immutable. Only the selected candidate may publish these ledgers. */
export function previewAssemblyDispatch(project: DomainProjectV6, routeId: string, carts: CartBook,
  workers: WorkerReservationBook, devices: readonly TransportDeviceReservation[], earliest: number,
  reservationId: string, emptyEarliest = earliest, lockedCarts: ReadonlySet<string> = new Set()): AssemblyDispatch {
  const rules = project.assemblyTransport!, rule = rules.routes.find(r => r.stationRouteId === routeId);
  const route = project.stationRouting?.routes.find(r => r.id === routeId);
  if(!rule || !route) throw new Error(`3.4.3: trasa ${routeId} wymaga jawnego zestawu transportu montażu.`);
  const duration = resolveTransportTime(route)!.durationSeconds;
  let best: AssemblyDispatch | undefined;
  const failures: string[] = [];
  alternatives: for(const alternative of rule.alternatives) {
    try {
      const cartIds = alternative.equipmentIds.filter(id => rules.carts.some(c => c.equipmentId === id));
      for(const cartId of cartIds) {
        const cart = carts.carts.find(c => c.equipmentId === cartId)!;
        if(cart.movement || lockedCarts.has(cart.equipmentId)) throw new Error('3.4.3: wózek oczekuje na zakończenie aktywnego ruchu lub powrotu.');
        if(cart.location && (cart.location.stationId !== route.from.stationId || cart.location.copy !== route.from.copy)) {
          if(cartIds.length > 1) throw new Error('3.4.3: zestaw wielu wózków wymaga wszystkich egzemplarzy przy miejscu odbioru; wspólne dojazdy oczekują na integrację.');
          const emptyRoute = rules.emptyRoutes.find(r => r.equipmentId === cart.equipmentId &&
            r.from.stationId === cart.location!.stationId && r.from.copy === cart.location!.copy &&
            r.to.stationId === route.from.stationId && r.to.copy === route.from.copy);
          if(!emptyRoute) throw new Error('3.4.3: wózek wymaga jawnego dojazdu; nie wolno teleportować urządzenia.');
          const prefix = previewEmptyDispatch(project,emptyRoute.id,carts,workers,devices,emptyEarliest,`${reservationId}:approach:${emptyEarliest}`);
          const arrived = finishCartMovement(prefix.carts,cart.equipmentId,prefix.endSeconds);
          const oneAlternative = {...project,assemblyTransport:{...rules,routes:rules.routes.map(r => r === rule ? {...r,alternatives:[alternative]} : r)}};
          const loaded = previewAssemblyDispatch(oneAlternative,routeId,arrived,prefix.workers,prefix.devices,
            Math.max(earliest,prefix.endSeconds),reservationId);
          const candidate = {...loaded,prefix};
          if(!best || candidate.startSeconds < best.startSeconds) best = candidate;
          continue alternatives;
        }
      }
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
        for(const cartId of cartIds) {
          const cart = nextCarts.carts.find(c => c.equipmentId === cartId)!;
          if(cart.movement) throw new Error('3.4.3: wózek oczekuje na zakończenie aktywnego ruchu.');
          if(!cart.location || cart.location.stationId !== route.from.stationId || cart.location.copy !== route.from.copy) {
            throw new Error('3.4.3: wózek wymaga jawnego dojazdu; nie wolno teleportować urządzenia.');
          }
          nextCarts = startCartMovement(project, nextCarts, {...route, equipmentId: cartId}, 'loaded', start);
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
