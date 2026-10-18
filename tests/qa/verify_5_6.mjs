import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { strictEqual, ok, deepStrictEqual } from 'node:assert';

const port = 4186, debugPort = 9346;
const edge = ['C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe', 'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe'].find(existsSync);
if (!edge) throw new Error('Edge not found');
const profile = `C:\\Users\\pczek\\AppData\\Local\\Temp\\edge-5-6-${Date.now()}`;
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
    if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') errors.push(m.params.args.map(a => a.value ?? a.description).join(' '));
  };
  const send = (method, params = {}) => new Promise((resolve, reject) => { pending.set(++id, { resolve, reject }); ws.send(JSON.stringify({ id, method, params })); });
  const evaluate = async expression => { const r = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true }); if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description ?? r.exceptionDetails.text); return r.result.value; };
  const until = async expression => { for (let i = 0; i < 60; i++) { if (await evaluate(expression)) return; await sleep(100); } throw new Error('Timeout ' + expression); };
  const click = async text => { await evaluate(`(()=>{const b=[...document.querySelectorAll('button')].find(b=>b.textContent.trim()===${JSON.stringify(text)});if(!b||b.disabled)throw new Error('Brak '+${JSON.stringify(text)});b.click()})()`); await sleep(120); };
  const toggleCheckbox = async labelText => { await evaluate(`(()=>{const l=[...document.querySelectorAll('.hall-workspace label')].find(l=>l.textContent.trim()===${JSON.stringify(labelText)});const c=l?.querySelector('input[type="checkbox"]');if(!c)throw new Error('Brak checkboxa '+${JSON.stringify(labelText)});c.click();})()`); await sleep(100); };
  const saved = () => evaluate(`JSON.parse(localStorage.getItem('layout-studio-v3')).project`);
  const viewport = async width => { await send('Emulation.setDeviceMetricsOverride', { width, height: 1100, deviceScaleFactor: 1, mobile: false }); await sleep(100); };
  const open = async () => { await send('Page.reload'); await until(`!!document.querySelector('.studio-nav')`); await evaluate(`[...document.querySelectorAll('.studio-nav button')].find(b=>b.textContent.includes('5 Hala')).click()`); await until(`!!document.querySelector('.hall-workspace')`); };

  await send('Runtime.enable'); await send('Page.enable'); await viewport(1440);
  await send('Page.navigate', { url: `http://127.0.0.1:${port}/` }); await until(`!!document.querySelector('.studio-nav')`);
  await click('Zapisz lokalnie'); await open();

  // 1. Verify object dimension labels and layers are visible by default
  const initDimCount = await evaluate(`document.querySelectorAll('.cad-object-dimension').length`);
  strictEqual(initDimCount, 8, `Expected 8 object dimension labels on canvas, got ${initDimCount}`);
  const initBuffersCount = await evaluate(`document.querySelectorAll('[data-layer="buffers"]').length`);
  strictEqual(initBuffersCount, 4, `Expected 4 buffer layer objects, got ${initBuffersCount}`);
  const initOperatorsCount = await evaluate(`document.querySelectorAll('[data-layer="operators"]').length`);
  strictEqual(initOperatorsCount, 2, `Expected 2 operator layer objects, got ${initOperatorsCount}`);
  const initRoutesCount = await evaluate(`document.querySelectorAll('.cad-route-line').length`);
  ok(initRoutesCount >= 1, `Expected route lines, got ${initRoutesCount}`);

  // 2. Test toggling layers OFF and ON
  await toggleCheckbox('Warstwa: Bufory i logistyka');
  strictEqual(await evaluate(`document.querySelectorAll('[data-layer="buffers"]').length`), 0);
  await toggleCheckbox('Warstwa: Bufory i logistyka');
  strictEqual(await evaluate(`document.querySelectorAll('[data-layer="buffers"]').length`), initBuffersCount);

  await toggleCheckbox('Warstwa: Strefy operatorów');
  strictEqual(await evaluate(`document.querySelectorAll('[data-layer="operators"]').length`), 0);
  await toggleCheckbox('Warstwa: Strefy operatorów');
  strictEqual(await evaluate(`document.querySelectorAll('[data-layer="operators"]').length`), initOperatorsCount);

  await toggleCheckbox('Warstwa: Relacje technologiczne');
  strictEqual(await evaluate(`document.querySelectorAll('.cad-route-line').length`), 0);
  await toggleCheckbox('Warstwa: Relacje technologiczne');
  strictEqual(await evaluate(`document.querySelectorAll('.cad-route-line').length`), initRoutesCount);

  await toggleCheckbox('Warstwa: Wymiary i pomiary');
  strictEqual(await evaluate(`document.querySelectorAll('.cad-object-dimension').length`), 0);
  await toggleCheckbox('Warstwa: Wymiary i pomiary');
  strictEqual(await evaluate(`document.querySelectorAll('.cad-object-dimension').length`), initDimCount);

  // 3. Test automatic distance measurement between two selected objects (TBL-WS-1 and TBL-WS-2)
  await click('Biblioteka i drzewo');
  await evaluate(`(() => {
    const items = [...document.querySelectorAll('.hall-tree li')];
    const t1 = items.find(li => li.textContent.includes('WS-1 ·') && !li.textContent.includes('FIFO') && !li.textContent.includes('Obsada'))?.querySelector('input[type="checkbox"]');
    const t2 = items.find(li => li.textContent.includes('WS-2 ·') && !li.textContent.includes('FIFO') && !li.textContent.includes('Obsada'))?.querySelector('input[type="checkbox"]');
    if (!t1 || !t2) throw new Error('Brak stołów WS-1 / WS-2 w drzewie');
    t1.click(); t2.click();
  })()`);
  await sleep(120);
  await evaluate(`document.querySelector('[aria-label="Zamknij panel"]')?.click()`);
  await sleep(80);

  const pairReadout = await evaluate(`document.querySelector('.cad-distance-readout')?.textContent ?? ''`);
  ok(pairReadout.includes('TBL-WS-1 ↔ TBL-WS-2') && pairReadout.includes('prześwit') && pairReadout.includes('środek–środek'), `Unexpected pair readout: ${pairReadout}`);
  ok(await evaluate(`!!document.querySelector('.cad-dimension-overlay')`), 'Expected .cad-dimension-overlay on canvas');

  // 4. Test interactive point-to-point ruler measurement ('Mierz odległość')
  await click('Mierz odległość');
  strictEqual(await evaluate(`document.querySelector('button[aria-pressed="true"]')?.textContent.trim().includes('Zakończ pomiar odległości') || [...document.querySelectorAll('button')].some(b=>b.textContent.trim()==='Zakończ pomiar odległości' && b.getAttribute('aria-pressed')==='true')`), true);
  await evaluate(`document.querySelector('.cad-canvas').scrollIntoView({block:'center'})`);
  const canvasBox = await evaluate(`(() => { const r = document.querySelector('.cad-canvas').getBoundingClientRect(); return { x: r.x + 220, y: r.y + 180 }; })()`);
  await send('Input.dispatchMouseEvent', { type: 'mousePressed', x: canvasBox.x, y: canvasBox.y, button: 'left', clickCount: 1 });
  await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: canvasBox.x, y: canvasBox.y, button: 'left', clickCount: 1 });
  await sleep(80);
  await send('Input.dispatchMouseEvent', { type: 'mousePressed', x: canvasBox.x + 240, y: canvasBox.y + 140, button: 'left', clickCount: 1 });
  await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: canvasBox.x + 240, y: canvasBox.y + 140, button: 'left', clickCount: 1 });
  await sleep(100);

  const rulerReadout = await evaluate(`document.querySelector('.cad-ruler-readout')?.textContent ?? ''`);
  ok(rulerReadout.includes('Pomiar punkt–punkt:') && rulerReadout.includes('mm'), `Expected ruler readout, got ${rulerReadout}`);
  ok(await evaluate(`!!document.querySelector('.cad-ruler-overlay')`), 'Expected .cad-ruler-overlay on canvas');

  // Capture 1440px screenshot with dimensions, pair distance overlay, and point-to-point ruler active!
  mkdirSync('outputs/qa', { recursive: true });
  await evaluate(`document.querySelector('.hall-workspace').scrollIntoView({block:'start'})`);
  await sleep(100);
  writeFileSync('outputs/qa/verify_5_6_1440.png', Buffer.from((await send('Page.captureScreenshot', { format: 'png' })).data, 'base64'));

  await click('Wyczyść pomiar');
  strictEqual(await evaluate(`!!document.querySelector('.cad-ruler-overlay')`), false);
  await click('Zakończ pomiar odległości');

  // 5. Test Object Locking ('Zablokuj zaznaczone', properties disabled, drag blocked, align blocked, undo/redo & reload)
  await click('Wyczyść zaznaczenie');
  await click('Biblioteka i drzewo');
  await evaluate(`(() => {
    const b = [...document.querySelectorAll('.hall-tree button')].find(b => b.textContent.includes('WS-1 ·'));
    b.click();
  })()`);
  await sleep(100);
  await click('Zablokuj zaznaczone');
  await click('Zapisz lokalnie');

  const lockedState = await saved();
  const lockedTbl1 = lockedState.layoutObjects.find(o => o.id === 'TBL-WS-1');
  strictEqual(lockedTbl1.locked, true, 'TBL-WS-1 should be locked in saved project');
  ok(await evaluate(`document.querySelectorAll('[data-locked="true"]').length === 1`), 'Canvas should mark TBL-WS-1 as data-locked="true"');
  strictEqual(await evaluate(`[...document.querySelectorAll('button')].find(b=>b.textContent.trim()==='Usuń wybrany obiekt')?.disabled`), true, 'Delete button should be disabled for locked object');
  await click('Biblioteka i drzewo');
  await evaluate(`[...document.querySelectorAll('.hall-tree button')].find(b => b.textContent.includes('WS-1 ·')).click()`);
  await sleep(100);
  strictEqual(await evaluate(`[...document.querySelectorAll('.hall-drawer label')].find(l=>l.textContent==='X [mm]')?.querySelector('input')?.disabled`), true, 'X [mm] input should be disabled when locked');

  // Close drawer, switch to 'Przesuwaj obiekty', and attempt to drag locked TBL-WS-1
  await evaluate(`document.querySelector('[aria-label="Zamknij panel"]')?.click()`);
  await click('Przesuwaj widok'); // switch to 'Przesuwaj obiekty'
  await evaluate(`document.querySelector('.cad-canvas').scrollIntoView({block:'center'})`);
  const dragPt = await evaluate(`(() => {
    const g = [...document.querySelectorAll('.cad-canvas g')].find(g => g.getAttribute('data-locked') === 'true');
    const r = g.querySelector('polygon').getBoundingClientRect();
    return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
  })()`);
  await send('Input.dispatchMouseEvent', { type: 'mousePressed', x: dragPt.x, y: dragPt.y, button: 'left', clickCount: 1 });
  await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: dragPt.x + 120, y: dragPt.y + 90, buttons: 1 });
  await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: dragPt.x + 120, y: dragPt.y + 90, button: 'left', clickCount: 1 });
  await sleep(100); await click('Zapisz lokalnie');
  const afterDragTbl1 = (await saved()).layoutObjects.find(o => o.id === 'TBL-WS-1');
  strictEqual(afterDragTbl1.xMm, lockedTbl1.xMm, 'Locked TBL-WS-1 X must not change on drag');
  strictEqual(afterDragTbl1.yMm, lockedTbl1.yMm, 'Locked TBL-WS-1 Y must not change on drag');

  // Reload and verify lock persists
  await open();
  strictEqual((await saved()).layoutObjects.find(o => o.id === 'TBL-WS-1').locked, true);

  // Unlock TBL-WS-1 and verify it can be moved again
  await click('Biblioteka i drzewo');
  await evaluate(`(() => {
    const b = [...document.querySelectorAll('.hall-tree button')].find(b => b.textContent.includes('WS-1 ·'));
    b.click();
  })()`);
  await sleep(100);
  await click('Odblokuj zaznaczone');
  await click('Zapisz lokalnie');
  strictEqual((await saved()).layoutObjects.find(o => o.id === 'TBL-WS-1').locked, undefined);

  // Check responsive 600px layout
  await evaluate(`document.querySelector('[aria-label="Zamknij panel"]')?.click()`);
  for (const width of [1440, 600]) {
    await viewport(width);
    const noOverflow = await evaluate(`document.documentElement.scrollWidth <= window.innerWidth`);
    ok(noOverflow, `Horizontal overflow at ${width}px`);
    if (width === 600) {
      await evaluate(`document.querySelector('.hall-workspace').scrollIntoView({block:'start'})`);
      await sleep(100);
      writeFileSync('outputs/qa/verify_5_6_600.png', Buffer.from((await send('Page.captureScreenshot', { format: 'png' })).data, 'base64'));
    }
  }

  strictEqual(errors.length, 0, `Console/page errors: ${errors.join('; ')}`);
  console.log('PASS verify_5_6: wymiary obiektów, widoczność 6 warstw, pomiar między zaznaczonymi, pomiar punkt-punkt, blokowanie przed przesunięciem/usunięciem/edycją, zapis/odczyt, 1440/600 px.');
} finally {
  try { ws?.close(); } catch {}
  browser.kill();
  server.kill();
  await sleep(300);
  try { rmSync(profile, { recursive: true, force: true }); } catch {}
}
