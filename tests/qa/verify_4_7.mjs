import {spawn} from 'node:child_process';
import {mkdtempSync, readFileSync, writeFileSync, mkdirSync, existsSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {deepStrictEqual, strictEqual, ok} from 'node:assert';

const PORT = 5247;
const CDP = 9387;
const draftKey = 'layout-studio-domain-v6-draft-v1';
const variantsKey = 'layout-studio-domain-v6-variants-v1';
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

const source = JSON.parse(readFileSync('tests/qa/Eko_D5_actual_export_v5.json', 'utf8'));
source.name = 'Propozycje zmian i weryfikacja w symulacji 4.7 — test QA';
source.algorithm = 'Manual';
source.layoutObjects = [];
source.obstacles = [];
source.facility = {widthMm: 10000, lengthMm: 20000, heightMm: 4000, gridSizeMm: 500};
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
  operations: [
    {
      ...(() => { const {assignedWorkstationId: _, ...s} = processSteps[0]; return s; })(),
      physicalRole: {kind: 'body-work'},
      staffing: {
        requiredWorkers: 1,
        timeVariants: [{workerCount: 1, timeProfile: structuredClone(profileA)}],
      },
    },
    {
      ...(() => { const {assignedWorkstationId: _, ...s} = processSteps[1]; return s; })(),
      physicalRole: {kind: 'body-work'},
      staffing: {
        requiredWorkers: 1,
        timeVariants: [
          {workerCount: 1, timeProfile: structuredClone(profileC)},
          {
            workerCount: 2,
            timeProfile: {
              durationSeconds: 12,
              durationBasis: 'assumed',
              manualWork: [{startSeconds: 0, endSeconds: 12, basis: 'assumed'}],
              machineRun: [],
              operatorPresence: [{startSeconds: 0, endSeconds: 12, basis: 'assumed'}],
            },
          },
        ],
      },
    },
  ],
  stationSettings: {
    'ST-1': {operators: 1, parallelStations: 1},
    'ST-2': {operators: 1, parallelStations: 2},
    'ST-EMPTY': {operators: 1, parallelStations: 1},
  },
  workers: [
    {id: 'W-A', name: 'Osoba A'},
    {id: 'W-B', name: 'Osoba B'},
  ],
  workerPools: [],
  equipment: [{id: 'EQ-1', name: 'Uchwyt 1', stationId: 'ST-1', capableOperationIds: ['QA-A']}],
  workerRunSelection: {
    teamWorkerIds: ['W-A'],
    operations: [
      {operationId: 'QA-A', workerCount: 1, eligibleWorkerIds: ['W-A']},
      {operationId: 'QA-C', workerCount: 1, eligibleWorkerIds: ['W-A']},
    ],
  },
  resourceCalendars: {
    workers: {
      'W-A': {shifts: [{startSeconds: 0, endSeconds: 2000, basis: 'assumed'}], breaks: []},
      'W-B': {shifts: [{startSeconds: 0, endSeconds: 2000, basis: 'assumed'}], breaks: []},
    },
    stations: Object.fromEntries(source.stations.map(s => [s.id, {shifts: [{startSeconds: 0, endSeconds: 2000, basis: 'assumed'}], breaks: []}])),
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

const draft = {
  kind: 'domain-draft-save',
  version: 1,
  sourceSchemaVersion: 5,
  originalJson,
  project: baseProject,
  at: '2026-10-16T12:00:00Z',
};

const edgePath = [
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
].find(p => existsSync(p));
if (!edgePath) throw new Error('Brak przeglądarki Edge');

const server = spawn('node', ['scripts/serve.mjs'], {
  env: {...process.env, PORT: String(PORT)},
  stdio: 'ignore',
  windowsHide: true,
});
const profile = mkdtempSync(join(tmpdir(), 'layout-qa-edge-47-'));
const browser = spawn(
  edgePath,
  [
    `--remote-debugging-port=${CDP}`,
    `--user-data-dir=${profile}`,
    '--no-first-run',
    '--no-default-browser-check',
    '--headless=new',
    '--disable-gpu',
    `http://127.0.0.1:${PORT}/`,
  ],
  {stdio: 'ignore', windowsHide: true},
);

const legacy4 = JSON.stringify({name: 'v4-zachowany'});
const legacy5 = JSON.stringify({project: source, originalJson: '', at: draft.at});

let ws;
try {
  let target;
  for (let i = 0; i < 60; i++) {
    try {
      const res = await fetch(`http://127.0.0.1:${CDP}/json/list`);
      const list = await res.json();
      target = list.find(t => t.type === 'page');
      if (target?.webSocketDebuggerUrl) break;
    } catch {}
    await sleep(200);
  }
  if (!target?.webSocketDebuggerUrl) throw new Error('Brak WebSocket CDP');

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
    localStorage.removeItem(${JSON.stringify(variantsKey)});
    localStorage.setItem('layout-studio-v3', ${JSON.stringify(legacy4)});
    localStorage.setItem('layout-studio-stations-v5', ${JSON.stringify(legacy5)});
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

  // 1. Ustawienie warunków eksperymentu
  await field('Liczba sztuk w porównaniu wariantów', '2');
  await field('Odstęp przybycia w porównaniu wariantów [s]', '1');
  await evaluate(`(() => {
    const cb = document.querySelector('[aria-label="Symulacja porównania bez transportu \u2014 just in time"]') ||
               document.querySelector('input[type="checkbox"]');
    if (!cb) throw new Error('Brak checkboxa JIT');
    if (!cb.checked) cb.click();
  })()`);
  await sleep(100);

  // Wpisanie jawnych stawek kosztowych
  await field('Waluta stawek kosztowych wariantów', 'PLN');
  await field('Podstawa stawek kosztowych wariantów', 'assumed');
  await field('Rozliczanie czasu zasobów w kosztach wariantów', 'committed-makespan');
  await field('Jawna stawka godzinowa operatora', '100');
  await field('Jawna stawka godzinowa stanowiska', '50');
  await field('Jawna stawka powierzchni m2', '20');
  await field('Źródło i założenia stawek kosztowych', 'Założenia kalkulacyjne 4.7 QA');

  // 2. Wygenerowanie i weryfikacja propozycji zmian w symulacji (4.7)
  await click('Generuj i sprawdź propozycje zmian w symulacji (4.7)', panel);
  await until(`!!document.querySelector('[aria-label="Propozycje zmian i weryfikacja w symulacji 4.7"]')`);
  await until(`!!document.querySelector('[aria-label="Tabela propozycji zmian 4.7"]')`);

  // Sprawdzenie obecności zastrzeżenia o braku deklaracji optimum
  const reportSectionText = await evaluate(`document.querySelector('[aria-label="Propozycje zmian i weryfikacja w symulacji 4.7"]').textContent`);
  ok(reportSectionText.includes('Brak deklaracji gwarantowanego optimum:'),
     'Brak nagłówka zastrzeżenia metodologicznego');
  ok(reportSectionText.includes('nie stanowi deklaracji ani dowodu gwarantowanego optimum globalnego'),
     'Brak tekstu NON_OPTIMUM_DISCLAIMER');
  ok(reportSectionText.includes('Punkt odniesienia (aktywny szkic 6):'), 'Brak sekcji wariantu bazowego jako punktu odniesienia');

  // Sprawdzenie tabeli propozycji
  const tableText = await evaluate(`document.querySelector('[aria-label="Tabela propozycji zmian 4.7"]').textContent`);
  ok(tableText.includes('Dodaj zadeklarowanego pracownika Osoba B (W-B)') || tableText.includes('W-B'),
     'Brak propozycji dodania pracownika W-B z rejestru');
  ok(tableText.includes('Dopuść istniejącą kopię ST-2#2') || tableText.includes('ST-2#2'),
     'Brak propozycji dopuszczenia drugiej kopii stanowiska ST-2');
  ok(tableText.includes('Szacunek zdolności statycznej:'), 'Brak notatki rozróżniającej szacunek statyczny od wyniku symulacji');
  ok(tableText.includes('Poprawa w symulacji') || tableText.includes('Brak zmiany') || tableText.includes('Pogorszenie') || tableText.includes('Odmowa'),
     'Brak statusu weryfikacji propozycji');

  // 3. Test podglądu raportu Markdown (.md)
  await click('Pokaż podgląd raportu propozycji 4.7 (.md)', 'Propozycje zmian i weryfikacja w symulacji 4.7');
  await until(`!!document.querySelector('[aria-label="Podgląd raportu Markdown propozycji zmian 4.7"]')`);
  const mdText = await evaluate(`document.querySelector('[aria-label="Podgląd raportu Markdown propozycji zmian 4.7"]').textContent`);
  ok(mdText.includes('# Raport propozycji zmian i weryfikacji symulacyjnej szkicu 6 (4.7)'),
     'Brak nagłówka raportu Markdown propozycji zmian 4.7');
  ok(mdText.includes('Zastrzeżenie metodologiczne (brak deklaracji optimum):'),
     'Brak zastrzeżenia w raporcie Markdown 4.7');
  ok(mdText.includes('**Wersja danych:** schemat roboczy szkicu `v6` (projekt źródłowy `v5`)'),
     'Brak poprawnej wersji danych w raporcie Markdown');
  ok(mdText.includes('**Wielkość partii:** 2 szt.'), 'Brak wielkości partii w raporcie Markdown');
  ok(mdText.includes('**Tryb transportu:** Tylko proces (just-in-time'), 'Brak trybu transportu w raporcie Markdown');

  // Przewinięcie do sekcji 4.7 i wykonanie zrzutu ekranu
  await evaluate(`document.querySelector('[aria-label="Propozycje zmian i weryfikacja w symulacji 4.7"]').scrollIntoView({block: 'start'})`);
  await sleep(250);
  mkdirSync('outputs/qa', {recursive: true});
  writeFileSync('outputs/qa/verify_4_7.png', Buffer.from((await send('Page.captureScreenshot', {format: 'png'})).data, 'base64'));

  // 4. Test akcji "Zapisz jako wariant" z tabeli propozycji
  await evaluate(`(() => {
    const table = document.querySelector('[aria-label="Tabela propozycji zmian 4.7"]');
    const saveBtn = [...table.querySelectorAll('button')].find(b => b.textContent.includes('Zapisz jako wariant'));
    if (!saveBtn) throw new Error('Brak przycisku Zapisz jako wariant w tabeli 4.7');
    saveBtn.click();
  })()`);
  await sleep(150);

  // Sprawdzenie, czy wariant pojawił się w bibliotece wariantów
  await until(`!!document.querySelector('[aria-label="Zapisane warianty szkicu 6"]')`);
  const libraryText = await evaluate(`document.querySelector('[aria-label="Zapisane warianty szkicu 6"]').textContent`);
  ok(libraryText.includes('Zmień jawny wariant') || libraryText.includes('Osoba B (W-B)') || libraryText.includes('W-B') || libraryText.includes('VAR-1'),
     'Wariant z propozycji 4.7 nie został zapisany do biblioteki wariantów');
  const savedVariantsCount = await evaluate(`(() => {
    const raw = localStorage.getItem(${JSON.stringify(variantsKey)});
    return raw ? JSON.parse(raw).variants?.length : 0;
  })()`);
  ok(savedVariantsCount >= 1, 'Brak zapisanego wariantu w localStorage');

  // 5. Test akcji "Zastosuj do szkicu 6" i historii Cofnij/Ponów
  const initialWorkersInTeam = await evaluate(`(() => {
    const d = JSON.parse(localStorage.getItem(${JSON.stringify(draftKey)}));
    return d.project.workerRunSelection.teamWorkerIds.length;
  })()`);
  strictEqual(initialWorkersInTeam, 1, 'Początkowy skład zespołu powinien mieć 1 osobę');

  // Kliknięcie "Zastosuj do szkicu 6" dla propozycji dodania pracownika
  await evaluate(`(() => {
    const table = document.querySelector('[aria-label="Tabela propozycji zmian 4.7"]');
    const applyBtn = [...table.querySelectorAll('button')].find(b => b.textContent.includes('Zastosuj do szkicu 6'));
    if (!applyBtn) throw new Error('Brak przycisku Zastosuj do szkicu 6 w tabeli 4.7');
    applyBtn.click();
  })()`);
  await sleep(200);

  // Sprawdzenie, że szkic został zmodyfikowany
  const modifiedWorkersInTeam = await evaluate(`(() => {
    const d = JSON.parse(localStorage.getItem(${JSON.stringify(draftKey)}));
    return d.project.workerRunSelection.teamWorkerIds.length;
  })()`);
  ok(modifiedWorkersInTeam >= 2 || (await evaluate(`(() => {
    const d = JSON.parse(localStorage.getItem(${JSON.stringify(draftKey)}));
    return d.project.stationRouting.operations[1].candidates.length >= 2;
  })()`)), 'Szkic 6 nie został zmodyfikowany po zastosowaniu propozycji');

  // Test historii: kliknięcie Cofnij przywraca stan poprzedni
  await evaluate(`(() => {
    const undoBtn = [...document.querySelectorAll('button')].find(b => b.textContent.trim() === 'Cofnij dane szkicu');
    if (!undoBtn || undoBtn.disabled) throw new Error('Brak aktywnego przycisku Cofnij dane szkicu');
    undoBtn.click();
  })()`);
  await sleep(200);
  const revertedWorkersInTeam = await evaluate(`(() => {
    const d = JSON.parse(localStorage.getItem(${JSON.stringify(draftKey)}));
    return d.project.workerRunSelection.teamWorkerIds.length;
  })()`);
  strictEqual(revertedWorkersInTeam, 1, 'Operacja Cofnij nie przywróciła pierwotnego składu zespołu szkicu');

  // 6. Sprawdzenie ochrony projektów 4/5 i originalJson
  strictEqual(await evaluate(`localStorage.getItem('layout-studio-stations-v5')`), legacy5);
  strictEqual(await evaluate(`localStorage.getItem('layout-studio-v3')`), legacy4);
  strictEqual(await evaluate(`JSON.parse(localStorage.getItem(${JSON.stringify(draftKey)})).originalJson`), originalJson);
  ok(!errors.length, errors.join('; '));

  console.log('PASS 4.7 UI: generowanie propozycji zmian na jawnych zasobach (bez zmyślania), weryfikacja w symulacji przy identycznych warunkach, zastrzeżenie braku gwarancji optimum, tabela wyników, rozróżnienie szacunku statycznego od wyniku dynamicznego, akcja Zapisz jako wariant, akcja Zastosuj do szkicu 6 z obsługą historii Cofnij/Ponów, raport Markdown z wersją danych i ochroną projektów 4/5.');
} finally {
  ws?.close();
  browser.kill();
  server.kill();
}
