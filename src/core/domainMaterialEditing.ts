import {parseDomainProjectV6,type DomainProjectV6} from './domainProject';
import type {MaterialNetworkV6} from './materialNetwork';

/** Whole-network editing prevents deleting referenced points independently of their connections. */
export function editDomainMaterialNetwork(project:DomainProjectV6,network:MaterialNetworkV6|undefined):DomainProjectV6{
  const current=parseDomainProjectV6(JSON.stringify(project));
  const {materialNetwork:_previous,...rest}=current;
  return parseDomainProjectV6(JSON.stringify(network===undefined?rest:{...rest,materialNetwork:network}));
}
