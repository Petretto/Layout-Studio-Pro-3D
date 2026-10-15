import {spawn} from 'node:child_process';
import {mkdtempSync,rmSync,readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve,dirname,basename} from 'node:path';
const PORT=Number(process.env.LAYOUT_QA_PORT??5207),CDP=Number(process.env.LAYOUT_QA_CDP??9347);
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const preparation=process.argv.includes('--preparation');
const concurrent=process.argv.includes('--concurrent');
const branches=process.argv.includes('--branches');
const groups=process.argv.includes('--groups');
const three=process.argv.includes('--three');
const eko=process.argv.includes('--eko');
const ekoVariant=process.argv.includes('--shared-worker')?'shared-worker':process.argv.includes('--sequential')?'sequential':'parallel';
const background=process.argv.includes('--background');
const acceptance=process.argv.includes('--acceptance');
const material=process.argv.includes('--material');
const materialEditor=process.argv.includes('--material-editor');
const calculated=process.argv.includes('--calculated');
const source=JSON.parse(readFileSync('tests/qa/Eko_D5_actual_export_v5.json','utf8'));
source.name=preparation?'Podmontaż — jawny test syntetyczny':'Montaż — jawny test syntetyczny';
source.algorithm='Manual';source.layoutObjects=[];source.bom=[];
source.processSteps=['OP-A','OP-C'].map((id,i)=>({id,name:id,standardTimeSeconds:10,vaTimeSeconds:10,nvaTimeSeconds:0,
  sequenceNumber:i+1,predecessorIds:i?['OP-A']:[],assignedWorkstationId:i?'ST-C':'ST-A'}));
source.stations=[{id:'ST-A',name:'A',operationIds:['OP-A']},{id:'ST-C',name:'C',operationIds:['OP-C']}];
source.workstationSettings={};
let originalJson=JSON.stringify(source);
const {processSteps,workstationSettings,...rest}=source;
const profile={durationSeconds:10,durationBasis:'assumed',manualWork:[],machineRun:[],operatorPresence:[{startSeconds:0,endSeconds:10,basis:'assumed'}]};
const project={...rest,schemaVersion:6,modelStatus:'incomplete',operations:processSteps.map(({assignedWorkstationId,...operation})=>({...operation,
  staffing:{requiredWorkers:1,timeVariants:[{workerCount:1,timeProfile:profile}]}})),
  stationSettings:{'ST-A':{operators:1,parallelStations:1},'ST-C':{operators:1,parallelStations:1}},
  workers:[{id:'W',name:'Osoba testowa'}],workerPools:[],equipment:[],product:{id:'PRODUCT',name:'Wyrób testowy'},
  subassemblies:preparation?[{id:'PART',name:'Podzespół testowy',producerOperationId:'OP-A',consumerOperationIds:['OP-C']}]:[],
  workerRunSelection:{teamWorkerIds:['W'],operations:['OP-A','OP-C'].map(operationId=>({operationId,workerCount:1,eligibleWorkerIds:['W']}))},
  stationRouting:{selectionRule:'earliest-start-then-shortest-route',equipmentPlacements:[],operations:['OP-A','OP-C'].map((operationId,i)=>
    ({operationId,candidates:[{stationId:i?'ST-C':'ST-A',copy:1,requiredEquipmentIds:[]}]})),
    routes:[{id:'R-A-C',from:{stationId:'ST-A',copy:1},to:{stationId:'ST-C',copy:1},distanceMm:3000,basis:'confirmed',source:'Dane syntetyczne'}]}};
if(concurrent){
  project.operations.forEach(operation=>{operation.predecessorIds=[];operation.physicalRole={kind:'body-work'};});
  project.operations[1].staffing.timeVariants[0].timeProfile=structuredClone(profile);
  project.operations[1].staffing.timeVariants[0].timeProfile.durationSeconds=20;
  project.operations[1].staffing.timeVariants[0].timeProfile.operatorPresence[0].endSeconds=20;
  project.stations[0].operationIds=['OP-A','OP-C'];project.stations[1].operationIds=[];
  project.workers.push({id:'W2',name:'Druga osoba testowa'});project.workerRunSelection.teamWorkerIds.push('W2');
  project.workerRunSelection.operations[1].eligibleWorkerIds=['W2'];
  project.stationRouting.operations[1].candidates[0].stationId='ST-A';project.stationRouting.routes=[];
  project.physicalConcurrency={groups:[{id:'TOGETHER',operationIds:['OP-A','OP-C']}]};
}
if(branches){
  project.operations.push({...structuredClone(project.operations[1]),id:'OP-Q',name:'OP-Q',sequenceNumber:3});
  project.operations.forEach((operation,index)=>{operation.physicalRole={kind:'body-work'};operation.predecessorIds=index?['OP-A']:[];});
  project.stations=['S','X','Y','C','Q'].map(id=>({id:`ST-${id}`,name:id,operationIds:id==='X'?['OP-A']:id==='C'?['OP-C']:id==='Q'?['OP-Q']:[]}));
  project.stationSettings=Object.fromEntries(project.stations.map(station=>[station.id,{operators:1,parallelStations:1}]));
  project.workerRunSelection.operations.push({operationId:'OP-Q',workerCount:1,eligibleWorkerIds:['W']});
  const candidate=id=>({stationId:`ST-${id}`,copy:1,requiredEquipmentIds:[]});
  project.stationRouting.operations=[{operationId:'OP-A',candidates:[candidate('Y'),candidate('X')]},
    {operationId:'OP-C',candidates:[candidate('C')]},{operationId:'OP-Q',candidates:[candidate('Q')]}];
  project.stationRouting.routes=project.stations.flatMap(from=>project.stations.filter(to=>from.id!==to.id).map(to=>({
    id:`${from.id}-${to.id}`,from:{stationId:from.id,copy:1},to:{stationId:to.id,copy:1},
    distanceMm:from.id==='ST-S'?7:from.id==='ST-X'?(to.id==='ST-C'?2:100):from.id==='ST-Y'?(to.id==='ST-C'?10:3):50,
    basis:'confirmed',source:'Syntetyczny przykład 1A',transportTime:{durationSeconds:1,basis:'assumed',source:'Test UI'}})));
  project.physicalConcurrency={groups:[{id:'BRANCHES',operationIds:['OP-C','OP-Q']}]};
}
if(groups&&preparation){
  project.operations.forEach(operation=>operation.predecessorIds=[]);
  project.workers.push({id:'W2',name:'Osoba montażu testowego'});project.workerRunSelection.teamWorkerIds.push('W2');
  project.workerRunSelection.operations[1].eligibleWorkerIds=['W2'];
}
if(groups&&three){
  project.operations.push({...structuredClone(project.operations[0]),id:'OP-Q',name:'OP-Q',sequenceNumber:3});
  project.stations[0].operationIds.push('OP-Q');
  project.workers.push({id:'W3',name:'Trzecia osoba testowa'});project.workerRunSelection.teamWorkerIds.push('W3');
  project.workerRunSelection.operations.push({operationId:'OP-Q',workerCount:1,eligibleWorkerIds:['W3']});
  project.stationRouting.operations.push({operationId:'OP-Q',candidates:[{stationId:'ST-A',copy:1,requiredEquipmentIds:[]}]});
}
if(groups)delete project.physicalConcurrency;
const draft=eko?JSON.parse(readFileSync(`outputs/scenarios/eko_2_9/${ekoVariant}.json`,'utf8')):
  {kind:'domain-draft-save',version:1,sourceSchemaVersion:5,originalJson,project,at:'2026-10-07T12:00:00Z'};
