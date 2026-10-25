import {build} from 'esbuild';
import {readFileSync, writeFileSync, mkdirSync} from 'node:fs';
import {resolve, dirname} from 'node:path';
import {createHash} from 'node:crypto';
import XLSX from 'xlsx';

process.on('uncaughtException', error => {
  console.error(error.message);
  process.exitCode = 1;
});

// Deterministic generator of the complete external Eko demonstration package (Plan 7.13 prerequisite).
// Incorporates real factory measurements from July 2026 for OP10–OP21 and explicit example times for OP22–OP25.
const bundle = await build({
  stdin: {
    contents: `
export * from './src/core/validation';
export * from './src/core/stationProject';
export * from './src/core/domainProject';
export * from './src/core/domainMigrationPreview';
export * from './src/core/workerSchedule';
export * from './src/core/domainDraftStorage';
export * from './src/core/domainVariantComparison';
export * from './src/core/projectPackage';
export * from './src/core/export/excelImporter';
export {createEkoTestScenario} from './tests/fixtures/ekoDomainScenarios';
export {sha256Hex} from './src/core/workspaceBackup';
`,
    resolveDir: process.cwd()
  },
  bundle: true,
  platform: 'node',
  format: 'esm',
  write: false
});

const api = await import('data:text/javascript;base64,' + Buffer.from(bundle.outputFiles[0].text).toString('base64'));
const out = resolve('przyklady/04_eko');
const check = process.argv.includes('--check');
const at = '2026-10-24T00:00:00.000Z';
const projectId = 'eko-demo-v04';

// Load authoritative Eko source files
const baseProject = JSON.parse(readFileSync('tests/fixtures/ekoDemoSource4.json', 'utf8'));
baseProject.id = projectId;
baseProject.createdAt = at;
baseProject.updatedAt = at;

const source4Json = JSON.stringify(baseProject);

const e5Raw = JSON.parse(readFileSync('tests/qa/Eko_D5_actual_export_v5.json', 'utf8'));
e5Raw.id = projectId;
e5Raw.createdAt = at;
e5Raw.updatedAt = at;
const source5Json = JSON.stringify(e5Raw);

// Generate domain 6 projects for the three variants
const {project: pParallel} = api.createEkoTestScenario(source5Json, 'parallel');
pParallel.id = projectId;

const {project: pSequential} = api.createEkoTestScenario(source5Json, 'sequential');
pSequential.id = projectId;

const {project: pShared} = api.createEkoTestScenario(source5Json, 'shared-worker');
pShared.id = projectId;

// Actual time evidence does not establish worker identities or sharing.
// Keep the teaching roles explicit; do not pretend they reproduce 13 people.
for(const project of [pParallel,pSequential,pShared]){
  project.workers.push({id:'DEMO-PACK-2',name:'Druga testowa rola pakowania'});
  project.workerRunSelection.teamWorkerIds.push('DEMO-PACK-2');
  for(const operation of project.operations){
    const packing=operation.id==='OP21',count=packing?2:1;
    const profile=operation.staffing.timeVariants[0].timeProfile;
    profile.durationBasis=['OP22','OP23','OP24','OP25'].includes(operation.id)?'assumed':'measured';
    if(packing){
      operation.staffing.requiredWorkers=count;
      operation.staffing.timeVariants[0].workerCount=count;
      profile.operatorPresence=[{startSeconds:0,endSeconds:1320,basis:'measured'}];
      const selection=project.workerRunSelection.operations.find(x=>x.operationId==='OP21');
      selection.workerCount=count;selection.eligibleWorkerIds.push('DEMO-PACK-2');
      const station=project.stationRouting.operations.find(x=>x.operationId==='OP21').candidates[0].stationId;
      project.stationSettings[station].operators=2;
    }
  }
}

const draftSave = {
  kind: 'domain-draft-save',
  version: 1,
  at,
  sourceSchemaVersion: 5,
  originalJson: source5Json,
  project: pParallel
};
const draftRaw = JSON.stringify(draftSave);

