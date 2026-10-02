import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import * as XLSX from 'xlsx';
import { calculateTaktTime } from '../src/core/algorithms/taktCalculator';
import { runLineBalancing } from '../src/core/algorithms/lineBalancingEngine';
import { generate3DLayout,layoutWarnings,corners } from '../src/core/algorithms/layoutEngine';
import { simulate,simulationAt,SIMULATION_SPEEDS,stepSimulationTime } from '../src/core/algorithms/simulation';
import { importProcess,importBOM,processRows,bomRows,templateWorkbookBytes,TEMPLATE_PROCESS_STEPS,TEMPLATE_BOM_COMPONENTS,PROCESS_COLUMN_DOCS,BOM_COLUMN_DOCS } from '../src/core/export/excelImporter';
import { exportToDxf } from '../src/core/export/dxfExporter';
import { parseProject,processErrors,topologicalSort,validateProject } from '../src/core/validation';
import { derive } from '../src/core/project';
import {archivedImportBlob, encodeImport} from '../src/core/importArchive';
import {makePortableArchive, readPortableArchive} from '../src/core/portableArchive';
import { DEFAULT_MOTOR_PROJECT as motor,DEFAULT_BATTERY_PROJECT as battery } from '../src/core/models/defaultProjects';
import { ProcessStep } from '../src/core/models/types';
import { moveOperation, connectOperations, disconnectOperations, addOperation, removeOperation, editOperation, flowPositions } from '../src/core/editing';
import { toSeconds, fromSeconds, convertTime, formatTimeValue, formatTimeWithUnit, TIME_UNITS } from '../src/core/time';
const step=(id:string,time:number,preds:string[]=[]):ProcessStep=>({id,name:id,standardTimeSeconds:time,vaTimeSeconds:time*.8,nvaTimeSeconds:time*.2,sequenceNumber:Number(id)||1,predecessorIds:preds});
const workbook=(data:Record<string,unknown>[])=>{const book=XLSX.utils.book_new();XLSX.utils.book_append_sheet(book,XLSX.utils.json_to_sheet(data),'Test');return XLSX.write(book,{type:'array',bookType:'xlsx'}) as ArrayBuffer;};