if(eko)originalJson=draft.originalJson;
if(background){
  const p=draft.project,template=structuredClone(p.operations[0]);
  p.name='TYLKO TEST 3.1 — 5000 wykonań w tle';
  p.bom=[];
  p.operations=Array.from({length:50},(_,i)=>({...structuredClone(template),id:`TASK-${i}`,name:`Test ${i}`,sequenceNumber:i+1,
    predecessorIds:i?[`TASK-${i-1}`]:[],physicalRole:{kind:'subassembly-preparation',subassemblyIds:[`PART-${i}`]}}));
  p.stations=p.stations.map((station,i)=>({...station,operationIds:i?[]:p.operations.map(operation=>operation.id)}));
  p.subassemblies=p.operations.map((operation,i)=>({id:`PART-${i}`,name:`Test ${i}`,producerOperationId:operation.id,consumerOperationIds:[]}));
  p.workers=[{id:'TEST-W',name:'Osoba testowa'}];
  p.workerRunSelection={teamWorkerIds:['TEST-W'],operations:p.operations.map(operation=>({operationId:operation.id,workerCount:1,eligibleWorkerIds:['TEST-W']}))};
  delete p.bodyRunInput;delete p.stationRouting;p.physicalConcurrency={groups:[]};
}
if(material){
  if(!branches)throw new Error('--material wymaga scenariusza --branches');
  draft.project.materialNetwork={points:[
    {id:'STORE',name:'Magazyn testowy',kind:'external',direction:'output'},
    {id:'S-IN',name:'Wejście S',kind:'station',stationId:'ST-S',copy:1,direction:'input'},
    {id:'S-OUT',name:'Wyjście S',kind:'station',stationId:'ST-S',copy:1,direction:'output'},
    {id:'X-IN',name:'Wejście X',kind:'station',stationId:'ST-X',copy:1,direction:'input'}],
    routes:[{id:'DELIVERY',kind:'declared',fromPointId:'STORE',toPointId:'S-IN',distanceMm:1250,basis:'confirmed',source:'Wyłącznie test 3.2b'},
      {id:'TRANSFER',kind:'station-route',fromPointId:'S-OUT',toPointId:'X-IN',stationRouteId:'ST-S-ST-X'}]};
}
if(materialEditor){
  if(!branches&&!preparation)throw new Error('--material-editor wymaga --branches albo --preparation');
  if(preparation)draft.project.operations.forEach((operation,i)=>operation.physicalRole=i?{kind:'body-work'}:{kind:'subassembly-preparation',subassemblyIds:['PART']});
  draft.project.bodyRunInput={bodies:[{id:'BODY-TEST',productId:'PRODUCT',location:{kind:'station',stationId:branches?'ST-S':'ST-C',copy:1}}],jobs:[{job:1,bodyId:'BODY-TEST'}]};
}
if(calculated){
  if(!branches)throw new Error('--calculated wymaga --branches');
  for(const route of draft.project.stationRouting.routes){
    delete route.transportTime;
    route.transportCalculation={speed:{value:route.distanceMm*2,basis:'assumed',source:'Wyłącznie syntetyczny test 3.3a'},
      loading:{value:0.25,basis:'assumed',source:'Test 3.3a'},unloading:{value:0.25,basis:'assumed',source:'Test 3.3a'}};
  }
}
if(process.argv.includes('--transport-contract')||process.argv.includes('--transport-run')){
  const p=draft.project,r=p.stationRouting.routes[0];
  p.equipment.push({id:'QA-CART',name:'Jawny wózek testowy'});
  p.assemblyTransport={scope:'assembly-only',carts:[{equipmentId:'QA-CART',initialLocation:r.from,
    calendar:{shifts:[{startSeconds:0,endSeconds:1000,basis:'assumed'}],breaks:[]},
    afterUnload:process.argv.includes('--transport-run')?'stay-at-destination':'return-to-initial',source:'Jawny test kontraktu'}],conveyors:[],emptyRoutes:[],
    routes:[{stationRouteId:r.id,source:'Jawny test montażu',alternatives:[{workerIds:[p.workers[0].id],equipmentIds:['QA-CART']}]}]};
}
if(process.argv.includes('--transport-run')){
  const p=draft.project;
  p.assemblyTransport={scope:'assembly-only',carts:[],conveyors:[],emptyRoutes:[],
    routes:p.stationRouting.routes.map(r=>({stationRouteId:r.id,source:'Jawny transport montażu testowego',alternatives:[{workerIds:['W'],equipmentIds:[]}]}))};
  const calendar={shifts:[{startSeconds:0,endSeconds:1000,basis:'assumed'}],breaks:[]};
  p.resourceCalendars={workers:Object.fromEntries(p.workers.map(w=>[w.id,calendar])),stations:Object.fromEntries(p.stations.map(s=>[s.id,calendar]))};
  p.bodyRunInput={bodies:[{id:'UI-BODY',productId:p.product.id,location:{kind:'station',stationId:'ST-S',copy:1}}],jobs:[{job:1,bodyId:'UI-BODY'}]};
}
if(process.argv.includes('--transport-contract')){
  const p=draft.project,r=p.stationRouting.routes[0];
  p.bodyRunInput={bodies:[{id:'UI-BODY',productId:p.product.id,location:{kind:'station',...r.from}}],jobs:[{job:1,bodyId:'UI-BODY'}]};
}
if(process.argv.includes('--cart-run')){
  const p=draft.project,r=p.stationRouting.routes[0];
  p.operations.forEach(o=>o.physicalRole={kind:'body-work'});
  r.transportTime={durationSeconds:2,basis:'assumed',source:'Jawny test przewozu'};
  const calendar={shifts:[{startSeconds:0,endSeconds:1000,basis:'assumed'}],breaks:[]};
  p.equipment.push({id:'QA-CART',name:'Wózek międzyoperacyjny testowy'});
  p.resourceCalendars={workers:Object.fromEntries(p.workers.map(w=>[w.id,calendar])),stations:Object.fromEntries(p.stations.map(s=>[s.id,calendar]))};
  p.assemblyTransport={scope:'assembly-only',carts:[{equipmentId:'QA-CART',initialLocation:process.argv.includes('--approach')?r.to:r.from,
    calendar,afterUnload:process.argv.includes('--return')?'return-to-initial':'stay-at-destination',source:'Jawny test reguły'}],conveyors:[],
    emptyRoutes:[{id:'EMPTY-RETURN',equipmentId:'QA-CART',from:r.to,to:r.from,distanceMm:5000,basis:'confirmed',source:'Jawny test dojazdu',
      transportTime:{durationSeconds:5,basis:'assumed',source:'Jawny test czasu'},workerAssignment:{workerIds:['W'],source:'Jawny test obsady'}}],
    routes:[{stationRouteId:r.id,source:'Jawny test montażu',alternatives:[{workerIds:['W'],equipmentIds:['QA-CART']}]}]};
  p.bodyRunInput={bodies:[{id:'UI-BODY',productId:p.product.id,location:{kind:'station',...r.from}}],jobs:[{job:1,bodyId:'UI-BODY'}]};
}
if(process.argv.includes('--multi-cart')){
  const p=draft.project,t=p.assemblyTransport;
  p.equipment.push({id:'QA-CART-2',name:'Drugi wózek testowy'});
  t.carts.push({...structuredClone(t.carts[0]),equipmentId:'QA-CART-2'});
  t.routes[0].alternatives[0].equipmentIds.push('QA-CART-2');
  t.emptyRoutes.push({...structuredClone(t.emptyRoutes[0]),id:'EMPTY-RETURN-2',equipmentId:'QA-CART-2'});
}
if(process.argv.includes('--sequential-approach')){
  const p=draft.project,t=p.assemblyTransport,calendar=structuredClone(t.carts[0].calendar);
  p.workers.push({id:'APPROACH-2',name:'Osoba drugiego dojazdu'});p.resourceCalendars.workers['APPROACH-2']=calendar;
  t.emptyRoutes[1].workerAssignment={workerIds:['APPROACH-2'],source:'Jawna obsada drugiego dojazdu'};
  t.emptyRoutes[1].transportTime={durationSeconds:8,basis:'assumed',source:'Jawny test 8 s'};
}
if(process.argv.includes('--editor-new'))delete draft.project.assemblyTransport;
if(process.argv.includes('--transport-resources')){
  draft.project.equipment.push({id:'QA-BELT',name:'Przenośnik testowy UI'});
  if(process.argv.includes('--resource-new'))delete draft.project.assemblyTransport;
}
if(process.argv.includes('--jit-unconfigured')){delete draft.project.assemblyTransport;delete draft.project.bodyRunInput;draft.project.stationRouting.routes=[];}
if(process.argv.includes('--subassembly-contract')){
  const project=draft.project,producer=project.operations[0].id,consumer=project.operations[1].id;
  project.operations[0].physicalRole={kind:'subassembly-preparation',subassemblyIds:['QA-SUB']};
  project.subassemblies=[{id:'QA-SUB',name:'Podzespół testowy',producerOperationId:producer,consumerOperationIds:[consumer]}];
  project.bodyRunInput.bodies[0].location={kind:'station',stationId:'ST-C',copy:1};
  project.subassemblyFlow={availability:'producer-finish',consumption:'consumer-start',lots:[{id:'QA-LOT',subassemblyId:'QA-SUB',quantity:1,unit:'szt.',producer:{job:1,operationId:producer},consumer:{job:1,operationId:consumer},consumptionQuantity:1,source:'Syntetyczny odbiór kontraktu 3.4m1'}]};
}
if(process.argv.includes('--subassembly-copies')){
  const p=draft.project;delete p.bodyRunInput;
  p.operations[1].physicalRole={kind:'subassembly-preparation',subassemblyIds:['QA-OUTPUT']};
  p.subassemblies.push({id:'QA-OUTPUT',name:'Podzespół wynikowy UI',producerOperationId:p.operations[1].id,consumerOperationIds:[]});
  p.stations.push({id:'ST-D',name:'Alternatywny odbiorca UI',operationIds:[]});p.stationSettings['ST-D']={operators:1,parallelStations:1};
  p.resourceCalendars.stations['ST-D']=structuredClone(p.resourceCalendars.stations['ST-C']);
  if(process.argv.includes('--recipient-calendar'))p.resourceCalendars.stations['ST-D'].shifts[0].startSeconds=30;
  p.stationRouting.operations.find(o=>o.operationId===p.operations[1].id).candidates.push({stationId:'ST-D',copy:1,requiredEquipmentIds:[]});
  p.stationRouting.routes.push({...structuredClone(p.stationRouting.routes[0]),id:'QA-R-D',to:{stationId:'ST-D',copy:1},distanceMm:100,transportTime:{durationSeconds:1,basis:'assumed',source:'Czas testowy alternatywy UI'}});
  p.assemblyTransport.routes.push({...structuredClone(p.assemblyTransport.routes[0]),stationRouteId:'QA-R-D'});
}
if(process.argv.includes('--subassembly-new'))delete draft.project.subassemblyFlow;
if(process.argv.includes('--supply-guard'))draft.project.materialSupply={items:[{id:'QA-SUP',componentId:'QA-MAT',targetStationId:'ST-C',initialStock:0,unit:'szt.',schedule:{kind:'explicit-deliveries',deliveries:[]},source:'Jawny test braku dostaw'}]};
if(process.argv.includes('--supply-run'))draft.project.materialSupply={items:[{id:'QA-SUP',componentId:'QA-MAT',targetStationId:'ST-C',initialStock:0,unit:'szt.',schedule:{kind:'periodic',batchQuantity:1,intervalSeconds:100,firstDeliverySeconds:process.argv.includes('--supply-fast')?12:25},source:'Syntetyczny test dostępności'}],consumptions:[{operationId:'OP-C',supplyId:'QA-SUP',quantity:1,source:'Jawny test pobrania przy starcie'}]};
if(process.argv.includes('--buffer-run')){
 const p=draft.project;p.workers.push({id:'BUFFER-W',name:'Osoba odbiorcy UI'});p.workerRunSelection.teamWorkerIds.push('BUFFER-W');p.workerRunSelection.operations[1].eligibleWorkerIds=['BUFFER-W'];p.resourceCalendars.workers['BUFFER-W']=structuredClone(p.resourceCalendars.workers.W);
 p.operations[1].staffing.timeVariants[0].timeProfile=structuredClone(p.operations[1].staffing.timeVariants[0].timeProfile);
 const profile=p.operations[1].staffing.timeVariants[0].timeProfile;profile.durationSeconds=30;profile.operatorPresence=[{startSeconds:0,endSeconds:30,basis:'assumed'}];
 p.stationBuffers={buffers:[{stationId:'ST-A',copy:1,inputCapacity:null,outputCapacity:1,blockingPolicy:process.argv.includes('--buffer-released')?'bbas-worker-released':'bbas'},{stationId:'ST-C',copy:1,inputCapacity:0,outputCapacity:null}]};
}
if(process.argv.includes('--physical-buffer-run')){
 const p=draft.project;
 for(const [id,name] of [['BUFFER-W','Osoba odbiorcy UI'],['BUFFER-T','Osoba transportu montażowego UI']]){
   p.workers.push({id,name});p.resourceCalendars.workers[id]=structuredClone(p.resourceCalendars.workers.W);
 }
 p.workerRunSelection.teamWorkerIds.push('BUFFER-W');p.workerRunSelection.operations[1].eligibleWorkerIds=['BUFFER-W'];
 p.operations[1].staffing.timeVariants[0].timeProfile=structuredClone(p.operations[1].staffing.timeVariants[0].timeProfile);
 const profile=p.operations[1].staffing.timeVariants[0].timeProfile;profile.durationSeconds=30;profile.operatorPresence=[{startSeconds:0,endSeconds:30,basis:'assumed'}];
 p.assemblyTransport.routes[0].alternatives[0].workerIds=['BUFFER-T'];
 p.assemblyTransport.emptyRoutes.forEach(route=>route.workerAssignment={workerIds:['BUFFER-T'],source:'Jawny test transportu UI'});
 p.stationBuffers={buffers:[{stationId:'ST-A',copy:1,inputCapacity:null,outputCapacity:1,blockingPolicy:process.argv.includes('--buffer-released')?'bbas-worker-released':'bbas'},
   {stationId:'ST-C',copy:1,inputCapacity:1,outputCapacity:null}]};
 p.bodyRunInput={bodies:Array.from({length:4},(_,i)=>({id:`UI-BODY-${i+1}`,productId:p.product.id,location:{kind:'station',stationId:'ST-A',copy:1}})),
   jobs:Array.from({length:4},(_,i)=>({job:i+1,bodyId:`UI-BODY-${i+1}`}))};
}
const userData=mkdtempSync(join(tmpdir(),'layout-body-qa-'));
const server=spawn('node',['scripts/serve.mjs'],{env:{...process.env,PORT:String(PORT)},stdio:'ignore'});
const browser=spawn('C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',[
  `--remote-debugging-port=${CDP}`,'--headless=new','--disable-gpu','--no-first-run','--no-default-browser-check',
  `--user-data-dir=${userData}`,'about:blank'],{stdio:'ignore'});
