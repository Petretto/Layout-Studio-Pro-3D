import {parseDomainProjectV6, type DomainProjectV6} from './domainProject';
import type {StationCopyRef} from './stationRouting';
import {matchingConcurrencyGroup, type PhysicalConcurrency} from './physicalConcurrency';

export type BodyTimeBasis = 'confirmed' | 'assumed';
export type BodyLocation = {kind: 'unknown'} | ({kind: 'station'} & StationCopyRef);
export interface BodyDeclaration {id: string; productId: string; location: BodyLocation}
export interface BodyReservation {operationId: string; startSeconds: number; endSeconds: number; basis: BodyTimeBasis}
export interface BodyTransfer {from: Extract<BodyLocation, {kind: 'station'}>; to: StationCopyRef;
  startSeconds: number; endSeconds: number; basis: BodyTimeBasis}
export type BodyState = BodyDeclaration & {lastEventSeconds: number} & (
  {status: 'unlocated'} | {status: 'available'} | {status: 'reserved'; reservation: BodyReservation; additionalReservations?: BodyReservation[]} |
  {status: 'moving'; location: {kind: 'unknown'}; transfer: BodyTransfer});
export interface BodyBook {bodies: readonly BodyState[]; operationIds: readonly string[]; copies: readonly StationCopyRef[];
  physicalConcurrency?: PhysicalConcurrency}
export type BodyEvent =
  | {kind: 'locate'; bodyId: string; atSeconds: number; location: StationCopyRef}
  | {kind: 'reserve'; bodyId: string; atSeconds: number; operationId: string; endSeconds: number; basis: BodyTimeBasis}
  | {kind: 'release'; bodyId: string; atSeconds: number; operationId: string}
  | {kind: 'start-transfer'; bodyId: string; atSeconds: number; to: StationCopyRef; endSeconds: number; basis: BodyTimeBasis}
  | {kind: 'finish-transfer'; bodyId: string; atSeconds: number};

const copyKey = (ref: StationCopyRef) => JSON.stringify([ref.stationId, ref.copy]);
const copyRef = (ref: StationCopyRef): StationCopyRef => ({stationId: ref.stationId, copy: ref.copy});
const copyLocation = (value: BodyLocation): BodyLocation => value.kind === 'unknown' ? {kind: 'unknown'} :
  {kind: 'station', stationId: value.stationId, copy: value.copy};
function time(value: number) {
  if (!Number.isFinite(value) || value < 0) throw new Error('Zdarzenie korpusu wymaga jawnego nieujemnego czasu w sekundach.');
}
function window(start: number, end: number, basis: BodyTimeBasis) {
  time(end);
  if (end <= start || !['confirmed', 'assumed'].includes(basis)) throw new Error('Korpus wymaga dodatniego przedziału i jawnego pochodzenia czasu.');
}
function knownCopy(copies: readonly StationCopyRef[], value: StationCopyRef) {
  if (!copies.some(copy => copyKey(copy) === copyKey(value))) throw new Error('Korpus: nieznana kopia stanowiska.');
}

/** Independent run-time ledger. No bodies or locations are generated from products, jobs or geometry. */
export function createBodyBook(project: DomainProjectV6, declarations: readonly BodyDeclaration[], atSeconds: number): BodyBook {
  return createValidatedBodyBook(parseDomainProjectV6(JSON.stringify(project)), declarations, atSeconds);
}

/** Internal validation path: caller has already checked the project definitions. */
export function createValidatedBodyBook(project: DomainProjectV6, declarations: readonly BodyDeclaration[], atSeconds: number): BodyBook {
  time(atSeconds);
  if (!project.product) throw new Error('Rejestr korpusów wymaga jawnej definicji wyrobu.');
  if (declarations.length > 5000) throw new Error('Za dużo instancji korpusu.');
  const copies = project.stations.flatMap(station => {
    const count = project.stationSettings[station.id]?.parallelStations;
    if (!Number.isSafeInteger(count) || !count || count < 1) return [];
    return Array.from({length: count}, (_, index) => ({stationId: station.id, copy: index + 1}));
  });
  const ids = new Set<string>();
  const bodies: BodyState[] = declarations.map(item => {
    if (typeof item.id !== 'string' || !item.id.trim() || ids.has(item.id)) throw new Error('Niepoprawne lub powtórzone ID instancji korpusu.');
    ids.add(item.id);
    if (item.productId !== project.product!.id) throw new Error('Korpus wskazuje nieznany wyrób.');
    if (item.location.kind === 'station') knownCopy(copies, item.location);
    else if (item.location.kind !== 'unknown') throw new Error('Niepoprawna lokalizacja korpusu.');
    return {id: item.id, productId: item.productId, location: copyLocation(item.location), lastEventSeconds: atSeconds,
      status: item.location.kind === 'unknown' ? 'unlocated' : 'available'};
  });
  return {bodies, copies, operationIds: project.operations.map(operation => operation.id),
    ...(project.physicalConcurrency ? {physicalConcurrency: structuredClone(project.physicalConcurrency)} : {})};
}

