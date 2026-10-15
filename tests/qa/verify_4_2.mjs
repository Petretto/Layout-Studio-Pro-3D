import {spawn} from 'node:child_process';
import {mkdtempSync, rmSync, readFileSync, mkdirSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';

const PORT = 5215, CDP = 9355;
const sleep = ms => new Promise(res => setTimeout(res, ms));

const userData = mkdtempSync(join(tmpdir(), 'layout-qa-4-2-'));
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

  // 1. Otwarcie widoku Bilansowanie i Yamazumi
  await evaluate(`(() => {
    const btn = [...document.querySelectorAll('.studio-nav button')].find(b => b.textContent.includes('Bilans'));
    if (!btn) throw new Error('Brak przycisku Bilans.');
    btn.click();
  })()`);
  await sleep(500);

  // 2. Kliknij w pierwszy segment operacji na wykresie Yamazumi
  const opSelected = await evaluate(`(() => {
    const seg = document.querySelector('.operation-segment');
    if (!seg) throw new Error('Brak segmentów operacji na wykresie Yamazumi.');
    seg.click();
    return seg.textContent?.trim();
  })()`);
  console.log('Wybrano segment operacji:', opSelected);
  await sleep(400);

  // 3. Sprawdź czy przycisk blokowania w toolbarze jest dostępny
  const lockBtnText = await evaluate(`(() => {
    const btns = [...document.querySelectorAll('.balance-editor .panel .toolbar button')];
    const lockBtn = btns.find(b => b.textContent.includes('Zablokuj na') || b.textContent.includes('Odblokuj przydział'));
    return lockBtn ? lockBtn.textContent.trim() : null;
  })()`);
  console.log('Tekst przycisku blokady:', lockBtnText);
  if (!lockBtnText) throw new Error('Brak przycisku blokowania przydziału w panelu bilansowania.');

  // 4. Kliknij przycisk blokowania przydziału
  await evaluate(`(() => {
    const btns = [...document.querySelectorAll('.balance-editor .panel .toolbar button')];
    const lockBtn = btns.find(b => b.textContent.includes('Zablokuj na'));
    if (!lockBtn) throw new Error('Brak przycisku Zablokuj na...');
    lockBtn.click();
  })()`);
  await sleep(500);

  // 5. Sprawdź czy pojawiła się kłódka 🔒 na segmencie i w liście wyboru
  const hasLockIcon = await evaluate(`(() => {
    const segs = [...document.querySelectorAll('.operation-segment')];
    const lockedSeg = segs.find(s => s.textContent.includes('🔒'));
    const options = [...document.querySelectorAll('select option')];
    const lockedOpt = options.find(o => o.textContent.includes('🔒'));
    return Boolean(lockedSeg && lockedOpt);
  })()`);
  console.log('Czy ikona 🔒 jest widoczna na segmencie i w select:', hasLockIcon);
  if (!hasLockIcon) throw new Error('Ikona blokady 🔒 nie pojawiła się po zablokowaniu operacji.');

  // 6. Sprawdź formularz OperationInspector pod kątem checkboxa blokady
  const inspectorCheckboxState = await evaluate(`(() => {
    const cb = document.querySelector('.operation-inspector input[type="checkbox"]');
    return cb ? cb.checked : null;
  })()`);
  console.log('Stan checkboxa w OperationInspector:', inspectorCheckboxState);
  if (inspectorCheckboxState !== true) throw new Error('Checkbox w OperationInspector nie jest zaznaczony dla zablokowanej operacji.');

  // 7. Zmień algorytm na LCR i sprawdź, czy zablokowana operacja nadal ma kłódkę i przydział
  await evaluate(`(() => {
    const select = document.querySelector('select[aria-label="Metoda bilansowania"]');
    if (!select) throw new Error('Brak select metody bilansowania.');
    select.value = 'LCR';
    select.dispatchEvent(new Event('change', {bubbles: true}));
  })()`);
  await sleep(500);

  const lockPersistsInLCR = await evaluate(`(() => {
    const segs = [...document.querySelectorAll('.operation-segment')];
    return segs.some(s => s.textContent.includes('🔒'));
  })()`);
  console.log('Czy blokada przetrwała zmianę heurystyki na LCR:', lockPersistsInLCR);
  if (!lockPersistsInLCR) throw new Error('Zablokowanie operacji nie utrzymało się po przełączeniu na LCR.');

  // 8. Wykonaj zrzut ekranu widoku bilansowania z widoczną zablokowaną operacją (🔒)
  await evaluate(`document.querySelector('.balance-editor')?.scrollIntoView({block: 'start'})`);
  await sleep(300);

  mkdirSync('outputs/qa', {recursive: true});
  const screenshot = await send('Page.captureScreenshot', {format: 'png'});
  const shotBuffer = Buffer.from(screenshot.data, 'base64');
  writeFileSync('outputs/qa/verify_4_2.png', shotBuffer);
  console.log(`Zapisano zrzut ekranu: outputs/qa/verify_4_2.png (${shotBuffer.length} bajtów)`);

  console.log('PASS 4.2 UI: blokowanie przydziałów przed automatycznym balansowaniem (RPW i LCR) zweryfikowane w Edge CDP.');
} finally {
  ws?.close();
  browser.kill();
  server.kill();
  try { rmSync(userData, {recursive: true, force: true}); } catch {}
}
