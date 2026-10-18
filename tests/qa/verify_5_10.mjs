import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { strictEqual, ok } from 'node:assert';

const port = 4190, debugPort = 9350;
const edge = ['C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe', 'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe'].find(existsSync);
if (!edge) throw new Error('Edge not found');
const profile = `C:\\Users\\pczek\\AppData\\Local\\Temp\\edge-5-10-${Date.now()}`;
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
  const viewport = async width => { await send('Emulation.setDeviceMetricsOverride', { width, height: 1100, deviceScaleFactor: 1, mobile: false }); await sleep(100); };
  const navTo = async tabName => {
    await evaluate(`[...document.querySelectorAll('.studio-nav button')].find(b=>b.textContent.includes(${JSON.stringify(tabName)})).click()`);
    await sleep(200);
  };
  const keyPress = async (key, modifiers = {}) => {
    // modifiers: { ctrlKey, shiftKey, altKey, metaKey }
    await evaluate(`(() => {
      const e = new KeyboardEvent('keydown', {
        key: ${JSON.stringify(key)},
        code: ${JSON.stringify(key)},
        ctrlKey: ${!!modifiers.ctrlKey},
        shiftKey: ${!!modifiers.shiftKey},
        altKey: ${!!modifiers.altKey},
        metaKey: ${!!modifiers.metaKey},
        bubbles: true,
        cancelable: true
      });
      window.dispatchEvent(e);
    })()`);
    await sleep(100);
  };

  await send('Runtime.enable'); await send('Page.enable'); await viewport(1440);
  await send('Page.navigate', { url: `http://127.0.0.1:${port}/` }); await until(`!!document.querySelector('.studio-nav')`);

  // 1. Go to 2D Hala i CAD, select TBL-WS-1
  await navTo('5 Hala');
  await until(`!!document.querySelector('.hall-workspace')`);

  const initial2D = await evaluate(`(() => {
    const cheatsheet = document.querySelector('.cad-shortcuts-cheatsheet');
    const tableBtn = [...document.querySelectorAll('button')].find(b => b.textContent.includes('Dopasuj cały layout'));
    return {
      hasCheatsheet: !!cheatsheet,
      fitButtonTitle: tableBtn?.getAttribute('title') ?? '',
      selectedCountText: document.querySelector('[aria-label="Narzędzia wielokrotnego zaznaczenia"] span[role="status"]')?.textContent ?? ''
    };
  })()`);

  ok(initial2D.hasCheatsheet, 'Expected shortcuts cheatsheet in 2D hall workspace');
  ok(initial2D.fitButtonTitle.includes('(F)'), 'Expected (F) in Dopasuj cały layout title tooltip');
  strictEqual(initial2D.selectedCountText, 'Zaznaczono: 0', 'Expected 0 selected objects initially');

  // Select TBL-WS-1 via tree or click
  await click('Biblioteka i drzewo');
  await sleep(100);
  await evaluate(`(() => {
    const item = [...document.querySelectorAll('.hall-tree button')].find(b => b.textContent.includes('WS-1'));
    if (!item) throw new Error('Brak przycisku WS-1 w drzewie');
    item.click();
  })()`);
  await sleep(100);

  const sel2D = await evaluate(`(() => {
    const status = document.querySelector('[aria-label="Narzędzia wielokrotnego zaznaczenia"] span[role="status"]')?.textContent ?? '';
    const propHeading = document.querySelector('.hall-drawer-right h2')?.textContent ?? '';
    return { status, propHeading };
  })()`);
  strictEqual(sel2D.status, 'Zaznaczono: 1', 'Expected 1 selected object in 2D');

  // 2. Switch to 3D view (6 3D i symulacja), assert shared selection is preserved
  await navTo('6 3D');
  await until(`!!document.querySelector('.scene')`);
  await sleep(300);

  const state3D = await evaluate(`(() => {
    const status3D = document.querySelector('.toolbar span[role="status"]')?.textContent ?? '';
    const draftHeading = document.querySelector('form.panel h3')?.textContent ?? '';
    const hasCheatsheet = !!document.querySelector('.cad-shortcuts-cheatsheet');
    const fitBtnTitle = [...document.querySelectorAll('.toolbar button')].find(b => b.textContent.includes('Dopasuj halę 3D'))?.getAttribute('title') ?? '';
    return { status3D, draftHeading, hasCheatsheet, fitBtnTitle };
  })()`);

  strictEqual(state3D.status3D, 'Zaznaczono: 1', 'Expected 1 selected object in 3D');
  ok(state3D.draftHeading.includes('Stanowisko 1') || state3D.draftHeading.includes('WS-1'), `Expected 3D draft form for WS-1, got ${state3D.draftHeading}`);
  ok(state3D.hasCheatsheet, 'Expected shortcuts cheatsheet in 3D view');
  ok(state3D.fitBtnTitle.includes('(F)'), 'Expected (F) in 3D fit button title');

  // 3. Test keyboard shortcuts in 3D:
  // Toggle lock via 'L' key
  await keyPress('l');
  const lockedIn3D = await evaluate(`(() => {
    const checkbox = document.querySelector('form.panel input[type="checkbox"]');
    return checkbox?.checked;
  })()`);
  strictEqual(lockedIn3D, true, 'Expected object to be locked after pressing L in 3D');

  // Toggle lock off via 'L' key
  await keyPress('l');
  const unlockedIn3D = await evaluate(`(() => {
    const checkbox = document.querySelector('form.panel input[type="checkbox"]');
    return checkbox?.checked;
  })()`);
  strictEqual(unlockedIn3D, false, 'Expected object to be unlocked after pressing L again in 3D');

  // 4. Test nudge via arrow keys and global Undo / Redo:
  const initialX = await evaluate(`Number(document.querySelector('form.panel .form-grid label.field input')?.value)`);
  await keyPress('ArrowRight');
  const afterNudgeX = await evaluate(`Number(document.querySelector('form.panel label.field input')?.value)`);
  ok(afterNudgeX > initialX, `Expected X to increase after ArrowRight nudge, before: ${initialX}, after: ${afterNudgeX}`);

  // Test global Undo (Ctrl+Z)
  await keyPress('z', { ctrlKey: true });
  const afterUndoX = await evaluate(`Number(document.querySelector('form.panel label.field input')?.value)`);
  strictEqual(afterUndoX, initialX, `Expected Ctrl+Z to undo nudge: expected ${initialX}, got ${afterUndoX}`);

  // Test global Redo (Ctrl+Y)
  await keyPress('y', { ctrlKey: true });
  const afterRedoX = await evaluate(`Number(document.querySelector('form.panel label.field input')?.value)`);
  strictEqual(afterRedoX, afterNudgeX, `Expected Ctrl+Y to redo nudge: expected ${afterNudgeX}, got ${afterRedoX}`);

  // 5. Test Escape shortcut: clears selection in 3D
  await keyPress('Escape');
  const clearedState3D = await evaluate(`(() => {
    const status = document.querySelector('.toolbar span[role="status"]');
    const form = document.querySelector('form.panel');
    return { hasStatus: !!status, hasForm: !!form };
  })()`);
  strictEqual(clearedState3D.hasStatus, false, 'Expected selection status to be cleared after Escape');
  strictEqual(clearedState3D.hasForm, false, 'Expected draft form to close after Escape');

  // Switch back to 2D and verify selection was cleared there too (two-way sync)
  await navTo('5 Hala');
  await until(`!!document.querySelector('.hall-workspace')`);
  const clearedState2D = await evaluate(`document.querySelector('[aria-label="Narzędzia wielokrotnego zaznaczenia"] span[role="status"]')?.textContent ?? ''`);
  strictEqual(clearedState2D, 'Zaznaczono: 0', 'Expected 2D selection to reflect 3D deselect');

  // 6. Test screenshots and responsive bounds
  mkdirSync('outputs/qa', { recursive: true });
  const shot2d = await send('Page.captureScreenshot', { format: 'png' });
  writeFileSync('outputs/qa/verify_5_10_desktop_2d.png', Buffer.from(shot2d.data, 'base64'));

  await navTo('6 3D');
  await until(`!!document.querySelector('.scene')`);
  await sleep(300);
  const shot3d = await send('Page.captureScreenshot', { format: 'png' });
  writeFileSync('outputs/qa/verify_5_10_desktop_3d.png', Buffer.from(shot3d.data, 'base64'));

  // Mobile viewport 600px
  await viewport(600);
  await sleep(200);
  const overflowCheck = await evaluate(`(() => {
    return {
      bodyScrollWidth: document.body.scrollWidth,
      windowInnerWidth: window.innerWidth,
      hasHorizontalOverflow: document.body.scrollWidth > window.innerWidth
    };
  })()`);
  strictEqual(overflowCheck.hasHorizontalOverflow, false, 'Expected no horizontal overflow on mobile 600px');

  const shotMobile = await send('Page.captureScreenshot', { format: 'png' });
  writeFileSync('outputs/qa/verify_5_10_mobile_3d.png', Buffer.from(shotMobile.data, 'base64'));

  strictEqual(errors.length, 0, `Expected 0 runtime/console errors, got: ${errors.join('; ')}`);
  console.log('VERIFY_5_10_PASS: 2D-3D shared selection, shortcuts, nudge, lock, and cheatsheet verified.');
} finally {
  try { if (ws) ws.close(); } catch {}
  try { browser.kill(); } catch {}
  try { server.kill(); } catch {}
  try { rmSync(profile, { recursive: true, force: true }); } catch {}
}