let ws;
try{
  let target;
  for(let i=0;i<30;i++){await sleep(350);try{target=(await(await fetch(`http://127.0.0.1:${CDP}/json/list`)).json()).find(t=>t.type==='page');if(target)break;}catch{}}
  if(!target)throw new Error('Brak Edge CDP.');
  ws=new WebSocket(target.webSocketDebuggerUrl);await new Promise((resolve,reject)=>{ws.onopen=resolve;ws.onerror=reject;});
  let sequence=0;const pending=new Map(),errors=[];
  ws.onmessage=event=>{const m=JSON.parse(event.data);if(m.method==='Runtime.exceptionThrown')errors.push(m.params.exceptionDetails.text);
    if(pending.has(m.id)){const p=pending.get(m.id);pending.delete(m.id);m.error?p.reject(new Error(m.error.message)):p.resolve(m.result);}};
  const send=(method,params={})=>new Promise((resolve,reject)=>{const id=++sequence;pending.set(id,{resolve,reject});ws.send(JSON.stringify({id,method,params}));});
  const evaluate=async expression=>{const r=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw new Error(r.exceptionDetails.exception?.description||r.exceptionDetails.text);return r.result.value;};
  const field=async(label,value)=>{await evaluate(`(()=>{const e=document.querySelector('[aria-label='+JSON.stringify(${JSON.stringify(label)})+']');if(!e)throw new Error('Brak pola '+${JSON.stringify(label)});Object.getOwnPropertyDescriptor(e.tagName==='SELECT'?HTMLSelectElement.prototype:HTMLInputElement.prototype,'value').set.call(e,${JSON.stringify(value)});e.dispatchEvent(new Event(e.tagName==='SELECT'?'change':'input',{bubbles:true}));})()`);await sleep(70);};
  const check=async(label)=>{await evaluate(`document.querySelector('[aria-label='+JSON.stringify(${JSON.stringify(label)})+']').click()`);await sleep(70);};
  const click=async(text,panel='Korpus i role szkicu 6')=>{await evaluate(`(()=>{const p=document.querySelector('[aria-label='+JSON.stringify(${JSON.stringify(panel)})+']');const b=[...p.querySelectorAll('button')].find(b=>b.textContent===${JSON.stringify(text)});if(!b||b.disabled)throw new Error('Brak przycisku '+${JSON.stringify(text)});b.click();})()`);await sleep(120);};
  const saved=()=>evaluate(`JSON.parse(localStorage.getItem('layout-studio-domain-v6-draft-v1')).project`);
  const raw=()=>evaluate(`localStorage.getItem('layout-studio-domain-v6-draft-v1')`);
  await send('Page.enable');await send('Runtime.enable');await send('Emulation.setDeviceMetricsOverride',{width:1500,height:1100,deviceScaleFactor:1,mobile:false});
  await send('Page.navigate',{url:`http://127.0.0.1:${PORT}/`});await sleep(800);
  await evaluate(`localStorage.setItem('layout-studio-stations-v5',JSON.stringify({project:JSON.parse(${JSON.stringify(originalJson)}),originalJson:'',at:'2026-10-07T12:00:00Z'}));localStorage.setItem('layout-studio-domain-v6-draft-v1',${JSON.stringify(JSON.stringify(draft))})`);
  const open=async()=>{await send('Page.reload');await sleep(800);await evaluate(`[...document.querySelectorAll('.studio-nav button')].find(b=>b.textContent.includes('Stanowiska v5')).click()`);await sleep(150);};
  await open();
  // Canonicalize the fresh legacy fixture through its existing reader before isolation checks.
  if(process.argv.includes('--physical-buffer-run'))await open();
  await sleep(1500);const legacy=await evaluate(`localStorage.getItem('layout-studio-stations-v5')`),legacy4=await evaluate(`JSON.stringify(JSON.parse(localStorage.getItem('layout-studio-v3')).project)`);
  if(process.argv.includes('--subassembly-editor')){
    const panel='Partie podzespołów szkicu 6',before=JSON.stringify(await saved());
    if(process.argv.includes('--subassembly-new')){
      await click('Dodaj partię podzespołu',panel);
      for(const label of ['Partia 1 ilość wytworzona','Partia 1 ilość pobierana','Partia 1 jednostka','Partia 1 źródło','Partia 1 sztuka producenta','Partia 1 sztuka odbiorcy']){
        if(await evaluate(`document.querySelector('[aria-label='+JSON.stringify(${JSON.stringify(label)})+']').value`)!=='')throw new Error('Nowa partia ma domyślne dane');
      }
    }
    await field('Partia 1 ID','QA-LOT');await field('Partia 1 podzespół','QA-SUB');
    await field('Partia 1 ilość wytworzona',2);await field('Partia 1 ilość pobierana',3);
    await field('Partia 1 jednostka','szt.');await field('Partia 1 źródło','Jawny odbiór formularza, dane syntetyczne');
    await field('Partia 1 sztuka producenta',1);await field('Partia 1 producent','OP-A');
    await field('Partia 1 sztuka odbiorcy',1);await field('Partia 1 odbiorca','OP-C');
    await click('Zapisz partie podzespołów',panel);
    if(JSON.stringify(await saved())!==before||!await evaluate(`document.querySelector('[aria-label="${panel}"]').textContent.includes('pobranie przekracza')`))throw new Error('Nie zablokowano nadmiernego pobrania');
    await field('Partia 1 ilość pobierana',1);await click('Zapisz partie podzespołów',panel);
    const expected=JSON.stringify(await saved());if((await saved()).subassemblyFlow.lots[0].quantity!==2)throw new Error('Nie zapisano partii');
    await click('Cofnij dane szkicu',panel);if(JSON.stringify(await saved())!==before)throw new Error('Cofnij partii zmienia projekt');
    await click('Ponów dane szkicu',panel);if(JSON.stringify(await saved())!==expected)throw new Error('Ponów nie odtwarza partii');
    await field('Partia 1 ID','');await click('Odrzuć zmiany partii',panel);
    if(await evaluate(`document.querySelector('[aria-label="Partia 1 ID"]').value`)!=='QA-LOT')throw new Error('Odrzuć nie odświeża formularza');
    await click('Dodaj partię podzespołu',panel);await field('Partia 2 ID','QA-LOT');await click('Zapisz partie podzespołów',panel);
    if(JSON.stringify(await saved())!==expected||!await evaluate(`document.querySelector('[aria-label="${panel}"]').textContent.includes('powtórzone ID')`))throw new Error('Duplikat partii nie zablokowany');
    await click('Odrzuć zmiany partii',panel);await click('Usuń partię 1',panel);await click('Zapisz partie podzespołów',panel);
    if(JSON.stringify(await saved())!==expected)throw new Error('Pusta lista usunęła kontrakt bez jawnej akcji');await click('Odrzuć zmiany partii',panel);
    await click('Usuń konfigurację partii',panel);if((await saved()).subassemblyFlow)throw new Error('Nie usunięto konfiguracji');
    await click('Cofnij dane szkicu',panel);if(JSON.stringify(await saved())!==expected)throw new Error('Nie przywrócono kontraktu');
    await evaluate(`document.querySelector('[aria-label="${panel}"]').scrollIntoView()`);mkdirSync('outputs/qa',{recursive:true});
    const shot=await send('Page.captureScreenshot',{format:'png'});
    writeFileSync(`outputs/qa/verify_3_4m3_${process.argv.includes('--subassembly-new')?'new':'existing'}.png`,Buffer.from(shot.data,'base64'));
    await open();if(JSON.stringify(await saved())!==expected||await evaluate(`document.querySelector('[aria-label="Partia 1 ilość wytworzona"]').value`)!=='2')throw new Error('Reload nie odtwarza formularza');
  }
  if(process.argv.includes('--reverse-approach')){
    const panel='Transport montażu szkicu 6',before=JSON.stringify(await saved());
    await click('Przesuń QA-CART-2 wyżej w zestawie 1/1',panel);await click('Zapisz wymagania transportu',panel);
    const reordered=JSON.stringify(await saved());
    if((await saved()).assemblyTransport.routes[0].alternatives[0].equipmentIds[0]!=='QA-CART-2')throw new Error('Nie zapisano kolejności urządzeń');
    await click('Cofnij dane szkicu',panel);if(JSON.stringify(await saved())!==before)throw new Error('Cofnij kolejności zmienił projekt');
    await click('Ponów dane szkicu',panel);if(JSON.stringify(await saved())!==reordered)throw new Error('Ponów kolejności zmienił projekt');
  }
  if(process.argv.includes('--transport-resources')){
    const panel='Transport montażu szkicu 6',initial=JSON.stringify(await saved());
    const ref=value=>JSON.stringify(value),route=draft.project.stationRouting.routes[0];
    if(process.argv.includes('--resource-new')){
      await click('Dodaj wózek',panel);await field('Wózek 1 egzemplarz','QA-CART');
      await field('Wózek 1 lokalizacja początkowa',ref(route.from));await field('Wózek 1 źródło reguły','Jawna reguła UI');
      await click('Zapisz wymagania transportu',panel);
      if(JSON.stringify(await saved())!==initial)throw new Error('Brak polityki zmienił dane');
      await field('Wózek 1 po rozładunku','return-to-initial');await click('Dodaj Wózek 1 zmiana',panel);
      await field('Wózek 1 zmiana 1 początek',0);await field('Wózek 1 zmiana 1 koniec',1000);
      await click('Dodaj wymaganie trasy',panel);await field('Transport 1 trasa',route.id);await field('Transport 1 źródło','Jawna reguła montażu UI');
      await click('Dodaj zestaw do trasy 1',panel);await check('Transport 1 zestaw 1 osoba W');await check('Transport 1 zestaw 1 urządzenie QA-CART');
      await click('Dodaj pustą trasę',panel);await field('Pusta trasa 1 ID','EMPTY-RETURN');await field('Pusta trasa 1 wózek','QA-CART');
      await field('Pusta trasa 1 od',ref(route.to));await field('Pusta trasa 1 do',ref(route.from));await field('Pusta trasa 1 długość [mm]',5000);
      await field('Pusta trasa 1 źródło długości','Jawna droga testu UI');await check('Pusta trasa 1 potwierdzenie drogi');
      await field('Pusta trasa 1 tryb czasu','direct');await field('Pusta trasa 1 Czas transportu',5);await field('Pusta trasa 1 Czas transportu źródło','Jawny czas testu UI');
      await check('Pusta trasa 1 osoba W');await field('Pusta trasa 1 źródło obsady','Jawna obsada testu UI');
      await click('Zapisz wymagania transportu',panel);
      if(!(await saved()).assemblyTransport?.emptyRoutes[0]?.workerAssignment?.workerIds.includes('W'))throw new Error('Nie utworzono pustego ruchu przez UI');
    }
    const before=JSON.stringify(await saved());
    if(process.argv.includes('--cart-run')){
      await click('Dodaj wózek',panel);await field('Wózek 2 egzemplarz','QA-CART');
      if(await evaluate(`document.querySelector('[aria-label="Wózek 2 egzemplarz"]').disabled`))throw new Error('Duplikat blokuje korektę formularza');
      await click('Zapisz wymagania transportu',panel);if(JSON.stringify(await saved())!==before)throw new Error('Duplikat zmienił zapis');
      await click('Usuń Wózek 2',panel);

      await field('Wózek 1 źródło reguły','Zmienione źródło UI');await click('Dodaj Wózek 1 przerwa',panel);
      await field('Wózek 1 przerwa 1 początek',9);await field('Wózek 1 przerwa 1 koniec',8);await click('Zapisz wymagania transportu',panel);
      if(JSON.stringify(await saved())!==before)throw new Error('Błędna przerwa zmieniła dane');
      await field('Wózek 1 przerwa 1 koniec',10);
      await field('Pusta trasa 1 źródło długości','Potwierdzona droga odbioru UI');await click('Zapisz wymagania transportu',panel);
      if(JSON.stringify(await saved())!==before)throw new Error('Niepotwierdzona droga zmieniła dane');
      await check('Pusta trasa 1 potwierdzenie drogi');
      await field('Pusta trasa 1 tryb czasu','calculated');await field('Pusta trasa 1 Prędkość',1000);await field('Pusta trasa 1 Prędkość źródło','Test 1000 mm/s');
      await field('Pusta trasa 1 Załadunek',0);await field('Pusta trasa 1 Załadunek źródło','Jawnie zero');
      await field('Pusta trasa 1 Rozładunek',0);await field('Pusta trasa 1 Rozładunek źródło','Jawnie zero');
      await check('Pusta trasa 1 osoba W');await click('Zapisz wymagania transportu',panel);
      if(JSON.stringify(await saved())!==before)throw new Error('Brak obsady zmienił dane');
      await check('Pusta trasa 1 bez osób');await click('Zapisz wymagania transportu',panel);
      if((await saved()).assemblyTransport.emptyRoutes[0].workerAssignment.workerIds.length!==0)throw new Error('Jawny brak obsady nie zapisał się');
      await click('Cofnij dane szkicu',panel);if(JSON.stringify(await saved())!==before)throw new Error('Cofnij zasobów nie działa');
      await click('Ponów dane szkicu',panel);await check('Pusta trasa 1 osoba W');
      await click('Zapisz wymagania transportu',panel);
      if(!(await evaluate(`document.querySelector('[aria-label="Wózek 1 egzemplarz"]').disabled`)))throw new Error('Używany egzemplarz można zmienić');
    }
    const current=JSON.stringify(await saved());await click('Dodaj przenośnik',panel);
    await field('Przenośnik 1 egzemplarz','QA-BELT');await field('Przenośnik 1 od',ref(route.from));await field('Przenośnik 1 do',ref(route.to));
    await click('Dodaj Przenośnik 1 zmiana',panel);await field('Przenośnik 1 zmiana 1 początek',0);await field('Przenośnik 1 zmiana 1 koniec',1000);
    await check('Transport 1 zestaw 1 urządzenie QA-BELT');await field('Przenośnik 1 do',ref(route.from));await click('Zapisz wymagania transportu',panel);
    if(JSON.stringify(await saved())!==current)throw new Error('Nieprawidłowy przenośnik zmienił zapis');
    await field('Przenośnik 1 do',ref(route.to));await click('Zapisz wymagania transportu',panel);
    const edited=JSON.stringify(await saved());if(edited===current)throw new Error('Nie zapisano przenośnika');
    await click('Cofnij dane szkicu',panel);if(JSON.stringify(await saved())!==current)throw new Error('Cofnij przenośnika nie działa');
    await click('Ponów dane szkicu',panel);if(JSON.stringify(await saved())!==edited)throw new Error('Ponów przenośnika nie działa');
    if(!await evaluate(`[...document.querySelector('[aria-label="Transport montażu szkicu 6"]').querySelectorAll('button')].find(b=>b.textContent==='Usuń Przenośnik 1').disabled`))throw new Error('Można usunąć używany przenośnik');
    await check('Transport 1 zestaw 1 urządzenie QA-BELT');await click('Usuń Przenośnik 1',panel);
    if(!process.argv.includes('--cart-run'))await check('Transport 1 zestaw 1 bez urządzeń');
    await click('Zapisz wymagania transportu',panel);if((await saved()).assemblyTransport.conveyors.length)throw new Error('Nie usunięto zwolnionego przenośnika');
    await click('Cofnij dane szkicu',panel);if(JSON.stringify(await saved())!==edited)throw new Error('Nie odtworzono urządzenia i zestawu');
    if(process.argv.includes('--cart-run')){
      await click('Usuń Pusta trasa 1',panel);await click('Zapisz wymagania transportu',panel);
      if((await saved()).assemblyTransport.emptyRoutes.length!==0)throw new Error('Nie usunięto pustej trasy');
      await click('Cofnij dane szkicu',panel);if(JSON.stringify(await saved())!==edited)throw new Error('Historia pustych tras zmieniła dane');
      await field('Wózek 1 źródło reguły','Niezapisana zmiana zasobu');await click('Odrzuć zmiany transportu',panel);
      if(await evaluate(`document.querySelector('[aria-label="Wózek 1 źródło reguły"]').value`)!==(await saved()).assemblyTransport.carts[0].source)throw new Error('Nie odrzucono formularza zasobów');
      await evaluate(`document.querySelector('[aria-label="Pusta trasa 1 ID"]').closest('fieldset').scrollIntoView()`);
      mkdirSync('outputs/qa',{recursive:true});const emptyShot=await send('Page.captureScreenshot',{format:'png'});
      writeFileSync(`outputs/qa/verify_3_4j_empty_${process.argv.includes('--resource-new')?'new':'cart'}.png`,Buffer.from(emptyShot.data,'base64'));
    }
    await evaluate(`document.querySelector('[aria-label="Transport montażu szkicu 6"]').scrollIntoView()`);
    mkdirSync('outputs/qa',{recursive:true});const shot=await send('Page.captureScreenshot',{format:'png'});
    writeFileSync(`outputs/qa/verify_3_4j_${process.argv.includes('--resource-new')?'new':process.argv.includes('--cart-run')?'cart':'branches'}.png`,Buffer.from(shot.data,'base64'));
    await open();if(JSON.stringify(await saved())!==edited)throw new Error('Odczyt zmienia zasoby');
    console.log('PASS 3.4j: urządzenia, kalendarze, puste ruchy, błędy, historia i odczyt.');
  }
  if(process.argv.includes('--transport-editor')){
    const panel='Transport montażu szkicu 6';
    if(process.argv.includes('--editor-new')){
      await click('Dodaj wymaganie trasy',panel);await field('Transport 1 trasa',draft.project.stationRouting.routes[0].id);
      await field('Transport 1 źródło','Jawna reguła nowego kontraktu');await click('Dodaj zestaw do trasy 1',panel);
      await check('Transport 1 zestaw 1 osoba W');await check('Transport 1 zestaw 1 bez urządzeń');
      await click('Zapisz wymagania transportu',panel);
      if(!(await saved()).assemblyTransport?.routes[0]?.alternatives[0]?.workerIds.includes('W'))throw new Error('Nie utworzono nowego kontraktu');
    }
    const before=JSON.stringify(await saved());
    const clickChoice=async label=>{await check(label);};
    await field('Transport 1 źródło','');await click('Zapisz wymagania transportu',panel);
    if(JSON.stringify(await saved())!==before||!await evaluate(`document.querySelector('[aria-label="Transport montażu szkicu 6"] [role="alert"]')?.textContent`))throw new Error('Błędne źródło zmieniło zapis');
    await field('Transport 1 źródło','Jawne źródło odbioru UI');
    await click('Dodaj zestaw do trasy 1',panel);
    await click('Zapisz wymagania transportu',panel);
    if(JSON.stringify(await saved())!==before)throw new Error('Niepotwierdzona obsada zmieniła zapis');
    await clickChoice('Transport 1 zestaw 2 bez osób');await clickChoice('Transport 1 zestaw 2 bez urządzeń');
    await click('Zapisz wymagania transportu',panel);
    const edited=JSON.stringify(await saved());if(edited===before)throw new Error('Brak zapisu zestawu');
    await click('Cofnij dane szkicu',panel);if(JSON.stringify(await saved())!==before)throw new Error('Cofnij nie przywrócił projektu');
    await click('Ponów dane szkicu',panel);if(JSON.stringify(await saved())!==edited)throw new Error('Ponów nie przywrócił projektu');
    await field('Transport 1 źródło','Niezapisana zmiana');await click('Odrzuć zmiany transportu',panel);
    if(await evaluate(`document.querySelector('[aria-label="Transport 1 źródło"]').value`)!=='Jawne źródło odbioru UI')throw new Error('Odrzucenie nie odświeżyło formularza');
    await click('Usuń zestaw 1/2',panel);await click('Zapisz wymagania transportu',panel);
    if((await saved()).assemblyTransport.routes[0].alternatives.length!==1)throw new Error('Usunięcie zestawu nie działa');
    await click('Cofnij dane szkicu',panel);if(JSON.stringify(await saved())!==edited)throw new Error('Historia usunięcia nie działa');
    await evaluate(`document.querySelector('[aria-label="Transport montażu szkicu 6"]').scrollIntoView()`);
    mkdirSync('outputs/qa',{recursive:true});const shot=await send('Page.captureScreenshot',{format:'png'});
    writeFileSync(`outputs/qa/verify_3_4i_${process.argv.includes('--editor-new')?'new':process.argv.includes('--cart-run')?'cart':'branches'}.png`,Buffer.from(shot.data,'base64'));
    await open();if(JSON.stringify(await saved())!==edited)throw new Error('Odczyt zmienił wymagania');
    console.log('PASS 3.4i: edycja zestawu, odmowy, Cofnij/Ponów, odrzucenie, usuwanie i odczyt.');
  }
  if(process.argv.includes('--physical-buffer-run')){
    const expected=JSON.stringify(await saved()),label='Symulacja bez transportu — just in time';
    const calculate=async()=>{
      await field('Liczba sztuk szkicu 6',4);await field('Odstęp przybycia szkicu 6 [s]',1);
      await click('Oblicz harmonogram szkicu 6','Harmonogram zespołu szkicu 6');
      for(let i=0;i<100;i++){if(await evaluate(`!!document.querySelector('[aria-label="Wynik harmonogramu szkicu 6"], [aria-label="Harmonogram zespołu szkicu 6"] [role="alert"]')`))break;await sleep(50);}
      return evaluate(`document.querySelector('[aria-label="Wynik harmonogramu szkicu 6"]')?.textContent??null`);
    };
    if(await evaluate(`document.querySelector('[aria-label="${label}"]').checked`))throw new Error('JIT domyślnie włączony');
    const result=await calculate();
    if(!result?.includes('koniec ostatniej sztuki: 132 s')||result.includes('JUST IN TIME')||!result.includes('Zwolnienie stanowiska: 47 s')||!result.includes('blokada po pracy: 7 s'))throw new Error('Błędny przebieg fizyczny buforów '+result);
    const reservation=process.argv.includes('--buffer-released')?'30–40':'30–47';
    if(!result.includes(reservation)||!result.includes('Osoby transportu: BUFFER-T'))throw new Error('Błędne rezerwacje osoby/transportu');
    const inspection=await evaluate(`document.querySelector('[aria-label="Inspekcja buforów i transportu"]').textContent`);
    if(!inspection.includes('Przebieg fizyczny')||!inspection.includes('Blokada po zakończeniu')||inspection.includes('Podgląd logiczny JIT'))throw new Error('Błędny opis buforów');
    const movements=await evaluate(`document.querySelector('[aria-label="Inspekcja ruchów transportu montażu"]').textContent`);
    if(!movements.includes('25–27')||!movements.includes('Przewóz korpusu')||!movements.includes('Dojazd bez ładunku'))throw new Error('Brak rzeczywistych przejazdów');
    await evaluate(`const p=document.querySelector('[aria-label="Inspekcja buforów i transportu"]');p.open=true;p.scrollIntoView({block:'center'})`);
    mkdirSync('outputs/qa',{recursive:true});const shot=await send('Page.captureScreenshot',{format:'png'});
    writeFileSync(`outputs/qa/verify_3_5b2c2_${process.argv.includes('--buffer-released')?'released':'held'}.png`,Buffer.from(shot.data,'base64'));
    await check(label);const jit=await calculate();
    if(!jit?.includes('JUST IN TIME')||!jit.includes('koniec ostatniej sztuki: 130 s')||jit.includes('Osoby transportu:'))throw new Error('Błędny JIT z buforami');
    await check(label);if(await calculate()!==result)throw new Error('Wyłączenie JIT zmienia wynik fizyczny');
    await open();if(JSON.stringify(await saved())!==expected||await calculate()!==result)throw new Error('Reload zmienia projekt lub wynik');
    const after5=await evaluate(`localStorage.getItem('layout-studio-stations-v5')`),after4=await evaluate(`JSON.stringify(JSON.parse(localStorage.getItem('layout-studio-v3')).project)`);
    if(legacy!==after5||legacy4!==after4){
      const keys=(a,b)=>Object.keys({...JSON.parse(a),...JSON.parse(b)}).filter(key=>JSON.stringify(JSON.parse(a)[key])!==JSON.stringify(JSON.parse(b)[key]));
      throw new Error('Zmiana 4/5 '+JSON.stringify({v5:keys(legacy,after5),v4:keys(legacy4,after4)}));
    }
    if((JSON.parse(await raw())).originalJson!==originalJson||errors.length)throw new Error('Zmiana źródła lub wyjątki '+errors.join('; '));
    console.log('PASS 3.5b2c2: fizyczny worker, bufor przed operacją, polityka operatora, dojazdy, JIT opt-in, reload i izolacja 4/5.');
  }else if(process.argv.includes('--jit-run')){

    const expected=JSON.stringify(await saved()),label='Symulacja bez transportu — just in time';
    const enabled=()=>evaluate(`document.querySelector('[aria-label="${label}"]').checked`);
    const calculate=async()=>{
      if(process.argv.includes('--buffer-run'))await field('Liczba sztuk szkicu 6',3);
      await field('Odstęp przybycia szkicu 6 [s]',1);await click('Oblicz harmonogram szkicu 6','Harmonogram zespołu szkicu 6');
      for(let i=0;i<100;i++){if(await evaluate(`!!document.querySelector('[aria-label="Wynik harmonogramu szkicu 6"], [aria-label="Harmonogram zespołu szkicu 6"] [role="alert"]')`))break;await sleep(50);}
      return evaluate(`document.querySelector('[aria-label="Wynik harmonogramu szkicu 6"]')?.textContent??null`);
    };
    if(await enabled())throw new Error('JIT domyślnie włączony');
    const normal=await calculate();
    if((process.argv.includes('--jit-unconfigured')||process.argv.includes('--supply-guard')||process.argv.includes('--buffer-run'))?normal!==null:normal===null)throw new Error('Błędny tryb domyślny');
    if(process.argv.includes('--supply-run')){
      const time=process.argv.includes('--supply-fast')?12:25;
      if(!normal.includes(`koniec ostatniej sztuki: ${time+10} s`))throw new Error('Błędny koniec procesu z dostawą');
      const inspection=await evaluate(`document.querySelector('[aria-label="Inspekcja zapasów materiałowych"]').textContent`);
      if(!inspection.includes('QA-SUP')||!inspection.includes('Pobranie przez 1:OP-C')||!inspection.includes(`${time} s`))throw new Error('Brak inspekcji zapasu i pobrania');
      if(!process.argv.includes('--supply-fast')&&!normal.includes('oczekiwanie na materiał'))throw new Error('Brak przyczyny oczekiwania na materiał');
      await evaluate(`const p=document.querySelector('[aria-label="Inspekcja zapasów materiałowych"]');p.open=true;p.scrollIntoView({block:'center'})`);
      mkdirSync('outputs/qa',{recursive:true});const shot=await send('Page.captureScreenshot',{format:'png'});
      writeFileSync(`outputs/qa/verify_3_5b1_${process.argv.includes('--supply-fast')?'on-time':'waiting'}.png`,Buffer.from(shot.data,'base64'));
    }
    if(process.argv.includes('--subassembly-contract')){
      const expectedFinish=process.argv.includes('--subassembly-copies')&&!process.argv.includes('--recipient-calendar')?21:process.argv.includes('--return')?27:22;
      if(!normal.includes(`koniec ostatniej sztuki: ${expectedFinish} s`))throw new Error('Błędny koniec procesu z partią');
      if(process.argv.includes('--subassembly-copies')&&!normal.includes(process.argv.includes('--recipient-calendar')?'ST-C / 1':'ST-D / 1'))throw new Error('Błędna kopia odbiorcy UI');
      const inspection=await evaluate(`document.querySelector('[aria-label="Inspekcja partii podzespołów"]').textContent`);
      if(!inspection.includes('QA-LOT')||!inspection.includes('Wytworzenie')||!inspection.includes('Przyjazd')||!inspection.includes('Pobranie'))throw new Error('Brak zdarzeń partii w UI');
      const movements=await evaluate(`document.querySelector('[aria-label="Inspekcja ruchów transportu montażu"]').textContent`);
      if(!movements.includes('Przewóz podzespołu')||movements.includes('Przewóz korpusu'))throw new Error('Błędny ładunek przewozu');
      await evaluate(`const p=document.querySelector('[aria-label="Inspekcja partii podzespołów"]');p.open=true;p.scrollIntoView({block:'center'})`);
      mkdirSync('outputs/qa',{recursive:true});const shot=await send('Page.captureScreenshot',{format:'png'});
      writeFileSync(`outputs/qa/${process.argv.includes('--subassembly-editor')?`verify_3_4m3_run_${process.argv.includes('--subassembly-new')?'new':'existing'}`:process.argv.includes('--subassembly-copies')?`verify_3_4m2b_${process.argv.includes('--recipient-calendar')?'calendar':'fastest'}`:`verify_3_4m2_${process.argv.includes('--return')?'return':'transfer'}`}.png`,Buffer.from(shot.data,'base64'));
    }
    if(process.argv.includes('--supply-guard')&&!await evaluate(`document.querySelector('[aria-label="Harmonogram zespołu szkicu 6"]').textContent.includes('3.5b')`))throw new Error('Brak jawnej odmowy zaopatrzenia');
    await check(label);if(await evaluate(`!!document.querySelector('[aria-label="Wynik harmonogramu szkicu 6"]')`))throw new Error('Stary wynik nie wyczyszczony');
    const jit=await calculate();
    if(!jit?.includes('JUST IN TIME')||jit.includes('Osoby transportu:')||jit.includes('Transport korpusu:'))throw new Error('Niepełne pominięcie transportu');
    if(process.argv.includes('--cart-run')&&!jit.includes(`koniec ostatniej sztuki: ${process.argv.includes('--buffer-run')?100:20} s`))throw new Error('Błędny czas procesu JIT');
    if(process.argv.includes('--buffer-run')){
      if(!jit.includes('Zwolnienie stanowiska: 40 s')||!jit.includes('blokada po pracy: 10 s'))throw new Error('Brak rzeczywistej blokady w UI');
      const inspection=await evaluate(`document.querySelector('[aria-label="Inspekcja buforów procesu JIT"]').textContent`);
      if(!inspection.includes('Blokada po zakończeniu')||!inspection.includes('Zwolnienie stanowiska'))throw new Error('Brak inspekcji buforów');
      const reservation=process.argv.includes('--buffer-released')?'20–30':'20–40';if(!jit.includes(reservation))throw new Error('Błędna polityka zatrzymania operatora');
      await evaluate(`const p=document.querySelector('[aria-label="Inspekcja buforów procesu JIT"]');p.open=true;p.scrollIntoView({block:'center'})`);
      mkdirSync('outputs/qa',{recursive:true});const shot=await send('Page.captureScreenshot',{format:'png'});
      writeFileSync(`outputs/qa/verify_3_5b2b_${process.argv.includes('--buffer-released')?'released':'held'}.png`,Buffer.from(shot.data,'base64'));
    }
    await check(label);if(await calculate()!==normal)throw new Error('Wyłączenie JIT nie przywraca konfiguracji');
    await check(label);await calculate();await evaluate(`document.querySelector('[aria-label="Harmonogram zespołu szkicu 6"]').scrollIntoView()`);
    mkdirSync('outputs/qa',{recursive:true});const shot=await send('Page.captureScreenshot',{format:'png'});
    writeFileSync(`outputs/qa/${process.argv.includes('--buffer-run')?'verify_3_5b2b_jit':process.argv.includes('--supply-run')?'verify_3_5b1_jit':process.argv.includes('--supply-guard')?'verify_3_5a1':process.argv.includes('--subassembly-contract')?process.argv.includes('--subassembly-editor')?'verify_3_4m3_jit':process.argv.includes('--subassembly-copies')?'verify_3_4m2b_jit':'verify_3_4m2_jit':'verify_3_4l'}_${process.argv.includes('--jit-unconfigured')?'unconfigured':process.argv.includes('--cart-run')?'configured':'branches'}.png`,Buffer.from(shot.data,'base64'));
    await open();if(await enabled())throw new Error('JIT utrwalony w projekcie');await check(label);
    if(await calculate()!==jit||JSON.stringify(await saved())!==expected)throw new Error('Zmiana wyniku lub zapisu');
    if(process.argv.includes('--subassembly-editor')){
      const panel='Partie podzespołów szkicu 6';
      await field('Partia 1 ilość wytworzona',3);await click('Zapisz partie podzespołów',panel);
      if(await enabled()||await evaluate(`!!document.querySelector('[aria-label="Wynik harmonogramu szkicu 6"]')`))throw new Error('Zapis partii zachował nieaktualny wynik/tryb JIT');
      await click('Cofnij dane szkicu',panel);if(JSON.stringify(await saved())!==expected)throw new Error('Cofnij zmiany po symulacji nie przywraca danych');
      await check(label);if(await calculate()!==jit)throw new Error('Wynik po Cofnij partii nie jest odtwarzalny');
    }
    if(legacy!==await evaluate(`localStorage.getItem('layout-studio-stations-v5')`)||legacy4!==await evaluate(`JSON.stringify(JSON.parse(localStorage.getItem('layout-studio-v3')).project)`))throw new Error('Zmiana 4/5');
    if((JSON.parse(await raw())).originalJson!==originalJson||errors.length)throw new Error('Zmiana źródła lub wyjątki');
    console.log(`PASS ${process.argv.includes('--buffer-run')?'3.5b2b':process.argv.includes('--supply-run')?'3.5b1':process.argv.includes('--supply-guard')?'3.5a1':process.argv.includes('--subassembly-contract')?process.argv.includes('--subassembly-editor')?'3.4m3':process.argv.includes('--subassembly-copies')?'3.4m2b':'3.4m2':'3.4l'}: JIT opt-in, worker, czas procesu, powrót do konfiguracji, reload i izolacja 4/5.`);
  }else if(process.argv.includes('--transport-run')||process.argv.includes('--cart-run')){
    const expected=JSON.stringify(await saved());
    const calculate=async()=>{
      await field('Odstęp przybycia szkicu 6 [s]',1);await click('Oblicz harmonogram szkicu 6','Harmonogram zespołu szkicu 6');
      for(let i=0;i<100;i++){if(await evaluate(`!!document.querySelector('[aria-label="Wynik harmonogramu szkicu 6"]')`))break;await sleep(50);}
      return evaluate(`document.querySelector('[aria-label="Wynik harmonogramu szkicu 6"]').textContent`);
    };
    const result=await calculate();
    if(!result.includes(process.argv.includes('--cart-run')?'ST-C / 1':'ST-Q / 1')||!result.includes('założony')||!result.includes('Osoby transportu: W'))throw new Error('Brak rzeczywistego wyniku transportu');
    if(process.argv.includes('--cart-run')) {
      const inspection=await evaluate(`document.querySelector('[aria-label="Inspekcja ruchów transportu montażu"]').textContent`);
      if(process.argv.includes('--approach')&&!process.argv.includes('--sequential-approach')&&(!inspection.includes('Dojazd bez ładunku')||!inspection.includes('10–15')))throw new Error('Brak dojazdu w UI');
      if(process.argv.includes('--return')&&(!inspection.includes('Powrót bez ładunku')||!inspection.includes('22–27')||!inspection.includes('QA-CART: ST-A / 1')))throw new Error('Brak powrotu w UI');
      if(process.argv.includes('--multi-cart')&&!process.argv.includes('--sequential-approach')&&(!inspection.includes('QA-CART, QA-CART-2')||!inspection.includes('QA-CART-2: ST-A / 1')||!inspection.includes('27–32')))throw new Error('Brak atomowego zestawu i osobnych powrotów w UI');
      if(process.argv.includes('--sequential-approach')){
        const expected=process.argv.includes('--reverse-approach')?['10–18','18–23']:['10–15','15–23'];
        if(!expected.every(t=>inspection.includes(t))||!inspection.includes('23–25')||!inspection.includes('QA-CART-2: ST-C / 1')||inspection.includes('Powrót bez ładunku'))throw new Error('Brak kolejnych dojazdów zestawu w UI');
      }
      await evaluate(`const p=document.querySelector('[aria-label="Inspekcja ruchów transportu montażu"]');p.open=true;p.scrollIntoView({block:'center'})`);
    }else await evaluate(`document.querySelector('[aria-label="Harmonogram zespołu szkicu 6"]').scrollIntoView()`);
    mkdirSync('outputs/qa',{recursive:true});const screenshot=await send('Page.captureScreenshot',{format:'png'});
    writeFileSync(process.argv.includes('--sequential-approach')?`outputs/qa/verify_3_4k_${process.argv.includes('--reverse-approach')?'reverse':'ordered'}.png`:process.argv.includes('--transport-resources')?`outputs/qa/verify_3_4j_worker_${process.argv.includes('--resource-new')?'new':process.argv.includes('--cart-run')?'cart':'branches'}.png`:process.argv.includes('--transport-editor')?`outputs/qa/verify_3_4i_worker_${process.argv.includes('--editor-new')?'new':process.argv.includes('--cart-run')?'cart':'branches'}.png`:process.argv.includes('--multi-cart')?'outputs/qa/verify_3_4h_multi_cart.png':process.argv.includes('--cart-run')?`outputs/qa/verify_3_4g_${process.argv.includes('--return')?'return':'approach'}.png`:'outputs/qa/verify_3_4f_transport.png',Buffer.from(screenshot.data,'base64'));
    await open();if(JSON.stringify(await saved())!==expected||await calculate()!==result)throw new Error('Odczyt zmienia wejście lub wynik');
    const afterLegacy=await evaluate(`localStorage.getItem('layout-studio-stations-v5')`),afterLegacy4=await evaluate(`JSON.stringify(JSON.parse(localStorage.getItem('layout-studio-v3')).project)`);
    if(legacy!==afterLegacy||legacy4!==afterLegacy4){
      const keys=(a,b)=>Object.keys({...JSON.parse(a),...JSON.parse(b)}).filter(k=>JSON.stringify(JSON.parse(a)[k])!==JSON.stringify(JSON.parse(b)[k]));
      console.log('Zmiana 4/5 — pola:',JSON.stringify({v5:keys(legacy,afterLegacy),v4:keys(legacy4,afterLegacy4)}));
      throw new Error('Zmiana 4/5');
    }
    if((JSON.parse(await raw())).originalJson!==originalJson||errors.length)throw new Error('Zmiana źródła lub wyjątki');
    console.log(`PASS ${process.argv.includes('--sequential-approach')?'3.4k':process.argv.includes('--multi-cart')?'3.4h':process.argv.includes('--cart-run')?'3.4g':'3.4f'}: rzeczywisty worker transportu montażu, wynik, odczyt i izolacja danych 4/5.`);
  }else if(process.argv.includes('--transport-contract')){
    const expected=JSON.stringify(await saved());
    await field('Odstęp przybycia szkicu 6 [s]',1);await click('Oblicz harmonogram szkicu 6','Harmonogram zespołu szkicu 6');
    for(let i=0;i<100;i++){if(await evaluate(`!!document.querySelector('[aria-label="Harmonogram zespołu szkicu 6"] [role="alert"]')`))break;await sleep(50);}
    const failure=await evaluate(`document.querySelector('[aria-label="Harmonogram zespołu szkicu 6"]').textContent`);
    if(!failure.includes('3.4.3')||await evaluate(`!!document.querySelector('[aria-label="Wynik harmonogramu szkicu 6"]')`))throw new Error('Nowe wymagania pominięte w UI');
    await open();if(JSON.stringify(await saved())!==expected)throw new Error('Odczyt zmienił kontrakt');
    if(legacy!==await evaluate(`localStorage.getItem('layout-studio-stations-v5')`)||legacy4!==await evaluate(`JSON.stringify(JSON.parse(localStorage.getItem('layout-studio-v3')).project)`))throw new Error('Zmiana 4/5');
    if((JSON.parse(await raw())).originalJson!==originalJson||errors.length)throw new Error('Zmiana źródła lub wyjątki');
    console.log('PASS 3.4d: UI odczytuje nowy kontrakt, worker jawnie odmawia wyniku, oryginał i 4/5 zachowane.');
  }else if(materialEditor){
    const panel='Sieć materiałowa szkicu 6',firstStation=branches?'ST-S':'ST-A',secondStation=branches?'ST-X':'ST-C';
    const calculate=async()=>{await field('Odstęp przybycia szkicu 6 [s]',1);await click('Oblicz harmonogram szkicu 6','Harmonogram zespołu szkicu 6');
      for(let i=0;i<100;i++){if(await evaluate(`!!document.querySelector('[aria-label="Wynik harmonogramu szkicu 6"]')`))break;await sleep(50);}
      return evaluate(`document.querySelector('[aria-label="Wynik harmonogramu szkicu 6"]').textContent`);};
    const baseline=await calculate(),before=await raw();
    for(const [i,id,name,kind,direction,station] of [
      [1,'STORE','Magazyn testowy','external','output',''],[2,'IN','Wejście pierwszej kopii','station','input',firstStation],
      [3,'OUT','Wyjście pierwszej kopii','station','output',firstStation],[4,'NEXT','Wejście kolejnej kopii','station','input',secondStation]]){
      await click('Dodaj punkt materiałowy',panel);await field(`Punkt ${i} ID`,id);await field(`Punkt ${i} nazwa`,name);
      await field(`Punkt ${i} rodzaj`,kind);await field(`Punkt ${i} kierunek`,direction);
      if(kind==='station'){await field(`Punkt ${i} stanowisko`,station);await field(`Punkt ${i} kopia`,1);}
    }
    await click('Dodaj połączenie materiałowe',panel);await field('Połączenie 1 ID','DELIVERY');await field('Połączenie 1 od','STORE');await field('Połączenie 1 do','IN');
    await field('Połączenie 1 źródło','Jawna długość syntetyczna');await field('Połączenie 1 jednostka','m');await field('Połączenie 1 długość',1.25);
    await click('Zapisz sieć materiałową',panel);if(await raw()!==before||!await evaluate(`document.querySelector('[aria-label="Sieć materiałowa szkicu 6"]').textContent.includes('Potwierdź długość')`))throw new Error('Brak odmowy niepotwierdzonej trasy');
    await check('Połączenie 1 potwierdzenie');await click('Zapisz sieć materiałową',panel);
    if((await saved()).materialNetwork.routes[0].distanceMm!==1250)throw new Error('Zła konwersja m/mm');
    await field('Połączenie 1 jednostka','m');await field('Połączenie 1 jednostka','mm');await click('Zapisz sieć materiałową',panel);
    if((await saved()).materialNetwork.routes[0].distanceMm!==1250)throw new Error('Zmiana jednostki zmienia długość');
    await click('Dodaj połączenie materiałowe',panel);await field('Połączenie 2 ID','TRANSFER');await field('Połączenie 2 od','OUT');await field('Połączenie 2 do','NEXT');
    await field('Połączenie 2 rodzaj','station-route');await field('Połączenie 2 trasa',`${firstStation}-${secondStation}`.replace('ST-A-ST-C','R-A-C'));
    await click('Zapisz sieć materiałową',panel);let complete=await raw();
    if(!await evaluate(`document.querySelector('[aria-label="Połączenie 2 dane trasy"]').textContent.includes('Długość: ${branches?7:3000} mm')`))throw new Error('Nieczytelne dane istniejącej trasy');
    const routeIndex=(await saved()).stationRouting.routes.findIndex(r=>r.id===(branches?'ST-S-ST-X':'R-A-C'))+1;
    await field(`Trasa ${routeIndex} ID`,'BROKEN-REFERENCE');await check(`Trasa ${routeIndex} potwierdzona`);
    await click('Zapisz dopuszczenia i trasy','Dopuszczenia i trasy szkicu 6');if(await raw()!==complete)throw new Error('Edycja trasy osierociła połączenie materiałowe');
    await field(`Trasa ${routeIndex} ID`,branches?'ST-S-ST-X':'R-A-C');
    await field(`Trasa ${routeIndex} długość [mm]`,branches?8:3001);await check(`Trasa ${routeIndex} potwierdzona`);
    await click('Zapisz dopuszczenia i trasy','Dopuszczenia i trasy szkicu 6');
    if(!await evaluate(`document.querySelector('[aria-label="Połączenie 2 dane trasy"]').textContent.includes('Długość: ${branches?8:3001} mm')`))throw new Error('Połączenie ma drugą/starą długość');
    await click('Cofnij dane szkicu',panel);complete=await raw();
    await click('Usuń punkt 1',panel);if(await raw()!==complete||!await evaluate(`document.querySelector('[aria-label="Sieć materiałowa szkicu 6"]').textContent.includes('Najpierw usuń')`))throw new Error('Usunięcie punktu z referencją');
    await field('Punkt 4 ID','IN');await click('Zapisz sieć materiałową',panel);if(await raw()!==complete)throw new Error('Zapisano duplikat ID');await field('Punkt 4 ID','NEXT');
    await field('Punkt 1 kierunek','input');await click('Zapisz sieć materiałową',panel);if(await raw()!==complete)throw new Error('Zapisano zły kierunek');await field('Punkt 1 kierunek','output');
    await field('Punkt 2 kopia',2);await click('Zapisz sieć materiałową',panel);if(await raw()!==complete)throw new Error('Zapisano złą kopię');await field('Punkt 2 kopia',1);
    await field('Połączenie 1 jednostka','m');await field('Połączenie 1 długość',1.5);await click('Zapisz sieć materiałową',panel);if(await raw()!==complete)throw new Error('Zmiana długości zachowała potwierdzenie');
    await check('Połączenie 1 potwierdzenie');await click('Zapisz sieć materiałową',panel);if((await saved()).materialNetwork.routes[0].distanceMm!==1500)throw new Error('Zła nowa długość');
    await click('Cofnij dane szkicu',panel);if((await saved()).materialNetwork.routes[0].distanceMm!==1250)throw new Error('Cofnij sieci');
    await click('Ponów dane szkicu',panel);if((await saved()).materialNetwork.routes[0].distanceMm!==1500)throw new Error('Ponów sieci');
    const network=structuredClone((await saved()).materialNetwork);
    await click('Usuń połączenie 1',panel);await click('Usuń punkt 1',panel);await click('Zapisz sieć materiałową',panel);
    if((await saved()).materialNetwork.points.some(p=>p.id==='STORE')||(await saved()).materialNetwork.routes.some(r=>r.id==='DELIVERY'))throw new Error('Brak usunięcia połączenia/punktu');
    await click('Cofnij dane szkicu',panel);if(JSON.stringify((await saved()).materialNetwork)!==JSON.stringify(network))throw new Error('Cofnij usunięcia');
    await click('Usuń zapis sieci materiałowej',panel);if((await saved()).materialNetwork)throw new Error('Brak usunięcia sieci');
    await click('Cofnij dane szkicu',panel);if(JSON.stringify((await saved()).materialNetwork)!==JSON.stringify(network))throw new Error('Cofnij całej sieci');
    if(await calculate()!==baseline)throw new Error('Sieć 1A zmienia harmonogram');
    await open();if(JSON.stringify((await saved()).materialNetwork)!==JSON.stringify(network))throw new Error('Inna sieć po odczycie');
    if(await calculate()!==baseline)throw new Error('Odczyt zmienia harmonogram');
    if(legacy!==await evaluate(`localStorage.getItem('layout-studio-stations-v5')`)||legacy4!==await evaluate(`JSON.stringify(JSON.parse(localStorage.getItem('layout-studio-v3')).project)`))throw new Error('Zmieniono aktywne 4/5');
    if((JSON.parse(await raw())).originalJson!==originalJson)throw new Error('Zmieniono źródło');
    await evaluate(`document.querySelector('[aria-label="Sieć materiałowa szkicu 6"]').scrollIntoView()`);mkdirSync('outputs/qa',{recursive:true});const shot=await send('Page.captureScreenshot',{format:'png'});writeFileSync(`outputs/qa/verify_3_2c_${branches?'branches':'preparation'}.png`,Buffer.from(shot.data,'base64'));
    await evaluate(`document.querySelector('[aria-label="Połączenie 2 dane trasy"]').scrollIntoView({block:'center'})`);const linksShot=await send('Page.captureScreenshot',{format:'png'});writeFileSync(`outputs/qa/verify_3_2c_${branches?'branches':'preparation'}_links.png`,Buffer.from(linksShot.data,'base64'));
    if(errors.length)throw new Error(errors.join('; '));console.log('PASS 3.2c '+(branches?'gałęzie korpusu':'podmontaż/montaż')+': tworzenie punktów/połączeń, mm/m, potwierdzenie, odmowy, historia, usuwanie, odczyt i zgodny harmonogram.');
  }else if(background){
    if(acceptance)await evaluate(`window.scheduleStops=0;window.Worker=class extends Worker{constructor(url,options){const schedule=String(url).includes('schedule.worker');if(schedule&&window.failStartup)throw new Error('TEST: start workera');super(schedule&&window.failRuntime?new URL('/qa-missing-worker.js',location.href):url,options);this.schedule=schedule;}terminate(){if(this.schedule)window.scheduleStops++;super.terminate();}}`);
    await field('Liczba sztuk szkicu 6',100);await field('Odstęp przybycia szkicu 6 [s]',1);
    const before=await raw();
    const cancelled=await evaluate(`(async()=>{
      const panel=document.querySelector('[aria-label="Harmonogram zespołu szkicu 6"]');
      [...panel.querySelectorAll('button')].find(b=>b.textContent==='Oblicz harmonogram szkicu 6').click();
      await new Promise(resolve=>setTimeout(resolve,0));
      const status=panel.querySelector('[aria-label="Postęp obliczeń szkicu 6"]');
      const button=[...panel.querySelectorAll('button')].find(b=>b.textContent==='Anuluj obliczenia szkicu 6');
      if(!status||!button)throw new Error('Brak postępu/anulowania');
      const start=performance.now();button.click();await new Promise(resolve=>setTimeout(resolve,0));
      return {durationMs:performance.now()-start,text:panel.textContent};
    })()`);
    if(!cancelled.text.includes('Anulowano obliczenia')||cancelled.durationMs>1000)throw new Error('UI nie anuluje responsywnie');
    await sleep(700);if(await evaluate(`!!document.querySelector('[aria-label="Wynik harmonogramu szkicu 6"]')`))throw new Error('Spóźniony wynik po anulowaniu');
    await field('Liczba sztuk szkicu 6',1);await field('Odstęp przybycia szkicu 6 [s]',1);await click('Oblicz harmonogram szkicu 6','Harmonogram zespołu szkicu 6');
    for(let i=0;i<50;i++){if(await evaluate(`!!document.querySelector('[aria-label="Wynik harmonogramu szkicu 6"]')`))break;await sleep(100);}
    if(!await evaluate(`document.querySelector('[aria-label="Wynik harmonogramu szkicu 6"]')?.textContent.includes('50 wykonań')`))throw new Error('Brak nowego wyniku');
    if(await raw()!==before)throw new Error('Obliczenia zmieniają szkic');
    if(legacy!==await evaluate(`localStorage.getItem('layout-studio-stations-v5')`)||legacy4!==await evaluate(`JSON.stringify(JSON.parse(localStorage.getItem('layout-studio-v3')).project)`))throw new Error('Zmieniono 4/5');
    if(acceptance){
      const panel='Harmonogram zespołu szkicu 6';
      const waitFor=async expression=>{for(let i=0;i<100;i++){if(await evaluate(expression))return;await sleep(50);}throw new Error('Warunek odbioru: '+expression);};
      const resultExpression=`document.querySelector('[aria-label="Wynik harmonogramu szkicu 6"]')?.textContent.includes('50 wykonań')`;
      const startSmall=async()=>{await field('Liczba sztuk szkicu 6',1);await field('Odstęp przybycia szkicu 6 [s]',1);await click('Oblicz harmonogram szkicu 6',panel);await waitFor(resultExpression);};
      const beginLarge=async()=>evaluate(`(async()=>{
        const p=document.querySelector('[aria-label="Harmonogram zespołu szkicu 6"]'),input=p.querySelector('[aria-label="Liczba sztuk szkicu 6"]');
        Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(input,'100');input.dispatchEvent(new Event('input',{bubbles:true}));await new Promise(r=>setTimeout(r,0));
        [...p.querySelectorAll('button')].find(b=>b.textContent==='Oblicz harmonogram szkicu 6').click();await new Promise(r=>setTimeout(r,0));
        if(!p.querySelector('[aria-label="Postęp obliczeń szkicu 6"]'))throw new Error('Zadanie nie trwa');return window.scheduleStops;
      })()`);
      const stopped=await beginLarge();await field('Liczba sztuk szkicu 6',1);await sleep(700);
      if(!await evaluate(`window.scheduleStops>${stopped}`)||await evaluate(`!!document.querySelector('[aria-label="Wynik harmonogramu szkicu 6"]')`))throw new Error('Zmiana wejścia nie usuwa zadania/wyniku');
      await startSmall();
      const unmounted=await beginLarge();await evaluate(`[...document.querySelectorAll('.studio-nav button')].find(b=>b.textContent.includes('Pulpit')).click()`);await sleep(100);
      if(!await evaluate(`window.scheduleStops>${unmounted}`))throw new Error('Odmontowanie nie kończy workera');
      await evaluate(`[...document.querySelectorAll('.studio-nav button')].find(b=>b.textContent.includes('Stanowiska v5')).click()`);await sleep(200);await startSmall();
      const projectBefore=JSON.stringify(await saved()),changed=await beginLarge();
      await click('Usuń zapis reguł równoległości','Grupy równoległości szkicu 6');await sleep(100);
      if(!await evaluate(`window.scheduleStops>${changed}`)||await evaluate(`!!document.querySelector('[aria-label="Wynik harmonogramu szkicu 6"]')`))throw new Error('Zapis szkicu nie usuwa starego zadania');
      await click('Cofnij dane szkicu','Grupy równoległości szkicu 6');if(JSON.stringify(await saved())!==projectBefore)throw new Error('Cofnij zmienia dane');await startSmall();
      await field('Odstęp przybycia szkicu 6 [s]',0);await click('Oblicz harmonogram szkicu 6',panel);await waitFor(`!!document.querySelector('[aria-label="Harmonogram zespołu szkicu 6"] [role="alert"]')`);
      if(await evaluate(`!!document.querySelector('[aria-label="Wynik harmonogramu szkicu 6"]')`))throw new Error('Błąd wejścia pozostawia wynik');await startSmall();
      for(const flag of ['failStartup','failRuntime']){
        await evaluate(`window.${flag}=true`);await click('Oblicz harmonogram szkicu 6',panel);
        await waitFor(`!!document.querySelector('[aria-label="Harmonogram zespołu szkicu 6"] [role="alert"]')`);
        if(await evaluate(`!!document.querySelector('[aria-label="Postęp obliczeń szkicu 6"], [aria-label="Wynik harmonogramu szkicu 6"]')`))throw new Error('Błąd workera pozostawia wynik/postęp');
        await evaluate(`window.${flag}=false`);await startSmall();
      }
      if(JSON.stringify(await saved())!==projectBefore||(JSON.parse(await raw())).originalJson!==originalJson)throw new Error('Odbiór zmienia projekt/źródło');
      if(legacy!==await evaluate(`localStorage.getItem('layout-studio-stations-v5')`)||legacy4!==await evaluate(`JSON.stringify(JSON.parse(localStorage.getItem('layout-studio-v3')).project)`))throw new Error('Odbiór zmienia 4/5');
      console.log('PASS 3.1c v6: zmiana parametrów, odmontowanie, zapis szkicu i Cofnij, błędne wejście, błąd konstrukcji/ładowania workera, odzyskanie i izolacja danych.');
    }
    await evaluate(`document.querySelector('[aria-label="Harmonogram zespołu szkicu 6"]').scrollIntoView()`);
    mkdirSync('outputs/qa',{recursive:true});const shot=await send('Page.captureScreenshot',{format:'png'});writeFileSync('outputs/qa/verify_3_1a_background.png',Buffer.from(shot.data,'base64'));
    if(errors.length)throw new Error(errors.join('; '));
    console.log('PASS 3.1a: rzeczywisty worker, postęp, anulowanie 5000 wykonań, brak spóźnionego wyniku i ponowny start; reakcja UI '+cancelled.durationMs.toFixed(1)+' ms.');
  }else if(eko){
    const panel='Grupy równoległości szkicu 6';
    await field('Grupa 1 ID','TEST-PREPARATIONS-UI');await click('Zapisz grupy równoległości',panel);
    await click('Cofnij dane szkicu',panel);if((await saved()).physicalConcurrency.groups[0].id!=='TEST-PREPARATIONS')throw new Error('Cofnij Eko');
    await click('Ponów dane szkicu',panel);if((await saved()).physicalConcurrency.groups[0].id!=='TEST-PREPARATIONS-UI')throw new Error('Ponów Eko');
    const calculate=async()=>{await field('Odstęp przybycia szkicu 6 [s]',1);await click('Oblicz harmonogram szkicu 6','Harmonogram zespołu szkicu 6');};
    await calculate();const resultText=await evaluate(`document.querySelector('[aria-label="Wynik harmonogramu szkicu 6"]').textContent`);
    const rows=await evaluate(`Array.from(document.querySelector('[aria-label="Wynik harmonogramu szkicu 6"] tbody').rows).map(row=>({id:row.cells[1].textContent,start:row.cells[5].textContent,end:row.cells[6].textContent,cause:row.cells[8].textContent}))`);
    const doors=rows.filter(row=>['OP22','OP23'].includes(row.id));
    if(rows.length!==16||doors[0].start!=='7670'||doors[1].start!==(ekoVariant==='parallel'?'7670':'8270')||!resultText.includes(ekoVariant==='parallel'?'13550':'14150'))throw new Error('Niepoprawny pełny wynik Eko');
    if(ekoVariant==='shared-worker'&&!doors[1].cause.includes('pracowników'))throw new Error('Brak oczekiwania na wspólną osobę');
    const periods=await evaluate(`Array.from(document.querySelector('[aria-label="Inspekcja równoległości przebiegu"] tbody').rows).map(row=>[row.cells[1].textContent,row.cells[2].textContent,row.cells[3].textContent])`);
    const doorPeriod=periods.find(row=>row[1].includes('OP22')&&row[1].includes('OP23'));
    if(ekoVariant==='parallel'?(doorPeriod?.[0]!=='7670–8270'||doorPeriod?.[2]!=='TEST-DOORS'):!!doorPeriod)throw new Error('Niepoprawne dopuszczenie Eko');
    await evaluate(`Array.from(document.querySelector('[aria-label="Wynik harmonogramu szkicu 6"] tbody').rows).find(row=>row.cells[1].textContent==='OP22').scrollIntoView()`);
    mkdirSync('outputs/qa',{recursive:true});const shot=await send('Page.captureScreenshot',{format:'png'});writeFileSync(`outputs/qa/verify_2_9_${ekoVariant}.png`,Buffer.from(shot.data,'base64'));
    const full=await saved();await open();if(JSON.stringify(await saved())!==JSON.stringify(full))throw new Error('Odczyt Eko');
    await calculate();if(resultText!==await evaluate(`document.querySelector('[aria-label="Wynik harmonogramu szkicu 6"]').textContent`))throw new Error('Inny wynik Eko po odczycie');
    await click('Usuń zapis korpusów przebiegu');await calculate();
    if(!await evaluate(`document.querySelector('[aria-label="Harmonogram zespołu szkicu 6"]').textContent.includes('brak jawnych instancji')`))throw new Error('Brak odmowy ramy');
    await click('Cofnij dane szkicu');if(JSON.stringify((await saved()).bodyRunInput)!==JSON.stringify(full.bodyRunInput))throw new Error('Cofnij ramy');
    const afterLegacy=await evaluate(`localStorage.getItem('layout-studio-stations-v5')`);
    if(legacy!==afterLegacy||legacy4!==await evaluate(`JSON.stringify(JSON.parse(localStorage.getItem('layout-studio-v3')).project)`)){
      const before=JSON.parse(legacy),after=JSON.parse(afterLegacy);
      throw new Error('Zmieniono 4/5; pola v5: '+Object.keys(after).filter(key=>JSON.stringify(before[key])!==JSON.stringify(after[key])).join(', '));
    }
    if(JSON.parse(await raw()).originalJson!==originalJson||errors.length)throw new Error('Zmieniono źródło lub wyjątki JS '+errors.join('; '));
    console.log(`PASS 2.9 Eko ${ekoVariant}: 16 operacji, drzwi, rama, grupy, historia, odczyt i izolacja źródła.`);
  }else{
  await field('Operacja roli fizycznej','OP-A');await field('Rodzaj roli fizycznej',preparation?'subassembly-preparation':'body-work');
  if(preparation)await check('Rola przygotowuje PART');await click('Zapisz rolę operacji');
  await field('Operacja roli fizycznej','OP-C');await field('Rodzaj roli fizycznej','body-work');await click('Zapisz rolę operacji');
  await click('Dodaj jawny korpus');await field('Korpus 1 sztuka',1);await field('Korpus 1 ID','BODY');await field('Korpus 1 wyrób','PRODUCT');await field('Korpus 1 stanowisko',branches?'ST-S':preparation?'ST-C':'ST-A');await field('Korpus 1 kopia',1);
  await click('Zapisz korpusy przebiegu');const initial=await saved();
  if(initial.bodyRunInput?.bodies[0].id!=='BODY')throw new Error('Brak zapisu korpusu.');
  await field('Korpus 1 kopia',999);const beforeBad=await raw();await click('Zapisz korpusy przebiegu');if(await raw()!==beforeBad)throw new Error('Błędny zapis zmienił dane.');
  await field('Korpus 1 kopia',1);
  if(groups){
    const panel='Grupy równoległości szkicu 6';
    const rejected=async()=>{const before=await raw();await click('Zapisz grupy równoległości',panel);
      if(await raw()!==before||!await evaluate(`document.querySelector('[aria-label="Grupy równoległości szkicu 6"] [role="alert"]')?.isConnected`))throw new Error('Brak odmowy błędnej grupy');};
    await click('Dodaj grupę równoległości',panel);await field('Grupa 1 ID','G1');
    await check('Grupa 1 operacja OP-A');await rejected();await check('Grupa 1 operacja OP-C');
    await click('Zapisz grupy równoległości',panel);
    if((await saved()).physicalConcurrency.groups.length!==1)throw new Error('Brak grupy');
    await click('Dodaj grupę równoległości',panel);await field('Grupa 2 ID','G1');
    await check('Grupa 2 operacja OP-A');await check('Grupa 2 operacja OP-C');await rejected();
    await field('Grupa 2 ID','G2');await rejected();
    if(three){await check('Grupa 2 operacja OP-A');await check('Grupa 2 operacja OP-Q');await click('Zapisz grupy równoległości',panel);}
    else await click('Usuń grupę 2',panel);
    await field('Grupa 1 ID','G1-final');await click('Zapisz grupy równoległości',panel);
    await click('Cofnij dane szkicu',panel);if((await saved()).physicalConcurrency.groups[0].id!=='G1')throw new Error('Cofnij grupy');
    await click('Ponów dane szkicu',panel);if((await saved()).physicalConcurrency.groups[0].id!=='G1-final')throw new Error('Ponów grupy');
    // Removing a role referenced by rules must preserve the saved draft.
    await field('Operacja roli fizycznej','OP-A');await field('Rodzaj roli fizycznej','');const beforeRole=await raw();
    await click('Zapisz rolę operacji');if(await raw()!==beforeRole)throw new Error('Usunięto używaną rolę');
    await field('Rodzaj roli fizycznej',preparation?'subassembly-preparation':'body-work');
    const keep=(await saved()).physicalConcurrency;
    for(let i=keep.groups.length;i>0;i--)await click(`Usuń grupę ${i}`,panel);
    await click('Zapisz grupy równoległości',panel);
    await field('Odstęp przybycia szkicu 6 [s]',1);await click('Oblicz harmonogram szkicu 6','Harmonogram zespołu szkicu 6');
    const sequential=await evaluate(`Array.from(document.querySelector('[aria-label="Wynik harmonogramu szkicu 6"] tbody').rows).map(row=>[row.cells[5].textContent,row.cells[6].textContent])`);
    const expected=preparation?[['0','10'],['10','20']]:three?[['0','10'],['10','30'],['30','40']]:[['0','10'],['10','30']];
    if(JSON.stringify(sequential)!==JSON.stringify(expected))throw new Error('Puste grupy nie wykluczają '+JSON.stringify(sequential));
    await click('Cofnij dane szkicu',panel);
    if(await evaluate(`!!document.querySelector('[aria-label="Wynik harmonogramu szkicu 6"]')`))throw new Error('Stary wynik po Cofnij');
    await click('Usuń zapis reguł równoległości',panel);if((await saved()).physicalConcurrency)throw new Error('Brak usunięcia reguł');
    await click('Cofnij dane szkicu',panel);if(JSON.stringify((await saved()).physicalConcurrency)!==JSON.stringify(keep))throw new Error('Cofnij usunięcia reguł');
    await evaluate(`document.querySelector('[aria-label="Grupy równoległości szkicu 6"]').scrollIntoView()`);
    mkdirSync('outputs/qa',{recursive:true});const editorShot=await send('Page.captureScreenshot',{format:'png'});
    writeFileSync(`outputs/qa/verify_2_8d_${three?'three':preparation?'preparation':'body'}_editor.png`,Buffer.from(editorShot.data,'base64'));
  }
  await field('Odstęp przybycia szkicu 6 [s]',1);await click('Oblicz harmonogram szkicu 6','Harmonogram zespołu szkicu 6');
  if(!preparation&&!concurrent&&!branches){
    if(!await evaluate(`document.querySelector('[aria-label="Harmonogram zespołu szkicu 6"]').textContent.includes('brak jawnej trasy lub czasu')`))throw new Error('Brak odmowy czasu.');
    await field('Trasa 1 tryb czasu','direct');await field('Trasa 1 Czas transportu',2);await field('Trasa 1 Czas transportu pochodzenie','measured');await field('Trasa 1 Czas transportu źródło','Syntetyczny test UI');
    await click('Zapisz dopuszczenia i trasy','Dopuszczenia i trasy szkicu 6');
    const withTime=await saved();if(withTime.stationRouting.routes[0].transportTime.durationSeconds!==2)throw new Error('Brak czasu.');
    await click('Cofnij dane szkicu');if((await saved()).stationRouting.routes[0].transportTime)throw new Error('Cofnij czasu.');
    await click('Ponów dane szkicu');if((await saved()).stationRouting.routes[0].transportTime.durationSeconds!==2)throw new Error('Ponów czasu.');
  }
  await field('Odstęp przybycia szkicu 6 [s]',1);await click('Oblicz harmonogram szkicu 6','Harmonogram zespołu szkicu 6');
  const text=await evaluate(`document.querySelector('[aria-label="Wynik harmonogramu szkicu 6"]').textContent`);
  if(!text.includes('Końcowe położenie korpusów')||!text.includes(branches?'ST-Q / 1':concurrent?'ST-A / 1':'ST-C / 1'))throw new Error('Brak inspekcji celu.');
  if(preparation&&!text.includes('Przygotowanie podzespołów — bez zajęcia korpusu'))throw new Error('Brak rozróżnienia przygotowania.');
  if(!preparation&&!concurrent&&!branches&&(!text.includes('10–12 s · zmierzony')||!text.includes('10–22')))throw new Error('Brak przewozu lub rezerwacji celu.');
  if(branches){const rows=await evaluate(`Array.from(document.querySelector('[aria-label="Wynik harmonogramu szkicu 6"] tbody').rows).map(row=>[row.cells[5].textContent,row.cells[6].textContent])`);
    if(JSON.stringify(rows)!==JSON.stringify([['1','11'],['12','22'],['23','33']])||!text.includes('ST-X')||!text.includes('ST-C'))throw new Error('Niepoprawne trasy gałęzi '+JSON.stringify(rows));}
  if(concurrent){const times=await evaluate(`Array.from(document.querySelector('[aria-label="Wynik harmonogramu szkicu 6"] tbody').rows).map(row=>[row.cells[5].textContent,row.cells[6].textContent])`);
    if(JSON.stringify(times)!==JSON.stringify(three?[['0','10'],['0','20'],['10','20']]:[['0','10'],['0','20']]))throw new Error('Brak równoległego startu '+JSON.stringify(times));}
  if(groups){
    const periods=await evaluate(`Array.from(document.querySelector('[aria-label="Inspekcja równoległości przebiegu"] tbody').rows).map(row=>[row.cells[1].textContent,row.cells[2].textContent,row.cells[3].textContent])`);
    const expected=three?[['0–10','OP-A, OP-C','G1-final'],['10–20','OP-C, OP-Q','G2']]:[['0–10','OP-A, OP-C','G1-final']];
    if(JSON.stringify(periods)!==JSON.stringify(expected))throw new Error('Niepoprawna inspekcja '+JSON.stringify(periods));
    await evaluate(`const inspection=document.querySelector('[aria-label="Inspekcja równoległości przebiegu"]');inspection.open=true;inspection.scrollIntoView()`);
    const inspectionShot=await send('Page.captureScreenshot',{format:'png'});
    writeFileSync(`outputs/qa/verify_2_8d_${three?'three':preparation?'preparation':'body'}_inspection.png`,Buffer.from(inspectionShot.data,'base64'));
  }
  await evaluate(`document.querySelector('[aria-label="Inspekcja korpusów przebiegu"] details').open=true;document.querySelector('[aria-label="Harmonogram zespołu szkicu 6"]').scrollIntoView()`);
  mkdirSync('outputs/qa',{recursive:true});const shot=await send('Page.captureScreenshot',{format:'png'});writeFileSync(branches?'outputs/qa/verify_2_8c_branches.png':concurrent?'outputs/qa/verify_2_8b_concurrent.png':`outputs/qa/verify_2_7e_${preparation?'preparation':'transport'}.png`,Buffer.from(shot.data,'base64'));
  const full=await saved();await open();if(JSON.stringify(await saved())!==JSON.stringify(full))throw new Error('Zmiana po odczycie.');
  await field('Odstęp przybycia szkicu 6 [s]',1);await click('Oblicz harmonogram szkicu 6','Harmonogram zespołu szkicu 6');
  if(text!==await evaluate(`document.querySelector('[aria-label="Wynik harmonogramu szkicu 6"]').textContent`))throw new Error('Inny wynik po odczycie.');
  await click('Usuń zapis korpusów przebiegu');if((await saved()).bodyRunInput)throw new Error('Brak usunięcia.');
  await click('Cofnij dane szkicu');if(JSON.stringify((await saved()).bodyRunInput)!==JSON.stringify(full.bodyRunInput))throw new Error('Cofnij korpusów.');
  if(legacy!==await evaluate(`localStorage.getItem('layout-studio-stations-v5')`)||legacy4!==await evaluate(`JSON.stringify(JSON.parse(localStorage.getItem('layout-studio-v3')).project)`))throw new Error('Zmieniono 4/5.');
  if((JSON.parse(await raw())).originalJson!==originalJson)throw new Error('Zmieniono źródło.');if(errors.length)throw new Error(errors.join('; '));
  if(material&&JSON.stringify((await saved()).materialNetwork)!==JSON.stringify(draft.project.materialNetwork))throw new Error('Sieć materiałowa zmieniona przez UI/historię/odczyt');
  if(calculated){
    if(JSON.stringify((await saved()).stationRouting)!==JSON.stringify(draft.project.stationRouting))throw new Error('Parametry wyliczanego czasu zmienione przez UI/historię/odczyt');
    if(material&&!await evaluate(`document.querySelector('[aria-label="Połączenie 2 dane trasy"]').textContent.includes('czas: 1 s')`))throw new Error('Połączenie nie odczytuje wyliczonego czasu');
    console.log('PASS 3.3a: rzeczywisty worker, wyliczone czasy tras, zgodny harmonogram i zachowanie parametrów przez zapis/historię/odczyt.');
  }
  console.log(`PASS ${groups?'2.8d grupy '+(three?'trójka':preparation?'przygotowanie':'korpus'):branches?'2.8c trasy gałęzi':concurrent?'2.8b równoległość':preparation?'2.7e przygotowanie':'2.7e transport'}: role, jawne instancje, wynik, inspekcja, historia, odczyt i izolacja 4/5.`);
  }
  if(process.argv.includes('--timing-editor')){
    const panel='Dopuszczenia i trasy szkicu 6',label='Trasa 1';
    const before=await raw(),distance=(await saved()).stationRouting.routes[0].distanceMm;
    await field(`${label} tryb czasu`,'calculated');
    await click('Zapisz dopuszczenia i trasy',panel);
    if(await raw()!==before)throw new Error('Niepełne parametry nadpisały zapis');
    await field(`${label} jednostka prędkości`,'m/min');
    await field(`${label} Prędkość`,60);
    await field(`${label} jednostka czasu`,'min');
    for(const [name,value] of [['Załadunek',2/60],['Rozładunek',3/60]])await field(`${label} ${name}`,value);
    for(const name of ['Prędkość','Załadunek','Rozładunek']){
      await field(`${label} ${name} pochodzenie`,'measured');
      await field(`${label} ${name} źródło`,'Jawny test UI 3.3b');
    }
    await click('Zapisz dopuszczenia i trasy',panel);
    const calc=(await saved()).stationRouting.routes[0].transportCalculation;
    if(calc.speed.value!==1000||calc.loading.value!==2||calc.unloading.value!==3)throw new Error('Błędne jednostki '+JSON.stringify(calc));
    const summary=await evaluate(`document.querySelector('[aria-label="Trasa 1 wynik czasu"]').textContent`);
    if(!summary.includes(`Czas: ${5+distance/1000} s (założony)`)||!summary.includes('Załadunek: 2 s')||!summary.includes('rozładunek: 3 s'))throw new Error('Błędne składowe '+summary);
    await field(`${label} jednostka prędkości`,'m/s');await field(`${label} jednostka czasu`,'s');
    await click('Zapisz dopuszczenia i trasy',panel);
    if(JSON.stringify((await saved()).stationRouting.routes[0].transportCalculation)!==JSON.stringify(calc))throw new Error('Przełączenie jednostek zmienia dane');
    await field(`${label} tryb czasu`,'direct');await field(`${label} Czas transportu`,10);await field(`${label} Czas transportu źródło`,'Test UI wpisanego czasu');
    await click('Zapisz dopuszczenia i trasy',panel);
    let route=(await saved()).stationRouting.routes[0];
    if(route.transportCalculation||route.transportTime.durationSeconds!==10)throw new Error('Sprzeczne tryby');
    await click('Cofnij dane szkicu',panel);
    if(JSON.stringify((await saved()).stationRouting.routes[0].transportCalculation)!==JSON.stringify(calc))throw new Error('Cofnij czasu');
    await click('Ponów dane szkicu',panel);if((await saved()).stationRouting.routes[0].transportTime.durationSeconds!==10)throw new Error('Ponów czasu');
    await click('Cofnij dane szkicu',panel);
    if(material){
      await field('Połączenie 1 tryb czasu','calculated');
      for(const [name,value] of [['Prędkość',1000],['Załadunek',2],['Rozładunek',3]]){
        await field(`Połączenie 1 ${name}`,value);await field(`Połączenie 1 ${name} źródło`,'Test definicji zewnętrznej');
      }
      await click('Zapisz sieć materiałową','Sieć materiałowa szkicu 6');
      if(!(await saved()).materialNetwork.routes[0].transportCalculation)throw new Error('Brak zapisu zewnętrznego');
    }
    const calculate=async()=>{
      await field('Odstęp przybycia szkicu 6 [s]',1);
      await click('Oblicz harmonogram szkicu 6','Harmonogram zespołu szkicu 6');
      for(let i=0;i<100;i++){if(await evaluate(`!!document.querySelector('[aria-label="Wynik harmonogramu szkicu 6"]')`))break;await sleep(50);}
      return evaluate(`document.querySelector('[aria-label="Wynik harmonogramu szkicu 6"]').textContent`);
    };
    const result=await calculate(),complete=JSON.stringify(await saved());
    await evaluate(`document.querySelector('[aria-label="Trasa 1 wynik czasu"]').scrollIntoView({block:'center'})`);
    const timingShot=await send('Page.captureScreenshot',{format:'png'});
    writeFileSync(`outputs/qa/verify_3_3b_${eko?'eko':preparation?'preparation':'branches'}.png`,Buffer.from(timingShot.data,'base64'));
    await open();if(JSON.stringify(await saved())!==complete)throw new Error('Odczyt parametrów');
    if(await calculate()!==result)throw new Error('Inny wynik czasu po odczycie');
    if(legacy!==await evaluate(`localStorage.getItem('layout-studio-stations-v5')`)||legacy4!==await evaluate(`JSON.stringify(JSON.parse(localStorage.getItem('layout-studio-v3')).project)`))throw new Error('Zmieniono 4/5');
    if((JSON.parse(await raw())).originalJson!==originalJson||errors.length)throw new Error('Źródło/wyjątki '+errors.join('; '));
    console.log('PASS 3.3b '+(eko?'Eko':'niezależne gałęzie')+': tryby, odmowa, jednostki, składowe, historia, worker i odczyt.');
  }
}finally{
  ws?.close();browser.kill();server.kill();
  const profile=resolve(userData);if(dirname(profile)===resolve(tmpdir())&&basename(profile).startsWith('layout-body-qa-'))try{rmSync(profile,{recursive:true,force:true});}catch{}
}
