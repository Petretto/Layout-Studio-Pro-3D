import type {DomainProjectV6} from './domainProject';
import {reserveAssemblyMovement, finishAssemblyMovement, type AssemblyMovementResult} from './assemblyMovement';
import {applyBufferedBodyEvent, type BufferedBodyBook} from './bufferedBodyState';
import type {CartBook} from './transportState';
import type {WorkerReservationBook} from './workerReservations';
import {resolveTransportTime} from './transportTime';

export interface BufferedAssemblyMovement {bodyId: string; physical: BufferedBodyBook; movement: AssemblyMovementResult}

/** A candidate single-cart leg. Publish all returned ledgers together at its actual start.
 * Capacity admission precedes dispatch; rejected dispatch never publishes a landing promise.
 * Multi-cart approaches, direct handoffs and station/equipment release belong to the scheduler.
 */
export function reserveBufferedAssemblyMovement(project: DomainProjectV6, physical: BufferedBodyBook,
  carts: CartBook, workers: WorkerReservationBook, request: {
    bodyId: string; stationRouteId: string; alternativeIndex: number; reservationId: string; earliestSeconds: number;
  }): BufferedAssemblyMovement {
  const route = project.stationRouting?.routes.find(route => route.id === request.stationRouteId);
  const token = physical.buffers.tokens.find(token => token.id === request.bodyId);
  if (!route || !token?.location || token.location.side !== 'output' ||
      token.location.stationId !== route.from.stationId || token.location.copy !== route.from.copy) {
    throw new Error('Transport buforowy: trasa nie zaczyna się w zajętym wyjściu korpusu.');
  }
  const timing = resolveTransportTime(route);
  if (!timing) throw new Error('Transport buforowy wymaga jawnego czasu.');
  const reserved = applyBufferedBodyEvent(physical, {kind: 'reserve-input', bodyId: request.bodyId,
    atSeconds: request.earliestSeconds, to: {...route.to, side: 'input'}});
  const movement = reserveAssemblyMovement(project, carts, workers, {...request, kind: 'loaded'});
  const departed = applyBufferedBodyEvent(reserved, {kind: 'depart', bodyId: request.bodyId,
    atSeconds: movement.startSeconds, endSeconds: movement.endSeconds,
    basis: timing.basis === 'measured' ? 'confirmed' : 'assumed'});
  return {bodyId: request.bodyId, physical: departed, movement};
}

/** Use current shared ledgers so another body's intervening events/reservations are retained. */
export function finishBufferedAssemblyMovement(candidate: BufferedAssemblyMovement, physical: BufferedBodyBook,
  carts: CartBook, workers: WorkerReservationBook, atSeconds: number): BufferedAssemblyMovement {
  const body = physical.bodies.bodies.find(body => body.id === candidate.bodyId);
  const active = carts.carts.find(cart => cart.equipmentId === candidate.movement.equipmentId)?.movement;
  const routeTo = active?.to;
  if (body?.status !== 'moving' || !routeTo || body.transfer.to.stationId !== routeTo.stationId ||
      body.transfer.to.copy !== routeTo.copy || body.transfer.from.stationId !== active!.from.stationId ||
      body.transfer.from.copy !== active!.from.copy || body.transfer.startSeconds !== candidate.movement.startSeconds ||
      body.transfer.endSeconds !== candidate.movement.endSeconds) throw new Error('Transport buforowy: niezgodny przewóz korpusu i wózka.');
  const arrived = applyBufferedBodyEvent(physical, {kind: 'arrive', bodyId: candidate.bodyId, atSeconds});
  const movement = finishAssemblyMovement(candidate.movement, carts, workers, atSeconds);
  return {bodyId: candidate.bodyId, physical: arrived, movement};
}
