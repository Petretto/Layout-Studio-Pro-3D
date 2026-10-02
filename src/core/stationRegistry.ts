/** Durable station identity, independent of display order and assigned operations.
 * Not yet wired into schema 4: migration and UI integration are a separate step.
 */
export interface StationRecord {
  id: string;
  name: string;
  operationIds: string[];
}

export interface StationPlan {
  /** Omit only when deliberately creating a new station. */
  id?: string;
  name: string;
  operationIds: string[];
}

export interface StationRevision {
  /** Array order defines presentation order, never identity. */
  stations: StationRecord[];
  createdIds: string[];
  retiredIds: string[];
}

const validId = (id: string) => typeof id === 'string' && id.trim().length > 0;

function validate(records: StationRecord[], knownOperations: Set<string>) {
  const ids = new Set<string>(), assigned = new Set<string>();
  for (const station of records) {
    if (!validId(station.id) || ids.has(station.id)) throw new Error('Niepoprawne lub powtórzone ID stanowiska.');
    ids.add(station.id);
    if (!station.name.trim()) throw new Error('Stanowisko wymaga nazwy.');
    for (const operation of station.operationIds) {
      if (!knownOperations.has(operation)) throw new Error(`Nieznana operacja: ${operation}.`);
      if (assigned.has(operation)) throw new Error(`Operacja ${operation} jest przypisana więcej niż raz.`);
      assigned.add(operation);
    }
  }
}

/** Apply an explicit identity decision. No guessing by ordinal or operation overlap.
 * Empty physical stations and temporarily unassigned operations are allowed.
 * Callers must handle retired station geometry/resources explicitly before saving.
 */
export function reviseStations(
  previous: readonly StationRecord[],
  plan: readonly StationPlan[],
  operationIds: readonly string[],
  allocateId: () => string = () => `ST-${crypto.randomUUID()}`,
): StationRevision {
  const known = new Set(operationIds);
  if (known.size !== operationIds.length || operationIds.some(id => !validId(id))) {
    throw new Error('Niepoprawne lub powtórzone ID operacji.');
  }
  // Historical assignments may reference operations removed in the new revision.
  const oldIds = new Set(previous.map(s => s.id));
  if (oldIds.size !== previous.length || previous.some(s => !validId(s.id))) {
    throw new Error('Niepoprawne ID w poprzednim rejestrze stanowisk.');
  }
  // Preflight all explicit references before requesting any new IDs.
  const explicit = new Set<string>();
  for (const item of plan) if (item.id !== undefined) {
    if (!oldIds.has(item.id)) throw new Error(`Nieznane stanowisko: ${item.id}.`);
    if (explicit.has(item.id)) throw new Error(`Stanowisko ${item.id} występuje więcej niż raz.`);
    explicit.add(item.id);
  }
  const allocated = new Set<string>();
  const stations = plan.map(item => {
    const id = item.id ?? allocateId();
    if (item.id === undefined) {
      if (!validId(id) || oldIds.has(id) || allocated.has(id)) throw new Error('Generator zwrócił zajęte lub puste ID stanowiska.');
      allocated.add(id);
    }
    return {id, name: item.name, operationIds: [...item.operationIds]};
  });
  validate(stations, known);
  return {stations, createdIds: [...allocated], retiredIds: [...oldIds].filter(id => !explicit.has(id))};
}
