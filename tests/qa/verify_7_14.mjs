import {spawn} from 'node:child_process';
import {existsSync,mkdirSync,writeFileSync,mkdtempSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {resolve,join} from 'node:path';
import {strictEqual,ok} from 'node:assert';

// 7.14: Automated acceptance verification of interactive tutorial in isolated Edge profile.
const port=5299,cdp=9399,sleep=ms=>new Promise(r=>setTimeout(r,ms));
const edge=['C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe','C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe'].find(existsSync);
if(!edge)throw new Error('Edge not found');
const out=resolve('outputs/qa/7_14_tutorial');mkdirSync(out,{recursive:true});
const server=spawn('node',['scripts/serve.mjs'],{env:{...process.env,PORT:String(port)},stdio:'ignore',windowsHide:true});
const browser=spawn(edge,[`--remote-debugging-port=${cdp}`,`--user-data-dir=${mkdtempSync(join(tmpdir(),'edge-7-14-'))}`,'--headless=new','--no-first-run','--disable-gpu','--window-size=1440,1100','--force-device-scale-factor=1','about:blank'],{stdio:'ignore',windowsHide:true});

let ws;
try{
  let target;
  for(let i=0;i<50;i++){try{target=(await(await fetch(`http://127.0.0.1:${cdp}/json/list`,{signal:AbortSignal.timeout(1000)})).json()).find(t=>t.type==='page');if(target)break;}catch{}await sleep(200);}
  if(!target)throw new Error('Missing CDP target');
  ws=new WebSocket(target.webSocketDebuggerUrl);await new Promise((res,rej)=>{ws.onopen=res;ws.onerror=rej;});
  let id=0;const pending=new Map(),errors=[];
  ws.onmessage=e=>{
    const m=JSON.parse(e.data);
    if(m.method==='Page.javascriptDialogOpening')console.error('Browser dialog',m.params.type,m.params.message);
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
  const click=async(selector)=>{
    await evaluate(`(()=>{const b=document.querySelector(${JSON.stringify(selector)});if(!b)throw new Error('Missing: '+${JSON.stringify(selector)});b.click();})()`);
    await sleep(200);
  };
  const snap=async name=>{
    await evaluate(`new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))`);await sleep(300);
    writeFileSync(join(out,name+'.png'),Buffer.from((await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false})).data,'base64'));
  };

  await send('Page.enable');await send('Runtime.enable');
  await send('Emulation.setDeviceMetricsOverride',{width:1440,height:1100,deviceScaleFactor:1,mobile:false});
  await send('Page.navigate',{url:`http://127.0.0.1:${port}/`});
  await until(`!!document.querySelector('.studio')`);

  console.log('1. Sprawdzenie stanu początkowego na pulpicie...');
  const initialDock=await evaluate(`!!document.querySelector('.tutorial-dock')`);
  strictEqual(initialDock,false,'Tutorial dock nie powinien być aktywny na starcie');

  console.log('2. Uruchomienie interaktywnego tutorialu z pulpitu...');
  await click('.tutorial-action-card'); // "Rozpocznij interaktywny tutorial"
  await until(`!!document.querySelector('.tutorial-dock')`);
  await sleep(500);

  // Krok 1: Wprowadzenie
  let stepTitle=await evaluate(`document.querySelector('.tutorial-dock-title')?.textContent.trim()`);
  ok(stepTitle.includes('Wprowadzenie i wybór projektu'), 'Krok 1 powinien być wprowadzeniem: '+stepTitle);
  await snap('01_tutorial_step_welcome');
  console.log('   Krok 1 zaliczony:', stepTitle);

  // Krok 2: Popyt
  await click('.tutorial-btn-primary'); // "Następny krok"
  await until(`document.querySelector('.tutorial-dock-title')?.textContent.includes('Popyt klienta')`);
  stepTitle=await evaluate(`document.querySelector('.tutorial-dock-title')?.textContent.trim()`);
  const activeNav1=await evaluate(`document.querySelector('.shell-nav button.active')?.textContent.trim()`);
  ok(activeNav1.includes('Popyt') || activeNav1.includes('Wymagania'), 'Widok powinien automatycznie przełączyć się na popyt');
  await snap('02_tutorial_step_demand');
  console.log('   Krok 2 zaliczony:', stepTitle);

  // Krok 3: Proces
  await click('.tutorial-btn-primary');
  await until(`document.querySelector('.tutorial-dock-title')?.textContent.includes('Operacje i struktura procesu')`);
  stepTitle=await evaluate(`document.querySelector('.tutorial-dock-title')?.textContent.trim()`);
  await snap('03_tutorial_step_process');
  console.log('   Krok 3 zaliczony:', stepTitle);

  // Krok 4: Bilansowanie
  await click('.tutorial-btn-primary');
  await until(`document.querySelector('.tutorial-dock-title')?.textContent.includes('Bilansowanie linii')`);
  stepTitle=await evaluate(`document.querySelector('.tutorial-dock-title')?.textContent.trim()`);
  await snap('04_tutorial_step_balance');
  console.log('   Krok 4 zaliczony:', stepTitle);

  // Krok 5: CAD 2D
  await click('.tutorial-btn-primary');
  await until(`document.querySelector('.tutorial-dock-title')?.textContent.includes('Rozmieszczenie hali i CAD 2D')`);
  stepTitle=await evaluate(`document.querySelector('.tutorial-dock-title')?.textContent.trim()`);
  await snap('05_tutorial_step_layout');
  console.log('   Krok 5 zaliczony:', stepTitle);

  // Krok 6: Symulacja
  await click('.tutorial-btn-primary');
  await until(`document.querySelector('.tutorial-dock-title')?.textContent.includes('Symulacja harmonogramu')`);
  stepTitle=await evaluate(`document.querySelector('.tutorial-dock-title')?.textContent.trim()`);
  await snap('06_tutorial_step_simulation');
  console.log('   Krok 6 zaliczony:', stepTitle);

  // Krok 7: Warianty
  await click('.tutorial-btn-primary');
  await until(`document.querySelector('.tutorial-dock-title')?.textContent.includes('Porównanie wariantów reorganizacji')`);
  stepTitle=await evaluate(`document.querySelector('.tutorial-dock-title')?.textContent.trim()`);
  await snap('07_tutorial_step_variants');
  console.log('   Krok 7 zaliczony:', stepTitle);

  // Krok 8: Raport i zakończenie
  await click('.tutorial-btn-primary');
  await until(`document.querySelector('.tutorial-dock-title')?.textContent.includes('Raport inżynierski i eksport')`);
  stepTitle=await evaluate(`document.querySelector('.tutorial-dock-title')?.textContent.trim()`);
  await snap('08_tutorial_step_report');
  console.log('   Krok 8 zaliczony:', stepTitle);

  console.log('3. Weryfikacja alternatywnej instrukcji tekstowej...');
  const textBtn=await evaluate(`(()=>{const b=document.querySelector('button[aria-label="Otwórz przewodnik tekstowy"]');if(!b)return null;b.click();return true;})()`);
  ok(textBtn, 'Przycisk instrukcji tekstowej powinien istnieć');
  await until(`!!document.querySelector('.tutorial-text-modal')`);
  const modalStepsCount=await evaluate(`document.querySelectorAll('.tutorial-text-step').length`);
  strictEqual(modalStepsCount, 8, 'Modal powinien wyświetlać wszystkie 8 kroków');
  await snap('09_tutorial_text_modal');
  console.log('   Modal tekstowy zaliczony (wykryto 8 kroków)');

  // Zamknięcie modalu
  await evaluate(`(()=>{const b=[...document.querySelectorAll('.tutorial-text-modal button')].find(b=>b.textContent.includes('Zamknij') || b.getAttribute('aria-label')?.includes('Zamknij'));if(!b)throw new Error('Brak przycisku zamknięcia');b.click();})()`);
  await until(`!document.querySelector('.tutorial-text-modal')`);

  console.log('4. Weryfikacja powrotu wstecz...');
  await click('button[aria-label="Poprzedni krok tutorialu"]');
  await until(`document.querySelector('.tutorial-dock-title')?.textContent.includes('Porównanie wariantów reorganizacji')`);
  stepTitle=await evaluate(`document.querySelector('.tutorial-dock-title')?.textContent.trim()`);
  ok(stepTitle.includes('Porównanie wariantów reorganizacji'), 'Przycisk Poprzedni powinien powrócić do kroku 7: '+stepTitle);
  console.log('   Nawigacja wstecz zaliczona:', stepTitle);

  console.log('5. Zakończenie tutorialu...');
  await click('button[aria-label="Zamknij tutorial"]');
  await sleep(300);
  const confirmOpen=await evaluate(`!!document.querySelector('dialog[open]')`);
  if(confirmOpen){
    console.log('   Wykryto modal potwierdzenia wyjścia/przywrócenia migawki.');
    await evaluate(`(()=>{const b=[...document.querySelectorAll('dialog[open] button')].find(b=>b.textContent.includes('Potwierdź'));if(b)b.click();})()`);
    await sleep(600);
  }
  await until(`!document.querySelector('.tutorial-dock')`);
  console.log('   Dock tutorialu został pomyślnie zamknięty.');
  await snap('10_tutorial_dock_closed');

  strictEqual(errors.length, 0, 'Brak błędów w konsoli przeglądarki: '+JSON.stringify(errors));
  console.log('WERYFIKACJA 7.14 ZAKOŃCZONA SUKCESEM! 8 kroków, modal, nawigacja i obsługa snapshotu przetestowane.');
}finally{
  try{if(ws)ws.close();}catch{}
  try{browser.kill();}catch{}
  try{server.kill();}catch{}
}
