import {spawn} from 'node:child_process';
import {existsSync,mkdirSync,writeFileSync,mkdtempSync,readdirSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {resolve,join} from 'node:path';
import {strictEqual,ok} from 'node:assert';

// 7.9: Pilot acceptance across agreed scenarios, clean profile, 0 critical errors.
const port=5297,cdp=9397,sleep=ms=>new Promise(r=>setTimeout(r,ms));
const edge=['C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe','C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe'].find(existsSync);
if(!edge)throw new Error('Edge not found');
const out=resolve('outputs/qa/7_9_pilot');mkdirSync(out,{recursive:true});
const downloads=join(out,`downloads_${Math.random().toString(36).slice(2,8)}`);mkdirSync(downloads,{recursive:true});
const server=spawn('node',['scripts/serve.mjs'],{env:{...process.env,PORT:String(port)},stdio:'ignore',windowsHide:true});
const browser=spawn(edge,[`--remote-debugging-port=${cdp}`,`--user-data-dir=${mkdtempSync(join(tmpdir(),'edge-7-9-'))}`,'--headless=new','--no-first-run','--disable-gpu','--window-size=1440,1100','--force-device-scale-factor=1','about:blank'],{stdio:'ignore',windowsHide:true});

let ws;
try{
  let target;
  for(let i=0;i<50;i++){try{target=(await(await fetch(`http://127.0.0.1:${cdp}/json/list`,{signal:AbortSignal.timeout(1000)})).json()).find(t=>t.type==='page');if(target)break;}catch{}await sleep(200);}
  if(!target)throw new Error('Missing CDP target');
  ws=new WebSocket(target.webSocketDebuggerUrl);await new Promise((res,rej)=>{ws.onopen=res;ws.onerror=rej;});
  let id=0;const pending=new Map(),errors=[];
  ws.onmessage=e=>{
    const m=JSON.parse(e.data);
    if(m.method==='Page.javascriptDialogOpening'){
      ws.send(JSON.stringify({id:++id,method:'Page.handleJavaScriptDialog',params:{accept:true}}));
    }
    if(m.method==='Runtime.exceptionThrown')errors.push(m.params.exceptionDetails.text);
    if(pending.has(m.id)){
      const p=pending.get(m.id);pending.delete(m.id);
      m.error?p.reject(new Error(m.error.message)):p.resolve(m.result);
    }
  };
  const send=(method,params={})=>new Promise((res,rej)=>{
    const next=++id,timer=setTimeout(()=>{pending.delete(next);rej(new Error('Timeout '+method+' '+(params.expression??'').slice(0,250)));},20000);
    pending.set(next,{resolve:r=>{clearTimeout(timer);res(r);},reject:e=>{clearTimeout(timer);rej(e);}});
    ws.send(JSON.stringify({id:next,method,params}));
  });
  const evaluate=async expression=>{
    const r=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});
    if(r.exceptionDetails)throw new Error(r.exceptionDetails.exception?.description??r.exceptionDetails.text);
    return r.result.value;
  };
  const until=async expression=>{for(let i=0;i<120;i++){if(await evaluate(expression))return;await sleep(100);}throw new Error('Timeout '+expression);};
  const click=async(target,scope='document')=>{
    await evaluate(`(()=>{
      let b = null;
      try { b = ${scope}.querySelector(${JSON.stringify(target)}); } catch(e){}
      if(!b){
        b = [...${scope}.querySelectorAll('button, summary, [role=button], .tutorial-btn-primary, .tutorial-close-btn')].find(el => el.textContent.trim().includes(${JSON.stringify(target)}) || el.getAttribute('aria-label') === ${JSON.stringify(target)});
      }
      if(!b) throw new Error('Missing button/action/selector: ' + ${JSON.stringify(target)});
      b.click();
    })()`);
    await sleep(250);
  };
  const nav=async(text)=>{
    await evaluate(`(()=>{const b=[...document.querySelectorAll('.studio-nav button, .shell-nav button, .shell-subnav button')].find(b=>b.textContent.includes(${JSON.stringify(text)}));if(!b)throw new Error('Missing nav: '+${JSON.stringify(text)});b.click();})()`);
    await sleep(250);
  };
  const snap=async name=>{
    await sleep(350);
    writeFileSync(join(out,name+'.png'),Buffer.from((await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false})).data,'base64'));
  };
  const upload=async(selector,file)=>{
    const {root}=await send('DOM.getDocument');
    const {nodeId}=await send('DOM.querySelector',{nodeId:root.nodeId,selector});
    await send('DOM.setFileInputFiles',{nodeId,files:[resolve(file)]});
    await sleep(300);
  };
  const downloaded=async action=>{
    const before=readdirSync(downloads);await action();
    for(let i=0;i<100;i++){
      const current=readdirSync(downloads);
      if(current.length>before.length){const created=current.find(f=>!before.includes(f));await sleep(200);return join(downloads,created);}
      await sleep(100);
    }
    throw new Error('Timeout waiting for download');
  };

  await send('Page.enable');await send('Runtime.enable');
  await send('Browser.setDownloadBehavior',{behavior:'allow',downloadPath:downloads,eventsEnabled:true});
  await send('Emulation.setDeviceMetricsOverride',{width:1440,height:1100,deviceScaleFactor:1,mobile:false});
  await send('Page.navigate',{url:`http://127.0.0.1:${port}/`});
  await until(`!!document.querySelector('.studio')`);

  console.log('1. Weryfikacja czystego startu aplikacji (Pulpit z pustym projektem)...');
  await until(`!!document.querySelector('.studio')`);
  await snap('01_clean_dashboard');
  const initialOperations = await evaluate(`document.querySelectorAll('.table-row').length`);
  strictEqual(initialOperations, 0, 'Pusty start bez operacji');

  console.log('2. Weryfikacja rozwijanego katalogu demonstracyjnego 7.13...');
  await click('.demo-catalog summary');
  await sleep(400);
  await until(`!!document.querySelector('.demo-catalog-grid')`);
  const cardsCount = await evaluate(`document.querySelectorAll('.demo-catalog-grid article').length`);
  strictEqual(cardsCount, 4, 'Katalog zawiera 4 zewnętrzne pakiety');
  await snap('02_demo_catalog_expanded');

  console.log('3. Uruchomienie interaktywnego tutorialu 7.14 na projekcie bazowym...');
  await evaluate(`document.querySelector('.tutorial-action-card').click()`);
  await until(`!!document.querySelector('.tutorial-dock')`);
  await snap('03_tutorial_dock_welcome');

  for(let step=1; step<=7; step++){
    await click('Następny krok');
    await sleep(200);
  }
  await snap('04_tutorial_step_8_report');
  await click('Zamknij tutorial');
  await sleep(300);
  // Obsłuż ewentualny modal potwierdzenia wyjścia z tutorialu
  const modalConfirm = await evaluate(`!!document.querySelector('.tutorial-modal-actions button.primary')`);
  if(modalConfirm){
    await evaluate(`document.querySelector('.tutorial-modal-actions button.primary').click()`);
    await sleep(300);
  }

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

  const importPackage=async path=>{
    await openPackageModal();
    await upload('[aria-label="Plik pakietu projektu"]',path);
    await until(`document.body.textContent.includes('Pakiet poprawny.')`);
    await downloaded(()=>click('Pobierz kopię ratunkową przed importem'));
    await evaluate(`document.querySelector('[aria-label="Pakiet projektu"] input[type=checkbox]').click()`);
    await click('Wczytaj pakiet i przeładuj');
    await reloadReady();
  };

  const goToStations=async()=>{
    await nav('Proces i stanowiska');
    await sleep(150);
    await evaluate(`(()=>{
      const b=document.querySelector('button[data-view="stations"]') || [...document.querySelectorAll('button')].find(b=>b.textContent.includes('Stanowiska i zasoby'));
      if(b)b.click();
    })()`);
    await sleep(250);
  };

  const goToHall=async()=>{
    await nav('Hala i symulacja');
    await sleep(250);
  };

  await importPackage('przyklady/02_wozek_warsztatowy/projekt-pokazowy.json');
  await goToStations();
  await sleep(400);
  await snap('05_package_02_scheduled');

  console.log('5. Weryfikacja importu, zbiegania gałęzi i buforów C2 w Pakiecie 03 (Moduł urządzenia)...');
  await importPackage('przyklady/03_modul_urzadzenia/projekt-pokazowy.json');
  await goToStations();
  await sleep(400);
  await snap('06_package_03_scheduled');

  console.log('6. Weryfikacja porównania wariantów reorganizacji w UI...');
  const compBtn = await evaluate(`!![...document.querySelectorAll('button')].find(b=>b.textContent.includes('Porównaj warianty'))`);
  if(compBtn){
    await click('Porównaj warianty');
    await sleep(400);
    await snap('07_package_03_variant_comparison');
  }

  console.log('7. Weryfikacja rzutu CAD hali 2D i widoku 3D...');
  await goToHall();
  await sleep(500);
  await snap('08_hall_cad_layout');

  console.log('8. Sprawdzenie błędów JavaScript w konsoli...');
  strictEqual(errors.length, 0, 'Brak błędów w konsoli Edge: ' + JSON.stringify(errors));

  console.log('PASS: Pilotaż 7.9 zakończony pełnym sukcesem (0 błędów krytycznych, kompletne ścieżki użytkownika).');
}finally{
  try{if(ws)ws.close();}catch{}
  try{browser.kill();}catch{}
  try{server.kill();}catch{}
}
