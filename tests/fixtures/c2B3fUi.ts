import {parseDomainProjectV6,type DomainProjectV6} from '../../src/core/domainProject';
import {prepareC2B3dUiProject} from './c2B3dUi';

/** Explicit synthetic C2-B3f fixture: direct subassembly input (0) + companion positive buffer with residual stock + finite/zero body buffers with held-worker recipient output. */
export function prepareC2B3fUiProject(input:DomainProjectV6):DomainProjectV6{
  const project=prepareC2B3dUiProject(input);
  project.name='C2-B3f — bezpośrednie wejście podmontażu z buforami korpusów';
  project.stationBuffers={buffers:[
    {stationId:'ST-MU-MAIN1',copy:1,inputCapacity:1,outputCapacity:1,blockingPolicy:'bbas'},
    {stationId:'ST-MU-MAIN2',copy:1,inputCapacity:1,outputCapacity:0,blockingPolicy:'bbas'},
    {stationId:'ST-MU-MAIN3',copy:1,inputCapacity:0,outputCapacity:null,blockingPolicy:'bbas-worker-released'}
  ]};
  project.subassemblyBuffers={buffers:project.subassemblies.flatMap(definition=>{
    const producerStationId=project.stations.find(station=>station.operationIds.includes(definition.producerOperationId!))!.id;
    const isDirect=definition.id==='SUB-PWR';
    return [
      {subassemblyId:definition.id,unit:'szt.',stationId:producerStationId,copy:1,inputCapacity:null,outputCapacity:isDirect?10:5,blockingPolicy:(isDirect?'bbas':'bbas-worker-released') as 'bbas'|'bbas-worker-released'},
      {subassemblyId:definition.id,unit:'szt.',stationId:'ST-MU-MAIN2',copy:1,inputCapacity:isDirect?0:20,outputCapacity:null,blockingPolicy:'bbas-worker-released' as const}
    ];
  })};
  for(const lot of project.subassemblyFlow!.lots){
    if(lot.subassemblyId==='SUB-PWR'){
      lot.quantity=5;lot.consumptionQuantity=5;lot.source='Jawna syntetyczna próba B3f 5/5 na wejście 0';
    }else{
      lot.quantity=5;lot.consumptionQuantity=3;lot.source='Jawna syntetyczna próba B3f 5/3 w buforze dodatnim';
    }
  }
  const ret=project.assemblyTransport!.emptyRoutes.find(route=>route.id==='MU-RETURN-M1-INT')!;
  ret.workerAssignment={workerIds:['MU-W6'],source:'Jawny syntetyczny powrót wózka korpusu przez montera wspierającego MU-W6'};
  const pwrRoute=project.stationRouting!.routes.find(route=>route.from.stationId==='ST-MU-PWR'&&route.to.stationId==='ST-MU-MAIN2')!;
  const pwrRule=project.assemblyTransport!.routes.find(rule=>rule.stationRouteId===pwrRoute.id)!;
  pwrRule.alternatives=pwrRule.alternatives.map(alternative=>({...alternative,workerIds:['MU-W6']}));
  pwrRule.source='Jawny syntetyczny przewóz bezpośredniego podmontażu SUB-PWR przez montera wspierającego MU-W6';
  for(const emptyRoute of project.assemblyTransport!.emptyRoutes){
    if(emptyRoute.to.stationId==='ST-MU-PWR'||emptyRoute.to.stationId==='ST-MU-MAIN2'){
      emptyRoute.workerAssignment={workerIds:['MU-W6'],source:'Jawny syntetyczny powrót wózka przez montera wspierającego MU-W6'};
    }
  }
  return parseDomainProjectV6(JSON.stringify(project));
}
