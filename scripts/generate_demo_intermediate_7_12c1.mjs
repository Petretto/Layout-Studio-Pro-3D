import {build} from 'esbuild';
import {readFileSync, writeFileSync, mkdirSync} from 'node:fs';
import {resolve, dirname} from 'node:path';
import {createHash} from 'node:crypto';
import XLSX from 'xlsx';

process.on('uncaughtException', error => {
  console.error(error.message);
  process.exitCode = 1;
});

// Authoring of synthetic demo data only. No scheduler is called to create a reference.
const bundle = await build({
  stdin: {
    contents: `
export * from './src/core/validation';
export * from './src/core/domainProject';
export * from './src/core/domainMigrationPreview';
export * from './src/core/domainDraftStorage';
export * from './src/core/domainVariantComparison';
export * from './src/core/projectPackage';
export * from './src/core/export/excelImporter';
`,
    resolveDir: process.cwd()
  },
  bundle: true,
  platform: 'node',
  format: 'esm',
  write: false
});

const api = await import('data:text/javascript;base64,' + Buffer.from(bundle.outputFiles[0].text).toString('base64'));
const out = resolve('przyklady/02_wozek_warsztatowy');
const check = process.argv.includes('--check');
const at = '2026-10-25T00:00:00.000Z';
const projectId = 'DEMO-WOZEK-WARSZTATOWY-1';
const stations = ['ST-WW-1', 'ST-WW-2', 'ST-WW-3', 'ST-WW-4'];
const ids = ['WW-OP10', 'WW-OP20', 'WW-OP30', 'WW-OP40'];
const durations = [60, 80, 50, 40];
const va = [48, 65, 40, 32];
const names = [
  'Montaż ramy dolnej i kół skrętnych',
  'Montaż półek i burt wózka',
  'Montaż uchwytu ergonomicznego i akcesoriów',
  'Kontrola odbiorcza, próba toczenia i pakowanie'
];

const source4 = api.parseProject(JSON.stringify({
  schemaVersion: 4,
  id: projectId,
  name: 'Wózek warsztatowy 3-półkowy — DEMO syntetyczne',
  createdAt: at,
  updatedAt: at,
  timeUnit: 's',
  algorithm: 'Manual',
  currency: 'PLN',
  targetLayoutType: 'Linear',
  layoutMode: 'manual',
  layoutSettings: {tableWidthMm: 1500, tableLengthMm: 900, spacingMm: 1000, aisleMm: 1800},
  facility: {widthMm: 12000, lengthMm: 8000, heightMm: 3500, gridSizeMm: 100, isConfirmed: false},
  obstacles: [],
  demand: {yearlyDemand: 40000, workingDaysPerYear: 250, shiftsPerDay: 1, hoursPerShift: 8, plannedBreaksMinutesPerShift: 0, oeePercent: 100},
  processSteps: ids.map((id, i) => ({
    id,
    name: names[i],
    standardTimeSeconds: durations[i],
    vaTimeSeconds: va[i],
    nvaTimeSeconds: durations[i] - va[i],
    sequenceNumber: i + 1,
    predecessorIds: i ? [ids[i - 1]] : [],
    assignedWorkstationId: `WS-${i + 1}`
  })),
  workstationSettings: Object.fromEntries(ids.map(id => [JSON.stringify([id]), {operators: 1, parallelStations: 1}])),
  bom: [
    ['WW-RAMA', 'Rama spawana wózka', 1, 'Pallet', 5, ids[0], 120],
    ['WW-KOLA', 'Zestaw 4 kół skrętnych z hamulcem', 1, 'BoxKLT', 10, ids[0], 45],
    ['WW-POLKI', 'Zestaw 3 półek blaszanych z rantem', 1, 'Pallet', 10, ids[1], 75],
    ['WW-SRUBY', 'Zestaw łączników i śrub M8', 1, 'BoxKLT', 50, ids[1], 15],
    ['WW-UCHWYT', 'Uchwyt transportowy z osłoną', 1, 'BoxKLT', 20, ids[2], 25],
    ['WW-WIESZ', 'Listwa boczna z wieszakami narzędziowymi', 1, 'BoxKLT', 25, ids[2], 30],
    ['WW-OPAK', 'Karton ochronny i narożniki piankowe', 1, 'Carton', 10, ids[3], 18]
  ].map((b, i) => ({
    id: `BOM-${i + 1}`,
    partNumber: b[0],
    name: b[1],
    quantityPerUnit: b[2],
    container: b[3],
    packageQuantity: b[4],
    associatedProcessStepId: b[5],
    unitCost: b[6]
  })),
  layoutObjects: ids.map((_, i) => ({
    id: `WW-TABLE-${i + 1}`,
    name: `Stół S${i + 1} — ${names[i]}`,
    type: 'Table',
    workstationId: `WS-${i + 1}`,
    xMm: 1200 + i * 2600,
    yMm: 2500,
    zMm: 0,
    widthMm: 1500,
    lengthMm: 900,
    heightMm: 850,
    rotationDeg: 0,
    colorHex: '#3979a8',
    isVisualAssumption: true
  }))
}));

const originalJson = JSON.stringify(source4);
let index = 0;
const base = api.prepareDomainMigration(api.previewDomainMigrationFromV4(originalJson, () => stations[index++])).project;

