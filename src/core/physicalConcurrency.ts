import type {DomainProjectV6} from './domainProject';

export interface PhysicalConcurrencyGroup {id: string; operationIds: string[]}
/** Entire simultaneous set must fit one explicit group. Groups never merge transitively. */
export interface PhysicalConcurrency {groups: PhysicalConcurrencyGroup[]}

export function validatePhysicalConcurrency(project: DomainProjectV6, value: unknown): PhysicalConcurrency {
  const object = (value: unknown, keys: string[]) => {
    if (!value || typeof value !== 'object' || Array.isArray(value) || Object.keys(value).some(key => !keys.includes(key))) {
      throw new Error('Równoległość: niepoprawne pola reguły.');
    }
    return value as Record<string, unknown>;
  };
  const raw = object(value, ['groups']);
  if (!Array.isArray(raw.groups) || raw.groups.length > 500) throw new Error('Równoległość: wymagana lista grup (maksymalnie 500).');
  if (project.operations.some(operation => operation.physicalRole === undefined)) {
    throw new Error('Równoległość: wymagane jawne role wszystkich operacji.');
  }
  const operations = new Set(project.operations.map(operation => operation.id));
  const ids = new Set<string>(), sets = new Set<string>();
  const groups = raw.groups.map(value => {
    const group = object(value, ['id', 'operationIds']);
    if (typeof group.id !== 'string' || !group.id.trim() || ids.has(group.id)) throw new Error('Równoległość: puste lub powtórzone ID grupy.');
    if (!Array.isArray(group.operationIds) || group.operationIds.length < 2 || group.operationIds.length > 500 ||
        group.operationIds.some(id => typeof id !== 'string' || !operations.has(id)) ||
        new Set(group.operationIds).size !== group.operationIds.length) {
      throw new Error(`Równoległość ${group.id}: wymagane co najmniej dwie unikalne, znane operacje.`);
    }
    const operationIds = [...group.operationIds] as string[];
    const key = JSON.stringify([...operationIds].sort());
    if (sets.has(key)) throw new Error('Równoległość: powtórzony zestaw operacji grupy.');
    ids.add(group.id); sets.add(key);
    return {id: group.id, operationIds};
  });
  return {groups};
}

/** Permission only; caller must separately enforce precedence, location and exclusive resources. */
export function matchingConcurrencyGroup(policy: PhysicalConcurrency | undefined,
  operationIds: readonly string[]): string | undefined {
  if (operationIds.length < 2 || new Set(operationIds).size !== operationIds.length) return undefined;
  return policy?.groups.find(group => operationIds.every(id => group.operationIds.includes(id)))?.id;
}
