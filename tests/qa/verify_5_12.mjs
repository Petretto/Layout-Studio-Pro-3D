import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import * as XLSX from 'xlsx';

const TEMPLATE_STEPS = [
  { 'ID Kroku': 'OP10', 'Nazwa Operacji': 'Przygotowanie korpusu', 'Czas Standardowy [s]': 40, 'Wartość Dodana VA [s]': 34, 'Strata NVA [s]': 6, 'Poprzednicy': '', 'Następnicy': 'OP20, OP25' },
  { 'ID Kroku': 'OP20', 'Nazwa Operacji': 'Podmontaż modułu sterowania', 'Czas Standardowy [s]': 60, 'Wartość Dodana VA [s]': 50, 'Strata NVA [s]': 10, 'Poprzednicy': 'OP10', 'Następnicy': 'OP30' },
  { 'ID Kroku': 'OP25', 'Nazwa Operacji': 'Montaż wiązki elektrycznej', 'Czas Standardowy [s]': 45, 'Wartość Dodana VA [s]': 38, 'Strata NVA [s]': 7, 'Poprzednicy': 'OP10', 'Następnicy': 'OP30' },
  { 'ID Kroku': 'OP30', 'Nazwa Operacji': 'Montaż końcowy i kontrola', 'Czas Standardowy [s]': 80, 'Wartość Dodana VA [s]': 68, 'Strata NVA [s]': 12, 'Poprzednicy': 'OP20, OP25', 'Następnicy': '' }
];

