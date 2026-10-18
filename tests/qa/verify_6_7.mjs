import {spawn} from 'node:child_process';
import {existsSync,mkdtempSync,mkdirSync,writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {ok} from 'node:assert';

const port=5257,cdp=9397,sleep=ms=>new Promise(r=>setTimeout(r,ms));
const edge=['C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe','C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe'].find(existsSync);
if(!edge)throw new Error('Brak Edge');

const server=spawn('node',['scripts/serve.mjs'],{env:{...process.env,PORT:String(port)},stdio:'ignore',windowsHide:true});
const browser=spawn(edge,[`--remote-debugging-port=${cdp}`,`--user-data-dir=${mkdtempSync(join(tmpdir(),'layout-qa-6-7-'))}`,'--headless=new','--no-first-run','--disable-gpu','about:blank'],{stdio:'ignore',windowsHide:true});
let ws;

try{
  let target;
  for(let i=0;i<40;i++){
    try{
      target=(await(await fetch(`http://127.0.0.1:${cdp}/json/list`,{signal:AbortSignal.timeout(1000)})).json()).find(t=>t.type==='page');
      if(target)break;
    }catch{}
    await sleep(200);
  }
  if(!target)throw new Error('Brak CDP');

  ws=new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve,reject)=>{ws.onopen=resolve;ws.onerror=reject;});

  let id=0;const pending=new Map(),errors=[];
  ws.onmessage=e=>{
    const m=JSON.parse(e.data);
    if(m.method==='Runtime.exceptionThrown')errors.push(m.params.exceptionDetails.text);
    if(pending.has(m.id)){
      const p=pending.get(m.id);
      pending.delete(m.id);
      m.error?p.reject(new Error(m.error.message)):p.resolve(m.result);
    }
  };

  const send=(method,params={})=>new Promise((resolve,reject)=>{
    const next=++id;
    const timer=setTimeout(()=>{pending.delete(next);reject(new Error('Timeout '+method));},10000);
    pending.set(next,{resolve:r=>{clearTimeout(timer);resolve(r);},reject:e=>{clearTimeout(timer);reject(e);}});
    ws.send(JSON.stringify({id:next,method,params}));
  });

  const evaluate=async expression=>{
    const r=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});
    if(r.exceptionDetails)throw new Error(r.exceptionDetails.exception?.description??r.exceptionDetails.text);
    return r.result.value;
  };

  const until=async expression=>{
    for(let i=0;i<60;i++){
      if(await evaluate(expression))return;
      await sleep(100);
    }
    throw new Error('Timeout '+expression);
  };

  const click=async text=>{
    await evaluate(`(()=>{const b=[...document.querySelectorAll('button')].find(b=>b.textContent.trim().includes(${JSON.stringify(text)}));if(!b||b.disabled)throw new Error('Brak '+${JSON.stringify(text)});b.click()})()`);
    await sleep(150);
  };

  const viewport=async width=>{await send('Emulation.setDeviceMetricsOverride',{width,height:1050,deviceScaleFactor:1,mobile:false});await sleep(100);};
  const screenshot=async name=>{
    mkdirSync('outputs/qa',{recursive:true});
    writeFileSync(`outputs/qa/${name}.png`,Buffer.from((await send('Page.captureScreenshot',{format:'png'})).data,'base64'));
  };

  await send('Runtime.enable');
  await send('Page.enable');
  await viewport(1440);

  // 1. Open app and navigate to 3D and simulation tab
  await send('Page.navigate',{url:`http://127.0.0.1:${port}/`});
  await until(`!!document.querySelector('.studio-nav')`);

  // Navigate to 6 3D i symulacja
  await evaluate(`[...document.querySelectorAll('.studio-nav button')].find(b=>b.textContent.includes('6 3D i symulacja')).click()`);
  await until(`!!document.querySelector('.scene canvas')`);
  await sleep(600);

  // 2. Weryfikacja przycisku Trybu uproszczonego (LOD / Bounding Box)
  const hasLODBtn = await evaluate(`!![...document.querySelectorAll('button')].find(b=>b.textContent.includes('Tryb uproszczony'))`);
  ok(hasLODBtn, 'Przycisk Tryb uproszczony (LOD) powinien być dostępny w toolbarze 3D');

  // Włącz tryb uproszczony
  await click('Tryb uproszczony (LOD)');
  await sleep(500);

  const isLODActive = await evaluate(`[...document.querySelectorAll('button')].some(b=>b.textContent.includes('Tryb uproszczony: WŁ'))`);
  ok(isLODActive, 'Tryb uproszczony powinien zostać aktywowany (Tryb uproszczony: WŁ)');
  await screenshot('verify_6_7_simplified_lod_mode_active');

  // Wyłącz tryb uproszczony
  await click('Tryb uproszczony: WŁ');
  await sleep(400);

  // 3. Weryfikacja przycisku otwarcia 3D w osobnym oknie
  const hasPopout3DBtn = await evaluate(`!![...document.querySelectorAll('button')].find(b=>b.textContent.includes('Otwórz 3D w osobnym oknie'))`);
  ok(hasPopout3DBtn, 'Przycisk Otwórz 3D w osobnym oknie powinien być dostępny');

  // 4. Weryfikacja przycisku w zakładce 2a Przepływ
  await evaluate(`[...document.querySelectorAll('.studio-nav button')].find(b=>b.textContent.includes('2a Przepływ')).click()`);
  await sleep(400);
  const hasPopoutFlowBtn = await evaluate(`!![...document.querySelectorAll('button')].find(b=>b.textContent.includes('Otwórz w osobnym oknie'))`);
  ok(hasPopoutFlowBtn, 'Przycisk Otwórz w osobnym oknie powinien być dostępny w zakładce Przepływ');
  await screenshot('verify_6_7_popout_flow_btn');

  // 5. Weryfikacja przycisku w zakładce 5 Hala i CAD
  await evaluate(`[...document.querySelectorAll('.studio-nav button')].find(b=>b.textContent.includes('5 Hala i CAD')).click()`);
  await sleep(400);
  const hasPopoutCadBtn = await evaluate(`!![...document.querySelectorAll('button')].find(b=>b.textContent.includes('Otwórz CAD w osobnym oknie'))`);
  ok(hasPopoutCadBtn, 'Przycisk Otwórz CAD w osobnym oknie powinien być dostępny w zakładce Hala i CAD');
  await screenshot('verify_6_7_popout_cad_btn');

  // 6. Test Mobile Viewport (600px)
  await viewport(600);
  await sleep(300);
  ok(await evaluate(`document.documentElement.scrollWidth <= innerWidth`), 'Wykryto poziome przewijanie na 600px');
  await screenshot('verify_6_7_mobile_600');

  // Sprawdź brak błędów konsoli
  ok(!errors.length, 'Błędy konsoli w trakcie testu: ' + errors.join('; '));

  console.log('PASS 6.7: Tryb uproszczony 3D (LOD/Bounding Box), przyciski otwarcia w osobnym oknie (Popout) dla 3D, CAD i Przepływu, responsywność 1440/600px, brak błędów konsoli.');
} finally {
  ws?.close();
  browser.kill();
  server.kill();
}