const variantsSave = {
  kind: 'domain-variant-library',
  version: 1,
  variants: [
    {
      id: 'EKO-PARALLEL',
      name: 'Eko — montaż równoległy drzwi (baza)',
      category: 'baseline',
      at,
      sourceSchemaVersion: 5,
      originalJson: source5Json,
      project: pParallel
    },
    {
      id: 'EKO-SEQUENTIAL',
      name: 'Eko — montaż sekwencyjny',
      category: 'changed-layout',
      at,
      sourceSchemaVersion: 5,
      originalJson: source5Json,
      project: pSequential
    },
    {
      id: 'EKO-SHARED-WORKER',
      name: 'Eko — współdzielony monter drzwi',
      category: 'additional-worker',
      at,
      sourceSchemaVersion: 5,
      originalJson: source5Json,
      project: pShared
    }
  ]
};
const variantsRaw = JSON.stringify(variantsSave);

const packageData = {
  dataOrigin: 'mixed',
  source4Json,
  source5Json,
  draftRaw,
  variantsRaw
};

const projectPackage = {
  format: 'layout-studio-project-package',
  formatVersion: 1,
  appVersion: '0.4.0',
  createdAt: at,
  checksumSha256: api.sha256Hex(JSON.stringify(packageData)),
  data: packageData
};

// Validate that package is strictly compliant with parseProjectPackage
api.parseProjectPackage(JSON.stringify(projectPackage));

// Build dane/proces.xlsx
const processSteps = baseProject.processSteps;
const processRows = processSteps.map(step => ({
  'ID Kroku': step.id,
  'Nazwa Operacji': step.name,
  'Czas Standardowy [s]': step.standardTimeSeconds,
  'Wartość Dodana VA [s]': step.vaTimeSeconds,
  'Strata NVA [s]': step.nvaTimeSeconds,
  'Poprzednicy': step.predecessorIds.join(', '),
  'Następnicy': processSteps.filter(s => s.predecessorIds.includes(step.id)).map(s => s.id).join(', ')
}));

const processWorkbook = XLSX.utils.book_new();
const processSheet = XLSX.utils.json_to_sheet(processRows);
XLSX.utils.book_append_sheet(processWorkbook, processSheet, 'Dane');

const processColumnsDesc = [
  {Kolumna: 'ID Kroku', Wymagana: 'Tak', Typ: 'Tekst', Opis: 'Unikalny identyfikator operacji (OP10..OP25).'},
  {Kolumna: 'Nazwa Operacji', Wymagana: 'Tak', Typ: 'Tekst', Opis: 'Technologiczna nazwa operacji.'},
  {Kolumna: 'Czas Standardowy [s]', Wymagana: 'Tak', Typ: 'Liczba', Opis: 'Czas bazowy operacji w sekundach.'},
  {Kolumna: 'Wartość Dodana VA [s]', Wymagana: 'Nie', Typ: 'Liczba', Opis: 'Czas dodający wartość klienta.'},
  {Kolumna: 'Strata NVA [s]', Wymagana: 'Nie', Typ: 'Liczba', Opis: 'Czas operacyjny niedodający wartości.'},
  {Kolumna: 'Poprzednicy', Wymagana: 'Nie', Typ: 'Tekst', Opis: 'Rozdzielona przecinkami lista ID kroków poprzedzających.'},
  {Kolumna: 'Następnicy', Wymagana: 'Nie', Typ: 'Tekst', Opis: 'Lista kroków następujących.'}
];
XLSX.utils.book_append_sheet(processWorkbook, XLSX.utils.json_to_sheet(processColumnsDesc), 'Opis kolumn');
XLSX.utils.book_append_sheet(processWorkbook, XLSX.utils.json_to_sheet([
  {Cecha: 'Pochodzenie danych', Wartość: 'mixed — pomiary rzeczywiste lipiec 2026 (OP10–OP21), czasy przykładowe (OP22–OP25)'},
  {Cecha: 'Liczba operacji', Wartość: '16'},
  {Cecha: 'Suma czasów operacji (nie osobosekund)', Wartość: String(processSteps.reduce((sum,step)=>sum+step.standardTimeSeconds,0))+' s'},
  {Cecha: 'Obsada źródłowa', Wartość: '13 osób łącznie; OP21 dwie przez całe 1320 s. Model demonstracyjny ma 17 ról testowych, nie jest odtworzeniem przydziałów 13 osób.'}
]), 'Pochodzenie');
const processXlsxBytes = XLSX.write(processWorkbook, {type: 'buffer', bookType: 'xlsx'});

