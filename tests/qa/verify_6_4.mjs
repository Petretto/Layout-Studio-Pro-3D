import {spawn} from 'node:child_process';
import {existsSync,mkdtempSync,mkdirSync,writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {ok,strictEqual,deepStrictEqual} from 'node:assert';
const port=5250,cdp=9390,sleep=ms=>new Promise(r=>setTimeout(r,ms));
const edge=['C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe','C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe'].find(existsSync);
if(!edge)throw new Error('Brak Edge');
const server=spawn('node',['scripts/serve.mjs'],{env:{...process.env,PORT:String(port)},stdio:'ignore',windowsHide:true});
const browser=spawn(edge,[`--remote-debugging-port=${cdp}`,`--user-data-dir=${mkdtempSync(join(tmpdir(),'layout-qa-6-4-'))}`,'--headless=new','--no-first-run','--disable-gpu','about:blank'],{stdio:'ignore',windowsHide:true});
let ws;
try{
  let target;
  for(let i=0;i<40;i++){try{target=(await(await fetch(`http://127.0.0.1:${cdp}/json/list`,{signal:AbortSignal.timeout(1000)})).json()).find(t=>t.type==='page');if(target)break;}catch{}await sleep(200);}
  if(!target)throw new Error('Brak CDP');
  ws=new WebSocket(target.webSocketDebuggerUrl);await new Promise((resolve,reject)=>{ws.onopen=resolve;ws.onerror=reject;});
  let id=0;const pending=new Map(),errors=[];
  ws.onmessage=e=>{const m=JSON.parse(e.data);if(m.method==='Runtime.exceptionThrown')errors.push(m.params.exceptionDetails.text);if(pending.has(m.id)){const p=pending.get(m.id);pending.delete(m.id);m.error?p.reject(new Error(m.error.message)):p.resolve(m.result);}};
  const send=(method,params={})=>new Promise((resolve,reject)=>{const next=++id;const timer=setTimeout(()=>{pending.delete(next);reject(new Error('Timeout '+method));},10000);pending.set(next,{resolve:r=>{clearTimeout(timer);resolve(r);},reject:e=>{clearTimeout(timer);reject(e);}});ws.send(JSON.stringify({id:next,method,params}));});
  const evaluate=async expression=>{const r=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw new Error(r.exceptionDetails.exception?.description??r.exceptionDetails.text);return r.result.value;};
  const until=async expression=>{for(let i=0;i<60;i++){if(await evaluate(expression))return;await sleep(100);}throw new Error('Timeout '+expression);};
  const click=async text=>{await evaluate(`(()=>{const b=[...document.querySelectorAll('button')].find(b=>b.textContent.trim()===${JSON.stringify(text)});if(!b||b.disabled)throw new Error('Brak '+${JSON.stringify(text)});b.click()})()`);await sleep(120);};
  const field=async(label,value)=>{await evaluate(`(()=>{const e=[...document.querySelectorAll('.hall-drawer label')].find(e=>e.textContent===${JSON.stringify(label)})?.querySelector('input');if(!e)throw new Error('Brak pola');Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(e,${JSON.stringify(value)});e.dispatchEvent(new Event('input',{bubbles:true}));})()`);await sleep(50);};
  const saved=()=>evaluate(`JSON.parse(localStorage.getItem('layout-studio-v3')).project`);
  const viewport=async width=>{await send('Emulation.setDeviceMetricsOverride',{width,height:1100,deviceScaleFactor:1,mobile:false});await sleep(100);};
  const open=async()=>{await send('Page.reload');await until(`!!document.querySelector('.studio-nav')`);await evaluate(`[...document.querySelectorAll('.studio-nav button')].find(b=>b.textContent.includes('5 Hala')).click()`);await until(`!!document.querySelector('.hall-workspace')`);};
  await send('Runtime.enable');await send('Page.enable');await viewport(1440);
  await send('Page.navigate',{url:`http://127.0.0.1:${port}/`});await until(`!!document.querySelector('.studio-nav')`);
  await click('Zapisz lokalnie');await open();await click('Zapisz lokalnie');await open();
  const baseline=await saved(),polygons=await evaluate(`[...document.querySelectorAll('[data-object-id] polygon')].map(e=>e.getAttribute('points'))`);
  const choose=async id=>{await evaluate(`(()=>{const e=document.querySelector('[aria-label="Model wizualny wyposażenia"]');Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype,'value').set.call(e,${JSON.stringify(id)});e.dispatchEvent(new Event('change',{bubbles:true}));})()`);await sleep(100);};
  const selectTable=async()=>{await click('Biblioteka i drzewo');await evaluate(`[...document.querySelectorAll('.hall-tree button')].find(b=>b.textContent.includes('WS-1')).click()`);await until(`!!document.querySelector('[aria-label="Wygląd wyposażenia 6.4"]')`);};
  const navigate=async text=>{await evaluate(`[...document.querySelectorAll('.studio-nav button')].find(b=>b.textContent.includes(${JSON.stringify(text)})).click()`);await sleep(200);};
  const screenshot=async name=>{mkdirSync('outputs/qa',{recursive:true});writeFileSync(`outputs/qa/${name}.png`,Buffer.from((await send('Page.captureScreenshot',{format:'png'})).data,'base64'));};
  await selectTable();await choose('concept-assembly-bench');deepStrictEqual(await saved(),baseline,'Podgląd wyboru zapisał projekt');
  const oldWidth=await evaluate(`[...document.querySelectorAll('.hall-drawer form label')].find(e=>e.textContent==='Szerokość [mm]').querySelector('input').value`);
  await field('Szerokość [mm]',String(Number(oldWidth)+1));ok(await evaluate(`[...document.querySelectorAll('button')].find(b=>b.textContent==='Zastosuj wygląd').disabled`),'Wygląd może zgubić niezapisane wymiary');await field('Szerokość [mm]',oldWidth);
  await click('Zastosuj wygląd');await click('Zapisz lokalnie');
  const applied=await saved(),object=applied.layoutObjects.find(o=>o.visualModelId==='concept-assembly-bench');ok(object);
  strictEqual(applied.layoutMode,baseline.layoutMode);deepStrictEqual(applied.processSteps,baseline.processSteps);deepStrictEqual(applied.demand,baseline.demand);deepStrictEqual(applied.workstationSettings,baseline.workstationSettings);
  deepStrictEqual(await evaluate(`[...document.querySelectorAll('[data-object-id] polygon')].map(e=>e.getAttribute('points'))`),polygons,'Wygląd zmienił obrysy 2D');
  await click('Cofnij');await click('Zapisz lokalnie');ok(!(await saved()).layoutObjects.some(o=>o.visualModelId));
  await click('Ponów');await click('Zapisz lokalnie');strictEqual((await saved()).layoutObjects.find(o=>o.id===object.id).visualModelId,'concept-assembly-bench');
  await navigate('6 3D');await until(`!!document.querySelector('.scene canvas')`);await sleep(700);await click('Zbliż na wybrany obiekt');await sleep(400);
  await evaluate(`document.querySelector('.scene').scrollIntoView({block:'center'})`);await screenshot('verify_6_4_bench_3d');
  for(const id of ['concept-shelf-cart','concept-parts-rack']){
    await choose(id);await click('Zastosuj wygląd');await click('Zapisz lokalnie');await sleep(350);
    const next=await saved(),changed=next.layoutObjects.find(o=>o.id===object.id);const {visualModelId,...geometry}=changed,{visualModelId:_,...expectedGeometry}=object;
    strictEqual(visualModelId,id);deepStrictEqual(geometry,expectedGeometry);deepStrictEqual(next.processSteps,applied.processSteps);
    await click('Zbliż na wybrany obiekt');await sleep(200);
  }
  await evaluate(`document.querySelector('.scene').scrollIntoView({block:'center'})`);await screenshot('verify_6_4_rack_3d');
  const beforeReload=await saved();await open();await click('Zapisz lokalnie');strictEqual((await saved()).layoutObjects.find(o=>o.id===object.id).visualModelId,'concept-parts-rack');
  await selectTable();strictEqual(await evaluate(`document.querySelector('[aria-label="Model wizualny wyposażenia"]').value`),'concept-parts-rack');
  for(const width of [1440,600]){await viewport(width);await evaluate(`document.querySelector('.hall-drawer').scrollIntoView({block:'start'});document.querySelector('.hall-drawer').scrollTop=0`);ok(await evaluate(`document.documentElement.scrollWidth<=innerWidth`));ok(await evaluate(`(()=>{const r=document.querySelector('[aria-label="Model wizualny wyposażenia"]').getBoundingClientRect();return r.x>=0&&r.right<=innerWidth&&r.top<innerHeight;})()`));await screenshot(`verify_6_4_controls_${width}`);}
  await choose('');await click('Zastosuj wygląd');await click('Zapisz lokalnie');ok(!(await saved()).layoutObjects.find(o=>o.id===object.id).visualModelId);
  deepStrictEqual((await saved()).processSteps,beforeReload.processSteps);ok(!errors.length,errors.join('; '));
  console.log('PASS 6.4: wybór bez zapisu, zatwierdzenie, obrysy/proces bez zmian, auto, Cofnij/Ponów, 3 koncepty WebGL, zapis/odczyt, 2D/3D wybór, powrót do generatora, 1440/600 px.');
}finally{ws?.close();browser.kill();server.kill();}
