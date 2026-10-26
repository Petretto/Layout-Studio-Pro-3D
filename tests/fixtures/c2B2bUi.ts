import {parseDomainProjectV6, type DomainProjectV6} from '../../src/core/domainProject';

/** Explicit reduced synthetic test, not the distributed C2 demo or production data. */
export function prepareC2B2bUiProject(input:DomainProjectV6):DomainProjectV6 {
  const project=structuredClone(input),producer='MU-OP10-A',consumer='MU-OP20-M',selected=new Set([producer,consumer]);
  project.name='B2b — syntetyczne przekazanie jednej partii bez składowania';
  project.operations=project.operations.filter(operation=>selected.has(operation.id));
  project.operations.find(operation=>operation.id===consumer)!.predecessorIds=[producer];
  project.stations=project.stations.map(station=>({...station,operationIds:station.operationIds.filter(id=>selected.has(id))}));
  project.bom=project.bom.filter(item=>!item.associatedProcessStepId||selected.has(item.associatedProcessStepId));
  project.equipment=project.equipment.map(item=>{
    const {capableOperationIds,...rest}=item,ids=capableOperationIds?.filter(id=>selected.has(id));
    return {...rest,...(ids?.length?{capableOperationIds:ids}:{})};
  });
  project.subassemblies=project.subassemblies.filter(item=>item.id==='SUB-PWR');
  project.subassemblyFlow!.lots=project.subassemblyFlow!.lots.filter(lot=>lot.id==='LOT-PWR-1').map(lot=>({...lot,quantity:5,consumptionQuantity:5,source:'Jawne ilości syntetycznej próby B2b 5/5'}));
  project.stationRouting!.operations=project.stationRouting!.operations.filter(operation=>selected.has(operation.operationId));
  project.workerRunSelection!.operations=project.workerRunSelection!.operations.filter(operation=>selected.has(operation.operationId)).map(operation=>({...operation,workerCount:1,eligibleWorkerIds:['MU-W1']}));
  project.workerRunSelection!.teamWorkerIds=['MU-W1'];
  project.competencyRequirements!.operations=project.competencyRequirements!.operations.filter(operation=>selected.has(operation.operationId));
  project.competencyRequirements!.workers.find(worker=>worker.workerId==='MU-W1')!.competencyIds.push('MU-C-INT'); // Explicit synthetic dual qualification.
  project.bodyRunInput!.bodies=project.bodyRunInput!.bodies.slice(0,1).map(body=>({...body,location:{kind:'station',stationId:'ST-MU-MAIN2',copy:1}}));
  project.bodyRunInput!.jobs=project.bodyRunInput!.jobs.slice(0,1);
  project.resourceCalendars!.stations['ST-MU-MAIN2'].shifts[0].startSeconds=100;
  project.subassemblyBuffers={buffers:[
    {subassemblyId:'SUB-PWR',unit:'szt.',stationId:'ST-MU-PWR',copy:null,inputCapacity:null,outputCapacity:0,blockingPolicy:'bbas'},
    {subassemblyId:'SUB-PWR',unit:'szt.',stationId:'ST-MU-MAIN2',copy:null,inputCapacity:0,outputCapacity:null,blockingPolicy:'bbas-worker-released'}
  ]};
  delete project.physicalConcurrency;
  delete project.materialSupply; // Supply is outside this explicitly reduced test.
  return parseDomainProjectV6(JSON.stringify(project));
}