test('import następników bez poprzedników, nieznane ID i cykl',()=>{
 const rows=[{'ID Kroku':'Z','Nazwa Operacji':'Z','Czas Standardowy [s]':10,'Następnicy':'A'},{'ID Kroku':'A','Nazwa Operacji':'A','Czas Standardowy [s]':10,'Następnicy':''}];
 const imported=importProcess(workbook(rows));assert.deepEqual(imported.errors,[]);assert.deepEqual(imported.items[1].predecessorIds,['Z']);
 rows[1]['Następnicy']='Z';assert.ok(importProcess(workbook(rows)).errors.some(e=>e.includes('Cykl')));
 rows[1]['Następnicy']='X';assert.ok(importProcess(workbook(rows)).errors.some(e=>e.includes('następnik X')));
});
test('takt klienta i cel OEE bez zaokrągleń wejściowych',()=>{const t=calculateTaktTime(motor.demand);assert.equal(t.dailyDemand,300);assert.equal(t.customerTaktSeconds,180);assert.equal(t.taktTimeSeconds,162);assert.equal(calculateTaktTime({...motor.demand,yearlyDemand:100}).dailyDemand,.4);});
test('cykl i brakujące poprzedniki są odrzucane bez pętli',()=>{assert.throws(()=>runLineBalancing([step('1',5,['2']),step('2',5,['1'])],10),/Cykl/);assert.throws(()=>runLineBalancing([step('1',5,['X'])],10),/poprzednik/);assert.throws(()=>runLineBalancing([step('1',5),step('1',5)],10),/powtórzone/);});
test('RPW i LCR zachowują zależności i nie gubią operacji',()=>{for(const a of ['RPW','LCR'] as const){const steps=[step('1',6),step('2',5,['1']),step('3',4,['1']),step('4',2,['2','3'])];const r=runLineBalancing(steps,10,a);const assigned=r.workstations.flatMap(s=>s.assignedStepIds);assert.equal(new Set(assigned).size,4);assert.equal(r.totalWorkContentSeconds,17);steps.forEach(s=>s.predecessorIds.forEach(pred=>assert.ok(assigned.indexOf(pred)<assigned.indexOf(s.id))));assert.ok(r.workstations.every(s=>s.cycleTimeSeconds<=10));}});
test('operacja dłuższa niż cel nie znika i jest oznaczona',()=>{const r=runLineBalancing([step('1',25),step('2',5,['1'])],10);assert.equal(r.workstations[0].isBottleneck,true);assert.equal(r.actualWorkstationsCount,2);assert.ok(r.lineEfficiencyPercent<=100);});
test('pusty proces daje zero stacji i brak sztucznej sprawności',()=>{const r=runLineBalancing([],10);assert.equal(r.actualWorkstationsCount,0);assert.equal(r.lineEfficiencyPercent,0);assert.throws(()=>runLineBalancing([],0));});
test('bilans ręczny sprawdza kolejność i luki',()=>{const s=[{...step('1',5),assignedWorkstationId:'WS-2'},{...step('2',5,['1']),assignedWorkstationId:'WS-1'}];assert.throws(()=>runLineBalancing(s,10,'Manual'),/poprzednik/);s[0].assignedWorkstationId='WS-1';assert.equal(runLineBalancing(s,10,'Manual').actualWorkstationsCount,1);s[1].assignedWorkstationId='WS-3';assert.throws(()=>runLineBalancing(s,10,'Manual'),/przypisz|luk/);});
test('sortowanie topologiczne dla złączenia gałęzi',()=>{assert.deepEqual(topologicalSort([step('4',1,['2','3']),step('3',1,['1']),step('1',1),step('2',1,['1'])]).map(s=>s.id),['1','2','3','4']);});
test('symulacja kolejki używa czasów stacji',()=>{const jobs=simulate([10,20],10,3);assert.deepEqual(jobs.map(j=>j.finish),[30,50,70]);assert.deepEqual(jobs[2].starts,[20,50]);assert.deepEqual(simulationAt(jobs,30),{completed:1,wip:2,throughput:120});assert.equal(simulationAt(jobs,70).wip,0);assert.throws(()=>simulate([0],1,3));});
test('symulacja pojedynczej stacji i wolnych przybyć',()=>{assert.deepEqual(simulate([5],10,3).map(j=>j.finish),[5,15,25]);assert.equal(simulate([.25],.25,10000).at(-1)!.finish,2500);});
test('3.10: mnożniki odtwarzania symulacji ponad 100x, krok czasowy bez przekroczenia i stałość wyników',()=>{
  assert.ok(SIMULATION_SPEEDS.includes(100));
  assert.ok(SIMULATION_SPEEDS.includes(200));
  assert.ok(SIMULATION_SPEEDS.includes(500));
  assert.ok(SIMULATION_SPEEDS.includes(1000));
  assert.ok(SIMULATION_SPEEDS.includes(2000));
  assert.ok(SIMULATION_SPEEDS.includes(5000));
  assert.ok(SIMULATION_SPEEDS.every((v,i)=>i===0||v>SIMULATION_SPEEDS[i-1]));

  const end=21170; // czas partii Eko 3 szt.
  let t=0;
  // 1 klatka 16ms przy 1000x daje +16s
  t=stepSimulationTime(t,0.016,1000,end);
  assert.equal(t,16);
  // Ochrona przed skokiem po zamrożeniu karty (>0.25s real-time przycięte do 0.25s)
  t=stepSimulationTime(t,1.5,1000,end);
  assert.equal(t,16+0.25*1000); // 266s

  // Osiągnięcie końca bez przekroczenia wartości granicznej przy 5000x
  t=stepSimulationTime(end-10,0.016,5000,end);
  assert.equal(t,end);

  // Ujemna lub zerowa delta nie cofa czasu
  assert.equal(stepSimulationTime(100,-0.5,1000,end),100);
  assert.equal(stepSimulationTime(100,0,1000,end),100);

  // Niezmienność wyników obliczeń i kolejność zdarzeń
  const jobs=simulate([100,200],150,3);
  assert.equal(jobs.at(-1)!.finish,700);
  const stateAt350_a=simulationAt(jobs,350);
  const stateAt350_b=simulationAt(jobs,350);
  assert.deepEqual(stateAt350_a,stateAt350_b);
  assert.equal(stateAt350_a.completed,1);
  assert.equal(stateAt350_a.wip,2);
  assert.equal(simulationAt(jobs,700).completed,3);
  assert.equal(simulationAt(jobs,700).wip,0);
});
test('trzy układy różnią się geometrią i mają wejście/wyjście',()=>{const stations=runLineBalancing([step('1',10),step('2',10),step('3',10),step('4',10)],10).workstations;const layouts=['UShape','Linear','LShape'].map(type=>generate3DLayout(stations,type as any,motor.facility));assert.notDeepEqual(layouts[1],layouts[2]);assert.notDeepEqual(layouts[0],layouts[1]);layouts.forEach(layout=>{assert.ok(layout.find(o=>o.type==='MaterialIn'));assert.ok(layout.find(o=>o.type==='FinishedGoods'));assert.equal(layoutWarnings({...motor,obstacles:[],layoutObjects:layout}).length,0);});});
test('obrócone obiekty mają prawidłowe narożniki, kolizje i DXF',()=>{const o={id:'test',name:'Test',type:'Table' as const,xMm:100,yMm:100,widthMm:200,lengthMm:100,heightMm:500,zMm:0,rotationDeg:90,colorHex:'#fff'};const c=corners(o);assert.ok(Math.abs(c[0].x-250)<1e-8);assert.ok(Math.abs(c[0].y-50)<1e-8);assert.ok(layoutWarnings({...motor,layoutObjects:[o],obstacles:[{id:'x',name:'Słup',xMm:150,yMm:80,widthMm:30,lengthMm:30,heightMm:200}]}).some(s=>s.includes('kolizja')));const dxf=exportToDxf(motor.facility,[o],'Test',motor.obstacles);assert.match(dxf,/OBSTACLES/);assert.match(dxf,/\$INSUNITS\n70\n4/);assert.match(dxf,/10\n250\n20\n-50/);});
test('JSON starych projektów migruje, zły schemat odrzucany',()=>{for(const p of [motor,battery]){const parsed=parseProject(JSON.stringify(p));assert.equal(parsed.schemaVersion,4);assert.ok(derive(parsed).project.balancing);}assert.throws(()=>parseProject('{}'));assert.throws(()=>parseProject(JSON.stringify({...motor,schemaVersion:999})));assert.throws(()=>parseProject(JSON.stringify({...motor,demand:{...motor.demand,plannedBreaksMinutesPerShift:600}})));});
test('archiwum importu zachowuje bajty starszego JSON także z BOM i poza granicą bloku',async()=>{
  const source=readFileSync('tests/qa/D5f_legacy_motor_untagged.json');
  const bytes=new Uint8Array(11000);
  bytes.set([0xef,0xbb,0xbf]);
  for(let index=3;index<bytes.length;index++)bytes[index]=source[index%source.length];
  const restored=new Uint8Array(await archivedImportBlob(encodeImport(bytes)).arrayBuffer());
  assert.deepEqual(restored,bytes);
});
test('przenośne archiwum zachowuje oryginał i odrzuca obcą wersję lub uszkodzone źródło',async()=>{
  const source=readFileSync('tests/qa/D5f_legacy_motor_untagged.json');
  const original=encodeImport(source);
  const project=parseProject(source.toString('utf8'));
  const json=makePortableArchive(4,project,original);
  const restored=readPortableArchive(json,4)!;
  assert.deepEqual(parseProject(JSON.stringify(restored.project)),project);
  assert.deepEqual(new Uint8Array(await archivedImportBlob(restored.importSourceBase64).arrayBuffer()),new Uint8Array(source));
  assert.equal(restored.originalJson,'');
  assert.throws(()=>readPortableArchive(json,5),/oczekiwano 5/);
  assert.throws(()=>readPortableArchive(json.replace('"formatVersion": 1','"formatVersion": 2'),4),/wersja archiwum/);
  assert.throws(()=>readPortableArchive(json.replace(original,'!'),4),/kodowanie/);
  assert.throws(()=>readPortableArchive(json.replace(original,'AA=A'),4),/kodowanie/);
  assert.equal(readPortableArchive(JSON.stringify(project),4),null);
});
test('duże archiwum 4 zachowuje źródło bez przepełnienia stosu walidatora',async()=>{
  const source=new TextEncoder().encode(JSON.stringify(motor)+' '.repeat(4*1024*1024));
  const archive=makePortableArchive(4,motor,encodeImport(source));
  const restored=readPortableArchive(archive,4)!;
  assert.deepEqual(new Uint8Array(await archivedImportBlob(restored.importSourceBase64).arrayBuffer()),source);
});
test('Excel roundtrip VA/NVA, koszty zero i pojemniki Pallet',()=>{const p=importProcess(workbook(processRows(motor.processSteps)));assert.deepEqual(p.errors,[]);assert.deepEqual(p.items.map(s=>[s.id,s.vaTimeSeconds,s.nvaTimeSeconds]),motor.processSteps.map(s=>[s.id,s.vaTimeSeconds,s.nvaTimeSeconds]));const bom=motor.bom.map(b=>({...b,unitCost:0}));const r=importBOM(workbook(bomRows(bom)),new Set(motor.processSteps.map(s=>s.id)));assert.deepEqual(r.errors,[]);assert.equal(r.items[2].container,'Pallet');assert.equal(r.items[0].unitCost,0);});
test('import z brakującą kolumną, zerowym czasem i złą referencją raportuje błędy',()=>{assert.ok(importProcess(workbook([{ID:'a'}])).errors.length);assert.ok(importProcess(workbook([{'ID Kroku':'a','Nazwa Operacji':'a','Czas Standardowy [s]':0}])).errors.length);assert.ok(importBOM(workbook(bomRows(motor.bom)),new Set()).errors.some(e=>e.includes('brak operacji')));});
test('dołączone CSV rybia ość są zgodne z importerem',()=>{const a=readFileSync('przykladowe_importy/proces_silnik_ev_rybia_osc.csv');const r=importProcess(a.buffer.slice(a.byteOffset,a.byteOffset+a.byteLength));assert.deepEqual(r.errors,[]);const b=readFileSync('przykladowe_importy/bom_silnik_ev_rybia_osc.csv');const bom=importBOM(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength),new Set(r.items.map(s=>s.id)));assert.deepEqual(bom.errors,[]);});
test('walidacja BOM i hali blokuje błędne dane',()=>{const p=structuredClone(motor);p.bom[0].associatedProcessStepId='missing';p.facility.widthMm=0;assert.ok(validateProject(p).some(i=>i.area==='bom'));assert.ok(validateProject(p).some(i=>i.area==='facility'));assert.ok(processErrors([step('1',-1)]).length);});