base.workers = [
  {id: 'WW-W1', name: 'Jan Monter (konstrukcja)'},
  {id: 'WW-W2', name: 'Adam Mechanik (konstrukcja i montaż)'},
  {id: 'WW-W3', name: 'Piotr Wyposażeniowiec (osprzęt)'},
  {id: 'WW-W4', name: 'Ewa Kontroler (kontrola i pakowanie)'},
  {id: 'WW-W5', name: 'Marek Monter wspierający (rezerwa/wsparcie)'}
];

base.workerPools = [
  {id: 'WW-P-MECH', name: 'Zespół mechaniczny', workerIds: ['WW-W1', 'WW-W2', 'WW-W5']},
  {id: 'WW-P-FIT', name: 'Zespół wyposażenia', workerIds: ['WW-W3']},
  {id: 'WW-P-QC', name: 'Zespół kontroli jakości', workerIds: ['WW-W4']}
];

base.product = {id: 'WW-PRODUCT', name: 'Wózek warsztatowy — wyrób syntetyczny'};

// Staffing with time variants: OP20 has 1 worker (80s) or 2 workers (45s)
base.operations.forEach((op, i) => {
  const dur = durations[i];
  const profile1 = {
    durationSeconds: dur,
    durationBasis: 'assumed',
    manualWork: [{startSeconds: 0, endSeconds: dur, basis: 'assumed'}],
    machineRun: [],
    operatorPresence: [{startSeconds: 0, endSeconds: dur, basis: 'assumed'}]
  };
  op.timeProfile = structuredClone(profile1);
  op.physicalRole = {kind: 'body-work'};
  if (op.id === 'WW-OP20') {
    const profile2 = {
      durationSeconds: 45,
      durationBasis: 'assumed',
      manualWork: [{startSeconds: 0, endSeconds: 45, basis: 'assumed'}],
      machineRun: [],
      operatorPresence: [{startSeconds: 0, endSeconds: 45, basis: 'assumed'}]
    };
    op.staffing = {
      requiredWorkers: 1,
      timeVariants: [
        {workerCount: 1, timeProfile: profile1},
        {workerCount: 2, timeProfile: profile2}
      ]
    };
  } else {
    op.staffing = {
      requiredWorkers: 1,
      timeVariants: [{workerCount: 1, timeProfile: profile1}]
    };
  }
});

base.stations.forEach((s, i) => {
  s.name = `S${i + 1} — ${names[i]}`;
});

const calendar = {shifts: [{startSeconds: 0, endSeconds: 28800, basis: 'assumed'}], breaks: []};
base.resourceCalendars = {
  workers: Object.fromEntries(base.workers.map(w => [w.id, structuredClone(calendar)])),
  stations: Object.fromEntries(stations.map(id => [id, structuredClone(calendar)]))
};

// Base worker selection: 4 workers on 4 stations
base.workerRunSelection = {
  teamWorkerIds: ['WW-W1', 'WW-W2', 'WW-W3', 'WW-W4'],
  operations: [
    {operationId: ids[0], workerCount: 1, eligibleWorkerIds: ['WW-W1']},
    {operationId: ids[1], workerCount: 1, eligibleWorkerIds: ['WW-W2']},
    {operationId: ids[2], workerCount: 1, eligibleWorkerIds: ['WW-W3']},
    {operationId: ids[3], workerCount: 1, eligibleWorkerIds: ['WW-W4']}
  ]
};

base.equipment = [
  ...stations.map((stationId, i) => ({
    id: `WW-EQ${i + 1}`,
    name: `Stół montażowy S${i + 1}`,
    stationId,
    layoutObjectId: `WW-TABLE-${i + 1}`,
    capableOperationIds: [ids[i]]
  })),
  {id: 'WW-CART-1', name: 'Wózek transferowy T1 (S1 -> S2)'},
  {id: 'WW-CART-2', name: 'Wózek transferowy T2 (S2 -> S3)'},
  {id: 'WW-CART-3', name: 'Wózek transferowy T3 (S3 -> S4)'}
];

base.stationRouting = {
  selectionRule: 'earliest-start-then-shortest-route',
  equipmentPlacements: stations.map((stationId, i) => ({
    equipmentId: `WW-EQ${i + 1}`,
    stationId,
    copy: 1
  })),
  operations: ids.map((operationId, i) => ({
    operationId,
    candidates: [{stationId: stations[i], copy: 1, requiredEquipmentIds: [`WW-EQ${i + 1}`]}]
  })),
  routes: [
    {
      id: 'WW-R1-2',
      from: {stationId: stations[0], copy: 1},
      to: {stationId: stations[1], copy: 1},
      distanceMm: 2600,
      basis: 'confirmed',
      source: 'Rzut hali 2D — odległość osi stołów',
      transportTime: {durationSeconds: 10, basis: 'assumed', source: 'Przejazd wózka montażowego ze zwalnianiem'}
    },
    {
      id: 'WW-R2-3',
      from: {stationId: stations[1], copy: 1},
      to: {stationId: stations[2], copy: 1},
      distanceMm: 2600,
      basis: 'confirmed',
      source: 'Rzut hali 2D — odległość osi stołów',
      transportTime: {durationSeconds: 10, basis: 'assumed', source: 'Przejazd wózka montażowego ze zwalnianiem'}
    },
    {
      id: 'WW-R3-4',
      from: {stationId: stations[2], copy: 1},
      to: {stationId: stations[3], copy: 1},
      distanceMm: 2600,
      basis: 'confirmed',
      source: 'Rzut hali 2D — odległość osi stołów',
      transportTime: {durationSeconds: 10, basis: 'assumed', source: 'Przejazd wózka montażowego ze zwalnianiem'}
    }
  ]
};