// Build dane/bom.xlsx
const bomItems = baseProject.bom;
const bomRows = bomItems.map(item => ({
  'Nr Części (Part No)': item.partNumber,
  'Nazwa Komponentu': item.name,
  'Ilość na Wyrób': item.quantityPerUnit,
  'Typ Pojemnika': item.container,
  'Ilość w Opakowaniu': item.packageQuantity,
  'Przypisany Krok': item.associatedProcessStepId,
  'Koszt Jednostkowy': item.unitCost
}));

const bomWorkbook = XLSX.utils.book_new();
const bomSheet = XLSX.utils.json_to_sheet(bomRows);
XLSX.utils.book_append_sheet(bomWorkbook, bomSheet, 'Dane');

const bomColumnsDesc = [
  {Kolumna: 'Nr Części (Part No)', Wymagana: 'Tak', Typ: 'Tekst', Opis: 'Numer katalogowy części.'},
  {Kolumna: 'Nazwa Komponentu', Wymagana: 'Tak', Typ: 'Tekst', Opis: 'Nazwa handlowa/materiałowa części.'},
  {Kolumna: 'Ilość na Wyrób', Wymagana: 'Tak', Typ: 'Liczba', Opis: 'Ilość zużywana na jedną sztukę wyrobu.'},
  {Kolumna: 'Typ Pojemnika', Wymagana: 'Tak', Typ: 'Tekst', Opis: 'Dopuszczalne: BoxKLT, Pallet, Tray, Carton.'},
  {Kolumna: 'Ilość w Opakowaniu', Wymagana: 'Tak', Typ: 'Liczba', Opis: 'Pojemność jednostki logistycznej.'},
  {Kolumna: 'Przypisany Krok', Wymagana: 'Tak', Typ: 'Tekst', Opis: 'ID operacji procesu konsumującej komponent.'},
  {Kolumna: 'Koszt Jednostkowy', Wymagana: 'Nie', Typ: 'Liczba', Opis: 'Cena w PLN.'}
];
XLSX.utils.book_append_sheet(bomWorkbook, XLSX.utils.json_to_sheet(bomColumnsDesc), 'Opis kolumn');
XLSX.utils.book_append_sheet(bomWorkbook, XLSX.utils.json_to_sheet([
  {Cecha: 'Pochodzenie danych', Wartość: 'mixed — zestawienie materiałowe ramy Eko'},
  {Cecha: 'Liczba pozycji BOM', Wartość: String(bomItems.length)},
  {Cecha: 'Waluta', Wartość: 'PLN'}
]), 'Pochodzenie');
const bomXlsxBytes = XLSX.write(bomWorkbook, {type: 'buffer', bookType: 'xlsx'});

// Prepare text projections and documentation
const filesToGenerate = new Map();

filesToGenerate.set('projekt-pokazowy.json', Buffer.from(JSON.stringify(projectPackage, null, 2) + '\n', 'utf8'));
filesToGenerate.set('dane/proces.xlsx', processXlsxBytes);
filesToGenerate.set('dane/bom.xlsx', bomXlsxBytes);
filesToGenerate.set('dane/zrodlo4.json', Buffer.from(JSON.stringify(baseProject, null, 2) + '\n', 'utf8'));
filesToGenerate.set('dane/szkic6.json', Buffer.from(JSON.stringify(draftSave, null, 2) + '\n', 'utf8'));
filesToGenerate.set('dane/warianty6.json', Buffer.from(JSON.stringify(variantsSave, null, 2) + '\n', 'utf8'));

