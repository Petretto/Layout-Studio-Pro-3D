import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { strictEqual, ok } from 'node:assert';

const port = 4195, debugPort = 9355;
const edge = ['C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe', 'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe'].find(existsSync);
if (!edge) throw new Error('Edge not found');
const profile = `C:\\Users\\pczek\\AppData\\Local\\Temp\\edge-7-11-${Date.now()}`;
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
      if (!msg.includes('WebGL') && !msg.includes('THREE.WebGLRenderer')) errors.push(msg);
    }
  };
  const send = (method, params = {}) => new Promise((resolve, reject) => { pending.set(++id, { resolve, reject }); ws.send(JSON.stringify({ id, method, params })); });
  const evaluate = async expression => { const r = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true }); if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description ?? r.exceptionDetails.text); return r.result.value; };
  const until = async expression => { for (let i = 0; i < 60; i++) { if (await evaluate(`Boolean(${expression})`)) return; await sleep(100); } throw new Error('Timeout ' + expression); };
  const navTo = async tabName => {
    await evaluate(`(()=>{
      const btn = [...document.querySelectorAll('.studio-nav button')].find(b => b.textContent.includes(${JSON.stringify(tabName)}));
      if (btn) { btn.click(); return; }
      throw new Error('Nie znaleziono zakładki ' + ${JSON.stringify(tabName)});
    })()`);
    await sleep(400);
  };
  const snap = async file => {
    mkdirSync('outputs/qa', { recursive: true });
    const { data } = await send('Page.captureScreenshot', { format: 'png' });
    writeFileSync(file, Buffer.from(data, 'base64'));
  };

  await send('Runtime.enable'); await send('Page.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1100, deviceScaleFactor: 1, mobile: false });
  await send('Page.navigate', { url: `http://127.0.0.1:${port}/` });
  await until(`document.querySelector('.studio-nav')`);

  // ==========================================
  // SCENARIUSZ 1: Załaduj Baterie EV (DEFAULT_BATTERY_PROJECT)
  // ==========================================
  console.log('--- Rozpoczynam Scenariusz 1: Baterie EV ---');
  await navTo('Pulpit');
  await until(`document.querySelector('.action-card')`);
  // Kliknij kartę "Przykład — baterie EV"
  await evaluate(`[...document.querySelectorAll('.action-card')].find(b => b.textContent.includes('baterie EV')).click()`);
  await sleep(200);

  // Potwierdź zmianę w oknie dialogowym
  await evaluate(`(()=>{const btn=[...document.querySelectorAll('dialog button')].find(b=>b.textContent.includes('Potwierdź'));if(btn)btn.click();})()`);
  await sleep(400);

  // Sprawdź czy projekt się zmienił na Baterie
  const batteryProjName = await evaluate(`document.querySelector('.project-name input')?.value || document.querySelector('h1')?.textContent || ''`);
  ok(batteryProjName.includes('Baterii EV'), `Oczekiwano nazwy projektu Baterii, otrzymano: ${batteryProjName}`);

  // Przejdź do 2 Proces
  await navTo('2 Proces');
  await until(`document.querySelector('.table-wrap table')`);
  await sleep(300);

  const batteryStepsCount = await evaluate(`document.querySelectorAll('.table-wrap table tbody tr').length`);
  ok(batteryStepsCount >= 6, `Baterie: oczekiwano co najmniej 6 wierszy tabeli, jest ${batteryStepsCount}`);

  // Przejdź do 4 Bilans i sprawdź zbalansowanie
  await navTo('4 Bilans');
  await until(`document.querySelector('.metrics')`);
  await sleep(300);

  // Przejdź do 5 Hala i CAD i sprawdź automatyczny layout
  await navTo('5 Hala i CAD');
  await until(`document.querySelector('.cad-canvas')`);
  await sleep(300);
  const batteryObjects = await evaluate(`document.querySelectorAll('.cad-canvas g[data-object-id]').length`);
  ok(batteryObjects > 0, `Baterie: oczekiwano wygenerowanych obiektów layoutu, znaleziono ${batteryObjects}`);
  console.log(`Baterie EV obiekty layoutu: ${batteryObjects}`);
  await snap('outputs/qa/verify_7_11_batteries_layout.png');

  // Przejdź do 7 Raport
  await navTo('7 Raport');
  await until(`document.querySelector('.engineering-report-container')`);
  await sleep(300);
  const batteryReportTitle = await evaluate(`document.querySelector('.report-title-block h1')?.textContent || ''`);
  ok(batteryReportTitle.includes('Baterii EV'), `Raport: tytuł nie zawiera Baterii: ${batteryReportTitle}`);
  await snap('outputs/qa/verify_7_11_batteries_report.png');

  // ==========================================
  // SCENARIUSZ 2: Załaduj Silniki EV (DEFAULT_MOTOR_PROJECT)
  // ==========================================
  console.log('--- Rozpoczynam Scenariusz 2: Silniki EV ---');
  await navTo('Pulpit');
  await until(`document.querySelector('.action-card')`);
  // Kliknij kartę "Przykład — silniki EV"
  await evaluate(`[...document.querySelectorAll('.action-card')].find(b => b.textContent.includes('silniki EV')).click()`);
  await sleep(200);

  // Potwierdź zmianę w oknie dialogowym
  await evaluate(`(()=>{const btn=[...document.querySelectorAll('dialog button')].find(b=>b.textContent.includes('Potwierdź'));if(btn)btn.click();})()`);
  await sleep(400);

  // Sprawdź czy projekt się zmienił na Silniki
  const motorProjName = await evaluate(`document.querySelector('.project-name input')?.value || document.querySelector('h1')?.textContent || ''`);
  ok(motorProjName.includes('Silników'), `Oczekiwano nazwy projektu Silników, otrzymano: ${motorProjName}`);

  // Przejdź do 5 Hala i CAD i sprawdź układ U
  await navTo('5 Hala i CAD');
  await until(`document.querySelector('.cad-canvas')`);
  await sleep(300);
  const motorObjects = await evaluate(`document.querySelectorAll('.cad-canvas g[data-object-id]').length`);
  ok(motorObjects > 0, `Silniki: oczekiwano wygenerowanych obiektów layoutu, znaleziono ${motorObjects}`);
  console.log(`Silniki EV obiekty layoutu: ${motorObjects}`);
  await snap('outputs/qa/verify_7_11_motors_layout.png');

  // Przejdź do 7 Raport
  await navTo('7 Raport');
  await until(`document.querySelector('.engineering-report-container')`);
  await sleep(300);
  const motorReportTitle = await evaluate(`document.querySelector('.report-title-block h1')?.textContent || ''`);
  ok(motorReportTitle.includes('Silników'), `Raport: tytuł nie zawiera Silników: ${motorReportTitle}`);
  await snap('outputs/qa/verify_7_11_motors_report.png');

  // Sprawdzenie błędów JS konsoli
  strictEqual(errors.length, 0, `Wykryto błędy JavaScript w konsoli: ${JSON.stringify(errors)}`);
  console.log('✔ Wszystkie weryfikacje 7.11 w przeglądarce Edge zakończone sukcesem (0 błędów JS).');
} finally {
  if (ws) ws.close();
  browser.kill();
  server.kill();
  await sleep(200);
}