base.stationBuffers = {
  buffers: stations.map((stationId, i) => ({
    stationId,
    copy: 1,
    inputCapacity: 2,
    outputCapacity: i === 3 ? null : 2,
    blockingPolicy: 'bbas-worker-released'
  }))
};

base.competencyRequirements = {
  competencies: [
    {id: 'WW-C-MECH', name: 'Montaż konstrukcyjny i mechaniczny'},
    {id: 'WW-C-FIT', name: 'Montaż wyposażenia i detali'},
    {id: 'WW-C-QC', name: 'Kontrola jakości i odbiór'}
  ],
  workers: [
    {workerId: 'WW-W1', competencyIds: ['WW-C-MECH']},
    {workerId: 'WW-W2', competencyIds: ['WW-C-MECH', 'WW-C-FIT']},
    {workerId: 'WW-W3', competencyIds: ['WW-C-FIT']},
    {workerId: 'WW-W4', competencyIds: ['WW-C-QC']},
    {workerId: 'WW-W5', competencyIds: ['WW-C-MECH', 'WW-C-FIT']}
  ],
  operations: [
    {operationId: ids[0], requiredCompetencyIds: ['WW-C-MECH']},
    {operationId: ids[1], requiredCompetencyIds: ['WW-C-MECH']},
    {operationId: ids[2], requiredCompetencyIds: ['WW-C-FIT']},
    {operationId: ids[3], requiredCompetencyIds: ['WW-C-QC']}
  ]
};

base.materialSupply = {
  items: [
    {
      id: 'SUP-RAMA',
      componentId: 'WW-RAMA',
      targetStationId: stations[0],
      initialStock: 10,
      unit: 'szt.',
      schedule: {kind: 'periodic', batchQuantity: 10, intervalSeconds: 900, firstDeliverySeconds: 900},
      source: 'Dostawa paletowa z magazynu konstrukcji'
    },
    {
      id: 'SUP-KOLA',
      componentId: 'WW-KOLA',
      targetStationId: stations[0],
      initialStock: 10,
      unit: 'kpl.',
      schedule: {kind: 'periodic', batchQuantity: 10, intervalSeconds: 900, firstDeliverySeconds: 900},
      source: 'KLT z magazynu komponentów znormalizowanych'
    },
    {
      id: 'SUP-POLKI',
      componentId: 'WW-POLKI',
      targetStationId: stations[1],
      initialStock: 10,
      unit: 'kpl.',
      schedule: {kind: 'periodic', batchQuantity: 10, intervalSeconds: 900, firstDeliverySeconds: 900},
      source: 'Dostawa półek z wydziału gięcia'
    },
    {
      id: 'SUP-UCHWYT',
      componentId: 'WW-UCHWYT',
      targetStationId: stations[2],
      initialStock: 10,
      unit: 'kpl.',
      schedule: {kind: 'periodic', batchQuantity: 10, intervalSeconds: 900, firstDeliverySeconds: 900},
      source: 'Pojemniki KLT z osprzętem montażowym'
    },
    {
      id: 'SUP-OPAK',
      componentId: 'WW-OPAK',
      targetStationId: stations[3],
      initialStock: 10,
      unit: 'kpl.',
      schedule: {kind: 'periodic', batchQuantity: 10, intervalSeconds: 900, firstDeliverySeconds: 900},
      source: 'Kartonage z magazynu opakowań'
    }
  ],
  consumptions: [
    {operationId: ids[0], supplyId: 'SUP-RAMA', quantity: 1, source: 'Pobranie ramy na start OP10'},
    {operationId: ids[0], supplyId: 'SUP-KOLA', quantity: 1, source: 'Pobranie kompletu 4 kół na start OP10'},
    {operationId: ids[1], supplyId: 'SUP-POLKI', quantity: 1, source: 'Pobranie 3 półek na start OP20'},
    {operationId: ids[2], supplyId: 'SUP-UCHWYT', quantity: 1, source: 'Pobranie uchwytu na start OP30'},
    {operationId: ids[3], supplyId: 'SUP-OPAK', quantity: 1, source: 'Pobranie opakowania na start OP40'}
  ]
};

// Explicit synthetic authoring, user decision 2026-10-25: upstream assemblers also transport.
// Return time is a separate teaching assumption, never derived from loaded travel time.
base.bodyRunInput={bodies:[1,2,3].map(job=>({id:`WW-BODY-${job}`,productId:'WW-PRODUCT',location:{kind:'station',stationId:stations[0],copy:1}})),jobs:[1,2,3].map(job=>({job,bodyId:`WW-BODY-${job}`}))};
base.assemblyTransport={scope:'assembly-only',carts:[0,1,2].map(i=>({equipmentId:`WW-CART-${i+1}`,initialLocation:{stationId:stations[i],copy:1},calendar:structuredClone(calendar),afterUnload:'return-to-initial',source:'Jawny scenariusz dydaktyczny: wózek wraca do stanowiska źródłowego'})),conveyors:[],
  emptyRoutes:[0,1,2].map(i=>({id:`WW-RETURN-${i+1}`,equipmentId:`WW-CART-${i+1}`,from:{stationId:stations[i+1],copy:1},to:{stationId:stations[i],copy:1},distanceMm:2600,basis:'confirmed',source:'Jawna syntetyczna długość powrotu; bez przebiegu geometrycznego',transportTime:{durationSeconds:10,basis:'assumed',source:'Osobne założenie dydaktyczne pustego powrotu: 10 s'},workerAssignment:{workerIds:[`WW-W${i+1}`],source:'Decyzja użytkownika: transport wykonują monterzy źródłowego stanowiska'}})),
  routes:[0,1,2].map(i=>({stationRouteId:`WW-R${i+1}-${i+2}`,source:'Jawny przydział montera i wózka do transportu montażowego',alternatives:[{workerIds:[`WW-W${i+1}`],equipmentIds:[`WW-CART-${i+1}`]}]}))};
