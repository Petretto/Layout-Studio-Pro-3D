import {spawn} from 'node:child_process';
import {existsSync,mkdirSync,readFileSync,writeFileSync,mkdtempSync,readdirSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {resolve,join} from 'node:path';
import {strictEqual,deepStrictEqual,ok} from 'node:assert';

// Active domain view acceptance in an isolated Edge profile; synthetic inputs and deliberate storage faults.
const port=5300,cdp=9400,sleep=ms=>new Promise(r=>setTimeout(r,ms));
const edge=['C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe','C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe'].find(existsSync);
if(!edge)throw new Error('Edge not found');
const out=resolve('outputs/qa/7_12a2a_ui');mkdirSync(out,{recursive:true});
const server=spawn('node',['scripts/serve.mjs'],{env:{...process.env,PORT:String(port)},stdio:'ignore',windowsHide:true});
const browser=spawn(edge,[`--remote-debugging-port=${cdp}`,`--user-data-dir=${mkdtempSync(join(tmpdir(),'edge-7-12a2a-'))}`,'--headless=new','--no-first-run','--disable-gpu','--window-size=1440,1100','--force-device-scale-factor=1','about:blank'],{stdio:'ignore',windowsHide:true});
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
  const confirm=async()=>{await until(`!!document.querySelector('dialog[open]')`);await click('Potwierdź',`document.querySelector('dialog[open]')`);};
  const downloaded=async action=>{const destination=mkdtempSync(join(downloads,'action_'));await send('Browser.setDownloadBehavior',{behavior:'allow',downloadPath:destination});await action();for(let i=0;i<100;i++){const name=readdirSync(destination).find(n=>!n.endsWith('.crdownload'));if(name)return join(destination,name);await sleep(100);}throw new Error('Download incomplete');};
  const reloadReady=async()=>{await sleep(900);await until(`!!document.querySelector('.studio-nav')&&!document.querySelector('[aria-label="Pakiet projektu"]')`);};
  const importPackage=async path=>{await click('Pakiet projektu');await upload('[aria-label="Plik pakietu projektu"]',path);await until(`document.body.textContent.includes('Pakiet poprawny.')`);await downloaded(()=>click('Pobierz kopię ratunkową przed importem'));await evaluate(`document.querySelector('[aria-label="Pakiet projektu"] input[type=checkbox]').click()`);await click('Wczytaj pakiet i przeładuj');await reloadReady();};
  const scope=`document.querySelector('[aria-label="Spójny widok aktywnego szkicu 6"]')`;
  const comparisonScope=`document.querySelector('[aria-label="Porównanie wariantów szkicu 6"]')`;
  const signature=()=>evaluate(`${scope}.dataset.modelSha`);
  const y=()=>evaluate(`${scope}.querySelector('[data-object-id="ZM-TABLE-2"]').dataset.yMm`);
  const reportButton='Pobierz raport statyczny aktywnego szkicu 6 (.md)';
  await evaluate(`[...document.querySelectorAll('.action-card')].find(e=>e.textContent.includes('Rozpocznij od zera')).click()`);await confirm();
  await importPackage('przyklady/01_zestaw_montazowy/projekt-pokazowy.json');
  const source4=await evaluate(`JSON.parse(localStorage.getItem('layout-studio-v3')).project`);
  await nav('Stanowiska v5');await until(`!!${scope}`);const baseSha=await signature();strictEqual(await y(),'2000');
  ok(await evaluate(`${scope}.textContent.includes('90 szt./h')`));
  const baseFile=await downloaded(()=>click(reportButton));const baseText=readFileSync(baseFile,'utf8');ok(baseText.includes(baseSha)&&baseText.includes('90 szt./h'));writeFileSync(join(out,'base_report.md'),baseText);
  await evaluate(`${scope}.scrollIntoView({block:'start'})`);await snap('base_overview');
  await evaluate(`(()=>{const row=[...document.querySelectorAll('[aria-label="Zapisane warianty szkicu 6"] tbody tr')].find(r=>r.textContent.includes('BASIC-CONSOLIDATED'));[...row.querySelectorAll('button')].find(b=>b.textContent==='Wczytaj do szkicu 6').click()})()`);
  await until(`${scope}.dataset.modelSha!==${JSON.stringify(baseSha)}`);const consSha=await signature();strictEqual(await y(),'4000');
  ok(await evaluate(`${scope}.textContent.includes('72 szt./h')`));
  const rows=await evaluate(`[...${scope}.querySelectorAll('[aria-label="Przydziały aktywnego modelu 6"] tbody tr')].map(r=>[...r.querySelectorAll('td')].map(c=>c.textContent))`);
  ok(rows[0][1].includes('ZM-OP10, ZM-OP20'));strictEqual(rows[0][2],'50');strictEqual(rows[1][1],'rezerwa');strictEqual(rows[1][2],'0');
  const consFile=await downloaded(()=>click(reportButton)),consText=readFileSync(consFile,'utf8');ok(consText.includes(consSha)&&consText.includes('72 szt./h')&&consText.includes('3000/4000/0'));ok(!consText.includes(baseSha));writeFileSync(join(out,'consolidated_report.md'),consText);
  await evaluate(`${scope}.scrollIntoView({block:'start'})`);await snap('consolidated_overview');
  await evaluate(`${scope}.querySelector('svg').scrollIntoView({block:'center'})`);await snap('consolidated_layout');
  await click('Cofnij dane szkicu',comparisonScope);strictEqual(await signature(),baseSha);strictEqual(await y(),'2000');
  await click('Ponów dane szkicu',comparisonScope);strictEqual(await signature(),consSha);strictEqual(await y(),'4000');
  deepStrictEqual(await evaluate(`JSON.parse(localStorage.getItem('layout-studio-v3')).project`),source4);
  await field('[aria-label="Liczba sztuk szkicu 6"]','3');await field('[aria-label="Odstęp przybycia szkicu 6 [s]"]','1');await evaluate(`document.querySelector('[aria-label="Symulacja bez transportu — just in time"]').click()`);await click('Oblicz harmonogram szkicu 6');await until(`!!document.querySelector('[aria-label="Wynik harmonogramu szkicu 6"]')`);
  ok(await evaluate(`document.querySelector('[aria-label="Wynik harmonogramu szkicu 6"]').textContent.includes('koniec ostatniej sztuki: 190 s')`));strictEqual(await signature(),consSha);
  await click('Pakiet projektu');await field('[aria-label="Pochodzenie danych"]','synthetic');const pkgFile=await downloaded(()=>click('Pobierz pakiet projektu'));await click('Zamknij pakiet projektu');await importPackage(pkgFile);
  await send('Page.reload');await reloadReady();await nav('Stanowiska v5');await until(`!!${scope}`);strictEqual(await signature(),consSha);strictEqual(await y(),'4000');
  const reopened=await downloaded(()=>click(reportButton));strictEqual(readFileSync(reopened,'utf8'),consText);
  ok(!errors.length,errors.join('; '));
  writeFileSync(join(out,'report.json'),JSON.stringify({at:new Date().toISOString(),result:'PASS',scope:'isolated Edge; basic synthetic package imported through UI',checks:{baseAndConsolidatedDifferentSignatures:true,assignment20To50AndReserve:true,geometry2000To4000:true,reportContainsCurrentShaAnd72:true,undoRedoRestoresOverview:true,source4Preserved:true,schedule190Preserved:true,exportImportReloadSameModelAndReport:true},baseSha,consSha,runtimeErrors:errors},null,2));
  console.log('PASS 7.12.A2a UI: active6 assignment/layout/report update, undo/redo, source4 preserved, 190s schedule, export/import/reload exact');
}finally{ws?.close();browser.kill();server.kill();}