const experimentConditions = {
  format: 'layout-studio-experiment-conditions',
  formatVersion: 1,
  packageId: '04_eko',
  dataOrigin: 'mixed',
  conditions: {
    batch: 1,
    arrivalIntervalSeconds: 1,
    transportMode: 'configured',
    initialState: 'empty-line',
    notes: 'Symulacja montażu 1 sztuki wyrobu Eko. Grupy równoległe ramy i drzwi. Pomiary rzeczywiste lipiec 2026 (OP10–OP21), czasy przykładowe OP22–OP25.'
  }
};
filesToGenerate.set('dane/warunki_eksperymentu.json', Buffer.from(JSON.stringify(experimentConditions, null, 2) + '\n', 'utf8'));

const dictionary = `# Słownik pojęć, operacji i danych — Projekt Eko (04_eko)

Pochodzenie danych: **mixed** (pomiary rzeczywiste lipiec 2026 dla operacji OP10–OP21; 4 czasy przykładowe OP22–OP25).

## 1. Operacje montażu (16 kroków)

${processSteps.map(step=>`- **${step.id}** — ${step.name}: **${step.standardTimeSeconds} s**; ${['OP22','OP23','OP24','OP25'].includes(step.id)?'czas przykładowy':'średnia z kilku pomiarów, liczba prób nieznana'}.`).join('\n')}

Suma czasów: **${processSteps.reduce((sum,step)=>sum+step.standardTimeSeconds,0)} s**, nie liczba osobosekund. OP21: dwie osoby przez całe 1320 s; czas nie jest dzielony przez dwa. Pozostałe przydziały i równoległość to jawne założenia demonstracyjne (17 ról testowych), nie odtworzenie rzeczywistych 13 osób.

## 2. Warianty wykonania

1. **EKO-PARALLEL (Wariant bazowy)**:
   - Jednoczesny montaż drzwi lewych (OP22) i prawych (OP23) przez dwóch niezależnych monterów na korpusie.
   - Czas realizacji partii 1 sztuki: **13 550 s**.
2. **EKO-SEQUENTIAL (Wariant sekwencyjny)**:
   - Montaż drzwi lewych i prawych wykonywany sekwencyjnie.
   - Czas realizacji partii 1 sztuki: **14 150 s** (+600 s).
3. **EKO-SHARED-WORKER (Wariant ze współdzielonym monterem)**:
   - Jeden monter wykonuje kolejno OP22 i OP23.
   - Czas realizacji partii 1 sztuki: **14 150 s** (+600 s).
`;
filesToGenerate.set('dane/slownik_pol.md', Buffer.from(dictionary, 'utf8'));

const expectedResults = {
  format: 'layout-studio-expected-results',
  formatVersion: 1,
  packageId: '04_eko',
  dataOrigin: 'mixed',
  conditions: {
    batch: 1,
    arrivalIntervalSeconds: 1,
    transportMode: 'configured'
  },
  absoluteToleranceSeconds: 1e-9,
  variants: [
    {
      id: 'EKO-PARALLEL',
      name: 'Eko — montaż równoległy drzwi (baza)',
      category: 'baseline',
      completionSeconds: [13550],
      totalRuns: 16
    },
    {
      id: 'EKO-SEQUENTIAL',
      name: 'Eko — montaż sekwencyjny',
      category: 'changed-layout',
      completionSeconds: [14150],
      totalRuns: 16
    },
    {
      id: 'EKO-SHARED-WORKER',
      name: 'Eko — współdzielony monter drzwi',
      category: 'additional-worker',
      completionSeconds: [14150],
      totalRuns: 16
    }
  ]
};
filesToGenerate.set('referencje/oczekiwane_wyniki.json', Buffer.from(JSON.stringify(expectedResults, null, 2) + '\n', 'utf8'));

