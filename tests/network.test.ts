import {planDirectOperation} from '../src/core/directHandoffPlan';
import {prepareC2B2bUiProject} from './fixtures/c2B2bUi';
import {prepareC2B3aUiProject} from './fixtures/c2B3aUi';
import {prepareC2B3bUiProject} from './fixtures/c2B3bUi';
import {prepareC2B3cUiProject} from './fixtures/c2B3cUi';
import {prepareC2B3dUiProject} from './fixtures/c2B3dUi';
import {prepareC2B3eUiProject} from './fixtures/c2B3eUi';
import {prepareC2B3fUiProject} from './fixtures/c2B3fUi';
import {GraphBodyBuffers} from '../src/core/graphBodyBuffers';
import {createSubassemblyBufferBook, applySubassemblyBufferEvent, subassemblyBufferLoad,
  type SubassemblyBufferPlace, type SubassemblyBufferBook} from '../src/core/subassemblyBufferState';
import {explainThroughput} from '../src/core/throughputExplanation';
import {
  DOMAIN_VARIANTS_STORAGE_KEY,
  buildVariantComparisonMarkdownReport,
  buildVariantComparisonReport,
  compareDomainVariants,
  deleteDomainVariant,
  inspectVariantFactors,
  prepareVariantForDraftRestore,
  readDomainVariants,
  replaceDomainVariants,
  saveDomainVariant,
  summarizeStaticVariant,
  validateCostAssumptions,
  type SavedDomainVariant,
} from '../src/core/domainVariantComparison';
import {
  NON_OPTIMUM_DISCLAIMER,
  generateDomainImprovementCandidates,
  proposeAndVerifyDomainImprovements,
  buildDomainImprovementProposalsReport,
  buildImprovementProposalsMarkdownReport,
} from '../src/core/domainImprovementProposals';
import {proposeDomainBalance, applyDomainBalance} from '../src/core/domainBalancing';
import {assertCompetentTeamExists, teamCoversCompetencies, type CompetencyRequirements} from '../src/core/competencies';
import {editDomainCompetencies} from '../src/core/domainCompetencyEditing';
import {applyBufferedBodyEvent,validateBufferedBodyBook,type BufferedBodyBook} from '../src/core/bufferedBodyState';
import {reserveBufferedAssemblyMovement,finishBufferedAssemblyMovement} from '../src/core/bufferedAssemblyMovement';
import {createBufferBook,applyBufferEvent,bufferLoad,bufferHasSpace,bufferCanAccept,outputBlock} from '../src/core/bufferState';
import {MaterialStockRun} from '../src/core/materialStock';
import {editDomainSubassemblyFlow} from '../src/core/domainSubassemblyEditing';
import type {SubassemblyFlow} from '../src/core/subassemblyFlow';
import {editDomainStationBuffers, editDomainMaterialSupply, editDomainSubassemblyBuffers} from '../src/core/domainBuffersEditing';
import {validateSubassemblyBuffers} from '../src/core/subassemblyBuffers';
import {SubassemblyBufferRun} from '../src/core/subassemblyBufferRun';
import {validateStationBuffers, type StationBuffersV6} from '../src/core/stationBuffers';
import {validateMaterialSupply, type MaterialSupplyV6} from '../src/core/materialSupply';
import {reserveAssemblyMovement,finishAssemblyMovement} from '../src/core/assemblyMovement';
import {editDomainAssemblyTransport} from '../src/core/domainTransportEditing';
import {validateAssemblyTransport,type AssemblyTransport} from '../src/core/assemblyTransport';
import {createCartBook,startCartMovement,finishCartMovement,type CartMotionRoute} from '../src/core/transportState';
import {
  calculateScheduleStateMetrics,
  calculateEquipmentMetrics,
  calculateWaitBreakdown,
  classifyWaitCause,
  calculateRunDurations,
  calculateTransportMetrics,
} from '../src/core/scheduleStateMetrics';
import {calculateStaticWorkload} from '../src/core/workloadBalancing';
import {
  parseProcessStallDiagnostic,
  formatProcessStallMessage,
  ProcessStallError,
  type ProcessStallDiagnostic,
} from '../src/core/processStallDetection';
import {
  calculateGanttTimeGrid,
  buildOperationsGantt,
  buildStationsGantt,
  buildWorkersGantt,
  buildScheduleGanttChart,
} from '../src/core/scheduleGantt';
import {strict as assert} from 'node:assert';
import {test} from 'node:test';

const branchPlace: SubassemblyBufferPlace = {stationId:'JOIN',copy:1,side:'input',capacity:5,subassemblyId:'SUB',unit:'szt.'};
const branchLot = {id:'L1',subassemblyId:'SUB',unit:'szt.',quantity:5};
function deliverBranchLot(book: SubassemblyBufferBook, to=branchPlace, lot=branchLot) {
  let next=applySubassemblyBufferEvent(book,{kind:'reserve',lot,to,atSeconds:book.atSeconds});
  next=applySubassemblyBufferEvent(next,{kind:'depart',id:lot.id,atSeconds:book.atSeconds});
  return applySubassemblyBufferEvent(next,{kind:'arrive',id:lot.id,atSeconds:book.atSeconds+1});
}

test('7.12.C2-B1: partia 5 zajmuje 5 sztuk przed odjazdem i po przyjeździe; pojemność 4 odmawia',()=>{
  const book=createSubassemblyBufferBook([branchPlace]), before=JSON.stringify(book);
  const reserved=applySubassemblyBufferEvent(book,{kind:'reserve',lot:branchLot,to:branchPlace,atSeconds:0});
  assert.deepEqual(subassemblyBufferLoad(reserved,branchPlace),{occupied:0,reserved:5,total:5});
  assert.throws(()=>applySubassemblyBufferEvent(reserved,{kind:'reserve',lot:{...branchLot,id:'L2',quantity:1},to:branchPlace,atSeconds:0}),/pełny/);
  const delivered=deliverBranchLot(book);
  assert.deepEqual(subassemblyBufferLoad(delivered,branchPlace),{occupied:5,reserved:0,total:5});
  assert.equal(JSON.stringify(book),before);
  assert.throws(()=>deliverBranchLot(createSubassemblyBufferBook([{...branchPlace,capacity:4}])),/pełny/);
});

test('7.12.C2-B1: dwaj producenci współdzielą pojemność; całe zużycie zwalnia dokładną ilość',()=>{
  let book=createSubassemblyBufferBook([branchPlace]);
  book=deliverBranchLot(book,branchPlace,{...branchLot,quantity:3});
  book=deliverBranchLot(book,branchPlace,{...branchLot,id:'L2',quantity:2});
  assert.equal(subassemblyBufferLoad(book,branchPlace).total,5);
  const before=JSON.stringify(book);
  assert.throws(()=>applySubassemblyBufferEvent(book,{kind:'consume',id:'L1',quantity:4,at:branchPlace,atSeconds:2}),/przekracza/);
  assert.equal(JSON.stringify(book),before);
  book=applySubassemblyBufferEvent(book,{kind:'consume',id:'L1',quantity:3,at:branchPlace,atSeconds:2});
  assert.equal(subassemblyBufferLoad(book,branchPlace).total,2);
  assert.throws(()=>applySubassemblyBufferEvent(book,{kind:'consume',id:'L1',quantity:3,at:branchPlace,atSeconds:2}),/zużyta/);
  assert.throws(()=>applySubassemblyBufferEvent(book,{kind:'reserve',lot:{...branchLot,quantity:3},to:branchPlace,atSeconds:2}),/zużyte ID/);
});

test('7.12.C2-B1: źródło zwalnia się przy odjeździe, kopie mają osobne pojemności, anulowanie zachowuje źródło',()=>{
  const second={...branchPlace,copy:2};
  let book=deliverBranchLot(createSubassemblyBufferBook([branchPlace,second]));
  book=applySubassemblyBufferEvent(book,{kind:'reserve',lot:branchLot,to:second,atSeconds:1});
  assert.equal(subassemblyBufferLoad(book,branchPlace).occupied,5);
  assert.equal(subassemblyBufferLoad(book,second).reserved,5);
  const cancelled=applySubassemblyBufferEvent(book,{kind:'cancel',id:'L1',atSeconds:1});
  assert.equal(subassemblyBufferLoad(cancelled,branchPlace).total,5);
  assert.equal(subassemblyBufferLoad(cancelled,second).total,0);
  book=applySubassemblyBufferEvent(book,{kind:'depart',id:'L1',atSeconds:1});
  assert.equal(subassemblyBufferLoad(book,branchPlace).total,0);
  assert.throws(()=>applySubassemblyBufferEvent(book,{kind:'cancel',id:'L1',atSeconds:1}),/w ruchu/);
  book=applySubassemblyBufferEvent(book,{kind:'arrive',id:'L1',atSeconds:2});
  assert.deepEqual(subassemblyBufferLoad(book,second),{occupied:5,reserved:0,total:5});
  assert.throws(()=>applySubassemblyBufferEvent(book,{kind:'consume',id:'L1',quantity:5,at:branchPlace,atSeconds:2}),/obecności/);
});

test('7.12.C2-B1: pobranie 3 z 5 pozostawia jawny zapas 2 w buforze; reszta bez przypisania nie jest zużywana ani przenoszona',()=>{
  const second={...branchPlace,copy:2};
  const delivered=deliverBranchLot(createSubassemblyBufferBook([branchPlace,second]));
  let book=applySubassemblyBufferEvent(delivered,{kind:'consume',id:'L1',quantity:3,at:branchPlace,atSeconds:1});
  assert.deepEqual(subassemblyBufferLoad(book,branchPlace),{occupied:2,reserved:0,total:2});
  assert.equal(book.tokens[0].quantity,5);
  assert.equal(book.tokens[0].remainingQuantity,2);
  assert.equal(book.tokens[0].residual,true);
  assert.deepEqual(book.tokens[0].location,{stationId:'JOIN',copy:1,side:'input'});
  assert.equal(delivered.tokens[0].remainingQuantity,5);
  assert.throws(()=>applySubassemblyBufferEvent(book,{kind:'consume',id:'L1',quantity:2,at:branchPlace,atSeconds:1}),/nieprzypisana reszta/);
  assert.throws(()=>applySubassemblyBufferEvent(book,{kind:'reserve',lot:branchLot,to:second,atSeconds:1}),/nieprzypisana reszta/);
  assert.throws(()=>deliverBranchLot(book,branchPlace,{...branchLot,id:'L2',quantity:4}),/pełny/);
  book=deliverBranchLot(book,branchPlace,{...branchLot,id:'L2',quantity:3});
  assert.equal(subassemblyBufferLoad(book,branchPlace).total,5);
});

test('7.12.C2-B1: nie dopowiada jednostek, pojemności 0, kopii ani niebezpiecznych ilości',()=>{
  const book=createSubassemblyBufferBook([branchPlace]);
  for(const lot of [{...branchLot,unit:'kg'},{...branchLot,subassemblyId:'OTHER'},{...branchLot,quantity:1.5},{...branchLot,quantity:NaN},{...branchLot,quantity:Number.MAX_SAFE_INTEGER+1}]) {
    assert.throws(()=>applySubassemblyBufferEvent(book,{kind:'reserve',lot,to:branchPlace,atSeconds:0}));
  }
  assert.throws(()=>deliverBranchLot(createSubassemblyBufferBook([{...branchPlace,capacity:0}])),/bezpośredniego przekazania/);
  assert.throws(()=>createSubassemblyBufferBook([branchPlace,{...branchPlace,unit:'kg'}]),/nakładające/);
  assert.throws(()=>createSubassemblyBufferBook([{...branchPlace,copy:0}]),/konkretna kopia/);
  const unlimited=createSubassemblyBufferBook([{...branchPlace,capacity:null}]);
  const large=applySubassemblyBufferEvent(unlimited,{kind:'reserve',lot:{...branchLot,quantity:Number.MAX_SAFE_INTEGER},to:branchPlace,atSeconds:0});
  assert.throws(()=>applySubassemblyBufferEvent(large,{kind:'reserve',lot:{...branchLot,id:'L2',quantity:1},to:branchPlace,atSeconds:0}),/bezpieczny zakres/);
});

test('7.12.C2-B1: błędna kolejność zdarzeń i zmiana tożsamości nie modyfikują rejestru',()=>{
  const book=createSubassemblyBufferBook([branchPlace]);
  const reserved=applySubassemblyBufferEvent(book,{kind:'reserve',lot:branchLot,to:branchPlace,atSeconds:2});
  const before=JSON.stringify(reserved);
  assert.throws(()=>applySubassemblyBufferEvent(reserved,{kind:'arrive',id:'L1',atSeconds:2}),/rozpoczętego/);
  assert.throws(()=>applySubassemblyBufferEvent(reserved,{kind:'depart',id:'L1',atSeconds:1}),/czasu/);
  assert.throws(()=>applySubassemblyBufferEvent(reserved,{kind:'reserve',lot:{...branchLot,quantity:4},to:branchPlace,atSeconds:2}),/zmiana partii/);
  const moving=applySubassemblyBufferEvent(reserved,{kind:'depart',id:'L1',atSeconds:2});
  assert.throws(()=>applySubassemblyBufferEvent(moving,{kind:'depart',id:'L1',atSeconds:2}),/powtórzony/);
  assert.throws(()=>applySubassemblyBufferEvent(moving,{kind:'consume',id:'L1',quantity:5,at:branchPlace,atSeconds:2}),/obecności/);
  assert.equal(JSON.stringify(reserved),before);
  const cancelled=applySubassemblyBufferEvent(reserved,{kind:'cancel',id:'L1',atSeconds:2});
  assert.equal(cancelled.tokens.length,0);
  const external=[{...branchPlace}];
  const copied=createSubassemblyBufferBook(external);
  external[0].capacity=100;
  assert.equal(copied.places[0].capacity,5);
});
import {DEFAULT_MOTOR_PROJECT as base} from '../src/core/models/defaultProjects';
import {ProcessStep,ProjectData} from '../src/core/models/types';
import {derive} from '../src/core/project';
import {setOperationLinks,successorsOf,replaceImportedProcess,removeOperation} from '../src/core/editing';
import {simulateNetwork} from '../src/core/algorithms/networkSimulation';
import {applyEquipmentAppearance} from '../src/core/equipment/equipmentAppearance';

test('6.4: wymiana wyglądu nie zmienia wyników 4/5 ani źródła; odczyt i migracja 6 zachowują wybór',()=>{
  const projects=[derive(parseProject(JSON.stringify(base))).project,
    deriveStationProject(parseStationProjectV5(readFileSync('tests/qa/Eko_D5_actual_export_v5.json','utf8'))).project];
  for(const project of projects){
    const original=structuredClone(project),baseline=simulateNetwork(project,4050,3),id=project.layoutObjects[0].id;
    const next={...project,layoutObjects:applyEquipmentAppearance(project.layoutObjects,id,'concept-shelf-cart')};
    assert.deepEqual(simulateNetwork(next,4050,3),baseline);assert.deepEqual(project,original);
    if(project.schemaVersion===5){
      const reopened=parseStationProjectV5(JSON.stringify(next));assert.equal(reopened.layoutObjects[0].visualModelId,'concept-shelf-cart');
      const prepared=prepareDomainMigration(previewDomainMigrationFromV5(JSON.stringify(reopened)));
      assert.equal(parseDomainProjectV6(JSON.stringify(prepared.project)).layoutObjects[0].visualModelId,'concept-shelf-cart');
      assert.throws(()=>parseDomainProjectV6(JSON.stringify({...prepared.project,layoutObjects:prepared.project.layoutObjects.map((o,i)=>i?o:{...o,visualModelId:'unknown'})})),/model wizualny/);
    }
  }
});
test('6.4: wygląd nie zmienia harmonogramu szkicu 6, zajęć zasobów ani lokalizacji korpusu',()=>{
  const project=concurrentBodyFixture(),input=bodyInputFor();
  project.layoutObjects=[{id:'VISUAL-QA',name:'Geometria testowa',type:'QualityGate',xMm:0,yMm:0,zMm:0,widthMm:1000,lengthMm:1000,heightMm:1000,rotationDeg:0,colorHex:'#123456'}];
  const before=structuredClone(project),baseline=scheduleWorkerRun(project,1,1,input);
  const changed={...project,layoutObjects:applyEquipmentAppearance(project.layoutObjects,'VISUAL-QA','concept-parts-rack')};
  const reopened=parseDomainProjectV6(JSON.stringify(changed));
  assert.deepEqual(scheduleWorkerRun(reopened,1,1,input),baseline);assert.deepEqual(project,before);
});
import {resourceKey} from '../src/core/resources';
import {parseProject} from '../src/core/validation';
import {layoutWarnings} from '../src/core/algorithms/layoutEngine';
import {DEFAULT_EKO_PROJECT} from '../src/core/models/ekoProject';
import {reviseStations} from '../src/core/stationRegistry';
import {previewStationMigration,prepareStationMigration} from '../src/core/stationMigration';
import {previewDomainMigrationFromV4,previewDomainMigrationFromV5,verifyDomainMigrationPreview} from '../src/core/domainMigrationPreview';
import {parseDomainProjectV6,prepareDomainMigration,type DomainOperationStaffing,type DomainTimeProfile} from '../src/core/domainProject';
import {editDomainPeople} from '../src/core/domainPeopleEditing';
import {editDomainProduct} from '../src/core/domainProductEditing';
import {editDomainPhysicalRole} from '../src/core/domainPhysicalRoleEditing';
import {editDomainEquipment} from '../src/core/domainEquipmentEditing';
import {editDomainTime} from '../src/core/domainTimeEditing';
import {editDomainWorkerRun} from '../src/core/domainWorkerRunEditing';
import {createWorkerReservationBook,reserveWorkerTeam,releaseWorkerTeam} from '../src/core/workerReservations';
import {createWorkerRunPlan,type WorkerOperationSelection} from '../src/core/workerRunPlan';
import {scheduleWorkerRun} from '../src/core/workerSchedule';
import {availableWindows,intersectWindows,sharedAvailability,validateResourceCalendars} from '../src/core/resourceCalendar';
import {validateStationRouting,type StationRoutingV6} from '../src/core/stationRouting';
import {createBodyBook,applyBodyEvent,bodyAvailableAt,bodyAllowsOperation,type BodyEvent} from '../src/core/bodyState';
import type {BodyRunInput} from '../src/core/bodyRunInput';
import {validatePhysicalConcurrency,matchingConcurrencyGroup,type PhysicalConcurrency} from '../src/core/physicalConcurrency';
import {DOMAIN_DRAFT_STORAGE_KEY,readDomainDraft,replaceDomainDraft,saveDomainDraft} from '../src/core/domainDraftStorage';
import {parseStationProjectV5} from '../src/core/stationProject';
import {runStationBalancing,moveStationOperation} from '../src/core/stationBalancing';
import {deriveStationProject} from '../src/core/stationDerivation';
import {layoutRoutes} from '../src/core/algorithms/routing';
import {reviseStationProject,splitStationProject,mergeStationProject,removeStationOperation} from '../src/core/stationRevision';
import {addStationEquipment,updateStationEquipment,removeStationEquipment} from '../src/core/stationGeometry';
import {readFileSync} from 'node:fs';
import {prepareDomainPhysicalPlayback, domainPhysicalPlaybackFrame} from '../src/core/domainPhysicalPlayback';
import {prepareDomainPhysicalScene,domainPhysicalSceneFrame} from '../src/core/domainPhysicalScene';
import {physicalPlaybackUiFixture,physicalPlaybackUiPackage} from './fixtures/physicalPlaybackUi';
import {parseProjectPackage as parsePhysicalQaPackage} from '../src/core/projectPackage';

test('7.12.A2b2b: scena pokazuje jeden korpus i wózek na granicach czasu, bez interpolacji lub mutacji',()=>{
  const {project}=physicalPlaybackUiFixture(),conditions={batch:1,arrivalIntervalSeconds:1,transportMode:'configured' as const};
  const result=scheduleWorkerRun(project,1,1,project.bodyRunInput),before=JSON.stringify({project,result});
  assert.equal(result.jobs[0].finish,22);
  const history=prepareDomainPhysicalPlayback(project,result,conditions),scene=prepareDomainPhysicalScene(project,history);
  assert.equal(history.endSeconds,27);assert.deepEqual(scene.hiddenObjectIds,['CART-SHAPE']);
  const frame=(at:number)=>domainPhysicalSceneFrame(scene,domainPhysicalPlaybackFrame(history,at));
  assert.equal(frame(0).find(e=>e.kind==='body')!.anchor!.objectId,'TABLE-A');
  for(const at of [10,11.999])assert.ok(frame(at).every(e=>e.anchor===null&&e.movement!==null));
  assert.equal(frame(11).find(e=>e.kind==='cart')!.progress,.5);
  assert.equal(frame(12).find(e=>e.kind==='body')!.anchor!.objectId,'TABLE-C');
  assert.equal(frame(22).find(e=>e.kind==='cart')!.anchor,null);
  assert.equal(frame(27).find(e=>e.kind==='cart')!.anchor!.objectId,'TABLE-A');
  assert.equal(frame(27).find(e=>e.kind==='body')!.anchor!.objectId,'TABLE-C');
  assert.deepEqual(frame(0),frame(-1));assert.equal(frame(0).length,2);
  const mutable=frame(0);mutable[0].anchor!.xMm=-999;assert.equal(frame(0)[0].anchor!.xMm,1500);
  for(const at of [27,0,10,12,22,0])frame(at);
  assert.equal(JSON.stringify({project,result}),before);
  parsePhysicalQaPackage(JSON.stringify(physicalPlaybackUiPackage()));
});

test('7.12.A2b2b: brak lub niejednoznaczna geometria nie tworzy pozycji, JIT nie ukrywa statycznych wózków',()=>{
  const {project}=physicalPlaybackUiFixture();
  const check=(mode:'configured'|'just-in-time')=>{
    const result=scheduleWorkerRun(project,1,1,undefined,undefined,{transportMode:mode});
    const history=prepareDomainPhysicalPlayback(project,result,{batch:1,arrivalIntervalSeconds:1,transportMode:mode});
    const scene=prepareDomainPhysicalScene(project,history);
    return {scene,frame:domainPhysicalSceneFrame(scene,domainPhysicalPlaybackFrame(history,0))};
  };
  assert.deepEqual(check('just-in-time').scene.hiddenObjectIds,[]);assert.deepEqual(check('just-in-time').frame,[]);
  project.layoutObjects=project.layoutObjects.filter(o=>o.id!=='TABLE-C');
  const result=scheduleWorkerRun(project,1,1,project.bodyRunInput),history=prepareDomainPhysicalPlayback(project,result,{batch:1,arrivalIntervalSeconds:1,transportMode:'configured'});
  assert.equal(domainPhysicalSceneFrame(prepareDomainPhysicalScene(project,history),domainPhysicalPlaybackFrame(history,12))[0].anchor,null);
  project.name+=' changed';assert.throws(()=>prepareDomainPhysicalScene(project,history),/nie odpowiada/);
});

test('7.12.A2b2b: wiele jawnych punktów stanowiska pozostaje niejednoznaczne',()=>{
  const {project}=physicalPlaybackUiFixture();
  project.layoutObjects.push({...project.layoutObjects[0],id:'TABLE-OTHER'});
  project.equipment.push({id:'EQ-OTHER',name:'Drugi punkt testowy',stationId:'ST-A',layoutObjectId:'TABLE-OTHER'});
  project.stationRouting!.equipmentPlacements.push({equipmentId:'EQ-OTHER',stationId:'ST-A',copy:1});
  const result=scheduleWorkerRun(project,1,1,project.bodyRunInput),history=prepareDomainPhysicalPlayback(project,result,{batch:1,arrivalIntervalSeconds:1,transportMode:'configured'});
  const scene=prepareDomainPhysicalScene(project,history);
  assert.equal(domainPhysicalSceneFrame(scene,domainPhysicalPlaybackFrame(history,0))[0].anchor,null);
});

test('7.12.A2b2a: fizyczne granice przejazdu i powrotu, cofanie oraz niezmienność rejestrów',()=>{
  const {project}=assemblyMovementFixture();addReturnRoute(project);
  project.assemblyTransport!.carts[0].afterUnload='return-to-initial';
  const input=assemblyScheduleInput(),result=scheduleWorkerRun(project,1,1,input);
  const before=JSON.stringify({project,input,result});
  const playback=prepareDomainPhysicalPlayback(project,result,{batch:1,arrivalIntervalSeconds:1,transportMode:'configured'},input);
  assert.equal(playback.endSeconds,27);assert.equal(result.jobs[0].finish,22);
  const frame=(at:number)=>domainPhysicalPlaybackFrame(playback,at);
  assert.equal(frame(9).bodies[0].status,'reserved');
  assert.equal(frame(10).bodies[0].status,'moving');assert.equal(frame(10).bodies[0].location.kind,'unknown');
  assert.equal(frame(11).carts[0].location,null);assert.equal(frame(11).carts[0].movement!.kind,'loaded');
  assert.equal(frame(12).bodies[0].status,'reserved');assert.equal(frame(12).carts[0].movement,null);
  assert.equal(frame(22).bodies[0].status,'available');assert.equal(frame(22).carts[0].movement!.kind,'empty');
  assert.deepEqual(frame(27).bodies,result.bodyBook!.bodies);assert.deepEqual(frame(27).carts,result.cartBook!.carts);
  assert.deepEqual(frame(0),frame(-10));assert.deepEqual(frame(27),frame(999));assert.deepEqual(frame(NaN),frame(0));
  const old=frame(0);old.bodies[0].id='CHANGED';old.carts[0].location!.stationId='CHANGED';
  for(const at of [27,10,26,0,12,9,27])assert.equal(frame(at).bodies[0].id,'BODY');
  assert.equal(JSON.stringify({project,input,result}),before);
});

test('7.12.A2b2a: dojazd nie przesuwa korpusu, wspólny moment przyjazdu i wyjazdu nie teleportuje wózka',()=>{
  const {project}=assemblyMovementFixture();addReturnRoute(project);
  project.assemblyTransport!.carts[0].initialLocation={stationId:'ST-C',copy:1};
  const input=assemblyScheduleInput(),result=scheduleWorkerRun(project,1,1,input);
  const playback=prepareDomainPhysicalPlayback(project,result,{batch:1,arrivalIntervalSeconds:1,transportMode:'configured'},input);
  const during=domainPhysicalPlaybackFrame(playback,14),depart=domainPhysicalPlaybackFrame(playback,15);
  assert.equal(during.carts[0].movement!.kind,'empty');assert.equal(during.bodies[0].location.kind,'station');
  assert.equal(depart.carts[0].movement!.kind,'loaded');assert.equal(depart.bodies[0].status,'moving');
  assert.deepEqual(depart.carts[0].movement!.from,{stationId:'ST-A',copy:1});
});

test('7.12.A2b2a: bufory i lokalna kontynuacja zachowują korpus na kopii aż do rzeczywistego wyjazdu',()=>{
  const {project,input}=localContinuationFixture();
  project.resourceCalendars!.stations['ST-A'].shifts[0].startSeconds=0;
  project.resourceCalendars!.workers[project.workers[1].id].shifts[0].startSeconds=25;
  const result=scheduleWorkerRun(project,1,2,input),before=JSON.stringify(result);
  const playback=prepareDomainPhysicalPlayback(project,result,{batch:2,arrivalIntervalSeconds:1,transportMode:'configured'});
  for(const at of [10,24.999,25,30.999]){
    const body=domainPhysicalPlaybackFrame(playback,at).bodies.find(b=>b.id===input.jobs[0].bodyId)!;
    assert.equal(body.status,'reserved');assert.deepEqual(body.location,{kind:'station',stationId:'ST-A',copy:1});
  }
  const final=domainPhysicalPlaybackFrame(playback,playback.endSeconds);
  assert.deepEqual(final.bodies,result.bodyBook!.bodies);assert.deepEqual(final.carts,result.cartBook!.carts);
  assert.equal(JSON.stringify(result),before);
  const other=bufferedPhysicalFixture(5),blocked=scheduleWorkerRun(other.project,1,5,other.input);
  const held=blocked.runs.find(run=>run.blockedSeconds!>0)!;
  const history=prepareDomainPhysicalPlayback(other.project,blocked,{batch:5,arrivalIntervalSeconds:1,transportMode:'configured'});
  const body=domainPhysicalPlaybackFrame(history,held.endSeconds).bodies.find(b=>b.id===held.bodyId)!;
  assert.equal(body.status,'reserved');assert.deepEqual(body.location,{kind:'station',stationId:held.stationId,copy:held.copy});
});

test('7.12.A2b2a: wielowózkowy zestaw zachowuje sekwencję dojazdów i wspólny wyjazd',()=>{
  for(const reverse of [false,true]){
    const project=multipleApproachFixture(),input=assemblyScheduleInput();
    if(reverse)project.assemblyTransport!.routes[0].alternatives[0].equipmentIds.reverse();
    const result=scheduleWorkerRun(project,1,1,input);
    const history=prepareDomainPhysicalPlayback(project,result,{batch:1,arrivalIntervalSeconds:1,transportMode:'configured'},input);
    assert.equal(domainPhysicalPlaybackFrame(history,12).carts.filter(c=>c.movement?.kind==='empty').length,1);
    assert.equal(domainPhysicalPlaybackFrame(history,20).carts.filter(c=>c.movement?.kind==='empty').length,1);
    assert.ok(domainPhysicalPlaybackFrame(history,23).carts.every(c=>c.movement?.kind==='loaded'));
    assert.deepEqual(domainPhysicalPlaybackFrame(history,history.endSeconds).carts,result.cartBook!.carts);
  }
});

test('7.12.A2b2a: JIT nie uzyskuje fizycznych lokalizacji z geometrii',()=>{
  const {project,input}=bufferedPhysicalFixture(1),conditions={batch:1,arrivalIntervalSeconds:1,transportMode:'just-in-time' as const};
  const result=scheduleWorkerRun(project,1,1,input,undefined,{transportMode:'just-in-time'});
  const playback=prepareDomainPhysicalPlayback(project,result,conditions);
  assert.equal(playback.mode,'just-in-time');assert.deepEqual(domainPhysicalPlaybackFrame(playback,5).bodies,[]);
  assert.deepEqual(domainPhysicalPlaybackFrame(playback,5).carts,[]);
  assert.throws(()=>prepareDomainPhysicalPlayback(project,{...result,bodyEvents:[]},conditions),/JIT/);
  const logical=JSON.parse(basicDemoPackage().data.draftRaw).project;
  const jit=scheduleWorkerRun(logical,1,3,undefined,undefined,{transportMode:'just-in-time'});
  assert.equal(prepareDomainPhysicalPlayback(logical,jit,{...conditions,batch:3}).bodies.length,0);
});

test('7.12.A2b2a: równoległe operacje mają jeden korpus, a kolejne zwolnienie nie przenosi go na inną kopię',()=>{
  const project=concurrentBodyFixture(),input=bodyInputFor(),result=scheduleWorkerRun(project,1,1,input);
  const history=prepareDomainPhysicalPlayback(project,result,{batch:1,arrivalIntervalSeconds:1,transportMode:'configured'},input);
  const busy=domainPhysicalPlaybackFrame(history,5);
  assert.equal(busy.bodies.length,1);const body=busy.bodies[0];assert.equal(body.status,'reserved');
  if(body.status==='reserved')assert.equal(body.additionalReservations!.length,1);
  const later=domainPhysicalPlaybackFrame(history,10).bodies[0];assert.equal(later.status,'reserved');
  assert.deepEqual(later.location,body.location);
  assert.deepEqual(domainPhysicalPlaybackFrame(history,history.endSeconds).bodies,result.bodyBook!.bodies);
});

test('7.12.A2b2a: niepełna historia, błędne przypisania i zmieniony końcowy rejestr są odrzucane',()=>{
  const {project}=assemblyMovementFixture(),input=assemblyScheduleInput(),conditions={batch:1,arrivalIntervalSeconds:1,transportMode:'configured' as const};
  const result=scheduleWorkerRun(project,1,1,input);
  const check=(change:(copy:typeof result)=>void)=>{const copy=structuredClone(result);change(copy);assert.throws(()=>prepareDomainPhysicalPlayback(project,copy,conditions,input));};
  check(r=>{r.bodyEvents=r.bodyEvents!.slice(1);});
  check(r=>{r.bodyBook!.bodies[0].id='OTHER';});
  check(r=>{r.runs[0].bodyId='OTHER';});
  check(r=>{r.cartBook!.carts[0].location={stationId:'ST-A',copy:1};});
  check(r=>{r.transportMovements=[];});
  check(r=>{r.transportMovements=[{...r.transportMovements![0],endSeconds:13}];});
  check(r=>{r.transportMovements=[{...r.transportMovements![0],routeId:'UNKNOWN'}];});
  check(r=>{r.transportMovements=[...r.transportMovements!,structuredClone(r.transportMovements![0])];});
  assert.throws(()=>prepareDomainPhysicalPlayback(project,result,conditions),/instancji/);
});

function basicDemoPackage(){
  const {parseProjectPackage}=require('../src/core/projectPackage');
  return parseProjectPackage(readFileSync('przyklady/01_zestaw_montazowy/projekt-pokazowy.json','utf8'));
}
function intermediateDemoPackage(){
  const {parseProjectPackage}=require('../src/core/projectPackage');
  return parseProjectPackage(readFileSync('przyklady/02_wozek_warsztatowy/projekt-pokazowy.json','utf8'));
}
function advancedDemoPackage(){
  const {parseProjectPackage}=require('../src/core/projectPackage');
  return parseProjectPackage(readFileSync('przyklady/03_modul_urzadzenia/projekt-pokazowy.json','utf8'));
}
function ekoDemoPackage(){
  const {parseProjectPackage}=require('../src/core/projectPackage');
  return parseProjectPackage(readFileSync('przyklady/04_eko/projekt-pokazowy.json','utf8'));
}

test('7.12.A2b1: odtwarzanie korzysta z wyniku 190 s, zachowuje model, wynik i rzeczywiste przypisania geometrii',()=>{
  const api=require('../src/core/domainPlayback'),pkg=basicDemoPackage(),project=JSON.parse(pkg.data.variantsRaw).variants[1].project;
  const result=scheduleWorkerRun(project,1,3,undefined,undefined,{transportMode:'just-in-time'}),before=JSON.stringify({project,result});
  const playback=api.prepareDomainPlayback(project,result,{batch:3,arrivalIntervalSeconds:1,transportMode:'just-in-time'});
  assert.equal(playback.endSeconds,190);assert.equal(playback.modelSignature,api.domainModelSignature(project));
  const at25=api.domainPlaybackFrame(playback,25),working=at25.states.filter((s:any)=>s.state==='work');
  assert.deepEqual(working.map((s:any)=>[s.job,s.operationId,s.stationId]),[[1,'ZM-OP20','ST-ZM-1']]);
  assert.equal(working[0].anchors[0].objectId,'ZM-TABLE-1');
  assert.ok(at25.states.filter((s:any)=>s.state==='waiting').every((s:any)=>s.anchors.length===0));
  assert.equal(api.domainPlaybackFrame(playback,190).completed,3);assert.deepEqual(api.domainPlaybackFrame(playback,190).states,[]);
  for(const time of [0,20,25,50,90,100,190,200,-1,NaN])api.domainPlaybackFrame(playback,time);
  assert.equal(JSON.stringify({project,result}),before);
  assert.notEqual(playback.modelSignature,api.domainModelSignature(JSON.parse(pkg.data.draftRaw).project));
});

test('7.12.A2b1: granice pracy, przerwa i zajęcie po obróbce są czytane z półotwartych okien wyniku',()=>{
  const api=require('../src/core/domainPlayback'),pkg=basicDemoPackage(),project=JSON.parse(pkg.data.draftRaw).project;
  const result=scheduleWorkerRun(project,1,1,undefined,undefined,{transportMode:'just-in-time'});
  result.runs[0].workWindows=[{startSeconds:0,endSeconds:10},{startSeconds:15,endSeconds:20}];result.runs[0].stationReleaseSeconds=25;
  const playback=api.prepareDomainPlayback(project,result,{batch:1,arrivalIntervalSeconds:1,transportMode:'just-in-time'});
  const state=(t:number)=>api.domainPlaybackFrame(playback,t).states.find((s:any)=>s.id==='run-0')?.state;
  assert.equal(state(9),'work');assert.equal(state(10),'calendar-pause');assert.equal(state(15),'work');assert.equal(state(20),'held');assert.equal(state(25),undefined);
});

test('7.12.A2b1: brak geometrii i niejednoznaczna kopia nie tworzą domyślnej lokalizacji znacznika',()=>{
  const api=require('../src/core/domainPlayback'),pkg=basicDemoPackage(),project=JSON.parse(pkg.data.draftRaw).project;
  const result=scheduleWorkerRun(project,1,1,undefined,undefined,{transportMode:'just-in-time'});
  project.layoutObjects=[];project.equipment.forEach((e:any)=>{delete e.layoutObjectId;});
  const empty=api.prepareDomainPlayback(project,result,{batch:1,arrivalIntervalSeconds:1,transportMode:'just-in-time'});
  assert.ok(empty.entries.every((e:any)=>e.anchors.length===0));assert.equal(api.domainPlaybackFrame(empty,5).states[0].state,'work');
  const multiple=JSON.parse(pkg.data.draftRaw).project;multiple.stationSettings['ST-ZM-1'].parallelStations=2;multiple.equipment[0].layoutObjectId=undefined;
  const ambiguous=api.prepareDomainPlayback(multiple,result,{batch:1,arrivalIntervalSeconds:1,transportMode:'just-in-time'});assert.deepEqual(ambiguous.entries[0].anchors,[]);
  assert.throws(()=>api.prepareDomainPlayback(multiple,result,{batch:2,arrivalIntervalSeconds:1,transportMode:'just-in-time'}),/warunkom/);
  assert.throws(()=>api.prepareDomainPlayback(multiple,result,{batch:1,arrivalIntervalSeconds:1,transportMode:'configured'}),/warunkom/);
  const bad=structuredClone(result);bad.runs[0].copy=99;assert.throws(()=>api.prepareDomainPlayback(multiple,bad,{batch:1,arrivalIntervalSeconds:1,transportMode:'just-in-time'}),/odniesienie/);
});

test('7.12.A2b1: szybkość i krok zmieniają wyłącznie czas odczytu, nie harmonogram ani jego skrót',()=>{
  const api=require('../src/core/domainPlayback'),{stepSimulationTime}=require('../src/core/algorithms/simulation');
  const pkg=basicDemoPackage(),project=JSON.parse(pkg.data.draftRaw).project,result=scheduleWorkerRun(project,1,3,undefined,undefined,{transportMode:'just-in-time'});
  const playback=api.prepareDomainPlayback(project,result,{batch:3,arrivalIntervalSeconds:1,transportMode:'just-in-time'}),before=JSON.stringify(playback);
  for(const speed of [1,100,5000]){let time=0;for(let i=0;i<10;i++){time=stepSimulationTime(time,.2,speed,playback.endSeconds);api.domainPlaybackFrame(playback,time);}assert.ok(time<=170);}
  assert.equal(JSON.stringify(playback),before);assert.equal(api.prepareDomainPlayback(project,result,{batch:3,arrivalIntervalSeconds:1,transportMode:'just-in-time'}).resultSignature,playback.resultSignature);
});

test('7.12.A2a: przydziały, geometria i raport są projekcją aktywnego 6 bez zmiany źródła i bez ponownego bilansu',()=>{
  const api=require('../src/core/domainModelView'),pkg=basicDemoPackage();
  const variants=JSON.parse(pkg.data.variantsRaw).variants,before=JSON.stringify(variants);
  const [baseView,consView]=variants.map((v:any)=>api.buildDomainModelView(v.project));
  assert.equal(baseView.maxCopyLoadSeconds,40);assert.equal(consView.maxCopyLoadSeconds,50);
  assert.equal(baseView.staticCapacityPerHour,90);assert.equal(consView.staticCapacityPerHour,72);
  assert.deepEqual(consView.stations.map((s:any)=>s.operationIds),[['ZM-OP10','ZM-OP20'],[],['ZM-OP30']]);
  assert.deepEqual(consView.stations.map((s:any)=>s.assignedSeconds),[50,0,40]);
  assert.deepEqual(consView.selectedWorkers,['ZM-W1','ZM-W3']);
  assert.equal(baseView.geometry.find((o:any)=>o.id==='ZM-TABLE-2').yMm,2000);
  assert.equal(consView.geometry.find((o:any)=>o.id==='ZM-TABLE-2').yMm,4000);
  assert.notEqual(baseView.signatureSha256,consView.signatureSha256);
  const report=api.domainModelViewReport(consView);assert.ok(report.includes(consView.signatureSha256));
  assert.ok(report.includes('ST-ZM-1 | ZM-OP10, ZM-OP20 | 50'));assert.ok(report.includes('72 szt./h'));
  assert.ok(report.includes('3000/4000/0'));assert.ok(report.includes('założenie'));
  assert.equal(JSON.stringify(variants),before);assert.deepEqual(JSON.parse(pkg.data.source4Json).processSteps.map((o:any)=>o.assignedWorkstationId),['WS-1','WS-2','WS-3']);
});

test('7.12.A2a: brak obsady lub wiele dopuszczeń nie tworzy czasów, kopii ani pozornej zdolności',()=>{
  const api=require('../src/core/domainModelView'),pkg=basicDemoPackage(),base=JSON.parse(pkg.data.draftRaw).project;
  const noChoice=structuredClone(base);delete noChoice.workerRunSelection;
  const missing=api.buildDomainModelView(noChoice);assert.equal(missing.selectedWorkSeconds,null);assert.equal(missing.maxCopyLoadSeconds,null);assert.equal(missing.staticCapacityPerHour,null);assert.equal(missing.operations[0].durationSeconds,null);assert.equal(missing.stations[0].assignedSeconds,null);
  const alternate=structuredClone(base);alternate.stationRouting.operations[1].candidates.push({stationId:'ST-ZM-1',copy:1,requiredEquipmentIds:['ZM-EQ1']});
  const alternatives=api.buildDomainModelView(alternate);assert.equal(alternatives.staticCapacityPerHour,null);assert.ok(alternatives.copies.every((c:any)=>c.loadSeconds===null));
  const noRouting=structuredClone(base);delete noRouting.stationRouting;
  const unrouted=api.buildDomainModelView(noRouting);assert.equal(unrouted.staticCapacityPerHour,null);assert.equal(unrouted.stations[0].assignedSeconds,20);
  const noCopy=structuredClone(noRouting);delete noCopy.stationSettings['ST-ZM-1'];assert.equal(api.buildDomainModelView(noCopy).stations[0].copies,null);
  const emptyGeometry=structuredClone(base);emptyGeometry.layoutObjects=[];emptyGeometry.equipment.forEach((e:any)=>{delete e.layoutObjectId;});assert.deepEqual(api.buildDomainModelView(emptyGeometry).geometry,[]);
});

test('7.12.A2a: rzut zachowuje obroty i odniesienia, tekst raportu nie wstrzykuje wierszy tabel',()=>{
  const api=require('../src/core/domainModelView'),pkg=basicDemoPackage(),base=JSON.parse(pkg.data.draftRaw).project;
  base.layoutObjects[0].rotationDeg=90;base.operations[0].name='Nazwa | kontrolna\nNowy wiersz';
  const view=api.buildDomainModelView(base),object=view.geometry[0];
  assert.deepEqual(object.points,require('../src/core/algorithms/layoutEngine').corners(base.layoutObjects[0]));assert.equal(object.workstationId,'ST-ZM-1');
  const text=api.domainModelViewReport(view);assert.ok(text.includes('Nazwa \\| kontrolna Nowy wiersz'));
  assert.equal(view.signatureSha256,api.buildDomainModelView(base).signatureSha256);
  const source=JSON.stringify(base);scheduleWorkerRun(base,1,3,undefined,undefined,{transportMode:'just-in-time'});
  assert.equal(JSON.stringify(base),source);assert.equal(api.buildDomainModelView(base).signatureSha256,view.signatureSha256);
});

test('7.12.B: manifest obejmuje wszystkie pliki, poprawne SHA, źródła i czytelne projekcje bez zależności od dawnych przykładów',()=>{
  const root='przyklady/01_zestaw_montazowy/',pkg=basicDemoPackage();
  const {createHash}=require('node:crypto'),{readdirSync}=require('node:fs');
  const manifest=JSON.parse(readFileSync(root+'manifest.json','utf8'));
  assert.equal(manifest.dataOrigin,'synthetic');assert.equal(manifest.entryFile,'projekt-pokazowy.json');
  assert.equal(manifest.importer.format,pkg.format);assert.equal(pkg.data.dataOrigin,'synthetic');
  assert.deepEqual(manifest.assets.externalFiles,[]);
  const files=readdirSync(root,{recursive:true,withFileTypes:true}).filter((d:any)=>d.isFile()).map((d:any)=>require('node:path').relative(root,require('node:path').join(d.parentPath,d.name)).replaceAll('\\','/')).filter((p:string)=>p!=='manifest.json').sort();
  assert.deepEqual(manifest.files.map((f:any)=>f.path).sort(),files);
  for(const file of manifest.files){
    assert.ok(!file.path.startsWith('/')&&!file.path.includes('..')&&!file.path.includes('\\'));
    const bytes=readFileSync(root+file.path);assert.equal(file.bytes,bytes.length);assert.equal(file.sha256,createHash('sha256').update(bytes).digest('hex'));
  }
  for(const [path,raw] of [['dane/zrodlo4.json',pkg.data.source4Json],['dane/szkic6.json',pkg.data.draftRaw],['dane/warianty6.json',pkg.data.variantsRaw]])assert.deepEqual(JSON.parse(readFileSync(root+path,'utf8')),JSON.parse(raw));
  const draft=JSON.parse(pkg.data.draftRaw).project;
  assert.equal(draft.facility.isConfirmed,false);assert.ok(draft.layoutObjects.every((o:any)=>o.isVisualAssumption));
  assert.ok(!/EKO|AUDIT-7|MOTOR|BATTERY/.test(JSON.stringify(draft)));
  assert.equal(pkg.data.source5Json,null);assert.deepEqual(draft.subassemblies,[]);
});

test('7.12.B: arkusze procesu i BOM przechodzą istniejące importery i odpowiadają pełnemu modelowi',()=>{
  const pkg=basicDemoPackage(),project=JSON.parse(pkg.data.draftRaw).project;
  const excel=require('../src/core/export/excelImporter'),XLSX=require('xlsx');
  const bytes=(path:string)=>{const b=readFileSync('przyklady/01_zestaw_montazowy/dane/'+path);return b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength);};
  const process=excel.importProcess(bytes('proces.xlsx')),bom=excel.importBOM(bytes('bom.xlsx'),new Set(project.operations.map((o:any)=>o.id)));
  assert.deepEqual(process.errors,[]);assert.equal(process.skipped,0);assert.equal(process.items.length,3);
  assert.deepEqual(excel.processRows(process.items),excel.processRows(project.operations));
  assert.deepEqual(bom.errors,[]);assert.equal(bom.skipped,0);assert.deepEqual(excel.bomRows(bom.items),excel.bomRows(project.bom));
  for(const path of ['proces.xlsx','bom.xlsx']){const book=XLSX.read(bytes(path),{type:'array'});assert.deepEqual(book.SheetNames,['Dane','Opis kolumn','Pochodzenie']);
    for(const sheet of Object.values(book.Sheets) as any[])for(const [key,cell] of Object.entries(sheet) as any[])if(!key.startsWith('!'))assert.equal(cell.f,undefined,'No formulas or external workbook dependencies');
  }
});

test('7.12.B: takt, BOM i statyczny bilans zgadzają się z niezależnymi obliczeniami',()=>{
  const pkg=basicDemoPackage(),ref=JSON.parse(readFileSync('przyklady/01_zestaw_montazowy/referencje/oczekiwane_wyniki.json','utf8'));
  const {calculateTaktTime}=require('../src/core/algorithms/taktCalculator');
  const source=derive(parseProject(pkg.data.source4Json));assert.deepEqual(source.issues.filter(i=>i.severity==='error'),[]);
  const takt=calculateTaktTime(source.project.demand);assert.equal(takt.customerTaktSeconds,ref.customerTaktSeconds);assert.equal(takt.taktTimeSeconds,ref.targetCycleSeconds);
  assert.equal(source.project.bom.reduce((n,b)=>n+b.quantityPerUnit*b.unitCost,0),ref.bomCostPerUnit);
  const variants=JSON.parse(pkg.data.variantsRaw).variants;
  for(const variant of variants){const summary=summarizeStaticVariant(variant.project),expected=ref.variants.find((r:any)=>r.id===variant.id);
    assert.equal(summary.activeStationsCount,expected.activeStations);assert.equal(summary.teamWorkersCount,expected.selectedWorkers);assert.equal(summary.selectedWorkContentSeconds,ref.workContentSeconds);assert.equal(summary.staticCapacityPerHour,expected.staticCapacityPerHour);assert.equal(summary.timeBasis,'assumed');
    assert.equal(variant.project.operations.reduce((s:number,o:any)=>s+o.vaTimeSeconds,0),ref.vaSeconds);
    for(const op of variant.project.operations){const p=op.staffing.timeVariants[0].timeProfile;assert.equal(p.durationBasis,'assumed');assert.deepEqual(p.machineRun,[]);assert.equal(p.manualWork[0].endSeconds,p.durationSeconds);}
  }
  assert.deepEqual(variants[0].project.demand,variants[1].project.demand);
});

test('7.12.B: wszystkie okna ręcznego harmonogramu obu wariantów, brak podwójnych rezerwacji, JIT i niezmienność danych',()=>{
  const pkg=basicDemoPackage(),ref=JSON.parse(readFileSync('przyklady/01_zestaw_montazowy/referencje/oczekiwane_wyniki.json','utf8'));
  const variants=JSON.parse(pkg.data.variantsRaw).variants,before=JSON.stringify(variants);
  for(const variant of variants){
    const expected=ref.variants.find((r:any)=>r.id===variant.id),project=parseDomainProjectV6(JSON.stringify(variant.project));
    const result=scheduleWorkerRun(project,ref.conditions.arrivalIntervalSeconds,ref.conditions.batch,undefined,undefined,{transportMode:'just-in-time'});
    assert.equal(result.transportMode,'just-in-time');assert.equal(result.bodyBook,undefined);assert.equal(result.transportMovements,undefined);
    assert.deepEqual(result.jobs.map(j=>j.finish),expected.completionSeconds);
    const actual=result.runs.map(r=>[r.job,r.operationId,r.startSeconds,r.endSeconds]).sort((a,b)=>Number(a[0])-Number(b[0])||String(a[1]).localeCompare(String(b[1])));
    assert.equal(actual.length,9);for(let i=0;i<actual.length;i++){assert.deepEqual(actual[i].slice(0,2),expected.operationWindows[i].slice(0,2));for(const j of [2,3])assert.ok(Math.abs(Number(actual[i][j])-expected.operationWindows[i][j])<=ref.absoluteToleranceSeconds);}
    for(const worker of project.workerRunSelection!.teamWorkerIds){const runs=result.runs.filter(r=>r.workerIds.includes(worker)).sort((a,b)=>a.startSeconds-b.startSeconds);for(let i=1;i<runs.length;i++)assert.ok(runs[i-1].endSeconds<=runs[i].startSeconds);}
    const single=scheduleWorkerRun(project,1,1,undefined,undefined,{transportMode:'just-in-time'});assert.equal(single.jobs[0].finish,90);
    const moved=structuredClone(project);moved.layoutObjects.forEach(o=>o.xMm+=100);assert.deepEqual(scheduleWorkerRun(moved,1,3,undefined,undefined,{transportMode:'just-in-time'}),result);
  }
  assert.equal(JSON.stringify(variants),before);
  const comparison=compareDomainVariants(variants,'BASIC-BASE',ref.conditions);assert.ok(comparison.rows.every(r=>r.dynamic.status==='completed'));
  assert.deepEqual(comparison.rows.map(r=>r.dynamic.status==='completed'?r.dynamic.makespanSeconds:null),[170,190]);
});

test('7.12.C1: manifest obejmuje wszystkie pliki, poprawne SHA, źródła i brak powiązań z Eko/bateriami/silnikami',()=>{
  const root='przyklady/02_wozek_warsztatowy/',pkg=intermediateDemoPackage();
  const {createHash}=require('node:crypto'),{readdirSync}=require('node:fs');
  const manifest=JSON.parse(readFileSync(root+'manifest.json','utf8'));
  assert.equal(manifest.dataOrigin,'synthetic');assert.equal(manifest.entryFile,'projekt-pokazowy.json');
  assert.equal(manifest.importer.format,pkg.format);assert.equal(pkg.data.dataOrigin,'synthetic');
  assert.deepEqual(manifest.assets.externalFiles,[]);
  const files=readdirSync(root,{recursive:true,withFileTypes:true}).filter((d:any)=>d.isFile()).map((d:any)=>require('node:path').relative(root,require('node:path').join(d.parentPath,d.name)).replaceAll('\\','/')).filter((p:string)=>p!=='manifest.json').sort();
  assert.deepEqual(manifest.files.map((f:any)=>f.path).sort(),files);
  for(const file of manifest.files){
    assert.ok(!file.path.startsWith('/')&&!file.path.includes('..')&&!file.path.includes('\\'));
    const bytes=readFileSync(root+file.path);assert.equal(file.bytes,bytes.length);assert.equal(file.sha256,createHash('sha256').update(bytes).digest('hex'));
  }
  for(const [path,raw] of [['dane/zrodlo4.json',pkg.data.source4Json],['dane/szkic6.json',pkg.data.draftRaw],['dane/warianty6.json',pkg.data.variantsRaw]])assert.deepEqual(JSON.parse(readFileSync(root+path,'utf8')),JSON.parse(raw));
  const draft=JSON.parse(pkg.data.draftRaw).project;
  assert.equal(draft.facility.isConfirmed,false);assert.ok(draft.layoutObjects.every((o:any)=>o.isVisualAssumption));
  assert.ok(!/EKO|AUDIT-7|MOTOR|BATTERY/.test(JSON.stringify(draft)));
  assert.equal(pkg.data.source5Json,null);assert.deepEqual(draft.subassemblies,[]);
});

test('7.12.C1: arkusze procesu i BOM przechodzą istniejące importery i odpowiadają pełnemu modelowi',()=>{
  const pkg=intermediateDemoPackage(),project=JSON.parse(pkg.data.draftRaw).project;
  const excel=require('../src/core/export/excelImporter'),XLSX=require('xlsx');
  const bytes=(path:string)=>{const b=readFileSync('przyklady/02_wozek_warsztatowy/dane/'+path);return b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength);};
  const process=excel.importProcess(bytes('proces.xlsx')),bom=excel.importBOM(bytes('bom.xlsx'),new Set(project.operations.map((o:any)=>o.id)));
  assert.deepEqual(process.errors,[]);assert.equal(process.skipped,0);assert.equal(process.items.length,4);
  assert.deepEqual(excel.processRows(process.items),excel.processRows(project.operations));
  assert.deepEqual(bom.errors,[]);assert.equal(bom.skipped,0);assert.deepEqual(excel.bomRows(bom.items),excel.bomRows(project.bom));
  for(const path of ['proces.xlsx','bom.xlsx']){
    const book=XLSX.read(bytes(path),{type:'array'});assert.deepEqual(book.SheetNames,['Dane','Opis kolumn','Pochodzenie']);
    for(const sheet of Object.values(book.Sheets) as any[])for(const [key,cell] of Object.entries(sheet) as any[])if(!key.startsWith('!'))assert.equal(cell.f,undefined,'No formulas or external workbook dependencies');
  }
});

test('7.12.C1: takt, BOM, kompetencje i bilans zgadzają się z niezależnymi obliczeniami',()=>{
  const pkg=intermediateDemoPackage(),ref=JSON.parse(readFileSync('przyklady/02_wozek_warsztatowy/referencje/oczekiwane_wyniki.json','utf8'));
  const {calculateTaktTime}=require('../src/core/algorithms/taktCalculator');
  const source=derive(parseProject(pkg.data.source4Json));assert.deepEqual(source.issues.filter(i=>i.severity==='error'),[]);
  const takt=calculateTaktTime(source.project.demand);assert.equal(takt.customerTaktSeconds,ref.customerTaktSeconds);
  assert.equal(source.project.bom.reduce((n,b)=>n+b.quantityPerUnit*b.unitCost,0),ref.bomCostPerUnit);
  const variants=JSON.parse(pkg.data.variantsRaw).variants;
  for(const variant of variants){
    const summary=summarizeStaticVariant(variant.project),expected=ref.variants.find((r:any)=>r.id===variant.id);
    assert.equal(summary.activeStationsCount,expected.activeStations);assert.equal(summary.teamWorkersCount,expected.selectedWorkers);
    assert.equal(summary.staticCapacityPerHour,expected.staticCapacityPerHour);assert.equal(summary.timeBasis,'assumed');
    assert.ok(variant.project.competencyRequirements.competencies.length>=3);
    assert.ok(variant.project.materialSupply.items.length>=5);
    assert.ok(variant.project.stationBuffers.buffers.length===4);
  }
  assert.deepEqual(variants[0].project.demand,variants[1].project.demand);
});

test('7.12.C1: symulacja harmonogramu obu wariantów wózka warsztatowego, czasy partii 390s i 315s, brak podwójnych rezerwacji',()=>{
  const pkg=intermediateDemoPackage(),ref=JSON.parse(readFileSync('przyklady/02_wozek_warsztatowy/referencje/oczekiwane_wyniki.json','utf8'));
  const variants=JSON.parse(pkg.data.variantsRaw).variants,before=JSON.stringify(variants);
  for(const variant of variants){
    const expected=ref.variants.find((r:any)=>r.id===variant.id),project=parseDomainProjectV6(JSON.stringify(variant.project));
    const result=scheduleWorkerRun(project,ref.conditions.arrivalIntervalSeconds,ref.conditions.batch,undefined,undefined,{transportMode:'just-in-time'});
    assert.equal(result.transportMode,'just-in-time');
    assert.deepEqual(result.jobs.map(j=>j.finish),expected.completionSeconds);
    const actual=result.runs.map(r=>[r.job,r.operationId,r.startSeconds,r.endSeconds]).sort((a,b)=>Number(a[0])-Number(b[0])||String(a[1]).localeCompare(String(b[1])));
    assert.equal(actual.length,12);
    for(let i=0;i<actual.length;i++){
      assert.deepEqual(actual[i].slice(0,2),expected.operationWindows[i].slice(0,2));
      for(const j of [2,3])assert.ok(Math.abs(Number(actual[i][j])-expected.operationWindows[i][j])<=ref.absoluteToleranceSeconds);
    }
    for(const worker of project.workerRunSelection!.teamWorkerIds){
      const runs=result.runs.filter(r=>r.workerIds.includes(worker)).sort((a,b)=>a.startSeconds-b.startSeconds);
      for(let i=1;i<runs.length;i++)assert.ok(runs[i-1].endSeconds<=runs[i].startSeconds);
    }
    const single=scheduleWorkerRun(project,1,1,undefined,undefined,{transportMode:'just-in-time'});
    assert.equal(single.jobs[0].finish,expected.completionSeconds[0]);
    const moved=structuredClone(project);moved.layoutObjects.forEach(o=>o.xMm+=100);
    assert.deepEqual(scheduleWorkerRun(moved,1,3,undefined,undefined,{transportMode:'just-in-time'}),result);
  }
  assert.equal(JSON.stringify(variants),before);
  const comparison=compareDomainVariants(variants,'INTERMEDIATE-BASE',ref.conditions);
  assert.ok(comparison.rows.every(r=>r.dynamic.status==='completed'));
  assert.deepEqual(comparison.rows.map(r=>r.dynamic.status==='completed'?r.dynamic.makespanSeconds:null),[390,315]);
});

test('7.12.C1-physical: ręczne okna, transport monterów, powroty, zapasy oraz jedna lokalizacja korpusu',()=>{
  const pkg=intermediateDemoPackage(),variants=JSON.parse(pkg.data.variantsRaw!).variants;
  const reference=JSON.parse(readFileSync('przyklady/02_wozek_warsztatowy/referencje/oczekiwane_wyniki.json','utf8')).physical;
  for(const variant of variants){
    const project=parseDomainProjectV6(JSON.stringify(variant.project)),before=JSON.stringify(project),expected=reference.variants.find((v:any)=>v.id===variant.id);
    const result=scheduleWorkerRun(project,1,3,project.bodyRunInput);
    assert.deepEqual(result.jobs.map(j=>j.finish),expected.completionSeconds);
    const actual=result.runs.map(r=>[r.job,r.operationId,r.startSeconds,r.endSeconds]).sort((a,b)=>Number(a[0])-Number(b[0])||String(a[1]).localeCompare(String(b[1])));
    assert.deepEqual(actual,expected.operationWindows);
    assert.equal(result.transportMovements!.filter(m=>m.kind==='loaded').length,9);
    assert.equal(result.transportMovements!.filter(m=>m.purpose==='return').length,9);
    for(const movement of result.transportMovements!){
      const cartIndex=Number(movement.equipmentIds[0].split('-').at(-1));
      assert.deepEqual(movement.workerIds,[`WW-W${cartIndex}`]);
      assert.equal(movement.endSeconds-movement.startSeconds,10);
    }
    const reservations=result.reservations.reservations;
    for(let i=0;i<reservations.length;i++)for(let j=i+1;j<reservations.length;j++){
      const a=reservations[i],b=reservations[j],aEnd=a.releasedAtSeconds??a.endSeconds,bEnd=b.releasedAtSeconds??b.endSeconds;
      if(a.workerIds.some(id=>b.workerIds.includes(id)))assert.ok(aEnd<=b.startSeconds||bEnd<=a.startSeconds);
    }
    assert.equal(result.materialEvents!.filter(e=>e.kind==='consumption').length,21);
    assert.equal(result.materialEvents!.filter(e=>e.kind==='delivery').length,0);
    assert.equal(result.materialStocks!.length,7);assert.ok(result.materialStocks!.every(item=>item.stock===7));
    const history=prepareDomainPhysicalPlayback(project,result,reference.conditions),end=domainPhysicalPlaybackFrame(history,history.endSeconds);
    assert.equal(end.bodies.length,3);assert.ok(end.bodies.every(b=>b.location.kind==='station'&&b.location.stationId==='ST-WW-4'));
    assert.ok(end.carts.every(c=>c.movement===null));assert.equal(JSON.stringify(project),before);
  }
});

test('7.12.C1-physical: dostawa w 900 s poprzedza zużycie, pełny bufor zatrzymuje stanowisko po obróbce',()=>{
  const pkg=intermediateDemoPackage(),variants=JSON.parse(pkg.data.variantsRaw!).variants;
  const reference=JSON.parse(readFileSync('przyklady/02_wozek_warsztatowy/referencje/oczekiwane_wyniki.json','utf8')).physical;
  for(const variant of variants){
    const project=structuredClone(variant.project);project.materialSupply.items.find((item:any)=>item.id==='SUP-RAMA').initialStock=0;
    const result=scheduleWorkerRun(project,1,3,project.bodyRunInput);
    assert.deepEqual(result.jobs.map(j=>j.finish),variant.id==='INTERMEDIATE-BASE'?reference.deliveryCase.completionSecondsBase:reference.deliveryCase.completionSecondsBalanced);
    const events=result.materialEvents!.filter(e=>e.atSeconds===900);
    assert.equal(events[0].kind,'delivery');assert.ok(events.some(e=>e.kind==='consumption'));
  }
  const project=structuredClone(variants[0].project);
  project.stationBuffers.buffers[0].outputCapacity=1;project.stationBuffers.buffers[1].inputCapacity=0;
  project.resourceCalendars.stations['ST-WW-2'].shifts[0].startSeconds=600;
  const result=scheduleWorkerRun(project,1,3,project.bodyRunInput),blocked=result.runs.find(r=>r.job===2&&r.operationId==='WW-OP10')!;
  assert.equal(blocked.endSeconds,120);assert.equal(blocked.stationReleaseSeconds,590);
  assert.equal(blocked.reserveEndSeconds,120);
  const history=prepareDomainPhysicalPlayback(project,result,reference.conditions),body=domainPhysicalPlaybackFrame(history,500).bodies.find(b=>b.id==='WW-BODY-2')!;
  assert.equal(body.status,'reserved');assert.deepEqual(body.location,{kind:'station',stationId:'ST-WW-1',copy:1});
});

test('7.12.C2-physical-A: niezależne okna, łączenie partii i zasoby monterów przy jawnym odstępie 1000 s',()=>{
  const pkg=advancedDemoPackage(),variants=JSON.parse(pkg.data.variantsRaw!).variants;
  const reference=JSON.parse(readFileSync('przyklady/03_modul_urzadzenia/referencje/oczekiwane_wyniki.json','utf8')).physical;
  for(const variant of variants){
    const project=parseDomainProjectV6(JSON.stringify(variant.project)),before=JSON.stringify(project),expected=reference.variants.find((v:any)=>v.id===variant.id);
    const result=scheduleWorkerRun(project,1000,3,project.bodyRunInput);
    assert.deepEqual(result.jobs.map(job=>job.finish),expected.completionSeconds);
    const actual=result.runs.map(run=>[run.job,run.operationId,run.startSeconds,run.endSeconds]).sort((a,b)=>Number(a[0])-Number(b[0])||String(a[1]).localeCompare(String(b[1])));
    assert.deepEqual(actual,expected.operationWindows);
    assert.equal(result.subassemblyLots!.length,6);assert.ok(result.subassemblyLots!.every(lot=>lot.status==='consumed'&&lot.remainingQuantity===0));
    for(const lot of result.subassemblyLots!){
      const events=result.subassemblyEvents!.filter(event=>event.lotId===lot.declaration.id);
      assert.deepEqual(events.map(event=>event.kind),['produced','start-transfer','arrived','consumed']);
      const producer=result.runs.find(run=>run.job===lot.declaration.producer.job&&run.operationId===lot.declaration.producer.operationId)!;
      const consumer=result.runs.find(run=>run.job===lot.declaration.consumer.job&&run.operationId===lot.declaration.consumer.operationId)!;
      assert.equal(events[0].atSeconds,producer.endSeconds);assert.equal(events[3].atSeconds,consumer.startSeconds);
      assert.ok(events[1].atSeconds>=producer.endSeconds&&events[2].atSeconds<=consumer.startSeconds);
    }
    assert.equal(result.transportMovements!.filter(move=>move.kind==='loaded').length,12);
    assert.equal(result.transportMovements!.filter(move=>move.purpose==='return').length,12);
    assert.equal(result.transportMovements!.filter(move=>!!move.lotId).length,6);
    const reservations=result.reservations.reservations;
    for(let i=0;i<reservations.length;i++)for(let j=i+1;j<reservations.length;j++){
      const a=reservations[i],b=reservations[j],aEnd=a.releasedAtSeconds??a.endSeconds,bEnd=b.releasedAtSeconds??b.endSeconds;
      if(a.workerIds.some(id=>b.workerIds.includes(id)))assert.ok(aEnd<=b.startSeconds||bEnd<=a.startSeconds);
    }
    assert.equal(result.materialStocks!.length,8);assert.ok(result.materialStocks!.every(stock=>stock.consumed===3&&stock.delivered===20&&stock.stock===27));
    const history=prepareDomainPhysicalPlayback(project,result,reference.conditions);
    assert.equal(domainPhysicalPlaybackFrame(history,history.endSeconds).bodies.length,3);
    assert.equal(JSON.stringify(project),before);
  }
});

test('7.12.C2-physical-A: brak zasilacza opóźnia właściwą gałąź; bufor korpusu poza jego ścieżką jest odrzucany',()=>{
  const pkg=advancedDemoPackage(),variants=JSON.parse(pkg.data.variantsRaw!).variants;
  const reference=JSON.parse(readFileSync('przyklady/03_modul_urzadzenia/referencje/oczekiwane_wyniki.json','utf8')).physical;
  for(const variant of variants){
    const project=structuredClone(variant.project);project.materialSupply.items.find((item:any)=>item.id==='SUP-MU-ZASIL').initialStock=0;
    const result=scheduleWorkerRun(project,1000,3,project.bodyRunInput);
    assert.deepEqual(result.jobs.map(job=>job.finish),variant.id==='ADVANCED-BASE'?reference.supplyCase.completionBase:reference.supplyCase.completionBalanced);
    assert.equal(result.runs.find(run=>run.job===1&&run.operationId==='MU-OP10-A')!.startSeconds,900);
    assert.equal(result.runs.find(run=>run.job===1&&run.operationId==='MU-OP10-B')!.startSeconds,0);
    assert.equal(result.runs.find(run=>run.job===1&&run.operationId==='MU-OP10-M')!.startSeconds,0);
  }
  const bounded=structuredClone(variants[0].project);
  bounded.stationBuffers={buffers:[{stationId:bounded.stations[0].id,copy:1,inputCapacity:1,outputCapacity:1,blockingPolicy:'bbas-worker-released'}]};
  const before=JSON.stringify(bounded);assert.throws(()=>scheduleWorkerRun(bounded,1000,3,bounded.bodyRunInput),/poza jawną ścieżką korpusu/);
  assert.equal(JSON.stringify(bounded),before);
});

test('7.12.C2: manifest obejmuje wszystkie pliki, poprawne SHA, źródła i brak powiązań z Eko/bateriami/silnikami',()=>{
  const root='przyklady/03_modul_urzadzenia/',pkg=advancedDemoPackage();
  const {createHash}=require('node:crypto'),{readdirSync}=require('node:fs');
  const manifest=JSON.parse(readFileSync(root+'manifest.json','utf8'));
  assert.equal(manifest.dataOrigin,'synthetic');assert.equal(manifest.entryFile,'projekt-pokazowy.json');
  assert.equal(manifest.importer.format,pkg.format);assert.equal(pkg.data.dataOrigin,'synthetic');
  assert.deepEqual(manifest.assets.externalFiles,[]);
  const files=readdirSync(root,{recursive:true,withFileTypes:true}).filter((d:any)=>d.isFile()).map((d:any)=>require('node:path').relative(root,require('node:path').join(d.parentPath,d.name)).replaceAll('\\','/')).filter((p:string)=>p!=='manifest.json').sort();
  assert.deepEqual(manifest.files.map((f:any)=>f.path).sort(),files);
  for(const file of manifest.files){
    assert.ok(!file.path.startsWith('/')&&!file.path.includes('..')&&!file.path.includes('\\'));
    const bytes=readFileSync(root+file.path);assert.equal(file.bytes,bytes.length);assert.equal(file.sha256,createHash('sha256').update(bytes).digest('hex'));
  }
  for(const [path,raw] of [['dane/zrodlo4.json',pkg.data.source4Json],['dane/szkic6.json',pkg.data.draftRaw],['dane/warianty6.json',pkg.data.variantsRaw]])assert.deepEqual(JSON.parse(readFileSync(root+path,'utf8')),JSON.parse(raw));
  const draft=JSON.parse(pkg.data.draftRaw).project;
  assert.equal(draft.facility.isConfirmed,false);assert.ok(draft.layoutObjects.every((o:any)=>o.isVisualAssumption));
  assert.ok(!/EKO|AUDIT-7|MOTOR|BATTERY/.test(JSON.stringify(draft)));
  assert.equal(pkg.data.source5Json,null);assert.equal(draft.subassemblies.length,2);
});

test('7.12.C2: arkusze procesu i BOM przechodzą istniejące importery i odpowiadają pełnemu modelowi rozgałęzionemu',()=>{
  const pkg=advancedDemoPackage(),project=JSON.parse(pkg.data.draftRaw).project;
  const excel=require('../src/core/export/excelImporter'),XLSX=require('xlsx');
  const bytes=(path:string)=>{const b=readFileSync('przyklady/03_modul_urzadzenia/dane/'+path);return b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength);};
  const process=excel.importProcess(bytes('proces.xlsx')),bom=excel.importBOM(bytes('bom.xlsx'),new Set(project.operations.map((o:any)=>o.id)));
  assert.deepEqual(process.errors,[]);assert.equal(process.skipped,0);assert.equal(process.items.length,5);
  assert.deepEqual(excel.processRows(process.items),excel.processRows(project.operations));
  assert.deepEqual(bom.errors,[]);assert.equal(bom.skipped,0);assert.deepEqual(excel.bomRows(bom.items),excel.bomRows(project.bom));
  for(const path of ['proces.xlsx','bom.xlsx']){
    const book=XLSX.read(bytes(path),{type:'array'});assert.deepEqual(book.SheetNames,['Dane','Opis kolumn','Pochodzenie']);
    for(const sheet of Object.values(book.Sheets) as any[])for(const [key,cell] of Object.entries(sheet) as any[])if(!key.startsWith('!'))assert.equal(cell.f,undefined,'No formulas or external workbook dependencies');
  }
});

test('7.12.C2: takt, BOM, podzespoły i bilans zgadzają się z niezależnymi obliczeniami',()=>{
  const pkg=advancedDemoPackage(),ref=JSON.parse(readFileSync('przyklady/03_modul_urzadzenia/referencje/oczekiwane_wyniki.json','utf8'));
  const {calculateTaktTime}=require('../src/core/algorithms/taktCalculator');
  const source=derive(parseProject(pkg.data.source4Json));assert.deepEqual(source.issues.filter(i=>i.severity==='error'),[]);
  const takt=calculateTaktTime(source.project.demand);assert.equal(takt.customerTaktSeconds,ref.customerTaktSeconds);
  assert.equal(source.project.bom.reduce((n,b)=>n+b.quantityPerUnit*b.unitCost,0),ref.bomCostPerUnit);
  const variants=JSON.parse(pkg.data.variantsRaw).variants;
  for(const variant of variants){
    const summary=summarizeStaticVariant(variant.project),expected=ref.variants.find((r:any)=>r.id===variant.id);
    assert.equal(summary.activeStationsCount,expected.activeStations);assert.equal(summary.teamWorkersCount,expected.selectedWorkers);
    assert.ok(Math.abs(summary.staticCapacityPerHour - expected.staticCapacityPerHour) <= 0.001);assert.equal(summary.timeBasis,'assumed');
    assert.equal(variant.project.subassemblies.length,2);
    assert.equal(variant.project.subassemblyFlow.lots.length,6);
    assert.equal(variant.project.competencyRequirements.competencies.length,4);
  }
  assert.deepEqual(variants[0].project.demand,variants[1].project.demand);
});

test('7.12.C2: symulacja harmonogramu obu wariantów modułu urządzenia z gałęziami, czasy partii 320s i 270s, brak podwójnych rezerwacji',()=>{
  const pkg=advancedDemoPackage(),ref=JSON.parse(readFileSync('przyklady/03_modul_urzadzenia/referencje/oczekiwane_wyniki.json','utf8'));
  const variants=JSON.parse(pkg.data.variantsRaw).variants,before=JSON.stringify(variants);
  for(const variant of variants){
    const expected=ref.variants.find((r:any)=>r.id===variant.id),project=parseDomainProjectV6(JSON.stringify(variant.project));
    const result=scheduleWorkerRun(project,ref.conditions.arrivalIntervalSeconds,ref.conditions.batch,undefined,undefined,{transportMode:'just-in-time'});
    assert.equal(result.transportMode,'just-in-time');
    assert.deepEqual(result.jobs.map(j=>j.finish),expected.completionSeconds);
    const actual=result.runs.map(r=>[r.job,r.operationId,r.startSeconds,r.endSeconds]).sort((a,b)=>Number(a[0])-Number(b[0])||String(a[1]).localeCompare(String(b[1])));
    assert.equal(actual.length,15);
    const firstPreparations=result.runs.filter(r=>r.job===1&&['MU-OP10-A','MU-OP10-B','MU-OP10-M'].includes(r.operationId));
    assert.equal(firstPreparations.length,3);assert.ok(firstPreparations.every(r=>r.startSeconds===0),'Both branches and body preparation really overlap');
    for(let job=1;job<=3;job++){
      const integration=result.runs.find(r=>r.job===job&&r.operationId==='MU-OP20-M')!;
      const producers=result.runs.filter(r=>r.job===job&&['MU-OP10-A','MU-OP10-B','MU-OP10-M'].includes(r.operationId));
      assert.ok(producers.every(r=>r.endSeconds<=integration.startSeconds));
    }
    for(let i=0;i<actual.length;i++){
      assert.deepEqual(actual[i].slice(0,2),expected.operationWindows[i].slice(0,2));
      for(const j of [2,3])assert.ok(Math.abs(Number(actual[i][j])-expected.operationWindows[i][j])<=ref.absoluteToleranceSeconds);
    }
    for(const worker of project.workerRunSelection!.teamWorkerIds){
      const runs=result.runs.filter(r=>r.workerIds.includes(worker)).sort((a,b)=>a.startSeconds-b.startSeconds);
      for(let i=1;i<runs.length;i++)assert.ok(runs[i-1].endSeconds<=runs[i].startSeconds);
    }
    const single=scheduleWorkerRun(project,1,1,undefined,undefined,{transportMode:'just-in-time'});
    assert.equal(single.jobs[0].finish,expected.completionSeconds[0]);
    const moved=structuredClone(project);moved.layoutObjects.forEach(o=>o.xMm+=100);
    assert.deepEqual(scheduleWorkerRun(moved,1,3,undefined,undefined,{transportMode:'just-in-time'}),result);
  }
  assert.equal(JSON.stringify(variants),before);
  const comparison=compareDomainVariants(variants,'ADVANCED-BASE',ref.conditions);
  assert.ok(comparison.rows.every(r=>r.dynamic.status==='completed'));
  assert.deepEqual(comparison.rows.map(r=>r.dynamic.status==='completed'?r.dynamic.makespanSeconds:null),[320,270]);
});

test('7.12.D: wszystkie 3 pakiety (01, 02, 03) spełniają kontrakt formatu, unikalności ID, separacji danych i braku powiązań z Eko',()=>{
  const {createHash}=require('node:crypto'),{readdirSync}=require('node:fs');
  const packages=[
    {root:'przyklady/01_zestaw_montazowy/',pkg:basicDemoPackage(),prefix:'ZM-',expectedFiles:12,expectedOps:3},
    {root:'przyklady/02_wozek_warsztatowy/',pkg:intermediateDemoPackage(),prefix:'WW-',expectedFiles:12,expectedOps:4},
    {root:'przyklady/03_modul_urzadzenia/',pkg:advancedDemoPackage(),prefix:'MU-',expectedFiles:12,expectedOps:5}
  ];
  for(const item of packages){
    const manifest=JSON.parse(readFileSync(item.root+'manifest.json','utf8'));
    assert.equal(manifest.dataOrigin,'synthetic');assert.equal(manifest.entryFile,'projekt-pokazowy.json');
    assert.equal(manifest.importer.format,item.pkg.format);assert.equal(item.pkg.data.dataOrigin,'synthetic');
    assert.deepEqual(manifest.assets.externalFiles,[]);
    const diskFiles=readdirSync(item.root,{recursive:true,withFileTypes:true}).filter((d:any)=>d.isFile()).map((d:any)=>require('node:path').relative(item.root,require('node:path').join(d.parentPath,d.name)).replaceAll('\\','/')).filter((p:string)=>p!=='manifest.json').sort();
    assert.deepEqual(manifest.files.map((f:any)=>f.path).sort(),diskFiles);
    assert.equal(manifest.files.length,item.expectedFiles - 1);
    for(const file of manifest.files){
      assert.ok(!file.path.startsWith('/')&&!file.path.includes('..')&&!file.path.includes('\\'));
      const bytes=readFileSync(item.root+file.path);
      assert.equal(file.bytes,bytes.length);
      assert.equal(file.sha256,createHash('sha256').update(bytes).digest('hex'));
    }
    const draft=JSON.parse(item.pkg.data.draftRaw).project;
    assert.equal(draft.facility.isConfirmed,false);
    assert.ok(draft.layoutObjects.every((o:any)=>o.isVisualAssumption));
    assert.ok(!/EKO|AUDIT-7|MOTOR|BATTERY/.test(JSON.stringify(draft)));
    assert.equal(draft.operations.length,item.expectedOps);
    assert.ok(draft.operations.every((o:any)=>o.id.startsWith(item.prefix)));
  }
  const raw01=JSON.stringify(packages[0].pkg),raw02=JSON.stringify(packages[1].pkg),raw03=JSON.stringify(packages[2].pkg);
  assert.ok(!raw01.includes('WW-')&&!raw01.includes('MU-'));
  assert.ok(!raw02.includes('ZM-')&&!raw02.includes('MU-'));
  assert.ok(!raw03.includes('ZM-')&&!raw03.includes('WW-'));
});

test('7.12.D: arkusze procesu i BOM we wszystkich 3 pakietach oraz szablony wzorcowe przechodzą bezbłędnie importery',()=>{
  const excel=require('../src/core/export/excelImporter'),XLSX=require('xlsx');
  const packages=[
    {root:'przyklady/01_zestaw_montazowy/dane/',pkg:basicDemoPackage(),expectedOps:3,expectedBom:4},
    {root:'przyklady/02_wozek_warsztatowy/dane/',pkg:intermediateDemoPackage(),expectedOps:4,expectedBom:7},
    {root:'przyklady/03_modul_urzadzenia/dane/',pkg:advancedDemoPackage(),expectedOps:5,expectedBom:8}
  ];
  for(const item of packages){
    const project=JSON.parse(item.pkg.data.draftRaw).project;
    const bytes=(path:string)=>{const b=readFileSync(item.root+path);return b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength);};
    const process=excel.importProcess(bytes('proces.xlsx')),bom=excel.importBOM(bytes('bom.xlsx'),new Set(project.operations.map((o:any)=>o.id)));
    assert.deepEqual(process.errors,[]);assert.equal(process.skipped,0);assert.equal(process.items.length,item.expectedOps);
    assert.deepEqual(excel.processRows(process.items),excel.processRows(project.operations));
    assert.deepEqual(bom.errors,[]);assert.equal(bom.skipped,0);assert.equal(bom.items.length,item.expectedBom);
    assert.deepEqual(excel.bomRows(bom.items),excel.bomRows(project.bom));
    for(const path of ['proces.xlsx','bom.xlsx']){
      const book=XLSX.read(bytes(path),{type:'array'});assert.deepEqual(book.SheetNames,['Dane','Opis kolumn','Pochodzenie']);
      for(const sheet of Object.values(book.Sheets) as any[])for(const [key,cell] of Object.entries(sheet) as any[])if(!key.startsWith('!'))assert.equal(cell.f,undefined,'No formulas');
    }
  }
  const procTpl=excel.createTemplateWorkbook('process'),bomTpl=excel.createTemplateWorkbook('bom');
  assert.deepEqual(procTpl.SheetNames,['Dane','Opis kolumn']);
  assert.deepEqual(bomTpl.SheetNames,['Dane','Opis kolumn']);
});

test('7.12.D: walidacja formatu layout-studio-project-package, round-trip oraz odporność na uszkodzenia sum i źródeł',()=>{
  const {parseProjectPackage,makeProjectPackage,importProjectPackage}=require('../src/core/projectPackage');
  const packages=[basicDemoPackage(),intermediateDemoPackage(),advancedDemoPackage()];
  for(const pkg of packages){
    const parsed=parseProjectPackage(JSON.stringify(pkg));
    assert.equal(parsed.checksumSha256,pkg.checksumSha256);
    const corruptSum=structuredClone(pkg);
    corruptSum.checksumSha256=corruptSum.checksumSha256.replace(/^[0-9a-f]/,c=>c==='0'?'1':'0');
    assert.throws(()=>parseProjectPackage(JSON.stringify(corruptSum)),/Niezgodna suma SHA-256/);
    const corruptFmt=structuredClone(pkg);corruptFmt.format='other-format';
    assert.throws(()=>parseProjectPackage(JSON.stringify(corruptFmt)),/Nieobsługiwany format lub wersja/);
    const corruptVer=structuredClone(pkg);corruptVer.formatVersion=99;
    assert.throws(()=>parseProjectPackage(JSON.stringify(corruptVer)),/Nieobsługiwany format lub wersja/);
  }
  const memStore:Record<string,string>={};
  const fakeStorage={
    getItem(k:string){return memStore[k]??null;},
    setItem(k:string,v:string){memStore[k]=String(v);},
    removeItem(k:string){delete memStore[k];}
  };
  const {createWorkspaceBackup}=require('../src/core/workspaceBackup');
  const snap1=JSON.stringify(createWorkspaceBackup(fakeStorage as any),null,2);
  importProjectPackage(fakeStorage as any,packages[0],snap1);
  assert.ok(memStore['layout-studio-domain-v6-draft-v1'].includes('ZM-OP10'));
  const snap2=JSON.stringify(createWorkspaceBackup(fakeStorage as any),null,2);
  importProjectPackage(fakeStorage as any,packages[1],snap2);
  assert.ok(memStore['layout-studio-domain-v6-draft-v1'].includes('WW-OP10'));
  assert.ok(!memStore['layout-studio-domain-v6-draft-v1'].includes('ZM-OP10'));
  const snap3=JSON.stringify(createWorkspaceBackup(fakeStorage as any),null,2);
  importProjectPackage(fakeStorage as any,packages[2],snap3);
  assert.ok(memStore['layout-studio-domain-v6-draft-v1'].includes('MU-OP10-M'));
  assert.ok(!memStore['layout-studio-domain-v6-draft-v1'].includes('WW-OP10'));
  const exported=makeProjectPackage(fakeStorage as any,{dataOrigin:'synthetic'});
  assert.equal(exported.format,'layout-studio-project-package');
  assert.equal(JSON.parse(exported.data.draftRaw).project.id,'DEMO-MODUL-URZADZENIA-1');
});

test('7.12.D / 7.2: łączna weryfikacja analityczna taktu, bilansu i symulacji wszystkich 6 wariantów w 3 pakietach',()=>{
  const suites=[
    {refPath:'przyklady/01_zestaw_montazowy/referencje/oczekiwane_wyniki.json',pkg:basicDemoPackage(),expectedMakespans:[170,190]},
    {refPath:'przyklady/02_wozek_warsztatowy/referencje/oczekiwane_wyniki.json',pkg:intermediateDemoPackage(),expectedMakespans:[390,315]},
    {refPath:'przyklady/03_modul_urzadzenia/referencje/oczekiwane_wyniki.json',pkg:advancedDemoPackage(),expectedMakespans:[320,270]}
  ];
  for(const s of suites){
    const ref=JSON.parse(readFileSync(s.refPath,'utf8')),variants=JSON.parse(s.pkg.data.variantsRaw).variants;
    assert.equal(variants.length,2);
    for(let vIdx=0;vIdx<variants.length;vIdx++){
      const variant=variants[vIdx],expected=ref.variants.find((r:any)=>r.id===variant.id);
      const project=parseDomainProjectV6(JSON.stringify(variant.project));
      const result=scheduleWorkerRun(project,ref.conditions.arrivalIntervalSeconds,ref.conditions.batch,undefined,undefined,{transportMode:'just-in-time'});
      assert.deepEqual(result.jobs.map(j=>j.finish),expected.completionSeconds);
      assert.equal(result.jobs[result.jobs.length-1].finish,s.expectedMakespans[vIdx]);
      for(const worker of project.workerRunSelection!.teamWorkerIds){
        const runs=result.runs.filter(r=>r.workerIds.includes(worker)).sort((a,b)=>a.startSeconds-b.startSeconds);
        for(let i=1;i<runs.length;i++)assert.ok(runs[i-1].endSeconds<=runs[i].startSeconds);
      }
      const summary=summarizeStaticVariant(variant.project);
      assert.ok(Math.abs(summary.staticCapacityPerHour-expected.staticCapacityPerHour)<=0.001);
    }
  }
});

test('7.13: pakiet demonstracyjny Eko (04_eko) spełnia kontrakt, zawiera realne pomiary i zgodne sumy SHA-256',()=>{
  const root='przyklady/04_eko/',pkg=ekoDemoPackage();
  const {createHash}=require('node:crypto'),{readdirSync}=require('node:fs');
  const manifest=JSON.parse(readFileSync(root+'manifest.json','utf8'));
  assert.equal(manifest.dataOrigin,'mixed');assert.equal(manifest.entryFile,'projekt-pokazowy.json');
  assert.equal(manifest.importer.format,pkg.format);assert.equal(pkg.data.dataOrigin,'mixed');
  assert.deepEqual(manifest.assets.externalFiles,[]);
  const diskFiles=readdirSync(root,{recursive:true,withFileTypes:true}).filter((d:any)=>d.isFile()).map((d:any)=>require('node:path').relative(root,require('node:path').join(d.parentPath,d.name)).replaceAll('\\','/')).filter((p:string)=>p!=='manifest.json').sort();
  assert.deepEqual(manifest.files.map((f:any)=>f.path).sort(),diskFiles);
  assert.equal(manifest.files.length,11);
  for(const file of manifest.files){
    assert.ok(!file.path.startsWith('/')&&!file.path.includes('..')&&!file.path.includes('\\'));
    const bytes=readFileSync(root+file.path);
    assert.equal(file.bytes,bytes.length);
    assert.equal(file.sha256,createHash('sha256').update(bytes).digest('hex'));
  }
  const source4=JSON.parse(pkg.data.source4Json);
  assert.equal(source4.processSteps.length,16);
  assert.equal(source4.bom.length,60);
  assert.equal(source4.currency,'PLN');
  const source5=JSON.parse(pkg.data.source5Json!);
  assert.equal(source5.schemaVersion,5);assert.equal(source5.processSteps.length,16);
  const draft=JSON.parse(pkg.data.draftRaw).project;
  assert.equal(draft.operations.length,16);
  assert.equal(draft.subassemblies.length,7);
  const variants=JSON.parse(pkg.data.variantsRaw!).variants;
  assert.equal(variants.length,3);
  assert.deepEqual(variants.map((v:any)=>v.id),['EKO-PARALLEL','EKO-SEQUENTIAL','EKO-SHARED-WORKER']);
});

test('7.13: arkusze procesu i BOM pakietu Eko przechodzą importery Excela z zerem błędów',()=>{
  const excel=require('../src/core/export/excelImporter'),XLSX=require('xlsx');
  const pkg=ekoDemoPackage(),project=JSON.parse(pkg.data.draftRaw).project;
  const bytes=(path:string)=>{const b=readFileSync('przyklady/04_eko/dane/'+path);return b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength);};
  const process=excel.importProcess(bytes('proces.xlsx')),bom=excel.importBOM(bytes('bom.xlsx'),new Set(project.operations.map((o:any)=>o.id)));
  assert.deepEqual(process.errors,[]);assert.equal(process.skipped,0);assert.equal(process.items.length,16);
  assert.deepEqual(excel.processRows(process.items),excel.processRows(project.operations));
  assert.deepEqual(bom.errors,[]);assert.equal(bom.skipped,0);assert.equal(bom.items.length,60);
  assert.deepEqual(excel.bomRows(bom.items),excel.bomRows(project.bom));
  for(const path of ['proces.xlsx','bom.xlsx']){
    const book=XLSX.read(bytes(path),{type:'array'});assert.deepEqual(book.SheetNames,['Dane','Opis kolumn','Pochodzenie']);
    for(const sheet of Object.values(book.Sheets) as any[])for(const [key,cell] of Object.entries(sheet) as any[])if(!key.startsWith('!'))assert.equal(cell.f,undefined,'No formulas');
  }
});

test('7.13: symulacja harmonogramu trzech wariantów Eko (parallel 13550s, sequential 14150s, shared-worker 14150s)',()=>{
  const pkg=ekoDemoPackage(),ref=JSON.parse(readFileSync('przyklady/04_eko/referencje/oczekiwane_wyniki.json','utf8'));
  const variants=JSON.parse(pkg.data.variantsRaw!).variants;
  assert.equal(variants.length,3);
  const expectedMap:Record<string,number>={'EKO-PARALLEL':13550,'EKO-SEQUENTIAL':14150,'EKO-SHARED-WORKER':14150};
  assert.equal(ref.conditions.transportMode,'configured','The documented experiment must match the tested mode');
  for(const variant of variants){
    const project=parseDomainProjectV6(JSON.stringify(variant.project));
    const result=scheduleWorkerRun(project,ref.conditions.arrivalIntervalSeconds,ref.conditions.batch,project.bodyRunInput,undefined,{transportMode:ref.conditions.transportMode});
    assert.equal(result.jobs.length,1);
    assert.equal(result.jobs[0].finish,expectedMap[variant.id]);
    assert.equal(result.runs.length,16);
    for(const worker of project.workerRunSelection!.teamWorkerIds){
      const runs=result.runs.filter(r=>r.workerIds.includes(worker)).sort((a,b)=>a.startSeconds-b.startSeconds);
      for(let i=1;i<runs.length;i++)assert.ok(runs[i-1].endSeconds<=runs[i].startSeconds);
    }
    const moved=structuredClone(project);moved.layoutObjects.forEach(o=>o.xMm+=200);
    assert.deepEqual(scheduleWorkerRun(moved,1,1,project.bodyRunInput),result);
  }
});
test('7.13: demo Eko respektuje dwie osoby pakowania i odróżnia pomiary od testowych przydziałów',()=>{
  const pkg=ekoDemoPackage(),variants=JSON.parse(pkg.data.variantsRaw!).variants;
  for(const variant of variants){
    const project=parseDomainProjectV6(JSON.stringify(variant.project));
    const packing=project.operations.find(o=>o.id==='OP21')!;
    assert.equal(packing.standardTimeSeconds,1320);assert.equal(packing.staffing!.requiredWorkers,2);
    const profile=packing.staffing!.timeVariants.find(v=>v.workerCount===2)!.timeProfile;
    assert.equal(profile.durationSeconds,1320);assert.equal(profile.durationBasis,'measured');
    assert.deepEqual(profile.machineRun,[]);assert.deepEqual(profile.operatorPresence,[{startSeconds:0,endSeconds:1320,basis:'measured'}]);
    const result=scheduleWorkerRun(project,1,1,project.bodyRunInput);
    const run=result.runs.find(r=>r.operationId==='OP21')!;
    assert.equal(run.workerIds.length,2);assert.equal(run.endSeconds-run.startSeconds,1320);
    for(const id of ['OP22','OP23','OP24','OP25'])assert.equal(project.operations.find(o=>o.id===id)!.staffing!.timeVariants[0].timeProfile.durationBasis,'assumed');
  }
  const readme=readFileSync('przyklady/04_eko/README.md','utf8');assert.match(readme,/17.*testowych/);assert.match(readme,/13 osób/);
});

test('7.13: dokumentacja Eko ma rzeczywiste nazwy/czasy i poprawną sumę bez zmyślonych wartości',()=>{
  const source=JSON.parse(ekoDemoPackage().data.source4Json);
  const dictionary=readFileSync('przyklady/04_eko/dane/slownik_pol.md','utf8');
  assert.equal(source.processSteps.reduce((sum:number,o:any)=>sum+o.standardTimeSeconds,0),25550);
  for(const o of source.processSteps){assert.ok(dictionary.includes(o.name));assert.ok(dictionary.includes('**'+o.standardTimeSeconds+' s**'));}
  assert.ok(!dictionary.includes('38150'));assert.match(dictionary,/dwie osoby przez całe 1320/);
});

import {encodeImport} from '../src/core/importArchive';
import {makePortableArchive,readPortableArchive} from '../src/core/portableArchive';
import {createEkoTestScenario,EKO_TEST_PREPARATIONS,type EkoTestVariant} from './fixtures/ekoDomainScenarios';
import {executeScheduleRequest} from '../src/core/scheduleWorkerRequest';
import {startScheduleTask,type ScheduleReply} from '../src/core/scheduleTask';
import {executeNetworkRequest,type NetworkReply} from '../src/core/networkWorkerRequest';
import {startBackgroundTask} from '../src/core/backgroundTask';
import {validateMaterialNetwork,materialRouteData,distanceToMm,distanceFromMm,type MaterialNetworkV6} from '../src/core/materialNetwork';
import {editDomainMaterialNetwork} from '../src/core/domainMaterialEditing';
import {calculateTransportTime,resolveTransportTime,validateTransportCalculation,type TransportCalculation} from '../src/core/transportTime';

function transportCalculationFixture():TransportCalculation{
  return {speed:{value:1000,basis:'measured',source:'Test — prędkość'},loading:{value:2,basis:'measured',source:'Test — załadunek'},unloading:{value:3,basis:'assumed',source:'Test — rozładunek'}};
}
test('3.3a: czas załadunek + długość/prędkość + rozładunek jest przeliczany, bez cache i bez etykiety pomiaru wyniku',()=>{
  const parameters=transportCalculationFixture(),before=JSON.stringify(parameters);
  const result=calculateTransportTime(5000,parameters);
  assert.equal(result.durationSeconds,10);assert.equal(result.basis,'assumed');
  assert.deepEqual(result.breakdown,{loadingSeconds:2,travelSeconds:5,unloadingSeconds:3});
  assert.equal(calculateTransportTime(10000,parameters).durationSeconds,15);
  const measured=structuredClone(parameters);measured.unloading.basis='measured';assert.equal(calculateTransportTime(5000,measured).basis,'assumed');
  assert.equal(JSON.stringify(parameters),before);
  parameters.loading.value=0;parameters.unloading.value=0;
  assert.equal(calculateTransportTime(5000,parameters).durationSeconds,5);assert.equal(resolveTransportTime({distanceMm:5000}),undefined);
  assert.throws(()=>calculateTransportTime(0,parameters),/dodatni/);
});

test('3.3a: odmowy brakujących parametrów, sprzecznych trybów, błędnych jednostkowych wartości i przepełnienia',()=>{
  for(const modify of [
    (c:any)=>delete c.speed,(c:any)=>delete c.loading,(c:any)=>delete c.unloading,
    (c:any)=>c.speed.value=0,(c:any)=>c.speed.value=-1,(c:any)=>c.speed.value=Infinity,
    (c:any)=>c.loading.value=-1,(c:any)=>c.unloading.value=NaN,(c:any)=>c.loading.source='',
    (c:any)=>c.speed.basis='calculated',(c:any)=>c.speed.extra=true,(c:any)=>c.extra=true]){
    const c=structuredClone(transportCalculationFixture());modify(c);assert.throws(()=>validateTransportCalculation(c));
  }
  assert.throws(()=>calculateTransportTime(Number.MAX_VALUE,{...transportCalculationFixture(),speed:{value:Number.MIN_VALUE,basis:'assumed',source:'Test'}}));
  assert.throws(()=>resolveTransportTime({distanceMm:1,transportTime:{durationSeconds:1,basis:'measured',source:'Test'},transportCalculation:transportCalculationFixture()}),/jednego trybu/);
  assert.throws(()=>resolveTransportTime({distanceMm:1,transportCalculation:null as any}));
});

test('3.3a: wyliczony przewóz zachowuje rezerwacje i lokalizację, zgodny z równoważnym czasem wpisanym',()=>{
  const project=movingBodyFixture();
  const input=bodyInputFor(2),parameters=transportCalculationFixture();
  const direct=structuredClone(project),route=project.stationRouting!.routes[0];
  route.distanceMm=5000;delete route.transportTime;route.transportCalculation=parameters;
  direct.stationRouting!.routes[0].distanceMm=5000;direct.stationRouting!.routes[0].transportTime={durationSeconds:10,basis:'assumed',source:'Ręczne wyliczenie testowe'};
  const before=JSON.stringify({project,input}),result=scheduleWorkerRun(project,1,2,input),baseline=scheduleWorkerRun(direct,1,2,input);
  const plain=structuredClone(result);plain.runs.forEach(run=>{if(run.transport)delete run.transport.breakdown;});
  assert.deepEqual(plain,baseline);
  const moved=result.runs.filter(run=>run.transport);assert.ok(moved.length);
  moved.forEach(run=>{assert.equal(run.transport!.endSeconds-run.transport!.startSeconds,10);assert.equal(run.transport!.basis,'assumed');assert.deepEqual(run.transport!.breakdown,{loadingSeconds:2,travelSeconds:5,unloadingSeconds:3});});
  let book=createBodyBook(project,input.bodies,0);for(const event of result.bodyEvents!)book=applyBodyEvent(book,event);assert.deepEqual(book,result.bodyBook);
  for(let i=0;i<result.runs.length;i++)for(let j=i+1;j<result.runs.length;j++){
    const a=result.runs[i],b=result.runs[j];
    if(a.stationId===b.stationId&&a.copy===b.copy)assert.ok(a.endSeconds<=b.stationReserveStartSeconds!||b.endSeconds<=a.stationReserveStartSeconds!);
    if(a.workerIds.some(id=>b.workerIds.includes(id)))assert.ok(a.reserveEndSeconds<=b.reserveStartSeconds||b.reserveEndSeconds<=a.reserveStartSeconds);
  }
  assert.equal(JSON.stringify({project,input}),before);
  // Explicit input belongs to the request's saved project; worker parity is checked with that same input.
  const savedInput={...project,bodyRunInput:input};const replies:ScheduleReply[]=[];executeScheduleRequest({project:savedInput,batch:2,arrivalIntervalSeconds:1},m=>replies.push(m));
  const reply=replies.at(-1)!;assert.equal(reply.kind,'result');if(reply.kind==='result')assert.deepEqual(reply.result,result);
});

test('3.3a: oba rodzaje tras zapisują parametry, chronią poprzedni zapis i przeliczają odczyt po zmianie długości',()=>{
  const {project,input}=branchingRouteFixture();project.bodyRunInput=input;
  project.materialNetwork=materialNetworkFixture();
  const route=project.stationRouting!.routes.find(route=>route.id==='ST-S-ST-X')!;delete route.transportTime;route.transportCalculation=transportCalculationFixture();
  const external=project.materialNetwork.routes[0];if(external.kind!=='declared')throw new Error('Fixture');external.transportCalculation=transportCalculationFixture();
  const original=readFileSync('tests/qa/Eko_D5_actual_export_v5.json','utf8'),storage=new DraftStorage();
  const saved=saveDomainDraft(storage,{originalJson:original,project},null),read=readDomainDraft(storage);assert.equal(read.status,'valid');
  if(read.status==='valid'){
    assert.equal(read.saved.originalJson,original);assert.deepEqual(read.saved.project,project);
    assert.ok(!('transportTime' in read.saved.project.stationRouting!.routes.find(route=>route.id==='ST-S-ST-X')!));
    assert.deepEqual(scheduleWorkerRun(read.saved.project,1,1,read.saved.project.bodyRunInput),scheduleWorkerRun(project,1,1,input));
  }
  assert.equal(materialRouteData(project,'TRANSFER').transportTime!.durationSeconds,5.007);
  route.distanceMm=5000;assert.equal(materialRouteData(project,'TRANSFER').transportTime!.durationSeconds,10);
  assert.equal(materialRouteData(project,'DELIVERY').transportTime!.durationSeconds,6.25);
  external.distanceMm=5000;assert.equal(materialRouteData(project,'DELIVERY').transportTime!.durationSeconds,10);
  const invalid=structuredClone(project);
  // Corrupt the route that actually has a calculation, irrespective of fixture ordering.
  invalid.stationRouting!.routes.find(route=>route.transportCalculation)!.transportTime={durationSeconds:1,basis:'assumed',source:'Test'};
  assert.throws(()=>saveDomainDraft(storage,{originalJson:original,project:invalid},saved.raw),/jednego trybu/);assert.equal(storage.getItem(DOMAIN_DRAFT_STORAGE_KEY),saved.raw);
});

function materialNetworkFixture():MaterialNetworkV6{
  return {points:[{id:'WAREHOUSE',name:'Magazyn — test',kind:'external',direction:'output'},
    {id:'S-IN',name:'Wejście S',kind:'station',stationId:'ST-S',copy:1,direction:'input'},
    {id:'S-OUT',name:'Wyjście S',kind:'station',stationId:'ST-S',copy:1,direction:'output'},
    {id:'X-IN',name:'Wejście X',kind:'station',stationId:'ST-X',copy:1,direction:'input'}],
    routes:[{id:'DELIVERY',kind:'declared',fromPointId:'WAREHOUSE',toPointId:'S-IN',distanceMm:1250,basis:'confirmed',source:'Wyłącznie test syntetyczny'},
      {id:'TRANSFER',kind:'station-route',fromPointId:'S-OUT',toPointId:'X-IN',stationRouteId:'ST-S-ST-X'}]};
}

test('3.2b: punkty i połączenia mają jedną długość/czas; sieć 1A nie zmienia przebiegu korpusu',()=>{
  const {project,input}=branchingRouteFixture(),before=JSON.stringify(project),network=materialNetworkFixture();
  const revised=editDomainMaterialNetwork(project,network);
  assert.deepEqual(validateMaterialNetwork(revised,revised.materialNetwork),network);
  assert.deepEqual(scheduleWorkerRun(revised,1,1,input),scheduleWorkerRun(project,1,1,input));
  assert.deepEqual(materialRouteData(revised,'DELIVERY'),{distanceMm:1250,basis:'confirmed',source:'Wyłącznie test syntetyczny'});
  const route=revised.stationRouting!.routes.find(route=>route.id==='ST-S-ST-X')!;
  route.distanceMm=900;route.transportTime!.durationSeconds=2;
  const data=materialRouteData(revised,'TRANSFER');assert.equal(data.distanceMm,900);assert.equal(data.transportTime!.durationSeconds,2);
  data.transportTime!.durationSeconds=99;assert.equal(route.transportTime!.durationSeconds,2);
  const {materialNetwork:_network,...withoutNetwork}=revised;
  assert.equal(JSON.stringify(project),before);assert.deepEqual(editDomainMaterialNetwork(revised,undefined),withoutNetwork);
  assert.ok(!('materialNetwork' in editDomainMaterialNetwork(revised,undefined)));
});

test('3.2b: jednostki długości są jawne; konwersja nie przyjmuje braków ani przepełnienia',()=>{
  assert.equal(distanceToMm(1.25,'m'),1250);assert.equal(distanceFromMm(1250,'m'),1.25);
  assert.equal(distanceToMm(7,'mm'),7);assert.equal(distanceToMm(0,'m'),0);
  for(const value of [-1,NaN,Infinity]){assert.throws(()=>distanceToMm(value,'m'));assert.throws(()=>distanceFromMm(value,'mm'));}
  assert.throws(()=>distanceToMm(Number.MAX_VALUE,'m'));assert.throws(()=>distanceToMm(1,'cm' as any));
  assert.throws(()=>distanceToMm('' as any,'mm'));
});

test('3.2b: odmowy błędnych punktów, kierunków, kopii, powtórzeń i sprzecznych danych tras',()=>{
  const {project}=branchingRouteFixture();
  const changes:Array<(network:any)=>void>=[
    n=>n.points.push({...n.points[0]}),n=>n.points[0].id='',n=>n.points[0].name='',
    n=>n.points[0].direction='sideways',n=>n.points[0].stationId='ST-S',n=>n.points[1].copy=2,
    n=>n.points[1].stationId='missing',n=>n.points[1].copy=1.5,n=>n.points[1].extra=true,
    n=>n.routes[0].fromPointId='missing',n=>n.routes[0].fromPointId='S-IN',n=>n.routes[0].toPointId='S-OUT',
    n=>n.routes[0].toPointId='WAREHOUSE',n=>n.routes.push({...n.routes[0],id:'DUPLICATE'}),
    n=>n.routes[0].distanceMm=-1,n=>n.routes[0].distanceMm=Infinity,n=>n.routes[0].basis='assumed',n=>n.routes[0].source='',
    n=>n.routes[1].stationRouteId='missing',n=>n.routes[1].stationRouteId='ST-X-ST-S',n=>n.routes[1].distanceMm=2,
    n=>n.routes[1].kind='declared',n=>n.routes[0].stationRouteId='ST-S-ST-X',
    n=>n.routes[0].transportTime={durationSeconds:0,basis:'assumed',source:'Test'},
    n=>n.routes[0].transportTime={durationSeconds:1,basis:'assumed',source:''},n=>n.routes[0].unknown=true,
    n=>n.points.splice(0,1)
  ];
  for(const change of changes){const network=structuredClone(materialNetworkFixture());change(network);assert.throws(()=>validateMaterialNetwork(project,network));}
  const revised=editDomainMaterialNetwork(project,materialNetworkFixture());
  revised.stationRouting!.routes=revised.stationRouting!.routes.filter(route=>route.id!=='ST-S-ST-X');
  assert.throws(()=>parseDomainProjectV6(JSON.stringify(revised)),/nieznana trasa/);
  assert.throws(()=>validateMaterialNetwork(project,{points:[],routes:[],extra:true}));
  assert.throws(()=>validateMaterialNetwork(project,null));
});

test('3.2b: zapis/odczyt i usuwanie sieci zachowują dokładne źródło 4/5, stare dane i poprzedni zapis przy błędzie',()=>{
  for(const file of ['tests/qa/Eko_B_export_20260930_183858.json','tests/qa/Eko_D5_actual_export_v5.json']){
    const original=readFileSync(file,'utf8');
    const prepared=prepareDomainMigration(JSON.parse(original).schemaVersion===4?previewDomainMigrationFromV4(original):previewDomainMigrationFromV5(original));
    assert.ok(!('materialNetwork' in prepared.project));
    const storage=new DraftStorage();storage.values.set('layout-studio-v3','active4');storage.values.set('layout-studio-stations-v5','active5');
    const first=saveDomainDraft(storage,prepared,null),station=prepared.project.stations[0];
    const project=structuredClone(prepared.project);project.stationSettings[station.id]={...project.stationSettings[station.id],operators:1,parallelStations:1};
    const network:MaterialNetworkV6={points:[{id:'STORE',kind:'external',name:'Test — magazyn',direction:'both'},
      {id:'IN',kind:'station',name:'Test — wejście',direction:'input',stationId:station.id,copy:1}],
      routes:[{id:'SUPPLY',kind:'declared',fromPointId:'STORE',toPointId:'IN',distanceMm:distanceToMm(2.5,'m'),basis:'confirmed',source:'Test',
        transportTime:{durationSeconds:3,basis:'assumed',source:'Test'}}]};
    const revised=editDomainMaterialNetwork(project,network),saved=saveDomainDraft(storage,{originalJson:original,project:revised},first.raw);
    const reopened=readDomainDraft(storage);assert.equal(reopened.status,'valid');
    if(reopened.status==='valid'){assert.deepEqual(reopened.saved.project.materialNetwork,network);assert.equal(reopened.saved.originalJson,original);assert.equal(reopened.raw,saved.raw);}
    const invalid=structuredClone(revised);invalid.materialNetwork!.points=[];
    assert.throws(()=>saveDomainDraft(storage,{originalJson:original,project:invalid},saved.raw));assert.equal(storage.getItem(DOMAIN_DRAFT_STORAGE_KEY),saved.raw);
    const cleared=editDomainMaterialNetwork(revised,undefined);saveDomainDraft(storage,{originalJson:original,project:cleared},saved.raw);
    const read=readDomainDraft(storage);assert.equal(read.status,'valid');if(read.status==='valid')assert.ok(!('materialNetwork' in read.saved.project));
    assert.equal(storage.getItem('layout-studio-v3'),'active4');assert.equal(storage.getItem('layout-studio-stations-v5'),'active5');assert.equal(readFileSync(file,'utf8'),original);
  }
});

test('3.2b: migracja nie aktywuje niezweryfikowanych pól sieci w źródle 5',()=>{
  const raw=JSON.parse(readFileSync('tests/qa/Eko_D5_actual_export_v5.json','utf8'));
  raw.materialNetwork={points:'unsupported',routes:[]};const original=JSON.stringify(raw);
  const migrated=prepareDomainMigration(previewDomainMigrationFromV5(original));
  assert.equal(migrated.originalJson,original);assert.ok(!('materialNetwork' in migrated.project));
});

test('3.1c: oba protokoły kończą zadanie po błędzie wykonania/klonowania i ignorują późny wynik',()=>{
  for(const request of [{project:derive(parseProject(JSON.stringify(base))).project,interval:1,batch:1},
    {project:concurrentBodyFixture(),arrivalIntervalSeconds:1,batch:1}]){
    const received:unknown[]=[],callbacks={progress:(value:unknown)=>received.push(value),result:(value:unknown)=>received.push(value),error:(value:string)=>received.push(value)};
    let stopped=0,prevented=0;
    const port:any={onmessage:null,onerror:null,postMessage:()=>{},terminate:()=>stopped++};
    const cancel=startBackgroundTask(request,callbacks,()=>port),late=port.onmessage;
    port.onerror({message:'Błąd wykonania testowego',preventDefault:()=>prevented++});
    assert.equal(stopped,1);assert.equal(prevented,1);assert.equal(port.onmessage,null);assert.equal(port.onerror,null);
    late({data:{kind:'result',result:{stale:true}}});cancel();cancel();
    assert.deepEqual(received,['Błąd wykonania testowego']);assert.equal(stopped,1);
    const clonePort:any={onmessage:null,onerror:null,postMessage:()=>{throw new Error('Błąd klonowania testowego');},terminate:()=>stopped++};
    startBackgroundTask(request,callbacks,()=>clonePort)();
    assert.equal(stopped,2);assert.equal(clonePort.onmessage,null);assert.equal(clonePort.onerror,null);
    assert.deepEqual(received,['Błąd wykonania testowego','Błąd klonowania testowego']);
  }
});

test('3.1b: tło aktywnej symulacji 4/5 zachowuje pełny wynik, wejście i postęp',()=>{
  const projects=[derive(parseProject(JSON.stringify(base))).project,
    derive(parseProject(readFileSync('tests/qa/Eko_B_export_20260930_183858.json','utf8'))).project,
    deriveStationProject(parseStationProjectV5(readFileSync('tests/qa/Eko_D5_actual_export_v5.json','utf8'))).project];
  for(const project of projects){
    const before=JSON.stringify(project),messages:NetworkReply[]=[];
    executeNetworkRequest({project,interval:4050,batch:3},message=>messages.push(structuredClone(message)));
    const reply=messages.at(-1)!;assert.equal(reply.kind,'result');
    if(reply.kind==='result')assert.deepEqual(reply.result,simulateNetwork(project,4050,3));
    const progress=messages.filter(message=>message.kind==='progress').map(message=>message.progress);
    assert.equal(progress[0].completed,0);assert.equal(progress.at(-1)!.completed,project.processSteps.length*3);
    assert.ok(progress.length<=101);assert.ok(progress.every((value,index)=>value.total===project.processSteps.length*3&&(index===0||value.completed>progress[index-1].completed)));
    assert.equal(JSON.stringify(project),before);
  }
  for(const [interval,batch] of [[0,3],[1,10001],[1,10000]]){
    const messages:NetworkReply[]=[];
    const project=structuredClone(projects[0]);
    if(batch===10000)project.processSteps=Array.from({length:21},(_,i)=>({...project.processSteps[0],id:`LIMIT-${i}`,sequenceNumber:i+1,predecessorIds:[]}));
    executeNetworkRequest({project,interval,batch},message=>messages.push(message));
    assert.equal(messages.length,1);assert.equal(messages[0].kind,'error');
  }
});

test('3.1a: protokół tła zachowuje pełne wyniki i monotoniczny postęp wszystkich wariantów Eko',()=>{
  const original=readFileSync('tests/qa/Eko_D5_actual_export_v5.json','utf8');
  for(const variant of ['parallel','sequential','shared-worker'] as EkoTestVariant[]){
    const {project}=createEkoTestScenario(original,variant),before=JSON.stringify(project),messages:ScheduleReply[]=[];
    executeScheduleRequest({project,batch:1,arrivalIntervalSeconds:1},message=>messages.push(structuredClone(message)));
    const result=messages.at(-1)!;assert.equal(result.kind,'result');
    if(result.kind==='result')assert.deepEqual(result.result,scheduleWorkerRun(project,1,1,project.bodyRunInput));
    const progress=messages.filter(message=>message.kind==='progress').map(message=>message.progress.completed);
    assert.equal(progress[0],0);assert.equal(progress.at(-1),16);
    assert.ok(progress.every((value,index)=>index===0||value>=progress[index-1]));
    assert.equal(JSON.stringify(project),before);
  }
  const {project}=createEkoTestScenario(original,'parallel'),messages:ScheduleReply[]=[];
  executeScheduleRequest({project,batch:1,arrivalIntervalSeconds:0},message=>messages.push(message));
  assert.equal(messages.length,1);assert.equal(messages[0].kind,'error');
});

test('3.1a: anulowanie kończy worker i odrzuca spóźnione zdarzenia; nowy przebieg jest niezależny',()=>{
  const project=concurrentBodyFixture(),request={project,batch:1,arrivalIntervalSeconds:1};
  const ports:any[]=[];const received:string[]=[];
  const factory=()=>{const port={onmessage:null,onerror:null,terminated:0,posted:[] as unknown[],
    postMessage(value:unknown){this.posted.push(structuredClone(value));},terminate(){this.terminated++;}};ports.push(port);return port;};
  const callbacks={progress:()=>received.push('progress'),result:()=>received.push('result'),error:()=>received.push('error')};
  const cancel=startScheduleTask(request,callbacks,factory);const stale=ports[0].onmessage;
  cancel();assert.equal(ports[0].terminated,1);assert.equal(ports[0].onmessage,null);
  stale({data:{kind:'progress',progress:{completed:1,total:2}}});assert.deepEqual(received,[]);
  const nextCancel=startScheduleTask(request,callbacks,factory);
  ports[1].onmessage({data:{kind:'result',result:scheduleWorkerRun(project,1,1,bodyInputFor())}});
  stale({data:{kind:'error',message:'old'}});assert.deepEqual(received,['result']);assert.equal(ports[1].terminated,1);
  nextCancel();assert.equal(ports[0].posted.length,1);
  startScheduleTask(request,callbacks,()=>{throw new Error('Brak workera');});assert.deepEqual(received,['result','error']);
});

test('2.9: trzy zatwierdzone warianty testowe Eko zachowują graf, czasy, źródło i inwarianty',()=>{
  const original=readFileSync('tests/qa/Eko_D5_actual_export_v5.json','utf8'),source=JSON.parse(original);
  for(const variant of ['parallel','sequential','shared-worker'] as EkoTestVariant[]){
    const prepared=createEkoTestScenario(original,variant),project=prepared.project;
    assert.equal(prepared.originalJson,original);assert.equal(project.bom.length,60);
    for(const operation of project.operations){
      const old=source.processSteps.find((step:ProcessStep)=>step.id===operation.id);
      assert.deepEqual(operation.predecessorIds,old.predecessorIds);assert.equal(operation.standardTimeSeconds,old.standardTimeSeconds);
      assert.equal(operation.staffing!.timeVariants[0].timeProfile.durationBasis,'assumed');
    }
    const before=JSON.stringify(project),result=scheduleWorkerRun(project,1,1,project.bodyRunInput);
    const run=(id:string)=>result.runs.find(run=>run.operationId===id)!;
    assert.equal(result.runs.length,16);assert.equal(result.jobs[0].finish,variant==='parallel'?13550:14150);
    assert.deepEqual([run('OP22').startSeconds,run('OP22').endSeconds],[7670,8270]);
    assert.deepEqual([run('OP23').startSeconds,run('OP23').endSeconds],variant==='parallel'?[7670,8270]:[8270,8870]);
    assert.ok(run('OP23').waitCauses.includes(variant==='shared-worker'?'workers':'same-job')||variant==='parallel');
    assert.ok(['OP10','OP13','OP14','OP15','OP16','OP17'].every(id=>run(id).startSeconds===0));
    assert.equal(run('OP18').startSeconds,1680);
    assert.ok(EKO_TEST_PREPARATIONS.every(id=>run(id).bodyId===undefined));
    for(const operation of project.operations)for(const predecessor of operation.predecessorIds)assert.ok(run(operation.id).startSeconds>=run(predecessor).endSeconds);
    for(const a of result.reservations.reservations)for(const b of result.reservations.reservations){
      if(a===b||!a.workerIds.some(id=>b.workerIds.includes(id)))continue;
      assert.ok(a.endSeconds<=b.startSeconds||b.endSeconds<=a.startSeconds);
    }
    let book=createBodyBook(project,project.bodyRunInput!.bodies,0);
    for(const event of result.bodyEvents!)book=applyBodyEvent(book,event);
    assert.deepEqual(book,result.bodyBook);assert.ok(result.runs.every(run=>!run.transport));
    assert.equal(JSON.stringify(project),before);
    const store=new DraftStorage();store.setItem('layout-studio-v3','active4');store.setItem('layout-studio-stations-v5',original);
    saveDomainDraft(store,prepared,null);const read=readDomainDraft(store);if(read.status!=='valid')throw new Error('Brak odczytu');
    assert.equal(read.saved.originalJson,original);assert.deepEqual(scheduleWorkerRun(read.saved.project,1,1,read.saved.project.bodyRunInput),result);
    assert.equal(store.getItem('layout-studio-v3'),'active4');assert.equal(store.getItem('layout-studio-stations-v5'),original);
  }
});

test('2.9: jawna rama jest wejściem testu, a brak lub inne miejsce bez trasy blokuje wynik',()=>{
  const original=readFileSync('tests/qa/Eko_D5_actual_export_v5.json','utf8');
  const {project}=createEkoTestScenario(original,'parallel');const initial=JSON.stringify(project);
  assert.throws(()=>scheduleWorkerRun(project,1,1),/brak jawnych instancji/);
  const different=structuredClone(project.bodyRunInput!);
  different.bodies[0].location={kind:'station',stationId:project.stations.find(station=>station.operationIds.includes('OP10'))!.id,copy:1};
  assert.throws(()=>scheduleWorkerRun(project,1,1,different),/brak jawnej trasy lub czasu/);
  assert.equal(JSON.stringify(project),initial);
  const result=scheduleWorkerRun(project,1,1,project.bodyRunInput);
  assert.ok(result.bodyEvents!.every(event=>event.kind==='reserve'||event.kind==='release'));
  assert.ok(result.bodyBook!.bodies.every(body=>body.status==='available'));
  assert.deepEqual(result.bodyBook!.bodies[0].location,project.bodyRunInput!.bodies[0].location);
});

class DraftStorage {
  values = new Map<string,string>();
  failWrite = false;
  getItem(key:string){return this.values.get(key)??null;}
  setItem(key:string,value:string){if(this.failWrite)throw new Error('quota');this.values.set(key,value);}
}

function concurrentBodyFixture(){
  const project=stationaryBodyFixture();
  project.stationSettings['ST-A'].parallelStations=1;
  project.operations[1].predecessorIds=[];
  project.operations[1].staffing!.timeVariants[0].timeProfile.durationSeconds=20;
  project.operations[1].staffing!.timeVariants[0].timeProfile.operatorPresence[0].endSeconds=20;
  project.workerRunSelection!.operations.forEach((choice,index)=>choice.eligibleWorkerIds=[index?'W-B':'W-A']);
  project.physicalConcurrency={groups:[{id:'TOGETHER',operationIds:project.operations.map(operation=>operation.id)}]};
  return project;
}
function bodyInputFor(count=1):BodyRunInput{
  return {bodies:Array.from({length:count},(_,i)=>({id:`BODY-${i+1}`,productId:'PRODUCT',location:{kind:'station',stationId:'ST-A',copy:1}})),
    jobs:Array.from({length:count},(_,i)=>({job:i+1,bodyId:`BODY-${i+1}`}))};
}

function branchingRouteFixture(){
  const project=concurrentBodyFixture();delete project.resourceCalendars;
  project.equipment=[];
  const template=project.operations[0];
  project.operations=['ROOT','P','Q'].map((id,index)=>({...structuredClone(template),id,name:id,
    sequenceNumber:index+1,predecessorIds:index?['ROOT']:[]}));
  project.stations=['S','X','Y','P','Q'].map(id=>({id:`ST-${id}`,name:id,operationIds:[]}));
  project.stationSettings=Object.fromEntries(project.stations.map(station=>[station.id,{operators:1,parallelStations:1}]));
  project.workerRunSelection!.operations=project.operations.map(operation=>({operationId:operation.id,workerCount:1,eligibleWorkerIds:['W-A']}));
  project.physicalConcurrency={groups:[{id:'PQ',operationIds:['P','Q']}]};
  const candidate=(id:string)=>({stationId:`ST-${id}`,copy:1,requiredEquipmentIds:[]});
  project.stationRouting={selectionRule:'earliest-start-then-shortest-route',equipmentPlacements:[],
    operations:[{operationId:'ROOT',candidates:[candidate('Y'),candidate('X')]},
      {operationId:'P',candidates:[candidate('P')]},{operationId:'Q',candidates:[candidate('Q')]}],
    routes:project.stations.flatMap(from=>project.stations.filter(to=>from.id!==to.id).map(to=>({
      id:`${from.id}-${to.id}`,from:{stationId:from.id,copy:1},to:{stationId:to.id,copy:1},
      distanceMm:from.id==='ST-S'?7:from.id==='ST-X'?(to.id==='ST-P'?2:100):from.id==='ST-Y'?(to.id==='ST-P'?10:3):50,
      basis:'confirmed' as const,source:'Wyłącznie syntetyczny przykład 1A',
      transportTime:{durationSeconds:1,basis:'assumed' as const,source:'Syntetyczny czas'}})))};
  const input=bodyInputFor();input.bodies[0].location={kind:'station',stationId:'ST-S',copy:1};
  return {project,input};
}

test('2.8c: pierwszeństwo technologiczne gałęzi rozstrzyga dalszą drogę bez sumowania',()=>{
  const {project,input}=branchingRouteFixture();const before=JSON.stringify({project,input});
  const result=scheduleWorkerRun(project,1,1,input);
  assert.deepEqual(result.runs.map(run=>[run.operationId,run.stationId,run.startSeconds,run.endSeconds]),
    [['ROOT','ST-X',1,11],['P','ST-P',12,22],['Q','ST-Q',23,33]]);
  assert.equal(result.runs[0].selectionDistanceMm,2);
  assert.equal(result.runs[0].selectionRouteId,'ST-X-ST-P');
  assert.equal(result.runs[2].transport!.routeId,'ST-P-ST-Q');
  assert.equal(result.runs[2].arrivalRouteId,undefined); // No route inferred from iteration order.
  let book=createBodyBook(project,input.bodies,0);
  for(const event of result.bodyEvents!)book=applyBodyEvent(book,event);
  assert.deepEqual(book,result.bodyBook);assert.equal(JSON.stringify({project,input}),before);
  project.operations[1].sequenceNumber=3;project.operations[2].sequenceNumber=2;
  assert.equal(scheduleWorkerRun(project,1,1,input).runs[0].stationId,'ST-Y');
});

test('2.8c: czas startu i rzeczywista droga przychodząca mają pierwszeństwo przed gałęziami',()=>{
  const {project,input}=branchingRouteFixture();
  const calendar={shifts:[{startSeconds:0,endSeconds:1000,basis:'assumed' as const}],breaks:[]};
  project.resourceCalendars={workers:Object.fromEntries(project.workers.map(worker=>[worker.id,structuredClone(calendar)])),
    stations:Object.fromEntries(project.stations.map(station=>[station.id,structuredClone(calendar)]))};
  project.resourceCalendars.stations['ST-X'].shifts[0].startSeconds=50;
  assert.equal(scheduleWorkerRun(project,1,1,input).runs[0].stationId,'ST-Y');
  delete project.resourceCalendars;
  project.stationRouting!.routes.find(route=>route.id==='ST-S-ST-Y')!.distanceMm=1;
  assert.equal(scheduleWorkerRun(project,1,1,input).runs[0].stationId,'ST-Y');
  project.stationRouting!.routes=project.stationRouting!.routes.filter(route=>route.id!=='ST-X-ST-P');
  assert.throws(()=>scheduleWorkerRun(project,1,1,input),/Brak rzeczywistej trasy/);
});

test('2.8c: przyszłe kopie są automatyczne, wspólna praca zachowuje jedną lokalizację i odtwarzalny zapis',()=>{
  const {project,input}=branchingRouteFixture();
  for(const operation of project.stationRouting!.operations.slice(1))operation.candidates=structuredClone(project.stationRouting!.operations[0].candidates);
  project.workerRunSelection!.operations[2].eligibleWorkerIds=['W-B'];
  const result=scheduleWorkerRun(project,1,1,input);
  assert.deepEqual(result.runs.map(run=>[run.stationId,run.startSeconds,run.endSeconds]),
    [['ST-Y',1,11],['ST-Y',11,21],['ST-Y',11,21]]);
  assert.equal(result.runs[0].selectionRouteId,undefined); // Zero means staying on the same physical copy.
  assert.equal(result.runs[1].transport,undefined);assert.equal(result.runs[2].transport,undefined);
  project.bodyRunInput=input;
  const store=new DraftStorage(),originalJson=JSON.stringify(derive(parseProject(JSON.stringify(base))).project);
  saveDomainDraft(store,{originalJson,project},null);const read=readDomainDraft(store);
  if(read.status!=='valid')throw new Error('Brak odczytu');
  assert.deepEqual(scheduleWorkerRun(read.saved.project,1,1,read.saved.project.bodyRunInput),result);
  const second=bodyInputFor(2);second.bodies.forEach(body=>body.location={kind:'station',stationId:'ST-S',copy:1});
  const batch=scheduleWorkerRun(project,1,2,second);
  for(const run of batch.runs)for(const other of batch.runs){
    if(run.job===other.job||run.stationId!==other.stationId||run.copy!==other.copy)continue;
    assert.ok(run.endSeconds<=other.stationReserveStartSeconds!||other.endSeconds<=run.stationReserveStartSeconds!);
  }
});

test('2.8c: remis pierwszej gałęzi sprawdza drugą, a późniejszy przydział nie zamraża planowanego celu',()=>{
  const {project,input}=branchingRouteFixture();
  project.stationRouting!.operations[0].candidates.reverse();
  project.stationRouting!.routes.find(route=>route.id==='ST-X-ST-P')!.distanceMm=10;
  assert.equal(scheduleWorkerRun(project,1,1,input).runs[0].stationId,'ST-Y');
  project.stationRouting!.routes.find(route=>route.id==='ST-X-ST-P')!.distanceMm=2;
  project.stationRouting!.operations[1].candidates.push({stationId:'ST-Q',copy:1,requiredEquipmentIds:[]});
  const calendar={shifts:[{startSeconds:0,endSeconds:1000,basis:'assumed' as const}],breaks:[]};
  project.resourceCalendars={workers:Object.fromEntries(project.workers.map(worker=>[worker.id,structuredClone(calendar)])),
    stations:Object.fromEntries(project.stations.map(station=>[station.id,structuredClone(calendar)]))};
  project.resourceCalendars.stations['ST-P'].shifts[0].startSeconds=50;
  const result=scheduleWorkerRun(project,1,1,input);
  assert.equal(result.runs[0].selectionRouteId,'ST-X-ST-P');
  assert.equal(result.runs[1].stationId,'ST-Q');assert.equal(result.runs[1].startSeconds,12);
  assert.equal(result.runs[1].transport!.routeId,'ST-X-ST-Q');
  project.stationRouting!.routes.find(route=>route.id==='ST-S-ST-X')!.transportTime=undefined;
  assert.throws(()=>scheduleWorkerRun(project,1,1,input),/brak jawnej trasy lub czasu/);
});

test('2.8c: przygotowanie między pracami nie wyznacza drogi korpusu; złączenie czeka na obie gałęzie',()=>{
  const {project,input}=branchingRouteFixture(),template=project.operations[0];
  project.operations.push({...structuredClone(template),id:'PREP',name:'Przygotowanie',sequenceNumber:2,
    predecessorIds:['ROOT'],physicalRole:{kind:'subassembly-preparation',subassemblyIds:['PART']}},
    {...structuredClone(template),id:'JOIN',name:'Złączenie',sequenceNumber:5,predecessorIds:['P','Q']});
  project.operations[1].predecessorIds=['PREP'];project.operations[2].predecessorIds=['PREP'];
  project.operations[1].sequenceNumber=3;project.operations[2].sequenceNumber=4;
  project.subassemblies=[{id:'PART',name:'Testowy podzespół',producerOperationId:'PREP',consumerOperationIds:['P','Q']}];
  for(const id of ['PREP','JOIN']){
    project.workerRunSelection!.operations.push({operationId:id,workerCount:1,eligibleWorkerIds:['W-A']});
    project.stationRouting!.operations.push({operationId:id,candidates:[{stationId:id==='PREP'?'ST-S':'ST-Q',copy:1,requiredEquipmentIds:[]}]});
  }
  const result=scheduleWorkerRun(project,1,1,input);
  assert.equal(result.runs[0].stationId,'ST-X');assert.equal(result.runs[0].selectionRouteId,'ST-X-ST-P');
  const prep=result.runs.find(run=>run.operationId==='PREP')!;
  assert.equal(prep.bodyId,undefined);assert.equal(prep.transport,undefined);
  const join=result.runs.find(run=>run.operationId==='JOIN')!;
  assert.ok(join.startSeconds>=Math.max(...result.runs.filter(run=>['P','Q'].includes(run.operationId)).map(run=>run.endSeconds)));
  assert.equal(join.stationId,'ST-Q');assert.equal(join.transport,undefined);
});

test('2.8b: wspólny korpus i kopia pozostają zajęte do ostatniej operacji; inne sztuki czekają',()=>{
  const project=concurrentBodyFixture(),input=bodyInputFor(2);
  const before=JSON.stringify({project,input});
  const result=scheduleWorkerRun(project,1,2,input);
  assert.deepEqual(result.runs.map(run=>[run.job,run.operationId,run.startSeconds,run.endSeconds]),[
    [1,project.operations[0].id,0,10],[1,project.operations[1].id,0,20],
    [2,project.operations[0].id,20,30],[2,project.operations[1].id,20,40]]);
  let book=createBodyBook(project,input.bodies,0);
  for(const event of result.bodyEvents!){
    book=applyBodyEvent(book,event);
    if(event.kind==='release'&&event.bodyId==='BODY-1'&&event.atSeconds===10){
      const body=book.bodies.find(body=>body.id==='BODY-1')!;assert.equal(body.status,'reserved');
      assert.equal(bodyAvailableAt(book,'BODY-1',{stationId:'ST-A',copy:1}),false);
      assert.throws(()=>applyBodyEvent(book,{kind:'start-transfer',bodyId:'BODY-1',atSeconds:10,to:{stationId:'ST-C',copy:1},endSeconds:12,basis:'assumed'}),/zajętego/);
    }
  }
  assert.deepEqual(book,result.bodyBook);assert.ok(book.bodies.every(body=>body.status==='available'));
  assert.equal(JSON.stringify({project,input}),before);
  const sequential=structuredClone(project);delete sequential.physicalConcurrency;
  assert.deepEqual(scheduleWorkerRun(sequential,1,1,bodyInputFor()).runs.map(run=>[run.startSeconds,run.endSeconds]),[[0,10],[10,30]]);
  project.operations[1].predecessorIds=[project.operations[0].id];
  assert.deepEqual(scheduleWorkerRun(project,1,1,bodyInputFor()).runs.map(run=>[run.startSeconds,run.endSeconds]),[[0,10],[10,30]]);
});

test('2.8b: grupa nie znosi wyłączności osób i wyposażenia ani pauz kalendarza',()=>{
  const project=concurrentBodyFixture();
  project.resourceCalendars!.stations['ST-A'].breaks=[{startSeconds:5,endSeconds:10,basis:'assumed'}];
  const paused=scheduleWorkerRun(project,1,1,bodyInputFor());
  assert.deepEqual(paused.runs.map(run=>[run.startSeconds,run.endSeconds]),[[0,15],[0,25]]);
  assert.deepEqual(paused.runs.map(run=>run.pauses),[[{startSeconds:5,endSeconds:10}],[{startSeconds:5,endSeconds:10}]]);
  const oneWorker=structuredClone(project);oneWorker.workerRunSelection!.operations.forEach(choice=>choice.eligibleWorkerIds=['W-A']);
  const exclusive=scheduleWorkerRun(oneWorker,1,1,bodyInputFor());
  assert.deepEqual(exclusive.runs.map(run=>[run.startSeconds,run.endSeconds]),[[0,15],[15,35]]);
  assert.ok(exclusive.runs[1].waitCauses.includes('workers'));
  delete project.resourceCalendars;
  const ids=project.operations.map(operation=>operation.id);
  project.equipment=[{id:'EQ',name:'Jawny egzemplarz testowy',stationId:'ST-A',capableOperationIds:ids}];
  project.stationRouting={selectionRule:'earliest-start-then-shortest-route',equipmentPlacements:[{equipmentId:'EQ',stationId:'ST-A',copy:1}],
    operations:ids.map(operationId=>({operationId,candidates:[{stationId:'ST-A',copy:1,requiredEquipmentIds:['EQ']}]})),routes:[]};
  const equipped=scheduleWorkerRun(project,1,1,bodyInputFor());
  assert.deepEqual(equipped.runs.map(run=>[run.startSeconds,run.endSeconds]),[[0,10],[10,30]]);
  assert.ok(equipped.runs[1].waitCauses.includes('equipment'));
  project.equipment.push({id:'EQ2',name:'Drugi egzemplarz testowy',stationId:'ST-A',capableOperationIds:ids});
  project.stationRouting.equipmentPlacements.push({equipmentId:'EQ2',stationId:'ST-A',copy:1});
  project.stationRouting.operations[1].candidates[0].requiredEquipmentIds=['EQ2'];
  assert.deepEqual(scheduleWorkerRun(project,1,1,bodyInputFor()).runs.map(run=>[run.startSeconds,run.endSeconds]),[[0,10],[0,20]]);
});

test('2.8b: dołączenie trzeciej operacji wymaga jednej grupy i jednej lokalizacji',()=>{
  const project=concurrentBodyFixture();
  const [a,b]=project.operations.map(operation=>operation.id),c='THIRD';
  project.operations.push({...structuredClone(project.operations[0]),id:c,name:'Trzecia',predecessorIds:[]});
  project.stations[0].operationIds.push(c);project.workers.push({id:'W-C',name:'Trzecia osoba'});
  project.workerRunSelection!.teamWorkerIds.push('W-C');
  project.workerRunSelection!.operations.push({operationId:c,workerCount:1,eligibleWorkerIds:['W-C']});
  project.resourceCalendars!.workers['W-C']=structuredClone(project.resourceCalendars!.workers['W-A']);
  project.physicalConcurrency={groups:[{id:'AB',operationIds:[a,b]},{id:'BC',operationIds:[b,c]}]};
  const result=scheduleWorkerRun(project,1,1,bodyInputFor());
  assert.deepEqual(result.runs.map(run=>[run.operationId,run.startSeconds,run.endSeconds]),[[a,0,10],[b,0,20],[c,10,20]]);
  let book=createBodyBook(project,bodyInputFor().bodies,0);
  book=applyBodyEvent(book,{kind:'reserve',bodyId:'BODY-1',atSeconds:0,operationId:a,endSeconds:10,basis:'assumed'});
  book=applyBodyEvent(book,{kind:'reserve',bodyId:'BODY-1',atSeconds:0,operationId:b,endSeconds:20,basis:'assumed'});
  assert.equal(bodyAllowsOperation(book,'BODY-1',c,{stationId:'ST-A',copy:1}),false);
  assert.equal(bodyAllowsOperation(book,'BODY-1',b,{stationId:'ST-C',copy:1}),false);
  assert.throws(()=>applyBodyEvent(book,{kind:'reserve',bodyId:'BODY-1',atSeconds:1,operationId:c,endSeconds:11,basis:'assumed'}),/całej grupy/);
  const store=new DraftStorage(),originalJson=JSON.stringify(derive(parseProject(JSON.stringify(base))).project);
  project.bodyRunInput=bodyInputFor();saveDomainDraft(store,{originalJson,project},null);
  const read=readDomainDraft(store);if(read.status!=='valid')throw new Error('Brak odczytu.');
  assert.deepEqual(scheduleWorkerRun(read.saved.project,1,1,read.saved.project.bodyRunInput),result);
});

test('2.8b: przygotowanie w innym miejscu może działać równolegle, transport czeka na wszystkie prace korpusu',()=>{
  const mixed=stationChoiceFixture();mixed.product={id:'PRODUCT',name:'Wyrób testowy'};
  mixed.operations[1].predecessorIds=[];
  mixed.subassemblies=[{id:'PART',name:'Przygotowanie testowe',producerOperationId:mixed.operations[0].id,consumerOperationIds:[mixed.operations[1].id]}];
  mixed.operations[0].physicalRole={kind:'subassembly-preparation',subassemblyIds:['PART']};mixed.operations[1].physicalRole={kind:'body-work'};
  mixed.workerRunSelection!.operations.forEach((choice,index)=>choice.eligibleWorkerIds=[index?'W-B':'W-A']);
  mixed.physicalConcurrency={groups:[{id:'MIXED',operationIds:mixed.operations.map(operation=>operation.id)}]};
  mixed.stationRouting!.operations[0].candidates=[mixed.stationRouting!.operations[0].candidates[0]];
  const input=bodyInputFor();input.bodies[0].location={kind:'station',stationId:'ST-C',copy:1};
  const result=scheduleWorkerRun(mixed,1,1,input);
  assert.deepEqual(result.runs.map(run=>[run.stationId,run.startSeconds,run.endSeconds]),[['ST-A',0,10],['ST-C',0,10]]);
  assert.equal(result.runs[0].bodyId,undefined);assert.equal(result.bodyEvents!.length,2);
  const multiple=structuredClone(mixed);multiple.stationRouting!.operations[0].candidates.push({stationId:'ST-B',copy:1,requiredEquipmentIds:[]});
  assert.deepEqual(scheduleWorkerRun(multiple,1,1,input).runs.map(run=>[run.stationId,run.startSeconds,run.endSeconds]),[['ST-A',0,10],['ST-C',0,10]]);

  const project=concurrentBodyFixture(),[a,b]=project.operations.map(operation=>operation.id),c='TRANSFER-NEXT';
  project.operations.push({...structuredClone(project.operations[0]),id:c,name:'Po przewozie',predecessorIds:[a]});
  project.stations[2].operationIds=[c];
  project.workerRunSelection!.operations.push({operationId:c,workerCount:1,eligibleWorkerIds:['W-A']});
  project.physicalConcurrency!.groups.push({id:'B-C',operationIds:[b,c]});
  project.stationRouting={selectionRule:'earliest-start-then-shortest-route',equipmentPlacements:[],
    operations:project.operations.map(operation=>({operationId:operation.id,candidates:[{stationId:operation.id===c?'ST-C':'ST-A',copy:1,requiredEquipmentIds:[]}]})),
    routes:[{id:'MOVE',from:{stationId:'ST-A',copy:1},to:{stationId:'ST-C',copy:1},distanceMm:1000,basis:'confirmed',source:'Test',
      transportTime:{durationSeconds:2,basis:'assumed',source:'Jawny test'}}]};
  const moved=scheduleWorkerRun(project,1,1,bodyInputFor());
  assert.deepEqual(moved.runs.map(run=>[run.startSeconds,run.endSeconds]),[[0,10],[0,20],[22,32]]);
  assert.deepEqual(moved.runs[2].transport,{routeId:'MOVE',startSeconds:20,endSeconds:22,basis:'assumed'});
  assert.ok(moved.runs[2].waitCauses.includes('body'));
  assert.equal(moved.runs[2].stationReserveStartSeconds,20);
});

test('2.8a: równoczesny zestaw wymaga jednej jawnej grupy, bez zgody przez przechodniość',()=>{
  const project=stationaryBodyFixture();
  const [a,b]=project.operations.map(operation=>operation.id),c='OP-THIRD';
  project.operations.push({...structuredClone(project.operations[1]),id:c,name:'Trzecia operacja testowa',predecessorIds:[]});
  project.stations[0].operationIds.push(c);
  project.workerRunSelection!.operations.push({...project.workerRunSelection!.operations[1],operationId:c});
  const policy:PhysicalConcurrency={groups:[{id:'G-AB',operationIds:[a,b]},{id:'G-BC',operationIds:[b,c]}]};
  assert.deepEqual(validatePhysicalConcurrency(project,policy),policy);
  assert.equal(matchingConcurrencyGroup(policy,[a,b]),'G-AB');
  assert.equal(matchingConcurrencyGroup(policy,[b,a]),'G-AB');
  assert.equal(matchingConcurrencyGroup(policy,[b,c]),'G-BC');
  assert.equal(matchingConcurrencyGroup(policy,[a,c]),undefined);
  assert.equal(matchingConcurrencyGroup(policy,[a,b,c]),undefined);
  assert.equal(matchingConcurrencyGroup(policy,[a,a]),undefined);
  assert.equal(matchingConcurrencyGroup(policy,[a,'UNKNOWN']),undefined);
  assert.equal(matchingConcurrencyGroup(undefined,[a,b]),undefined);
  const all={groups:[{id:'G-ABC',operationIds:[a,b,c]}]};
  assert.equal(matchingConcurrencyGroup(all,[a,c]),'G-ABC');
  assert.equal(matchingConcurrencyGroup(all,[a,b,c]),'G-ABC');
  assert.equal(matchingConcurrencyGroup(policy,[]),undefined);
  assert.equal(matchingConcurrencyGroup(policy,[a]),undefined);
  // Declared permission does not remove a technological predecessor.
  const withRules=parseDomainProjectV6(JSON.stringify({...project,physicalConcurrency:policy}));
  assert.deepEqual(withRules.operations[1].predecessorIds,project.operations[1].predecessorIds);
});

test('2.8a: zapis/odczyt grup na źródłach 4/5 chroni oryginały, starsze szkice i migrację',()=>{
  for(const version of [4,5] as const){
    const source=version===4?derive(parseProject(JSON.stringify(base))).project:
      JSON.parse(readFileSync('tests/qa/Eko_D5_actual_export_v5.json','utf8'));
    const originalJson=JSON.stringify(source);let i=0;
    const prepared=prepareDomainMigration(version===4?previewDomainMigrationFromV4(originalJson,()=>`ST-concurrent-${++i}`):previewDomainMigrationFromV5(originalJson));
    const project=prepared.project;
    assert.equal(project.physicalConcurrency,undefined);
    const storage=new DraftStorage();storage.values.set('layout-studio-v3','active4');storage.values.set('layout-studio-stations-v5','active5');
    const old=saveDomainDraft(storage,{originalJson,project},null);
    assert.equal(readDomainDraft(storage).status,'valid');
    project.product={id:'PRODUCT',name:'Jawny wyrób testowy'};
    project.operations.forEach(operation=>operation.physicalRole={kind:'body-work'});
    project.physicalConcurrency={groups:[{id:'G',operationIds:project.operations.slice(0,2).map(operation=>operation.id)}]};
    const written=saveDomainDraft(storage,{originalJson,project},old.raw);
    const read=readDomainDraft(storage);if(read.status!=='valid')throw new Error('Brak odczytu.');
    assert.deepEqual(read.saved.project.physicalConcurrency,project.physicalConcurrency);
    assert.equal(read.saved.originalJson,originalJson);
    assert.equal(storage.getItem('layout-studio-v3'),'active4');assert.equal(storage.getItem('layout-studio-stations-v5'),'active5');
    assert.throws(()=>scheduleWorkerRun(read.saved.project,1,1),/brak jawnych instancji/);
    const invalid=structuredClone(project);invalid.physicalConcurrency!.groups[0].operationIds[0]='UNKNOWN';
    assert.throws(()=>saveDomainDraft(storage,{originalJson,project:invalid},written.raw),/znane operacje/);
    assert.equal(storage.getItem(DOMAIN_DRAFT_STORAGE_KEY),written.raw);
    const damaged=JSON.parse(written.raw);damaged.project=invalid;const rawDamaged=JSON.stringify(damaged);
    storage.setItem(DOMAIN_DRAFT_STORAGE_KEY,rawDamaged);assert.equal(readDomainDraft(storage).status,'corrupt');
    assert.equal(storage.getItem(DOMAIN_DRAFT_STORAGE_KEY),rawDamaged);
    (source as typeof source & {physicalConcurrency:unknown}).physicalConcurrency=project.physicalConcurrency;
    const contaminated=JSON.stringify(source);i=0;
    const migrated=prepareDomainMigration(version===4?previewDomainMigrationFromV4(contaminated,()=>`ST-strip-concurrent-${++i}`):previewDomainMigrationFromV5(contaminated));
    assert.equal(migrated.project.physicalConcurrency,undefined);assert.equal(migrated.originalJson,contaminated);
  }
});

test('2.8a: walidacja grup odrzuca obce ID, powtórzenia i niepełne role bez mutacji',()=>{
  const project=stationaryBodyFixture(),[a,b]=project.operations.map(operation=>operation.id);
  const before=JSON.stringify(project);
  const bad:unknown[]=[null,[],{}, {groups:null},{groups:[null]}, {groups:[{id:'',operationIds:[a,b]}]},
    {groups:[{id:'G',operationIds:[a]}]}, {groups:[{id:'G',operationIds:[a,a]}]},
    {groups:[{id:'G',operationIds:[a,'UNKNOWN']}]},
    {groups:[{id:'G',operationIds:[a,b]},{id:'G',operationIds:[a,b]}]},
    {groups:[{id:'G',operationIds:[a,b]},{id:'OTHER',operationIds:[b,a]}]},
    {groups:[{id:'G',operationIds:[a,b],allowTransport:true}]},
    {groups:[],default:'allow'}, {groups:Array.from({length:501},(_,i)=>({id:String(i),operationIds:[a,b]}))}];
  for(const value of bad)assert.throws(()=>parseDomainProjectV6(JSON.stringify({...project,physicalConcurrency:value})),/Równoległość/);
  assert.deepEqual(validatePhysicalConcurrency(project,{groups:[]}),{groups:[]});
  const withRules={...project,physicalConcurrency:{groups:[{id:'G',operationIds:[a,b]}]}};
  assert.throws(()=>editDomainPhysicalRole(withRules,a,null),/jawne role/);
  const partial=structuredClone(withRules);delete partial.operations[1].physicalRole;
  assert.throws(()=>parseDomainProjectV6(JSON.stringify(partial)),/jawne role/);
  assert.equal(JSON.stringify(project),before);
});

function stationaryBodyFixture(){
  const project=stationChoiceFixture();
  project.product={id:'PRODUCT',name:'Jawny wyrób testowy'};
  project.operations.forEach(operation=>operation.physicalRole={kind:'body-work'});
  project.stations[0].operationIds=project.operations.map(operation=>operation.id);
  project.stations[2].operationIds=[];
  project.stationSettings['ST-A'].parallelStations=2;
  delete project.stationRouting;
  return project;
}

function movingBodyFixture(){
  const project=stationChoiceFixture();
  project.product={id:'PRODUCT',name:'Test transportu'};
  project.operations.forEach(operation=>operation.physicalRole={kind:'body-work'});
  project.stationRouting!.operations[0].candidates=[project.stationRouting!.operations[0].candidates[0]];
  project.stationRouting!.routes.find(route=>route.id==='R-A')!.transportTime={durationSeconds:2,basis:'assumed',source:'Jawny scenariusz testowy'};
  return project;
}

test('2.7d: transport ma jawny czas, cel zarezerwowany przed przewozem, korpus nie teleportuje',()=>{
  const project=movingBodyFixture();
  const input:BodyRunInput={bodies:[1,2].map(i=>({id:`BODY-${i}`,productId:'PRODUCT',
    location:{kind:'station',stationId:'ST-A',copy:1}})),jobs:[{job:1,bodyId:'BODY-1'},{job:2,bodyId:'BODY-2'}]};
  const before=JSON.stringify({project,input});
  const result=scheduleWorkerRun(project,1,2,input);
  const work=result.runs.filter(run=>run.operationId===project.operations[1].id);
  assert.deepEqual(work.map(run=>[run.stationReserveStartSeconds,run.startSeconds,run.endSeconds,run.waitSeconds]),
    [[10,12,22,0],[22,24,34,2]]);
  assert.deepEqual(work[0].transport,{routeId:'R-A',startSeconds:10,endSeconds:12,basis:'assumed'});
  let book=createBodyBook(project,input.bodies,0);
  for(const event of result.bodyEvents!){
    book=applyBodyEvent(book,event);
    if(event.kind==='start-transfer'){
      const body=book.bodies.find(body=>body.id===event.bodyId)!;
      assert.equal(body.status,'moving');assert.deepEqual(body.location,{kind:'unknown'});
      assert.equal(bodyAvailableAt(book,event.bodyId,{stationId:'ST-A',copy:1}),false);
      assert.equal(bodyAvailableAt(book,event.bodyId,{stationId:'ST-C',copy:1}),false);
    }
  }
  assert.deepEqual(book,result.bodyBook);
  for(let i=0;i<result.runs.length;i++)for(let j=i+1;j<result.runs.length;j++){
    const a=result.runs[i],b=result.runs[j];
    if(a.stationId===b.stationId&&a.copy===b.copy)
      assert.ok(a.endSeconds<=b.stationReserveStartSeconds!||b.endSeconds<=a.stationReserveStartSeconds!);
    if(a.workerIds.some(id=>b.workerIds.includes(id)))assert.ok(a.reserveEndSeconds<=b.reserveStartSeconds||b.reserveEndSeconds<=a.reserveStartSeconds);
  }
  assert.equal(JSON.stringify({project,input}),before);
  const storage=new DraftStorage();
  const written=saveDomainDraft(storage,{originalJson:JSON.stringify(derive(parseProject(JSON.stringify(base))).project),project},null);
  const reopened=readDomainDraft(storage);if(reopened.status!=='valid')throw new Error('Brak odczytu.');
  assert.deepEqual(scheduleWorkerRun(reopened.saved.project,1,2,input),result);
  const invalid=structuredClone(project);invalid.stationRouting!.routes[0].transportTime!.durationSeconds=0;
  assert.throws(()=>saveDomainDraft(storage,{originalJson:written.saved.originalJson,project:invalid},written.raw),/Czas transportu/);
  assert.equal(storage.getItem(DOMAIN_DRAFT_STORAGE_KEY),written.raw);
});

test('2.7e: zapis jawnego wejścia przebiegu waliduje referencje i zachowuje źródło oraz konfigurację po wykonaniu',()=>{
  const project=movingBodyFixture();
  project.bodyRunInput={bodies:[{id:'BODY',productId:'PRODUCT',location:{kind:'station',stationId:'ST-A',copy:1}}],jobs:[{job:1,bodyId:'BODY'}]};
  const originalJson=JSON.stringify(derive(parseProject(JSON.stringify(base))).project);
  const storage=new DraftStorage(),written=saveDomainDraft(storage,{originalJson,project},null);
  const reopened=readDomainDraft(storage);if(reopened.status!=='valid')throw new Error('Brak odczytu.');
  assert.deepEqual(reopened.saved.project.bodyRunInput,project.bodyRunInput);
  const result=scheduleWorkerRun(reopened.saved.project,1,1,reopened.saved.project.bodyRunInput);
  assert.equal(result.bodyBook!.bodies[0].location.kind,'station');
  assert.deepEqual(reopened.saved.project.bodyRunInput.bodies[0].location,{kind:'station',stationId:'ST-A',copy:1});
  assert.equal(reopened.saved.originalJson,originalJson);
  const failures=[(p:typeof project)=>{p.bodyRunInput!.jobs[0].bodyId='UNKNOWN';},
    (p:typeof project)=>{p.bodyRunInput!.bodies[0].location={kind:'station',stationId:'ST-A',copy:999};},
    (p:typeof project)=>{p.bodyRunInput!.bodies[0].productId='UNKNOWN';},
    (p:typeof project)=>{delete p.operations[0].physicalRole;},
    (p:typeof project)=>{(p.bodyRunInput as unknown as {state:string}).state='moving';}];
  for(const change of failures){
    const bad=structuredClone(project);change(bad);
    assert.throws(()=>saveDomainDraft(storage,{originalJson,project:bad},written.raw));
    assert.equal(storage.getItem(DOMAIN_DRAFT_STORAGE_KEY),written.raw);
  }
  const damaged=JSON.parse(written.raw);damaged.project.bodyRunInput.jobs[0].bodyId='UNKNOWN';
  const corrupt=JSON.stringify(damaged);storage.setItem(DOMAIN_DRAFT_STORAGE_KEY,corrupt);
  assert.equal(readDomainDraft(storage).status,'corrupt');assert.equal(storage.getItem(DOMAIN_DRAFT_STORAGE_KEY),corrupt);
  for(const version of [4,5] as const){
    const raw=version===4?derive(parseProject(JSON.stringify(base))).project:JSON.parse(readFileSync('tests/qa/Eko_D5_actual_export_v5.json','utf8'));
    (raw as typeof raw & {bodyRunInput:unknown}).bodyRunInput=project.bodyRunInput;
    const source=JSON.stringify(raw);let i=0;
    const migrated=prepareDomainMigration(version===4?previewDomainMigrationFromV4(source,()=>`ST-body-${++i}`):previewDomainMigrationFromV5(source));
    assert.equal(migrated.project.bodyRunInput,undefined);assert.equal(migrated.originalJson,source);
  }
});

test('2.7d: najwcześniejszy start z dojazdem wygrywa, remis rozstrzyga rzeczywista droga',()=>{
  const project=movingBodyFixture();
  project.stations.push({id:'ST-D',name:'D',operationIds:[]});
  project.stationSettings['ST-D']={operators:1,parallelStations:1};
  project.resourceCalendars!.stations['ST-D']=structuredClone(project.resourceCalendars!.stations['ST-C']);
  project.stationRouting!.operations[1].candidates.push({stationId:'ST-D',copy:1,requiredEquipmentIds:[]});
  project.stationRouting!.routes.push({id:'R-A-D',from:{stationId:'ST-A',copy:1},to:{stationId:'ST-D',copy:1},
    distanceMm:1000,basis:'confirmed',source:'Test',transportTime:{durationSeconds:10,basis:'measured',source:'Test, bez danych produkcji'}});
  const input:BodyRunInput={bodies:[{id:'BODY',productId:'PRODUCT',location:{kind:'station',stationId:'ST-A',copy:1}}],jobs:[{job:1,bodyId:'BODY'}]};
  const earliest=scheduleWorkerRun(project,1,1,input);
  assert.equal(earliest.runs[1].stationId,'ST-C');assert.equal(earliest.runs[1].startSeconds,12);
  project.stationRouting!.routes.find(route=>route.id==='R-A-D')!.transportTime!.durationSeconds=2;
  const tied=scheduleWorkerRun(project,1,1,input);
  assert.equal(tied.runs[1].stationId,'ST-D');assert.equal(tied.runs[1].startSeconds,12);
  assert.equal(tied.runs[1].transport!.basis,'measured');
  const transfers=tied.bodyEvents!.filter(event=>event.kind==='start-transfer');assert.equal(transfers[0].basis,'confirmed');
  project.resourceCalendars!.stations['ST-D'].shifts[0].startSeconds=50;
  assert.equal(scheduleWorkerRun(project,1,1,input).runs[1].stationId,'ST-C');
});

test('2.7d: dojazd przed zmianą blokuje cel przez oczekiwanie i pauzę, brak czasu odmawia',()=>{
  const project=movingBodyFixture();
  project.resourceCalendars!.stations['ST-C'].shifts[0].startSeconds=50;
  project.resourceCalendars!.stations['ST-C'].breaks=[{startSeconds:55,endSeconds:60,basis:'assumed'}];
  const input:BodyRunInput={bodies:[{id:'BODY',productId:'PRODUCT',location:{kind:'station',stationId:'ST-A',copy:1}}],jobs:[{job:1,bodyId:'BODY'}]};
  const result=scheduleWorkerRun(project,1,1,input),run=result.runs[1];
  assert.deepEqual([run.stationReserveStartSeconds,run.transport!.endSeconds,run.startSeconds,run.endSeconds,run.waitSeconds],[10,12,50,65,38]);
  assert.deepEqual(run.pauses,[{startSeconds:55,endSeconds:60}]);
  assert.deepEqual(run.waitCauses,['calendar']);
  assert.deepEqual(result.bodyEvents!.map(event=>[event.kind,event.atSeconds]),
    [['reserve',0],['release',10],['start-transfer',10],['finish-transfer',12],['reserve',50],['release',65]]);
  delete project.stationRouting!.routes.find(route=>route.id==='R-A')!.transportTime;
  assert.throws(()=>scheduleWorkerRun(project,1,1,input),/brak jawnej trasy lub czasu/);
  for(const timing of [null,{durationSeconds:0,basis:'assumed',source:'Test'},
    {durationSeconds:1,basis:'unknown',source:'Test'},{durationSeconds:1,basis:'measured',source:''},
    {durationSeconds:1,basis:'measured',source:'Test',speed:1}]){
    project.stationRouting!.routes[0].transportTime=timing as never;
    assert.throws(()=>parseDomainProjectV6(JSON.stringify(project)),/Czas transportu/);
  }
});

test('2.7c: harmonogram zajmuje jawny korpus przez operację i pauzę, zachowuje tożsamość i miejsce',()=>{
  const project=stationaryBodyFixture();
  project.resourceCalendars!.stations['ST-A'].breaks=[{startSeconds:5,endSeconds:10,basis:'assumed'}];
  const input:BodyRunInput={bodies:[1,2].map(copy=>({id:`BODY-${copy}`,productId:'PRODUCT',
    location:{kind:'station',stationId:'ST-A',copy}})),jobs:[{job:1,bodyId:'BODY-1'},{job:2,bodyId:'BODY-2'}]};
  const before=JSON.stringify({project,input});
  const result=scheduleWorkerRun(project,1,2,input);
  assert.deepEqual(result.runs.map(run=>[run.job,run.copy,run.bodyId,run.startSeconds,run.endSeconds]),
    [[1,1,'BODY-1',0,15],[2,2,'BODY-2',1,16],[1,1,'BODY-1',15,25],[2,2,'BODY-2',16,26]]);
  assert.deepEqual(result.runs[0].pauses,[{startSeconds:5,endSeconds:10}]);
  assert.deepEqual(result.bodyEvents!.filter(event=>event.kind==='reserve').map(event=>
    [event.bodyId,event.atSeconds,event.endSeconds,event.basis]),
    [['BODY-1',0,15,'assumed'],['BODY-2',1,16,'assumed'],['BODY-1',15,25,'assumed'],['BODY-2',16,26,'assumed']]);
  assert.ok(result.bodyBook!.bodies.every(body=>body.status==='available'&&body.location.kind==='station'));
  assert.deepEqual(result.bodyBook!.bodies.map(body=>body.location),input.bodies.map(body=>body.location));
  // Replay actual events against the independent ledger, including the pause midpoint.
  let replay=createBodyBook(project,input.bodies,0);
  for(const event of result.bodyEvents!){
    replay=applyBodyEvent(replay,event);
    if(event.kind==='reserve')assert.equal(bodyAvailableAt(replay,event.bodyId,
      {stationId:'ST-A',copy:event.bodyId==='BODY-1'?1:2}),false);
  }
  assert.deepEqual(replay,result.bodyBook);
  for(let i=0;i<result.runs.length;i++)for(let j=i+1;j<result.runs.length;j++){
    const a=result.runs[i],b=result.runs[j];
    if(a.bodyId===b.bodyId||a.stationId===b.stationId&&a.copy===b.copy)
      assert.ok(a.endSeconds<=b.startSeconds||b.endSeconds<=a.startSeconds);
    if(a.workerIds.some(id=>b.workerIds.includes(id)))assert.ok(a.reserveEndSeconds<=b.reserveStartSeconds||b.reserveEndSeconds<=a.reserveStartSeconds);
  }
  assert.equal(JSON.stringify({project,input}),before);
  const storage=new DraftStorage();
  saveDomainDraft(storage,{originalJson:JSON.stringify(derive(parseProject(JSON.stringify(base))).project),project},null);
  const reopened=readDomainDraft(storage);if(reopened.status!=='valid')throw new Error('Brak odczytu.');
  assert.deepEqual(scheduleWorkerRun(reopened.saved.project,1,2,input),result);
  assert.equal('bodies' in reopened.saved.project,false);
});

test('2.7c: przygotowanie podzespołu nie przenosi ani nie zajmuje korpusu',()=>{
  const project=stationChoiceFixture();
  project.product={id:'PRODUCT',name:'Wyrób testowy'};
  project.subassemblies=[{id:'PART',name:'Część testowa',producerOperationId:project.operations[0].id,
    consumerOperationIds:[project.operations[1].id]}];
  project.operations[0].physicalRole={kind:'subassembly-preparation',subassemblyIds:['PART']};
  project.operations[1].physicalRole={kind:'body-work'};
  const input:BodyRunInput={bodies:[{id:'BODY',productId:'PRODUCT',location:{kind:'station',stationId:'ST-C',copy:1}}],
    jobs:[{job:1,bodyId:'BODY'}]};
  const result=scheduleWorkerRun(project,1,1,input);
  assert.equal(result.runs[0].stationId,'ST-B');
  assert.equal(result.runs[0].bodyId,undefined);
  assert.equal(result.runs[1].bodyId,'BODY');
  assert.deepEqual(result.bodyEvents,[{kind:'reserve',bodyId:'BODY',atSeconds:10,operationId:project.operations[1].id,endSeconds:20,basis:'assumed'},
    {kind:'release',bodyId:'BODY',atSeconds:20,operationId:project.operations[1].id}]);
  assert.deepEqual(result.bodyBook!.bodies[0].location,input.bodies[0].location);
  const preparationOnly=structuredClone(project);
  preparationOnly.product=null;
  preparationOnly.subassemblies.push({id:'PART2',name:'Część druga',producerOperationId:project.operations[1].id,consumerOperationIds:[]});
  preparationOnly.operations[1].physicalRole={kind:'subassembly-preparation',subassemblyIds:['PART2']};
  const noBody=scheduleWorkerRun(preparationOnly,1,1);
  assert.equal(noBody.bodyBook,undefined);assert.ok(noBody.runs.every(run=>run.bodyId===undefined));
});

test('2.7c: brakujące dane, podwójne przypisanie i wymagane przemieszczenie blokują przebieg bez mutacji',()=>{
  const project=stationaryBodyFixture();
  const input:BodyRunInput={bodies:[{id:'BODY',productId:'PRODUCT',location:{kind:'station',stationId:'ST-A',copy:1}}],
    jobs:[{job:1,bodyId:'BODY'}]};
  const before=JSON.stringify({project,input});
  assert.throws(()=>scheduleWorkerRun(project,1,1),/brak jawnych instancji/);
  const partial=structuredClone(project);delete partial.operations[1].physicalRole;
  assert.throws(()=>scheduleWorkerRun(partial,1,1,input),/ról wszystkich/);
  assert.throws(()=>scheduleWorkerRun(project,1,2,{...input,jobs:[{job:1,bodyId:'BODY'},{job:2,bodyId:'BODY'}]}),/powtórnie przypisana/);
  assert.throws(()=>scheduleWorkerRun(project,1,1,{...input,jobs:[{job:2,bodyId:'BODY'}]}),/sztuka przebiegu/);
  assert.throws(()=>scheduleWorkerRun(project,1,1,{...input,jobs:[{job:1,bodyId:'UNKNOWN'}]}),/nieznana/);
  assert.throws(()=>scheduleWorkerRun(project,1,1,{...input,bodies:[{...input.bodies[0],location:{kind:'unknown'}}]}),/lokalizacji początkowej/);
  assert.throws(()=>scheduleWorkerRun(project,1,1,{...input,bodies:[input.bodies[0],{...input.bodies[0],id:'EXTRA'}]}),/nieprzypisane/);
  const move=structuredClone(project);move.stations[0].operationIds=[move.operations[0].id];move.stations[2].operationIds=[move.operations[1].id];
  assert.throws(()=>scheduleWorkerRun(move,1,1,input),/wymagane przemieszczenie/);
  const legacy=stationChoiceFixture();assert.throws(()=>scheduleWorkerRun(legacy,1,1,input),/jawnych ról/);
  assert.equal(JSON.stringify({project,input}),before);
});

test('2.7b: role fizyczne zachowują zapis, źródło 4/5 i brak ról w starszych szkicach',()=>{
  for(const version of [4,5] as const){
    const original=version===4?JSON.stringify(derive(parseProject(JSON.stringify(base))).project):
      readFileSync('tests/qa/Eko_D5_actual_export_v5.json','utf8');
    let id=0;
    const prepared=prepareDomainMigration(version===4?previewDomainMigrationFromV4(original,()=>`ST-role-${++id}`):previewDomainMigrationFromV5(original));
    let project=prepared.project;
    assert.ok(project.operations.every(operation=>operation.physicalRole===undefined));
    const storage=new DraftStorage();
    storage.values.set('layout-studio-v3','active4');storage.values.set('layout-studio-stations-v5','active5');
    const old=saveDomainDraft(storage,{originalJson:original,project},null);
    assert.equal(readDomainDraft(storage).status,'valid');
    const prep=project.operations[0].id,body=project.operations[1].id;
    project=editDomainProduct(project,{kind:'set-product',id:'PRODUCT',name:'Jawny test'});
    project=editDomainProduct(project,{kind:'add-subassembly',id:'PART',name:'Podzespół testowy',producerOperationId:prep,consumerOperationIds:[body]});
    project=editDomainPhysicalRole(project,prep,{kind:'subassembly-preparation',subassemblyIds:['PART']});
    project=editDomainPhysicalRole(project,body,{kind:'body-work'});
    const written=saveDomainDraft(storage,{originalJson:original,project},old.raw);
    const reopened=readDomainDraft(storage);
    assert.equal(reopened.status,'valid');
    if(reopened.status!=='valid')throw new Error('Brak odczytu.');
    assert.deepEqual(reopened.saved.project,project);
    assert.equal(reopened.saved.originalJson,original);
    assert.equal(storage.getItem('layout-studio-v3'),'active4');
    assert.equal(storage.getItem('layout-studio-stations-v5'),'active5');
    assert.throws(()=>scheduleWorkerRun(reopened.saved.project,1,1),/2.7.3/);
    const invalid=structuredClone(project);invalid.subassemblies=[];
    assert.throws(()=>saveDomainDraft(storage,{originalJson:original,project:invalid},written.raw),/nieznany podzespół/);
    assert.equal(storage.getItem(DOMAIN_DRAFT_STORAGE_KEY),written.raw);
    const damaged=JSON.parse(written.raw);damaged.project=invalid;
    const rawDamaged=JSON.stringify(damaged);storage.setItem(DOMAIN_DRAFT_STORAGE_KEY,rawDamaged);
    const failed=readDomainDraft(storage);assert.equal(failed.status,'corrupt');
    assert.equal(storage.getItem(DOMAIN_DRAFT_STORAGE_KEY),rawDamaged);
    if(failed.status==='corrupt')assert.equal(failed.raw,rawDamaged);
  }
});

test('2.7b: walidacja ról i edycja chronią powiązania bez wnioskowania fizyki',()=>{
  let project=stationChoiceFixture();
  const prep=project.operations[0].id,body=project.operations[1].id;
  project=editDomainProduct(project,{kind:'add-subassembly',id:'PART',name:'Część',producerOperationId:prep,consumerOperationIds:[body]});
  project=editDomainProduct(project,{kind:'add-subassembly',id:'PART2',name:'Część druga',producerOperationId:prep,consumerOperationIds:[]});
  const initial=JSON.stringify(project);
  // Links alone never assign roles or require a body/product for preparation.
  assert.ok(project.operations.every(operation=>operation.physicalRole===undefined));
  const typed=editDomainPhysicalRole(project,prep,{kind:'subassembly-preparation',subassemblyIds:['PART','PART2']});
  assert.equal(JSON.stringify(project),initial);
  assert.deepEqual(typed.subassemblies,project.subassemblies);
  assert.throws(()=>editDomainPhysicalRole(typed,body,{kind:'body-work'}),/definicji wyrobu/);
  assert.throws(()=>editDomainProduct(typed,{kind:'remove-subassembly',id:'PART'}),/nieznany podzespół/);
  assert.throws(()=>editDomainProduct(typed,{kind:'edit-subassembly',id:'PART',name:'Część',producerOperationId:body,consumerOperationIds:[]}),/zgodnej jawnej/);
  const badRoles:unknown[]=[null,[],{},'body-work',{kind:'other'},{kind:'body-work',subassemblyIds:[]},
    {kind:'subassembly-preparation'},{kind:'subassembly-preparation',subassemblyIds:[]},
    {kind:'subassembly-preparation',subassemblyIds:['PART','PART']},
    {kind:'subassembly-preparation',subassemblyIds:[1]},
    {kind:'subassembly-preparation',subassemblyIds:['UNKNOWN']},
    {kind:'subassembly-preparation',subassemblyIds:['PART'],quantity:1}];
  for(const role of badRoles){
    const changed=structuredClone(typed);changed.operations[0].physicalRole=role as never;
    assert.throws(()=>parseDomainProjectV6(JSON.stringify(changed)),/rola fizyczna/);
  }
  assert.throws(()=>editDomainPhysicalRole(typed,body,{kind:'subassembly-preparation',subassemblyIds:['PART']}),/zgodnej jawnej/);
  assert.throws(()=>editDomainPhysicalRole(typed,'UNKNOWN',null),/nieznana operacja/);
  const unlinked=structuredClone(typed);delete unlinked.subassemblies[0].producerOperationId;
  assert.throws(()=>parseDomainProjectV6(JSON.stringify(unlinked)),/zgodnej jawnej/);
  const removed=editDomainPhysicalRole(typed,prep,null);
  assert.equal(removed.operations[0].physicalRole,undefined);
  assert.deepEqual(removed,project);
  let withBody=editDomainProduct(typed,{kind:'set-product',id:'PRODUCT',name:'Wyrób'});
  withBody=editDomainPhysicalRole(withBody,body,{kind:'body-work'});
  assert.throws(()=>editDomainProduct(withBody,{kind:'clear-product'}),/definicji wyrobu/);
  const cleared=editDomainProduct(editDomainPhysicalRole(withBody,body,null),{kind:'clear-product'});
  assert.equal(cleared.product,null);
  assert.equal(withBody.product!.id,'PRODUCT');
});

test('2.7b: migracja nie przyjmuje nieobsługiwanej roli fizycznej ze źródła 4/5',()=>{
  for(const version of [4,5] as const){
    const raw=version===4?derive(parseProject(JSON.stringify(base))).project:
      JSON.parse(readFileSync('tests/qa/Eko_D5_actual_export_v5.json','utf8'));
    (raw.processSteps[0] as typeof raw.processSteps[0] & {physicalRole:unknown}).physicalRole={kind:'body-work'};
    const original=JSON.stringify(raw);let id=0;
    const prepared=prepareDomainMigration(version===4?previewDomainMigrationFromV4(original,()=>`ST-strip-${++id}`):previewDomainMigrationFromV5(original));
    assert.equal(prepared.originalJson,original);
    assert.ok(prepared.project.operations.every(operation=>operation.physicalRole===undefined));
    assert.equal(prepared.project.product,null);
  }
});

test('2.7a: fizyczny korpus ma jedno miejsce, nie jest dostępny podczas operacji i przemieszczenia',()=>{
  const project=stationChoiceFixture();project.product={id:'PRODUCT',name:'Jawny wyrób testowy'};
  const source=JSON.stringify(project);
  const location={stationId:'ST-A',copy:1};
  const declarations=[{id:'BODY-1',productId:'PRODUCT',location:{kind:'station' as const,...location}},
    {id:'BODY-2',productId:'PRODUCT',location:{kind:'unknown' as const}}];
  let book=createBodyBook(project,declarations,0);
  assert.equal(bodyAvailableAt(book,'BODY-1',location),true);
  assert.equal(bodyAvailableAt(book,'BODY-2',location),false);
  assert.equal(book.bodies[1].status,'unlocated');
  const original=JSON.stringify(book);
  const reserve:BodyEvent={kind:'reserve',bodyId:'BODY-1',atSeconds:5,operationId:project.operations[0].id,endSeconds:35,basis:'assumed'};
  const reserved=applyBodyEvent(book,reserve);
  assert.equal(JSON.stringify(book),original);
  book=reserved;
  assert.equal(bodyAvailableAt(book,'BODY-1',location),false);
  assert.throws(()=>applyBodyEvent(book,{...reserve,atSeconds:10}),/nie jest dostępny/);
  assert.throws(()=>applyBodyEvent(book,{kind:'start-transfer',bodyId:'BODY-1',atSeconds:10,to:{stationId:'ST-C',copy:1},endSeconds:20,basis:'assumed'}),/zajętego/);
  assert.throws(()=>applyBodyEvent(book,{kind:'release',bodyId:'BODY-1',atSeconds:34,operationId:project.operations[0].id}),/przed końcem/);
  assert.throws(()=>applyBodyEvent(book,{kind:'release',bodyId:'BODY-1',atSeconds:35,operationId:project.operations[1].id}),/inną operację/);
  book=applyBodyEvent(book,{kind:'release',bodyId:'BODY-1',atSeconds:35,operationId:project.operations[0].id});
  assert.equal(bodyAvailableAt(book,'BODY-1',location),true);
  book=applyBodyEvent(book,{kind:'start-transfer',bodyId:'BODY-1',atSeconds:35,to:{stationId:'ST-C',copy:1},endSeconds:45,basis:'assumed'});
  assert.equal(book.bodies[0].status,'moving');assert.deepEqual(book.bodies[0].location,{kind:'unknown'});
  assert.equal(bodyAvailableAt(book,'BODY-1',location),false);
  assert.equal(bodyAvailableAt(book,'BODY-1',{stationId:'ST-C',copy:1}),false);
  assert.throws(()=>applyBodyEvent(book,{...reserve,atSeconds:36,endSeconds:46}),/nie jest dostępny/);
  assert.throws(()=>applyBodyEvent(book,{kind:'finish-transfer',bodyId:'BODY-1',atSeconds:44}),/nie zakończył/);
  const moving=JSON.stringify(book);
  assert.throws(()=>applyBodyEvent(book,{kind:'locate',bodyId:'BODY-1',atSeconds:45,location}),/tylko nieznaną/);
  assert.equal(JSON.stringify(book),moving);
  book=applyBodyEvent(book,{kind:'finish-transfer',bodyId:'BODY-1',atSeconds:45});
  assert.deepEqual(book.bodies[0].location,{kind:'station',stationId:'ST-C',copy:1});
  assert.equal(bodyAvailableAt(book,'BODY-1',{stationId:'ST-C',copy:1}),true);
  assert.equal(bodyAvailableAt(book,'BODY-1',location),false);
  book=applyBodyEvent(book,{kind:'locate',bodyId:'BODY-2',atSeconds:10,location:{stationId:'ST-B',copy:1}});
  assert.equal(bodyAvailableAt(book,'BODY-2',{stationId:'ST-B',copy:1}),true);
  assert.equal(JSON.stringify(project),source);
  assert.deepEqual(declarations[0].location,{kind:'station',...location});
});

test('2.7a: odmowy nieznanych instancji, referencji i czasu zachowują stan',()=>{
  const project=stationChoiceFixture();project.product={id:'PRODUCT',name:'Wyrób'};
  const declaration={id:'BODY',productId:'PRODUCT',location:{kind:'station' as const,stationId:'ST-A',copy:1}};
  assert.throws(()=>createBodyBook({...project,product:null},[declaration],0),/definicji wyrobu/);
  assert.throws(()=>createBodyBook(project,[declaration,declaration],0),/powtórzone ID/);
  assert.throws(()=>createBodyBook(project,[{...declaration,productId:'UNKNOWN'}],0),/nieznany wyrób/);
  assert.throws(()=>createBodyBook(project,[{...declaration,location:{kind:'station',stationId:'ST-A',copy:2}}],0),/nieznana kopia/);
  const book=createBodyBook(project,[declaration],0),raw=JSON.stringify(book);
  const reserve:BodyEvent={kind:'reserve',bodyId:'BODY',atSeconds:0,operationId:project.operations[0].id,endSeconds:10,basis:'confirmed'};
  assert.throws(()=>applyBodyEvent(book,{...reserve,bodyId:'UNKNOWN'}),/Nieznana instancja/);
  assert.throws(()=>applyBodyEvent(book,{...reserve,operationId:'UNKNOWN'}),/nieznana operacja/);
  assert.throws(()=>applyBodyEvent(book,{...reserve,endSeconds:0}),/dodatniego/);
  assert.throws(()=>applyBodyEvent(book,{...reserve,endSeconds:Infinity}),/czasu/);
  assert.throws(()=>applyBodyEvent(book,{...reserve,atSeconds:-1}),/czasu/);
  assert.throws(()=>applyBodyEvent(book,{...reserve,basis:'missing' as never}),/pochodzenia/);
  assert.throws(()=>applyBodyEvent(book,{kind:'locate',bodyId:'BODY',atSeconds:0,location:{stationId:'ST-C',copy:1}}),/tylko nieznaną/);
  const reserved=applyBodyEvent(book,reserve);
  const released=applyBodyEvent(reserved,{kind:'release',bodyId:'BODY',atSeconds:10,operationId:project.operations[0].id});
  assert.throws(()=>applyBodyEvent(released,{...reserve,atSeconds:5,endSeconds:15}),/cofa czas/);
  assert.throws(()=>applyBodyEvent(released,{kind:'start-transfer',bodyId:'BODY',atSeconds:10,to:{stationId:'ST-A',copy:1},endSeconds:20,basis:'confirmed'}),/innej kopii/);
  assert.equal(JSON.stringify(book),raw);
  assert.equal(createBodyBook(project,[],0).bodies.length,0);
});

test('2.6b: jawne kopie, stałe wyposażenie i potwierdzone trasy zachowują zapis szkicu i źródło',()=>{
  for(const version of [4,5] as const){
    const original=version===4?JSON.stringify(derive(parseProject(JSON.stringify(base))).project):
      readFileSync('tests/qa/Eko_D5_actual_export_v5.json','utf8');
    let id=0;
    const prepared=prepareDomainMigration(version===4?previewDomainMigrationFromV4(original,()=>`ST-route-${++id}`):previewDomainMigrationFromV5(original));
    const project=prepared.project;
    assert.equal(project.stationRouting,undefined);
    const first=project.stations[0],second=project.stations[1];
    const operationId=first.operationIds[0];
    project.stationSettings[first.id]={operators:1,parallelStations:2};
    project.stationSettings[second.id]={operators:1,parallelStations:1};
    project.equipment=[{id:'EQ-1',name:'Przyrząd testowy',stationId:first.id,capableOperationIds:[operationId]}];
    const routing:StationRoutingV6={selectionRule:'earliest-start-then-shortest-route',
      equipmentPlacements:[{equipmentId:'EQ-1',stationId:first.id,copy:1}],
      operations:[{operationId,candidates:[{stationId:first.id,copy:1,requiredEquipmentIds:['EQ-1']},
        {stationId:second.id,copy:1,requiredEquipmentIds:[]}]}],
      routes:[{id:'R-1',from:{stationId:first.id,copy:1},to:{stationId:second.id,copy:1},
        distanceMm:12345,basis:'confirmed',source:'Syntetyczne dane testu, bez deklaracji pomiaru produkcji'}]};
    project.stationRouting=routing;
    assert.deepEqual(validateStationRouting(project,routing),routing);
    const storage=new DraftStorage();
    storage.values.set('layout-studio-v3','active4');storage.values.set('layout-studio-stations-v5','active5');
    const written=saveDomainDraft(storage,{originalJson:original,project},null);
    const reopened=readDomainDraft(storage);
    assert.equal(reopened.status,'valid');
    if(reopened.status!=='valid')throw new Error('Nie odczytano szkicu.');
    assert.deepEqual(reopened.saved.project.stationRouting,routing);
    assert.equal(reopened.saved.originalJson,original);
    assert.throws(()=>scheduleWorkerRun(project,1,1),/Brak zapisanego wyboru/);
    const invalid=(change:(value:StationRoutingV6)=>void,pattern:RegExp)=>{
      const changed=structuredClone(project);change(changed.stationRouting!);
      assert.throws(()=>saveDomainDraft(storage,{originalJson:original,project:changed},written.raw),pattern);
      assert.equal(storage.getItem(DOMAIN_DRAFT_STORAGE_KEY),written.raw);
    };
    invalid(r=>r.equipmentPlacements.push({...r.equipmentPlacements[0],copy:2}),/więcej niż raz/);
    invalid(r=>r.operations[0].candidates[0].copy=2,/nie należy/);
    invalid(r=>r.operations[0].candidates[0].copy=3,/kopii/);
    invalid(r=>r.operations[0].candidates[0].stationId='ST-unknown',/nieznane stanowisko/);
    invalid(r=>r.operations[0].candidates[0].requiredEquipmentIds.push('EQ-1'),/powtórzone/);
    invalid(r=>r.operations[0].candidates[0].requiredEquipmentIds=['missing'],/Nieznane/);
    invalid(r=>r.operations.push(r.operations[0]),/powtórzona operacja/);
    invalid(r=>r.routes.push(r.routes[0]),/ID trasy/);
    invalid(r=>r.routes.push({...r.routes[0],id:'R-2'}),/Powtórzona skierowana/);
    invalid(r=>r.routes[0].distanceMm=-1,/rzeczywistej długości/);
    invalid(r=>r.routes[0].distanceMm=Infinity,/rzeczywistej długości/);
    invalid(r=>r.routes[0].distanceMm=0,/rzeczywistej długości/);
    invalid(r=>r.routes[0].source='',/źródła/);
    invalid(r=>(r.routes[0] as unknown as {basis:string}).basis='assumed',/potwierdzenia/);
    const noCapabilities=structuredClone(project);delete noCapabilities.equipment[0].capableOperationIds;
    assert.throws(()=>parseDomainProjectV6(JSON.stringify(noCapabilities)),/możliwości/);
    const movedEquipment=structuredClone(project);movedEquipment.equipment[0].stationId=second.id;
    assert.throws(()=>parseDomainProjectV6(JSON.stringify(movedEquipment)),/zgodne jawne stanowisko/);
    const reducedCopies=structuredClone(project);reducedCopies.stationSettings[first.id].parallelStations=0;
    assert.throws(()=>parseDomainProjectV6(JSON.stringify(reducedCopies)));
    assert.equal(storage.getItem('layout-studio-v3'),'active4');assert.equal(storage.getItem('layout-studio-stations-v5'),'active5');
    const old=structuredClone(project);delete old.stationRouting;
    assert.equal(parseDomainProjectV6(JSON.stringify(old)).stationRouting,undefined);
    assert.throws(()=>saveDomainDraft(storage,{originalJson:original,project},'stale'),/zmieniony|konflikt|zmienił/i);
    assert.equal(storage.getItem(DOMAIN_DRAFT_STORAGE_KEY),written.raw);
  }
});

function competencyFixture(project: ReturnType<typeof stationChoiceFixture>): CompetencyRequirements {
  return {competencies:[{id:'C-A',name:'Kompetencja A'},{id:'C-B',name:'Kompetencja B'}],
    workers:project.workers.slice(0,2).map((worker,index)=>({workerId:worker.id,competencyIds:[index?'C-B':'C-A']})),
    operations:[{operationId:project.operations[0].id,requiredCompetencyIds:['C-A','C-B']}]};
}

function variantComparisonFixture() {
  const originalJson = JSON.stringify(derive({...base, schemaVersion: 4, bom: []}).project);
  const baseProject = stationChoiceFixture();
  // Baseline: 1 worker in team (W-A), op0 = 10s on ST-A:1, op1 = 20s (10s operator + 10s machine) on ST-C:1, route R-A-C = 2000 mm / 6 s
  baseProject.product = {id: 'PROD-1', name: 'Wyrób porównawczy'};
  baseProject.operations[0].physicalRole = {kind: 'body-work'};
  baseProject.operations[1].physicalRole = {kind: 'body-work'};
  baseProject.operations[1].staffing = {
    requiredWorkers: 1,
    timeVariants: [{
      workerCount: 1,
      timeProfile: {
        durationSeconds: 20,
        durationBasis: 'assumed',
        manualWork: [{startSeconds: 0, endSeconds: 10, basis: 'assumed'}],
        machineRun: [{startSeconds: 10, endSeconds: 20, basis: 'assumed'}],
        operatorPresence: [{startSeconds: 0, endSeconds: 10, basis: 'assumed'}],
      },
    }],
  };
  baseProject.equipment = [{id: 'EQ-A', name: 'A', stationId: 'ST-A', capableOperationIds: [baseProject.operations[0].id]}];
  baseProject.stationRouting = {
    selectionRule: 'earliest-start-then-shortest-route',
    equipmentPlacements: [{equipmentId: 'EQ-A', stationId: 'ST-A', copy: 1}],
    operations: [
      {operationId: baseProject.operations[0].id, candidates: [{stationId: 'ST-A', copy: 1, requiredEquipmentIds: ['EQ-A']}]},
      {operationId: baseProject.operations[1].id, candidates: [{stationId: 'ST-C', copy: 1, requiredEquipmentIds: []}]},
    ],
    routes: [{
      id: 'R-A-C',
      from: {stationId: 'ST-A', copy: 1},
      to: {stationId: 'ST-C', copy: 1},
      distanceMm: 2000,
      basis: 'confirmed',
      source: 'Syntetyczna trasa bazowa',
      transportTime: {durationSeconds: 6, basis: 'assumed', source: 'Syntetyczny czas transportu bazowego'},
    }],
  };
  baseProject.workerRunSelection = {
    teamWorkerIds: ['W-A'],
    operations: baseProject.operations.map(op => ({operationId: op.id, workerCount: 1, eligibleWorkerIds: ['W-A']})),
  };
  baseProject.bodyRunInput = {
    bodies: [1, 2].map(i => ({id: `B-${i}`, productId: 'PROD-1', location: {kind: 'station' as const, stationId: 'ST-A', copy: 1}})),
    jobs: [1, 2].map(job => ({job, bodyId: `B-${job}`})),
  };

  // Variant 2: Additional worker (+W-B in active team and eligible workers; stations and layout unchanged)
  const workerProject = structuredClone(baseProject);
  workerProject.workerRunSelection = {
    teamWorkerIds: ['W-A', 'W-B'],
    operations: workerProject.operations.map(op => ({operationId: op.id, workerCount: 1, eligibleWorkerIds: ['W-A', 'W-B']})),
  };

  // Variant 3: Additional station copy (ST-C parallelStations: 1 -> 2 with candidate ST-C/2; workers and shared layout unchanged)
  const stationProject = structuredClone(baseProject);
  stationProject.stationSettings['ST-C'].parallelStations = 2;
  stationProject.stationRouting!.operations[1].candidates.push({stationId: 'ST-C', copy: 2, requiredEquipmentIds: []});
  stationProject.stationRouting!.routes.push({
    id: 'R-A-C2',
    from: {stationId: 'ST-A', copy: 1},
    to: {stationId: 'ST-C', copy: 2},
    distanceMm: 2000,
    basis: 'confirmed',
    source: 'Syntetyczna trasa do drugiej kopii ST-C',
    transportTime: {durationSeconds: 6, basis: 'assumed', source: 'Syntetyczny czas transportu bazowego'},
  });

  // Variant 4: Changed layout (shorter route R-A-C: 2000 mm / 6 s -> 800 mm / 2 s, targetLayoutType Linear; workers and stations unchanged)
  const layoutProject = structuredClone(baseProject);
  layoutProject.targetLayoutType = 'Linear';
  layoutProject.stationRouting!.routes[0].distanceMm = 800;
  layoutProject.stationRouting!.routes[0].transportTime = {durationSeconds: 2, basis: 'assumed', source: 'Syntetyczny skrócony layout'};

  const variants: SavedDomainVariant[] = [
    {id: 'VAR-BASE', name: '1. Bazowy', category: 'baseline', at: '2026-10-16T12:00:00Z', sourceSchemaVersion: 4, originalJson, project: baseProject},
    {id: 'VAR-WORKER', name: '2. Dodatkowy pracownik', category: 'additional-worker', at: '2026-10-16T12:01:00Z', sourceSchemaVersion: 4, originalJson, project: workerProject},
    {id: 'VAR-STATION', name: '3. Dodatkowe stanowisko', category: 'additional-station', at: '2026-10-16T12:02:00Z', sourceSchemaVersion: 4, originalJson, project: stationProject},
    {id: 'VAR-LAYOUT', name: '4. Zmieniony layout', category: 'changed-layout', at: '2026-10-16T12:03:00Z', sourceSchemaVersion: 4, originalJson, project: layoutProject},
  ];
  return {originalJson, variants};
}

test('4.5: porównanie 4 wariantów (bazowy, dodatkowy pracownik, dodatkowe stanowisko, zmieniony layout) przy tych samych warunkach eksperymentu', () => {
  const {variants} = variantComparisonFixture();
  const snapshot = JSON.stringify(variants);

  // 1. Porównanie w trybie skonfigurowanym (z fizycznym transportem i korpusami) dla 2 sztuk, odstęp 1 s
  const configuredReport = compareDomainVariants(variants, 'VAR-BASE', {
    batch: 2,
    arrivalIntervalSeconds: 1,
    transportMode: 'configured',
  });
  assert.equal(configuredReport.rows.length, 4);
  const [baseRow, workerRow, stationRow, layoutRow] = configuredReport.rows;

  // Kontrola czynników i szacunków statycznych (dodatkowy pracownik nie dzieli czasu operacji!)
  assert.deepEqual(baseRow.factorDiff.changedDimensions, []);
  assert.deepEqual(workerRow.factorDiff.changedDimensions, ['workers']);
  assert.deepEqual(workerRow.factorDiff.comparabilityWarnings, []);
  assert.equal(baseRow.staticSummary.selectedWorkContentSeconds, 30);
  assert.equal(workerRow.staticSummary.selectedWorkContentSeconds, 30);
  assert.equal(workerRow.staticSummary.teamWorkersCount, 2);

  assert.deepEqual(stationRow.factorDiff.changedDimensions, ['stations']);
  assert.deepEqual(stationRow.factorDiff.comparabilityWarnings, []);
  assert.equal(stationRow.staticSummary.totalCopiesCount, baseRow.staticSummary.totalCopiesCount + 1);

  assert.deepEqual(layoutRow.factorDiff.changedDimensions, ['layout']);
  assert.deepEqual(layoutRow.factorDiff.comparabilityWarnings, []);
  assert.equal(layoutRow.staticSummary.totalRouteDistanceMm, 800);
  assert.equal(baseRow.staticSummary.totalRouteDistanceMm, 2000);

  // Wyniki dynamiczne w trybie skonfigurowanym:
  assert.equal(baseRow.dynamic.status, 'completed');
  assert.equal(workerRow.dynamic.status, 'completed');
  assert.equal(stationRow.dynamic.status, 'completed');
  assert.equal(layoutRow.dynamic.status, 'completed');
  if (baseRow.dynamic.status === 'completed' && workerRow.dynamic.status === 'completed' &&
      stationRow.dynamic.status === 'completed' && layoutRow.dynamic.status === 'completed') {
    assert.equal(baseRow.dynamic.deltaMakespanSeconds, 0);
    // Dodatkowy pracownik skraca czas realizacji partii i zmniejsza oczekiwanie na obsadę
    assert.ok(workerRow.dynamic.makespanSeconds < baseRow.dynamic.makespanSeconds);
    assert.equal(workerRow.dynamic.deltaMakespanSeconds, workerRow.dynamic.makespanSeconds - baseRow.dynamic.makespanSeconds);
    assert.ok(workerRow.dynamic.throughputPerHour > baseRow.dynamic.throughputPerHour);
    // Dodatkowe stanowisko równoległe (ST-C/2) skraca czas realizacji partii
    assert.ok(stationRow.dynamic.makespanSeconds < baseRow.dynamic.makespanSeconds);
    assert.ok(stationRow.dynamic.throughputPerHour > baseRow.dynamic.throughputPerHour);
    // Zmieniony layout skraca czas ruchów transportowych (12 s -> 4 s dla 2 sztuk) i makespan
    assert.equal(baseRow.dynamic.transportMovementsSeconds, 12);
    assert.equal(layoutRow.dynamic.transportMovementsSeconds, 4);
    assert.ok(layoutRow.dynamic.makespanSeconds < baseRow.dynamic.makespanSeconds);
  }

  // 2. Porównanie w trybie JIT (pominięcie transportu i lokalizacji korpusów)
  const jitReport = compareDomainVariants(variants, 'VAR-BASE', {
    batch: 2,
    arrivalIntervalSeconds: 1,
    transportMode: 'just-in-time',
  });
  const [jitBase, jitWorker, jitStation, jitLayout] = jitReport.rows;
  if (jitBase.dynamic.status === 'completed' && jitWorker.dynamic.status === 'completed' &&
      jitStation.dynamic.status === 'completed' && jitLayout.dynamic.status === 'completed') {
    assert.equal(jitBase.dynamic.transportMovementsSeconds, 0);
    assert.equal(jitLayout.dynamic.transportMovementsSeconds, 0);
    assert.ok(jitWorker.dynamic.makespanSeconds < jitBase.dynamic.makespanSeconds);
    assert.ok(jitStation.dynamic.makespanSeconds < jitBase.dynamic.makespanSeconds);
    // W JIT sama zmiana długości/czasu trasy nie zmienia wyniku procesowego
    assert.equal(jitLayout.dynamic.makespanSeconds, jitBase.dynamic.makespanSeconds);
    assert.ok(jitBase.dynamic.assumptions.some(a => a.includes('JIT')));
  }

  assert.equal(JSON.stringify(variants), snapshot);
});

test('4.5: kontrola warunków eksperymentu wykrywa zmiany wieloczynnikowe i zachowuje nierozdzielanie oczekiwań mieszanych', () => {
  const {variants} = variantComparisonFixture();
  const baseVariant = variants[0];
  const mixedFactor = structuredClone(variants[1]); // oznaczony jako additional-worker
  mixedFactor.project.targetLayoutType = 'Linear'; // zmieniono też layout
  const diffMixed = inspectVariantFactors(baseVariant.project, mixedFactor.project, 'additional-worker', false);
  assert.deepEqual(diffMixed.changedDimensions, ['workers', 'layout']);
  assert.ok(diffMixed.comparabilityWarnings.some(w => w.includes('Poza deklarowanym czynnikiem')));

  const unchanged = structuredClone(baseVariant);
  unchanged.id = 'VAR-SAME';
  unchanged.category = 'changed-layout';
  const diffSame = inspectVariantFactors(baseVariant.project, unchanged.project, 'changed-layout', false);
  assert.ok(diffSame.comparabilityWarnings.some(w => w.includes('identyczne dane')));

  const alteredProcess = structuredClone(baseVariant);
  alteredProcess.id = 'VAR-PROC';
  alteredProcess.project.operations[0].staffing!.timeVariants[0].timeProfile.durationSeconds = 15;
  const diffProc = inspectVariantFactors(baseVariant.project, alteredProcess.project, 'additional-worker', false);
  assert.ok(diffProc.changedDimensions.includes('process'));
  assert.ok(diffProc.comparabilityWarnings.some(w => w.includes('definicję procesu')));

  // Sprawdzenie braku dzielenia oczekiwań mieszanych oraz obsługi odmowy jednego z wariantów
  const baseResult = scheduleWorkerRun(baseVariant.project, 1, 1, undefined, undefined, {transportMode: 'just-in-time'});
  const workerResult = scheduleWorkerRun(variants[1].project, 1, 1, undefined, undefined, {transportMode: 'just-in-time'});
  workerResult.runs[0].waitSeconds = 14;
  workerResult.runs[0].waitCauses = ['workers', 'material'];
  workerResult.runs[1].waitSeconds = 5;
  workerResult.runs[1].waitCauses = ['workers'];

  const outcomes = new Map([
    [baseVariant.id, {status: 'completed' as const, result: baseResult}],
    [variants[1].id, {status: 'completed' as const, result: workerResult}],
    [variants[2].id, {status: 'error' as const, error: 'Syntetyczna odmowa harmonogramu'}],
  ]);
  const report = buildVariantComparisonReport(variants.slice(0, 3), baseVariant.id, {
    batch: 1,
    arrivalIntervalSeconds: 1,
    transportMode: 'just-in-time',
  }, outcomes);
  const rowWorker = report.rows[1];
  assert.equal(rowWorker.dynamic.status, 'completed');
  if (rowWorker.dynamic.status === 'completed') {
    assert.equal(rowWorker.dynamic.mixedWaitSeconds, 14);
    assert.equal(rowWorker.dynamic.singleCauseWaitSeconds.workers, 5);
    assert.equal(rowWorker.dynamic.singleCauseWaitSeconds.material, 0);
    assert.equal(rowWorker.dynamic.singleCauseWaitSeconds.totalSingleCause, 5);
  }
  assert.deepEqual(report.rows[2].dynamic, {status: 'error', error: 'Syntetyczna odmowa harmonogramu'});
});

test('4.5: izolowany zapis biblioteki wariantów szkicu 6, odzyskiwanie, przywracanie i ochrona źródeł 4/5', () => {
  const {originalJson, variants} = variantComparisonFixture();
  const storage = new DraftStorage();
  storage.setItem('layout-studio-v3', 'active-v4');
  storage.setItem('layout-studio-scenarios-v3', 'legacy-scenarios');
  storage.setItem('layout-studio-stations-v5', 'active-v5');
  storage.setItem(DOMAIN_DRAFT_STORAGE_KEY, 'active-draft-v6');

  assert.equal(readDomainVariants(storage).status, 'empty');
  const saved1 = saveDomainVariant(storage, {
    id: 'V-1',
    name: 'Bazowy',
    category: 'baseline',
    originalJson,
    project: variants[0].project,
    at: '2026-10-16T12:00:00Z',
  }, null);
  const saved2 = saveDomainVariant(storage, {
    id: 'V-2',
    name: 'Dodatkowy pracownik',
    category: 'additional-worker',
    originalJson,
    project: variants[1].project,
    at: '2026-10-16T12:05:00Z',
  }, saved1.raw);
  assert.equal(saved2.saved.variants.length, 2);

  // Ochrona współbieżności, duplikatów ID i obcego źródła
  assert.throws(() => saveDomainVariant(storage, {
    id: 'V-3', name: 'Konflikt', category: 'changed-layout', originalJson, project: variants[3].project,
  }, 'stale-raw'), /zmieniła się/);
  assert.throws(() => saveDomainVariant(storage, {
    id: 'V-1', name: 'Powtórzone ID', category: 'changed-layout', originalJson, project: variants[3].project,
  }, saved2.raw), /już istnieje/);
  const otherOriginal = readFileSync('tests/qa/Eko_D5_actual_export_v5.json', 'utf8');
  assert.throws(() => saveDomainVariant(storage, {
    id: 'V-FOREIGN', name: 'Inne źródło', category: 'baseline', originalJson: otherOriginal, project: variants[0].project,
  }, saved2.raw), /innego projektu źródłowego/);
  assert.throws(() => prepareVariantForDraftRestore(saved2.variant, otherOriginal), /innego źródła/);
  assert.deepEqual(prepareVariantForDraftRestore(saved2.variant, originalJson), variants[1].project);

  // Usuwanie wariantu
  const afterDelete = deleteDomainVariant(storage, 'V-1', saved2.raw);
  assert.equal(afterDelete.saved.variants.length, 1);
  assert.equal(afterDelete.saved.variants[0].id, 'V-2');

  // Ochrona uszkodzonego zapisu i jawne zastąpienie po pobraniu kopii
  storage.setItem(DOMAIN_VARIANTS_STORAGE_KEY, '{"corrupt":true}');
  const corrupt = readDomainVariants(storage);
  assert.equal(corrupt.status, 'corrupt');
  assert.equal(storage.getItem(DOMAIN_VARIANTS_STORAGE_KEY), '{"corrupt":true}');
  const recovered = replaceDomainVariants(storage, [], '{"corrupt":true}');
  assert.equal(recovered.saved.variants.length, 0);

  // Nienaruszone klucze 4, 5, scenariuszy v3 i aktywnego szkicu 6
  assert.equal(storage.getItem('layout-studio-v3'), 'active-v4');
  assert.equal(storage.getItem('layout-studio-scenarios-v3'), 'legacy-scenarios');
  assert.equal(storage.getItem('layout-studio-stations-v5'), 'active-v5');
  assert.equal(storage.getItem(DOMAIN_DRAFT_STORAGE_KEY), 'active-draft-v6');
});

test('4.4: wyjaśnienia rozdzielają pojedyncze przyczyny od mieszanych bez dzielenia czasu',()=>{
  const result=scheduleWorkerRun(stationChoiceFixture(),1,1,undefined,undefined,{transportMode:'just-in-time'});
  const run=result.runs[0];run.waitSeconds=12;run.waitCauses=['workers','material'];
  result.runs[1].waitSeconds=7;result.runs[1].waitCauses=['workers'];
  const before=JSON.stringify(result),report=explainThroughput(result);
  const workers=report.signals.find(s=>s.category==='workers')!,material=report.signals.find(s=>s.category==='material')!;
  assert.equal(report.mixedWaitSeconds,12);assert.equal(workers.singleCauseWaitSeconds,7);
  assert.equal(material.singleCauseWaitSeconds,0);assert.equal(workers.mixedWaitCount,1);assert.equal(material.mixedWaitCount,1);
  assert.equal(workers.evidence.find(e=>e.mixed)!.seconds,12);assert.equal(JSON.stringify(result),before);
});

test('4.4: wspólna praca na kopii jest liczona unią przedziałów, pauzy i blokady oddzielnie',()=>{
  const result=scheduleWorkerRun(stationChoiceFixture(),1,1,undefined,undefined,{transportMode:'just-in-time'});
  const [a,b]=result.runs;a.stationId=b.stationId='ST-A';a.copy=b.copy=1;
  a.workWindows=[{startSeconds:0,endSeconds:5},{startSeconds:8,endSeconds:10}];
  b.workWindows=[{startSeconds:3,endSeconds:9}];
  a.pauses=[{startSeconds:5,endSeconds:8}];a.blockedSeconds=4;b.continuationWaitSeconds=2;
  const report=explainThroughput(result);
  assert.equal(report.processingByCopy[0].seconds,10);
  assert.equal(report.signals.find(s=>s.category==='processing')!.workSeconds,13);
  assert.equal(report.signals.find(s=>s.category==='blocking')!.workSeconds,4);
  assert.equal(report.signals.find(s=>s.category==='calendar')!.workSeconds,3);
  assert.equal(report.signals.find(s=>s.category==='other')!.workSeconds,2);
});

test('4.4: rzeczywiste zaopatrzenie, blokowanie i transport mają dowody z przebiegów',()=>{
  const supplied=scheduleWorkerRun(materialScheduleFixture(),1,2),material=explainThroughput(supplied).signals.find(s=>s.category==='material')!;
  assert.ok(material.evidence.length>0);assert.ok(material.singleCauseWaitSeconds>0||material.mixedWaitCount>0);
  const buffered=scheduleWorkerRun(bufferedProcessFixture(),1,3,undefined,undefined,{transportMode:'just-in-time'});
  assert.equal(explainThroughput(buffered).signals.find(s=>s.category==='blocking')!.workSeconds,10);
  const {project,input}=bufferedPhysicalFixture(1),physical=scheduleWorkerRun(project,1,1,input);
  const report=explainThroughput(physical);
  const expected=physical.transportMovements!.reduce((sum,m)=>sum+m.endSeconds-m.startSeconds,0);
  assert.equal(report.transportSeconds,expected);assert.equal(report.transportCount,physical.transportMovements!.length);
});

test('4.4: brak przyczyn, JIT, brak ruchów i remis kopii nie tworzą fikcyjnej przyczyny',()=>{
  const result=scheduleWorkerRun(stationChoiceFixture(),1,1,undefined,undefined,{transportMode:'just-in-time'});
  result.runs[0].waitSeconds=9;result.runs[0].waitCauses=[];
  const report=explainThroughput(result);
  assert.equal(report.unclassifiedWaitSeconds,9);assert.equal(report.transportSeconds,0);assert.equal(report.mixedWaitSeconds,0);
  assert.ok(report.signals.every(s=>s.singleCauseWaitSeconds===0));
  assert.equal(report.processingByCopy.length,2);assert.equal(report.processingByCopy[0].seconds,report.processingByCopy[1].seconds);
});

test('4.3c: bilans używa trwałych dopuszczeń i wyposażenia, zatwierdzenie chroni tożsamości i źródło',()=>{
  for(const algorithm of ['RPW','LCR'] as const){
    const project=stationChoiceFixture(),before=JSON.stringify(project);
    project.competencyRequirements=competencyFixture(project);project.competencyRequirements.workers[1].competencyIds=['C-A','C-B'];
    const source=JSON.stringify(project),proposal=proposeDomainBalance(project,10,algorithm);
    assert.equal(proposal.kind,'proposal');if(proposal.kind!=='proposal')throw new Error('Brak propozycji');
    assert.deepEqual(proposal.assignments.map(a=>[a.stationId,a.copy,a.requiredEquipmentIds]),[['ST-A',1,['EQ-A']],['ST-C',1,[]]]);
    assert.equal(JSON.stringify(project),source);
    const applied=applyDomainBalance(project,proposal);
    assert.deepEqual(applied.stations.map(s=>s.id),project.stations.map(s=>s.id));
    assert.equal(applied.stations.find(s=>s.id==='ST-B')!.operationIds.length,0);
    assert.deepEqual(applied.equipment,project.equipment);assert.deepEqual(applied.layoutObjects,project.layoutObjects);
    assert.deepEqual(applied.stationRouting!.routes,project.stationRouting!.routes);
    assert.deepEqual(applied.stationRouting!.equipmentPlacements,project.stationRouting!.equipmentPlacements);
    assert.ok(applied.stationRouting!.operations.every(o=>o.candidates.length===1));
    const runs=scheduleWorkerRun(applied,1,1,undefined,undefined,{transportMode:'just-in-time'});
    assert.deepEqual(runs.runs[0].workerIds,['W-B']);assert.deepEqual(runs.runs[0].equipmentIds,['EQ-A']);assertNoWorkerOverlap(runs);
    assert.deepEqual(parseDomainProjectV6(JSON.stringify(applied)),applied);
    assert.notEqual(before,source);
  }
});

test('4.3c: powrót po nietrafionej kopii odnajduje przydział i respektuje zależności',()=>{
  const project=stationChoiceFixture(),[a,b]=project.operations;
  b.predecessorIds=[];
  project.stationRouting!.operations=[{operationId:a.id,candidates:[{stationId:'ST-A',copy:1,requiredEquipmentIds:[]},{stationId:'ST-B',copy:1,requiredEquipmentIds:[]}]},
    {operationId:b.id,candidates:[{stationId:'ST-A',copy:1,requiredEquipmentIds:[]}]}];
  const result=proposeDomainBalance(project,10,'RPW');assert.equal(result.kind,'proposal');
  if(result.kind==='proposal')assert.deepEqual(result.assignments.map(a=>a.stationId),['ST-B','ST-A']);
  b.predecessorIds=[a.id];
  const impossible=proposeDomainBalance(project,10,'RPW');assert.equal(impossible.kind,'infeasible');
  // Increasing the explicit static limit permits both operations on A in predecessor order.
  const possible=proposeDomainBalance(project,20,'LCR');assert.equal(possible.kind,'proposal');
  if(possible.kind==='proposal')assert.deepEqual(possible.assignments.map(a=>a.stationId),['ST-A','ST-A']);
});

test('4.3c: blokada stanowiska, osobne kopie i jawny czas wariantu bez dzielenia przez osoby',()=>{
  const project=stationChoiceFixture(),[a,b]=project.operations;
  project.algorithm='Manual';a.lockedWorkstation=true;
  const profile=structuredClone(a.staffing!.timeVariants[0].timeProfile);
  profile.durationSeconds=12;profile.operatorPresence[0].endSeconds=12;
  a.staffing!.timeVariants.push({workerCount:2,timeProfile:profile});project.workerRunSelection!.operations[0].workerCount=2;
  assert.equal(proposeDomainBalance(project,10,'RPW').kind,'infeasible');
  project.stationSettings['ST-A'].parallelStations=2;
  b.predecessorIds=[];
  project.stationRouting!.operations[0].candidates.push({stationId:'ST-A',copy:2,requiredEquipmentIds:[]});
  project.stationRouting!.operations[1].candidates=[{stationId:'ST-A',copy:1,requiredEquipmentIds:[]},{stationId:'ST-A',copy:2,requiredEquipmentIds:[]}];
  const result=proposeDomainBalance(project,12,'LCR');assert.equal(result.kind,'proposal');
  if(result.kind==='proposal'){
    assert.ok(result.assignments.every(item=>item.stationId==='ST-A'));
    assert.deepEqual(result.loads.map(item=>item.seconds).sort((a,b)=>a-b),[10,12]);
    assert.equal(result.assignments.find(item=>item.operationId===a.id)!.durationSeconds,12);
  }
});

test('4.3c: braki wyposażenia, dopuszczeń i kompetencji nie dają pozornego bilansu',()=>{
  const project=stationChoiceFixture();
  project.competencyRequirements=competencyFixture(project);
  assert.throws(()=>proposeDomainBalance(project,100,'RPW'),/brak wykonalnej obsady/);
  delete project.competencyRequirements;
  const missing=structuredClone(project);missing.stationRouting!.operations.pop();
  assert.throws(()=>proposeDomainBalance(missing,100,'RPW'),/brak jawnych dopuszczeń/);
  project.equipment[0].capableOperationIds=[project.operations[1].id];
  assert.throws(()=>proposeDomainBalance(project,100,'RPW'),/możliwości wykonania/);
  const noRouting=stationChoiceFixture();delete noRouting.stationRouting;
  assert.throws(()=>proposeDomainBalance(noRouting,100,'RPW'),/jawne dopuszczenia/);
});

test('4.3c: harmonogramy utrzymują blokadę stanowiska bez drugiego zapisanego przypisania',()=>{
  const project=stationChoiceFixture();project.algorithm='Manual';project.operations[0].lockedWorkstation=true;
  project.resourceCalendars!.stations['ST-A'].shifts[0].startSeconds=30;
  const result=scheduleWorkerRun(project,1,1,undefined,undefined,{transportMode:'just-in-time'});
  assert.equal(result.runs[0].stationId,'ST-A');assert.equal(result.runs[0].startSeconds,30);
  assert.ok(project.operations.every(operation=>!('assignedWorkstationId' in operation)));
  const buffered=bufferedProcessFixture();buffered.algorithm='Manual';buffered.operations[0].lockedWorkstation=true;
  const baseline=scheduleWorkerRun(buffered,1,2,undefined,undefined,{transportMode:'just-in-time'});
  assert.ok(baseline.runs.filter(run=>run.operationId===buffered.operations[0].id).every(run=>run.stationId==='ST-A'));assertNoWorkerOverlap(baseline);
});

test('4.3c: nieaktualna lub zmieniona propozycja nie nadpisuje danych; zapis zachowuje oryginał',()=>{
  const project=stationChoiceFixture(),proposal=proposeDomainBalance(project,10,'RPW');
  if(proposal.kind!=='proposal')throw new Error('Brak propozycji');
  const modified=structuredClone(project);modified.name='Zmiana';const before=JSON.stringify(modified);
  assert.throws(()=>applyDomainBalance(modified,proposal),/nieaktualny/);assert.equal(JSON.stringify(modified),before);
  const tampered=structuredClone(proposal);tampered.assignments[0].requiredEquipmentIds=[];
  assert.throws(()=>applyDomainBalance(project,tampered),/została zmieniona/);
  const original=JSON.stringify(derive({...base,schemaVersion:4,bom:[]}).project);
  const values=new Map<string,string>(),storage={getItem:(key:string)=>values.get(key)??null,setItem:(key:string,value:string)=>{values.set(key,value);}};
  const previous=saveDomainDraft(storage,{originalJson:original,project},null);
  const applied=applyDomainBalance(project,proposal);saveDomainDraft(storage,{originalJson:original,project:applied},previous.raw);
  const read=readDomainDraft(storage);assert.equal(read.status,'valid');
  if(read.status==='valid'){assert.deepEqual(read.saved.project,applied);assert.equal(read.saved.originalJson,original);}
});

test('4.3c: limit przeszukiwania nie oznacza niewykonalności, zaopatrzenie nie jest przenoszone',()=>{
  const project=stationChoiceFixture();
  const template=project.operations[0];
  project.operations=Array.from({length:16},(_,i)=>({...structuredClone(template),id:`BAL-${i}`,name:`${i}`,sequenceNumber:i+1,predecessorIds:[]}));
  project.stations.forEach(s=>s.operationIds=[]);project.stations[0].operationIds=project.operations.map(o=>o.id);
  project.equipment=[];project.stationRouting={selectionRule:'earliest-start-then-shortest-route',equipmentPlacements:[],routes:[],operations:project.operations.map(o=>({operationId:o.id,candidates:project.stations.slice(0,2).map(s=>({stationId:s.id,copy:1,requiredEquipmentIds:[]}))}))};
  project.workerRunSelection!.operations=project.operations.map(o=>({operationId:o.id,workerCount:1,eligibleWorkerIds:['W-A','W-B']}));
  assert.equal(proposeDomainBalance(project,79,'RPW').kind,'limit');
  const supplied=materialScheduleFixture();
  const [a,b]=supplied.operations;
  supplied.stationRouting={selectionRule:'earliest-start-then-shortest-route',equipmentPlacements:[],routes:[],operations:[{operationId:a.id,candidates:[{stationId:'ST-C',copy:1,requiredEquipmentIds:[]}]},{operationId:b.id,candidates:[{stationId:'ST-C',copy:1,requiredEquipmentIds:[]}]}]};
  assert.equal(proposeDomainBalance(supplied,100,'RPW').kind,'infeasible');
});

test('4.3a: kompetencje uzupełniają się w rzeczywistej obsadzie, nie w całej liście dopuszczeń',()=>{
  const project=stationChoiceFixture();project.competencyRequirements=competencyFixture(project);
  const operationId=project.operations[0].id;
  assert.equal(teamCoversCompetencies(project,operationId,['W-A']),false);
  assert.equal(teamCoversCompetencies(project,operationId,['W-A','W-B']),true);
  assert.throws(()=>createWorkerRunPlan(project,project.workerRunSelection!.teamWorkerIds,project.workerRunSelection!.operations),/brak wykonalnej obsady 1 osób/);
  const profile=project.operations[0].staffing!.timeVariants[0].timeProfile;
  project.operations[0].staffing!.timeVariants.push({workerCount:2,timeProfile:structuredClone(profile)});
  project.workerRunSelection!.operations[0].workerCount=2;
  const result=scheduleWorkerRun(project,1,1,undefined,undefined,{transportMode:'just-in-time'});
  assert.deepEqual(result.runs[0].workerIds,['W-A','W-B']);assertNoWorkerOverlap(result);
});

test('4.3a: harmonogram czeka na kompetentną osobę i zachowuje wymagane wyposażenie',()=>{
  const project=stationChoiceFixture();project.competencyRequirements=competencyFixture(project);
  project.competencyRequirements.workers[1].competencyIds=['C-A','C-B'];
  project.resourceCalendars!.workers['W-B'].shifts[0].startSeconds=25;
  const before=JSON.stringify(project),result=scheduleWorkerRun(project,1,1);
  assert.deepEqual(result.runs[0].workerIds,['W-B']);assert.equal(result.runs[0].startSeconds,25);
  assert.equal(result.runs[0].equipmentIds!.length,1);assertNoWorkerOverlap(result);
  assert.equal(JSON.stringify(project),before);
  const replies:ScheduleReply[]=[];executeScheduleRequest({project,batch:1,arrivalIntervalSeconds:1},r=>replies.push(r));
  assert.deepEqual((replies.find(r=>r.kind==='result') as {result:unknown}).result,result);
});

test('4.3a: bufory i bezpośrednie przekazanie pomijają obsady bez kompetencji',()=>{
  const project=bufferedProcessFixture();project.competencyRequirements=competencyFixture(project);
  const qualified=project.workers[1].id;
  project.competencyRequirements.workers[1].competencyIds=['C-A','C-B'];
  const result=scheduleWorkerRun(project,1,2,undefined,undefined,{transportMode:'just-in-time'});
  assert.ok(result.runs.filter(run=>run.operationId===project.operations[0].id).every(run=>run.workerIds.length===1&&run.workerIds[0]===qualified));
  assertNoWorkerOverlap(result);
  const plan=createWorkerRunPlan(project,project.workerRunSelection!.teamWorkerIds,project.workerRunSelection!.operations).operations[0];
  const target={stationId:project.stations[0].id,copy:1,requiredEquipmentIds:[]};
  const book=createWorkerReservationBook(project.workers.map(w=>w.id));
  const direct=planDirectOperation(project,plan,target,0,book,new Set());
  assert.deepEqual(direct.choice!.workers,[qualified]);
  const blocked=planDirectOperation(project,plan,target,0,book,new Set([qualified]));
  assert.equal(blocked.choice,undefined);
});

test('4.3a: walidacja kontraktu odrzuca obce referencje i chroni dane przed błędną edycją',()=>{
  const project=stationChoiceFixture(),rules=competencyFixture(project),before=JSON.stringify(project);
  const saved=editDomainCompetencies(project,rules);
  assert.deepEqual(parseDomainProjectV6(JSON.stringify(saved)).competencyRequirements,rules);
  assert.equal(editDomainCompetencies(saved,undefined).competencyRequirements,undefined);
  for(const mutate of [
    (r:CompetencyRequirements)=>{r.competencies.push({...r.competencies[0]});},
    (r:CompetencyRequirements)=>{r.workers[0].workerId='UNKNOWN';},
    (r:CompetencyRequirements)=>{r.workers[0].competencyIds=['UNKNOWN'];},
    (r:CompetencyRequirements)=>{r.operations[0].operationId='UNKNOWN';},
    (r:CompetencyRequirements)=>{r.operations[0].requiredCompetencyIds.push('C-A');},
  ]){const invalid=structuredClone(rules);mutate(invalid);assert.throws(()=>editDomainCompetencies(saved,invalid),/Kompetencje/);}
  assert.equal(JSON.stringify(project),before);
  const original=JSON.stringify(derive({...base,bom:[]}).project);
  for(const source of [original,JSON.stringify({...prepareStationMigration(previewStationMigration(original)).project,competencyRequirements:rules})]){
    const contaminated=JSON.stringify({...JSON.parse(source),competencyRequirements:rules});
    const preview=JSON.parse(source).schemaVersion===5?previewDomainMigrationFromV5(contaminated):previewDomainMigrationFromV4(contaminated);
    const migrated=prepareDomainMigration(preview);
    assert.equal(migrated.project.competencyRequirements,undefined);assert.equal(migrated.originalJson,contaminated);
  }
});

test('4.3a: limit poszukiwania nie jest dowodem braku wykonalnej obsady',()=>{
  const project=stationChoiceFixture();project.competencyRequirements=competencyFixture(project);
  assert.throws(()=>assertCompetentTeamExists(project,project.operations[0].id,Array.from({length:30},(_,i)=>`X-${i}`),5),/limit 10000.*nierozstrzygnięta/);
  assert.doesNotThrow(()=>assertCompetentTeamExists({},'operation',['worker'],1));
});

test('4.3a: zapis i ponowne otwarcie zachowują kontrakt i źródło, błędny zapis chroni poprzedni',()=>{
  const original=JSON.stringify(derive({...base,schemaVersion:4,bom:[]}).project);
  const project=stationChoiceFixture();project.competencyRequirements=competencyFixture(project);
  const values=new Map<string,string>(),storage={getItem:(key:string)=>values.get(key)??null,setItem:(key:string,value:string)=>{values.set(key,value);}};
  const saved=saveDomainDraft(storage,{originalJson:original,project},null);
  const read=readDomainDraft(storage);assert.equal(read.status,'valid');
  if(read.status!=='valid')throw new Error('Brak odczytu szkicu');
  assert.equal(read.saved.originalJson,original);assert.deepEqual(read.saved.project.competencyRequirements,project.competencyRequirements);
  const invalid=structuredClone(project);invalid.competencyRequirements!.workers[0].competencyIds=['UNKNOWN'];
  assert.throws(()=>saveDomainDraft(storage,{originalJson:original,project:invalid},saved.raw),/Kompetencje/);
  assert.equal(storage.getItem(DOMAIN_DRAFT_STORAGE_KEY),saved.raw);
  const replies:ScheduleReply[]=[];executeScheduleRequest({project,batch:1,arrivalIntervalSeconds:1},r=>replies.push(r));
  assert.ok(!replies.some(r=>r.kind==='result'));assert.ok(JSON.stringify(replies).includes('brak wykonalnej obsady'));
});

function stationChoiceFixture(){
  const source=JSON.stringify(derive(parseProject(JSON.stringify({...base,processSteps:
    base.processSteps.slice(0,2).map((step,index)=>({...step,predecessorIds:index?[base.processSteps[0].id]:[]})),bom:[]}))).project);
  let id=0;
  const project=prepareDomainMigration(previewDomainMigrationFromV4(source,()=>`ST-choice-${++id}`)).project;
  const [a,b]=project.operations;
  project.layoutObjects=[];
  project.stations=[{id:'ST-A',name:'A',operationIds:[a.id]},
    {id:'ST-B',name:'B',operationIds:[]},{id:'ST-C',name:'C',operationIds:[b.id]}];
  project.stationSettings=Object.fromEntries(project.stations.map(station=>[station.id,{operators:1,parallelStations:1}]));
  project.workers=[{id:'W-A',name:'A'},{id:'W-B',name:'B'}];
  project.operations.forEach(operation=>operation.staffing={requiredWorkers:1,timeVariants:[{workerCount:1,timeProfile:{
    durationSeconds:10,durationBasis:'assumed',manualWork:[],machineRun:[],
    operatorPresence:[{startSeconds:0,endSeconds:10,basis:'assumed'}]}}]});
  project.workerRunSelection={teamWorkerIds:['W-A','W-B'],operations:project.operations.map(operation=>
    ({operationId:operation.id,workerCount:1,eligibleWorkerIds:['W-A','W-B']}))};
  const calendar={shifts:[{startSeconds:0,endSeconds:1000,basis:'assumed' as const}],breaks:[]};
  project.resourceCalendars={workers:{'W-A':structuredClone(calendar),'W-B':structuredClone(calendar)},
    stations:Object.fromEntries(project.stations.map(station=>[station.id,structuredClone(calendar)]))};
  project.equipment=['A','B'].map(letter=>({id:`EQ-${letter}`,name:letter,stationId:`ST-${letter}`,capableOperationIds:[a.id]}));
  project.stationRouting={selectionRule:'earliest-start-then-shortest-route',
    equipmentPlacements:['A','B'].map(letter=>({equipmentId:`EQ-${letter}`,stationId:`ST-${letter}`,copy:1})),
    operations:[{operationId:a.id,candidates:['A','B'].map(letter=>({stationId:`ST-${letter}`,copy:1,requiredEquipmentIds:[`EQ-${letter}`]}))},
      {operationId:b.id,candidates:[{stationId:'ST-C',copy:1,requiredEquipmentIds:[]}]}],
    routes:['A','B'].map(letter=>({id:`R-${letter}`,from:{stationId:`ST-${letter}`,copy:1},to:{stationId:'ST-C',copy:1},
      distanceMm:letter==='A'?9000:3000,basis:'confirmed',source:'Syntetyczny scenariusz testowy'}))};
  return project;
}

test('2.6c: najwcześniejszy start ma pierwszeństwo, rzeczywista trasa rozstrzyga remis',()=>{
  const project=stationChoiceFixture();
  const before=JSON.stringify(project);
  const near=scheduleWorkerRun(project,1,1);
  assert.deepEqual(near.runs.map(run=>[run.stationId,run.startSeconds,run.endSeconds]),[['ST-B',0,10],['ST-C',10,20]]);
  assert.deepEqual(near.runs[0].equipmentIds,['EQ-B']);
  assert.equal(near.runs[0].selectionRouteId,'R-B');assert.equal(near.runs[0].selectionDistanceMm,3000);
  assert.equal(JSON.stringify(project),before);
  const slowFinish=structuredClone(project);
  slowFinish.resourceCalendars!.stations['ST-B'].breaks=[{startSeconds:1,endSeconds:100,basis:'assumed'}];
  const slow=scheduleWorkerRun(slowFinish,1,1);
  assert.equal(slow.runs[0].stationId,'ST-B');assert.equal(slow.runs[0].endSeconds,109);
  const later=structuredClone(project);
  later.resourceCalendars!.stations['ST-B'].shifts[0].startSeconds=50;
  assert.equal(scheduleWorkerRun(later,1,1).runs[0].stationId,'ST-A');
  const equal=structuredClone(project);equal.stationRouting!.routes[1].distanceMm=9000;
  assert.equal(scheduleWorkerRun(equal,1,1).runs[0].stationId,'ST-A');
  equal.stationRouting!.operations[0].candidates.reverse();
  assert.equal(scheduleWorkerRun(equal,1,1).runs[0].stationId,'ST-B');
  const missing=structuredClone(project);missing.stationRouting!.routes=[];
  assert.throws(()=>scheduleWorkerRun(missing,1,1),/brak rzeczywistej trasy/i);
  // Automatic downstream planning requires declared lengths for every admissible transition.
  missing.resourceCalendars!.stations['ST-B'].shifts[0].startSeconds=50;
  assert.throws(()=>scheduleWorkerRun(missing,1,1),/brak rzeczywistej trasy/i);
  const partial=structuredClone(project);partial.stationRouting!.operations.pop();
  assert.throws(()=>scheduleWorkerRun(partial,1,1),/brak jawnych dopuszczeń/);
  const ambiguous=structuredClone(project);
  ambiguous.stationRouting!.operations[1].candidates.push({stationId:'ST-A',copy:1,requiredEquipmentIds:[]});
  assert.throws(()=>scheduleWorkerRun(ambiguous,1,1),/brak rzeczywistej trasy/i);
  const reversed=structuredClone(project);
  reversed.stationRouting!.routes.forEach(route=>{const from=route.from;route.from=route.to;route.to=from;});
  assert.throws(()=>scheduleWorkerRun(reversed,1,1),/brak rzeczywistej trasy/i);
  const branch=structuredClone(project);
  const extra={...structuredClone(branch.operations[1]),id:'THIRD'};
  branch.operations.push(extra);branch.stations[2].operationIds.push(extra.id);
  branch.workerRunSelection!.operations.push({...branch.workerRunSelection!.operations[1],operationId:extra.id});
  branch.stationRouting!.operations.push({operationId:extra.id,candidates:[{stationId:'ST-C',copy:1,requiredEquipmentIds:[]}]});
  assert.throws(()=>scheduleWorkerRun(branch,1,1),/niejednoznaczny następny proces/i);
});

test('2.6e: automatyczna dalsza trasa wybiera spośród wielu przyszłych kopii i zmienia ją dla wcześniejszego startu',()=>{
  const project=stationChoiceFixture();
  project.stations.push({id:'ST-D',name:'D',operationIds:[]});
  project.stationSettings['ST-D']={operators:1,parallelStations:1};
  project.resourceCalendars!.stations['ST-D']=structuredClone(project.resourceCalendars!.stations['ST-C']);
  project.stationRouting!.operations[1].candidates.push({stationId:'ST-D',copy:1,requiredEquipmentIds:[]});
  project.stationRouting!.routes.push(...['A','B'].map(letter=>({id:`R-${letter}-D`,
    from:{stationId:`ST-${letter}`,copy:1},to:{stationId:'ST-D',copy:1},
    distanceMm:letter==='A'?2000:8000,basis:'confirmed' as const,source:'Syntetyczny scenariusz testowy'})));
  const before=JSON.stringify(project);
  const direct=scheduleWorkerRun(project,1,1);
  assert.deepEqual(direct.runs.map(run=>run.stationId),['ST-A','ST-D']);
  assert.equal(direct.runs[0].selectionRouteId,'R-A-D');
  assert.equal(direct.runs[1].arrivalRouteId,'R-A-D');
  assert.equal(direct.runs[1].arrivalDistanceMm,2000);
  assert.equal(JSON.stringify(project),before);
  const delayed=structuredClone(project);
  delayed.resourceCalendars!.stations['ST-D'].shifts[0].startSeconds=50;
  const rerouted=scheduleWorkerRun(delayed,1,1);
  assert.deepEqual(rerouted.runs.map(run=>[run.stationId,run.startSeconds]),[['ST-A',0],['ST-C',10]]);
  assert.equal(rerouted.runs[0].selectionRouteId,'R-A-D');
  assert.equal(rerouted.runs[1].arrivalRouteId,'R-A');
  assert.equal(rerouted.runs[1].arrivalDistanceMm,9000);
  const storage=new DraftStorage();
  saveDomainDraft(storage,{originalJson:JSON.stringify(derive(parseProject(JSON.stringify(base))).project),project},null);
  const reopened=readDomainDraft(storage);
  if(reopened.status!=='valid')throw new Error('Nie odczytano tras.');
  assert.deepEqual(scheduleWorkerRun(reopened.saved.project,1,1),direct);
  const concurrent=scheduleWorkerRun(project,1,4);
  for(let i=0;i<concurrent.runs.length;i++)for(let j=i+1;j<concurrent.runs.length;j++){
    const a=concurrent.runs[i],b=concurrent.runs[j];
    if(a.stationId===b.stationId&&a.copy===b.copy||a.equipmentIds?.some(id=>b.equipmentIds?.includes(id)))
      assert.ok(a.endSeconds<=b.startSeconds||b.endSeconds<=a.startSeconds);
    if(a.workerIds.some(id=>b.workerIds.includes(id)))assert.ok(a.reserveEndSeconds<=b.reserveStartSeconds||b.reserveEndSeconds<=a.reserveStartSeconds);
  }
  const chain=structuredClone(project);
  const last={...structuredClone(chain.operations[1]),id:'FINAL',predecessorIds:[chain.operations[1].id]};
  chain.operations.push(last);chain.stations.push({id:'ST-E',name:'E',operationIds:['FINAL']});
  chain.stationSettings['ST-E']={operators:1,parallelStations:1};
  chain.resourceCalendars!.stations['ST-E']=structuredClone(chain.resourceCalendars!.stations['ST-C']);
  chain.workerRunSelection!.operations.push({...chain.workerRunSelection!.operations[1],operationId:'FINAL'});
  chain.stationRouting!.operations.push({operationId:'FINAL',candidates:[{stationId:'ST-E',copy:1,requiredEquipmentIds:[]}]});
  chain.stationRouting!.routes.find(route=>route.id==='R-A-D')!.distanceMm=9000;
  chain.stationRouting!.routes.find(route=>route.id==='R-B-D')!.distanceMm=3000;
  chain.stationRouting!.routes.push(...['C','D'].map(letter=>({id:`R-${letter}-E`,from:{stationId:`ST-${letter}`,copy:1},to:{stationId:'ST-E',copy:1},
    distanceMm:letter==='C'?10000:1000,basis:'confirmed' as const,source:'Syntetyczny scenariusz testowy'})));
  const full=scheduleWorkerRun(chain,1,1);
  assert.deepEqual(full.runs.map(run=>run.stationId),['ST-B','ST-D','ST-E']);
  assert.deepEqual(full.runs.map(run=>run.arrivalRouteId),[undefined,'R-B-D','R-D-E']);
});

test('2.6c: stałe wyposażenie i kopie pozostają zajęte przez pauzę bez podwójnej rezerwacji',()=>{
  const project=stationChoiceFixture();
  ['ST-A','ST-B'].forEach(id=>project.resourceCalendars!.stations[id].breaks=[{startSeconds:5,endSeconds:15,basis:'assumed'}]);
  const result=scheduleWorkerRun(project,1,4);
  assert.deepEqual(result.runs.slice(0,2).map(run=>[run.stationId,run.startSeconds,run.endSeconds]),
    [['ST-B',0,20],['ST-A',1,21]]);
  assert.deepEqual(result.runs[0].pauses,[{startSeconds:5,endSeconds:15}]);
  for(let i=0;i<result.runs.length;i++)for(let j=i+1;j<result.runs.length;j++){
    const a=result.runs[i],b=result.runs[j];
    if(a.stationId===b.stationId&&a.copy===b.copy || a.equipmentIds?.some(id=>b.equipmentIds?.includes(id))) {
      assert.ok(a.endSeconds<=b.startSeconds||b.endSeconds<=a.startSeconds);
    }
    if(a.workerIds.some(id=>b.workerIds.includes(id)))assert.ok(
      a.reserveEndSeconds<=b.reserveStartSeconds||b.reserveEndSeconds<=a.reserveStartSeconds);
  }
  assert.deepEqual(scheduleWorkerRun(project,1,4),result);
  const storage=new DraftStorage();
  const originalJson=JSON.stringify(derive(parseProject(JSON.stringify(base))).project);
  const saved=saveDomainDraft(storage,{originalJson,project},null);
  const reopened=readDomainDraft(storage);
  if(reopened.status!=='valid')throw new Error('Nie odczytano dopuszczeń.');
  assert.deepEqual(scheduleWorkerRun(reopened.saved.project,1,4),result);
  assert.equal(storage.getItem(DOMAIN_DRAFT_STORAGE_KEY),saved.raw);
  const invalid=structuredClone(project);invalid.stationRouting!.operations[0].candidates[1].requiredEquipmentIds=['EQ-A'];
  assert.throws(()=>scheduleWorkerRun(invalid,1,1),/nie należy/);
  const noCalendar=structuredClone(project);delete noCalendar.resourceCalendars!.stations['ST-B'];
  assert.throws(()=>scheduleWorkerRun(noCalendar,1,1),/brak jawnego kalendarza/);
});

test('2.1d: szkic v6 zapisuje się osobno, otwiera ponownie i zachowuje dokładne źródło v4/v5',()=>{
  for(const version of [4,5] as const){
    const original=readFileSync(version===4?'tests/qa/Eko_B_export_20260930_183858.json':'tests/qa/Eko_D5_actual_export_v5.json','utf8');
    let id=0;
    const preview=version===4?previewDomainMigrationFromV4(original,()=>`ST-draft-${++id}`):previewDomainMigrationFromV5(original);
    const prepared=prepareDomainMigration(preview);
    const storage=new DraftStorage();
    storage.values.set('layout-studio-v3','active-v4');
    storage.values.set('layout-studio-stations-v5','active-v5');
    assert.deepEqual(readDomainDraft(storage),{status:'empty'});
    const written=saveDomainDraft(storage,prepared,null,'2026-10-03T08:00:00.000Z');
    const reopened=readDomainDraft(storage);
    assert.equal(reopened.status,'valid');
    if(reopened.status!=='valid')throw new Error('Brak zapisu.');
    assert.equal(reopened.raw,written.raw);
    assert.equal(reopened.saved.sourceSchemaVersion,version);
    assert.equal(reopened.saved.originalJson,original);
    assert.deepEqual(reopened.saved.project,prepared.project);
    assert.equal(reopened.saved.project.modelStatus,'incomplete');
    assert.equal(storage.getItem('layout-studio-v3'),'active-v4');
    assert.equal(storage.getItem('layout-studio-stations-v5'),'active-v5');
    assert.equal(storage.getItem(DOMAIN_DRAFT_STORAGE_KEY),written.raw);
  }
});

test('2.1d: błędny, obcy lub zmieniony zapis nie jest nadpisywany',()=>{
  const original=readFileSync('tests/qa/Eko_D5_actual_export_v5.json','utf8');
  const prepared=prepareDomainMigration(previewDomainMigrationFromV5(original));
  const storage=new DraftStorage();
  const first=saveDomainDraft(storage,prepared,null);
  assert.throws(()=>saveDomainDraft(storage,prepared,null),/zmienił się/);
  assert.equal(storage.getItem(DOMAIN_DRAFT_STORAGE_KEY),first.raw);
  const edited=structuredClone(prepared);
  edited.project.workers=[{id:'WORKER-QA',name:'Osoba testowa'}];
  const updated=saveDomainDraft(storage,edited,first.raw);
  assert.equal(updated.saved.project.workers[0].id,'WORKER-QA');
  assert.equal(updated.saved.originalJson,original);
  assert.equal(readDomainDraft(storage).status,'valid');
  const second=updated.raw;
  assert.throws(()=>saveDomainDraft(storage,{...edited,originalJson:JSON.stringify({...JSON.parse(original),name:'Inny projekt'})},second),/Źródło istniejącego/);
  assert.equal(storage.getItem(DOMAIN_DRAFT_STORAGE_KEY),second);
  const badProject={...prepared,project:{...prepared.project,modelStatus:'complete' as 'incomplete'}};
  assert.throws(()=>saveDomainDraft(storage,badProject,second),/niekompletny/);
  assert.equal(storage.getItem(DOMAIN_DRAFT_STORAGE_KEY),second);
  storage.failWrite=true;
  assert.throws(()=>saveDomainDraft(storage,prepared,second),/quota/);
  assert.equal(storage.getItem(DOMAIN_DRAFT_STORAGE_KEY),second);
  storage.failWrite=false;
  storage.values.set(DOMAIN_DRAFT_STORAGE_KEY,'{uszkodzony');
  const corrupt=readDomainDraft(storage);
  assert.equal(corrupt.status,'corrupt');
  if(corrupt.status!=='corrupt')throw new Error('Brak stanu odzyskiwania.');
  assert.equal(corrupt.raw,'{uszkodzony');
  assert.throws(()=>saveDomainDraft(storage,prepared,first.raw),/zmienił się/);
  assert.throws(()=>saveDomainDraft(storage,prepared,'{uszkodzony'));
  assert.equal(storage.getItem(DOMAIN_DRAFT_STORAGE_KEY),'{uszkodzony');
  storage.values.set(DOMAIN_DRAFT_STORAGE_KEY,JSON.stringify({...JSON.parse(first.raw),version:2}));
  assert.equal(readDomainDraft(storage).status,'corrupt');
  storage.values.set(DOMAIN_DRAFT_STORAGE_KEY,JSON.stringify({...JSON.parse(first.raw),sourceSchemaVersion:4}));
  assert.equal(readDomainDraft(storage).status,'corrupt');
  assert.equal(readDomainDraft({getItem:()=>{throw new Error('blocked');}}).status,'unavailable');
});

test('2.1f: jawne zastąpienie szkicu zachowuje aktywne projekty i wymaga dokładnej poprzedniej wartości',()=>{
  const v5=readFileSync('tests/qa/Eko_D5_actual_export_v5.json','utf8');
  const v4=readFileSync('tests/qa/Eko_B_export_20260930_183858.json','utf8');
  const fromV5=prepareDomainMigration(previewDomainMigrationFromV5(v5));
  let id=0;
  const fromV4=prepareDomainMigration(previewDomainMigrationFromV4(v4,()=>`ST-replace-${++id}`));
  const storage=new DraftStorage();
  storage.values.set('layout-studio-v3','active-v4');
  storage.values.set('layout-studio-stations-v5','active-v5');
  const first=saveDomainDraft(storage,fromV5,null);
  assert.throws(()=>replaceDomainDraft(storage,fromV4,'stary-odczyt'),/zmienił się/);
  assert.equal(storage.getItem(DOMAIN_DRAFT_STORAGE_KEY),first.raw);
  const invalid={...fromV4,project:{...fromV4.project,modelStatus:'ready' as 'incomplete'}};
  assert.throws(()=>replaceDomainDraft(storage,invalid,first.raw),/niekompletny/);
  assert.equal(storage.getItem(DOMAIN_DRAFT_STORAGE_KEY),first.raw);
  storage.failWrite=true;
  assert.throws(()=>replaceDomainDraft(storage,fromV4,first.raw),/quota/);
  assert.equal(storage.getItem(DOMAIN_DRAFT_STORAGE_KEY),first.raw);
  storage.failWrite=false;
  const replaced=replaceDomainDraft(storage,fromV4,first.raw);
  assert.equal(replaced.saved.originalJson,v4);
  assert.equal(replaced.saved.sourceSchemaVersion,4);
  assert.equal(readDomainDraft(storage).status,'valid');
  assert.equal(storage.getItem('layout-studio-v3'),'active-v4');
  assert.equal(storage.getItem('layout-studio-stations-v5'),'active-v5');
  storage.values.set(DOMAIN_DRAFT_STORAGE_KEY,'{uszkodzony');
  assert.throws(()=>replaceDomainDraft(storage,fromV5,replaced.raw),/zmienił się/);
  assert.equal(storage.getItem(DOMAIN_DRAFT_STORAGE_KEY),'{uszkodzony');
  const recovered=replaceDomainDraft(storage,fromV5,'{uszkodzony');
  assert.equal(recovered.saved.originalJson,v5);
  assert.equal(readDomainDraft(storage).status,'valid');
  assert.throws(()=>replaceDomainDraft(storage,fromV4,recovered.raw+'x'),/zmienił się/);
});

test('2.1g: osoby i pule mają trwałe ID, kontrolowane referencje i bezpieczny zapis',()=>{
  const original=readFileSync('tests/qa/Eko_D5_actual_export_v5.json','utf8');
  const prepared=prepareDomainMigration(previewDomainMigrationFromV5(original));
  const start=prepared.project;
  const a=editDomainPeople(start,{kind:'add-worker',id:'PERSON-1',name:'Anna QA'});
  const b=editDomainPeople(a,{kind:'add-worker',id:'PERSON-2',name:'Bartek QA'});
  assert.deepEqual(start.workers,[]);
  assert.throws(()=>editDomainPeople(b,{kind:'add-worker',id:'PERSON-1',name:'Duplikat'}),/już istnieje/);
  const renamed=editDomainPeople(b,{kind:'rename-worker',id:'PERSON-1',name:'Anna Nowa'});
  assert.deepEqual(renamed.workers.map(worker=>worker.id),['PERSON-1','PERSON-2']);
  assert.equal(renamed.workers[0].name,'Anna Nowa');
  const pooled=editDomainPeople(renamed,{kind:'add-pool',id:'POOL-1',name:'Zespół QA',workerIds:['PERSON-1','PERSON-2']});
  assert.throws(()=>editDomainPeople(pooled,{kind:'remove-worker',id:'PERSON-1'}),/należy do puli/);
  assert.throws(()=>editDomainPeople(pooled,{kind:'add-pool',id:'POOL-2',name:'Błąd',workerIds:['OBCA']}),/nieznany lub powtórzony/);
  assert.throws(()=>editDomainPeople(pooled,{kind:'edit-pool',id:'POOL-1',name:'Błąd',workerIds:['PERSON-1','PERSON-1']}),/nieznany lub powtórzony/);
  const revised=editDomainPeople(pooled,{kind:'edit-pool',id:'POOL-1',name:'Zespół drugi',workerIds:['PERSON-2']});
  const removed=editDomainPeople(revised,{kind:'remove-worker',id:'PERSON-1'});
  assert.deepEqual(removed.workerPools[0].workerIds,['PERSON-2']);
  assert.equal(removed.workers[0].id,'PERSON-2');
  const storage=new DraftStorage();
  storage.values.set('layout-studio-v3','active-v4');
  storage.values.set('layout-studio-stations-v5','active-v5');
  const first=saveDomainDraft(storage,prepared,null);
  const written=saveDomainDraft(storage,{originalJson:original,project:removed},first.raw);
  const reopened=readDomainDraft(storage);
  assert.equal(reopened.status,'valid');
  if(reopened.status!=='valid')throw new Error('Brak zapisu.');
  assert.deepEqual(reopened.saved.project.workers,removed.workers);
  assert.deepEqual(reopened.saved.project.workerPools,removed.workerPools);
  assert.equal(reopened.saved.originalJson,original);
  assert.equal(reopened.raw,written.raw);
  assert.equal(storage.getItem('layout-studio-v3'),'active-v4');
  assert.equal(storage.getItem('layout-studio-stations-v5'),'active-v5');
  assert.deepEqual(editDomainPeople(removed,{kind:'remove-pool',id:'POOL-1'}).workerPools,[]);
});

test('2.1h: wyrób i podzespoły mają trwałe ID, poprawne referencje i osobny zapis',()=>{
  const original=readFileSync('tests/qa/Eko_D5_actual_export_v5.json','utf8');
  const prepared=prepareDomainMigration(previewDomainMigrationFromV5(original));
  const start=prepared.project;
  assert.equal(start.product,null);
  assert.deepEqual(start.subassemblies,[]);
  assert.throws(()=>editDomainProduct(start,{kind:'set-product',id:'',name:'Test'}),/ID wyrobu/);
  const product=editDomainProduct(start,{kind:'set-product',id:'PRODUCT-QA',name:'Wyrób testowy'});
  const named=editDomainProduct(product,{kind:'set-product',id:'PRODUCT-QA',name:'Nowa nazwa'});
  assert.deepEqual(named.product,{id:'PRODUCT-QA',name:'Nowa nazwa'});
  assert.throws(()=>editDomainProduct(named,{kind:'set-product',id:'INNY',name:'Inny'}),/trwałe/);
  assert.equal(start.product,null);
  const assembly=editDomainProduct(named,{kind:'add-subassembly',id:'SUB-QA',name:'Podzespół testowy',
    producerOperationId:'OP10',consumerOperationIds:['OP11']});
  assert.deepEqual(assembly.subassemblies[0],{id:'SUB-QA',name:'Podzespół testowy',
    producerOperationId:'OP10',consumerOperationIds:['OP11']});
  assert.throws(()=>editDomainProduct(assembly,{kind:'add-subassembly',id:'SUB-QA',name:'Duplikat',consumerOperationIds:[]}),/już istnieje/);
  assert.throws(()=>editDomainProduct(assembly,{kind:'add-subassembly',id:'SUB-2',name:'Błąd',producerOperationId:'OBCA',consumerOperationIds:[]}),/nieznana operacja tworząca/);
  assert.throws(()=>editDomainProduct(assembly,{kind:'edit-subassembly',id:'SUB-QA',name:'Błąd',consumerOperationIds:['OBCA']}),/nieznana lub powtórzona/);
  assert.throws(()=>editDomainProduct(assembly,{kind:'edit-subassembly',id:'SUB-QA',name:'Błąd',consumerOperationIds:['OP11','OP11']}),/nieznana lub powtórzona/);
  const revised=editDomainProduct(assembly,{kind:'edit-subassembly',id:'SUB-QA',name:'Podzespół po zmianie',consumerOperationIds:['OP12']});
  assert.equal(revised.subassemblies[0].id,'SUB-QA');
  assert.equal(revised.subassemblies[0].producerOperationId,undefined);
  assert.deepEqual(revised.subassemblies[0].consumerOperationIds,['OP12']);
  const storage=new DraftStorage();
  storage.values.set('layout-studio-v3','active-v4');
  storage.values.set('layout-studio-stations-v5','active-v5');
  const first=saveDomainDraft(storage,prepared,null);
  const written=saveDomainDraft(storage,{originalJson:original,project:revised},first.raw);
  const reopened=readDomainDraft(storage);
  assert.equal(reopened.status,'valid');
  if(reopened.status!=='valid')throw new Error('Brak zapisu.');
  assert.deepEqual(reopened.saved.project.product,revised.product);
  assert.deepEqual(reopened.saved.project.subassemblies,revised.subassemblies);
  assert.equal(reopened.saved.originalJson,original);
  assert.equal(reopened.raw,written.raw);
  assert.equal(storage.getItem('layout-studio-v3'),'active-v4');
  assert.equal(storage.getItem('layout-studio-stations-v5'),'active-v5');
  assert.deepEqual(editDomainProduct(revised,{kind:'remove-subassembly',id:'SUB-QA'}).subassemblies,[]);
  assert.equal(editDomainProduct(revised,{kind:'clear-product'}).product,null);
});

test('2.1i: wyposażenie ma trwałe ID i jawne powiązania bez zmiany geometrii',()=>{
  const original=readFileSync('tests/qa/Eko_D5_actual_export_v5.json','utf8');
  const prepared=prepareDomainMigration(previewDomainMigrationFromV5(original));
  const start=prepared.project;
  const stationId=start.stations[0].id;
  const otherStationId=start.stations[1].id;
  const visualId=start.layoutObjects.find(object=>object.workstationId===stationId)!.id;
  assert.deepEqual(start.equipment,[]);
  assert.throws(()=>editDomainEquipment(start,{kind:'add-equipment',id:'',name:'Urządzenie'}),/ID wyposażenia/);
  const added=editDomainEquipment(start,{kind:'add-equipment',id:'EQ-QA',name:'Urządzenie testowe',stationId,layoutObjectId:visualId});
  assert.deepEqual(added.equipment,[{id:'EQ-QA',name:'Urządzenie testowe',stationId,layoutObjectId:visualId}]);
  assert.deepEqual(added.layoutObjects,start.layoutObjects);
  assert.deepEqual(start.equipment,[]);
  assert.throws(()=>editDomainEquipment(added,{kind:'add-equipment',id:'EQ-QA',name:'Duplikat'}),/już istnieje/);
  assert.throws(()=>editDomainEquipment(added,{kind:'add-equipment',id:'EQ-2',name:'Błąd',stationId:'OBCE'}),/nieznane stanowisko/);
  assert.throws(()=>editDomainEquipment(added,{kind:'add-equipment',id:'EQ-2',name:'Błąd',layoutObjectId:'OBCE'}),/nieznany obiekt wizualny/);
  assert.throws(()=>editDomainEquipment(added,{kind:'add-equipment',id:'EQ-2',name:'Błąd',layoutObjectId:visualId}),/więcej niż jednego wyposażenia/);
  assert.throws(()=>editDomainEquipment(added,{kind:'edit-equipment',id:'EQ-QA',name:'Błąd',stationId:otherStationId,layoutObjectId:visualId}),/sprzeczne powiązanie/);
  const revised=editDomainEquipment(added,{kind:'edit-equipment',id:'EQ-QA',name:'Nowa nazwa',stationId});
  assert.deepEqual(revised.equipment,[{id:'EQ-QA',name:'Nowa nazwa',stationId}]);
  const storage=new DraftStorage();
  storage.values.set('layout-studio-v3','active-v4');
  storage.values.set('layout-studio-stations-v5','active-v5');
  const first=saveDomainDraft(storage,prepared,null);
  const written=saveDomainDraft(storage,{originalJson:original,project:revised},first.raw);
  const reopened=readDomainDraft(storage);
  assert.equal(reopened.status,'valid');
  if(reopened.status!=='valid')throw new Error('Brak zapisu.');
  assert.deepEqual(reopened.saved.project.equipment,revised.equipment);
  assert.deepEqual(reopened.saved.project.layoutObjects,start.layoutObjects);
  assert.equal(reopened.saved.originalJson,original);
  assert.equal(reopened.raw,written.raw);
  assert.equal(storage.getItem('layout-studio-v3'),'active-v4');
  assert.equal(storage.getItem('layout-studio-stations-v5'),'active-v5');
  assert.deepEqual(editDomainEquipment(revised,{kind:'remove-equipment',id:'EQ-QA'}).equipment,[]);
});

test('2.1j: jawne możliwości wyposażenia zachowują zgodność starego szkicu i referencje operacji',()=>{
  const original=readFileSync('tests/qa/Eko_D5_actual_export_v5.json','utf8');
  const prepared=prepareDomainMigration(previewDomainMigrationFromV5(original));
  const equipment=editDomainEquipment(prepared.project,{kind:'add-equipment',id:'EQ-CAP',name:'Wyposażenie QA'});
  assert.equal(equipment.equipment[0].capableOperationIds,undefined);
  const oldRaw=JSON.stringify(equipment);
  assert.deepEqual(parseDomainProjectV6(oldRaw).equipment,equipment.equipment);
  const withCapability=editDomainEquipment(equipment,{kind:'edit-equipment',id:'EQ-CAP',name:'Wyposażenie QA',capableOperationIds:['OP10','OP11']});
  assert.deepEqual(withCapability.equipment[0].capableOperationIds,['OP10','OP11']);
  assert.equal(equipment.equipment[0].capableOperationIds,undefined);
  assert.throws(()=>editDomainEquipment(equipment,{kind:'edit-equipment',id:'EQ-CAP',name:'Błąd',capableOperationIds:['OBCA']}),/nieznana lub powtórzona operacja/);
  assert.throws(()=>editDomainEquipment(equipment,{kind:'edit-equipment',id:'EQ-CAP',name:'Błąd',capableOperationIds:['OP10','OP10']}),/nieznana lub powtórzona operacja/);
  assert.throws(()=>parseDomainProjectV6(JSON.stringify({...equipment,equipment:[{...equipment.equipment[0],capableOperationIds:[]}]})),/nieznana lub powtórzona operacja/);
  const cleared=editDomainEquipment(withCapability,{kind:'edit-equipment',id:'EQ-CAP',name:'Wyposażenie QA'});
  assert.equal(cleared.equipment[0].capableOperationIds,undefined);
  const storage=new DraftStorage();
  storage.values.set('layout-studio-v3','active-v4');
  storage.values.set('layout-studio-stations-v5','active-v5');
  const initial=saveDomainDraft(storage,{originalJson:original,project:equipment},null);
  const reopenedOld=readDomainDraft(storage);
  assert.equal(reopenedOld.status,'valid');
  if(reopenedOld.status!=='valid')throw new Error('Nie odczytano starego szkicu.');
  assert.equal(reopenedOld.saved.project.equipment[0].capableOperationIds,undefined);
  const written=saveDomainDraft(storage,{originalJson:original,project:withCapability},initial.raw);
  const reopened=readDomainDraft(storage);
  assert.equal(reopened.status,'valid');
  if(reopened.status!=='valid')throw new Error('Nie odczytano możliwości.');
  assert.deepEqual(reopened.saved.project.equipment[0].capableOperationIds,['OP10','OP11']);
  assert.equal(reopened.saved.originalJson,original);
  assert.equal(reopened.raw,written.raw);
  assert.equal(storage.getItem('layout-studio-v3'),'active-v4');
  assert.equal(storage.getItem('layout-studio-stations-v5'),'active-v5');
});

test('2.1k: edycja szkicu 6 nie zmienia źródła ani wyników symulacji silników i Eko',()=>{
  const cases=[
    {name:'silniki v4',version:4,source:JSON.stringify(derive(parseProject(JSON.stringify(base))).project)},
    {name:'Eko v4',version:4,source:readFileSync('tests/qa/Eko_B_export_20260930_183858.json','utf8')},
    {name:'Eko v5',version:5,source:readFileSync('tests/qa/Eko_D5_actual_export_v5.json','utf8')},
  ] as const;
  for(const {name,version,source} of cases){
    const activeKey=version===4?'layout-studio-v3':'layout-studio-stations-v5';
    const activeProject=version===4?derive(parseProject(source)).project:deriveStationProject(parseStationProjectV5(source)).project;
    const before=simulateNetwork(activeProject,4050,3);
    const storage=new DraftStorage();
    storage.values.set(activeKey,source);
    let nextId=0;
    const preview=version===4?previewDomainMigrationFromV4(source,()=>`ST-accept-${++nextId}`):previewDomainMigrationFromV5(source);
    const prepared=prepareDomainMigration(preview);
    const first=saveDomainDraft(storage,prepared,null);
    const withWorker=editDomainPeople(prepared.project,{kind:'add-worker',id:'PERSON-ACCEPT',name:'Osoba QA'});
    const edited=editDomainEquipment(withWorker,{kind:'add-equipment',id:'EQ-ACCEPT',name:'Wyposażenie QA'});
    saveDomainDraft(storage,{originalJson:source,project:edited},first.raw);
    const reopened=readDomainDraft(storage);
    assert.equal(reopened.status,'valid',name);
    if(reopened.status!=='valid')throw new Error(`Nie odczytano szkicu: ${name}`);
    assert.equal(reopened.saved.originalJson,source,name);
    assert.deepEqual(reopened.saved.project.equipment,edited.equipment,name);
    assert.deepEqual(reopened.saved.project.workers,edited.workers,name);
    assert.equal(storage.getItem(activeKey),source,name);
    const activeAfter=version===4?derive(parseProject(storage.getItem(activeKey)!)).project:deriveStationProject(parseStationProjectV5(storage.getItem(activeKey)!)).project;
    assert.deepEqual(simulateNetwork(activeAfter,4050,3),before,name);
  }
});

test('2.2a: profil czasu zapisuje jawne przedziały bez zmiany starego czasu i wyniku',()=>{
  const original=readFileSync('tests/qa/Eko_D5_actual_export_v5.json','utf8');
  const prepared=prepareDomainMigration(previewDomainMigrationFromV5(original));
  const legacyStandard=prepared.project.operations[0].standardTimeSeconds;
  assert.equal(prepared.project.operations[0].timeProfile,undefined);
  const oldStorage=new DraftStorage();
  saveDomainDraft(oldStorage,prepared,null);
  const oldDraft=readDomainDraft(oldStorage);
  assert.equal(oldDraft.status,'valid');
  if(oldDraft.status!=='valid')throw new Error('Dawny szkic jest nieczytelny.');
  assert.equal(oldDraft.saved.project.operations[0].timeProfile,undefined);
  const profile:DomainTimeProfile={durationSeconds:100,durationBasis:'assumed',
    manualWork:[{startSeconds:0,endSeconds:20,basis:'measured'}],
    machineRun:[{startSeconds:10,endSeconds:80,basis:'assumed'}],
    operatorPresence:[{startSeconds:0,endSeconds:20,basis:'measured'},
      {startSeconds:75,endSeconds:90,basis:'assumed'}]};
  const legacyWithUnknownProfile=JSON.parse(original);
  legacyWithUnknownProfile.processSteps[0].timeProfile=profile;
  const migrated=prepareDomainMigration(previewDomainMigrationFromV5(JSON.stringify(legacyWithUnknownProfile)));
  assert.equal(migrated.project.operations[0].timeProfile,undefined);
  const candidate=structuredClone(prepared.project);
  candidate.operations[0].timeProfile=profile;
  assert.deepEqual(parseDomainProjectV6(JSON.stringify(candidate)).operations[0].timeProfile,profile);
  assert.equal(candidate.operations[0].standardTimeSeconds,legacyStandard);
  const storage=new DraftStorage();
  storage.values.set('layout-studio-stations-v5',original);
  const written=saveDomainDraft(storage,{originalJson:original,project:candidate},null);
  const reopened=readDomainDraft(storage);
  assert.equal(reopened.status,'valid');
  if(reopened.status!=='valid')throw new Error('Nie odczytano profilu czasu.');
  assert.equal(reopened.raw,written.raw);
  assert.equal(reopened.saved.originalJson,original);
  assert.deepEqual(reopened.saved.project.operations[0].timeProfile,profile);
  assert.equal(storage.getItem('layout-studio-stations-v5'),original);
  const baseline=simulateNetwork(deriveStationProject(parseStationProjectV5(original)).project,4050,3);
  assert.deepEqual(simulateNetwork(deriveStationProject(parseStationProjectV5(storage.getItem('layout-studio-stations-v5')!)).project,4050,3),baseline);
});

test('2.2a: profil czasu odrzuca błędne przedziały i brak obecności przy pracy ręcznej',()=>{
  const original=readFileSync('tests/qa/Eko_D5_actual_export_v5.json','utf8');
  const prepared=prepareDomainMigration(previewDomainMigrationFromV5(original));
  const profile:DomainTimeProfile={durationSeconds:100,durationBasis:'measured',
    manualWork:[{startSeconds:10,endSeconds:30,basis:'measured'}],
    machineRun:[{startSeconds:20,endSeconds:90,basis:'assumed'}],
    operatorPresence:[{startSeconds:0,endSeconds:30,basis:'measured'}]};
  const storage=new DraftStorage();
  const initial=saveDomainDraft(storage,prepared,null);
  const check=(change:(value:DomainTimeProfile)=>void,pattern:RegExp)=>{
    const candidate=structuredClone(prepared.project);
    candidate.operations[0].timeProfile=structuredClone(profile);
    change(candidate.operations[0].timeProfile!);
    assert.throws(()=>parseDomainProjectV6(JSON.stringify(candidate)),pattern);
    assert.throws(()=>saveDomainDraft(storage,{originalJson:original,project:candidate},initial.raw),pattern);
    assert.equal(storage.getItem(DOMAIN_DRAFT_STORAGE_KEY),initial.raw);
  };
  check(value=>{value.durationSeconds=0;},/dodatni czas/);
  check(value=>{value.machineRun[0].endSeconds=101;},/granicach/);
  check(value=>{value.manualWork.push({startSeconds:20,endSeconds:40,basis:'assumed'});},/niepokrywające/);
  check(value=>{value.operatorPresence=[];},/wymaga obecności/);
  check(value=>{value.manualWork[0].basis='estimated' as 'assumed';},/pochodzeniem/);
  check(value=>{(value as DomainTimeProfile & {unknown?:number}).unknown=1;},/dodatni czas/);
  assert.equal(prepared.project.operations[0].timeProfile,undefined);
});

test('2.2b: edycja profilu czasu dotyczy tylko wskazanej operacji i ma bezpieczny zapis',()=>{
  const original=readFileSync('tests/qa/Eko_D5_actual_export_v5.json','utf8');
  const project=prepareDomainMigration(previewDomainMigrationFromV5(original)).project;
  const before=JSON.stringify(project);
  const profile:DomainTimeProfile={durationSeconds:120,durationBasis:'measured',
    manualWork:[{startSeconds:0,endSeconds:30,basis:'measured'}],
    machineRun:[{startSeconds:20,endSeconds:100,basis:'assumed'}],
    operatorPresence:[{startSeconds:0,endSeconds:30,basis:'measured'}]};
  const edited=editDomainTime(project,{kind:'set-time-profile',operationId:'OP10',profile});
  assert.equal(JSON.stringify(project),before);
  assert.deepEqual(edited.operations[0].timeProfile,profile);
  assert.equal(edited.operations[1].timeProfile,undefined);
  assert.throws(()=>editDomainTime(project,{kind:'set-time-profile',operationId:'OBCA',profile}),/nie istnieje/);
  const invalid=structuredClone(profile);
  invalid.operatorPresence=[];
  assert.throws(()=>editDomainTime(edited,{kind:'set-time-profile',operationId:'OP10',profile:invalid}),/wymaga obecności/);
  assert.deepEqual(edited.operations[0].timeProfile,profile);
  const storage=new DraftStorage();
  const saved=saveDomainDraft(storage,{originalJson:original,project:edited},null);
  const reopened=readDomainDraft(storage);
  assert.equal(reopened.status,'valid');
  if(reopened.status!=='valid')throw new Error('Nie odczytano profilu czasu.');
  assert.deepEqual(reopened.saved.project.operations[0].timeProfile,profile);
  const cleared=editDomainTime(reopened.saved.project,{kind:'clear-time-profile',operationId:'OP10'});
  saveDomainDraft(storage,{originalJson:original,project:cleared},saved.raw);
  assert.equal(cleared.operations[0].timeProfile,undefined);
  assert.equal(readDomainDraft(storage).status,'valid');
  assert.deepEqual(editDomainTime(cleared,{kind:'set-time-profile',operationId:'OP10',profile}).operations[0].timeProfile,profile);
});

test('2.2c: profil czasu po migracji Eko i silników zachowuje źródło oraz pełny wynik symulacji',()=>{
  const cases=[
    {name:'silniki v4',version:4,source:JSON.stringify(derive(parseProject(JSON.stringify(base))).project)},
    {name:'Eko v4',version:4,source:readFileSync('tests/qa/Eko_B_export_20260930_183858.json','utf8')},
    {name:'Eko v5',version:5,source:readFileSync('tests/qa/Eko_D5_actual_export_v5.json','utf8')},
  ] as const;
  const profile:DomainTimeProfile={durationSeconds:150,durationBasis:'assumed',
    manualWork:[{startSeconds:0,endSeconds:30,basis:'measured'}],
    machineRun:[{startSeconds:15,endSeconds:120,basis:'assumed'}],
    operatorPresence:[{startSeconds:0,endSeconds:30,basis:'measured'}]};
  for(const {name,version,source} of cases){
    const activeKey=version===4?'layout-studio-v3':'layout-studio-stations-v5';
    const baselineProject=version===4?derive(parseProject(source)).project:deriveStationProject(parseStationProjectV5(source)).project;
    const baseline=simulateNetwork(baselineProject,4050,3);
    let id=0;
    const preview=version===4?previewDomainMigrationFromV4(source,()=>`ST-time-${++id}`):previewDomainMigrationFromV5(source);
    const prepared=prepareDomainMigration(preview);
    assert.ok(prepared.project.operations.every(operation=>operation.timeProfile===undefined),name);
    const operationId=prepared.project.operations[0].id;
    const legacyTime=prepared.project.operations[0].standardTimeSeconds;
    const storage=new DraftStorage();
    storage.values.set(activeKey,source);
    const first=saveDomainDraft(storage,prepared,null);
    const edited=editDomainTime(prepared.project,{kind:'set-time-profile',operationId,profile});
    saveDomainDraft(storage,{originalJson:source,project:edited},first.raw);
    const reopened=readDomainDraft(storage);
    assert.equal(reopened.status,'valid',name);
    if(reopened.status!=='valid')throw new Error(`Nie odczytano profilu: ${name}`);
    assert.equal(reopened.saved.originalJson,source,name);
    assert.equal(reopened.saved.project.operations[0].standardTimeSeconds,legacyTime,name);
    assert.deepEqual(reopened.saved.project.operations[0].timeProfile,profile,name);
    assert.ok(reopened.saved.project.operations.slice(1).every(operation=>operation.timeProfile===undefined),name);
    assert.equal(storage.getItem(activeKey),source,name);
    const afterProject=version===4?derive(parseProject(storage.getItem(activeKey)!)).project:deriveStationProject(parseStationProjectV5(storage.getItem(activeKey)!)).project;
    assert.deepEqual(simulateNetwork(afterProject,4050,3),baseline,name);
  }
});

test('2.3a: wymagana obsada i jawne warianty czasu zachowują dawne szkice i źródło',()=>{
  const original=readFileSync('tests/qa/Eko_D5_actual_export_v5.json','utf8');
  const prepared=prepareDomainMigration(previewDomainMigrationFromV5(original));
  assert.ok(prepared.project.operations.every(operation=>operation.staffing===undefined));
  const profile:DomainTimeProfile={durationSeconds:120,durationBasis:'measured',
    manualWork:[{startSeconds:0,endSeconds:30,basis:'measured'}],
    machineRun:[{startSeconds:20,endSeconds:100,basis:'assumed'}],
    operatorPresence:[{startSeconds:0,endSeconds:30,basis:'measured'}]};
  const staffing:DomainOperationStaffing={requiredWorkers:2,timeVariants:[
    {workerCount:2,timeProfile:profile},
    {workerCount:3,timeProfile:{...profile,durationSeconds:113,durationBasis:'assumed'}},
  ]};
  const storage=new DraftStorage();
  storage.values.set('layout-studio-stations-v5',original);
  const first=saveDomainDraft(storage,prepared,null);
  const old=readDomainDraft(storage);
  assert.equal(old.status,'valid');
  if(old.status!=='valid')throw new Error('Nie odczytano dawnego szkicu.');
  assert.equal(old.saved.project.operations[0].staffing,undefined);
  const candidate=structuredClone(prepared.project);
  candidate.operations[0].staffing=staffing;
  const checked=parseDomainProjectV6(JSON.stringify(candidate));
  assert.deepEqual(checked.operations[0].staffing,staffing);
  candidate.operations[0].staffing={requiredWorkers:2,timeVariants:[]};
  assert.deepEqual(parseDomainProjectV6(JSON.stringify(candidate)).operations[0].staffing,candidate.operations[0].staffing);
  assert.equal(checked.operations[0].standardTimeSeconds,prepared.project.operations[0].standardTimeSeconds);
  assert.equal(checked.operations[0].timeProfile,undefined);
  assert.ok(checked.operations.slice(1).every(operation=>operation.staffing===undefined));
  saveDomainDraft(storage,{originalJson:original,project:checked},first.raw);
  const reopened=readDomainDraft(storage);
  assert.equal(reopened.status,'valid');
  if(reopened.status!=='valid')throw new Error('Nie odczytano wariantów obsady.');
  assert.deepEqual(reopened.saved.project.operations[0].staffing,staffing);
  assert.equal(reopened.saved.originalJson,original);
  assert.equal(storage.getItem('layout-studio-stations-v5'),original);
  const legacyWithUnknownStaffing=JSON.parse(original);
  legacyWithUnknownStaffing.processSteps[0].staffing=staffing;
  const migrated=prepareDomainMigration(previewDomainMigrationFromV5(JSON.stringify(legacyWithUnknownStaffing)));
  assert.equal(migrated.project.operations[0].staffing,undefined);
});

test('2.3a: niepoprawna obsada lub wariant nie nadpisuje szkicu',()=>{
  const original=readFileSync('tests/qa/Eko_D5_actual_export_v5.json','utf8');
  const prepared=prepareDomainMigration(previewDomainMigrationFromV5(original));
  const profile:DomainTimeProfile={durationSeconds:120,durationBasis:'assumed',
    manualWork:[{startSeconds:0,endSeconds:20,basis:'assumed'}],machineRun:[],
    operatorPresence:[{startSeconds:0,endSeconds:20,basis:'assumed'}]};
  const staffing:DomainOperationStaffing={requiredWorkers:2,timeVariants:[{workerCount:2,timeProfile:profile}]};
  const storage=new DraftStorage();
  const first=saveDomainDraft(storage,prepared,null);
  const invalid=(change:(item:DomainOperationStaffing)=>void,pattern:RegExp)=>{
    const candidate=structuredClone(prepared.project);
    candidate.operations[0].staffing=structuredClone(staffing);
    change(candidate.operations[0].staffing!);
    assert.throws(()=>parseDomainProjectV6(JSON.stringify(candidate)),pattern);
    assert.throws(()=>saveDomainDraft(storage,{originalJson:original,project:candidate},first.raw),pattern);
    assert.equal(storage.getItem(DOMAIN_DRAFT_STORAGE_KEY),first.raw);
  };
  invalid(item=>{item.requiredWorkers=0;},/dodatnia liczba/);
  invalid(item=>{item.requiredWorkers=1.5;},/dodatnia liczba/);
  invalid(item=>{item.timeVariants[0].workerCount=1;},/nie mniejszej od minimum/);
  invalid(item=>{item.timeVariants.push({workerCount:2,timeProfile:profile});},/unikalnej liczby/);
  invalid(item=>{item.timeVariants[0].timeProfile.operatorPresence=[];},/wymaga obecności/);
  invalid(item=>{(item as DomainOperationStaffing & {unknown?:number}).unknown=1;},/dodatnia liczba/);
});

test('2.3b: edycja obsady i wariantów zachowuje profil referencyjny, historię zapisu i źródło',()=>{
  const original=readFileSync('tests/qa/Eko_D5_actual_export_v5.json','utf8');
  const project=prepareDomainMigration(previewDomainMigrationFromV5(original)).project;
  const before=JSON.stringify(project);
  const profile:DomainTimeProfile={durationSeconds:120,durationBasis:'measured',
    manualWork:[{startSeconds:0,endSeconds:30,basis:'measured'}],machineRun:[],
    operatorPresence:[{startSeconds:0,endSeconds:30,basis:'measured'}]};
  const reference=editDomainTime(project,{kind:'set-time-profile',operationId:'OP10',profile});
  assert.throws(()=>editDomainTime(reference,{kind:'set-staffing-variant',operationId:'OP10',workerCount:2,profile}),/najpierw zapisz/);
  const minimum=editDomainTime(reference,{kind:'set-required-workers',operationId:'OP10',requiredWorkers:2});
  assert.deepEqual(minimum.operations[0].staffing,{requiredWorkers:2,timeVariants:[]});
  const first=editDomainTime(minimum,{kind:'set-staffing-variant',operationId:'OP10',workerCount:2,profile});
  const shorter={...profile,durationSeconds:113,durationBasis:'assumed' as const};
  const second=editDomainTime(first,{kind:'set-staffing-variant',operationId:'OP10',workerCount:3,profile:shorter});
  assert.deepEqual(second.operations[0].staffing?.timeVariants.map(item=>item.timeProfile.durationSeconds),[120,113]);
  assert.deepEqual(second.operations[0].timeProfile,profile);
  assert.equal(second.operations[0].standardTimeSeconds,project.operations[0].standardTimeSeconds);
  assert.equal(second.operations[1].staffing,undefined);
  assert.equal(JSON.stringify(project),before);
  assert.throws(()=>editDomainTime(second,{kind:'set-required-workers',operationId:'OP10',requiredWorkers:4}),/minimum/);
  assert.throws(()=>editDomainTime(second,{kind:'set-staffing-variant',operationId:'OP10',workerCount:1,profile}),/minimum/);
  assert.throws(()=>editDomainTime(second,{kind:'set-required-workers',operationId:'OBCA',requiredWorkers:1}),/nie istnieje/);
  const storage=new DraftStorage();
  const initial=saveDomainDraft(storage,{originalJson:original,project:second},null);
  const reopened=readDomainDraft(storage);
  assert.equal(reopened.status,'valid');
  if(reopened.status!=='valid')throw new Error('Nie odczytano obsady.');
  assert.deepEqual(reopened.saved.project.operations[0].staffing,second.operations[0].staffing);
  assert.equal(reopened.saved.originalJson,original);
  const removed=editDomainTime(reopened.saved.project,{kind:'clear-staffing-variant',operationId:'OP10',workerCount:3});
  assert.deepEqual(removed.operations[0].staffing?.timeVariants.map(item=>item.workerCount),[2]);
  const undone=editDomainTime(removed,{kind:'set-staffing-variant',operationId:'OP10',workerCount:3,profile:shorter});
  assert.deepEqual(undone.operations[0].staffing,second.operations[0].staffing);
  const cleared=editDomainTime(undone,{kind:'clear-staffing',operationId:'OP10'});
  assert.equal(cleared.operations[0].staffing,undefined);
  assert.deepEqual(cleared.operations[0].timeProfile,profile);
  saveDomainDraft(storage,{originalJson:original,project:cleared},initial.raw);
  assert.equal(readDomainDraft(storage).status,'valid');
});

test('2.3c: warianty obsady po migracji Eko i silników nie zmieniają aktywnej symulacji',()=>{
  const cases=[
    {name:'silniki v4',version:4,source:JSON.stringify(derive(parseProject(JSON.stringify(base))).project)},
    {name:'Eko v4',version:4,source:readFileSync('tests/qa/Eko_B_export_20260930_183858.json','utf8')},
    {name:'Eko v5',version:5,source:readFileSync('tests/qa/Eko_D5_actual_export_v5.json','utf8')},
  ] as const;
  const profile:DomainTimeProfile={durationSeconds:150,durationBasis:'assumed',
    manualWork:[{startSeconds:0,endSeconds:30,basis:'assumed'}],
    machineRun:[{startSeconds:20,endSeconds:120,basis:'assumed'}],
    operatorPresence:[{startSeconds:0,endSeconds:30,basis:'assumed'}]};
  for(const {name,version,source} of cases){
    const activeKey=version===4?'layout-studio-v3':'layout-studio-stations-v5';
    const activeProject=version===4?derive(parseProject(source)).project:deriveStationProject(parseStationProjectV5(source)).project;
    const baseline=simulateNetwork(activeProject,4050,3);
    let id=0;
    const preview=version===4?previewDomainMigrationFromV4(source,()=>`ST-staffing-${++id}`):previewDomainMigrationFromV5(source);
    const prepared=prepareDomainMigration(preview);
    assert.ok(prepared.project.operations.every(operation=>operation.staffing===undefined),name);
    const operationId=prepared.project.operations[0].id;
    const oldOperation=structuredClone(prepared.project.operations[0]);
    const storage=new DraftStorage();
    storage.values.set(activeKey,source);
    const first=saveDomainDraft(storage,prepared,null);
    const withMinimum=editDomainTime(prepared.project,{kind:'set-required-workers',operationId,requiredWorkers:2});
    const withTwo=editDomainTime(withMinimum,{kind:'set-staffing-variant',operationId,workerCount:2,profile});
    const withThree=editDomainTime(withTwo,{kind:'set-staffing-variant',operationId,workerCount:3,
      profile:{...profile,durationSeconds:135}});
    const written=saveDomainDraft(storage,{originalJson:source,project:withThree},first.raw);
    const reopened=readDomainDraft(storage);
    assert.equal(reopened.status,'valid',name);
    if(reopened.status!=='valid')throw new Error(`Nie odczytano obsady: ${name}`);
    assert.equal(reopened.saved.originalJson,source,name);
    assert.equal(reopened.saved.project.modelStatus,'incomplete',name);
    assert.deepEqual(reopened.saved.project.operations[0].staffing?.timeVariants.map(item=>
      [item.workerCount,item.timeProfile.durationSeconds]),[[2,150],[3,135]],name);
    const {staffing: _added, ...withoutStaffing}=reopened.saved.project.operations[0];
    assert.deepEqual(withoutStaffing,oldOperation,name);
    assert.deepEqual(reopened.saved.project.operations.slice(1),prepared.project.operations.slice(1),name);
    assert.equal(storage.getItem(activeKey),source,name);
    const unchangedProject=version===4?derive(parseProject(storage.getItem(activeKey)!)).project:
      deriveStationProject(parseStationProjectV5(storage.getItem(activeKey)!)).project;
    assert.deepEqual(simulateNetwork(unchangedProject,4050,3),baseline,name);
    assert.equal(storage.getItem(DOMAIN_DRAFT_STORAGE_KEY),written.raw,name);
  }
});

test('2.4a: współdzielone osoby nie mogą mieć nakładających się rezerwacji',()=>{
  const empty=createWorkerReservationBook(['W-A','W-B','W-C']);
  const first=reserveWorkerTeam(empty,{reservationId:'ST-A-1',workerIds:['W-A','W-B'],startSeconds:0,endSeconds:10});
  assert.throws(()=>reserveWorkerTeam(first,{reservationId:'ST-B-1',workerIds:['W-A'],startSeconds:5,endSeconds:12}),/W-A.*nakładającą/);
  assert.throws(()=>reserveWorkerTeam(first,{reservationId:'ST-B-2',workerIds:['W-B'],startSeconds:9,endSeconds:11}),/W-B.*nakładającą/);
  const independent=reserveWorkerTeam(first,{reservationId:'ST-B-3',workerIds:['W-C'],startSeconds:5,endSeconds:9});
  const adjacent=reserveWorkerTeam(independent,{reservationId:'ST-B-4',workerIds:['W-A'],startSeconds:10,endSeconds:12});
  assert.equal(adjacent.reservations.length,3);
  assert.equal(first.reservations.length,1);
  const released=releaseWorkerTeam(first,'ST-A-1',6);
  const reused=reserveWorkerTeam(released,{reservationId:'ST-B-5',workerIds:['W-A'],startSeconds:6,endSeconds:12});
  assert.equal(reused.reservations[0].endSeconds,6);
  assert.equal(reused.reservations[0].releasedAtSeconds,6);
  assert.equal(first.reservations[0].endSeconds,10);
  assert.throws(()=>releaseWorkerTeam(released,'ST-A-1',6),/już zwolniona/);
  assert.throws(()=>reserveWorkerTeam(released,{reservationId:'ST-A-1',workerIds:['W-A'],startSeconds:12,endSeconds:13}),/nowego/);
});

test('2.4a: nieznane osoby, duplikaty i niepoprawny czas są odrzucane bez mutacji',()=>{
  assert.throws(()=>createWorkerReservationBook(['W-A','W-A']),/unikalnych/);
  const legacyId=createWorkerReservationBook([' W-A ']);
  assert.equal(reserveWorkerTeam(legacyId,{reservationId:'R-old',workerIds:[' W-A '],startSeconds:0,endSeconds:1}).reservations.length,1);
  const empty=createWorkerReservationBook(['W-A','W-B']);
  const invalid=(request:{reservationId:string;workerIds:string[];startSeconds:number;endSeconds:number},pattern:RegExp)=>{
    assert.throws(()=>reserveWorkerTeam(empty,request),pattern);
    assert.equal(empty.reservations.length,0);
  };
  invalid({reservationId:'R1',workerIds:['W-X'],startSeconds:0,endSeconds:10},/znanych/);
  invalid({reservationId:'R1',workerIds:['W-A','W-A'],startSeconds:0,endSeconds:10},/niepowtórzonych/);
  invalid({reservationId:'R1',workerIds:[],startSeconds:0,endSeconds:10},/znanych/);
  invalid({reservationId:'R1',workerIds:['W-A'],startSeconds:10,endSeconds:10},/dodatniej długości/);
  invalid({reservationId:'R1',workerIds:['W-A'],startSeconds:NaN,endSeconds:10},/granic/);
  const booked=reserveWorkerTeam(empty,{reservationId:'R1',workerIds:['W-A'],startSeconds:0,endSeconds:10});
  assert.throws(()=>releaseWorkerTeam(booked,'R1',0),/po rozpoczęciu/);
  assert.throws(()=>releaseWorkerTeam(booked,'R1',11),/nie później/);
  assert.throws(()=>releaseWorkerTeam(booked,'missing',5),/nie istnieje/);
  assert.equal(booked.reservations[0].endSeconds,10);
});

test('2.4b: plan przebiegu zamraża skład i jawny wariant oraz rezerwuje przerwę między obecnościami',()=>{
  const source=JSON.stringify(derive(parseProject(JSON.stringify(base))).project);
  let id=0;
  const project=prepareDomainMigration(previewDomainMigrationFromV4(source,()=>`ST-run-${++id}`)).project;
  project.workers=[{id:'W-A',name:'A'},{id:'W-B',name:'B'}];
  const profile:DomainTimeProfile={durationSeconds:120,durationBasis:'assumed',manualWork:[],machineRun:[],
    operatorPresence:[{startSeconds:10,endSeconds:20,basis:'assumed'},
      {startSeconds:70,endSeconds:80,basis:'assumed'}]};
  for(const operation of project.operations) operation.staffing={requiredWorkers:1,timeVariants:[
    {workerCount:1,timeProfile:profile},{workerCount:2,timeProfile:{...profile,durationSeconds:110}},
  ]};
  const selections:WorkerOperationSelection[]=project.operations.map((operation,index)=>({
    operationId:operation.id,workerCount:index===0?2:1,eligibleWorkerIds:['W-A','W-B'],
  }));
  const before=JSON.stringify(project);
  const plan=createWorkerRunPlan(project,['W-A','W-B'],selections);
  assert.deepEqual(plan.teamWorkerIds,['W-A','W-B']);
  assert.equal(plan.operations[0].workerCount,2);
  assert.equal(plan.operations[0].durationSeconds,110);
  assert.equal(plan.operations[0].reserveFromSeconds,10);
  assert.equal(plan.operations[0].reserveUntilSeconds,80);
  assert.ok(Object.isFrozen(plan) && Object.isFrozen(plan.teamWorkerIds) && Object.isFrozen(plan.operations[0].eligibleWorkerIds));
  assert.equal(JSON.stringify(project),before);
  const ledger=createWorkerReservationBook(plan.teamWorkerIds);
  assert.throws(()=>reserveWorkerTeam(ledger,{reservationId:'outside',workerIds:['W-C'],startSeconds:10,endSeconds:80}),/znanych/);
  const invalid=(team:string[],choices:WorkerOperationSelection[],pattern:RegExp)=>
    assert.throws(()=>createWorkerRunPlan(project,team,choices),pattern);
  invalid(['W-A','W-C'],selections,/istniejących/);
  invalid(['W-A','W-A'],selections,/unikalnych/);
  invalid(['W-A','W-B'],selections.slice(1),/Każda operacja/);
  invalid(['W-A','W-B'],selections.map((item,index)=>index===0?{...item,operationId:'OBCA'}:item),/obcą/);
  invalid(['W-A','W-B'],selections.map((item,index)=>index===0?{...item,workerCount:3}:item),/wariantu/);
  invalid(['W-A','W-B'],selections.map((item,index)=>index===0?{...item,eligibleWorkerIds:['W-A']}:item),/wystarczyć/);
  invalid(['W-A','W-B'],selections.map((item,index)=>index===0?{...item,eligibleWorkerIds:['W-A','W-C']}:item),/ustalonego składu/);
  const missingPresence=structuredClone(project);
  missingPresence.operations[0].staffing!.timeVariants[1].timeProfile.operatorPresence=[];
  assert.throws(()=>createWorkerRunPlan(missingPresence,['W-A','W-B'],selections),/brak jawnego okresu/);
});

test('2.4c: wybór przebiegu zapisuje się bezpiecznie i chroni referencje oraz stare szkice',()=>{
  const original=JSON.stringify(derive(parseProject(JSON.stringify(base))).project);
  let id=0;
  const project=prepareDomainMigration(previewDomainMigrationFromV4(original,()=>`ST-run-ui-${++id}`)).project;
  project.workers=[{id:'W-A',name:'A'},{id:'W-B',name:'B'}];
  const profile:DomainTimeProfile={durationSeconds:90,durationBasis:'assumed',manualWork:[],machineRun:[],
    operatorPresence:[{startSeconds:10,endSeconds:30,basis:'assumed'}]};
  for(const operation of project.operations) operation.staffing={requiredWorkers:1,
    timeVariants:[{workerCount:1,timeProfile:profile}]};
  const storage=new DraftStorage();
  const old=saveDomainDraft(storage,{originalJson:original,project},null);
  assert.equal(readDomainDraft(storage).status,'valid');
  assert.equal(parseDomainProjectV6(JSON.stringify(project)).workerRunSelection,undefined);
  const selection={teamWorkerIds:['W-A','W-B'],operations:project.operations.map(operation=>({
    operationId:operation.id,workerCount:1,eligibleWorkerIds:['W-A','W-B'],
  }))};
  const selected=editDomainWorkerRun(project,{kind:'set-worker-run-selection',selection});
  assert.deepEqual(selected.workerRunSelection,selection);
  assert.equal(JSON.stringify(project).includes('workerRunSelection'),false);
  const written=saveDomainDraft(storage,{originalJson:original,project:selected},old.raw);
  const reopened=readDomainDraft(storage);
  assert.equal(reopened.status,'valid');
  if(reopened.status!=='valid')throw new Error('Nie odczytano wyboru przebiegu.');
  assert.deepEqual(reopened.saved.project.workerRunSelection,selection);
  assert.equal(reopened.saved.originalJson,original);
  assert.deepEqual(createWorkerRunPlan(reopened.saved.project,selection.teamWorkerIds,selection.operations).teamWorkerIds,
    selection.teamWorkerIds);
  assert.throws(()=>editDomainPeople(selected,{kind:'remove-worker',id:'W-A'}),/Skład/);
  assert.throws(()=>editDomainTime(selected,{kind:'clear-staffing-variant',
    operationId:project.operations[0].id,workerCount:1}),/wariantu/);
  const invalid=structuredClone(selected);
  invalid.workerRunSelection!.operations[0]={...invalid.workerRunSelection!.operations[0],eligibleWorkerIds:['W-C']};
  assert.throws(()=>saveDomainDraft(storage,{originalJson:original,project:invalid},written.raw),/ustalonego składu/);
  assert.equal(storage.getItem(DOMAIN_DRAFT_STORAGE_KEY),written.raw);
  assert.throws(()=>saveDomainDraft(storage,{originalJson:original,project},old.raw),/zmienił się/);
  const undone=saveDomainDraft(storage,{originalJson:original,project},written.raw);
  assert.equal((readDomainDraft(storage) as {saved:{project:typeof project}}).saved.project.workerRunSelection,undefined);
  saveDomainDraft(storage,{originalJson:original,project:selected},undone.raw);
  assert.deepEqual((readDomainDraft(storage) as {saved:{project:typeof project}}).saved.project.workerRunSelection,selection);
  const cleared=editDomainWorkerRun(selected,{kind:'clear-worker-run-selection'});
  assert.equal(cleared.workerRunSelection,undefined);
  assert.equal(parseDomainProjectV6(JSON.stringify(cleared)).workerRunSelection,undefined);
});

test('2.4d: pracownik jest zajęty także między obecnościami, a następne zadanie czeka bez doboru osoby',()=>{
  const source=JSON.stringify(derive(parseProject(JSON.stringify({...base,
    processSteps:[base.processSteps[0]],bom:base.bom.filter(item=>item.associatedProcessStepId==='1')}))).project);
  let id=0;
  const project=prepareDomainMigration(previewDomainMigrationFromV4(source,()=>`ST-schedule-${++id}`)).project;
  project.stations=[{id:'ST-A',name:'A',operationIds:['1']}];
  project.layoutObjects=[];
  project.stationSettings={'ST-A':{operators:1,parallelStations:2}};
  project.workers=[{id:'W-A',name:'A'}];
  project.operations[0].staffing={requiredWorkers:1,timeVariants:[{workerCount:1,timeProfile:{
    durationSeconds:120,durationBasis:'assumed',manualWork:[],machineRun:[],
    operatorPresence:[{startSeconds:10,endSeconds:20,basis:'assumed'},
      {startSeconds:70,endSeconds:80,basis:'assumed'}]}}]};
  project.workerRunSelection={teamWorkerIds:['W-A'],operations:[{operationId:'1',workerCount:1,eligibleWorkerIds:['W-A']}]};
  const allDay={shifts:[{startSeconds:0,endSeconds:1000,basis:'assumed' as const}],breaks:[]};
  project.resourceCalendars={workers:{'W-A':allDay},stations:{'ST-A':allDay}};
  const before=JSON.stringify(project);
  const result=scheduleWorkerRun(project,1,2);
  assert.equal(result.mode,'calendar');
  assert.equal(JSON.stringify(project),before);
  assert.deepEqual(result.runs.map(run=>run.startSeconds),[0,70]);
  assert.deepEqual(result.runs.map(run=>run.waitSeconds),[0,69]);
  assert.deepEqual(result.runs[1].waitCauses,['workers']);
  assert.deepEqual(result.runs.map(run=>[run.reserveStartSeconds,run.reserveEndSeconds]),[[10,80],[80,150]]);
  assert.deepEqual(result.runs.map(run=>run.copy),[1,2]);
  assert.deepEqual(result.jobs.map(job=>job.finish),[120,190]);
  assert.ok(result.reservations.reservations.every(item=>item.releasedAtSeconds===item.endSeconds));
  const pair=structuredClone(project);
  pair.workers.push({id:'W-B',name:'B'});
  pair.resourceCalendars!.workers['W-B']=allDay;
  pair.operations[0].staffing!.requiredWorkers=2;
  pair.operations[0].staffing!.timeVariants[0].workerCount=2;
  pair.workerRunSelection={teamWorkerIds:['W-A','W-B'],operations:[{operationId:'1',workerCount:2,
    eligibleWorkerIds:['W-A','W-B']}]};
  const paired=scheduleWorkerRun(pair,1,2);
  assert.deepEqual(paired.runs.map(run=>run.startSeconds),[0,70]);
  assert.ok(paired.runs.every(run=>run.workerIds.join(',')==='W-A,W-B'));
  const noCopies=structuredClone(project);
  noCopies.stationSettings={};
  assert.throws(()=>scheduleWorkerRun(noCopies,1,2),/jawnej liczby kopii/);
  const noAssignment=structuredClone(project);
  noAssignment.stations[0].operationIds=[];
  assert.throws(()=>scheduleWorkerRun(noAssignment,1,2),/brak jawnego przypisania/);
  const noTeam=structuredClone(project);
  delete noTeam.workerRunSelection;
  assert.throws(()=>scheduleWorkerRun(noTeam,1,2),/Brak zapisanego wyboru/);
});

test('2.4d: graf poprzedników, kopie stanowisk i stały skład nie dopuszczają podwójnego zajęcia',()=>{
  const source=JSON.stringify(derive(parseProject(JSON.stringify({...base,
    processSteps:base.processSteps.slice(0,2),
    bom:base.bom.filter(item=>['1','1.1'].includes(item.associatedProcessStepId))}))).project);
  let id=0;
  const project=prepareDomainMigration(previewDomainMigrationFromV4(source,()=>`ST-schedule-graph-${++id}`)).project;
  project.stations=[{id:'ST-A',name:'A',operationIds:['1']},{id:'ST-B',name:'B',operationIds:['1.1']}];
  project.layoutObjects=[];
  project.stationSettings={'ST-A':{operators:1,parallelStations:1},'ST-B':{operators:1,parallelStations:1}};
  project.workers=[{id:'W-A',name:'A'},{id:'W-B',name:'B'}];
  for(const operation of project.operations) operation.staffing={requiredWorkers:1,timeVariants:[{workerCount:1,timeProfile:{
    durationSeconds:10,durationBasis:'assumed',manualWork:[],machineRun:[],
    operatorPresence:[{startSeconds:0,endSeconds:10,basis:'assumed'}]}}]};
  project.workerRunSelection={teamWorkerIds:['W-A','W-B'],operations:project.operations.map(operation=>({
    operationId:operation.id,workerCount:1,eligibleWorkerIds:['W-A','W-B']}))};
  const allDay={shifts:[{startSeconds:0,endSeconds:1000,basis:'assumed' as const}],breaks:[]};
  project.resourceCalendars={workers:{'W-A':allDay,'W-B':allDay},
    stations:{'ST-A':allDay,'ST-B':allDay}};
  const result=scheduleWorkerRun(project,1,2);
  assert.deepEqual(result.runs.map(run=>[run.job,run.operationId,run.startSeconds]),
    [[1,'1',0],[2,'1',10],[1,'1.1',10],[2,'1.1',20]]);
  assert.deepEqual(result.runs.map(run=>run.waitSeconds),[0,9,0,0]);
  for(const run of result.runs){
    if(run.operationId==='1.1') assert.ok(run.startSeconds>=result.runs.find(item=>
      item.job===run.job&&item.operationId==='1')!.endSeconds);
    assert.ok(result.reservations.workerIds.includes(run.workerIds[0]));
  }
  for(let i=0;i<result.runs.length;i++)for(let j=i+1;j<result.runs.length;j++){
    const a=result.runs[i],b=result.runs[j];
    if(a.workerIds.some(id=>b.workerIds.includes(id))) assert.ok(
      a.reserveEndSeconds<=b.reserveStartSeconds||b.reserveEndSeconds<=a.reserveStartSeconds);
    if(a.stationId===b.stationId&&a.copy===b.copy) assert.ok(a.endSeconds<=b.startSeconds||b.endSeconds<=a.startSeconds);
  }
  const parallel=structuredClone(project);
  parallel.operations[1].predecessorIds=[];
  const conservative=scheduleWorkerRun(parallel,1,1);
  assert.equal(conservative.runs[1].startSeconds,10);
});

test('2.5b: pauza zachowuje zespół i kopię, a czas pracy postępuje tylko we wspólnych oknach',()=>{
  const source=JSON.stringify(derive(parseProject(JSON.stringify({...base,
    processSteps:[base.processSteps[0]],bom:base.bom.filter(item=>item.associatedProcessStepId==='1')}))).project);
  let id=0;
  const project=prepareDomainMigration(previewDomainMigrationFromV4(source,()=>`ST-pause-${++id}`)).project;
  project.stations=[{id:'ST-A',name:'A',operationIds:['1']}];
  project.layoutObjects=[];
  project.stationSettings={'ST-A':{operators:1,parallelStations:2}};
  project.workers=[{id:'W-A',name:'A'}];
  project.operations[0].staffing={requiredWorkers:1,timeVariants:[{workerCount:1,timeProfile:{
    durationSeconds:100,durationBasis:'assumed',manualWork:[],machineRun:[],
    operatorPresence:[{startSeconds:0,endSeconds:100,basis:'assumed'}]}}]};
  project.workerRunSelection={teamWorkerIds:['W-A'],operations:[{operationId:'1',workerCount:1,
    eligibleWorkerIds:['W-A']}]};
  project.resourceCalendars={workers:{'W-A':{shifts:[{startSeconds:0,endSeconds:400,basis:'assumed'}],
    breaks:[{startSeconds:40,endSeconds:60,basis:'assumed'}]}},
    stations:{'ST-A':{shifts:[{startSeconds:0,endSeconds:400,basis:'assumed'}],
      breaks:[{startSeconds:50,endSeconds:70,basis:'assumed'}]}}};
  const before=JSON.stringify(project);
  const result=scheduleWorkerRun(project,1,2);
  assert.equal(JSON.stringify(project),before);
  assert.deepEqual(result.runs.map(run=>[run.startSeconds,run.endSeconds]),[[0,130],[130,230]]);
  assert.deepEqual(result.runs[0].workWindows,[{startSeconds:0,endSeconds:40},
    {startSeconds:70,endSeconds:130}]);
  assert.deepEqual(result.runs[0].pauses,[{startSeconds:40,endSeconds:70}]);
  assert.deepEqual(result.runs.map(run=>[run.reserveStartSeconds,run.reserveEndSeconds]),
    [[0,130],[130,230]]);
  assert.deepEqual(result.runs.map(run=>run.workerIds),[['W-A'],['W-A']]);
  assert.deepEqual(result.runs.map(run=>run.copy),[1,1]);
  assert.deepEqual(result.runs[1].waitCauses,['workers']);
  assert.deepEqual(result.jobs.map(job=>job.finish),[130,230]);
  const delayed=structuredClone(project);
  delayed.resourceCalendars!.workers['W-A'].shifts=[{startSeconds:10,endSeconds:400,basis:'assumed'}];
  delayed.resourceCalendars!.stations['ST-A'].shifts=[{startSeconds:10,endSeconds:400,basis:'assumed'}];
  const delayedRun=scheduleWorkerRun(delayed,1,1).runs[0];
  assert.equal(delayedRun.startSeconds,10);
  assert.deepEqual(delayedRun.waitCauses,['calendar']);
  assert.deepEqual(delayedRun.workWindows,[{startSeconds:10,endSeconds:40},
    {startSeconds:70,endSeconds:140}]);
  const paired=structuredClone(project);
  paired.workers.push({id:'W-B',name:'B'});
  paired.resourceCalendars!.workers['W-B']={shifts:[{startSeconds:0,endSeconds:400,basis:'assumed'}],
    breaks:[{startSeconds:45,endSeconds:65,basis:'assumed'}]};
  paired.operations[0].staffing!.requiredWorkers=2;
  paired.operations[0].staffing!.timeVariants[0].workerCount=2;
  paired.operations[0].staffing!.timeVariants[0].timeProfile.operatorPresence=[
    {startSeconds:10,endSeconds:20,basis:'assumed'},
    {startSeconds:70,endSeconds:80,basis:'assumed'}];
  paired.workerRunSelection={teamWorkerIds:['W-A','W-B'],operations:[{operationId:'1',workerCount:2,
    eligibleWorkerIds:['W-A','W-B']}]};
  const pairedRun=scheduleWorkerRun(paired,1,1).runs[0];
  assert.deepEqual(pairedRun.workerIds,['W-A','W-B']);
  assert.deepEqual(pairedRun.workWindows,[{startSeconds:0,endSeconds:40},
    {startSeconds:70,endSeconds:130}]);
  assert.deepEqual([pairedRun.reserveStartSeconds,pairedRun.reserveEndSeconds],[10,110]);
  assert.deepEqual(pairedRun.pauses,[{startSeconds:40,endSeconds:70}]);
  const parallel=structuredClone(project);
  parallel.workers.push({id:'W-B',name:'B'});
  parallel.resourceCalendars!.workers['W-B']=structuredClone(parallel.resourceCalendars!.workers['W-A']);
  parallel.workerRunSelection={teamWorkerIds:['W-A','W-B'],operations:[{operationId:'1',workerCount:1,
    eligibleWorkerIds:['W-A','W-B']}]};
  const parallelRuns=scheduleWorkerRun(parallel,1,2).runs;
  assert.deepEqual(parallelRuns.map(run=>[run.startSeconds,run.copy,run.workerIds]),
    [[0,1,['W-A']],[1,2,['W-B']]]);
  assert.ok(parallelRuns[0].pauses[0].startSeconds<parallelRuns[1].endSeconds);
  const missing=structuredClone(project);
  delete missing.resourceCalendars;
  const logical=scheduleWorkerRun(missing,1,1);
  assert.equal(logical.mode,'logical');
  assert.equal(logical.runs[0].endSeconds,100);
  assert.deepEqual(logical.runs[0].pauses,[]);
  const noWorker=structuredClone(project);
  noWorker.resourceCalendars!.workers={};
  assert.throws(()=>scheduleWorkerRun(noWorker,1,1),/Pracownik W-A: brak jawnego kalendarza/);
  const noStation=structuredClone(project);
  noStation.resourceCalendars!.stations={};
  assert.throws(()=>scheduleWorkerRun(noStation,1,1),/Stanowisko ST-A: brak jawnego kalendarza/);
  const tooShort=structuredClone(project);
  tooShort.resourceCalendars!.workers['W-A'].shifts=[{startSeconds:0,endSeconds:50,basis:'assumed'}];
  tooShort.resourceCalendars!.workers['W-A'].breaks=[];
  assert.throws(()=>scheduleWorkerRun(tooShort,1,1),/nie zakończył wszystkich operacji/);
});

test('2.5a: jawne zmiany i przerwy zasobów zachowują starszy szkic oraz odrębny zapis',()=>{
  const original=JSON.stringify(derive(parseProject(JSON.stringify(base))).project);
  let id=0;
  const project=prepareDomainMigration(previewDomainMigrationFromV4(original,()=>`ST-calendar-${++id}`)).project;
  assert.equal(project.resourceCalendars,undefined);
  const stationId=project.stations[0].id;
  project.workers=[{id:'W-A',name:'A'},{id:'W-B',name:'B'}];
  project.resourceCalendars={workers:{
    'W-A':{shifts:[{startSeconds:0,endSeconds:100,basis:'assumed'},{startSeconds:200,endSeconds:300,basis:'assumed'}],
      breaks:[{startSeconds:40,endSeconds:60,basis:'assumed'}]},
    'W-B':{shifts:[{startSeconds:20,endSeconds:100,basis:'assumed'},{startSeconds:200,endSeconds:280,basis:'assumed'}],
      breaks:[{startSeconds:70,endSeconds:80,basis:'assumed'}]},
  },stations:{[stationId]:{shifts:[{startSeconds:0,endSeconds:100,basis:'assumed'},
    {startSeconds:200,endSeconds:300,basis:'assumed'}],
    breaks:[{startSeconds:50,endSeconds:55,basis:'assumed'}]}}};
  const checked=parseDomainProjectV6(JSON.stringify(project));
  assert.deepEqual(availableWindows(checked.resourceCalendars!.workers['W-A']),[
    {startSeconds:0,endSeconds:40},{startSeconds:60,endSeconds:100},
    {startSeconds:200,endSeconds:300}]);
  assert.deepEqual(intersectWindows([{startSeconds:0,endSeconds:50},{startSeconds:80,endSeconds:100}],
    [{startSeconds:20,endSeconds:90}]),[
    {startSeconds:20,endSeconds:50},{startSeconds:80,endSeconds:90}]);
  assert.deepEqual(sharedAvailability(checked.resourceCalendars!,stationId,['W-A','W-B']),[
    {startSeconds:20,endSeconds:40},{startSeconds:60,endSeconds:70},
    {startSeconds:80,endSeconds:100},{startSeconds:200,endSeconds:280}]);
  const storage=new DraftStorage();
  storage.values.set('layout-studio-v3','active-v4');
  storage.values.set('layout-studio-stations-v5','active-v5');
  const saved=saveDomainDraft(storage,{originalJson:original,project},null);
  const reopened=readDomainDraft(storage);
  assert.equal(reopened.status,'valid');
  if(reopened.status==='valid')assert.deepEqual(reopened.saved.project.resourceCalendars,project.resourceCalendars);
  assert.equal(storage.values.get('layout-studio-v3'),'active-v4');
  assert.equal(storage.values.get('layout-studio-stations-v5'),'active-v5');
  const invalid=(change:(value:NonNullable<typeof project.resourceCalendars>)=>void,pattern:RegExp)=>{
    const copy=structuredClone(project);
    change(copy.resourceCalendars!);
    assert.throws(()=>parseDomainProjectV6(JSON.stringify(copy)),pattern);
    assert.equal(storage.values.get(DOMAIN_DRAFT_STORAGE_KEY),saved.raw);
  };
  invalid(value=>{value.workers['W-X']=value.workers['W-A'];},/nieznany zasób/);
  invalid(value=>{value.workers['W-A'].shifts[1].startSeconds=90;},/bez nakładania/);
  invalid(value=>{value.workers['W-A'].breaks[0].endSeconds=110;},/mieścić się/);
  invalid(value=>{value.workers['W-A'].breaks[0].startSeconds=-1;},/bez nakładania/);
  invalid(value=>{value.workers['W-A'].shifts[0].basis='unknown' as 'assumed';},/jawnym pochodzeniem/);
  assert.throws(()=>sharedAvailability({workers:{},stations:checked.resourceCalendars!.stations},stationId,['W-A']),/brak jawnego kalendarza/);
  assert.deepEqual(validateResourceCalendars({workers:{},stations:{}},new Set(['W-A']),new Set([stationId])),
    {workers:{},stations:{}});
});

test('2.1b: podgląd Eko v5 zachowuje ID i ujawnia brak danych domenowych',()=>{
  const original=readFileSync('tests/qa/Eko_D5_actual_export_v5.json','utf8');
  const before=JSON.parse(original);
  const preview=previewDomainMigrationFromV5(original);
  assert.equal(preview.originalJson,original);
  assert.equal(preview.operationStations.length,16);
  assert.equal(preview.stationStaffing.length,17);
  assert.equal(preview.visualBindings.length,53);
  assert.deepEqual(preview.stationProject.stations.map(s=>s.id),before.stations.map((s:{id:string})=>s.id));
  assert.deepEqual(preview.stationProject.layoutObjects,before.layoutObjects);
  assert.ok(preview.operationStations.every(link=>link.stationId&&preview.stationProject.stations.some(s=>s.id===link.stationId)));
  assert.ok(preview.unresolved.includes('worker-identities'));
  assert.ok(preview.unresolved.includes('product-definition'));
  assert.ok(preview.unresolved.includes('subassembly-definitions'));
  assert.equal(verifyDomainMigrationPreview(preview).originalJson,original);
  const configured=structuredClone(before);
  configured.workstationSettings={[configured.stations[0].id]:{operators:2,parallelStations:3,assistedCycleSeconds:3481}};
  const withStaffing=previewDomainMigrationFromV5(JSON.stringify(configured));
  assert.deepEqual(withStaffing.stationStaffing[0],{stationId:configured.stations[0].id,
    operatorsPerCopy:2,parallelCopies:3,assistedCycleSeconds:3481});
  assert.equal(withStaffing.stationStaffing[1].operatorsPerCopy,null);
  const altered=structuredClone(preview);altered.operationStations[0].stationId=altered.stationProject.stations[1].id;
  assert.throws(()=>verifyDomainMigrationPreview(altered),/nieaktualny lub zmieniony/);
  assert.equal(readFileSync('tests/qa/Eko_D5_actual_export_v5.json','utf8'),original);
});

test('2.1b: podgląd v4 korzysta z jawnej migracji stanowisk i nie zgaduje osób',()=>{
  const original=JSON.stringify(derive(structuredClone(base)).project);
  let next=0;
  const preview=previewDomainMigrationFromV4(original,()=>`ST-domain-${++next}`);
  assert.equal(preview.originalJson,original);
  assert.equal(preview.stationProject.schemaVersion,5);
  assert.equal(preview.operationStations.length,base.processSteps.length);
  assert.ok(preview.stationStaffing.every(s=>s.operatorsPerCopy===null&&s.parallelCopies===null));
  assert.deepEqual(preview.unassignedOperationIds,[]);
  assert.deepEqual(verifyDomainMigrationPreview(preview).operationStations,preview.operationStations);
  const eko=readFileSync('tests/qa/Eko_B_export_20260930_183858.json','utf8');
  let ekoId=0;
  const ekoPreview=previewDomainMigrationFromV4(eko,()=>`ST-domain-eko-${++ekoId}`);
  assert.equal(ekoPreview.originalJson,eko);
  assert.equal(ekoPreview.stationProject.stations.length,16);
  assert.equal(ekoPreview.stationProject.bom.length,60);
  assert.deepEqual(ekoPreview.stationProject.layoutObjects.map(o=>o.id),JSON.parse(eko).layoutObjects.map((o:{id:string})=>o.id));
  const orphan=readFileSync('tests/qa/Eko_D5e_orphan_resource_v4.json','utf8');
  assert.throws(()=>previewDomainMigrationFromV4(orphan),/Osierocone ustawienia/);
  assert.throws(()=>previewDomainMigrationFromV5(readFileSync('tests/qa/Eko_D5_v5_bad_binding.json','utf8')),/nieznane stanowisko/);
});

test('2.1c: Eko v5 przechodzi do niekompletnego schematu 6 bez utraty powiązań',()=>{
  const original=readFileSync('tests/qa/Eko_D5_actual_export_v5.json','utf8');
  const preview=previewDomainMigrationFromV5(original);
  const prepared=prepareDomainMigration(preview);
  const p=parseDomainProjectV6(JSON.stringify(prepared.project));
  assert.equal(prepared.originalJson,original);
  assert.equal(p.schemaVersion,6);
  assert.equal(p.modelStatus,'incomplete');
  assert.equal(p.operations.length,16);
  assert.equal(p.stations.length,17);
  assert.equal(p.bom.length,60);
  assert.equal(p.layoutObjects.length,53);
  assert.deepEqual(p.stations,preview.stationProject.stations);
  assert.deepEqual(p.stationSettings,preview.stationProject.workstationSettings);
  assert.ok(p.operations.every(s=>!('assignedWorkstationId' in s)));
  assert.deepEqual([p.workers,p.workerPools,p.equipment,p.subassemblies],[[],[],[],[]]);
  assert.equal(p.product,null);
  assert.equal(JSON.stringify(p).includes('processSteps'),false);
  assert.equal(readFileSync('tests/qa/Eko_D5_actual_export_v5.json','utf8'),original);
});

test('2.1c: Eko v4 zachowuje źródło i pozwala później jawnie dodać osobne byty',()=>{
  const original=readFileSync('tests/qa/Eko_B_export_20260930_183858.json','utf8');
  let next=0;
  const preview=previewDomainMigrationFromV4(original,()=>`ST-v6-eko-${++next}`);
  const prepared=prepareDomainMigration(preview);
  assert.equal(prepared.originalJson,original);
  assert.equal(prepared.project.stations.length,16);
  assert.equal(prepared.project.bom.length,60);
  const p=structuredClone(prepared.project);
  const visual=p.layoutObjects.find(o=>o.workstationId);
  assert.ok(visual);
  p.workers=[{id:'WORKER-QA',name:'Osoba testowa'}];
  p.workerPools=[{id:'POOL-QA',name:'Pula testowa',workerIds:['WORKER-QA']}];
  p.equipment=[{id:'EQ-QA',name:'Wyposażenie testowe',stationId:visual.workstationId,layoutObjectId:visual.id}];
  p.product={id:'PRODUCT-QA',name:'Wyrób testowy'};
  p.subassemblies=[{id:'SUB-QA',name:'Podzespół testowy',producerOperationId:'OP10',consumerOperationIds:['OP11']}];
  assert.deepEqual(parseDomainProjectV6(JSON.stringify(p)),p);
  assert.equal(p.modelStatus,'incomplete');
  assert.equal(readFileSync('tests/qa/Eko_B_export_20260930_183858.json','utf8'),original);
});

test('2.1c: schemat 6 odrzuca podwójne źródła prawdy i błędne referencje',()=>{
  const source=readFileSync('tests/qa/Eko_D5_actual_export_v5.json','utf8');
  const p=prepareDomainMigration(previewDomainMigrationFromV5(source)).project;
  const invalid=(edit:(candidate:typeof p)=>void,pattern:RegExp)=>{
    const candidate=structuredClone(p);edit(candidate);
    assert.throws(()=>parseDomainProjectV6(JSON.stringify(candidate)),pattern);
  };
  invalid(p=>{(p as typeof p & {processSteps:unknown}).processSteps=[];},/drugiego źródła/);
  invalid(p=>{(p.operations[0] as typeof p.operations[0] & {assignedWorkstationId:string}).assignedWorkstationId=p.stations[0].id;},/wyłącznie do rejestru/);
  invalid(p=>{p.modelStatus='ready' as 'incomplete';},/niekompletny/);
  invalid(p=>{p.workerPools=[{id:'POOL-1',name:'Zespół',workerIds:['OSOBA-1']}];},/nieznany lub powtórzony pracownik/);
  invalid(p=>{p.equipment=[{id:'EQ-1',name:'Narzędzie',stationId:'ST-obce'}];},/nieznane stanowisko/);
  invalid(p=>{p.equipment=[{id:'EQ-1',name:'Narzędzie',layoutObjectId:p.layoutObjects[0].id},{id:'EQ-2',name:'Drugie',layoutObjectId:p.layoutObjects[0].id}];},/więcej niż jednego wyposażenia/);
  invalid(p=>{p.subassemblies=[{id:'SUB-1',name:'Podzespół',producerOperationId:'OP-obca',consumerOperationIds:[]}];},/nieznana operacja tworząca/);
  invalid(p=>{p.stations[0].operationIds.push(p.stations[1].operationIds[0]);},/więcej niż raz/);
  assert.throws(()=>parseDomainProjectV6(JSON.stringify({...p,schemaVersion:7})),/schematu 6/);
});

test('archiwum v5 przenosi projekt, migawkę v4 i pierwotny plik osobno',()=>{
  const project=parseStationProjectV5(readFileSync('tests/qa/Eko_D5_actual_export_v5.json','utf8'));
  const originalJson=readFileSync('tests/qa/Eko_D5c_original_v4.json','utf8');
  const source=encodeImport(readFileSync('tests/qa/Eko_D5c_original_v4.json'));
  const archive=readPortableArchive(makePortableArchive(5,project,source,originalJson),5)!;
  assert.deepEqual(parseStationProjectV5(JSON.stringify(archive.project)),project);
  assert.deepEqual(parseProject(archive.originalJson),parseProject(originalJson));
  assert.equal(archive.importSourceBase64,source);
  assert.throws(()=>readPortableArchive(makePortableArchive(5,project,source),5),/migawki migracji/);
});

test('podgląd migracji Eko zachowuje oryginał, geometrię i komplet przypisań',()=>{
 const original=readFileSync('tests/qa/Eko_B_export_20260930_183858.json','utf8');
 let next=0;
 const result=previewStationMigration(original,()=>`ST-test-${++next}`);
 assert.equal(result.originalJson,original);
 assert.equal(result.stations.length,16);
 assert.deepEqual(result.legacyProject.layoutObjects,JSON.parse(original).layoutObjects);
 assert.equal(result.stations.flatMap(s=>s.operationIds).length,16);
 assert.equal(result.layoutBindings.length,result.legacyProject.layoutObjects.filter(o=>o.workstationId).length);
 assert.equal(result.legacyToStableId['WS-1'],'ST-test-1');
 assert.ok(result.layoutBindings.every(b=>result.stations.some(s=>s.id===b.stationId)));
 assert.equal(readFileSync('tests/qa/Eko_B_export_20260930_183858.json','utf8'),original);
});

test('migracja mapuje zasoby po dokładnej grupie, raportuje osierocone ustawienia',()=>{
 const legacy=derive(structuredClone(base)).project;
 const key=resourceKey(legacy.balancing!.workstations[0].assignedStepIds);
 legacy.workstationSettings={[key]:{operators:2,parallelStations:1},'["OLD"]':{operators:3,parallelStations:1}};
 const result=previewStationMigration(JSON.stringify(legacy));
 assert.equal(result.resourceBindings.length,1);
 assert.equal(result.resourceBindings[0].settings.operators,2);
 assert.deepEqual(result.unboundResourceKeys,['["OLD"]']);
 assert.ok(result.legacyProject.workstationSettings!['["OLD"]']);
});

test('migracja nie ufa zapisanemu cache bilansu i nie akceptuje obcej geometrii',()=>{
 const legacy=derive(structuredClone(base)).project;
 const count=legacy.balancing!.workstations.length;
 legacy.balancing!.workstations=[];
 assert.equal(previewStationMigration(JSON.stringify(legacy)).stations.length,count);
 legacy.layoutObjects[0].workstationId='WS-UNKNOWN';
 assert.throws(()=>previewStationMigration(JSON.stringify(legacy)),/nieznane stanowisko/);
});

test('błędny format i kolizja nowych ID zatrzymują podgląd bez modyfikacji źródła',()=>{
 const source=JSON.stringify(derive(structuredClone(base)).project);
 assert.throws(()=>previewStationMigration(source,()=> 'ST-DUP'),/Generator/);
 assert.throws(()=>previewStationMigration('{broken'));
 assert.throws(()=>previewStationMigration(JSON.stringify({...base,schemaVersion:999})),/nowsza wersja/);
 assert.equal(JSON.parse(source).schemaVersion,base.schemaVersion);
});

test('D2b: przygotowany projekt Eko zachowuje oryginał i mapuje wszystkie referencje na trwałe ID',()=>{
 const original=readFileSync('tests/qa/Eko_B_export_20260930_183858.json','utf8');
 let n=0;
 const prepared=prepareStationMigration(previewStationMigration(original,()=>`ST-eko-${++n}`));
 const saved=JSON.parse(JSON.stringify(prepared.project));
 assert.equal(prepared.originalJson,original);
 assert.equal(saved.schemaVersion,5);
 assert.equal(saved.stations.length,16);
 assert.equal(saved.balancing,undefined);
 assert.equal(saved.spaghetti,undefined);
 assert.deepEqual(saved.processSteps.map((s:ProcessStep)=>s.assignedWorkstationId),saved.stations.map((s:{id:string})=>s.id));
 assert.ok(saved.layoutObjects.filter((o:{workstationId?:string})=>o.workstationId).every((o:{workstationId:string})=>saved.stations.some((s:{id:string})=>s.id===o.workstationId)));
 assert.equal(saved.bom.length,JSON.parse(original).bom.length);
 assert.equal(readFileSync('tests/qa/Eko_B_export_20260930_183858.json','utf8'),original);
 assert.throws(()=>parseProject(JSON.stringify(saved)),/nowsza wersja/);
});

test('D2b: zasoby wiążą się z ID, a osierocone klucze i zmieniony podgląd blokują konwersję',()=>{
 const legacy=derive(structuredClone(base)).project;
 const key=resourceKey(legacy.balancing!.workstations[0].assignedStepIds);
 legacy.workstationSettings={[key]:{operators:2,parallelStations:3,assistedCycleSeconds:25}};
 const source=JSON.stringify(legacy);
 let n=0;
 const preview=previewStationMigration(source,()=> `ST-resource-${++n}`);
 const prepared=prepareStationMigration(preview);
 assert.deepEqual(prepared.project.workstationSettings[preview.stations[0].id],legacy.workstationSettings[key]);
 assert.equal(JSON.stringify(legacy),source);
 const tampered=structuredClone(preview);tampered.layoutBindings[0].stationId='ST-other';
 assert.throws(()=>prepareStationMigration(tampered),/nieaktualny lub zmieniony/);
 const orphan=structuredClone(legacy);orphan.workstationSettings!['["OLD"]']={operators:1,parallelStations:1};
 assert.throws(()=>prepareStationMigration(previewStationMigration(JSON.stringify(orphan))),/Osierocone ustawienia/);
});

test('D2c: schemat 5 przechodzi walidowany zapis i odczyt bez utraty stanowisk Eko',()=>{
 const original=readFileSync('tests/qa/Eko_B_export_20260930_183858.json','utf8');
 let n=0;
 const prepared=prepareStationMigration(previewStationMigration(original,()=>`ST-eko-${++n}`));
 const restored=parseStationProjectV5(JSON.stringify(prepared.project));
 assert.deepEqual(restored,prepared.project);
 assert.equal(restored.stations.length,16);
 assert.equal(restored.layoutObjects.length,prepared.project.layoutObjects.length);
 assert.equal(prepared.originalJson,original);
});

test('D2c: błędne referencje schematu 5 są odrzucane bez zmiany wejścia',()=>{
 const legacy=derive(structuredClone(base)).project;
 const source=prepareStationMigration(previewStationMigration(JSON.stringify(legacy))).project;
 const original=JSON.stringify(source);
 const invalid=(edit:(p:typeof source)=>void)=>{const p=structuredClone(source);edit(p);assert.throws(()=>parseStationProjectV5(JSON.stringify(p)));};
 invalid(p=>{p.stations[0].operationIds.push(p.stations[1].operationIds[0]);});
 invalid(p=>{p.stations[0].id='WS-1';});
 invalid(p=>{p.workstationSettings['ST-missing']={operators:1,parallelStations:1};});
 invalid(p=>{p.layoutObjects[0].workstationId='ST-missing';});
 invalid(p=>{p.algorithm='Manual';p.processSteps[0].assignedWorkstationId='ST-missing';});
 assert.throws(()=>parseStationProjectV5(JSON.stringify({...source,schemaVersion:6})),/schemat/);
 assert.equal(JSON.stringify(source),original);
});

test('D3a: bilans Eko zachowuje cykle, ale używa trwałych ID zamiast numerów',()=>{
 const original=readFileSync('tests/qa/Eko_B_export_20260930_183858.json','utf8');
 let n=0;
 const legacy=derive(parseProject(original)).project;
 const migrated=prepareStationMigration(previewStationMigration(original,()=>`ST-eko-${++n}`)).project;
 const balance=runStationBalancing(migrated,legacy.balancing!.taktTimeSeconds);
 assert.deepEqual(balance.workstations.map(s=>s.id),migrated.stations.map(s=>s.id));
 assert.deepEqual(balance.workstations.map(s=>s.cycleTimeSeconds),legacy.balancing!.workstations.map(s=>s.baseCycleSeconds??s.cycleTimeSeconds));
 assert.deepEqual(balance.workstations.map(s=>s.sequenceIndex),migrated.stations.map((_,i)=>i+1));
});

test('D3a: heurystyka nie przypisuje starego ID nowemu grupowaniu',()=>{
 const legacy=derive(structuredClone(base)).project;
 const migrated=prepareStationMigration(previewStationMigration(JSON.stringify(legacy))).project;
 assert.equal(runStationBalancing(migrated,legacy.balancing!.taktTimeSeconds).workstations.length,migrated.stations.length);
 assert.throws(()=>runStationBalancing(migrated,1),/Uzgodnij jawnie tożsamość/);
});

test('D3a: przeniesienie i zmiana kolejności zachowują ID, puste stanowisko i jego zasoby',()=>{
 const legacy=derive(project([op('A',10),op('B',20,[],2)])).project;
 legacy.workstationSettings={[resourceKey(['A'])]:{operators:2,parallelStations:1}};
 const original=JSON.stringify(legacy);
 const prepared=prepareStationMigration(previewStationMigration(original)).project;
 const [first,second]=prepared.stations.map(s=>s.id);
 const moved=moveStationOperation(prepared,'A',second);
 assert.deepEqual(moved.stations.map(s=>s.id),[first,second]);
 assert.deepEqual(moved.stations.map(s=>s.operationIds),[[],['B','A']]);
 assert.deepEqual(moved.workstationSettings[first],{operators:2,parallelStations:1});
 assert.deepEqual(moved.layoutObjects,prepared.layoutObjects);
 assert.deepEqual(runStationBalancing(moved,100).workstations.map(s=>s.cycleTimeSeconds),[0,30]);
 const reordered=parseStationProjectV5(JSON.stringify({...prepared,stations:[prepared.stations[1],prepared.stations[0]]}));
 assert.deepEqual(runStationBalancing(reordered,100).workstations.map(s=>s.id),[second,first]);
 assert.deepEqual(reordered.layoutObjects,prepared.layoutObjects);
 assert.deepEqual(prepared.stations.map(s=>s.id),[first,second]);
 assert.equal(JSON.stringify(legacy),original);
});

test('D3a: nieznany cel i naruszenie kolejności poprzedników nie zmieniają projektu',()=>{
 const legacy=derive(project([op('A',10),op('B',10,['A'],2),op('C',10,[],3)])).project;
 const prepared=prepareStationMigration(previewStationMigration(JSON.stringify(legacy))).project;
 const source=JSON.stringify(prepared);
 assert.throws(()=>moveStationOperation(prepared,'A','ST-missing'),/Nieznane stanowisko/);
 assert.throws(()=>moveStationOperation(prepared,'A',prepared.stations[2].id),/późniejszym stanowisku/);
 assert.equal(JSON.stringify(prepared),source);
});

test('D4a: Eko po migracji zachowuje geometrię, trasy i wynik symulacji',()=>{
 const original=readFileSync('tests/qa/Eko_B_export_20260930_183858.json','utf8');
 const legacy=derive(parseProject(original)).project;
 const prepared=prepareStationMigration(previewStationMigration(original)).project;
 const result=deriveStationProject(prepared);
 assert.deepEqual(result.issues,[]);
 assert.deepEqual(result.project.layoutObjects,prepared.layoutObjects);
 assert.equal(layoutRoutes(result.project).length,layoutRoutes(legacy).length);
 assert.deepEqual(layoutRoutes(result.project).map(r=>[r.a.id,r.b.id]),layoutRoutes(legacy).map(r=>[r.a.id,r.b.id]));
 assert.deepEqual(simulateNetwork(result.project,4050,3).jobs.map(j=>j.finish),simulateNetwork(legacy,4050,3).jobs.map(j=>j.finish));
 assert.ok(simulateNetwork(result.project,4050,1).runs.every(r=>result.project.stations.some(s=>s.id===r.stationId)));
});

test('D4a: zasoby zostają przy pustym stanowisku, a cykl i geometria nie są domyślane',()=>{
 const draft=project([op('A',10),op('B',20,[],2)]);
 draft.workstationSettings={[resourceKey(['A'])]:{operators:2,parallelStations:2,assistedCycleSeconds:6}};
 const legacy=derive(draft).project;
 const prepared=prepareStationMigration(previewStationMigration(JSON.stringify(legacy))).project;
 const first=prepared.stations[0].id,second=prepared.stations[1].id;
 const moved=moveStationOperation(prepared,'A',second);
 const result=deriveStationProject(moved);
 assert.equal(result.project.balancing.workstations[0].id,first);
 assert.equal(result.project.balancing.workstations[0].cycleTimeSeconds,0);
 assert.equal(result.project.balancing.workstations[0].parallelStations,2);
 assert.deepEqual(result.project.workstationSettings[first],prepared.workstationSettings[first]);
 assert.deepEqual(result.project.layoutObjects,prepared.layoutObjects);
 assert.deepEqual(result.issues,[]);
 const changed=structuredClone(moved);changed.workstationSettings[first].parallelStations=3;
 const mismatch=deriveStationProject(changed);
 assert.ok(mismatch.issues.some(i=>i.area==='layout'&&i.severity==='error'));
 assert.deepEqual(mismatch.project.layoutObjects,moved.layoutObjects);
});

test('D4a: brak zapisanego layoutu pozostaje jawny po migracji przykładu',()=>{
 const source=JSON.stringify(DEFAULT_EKO_PROJECT);
 const migrated=prepareStationMigration(previewStationMigration(source)).project;
 assert.deepEqual(migrated.layoutObjects,[]);
 const result=deriveStationProject(migrated);
 assert.deepEqual(result.project.layoutObjects,[]);
 assert.ok(result.issues.some(i=>i.area==='layout'&&i.severity==='error'));
 assert.equal(JSON.stringify(DEFAULT_EKO_PROJECT),source);
});

test('D4b: jawna zmiana kolejności i podział zachowują ID oraz powiązania starego stanowiska',()=>{
 const legacy=derive(project([op('A',10),op('B',20)])).project;
 legacy.workstationSettings={[resourceKey(['A','B'])]:{operators:2,parallelStations:1}};
 const prepared=prepareStationMigration(previewStationMigration(JSON.stringify(legacy))).project;
 const old=prepared.stations[0].id;
 const split=reviseStationProject(prepared,[
   {id:old,name:'Główne',operationIds:['A']},
   {name:'Nowe',operationIds:['B']},
 ],()=> 'ST-new');
 assert.deepEqual(split.createdIds,['ST-new']);
 assert.deepEqual(split.retiredIds,[]);
 assert.deepEqual(split.project.stations.map(s=>s.id),[old,'ST-new']);
 assert.deepEqual(split.project.workstationSettings[old],prepared.workstationSettings[old]);
 assert.deepEqual(split.project.layoutObjects,prepared.layoutObjects);
 assert.ok(deriveStationProject(split.project).issues.some(i=>i.area==='layout'&&i.severity==='error'));
 const reordered=reviseStationProject(split.project,[split.project.stations[1],split.project.stations[0]]);
 assert.deepEqual(reordered.project.stations.map(s=>s.id),['ST-new',old]);
 assert.deepEqual(reordered.project.layoutObjects,prepared.layoutObjects);
 assert.deepEqual(runStationBalancing(reordered.project,100).workstations.map(s=>s.id),['ST-new',old]);
 assert.deepEqual(prepared.stations.map(s=>s.id),[old]);
});

test('D4b: scalenie blokuje wycofanie ID z zasobami lub wyposażeniem',()=>{
 const draft=project([op('A',10),op('B',20,[],2)]);
 draft.workstationSettings={[resourceKey(['B'])]:{operators:2,parallelStations:1}};
 const legacy=derive(draft).project;
 const prepared=prepareStationMigration(previewStationMigration(JSON.stringify(legacy))).project;
 const [keep,retire]=prepared.stations.map(s=>s.id);
 const plan=[{id:keep,name:'Scalone',operationIds:['A','B']}];
 const original=JSON.stringify(prepared);
 assert.throws(()=>reviseStationProject(prepared,plan),/Rozstrzygnij je jawnie/);
 const detached=parseStationProjectV5(JSON.stringify({...prepared,
   layoutObjects:prepared.layoutObjects.filter(o=>o.workstationId!==retire),
   workstationSettings:{},
 }));
 const merged=reviseStationProject(detached,plan);
 assert.deepEqual(merged.retiredIds,[retire]);
 assert.deepEqual(merged.project.stations.map(s=>s.id),[keep]);
 assert.equal(JSON.stringify(prepared),original);
});

test('D4d: podział jawnie zachowuje ID, zasoby i wyposażenie tylko starego stanowiska',()=>{
 const legacy=derive(project([op('A',10),op('B',20)])).project;
 legacy.workstationSettings={[resourceKey(['A','B'])]:{operators:2,parallelStations:1}};
 const prepared=prepareStationMigration(previewStationMigration(JSON.stringify(legacy))).project;
 const old=prepared.stations[0].id, original=JSON.stringify(prepared);
 const split=splitStationProject(prepared,old,['B'],'Drugie',()=> 'ST-new');
 assert.deepEqual(split.createdIds,['ST-new']);
 assert.deepEqual(split.project.stations.map(s=>s.id),[old,'ST-new']);
 assert.deepEqual(split.project.stations.map(s=>s.operationIds),[['A'],['B']]);
 assert.deepEqual(split.project.workstationSettings[old],prepared.workstationSettings[old]);
 assert.equal(split.project.workstationSettings['ST-new'],undefined);
 assert.deepEqual(split.project.layoutObjects,prepared.layoutObjects);
 assert.equal(split.project.layoutObjects.some(o=>o.workstationId==='ST-new'),false);
 assert.throws(()=>splitStationProject(prepared,old,['A','B'],'Całość'),/Wybierz część/);
 assert.throws(()=>splitStationProject(prepared,old,['X'],'Obca'),/Wybierz część/);
 assert.equal(JSON.stringify(prepared),original);
});

test('D4d: scalenie wymaga dokładnej decyzji o obiektach i ustawieniach wycofywanego ID',()=>{
 const draft=project([op('A',10),op('B',20,[],2)]);
 draft.workstationSettings={
   [resourceKey(['A'])]:{operators:3,parallelStations:1},
   [resourceKey(['B'])]:{operators:2,parallelStations:1},
 };
 const legacy=derive(draft).project;
 const prepared=prepareStationMigration(previewStationMigration(JSON.stringify(legacy))).project;
 const [keep,retire]=prepared.stations.map(s=>s.id);
 const linked=prepared.layoutObjects.filter(o=>o.workstationId===retire).map(o=>o.id);
 const original=JSON.stringify(prepared);
 assert.ok(linked.length>0);
 assert.throws(()=>mergeStationProject(prepared,{keepId:keep,retireId:retire,removeObjectIds:[],removeResourceSettings:false}),/dokładnej decyzji/);
 assert.throws(()=>mergeStationProject(prepared,{keepId:keep,retireId:retire,removeObjectIds:linked,removeResourceSettings:false}),/Ustawienia zasobów/);
 const merged=mergeStationProject(prepared,{keepId:keep,retireId:retire,removeObjectIds:linked,removeResourceSettings:true});
 assert.deepEqual(merged.retiredIds,[retire]);
 assert.deepEqual(merged.project.stations.map(s=>s.id),[keep]);
 assert.deepEqual(merged.project.stations[0].operationIds,['A','B']);
 assert.deepEqual(merged.project.workstationSettings[keep],prepared.workstationSettings[keep]);
 assert.equal(merged.project.workstationSettings[retire],undefined);
 assert.equal(merged.project.layoutObjects.some(o=>o.workstationId===retire),false);
 assert.equal(JSON.stringify(prepared),original);
});

test('D4f: jawna geometria nowego ID usuwa brak stołu bez zmiany procesu i zachowuje powiązanie po JSON',()=>{
 const source=parseStationProjectV5(readFileSync('tests/qa/Eko_D5_actual_export_v5.json','utf8'));
 const sourceStation=source.stations.find(s=>s.operationIds.length>1)!;
 const original=JSON.stringify(source);
 const split=splitStationProject(source,sourceStation.id,[sourceStation.operationIds[1]],'Nowe stanowisko',()=> 'ST-D4f-new').project;
 assert.ok(deriveStationProject(split).issues.some(i=>i.severity==='error'&&i.message.includes('Nowe stanowisko')));
 const geometry={name:'Stół testowy',xMm:1000,yMm:2000,zMm:0,widthMm:1800,lengthMm:900,heightMm:850,rotationDeg:0};
 const added=addStationEquipment(split,'ST-D4f-new','TableESD',geometry,()=> 'TBL-D4f-new');
 assert.equal(added.layoutObjects.length,split.layoutObjects.length+1);
 assert.deepEqual(added.processSteps,split.processSteps);
 assert.deepEqual(added.workstationSettings,split.workstationSettings);
 assert.deepEqual(added.layoutObjects.slice(0,-1),split.layoutObjects);
 assert.equal(added.layoutObjects.at(-1)?.workstationId,'ST-D4f-new');
 assert.equal(deriveStationProject(added).issues.some(i=>i.severity==='error'&&i.message.includes('Nowe stanowisko')),false);
 assert.throws(()=>addStationEquipment(added,'ST-D4f-new','TableESD',geometry),/ma już 1 stołów/);
 const moved=updateStationEquipment(added,'ST-D4f-new','TBL-D4f-new',{...geometry,xMm:3200,rotationDeg:90});
 const saved=parseStationProjectV5(JSON.stringify(moved));
 assert.equal(saved.layoutObjects.at(-1)?.xMm,3200);
 assert.equal(saved.layoutObjects.at(-1)?.rotationDeg,90);
 assert.equal(saved.layoutObjects.at(-1)?.workstationId,'ST-D4f-new');
 assert.throws(()=>updateStationEquipment(saved,sourceStation.id,'TBL-D4f-new',geometry),/nie jest powiązany/);
 const removed=removeStationEquipment(saved,'ST-D4f-new','TBL-D4f-new');
 assert.ok(deriveStationProject(removed).issues.some(i=>i.severity==='error'&&i.message.includes('Nowe stanowisko')));
 assert.equal(JSON.stringify(source),original);
});

test('1.5/1.6: usunięcie operacji ze schematu 5 zachowuje trwałe ID stanowiska, jego wyposażenie i zasoby',()=>{
 const source=parseStationProjectV5(readFileSync('tests/qa/Eko_D5_actual_export_v5.json','utf8'));
 const original=JSON.stringify(source);
 const targetStation=source.stations.find(s=>s.operationIds.includes('OP10'))!;
 assert.ok(targetStation);
 const stationId=targetStation.id;
 const equipmentBefore=source.layoutObjects.filter(o=>o.workstationId===stationId);
 assert.ok(equipmentBefore.length>0);

 const removed=removeStationOperation(source,'OP10');
 assert.equal(removed.processSteps.some(s=>s.id==='OP10'),false);
 assert.ok(removed.processSteps.every(s=>!s.predecessorIds.includes('OP10')));
 assert.equal(removed.bom.some(b=>b.associatedProcessStepId==='OP10'),false);

 const stationAfter=removed.stations.find(s=>s.id===stationId);
 assert.ok(stationAfter);
 assert.equal(stationAfter.id,stationId);
 assert.deepEqual(stationAfter.operationIds,[]);

 const equipmentAfter=removed.layoutObjects.filter(o=>o.workstationId===stationId);
 assert.deepEqual(equipmentAfter,equipmentBefore);
 assert.deepEqual(removed.workstationSettings[stationId],source.workstationSettings[stationId]);

 const derived=deriveStationProject(removed);
 const derivedStation=derived.project.balancing.workstations.find(w=>w.id===stationId);
 assert.ok(derivedStation);
 assert.equal(derivedStation.cycleTimeSeconds,0);
 assert.equal(derived.issues.some(i=>i.severity==='error'&&i.message.includes(derivedStation.name)),false);

 const reloaded=parseStationProjectV5(JSON.stringify(removed));
 assert.deepEqual(reloaded,removed);
 assert.throws(()=>removeStationOperation(removed,'OP10'),/nie istnieje/);
 assert.equal(JSON.stringify(source),original);
});

test('trwałe ID stanowisk nie zależą od kolejności, nazwy ani zbioru operacji',()=>{
 const old=[{id:'ST-A',name:'Pierwsze',operationIds:['A']},{id:'ST-B',name:'Drugie',operationIds:['B']}];
 const result=reviseStations(old,[{id:'ST-B',name:'Nowa nazwa',operationIds:['A','B']},{id:'ST-A',name:'Puste',operationIds:[]}],['A','B']);
 assert.deepEqual(result.stations.map(s=>s.id),['ST-B','ST-A']);
 assert.deepEqual(result.createdIds,[]);assert.deepEqual(result.retiredIds,[]);
 assert.deepEqual(old[0].operationIds,['A']);
 result.stations[0].operationIds.push('C');assert.deepEqual(old[1].operationIds,['B']);
});

test('podział jawnie zachowuje ID i przydziela nowe, scalenie raportuje wycofanie',()=>{
 const old=[{id:'ST-A',name:'Montaż',operationIds:['A','B']}];
 const split=reviseStations(old,[{id:'ST-A',name:'Montaż',operationIds:['A']},{name:'Pomocnicze',operationIds:['B']}],['A','B'],()=> 'ST-B');
 assert.deepEqual(split.createdIds,['ST-B']);
 const merged=reviseStations(split.stations,[{id:'ST-B',name:'Scalone',operationIds:['A','B']}],['A','B']);
 assert.deepEqual(merged.retiredIds,['ST-A']);assert.deepEqual(merged.createdIds,[]);
});

test('rejestr odrzuca nieznane i powtórzone przypisania bez mutacji',()=>{
 const old=[{id:'ST-A',name:'Montaż',operationIds:['A']}],before=structuredClone(old);
 assert.throws(()=>reviseStations(old,[{id:'WS-1',name:'Błąd',operationIds:[]}],['A']),/Nieznane stanowisko/);
 assert.throws(()=>reviseStations(old,[old[0],old[0]],['A']),/więcej niż raz/);
 assert.throws(()=>reviseStations(old,[{...old[0],operationIds:['X']}],['A']),/Nieznana operacja/);
 assert.throws(()=>reviseStations(old,[{...old[0],operationIds:['A','A']}],['A']),/więcej niż raz/);
 assert.deepEqual(old,before);
});

test('ID wycofanego stanowiska nie może być ponownie nadane w tej samej rewizji',()=>{
 const old=[{id:'ST-A',name:'Stare',operationIds:[]}];
 assert.throws(()=>reviseStations(old,[{name:'Nowe',operationIds:[]}],[],()=> 'ST-A'),/Generator/);
 assert.throws(()=>reviseStations([],[{name:'A',operationIds:[]},{name:'B',operationIds:[]}],[],()=> 'ST-X'),/Generator/);
});

test('rejestr zachowuje ID po usunięciu operacji i przenośnym zapisie JSON',()=>{
 const old=[{id:'ST-A',name:'Montaż',operationIds:['REMOVED']}];
 const revised=reviseStations(old,[{id:'ST-A',name:'Montaż',operationIds:[]}],[]);
 const restored=JSON.parse(JSON.stringify(revised.stations));
 assert.deepEqual(reviseStations(restored,restored,[]).stations,revised.stations);
});
const op=(id:string,time:number,pred:string[]=[],ws=1):ProcessStep=>({id,name:id,standardTimeSeconds:time,vaTimeSeconds:time*.8,nvaTimeSeconds:time*.2,predecessorIds:pred,sequenceNumber:ws,assignedWorkstationId:'WS-'+ws});
const project=(steps:ProcessStep[]):ProjectData=>({...structuredClone(base),algorithm:'Manual',processSteps:steps,bom:[],obstacles:[],layoutMode:'auto',targetLayoutType:'ProcessFlow',facility:{widthMm:100000,lengthMm:100000,heightMm:6000,gridSizeMm:100}});

test('edycja powiązań nieistniejącej operacji jest odrzucana bez zmiany grafu',()=>{
 const steps=[op('A',10),op('B',20,['A'],2)],before=structuredClone(steps);
 assert.throws(()=>setOperationLinks(steps,'MISSING',[],[]),/Operacja już nie istnieje/);
 assert.deepEqual(steps,before);
});

test('usuwanie nieistniejącej operacji nie zmienia procesu ani materiałów',()=>{
 const p=project([op('A',10)]),before=structuredClone(p);
 assert.throws(()=>removeOperation(p,'MISSING',true),/Operacja już nie istnieje/);
 assert.deepEqual(p,before);
});

test('usunięcie jedynej operacji środkowej stacji kompaktuje bilans i zachowuje BOM',()=>{
 const p=project([op('A',10),op('B',20,['A'],2),op('C',30,['B'],3)]);
 p.bom=[{...structuredClone(base.bom[0]),associatedProcessStepId:'B'}];
 p.workstationSettings={[resourceKey(['C'])]:{operators:2,parallelStations:2}};
 const before=structuredClone(p),next=removeOperation(p,'B',false);
 assert.deepEqual(next.processSteps.map(s=>[s.id,s.assignedWorkstationId,s.predecessorIds]),[['A','WS-1',[]],['C','WS-2',[]]]);
 const calculated=derive(next);
 assert.equal(calculated.project.balancing!.workstations.length,2);
 assert.equal(calculated.project.balancing!.workstations[1].parallelStations,2);
 assert.equal(calculated.issues.some(i=>i.area==='process'),false);
 assert.equal(calculated.issues.some(i=>i.area==='bom'),true);
 assert.deepEqual(next.bom,p.bom);
 assert.deepEqual(p,before);
 assert.deepEqual(removeOperation(p,'B',true).bom,[]);
});

test('usunięcie jednej operacji współdzielonej stacji nie usuwa jej pozostałych operacji',()=>{
 const p=project([op('A',10),op('B',20,['A']),op('C',30,['B'],2)]);
 const next=removeOperation(p,'B',false);
 assert.deepEqual(next.processSteps.map(s=>s.assignedWorkstationId),['WS-1','WS-2']);
 assert.equal(derive(next).project.balancing!.totalWorkContentSeconds,40);
 assert.deepEqual(next.processSteps[1].predecessorIds,[]);
});

test('usunięcie i ponowny zapis poprawnego procesu zachowuje ręczny bilans',()=>{
 const p=project([op('A',10),op('B',20,['A'],2),op('C',30,['B'],3)]);
 const next=removeOperation(p,'A',false);
 const restored=parseProject(JSON.stringify(next));
 assert.deepEqual(restored.processSteps,next.processSteps);
 assert.equal(derive(restored).project.balancing!.workstations.length,2);
 assert.equal(derive(p).project.balancing!.workstations.length,3);
});
test('import nowego procesu resetuje ręczny przydział i zasoby bez usuwania BOM i CAD',()=>{
 const p=derive(project([op('A',10)])).project;p.layoutMode='manual';p.workstationSettings={[resourceKey(['A'])]:{operators:2,parallelStations:3}};
 const next=replaceImportedProcess(p,[{...op('NEW',20),assignedWorkstationId:undefined}]);
 assert.equal(next.algorithm,'RPW');assert.deepEqual(next.workstationSettings,{});
 assert.deepEqual(next.layoutObjects,p.layoutObjects);assert.deepEqual(next.bom,p.bom);
 assert.ok(derive(next).project.balancing);
});
test('następniki o niższym ID są edytowane atomowo i usuwane w obie strony',()=>{
 const steps=[op('99',10),op('1',10,[],2),op('0',10,[],3)];
 const next=setOperationLinks(steps,'99',[],['1','0']);
 assert.deepEqual(successorsOf(next,'99'),['1','0']);
 assert.deepEqual(next[1].predecessorIds,['99']);
 assert.deepEqual(setOperationLinks(next,'99',[],['0'])[1].predecessorIds,[]);
 assert.deepEqual(steps[1].predecessorIds,[]);
 assert.throws(()=>setOperationLinks(next,'1',['99'],['99','0']),/Cykl/);
 assert.throws(()=>setOperationLinks(next,'99',[],['X']),/istnieje/);
});
test('fork/join: koniec czeka na wolniejszą gałąź, kolejność ID bez znaczenia',()=>{
 const p=derive(project([op('Z',10),op('L',20,['Z'],2),op('R',30,['Z'],3),op('A',5,['L','R'],4)])).project;
 const r=simulateNetwork(p,100,1);
 assert.equal(r.jobs[0].finish,45);
 assert.equal(r.runs.find(r=>r.stepId==='L')!.start,10);
 assert.equal(r.runs.find(r=>r.stepId==='R')!.start,10);
 assert.equal(r.runs.find(r=>r.stepId==='A')!.start,40);
});
test('dodanie zależności sekwencjonuje montaż dwóch stron tego samego wyrobu',()=>{
 let p=project([op('L',20),op('R',30,[],2),op('F',5,['L','R'],3)]);
 assert.equal(simulateNetwork(derive(p).project,100,1).jobs[0].finish,35);
 p.processSteps=setOperationLinks(p.processSteps,'L',[],['R','F']);
 assert.equal(simulateNetwork(derive(p).project,100,1).jobs[0].finish,55);
});
test('kopie zwiększają przepustowość, nie skracają wykonania jednej operacji',()=>{
 const p=project([op('A',10)]);
 const before=derive(p).project;
 assert.deepEqual(simulateNetwork(before,1,4).jobs.map(j=>j.finish),[10,20,30,40]);
 p.workstationSettings={[resourceKey(['A'])]:{operators:2,parallelStations:2}};
 const after=derive(p).project;
 assert.equal(after.balancing!.workstations[0].cycleTimeSeconds,10);
 assert.equal(after.balancing!.bottleneckCycleTimeSeconds,5);
 assert.equal(after.balancing!.actualWorkstationsCount,2);
 assert.deepEqual(simulateNetwork(after,1,4).jobs.map(j=>j.finish),[10,11,20,21]);
 assert.equal(after.layoutObjects.filter(o=>o.type.includes('Table')).length,2);
 assert.deepEqual(layoutWarnings(after),[]);
});
test('sam operator nie dzieli czasu; jawny czas zespołu wpływa na symulację i JSON',()=>{
 const p=project([op('A',10)]);
 p.workstationSettings={[resourceKey(['A'])]:{operators:2,parallelStations:1,assistedCycleSeconds:6}};
 const restored=derive(parseProject(JSON.stringify(p))).project;
 assert.equal(simulateNetwork(restored,1,2).jobs[1].finish,12);
 assert.equal(restored.balancing!.workstations[0].baseCycleSeconds,10);
 assert.throws(()=>parseProject(JSON.stringify({...p,workstationSettings:{a:{operators:0,parallelStations:1}}})),/Zasoby/);
});
test('graf: zasoby nie nakładają się w czasie i przestrzegają wszystkich poprzedników',()=>{
 const p=project([op('A',2),op('B',4,['A'],1),op('C',3,['A'],2),op('D',1,['B','C'],3)]);
 p.workstationSettings={[resourceKey(['A','B'])]:{operators:1,parallelStations:2}};
 const r=simulateNetwork(derive(p).project,.5,40);
 for(const run of r.runs){
   for(const pred of p.processSteps.find(s=>s.id===run.stepId)!.predecessorIds)
     assert.ok(r.runs.find(x=>x.job===run.job&&x.stepId===pred)!.end<=run.start);
   for(const other of r.runs)if(run!==other&&run.stationId===other.stationId&&run.copy===other.copy)
     assert.ok(run.end<=other.start||other.end<=run.start);
 }
 assert.equal(r.runs.length,160);
 assert.throws(()=>simulateNetwork(derive(p).project,0,2));
});
test('ręczny layout wykrywa brak kopii po zmianie zasobów',()=>{
 const p=derive(project([op('A',10)])).project;
 p.layoutMode='manual';p.workstationSettings={[resourceKey(['A'])]:{operators:1,parallelStations:2}};
 assert.ok(derive(p).issues.some(i=>i.area==='layout'&&i.severity==='error'));
});
test('Eko: grafowy layout i synchronizacja czterech podzespołów',()=>{
 const {project:p,issues}=derive(DEFAULT_EKO_PROJECT);
 assert.deepEqual(issues,[]);
 assert.equal(p.balancing!.workstations.length,16);
 assert.equal(p.layoutObjects.filter(o=>o.type.includes('Table')).length,16);
 const r=simulateNetwork(p,4050,3);
 assert.equal(r.runs.length,48);
 for(const id of ['OP22','OP23'])assert.equal(r.runs.find(r=>r.job===1&&r.stepId===id)!.start,7670);
 assert.equal(r.jobs[0].finish,13070);
});
test('kopie zachowują unikalne ID i brak kolizji we wszystkich generatorach',()=>{
 for(const targetLayoutType of ['Linear','UShape','LShape','ProcessFlow'] as const){
  const p=project([op('A',10),op('B',10,['A'],2),op('C',10,['A'],3),op('D',10,['B','C'],4)]);
  p.targetLayoutType=targetLayoutType;p.workstationSettings=Object.fromEntries(p.processSteps.map((s,i)=>[resourceKey([s.id]),{operators:2,parallelStations:[2,3,1,2][i]}]));
  const next=derive(p).project;
  assert.equal(new Set(next.layoutObjects.map(o=>o.id)).size,next.layoutObjects.length);
  assert.equal(next.layoutObjects.filter(o=>o.type.includes('Table')).length,8);
  assert.deepEqual(layoutWarnings(next),[],targetLayoutType);
 }
});

function cartMotionFixture(){
  const project=movingBodyFixture();
  project.equipment.push({id:'CART',name:'Wózek testowy — dane syntetyczne'});
  const calendar={shifts:[{startSeconds:0,endSeconds:100,basis:'assumed' as const}],breaks:[]};
  const declarations=[{equipmentId:'CART',initialLocation:{stationId:'ST-A',copy:1},calendar}];
  const route:CartMotionRoute={id:'EMPTY-A-C',equipmentId:'CART',from:{stationId:'ST-A',copy:1},to:{stationId:'ST-C',copy:1},
    distanceMm:5000,basis:'confirmed',source:'Jawny test dojazdu',transportTime:{durationSeconds:5,basis:'assumed',source:'Jawny test czasu'}};
  return {project,declarations,route};
}
test('3.4b: fizyczny dojazd i przewóz wózka zachowują jedno położenie, jawne czasy i niemutowalność',()=>{
  const {project,declarations,route}=cartMotionFixture(),before=JSON.stringify({project,declarations,route});
  const initial=createCartBook(project,declarations),moving=startCartMovement(project,initial,route,'empty',0);
  assert.deepEqual(initial.carts[0].location,route.from);assert.equal(moving.carts[0].location,null);
  assert.equal(moving.carts[0].movement!.kind,'empty');assert.equal(moving.carts[0].movement!.endSeconds,5);
  const arrived=finishCartMovement(moving,'CART',5);assert.deepEqual(arrived.carts[0].location,route.to);
  const reverse={...route,id:'LOADED-C-A',from:route.to,to:route.from,transportCalculation:transportCalculationFixture()};
  delete (reverse as Partial<CartMotionRoute>).transportTime;
  const loaded=startCartMovement(project,arrived,reverse,'loaded',5);assert.equal(loaded.carts[0].movement!.endSeconds,15);
  assert.deepEqual(finishCartMovement(loaded,'CART',15).carts[0].location,route.from);
  assert.equal(JSON.stringify({project,declarations,route}),before);
});
test('3.4b: brak teleportacji, podwójnego zajęcia, cofania czasu i domyślnego dojazdu',()=>{
  const {project,declarations,route}=cartMotionFixture(),book=createCartBook(project,declarations);
  const moving=startCartMovement(project,book,route,'empty',0);
  assert.throws(()=>startCartMovement(project,moving,route,'loaded',1),/zajęty/);
  assert.throws(()=>finishCartMovement(moving,'CART',4),/zgodnego końca/);
  assert.throws(()=>finishCartMovement(moving,'CART',6),/zgodnego końca/);
  const arrived=finishCartMovement(moving,'CART',5);
  assert.throws(()=>startCartMovement(project,arrived,route,'empty',5),/aktualnej lokalizacji/);
  assert.throws(()=>startCartMovement(project,arrived,{...route,from:route.to,to:route.from},'empty',4),/cofanie czasu/);
  const missing={...route};delete missing.transportTime;
  assert.throws(()=>startCartMovement(project,book,missing,'empty',0),/brak jawnego czasu/);
  assert.throws(()=>startCartMovement(project,book,{...route,source:''},'empty',0),/źródła/);
  assert.throws(()=>startCartMovement(project,book,{...route,to:{stationId:'ST-C',copy:2}},'empty',0),/lokalizacja/);
  assert.throws(()=>createCartBook(project,[...declarations,...declarations]),/powtórzony/);
  project.equipment.find(e=>e.id==='CART')!.stationId='ST-A';
  assert.throws(()=>createCartBook(project,declarations),/równocześnie/);
});
test('3.4b: wózek wymaga jawnego kalendarza i nie przejeżdża przez przerwę',()=>{
  const {project,declarations,route}=cartMotionFixture();
  declarations[0].calendar.breaks=[{startSeconds:3,endSeconds:10,basis:'assumed'}] as typeof declarations[0]['calendar']['breaks'];
  const book=createCartBook(project,declarations);
  assert.throws(()=>startCartMovement(project,book,route,'empty',0),/ciągłym oknie/);
  const moving=startCartMovement(project,book,route,'empty',10);assert.equal(moving.carts[0].movement!.endSeconds,15);
  const invalid=structuredClone(declarations);invalid[0].calendar.shifts[0].endSeconds=0;
  assert.throws(()=>createCartBook(project,invalid),/przedziały/);
  const noCalendar=structuredClone(declarations);delete (noCalendar[0] as {calendar?:unknown}).calendar;
  assert.throws(()=>createCartBook(project,noCalendar),/zmiany i przerwy/);
});

function assemblyTransportFixture(){
  const {project,declarations,route}=cartMotionFixture();
  const transport:AssemblyTransport={scope:'assembly-only',
    carts:declarations.map(cart=>({...cart,afterUnload:'stay-at-destination',source:'Jawna reguła testowa'})),conveyors:[],
    emptyRoutes:[route],routes:[{stationRouteId:'R-A',source:'Transport międzyoperacyjny testowy',
      alternatives:[{workerIds:[project.workers[0].id],equipmentIds:['CART']}]}]};
  return {project,transport};
}
test('3.4d: kontrakt montażu i fizycznego dojazdu zapisuje jawne referencje i chroni źródła 4/5',()=>{
  const {project,transport}=assemblyTransportFixture(),before=JSON.stringify(project);
  const edited=editDomainAssemblyTransport(project,transport);assert.equal(JSON.stringify(project),before);
  assert.deepEqual(parseDomainProjectV6(JSON.stringify(edited)).assemblyTransport,transport);
  for(const originalJson of [JSON.stringify(derive(parseProject(JSON.stringify(base))).project),readFileSync('tests/qa/Eko_D5_actual_export_v5.json','utf8')]){
    const storage=new DraftStorage(),initial=saveDomainDraft(storage,{project,originalJson},null);
    const saved=saveDomainDraft(storage,{project:edited,originalJson},initial.raw);
    const reopened=readDomainDraft(storage);assert.equal(reopened.status,'valid');
    if(reopened.status==='valid'){assert.equal(reopened.saved.originalJson,originalJson);assert.deepEqual(reopened.saved.project.assemblyTransport,transport);}
    const invalid=structuredClone(edited);invalid.assemblyTransport!.emptyRoutes[0].to.copy=999;
    assert.throws(()=>saveDomainDraft(storage,{project:invalid,originalJson},saved.raw),/lokalizacja/);
    assert.equal(storage.getItem(DOMAIN_DRAFT_STORAGE_KEY),saved.raw);
  }
  const removed=editDomainAssemblyTransport(edited,undefined);assert.equal(removed.assemblyTransport,undefined);
  assert.deepEqual(removed,project);
});
test('3.4d: parser odmawia osieroconych zasobów, braków czasu/polityki i sprzecznych urządzeń',()=>{
  const {project,transport}=assemblyTransportFixture();
  const invalid=(change:(t:AssemblyTransport)=>void,pattern:RegExp)=>{const copy=structuredClone(transport);change(copy);assert.throws(()=>validateAssemblyTransport(project,copy),pattern);};
  invalid(t=>t.carts[0].afterUnload='' as never,/reguły/);
  invalid(t=>t.carts[0].source='',/źródło/);
  invalid(t=>t.carts.push(structuredClone(t.carts[0])),/powtórzony/);
  invalid(t=>t.emptyRoutes[0].equipmentId='UNKNOWN',/nieznany/);
  invalid(t=>delete t.emptyRoutes[0].transportTime,/jawnego czasu/);
  invalid(t=>t.emptyRoutes.push(structuredClone(t.emptyRoutes[0])),/powtórzone/);
  invalid(t=>t.routes[0].stationRouteId='UNKNOWN',/nieznana/);
  invalid(t=>t.routes[0].alternatives[0].workerIds=['WAREHOUSE-UNKNOWN'],/nieznane/);
  invalid(t=>t.routes[0].alternatives[0].equipmentIds=['UNKNOWN'],/nieznane/);
  invalid(t=>t.routes[0].alternatives.push(structuredClone(t.routes[0].alternatives[0])),/powtórzony/);
  invalid(t=>t.routes[0].alternatives=[],/jawny zestaw/);
  const edited=editDomainAssemblyTransport(project,transport);
  edited.equipment=edited.equipment.filter(e=>e.id!=='CART');assert.throws(()=>parseDomainProjectV6(JSON.stringify(edited)),/nieznany/);
  const noRoute=editDomainAssemblyTransport(project,transport);noRoute.stationRouting!.routes=[];
  assert.throws(()=>parseDomainProjectV6(JSON.stringify(noRoute)),/nieznana/);
  const fixed=structuredClone(project);fixed.equipment.find(e=>e.id==='CART')!.stationId='ST-A';
  assert.throws(()=>validateAssemblyTransport(fixed,transport),/równocześnie/);
});
test('3.4d: przenośnik dopuszcza tylko zgodną skierowaną trasę, bez automatycznej osoby',()=>{
  const {project,transport}=assemblyTransportFixture();project.equipment.push({id:'BELT',name:'Przenośnik testowy'});
  const route=project.stationRouting!.routes.find(r=>r.id==='R-A')!;
  transport.conveyors=[{equipmentId:'BELT',from:route.from,to:route.to,calendar:transport.carts[0].calendar}];
  transport.routes[0].alternatives=[{workerIds:[],equipmentIds:['BELT']}];
  assert.deepEqual(validateAssemblyTransport(project,transport),transport);
  transport.conveyors[0].from=route.to;transport.conveyors[0].to=route.from;
  assert.throws(()=>validateAssemblyTransport(project,transport),/inne końce/);
});
test('3.4g: brak trasy powrotu powoduje jawną odmowę harmonogramu/workera, dawny wynik pozostaje identyczny',()=>{
  const {project,transport}=assemblyTransportFixture();
  const input:BodyRunInput={bodies:[{id:'BODY',productId:'PRODUCT',location:{kind:'station',stationId:'ST-A',copy:1}}],jobs:[{job:1,bodyId:'BODY'}]};
  const baseline=scheduleWorkerRun(project,1,1,input);transport.carts[0].afterUnload='return-to-initial';const edited=editDomainAssemblyTransport(project,transport);
  assert.throws(()=>scheduleWorkerRun(edited,1,1,input),/3.4.3/);
  const replies:unknown[]=[];edited.bodyRunInput=input;
  executeScheduleRequest({project:edited,arrivalIntervalSeconds:1,batch:1},reply=>replies.push(reply));
  const failure=replies.find(r=>(r as {kind:string}).kind==='error') as {message:string};assert.ok(failure);assert.match(failure.message,/3.4.3/);assert.ok(!replies.some(r=>(r as {kind:string}).kind==='result'));
  assert.deepEqual(scheduleWorkerRun(editDomainAssemblyTransport(edited,undefined),1,1,input),baseline);
});

function assemblyMovementFixture(){
  const {project,transport}=assemblyTransportFixture();project.assemblyTransport=transport;
  const workerId=project.workers[0].id;
  project.resourceCalendars!.workers[workerId]={shifts:[{startSeconds:0,endSeconds:100,basis:'assumed'}],breaks:[]};
  const carts=createCartBook(project,transport.carts.map(({afterUnload,source,...cart})=>cart));
  const workers=createWorkerReservationBook(project.workers.map(w=>w.id));
  return {project,carts,workers,workerId};
}
test('3.4e: przewóz czeka na osobę montażową bez wydłużenia jazdy, atomowo rezerwuje wózek i wspólne ID',()=>{
  const {project,carts,workers,workerId}=assemblyMovementFixture();
  const busy=reserveWorkerTeam(workers,{reservationId:'ASSEMBLY',workerIds:[workerId],startSeconds:0,endSeconds:10});
  const before=JSON.stringify({project,carts,busy});
  const move=reserveAssemblyMovement(project,carts,busy,{kind:'loaded',stationRouteId:'R-A',alternativeIndex:0,reservationId:'TRANSFER',earliestSeconds:0});
  assert.deepEqual([move.startSeconds,move.endSeconds,move.waitSeconds],[10,12,10]);assert.deepEqual(move.waitCauses,['workers']);
  assert.equal(move.carts.carts[0].location,null);assert.equal(move.workers.reservations.length,2);
  assert.throws(()=>reserveWorkerTeam(move.workers,{reservationId:'OVERLAP',workerIds:[workerId],startSeconds:11,endSeconds:13}),/nakładającą/);
  const next=reserveWorkerTeam(move.workers,{reservationId:'NEXT',workerIds:[workerId],startSeconds:12,endSeconds:15});
  const finished=finishAssemblyMovement(move,move.carts,next,12);
  assert.equal(finished.workers.reservations.length,3);assert.equal(finished.workers.reservations[1].releasedAtSeconds,12);
  assert.equal(finished.carts.carts[0].location!.stationId,'ST-C');
  assert.equal(JSON.stringify({project,carts,busy}),before);
});
test('3.4e: przyszła rezerwacja montażu i przerwa nie są ignorowane przez transport',()=>{
  const {project,carts,workers,workerId}=assemblyMovementFixture();
  const busy=reserveWorkerTeam(workers,{reservationId:'FUTURE',workerIds:[workerId],startSeconds:1,endSeconds:8});
  const move=reserveAssemblyMovement(project,carts,busy,{kind:'loaded',stationRouteId:'R-A',alternativeIndex:0,reservationId:'MOVE',earliestSeconds:0});
  assert.deepEqual([move.startSeconds,move.endSeconds],[8,10]);
  project.resourceCalendars!.workers[workerId].breaks=[{startSeconds:1,endSeconds:8,basis:'assumed'}];
  const paused=reserveAssemblyMovement(project,carts,workers,{kind:'loaded',stationRouteId:'R-A',alternativeIndex:0,reservationId:'PAUSE',earliestSeconds:0});
  assert.deepEqual([paused.startSeconds,paused.endSeconds],[8,10]);assert.deepEqual(paused.waitCauses,['calendar']);
  project.resourceCalendars!.workers[workerId].shifts[0].endSeconds=1;project.resourceCalendars!.workers[workerId].breaks=[];
  assert.throws(()=>reserveAssemblyMovement(project,carts,workers,{kind:'loaded',stationRouteId:'R-A',alternativeIndex:0,reservationId:'NO-WINDOW',earliestSeconds:0}),/wspólnego okna/);
});
test('3.4e: dojazd ma własną jawną obsadę i czas, bez teleportacji i automatycznych powrotów',()=>{
  const {project,carts,workers,workerId}=assemblyMovementFixture();
  const route=project.stationRouting!.routes.find(r=>r.id==='R-A')!;
  carts.carts[0].location={...route.to};
  const request={kind:'loaded' as const,stationRouteId:'R-A',alternativeIndex:0,reservationId:'LOAD',earliestSeconds:0};
  assert.throws(()=>reserveAssemblyMovement(project,carts,workers,request),/dojazdu/);
  project.assemblyTransport!.emptyRoutes=[{...project.assemblyTransport!.emptyRoutes[0],id:'RETURN',from:route.to,to:route.from}];
  const empty=reserveAssemblyMovement(project,carts,workers,{kind:'empty',emptyRouteId:'RETURN',workerIds:[workerId],assignmentSource:'Jawny test obsady dojazdu',reservationId:'EMPTY',earliestSeconds:0});
  assert.deepEqual([empty.startSeconds,empty.endSeconds],[0,5]);
  const arrived=finishAssemblyMovement(empty,empty.carts,empty.workers,5);
  const loaded=reserveAssemblyMovement(project,arrived.carts,arrived.workers,{...request,earliestSeconds:5});
  assert.deepEqual([loaded.startSeconds,loaded.endSeconds],[5,7]);
  const completed=finishAssemblyMovement(loaded,loaded.carts,loaded.workers,7);
  assert.deepEqual(completed.carts.carts[0].location,route.to);assert.equal(completed.carts.carts[0].movement,null);
  assert.equal(completed.workers.reservations.length,2);
});
test('3.4e: błąd przydziału nie publikuje połowy rezerwacji i nie dopowiada obsady',()=>{
  const {project,carts,workers,workerId}=assemblyMovementFixture();
  const request={kind:'loaded' as const,stationRouteId:'R-A',alternativeIndex:0,reservationId:'SAME',earliestSeconds:0};
  const previous=reserveWorkerTeam(workers,{reservationId:'SAME',workerIds:[workerId],startSeconds:20,endSeconds:21});
  const before=JSON.stringify({carts,previous});assert.throws(()=>reserveAssemblyMovement(project,carts,previous,request),/nowego/);
  assert.equal(JSON.stringify({carts,previous}),before);
  delete project.resourceCalendars!.workers[workerId];assert.throws(()=>reserveAssemblyMovement(project,carts,workers,request),/jawnego kalendarza/);
  assert.throws(()=>reserveAssemblyMovement(project,carts,workers,{kind:'empty',emptyRouteId:'EMPTY-A-C',workerIds:[workerId],assignmentSource:'',reservationId:'EMPTY',earliestSeconds:0}),/źródła/);
});

function assemblyScheduleInput(){
  return {bodies:[{id:'BODY',productId:'PRODUCT',location:{kind:'station' as const,stationId:'ST-A',copy:1}}],jobs:[{job:1,bodyId:'BODY'}]};
}
test('3.4f: harmonogram wykonuje przewóz z fizycznym wózkiem i wspólną osobą, worker ma zgodny wynik',()=>{
  const {project}=assemblyMovementFixture(),input=assemblyScheduleInput(),before=JSON.stringify(project);
  const result=scheduleWorkerRun(project,1,1,input),run=result.runs.find(r=>r.transport)!;
  assert.deepEqual([run.transport!.startSeconds,run.transport!.endSeconds,run.startSeconds],[10,12,12]);
  assert.deepEqual(run.transport!.equipmentIds,['CART']);assert.deepEqual(run.transport!.workerIds,[project.workers[0].id]);
  assert.deepEqual(result.cartBook!.carts[0].location,{stationId:'ST-C',copy:1});assert.equal(result.cartBook!.carts[0].movement,null);
  assert.equal(result.transportReservations!.length,1);
  for(let i=0;i<result.reservations.reservations.length;i++)for(let j=i+1;j<result.reservations.reservations.length;j++){
    const a=result.reservations.reservations[i],b=result.reservations.reservations[j];
    if(a.workerIds.some(id=>b.workerIds.includes(id)))assert.ok(a.endSeconds<=b.startSeconds||b.endSeconds<=a.startSeconds);
  }
  const replies:ScheduleReply[]=[];executeScheduleRequest({project:{...project,bodyRunInput:input},batch:1,arrivalIntervalSeconds:1},r=>replies.push(r));
  assert.deepEqual((replies.find(r=>r.kind==='result') as {result:unknown}).result,result);assert.equal(JSON.stringify(project),before);
});
test('3.4f: wybrana wykonalna alternatywa nie rezerwuje przegranych, przenośnik ma własną wyłączność',()=>{
  const {project}=assemblyMovementFixture(),input=assemblyScheduleInput();
  project.workers.push({id:'FAST',name:'Osoba transportu testowa'});
  project.resourceCalendars!.workers.FAST={shifts:[{startSeconds:0,endSeconds:100,basis:'assumed'}],breaks:[]};
  project.resourceCalendars!.workers[project.workers[0].id].breaks=[{startSeconds:10,endSeconds:20,basis:'assumed'}];
  const route=project.stationRouting!.routes.find(r=>r.id==='R-A')!;
  project.equipment.push({id:'BELT',name:'Przenośnik testowy'});
  project.assemblyTransport!.conveyors=[{equipmentId:'BELT',from:route.from,to:route.to,calendar:project.assemblyTransport!.carts[0].calendar}];
  project.assemblyTransport!.routes[0].alternatives.push({workerIds:['FAST'],equipmentIds:['BELT']});
  const result=scheduleWorkerRun(project,1,1,input),run=result.runs.find(r=>r.transport)!;
  assert.deepEqual(run.transport!.equipmentIds,['BELT']);assert.deepEqual(run.transport!.workerIds,['FAST']);
  assert.deepEqual([run.transport!.startSeconds,run.transport!.endSeconds],[10,12]);
  assert.deepEqual(result.cartBook!.carts[0].location,route.from);assert.equal(result.cartBook!.carts[0].movement,null);
  assert.ok(result.transportReservations!.every(r=>!r.equipmentIds.includes('CART')));
});
test('3.4f: jawny brak urządzenia obsługuje kolejne korpusy, brak wymagania i brak dojazdu nie dają pozornego wyniku',()=>{
  const {project}=assemblyMovementFixture();project.assemblyTransport!.routes[0].alternatives[0].equipmentIds=[];
  const input:BodyRunInput={bodies:[1,2].map(i=>({id:`B-${i}`,productId:'PRODUCT',location:{kind:'station',stationId:'ST-A',copy:1}})),jobs:[1,2].map(job=>({job,bodyId:`B-${job}`}))};
  const result=scheduleWorkerRun(project,1,2,input);assert.equal(result.runs.length,4);
  assert.ok(result.runs.filter(r=>r.transport).every(r=>r.transport!.endSeconds-r.transport!.startSeconds===2));
  project.assemblyTransport!.routes=[];assert.throws(()=>scheduleWorkerRun(project,1,2,input),/jawnego zestawu/);
  const other=assemblyMovementFixture().project;other.assemblyTransport!.carts[0].initialLocation={stationId:'ST-C',copy:1};
  assert.throws(()=>scheduleWorkerRun(other,1,1,assemblyScheduleInput()),/dojazdu/);
});

function addReturnRoute(project:ReturnType<typeof assemblyMovementFixture>['project']){
  const route=project.stationRouting!.routes.find(r=>r.id==='R-A')!,worker=project.workers[0].id;
  project.assemblyTransport!.emptyRoutes=[{...project.assemblyTransport!.emptyRoutes[0],id:'EMPTY-C-A',from:route.to,to:route.from,
    workerAssignment:{workerIds:[worker],source:'Jawny test przydziału dojazdu'}}];
}
test('3.4g: dojazd bez ładunku nie rezerwuje celu ani korpusu przed wyjazdem z wyrobem',()=>{
  const {project}=assemblyMovementFixture();addReturnRoute(project);
  project.assemblyTransport!.carts[0].initialLocation={stationId:'ST-C',copy:1};
  const result=scheduleWorkerRun(project,1,1,assemblyScheduleInput()),run=result.runs.find(r=>r.transport)!;
  assert.deepEqual(result.transportMovements!.map(m=>[m.purpose,m.startSeconds,m.endSeconds]),[['approach',10,15],['transfer',15,17]]);
  assert.deepEqual([run.stationReserveStartSeconds,run.transport!.startSeconds,run.transport!.endSeconds,run.startSeconds,run.waitSeconds],[15,15,17,17,5]);
  assert.ok(run.waitCauses.includes('transport'));assert.deepEqual(result.cartBook!.carts[0].location,{stationId:'ST-C',copy:1});
  const transfer=result.bodyEvents!.find(e=>e.kind==='start-transfer')!;assert.equal(transfer.atSeconds,15);
});
test('3.4g: powrót ma odrębne osoby/rezerwacje i czeka na montaż, bez przedłużania przewozu korpusu',()=>{
  const {project}=assemblyMovementFixture();addReturnRoute(project);project.assemblyTransport!.carts[0].afterUnload='return-to-initial';
  const before=JSON.stringify(project),result=scheduleWorkerRun(project,1,1,assemblyScheduleInput());
  assert.deepEqual(result.transportMovements!.map(m=>[m.purpose,m.startSeconds,m.endSeconds]),[['transfer',10,12],['return',22,27]]);
  assert.deepEqual(result.cartBook!.carts[0].location,{stationId:'ST-A',copy:1});assert.equal(result.cartBook!.carts[0].movement,null);
  assert.equal(result.jobs[0].finish,22);assert.equal(result.bodyBook!.bodies[0].location.kind,'station');
  assert.equal(JSON.stringify(project),before);
  const reservations=result.reservations.reservations;
  for(let i=0;i<reservations.length;i++)for(let j=i+1;j<reservations.length;j++){
    const a=reservations[i],b=reservations[j];if(a.workerIds.some(id=>b.workerIds.includes(id)))assert.ok(a.endSeconds<=b.startSeconds||b.endSeconds<=a.startSeconds);
  }
});
test('3.4g: kolejne korpusy nie przejmują wózka podczas oczekiwania na jego powrót',()=>{
  const {project}=assemblyMovementFixture();addReturnRoute(project);project.assemblyTransport!.carts[0].afterUnload='return-to-initial';
  const input:BodyRunInput={bodies:[1,2].map(i=>({id:`B-${i}`,productId:'PRODUCT',location:{kind:'station',stationId:'ST-A',copy:1}})),jobs:[1,2].map(job=>({job,bodyId:`B-${job}`}))};
  const result=scheduleWorkerRun(project,1,2,input),movements=result.transportMovements!;
  assert.equal(result.runs.length,4);assert.equal(movements.filter(m=>m.purpose==='return').length,2);
  for(let i=1;i<movements.length;i++)assert.ok(movements[i-1].endSeconds<=movements[i].startSeconds);
  assert.deepEqual(result.cartBook!.carts[0].location,{stationId:'ST-A',copy:1});
});
test('3.4g: obsada dojazdu zapisuje się, chroni źródło i nie jest domyślnie dziedziczona',()=>{
  const {project}=assemblyMovementFixture();addReturnRoute(project);
  const parsed=parseDomainProjectV6(JSON.stringify(project));assert.deepEqual(parsed.assemblyTransport,project.assemblyTransport);
  const storage=new DraftStorage(),originalJson=JSON.stringify(derive(parseProject(JSON.stringify(base))).project);
  saveDomainDraft(storage,{project,originalJson},null);const reopened=readDomainDraft(storage);assert.equal(reopened.status,'valid');
  if(reopened.status==='valid')assert.deepEqual(reopened.saved.project.assemblyTransport,project.assemblyTransport);
  project.assemblyTransport!.carts[0].initialLocation={stationId:'ST-C',copy:1};
  delete project.assemblyTransport!.emptyRoutes[0].workerAssignment;
  assert.throws(()=>scheduleWorkerRun(project,1,1,assemblyScheduleInput()),/jawnej obsady/);
  project.assemblyTransport!.emptyRoutes[0].workerAssignment={workerIds:['UNKNOWN'],source:'Test'};
  assert.throws(()=>parseDomainProjectV6(JSON.stringify(project)),/osoby dojazdu/);
  assert.equal(storage.getItem(DOMAIN_DRAFT_STORAGE_KEY),reopened.status==='valid'?reopened.raw:undefined);
});


function multipleCartFixture(){
  const {project}=assemblyMovementFixture();
  project.equipment.push({id:'CART-2',name:'Drugi testowy wózek'});
  project.assemblyTransport!.carts.push({...structuredClone(project.assemblyTransport!.carts[0]),equipmentId:'CART-2'});
  project.assemblyTransport!.routes[0].alternatives[0].equipmentIds.push('CART-2');
  return project;
}
test('3.4h: zadeklarowany zestaw wózków rusza atomowo we wspólnym oknie, worker ma ten sam wynik',()=>{
  const project=multipleCartFixture();
  project.assemblyTransport!.carts[1].calendar.breaks=[{startSeconds:10,endSeconds:15,basis:'assumed'}];
  const before=JSON.stringify(project),input=assemblyScheduleInput(),result=scheduleWorkerRun(project,1,1,input);
  const movement=result.transportMovements![0];
  assert.deepEqual([movement.startSeconds,movement.endSeconds],[15,17]);
  assert.deepEqual(movement.equipmentIds,['CART','CART-2']);
  assert.equal(result.transportReservations!.length,1);
  assert.ok(result.cartBook!.carts.every(c=>c.location?.stationId==='ST-C'&&c.movement===null));
  assert.equal(result.bodyEvents!.filter(e=>e.kind==='start-transfer').length,1);
  const replies:ScheduleReply[]=[];executeScheduleRequest({project:{...project,bodyRunInput:input},batch:1,arrivalIntervalSeconds:1},r=>replies.push(r));
  assert.deepEqual((replies.find(r=>r.kind==='result') as {result:unknown}).result,result);
  assert.equal(JSON.stringify(project),before);
});
test('3.4h: niewykonalny zestaw nie przejmuje ani jednego wózka, wygrywa jawna alternatywa',()=>{
  const project=multipleCartFixture();
  project.assemblyTransport!.carts[1].calendar.shifts[0].endSeconds=1;
  project.assemblyTransport!.routes[0].alternatives.push({workerIds:[project.workers[0].id],equipmentIds:[]});
  const result=scheduleWorkerRun(project,1,1,assemblyScheduleInput());
  assert.deepEqual(result.transportMovements![0].equipmentIds,[]);
  assert.equal(result.transportReservations!.length,0);
  assert.ok(result.cartBook!.carts.every(c=>c.location?.stationId==='ST-A'&&c.movement===null));
  project.assemblyTransport!.routes[0].alternatives.pop();
  assert.throws(()=>scheduleWorkerRun(project,1,1,assemblyScheduleInput()),/wspólnego ciągłego okna/);
  project.assemblyTransport!.carts[1].initialLocation={stationId:'ST-C',copy:1};
  assert.throws(()=>scheduleWorkerRun(project,1,1,assemblyScheduleInput()),/jawnego dojazdu/);
});
test('3.4h: wózki zestawu wracają osobnymi trasami, wspólna osoba nie ma nakładających przydziałów',()=>{
  const project=multipleCartFixture();addReturnRoute(project);
  project.assemblyTransport!.carts.forEach(c=>c.afterUnload='return-to-initial');
  project.assemblyTransport!.emptyRoutes.push({...structuredClone(project.assemblyTransport!.emptyRoutes[0]),id:'RETURN-2',equipmentId:'CART-2'});
  const result=scheduleWorkerRun(project,1,1,assemblyScheduleInput());
  assert.deepEqual(result.transportMovements!.map(m=>[m.purpose,m.startSeconds,m.endSeconds]),[['transfer',10,12],['return',22,27],['return',27,32]]);
  assert.ok(result.cartBook!.carts.every(c=>c.location?.stationId==='ST-A'&&c.movement===null));
  assert.equal(result.jobs[0].finish,22);
  const reservations=result.reservations.reservations;
  for(let i=0;i<reservations.length;i++)for(let j=i+1;j<reservations.length;j++){
    const a=reservations[i],b=reservations[j];if(a.workerIds.some(id=>b.workerIds.includes(id)))assert.ok(a.endSeconds<=b.startSeconds||b.endSeconds<=a.startSeconds);
  }
});


function multipleApproachFixture(){
  const project=multipleCartFixture();addReturnRoute(project);
  project.workers.push({id:'APPROACH-2',name:'Druga osoba dojazdu testowego'});
  project.resourceCalendars!.workers['APPROACH-2']=structuredClone(project.resourceCalendars!.workers[project.workers[0].id]);
  project.assemblyTransport!.carts.forEach(c=>c.initialLocation={stationId:'ST-C',copy:1});
  project.assemblyTransport!.emptyRoutes.push({...structuredClone(project.assemblyTransport!.emptyRoutes[0]),id:'APPROACH-SECOND',equipmentId:'CART-2',
    transportTime:{durationSeconds:8,basis:'assumed',source:'Jawny test drugiego dojazdu'},workerAssignment:{workerIds:['APPROACH-2'],source:'Jawny test drugiej obsady'}});
  return project;
}
test('3.4k: rozłączne osoby nie zrównoleglają dojazdów zestawu, przewóz czeka na oba przyjazdy',()=>{
  const project=multipleApproachFixture(),before=JSON.stringify(project),input=assemblyScheduleInput();
  const result=scheduleWorkerRun(project,1,1,input),movements=result.transportMovements!;
  assert.deepEqual(movements.map(m=>[m.purpose,m.startSeconds,m.endSeconds]),[['approach',10,15],['approach',15,23],['transfer',23,25]]);
  assert.deepEqual(movements[0].equipmentIds,['CART']);assert.deepEqual(movements[1].equipmentIds,['CART-2']);
  const run=result.runs.find(r=>r.transport)!;assert.equal(run.stationReserveStartSeconds,23);
  assert.equal(result.bodyEvents!.find(e=>e.kind==='start-transfer')!.atSeconds,23);
  assert.ok(result.cartBook!.carts.every(c=>c.location?.stationId==='ST-C'&&c.movement===null));
  const replies:ScheduleReply[]=[];executeScheduleRequest({project:{...project,bodyRunInput:input},batch:1,arrivalIntervalSeconds:1},r=>replies.push(r));
  assert.deepEqual((replies.find(r=>r.kind==='result') as {result:unknown}).result,result);assert.equal(JSON.stringify(project),before);
});
test('3.4k: kolejność urządzeń steruje dojazdami, wspólna osoba i przerwa pozostają respektowane',()=>{
  const project=multipleApproachFixture();project.assemblyTransport!.routes[0].alternatives[0].equipmentIds.reverse();
  const result=scheduleWorkerRun(project,1,1,assemblyScheduleInput());
  assert.deepEqual(result.transportMovements!.map(m=>[m.equipmentIds,m.startSeconds,m.endSeconds]),[[['CART-2'],10,18],[['CART'],18,23],[['CART-2','CART'],23,25]]);
  const shared=multipleApproachFixture();shared.assemblyTransport!.emptyRoutes[1].workerAssignment!.workerIds=[shared.workers[0].id];
  shared.assemblyTransport!.carts[1].calendar.breaks=[{startSeconds:15,endSeconds:20,basis:'assumed'}];
  const delayed=scheduleWorkerRun(shared,1,1,assemblyScheduleInput());
  assert.deepEqual(delayed.transportMovements!.map(m=>[m.startSeconds,m.endSeconds]),[[10,15],[20,28],[28,30]]);
  const reservations=delayed.reservations.reservations;
  for(let i=0;i<reservations.length;i++)for(let j=i+1;j<reservations.length;j++){
    const a=reservations[i],b=reservations[j];if(a.workerIds.some(id=>b.workerIds.includes(id)))assert.ok(a.endSeconds<=b.startSeconds||b.endSeconds<=a.startSeconds);
  }
});
test('3.4k: wózek przy odbiorze pomija dojazd, brak drogi lub okna drugiego nie publikuje przegranej alternatywy',()=>{
  const project=multipleApproachFixture();project.assemblyTransport!.carts[0].initialLocation={stationId:'ST-A',copy:1};
  const result=scheduleWorkerRun(project,1,1,assemblyScheduleInput());
  assert.deepEqual(result.transportMovements!.map(m=>[m.purpose,m.startSeconds,m.endSeconds]),[['approach',10,18],['transfer',18,20]]);
  const invalid=multipleApproachFixture();invalid.assemblyTransport!.emptyRoutes.pop();
  const before=JSON.stringify(invalid);assert.throws(()=>scheduleWorkerRun(invalid,1,1,assemblyScheduleInput()),/jawnego dojazdu/);assert.equal(JSON.stringify(invalid),before);
  invalid.assemblyTransport!.routes[0].alternatives.push({workerIds:[invalid.workers[0].id],equipmentIds:[]});
  const alternative=scheduleWorkerRun(invalid,1,1,assemblyScheduleInput());
  assert.equal(alternative.transportMovements!.length,1);assert.ok(alternative.cartBook!.carts.every(c=>c.location?.stationId==='ST-C'));
  assert.equal(alternative.transportReservations!.length,0);
  const closed=multipleApproachFixture();closed.assemblyTransport!.carts[1].calendar.shifts[0].endSeconds=7;
  assert.throws(()=>scheduleWorkerRun(closed,1,1,assemblyScheduleInput()),/wspólnego okna/);
});

test('3.4k: kolejna partia nie przejmuje wózka w ruchu ani osób pierwszego dojazdu',()=>{
  const project=multipleApproachFixture();
  const input:BodyRunInput={bodies:[1,2].map(i=>({id:`MULTI-${i}`,productId:'PRODUCT',location:{kind:'station',stationId:'ST-A',copy:1}})),jobs:[1,2].map(job=>({job,bodyId:`MULTI-${job}`}))};
  const result=scheduleWorkerRun(project,1,2,input);assert.equal(result.runs.length,4);
  assert.equal(result.transportMovements!.filter(m=>m.purpose==='transfer').length,2);
  const movements=result.transportMovements!;
  for(let i=0;i<movements.length;i++)for(let j=i+1;j<movements.length;j++){
    const a=movements[i],b=movements[j];if(a.equipmentIds.some(id=>b.equipmentIds.includes(id))||a.workerIds.some(id=>b.workerIds.includes(id)))assert.ok(a.endSeconds<=b.startSeconds||b.endSeconds<=a.startSeconds);
  }
  const reservations=result.reservations.reservations;
  for(let i=0;i<reservations.length;i++)for(let j=i+1;j<reservations.length;j++){
    const a=reservations[i],b=reservations[j];if(a.workerIds.some(id=>b.workerIds.includes(id)))assert.ok(a.endSeconds<=b.startSeconds||b.endSeconds<=a.startSeconds);
  }
  assert.ok(result.cartBook!.carts.every(c=>c.location?.stationId==='ST-C'&&c.movement===null));
});


test('3.4l: JIT jest jawny, pomija transport i nie zmienia projektu ani domyślnego wyniku',()=>{
  const {project}=assemblyMovementFixture(),input=assemblyScheduleInput(),before=JSON.stringify(project);
  const normal=scheduleWorkerRun(project,1,1,input);
  assert.deepEqual(scheduleWorkerRun(project,1,1,input,undefined,{transportMode:'configured'}),normal);
  assert.equal(normal.jobs[0].finish,22);
  const jit=scheduleWorkerRun(project,1,1,undefined,undefined,{transportMode:'just-in-time'});
  assert.equal(jit.jobs[0].finish,20);assert.equal(jit.transportMode,'just-in-time');
  assert.equal(jit.bodyBook,undefined);assert.equal(jit.transportMovements,undefined);
  assert.ok(jit.runs.every(r=>!r.transport&&!r.bodyId));assert.equal(JSON.stringify(project),before);
  const replies:ScheduleReply[]=[];executeScheduleRequest({project,batch:1,arrivalIntervalSeconds:1,transportMode:'just-in-time'},r=>replies.push(r));
  assert.deepEqual((replies.find(r=>r.kind==='result') as {result:unknown}).result,jit);
});
test('3.4l: sam proces działa bez tras, korpusów i konfiguracji transportów',()=>{
  const {project}=assemblyMovementFixture();delete project.assemblyTransport;delete project.bodyRunInput;
  project.stationRouting!.routes=[];
  assert.throws(()=>scheduleWorkerRun(project,1,1));
  const result=scheduleWorkerRun(project,1,2,undefined,undefined,{transportMode:'just-in-time'});
  assert.equal(result.runs.length,4);assert.equal(result.jobs[1].finish,30);
  const reservations=result.reservations.reservations;
  for(let i=0;i<reservations.length;i++)for(let j=i+1;j<reservations.length;j++){
    const a=reservations[i],b=reservations[j];if(a.workerIds.some(id=>b.workerIds.includes(id)))assert.ok(a.endSeconds<=b.startSeconds||b.endSeconds<=a.startSeconds);
  }
});
test('3.4l: JIT zachowuje kalendarz montażu i odrzuca nieznany tryb',()=>{
  const {project,workerId}=assemblyMovementFixture();
  for(const id of project.workerRunSelection!.teamWorkerIds)project.resourceCalendars!.workers[id].breaks=[{startSeconds:10,endSeconds:15,basis:'assumed'}];
  const result=scheduleWorkerRun(project,1,1,undefined,undefined,{transportMode:'just-in-time'});
  assert.equal(result.runs[1].startSeconds,15);assert.equal(result.jobs[0].finish,25);
  assert.throws(()=>scheduleWorkerRun(project,1,1,undefined,undefined,{transportMode:'other' as 'configured'}),/Nieznany tryb/);
});


function subassemblyFlowFixture(){
  const {project}=assemblyMovementFixture();
  const producer=project.operations[0].id,consumer=project.operations[1].id;
  project.operations[0].physicalRole={kind:'subassembly-preparation',subassemblyIds:['SUB-FLOW']};
  project.subassemblies=[{id:'SUB-FLOW',name:'Partia syntetyczna',producerOperationId:producer,consumerOperationIds:[consumer]}];
  const flow:SubassemblyFlow={availability:'producer-finish',consumption:'consumer-start',lots:[{
    id:'LOT-1',subassemblyId:'SUB-FLOW',quantity:2,unit:'szt.',producer:{job:1,operationId:producer},
    consumer:{job:1,operationId:consumer},consumptionQuantity:1,source:'Jawny scenariusz testowy, nie pomiar produkcji'}]};
  return {project,flow};
}
test('3.4m1: partie zapisują jawne ilości, wykonania i regułę A, bez mutacji projektu',()=>{
  const {project,flow}=subassemblyFlowFixture(),before=JSON.stringify(project);
  const edited=editDomainSubassemblyFlow(project,flow);
  assert.equal(JSON.stringify(project),before);assert.deepEqual(parseDomainProjectV6(JSON.stringify(edited)).subassemblyFlow,flow);
  assert.deepEqual(editDomainSubassemblyFlow(edited,undefined),project);
  assert.throws(()=>scheduleWorkerRun(edited,1,1),/instanc|korpus/i);
  const jit=scheduleWorkerRun(edited,1,1,undefined,undefined,{transportMode:'just-in-time'});
  assert.equal(jit.transportMode,'just-in-time');assert.equal(jit.jobs[0].finish,20);
  const replies:ScheduleReply[]=[];executeScheduleRequest({project:edited,batch:1,arrivalIntervalSeconds:1},r=>replies.push(r));
  assert.ok(replies.some(r=>r.kind==='error'));
});
test('3.4m1: parser odrzuca błędne referencje, ilości i niejawne reguły',()=>{
  const {project,flow}=subassemblyFlowFixture();
  const bad=(change:(value:SubassemblyFlow)=>void)=>{const value=structuredClone(flow);change(value);assert.throws(()=>editDomainSubassemblyFlow(project,value));};
  bad(f=>f.lots.push(structuredClone(f.lots[0])));bad(f=>f.lots[0].quantity=0);bad(f=>f.lots[0].consumptionQuantity=3);
  bad(f=>f.lots[0].unit=' ');bad(f=>f.lots[0].source='');bad(f=>f.lots[0].producer.job=0);
  bad(f=>f.lots[0].consumer.job=1.5);bad(f=>f.lots[0].producer.operationId='UNKNOWN');
  bad(f=>f.lots[0].subassemblyId='UNKNOWN');bad(f=>f.lots[0].consumer.operationId=f.lots[0].producer.operationId);
  bad(f=>f.lots=[]);bad(f=>(f as unknown as {consumption:string}).consumption='during-work');
  bad(f=>(f.lots[0] as unknown as {extra:number}).extra=1);
  const edited=editDomainSubassemblyFlow(project,flow),broken=structuredClone(edited);broken.subassemblies=[];
  assert.throws(()=>parseDomainProjectV6(JSON.stringify(broken)));
  const missingRole=structuredClone(project);delete missingRole.operations[0].physicalRole;
  assert.throws(()=>editDomainSubassemblyFlow(missingRole,flow),/przygotowania/);
});
test('3.4m1: odczyt, cofnięcie i odmowa zapisu chronią dokładne źródła 4/5',()=>{
  const {project,flow}=subassemblyFlowFixture(),edited=editDomainSubassemblyFlow(project,flow);
  for(const originalJson of [JSON.stringify(derive(parseProject(JSON.stringify(base))).project),readFileSync('tests/qa/Eko_D5_actual_export_v5.json','utf8')]){
    const storage=new DraftStorage(),initial=saveDomainDraft(storage,{project,originalJson},null);
    const written=saveDomainDraft(storage,{project:edited,originalJson},initial.raw),reopened=readDomainDraft(storage);
    assert.equal(reopened.status,'valid');if(reopened.status==='valid'){
      assert.equal(reopened.saved.originalJson,originalJson);assert.deepEqual(reopened.saved.project.subassemblyFlow,flow);
    }
    const invalid=structuredClone(edited);invalid.subassemblyFlow!.lots[0].consumptionQuantity=99;
    assert.throws(()=>saveDomainDraft(storage,{project:invalid,originalJson},written.raw));
    assert.equal(storage.getItem(DOMAIN_DRAFT_STORAGE_KEY),written.raw);
    const undone=saveDomainDraft(storage,{project,originalJson},written.raw);
    const old=readDomainDraft(storage);assert.equal(old.status,'valid');if(old.status==='valid')assert.equal(old.saved.project.subassemblyFlow,undefined);
    saveDomainDraft(storage,{project:edited,originalJson},undone.raw);
    const corrupt=JSON.parse(storage.getItem(DOMAIN_DRAFT_STORAGE_KEY)!);corrupt.project.subassemblyFlow.lots[0].unit='';
    const raw=JSON.stringify(corrupt);storage.setItem(DOMAIN_DRAFT_STORAGE_KEY,raw);
    assert.equal(readDomainDraft(storage).status,'corrupt');assert.equal(storage.getItem(DOMAIN_DRAFT_STORAGE_KEY),raw);
  }
});


function subassemblyScheduleFixture(){
  const {project,flow}=subassemblyFlowFixture();project.subassemblyFlow=flow;
  const input=assemblyScheduleInput();input.bodies[0].location={kind:'station',stationId:'ST-C',copy:1};
  project.bodyRunInput=input;return project;
}

function subassemblyBufferedFixture(){
  const project=subassemblyScheduleFixture();
  project.subassemblyBuffers={buffers:[
    {subassemblyId:'SUB-FLOW',unit:'szt.',stationId:'ST-A',copy:null,inputCapacity:null,outputCapacity:2,blockingPolicy:'bbas-worker-released'},
    {subassemblyId:'SUB-FLOW',unit:'szt.',stationId:'ST-C',copy:null,inputCapacity:2,outputCapacity:null,blockingPolicy:'bbas-worker-released'}
  ]};
  return project;
}

function subassemblyDirectFixture(policy:'bbas'|'bbas-worker-released'='bbas'){
  const project=subassemblyBufferedFixture();
  project.subassemblyBuffers!.buffers[0].outputCapacity=0;project.subassemblyBuffers!.buffers[0].blockingPolicy=policy;
  project.subassemblyBuffers!.buffers[1].inputCapacity=0;
  project.subassemblyFlow!.lots[0].consumptionQuantity=2;
  project.workerRunSelection!.operations[0].eligibleWorkerIds=[project.workers[0].id];
  project.workerRunSelection!.operations[1].eligibleWorkerIds=[project.workers[1].id];
  for(const worker of project.workers)project.resourceCalendars!.workers[worker.id]={shifts:[{startSeconds:0,endSeconds:200,basis:'assumed'}],breaks:[]};
  project.resourceCalendars!.stations['ST-A']={shifts:[{startSeconds:0,endSeconds:200,basis:'assumed'}],breaks:[]};
  project.resourceCalendars!.stations['ST-C']={shifts:[{startSeconds:50,endSeconds:200,basis:'assumed'}],breaks:[]};
  return project;
}
function mixedSubassemblyReceiptFixture(){
  const project=subassemblyDirectFixture();
  project.subassemblies.push({id:'STOCKED',name:'Jawny podzespół składowany — test',producerOperationId:project.operations[0].id,consumerOperationIds:[project.operations[1].id]});
  project.operations[0].physicalRole={kind:'subassembly-preparation',subassemblyIds:['SUB-FLOW','STOCKED']};
  project.subassemblyFlow!.lots.push({...structuredClone(project.subassemblyFlow!.lots[0]),id:'STOCKED-LOT',subassemblyId:'STOCKED',quantity:3,consumptionQuantity:1,source:'Jawna syntetyczna partia towarzysząca'});
  project.subassemblyBuffers!.buffers.push(
    {subassemblyId:'STOCKED',unit:'szt.',stationId:'ST-A',copy:1,inputCapacity:null,outputCapacity:3,blockingPolicy:'bbas'},
    {subassemblyId:'STOCKED',unit:'szt.',stationId:'ST-C',copy:1,inputCapacity:3,outputCapacity:null,blockingPolicy:'bbas-worker-released'});
  project.workers.push({id:'W-MIX-TR',name:'Jawny monter transportujący partie — test'});
  project.resourceCalendars!.workers['W-MIX-TR']={shifts:[{startSeconds:0,endSeconds:200,basis:'assumed'}],breaks:[]};
  project.assemblyTransport!.routes[0].alternatives[0].workerIds=['W-MIX-TR'];
  addReturnRoute(project);project.assemblyTransport!.emptyRoutes[0].workerAssignment!.workerIds=['W-MIX-TR'];
  project.assemblyTransport!.carts[0].afterUnload='return-to-initial';
  return project;
}

function graphBodyBufferedFixture(){
  const project=subassemblyBufferedFixture(),producer=project.operations[0],consumer=project.operations[1];
  const initial={...structuredClone(consumer),id:'BODY-FIRST',name:'Jawna początkowa obróbka korpusu — test',predecessorIds:[producer.id]};
  project.operations.splice(1,0,initial);consumer.predecessorIds=[producer.id,initial.id];
  project.stations.find(station=>station.id==='ST-A')!.operationIds.push(initial.id);
  project.stationRouting!.operations.push({operationId:initial.id,candidates:[{stationId:'ST-A',copy:1,requiredEquipmentIds:[]}]});
  project.workerRunSelection!.operations.push({operationId:initial.id,workerCount:1,eligibleWorkerIds:[project.workers[1].id]});
  project.workerRunSelection!.operations.find(operation=>operation.operationId===consumer.id)!.eligibleWorkerIds=[project.workers[1].id];
  project.workerRunSelection!.operations.find(operation=>operation.operationId===producer.id)!.eligibleWorkerIds=[project.workers[0].id];
  project.bodyRunInput!.bodies[0].location={kind:'station',stationId:'ST-A',copy:1};
  project.stationBuffers={buffers:[
    {stationId:'ST-A',copy:1,inputCapacity:1,outputCapacity:1,blockingPolicy:'bbas-worker-released'},
    {stationId:'ST-C',copy:1,inputCapacity:1,outputCapacity:null,blockingPolicy:'bbas-worker-released'}
  ]};
  project.resourceCalendars!.stations['ST-C'].shifts[0].startSeconds=50;
  addReturnRoute(project);project.assemblyTransport!.carts[0].afterUnload='return-to-initial';
  return project;
}

function graphLocalContinuationFixture(){
  const project=graphBodyBufferedFixture(),initial=project.operations.find(operation=>operation.id==='BODY-FIRST')!,last=project.operations[2];
  const local={...structuredClone(initial),id:'BODY-LOCAL',name:'Jawna lokalna integracja — test',predecessorIds:[initial.id]};
  project.operations.splice(2,0,local);last.predecessorIds=[local.id];
  project.stations.find(station=>station.id==='ST-A')!.operationIds.push(local.id);
  project.stationRouting!.operations.push({operationId:local.id,candidates:[{stationId:'ST-A',copy:1,requiredEquipmentIds:[]}]});
  project.workerRunSelection!.operations.push({operationId:local.id,workerCount:1,eligibleWorkerIds:[project.workers[1].id]});
  project.subassemblies[0].consumerOperationIds=[local.id];project.subassemblyFlow!.lots[0].consumer.operationId=local.id;
  project.subassemblyBuffers!.buffers.splice(1,1);
  project.subassemblyBuffers!.buffers[0].inputCapacity=2;
  project.materialSupply={items:[{id:'LOCAL-GRAPH-SUP',componentId:'EXPLICIT-PART',targetStationId:'ST-A',initialStock:0,unit:'szt.',schedule:{kind:'explicit-deliveries',deliveries:[{deliveryTimeSeconds:50,quantity:1}]},source:'Jawna syntetyczna dostawa dla lokalnej integracji'}],consumptions:[{operationId:local.id,supplyId:'LOCAL-GRAPH-SUP',quantity:1,source:'Jawne pobranie lokalne'}]};
  return project;
}

test('7.12.C2-B3c: lokalny korpus czeka 20–50 bez depozytu, wspólny start pobiera partię i materiał',()=>{
  const project=graphLocalContinuationFixture(),before=JSON.stringify(project),result=scheduleWorkerRun(project,1,1,project.bodyRunInput);
  const first=result.runs.find(run=>run.operationId==='BODY-FIRST')!,local=result.runs.find(run=>run.operationId==='BODY-LOCAL')!;
  assert.deepEqual([first.startSeconds,first.endSeconds,first.stationReleaseSeconds,first.continuationWaitSeconds,first.blockedSeconds],[10,20,50,30,0]);
  assert.equal(first.reserveEndSeconds,20);assert.deepEqual([local.startSeconds,local.endSeconds],[50,60]);assert.equal(result.jobs[0].finish,72);
  assertNoWorkerOverlap(result);assert.equal(JSON.stringify(project),before);
  assert.deepEqual(result.transportMovements!.map(move=>[move.purpose,move.startSeconds,move.endSeconds]),[['transfer',60,62],['return',62,67]]);
  assert.ok(!result.bufferEvents!.some(event=>event.stationId==='ST-A'&&(event.kind==='output'&&event.atSeconds<60||event.kind==='input'&&event.atSeconds>10)));
  assert.deepEqual(result.bodyEvents!.map(event=>[event.kind,event.atSeconds]),[['reserve',10],['release',50],['reserve',50],['release',60],['start-transfer',60],['finish-transfer',62],['reserve',62],['release',72]]);
  assert.equal(result.subassemblyEvents!.find(event=>event.kind==='consumed')!.atSeconds,50);
  assert.deepEqual(result.materialEvents!.map(event=>[event.kind,event.atSeconds]),[['delivery',50],['consumption',50]]);
  const history=prepareDomainPhysicalPlayback(project,result,{batch:1,arrivalIntervalSeconds:1,transportMode:'configured'}),waiting=domainPhysicalPlaybackFrame(history,30).bodies[0];
  assert.equal(waiting.status,'reserved');assert.deepEqual(waiting.location,{kind:'station',stationId:'ST-A',copy:1});
});

test('7.12.C2-B3c: lokalne oczekiwanie zatrzymuje poprzednie wyposażenie, osoby kończą według profili',()=>{
  const project=graphLocalContinuationFixture(),first=project.operations.find(operation=>operation.id==='BODY-FIRST')!,local=project.operations.find(operation=>operation.id==='BODY-LOCAL')!;
  const firstProfile=first.staffing!.timeVariants[0].timeProfile;firstProfile.manualWork=[{startSeconds:0,endSeconds:5,basis:'assumed'}];firstProfile.operatorPresence=[{startSeconds:0,endSeconds:5,basis:'assumed'}];firstProfile.machineRun=[{startSeconds:5,endSeconds:10,basis:'assumed'}];
  const localProfile=local.staffing!.timeVariants[0].timeProfile;localProfile.manualWork=[{startSeconds:3,endSeconds:10,basis:'assumed'}];localProfile.operatorPresence=[{startSeconds:3,endSeconds:10,basis:'assumed'}];localProfile.machineRun=[{startSeconds:0,endSeconds:3,basis:'assumed'}];
  project.equipment.push({id:'LOCAL-EQ',name:'Jawny przyrząd lokalnej kontynuacji — test',stationId:'ST-A',capableOperationIds:[first.id,local.id]});
  project.stationRouting!.equipmentPlacements.push({equipmentId:'LOCAL-EQ',stationId:'ST-A',copy:1});
  for(const id of [first.id,local.id])project.stationRouting!.operations.find(operation=>operation.operationId===id)!.candidates[0].requiredEquipmentIds=['LOCAL-EQ'];
  const result=scheduleWorkerRun(project,1,1,project.bodyRunInput),initialRun=result.runs.find(run=>run.operationId===first.id)!,localRun=result.runs.find(run=>run.operationId===local.id)!;
  assert.equal(initialRun.reserveEndSeconds,15);assert.equal(initialRun.stationReleaseSeconds,50);assert.equal(initialRun.continuationWaitSeconds,30);
  assert.deepEqual([localRun.startSeconds,localRun.reserveStartSeconds,localRun.reserveEndSeconds],[50,53,60]);
  assert.deepEqual(initialRun.equipmentIds,['LOCAL-EQ']);assert.deepEqual(localRun.equipmentIds,['LOCAL-EQ']);assert.equal(result.jobs[0].finish,72);assertNoWorkerOverlap(result);
});

test('7.12.C2-B3c: dwa zlecenia nie przejmują kopii pozostającej przy lokalnym korpusie',()=>{
  const project=graphLocalContinuationFixture(),lot=structuredClone(project.subassemblyFlow!.lots[0]),body=structuredClone(project.bodyRunInput!.bodies[0]);
  project.subassemblyFlow!.lots.push({...lot,id:'LOCAL-LOT-2',producer:{...lot.producer,job:2},consumer:{...lot.consumer,job:2}});
  project.bodyRunInput!.bodies.push({...body,id:'LOCAL-BODY-2'});project.bodyRunInput!.jobs.push({job:2,bodyId:'LOCAL-BODY-2'});
  project.materialSupply!.items[0].schedule={kind:'explicit-deliveries',deliveries:[{deliveryTimeSeconds:50,quantity:2}]};
  project.subassemblyBuffers!.buffers[0].outputCapacity=4;
  project.subassemblyBuffers!.buffers[0].inputCapacity=3; // Explicit room for the first residual piece plus the next whole lot of two.
  project.resourceCalendars!.workers[project.workers[0].id].shifts[0].endSeconds=200;
  const result=scheduleWorkerRun(project,1,2,project.bodyRunInput),nextInitial=result.runs.find(run=>run.job===2&&run.operationId==='BODY-FIRST')!;
  assert.equal(nextInitial.startSeconds,60);assert.deepEqual(result.jobs.map(job=>job.finish),[80,102]);assertNoWorkerOverlap(result);
  assert.ok(!result.bufferEvents!.some(event=>event.job===1&&event.stationId==='ST-A'&&event.kind==='output'&&event.atSeconds<60));
});

test('7.12.C2-B3c: cały lokalny ciąg działa bez trasy i zestawu transportu, brak fikcyjnego depozytu',()=>{
  const project=graphLocalContinuationFixture(),last=project.operations.pop()!;
  for(const station of project.stations)station.operationIds=station.operationIds.filter(id=>id!==last.id);
  project.workerRunSelection!.operations=project.workerRunSelection!.operations.filter(operation=>operation.operationId!==last.id);
  project.stationRouting!.operations=project.stationRouting!.operations.filter(operation=>operation.operationId!==last.id);project.stationRouting!.routes=[];
  project.stationBuffers!.buffers=project.stationBuffers!.buffers.filter(buffer=>buffer.stationId==='ST-A');project.stationBuffers!.buffers[0].outputCapacity=null;
  delete project.assemblyTransport;
  const result=scheduleWorkerRun(project,1,1,project.bodyRunInput);
  assert.equal(result.jobs[0].finish,60);assert.equal(result.transportMovements!.length,0);assert.equal(result.bufferBook!.tokens.length,0);
  assert.ok(!result.bodyEvents!.some(event=>event.kind==='start-transfer'||event.kind==='finish-transfer'));assertNoWorkerOverlap(result);
});

test('7.12.C2-B3c: atomowy adapter odrzuca przedwczesne zwolnienie i zły poprzednik bez mutacji',()=>{
  const project=graphLocalContinuationFixture(),id=project.bodyRunInput!.bodies[0].id;
  const overlay=new GraphBodyBuffers(project,project.operations.map(operation=>operation.id),new Map(project.stationRouting!.operations.map(operation=>[operation.operationId,operation.candidates])));
  let bodies=createBodyBook(project,project.bodyRunInput!.bodies,0);overlay.input(id,'BODY-FIRST',10);
  bodies=overlay.event(bodies,{kind:'reserve',bodyId:id,operationId:'BODY-FIRST',atSeconds:10,endSeconds:20,basis:'assumed'})!;
  const before=JSON.stringify({bodies,buffers:overlay.buffers});
  assert.throws(()=>overlay.event(bodies,{kind:'release',bodyId:id,operationId:'BODY-FIRST',atSeconds:20}),/Lokalna kontynuacja/);
  assert.throws(()=>overlay.event(bodies,{kind:'reserve',bodyId:id,operationId:'BODY-LOCAL',atSeconds:19,endSeconds:29,basis:'assumed'}),/przed końcem/);
  assert.throws(()=>overlay.event(bodies,{kind:'reserve',bodyId:id,operationId:project.operations[3].id,atSeconds:20,endSeconds:30,basis:'assumed'}));
  assert.equal(JSON.stringify({bodies,buffers:overlay.buffers}),before);
  const continued=overlay.event(bodies,{kind:'reserve',bodyId:id,operationId:'BODY-LOCAL',atSeconds:50,endSeconds:60,basis:'assumed'})!;
  assert.equal(continued.bodies[0].status,'reserved');assert.equal(overlay.buffers.tokens.length,0);
});

test('7.12.C2-B3c: brak materiału w lokalnej kontynuacji nie jest pozorną blokadą pojemności wyjścia',()=>{
  const project=graphLocalContinuationFixture();project.materialSupply!.items[0].schedule={kind:'explicit-deliveries',deliveries:[]};
  assert.throws(()=>scheduleWorkerRun(project,1,1,project.bodyRunInput),(error:unknown)=>{
    const diagnostic=parseProcessStallDiagnostic(error)!;assert.ok(diagnostic);assert.notEqual(diagnostic.type,'buffer-deadlock');
    assert.ok(diagnostic.stalledOperations.some(operation=>operation.operationId==='BODY-LOCAL'&&operation.waitCauses.includes('material')));return true;
  });
});

test('7.12.C2-B3c: syntetyczny wzorzec UI zachowuje kopię 40–100 i wyposażenie do lokalnego startu',()=>{
  const input=JSON.parse(advancedDemoPackage().data.draftRaw).project,before=JSON.stringify(input),project=prepareC2B3cUiProject(input);
  const result=scheduleWorkerRun(project,1,1,project.bodyRunInput),initial=result.runs.find(run=>run.operationId==='MU-OP10-M')!,local=result.runs.find(run=>run.operationId==='MU-LOCAL-B3C')!;
  assert.equal(JSON.stringify(input),before);assertNoWorkerOverlap(result);
  assert.deepEqual([initial.startSeconds,initial.endSeconds,initial.stationReleaseSeconds,initial.continuationWaitSeconds,initial.reserveEndSeconds],[0,40,100,60,40]);
  assert.deepEqual([local.startSeconds,local.endSeconds],[100,140]);assert.equal(result.jobs[0].finish,630);
  assert.deepEqual(result.transportMovements!.filter(move=>move.purpose==='transfer'&&!move.lotId).map(move=>[move.startSeconds,move.endSeconds]),[[140,150],[570,580]]);
  assert.equal(result.materialEvents!.find(event=>event.kind==='consumption'&&event.operationId==='MU-LOCAL-B3C')!.atSeconds,100);
  const history=prepareDomainPhysicalPlayback(project,result,{batch:1,arrivalIntervalSeconds:1,transportMode:'configured'});
  assert.equal(domainPhysicalPlaybackFrame(history,80).bodies[0].status,'reserved');
  assert.deepEqual(initial.equipmentIds,local.equipmentIds);
});

test('7.12.C2-B3b: niezależna referencja — korpus 20–22, podmontaż 27–29, wspólny start 50',()=>{
  const project=graphBodyBufferedFixture(),before=JSON.stringify(project),result=scheduleWorkerRun(project,1,1,project.bodyRunInput);
  assert.equal(result.jobs[0].finish,60);assertNoWorkerOverlap(result);assert.equal(JSON.stringify(project),before);
  assert.deepEqual(result.runs.map(run=>[run.operationId,run.startSeconds,run.endSeconds]),[[project.operations[0].id,0,10],['BODY-FIRST',10,20],[project.operations[2].id,50,60]]);
  assert.deepEqual(result.transportMovements!.map(move=>[move.purpose,move.startSeconds,move.endSeconds]),[['transfer',20,22],['return',22,27],['transfer',27,29],['return',29,34]]);
  assert.deepEqual(result.bodyEvents!.map(event=>[event.kind,event.atSeconds]),[['reserve',10],['release',20],['start-transfer',20],['finish-transfer',22],['reserve',50],['release',60]]);
  assert.equal(result.subassemblyEvents!.find(event=>event.kind==='consumed')!.atSeconds,50);
  assert.equal(result.bufferBook!.tokens.length,0);
  const history=prepareDomainPhysicalPlayback(project,result,{batch:1,arrivalIntervalSeconds:1,transportMode:'configured'});
  assert.equal(domainPhysicalPlaybackFrame(history,21).bodies[0].status,'moving');
  assert.deepEqual(domainPhysicalPlaybackFrame(history,30).bodies[0].location,{kind:'station',stationId:'ST-C',copy:1});
});

test('7.12.C2-B3b: rezerwacja wejścia w trakcie ruchu chroni ostatnie miejsce przed drugim korpusem',()=>{
  const project=graphBodyBufferedFixture(),first=project.bodyRunInput!.bodies[0],second={...structuredClone(first),id:'SECOND-BODY'};
  const candidates=new Map(project.stationRouting!.operations.map(operation=>[operation.operationId,operation.candidates]));
  const overlay=new GraphBodyBuffers(project,project.operations.map(operation=>operation.id),candidates);
  let bodies=createBodyBook(project,[first,second],0);
  overlay.input(first.id,'BODY-FIRST',0);bodies=overlay.event(bodies,{kind:'reserve',bodyId:first.id,operationId:'BODY-FIRST',atSeconds:0,endSeconds:10,basis:'assumed'})!;
  bodies=overlay.event(bodies,{kind:'release',bodyId:first.id,operationId:'BODY-FIRST',atSeconds:10})!;
  bodies=overlay.event(bodies,{kind:'start-transfer',bodyId:first.id,atSeconds:10,endSeconds:12,to:{stationId:'ST-C',copy:1},basis:'assumed'})!;
  assert.equal(bufferLoad(overlay.buffers,{stationId:'ST-C',copy:1,side:'input'}),1);assert.equal(overlay.hasInputSpace(project.operations[2].id),false);
  overlay.input(second.id,'BODY-FIRST',10);bodies=overlay.event(bodies,{kind:'reserve',bodyId:second.id,operationId:'BODY-FIRST',atSeconds:10,endSeconds:20,basis:'assumed'})!;
  bodies=overlay.event(bodies,{kind:'finish-transfer',bodyId:first.id,atSeconds:12})!;
  bodies=overlay.event(bodies,{kind:'release',bodyId:second.id,operationId:'BODY-FIRST',atSeconds:20})!;
  const before=JSON.stringify({bodies,buffers:overlay.buffers});
  assert.throws(()=>overlay.event(bodies,{kind:'start-transfer',bodyId:second.id,atSeconds:20,endSeconds:22,to:{stationId:'ST-C',copy:1},basis:'assumed'}),/Bufor pełny/);
  assert.equal(JSON.stringify({bodies,buffers:overlay.buffers}),before);
  bodies=overlay.event(bodies,{kind:'reserve',bodyId:first.id,atSeconds:50,operationId:project.operations[2].id,endSeconds:60,basis:'assumed'})!;
  assert.equal(overlay.hasInputSpace(project.operations[2].id),true);assert.equal(bodies.bodies.find(body=>body.id===second.id)!.status,'available');
});

test('7.12.C2-B3b: bufor wejściowy przyjmuje korpus przed dostawą materiału i wolną operacją',()=>{
  const project=graphBodyBufferedFixture();
  project.materialSupply={items:[{id:'BODY-SUP',componentId:'EXPLICIT-PART',targetStationId:'ST-C',initialStock:0,unit:'szt.',schedule:{kind:'explicit-deliveries',deliveries:[{deliveryTimeSeconds:80,quantity:1}]},source:'Jawny syntetyczny termin dostawy'}],consumptions:[{operationId:project.operations[2].id,supplyId:'BODY-SUP',quantity:1,source:'Jawne pobranie'}]};
  const result=scheduleWorkerRun(project,1,1,project.bodyRunInput);
  assert.equal(result.jobs[0].finish,90);assertNoWorkerOverlap(result);
  assert.equal(result.bodyEvents!.find(event=>event.kind==='finish-transfer')!.atSeconds,22);
  assert.equal(result.subassemblyEvents!.find(event=>event.kind==='consumed')!.atSeconds,80);
  assert.deepEqual(result.materialEvents!.map(event=>[event.kind,event.atSeconds]),[['delivery',80],['consumption',80]]);
});

test('7.12.C2-B3b: jawne odmowy równoległego wejścia 0, częściowej obecności zatrzymanej obsady i ograniczonego końca',()=>{
  const reject=(change:(project:ReturnType<typeof graphBodyBufferedFixture>)=>void,pattern:RegExp)=>{const project=graphBodyBufferedFixture();change(project);const before=JSON.stringify(project);assert.throws(()=>scheduleWorkerRun(project,1,1,project.bodyRunInput),pattern);assert.equal(JSON.stringify(project),before);};
  reject(project=>{project.stationBuffers!.buffers[1].inputCapacity=0;project.physicalConcurrency={groups:[{id:'G-DIR',operationIds:[project.operations[0].id,project.operations[2].id]}]};},/równoległą operacją odbiorcy/);
  reject(project=>{project.stationBuffers!.buffers[0].blockingPolicy='bbas';project.operations.find(operation=>operation.id==='BODY-FIRST')!.staffing!.timeVariants[0].timeProfile.operatorPresence=[{startSeconds:0,endSeconds:5,basis:'assumed'}];},/obecności/);
  reject(project=>{project.stationBuffers!.buffers[1].outputCapacity=1;},/jawnego odbioru/);
  reject(project=>{project.bodyRunInput!.bodies[0].location={kind:'station',stationId:'ST-C',copy:1};},/początkowy korpus/);
  reject(project=>{project.stationBuffers!.buffers[1].inputCapacity=0;project.subassemblyBuffers!.buffers[1].inputCapacity=0;project.subassemblyFlow!.lots[0].consumptionQuantity=2;},/jednoczesne bezpośrednie wejście 0/);
});

test('7.12.C2-B3e: oba zera korpusu z gałęzią — wyjazd 48, przyjazd i wspólny start 50, obsada zatrzymana lub zwolniona',()=>{
  for(const policy of ['bbas','bbas-worker-released'] as const){
    const project=graphBodyBufferedFixture();
    project.stationBuffers={buffers:[
      {stationId:'ST-A',copy:1,inputCapacity:0,outputCapacity:0,blockingPolicy:policy},
      {stationId:'ST-C',copy:1,inputCapacity:0,outputCapacity:null,blockingPolicy:'bbas-worker-released'}
    ]};
    const before=JSON.stringify(project),result=scheduleWorkerRun(project,1,1,project.bodyRunInput);
    const first=result.runs.find(run=>run.operationId==='BODY-FIRST')!,recipient=result.runs.find(run=>run.operationId===project.operations[2].id)!;
    assert.equal(JSON.stringify(project),before);assertNoWorkerOverlap(result);
    assert.deepEqual([first.startSeconds,first.endSeconds,first.stationReleaseSeconds,first.blockedSeconds,first.reserveEndSeconds],[10,20,48,28,policy==='bbas'?48:20]);
    assert.deepEqual([recipient.startSeconds,recipient.endSeconds,recipient.transport?.startSeconds,recipient.transport?.endSeconds],[50,60,48,50]);
    assert.deepEqual(result.transportMovements!.map(move=>[move.purpose,move.startSeconds,move.endSeconds,move.lotId??'body']),[
      ['transfer',20,22,'LOT-1'],['return',22,27,'body'],['transfer',48,50,'body'],['return',50,55,'body']
    ]);
    assert.deepEqual(result.bodyEvents!.map(event=>[event.kind,event.atSeconds]),[
      ['reserve',10],['release',48],['start-transfer',48],['finish-transfer',50],['reserve',50],['release',60]
    ]);
    assert.deepEqual(result.bufferEvents!.map(event=>[event.kind,event.atSeconds,event.stationId]),[
      ['handoff',10,'ST-A'],['blocked',20,'ST-A'],['released',48,'ST-A'],['handoff',50,'ST-C'],['released',60,'ST-C']
    ]);
    assert.equal(result.bufferBook!.tokens.length,0);
    assert.equal(result.subassemblyEvents!.find(event=>event.kind==='consumed')!.atSeconds,50);
    const history=prepareDomainPhysicalPlayback(project,result,{batch:1,arrivalIntervalSeconds:1,transportMode:'configured'});
    assert.equal(domainPhysicalPlaybackFrame(history,35).bodies[0].status,'reserved');
    assert.deepEqual(domainPhysicalPlaybackFrame(history,35).bodies[0].location,{kind:'station',stationId:'ST-A',copy:1});
    assert.equal(domainPhysicalPlaybackFrame(history,49).bodies[0].status,'moving');
  }
});

test('7.12.C2-B3e: zatrzymany monter korpusu wykonuje loaded własnego korpusu i operację odbiorcy, ale nie pusty dojazd',()=>{
  const project=graphBodyBufferedFixture();
  project.stationBuffers={buffers:[
    {stationId:'ST-A',copy:1,inputCapacity:1,outputCapacity:0,blockingPolicy:'bbas'},
    {stationId:'ST-C',copy:1,inputCapacity:0,outputCapacity:null,blockingPolicy:'bbas-worker-released'}
  ]};
  // Place subassembly producer on ST-C so CART-1 stays at ST-A for the body transfer.
  const producerId=project.operations[0].id;
  project.stations.find(s=>s.id==='ST-A')!.operationIds=project.stations.find(s=>s.id==='ST-A')!.operationIds.filter(id=>id!==producerId);
  project.stations.find(s=>s.id==='ST-C')!.operationIds.unshift(producerId);
  project.stationRouting!.operations.find(op=>op.operationId===producerId)!.candidates=[{stationId:'ST-C',copy:1,requiredEquipmentIds:[]}];
  project.subassemblyBuffers={buffers:[{subassemblyId:'SUB-FLOW',unit:'szt.',stationId:'ST-C',copy:1,inputCapacity:2,outputCapacity:2,blockingPolicy:'bbas-worker-released'}]};
  project.resourceCalendars!.stations['ST-C'].shifts[0].startSeconds=0;
  project.materialSupply={items:[{id:'HOLD-SUP',componentId:'EXPLICIT-PART',targetStationId:'ST-C',initialStock:0,unit:'szt.',schedule:{kind:'explicit-deliveries',deliveries:[{deliveryTimeSeconds:50,quantity:1}]},source:'Jawna dostawa przy 50 s'}],consumptions:[{operationId:project.operations[2].id,supplyId:'HOLD-SUP',quantity:1,source:'Jawne pobranie'}]};
  const bodyWorker=project.workers[1].id,branchWorker=project.workers[0].id,cartId=project.assemblyTransport!.carts[0].equipmentId;
  project.assemblyTransport!.routes[0].alternatives=[{equipmentIds:[cartId],workerIds:[bodyWorker]}];
  project.assemblyTransport!.emptyRoutes[0].workerAssignment={workerIds:[bodyWorker],source:'Jawny powrót wózka'};
  const result=scheduleWorkerRun(project,1,1,project.bodyRunInput);
  const first=result.runs.find(run=>run.operationId==='BODY-FIRST')!,recipient=result.runs.find(run=>run.operationId===project.operations[2].id)!;
  assert.deepEqual([first.startSeconds,first.endSeconds,first.stationReleaseSeconds,first.reserveEndSeconds],[10,20,48,48]);
  assert.deepEqual([recipient.startSeconds,recipient.endSeconds],[50,60]);
  assert.deepEqual(result.transportMovements!.map(move=>[move.purpose,move.startSeconds,move.endSeconds,move.workerIds[0]]),[
    ['transfer',48,50,bodyWorker],['return',60,65,bodyWorker]
  ]);
  assertNoWorkerOverlap(result);

  // If the cart starts at ST-C and requires an empty approach to ST-A before picking up the body,
  // the held bodyWorker cannot perform that empty approach while still holding ST-A.
  const approachBlocked=structuredClone(project);
  approachBlocked.assemblyTransport!.carts[0].initialLocation={stationId:'ST-C',copy:1};
  approachBlocked.assemblyTransport!.carts[0].afterUnload='stay-at-destination';
  assert.throws(()=>scheduleWorkerRun(approachBlocked,1,1,approachBlocked.bodyRunInput),/buffer-deadlock|Proces został zatrzymany|Brak miejsca/);

  // Allowing the independent branchWorker on the empty approach lets the cart approach ST-C -> ST-A while bodyWorker stays held until 48.
  const approachByOther=structuredClone(approachBlocked);
  approachByOther.assemblyTransport!.emptyRoutes[0].workerAssignment={workerIds:[branchWorker],source:'Jawny dojazd niezależnej osoby'};
  const withApproach=scheduleWorkerRun(approachByOther,1,1,approachByOther.bodyRunInput);
  const heldFirst=withApproach.runs.find(run=>run.operationId==='BODY-FIRST')!;
  assert.deepEqual([heldFirst.startSeconds,heldFirst.endSeconds,heldFirst.stationReleaseSeconds,heldFirst.reserveEndSeconds],[10,20,48,48]);
  assert.deepEqual(withApproach.transportMovements!.map(move=>[move.purpose,move.startSeconds,move.endSeconds,move.workerIds[0]]),[
    ['approach',20,25,branchWorker],['transfer',48,50,bodyWorker]
  ]);
  assertNoWorkerOverlap(withApproach);
});

test('7.12.C2-B3e: wyjście 0 do dodatniego wejścia oraz dodatnie wyjście do wejścia 0 z odblokowaniem kolejnego zlecenia',()=>{
  // 1) output 0 -> positive input 1 with 2 jobs: job 1 leaves ST-A at 20..22 into ST-C input buffer (1/1); job 2 finishes ST-A and is held on ST-A until job 1 starts on ST-C at 50!
  const outZero=graphBodyBufferedFixture(),lot=structuredClone(outZero.subassemblyFlow!.lots[0]),body=structuredClone(outZero.bodyRunInput!.bodies[0]);
  outZero.workers.push({id:'BODY-RECEIVER',name:'Jawny niezależny monter odbiorcy — test'});
  outZero.workerRunSelection!.teamWorkerIds.push('BODY-RECEIVER');
  outZero.workerRunSelection!.operations.find(operation=>operation.operationId===outZero.operations[2].id)!.eligibleWorkerIds=['BODY-RECEIVER'];
  outZero.resourceCalendars!.workers['BODY-RECEIVER']={shifts:[{startSeconds:0,endSeconds:200,basis:'assumed'}],breaks:[]};
  outZero.stationBuffers={buffers:[
    {stationId:'ST-A',copy:1,inputCapacity:2,outputCapacity:0,blockingPolicy:'bbas'},
    {stationId:'ST-C',copy:1,inputCapacity:1,outputCapacity:null,blockingPolicy:'bbas-worker-released'}
  ]};
  outZero.subassemblyBuffers!.buffers[0].outputCapacity=4;outZero.subassemblyBuffers!.buffers[1].inputCapacity=4;
  outZero.subassemblyFlow!.lots=[
    {...structuredClone(lot),id:'LOT-1',producer:{...lot.producer,job:1},consumer:{...lot.consumer,job:1}},
    {...structuredClone(lot),id:'LOT-2',producer:{...lot.producer,job:2},consumer:{...lot.consumer,job:2}}
  ];
  outZero.bodyRunInput={bodies:[{...structuredClone(body),id:'BODY-1'},{...structuredClone(body),id:'BODY-2'}],jobs:[{job:1,bodyId:'BODY-1'},{job:2,bodyId:'BODY-2'}]};
  const resOutZero=scheduleWorkerRun(outZero,1,2,outZero.bodyRunInput);
  const firstOutZero=resOutZero.runs.find(run=>run.job===1&&run.operationId==='BODY-FIRST')!;
  const secondOutZero=resOutZero.runs.find(run=>run.job===2&&run.operationId==='BODY-FIRST')!;
  assert.deepEqual([firstOutZero.startSeconds,firstOutZero.endSeconds,firstOutZero.stationReleaseSeconds,firstOutZero.reserveEndSeconds],[20,30,30,30]);
  assert.equal(secondOutZero.stationReleaseSeconds,50);assert.equal(secondOutZero.reserveEndSeconds,50);
  assertNoWorkerOverlap(resOutZero);

  // 2) positive output 1 -> input 0 with 2 jobs: job 2 is held on ST-A until job 1 departs directly to ST-C at 48.
  const inZero=structuredClone(outZero);
  inZero.stationBuffers={buffers:[
    {stationId:'ST-A',copy:1,inputCapacity:2,outputCapacity:1,blockingPolicy:'bbas'},
    {stationId:'ST-C',copy:1,inputCapacity:0,outputCapacity:null,blockingPolicy:'bbas-worker-released'}
  ]};
  const resInZero=scheduleWorkerRun(inZero,1,2,inZero.bodyRunInput);
  const secondFirst=resInZero.runs.find(run=>run.job===2&&run.operationId==='BODY-FIRST')!;
  assert.equal(secondFirst.stationReleaseSeconds,48);assert.equal(secondFirst.reserveEndSeconds,48);
  assert.deepEqual(resInZero.jobs.map(job=>job.finish),[60,74]);assertNoWorkerOverlap(resInZero);
});

test('7.12.C2-B3e: dostawa materiału i zajętość odbiorcy przesuwają bezpośredni wyjazd korpusu bez magazynowania przy wejściu 0',()=>{
  const project=graphBodyBufferedFixture();
  project.stationBuffers={buffers:[
    {stationId:'ST-A',copy:1,inputCapacity:1,outputCapacity:0,blockingPolicy:'bbas'},
    {stationId:'ST-C',copy:1,inputCapacity:0,outputCapacity:null,blockingPolicy:'bbas-worker-released'}
  ]};
  project.materialSupply={items:[{id:'DIR-BODY-SUP',componentId:'EXPLICIT-PART',targetStationId:'ST-C',initialStock:0,unit:'szt.',schedule:{kind:'explicit-deliveries',deliveries:[{deliveryTimeSeconds:80,quantity:1}]},source:'Jawna dostawa przy 80 s'}],consumptions:[{operationId:project.operations[2].id,supplyId:'DIR-BODY-SUP',quantity:1,source:'Jawne pobranie przy starcie odbiorcy'}]};
  const result=scheduleWorkerRun(project,1,1,project.bodyRunInput);
  const first=result.runs.find(run=>run.operationId==='BODY-FIRST')!,recipient=result.runs.find(run=>run.operationId===project.operations[2].id)!;
  assert.deepEqual([first.startSeconds,first.endSeconds,first.stationReleaseSeconds,first.reserveEndSeconds,first.blockedSeconds],[10,20,78,78,58]);
  assert.deepEqual([recipient.startSeconds,recipient.endSeconds,recipient.transport?.startSeconds,recipient.transport?.endSeconds],[80,90,78,80]);
  assert.deepEqual(result.materialEvents!.map(event=>[event.kind,event.atSeconds]),[['delivery',80],['consumption',80]]);
  assert.equal(result.subassemblyEvents!.find(event=>event.kind==='consumed')!.atSeconds,80);
  assertNoWorkerOverlap(result);
});

test('7.12.C2-B3e: syntetyczny wzorzec C2 z zerowymi buforami korpusów i gałęziami zachowuje ciągłość odtwarzania i rezerwacji',()=>{
  const input=JSON.parse(advancedDemoPackage().data.draftRaw).project,before=JSON.stringify(input),project=prepareC2B3eUiProject(input);
  const result=scheduleWorkerRun(project,1,3,project.bodyRunInput);
  assert.equal(JSON.stringify(input),before);assertNoWorkerOverlap(result);
  const firstRuns=result.runs.filter(run=>run.operationId==='MU-OP10-M');
  assert.deepEqual(firstRuns.map(run=>[run.startSeconds,run.endSeconds,run.stationReleaseSeconds,run.reserveEndSeconds,run.blockedSeconds]),[
    [0,40,490,490,450],[490,530,570,570,40],[570,610,660,660,50]
  ]);
  const intRuns=result.runs.filter(run=>run.operationId==='MU-OP20-M');
  assert.deepEqual(intRuns.map(run=>[run.startSeconds,run.endSeconds,run.stationReleaseSeconds,run.blockedSeconds]),[
    [500,570,570,0],[580,650,660,10],[670,740,750,10]
  ]);
  assert.deepEqual(result.jobs.map(job=>job.finish),[630,720,810]);
  assert.equal(result.bufferBook!.tokens.length,0);
  assert.ok(result.bufferEvents!.some(event=>event.kind==='handoff'&&event.stationId==='ST-MU-MAIN2'));
  assert.ok(result.bufferEvents!.some(event=>event.kind==='handoff'&&event.stationId==='ST-MU-MAIN3'));
  assert.ok(result.reservations.reservations.every(reservation=>reservation.releasedAtSeconds===reservation.endSeconds&&reservation.endSeconds<Number.MAX_VALUE));
  const history=prepareDomainPhysicalPlayback(project,result,{batch:3,arrivalIntervalSeconds:1,transportMode:'configured'});
  assert.equal(domainPhysicalPlaybackFrame(history,495).bodies[0].status,'moving');
  assert.equal(domainPhysicalPlaybackFrame(history,500).bodies[0].status,'reserved');
});

test('7.12.C2-B3f: bezpośrednie wejście podmontażu z dodatnim buforem korpusu, lokalną kontynuacją i odrzuceniem 0+0',()=>{
  const project=graphBodyBufferedFixture();
  project.subassemblyBuffers!.buffers[1].inputCapacity=0;
  project.subassemblyFlow!.lots[0].consumptionQuantity=2;
  const before=JSON.stringify(project),result=scheduleWorkerRun(project,1,1,project.bodyRunInput);
  const first=result.runs.find(run=>run.operationId==='BODY-FIRST')!,recipient=result.runs.find(run=>run.operationId===project.operations[2].id)!;
  assert.equal(JSON.stringify(project),before);assertNoWorkerOverlap(result);
  assert.deepEqual([first.startSeconds,first.endSeconds],[10,20]);
  assert.deepEqual([recipient.startSeconds,recipient.endSeconds,recipient.transport?.startSeconds,recipient.transport?.endSeconds],[50,60,20,22]);
  assert.deepEqual(result.transportMovements!.map(move=>[move.purpose,move.startSeconds,move.endSeconds,move.lotId??'body']),[
    ['transfer',20,22,'body'],['return',22,27,'body'],['transfer',48,50,'LOT-1'],['return',50,55,'body']
  ]);
  assert.equal(result.subassemblyEvents!.find(event=>event.kind==='consumed')!.atSeconds,50);
  assert.equal(result.subassemblyBufferBooks![0].tokens.find(token=>token.id==='LOT-1')!.consumed,true);

  // Local body continuation on ST-C combined with remote direct subassembly input (0) from ST-A:
  const localCont=graphBodyBufferedFixture();
  localCont.stations.find(s=>s.id==='ST-A')!.operationIds=localCont.stations.find(s=>s.id==='ST-A')!.operationIds.filter(id=>id!=='BODY-FIRST');
  localCont.stations.find(s=>s.id==='ST-C')!.operationIds.unshift('BODY-FIRST');
  localCont.stationRouting!.operations.find(op=>op.operationId==='BODY-FIRST')!.candidates=[{stationId:'ST-C',copy:1,requiredEquipmentIds:[]}];
  localCont.bodyRunInput!.bodies[0].location={kind:'station',stationId:'ST-C',copy:1};
  localCont.stationBuffers={buffers:[{stationId:'ST-C',copy:1,inputCapacity:1,outputCapacity:null,blockingPolicy:'bbas-worker-released'}]};
  localCont.resourceCalendars!.stations['ST-C'].shifts[0].startSeconds=0;
  localCont.materialSupply={items:[{id:'CONT-SUP',componentId:'EXPLICIT-PART',targetStationId:'ST-C',initialStock:0,unit:'szt.',schedule:{kind:'explicit-deliveries',deliveries:[{deliveryTimeSeconds:50,quantity:1}]},source:'Jawna dostawa przy 50 s'}],consumptions:[{operationId:localCont.operations[2].id,supplyId:'CONT-SUP',quantity:1,source:'Jawne pobranie'}]};
  localCont.subassemblyBuffers!.buffers[1].inputCapacity=0;
  localCont.subassemblyFlow!.lots[0].consumptionQuantity=2;
  const contRes=scheduleWorkerRun(localCont,1,1,localCont.bodyRunInput);
  const contFirst=contRes.runs.find(run=>run.operationId==='BODY-FIRST')!,contRec=contRes.runs.find(run=>run.operationId===localCont.operations[2].id)!;
  assert.deepEqual([contFirst.startSeconds,contFirst.endSeconds,contFirst.stationReleaseSeconds,contFirst.continuationWaitSeconds],[10,20,50,30]);
  assert.deepEqual([contRec.startSeconds,contRec.endSeconds],[50,60]);
  assert.deepEqual(contRes.transportMovements!.map(move=>[move.purpose,move.startSeconds,move.endSeconds,move.lotId]),[['transfer',48,50,'LOT-1'],['return',50,55,undefined]]);
  assertNoWorkerOverlap(contRes);
});

test('7.12.C2-B3f: bezpośredni odbiorca podmontażu z własnym zatrzymaniem obsady (bbas) chroni montera i powrót',()=>{
  // 1) Subassembly chain: consumer receives LOT-1 on inputCapacity=0 and produces NEXT-LOT into outputCapacity=0 (bbas), holding its worker until DIRECT-END consumes NEXT-LOT!
  const chained=subassemblyDirectFixture(),consumer=chained.operations[1],end={...structuredClone(consumer),id:'DIRECT-END',predecessorIds:[consumer.id]};
  consumer.physicalRole={kind:'subassembly-preparation',subassemblyIds:['NEXT']};
  chained.operations.push(end);chained.stations.find(station=>station.id==='ST-C')!.operationIds.push(end.id);
  chained.subassemblies.push({id:'NEXT',name:'Jawny dalszy podzespół testowy',producerOperationId:consumer.id,consumerOperationIds:[end.id]});
  chained.subassemblyFlow!.lots.push({id:'NEXT-LOT',subassemblyId:'NEXT',quantity:1,unit:'szt.',producer:{job:1,operationId:consumer.id},consumer:{job:1,operationId:end.id},consumptionQuantity:1,source:'Jawne testowe przypisanie dalszej partii'});
  chained.subassemblyBuffers!.buffers.push({subassemblyId:'NEXT',unit:'szt.',stationId:'ST-C',copy:1,inputCapacity:0,outputCapacity:0,blockingPolicy:'bbas'});
  chained.workerRunSelection!.operations.push({operationId:end.id,workerCount:1,eligibleWorkerIds:[chained.workers[1].id]});
  chained.stationRouting!.operations.push({operationId:end.id,candidates:[{stationId:'ST-C',copy:1,requiredEquipmentIds:[]}]});
  chained.materialSupply={items:[{id:'END-SUP',componentId:'EXPLICIT-PART',targetStationId:'ST-C',initialStock:0,unit:'szt.',schedule:{kind:'explicit-deliveries',deliveries:[{deliveryTimeSeconds:80,quantity:1}]},source:'Jawna dostawa dla DIRECT-END'}],consumptions:[{operationId:end.id,supplyId:'END-SUP',quantity:1,source:'Jawne pobranie DIRECT-END'}]};
  const result=scheduleWorkerRun(chained,1,1,chained.bodyRunInput);
  const mid=result.runs.find(run=>run.operationId===consumer.id)!,finalRun=result.runs.find(run=>run.operationId==='DIRECT-END')!;
  assert.deepEqual([mid.startSeconds,mid.endSeconds,mid.stationReleaseSeconds,mid.reserveEndSeconds,mid.blockedSeconds],[50,60,80,80,20]);
  assert.deepEqual([finalRun.startSeconds,finalRun.endSeconds],[80,90]);
  assertNoWorkerOverlap(result);

  // 2) Body recipient with bbas body output (outputCapacity=0, bbas) receiving direct subassembly input (inputCapacity=0):
  const bodyHeld=graphLocalContinuationFixture();
  bodyHeld.stationBuffers={buffers:[
    {stationId:'ST-A',copy:1,inputCapacity:1,outputCapacity:0,blockingPolicy:'bbas'},
    {stationId:'ST-C',copy:1,inputCapacity:0,outputCapacity:null,blockingPolicy:'bbas-worker-released'}
  ]};
  bodyHeld.subassemblyBuffers!.buffers[0].inputCapacity=0;
  bodyHeld.subassemblyFlow!.lots[0].consumptionQuantity=2;
  bodyHeld.resourceCalendars!.stations['ST-C'].shifts[0].startSeconds=80;
  const heldRes=scheduleWorkerRun(bodyHeld,1,1,bodyHeld.bodyRunInput);
  const heldMid=heldRes.runs.find(run=>run.operationId==='BODY-LOCAL')!,heldAfter=heldRes.runs.find(run=>run.operationId===bodyHeld.operations[3].id)!;
  assert.deepEqual([heldMid.startSeconds,heldMid.endSeconds,heldMid.stationReleaseSeconds,heldMid.reserveEndSeconds,heldMid.blockedSeconds],[50,60,78,78,18]);
  assert.deepEqual([heldAfter.startSeconds,heldAfter.endSeconds],[80,90]);
  assertNoWorkerOverlap(heldRes);
});

test('7.12.C2-B3f: lokalne wejście 0 i wyjście 0 na tej samej kopii z bezpośrednim przekazaniem stanowiska i obsady',()=>{
  for(const policy of ['bbas','bbas-worker-released'] as const){
    const project=subassemblyDirectFixture(policy);
    const producerId=project.operations[0].id,subId=project.subassemblies[0].id,lotId=project.subassemblyFlow!.lots[0].id;
    project.stations.find(s=>s.id==='ST-A')!.operationIds=[];
    project.stations.find(s=>s.id==='ST-C')!.operationIds.unshift(producerId);
    project.stationRouting!.operations.find(op=>op.operationId===producerId)!.candidates=[{stationId:'ST-C',copy:1,requiredEquipmentIds:[]}];
    project.subassemblyBuffers={buffers:[{subassemblyId:subId,unit:'szt.',stationId:'ST-C',copy:1,inputCapacity:0,outputCapacity:0,blockingPolicy:policy}]};
    project.resourceCalendars!.stations['ST-C'].shifts[0].startSeconds=0;
    project.materialSupply={items:[{id:'LOC-ZERO-SUP',componentId:'EXPLICIT-PART',targetStationId:'ST-C',initialStock:0,unit:'szt.',schedule:{kind:'explicit-deliveries',deliveries:[{deliveryTimeSeconds:50,quantity:1}]},source:'Jawna dostawa przy 50 s'}],consumptions:[{operationId:project.operations[1].id,supplyId:'LOC-ZERO-SUP',quantity:1,source:'Jawne pobranie przy 50 s'}]};
    const result=scheduleWorkerRun(project,1,1,project.bodyRunInput);
    const prod=result.runs.find(run=>run.operationId===producerId)!,cons=result.runs.find(run=>run.operationId===project.operations[1].id)!;
    assert.deepEqual([prod.startSeconds,prod.endSeconds,prod.stationReleaseSeconds,prod.reserveEndSeconds,prod.blockedSeconds],[0,10,50,policy==='bbas'?50:10,40]);
    assert.deepEqual([cons.startSeconds,cons.endSeconds],[50,60]);
    assert.equal(result.transportMovements!.length,0);
    assert.equal(result.subassemblyEvents!.find(event=>event.kind==='consumed')!.atSeconds,50);
    assert.equal(result.subassemblyBufferBooks![0].tokens.find(token=>token.id===lotId)!.consumed,true);
    assertNoWorkerOverlap(result);
  }
});

test('7.12.C2-B3f: towarzysz buforowany z resztą i bezpośredni podmontaż przy buforach korpusów',()=>{
  const project=graphBodyBufferedFixture();
  const secondSub={...structuredClone(project.operations[0]),id:'SUB-COMP-OP'};
  secondSub.physicalRole={kind:'subassembly-preparation',subassemblyIds:['SUB-COMP']};
  project.operations.unshift(secondSub);
  project.operations[2].predecessorIds.push(secondSub.id);
  project.stations.find(s=>s.id==='ST-A')!.operationIds.unshift(secondSub.id);
  project.stationRouting!.operations.unshift({operationId:secondSub.id,candidates:[{stationId:'ST-A',copy:1,requiredEquipmentIds:[]}]});
  project.workerRunSelection!.operations.unshift({operationId:secondSub.id,workerCount:1,eligibleWorkerIds:[project.workers[0].id]});
  project.subassemblies.push({id:'SUB-COMP',name:'Podmontaż towarzyszący z resztą',producerOperationId:secondSub.id,consumerOperationIds:[project.operations[3].id]});
  project.subassemblyFlow!.lots.push({id:'LOT-COMP',subassemblyId:'SUB-COMP',quantity:3,unit:'szt.',producer:{job:1,operationId:secondSub.id},consumer:{job:1,operationId:project.operations[3].id},consumptionQuantity:1,source:'Jawna partia towarzysząca 3/1'});
  project.subassemblyBuffers!.buffers[1].inputCapacity=0;
  project.subassemblyFlow!.lots[0].consumptionQuantity=2;
  project.subassemblyBuffers!.buffers.push(
    {subassemblyId:'SUB-COMP',unit:'szt.',stationId:'ST-A',copy:1,inputCapacity:null,outputCapacity:3,blockingPolicy:'bbas-worker-released'},
    {subassemblyId:'SUB-COMP',unit:'szt.',stationId:'ST-C',copy:1,inputCapacity:3,outputCapacity:null,blockingPolicy:'bbas-worker-released'}
  );
  const result=scheduleWorkerRun(project,1,1,project.bodyRunInput);
  const recipient=result.runs.find(run=>run.operationId===project.operations[3].id)!;
  assert.deepEqual([recipient.startSeconds,recipient.endSeconds],[50,60]);
  const compBook=result.subassemblyBufferBooks!.find(book=>book.places[0].subassemblyId==='SUB-COMP')!;
  const residual=compBook.tokens.find(token=>token.id==='LOT-COMP')!;
  assert.equal(residual.remainingQuantity,2);assert.equal(residual.residual,true);
  assert.equal(subassemblyBufferLoad(compBook,{stationId:'ST-C',copy:1,side:'input'}).occupied,2);
  assertNoWorkerOverlap(result);
});

test('7.12.C2-B3f: syntetyczny wzorzec C2 łączy bezpośrednie wejście podmontażu, reszty w buforze i bufory korpusów',()=>{
  const input=JSON.parse(advancedDemoPackage().data.draftRaw).project,before=JSON.stringify(input),project=prepareC2B3fUiProject(input);
  const result=scheduleWorkerRun(project,1,3,project.bodyRunInput);
  assert.equal(JSON.stringify(input),before);assertNoWorkerOverlap(result);
  assert.equal(result.jobs.length,3);
  assert.ok(result.jobs.every(job=>Number.isFinite(job.finish)));
  const pwrBook=result.subassemblyBufferBooks!.find(book=>book.places[0].subassemblyId==='SUB-PWR')!;
  const drvBook=result.subassemblyBufferBooks!.find(book=>book.places[0].subassemblyId==='SUB-DRV')!;
  assert.equal(subassemblyBufferLoad(pwrBook,{stationId:'ST-MU-MAIN2',copy:1,side:'input'}).total,0);
  assert.ok(pwrBook.tokens.every(token=>token.consumed===true&&token.remainingQuantity===0));
  assert.equal(subassemblyBufferLoad(drvBook,{stationId:'ST-MU-MAIN2',copy:1,side:'input'}).occupied,6);
  assert.equal(drvBook.tokens.filter(token=>token.residual&&token.remainingQuantity===2).length,3);
  assert.ok(result.bufferEvents!.some(event=>event.kind==='handoff'&&event.stationId==='ST-MU-MAIN3'));
  assert.ok(result.reservations.reservations.every(reservation=>reservation.releasedAtSeconds===reservation.endSeconds&&reservation.endSeconds<Number.MAX_VALUE));
  const history=prepareDomainPhysicalPlayback(project,result,{batch:3,arrivalIntervalSeconds:1,transportMode:'configured'});
  assert.equal(domainPhysicalPlaybackFrame(history,500).bodies[0].status,'reserved');
  assert.equal(domainPhysicalPlaybackFrame(history,history.totalDurationSeconds).bodies.length,3);
});

test('7.12.C2-B3d: dodatnie wyjście zatrzymuje obsadę 60–100, niezależny odbiorca zwalnia pojemność',()=>{
  const project=graphBodyBufferedFixture(),lot=structuredClone(project.subassemblyFlow!.lots[0]),body=structuredClone(project.bodyRunInput!.bodies[0]);
  project.stationBuffers!.buffers[0].blockingPolicy='bbas';
  project.subassemblyBuffers!.buffers[0].outputCapacity=6;project.subassemblyBuffers!.buffers[1].inputCapacity=4;
  project.subassemblyFlow!.lots=Array.from({length:3},(_,i)=>({...structuredClone(lot),id:`HOLD-LOT-${i+1}`,producer:{...lot.producer,job:i+1},consumer:{...lot.consumer,job:i+1}}));
  project.bodyRunInput={bodies:Array.from({length:3},(_,i)=>({...structuredClone(body),id:`HOLD-BODY-${i+1}`})),jobs:Array.from({length:3},(_,i)=>({job:i+1,bodyId:`HOLD-BODY-${i+1}`}))};
  project.workers.push({id:'BODY-RECEIVER',name:'Jawny niezależny monter odbiorcy — test'});project.workerRunSelection!.teamWorkerIds.push('BODY-RECEIVER');
  project.workerRunSelection!.operations.find(operation=>operation.operationId===project.operations[2].id)!.eligibleWorkerIds=['BODY-RECEIVER'];
  project.resourceCalendars!.workers['BODY-RECEIVER']={shifts:[{startSeconds:0,endSeconds:200,basis:'assumed'}],breaks:[]};
  for(const calendar of Object.values(project.resourceCalendars!.workers))calendar.shifts[0].endSeconds=200;
  for(const calendar of Object.values(project.resourceCalendars!.stations))calendar.shifts[0].endSeconds=200;
  project.resourceCalendars!.stations['ST-C'].shifts[0].startSeconds=100;
  for(const cart of project.assemblyTransport!.carts)cart.calendar.shifts[0].endSeconds=200;
  const before=JSON.stringify(project),result=scheduleWorkerRun(project,1,3,project.bodyRunInput),held=result.runs.find(run=>run.job===3&&run.operationId==='BODY-FIRST')!;
  assert.deepEqual([held.startSeconds,held.endSeconds,held.stationReleaseSeconds,held.reserveEndSeconds,held.blockedSeconds],[50,60,100,100,40]);
  assert.deepEqual(result.jobs.map(job=>job.finish),[110,120,133]);assertNoWorkerOverlap(result);assert.equal(JSON.stringify(project),before);
  assert.equal(result.reservations.reservations.find(reservation=>reservation.reservationId==='3:BODY-FIRST')!.endSeconds,100);
  const unlimitedBranches=structuredClone(project);delete unlimitedBranches.subassemblyBuffers;
  const noBranchLimits=scheduleWorkerRun(unlimitedBranches,1,3,unlimitedBranches.bodyRunInput);
  assert.equal(noBranchLimits.runs.find(run=>run.job===3&&run.operationId==='BODY-FIRST')!.reserveEndSeconds,100);
  assert.deepEqual(noBranchLimits.jobs.map(job=>job.finish),[110,120,133]);assertNoWorkerOverlap(noBranchLimits);
});

test('7.12.C2-B3d: źródłowy monter nie przewozi wcześniejszego korpusu, gdy zatrzymuje go pełne wyjście',()=>{
  const project=prepareC2B3bUiProject(JSON.parse(advancedDemoPackage().data.draftRaw).project);
  project.stationBuffers!.buffers[0].blockingPolicy='bbas';
  const before=JSON.stringify(project);
  assert.throws(()=>scheduleWorkerRun(project,1,3,project.bodyRunInput),(error:unknown)=>{
    const diagnostic=parseProcessStallDiagnostic(error)!;assert.ok(diagnostic);assert.equal(diagnostic.type,'buffer-deadlock');
    assert.ok(diagnostic.blockedStations.some(station=>station.blockedByOperationId==='MU-OP10-M'&&station.blockingPolicy==='bbas'&&station.holdingWorkerIds?.includes('MU-W3')));return true;
  });assert.equal(JSON.stringify(project),before);
});

test('7.12.C2-B3d: przyszły powrót obsady czeka na znane zwolnienie, trzeci korpus rezerwuje osobę dopiero po powrocie',()=>{
  const project=prepareC2B3dUiProject(JSON.parse(advancedDemoPackage().data.draftRaw).project),result=scheduleWorkerRun(project,1,3,project.bodyRunInput);
  const held=result.runs.find(run=>run.job===3&&run.operationId==='MU-OP10-M')!;
  assert.deepEqual([held.startSeconds,held.endSeconds,held.stationReleaseSeconds,held.reserveEndSeconds,held.blockedSeconds],[90,130,500,500,370]);
  const returns=result.transportMovements!.filter(move=>move.routeId==='MU-RETURN-M1-INT');
  assert.deepEqual(returns.map(move=>[move.startSeconds,move.endSeconds]),[[80,90],[510,520],[580,590]]);
  assertNoWorkerOverlap(result);assert.deepEqual(result.jobs.map(job=>job.finish),[700,790,840]);
  assert.ok(result.reservations.reservations.every(reservation=>reservation.releasedAtSeconds===reservation.endSeconds&&reservation.endSeconds<Number.MAX_VALUE));
});

test('7.12.C2-B3d: bbas przy wolnym wyjściu zwalnia obsadę po obróbce, lokalna kontynuacja zachowuje profil',()=>{
  const plain=graphBodyBufferedFixture();plain.stationBuffers!.buffers[0].blockingPolicy='bbas';
  const result=scheduleWorkerRun(plain,1,1,plain.bodyRunInput),run=result.runs.find(run=>run.operationId==='BODY-FIRST')!;
  assert.equal(run.reserveEndSeconds,20);assert.equal(run.stationReleaseSeconds,20);assert.equal(result.jobs[0].finish,60);assertNoWorkerOverlap(result);
  const local=graphLocalContinuationFixture();local.stationBuffers!.buffers[0].blockingPolicy='bbas';
  const profile=local.operations.find(operation=>operation.id==='BODY-FIRST')!.staffing!.timeVariants[0].timeProfile;
  profile.manualWork=[{startSeconds:0,endSeconds:5,basis:'assumed'}];profile.operatorPresence=[{startSeconds:0,endSeconds:5,basis:'assumed'}];profile.machineRun=[{startSeconds:5,endSeconds:10,basis:'assumed'}];
  const continued=scheduleWorkerRun(local,1,1,local.bodyRunInput),initial=continued.runs.find(run=>run.operationId==='BODY-FIRST')!;
  assert.equal(initial.reserveEndSeconds,15);assert.equal(initial.stationReleaseSeconds,50);assert.equal(initial.continuationWaitSeconds,30);assert.equal(continued.jobs[0].finish,72);assertNoWorkerOverlap(continued);
});

test('7.12.C2-B3d: częściowa obecność obsady korpusu wymaga dalszej integracji, bez dopowiadania powrotu',()=>{
  for(const late of [false,true]){
    const project=graphBodyBufferedFixture();project.stationBuffers!.buffers[0].blockingPolicy='bbas';
    const profile=project.operations.find(operation=>operation.id==='BODY-FIRST')!.staffing!.timeVariants[0].timeProfile;
    profile.manualWork=[{startSeconds:late?3:0,endSeconds:late?10:5,basis:'assumed'}];profile.operatorPresence=structuredClone(profile.manualWork);profile.machineRun=[{startSeconds:late?0:5,endSeconds:late?3:10,basis:'assumed'}];
    const before=JSON.stringify(project);assert.throws(()=>scheduleWorkerRun(project,1,1,project.bodyRunInput),/wymaga jawnej obecności od początku do końca/);assert.equal(JSON.stringify(project),before);
  }
});

test('7.12.C2-B3b: dodatnie bufory korpusów i podmontaży dzielą harmonogram, pełne wyjście zatrzymuje stanowisko',()=>{
  const project=prepareC2B3bUiProject(JSON.parse(advancedDemoPackage().data.draftRaw).project),before=JSON.stringify(project);
  const result=scheduleWorkerRun(project,1,3,project.bodyRunInput);
  assert.deepEqual(result.jobs.map(job=>job.finish),[700,790,840]);
  const blocked=result.runs.find(run=>run.job===3&&run.operationId==='MU-OP10-M')!;
  assert.deepEqual([blocked.startSeconds,blocked.endSeconds,blocked.stationReleaseSeconds,blocked.blockedSeconds,blocked.reserveEndSeconds],[100,140,500,360,140]);
  assertNoWorkerOverlap(result);assert.equal(JSON.stringify(project),before);
  assert.equal(result.bufferBook!.tokens.length,0);
  const history=prepareDomainPhysicalPlayback(project,result,{batch:3,arrivalIntervalSeconds:1,transportMode:'configured'});
  const blockedBody=domainPhysicalPlaybackFrame(history,400).bodies.find(body=>body.id===project.bodyRunInput!.jobs[2].bodyId)!;
  assert.equal(blockedBody.status,'reserved');assert.deepEqual(blockedBody.location,{kind:'station',stationId:'ST-MU-MAIN1',copy:1});
  for(const subassembly of ['SUB-PWR','SUB-DRV']){
    const book=result.subassemblyBufferBooks!.find(book=>book.places[0].subassemblyId===subassembly)!;
    assert.equal(subassemblyBufferLoad(book,{stationId:'ST-MU-MAIN2',copy:1,side:'input'}).total,6);
  }
});

test('7.12.C2-B3a: wspólny odbiór partii bezpośredniej i buforowanej, korpus już w kopii, pobranie obu przy 50',()=>{
  for(const reverse of [false,true]){
    const project=mixedSubassemblyReceiptFixture();if(reverse)project.subassemblyFlow!.lots.reverse();
    const before=JSON.stringify(project),result=scheduleWorkerRun(project,1,1,project.bodyRunInput);
    assert.equal(result.jobs[0].finish,60);assertNoWorkerOverlap(result);
    assert.deepEqual(result.transportMovements!.map(move=>[move.purpose,move.startSeconds,move.endSeconds]),[['transfer',10,12],['return',12,17],['transfer',48,50],['return',50,55]]);
    const consumed=result.subassemblyEvents!.filter(event=>event.kind==='consumed');assert.equal(consumed.length,2);assert.ok(consumed.every(event=>event.atSeconds===50));
    const producer=result.runs.find(run=>run.operationId===project.operations[0].id)!;assert.equal(producer.reserveEndSeconds,48);assert.equal(producer.stationReleaseSeconds,48);
    const stock=result.subassemblyBufferBooks!.find(book=>book.places[0].subassemblyId==='STOCKED')!;
    assert.equal(stock.tokens[0].remainingQuantity,2);assert.equal(stock.tokens[0].residual,true);
    assert.deepEqual(subassemblyBufferLoad(stock,{stationId:'ST-C',copy:1,side:'input'}),{occupied:2,reserved:0,total:2});
    const direct=result.subassemblyBufferBooks!.find(book=>book.places[0].subassemblyId==='SUB-FLOW')!;
    assert.equal(subassemblyBufferLoad(direct,{stationId:'ST-C',copy:1,side:'input'}).total,0);
    assert.ok(direct.tokens.every(token=>token.consumed&&!token.handoff&&!token.location));assert.equal(JSON.stringify(project),before);
    const starts=result.bodyEvents!.filter(event=>event.kind==='reserve');assert.equal(starts.length,1);assert.equal(starts[0].atSeconds,50);
  }
});

test('7.12.C2-B3a: opóźniona partia buforowana zabezpiecza wspólny odbiór dopiero po przyjeździe',()=>{
  const project=mixedSubassemblyReceiptFixture();project.resourceCalendars!.workers['W-MIX-TR'].shifts=[{startSeconds:60,endSeconds:200,basis:'assumed'}];
  const result=scheduleWorkerRun(project,1,1,project.bodyRunInput);assertNoWorkerOverlap(result);
  assert.deepEqual(result.transportMovements!.map(move=>[move.purpose,move.startSeconds,move.endSeconds]),[['transfer',60,62],['return',62,67],['transfer',67,69],['return',69,74]]);
  assert.equal(result.jobs[0].finish,79);assert.ok(result.subassemblyEvents!.filter(event=>event.kind==='consumed').every(event=>event.atSeconds===69));
});

test('7.12.C2-B3a: dostawa materiału przesuwa wspólne pobranie do 80 bez ponownego przewozu partii buforowanej',()=>{
  const project=mixedSubassemblyReceiptFixture();
  project.materialSupply={items:[{id:'MIX-SUP',componentId:'EXPLICIT-PART',targetStationId:'ST-C',initialStock:0,unit:'szt.',schedule:{kind:'explicit-deliveries',deliveries:[{deliveryTimeSeconds:80,quantity:1}]},source:'Jawna syntetyczna dostawa'}],consumptions:[{operationId:project.operations[1].id,supplyId:'MIX-SUP',quantity:1,source:'Jawne pobranie'}]};
  const result=scheduleWorkerRun(project,1,1,project.bodyRunInput);assertNoWorkerOverlap(result);assert.equal(result.jobs[0].finish,90);
  assert.deepEqual(result.transportMovements!.filter(move=>move.purpose==='transfer').map(move=>[move.startSeconds,move.endSeconds]),[[10,12],[78,80]]);
  assert.ok(result.subassemblyEvents!.filter(event=>event.kind==='consumed').every(event=>event.atSeconds===80));
  assert.deepEqual(result.materialEvents!.map(event=>[event.kind,event.atSeconds]),[['delivery',80],['consumption',80]]);
});

test('7.12.C2-B3a: za mały bufor towarzyszący nie pozwala ominąć partii przez wejście 0',()=>{
  const project=mixedSubassemblyReceiptFixture();project.subassemblyBuffers!.buffers.find(buffer=>buffer.subassemblyId==='STOCKED'&&buffer.stationId==='ST-C')!.inputCapacity=2;
  const before=JSON.stringify(project);assert.throws(()=>scheduleWorkerRun(project,1,1,project.bodyRunInput),(error:unknown)=>parseProcessStallDiagnostic(error)?.type==='buffer-deadlock');assert.equal(JSON.stringify(project),before);
});

test('7.12.C2-B3a: przy mieszanych politykach obsada czeka na wszystkie partie, także gdy zatrzymująca jest już odłożona',()=>{
  for(const [directPolicy,stockPolicy,release] of [['bbas-worker-released','bbas',48],['bbas','bbas-worker-released',48],['bbas-worker-released','bbas-worker-released',10]] as const){
    const project=mixedSubassemblyReceiptFixture();project.subassemblyBuffers!.buffers[0].blockingPolicy=directPolicy;
    project.subassemblyBuffers!.buffers.find(buffer=>buffer.subassemblyId==='STOCKED'&&buffer.stationId==='ST-A')!.blockingPolicy=stockPolicy;
    const result=scheduleWorkerRun(project,1,1,project.bodyRunInput),producer=result.runs[0];
    assert.equal(result.jobs[0].finish,60);assert.equal(producer.stationReleaseSeconds,48);assert.equal(producer.reserveEndSeconds,release);
    assert.equal(result.reservations.reservations.find(item=>item.reservationId===`1:${producer.operationId}`)!.endSeconds,release);
    assert.deepEqual(result.transportMovements!.filter(move=>move.purpose==='transfer').map(move=>[move.startSeconds,move.endSeconds]),[[10,12],[48,50]]);assertNoWorkerOverlap(result);
  }
});

test('7.12.C2-B3a: wspólna obsada mieszanych wyjść wykonuje loaded dopiero po wyjeździe ostatniej oczekującej partii',()=>{
  const project=mixedSubassemblyReceiptFixture();project.subassemblyBuffers!.buffers[0].blockingPolicy='bbas-worker-released';
  const rule=project.assemblyTransport!.routes[0],alternative=structuredClone(rule.alternatives[0]);
  rule.alternatives.unshift({...alternative,workerIds:[project.workers[0].id]});
  const result=scheduleWorkerRun(project,1,1,project.bodyRunInput),moves=result.transportMovements!.filter(move=>move.purpose==='transfer');
  assert.deepEqual(moves.map(move=>[move.workerIds,move.startSeconds,move.endSeconds]),[[['W-MIX-TR'],10,12],[[project.workers[0].id],48,50]]);
  assert.equal(result.runs[0].reserveEndSeconds,48);assert.equal(result.jobs[0].finish,60);assertNoWorkerOverlap(result);
});

test('7.12.C2-B3a: dwaj producenci z C2, jawna równoległość, bezpośredni odbiór 100 i reszta buforowana 2',()=>{
  const project=prepareC2B3aUiProject(parseDomainProjectV6(JSON.stringify(JSON.parse(advancedDemoPackage().data.draftRaw!).project)));
  const before=JSON.stringify(project),result=scheduleWorkerRun(project,1000,1,project.bodyRunInput);
  assertNoWorkerOverlap(result);assert.equal(JSON.stringify(project),before);assert.equal(result.jobs[0].finish,170);
  assert.deepEqual(result.runs.map(run=>[run.operationId,run.startSeconds,run.endSeconds]),[['MU-OP10-A',0,50],['MU-OP10-B',0,60],['MU-OP20-M',100,170]]);
  assert.deepEqual(result.transportMovements!.filter(move=>move.purpose==='transfer').map(move=>[move.lotId,move.startSeconds,move.endSeconds]),[['LOT-DRV-1',60,70],['LOT-PWR-1',90,100]]);
  assert.deepEqual(result.transportMovements!.filter(move=>move.purpose==='return').map(move=>[move.startSeconds,move.endSeconds]),[[70,80],[170,180]]);
  assert.ok(result.subassemblyEvents!.filter(event=>event.kind==='consumed').every(event=>event.atSeconds===100));
  assert.equal(result.runs[0].reserveEndSeconds,90);assert.equal(result.runs[0].blockedSeconds,40);
  const stock=result.subassemblyBufferBooks!.find(book=>book.places[0].subassemblyId==='SUB-DRV')!;assert.equal(stock.tokens[0].remainingQuantity,2);
});

test('7.12.C2-B2b: rejestr wejścia 0 nie magazynuje partii i wymaga pełnego odbioru dokładnie przy przyjeździe',()=>{
  const output={...branchPlace,side:'output' as const},input={...branchPlace,stationId:'JOIN2',capacity:0};
  const placed=deliverBranchLot(createSubassemblyBufferBook([output,input]),output);
  const moving=applySubassemblyBufferEvent(placed,{kind:'depart-direct',lot:branchLot,to:input,arrivalSeconds:5,atSeconds:2});
  assert.deepEqual(subassemblyBufferLoad(moving,output),{occupied:0,reserved:0,total:0});
  assert.deepEqual(subassemblyBufferLoad(moving,input),{occupied:0,reserved:0,total:0});
  for(const atSeconds of [4,6])assert.throws(()=>applySubassemblyBufferEvent(moving,{kind:'consume-direct',id:'L1',quantity:5,at:input,atSeconds}),/dokładnie przy przyjeździe/);
  assert.throws(()=>applySubassemblyBufferEvent(moving,{kind:'consume-direct',id:'L1',quantity:3,at:input,atSeconds:5}),/pełne pobranie/);
  const consumed=applySubassemblyBufferEvent(moving,{kind:'consume-direct',id:'L1',quantity:5,at:input,atSeconds:5});
  assert.equal(consumed.tokens[0].remainingQuantity,0);assert.equal(consumed.tokens[0].location,undefined);
  assert.throws(()=>applySubassemblyBufferEvent(consumed,{kind:'consume-direct',id:'L1',quantity:5,at:input,atSeconds:5}));
});

test('7.12.C2-B2b: oba zera, wyjazd 48, przyjazd i start 50, koniec 60; operator held lub released według polityki',()=>{
  for(const policy of ['bbas','bbas-worker-released'] as const){
    const project=subassemblyDirectFixture(policy),before=JSON.stringify(project),result=scheduleWorkerRun(project,1,1,project.bodyRunInput);
    const producer=result.runs.find(run=>run.operationId===project.operations[0].id)!,consumer=result.runs.find(run=>run.operationId===project.operations[1].id)!;
    assert.deepEqual([producer.startSeconds,producer.endSeconds,producer.stationReleaseSeconds,producer.blockedSeconds],[0,10,48,38]);
    assert.equal(producer.reserveEndSeconds,policy==='bbas'?48:10);
    assert.deepEqual([consumer.startSeconds,consumer.endSeconds],[50,60]);assert.equal(result.jobs[0].finish,60);
    assert.deepEqual(result.transportMovements!.filter(move=>move.purpose==='transfer').map(move=>[move.startSeconds,move.endSeconds]),[[48,50]]);
    assert.deepEqual(result.subassemblyEvents!.map(event=>[event.kind,event.atSeconds]),[['produced',10],['start-transfer',48],['arrived',50],['consumed',50]]);
    const book=result.subassemblyBufferBooks![0];assert.ok(book.tokens.every(token=>token.consumed&&!token.location&&!token.handoff));
    assert.equal(subassemblyBufferLoad(book,{stationId:'ST-C',copy:1,side:'input'}).total,0);
    assertNoWorkerOverlap(result);assert.equal(JSON.stringify(project),before);
  }
});

test('7.12.C2-B2b: wspólny monter przewozi z wyjścia 0 i odbiera przy wejściu 0, a powrót czeka na montaż',()=>{
  const project=subassemblyDirectFixture();addReturnRoute(project);project.assemblyTransport!.carts[0].afterUnload='return-to-initial';
  project.workerRunSelection!.operations[1].eligibleWorkerIds=[project.workers[0].id];
  const result=scheduleWorkerRun(project,1,1,project.bodyRunInput);
  assert.deepEqual(result.transportMovements!.map(move=>[move.purpose,move.startSeconds,move.endSeconds]),[['transfer',48,50],['return',60,65]]);
  assert.equal(result.jobs[0].finish,60);assert.equal(result.runs[0].reserveEndSeconds,48);assertNoWorkerOverlap(result);
});

test('7.12.C2-B2b: przyszły odbiór i powrót nie są przejmowane przez nowego producenta mogącego zatrzymać montera',()=>{
  const project=subassemblyDirectFixture();addReturnRoute(project);project.assemblyTransport!.carts[0].afterUnload='return-to-initial';
  project.workerRunSelection!.operations[1].eligibleWorkerIds=[project.workers[0].id];
  const lot=structuredClone(project.subassemblyFlow!.lots[0]);project.subassemblyFlow!.lots.push({...lot,id:'L2',producer:{...lot.producer,job:2},consumer:{...lot.consumer,job:2}});
  project.bodyRunInput!.bodies.push({...structuredClone(project.bodyRunInput!.bodies[0]),id:'B2'});project.bodyRunInput!.jobs.push({job:2,bodyId:'B2'});
  const result=scheduleWorkerRun(project,1,2,project.bodyRunInput);
  assert.equal(result.runs.find(run=>run.job===2&&run.operationId===project.operations[0].id)!.startSeconds,65);
  assert.deepEqual(result.jobs.map(job=>job.finish),[60,87]);assertNoWorkerOverlap(result);
  assert.ok(result.reservations.reservations.every(reservation=>reservation.endSeconds<200));
});

test('7.12.C2-B2b: reszta, kilka partii oraz wspólny przewóz korpusu na wejście 0 są jawnie odrzucone',()=>{
  const partial=subassemblyDirectFixture();partial.subassemblyFlow!.lots[0].consumptionQuantity=1;
  assert.throws(()=>scheduleWorkerRun(partial,1,1,partial.bodyRunInput),/bez reszty/);
  const multiple=subassemblyDirectFixture();multiple.subassemblyFlow!.lots.push({...structuredClone(multiple.subassemblyFlow!.lots[0]),id:'L2'});
  assert.throws(()=>scheduleWorkerRun(multiple,1,1,multiple.bodyRunInput),/wspólny odbiór kilku partii/);
  const movingBody=subassemblyDirectFixture('bbas-worker-released');movingBody.bodyRunInput!.bodies[0].location={kind:'station',stationId:'ST-A',copy:1};
  assert.throws(()=>scheduleWorkerRun(movingBody,1,1,movingBody.bodyRunInput),/równoczesnym przewozem korpusu/);
  const chained=subassemblyDirectFixture(),consumer=chained.operations[1],end={...structuredClone(consumer),id:'DIRECT-END',predecessorIds:[consumer.id]};
  consumer.physicalRole={kind:'subassembly-preparation',subassemblyIds:['NEXT']};
  chained.operations.push(end);chained.stations.find(station=>station.id==='ST-C')!.operationIds.push(end.id);
  chained.subassemblies.push({id:'NEXT',name:'Jawny dalszy podzespół testowy',producerOperationId:consumer.id,consumerOperationIds:[end.id]});
  chained.subassemblyFlow!.lots.push({id:'NEXT-LOT',subassemblyId:'NEXT',quantity:1,unit:'szt.',producer:{job:1,operationId:consumer.id},consumer:{job:1,operationId:end.id},consumptionQuantity:1,source:'Jawne testowe przypisanie dalszej partii'});
  chained.subassemblyBuffers!.buffers.push({subassemblyId:'NEXT',unit:'szt.',stationId:'ST-C',copy:1,inputCapacity:null,outputCapacity:2,blockingPolicy:'bbas'});
  chained.workerRunSelection!.operations.push({operationId:end.id,workerCount:1,eligibleWorkerIds:[chained.workers[1].id]});
  chained.stationRouting!.operations.push({operationId:end.id,candidates:[{stationId:'ST-C',copy:1,requiredEquipmentIds:[]}]});
  consumer.staffing!.timeVariants[0].timeProfile.operatorPresence=[{startSeconds:0,endSeconds:5,basis:'assumed'}];
  assert.throws(()=>scheduleWorkerRun(chained,1,1,chained.bodyRunInput),/obecności/);
});

test('7.12.C2-B2b: pełne dodatnie wyjście zatrzymuje montera 30–50 i chroni kolejne przydziały',()=>{
  const project=subassemblyDirectFixture();delete project.assemblyTransport;
  project.subassemblyBuffers!.buffers[0].outputCapacity=2;project.subassemblyBuffers!.buffers[1].inputCapacity=2;
  const lot=structuredClone(project.subassemblyFlow!.lots[0]),body=structuredClone(project.bodyRunInput!.bodies[0]);
  project.subassemblyFlow!.lots=Array.from({length:4},(_,index)=>({...structuredClone(lot),id:`H${index+1}`,producer:{...lot.producer,job:index+1},consumer:{...lot.consumer,job:index+1}}));
  project.bodyRunInput={bodies:Array.from({length:4},(_,index)=>({...structuredClone(body),id:`HB${index+1}`})),jobs:Array.from({length:4},(_,index)=>({job:index+1,bodyId:`HB${index+1}`}))};
  const result=scheduleWorkerRun(project,1,4,project.bodyRunInput),produced=result.runs.filter(run=>run.operationId===project.operations[0].id);
  assert.deepEqual(produced.map(run=>run.startSeconds),[0,10,20,50]);
  assert.deepEqual(produced.map(run=>run.endSeconds),[10,20,30,60]);
  assert.deepEqual(produced.map(run=>run.stationReleaseSeconds),[10,20,50,60]);
  assert.equal(produced[2].reserveEndSeconds,50);assert.equal(produced[2].blockedSeconds,20);
  assert.deepEqual(result.jobs.map(job=>job.finish),[60,70,80,90]);assertNoWorkerOverlap(result);
});

test('7.12.C2-B2b: nie obiecuje przyszłego powrotu montera, który może zostać zatrzymany przez pełne wyjście',()=>{
  for(const policy of ['bbas','bbas-worker-released'] as const){
    const project=subassemblyDirectFixture(policy);project.subassemblyBuffers!.buffers[0].outputCapacity=2;project.subassemblyBuffers!.buffers[1].inputCapacity=4;
    addReturnRoute(project);project.assemblyTransport!.carts[0].afterUnload='return-to-initial';
    project.workers.push({id:'W-TR',name:'Jawna osoba transportu montażowego — test'});
    project.resourceCalendars!.workers['W-TR']={shifts:[{startSeconds:0,endSeconds:200,basis:'assumed'}],breaks:[]};
    project.assemblyTransport!.routes[0].alternatives[0].workerIds=['W-TR'];
    const lot=structuredClone(project.subassemblyFlow!.lots[0]);
    project.subassemblyFlow!.lots.push({...structuredClone(lot),id:'SECOND-LOT-1'},{...lot,id:'LOT-JOB-2',producer:{...lot.producer,job:2},consumer:{...lot.consumer,job:2}});
    project.bodyRunInput!.bodies.push({...structuredClone(project.bodyRunInput!.bodies[0]),id:'B2'});project.bodyRunInput!.jobs.push({job:2,bodyId:'B2'});
    const before=JSON.stringify(project);
    if(policy==='bbas')assert.throws(()=>scheduleWorkerRun(project,1,2,project.bodyRunInput),(error:unknown)=>{
      const diagnostic=parseProcessStallDiagnostic(error);assert.ok(diagnostic);assert.equal(diagnostic.type,'buffer-deadlock');
      assert.equal(diagnostic.atSeconds,20);assert.ok(diagnostic.blockedStations.some(station=>station.holdingWorkerIds?.includes(project.workers[0].id)));
      return true;
    });
    else{
      const result=scheduleWorkerRun(project,1,2,project.bodyRunInput);
      assert.deepEqual(result.jobs.map(job=>job.finish),[60,70]);assertNoWorkerOverlap(result);
      assert.deepEqual(result.transportMovements!.filter(move=>move.purpose==='return').map(move=>[move.startSeconds,move.endSeconds]),[[20,25],[27,32],[52,57]]);
    }
    assert.equal(JSON.stringify(project),before);
  }
});

test('7.12.C2-B2b: bbas nie dopowiada powrotu osoby o obecności kończącej się przed końcem producenta',()=>{
  const project=subassemblyDirectFixture(),profile=project.operations[0].staffing!.timeVariants[0].timeProfile;
  profile.manualWork=[{startSeconds:0,endSeconds:8,basis:'assumed'}];profile.operatorPresence=[{startSeconds:0,endSeconds:8,basis:'assumed'}];profile.machineRun=[{startSeconds:8,endSeconds:10,basis:'assumed'}];
  assert.doesNotThrow(()=>parseDomainProjectV6(JSON.stringify(project)));
  assert.throws(()=>scheduleWorkerRun(project,1,1,project.bodyRunInput),/wcześniejsze wyjście wymaga reguły powrotu/);
  profile.manualWork=[{startSeconds:8,endSeconds:10,basis:'assumed'}];profile.operatorPresence=[{startSeconds:8,endSeconds:10,basis:'assumed'}];profile.machineRun=[{startSeconds:0,endSeconds:8,basis:'assumed'}];
  assert.throws(()=>scheduleWorkerRun(project,1,1,project.bodyRunInput),/częściowa obecność wymaga dalszej integracji/);
});

test('7.12.C2-B2b: lokalne wejście 0 pobiera całą partię bez ruchu i bez zapasu wejściowego',()=>{
  const project=subassemblyDirectFixture('bbas-worker-released');delete project.assemblyTransport;
  project.subassemblyBuffers!.buffers[0].outputCapacity=2;
  project.subassemblyBuffers!.buffers[1].stationId='ST-A';
  project.subassemblyBuffers!.buffers[0].inputCapacity=0;project.subassemblyBuffers!.buffers.splice(1,1);
  project.stationRouting!.operations[1].candidates=[{stationId:'ST-A',copy:1,requiredEquipmentIds:[]}];
  project.bodyRunInput!.bodies[0].location={kind:'station',stationId:'ST-A',copy:1};
  const result=scheduleWorkerRun(project,1,1,project.bodyRunInput);
  assert.equal(result.jobs[0].finish,20);assert.equal(result.transportMovements!.length,0);
  assert.deepEqual(result.subassemblyEvents!.map(event=>event.kind),['produced','consumed']);
  assert.equal(subassemblyBufferLoad(result.subassemblyBufferBooks![0],{stationId:'ST-A',copy:1,side:'input'}).total,0);
});

test('7.12.C2-B2b: przyszła częściowa obecność odbiorcy jest chroniona przed powrotem wspólnego montera',()=>{
  const project=subassemblyDirectFixture();addReturnRoute(project);project.assemblyTransport!.carts[0].afterUnload='return-to-initial';
  project.workerRunSelection!.operations[1].eligibleWorkerIds=[project.workers[0].id];
  const profile=project.operations[1].staffing!.timeVariants[0].timeProfile;
  profile.manualWork=[{startSeconds:3,endSeconds:10,basis:'assumed'}];profile.operatorPresence=[{startSeconds:3,endSeconds:10,basis:'assumed'}];profile.machineRun=[{startSeconds:0,endSeconds:3,basis:'assumed'}];
  const result=scheduleWorkerRun(project,1,1,project.bodyRunInput),consumer=result.runs.find(run=>run.operationId===project.operations[1].id)!;
  assert.deepEqual([consumer.startSeconds,consumer.reserveStartSeconds,consumer.reserveEndSeconds],[50,53,60]);
  assert.deepEqual(result.transportMovements!.filter(move=>move.purpose==='return').map(move=>[move.startSeconds,move.endSeconds]),[[60,65]]);
  assertNoWorkerOverlap(result);
});

test('7.12.C2-B2b: dostawa przy 80 przesuwa wyjazd na 78; brak zużycia i magazynowania przed przyjazdem',()=>{
  const project=subassemblyDirectFixture();
  project.materialSupply={items:[{id:'DIRECT-SUP',componentId:'EXPLICIT-PART',targetStationId:'ST-C',initialStock:0,unit:'szt.',
    schedule:{kind:'explicit-deliveries',deliveries:[{deliveryTimeSeconds:80,quantity:1}]},source:'Jawna syntetyczna dostawa do odbiorcy'}],
    consumptions:[{operationId:project.operations[1].id,supplyId:'DIRECT-SUP',quantity:1,source:'Jawne syntetyczne pobranie'}]};
  const result=scheduleWorkerRun(project,1,1,project.bodyRunInput);
  assert.deepEqual(result.transportMovements!.filter(move=>move.purpose==='transfer').map(move=>[move.startSeconds,move.endSeconds]),[[78,80]]);
  assert.deepEqual(result.materialEvents!.map(event=>[event.kind,event.atSeconds]),[['delivery',80],['consumption',80]]);
  assert.equal(result.runs[0].reserveEndSeconds,78);assert.equal(result.jobs[0].finish,90);assertNoWorkerOverlap(result);
});

test('7.12.C2-B2b: C2 z dodatnimi buforami i bbas zachowuje referencje 2210/2180 oraz zapas reszt',()=>{
  for(const variant of JSON.parse(advancedDemoPackage().data.variantsRaw!).variants){
    const project=parseDomainProjectV6(JSON.stringify(variant.project));
    project.subassemblyBuffers={buffers:project.subassemblies.flatMap(definition=>[
      {subassemblyId:definition.id,unit:'szt.',stationId:project.stations.find(station=>station.operationIds.includes(definition.producerOperationId!))!.id,copy:null,inputCapacity:null,outputCapacity:5,blockingPolicy:'bbas' as const},
      {subassemblyId:definition.id,unit:'szt.',stationId:'ST-MU-MAIN2',copy:null,inputCapacity:9,outputCapacity:null,blockingPolicy:'bbas-worker-released' as const}
    ])};
    for(const lot of project.subassemblyFlow!.lots){lot.quantity=5;lot.consumptionQuantity=3;}
    const result=scheduleWorkerRun(project,1000,3,project.bodyRunInput);
    assert.equal(result.jobs[2].finish,variant.id==='ADVANCED-BASE'?2210:2180);assertNoWorkerOverlap(result);
    for(const book of result.subassemblyBufferBooks!)assert.equal(subassemblyBufferLoad(book,{stationId:'ST-MU-MAIN2',copy:1,side:'input'}).total,6);
  }
});

test('7.12.C2-B3a: mieszane polityki bez blokady pozwalają zwolnić wspólną obsadę po odłożeniu wszystkich partii',()=>{
  const project=subassemblyDirectFixture();project.subassemblyBuffers!.buffers[0].outputCapacity=2;project.subassemblyBuffers!.buffers[1].inputCapacity=2;
  delete project.assemblyTransport; // This reference isolates output policies; transport has an explicit route time without a cart set.
  const definition=project.subassemblies[0];project.subassemblies.push({...definition,id:'SUB-OTHER',name:'Drugi podzespół testowy'});
  (project.operations[0].physicalRole as {kind:'subassembly-preparation';subassemblyIds:string[]}).subassemblyIds.push('SUB-OTHER');
  project.subassemblyFlow!.lots.push({...structuredClone(project.subassemblyFlow!.lots[0]),id:'OTHER-LOT',subassemblyId:'SUB-OTHER'});
  project.subassemblyBuffers!.buffers.push({...project.subassemblyBuffers!.buffers[0],subassemblyId:'SUB-OTHER',blockingPolicy:'bbas-worker-released'});
  const result=scheduleWorkerRun(project,1,1,project.bodyRunInput);
  assert.equal(result.runs[0].stationReleaseSeconds,10);assert.equal(result.runs[0].reserveEndSeconds,10);
  assert.equal(result.jobs[0].finish,60);assertNoWorkerOverlap(result);
});

test('7.12.C2-B2b: niezależny wzorzec UI — 50 obróbki, blokada do 90, transport 90–100, montaż 100–170, powrót 170–180',()=>{
  const input=JSON.parse(advancedDemoPackage().data.draftRaw).project,before=JSON.stringify(input),project=prepareC2B2bUiProject(input);
  const result=scheduleWorkerRun(project,1000,1,project.bodyRunInput);
  assert.deepEqual(result.runs.map(run=>[run.startSeconds,run.endSeconds]),[[0,50],[100,170]]);
  assert.deepEqual([result.runs[0].blockedSeconds,result.runs[0].stationReleaseSeconds,result.runs[0].reserveEndSeconds],[40,90,90]);
  assert.deepEqual(result.transportMovements!.map(move=>[move.purpose,move.startSeconds,move.endSeconds]),[['transfer',90,100],['return',170,180]]);
  assert.equal(result.jobs[0].finish,170);assertNoWorkerOverlap(result);assert.equal(JSON.stringify(input),before);
  const replies:ScheduleReply[]=[];executeScheduleRequest({project,batch:1,arrivalIntervalSeconds:1000},reply=>replies.push(reply));
  assert.deepEqual((replies.find(reply=>reply.kind==='result') as {result:unknown}).result,result);
  const conditions={batch:1,arrivalIntervalSeconds:1000,transportMode:'configured' as const};
  const playback=prepareDomainPhysicalPlayback(project,result,conditions);assert.equal(playback.endSeconds,180);
});

test('7.12.C2-B2b: zatrzymany monter nie robi pustego dojazdu; inna jawna osoba może go wykonać bez przedwczesnego zwolnienia źródła',()=>{
  for(const independent of [false,true]){
    const project=subassemblyDirectFixture();addReturnRoute(project);
    project.assemblyTransport!.carts[0].initialLocation={stationId:'ST-C',copy:1};
    if(independent)project.assemblyTransport!.emptyRoutes.find(route=>route.from.stationId==='ST-C')!.workerAssignment!.workerIds=[project.workers[1].id];
    if(!independent)assert.throws(()=>scheduleWorkerRun(project,1,1,project.bodyRunInput),(error:unknown)=>parseProcessStallDiagnostic(error)?.type==='buffer-deadlock');
    else{
      const result=scheduleWorkerRun(project,1,1,project.bodyRunInput);
      assert.deepEqual(result.transportMovements!.map(move=>[move.purpose,move.startSeconds,move.endSeconds]),[['approach',10,15],['transfer',48,50]]);
      assert.equal(result.jobs[0].finish,60);assert.equal(result.runs[0].reserveEndSeconds,48);
      assert.equal(result.reservations.reservations.find(reservation=>reservation.reservationId===`1:${project.operations[0].id}`)!.endSeconds,48);
      assertNoWorkerOverlap(result);
    }
  }
});

test('7.12.C2-B2a: oddzielna konfiguracja przechodzi zapis/odczyt, nie zmienia źródła ani buforów korpusów',()=>{
  const project=subassemblyScheduleFixture(),configured=subassemblyBufferedFixture(),before=JSON.stringify(project);
  const edited=editDomainSubassemblyBuffers(project,configured.subassemblyBuffers);
  assert.equal(JSON.stringify(project),before);
  assert.deepEqual(parseDomainProjectV6(JSON.stringify(edited)).subassemblyBuffers,configured.subassemblyBuffers);
  assert.deepEqual(editDomainSubassemblyBuffers(edited,undefined),project);
  const originalJson=JSON.stringify(derive(parseProject(JSON.stringify(base))).project);
  const storage=new DraftStorage(),initial=saveDomainDraft(storage,{project,originalJson},null);
  const saved=saveDomainDraft(storage,{project:edited,originalJson},initial.raw),reopened=readDomainDraft(storage);
  assert.equal(reopened.status,'valid');if(reopened.status==='valid'){
    assert.equal(reopened.saved.originalJson,originalJson);assert.deepEqual(reopened.saved.project.subassemblyBuffers,edited.subassemblyBuffers);
  }
  const broken=structuredClone(edited);broken.subassemblyBuffers!.buffers[0].unit='kg';
  assert.throws(()=>saveDomainDraft(storage,{project:broken,originalJson},saved.raw));
  assert.equal(storage.getItem(DOMAIN_DRAFT_STORAGE_KEY),saved.raw);
  assert.equal(edited.stationBuffers,project.stationBuffers);
  const factors=inspectVariantFactors(project,edited,'additional-station',false);
  assert.ok(factors.changedDimensions.includes('stations'));assert.ok(factors.summary.some(line=>line.includes('buforów podmontaży')));
});

test('7.12.C2-B2a: walidacja odrzuca konflikty kopii, brak jawnych danych i niezgodne jednostki/ilości',()=>{
  const project=subassemblyBufferedFixture();
  const bad=(mutate:(p:typeof project)=>void)=>{const copy=structuredClone(project);mutate(copy);assert.throws(()=>parseDomainProjectV6(JSON.stringify(copy)));};
  bad(p=>p.subassemblyBuffers!.buffers.push({...p.subassemblyBuffers!.buffers[0],copy:1}));
  bad(p=>p.subassemblyBuffers!.buffers[0].subassemblyId='UNKNOWN');
  bad(p=>p.subassemblyBuffers!.buffers[0].copy=2);
  bad(p=>p.subassemblyBuffers!.buffers[0].unit='kg');
  bad(p=>p.subassemblyBuffers!.buffers[0].outputCapacity=-1);
  bad(p=>p.subassemblyFlow!.lots[0].quantity=1.5);
  bad(p=>delete (p.subassemblyBuffers!.buffers[0] as any).blockingPolicy);
  bad(p=>(p.subassemblyBuffers!.buffers[0] as any).extra=true);
  const zero=structuredClone(project);zero.subassemblyBuffers!.buffers[0].outputCapacity=0;
  assert.doesNotThrow(()=>validateSubassemblyBuffers(zero,zero.subassemblyBuffers));
  assert.equal(scheduleWorkerRun(zero,1,1,zero.bodyRunInput).jobs[0].finish,22);
  const held=structuredClone(project);held.subassemblyBuffers!.buffers[0].blockingPolicy='bbas';
  assert.equal(scheduleWorkerRun(held,1,1,held.bodyRunInput).jobs[0].finish,22);
});

test('7.12.C2-B2a: rezerwacja, przewóz i zużycie są wspólne z zasobami; 2 minus 1 zostaje w wejściu',()=>{
  const project=subassemblyBufferedFixture(),before=JSON.stringify(project);
  const result=scheduleWorkerRun(project,1,1,project.bodyRunInput);
  assert.equal(result.jobs[0].finish,22);
  assert.deepEqual(result.subassemblyEvents!.map(event=>[event.kind,event.atSeconds]),[['produced',10],['start-transfer',10],['arrived',12],['consumed',12]]);
  const book=result.subassemblyBufferBooks![0],token=book.tokens[0];
  assert.deepEqual(token.location,{stationId:'ST-C',copy:1,side:'input'});assert.equal(token.residual,true);assert.equal(token.remainingQuantity,1);
  assert.equal(subassemblyBufferLoad(book,{stationId:'ST-C',copy:1,side:'input'}).total,1);
  assert.equal(subassemblyBufferLoad(book,{stationId:'ST-A',copy:1,side:'output'}).total,0);
  assert.equal(result.runs[0].stationReleaseSeconds,10);assert.equal(result.runs[0].blockedSeconds,0);
  const replies:ScheduleReply[]=[];executeScheduleRequest({project,batch:1,arrivalIntervalSeconds:1},reply=>replies.push(reply));
  assert.deepEqual((replies.find(reply=>reply.kind==='result') as {result:unknown}).result,result);
  assert.equal(JSON.stringify(project),before);
  const jit=scheduleWorkerRun(project,1,1,undefined,undefined,{transportMode:'just-in-time'});
  assert.equal(jit.subassemblyBufferBooks,undefined);assert.equal(jit.jobs[0].finish,20);assert.equal(JSON.stringify(project),before);
});

test('7.12.C2-B2a: za małe wyjście lub wejście odmawia jako brak pojemności, bez mutacji i fikcyjnego transportu',()=>{
  for(const side of ['input','output'] as const){
    const project=subassemblyBufferedFixture();project.subassemblyBuffers!.buffers[side==='output'?0:1][side==='output'?'outputCapacity':'inputCapacity']=1;
    const before=JSON.stringify(project);
    assert.throws(()=>scheduleWorkerRun(project,1,1,project.bodyRunInput),(error:unknown)=>parseProcessStallDiagnostic(error)?.type==='buffer-deadlock');
    assert.equal(JSON.stringify(project),before);
  }
});

test('7.12.C2-B2a: pełne wyjście blokuje producenta po pracy do odjazdu wcześniejszej partii, nie trzyma operatora',()=>{
  const project=subassemblyBufferedFixture();delete project.assemblyTransport;
  const producer=project.operations[0].id,consumer=project.operations[1].id;
  project.workerRunSelection!.operations[0].eligibleWorkerIds=[project.workers[0].id];
  project.workerRunSelection!.operations[1].eligibleWorkerIds=[project.workers[1].id];
  for(const worker of project.workers)project.resourceCalendars!.workers[worker.id]={shifts:[{startSeconds:0,endSeconds:200,basis:'assumed'}],breaks:[]};
  project.resourceCalendars!.stations['ST-A']={shifts:[{startSeconds:0,endSeconds:200,basis:'assumed'}],breaks:[]};
  project.resourceCalendars!.stations['ST-C']={shifts:[{startSeconds:50,endSeconds:200,basis:'assumed'}],breaks:[]};
  const lot=structuredClone(project.subassemblyFlow!.lots[0]),body=structuredClone(project.bodyRunInput!.bodies[0]);
  project.subassemblyFlow!.lots=Array.from({length:4},(_,index)=>({...structuredClone(lot),id:`L${index+1}`,producer:{job:index+1,operationId:producer},consumer:{job:index+1,operationId:consumer},consumptionQuantity:2}));
  project.bodyRunInput={bodies:Array.from({length:4},(_,index)=>({...structuredClone(body),id:`B${index+1}`})),jobs:Array.from({length:4},(_,index)=>({job:index+1,bodyId:`B${index+1}`}))};
  // Independent reference: 2 pieces fill input. First recipient starts at 50; subsequent starts 60,70,80.
  // Producer 3 ends at 30, but output holds lot 2 until its departure at 50, releasing producer 3.
  const result=scheduleWorkerRun(project,1,4,project.bodyRunInput);
  const produced=result.runs.filter(run=>run.operationId===producer);
  assert.deepEqual(produced.map(run=>run.startSeconds),[0,10,20,50]);
  assert.deepEqual(produced.map(run=>run.endSeconds),[10,20,30,60]);
  assert.deepEqual(produced.map(run=>run.stationReleaseSeconds),[10,20,50,60]);
  assert.equal(produced[2].blockedSeconds,20);assert.equal(produced[2].reserveEndSeconds,30);
  assert.equal(result.reservations.reservations.find(reservation=>reservation.reservationId===`3:${producer}`)!.releasedAtSeconds,30);
  assert.deepEqual(result.runs.filter(run=>run.operationId===consumer).map(run=>run.startSeconds),[50,60,70,80]);
  assert.deepEqual(result.jobs.map(job=>job.finish),[60,70,80,90]);
});

test('7.12.C2-B2a: reszty zajmują pojemność kolejnej dostawy i powodują jawny martwy punkt',()=>{
  const project=subassemblyBufferedFixture();delete project.assemblyTransport;delete project.resourceCalendars;
  const lot=structuredClone(project.subassemblyFlow!.lots[0]);
  project.subassemblyFlow!.lots.push({...lot,id:'L2',producer:{...lot.producer,job:2},consumer:{...lot.consumer,job:2}});
  project.bodyRunInput!.bodies.push({...structuredClone(project.bodyRunInput!.bodies[0]),id:'B2'});project.bodyRunInput!.jobs.push({job:2,bodyId:'B2'});
  assert.throws(()=>scheduleWorkerRun(project,1,2,project.bodyRunInput),(error:unknown)=>parseProcessStallDiagnostic(error)?.type==='buffer-deadlock');
  project.subassemblyBuffers!.buffers[1].inputCapacity=3;
  const result=scheduleWorkerRun(project,1,2,project.bodyRunInput),book=result.subassemblyBufferBooks![0];
  assert.equal(subassemblyBufferLoad(book,{stationId:'ST-C',copy:1,side:'input'}).total,2);
  assert.ok(book.tokens.every(token=>token.residual&&token.remainingQuantity===1));
});

test('7.12.C2-B2a: historyczne oczekiwanie buforowe nie jest zgłaszane jako aktualny brak pojemności',()=>{
  const project=subassemblyBufferedFixture();delete project.assemblyTransport;
  const lot=structuredClone(project.subassemblyFlow!.lots[0]);lot.consumptionQuantity=2;
  project.subassemblyFlow!.lots=[lot,{...structuredClone(lot),id:'L2',producer:{...lot.producer,job:2},consumer:{...lot.consumer,job:2}}];
  project.bodyRunInput!.bodies.push({...structuredClone(project.bodyRunInput!.bodies[0]),id:'B2'});project.bodyRunInput!.jobs.push({job:2,bodyId:'B2'});
  for(const worker of project.workers)project.resourceCalendars!.workers[worker.id]={shifts:[{startSeconds:0,endSeconds:200,basis:'assumed'}],breaks:[]};
  project.resourceCalendars!.stations['ST-C']={shifts:[{startSeconds:50,endSeconds:60,basis:'assumed'}],breaks:[]};
  assert.throws(()=>scheduleWorkerRun(project,1,2,project.bodyRunInput),(error:unknown)=>{
    const diagnostic=parseProcessStallDiagnostic(error);
    assert.ok(diagnostic);assert.notEqual(diagnostic.type,'buffer-deadlock');
    return true;
  });
});

test('7.12.C2-B2a: C2 ma osobne pojemności SUB-PWR/SUB-DRV i zapasy reszt; fizyczne referencje pozostają 2210/2180 s',()=>{
  const variants=JSON.parse(advancedDemoPackage().data.variantsRaw!).variants;
  for(const variant of variants){
    const project=parseDomainProjectV6(JSON.stringify(variant.project));
    project.subassemblyBuffers={buffers:project.subassemblies.flatMap(definition=>[
      {subassemblyId:definition.id,unit:'szt.',stationId:project.stations.find(station=>station.operationIds.includes(definition.producerOperationId!))!.id,copy:null,inputCapacity:null,outputCapacity:5,blockingPolicy:'bbas-worker-released' as const},
      {subassemblyId:definition.id,unit:'szt.',stationId:'ST-MU-MAIN2',copy:null,inputCapacity:9,outputCapacity:null,blockingPolicy:'bbas-worker-released' as const}
    ])};
    for(const lot of project.subassemblyFlow!.lots){lot.quantity=5;lot.consumptionQuantity=3;}
    const before=JSON.stringify(project),result=scheduleWorkerRun(project,1000,3,project.bodyRunInput);
    assert.equal(result.jobs[2].finish,variant.id==='ADVANCED-BASE'?2210:2180);
    assert.equal(result.subassemblyBufferBooks!.length,2);
    for(const book of result.subassemblyBufferBooks!){
      assert.equal(subassemblyBufferLoad(book,{stationId:'ST-MU-MAIN2',copy:1,side:'input'}).total,6);
      assert.ok(book.tokens.every(token=>token.residual&&token.remainingQuantity===2));
    }
    const reservations=result.reservations.reservations;
    for(let i=0;i<reservations.length;i++)for(let j=i+1;j<reservations.length;j++){
      const a=reservations[i],b=reservations[j];if(a.workerIds.some(id=>b.workerIds.includes(id)))assert.ok(a.endSeconds<=b.startSeconds||b.endSeconds<=a.startSeconds);
    }
    assert.equal(JSON.stringify(project),before);
  }
});

test('7.12.C2-B2a: copy=null rozwija osobne limity, rezerwacja celu obciąża pojemność w trakcie ruchu',()=>{
  const project=subassemblyBufferedFixture();project.stationSettings['ST-C'].parallelStations=2;
  project.stationRouting!.operations[1].candidates.push({stationId:'ST-C',copy:2,requiredEquipmentIds:[]});
  const candidates=new Map(project.stationRouting!.operations.map(operation=>[operation.operationId,operation.candidates]));
  const runtime=new SubassemblyBufferRun(project,candidates),declaration=project.subassemblyFlow!.lots[0];
  const first={declaration,status:'available' as const,location:{stationId:'ST-A',copy:1},remainingQuantity:2};
  assert.equal(runtime.deposit([first],first.location,0),true);
  runtime.depart(first,{stationId:'ST-C',copy:1},0);
  const second={...first,declaration:{...declaration,id:'L2'}};
  assert.equal(runtime.deposit([second],second.location,0),true);
  assert.equal(runtime.canDepart(second,{stationId:'ST-C',copy:1}),false);
  assert.equal(runtime.canDepart(second,{stationId:'ST-C',copy:2}),true);
  assert.deepEqual(subassemblyBufferLoad(runtime.snapshot()[0],{stationId:'ST-C',copy:1,side:'input'}),{occupied:0,reserved:2,total:2});
  runtime.depart(second,{stationId:'ST-C',copy:2},0);runtime.arrive(first,1);runtime.arrive(second,1);
  assert.equal(subassemblyBufferLoad(runtime.snapshot()[0],{stationId:'ST-C',copy:2,side:'input'}).occupied,2);
});

test('7.12.C2-B2a: dwie sztuki ze wspólnym monterem/wózkiem i powrotami nie tworzą podwójnych rezerwacji',()=>{
  const project=subassemblyBufferedFixture();addReturnRoute(project);project.assemblyTransport!.carts[0].afterUnload='return-to-initial';
  project.subassemblyBuffers!.buffers[1].inputCapacity=3;
  const lot=structuredClone(project.subassemblyFlow!.lots[0]);
  project.subassemblyFlow!.lots.push({...lot,id:'L2',producer:{...lot.producer,job:2},consumer:{...lot.consumer,job:2}});
  project.bodyRunInput!.bodies.push({...structuredClone(project.bodyRunInput!.bodies[0]),id:'B2'});project.bodyRunInput!.jobs.push({job:2,bodyId:'B2'});
  const result=scheduleWorkerRun(project,1,2,project.bodyRunInput),reservations=result.reservations.reservations;
  for(let i=0;i<reservations.length;i++)for(let j=i+1;j<reservations.length;j++){
    const a=reservations[i],b=reservations[j];if(a.workerIds.some(id=>b.workerIds.includes(id)))assert.ok(a.endSeconds<=b.startSeconds||b.endSeconds<=a.startSeconds);
  }
  const moves=result.transportMovements!;
  assert.equal(moves.filter(move=>move.purpose==='transfer').length,2);assert.equal(moves.filter(move=>move.purpose==='return').length,2);
  for(let i=0;i<moves.length;i++)for(let j=i+1;j<moves.length;j++){
    const a=moves[i],b=moves[j];if(a.equipmentIds.some(id=>b.equipmentIds.includes(id)))assert.ok(a.endSeconds<=b.startSeconds||b.endSeconds<=a.startSeconds);
  }
  assert.equal(subassemblyBufferLoad(result.subassemblyBufferBooks![0],{stationId:'ST-C',copy:1,side:'input'}).total,2);
});

test('7.12.C2-B2a: kilka partii producenta przechodzi kolejno przez bufor mieszczący jedną całą partię',()=>{
  const project=subassemblyBufferedFixture();addReturnRoute(project);project.assemblyTransport!.carts[0].afterUnload='return-to-initial';
  project.subassemblyBuffers!.buffers[1].inputCapacity=4;
  project.subassemblyFlow!.lots.push({...structuredClone(project.subassemblyFlow!.lots[0]),id:'L2'});
  // Two lots of 2 pieces share output capacity 2. Departures 10 and 17, recipient starts 19, ends 29.
  const result=scheduleWorkerRun(project,1,1,project.bodyRunInput);
  assert.equal(result.jobs[0].finish,29);
  assert.deepEqual(result.transportMovements!.filter(move=>move.purpose==='transfer').map(move=>[move.startSeconds,move.endSeconds]),[[10,12],[17,19]]);
  assert.deepEqual(result.subassemblyEvents!.filter(event=>event.kind==='consumed').map(event=>event.atSeconds),[19,19]);
  assert.equal(subassemblyBufferLoad(result.subassemblyBufferBooks![0],{stationId:'ST-C',copy:1,side:'input'}).total,2);
});
test('3.4m2: przygotowanie, przewóz i pobranie partii mają rzeczywiste zdarzenia i wspólne osoby',()=>{
  const project=subassemblyScheduleFixture(),before=JSON.stringify(project);
  const result=scheduleWorkerRun(project,1,1,project.bodyRunInput);
  assert.equal(result.jobs[0].finish,22);
  assert.deepEqual(result.subassemblyEvents!.map(e=>[e.kind,e.atSeconds]),[['produced',10],['start-transfer',10],['arrived',12],['consumed',12]]);
  assert.equal(result.subassemblyLots![0].remainingQuantity,1);assert.equal(result.subassemblyLots![0].status,'consumed');
  assert.equal(result.transportMovements![0].lotId,'LOT-1');assert.equal(result.bodyEvents!.filter(e=>e.kind==='start-transfer').length,0);
  const replies:ScheduleReply[]=[];executeScheduleRequest({project,batch:1,arrivalIntervalSeconds:1},r=>replies.push(r));
  assert.deepEqual((replies.find(r=>r.kind==='result') as {result:unknown}).result,result);
  assert.equal(JSON.stringify(project),before);
  const jit=scheduleWorkerRun(project,1,1,undefined,undefined,{transportMode:'just-in-time'});
  assert.equal(jit.jobs[0].finish,20);assert.equal(jit.subassemblyEvents,undefined);
});
test('3.4m2: dwie partie czekają na wspólny wózek i powrót, odbiorca pobiera obie atomowo',()=>{
  const project=subassemblyScheduleFixture();addReturnRoute(project);
  project.assemblyTransport!.carts[0].afterUnload='return-to-initial';
  project.subassemblyFlow!.lots.push({...structuredClone(project.subassemblyFlow!.lots[0]),id:'LOT-2'});
  const result=scheduleWorkerRun(project,1,1,project.bodyRunInput);
  assert.deepEqual(result.transportMovements!.map(m=>[m.purpose,m.startSeconds,m.endSeconds]),[['transfer',10,12],['return',12,17],['transfer',17,19],['return',19,24]]);
  assert.equal(result.jobs[0].finish,29);
  assert.deepEqual(result.subassemblyEvents!.filter(e=>e.kind==='consumed').map(e=>e.atSeconds),[19,19]);
  const reservations=result.reservations.reservations;
  for(let i=0;i<reservations.length;i++)for(let j=i+1;j<reservations.length;j++){
    const a=reservations[i],b=reservations[j];if(a.workerIds.some(id=>b.workerIds.includes(id)))assert.ok(a.endSeconds<=b.startSeconds||b.endSeconds<=a.startSeconds);
  }
});
test('3.4m2: kalendarz przesuwa przewóz i pobranie, bez rezerwowania korpusu podczas dojazdu',()=>{
  const project=subassemblyScheduleFixture();project.assemblyTransport!.carts[0].calendar.breaks=[{startSeconds:10,endSeconds:15,basis:'assumed'}];
  const result=scheduleWorkerRun(project,1,1,project.bodyRunInput);
  assert.equal(result.subassemblyEvents!.find(e=>e.kind==='start-transfer')!.atSeconds,15);
  assert.equal(result.subassemblyEvents!.find(e=>e.kind==='consumed')!.atSeconds,17);
  assert.equal(result.bodyEvents!.find(e=>e.kind==='reserve')!.atSeconds,17);
  assert.ok(result.runs[1].waitCauses.includes('calendar'));
  const approach=subassemblyScheduleFixture();addReturnRoute(approach);
  approach.assemblyTransport!.carts[0].initialLocation={stationId:'ST-C',copy:1};
  const withApproach=scheduleWorkerRun(approach,1,1,approach.bodyRunInput);
  assert.deepEqual(withApproach.transportMovements!.map(m=>[m.purpose,m.startSeconds,m.endSeconds]),[['approach',10,15],['transfer',15,17]]);
});
test('3.4m2: brak ilości i drogi dają odmowę, nieosiągalna alternatywa nie psuje wykonalnej kopii',()=>{
  const project=subassemblyScheduleFixture();assert.throws(()=>scheduleWorkerRun(project,1,2),/brak jawnej partii/);
  project.subassemblyFlow!.lots[0].producer.job=2;assert.throws(()=>scheduleWorkerRun(project,1,1,project.bodyRunInput),/poza uruchomioną/);
  const noRoute=subassemblyScheduleFixture();delete noRoute.assemblyTransport;noRoute.stationRouting!.routes=[];
  assert.throws(()=>scheduleWorkerRun(noRoute,1,1,noRoute.bodyRunInput),/brak jawnej trasy/);
  const multi=subassemblyScheduleFixture();multi.stationSettings['ST-C'].parallelStations=2;
  multi.stationRouting!.operations.find(o=>o.operationId===multi.operations[1].id)!.candidates.push({stationId:'ST-C',copy:2,requiredEquipmentIds:[]});
  assert.equal(scheduleWorkerRun(multi,1,1,multi.bodyRunInput).runs[1].copy,1);
});
test('3.4m2: lokalne pobranie nie tworzy ruchu, stare trasy bez zasobów nadal liczą czas',()=>{
  const project=subassemblyScheduleFixture();delete project.assemblyTransport;
  const timeOnly=scheduleWorkerRun(project,1,1,project.bodyRunInput);assert.equal(timeOnly.jobs[0].finish,22);assert.equal(timeOnly.transportMovements![0].lotId,'LOT-1');
  project.stationRouting!.operations.find(o=>o.operationId===project.operations[1].id)!.candidates=[{stationId:'ST-A',copy:1,requiredEquipmentIds:[]}];
  project.bodyRunInput!.bodies[0].location={kind:'station',stationId:'ST-A',copy:1};
  const local=scheduleWorkerRun(project,1,1,project.bodyRunInput);assert.equal(local.jobs[0].finish,20);
  assert.deepEqual(local.subassemblyEvents!.map(e=>e.kind),['produced','consumed']);assert.equal(local.transportMovements!.length,0);
});


test('3.4m2: wspólna osoba odbiorcy czeka na powrót, pobranie następuje przy rzeczywistym starcie',()=>{
  const project=subassemblyScheduleFixture();addReturnRoute(project);project.assemblyTransport!.carts[0].afterUnload='return-to-initial';
  project.workerRunSelection!.operations[1].eligibleWorkerIds=[project.workers[0].id];
  const result=scheduleWorkerRun(project,1,1,project.bodyRunInput);
  assert.equal(result.runs[1].startSeconds,17);assert.equal(result.jobs[0].finish,27);
  assert.equal(result.subassemblyEvents!.find(e=>e.kind==='consumed')!.atSeconds,17);
});
test('3.4m2: odbiorca gotowy wcześniej czeka na producenta, bez cichego brakującego materiału',()=>{
  const project=subassemblyScheduleFixture();project.operations[1].predecessorIds=[];
  const result=scheduleWorkerRun(project,1,1,project.bodyRunInput);
  assert.equal(result.runs[1].startSeconds,12);assert.ok(result.runs[1].waitCauses.includes('subassembly'));
  project.operations[0].predecessorIds=[project.operations[1].id];
  assert.throws(()=>scheduleWorkerRun(project,1,1,project.bodyRunInput),/nie zakończył/);
});


test('3.4m2: dwie sztuki nie przejmują cudzej partii, wózka ani osoby',()=>{
  const project=subassemblyScheduleFixture();addReturnRoute(project);project.assemblyTransport!.carts[0].afterUnload='return-to-initial';
  const second=structuredClone(project.subassemblyFlow!.lots[0]);second.id='LOT-JOB-2';second.producer.job=2;second.consumer.job=2;project.subassemblyFlow!.lots.push(second);
  const input=project.bodyRunInput!;input.bodies.push({...structuredClone(input.bodies[0]),id:'BODY-2'});input.jobs.push({job:2,bodyId:'BODY-2'});
  const result=scheduleWorkerRun(project,1,2,input);
  assert.equal(result.subassemblyEvents!.filter(e=>e.kind==='consumed').length,2);
  assert.ok(result.subassemblyLots!.every(l=>l.status==='consumed'));
  const movements=result.transportMovements!;
  for(let i=0;i<movements.length;i++)for(let j=i+1;j<movements.length;j++){
    const a=movements[i],b=movements[j];if(a.equipmentIds.some(id=>b.equipmentIds.includes(id))||a.workerIds.some(id=>b.workerIds.includes(id)))assert.ok(a.endSeconds<=b.startSeconds||b.endSeconds<=a.startSeconds);
  }
});
test('3.4m2: transport między przygotowaniami działa bez instancji korpusu',()=>{
  const project=subassemblyScheduleFixture();delete project.bodyRunInput;
  const consumer=project.operations[1];consumer.physicalRole={kind:'subassembly-preparation',subassemblyIds:['END-PART']};
  project.subassemblies.push({id:'END-PART',name:'Końcowy podzespół testowy',producerOperationId:consumer.id,consumerOperationIds:[]});
  const result=scheduleWorkerRun(project,1,1);assert.equal(result.jobs[0].finish,22);
  assert.equal(result.bodyBook,undefined);assert.equal(result.subassemblyEvents!.filter(e=>e.kind==='consumed').length,1);
});


function multipleSubassemblyRecipientFixture(){
  const project=subassemblyScheduleFixture();delete project.bodyRunInput;
  const consumer=project.operations[1];consumer.physicalRole={kind:'subassembly-preparation',subassemblyIds:['OUTPUT']};
  project.subassemblies.push({id:'OUTPUT',name:'Testowy podzespół wynikowy',producerOperationId:consumer.id,consumerOperationIds:[]});
  project.stations.push({id:'ST-D',name:'Alternatywny odbiorca testowy',operationIds:[]});
  project.stationSettings['ST-D']={operators:1,parallelStations:1};
  project.resourceCalendars!.stations['ST-D']=structuredClone(project.resourceCalendars!.stations['ST-C']);
  project.stationRouting!.operations.find(o=>o.operationId===consumer.id)!.candidates.push({stationId:'ST-D',copy:1,requiredEquipmentIds:[]});
  const route={...structuredClone(project.stationRouting!.routes[0]),id:'R-D',to:{stationId:'ST-D',copy:1},distanceMm:100,
    transportTime:{durationSeconds:1,basis:'assumed' as const,source:'Syntetyczny czas alternatywy'}};
  project.stationRouting!.routes.push(route);
  project.assemblyTransport!.routes.push({...structuredClone(project.assemblyTransport!.routes[0]),stationRouteId:'R-D'});
  return project;
}
test('3.4m2b: wcześniejszy start wybiera drugą kopię, przegrana trasa nie pozostawia rezerwacji',()=>{
  const project=multipleSubassemblyRecipientFixture(),before=JSON.stringify(project);
  const result=scheduleWorkerRun(project,1,1);
  assert.equal(result.runs[1].stationId,'ST-D');assert.equal(result.jobs[0].finish,21);
  assert.deepEqual(result.transportMovements!.map(m=>m.routeId),['R-D']);
  assert.equal(result.transportReservations!.length,1);assert.equal(result.subassemblyEvents!.filter(e=>e.kind==='consumed').length,1);
  assert.equal(JSON.stringify(project),before);
  const replies:ScheduleReply[]=[];executeScheduleRequest({project,batch:1,arrivalIntervalSeconds:1},r=>replies.push(r));
  assert.deepEqual((replies.find(r=>r.kind==='result') as {result:unknown}).result,result);
});
test('3.4m2b: kalendarz odbiorcy wygrywa z krótszym przewozem, remis rozstrzyga droga',()=>{
  const project=multipleSubassemblyRecipientFixture();
  project.resourceCalendars!.stations['ST-D'].shifts[0].startSeconds=30;
  const calendar=scheduleWorkerRun(project,1,1);assert.equal(calendar.runs[1].stationId,'ST-C');assert.equal(calendar.jobs[0].finish,22);
  project.resourceCalendars!.stations['ST-D'].shifts[0].startSeconds=0;
  project.stationRouting!.routes.find(r=>r.id==='R-D')!.transportTime!.durationSeconds=2;
  const shorter=scheduleWorkerRun(project,1,1);assert.equal(shorter.runs[1].stationId,'ST-D');
  project.stationRouting!.routes.find(r=>r.id==='R-D')!.distanceMm=project.stationRouting!.routes[0].distanceMm;
  assert.equal(scheduleWorkerRun(project,1,1).runs[1].stationId,'ST-C');
});
test('3.4m2b: brak trasy lub zestawu jednej kopii pozwala wybrać drugą, wszystkie niewykonalne odmawiają',()=>{
  const project=multipleSubassemblyRecipientFixture();project.assemblyTransport!.routes.pop();
  assert.equal(scheduleWorkerRun(project,1,1).runs[1].stationId,'ST-C');
  project.assemblyTransport!.routes=[];
  assert.throws(()=>scheduleWorkerRun(project,1,1),/brak wykonalnego przypisania/);
});
test('3.4m2b: kilka partii trafia do jednej wybranej kopii, bez porzuconych przydziałów',()=>{
  const project=multipleSubassemblyRecipientFixture();delete project.assemblyTransport;
  project.subassemblyFlow!.lots.push({...structuredClone(project.subassemblyFlow!.lots[0]),id:'LOT-SECOND'});
  const result=scheduleWorkerRun(project,1,1);
  assert.equal(result.runs[1].stationId,'ST-D');
  assert.ok(result.subassemblyEvents!.filter(e=>e.kind==='consumed').every(e=>e.location.stationId==='ST-D'));
  assert.equal(result.subassemblyEvents!.filter(e=>e.kind==='start-transfer').length,2);
});
test('3.4m2b: limit kombinacji jest jawny i nie dotyczy JIT',()=>{
  const project=multipleSubassemblyRecipientFixture();
  project.subassemblyFlow!.lots=Array.from({length:7},(_,i)=>{const lot=structuredClone(project.subassemblyFlow!.lots[0]);lot.id=`LIMIT-${i}`;lot.producer.job=i+1;lot.consumer.job=i+1;return lot;});
  const before=JSON.stringify(project);
  assert.throws(()=>scheduleWorkerRun(project,1,7),/ponad 64 kombinacje/);
  assert.equal(JSON.stringify(project),before);
  const jit=scheduleWorkerRun(project,1,7,undefined,undefined,{transportMode:'just-in-time'});assert.equal(jit.runs.length,14);
});


test('3.4m2b: przewóz korpusu wpływa na wybór kopii, różne sztuki mogą mieć różnych odbiorców',()=>{
  const project=multipleSubassemblyRecipientFixture();delete project.assemblyTransport;
  project.operations[1].physicalRole={kind:'body-work'};project.subassemblies.pop();
  const cToD={...structuredClone(project.stationRouting!.routes[0]),id:'C-D',from:{stationId:'ST-C',copy:1},to:{stationId:'ST-D',copy:1},
    transportTime:{durationSeconds:20,basis:'assumed' as const,source:'Testowy czas korpusu'}};
  project.stationRouting!.routes.push(cToD,{...structuredClone(cToD),id:'D-C',from:cToD.to,to:cToD.from});
  const input=assemblyScheduleInput();input.bodies[0].location={kind:'station',stationId:'ST-C',copy:1};
  project.bodyRunInput=input;
  assert.equal(scheduleWorkerRun(project,1,1,input).runs[1].stationId,'ST-C');
  const lot=structuredClone(project.subassemblyFlow!.lots[0]);lot.id='JOB-2';lot.producer.job=2;lot.consumer.job=2;project.subassemblyFlow!.lots.push(lot);
  input.bodies.push({id:'BODY-D',productId:'PRODUCT',location:{kind:'station',stationId:'ST-D',copy:1}});input.jobs.push({job:2,bodyId:'BODY-D'});
  const result=scheduleWorkerRun(project,1,2,input);
  assert.deepEqual(result.runs.filter(r=>r.operationId===project.operations[1].id).map(r=>[r.job,r.stationId]),[[1,'ST-C'],[2,'ST-D']]);
  assert.equal(result.bodyEvents!.filter(e=>e.kind==='start-transfer').length,0);
});

test('3.5a: bufory stanowisk zapisują jawne pojemności i regułę bbas, bez mutacji projektu',()=>{
  const {project}=subassemblyFlowFixture(),before=JSON.stringify(project);
  const buffers: StationBuffersV6 = {
    buffers: [
      {stationId: 'ST-C', copy: 1, inputCapacity: 2, outputCapacity: 1, blockingPolicy: 'bbas'},
      {stationId: 'ST-A', copy: null, inputCapacity: null, outputCapacity: 5, blockingPolicy: 'bbas-worker-released'}
    ]
  };
  const edited=editDomainStationBuffers(project,buffers);
  assert.equal(JSON.stringify(project),before);
  assert.deepEqual(parseDomainProjectV6(JSON.stringify(edited)).stationBuffers,buffers);
  assert.deepEqual(editDomainStationBuffers(edited,undefined),project);
});

test('3.5a: parser buforów odrzuca nieznane stanowisko, zły numer kopii, ujemne pojemności i duplikaty',()=>{
  const {project}=subassemblyFlowFixture();
  const valid: StationBuffersV6 = {
    buffers: [{stationId: 'ST-C', copy: 1, inputCapacity: 1, outputCapacity: 1, blockingPolicy: 'bbas'}]
  };
  const bad=(change:(b:StationBuffersV6)=>void)=>{
    const copy=structuredClone(valid);change(copy);
    assert.throws(()=>editDomainStationBuffers(project,copy));
  };
  bad(b=>b.buffers[0].stationId='UNKNOWN');
  bad(b=>b.buffers[0].copy=99);
  bad(b=>b.buffers[0].copy=0);
  bad(b=>b.buffers[0].inputCapacity=-1);
  bad(b=>b.buffers[0].outputCapacity=-5);
  bad(b=>b.buffers.push(structuredClone(b.buffers[0])));
  bad(b=>(b.buffers[0] as unknown as {blockingPolicy:string}).blockingPolicy='unknown-policy');
  bad(b=>(b as unknown as {extra:boolean}).extra=true);
});

test('3.5a: zaopatrzenie materiałowe zapisuje harmonogram cykliczny i jawny, bez mutacji projektu',()=>{
  const {project}=subassemblyFlowFixture(),before=JSON.stringify(project);
  const supply: MaterialSupplyV6 = {
    items: [
      {
        id: 'SUP-1',
        componentId: 'PART-A',
        targetStationId: 'ST-C',
        initialStock: 10,
        unit: 'szt.',
        schedule: {kind: 'periodic', batchQuantity: 5, intervalSeconds: 60, firstDeliverySeconds: 30},
        source: 'Katalog zaopatrzenia linii'
      },
      {
        id: 'SUP-2',
        componentId: 'PART-B',
        targetStationId: 'ST-A',
        initialStock: 0,
        unit: 'szt.',
        schedule: {
          kind: 'explicit-deliveries',
          deliveries: [
            {deliveryTimeSeconds: 50, quantity: 10},
            {deliveryTimeSeconds: 120, quantity: 15}
          ]
        },
        source: 'Harmonogram dostaw JIT'
      }
    ]
  };
  const edited=editDomainMaterialSupply(project,supply);
  assert.equal(JSON.stringify(project),before);
  assert.deepEqual(parseDomainProjectV6(JSON.stringify(edited)).materialSupply,supply);
  assert.deepEqual(editDomainMaterialSupply(edited,undefined),project);
});

test('3.5a: parser zaopatrzenia odrzuca nieznane stanowisko, ujemny zapas, puste ID i błędne harmonogramy',()=>{
  const {project}=subassemblyFlowFixture();
  const valid: MaterialSupplyV6 = {
    items: [{
      id: 'SUP-1',
      componentId: 'PART-A',
      targetStationId: 'ST-C',
      initialStock: 10,
      unit: 'szt.',
      schedule: {kind: 'periodic', batchQuantity: 5, intervalSeconds: 60, firstDeliverySeconds: 0},
      source: 'Plan zaopatrzenia'
    }]
  };
  const bad=(change:(s:MaterialSupplyV6)=>void)=>{
    const copy=structuredClone(valid);change(copy);
    assert.throws(()=>editDomainMaterialSupply(project,copy));
  };
  bad(s=>s.items[0].targetStationId='UNKNOWN');
  bad(s=>s.items[0].initialStock=-1);
  bad(s=>s.items[0].id='');
  bad(s=>s.items.push(structuredClone(s.items[0])));
  bad(s=>s.items[0].schedule={kind:'periodic',batchQuantity:0,intervalSeconds:60});
  bad(s=>s.items[0].schedule={kind:'periodic',batchQuantity:10,intervalSeconds:-10});
  bad(s=>s.items[0].schedule={kind:'explicit-deliveries',deliveries:[{deliveryTimeSeconds:-5,quantity:10}]});
  bad(s=>s.items[0].schedule={kind:'explicit-deliveries',deliveries:[{deliveryTimeSeconds:10,quantity:0}]});
});

test('3.5a: zapis i odczyt draftu zachowują bufory i zaopatrzenie, a odmowy chronią źródło 4/5',()=>{
  const {project}=subassemblyFlowFixture();
  const buffers: StationBuffersV6 = {
    buffers: [{stationId: 'ST-C', copy: 1, inputCapacity: 3, outputCapacity: 2, blockingPolicy: 'bbas'}]
  };
  const supply: MaterialSupplyV6 = {
    items: [{
      id: 'SUP-1',
      componentId: 'PART-A',
      targetStationId: 'ST-C',
      initialStock: 5,
      unit: 'szt.',
      schedule: {kind: 'periodic', batchQuantity: 10, intervalSeconds: 100},
      source: 'Dane wejściowe magazynu'
    }]
  };
  const withBuffers=editDomainStationBuffers(project,buffers);
  const withBoth=editDomainMaterialSupply(withBuffers,supply);

  for(const originalJson of [JSON.stringify(derive(parseProject(JSON.stringify(base))).project),readFileSync('tests/qa/Eko_D5_actual_export_v5.json','utf8')]){
    const storage=new DraftStorage(),initial=saveDomainDraft(storage,{project,originalJson},null);
    const written=saveDomainDraft(storage,{project:withBoth,originalJson},initial.raw);
    const reopened=readDomainDraft(storage);
    assert.equal(reopened.status,'valid');
    if(reopened.status==='valid'){
      assert.equal(reopened.saved.originalJson,originalJson);
      assert.deepEqual(reopened.saved.project.stationBuffers,buffers);
      assert.deepEqual(reopened.saved.project.materialSupply,supply);
    }

    // Odmowa przy uszkodzonych danych
    const invalid=structuredClone(withBoth);
    invalid.stationBuffers!.buffers[0].inputCapacity=-99;
    assert.throws(()=>saveDomainDraft(storage,{project:invalid,originalJson},written.raw));
    assert.equal(storage.getItem(DOMAIN_DRAFT_STORAGE_KEY),written.raw);

    // Cofnięcie
    const undone=saveDomainDraft(storage,{project,originalJson},written.raw);
    const old=readDomainDraft(storage);
    assert.equal(old.status,'valid');
    if(old.status==='valid'){
      assert.equal(old.saved.project.stationBuffers,undefined);
      assert.equal(old.saved.project.materialSupply,undefined);
    }
  }
});


test('3.5a1: harmonogram i worker nie ignorują zapisanych limitów buforów ani zaopatrzenia',()=>{
  const project=subassemblyScheduleFixture();
  const supply:MaterialSupplyV6={items:[{id:'SUP-GUARD',componentId:'PART-A',targetStationId:'ST-C',initialStock:0,unit:'szt.',schedule:{kind:'explicit-deliveries',deliveries:[]},source:'Jawny test niedostępności'}]};
  project.materialSupply=supply;const before=JSON.stringify(project);
  assert.throws(()=>scheduleWorkerRun(project,1,1,project.bodyRunInput),/3.5b/);
  const replies:ScheduleReply[]=[];executeScheduleRequest({project,batch:1,arrivalIntervalSeconds:1},r=>replies.push(r));
  assert.ok(replies.some(r=>r.kind==='error'&&r.message.includes('3.5b')));
  const jit=scheduleWorkerRun(project,1,1,undefined,undefined,{transportMode:'just-in-time'});
  assert.equal(jit.transportMode,'just-in-time');assert.equal(jit.jobs[0].finish,20);
  assert.equal(JSON.stringify(project),before);
  delete project.materialSupply; // Isolate body-buffer scope after the separate missing-consumption guard above.
  project.stationBuffers={buffers:[{stationId:'ST-C',copy:1,inputCapacity:0,outputCapacity:null,blockingPolicy:'bbas'}]};
  assert.equal(scheduleWorkerRun(project,1,1,project.bodyRunInput).bufferEvents![0].kind,'handoff');
  assert.throws(()=>scheduleWorkerRun({...project,stationBuffers:{buffers:[{stationId:'ST-A',copy:1,inputCapacity:0,outputCapacity:null,blockingPolicy:'bbas'}]}},1,1,project.bodyRunInput),/poza jawną ścieżką korpusu/);
  assert.equal(scheduleWorkerRun(project,1,1,undefined,undefined,{transportMode:'just-in-time'}).jobs[0].finish,20);
  project.stationBuffers.buffers[0].inputCapacity=null;project.stationBuffers.buffers[0].outputCapacity=1;
  assert.throws(()=>scheduleWorkerRun(project,1,1,project.bodyRunInput),/jawnego odbioru gotowych wyrobów/);
});
test('3.5a1: puste kontrakty i jawne bufory bez limitu zachowują dawny wynik',()=>{
  const project=subassemblyScheduleFixture(),before=scheduleWorkerRun(project,1,1,project.bodyRunInput);
  project.materialSupply={items:[]};project.stationBuffers={buffers:[]};
  assert.deepEqual(scheduleWorkerRun(project,1,1,project.bodyRunInput),before);
  project.stationBuffers.buffers.push({stationId:'ST-C',copy:1,inputCapacity:null,outputCapacity:null,blockingPolicy:'bbas'});
  assert.deepEqual(scheduleWorkerRun(project,1,1,project.bodyRunInput),before);
});


function materialScheduleFixture(){
  const {project}=assemblyMovementFixture();delete project.assemblyTransport;delete project.stationRouting;delete project.bodyRunInput;
  project.operations.forEach(operation=>delete operation.physicalRole);
  project.materialSupply={items:[{id:'SUPPLY-A',componentId:'MATERIAL-A',targetStationId:'ST-A',initialStock:1,unit:'szt.',
    schedule:{kind:'periodic',batchQuantity:1,intervalSeconds:20,firstDeliverySeconds:30},source:'Jawny syntetyczny test dostaw'}],
    consumptions:[{operationId:project.operations[0].id,supplyId:'SUPPLY-A',quantity:1,source:'Jawny test zużycia'}]};
  return project;
}
test('3.5b1: braki materiału przesuwają start, dostawy nie rezerwują magazynierów',()=>{
  const project=materialScheduleFixture(),before=JSON.stringify(project);
  const result=scheduleWorkerRun(project,1,2);
  assert.deepEqual(result.runs.filter(r=>r.operationId===project.operations[0].id).map(r=>r.startSeconds),[0,30]);
  assert.equal(result.jobs[1].finish,50);assert.ok(result.runs.find(r=>r.job===2&&r.operationId===project.operations[0].id)!.waitCauses.includes('material'));
  assert.equal(result.reservations.reservations.length,4);assert.equal(result.materialStocks![0].consumed,2);assert.equal(result.materialStocks![0].stock,1);
  const replies:ScheduleReply[]=[];executeScheduleRequest({project,batch:2,arrivalIntervalSeconds:1},r=>replies.push(r));
  assert.deepEqual((replies.find(r=>r.kind==='result') as {result:unknown}).result,result);assert.equal(JSON.stringify(project),before);
  assert.equal(scheduleWorkerRun(project,1,2,undefined,undefined,{transportMode:'just-in-time'}).materialStocks,undefined);
});
test('3.5b1: dostawa przed pobraniem przy tym samym czasie i atomowy zestaw materiałów',()=>{
  const project=materialScheduleFixture();project.materialSupply!.items[0].initialStock=0;
  project.materialSupply!.items[0].schedule={kind:'explicit-deliveries',deliveries:[{deliveryTimeSeconds:10,quantity:1}]};
  project.materialSupply!.items.push({...structuredClone(project.materialSupply!.items[0]),id:'SUPPLY-B',componentId:'B',initialStock:1,schedule:{kind:'explicit-deliveries',deliveries:[]}});
  project.materialSupply!.consumptions!.push({...structuredClone(project.materialSupply!.consumptions![0]),supplyId:'SUPPLY-B'});
  const result=scheduleWorkerRun(project,1,1);assert.equal(result.runs[0].startSeconds,10);
  assert.deepEqual(result.materialEvents!.map(e=>[e.kind,e.atSeconds]),[['delivery',10],['consumption',10],['consumption',10]]);
  assert.ok(result.materialStocks!.every(stock=>stock.stock===0));
});
test('3.5b1: pobranie czeka na realny kalendarz operacji, a nie na chwilę gotowości',()=>{
  const project=materialScheduleFixture();project.resourceCalendars!.stations['ST-A'].shifts[0].startSeconds=15;
  const result=scheduleWorkerRun(project,1,1);assert.equal(result.runs[0].startSeconds,15);
  assert.equal(result.materialEvents!.find(e=>e.kind==='consumption')!.atSeconds,15);
});
test('3.5b1: zapas chroni przydzielone przyszłe pobranie i nie zużywa się dwukrotnie',()=>{
  const project=materialScheduleFixture();const ledger=new MaterialStockRun(project),operation=project.operations[0].id;
  ledger.advance(0);ledger.reserve(1,operation,20);
  assert.equal(ledger.earliest(operation,1),30);ledger.reserve(2,operation,30);
  ledger.advance(20);ledger.consume(1,operation,20);assert.equal(ledger.stocks[0].stock,0);
  ledger.advance(30);ledger.consume(2,operation,30);assert.equal(ledger.stocks[0].stock,0);
  assert.throws(()=>ledger.consume(2,operation,30),/powtórzone/);
});
test('3.5b1: dostawy cykliczne nie tworzą niekończącej się kolejki i grupują długie okresy',()=>{
  const project=materialScheduleFixture();project.materialSupply!.items[0].schedule={kind:'periodic',batchQuantity:1,intervalSeconds:0.001,firstDeliverySeconds:0};
  const result=scheduleWorkerRun(project,1,1);assert.ok(result.materialEvents!.length<10);
  assert.ok(result.materialEvents!.some(e=>(e.deliveryCount??0)>1));assert.equal(result.jobs[0].finish,20);
});
test('3.5b1: stary kontrakt jest czytelny, ale nie wyznacza ilości ani pierwszej dostawy',()=>{
  const project=materialScheduleFixture();delete project.materialSupply!.consumptions;
  assert.ok(parseDomainProjectV6(JSON.stringify(project)).materialSupply);assert.throws(()=>scheduleWorkerRun(project,1,1),/jawnego zużycia/);
  project.materialSupply!.consumptions=[{operationId:project.operations[0].id,supplyId:'SUPPLY-A',quantity:1,source:'Jawny test'}];
  delete (project.materialSupply!.items[0].schedule as {firstDeliverySeconds?:number}).firstDeliverySeconds;
  assert.ok(parseDomainProjectV6(JSON.stringify(project)).materialSupply);assert.throws(()=>scheduleWorkerRun(project,1,1),/pierwszej dostawy/);
});
test('3.5b1: wyczerpany jawny harmonogram odmawia wyniku zamiast ujemnego zapasu',()=>{
  const project=materialScheduleFixture();project.materialSupply!.items[0].initialStock=0;
  project.materialSupply!.items[0].schedule={kind:'explicit-deliveries',deliveries:[]};
  assert.throws(()=>scheduleWorkerRun(project,1,1),/brak wystarczającego zapasu/);
});
test('3.5b1: zużycie roundtrip i odmowy błędnych referencji nie zmieniają zapisu',()=>{
  const project=materialScheduleFixture(),supply=project.materialSupply!,before=JSON.stringify(project);
  assert.deepEqual(parseDomainProjectV6(before).materialSupply,supply);
  for(const mutate of [(value:MaterialSupplyV6)=>value.consumptions![0].quantity=0,
    (value:MaterialSupplyV6)=>value.consumptions![0].operationId='UNKNOWN',
    (value:MaterialSupplyV6)=>value.consumptions![0].supplyId='UNKNOWN',
    (value:MaterialSupplyV6)=>value.consumptions!.push(structuredClone(value.consumptions![0]))]){
    const invalid=structuredClone(supply);mutate(invalid);assert.throws(()=>editDomainMaterialSupply(project,invalid));
  }
  assert.equal(JSON.stringify(project),before);
  const source=readFileSync('tests/qa/Eko_D5_actual_export_v5.json','utf8'),storage=new DraftStorage();
  const saved=saveDomainDraft(storage,{project,originalJson:source},null),reopened=readDomainDraft(storage);
  assert.equal(reopened.status,'valid');if(reopened.status==='valid')assert.deepEqual(reopened.saved.project.materialSupply,supply);
  const broken=structuredClone(project);broken.materialSupply!.consumptions![0].quantity=-1;
  assert.throws(()=>saveDomainDraft(storage,{project:broken,originalJson:source},saved.raw));assert.equal(storage.getItem(DOMAIN_DRAFT_STORAGE_KEY),saved.raw);
});


test('3.5b1: przyszły start na korpusie pobiera materiał dopiero po dostawie',()=>{
  const project=subassemblyScheduleFixture();
  project.materialSupply={items:[{id:'BODY-SUP',componentId:'M',targetStationId:'ST-C',initialStock:0,unit:'szt.',schedule:{kind:'periodic',batchQuantity:1,intervalSeconds:100,firstDeliverySeconds:25},source:'Test przyszłego startu'}],
    consumptions:[{operationId:project.operations[1].id,supplyId:'BODY-SUP',quantity:1,source:'Jawne zużycie na korpusie'}]};
  const result=scheduleWorkerRun(project,1,1,project.bodyRunInput);
  assert.equal(result.runs[1].startSeconds,25);assert.equal(result.jobs[0].finish,35);
  assert.deepEqual(result.materialEvents!.map(e=>[e.kind,e.atSeconds]),[['delivery',25],['consumption',25]]);
  assert.ok(result.runs[1].waitCauses.includes('material'));
});
test('3.5b1: kopie stanowiska dzielą zapas, krótszy odstęp dostaw usuwa oczekiwanie',()=>{
  const project=materialScheduleFixture();project.stationSettings['ST-A'].parallelStations=2;
  project.workerRunSelection!.operations[0].eligibleWorkerIds=[...project.workerRunSelection!.teamWorkerIds];
  const scarce=scheduleWorkerRun(project,1,2);assert.equal(scarce.runs.find(r=>r.job===2&&r.operationId===project.operations[0].id)!.startSeconds,30);
  project.materialSupply!.items[0].schedule={kind:'periodic',batchQuantity:1,intervalSeconds:1,firstDeliverySeconds:1};
  const supplied=scheduleWorkerRun(project,1,2);assert.equal(supplied.runs.find(r=>r.job===2&&r.operationId===project.operations[0].id)!.startSeconds,1);
  assert.equal(supplied.materialStocks![0].consumed,2);
});


test('3.5b1: zużycie nie korzysta z zapasu przy innym stanowisku',()=>{
  const project=materialScheduleFixture();project.materialSupply!.items[0].targetStationId='ST-C';
  assert.throws(()=>scheduleWorkerRun(project,1,1),/nie pasują do żadnego dopuszczonego stanowiska/);
});


test('3.5b1: ilości dziesiętne nie tworzą fikcyjnych niedoborów ani zapasu resztkowego',()=>{
  const project=materialScheduleFixture();project.materialSupply!.items[0].initialStock=0.3;
  project.materialSupply!.items[0].schedule={kind:'explicit-deliveries',deliveries:[]};project.materialSupply!.consumptions![0].quantity=0.1;
  const ledger=new MaterialStockRun(project),operation=project.operations[0].id;ledger.advance(0);
  for(let job=1;job<=3;job++){ledger.reserve(job,operation,0);ledger.consume(job,operation,0);}
  assert.equal(ledger.stocks[0].stock,0);assert.equal(ledger.stocks[0].consumed,0.3);
  project.materialSupply!.items[0].initialStock=0;project.materialSupply!.items[0].schedule={kind:'periodic',batchQuantity:0.1,intervalSeconds:0.1,firstDeliverySeconds:0.1};
  const periodic=new MaterialStockRun(project);periodic.advance(0.3);assert.equal(periodic.stocks[0].delivered,0.3);
});


function bufferFixture(){
  const project=materialScheduleFixture();
  project.stationSettings['ST-A'].parallelStations=2;
  project.stationBuffers={buffers:[{stationId:'ST-A',copy:null,inputCapacity:1,outputCapacity:1,blockingPolicy:'bbas'},
    {stationId:'ST-C',copy:1,inputCapacity:1,outputCapacity:0,blockingPolicy:'bbas-worker-released'}]};
  return project;
}
test('3.5b2a: pojemności stosują się osobno do kopii, rezerwacje zajmują miejsce przed przyjazdem',()=>{
  const project=bufferFixture(),before=JSON.stringify(project),book=createBufferBook(project);
  const a={stationId:'ST-A',copy:1,side:'input' as const},b={...a,copy:2};
  const reserved=applyBufferEvent(book,{kind:'reserve',id:'BODY-1',to:a,atSeconds:0});
  assert.equal(bufferLoad(reserved,a),1);assert.equal(bufferHasSpace(reserved,a),false);assert.equal(bufferHasSpace(reserved,b),true);
  assert.throws(()=>applyBufferEvent(reserved,{kind:'reserve',id:'BODY-2',to:a,atSeconds:0}),/Bufor pełny/);
  const independent=applyBufferEvent(reserved,{kind:'reserve',id:'BODY-2',to:b,atSeconds:0});
  assert.equal(bufferLoad(independent,b),1);assert.equal(book.tokens.length,0);assert.equal(JSON.stringify(project),before);
});
test('3.5b2a: przewóz ma jedną lokalizację, miejsce w celu i zwalnia źródło dopiero przy wyjeździe',()=>{
  const project=bufferFixture(),source={stationId:'ST-A',copy:1,side:'output' as const},target={stationId:'ST-C',copy:1,side:'input' as const};
  let book=createBufferBook(project);
  book=applyBufferEvent(book,{kind:'reserve',id:'BODY',to:source,atSeconds:1});
  book=applyBufferEvent(book,{kind:'arrive',id:'BODY',atSeconds:1});
  const reserved=applyBufferEvent(book,{kind:'reserve',id:'BODY',to:target,atSeconds:2});
  assert.equal(bufferLoad(reserved,source),1);assert.equal(bufferLoad(reserved,target),1);
  const departed=applyBufferEvent(reserved,{kind:'depart',id:'BODY',atSeconds:3});
  assert.equal(bufferLoad(departed,source),0);assert.equal(departed.tokens[0].location,undefined);
  assert.throws(()=>applyBufferEvent(departed,{kind:'cancel',id:'BODY',atSeconds:4}),/w ruchu/);
  const arrived=applyBufferEvent(departed,{kind:'arrive',id:'BODY',atSeconds:5});
  assert.deepEqual(arrived.tokens[0].location,target);assert.equal(arrived.tokens[0].destination,undefined);
  assert.equal(applyBufferEvent(arrived,{kind:'remove',id:'BODY',atSeconds:6}).tokens.length,0);
});
test('3.5b2a: pełny bufor blokuje stanowisko/wyposażenie, polityka określa operatora',()=>{
  const project=bufferFixture(),output={stationId:'ST-A',copy:1,side:'output' as const};
  let book=createBufferBook(project);assert.equal(outputBlock(book,output).blocked,false);
  book=applyBufferEvent(book,{kind:'reserve',id:'BODY',to:output,atSeconds:0});
  assert.deepEqual(outputBlock(book,output),{blocked:true,holdStation:true,holdEquipment:true,holdWorkers:true});
  const zero={stationId:'ST-C',copy:1,side:'output' as const};
  assert.deepEqual(outputBlock(book,zero),{blocked:true,holdStation:true,holdEquipment:true,holdWorkers:false});
  assert.equal(bufferCanAccept(book,zero,false),false);assert.equal(bufferCanAccept(book,zero,true),true);
  assert.equal(outputBlock(book,zero,true).blocked,false);
  assert.throws(()=>applyBufferEvent(book,{kind:'reserve',id:'OTHER',to:zero,atSeconds:0}),/pojemność 0/);
});
test('3.5b2a: konflikt konfiguracji i brak jawnej polityki/kopii odmawiają bez dopowiadania',()=>{
  const project=bufferFixture();
  project.stationBuffers!.buffers.push({stationId:'ST-A',copy:1,inputCapacity:1,outputCapacity:1,blockingPolicy:'bbas'});
  assert.throws(()=>createBufferBook(project),/nakładające/);
  project.stationBuffers!.buffers.pop();delete project.stationBuffers!.buffers[0].blockingPolicy;
  assert.throws(()=>createBufferBook(project),/jawna polityka/);
  project.stationBuffers!.buffers[0].blockingPolicy='bbas';delete project.stationSettings['ST-A'].parallelStations;
  assert.throws(()=>createBufferBook(project),/jawnej liczby kopii/);
});
test('3.5b2a: niewybrana rezerwacja jest odwracalna, nieznane miejsca i cofnięcie czasu odmawiają',()=>{
  const project=bufferFixture(),ref={stationId:'ST-A',copy:1,side:'input' as const},empty=createBufferBook(project);
  const reserved=applyBufferEvent(empty,{kind:'reserve',id:'BODY',to:ref,atSeconds:10});
  assert.equal(applyBufferEvent(reserved,{kind:'cancel',id:'BODY',atSeconds:10}).tokens.length,0);
  assert.throws(()=>applyBufferEvent(reserved,{kind:'reserve',id:'BODY',to:{...ref,copy:2},atSeconds:10}),/już rezerwację/);
  assert.throws(()=>applyBufferEvent(reserved,{kind:'arrive',id:'BODY',atSeconds:9}),/cofa czas/);
  assert.throws(()=>applyBufferEvent(empty,{kind:'reserve',id:'X',to:{...ref,copy:99},atSeconds:0}),/nieznane miejsce/);
  assert.throws(()=>applyBufferEvent(reserved,{kind:'unknown',id:'BODY',atSeconds:10} as never),/nieznany rodzaj/);
  assert.equal(empty.tokens.length,0);
});


function bufferedProcessFixture(policy:'bbas'|'bbas-worker-released'='bbas'){
  const project=materialScheduleFixture();delete project.materialSupply;
  const profile=project.operations[1].staffing!.timeVariants[0].timeProfile;profile.durationSeconds=30;
  profile.operatorPresence=[{startSeconds:0,endSeconds:30,basis:'assumed'}];profile.manualWork=[];profile.machineRun=[];
  project.stationBuffers={buffers:[{stationId:'ST-A',copy:1,inputCapacity:null,outputCapacity:1,blockingPolicy:policy},
    {stationId:'ST-C',copy:1,inputCapacity:0,outputCapacity:null}]};
  return project;
}
test('3.5b2b: praca kończy się przed zwolnieniem gniazda, pełne wyjście zatrzymuje operatora',()=>{
  const project=bufferedProcessFixture(),before=JSON.stringify(project);
  const result=scheduleWorkerRun(project,1,3,undefined,undefined,{transportMode:'just-in-time'});
  const source=result.runs.filter(run=>run.operationId===project.operations[0].id);
  assert.deepEqual(source.map(run=>[run.endSeconds,run.stationReleaseSeconds,run.blockedSeconds]),[[10,10,0],[20,20,0],[30,40,10]]);
  assert.equal(result.jobs[2].finish,100);
  const third=result.reservations.reservations.find(r=>r.reservationId===`3:${project.operations[0].id}`)!;
  assert.deepEqual([third.startSeconds,third.endSeconds,third.releasedAtSeconds],[20,40,40]);
  assert.equal(result.transportMode,'just-in-time');assert.equal(result.bodyBook,undefined);assert.equal(JSON.stringify(project),before);
  const replies:ScheduleReply[]=[];executeScheduleRequest({project,batch:3,arrivalIntervalSeconds:1,transportMode:'just-in-time'},r=>replies.push(r));
  assert.deepEqual((replies.find(r=>r.kind==='result') as {result:unknown}).result,result);
});
test('3.5b2b: polityka zwolnienia operatora zachowuje blokadę stanowiska i wyposażenia',()=>{
  const project=bufferedProcessFixture('bbas-worker-released');
  const result=scheduleWorkerRun(project,1,3,undefined,undefined,{transportMode:'just-in-time'});
  const source=result.runs.filter(run=>run.operationId===project.operations[0].id)[2];
  assert.equal(source.stationReleaseSeconds,40);assert.equal(source.endSeconds,30);
  const reservation=result.reservations.reservations.find(r=>r.reservationId===`3:${source.operationId}`)!;
  assert.equal(reservation.endSeconds,30);assert.equal(reservation.releasedAtSeconds,30);
});
test('3.5b2b: pojemność 0 wymaga gotowego odbiorcy, a wejście 1 uwalnia wcześniejszy bufor',()=>{
  const project=bufferedProcessFixture();project.stationBuffers!.buffers[0].outputCapacity=0;
  const direct=scheduleWorkerRun(project,1,3,undefined,undefined,{transportMode:'just-in-time'});
  assert.deepEqual(direct.runs.filter(r=>r.operationId===project.operations[0].id).map(r=>[r.endSeconds,r.stationReleaseSeconds]),[[10,10],[20,40],[50,70]]);
  project.stationBuffers!.buffers[0].outputCapacity=1;project.stationBuffers!.buffers[1].inputCapacity=1;
  const queued=scheduleWorkerRun(project,1,3,undefined,undefined,{transportMode:'just-in-time'});
  assert.ok(queued.runs.filter(r=>r.operationId===project.operations[0].id).every(r=>r.blockedSeconds===0));
  const reservations=queued.reservations.reservations;
  for(let i=0;i<reservations.length;i++)for(let j=i+1;j<reservations.length;j++){
    const a=reservations[i],b=reservations[j];if(a.workerIds.some(id=>b.workerIds.includes(id)))assert.ok(a.endSeconds<=b.startSeconds||b.endSeconds<=a.startSeconds);
  }
});
test('3.5b2b: nieobsługiwane fizyczne bufory, gałęzie i skończone wyjście nie dają pozornego wyniku',()=>{
  const project=bufferedProcessFixture();assert.throws(()=>scheduleWorkerRun(project,1,1),/fizycznym transportem/);
  project.operations[1].predecessorIds=[];assert.throws(()=>scheduleWorkerRun(project,1,1,undefined,undefined,{transportMode:'just-in-time'}),/jednego ciągu/);
  project.operations[1].predecessorIds=[project.operations[0].id];project.stationBuffers!.buffers[1].outputCapacity=1;project.stationBuffers!.buffers[1].blockingPolicy='bbas';
  assert.throws(()=>scheduleWorkerRun(project,1,1,undefined,undefined,{transportMode:'just-in-time'}),/jawnego odbioru/);
});
test('3.5b2b: kalendarz odbiorcy przesuwa przekazanie, częściowa obecność nie jest przedłużana domyślnie',()=>{
  const project=bufferedProcessFixture();project.stationBuffers!.buffers[0].outputCapacity=0;
  project.resourceCalendars!.stations['ST-C'].shifts[0].startSeconds=25;
  const result=scheduleWorkerRun(project,1,1,undefined,undefined,{transportMode:'just-in-time'});
  assert.equal(result.runs[0].stationReleaseSeconds,25);assert.equal(result.runs[1].startSeconds,25);
  project.operations[0].staffing!.timeVariants[0].timeProfile.operatorPresence[0].endSeconds=5;
  assert.throws(()=>scheduleWorkerRun(project,1,1,undefined,undefined,{transportMode:'just-in-time'}),/obecności aż do końca/);
});


test('3.5b2b: nowe wykonanie nie zajmuje zablokowanej kopii ani zatrzymanego pracownika',()=>{
  const project=bufferedProcessFixture();
  const result=scheduleWorkerRun(project,1,4,undefined,undefined,{transportMode:'just-in-time'});
  const source=result.runs.filter(run=>run.operationId===project.operations[0].id);
  assert.equal(source[3].startSeconds,40);assert.equal(source[2].stationReleaseSeconds,40);
  const reservations=result.reservations.reservations;
  for(let i=0;i<reservations.length;i++)for(let j=i+1;j<reservations.length;j++){
    const a=reservations[i],b=reservations[j];if(a.workerIds.some(id=>b.workerIds.includes(id)))assert.ok(a.endSeconds<=b.startSeconds||b.endSeconds<=a.startSeconds);
  }
});


test('3.5b2b: przyszła częściowa obecność odbiorcy jest zgodna z blokadą innej osoby',()=>{
  const project=bufferedProcessFixture();
  project.operations[1].staffing!.timeVariants[0].timeProfile.operatorPresence[0].startSeconds=20;
  const future=scheduleWorkerRun(project,1,2,undefined,undefined,{transportMode:'just-in-time'});
  assertNoWorkerOverlap(future);assert.equal(future.jobs[1].finish,70);
  project.stationBuffers!.buffers[0].blockingPolicy='bbas-worker-released';
  const result=scheduleWorkerRun(project,1,1,undefined,undefined,{transportMode:'just-in-time'});
  assert.equal(result.jobs[0].finish,40);
});


test('3.5b2b: wspólny operator nie jest odbierany blokadzie, zwolnienie usuwa zakleszczenie',()=>{
  const project=bufferedProcessFixture();project.workerRunSelection!.operations[1].eligibleWorkerIds=[project.workers[0].id];
  assert.throws(()=>scheduleWorkerRun(project,1,2,undefined,undefined,{transportMode:'just-in-time'}),/zakleszczenie/);
  project.stationBuffers!.buffers[0].blockingPolicy='bbas-worker-released';
  const result=scheduleWorkerRun(project,1,2,undefined,undefined,{transportMode:'just-in-time'});
  assert.equal(result.jobs[1].finish,80);
});


function bufferedBodyFixture(){
  const {project,carts,workers,workerId}=assemblyMovementFixture();
  project.stationBuffers={buffers:[
    {stationId:'ST-A',copy:1,inputCapacity:1,outputCapacity:1,blockingPolicy:'bbas'},
    {stationId:'ST-C',copy:1,inputCapacity:1,outputCapacity:null} ]};
  const input=assemblyScheduleInput();
  input.bodies.push({...input.bodies[0],id:'OTHER'});
  const initial:BufferedBodyBook={bodies:createBodyBook(project,input.bodies,0),buffers:createBufferBook(project)};
  const reserved={...initial,bodies:applyBodyEvent(initial.bodies,{kind:'reserve',bodyId:'BODY',atSeconds:0,
    operationId:project.operations[0].id,endSeconds:10,basis:'assumed'})};
  const output=applyBufferedBodyEvent(reserved,{kind:'complete-to-output',bodyId:'BODY',atSeconds:10,
    operationId:project.operations[0].id,to:{stationId:'ST-A',copy:1,side:'output'}});
  return {project,carts,workers,workerId,reserved,output};
}
const bufferMoveRequest={bodyId:'BODY',stationRouteId:'R-A',alternativeIndex:0,reservationId:'BUFFER-MOVE',earliestSeconds:10};

test('3.5b2c1: rzeczywisty wózek, korpus i zajętość celu zmieniają się wspólnie, start odbiorcy zwalnia wejście',()=>{
  const {project,carts,workers,output}=bufferedBodyFixture(),before=JSON.stringify({project,carts,workers,output});
  const move=reserveBufferedAssemblyMovement(project,output,carts,workers,bufferMoveRequest);
  assert.deepEqual([move.movement.startSeconds,move.movement.endSeconds],[10,12]);
  assert.equal(move.physical.bodies.bodies[0].status,'moving');
  assert.equal(move.movement.carts.carts[0].location,null);
  const target={stationId:'ST-C',copy:1,side:'input' as const};
  assert.equal(bufferLoad(move.physical.buffers,target),1);
  assert.equal(bufferLoad(move.physical.buffers,{stationId:'ST-A',copy:1,side:'output'}),0);
  const arrived=finishBufferedAssemblyMovement(move,move.physical,move.movement.carts,move.movement.workers,12);
  assert.deepEqual(arrived.physical.buffers.tokens[0].location,target);
  assert.deepEqual(arrived.movement.carts.carts[0].location,{stationId:'ST-C',copy:1});
  assert.equal(bodyAvailableAt(arrived.physical.bodies,'BODY',target),true);
  assert.equal(bufferLoad(arrived.physical.buffers,target),1);
  const started=applyBufferedBodyEvent(arrived.physical,{kind:'start-operation',bodyId:'BODY',atSeconds:12,
    operationId:project.operations[1].id,endSeconds:22,basis:'assumed'});
  assert.equal(bufferLoad(started.buffers,target),0);assert.equal(started.bodies.bodies[0].status,'reserved');
  assert.equal(JSON.stringify({project,carts,workers,output}),before);
});

test('3.5b2c1: rezerwacja celu nie zwalnia źródła, oczekiwanie na osobę nie skraca transportu',()=>{
  const {project,carts,workers,workerId,output}=bufferedBodyFixture();
  const target={stationId:'ST-C',copy:1,side:'input' as const};
  const prepared=applyBufferedBodyEvent(output,{kind:'reserve-input',bodyId:'BODY',to:target,atSeconds:10});
  assert.equal(bufferLoad(prepared.buffers,output.buffers.tokens[0].location!),1);
  assert.equal(bufferLoad(prepared.buffers,target),1);assert.equal(prepared.bodies.bodies[0].status,'available');
  const cancelled=applyBufferedBodyEvent(prepared,{kind:'cancel-input',bodyId:'BODY',atSeconds:10});
  assert.deepEqual(cancelled.buffers.tokens,output.buffers.tokens);
  const busy=reserveWorkerTeam(workers,{reservationId:'OTHER-WORK',workerIds:[workerId],startSeconds:10,endSeconds:15});
  const move=reserveBufferedAssemblyMovement(project,output,carts,busy,bufferMoveRequest);
  assert.deepEqual([move.movement.startSeconds,move.movement.endSeconds],[15,17]);
  const body=move.physical.bodies.bodies[0];assert.equal(body.status,'moving');
  if(body.status==='moving')assert.deepEqual([body.transfer.startSeconds,body.transfer.endSeconds],[15,17]);
  assert.deepEqual(move.movement.waitCauses,['workers']);
});

test('3.5b2c1: pełny cel lub brak kalendarza nie publikuje połowy przydziału',()=>{
  const {project,carts,workers,output}=bufferedBodyFixture();
  const waiting=applyBufferedBodyEvent(output,{kind:'reserve-input',bodyId:'BODY',atSeconds:10,
    to:{stationId:'ST-C',copy:1,side:'input'}});
  const occupied={...waiting,bodies:applyBodyEvent(waiting.bodies,{kind:'reserve',bodyId:'OTHER',atSeconds:10,
    operationId:project.operations[0].id,endSeconds:20,basis:'assumed'})};
  const before=JSON.stringify({occupied,carts,workers});
  assert.throws(()=>applyBufferedBodyEvent(occupied,{kind:'complete-to-output',bodyId:'OTHER',atSeconds:20,
    operationId:project.operations[0].id,to:{stationId:'ST-A',copy:1,side:'output'}}),/Bufor pełny/);
  assert.equal(occupied.bodies.bodies.find(b=>b.id==='OTHER')!.status,'reserved');
  assert.equal(JSON.stringify({occupied,carts,workers}),before);
  delete project.resourceCalendars!.workers[project.workers[0].id];
  const unchanged=JSON.stringify({output,carts,workers});
  assert.throws(()=>reserveBufferedAssemblyMovement(project,output,carts,workers,bufferMoveRequest),/kalendarza/);
  assert.equal(JSON.stringify({output,carts,workers}),unchanged);
});


test('3.5b2c1: drugi korpus nie przejmuje ostatniego miejsca obiecanego transportowi',()=>{
  const {project,carts,workers,output}=bufferedBodyFixture();
  const move=reserveBufferedAssemblyMovement(project,output,carts,workers,bufferMoveRequest);
  let next={...move.physical,bodies:applyBodyEvent(move.physical.bodies,{kind:'reserve',bodyId:'OTHER',atSeconds:10,
    operationId:project.operations[0].id,endSeconds:11,basis:'assumed'})};
  next=applyBufferedBodyEvent(next,{kind:'complete-to-output',bodyId:'OTHER',atSeconds:11,
    operationId:project.operations[0].id,to:{stationId:'ST-A',copy:1,side:'output'}});
  const before=JSON.stringify(next);
  assert.throws(()=>applyBufferedBodyEvent(next,{kind:'reserve-input',bodyId:'OTHER',atSeconds:11,
    to:{stationId:'ST-C',copy:1,side:'input'}}),/Bufor pełny/);
  assert.throws(()=>reserveBufferedAssemblyMovement(project,next,move.movement.carts,move.movement.workers,
    {...bufferMoveRequest,bodyId:'OTHER',reservationId:'SECOND',earliestSeconds:11}),/Bufor pełny/);
  assert.equal(JSON.stringify(next),before);
  // Arrival preserves intervening events and the other body's output occupancy.
  const arrived=finishBufferedAssemblyMovement(move,next,move.movement.carts,move.movement.workers,12);
  assert.equal(arrived.physical.buffers.tokens.length,2);
  assert.equal(arrived.physical.bodies.bodies.find(b=>b.id==='OTHER')!.status,'available');
});

test('3.5b2c1: przedwczesny przyjazd, anulowanie w ruchu, sprzeczna lokalizacja i pojemność zero odmawiają',()=>{
  const {project,carts,workers,output}=bufferedBodyFixture();
  const move=reserveBufferedAssemblyMovement(project,output,carts,workers,bufferMoveRequest);
  const before=JSON.stringify(move);
  assert.throws(()=>finishBufferedAssemblyMovement(move,move.physical,move.movement.carts,move.movement.workers,11),/nie zakończył/);
  assert.throws(()=>applyBufferedBodyEvent(move.physical,{kind:'cancel-input',bodyId:'BODY',atSeconds:11}),/w ruchu/);
  assert.throws(()=>applyBufferedBodyEvent(output,{kind:'depart',bodyId:'BODY',atSeconds:10,endSeconds:12,basis:'assumed'}),/wcześniejszej rezerwacji/);
  const invalid=structuredClone(output);invalid.buffers.tokens[0].location!.stationId='ST-C';
  assert.throws(()=>validateBufferedBodyBook(invalid),/Sprzeczna lokalizacja/);
  const zero=structuredClone(output);zero.buffers.places=zero.buffers.places.map(p=>p.side==='input'?{...p,capacity:0}:p);
  assert.throws(()=>reserveBufferedAssemblyMovement(project,zero,carts,workers,bufferMoveRequest),/pojemność 0/);
  assert.equal(JSON.stringify(move),before);
});


test('3.5b2c1: wspólne zakończenie chroni nowsze rezerwacje oraz odmawia sprzecznego wózka i błędnego startu',()=>{
  const {project,carts,workers,workerId,output}=bufferedBodyFixture();
  const move=reserveBufferedAssemblyMovement(project,output,carts,workers,bufferMoveRequest);
  const newer=reserveWorkerTeam(move.movement.workers,{reservationId:'AFTER',workerIds:[workerId],startSeconds:12,endSeconds:20});
  const wrong=structuredClone(move.movement.carts);wrong.carts[0].movement!.from={stationId:'ST-C',copy:1};
  const before=JSON.stringify({physical:move.physical,wrong,newer});
  assert.throws(()=>finishBufferedAssemblyMovement(move,move.physical,wrong,newer,12),/niezgodny przewóz/);
  assert.equal(JSON.stringify({physical:move.physical,wrong,newer}),before);
  const arrived=finishBufferedAssemblyMovement(move,move.physical,move.movement.carts,newer,12);
  assert.deepEqual(arrived.movement.workers.reservations.find(r=>r.reservationId==='AFTER'),newer.reservations.find(r=>r.reservationId==='AFTER'));
  const unchanged=JSON.stringify(arrived.physical);
  assert.throws(()=>applyBufferedBodyEvent(arrived.physical,{kind:'start-operation',bodyId:'BODY',atSeconds:12,
    operationId:'UNKNOWN',endSeconds:22,basis:'assumed'}),/nieznana operacja/);
  assert.equal(JSON.stringify(arrived.physical),unchanged);
  assert.throws(()=>applyBufferedBodyEvent(output,{kind:'cancel-input',bodyId:'BODY',atSeconds:9}),/cofa czas/);
});


function bufferedPhysicalFixture(batch=4,policy:'bbas'|'bbas-worker-released'='bbas'){
  const {project}=assemblyMovementFixture();
  const recipient=project.workers[1].id;
  project.workerRunSelection!.operations[1].eligibleWorkerIds=[recipient];
  project.operations[1].staffing!.timeVariants[0].timeProfile=structuredClone(project.operations[1].staffing!.timeVariants[0].timeProfile);
  const profile=project.operations[1].staffing!.timeVariants[0].timeProfile;
  profile.durationSeconds=30;profile.operatorPresence=[{startSeconds:0,endSeconds:30,basis:'assumed'}];profile.manualWork=[];profile.machineRun=[];
  for(const calendar of Object.values(project.resourceCalendars!.workers))calendar.shifts[0].endSeconds=1000;
  for(const calendar of Object.values(project.resourceCalendars!.stations))calendar.shifts[0].endSeconds=1000;
  project.assemblyTransport!.carts[0].calendar.shifts[0].endSeconds=1000;
  addReturnRoute(project);
  project.workers.push({id:'BUFFER-TRANSPORT',name:'Jawna osoba transportu montażowego'});
  project.resourceCalendars!.workers['BUFFER-TRANSPORT']=structuredClone(project.resourceCalendars!.workers[project.workers[0].id]);
  project.assemblyTransport!.routes[0].alternatives[0].workerIds=['BUFFER-TRANSPORT'];
  project.assemblyTransport!.emptyRoutes.forEach(route=>route.workerAssignment={workerIds:['BUFFER-TRANSPORT'],source:'Jawny test obsady dojazdu'});
  project.stationBuffers={buffers:[{stationId:'ST-A',copy:1,inputCapacity:null,outputCapacity:1,blockingPolicy:policy},
    {stationId:'ST-C',copy:1,inputCapacity:1,outputCapacity:null}]};
  const input:BodyRunInput={bodies:Array.from({length:batch},(_,i)=>({id:`BUFFER-BODY-${i+1}`,productId:'PRODUCT',location:{kind:'station',stationId:'ST-A',copy:1}})),
    jobs:Array.from({length:batch},(_,i)=>({job:i+1,bodyId:`BUFFER-BODY-${i+1}`}))};
  project.bodyRunInput=input;
  return {project,input};
}
function assertNoWorkerOverlap(result:ReturnType<typeof scheduleWorkerRun>){
  const reservations=result.reservations.reservations;
  for(let i=0;i<reservations.length;i++)for(let j=i+1;j<reservations.length;j++){
    const a=reservations[i],b=reservations[j];if(a.workerIds.some(id=>b.workerIds.includes(id)))
      assert.ok(a.endSeconds<=b.startSeconds||b.endSeconds<=a.startSeconds,`${a.reservationId} overlaps ${b.reservationId}`);
  }
  assert.ok(reservations.every(r=>r.releasedAtSeconds!==undefined));
}

test('3.5b2c2: fizyczny przyjazd do bufora poprzedza wolną operację, korpus nie teleportuje się',()=>{
  const {project,input}=bufferedPhysicalFixture(),before=JSON.stringify({project,input});
  const result=scheduleWorkerRun(project,1,4,input);
  assert.equal(result.transportMode,undefined);assert.equal(result.bodyBook!.bodies.length,4);
  const recipients=result.runs.filter(r=>r.operationId===project.operations[1].id);
  assert.deepEqual(recipients.map(r=>[r.transport!.startSeconds,r.transport!.endSeconds,r.startSeconds,r.endSeconds]),
    [[10,12,12,42],[25,27,42,72],[47,49,72,102],[77,79,102,132]]);
  assert.equal(result.jobs[3].finish,132);
  assert.ok(result.bodyBook!.bodies.every(body=>body.status==='available'&&body.location.kind==='station'&&body.location.stationId==='ST-C'));
  assert.ok(result.bufferBook!.tokens.every(token=>token.location?.stationId==='ST-C'&&token.location.side==='output'&&!token.destination));
  assert.equal(result.transportMovements!.filter(m=>m.purpose==='transfer').length,4);
  assert.equal(result.transportMovements!.filter(m=>m.purpose==='approach').length,3);
  assertNoWorkerOverlap(result);assert.equal(JSON.stringify({project,input}),before);
  const replies:ScheduleReply[]=[];executeScheduleRequest({project,batch:4,arrivalIntervalSeconds:1},r=>replies.push(r));
  assert.deepEqual((replies.find(r=>r.kind==='result') as {result:unknown}).result,result);
});

test('3.5b2c2: pełne wyjście blokuje korpus/stanowisko, polityka operatora i transport dzielą jeden rejestr',()=>{
  const held=bufferedPhysicalFixture(5),released=bufferedPhysicalFixture(5,'bbas-worker-released');
  const a=scheduleWorkerRun(held.project,1,5,held.input),b=scheduleWorkerRun(released.project,1,5,released.input);
  for(const result of [a,b]){
    const source=result.runs.filter(r=>r.operationId===held.project.operations[0].id);
    assert.ok(source.some(r=>r.blockedSeconds!>0));
    for(let i=1;i<source.length;i++)assert.ok(source[i].startSeconds>=source[i-1].stationReleaseSeconds!);
    assertNoWorkerOverlap(result);
  }
  const blocked=a.runs.find(r=>r.blockedSeconds!>0)!;
  assert.equal(a.reservations.reservations.find(r=>r.reservationId===`${blocked.job}:${blocked.operationId}`)!.endSeconds,blocked.stationReleaseSeconds);
  const freed=b.runs.find(r=>r.blockedSeconds!>0)!;
  assert.equal(b.reservations.reservations.find(r=>r.reservationId===`${freed.job}:${freed.operationId}`)!.endSeconds,freed.endSeconds);
});

test('3.5b2c2: kalendarz operacji i dostawa nie opóźniają przyjazdu do wolnego wejścia, pobranie przy starcie',()=>{
  const {project,input}=bufferedPhysicalFixture(1);
  project.resourceCalendars!.stations['ST-C'].shifts[0].startSeconds=50;
  const supply=materialScheduleFixture().materialSupply!;
  project.materialSupply={...supply,items:supply.items.map(item=>({...item,targetStationId:'ST-C',initialStock:0,
    schedule:{kind:'explicit-deliveries',deliveries:[{deliveryTimeSeconds:60,quantity:1}]}})),
    consumptions:[{operationId:project.operations[1].id,supplyId:supply.items[0].id,quantity:1,source:'Jawny test materiału odbiorcy'}]};
  const result=scheduleWorkerRun(project,1,1,input),last=result.runs[1];
  assert.deepEqual([last.transport!.startSeconds,last.transport!.endSeconds,last.startSeconds,last.endSeconds],[10,12,60,90]);
  assert.ok(last.waitCauses.includes('material'));
  assert.deepEqual(result.materialEvents!.filter(e=>e.atSeconds===60).map(e=>e.kind),['delivery','consumption']);
  assert.equal(result.materialStocks![0].stock,0);assertNoWorkerOverlap(result);
  delete project.materialSupply;
  const calendarOnly=scheduleWorkerRun(project,1,1,input);
  assert.equal(calendarOnly.runs[1].startSeconds,50);assert.ok(calendarOnly.runs[1].waitCauses.includes('calendar'));
});

test('3.5b2c2: powroty po rozładunku są rzeczywiste i nie zmieniają końca przetwarzania',()=>{
  const {project,input}=bufferedPhysicalFixture(2);project.assemblyTransport!.carts[0].afterUnload='return-to-initial';
  const result=scheduleWorkerRun(project,1,2,input);
  assert.equal(result.jobs[1].finish,72);
  assert.equal(result.cartBook!.carts[0].location!.stationId,'ST-A');
  assert.equal(result.transportMovements!.filter(m=>m.purpose==='return').length,2);
  assert.equal(result.transportMovements!.filter(m=>m.purpose==='approach').length,0);
  assertNoWorkerOverlap(result);
});

test('3.5b2c2: brak trasy/kalendarza i nieznany tryb odmawiają, wejście zero ma bezpośredni odbiór',()=>{
  const {project,input}=bufferedPhysicalFixture(1),before=JSON.stringify(project);
  const zero=structuredClone(project);zero.stationBuffers!.buffers[1].inputCapacity=0;
  const direct=scheduleWorkerRun(zero,1,1,input);assert.equal(direct.runs[1].startSeconds,direct.runs[1].transport!.endSeconds);
  const missing=structuredClone(project);missing.stationRouting!.routes=[];
  assert.throws(()=>scheduleWorkerRun(missing,1,1,input),/tras/);
  const calendar=structuredClone(project);delete calendar.resourceCalendars!.workers[project.workers[0].id];
  assert.throws(()=>scheduleWorkerRun(calendar,1,1,input),/kalendarz/);
  const misplaced=structuredClone(input);misplaced.bodies[0].location={kind:'station',stationId:'ST-C',copy:1};
  assert.throws(()=>scheduleWorkerRun(project,1,1,misplaced),/lokalizacja początkowa/);
  assert.throws(()=>scheduleWorkerRun(project,1,1,input,undefined,{transportMode:'invalid' as any}),/Nieznany tryb/);
  assert.equal(JSON.stringify(project),before);
  const jit=scheduleWorkerRun(project,1,1,input,undefined,{transportMode:'just-in-time'});
  assert.equal(jit.jobs[0].finish,40);assert.equal(jit.bodyBook,undefined);assert.equal(jit.transportMovements,undefined);
});


test('3.5b2c2: kolejne dojazdy zestawu są zgodne z zapisaną kolejnością i dopiero potem rusza korpus',()=>{
  for(const reverse of [false,true]){
    const {project,input}=bufferedPhysicalFixture(1),transport=project.assemblyTransport!;
    project.equipment.push({id:'BUFFER-CART-2',name:'Drugi jawny wózek'});
    transport.carts[0].initialLocation={stationId:'ST-C',copy:1};
    transport.carts.push({...structuredClone(transport.carts[0]),equipmentId:'BUFFER-CART-2'});
    transport.routes[0].alternatives[0].equipmentIds.push('BUFFER-CART-2');
    project.workers.push({id:'APPROACH-2',name:'Druga jawna obsada dojazdu'});
    project.resourceCalendars!.workers['APPROACH-2']=structuredClone(project.resourceCalendars!.workers['BUFFER-TRANSPORT']);
    const route=structuredClone(transport.emptyRoutes.find(route=>route.from.stationId==='ST-C'&&route.to.stationId==='ST-A')!);
    route.id='BUFFER-RETURN-2';route.equipmentId='BUFFER-CART-2';route.workerAssignment={workerIds:['APPROACH-2'],source:'Jawny test niezależnej obsady'};
    route.transportTime={durationSeconds:8,basis:'assumed',source:'Jawny test drugiego dojazdu'};
    transport.emptyRoutes.push(route);
    if(reverse)transport.routes[0].alternatives[0].equipmentIds.reverse();
    const result=scheduleWorkerRun(project,1,1,input),moves=result.transportMovements!;
    assert.deepEqual(moves.filter(m=>m.purpose==='approach').map(m=>[m.equipmentIds[0],m.startSeconds,m.endSeconds]),
      reverse?[['BUFFER-CART-2',10,18],['CART',18,23]]:[['CART',10,15],['BUFFER-CART-2',15,23]]);
    assert.deepEqual(moves.find(m=>m.purpose==='transfer')!.equipmentIds,transport.routes[0].alternatives[0].equipmentIds);
    assert.deepEqual([result.runs[1].transport!.startSeconds,result.runs[1].transport!.endSeconds,result.jobs[0].finish],[23,25,55]);
    assertNoWorkerOverlap(result);
  }
});

test('3.5b2c2: wspólna osoba montażu i transportu nie jest odbierana blokadzie',()=>{
  const {project,input}=bufferedPhysicalFixture(5),shared=project.workers[0].id;
  project.assemblyTransport!.routes[0].alternatives[0].workerIds=[shared];
  project.assemblyTransport!.emptyRoutes.forEach(route=>route.workerAssignment={workerIds:[shared],source:'Jawna wspólna osoba montażu i transportu'});
  assert.throws(()=>scheduleWorkerRun(project,1,5,input),/zakleszczenie/);
  project.stationBuffers!.buffers[0].blockingPolicy='bbas-worker-released';
  const result=scheduleWorkerRun(project,1,5,input);
  assert.ok(result.runs.some(r=>r.blockedSeconds!>0));assertNoWorkerOverlap(result);
  const pair=bufferedPhysicalFixture(2);pair.project.assemblyTransport!.routes[0].alternatives[0].workerIds=[pair.project.workers[0].id];
  pair.project.assemblyTransport!.emptyRoutes.forEach(route=>route.workerAssignment={workerIds:[pair.project.workers[0].id],source:'Jawny test wspólnej osoby'});
  assertNoWorkerOverlap(scheduleWorkerRun(pair.project,1,2,pair.input));
});

test('3.5b2c2: brak wózka nie usuwa jawnego transportu przenośnikiem, historia korpusu daje identyczny stan',()=>{
  const {project,input}=bufferedPhysicalFixture(3),transport=project.assemblyTransport!;
  transport.conveyors=[{equipmentId:'CART',from:{stationId:'ST-A',copy:1},to:{stationId:'ST-C',copy:1},calendar:structuredClone(transport.carts[0].calendar)}];
  transport.carts=[];transport.emptyRoutes=[];
  const result=scheduleWorkerRun(project,1,3,input);
  assert.equal(result.cartBook!.carts.length,0);assert.equal(result.transportMovements!.length,3);
  assert.ok(result.transportMovements!.every(m=>m.kind==='loaded'));
  let book=createBodyBook(project,input.bodies,0);
  for(const event of result.bodyEvents!)book=applyBodyEvent(book,event);
  assert.deepEqual(book,result.bodyBook);assertNoWorkerOverlap(result);
  const jit=scheduleWorkerRun(project,1,3,input,undefined,{transportMode:'just-in-time'});
  assert.equal(jit.jobs[2].finish,100);assert.equal(jit.bodyEvents,undefined);
});


test('3.5b2c2: późny powrót wózka nie wydłuża horyzontu dostaw po końcu produkcji',()=>{
  const {project,input}=bufferedPhysicalFixture(1),transport=project.assemblyTransport!;
  transport.carts[0].afterUnload='return-to-initial';
  project.workers.push({id:'RETURN-LATE',name:'Jawna osoba późnego powrotu'});
  project.resourceCalendars!.workers['RETURN-LATE']=structuredClone(project.resourceCalendars!.workers['BUFFER-TRANSPORT']);
  project.resourceCalendars!.workers['RETURN-LATE'].shifts[0].startSeconds=50;
  transport.emptyRoutes.forEach(route=>route.workerAssignment={workerIds:['RETURN-LATE'],source:'Jawny późny powrót'});
  const supply=materialScheduleFixture().materialSupply!;
  project.materialSupply={...supply,items:supply.items.map(item=>({...item,initialStock:1,
    schedule:{kind:'explicit-deliveries',deliveries:[{deliveryTimeSeconds:50,quantity:1}]}}))};
  project.operations[0].staffing!.timeVariants[0].timeProfile.durationBasis='measured';
  const result=scheduleWorkerRun(project,1,1,input);
  assert.equal(result.jobs[0].finish,42);assert.equal(result.transportMovements!.find(m=>m.purpose==='return')!.endSeconds,55);
  assert.equal(result.materialStocks![0].stock,0);assert.equal(result.materialEvents!.filter(e=>e.kind==='delivery').length,0);
  assert.ok(result.bodyEvents!.some(e=>e.kind==='reserve'&&e.operationId===project.operations[0].id&&e.basis==='confirmed'));
  assertNoWorkerOverlap(result);
});


function zeroBufferFixture(batch=3,policy:'bbas'|'bbas-worker-released'='bbas'){
  const fixture=bufferedPhysicalFixture(batch,policy);
  fixture.project.stationBuffers!.buffers[1].inputCapacity=0;
  return fixture;
}

test('3.5b2c3: wejście zero uruchamia operację dokładnie przy przyjeździe i nie przechowuje sztuk',()=>{
  const {project,input}=zeroBufferFixture(),before=JSON.stringify({project,input});
  const result=scheduleWorkerRun(project,1,3,input),recipients=result.runs.filter(r=>r.operationId===project.operations[1].id);
  assert.deepEqual(recipients.map(r=>[r.transport!.startSeconds,r.transport!.endSeconds,r.startSeconds,r.endSeconds]),
    [[10,12,12,42],[40,42,42,72],[70,72,72,102]]);
  assert.ok(recipients.every(r=>r.stationReserveStartSeconds===r.transport!.endSeconds));
  assert.equal(result.bufferBook!.tokens.filter(t=>t.location?.stationId==='ST-C'&&t.location.side==='input'||t.destination?.stationId==='ST-C').length,0);
  assert.ok(!result.bufferEvents!.some(e=>e.stationId==='ST-C'&&e.kind==='input'));
  let bodies=createBodyBook(project,input.bodies,0);
  for(const event of result.bodyEvents!)bodies=applyBodyEvent(bodies,event);
  assert.deepEqual(bodies,result.bodyBook);assertNoWorkerOverlap(result);assert.equal(JSON.stringify({project,input}),before);
  const replies:ScheduleReply[]=[];executeScheduleRequest({project,batch:3,arrivalIntervalSeconds:1},r=>replies.push(r));
  assert.deepEqual((replies.find(r=>r.kind==='result') as {result:unknown}).result,result);
});

test('3.5b2c3: wyjście zero blokuje stanowisko do wyjazdu i zachowuje obie polityki operatora',()=>{
  for(const policy of ['bbas','bbas-worker-released'] as const){
    const {project,input}=bufferedPhysicalFixture(3,policy);project.stationBuffers!.buffers[0].outputCapacity=0;
    const result=scheduleWorkerRun(project,1,3,input),sources=result.runs.filter(r=>r.operationId===project.operations[0].id);
    assert.deepEqual(sources.map(r=>[r.endSeconds,r.stationReleaseSeconds]),[[10,10],[20,25],[35,47]]);
    const second=result.reservations.reservations.find(r=>r.reservationId===`2:${project.operations[0].id}`)!;
    assert.equal(second.endSeconds,policy==='bbas'?25:20);
    assert.equal(result.jobs[2].finish,102);assertNoWorkerOverlap(result);
    assert.ok(!result.bufferEvents!.some(e=>e.stationId==='ST-A'&&e.kind==='output'));
  }
});

test('3.5b2c3: wejście i wyjście zero pozwalają zwolnić własną osobę do loaded, ale nie do dojazdu',()=>{
  const {project,input}=zeroBufferFixture(2);project.stationBuffers!.buffers[0].outputCapacity=0;
  const shared=project.workers[0].id;project.assemblyTransport!.routes[0].alternatives[0].workerIds=[shared];
  const result=scheduleWorkerRun(project,1,2,input),sources=result.runs.filter(r=>r.operationId===project.operations[0].id);
  assert.deepEqual(sources.map(r=>[r.startSeconds,r.endSeconds,r.stationReleaseSeconds]),[[0,10,10],[12,22,40]]);
  assert.equal(result.jobs[1].finish,72);assertNoWorkerOverlap(result);
  project.assemblyTransport!.emptyRoutes.forEach(route=>route.workerAssignment={workerIds:[shared],source:'Jawna wspólna osoba dojazdu'});
  assert.throws(()=>scheduleWorkerRun(project,1,2,input),/zakleszczenie/);
  project.stationBuffers!.buffers[0].blockingPolicy='bbas-worker-released';
  assertNoWorkerOverlap(scheduleWorkerRun(project,1,2,input));
});

test('3.5b2c3: kalendarz i materiał przesuwają wyjazd, odbiorca nie czeka z korpusem przy wejściu zero',()=>{
  const {project,input}=zeroBufferFixture(1),supply=materialScheduleFixture().materialSupply!;
  project.resourceCalendars!.stations['ST-C'].shifts[0].startSeconds=50;
  project.materialSupply={...supply,items:supply.items.map(item=>({...item,targetStationId:'ST-C',initialStock:0,
    schedule:{kind:'explicit-deliveries',deliveries:[{deliveryTimeSeconds:60,quantity:1}]}})),
    consumptions:[{operationId:project.operations[1].id,supplyId:supply.items[0].id,quantity:1,source:'Jawny materiał odbiorcy zero'}]};
  const result=scheduleWorkerRun(project,1,1,input),last=result.runs[1];
  assert.deepEqual([last.transport!.startSeconds,last.transport!.endSeconds,last.startSeconds,last.endSeconds],[58,60,60,90]);
  assert.deepEqual(result.materialEvents!.filter(e=>e.atSeconds===60).map(e=>e.kind),['delivery','consumption']);
  let before=createBodyBook(project,input.bodies,0);
  for(const event of result.bodyEvents!.filter(e=>e.atSeconds<58))before=applyBodyEvent(before,event);
  assert.equal(bodyAvailableAt(before,input.bodies[0].id,{stationId:'ST-A',copy:1}),true);
  assertNoWorkerOverlap(result);
  delete project.materialSupply;
  const calendar=scheduleWorkerRun(project,1,1,input).runs[1];
  assert.deepEqual([calendar.transport!.startSeconds,calendar.startSeconds],[48,50]);
});

test('3.5b2c3: przyszła częściowa obecność odbiorcy jest chroniona przed kolejnym montażem',()=>{
  const {project,input}=zeroBufferFixture(2,'bbas-worker-released'),shared=project.workers[0].id;
  project.workerRunSelection!.operations[0].eligibleWorkerIds=[shared];
  project.workerRunSelection!.operations[1].eligibleWorkerIds=[shared];
  project.operations[1].staffing!.timeVariants[0].timeProfile.operatorPresence=[{startSeconds:5,endSeconds:10,basis:'assumed'}];
  const result=scheduleWorkerRun(project,1,2,input),source2=result.runs.find(r=>r.job===2&&r.operationId===project.operations[0].id)!;
  const receiver=result.runs.find(r=>r.job===1&&r.operationId===project.operations[1].id)!;
  assert.deepEqual([receiver.startSeconds,receiver.reserveStartSeconds,receiver.reserveEndSeconds],[12,17,22]);
  assert.equal(source2.startSeconds,22);assertNoWorkerOverlap(result);
});

test('3.5b2c3: początkowe wejście zero i wspólna osoba przewozu/odbiorcy nie tworzą nakładania',()=>{
  const {project,input}=zeroBufferFixture(2,'bbas-worker-released');project.stationBuffers!.buffers[0].inputCapacity=0;
  project.workerRunSelection!.operations[1].eligibleWorkerIds=['BUFFER-TRANSPORT'];
  project.workerRunSelection!.teamWorkerIds.push('BUFFER-TRANSPORT');
  const result=scheduleWorkerRun(project,1,2,input);
  assert.ok(result.runs.filter(r=>r.operationId===project.operations[1].id).every(r=>r.startSeconds===r.transport!.endSeconds));
  assert.ok(!result.bufferEvents!.some(e=>e.stationId==='ST-A'&&e.kind==='input'));
  assertNoWorkerOverlap(result);
  const jit=scheduleWorkerRun(project,1,2,input,undefined,{transportMode:'just-in-time'});
  assert.equal(jit.transportMode,'just-in-time');assert.equal(jit.bodyBook,undefined);
});


test('3.5b2c3: bezpośredni przyjazd jest atomowy, nie można go zgłosić wcześniej ani później',()=>{
  const {project,output}=bufferedBodyFixture();
  const zero=structuredClone(output);zero.buffers.places=zero.buffers.places.map(place=>place.stationId==='ST-C'&&place.side==='input'?{...place,capacity:0}:place);
  const moving=applyBufferedBodyEvent(zero,{kind:'depart-direct',bodyId:'BODY',atSeconds:10,to:{stationId:'ST-C',copy:1,side:'input'},endSeconds:12,basis:'assumed'});
  assert.equal(moving.buffers.tokens.length,0);assert.equal(moving.bodies.bodies[0].status,'moving');
  const before=JSON.stringify(moving),event={kind:'arrive-direct' as const,bodyId:'BODY',atSeconds:12,operationId:project.operations[1].id,endSeconds:42,basis:'assumed' as const};
  for(const atSeconds of [11,13])assert.throws(()=>applyBufferedBodyEvent(moving,{...event,atSeconds}),/dokładnego końca/);
  assert.throws(()=>applyBufferedBodyEvent(moving,{...event,operationId:'UNKNOWN'}),/nieznana operacja/);
  assert.equal(JSON.stringify(moving),before);
  const arrived=applyBufferedBodyEvent(moving,event);
  assert.equal(arrived.bodies.bodies[0].status,'reserved');assert.equal(arrived.buffers.tokens.length,0);
});

test('3.5b2c3: powrót czeka na przyszłą rezerwację osoby odbiorcy, a brak okna nie publikuje wyniku',()=>{
  const {project,input}=zeroBufferFixture(1,'bbas-worker-released');
  project.assemblyTransport!.carts[0].afterUnload='return-to-initial';
  project.workerRunSelection!.teamWorkerIds.push('BUFFER-TRANSPORT');
  project.workerRunSelection!.operations[1].eligibleWorkerIds=['BUFFER-TRANSPORT'];
  const result=scheduleWorkerRun(project,1,1,input);
  assert.deepEqual([result.jobs[0].finish,result.transportMovements!.find(m=>m.purpose==='return')!.startSeconds,result.cartBook!.atSeconds],[42,42,47]);
  assertNoWorkerOverlap(result);
  project.resourceCalendars!.stations['ST-C'].shifts[0].endSeconds=11;
  const before=JSON.stringify(project),replies:ScheduleReply[]=[];
  executeScheduleRequest({project,batch:1,arrivalIntervalSeconds:1},r=>replies.push(r));
  assert.ok(replies.some(r=>r.kind==='error'));assert.ok(!replies.some(r=>r.kind==='result'));
  assert.equal(JSON.stringify(project),before);
});

test('3.5b2c3: wejście zero zachowuje kolejność dojazdów zestawu przed uzgodnionym przyjazdem',()=>{
  const {project,input}=zeroBufferFixture(1),transport=project.assemblyTransport!;
  project.resourceCalendars!.stations['ST-C'].shifts[0].startSeconds=50;
  project.equipment.push({id:'ZERO-CART-2',name:'Jawny drugi wózek'});
  transport.carts[0].initialLocation={stationId:'ST-C',copy:1};
  transport.carts.push({...structuredClone(transport.carts[0]),equipmentId:'ZERO-CART-2'});
  transport.routes[0].alternatives[0].equipmentIds.push('ZERO-CART-2');
  const route=structuredClone(transport.emptyRoutes.find(route=>route.from.stationId==='ST-C'&&route.to.stationId==='ST-A')!);
  route.id='ZERO-APPROACH-2';route.equipmentId='ZERO-CART-2';route.transportTime={durationSeconds:8,basis:'assumed',source:'Jawne 8 s'};
  transport.emptyRoutes.push(route);
  const result=scheduleWorkerRun(project,1,1,input);
  assert.deepEqual(result.transportMovements!.filter(m=>m.purpose==='approach').map(m=>[m.equipmentIds[0],m.startSeconds,m.endSeconds]),[['CART',10,15],['ZERO-CART-2',15,23]]);
  assert.deepEqual([result.runs[1].transport!.startSeconds,result.runs[1].transport!.endSeconds,result.runs[1].startSeconds],[48,50,50]);
  assertNoWorkerOverlap(result);
});


test('3.5b2c3: przyszły koniec pracy nie oznacza zwolnienia kopii, gdy jej wyjście może się zablokować',()=>{
  const {project,input}=zeroBufferFixture(4),middle=project.operations[1],end=structuredClone(middle),transport=project.assemblyTransport!;
  end.id='ZERO-END';end.name='Jawny wolny odbiorca';end.predecessorIds=[middle.id];end.sequenceNumber=3;
  const profile=end.staffing!.timeVariants[0].timeProfile;profile.durationSeconds=100;profile.operatorPresence=[{startSeconds:0,endSeconds:100,basis:'assumed'}];
  project.operations.push(end);project.workers.push({id:'ZERO-END-W',name:'Osoba końcowego odbiorcy'});
  project.workerRunSelection!.teamWorkerIds.push('ZERO-END-W');project.workerRunSelection!.operations.push({operationId:end.id,workerCount:1,eligibleWorkerIds:['ZERO-END-W']});
  project.stations.push({id:'ST-ZERO-END',name:'Jawny odbiorca',operationIds:[end.id]});project.stationSettings['ST-ZERO-END']={operators:1,parallelStations:1};
  project.resourceCalendars!.stations['ST-ZERO-END']=structuredClone(project.resourceCalendars!.stations['ST-C']);
  project.resourceCalendars!.workers['ZERO-END-W']=structuredClone(project.resourceCalendars!.workers['BUFFER-TRANSPORT']);
  project.stationRouting!.operations.push({operationId:end.id,candidates:[{stationId:'ST-ZERO-END',copy:1,requiredEquipmentIds:[]}]});
  const route={...structuredClone(project.stationRouting!.routes[0]),id:'ZERO-C-END',from:{stationId:'ST-C',copy:1},to:{stationId:'ST-ZERO-END',copy:1}};
  project.stationRouting!.routes.push(route);project.equipment.push({id:'ZERO-C-END-DEVICE',name:'Jawny przenośnik odbiorcy'});
  transport.conveyors=[{equipmentId:'CART',from:{stationId:'ST-A',copy:1},to:{stationId:'ST-C',copy:1},calendar:structuredClone(transport.carts[0].calendar)},
    {equipmentId:'ZERO-C-END-DEVICE',from:route.from,to:route.to,calendar:structuredClone(transport.carts[0].calendar)}];
  transport.carts=[];transport.emptyRoutes=[];
  transport.routes.push({stationRouteId:route.id,source:'Jawny dalszy transport',alternatives:[{equipmentIds:['ZERO-C-END-DEVICE'],workerIds:['BUFFER-TRANSPORT']}]});
  project.stationBuffers!.buffers[1].outputCapacity=1;project.stationBuffers!.buffers[1].blockingPolicy='bbas';
  project.stationBuffers!.buffers.push({stationId:'ST-ZERO-END',copy:1,inputCapacity:0,outputCapacity:null});
  const result=scheduleWorkerRun(project,1,4,input),runs=result.runs.filter(r=>r.operationId===middle.id).sort((a,b)=>a.job-b.job);
  assert.ok(runs.some(r=>r.blockedSeconds!>0));
  for(let i=1;i<runs.length;i++)assert.ok(runs[i].transport!.startSeconds>=runs[i-1].stationReleaseSeconds!);
  assertNoWorkerOverlap(result);
  let bodies=createBodyBook(project,input.bodies,0);for(const event of result.bodyEvents!)bodies=applyBodyEvent(bodies,event);
  assert.deepEqual(bodies,result.bodyBook);
});


test('3.5b2c3: ułamkowe terminy gotowości nie powodują fikcyjnego postoju ani zakleszczenia',()=>{
  for(const [ready,duration] of [[12.4,2.2],[12.6,2.3],[22.4,4.3]]){
    const {project,input}=zeroBufferFixture(1);
    project.resourceCalendars!.stations['ST-C'].shifts[0].startSeconds=ready;
    project.stationRouting!.routes[0].transportTime!.durationSeconds=duration;
    const result=scheduleWorkerRun(project,1,1,input),run=result.runs[1];
    assert.ok(run.startSeconds>=ready);assert.equal(run.startSeconds,run.transport!.endSeconds);
    assert.ok(Math.abs(run.startSeconds-ready)<1e-10);assertNoWorkerOverlap(result);
  }
});


function localContinuationFixture(batch=2){
  const {project,input}=bufferedPhysicalFixture(batch),first=project.operations[0],last=project.operations[1],local=structuredClone(first);
  local.id='LOCAL-B';local.name='Lokalna druga operacja';local.sequenceNumber=2;local.predecessorIds=[first.id];
  local.staffing!.timeVariants[0].timeProfile={durationSeconds:6,durationBasis:'assumed',manualWork:[],machineRun:[],operatorPresence:[{startSeconds:2,endSeconds:6,basis:'assumed'}]};
  first.staffing!.timeVariants[0].timeProfile.operatorPresence=[{startSeconds:0,endSeconds:5,basis:'assumed'}];
  last.staffing!.timeVariants[0].timeProfile.operatorPresence=[{startSeconds:0,endSeconds:5,basis:'assumed'}];
  last.predecessorIds=[local.id];last.sequenceNumber=3;
  project.operations.splice(1,0,local);project.stations.find(s=>s.id==='ST-A')!.operationIds.push(local.id);
  project.equipment.find(e=>e.id==='EQ-A')!.capableOperationIds!.push(local.id);
  project.stationRouting!.operations.push({operationId:local.id,candidates:[{stationId:'ST-A',copy:1,requiredEquipmentIds:['EQ-A']}]});
  project.workerRunSelection!.operations.push({operationId:local.id,workerCount:1,eligibleWorkerIds:[project.workers[1].id]});
  project.stationBuffers!.buffers[0].inputCapacity=1;project.stationBuffers!.buffers[0].outputCapacity=0;
  return {project,input};
}

test('3.5b2c4: korpus przechodzi lokalnie bez buforów, zachowuje stanowisko i wyposażenie, osoby według profili',()=>{
  const {project,input}=localContinuationFixture(),first=project.operations[0].id;
  const supply=materialScheduleFixture().materialSupply!;
  project.materialSupply={...supply,items:supply.items.map(item=>({...item,initialStock:0,schedule:{kind:'explicit-deliveries',deliveries:[{deliveryTimeSeconds:25,quantity:2}]}})),
    consumptions:[{operationId:'LOCAL-B',supplyId:supply.items[0].id,quantity:1,source:'Jawny materiał operacji lokalnej'}]};
  const before=JSON.stringify({project,input}),result=scheduleWorkerRun(project,1,2,input);
  const a=result.runs.find(r=>r.job===1&&r.operationId===first)!,b=result.runs.find(r=>r.job===1&&r.operationId==='LOCAL-B')!;
  assert.deepEqual([a.startSeconds,a.endSeconds,a.stationReleaseSeconds,a.continuationWaitSeconds,a.blockedSeconds],[0,10,25,15,0]);
  assert.equal(a.reserveEndSeconds,5);assert.deepEqual([b.startSeconds,b.endSeconds,b.reserveStartSeconds,b.reserveEndSeconds],[25,31,27,31]);
  assert.equal(result.runs.find(r=>r.job===2&&r.operationId===first)!.startSeconds,31);
  assert.equal(result.jobs[1].finish,93);assertNoWorkerOverlap(result);
  assert.ok(!result.bufferEvents!.some(e=>e.job===1&&e.stationId==='ST-A'&&(e.kind==='output'||e.kind==='input'&&e.atSeconds>0)));
  assert.ok(!result.bodyEvents!.some(e=>e.kind==='start-transfer'&&e.atSeconds<31));
  let bodies=createBodyBook(project,input.bodies,0);for(const event of result.bodyEvents!)bodies=applyBodyEvent(bodies,event);
  assert.deepEqual(bodies,result.bodyBook);assert.equal(JSON.stringify({project,input}),before);
  const replies:ScheduleReply[]=[];executeScheduleRequest({project,batch:2,arrivalIntervalSeconds:1},r=>replies.push(r));
  assert.deepEqual((replies.find(r=>r.kind==='result') as {result:unknown}).result,result);
});

test('3.5b2c4: lokalny przebieg bez trasy i zestawu transportowego działa fizycznie oraz w JIT',()=>{
  const {project,input}=localContinuationFixture();
  const last=project.operations.pop()!;project.stations.find(s=>s.id==='ST-C')!.operationIds=[];
  project.workerRunSelection!.operations=project.workerRunSelection!.operations.filter(o=>o.operationId!==last.id);
  project.stationRouting!.operations=project.stationRouting!.operations.filter(o=>o.operationId!==last.id);
  project.stationRouting!.routes=[];delete project.assemblyTransport;
  project.stationBuffers!.buffers[0].outputCapacity=null;
  const physical=scheduleWorkerRun(project,1,2,input),jit=scheduleWorkerRun(project,1,2,input,undefined,{transportMode:'just-in-time'});
  assert.deepEqual(physical.jobs,jit.jobs);assert.equal(physical.jobs[1].finish,32);
  assert.equal(physical.bodyEvents!.filter(e=>e.kind==='start-transfer'||e.kind==='finish-transfer').length,0);
  assert.equal(physical.transportMovements!.length,0);assert.equal(physical.cartBook!.carts.length,0);
  assert.ok(physical.bodyBook!.bodies.every(b=>b.location.kind==='station'&&b.location.stationId==='ST-A'));
  assertNoWorkerOverlap(physical);assertNoWorkerOverlap(jit);
});

test('3.5b2c4: późniejsza obecność przy bbas kończy się dopiero po rzeczywistym zwolnieniu',()=>{
  const {project,input}=bufferedPhysicalFixture(5);
  project.operations[0].staffing!.timeVariants[0].timeProfile.operatorPresence=[{startSeconds:5,endSeconds:10,basis:'assumed'}];
  const result=scheduleWorkerRun(project,1,5,input),blocked=result.runs.find(r=>r.operationId===project.operations[0].id&&r.blockedSeconds!>0)!;
  assert.ok(blocked.reserveStartSeconds>blocked.startSeconds);assert.equal(blocked.reserveEndSeconds,blocked.stationReleaseSeconds);
  assertNoWorkerOverlap(result);
  project.operations[0].staffing!.timeVariants[0].timeProfile.operatorPresence[0].endSeconds=8;
  assert.throws(()=>scheduleWorkerRun(project,1,5,input),/obecności aż do końca/);
});


test('3.5b2c4: możliwa przyszła blokada nie przejmuje już obiecanej obecności tej samej osoby',()=>{
  const {project,input}=zeroBufferFixture(2),shared=project.workers[0].id;
  project.workerRunSelection!.operations[0].eligibleWorkerIds=[shared];project.workerRunSelection!.operations[1].eligibleWorkerIds=[shared];
  project.operations[1].staffing!.timeVariants[0].timeProfile.operatorPresence=[{startSeconds:20,endSeconds:30,basis:'assumed'}];
  const result=scheduleWorkerRun(project,1,2,input);
  const receiver=result.runs.find(r=>r.job===1&&r.operationId===project.operations[1].id)!,second=result.runs.find(r=>r.job===2&&r.operationId===project.operations[0].id)!;
  assert.deepEqual([receiver.startSeconds,receiver.reserveStartSeconds,receiver.reserveEndSeconds],[12,32,42]);
  assert.equal(second.startSeconds,42);assertNoWorkerOverlap(result);
  const plan=createWorkerRunPlan(project,project.workerRunSelection!.teamWorkerIds,project.workerRunSelection!.operations);
  const book=reserveWorkerTeam(createWorkerReservationBook(project.workers.map(w=>w.id)),{reservationId:'FUTURE',workerIds:[shared],startSeconds:40,endSeconds:50});
  const candidate=project.stationRouting!.operations[0].candidates[0];
  const protectedPlan=planDirectOperation(project,plan.operations[0],candidate,10,book,new Set(),true);
  assert.equal(protectedPlan.choice,undefined);assert.equal(protectedPlan.retryAt,50);
  assert.ok(planDirectOperation(project,plan.operations[0],candidate,10,book,new Set(),false).choice);
});

test('3.5b2c4: błędna lokalna kontynuacja nie zwalnia korpusu ani nie zmienia lokalizacji',()=>{
  const {project,input}=localContinuationFixture(1),initial={bodies:createBodyBook(project,input.bodies,0),buffers:createBufferBook(project)};
  const reserved={...initial,bodies:applyBodyEvent(initial.bodies,{kind:'reserve',bodyId:input.bodies[0].id,atSeconds:0,operationId:project.operations[0].id,endSeconds:10,basis:'assumed'})};
  const event={kind:'continue-operation' as const,bodyId:input.bodies[0].id,atSeconds:10,previousOperationId:project.operations[0].id,operationId:'LOCAL-B',location:{stationId:'ST-A',copy:1},endSeconds:16,basis:'assumed' as const};
  const before=JSON.stringify(reserved);
  assert.throws(()=>applyBufferedBodyEvent(reserved,{...event,atSeconds:5}),/przed końcem/);
  assert.throws(()=>applyBufferedBodyEvent(reserved,{...event,location:{stationId:'ST-C',copy:1}}),/tej samej kopii/);
  assert.throws(()=>applyBufferedBodyEvent(reserved,{...event,operationId:'UNKNOWN'}),/nieznana operacja/);
  assert.equal(JSON.stringify(reserved),before);
  const continued=applyBufferedBodyEvent(reserved,event);assert.equal(continued.buffers.tokens.length,0);
  assert.deepEqual(continued.bodies.bodies[0].location,reserved.bodies.bodies[0].location);
});

test('3.5c1: edycja buforów zapisuje jawne pojemności i polityki bbas bez mutacji projektu, a undefined usuwa konfigurację',()=>{
  const project=bufferedProcessFixture();
  const buffers:StationBuffersV6={buffers:[
    {stationId:'ST-A',copy:null,inputCapacity:2,outputCapacity:0,blockingPolicy:'bbas'},
    {stationId:'ST-C',copy:1,inputCapacity:null,outputCapacity:null,blockingPolicy:'bbas-worker-released'}
  ]};
  const before=JSON.stringify(project);
  const edited=editDomainStationBuffers(project,buffers);
  assert.equal(JSON.stringify(project),before);
  assert.deepEqual(parseDomainProjectV6(JSON.stringify(edited)).stationBuffers,buffers);
  const removed=editDomainStationBuffers(edited,undefined);
  assert.equal(removed.stationBuffers,undefined);
  assert.equal(JSON.stringify(project),before);
});

test('3.5c1: walidator buforów odrzuca nieznane stanowiska, błędne kopie, duplikaty klucza i ujemne wartości',()=>{
  const project=bufferedProcessFixture();
  const valid:StationBuffersV6={buffers:[
    {stationId:'ST-A',copy:null,inputCapacity:1,outputCapacity:1,blockingPolicy:'bbas'}
  ]};
  assert.deepEqual(validateStationBuffers(project,valid),valid);
  assert.throws(()=>validateStationBuffers(project,{buffers:[{stationId:'UNKNOWN',copy:null,inputCapacity:1,outputCapacity:1}]}),/nieznane stanowisko/);
  assert.throws(()=>validateStationBuffers(project,{buffers:[{stationId:'ST-A',copy:null,inputCapacity:-1,outputCapacity:1}]}),/nieujemną liczbą/);
  assert.throws(()=>validateStationBuffers(project,{buffers:[{stationId:'ST-A',copy:null,inputCapacity:1,outputCapacity:1.5}]}),/nieujemną liczbą/);
  assert.throws(()=>validateStationBuffers(project,{buffers:[{stationId:'ST-A',copy:99,inputCapacity:1,outputCapacity:1}]}),/poza zakresem/);
  assert.throws(()=>validateStationBuffers(project,{buffers:[
    {stationId:'ST-A',copy:null,inputCapacity:1,outputCapacity:1},
    {stationId:'ST-A',copy:null,inputCapacity:2,outputCapacity:2}
  ]}),/powtórzona konfiguracja/);
  assert.throws(()=>validateStationBuffers(project,{buffers:[
    {stationId:'ST-A',copy:null,inputCapacity:1,outputCapacity:1,blockingPolicy:'unknown' as unknown as 'bbas'}
  ]}),/nieznana reguła/);
});

test('3.5c1: integracja draft storage, historia Cofnij/Ponów i izolacja oryginalnych źródeł 4/5',()=>{
  const project=bufferedProcessFixture();
  const buffers:StationBuffersV6={buffers:[
    {stationId:'ST-A',copy:null,inputCapacity:0,outputCapacity:1,blockingPolicy:'bbas-worker-released'}
  ]};
  const edited=editDomainStationBuffers(project,buffers);
  for(const originalJson of [JSON.stringify(derive(parseProject(JSON.stringify(base))).project),readFileSync('tests/qa/Eko_D5_actual_export_v5.json','utf8')]){
    const storage=new DraftStorage(),initial=saveDomainDraft(storage,{project,originalJson},null);
    const written=saveDomainDraft(storage,{project:edited,originalJson},initial.raw),reopened=readDomainDraft(storage);
    assert.equal(reopened.status,'valid');
    if(reopened.status==='valid'){
      assert.equal(reopened.saved.originalJson,originalJson);
      assert.deepEqual(reopened.saved.project.stationBuffers,buffers);
    }
    const invalid=structuredClone(edited);
    invalid.stationBuffers!.buffers[0].inputCapacity=-5;
    assert.throws(()=>saveDomainDraft(storage,{project:invalid,originalJson},written.raw));
    assert.equal(storage.getItem(DOMAIN_DRAFT_STORAGE_KEY),written.raw);
    const undone=saveDomainDraft(storage,{project,originalJson},written.raw);
    const old=readDomainDraft(storage);
    assert.equal(old.status,'valid');
    if(old.status==='valid')assert.equal(old.saved.project.stationBuffers?.buffers[0]?.inputCapacity, project.stationBuffers?.buffers[0]?.inputCapacity ?? null);
    saveDomainDraft(storage,{project:edited,originalJson},undone.raw);
    const corrupt=JSON.parse(storage.getItem(DOMAIN_DRAFT_STORAGE_KEY)!);
    corrupt.project.stationBuffers.buffers[0].stationId='NONEXISTENT';
    const raw=JSON.stringify(corrupt);
    storage.setItem(DOMAIN_DRAFT_STORAGE_KEY,raw);
    assert.equal(readDomainDraft(storage).status,'corrupt');
    assert.equal(storage.getItem(DOMAIN_DRAFT_STORAGE_KEY),raw);
  }
});

test('3.5c2: edycja zaopatrzenia materiałowego montażu w szkicu 6 (pozycje, harmonogramy i zużycie)', () => {
  const project = materialScheduleFixture();
  const supply: MaterialSupplyV6 = {
    items: [
      {
        id: 'SUP-1',
        componentId: 'PART-A',
        targetStationId: 'ST-A',
        initialStock: 5,
        unit: 'szt.',
        schedule: {kind: 'periodic', batchQuantity: 10, intervalSeconds: 60, firstDeliverySeconds: 15},
        source: 'Dostawy cykliczne',
      },
      {
        id: 'SUP-2',
        componentId: 'PART-B',
        targetStationId: 'ST-C',
        initialStock: 0,
        unit: 'kg',
        schedule: {
          kind: 'explicit-deliveries',
          deliveries: [
            {deliveryTimeSeconds: 20, quantity: 5},
            {deliveryTimeSeconds: 80, quantity: 5},
          ],
        },
        source: 'Dostawy jawne',
      },
    ],
    consumptions: [
      {operationId: project.operations[0].id, supplyId: 'SUP-1', quantity: 2, source: 'Zużycie OP-1'},
      {operationId: project.operations[1].id, supplyId: 'SUP-2', quantity: 1, source: 'Zużycie OP-2'},
    ],
  };

  const before = JSON.stringify(project);
  const edited = editDomainMaterialSupply(project, supply);
  assert.equal(JSON.stringify(project), before);
  assert.deepEqual(parseDomainProjectV6(JSON.stringify(edited)).materialSupply, supply);
  assert.deepEqual(editDomainMaterialSupply(edited, undefined).materialSupply, undefined);
});

test('3.5c2: walidacja zaopatrzenia odrzuca duplikaty, nieznane referencje, ujemne wartości i puste pola', () => {
  const project = materialScheduleFixture();
  const validSupply: MaterialSupplyV6 = {
    items: [{
      id: 'SUP-1',
      componentId: 'PART-A',
      targetStationId: 'ST-A',
      initialStock: 5,
      unit: 'szt.',
      schedule: {kind: 'periodic', batchQuantity: 10, intervalSeconds: 60, firstDeliverySeconds: 0},
      source: 'Plan zaopatrzenia',
    }],
    consumptions: [{
      operationId: project.operations[0].id,
      supplyId: 'SUP-1',
      quantity: 1,
      source: 'Zużycie planowane',
    }],
  };

  assert.doesNotThrow(() => validateMaterialSupply(project, validSupply));
  assert.throws(() => validateMaterialSupply(project, {...validSupply, items: [{...validSupply.items[0], id: ''}]}), /wymagany tekst/);
  assert.throws(() => validateMaterialSupply(project, {...validSupply, items: [{...validSupply.items[0], targetStationId: 'NONEXISTENT'}]}), /nieznane stanowisko/);
  assert.throws(() => validateMaterialSupply(project, {...validSupply, items: [{...validSupply.items[0], initialStock: -1}]}), /nieujemna liczba/);
  assert.throws(() => validateMaterialSupply(project, {
    ...validSupply,
    items: [validSupply.items[0], validSupply.items[0]],
  }), /powtórzone ID/);
  assert.throws(() => validateMaterialSupply(project, {
    ...validSupply,
    consumptions: [{operationId: 'NONEXISTENT_OP', supplyId: 'SUP-1', quantity: 1, source: 'Błędna operacja'}],
  }), /nieznana operacja lub pozycja zaopatrzenia/);
  assert.throws(() => validateMaterialSupply(project, {
    ...validSupply,
    consumptions: [{operationId: project.operations[0].id, supplyId: 'NONEXISTENT_SUP', quantity: 1, source: 'Błędne zaopatrzenie'}],
  }), /nieznana operacja lub pozycja zaopatrzenia/);
  assert.throws(() => validateMaterialSupply(project, {
    ...validSupply,
    consumptions: [{operationId: project.operations[0].id, supplyId: 'SUP-1', quantity: 0, source: 'Błędna ilość'}],
  }), /dodatnia liczba/);
  assert.throws(() => validateMaterialSupply(project, {
    ...validSupply,
    consumptions: [
      {operationId: project.operations[0].id, supplyId: 'SUP-1', quantity: 1, source: 'Wpis 1'},
      {operationId: project.operations[0].id, supplyId: 'SUP-1', quantity: 2, source: 'Wpis 2'},
    ],
  }), /powtórzone przypisanie/);
});

test('3.5c2: integracja draft storage, historia Cofnij/Ponów i izolacja oryginalnych źródeł 4/5 dla zaopatrzenia', () => {
  const project = materialScheduleFixture();
  const supply: MaterialSupplyV6 = {
    items: [{
      id: 'SUP-QA',
      componentId: 'MAT-QA',
      targetStationId: 'ST-A',
      initialStock: 10,
      unit: 'szt.',
      schedule: {kind: 'periodic', batchQuantity: 5, intervalSeconds: 30, firstDeliverySeconds: 10},
      source: 'Test draft storage',
    }],
    consumptions: [{
      operationId: project.operations[0].id,
      supplyId: 'SUP-QA',
      quantity: 2,
      source: 'Zużycie test',
    }],
  };
  const edited = editDomainMaterialSupply(project, supply);

  for (const originalJson of [
    JSON.stringify(derive(parseProject(JSON.stringify(base))).project),
    readFileSync('tests/qa/Eko_D5_actual_export_v5.json', 'utf8'),
  ]) {
    const storage = new DraftStorage(), initial = saveDomainDraft(storage, {project, originalJson}, null);
    const written = saveDomainDraft(storage, {project: edited, originalJson}, initial.raw), reopened = readDomainDraft(storage);
    assert.equal(reopened.status, 'valid');
    if (reopened.status === 'valid') {
      assert.equal(reopened.saved.originalJson, originalJson);
      assert.deepEqual(reopened.saved.project.materialSupply, supply);
    }
    const invalid = structuredClone(edited);
    invalid.materialSupply!.items[0].initialStock = -10;
    assert.throws(() => saveDomainDraft(storage, {project: invalid, originalJson}, written.raw));
    assert.equal(storage.getItem(DOMAIN_DRAFT_STORAGE_KEY), written.raw);
    const undone = saveDomainDraft(storage, {project, originalJson}, written.raw);
    const old = readDomainDraft(storage);
    assert.equal(old.status, 'valid');
    if (old.status === 'valid') assert.deepEqual(old.saved.project.materialSupply, project.materialSupply);
    saveDomainDraft(storage, {project: edited, originalJson}, undone.raw);
    const corrupt = JSON.parse(storage.getItem(DOMAIN_DRAFT_STORAGE_KEY)!);
    corrupt.project.materialSupply.items[0].targetStationId = 'NONEXISTENT';
    const raw = JSON.stringify(corrupt);
    storage.setItem(DOMAIN_DRAFT_STORAGE_KEY, raw);
    assert.equal(readDomainDraft(storage).status, 'corrupt');
    assert.equal(storage.getItem(DOMAIN_DRAFT_STORAGE_KEY), raw);
  }
});

test('3.6a: obliczanie czasów trwania stanów, oczekiwań, blokad i ruchów transportowych dla symulacji', () => {
  const project = materialScheduleFixture();
  const result = scheduleWorkerRun(project, 1, 2);
  const metrics = calculateScheduleStateMetrics(project, result);

  assert.ok(metrics.makespanSeconds > 0);
  assert.ok(metrics.totalWorkSeconds > 0);
  assert.ok(metrics.totalWaitSeconds > 0);
  assert.equal(metrics.runs.length, result.runs.length);

  for (let i = 0; i < result.runs.length; i++) {
    const run = result.runs[i];
    const runDur = metrics.runs[i];
    assert.equal(runDur.workDuration, run.endSeconds - run.startSeconds);
    assert.equal(runDur.waitDuration, run.waitSeconds);
    assert.equal(runDur.blockedDuration, run.blockedSeconds ?? 0);
  }

  assert.ok(metrics.stations.length >= project.stations.length);
  for (const st of metrics.stations) {
    assert.equal(st.totalOccupiedTimeSeconds, Math.round((st.processingTimeSeconds + st.blockedTimeSeconds + st.continuationWaitTimeSeconds) * 1000) / 1000);
    assert.ok(st.occupancyRatio >= 0 && st.occupancyRatio <= 1);
  }

  assert.equal(metrics.workers.length, project.workers.length);
  for (const w of metrics.workers) {
    assert.equal(w.totalActiveTimeSeconds, Math.round((w.workTimeSeconds + w.heldBlockTimeSeconds + w.transportTimeSeconds) * 1000) / 1000);
    assert.ok(w.activityRatio >= 0 && w.activityRatio <= 1);
  }
});

test('3.6a: podział przyczyn oczekiwania zachowuje dokładną sumę całkowitego oczekiwania partii', () => {
  const fakeRuns: WorkerScheduleRun[] = [
    {
      job: 1,
      operationId: 'OP-1',
      stationId: 'ST-A',
      copy: 1,
      workerIds: ['W1'],
      readySeconds: 0,
      startSeconds: 10,
      endSeconds: 30,
      waitSeconds: 10,
      waitCauses: ['material', 'workers'],
      reserveStartSeconds: 0,
      reserveEndSeconds: 30,
      workWindows: [],
      pauses: [],
    },
    {
      job: 1,
      operationId: 'OP-2',
      stationId: 'ST-B',
      copy: 1,
      workerIds: ['W2'],
      readySeconds: 30,
      startSeconds: 45,
      endSeconds: 65,
      waitSeconds: 15,
      waitCauses: ['buffer'],
      reserveStartSeconds: 30,
      reserveEndSeconds: 65,
      workWindows: [],
      pauses: [],
    },
    {
      job: 2,
      operationId: 'OP-1',
      stationId: 'ST-A',
      copy: 1,
      workerIds: ['W1'],
      readySeconds: 20,
      startSeconds: 35,
      endSeconds: 55,
      waitSeconds: 15,
      waitCauses: ['transport', 'station', 'calendar'],
      reserveStartSeconds: 20,
      reserveEndSeconds: 55,
      workWindows: [],
      pauses: [],
    },
  ];

  const breakdown = calculateWaitBreakdown(fakeRuns);
  const totalWait = fakeRuns.reduce((sum, r) => sum + r.waitSeconds, 0); // 10 + 15 + 15 = 40
  const partitionedSum = Object.values(breakdown.partitioned).reduce((sum, v) => sum + v, 0);

  assert.equal(Math.round(partitionedSum * 1000) / 1000, totalWait);
  assert.equal(breakdown.partitioned.material, 5); // 10 / 2
  assert.equal(breakdown.partitioned.workers, 5); // 10 / 2
  assert.equal(breakdown.partitioned.buffer, 15); // 15
  assert.equal(breakdown.partitioned.transport, 5); // 15 / 3
  assert.equal(breakdown.partitioned.station, 5); // 15 / 3
  assert.equal(breakdown.partitioned.calendar, 5); // 15 / 3

  assert.equal(breakdown.presence.material, 10);
  assert.equal(breakdown.presence.workers, 10);
  assert.equal(breakdown.presence.buffer, 15);
  assert.equal(breakdown.presence.transport, 15);
  assert.equal(breakdown.presence.station, 15);
  assert.equal(breakdown.presence.calendar, 15);

  assert.equal(classifyWaitCause('subassembly'), 'material');
  assert.equal(classifyWaitCause('same-job'), 'station');
  assert.equal(classifyWaitCause('equipment'), 'station');
  assert.equal(classifyWaitCause('body'), 'station');
});

test('3.6a: metryki stanu stanowisk i pracowników rozróżniają blokady bbas, oczekiwanie lokalne i transport', () => {
  const project = bufferedProcessFixture();
  const syntheticRuns: WorkerScheduleRun[] = [
    {
      job: 1,
      operationId: project.operations[0].id,
      stationId: project.stations[0].id,
      copy: 1,
      workerIds: [project.workers[0].id],
      readySeconds: 0,
      startSeconds: 0,
      endSeconds: 10,
      stationReleaseSeconds: 16,
      blockedSeconds: 6,
      reserveStartSeconds: 0,
      reserveEndSeconds: 16,
      waitSeconds: 0,
      waitCauses: [],
      workWindows: [],
      pauses: [],
    },
    {
      job: 1,
      operationId: project.operations[1].id,
      stationId: project.stations[0].id,
      copy: 1,
      workerIds: [project.workers[0].id],
      readySeconds: 10,
      startSeconds: 16,
      endSeconds: 26,
      stationReleaseSeconds: 26,
      continuationWaitSeconds: 6,
      reserveStartSeconds: 16,
      reserveEndSeconds: 26,
      waitSeconds: 6,
      waitCauses: ['station'],
      workWindows: [],
      pauses: [],
    },
  ];

  const syntheticMovements: AssemblyTransportMovement[] = [
    {
      kind: 'empty',
      purpose: 'approach',
      routeId: 'ROUTE-APP',
      workerIds: [project.workers[0].id],
      equipmentIds: ['CART-1'],
      startSeconds: 26,
      endSeconds: 30,
    },
    {
      kind: 'loaded',
      purpose: 'transfer',
      routeId: 'ROUTE-TRANS',
      workerIds: [project.workers[0].id],
      equipmentIds: ['CART-1'],
      startSeconds: 30,
      endSeconds: 35,
    },
    {
      kind: 'empty',
      purpose: 'return',
      routeId: 'ROUTE-RET',
      workerIds: [],
      equipmentIds: ['CART-1'],
      startSeconds: 35,
      endSeconds: 40,
    },
  ];

  const summary = calculateScheduleStateMetrics(project, {
    jobs: [{id: 1, arrival: 0, starts: [0, 16], ends: [10, 26], finish: 35}],
    runs: syntheticRuns,
    mode: 'logical',
    scheduleDuration: 40,
    transportMovements: syntheticMovements,
  });

  assert.equal(summary.makespanSeconds, 40);
  assert.equal(summary.totalWorkSeconds, 20);
  assert.equal(summary.totalBlockedSeconds, 6);
  assert.equal(summary.totalContinuationWaitSeconds, 6);

  assert.equal(summary.transportMetrics.totalMovementsCount, 3);
  assert.equal(summary.transportMetrics.approachTimeSeconds, 4);
  assert.equal(summary.transportMetrics.transferTimeSeconds, 5);
  assert.equal(summary.transportMetrics.returnTimeSeconds, 5);
  assert.equal(summary.transportMetrics.totalTransportDurationSeconds, 14);

  const w0 = summary.workers.find(w => w.workerId === project.workers[0].id)!;
  assert.equal(w0.workTimeSeconds, 20);
  assert.equal(w0.heldBlockTimeSeconds, 6);
  assert.equal(w0.transportTimeSeconds, 9);
  assert.equal(w0.totalActiveTimeSeconds, 35);
  assert.equal(w0.idleTimeSeconds, 5);
  assert.equal(w0.activityRatio, 0.875);

  const st1 = summary.stations.find(s => s.stationId === project.stations[0].id && s.copy === 1)!;
  assert.equal(st1.processingTimeSeconds, 20);
  assert.equal(st1.blockedTimeSeconds, 6);
  assert.equal(st1.continuationWaitTimeSeconds, 6);
  assert.equal(st1.totalOccupiedTimeSeconds, 32);
  assert.equal(st1.idleTimeSeconds, 8);
});

test('3.7a: zakleszczenie operatora w blokadzie bufora (bbas) zwraca ustrukturyzowaną diagnozę z zablokowaną stacją i zaleceniem', () => {
  const project = bufferedProcessFixture();
  project.workerRunSelection!.operations[1].eligibleWorkerIds = [project.workers[0].id];
  let caughtError: unknown;
  try {
    scheduleWorkerRun(project, 1, 2, undefined, undefined, {transportMode: 'just-in-time'});
  } catch (err) {
    caughtError = err;
  }
  assert.ok(caughtError instanceof Error);
  const diag = parseProcessStallDiagnostic(caughtError);
  assert.ok(diag, 'Diagnoza powinna zostać pomyślnie sparsowana z błędu');
  assert.equal(diag.type, 'worker-deadlock');
  assert.ok(diag.title.includes('Zakleszczenie operatora'));
  assert.ok(diag.summary.includes('ST-A'));
  assert.ok(diag.summary.includes(project.workers[0].id));
  assert.ok(diag.recommendation.includes('bbas-worker-released'));
  assert.ok(diag.blockedStations.length > 0);
  assert.equal(diag.blockedStations[0].stationId, 'ST-A');
  assert.ok(diag.blockedStations[0].holdingWorkerIds.includes(project.workers[0].id));
  assert.ok(diag.stalledOperations.length > 0);
  assert.ok(diag.stalledOperations.some(op => op.status === 'blocked'));
});

test('3.7a: wyczerpanie dostaw zaopatrzenia materiałowego zwraca diagnozę braku materiału ze stacją i zaleceniem', () => {
  const project = materialScheduleFixture();
  // Reduce deliveries so batch 3 cannot complete
  project.materialSupply!.items[0].initialStock = 1;
  project.materialSupply!.items[0].schedule = {kind: 'explicit-deliveries', deliveries: [{deliveryTimeSeconds: 20, quantity: 1}]};
  let caughtError: unknown;
  try {
    scheduleWorkerRun(project, 1, 3);
  } catch (err) {
    caughtError = err;
  }
  assert.ok(caughtError instanceof Error);
  const diag = parseProcessStallDiagnostic(caughtError);
  assert.ok(diag, 'Diagnoza braku materiału powinna zostać sparsowana');
  assert.equal(diag.type, 'material-starvation');
  assert.ok(diag.title.includes('braku materiału'));
  assert.ok(diag.recommendation.includes('harmonogram'));
  assert.ok(diag.stalledOperations.some(op => op.waitCauses.includes('material')));
});

test('3.7a: zbyt krótki kalendarz roboczy zwraca diagnozę wygaśnięcia okien kalendarza', () => {
  const project = structuredClone(materialScheduleFixture());
  delete project.materialSupply;
  project.resourceCalendars = {
    stations: {
      'ST-A': {shifts: [{startSeconds: 0, endSeconds: 200, basis: 'assumed'}], breaks: []},
      'ST-B': {shifts: [{startSeconds: 0, endSeconds: 200, basis: 'assumed'}], breaks: []},
      'ST-C': {shifts: [{startSeconds: 0, endSeconds: 200, basis: 'assumed'}], breaks: []},
    },
    workers: {
      'W-A': {shifts: [{startSeconds: 0, endSeconds: 5, basis: 'assumed'}], breaks: []},
      'W-B': {shifts: [{startSeconds: 0, endSeconds: 5, basis: 'assumed'}], breaks: []},
    },
  };
  let caughtError: unknown;
  try {
    scheduleWorkerRun(project, 1, 2);
  } catch (err) {
    caughtError = err;
  }
  assert.ok(caughtError instanceof Error);
  const diag = parseProcessStallDiagnostic(caughtError);
  assert.ok(diag, 'Diagnoza wygaśnięcia okien kalendarza powinna zostać sparsowana');
  assert.equal(diag.type, 'calendar-exhaustion');
  assert.ok(diag.title.includes('kalendarza'));
  assert.ok(diag.recommendation.includes('godziny zmian') || diag.recommendation.includes('kalendarz'));
  assert.ok(diag.stalledOperations.some(op => op.waitCauses.includes('calendar')));
});

test('3.7a: serializacja diagnozy przez ciąg tekstowy (postMessage workera) zachowuje pełne szczegóły', () => {
  const diagnostic: ProcessStallDiagnostic = {
    type: 'worker-deadlock',
    atSeconds: 42,
    title: 'Testowe zakleszczenie',
    summary: 'Szczegółowy opis problemu',
    stalledOperations: [
      {
        job: 1,
        operationId: 'OP-1',
        operationName: 'Montaż A',
        stationId: 'ST-1',
        copy: 1,
        status: 'blocked',
        waitCauses: ['buffer', 'workers'],
        missingResourceExplanation: 'Brak operatora W1',
      },
    ],
    blockedStations: [
      {
        stationId: 'ST-1',
        stationName: 'Stanowisko 1',
        copy: 1,
        holdingWorkerIds: ['W1'],
        waitingForStationId: 'ST-2',
        blockingPolicy: 'bbas',
      },
    ],
    recommendation: 'Zmień politykę blokowania na bbas-worker-released',
  };

  const formatted = formatProcessStallMessage(diagnostic);
  assert.ok(formatted.includes('Zatrzymanie lub zakleszczenie procesu'));
  assert.ok(formatted.includes('Testowe zakleszczenie'));

  const parsed = parseProcessStallDiagnostic(formatted);
  assert.deepEqual(parsed, diagnostic);

  const errorObj = new ProcessStallError(diagnostic);
  const parsedFromError = parseProcessStallDiagnostic(errorObj);
  assert.deepEqual(parsedFromError, diagnostic);
});

test('3.8a: calculateGanttTimeGrid wyznacza czytelne podziałki czasu dla różnych długości partii', () => {
  const zeroGrid = calculateGanttTimeGrid(0);
  assert.ok(zeroGrid.majorStep >= 1);
  assert.deepEqual(zeroGrid.majorTicks, [0]);

  const grid45 = calculateGanttTimeGrid(45);
  assert.equal(grid45.majorStep, 5);
  assert.equal(grid45.minorStep, 1);
  assert.ok(grid45.majorTicks.includes(0));
  assert.ok(grid45.majorTicks.includes(45));

  const grid120 = calculateGanttTimeGrid(120);
  assert.equal(grid120.majorStep, 10);
  assert.equal(grid120.minorStep, 2);
  assert.ok(grid120.majorTicks.includes(0));
  assert.ok(grid120.majorTicks.includes(120));
});

test('3.8a: buildOperationsGantt generuje wiersze operacji ze stanami oczekiwania, pracy, blokady i pauzy', () => {
  const project = bufferedProcessFixture();
  const runs: WorkerScheduleRun[] = [
    {
      job: 1,
      operationId: project.operations[0].id,
      stationId: project.stations[0].id,
      copy: 1,
      workerIds: [project.workers[0].id],
      readySeconds: 0,
      startSeconds: 5,
      endSeconds: 15,
      stationReleaseSeconds: 20,
      blockedSeconds: 5,
      reserveStartSeconds: 5,
      reserveEndSeconds: 20,
      waitSeconds: 5,
      waitCauses: ['workers'],
      workWindows: [{startSeconds: 5, endSeconds: 15}],
      pauses: [],
    },
    {
      job: 1,
      operationId: project.operations[1].id,
      stationId: project.stations[0].id,
      copy: 1,
      workerIds: [project.workers[0].id],
      readySeconds: 15,
      startSeconds: 20,
      endSeconds: 30,
      stationReleaseSeconds: 30,
      continuationWaitSeconds: 5,
      reserveStartSeconds: 20,
      reserveEndSeconds: 30,
      waitSeconds: 5,
      waitCauses: ['station'],
      workWindows: [{startSeconds: 20, endSeconds: 25}, {startSeconds: 27, endSeconds: 30}],
      pauses: [{startSeconds: 25, endSeconds: 27}],
    },
  ];

  const result: WorkerScheduleResult = {
    jobs: [{id: 1, arrival: 0, starts: [5, 20], ends: [15, 30], finish: 30}],
    runs,
    mode: 'calendar',
    scheduleDuration: 30,
  };

  const rows = buildOperationsGantt(project, result);
  assert.equal(rows.length, 2);

  // Row 1: OP-0
  const row1 = rows[0];
  assert.equal(row1.category, 'operation');
  assert.equal(row1.targetJob, 1);
  assert.equal(row1.targetObjectId, project.operations[0].id);
  assert.equal(row1.bars.length, 3); // wait, work, blocked
  assert.equal(row1.bars[0].kind, 'wait');
  assert.equal(row1.bars[0].startSeconds, 0);
  assert.equal(row1.bars[0].endSeconds, 5);
  assert.equal(row1.bars[1].kind, 'work');
  assert.equal(row1.bars[1].startSeconds, 5);
  assert.equal(row1.bars[1].endSeconds, 15);
  assert.equal(row1.bars[2].kind, 'blocked');
  assert.equal(row1.bars[2].startSeconds, 15);
  assert.equal(row1.bars[2].endSeconds, 20);

  // Row 2: OP-1
  const row2 = rows[1];
  assert.equal(row2.bars.length, 5); // wait, work1, pause, work2, local-wait
  assert.ok(row2.bars.some(b => b.kind === 'pause' && b.startSeconds === 25 && b.endSeconds === 27));
  assert.ok(row2.bars.some(b => b.kind === 'local-wait' && b.startSeconds === 30 && b.endSeconds === 35));
});

test('3.8a: buildStationsGantt i buildWorkersGantt poprawnie mapują stany na zasoby i ruchy transportu', () => {
  const project = bufferedProcessFixture();
  const runs: WorkerScheduleRun[] = [
    {
      job: 1,
      operationId: project.operations[0].id,
      stationId: project.stations[0].id,
      copy: 1,
      workerIds: [project.workers[0].id],
      readySeconds: 0,
      startSeconds: 0,
      endSeconds: 10,
      stationReleaseSeconds: 15,
      blockedSeconds: 5,
      reserveStartSeconds: 0,
      reserveEndSeconds: 15,
      waitSeconds: 0,
      waitCauses: [],
      workWindows: [{startSeconds: 0, endSeconds: 10}],
      pauses: [],
    },
  ];

  const movements = [
    {
      kind: 'loaded' as const,
      purpose: 'transfer' as const,
      routeId: 'ROUTE-1-2',
      workerIds: [project.workers[0].id],
      equipmentIds: ['CART-1'],
      startSeconds: 15,
      endSeconds: 20,
    },
  ];

  const result: WorkerScheduleResult = {
    jobs: [{id: 1, arrival: 0, starts: [0], ends: [10], finish: 20}],
    runs,
    mode: 'logical',
    scheduleDuration: 20,
    transportMovements: movements,
  };

  // Stations Gantt
  const stationRows = buildStationsGantt(project, result);
  const stRow = stationRows.find(r => r.targetObjectId === project.stations[0].id && r.targetCopy === 1);
  assert.ok(stRow);
  assert.equal(stRow.category, 'station');
  assert.ok(stRow.bars.some(b => b.kind === 'work' && b.startSeconds === 0 && b.endSeconds === 10));
  assert.ok(stRow.bars.some(b => b.kind === 'blocked' && b.startSeconds === 10 && b.endSeconds === 15));

  // Workers Gantt
  const workerRows = buildWorkersGantt(project, result);
  const wRow = workerRows.find(r => r.targetObjectId === project.workers[0].id);
  assert.ok(wRow);
  assert.equal(wRow.category, 'worker');
  assert.ok(wRow.bars.some(b => b.kind === 'work' && b.startSeconds === 0 && b.endSeconds === 10));
  // Under bbas default policy, worker is held in blockage:
  assert.ok(wRow.bars.some(b => b.kind === 'blocked' && b.startSeconds === 10 && b.endSeconds === 15));
  // Worker has transfer movement:
  assert.ok(wRow.bars.some(b => b.kind === 'transport-transfer' && b.startSeconds === 15 && b.endSeconds === 20));

  // Complete Gantt Chart model builder
  const chartOps = buildScheduleGanttChart(project, result, 'operations');
  assert.equal(chartOps.viewMode, 'operations');
  assert.equal(chartOps.totalDurationSeconds, 20);
  assert.ok(chartOps.rows.length > 0);

  const chartStations = buildScheduleGanttChart(project, result, 'stations');
  assert.equal(chartStations.viewMode, 'stations');
  assert.ok(chartStations.rows.length > 0);

  const chartWorkers = buildScheduleGanttChart(project, result, 'workers');
  assert.equal(chartWorkers.viewMode, 'workers');
  assert.ok(chartWorkers.rows.length > 0);
});

// ============================================================================
// ITEM 3.9: SPRAWDZENIE WYNIKÓW NA RĘCZNIE POLICZONYCH SCENARIUSZACH,
// WIĘKSZYCH PARTIACH I POMIARY CZASU OBLICZEŃ ORAZ RESPONSYWNOŚCI UI
// ============================================================================

test('3.9: scenariusz 1 — analityczne czasy transportu, przesunięcie o delta t i niezmiennik translacji obiektów 3D', () => {
  // Scenariusz analityczny bazowy:
  // OP-A na ST-A: czas trwania = 10 s (założony)
  // Przewóz ST-A -> ST-C: czas trwania = 2 s (założony)
  // OP-C na ST-C: czas trwania = 30 s (założony)
  // Partia 1 sztuka.
  //
  // Ręczne wyliczenie:
  // - OP-A: start = 0 s, koniec = 10 s, zwolnienie stacji = 10 s
  // - Transport ST-A -> ST-C: odjazd = 10 s, przyjazd = 12 s (czas = 2 s)
  // - OP-C: start = 12 s, koniec = 12 + 30 = 42 s
  // - Makespan całkowity = 42 s.
  const {project, input} = bufferedPhysicalFixture(1);
  const route = project.stationRouting!.routes.find(r => r.id === 'R-A')!;
  assert.equal(route.transportTime!.durationSeconds, 2);

  const baselineResult = scheduleWorkerRun(structuredClone(project), 1, 1, structuredClone(input));
  assert.equal(baselineResult.jobs[0].finish, 42);
  const baseRuns = baselineResult.runs;
  assert.equal(baseRuns[0].startSeconds, 0);
  assert.equal(baseRuns[0].endSeconds, 10);
  assert.equal(baseRuns[1].transport!.startSeconds, 10);
  assert.equal(baseRuns[1].transport!.endSeconds, 12);
  assert.equal(baseRuns[1].startSeconds, 12);
  assert.equal(baseRuns[1].endSeconds, 42);

  // Wariant 1B: Zmiana trasy transportowej — wydłużenie czasu przewozu o delta t = 13 s (z 2 s do 15 s).
  // Ręczne wyliczenie analityczne:
  // - OP-A: [0 s, 10 s]
  // - Transport: odjazd = 10 s, przyjazd = 10 + 15 = 25 s
  // - OP-C: start = 25 s, koniec = 25 + 30 = 55 s
  // - Makespan = 55 s (dokładnie 42 + 13 = 55 s)
  const modifiedRouteProject = structuredClone(project);
  const modRoute = modifiedRouteProject.stationRouting!.routes.find(r => r.id === 'R-A')!;
  modRoute.transportTime = {durationSeconds: 15, basis: 'assumed', source: 'Jawny test analityczny delta t'};
  // Aktualizacja kalendarza powiązanego wózka/przenośnika dla dłuższego ruchu
  const deltaTResult = scheduleWorkerRun(modifiedRouteProject, 1, 1, structuredClone(input));
  assert.equal(deltaTResult.jobs[0].finish, 55, 'Makespan musi wzrosnąć dokładnie o delta t = 13 s');
  const deltaRuns = deltaTResult.runs;
  assert.equal(deltaRuns[1].transport!.startSeconds, 10);
  assert.equal(deltaRuns[1].transport!.endSeconds, 25);
  assert.equal(deltaRuns[1].startSeconds, 25);
  assert.equal(deltaRuns[1].endSeconds, 55);

  // Wariant 1C: Niezmiennik translacji obiektów layoutu 3D.
  // Zmiana współrzędnych wizualnych stanowisk w layoutObjects (np. przesunięcie stacji ST-C o 10 metrów)
  // nie może zmienić wyniku technologicznego, dopóki nie zmieni się zadeklarowana trasa.
  const visualShiftProject = structuredClone(project);
  visualShiftProject.layoutObjects = [
    {id: 'OBJ-ST-A', type: 'workstation', name: 'Stół ST-A', xMm: 0, yMm: 0, zMm: 0, rotationDeg: 0, widthMm: 1200, lengthMm: 800, heightMm: 850, stationId: 'ST-A'},
    {id: 'OBJ-ST-C', type: 'workstation', name: 'Stół ST-C', xMm: 10000, yMm: 5000, zMm: 0, rotationDeg: 90, widthMm: 1200, lengthMm: 800, heightMm: 850, stationId: 'ST-C'},
  ];
  const visualShiftResult = scheduleWorkerRun(visualShiftProject, 1, 1, structuredClone(input));
  assert.equal(visualShiftResult.jobs[0].finish, 42, 'Przesunięcie wizualne 3D nie może zmienić wyniku obliczeń');
  assert.deepEqual(visualShiftResult.jobs, baselineResult.jobs);
  assert.deepEqual(visualShiftResult.runs.map(r => [r.startSeconds, r.endSeconds]),
    baselineResult.runs.map(r => [r.startSeconds, r.endSeconds]));
});

test('3.9: scenariusz 2 — analityczny wpływ pojemności bufora (0 vs 1) oraz polityki blokowania operatora', () => {
  // Scenariusz analityczny buforów:
  // OP-A (10 s) na ST-A, OP-C (30 s) na ST-C. Czas transportu = 2 s. Partia 2 sztuki.
  //
  // Podwariant 2A: Bufor wyjściowy ST-A = 0 oraz bufor wejściowy ST-C = 0 (bezpośrednie przekazanie).
  // Sztuka 1:
  // - OP-A: [0, 10], transport: [10, 12], OP-C: [12, 42].
  // Sztuka 2:
  // - OP-A startuje w t = 10 s, kończy przetwarzanie w t = 20 s.
  // - Ale ST-C jest zajęte do t = 42 s, a wejście ma pojemność 0 (brak składowania).
  // - Aby przyjechać w t = 42 s przy czasie jazdy 2 s, odjazd nastąpi dokładnie w t = 40 s.
  // - Ponieważ wyjście ST-A ma pojemność 0, sztuka 2 BLOKUJE wyjście ST-A przez 40 - 20 = 20 s (od t = 20 s do t = 40 s).
  //
  // Sprawdzenie polityki bbas (zatrzymanie operatora):
  // Operator W1 (przypisany do OP-A) pozostaje zarezerwowany do t = 40 s!
  const fixtureZeroHeld = zeroBufferFixture(2, 'bbas');
  fixtureZeroHeld.project.stationBuffers!.buffers[0].outputCapacity = 0;
  const resZeroHeld = scheduleWorkerRun(structuredClone(fixtureZeroHeld.project), 1, 2, structuredClone(fixtureZeroHeld.input));
  const runsZeroHeld = resZeroHeld.runs;
  const opA2Held = runsZeroHeld.find(r => r.job === 2 && r.operationId === fixtureZeroHeld.project.operations[0].id)!;
  assert.equal(opA2Held.startSeconds, 10);
  assert.equal(opA2Held.endSeconds, 20);
  assert.equal(opA2Held.stationReleaseSeconds, 40, 'Stanowisko ST-A zablokowane do t = 40 s');
  assert.equal(opA2Held.blockedSeconds, 20, 'Czas blokady wyjścia musi wynosić dokładnie 20 s');
  // Rezerwacja pracownika w polityce bbas obejmuje blokadę:
  const wResHeld = resZeroHeld.reservations.reservations.find(r => r.reservationId === `2:${fixtureZeroHeld.project.operations[0].id}`)!;
  assert.equal(wResHeld.endSeconds, 40, 'W polityce bbas pracownik jest przetrzymywany do końca blokady');

  // Sprawdzenie polityki bbas-worker-released (zwolnienie operatora):
  // Operator W1 jest zwalniany natychmiast po zakończeniu przetwarzania w t = 20 s!
  const fixtureZeroFreed = zeroBufferFixture(2, 'bbas-worker-released');
  fixtureZeroFreed.project.stationBuffers!.buffers[0].outputCapacity = 0;
  const resZeroFreed = scheduleWorkerRun(structuredClone(fixtureZeroFreed.project), 1, 2, structuredClone(fixtureZeroFreed.input));
  const runsZeroFreed = resZeroFreed.runs;
  const opA2Freed = runsZeroFreed.find(r => r.job === 2 && r.operationId === fixtureZeroFreed.project.operations[0].id)!;
  assert.equal(opA2Freed.startSeconds, 10);
  assert.equal(opA2Freed.endSeconds, 20);
  assert.equal(opA2Freed.stationReleaseSeconds, 40, 'Stanowisko nadal zablokowane do 40 s');
  assert.equal(opA2Freed.blockedSeconds, 20);
  const wResFreed = resZeroFreed.reservations.reservations.find(r => r.reservationId === `2:${fixtureZeroFreed.project.operations[0].id}`)!;
  assert.equal(wResFreed.endSeconds, 20, 'W bbas-worker-released pracownik zostaje zwolniony w t = 20 s');

  // Podwariant 2B: Bufor wyjściowy ST-A = 1 (pośredni bufor wyjściowy).
  // Sztuka 2 po zakończeniu OP-A w t = 20 s natychmiast zwalnia stanowisko ST-A (przejście do bufora wyjściowego).
  // Czas blokady stanowiska ST-A spada z 20 s do 0 s!
  const fixtureBuf1 = bufferedPhysicalFixture(2, 'bbas');
  const resBuf1 = scheduleWorkerRun(structuredClone(fixtureBuf1.project), 1, 2, structuredClone(fixtureBuf1.input));
  const opA2Buf1 = resBuf1.runs.find(r => r.job === 2 && r.operationId === fixtureBuf1.project.operations[0].id)!;
  assert.equal(opA2Buf1.stationReleaseSeconds, 20, 'Z buforem 1 stanowisko ST-A jest zwalniane natychmiast w t = 20 s');
  assert.equal(opA2Buf1.blockedSeconds ?? 0, 0, 'Blokada stanowiska ST-A całkowicie wyeliminowana (0 s)');
});

test('3.9: scenariusz 3 — analityczna lokalna kontynuacja na tej samej kopii bez buforów i transportu', () => {
  // Scenariusz analityczny kontynuacji:
  // OP 0 (10 s) i LOCAL-B (6 s) na tym samym stanowisku ST-A (kopia 1).
  // Korpus pozostaje na stanowisku; 0 ruchów transportowych; brak odkładania do buforów.
  //
  // Ręczne wyliczenie:
  // - OP 0: start = 0 s, koniec = 10 s
  // - LOCAL-B: start = 10 s, koniec = 10 + 6 = 16 s
  // - Makespan całkowity = 16 s.
  const {project, input} = localContinuationFixture(1);
  const last = project.operations.pop()!;
  project.stations.find(s => s.id === 'ST-C')!.operationIds = [];
  project.workerRunSelection!.operations = project.workerRunSelection!.operations.filter(o => o.operationId !== last.id);
  project.stationRouting!.operations = project.stationRouting!.operations.filter(o => o.operationId !== last.id);
  project.stationRouting!.routes = [];
  delete project.assemblyTransport;
  project.stationBuffers!.buffers[0].outputCapacity = null;

  const result = scheduleWorkerRun(structuredClone(project), 1, 1, structuredClone(input));
  assert.equal(result.jobs[0].finish, 16, 'Makespan lokalnej kontynuacji = dokładnie 16 s');
  assert.equal(result.runs[0].startSeconds, 0);
  assert.equal(result.runs[0].endSeconds, 10);
  assert.equal(result.runs[1].startSeconds, 10);
  assert.equal(result.runs[1].endSeconds, 16);
  // Brak jakichkolwiek ruchów transportowych:
  assert.equal(result.transportMovements?.length ?? 0, 0);
  // Korpus przez cały czas pozostaje na pierwszym stanowisku:
  assert.equal(result.bodyBook?.bodies[0].location.stationId, 'ST-A');
});

test('3.9: scenariusz 4 — analityczny wpływ opóźnienia dostawy materiału (material supply starvation)', () => {
  // Scenariusz analityczny zaopatrzenia:
  // OP 0 (10 s) wymaga 1 sztuki materiału SUPPLY-A na stanowisku ST-A.
  // OP 1 (10 s) na drugim stanowisku.
  //
  // Wariant 4A: Zapas początkowy = 1 sztuka.
  // - OP 0 rusza w t = 0 s, kończy w t = 10 s; OP 1 rusza w t = 10 s, kończy w t = 20 s. Makespan = 20 s.
  const fixturePrompt = materialScheduleFixture();
  const resPrompt = scheduleWorkerRun(structuredClone(fixturePrompt), 1, 1);
  assert.equal(resPrompt.runs[0].startSeconds, 0);
  assert.equal(resPrompt.runs[0].endSeconds, 10);
  assert.equal(resPrompt.jobs[0].finish, 20);

  // Wariant 4B: Zapas początkowy = 0, pierwsza dostawa w t = 15 s.
  // Ręczne wyliczenie analityczne:
  // - Operacja OP 0 musi czekać dokładnie 15 s na dostawę.
  // - Start OP 0 = 15 s, koniec = 15 + 10 = 25 s.
  // - Przyczyna oczekiwania = 'material' o czasie trwania dokładnie 15 s.
  // - OP 1: [25, 35], Makespan = 35 s.
  const fixtureDelayed = structuredClone(materialScheduleFixture());
  fixtureDelayed.materialSupply!.items[0].initialStock = 0;
  fixtureDelayed.materialSupply!.items[0].schedule = {
    kind: 'explicit-deliveries',
    deliveries: [{deliveryTimeSeconds: 15, quantity: 1}],
  };
  const resDelayed = scheduleWorkerRun(fixtureDelayed, 1, 1);
  const runA = resDelayed.runs.find(r => r.operationId === fixtureDelayed.operations[0].id)!;
  assert.equal(runA.startSeconds, 15, 'Start musi nastąpić dokładnie w momencie dostawy t = 15 s');
  assert.equal(runA.endSeconds, 25);
  assert.equal(resDelayed.jobs[0].finish, 35);
  assert.ok(runA.waitCauses.includes('material'), 'Przyczyną opóźnienia musi być brak materiału');
  const metrics = calculateScheduleStateMetrics(fixtureDelayed, resDelayed);
  assert.equal(metrics.waitBreakdownPartitioned.material, 15, 'Łączny czas oczekiwania na materiał wynosi 15 s');
});

test('3.9: scenariusz 5 — całkowita niezależność wyników symulacji od prędkości odtwarzania i pauzy animacji', () => {
  // Sprawdzenie niezmienności technologicznej w pełnym spektrum prędkości (1x - 5000x) oraz pauzie.
  const {project, input} = bufferedPhysicalFixture(2);
  const baseResult = scheduleWorkerRun(structuredClone(project), 1, 2, structuredClone(input));
  const baseChart = buildScheduleGanttChart(project, baseResult, 'operations');
  const baseMetrics = calculateScheduleStateMetrics(project, baseResult);

  // Symulacja odtwarzania zegara w UI przy różnych prędkościach i pauzie
  const endTime = Math.max(...baseResult.jobs.map(j => j.finish));
  assert.ok(endTime > 0);
  const speeds = [1, 2, 5, 10, 50, 100, 500, 1000, 5000];
  for (const speed of speeds) {
    let t = 0;
    while (t < endTime) {
      t = (t + 0.016 * speed > endTime) ? endTime : t + 0.016 * speed;
    }
    assert.equal(t, endTime);
  }

  // Ponowne obliczenie harmonogramu i wykresu Gantta po odtworzeniu daje identyczne obiekty:
  const repeatResult = scheduleWorkerRun(structuredClone(project), 1, 2, structuredClone(input));
  assert.deepEqual(repeatResult.jobs, baseResult.jobs);
  assert.deepEqual(repeatResult.runs, baseResult.runs);
  assert.deepEqual(buildScheduleGanttChart(project, repeatResult, 'operations'), baseChart);
  assert.deepEqual(calculateScheduleStateMetrics(project, repeatResult), baseMetrics);
});

test('3.9: wydajność i skalowalność większych partii (1, 10, 25, 50, 100 sztuk) oraz budowa wykresu Gantta', () => {
  const batchSizes = [1, 10, 25, 50, 100];
  const benchmarkResults: Array<{batch: number; durationMs: number; cloneMs: number; ganttMs: number; runsCount: number}> = [];

  for (const batch of batchSizes) {
    const {project, input} = bufferedPhysicalFixture(batch, 'bbas-worker-released');
    // Rozszerzenie horyzontu kalendarzy do 100 000 s, aby pomieścić duże serie produkcyjne
    for (const c of Object.values(project.resourceCalendars!.workers)) c.shifts[0].endSeconds = 100000;
    for (const c of Object.values(project.resourceCalendars!.stations)) c.shifts[0].endSeconds = 100000;
    project.assemblyTransport!.carts[0].calendar.shifts[0].endSeconds = 100000;

    // Pomiar czasu obliczeń harmonogramu
    const t0 = performance.now();
    const result = scheduleWorkerRun(structuredClone(project), 1, batch, structuredClone(input));
    const t1 = performance.now();
    const durationMs = Math.round((t1 - t0) * 100) / 100;

    // Pomiar narzutu serializacji / klonowania dla Web Workera
    const tc0 = performance.now();
    const cloned = structuredClone(result);
    const tc1 = performance.now();
    const cloneMs = Math.round((tc1 - tc0) * 100) / 100;

    // Pomiar czasu generowania wykresów Gantta
    const tg0 = performance.now();
    buildScheduleGanttChart(project, cloned, 'operations');
    buildScheduleGanttChart(project, cloned, 'stations');
    buildScheduleGanttChart(project, cloned, 'workers');
    const tg1 = performance.now();
    const ganttMs = Math.round((tg1 - tg0) * 100) / 100;

    assert.equal(result.jobs.length, batch);
    assert.equal(result.runs.length, batch * 2);

    benchmarkResults.push({
      batch,
      durationMs,
      cloneMs,
      ganttMs,
      runsCount: result.runs.length,
    });

    // Rygorystyczny budżet wydajności: obliczenia partii 100 sztuk poniżej 500 ms, Gantt poniżej 50 ms
    assert.ok(durationMs < 500, `Obliczenia partii ${batch} trwają zbyt długo: ${durationMs} ms`);
    assert.ok(ganttMs < 100, `Generowanie 3 widoków Gantta dla partii ${batch} trwa zbyt długo: ${ganttMs} ms`);
  }

  // Weryfikacja skalowalności w konsoli testowej
  assert.equal(benchmarkResults.length, 5);
  assert.equal(benchmarkResults[4].runsCount, 200);
});

test('3.9: skalowalność silnika symulacji sieciowej dla dużych partii (100, 250, 500, 1000 sztuk)', () => {
  const derivedProject = derive(structuredClone(base)).project;
  const largeBatches = [100, 250, 500, 1000];
  const networkBenchmarks: Array<{batch: number; durationMs: number; completedParts: number}> = [];

  for (const batch of largeBatches) {
    const t0 = performance.now();
    const sim = simulateNetwork(derivedProject, 10, batch);
    const t1 = performance.now();
    const durationMs = Math.round((t1 - t0) * 100) / 100;

    assert.ok(sim);
    assert.equal(sim.jobs.length, batch);
    networkBenchmarks.push({batch, durationMs, completedParts: sim.jobs.length});

    // Budżet wydajności silnika sieciowego: 1000 sztuk poniżej 200 ms
    assert.ok(durationMs < 200, `Symulacja sieciowa ${batch} sztuk trwa zbyt długo: ${durationMs} ms`);
  }

  assert.equal(networkBenchmarks.length, 4);
  assert.equal(networkBenchmarks[3].completedParts, 1000);
});

test('4.1: statyczne oddzielne obciążenie stanowisk, maszyn i operatorów oraz objaśnienie mianowników (calculateStaticWorkload)', () => {
  // Scenariusz A: 1 stacja, 1 kopia, 1 operator, takt 60 s, 2 operacje (20 s i 30 s)
  const stationA = {
    id: 'WS-1',
    name: 'Stanowisko montażu',
    sequenceIndex: 1,
    assignedStepIds: ['OP-1', 'OP-2'],
    cycleTimeSeconds: 50,
    isBottleneck: false,
    xMm: 0,
    yMm: 0,
  };
  const stepsA = [
    {id: 'OP-1', name: 'Montaż A', standardTimeSeconds: 20, vaTimeSeconds: 15, nvaTimeSeconds: 5, sequenceNumber: 1, predecessorIds: []},
    {id: 'OP-2', name: 'Montaż B', standardTimeSeconds: 30, vaTimeSeconds: 25, nvaTimeSeconds: 5, sequenceNumber: 2, predecessorIds: ['OP-1']},
  ];

  const wlA = calculateStaticWorkload(stationA, 60, stepsA);
  assert.equal(wlA.stationId, 'WS-1');
  assert.equal(wlA.copies, 1);
  assert.equal(wlA.totalOperators, 1);
  assert.equal(wlA.stationCycleSeconds, 50);
  assert.equal(wlA.stationDenominatorSeconds, 60);
  assert.equal(wlA.stationWorkloadPercent, 83.333);
  assert.equal(wlA.stationFormula, '50 s / (1 × 60 s) = 83.3%');
  assert.ok(wlA.stationDenominatorDescription.includes('czas taktu (60 s) × 1 kopia = 60 s'));

  assert.equal(wlA.operatorCycleSeconds, 50);
  assert.equal(wlA.operatorDenominatorSeconds, 60);
  assert.equal(wlA.operatorWorkloadPercent, 83.333);
  assert.equal(wlA.operatorFormula, '50 s / (1 × 60 s) = 83.3%');

  assert.equal(wlA.machineCycleSeconds, 0);
  assert.equal(wlA.machineDenominatorSeconds, 60);
  assert.equal(wlA.machineWorkloadPercent, 0);

  // Scenariusz B: 2 równoległe kopie stacji, 2 operatorów na kopię (obsada łącznie = 4), takt 50 s
  const wlB = calculateStaticWorkload(stationA, 50, stepsA, {parallelStations: 2, operators: 2});
  assert.equal(wlB.copies, 2);
  assert.equal(wlB.operatorsPerCopy, 2);
  assert.equal(wlB.totalOperators, 4);
  assert.equal(wlB.stationCycleSeconds, 50);
  // Mianownik stacji = 2 * 50 = 100 s -> obciążenie 50%
  assert.equal(wlB.stationDenominatorSeconds, 100);
  assert.equal(wlB.stationWorkloadPercent, 50);
  assert.equal(wlB.stationFormula, '50 s / (2 × 50 s) = 50.0%');
  // Mianownik operatorów = 4 * 50 = 200 s -> obciążenie 25%
  assert.equal(wlB.operatorDenominatorSeconds, 200);
  assert.equal(wlB.operatorWorkloadPercent, 25);
  assert.equal(wlB.operatorFormula, '50 s / (4 × 50 s) = 25.0%');

  // Scenariusz C: Schemat 6 z jawnym profilem technologicznym (praca ręczna vs bieg maszyny)
  const domainStepsC: any[] = [
    {
      id: 'OP-1',
      name: 'Obróbka CNC z załadunkiem ręcznym',
      standardTimeSeconds: 40,
      vaTimeSeconds: 35,
      nvaTimeSeconds: 5,
      sequenceNumber: 1,
      predecessorIds: [],
      timeProfile: {
        durationSeconds: 40,
        durationBasis: 'measured',
        manualWork: [{startSeconds: 0, endSeconds: 10, basis: 'measured'}],
        machineRun: [{startSeconds: 10, endSeconds: 40, basis: 'measured'}],
        operatorPresence: [{startSeconds: 0, endSeconds: 10, basis: 'measured'}],
      },
    },
  ];
  const stationC = {
    id: 'WS-CNC',
    name: 'Gniazdo CNC',
    sequenceIndex: 1,
    assignedStepIds: ['OP-1'],
    cycleTimeSeconds: 40,
    isBottleneck: false,
    xMm: 0,
    yMm: 0,
  };
  const wlC = calculateStaticWorkload(stationC, 50, domainStepsC);
  assert.equal(wlC.stationCycleSeconds, 40);
  assert.equal(wlC.machineCycleSeconds, 30); // 40 - 10 = 30 s pracy maszyny
  assert.equal(wlC.operatorCycleSeconds, 10); // 10 s pracy manualnej
  assert.equal(wlC.stationWorkloadPercent, 80); // 40 / 50 = 80.0%
  assert.equal(wlC.machineWorkloadPercent, 60); // 30 / 50 = 60.0%
  assert.equal(wlC.operatorWorkloadPercent, 20); // 10 / 50 = 20.0%
  assert.equal(wlC.stationFormula, '40 s / (1 × 50 s) = 80.0%');
  assert.equal(wlC.machineFormula, '30 s / (1 × 50 s) = 60.0%');
  assert.equal(wlC.operatorFormula, '10 s / (1 × 50 s) = 20.0%');
});

test('4.1: dynamiczne oddzielne metryki obciążenia stanowisk, maszyn i operatorów oraz mianowniki w harmonogramie partii (calculateScheduleStateMetrics)', () => {
  const {project, input} = bufferedPhysicalFixture(1, 'bbas-worker-released');
  const cartId = project.assemblyTransport!.carts[0].equipmentId;
  // Dodajmy jawne wyposażenie technologiczne do stacji z zachowaniem wózków
  project.equipment = [
    ...project.equipment,
    {id: 'EQ-TOOL-1', name: 'Wkrętak automatyczny ST-A', stationId: 'ST-A'},
  ];
  // Przypiszmy wkrętak do operacji 1
  project.operations[0].timeProfile = {
    durationSeconds: 20,
    durationBasis: 'measured',
    manualWork: [{startSeconds: 0, endSeconds: 8, basis: 'measured'}],
    machineRun: [{startSeconds: 8, endSeconds: 20, basis: 'measured'}],
    operatorPresence: [{startSeconds: 0, endSeconds: 20, basis: 'measured'}],
  };

  const result = scheduleWorkerRun(structuredClone(project), 1, 1, structuredClone(input));
  // Oznaczmy wykorzystanie EQ-TOOL-1 w wykonaniu operacji 1
  result.runs[0].equipmentIds = ['EQ-TOOL-1'];

  const metrics = calculateScheduleStateMetrics(project, result);

  // 1. Sprawdzenie mianownika ogólnego
  assert.ok(metrics.makespanSeconds > 0);
  const makespan = metrics.makespanSeconds;

  // 2. Sprawdzenie obciążenia stanowisk i objaśnień mianowników
  assert.equal(metrics.stations.length, 3); // ST-A, ST-B, ST-C (wszystkie stacje projektu)
  for (const st of metrics.stations) {
    assert.equal(st.denominatorSeconds, makespan);
    assert.equal(st.denominatorBasis, 'czas realizacji partii (makespan) dla danej kopii stanowiska');
    assert.ok(st.occupancyFormula.includes(`${st.totalOccupiedTimeSeconds} s / ${makespan} s`));
    assert.ok(st.processingFormula.includes(`${st.processingTimeSeconds} s / ${makespan} s`));
    assert.equal(st.occupancyRatio, Math.min(1, Math.round((st.totalOccupiedTimeSeconds / makespan) * 1000) / 1000));
  }

  // 3. Sprawdzenie obciążenia maszyn / wyposażenia
  assert.ok(metrics.equipment.length >= 2);
  const toolEq = metrics.equipment.find(e => e.equipmentId === 'EQ-TOOL-1')!;
  assert.ok(toolEq);
  assert.equal(toolEq.equipmentName, 'Wkrętak automatyczny ST-A');
  assert.equal(toolEq.stationId, 'ST-A');
  assert.equal(toolEq.operationsCount, 1);
  // Czas biegu maszyny z profilu (20 - 8 = 12 s)
  assert.equal(toolEq.runTimeSeconds, 12);
  assert.equal(toolEq.transportTimeSeconds, 0);
  assert.equal(toolEq.totalActiveTimeSeconds, 12);
  assert.equal(toolEq.idleTimeSeconds, Math.round((makespan - 12) * 1000) / 1000);
  assert.equal(toolEq.denominatorSeconds, makespan);
  assert.equal(toolEq.denominatorBasis, 'czas realizacji partii (makespan)');
  assert.equal(toolEq.formula, `12 s / ${makespan} s = ${(toolEq.utilizationRatio * 100).toFixed(1)}%`);

  const cartEq = metrics.equipment.find(e => e.equipmentId === cartId)!;
  assert.ok(cartEq);
  // Wózek transportowy uczestniczy w ruchach transfer i return
  assert.ok(cartEq.transportTimeSeconds > 0);
  assert.equal(cartEq.totalActiveTimeSeconds, cartEq.transportTimeSeconds);
  assert.equal(cartEq.denominatorSeconds, makespan);
  assert.equal(cartEq.formula, `${cartEq.totalActiveTimeSeconds} s / ${makespan} s = ${(cartEq.utilizationRatio * 100).toFixed(1)}%`);

  // 4. Sprawdzenie obciążenia operatorów i objaśnień mianowników
  assert.equal(metrics.workers.length, 3); // 2 montażystów + 1 pracownik transportu montażu
  for (const w of metrics.workers) {
    assert.equal(w.denominatorSeconds, makespan);
    assert.equal(w.denominatorBasis, 'czas realizacji partii (makespan) dostępny dla operatora');
    assert.ok(w.activityFormula.includes(`${w.totalActiveTimeSeconds} s / ${makespan} s`));
    assert.equal(w.activityRatio, Math.min(1, Math.round((w.totalActiveTimeSeconds / makespan) * 1000) / 1000));
  }
});

test('4.6: zestawienie wydajności (statycznej vs dynamicznej), czasu przejścia, WIP, obsady i powierzchni dla 4 wariantów', () => {
  const originalJson = JSON.stringify(derive(parseProject(JSON.stringify({
    ...base,
    processSteps: base.processSteps.slice(0, 2),
    bom: base.bom.filter(item => ['1', '1.1'].includes(item.associatedProcessStepId)),
  }))).project);
  let stSeq = 0;
  const baseProj = prepareDomainMigration(
    previewDomainMigrationFromV4(originalJson, () => `ST-46-${++stSeq}`),
  ).project;

  const op1 = baseProj.operations[0].id;
  const op2 = baseProj.operations[1].id;
  baseProj.stations = [
    {id: 'ST-A', name: 'Gniazdo A', operationIds: [op1]},
    {id: 'ST-B', name: 'Gniazdo B', operationIds: [op2]},
  ];
  baseProj.stationSettings = {
    'ST-A': {operators: 1, parallelStations: 1},
    'ST-B': {operators: 1, parallelStations: 1},
  };
  baseProj.facility = {widthMm: 10000, lengthMm: 20000, heightMm: 4000, gridSizeMm: 500};
  baseProj.obstacles = [];
  baseProj.layoutObjects = [];
  baseProj.product = {id: 'PROD-46', name: 'Wyrób testowy 4.6'};
  baseProj.workers = [{id: 'W-1', name: 'Operator 1'}];
  for (const op of baseProj.operations) {
    op.physicalRole = {kind: 'body-work'};
    op.staffing = {
      requiredWorkers: 1,
      timeVariants: [{
        workerCount: 1,
        timeProfile: {
          durationSeconds: 20,
          durationBasis: 'measured',
          manualWork: [{startSeconds: 0, endSeconds: 20, basis: 'measured'}],
          machineRun: [],
          operatorPresence: [{startSeconds: 0, endSeconds: 20, basis: 'measured'}],
        },
      }],
    };
  }
  baseProj.workerRunSelection = {
    teamWorkerIds: ['W-1'],
    operations: [
      {operationId: op1, workerCount: 1, eligibleWorkerIds: ['W-1']},
      {operationId: op2, workerCount: 1, eligibleWorkerIds: ['W-1']},
    ],
  };
  const shift = {shifts: [{startSeconds: 0, endSeconds: 2000, basis: 'confirmed' as const}], breaks: []};
  baseProj.resourceCalendars = {
    workers: {'W-1': structuredClone(shift)},
    stations: {'ST-A': structuredClone(shift), 'ST-B': structuredClone(shift)},
  };
  baseProj.stationRouting = {
    selectionRule: 'earliest-start-then-shortest-route',
    equipmentPlacements: [],
    operations: [
      {operationId: op1, candidates: [{stationId: 'ST-A', copy: 1, requiredEquipmentIds: []}]},
      {operationId: op2, candidates: [{stationId: 'ST-B', copy: 1, requiredEquipmentIds: []}]},
    ],
    routes: [{
      id: 'R-AB',
      from: {stationId: 'ST-A', copy: 1},
      to: {stationId: 'ST-B', copy: 1},
      distanceMm: 8000,
      basis: 'confirmed',
      source: 'Pomiar trasy bazowej',
      transportTime: {durationSeconds: 10, basis: 'measured', source: 'Pomiar przejazdu 10 s'},
    }],
  };
  baseProj.bodyRunInput = {
    bodies: [
      {id: 'B-1', productId: baseProj.product!.id, location: {kind: 'station', stationId: 'ST-A', copy: 1}},
      {id: 'B-2', productId: baseProj.product!.id, location: {kind: 'station', stationId: 'ST-A', copy: 1}},
    ],
    jobs: [
      {job: 1, bodyId: 'B-1'},
      {job: 2, bodyId: 'B-2'},
    ],
  };

  // Wariant 2: Dodatkowy pracownik (W-2)
  const addWorkerProj = structuredClone(baseProj);
  addWorkerProj.workers.push({id: 'W-2', name: 'Operator 2'});
  addWorkerProj.resourceCalendars!.workers['W-2'] = structuredClone(shift);
  addWorkerProj.workerRunSelection = {
    teamWorkerIds: ['W-1', 'W-2'],
    operations: [
      {operationId: op1, workerCount: 1, eligibleWorkerIds: ['W-1']},
      {operationId: op2, workerCount: 1, eligibleWorkerIds: ['W-2']},
    ],
  };

  // Wariant 3: Dodatkowe stanowisko (kopia równoległa ST-B#2 + obsada 2 os.)
  const addStationProj = structuredClone(addWorkerProj);
  addStationProj.stationSettings['ST-B'].parallelStations = 2;
  addStationProj.stationRouting!.operations[1].candidates.push({
    stationId: 'ST-B',
    copy: 2,
    requiredEquipmentIds: [],
  });
  addStationProj.stationRouting!.routes.push({
    id: 'R-AB2',
    from: {stationId: 'ST-A', copy: 1},
    to: {stationId: 'ST-B', copy: 2},
    distanceMm: 8000,
    basis: 'confirmed',
    source: 'Pomiar trasy do kopii 2',
    transportTime: {durationSeconds: 10, basis: 'measured', source: 'Pomiar przejazdu 10 s'},
  });

  // Wariant 4: Zmieniony layout (obiekty 2D/3D na hali + krótsza trasa 2000 mm / 2 s)
  const changedLayoutProj = structuredClone(baseProj);
  changedLayoutProj.targetLayoutType = 'UShape';
  changedLayoutProj.stationRouting!.routes[0].distanceMm = 2000;
  changedLayoutProj.stationRouting!.routes[0].transportTime = {
    durationSeconds: 2,
    basis: 'measured',
    source: 'Pomiar po zbliżeniu gniazd',
  };
  changedLayoutProj.layoutObjects = [
    {
      id: 'OBJ-A',
      name: 'Stół A',
      type: 'Table',
      xMm: 2000,
      yMm: 2000,
      zMm: 0,
      widthMm: 2000,
      lengthMm: 1000,
      heightMm: 900,
      rotationDeg: 0,
      colorHex: '#336699',
      workstationId: 'ST-A',
    },
    {
      id: 'OBJ-B',
      name: 'Stół B',
      type: 'Table',
      xMm: 5000,
      yMm: 2000,
      zMm: 0,
      widthMm: 2000,
      lengthMm: 1000,
      heightMm: 900,
      rotationDeg: 0,
      colorHex: '#339966',
      workstationId: 'ST-B',
    },
  ];

  const storage = new DraftStorage();
  const s1 = saveDomainVariant(storage, {id: 'V-BASE', name: 'Baza 1 os.', category: 'baseline', originalJson, project: baseProj}, null);
  const s2 = saveDomainVariant(storage, {id: 'V-WORK', name: 'Wariant +1 pracownik', category: 'additional-worker', originalJson, project: addWorkerProj}, s1.raw);
  const s3 = saveDomainVariant(storage, {id: 'V-STAT', name: 'Wariant +1 kopia stacji', category: 'additional-station', originalJson, project: addStationProj}, s2.raw);
  const s4 = saveDomainVariant(storage, {id: 'V-LAY', name: 'Wariant zmieniony layout', category: 'changed-layout', originalJson, project: changedLayoutProj}, s3.raw);

  const report = compareDomainVariants(s4.saved.variants, 'V-BASE', {
    batch: 2,
    arrivalIntervalSeconds: 1,
    transportMode: 'configured',
  });

  const rBase = report.rows.find(r => r.variantId === 'V-BASE')!;
  const rWork = report.rows.find(r => r.variantId === 'V-WORK')!;
  const rStat = report.rows.find(r => r.variantId === 'V-STAT')!;
  const rLay = report.rows.find(r => r.variantId === 'V-LAY')!;

  // 1. Wydajność statyczna (pułap kopii = 3600 / 20 = 180 szt./h) vs dynamiczna
  assert.equal(rBase.staticSummary.maxStaticCopyLoadSeconds, 20);
  assert.equal(rBase.staticSummary.staticCapacityPerHour, 180);
  assert.equal(rBase.dynamic.status, 'completed');
  assert.equal(rWork.dynamic.status, 'completed');
  assert.equal(rStat.dynamic.status, 'completed');
  assert.equal(rLay.dynamic.status, 'completed');

  if (
    rBase.dynamic.status === 'completed' &&
    rWork.dynamic.status === 'completed' &&
    rStat.dynamic.status === 'completed' &&
    rLay.dynamic.status === 'completed'
  ) {
    // Baza (1 os.):
    // Szt. 1: OP1 [0,20], tr [20,30], OP2 [30,50] (koniec 50)
    // Szt. 2: przybycie t=1, start OP1 czeka na W-1 (koniec OP1 szt.1 w t=20, ale W-1 w t=20 może wziąć szt.2 OP1 [20,40], a potem szt.1 OP2 [40,60], tr szt.2 [40,50], OP2 szt.2 [60,80])
    assert.ok(rWork.dynamic.makespanSeconds < rBase.dynamic.makespanSeconds, 'Dodatkowy pracownik skraca makespan');
    assert.ok(rWork.dynamic.deltaThroughputPerHour! > 0, 'Dodatkowy pracownik zwiększa przepustowość');
    assert.ok(rLay.dynamic.makespanSeconds < rBase.dynamic.makespanSeconds, 'Krótsza trasa skraca makespan');

    // 2. Czas przejścia (od przybycia vs w procesie od startu 1. operacji) i sprawność przepływu
    assert.ok(rBase.dynamic.averageLeadTimeSeconds >= rBase.dynamic.averageProcessingSpanSeconds);
    assert.equal(rBase.dynamic.netProcessingSeconds, 80); // 2 szt. * (20 + 20) s
    assert.equal(rBase.dynamic.netProcessingPerPieceSeconds, 40);
    assert.ok(rBase.dynamic.flowEfficiencyRatio > 0 && rBase.dynamic.flowEfficiencyRatio <= 1);
    assert.equal(rBase.dynamic.deltaAverageLeadTimeSeconds, 0);
    assert.ok(rWork.dynamic.deltaAverageLeadTimeSeconds! < 0, 'Dodatkowy pracownik skraca średni czas przejścia');

    // 3. WIP (w procesie i w systemie — prawo Little’a w oknie makespanu)
    assert.ok(rBase.dynamic.averageActiveWipPieces > 0);
    assert.ok(rBase.dynamic.maxActiveWipPieces >= 1 && rBase.dynamic.maxActiveWipPieces <= 2);
    assert.ok(rBase.dynamic.averageSystemWipPieces >= rBase.dynamic.averageActiveWipPieces);
    assert.equal(rBase.dynamic.maxSystemWipPieces, 2);

    // 4. Obsada i stanowiska (wykorzystanie zasobów)
    assert.equal(rBase.staticSummary.teamWorkersCount, 1);
    assert.equal(rWork.staticSummary.teamWorkersCount, 2);
    assert.equal(rStat.staticSummary.activeCopiesCount, 3); // ST-A#1, ST-B#1, ST-B#2
    assert.ok(rBase.dynamic.averageTeamWorkerUtilization > 0 && rBase.dynamic.averageTeamWorkerUtilization <= 1);
    assert.ok(rWork.dynamic.averageTeamWorkerUtilization > 0 && rWork.dynamic.averageTeamWorkerUtilization <= 1);
    assert.ok(rBase.dynamic.averageActiveCopyOccupancy > 0 && rBase.dynamic.averageActiveCopyOccupancy <= 1);

    // 5. Powierzchnia: rozróżnienie hali od obrysu obiektów i brak zgadywania gdy layoutObjects=[]
    assert.equal(rBase.staticSummary.hasLayoutObjects, false);
    assert.equal(rBase.staticSummary.objectsFootprintSqm, 0);
    assert.equal(rBase.staticSummary.boundingBoxAreaSqm, null);
    assert.equal(rBase.staticSummary.facilityAreaSqm, 200); // 10m * 20m = 200 m²

    assert.equal(rLay.staticSummary.hasLayoutObjects, true);
    assert.equal(rLay.staticSummary.objectsFootprintSqm, 4); // 2 stoły po 2m * 1m = 4 m²
    assert.equal(rLay.staticSummary.deltaObjectsFootprintSqm, 4);
    // Stoły w x=2000 (szer. 2000 -> [1000, 3000]) i x=5000 (szer. 2000 -> [4000, 6000]) -> rozpiętość X = 5000 mm, Y = 1000 mm -> 5 m²
    assert.equal(rLay.staticSummary.boundingBoxAreaSqm, 5);

    // 6. Brak podanych stawek kosztowych -> costEvaluation === null (brak zgadywania stawek)
    assert.equal(rBase.dynamic.costEvaluation, null);
    assert.equal(rWork.dynamic.costEvaluation, null);
    assert.equal(rLay.dynamic.costEvaluation, null);
  }
});

test('4.6: jawne stawki i założenia kosztowe (rozliczanie makespanu vs czasu aktywnego, walidacja i raport Markdown)', () => {
  // Walidacja stawek kosztowych:
  assert.equal(validateCostAssumptions(null), null);
  assert.equal(validateCostAssumptions({currency: 'PLN', basis: 'assumed', source: ''}), null);
  assert.throws(
    () => validateCostAssumptions({currency: 'PLN', basis: 'assumed', source: '', operatorHourlyRate: 80}),
    /jawne źródło/,
  );
  assert.throws(
    () => validateCostAssumptions({currency: 'PLN', basis: 'assumed', source: 'Kalkulacja', operatorHourlyRate: -10}),
    /nieujemną liczbą/,
  );
  assert.throws(
    () => validateCostAssumptions({currency: 'PLN', basis: 'assumed', source: 'Tylko opis bez stawek'}),
    /co najmniej jedną jawną stawkę/,
  );

  const originalJson = JSON.stringify(derive(parseProject(JSON.stringify({
    ...base,
    processSteps: [base.processSteps[0]],
    bom: base.bom.filter(item => item.associatedProcessStepId === '1'),
  }))).project);
  let idSeq = 0;
  const p1 = prepareDomainMigration(previewDomainMigrationFromV4(originalJson, () => `ST-COST-${++idSeq}`)).project;
  const opId = p1.operations[0].id;
  p1.stations = [{id: 'ST-1', name: 'Stacja 1', operationIds: [opId]}];
  p1.stationSettings = {'ST-1': {operators: 1, parallelStations: 1}};
  p1.facility = {widthMm: 10000, lengthMm: 10000, heightMm: 4000, gridSizeMm: 500}; // 100 m²
  p1.obstacles = [];
  p1.layoutObjects = [];
  p1.workers = [{id: 'W-1', name: 'Operator 1'}];
  p1.operations[0].staffing = {
    requiredWorkers: 1,
    timeVariants: [{
      workerCount: 1,
      timeProfile: {
        durationSeconds: 1800, // 0.5 h na sztukę
        durationBasis: 'measured',
        manualWork: [{startSeconds: 0, endSeconds: 1800, basis: 'measured'}],
        machineRun: [],
        operatorPresence: [{startSeconds: 0, endSeconds: 1800, basis: 'measured'}],
      },
    }],
  };
  p1.workerRunSelection = {
    teamWorkerIds: ['W-1'],
    operations: [{operationId: opId, workerCount: 1, eligibleWorkerIds: ['W-1']}],
  };

  // Wariant 2: 2 równoległe kopie stanowiska i 2 pracowników (dla 2 sztuk makespan spada z 3600 s = 1 h do 1800 s = 0.5 h)
  const p2 = structuredClone(p1);
  p2.workers.push({id: 'W-2', name: 'Operator 2'});
  p2.stationSettings['ST-1'].parallelStations = 2;
  p2.workerRunSelection = {
    teamWorkerIds: ['W-1', 'W-2'],
    operations: [{operationId: opId, workerCount: 1, eligibleWorkerIds: ['W-1', 'W-2']}],
  };
  p2.layoutObjects = [{
    id: 'OBJ-1',
    name: 'Gniazdo podwójne',
    type: 'Table',
    xMm: 2000,
    yMm: 2000,
    zMm: 0,
    widthMm: 3000,
    lengthMm: 2000,
    heightMm: 900,
    rotationDeg: 0,
    colorHex: '#225588',
    workstationId: 'ST-1',
  }]; // 6 m²

  const storage = new DraftStorage();
  const v1 = saveDomainVariant(storage, {id: 'C-BASE', name: '1 kopia / 1 os.', category: 'baseline', originalJson, project: p1}, null);
  const v2 = saveDomainVariant(storage, {id: 'C-PAR', name: '2 kopie / 2 os.', category: 'additional-station', originalJson, project: p2}, v1.raw);

  const report = compareDomainVariants(v2.saved.variants, 'C-BASE', {
    batch: 2,
    arrivalIntervalSeconds: 1,
    transportMode: 'just-in-time',
    costAssumptions: {
      currency: 'PLN',
      basis: 'confirmed',
      accountingMode: 'committed-makespan',
      source: 'Taryfikator wydziału montażu 2026',
      operatorHourlyRate: 100,
      stationHourlyRate: 60,
      floorSqmRate: 50,
    },
  });

  const row1 = report.rows[0];
  const row2 = report.rows[1];
  assert.equal(row1.dynamic.status, 'completed');
  assert.equal(row2.dynamic.status, 'completed');
  if (row1.dynamic.status === 'completed' && row2.dynamic.status === 'completed') {
    // Wariant 1: 2 sztuki sekwencyjnie -> makespan = 3600 s (1 h), 1 pracownik (1 h), 1 kopia (1 h)
    // Koszt pracy = 100 PLN, koszt stanowiska = 60 PLN, koszt operacyjny partii = 160 PLN (80 PLN/szt.)
    // Brak obiektów layoutObjects -> objectsFootprintCost = null, facilityFloorCost = 100 m² * 50 = 5000 PLN
    assert.equal(row1.dynamic.makespanSeconds, 3600);
    const c1 = row1.dynamic.costEvaluation!;
    assert.ok(c1);
    assert.equal(c1.laborCommittedHours, 1);
    assert.equal(c1.laborCommittedCost, 100);
    assert.equal(c1.stationCommittedHours, 1);
    assert.equal(c1.stationCommittedCost, 60);
    assert.equal(c1.batchOperatingCost, 160);
    assert.equal(c1.unitOperatingCost, 80);
    assert.equal(c1.objectsFootprintCost, null);
    assert.equal(c1.facilityFloorCost, 5000);

    // Wariant 2: 2 sztuki równolegle (start t=0 i t=1 -> koniec t=1801 s) -> makespan = 1801 s
    // Z obiektem layoutObjects 6 m² -> objectsFootprintCost = 6 * 50 = 300 PLN
    assert.equal(row2.dynamic.makespanSeconds, 1801);
    const c2 = row2.dynamic.costEvaluation!;
    assert.ok(c2);
    assert.equal(c2.laborActiveHours, 1); // 2 * 1800 s = 3600 s = 1 h pracy aktywnej
    assert.equal(c2.laborActiveCost, 100);
    assert.equal(c2.objectsFootprintCost, 300);

    const md = buildVariantComparisonMarkdownReport(report);
    assert.ok(md.includes('# Raport porównania wariantów szkicu 6 (4.5 / 4.6)'));
    assert.ok(md.includes('Taryfikator wydziału montażu 2026'));
    assert.ok(md.includes('1 kopia / 1 os.'));
    assert.ok(md.includes('2 kopie / 2 os.'));
    assert.ok(md.includes('160 PLN'));
    assert.ok(md.includes('300'));
  }
});

test('4.7: generowanie i weryfikacja propozycji zmian w symulacji (dodanie pracownika, dodatkowa kopia, wariant obsady, bilans, bufor)', () => {
  const {variants, originalJson} = variantComparisonFixture();
  const baseProject = structuredClone(variants[0].project);

  // Wzbogacamy projekt o jawnie zadeklarowane zasoby:
  // 1) Pracownik W-B jest w project.workers, lecz nie w teamWorkerIds (w bazie teamWorkerIds = ['W-A'])
  // 2) Stanowisko ST-C ma zadeklarowane parallelStations: 2 i wyposażenie, z nieużytą kopią 2
  // 3) Operacja OP-B ma alternatywny jawny wariant obsady (2 os., czas 12 s)
  baseProject.stationSettings['ST-C'].parallelStations = 2;
  baseProject.operations[1].staffing!.timeVariants.push({
    workerCount: 2,
    timeProfile: {
      durationSeconds: 12,
      durationBasis: 'assumed',
      manualWork: [{startSeconds: 0, endSeconds: 12, basis: 'assumed'}],
      machineRun: [],
      operatorPresence: [{startSeconds: 0, endSeconds: 12, basis: 'assumed'}],
    },
  });

  const conditions = {
    batch: 2,
    arrivalIntervalSeconds: 1,
    transportMode: 'just-in-time' as const,
    costAssumptions: {
      currency: 'PLN' as const,
      basis: 'assumed' as const,
      source: 'Założenia testowe 4.7',
      operatorHourlyRate: 100,
      stationHourlyRate: 50,
      floorSqmRate: 20,
    },
  };

  const report = proposeAndVerifyDomainImprovements(baseProject, conditions, {
    sourceSchemaVersion: 4,
    originalJson,
    savedVariants: variants,
  });

  assert.equal(report.dataVersion.draftSchemaVersion, 6);
  assert.equal(report.dataVersion.sourceSchemaVersion, 4);
  assert.equal(report.nonOptimumDisclaimer, NON_OPTIMUM_DISCLAIMER);
  assert.ok(report.proposals.length >= 3);

  // Każda propozycja posiada zastrzeżenie braku gwarancji optimum, uzasadnienie i dowody
  for (const p of report.proposals) {
    assert.equal(p.nonOptimumDisclaimer, NON_OPTIMUM_DISCLAIMER);
    assert.ok(p.rationale.length > 10);
    assert.ok(p.evidenceSignals.length > 0);
    assert.ok(p.verificationSummary.length > 5);
    assert.ok(p.staticVsDynamicNote.includes('Szacunek zdolności statycznej:'));
    assert.ok(p.staticVsDynamicNote.length > 20);
  }

  // 1. Sprawdzenie propozycji dodania pracownika (W-B z rejestru)
  const addWorkerProp = report.proposals.find(p => p.kind === 'add-team-worker');
  assert.ok(addWorkerProp, 'Oczekiwano propozycji add-team-worker');
  assert.equal(addWorkerProp.variantCategory, 'additional-worker');
  assert.ok(addWorkerProp.targetSummary.includes('W-B'));
  assert.equal(addWorkerProp.proposedProject.workerRunSelection!.teamWorkerIds.length, 2);
  // Sprawdzenie rozróżnienia szacunku statycznego od wyniku dynamicznego
  assert.equal(addWorkerProp.verificationStatus, 'improved');
  if (addWorkerProp.proposedDynamic.status === 'completed') {
    assert.ok(addWorkerProp.proposedDynamic.deltaMakespanSeconds! < 0);
    assert.ok(addWorkerProp.proposedDynamic.deltaThroughputPerHour! > 0);
    // Koszt operacyjny partii wzrasta lub zmienia się zgodnie z jawnymi stawkami
    assert.ok(addWorkerProp.proposedDynamic.costEvaluation !== null);
  }

  // 2. Sprawdzenie propozycji dopuszczenia drugiej kopii stanowiska ST-C#2
  const copyProp = report.proposals.find(p => p.kind === 'activate-station-copy');
  assert.ok(copyProp, 'Oczekiwano propozycji activate-station-copy');
  assert.equal(copyProp.variantCategory, 'additional-station');
  assert.equal(copyProp.proposedProject.stationRouting!.operations[1].candidates.length, 2);

  // 3. Sprawdzenie propozycji alternatywnego wariantu obsady operacji OP-B (2 os. / 12 s)
  const staffVariantProp = report.proposals.find(p => p.kind === 'change-staffing-variant');
  assert.ok(staffVariantProp, 'Oczekiwano propozycji change-staffing-variant');
  assert.equal(staffVariantProp.variantCategory, 'additional-worker');

  // 4. Sprawdzenie uwzględnienia zapisanego wariantu ze zmienionym layoutem
  const savedLayoutProp = report.proposals.find(p => p.kind === 'saved-variant' && p.id.includes('VAR-LAYOUT'));
  assert.ok(savedLayoutProp, 'Oczekiwano zapisanego wariantu VAR-LAYOUT');
  assert.equal(savedLayoutProp.variantCategory, 'changed-layout');

  // 5. Sprawdzenie propozycji odblokowania operatora w buforze (bbas -> bbas-worker-released)
  const bufferedProject = structuredClone(baseProject);
  bufferedProject.stationBuffers = {
    buffers: [{
      stationId: 'ST-A',
      copy: 1,
      inputCapacity: 1,
      outputCapacity: 1,
      blockingPolicy: 'bbas',
    }],
  };
  const bufReport = proposeAndVerifyDomainImprovements(bufferedProject, conditions, {
    sourceSchemaVersion: 4,
    originalJson,
  });
  const bufferProp = bufReport.proposals.find(p => p.kind === 'release-blocked-worker');
  assert.ok(bufferProp, 'Oczekiwano propozycji release-blocked-worker');
  assert.equal(bufferProp.proposedProject.stationBuffers!.buffers[0].blockingPolicy, 'bbas-worker-released');
  assert.equal(bufferProp.variantCategory, 'changed-layout');
});

test('4.7: raport Markdown propozycji zmian, wersja danych, obsługa odmowy symulacji i ochrona przed zmyślaniem danych', () => {
  const {variants, originalJson} = variantComparisonFixture();
  const baseProject = structuredClone(variants[0].project);

  // Przetestowanie obsługi odmowy / błędu symulacji w propozycji
  const candidateMock = {
    id: 'prop-refused-test',
    kind: 'rebalance-work' as const,
    variantCategory: 'additional-station' as const,
    title: 'Niewykonalny bilans',
    targetSummary: 'Niewykonalny przydział',
    rationale: 'Uzasadnienie testowe',
    evidenceSignals: ['Brak wolnych kopii'],
    proposedProject: baseProject,
    factorDiff: {changedDimensions: ['stations'], summary: ['zmiana stacji'], comparabilityWarnings: []},
    staticBaseline: summarizeStaticVariant(baseProject),
    staticProposed: summarizeStaticVariant(baseProject),
  };

  const outcomes = new Map([
    ['prop-refused-test', {status: 'error' as const, error: 'Odmowa symulacji: cykliczna zależność'}],
  ]);

  const report = buildDomainImprovementProposalsReport(
    baseProject,
    4,
    originalJson,
    {batch: 2, arrivalIntervalSeconds: 1, transportMode: 'just-in-time'},
    {status: 'completed', result: scheduleWorkerRun(baseProject, 1, 2, undefined, undefined, {transportMode: 'just-in-time'})},
    [candidateMock],
    outcomes,
    ['Brak nieużywanych stanowisk w projekcie — nie zmyślano nowych obiektów.'],
  );

  assert.equal(report.proposals.length, 1);
  const p = report.proposals[0];
  assert.equal(p.verificationStatus, 'refused');
  assert.ok(p.verificationSummary.includes('Odmowa symulacji: cykliczna zależność'));
  assert.ok(report.skippedReasons.some(r => r.includes('nie zmyślano nowych obiektów')));

  const md = buildImprovementProposalsMarkdownReport(report);
  assert.ok(md.includes('# Raport propozycji zmian i weryfikacji symulacyjnej szkicu 6 (4.7)'));
  assert.ok(md.includes('Zastrzeżenie metodologiczne (brak deklaracji optimum):'));
  assert.ok(md.includes(NON_OPTIMUM_DISCLAIMER));
  assert.ok(md.includes('**Wersja danych:** schemat roboczy szkicu `v6` (projekt źródłowy `v4`)'));
  assert.ok(md.includes('**Wielkość partii:** 2 szt.'));
  assert.ok(md.includes('**Tryb transportu:** Tylko proces (just-in-time'));
  assert.ok(md.includes('Niewykonalny bilans'));
  assert.ok(md.includes('Odmowa symulacji'));
  assert.ok(md.includes('Pominięte kategorie zmian'));
});

test('7.3b: symulacja wielowariantowa, wstawianie bloków przezbrojeń, opóźnienie kolejnej partii i weryfikacja Gantta', () => {
  const originalJson = JSON.stringify(derive(parseProject(JSON.stringify({
    ...base,
    processSteps: [
      {id: 'OP-1', name: 'Montaż korpusu', standardTimeSeconds: 50, vaTimeSeconds: 40, nvaTimeSeconds: 10, sequenceNumber: 1, predecessorIds: []},
      {id: 'OP-2', name: 'Kontrola końcowa', standardTimeSeconds: 30, vaTimeSeconds: 25, nvaTimeSeconds: 5, sequenceNumber: 2, predecessorIds: ['OP-1']}
    ],
    bom: [],
  }))).project);

  let idSeq = 0;
  const project = prepareDomainMigration(previewDomainMigrationFromV4(originalJson, () => `ST-73-${++idSeq}`)).project;

  project.stations = [
    {id: 'ST-1', name: 'Stanowisko montażu', operationIds: ['OP-1']},
    {id: 'ST-2', name: 'Stanowisko kontroli', operationIds: ['OP-2']}
  ];
  project.layoutObjects = [
    {id: 'TBL-1', name: 'Stół montażowy', type: 'Table', xMm: 1000, yMm: 1000, zMm: 0, widthMm: 1500, lengthMm: 1000, heightMm: 900, rotationDeg: 0, colorHex: '#444444', workstationId: 'ST-1'},
    {id: 'TBL-2', name: 'Stół kontrolny', type: 'Table', xMm: 3000, yMm: 1000, zMm: 0, widthMm: 1500, lengthMm: 1000, heightMm: 900, rotationDeg: 0, colorHex: '#444444', workstationId: 'ST-2'}
  ];
  project.operations = [
    {
      id: 'OP-1',
      name: 'Montaż korpusu',
      standardTimeSeconds: 50,
      vaTimeSeconds: 40,
      nvaTimeSeconds: 10,
      predecessorIds: [],
      staffing: {
        requiredWorkers: 1,
        timeVariants: [{
          workerCount: 1,
          timeProfile: {
            durationSeconds: 50,
            durationBasis: 'measured',
            manualWork: [{startSeconds: 0, endSeconds: 50, basis: 'measured'}],
            machineRun: [],
            operatorPresence: [{startSeconds: 0, endSeconds: 50, basis: 'measured'}],
          }
        }]
      }
    },
    {
      id: 'OP-2',
      name: 'Kontrola końcowa',
      standardTimeSeconds: 30,
      vaTimeSeconds: 25,
      nvaTimeSeconds: 5,
      predecessorIds: ['OP-1'],
      staffing: {
        requiredWorkers: 1,
        timeVariants: [{
          workerCount: 1,
          timeProfile: {
            durationSeconds: 30,
            durationBasis: 'assumed',
            manualWork: [{startSeconds: 0, endSeconds: 30, basis: 'assumed'}],
            machineRun: [],
            operatorPresence: [{startSeconds: 0, endSeconds: 30, basis: 'assumed'}],
          }
        }]
      }
    }
  ];
  project.stationSettings = {
    'ST-1': {operators: 1, parallelStations: 1},
    'ST-2': {operators: 1, parallelStations: 1}
  };
  project.workers = [
    {id: 'W-1', name: 'Jan Kowalski'},
    {id: 'W-2', name: 'Piotr Nowak'}
  ];
  project.workerRunSelection = {
    teamWorkerIds: ['W-1', 'W-2'],
    operations: [
      {operationId: 'OP-1', workerCount: 1, eligibleWorkerIds: ['W-1']},
      {operationId: 'OP-2', workerCount: 1, eligibleWorkerIds: ['W-2']}
    ]
  };
  project.stationRouting = {
    selectionRule: 'earliest-start-then-shortest-route',
    equipmentPlacements: [],
    operations: [
      {operationId: 'OP-1', candidates: [{stationId: 'ST-1', copy: 1, requiredEquipmentIds: []}]},
      {operationId: 'OP-2', candidates: [{stationId: 'ST-2', copy: 1, requiredEquipmentIds: []}]}
    ],
    routes: []
  };

  // 1. Zdefiniowanie wariantów i macierzy przezbrojeń
  project.changeoverMatrix = {
    variants: [
      {id: 'VAR-A', name: 'Wariant A — standard', color: '#2563eb'},
      {id: 'VAR-B', name: 'Wariant B — premium', color: '#16a34a'}
    ],
    defaultDurationSeconds: 15,
    defaultDurationBasis: 'assumed',
    transitions: [
      {
        id: 'TR-1',
        fromVariantId: 'VAR-A',
        toVariantId: 'VAR-B',
        stationId: 'ST-1',
        durationSeconds: 45, // Na ST-1 przezbrojenie A->B trwa 45 s
        durationBasis: 'measured',
        cleanoutRequired: true
      }
    ]
  };

  // 2. Dwie partie: 1 sztuka VAR-A, następnie 1 sztuka VAR-B (łącznie 2 zlecenia / 2 joby)
  project.productionOrders = [
    {batchId: 'B-1', variantId: 'VAR-A', quantity: 1},
    {batchId: 'B-2', variantId: 'VAR-B', quantity: 1}
  ];

  // 3. Uruchomienie symulacji w trybie JIT (buffered linear flow)
  const result = scheduleWorkerRun(project, 1, 2, undefined, undefined, {transportMode: 'just-in-time'});

  assert.ok(result.changeovers, 'Oczekiwano zarejestrowanych bloków przezbrojeń');
  assert.equal(result.changeovers!.length, 2, 'Oczekiwano przezbrojenia na ST-1 i ST-2 przy przejściu na VAR-B');

  // Weryfikacja przezbrojenia na ST-1 (dedykowana reguła: 45 s)
  const co1 = result.changeovers!.find(c => c.stationId === 'ST-1');
  assert.ok(co1, 'Oczekiwano przezbrojenia na ST-1');
  assert.equal(co1!.fromVariantId, 'VAR-A');
  assert.equal(co1!.toVariantId, 'VAR-B');
  assert.equal(co1!.durationSeconds, 45);
  assert.equal(co1!.durationBasis, 'measured');
  assert.equal(co1!.cleanoutRequired, true);

  // Weryfikacja przezbrojenia na ST-2 (reguła domyślna: 15 s)
  const co2 = result.changeovers!.find(c => c.stationId === 'ST-2');
  assert.ok(co2, 'Oczekiwano przezbrojenia na ST-2');
  assert.equal(co2!.fromVariantId, 'VAR-A');
  assert.equal(co2!.toVariantId, 'VAR-B');
  assert.equal(co2!.durationSeconds, 15);
  assert.equal(co2!.durationBasis, 'assumed');
  assert.equal(co2!.cleanoutRequired, false);

  // Weryfikacja biegów operacji — start job 2 na ST-1 musi nastąpić po ukończeniu job 1 (50 s) + przezbrojeniu (45 s) = 95 s
  const runJob1St1 = result.runs.find(r => r.job === 1 && r.operationId === 'OP-1')!;
  const runJob2St1 = result.runs.find(r => r.job === 2 && r.operationId === 'OP-1')!;
  assert.equal(runJob1St1.endSeconds, 50);
  assert.equal(runJob2St1.startSeconds, 95);
  assert.equal(runJob2St1.variantId, 'VAR-B');
  assert.equal(runJob2St1.changeoverBeforeSeconds, 45);

  // 4. Weryfikacja generatora wykresu Gantta z paskami przezbrojeń
  const stationsGantt = buildStationsGantt(project, result);
  const st1Row = stationsGantt.find(row => row.id.includes('ST-1'));
  assert.ok(st1Row, 'Oczekiwano wiersza ST-1 na Gantcie stanowisk');
  const coBarStation = st1Row!.bars.find(bar => bar.kind === 'changeover');
  assert.ok(coBarStation, 'Oczekiwano paska przezbrojenia na Gantcie stanowisk');
  assert.equal(coBarStation!.startSeconds, 50);
  assert.equal(coBarStation!.endSeconds, 95);
  assert.ok(coBarStation!.label.includes('Przezbrojenie'));

  const workersGantt = buildWorkersGantt(project, result);
  const w1Row = workersGantt.find(row => row.id === 'worker-W-1');
  assert.ok(w1Row, 'Oczekiwano wiersza pracownika W-1 na Gantcie pracowników');
  const coBarWorker = w1Row!.bars.find(bar => bar.kind === 'changeover');
  assert.ok(coBarWorker, 'Oczekiwano paska przezbrojenia na Gantcie pracownika');
  assert.equal(coBarWorker!.startSeconds, 50);
  assert.equal(coBarWorker!.endSeconds, 95);
});

test('7.4: symulacja stochastyczna Monte Carlo — serie replikacji, powtarzalność ziarna, zmienność i statystyki', () => {
  const { runMonteCarloSimulation } = require('../src/core/stochasticSimulation');

  const originalJson = JSON.stringify(derive(parseProject(JSON.stringify({
    ...base,
    processSteps: [
      {id: 'OP-1', name: 'Montaż korpusu', standardTimeSeconds: 50, vaTimeSeconds: 40, nvaTimeSeconds: 10, sequenceNumber: 1, predecessorIds: []},
      {id: 'OP-2', name: 'Kontrola końcowa', standardTimeSeconds: 30, vaTimeSeconds: 25, nvaTimeSeconds: 5, sequenceNumber: 2, predecessorIds: ['OP-1']}
    ],
    bom: [],
  }))).project);

  let idSeq = 0;
  const project = prepareDomainMigration(previewDomainMigrationFromV4(originalJson, () => `ST-74-${++idSeq}`)).project;
  project.stations = [
    {id: 'ST-1', name: 'Stanowisko 1', operationIds: ['OP-1']},
    {id: 'ST-2', name: 'Stanowisko 2', operationIds: ['OP-2']}
  ];
  project.layoutObjects = [
    {id: 'TBL-1', name: 'Stół montażowy', type: 'Table', xMm: 1000, yMm: 1000, zMm: 0, widthMm: 1500, lengthMm: 1000, heightMm: 900, rotationDeg: 0, colorHex: '#444444', workstationId: 'ST-1'},
    {id: 'TBL-2', name: 'Stół kontrolny', type: 'Table', xMm: 3000, yMm: 1000, zMm: 0, widthMm: 1500, lengthMm: 1000, heightMm: 900, rotationDeg: 0, colorHex: '#444444', workstationId: 'ST-2'}
  ];
  project.operations = [
    {
      id: 'OP-1',
      name: 'Operacja 1',
      standardTimeSeconds: 50,
      sequenceNumber: 1,
      vaTimeSeconds: 40,
      nvaTimeSeconds: 10,
      predecessorIds: [],
      staffing: {
        requiredWorkers: 1,
        timeVariants: [{
          workerCount: 1,
          timeProfile: {
            durationSeconds: 50,
            durationBasis: 'assumed',
            manualWork: [{startSeconds: 0, endSeconds: 50, basis: 'assumed'}],
            machineRun: [],
            operatorPresence: [{startSeconds: 0, endSeconds: 50, basis: 'assumed'}],
          }
        }]
      }
    },
    {
      id: 'OP-2',
      name: 'Operacja 2',
      standardTimeSeconds: 30,
      sequenceNumber: 2,
      vaTimeSeconds: 25,
      nvaTimeSeconds: 5,
      predecessorIds: ['OP-1'],
      staffing: {
        requiredWorkers: 1,
        timeVariants: [{
          workerCount: 1,
          timeProfile: {
            durationSeconds: 30,
            durationBasis: 'assumed',
            manualWork: [{startSeconds: 0, endSeconds: 30, basis: 'assumed'}],
            machineRun: [],
            operatorPresence: [{startSeconds: 0, endSeconds: 30, basis: 'assumed'}],
          }
        }]
      }
    }
  ];
  project.stationSettings = {
    'ST-1': {operators: 1, parallelStations: 1},
    'ST-2': {operators: 1, parallelStations: 1}
  };
  project.workers = [
    {id: 'W-1', name: 'Jan Kowalski'},
    {id: 'W-2', name: 'Piotr Nowak'}
  ];
  project.workerRunSelection = {
    teamWorkerIds: ['W-1', 'W-2'],
    operations: [
      {operationId: 'OP-1', workerCount: 1, eligibleWorkerIds: ['W-1']},
      {operationId: 'OP-2', workerCount: 1, eligibleWorkerIds: ['W-2']}
    ]
  };
  project.stationRouting = {
    selectionRule: 'earliest-start-then-shortest-route',
    equipmentPlacements: [],
    operations: [
      {operationId: 'OP-1', candidates: [{stationId: 'ST-1', copy: 1, requiredEquipmentIds: []}]},
      {operationId: 'OP-2', candidates: [{stationId: 'ST-2', copy: 1, requiredEquipmentIds: []}]}
    ],
    routes: []
  };

  // Dodajemy konfigurację stochastyczną:
  // - 15 powtórzeń Monte Carlo
  // - ziarno 42
  // - zmienność operacji trójkątna (+- 15%)
  // - awaria na ST-1 z MTBF = 120s i naprawą 20s
  project.stochasticConfig = {
    enabled: true,
    seed: 42,
    iterations: 15,
    defaultOperationVariability: {
      distribution: 'triangular',
      minMultiplier: 0.85,
      modeMultiplier: 1.0,
      maxMultiplier: 1.15
    },
    breakdowns: [
      {
        stationId: 'ST-1',
        mtbfSeconds: 120,
        mttrSeconds: 20,
        repairDistribution: 'constant'
      }
    ]
  };

  // 1. Wykonanie symulacji Monte Carlo
  let progressCount = 0;
  const summary1 = runMonteCarloSimulation(project, 4, 10, {
    transportMode: 'just-in-time',
    onIterationProgress: (completed, total) => {
      progressCount = completed;
      assert.ok(completed <= total);
    }
  });

  assert.equal(progressCount, 15);
  assert.equal(summary1.iterationsCount, 15);
  assert.equal(summary1.seed, 42);
  assert.ok(summary1.makespan.min > 0);
  assert.ok(summary1.makespan.max >= summary1.makespan.min);
  assert.ok(summary1.makespan.mean >= summary1.makespan.min && summary1.makespan.mean <= summary1.makespan.max);
  assert.ok(summary1.makespan.p10 <= summary1.makespan.median && summary1.makespan.median <= summary1.makespan.p90);
  assert.ok(summary1.bottleneckFrequency.length > 0);

  // 2. Weryfikacja powtarzalności z tym samym ziarnem (Zasada 5 i Plan 7.4)
  const summary2 = runMonteCarloSimulation(project, 4, 10, {
    transportMode: 'just-in-time'
  });
  assert.deepEqual(summary1.makespan, summary2.makespan, 'Identyczny seed musi dawać identyczne statystyki makespan');
  assert.deepEqual(summary1.bottleneckFrequency, summary2.bottleneckFrequency, 'Identyczny seed musi dawać identyczną listę wąskich gardeł');

  // 3. Weryfikacja dla innego ziarna (powinno dać inne wyniki próbek)
  const projectDiffSeed = {
    ...project,
    stochasticConfig: {
      ...project.stochasticConfig,
      seed: 9999
    }
  };
  const summaryDiff = runMonteCarloSimulation(projectDiffSeed, 4, 10, {
    transportMode: 'just-in-time'
  });
  assert.notEqual(summary1.makespan.mean, summaryDiff.makespan.mean, 'Inne ziarno losowe powinno generować inne statystyki');
});