for(const [id,componentId,stationIndex,operationId] of [['SUP-SRUBY','WW-SRUBY',1,ids[1]],['SUP-WIESZ','WW-WIESZ',2,ids[2]]]){
  base.materialSupply.items.push({id,componentId,targetStationId:stations[stationIndex],initialStock:10,unit:'kpl.',schedule:{kind:'periodic',batchQuantity:10,intervalSeconds:900,firstDeliverySeconds:900},source:'Jawne założenie dydaktyczne zapasu i dostaw brakującego komponentu'});
  base.materialSupply.consumptions.push({operationId,supplyId:id,quantity:1,source:'Jawne dydaktyczne zużycie jednego kompletu na sztukę, oddzielna deklaracja od BOM'});
}
api.parseDomainProjectV6(JSON.stringify(base));

// Balanced variant: 2 workers on bottleneck OP20 (W2 and W5)
const balanced = structuredClone(base);
balanced.workerRunSelection.teamWorkerIds = ['WW-W1', 'WW-W2', 'WW-W3', 'WW-W4', 'WW-W5'];
balanced.workerRunSelection.operations[1] = {
  operationId: ids[1],
  workerCount: 2,
  eligibleWorkerIds: ['WW-W2', 'WW-W5']
};

api.parseDomainProjectV6(JSON.stringify(balanced));

const values = {};
const port = {
  getItem: k => values[k] ?? null,
  setItem: (k, v) => { values[k] = v; },
  removeItem: k => { delete values[k]; }
};

api.saveDomainDraft(port, {project: base, originalJson}, null, at);
for (const [id, name, category, project] of [
  ['INTERMEDIATE-BASE', 'Baza — 4 stanowiska / 4 osoby / wąskie gardło OP20 (80s)', 'baseline', base],
  ['INTERMEDIATE-BALANCED', 'Zbalansowany — wsparcie OP20 2-osobowe (45s) / takt 60s', 'additional-worker', balanced]
]) {
  api.saveDomainVariant(port, {id, name, category, project, originalJson, at}, port.getItem(api.DOMAIN_VARIANTS_STORAGE_KEY));
}

const pkg = api.makeProjectPackage(port, {dataOrigin: 'synthetic', at});

const files = new Map();
const json = (path, data) => files.set(path, Buffer.from(JSON.stringify(data, null, 2) + '\n'));

json('projekt-pokazowy.json', pkg);
json('dane/zrodlo4.json', source4);
json('dane/szkic6.json', JSON.parse(pkg.data.draftRaw));
json('dane/warianty6.json', JSON.parse(pkg.data.variantsRaw));
json('dane/warunki_eksperymentu.json', {
  dataOrigin: 'synthetic',
  batch: 3,
  arrivalIntervalSeconds: 1,
  transportMode: 'configured',
  processOnlyConditions: {batch:3,arrivalIntervalSeconds:1,transportMode:'just-in-time'},
  initialArrivalsSeconds: [0, 1, 2],
  materialAvailability: 'explicit-material-supply-configured-with-initial-stock',
  physicalBodyLocations: 'linear buffered model with explicit capacities',
  transportRoutesAndDurations: 'inter-station routes 2600mm / 10s declared in routing',
  bufferModel: 'explicit linear buffers: input=2, output=2, final output=null; policy=bbas-worker-released',
  materialDeliveries: 'seven explicit stocks: 10 declared units initially, 10 at first delivery 900s and every 900s; consumption 1 declared set at actual operation start',
  assemblyTransport: 'three carts return to source; upstream assemblers WW-W1/W2/W3 perform loaded travel and empty return; 10s each, explicit synthetic assumptions',
  competencyCoverage: '3 competencies (WW-C-MECH, WW-C-FIT, WW-C-QC) fully satisfied by assigned workers',
  costAssumptions: null,
  stochasticConfig: null,
  calendarWindowSeconds: [0, 28800],
  calendarBreaks: [],
  sourceOfProductionMeasurements: 'none — designed teaching example for intermediate complexity',
  sessionSettingsMustBeSelectedInUI: true
});

for (const [kind, rows, docs] of [
  ['proces', api.processRows(base.operations), api.PROCESS_COLUMN_DOCS],
  ['bom', api.bomRows(base.bom), api.BOM_COLUMN_DOCS]
]) {
  const book = XLSX.utils.book_new();
  book.Props = {Title: `DEMO syntetyczne: ${kind}`, Author: 'Layout Studio Pro', CreatedDate: new Date(at), ModifiedDate: new Date(at)};
  const sheet = XLSX.utils.json_to_sheet(rows);
  sheet['!cols'] = Object.keys(rows[0]).map(key => ({wch: key.includes('Nazwa') ? 43 : Math.max(key.length + 2, 18)}));
  sheet['!autofilter'] = {ref: sheet['!ref']};
  XLSX.utils.book_append_sheet(book, sheet, 'Dane');
  XLSX.utils.book_append_sheet(book, XLSX.utils.json_to_sheet(docs), 'Opis kolumn');
  XLSX.utils.book_append_sheet(book, XLSX.utils.json_to_sheet([
    {Pole: 'Pochodzenie', Wartosc: 'Dane syntetyczne, brak pomiarów produkcyjnych'},
    {Pole: 'Jednostki', Wartosc: 'Czas s, geometria mm, koszty PLN'},
    {Pole: 'Pełny projekt', Wartosc: 'Wczytaj projekt-pokazowy.json przez Pakiet projektu; sam arkusz nie odtwarza zasobów ani wariantów'}
  ]), 'Pochodzenie');
  files.set(`dane/${kind}.xlsx`, Buffer.from(XLSX.write(book, {type: 'buffer', bookType: 'xlsx', compression: true})));
}

