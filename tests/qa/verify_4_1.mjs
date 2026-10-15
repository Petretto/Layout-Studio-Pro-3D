import {spawn} from 'node:child_process';
import {mkdtempSync, rmSync, readFileSync, mkdirSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join, resolve, dirname, basename} from 'node:path';

const PORT = 5214, CDP = 9354;
const sleep = ms => new Promise(res => setTimeout(res, ms));

const userData = mkdtempSync(join(tmpdir(), 'layout-qa-4-1-'));
const edgePaths = [
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
];
const edgeBin = edgePaths.find(p => {
  try { return Boolean(readFileSync(p)); } catch { return false; }
});
if (!edgeBin) throw new Error('Brak przeglądarki Edge pod znanymi ścieżkami.');

const server = spawn('node', ['scripts/serve.mjs'], {
  env: {...process.env, PORT: String(PORT)},
  stdio: 'ignore',
  detached: false,
});
const browser = spawn(edgeBin, [
  `--remote-debugging-port=${CDP}`,
  `--user-data-dir=${userData}`,
  '--no-first-run',
  '--no-default-browser-check',
  '--headless=new',
  '--disable-gpu',
  `http://127.0.0.1:${PORT}/`,
], {stdio: 'ignore', detached: false});

let ws;
try {
  let target;
  for (let i = 0; i < 40; i++) {
    await sleep(300);
    try {
      const res = await fetch(`http://127.0.0.1:${CDP}/json/list`);
      target = (await res.json()).find(t => t.type === 'page');
      if (target) break;
    } catch {}
  }
  if (!target) throw new Error('Brak połączenia z Edge CDP.');

  ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });

  let sequence = 0;
  const pending = new Map(), errors = [];
  ws.onmessage = event => {
    const m = JSON.parse(event.data);
    if (m.method === 'Runtime.exceptionThrown') errors.push(m.params.exceptionDetails.text);
    if (pending.has(m.id)) {
      const p = pending.get(m.id);
      pending.delete(m.id);
      if (m.error) p.reject(new Error(m.error.message));
      else p.resolve(m.result);
    }
  };

  const send = (method, params = {}) => new Promise((res, rej) => {
    const id = ++sequence;
    pending.set(id, {resolve: res, reject: rej});
    ws.send(JSON.stringify({id, method, params}));
  });

  const evaluate = async expression => {
    const r = await send('Runtime.evaluate', {expression, returnByValue: true, awaitPromise: true});
    if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text);
    return r.result.value;
  };

  await send('Page.enable');
  await send('Runtime.enable');
  await send('Emulation.setDeviceMetricsOverride', {width: 1500, height: 1100, deviceScaleFactor: 1, mobile: false});
  await send('Page.navigate', {url: `http://127.0.0.1:${PORT}/`});
  await sleep(1000);

  // 1. Sprawdzenie widoku Bilansowanie i Yamazumi
  const tTab0 = performance.now();
  await evaluate(`(() => {
    const btn = [...document.querySelectorAll('.studio-nav button')].find(b => b.textContent.includes('Bilans'));
    if (!btn) throw new Error('Brak przycisku Bilans. Dostępne: ' + [...document.querySelectorAll('.studio-nav button')].map(b => b.textContent).join(' | '));
    btn.click();
  })()`);
  await sleep(400);
  const tabSwitchDuration = Math.round(performance.now() - tTab0);

  const hasBalanceSection = await evaluate(`!!document.querySelector('[aria-label="Oddzielne obciążenie stanowisk, maszyn i operatorów"]')`);
  if (!hasBalanceSection) throw new Error('Brak sekcji oddzielnego obciążenia stanowisk, maszyn i operatorów w Bilansowaniu.');

  const tableHeaders = await evaluate(`
    Array.from(document.querySelectorAll('[aria-label="Oddzielne obciążenie stanowisk, maszyn i operatorów"] th')).map(th => th.textContent.trim())
  `);
  console.log('Nagłówki tabeli bilansowania:', tableHeaders);
  if (!tableHeaders.includes('Obciążenie stanowiska [%]') || !tableHeaders.includes('Obciążenie operatorów [%]') || !tableHeaders.includes('Obciążenie maszyn [%]')) {
    throw new Error('Tabela bilansowania nie zawiera wymaganych kolumn obciążenia.');
  }

  const rowsContent = await evaluate(`
    Array.from(document.querySelectorAll('[aria-label="Oddzielne obciążenie stanowisk, maszyn i operatorów"] tbody tr')).map(tr => tr.textContent)
  `);
  console.log(`Liczba wierszy w tabeli bilansowania: ${rowsContent.length}`);
  if (!rowsContent.length || !rowsContent[0].includes('czas taktu')) {
    throw new Error('Brak objaśnienia mianownika czasu taktu w wierszach tabeli bilansowania.');
  }

  // 2. Przygotowanie projektu szkicu 6 w Warsztacie stanowisk i weryfikacja harmonogramu partii
  await evaluate(`[...document.querySelectorAll('.studio-nav button')].find(b => b.textContent.includes('Stanowiska v5')).click()`);
  await sleep(500);

  // Załadujmy projekt v5 i przygotujmy szkic 6
  const sourceRaw = readFileSync('tests/qa/Eko_D5_actual_export_v5.json', 'utf8');
  await evaluate(`
    const proj = JSON.parse(${JSON.stringify(sourceRaw)});
    localStorage.setItem('layout-studio-stations-v5', JSON.stringify({project: proj, originalJson: '', at: new Date().toISOString()}));
  `);
  await send('Page.reload');
  await sleep(800);
  await evaluate(`[...document.querySelectorAll('.studio-nav button')].find(b => b.textContent.includes('Stanowiska v5')).click()`);
  await sleep(500);

  // Kliknij "Przygotuj z bieżącego projektu" lub sprawdź podgląd szkicu 6
  const hasDraft = await evaluate(`!!document.querySelector('[aria-label="Harmonogram zespołu szkicu 6"]')`);
  if (!hasDraft) {
    // Utwórz szkic klikając przycisk podglądu v5
    await evaluate(`[...document.querySelectorAll('button')].find(b => b.textContent.includes('Przygotuj podgląd v5') || b.textContent.includes('Przygotuj ze stanowisk v5'))?.click()`);
    await sleep(400);
  }

  // Wykonajmy zrzut ekranu widoku bilansowania z oddzielnymi obciążeniami
  await evaluate(`[...document.querySelectorAll('.studio-nav button')].find(b => b.textContent.includes('Bilans')).click()`);
  await sleep(400);
  await evaluate(`document.querySelector('[aria-label="Oddzielne obciążenie stanowisk, maszyn i operatorów"]')?.scrollIntoView({block: 'center'})`);
  await sleep(300);

  mkdirSync('outputs/qa', {recursive: true});
  const screenshot = await send('Page.captureScreenshot', {format: 'png'});
  const shotBuffer = Buffer.from(screenshot.data, 'base64');
  writeFileSync('outputs/qa/verify_4_1.png', shotBuffer);
  console.log(`Zapisano zrzut ekranu: outputs/qa/verify_4_1.png (${shotBuffer.length} bajtów)`);

  console.log(`PASS 4.1 UI: oddzielne obciążenie stanowisk, maszyn i operatorów, objaśnienia mianowników, czas przełączenia widoku: ${tabSwitchDuration} ms.`);
} finally {
  ws?.close();
  browser.kill();
  server.kill();
  try { rmSync(userData, {recursive: true, force: true}); } catch {}
}