const PORT = 5196;
const CDP_PORT = 9336;
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

  const userDataDir = mkdtempSync(join(tmpdir(), 'edge-qa-5-12-'));
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
        if (msg.error) reject(msg.error);
        else resolve(msg.result);
      }
    };

    function send(method, params = {}) {
      return new Promise((resolve, reject) => {
        const id = msgId++;
        pending.set(id, { resolve, reject });
        ws.send(JSON.stringify({ id, method, params }));
      });
    }

    console.log('4. Enabling CDP domains');
    await send('Page.enable');
    await send('Runtime.enable');
    await send('Emulation.setDeviceMetricsOverride', {
      width: 1400,
      height: 900,
      deviceScaleFactor: 1,
      mobile: false
    });

    console.log('5. Navigating to app');
    await send('Page.navigate', { url: `http://localhost:${PORT}` });
    await sleep(2000);

    // Override alert / confirm to auto-accept
    await send('Runtime.evaluate', {
      expression: `
        window.__alerts = [];
        window.alert = (msg) => { window.__alerts.push(msg); };
        window.confirm = (msg) => { window.__alerts.push(msg); return true; };
      `
    });

    // Helper evaluation
    async function evalScript(expression) {
      const res = await send('Runtime.evaluate', { expression, returnByValue: true });
      if (res.exceptionDetails) {
        throw new Error('Evaluation failed: ' + JSON.stringify(res.exceptionDetails));
      }
      return res.result.value;
    }

    console.log('6. Switching to "Proces" tab');
    await evalScript(`
      const navButtons = Array.from(document.querySelectorAll('.studio-nav button'));
      const procBtn = navButtons.find(b => b.textContent.includes('Proces'));
      if (procBtn) procBtn.click();
    `);
    await sleep(600);

    // Check toolbar buttons
    const procToolbar = await evalScript(`
      Array.from(document.querySelectorAll('.toolbar button')).map(b => b.textContent)
    `);
    console.log('Process toolbar buttons:', procToolbar);
    if (!procToolbar.includes('Szablon XLSX') || !procToolbar.includes('Szablon CSV')) {
      throw new Error('Missing template buttons in Process toolbar');
    }

    // Expand details and check column docs
    await evalScript(`
      const details = document.querySelector('details');
      if (details) details.open = true;
    `);
    await sleep(400);

    const procColumns = await evalScript(`
      Array.from(document.querySelectorAll('details table tbody tr')).map(tr => {
        const cells = Array.from(tr.querySelectorAll('td'));
        return { col: cells[0]?.textContent?.trim(), status: cells[1]?.textContent?.trim(), type: cells[2]?.textContent?.trim() };
      })
    `);
    console.log('Process column documentation:', procColumns);
    if (procColumns.length < 7) {
      throw new Error('Process column documentation table has fewer than 7 rows');
    }

    // Click "Szablon XLSX" button
    await evalScript(`
      (() => {
        const btn = Array.from(document.querySelectorAll('.toolbar button')).find(b => b.textContent === 'Szablon XLSX');
        btn.click();
      })()
    `);
    await sleep(500);

    const message1 = await evalScript(`
      document.querySelector('.message span')?.textContent || ''
    `);
    console.log('Process Szablon XLSX notification:', message1);
    if (!message1.includes('Szablon_process.xlsx')) {
      throw new Error('Expected download notification for Szablon_process.xlsx, got: ' + message1);
    }

    // Click "Szablon CSV" button
    await evalScript(`
      (() => {
        const btn = Array.from(document.querySelectorAll('.toolbar button')).find(b => b.textContent === 'Szablon CSV');
        btn.click();
      })()
    `);
    await sleep(500);

    const messageCsv = await evalScript(`
      document.querySelector('.message span')?.textContent || ''
    `);
    console.log('Process Szablon CSV notification:', messageCsv);
    if (!messageCsv.includes('Szablon_process.csv')) {
      throw new Error('Expected download notification for Szablon_process.csv, got: ' + messageCsv);
    }

    // Test importing the process template data into the application
    console.log('7. Testing import of valid Process template file');
    const procBook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(procBook, XLSX.utils.json_to_sheet(TEMPLATE_STEPS), 'Dane');
    const procXlsxBytes = XLSX.write(procBook, { type: 'array', bookType: 'xlsx' });
    const procBase64 = Buffer.from(procXlsxBytes).toString('base64');

    await evalScript(`
      (async function() {
        const b64 = "${procBase64}";
        const bin = atob(b64);
        const bytes = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
        const file = new File([bytes], "Szablon_process.xlsx", { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
        const input = document.querySelector('input[type=file]');
        const dt = new DataTransfer();
        dt.items.add(file);
        input.files = dt.files;
        input.dispatchEvent(new Event('change', { bubbles: true }));
      })()
    `);
    await sleep(600);

    // Accept custom confirm modal dialog in app
    await evalScript(`
      (() => {
        const dialog = document.querySelector('dialog[open]');
        if (dialog) {
          const confirmBtn = dialog.querySelector('button.primary');
          if (confirmBtn) confirmBtn.click();
        }
      })()
    `);
    await sleep(800);

    const processStepRows = await evalScript(`
      Array.from(document.querySelectorAll('.table-wrap table tbody tr')).map(tr => tr.querySelector('td')?.textContent?.trim())
    `);
    console.log('Imported process steps in table:', processStepRows);
    if (!processStepRows.includes('OP10') || !processStepRows.includes('OP20') || !processStepRows.includes('OP25') || !processStepRows.includes('OP30')) {
      throw new Error('Imported process template steps do not match expected IDs (OP10, OP20, OP25, OP30)');
    }

    mkdirSync('outputs/qa', { recursive: true });
    const shot1 = await send('Page.captureScreenshot', { format: 'png' });
    writeFileSync('outputs/qa/verify_5_12_process.png', Buffer.from(shot1.data, 'base64'));
    console.log('Saved outputs/qa/verify_5_12_process.png');

    // Switch to BOM tab
    console.log('8. Switching to "3 BOM" tab');
    await evalScript(`
      (() => {
        const navButtons = Array.from(document.querySelectorAll('.studio-nav button'));
        const bomBtn = navButtons.find(b => b.textContent.includes('BOM'));
        if (bomBtn) bomBtn.click();
      })()
    `);
    await sleep(600);

    // Expand details and check column docs
    await evalScript(`
      (() => {
        const details = document.querySelector('details');
        if (details) details.open = true;
      })()
    `);
    await sleep(400);

    const bomColumns = await evalScript(`
      Array.from(document.querySelectorAll('details table tbody tr')).map(tr => {
        const cells = Array.from(tr.querySelectorAll('td'));
        return { col: cells[0]?.textContent?.trim(), status: cells[1]?.textContent?.trim(), type: cells[2]?.textContent?.trim() };
      })
    `);
    console.log('BOM column documentation:', bomColumns);
    if (bomColumns.length < 7) {
      throw new Error('BOM column documentation table has fewer than 7 rows');
    }

    // Click "Szablon XLSX" button in BOM
    await evalScript(`
      (() => {
        const btn = Array.from(document.querySelectorAll('.toolbar button')).find(b => b.textContent === 'Szablon XLSX');
        btn.click();
      })()
    `);
    await sleep(500);

    const messageBom = await evalScript(`
      document.querySelector('.message span')?.textContent || ''
    `);
    console.log('BOM Szablon XLSX notification:', messageBom);
    if (!messageBom.includes('Szablon_bom.xlsx')) {
      throw new Error('Expected download notification for Szablon_bom.xlsx, got: ' + messageBom);
    }

    // Test uploading an invalid file to BOM (missing required columns)
    console.log('9. Testing upload of invalid BOM file (missing columns)');
    const badBook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(badBook, XLSX.utils.json_to_sheet([{ 'ZłaKolumna': 123 }]), 'Dane');
    const badBytes = XLSX.write(badBook, { type: 'array', bookType: 'xlsx' });
    const badBase64 = Buffer.from(badBytes).toString('base64');

    await evalScript(`
      (async function() {
        const b64 = "${badBase64}";
        const bin = atob(b64);
        const bytes = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
        const file = new File([bytes], "Zly_BOM.xlsx", { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
        const input = document.querySelector('input[type=file]');
        const dt = new DataTransfer();
        dt.items.add(file);
        input.files = dt.files;
        input.dispatchEvent(new Event('change', { bubbles: true }));
      })()
    `);
    await sleep(1000);

    const reportText = await evalScript(`
      document.querySelector('pre.notice')?.textContent || ''
    `);
    console.log('BOM upload error notice report:', reportText);
    if (!reportText.includes('Brak wymaganych kolumn BOM')) {
      throw new Error('Expected missing columns error in BOM report notice, got: ' + reportText);
    }

    const shot2 = await send('Page.captureScreenshot', { format: 'png' });
    writeFileSync('outputs/qa/verify_5_12_bom.png', Buffer.from(shot2.data, 'base64'));
    console.log('Saved outputs/qa/verify_5_12_bom.png');

    console.log('UI verification of 5.12 completed successfully!');
  } finally {
    if (ws) {
      try { ws.close(); } catch {}
    }
    browser.kill();
    server.kill();
    try {
      rmSync(userDataDir, { recursive: true, force: true });
    } catch {}
  }
}

run().catch(err => {
  console.error('QA script failed:', err);
  process.exit(1);
});
