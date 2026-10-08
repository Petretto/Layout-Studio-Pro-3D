import type {DomainProjectV6} from './domainProject';
import {createValidatedBodyBook, type BodyDeclaration} from './bodyState';

/** Explicit run configuration; persisted declarations are never replaced by execution state. */
export interface BodyRunInput {
  bodies: BodyDeclaration[];
  jobs: {job: number; bodyId: string}[];
}

export function validateBodyRunInput(project: DomainProjectV6, value: unknown): BodyRunInput {
  const object = (value: unknown, keys: string[]) => {
    if (!value || typeof value !== 'object' || Array.isArray(value) || Object.keys(value).some(key => !keys.includes(key))) {
      throw new Error('Wejście korpusów: niepoprawne pola.');
    }
    return value as Record<string, unknown>;
  };
  const raw = object(value, ['bodies', 'jobs']);
  if (!Array.isArray(raw.bodies) || !Array.isArray(raw.jobs) || !raw.jobs.length || raw.jobs.length > 5000 || raw.bodies.length > 5000) {
    throw new Error('Wejście korpusów: wymagane listy instancji i sztuk.');
  }
  for (const declaration of raw.bodies) {
    const body = object(declaration, ['id', 'productId', 'location']);
    const location = object(body.location, ['kind', 'stationId', 'copy']);
    if (location.kind !== 'station') throw new Error('Korpus: brak jawnej lokalizacji początkowej.');
  }
  raw.jobs.forEach(job => object(job, ['job', 'bodyId']));
  const input = JSON.parse(JSON.stringify(raw)) as BodyRunInput;
  prepareBodyRun(project, input.jobs.length, input);
  return input;
}

export function prepareBodyRun(project: DomainProjectV6, batch: number, input?: BodyRunInput) {
  const physical = project.operations.some(operation => operation.physicalRole !== undefined);
  if (!physical) {
    if (input !== undefined) throw new Error('Instancje korpusu wymagają jawnych ról wszystkich operacji.');
    return null;
  }
  if (project.operations.some(operation => operation.physicalRole === undefined)) {
    throw new Error('2.7.3: przebieg fizyczny wymaga jawnych ról wszystkich operacji.');
  }
  const needsBody = project.operations.some(operation => operation.physicalRole?.kind === 'body-work');
  if (!needsBody) {
    if (input !== undefined) throw new Error('Przebieg przygotowania podzespołów nie wymaga przypisania korpusu.');
    return null;
  }
  if (!input) throw new Error('2.7.3: brak jawnych instancji i przypisania korpusu do każdej sztuki przebiegu.');
  if (!Array.isArray(input.bodies) || !Array.isArray(input.jobs) || input.jobs.length !== batch) {
    throw new Error('Korpus: wymagana lista instancji i przypisanie każdej sztuki.');
  }
  const book = createValidatedBodyBook(project, input.bodies, 0);
  const bodyByJob = new Map<number, string>();
  const used = new Set<string>();
  for (const item of input.jobs) {
    if (!item || !Number.isSafeInteger(item.job) || item.job < 1 || item.job > batch || bodyByJob.has(item.job)) {
      throw new Error('Korpus: nieznana lub powtórzona sztuka przebiegu.');
    }
    const body = book.bodies.find(body => body.id === item.bodyId);
    if (!body || used.has(item.bodyId)) throw new Error('Korpus: nieznana lub powtórnie przypisana instancja.');
    if (body.location.kind !== 'station') throw new Error('Korpus: brak jawnej lokalizacji początkowej.');
    used.add(item.bodyId);
    bodyByJob.set(item.job, item.bodyId);
  }
  if (used.size !== book.bodies.length) throw new Error('Korpus: deklaracja zawiera instancje nieprzypisane do przebiegu.');
  return {book, bodyByJob};
}
