import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { strictEqual, ok } from 'node:assert';

const port = 4188, debugPort = 9348;
const edge = ['C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe', 'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe'].find(existsSync);
if (!edge) throw new Error('Edge not found');
const profile = `C:\\Users\\pczek\\AppData\\Local\\Temp\\edge-5-8-${Date.now()}`;
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
  const setSelect = async (ariaLabel, val) => {
    await evaluate(`(() => {
      const sel = document.querySelector(${JSON.stringify(`select[aria-label="${ariaLabel}"]`)});
      if (!sel) throw new Error('Brak selecta ' + ${JSON.stringify(ariaLabel)});
      sel.value = ${JSON.stringify(val)};
      sel.dispatchEvent(new Event('change', { bubbles: true }));
    })()`);
    await sleep(100);
  };
  const saved = () => evaluate(`JSON.parse(localStorage.getItem('layout-studio-v3')).project`);
  const viewport = async width => { await send('Emulation.setDeviceMetricsOverride', { width, height: 1100, deviceScaleFactor: 1, mobile: false }); await sleep(100); };
  const open = async () => { await send('Page.reload'); await until(`!!document.querySelector('.studio-nav')`); await evaluate(`[...document.querySelectorAll('.studio-nav button')].find(b=>b.textContent.includes('5 Hala')).click()`); await until(`!!document.querySelector('.hall-workspace')`); };

  await send('Runtime.enable'); await send('Page.enable'); await viewport(1440);
  await send('Page.navigate', { url: `http://127.0.0.1:${port}/` }); await until(`!!document.querySelector('.studio-nav')`);
  await click('Zapisz lokalnie'); await open();

  // 1. Open 'Parametry hali' drawer and upload a CAD DXF file with $INSUNITS=0 (unitless), supported geometry & skipped entities
  await click('Parametry hali');
  await until(`!![...document.querySelectorAll('label.field')].find(l => l.textContent.includes('Wczytaj plik CAD (.dxf)'))`);

  const dxfSample = [
    '0', 'SECTION', '2', 'HEADER', '9', '$INSUNITS', '70', '0', '0', 'ENDSEC',
    '0', 'SECTION', '2', 'ENTITIES',
    // Obrys hali 32 x 38 m na warstwie FACILITY
    '0', 'LWPOLYLINE', '8', 'FACILITY', '70', '1',
    '10', '0', '20', '0',
    '10', '32', '20', '0',
    '10', '32', '20', '-38',
    '10', '0', '20', '-38',
    '0', 'TEXT', '8', 'FACILITY', '10', '0', '20', '0', '1', 'Hala B-3 DXF',
    // Przeszkoda 1: LWPOLYLINE (Słup żelbetowy S-1, 1.5 x 1.5 m w punkcie 4, 5 m)
    '0', 'LWPOLYLINE', '8', 'OBSTACLES', '70', '1',
    '10', '4', '20', '-5',
    '10', '5.5', '20', '-5',
    '10', '5.5', '20', '-6.5',
    '10', '4', '20', '-6.5',
    '0', 'TEXT', '8', 'OBSTACLES', '10', '4', '20', '-5', '1', 'Słup żelbetowy S-1',
    // Przeszkoda 2: CIRCLE (Słup okrągły S-2, r=0.6 m -> 1200x1200 mm)
    '0', 'CIRCLE', '8', 'OBSTACLES', '10', '12', '20', '-8', '40', '0.6',
    '0', 'TEXT', '8', 'OBSTACLES', '10', '12', '20', '-8', '1', 'Słup okrągły S-2',
    // Obiekt wizualny na warstwie EQUIPMENT (Bramka KJ DXF, 2 x 1.5 m)
    '0', 'LWPOLYLINE', '8', 'EQUIPMENT', '70', '1',
    '10', '18', '20', '-4',
    '10', '20', '20', '-4',
    '10', '20', '20', '-5.5',
    '10', '18', '20', '-5.5',
    '0', 'TEXT', '8', 'EQUIPMENT', '10', '18', '20', '-4', '1', 'Bramka KJ DXF',
    // Nieobsługiwane encje CAD (raportowane w Raporcie pominiętej geometrii)
    '0', 'INSERT', '8', 'EQUIPMENT', '2', 'ROBOT_ARM_BLK',
    '0', 'INSERT', '8', 'EQUIPMENT', '2', 'AGV_CHARGER_BLK',
    '0', 'SPLINE', '8', 'LOGISTICS',
    '0', 'HATCH', '8', 'OBSTACLES',
    '0', 'DIMENSION', '8', 'DIMS',
    '0', 'ENDSEC', '0', 'EOF'
  ].join('\n');

  await evaluate(`(() => {
    const label = [...document.querySelectorAll('label.field')].find(l => l.textContent.includes('Wczytaj plik CAD (.dxf)'));
    const input = label?.querySelector('input[type="file"]');
    if (!input) throw new Error('Brak inputu pliku DXF');
    const file = new File([${JSON.stringify(dxfSample)}], 'hala_b3_cad.dxf', { type: 'application/dxf' });
    const dt = new DataTransfer();
    dt.items.add(file);
    input.files = dt.files;
    input.dispatchEvent(new Event('change', { bubbles: true }));
  })()`);

  await until(`!!document.querySelector('[aria-label="Raport importu DXF"]')`);

  // 2. Verify unit check blocks apply when $INSUNITS=0 and unitSelection='auto'
  const reportUnconfirmed = await evaluate(`(() => {
    const box = document.querySelector('[aria-label="Raport importu DXF"]');
    const applyBtn = [...box.querySelectorAll('button')].find(b => b.textContent.trim() === 'Zastosuj import DXF');
    return {
      text: box.textContent,
      applyDisabled: applyBtn?.disabled ?? false,
      skippedItems: [...box.querySelectorAll('.dxf-skipped-list li')].map(li => li.textContent)
    };
  })()`);

  strictEqual(reportUnconfirmed.applyDisabled, true, 'Expected Zastosuj import DXF to be disabled when $INSUNITS=0 and unit is unconfirmed');
  ok(reportUnconfirmed.text.includes('Plik DXF nie deklaruje jednoznacznej jednostki miary'), 'Expected unit warning in report');
  strictEqual(reportUnconfirmed.skippedItems.length, 5, `Expected 5 skipped entity groups when interpreted as mm, got ${reportUnconfirmed.skippedItems.length}`);
  ok(reportUnconfirmed.skippedItems.some(s => s.includes('mniejszy niż minimalne 100 × 100 mm')), 'Expected <100x100mm warning when meters file is read as mm');

  // 3. Explicitly select meters ('m') and scope 'full-cad'
  await setSelect('Jednostki pliku DXF', 'm');
  await setSelect('Zakres importu DXF', 'full-cad');

  const reportConfirmed = await evaluate(`(() => {
    const box = document.querySelector('[aria-label="Raport importu DXF"]');
    const applyBtn = [...box.querySelectorAll('button')].find(b => b.textContent.trim() === 'Zastosuj import DXF');
    return {
      text: box.textContent,
      applyDisabled: applyBtn?.disabled ?? true,
      skippedItems: [...box.querySelectorAll('.dxf-skipped-list li')].map(li => li.textContent)
    };
  })()`);

  strictEqual(reportConfirmed.applyDisabled, false, 'Expected Zastosuj import DXF to be enabled after unit confirmation');
  ok(reportConfirmed.text.includes('32000 × 38000 mm (warstwa FACILITY)'), `Expected scaled facility 32000 × 38000 mm in report, got: ${reportConfirmed.text}`);
  ok(reportConfirmed.text.includes('Przeszkody: 2 · Obiekty wizualne: 1'), `Expected 2 obstacles and 1 visual object in report`);
  strictEqual(reportConfirmed.skippedItems.length, 4, `Expected 4 skipped entity groups after selecting meters, got ${reportConfirmed.skippedItems.length}`);
  ok(reportConfirmed.skippedItems.some(s => s.includes('INSERT') && s.includes('×2')), 'Expected INSERT ×2 in skipped report');
  ok(reportConfirmed.skippedItems.some(s => s.includes('SPLINE')), 'Expected SPLINE in skipped report');
  ok(reportConfirmed.skippedItems.some(s => s.includes('HATCH')), 'Expected HATCH in skipped report');
  ok(reportConfirmed.skippedItems.some(s => s.includes('DIMENSION')), 'Expected DIMENSION in skipped report');

  // 4. Check 'Zastąp istniejące przeszkody przy imporcie', apply DXF import, and verify facility dimensions, obstacles, and visual object are applied and persisted
  await evaluate(`(() => {
    const lbl = [...document.querySelectorAll('.hall-drawer label')].find(l => l.textContent.includes('Zastąp istniejące przeszkody przy imporcie'));
    const cb = lbl?.querySelector('input[type="checkbox"]');
    if (!cb) throw new Error('Brak checkboxa Zastąp istniejące przeszkody przy imporcie');
    if (!cb.checked) cb.click();
  })()`);
  await sleep(80);
  await click('Zastosuj import DXF');
  await click('Zapisz lokalnie');

  // Capture 1440px screenshot showing the imported geometry on 2D canvas alongside the DXF import panel and skipped geometry report
  mkdirSync('outputs/qa', { recursive: true });
  await evaluate(`document.querySelector('[aria-label="Zamknij komunikat"]')?.click()`);
  await evaluate(`document.querySelector('[aria-label="Raport importu DXF"]')?.scrollIntoView({block:'center'})`);
  await sleep(120);
  writeFileSync('outputs/qa/verify_5_8_1440.png', Buffer.from((await send('Page.captureScreenshot', { format: 'png' })).data, 'base64'));

  const afterSave = await saved();
  strictEqual(afterSave.facility.widthMm, 32000);
  strictEqual(afterSave.facility.lengthMm, 38000);
  strictEqual(afterSave.obstacles.length, 2);
  strictEqual(afterSave.obstacles[0].name, 'Słup żelbetowy S-1');
  strictEqual(afterSave.obstacles[0].widthMm, 1500);
  strictEqual(afterSave.obstacles[1].name, 'Słup okrągły S-2');
  strictEqual(afterSave.obstacles[1].widthMm, 1200);
  ok(afterSave.layoutObjects.length >= 9, `Expected at least 9 layoutObjects after full-cad import, got ${afterSave.layoutObjects.length}`);
  ok(afterSave.layoutObjects.some(o => o.name === 'Bramka KJ DXF' && o.widthMm === 2000 && o.lengthMm === 1500));

  // Verify Undo / Redo
  await click('Cofnij');
  await click('Zapisz lokalnie');
  strictEqual((await saved()).facility.widthMm, 24000, 'Expected Undo to restore 24000 mm facility width');
  await click('Ponów');
  await click('Zapisz lokalnie');
  strictEqual((await saved()).facility.widthMm, 32000, 'Expected Redo to reapply 32000 mm facility width');

  // Reload and verify persistence
  await open();
  strictEqual((await saved()).facility.widthMm, 32000);
  strictEqual((await saved()).obstacles.length, 2);

  // 5. Verify 600px responsive layout
  await viewport(600);
  await click('Parametry hali');
  await sleep(150);
  writeFileSync('outputs/qa/verify_5_8_600.png', Buffer.from((await send('Page.captureScreenshot', { format: 'png' })).data, 'base64'));

  strictEqual(errors.length, 0, `Console/Runtime errors: ${errors.join('; ')}`);
  console.log(JSON.stringify({
    ok: true,
    facility: `${afterSave.facility.widthMm}x${afterSave.facility.lengthMm}`,
    obstaclesCount: afterSave.obstacles.length,
    skippedGroupsCount: reportUnconfirmed.skippedItems.length,
    errorsCount: errors.length
  }));
} finally {
  try { ws?.close(); } catch {}
  browser.kill();
  server.kill();
  await sleep(300);
  try { rmSync(profile, { recursive: true, force: true }); } catch {}
}
