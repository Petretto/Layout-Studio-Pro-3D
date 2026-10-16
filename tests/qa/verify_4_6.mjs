import {spawn} from 'node:child_process';
import {mkdtempSync, readFileSync, writeFileSync, mkdirSync, existsSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {deepStrictEqual, strictEqual, ok} from 'node:assert';

const PORT = 5246;
const CDP = 9386;
const draftKey = 'layout-studio-domain-v6-draft-v1';
const variantsKey = 'layout-studio-domain-v6-variants-v1';
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

const source = JSON.parse(readFileSync('tests/qa/Eko_D5_actual_export_v5.json', 'utf8'));
source.name = 'Zestawienie wskaźników wariantów 4.6 — jawny test syntetyczny';
source.algorithm = 'Manual';
source.layoutObjects = [];
source.obstacles = [];
source.facility = {widthMm: 10000, lengthMm: 20000, heightMm: 4000, gridSizeMm: 500};
source.bom = [
  {
    id: 'BOM-46-1',
    partNumber: 'PN-46-A',
    name: 'Korpus podstawowy QA',
    quantityPerUnit: 2,
    container: 'BoxKLT',
    packageQuantity: 10,
    associatedProcessStepId: 'QA-A',
    unitCost: 25,
  },
];
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
layoutProject.layoutObjects = [
  {
    id: 'OBJ-ST-1',
    name: 'Stół montażowy ST-1',
    type: 'Table',
    xMm: 2000,
    yMm: 2000,
    zMm: 0,
    widthMm: 2000,
    lengthMm: 1000,
    heightMm: 900,
    rotationDeg: 0,
    colorHex: '#2563eb',
    workstationId: 'ST-1',
  },
  {
    id: 'OBJ-ST-2',
    name: 'Stół montażowy ST-2',
    type: 'Table',
    xMm: 5000,
    yMm: 2000,
    zMm: 0,
    widthMm: 2000,
    lengthMm: 1000,
    heightMm: 900,
    rotationDeg: 0,
    colorHex: '#16a34a',
    workstationId: 'ST-2',
  },
];

const draft = {
  kind: 'domain-draft-save',
  version: 1,
  sourceSchemaVersion: 5,
  originalJson,
  project: baseProject,
  at: '2026-10-16T12:00:00Z',
};

const variantsSave = {
  kind: 'domain-variant-library',
  version: 1,
  variants: [
    {
      id: 'VAR-1',
      name: '1. Wariant bazowy (1 os.)',
      category: 'baseline',
      at: '2026-10-16T12:01:00Z',
      sourceSchemaVersion: 5,
      originalJson,
      project: baseProject,
    },
    {
      id: 'VAR-2',
      name: '2. Dodatkowy pracownik (+W-B)',
      category: 'additional-worker',
      at: '2026-10-16T12:02:00Z',
      sourceSchemaVersion: 5,
      originalJson,
      project: workerProject,
    },
    {
      id: 'VAR-3',
      name: '3. Dodatkowe stanowisko (ST-2#2)',
      category: 'additional-station',
      at: '2026-10-16T12:03:00Z',
      sourceSchemaVersion: 5,
      originalJson,
      project: stationProject,
    },
    {
      id: 'VAR-4',
      name: '4. Zmieniony layout (obiekty 4 m², trasa 2 s)',
      category: 'changed-layout',
      at: '2026-10-16T12:04:00Z',
      sourceSchemaVersion: 5,
      originalJson,
      project: layoutProject,
    },
  ],
};

const edge = [
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
].find(existsSync);
if (!edge) throw new Error('Brak Edge');

const profileDir = mkdtempSync(join(tmpdir(), 'layout-qa-4-6-'));
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
  await send('Emulation.setDeviceMetricsOverride', {width: 1680, height: 1850, deviceScaleFactor: 1, mobile: false});
  await send('Page.navigate', {url: `http://127.0.0.1:${PORT}/`});
  await until(`!!document.querySelector('.studio-nav')`);

  await evaluate(`
    localStorage.setItem(${JSON.stringify(draftKey)}, ${JSON.stringify(JSON.stringify(draft))});
    localStorage.setItem(${JSON.stringify(variantsKey)}, ${JSON.stringify(JSON.stringify(variantsSave))});
    localStorage.setItem('layout-studio-stations-v5', ${JSON.stringify(JSON.stringify({project: source, originalJson: '', at: draft.at}))});
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
  const panelText = () => evaluate(`document.querySelector('[aria-label="${panel}"]').textContent`);

  // 1. Porównanie bez podanych stawek kosztowych — brak zgadywania kosztów, ale obecne BOM/szt. (50 wg BOM)
  await field('Liczba sztuk w porównaniu wariantów', '2');
  await field('Odstęp przybycia w porównaniu wariantów [s]', '1');
  await click('Porównaj warianty w symulacji (4)');
  await until(`!!document.querySelector('[aria-label="Tabela syntezy wskaźników 4.6"]')`);

  const noCostSynth = await evaluate(`document.querySelector('[aria-label="Tabela syntezy wskaźników 4.6"]').textContent`);
  ok(noCostSynth.includes('Brak podanych stawek (koszty operacyjne i powierzchniowe nie są zgadywane)'),
     'Brak jawnej informacji o niezgadywaniu kosztów przy pustych stawkach');
  ok(noCostSynth.includes('BOM/szt.: 50 (wg BOM)'), 'Brak wyliczonego kosztu BOM/szt. (2 * 25 = 50)');
  ok(noCostSynth.includes('Stat. pułap kopii: 180 szt./h'), 'Brak statycznego pułapu kopii 180 szt./h (3600 / 20 s)');
  ok(noCostSynth.includes('brak ob. layoutObjects') && noCostSynth.includes('Obrys zespołu ob.: 5 m²'),
     'Brak rozróżnienia braku obiektów layoutObjects od obrysu 5 m² w wariancie zmienionego layoutu');

  // 2. Odmowa walidacji, gdy wpisano stawkę bez jawnego źródła/założenia
  await field('Jawna stawka godzinowa operatora', '120');
  ok(!(await evaluate(`!!document.querySelector('[aria-label="Tabela syntezy wskaźników 4.6"]')`)),
     'Wpisanie stawki nie unieważniło poprzedniego raportu porównania');
  await click('Porównaj warianty w symulacji (4)');
  ok((await panelText()).includes('Koszty wariantów: podaj jawne źródło lub opis założeń'),
     'Brak odmowy przy wpisaniu stawki bez jawnego źródła');

  // 3. Wpisanie pełnych jawnych stawek i założeń kosztowych oraz porównanie 4 wariantów
  await field('Waluta stawek kosztowych wariantów', 'PLN');
  await field('Podstawa stawek kosztowych wariantów', 'assumed');
  await field('Rozliczanie czasu zasobów w kosztach wariantów', 'committed-makespan');
  await field('Jawna stawka godzinowa operatora', '120');
  await field('Jawna stawka godzinowa stanowiska', '60');
  await field('Jawna stawka powierzchni m2', '50');
  await field('Źródło i założenia stawek kosztowych', 'Kalkulacja kontrolingu Q4 2026 (założenie testowe QA)');

  await click('Porównaj warianty w symulacji (4)');
  await until(`!!document.querySelector('[aria-label="Tabela syntezy wskaźników 4.6"]')`);

  const synthText = await evaluate(`document.querySelector('[aria-label="Tabela syntezy wskaźników 4.6"]').textContent`);
  ok(synthText.includes('Kalkulacja kontrolingu Q4 2026') && synthText.includes('PLN/szt.'),
     'Brak wyliczonych kosztów operacyjnych i źródła stawek w tabeli syntezy 4.6');
  ok(synthText.includes('Pow. obiektów: 200 PLN') && synthText.includes('Hala: 10000 PLN'),
     'Brak wyliczonego kosztu powierzchni obiektów (4 m² * 50 = 200 PLN) oraz hali (200 m² * 50 = 10000 PLN)');
  ok(synthText.includes('W procesie śr.:') && synthText.includes('W systemie (od przybycia) śr.:'),
     'Brak obu miar WIP (w procesie i w systemie)');
  ok(synthText.includes('Sprawność przepływu:'), 'Brak wskaźnika sprawności przepływu');

  // 4. Podgląd raportu Markdown (.md)
  await click('Pokaż podgląd raportu (.md)');
  await until(`!!document.querySelector('[aria-label="Podgląd raportu Markdown porównania wariantów"]')`);
  const mdText = await evaluate(`document.querySelector('[aria-label="Podgląd raportu Markdown porównania wariantów"]').textContent`);
  ok(mdText.includes('# Raport porównania wariantów szkicu 6 (4.5 / 4.6)') &&
     mdText.includes('Kalkulacja kontrolingu Q4 2026'),
     'Podgląd raportu Markdown nie zawiera pełnej syntezy 4.6');

  // Zrzut ekranu zestawienia 4.6
  await evaluate(`document.querySelector('[aria-label="Tabela syntezy wskaźników 4.6"]').scrollIntoView({block: 'center'})`);
  await sleep(200);
  mkdirSync('outputs/qa', {recursive: true});
  writeFileSync('outputs/qa/verify_4_6.png', Buffer.from((await send('Page.captureScreenshot', {format: 'png'})).data, 'base64'));

  // 5. Sprawdzenie ochrony projektów 4/5 i originalJson
  strictEqual(await evaluate(`localStorage.getItem('layout-studio-stations-v5')`), legacy5);
  deepStrictEqual(await evaluate(`JSON.parse(localStorage.getItem('layout-studio-v3')).project`), legacy4);
  strictEqual(await evaluate(`JSON.parse(localStorage.getItem(${JSON.stringify(draftKey)})).originalJson`), originalJson);
  ok(!errors.length, errors.join('; '));

  console.log('PASS 4.6 UI: tabela syntezy (wydajność stat./dyn., czas przejścia, WIP, obsada i wykorzystanie, powierzchnia obiektów/obrysu/hali, koszty przy jawnych stawkach i założeniach), odmowa braku źródła stawek, brak zgadywania przy pustych stawkach, podgląd raportu Markdown (.md) oraz izolacja 4/5.');
} finally {
  ws?.close();
  browser.kill();
  server.kill();
}
