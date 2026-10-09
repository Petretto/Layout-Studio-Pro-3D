import {parseDomainProjectV6, type DomainProjectV6} from './domainProject';
import type {AssemblyTransport} from './assemblyTransport';

export function editDomainAssemblyTransport(project: DomainProjectV6, value: AssemblyTransport | undefined): DomainProjectV6 {
  const current = parseDomainProjectV6(JSON.stringify(project));
  const {assemblyTransport: _previous, ...rest} = current;
  return parseDomainProjectV6(JSON.stringify(value === undefined ? rest : {...rest, assemblyTransport: value}));
}
