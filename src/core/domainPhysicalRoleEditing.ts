import {parseDomainProjectV6, type DomainPhysicalRole, type DomainProjectV6} from './domainProject';

/** Explicit draft roles only. Existing definitions remain the source of producer/consumer links. */
export function editDomainPhysicalRole(project: DomainProjectV6, operationId: string,
  role: DomainPhysicalRole | null): DomainProjectV6 {
  const current = parseDomainProjectV6(JSON.stringify(project));
  if (!current.operations.some(operation => operation.id === operationId)) throw new Error('Rola fizyczna: nieznana operacja.');
  const next = {...current, operations: current.operations.map(operation => {
    if (operation.id !== operationId) return operation;
    const {physicalRole: _previous, ...rest} = operation;
    return role === null ? rest : {...rest, physicalRole: role};
  })};
  return parseDomainProjectV6(JSON.stringify(next));
}
