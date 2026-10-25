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
export * from './src/core/subassemblyFlow';
export * from './src/core/stationBuffers';
export * from './src/core/materialSupply';
export * from './src/core/stationRouting';
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
const out = resolve('przyklady/03_modul_urzadzenia');
const check = process.argv.includes('--check');
const at = '2026-10-25T00:00:00.000Z';
const projectId = 'DEMO-MODUL-URZADZENIA-1';

// 5 stations: 2 subassembly prep benches + 3 main line stations
const stations = [
  'ST-MU-PWR',   // Subassembly A: blok zasilacza i sterownika
  'ST-MU-DRV',   // Subassembly B: blok silnika i napędu
  'ST-MU-MAIN1', // Main 1: przygotowanie korpusu
  'ST-MU-MAIN2', // Main 2: punkt złączenia (integracja A + B do korpusu)
  'ST-MU-MAIN3'  // Main 3: test końcowy, obudowa i pakowanie
];

const ids = [
  'MU-OP10-A',
  'MU-OP10-B',
  'MU-OP10-M',
  'MU-OP20-M',
  'MU-OP30-M'
];

const names = [
  'Montaż bloku zasilania i sterownika (Podmontaż A)',
  'Montaż napędu i przekładni śrubowej (Podmontaż B)',
  'Inspekcja i przygotowanie korpusu nośnego',
  'Integracja podzespołów A+B w korpusie i okablowanie',
  'Test funkcjonalny, kalibracja i pakowanie końcowe'
];

const durations = [50, 60, 40, 70, 50];
const va = [40, 50, 32, 58, 42];

// Predecessors: OP10-A, OP10-B, OP10-M have no predecessors.
// OP20-M requires OP10-M, OP10-A, OP10-B!
// OP30-M requires OP20-M.
const predecessors = [
  [],
  [],
  [],
  ['MU-OP10-M', 'MU-OP10-A', 'MU-OP10-B'],
  ['MU-OP20-M']
];

