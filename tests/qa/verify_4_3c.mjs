import {spawn} from 'node:child_process';
import {mkdtempSync, readFileSync, writeFileSync, mkdirSync, existsSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {deepStrictEqual, strictEqual, ok} from 'node:assert';
const PORT=5244, CDP=9384, key='layout-studio-domain-v6-draft-v1';
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const source=JSON.parse(readFileSync('tests/qa/Eko_D5_actual_export_v5.json','utf8'));
source.name='Bilans zasobów — jawny test syntetyczny';source.algorithm='Manual';source.layoutObjects=[];source.bom=[];
source.processSteps=['QA-A','QA-B'].map((id,i)=>({id,name:`Operacja ${id}`,standardTimeSeconds:10,vaTimeSeconds:10,nvaTimeSeconds:0,
  sequenceNumber:i+1,predecessorIds:i?['QA-A']:[],assignedWorkstationId:`ST-${i+1}`}));
source.stations=source.processSteps.map((s,i)=>({id:`ST-${i+1}`,name:`Stanowisko ${i+1}`,operationIds:[s.id]}));source.stations.push({id:'ST-EMPTY',name:'Puste',operationIds:[]});source.workstationSettings={};
const originalJson=JSON.stringify(source), {processSteps,workstationSettings,...rest}=source;
const profile={durationSeconds:10,durationBasis:'assumed',manualWork:[],machineRun:[],operatorPresence:[{startSeconds:0,endSeconds:10,basis:'assumed'}]};
const project={...rest,schemaVersion:6,modelStatus:'incomplete',operations:processSteps.map(({assignedWorkstationId,...s})=>({...s,
  staffing:{requiredWorkers:1,timeVariants:[{workerCount:2,timeProfile:structuredClone(profile)}]}})),
  stationSettings:Object.fromEntries(source.stations.map(s=>[s.id,{operators:2,parallelStations:1}])),
  workers:[{id:'W-A',name:'Osoba A'},{id:'W-B',name:'Osoba B'}],workerPools:[],product:null,subassemblies:[],
  equipment:[1,2].map(i=>({id:`EQ-${i}`,name:`Maszyna ${i}`,stationId:`ST-${i}`,capableOperationIds:['QA-A']})),
  workerRunSelection:{teamWorkerIds:['W-A','W-B'],operations:processSteps.map(s=>({operationId:s.id,workerCount:2,eligibleWorkerIds:['W-A','W-B']}))},
  competencyRequirements:{competencies:[{id:'C-A',name:'Montaż'},{id:'C-B',name:'Kontrola'}],workers:[{workerId:'W-A',competencyIds:['C-A']},{workerId:'W-B',competencyIds:['C-B']}],operations:[{operationId:'QA-A',requiredCompetencyIds:['C-A','C-B']}]},
  stationRouting:{selectionRule:'earliest-start-then-shortest-route',equipmentPlacements:[1,2].map(i=>({stationId:`ST-${i}`,copy:1,equipmentId:`EQ-${i}`})),
    operations:processSteps.map(s=>({operationId:s.id,candidates:[1,2].map(i=>({stationId:`ST-${i}`,copy:1,requiredEquipmentIds:s.id==='QA-A'?[`EQ-${i}`]:[]}))})),
    routes:[{id:'R-1-2',from:{stationId:'ST-1',copy:1},to:{stationId:'ST-2',copy:1},distanceMm:1000,basis:'confirmed',source:'Syntetyczna trasa QA'}]}};
const draft={kind:'domain-draft-save',version:1,sourceSchemaVersion:5,originalJson,project,at:'2026-10-16T10:00:00Z'};
const edge=['C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe','C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe'].find(existsSync);
if(!edge)throw new Error('Brak Edge');
const profileDir=mkdtempSync(join(tmpdir(),'layout-qa-4-3c-'));
const server=spawn('node',['scripts/serve.mjs'],{env:{...process.env,PORT:String(PORT)},stdio:'ignore',windowsHide:true});
const browser=spawn(edge,[`--remote-debugging-port=${CDP}`,`--user-data-dir=${profileDir}`,'--no-first-run','--headless=new','--disable-gpu',`http://127.0.0.1:${PORT}/`],{stdio:'ignore',windowsHide:true});
let ws;
try{
  let target;
  for(let i=0;i<30;i++){await sleep(200);try{target=(await(await fetch(`http://127.0.0.1:${CDP}/json/list`,{signal:AbortSignal.timeout(1000)})).json()).find(t=>t.type==='page');if(target)break;}catch{}}
  if(!target)throw new Error('Brak CDP');
  ws=new WebSocket(target.webSocketDebuggerUrl);await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(new Error('Timeout WebSocket CDP')),5000);ws.onopen=()=>{clearTimeout(timer);resolve();};ws.onerror=reject;});
  let sequence=0;const pending=new Map(),errors=[];
  ws.onmessage=event=>{const m=JSON.parse(event.data);if(m.method==='Runtime.exceptionThrown')errors.push(m.params.exceptionDetails.text);if(pending.has(m.id)){const p=pending.get(m.id);pending.delete(m.id);m.error?p.reject(new Error(m.error.message)):p.resolve(m.result);}};
  const send=(method,params={})=>new Promise((resolve,reject)=>{const id=++sequence;const timer=setTimeout(()=>{pending.delete(id);reject(new Error(`Timeout CDP: ${method}`));},10000);pending.set(id,{resolve:value=>{clearTimeout(timer);resolve(value);},reject:error=>{clearTimeout(timer);reject(error);}});ws.send(JSON.stringify({id,method,params}));});
  const evaluate=async expression=>{const r=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw new Error(r.exceptionDetails.exception?.description??r.exceptionDetails.text);return r.result.value;};
  const until=async expression=>{for(let i=0;i<60;i++){if(await evaluate(expression))return;await sleep(100);}throw new Error(`Timeout: ${expression}`);};
  await send('Page.enable');await send('Runtime.enable');await send('Emulation.setDeviceMetricsOverride',{width:1500,height:1100,deviceScaleFactor:1,mobile:false});
  await send('Page.navigate',{url:`http://127.0.0.1:${PORT}/`});await until(`!!document.querySelector('.studio-nav')`);
  await evaluate(`localStorage.setItem(${JSON.stringify(key)},${JSON.stringify(JSON.stringify(draft))});localStorage.setItem('layout-studio-stations-v5',${JSON.stringify(JSON.stringify({project:source,originalJson:'',at:draft.at}))})`);
  const open=async()=>{await send('Page.reload');await sleep(500);await until(`!!document.querySelector('.studio-nav')`);await evaluate(`[...document.querySelectorAll('.studio-nav button')].find(b=>b.textContent.includes('Stanowiska v5')).click()`);await until(`!!document.querySelector('[aria-label="Bilans zasobów szkicu 6"]')`);};
  await open();await until(`!!localStorage.getItem('layout-studio-v3')`);await open();await sleep(800);
  const legacy=await evaluate(`localStorage.getItem('layout-studio-stations-v5')`),legacy4=await evaluate(`JSON.parse(localStorage.getItem('layout-studio-v3')).project`);
  const panel='Bilans zasobów szkicu 6';
  const click=async(text,scope=panel)=>{await evaluate(`(()=>{const p=document.querySelector('[aria-label='+${JSON.stringify(JSON.stringify(scope))}+']');const b=[...p.querySelectorAll('button')].find(b=>b.textContent.trim()===${JSON.stringify(text)});if(!b||b.disabled)throw new Error('Brak aktywnego przycisku: '+${JSON.stringify(text)});b.click()})()`);await sleep(80);};
  const field=async(label,value)=>{await evaluate(`(()=>{const e=document.querySelector('[aria-label='+${JSON.stringify(JSON.stringify(label))}+']');const prototype=e.tagName==='SELECT'?HTMLSelectElement.prototype:HTMLInputElement.prototype;Object.getOwnPropertyDescriptor(prototype,'value').set.call(e,${JSON.stringify(value)});e.dispatchEvent(new Event(e.tagName==='SELECT'?'change':'input',{bubbles:true}));})()`);await sleep(50);};
  const toggle=async label=>{await evaluate(`document.querySelector('[aria-label='+${JSON.stringify(JSON.stringify(label))}+']').click()`);await sleep(50);};
  const saved=()=>evaluate(`JSON.parse(localStorage.getItem(${JSON.stringify(key)})).project`);
  const text=()=>evaluate(`document.querySelector('[aria-label="${panel}"]').textContent`);
  const original=await saved();
  await click('Oblicz propozycję bilansu szkicu 6');ok((await text()).includes('dodatni limit'),'Brak walidacji celu');
  await field('Limit obciążenia kopii szkicu 6 [s/szt.]','5');await click('Oblicz propozycję bilansu szkicu 6');ok((await text()).includes('Brak przydziału'),'Brak odmowy przy zbyt małym limicie');
  await field('Limit obciążenia kopii szkicu 6 [s/szt.]','10');await click('Oblicz propozycję bilansu szkicu 6');
  await until(`!!document.querySelector('[aria-label="Propozycja bilansu szkicu 6"]')`);
  ok((await text()).includes('EQ-1')&&(await text()).includes('założenie'),'Brak wyposażenia lub pochodzenia czasu');
  ok(await evaluate(`([...document.querySelectorAll('[aria-label="${panel}"] button')].find(b=>b.textContent==='Zatwierdź przydziały bilansu szkicu 6')).disabled`),'Zatwierdzenie bez przeglądu jest aktywne');
  deepStrictEqual(await saved(),original,'Sam podgląd zmienił zapis');
  await toggle('Akceptuję przydziały i ograniczenie dopuszczeń szkicu 6');await click('Zatwierdź przydziały bilansu szkicu 6');
  const applied=await saved();ok(applied.stationRouting.operations.every(o=>o.candidates.length===1));
  deepStrictEqual(applied.stations.map(s=>s.id),original.stations.map(s=>s.id));deepStrictEqual(applied.equipment,original.equipment);
  deepStrictEqual(applied.stationRouting.routes,original.stationRouting.routes);deepStrictEqual(applied.layoutObjects,original.layoutObjects);
  await click('Cofnij dane szkicu');deepStrictEqual(await saved(),original);await click('Ponów dane szkicu');deepStrictEqual(await saved(),applied);
  await toggle('Symulacja bez transportu — just in time');await field('Odstęp przybycia szkicu 6 [s]','1');await click('Oblicz harmonogram szkicu 6','Harmonogram zespołu szkicu 6');await until(`!!document.querySelector('[aria-label="Wynik harmonogramu szkicu 6"]')`);
  // A fresh proposal must clear the previous schedule on approval, even if assignments match.
  await field('Limit obciążenia kopii szkicu 6 [s/szt.]','10');await field('Algorytm bilansu szkicu 6','LCR');await click('Oblicz propozycję bilansu szkicu 6');
  ok((await text()).includes('LCR'));await toggle('Akceptuję przydziały i ograniczenie dopuszczeń szkicu 6');await click('Zatwierdź przydziały bilansu szkicu 6');
  ok(!await evaluate(`!!document.querySelector('[aria-label="Wynik harmonogramu szkicu 6"]')`),'Nie unieważniono harmonogramu');
  await open();deepStrictEqual(await saved(),applied,'Reload zmienił przydziały');
  await field('Limit obciążenia kopii szkicu 6 [s/szt.]','10');await click('Oblicz propozycję bilansu szkicu 6');
  await evaluate(`document.querySelector('[aria-label="${panel}"]').scrollIntoView({block:'start'})`);
  mkdirSync('outputs/qa',{recursive:true});writeFileSync('outputs/qa/verify_4_3c.png',Buffer.from((await send('Page.captureScreenshot',{format:'png'})).data,'base64'));
  // A separate one-person choice cannot cover the complementary two-skill requirement.
  const insufficient=structuredClone(original);insufficient.operations[0].staffing.timeVariants.push({workerCount:1,timeProfile:structuredClone(profile)});insufficient.workerRunSelection.operations[0].workerCount=1;
  await evaluate(`localStorage.setItem(${JSON.stringify(key)},${JSON.stringify(JSON.stringify({...draft,project:insufficient}))})`);await open();
  await field('Limit obciążenia kopii szkicu 6 [s/szt.]','100');await click('Oblicz propozycję bilansu szkicu 6');ok((await text()).includes('brak wykonalnej obsady'),'Brak odmowy kompetencji');
  strictEqual(await evaluate(`localStorage.getItem('layout-studio-stations-v5')`),legacy);deepStrictEqual(await evaluate(`JSON.parse(localStorage.getItem('layout-studio-v3')).project`),legacy4);
  strictEqual(await evaluate(`JSON.parse(localStorage.getItem(${JSON.stringify(key)})).originalJson`),originalJson);ok(!errors.length,errors.join('; '));
  console.log('PASS 4.3c UI: RPW/LCR, brak przydziału i kompetencji, wyposażenie, przegląd, przydziały, historia, worker/JIT, unieważnienie, reload, izolacja 4/5 i oryginału.');
}finally{ws?.close();browser.kill();server.kill();}
