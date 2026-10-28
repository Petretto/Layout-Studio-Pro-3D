import {spawn} from 'node:child_process';
import {existsSync,mkdirSync,readFileSync,writeFileSync,mkdtempSync,readdirSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {resolve,join} from 'node:path';
import {strictEqual,deepStrictEqual,ok} from 'node:assert';

// 7.12.D: Comprehensive UI acceptance of all three demo packages in an isolated Edge profile.
// Tests clean browser session, package 01, package 02, package 03, data isolation, simulation and export round-trip.
const port=5298,cdp=9398,sleep=ms=>new Promise(r=>setTimeout(r,ms));
const edge=['C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe','C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe'].find(existsSync);
if(!edge)throw new Error('Edge not found');
const out=resolve('outputs/qa/7_12d_ui');mkdirSync(out,{recursive:true});
const server=spawn('node',['scripts/serve.mjs'],{env:{...process.env,PORT:String(port)},stdio:'ignore',windowsHide:true});
const browser=spawn(edge,[`--remote-debugging-port=${cdp}`,`--user-data-dir=${mkdtempSync(join(tmpdir(),'edge-7-12d-'))}`,'--headless=new','--no-first-run','--disable-gpu','--window-size=1440,1100','--force-device-scale-factor=1','about:blank'],{stdio:'ignore',windowsHide:true});

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
    // Open via AppShell project menu
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

  const importPackage=async path=>{
    await openPackageModal();
    await upload('[aria-label="Plik pakietu projektu"]',path);
    await until(`document.body.textContent.includes('Pakiet poprawny.')`);
    await downloaded(()=>click('Pobierz kopię ratunkową przed importem'));
    await evaluate(`document.querySelector('[aria-label="Pakiet projektu"] input[type=checkbox]').click()`);
    await click('Wczytaj pakiet i przeładuj');
    await reloadReady();
  };

  const draft=()=>evaluate(`JSON.parse(localStorage.getItem('layout-studio-domain-v6-draft-v1')).project`);
  const comparisonScope=`document.querySelector('[aria-label="Porównanie wariantów szkicu 6"]')`;

  const goToStations=async()=>{
    await nav('Proces i stanowiska');
    await evaluate(`(()=>{
      const b=document.querySelector('button[data-view="stations"]') || [...document.querySelectorAll('button')].find(b=>b.textContent.includes('Stanowiska i zasoby'));
      if(b) b.click();
    })()`);
    await sleep(200);
  };

  console.log('1. Testing Package 01: Zestaw montażowy (Basic)...');
  await importPackage('przyklady/01_zestaw_montazowy/projekt-pokazowy.json');
  const draft01=await draft();
  strictEqual(draft01.id,'DEMO-ZESTAW-MONTAZOWY-1');
  strictEqual(draft01.operations.length,3);
  ok(draft01.operations.every(o=>o.id.startsWith('ZM-')));

  await goToStations();
  await until(`!!document.querySelector('[aria-label="Harmonogram zespołu szkicu 6"]')`);
  await field('[aria-label="Liczba sztuk szkicu 6"]','3');
  await field('[aria-label="Odstęp przybycia szkicu 6 [s]"]','1');
  await evaluate(`(()=>{const e=document.querySelector('[aria-label="Symulacja bez transportu — just in time"]');if(!e.checked)e.click();})()`);
  await click('Oblicz harmonogram szkicu 6');
  await until(`!!document.querySelector('[aria-label="Wynik harmonogramu szkicu 6"]')`);
  ok(await evaluate(`document.querySelector('[aria-label="Wynik harmonogramu szkicu 6"]').textContent.includes('170 s')`),'Makespan 170s for Package 01 Base');
  await snap('demo01_schedule');

  console.log('1b. Package 01: Variant comparison (170 s vs 190 s)...');
  await until(`!!${comparisonScope}`);
  await field('[aria-label="Liczba sztuk w porównaniu wariantów"]','3');
  await field('[aria-label="Odstęp przybycia w porównaniu wariantów [s]"]','1');
  await evaluate(`(()=>{const e=document.querySelector('[aria-label="Symulacja porównania bez transportu — just in time"]');if(!e.checked)e.click();})()`);
  await click('Porównaj warianty w symulacji (2)',comparisonScope);
  await until(`!!document.querySelector('[aria-label="Wynik porównania wariantów szkicu 6"]')`);
  const cmp01=await evaluate(`document.querySelector('[aria-label="Wynik porównania wariantów szkicu 6"]').textContent`);
  ok(cmp01.includes('170')&&cmp01.includes('190'),'Comparison includes 170s and 190s');
  await snap('demo01_comparison');
  const rep01Path=await downloaded(()=>click('Pobierz raport porównania (.md)'));
  ok(readFileSync(rep01Path,'utf8').includes('170')&&readFileSync(rep01Path,'utf8').includes('190'));

  console.log('2. Testing Package 02: Wózek warsztatowy (Intermediate)...');
  await importPackage('przyklady/02_wozek_warsztatowy/projekt-pokazowy.json');
  const draft02=await draft();
  strictEqual(draft02.id,'DEMO-WOZEK-WARSZTATOWY-1');
  strictEqual(draft02.operations.length,4);
  ok(draft02.operations.every(o=>o.id.startsWith('WW-')),'All operations must have WW- prefix');
  ok(!JSON.stringify(draft02).includes('ZM-'),'No ZM- IDs leaked into Package 02');

  await goToStations();
  await until(`!!document.querySelector('[aria-label="Harmonogram zespołu szkicu 6"]')`);
  await field('[aria-label="Liczba sztuk szkicu 6"]','3');
  await field('[aria-label="Odstęp przybycia szkicu 6 [s]"]','1');
  await evaluate(`(()=>{const e=document.querySelector('[aria-label="Symulacja bez transportu — just in time"]');if(!e.checked)e.click();})()`);
  await click('Oblicz harmonogram szkicu 6');
  await until(`!!document.querySelector('[aria-label="Wynik harmonogramu szkicu 6"]')`);
  ok(await evaluate(`document.querySelector('[aria-label="Wynik harmonogramu szkicu 6"]').textContent.includes('390 s')`),'Makespan 390s for Package 02 Base JIT');
  await snap('demo02_schedule');

  console.log('2b. Package 02: Configured physical simulation (460 s)...');
  await evaluate(`(()=>{const e=document.querySelector('[aria-label="Symulacja bez transportu — just in time"]');if(e.checked)e.click();})()`);
  await click('Oblicz harmonogram szkicu 6');
  await until(`!!document.querySelector('[aria-label="Wynik harmonogramu szkicu 6"]')`);
  ok(await evaluate(`document.querySelector('[aria-label="Wynik harmonogramu szkicu 6"]').textContent.includes('460 s')`),'Makespan 460s for Package 02 Base Configured');
  await snap('demo02_configured_schedule');

  console.log('2c. Package 02: Variant comparison (390 s vs 315 s)...');
  await until(`!!${comparisonScope}`);
  await field('[aria-label="Liczba sztuk w porównaniu wariantów"]','3');
  await field('[aria-label="Odstęp przybycia w porównaniu wariantów [s]"]','1');
  await evaluate(`(()=>{const e=document.querySelector('[aria-label="Symulacja porównania bez transportu — just in time"]');if(!e.checked)e.click();})()`);
  await click('Porównaj warianty w symulacji (2)',comparisonScope);
  await until(`!!document.querySelector('[aria-label="Wynik porównania wariantów szkicu 6"]')`);
  const cmp02=await evaluate(`document.querySelector('[aria-label="Wynik porównania wariantów szkicu 6"]').textContent`);
  ok(cmp02.includes('390')&&cmp02.includes('315'),'Comparison includes 390s and 315s');
  await snap('demo02_comparison');
  const rep02Path=await downloaded(()=>click('Pobierz raport porównania (.md)'));
  ok(readFileSync(rep02Path,'utf8').includes('390')&&readFileSync(rep02Path,'utf8').includes('315'));

  console.log('3. Testing Package 03: Moduł urządzenia (Advanced with Subassemblies)...');
  await importPackage('przyklady/03_modul_urzadzenia/projekt-pokazowy.json');
  const draft03=await draft();
  strictEqual(draft03.id,'DEMO-MODUL-URZADZENIA-1');
  strictEqual(draft03.operations.length,5);
  strictEqual(draft03.subassemblies.length,2);
  ok(draft03.operations.every(o=>o.id.startsWith('MU-')),'All operations must have MU- prefix');
  ok(!JSON.stringify(draft03).includes('WW-'),'No WW- IDs leaked into Package 03');
  ok(!JSON.stringify(draft03).includes('ZM-'),'No ZM- IDs leaked into Package 03');

  await goToStations();
  await until(`!!document.querySelector('[aria-label="Harmonogram zespołu szkicu 6"]')`);
  await field('[aria-label="Liczba sztuk szkicu 6"]','3');
  await field('[aria-label="Odstęp przybycia szkicu 6 [s]"]','1');
  await evaluate(`(()=>{const e=document.querySelector('[aria-label="Symulacja bez transportu — just in time"]');if(!e.checked)e.click();})()`);
  await click('Oblicz harmonogram szkicu 6');
  await until(`!!document.querySelector('[aria-label="Wynik harmonogramu szkicu 6"]')`);
  ok(await evaluate(`document.querySelector('[aria-label="Wynik harmonogramu szkicu 6"]').textContent.includes('320 s')`),'Makespan 320s for Package 03 Base JIT');
  await snap('demo03_schedule');

  console.log('3b. Package 03: Configured physical simulation (2210 s with 1000s interval)...');
  await field('[aria-label="Odstęp przybycia szkicu 6 [s]"]','1000');
  await evaluate(`(()=>{const e=document.querySelector('[aria-label="Symulacja bez transportu — just in time"]');if(e.checked)e.click();})()`);
  await click('Oblicz harmonogram szkicu 6');
  await until(`!!document.querySelector('[aria-label="Wynik harmonogramu szkicu 6"]') || !!document.querySelector('.process-stall-diagnostic') || !!document.querySelector('[role="alert"]')`);
  const text3b=await evaluate(`document.querySelector('[aria-label="Wynik harmonogramu szkicu 6"]')?.textContent ?? document.querySelector('.process-stall-diagnostic')?.textContent ?? document.querySelector('[role="alert"]')?.textContent ?? ''`);
  console.log('Actual 3b text (1000s interval):', text3b.slice(0, 150));
  ok(text3b.includes('2210 s'),'Makespan 2210s for Package 03 Base Configured');
  await snap('demo03_configured_schedule');

  console.log('3c. Package 03: Variant comparison (320 s vs 270 s)...');
  await until(`!!${comparisonScope}`);
  await field('[aria-label="Liczba sztuk w porównaniu wariantów"]','3');
  await field('[aria-label="Odstęp przybycia w porównaniu wariantów [s]"]','1');
  await evaluate(`(()=>{const e=document.querySelector('[aria-label="Symulacja porównania bez transportu — just in time"]');if(!e.checked)e.click();})()`);
  await click('Porównaj warianty w symulacji (2)',comparisonScope);
  await until(`!!document.querySelector('[aria-label="Wynik porównania wariantów szkicu 6"]')`);
  const cmp03=await evaluate(`document.querySelector('[aria-label="Wynik porównania wariantów szkicu 6"]').textContent`);
  ok(cmp03.includes('320')&&cmp03.includes('270'),'Comparison includes 320s and 270s');
  await snap('demo03_comparison');
  const rep03Path=await downloaded(()=>click('Pobierz raport porównania (.md)'));
  ok(readFileSync(rep03Path,'utf8').includes('320')&&readFileSync(rep03Path,'utf8').includes('270'));

  console.log('4. Testing Export Round-Trip on Package 03...');
  await openPackageModal();
  await field('[aria-label="Pochodzenie danych"]','synthetic');
  const exportedPath=await downloaded(()=>click('Pobierz pakiet projektu'));
  const exportedPkg=JSON.parse(readFileSync(exportedPath,'utf8'));
  strictEqual(exportedPkg.format,'layout-studio-project-package');
  strictEqual(exportedPkg.data.dataOrigin,'synthetic');
  const exportedDraft=JSON.parse(exportedPkg.data.draftRaw).project;
  strictEqual(exportedDraft.id,'DEMO-MODUL-URZADZENIA-1');
  await click('Zamknij pakiet projektu');

  console.log('5. Re-importing exported package to verify complete round-trip...');
  await importPackage(exportedPath);
  deepStrictEqual(await draft(),exportedDraft);

  ok(!errors.length,'Zero runtime exceptions expected: '+errors.join('; '));

  const report={
    at: new Date().toISOString(),
    result: 'PASS',
    scope: '7.12.D E2E browser acceptance across all three demo packages',
    packages: [
      {id:'01_zestaw_montazowy',operations:3,expectedMakespanBaseJit:170,expectedMakespanConsolidatedJit:190,verified:true},
      {id:'02_wozek_warsztatowy',operations:4,expectedMakespanBaseJit:390,expectedMakespanBaseConfigured:460,expectedMakespanBalancedJit:315,verified:true},
      {id:'03_modul_urzadzenia',operations:5,subassemblies:2,expectedMakespanBaseJit:320,expectedMakespanBaseConfigured:2210,expectedMakespanBalancedJit:270,verified:true}
    ],
    checks: {
      package01ImportedAndScheduled: true,
      package01VariantComparisonVerified: true,
      package02ImportedAndScheduled: true,
      package02ConfiguredScheduled: true,
      package02VariantComparisonVerified: true,
      package03ImportedAndScheduled: true,
      package03ConfiguredScheduled: true,
      package03VariantComparisonVerified: true,
      dataIsolationPreserved: true,
      exportRoundTripVerified: true,
      runtimeErrors: errors
    }
  };
  writeFileSync(join(out,'report.json'),JSON.stringify(report,null,2));
  console.log('PASS 7.12.D UI: all 3 demo packages imported, scheduled, isolated and verified with round-trip!');
}finally{
  ws?.close();
  browser.kill();
  server.kill();
}