test('przenoszenie w Yamazumi nie gubi operacji ani BOM i usuwa puste stacje',()=>{
  const p={...structuredClone(motor),algorithm:'Manual' as const,processSteps:[{...step('1',20),assignedWorkstationId:'WS-1'},{...step('2',30,['1']),assignedWorkstationId:'WS-2'},{...step('3',10,['2']),assignedWorkstationId:'WS-3'}]};
  const moved=moveOperation(p,'2',1);
  assert.equal(moved.algorithm,'Manual');assert.deepEqual(moved.processSteps.map(s=>s.assignedWorkstationId),['WS-1','WS-1','WS-2']);assert.deepEqual(moved.bom,p.bom);
  assert.equal(derive(moved).project.balancing!.totalWorkContentSeconds,60);
  assert.throws(()=>moveOperation(p,'1',3),/poprzednik/);assert.throws(()=>moveOperation(p,'3',1),/poprzednik/);
  assert.throws(()=>moveOperation(p,'missing',1),/Nieznana/);assert.throws(()=>moveOperation(p,'2',10),/Niepoprawne/);
  assert.equal(p.processSteps[1].assignedWorkstationId,'WS-2');
});
test('wydzielenie operacji na nową stację zachowuje przeciążenie jako wynik',()=>{
  const p={...structuredClone(motor),algorithm:'RPW' as const,bom:[],processSteps:[step('1',10),step('2',20,['1'])]};
  const moved=moveOperation(p,'2',2);assert.equal(derive(moved).project.balancing!.actualWorkstationsCount,2);
  const changed=editOperation(moved,'2','Długa operacja',300,250);
  assert.equal(derive(changed).project.balancing!.workstations[1].isBottleneck,true);
  assert.equal(changed.processSteps[1].nvaTimeSeconds,50);assert.throws(()=>editOperation(changed,'2','',30,20));
});
test('edytor przepływu blokuje cykl, samopowiązanie i duplikat',()=>{
  const p={...structuredClone(motor),algorithm:'RPW' as const,bom:[],processSteps:[step('1',10),step('2',20)]};
  const linked=connectOperations(p,'1','2');assert.deepEqual(linked.processSteps[1].predecessorIds,['1']);
  assert.throws(()=>connectOperations(linked,'2','1'),/Cykl/);assert.throws(()=>connectOperations(p,'1','1'),/samej siebie/);
  assert.throws(()=>connectOperations(linked,'1','2'),/już istnieje/);assert.throws(()=>connectOperations(p,'X','2'),/istniejące/);
  assert.deepEqual(disconnectOperations(linked,'1','2').processSteps[1].predecessorIds,[]);
});
test('zmiana połączeń w ręcznym bilansie respektuje kolejność stacji',()=>{
  const p={...structuredClone(motor),algorithm:'Manual' as const,bom:[],processSteps:[{...step('1',20),assignedWorkstationId:'WS-1'},{...step('2',30),assignedWorkstationId:'WS-2'}]};
  assert.throws(()=>connectOperations(p,'2','1'),/poprzednik/);assert.deepEqual(connectOperations(p,'1','2').processSteps[1].predecessorIds,['1']);
});
test('dodawanie i usuwanie operacji w diagramie zachowuje poprawny bilans ręczny',()=>{
  const p={...structuredClone(motor),algorithm:'Manual' as const,bom:[],processSteps:[{...step('OP10',20),assignedWorkstationId:'WS-1'}]};
  const added=addOperation(p,'OP10');assert.equal(added.id,'OP11');assert.deepEqual(added.project.processSteps[1].predecessorIds,['OP10']);
  assert.equal(derive(added.project).project.balancing!.actualWorkstationsCount,1);
  const removed=removeOperation(added.project,'OP10',false);assert.deepEqual(removed.processSteps[0].predecessorIds,[]);
  assert.equal(derive(removeOperation(removed,'OP11',false)).project.balancing!.actualWorkstationsCount,0);
});
test('pozycje diagramu zachowują JSON i nie zmieniają technologii',()=>{
  const p=structuredClone(motor);p.processSteps[0].flowPosition={x:-100,y:250};
  const restored=parseProject(JSON.stringify(p));assert.deepEqual(flowPositions(restored.processSteps).get('1'),{x:-100,y:250});
  assert.notDeepEqual(flowPositions(p.processSteps,true).get('1'),{x:-100,y:250});
  const before=runLineBalancing(motor.processSteps,162);const after=runLineBalancing(restored.processSteps,162);assert.deepEqual(before,after);
  p.processSteps[0].flowPosition={x:Infinity,y:0};assert.throws(()=>parseProject(JSON.stringify(p)),/pozycja/);
});