// Markdown and reference documents
const slownikPolMd = `# Słownik pól i jednostek — Projekt średni: Wózek warsztatowy

Pochodzenie danych: **syntetyczne**. Projekt demonstracyjny poziomu średniego (7.12.C) przygotowany zgodnie ze standardem 7.12.A.

## Jednostki miar

| Wielkość | Jednostka | Uwagi |
| --- | --- | --- |
| Czas | sekundy [s] | Wewnętrzny format wszystkich czasów w silniku symulacji |
| Geometria / Długość | milimetry [mm] | Koordynaty 2D/3D, odległości między stołami, gabaryty wyposażenia |
| Zdolność produkcyjna | [szt./h] | Zdolność nominalna: $3600 / \\text{takt}$ |
| Waluta / Koszty | PLN | Koszty jednostkowe komponentów BOM |

## Struktura procesu i operacji

- **WW-OP10** — *Montaż ramy dolnej i kół skrętnych*: czas standardowy 60 s (VA 48 s, NVA 12 s). Wymagana kompetencja: \`WW-C-MECH\`.
- **WW-OP20** — *Montaż półek i burt wózka*:
  - Obsada 1 osoba: czas standardowy 80 s (VA 65 s, NVA 15 s) — wąskie gardło wariantu bazowego.
  - Obsada 2 osoby: czas standardowy 45 s (VA 36 s, NVA 9 s) — zbalansowany wariant reorganizacji.
  - Wymagana kompetencja: \`WW-C-MECH\`.
- **WW-OP30** — *Montaż uchwytu ergonomicznego i akcesoriów*: czas standardowy 50 s (VA 40 s, NVA 10 s). Wymagana kompetencja: \`WW-C-FIT\`.
- **WW-OP40** — *Kontrola odbiorcza, próba toczenia i pakowanie*: czas standardowy 40 s (VA 32 s, NVA 8 s). Wymagana kompetencja: \`WW-C-QC\`.

## Zespoły, pracownicy i kompetencje

- **WW-C-MECH** (Montaż mechaniczny / konstrukcyjny): posiadają \`WW-W1\`, \`WW-W2\`, \`WW-W5\`.
- **WW-C-FIT** (Montaż wyposażenia i detali): posiadają \`WW-W2\`, \`WW-W3\`, \`WW-W5\`.
- **WW-C-QC** (Kontrola jakości i odbiór): posiada \`WW-W4\`.

## Buforowanie i zaopatrzenie materiałowe

- **Pojemności buforów**: wejście 2 szt., wyjście 2 szt. Polityka: \`bbas-worker-released\` (operator zwalniany po zakończeniu pracy nawet przy zablokowanym wyjściu).
- **Zaopatrzenie**: 7 jawnych pozycji materiałowych z zapasem początkowym 10 zadeklarowanych jednostek, pierwszą dostawą w 900 s i następnymi co 900 s; zużycie jednego kompletu przy rzeczywistym starcie przypisanej operacji. Ilości podano oddzielnie od BOM.
`;

const oczekiwaneWynikiJson = {
  referenceVersion: 1,
  dataOrigin: "synthetic",
  method: "Ręczny rachunek zdarzeń i stanów dla 4-stanowiskowej linii montażu wózka warsztatowego; autor: Antigravity Codex, 2026-10-24. Obliczenia analityczne wyznaczone niezależnie od silnika symulacji.",
  conditions: {"batch": 3, "arrivalIntervalSeconds": 1, "transportMode": "just-in-time"},
  units: {"time": "s", "capacity": "szt./h", "cost": "PLN/szt."},
  absoluteToleranceSeconds: 0.000000001,
  bufferModel: "Jawne bufory: wejścia 2 szt., wyjścia 2 szt., końcowe wyjście null; polityka bbas-worker-released.",
  customerTaktSeconds: 180,
  targetCycleSeconds: 80,
  workContentSecondsBase: 230,
  workContentSecondsBalanced: 240,
  bomCostPerUnit: 328,
  variants: [
    {
      id: "INTERMEDIATE-BASE",
      activeStations: 4,
      selectedWorkers: 4,
      bottleneckStationId: "ST-WW-2",
      bottleneckCycleSeconds: 80,
      staticCapacityPerHour: 45,
      batchMakespanSeconds: 390,
      completionSeconds: [230, 310, 390],
      operationWindows: [
        [1, "WW-OP10", 0, 60], [1, "WW-OP20", 60, 140], [1, "WW-OP30", 140, 190], [1, "WW-OP40", 190, 230],
        [2, "WW-OP10", 60, 120], [2, "WW-OP20", 140, 220], [2, "WW-OP30", 220, 270], [2, "WW-OP40", 270, 310],
        [3, "WW-OP10", 120, 180], [3, "WW-OP20", 220, 300], [3, "WW-OP30", 300, 350], [3, "WW-OP40", 350, 390]
      ]
    },
    {
      id: "INTERMEDIATE-BALANCED",
      activeStations: 4,
      selectedWorkers: 5,
      bottleneckStationId: "ST-WW-1",
      bottleneckCycleSeconds: 60,
      staticCapacityPerHour: 60,
      batchMakespanSeconds: 315,
      completionSeconds: [195, 255, 315],
      operationWindows: [
        [1, "WW-OP10", 0, 60], [1, "WW-OP20", 60, 105], [1, "WW-OP30", 105, 155], [1, "WW-OP40", 155, 195],
        [2, "WW-OP10", 60, 120], [2, "WW-OP20", 120, 165], [2, "WW-OP30", 165, 215], [2, "WW-OP40", 215, 255],
        [3, "WW-OP10", 120, 180], [3, "WW-OP20", 180, 225], [3, "WW-OP30", 225, 275], [3, "WW-OP40", 275, 315]
      ]
    }
  ]
};

