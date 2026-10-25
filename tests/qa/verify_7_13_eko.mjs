import {spawn} from 'node:child_process';
import {existsSync,mkdirSync,readFileSync,writeFileSync,mkdtempSync,readdirSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {resolve,join} from 'node:path';
import {strictEqual,ok} from 'node:assert';

// 7.13 Eko: Browser verification of the external Eko demonstration package.
const port=5297,cdp=9397,sleep=ms=>new Promise(r=>setTimeout(r,ms));
const edge=['C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe','C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe'].find(existsSync);
if(!edge)throw new Error('Edge not found');
const out=resolve('outputs/qa/7_13_eko_ui');mkdirSync(out,{recursive:true});
const server=spawn('node',['scripts/serve.mjs'],{env:{...process.env,PORT:String(port)},stdio:'ignore',windowsHide:true});
const browser=spawn(edge,[`--remote-debugging-port=${cdp}`,`--user-data-dir=${mkdtempSync(join(tmpdir(),'edge-7-13-eko-'))}`,'--headless=new','--no-first-run','--disable-gpu','--window-size=1440,1100','--force-device-scale-factor=1','about:blank'],{stdio:'ignore',windowsHide:true});

let ws;
try{
  let target;
  for(let i=0;i<50;i++){try{target=(await(await fetch(`http://127.0.0.1:${cdp}/json/list`,{signal:AbortSignal.timeout(1000)})).json()).find(t=>t.type==='page');if(target)break;}catch{}await sleep(200);}
  if(!target)throw new Error('Missing CDP target');
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
    await evaluate(`new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))`);await sleep(400);
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
  await upload('[aria-label="Plik pakietu projektu"]','przyklady/04_eko/projekt-pokazowy.json');
  await until(`document.body.textContent.includes('Pakiet poprawny.')`);
  await downloaded(()=>click('Pobierz kopię ratunkową przed importem'));
  await evaluate(`document.querySelector('[aria-label="Pakiet projektu"] input[type=checkbox]').click()`);
  await click('Wczytaj pakiet i przeładuj');
  await reloadReady();

  console.log('2. Verifying loaded Eko project data...');
  const draft=await evaluate(`JSON.parse(localStorage.getItem('layout-studio-domain-v6-draft-v1')).project`);
  strictEqual(draft.id,'eko-demo-v04');
  strictEqual(draft.operations.length,16);
  strictEqual(draft.bom.length,60);

  await nav('Proces i stanowiska');
  await evaluate(`(()=>{
    const b=document.querySelector('button[data-view="stations"]') || [...document.querySelectorAll('button')].find(b=>b.textContent.includes('Stanowiska i zasoby'));
    if(b) b.click();
  })()`);
  await until(`!!document.querySelector('[aria-label="Harmonogram zespołu szkicu 6"]')`);
  await snap('eko_loaded_stations');

  console.log('3. Running schedule calculation for Eko (Batch 1)...');
  await field('[aria-label="Liczba sztuk szkicu 6"]','1');
  await field('[aria-label="Odstęp przybycia szkicu 6 [s]"]','1');
  await evaluate(`(()=>{const e=document.querySelector('[aria-label="Symulacja bez transportu — just in time"]');if(!e.checked)e.click();})()`);
  await click('Oblicz harmonogram szkicu 6');
  await until(`!!document.querySelector('[aria-label="Wynik harmonogramu szkicu 6"]')`);
  const resultText=await evaluate(`document.querySelector('[aria-label="Wynik harmonogramu szkicu 6"]').textContent`);
  ok(resultText.includes('13550')||resultText.includes('14150'),'Valid schedule result present');
  await snap('eko_schedule_result');

  ok(!errors.length,'Zero runtime exceptions expected: '+errors.join('; '));

  writeFileSync(join(out,'report.json'),JSON.stringify({
    at: new Date().toISOString(),
    result: 'PASS',
    scope: '7.13 Eko external demo package loaded and verified in browser',
    operations: 16,
    bomItems: 60,
    runtimeErrors: errors
  },null,2));
  console.log('PASS 7.13 Eko UI: package loaded, real 16 ops / 60 BOM items verified, schedule calculated!');
}finally{
  ws?.close();
  browser.kill();
  server.kill();
}
