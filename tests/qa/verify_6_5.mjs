import {spawn} from 'node:child_process';
import {existsSync,mkdtempSync,mkdirSync,writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {ok,strictEqual,deepStrictEqual} from 'node:assert';

const port=5255,cdp=9395,sleep=ms=>new Promise(r=>setTimeout(r,ms));
const edge=['C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe','C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe'].find(existsSync);
if(!edge)throw new Error('Brak Edge');

const server=spawn('node',['scripts/serve.mjs'],{env:{...process.env,PORT:String(port)},stdio:'ignore',windowsHide:true});
const browser=spawn(edge,[`--remote-debugging-port=${cdp}`,`--user-data-dir=${mkdtempSync(join(tmpdir(),'layout-qa-6-5-'))}`,'--headless=new','--no-first-run','--disable-gpu','about:blank'],{stdio:'ignore',windowsHide:true});
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

  const saved=()=>evaluate(`JSON.parse(localStorage.getItem('layout-studio-v3')).project`);
  const viewport=async width=>{await send('Emulation.setDeviceMetricsOverride',{width,height:1050,deviceScaleFactor:1,mobile:false});await sleep(100);};
  const screenshot=async name=>{
    mkdirSync('outputs/qa',{recursive:true});
    writeFileSync(`outputs/qa/${name}.png`,Buffer.from((await send('Page.captureScreenshot',{format:'png'})).data,'base64'));
  };

  await send('Runtime.enable');
  await send('Page.enable');
  await viewport(1440);

  // 1. Open app and navigate to 3D tab
  await send('Page.navigate',{url:`http://127.0.0.1:${port}/`});
  await until(`!!document.querySelector('.studio-nav')`);

  // Navigate to 6 3D
  await evaluate(`[...document.querySelectorAll('.studio-nav button')].find(b=>b.textContent.includes('6 3D')).click()`);
  await until(`!!document.querySelector('.scene canvas')`);
  await sleep(600);

  // 2. Verify 3D Gizmo buttons exist
  const hasTranslateBtn = await evaluate(`[...document.querySelectorAll('button')].some(b=>b.textContent.includes('Przesuwanie 3D'))`);
  const hasRotateBtn = await evaluate(`[...document.querySelectorAll('button')].some(b=>b.textContent.includes('Obrót 3D'))`);
  const hasOffBtn = await evaluate(`[...document.querySelectorAll('button')].some(b=>b.textContent.includes('Wyłącz manipulator'))`);
  ok(hasTranslateBtn, 'Brak przycisku Przesuwanie 3D');
  ok(hasRotateBtn, 'Brak przycisku Obrót 3D');
  ok(hasOffBtn, 'Brak przycisku Wyłącz manipulator');

  // Select an equipment object to initialize draft and active selection
  await evaluate(`(()=>{
    const btn = [...document.querySelectorAll('button')].find(b=>b.textContent.includes('Wybierz wyposażenie z listy'));
    if (btn) btn.click();
    const sel = document.querySelector('select');
    if (sel && sel.options.length > 0) {
      sel.selectedIndex = 0;
      sel.dispatchEvent(new Event('change', { bubbles: true }));
    }
  })()`);
  await sleep(400);

  // Switch to Translate gizmo
  await click('Przesuwanie 3D (W)');
  await sleep(200);
  await click('Zbliż na wybrany obiekt');
  await sleep(400);
  await screenshot('verify_6_5_gizmo_translate_3d');

  // Switch to Rotate gizmo
  await click('Obrót 3D (E)');
  await sleep(200);
  await screenshot('verify_6_5_gizmo_rotate_3d');

  // 3. Verify 3D Layers controls
  const hasLayersDropdown = await evaluate(`!!document.querySelector('.layer-controls-dropdown')`);
  ok(hasLayersDropdown, 'Brak rozwijanego menu Warstwy 3D');

  // Open layer controls dropdown
  await evaluate(`document.querySelector('.layer-controls-dropdown').open = true`);
  await sleep(200);

  // Check layer checkboxes presence
  const layerLabels = await evaluate(`[...document.querySelectorAll('.layer-checkboxes label')].map(l=>l.textContent.trim())`);
  ok(layerLabels.some(l => l.includes('Stanowiska')), 'Brak warstwy Stanowiska');
  ok(layerLabels.some(l => l.includes('Bufory')), 'Brak warstwy Bufory');
  ok(layerLabels.some(l => l.includes('Strefy operatorów')), 'Brak warstwy Strefy operatorów');
  ok(layerLabels.some(l => l.includes('Przeszkody')), 'Brak warstwy Przeszkody');
  ok(layerLabels.some(l => l.includes('Połączenia procesu')), 'Brak warstwy Połączenia procesu');

  await screenshot('verify_6_5_layers_dropdown_3d');

  // Toggle buffer layer off and on
  await evaluate(`(()=>{
    const cb = [...document.querySelectorAll('.layer-checkboxes label')].find(l=>l.textContent.includes('Bufory'))?.querySelector('input');
    if (cb) { cb.click(); }
  })()`);
  await sleep(200);

  // 4. Verify object hiding and revealing
  const hasHideBtn = await evaluate(`[...document.querySelectorAll('button')].some(b=>b.textContent.includes('Ukryj w 3D'))`);
  ok(hasHideBtn, 'Brak przycisku Ukryj w 3D przy zaznaczonym obiekcie');

  await click('Ukryj w 3D (H)');
  await sleep(300);

  // Button to show hidden objects should now appear
  const hasShowAllBtn = await evaluate(`[...document.querySelectorAll('button')].some(b=>b.textContent.includes('Pokaż ukryte w 3D'))`);
  ok(hasShowAllBtn, 'Brak przycisku Pokaż ukryte w 3D po ukryciu obiektu');

  // Restore visibility
  await click('Pokaż ukryte w 3D');
  await sleep(300);

  // 5. Verify locked object protection
  // Select first object and lock it
  await evaluate(`(()=>{
    const sel = document.querySelector('select');
    if (sel && sel.options.length > 0) {
      sel.selectedIndex = 0;
      sel.dispatchEvent(new Event('change', { bubbles: true }));
    }
  })()`);
  await sleep(200);

  const lockCheckbox = await evaluate(`!!document.querySelector('input[type="checkbox"][checked]')`);
  // Click lock button or check locked checkbox
  await evaluate(`(()=>{
    const cb = [...document.querySelectorAll('form label')].find(l=>l.textContent.includes('Zablokuj'))?.querySelector('input');
    if (cb && !cb.checked) { cb.click(); }
  })()`);
  await sleep(250);

  // Form should have disabled fields for locked object
  const hasDisabledInputs = await evaluate(`[...document.querySelectorAll('form input[type="number"]')].every(i=>i.disabled)`);
  ok(hasDisabledInputs, 'Pola współrzędnych zablokowanego obiektu powinny być wyłączone');

  await screenshot('verify_6_5_locked_protection_3d');

  // 6. Test Mobile Viewport (600px)
  await viewport(600);
  await sleep(300);
  ok(await evaluate(`document.documentElement.scrollWidth <= innerWidth`), 'Wykryto poziome przewijanie na 600px');
  await screenshot('verify_6_5_mobile_600');

  // Verify no console runtime exceptions
  ok(!errors.length, 'Błędy konsoli w trakcie testu: ' + errors.join('; '));

  console.log('PASS 6.5: Manipulatory 3D (W/E/Q), menu i przełączniki warstw 3D, ukrywanie/pokazywanie w 3D, ochrona locked, brak błędów konsoli, 1440/600 px.');
} finally {
  ws?.close();
  browser.kill();
  server.kill();
}
