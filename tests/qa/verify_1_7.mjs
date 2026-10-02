import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync, mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const PORT = 5194;
const CDP_PORT = 9334;
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

  const userDataDir = mkdtempSync(join(tmpdir(), 'edge-qa-1-7-'));
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

    mkdirSync('outputs/qa', { recursive: true });

    // =========================================================================
    // SCENARIUSZ 1: Wykrycie i jawna migracja starszego zapisu localStorage
    // =========================================================================
    console.log('4. SCENARIO 1: Seed unversioned legacy project into localStorage...');
    await send('Page.navigate', { url: `http://127.0.0.1:${PORT}` });
    await sleep(2000);

    const legacyFixture = readFileSync('tests/qa/D5f_legacy_motor_untagged.json', 'utf-8');
    await evaluate(`localStorage.setItem('layout-studio-v3', JSON.stringify({ project: ${legacyFixture}, at: '2026-10-02T00:00:00.000Z' }))`);

    console.log('5. Reloading page to trigger legacy project detection...');
    await send('Page.reload');
    await sleep(2000);

    const noticeText = await evaluate(`document.querySelector('.notice')?.innerText || ''`);
    console.log('Notice banner text:', noticeText);
    if (!noticeText.includes('Pobierz starszy zapis') || !noticeText.includes('Potwierdź migrację i zapis')) {
      throw new Error(`Expected legacy banner with download and confirm buttons, got: ${noticeText}`);
    }

    const saveBarText = await evaluate(`document.querySelector('.save-bar')?.innerText || ''`);
    console.log('Save bar text:', saveBarText);

    // Capture screenshot of legacy warning banner
    const sc1 = await send('Page.captureScreenshot', { format: 'png' });
    writeFileSync('outputs/qa/verify_1_7_legacy_migration.png', Buffer.from(sc1.data, 'base64'));

    console.log('6. Clicking "Pobierz starszy zapis" to enable migration confirmation...');
    await evaluate(`(() => {
      const btns = Array.from(document.querySelectorAll('.notice button'));
      const dlBtn = btns.find(b => b.textContent.includes('Pobierz starszy zapis'));
      if (!dlBtn) throw new Error('Download legacy button not found');
      dlBtn.click();
    })()`);
    await sleep(600);

    console.log('7. Confirming migration to schema 4...');
    await evaluate(`(() => {
      const btns = Array.from(document.querySelectorAll('.notice button'));
      const confBtn = btns.find(b => b.textContent.includes('Potwierdź migrację i zapis'));
      if (!confBtn || confBtn.disabled) throw new Error('Confirm migration button not found or disabled');
      confBtn.click();
    })()`);
    await sleep(600);

    // Confirm dialog
    await evaluate(`(() => {
      const dialog = document.querySelector('dialog');
      if (!dialog) throw new Error('Confirm dialog not found');
      const confActionBtn = dialog.querySelector('button.primary');
      if (!confActionBtn) throw new Error('Dialog confirm button not found');
      confActionBtn.click();
    })()`);
    await sleep(1500);

    // Verify localStorage now has schemaVersion: 4 and intact operations
    const migratedProject = await evaluate(`(() => {
      const raw = localStorage.getItem('layout-studio-v3');
      if (!raw) return null;
      return JSON.parse(raw).project;
    })()`);
    console.log('Migrated schemaVersion:', migratedProject?.schemaVersion);
    console.log('Migrated process steps count:', migratedProject?.processSteps?.length);
    console.log('Migrated BOM count:', migratedProject?.bom?.length);

    if (migratedProject?.schemaVersion !== 4) {
      throw new Error(`Expected schemaVersion 4 after migration, got ${migratedProject?.schemaVersion}`);
    }
    if (migratedProject?.processSteps?.length !== 6) {
      throw new Error(`Expected 6 process steps after migration, got ${migratedProject?.processSteps?.length}`);
    }

    // =========================================================================
    // SCENARIUSZ 2: Odzyskiwanie uszkodzonego zapisu localStorage (corrupt)
    // =========================================================================
    console.log('8. SCENARIO 2: Inject corrupt non-JSON string into localStorage...');
    await evaluate(`localStorage.setItem('layout-studio-v3', 'CORRUPTED_NON_JSON_DATA_QA_12345')`);

    console.log('9. Reloading page to trigger corrupt data recovery...');
    await send('Page.reload');
    await sleep(2000);

    const corruptNotice = await evaluate(`document.querySelector('.notice')?.innerText || ''`);
    console.log('Corrupt notice banner:', corruptNotice);
    if (!corruptNotice.includes('Pobierz kopię odzyskiwania') || !corruptNotice.includes('Włącz zapis')) {
      throw new Error(`Expected corrupt recovery banner, got: ${corruptNotice}`);
    }

    const sc2 = await send('Page.captureScreenshot', { format: 'png' });
    writeFileSync('outputs/qa/verify_1_7_recovery_banner.png', Buffer.from(sc2.data, 'base64'));

    console.log('10. Recovering by unlocking write access...');
    await evaluate(`(() => {
      const btns = Array.from(document.querySelectorAll('.notice button'));
      const enableBtn = btns.find(b => b.textContent.includes('Włącz zapis'));
      if (!enableBtn) throw new Error('Enable save button not found');
      enableBtn.click();
    })()`);
    await sleep(600);

    // Confirm dialog
    await evaluate(`(() => {
      const dialog = document.querySelector('dialog');
      const confActionBtn = dialog.querySelector('button.primary');
      if (!confActionBtn) throw new Error('Dialog confirm button not found');
      confActionBtn.click();
    })()`);
    await sleep(1500);

    const recoveredStored = await evaluate(`(() => {
      const raw = localStorage.getItem('layout-studio-v3');
      if (!raw) return null;
      return JSON.parse(raw);
    })()`);
    if (!recoveredStored?.project) {
      throw new Error('Failed to restore valid project after recovery unlock');
    }
    console.log('Recovered project successfully initialized:', recoveredStored.project.name);

    // =========================================================================
    // SCENARIUSZ 3: Ochrona oryginału przy nieudanej migracji v5
    // =========================================================================
    console.log('11. SCENARIO 3: Protection of original during failed migration in StationWorkspace...');
    // Seed an existing valid v5 project
    const validV5Seed = {
      schemaVersion: 5,
      name: 'Stabilne Stanowiska V5 Przed Testem',
      targetLayoutType: 'UShape',
      facility: { widthMm: 30000, lengthMm: 20000, heightMm: 5000, gridSizeMm: 1000 },
      processSteps: [
        { id: 'S1', name: 'Step 1', standardTimeSeconds: 50, vaTimeSeconds: 40, nvaTimeSeconds: 10, sequenceNumber: 1, predecessorIds: [] }
      ],
      bom: [],
      obstacles: [],
      layoutObjects: [{ id: 'TBL1', workstationId: 'ST-0001', type: 'TableESD', name: 'Stół 1', xMm: 2000, yMm: 2000, zMm: 0, widthMm: 1200, lengthMm: 800, heightMm: 850, rotationDeg: 0 }],
      demand: { yearlyDemand: 100000, workingDaysPerYear: 250, shiftsPerDay: 2, hoursPerShift: 8, plannedBreaksMinutesPerShift: 30, oeePercent: 85 },
      stations: [{ id: 'ST-0001', name: 'Stanowisko 1', operationIds: ['S1'] }],
      manualAssignments: [{ stepId: 'S1', stationId: 'ST-0001' }],
      workstationSettings: {}
    };
    await evaluate(`localStorage.setItem('layout-studio-stations-v5', JSON.stringify({
      project: ${JSON.stringify(validV5Seed)},
      originalJson: 'ORIGINAL_V4_INTACT_CONTENT',
      importSourceBase64: 'ORIGINAL_RAW_IMPORT_BASE64',
      at: '2026-10-02T12:00:00.000Z'
    }))`);

    // In v4, inject an invalid project with orphaned resource settings:
    const orphanV4 = readFileSync('tests/qa/Eko_D5e_orphan_resource_v4.json', 'utf-8');
    await evaluate(`localStorage.setItem('layout-studio-v3', JSON.stringify({
      project: ${orphanV4},
      at: '2026-10-02T12:00:00.000Z'
    }))`);

    // Reload page to load orphan project in v4
    await send('Page.reload');
    await sleep(2000);

    // Navigate to tab 'stations'
    console.log('12. Navigating to tab Stanowiska v5...');
    await evaluate(`(() => {
      const btns = Array.from(document.querySelectorAll('.studio-nav button'));
      const stBtn = btns.find(b => b.textContent.includes('Stanowiska v5'));
      if (!stBtn) throw new Error('Stanowiska v5 button not found');
      stBtn.click();
    })()`);
    await sleep(1000);

    // Attempt migration from current invalid legacy project
    console.log('13. Attempting migration from project with orphaned resources...');
    await evaluate(`(() => {
      const btns = Array.from(document.querySelectorAll('section[aria-label="Warsztat stanowisk v5"] button'));
      const migBtn = btns.find(b => b.textContent.includes('Przygotuj z bieżącego projektu'));
      if (!migBtn) throw new Error('Przygotuj z bieżącego projektu button not found');
      migBtn.click();
    })()`);
    await sleep(1000);

    const v5Message = await evaluate(`(() => {
      const msg = document.querySelector('section[aria-label="Warsztat stanowisk v5"] p.error');
      return msg?.innerText || '';
    })()`);
    console.log('Migration rejection message in UI:', v5Message);
    if (!v5Message.includes('Migracja zatrzymana')) {
      throw new Error(`Expected "Migracja zatrzymana" error message, got: ${v5Message}`);
    }

    // Verify localStorage v5 is completely unchanged
    const v5Stored = await evaluate(`(() => {
      const raw = localStorage.getItem('layout-studio-stations-v5');
      if (!raw) return null;
      return JSON.parse(raw);
    })()`);
    console.log('Station project name after aborted migration:', v5Stored?.project?.name);
    console.log('OriginalJson preserved:', v5Stored?.originalJson);
    console.log('ImportSourceBase64 preserved:', v5Stored?.importSourceBase64);

    if (v5Stored?.project?.name !== 'Stabilne Stanowiska V5 Przed Testem') {
      throw new Error('Existing v5 project was overwritten during failed migration!');
    }
    if (v5Stored?.originalJson !== 'ORIGINAL_V4_INTACT_CONTENT') {
      throw new Error('originalJson was corrupted during failed migration!');
    }

    // =========================================================================
    // SCENARIUSZ 4: Ponowne otwarcie (reopen) i pełny roundtrip
    // =========================================================================
    console.log('14. SCENARIO 4: Modifying data, reloading, and verifying persistence roundtrip...');
    // Return to dashboard
    await evaluate(`(() => {
      const btns = Array.from(document.querySelectorAll('.studio-nav button'));
      const dashBtn = btns.find(b => b.textContent.includes('Pulpit'));
      if (dashBtn) dashBtn.click();
    })()`);
    await sleep(600);

    // Edit project name in header
    await evaluate(`(() => {
      const input = document.querySelector('input[aria-label="Nazwa projektu"]');
      if (!input) throw new Error('Project name input not found');
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
      setter.call(input, 'Projekt QA Roundtrip 1.7');
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
    })()`);
    await sleep(1500); // allow autosave (700ms)

    console.log('15. Reloading page...');
    await send('Page.reload');
    await sleep(2000);

    const reloadedName = await evaluate(`document.querySelector('input[aria-label="Nazwa projektu"]')?.value || ''`);
    console.log('Reloaded project name:', reloadedName);
    if (reloadedName !== 'Projekt QA Roundtrip 1.7') {
      throw new Error(`Expected "Projekt QA Roundtrip 1.7", got "${reloadedName}"`);
    }

    const sc3 = await send('Page.captureScreenshot', { format: 'png' });
    writeFileSync('outputs/qa/verify_1_7_reopen_success.png', Buffer.from(sc3.data, 'base64'));

    console.log('SUCCESS: All Task 1.7 acceptance scenarios verified successfully!');
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
