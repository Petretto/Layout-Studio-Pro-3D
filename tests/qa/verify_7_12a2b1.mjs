import {spawn} from 'node:child_process';
import {existsSync,mkdirSync,readFileSync,writeFileSync,mkdtempSync,readdirSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {resolve,join} from 'node:path';
import {strictEqual,deepStrictEqual,ok} from 'node:assert';

// Active domain view acceptance in an isolated Edge profile; synthetic inputs and deliberate storage faults.
const port=5301,cdp=9401,sleep=ms=>new Promise(r=>setTimeout(r,ms));
const edge=['C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe','C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe'].find(existsSync);
if(!edge)throw new Error('Edge not found');
const out=resolve('outputs/qa/7_12a2b1_ui');mkdirSync(out,{recursive:true});
const server=spawn('node',['scripts/serve.mjs'],{env:{...process.env,PORT:String(port)},stdio:'ignore',windowsHide:true});
const browser=spawn(edge,[`--remote-debugging-port=${cdp}`,`--user-data-dir=${mkdtempSync(join(tmpdir(),'edge-7-12a2b1-'))}`,'--headless=new','--no-first-run','--use-angle=swiftshader','--enable-unsafe-swiftshader','--window-size=1440,1100','--force-device-scale-factor=1','about:blank'],{stdio:'ignore',windowsHide:true});
let ws;
try{
  let target;
  for(let i=0;i<50;i++){try{target=(await(await fetch(`http://127.0.0.1:${cdp}/json/list`,{signal:AbortSignal.timeout(1000)})).json()).find(t=>t.type==='page');if(target)break;}catch{}await sleep(200);}
  if(!target)throw new Error('Missing CDP target');
  ws=new WebSocket(target.webSocketDebuggerUrl);await new Promise((resolve,reject)=>{ws.onopen=resolve;ws.onerror=reject;});
  let id=0;const pending=new Map(),errors=[];
  ws.onmessage=e=>{const m=JSON.parse(e.data);if(m.method==='Page.javascriptDialogOpening')console.error('Unexpected browser dialog',m.params.type,m.params.message);if(m.method==='Runtime.exceptionThrown')errors.push(m.params.exceptionDetails.text);if(pending.has(m.id)){const p=pending.get(m.id);pending.delete(m.id);m.error?p.reject(new Error(m.error.message)):p.resolve(m.result);}};
  const send=(method,params={})=>new Promise((resolve,reject)=>{const next=++id,timer=setTimeout(()=>{pending.delete(next);reject(new Error('Timeout '+method+' '+(params.expression??'').slice(0,250)));},15000);pending.set(next,{resolve:r=>{clearTimeout(timer);resolve(r);},reject:e=>{clearTimeout(timer);reject(e);}});ws.send(JSON.stringify({id:next,method,params}));});
  const evaluate=async expression=>{const r=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw new Error(r.exceptionDetails.exception?.description??r.exceptionDetails.text);return r.result.value;};
  const until=async expression=>{for(let i=0;i<100;i++){if(await evaluate(expression))return;await sleep(100);}throw new Error('Timeout '+expression);};
  const click=async(text,scope='document')=>{await evaluate(`(()=>{const b=[...${scope}.querySelectorAll('button')].find(b=>b.textContent.trim()===${JSON.stringify(text)});if(!b||b.disabled)throw new Error('Missing '+${JSON.stringify(text)});b.click()})()`);await sleep(100);};
  const nav=async text=>{await evaluate(`[...document.querySelectorAll('.studio-nav button')].find(b=>b.textContent.includes(${JSON.stringify(text)})).click()`);await sleep(120);};
  const setElement=(value)=>`const proto=e.tagName==='SELECT'?HTMLSelectElement.prototype:HTMLInputElement.prototype;Object.getOwnPropertyDescriptor(proto,'value').set.call(e,${JSON.stringify(value)});e.dispatchEvent(new Event(e.tagName==='SELECT'?'change':'input',{bubbles:true}));`;
  const field=async(selector,value)=>{await evaluate(`(()=>{const e=document.querySelector(${JSON.stringify(selector)});if(!e)throw new Error('Missing field');${setElement(value)}})()`);await sleep(80);};
  const upload=async(selector,file)=>{const {root}=await send('DOM.getDocument');const {nodeId}=await send('DOM.querySelector',{nodeId:root.nodeId,selector});ok(nodeId,'File input must exist');await send('DOM.setFileInputFiles',{nodeId,files:[resolve(file)]});};
  const snap=async name=>{
    await evaluate(`new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))`);await sleep(500);
    writeFileSync(join(out,name+'.png'),Buffer.from((await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false})).data,'base64'));
  };
  await send('Page.enable');await send('Runtime.enable');
  await send('Emulation.setDeviceMetricsOverride',{width:1440,height:1100,deviceScaleFactor:1,mobile:false});
  await send('Page.navigate',{url:`http://127.0.0.1:${port}/`});await until(`!!document.querySelector('.studio-nav')`);


  const downloads=mkdtempSync(join(out,'downloads_'));await send('Browser.setDownloadBehavior',{behavior:'allow',downloadPath:downloads});
  const downloaded=async action=>{const destination=mkdtempSync(join(downloads,'action_'));await send('Browser.setDownloadBehavior',{behavior:'allow',downloadPath:destination});await action();for(let i=0;i<100;i++){const name=readdirSync(destination).find(n=>n.endsWith('.json'));if(name)return join(destination,name);await sleep(100);}throw new Error('Download incomplete');};
  const ready=async()=>{await sleep(900);await until(`!!document.querySelector('.studio-nav')&&!document.querySelector('[aria-label="Pakiet projektu"]')`);};
  await click('Pakiet projektu');await upload('[aria-label="Plik pakietu projektu"]','przyklady/01_zestaw_montazowy/projekt-pokazowy.json');await until(`document.body.textContent.includes('Pakiet poprawny.')`);await downloaded(()=>click('Pobierz kopię ratunkową przed importem'));await evaluate(`document.querySelector('[aria-label="Pakiet projektu"] input[type=checkbox]').click()`);await click('Wczytaj pakiet i przeładuj');await ready();
  const source4=await evaluate(`JSON.parse(localStorage.getItem('layout-studio-v3')).project`);
  await nav('Stanowiska v5');
  const player=`document.querySelector('[aria-label="Odtwarzanie operacji projektu 3D"]')`;
  const timeInput='[aria-label="Czas odtwarzania operacji [s]"]';
  await until(`!!${player}`);ok(!(await evaluate(`!!document.querySelector(${JSON.stringify(timeInput)})`)));
  await evaluate(`document.querySelector('[aria-label="Pokaż 3D aktywnego projektu"]').click()`);await until(`!!document.querySelector('canvas[aria-label="Geometria 3D aktywnego projektu"]')`);
  await evaluate(`document.querySelector('canvas[aria-label="Geometria 3D aktywnego projektu"]').scrollIntoView({block:'center'})`);await snap('base_geometry');
  const calculate=async end=>{
    await field('[aria-label="Liczba sztuk szkicu 6"]','3');await field('[aria-label="Odstęp przybycia szkicu 6 [s]"]','1');
    await evaluate(`(()=>{const e=document.querySelector('[aria-label="Symulacja bez transportu — just in time"]');if(!e.checked)e.click()})()`);await click('Oblicz harmonogram szkicu 6');await until(`!!document.querySelector(${JSON.stringify(timeInput)})`);
    ok(await evaluate(`document.querySelector('[aria-label="Stan odtwarzania operacji"]').textContent.includes('/ ${end} s')`));
  };
  await calculate(170);const baseResult=await evaluate(`${player}.dataset.resultSha`),baseModel=await evaluate(`${player}.dataset.modelSha`);
  await field(timeInput,'25');const op20=await evaluate(`[...document.querySelectorAll('[data-run-id][data-state="work"]')].find(r=>r.textContent.includes('1 / ZM-OP20'))?.dataset.runId`);ok(op20);
  await field('[aria-label="Wybrane wykonanie operacji 3D"]',op20);strictEqual(await evaluate(`document.querySelector('[aria-label="Wybrane wykonanie operacji 3D"]').value`),op20);
  await click('Krok +1 s');strictEqual(Number(await evaluate(`document.querySelector(${JSON.stringify(timeInput)}).value`)),26);
  await click('Początek odtwarzania');await click('Odtwarzaj harmonogram');await until(`Number(document.querySelector(${JSON.stringify(timeInput)}).value)>0.1`);await click('Pauza odtwarzania');
  const paused=await evaluate(`document.querySelector(${JSON.stringify(timeInput)}).value`);await sleep(350);strictEqual(await evaluate(`document.querySelector(${JSON.stringify(timeInput)}).value`),paused);
  await field('[aria-label="Prędkość odtwarzania operacji"]','5000');await click('Odtwarzaj harmonogram');await until(`document.querySelector('[aria-label="Stan odtwarzania operacji"]').textContent.includes('ukończono 3/3')`);
  strictEqual(await evaluate(`${player}.dataset.resultSha`),baseResult);strictEqual(await evaluate(`${player}.dataset.modelSha`),baseModel);
  // Condition changes invalidate the old result and its playback immediately.
  await field('[aria-label="Odstęp przybycia szkicu 6 [s]"]','2');ok(!(await evaluate(`!!document.querySelector(${JSON.stringify(timeInput)})`)));strictEqual(await evaluate(`${player}.dataset.resultSha`),'');
  await evaluate(`(()=>{const row=[...document.querySelectorAll('[aria-label="Zapisane warianty szkicu 6"] tbody tr')].find(r=>r.textContent.includes('BASIC-CONSOLIDATED'));[...row.querySelectorAll('button')].find(b=>b.textContent==='Wczytaj do szkicu 6').click()})()`);
  await until(`${player}.dataset.modelSha!==${JSON.stringify(baseModel)}`);strictEqual(await evaluate(`${player}.dataset.resultSha`),'');
  await calculate(190);const consResult=await evaluate(`${player}.dataset.resultSha`);
  await evaluate(`document.querySelector('[aria-label="Pokaż 3D aktywnego projektu"]').click()`);await until(`!!document.querySelector('canvas[aria-label="Geometria 3D aktywnego projektu"]')`);
  await field(timeInput,'25');const consOp20=await evaluate(`[...document.querySelectorAll('[data-run-id][data-state="work"]')].find(r=>r.textContent.includes('1 / ZM-OP20'))?.dataset.runId`);ok(consOp20);await field('[aria-label="Wybrane wykonanie operacji 3D"]',consOp20);
  await evaluate(`document.querySelector('canvas[aria-label="Geometria 3D aktywnego projektu"]').scrollIntoView({block:'center'})`);await snap('consolidated_operation_3d');
  await click('Koniec odtwarzania');ok(await evaluate(`document.querySelector('[aria-label="Stan odtwarzania operacji"]').textContent.includes('190 / 190 s · ukończono 3/3')`));
  strictEqual(await evaluate(`${player}.dataset.resultSha`),consResult);
  for(let i=0;i<2;i++){await evaluate(`document.querySelector('[aria-label="Pokaż 3D aktywnego projektu"]').click()`);await sleep(150);await evaluate(`document.querySelector('[aria-label="Pokaż 3D aktywnego projektu"]').click()`);await until(`!!document.querySelector('canvas[aria-label="Geometria 3D aktywnego projektu"]')`);}
  deepStrictEqual(await evaluate(`JSON.parse(localStorage.getItem('layout-studio-v3')).project`),source4);
  ok(!(await evaluate(`document.body.textContent.includes('wymaga dostępnego WebGL')||document.body.textContent.includes('Utracono kontekst WebGL')`)));
  // Save/reopen must preserve model but never resurrect a session-only stale result.
  const draftBefore=await evaluate(`localStorage.getItem('layout-studio-domain-v6-draft-v1')`);
  await send('Page.reload');await ready();await nav('Stanowiska v5');await until(`!!${player}`);strictEqual(await evaluate(`${player}.dataset.resultSha`),'');strictEqual(await evaluate(`localStorage.getItem('layout-studio-domain-v6-draft-v1')`),draftBefore);await calculate(190);
  ok(!errors.length,errors.join('; '));
  writeFileSync(join(out,'report.json'),JSON.stringify({at:new Date().toISOString(),result:'PASS',scope:'isolated Edge with software WebGL; real imported demo and worker schedule',checks:{geometryBeforeCalculation:true,webglRendered:true,time25OperationSelection:true,stepAndPauseStable:true,speed5000KeepsResult:true,conditionsInvalidate:true,variantInvalidates:true,consolidated190:true,geometryToggleLifecycle:true,source4Preserved:true,reloadPreservesModelNotOldResult:true},runtimeErrors:errors},null,2));
  console.log('PASS 7.12.A2b1 UI: 3D, real operation selection/time/pause/step/speed, stale result invalidation, 170/190, reload and WebGL lifecycle');
}finally{ws?.close();browser.kill();server.kill();}
