import {spawn} from 'node:child_process';
import {existsSync,mkdirSync,readFileSync,writeFileSync,mkdtempSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {resolve,join} from 'node:path';
import {strictEqual,deepStrictEqual,ok} from 'node:assert';

// UI capability audit only; input probes are not completed demonstration projects.
const port=5292,cdp=9392,sleep=ms=>new Promise(r=>setTimeout(r,ms));
const edge=['C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe','C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe'].find(existsSync);
if(!edge)throw new Error('Edge not found');
const out=resolve('outputs/qa/7_12a_ui');mkdirSync(out,{recursive:true});
const server=spawn('node',['scripts/serve.mjs'],{env:{...process.env,PORT:String(port)},stdio:'ignore',windowsHide:true});
const browser=spawn(edge,[`--remote-debugging-port=${cdp}`,`--user-data-dir=${mkdtempSync(join(tmpdir(),'edge-7-12a-'))}`,'--headless=new','--no-first-run','--disable-gpu','--window-size=1440,1100','--force-device-scale-factor=1','about:blank'],{stdio:'ignore',windowsHide:true});
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
  await upload('main + input[type="file"]','outputs/qa/7_12a/probe_v4.json');await confirm();
  const v4=await save();strictEqual(v4.id,'AUDIT-7-12A');
  await nav('Stanowiska v5');
  await upload('[aria-label="Warsztat stanowisk v5"] > input[type="file"]','outputs/qa/7_12a/probe_v5.json');
  await until(`document.body.textContent.includes('Projekt stanowisk gotowy i zapisany lokalnie.')`);
  await click('Podgląd z bieżącego projektu 4');
  await until(`!!document.querySelector('[aria-label="Podgląd modelu procesu v6"] input[type="checkbox"]')`);
  await evaluate(`document.querySelector('[aria-label="Podgląd modelu procesu v6"] input[type="checkbox"]').click()`);
  await click('Zapisz niekompletny szkic 6');await until(`document.body.textContent.includes('Zapisany szkic:')`);
  strictEqual(await evaluate(`document.querySelector('[aria-label="Podgląd modelu procesu v6"]').querySelectorAll('input[type=file]').length`),0);
  await click('Pobierz szkic z oryginałem');const draftFile=join(downloads,'Szkic_modelu_v6_z_oryginalem.json');await waitFile(draftFile);
  const rawDraft=readFileSync(draftFile,'utf8');strictEqual(JSON.parse(rawDraft).kind,'domain-draft-save');
  strictEqual(await evaluate(`localStorage.getItem('layout-studio-domain-v6-draft-v1')`),rawDraft);
  await evaluate(`document.querySelector('[aria-label="Podgląd modelu procesu v6"]').scrollIntoView({block:'start'})`);await snap('draft_download_without_import');
  await upload('main + input[type="file"]',draftFile);await until(`document.body.textContent.includes('Import odrzucony')`);
  strictEqual((await save()).id,v4.id);strictEqual(await evaluate(`localStorage.getItem('layout-studio-domain-v6-draft-v1')`),rawDraft);
  await click('Kopie i odzyskiwanie');await until(`!!document.querySelector('input[accept=".json,.lsbackup.json"]')`);
  await upload('input[accept=".json,.lsbackup.json"]','outputs/qa/7_12a/probe_workspace.lsbackup.json');
  await until(`document.body.textContent.includes('Integralność SHA-256 potwierdzona')`);await click('Przywróć stan z kopii i zrestartuj');
  await until(`document.body.textContent.includes('Pomyślnie przywrócono')`);await sleep(3500);await until(`!!document.querySelector('.studio-nav')`);
  const expected=JSON.parse(readFileSync('outputs/qa/7_12a/probe_workspace.lsbackup.json','utf8'));
  strictEqual(await evaluate(`localStorage.getItem('layout-studio-domain-v6-draft-v1')`),expected.storage.v6DomainDraftRaw);
  strictEqual(await evaluate(`localStorage.getItem('layout-studio-domain-v6-variants-v1')`),expected.storage.v6VariantsRaw);
  await nav('Stanowiska v5');await until(`document.body.textContent.includes('Audytowa baza')`);
  await evaluate(`document.querySelector('[aria-label="Podgląd modelu procesu v6"]').scrollIntoView({block:'start'})`);await snap('workspace_restored_draft');
  const bad=structuredClone(expected);bad.checksumSha256='0'.repeat(64);const badFile=join(out,'checksum_mismatch.lsbackup.json');writeFileSync(badFile,JSON.stringify(bad));
  await click('Kopie i odzyskiwanie');await upload('input[accept=".json,.lsbackup.json"]',badFile);
  await until(`document.body.textContent.includes('Suma kontrolna różni się od nagłówka')`);
  ok(await evaluate(`[...document.querySelectorAll('button')].some(b=>b.textContent.trim()==='Przywróć stan z kopii i zrestartuj'&&!b.disabled)`),'Audit should reproduce enabled restore on mismatching checksum');await snap('checksum_warning_restore_enabled');
  ok(!errors.length,errors.join('; '));
  writeFileSync(join(out,'report.json'),JSON.stringify({at:new Date().toISOString(),scope:'capability audit only, no physical simulation acceptance',ui:{v4Import:true,v5Import:true,draftCreatedAndDownloaded:true,noDraftFileImportControl:true,downloadedDraftRejectedByMainImportWithoutMutation:true,workspaceRestoresDraftAndLibraryAfterReload:true,checksumMismatchRestoreButtonEnabled:true},runtimeErrors:errors},null,2));
  console.log('PASS 7.12.A UI capability audit: V4/V5 imports, draft download/rejection, workspace restore, checksum gap, 0 runtime errors');
}finally{ws?.close();browser.kill();server.kill();}
