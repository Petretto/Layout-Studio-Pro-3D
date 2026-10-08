import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const CDP_PORT = 9488;
const EDGE_PATH = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const htmlPath = resolve("Instrukcja", "Podrecznik_Uzytkownika.html");
const pdfPath = resolve("Instrukcja", "Podrecznik_Uzytkownika.pdf");

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function generatePdf() {
  const userDataDir = mkdtempSync(join(tmpdir(), 'edge-pdf-gen-'));
  const browser = spawn(EDGE_PATH, [
    `--remote-debugging-port=${CDP_PORT}`,
    '--headless=new',
    '--disable-gpu',
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-extensions',
    `--user-data-dir=${userDataDir}`,
    'about:blank'
  ], { stdio: 'ignore' });

  let ws;
  try {
    let versionData;
    for (let i = 0; i < 30; i++) {
      await sleep(400);
      try {
        const res = await fetch(`http://127.0.0.1:${CDP_PORT}/json/list`);
        if (res.ok) {
          const list = await res.json();
          versionData = list.find(t => t.type === 'page' && t.webSocketDebuggerUrl);
          if (versionData) break;
        }
      } catch {}
    }

    if (!versionData) throw new Error('Could not connect to Edge');

    ws = new WebSocket(versionData.webSocketDebuggerUrl);
    await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });

    let id = 1;
    const pending = new Map();
    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      if (msg.id && pending.has(msg.id)) {
        const { res, rej } = pending.get(msg.id);
        pending.delete(msg.id);
        if (msg.error) rej(new Error(msg.error.message));
        else res(msg.result);
      }
    };

    const send = (method, params = {}) => new Promise((res, rej) => {
      const i = id++;
      pending.set(i, { res, rej });
      ws.send(JSON.stringify({ id: i, method, params }));
    });

    await send('Page.enable');
    const fileUrl = 'file:///' + htmlPath.replace(/\\/g, '/');
    console.log('Navigating to', fileUrl);
    await send('Page.navigate', { url: fileUrl });
    await sleep(2500);

    console.log('Printing to PDF via Page.printToPDF...');
    const result = await send('Page.printToPDF', {
      landscape: false,
      displayHeaderFooter: false,
      printBackground: true,
      paperWidth: 8.27, // A4 in inches
      paperHeight: 11.69,
      marginTop: 0.5,
      marginBottom: 0.5,
      marginLeft: 0.5,
      marginRight: 0.5,
      preferCSSPageSize: true
    });

    const buffer = Buffer.from(result.data, 'base64');
    writeFileSync(pdfPath, buffer);
    console.log(`SUCCESS: PDF saved to ${pdfPath} (${buffer.length} bytes)`);

  } finally {
    if (ws) ws.close();
    browser.kill();
    await sleep(500);
    try { rmSync(userDataDir, { recursive: true, force: true }); } catch {}
  }
}

generatePdf().catch(err => {
  console.error('ERROR:', err);
  process.exit(1);
});
