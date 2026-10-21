import {spawn} from 'node:child_process';
import {existsSync,mkdirSync,readFileSync,writeFileSync,mkdtempSync,readdirSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {resolve,join} from 'node:path';
import {strictEqual,deepStrictEqual,ok} from 'node:assert';

// Project-package acceptance in an isolated Edge profile; synthetic inputs and deliberate storage faults.
const port=5298,cdp=9398,sleep=ms=>new Promise(r=>setTimeout(r,ms));
const edge=['C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe','C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe'].find(existsSync);
if(!edge)throw new Error('Edge not found');
const out=resolve('outputs/qa/7_12a1_ui');mkdirSync(out,{recursive:true});
const server=spawn('node',['scripts/serve.mjs'],{env:{...process.env,PORT:String(port)},stdio:'ignore',windowsHide:true});
const browser=spawn(edge,[`--remote-debugging-port=${cdp}`,`--user-data-dir=${mkdtempSync(join(tmpdir(),'edge-7-12a1-'))}`,'--headless=new','--no-first-run','--disable-gpu','--window-size=1440,1100','--force-device-scale-factor=1','about:blank'],{stdio:'ignore',windowsHide:true});
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
  const keyMap={v4ProjectRaw:'layout-studio-v3',v4ScenariosRaw:'layout-studio-scenarios-v3',v5StationsRaw:'layout-studio-stations-v5',v6DomainDraftRaw:'layout-studio-domain-v6-draft-v1',v6VariantsRaw:'layout-studio-domain-v6-variants-v1'};
  const slots=()=>evaluate(`Object.fromEntries(Object.entries(${JSON.stringify(keyMap)}).map(([k,v])=>[k,localStorage.getItem(v)]))`);
  const downloaded=async action=>{
    const destination=mkdtempSync(join(downloads,'action_'));await send('Browser.setDownloadBehavior',{behavior:'allow',downloadPath:destination});await action();
    for(let i=0;i<100;i++){const name=readdirSync(destination).find(n=>n.endsWith('.json'));if(name)return join(destination,name);await sleep(100);}
    throw new Error('Download did not complete');
  };
  const ready=async()=>{await sleep(800);await until(`!!document.querySelector('.studio-nav')&&!document.querySelector('[role=dialog][aria-modal=true]')`);};
  const packageInput='input[aria-label="Plik pakietu projektu"]';
  const load=async name=>{await upload(packageInput,`outputs/qa/7_12a1/${name}.project.json`);await until(`document.body.textContent.includes('Pakiet poprawny.')`);};
  const prepare=async()=>{const path=await downloaded(()=>click('Pobierz kopię ratunkową przed importem'));await evaluate(`document.querySelector('[aria-label="Pakiet projektu"] input[type=checkbox]').click()`);return path;};
  // First import in a fresh profile, with no domain draft or variant library installed.
  await click('Pakiet projektu');await click('Pobierz pakiet projektu');await until(`document.body.textContent.includes('Najpierw zapisz poprawny szkic 6')`);
  await load('source4');await prepare();await click('Wczytaj pakiet i przeładuj');await ready();
  await click('Kopie i odzyskiwanie');await upload('input[accept=".json,.lsbackup.json"]','outputs/qa/7_12a1/seed.lsbackup.json');await until(`document.body.textContent.includes('Integralność SHA-256 potwierdzona')`);
  await downloaded(()=>click('Pobierz kopię ratunkową przed przywróceniem'));await evaluate(`document.querySelector('[role=dialog] input[type=checkbox]').click()`);await click('Przywróć stan z kopii i zrestartuj');await ready();
  await click('Pakiet projektu');const before=await slots();const global4=before.v4ScenariosRaw;
  ok(await evaluate(`document.querySelector('main').inert&&document.querySelector('header').inert`));
  await send('Input.dispatchKeyEvent',{type:'keyDown',key:'s',code:'KeyS',modifiers:2});await send('Input.dispatchKeyEvent',{type:'keyUp',key:'s',code:'KeyS',modifiers:2});deepStrictEqual(await slots(),before);
  await upload(packageInput,'outputs/qa/7_12a1/bad_checksum.project.json');await until(`document.body.textContent.includes('Niezgodna suma SHA-256')`);deepStrictEqual(await slots(),before);await snap('invalid_checksum');
  await load('source4');ok(await evaluate(`[...document.querySelectorAll('button')].find(b=>b.textContent==='Wczytaj pakiet i przeładuj').disabled`));await snap('preview_source4');
  await click('Zamknij pakiet projektu');await click('Pakiet projektu');await load('source4');
  const afterCancel=await slots();strictEqual(afterCancel.v5StationsRaw,before.v5StationsRaw);strictEqual(afterCancel.v6DomainDraftRaw,before.v6DomainDraftRaw);
  const rescue=await prepare();deepStrictEqual(JSON.parse(readFileSync(rescue,'utf8')).storage,await slots());
  // Explicit concurrent-change injection: importer must stop before writing.
  await evaluate(`(()=>{const v=JSON.parse(localStorage.getItem('layout-studio-domain-v6-draft-v1'));v.at='2026-10-20T00:00:01Z';localStorage.setItem('layout-studio-domain-v6-draft-v1',JSON.stringify(v));})()`);
  const concurrent=await slots();await click('Wczytaj pakiet i przeładuj');await until(`document.body.textContent.includes('Stan przeglądarki zmienił się')`);deepStrictEqual(await slots(),concurrent);
  await prepare();
  await evaluate(`(()=>{const original=Storage.prototype.setItem;window.qaOriginalSetItem=original;let failed=false;Storage.prototype.setItem=function(k,v){if(k==='layout-studio-domain-v6-draft-v1'&&!failed){failed=true;throw new DOMException('QA quota','QuotaExceededError');}return original.call(this,k,v);};})()`);
  await click('Wczytaj pakiet i przeładuj');await until(`document.body.textContent.includes('Poprzedni stan został zachowany lub odtworzony')`);deepStrictEqual(await slots(),concurrent);await snap('quota_rollback');await evaluate(`Storage.prototype.setItem=window.qaOriginalSetItem`);
  const persistentRescue=await prepare();
  await evaluate(`(()=>{const original=Storage.prototype.setItem;let first=true;Storage.prototype.setItem=function(k,v){if(k==='layout-studio-v3'){if(first){first=false;original.call(this,k,v);}throw new Error('QA persistent failure');}return original.call(this,k,v);};})()`);
  await click('Wczytaj pakiet i przeładuj');await until(`document.body.textContent.includes('Wycofanie nie zostało potwierdzone')`);
  ok(await evaluate(`[...document.querySelectorAll('button')].find(b=>b.textContent==='Zamknij pakiet projektu').disabled`));await snap('rollback_locked');
  await evaluate(`Storage.prototype.setItem=window.qaOriginalSetItem`);await click('Odtwórz pełną kopię ratunkową');
  await upload('input[accept=".json,.lsbackup.json"]',persistentRescue);await until(`document.body.textContent.includes('Integralność SHA-256 potwierdzona')`);
  await downloaded(()=>click('Pobierz kopię ratunkową przed przywróceniem'));await evaluate(`document.querySelector('[role=dialog] input[type=checkbox]').click()`);await click('Przywróć stan z kopii i zrestartuj');await ready();
  await click('Pakiet projektu');await load('source4');await prepare();await click('Wczytaj pakiet i przeładuj');await ready();
  const source4=JSON.parse(readFileSync('outputs/qa/7_12a1/source4.project.json','utf8')),restored4=await slots();
  strictEqual(restored4.v5StationsRaw,null);strictEqual(restored4.v6DomainDraftRaw,source4.data.draftRaw);strictEqual(restored4.v6VariantsRaw,source4.data.variantsRaw);strictEqual(restored4.v4ScenariosRaw,global4);
  await click('Pakiet projektu');await field('[aria-label="Pochodzenie danych"]','synthetic');
  const export4=await downloaded(()=>click('Pobierz pakiet projektu'));deepStrictEqual(JSON.parse(readFileSync(export4,'utf8')).data,source4.data);
  await load('source5');await snap('preview_source5');await prepare();await click('Wczytaj pakiet i przeładuj');await ready();
  const source5=JSON.parse(readFileSync('outputs/qa/7_12a1/source5.project.json','utf8')),restored5=await slots();strictEqual(restored5.v6DomainDraftRaw,source5.data.draftRaw);strictEqual(restored5.v6VariantsRaw,source5.data.variantsRaw);strictEqual(restored5.v4ScenariosRaw,global4);strictEqual(JSON.parse(restored5.v5StationsRaw).originalJson,source5.data.source4Json);
  await click('Pakiet projektu');await field('[aria-label="Pochodzenie danych"]','synthetic');
  const export5=await downloaded(()=>click('Pobierz pakiet projektu'));deepStrictEqual(JSON.parse(readFileSync(export5,'utf8')).data,source5.data);
  await evaluate(`(()=>{const key='layout-studio-stations-v5',v=JSON.parse(localStorage.getItem(key));delete v.originalJson;localStorage.setItem(key,JSON.stringify(v));})()`);
  await click('Pobierz pakiet projektu');await until(`document.body.textContent.includes('nie ma dostępnego oryginału 4')`);
  await upload('[aria-label="Oryginał 4 do pakietu"]','outputs/qa/7_12a1/original4.json');await until(`document.body.textContent.includes('Dołączono oryginał 4')`);
  const explicit4=await downloaded(()=>click('Pobierz pakiet projektu'));deepStrictEqual(JSON.parse(readFileSync(explicit4,'utf8')).data,source5.data);
  await click('Zamknij pakiet projektu');await nav('Stanowiska v5');await until(`document.body.textContent.includes('Syntetyczna baza ze źródła 5')`);await snap('restored_domain5');
  ok(!errors.length,errors.join('; '));
  writeFileSync(join(out,'report.json'),JSON.stringify({at:new Date().toISOString(),result:'PASS',scope:'isolated Edge, real file inputs and downloads; concurrency/quota/persistent faults explicitly injected',checks:{freshProfileImport:true,exportWithoutDraftBlocked:true,invalidChecksumBlocked:true,previewAndCancel:true,rescueAndConfirmationRequired:true,backgroundAndShortcutsBlocked:true,staleRescueBlocked:true,quotaRollback:true,persistentFailureLocksClose:true,nestedFullRescueRecovery:true,source4ImportReloadExportExact:true,source5ImportReloadExportExact:true,source4AttachmentWhenMissing:true,missing5DeletesPrevious:true,independent4LibraryPreserved:true,restoredDomainVisible:true},runtimeErrors:errors},null,2));
  console.log('PASS 7.12.A1 Edge: previews, cancellation, SHA, rescue, stale state, rollback and recovery, source4/5 import/reload/export, explicit original4, preserved scenarios, 0 runtime errors');
}finally{ws?.close();browser.kill();server.kill();}
