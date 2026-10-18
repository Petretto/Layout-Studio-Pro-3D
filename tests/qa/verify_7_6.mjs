import {spawn} from 'node:child_process';
import {existsSync, mkdtempSync, mkdirSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {ok} from 'node:assert';

const port = 5276, cdp = 9376, sleep = ms => new Promise(r => setTimeout(r, ms));
const edge = [
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe'
].find(existsSync);
if (!edge) throw new Error('Brak Edge');

mkdirSync('outputs/qa', {recursive: true});

const server = spawn('node', ['scripts/serve.mjs'], {env: {...process.env, PORT: String(port)}, stdio: 'ignore', windowsHide: true});
const browser = spawn(edge, [`--remote-debugging-port=${cdp}`, `--user-data-dir=${mkdtempSync(join(tmpdir(), 'layout-qa-7-6-'))}`, '--headless=new', '--no-first-run', '--disable-gpu', 'about:blank'], {stdio: 'ignore', windowsHide: true});
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
  if (!target) throw new Error('Brak CDP');

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
    const timer = setTimeout(() => { pending.delete(next); reject(new Error('Timeout ' + method)); }, 10000);
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
    for (let i = 0; i < 60; i++) {
      if (await evaluate(expression)) return;
      await sleep(100);
    }
    throw new Error('Timeout ' + expression);
  };

  const screenshot = async path => {
    const r = await send('Page.captureScreenshot', {format: 'png'});
    writeFileSync(path, Buffer.from(r.data, 'base64'));
  };

  await send('Page.enable');
  await send('Runtime.enable');
  await send('Emulation.setDeviceMetricsOverride', {width: 1440, height: 900, deviceScaleFactor: 1, mobile: false});

  await send('Page.navigate', {url: `http://127.0.0.1:${port}`});
  await until(`Boolean(document.querySelector('.studio'))`);

  console.log('[QA 7.6] Aplikacja załadowana pomyślnie.');

  // 1. Otwarcie modalu Kopie i odzyskiwanie z paska narzędziowego
  await evaluate(`(()=>{
    const btns = Array.from(document.querySelectorAll('.studio-header .toolbar button'));
    const btn = btns.find(b => b.textContent.includes('Kopie i odzyskiwanie'));
    if (!btn) throw new Error('Brak przycisku Kopie i odzyskiwanie w toolbarze');
    btn.click();
  })()`);

  await until(`Array.from(document.querySelectorAll('h2')).some(h => h.textContent.includes('Kopie i Odzyskiwanie'))`);
  console.log('[QA 7.6] Modal kopii i odzyskiwania otwarty z paska narzędziowego.');

  // Sprawdzenie obecności kluczowych sekcji w modalu
  const innerText = await evaluate(`document.body.innerText`);
  const lower = innerText.toLowerCase();
  const hasSections =
    lower.includes('stan pamięci') &&
    lower.includes('pełną kopię') &&
    lower.includes('przywróć środowisko') &&
    lower.includes('dystrybucja i praca offline');
  ok(hasSections, 'Brak wymaganych sekcji w oknie kopii zapasowej');

  await screenshot('outputs/qa/verify_7_6_modal.png');
  console.log('[QA 7.6] Zrzut ekranu zapisany: outputs/qa/verify_7_6_modal.png');

  // Zamknięcie modalu przyciskiem Zamknij
  await evaluate(`(()=>{
    const closeBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.trim() === 'Zamknij');
    if (closeBtn) closeBtn.click();
  })()`);
  await sleep(300);

  // 2. Weryfikacja karty na Pulpicie (Dashboard)
  await evaluate(`(()=>{
    const navBtn = Array.from(document.querySelectorAll('.studio-nav button')).find(b => b.textContent.includes('Pulpit'));
    if (navBtn) navBtn.click();
  })()`);
  await sleep(300);

  const hasDashboardCard = await evaluate(`(()=>{
    const cards = Array.from(document.querySelectorAll('.action-card'));
    return cards.some(c => c.textContent.includes('Kopia i odzyskiwanie (.lsbackup)'));
  })()`);
  ok(hasDashboardCard, 'Brak karty Kopia i odzyskiwanie na pulpicie');

  // Kliknięcie w kartę na pulpicie
  await evaluate(`(()=>{
    const card = Array.from(document.querySelectorAll('.action-card')).find(c => c.textContent.includes('Kopia i odzyskiwanie (.lsbackup)'));
    if (card) card.click();
  })()`);

  await until(`Array.from(document.querySelectorAll('h2')).some(h => h.textContent.includes('Kopie i Odzyskiwanie'))`);
  console.log('[QA 7.6] Modal pomyślnie otwarty z karty Pulpitu.');

  // Zamknięcie
  await evaluate(`(()=>{
    const closeBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.trim() === 'Zamknij');
    if (closeBtn) closeBtn.click();
  })()`);

  ok(errors.length === 0, `Wykryto błędy konsoli: ${errors.join(', ')}`);
  console.log('[QA 7.6] Weryfikacja UI Edge CDP zakończona sukcesem (0 błędów).');
} finally {
  try { if (ws) ws.close(); } catch {}
  try { browser.kill(); } catch {}
  try { server.kill(); } catch {}
}
