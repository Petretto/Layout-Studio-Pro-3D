import {prepareDomainMigration, parseDomainProjectV6} from '../../src/core/domainProject';
import {previewDomainMigrationFromV5} from '../../src/core/domainMigrationPreview';

export type EkoTestVariant = 'parallel' | 'sequential' | 'shared-worker';
export const EKO_TEST_PREPARATIONS = ['OP10','OP13','OP14','OP15','OP16','OP17','OP18'];

/** Approved 1A/2A test overlay. Never used as production data or an automatic migration default. */
export function createEkoTestScenario(originalJson: string, variant: EkoTestVariant) {
  const prepared = prepareDomainMigration(previewDomainMigrationFromV5(originalJson));
  const project = prepared.project;
  const assembly = project.stations.find(station => station.operationIds.includes('OP22'));
  if (!assembly || project.operations.length !== 16 || EKO_TEST_PREPARATIONS.some(id => !project.operations.some(operation => operation.id === id))) {
    throw new Error('Scenariusz testowy 2.9 wymaga uzgodnionego źródła Eko.');
  }
  project.name = `Eko — TYLKO TEST 2.9: ${variant}; obsada i role założone`;
  project.layoutObjects = []; // Geometry is outside this hand-checkable test; original stays exact.
  project.product = {id:'EKO-TEST-PRODUCT',name:'Wyrób testowy Eko — dane produkcyjne niepotwierdzone'};
  project.workers = project.operations.map(operation => ({id:`TEST-W-${operation.id}`,name:`Testowa osoba ${operation.id}`}));
  project.subassemblies = EKO_TEST_PREPARATIONS.map(id => ({id:`TEST-PART-${id}`,name:`Testowy podzespół ${id}`,
    producerOperationId:id,consumerOperationIds:project.operations.filter(operation => operation.predecessorIds.includes(id)).map(operation => operation.id)}));
  project.operations.forEach(operation => {
    operation.physicalRole = EKO_TEST_PREPARATIONS.includes(operation.id) ?
      {kind:'subassembly-preparation',subassemblyIds:[`TEST-PART-${operation.id}`]} : {kind:'body-work'};
    operation.staffing = {requiredWorkers:1,timeVariants:[{workerCount:1,timeProfile:{
      durationSeconds:operation.standardTimeSeconds,durationBasis:'assumed',manualWork:[],machineRun:[],
      operatorPresence:[{startSeconds:0,endSeconds:operation.standardTimeSeconds,basis:'assumed'}]}}]};
  });
  project.stationSettings = Object.fromEntries(project.stations.map(station => [station.id,{operators:1,parallelStations:1}]));
  project.workerRunSelection = {teamWorkerIds:project.workers.map(worker => worker.id),operations:project.operations.map(operation =>
    ({operationId:operation.id,workerCount:1,eligibleWorkerIds:[`TEST-W-${variant==='shared-worker' && operation.id==='OP23'?'OP22':operation.id}`]}))};
  project.physicalConcurrency = {groups:[{id:'TEST-PREPARATIONS',operationIds:[...EKO_TEST_PREPARATIONS]},
    ...(variant==='sequential'?[]:[{id:'TEST-DOORS',operationIds:['OP22','OP23']}])]};
  project.stationRouting = {selectionRule:'earliest-start-then-shortest-route',equipmentPlacements:[],routes:[],
    operations:project.operations.map(operation => ({operationId:operation.id,candidates:[{
      stationId:operation.physicalRole!.kind==='body-work'?assembly.id:project.stations.find(station=>station.operationIds.includes(operation.id))!.id,
      copy:1,requiredEquipmentIds:[]}]}))};
  project.bodyRunInput = {bodies:[{id:'TEST-EKO-FRAME-1',productId:project.product.id,
    location:{kind:'station',stationId:assembly.id,copy:1}}],jobs:[{job:1,bodyId:'TEST-EKO-FRAME-1'}]};
  return {...prepared,project:parseDomainProjectV6(JSON.stringify(project))};
}
