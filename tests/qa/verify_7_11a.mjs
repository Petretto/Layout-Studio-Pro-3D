import {spawn} from 'node:child_process';
import {existsSync,mkdirSync,readFileSync,writeFileSync,mkdtempSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {resolve,join} from 'node:path';
import {strictEqual,deepStrictEqual,ok} from 'node:assert';

// Full user workflow on synthetic XLSX fixtures, not acceptance of actual factory measurements.
const port=4196,cdp=9356,sleep=ms=>new Promise(r=>setTimeout(r,ms));
const edge=['C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe','C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe'].find(existsSync);
if(!edge)throw new Error('Edge not found');
const out=resolve('outputs/qa/verify_7_11a');mkdirSync(out,{recursive:true});
const server=spawn('node',['scripts/serve.mjs'],{env:{...process.env,PORT:String(port)},stdio:'ignore',windowsHide:true});
const browser=spawn(edge,[`--remote-debugging-port=${cdp}`,`--user-data-dir=${mkdtempSync(join(tmpdir(),'edge-7-11a-'))}`,'--headless=new','--no-first-run','--disable-gpu','--window-size=1440,1100','--force-device-scale-factor=1','about:blank'],{stdio:'ignore',windowsHide:true});
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
  const results=[];let firstSnapshots;
  for(const c of [{slug:'batteries',prefix:'OP-BAT-',process:'baterie_proces',bom:'baterie_bom',count:6,currency:'EUR',layout:'Linear',demand:40000},{slug:'motors',prefix:'OP-MOT-',process:'silniki_proces',bom:'silniki_bom',count:5,currency:'USD',layout:'UShape',demand:80000}]){
    const downloads=mkdtempSync(join(out,c.slug+'_downloads_'));await send('Browser.setDownloadBehavior',{behavior:'allow',downloadPath:downloads});
    await clear();const projectName=`QA_7_11_${c.slug}`;
    await field('[aria-label="Nazwa projektu"]',projectName);
    await labelField('Popyt roczny [szt.]',String(c.demand));await labelField('Waluta kosztów BOM',c.currency);
    await nav('2 Proces');await upload('.page input[type="file"]',`tests/fixtures/${c.process}.xlsx`);await confirm();
    await nav('3 BOM');await upload('.page input[type="file"]',`tests/fixtures/${c.bom}.xlsx`);await confirm();
    await nav('5 Hala');await field('[aria-label="Typ układu"]',c.layout);await until(`!!document.querySelector('.cad-canvas [data-object-id]')`);
    ok(await evaluate(`!!document.querySelector('.facility-unconfirmed-note')`),'Missing dimensions must be explicit');await snap(c.slug+'_layout');
    await nav('4 Bilans');await click('Każda operacja osobno — zachowaj gałęzie');await confirm();
    await save();await nav('Pulpit');
    await field('[aria-label="Nazwa wariantu"]',c.slug+'_baseline');await click('Zapisz wariant');
    // Library/export snapshots contain current derived results; raw local save may carry an old cache.
    const base=(await variants()).find(v=>v.name===c.slug+'_baseline').project;
    strictEqual(base.balancing.workstations.length,6);strictEqual(base.bom.length,c.count);
    ok(base.processSteps.every(s=>s.id.startsWith(c.prefix)));ok(base.bom.every(b=>base.processSteps.some(s=>s.id===b.associatedProcessStepId)));
    await nav('4 Bilans');await field('[aria-label="Metoda bilansowania"]','RPW');await save();await nav('Pulpit');
    await field('[aria-label="Nazwa wariantu"]',c.slug+'_reorganized');await click('Zapisz wariant');
    const reorganized=(await variants()).find(v=>v.name===c.slug+'_reorganized').project;
    ok(reorganized.balancing.workstations.length<base.balancing.workstations.length,'Reorganization should reduce station count');
    ok(reorganized.balancing.workstations.every(s=>!s.isBottleneck),'Reorganized variant must meet unchanged cycle target');
    deepStrictEqual(reorganized.demand,base.demand);deepStrictEqual(reorganized.processSteps,base.processSteps);deepStrictEqual(reorganized.bom,base.bom);
    const library=await variants(),pair=library.filter(v=>v.name.startsWith(c.slug+'_'));strictEqual(pair.length,2);
    strictEqual(pair[0].project.balancing.taktTimeSeconds,pair[1].project.balancing.taktTimeSeconds);
    const comparison=await evaluate(`[...document.querySelectorAll('.page table tbody tr')].filter(r=>r.textContent.includes(${JSON.stringify(c.slug+'_')})).map(r=>[...r.querySelectorAll('td')].slice(0,4).map(e=>e.textContent))`);
    strictEqual(comparison.length,2,'Comparison rows should exist');
    await evaluate(`[...document.querySelectorAll('.page table tbody tr')].find(r=>r.textContent.includes(${JSON.stringify(c.slug+'_')})).closest('table').scrollIntoView({block:'center'})`);
    ok(await evaluate(`[...document.querySelectorAll('.page table tbody tr')].filter(r=>r.textContent.includes(${JSON.stringify(c.slug+'_')})).every(r=>{const b=r.getBoundingClientRect();return b.top>=0&&b.bottom<=innerHeight})`),'Both comparison rows must be in viewport');
    await snap(c.slug+'_comparison');
    if(firstSnapshots)deepStrictEqual(library.slice(0,2),firstSnapshots,'Second project must not overwrite first snapshots');else firstSnapshots=structuredClone(pair);
    await nav('2 Proces');await click('Eksport CSV');const csv=join(downloads,'Eksport_process.csv');await waitFile(csv);
    await upload('.page input[type="file"]',csv);await confirm();
    const roundCsv=await save();deepStrictEqual(roundCsv.processSteps.map(({assignedWorkstationId,...s})=>s),reorganized.processSteps.map(({assignedWorkstationId,...s})=>s));
    await nav('7 Raport');await until(`!!document.querySelector('.engineering-report-document')`);await snap(c.slug+'_report');
    await click('Eksport JSON');const jsonFile=join(downloads,projectName+'.json');await waitFile(jsonFile);
    const exported=JSON.parse(readFileSync(jsonFile,'utf8'));strictEqual(exported.currency,c.currency);strictEqual(exported.bom.length,c.count);
    await clear();strictEqual((await save()).processSteps.length,0);
    await upload('main + input[type="file"]',jsonFile);await confirm();const restored=await save();
    for(const key of ['id','name','processSteps','bom','demand','algorithm','currency','targetLayoutType','workstationSettings'])deepStrictEqual(restored[key],exported[key],`JSON reimport ${key}`);
    await evaluate(`location.reload();true`);await sleep(500);await until(`document.readyState==='complete'&&document.querySelector('[aria-label="Nazwa projektu"]')?.value===${JSON.stringify(projectName)}`);
    const reopened=await save();deepStrictEqual(reopened.processSteps,restored.processSteps);deepStrictEqual(reopened.bom,restored.bom);
    deepStrictEqual(await variants(),library,'Library must survive JSON import and reload');
    results.push({case:c.slug,baseStations:base.balancing.workstations.length,reorganizedStations:reorganized.balancing.workstations.length,takt:base.balancing.taktTimeSeconds,currency:c.currency,steps:6,bom:c.count,comparison,actualCsvAndJsonDownloads:true,reimportAndReload:true});
    writeFileSync(join(out,c.slug+'_process.csv'),readFileSync(csv));writeFileSync(join(out,c.slug+'_project.json'),readFileSync(jsonFile));
    console.log('PASS workflow '+c.slug+': XLSX, fixed-demand variants, actual CSV/JSON, clear/reimport/reload, isolation');
  }
  const before=await save();await nav('3 BOM');await upload('.page input[type="file"]','tests/fixtures/baterie_bom.xlsx');
  await until(`document.body.textContent.includes('Import odrzucony')`);deepStrictEqual(await save(),before,'Invalid foreign BOM must not mutate project');
  ok(!errors.length,errors.join('; '));writeFileSync(join(out,'report.json'),JSON.stringify({at:new Date().toISOString(),scope:'active schema 4; synthetic fixtures; not physical schema 6 acceptance',results,foreignBomRejected:true,runtimeErrors:errors},null,2));
  console.log('PASS 7.11a: complete workflows for two independent processes, invalid foreign BOM rejected, 0 runtime errors');
}finally{ws?.close();browser.kill();server.kill();}
