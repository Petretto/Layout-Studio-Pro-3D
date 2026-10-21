import {spawn} from 'node:child_process';
import {existsSync,mkdirSync,readFileSync,writeFileSync,mkdtempSync,readdirSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {resolve,join} from 'node:path';
import {strictEqual,deepStrictEqual,ok} from 'node:assert';

// Basic demo acceptance in an isolated Edge profile; synthetic inputs and deliberate storage faults.
const port=5299,cdp=9399,sleep=ms=>new Promise(r=>setTimeout(r,ms));
const edge=['C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe','C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe'].find(existsSync);
if(!edge)throw new Error('Edge not found');
const out=resolve('outputs/qa/7_12b_ui');mkdirSync(out,{recursive:true});
const server=spawn('node',['scripts/serve.mjs'],{env:{...process.env,PORT:String(port)},stdio:'ignore',windowsHide:true});
const browser=spawn(edge,[`--remote-debugging-port=${cdp}`,`--user-data-dir=${mkdtempSync(join(tmpdir(),'edge-7-12b-'))}`,'--headless=new','--no-first-run','--disable-gpu','--window-size=1440,1100','--force-device-scale-factor=1','about:blank'],{stdio:'ignore',windowsHide:true});
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
  const root='przyklady/01_zestaw_montazowy/',pkg=JSON.parse(readFileSync(root+'projekt-pokazowy.json','utf8'));
  const ref=JSON.parse(readFileSync(root+'referencje/oczekiwane_wyniki.json','utf8'));
  const confirm=async()=>{await until(`!!document.querySelector('dialog[open]')`);await click('Potwierdź',`document.querySelector('dialog[open]')`);};
  const downloaded=async action=>{const destination=mkdtempSync(join(downloads,'action_'));await send('Browser.setDownloadBehavior',{behavior:'allow',downloadPath:destination});await action();for(let i=0;i<100;i++){const name=readdirSync(destination).find(n=>!n.endsWith('.crdownload'));if(name)return join(destination,name);await sleep(100);}throw new Error('Download not completed');};
  const reloadReady=async()=>{await sleep(900);await until(`!!document.querySelector('.studio-nav')&&!document.querySelector('[aria-label="Pakiet projektu"]')`);};
  const importPackage=async path=>{
    await click('Pakiet projektu');await upload('[aria-label="Plik pakietu projektu"]',path);await until(`document.body.textContent.includes('Pakiet poprawny.')`);
    await downloaded(()=>click('Pobierz kopię ratunkową przed importem'));await evaluate(`document.querySelector('[aria-label="Pakiet projektu"] input[type=checkbox]').click()`);await click('Wczytaj pakiet i przeładuj');await reloadReady();
  };
  const draft=()=>evaluate(`JSON.parse(localStorage.getItem('layout-studio-domain-v6-draft-v1')).project`);
  const comparisonScope=`document.querySelector('[aria-label="Porównanie wariantów szkicu 6"]')`;
  const calculate=async expected=>{
    await field('[aria-label="Liczba sztuk szkicu 6"]','3');await field('[aria-label="Odstęp przybycia szkicu 6 [s]"]','1');
    await evaluate(`(()=>{const e=document.querySelector('[aria-label="Symulacja bez transportu — just in time"]');if(!e.checked)e.click()})()`);
    await click('Oblicz harmonogram szkicu 6');await until(`!!document.querySelector('[aria-label="Wynik harmonogramu szkicu 6"]')`);
    ok(await evaluate(`document.querySelector('[aria-label="Wynik harmonogramu szkicu 6"]').textContent.includes('koniec ostatniej sztuki: ${expected} s')`));
  };
  await evaluate(`[...document.querySelectorAll('.action-card')].find(e=>e.textContent.includes('Rozpocznij od zera')).click()`);await confirm();
  await importPackage(root+'projekt-pokazowy.json');deepStrictEqual(await draft(),JSON.parse(pkg.data.draftRaw).project);
  await nav('1 Popyt');ok(await evaluate(`document.querySelector('main').textContent.includes('60')`));
  await nav('4 Bilans');ok(await evaluate(`document.querySelector('main').textContent.includes('ZM-OP30')`));await snap('source_balance');
  await nav('5 Hala');await until(`!!document.querySelector('svg[aria-label="Rzut hali i wyposażenia"]')`);
  deepStrictEqual(await evaluate(`[...document.querySelectorAll('svg[aria-label="Rzut hali i wyposażenia"] [data-object-id]')].map(e=>e.dataset.objectId).sort()`),['ZM-TABLE-1','ZM-TABLE-2','ZM-TABLE-3']);
  await evaluate(`document.querySelector('svg[aria-label="Rzut hali i wyposażenia"]').scrollIntoView({block:'center'})`);await snap('source_layout');
  // The supplied spreadsheets also work through the real import UI, on the source project.
  await nav('2 Proces');await upload('input[accept=".xlsx,.csv"]',root+'dane/proces.xlsx');await confirm();
  strictEqual(await evaluate(`JSON.parse(localStorage.getItem('layout-studio-v3'))?.project.processSteps.length`),3);await sleep(800);
  await nav('3 BOM');await upload('input[accept=".xlsx,.csv"]',root+'dane/bom.xlsx');await confirm();await sleep(800);
  strictEqual(await evaluate(`JSON.parse(localStorage.getItem('layout-studio-v3')).project.bom.length`),4);await snap('bom_import');
  // Restore the full authoritative family after the separate template exercise.
  await importPackage(root+'projekt-pokazowy.json');await nav('Stanowiska v5');await until(`!!document.querySelector('[aria-label="Harmonogram zespołu szkicu 6"]')`);
  ok(!(await evaluate(`document.querySelector('[aria-label="Symulacja bez transportu — just in time"]').checked`)),'JIT must remain explicit/off after loading');
  await calculate(170);await evaluate(`document.querySelector('[aria-label="Wynik harmonogramu szkicu 6"]').scrollIntoView()`);await snap('base_schedule');
  await field('[aria-label="Liczba sztuk w porównaniu wariantów"]','3');await field('[aria-label="Odstęp przybycia w porównaniu wariantów [s]"]','1');
  await evaluate(`document.querySelector('[aria-label="Symulacja porównania bez transportu — just in time"]').click()`);
  await click('Porównaj warianty w symulacji (2)',comparisonScope);await until(`!!document.querySelector('[aria-label="Wynik porównania wariantów szkicu 6"]')`);
  const comparison=await evaluate(`document.querySelector('[aria-label="Wynik porównania wariantów szkicu 6"]').textContent`);
  for(const n of ['170','190','90','72'])ok(comparison.includes(n),`Visible result ${n}`);
  await evaluate(`document.querySelector('[aria-label="Wynik porównania wariantów szkicu 6"]').scrollIntoView()`);await snap('comparison');
  const reportPath=await downloaded(()=>click('Pobierz raport porównania (.md)'));const report=readFileSync(reportPath,'utf8');
  ok(report.includes('170')&&report.includes('190')&&/just.in.time|JIT/i.test(report));writeFileSync(join(out,'comparison_report.md'),report);
  await evaluate(`(()=>{const row=[...document.querySelectorAll('[aria-label="Zapisane warianty szkicu 6"] tbody tr')].find(r=>r.textContent.includes('BASIC-CONSOLIDATED'));[...row.querySelectorAll('button')].find(b=>b.textContent==='Wczytaj do szkicu 6').click()})()`);
  await until(`document.body.textContent.includes('Wczytano wariant')`);
  const expectedCons=JSON.parse(pkg.data.variantsRaw).variants[1].project;deepStrictEqual(await draft(),expectedCons);
  await click('Cofnij dane szkicu',comparisonScope);deepStrictEqual(await draft(),JSON.parse(pkg.data.draftRaw).project);
  await click('Ponów dane szkicu',comparisonScope);deepStrictEqual(await draft(),expectedCons);
  await calculate(190);await evaluate(`document.querySelector('[aria-label="Wynik harmonogramu szkicu 6"]').scrollIntoView()`);await snap('consolidated_schedule');
  await field('[aria-label="Nazwa wariantu szkicu 6"]','Moja kopia konsolidacji');await field('[aria-label="Typ porównywanego wariantu"]','changed-layout');await click('Zapisz wariant szkicu 6',comparisonScope);
  await until(`document.body.textContent.includes('Zapisano wariant szkicu 6')`);
  await click('Pakiet projektu');await field('[aria-label="Pochodzenie danych"]','synthetic');
  const exported=await downloaded(()=>click('Pobierz pakiet projektu')),saved=JSON.parse(readFileSync(exported,'utf8'));
  deepStrictEqual(JSON.parse(saved.data.draftRaw).project,expectedCons);strictEqual(JSON.parse(saved.data.variantsRaw).variants.length,3);
  await click('Zamknij pakiet projektu');await importPackage(exported);await send('Page.reload');await reloadReady();
  deepStrictEqual(await draft(),expectedCons);strictEqual(await evaluate(`JSON.parse(localStorage.getItem('layout-studio-domain-v6-variants-v1')).variants.length`),3);
  await nav('Stanowiska v5');await until(`!!document.querySelector('[aria-label="Harmonogram zespołu szkicu 6"]')`);await calculate(190);
  ok(!errors.length,errors.join('; '));
  writeFileSync(join(out,'report.json'),JSON.stringify({at:new Date().toISOString(),result:'PASS',scope:'synthetic basic demo, empty project through real file UI; no localStorage seeding',reference:ref.conditions,checks:{emptyProjectToPackage:true,xlsxProcessAndBomImported:true,taktAndSourceBalanceVisible:true,sourceLayoutThreeTablesVisible:true,jitOffUntilSelected:true,baseMakespan170:true,comparison170And190:true,reportDownloaded:true,restoreConsolidated:true,undoRedoExact:true,consolidatedMakespan190:true,savedOwnVariant:true,packageExportImportReloadExact:true},runtimeErrors:errors},null,2));
  console.log('PASS 7.12.B UI: empty project, package and XLSX, explicit JIT, 170/190s comparison/report, restore/undo/redo, own variant and export/import/reload');
}finally{ws?.close();browser.kill();server.kill();}
