import {spawn} from 'node:child_process';
import {mkdtempSync, rmSync, readFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {basename, dirname, join, resolve} from 'node:path';

const PORT = 5201, CDP_PORT = 9341;
const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const originalJson = readFileSync('tests/qa/Eko_D5_actual_export_v5.json', 'utf8');
const source = JSON.parse(originalJson);
const {processSteps, workstationSettings: _settings, ...rest} = source;
const profile = {durationSeconds: 120, durationBasis: 'assumed', manualWork: [], machineRun: [],
  operatorPresence: [{startSeconds: 10, endSeconds: 20, basis: 'assumed'},
    {startSeconds: 70, endSeconds: 80, basis: 'assumed'}]};
const project = {...rest, schemaVersion: 6, modelStatus: 'incomplete',
  operations: processSteps.map(({assignedWorkstationId: _assignment, ...operation}) => ({...operation,
    staffing: {requiredWorkers: 1, timeVariants: [{workerCount: 1, timeProfile: profile}]}})),
  stationSettings: Object.fromEntries(source.stations.map(station =>
    [station.id, {operators: 1, parallelStations: 2}])),
  workers: [{id: 'W-A', name: 'Anna'}], workerPools: [], equipment: [],
  product: null, subassemblies: [],
  workerRunSelection: {teamWorkerIds: ['W-A'], operations: processSteps.map(operation =>
    ({operationId: operation.id, workerCount: 1, eligibleWorkerIds: ['W-A']}))}};
const draft = {kind: 'domain-draft-save', version: 1, sourceSchemaVersion: 5,
  originalJson, project, at: '2026-10-05T12:00:00.000Z'};
const userData = mkdtempSync(join(tmpdir(), 'layout-schedule-qa-'));
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
  const pending = new Map(), errors = [];
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
    const response = await send('Runtime.evaluate', {expression, returnByValue: true, awaitPromise: true});
    if (response.exceptionDetails) throw new Error(response.exceptionDetails.exception?.description || response.exceptionDetails.text);
    return response.result.value;
  };
  const field = async (label, value) => {
    await evaluate(`(() => {const input = document.querySelector('input[aria-label=' + JSON.stringify(${JSON.stringify(label)}) + ']');
      if (!input) throw new Error('Brak pola ' + ${JSON.stringify(label)});
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
      setter.call(input, ${JSON.stringify(value)}); input.dispatchEvent(new Event('input', {bubbles: true}));
    })()`);
    await sleep(60);
  };
  await send('Page.enable'); await send('Runtime.enable');
  await send('Page.navigate', {url: `http://127.0.0.1:${PORT}/`});
  await sleep(900);
  await evaluate(`localStorage.setItem('layout-studio-stations-v5', JSON.stringify({project: JSON.parse(${JSON.stringify(originalJson)}), originalJson: '', at: '2026-10-05T12:00:00.000Z'}));
    localStorage.setItem('layout-studio-domain-v6-draft-v1', ${JSON.stringify(JSON.stringify(draft))})`);
  await send('Page.reload'); await sleep(900);
  await evaluate(`[...document.querySelectorAll('.studio-nav button')].find(item => item.textContent.includes('Stanowiska v5')).click()`);
  await sleep(300);
  const keys = ['layout-studio-v3', 'layout-studio-stations-v5', 'layout-studio-domain-v6-draft-v1'];
  const before = await evaluate(`JSON.stringify(${JSON.stringify(keys)}.map(key => localStorage.getItem(key)))`);
  await field('Liczba sztuk szkicu 6', '2');
  await field('Odstęp przybycia szkicu 6 [s]', '1');
  await evaluate(`document.querySelector('[aria-label="Harmonogram zespołu szkicu 6"] button').click()`);
  await sleep(250);
  const state = await evaluate(`(() => {const panel = document.querySelector('[aria-label="Harmonogram zespołu szkicu 6"]');
    return {error: panel.querySelector('[role="alert"]')?.textContent,
      summary: panel.querySelector('[role="status"]')?.textContent,
      rows: [...panel.querySelectorAll('tbody tr')].map(row => [...row.querySelectorAll('td')].map(cell => cell.textContent))};})()`);
  if (state.error || !state.summary?.includes('2 szt.') || state.rows.length !== project.operations.length * 2 ||
      !state.rows.some(row => row[8].includes('oczekiwanie na pracowników')) ||
      state.rows.some(row => row[3] !== 'W-A')) throw new Error(`Niepoprawny wynik UI: ${JSON.stringify(state)}`);
  const reservations = state.rows.map(row => ({start: Number(row[5]) + 10, end: Number(row[5]) + 80}))
    .sort((a, b) => a.start - b.start);
  if (reservations.some((item, index) => index && item.start < reservations[index - 1].end)) {
    throw new Error('Ta sama osoba ma nakładające się rezerwacje w wyniku UI.');
  }
  const after = await evaluate(`JSON.stringify(${JSON.stringify(keys)}.map(key => localStorage.getItem(key)))`);
  if (before !== after) throw new Error('Podgląd zmienił zapis szkicu lub aktywnych projektów 4/5.');
  await send('Page.reload'); await sleep(900);
  await evaluate(`[...document.querySelectorAll('.studio-nav button')].find(item => item.textContent.includes('Stanowiska v5')).click()`);
  await sleep(300);
  if (await evaluate(`!!document.querySelector('[aria-label="Harmonogram zespołu szkicu 6"] [role="status"]')`)) {
    throw new Error('Wynik podglądu został zapisany mimo deklarowanej nietrwałości.');
  }
  await field('Liczba sztuk szkicu 6', '2');
  await field('Odstęp przybycia szkicu 6 [s]', '1');
  await evaluate(`document.querySelector('[aria-label="Harmonogram zespołu szkicu 6"] button').click()`);
  await sleep(250);
  const reopened = await evaluate(`(() => {const panel = document.querySelector('[aria-label="Harmonogram zespołu szkicu 6"]');
    return [...panel.querySelectorAll('tbody tr')].map(row => [...row.querySelectorAll('td')].map(cell => cell.textContent));})()`);
  if (JSON.stringify(reopened) !== JSON.stringify(state.rows)) {
    throw new Error(`Ponowny odczyt zmienił wynik: ${JSON.stringify({before: state.rows, after: reopened})}`);
  }
  const afterReload = await evaluate(`JSON.stringify(${JSON.stringify(keys)}.map(key => localStorage.getItem(key)))`);
  const old = JSON.parse(before), current = JSON.parse(afterReload);
  if (JSON.stringify(JSON.parse(old[0]).project) !== JSON.stringify(JSON.parse(current[0]).project) ||
      old[1] !== current[1] || old[2] !== current[2]) {
    throw new Error('Ponowny odczyt zmienił projekt 4 albo dokładny zapis 5/6.');
  }
  await field('Odstęp przybycia szkicu 6 [s]', '');
  if (await evaluate(`!!document.querySelector('[aria-label="Harmonogram zespołu szkicu 6"] [role="status"]')`)) {
    throw new Error('Stary wynik pozostał widoczny po zmianie wejścia.');
  }
  await evaluate(`document.querySelector('[aria-label="Harmonogram zespołu szkicu 6"] button').click()`);
  await sleep(100);
  const refusal = await evaluate(`document.querySelector('[aria-label="Harmonogram zespołu szkicu 6"] [role="alert"]')?.textContent`);
  if (!refusal?.includes('jawny odstęp przybycia')) throw new Error('Nie pokazano odmowy brakującego odstępu.');
  if (errors.length) throw new Error(`Błędy konsoli: ${errors.join('; ')}`);
  console.log(`PASS: ${state.rows.length} wykonań, brak podwójnej rezerwacji, ponowny odczyt, odmowa braku danych i izolacja v4/v5/v6.`);
} finally {
  if (ws) ws.close();
  browser.kill(); server.kill();
  const temporaryProfile = resolve(userData);
  if (dirname(temporaryProfile) === resolve(tmpdir()) && basename(temporaryProfile).startsWith('layout-schedule-qa-')) {
    try {rmSync(temporaryProfile, {recursive: true, force: true});} catch {}
  }
}
