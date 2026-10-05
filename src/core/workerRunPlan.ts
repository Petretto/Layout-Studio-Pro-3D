import {parseDomainProjectV6, type DomainProjectV6} from './domainProject';
import {validateWorkerRunSelection, type WorkerOperationSelection} from './workerRunSelection';

export type {WorkerOperationSelection} from './workerRunSelection';

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
  const selection = validateWorkerRunSelection(checked, {teamWorkerIds, operations: selections});
  const byOperation = new Map(selection.operations.map(item => [item.operationId, item]));
  const operations = checked.operations.map(operation => {
    const choice = byOperation.get(operation.id)!;
    const variant = operation.staffing!.timeVariants.find(item => item.workerCount === choice.workerCount)!;
    const presence = variant.timeProfile.operatorPresence;
    return Object.freeze({operationId: operation.id, workerCount: choice.workerCount,
      eligibleWorkerIds: Object.freeze([...choice.eligibleWorkerIds]),
      durationSeconds: variant.timeProfile.durationSeconds,
      reserveFromSeconds: presence[0].startSeconds,
      reserveUntilSeconds: presence[presence.length - 1].endSeconds});
  });
  return Object.freeze({teamWorkerIds: Object.freeze([...selection.teamWorkerIds]),
    operations: Object.freeze(operations)});
}
