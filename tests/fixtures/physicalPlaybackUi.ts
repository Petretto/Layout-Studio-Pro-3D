import {DEFAULT_MOTOR_PROJECT} from '../../src/core/models/defaultProjects';
import {derive} from '../../src/core/project';
import {parseProject} from '../../src/core/validation';
import {previewDomainMigrationFromV4} from '../../src/core/domainMigrationPreview';
import {prepareDomainMigration} from '../../src/core/domainProject';
import {saveDomainDraft} from '../../src/core/domainDraftStorage';
import {makeProjectPackage} from '../../src/core/projectPackage';
import {saveDomainVariant} from '../../src/core/domainVariantComparison';

/** Explicit synthetic QA only; no measured process, dimensions, docking or route geometry. */
export function physicalPlaybackUiFixture(){
  const base=structuredClone(DEFAULT_MOTOR_PROJECT);
  base.id='QA-A2B2B';base.name='Odbiór ruchu A2b2b — dane syntetyczne';base.schemaVersion=4;
  base.processSteps=base.processSteps.slice(0,2).map((step,index)=>({...step,name:`Czynność ${index?'C':'A'} — test`,predecessorIds:index?[base.processSteps[0].id]:[]}));base.bom=[];
  const originalJson=JSON.stringify(derive(parseProject(JSON.stringify(base))).project);
  let id=0;const project=prepareDomainMigration(previewDomainMigrationFromV4(originalJson,()=>`ST-QA-${++id}`)).project;
  project.product={id:'PRODUCT',name:'Korpus testowy'};
  project.facility={widthMm:6000,lengthMm:4000,heightMm:3000,gridSizeMm:1000};project.obstacles=[];
  project.operations.forEach(o=>{o.physicalRole={kind:'body-work'};o.staffing={requiredWorkers:1,timeVariants:[{workerCount:1,timeProfile:{durationSeconds:10,durationBasis:'assumed',manualWork:[],machineRun:[],operatorPresence:[{startSeconds:0,endSeconds:10,basis:'assumed'}]}}]};});
  project.stations=[{id:'ST-A',name:'A — test',operationIds:[project.operations[0].id]},{id:'ST-C',name:'C — test',operationIds:[project.operations[1].id]}];
  project.stationSettings={'ST-A':{operators:1,parallelStations:1},'ST-C':{operators:1,parallelStations:1}};
  project.workers=[{id:'W-A',name:'A — test'},{id:'W-B',name:'B — test'}];
  project.workerRunSelection={teamWorkerIds:['W-A','W-B'],operations:project.operations.map(o=>({operationId:o.id,workerCount:1,eligibleWorkerIds:['W-A','W-B']}))};
  const calendar={shifts:[{startSeconds:0,endSeconds:100,basis:'assumed' as const}],breaks:[]};
  project.resourceCalendars={workers:{'W-A':structuredClone(calendar),'W-B':structuredClone(calendar)},stations:{'ST-A':structuredClone(calendar),'ST-C':structuredClone(calendar)}};
  project.layoutObjects=[{id:'TABLE-A',name:'Stół A — geometria testowa',type:'TableStatic',xMm:1000,yMm:1000,zMm:0,widthMm:1000,lengthMm:800,heightMm:800,rotationDeg:0,colorHex:'#334455',workstationId:'ST-A',isVisualAssumption:true},
    {id:'TABLE-C',name:'Stół C — geometria testowa',type:'TableStatic',xMm:4000,yMm:1000,zMm:0,widthMm:1000,lengthMm:800,heightMm:800,rotationDeg:0,colorHex:'#334455',workstationId:'ST-C',isVisualAssumption:true},
    {id:'CART-SHAPE',name:'Wózek — geometria testowa',type:'Cart',xMm:1000,yMm:2000,zMm:0,widthMm:600,lengthMm:800,heightMm:800,rotationDeg:0,colorHex:'#334455',isVisualAssumption:true}];
  project.equipment=[{id:'EQ-A',name:'Stół A — test',stationId:'ST-A',capableOperationIds:[project.operations[0].id],layoutObjectId:'TABLE-A'},
    {id:'CART',name:'Wózek — test',layoutObjectId:'CART-SHAPE'}];
  project.stationRouting={selectionRule:'earliest-start-then-shortest-route',equipmentPlacements:[{equipmentId:'EQ-A',stationId:'ST-A',copy:1}],operations:project.operations.map((o,index)=>({operationId:o.id,candidates:[{stationId:index?'ST-C':'ST-A',copy:1,requiredEquipmentIds:index?[]:['EQ-A']}]})),
    routes:[{id:'R-A',from:{stationId:'ST-A',copy:1},to:{stationId:'ST-C',copy:1},distanceMm:5000,basis:'confirmed',source:'Jawna testowa długość, bez geometrycznego przebiegu',transportTime:{durationSeconds:2,basis:'assumed',source:'Test — 2 s'}}]};
  project.assemblyTransport={scope:'assembly-only',carts:[{equipmentId:'CART',initialLocation:{stationId:'ST-A',copy:1},calendar:structuredClone(calendar),afterUnload:'return-to-initial',source:'Test powrotu'}],conveyors:[],
    emptyRoutes:[{id:'EMPTY-C-A',equipmentId:'CART',from:{stationId:'ST-C',copy:1},to:{stationId:'ST-A',copy:1},distanceMm:5000,basis:'confirmed',source:'Test — powrót bez geometrii drogi',transportTime:{durationSeconds:5,basis:'assumed',source:'Test — 5 s'},workerAssignment:{workerIds:['W-A'],source:'Jawna obsada testowa'}}],
    routes:[{stationRouteId:'R-A',source:'Test transportu',alternatives:[{workerIds:['W-A'],equipmentIds:['CART']}]}]};
  project.bodyRunInput={bodies:[{id:'BODY',productId:'PRODUCT',location:{kind:'station',stationId:'ST-A',copy:1}}],jobs:[{job:1,bodyId:'BODY'}]};
  return {project,originalJson};
}
export function physicalPlaybackUiPackage(){
  const fixture=physicalPlaybackUiFixture(),map=new Map<string,string>(),storage={getItem:(key:string)=>map.get(key)??null,setItem:(key:string,value:string)=>{map.set(key,value);}};
  saveDomainDraft(storage,fixture,null);
  const withoutGeometry=structuredClone(fixture.project);withoutGeometry.layoutObjects=withoutGeometry.layoutObjects.filter(o=>o.id!=='TABLE-C');
  let previous:string|null=null;
  for(const [index,project] of [fixture.project,withoutGeometry].entries()){
    const saved=saveDomainVariant(storage,{id:`QA-VARIANT-${index}`,project,originalJson:fixture.originalJson,name:index?'Test bez geometrii C':'Test bazowy',category:'changed-layout'},previous);
    previous=saved.raw;
  }
  return makeProjectPackage(storage,{dataOrigin:'synthetic',source4Json:fixture.originalJson});
}