const obliczeniaMd = `# Niezależny analityczny rachunek wzorcowy — Projekt średni

Data: **2026-10-24**. Autor: **Antigravity Codex**.
Projekt: **02_wozek_warsztatowy** (poziom intermediate, 7.12.C).

Obliczenia wyprowadzono ręcznie na podstawie prawideł inżynierii przemysłowej i teorii kolejek, całkowicie niezależnie od kodu symulatora aplikacji.

## 1. Popyt, czas dostępny i takt klienta

- Roczne zapotrzebowanie: $D = 40\\,000$ szt./rok.
- Dni robocze: $250$ dni/rok $\\rightarrow$ popyt dzienny: $40\\,000 / 250 = 160$ szt./dzień.
- Czas dostępny: $1$ zmiana $\\times 8$ h $= 28\\,800$ s/dzień.
- **Takt klienta (Takt Time)**:
  $$TT = \\frac{28\\,800\\text{ s}}{160\\text{ szt.}} = 180\\text{ s/szt.}$$
  Oba warianty montażu bez trudu pokrywają zapotrzebowanie klienta z dużym marginesem bezpieczeństwa.

## 2. Wariant Bazowy (INTERMEDIATE-BASE)

- **Obsada**: 4 pracowników jednoosobowo na 4 stanowiskach:
  - $S_1$ (OP10): $60$ s (Jan Monter, kompetencja WW-C-MECH)
  - $S_2$ (OP20): $80$ s (Adam Mechanik, kompetencja WW-C-MECH) — **wąskie gardło linii**
  - $S_3$ (OP30): $50$ s (Piotr Wyposażeniowiec, kompetencja WW-C-FIT)
  - $S_4$ (OP40): $40$ s (Ewa Kontroler, kompetencja WW-C-QC)
- **Czas cyklu linii (takt nominalny)**:
  $$CT_{\\text{base}} = \\max(60, 80, 50, 40) = 80\\text{ s/szt.}$$
- **Nominalna zdolność produkcyjna**:
  $$Cap_{\\text{base}} = \\frac{3600}{80} = 45\\text{ szt./h}$$
- **Czas przejścia pierwszej sztuki (Lead Time)**:
  $$LT_1 = 60 + 80 + 50 + 40 = 230\\text{ s}$$
- **Czas realizacji partii $N=3$ sztuki**:
  Kolejne sztuki opuszczają wąskie gardło co $80$ s:
  - Sztuka 1: $230$ s
  - Sztuka 2: $230 + 80 = 310$ s
  - Sztuka 3: $310 + 80 = 390$ s
  - Makespan partii 3 sztuk: **390 s**.

## 3. Wariant Zbalansowany (INTERMEDIATE-BALANCED)

- **Reorganizacja**: Do wąskiego gardła OP20 przydzielono drugiego pracownika (Marek Monter wspierający, WW-W5).
- **Czasy operacji**:
  - $S_1$ (OP10): $60$ s (1 monter) — **nowe wąskie gardło**
  - $S_2$ (OP20): $45$ s (2 monterów wspólnie)
  - $S_3$ (OP30): $50$ s (1 monter)
  - $S_4$ (OP40): $40$ s (1 kontroler)
- **Nowy czas cyklu linii**:
  $$CT_{\\text{bal}} = \\max(60, 45, 50, 40) = 60\\text{ s/szt.}$$
- **Nominalna zdolność produkcyjna**:
  $$Cap_{\\text{bal}} = \\frac{3600}{60} = 60\\text{ szt./h} \\quad (+33,3\\%)$$
- **Czas przejścia pierwszej sztuki**:
  $$LT_1 = 60 + 45 + 50 + 40 = 195\\text{ s} \\quad (-35\\text{ s})$$
- **Czas realizacji partii $N=3$ sztuki**:
  Kolejne sztuki opuszczają nowe wąskie gardło co $60$ s:
  - Sztuka 1: $195$ s
  - Sztuka 2: $195 + 60 = 255$ s
  - Sztuka 3: $255 + 60 = 315$ s
  - Makespan partii 3 sztuk: **315 s** (skrócenie o $75$ s, czyli $19,2\\%$).
`;

