import {applyBodyEvent, type BodyBook, type BodyTimeBasis} from './bodyState';
import {applyBufferEvent, bufferLoad, type BufferBook, type BufferRef} from './bufferState';

/** Run-time overlay: a buffer side refines the body's station location, never replaces it. */
export interface BufferedBodyBook {bodies: BodyBook; buffers: BufferBook}
export type BufferedBodyEvent =
  | {kind: 'complete-to-output'; bodyId: string; atSeconds: number; operationId: string; to: BufferRef}
  | {kind: 'reserve-input'; bodyId: string; atSeconds: number; to: BufferRef}
  | {kind: 'cancel-input'; bodyId: string; atSeconds: number}
  | {kind: 'depart'; bodyId: string; atSeconds: number; endSeconds: number; basis: BodyTimeBasis}
  | {kind: 'arrive'; bodyId: string; atSeconds: number}
  | {kind: 'start-operation'; bodyId: string; atSeconds: number; operationId: string; endSeconds: number; basis: BodyTimeBasis};
const sameCopy = (a: {stationId: string; copy: number}, b: {stationId: string; copy: number}) =>
  a.stationId === b.stationId && a.copy === b.copy;

/** Reject contradictory input rather than repairing/teleporting a physical body. */
export function validateBufferedBodyBook(book: BufferedBodyBook): void {
  for (const place of book.buffers.places) {
    if (place.capacity !== null && bufferLoad(book.buffers, place) > place.capacity) {
      throw new Error('Bufor korpusu: przekroczona pojemność.');
    }
  }
  const ids = new Set<string>();
  for (const token of book.buffers.tokens) {
    if (ids.has(token.id)) throw new Error('Bufor korpusu: powtórzone ID.');
    ids.add(token.id);
    const body = book.bodies.bodies.find(body => body.id === token.id);
    if (!body) throw new Error('Bufor wskazuje nieznany korpus.');
    for (const ref of [token.location, token.destination]) {
      if (ref && !book.buffers.places.some(place => sameCopy(place, ref) && place.side === ref.side)) {
        throw new Error('Bufor korpusu: nieznane miejsce.');
      }
    }
    if (token.moving) {
      if (token.location || !token.destination || body.status !== 'moving' || body.location.kind !== 'unknown' ||
          !sameCopy(body.transfer.to, token.destination)) throw new Error('Sprzeczny transport korpusu i bufora.');
    } else if (!token.location || body.status !== 'available' || body.location.kind !== 'station' ||
        !sameCopy(body.location, token.location)) throw new Error('Sprzeczna lokalizacja korpusu i bufora.');
    if (token.destination && (token.destination.side !== 'input' ||
        token.location && (token.location.side !== 'output' || sameCopy(token.location, token.destination)))) {
      throw new Error('Transport buforowy wymaga wyjścia źródła i wejścia innej kopii.');
    }
  }
}

/** Atomic body + capacity transitions; caller still owns cart/crew/calendar admission.
 * Zero capacity requires a future scheduler-owned direct-handoff grant, never a stored token.
 * This bridge deliberately refuses that path until joint operation/resource admission exists.
 */
export function applyBufferedBodyEvent(book: BufferedBodyBook, event: BufferedBodyEvent): BufferedBodyBook {
  validateBufferedBodyBook(book);
  let bodies = book.bodies, buffers = book.buffers;
  const body = bodies.bodies.find(body => body.id === event.bodyId);
  if (!body) throw new Error('Nieznana instancja korpusu.');
  if (event.atSeconds < body.lastEventSeconds) throw new Error('Zdarzenie korpusu cofa czas.');
  const token = buffers.tokens.find(token => token.id === event.bodyId);
  const base = {bodyId: event.bodyId, atSeconds: event.atSeconds};
  const bufferBase = {id: event.bodyId, atSeconds: event.atSeconds};
  switch (event.kind) {
    case 'complete-to-output':
      if (token || event.to.side !== 'output' || body.location.kind !== 'station' || !sameCopy(body.location, event.to)) {
        throw new Error('Zakończenie wymaga wyjścia aktualnej kopii i korpusu poza buforem.');
      }
      bodies = applyBodyEvent(bodies, {...base, kind: 'release', operationId: event.operationId});
      // If capacity rejects admission, neither the release nor the deposit is published.
      buffers = applyBufferEvent(buffers, {...bufferBase, kind: 'reserve', to: event.to});
      buffers = applyBufferEvent(buffers, {...bufferBase, kind: 'arrive'});
      break;
    case 'reserve-input':
      if (!token?.location || token.location.side !== 'output' || event.to.side !== 'input' || sameCopy(token.location, event.to)) {
        throw new Error('Rezerwacja wymaga wyjścia źródła i wejścia innej kopii.');
      }
      buffers = applyBufferEvent(buffers, {...bufferBase, kind: 'reserve', to: event.to});
      break;
    case 'cancel-input':
      buffers = applyBufferEvent(buffers, {...bufferBase, kind: 'cancel'});
      break;
    case 'depart':
      if (!token?.destination) throw new Error('Wyjazd wymaga wcześniejszej rezerwacji miejsca.');
      bodies = applyBodyEvent(bodies, {...base, kind: 'start-transfer', to: token.destination,
        endSeconds: event.endSeconds, basis: event.basis});
      buffers = applyBufferEvent(buffers, {...bufferBase, kind: 'depart'});
      break;
    case 'arrive':
      if (!token?.moving) throw new Error('Przyjazd wymaga rozpoczętego przewozu.');
      bodies = applyBodyEvent(bodies, {...base, kind: 'finish-transfer'});
      buffers = applyBufferEvent(buffers, {...bufferBase, kind: 'arrive'});
      break;
    case 'start-operation':
      if (!token?.location || token.location.side !== 'input') throw new Error('Operacja wymaga korpusu w buforze wejściowym.');
      bodies = applyBodyEvent(bodies, {...base, kind: 'reserve', operationId: event.operationId,
        endSeconds: event.endSeconds, basis: event.basis});
      buffers = applyBufferEvent(buffers, {...bufferBase, kind: 'remove'});
      break;
    default: throw new Error('Nieznane zdarzenie korpusu w buforze.');
  }
  const next = {bodies, buffers};
  validateBufferedBodyBook(next);
  return next;
}