test('Eko: edytory przyjmują proces z 60 materiałami i zachowują BOM przy przenoszeniu',()=>{
  const bytes=(path:string)=>{const f=readFileSync(path);return f.buffer.slice(f.byteOffset,f.byteOffset+f.byteLength);};
  const operations=importProcess(bytes('tests/Test Eko.xlsx'));
  const materials=importBOM(bytes('tests/Test Eko BOM.xlsx'),new Set(operations.items.map(s=>s.id)));
  assert.deepEqual(operations.errors,[]);assert.deepEqual(materials.errors,[]);assert.equal(materials.items.length,60);
  const p={...structuredClone(motor),algorithm:'RPW' as const,processSteps:operations.items,bom:materials.items};
  assert.equal(flowPositions(p.processSteps).size,16);
  const balanced=derive(p).project;
  const moved=moveOperation(balanced,'OP21',balanced.balancing!.workstations.length);
  assert.deepEqual(moved.bom,p.bom);assert.equal(moved.processSteps.length,16);
  operations.items.filter(s=>Number(s.id.slice(2))<=21).forEach(s=>assert.equal(moved.bom.filter(b=>b.associatedProcessStepId===s.id).length,5));
  assert.deepEqual(parseProject(JSON.stringify(moved)).processSteps,moved.processSteps);
});
test('Eko: dodanie złączenia gałęzi nie zmienia liczby operacji ani materiałów',()=>{
  const f=readFileSync('tests/Test Eko.xlsx'),r=importProcess(f.buffer.slice(f.byteOffset,f.byteOffset+f.byteLength));
  const p={...structuredClone(motor),processSteps:r.items,bom:[]};
  const linked=connectOperations(p,'OP16','OP21');
  assert.deepEqual(linked.processSteps.find(s=>s.id==='OP21')!.predecessorIds,['OP20','OP16']);
  assert.equal(linked.processSteps.length,16);assert.throws(()=>connectOperations(linked,'OP21','OP10'),/Cykl/);
});