const calculations = `# Obliczenia referencyjne — Projekt Eko (04_eko)

Pochodzenie danych: **mixed**. Średnie OP10–OP21 pochodzą z lipca 2026, rama 1.4; OP22–OP25 są przykładowe. Obsada pomiaru: 13 osób, nieznane przypisania; tu użyto 17 ról testowych. OP21 zawsze dwie osoby przez 1320 s.

## 1. Ścieżka krytyczna i montaż równoległy drzwi

Dla pojedynczego wyrobu:
- Ścieżka przygotowania korpusu (rama główna):
  $$t_{\\text{rama}} = t_{\\text{OP10}} + t_{\\text{OP11}} + t_{\\text{OP12}} = 3480 + 600 + 3590 = 7670\\text{ s}$$
- Równoległe podmontaże drzwi i osprzętu (OP13..OP18) kończą się przed upływem 7670 s, więc nie opóźniają rozpoczęcia montażu na korpusie.
- W wariancie **EKO-PARALLEL**:
  - OP22 (drzwi lewe) i OP23 (drzwi prawe) ruszają w chwili $t = 7670\\text{ s}$ równolegle.
  - OP22/OP23 kończą się w 8270 s. OP24 i OP25 po 480 s są sekwencyjne na tej samej kopii korpusu bez jawnej grupy równoległej: 8270–8750 i 8750–9230 s. Dalej OP19: 1800 s, OP20: 1200 s, OP21: 1320 s dla dwóch osób; 9230 + 1800 + 1200 + 1320 = **13 550 s**.
- W wariantach **EKO-SEQUENTIAL** oraz **EKO-SHARED-WORKER**:
  - Brak równoległości na drzwiach powoduje wydłużenie ścieżki krytycznej o czas dodatkowego oczekiwania na zwolnienie stacji / montera (+600 s).
  - Całkowity czas wykonania wynosi dokładnie **14 150 s**.
`;
filesToGenerate.set('referencje/obliczenia.md', Buffer.from(calculations, 'utf8'));

