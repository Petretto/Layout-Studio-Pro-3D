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
if(process.argv.includes('--transport-contract')){
  const p=draft.project,r=p.stationRouting.routes[0];
  p.equipment.push({id:'QA-CART',name:'Jawny wózek testowy'});
  p.assemblyTransport={scope:'assembly-only',carts:[{equipmentId:'QA-CART',initialLocation:r.from,
    calendar:{shifts:[{startSeconds:0,endSeconds:1000,basis:'assumed'}],breaks:[]},
    afterUnload:'stay-at-destination',source:'Jawny test kontraktu'}],conveyors:[],emptyRoutes:[],
    routes:[{stationRouteId:r.id,source:'Jawny test montażu',alternatives:[{workerIds:[p.workers[0].id],equipmentIds:['QA-CART']}]}]};
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
  await open();await sleep(1500);const legacy=await evaluate(`localStorage.getItem('layout-studio-stations-v5')`),legacy4=await evaluate(`JSON.stringify(JSON.parse(localStorage.getItem('layout-studio-v3')).project)`);
  if(process.argv.includes('--transport-contract')){
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