test('5.12: szablony XLSX procesu i BOM importują się bezbłędnie z dwoma arkuszami',()=>{
  const procBytes=templateWorkbookBytes('process');
  const procBook=XLSX.read(procBytes,{type:'array'});
  assert.deepEqual(procBook.SheetNames,['Dane','Opis kolumn']);
  const procRes=importProcess(procBytes);
  assert.deepEqual(procRes.errors,[]);
  assert.equal(procRes.items.length,TEMPLATE_PROCESS_STEPS.length);
  assert.deepEqual(procRes.items.map(s=>s.id),['OP10','OP20','OP25','OP30']);
  assert.deepEqual(procRes.items.find(s=>s.id==='OP30')!.predecessorIds,['OP20','OP25']);

  const bomBytes=templateWorkbookBytes('bom');
  const bomBook=XLSX.read(bomBytes,{type:'array'});
  assert.deepEqual(bomBook.SheetNames,['Dane','Opis kolumn']);
  const stepIds=new Set(procRes.items.map(s=>s.id));
  const bomRes=importBOM(bomBytes,stepIds);
  assert.deepEqual(bomRes.errors,[]);
  assert.equal(bomRes.items.length,TEMPLATE_BOM_COMPONENTS.length);
  assert.ok(bomRes.items.some(b=>b.container==='BoxKLT'));
  assert.ok(bomRes.items.some(b=>b.container==='Tray'));
  assert.ok(bomRes.items.some(b=>b.container==='Carton'));
  assert.ok(bomRes.items.some(b=>b.container==='Pallet'));
});

