import {parseDomainProjectV6, type DomainProjectV6, type DomainTimeProfile} from './domainProject';

export type DomainTimeChange =
  | {kind: 'set-time-profile'; operationId: string; profile: DomainTimeProfile}
  | {kind: 'clear-time-profile'; operationId: string}
  | {kind: 'set-required-workers'; operationId: string; requiredWorkers: number}
  | {kind: 'clear-staffing'; operationId: string}
  | {kind: 'set-staffing-variant'; operationId: string; workerCount: number; profile: DomainTimeProfile}
  | {kind: 'clear-staffing-variant'; operationId: string; workerCount: number};

/** Change only one draft operation. Validation remains authoritative in the v6 parser. */
export function editDomainTime(project: DomainProjectV6, change: DomainTimeChange): DomainProjectV6 {
  const current = parseDomainProjectV6(JSON.stringify(project));
  if (!current.operations.some(operation => operation.id === change.operationId)) {
    throw new Error(`Operacja ${change.operationId} nie istnieje w szkicu.`);
  }
  const operations = current.operations.map(operation => {
    if (operation.id !== change.operationId) return operation;
    if (change.kind === 'set-time-profile' || change.kind === 'clear-time-profile') {
      const {timeProfile: _previous, ...withoutProfile} = operation;
      return change.kind === 'set-time-profile'
        ? {...withoutProfile, timeProfile: structuredClone(change.profile)}
        : withoutProfile;
    }
    if (change.kind === 'clear-staffing') {
      const {staffing: _previous, ...withoutStaffing} = operation;
      return withoutStaffing;
    }
    if (change.kind === 'set-required-workers') {
      return {...operation, staffing: {requiredWorkers: change.requiredWorkers,
        timeVariants: operation.staffing?.timeVariants ?? []}};
    }
    if (!operation.staffing) throw new Error(`Operacja ${operation.id}: najpierw zapisz minimalną obsadę.`);
    if (change.kind === 'clear-staffing-variant') {
      return {...operation, staffing: {...operation.staffing,
        timeVariants: operation.staffing.timeVariants.filter(item => item.workerCount !== change.workerCount)}};
    }
    const variant = {workerCount: change.workerCount, timeProfile: structuredClone(change.profile)};
    const previous = operation.staffing.timeVariants;
    const timeVariants = previous.some(item => item.workerCount === change.workerCount)
      ? previous.map(item => item.workerCount === change.workerCount ? variant : item)
      : [...previous, variant];
    return {...operation, staffing: {...operation.staffing, timeVariants}};
  });
  return parseDomainProjectV6(JSON.stringify({...current, operations}));
}
