import {spawn} from 'node:child_process';
import {existsSync, mkdtempSync, mkdirSync, writeFileSync, readFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {ok} from 'node:assert';

const port = 5280, cdp = 9380, sleep = ms => new Promise(r => setTimeout(r, ms));
const edge = [
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe'
].find(existsSync);
if (!edge) throw new Error('Brak Edge');

mkdirSync('outputs/qa', {recursive: true});

console.log('================================================================');
console.log('Layout Studio Pro 3D — Weryfikacja Raportu PDF (Plan 7.10)');
console.log('================================================================\n');

const server = spawn('node', ['scripts/serve.mjs'], {
  env: {...process.env, PORT: String(port)},
  stdio: 'ignore',
  windowsHide: true
});

const browser = spawn(edge, [
  `--remote-debugging-port=${cdp}`,
  `--user-data-dir=${mkdtempSync(join(tmpdir(), 'layout-qa-7-10-'))}`,
  '--headless=new',
  '--no-first-run',
  '--disable-gpu',
  'about:blank'
], {stdio: 'ignore', windowsHide: true});

let ws;

try {
  let target;
  for (let i = 0; i < 40; i++) {
    try {
      target = (await (await fetch(`http://127.0.0.1:${cdp}/json/list`, {signal: AbortSignal.timeout(1000)})).json()).find(t => t.type === 'page');
      if (target) break;
    } catch {}
    await sleep(200);
  }
  if (!target) throw new Error('Brak CDP po 8 sekundach');

  ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => { ws.onopen = resolve; ws.onerror = reject; });

  let id = 0; const pending = new Map(), errors = [];
  ws.onmessage = e => {
    const m = JSON.parse(e.data);
    if (m.method === 'Runtime.exceptionThrown') errors.push(m.params.exceptionDetails.text);
    if (pending.has(m.id)) {
      const p = pending.get(m.id);
      pending.delete(m.id);
      m.error ? p.reject(new Error(m.error.message)) : p.resolve(m.result);
    }
  };

  const send = (method, params = {}) => new Promise((resolve, reject) => {
    const next = ++id;
    const timer = setTimeout(() => { pending.delete(next); reject(new Error('Timeout ' + method)); }, 15000);
    pending.set(next, { resolve: r => { clearTimeout(timer); resolve(r); }, reject: e => { clearTimeout(timer); reject(e); } });
    ws.send(JSON.stringify({id: next, method, params}));
  });

  const evaluate = async expression => {
    const r = await send('Runtime.evaluate', {expression, returnByValue: true, awaitPromise: true}).catch(error => {
      throw new Error(expression.slice(0, 220) + ': ' + error.message);
    });
    if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description ?? r.exceptionDetails.text);
    return r.result.value;
  };

  const until = async expression => {
    const start = Date.now();
    while (Date.now() - start < 15000) {
      try {
        const v = await evaluate(`Boolean(${expression})`);
        if (v) return true;
      } catch {}
      await sleep(100);
    }
    throw new Error('Timeout: ' + expression);
  };

  await send('Page.enable');
  await send('Runtime.enable');
  await send('Emulation.setDeviceMetricsOverride', {width: 1440, height: 900, deviceScaleFactor: 1, mobile: false});

  // =========================================================================
  // TEST 1: KRÓTKI PROJEKT (Motor EV — 6 operacji, 5 pozycji BOM)
  // =========================================================================
  console.log('1. Weryfikacja raportu inżynierskiego dla krótkiego projektu (Motor EV):');
  await send('Page.navigate', {url: `http://127.0.0.1:${port}`});
  await until(`document.querySelector('.studio')`);

  // Przejście do zakładki raportu
  await evaluate(`[...document.querySelectorAll('.studio-nav button')].find(b => b.textContent.includes('Raport'))?.click()`);
  await until(`document.querySelector('.engineering-report-document')`);

  // Sprawdzenie kafelków KPI i elementów raportu
  const shortTitle = await evaluate(`document.querySelector('.report-title-block h1')?.textContent`);
  console.log(`   - Tytuł projektu: "${shortTitle}"`);
  ok(shortTitle?.includes('Silników'), 'Tytuł projektu powinien zawierać "Silników"');

  const kpis = await evaluate(`[...document.querySelectorAll('.report-kpi-card')].map(c => ({
    label: c.querySelector('.report-kpi-label')?.textContent,
    value: c.querySelector('.report-kpi-value')?.textContent
  }))`);
  console.log(`   - Wykryto kafelków KPI: ${kpis.length}`);
  for (const k of kpis) {
    console.log(`     * ${k.label}: ${k.value}`);
  }
  ok(kpis.length >= 6, 'Powinno być co najmniej 6 kafelków KPI');
  ok(kpis.find(k=>k.label==='Zdolność Produkcyjna')?.value.trim()==='28.3 szt./h','Nominal capacity must be 3600/127, not demand');
  ok(kpis.find(k=>k.label==='Wymagane tempo')?.value.trim()==='22.2 szt./h','Demand target must remain separate');

  const shortStepsCount = await evaluate(`document.querySelectorAll('.report-section:nth-of-type(4) tbody tr').length`);
  const shortBomCount = await evaluate(`document.querySelectorAll('.report-section:nth-of-type(5) tbody tr').length - 1`); // bez wiersza podsumowania
  console.log(`   - Wykryto w tabelach: ${shortStepsCount} operacji, ${shortBomCount} pozycji BOM.`);
  ok(shortStepsCount === 6, 'Powinno być dokładnie 6 operacji w Motor EV');
  ok(shortBomCount === 5, 'Powinno być 5 pozycji BOM w Motor EV');

  // Screenshot ekranowy raportu
  const shortShot = await send('Page.captureScreenshot', {format: 'png', captureBeyondViewport: false});
  writeFileSync('outputs/qa/report_7_10_short.png', Buffer.from(shortShot.data, 'base64'));
  console.log('   - Zrzut ekranu zapisany: outputs/qa/report_7_10_short.png');

  // Generowanie PDF (Page.printToPDF)
  console.log('   - Drukowanie do PDF przez Page.printToPDF (A4 portrait)...');
  const shortPdf = await send('Page.printToPDF', {
    paperWidth: 8.27,
    paperHeight: 11.69,
    marginTop: 0.4,
    marginBottom: 0.4,
    marginLeft: 0.4,
    marginRight: 0.4,
    printBackground: true,
    preferCSSPageSize: true
  });
  const shortPdfBuffer = Buffer.from(shortPdf.data, 'base64');
  writeFileSync('outputs/qa/report_7_10_short.pdf', shortPdfBuffer);
  console.log(`   [PASS] PDF krótkiego projektu wygenerowany: outputs/qa/report_7_10_short.pdf (${shortPdfBuffer.length} bajtów).`);
  ok(shortPdfBuffer.length > 25000, 'PDF krótkiego projektu powinien mieć > 25 KB');

  // =========================================================================
  // TEST 2: DŁUGI PROJEKT (Eko — 16 operacji, 60 pozycji BOM)
  // =========================================================================
  console.log('\n2. Weryfikacja raportu inżynierskiego dla długiego projektu (Eko):');
  const ekoJsonPath = 'tests/qa/Eko_D5c_original_v4.json';
  const ekoRaw = readFileSync(ekoJsonPath, 'utf8');
  const ekoPayload = JSON.stringify({ project: JSON.parse(ekoRaw), at: new Date().toISOString() });
  await evaluate(`localStorage.setItem('layout-studio-v3', ${JSON.stringify(ekoPayload)})`);
  await send('Page.reload');
  await until(`document.querySelector('.studio')`);

  // Przejście do zakładki raportu
  await evaluate(`[...document.querySelectorAll('.studio-nav button')].find(b => b.textContent.includes('Raport'))?.click()`);
  await until(`document.querySelector('.engineering-report-document')`);

  const longTitle = await evaluate(`document.querySelector('.report-title-block h1')?.textContent`);
  console.log(`   - Tytuł projektu: "${longTitle}"`);
  ok(longTitle?.includes('Eko'), 'Tytuł projektu powinien zawierać "Eko"');

  const longStepsCount = await evaluate(`document.querySelectorAll('.report-section:nth-of-type(4) tbody tr').length`);
  const longBomCount = await evaluate(`document.querySelectorAll('.report-section:nth-of-type(5) tbody tr').length - 1`);
  console.log(`   - Wykryto w tabelach: ${longStepsCount} operacji, ${longBomCount} pozycji BOM.`);
  ok(longStepsCount === 16, 'Powinno być 16 operacji w projekcie Eko');
  ok(longBomCount === 60, 'Powinno być 60 pozycji BOM w projekcie Eko');

  // Screenshot ekranowy długiego raportu
  const longShot = await send('Page.captureScreenshot', {format: 'png', captureBeyondViewport: false});
  writeFileSync('outputs/qa/report_7_10_long.png', Buffer.from(longShot.data, 'base64'));
  console.log('   - Zrzut ekranu zapisany: outputs/qa/report_7_10_long.png');

  // Generowanie PDF dla długiego projektu
  console.log('   - Drukowanie wielostronicowego PDF przez Page.printToPDF (A4 portrait)...');
  const longPdf = await send('Page.printToPDF', {
    paperWidth: 8.27,
    paperHeight: 11.69,
    marginTop: 0.4,
    marginBottom: 0.4,
    marginLeft: 0.4,
    marginRight: 0.4,
    printBackground: true,
    preferCSSPageSize: true
  });
  const longPdfBuffer = Buffer.from(longPdf.data, 'base64');
  writeFileSync('outputs/qa/report_7_10_long.pdf', longPdfBuffer);
  console.log(`   [PASS] PDF długiego projektu wygenerowany: outputs/qa/report_7_10_long.pdf (${longPdfBuffer.length} bajtów).`);
  ok(longPdfBuffer.length > 50000, 'PDF długiego projektu powinien mieć > 50 KB');

  // Sprawdzenie błędów konsoli
  console.log(`\n3. Kontrola błędów wykonania JavaScript: ${errors.length} błędów.`);
  ok(errors.length === 0, 'Brak wyjątków Runtime w trakcie renderowania raportu');

  console.log('\n================================================================');
  console.log('PODSUMOWANIE WERYFIKACJI 7.10: ZALICZONY (Krótki i długi PDF OK)');
  console.log('================================================================\n');

} finally {
  try { ws?.close(); } catch {}
  try { browser.kill(); } catch {}
  try { server.kill(); } catch {}
}
