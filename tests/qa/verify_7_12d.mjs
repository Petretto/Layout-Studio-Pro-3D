import {openEdgeDebugPage} from './browserHarness.mjs';
import {assertOperationWindows,assertScheduleResult,assertReopenedDraft,readScheduleWindows} from './scheduleAssertions.mjs';
import {importProjectPackageUi,assertComparisonRows} from './packageImport.mjs';
import {spawn} from 'node:child_process';
import {existsSync,mkdirSync,readFileSync,writeFileSync,mkdtempSync,readdirSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {resolve,join} from 'node:path';
import {strictEqual,deepStrictEqual,ok} from 'node:assert';

// 7.12.D: Comprehensive UI acceptance of all three demo packages in an isolated Edge profile.
// Tests clean browser session, package 01, package 02, package 03, data isolation, simulation and export round-trip.
const port=5548,sleep=ms=>new Promise(r=>setTimeout(r,ms));
const edge=['C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe','C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe'].find(existsSync);
if(!edge)throw new Error('Edge not found');
const evidenceRoot=resolve('outputs/qa/pt_e2e/sol_reference/7_12d');
mkdirSync(evidenceRoot,{recursive:true});
const out=mkdtempSync(join(evidenceRoot,'run_'));
console.log('Evidence:',out);
const server=spawn('node',['scripts/serve.mjs'],{env:{...process.env,PORT:String(port)},stdio:'ignore',windowsHide:true});
const profile=mkdtempSync(join(tmpdir(),'edge-7-12d-'));
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

  const importPackage=path=>importProjectPackageUi({open:openPackageModal,upload,until,downloaded,click,evaluate,reload:reloadReady},path);

  const draft=()=>evaluate(`JSON.parse(localStorage.getItem('layout-studio-domain-v6-draft-v1')).project`);
  const comparisonScope=`document.querySelector('[aria-label="Porównanie wariantów szkicu 6"]')`;
  const verifyRows=async(expected)=>{const rows=await evaluate(`[...document.querySelectorAll('[aria-label="Tabela syntezy wskaźników 4.6"] tbody tr')].map(row=>({name:row.querySelector('td strong')?.textContent,baseline:row.querySelector('td')?.textContent.includes('BAZA'),visible:!!row.getClientRects().length&&getComputedStyle(row).visibility==='visible',makespan:[...row.querySelectorAll('td:nth-child(2) div')].find(div=>div.textContent.startsWith('Makespan:'))?.querySelector('strong')?.textContent}))`);assertComparisonRows(rows,expected);return rows;};

  const goToStations=async()=>{
    await nav('Proces i stanowiska');
    await evaluate(`(()=>{
      const b=document.querySelector('button[data-view="stations"]') || [...document.querySelectorAll('button')].find(b=>b.textContent.includes('Stanowiska i zasoby'));
      if(!b)throw new Error('Missing station navigation');b.click();
    })()`);
    await sleep(200);
  };

  const scheduleResult = '[aria-label="Wynik harmonogramu szkicu 6"]';
  const comparisonResult = '[aria-label="Wynik porównania wariantów szkicu 6"]';
  const setCheckbox = async (label, checked) => {
    await evaluate(`(() => {
      const input = document.querySelector('[aria-label=' + ${JSON.stringify(JSON.stringify(label))} + ']');
      if (!input || input.disabled) throw Error('Brak dostępnej kontrolki trybu');
      if (input.checked !== ${checked}) input.click();
    })()`);
    strictEqual(await evaluate(`document.querySelector('[aria-label=' + ${JSON.stringify(JSON.stringify(label))} + ']').checked`), checked);
  };
  const scenarios = [
    {folder:'01_zestaw_montazowy',id:'DEMO-ZESTAW-MONTAZOWY-1',baseId:'BASIC-BASE',candidateId:'BASIC-CONSOLIDATED',prefix:'ZM-',operations:3,jit:'R01'},
    {folder:'02_wozek_warsztatowy',id:'DEMO-WOZEK-WARSZTATOWY-1',baseId:'INTERMEDIATE-BASE',candidateId:'INTERMEDIATE-BALANCED',prefix:'WW-',operations:4,jit:'R03',physical:'R02'},
    {folder:'03_modul_urzadzenia',id:'DEMO-MODUL-URZADZENIA-1',baseId:'ADVANCED-BASE',candidateId:'ADVANCED-BALANCED',prefix:'MU-',operations:5,subassemblies:2,jit:'R05',physical:'R04'},
  ];
  const evidence = [];

  async function verifyScenario(refId, conditions, variants, scenario, library, tolerance) {
    const jit = conditions.transportMode === 'just-in-time';
    deepStrictEqual(conditions, {
      batch:3, arrivalIntervalSeconds:refId==='R04'?1000:1, transportMode:scenario.jit===refId?'just-in-time':'configured',
    }, `Warunki ręcznego wzorca ${refId}`);
    const baseline = variants.find(variant => variant.id === scenario.baseId);
    const candidate = variants.find(variant => variant.id === scenario.candidateId);
    ok(baseline && candidate, `Brak wzorców obu wariantów dla ${refId}`);
    const expected = [baseline,candidate].map((variant,index) => ({
      name:library.find(saved => saved.id===variant.id).name,
      baseline:index===0,
      seconds:variant.completionSeconds.at(-1),
    }));
    console.log(`${refId}: ${conditions.transportMode}, ${conditions.batch} jobs, arrival interval ${conditions.arrivalIntervalSeconds} s`);
    await field('[aria-label="Liczba sztuk szkicu 6"]',String(conditions.batch));
    await field('[aria-label="Odstęp przybycia szkicu 6 [s]"]',String(conditions.arrivalIntervalSeconds));
    await setCheckbox('Symulacja bez transportu — just in time',jit);
    await click('Oblicz harmonogram szkicu 6');
    await until(`!!document.querySelector(${JSON.stringify(scheduleResult)})`);
    assertScheduleResult(await evaluate(`document.querySelector(${JSON.stringify(scheduleResult)}).textContent`),expected[0].seconds);
    strictEqual(await evaluate(`!!document.querySelector('[aria-label="Tryb transportu wyniku"]')`),jit);
    const windows = await readScheduleWindows(evaluate);
    assertOperationWindows(windows,baseline.operationWindows,tolerance);
    const completion = Array.from({length:conditions.batch},(_,index) =>
      Math.max(...windows.filter(([job])=>job===index+1).map(([, , , finish])=>finish)));
    deepStrictEqual(completion,baseline.completionSeconds,`Ukończenia sztuk ${refId}`);
    await snap(`${refId}_schedule`);

    await field('[aria-label="Wariant bazowy odniesienia"]',scenario.baseId);
    strictEqual(await evaluate(`document.querySelector('[aria-label="Wariant bazowy odniesienia"]').value`),scenario.baseId);
    await field('[aria-label="Liczba sztuk w porównaniu wariantów"]',String(conditions.batch));
    await field('[aria-label="Odstęp przybycia w porównaniu wariantów [s]"]',String(conditions.arrivalIntervalSeconds));
    await setCheckbox('Symulacja porównania bez transportu — just in time',jit);
    await click('Porównaj warianty w symulacji (2)',comparisonScope);
    await until(`!!document.querySelector(${JSON.stringify(comparisonResult)})`);
    const heading = await evaluate(`document.querySelector(${JSON.stringify(comparisonResult)}).querySelector('h4').textContent`);
    ok(heading.includes(`partia ${conditions.batch} szt., odstęp przybycia ${conditions.arrivalIntervalSeconds} s, tryb: ${jit?'just in time':'skonfigurowany'}`),`Niezgodne warunki wyniku ${refId}: ${heading}`);
    const rows = await verifyRows(expected);
    await snap(`${refId}_comparison`);
    const reportPath = await downloaded(()=>click('Pobierz raport porównania (.md)'));
    const markdown = readFileSync(reportPath,'utf8');
    for (const item of expected) {
      const reportRow = markdown.split(/\r?\n/).find(line=>line.startsWith(`| **${item.name}**`));
      ok(reportRow, `Brak wariantu w eksporcie ${refId}: ${item.name}`);
      ok(reportRow.split('|')[4]?.trim().startsWith(`**${item.seconds}** (`), `Zły makespan wariantu w eksporcie ${refId}: ${item.name}`);
    }
    evidence.push({refId,conditions,baselineId:baseline.id,candidateId:candidate.id,observedBaselineCompletion:completion,baselineWindows:windows,comparison:rows});
  }

  for (const scenario of scenarios) {
    const root = `przyklady/${scenario.folder}`;
    const packagePath = `${root}/projekt-pokazowy.json`;
    const fixture = JSON.parse(readFileSync(packagePath,'utf8'));
    const reference = JSON.parse(readFileSync(`${root}/referencje/oczekiwane_wyniki.json`,'utf8'));
    const library = JSON.parse(fixture.data.variantsRaw).variants;
    const base = library.find(variant => variant.id===scenario.baseId);
    ok(base,`Brak zapisanej bazy ${scenario.baseId}`);
    await importPackage(packagePath);
    const active = await draft();
    strictEqual(active.id,scenario.id);
    strictEqual(active.operations.length,scenario.operations);
    ok(active.operations.every(operation=>operation.id.startsWith(scenario.prefix)),`Obca operacja w ${scenario.folder}`);
    if(scenario.subassemblies)strictEqual(active.subassemblies.length,scenario.subassemblies);
    deepStrictEqual(active,base.project,`Aktywny szkic musi być bazą ${scenario.baseId}`);
    await goToStations();
    await until(`!!document.querySelector('[aria-label="Harmonogram zespołu szkicu 6"]')`);
    await until(`!!${comparisonScope}`);
    await verifyScenario(scenario.jit,reference.conditions,reference.variants,scenario,library,reference.absoluteToleranceSeconds);
    if(scenario.physical)await verifyScenario(scenario.physical,reference.physical.conditions,reference.physical.variants,scenario,library,reference.absoluteToleranceSeconds);
  }

  console.log('4. Testing Export Round-Trip on Package 03...');
  await openPackageModal();
  await field('[aria-label="Pochodzenie danych"]','synthetic');
  const exportedPath=await downloaded(()=>click('Pobierz pakiet projektu (.project.json)'));
  const exportedPkg=JSON.parse(readFileSync(exportedPath,'utf8'));
  strictEqual(exportedPkg.format,'layout-studio-project-package');
  strictEqual(exportedPkg.data.dataOrigin,'synthetic');
  const exportedDraft=JSON.parse(exportedPkg.data.draftRaw).project;
  strictEqual(exportedDraft.id,'DEMO-MODUL-URZADZENIA-1');
  await click('Zamknij okno');

  console.log('5. Re-importing exported package to verify complete round-trip...');
  await importPackage(exportedPath);
  assertReopenedDraft(await draft(),exportedDraft);

  ok(!errors.length,'Zero runtime exceptions expected: '+errors.join('; '));

  const report={
    at: new Date().toISOString(),
    result: 'PASS',
    scope: '7.12.D E2E browser acceptance across all three demo packages',
    scenarios: evidence,
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