test('5.12: brakujące kolumny i niepoprawne wiersze raportują czytelne komunikaty',()=>{
  const badProc=workbook([{'Zła kolumna':1}]);
  const procRes=importProcess(badProc);
  assert.ok(procRes.errors[0].includes('Brak wymaganych kolumn procesu'));
  assert.ok(procRes.errors[0].includes('ID Kroku'));
  assert.ok(procRes.errors[0].includes('Nazwa Operacji'));
  assert.ok(procRes.errors[0].includes('Czas Standardowy [s]'));

  const badBom=workbook([{'Zła kolumna':1}]);
  const bomRes=importBOM(badBom);
  assert.ok(bomRes.errors[0].includes('Brak wymaganych kolumn BOM'));
  assert.ok(bomRes.errors[0].includes('Pobierz szablon'));

  const invalidBomRow=workbook([
    {
      'Nr Części (Part No)':'PART-X',
      'Nazwa Komponentu':'Błędny pojemnik',
      'Ilość na Wyrób':0,
      'Typ Pojemnika':'InvalidContainer',
      'Ilość w Opakowaniu':0,
      'Przypisany Krok':'OP10',
      'Koszt Jednostkowy':-5
    },
    {
      'Nr Części (Part No)':'PART-Y',
      'Nazwa Komponentu':'Brakująca operacja',
      'Ilość na Wyrób':1,
      'Typ Pojemnika':'BoxKLT',
      'Ilość w Opakowaniu':10,
      'Przypisany Krok':'OP99',
      'Koszt Jednostkowy':10
    }
  ]);
  const invalidRes=importBOM(invalidBomRow,new Set(['OP10']));
  assert.ok(invalidRes.errors.some(e=>e.includes('błędna nazwa, ilość, koszt lub pojemnik')));
  assert.ok(invalidRes.errors.some(e=>e.includes('brak operacji OP99')));
});

