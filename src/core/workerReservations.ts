/** Draft-only reservation ledger. Intervals are half-open: [startSeconds, endSeconds). */
export interface WorkerReservation {
  reservationId: string;
  workerIds: readonly string[];
  startSeconds: number;
  endSeconds: number;
  releasedAtSeconds?: number;
}

export interface WorkerReservationBook {
  workerIds: readonly string[];
  reservations: readonly WorkerReservation[];
}

function validId(id: string): boolean {
  return typeof id === 'string' && !!id.trim();
}

export function createWorkerReservationBook(workerIds: readonly string[]): WorkerReservationBook {
  if (!Array.isArray(workerIds) || workerIds.some(id => !validId(id)) ||
      new Set(workerIds).size !== workerIds.length) {
    throw new Error('Rejestr rezerwacji wymaga unikalnych, niepustych ID pracowników.');
  }
  return {workerIds: [...workerIds], reservations: []};
}

/** Reserve exact people and an explicit time window; no pool or operation rule is inferred. */
export function reserveWorkerTeam(book: WorkerReservationBook, request: Omit<WorkerReservation, 'releasedAtSeconds'>): WorkerReservationBook {
  if (!validId(request.reservationId) || book.reservations.some(item => item.reservationId === request.reservationId)) {
    throw new Error('Rezerwacja wymaga nowego, niepustego ID.');
  }
  if (!Array.isArray(request.workerIds) || !request.workerIds.length ||
      request.workerIds.some(id => !book.workerIds.includes(id)) ||
      new Set(request.workerIds).size !== request.workerIds.length) {
    throw new Error('Rezerwacja wymaga znanych, niepowtórzonych pracowników.');
  }
  if (!Number.isFinite(request.startSeconds) || !Number.isFinite(request.endSeconds) ||
      request.startSeconds < 0 || request.endSeconds <= request.startSeconds) {
    throw new Error('Rezerwacja wymaga dodatniej długości i poprawnych granic czasu.');
  }
  for (const previous of book.reservations) {
    if (request.startSeconds < previous.endSeconds && previous.startSeconds < request.endSeconds) {
      const shared = request.workerIds.find(id => previous.workerIds.includes(id));
      if (shared) throw new Error(`Pracownik ${shared} ma nakładającą się rezerwację ${previous.reservationId}.`);
    }
  }
  return {workerIds: book.workerIds, reservations: [...book.reservations,
    {reservationId: request.reservationId, workerIds: [...request.workerIds],
      startSeconds: request.startSeconds, endSeconds: request.endSeconds}]};
}

/** End one reservation early or at its planned end; keep the shortened interval for audit. */
export function releaseWorkerTeam(book: WorkerReservationBook, reservationId: string, atSeconds: number): WorkerReservationBook {
  const previous = book.reservations.find(item => item.reservationId === reservationId);
  if (!previous) throw new Error(`Rezerwacja ${reservationId} nie istnieje.`);
  if (previous.releasedAtSeconds !== undefined) throw new Error(`Rezerwacja ${reservationId} została już zwolniona.`);
  if (!Number.isFinite(atSeconds) || atSeconds <= previous.startSeconds || atSeconds > previous.endSeconds) {
    throw new Error('Czas zwolnienia musi leżeć po rozpoczęciu i nie później niż koniec rezerwacji.');
  }
  return {workerIds: book.workerIds, reservations: book.reservations.map(item =>
    item.reservationId === reservationId ? {...item, endSeconds: atSeconds, releasedAtSeconds: atSeconds} : item)};
}
