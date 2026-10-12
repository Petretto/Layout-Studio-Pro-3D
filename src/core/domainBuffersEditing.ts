import {parseDomainProjectV6, type DomainProjectV6} from './domainProject';
import type {StationBuffersV6} from './stationBuffers';
import type {MaterialSupplyV6} from './materialSupply';

export function editDomainStationBuffers(project: DomainProjectV6, value: StationBuffersV6 | undefined): DomainProjectV6 {
  const current = parseDomainProjectV6(JSON.stringify(project));
  const {stationBuffers: _previous, ...rest} = current;
  return parseDomainProjectV6(JSON.stringify(value === undefined ? rest : {...rest, stationBuffers: value}));
}

export function editDomainMaterialSupply(project: DomainProjectV6, value: MaterialSupplyV6 | undefined): DomainProjectV6 {
  const current = parseDomainProjectV6(JSON.stringify(project));
  const {materialSupply: _previous, ...rest} = current;
  return parseDomainProjectV6(JSON.stringify(value === undefined ? rest : {...rest, materialSupply: value}));
}