test('5.12: dokumentacja kolumn procesu i BOM zawiera wymagane atrybuty i statusy',()=>{
  assert.ok(PROCESS_COLUMN_DOCS.length>=7);
  assert.ok(PROCESS_COLUMN_DOCS.some(c=>c['Kolumna']==='ID Kroku'&&c['Status']==='Wymagana'));
  assert.ok(PROCESS_COLUMN_DOCS.some(c=>c['Kolumna']==='Poprzednicy'&&c['Status']==='Opcjonalna'));

  assert.ok(BOM_COLUMN_DOCS.length>=7);
  assert.ok(BOM_COLUMN_DOCS.every(c=>c['Status']==='Wymagana'));
  assert.ok(BOM_COLUMN_DOCS.some(c=>c['Kolumna']==='Typ Pojemnika'&&c['Opis'].includes('BoxKLT')));
});

test('5.11: przeliczanie i formatowanie czasu między sekundami, minutami i godzinami',()=>{
  // toSeconds
  assert.equal(toSeconds(150, 's'), 150);
  assert.equal(toSeconds(2.5, 'min'), 150);
  assert.equal(toSeconds(150, 'min'), 9000);
  assert.equal(toSeconds(1, 'h'), 3600);
  assert.equal(toSeconds(2.5, 'h'), 9000);

  // fromSeconds
  assert.equal(fromSeconds(150, 's'), 150);
  assert.equal(fromSeconds(150, 'min'), 2.5);
  assert.equal(fromSeconds(9000, 'min'), 150);
  assert.equal(fromSeconds(3600, 'h'), 1);
  assert.equal(fromSeconds(9000, 'h'), 2.5);

  // convertTime
  assert.equal(convertTime(150, 'min', 'h'), 2.5); // 150 min = 2.5 h
  assert.equal(convertTime(2.5, 'h', 'min'), 150); // 2.5 h = 150 min
  assert.equal(convertTime(60, 's', 'min'), 1);

  // formatTimeValue i formatTimeWithUnit
  assert.equal(formatTimeValue(150, 's'), '150');
  assert.equal(formatTimeValue(150, 'min'), '2,5');
  assert.equal(formatTimeWithUnit(150, 's'), '150 s');
  assert.equal(formatTimeWithUnit(150, 'min'), '2,5 min');
  assert.equal(formatTimeWithUnit(9000, 'h'), '2,5 h');
  assert.equal(formatTimeWithUnit(undefined, 'min'), '—');
  assert.equal(formatTimeWithUnit(NaN, 'h'), '—');

  // TIME_UNITS metadata
  assert.deepEqual(TIME_UNITS.map(u => u.value), ['s', 'min', 'h']);
});

test('5.11: walidacja projektu zachowuje jednostkę czasu i wewnętrzne sekundy',()=>{
  const baseJson = JSON.stringify(motor);
  const parsed = parseProject(baseJson);
  assert.equal(parsed.timeUnit, 's'); // domyślnie s

  // Projekt z jednostką 'min'
  const withMin = parseProject(JSON.stringify({...motor, timeUnit: 'min'}));
  assert.equal(withMin.timeUnit, 'min');
  // Wewnętrzne sekundy operacji i popytu nie ulegają modyfikacji
  assert.equal(withMin.processSteps[0].standardTimeSeconds, motor.processSteps[0].standardTimeSeconds);
  assert.equal(withMin.processSteps[0].vaTimeSeconds, motor.processSteps[0].vaTimeSeconds);

  // Projekt z jednostką 'h'
  const withH = parseProject(JSON.stringify({...motor, timeUnit: 'h'}));
  assert.equal(withH.timeUnit, 'h');

  // Nieznana jednostka rzuca błąd walidacji
  assert.throws(() => parseProject(JSON.stringify({...motor, timeUnit: 'days'})), /Nieznana jednostka czasu/);
});

