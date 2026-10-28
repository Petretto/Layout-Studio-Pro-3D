import {parseDomainProjectV6,type DomainProjectV6} from '../../src/core/domainProject';
import {prepareC2B3bUiProject} from './c2B3bUi';

/** Explicit synthetic held-body test. The supporting assembler is assigned to the loaded body leg. */
export function prepareC2B3dUiProject(input:DomainProjectV6):DomainProjectV6{
  const project=prepareC2B3bUiProject(input);
  project.name='C2-B3d — syntetyczne zatrzymanie obsady korpusu';
  project.stationBuffers!.buffers[0].blockingPolicy='bbas';
  const rule=project.assemblyTransport!.routes.find(rule=>rule.stationRouteId==='MU-R-M1-INT')!;
  rule.alternatives=rule.alternatives.map(alternative=>({...alternative,workerIds:['MU-W6']}));
  rule.source='Jawny syntetyczny przydział przewozu korpusów do montera wspierającego; powrót nadal MU-W3';
  return parseDomainProjectV6(JSON.stringify(project));
}
