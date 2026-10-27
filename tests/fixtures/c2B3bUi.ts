import {parseDomainProjectV6,type DomainProjectV6} from '../../src/core/domainProject';

/** Explicit synthetic congestion test; distributed examples and their originals stay untouched. */
export function prepareC2B3bUiProject(input:DomainProjectV6):DomainProjectV6{
  const project=structuredClone(input);
  project.name='C2-B3b — syntetyczne spiętrzenie korpusów i osobnych podmontaży';
  project.stationBuffers={buffers:[
    {stationId:'ST-MU-MAIN1',copy:1,inputCapacity:1,outputCapacity:1,blockingPolicy:'bbas-worker-released'},
    {stationId:'ST-MU-MAIN2',copy:1,inputCapacity:1,outputCapacity:1,blockingPolicy:'bbas-worker-released'},
    {stationId:'ST-MU-MAIN3',copy:1,inputCapacity:1,outputCapacity:null,blockingPolicy:'bbas-worker-released'}
  ]};
  project.subassemblyBuffers={buffers:project.subassemblies.flatMap(definition=>[
    {subassemblyId:definition.id,unit:'szt.',stationId:project.stations.find(station=>station.operationIds.includes(definition.producerOperationId!))!.id,copy:1,inputCapacity:null,outputCapacity:5,blockingPolicy:'bbas-worker-released' as const},
    {subassemblyId:definition.id,unit:'szt.',stationId:'ST-MU-MAIN2',copy:1,inputCapacity:20,outputCapacity:null,blockingPolicy:'bbas-worker-released' as const}
  ])};
  for(const lot of project.subassemblyFlow!.lots){lot.quantity=5;lot.consumptionQuantity=3;lot.source='Jawna syntetyczna próba B3b 5/3';}
  project.resourceCalendars!.stations['ST-MU-MAIN2'].shifts[0].startSeconds=500;
  return parseDomainProjectV6(JSON.stringify(project));
}
