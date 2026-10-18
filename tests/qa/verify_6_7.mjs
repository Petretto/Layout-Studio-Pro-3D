import {spawn} from 'node:child_process';
import {existsSync,mkdtempSync,mkdirSync,writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {ok} from 'node:assert';

const port=5257,cdp=9397,sleep=ms=>new Promise(r=>setTimeout(r,ms));
const edge=['C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe','C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe'].find(existsSync);
if(!edge)throw new Error('Brak Edge');

const server=spawn('node',['scripts/serve.mjs'],{env:{...process.env,PORT:String(port)},stdio:'ignore',windowsHide:true});
const browser=spawn(edge,[`--remote-debugging-port=${cdp}`,`--user-data-dir=${mkdtempSync(join(tmpdir(),'layout-qa-6-7-'))}`,'--headless=new','--disable-popup-blocking','--no-first-run','--disable-gpu','about:blank'],{stdio:'ignore',windowsHide:true});
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
    const r=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true}).catch(error=>{throw new Error(expression.slice(0,220)+': '+error.message);});
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

  // Exercise real native windows, not only the presence of their launch buttons.
  await evaluate(`(()=>{const open=window.open.bind(window);window.qaWindows=[];window.open=(...args)=>{const w=open(...args);if(w)window.qaWindows.push(w);return w;};})()`);
  await click('Otwórz CAD w osobnym oknie');
  await until(`window.qaWindows.length===1&&!!window.qaWindows[0].document.querySelector('[data-object-id]')`);
  const savedBefore=await evaluate(`JSON.parse(localStorage.getItem('layout-studio-v3')).project`);
  await evaluate(`(()=>{const w=window.qaWindows[0];const o=w.document.querySelector('[data-object-id]');window.qaObjectId=o.dataset.objectId;window.qaPolygon=o.querySelector('polygon').getAttribute('points');o.dispatchEvent(new w.PointerEvent('pointerdown',{bubbles:true}));})()`);
  await sleep(300);
  await evaluate(`(()=>{const w=window.qaWindows[0];w.document.activeElement?.blur();w.dispatchEvent(new w.KeyboardEvent('keydown',{key:'ArrowRight',bubbles:true}));})()`);
  await sleep(400);
  ok(await evaluate(`window.qaWindows.length===1&&!window.qaWindows[0].closed`),'CAD selection/edit must keep the same window alive');
  // App history shortcuts must bubble from the portal into the owning React tree.
  await evaluate(`(()=>{const w=window.qaWindows[0];w.document.body.querySelector('.hall-workspace').dispatchEvent(new w.KeyboardEvent('keydown',{key:'s',ctrlKey:true,bubbles:true}));})()`);
  await sleep(300);
  const savedMoved=await evaluate(`JSON.parse(localStorage.getItem('layout-studio-v3')).project`);
  const objectId=await evaluate('window.qaObjectId');
  ok(savedMoved.layoutObjects.some(o=>o.id===objectId),'Arrow key must save explicit geometry');
  ok(await evaluate(`window.qaWindows[0].document.querySelector('[data-object-id="'+window.qaObjectId+'"] polygon').getAttribute('points')!==window.qaPolygon`),'Arrow key must move the CAD polygon');
  await evaluate(`(()=>{const w=window.qaWindows[0];w.document.querySelector('.hall-workspace').dispatchEvent(new w.KeyboardEvent('keydown',{key:'z',ctrlKey:true,bubbles:true}));})()`);
  await sleep(300);
  ok(await evaluate(`window.qaWindows.length===1&&!window.qaWindows[0].closed`),'Undo must not reopen popup');
  await evaluate(`(()=>{const w=window.qaWindows[0];w.document.querySelector('.hall-workspace').dispatchEvent(new w.KeyboardEvent('keydown',{key:'s',ctrlKey:true,bubbles:true}));})()`);
  await sleep(200);
  const savedUndone=await evaluate(`JSON.parse(localStorage.getItem('layout-studio-v3')).project`);
  ok(JSON.stringify(savedUndone.layoutObjects)===JSON.stringify(savedBefore.layoutObjects),'Undo from popup must restore geometry');
  await evaluate(`[...window.qaWindows[0].document.querySelectorAll('button')].find(b=>b.textContent.includes('Przywróć do okna głównego')).click()`);
  await until(`window.qaWindows[0].closed&&!!document.querySelector('.hall-workspace')`);
  await evaluate(`document.body.dispatchEvent(new KeyboardEvent('keydown',{key:'y',ctrlKey:true,bubbles:true}))`);
  await sleep(150);
  await evaluate(`document.body.dispatchEvent(new KeyboardEvent('keydown',{key:'s',ctrlKey:true,bubbles:true}))`);
  ok(await evaluate(`JSON.parse(localStorage.getItem('layout-studio-v3')).project.layoutObjects.some(o=>o.id===window.qaObjectId)`),'Main body Ctrl+Y/S must retain global history/save');
  await evaluate(`document.body.dispatchEvent(new KeyboardEvent('keydown',{key:'z',ctrlKey:true,bubbles:true}))`);
  await sleep(150);

  await evaluate(`[...document.querySelectorAll('.studio-nav button')].find(b=>b.textContent.includes('2a Przepływ')).click()`);
  await click('Otwórz w osobnym oknie');
  await until(`window.qaWindows.length===2&&!!window.qaWindows[1].document.querySelector('.popout-window-root')`);
  // A parent edit previously caused onClose dependency cleanup and window recreation.
  await evaluate(`(()=>{const e=document.querySelector('[aria-label="Nazwa projektu"]');const setter=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set;setter.call(e,e.value+' QA');e.dispatchEvent(new Event('input',{bubbles:true}));})()`);
  await sleep(400);
  ok(await evaluate(`window.qaWindows.length===2&&!window.qaWindows[1].closed`),'Parent update must keep flow window alive');
  await evaluate('window.qaWindows[1].close()');
  await until(`!document.body.textContent.includes('Widok przepływu procesu jest otwarty')`);

  await evaluate(`[...document.querySelectorAll('.studio-nav button')].find(b=>b.textContent.includes('6 3D i symulacja')).click()`);
  await click('Otwórz 3D w osobnym oknie');
  await until(`window.qaWindows.length===3&&!!window.qaWindows[2].document.querySelector('.scene canvas')`);
  const gridBefore=await evaluate(`window.qaWindows[2].document.querySelector('label[title*="(G)"] input').checked`);
  await evaluate(`window.qaWindows[2].dispatchEvent(new window.qaWindows[2].KeyboardEvent('keydown',{key:'g',bubbles:true}))`);
  await sleep(300);
  ok(await evaluate(`window.qaWindows[2].document.querySelector('label[title*="(G)"] input').checked`)!==gridBefore,'G must toggle grid inside the 3D window');
  ok(await evaluate(`window.qaWindows.length===3&&!window.qaWindows[2].closed`),'3D shortcuts must not recreate popup');
  await click('Przywróć do okna głównego');
  await until(`window.qaWindows[2].closed&&!!document.querySelector('.scene canvas')`);

  // 6. Test Mobile Viewport (600px)
  await viewport(600);
  await sleep(300);
  ok(await evaluate(`document.documentElement.scrollWidth <= innerWidth`), 'Wykryto poziome przewijanie na 600px');
  await screenshot('verify_6_7_mobile_600');

  // Sprawdź brak błędów konsoli
  ok(!errors.length, 'Błędy konsoli w trakcie testu: ' + errors.join('; '));

  console.log('PASS 6.7a: LOD, real CAD/flow/3D popups, stable window on edit/undo, CAD arrow, Ctrl+S/Z, return/native close, 1440/600px, no runtime errors.');
} finally {
  ws?.close();
  browser.kill();
  server.kill();
}
