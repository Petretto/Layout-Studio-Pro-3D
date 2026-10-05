import {parseDomainProjectV6, type DomainProjectV6} from './domainProject';

export interface WorkerOperationSelection {
  operationId: string;
  workerCount: number;
  eligibleWorkerIds: readonly string[];
}

export interface PlannedWorkerOperation extends WorkerOperationSelection {
  durationSeconds: number;
  reserveFromSeconds: number;
  reserveUntilSeconds: number;
}

export interface WorkerRunPlan {
  teamWorkerIds: readonly string[];
  operations: readonly PlannedWorkerOperation[];
}

/** Build a fixed-roster run input. No identities, variants or eligibility are inferred. */
export function createWorkerRunPlan(project: DomainProjectV6, teamWorkerIds: readonly string[],
  selections: readonly WorkerOperationSelection[]): WorkerRunPlan {
  const checked = parseDomainProjectV6(JSON.stringify(project));
  const knownWorkers = new Set(checked.workers.map(worker => worker.id));
  if (!Array.isArray(teamWorkerIds) || !teamWorkerIds.length ||
      teamWorkerIds.some(id => typeof id !== 'string' || !knownWorkers.has(id)) ||
      new Set(teamWorkerIds).size !== teamWorkerIds.length) {
    throw new Error('Skład przebiegu wymaga jawnych, unikalnych ID istniejących pracowników.');
  }
  if (!Array.isArray(selections) || selections.length !== checked.operations.length) {
    throw new Error('Każda operacja wymaga jawnego wyboru obsady i wariantu czasu.');
  }
  const team = new Set(teamWorkerIds);
  const byOperation = new Map<string, WorkerOperationSelection>();
  for (const selection of selections) {
    if (!selection || typeof selection.operationId !== 'string' ||
        !checked.operations.some(operation => operation.id === selection.operationId) ||
        byOperation.has(selection.operationId)) {
      throw new Error('Wybór obsady zawiera obcą lub powtórzoną operację.');
    }
    byOperation.set(selection.operationId, selection);
  }
  const operations = checked.operations.map(operation => {
    const selection = byOperation.get(operation.id);
    if (!selection) throw new Error(`Operacja ${operation.id}: brak wyboru obsady.`);
    const variant = operation.staffing?.timeVariants.find(item => item.workerCount === selection.workerCount);
    if (!variant) throw new Error(`Operacja ${operation.id}: brak jawnego wariantu czasu dla wybranej obsady.`);
    if (!Array.isArray(selection.eligibleWorkerIds) ||
        selection.eligibleWorkerIds.length < selection.workerCount ||
        selection.eligibleWorkerIds.some(id => typeof id !== 'string' || !team.has(id)) ||
        new Set(selection.eligibleWorkerIds).size !== selection.eligibleWorkerIds.length) {
      throw new Error(`Operacja ${operation.id}: dopuszczeni pracownicy muszą pochodzić z ustalonego składu i wystarczyć na wybrany wariant.`);
    }
    const presence = variant.timeProfile.operatorPresence;
    if (!presence.length) throw new Error(`Operacja ${operation.id}: brak jawnego okresu obecności operatorów.`);
    return Object.freeze({operationId: operation.id, workerCount: selection.workerCount,
      eligibleWorkerIds: Object.freeze([...selection.eligibleWorkerIds]),
      durationSeconds: variant.timeProfile.durationSeconds,
      reserveFromSeconds: presence[0].startSeconds,
      reserveUntilSeconds: presence[presence.length - 1].endSeconds});
  });
  return Object.freeze({teamWorkerIds: Object.freeze([...teamWorkerIds]),
    operations: Object.freeze(operations)});
}