const source4 = api.parseProject(JSON.stringify({
  schemaVersion: 4,
  id: projectId,
  name: 'Moduł urządzenia przemysłowego — DEMO syntetyczne zaawansowane',
  createdAt: at,
  updatedAt: at,
  timeUnit: 's',
  algorithm: 'Manual',
  currency: 'PLN',
  targetLayoutType: 'ProcessFlow',
  layoutMode: 'manual',
  layoutSettings: {tableWidthMm: 1600, tableLengthMm: 1000, spacingMm: 1200, aisleMm: 2000},
  facility: {widthMm: 14000, lengthMm: 10000, heightMm: 3500, gridSizeMm: 100, isConfirmed: false},
  obstacles: [],
  demand: {yearlyDemand: 30000, workingDaysPerYear: 250, shiftsPerDay: 1, hoursPerShift: 8, plannedBreaksMinutesPerShift: 0, oeePercent: 100},
  processSteps: ids.map((id, i) => ({
    id,
    name: names[i],
    standardTimeSeconds: durations[i],
    vaTimeSeconds: va[i],
    nvaTimeSeconds: durations[i] - va[i],
    sequenceNumber: i + 1,
    predecessorIds: predecessors[i],
    assignedWorkstationId: `WS-${i + 1}`
  })),
  workstationSettings: Object.fromEntries(ids.map(id => [JSON.stringify([id]), {operators: 1, parallelStations: 1}])),
  bom: [
    ['MU-ZASIL', 'Zasilacz impulsowy przemysłowy 24V', 1, 'BoxKLT', 10, ids[0], 180],
    ['MU-STER', 'Sterownik mikroprocesorowy PLC', 1, 'BoxKLT', 10, ids[0], 250],
    ['MU-SILNIK', 'Silnik krokowy z enkoderem', 1, 'BoxKLT', 5, ids[1], 210],
    ['MU-PRZEKL', 'Przekładnia śrubowa toczna z łożyskami', 1, 'BoxKLT', 5, ids[1], 160],
    ['MU-KORPUS', 'Aluminiowy korpus odlewany korpusu', 1, 'Pallet', 5, ids[2], 340],
    ['MU-WIAZKA', 'Wiązka przewodów i złącza sygnałowe', 1, 'BoxKLT', 20, ids[3], 65],
    ['MU-OBUD', 'Panele osłonowe z plexi i blachy', 1, 'Pallet', 5, ids[4], 95],
    ['MU-SKRZY', 'Skrzynia transportowa wyściełana', 1, 'Carton', 5, ids[4], 50]
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
  layoutObjects: [
    {id: 'MU-TABLE-PWR', name: 'Stół podmontażu zasilania i sterowania', type: 'Table', workstationId: 'WS-1', xMm: 2000, yMm: 2000, zMm: 0, widthMm: 1600, lengthMm: 1000, heightMm: 850, rotationDeg: 0, colorHex: '#2a5a8a', isVisualAssumption: true},
    {id: 'MU-TABLE-DRV', name: 'Stół podmontażu napędu i przekładni', type: 'Table', workstationId: 'WS-2', xMm: 2000, yMm: 5000, zMm: 0, widthMm: 1600, lengthMm: 1000, heightMm: 850, rotationDeg: 0, colorHex: '#2a5a8a', isVisualAssumption: true},
    {id: 'MU-TABLE-M1', name: 'Stół przygotowania korpusu (M1)', type: 'Table', workstationId: 'WS-3', xMm: 6000, yMm: 2000, zMm: 0, widthMm: 1600, lengthMm: 1000, heightMm: 850, rotationDeg: 0, colorHex: '#3979a8', isVisualAssumption: true},
    {id: 'MU-TABLE-M2', name: 'Stół integracji podzespołów (M2)', type: 'Table', workstationId: 'WS-4', xMm: 6000, yMm: 4500, zMm: 0, widthMm: 1600, lengthMm: 1000, heightMm: 850, rotationDeg: 0, colorHex: '#3979a8', isVisualAssumption: true},
    {id: 'MU-TABLE-M3', name: 'Stół testu końcowego i pakowania (M3)', type: 'Table', workstationId: 'WS-5', xMm: 6000, yMm: 7000, zMm: 0, widthMm: 1600, lengthMm: 1000, heightMm: 850, rotationDeg: 0, colorHex: '#3979a8', isVisualAssumption: true}
  ]
}));

const originalJson = JSON.stringify(source4);
let index = 0;
const base = api.prepareDomainMigration(api.previewDomainMigrationFromV4(originalJson, () => stations[index++])).project;

base.workers = [
  {id: 'MU-W1', name: 'Paweł Elektronik (montaż zasilania/sterowania)'},
  {id: 'MU-W2', name: 'Marek Mechanik (montaż napędów/przekładni)'},
  {id: 'MU-W3', name: 'Tomasz Monter (korpus główny)'},
  {id: 'MU-W4', name: 'Krzysztof Integrator (integracja podzespołów)'},
  {id: 'MU-W5', name: 'Michał Tester (diagnostyka i pakowanie)'},
  {id: 'MU-W6', name: 'Rafał Monter wspierający (wsparcie integracji)'}
];

base.workerPools = [
  {id: 'MU-P-ELEC', name: 'Zespół elektroniki', workerIds: ['MU-W1']},
  {id: 'MU-P-MECH', name: 'Zespół mechaniki i napędów', workerIds: ['MU-W2', 'MU-W3']},
  {id: 'MU-P-INT', name: 'Zespół integracji i montażu głównego', workerIds: ['MU-W4', 'MU-W6']},
  {id: 'MU-P-QC', name: 'Zespół testów i jakości', workerIds: ['MU-W5']}
];

base.product = {id: 'MU-PRODUCT', name: 'Moduł urządzenia — wyrób syntetyczny'};
// Explicit teaching rule: both independent subassemblies and the main body
// preparation may run simultaneously; integration waits for all three.
base.physicalConcurrency = {groups:[{id:'MU-PREPARATIONS',operationIds:['MU-OP10-A','MU-OP10-B','MU-OP10-M']}]};

base.subassemblies = [
  {id: 'SUB-PWR', name: 'Blok zasilania i sterowania PLC', producerOperationId: 'MU-OP10-A', consumerOperationIds: ['MU-OP20-M']},
  {id: 'SUB-DRV', name: 'Blok napędu śrubowego z silnikiem', producerOperationId: 'MU-OP10-B', consumerOperationIds: ['MU-OP20-M']}
];

// Operation physical roles & staffing
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
  if (op.id === 'MU-OP10-A') {
    op.physicalRole = {kind: 'subassembly-preparation', subassemblyIds: ['SUB-PWR']};
  } else if (op.id === 'MU-OP10-B') {
    op.physicalRole = {kind: 'subassembly-preparation', subassemblyIds: ['SUB-DRV']};
  } else {
    op.physicalRole = {kind: 'body-work'};
  }

  if (op.id === 'MU-OP20-M') {
    // Joint operation has 2-worker variant
    const profile2 = {
      durationSeconds: 40,
      durationBasis: 'assumed',
      manualWork: [{startSeconds: 0, endSeconds: 40, basis: 'assumed'}],
      machineRun: [],
      operatorPresence: [{startSeconds: 0, endSeconds: 40, basis: 'assumed'}]
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

// Base worker selection: 5 workers (W1..W5) on 5 stations
base.workerRunSelection = {
  teamWorkerIds: ['MU-W1', 'MU-W2', 'MU-W3', 'MU-W4', 'MU-W5'],
  operations: [
    {operationId: ids[0], workerCount: 1, eligibleWorkerIds: ['MU-W1']},
    {operationId: ids[1], workerCount: 1, eligibleWorkerIds: ['MU-W2']},
    {operationId: ids[2], workerCount: 1, eligibleWorkerIds: ['MU-W3']},
    {operationId: ids[3], workerCount: 1, eligibleWorkerIds: ['MU-W4']},
    {operationId: ids[4], workerCount: 1, eligibleWorkerIds: ['MU-W5']}
  ]
};

base.equipment = [
  ...stations.map((stationId, i) => ({
    id: `MU-EQ${i + 1}`,
    name: `Stół roboczy S${i + 1}`,
    stationId,
    layoutObjectId: source4.layoutObjects[i].id,
    capableOperationIds: [ids[i]]
  }))
];

base.stationRouting = {
  selectionRule: 'earliest-start-then-shortest-route',
  equipmentPlacements: stations.map((stationId, i) => ({
    equipmentId: `MU-EQ${i + 1}`,
    stationId,
    copy: 1
  })),
  operations: ids.map((operationId, i) => ({
    operationId,
    candidates: [{stationId: stations[i], copy: 1, requiredEquipmentIds: [`MU-EQ${i + 1}`]}]
  })),
  routes: []
};

// Subassembly flow with Rule A: producer-finish availability, consumer-start consumption
base.subassemblyFlow = {
  availability: 'producer-finish',
  consumption: 'consumer-start',
  lots: [
    // Job 1
    {id: 'LOT-PWR-1', subassemblyId: 'SUB-PWR', quantity: 1, unit: 'szt.', producer: {job: 1, operationId: 'MU-OP10-A'}, consumer: {job: 1, operationId: 'MU-OP20-M'}, consumptionQuantity: 1, source: 'Wykonanie bloku zasilania sztuki 1'},
    {id: 'LOT-DRV-1', subassemblyId: 'SUB-DRV', quantity: 1, unit: 'szt.', producer: {job: 1, operationId: 'MU-OP10-B'}, consumer: {job: 1, operationId: 'MU-OP20-M'}, consumptionQuantity: 1, source: 'Wykonanie napędu sztuki 1'},
    // Job 2
    {id: 'LOT-PWR-2', subassemblyId: 'SUB-PWR', quantity: 1, unit: 'szt.', producer: {job: 2, operationId: 'MU-OP10-A'}, consumer: {job: 2, operationId: 'MU-OP20-M'}, consumptionQuantity: 1, source: 'Wykonanie bloku zasilania sztuki 2'},
    {id: 'LOT-DRV-2', subassemblyId: 'SUB-DRV', quantity: 1, unit: 'szt.', producer: {job: 2, operationId: 'MU-OP10-B'}, consumer: {job: 2, operationId: 'MU-OP20-M'}, consumptionQuantity: 1, source: 'Wykonanie napędu sztuki 2'},
    // Job 3
    {id: 'LOT-PWR-3', subassemblyId: 'SUB-PWR', quantity: 1, unit: 'szt.', producer: {job: 3, operationId: 'MU-OP10-A'}, consumer: {job: 3, operationId: 'MU-OP20-M'}, consumptionQuantity: 1, source: 'Wykonanie bloku zasilania sztuki 3'},
    {id: 'LOT-DRV-3', subassemblyId: 'SUB-DRV', quantity: 1, unit: 'szt.', producer: {job: 3, operationId: 'MU-OP10-B'}, consumer: {job: 3, operationId: 'MU-OP20-M'}, consumptionQuantity: 1, source: 'Wykonanie napędu sztuki 3'}
  ]
};

// Physical acceptance A: separate products by 1000 s; verify branch join and explicit
// transport without pretending that finite branched buffers have been integrated.
base.bodyRunInput={bodies:[1,2,3].map(job=>({id:`MU-BODY-${job}`,productId:'MU-PRODUCT',location:{kind:'station',stationId:stations[2],copy:1}})),jobs:[1,2,3].map(job=>({job,bodyId:`MU-BODY-${job}`}))};
const physicalLegs=[['PWR-INT',0,3,5000],['DRV-INT',1,3,4500],['M1-INT',2,3,2500],['INT-TEST',3,4,2500]];
base.stationRouting.routes=physicalLegs.map(([id,from,to,distanceMm])=>({id:`MU-R-${id}`,from:{stationId:stations[from],copy:1},to:{stationId:stations[to],copy:1},distanceMm,basis:'confirmed',source:'Jawna syntetyczna długość, bez przebiegu geometrycznego trasy',transportTime:{durationSeconds:10,basis:'assumed',source:'Jawne założenie dydaktyczne przewozu: 10 s'}}));
base.equipment.push(...physicalLegs.map(([id])=>({id:`MU-CART-${id}`,name:`Wózek montażowy ${id} — dane syntetyczne`})));
base.assemblyTransport={scope:'assembly-only',carts:physicalLegs.map(([id,from])=>({equipmentId:`MU-CART-${id}`,initialLocation:{stationId:stations[from],copy:1},calendar:structuredClone(calendar),afterUnload:'return-to-initial',source:'Jawny powrót do źródła — przykład syntetyczny'})),conveyors:[],
  emptyRoutes:physicalLegs.map(([id,from,to,distanceMm],index)=>({id:`MU-RETURN-${id}`,equipmentId:`MU-CART-${id}`,from:{stationId:stations[to],copy:1},to:{stationId:stations[from],copy:1},distanceMm,basis:'confirmed',source:'Jawna syntetyczna trasa powrotna',transportTime:{durationSeconds:10,basis:'assumed',source:'Osobne założenie dydaktyczne pustego powrotu: 10 s'},workerAssignment:{workerIds:[`MU-W${index+1}`],source:'Transport wewnątrz procesu wykonuje monter źródłowy; dostawy magazynowe są oddzielne'}})),
  routes:physicalLegs.map(([id],index)=>({stationRouteId:`MU-R-${id}`,source:'Jawny przydział transportu podmontażu/korpusu do montera źródłowego',alternatives:[{workerIds:[`MU-W${index+1}`],equipmentIds:[`MU-CART-${id}`]}]}))};
const supplyDeclarations=[['MU-ZASIL',0],['MU-STER',0],['MU-SILNIK',1],['MU-PRZEKL',1],['MU-KORPUS',2],['MU-WIAZKA',3],['MU-OBUD',4],['MU-SKRZY',4]];
base.materialSupply={items:supplyDeclarations.map(([componentId,index])=>({id:`SUP-${componentId}`,componentId,targetStationId:stations[index],initialStock:10,unit:'szt.',schedule:{kind:'periodic',batchQuantity:10,intervalSeconds:900,firstDeliverySeconds:900},source:'Jawne dydaktyczne zapasy/dostawy magazynowe; wykonują je inne osoby, bez rezerwacji monterów'})),
  consumptions:supplyDeclarations.map(([componentId,index])=>({operationId:ids[index],supplyId:`SUP-${componentId}`,quantity:1,source:'Jawna dydaktyczna deklaracja jednej sztuki zużycia przy starcie, oddzielnie od BOM'}))};

base.competencyRequirements = {
  competencies: [
    {id: 'MU-C-ELEC', name: 'Elektronika i sterowanie PLC'},
    {id: 'MU-C-MECH', name: 'Mechanika precyzyjna i napędy'},
    {id: 'MU-C-INT', name: 'Integracja systemowa i montaż'},
    {id: 'MU-C-TEST', name: 'Diagnostyka, testy i pakowanie'}
  ],
  workers: [
    {workerId: 'MU-W1', competencyIds: ['MU-C-ELEC']},
    {workerId: 'MU-W2', competencyIds: ['MU-C-MECH']},
    {workerId: 'MU-W3', competencyIds: ['MU-C-MECH']},
    {workerId: 'MU-W4', competencyIds: ['MU-C-INT']},
    {workerId: 'MU-W5', competencyIds: ['MU-C-TEST']},
    {workerId: 'MU-W6', competencyIds: ['MU-C-INT', 'MU-C-MECH']}
  ],
  operations: [
    {operationId: ids[0], requiredCompetencyIds: ['MU-C-ELEC']},
    {operationId: ids[1], requiredCompetencyIds: ['MU-C-MECH']},
    {operationId: ids[2], requiredCompetencyIds: ['MU-C-MECH']},
    {operationId: ids[3], requiredCompetencyIds: ['MU-C-INT']},
    {operationId: ids[4], requiredCompetencyIds: ['MU-C-TEST']}
  ]
};

api.parseDomainProjectV6(JSON.stringify(base));

// Balanced variant: 2 workers on joint integration node OP20-M (MU-W4 + MU-W6)
const balanced = structuredClone(base);
balanced.workerRunSelection.teamWorkerIds = ['MU-W1', 'MU-W2', 'MU-W3', 'MU-W4', 'MU-W5', 'MU-W6'];
balanced.workerRunSelection.operations[3] = {
  operationId: ids[3],
  workerCount: 2,
  eligibleWorkerIds: ['MU-W4', 'MU-W6']
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
  ['ADVANCED-BASE', 'Baza — 2 gałęzie podmontaży + montaż główny (wąskie gardło OP20-M: 70s)', 'baseline', base],
  ['ADVANCED-BALANCED', 'Zbalansowany — integracja OP20-M 2-osobowa (40s) / odstęp 60s', 'additional-worker', balanced]
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
  transportMode: 'just-in-time',
  physicalConditions:{batch:3,arrivalIntervalSeconds:1000,transportMode:'configured'},
  physicalScope:'Acceptance A only: body and subassembly transport, warehouse availability; finite branched buffers NOT supported or accepted',
  physicalAssumptions:'Four assembly carts; upstream assemblers transport and return. Loaded travel 10s, empty return separately assumed 10s. Eight explicit material stocks: initial 10, delivery 10 at 900s and each 900s; consumption 1 declared unit per assigned operation.',
  initialArrivalsSeconds: [0, 1, 2],
  materialAvailability: 'explicit-subassemblies-rule-A',
  subassemblyFlowRule: 'Rule A: producer-finish lot availability, consumer-start atomic consumption',
  convergingBranches: 'Branch A (SUB-PWR: OP10-A, 50s) and Branch B (SUB-DRV: OP10-B, 60s) converge at OP20-M (Integration)',
  jointOperation: 'MU-OP20-M starts only when main body, subassembly A, and subassembly B are all ready',
  costAssumptions: null,
  stochasticConfig: null,
  calendarWindowSeconds: [0, 28800],
  calendarBreaks: [],
  sourceOfProductionMeasurements: 'none — designed teaching example for advanced multi-branch complexity',
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

const slownikPolMd = `# Słownik pól i jednostek — Projekt zaawansowany: Moduł urządzenia

Pochodzenie danych: **syntetyczne**. Projekt demonstracyjny poziomu zaawansowanego (7.12.C) przygotowany zgodnie ze standardem 7.12.A.

## Jednostki miar

| Wielkość | Jednostka | Uwagi |
| --- | --- | --- |
| Czas | sekundy [s] | Wewnętrzny format wszystkich czasów w silniku symulacji |
| Geometria / Długość | milimetry [mm] | Koordynaty 2D/3D, odległości między stołami, gabaryty wyposażenia |
| Zdolność produkcyjna | [szt./h] | Zdolność nominalna: $3600 / \\text{takt}$ |
| Waluta / Koszty | PLN | Koszty jednostkowe komponentów BOM |

## Struktura procesu i operacji

- **Gałąź A (Podmontaż zasilacza i sterownika)**:
  - **MU-OP10-A**: Czas 50 s (VA 40 s, NVA 10 s). Wytwarza podzespół \`SUB-PWR\` (Blok zasilania i sterowania PLC). Rola: \`subassembly-preparation\`.
- **Gałąź B (Podmontaż napędu śrubowego)**:
  - **MU-OP10-B**: Czas 60 s (VA 50 s, NVA 10 s). Wytwarza podzespół \`SUB-DRV\` (Blok napędu śrubowego z silnikiem). Rola: \`subassembly-preparation\`.
- **Główna nitka montażu korpusu**:
  - **MU-OP10-M**: Inspekcja i przygotowanie korpusu nośnego: czas 40 s (VA 32 s, NVA 8 s). Rola: \`body-work\`.
  - **MU-OP20-M** (Węzeł złączenia / integracja):
    - Wymaga jednoczesnej gotowości: korpusu głównego oraz obu podzespołów \`SUB-PWR\` i \`SUB-DRV\`.
    - Obsada 1 osoba: czas standardowy 70 s (VA 58 s, NVA 12 s) — wąskie gardło wariantu bazowego.
    - Obsada 2 osoby: czas standardowy 40 s (VA 32 s, NVA 8 s) — zbalansowany wariant reorganizacji.
  - **MU-OP30-M**: Test funkcjonalny, kalibracja i pakowanie końcowe: czas 50 s (VA 42 s, NVA 8 s). Rola: \`body-work\`.

## Reguła A przepływu podzespołów (Subassembly Flow)

- Dostępność partii następuje dokładnie w momencie zakończenia operacji producenta (\`availability: 'producer-finish'\`).
- Pobranie i zużycie partii następuje atomowo dokładnie przy starcie operacji odbiorcy (\`consumption: 'consumer-start'\`).
- Operacja złączenia nie może wystartować przed ukończeniem obu gałęzi podmontaży.
`;

const oczekiwaneWynikiJson = {
  "referenceVersion": 1,
  "dataOrigin": "synthetic",
  "method": "Niezależny rachunek 2026-10-24: A co 50 s, B co 60 s, korpus co 40 s od zera; integracja po wszystkich trzech poprzednikach, potem test 50 s. Jawna grupa równoległości, JIT; bez uruchamiania silnika przy tworzeniu wzorca.",
  "conditions": {
    "batch": 3,
    "arrivalIntervalSeconds": 1,
    "transportMode": "just-in-time"
  },
  "units": {
    "time": "s",
    "capacity": "szt./h",
    "cost": "PLN/szt."
  },
  "absoluteToleranceSeconds": 1e-9,
  "subassemblyModel": "Reguła A: partia podzespołu dostępna po zakończeniu producenta; atomowe pobranie przy starcie odbiorcy; węzeł złączenia MU-OP20-M czeka na obie gałęzie i korpus.",
  "customerTaktSeconds": 240,
  "targetCycleSecondsBase": 70,
  "targetCycleSecondsBalanced": 60,
  "workContentSecondsBase": 270,
  "workContentSecondsBalanced": 280,
  "bomCostPerUnit": 1350,
  "variants": [
    {
      "id": "ADVANCED-BASE",
      "activeStations": 5,
      "selectedWorkers": 5,
      "bottleneckStationId": "ST-MU-MAIN2",
      "bottleneckCycleSeconds": 70,
      "staticCapacityPerHour": 51.429,
      "batchMakespanSeconds": 320,
      "completionSeconds": [
        180,
        250,
        320
      ],
      "operationWindows": [
        [
          1,
          "MU-OP10-A",
          0,
          50
        ],
        [
          1,
          "MU-OP10-B",
          0,
          60
        ],
        [
          1,
          "MU-OP10-M",
          0,
          40
        ],
        [
          1,
          "MU-OP20-M",
          60,
          130
        ],
        [
          1,
          "MU-OP30-M",
          130,
          180
        ],
        [
          2,
          "MU-OP10-A",
          50,
          100
        ],
        [
          2,
          "MU-OP10-B",
          60,
          120
        ],
        [
          2,
          "MU-OP10-M",
          40,
          80
        ],
        [
          2,
          "MU-OP20-M",
          130,
          200
        ],
        [
          2,
          "MU-OP30-M",
          200,
          250
        ],
        [
          3,
          "MU-OP10-A",
          100,
          150
        ],
        [
          3,
          "MU-OP10-B",
          120,
          180
        ],
        [
          3,
          "MU-OP10-M",
          80,
          120
        ],
        [
          3,
          "MU-OP20-M",
          200,
          270
        ],
        [
          3,
          "MU-OP30-M",
          270,
          320
        ]
      ]
    },
    {
      "id": "ADVANCED-BALANCED",
      "activeStations": 5,
      "selectedWorkers": 6,
      "bottleneckStationId": "ST-MU-DRV",
      "bottleneckCycleSeconds": 60,
      "staticCapacityPerHour": 60,
      "batchMakespanSeconds": 270,
      "completionSeconds": [
        150,
        210,
        270
      ],
      "operationWindows": [
        [
          1,
          "MU-OP10-A",
          0,
          50
        ],
        [
          1,
          "MU-OP10-B",
          0,
          60
        ],
        [
          1,
          "MU-OP10-M",
          0,
          40
        ],
        [
          1,
          "MU-OP20-M",
          60,
          100
        ],
        [
          1,
          "MU-OP30-M",
          100,
          150
        ],
        [
          2,
          "MU-OP10-A",
          50,
          100
        ],
        [
          2,
          "MU-OP10-B",
          60,
          120
        ],
        [
          2,
          "MU-OP10-M",
          40,
          80
        ],
        [
          2,
          "MU-OP20-M",
          120,
          160
        ],
        [
          2,
          "MU-OP30-M",
          160,
          210
        ],
        [
          3,
          "MU-OP10-A",
          100,
          150
        ],
        [
          3,
          "MU-OP10-B",
          120,
          180
        ],
        [
          3,
          "MU-OP10-M",
          80,
          120
        ],
        [
          3,
          "MU-OP20-M",
          180,
          220
        ],
        [
          3,
          "MU-OP30-M",
          220,
          270
        ]
      ]
    }
  ]
};
const obliczeniaMd = `# Niezależne obliczenia — równoległe podmontaże

Dane syntetyczne, JIT z założoną dostępnością materiałów; nie jest to odbiór transportu fizycznego.
Popyt: 30000 / 250 = 120 szt./dzień, czas dostępny 28800 s, takt klienta 240 s.
Gałęzie A (50 s), B (60 s) i przygotowanie korpusu (40 s) mają oddzielnych monterów i stanowiska oraz jawną grupę MU-PREPARATIONS.
Dla sztuk 1/2/3 końce A to 50/100/150 s, B to 60/120/180 s, korpusu to 40/80/120 s.
Integracja wymaga obu podzespołów i korpusu, a ich zadeklarowane partie pobiera atomowo na starcie.

## Baza — integracja 70 s, test 50 s

Integracja zaczyna w max(50,60,40)=60 s; kolejne starty to max(100,120,80,130)=130 i max(150,180,120,200)=200 s.
Końce integracji 130/200/270 s, końce testu 180/250/320 s. Partia 3 sztuk: **320 s**.
Statyczny pułap kopii: 3600/70 = 51,429 szt./h, nie prognoza wydajności z transportem.

## Reorganizacja — dwie osoby na integracji, jawny czas zespołu 40 s

Integracja 60–100, 120–160, 180–220 s; test 100–150, 160–210, 220–270 s.
Partia: **270 s**, spadek 50 s. Nie dzielimy czasu 70 s przez dwa; 40 s jest jawnym założeniem wariantu.
Pułap determinuje gałąź B: 3600/60 = 60 szt./h. Koszt BOM z jawnych ilości i cen: 1350 PLN/szt.
Nie należy mylić sumy czasów operacji z osobosekundami zespołu: po dodaniu osoby zawartość pracy może rosnąć mimo krótszego wykonania.
`;
const readmeMd = `# Projekt pokazowy zaawansowany — Montaż modułu urządzenia przemysłowego

Pakiet demonstracyjny: \`03_modul_urzadzenia\`
Wersja: **1.1.0 — częściowy odbiór fizyczny A, bufory rozgałęzione nadal otwarte**
Pochodzenie danych: **jawnie syntetyczne** (dane demonstracyjno-dydaktyczne)
Identyfikator: \`DEMO-MODUL-URZADZENIA-1\`
Zgodność: **Layout Studio Pro 3D v0.4.0+**

## Cel i zakres demonstracji

Pakiet reprezentuje zaawansowany poziom złożoności (**advanced**) i demonstruje:
1. **Wielowątkowy proces rozgałęziony**: główna linia montażu korpusu zasilana przez dwie niezależne, równoległe gałęzie przygotowania podzespołów:
   - Gałąź A: montaż bloku zasilacza i sterowania PLC (\`SUB-PWR\`).
   - Gałąź B: montaż napędu śrubowego z silnikiem (\`SUB-DRV\`).
2. **Punkt złączenia (Joint Node)**: operacja integracji OP20-M nie ruszy bez potwierdzenia gotowości korpusu oraz obu podzespołów A i B.
3. **Reguła A przepływu podzespołów**: pełna partia podzespołu staje się dostępna po zakończeniu producenta; atomowe pobranie przy starcie odbiorcy.
4. **Zbalansowanie węzła złączenia**: wariant bazowy (70 s na węźle integracji, makespan 320 s) vs wariant zbalansowany 2-osobowy (40 s na integracji, nowy pułap odstępu 60 s, makespan 270 s).

## Zawartość katalogu

- \`projekt-pokazowy.json\` — główny plik pakietu (importowany przez przycisk **Pakiet projektu**).
- \`manifest.json\` — inwentarz pakietu z sumami kontrolnymi SHA-256.
- \`dane/proces.xlsx\` — arkusz procesu technologicznego z grafem poprzedników (zbieżność gałęzi).
- \`dane/bom.xlsx\` — zestawienie materiałowe z podzespołami i kosztem jednostkowym (1350 PLN).
- \`dane/szkic6.json\`, \`dane/warianty6.json\`, \`dane/zrodlo4.json\` — projekcje danych JSON.
- \`dane/warunki_eksperymentu.json\` — zalecane parametry sesji symulacji.
- \`dane/slownik_pol.md\` — słownik pojęć, jednostek i reguły A.
- \`referencje/oczekiwane_wyniki.json\`, \`referencje/obliczenia.md\` — niezależny wzorzec analityczny.

## Instrukcja uruchomienia w aplikacji

1. W aplikacji kliknij **Pakiet projektu** i wczytaj plik \`projekt-pokazowy.json\`.
2. Pobierz automatyczną kopię ratunkową i zatwierdź import.
3. Dla procesowego wzorca w **Proces i stanowiska → Stanowiska i zasoby** włącz jawnie **JIT**:
   - Ustaw partię: **3 sztuki**.
   - Odstęp przybyć: **1 s**.
4. Wybierz wariant **ADVANCED-BASE** i uruchom symulację. Graf JIT zachowuje poprzedniki obu gałęzi; rejestr ilości i transport partii sprawdza osobny eksperyment fizyczny poniżej. Czas ukończenia partii JIT: **320 s**.
5. Przełącz na wariant **ADVANCED-BALANCED** i ponów symulację JIT. Czas partii spada do **270 s** dzięki odciążeniu węzła złączenia.
6. Przejdź do modułu **Porównanie wariantów**, aby wyświetlić tabelę syntezy i pobrać raport.
`;

// Literal hand-derived timing, authored before running the scheduler. Products are
// explicitly spaced to isolate branch joins; this is not a throughput/load test.
oczekiwaneWynikiJson.physical={conditions:{batch:3,arrivalIntervalSeconds:1000,transportMode:'configured'},scope:'Transport/join/supply only; finite branched buffers remain unsupported',
  variants:[{id:'ADVANCED-BASE',completionSeconds:[210,1210,2210],operationWindows:[0,1000,2000].flatMap((offset,index)=>[
    [index+1,'MU-OP10-A',offset,offset+50],[index+1,'MU-OP10-B',offset,offset+60],[index+1,'MU-OP10-M',offset,offset+40],[index+1,'MU-OP20-M',offset+80,offset+150],[index+1,'MU-OP30-M',offset+160,offset+210]])},
    {id:'ADVANCED-BALANCED',completionSeconds:[180,1180,2180],operationWindows:[0,1000,2000].flatMap((offset,index)=>[
    [index+1,'MU-OP10-A',offset,offset+50],[index+1,'MU-OP10-B',offset,offset+60],[index+1,'MU-OP10-M',offset,offset+40],[index+1,'MU-OP20-M',offset+80,offset+120],[index+1,'MU-OP30-M',offset+130,offset+180]])}],
  supplyCase:{change:'Only SUP-MU-ZASIL initialStock=0; first delivery remains 900 s. Other branches can prepare at 0 s.',completionBase:[1100,1210,2210],completionBalanced:[1070,1180,2180]}};
const physicalReadme='\n\n## Częściowy odbiór fizyczny A (1.1.0)\n\nW Proces i stanowiska → Stanowiska i zasoby ustaw **3 sztuki, odstęp 1000 s, JIT WYŁĄCZONY**. Baza: 210/1210/2210 s; reorganizacja: 180/1180/2180 s. Odstęp izoluje łączenie gałęzi, nie jest próbą wydajności pod obciążeniem. Osobne 320/270 s pozostają wzorcami procesowymi JIT przy odstępie 1 s.\n\nMonterzy źródłowi MU-W1/W2 transportują podmontaże do integracji, MU-W3 przewozi korpus do integracji, MU-W4 do testu; cztery wózki wracają do źródeł. Czas załadowany 10 s i pusty powrót 10 s to dwa jawne założenia dydaktyczne. Dostawy ośmiu komponentów z magazynu wykonują inne osoby: zdarzenia dostępności nie zajmują monterów. Próba niedoboru: ustaw tylko SUP-MU-ZASIL na zapas 0 i pozostaw pierwszą dostawę 900 s; baza kończy w 1100/1210/2210 s, reorganizacja 1070/1180/2180 s. Pozostałe dwie gałęzie pierwszej sztuki nadal pracują od 0 s.\n\n**C2 nadal w trakcie:** ograniczone bufory dla gałęzi i partii podzespołów nie są jeszcze zintegrowane. Ten eksperyment nie narzuca ograniczeń pojemności i nie odbiera blokowania po obróbce. Próba dodania skończonego bufora jest jawnie odrzucana. Nie zastępuj tego włączeniem JIT jako rzekomym odbiorem fizycznym. Brak geometrii przebiegu tras pozostaje jawny; A2b2b pokazuje historię korpusów/wózków, rejestr podzespołów jest w inspekcji wyniku, bez ich osobnej animacji. Główne widoki 4 i model 6 pozostają osobne.\n';
const physicalCalculation='\n\n## Niezależny wzorzec fizyczny A — 2026-10-25\n\nDla każdej odizolowanej sztuki przygotowania startują razem w t=0: zasilanie kończy w 50, napęd w 60, korpus w 40 s. W obecnej regule harmonogramowania gotowość technologiczna integracji w 60 s poprzedza zlecenie dostarczenia partii. Oba podmontaże jadą 60–70 niezależnymi wózkami i monterami, ich puste powroty zajmują 70–80. Korpus jedzie 70–80, gdy partie już dotarły, i jego wózek wraca 80–90. Integracja startuje w 80: koniec 150 (baza) lub 120 (zespół). Przewóz do testu 150–160 lub 120–130, osobny powrót 160–170 lub 130–140. Test trwa 50 s: końce 210/180 s. Kolejne sztuki przybywają w 1000 i 2000 s; zasoby poprzedniej są już zwolnione, więc wzorzec przesuwa się o te jawne czasy.\n\nDla zerowego zapasu zasilacza gałąź A czeka do dostawy w 900 s, pracuje 900–950; gałąź napędu i korpus pozostają 0–60 oraz 0–40. Złączenie czeka na A. Podmontaże jadą 950–960, korpus 960–970, integracja 970–1040 lub 970–1010, a test 1050–1100 lub 1020–1070. Następne sztuki z odstępem 1000 s nie są już opóźnione. Wszystkie ilości, zapasy, terminy, obsady i czasy są jawnymi założeniami syntetycznymi, bez danych magazynowych pracowników.\n\nOgraniczone bufory rozgałęzień wymagają osobnej integracji silnika. Nie wyznaczono dla nich pozornego wzorca przy JIT i nie oznaczono pełnego C2 jako odebrane.\n';
files.set('README.md', Buffer.from((readmeMd+physicalReadme).replace(/\r\n/g, '\n')));
files.set('dane/slownik_pol.md', Buffer.from(slownikPolMd.replace(/\r\n/g, '\n')));
files.set('referencje/oczekiwane_wyniki.json', Buffer.from(JSON.stringify(oczekiwaneWynikiJson, null, 2) + '\n'));
files.set('referencje/obliczenia.md', Buffer.from((obliczeniaMd+physicalCalculation).replace(/\r\n/g, '\n')));

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
  level: 'advanced',
  language: 'pl',
  compatibleAppVersion: '0.4.0',
  importer: {format: api.PROJECT_PACKAGE_FORMAT, formatVersion: 1},
  dataOrigin: 'synthetic',
  units: {time: 's', geometry: 'mm', currency: 'PLN'},
  entryFile: 'projekt-pokazowy.json',
  variants: ['ADVANCED-BASE', 'ADVANCED-BALANCED'],
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

console.log(`${check ? 'PASS reproducibility' : 'Generated'} 7.12.C2: ${files.size} files, synthetic advanced example; independent references preserved, scheduler not invoked`);
