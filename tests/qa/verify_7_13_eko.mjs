import {openEdgeDebugPage} from './browserHarness.mjs';
import {spawn} from 'node:child_process';
import {existsSync,mkdirSync,readFileSync,writeFileSync,mkdtempSync,readdirSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {resolve,join} from 'node:path';
import {deepStrictEqual,strictEqual,ok} from 'node:assert';
import {assertOperationWindows,assertScheduleResult,readScheduleWindows} from './scheduleAssertions.mjs';

// R09: internal Eko regression fixture. Keep the result and downloads local.
const port=5547,sleep=ms=>new Promise(r=>setTimeout(r,ms));
const edge=['C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe','C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe'].find(existsSync);
if(!edge)throw new Error('Edge not found');
const evidenceRoot=resolve('outputs/qa/pt_e2e/internal_eko_sol');
mkdirSync(evidenceRoot,{recursive:true});
const out=mkdtempSync(join(evidenceRoot,'run_'));
const server=spawn('node',['scripts/serve.mjs'],{env:{...process.env,PORT:String(port)},stdio:'ignore',windowsHide:true});
const profile=mkdtempSync(join(tmpdir(),'edge-7-13-eko-'));
const browser=spawn(edge,['--remote-debugging-port=0',`--user-data-dir=${profile}`,'--headless=new','--no-first-run','--no-default-browser-check','--disable-extensions','--disable-gpu','--window-size=1440,1100','--force-device-scale-factor=1','about:blank'],{stdio:['ignore','ignore','pipe'],windowsHide:true});
let browserDiagnostic='';
browser.stderr.on('data', chunk=>{browserDiagnostic=(browserDiagnostic+chunk).slice(-2000);});

let ws;
try{
  const target=await openEdgeDebugPage(browser,profile).catch(error=>{
    throw new Error(`${error.message} (exit ${browser.exitCode}): ${browserDiagnostic.trim()}`,{cause:error});
  });
  ws=new WebSocket(target.webSocketDebuggerUrl);await new Promise((resolve,reject)=>{ws.onopen=resolve;ws.onerror=reject;});
  let id=0;const pending=new Map(),errors=[];
  ws.onmessage=e=>{
    const m=JSON.parse(e.data);
    if(m.method==='Page.javascriptDialogOpening')console.error('Unexpected browser dialog',m.params.type,m.params.message);
    if(m.method==='Runtime.exceptionThrown')errors.push(m.params.exceptionDetails.text);
    if(pending.has(m.id)){
      const p=pending.get(m.id);pending.delete(m.id);
      m.error?p.reject(new Error(m.error.message)):p.resolve(m.result);
    }
  };
  const send=(method,params={})=>new Promise((resolve,reject)=>{
    const next=++id,timer=setTimeout(()=>{pending.delete(next);reject(new Error('Timeout '+method+' '+(params.expression??'').slice(0,250)));},20000);
    pending.set(next,{resolve:r=>{clearTimeout(timer);resolve(r);},reject:e=>{clearTimeout(timer);reject(e);}});
    ws.send(JSON.stringify({id:next,method,params}));
  });
  const evaluate=async expression=>{
    const r=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});
    if(r.exceptionDetails)throw new Error(r.exceptionDetails.exception?.description??r.exceptionDetails.text);
    return r.result.value;
  };
  const until=async expression=>{for(let i=0;i<120;i++){if(await evaluate(expression))return;await sleep(100);}throw new Error('Timeout '+expression);};
  const click=async(text,scope='document')=>{
    await evaluate(`(()=>{const b=[...${scope}.querySelectorAll('button')].find(b=>b.textContent.trim()===${JSON.stringify(text)});if(!b||b.disabled)throw new Error('Missing or disabled button: '+${JSON.stringify(text)});b.click();})()`);
    await sleep(120);
  };
  const nav=async text=>{
    await evaluate(`(()=>{
      const b=[...document.querySelectorAll('.studio-nav button, .shell-nav button, .shell-subnav button')].find(b=>b.textContent.includes(${JSON.stringify(text)}));
      if(!b)throw new Error('Missing nav: '+${JSON.stringify(text)});
      b.click();
    })()`);
    await sleep(150);
  };
  const setElement=(value)=>`const proto=e.tagName==='SELECT'?HTMLSelectElement.prototype:HTMLInputElement.prototype;Object.getOwnPropertyDescriptor(proto,'value').set.call(e,${JSON.stringify(value)});e.dispatchEvent(new Event(e.tagName==='SELECT'?'change':'input',{bubbles:true}));`;
  const field=async(selector,value)=>{
    await evaluate(`(()=>{const e=document.querySelector(${JSON.stringify(selector)});if(!e)throw new Error('Missing field: '+${JSON.stringify(selector)});${setElement(value)}})()`);
    await sleep(80);
  };

  const upload=async(selector,file)=>{
    const {root}=await send('DOM.getDocument');
    const {nodeId}=await send('DOM.querySelector',{nodeId:root.nodeId,selector});
    ok(nodeId,'File input must exist for selector: '+selector);
    await send('DOM.setFileInputFiles',{nodeId,files:[resolve(file)]});
  };
  const snap=async name=>{
    await sleep(400);
    writeFileSync(join(out,name+'.png'),Buffer.from((await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false})).data,'base64'));
  };

  await send('Page.enable');await send('Runtime.enable');
  await send('Emulation.setDeviceMetricsOverride',{width:1440,height:1100,deviceScaleFactor:1,mobile:false});
  await send('Page.navigate',{url:`http://127.0.0.1:${port}/`});
  await until(`!!document.querySelector('.studio')`);

  const downloads=mkdtempSync(join(out,'downloads_'));
  await send('Browser.setDownloadBehavior',{behavior:'allow',downloadPath:downloads});
  const downloaded=async action=>{
    const destination=mkdtempSync(join(downloads,'action_'));
    await send('Browser.setDownloadBehavior',{behavior:'allow',downloadPath:destination});
    await action();
    for(let i=0;i<100;i++){
      const name=readdirSync(destination).find(n=>!n.endsWith('.crdownload'));
      if(name)return join(destination,name);
      await sleep(100);
    }
    throw new Error('Download not completed');
  };
  const reloadReady=async()=>{
    await sleep(1200);
    await until(`!!document.querySelector('.studio')&&!document.querySelector('[aria-label="Pakiet projektu"]')`);
  };

  const openPackageModal=async()=>{
    const menuOpen=await evaluate(`!!document.querySelector('[role="menu"][aria-label="Menu projektu"]')`);
    if(!menuOpen){
      await evaluate(`(()=>{const b=document.querySelector('button[aria-label="Menu projektu"]');if(b)b.click();else throw new Error('Missing Menu projektu trigger');})()`);
      await sleep(100);
    }
    await evaluate(`(()=>{
      const item=[...document.querySelectorAll('[role="menu"][aria-label="Menu projektu"] button')].find(b=>b.textContent.trim()==='Pakiet projektu');
      if(!item)throw new Error('Missing Pakiet projektu menuitem');
      item.click();
    })()`);
    await until(`!!document.querySelector('[aria-label="Pakiet projektu"]')`);
  };

  console.log('1. Importing 04_eko package via ProjectPackageModal...');
  await openPackageModal();
  const fixturePath='przyklady/04_eko/projekt-pokazowy.json';
  const fixture=JSON.parse(readFileSync(fixturePath,'utf8'));
  const baseline=JSON.parse(fixture.data.variantsRaw).variants.find(variant=>variant.id==='EKO-PARALLEL');
  ok(baseline,'Brak zapisanego wariantu EKO-PARALLEL');
  const reference=JSON.parse(readFileSync('przyklady/04_eko/referencje/oczekiwane_wyniki.json','utf8'));
  deepStrictEqual(reference.conditions,{batch:1,arrivalIntervalSeconds:1,transportMode:'configured'});
  const expected=reference.variants.find(variant=>variant.id===baseline.id);
  ok(expected,'Brak wzorca EKO-PARALLEL');
  await upload('[aria-label="Plik pakietu projektu"]',fixturePath);
  await until(`document.body.textContent.includes('Pakiet poprawny.')`);
  await downloaded(()=>click('Pobierz kopię ratunkową przed wczytaniem'));
  await evaluate(`document.querySelector('[aria-label="Pakiet projektu"] input[type=checkbox]').click()`);
  await click('Wczytaj projekt i zastosuj');
  await reloadReady();

  console.log('2. Verifying loaded Eko project data...');
  const draft=await evaluate(`JSON.parse(localStorage.getItem('layout-studio-domain-v6-draft-v1')).project`);
  strictEqual(draft.id,'eko-demo-v04');
  strictEqual(draft.operations.length,16);
  strictEqual(draft.bom.length,60);
  deepStrictEqual(draft,baseline.project,'Zaimportowany szkic musi odpowiadać wariantowi EKO-PARALLEL');

  await nav('Proces i stanowiska');
  await evaluate(`(()=>{
    const b=document.querySelector('button[data-view="stations"]') || [...document.querySelectorAll('button')].find(b=>b.textContent.includes('Stanowiska i zasoby'));
    if(!b)throw Error('Missing station navigation');b.click();
  })()`);
  await until(`!!document.querySelector('[aria-label="Harmonogram zespołu szkicu 6"]')`);
  await snap('eko_loaded_stations');

  console.log('3. Running schedule calculation for Eko (Batch 1)...');
  await field('[aria-label="Liczba sztuk szkicu 6"]',String(reference.conditions.batch));
  await field('[aria-label="Odstęp przybycia szkicu 6 [s]"]',String(reference.conditions.arrivalIntervalSeconds));
  strictEqual(await evaluate(`document.querySelector('[aria-label="Symulacja bez transportu — just in time"]').checked`),false);
  await click('Oblicz harmonogram szkicu 6');
  await until(`!!document.querySelector('[aria-label="Wynik harmonogramu szkicu 6"]')`);
  const resultText=await evaluate(`document.querySelector('[aria-label="Wynik harmonogramu szkicu 6"]').textContent`);
  assertScheduleResult(resultText,expected.completionSeconds[0]);
  strictEqual(await evaluate(`!!document.querySelector('[aria-label="Tryb transportu wyniku"]')`),false);
  const windows=await readScheduleWindows(evaluate);
  strictEqual(windows.length,expected.totalRuns);
  assertOperationWindows(windows.filter(([,operation])=>['OP22','OP23','OP21'].includes(operation)),[
    [1,'OP22',7670,8270], [1,'OP23',7670,8270], [1,'OP21',12230,13550],
  ],reference.absoluteToleranceSeconds);
  await snap('eko_schedule_result');

  ok(!errors.length,'Zero runtime exceptions expected: '+errors.join('; '));

  writeFileSync(join(out,'report.json'),JSON.stringify({
    at: new Date().toISOString(),
    result: 'PASS',
    scope: '7.13 Eko internal regression fixture loaded in browser; publication rights not established',
    operations: 16,
    bomItems: 60,
    variantId: baseline.id,
    conditions: reference.conditions,
    makespanSeconds: expected.completionSeconds[0],
    runtimeErrors: errors
  },null,2));
  console.log('PASS R09 Eko UI: EKO-PARALLEL, configured, exact makespan and critical operation windows.');
}finally{
  ws?.close();
  browser.kill();
  server.kill();
}
