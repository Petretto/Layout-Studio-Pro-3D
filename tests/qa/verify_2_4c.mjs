import {spawn} from 'node:child_process';
import {mkdtempSync, rmSync, mkdirSync, readFileSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {basename, dirname, join, resolve} from 'node:path';

const PORT = 5200, CDP_PORT = 9340;
const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const originalJson = readFileSync('tests/qa/Eko_D5_actual_export_v5.json', 'utf8');
const source = JSON.parse(originalJson);
const {processSteps, workstationSettings, ...rest} = source;
const profile = {durationSeconds: 90, durationBasis: 'assumed', manualWork: [], machineRun: [],
  operatorPresence: [{startSeconds: 10, endSeconds: 30, basis: 'assumed'}]};
const project = {...rest, schemaVersion: 6, modelStatus: 'incomplete',
  operations: processSteps.map(({assignedWorkstationId: _assignment, ...operation}) => ({...operation,
    staffing: {requiredWorkers: 1, timeVariants: [{workerCount: 1, timeProfile: profile}]}})),
  stationSettings: workstationSettings, workers: [{id: 'W-A', name: 'Anna'}, {id: 'W-B', name: 'Bartek'}],
  workerPools: [], equipment: [], product: null, subassemblies: []};
const initialDraft = {kind: 'domain-draft-save', version: 1, sourceSchemaVersion: 5,
  originalJson, project, at: '2026-10-05T12:00:00.000Z'};
const userData = mkdtempSync(join(tmpdir(), 'layout-run-qa-'));
const server = spawn('node', ['scripts/serve.mjs'], {env: {...process.env, PORT: String(PORT)}, stdio: 'ignore'});
const browser = spawn(EDGE, [`--remote-debugging-port=${CDP_PORT}`, '--headless=new', '--disable-gpu',
  '--no-first-run', '--no-default-browser-check', '--disable-extensions',
  `--user-data-dir=${userData}`, 'about:blank'], {stdio: 'ignore'});
let ws;

try {
  let target;
  for (let i = 0; i < 30; i++) {
    await sleep(350);
    try {
      const response = await fetch(`http://127.0.0.1:${CDP_PORT}/json/list`);
      target = (await response.json()).find(item => item.type === 'page' && item.webSocketDebuggerUrl);
      if (target) break;
    } catch {}
  }
  if (!target) throw new Error('Nie udało się połączyć z Edge CDP.');
  ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {ws.onopen = resolve; ws.onerror = reject;});
  let id = 0;
  const pending = new Map();
  const errors = [];
  ws.onmessage = event => {
    const message = JSON.parse(event.data);
    if (message.method === 'Runtime.exceptionThrown') errors.push(message.params.exceptionDetails.text);
    if (message.id && pending.has(message.id)) {
      const {resolve, reject} = pending.get(message.id);
      pending.delete(message.id);
      message.error ? reject(new Error(message.error.message)) : resolve(message.result);
    }
  };
  const send = (method, params = {}) => new Promise((resolve, reject) => {
    const requestId = ++id;
    pending.set(requestId, {resolve, reject});
    ws.send(JSON.stringify({id: requestId, method, params}));
  });
  const evaluate = async expression => {
    const result = await send('Runtime.evaluate', {expression, returnByValue: true, awaitPromise: true});
    if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text);
    return result.result.value;
  };
  const click = async label => {
    await evaluate(`(() => {
      const button = [...document.querySelectorAll('section[aria-label="Podgląd modelu procesu v6"] button')]
        .find(item => item.textContent.trim() === ${JSON.stringify(label)});
      if (!button || button.disabled) throw new Error('Brak aktywnego przycisku: ' + ${JSON.stringify(label)});
      button.click();
    })()`);
    await sleep(80);
  };
  const checkbox = async (fieldLabel, index) => {
    await evaluate(`(() => {
      const field = document.querySelector('fieldset[aria-label=' + JSON.stringify(${JSON.stringify(fieldLabel)}) + ']');
      const item = field?.querySelectorAll('input[type="checkbox"]')[${index}];
      if (!item) throw new Error('Brak pola wyboru: ' + ${JSON.stringify(fieldLabel)});
      item.click();
    })()`);
    await sleep(40);
  };
  const choose = async (label, value) => {
    await evaluate(`(() => {
      const select = document.querySelector('select[aria-label=' + JSON.stringify(${JSON.stringify(label)}) + ']');
      if (!select) throw new Error('Brak listy: ' + ${JSON.stringify(label)});
      select.value = ${JSON.stringify(value)};
      select.dispatchEvent(new Event('change', {bubbles: true}));
    })()`);
    await sleep(40);
  };
  const saved = () => evaluate(`JSON.parse(localStorage.getItem('layout-studio-domain-v6-draft-v1'))`);
  const raw = () => evaluate(`localStorage.getItem('layout-studio-domain-v6-draft-v1')`);
  const openStations = async () => {
    await evaluate(`[...document.querySelectorAll('.studio-nav button')].find(item => item.textContent.includes('Stanowiska v5')).click()`);
    await sleep(300);
  };
  await send('Page.enable');
  await send('Runtime.enable');
  await send('Emulation.setDeviceMetricsOverride', {width: 1440, height: 1100, deviceScaleFactor: 1, mobile: false});
  await send('Page.navigate', {url: `http://127.0.0.1:${PORT}/`});
  await sleep(900);
  await evaluate(`localStorage.setItem('layout-studio-stations-v5', JSON.stringify({project: JSON.parse(${JSON.stringify(originalJson)}), originalJson: '', at: '2026-10-05T12:00:00.000Z'}));
    localStorage.setItem('layout-studio-domain-v6-draft-v1', ${JSON.stringify(JSON.stringify(initialDraft))})`);
  await send('Page.reload');
  await sleep(900);
  await openStations();
  const v4Before = await evaluate(`JSON.stringify(JSON.parse(localStorage.getItem('layout-studio-v3')).project)`);
  const v5Before = await evaluate(`localStorage.getItem('layout-studio-stations-v5')`);
  const oldRaw = await raw();
  await checkbox('Stały skład przebiegu', 0);
  await checkbox('Stały skład przebiegu', 1);
  for (const operation of project.operations) {
    await choose(`Wariant przebiegu ${operation.id}`, '1');
    await checkbox(`Wybór przebiegu ${operation.id}`, 0);
  }
  await click('Zapisz wybór zespołu przebiegu');
  let selection = (await saved()).project.workerRunSelection;
  if (selection?.teamWorkerIds.join(',') !== 'W-A,W-B' || selection.operations.length !== project.operations.length ||
      selection.operations.some(item => item.workerCount !== 1 || item.eligibleWorkerIds.join(',') !== 'W-A')) {
    throw new Error('Nie zapisano jawnego składu, wariantów i dopuszczonych osób.');
  }
  await click('Cofnij dane szkicu');
  if ((await saved()).project.workerRunSelection !== undefined) throw new Error('Cofnij nie usunęło wyboru.');
  await click('Ponów dane szkicu');
  if (!(await saved()).project.workerRunSelection) throw new Error('Ponów nie przywróciło wyboru.');
  await send('Page.reload');
  await sleep(900);
  await openStations();
  selection = (await saved()).project.workerRunSelection;
  if (!selection || selection.operations.length !== project.operations.length) throw new Error('Nie odczytano wyboru po przeładowaniu.');
  const first = project.operations[0].id;
  if (await evaluate(`document.querySelector('select[aria-label="Wariant przebiegu ${first}"]').value`) !== '1') {
    throw new Error('Formularz nie odczytał wariantu po przeładowaniu.');
  }
  const isolation = {source: (await saved()).originalJson === originalJson,
    v4: await evaluate(`JSON.stringify(JSON.parse(localStorage.getItem('layout-studio-v3')).project)`) === v4Before,
    v5: await evaluate(`localStorage.getItem('layout-studio-stations-v5')`) === v5Before};
  if (Object.values(isolation).some(value => !value)) throw new Error(`Zmieniono źródło lub aktywny projekt 4/5: ${JSON.stringify(isolation)}`);
  await evaluate(`document.querySelector('[aria-label="Plan zespołu przebiegu szkicu 6"]').scrollIntoView()`);
  mkdirSync('outputs/qa', {recursive: true});
  const shot = await send('Page.captureScreenshot', {format: 'png'});
  writeFileSync('outputs/qa/verify_2_4c_run_selection.png', Buffer.from(shot.data, 'base64'));
  const beforeInvalid = await raw();
  await checkbox('Stały skład przebiegu', 0);
  await click('Zapisz wybór zespołu przebiegu');
  if (await raw() !== beforeInvalid) throw new Error('Niepełny wybór nadpisał szkic.');
  const rejection = await evaluate(`document.querySelector('[aria-label="Plan zespołu przebiegu szkicu 6"] [role="alert"]')?.textContent`);
  if (!rejection?.includes('ustalonego składu')) throw new Error('Nie pokazano przyczyny odmowy zapisu.');
  await click('Usuń wybór przebiegu');
  if ((await saved()).project.workerRunSelection !== undefined) throw new Error('Nie usunięto wyboru przebiegu.');
  await click('Cofnij dane szkicu');
  if (!(await saved()).project.workerRunSelection) throw new Error('Cofnij nie przywróciło usuniętego wyboru.');
  await click('Ponów dane szkicu');
  if ((await saved()).project.workerRunSelection !== undefined) throw new Error('Ponów nie usunęło wyboru ponownie.');
  if (errors.length) throw new Error(`Błędy konsoli: ${errors.join('; ')}`);
  console.log(`PASS: ${project.operations.length} operacji, zapis, odmowa błędu, usunięcie, Cofnij/Ponów, odczyt i izolacja v4/v5.`);
} finally {
  if (ws) ws.close();
  browser.kill();
  server.kill();
  const temporaryProfile = resolve(userData);
  if (dirname(temporaryProfile) === resolve(tmpdir()) && basename(temporaryProfile).startsWith('layout-run-qa-')) {
    try {rmSync(temporaryProfile, {recursive: true, force: true});} catch {}
  }
}
