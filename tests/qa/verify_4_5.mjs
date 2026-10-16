import {spawn} from 'node:child_process';
import {mkdtempSync, readFileSync, writeFileSync, mkdirSync, existsSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {deepStrictEqual, strictEqual, ok} from 'node:assert';

const PORT = 5245;
const CDP = 9385;
const draftKey = 'layout-studio-domain-v6-draft-v1';
const variantsKey = 'layout-studio-domain-v6-variants-v1';
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

const source = JSON.parse(readFileSync('tests/qa/Eko_D5_actual_export_v5.json', 'utf8'));
source.name = 'Porównanie wariantów 4.5 — jawny test syntetyczny';
source.algorithm = 'Manual';
source.layoutObjects = [];
source.bom = [];
source.processSteps = ['QA-A', 'QA-C'].map((id, i) => ({
  id,
  name: `Operacja ${id}`,
  standardTimeSeconds: i === 0 ? 10 : 20,
  vaTimeSeconds: i === 0 ? 10 : 20,
  nvaTimeSeconds: 0,
  sequenceNumber: i + 1,
  predecessorIds: i ? ['QA-A'] : [],
  assignedWorkstationId: i === 0 ? 'ST-1' : 'ST-2',
}));
source.stations = [
  {id: 'ST-1', name: 'Stanowisko 1', operationIds: ['QA-A']},
  {id: 'ST-2', name: 'Stanowisko 2', operationIds: ['QA-C']},
  {id: 'ST-EMPTY', name: 'Puste', operationIds: []},
];
source.workstationSettings = {};

const originalJson = JSON.stringify(source);
const {processSteps, workstationSettings, ...rest} = source;

const profileA = {
  durationSeconds: 10,
  durationBasis: 'assumed',
  manualWork: [{startSeconds: 0, endSeconds: 10, basis: 'assumed'}],
  machineRun: [],
  operatorPresence: [{startSeconds: 0, endSeconds: 10, basis: 'assumed'}],
};
const profileC = {
  durationSeconds: 20,
  durationBasis: 'assumed',
  manualWork: [{startSeconds: 0, endSeconds: 10, basis: 'assumed'}],
  machineRun: [{startSeconds: 10, endSeconds: 20, basis: 'assumed'}],
  operatorPresence: [{startSeconds: 0, endSeconds: 10, basis: 'assumed'}],
};

const baseProject = {
  ...rest,
  schemaVersion: 6,
  modelStatus: 'incomplete',
  product: {id: 'PROD-QA', name: 'Wyrób porównawczy QA'},
  subassemblies: [],
  operations: processSteps.map(({assignedWorkstationId, ...s}, idx) => ({
    ...s,
    physicalRole: {kind: 'body-work'},
    staffing: {
      requiredWorkers: 1,
      timeVariants: [{workerCount: 1, timeProfile: structuredClone(idx === 0 ? profileA : profileC)}],
    },
  })),
  stationSettings: Object.fromEntries(source.stations.map(s => [s.id, {operators: 1, parallelStations: 1}])),
  workers: [{id: 'W-A', name: 'Osoba A'}, {id: 'W-B', name: 'Osoba B'}],
  workerPools: [],
  equipment: [{id: 'EQ-1', name: 'Uchwyt 1', stationId: 'ST-1', capableOperationIds: ['QA-A']}],
  workerRunSelection: {
    teamWorkerIds: ['W-A'],
    operations: processSteps.map(s => ({operationId: s.id, workerCount: 1, eligibleWorkerIds: ['W-A']})),
  },
  resourceCalendars: {
    workers: {
      'W-A': {shifts: [{startSeconds: 0, endSeconds: 1000, basis: 'assumed'}], breaks: []},
      'W-B': {shifts: [{startSeconds: 0, endSeconds: 1000, basis: 'assumed'}], breaks: []},
    },
    stations: Object.fromEntries(source.stations.map(s => [s.id, {shifts: [{startSeconds: 0, endSeconds: 1000, basis: 'assumed'}], breaks: []}])),
  },
  stationRouting: {
    selectionRule: 'earliest-start-then-shortest-route',
    equipmentPlacements: [{stationId: 'ST-1', copy: 1, equipmentId: 'EQ-1'}],
    operations: [
      {operationId: 'QA-A', candidates: [{stationId: 'ST-1', copy: 1, requiredEquipmentIds: ['EQ-1']}]},
      {operationId: 'QA-C', candidates: [{stationId: 'ST-2', copy: 1, requiredEquipmentIds: []}]},
    ],
    routes: [{
      id: 'R-1-2',
      from: {stationId: 'ST-1', copy: 1},
      to: {stationId: 'ST-2', copy: 1},
      distanceMm: 2000,
      basis: 'confirmed',
      source: 'Syntetyczna trasa bazowa QA',
      transportTime: {durationSeconds: 6, basis: 'assumed', source: 'Syntetyczny czas transportu bazowego QA'},
    }],
  },
  bodyRunInput: {
    bodies: [1, 2].map(i => ({id: `B-${i}`, productId: 'PROD-QA', location: {kind: 'station', stationId: 'ST-1', copy: 1}})),
    jobs: [1, 2].map(job => ({job, bodyId: `B-${job}`})),
  },
};

const workerProject = structuredClone(baseProject);
workerProject.workerRunSelection = {
  teamWorkerIds: ['W-A', 'W-B'],
  operations: processSteps.map(s => ({operationId: s.id, workerCount: 1, eligibleWorkerIds: ['W-A', 'W-B']})),
};

const stationProject = structuredClone(baseProject);
stationProject.stationSettings['ST-2'].parallelStations = 2;
stationProject.stationRouting.operations[1].candidates.push({stationId: 'ST-2', copy: 2, requiredEquipmentIds: []});
stationProject.stationRouting.routes.push({
  id: 'R-1-2B',
  from: {stationId: 'ST-1', copy: 1},
  to: {stationId: 'ST-2', copy: 2},
  distanceMm: 2000,
  basis: 'confirmed',
  source: 'Syntetyczna trasa do drugiej kopii ST-2',
  transportTime: {durationSeconds: 6, basis: 'assumed', source: 'Syntetyczny czas transportu bazowego QA'},
});

const layoutProject = structuredClone(baseProject);
layoutProject.targetLayoutType = 'Linear';
layoutProject.stationRouting.routes[0].distanceMm = 800;
layoutProject.stationRouting.routes[0].transportTime = {
  durationSeconds: 2,
  basis: 'assumed',
  source: 'Syntetyczny skrócony layout QA',
};

const draft = {
  kind: 'domain-draft-save',
  version: 1,
  sourceSchemaVersion: 5,
  originalJson,
  project: baseProject,
  at: '2026-10-16T12:00:00Z',
};

const edge = [
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
].find(existsSync);
if (!edge) throw new Error('Brak Edge');

const profileDir = mkdtempSync(join(tmpdir(), 'layout-qa-4-5-'));
const server = spawn('node', ['scripts/serve.mjs'], {
  env: {...process.env, PORT: String(PORT)},
  stdio: 'ignore',
  windowsHide: true,
});
const browser = spawn(
  edge,
  [
    `--remote-debugging-port=${CDP}`,
    `--user-data-dir=${profileDir}`,
    '--no-first-run',
    '--headless=new',
    '--disable-gpu',
    `http://127.0.0.1:${PORT}/`,
  ],
  {stdio: 'ignore', windowsHide: true},
);

let ws;
try {
  let target;
  for (let i = 0; i < 30; i++) {
    await sleep(200);
    try {
      target = (await (await fetch(`http://127.0.0.1:${CDP}/json/list`, {signal: AbortSignal.timeout(1000)})).json()).find(t => t.type === 'page');
      if (target) break;
    } catch {}
  }
  if (!target) throw new Error('Brak CDP');
  ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Timeout WebSocket CDP')), 5000);
    ws.onopen = () => {
      clearTimeout(timer);
      resolve();
    };
    ws.onerror = reject;
  });

  let sequence = 0;
  const pending = new Map();
  const errors = [];
  ws.onmessage = event => {
    const m = JSON.parse(event.data);
    if (m.method === 'Runtime.exceptionThrown') errors.push(m.params.exceptionDetails.text);
    if (pending.has(m.id)) {
      const p = pending.get(m.id);
      pending.delete(m.id);
      m.error ? p.reject(new Error(m.error.message)) : p.resolve(m.result);
    }
  };
  const send = (method, params = {}) =>
    new Promise((resolve, reject) => {
      const id = ++sequence;
      const timer = setTimeout(() => {
        pending.delete(id);
        reject(new Error(`Timeout CDP: ${method}`));
      }, 10000);
      pending.set(id, {
        resolve: value => {
          clearTimeout(timer);
          resolve(value);
        },
        reject: error => {
          clearTimeout(timer);
          reject(error);
        },
      });
      ws.send(JSON.stringify({id, method, params}));
    });
  const evaluate = async expression => {
    const r = await send('Runtime.evaluate', {expression, returnByValue: true, awaitPromise: true});
    if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description ?? r.exceptionDetails.text);
    return r.result.value;
  };
  const until = async expression => {
    for (let i = 0; i < 60; i++) {
      if (await evaluate(expression)) return;
      await sleep(100);
    }
    const bodyText = await evaluate(`document.querySelector('[aria-label="Podgląd modelu procesu v6"]')?.innerText?.slice(0, 800) ?? document.body?.innerText?.slice(0, 800) ?? ''`).catch(() => '');
    throw new Error(`Timeout: ${expression} | errors: ${errors.join('; ')} | body: ${bodyText}`);
  };

  await send('Page.enable');
  await send('Runtime.enable');
  await send('Emulation.setDeviceMetricsOverride', {width: 1600, height: 1650, deviceScaleFactor: 1, mobile: false});
  await send('Page.navigate', {url: `http://127.0.0.1:${PORT}/`});
  await until(`!!document.querySelector('.studio-nav')`);

  await evaluate(`
    localStorage.setItem(${JSON.stringify(draftKey)}, ${JSON.stringify(JSON.stringify(draft))});
    localStorage.setItem('layout-studio-stations-v5', ${JSON.stringify(JSON.stringify({project: source, originalJson: '', at: draft.at}))});
    localStorage.removeItem(${JSON.stringify(variantsKey)});
  `);

  const panel = 'Porównanie wariantów szkicu 6';
  const open = async () => {
    await send('Page.reload');
    await sleep(500);
    await until(`!!document.querySelector('.studio-nav')`);
    await evaluate(`[...document.querySelectorAll('.studio-nav button')].find(b => b.textContent.includes('Stanowiska v5')).click()`);
    await until(`!!document.querySelector('[aria-label="${panel}"]')`);
  };

  await open();
  await until(`!!localStorage.getItem('layout-studio-v3')`);
  await open();
  await sleep(600);

  const legacy5 = await evaluate(`localStorage.getItem('layout-studio-stations-v5')`);
  const legacy4 = await evaluate(`JSON.parse(localStorage.getItem('layout-studio-v3')).project`);

  const click = async (text, scope = panel) => {
    await evaluate(`(() => {
      const p = document.querySelector('[aria-label=' + ${JSON.stringify(JSON.stringify(scope))} + ']');
      if (!p) throw new Error('Brak sekcji: ' + ${JSON.stringify(scope)});
      const b = [...p.querySelectorAll('button')].find(b => b.textContent.trim() === ${JSON.stringify(text)});
      if (!b || b.disabled) throw new Error('Brak aktywnego przycisku: ' + ${JSON.stringify(text)});
      b.click();
    })()`);
    await sleep(100);
  };
  const field = async (label, value) => {
    await evaluate(`(() => {
      const e = document.querySelector('[aria-label=' + ${JSON.stringify(JSON.stringify(label))} + ']');
      if (!e) throw new Error('Brak pola: ' + ${JSON.stringify(label)});
      const prototype = e.tagName === 'SELECT' ? HTMLSelectElement.prototype : HTMLInputElement.prototype;
      Object.getOwnPropertyDescriptor(prototype, 'value').set.call(e, ${JSON.stringify(value)});
      e.dispatchEvent(new Event(e.tagName === 'SELECT' ? 'change' : 'input', {bubbles: true}));
    })()`);
    await sleep(60);
  };
  const toggle = async label => {
    await evaluate(`document.querySelector('[aria-label=' + ${JSON.stringify(JSON.stringify(label))} + ']').click()`);
    await sleep(60);
  };
  const panelText = () => evaluate(`document.querySelector('[aria-label="${panel}"]').textContent`);
  const savedDraftProject = () => evaluate(`JSON.parse(localStorage.getItem(${JSON.stringify(draftKey)})).project`);

  // 1. Zapis wariantu 1 (bazowy) przez UI, a pozostałych 3 przez zmianę szkicu i kliknięcie „Zapisz wariant szkicu 6”
  await field('Nazwa wariantu szkicu 6', '1. Wariant bazowy');
  await field('Typ porównywanego wariantu', 'baseline');
  await click('Zapisz wariant szkicu 6');
  ok((await panelText()).includes('Zapisano wariant szkicu 6 „1. Wariant bazowy”'), 'Brak potwierdzenia zapisu wariantu bazowego');

  const saveVariantThroughUi = async (projectData, name, category) => {
    await evaluate(`localStorage.setItem(${JSON.stringify(draftKey)}, ${JSON.stringify(JSON.stringify({...draft, project: projectData}))})`);
    await open();
    await field('Nazwa wariantu szkicu 6', name);
    await field('Typ porównywanego wariantu', category);
    await click('Zapisz wariant szkicu 6');
    ok((await panelText()).includes(`Zapisano wariant szkicu 6 „${name}”`), `Brak potwierdzenia zapisu: ${name}`);
  };

  await saveVariantThroughUi(workerProject, '2. Dodatkowy pracownik (+W-B)', 'additional-worker');
  await saveVariantThroughUi(stationProject, '3. Dodatkowe stanowisko (ST-2 kopia 2)', 'additional-station');
  await saveVariantThroughUi(layoutProject, '4. Zmieniony layout (trasa 800 mm / 2 s)', 'changed-layout');

  strictEqual(await evaluate(`JSON.parse(localStorage.getItem(${JSON.stringify(variantsKey)})).variants.length`), 4);
  const listText = await evaluate(`document.querySelector('[aria-label="Zapisane warianty szkicu 6"]').textContent`);
  ok(listText.includes('1. Wariant bazowy') && listText.includes('2. Dodatkowy pracownik (+W-B)') &&
     listText.includes('3. Dodatkowe stanowisko (ST-2 kopia 2)') && listText.includes('4. Zmieniony layout (trasa 800 mm / 2 s)'),
     'Lista wariantów nie zawiera wszystkich 4 wariantów');
  // Sprawdzenie, że dodatkowy pracownik nie dzieli czasu operacji (oba mają 30 s/szt.)
  ok(listText.includes('30 s/szt.'), 'Brak jawnej sumy czasów operacji 30 s/szt.');

  // 2. Uruchomienie porównania 4 wariantów w tle (Web Worker) przy tych samych warunkach eksperymentu (configured, batch=2, interval=1)
  await field('Liczba sztuk w porównaniu wariantów', '2');
  await field('Odstęp przybycia w porównaniu wariantów [s]', '1');
  await click('Porównaj warianty w symulacji (4)');
  await until(`!!document.querySelector('[aria-label="Wynik porównania wariantów szkicu 6"]')`);

  const resultsText = await evaluate(`document.querySelector('[aria-label="Wynik porównania wariantów szkicu 6"]').textContent`);
  ok(resultsText.includes('partia 2 szt.') && resultsText.includes('odstęp przybycia 1 s') && resultsText.includes('skonfigurowany'),
     'Brak nagłówka wspólnych warunków eksperymentu');
  ok(resultsText.includes('Obsada zespołu: 1 → 2 osób') &&
     resultsText.includes('kopie: 3 → 4') &&
     resultsText.includes('Trasy transportowe: 1 (2000 mm) → 1 (800 mm)'),
     'Brak opisu zmienionych czynników w wierszach wariantów');
  ok(!resultsText.includes('Uwaga:'), 'Nieoczekiwane ostrzeżenie porównywalności dla czystych jednoczynnikowych wariantów');
  ok(resultsText.includes('66 s') && resultsText.includes('62 s') && resultsText.includes('50 s') &&
     resultsText.includes('-4 s') && resultsText.includes('-16 s'),
     'Brak oczekiwanych czasów realizacji (makespan) i różnic względem bazy');
  ok(resultsText.includes('12 s (2 ruchów)') && resultsText.includes('4 s (2 ruchów)'),
     'Brak porównania czasu ruchów transportowych (12 s vs 4 s)');
  ok(resultsText.includes('Mieszane (bez podziału):'),
     'Brak jawnego oddzielenia oczekiwań mieszanych');

  // Zrzut ekranu tabeli porównawczej 4.5
  await evaluate(`document.querySelector('[aria-label="${panel}"]').scrollIntoView({block: 'start'})`);
  await sleep(200);
  mkdirSync('outputs/qa', {recursive: true});
  writeFileSync('outputs/qa/verify_4_5.png', Buffer.from((await send('Page.captureScreenshot', {format: 'png'})).data, 'base64'));

  // 3. Zmiana warunków eksperymentu natychmiast unieważnia tabelę wyników do czasu nowego przebiegu
  await toggle('Symulacja porównania bez transportu — just in time');
  ok(!(await evaluate(`!!document.querySelector('[aria-label="Wynik porównania wariantów szkicu 6"]')`)),
     'Zmiana trybu transportu nie unieważniła wyników porównania');

  // Ponowne porównanie w trybie JIT
  await click('Porównaj warianty w symulacji (4)');
  await until(`!!document.querySelector('[aria-label="Wynik porównania wariantów szkicu 6"]')`);
  const jitText = await evaluate(`document.querySelector('[aria-label="Wynik porównania wariantów szkicu 6"]').textContent`);
  ok(jitText.includes('just in time (bez transportu') && jitText.includes('JIT: pominięto trasy'),
     'Brak oznaczenia trybu i założeń JIT w wynikach porównania');

  // 4. Przywrócenie zapisanego wariantu do aktywnego szkicu 6 + obsługa Cofnij / Ponów
  const beforeRestore = await savedDraftProject();
  strictEqual(beforeRestore.targetLayoutType, 'Linear');
  await evaluate(`(() => {
    const rows = [...document.querySelectorAll('[aria-label="Zapisane warianty szkicu 6"] tbody tr')];
    const workerRow = rows.find(r => r.textContent.includes('2. Dodatkowy pracownik'));
    const btn = [...workerRow.querySelectorAll('button')].find(b => b.textContent.trim() === 'Wczytaj do szkicu 6');
    btn.click();
  })()`);
  await sleep(150);
  const afterRestore = await savedDraftProject();
  deepStrictEqual(afterRestore.workerRunSelection.teamWorkerIds, ['W-A', 'W-B']);
  ok(!(await evaluate(`!!document.querySelector('[aria-label="Wynik porównania wariantów szkicu 6"]')`)),
     'Wczytanie wariantu do szkicu nie unieważniło wyników porównania');

  // Cofnij i Ponów dane szkicu
  await click('Cofnij dane szkicu');
  deepStrictEqual((await savedDraftProject()).workerRunSelection.teamWorkerIds, ['W-A']);
  await click('Ponów dane szkicu');
  deepStrictEqual((await savedDraftProject()).workerRunSelection.teamWorkerIds, ['W-A', 'W-B']);

  // 5. Reload strony zachowuje bibliotekę 4 wariantów i izolację projektów 4/5 oraz originalJson
  await open();
  strictEqual(await evaluate(`JSON.parse(localStorage.getItem(${JSON.stringify(variantsKey)})).variants.length`), 4);
  strictEqual(await evaluate(`localStorage.getItem('layout-studio-stations-v5')`), legacy5);
  deepStrictEqual(await evaluate(`JSON.parse(localStorage.getItem('layout-studio-v3')).project`), legacy4);
  strictEqual(await evaluate(`JSON.parse(localStorage.getItem(${JSON.stringify(draftKey)})).originalJson`), originalJson);
  ok(!errors.length, errors.join('; '));

  console.log('PASS 4.5 UI: zapis 4 wariantów (bazowy, pracownik, stanowisko, layout), wspólne warunki eksperymentu (configured/JIT) w Web Workerze, kontrola czynników, nierozdzielanie oczekiwań mieszanych, unieważnienie, przywracanie + Cofnij/Ponów, reload i izolacja 4/5.');
} finally {
  ws?.close();
  browser.kill();
  server.kill();
}
