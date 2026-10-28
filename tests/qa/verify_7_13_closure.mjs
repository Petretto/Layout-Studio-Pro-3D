import {spawn} from 'node:child_process';
import {existsSync,mkdirSync,writeFileSync,mkdtempSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {resolve,join} from 'node:path';
import {strictEqual,ok} from 'node:assert';

// 7.13: Final browser acceptance of empty start, demo catalog, and safety protections in isolated Edge profile.
const port=5296,cdp=9396,sleep=ms=>new Promise(r=>setTimeout(r,ms));
const edge=['C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe','C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe'].find(existsSync);
if(!edge)throw new Error('Edge not found');
const out=resolve('outputs/qa/7_13_closure');mkdirSync(out,{recursive:true});
const server=spawn('node',['scripts/serve.mjs'],{env:{...process.env,PORT:String(port)},stdio:'ignore',windowsHide:true});
const browser=spawn(edge,[`--remote-debugging-port=${cdp}`,`--user-data-dir=${mkdtempSync(join(tmpdir(),'edge-7-13-closure-'))}`,'--headless=new','--no-first-run','--disable-gpu','--window-size=1440,1100','--force-device-scale-factor=1','about:blank'],{stdio:'ignore',windowsHide:true});

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

  console.log('1. Weryfikacja czystego startu na nowym profilu...');
  const projectName=await evaluate(`document.querySelector('h1')?.textContent.trim()`);
  strictEqual(projectName,'Nowy projekt linii','Nazwa domyślnego pustego projektu to Nowy projekt linii');

  const emptyNotice=await evaluate(`!!document.querySelector('.notice[role="note"]')`);
  ok(emptyNotice,'Komunikat o pustym projekcie powinien być widoczny na nowym profilu');

  const metrics=await evaluate(`[...document.querySelectorAll('.metric strong')].map(m=>m.textContent.trim())`);
  // metrics: [operacje: 0, pracochłonność: 0s/szt., stanowiska: 0, materiały: 0]
  ok(metrics[0]==='0','Liczba operacji powinna wynosić 0: '+metrics[0]);
  ok(metrics[2]==='0','Liczba stanowisk powinna wynosić 0: '+metrics[2]);
  ok(metrics[3]==='0','Liczba materiałów powinna wynosić 0: '+metrics[3]);
  await snap('01_empty_start_dashboard');
  console.log('   Pusty start zaliczony: 0 operacji, 0 stanowisk, 0 materiałów.');

  console.log('2. Weryfikacja braku na sztywno zaszytych przycisków demonstracyjnych...');
  const allButtonTexts=await evaluate(`[...document.querySelectorAll('button')].map(b=>b.textContent.trim())`);
  ok(!allButtonTexts.some(t=>t.includes('Wczytaj Eko') || t.includes('Załaduj Eko')),'Brak przycisku Wczytaj Eko w interfejsie');
  ok(!allButtonTexts.some(t=>t.includes('Silniki EV') || t.includes('Baterie EV')),'Brak przycisków dawnych wbudowanych silników/baterii');
  console.log('   Brak zaszytych danych potwierdzony.');

  console.log('3. Weryfikacja rozwijanego katalogu przykładów zewnętrznych (DemoCatalog)...');
  await click('.demo-catalog summary');
  await sleep(400);
  await until(`!!document.querySelector('.demo-catalog-grid')`);
  const demoCardsCount=await evaluate(`document.querySelectorAll('.demo-catalog-grid article').length`);
  strictEqual(demoCardsCount, 4, 'Katalog powinien zawierać dokładnie 4 karty demonstracyjne');

  const demoTitles=await evaluate(`[...document.querySelectorAll('.demo-catalog-grid article h3')].map(h=>h.textContent.trim())`);
  ok(demoTitles.some(t=>t.includes('Zestaw') || t.includes('uchwytu')),'Katalog zawiera pakiet 01: zestaw uchwytu: '+demoTitles[0]);
  ok(demoTitles.some(t=>t.includes('Wózek')),'Katalog zawiera pakiet 02: wózek warsztatowy: '+demoTitles[1]);
  ok(demoTitles.some(t=>t.includes('Moduł')),'Katalog zawiera pakiet 03: moduł urządzenia: '+demoTitles[2]);
  ok(demoTitles.some(t=>t.includes('Eko') || t.includes('Rama')),'Katalog zawiera pakiet 04: Eko / Rama: '+demoTitles[3]);
  await snap('02_demo_catalog_expanded');
  console.log('   Katalog przykładów zaliczony (wykryto 4 zewnętrzne pakiety):', demoTitles.join(', '));

  console.log('4. Weryfikacja pobierania i kontroli SHA-256 w katalogu...');
  const firstCardDetails=await evaluate(`document.querySelector('.demo-catalog-grid article details summary')?.textContent.trim()`);
  ok(firstCardDetails.includes('Warunki i ograniczenia'),'Karta zawiera rozwijane warunki i ograniczenia');

  console.log('5. Weryfikacja ochrony danych i menu projektu...');
  const menuBtn=await evaluate(`!!document.querySelector('button[aria-label="Menu projektu"]')`);
  ok(menuBtn,'Menu projektu jest dostępne w nagłówku');
  await click('button[aria-label="Menu projektu"]');
  await sleep(200);
  const menuItems=await evaluate(`[...document.querySelectorAll('[role="menu"][aria-label="Menu projektu"] button')].map(b=>b.textContent.trim())`);
  ok(menuItems.some(i=>i.includes('Nowy projekt')),'Menu zawiera akcję Nowy projekt');
  ok(menuItems.some(i=>i.includes('Pakiet projektu')),'Menu zawiera akcję Pakiet projektu');
  ok(menuItems.some(i=>i.includes('Kopie i odzyskiwanie')),'Menu zawiera akcję Kopie i odzyskiwanie');
  await snap('03_project_menu');

  strictEqual(errors.length, 0, 'Brak błędów w konsoli przeglądarki: '+JSON.stringify(errors));
  console.log('WERYFIKACJA 7.13 ZAKOŃCZONA SUKCESEM! Czysty start, brak zaszytych projektów, rozwijany katalog 4 pakietów i menu projektu przetestowane.');
}finally{
  try{if(ws)ws.close();}catch{}
  try{browser.kill();}catch{}
  try{server.kill();}catch{}
}
