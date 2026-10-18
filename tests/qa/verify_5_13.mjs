import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { strictEqual, ok } from 'node:assert';

const port = 4193, debugPort = 9353;
const edge = ['C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe', 'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe'].find(existsSync);
if (!edge) throw new Error('Edge not found');
const profile = `C:\\Users\\pczek\\AppData\\Local\\Temp\\edge-5-13-${Date.now()}`;
const sleep = ms => new Promise(r => setTimeout(r, ms));
const server = spawn('node', ['scripts/serve.mjs'], { env: { ...process.env, PORT: String(port) }, stdio: 'ignore', windowsHide: true });
await sleep(400);
const browser = spawn(edge, [`--remote-debugging-port=${debugPort}`, `--user-data-dir=${profile}`, '--headless=new', '--no-first-run', '--disable-gpu', '--window-size=1440,1100', 'about:blank'], { stdio: 'ignore', windowsHide: true });
let ws, id = 0;
try {
  let targets;
  for (let i = 0; i < 30; i++) {
    try { targets = await (await fetch(`http://127.0.0.1:${debugPort}/json/list`)).json(); if (targets?.length) break; } catch {}
    await sleep(200);
  }
  ws = new WebSocket(targets.find(t => t.type === 'page').webSocketDebuggerUrl);
  await new Promise((resolve, reject) => { ws.onopen = resolve; ws.onerror = reject; });
  const pending = new Map(), errors = [];
  ws.onmessage = ({ data }) => {
    const m = JSON.parse(data);
    if (m.id && pending.has(m.id)) { const p = pending.get(m.id); pending.delete(m.id); m.error ? p.reject(new Error(m.error.message)) : p.resolve(m.result); }
    if (m.method === 'Runtime.exceptionThrown') errors.push(m.params.exceptionDetails.text);
    if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') {
      const msg = m.params.args.map(a => a.value ?? a.description).join(' ');
      // ignore webgl or benign shader fallback notices if any
      if (!msg.includes('WebGL') && !msg.includes('THREE.WebGLRenderer')) errors.push(msg);
    }
  };
  const send = (method, params = {}) => new Promise((resolve, reject) => { pending.set(++id, { resolve, reject }); ws.send(JSON.stringify({ id, method, params })); });
  const evaluate = async expression => { const r = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true }); if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description ?? r.exceptionDetails.text); return r.result.value; };
  const until = async expression => { for (let i = 0; i < 60; i++) { if (await evaluate(expression)) return; await sleep(100); } throw new Error('Timeout ' + expression); };
  const click = async text => { await evaluate(`(()=>{const b=[...document.querySelectorAll('button')].find(b=>b.textContent.trim()===${JSON.stringify(text)});if(!b||b.disabled)throw new Error('Brak '+${JSON.stringify(text)});b.click()})()`); await sleep(120); };
  const viewport = async width => { await send('Emulation.setDeviceMetricsOverride', { width, height: 1100, deviceScaleFactor: 1, mobile: false }); await sleep(100); };
  const navTo = async tabName => {
    await evaluate(`[...document.querySelectorAll('.studio-nav button')].find(b=>b.textContent.includes(${JSON.stringify(tabName)})).click()`);
    await sleep(200);
  };
  const snap = async file => {
    mkdirSync('outputs/qa', { recursive: true });
    const { data } = await send('Page.captureScreenshot', { format: 'png' });
    writeFileSync(file, Buffer.from(data, 'base64'));
  };

  await send('Runtime.enable'); await send('Page.enable'); await viewport(1440);
  await send('Page.navigate', { url: `http://127.0.0.1:${port}/` }); await until(`!!document.querySelector('.studio-nav')`);

  // Step 1: Navigate to 5 Hala i CAD on initial load (DEFAULT_MOTOR_PROJECT)
  await navTo('5 Hala');
  await until(`!!document.querySelector('.cad-canvas')`);
  await sleep(300);

  // Check 5.13: Layout proposal automatically generated without clicking any create button
  const objectsCount = await evaluate(`document.querySelectorAll('.cad-canvas g[data-object-id]').length`);
  ok(objectsCount > 0, `Oczekiwano automatycznie wygenerowanego layoutu, znaleziono ${objectsCount} obiektów`);

  // Check 5.13: Visual assumption disclaimer present
  const visualNote = await evaluate(`document.querySelector('.visual-assumption-note')?.textContent || ''`);
  ok(visualNote.includes('Założenie wizualne (5.13)'), 'Brak noty o założeniach wizualnych w edytorze 2D');

  // Check 5.13: Facility unconfirmed note present
  const facilityNote = await evaluate(`document.querySelector('.facility-unconfirmed-note')?.textContent || ''`);
  ok(facilityNote.includes('Wymiary hali (5.13)'), 'Brak noty o niepotwierdzonych wymiarach hali');

  // Check 5.13: BOM reflected in FIFO names
  const fifoTitles = await evaluate(`[...document.querySelectorAll('.cad-canvas g[data-object-id] title')].map(t => t.textContent).filter(t => t.includes('FIFO'))`);
  const fifoNames = await evaluate(`(() => {
    const raw = localStorage.getItem('layout-studio-v3');
    const p = raw ? JSON.parse(raw).project : null;
    return p?.layoutObjects.filter(o => o.id.startsWith('FIFO')).map(o => o.name) || [];
  })()`);
  ok(fifoTitles.some(t => t.includes('MOT-')) || fifoNames.some(n => n.includes('MOT-')), `Brak numerów części BOM w etykietach FIFO: ${JSON.stringify(fifoTitles)} / ${JSON.stringify(fifoNames)}`);

  // Capture desktop 2D screenshot
  await snap('outputs/qa/verify_5_13_desktop_2d.png');
  console.log('✔ Zrzut 2D wykonany');

  // Step 2: Nudge/move an object, verify layoutMode becomes manual and position is protected
  await click('Biblioteka i drzewo');
  await evaluate(`(()=>{
    const b = [...document.querySelectorAll('.hall-tree button')].find(x => x.textContent.includes('Stół roboczy') || x.textContent.includes('WS-1'));
    if(!b) throw new Error('Nie znaleziono stołu roboczego w drzewie wyposażenia');
    b.click();
  })()`);
  await sleep(150);

  // Close panel or blur so keydown goes to canvas
  await evaluate(`document.querySelector('[aria-label="Zamknij panel"]')?.click()`);
  await sleep(100);

  // Read initial coordinates of TBL-WS-1 from DOM/state
  await click('Zapisz lokalnie');
  await sleep(100);
  const initialX = await evaluate(`(() => {
    const raw = localStorage.getItem('layout-studio-v3');
    if(!raw) return null;
    const p = JSON.parse(raw).project;
    return p.layoutObjects.find(o => o.id === 'TBL-WS-1')?.xMm;
  })()`);

  // Nudge via ArrowRight
  const keyEvent = {
    key: 'ArrowRight',
    code: 'ArrowRight',
    ctrlKey: false,
    shiftKey: false,
    altKey: false,
    metaKey: false,
    bubbles: true,
    cancelable: true
  };
  await evaluate(`window.dispatchEvent(new KeyboardEvent('keydown', ${JSON.stringify(keyEvent)}))`);
  await sleep(150);
  await click('Zapisz lokalnie');
  await sleep(100);

  // Check that layoutMode is now manual and x changed
  const newX = await evaluate(`(() => {
    const raw = localStorage.getItem('layout-studio-v3');
    if(!raw) return null;
    const p = JSON.parse(raw).project;
    return { x: p.layoutObjects.find(o => o.id === 'TBL-WS-1')?.xMm, mode: p.layoutMode };
  })()`);
  strictEqual(newX.mode, 'manual', 'layoutMode powinien przejść w manual po przesunięciu');
  ok(newX.x !== initialX, `Pozycja TBL-WS-1 powinna ulec zmianie: było ${initialX}, jest ${newX.x}`);

  // Step 3: Switch to 6 3D i symulacja
  await navTo('6 3D');
  await until(`!!document.querySelector('.scene')`);
  await sleep(500);

  // Check visual assumption note in 3D
  const visualNote3D = await evaluate(`document.querySelector('.visual-assumption-note')?.textContent || ''`);
  ok(visualNote3D.includes('Założenie wizualne (5.13)'), 'Brak noty o założeniach wizualnych w widoku 3D');

  // Open 3D inspector or properties
  await evaluate(`(()=>{
    const btn = [...document.querySelectorAll('button')].find(b => b.textContent.includes('Wybierz wyposażenie z listy'));
    btn?.click();
  })()`);
  await sleep(200);

  // Check badge visual assumption in 3D form
  const badge3D = await evaluate(`document.querySelector('.badge-visual-assumption')?.textContent || ''`);
  ok(badge3D.includes('Założenie wizualne'), 'Brak odznaki założenia wizualnego w formularzu edycji 3D');

  await snap('outputs/qa/verify_5_13_desktop_3d.png');
  console.log('✔ Zrzut 3D wykonany');

  // Step 4: Mobile viewport 600px
  await viewport(600);
  await sleep(300);
  await snap('outputs/qa/verify_5_13_mobile_3d.png');
  console.log('✔ Zrzut 3D mobile wykonany');

  // Step 5: Test independent process - EV Battery project
  await viewport(1440);
  await navTo('Pulpit');
  await sleep(200);

  // Click 'Przykład — baterie EV'
  await evaluate(`(()=>{
    const card = [...document.querySelectorAll('.action-card')].find(c => c.textContent.includes('baterie EV'));
    if(!card) throw new Error('Brak karty baterie EV');
    card.click();
  })()`);
  await sleep(200);

  // Confirm in modal dialog
  await evaluate(`(()=>{
    const dialog = document.querySelector('dialog');
    const confirmBtn = dialog.querySelector('button.primary');
    confirmBtn.click();
  })()`);
  await sleep(300);

  // Go to 5 Hala i CAD and verify proposal is generated automatically
  await navTo('5 Hala');
  await until(`!!document.querySelector('.cad-canvas')`);
  await sleep(300);

  const batteryObjects = await evaluate(`document.querySelectorAll('.cad-canvas g[data-object-id]').length`);
  ok(batteryObjects > 0, `Oczekiwano automatycznie wygenerowanego layoutu dla baterii EV, znaleziono ${batteryObjects}`);

  // Check BOM part numbers for battery (BAT-)
  const batteryFifos = await evaluate(`[...document.querySelectorAll('.cad-canvas g[data-object-id] title')].map(t => t.textContent).filter(t => t.includes('FIFO'))`);
  const batteryNames = await evaluate(`(() => {
    const raw = localStorage.getItem('layout-studio-v3');
    const p = raw ? JSON.parse(raw).project : null;
    return p?.layoutObjects.filter(o => o.id.startsWith('FIFO')).map(o => o.name) || [];
  })()`);
  ok(batteryFifos.some(t => t.includes('CELL-') || t.includes('BUS-') || t.includes('BMS-')), `Brak numerów części BOM baterii w FIFO: ${JSON.stringify(batteryFifos)}`);

  // Step 6: Test in Stanowiska v5
  await navTo('Stanowiska v5');
  await until(`!!document.querySelector('[aria-label="Warsztat stanowisk v5"]')`);
  await sleep(200);

  // Click 'Przygotuj z bieżącego projektu'
  await click('Przygotuj z bieżącego projektu');
  await sleep(300);

  const v5Error = await evaluate(`document.querySelector('.error-banner, .bad, [role="alert"]')?.textContent || ''`);
  ok(!v5Error.includes('layout ma 0 stołów'), `Błąd w modelu v5: ${v5Error}`);
  console.log('✔ Model v5 przygotowany poprawnie z automatyczną propozycją layoutu');

  // Check CDP errors
  if (errors.length) {
    console.warn('Wykryto błędy konsoli:', errors);
  }
  strictEqual(errors.length, 0, `Wykryto ${errors.length} błędów konsoli w trakcie testu CDP`);

  console.log('✔ Wszystkie testy CDP dla 5.13 zakończone sukcesem!');
} finally {
  try { if (ws) ws.close(); } catch {}
  browser.kill();
  server.kill();
  try { rmSync(profile, { recursive: true, force: true }); } catch {}
}
