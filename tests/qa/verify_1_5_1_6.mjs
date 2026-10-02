import { spawn } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const PORT = 5197;
const CDP_PORT = 9337;
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

  const userDataDir = mkdtempSync(join(tmpdir(), 'edge-qa-1-5-1-6-'));
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
        const desc = res.exceptionDetails.exception?.description || res.exceptionDetails.text;
        throw new Error(desc || JSON.stringify(res.exceptionDetails));
      }
      return res.result.value;
    };

    mkdirSync('outputs/qa', { recursive: true });

    // =========================================================================
    // INITIAL SETUP: Seed Eko v5 project into localStorage under layout-studio-stations-v5
    // =========================================================================
    console.log('4. Navigating and seeding Eko v5 project into localStorage...');
    await send('Page.navigate', { url: `http://127.0.0.1:${PORT}` });
    await sleep(2000);

    const ekoV5Raw = readFileSync('tests/qa/Eko_D5_actual_export_v5.json', 'utf8');
    await evaluate(`localStorage.setItem('layout-studio-stations-v5', JSON.stringify({ project: ${ekoV5Raw}, originalJson: '', importSourceBase64: '', at: new Date().toISOString() }))`);

    console.log('5. Reloading page and opening Warsztat v5...');
    await send('Page.reload');
    await sleep(2000);

    // Click 'Stanowiska v5' tab
    await evaluate(`(() => {
      const btn = Array.from(document.querySelectorAll('nav.studio-nav button')).find(b => b.textContent.includes('Stanowiska v5'));
      if (!btn) throw new Error('Stanowiska v5 tab not found');
      btn.click();
    })()`);
    await sleep(1000);

    await evaluate(`window.getStationRows = () => {
      const table = Array.from(document.querySelectorAll('table')).find(t => Array.from(t.querySelectorAll('th')).some(th => th.textContent.includes('Trwałe ID')));
      if (!table) return [];
      return Array.from(table.querySelectorAll('tbody tr')).map(r => ({
        nr: r.children[0]?.textContent?.trim(),
        id: r.children[1]?.textContent?.trim(),
        name: r.children[2]?.textContent?.trim(),
        ops: r.children[3]?.textContent?.trim(),
        cycle: r.children[4]?.textContent?.trim()
      }));
    };`);

    // =========================================================================
    // STEP 1: Verify 17 stations with stable IDs (ST-...)
    // =========================================================================
    console.log('6. Checking initial station table rows and stable IDs...');
    const initialRows = await evaluate(`window.getStationRows()`);

    console.log(`Loaded ${initialRows.length} stations.`);
    if (initialRows.length !== 17) throw new Error(`Expected 17 stations, got ${initialRows.length}`);
    const st1Id = initialRows[0].id;
    console.log(`Station 1 ID: ${st1Id}, Name: ${initialRows[0].name}, Ops: ${initialRows[0].ops}`);
    if (!st1Id.startsWith('ST-')) throw new Error(`Expected ST- prefix, got ${st1Id}`);

    // =========================================================================
    // STEP 2: Reordering stations preserves stable IDs & enforces dependencies (Task 1.5)
    // =========================================================================
    console.log('7. Verifying dependency enforcement: moving Station 1 down is rejected...');
    await evaluate(`(() => {
      const firstRow = document.querySelectorAll('table tbody tr')[0];
      const downBtn = firstRow.querySelectorAll('button')[1];
      downBtn.click();
    })()`);
    await sleep(600);

    const rejMsg = await evaluate(`document.querySelector('.error')?.textContent || ''`);
    console.log('Rejection message for invalid order:', rejMsg);
    if (!rejMsg.includes('poprzednik')) {
      throw new Error(`Expected predecessor error message, got: ${rejMsg}`);
    }

    console.log('8. Reordering Station 10 up (↑) and checking stable ID retention...');
    const st10Id = 'ST-947cf188-d95d-4ded-a992-b5be65061876';
    const st9Id = 'ST-79bfb2de-1fb5-4544-b1ee-ae9bdf60d3db';

    await evaluate(`(() => {
      // Row 9 is Stanowisko 10 (0-indexed)
      const rows = document.querySelectorAll('table tbody tr');
      const st10Row = Array.from(rows).find(r => r.children[1]?.textContent?.includes('${st10Id}'));
      if (!st10Row) throw new Error('Station 10 row not found');
      const upBtn = st10Row.querySelectorAll('button')[0];
      upBtn.click();
    })()`);
    await sleep(800);

    const reorderedRows = await evaluate(`window.getStationRows()`);

    // Verify Station 10 is now at index 8 and Station 9 is at index 9
    console.log(`Position 9 is now: ${reorderedRows[8].name} (${reorderedRows[8].id})`);
    console.log(`Position 10 is now: ${reorderedRows[9].name} (${reorderedRows[9].id})`);

    if (reorderedRows[8].id !== st10Id || reorderedRows[9].id !== st9Id) {
      throw new Error(`Station 10 stable ID did not survive reordering: expected pos 9=${st10Id}, pos 10=${st9Id}`);
    }

    // Undo reorder
    console.log('9. Undoing reorder...');
    await evaluate(`(() => {
      const section = document.querySelector('section[aria-label="Warsztat stanowisk v5"]');
      const undoBtn = Array.from(section.querySelectorAll('button')).find(b => b.textContent === 'Cofnij');
      if (!undoBtn) throw new Error('v5 Undo button not found');
      undoBtn.click();
    })()`);
    await sleep(800);

    // =========================================================================
    // STEP 3: Split station (Task 1.6: explicit decisions, no silent reset)
    // =========================================================================
    console.log('9. Splitting station with OP22 and OP23...');
    // Target station: ST-4f27d837-789a-4ffa-beba-e777b7e2bf8c has OP22 and OP23
    await evaluate(`(() => {
      // Find select in 'Podziel stanowisko'
      const splitPanel = Array.from(document.querySelectorAll('.panel')).find(p => p.querySelector('h2')?.textContent?.includes('Podziel stanowisko'));
      if (!splitPanel) throw new Error('Podziel stanowisko panel not found');
      const selects = splitPanel.querySelectorAll('select');
      const stationSelect = selects[0];
      // Pick option that contains OP22 / station with multiple ops
      const targetOpt = Array.from(stationSelect.options).find(o => o.value && o.value.includes('ST-4f27d837'));
      if (!targetOpt) throw new Error('Split target station option not found');
      stationSelect.value = targetOpt.value;
      stationSelect.dispatchEvent(new Event('change', { bubbles: true }));
    })()`);
    await sleep(600);

    // Setup setReactInput helper
    await evaluate(`window.setReactInput = (input, val) => {
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set;
      if (setter) setter.call(input, val);
      else input.value = val;
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
    }`);

    // Fill name and check OP23
    await evaluate(`(() => {
      const splitPanel = Array.from(document.querySelectorAll('.panel')).find(p => p.querySelector('h2')?.textContent?.includes('Podziel stanowisko'));
      const input = splitPanel.querySelector('input[placeholder="Nowe stanowisko"]');
      window.setReactInput(input, 'Nowe Stanowisko QA');

      // Find OP23 checkbox
      const labels = Array.from(splitPanel.querySelectorAll('label'));
      const op23Label = labels.find(l => l.textContent.includes('OP23'));
      if (!op23Label) throw new Error('OP23 checkbox label not found');
      const checkbox = op23Label.querySelector('input[type="checkbox"]');
      if (!checkbox.checked) checkbox.click();
    })()`);
    await sleep(600);

    console.log('10. Committing split and verifying layout error for missing table...');
    await evaluate(`(() => {
      const splitPanel = Array.from(document.querySelectorAll('.panel')).find(p => p.querySelector('h2')?.textContent?.includes('Podziel stanowisko'));
      const splitBtn = Array.from(splitPanel.querySelectorAll('button')).find(b => b.textContent.includes('Podziel i utwórz nowe ID'));
      if (!splitBtn) throw new Error('Split button not found');
      if (splitBtn.disabled) throw new Error('Split button is disabled; split criteria not satisfied');
      splitBtn.click();
    })()`);
    await sleep(1000);

    // Verify 18 stations
    const rowsAfterSplit = await evaluate(`window.getStationRows().length`);
    console.log(`Stations count after split: ${rowsAfterSplit}`);
    if (rowsAfterSplit !== 18) throw new Error(`Expected 18 stations after split, got ${rowsAfterSplit}`);

    // Verify layout error appears because new station has 0 tables (no silent invention of equipment!)
    const layoutErrors = await evaluate(`Array.from(document.querySelectorAll('.panel h2')).find(h => h.textContent.includes('Kontrola layoutu'))?.parentNode?.innerText || ''`);
    console.log('Layout control messages after split:\n' + layoutErrors);
    if (!layoutErrors.includes('Nowe Stanowisko QA') || !layoutErrors.includes('0 stołów')) {
      throw new Error(`Expected layout error for missing table on Nowe Stanowisko QA, got: ${layoutErrors}`);
    }

    // =========================================================================
    // STEP 4: Resolve missing table in StationGeometryEditor (Task 1.6)
    // =========================================================================
    console.log('11. Adding table for the new station in StationGeometryEditor...');
    await evaluate(`(() => {
      // Find geometry editor panel
      const geomPanel = Array.from(document.querySelectorAll('.panel')).find(p => p.querySelector('h2')?.textContent?.includes('Geometria 2D/3D stanowiska'));
      if (!geomPanel) throw new Error('Geometry panel not found');

      // Select new station in station select
      const stationSelect = geomPanel.querySelector('select');
      const newOpt = Array.from(stationSelect.options).find(o => o.textContent.includes('Nowe Stanowisko QA'));
      if (!newOpt) throw new Error('New station option not found in geometry editor');
      stationSelect.value = newOpt.value;
      stationSelect.dispatchEvent(new Event('change', { bubbles: true }));
    })()`);
    await sleep(600);

    // Click "Dodaj wyposażenie do ID" to reveal GeometryForm
    await evaluate(`(() => {
      const geomPanel = Array.from(document.querySelectorAll('.panel')).find(p => p.querySelector('h2')?.textContent?.includes('Geometria 2D/3D stanowiska'));
      const openFormBtn = Array.from(geomPanel.querySelectorAll('button')).find(b => b.textContent.includes('Dodaj wyposażenie do ID'));
      if (!openFormBtn) throw new Error('Open form button "Dodaj wyposażenie do ID" not found');
      openFormBtn.click();
    })()`);
    await sleep(600);

    // Add TableESD
    await evaluate(`(() => {
      const form = document.querySelector('form.panel');
      if (!form) throw new Error('GeometryForm not found');

      const nameInput = form.querySelector('label.field input[type="text"]') || form.querySelectorAll('input')[0];
      window.setReactInput(nameInput, 'Stół ESD QA');

      // Set dimensions
      const numInputs = form.querySelectorAll('input[type="number"]');
      // xMm (0), yMm (1), zMm (2), widthMm (3), lengthMm (4), heightMm (5), rotationDeg (6)
      window.setReactInput(numInputs[0], '1000');
      window.setReactInput(numInputs[1], '2000');
      window.setReactInput(numInputs[2], '0');
      window.setReactInput(numInputs[3], '1800');
      window.setReactInput(numInputs[4], '900');
      window.setReactInput(numInputs[5], '850');
      window.setReactInput(numInputs[6], '0');

      const submitBtn = Array.from(form.querySelectorAll('button')).find(b => b.textContent.includes('Dodaj obiekt do ID'));
      if (!submitBtn || submitBtn.disabled) throw new Error('Add equipment button not found or disabled');
      submitBtn.click();
    })()`);
    await sleep(1000);

    const layoutErrorsAfterAdd = await evaluate(`Array.from(document.querySelectorAll('.panel h2')).find(h => h.textContent.includes('Kontrola layoutu'))?.parentNode?.innerText || ''`);
    console.log('Layout control messages after adding table:', layoutErrorsAfterAdd);
    if (layoutErrorsAfterAdd.includes('Nowe Stanowisko QA: layout ma 0 stołów')) {
      throw new Error(`Table addition failed to clear missing table error: ${layoutErrorsAfterAdd}`);
    }

    // =========================================================================
    // STEP 5: Operation removal with retention of station ID & equipment (Task 1.5 & 1.6)
    // =========================================================================
    console.log('12. Removing operation OP10 with retention of station identity...');
    // Override window.confirm to auto-approve
    await evaluate(`window.confirm = () => true`);

    await evaluate(`(() => {
      const removePanel = Array.from(document.querySelectorAll('.panel')).find(p => p.querySelector('h2')?.textContent?.includes('Usuń operację ze stanowiska'));
      if (!removePanel) throw new Error('Remove operation panel not found');
      const select = removePanel.querySelector('select');
      const op10Opt = Array.from(select.options).find(o => o.value === 'OP10');
      if (!op10Opt) throw new Error('OP10 option not found in remove operation select');
      select.value = 'OP10';
      select.dispatchEvent(new Event('change', { bubbles: true }));
    })()`);
    await sleep(600);

    await evaluate(`(() => {
      const removePanel = Array.from(document.querySelectorAll('.panel')).find(p => p.querySelector('h2')?.textContent?.includes('Usuń operację ze stanowiska'));
      const removeBtn = Array.from(removePanel.querySelectorAll('button')).find(b => b.textContent.includes('Usuń operację z zachowaniem stanowiska'));
      if (!removeBtn || removeBtn.disabled) throw new Error('Remove operation button not found or disabled');
      removeBtn.click();
    })()`);
    await sleep(1000);

    // Verify Station 1 still exists with stable ID, empty ops, 0 cycle
    const rowsAfterRemoval = await evaluate(`window.getStationRows()`);

    console.log(`Station count after removing OP10: ${rowsAfterRemoval.length}`);
    if (rowsAfterRemoval.length !== 18) throw new Error(`Station count changed unexpectedly: ${rowsAfterRemoval.length}`);

    const station1 = rowsAfterRemoval.find(r => r.id === st1Id);
    if (!station1) throw new Error(`Station 1 (${st1Id}) disappeared after removing its operation!`);
    console.log(`Station 1 status: ID=${station1.id}, Name=${station1.name}, Ops=${station1.ops}, Cycle=${station1.cycle}`);
    if (station1.ops !== 'Puste' || !['0', '0,00', '0.00'].includes(station1.cycle)) {
      throw new Error(`Expected Station 1 to be Puste with cycle 0, got ops="${station1.ops}", cycle="${station1.cycle}"`);
    }

    // Test Undo/Redo of operation removal
    console.log('13. Testing Undo/Redo for operation removal...');
    await evaluate(`(() => {
      const section = document.querySelector('section[aria-label="Warsztat stanowisk v5"]');
      const undoBtn = Array.from(section.querySelectorAll('button')).find(b => b.textContent === 'Cofnij');
      if (!undoBtn) throw new Error('v5 Undo button not found');
      undoBtn.click();
    })()`);
    await sleep(800);

    const station1Restored = await evaluate(`window.getStationRows().find(r => r.id === '${st1Id}')`);
    console.log('Restored Station 1 after Undo:', station1Restored);
    if (!station1Restored.ops.includes('OP10')) throw new Error('OP10 not restored on Undo');

    await evaluate(`(() => {
      const section = document.querySelector('section[aria-label="Warsztat stanowisk v5"]');
      const redoBtn = Array.from(section.querySelectorAll('button')).find(b => b.textContent === 'Ponów');
      if (!redoBtn) throw new Error('v5 Redo button not found');
      redoBtn.click();
    })()`);
    await sleep(800);

    // =========================================================================
    // STEP 6: Persistence & Reopen Verification
    // =========================================================================
    console.log('14. Reloading page and verifying full persistence roundtrip...');
    await send('Page.reload');
    await sleep(2500);

    // Switch to Stanowiska v5
    await evaluate(`(() => {
      const btn = Array.from(document.querySelectorAll('nav.studio-nav button')).find(b => b.textContent.includes('Stanowiska v5'));
      btn.click();
    })()`);
    await sleep(1000);

    await evaluate(`window.getStationRows = () => {
      const table = Array.from(document.querySelectorAll('table')).find(t => Array.from(t.querySelectorAll('th')).some(th => th.textContent.includes('Trwałe ID')));
      if (!table) return [];
      return Array.from(table.querySelectorAll('tbody tr')).map(r => ({
        nr: r.children[0]?.textContent?.trim(),
        id: r.children[1]?.textContent?.trim(),
        name: r.children[2]?.textContent?.trim(),
        ops: r.children[3]?.textContent?.trim(),
        cycle: r.children[4]?.textContent?.trim()
      }));
    };`);
    const reloadedRows = await evaluate(`window.getStationRows()`);

    console.log(`Reloaded stations count: ${reloadedRows.length}`);
    if (reloadedRows.length !== 18) throw new Error(`Expected 18 stations after reload, got ${reloadedRows.length}`);

    const reloadedSt1 = reloadedRows.find(r => r.id === st1Id);
    if (!reloadedSt1 || reloadedSt1.ops !== 'Puste') {
      throw new Error(`Station 1 empty state not preserved after reload: ${JSON.stringify(reloadedSt1)}`);
    }

    const newStationRow = reloadedRows.find(r => r.name.includes('Nowe Stanowisko QA'));
    if (!newStationRow || !newStationRow.ops.includes('OP23')) {
      throw new Error(`New station not preserved after reload: ${JSON.stringify(newStationRow)}`);
    }

    // Capture screenshot
    console.log('15. Capturing screenshot to outputs/qa/verify_1_5_1_6_stable_ids.png...');
    const sc = await send('Page.captureScreenshot', { format: 'png' });
    writeFileSync('outputs/qa/verify_1_5_1_6_stable_ids.png', Buffer.from(sc.data, 'base64'));

    console.log('ALL VERIFICATIONS PASSED SUCCESSFULLY!');
  } finally {
    if (ws) ws.close();
    browser.kill();
    server.kill();
  }
}

run().catch(err => {
  console.error('VERIFICATION FAILED:', err);
  process.exit(1);
});
