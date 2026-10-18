import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { strictEqual, ok } from 'node:assert';

const port = 4189, debugPort = 9349;
const edge = ['C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe', 'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe'].find(existsSync);
if (!edge) throw new Error('Edge not found');
const profile = `C:\\Users\\pczek\\AppData\\Local\\Temp\\edge-5-9-${Date.now()}`;
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
  const setNumberField = async (labelPrefix, val) => {
    await evaluate(`(() => {
      const label = [...document.querySelectorAll('label.field')].find(l => l.textContent.trim().startsWith(${JSON.stringify(labelPrefix)}));
      const input = label?.querySelector('input');
      if (!input) throw new Error('Brak pola ' + ${JSON.stringify(labelPrefix)});
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
      setter.call(input, ${JSON.stringify(String(val))});
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
    })()`);
    await sleep(80);
  };
  const viewport = async width => { await send('Emulation.setDeviceMetricsOverride', { width, height: 1100, deviceScaleFactor: 1, mobile: false }); await sleep(100); };
  const open = async () => { await send('Page.reload'); await until(`!!document.querySelector('.studio-nav')`); await evaluate(`[...document.querySelectorAll('.studio-nav button')].find(b=>b.textContent.includes('5 Hala')).click()`); await until(`!!document.querySelector('.hall-workspace')`); };

  await send('Runtime.enable'); await send('Page.enable'); await viewport(1440);
  await send('Page.navigate', { url: `http://127.0.0.1:${port}/` }); await until(`!!document.querySelector('.studio-nav')`);
  await click('Zapisz lokalnie'); await open();

  // 1. Verify initial functional zones on canvas and clean state in Kontrola geometryczna rzutu i stref
  const initialState = await evaluate(`(() => {
    const zoneGroup = document.querySelector('.cad-canvas g.cad-functional-zones[data-layer="functionalZones"]');
    const serviceZones = [...document.querySelectorAll('.cad-canvas g.cad-zone-service')];
    const stagingZones = [...document.querySelectorAll('.cad-canvas g.cad-zone-staging')];
    const commZones = [...document.querySelectorAll('.cad-canvas g.cad-zone-communication')];
    const checkBox = document.querySelector('[aria-label="Kontrola geometryczna rzutu i stref"]');
    return {
      hasZoneGroup: !!zoneGroup,
      serviceCount: serviceZones.length,
      stagingCount: stagingZones.length,
      commCount: commZones.length,
      zoneLabels: [...document.querySelectorAll('.cad-canvas .cad-zone-label')].map(t => t.textContent),
      checkText: checkBox?.textContent ?? '',
      geoWarnObjects: document.querySelectorAll('.cad-canvas g[data-geo-warning="true"]').length
    };
  })()`);

  strictEqual(initialState.hasZoneGroup, true, 'Expected .cad-functional-zones layer on SVG canvas');
  strictEqual(initialState.serviceCount, 2, `Expected 2 service zones, got ${initialState.serviceCount}`);
  strictEqual(initialState.stagingCount, 4, `Expected 4 staging zones, got ${initialState.stagingCount}`);
  strictEqual(initialState.commCount, 1, `Expected 1 communication zone, got ${initialState.commCount}`);
  ok(initialState.zoneLabels.some(l => l.startsWith('Strefa obsługi (WS-1)')), 'Expected Strefa obsługi (WS-1) label');
  ok(initialState.zoneLabels.some(l => l.startsWith('Strefa odkładania (FIFO WS-1)')), 'Expected Strefa odkładania (FIFO WS-1) label');
  ok(initialState.zoneLabels.some(l => l.startsWith('Strefa komunikacji międzyrzędowej')), 'Expected Strefa komunikacji międzyrzędowej label');
  ok(initialState.checkText.includes('0 ostrzeżeń geometrycznych'), 'Expected 0 geometric warnings initially');
  ok(initialState.checkText.includes('NIE stanowi oceny zgodności z przepisami BHP'), 'Expected explicit BHP disclaimer');
  ok(initialState.checkText.includes('nie potwierdza spełnienia wymogów BHP'), 'Expected safe state BHP distinction note');
  strictEqual(initialState.geoWarnObjects, 0, 'Expected 0 objects with data-geo-warning initially');

  // 2. Test toggling Warstwa: Strefy obsługi, odkładania i komunikacji
  await evaluate(`(() => {
    const lbl = [...document.querySelectorAll('[aria-label="Warstwy i pomiary odległości"] label')].find(l => l.textContent.includes('Warstwa: Strefy obsługi, odkładania i komunikacji'));
    const cb = lbl?.querySelector('input[type="checkbox"]');
    if (!cb) throw new Error('Brak przełącznika warstwy stref');
    cb.click();
  })()`);
  await sleep(80);
  strictEqual(await evaluate(`!!document.querySelector('.cad-canvas g.cad-functional-zones')`), false, 'Expected functional zones to hide when layer is unchecked');

  await evaluate(`(() => {
    const lbl = [...document.querySelectorAll('[aria-label="Warstwy i pomiary odległości"] label')].find(l => l.textContent.includes('Warstwa: Strefy obsługi, odkładania i komunikacji'));
    lbl.querySelector('input[type="checkbox"]').click();
  })()`);
  await sleep(80);
  strictEqual(await evaluate(`!!document.querySelector('.cad-canvas g.cad-functional-zones')`), true, 'Expected functional zones to reappear when layer is checked');

  // 3. Trigger geometric warnings: move TBL-WS-1 onto obstacle COL-1 (12000, 10000) and add an obstacle inside the communication corridor
  await click('Biblioteka i drzewo');
  await until(`!!document.querySelector('.hall-tree')`);
  await evaluate(`(() => {
    const btn = [...document.querySelectorAll('.hall-tree button')].find(b => b.textContent.includes('WS-1 ·'));
    if (!btn) throw new Error('Brak przycisku WS-1 w drzewie');
    btn.click();
  })()`);
  await until(`!!document.querySelector('#hall-properties form')`);
  await setNumberField('X [mm]', 11600);
  await setNumberField('Y [mm]', 9900);
  await click('Zapisz obiekt');

  // Add an obstacle inside the communication corridor (around X=11000, Y=15500)
  await click('Dodaj przeszkodę');
  await until(`!!document.querySelector('#hall-properties form')`);
  await setNumberField('X [mm]', 11000);
  await setNumberField('Y [mm]', 15500);
  await click('Zapisz przeszkodę');
  await evaluate(`document.querySelector('[aria-label="Zamknij panel"]')?.click()`);
  await sleep(120);

  // 4. Verify geometric warnings are clearly reported with 'Geometria rzutu (nie BHP)' badges and canvas highlight
  const warnState = await evaluate(`(() => {
    const checkBox = document.querySelector('[aria-label="Kontrola geometryczna rzutu i stref"]');
    const items = [...(checkBox?.querySelectorAll('.geo-warning-list li') ?? [])].map(li => ({
      badge: li.querySelector('.geo-badge')?.textContent?.trim() ?? '',
      text: li.textContent ?? '',
      hasSelectBtn: !!li.querySelector('button')
    }));
    const flaggedIds = [...document.querySelectorAll('.cad-canvas g[data-geo-warning="true"]')].map(g => g.querySelector('text')?.textContent?.trim() ?? '');
    return {
      summary: checkBox?.querySelector('summary')?.textContent ?? '',
      items,
      flaggedCount: flaggedIds.length
    };
  })()`);

  ok(warnState.items.length >= 2, `Expected at least 2 geometric warnings, got ${warnState.items.length}`);
  ok(warnState.items.every(i => i.badge === 'Geometria rzutu (nie BHP)'), 'Expected every warning to have Geometria rzutu (nie BHP) badge');
  ok(warnState.items.every(i => i.text.includes('[Geometria rzutu — nie BHP]')), 'Expected every warning message to include [Geometria rzutu — nie BHP]');
  ok(warnState.items.some(i => i.text.includes('nakładanie obrysu 2D z przeszkodą')), 'Expected obstacle collision warning');
  ok(warnState.items.some(i => i.text.includes('w obrysie strefy znajduje się przeszkoda')), 'Expected zone obstruction warning');
  ok(warnState.flaggedCount >= 1, 'Expected colliding object to be highlighted with data-geo-warning="true" on SVG canvas');

  // Click 'Zaznacz obiekt' on the first warning that has a button
  await evaluate(`(() => {
    const btn = document.querySelector('[aria-label="Kontrola geometryczna rzutu i stref"] .geo-warning-list button');
    if (!btn) throw new Error('Brak przycisku Zaznacz obiekt');
    btn.click();
  })()`);
  await sleep(100);
  const selectedStatus = await evaluate(`document.querySelector('[aria-label="Narzędzia wielokrotnego zaznaczenia"] [role="status"]')?.textContent ?? ''`);
  strictEqual(selectedStatus, 'Zaznaczono: 1', `Expected Zaznaczono: 1 after clicking Zaznacz obiekt, got ${selectedStatus}`);

  // 5. Capture desktop screenshot (1440px) and mobile/narrow screenshot (600px) and check layout overflow
  mkdirSync('outputs/qa', { recursive: true });
  await evaluate(`document.querySelector('[aria-label="Kontrola geometryczna rzutu i stref"]')?.scrollIntoView({ block: 'nearest' })`);
  await sleep(100);
  const shot1440 = await send('Page.captureScreenshot', { format: 'png' });
  writeFileSync('outputs/qa/verify_5_9_1440.png', Buffer.from(shot1440.data, 'base64'));
  const overflow1440 = await evaluate(`document.documentElement.scrollWidth > document.documentElement.clientWidth`);
  strictEqual(overflow1440, false, 'Expected no horizontal overflow at 1440px');

  await viewport(600);
  const shot600 = await send('Page.captureScreenshot', { format: 'png' });
  writeFileSync('outputs/qa/verify_5_9_600.png', Buffer.from(shot600.data, 'base64'));
  const overflow600 = await evaluate(`document.documentElement.scrollWidth > document.documentElement.clientWidth`);
  strictEqual(overflow600, false, 'Expected no horizontal overflow at 600px');
  await viewport(1440);

  // 6. Test Undo / Redo
  await click('Cofnij');
  await click('Cofnij');
  const afterUndoWarnings = await evaluate(`document.querySelectorAll('[aria-label="Kontrola geometryczna rzutu i stref"] .geo-warning-list li').length`);
  strictEqual(afterUndoWarnings, 0, `Expected 0 geometric warnings after 2x Cofnij, got ${afterUndoWarnings}`);

  await click('Ponów');
  await click('Ponów');
  const afterRedoWarnings = await evaluate(`document.querySelectorAll('[aria-label="Kontrola geometryczna rzutu i stref"] .geo-warning-list li').length`);
  ok(afterRedoWarnings >= 2, `Expected warnings to return after 2x Ponów, got ${afterRedoWarnings}`);

  if (errors.length) throw new Error('Console/runtime errors: ' + errors.join(' | '));
  console.log('VERIFY_5_9_PASS', JSON.stringify({
    serviceZones: initialState.serviceCount,
    stagingZones: initialState.stagingCount,
    commZones: initialState.commCount,
    warningsTriggered: warnState.items.length,
    flaggedCanvasObjects: warnState.flaggedCount
  }));
} finally {
  try { ws?.close(); } catch {}
  browser.kill();
  server.kill();
  await sleep(400);
  try { rmSync(profile, { recursive: true, force: true }); } catch {}
}
