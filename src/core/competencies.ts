import type {DomainProjectV6} from './domainProject';

/** Explicit shared vocabulary; team coverage is collective, never inferred from pools. */
export interface CompetencyRequirements {
  competencies: {id: string; name: string}[];
  workers: {workerId: string; competencyIds: string[]}[];
  operations: {operationId: string; requiredCompetencyIds: string[]}[];
}

function object(value: unknown, keys: string[]): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value) ||
      Object.keys(value).some(key => !keys.includes(key))) throw new Error('Kompetencje: niepoprawne pola.');
  return value as Record<string, unknown>;
}
function list(value: unknown): unknown[] {
  if (!Array.isArray(value) || value.length > 5000) throw new Error('Kompetencje: wymagana lista (maks. 5000).');
  return value;
}
function idList(value: unknown, known: Set<string>): string[] {
  const ids = list(value);
  if (ids.some(id => typeof id !== 'string' || !known.has(id)) || new Set(ids).size !== ids.length) {
    throw new Error('Kompetencje: nieznana lub powtórzona referencja.');
  }
  return ids as string[];
}

export function validateCompetencyRequirements(project: Pick<DomainProjectV6, 'workers' | 'operations'>,
  value: unknown): CompetencyRequirements {
  const raw = object(value, ['competencies', 'workers', 'operations']);
  const known = new Set<string>();
  const competencies = list(raw.competencies).map(value => {
    const item = object(value, ['id', 'name']);
    if (typeof item.id !== 'string' || !item.id.trim() || item.id !== item.id.trim() || known.has(item.id) ||
        typeof item.name !== 'string' || !item.name.trim()) throw new Error('Kompetencje: wymagane unikalne ID i nazwa.');
    known.add(item.id);
    return {id: item.id, name: item.name};
  });
  const workerIds = new Set(project.workers.map(worker => worker.id)), seenWorkers = new Set<string>();
  const workers = list(raw.workers).map(value => {
    const item = object(value, ['workerId', 'competencyIds']);
    if (typeof item.workerId !== 'string' || !workerIds.has(item.workerId) || seenWorkers.has(item.workerId)) {
      throw new Error('Kompetencje: nieznany lub powtórzony pracownik.');
    }
    seenWorkers.add(item.workerId);
    return {workerId: item.workerId, competencyIds: idList(item.competencyIds, known)};
  });
  const operationIds = new Set(project.operations.map(operation => operation.id)), seenOperations = new Set<string>();
  const operations = list(raw.operations).map(value => {
    const item = object(value, ['operationId', 'requiredCompetencyIds']);
    if (typeof item.operationId !== 'string' || !operationIds.has(item.operationId) || seenOperations.has(item.operationId)) {
      throw new Error('Kompetencje: nieznana lub powtórzona operacja.');
    }
    seenOperations.add(item.operationId);
    return {operationId: item.operationId, requiredCompetencyIds: idList(item.requiredCompetencyIds, known)};
  });
  return {competencies, workers, operations};
}

/** Call with validated project data. Missing declarations grant no competency. */
export function teamCoversCompetencies(project: Pick<DomainProjectV6, 'competencyRequirements'>,
  operationId: string, workerIds: readonly string[]): boolean {
  const rules = project.competencyRequirements;
  const required = rules?.operations.find(item => item.operationId === operationId)?.requiredCompetencyIds ?? [];
  if (!required.length) return true;
  const available = new Set(rules!.workers.filter(item => workerIds.includes(item.workerId)).flatMap(item => item.competencyIds));
  return required.every(id => available.has(id));
}

/** Static feasibility concerns an exact team size, not the union of all eligible workers.
 * A search limit is reported separately from a proven infeasibility. */
export function assertCompetentTeamExists(project: Pick<DomainProjectV6, 'competencyRequirements'>,
  operationId: string, eligible: readonly string[], count: number): void {
  if (!project.competencyRequirements?.operations.find(item => item.operationId === operationId)?.requiredCompetencyIds.length) return;
  let combinations = 0;
  const choose = (team: string[], from: number): boolean => {
    if (team.length === count) {
      if (++combinations > 10000) throw new Error(`Operacja ${operationId}: limit 10000 kombinacji kompetencji; wykonalność nierozstrzygnięta.`);
      return teamCoversCompetencies(project, operationId, team);
    }
    for (let i = from; i <= eligible.length - (count - team.length); i++) {
      if (choose([...team, eligible[i]], i + 1)) return true;
    }
    return false;
  };
  if (!choose([], 0)) throw new Error(`Operacja ${operationId}: brak wykonalnej obsady ${count} osób pokrywającej wszystkie wymagane kompetencje.`);
}
