import {parseDomainProjectV6, type DomainProjectV6, type DomainTimeProfile} from './domainProject';

export type DomainTimeChange =
  | {kind: 'set-time-profile'; operationId: string; profile: DomainTimeProfile}
  | {kind: 'clear-time-profile'; operationId: string};

/** Change only one draft operation. Validation remains authoritative in the v6 parser. */
export function editDomainTime(project: DomainProjectV6, change: DomainTimeChange): DomainProjectV6 {
  const current = parseDomainProjectV6(JSON.stringify(project));
  if (!current.operations.some(operation => operation.id === change.operationId)) {
    throw new Error(`Operacja ${change.operationId} nie istnieje w szkicu.`);
  }
  const operations = current.operations.map(operation => {
    if (operation.id !== change.operationId) return operation;
    const {timeProfile: _previous, ...withoutProfile} = operation;
    return change.kind === 'set-time-profile'
      ? {...withoutProfile, timeProfile: structuredClone(change.profile)}
      : withoutProfile;
  });
  return parseDomainProjectV6(JSON.stringify({...current, operations}));
}
