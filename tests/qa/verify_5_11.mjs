import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const PORT = 5195;
const CDP_PORT = 9335;
const EDGE_PATH = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function run() {
  console.log('1. Starting HTTP server on port ' + PORT);
  const server = spawn('node', ['scripts/serve.mjs'], {
    env: { ...process.env, PORT: String(PORT) },
    stdio: 'inherit'
  });

  await sleep(1000);

  const userDataDir = mkdtempSync(join(tmpdir(), 'edge-qa-5-11-'));
  console.log('2. Launching headless Edge with CDP port ' + CDP_PORT);
  const browser = spawn(EDGE_PATH, [
    `--remote-debugging-port=${CDP_PORT}`,
    '--headless=new',
    '--disable-gpu',
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-extensions',
    '--disable-component-extensions-with-background-pages',
    '--disable-background-networking',
    `--user-data-dir=${userDataDir}`,
    'about:blank'
  ], { stdio: 'ignore' });

  let ws;
  try {
    let versionData;
    for (let i = 0; i < 20; i++) {
      await sleep(500);
      try {
        const res = await fetch(`http://127.0.0.1:${CDP_PORT}/json/list`);
        if (res.ok) {
          const list = await res.json();
          const pageTarget = list.find(t => t.type === 'page' && t.webSocketDebuggerUrl);
          if (pageTarget) {
            versionData = pageTarget;
            break;
          }
        }
      } catch {}
    }

    if (!versionData) throw new Error('Could not connect to Edge DevTools');

    console.log('3. Connecting to DevTools WebSocket: ' + versionData.webSocketDebuggerUrl);
    ws = new WebSocket(versionData.webSocketDebuggerUrl);
    await new Promise((resolve, reject) => {
      ws.onopen = resolve;
      ws.onerror = reject;
    });

    let msgId = 1;
    const pending = new Map();
    const consoleLogs = [];

    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      if (msg.method === 'Runtime.consoleAPICalled') {
        const text = msg.params.args.map(a => a.value || JSON.stringify(a)).join(' ');
        consoleLogs.push(text);
      }
      if (msg.id && pending.has(msg.id)) {
        const { resolve, reject } = pending.get(msg.id);
        pending.delete(msg.id);
        if (msg.error) reject(new Error(msg.error.message));
        else resolve(msg.result);
      }
    };

    const send = (method, params = {}) => new Promise((resolve, reject) => {
      const id = msgId++;
      pending.set(id, { resolve, reject });
      ws.send(JSON.stringify({ id, method, params }));
    });

    await send('Page.enable');
    await send('Runtime.enable');

    console.log('4. Navigating to app...');
    await send('Page.navigate', { url: `http://127.0.0.1:${PORT}` });
    await sleep(2500);

    const evaluate = async (expression) => {
      const res = await send('Runtime.evaluate', {
        expression,
        returnByValue: true,
        awaitPromise: true
      });
      if (res.exceptionDetails) {
        throw new Error(res.exceptionDetails.text || 'Evaluation exception');
      }
      return res.result.value;
    };

    console.log('5. Verifying default unit "s" on Dashboard...');
    const dashMetric = await evaluate(`document.querySelector('.metrics')?.innerText || ''`);
    console.log('Dashboard metrics:', dashMetric);
    if (!dashMetric.includes('s/szt.')) {
      throw new Error(`Expected "s/szt." in dashboard metrics, got: ${dashMetric}`);
    }

    console.log('6. Navigating to Tab 2 Proces...');
    await evaluate(`(() => {
      const buttons = Array.from(document.querySelectorAll('.studio-nav button'));
      const procBtn = buttons.find(b => b.textContent.includes('2 Proces'));
      if (procBtn) procBtn.click();
    })()`);
    await sleep(600);

    const tableHeadersS = await evaluate(`(() => {
      const ths = Array.from(document.querySelectorAll('table th')).map(th => th.textContent.trim());
      return ths.join(' | ');
    })()`);
    console.log('Table headers with s:', tableHeadersS);
    if (!tableHeadersS.includes('Czas [s]')) {
      throw new Error(`Expected "Czas [s]" in table headers, got: ${tableHeadersS}`);
    }

    console.log('7. Switching timeUnit to "min" via header select...');
    await evaluate(`(() => {
      const selects = Array.from(document.querySelectorAll('select'));
      const unitSelect = selects.find(s => s.getAttribute('aria-label') === 'Jednostka czasu');
      if (!unitSelect) throw new Error('Unit select not found in header');
      unitSelect.value = 'min';
      unitSelect.dispatchEvent(new Event('change', { bubbles: true }));
    })()`);
    await sleep(600);

    const tableHeadersMin = await evaluate(`(() => {
      const ths = Array.from(document.querySelectorAll('table th')).map(th => th.textContent.trim());
      return ths.join(' | ');
    })()`);
    console.log('Table headers with min:', tableHeadersMin);
    if (!tableHeadersMin.includes('Czas [min]')) {
      throw new Error(`Expected "Czas [min]" in table headers, got: ${tableHeadersMin}`);
    }

    console.log('8. Clicking Edytuj on first step in DataEditor...');
    await evaluate(`(() => {
      const editButtons = Array.from(document.querySelectorAll('tbody button')).filter(b => b.textContent.includes('Edytuj'));
      if (editButtons.length > 0) editButtons[0].click();
      else throw new Error('No Edytuj button found in table');
    })()`);
    await sleep(600);

    const formLabels = await evaluate(`(() => {
      const labels = Array.from(document.querySelectorAll('form label')).map(l => l.textContent.trim());
      return labels.join(' | ');
    })()`);
    console.log('Form labels with min:', formLabels);
    if (!formLabels.includes('Czas standardowy [min]')) {
      throw new Error(`Expected "Czas standardowy [min]" in form labels, got: ${formLabels}`);
    }

    console.log('9. Editing step time to 2.5 min (150 s) and submitting form...');
    await evaluate(`(() => {
      const labels = Array.from(document.querySelectorAll('form label'));
      const stdLabel = labels.find(l => l.textContent.includes('Czas standardowy [min]'));
      if (!stdLabel) throw new Error('Standard time field not found');
      const input = stdLabel.querySelector('input');
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
      setter.call(input, '2.5');
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
      const submitBtn = document.querySelector('form button[type="submit"]');
      if (!submitBtn) throw new Error('Submit button not found');
      submitBtn.click();
    })()`);
    await sleep(1000);

    console.log('10. Verifying internal storage keeps seconds in localStorage...');
    const storedProject = await evaluate(`(() => {
      const raw = localStorage.getItem('layout-studio-v3');
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      return parsed.project;
    })()`);
    console.log('Stored timeUnit:', storedProject?.timeUnit);
    console.log('Stored step 0 standardTimeSeconds:', storedProject?.processSteps?.[0]?.standardTimeSeconds);

    if (storedProject?.timeUnit !== 'min') {
      throw new Error(`Expected timeUnit 'min', got ${storedProject?.timeUnit}`);
    }
    if (storedProject?.processSteps?.[0]?.standardTimeSeconds !== 150) {
      throw new Error(`Expected internal standardTimeSeconds to be 150, got ${storedProject?.processSteps?.[0]?.standardTimeSeconds}`);
    }

    console.log('11. Switching to Tab 4 Bilans and verifying min displays...');
    await evaluate(`(() => {
      const buttons = Array.from(document.querySelectorAll('.studio-nav button'));
      const balBtn = buttons.find(b => b.textContent.includes('4 Bilans'));
      if (balBtn) balBtn.click();
    })()`);
    await sleep(600);

    const balMetrics = await evaluate(`document.querySelector('.metrics')?.innerText || ''`);
    console.log('Balancing metrics with min:', balMetrics);
    if (!balMetrics.includes('min')) {
      throw new Error(`Expected "min" in balancing metrics, got: ${balMetrics}`);
    }

    console.log('12. Switching unit to "h"...');
    await evaluate(`(() => {
      const selects = Array.from(document.querySelectorAll('select'));
      const unitSelect = selects.find(s => s.getAttribute('aria-label') === 'Jednostka czasu');
      unitSelect.value = 'h';
      unitSelect.dispatchEvent(new Event('change', { bubbles: true }));
    })()`);
    await sleep(600);

    const balMetricsH = await evaluate(`document.querySelector('.metrics')?.innerText || ''`);
    console.log('Balancing metrics with h:', balMetricsH);
    if (!balMetricsH.includes('h')) {
      throw new Error(`Expected "h" in balancing metrics, got: ${balMetricsH}`);
    }

    console.log('13. Capturing screenshot...');
    mkdirSync('outputs/qa', { recursive: true });
    const screenshot = await send('Page.captureScreenshot', { format: 'png' });
    writeFileSync('outputs/qa/verify_5_11_time_units.png', Buffer.from(screenshot.data, 'base64'));
    console.log('Screenshot saved to outputs/qa/verify_5_11_time_units.png');

    console.log('SUCCESS: All 5.11 time unit UI verifications passed!');
  } finally {
    if (ws) ws.close();
    browser.kill();
    server.kill();
    try { rmSync(userDataDir, { recursive: true, force: true }); } catch {}
  }
}

run().catch(err => {
  console.error('FAILED:', err);
  process.exit(1);
});
