import {parseDomainProjectV6,type DomainProjectV6} from '../../src/core/domainProject';
import {prepareC2B3dUiProject} from './c2B3dUi';

/** Explicit synthetic zero-capacity body spine test with subassembly branches. */
export function prepareC2B3eUiProject(input:DomainProjectV6):DomainProjectV6{
  const project=prepareC2B3dUiProject(input);
  project.name='C2-B3e — syntetyczne zerowe bufory korpusów z gałęziami';
  project.stationBuffers={buffers:[
    {stationId:'ST-MU-MAIN1',copy:1,inputCapacity:0,outputCapacity:0,blockingPolicy:'bbas'},
    {stationId:'ST-MU-MAIN2',copy:1,inputCapacity:0,outputCapacity:0,blockingPolicy:'bbas-worker-released'},
    {stationId:'ST-MU-MAIN3',copy:1,inputCapacity:0,outputCapacity:null,blockingPolicy:'bbas-worker-released'}
  ]};
  const ret=project.assemblyTransport!.emptyRoutes.find(route=>route.id==='MU-RETURN-M1-INT')!;
  ret.workerAssignment={workerIds:['MU-W6'],source:'Jawny syntetyczny powrót wózka korpusu przez montera wspierającego MU-W6'};
  return parseDomainProjectV6(JSON.stringify(project));
}
