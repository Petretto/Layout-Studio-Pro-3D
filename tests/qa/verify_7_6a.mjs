import {spawn} from 'node:child_process';
import {existsSync,mkdirSync,readFileSync,writeFileSync,mkdtempSync,readdirSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {resolve,join} from 'node:path';
import {strictEqual,deepStrictEqual,ok} from 'node:assert';

// Recovery acceptance in an isolated Edge profile; synthetic inputs and deliberate storage faults.
const port=5296,cdp=9396,sleep=ms=>new Promise(r=>setTimeout(r,ms));
const edge=['C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe','C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe'].find(existsSync);
if(!edge)throw new Error('Edge not found');
const out=resolve('outputs/qa/7_6a_ui');mkdirSync(out,{recursive:true});
const server=spawn('node',['scripts/serve.mjs'],{env:{...process.env,PORT:String(port)},stdio:'ignore',windowsHide:true});
const browser=spawn(edge,[`--remote-debugging-port=${cdp}`,`--user-data-dir=${mkdtempSync(join(tmpdir(),'edge-7-6a-'))}`,'--headless=new','--no-first-run','--disable-gpu','--window-size=1440,1100','--force-device-scale-factor=1','about:blank'],{stdio:'ignore',windowsHide:true});
let ws;
try{
  let target;
  for(let i=0;i<50;i++){try{target=(await(await fetch(`http://127.0.0.1:${cdp}/json/list`,{signal:AbortSignal.timeout(1000)})).json()).find(t=>t.type==='page');if(target)break;}catch{}await sleep(200);}
  if(!target)throw new Error('Missing CDP target');
  ws=new WebSocket(target.webSocketDebuggerUrl);await new Promise((resolve,reject)=>{ws.onopen=resolve;ws.onerror=reject;});
  let id=0;const pending=new Map(),errors=[];
  ws.onmessage=e=>{const m=JSON.parse(e.data);if(m.method==='Runtime.exceptionThrown')errors.push(m.params.exceptionDetails.text);if(pending.has(m.id)){const p=pending.get(m.id);pending.delete(m.id);m.error?p.reject(new Error(m.error.message)):p.resolve(m.result);}};
  const send=(method,params={})=>new Promise((resolve,reject)=>{const next=++id,timer=setTimeout(()=>{pending.delete(next);reject(new Error('Timeout '+method));},15000);pending.set(next,{resolve:r=>{clearTimeout(timer);resolve(r);},reject:e=>{clearTimeout(timer);reject(e);}});ws.send(JSON.stringify({id:next,method,params}));});
  const evaluate=async expression=>{const r=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw new Error(r.exceptionDetails.exception?.description??r.exceptionDetails.text);return r.result.value;};
  const until=async expression=>{for(let i=0;i<100;i++){if(await evaluate(expression))return;await sleep(100);}throw new Error('Timeout '+expression);};
  const click=async(text,scope='document')=>{await evaluate(`(()=>{const b=[...${scope}.querySelectorAll('button')].find(b=>b.textContent.trim()===${JSON.stringify(text)});if(!b||b.disabled)throw new Error('Missing '+${JSON.stringify(text)});b.click()})()`);await sleep(100);};
  const nav=async text=>{await evaluate(`[...document.querySelectorAll('.studio-nav button')].find(b=>b.textContent.includes(${JSON.stringify(text)})).click()`);await sleep(120);};
  const setElement=(value)=>`const proto=e.tagName==='SELECT'?HTMLSelectElement.prototype:HTMLInputElement.prototype;Object.getOwnPropertyDescriptor(proto,'value').set.call(e,${JSON.stringify(value)});e.dispatchEvent(new Event(e.tagName==='SELECT'?'change':'input',{bubbles:true}));`;
  const field=async(selector,value)=>{await evaluate(`(()=>{const e=document.querySelector(${JSON.stringify(selector)});if(!e)throw new Error('Missing field');${setElement(value)}})()`);await sleep(80);};
  const labelField=async(label,value)=>{await evaluate(`(()=>{const e=[...document.querySelectorAll('label')].find(e=>e.firstChild?.textContent.trim()===${JSON.stringify(label)})?.querySelector('input,select');if(!e)throw new Error('Missing label '+${JSON.stringify(label)});${setElement(value)}})()`);await sleep(80);};
  const confirm=async()=>{await until(`!!document.querySelector('dialog[open]')`);await click('Potwierdź',`document.querySelector('dialog[open]')`);};
  const upload=async(selector,file)=>{const {root}=await send('DOM.getDocument');const {nodeId}=await send('DOM.querySelector',{nodeId:root.nodeId,selector});ok(nodeId,'File input must exist');await send('DOM.setFileInputFiles',{nodeId,files:[resolve(file)]});};
  const save=async()=>{await click('Zapisz lokalnie');return evaluate(`JSON.parse(localStorage.getItem('layout-studio-v3')).project`);};
  const variants=()=>evaluate(`JSON.parse(localStorage.getItem('layout-studio-scenarios-v3')||'[]')`);
  const snap=async name=>{
    await evaluate(`new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))`);await sleep(500);
    writeFileSync(join(out,name+'.png'),Buffer.from((await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false})).data,'base64'));
  };
  const waitFile=async path=>{for(let i=0;i<100;i++){if(existsSync(path)&&readFileSync(path).length)return;await sleep(100);}throw new Error('Missing download '+path);};
  const clear=async()=>{await nav('Pulpit');await evaluate(`[...document.querySelectorAll('.action-card')].find(b=>b.textContent.includes('Rozpocznij od zera')).click()`);await confirm();};
  await send('Page.enable');await send('Runtime.enable');
  await send('Emulation.setDeviceMetricsOverride',{width:1440,height:1100,deviceScaleFactor:1,mobile:false});
  await send('Page.navigate',{url:`http://127.0.0.1:${port}/`});await until(`!!document.querySelector('.studio-nav')`);


  const downloads=mkdtempSync(join(out,'downloads_'));await send('Browser.setDownloadBehavior',{behavior:'allow',downloadPath:downloads});
  const keyMap={v4ProjectRaw:'layout-studio-v3',v4ScenariosRaw:'layout-studio-scenarios-v3',v5StationsRaw:'layout-studio-stations-v5',v6DomainDraftRaw:'layout-studio-domain-v6-draft-v1',v6VariantsRaw:'layout-studio-domain-v6-variants-v1'};
  const slots=()=>evaluate(`Object.fromEntries(Object.entries(${JSON.stringify(keyMap)}).map(([k,v])=>[k,localStorage.getItem(v)]))`);
  const restoreButton=`[...document.querySelectorAll('button')].find(b=>b.textContent.trim()==='Przywróć stan z kopii i zrestartuj')`;
  const loadCopy=async path=>{await upload('input[accept=".json,.lsbackup.json"]',path);await until(`document.body.textContent.includes('Integralność SHA-256 potwierdzona')`);};
  const prepareRestore=async()=>{
    const previous=new Set(readdirSync(downloads));
    await click('Pobierz kopię ratunkową przed przywróceniem');
    await until(`!!document.querySelector('[role="dialog"][aria-modal=true] input[type=checkbox]:not(:disabled)')`);
    let completed;
    for(let i=0;i<100;i++){completed=readdirSync(downloads).find(n=>n.startsWith('Rollback_Przed_Odzyskaniem_')&&n.endsWith('.lsbackup.json')&&!previous.has(n));if(completed)break;await sleep(100);}
    ok(completed,'New rescue download must finish');const path=join(downloads,completed);await waitFile(path);
    await evaluate(`document.querySelector('[role="dialog"][aria-modal=true] input[type=checkbox]').click()`);
    await until(`!(${restoreButton})?.disabled`);return path;
  };
  await upload('main + input[type="file"]','outputs/qa/7_6a/probe_v4.json');await confirm();await save();
  await nav('Stanowiska v5');await upload('[aria-label="Warsztat stanowisk v5"] > input[type=file]','outputs/qa/7_6a/probe_v5.json');await until(`document.body.textContent.includes('Projekt stanowisk gotowy i zapisany lokalnie.')`);
  await click('Kopie i odzyskiwanie');await until(`!!document.querySelector('input[accept=".json,.lsbackup.json"]')`);const before=await slots();
  ok(await evaluate(`document.querySelector('main').inert&&document.querySelector('header').inert`));
  await send('Input.dispatchKeyEvent',{type:'keyDown',key:'s',code:'KeyS',modifiers:2});await send('Input.dispatchKeyEvent',{type:'keyUp',key:'s',code:'KeyS',modifiers:2});deepStrictEqual(await slots(),before,'Ctrl+S must not write behind recovery modal');
  const expected=JSON.parse(readFileSync('outputs/qa/7_6a/probe_workspace.lsbackup.json','utf8'));
  const bad=structuredClone(expected);bad.checksumSha256='0'.repeat(64);const badPath=join(out,'bad_checksum.lsbackup.json');writeFileSync(badPath,JSON.stringify(bad));
  await upload('input[accept=".json,.lsbackup.json"]',badPath);await until(`document.body.textContent.includes('Suma kontrolna SHA-256 jest niezgodna')`);ok(!(await evaluate(`!!(${restoreButton})`)));deepStrictEqual(await slots(),before);await snap('invalid_checksum_blocked');
  await loadCopy('outputs/qa/7_6a/probe_workspace.lsbackup.json');ok(await evaluate(`(${restoreButton}).disabled`));await snap('copy_and_confirmation_required');
  const rescue=await prepareRestore();deepStrictEqual(JSON.parse(readFileSync(rescue,'utf8')).storage,before,'Actual downloaded rescue must contain all previous slots');
  await evaluate(`(()=>{const original=Storage.prototype.setItem;window.qaOriginalSetItem=original;let failed=false;Storage.prototype.setItem=function(k,v){if(k==='layout-studio-domain-v6-draft-v1'&&!failed){failed=true;throw new DOMException('QA quota','QuotaExceededError');}return original.call(this,k,v);};})()`);
  await click('Przywróć stan z kopii i zrestartuj');await until(`document.body.textContent.includes('Poprzedni stan został zachowany lub odtworzony')`);deepStrictEqual(await slots(),before);await snap('quota_rollback_preserved');
  await evaluate(`Storage.prototype.setItem=window.qaOriginalSetItem`);
  // Fail after a real first mutation and also reject rollback: the UI must lock editing and keep the rescue accessible.
  await loadCopy('outputs/qa/7_6a/probe_workspace.lsbackup.json');await prepareRestore();
  await evaluate(`(()=>{const original=Storage.prototype.setItem;let first=true;Storage.prototype.setItem=function(k,v){if(k==='layout-studio-v3'){if(first){first=false;original.call(this,k,v);}throw new Error('QA persistent write failure');}return original.call(this,k,v);};})()`);
  await click('Przywróć stan z kopii i zrestartuj');await until(`document.body.textContent.includes('Wycofanie nie zostało potwierdzone')`);
  ok(await evaluate(`document.querySelector('[aria-label="Zamknij okno kopii i odzyskiwania"]').disabled`));ok(await evaluate(`[...document.querySelectorAll('button')].some(b=>b.textContent==='Pobierz stan sprzed błędu'&&!b.disabled)`));await snap('rollback_failure_locked');
  await evaluate(`Storage.prototype.setItem=window.qaOriginalSetItem`);
  await loadCopy(rescue);await prepareRestore();await click('Przywróć stan z kopii i zrestartuj');await sleep(700);await until(`!!document.querySelector('.studio-nav')&&!document.querySelector('[role=dialog][aria-modal=true]')`);
  const recovered=await slots();strictEqual(recovered.v5StationsRaw,before.v5StationsRaw);strictEqual(recovered.v6DomainDraftRaw,before.v6DomainDraftRaw);strictEqual(JSON.parse(recovered.v4ProjectRaw).project.id,JSON.parse(before.v4ProjectRaw).project.id);
  // Finally accept a normal restore and verify deletion of the absent v5 slot plus model and variant readback.
  await click('Kopie i odzyskiwanie');await loadCopy('outputs/qa/7_6a/probe_workspace.lsbackup.json');await prepareRestore();await click('Przywróć stan z kopii i zrestartuj');await sleep(700);await until(`!!document.querySelector('.studio-nav')&&!document.querySelector('[role=dialog][aria-modal=true]')`);
  const restored=await slots();strictEqual(restored.v5StationsRaw,null);strictEqual(restored.v6DomainDraftRaw,expected.storage.v6DomainDraftRaw);strictEqual(restored.v6VariantsRaw,expected.storage.v6VariantsRaw);
  await nav('Stanowiska v5');await until(`document.body.textContent.includes('Audytowa baza')`);
  await click('Kopie i odzyskiwanie');await loadCopy('outputs/qa/7_6a/probe_workspace.lsbackup.json');
  ok(await evaluate(`document.body.textContent.replace(/\s+/g,' ').includes('warianty:1')||document.body.textContent.replace(/\s+/g,' ').includes('warianty: 1')`));await snap('restored_library_count');
  await evaluate(`document.querySelector('[aria-label="Zamknij okno kopii i odzyskiwania"]').click()`);
  await until(`!document.querySelector('header').inert`);
  await send('Input.dispatchKeyEvent',{type:'keyDown',key:'s',code:'KeyS',modifiers:2});await send('Input.dispatchKeyEvent',{type:'keyUp',key:'s',code:'KeyS',modifiers:2});
  await until(`document.body.textContent.includes('Zapisano lokalnie. JSON pozwala przenieść projekt.')`);
  ok(!errors.length,errors.join('; '));
  writeFileSync(join(out,'report.json'),JSON.stringify({at:new Date().toISOString(),result:'PASS',scope:'isolated Edge; synthetic inputs; quota and persistent write faults deliberately injected',checks:{checksumBlocked:true,backgroundInertAndShortcutsBlocked:true,copyAndAcknowledgementRequired:true,downloadedRescueMatchesPreviousSlots:true,quotaRollbackExact:true,rollbackFailureLocksEditing:true,recoveryFromRescue:true,validRestoreAndReload:true,nullDeletesOldV5:true,domainAndLibraryPreserved:true,variantCountOne:true,closingRestoresAccessAndCtrlS:true},runtimeErrors:errors},null,2));
  console.log('PASS 7.6a UI: checksum, copy/confirmation, quota rollback, rollback failure lock, rescue recovery, restore/reload, null deletion, variant count, 0 runtime errors');
}finally{ws?.close();browser.kill();server.kill();}