const readmeMd = `# Projekt pokazowy średni — Montaż wózka warsztatowego 3-półkowego

Pakiet demonstracyjny: \`02_wozek_warsztatowy\`
Wersja: **1.1.0**
Pochodzenie danych: **jawnie syntetyczne** (dane demonstracyjno-dydaktyczne, brak pomiarów produkcyjnych)
Identyfikator: \`DEMO-WOZEK-WARSZTATOWY-1\`
Zgodność: **Layout Studio Pro 3D v0.4.0+**

## Cel i zakres demonstracji

Pakiet reprezentuje średni poziom złożoności (**intermediate**) i demonstruje:
1. **Wielowariantową obsadę i czasy zespołowe**: operacja OP20 posiada zdefiniowane warianty obsady — 1 pracownik (80 s) oraz zespół 2-osobowy (45 s).
2. **Macierz kompetencji personelu**: trzej pracownicy montażu mechanicznego, jeden montażysta wyposażenia i kontroler jakości. Zespół zbalansowany angażuje pracownika wielozadaniowego.
3. **Zaopatrzenie materiałowe i bufory**: jawne zapasy początkowe komponentów, zużycie atomowe na operacjach oraz bufory stanowiskowe z polityką \`bbas-worker-released\`.
4. **Porównanie wariantów**: wariant bazowy (wąskie gardło na montażu półek, takt 80 s) vs wariant zreorganizowany z obsadą 2-osobową (nowy takt 60 s, wzrost wydajności o +33,3%).

## Zawartość katalogu

- \`projekt-pokazowy.json\` — główny plik pakietu (importowany przez przycisk **Pakiet projektu**).
- \`manifest.json\` — inwentarz pakietu z sumami kontrolnymi SHA-256.
- \`dane/proces.xlsx\` — arkusz procesu technologicznego z czasami VA/NVA.
- \`dane/bom.xlsx\` — zestawienie materiałowe z cenami i pojemnikami magazynowymi.
- \`dane/szkic6.json\`, \`dane/warianty6.json\`, \`dane/zrodlo4.json\` — projekcje danych JSON.
- \`dane/warunki_eksperymentu.json\` — zalecane parametry sesji symulacji.
- \`dane/slownik_pol.md\` — słownik pojęć, jednostek i kompetencji.
- \`referencje/oczekiwane_wyniki.json\`, \`referencje/obliczenia.md\` — niezależny analityczny wzorzec wyników.

## Instrukcja uruchomienia w aplikacji

1. W aplikacji kliknij **Pakiet projektu** i wczytaj plik \`projekt-pokazowy.json\`.
2. Pobierz automatyczną kopię ratunkową i zatwierdź import.
3. Dla historycznego eksperymentu procesowego w **Proces i stanowiska → Stanowiska i zasoby** włącz jawnie **JIT**:
   - Ustaw partię: **3 sztuki**.
   - Odstęp przybyć: **1 s**.
4. Wybierz wariant **INTERMEDIATE-BASE** i uruchom symulację. Zwróć uwagę na czas zakończenia partii: **390 s** oraz obciążenie stanowiska S2.
5. Przełącz na wariant **INTERMEDIATE-BALANCED** i ponów symulację. Czas partii spada do **315 s**, a obciążenie stacji ulega zrównoważeniu.
6. Przejdź do modułu **Porównanie wariantów**, aby wyświetlić tabelę syntezy i pobrać raport.
`;

// Written independently before invoking any scheduler in verification.
oczekiwaneWynikiJson.physical={conditions:{batch:3,arrivalIntervalSeconds:1,transportMode:'configured'},
  assumptions:'Transport wykonują monterzy źródłowych stanowisk (decyzja użytkownika). 3 wózki, powrót 10 s jako osobne założenie dydaktyczne. 7 jawnych zasobów materiałowych, 3 jawne korpusy.',
  variants:[{id:'INTERMEDIATE-BASE',completionSeconds:[260,360,460],operationWindows:[
    [1,'WW-OP10',0,60],[1,'WW-OP20',70,150],[1,'WW-OP30',160,210],[1,'WW-OP40',220,260],
    [2,'WW-OP10',80,140],[2,'WW-OP20',170,250],[2,'WW-OP30',260,310],[2,'WW-OP40',320,360],
    [3,'WW-OP10',160,220],[3,'WW-OP20',270,350],[3,'WW-OP30',360,410],[3,'WW-OP40',420,460]]},
    {id:'INTERMEDIATE-BALANCED',completionSeconds:[225,305,385],operationWindows:[
    [1,'WW-OP10',0,60],[1,'WW-OP20',70,115],[1,'WW-OP30',125,175],[1,'WW-OP40',185,225],
    [2,'WW-OP10',80,140],[2,'WW-OP20',150,195],[2,'WW-OP30',205,255],[2,'WW-OP40',265,305],
    [3,'WW-OP10',160,220],[3,'WW-OP20',230,275],[3,'WW-OP30',285,335],[3,'WW-OP40',345,385]]}],
  deliveryCase:{change:'Only SUP-RAMA initialStock=0; first periodic delivery remains explicitly 900 s. All other settings unchanged.',completionSecondsBase:[1160,1260,1360],completionSecondsBalanced:[1125,1205,1285]},
  blockingCase:{change:'Base: S1 outputCapacity=1, S2 inputCapacity=0, S2 calendar shift starts at 600 s. All other settings unchanged.',job:2,operationId:'WW-OP10',processingEndSeconds:120,stationReleaseSeconds:590,blockingPolicy:'bbas-worker-released'}};
