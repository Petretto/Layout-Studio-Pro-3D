import {parseDomainProjectV6,type DomainProjectV6} from '../../src/core/domainProject';
import {prepareC2B3bUiProject} from './c2B3bUi';

/** Explicit synthetic local continuation; no changes to the distributed C2 project. */
export function prepareC2B3cUiProject(input:DomainProjectV6):DomainProjectV6{
  const project=prepareC2B3bUiProject(input),first=project.operations.find(operation=>operation.id==='MU-OP10-M')!;
  const local={...structuredClone(first),id:'MU-LOCAL-B3C',name:'Jawna syntetyczna kontynuacja korpusu na S3',predecessorIds:[first.id]};
  project.name='C2-B3c — syntetyczna lokalna kontynuacja z gałęziami';
  project.operations.splice(project.operations.indexOf(first)+1,0,local);
  const integration=project.operations.find(operation=>operation.id==='MU-OP20-M')!;
  integration.predecessorIds=integration.predecessorIds.map(id=>id===first.id?local.id:id);
  project.stations.find(station=>station.id==='ST-MU-MAIN1')!.operationIds.push(local.id);
  const routing=structuredClone(project.stationRouting!.operations.find(operation=>operation.operationId===first.id)!);
  project.stationRouting!.operations.push({...routing,operationId:local.id});
  for(const equipment of project.equipment)if(equipment.capableOperationIds?.includes(first.id))equipment.capableOperationIds.push(local.id);
  const selection=structuredClone(project.workerRunSelection!.operations.find(operation=>operation.operationId===first.id)!);
  project.workerRunSelection!.operations.push({...selection,operationId:local.id});
  const competency=structuredClone(project.competencyRequirements!.operations.find(operation=>operation.operationId===first.id)!);
  project.competencyRequirements!.operations.push({...competency,operationId:local.id});
  project.bodyRunInput!.bodies=project.bodyRunInput!.bodies.slice(0,1);project.bodyRunInput!.jobs=project.bodyRunInput!.jobs.slice(0,1);
  project.subassemblyFlow!.lots=project.subassemblyFlow!.lots.filter(lot=>lot.consumer.job===1);
  project.materialSupply!.items.push({id:'B3C-LOCAL-SUPPLY',componentId:'B3C-LOCAL-PART',targetStationId:'ST-MU-MAIN1',initialStock:0,unit:'szt.',schedule:{kind:'explicit-deliveries',deliveries:[{deliveryTimeSeconds:100,quantity:1}]},source:'Jawna syntetyczna dostawa dla lokalnej kontynuacji, bez zmiany źródła C2'});
  project.materialSupply!.consumptions!.push({operationId:local.id,supplyId:'B3C-LOCAL-SUPPLY',quantity:1,source:'Jawne syntetyczne pobranie przy lokalnym starcie'});
  return parseDomainProjectV6(JSON.stringify(project));
}
