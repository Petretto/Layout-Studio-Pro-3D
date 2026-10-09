import {reserveAssemblyMovement,finishAssemblyMovement} from '../src/core/assemblyMovement';
import {editDomainAssemblyTransport} from '../src/core/domainTransportEditing';
import {validateAssemblyTransport,type AssemblyTransport} from '../src/core/assemblyTransport';
import {createCartBook,startCartMovement,finishCartMovement,type CartMotionRoute} from '../src/core/transportState';
import {strict as assert} from 'node:assert';
import {test} from 'node:test';
import {DEFAULT_MOTOR_PROJECT as base} from '../src/core/models/defaultProjects';
import {ProcessStep,ProjectData} from '../src/core/models/types';
import {derive} from '../src/core/project';
import {setOperationLinks,successorsOf,replaceImportedProcess,removeOperation} from '../src/core/editing';
import {simulateNetwork} from '../src/core/algorithms/networkSimulation';
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
test('3.4d: nowe wymagania powodują jawną odmowę harmonogramu/workera, dawny wynik pozostaje identyczny',()=>{
  const {project,transport}=assemblyTransportFixture();
  const input:BodyRunInput={bodies:[{id:'BODY',productId:'PRODUCT',location:{kind:'station',stationId:'ST-A',copy:1}}],jobs:[{job:1,bodyId:'BODY'}]};
  const baseline=scheduleWorkerRun(project,1,1,input),edited=editDomainAssemblyTransport(project,transport);
  assert.throws(()=>scheduleWorkerRun(edited,1,1,input),/3.4.3/);
  const replies:unknown[]=[];edited.bodyRunInput=input;
  executeScheduleRequest({project:edited,arrivalIntervalSeconds:1,batch:1},reply=>replies.push(reply));
  assert.equal((replies[0] as {kind:string}).kind,'error');assert.match((replies[0] as {message:string}).message,/3.4.3/);
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