const physicalMd='\n\n## Odbiór fizyczny C1 (2026-10-25)\n\nPowyższe 390/315 s pozostają wzorcami JIT. W trybie configured, 3 sztuki / odstęp 1 s / JIT WYŁĄCZONY, monter źródłowy wykonuje transport i powrót. Założono oddzielnie 10 s przejazdu i 10 s pustego powrotu; nie wyprowadzono czasu powrotu z długości ani czasu załadunku. WW-W1 obsługuje S1–S2, WW-W2 S2–S3, WW-W3 S3–S4; WW-W5 wspiera montaż S2, nie transport.\n\nRachunek przed uruchomieniem silnika: S1 pierwszej sztuki 0–60, przewóz 60–70, powrót 70–80, więc następna praca S1 80–140 i 160–220. Baza: S2 70–150, potem przewóz/powrót 150–170, następne prace S2 170–250 i 270–350. S3 zaczyna po dojeździe w 160/260/360, pracuje po 50 s i przekazuje do S4 po dalszych 10 s. S4 kończy w 260/360/460.\n\nReorganizacja: S2 pracuje 70–115, 150–195 i 230–275 (zespół 2 osób), a S3 125–175, 205–255 i 285–335. Po 10 s przewozu i 40 s pracy S4 końce to 225/305/385. Pełne okna obu wariantów zapisano w JSON. Każdy z 7 zapasów zużywa 3 jawne jednostki: końcowo 7, brak dostaw przed 900 s.\n\nPróba dostawy: ustaw tylko zapas początkowy SUP-RAMA na 0. Pierwsza dostawa nadal 900 s, więc cała sekwencja przesuwa się o 900 s: baza 1160/1260/1360, reorganizacja 1125/1205/1285. Dostawa w 900 s poprzedza zużycie w tej samej chwili.\n\nPróba blokady (baza): wyjście S1=1, wejście S2=0, zmiana kalendarza S2 zaczyna się w 600 s. Pierwszy wyrób czeka po S1; drugi kończy S1 w 120 s i pozostaje na stanowisku. Bezpośredni przewóz pierwszego wyrobu może ruszyć najwcześniej 590 s, aby przyjechać na gotowe S2 w 600 s. Zwolnienie miejsca wyjściowego zwalnia blokadę drugiego wyrobu w 590 s. Operator jest zwolniony zgodnie z bbas-worker-released; fizyczny korpus/stanowisko nie znikają przy zakończeniu pracy w 120 s.\n';
const scopeMd='\n\n## Fizyczny tryb i próby odbioru\n\nW Proces i stanowiska → Stanowiska i zasoby ustaw 3 sztuki, odstęp 1 s, JIT WYŁĄCZONY, następnie oblicz harmonogram. Baza: 460 s, reorganizacja: 385 s. Transport i puste powroty wykonują monterzy źródłowi; dodatkowy monter WW-W5 pomaga tylko przy OP20. Powroty mają osobny dydaktyczny czas 10 s. Są trzy jawne korpusy, trzy wózki i siedem pozycji zaopatrzenia. Wszystkie dane są syntetyczne. Dodatkowe próby dostawy i blokady opisano w referencje/obliczenia.md.\n\nHistoryczne 390/315 s dotyczą jawnego JIT z założoną dostępnością materiałów. Nie porównuj ich jako tego samego eksperymentu z 460/385 s. Korpusy i wózki mają historię fizyczną w odtwarzaniu A2b2b; brak geometrycznego przebiegu tras pozostaje jawny. Główne widoki projektu 4 i warsztatu 6 pozostają osobnymi źródłami.\n';
files.set('README.md', Buffer.from((readmeMd+scopeMd).replace(/\r\n/g, '\n')));
files.set('dane/slownik_pol.md', Buffer.from(slownikPolMd.replace(/\r\n/g, '\n')));
files.set('referencje/oczekiwane_wyniki.json', Buffer.from(JSON.stringify(oczekiwaneWynikiJson, null, 2) + '\n'));
files.set('referencje/obliczenia.md', Buffer.from((obliczeniaMd+physicalMd).replace(/\r\n/g, '\n')));

const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const roles = {
  'projekt-pokazowy.json': 'entry-project-package',
  'README.md': 'instructions',
  'dane/slownik_pol.md': 'field-dictionary',
  'referencje/oczekiwane_wyniki.json': 'independent-reference',
  'referencje/obliczenia.md': 'independent-calculation',
  'dane/warunki_eksperymentu.json': 'session-settings-reference'
};

json('manifest.json', {
  format: 'layout-studio-demo-manifest',
  formatVersion: 1,
  packageId: projectId,
  packageVersion: '1.1.0',
  title: source4.name,
  level: 'intermediate',
  language: 'pl',
  compatibleAppVersion: '0.4.0',
  importer: {format: api.PROJECT_PACKAGE_FORMAT, formatVersion: 1},
  dataOrigin: 'synthetic',
  units: {time: 's', geometry: 'mm', currency: 'PLN'},
  entryFile: 'projekt-pokazowy.json',
  variants: ['INTERMEDIATE-BASE', 'INTERMEDIATE-BALANCED'],
  assets: {externalFiles: [], appearance: 'built-in Table geometry, synthetic dimensions; no external downloads'},
  files: [...files].map(([path, bytes]) => ({
    path,
    role: roles[path] ?? (path.endsWith('.xlsx') ? 'spreadsheet-template' : 'data-projection'),
    format: path.split('.').pop(),
    bytes: bytes.length,
    sha256: hash(bytes)
  }))
});

for (const [path, bytes] of files) {
  const target = resolve(out, path);
  if (check) {
    if (!readFileSync(target).equals(bytes)) throw new Error(`Nieaktualny plik: ${path}`);
  } else {
    mkdirSync(dirname(target), {recursive: true});
    writeFileSync(target, bytes);
  }
}

console.log(`${check ? 'PASS reproducibility' : 'Generated'} 7.12.C1: ${files.size} files, synthetic intermediate example; independent references preserved, scheduler not invoked`);
