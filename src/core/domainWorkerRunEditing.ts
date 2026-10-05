import {parseDomainProjectV6, type DomainProjectV6} from './domainProject';
import type {WorkerRunSelection} from './workerRunSelection';

export type DomainWorkerRunChange =
  | {kind: 'set-worker-run-selection'; selection: WorkerRunSelection}
  | {kind: 'clear-worker-run-selection'};

/** Store complete run choices only after schema-6 identity and variant validation. */
export function editDomainWorkerRun(project: DomainProjectV6, change: DomainWorkerRunChange): DomainProjectV6 {
  const current = parseDomainProjectV6(JSON.stringify(project));
  if (change.kind === 'clear-worker-run-selection') {
    const {workerRunSelection: _old, ...next} = current;
    return parseDomainProjectV6(JSON.stringify(next));
  }
  return parseDomainProjectV6(JSON.stringify({...current, workerRunSelection: change.selection}));
}
