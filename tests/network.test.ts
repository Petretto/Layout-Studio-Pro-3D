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
import {editDomainEquipment} from '../src/core/domainEquipmentEditing';
import {editDomainTime} from '../src/core/domainTimeEditing';
import {editDomainWorkerRun} from '../src/core/domainWorkerRunEditing';
import {createWorkerReservationBook,reserveWorkerTeam,releaseWorkerTeam} from '../src/core/workerReservations';
import {createWorkerRunPlan,type WorkerOperationSelection} from '../src/core/workerRunPlan';
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

class DraftStorage {
  values = new Map<string,string>();
  failWrite = false;
  getItem(key:string){return this.values.get(key)??null;}
  setItem(key:string,value:string){if(this.failWrite)throw new Error('quota');this.values.set(key,value);}
}

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
