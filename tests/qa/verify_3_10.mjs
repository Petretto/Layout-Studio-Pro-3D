import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const PORT = 5193;
const CDP_PORT = 9333;
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

  const userDataDir = mkdtempSync(join(tmpdir(), 'edge-qa-3-10-'));
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
        const text = msg.params.args.map(a => a.value ?? a.description ?? '').join(' ');
        consoleLogs.push(`[${msg.params.type}] ${text}`);
      }
      if (msg.id && pending.has(msg.id)) {
        const { resolve, reject } = pending.get(msg.id);
        pending.delete(msg.id);
        if (msg.error) reject(new Error(msg.error.message));
        else resolve(msg.result);
      }
    };

    function send(method, params = {}) {
      const id = msgId++;
      return new Promise((resolve, reject) => {
        pending.set(id, { resolve, reject });
        ws.send(JSON.stringify({ id, method, params }));
      });
    }

    await send('Page.enable');
    await send('Runtime.enable');

    async function evaluate(expression) {
      const res = await send('Runtime.evaluate', {
        expression,
        awaitPromise: true,
        returnByValue: true
      });
      if (res.exceptionDetails) {
        throw new Error(res.exceptionDetails.exception?.description || res.exceptionDetails.text);
      }
      return res.result?.value;
    }

    console.log('4. Navigating to http://127.0.0.1:' + PORT + '/');
    let loaded = false;
    const loadHandler = (event) => {
      const data = JSON.parse(event.data);
      if (data.method === 'Page.loadEventFired') loaded = true;
    };
    ws.addEventListener('message', loadHandler);
    await send('Page.navigate', { url: `http://127.0.0.1:${PORT}/` });
    
    for (let i = 0; i < 40; i++) {
      if (loaded) break;
      await sleep(250);
    }
    ws.removeEventListener('message', loadHandler);

    // Wait for React to render inside #root
    for (let i = 0; i < 40; i++) {
      await sleep(250);
      try {
        const ready = await evaluate(`!!document.querySelector('#root .studio')`);
        if (ready) break;
      } catch {}
    }
    await sleep(500);

    const docInfo = await evaluate(`({
      title: document.title,
      buttons: Array.from(document.querySelectorAll('button')).map(b => b.textContent.trim().slice(0, 30)),
      bodySnippet: document.body.innerHTML.slice(0, 300)
    })`);
    console.log('   Document info:', docInfo);

    // Click Eko example button
    console.log('5. Selecting Eko project on Dashboard');
    const ekoClicked = await evaluate(`(() => {
      const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Eko'));
      if (btn) { btn.click(); return true; }
      return false;
    })()`);
    console.log('   Eko button clicked: ' + ekoClicked);
    await sleep(500);

    // If confirmation modal appears, confirm
    await evaluate(`(() => {
      const confirmBtn = document.querySelector('dialog button.primary');
      if (confirmBtn && confirmBtn.offsetParent !== null) confirmBtn.click();
    })()`);
    await sleep(500);

    // Switch to tab 6 3D i symulacja
    console.log('6. Switching to tab "6 3D i symulacja"');
    const tabClicked = await evaluate(`(() => {
      const tabBtn = Array.from(document.querySelectorAll('nav.studio-nav button')).find(b => b.textContent.includes('6 3D i symulacja'));
      if (tabBtn) { tabBtn.click(); return true; }
      return false;
    })()`);
    console.log('   Tab clicked: ' + tabClicked);
    await sleep(1500);

    // Check speeds in select
    console.log('7. Verifying speed select options');
    const selectInfo = await evaluate(`(() => {
      const select = document.querySelector('select[aria-label="Szybkość odtwarzania"]');
      if (!select) return null;
      const options = Array.from(select.options).map(o => ({ value: Number(o.value), text: o.text }));
      return { currentValue: Number(select.value), options };
    })()`);

    console.log('   Current speed value:', selectInfo?.currentValue);
    console.log('   Options available:', selectInfo?.options.map(o => o.text).join(', '));
    if (!selectInfo) throw new Error('Speed select element not found!');

    const expectedSpeeds = [1, 2, 5, 10, 20, 50, 100, 200, 500, 1000, 2000, 5000];
    const actualSpeeds = selectInfo.options.map(o => o.value);
    for (const exp of expectedSpeeds) {
      if (!actualSpeeds.includes(exp)) {
        throw new Error(`Expected speed ${exp}x missing from select options!`);
      }
    }

    // Set batch size to 3 (Eko baseline)
    console.log('7b. Setting batch size to 3 for Eko baseline');
    await evaluate(`(() => {
      const inputs = Array.from(document.querySelectorAll('.form-grid input[type="number"]'));
      const batchInput = inputs[0];
      if (batchInput) {
        const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
        setter.call(batchInput, '3');
        batchInput.dispatchEvent(new Event('input', { bubbles: true }));
        batchInput.dispatchEvent(new Event('change', { bubbles: true }));
      }
    })()`);
    await sleep(500);

    // Check initial simulated time display
    const initialTimeText = await evaluate(`(() => {
      const metrics = Array.from(document.querySelectorAll('.metrics .metric')).map(m => m.textContent);
      return metrics.find(m => m.includes('Czas symulowany')) || '';
    })()`);
    console.log('   Initial metric (batch 3):', initialTimeText);

    // Set speed to 1000x
    console.log('8. Setting playback speed to 1000x');
    await evaluate(`(() => {
      const select = document.querySelector('select[aria-label="Szybkość odtwarzania"]');
      select.value = "1000";
      select.dispatchEvent(new Event('change', { bubbles: true }));
    })()`);
    await sleep(300);

    // Click Start symulacji
    console.log('9. Clicking "Start symulacji"');
    const startClicked = await evaluate(`(() => {
      const btn = Array.from(document.querySelectorAll('.toolbar button')).find(b => b.textContent.includes('Start'));
      if (btn) { btn.click(); return true; }
      return false;
    })()`);
    console.log('   Start clicked:', startClicked);

    // Let it run for 200ms at 1000x
    await sleep(200);

    // Click Pauza
    console.log('10. Clicking "Pauza"');
    const pauseClicked = await evaluate(`(() => {
      const btn = Array.from(document.querySelectorAll('.toolbar button')).find(b => b.textContent.includes('Pauza'));
      if (btn) { btn.click(); return true; }
      return false;
    })()`);
    console.log('   Pause clicked:', pauseClicked);
    await sleep(300);

    // Inspect paused state
    const pausedState = await evaluate(`(() => {
      const metrics = Array.from(document.querySelectorAll('.metrics .metric')).map(m => m.textContent);
      const timeMetric = metrics.find(m => m.includes('Czas symulowany')) || '';
      const wipMetric = metrics.find(m => m.includes('WIP')) || '';
      const activeStations = Array.from(document.querySelectorAll('.station-strip .station')).map(s => ({
        name: s.querySelector('strong')?.textContent,
        text: s.querySelector('p')?.textContent,
        queue: s.querySelector('small')?.textContent
      }));
      return { timeMetric, wipMetric, activeStationsCount: activeStations.filter(s => !s.text.includes('Wolne')).length };
    })()`);
    console.log('   Paused metrics:', pausedState.timeMetric, '|', pausedState.wipMetric);
    console.log('   Active stations during pause:', pausedState.activeStationsCount);

    if (!pausedState.timeMetric || pausedState.timeMetric.startsWith('0 /')) {
      throw new Error('Simulation time did not advance during playback!');
    }

    // Set speed to 5000x and resume to finish the entire 21,170 s batch
    console.log('11. Setting speed to 5000x and resuming to completion');
    await evaluate(`(() => {
      const select = document.querySelector('select[aria-label="Szybkość odtwarzania"]');
      select.value = "5000";
      select.dispatchEvent(new Event('change', { bubbles: true }));
    })()`);
    await sleep(200);

    await evaluate(`(() => {
      const btn = Array.from(document.querySelectorAll('.toolbar button')).find(b => b.textContent.includes('Wznów'));
      if (btn) btn.click();
    })()`);

    // Poll until complete
    let completed = false;
    let completionText = '';
    for (let i = 0; i < 60; i++) {
      await sleep(300);
      const check = await evaluate(`(() => {
        const success = document.querySelector('p[role="status"].success');
        const timeMetric = Array.from(document.querySelectorAll('.metrics .metric')).find(m => m.textContent.includes('Czas symulowany'))?.textContent || '';
        return {
          done: success ? success.textContent : '',
          timeMetric
        };
      })()`);
      if (check.done && check.done.includes('Partia ukończona')) {
        completed = true;
        completionText = check.done;
        break;
      }
    }

    console.log('12. Completion check result:', completed ? 'COMPLETED' : 'TIMEOUT');
    console.log('   Completion text:', completionText);
    if (!completed) throw new Error('Simulation did not complete in expected time at 5000x!');

    // Test CSV export
    console.log('13. Testing CSV simulation export');
    await evaluate(`(() => {
      const csvBtn = Array.from(document.querySelectorAll('.toolbar button')).find(b => b.textContent.includes('Raport symulacji CSV'));
      if (csvBtn) csvBtn.click();
    })()`);
    await sleep(400);

    const exportStatus = await evaluate(`(() => {
      const p = document.querySelector('p[role="status"].success');
      const msg = document.querySelector('.message span')?.textContent;
      return { status: p?.textContent, notification: msg };
    })()`);
    console.log('   CSV Export status:', exportStatus.status);
    console.log('   Notification:', exportStatus.notification);

    // Switch to Stanowiska v5 tab and verify speed select there too
    console.log('14. Checking "Stanowiska v5" workspace simulation speed');
    await evaluate(`window.confirm = () => true`);
    await evaluate(`(() => {
      const tabBtn = Array.from(document.querySelectorAll('nav.studio-nav button')).find(b => b.textContent.includes('Stanowiska v5'));
      if (tabBtn) tabBtn.click();
    })()`);
    await sleep(1500);

    await evaluate(`(() => {
      const prepBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Przygotuj z bieżącego projektu'));
      if (prepBtn) prepBtn.click();
    })()`);
    await sleep(1000);

    // If layout has errors, click "Wygeneruj layout od nowa"
    await evaluate(`(() => {
      const genBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Wygeneruj layout od nowa'));
      if (genBtn) genBtn.click();
    })()`);
    await sleep(1000);

    const v5Speeds = await evaluate(`(() => {
      const select = document.querySelector('select[aria-label="Szybkość odtwarzania"]');
      if (!select) return null;
      return Array.from(select.options).map(o => Number(o.value));
    })()`);
    console.log('   Stanowiska v5 simulation speed options:', v5Speeds?.join(', '));
    if (!v5Speeds || !v5Speeds.includes(5000)) {
      throw new Error('Simulation speeds in Stanowiska v5 missing expected multipliers!');
    }

    console.log('15. Taking verification screenshot');
    mkdirSync('outputs/qa', { recursive: true });
    const screenshot = await send('Page.captureScreenshot', { format: 'png' });
    const fs = await import('node:fs/promises');
    await fs.writeFile('outputs/qa/verify_3_10.png', Buffer.from(screenshot.data, 'base64'));
    console.log('   Screenshot saved to outputs/qa/verify_3_10.png');

    console.log('\n=== ALL UI VERIFICATION CHECKS PASSED SUCCESSFULLY ===');
  } finally {
    if (ws) ws.close();
    browser.kill();
    server.kill();
    try { rmSync(userDataDir, { recursive: true, force: true }); } catch {}
  }
}

run().catch(err => {
  console.error('\n*** UI VERIFICATION FAILED ***\n', err);
  process.exit(1);
});
