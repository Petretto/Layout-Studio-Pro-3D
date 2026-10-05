import type {DomainProjectV6} from './domainProject';

export interface WorkerOperationSelection {
  operationId: string;
  workerCount: number;
  eligibleWorkerIds: readonly string[];
}

/** Choices made before one run. Eligibility is not an assignment of particular people. */
export interface WorkerRunSelection {
  teamWorkerIds: string[];
  operations: WorkerOperationSelection[];
}

const record = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === 'object' && !Array.isArray(value);

export function validateWorkerRunSelection(
  project: Pick<DomainProjectV6, 'workers' | 'operations'>, value: unknown,
): WorkerRunSelection {
  if (!record(value) || Object.keys(value).some(key => !['teamWorkerIds', 'operations'].includes(key))) {
    throw new Error('Plan przebiegu wymaga składu i wyborów operacji.');
  }
  const knownWorkers = new Set(project.workers.map(worker => worker.id));
  const teamWorkerIds = value.teamWorkerIds;
  if (!Array.isArray(teamWorkerIds) || !teamWorkerIds.length ||
      teamWorkerIds.some(id => typeof id !== 'string' || !knownWorkers.has(id)) ||
      new Set(teamWorkerIds).size !== teamWorkerIds.length) {
    throw new Error('Skład przebiegu wymaga jawnych, unikalnych ID istniejących pracowników.');
  }
  const choices = value.operations;
  if (!Array.isArray(choices) || choices.length !== project.operations.length) {
    throw new Error('Każda operacja wymaga jawnego wyboru obsady i wariantu czasu.');
  }
  const team = new Set<string>(teamWorkerIds);
  const knownOperations = new Map(project.operations.map(operation => [operation.id, operation]));
  const seen = new Set<string>();
  const operations: WorkerOperationSelection[] = [];
  for (const choice of choices) {
    if (!record(choice) || Object.keys(choice).some(key =>
      !['operationId', 'workerCount', 'eligibleWorkerIds'].includes(key)) ||
        typeof choice.operationId !== 'string' || !knownOperations.has(choice.operationId) ||
        seen.has(choice.operationId)) {
      throw new Error('Wybór obsady zawiera obcą lub powtórzoną operację.');
    }
    seen.add(choice.operationId);
    const operation = knownOperations.get(choice.operationId)!;
    const variant = operation.staffing?.timeVariants.find(item => item.workerCount === choice.workerCount);
    if (!variant) throw new Error(`Operacja ${operation.id}: brak jawnego wariantu czasu dla wybranej obsady.`);
    const eligible = choice.eligibleWorkerIds;
    if (!Array.isArray(eligible) || eligible.length < variant.workerCount ||
        eligible.some(id => typeof id !== 'string' || !team.has(id)) ||
        new Set(eligible).size !== eligible.length) {
      throw new Error(`Operacja ${operation.id}: dopuszczeni pracownicy muszą pochodzić z ustalonego składu i wystarczyć na wybrany wariant.`);
    }
    if (!variant.timeProfile.operatorPresence.length) {
      throw new Error(`Operacja ${operation.id}: brak jawnego okresu obecności operatorów.`);
    }
    operations.push({operationId: operation.id, workerCount: variant.workerCount,
      eligibleWorkerIds: [...eligible]});
  }
  return {teamWorkerIds: [...teamWorkerIds], operations};
}