/** Apply explicit chronological events to one body; moving/reserved bodies cannot be reassigned. */
export function applyBodyEvent(book: BodyBook, event: BodyEvent): BodyBook {
  const body = book.bodies.find(item => item.id === event.bodyId);
  if (!body) throw new Error('Nieznana instancja korpusu.');
  time(event.atSeconds);
  if (event.atSeconds < body.lastEventSeconds) throw new Error('Zdarzenie korpusu cofa czas.');
  const base = {id: body.id, productId: body.productId, location: copyLocation(body.location), lastEventSeconds: event.atSeconds};
  let next: BodyState;
  switch (event.kind) {
    case 'locate':
      if (body.status !== 'unlocated' || body.location.kind !== 'unknown') throw new Error('Można uzupełnić tylko nieznaną lokalizację wolnego korpusu.');
      knownCopy(book.copies, event.location);
      next = {...base, status: 'available', location: {kind: 'station', ...copyRef(event.location)}};
      break;
    case 'reserve':
      if (body.location.kind !== 'station' || !bodyAllowsOperation(book, body.id, event.operationId, body.location)) {
        throw new Error('Korpus nie jest dostępny w określonym miejscu lub nie dopuszcza całej grupy operacji.');
      }
      if (!book.operationIds.includes(event.operationId)) throw new Error('Korpus: nieznana operacja.');
      window(event.atSeconds, event.endSeconds, event.basis);
      const reservation = {operationId: event.operationId, startSeconds: event.atSeconds, endSeconds: event.endSeconds, basis: event.basis};
      next = body.status === 'reserved' ? {...base, status: 'reserved', reservation: body.reservation,
        additionalReservations: [...(body.additionalReservations ?? []), reservation]} : {...base, status: 'reserved', reservation};
      break;
    case 'release': {
      const reservations = body.status === 'reserved' ? [body.reservation, ...(body.additionalReservations ?? [])] : [];
      const released = reservations.find(item => item.operationId === event.operationId);
      if (!released || event.atSeconds < released.endSeconds) {
        throw new Error('Nie można zwolnić korpusu przed końcem zajęcia lub przez inną operację.');
      }
      const remaining = reservations.filter(item => item !== released);
      next = remaining.length ? {...base, status: 'reserved', reservation: remaining[0],
        ...(remaining.length > 1 ? {additionalReservations: remaining.slice(1)} : {})} : {...base, status: 'available'};
      break;
    }
    case 'start-transfer':
      if (body.status !== 'available' || body.location.kind !== 'station') throw new Error('Nie można przenieść zajętego korpusu lub korpusu bez lokalizacji.');
      knownCopy(book.copies, event.to);
      if (copyKey(body.location) === copyKey(event.to)) throw new Error('Przemieszczenie korpusu wymaga innej kopii docelowej.');
      window(event.atSeconds, event.endSeconds, event.basis);
      next = {...base, status: 'moving', location: {kind: 'unknown'}, transfer: {
        from: {kind: 'station', ...copyRef(body.location)}, to: copyRef(event.to), startSeconds: event.atSeconds, endSeconds: event.endSeconds, basis: event.basis}};
      break;
    case 'finish-transfer':
      if (body.status !== 'moving' || event.atSeconds < body.transfer.endSeconds) throw new Error('Korpus nie zakończył zadeklarowanego przemieszczenia.');
      next = {...base, status: 'available', location: {kind: 'station', ...body.transfer.to}};
      break;
    default: throw new Error('Nieznany rodzaj zdarzenia korpusu.');
  }
  return {...book, bodies: book.bodies.map(item => item.id === body.id ? next : item)};
}

/** Query the recorded state only; elapsed time never releases or moves a body implicitly. */
export function bodyAvailableAt(book: BodyBook, bodyId: string, location: StationCopyRef): boolean {
  knownCopy(book.copies, location);
  const body = book.bodies.find(item => item.id === bodyId);
  if (!body) throw new Error('Nieznana instancja korpusu.');
  return body.status === 'available' && body.location.kind === 'station' && copyKey(body.location) === copyKey(location);
}

/** Joining work still requires resource checks in the scheduler; a body never gains another location. */
export function bodyAllowsOperation(book: BodyBook, bodyId: string, operationId: string, location: StationCopyRef): boolean {
  knownCopy(book.copies, location);
  const body = book.bodies.find(item => item.id === bodyId);
  if (!body) throw new Error('Nieznana instancja korpusu.');
  if (!book.operationIds.includes(operationId)) throw new Error('Korpus: nieznana operacja.');
  if (body.location.kind !== 'station' || copyKey(body.location) !== copyKey(location)) return false;
  if (body.status === 'available') return true;
  return body.status === 'reserved' && !!matchingConcurrencyGroup(book.physicalConcurrency,
    [body.reservation.operationId, ...(body.additionalReservations ?? []).map(item => item.operationId), operationId]);
}
