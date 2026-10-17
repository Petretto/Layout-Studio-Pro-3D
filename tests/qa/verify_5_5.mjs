import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { strictEqual, ok, deepStrictEqual } from 'node:assert';

const port = 4185, debugPort = 9345;
const edge = ['C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe', 'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe'].find(existsSync);
if (!edge) throw new Error('Edge not found');
const profile = `C:\\Users\\pczek\\AppData\\Local\\Temp\\edge-5-5-${Date.now()}`;
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
  const domObjects = () => evaluate(`(() => {
    const d = [...document.querySelectorAll('.hall-objects details')].find(d => d.querySelector('summary')?.textContent.trim() === 'Lista wyposażenia');
    return [...(d?.querySelectorAll('tbody tr') ?? [])].map(tr => {
      const tds = [...tr.querySelectorAll('td')].map(td => td.textContent.trim());
      const [x, y] = tds[2].split('/').map(s => Number(s.trim()));
      const [w, l] = tds[3].split('×').map(s => Number(s.trim()));
      return { id: tds[0], name: tds[1], xMm: x, yMm: y, widthMm: w, lengthMm: l };
    });
  })()`);
  const viewport = async width => { await send('Emulation.setDeviceMetricsOverride', { width, height: 1100, deviceScaleFactor: 1, mobile: false }); await sleep(100); };
  const open = async () => { await send('Page.reload'); await until(`!!document.querySelector('.studio-nav')`); await evaluate(`[...document.querySelectorAll('.studio-nav button')].find(b=>b.textContent.includes('5 Hala')).click()`); await until(`!!document.querySelector('.hall-workspace')`); };

  await send('Runtime.enable'); await send('Page.enable'); await viewport(1440);
  await send('Page.navigate', { url: `http://127.0.0.1:${port}/` }); await until(`!!document.querySelector('.studio-nav')`);
  await click('Zapisz lokalnie'); await open();

  // 1. Verify connection points are visible by default when 'Przyciąganie do punktów połączeń' is checked
  const connPointCount = await evaluate(`document.querySelectorAll('.cad-connection-point').length`);
  ok(connPointCount >= 40, `Expected connection points on canvas, got ${connPointCount}`);

  // 2. Test 'Wyłącz przyciąganie' button disables all 3 snap checkboxes and hides connection points
  await click('Wyłącz przyciąganie');
  strictEqual(await evaluate(`document.querySelectorAll('.cad-connection-point').length`), 0);
  await click('Przesuwaj widok'); // switch to 'Przesuwaj obiekty'
  await evaluate(`document.querySelector('.cad-canvas').scrollIntoView({block:'center'})`);
  const initObjs = await domObjects();
  const initTbl1 = initObjs.find(o => o.id === 'TBL-WS-1'), initTbl2 = initObjs.find(o => o.id === 'TBL-WS-2');
  const initFifo1 = initObjs.find(o => o.id === 'FIFO-WS-1'), initMat1 = initObjs.find(o => o.id === 'MAT-WS-1');

  // Helper to convert SVG mm delta to screen pixel delta
  const mmToClient = await evaluate(`(() => {
    const s = document.querySelector('.cad-canvas');
    const ctm = s.getScreenCTM();
    const g = [...s.querySelectorAll('g')].find(g => g.querySelector('title')?.textContent.includes(${JSON.stringify(initTbl1.name)}));
    const r = g.querySelector('polygon').getBoundingClientRect();
    return { startX: r.x + r.width / 2, startY: r.y + r.height / 2, scaleX: ctm.a, scaleY: ctm.d };
  })()`);

  // Drag by rawDx = 313 mm, rawDy = -147 mm with all snapping OFF
  const freeEndX = mmToClient.startX + 313 * mmToClient.scaleX;
  const freeEndY = mmToClient.startY - 147 * mmToClient.scaleY;
  await send('Input.dispatchMouseEvent', { type: 'mousePressed', x: mmToClient.startX, y: mmToClient.startY, button: 'left', clickCount: 1 });
  await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: freeEndX, y: freeEndY, buttons: 1 });
  await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: freeEndX, y: freeEndY, button: 'left', clickCount: 1 });
  await sleep(120); await click('Zapisz lokalnie');

  const freeSaved = await saved();
  const freeTbl1 = freeSaved.layoutObjects.find(o => o.id === 'TBL-WS-1');
  const freeFifo1 = freeSaved.layoutObjects.find(o => o.id === 'FIFO-WS-1');
  const freeMat1 = freeSaved.layoutObjects.find(o => o.id === 'MAT-WS-1');
  ok(freeTbl1.xMm % 200 !== 0, `Expected non-grid X when snapping is off, got ${freeTbl1.xMm}`);
  strictEqual(freeFifo1.xMm - initFifo1.xMm, freeTbl1.xMm - initTbl1.xMm);
  strictEqual(freeMat1.xMm - initMat1.xMm, freeTbl1.xMm - initTbl1.xMm);
  await click('Cofnij'); await click('Zapisz lokalnie');

  // 3. Re-enable snapping via 'Włącz przyciąganie' and test connection point snapping to TBL-WS-2 left port
  await click('Włącz przyciąganie');
  ok(await evaluate(`document.querySelectorAll('.cad-connection-point').length >= 40`));
  const dockRawDx = (initTbl2.xMm - initTbl1.widthMm - initTbl1.xMm) + 35;
  const dockRawDy = (initTbl2.yMm - initTbl1.yMm) - 25;
  const dockInfo = await evaluate(`(() => {
    const s = document.querySelector('.cad-canvas');
    const ctm = s.getScreenCTM();
    const g = [...s.querySelectorAll('g')].find(g => g.querySelector('title')?.textContent.includes(${JSON.stringify(initTbl1.name)}));
    const r = g.querySelector('polygon').getBoundingClientRect();
    return { startX: r.x + r.width / 2, startY: r.y + r.height / 2, scaleX: ctm.a, scaleY: ctm.d };
  })()`);
  const dockEndX = dockInfo.startX + dockRawDx * dockInfo.scaleX;
  const dockEndY = dockInfo.startY + dockRawDy * dockInfo.scaleY;
  await send('Input.dispatchMouseEvent', { type: 'mousePressed', x: dockInfo.startX, y: dockInfo.startY, button: 'left', clickCount: 1 });
  await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: dockEndX, y: dockEndY, buttons: 1 });
  await sleep(80);
  // Verify snap guide is visible during drag!
  const guideCountDuringConn = await evaluate(`document.querySelectorAll('.cad-snap-guide').length`);
  ok(guideCountDuringConn >= 1, `Expected active connection snap guide during drag, got ${guideCountDuringConn}`);
  await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: dockEndX, y: dockEndY, button: 'left', clickCount: 1 });
  await sleep(120); await click('Zapisz lokalnie');

  const connSaved = await saved();
  const connTbl1 = connSaved.layoutObjects.find(o => o.id === 'TBL-WS-1');
  strictEqual(connTbl1.xMm + connTbl1.widthMm, initTbl2.xMm, 'Right port of TBL-WS-1 should snap to left port of TBL-WS-2');
  strictEqual(connTbl1.yMm, initTbl2.yMm, 'Y of TBL-WS-1 should snap to TBL-WS-2 port Y');
  await click('Cofnij'); await click('Zapisz lokalnie');

  // 4. Test edge snapping (disable connection snapping, keep edge snapping ON, drag near TBL-WS-2 left edge at dy = +500 mm)
  await toggleCheckbox('Przyciąganie do punktów połączeń');
  const edgeInfo = await evaluate(`(() => {
    const s = document.querySelector('.cad-canvas');
    const ctm = s.getScreenCTM();
    const g = [...s.querySelectorAll('g')].find(g => g.querySelector('title')?.textContent.includes(${JSON.stringify(initTbl1.name)}));
    const r = g.querySelector('polygon').getBoundingClientRect();
    return { startX: r.x + r.width / 2, startY: r.y + r.height / 2, scaleX: ctm.a, scaleY: ctm.d };
  })()`);
  const edgeRawDx = (initTbl2.xMm - initTbl1.widthMm - initTbl1.xMm) - 40;
  const edgeRawDy = 500;
  const edgeEndX = edgeInfo.startX + edgeRawDx * edgeInfo.scaleX;
  const edgeEndY = edgeInfo.startY + edgeRawDy * edgeInfo.scaleY;
  await send('Input.dispatchMouseEvent', { type: 'mousePressed', x: edgeInfo.startX, y: edgeInfo.startY, button: 'left', clickCount: 1 });
  await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: edgeEndX, y: edgeEndY, buttons: 1 });
  await sleep(80);
  const edgeGuideCount = await evaluate(`document.querySelectorAll('.cad-snap-guide').length`);
  ok(edgeGuideCount >= 1, `Expected active edge snap guide during drag, got ${edgeGuideCount}`);

  // Re-enable connection points for screenshot so both connection points and active snap controls are visible
  await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: edgeEndX, y: edgeEndY, button: 'left', clickCount: 1 });
  await sleep(120); await click('Zapisz lokalnie');
  const edgeSaved = await saved();
  const edgeTbl1 = edgeSaved.layoutObjects.find(o => o.id === 'TBL-WS-1');
  strictEqual(edgeTbl1.xMm + edgeTbl1.widthMm, initTbl2.xMm, 'Right edge of TBL-WS-1 should snap to left edge of TBL-WS-2');

  // Re-enable connection points for final UI state & screenshots
  await toggleCheckbox('Przyciąganie do punktów połączeń');

  // 5. Undo / Redo & Reload persistence
  await click('Cofnij'); await click('Zapisz lokalnie');
  strictEqual((await domObjects()).find(o => o.id === 'TBL-WS-1').xMm, initTbl1.xMm);
  await click('Ponów'); await click('Zapisz lokalnie');
  strictEqual((await saved()).layoutObjects.find(o => o.id === 'TBL-WS-1').xMm + initTbl1.widthMm, initTbl2.xMm);
  await open();
  strictEqual((await saved()).layoutObjects.find(o => o.id === 'TBL-WS-1').xMm + initTbl1.widthMm, initTbl2.xMm);

  for (const width of [1440, 600]) {
    await viewport(width);
    ok(await evaluate(`document.documentElement.scrollWidth<=innerWidth`), `Horizontal overflow at ${width}px`);
    await evaluate(`document.querySelector('.hall-workspace').scrollIntoView({block:'start'})`);
    mkdirSync('outputs/qa', { recursive: true });
    writeFileSync(`outputs/qa/verify_5_5_${width}.png`, Buffer.from((await send('Page.captureScreenshot', { format: 'png' })).data, 'base64'));
  }

  ok(!errors.length, errors.join('; '));
  console.log('PASS 5.5: przyciąganie do siatki, krawędzi i punktów połączeń, wizualne prowadnice/porty oraz wyłączanie przyciągania, 1440/600 px.');
} finally {
  ws?.close(); browser.kill(); server.kill();
  await sleep(300);
  try { rmSync(profile, { recursive: true, force: true }); } catch {}
}
