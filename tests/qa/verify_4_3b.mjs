import {spawn} from 'node:child_process';
import {mkdtempSync, readFileSync, writeFileSync, mkdirSync, existsSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {deepStrictEqual} from 'node:assert';
const PORT=5243, CDP=9383, key='layout-studio-domain-v6-draft-v1';
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const source=JSON.parse(readFileSync('tests/qa/Eko_D5_actual_export_v5.json','utf8'));
source.name='Kompetencje — syntetyczny proces testowy';source.algorithm='Manual';source.layoutObjects=[];source.bom=[];
source.processSteps=['QA-A','QA-B'].map((id,i)=>({id,name:`Operacja ${id}`,standardTimeSeconds:10,vaTimeSeconds:10,nvaTimeSeconds:0,
  sequenceNumber:i+1,predecessorIds:i?['QA-A']:[],assignedWorkstationId:`ST-${i+1}`}));
source.stations=source.processSteps.map((s,i)=>({id:`ST-${i+1}`,name:`Stanowisko ${i+1}`,operationIds:[s.id]}));source.workstationSettings={};
const originalJson=JSON.stringify(source), {processSteps,workstationSettings,...rest}=source;
const profile={durationSeconds:10,durationBasis:'assumed',manualWork:[],machineRun:[],operatorPresence:[{startSeconds:0,endSeconds:10,basis:'assumed'}]};
const project={...rest,schemaVersion:6,modelStatus:'incomplete',operations:processSteps.map(({assignedWorkstationId,...s})=>({...s,
  staffing:{requiredWorkers:1,timeVariants:[1,2].map(workerCount=>({workerCount,timeProfile:structuredClone(profile)}))}})),
  stationSettings:Object.fromEntries(source.stations.map(s=>[s.id,{operators:2,parallelStations:1}])),
  workers:[{id:'W-A',name:'Osoba A'},{id:'W-B',name:'Osoba B'}],workerPools:[],equipment:[],product:null,subassemblies:[],
  workerRunSelection:{teamWorkerIds:['W-A','W-B'],operations:processSteps.map(s=>({operationId:s.id,workerCount:2,eligibleWorkerIds:['W-A','W-B']}))}};
const draft={kind:'domain-draft-save',version:1,sourceSchemaVersion:5,originalJson,project,at:'2026-10-16T10:00:00Z'};
const edge=['C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe','C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe'].find(existsSync);
if(!edge)throw new Error('Brak Edge');
const profileDir=mkdtempSync(join(tmpdir(),'layout-qa-4-3b-'));
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
  const check=(condition,message)=>{if(!condition)throw new Error(message);};
  const until=async(expression)=>{for(let i=0;i<60;i++){if(await evaluate(expression))return;await sleep(100);}throw new Error(`Timeout: ${expression}`);};
  await send('Page.enable');await send('Runtime.enable');await send('Emulation.setDeviceMetricsOverride',{width:1500,height:1100,deviceScaleFactor:1,mobile:false});
  await send('Page.navigate',{url:`http://127.0.0.1:${PORT}/`});await until(`!!document.querySelector('.studio-nav')`);
  await evaluate(`localStorage.setItem(${JSON.stringify(key)},${JSON.stringify(JSON.stringify(draft))});localStorage.setItem('layout-studio-stations-v5',${JSON.stringify(JSON.stringify({project:source,originalJson:'',at:draft.at}))})`);
  const open=async()=>{await send('Page.reload');await sleep(500);await until(`!!document.querySelector('.studio-nav')`);await evaluate(`(()=>{const buttons=[...document.querySelectorAll('.studio-nav button')];const button=buttons.find(b=>b.textContent.includes('Stanowiska v5'));if(!button)throw new Error('Nawigacja: '+buttons.map(b=>b.textContent).join('|'));button.click()})()`);await until(`!!document.querySelector('[aria-label="Kompetencje obsady szkicu 6"]')`);};
  await open();
  await until(`!!localStorage.getItem('layout-studio-v3')`);
  // Establish the v4 baseline after its normal initial parser/default normalization.
  await open();await sleep(800);
  const legacy=await evaluate(`localStorage.getItem('layout-studio-stations-v5')`),legacy4=await evaluate(`JSON.stringify(JSON.parse(localStorage.getItem('layout-studio-v3')).project)`);
  const panel='Kompetencje obsady szkicu 6';
  const click=async(text,scope=panel)=>{await evaluate(`(()=>{const p=document.querySelector('[aria-label='+${JSON.stringify(JSON.stringify(scope))}+']');const b=[...p.querySelectorAll('button')].find(b=>b.textContent.trim()===${JSON.stringify(text)});if(!b||b.disabled)throw new Error('Brak aktywnego przycisku: '+${JSON.stringify(text)});b.click()})()`);await sleep(80);};
  const field=async(label,value)=>{await evaluate(`(()=>{const e=document.querySelector('[aria-label='+${JSON.stringify(JSON.stringify(label))}+']');if(!e||e.disabled)throw new Error('Brak pola: '+${JSON.stringify(label)});Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(e,${JSON.stringify(value)});e.dispatchEvent(new Event('input',{bubbles:true}));})()`);await sleep(50);};
  const toggle=async label=>{await evaluate(`document.querySelector('[aria-label='+${JSON.stringify(JSON.stringify(label))}+']').click()`);await sleep(50);};
  const saved=()=>evaluate(`JSON.parse(localStorage.getItem(${JSON.stringify(key)})).project`);
  const text=()=>evaluate(`document.querySelector('[aria-label="${panel}"]').textContent`);
  await click('Dodaj kompetencję');await click('Zapisz kompetencje');check((await text()).includes('Nie zapisano kompetencji'),'Brak walidacji pustej definicji');
  await field('Kompetencja 1 ID','C-A');await field('Kompetencja 1 nazwa','Montaż');
  await click('Dodaj kompetencję');await field('Kompetencja 2 ID','C-B');await field('Kompetencja 2 nazwa','Kontrola');
  await toggle('Osoba W-A kompetencja C-A');await toggle('Osoba W-B kompetencja C-B');
  await toggle('Operacja QA-A wymaga C-A');await toggle('Operacja QA-A wymaga C-B');
  await click('Zapisz kompetencje');const configured=JSON.stringify(await saved());
  check((await text()).includes('Istnieje obsada 2 osób'),'Brak oceny kompetencji uzupełniających się');
  check(await evaluate(`document.querySelector('[aria-label="Kompetencja 1 ID"]').disabled`),'ID zapisanej kompetencji nie jest stałe');
  check(await evaluate(`([...document.querySelectorAll('[aria-label="${panel}"] button')].find(b=>b.textContent==='Usuń kompetencję 1')).disabled`),'Można usunąć używaną kompetencję');
  await click('Cofnij dane szkicu');check(!(await saved()).competencyRequirements,'Cofnij nie odtworzył braku konfiguracji');
  await click('Ponów dane szkicu');check(JSON.stringify(await saved())===configured,'Ponów nie odtworzył konfiguracji');
  await field('Kompetencja 1 nazwa','Nie zapisuj');await click('Odrzuć zmiany kompetencji');check(JSON.stringify(await saved())===configured,'Odrzuć zmienił zapis');
  await click('Dodaj kompetencję');await field('Kompetencja 3 ID','C-A');await field('Kompetencja 3 nazwa','Duplikat');await click('Zapisz kompetencje');
  check((await text()).includes('Nie zapisano kompetencji')&&JSON.stringify(await saved())===configured,'Duplikat zapisany');await click('Odrzuć zmiany kompetencji');
  await toggle('Symulacja bez transportu — just in time');
  await field('Odstęp przybycia szkicu 6 [s]','1');
  await click('Oblicz harmonogram szkicu 6','Harmonogram zespołu szkicu 6');
  try{await until(`!!document.querySelector('[aria-label="Wynik harmonogramu szkicu 6"]')`);}catch(error){throw new Error(error.message+' '+await evaluate(`document.querySelector('[aria-label="Harmonogram zespołu szkicu 6"]').textContent`));}
  await toggle('Osoba W-B kompetencja C-B');await click('Zapisz kompetencje');
  check(!await evaluate(`!!document.querySelector('[aria-label="Wynik harmonogramu szkicu 6"]')`),'Nie unieważniono wyniku');
  check((await text()).includes('brak wykonalnej obsady'),'Brak diagnostyki niewykonalności');
  await toggle('Symulacja bez transportu — just in time');await field('Odstęp przybycia szkicu 6 [s]','1');await click('Oblicz harmonogram szkicu 6','Harmonogram zespołu szkicu 6');
  await until(`document.querySelector('[aria-label="Harmonogram zespołu szkicu 6"]').textContent.includes('brak wykonalnej obsady')`);
  await click('Cofnij dane szkicu');check(JSON.stringify(await saved())===configured,'Cofnij po symulacji nie odtworzył konfiguracji');
  await open();check(JSON.stringify(await saved())===configured&&(await text()).includes('Istnieje obsada 2 osób'),'Reload utracił dane lub ocenę');
  await evaluate(`document.querySelector('[aria-label="${panel}"]').scrollIntoView({block:'start'})`);
  mkdirSync('outputs/qa',{recursive:true});writeFileSync('outputs/qa/verify_4_3b.png',Buffer.from((await send('Page.captureScreenshot',{format:'png'})).data,'base64'));
  await click('Usuń konfigurację kompetencji');check(!(await saved()).competencyRequirements,'Nie usunięto konfiguracji');
  await click('Cofnij dane szkicu');check(JSON.stringify(await saved())===configured,'Cofnij usunięcia nie odtworzył danych');
  check(await evaluate(`localStorage.getItem('layout-studio-stations-v5')`)===legacy,'Zmieniono projekt 5');
  const after4=await evaluate(`JSON.stringify(JSON.parse(localStorage.getItem('layout-studio-v3')).project)`);
  deepStrictEqual(JSON.parse(after4),JSON.parse(legacy4),'Zmieniono projekt 4');
  check((await evaluate(`JSON.parse(localStorage.getItem(${JSON.stringify(key)})).originalJson`))===originalJson,'Zmieniono oryginał');
  check(!errors.length,`Błędy JS: ${errors.join('; ')}`);
  console.log('PASS 4.3b: formularz, walidacja, kompetencje uzupełniające, historia, odrzuć, worker, unieważnienie, diagnostyka, reload, usuwanie, izolacja 4/5 i oryginału.');
}finally{ws?.close();browser.kill();server.kill();}
