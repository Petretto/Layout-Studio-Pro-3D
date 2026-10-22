import {parseDomainProjectV6, type DomainProjectV6} from './domainProject';
import {prepareDomainPlayback, type DomainPlaybackConditions} from './domainPlayback';
import {prepareBodyRun, type BodyRunInput} from './bodyRunInput';
import {applyBodyEvent, type BodyBook, type BodyState} from './bodyState';
import {createCartBook, startCartMovement, finishCartMovement, type CartState} from './transportState';
import type {WorkerScheduleResult} from './workerSchedule';

interface Sample<T> {atSeconds: number; state: T}
interface Track<T> {id: string; samples: Sample<T>[]}

// Object property order is irrelevant to ledger equality; array/event order is not.
function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value && typeof value === 'object') return `{${Object.entries(value).sort(([a], [b]) => a.localeCompare(b))
    .map(([key, item]) => `${JSON.stringify(key)}:${canonical(item)}`).join(',')}}`;
  return JSON.stringify(value);
}

/** Read-side history only. Does not schedule, interpolate geometry, or infer body/job assignments.
 * The caller supplies the same body input used by the worker (persisted declarations by default).
 * Complete event replay must equal the worker's final ledgers before any history is accepted.
 */
export function prepareDomainPhysicalPlayback(input: DomainProjectV6, result: WorkerScheduleResult,
  conditions: DomainPlaybackConditions, bodyInput: BodyRunInput | undefined = input.bodyRunInput) {
  const project = parseDomainProjectV6(JSON.stringify(input));
  const binding = prepareDomainPlayback(project, result, conditions);
  const bodies: Track<BodyState>[] = [], carts: Track<CartState>[] = [];
  let endSeconds = binding.endSeconds;
  if (conditions.transportMode === 'just-in-time') {
    if (result.bodyBook !== undefined || result.bodyEvents !== undefined || result.cartBook !== undefined ||
        result.transportMovements !== undefined) throw new Error('Odtwarzanie JIT nie może zawierać fizycznych lokalizacji.');
    return {modelSignature: binding.modelSignature, resultSignature: binding.resultSignature,
      endSeconds, mode: 'just-in-time' as const, bodies, carts};
  }

  const initial = prepareBodyRun(project, conditions.batch, bodyInput);
  if (!!initial !== !!result.bodyBook || (initial && !result.bodyEvents) ||
      (!initial && result.bodyEvents?.length)) throw new Error('Historia korpusów wymaga zgodnych deklaracji i rejestru wyniku.');
  if (initial) {
    const books = new Map<string, BodyBook>();
    for (const body of initial.book.bodies) {
      books.set(body.id, {...initial.book, bodies: [body]});
      bodies.push({id: body.id, samples: [{atSeconds: 0, state: body}]});
    }
    const tracks = new Map(bodies.map(track => [track.id, track]));
    // Keep the recorded order at equal times, including release/start for local continuation.
    for (const event of result.bodyEvents!) {
      const book = books.get(event.bodyId);
      if (!book) throw new Error('Historia wskazuje nieznany korpus.');
      const next = applyBodyEvent(book, event);
      books.set(event.bodyId, next);
      tracks.get(event.bodyId)!.samples.push({atSeconds: event.atSeconds, state: structuredClone(next.bodies[0])});
      endSeconds = Math.max(endSeconds, event.atSeconds);
    }
    const final = {...initial.book, bodies: initial.book.bodies.map(body => books.get(body.id)!.bodies[0])};
    if (canonical(final) !== canonical(result.bodyBook)) throw new Error('Historia korpusów nie odtwarza końcowego rejestru workera.');
    for (const run of result.runs) if (run.bodyId !== undefined && initial.bodyByJob.get(run.job) !== run.bodyId)
      throw new Error('Wykonanie wskazuje inny korpus niż jawne przypisanie sztuki.');
  }

  let book = createCartBook(project, (project.assemblyTransport?.carts ?? [])
    .map(({afterUnload: _policy, source: _source, ...cart}) => cart));
  for (const cart of book.carts) carts.push({id: cart.equipmentId, samples: [{atSeconds: 0, state: cart}]});
  const tracks = new Map(carts.map(track => [track.id, track]));
  const events: {at: number; index: number; finish: boolean; equipmentId: string;
    movement: NonNullable<WorkerScheduleResult['transportMovements']>[number]}[] = [];
  for (const [index, movement] of (result.transportMovements ?? []).entries()) {
    if (!Number.isFinite(movement.startSeconds) || movement.startSeconds < 0 ||
        !Number.isFinite(movement.endSeconds) || movement.endSeconds <= movement.startSeconds ||
        !['empty', 'loaded'].includes(movement.kind) ||
        (movement.kind === 'loaded' ? movement.purpose !== 'transfer' : !['approach', 'return'].includes(movement.purpose)) ||
        new Set(movement.equipmentIds).size !== movement.equipmentIds.length ||
        movement.equipmentIds.some(id => !project.equipment.some(item => item.id === id)) ||
        movement.workerIds.some(id => !project.workers.some(item => item.id === id)))
      throw new Error('Niepoprawny zapis ruchu transportowego.');
    const route = movement.kind === 'empty' ? project.assemblyTransport?.emptyRoutes.find(r => r.id === movement.routeId) :
      project.stationRouting?.routes.find(r => r.id === movement.routeId);
    if (!route) throw new Error('Historia transportu wskazuje nieznaną trasę.');
    for (const equipmentId of movement.equipmentIds.filter(id => tracks.has(id))) {
      if (movement.kind === 'empty' && (!('equipmentId' in route) || route.equipmentId !== equipmentId))
        throw new Error('Dojazd wskazuje inny wózek niż zadeklarowana trasa.');
      events.push({at: movement.startSeconds, index, finish: false, equipmentId, movement},
        {at: movement.endSeconds, index, finish: true, equipmentId, movement});
    }
    endSeconds = Math.max(endSeconds, movement.endSeconds);
  }
  // Arrivals precede departures at the same time. Never derive parallel empty approaches.
  events.sort((a, b) => a.at - b.at || Number(b.finish) - Number(a.finish) || a.index - b.index);
  for (const event of events) {
    const {movement, equipmentId} = event;
    if (event.finish) book = finishCartMovement(book, equipmentId, event.at);
    else {
      const route = movement.kind === 'empty' ? project.assemblyTransport!.emptyRoutes.find(r => r.id === movement.routeId)! :
        project.stationRouting!.routes.find(r => r.id === movement.routeId)!;
      book = startCartMovement(project, book, {...route, equipmentId}, movement.kind, event.at);
      if (book.carts.find(c => c.equipmentId === equipmentId)!.movement!.endSeconds !== movement.endSeconds)
        throw new Error('Czas ruchu wózka nie odpowiada zapisanej trasie.');
    }
    tracks.get(equipmentId)!.samples.push({atSeconds: event.at,
      state: structuredClone(book.carts.find(c => c.equipmentId === equipmentId)!)});
  }
  if ((book.carts.length && !result.cartBook) ||
      (result.cartBook && canonical(book.carts) !== canonical(result.cartBook.carts)))
    throw new Error('Historia wózków nie odtwarza końcowego rejestru workera.');

  return {modelSignature: binding.modelSignature, resultSignature: binding.resultSignature, endSeconds,
    mode: initial || carts.length ? 'physical' as const : 'untracked' as const, bodies, carts};
}

export type DomainPhysicalPlayback = ReturnType<typeof prepareDomainPhysicalPlayback>;

/** Binary search supports arbitrary seeking, pause and rewind without mutating the prepared history. */
export function domainPhysicalPlaybackFrame(playback: DomainPhysicalPlayback, time: number) {
  const at = Math.max(0, Math.min(playback.endSeconds, Number.isFinite(time) ? time : 0));
  const sample = <T,>(track: Track<T>): T => {
    let low = 0, high = track.samples.length;
    while (low < high) {
      const mid = (low + high) >>> 1;
      if (track.samples[mid].atSeconds <= at) low = mid + 1; else high = mid;
    }
    return structuredClone(track.samples[Math.max(0, low - 1)].state);
  };
  return {timeSeconds: at, mode: playback.mode, bodies: playback.bodies.map(sample), carts: playback.carts.map(sample)};
}