const readme = `# Pakiet pokazowy: Eko — montaż ramy 1.4 (04_eko)

Wersja pakietu: **1.0.0**.
Pochodzenie danych: **mixed** (rzeczywiste pomiary fabryczne z lipca 2026 r. dla operacji OP10–OP21; czasy przykładowe dla operacji OP22–OP25 per wyjaśnienia użytkownika).
Format wejściowy: **\`projekt-pokazowy.json\`** zgodny z otoczką \`layout-studio-project-package\` v1.

---

## 1. Zawartość pakietu

**Zakres demonstracyjny:** cały proces manualny, bez maszyn. OP10–OP21 są średnimi z kilku pomiarów ramy 1.4; liczba prób nieznana. OP22–OP25 pozostają przykładowe (600/600/480/480 s). Pakowanie OP21 wymaga dwóch osób przez całe 1320 s. Źródłowe 13 osób nie ma znanych przydziałów; demo używa 17 jawnie testowych ról, a nie odtworzonej obsady produkcji. Hala/popyt/konkurencja są założeniami, geometria domenowa nie jest gotową sceną fizyczną.

Pakiet zawiera 12 plików:
- \`manifest.json\` — inwentarz plików z sumami SHA-256.
- \`projekt-pokazowy.json\` — pojedynczy plik projektu do wczytania przez przycisk *Pakiet projektu*.
- \`dane/proces.xlsx\` — arkusz procesu z 12 czasami pomiarowymi i czterema przykładowymi.
- \`dane/bom.xlsx\` — arkusz zestawienia materiałowego z 60 komponentami.
- \`dane/szkic6.json\`, \`dane/warianty6.json\`, \`dane/zrodlo4.json\` — projekcje formatów JSON.
- \`dane/warunki_eksperymentu.json\` — warunki symulacji.
- \`dane/slownik_pol.md\` — słownik techniczny.
- \`referencje/oczekiwane_wyniki.json\`, \`referencje/obliczenia.md\` — niezależne wzorce analityczne.
- \`README.md\` — niniejsza instrukcja.

---

## 2. Jak załadować projekt do Layout Studio Pro

1. W menu głównym aplikacji rozwiń **Menu projektu** i wybierz **Pakiet projektu**.
2. W sekcji *Import z podglądem* wskaż plik \`przyklady/04_eko/projekt-pokazowy.json\`.
3. Kliknij **Pobierz kopię ratunkową przed importem**, zaznacz potwierdzenie i kliknij **Wczytaj pakiet i przeładuj**.
4. W harmonogramie ustaw **1 sztukę**, odstęp **1 s** i pozostaw opcję **Symulacja bez transportu — just in time WYŁĄCZONĄ**. To wzorzec logiczny korpusu z jawną równoległością, bez gotowego transportu fizycznego i bez geometrii domenowej. JIT jest innym eksperymentem i nie daje dla wariantu równoległego tego samego wyniku. W zakładce **Stanowiska i zasoby** (*Proces i stanowiska* $\\rightarrow$ *Stanowiska i zasoby*) uruchom symulację:
   - Wariant bazowy (EKO-PARALLEL): **13 550 s**
   - Wariant sekwencyjny (EKO-SEQUENTIAL): **14 150 s**
   - Wariant współdzielony (EKO-SHARED-WORKER): **14 150 s**
`;
filesToGenerate.set('README.md', Buffer.from(readme, 'utf8'));

// Build manifest.json
const manifestFiles = [];
for (const [relPath, buffer] of filesToGenerate.entries()) {
  const sha256 = createHash('sha256').update(buffer).digest('hex');
  manifestFiles.push({
    path: relPath,
    bytes: buffer.length,
    sha256,
    role: relPath === 'projekt-pokazowy.json' ? 'entry-package' : relPath.startsWith('dane/') ? 'data' : relPath.startsWith('referencje/') ? 'reference' : 'documentation'
  });
}
manifestFiles.sort((a, b) => a.path.localeCompare(b.path));

const manifest = {
  format: 'layout-studio-demo-manifest',
  formatVersion: 1,
  packageId: '04_eko',
  packageVersion: '1.0.0',
  title: 'Eko — montaż ramy 1.4 (realne dane procesu)',
  level: 'advanced',
  language: 'pl',
  dataOrigin: 'mixed',
  entryFile: 'projekt-pokazowy.json',
  importer: {
    format: 'layout-studio-project-package',
    formatVersion: 1
  },
  assets: {
    externalFiles: []
  },
  files: manifestFiles
};

const manifestBuffer = Buffer.from(JSON.stringify(manifest, null, 2) + '\n', 'utf8');

// Write or check reproducibility
mkdirSync(out, {recursive: true});
mkdirSync(resolve(out, 'dane'), {recursive: true});
mkdirSync(resolve(out, 'referencje'), {recursive: true});

const allFiles = new Map(filesToGenerate);
allFiles.set('manifest.json', manifestBuffer);

let mismatch = false;
for (const [relPath, buffer] of allFiles.entries()) {
  const fullPath = resolve(out, relPath);
  if (check) {
    if (!readFileSync(fullPath).equals(buffer)) {
      console.error(`Mismatch in check mode: ${relPath}`);
      mismatch = true;
    }
  } else {
    writeFileSync(fullPath, buffer);
  }
}

if (mismatch) {
  process.exitCode = 1;
} else {
  console.log(`${check ? 'PASS reproducibility' : 'Generated'} 7.13 Eko package: ${allFiles.size} files, mixed evidence, explicitly assumed role allocation; independent references preserved, scheduler not invoked`);
}
