import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { strictEqual, ok, deepStrictEqual } from 'node:assert';

const port = 4187, debugPort = 9347;
const edge = ['C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe', 'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe'].find(existsSync);
if (!edge) throw new Error('Edge not found');
const profile = `C:\\Users\\pczek\\AppData\\Local\\Temp\\edge-5-7-${Date.now()}`;
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
  const setField = async (labelText, val) => {
    await evaluate(`(() => {
      const label = [...document.querySelectorAll('label.field')].find(l => l.textContent.trim().startsWith(${JSON.stringify(labelText)}));
      const input = label?.querySelector('input');
      if (!input) throw new Error('Brak pola ' + ${JSON.stringify(labelText)});
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
      setter.call(input, String(${JSON.stringify(val)}));
      input.dispatchEvent(new Event('input', { bubbles: true }));
    })()`);
    await sleep(100);
  };
  const saved = () => evaluate(`JSON.parse(localStorage.getItem('layout-studio-v3')).project`);
  const viewport = async width => { await send('Emulation.setDeviceMetricsOverride', { width, height: 1100, deviceScaleFactor: 1, mobile: false }); await sleep(100); };
  const open = async () => { await send('Page.reload'); await until(`!!document.querySelector('.studio-nav')`); await evaluate(`[...document.querySelectorAll('.studio-nav button')].find(b=>b.textContent.includes('5 Hala')).click()`); await until(`!!document.querySelector('.hall-workspace')`); };

  await send('Runtime.enable'); await send('Page.enable'); await viewport(1440);
  await send('Page.navigate', { url: `http://127.0.0.1:${port}/` }); await until(`!!document.querySelector('.studio-nav')`);
  await click('Zapisz lokalnie'); await open();

  // 1. Open 'Parametry hali' drawer and upload an architectural floorplan SVG (1500x1800 px)
  await click('Parametry hali');
  await until(`!![...document.querySelectorAll('label.field')].find(l => l.textContent.includes('Wczytaj podkład'))`);

  const floorplanSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="1500" height="1800" viewBox="0 0 1500 1800">
    <rect x="0" y="0" width="1500" height="1800" fill="#eef4fb" fill-opacity="0.35" stroke="#1e40af" stroke-width="10"/>
    <g stroke="#60a5fa" stroke-width="3" stroke-dasharray="14 10">
      <line x1="250" y1="0" x2="250" y2="1800"/>
      <line x1="650" y1="0" x2="650" y2="1800"/>
      <line x1="1050" y1="0" x2="1050" y2="1800"/>
      <line x1="0" y1="300" x2="1500" y2="300"/>
      <line x1="0" y1="900" x2="1500" y2="900"/>
      <line x1="0" y1="1500" x2="1500" y2="1500"/>
    </g>
    <g fill="#60a5fa" font-family="Arial, sans-serif" font-size="28" font-weight="bold">
      <text x="45" y="55">PODKŁAD ARCHITEKTONICZNY HALI B-2 (1500×1800 px)</text>
      <text x="230" y="1760">OŚ A</text>
      <text x="630" y="1760">OŚ B (400 px = 8000 mm)</text>
      <text x="1030" y="1760">OŚ C</text>
    </g>
    <line x1="250" y1="120" x2="650" y2="120" stroke="#f87171" stroke-width="5"/>
    <circle cx="250" cy="120" r="10" fill="#f87171"/>
    <circle cx="650" cy="120" r="10" fill="#f87171"/>
    <text x="330" y="102" fill="#fca5a5" font-family="Arial, sans-serif" font-size="24" font-weight="bold">BAZA KALIBRACJI: 8000 mm (400 px)</text>
  </svg>`;

  await evaluate(`(() => {
    const label = [...document.querySelectorAll('label.field')].find(l => l.textContent.includes('Wczytaj podkład'));
    const input = label?.querySelector('input[type="file"]');
    if (!input) throw new Error('Brak inputu pliku podkładu');
    const file = new File([${JSON.stringify(floorplanSvg)}], 'podklad_hali_b2.svg', { type: 'image/svg+xml' });
    const dt = new DataTransfer();
    dt.items.add(file);
    input.files = dt.files;
    input.dispatchEvent(new Event('change', { bubbles: true }));
  })()`);

  await until(`!!document.querySelector('.cad-underlay')`);
  await click('Zapisz lokalnie');
  const initialUnderlay = (await saved()).facility.underlay;
  ok(initialUnderlay, 'Expected facility.underlay to be saved after file upload');
  strictEqual(initialUnderlay.name, 'podklad_hali_b2.svg');
  strictEqual(initialUnderlay.imageWidthPx, 1500);
  strictEqual(initialUnderlay.imageHeightPx, 1800);
  ok(initialUnderlay.mmPerPixel > 0, `Expected positive initial mmPerPixel, got ${initialUnderlay.mmPerPixel}`);

  // 2. Verify layer toggle 'Warstwa: Podkład hali' hides and shows the underlay on canvas
  await toggleCheckbox('Warstwa: Podkład hali');
  strictEqual(await evaluate(`document.querySelectorAll('.cad-underlay').length`), 0, 'Expected .cad-underlay to be hidden when layer is unchecked');
  await toggleCheckbox('Warstwa: Podkład hali');
  strictEqual(await evaluate(`document.querySelectorAll('.cad-underlay').length`), 1, 'Expected .cad-underlay to be visible when layer is checked');

  // 3. Set manual scale first to 10 mm/px so we have an exact baseline (15000 x 18000 mm)
  await setField('Skala podkładu [mm/px]', 10);
  await click('Zapisz lokalnie');
  strictEqual((await saved()).facility.underlay.mmPerPixel, 10);
  const dimTextBefore = await evaluate(`document.querySelector('.cad-underlay-dimension')?.textContent ?? ''`);
  ok(dimTextBefore.includes('15000 × 18000 mm') && dimTextBefore.includes('10 mm/px'), `Unexpected underlay label before calibration: ${dimTextBefore}`);

  // 4. Test interactive 2-point scale calibration on the 2D canvas
  await click('Wskaż 2 punkty kalibracji na rzucie');
  await sleep(100);

  // Compute screen coordinates corresponding to (2500, 1200) mm and (6500, 1200) mm on the SVG canvas (4000 mm = 400 px at 10 mm/px)
  await evaluate(`document.querySelector('.cad-canvas').scrollIntoView({block:'center'})`);
  await sleep(80);
  const calibClicks = await evaluate(`(() => {
    const svg = document.querySelector('.cad-canvas');
    const ctm = svg.getScreenCTM();
    const toScreen = (xMm, yMm) => ({
      x: ctm.a * xMm + ctm.c * yMm + ctm.e,
      y: ctm.b * xMm + ctm.d * yMm + ctm.f
    });
    return { p1: toScreen(2500, 1200), p2: toScreen(6500, 1200) };
  })()`);

  await send('Input.dispatchMouseEvent', { type: 'mousePressed', x: calibClicks.p1.x, y: calibClicks.p1.y, button: 'left', clickCount: 1 });
  await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: calibClicks.p1.x, y: calibClicks.p1.y, button: 'left', clickCount: 1 });
  await sleep(100);
  await send('Input.dispatchMouseEvent', { type: 'mousePressed', x: calibClicks.p2.x, y: calibClicks.p2.y, button: 'left', clickCount: 1 });
  await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: calibClicks.p2.x, y: calibClicks.p2.y, button: 'left', clickCount: 1 });
  await sleep(120);

  await until(`!!document.querySelector('.cad-calibration-overlay')`);
  await until(`!!document.querySelector('form[aria-label="Kalibracja skali podkładu"]')`);

  // Enter 8000 mm as the actual distance for the 400 px span -> scale becomes 20 mm/px (30000 x 36000 mm)
  await setField('Rzeczywista odległość A–B [mm]', 8000);

  // Capture 1440px screenshot showing the calibration toolbar and the full 2D canvas with the floorplan underlay and red calibration vector A–B!
  mkdirSync('outputs/qa', { recursive: true });
  await evaluate(`document.querySelector('[aria-label="Zamknij komunikat"]')?.click()`);
  await evaluate(`document.querySelector('[aria-label="Warstwy i pomiary odległości"]').scrollIntoView({block:'start'})`);
  await sleep(120);
  writeFileSync('outputs/qa/verify_5_7_1440.png', Buffer.from((await send('Page.captureScreenshot', { format: 'png' })).data, 'base64'));

  await click('Zastosuj kalibrację skali');
  await click('Zapisz lokalnie');

  const calibratedUnderlay = (await saved()).facility.underlay;
  strictEqual(calibratedUnderlay.mmPerPixel, 20, `Expected calibrated mmPerPixel=20, got ${calibratedUnderlay.mmPerPixel}`);
  strictEqual(calibratedUnderlay.calibratedDistanceMm, 8000);
  strictEqual(calibratedUnderlay.calibratedSpanPx, 400);
  const dimTextAfter = await evaluate(`document.querySelector('.cad-underlay-dimension')?.textContent ?? ''`);
  ok(dimTextAfter.includes('30000 × 36000 mm') && dimTextAfter.includes('20 mm/px'), `Unexpected underlay label after calibration: ${dimTextAfter}`);

  // 5. Test X/Y offset, opacity, and 'Dopasuj wymiary hali do podkładu'
  await click('Parametry hali');
  await setField('Przesunięcie podkładu X [mm]', 500);
  await setField('Przesunięcie podkładu Y [mm]', 300);
  await setField('Przezroczystość podkładu [0.05–1]', 0.6);
  await click('Dopasuj wymiary hali do podkładu');
  await evaluate(`document.querySelector('[aria-label="Zamknij panel"]')?.click()`);
  await click('Zapisz lokalnie');

  const afterFit = await saved();
  strictEqual(afterFit.facility.underlay.xMm, 500);
  strictEqual(afterFit.facility.underlay.yMm, 300);
  strictEqual(afterFit.facility.underlay.opacity, 0.6);
  strictEqual(afterFit.facility.widthMm, 30000);
  strictEqual(afterFit.facility.lengthMm, 36000);

  // 6. Test Undo / Redo, remove underlay + undo, and reload persistence
  await click('Cofnij');
  await click('Zapisz lokalnie');
  strictEqual((await saved()).facility.widthMm, 24000, 'Undo should restore previous hall widthMm=24000');
  await click('Ponów');
  await click('Zapisz lokalnie');
  strictEqual((await saved()).facility.widthMm, 30000, 'Redo should restore fitted hall widthMm=30000');

  await click('Parametry hali');
  await click('Usuń podkład');
  await evaluate(`document.querySelector('[aria-label="Zamknij panel"]')?.click()`);
  await click('Zapisz lokalnie');
  strictEqual((await saved()).facility.underlay, undefined, 'Remove underlay should clear facility.underlay');
  strictEqual(await evaluate(`document.querySelectorAll('.cad-underlay').length`), 0);

  await click('Cofnij');
  await click('Zapisz lokalnie');
  deepStrictEqual((await saved()).facility.underlay, afterFit.facility.underlay, 'Undo after remove should restore underlay');

  await open();
  const afterReload = await saved();
  deepStrictEqual(afterReload.facility.underlay, afterFit.facility.underlay, 'Underlay should persist across reload');
  strictEqual(await evaluate(`document.querySelectorAll('.cad-underlay').length`), 1, 'Underlay should render on canvas after reload');

  // 7. Capture 600px responsive screenshot
  for (const width of [1440, 600]) {
    await viewport(width);
    const noOverflow = await evaluate(`document.documentElement.scrollWidth <= window.innerWidth`);
    ok(noOverflow, `Horizontal overflow at ${width}px`);
    if (width === 600) {
      await evaluate(`document.querySelector('.hall-workspace').scrollIntoView({block:'start'})`);
      await sleep(120);
      writeFileSync('outputs/qa/verify_5_7_600.png', Buffer.from((await send('Page.captureScreenshot', { format: 'png' })).data, 'base64'));
    }
  }

  if (errors.length) throw new Error('Console/page errors: ' + errors.join(' | '));
  console.log(JSON.stringify({
    underlayName: afterReload.facility.underlay.name,
    imageSizePx: [afterReload.facility.underlay.imageWidthPx, afterReload.facility.underlay.imageHeightPx],
    calibratedMmPerPixel: afterReload.facility.underlay.mmPerPixel,
    calibratedDistanceMm: afterReload.facility.underlay.calibratedDistanceMm,
    calibratedSpanPx: afterReload.facility.underlay.calibratedSpanPx,
    fittedFacilityMm: [afterReload.facility.widthMm, afterReload.facility.lengthMm],
    offsetMm: [afterReload.facility.underlay.xMm, afterReload.facility.underlay.yMm],
    opacity: afterReload.facility.underlay.opacity,
    errors
  }, null, 2));
} finally {
  try { ws?.close(); } catch {}
  browser.kill();
  server.kill();
  await sleep(300);
  try { rmSync(profile, { recursive: true, force: true }); } catch {}
}
