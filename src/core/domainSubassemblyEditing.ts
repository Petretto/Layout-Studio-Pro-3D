import {parseDomainProjectV6, type DomainProjectV6} from './domainProject';
import type {SubassemblyFlow} from './subassemblyFlow';

export function editDomainSubassemblyFlow(project: DomainProjectV6, value: SubassemblyFlow | undefined): DomainProjectV6 {
  const current = parseDomainProjectV6(JSON.stringify(project));
  const {subassemblyFlow: _previous, ...rest} = current;
  return parseDomainProjectV6(JSON.stringify(value === undefined ? rest : {...rest, subassemblyFlow: value}));
}
