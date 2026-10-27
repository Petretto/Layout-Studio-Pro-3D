import {parseDomainProjectV6, type DomainProjectV6} from '../../src/core/domainProject';
import {prepareC2B2bUiProject} from './c2B2bUi';

/** Reduced synthetic mixed receipt, with two explicit producers and a body already in the receiving copy. */
export function prepareC2B3aUiProject(input:DomainProjectV6):DomainProjectV6 {
  const project=prepareC2B2bUiProject(input),producer='MU-OP10-B',consumer='MU-OP20-M';
  project.name='B3a — syntetyczny wspólny odbiór partii bezpośredniej i buforowanej';
  project.operations.splice(1,0,structuredClone(input.operations.find(operation=>operation.id===producer)!));
  project.operations.find(operation=>operation.id===consumer)!.predecessorIds=['MU-OP10-A',producer];
  project.stations.find(station=>station.id==='ST-MU-DRV')!.operationIds=[producer];
  project.subassemblies.push(structuredClone(input.subassemblies.find(item=>item.id==='SUB-DRV')!));
  project.subassemblyFlow!.lots.push({...structuredClone(input.subassemblyFlow!.lots.find(lot=>lot.id==='LOT-DRV-1')!),quantity:5,consumptionQuantity:3,source:'Jawna syntetyczna partia B3a 5/3; reszta 2'});
  project.stationRouting!.operations.push(structuredClone(input.stationRouting!.operations.find(operation=>operation.operationId===producer)!));
  for(const equipment of project.equipment)if(input.equipment.find(item=>item.id===equipment.id)?.capableOperationIds?.includes(producer)){
    equipment.capableOperationIds=[...equipment.capableOperationIds??[],producer];
  }
  project.workerRunSelection!.teamWorkerIds.push('MU-W2');
  project.workerRunSelection!.operations.push({operationId:producer,workerCount:1,eligibleWorkerIds:['MU-W2']});
  project.competencyRequirements!.operations.push(structuredClone(input.competencyRequirements!.operations.find(operation=>operation.operationId===producer)!));
  project.physicalConcurrency={groups:[{id:'B3A-PREPARATIONS',operationIds:['MU-OP10-A',producer]}]};
  project.subassemblyBuffers!.buffers.push(
    {subassemblyId:'SUB-DRV',unit:'szt.',stationId:'ST-MU-DRV',copy:null,inputCapacity:null,outputCapacity:5,blockingPolicy:'bbas'},
    {subassemblyId:'SUB-DRV',unit:'szt.',stationId:'ST-MU-MAIN2',copy:null,inputCapacity:5,outputCapacity:null,blockingPolicy:'bbas-worker-released'});
  return parseDomainProjectV6(JSON.stringify(project));
}
