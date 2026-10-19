import { strict as assert } from 'node:assert';
import {nominalReportCapacity} from '../src/core/reportCapacity';
import {Box3,Group,Mesh,BoxGeometry,PlaneGeometry,MeshBasicMaterial,Vector3} from 'three';
import {sceneContentBounds} from '../src/core/equipment/sceneFraming';
import { test } from 'node:test';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import * as XLSX from 'xlsx';
import { calculateTaktTime } from '../src/core/algorithms/taktCalculator';
import { runLineBalancing } from '../src/core/algorithms/lineBalancingEngine';
import { generate3DLayout,layoutWarnings,corners } from '../src/core/algorithms/layoutEngine';
import {
  alignLayoutObjects,
  analyzeGeometricLayoutWarnings,
  BHP_GEOMETRY_DISCLAIMER,
  BHP_SAFE_STATE_NOTE,
  calibrateUnderlayScale,
  classifyLayoutObjectLayer,
  computeFunctionalZones,
  expandMoveSelection,
  expandVisualSelection,
  groupLayoutObjects,
  copyLayoutObjects,
  lockLayoutObjects,
  measureObjectsDistance,
  measurePointsDistance,
  moveLayoutObjects,
  nudgeLayoutObjects,
  objectConnectionPoints,
  snapLayoutTranslation,
  underlayDimensionsMm,
  workstationAssemblyIds,
  LAYOUT_SHORTCUTS,
  VISUAL_ASSUMPTION_DISCLAIMER,
  FACILITY_UNCONFIRMED_NOTE,
  DEFAULT_3D_LAYERS,
  type Layout3DLayersState,
  type TransformGizmoMode,
  isLayoutObjectVisible3D,
  hideObjectIds,
  showObjectIds,
  toggleHiddenObjectIds,
  canManipulate3D,
  layoutToWorldCoordinates,
  worldToLayoutCoordinates,
  degreesToWorldRotation,
  worldRotationToDegrees,
} from '../src/core/algorithms/layoutSelection';
import { layoutRoutes } from '../src/core/algorithms/routing';
import { simulate,simulationAt,SIMULATION_SPEEDS,stepSimulationTime } from '../src/core/algorithms/simulation';
import {
  computeSimulationAnimationSnapshot,
  getJobInspectionDetails,
  findStationTableObject,
  findStationBufferObject,
  getObjectSurfaceCoords,
} from '../src/core/algorithms/simulationAnimation';
import { simulateNetwork } from '../src/core/algorithms/networkSimulation';
import { importProcess,importBOM,processRows,bomRows,templateWorkbookBytes,TEMPLATE_PROCESS_STEPS,TEMPLATE_BOM_COMPONENTS,PROCESS_COLUMN_DOCS,BOM_COLUMN_DOCS } from '../src/core/export/excelImporter';
import { exportToDxf } from '../src/core/export/dxfExporter';
import { parseDxfImport, applyDxfImportToProject, DXF_UNITS } from '../src/core/export/dxfImporter';
import { parseProject,processErrors,topologicalSort,validateProject } from '../src/core/validation';
import { derive, newProject, engineeringReport } from '../src/core/project';
import {applyEquipmentAppearance,EQUIPMENT_VISUAL_MODELS} from '../src/core/equipment/equipmentAppearance';
import {createConceptVisual} from '../src/core/equipment/conceptVisual';
import { deriveStationProject } from '../src/core/stationDerivation';
import { prepareStationMigration, previewStationMigration } from '../src/core/stationMigration';
import {archivedImportBlob, encodeImport} from '../src/core/importArchive';
import {makePortableArchive, readPortableArchive} from '../src/core/portableArchive';
import { DEFAULT_MOTOR_PROJECT as motor, DEFAULT_BATTERY_PROJECT as battery, DEFAULT_MOTOR_PROJECT, DEFAULT_BATTERY_PROJECT } from '../src/core/models/defaultProjects';
import { ProcessStep } from '../src/core/models/types';
import { previewDomainMigrationFromV4 } from '../src/core/domainMigrationPreview';
import { prepareDomainMigration } from '../src/core/domainProject';
import {
  validateChangeoverMatrix,
  validateProductionOrders,
  resolveChangeover,
  calculateSequenceChangeovers,
  orderBatches,
  type ChangeoverMatrix,
  type ProductionOrderBatch
} from '../src/core/changeoverMatrix';
import { parseDomainProjectV6 } from '../src/core/domainProject';

test('6.4: wygląd zachowuje geometrię i przypisania, trwa w auto i zapisie; odrzuca nieznany model',()=>{
  const source=derive(parseProject(JSON.stringify(motor))).project,original=structuredClone(source),id=source.layoutObjects[0].id;
  const objects=applyEquipmentAppearance(source.layoutObjects,id,'concept-parts-rack');
  assert.deepEqual(source,original);
  const changed=objects.find(o=>o.id===id)!;const {visualModelId,...geometry}=changed;
  assert.equal(visualModelId,'concept-parts-rack');assert.deepEqual(geometry,source.layoutObjects[0]);
  const saved=parseProject(JSON.stringify({...source,layoutMode:'auto',layoutObjects:objects}));
  assert.equal(derive(saved).project.layoutObjects.find(o=>o.id===id)?.visualModelId,visualModelId);
  assert.equal(saved.layoutMode,'auto');assert.deepEqual(derive(saved).project.balancing,source.balancing);
  assert.ok(!applyEquipmentAppearance(objects,id,undefined).find(o=>o.id===id)?.visualModelId);
  assert.throws(()=>parseProject(JSON.stringify({...source,layoutObjects:[{...source.layoutObjects[0],visualModelId:'unavailable-model'}]})),/model wizualny/);
});
test('6.4: koncepty zachowują proporcje, mieszczą się w obrysie, instancje mają niezależne zasoby',()=>{
  for(const {id} of EQUIPMENT_VISUAL_MODELS){
    const a=createConceptVisual(id,2,.8,.9),b=createConceptVisual(id,2,.8,.9);
    a.updateMatrixWorld(true);const box=new Box3().setFromObject(a),size=box.getSize(new Vector3());
    assert.ok(size.x<=2.000001&&size.z<=.800001&&size.y<=.900001);assert.ok(Math.abs(box.min.y)<.000001);
    assert.equal(a.scale.x,a.scale.y);assert.equal(a.scale.y,a.scale.z);
    const meshesA:any[]=[],meshesB:any[]=[];a.traverse(o=>{if((o as any).isMesh)meshesA.push(o);});b.traverse(o=>{if((o as any).isMesh)meshesB.push(o);});
    assert.notEqual(meshesA[0].geometry,meshesB[0].geometry);assert.notEqual(meshesA[0].material,meshesB[0].material);
  }
});
import { moveOperation, connectOperations, disconnectOperations, addOperation, removeOperation, editOperation, flowPositions } from '../src/core/editing';
import { toSeconds, fromSeconds, convertTime, formatTimeValue, formatTimeWithUnit, TIME_UNITS } from '../src/core/time';
import {
  MM_TO_M,
  M_TO_MM,
  mmToWorld,
  worldToMm,
  vectorMmToWorld,
  DEFAULT_EQUIPMENT_SPECS,
  getEquipmentStandardSpec,
  validateEquipmentStandardSpec,
  calculateEquipmentFootprint,
  checkEquipmentCollision2D,
  checkEquipmentCollision3D,
  checkObstacleCollision,
  getTransportPortWorldPosition,
  assertVisualModelIndependence,
  type EquipmentStandardSpec,
} from '../src/core/equipment/equipmentStandard';
import { editDomainEquipment } from '../src/core/domainEquipmentEditing';
import { parseDomainProjectV6 } from '../src/core/domainProject';
import { createParametricEquipmentGroup, disposeEquipmentGroup } from '../src/core/equipment/parametricEquipmentModels';
import * as THREE from 'three';
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
test('4.2: blokowanie przydziału operacji przed automatycznym balansowaniem (RPW i LCR)', () => {
  for (const algo of ['RPW', 'LCR'] as const) {
    const steps: ProcessStep[] = [
      step('1', 4),
      { ...step('2', 6, ['1']), lockedWorkstation: true, assignedWorkstationId: 'WS-2' },
      step('3', 5, ['2']),
      step('4', 5, ['3']),
    ];
    const res = runLineBalancing(steps, 10, algo);
    assert.equal(res.actualWorkstationsCount, 3);
    assert.deepEqual(res.workstations[0].assignedStepIds, ['1']);
    assert.deepEqual(res.workstations[1].assignedStepIds, ['2']);
    assert.deepEqual(res.workstations[2].assignedStepIds, ['3', '4']);
    assert.equal(res.workstations[1].id, 'WS-2');
  }

  {
    const steps: ProcessStep[] = [
      step('1', 3),
      { ...step('2', 4, ['1']), lockedWorkstation: true, assignedWorkstationId: 'WS-1' },
      step('3', 3, ['2']),
    ];
    const res = runLineBalancing(steps, 10, 'RPW');
    assert.equal(res.actualWorkstationsCount, 1);
    assert.deepEqual(res.workstations[0].assignedStepIds, ['1', '2', '3']);
    assert.equal(res.workstations[0].isBottleneck, false);
  }

  {
    const steps: ProcessStep[] = [
      { ...step('1', 5), lockedWorkstation: true, assignedWorkstationId: 'WS-2' },
      { ...step('2', 5, ['1']), lockedWorkstation: true, assignedWorkstationId: 'WS-1' },
    ];
    assert.throws(
      () => runLineBalancing(steps, 10, 'RPW'),
      /poprzednik 1 jest zablokowany na późniejszym stanowisku/
    );
  }

  // Scenario 4: Station index > steps.length and gap in locked stations are rejected
  {
    assert.throws(
      () => runLineBalancing([
        { ...step('1', 5), lockedWorkstation: true, assignedWorkstationId: 'WS-3' },
        step('2', 5, ['1']),
      ], 10, 'RPW'),
      /zablokowany przydział wymaga numeru stanowiska 1–2/
    );

    const stepsWithGap: ProcessStep[] = [
      { ...step('1', 5), lockedWorkstation: true, assignedWorkstationId: 'WS-1' },
      { ...step('2', 5, ['1']), lockedWorkstation: true, assignedWorkstationId: 'WS-3' },
      { ...step('3', 5, ['2']), lockedWorkstation: true, assignedWorkstationId: 'WS-3' },
    ];
    assert.throws(
      () => runLineBalancing(stepsWithGap, 10, 'RPW'),
      /Brak operacji dla stanowiska WS-2|bez luk/
    );
  }

  {
    const steps: ProcessStep[] = [
      step('1', 5),
      { ...step('2', 15, ['1']), lockedWorkstation: true, assignedWorkstationId: 'WS-2' },
      step('3', 5, ['2']),
    ];
    const res = runLineBalancing(steps, 10, 'RPW');
    assert.equal(res.actualWorkstationsCount, 3);
    assert.equal(res.workstations[1].isBottleneck, true);
    assert.equal(res.workstations[1].cycleTimeSeconds, 15);
    assert.deepEqual(res.workstations[1].assignedStepIds, ['2']);
  }

  {
    const p = structuredClone(motor);
    const updated = editOperation(p, '1', '1 zmiana', 80, 64, true, 'WS-1');
    assert.equal(updated.processSteps.find(s => s.id === '1')!.lockedWorkstation, true);
    assert.equal(updated.processSteps.find(s => s.id === '1')!.assignedWorkstationId, 'WS-1');
    const derived = derive(updated);
    assert.ok(derived.project.balancing?.workstations[0].assignedStepIds.includes('1'));
  }
});
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

test('5.3: wyrównanie obróconych obrysów i grup zachowuje relacje oraz źródło',()=>{
  const base={name:'Stół',type:'TableESD' as const,xMm:0,yMm:0,zMm:0,widthMm:200,lengthMm:100,heightMm:500,rotationDeg:0,colorHex:'#fff',workstationId:'WS-1'};
  const objects=[{...base,id:'A',xMm:100,rotationDeg:90},{...base,id:'B',xMm:800},{...base,id:'C',xMm:1100},{...base,id:'D',xMm:1700}];
  const before=structuredClone(objects);
  const aligned=alignLayoutObjects(objects,['A','B'],'left');
  assert.equal(Math.min(...corners(aligned[0]).map(c=>c.x)),Math.min(...corners(aligned[1]).map(c=>c.x)));
  assert.deepEqual(objects,before);assert.equal(aligned[1].workstationId,'WS-1');assert.equal(aligned[2],objects[2]);
  const grouped=groupLayoutObjects(objects,['B','C'],'VIS-1');
  assert.deepEqual(expandVisualSelection(grouped,'C'),['B','C']);
  const moved=alignLayoutObjects(grouped,['A','B','C'],'right');
  assert.equal(moved[2].xMm-moved[1].xMm,300);
  assert.equal(Math.max(...corners(moved[0]).map(c=>c.x)),Math.max(...[moved[1],moved[2]].flatMap(corners).map(c=>c.x)));
  assert.ok(!groupLayoutObjects(grouped,['B','C'],null)[1].visualGroupId);
});
test('5.3: kopie geometrii mają nowe tożsamości i grupy bez zdolności stanowiska; zapis czyta stare i nowe dane',()=>{
  const base={name:'Stół',type:'TableESD' as const,xMm:100,yMm:200,zMm:0,widthMm:200,lengthMm:100,heightMm:500,rotationDeg:0,colorHex:'#fff',workstationId:'WS-1',visualGroupId:'VIS-OLD'};
  const objects=[{...base,id:'A'},{...base,id:'B',xMm:800}],before=structuredClone(objects);let id=0;
  const copied=copyLayoutObjects(objects,['A','B'],1000,-100,()=>`NEW-${++id}`);
  const copies=copied.objects.slice(2);assert.equal(copies.length,2);assert.ok(copies.every(o=>!o.workstationId));assert.equal(copies[0].xMm,1100);assert.equal(copies[0].yMm,100);
  assert.equal(copies[0].visualGroupId,copies[1].visualGroupId);assert.notEqual(copies[0].visualGroupId,'VIS-OLD');assert.deepEqual(objects,before);
  assert.deepEqual(parseProject(JSON.stringify({...motor,schemaVersion:4,layoutMode:'manual',layoutObjects:copied.objects})).layoutObjects,copied.objects);
  assert.ok(parseProject(JSON.stringify(motor)));assert.throws(()=>copyLayoutObjects(objects,['A'],NaN,0,()=> 'X'));assert.throws(()=>copyLayoutObjects(objects,['A'],0,0,()=> 'A'));
  assert.throws(()=>parseProject(JSON.stringify({...motor,layoutObjects:[{...base,id:'A',visualGroupId:42}]})),/grupy wizualnej/);
});
test('5.4: przenoszenie stanowiska przesuwa stół, przypisane FIFO i strefę obsługi bez utraty relacji technologicznych',()=>{
  const derived=derive(structuredClone(motor)).project;
  const before=structuredClone(derived.layoutObjects),routesBefore=layoutRoutes(derived);
  assert.deepEqual(workstationAssemblyIds(before,'TBL-WS-1'),['TBL-WS-1','FIFO-WS-1','MAT-WS-1']);
  assert.deepEqual(workstationAssemblyIds(before,'FIFO-WS-1'),['TBL-WS-1','FIFO-WS-1','MAT-WS-1']);
  assert.deepEqual(workstationAssemblyIds(before,'MAT-IN'),['MAT-IN']);
  const moved=moveLayoutObjects(before,['TBL-WS-1'],1500,-800,true);
  for(const id of ['TBL-WS-1','FIFO-WS-1','MAT-WS-1']){
    const orig=before.find(o=>o.id===id)!,curr=moved.find(o=>o.id===id)!;
    assert.equal(curr.xMm,orig.xMm+1500);assert.equal(curr.yMm,orig.yMm-800);
    assert.equal(curr.workstationId,'WS-1');
  }
  const tbl=moved.find(o=>o.id==='TBL-WS-1')!,fifo=moved.find(o=>o.id==='FIFO-WS-1')!,mat=moved.find(o=>o.id==='MAT-WS-1')!;
  const origTbl=before.find(o=>o.id==='TBL-WS-1')!,origFifo=before.find(o=>o.id==='FIFO-WS-1')!,origMat=before.find(o=>o.id==='MAT-WS-1')!;
  assert.equal(fifo.xMm-tbl.xMm,origFifo.xMm-origTbl.xMm);assert.equal(fifo.yMm-tbl.yMm,origFifo.yMm-origTbl.yMm);
  assert.equal(mat.xMm-tbl.xMm,origMat.xMm-origTbl.xMm);assert.equal(mat.yMm-tbl.yMm,origMat.yMm-origTbl.yMm);
  assert.deepEqual(moved.filter(o=>o.workstationId!=='WS-1'),before.filter(o=>o.workstationId!=='WS-1'));
  const updatedProject={...derived,layoutMode:'manual' as const,layoutObjects:moved};
  const routesAfter=layoutRoutes(updatedProject);
  assert.equal(routesAfter.length,routesBefore.length);
  assert.deepEqual(routesAfter.map(r=>[r.a.id,r.b.id,r.a.workstationId,r.b.workstationId]),routesBefore.map(r=>[r.a.id,r.b.id,r.a.workstationId,r.b.workstationId]));
  const ws1Route=routesAfter.find(r=>r.a.id==='TBL-WS-1')!;
  assert.equal(ws1Route.a.xMm,origTbl.xMm+1500);assert.equal(ws1Route.a.yMm,origTbl.yMm-800);
  assert.equal(derive(updatedProject).issues.filter(i=>i.severity==='error').length,0);
});
test('5.4: wielokopiowe stanowisko (-COPY-2), wyrównywanie zespołów i korekta pojedynczego elementu',()=>{
  const initial=derive(structuredClone(motor)).project;
  const ws1Key=JSON.stringify([...initial.balancing!.workstations[0].assignedStepIds].sort());
  const base=derive({...structuredClone(motor),workstationSettings:{[ws1Key]:{operators:1,parallelStations:2}}}).project;
  const objs=base.layoutObjects;
  assert.deepEqual(workstationAssemblyIds(objs,'TBL-WS-1'),['TBL-WS-1','FIFO-WS-1','MAT-WS-1']);
  assert.deepEqual(workstationAssemblyIds(objs,'FIFO-WS-1-COPY-2'),['TBL-WS-1-COPY-2','FIFO-WS-1-COPY-2','MAT-WS-1-COPY-2']);
  const movedCopy2=moveLayoutObjects(objs,['FIFO-WS-1-COPY-2'],600,400,true);
  for(const id of ['TBL-WS-1-COPY-2','FIFO-WS-1-COPY-2','MAT-WS-1-COPY-2']){
    const orig=objs.find(o=>o.id===id)!,curr=movedCopy2.find(o=>o.id===id)!;
    assert.equal(curr.xMm,orig.xMm+600);assert.equal(curr.yMm,orig.yMm+400);
  }
  for(const id of ['TBL-WS-1','FIFO-WS-1','MAT-WS-1']){
    assert.deepEqual(movedCopy2.find(o=>o.id===id),objs.find(o=>o.id===id));
  }
  const singleOnly=moveLayoutObjects(objs,['FIFO-WS-1'],300,-200,false);
  assert.equal(singleOnly.find(o=>o.id==='FIFO-WS-1')!.xMm,objs.find(o=>o.id==='FIFO-WS-1')!.xMm+300);
  assert.deepEqual(singleOnly.find(o=>o.id==='TBL-WS-1'),objs.find(o=>o.id==='TBL-WS-1'));
  const shifted=moveLayoutObjects(objs,['TBL-WS-2'],900,0,true);
  const aligned=alignLayoutObjects(shifted,['TBL-WS-1','TBL-WS-2'],'left',true);
  const dx=aligned.find(o=>o.id==='TBL-WS-2')!.xMm-shifted.find(o=>o.id==='TBL-WS-2')!.xMm;
  assert.equal(dx,-900);
  assert.equal(aligned.find(o=>o.id==='FIFO-WS-2')!.xMm-shifted.find(o=>o.id==='FIFO-WS-2')!.xMm,dx);
  assert.equal(aligned.find(o=>o.id==='MAT-WS-2')!.xMm-shifted.find(o=>o.id==='MAT-WS-2')!.xMm,dx);
  assert.deepEqual(expandMoveSelection(objs,['TBL-WS-1'],true),['TBL-WS-1','FIFO-WS-1','MAT-WS-1']);
});
test('5.5: przyciąganie do siatki, krawędzi obiektów/przeszkód i wyłączenie przyciągania',()=>{
  const base=derive(structuredClone(motor)).project;
  const objs=base.layoutObjects;
  const ws1Ids=expandMoveSelection(objs,['TBL-WS-1'],true);
  const tbl1=objs.find(o=>o.id==='TBL-WS-1')!,tbl2=objs.find(o=>o.id==='TBL-WS-2')!;
  const gridSnap=snapLayoutTranslation(objs,[],ws1Ids,'TBL-WS-1',317,-189,{grid:true,edges:false,connections:false,gridSizeMm:200});
  assert.equal(gridSnap.snappedX,'grid');assert.equal(gridSnap.snappedY,'grid');
  assert.equal(gridSnap.xMm%200,0);assert.equal(gridSnap.yMm%200,0);
  const noSnap=snapLayoutTranslation(objs,[],ws1Ids,'TBL-WS-1',317,-189,{grid:false,edges:false,connections:false,gridSizeMm:200});
  assert.equal(noSnap.snappedX,'none');assert.equal(noSnap.snappedY,'none');
  assert.equal(noSnap.dx,317);assert.equal(noSnap.dy,-189);
  const targetEdgeDeltaX=(tbl2.xMm-tbl1.widthMm)-tbl1.xMm;
  const edgeSnap=snapLayoutTranslation(objs,[],ws1Ids,'TBL-WS-1',targetEdgeDeltaX-45,512,{grid:true,edges:true,connections:false,gridSizeMm:200,thresholdMm:120});
  assert.equal(edgeSnap.snappedX,'edge');assert.equal(edgeSnap.dx,targetEdgeDeltaX);
  assert.equal(edgeSnap.xMm+tbl1.widthMm,tbl2.xMm);
  assert.ok(edgeSnap.guides.some(g=>g.kind==='edge'&&g.axis==='x'&&g.targetId==='TBL-WS-2'));
  const obstacle={id:'OBS-1',name:'Słup',xMm:5000,yMm:3000,widthMm:600,lengthMm:600,heightMm:3000};
  const obsDeltaY=(obstacle.yMm+obstacle.lengthMm)-tbl1.yMm;
  const obsSnap=snapLayoutTranslation(objs,[obstacle],ws1Ids,'TBL-WS-1',317,obsDeltaY+35,{grid:true,edges:true,connections:false,gridSizeMm:200,thresholdMm:120});
  assert.equal(obsSnap.snappedY,'edge');assert.equal(obsSnap.yMm,obstacle.yMm+obstacle.lengthMm);
  assert.ok(obsSnap.guides.some(g=>g.kind==='edge'&&g.axis==='y'&&g.targetId==='OBS-1'));
});
test('5.5: przyciąganie do punktów połączeń (portów bocznych i osi technologicznych) oraz priorytet nad siatką',()=>{
  const base=derive(structuredClone(motor)).project;
  const objs=base.layoutObjects;
  const ws1Ids=expandMoveSelection(objs,['TBL-WS-1'],true);
  const tbl1=objs.find(o=>o.id==='TBL-WS-1')!,tbl2=objs.find(o=>o.id==='TBL-WS-2')!;
  const pts1=objectConnectionPoints(tbl1);
  assert.equal(pts1.length,5);
  assert.deepEqual(pts1.find(p=>p.kind==='center'),{objectId:'TBL-WS-1',kind:'center',x:tbl1.xMm+tbl1.widthMm/2,y:tbl1.yMm+tbl1.lengthMm/2});
  const dockDx=(tbl2.xMm-tbl1.widthMm)-tbl1.xMm,dockDy=tbl2.yMm-tbl1.yMm;
  const portSnap=snapLayoutTranslation(objs,[],ws1Ids,'TBL-WS-1',dockDx+38,dockDy-29,{grid:true,edges:true,connections:true,gridSizeMm:200,thresholdMm:120});
  assert.equal(portSnap.snappedX,'connection');assert.equal(portSnap.snappedY,'connection');
  assert.equal(portSnap.dx,dockDx);assert.equal(portSnap.dy,dockDy);
  assert.ok(portSnap.guides.some(g=>g.kind==='connection'&&g.axis==='point'&&g.targetId==='TBL-WS-2'));
  const axialSnap=snapLayoutTranslation(objs,[],ws1Ids,'TBL-WS-1',42,-900,{grid:true,edges:false,connections:true,gridSizeMm:200,thresholdMm:120});
  assert.equal(axialSnap.snappedX,'connection');assert.equal(axialSnap.dx,0);
  assert.ok(axialSnap.guides.some(g=>g.kind==='connection'&&g.axis==='x'));
});
test('5.6: blokowanie obiektów chroni przed przesunięciem i wyrównaniem, kopie są odblokowane, a walidacja sprawdza pole locked',()=>{
  const base=derive(structuredClone(motor)).project;
  const objs=base.layoutObjects;
  const locked=lockLayoutObjects(objs,['TBL-WS-1'],true);
  assert.equal(locked.find(o=>o.id==='TBL-WS-1')!.locked,true);
  assert.equal(locked.find(o=>o.id==='TBL-WS-2')!.locked,undefined);
  // Próba przesunięcia zablokowanego stołu nie zmienia jego pozycji
  const moved=moveLayoutObjects(locked,['TBL-WS-1'],1200,-600,false);
  assert.deepEqual(moved.find(o=>o.id==='TBL-WS-1'),locked.find(o=>o.id==='TBL-WS-1'));
  // Wyrównanie: zablokowany obiekt jako drugi nie przesuwa się, a jako pierwszy może służyć za bazę odniesienia
  const shifted=moveLayoutObjects(locked,['TBL-WS-2'],900,0,true);
  const alignLockedTarget=alignLayoutObjects(shifted,['TBL-WS-2','TBL-WS-1'],'left',true);
  assert.deepEqual(alignLockedTarget.find(o=>o.id==='TBL-WS-1'),shifted.find(o=>o.id==='TBL-WS-1'));
  const alignToLockedRef=alignLayoutObjects(shifted,['TBL-WS-1','TBL-WS-2'],'left',true);
  assert.equal(alignToLockedRef.find(o=>o.id==='TBL-WS-2')!.xMm,shifted.find(o=>o.id==='TBL-WS-1')!.xMm);
  // Kopia zablokowanego obiektu jest domyślnie odblokowana
  let seq=0;
  const copied=copyLayoutObjects(locked,['TBL-WS-1'],500,500,()=>`COPY-LOCK-${++seq}`);
  const copyObj=copied.objects.find(o=>o.id==='COPY-LOCK-1')!;
  assert.equal(copyObj.locked,undefined);
  // Odblokowanie usuwa flagę locked
  const unlocked=lockLayoutObjects(locked,['TBL-WS-1'],false);
  assert.equal(unlocked.find(o=>o.id==='TBL-WS-1')!.locked,undefined);
  // Roundtrip JSON i walidacja niepoprawnego typu locked
  const roundtrip=parseProject(JSON.stringify({...base,layoutMode:'manual',layoutObjects:locked}));
  assert.equal(roundtrip.layoutObjects.find(o=>o.id==='TBL-WS-1')!.locked,true);
  assert.throws(()=>parseProject(JSON.stringify({...base,layoutMode:'manual',layoutObjects:[{...objs[0],locked:'tak'}]})),/stan blokady obiektu/);
});
test('5.6: klasyfikacja warstw oraz dokładny pomiar odległości między obiektami i punktami na rzucie',()=>{
  const base=derive(structuredClone(motor)).project;
  const objs=base.layoutObjects;
  const tbl1=objs.find(o=>o.id==='TBL-WS-1')!,tbl2=objs.find(o=>o.id==='TBL-WS-2')!;
  const fifo1=objs.find(o=>o.id==='FIFO-WS-1')!,mat1=objs.find(o=>o.id==='MAT-WS-1')!,matIn=objs.find(o=>o.id==='MAT-IN')!;
  assert.equal(classifyLayoutObjectLayer(tbl1),'stations');
  assert.equal(classifyLayoutObjectLayer(fifo1),'buffers');
  assert.equal(classifyLayoutObjectLayer(matIn),'buffers');
  assert.equal(classifyLayoutObjectLayer(mat1),'operators');
  const dist=measureObjectsDistance(tbl1,tbl2);
  const expectedGapX=Math.max(0,Math.max(tbl1.xMm-(tbl2.xMm+tbl2.widthMm),tbl2.xMm-(tbl1.xMm+tbl1.widthMm)));
  const expectedGapY=Math.max(0,Math.max(tbl1.yMm-(tbl2.yMm+tbl2.lengthMm),tbl2.yMm-(tbl1.yMm+tbl1.lengthMm)));
  assert.equal(dist.fromId,'TBL-WS-1');assert.equal(dist.toId,'TBL-WS-2');
  assert.equal(dist.gapXMm,expectedGapX);assert.equal(dist.gapYMm,expectedGapY);
  assert.equal(dist.edgeGapMm,Math.round(Math.hypot(expectedGapX,expectedGapY)));
  assert.equal(dist.dxCenterMm,Math.round((tbl2.xMm+tbl2.widthMm/2)-(tbl1.xMm+tbl1.widthMm/2)));
  assert.equal(dist.dyCenterMm,Math.round((tbl2.yMm+tbl2.lengthMm/2)-(tbl1.yMm+tbl1.lengthMm/2)));
  assert.equal(dist.centerDistanceMm,Math.round(Math.hypot(dist.dxCenterMm,dist.dyCenterMm)));
  // Nakładające się obiekty mają prześwit 0 mm
  const overlapping=measureObjectsDistance(tbl1,{...tbl2,xMm:tbl1.xMm+200,yMm:tbl1.yMm+100});
  assert.equal(overlapping.edgeGapMm,0);
  // Pomiar punkt-punkt (np. przekątna 3000 x 4000 = 5000 mm)
  const ptDist=measurePointsDistance({x:1000,y:1500},{x:4000,y:5500});
  assert.deepEqual(ptDist,{x1:1000,y1:1500,x2:4000,y2:5500,dxMm:3000,dyMm:4000,distanceMm:5000});
});
test('5.7: podkład hali — wymiary w mm oraz dwupunktowa kalibracja skali z obsługą błędów',()=>{
  const sampleSvgBase64=Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="800"></svg>','utf8').toString('base64');
  const underlay={
    name:'rzut_hali.svg',
    dataUrl:`data:image/svg+xml;base64,${sampleSvgBase64}`,
    imageWidthPx:1200,
    imageHeightPx:800,
    mmPerPixel:10,
    xMm:0,
    yMm:0,
    opacity:0.45,
    visible:true
  };
  assert.deepEqual(underlayDimensionsMm(underlay),{widthMm:12000,lengthMm:8000});
  // Odcinek na rzucie od (1000, 1000) do (4000, 5000) ma długość 5000 mm na ekranie, co przy 10 mm/px odpowiada 500 px obrazu.
  // Jeżeli rzeczywista odległość wynosi 10000 mm, nowa skala to 10000 / 500 = 20 mm/px.
  const calibrated=calibrateUnderlayScale(underlay,{x:1000,y:1000},{x:4000,y:5000},10000);
  assert.equal(calibrated.calibratedSpanPx,500);
  assert.equal(calibrated.calibratedDistanceMm,10000);
  assert.equal(calibrated.mmPerPixel,20);
  assert.deepEqual(underlayDimensionsMm(calibrated),{widthMm:24000,lengthMm:16000});
  // Błędy kalibracji: niedodatni wymiar rzeczywisty, zbyt krótki odcinek (<1 px), skala poza zakresem
  assert.throws(()=>calibrateUnderlayScale(underlay,{x:0,y:0},{x:1000,y:0},0),/musi być dodatnia/);
  assert.throws(()=>calibrateUnderlayScale(underlay,{x:100,y:100},{x:103,y:104},5000),/dwa różne punkty na podkładzie/);
  assert.throws(()=>calibrateUnderlayScale(underlay,{x:0,y:0},{x:100,y:0},200000),/poza zakresem/);
});
test('5.7: walidacja i persystencja podkładu hali w projekcie JSON',()=>{
  const base=derive(structuredClone(motor)).project;
  const sampleSvgBase64=Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="1000" height="600"></svg>','utf8').toString('base64');
  const validUnderlay={
    name:'hala_produkcyjna.svg',
    dataUrl:`data:image/svg+xml;base64,${sampleSvgBase64}`,
    imageWidthPx:1000,
    imageHeightPx:600,
    mmPerPixel:15.5,
    xMm:500,
    yMm:-250,
    opacity:0.5,
    visible:true,
    calibratedDistanceMm:6200,
    calibratedSpanPx:400
  };
  const parsed=parseProject(JSON.stringify({...base,facility:{...base.facility,underlay:validUnderlay}}));
  assert.deepEqual(parsed.facility.underlay,validUnderlay);
  // Niepoprawne dane podkładu są odrzucane przez walidator
  assert.throws(()=>parseProject(JSON.stringify({...base,facility:{...base.facility,underlay:{...validUnderlay,dataUrl:'http://example.com/plan.png'}}})),/Podkład hali: wymagany poprawny obraz/);
  assert.throws(()=>parseProject(JSON.stringify({...base,facility:{...base.facility,underlay:{...validUnderlay,mmPerPixel:0}}})),/Podkład hali: wymagany poprawny obraz/);
  assert.throws(()=>parseProject(JSON.stringify({...base,facility:{...base.facility,underlay:{...validUnderlay,opacity:1.5}}})),/Podkład hali: wymagany poprawny obraz/);
  assert.throws(()=>parseProject(JSON.stringify({...base,facility:{...base.facility,underlay:{...validUnderlay,imageWidthPx:-10}}})),/Podkład hali: wymagany poprawny obraz/);
});
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

test('5.8: import DXF — roundtrip eksportu DXF, weryfikacja jednostek ($INSUNITS) oraz zakresy aktualizacji projektu', () => {
  const derived = derive(motor);
  const objects = derived.layout?.objects ?? [];
  const exported = exportToDxf(motor.facility, objects, motor.name, motor.obstacles);
  const report = parseDxfImport(exported, { unitSelection: 'auto' });
  assert.equal(report.detectedInsunitsCode, 4);
  assert.equal(report.detectedUnit, 'mm');
  assert.equal(report.effectiveUnit, 'mm');
  assert.equal(report.mmPerUnit, 1);
  assert.equal(report.requiresUnitConfirmation, false);
  assert.equal(report.totalSkippedCount, 0);
  assert.ok(report.importedFacility);
  assert.equal(report.importedFacility.widthMm, motor.facility.widthMm);
  assert.equal(report.importedFacility.lengthMm, motor.facility.lengthMm);
  assert.equal(report.importedObstacles.length, motor.obstacles.length);
  assert.equal(report.importedVisualObjects.length, objects.length);

  // Sprawdzenie skalowania jednostek ($INSUNITS = 6 -> metry ×1000 mm)
  const dxfMeters = [
    '0', 'SECTION', '2', 'HEADER', '9', '$INSUNITS', '70', '6', '0', 'ENDSEC',
    '0', 'SECTION', '2', 'ENTITIES',
    '0', 'LWPOLYLINE', '8', 'FACILITY', '70', '1',
    '10', '0', '20', '0',
    '10', '32', '20', '0',
    '10', '32', '20', '-40',
    '10', '0', '20', '-40',
    '0', 'CIRCLE', '8', 'OBSTACLES', '10', '5', '20', '-8', '40', '0.6',
    '0', 'TEXT', '8', 'OBSTACLES', '10', '5', '20', '-8', '1', 'Słup nośny S-1',
    '0', 'ENDSEC', '0', 'EOF'
  ].join('\n');

  const meterReport = parseDxfImport(dxfMeters, { unitSelection: 'auto' });
  assert.equal(meterReport.detectedUnit, 'm');
  assert.equal(meterReport.mmPerUnit, 1000);
  assert.equal(meterReport.requiresUnitConfirmation, false);
  assert.deepEqual(meterReport.importedFacility, { widthMm: 32000, lengthMm: 40000, layer: 'FACILITY', label: undefined });
  assert.equal(meterReport.importedObstacles.length, 1);
  assert.equal(meterReport.importedObstacles[0].name, 'Słup nośny S-1');
  assert.equal(meterReport.importedObstacles[0].xMm, 4400);
  assert.equal(meterReport.importedObstacles[0].yMm, 7400);
  assert.equal(meterReport.importedObstacles[0].widthMm, 1200);
  assert.equal(meterReport.importedObstacles[0].lengthMm, 1200);

  // Zastosowanie importu w 3 zakresach
  const appliedHall = applyDxfImportToProject(motor.facility, motor.obstacles, objects, meterReport, 'facility-and-obstacles', true);
  assert.equal(appliedHall.facility.widthMm, 32000);
  assert.equal(appliedHall.facility.lengthMm, 40000);
  assert.equal(appliedHall.obstacles.length, 1);
  assert.equal(appliedHall.layoutObjects.length, objects.length);

  const appliedObsOnly = applyDxfImportToProject(motor.facility, motor.obstacles, objects, meterReport, 'obstacles-only', false);
  assert.equal(appliedObsOnly.facility.widthMm, motor.facility.widthMm);
  assert.equal(appliedObsOnly.obstacles.length, motor.obstacles.length + 1);
});

test('5.8: import DXF — wymóg potwierdzenia jednostek przy braku $INSUNITS oraz raport pominiętej geometrii CAD', () => {
  const dxfMixed = [
    '0', 'SECTION', '2', 'HEADER', '9', '$INSUNITS', '70', '0', '0', 'ENDSEC',
    '0', 'SECTION', '2', 'BLOCKS',
    '0', 'BLOCK', '2', 'INTERNAL_BLK',
    '0', 'LWPOLYLINE', '8', 'OBSTACLES', '70', '1', '10', '0', '20', '0', '10', '10', '20', '0', '10', '10', '20', '10',
    '0', 'ENDBLK',
    '0', 'ENDSEC',
    '0', 'SECTION', '2', 'ENTITIES',
    // Obsługiwana geometria hali z odcinków LINE na warstwie BOUNDARY
    '0', 'LINE', '8', 'BOUNDARY', '10', '0', '20', '0', '11', '25', '21', '0',
    '0', 'LINE', '8', 'BOUNDARY', '10', '25', '20', '0', '11', '25', '21', '30',
    '0', 'LINE', '8', 'BOUNDARY', '10', '25', '20', '30', '11', '0', '21', '30',
    '0', 'LINE', '8', 'BOUNDARY', '10', '0', '20', '30', '11', '0', '21', '0',
    // Obsługiwana przeszkoda POLYLINE + VERTEX + SEQEND
    '0', 'POLYLINE', '8', 'COLUMNS',
    '0', 'VERTEX', '8', 'COLUMNS', '10', '4', '20', '6',
    '0', 'VERTEX', '8', 'COLUMNS', '10', '5', '20', '6',
    '0', 'VERTEX', '8', 'COLUMNS', '10', '5', '20', '7',
    '0', 'VERTEX', '8', 'COLUMNS', '10', '4', '20', '7',
    '0', 'SEQEND',
    // Nieobsługiwane encje CAD (raportowane w skippedEntities)
    '0', 'INSERT', '8', 'EQUIPMENT', '2', 'ROBOT_CELL',
    '0', 'INSERT', '8', 'EQUIPMENT', '2', 'CONVEYOR_BLK',
    '0', 'SPLINE', '8', 'PATHS',
    '0', 'HATCH', '8', 'ZONES',
    '0', 'DIMENSION', '8', 'DIMS',
    '0', '3DFACE', '8', 'MESH_3D',
    // LWPOLYLINE z łukiem bulge (kod 42)
    '0', 'LWPOLYLINE', '8', 'OBSTACLES', '10', '1', '20', '1', '42', '0.5', '10', '2', '20', '1', '10', '2', '20', '2',
    // LWPOLYLINE z tylko 2 wierzchołkami
    '0', 'LWPOLYLINE', '8', 'EQUIPMENT', '10', '1', '20', '1', '10', '3', '20', '1',
    '0', 'ENDSEC', '0', 'EOF'
  ].join('\n');

  const unconfirmed = parseDxfImport(dxfMixed, { unitSelection: 'auto' });
  assert.equal(unconfirmed.detectedInsunitsCode, 0);
  assert.equal(unconfirmed.detectedUnit, null);
  assert.equal(unconfirmed.requiresUnitConfirmation, true);
  assert.ok(unconfirmed.unitWarning?.includes('jawnie wybierz jednostkę'));

  // Po jawnym wyborze metrów (m) blokada jednostek znika, a wymiary są przeliczone ×1000 mm
  const confirmedM = parseDxfImport(dxfMixed, { unitSelection: 'm' });
  assert.equal(confirmedM.requiresUnitConfirmation, false);
  assert.equal(confirmedM.mmPerUnit, 1000);
  assert.deepEqual(confirmedM.importedFacility, { widthMm: 25000, lengthMm: 30000, layer: 'BOUNDARY', label: undefined });
  assert.equal(confirmedM.importedObstacles.length, 2); // POLYLINE na COLUMNS + LWPOLYLINE z cięciwą na OBSTACLES
  assert.equal(confirmedM.importedObstacles[0].widthMm, 1000);
  assert.equal(confirmedM.importedObstacles[0].lengthMm, 1000);

  // Raport pominiętej geometrii zawiera wszystkie nieobsługiwane encje z ENTITIES (i ignoruje definicję BLOCKS)
  assert.equal(confirmedM.totalSkippedCount, 8);
  assert.ok(confirmedM.skippedEntities.some(s => s.type === 'INSERT' && s.layer === 'EQUIPMENT' && s.count === 2));
  assert.ok(confirmedM.skippedEntities.some(s => s.type === 'SPLINE' && s.layer === 'PATHS' && s.count === 1));
  assert.ok(confirmedM.skippedEntities.some(s => s.type === 'HATCH' && s.layer === 'ZONES' && s.count === 1));
  assert.ok(confirmedM.skippedEntities.some(s => s.type === 'DIMENSION' && s.layer === 'DIMS' && s.count === 1));
  assert.ok(confirmedM.skippedEntities.some(s => s.type === '3DFACE' && s.layer === 'MESH_3D' && s.count === 1));
  assert.ok(confirmedM.skippedEntities.some(s => s.type.includes('bulge')));
  assert.ok(confirmedM.skippedEntities.some(s => s.type === 'LWPOLYLINE' && s.reason.includes('mniej niż 3 wierzchołki')));
  assert.ok(DXF_UNITS.length >= 5);
});

test('5.9: generowanie czytelnych stref obsługi, odkładania i komunikacji (computeFunctionalZones)', () => {
  const derived = derive(motor);
  const objects = derived.project.layoutObjects ?? [];
  const zones = computeFunctionalZones(objects, derived.project.facility, derived.project.layoutSettings?.aisleMm ?? 2400);

  const serviceZones = zones.filter(z => z.kind === 'service');
  const stagingZones = zones.filter(z => z.kind === 'staging');
  const commZones = zones.filter(z => z.kind === 'communication');

  assert.equal(serviceZones.length, 2); // WS-1 i WS-2 (maty operatora + otoczka)
  assert.equal(stagingZones.length, 4); // 2 regały FIFO + Strefa Wejścia + Strefa Wyjścia
  assert.equal(commZones.length, 1); // pas komunikacji międzyrzędowej U-Shape

  assert.ok(serviceZones.every(z => z.label.startsWith('Strefa obsługi (')));
  assert.ok(stagingZones.every(z => z.label.startsWith('Strefa odkładania (')));
  assert.ok(commZones.every(z => z.label.startsWith('Strefa komunikacji')));

  // Układ liniowy (battery) generuje pas komunikacji wzdłuż linii
  const derivedBattery = derive(battery);
  const batteryZones = computeFunctionalZones(derivedBattery.project.layoutObjects ?? [], derivedBattery.project.facility, 2000);
  assert.ok(batteryZones.some(z => z.kind === 'communication' && z.label.startsWith('Strefa komunikacji wzdłuż linii')));

  // Stanowisko bez maty operatora otrzymuje domyślną przednią strefę obsługi (800 mm głębokości)
  const withoutMats = objects.filter(o => o.type !== 'OperatorErgoMat');
  const zonesWithoutMats = computeFunctionalZones(withoutMats, derived.project.facility, 2400);
  const fallbackService = zonesWithoutMats.filter(z => z.kind === 'service');
  assert.equal(fallbackService.length, 2);
  assert.ok(fallbackService.every(z => z.lengthMm === 800 && z.widthMm >= 1600));
});

test('5.9: kontrola geometryczna rzutu odróżnia ostrzeżenia geometryczne 2D od oceny zgodności BHP', () => {
  const derived = derive(motor);
  const objects = derived.project.layoutObjects ?? [];
  const cleanCheck = analyzeGeometricLayoutWarnings(
    objects,
    derived.project.obstacles,
    derived.project.facility,
    derived.project.layoutSettings
  );

  assert.equal(cleanCheck.disclaimer, BHP_GEOMETRY_DISCLAIMER);
  assert.equal(cleanCheck.safeStateNote, BHP_SAFE_STATE_NOTE);
  assert.ok(cleanCheck.disclaimer.includes('NIE stanowi oceny zgodności z przepisami BHP'));
  assert.ok(cleanCheck.safeStateNote.includes('nie potwierdza spełnienia wymogów BHP'));
  assert.equal(cleanCheck.warnings.length, 0);
  assert.equal(cleanCheck.affectedObjectIds.length, 0);

  // Wymuszenie ostrzeżeń geometrycznych: wyjście poza obrys hali, kolizja ze słupem, kolizja 2 obiektów, wąskie przejście i przeszkoda w strefie komunikacji
  const table1 = objects.find(o => o.id === 'TBL-WS-1')!;
  const table2 = objects.find(o => o.id === 'TBL-WS-2')!;

  const modifiedObjects = objects.map(o => {
    if (o.id === table1.id) {
      return { ...o, xMm: -500, yMm: -200 }; // poza obrysem hali (prawa krawędź = 1300)
    }
    if (o.id === table2.id) {
      return { ...o, xMm: 1500, yMm: -200 }; // prześwit 200 mm od TBL-WS-1 (poniżej progu 600 mm)
    }
    if (o.id === 'FIFO-WS-1') {
      return { ...o, xMm: -400, yMm: -100 }; // nakłada się z TBL-WS-1
    }
    return o;
  });

  const modifiedZones = computeFunctionalZones(modifiedObjects, derived.project.facility, 2000);
  const commZone = modifiedZones.find(z => z.kind === 'communication')!;

  const obstaclesWithIntrusion = [
    ...derived.project.obstacles,
    { id: 'OBS-IN-COMM', name: 'Słup w przejściu', xMm: commZone.xMm + 100, yMm: commZone.yMm + 100, zMm: 0, widthMm: 600, lengthMm: 600, heightMm: 3000, rotationDeg: 0 },
    { id: 'OBS-ON-TBL', name: 'Słup na stole', xMm: -200, yMm: -100, zMm: 0, widthMm: 500, lengthMm: 500, heightMm: 3000, rotationDeg: 0 }
  ];

  const warningCheck = analyzeGeometricLayoutWarnings(
    modifiedObjects,
    obstaclesWithIntrusion,
    derived.project.facility,
    { ...derived.project.layoutSettings, spacingMm: 600, aisleMm: 2000 }
  );

  assert.ok(warningCheck.warnings.length >= 5);
  assert.ok(warningCheck.warnings.every(w => w.scopeLabel === 'Geometria rzutu (nie BHP)'));
  assert.ok(warningCheck.warnings.every(w => w.message.includes('[Geometria rzutu — nie BHP]')));
  assert.ok(warningCheck.warnings.some(w => w.kind === 'hall-boundary'));
  assert.ok(warningCheck.warnings.some(w => w.kind === 'object-collision'));
  assert.ok(warningCheck.warnings.some(w => w.kind === 'obstacle-collision'));
  assert.ok(warningCheck.warnings.some(w => w.kind === 'narrow-aisle'));
  assert.ok(warningCheck.warnings.some(w => w.kind === 'zone-obstruction'));
  assert.ok(warningCheck.affectedObjectIds.includes('TBL-WS-1'));
  assert.ok(warningCheck.affectedObjectIds.includes('TBL-WS-2'));
});

test('5.10: LAYOUT_SHORTCUTS zawiera wymagane skróty, opisy i konteksty', () => {
  assert.ok(LAYOUT_SHORTCUTS.length >= 10);
  const keys = LAYOUT_SHORTCUTS.map(s => s.key);
  assert.ok(keys.includes('Ctrl+Z'));
  assert.ok(keys.includes('Ctrl+Y'));
  assert.ok(keys.includes('Ctrl+S'));
  assert.ok(keys.includes('F'));
  assert.ok(keys.includes('T'));
  assert.ok(keys.includes('G'));
  assert.ok(keys.includes('M'));
  assert.ok(keys.includes('L'));
  assert.ok(keys.includes('S'));
  assert.ok(keys.includes('Strzałki'));
  assert.ok(keys.includes('Escape'));

  for (const item of LAYOUT_SHORTCUTS) {
    assert.ok(item.key.length > 0);
    assert.ok(item.label.length > 0);
    assert.ok(item.description.length > 0);
    assert.ok(['all', '2d', '3d'].includes(item.context));
  }
});

test('5.10: nudgeLayoutObjects przesuwa obiekty w 4 kierunkach z ochroną locked i opcją zespołu', () => {
  const derived = derive(motor);
  const objects = derived.project.layoutObjects;
  const table = objects.find(o => o.id === 'TBL-WS-1')!;
  const fifo = objects.find(o => o.id === 'FIFO-WS-1')!;

  // 1. Nudge right with stationAssembly = true
  const movedRight = nudgeLayoutObjects(objects, [table.id], 'right', 150, true);
  const tableRight = movedRight.find(o => o.id === table.id)!;
  const fifoRight = movedRight.find(o => o.id === fifo.id)!;
  assert.equal(tableRight.xMm, table.xMm + 150);
  assert.equal(tableRight.yMm, table.yMm);
  assert.equal(fifoRight.xMm, fifo.xMm + 150);

  // 2. Nudge left
  const movedLeft = nudgeLayoutObjects(movedRight, [table.id], 'left', 150, true);
  const tableLeft = movedLeft.find(o => o.id === table.id)!;
  assert.equal(tableLeft.xMm, table.xMm);

  // 3. Nudge down
  const movedDown = nudgeLayoutObjects(objects, [table.id], 'down', 200, false);
  const tableDown = movedDown.find(o => o.id === table.id)!;
  const fifoDown = movedDown.find(o => o.id === fifo.id)!;
  assert.equal(tableDown.yMm, table.yMm + 200);
  assert.equal(fifoDown.yMm, fifo.yMm); // stationAssembly=false, fifo nie rusza się

  // 4. Nudge up
  const movedUp = nudgeLayoutObjects(movedDown, [table.id], 'up', 200, false);
  const tableUp = movedUp.find(o => o.id === table.id)!;
  assert.equal(tableUp.yMm, table.yMm);

  // 5. Locked object protection
  const lockedObjects = objects.map(o => o.id === table.id ? { ...o, locked: true } : o);
  const attemptedNudge = nudgeLayoutObjects(lockedObjects, [table.id], 'right', 100, false);
  const tableLocked = attemptedNudge.find(o => o.id === table.id)!;
  assert.equal(tableLocked.xMm, table.xMm); // nie przesunięty, bo locked

  // 6. Invalid step check
  assert.throws(() => nudgeLayoutObjects(objects, [table.id], 'right', 0), /dodatnią liczbą/);
  assert.throws(() => nudgeLayoutObjects(objects, [table.id], 'right', -50), /dodatnią liczbą/);
});

test('5.13: automatyczna pierwsza propozycja layoutu oparta na grafie i bilansie z uwzględnieniem BOM i założeń wizualnych', () => {
  // Test na projekcie silnika EV (niezależnym od Eko)
  const emptyProject = newProject();
  assert.equal(emptyProject.layoutObjects.length, 0);

  // Dodajemy operacje i BOM z projektu silnika EV
  const populated = {
    ...emptyProject,
    processSteps: structuredClone(DEFAULT_MOTOR_PROJECT.processSteps),
    bom: structuredClone(DEFAULT_MOTOR_PROJECT.bom),
    demand: structuredClone(DEFAULT_MOTOR_PROJECT.demand),
    facility: structuredClone(DEFAULT_MOTOR_PROJECT.facility),
    targetLayoutType: 'ProcessFlow' as const,
  };

  // 1. derive() automatycznie tworzy pierwszą propozycję layoutu bez konieczności klikania przycisku
  const derived = derive(populated);
  const layout = derived.project.layoutObjects;
  assert.ok(layout.length > 0, 'Pierwsza propozycja layoutu powinna zostać wygenerowana automatycznie');
  assert.ok(derived.project.balancing, 'Wstępny bilans powinien być wyznaczony');

  // 2. Wszystkie wygenerowane obiekty są oznaczone jako założenia wizualne (isVisualAssumption: true)
  assert.ok(layout.every(o => o.isVisualAssumption === true), 'Każdy automatycznie wygenerowany obiekt powinien być oznaczony jako założenie wizualne');

  // 3. BOM jest uwzględniony w prezentacji przepływu materiałów (regały FIFO)
  const fifoWs1 = layout.find(o => o.id === 'FIFO-WS-1');
  assert.ok(fifoWs1, 'Powinien istnieć regał FIFO dla WS-1');
  assert.ok(fifoWs1.name.includes('MOT-ST-01'), 'Regał FIFO dla WS-1 powinien uwzględniać numer części z BOM powiązany z krokiem 1');

  // 4. Brak BOM nie blokuje wyznaczenia szkicu rozmieszczenia stanowisk
  const noBomProject = { ...populated, bom: [] };
  const derivedNoBom = derive(noBomProject);
  assert.ok(derivedNoBom.project.layoutObjects.length > 0, 'Brak BOM nie może blokować szkicu layoutu');
  const fifoNoBom = derivedNoBom.project.layoutObjects.find(o => o.id === 'FIFO-WS-1');
  assert.ok(fifoNoBom && fifoNoBom.name === 'FIFO WS-1', 'Regał FIFO bez BOM generuje się standardowo');

  // 5. Stałe ostrzeżeń i założeń wizualnych
  assert.ok(VISUAL_ASSUMPTION_DISCLAIMER.includes('założenia wizualne'), 'VISUAL_ASSUMPTION_DISCLAIMER musi wyjaśniać charakter założeń');
  assert.ok(FACILITY_UNCONFIRMED_NOTE.includes('brak potwierdzonych wymiarów'), 'FACILITY_UNCONFIRMED_NOTE musi informować o braku potwierdzenia rzeczywistej przestrzeni');
});

test('5.13: automatyczna propozycja w docelowym modelu stanowisk v5 oraz ochrona pozycji ręcznych (baterie EV)', () => {
  // Test na procesie modułów baterii EV (całkowicie niezależnym od Eko)
  const batteryProject = structuredClone(DEFAULT_BATTERY_PROJECT);
  // Przygotuj v5 project z pustą geometrią
  const v5Migration = prepareStationMigration(previewStationMigration(JSON.stringify(batteryProject)));
  const v5Clean = { ...v5Migration.project, layoutObjects: [] };

  // 1. deriveStationProject automatycznie tworzy pierwszą propozycję layoutu, gdy layoutObjects jest puste
  const derivedV5 = deriveStationProject(v5Clean);
  assert.ok(derivedV5.project.layoutObjects.length > 0, 'Docelowy model v5 powinien automatycznie wygenerować pierwszą propozycję layoutu');
  const v5Tables = derivedV5.project.layoutObjects.filter(o => o.type.includes('Table'));
  assert.equal(v5Tables.length, derivedV5.project.balancing.workstations.length, 'Liczba stołów w pierwszej propozycji musi odpowiadać stanowiskom v5');
  assert.ok(derivedV5.issues.every(i => !i.message.includes('layout ma 0 stołów')), 'Nie powinno być błędów o braku stołów przy automatycznej propozycji');

  // 2. Ręczne pozycje są bezwzględnie chronione przed automatycznym nadpisaniem
  const customTableX = 99999;
  const customTableY = 88888;
  const manualV5 = {
    ...v5Clean,
    layoutMode: 'manual' as const,
    layoutObjects: derivedV5.project.layoutObjects.map(o => o.id === v5Tables[0].id ? { ...o, xMm: customTableX, yMm: customTableY } : o),
  };

  const derivedManual = deriveStationProject(manualV5);
  const preservedTable = derivedManual.project.layoutObjects.find(o => o.id === v5Tables[0].id)!;
  assert.equal(preservedTable.xMm, customTableX, 'Ręczna pozycja X stołu nie może być nadpisana');
  assert.equal(preservedTable.yMm, customTableY, 'Ręczna pozycja Y stołu nie może być nadpisana');
});

test('6.1: jednostki i konwersja skali mm do układu Three.js (1m = 1000mm)', () => {
  assert.equal(MM_TO_M, 0.001);
  assert.equal(M_TO_MM, 1000);
  assert.equal(mmToWorld(1000), 1.0);
  assert.equal(mmToWorld(1500), 1.5);
  assert.equal(mmToWorld(0), 0.0);
  assert.equal(worldToMm(1.0), 1000);
  assert.equal(worldToMm(2.345), 2345);

  const vWorld = vectorMmToWorld({ x: 2000, y: 3000, z: 850 });
  // Three.js: X to szerokość, Y to wysokość (elewacja zMm), Z to głębokość (długość hali yMm)
  assert.equal(vWorld.x, 2.0);
  assert.equal(vWorld.y, 0.85);
  assert.equal(vWorld.z, 3.0);
});

test('6.1: rejestr standardu wyposażenia waliduje wszystkie domyślne typy ObjectType', () => {
  const objectTypes: (keyof typeof DEFAULT_EQUIPMENT_SPECS)[] = [
    'Table',
    'TableESD',
    'TableToolRail',
    'QualityGate',
    'ReworkStation',
    'FlowRackFIFO2Tier',
    'FlowRackFIFO3Tier',
    'RollerConveyorGravity',
    'RollerConveyorMotorized',
    'PalletEuroFloorMark',
    'OperatorErgoMat',
    'Shadowboard5S',
    'AndonBoard',
    'MaterialIn',
    'FinishedGoods',
  ];

  for (const type of objectTypes) {
    const spec = getEquipmentStandardSpec(type);
    assert.ok(spec, `Specyfikacja dla ${type} musi istnieć w rejestrze`);
    assert.equal(spec.objectType, type);

    // Walidacja kontraktu specyfikacji
    const validated = validateEquipmentStandardSpec(spec);
    assert.equal(validated.id, spec.id);

    // Niezmiennik: model wizualny nigdy nie deklaruje zdolności technologicznej
    assert.equal(spec.metadata.isCertifiedTechnologicalCapacity, false);
    assert.ok(['MIT', 'CC-BY-4.0', 'CC0'].includes(spec.metadata.license));

    // Punkt wstawienia
    assert.ok(['footprint-center', 'bottom-left', 'top-left'].includes(spec.insertion.anchor));
    if (type === 'AndonBoard') {
      assert.equal(spec.insertion.elevation, 'suspended');
      assert.ok(spec.insertion.groundContactZMm > 2000);
    } else {
      assert.equal(spec.insertion.elevation, 'floor');
      assert.equal(spec.insertion.groundContactZMm, 0);
    }

    // Obrys kolizji
    assert.ok(spec.collision.widthMm > 0);
    assert.ok(spec.collision.lengthMm > 0);
    assert.ok(spec.collision.heightMm > 0);
    assert.ok(spec.collision.clearanceMarginMm >= 0);

    // Strefy obsługi
    for (const zone of spec.serviceZones) {
      assert.ok(zone.id.length > 0);
      assert.ok(zone.widthMm >= 600);
      assert.ok(zone.depthMm >= 400);
      assert.equal(zone.isErgonomicGuidelineOnly, true);
    }

    // Porty transportowe
    for (const port of spec.transportPorts) {
      assert.ok(port.id.length > 0);
      assert.ok(['input', 'output', 'bidirectional'].includes(port.type));
      assert.ok(port.allowedCarriers.length > 0);
      assert.ok(port.dockingClearanceMm.widthMm > 0);
    }
  }
});

test('6.1: walidacja niepoprawnej specyfikacji standardu odrzuca błędne dane', () => {
  assert.throws(() => validateEquipmentStandardSpec(null), /wymagany obiekt/);
  assert.throws(() => validateEquipmentStandardSpec({ id: 'x' }), /brak poprawnej nazwy/);
  assert.throws(() => validateEquipmentStandardSpec({ id: 'x', name: 'X', objectType: 'Table' }), /brak punktu wstawienia/);
  assert.throws(() => validateEquipmentStandardSpec({
    id: 'x',
    name: 'X',
    objectType: 'Table',
    insertion: { anchor: 'invalid-anchor', elevation: 'floor', facing: 'front-positive-y', groundContactZMm: 0 },
  }), /nieobsługiwany anchor/);
  assert.throws(() => validateEquipmentStandardSpec({
    id: 'x',
    name: 'X',
    objectType: 'Table',
    insertion: { anchor: 'footprint-center', elevation: 'floor', facing: 'front-positive-y', groundContactZMm: 0 },
    collision: { widthMm: -100, lengthMm: 800, heightMm: 850, clearanceMarginMm: 50, isSolidObstacle: true },
    metadata: { source: 'built-in', author: 'A', license: 'MIT', version: '1.0', isCertifiedTechnologicalCapacity: false },
  }), /widthMm musi być liczbą > 0/);
  assert.throws(() => validateEquipmentStandardSpec({
    id: 'x',
    name: 'X',
    objectType: 'Table',
    insertion: { anchor: 'footprint-center', elevation: 'floor', facing: 'front-positive-y', groundContactZMm: 0 },
    collision: { widthMm: 1500, lengthMm: 800, heightMm: 850, clearanceMarginMm: 50, isSolidObstacle: true },
    metadata: { source: 'built-in', author: 'A', license: 'MIT', version: '1.0', isCertifiedTechnologicalCapacity: true as any },
  }), /musi być false/);
});

test('6.1: obrys kolizji 2D i 3D z marginesem bezpieczeństwa oraz detekcja kolizji', () => {
  const table1: LayoutObject = {
    id: 'TBL-1',
    name: 'Stół 1',
    type: 'Table',
    xMm: 1000,
    yMm: 1000,
    zMm: 0,
    widthMm: 1500,
    lengthMm: 800,
    heightMm: 850,
    rotationDeg: 0,
    colorHex: '#3b82f6',
  };

  // Stół 2 oddalony o 3000 mm (brak kolizji)
  const table2Far: LayoutObject = {
    id: 'TBL-2',
    name: 'Stół 2',
    type: 'Table',
    xMm: 4000,
    yMm: 1000,
    zMm: 0,
    widthMm: 1500,
    lengthMm: 800,
    heightMm: 850,
    rotationDeg: 0,
    colorHex: '#3b82f6',
  };

  assert.equal(checkEquipmentCollision2D(table1, table2Far), false);
  assert.equal(checkEquipmentCollision3D(table1, table2Far), false);

  // Stół 3 nakładający się na stół 1
  const table3Overlap: LayoutObject = {
    id: 'TBL-3',
    name: 'Stół 3',
    type: 'Table',
    xMm: 1200,
    yMm: 1100,
    zMm: 0,
    widthMm: 1500,
    lengthMm: 800,
    heightMm: 850,
    rotationDeg: 0,
    colorHex: '#3b82f6',
  };

  assert.equal(checkEquipmentCollision2D(table1, table3Overlap), true);
  assert.equal(checkEquipmentCollision3D(table1, table3Overlap), true);

  // Stół 4 stykający się w strefie marginesu (clearanceMarginMm = 50)
  // Table 1 maxX = 2500. Table 4 minX = 2520 (odległość 20mm < margin 50mm)
  const table4MarginContact: LayoutObject = {
    id: 'TBL-4',
    name: 'Stół 4',
    type: 'Table',
    xMm: 2520,
    yMm: 1000,
    zMm: 0,
    widthMm: 1500,
    lengthMm: 800,
    heightMm: 850,
    rotationDeg: 0,
    colorHex: '#3b82f6',
  };
  assert.equal(checkEquipmentCollision2D(table1, table4MarginContact), true);

  // Tablica Andon podwieszona na Z=2200 nad stołem 1 (Z=0..850)
  const andonAbove: LayoutObject = {
    id: 'ANDON-1',
    name: 'Andon',
    type: 'AndonBoard',
    xMm: 1100,
    yMm: 1100,
    zMm: 2200,
    widthMm: 1200,
    lengthMm: 200,
    heightMm: 600,
    rotationDeg: 0,
    colorHex: '#ef4444',
  };
  // 2D kolizja nie zachodzi, bo Andon nie jest solid obstacle
  assert.equal(checkEquipmentCollision2D(table1, andonAbove), false);
  assert.equal(checkEquipmentCollision3D(table1, andonAbove), false);

  // Kolizja ze słupem hali (Obstacle)
  const pillarObstacle: Obstacle = {
    id: 'PIL-1',
    name: 'Słup nośny',
    xMm: 1500,
    yMm: 1200,
    widthMm: 400,
    lengthMm: 400,
    heightMm: 6000,
  };
  assert.equal(checkObstacleCollision(table1, pillarObstacle), true);

  const distantObstacle: Obstacle = {
    id: 'PIL-2',
    name: 'Słup daleki',
    xMm: 8000,
    yMm: 8000,
    widthMm: 400,
    lengthMm: 400,
    heightMm: 6000,
  };
  assert.equal(checkObstacleCollision(table1, distantObstacle), false);
});

test('6.1: pozycjonowanie portów transportowych i transformacje obrotu wyposażenia', () => {
  const table: LayoutObject = {
    id: 'TBL-PORT',
    name: 'Stół z portami',
    type: 'Table',
    xMm: 1000,
    yMm: 2000,
    zMm: 0,
    widthMm: 1500,
    lengthMm: 800,
    heightMm: 850,
    rotationDeg: 0,
    colorHex: '#3b82f6',
  };
  const spec = getEquipmentStandardSpec('Table');
  const inPort = spec.transportPorts.find(p => p.id === 'port-table-in')!;
  const outPort = spec.transportPorts.find(p => p.id === 'port-table-out')!;

  // 1. Obrót 0°: środek stołu = (1750, 2400).
  // Port IN: localX = -750, localY = 0 => worldX = 1000, worldY = 2400, worldZ = 850
  const portInRot0 = getTransportPortWorldPosition(table, inPort);
  assert.equal(portInRot0.xMm, 1000);
  assert.equal(portInRot0.yMm, 2400);
  assert.equal(portInRot0.zMm, 850);
  assert.equal(portInRot0.absoluteApproachDeg, 270);

  // Port OUT: localX = +750, localY = 0 => worldX = 2500, worldY = 2400, worldZ = 850
  const portOutRot0 = getTransportPortWorldPosition(table, outPort);
  assert.equal(portOutRot0.xMm, 2500);
  assert.equal(portOutRot0.yMm, 2400);
  assert.equal(portOutRot0.zMm, 850);
  assert.equal(portOutRot0.absoluteApproachDeg, 90);

  // 2. Obrót 90°:
  const tableRot90 = { ...table, rotationDeg: 90 };
  const portInRot90 = getTransportPortWorldPosition(tableRot90, inPort);
  // local (-750, 0) rotated by 90° => (0, -750)
  assert.equal(portInRot90.xMm, 1750);
  assert.equal(portInRot90.yMm, 1650);
  assert.equal(portInRot90.absoluteApproachDeg, 0); // 270 + 90 = 360 = 0°
});

test('6.1: niezmiennik oddzielenia modelu wizualnego od parametrów technologicznych (Plan 6.4 & Zasada 6)', () => {
  const techBase = {
    cycleTimeSeconds: 120,
    standardTimeSeconds: 110,
    capableOperationIds: ['OP-1', 'OP-2'],
  };

  // Zmiana geometrii, koloru, modelu 3D bez modyfikacji technologii - dozwolona
  assert.doesNotThrow(() => {
    assertVisualModelIndependence(techBase, { ...techBase });
  });

  // Próba zmiany czasu cyklu pod pretekstem zmiany modelu wizualnego - odrzucana!
  assert.throws(() => {
    assertVisualModelIndependence(techBase, { ...techBase, cycleTimeSeconds: 90 });
  }, /nie może modyfikować czasu cyklu/);

  // Próba zmiany czasu standardowego - odrzucana!
  assert.throws(() => {
    assertVisualModelIndependence(techBase, { ...techBase, standardTimeSeconds: 80 });
  }, /nie może modyfikować czasu standardowego/);

  // Próba zmiany zdolności operacyjnych - odrzucana!
  assert.throws(() => {
    assertVisualModelIndependence(techBase, { ...techBase, capableOperationIds: ['OP-1'] });
  }, /nie może modyfikować zdolności operacyjnych/);
});

test('6.1: powiązanie wyposażenia schematu 6 z equipmentStandardId', () => {
  // Stwórz projekt v6 ze stanowiskiem
  const v6Base = {
    schemaVersion: 6 as const,
    modelStatus: 'incomplete' as const,
    name: 'Projekt v6 test standardu',
    algorithm: 'Manual' as const,
    demand: structuredClone(DEFAULT_MOTOR_PROJECT.demand),
    facility: structuredClone(DEFAULT_MOTOR_PROJECT.facility),
    bom: [],
    targetLayoutType: DEFAULT_MOTOR_PROJECT.targetLayoutType,
    layoutSettings: structuredClone(DEFAULT_MOTOR_PROJECT.layoutSettings),
    layoutMode: 'manual' as const,
    operations: [
      { id: 'OP-01', name: 'Montaż stojana', standardTimeSeconds: 60, vaTimeSeconds: 50, nvaTimeSeconds: 10, sequenceNumber: 1, predecessorIds: [] },
    ],
    stations: [
      { id: 'ST-01', name: 'Stanowisko 1', operationIds: ['OP-01'] },
    ],
    stationSettings: { 'ST-01': { operators: 1, parallelStations: 1 } },
    workers: [{ id: 'W-01', name: 'Jan Kowalski' }],
    workerPools: [{ id: 'POOL-1', name: 'Monterzy', workerIds: ['W-01'] }],
    equipment: [],
    product: { id: 'PRD-1', name: 'Silnik EV' },
    subassemblies: [],
    obstacles: [],
    layoutObjects: [
      { id: 'LO-01', name: 'Stół 1', type: 'Table' as const, xMm: 1000, yMm: 1000, zMm: 0, widthMm: 1500, lengthMm: 800, heightMm: 850, rotationDeg: 0, colorHex: '#3b82f6', workstationId: 'ST-01' },
    ],
  };

  // 1. Dodanie wyposażenia z equipmentStandardId
  const withEq = editDomainEquipment(v6Base, {
    kind: 'add-equipment',
    id: 'EQ-01',
    name: 'Stół montażowy główny',
    stationId: 'ST-01',
    layoutObjectId: 'LO-01',
    capableOperationIds: ['OP-01'],
    equipmentStandardId: 'spec-table-std-1500x800',
  });

  assert.equal(withEq.equipment.length, 1);
  assert.equal(withEq.equipment[0].equipmentStandardId, 'spec-table-std-1500x800');

  // 2. Walidacja w parseDomainProjectV6
  const parsed = parseDomainProjectV6(JSON.stringify(withEq));
  assert.equal(parsed.equipment[0].equipmentStandardId, 'spec-table-std-1500x800');

  // 3. Edycja equipmentStandardId
  const editedEq = editDomainEquipment(withEq, {
    kind: 'edit-equipment',
    id: 'EQ-01',
    name: 'Stół montażowy ESD',
    stationId: 'ST-01',
    layoutObjectId: 'LO-01',
    capableOperationIds: ['OP-01'],
    equipmentStandardId: 'spec-table-esd-1500x800',
  });
  assert.equal(editedEq.equipment[0].equipmentStandardId, 'spec-table-esd-1500x800');
});

test('6.2: parametryczne generowanie stołów montażowych (Table, TableESD, TestStationBench)', () => {
  const tableStandard = {
    id: 'lo-table-1',
    name: 'Stół montażowy standardowy',
    type: 'Table' as const,
    xMm: 2000,
    yMm: 3000,
    zMm: 0,
    widthMm: 1500,
    lengthMm: 800,
    heightMm: 850,
    rotationDeg: 0,
    colorHex: '#3b82f6',
  };

  const groupStd = createParametricEquipmentGroup(tableStandard);
  assert.ok(groupStd instanceof THREE.Group);
  assert.equal(groupStd.userData.id, 'lo-table-1');
  assert.equal(groupStd.userData.type, 'Table');
  // Pozycja w Three.js: X = (2000 + 1500/2)/1000 = 2.75, Y = 0, Z = (3000 + 800/2)/1000 = 3.4
  assert.equal(groupStd.position.x, 2.75);
  assert.equal(groupStd.position.y, 0);
  assert.equal(groupStd.position.z, 3.4);
  assert.ok(groupStd.children.length >= 10, 'Stół powinien mieć blat, 4 nogi, stopy, ramy i nadbudowę');

  // Stół ESD z matą
  const tableESD = {
    ...tableStandard,
    id: 'lo-table-esd',
    type: 'TableESD' as const,
    colorHex: '#1e3a8a',
  };
  const groupESD = createParametricEquipmentGroup(tableESD);
  assert.ok(groupESD.children.length > groupStd.children.length, 'Stół ESD powinien zawierać nakładkę maty ESD');

  // Stół diagnostyczny TestStationBench z kanałem zasilającym i ekranem
  const testBench = {
    ...tableStandard,
    id: 'lo-test-bench',
    type: 'TestStationBench' as const,
  };
  const groupTest = createParametricEquipmentGroup(testBench);
  assert.ok(groupTest.children.length > groupESD.children.length, 'Stół testowy powinien zawierać aparaturę i ekran');
});

test('6.2: parametryczne generowanie regałów (FlowRackFIFO3Tier, ShelvingUnitBulk)', () => {
  const fifo = {
    id: 'lo-fifo-1',
    name: 'Regał przepływowy FIFO',
    type: 'FlowRackFIFO3Tier' as const,
    xMm: 0,
    yMm: 0,
    zMm: 0,
    widthMm: 1200,
    lengthMm: 1000,
    heightMm: 1600,
    rotationDeg: 90,
    colorHex: '#d97706',
  };

  const groupFifo = createParametricEquipmentGroup(fifo);
  assert.ok(groupFifo instanceof THREE.Group);
  // Sprawdź obrót
  assert.equal(groupFifo.rotation.y, (-90 * Math.PI) / 180);
  // Regał FIFO ma co najmniej 4 nogi + 3 półki rolkowe + półkę zwrotu pustych
  assert.ok(groupFifo.children.length >= 8);

  const bulkRack = {
    id: 'lo-bulk-1',
    name: 'Regał magazynowy wysokiego składowania',
    type: 'ShelvingUnitBulk' as const,
    xMm: 5000,
    yMm: 2000,
    zMm: 0,
    widthMm: 2700,
    lengthMm: 1100,
    heightMm: 2500,
    rotationDeg: 0,
    colorHex: '#1e3a8a',
  };
  const groupBulk = createParametricEquipmentGroup(bulkRack);
  assert.ok(groupBulk instanceof THREE.Group);
  assert.ok(groupBulk.children.length >= 10, 'Regał magazynowy powinien mieć słupy, belki i półki');
});

test('6.2: parametryczne generowanie palet i oznakowań podłogowych (PalletEuroFloorMark, PalletEuroStack)', () => {
  const floorMark = {
    id: 'lo-pallet-mark',
    name: 'Miejsce paletowe Euro z obrysem',
    type: 'PalletEuroFloorMark' as const,
    xMm: 1000,
    yMm: 1000,
    zMm: 0,
    widthMm: 1200,
    lengthMm: 800,
    heightMm: 144,
    rotationDeg: 0,
    colorHex: '#facc15',
  };
  const groupMark = createParametricEquipmentGroup(floorMark);
  assert.ok(groupMark instanceof THREE.Group);
  // Powinien zawierać obrys pasów i narożników oraz paletę Euro
  assert.ok(groupMark.children.length >= 6);

  const palletStack = {
    id: 'lo-pallet-stack',
    name: 'Stos palet Euro',
    type: 'PalletEuroStack' as const,
    xMm: 1000,
    yMm: 1000,
    zMm: 0,
    widthMm: 1200,
    lengthMm: 800,
    heightMm: 450, // 3 palety w stosie
    rotationDeg: 0,
    colorHex: '#c89f68',
  };
  const groupStack = createParametricEquipmentGroup(palletStack);
  assert.ok(groupStack instanceof THREE.Group);
  // Stos 3 palet powinien mieć więcej elementów niż pojedyncza paleta
  assert.ok(groupStack.children.length >= 3);
});

test('6.2: parametryczne generowanie pojemników KLT (KltBoxStack, MaterialIn, FinishedGoods)', () => {
  const kltStack = {
    id: 'lo-klt-stack',
    name: 'Stos pojemników KLT',
    type: 'KltBoxStack' as const,
    xMm: 2000,
    yMm: 2000,
    zMm: 0,
    widthMm: 800,
    lengthMm: 600,
    heightMm: 600,
    rotationDeg: 0,
    colorHex: '#2563eb',
  };
  const groupKlt = createParametricEquipmentGroup(kltStack);
  assert.ok(groupKlt instanceof THREE.Group);
  assert.ok(groupKlt.children.length >= 4, 'Stos KLT powinien zawierać pojemniki w siatce');

  const matIn = {
    id: 'lo-mat-in',
    name: 'Pojemnik wejściowy materiału',
    type: 'MaterialIn' as const,
    xMm: 0,
    yMm: 0,
    zMm: 0,
    widthMm: 600,
    lengthMm: 400,
    heightMm: 300,
    rotationDeg: 0,
    colorHex: '#16a34a',
  };
  const groupIn = createParametricEquipmentGroup(matIn);
  assert.ok(groupIn instanceof THREE.Group);

  const finGoods = {
    id: 'lo-fin-goods',
    name: 'Pojemnik wyjściowy wyrobów gotowych',
    type: 'FinishedGoods' as const,
    xMm: 0,
    yMm: 0,
    zMm: 0,
    widthMm: 600,
    lengthMm: 400,
    heightMm: 300,
    rotationDeg: 0,
    colorHex: '#2563eb',
  };
  const groupOut = createParametricEquipmentGroup(finGoods);
  assert.ok(groupOut instanceof THREE.Group);
});

test('6.2: parametryczne generowanie wózków transportowych i AGV (CartTuggerPlatform, AGVMiniLifter)', () => {
  const tugger = {
    id: 'lo-tugger-1',
    name: 'Wózek platformowy pociągowy',
    type: 'CartTuggerPlatform' as const,
    xMm: 3000,
    yMm: 3000,
    zMm: 0,
    widthMm: 1300,
    lengthMm: 900,
    heightMm: 950,
    rotationDeg: 0,
    colorHex: '#1d4ed8',
  };
  const groupTugger = createParametricEquipmentGroup(tugger);
  assert.ok(groupTugger instanceof THREE.Group);
  // Zawiera 4 zestawy kołowe (koła + widelce), ramę podwozia, płytę ładunkową, krawędzie, dyszel i uchwyt
  assert.ok(groupTugger.children.length >= 12);

  const agv = {
    id: 'lo-agv-1',
    name: 'Wózek samojezdny AMR/AGV',
    type: 'AGVMiniLifter' as const,
    xMm: 4000,
    yMm: 4000,
    zMm: 0,
    widthMm: 900,
    lengthMm: 650,
    heightMm: 300,
    rotationDeg: 0,
    colorHex: '#0284c7',
  };
  const groupAGV = createParametricEquipmentGroup(agv);
  assert.ok(groupAGV instanceof THREE.Group);
  // Zawiera korpus, zderzaki bezpieczeństwa, skanery LIDAR, stół podnośnika i pas LED
  assert.ok(groupAGV.children.length >= 6);
});

test('6.2: parametryczne generowanie przenośników rolkowych (ConveyorRollerSegment)', () => {
  const conveyor = {
    id: 'lo-conv-1',
    name: 'Przenośnik rolkowy grawitacyjny',
    type: 'ConveyorRollerSegment' as const,
    xMm: 1000,
    yMm: 1000,
    zMm: 0,
    widthMm: 700,
    lengthMm: 2400,
    heightMm: 800,
    rotationDeg: 0,
    colorHex: '#475569',
  };
  const groupConv = createParametricEquipmentGroup(conveyor);
  assert.ok(groupConv instanceof THREE.Group);
  // Dla długości 2400mm przy podziałce 100mm powinno być ponad 20 rolek + profile boczne + 2 podpory H
  assert.ok(groupConv.children.length >= 20, 'Przenośnik powinien posiadać zestaw rolek i podpór');
});

test('6.2: nakładki wizualne (strefa obsługi, obrys kolizji, porty transportowe) oraz zwalnianie zasobów (dispose)', () => {
  const tableWithOverlays = {
    id: 'lo-table-overlays',
    name: 'Stół z nakładkami wizualnymi',
    type: 'Table' as const,
    xMm: 0,
    yMm: 0,
    zMm: 0,
    widthMm: 1500,
    lengthMm: 800,
    heightMm: 850,
    rotationDeg: 0,
    colorHex: '#3b82f6',
  };

  const baseCount = createParametricEquipmentGroup(tableWithOverlays).children.length;

  const withOverlays = createParametricEquipmentGroup(tableWithOverlays, {
    showServiceZone: true,
    showCollisionEnvelope: true,
    showTransportPorts: true,
  });

  assert.ok(withOverlays.children.length > baseCount, 'Grupa z nakładkami powinna zawierać dodatkowe obiekty wizualizacyjne');

  // Sprawdź czyste zwalnianie zasobów GPU bez błędów
  assert.doesNotThrow(() => {
    disposeEquipmentGroup(withOverlays);
  });
});

test('6.5: przeliczanie współrzędnych 2D-3D, wysokości i obrotu z zachowaniem inwersji i przyciągania', () => {
  // Test konwersji współrzędnych bez przyciągania
  const xMm = 1500, yMm = 3200, widthMm = 1200, lengthMm = 800;
  const world = layoutToWorldCoordinates(xMm, yMm, widthMm, lengthMm);
  // Środek w Three.js: (1500 + 600)/1000 = 2.1m, (3200 + 400)/1000 = 3.6m
  assert.equal(world.posX, 2.1);
  assert.equal(world.posZ, 3.6);

  const recovered = worldToLayoutCoordinates(world.posX, world.posZ, widthMm, lengthMm);
  assert.equal(recovered.xMm, xMm);
  assert.equal(recovered.yMm, yMm);

  // Test przyciągania do siatki (np. 100mm, 250mm)
  const snapped = worldToLayoutCoordinates(2.13, 3.64, widthMm, lengthMm, 200);
  assert.equal(snapped.xMm % 200, 0);
  assert.equal(snapped.yMm % 200, 0);

  // Test obrotu: stopnie -> radiany świata 3D -> stopnie
  const angles = [0, 15, 45, 90, 180, 270, 315];
  for (const deg of angles) {
    const rad = degreesToWorldRotation(deg);
    const backDeg = worldRotationToDegrees(rad);
    assert.equal(backDeg, deg);
  }

  // Przyciąganie kąta do dyskretnych wartości (co 15°)
  const radApprox = degreesToWorldRotation(44.2);
  const snappedDeg = worldRotationToDegrees(radApprox, 15);
  assert.equal(snappedDeg, 45);

  const radZeroApprox = degreesToWorldRotation(358.5);
  const snappedZero = worldRotationToDegrees(radZeroApprox, 15);
  assert.equal(snappedZero, 0);
});

test('6.5: ochrona obiektów locked przed manipulacją 3D', () => {
  const unlocked = { id: 'obj-1', locked: false };
  const locked = { id: 'obj-2', locked: true };

  assert.equal(canManipulate3D(unlocked), true);
  assert.equal(canManipulate3D(locked), false);
  assert.equal(canManipulate3D(null), false);
  assert.equal(canManipulate3D(undefined), false);

  const objects = [
    { id: '1', name: 'A', type: 'Table' as const, xMm: 0, yMm: 0, zMm: 0, widthMm: 1000, lengthMm: 800, heightMm: 800, rotationDeg: 0, colorHex: '#fff', locked: true },
    { id: '2', name: 'B', type: 'Table' as const, xMm: 1000, yMm: 0, zMm: 0, widthMm: 1000, lengthMm: 800, heightMm: 800, rotationDeg: 0, colorHex: '#fff', locked: false },
  ];
  const lockedObject = objects.find(o => o.id === '1')!;
  assert.equal(canManipulate3D(lockedObject), false);
  const unlockedObject = objects.find(o => o.id === '2')!;
  assert.equal(canManipulate3D(unlockedObject), true);
});

test('6.5: filtrowanie widoczności warstw 3D (stanowiska, bufory, operatorzy, relacje, przeszkody)', () => {
  const table = { id: 'tbl', name: 'Stół', type: 'Table' as const, xMm: 0, yMm: 0, zMm: 0, widthMm: 1000, lengthMm: 800, heightMm: 800, rotationDeg: 0, colorHex: '#fff' };
  const rack = { id: 'rck', name: 'Regał FIFO', type: 'FlowRackFIFO3Tier' as const, xMm: 0, yMm: 0, zMm: 0, widthMm: 1000, lengthMm: 800, heightMm: 800, rotationDeg: 0, colorHex: '#fff' };
  const mat = { id: 'mat', name: 'Mata ergo', type: 'OperatorErgoMat' as const, xMm: 0, yMm: 0, zMm: 0, widthMm: 1000, lengthMm: 800, heightMm: 800, rotationDeg: 0, colorHex: '#fff' };

  // Domyślnie wszystkie warstwy aktywne
  assert.equal(isLayoutObjectVisible3D(table, DEFAULT_3D_LAYERS), true);
  assert.equal(isLayoutObjectVisible3D(rack, DEFAULT_3D_LAYERS), true);
  assert.equal(isLayoutObjectVisible3D(mat, DEFAULT_3D_LAYERS), true);

  // Wyłączenie warstwy stanowisk
  const noStations: Layout3DLayersState = { ...DEFAULT_3D_LAYERS, stations: false };
  assert.equal(isLayoutObjectVisible3D(table, noStations), false);
  assert.equal(isLayoutObjectVisible3D(rack, noStations), true);
  assert.equal(isLayoutObjectVisible3D(mat, noStations), true);

  // Wyłączenie warstwy buforów
  const noBuffers: Layout3DLayersState = { ...DEFAULT_3D_LAYERS, buffers: false };
  assert.equal(isLayoutObjectVisible3D(table, noBuffers), true);
  assert.equal(isLayoutObjectVisible3D(rack, noBuffers), false);
  assert.equal(isLayoutObjectVisible3D(mat, noBuffers), true);

  // Wyłączenie warstwy operatorów
  const noOperators: Layout3DLayersState = { ...DEFAULT_3D_LAYERS, operators: false };
  assert.equal(isLayoutObjectVisible3D(table, noOperators), true);
  assert.equal(isLayoutObjectVisible3D(rack, noOperators), true);
  assert.equal(isLayoutObjectVisible3D(mat, noOperators), false);
});

test('6.5: ukrywanie pojedynczych obiektów i grup w 3D oraz ich przywracanie', () => {
  const table = { id: 'tbl-1', name: 'Stół 1', type: 'Table' as const, xMm: 0, yMm: 0, zMm: 0, widthMm: 1000, lengthMm: 800, heightMm: 800, rotationDeg: 0, colorHex: '#fff' };
  const table2 = { id: 'tbl-2', name: 'Stół 2', type: 'Table' as const, xMm: 1200, yMm: 0, zMm: 0, widthMm: 1000, lengthMm: 800, heightMm: 800, rotationDeg: 0, colorHex: '#fff' };

  let hidden: string[] = [];
  assert.equal(isLayoutObjectVisible3D(table, DEFAULT_3D_LAYERS, hidden), true);

  // Ukryj table
  hidden = hideObjectIds(hidden, ['tbl-1']);
  assert.equal(isLayoutObjectVisible3D(table, DEFAULT_3D_LAYERS, hidden), false);
  assert.equal(isLayoutObjectVisible3D(table2, DEFAULT_3D_LAYERS, hidden), true);

  // Przełącz ukrycie (toggle)
  hidden = toggleHiddenObjectIds(hidden, ['tbl-1', 'tbl-2']);
  assert.equal(isLayoutObjectVisible3D(table, DEFAULT_3D_LAYERS, hidden), true); // tbl-1 odkryty
  assert.equal(isLayoutObjectVisible3D(table2, DEFAULT_3D_LAYERS, hidden), false); // tbl-2 ukryty

  // Pokaż wszystkie (odkryj)
  hidden = showObjectIds(hidden, ['tbl-2']);
  assert.deepEqual(hidden, []);
  assert.equal(isLayoutObjectVisible3D(table2, DEFAULT_3D_LAYERS, hidden), true);
});

test('6.5: skróty klawiszowe 3D (W, E, Q, H, Shift+H) w rejestrze LAYOUT_SHORTCUTS', () => {
  const keys = LAYOUT_SHORTCUTS.map(s => s.key);
  assert.ok(keys.includes('W'), 'Skrót W (przesuwanie 3D) powinien być zarejestrowany');
  assert.ok(keys.includes('E'), 'Skrót E (obrót 3D) powinien być zarejestrowany');
  assert.ok(keys.includes('Q'), 'Skrót Q (wyłączenie manipulatora) powinien być zarejestrowany');
  assert.ok(keys.includes('H'), 'Skrót H (ukrywanie w 3D) powinien być zarejestrowany');
  assert.ok(keys.includes('Shift+H'), 'Skrót Shift+H (pokazanie ukrytych) powinien być zarejestrowany');

  const wDef = LAYOUT_SHORTCUTS.find(s => s.key === 'W')!;
  assert.equal(wDef.context, '3d');
  const eDef = LAYOUT_SHORTCUTS.find(s => s.key === 'E')!;
  assert.equal(eDef.context, '3d');
  const qDef = LAYOUT_SHORTCUTS.find(s => s.key === 'Q')!;
  assert.equal(qDef.context, '3d');
});

test('6.5: niezmiennik symulacji i technologii przy manipulacji i ukrywaniu (Zasada 6 i Plan 6.4)', () => {
  const source = derive(parseProject(JSON.stringify(motor))).project;
  const original = structuredClone(source);

  // Manipulacja wizualna / ukrywanie obiektów nie ma wpływu na balans ani na strukturę procesu
  assert.deepEqual(source.processSteps, original.processSteps);
  assert.deepEqual(source.balancing, original.balancing);
  assert.deepEqual(source.demand, original.demand);

  // Wymiary, obroty czy ukrywanie obiektów nie mogą zmieniać czasów operacji
  for (const step of source.processSteps) {
    const origStep = original.processSteps.find(s => s.id === step.id)!;
    assert.equal(step.standardTimeSeconds, origStep.standardTimeSeconds);
    assert.equal(step.vaTimeSeconds, origStep.vaTimeSeconds);
    assert.equal(step.nvaTimeSeconds, origStep.nvaTimeSeconds);
  }
});

test('6.6: wyznaczanie snapshotu animacji 3D wyrobów i podzespołów w czasie symulacji', () => {
  const p = derive(parseProject(JSON.stringify(motor))).project;
  const result = simulateNetwork(p, p.balancing?.taktTimeSeconds ?? 60, 5);

  assert.ok(result.jobs.length === 5, 'Powinno być 5 zadań w partii');
  assert.ok(result.runs.length > 0, 'Powinny być przebiegi operacji');

  const firstArrival = result.jobs[0].arrival;
  const firstFinish = result.jobs[0].finish;

  // 1. Snapshot przed startem partii
  const snapBefore = computeSimulationAnimationSnapshot(p, result, firstArrival - 1);
  assert.equal(snapBefore.jobs.length, 0, 'Żadne zadanie nie powinno jeszcze pojawić się w linii');

  // 2. Snapshot w trakcie wykonywania pierwszej operacji
  const firstRun = result.runs.find(r => r.job === 1)!;
  const midOpTime = firstRun.start + 5;
  const snapMidOp = computeSimulationAnimationSnapshot(p, result, midOpTime);

  assert.ok(snapMidOp.jobs.length >= 1, 'Co najmniej 1 zadanie powinno być widoczne');
  const job1 = snapMidOp.jobs.find(j => j.jobId === 1);
  assert.ok(job1, 'Zadanie 1 powinno istnieć');
  assert.equal(job1.phase, 'processing', 'Faza zadania powinna wynosić processing');
  assert.equal(job1.carrierType, 'table', 'Produkt powinien spoczywać na stole roboczym');
  assert.ok(job1.progress > 0 && job1.progress < 1, 'Postęp operacji powinien być w przedziale (0, 1)');
  assert.ok(job1.positionMm.zMm > 500, 'Zadanie na stole powinno znajdować się na wysokości blatu');

  // 3. Snapshot po ukończeniu pierwszego zadania
  const snapAfterFirst = computeSimulationAnimationSnapshot(p, result, firstFinish + 1);
  const job1Finished = snapAfterFirst.jobs.find(j => j.jobId === 1);
  assert.ok(job1Finished, 'Ukończone zadanie 1 powinno być obecne');
  assert.equal(job1Finished.phase, 'finished', 'Faza zadania 1 po zakończeniu to finished');
  assert.equal(job1Finished.carrierType, 'pallet', 'Ukończony wyrób spoczywa na palecie wyjściowej');
  assert.equal(job1Finished.progress, 1, 'Postęp ukończonego wyrobu wynosi 1');
});

test('6.6: karta inspekcji stanu wyrobu (JobInspectionDetails)', () => {
  const p = derive(parseProject(JSON.stringify(motor))).project;
  const result = simulateNetwork(p, p.balancing?.taktTimeSeconds ?? 60, 5);

  const firstRun = result.runs.find(r => r.job === 1)!;
  const midOpTime = firstRun.start + 5;

  const details = getJobInspectionDetails(p, result, 1, midOpTime);
  assert.ok(details, 'Szczegóły inspekcji zadania 1 powinny być wyznaczone');
  assert.equal(details.jobId, 1);
  assert.equal(details.phase, 'processing');
  assert.equal(details.stepId, firstRun.stepId);
  assert.ok(details.progressPercent > 0 && details.progressPercent < 100);
  assert.ok(details.timeRemaining! > 0);
  assert.ok(Array.isArray(details.bomComponents));

  // Niezmiennik: inspekcja nieistniejącego zadania zwraca undefined
  const nonExistent = getJobInspectionDetails(p, result, 999, midOpTime);
  assert.equal(nonExistent, undefined);
});

test('6.6: niezmiennik Zasady 6 — czysta deterministyczna animacja nie modyfikuje symulacji ani procesu', () => {
  const p = derive(parseProject(JSON.stringify(motor))).project;
  const result = simulateNetwork(p, p.balancing?.taktTimeSeconds ?? 60, 5);

  const initialRunsJson = JSON.stringify(result.runs);
  const initialJobsJson = JSON.stringify(result.jobs);
  const initialStepsJson = JSON.stringify(p.processSteps);

  // Wielokrotne obliczenie snapshotu i inspekcji
  for (let t = 0; t <= 100; t += 10) {
    computeSimulationAnimationSnapshot(p, result, t);
    getJobInspectionDetails(p, result, 1, t);
  }

  // Weryfikacja nienaruszalności danych
  assert.equal(JSON.stringify(result.runs), initialRunsJson, 'Przebiegi runs nie mogą ulec zmianie');
  assert.equal(JSON.stringify(result.jobs), initialJobsJson, 'Zadania jobs nie mogą ulec zmianie');
  assert.equal(JSON.stringify(p.processSteps), initialStepsJson, 'Struktura operacji procesu nie może ulec zmianie');
});

test('6.7b: dopasowanie kamery pomija płaszczyznę manipulatora i ukryte obiekty',()=>{
  const scene=new Group(),floor=new Mesh(new BoxGeometry(100,.05,100),new MeshBasicMaterial());
  floor.position.set(50,0,50);scene.add(floor);
  const controls=new Group(),plane=new Mesh(new PlaneGeometry(100000,100000),new MeshBasicMaterial({visible:false}));
  controls.add(plane);scene.add(controls);
  const hidden=new Mesh(new BoxGeometry(200000,200000,200000),new MeshBasicMaterial());hidden.visible=false;scene.add(hidden);
  assert.ok(new Box3().setFromObject(scene).getSize(new Vector3()).x>100000,'old whole-scene bounds include interaction geometry');
  assert.equal(sceneContentBounds(scene,[controls]).getSize(new Vector3()).x,100);
  controls.visible=false;
  assert.equal(sceneContentBounds(scene,[controls]).getSize(new Vector3()).z,100);
  scene.remove(floor);
  assert.ok(sceneContentBounds(scene,[controls]).isEmpty());
  for(const mesh of [floor,plane,hidden]){mesh.geometry.dispose();(mesh.material as MeshBasicMaterial).dispose();}
});

test('6.7: tryb uproszczony 3D (simplifiedBox LOD) redukuje geometrię do lekkich brył zastępczych', () => {
  const sampleTable = {
    id: 'lo-table-lod',
    name: 'Stół montażowy LOD',
    type: 'Table' as const,
    xMm: 2000,
    yMm: 3000,
    zMm: 0,
    widthMm: 1500,
    lengthMm: 800,
    heightMm: 850,
    rotationDeg: 0,
    colorHex: '#3b82f6',
  };

  // 1. Grupa ze standardowym, szczegółowym modelem parametrycznym
  const detailedGroup = createParametricEquipmentGroup(sampleTable, { simplifiedBox: false });
  // Model szczegółowy ma co najmniej 10 dzieci (blat, 4 nogi, stopy, ramy)
  assert.ok(detailedGroup.children.length >= 10, 'Szczegółowy model powinien mieć wiele części składowych');

  // 2. Grupa w trybie uproszczonym (simplifiedBox = true)
  const simplifiedGroup = createParametricEquipmentGroup(sampleTable, { simplifiedBox: true });
  assert.ok(simplifiedGroup instanceof THREE.Group);
  // Tryb uproszczony składa się wyłącznie z 1 lekkiej bryły Mesh i 1 obwiedni krawędzi LineSegments
  assert.equal(simplifiedGroup.children.length, 2, 'Tryb uproszczony LOD powinien zawierać dokładnie 2 elementy (Mesh + krawędzie)');
  const meshChild = simplifiedGroup.children.find(c => c instanceof THREE.Mesh) as THREE.Mesh;
  assert.ok(meshChild, 'Tryb uproszczony musi zawierać Mesh bryły');
  assert.ok(meshChild.geometry instanceof THREE.BoxGeometry, 'Geometria w trybie uproszczonym musi być prostopadłościanem BoxGeometry');

  // 3. Pozycja i wymiary w Three.js pozostają identyczne
  assert.equal(simplifiedGroup.position.x, detailedGroup.position.x);
  assert.equal(simplifiedGroup.position.y, detailedGroup.position.y);
  assert.equal(simplifiedGroup.position.z, detailedGroup.position.z);
});

test('6.7: niezmiennik trybu uproszczonego i popout window — brak wpływu na proces, bilans i symulację', () => {
  const p = derive(parseProject(JSON.stringify(motor))).project;
  const initialSteps = JSON.stringify(p.processSteps);
  const initialBalancing = JSON.stringify(p.balancing);

  // Wywołanie renderowania uproszczonego dla wszystkich obiektów
  for (const obj of p.layoutObjects) {
    createParametricEquipmentGroup(obj, { simplifiedBox: true });
  }

  // Weryfikacja nienaruszalności danych procesu
  assert.equal(JSON.stringify(p.processSteps), initialSteps, 'Proces nie może ulec modyfikacji');
  assert.equal(JSON.stringify(p.balancing), initialBalancing, 'Bilans nie może ulec modyfikacji');
});

test('7.3a: walidacja macierzy przezbrojeń — odrzucanie duplikatów, błędnych czasów i nieznanych referencji', () => {
  const validMatrix: ChangeoverMatrix = {
    variants: [
      { id: 'var-a', name: 'Wariant A (Standard)', code: 'SKU-001', color: '#3b82f6' },
      { id: 'var-b', name: 'Wariant B (Eco)', code: 'SKU-002', color: '#10b981' }
    ],
    defaultVariantId: 'var-a',
    transitions: [
      {
        id: 't-a-b',
        fromVariantId: 'var-a',
        toVariantId: 'var-b',
        durationSeconds: 180,
        durationBasis: 'measured',
        requiredWorkers: 2,
        cleanoutRequired: true,
        description: 'Wymiana osprzętu stołu i przezbrojenie gniazda'
      }
    ],
    defaultDurationSeconds: 60,
    defaultDurationBasis: 'assumed'
  };

  const parsed = validateChangeoverMatrix(validMatrix, new Set(['ST1', 'ST2']));
  assert.equal(parsed.variants.length, 2);
  assert.equal(parsed.defaultVariantId, 'var-a');
  assert.equal(parsed.transitions[0].durationSeconds, 180);
  assert.equal(parsed.transitions[0].requiredWorkers, 2);
  assert.equal(parsed.transitions[0].cleanoutRequired, true);

  // Błędny format / nieznany wariant
  assert.throws(() => validateChangeoverMatrix({
    variants: [{ id: 'var-a', name: 'A' }],
    transitions: [{ id: 't1', fromVariantId: 'var-x', toVariantId: 'var-a', durationSeconds: 60, durationBasis: 'assumed' }]
  }), /nieznany wariant źródłowy 'var-x'/);

  // Duplikat ID wariantu
  assert.throws(() => validateChangeoverMatrix({
    variants: [{ id: 'var-a', name: 'A' }, { id: 'var-a', name: 'A copy' }],
    transitions: []
  }), /powtórzone ID/);

  // Ujemny czas przezbrojenia
  assert.throws(() => validateChangeoverMatrix({
    variants: [{ id: 'var-a', name: 'A' }],
    transitions: [{ id: 't1', fromVariantId: 'var-a', toVariantId: '*', durationSeconds: -10, durationBasis: 'assumed' }]
  }), /durationSeconds musi być liczbą nieujemną/);

  // Niepoprawny durationBasis
  assert.throws(() => validateChangeoverMatrix({
    variants: [{ id: 'var-a', name: 'A' }],
    transitions: [{ id: 't1', fromVariantId: 'var-a', toVariantId: '*', durationSeconds: 50, durationBasis: 'estimated' as any }]
  }), /durationBasis musi być 'measured' lub 'assumed'/);

  // Nieznane stanowisko
  assert.throws(() => validateChangeoverMatrix({
    variants: [{ id: 'var-a', name: 'A' }],
    transitions: [{ id: 't1', fromVariantId: '*', toVariantId: '*', stationId: 'UNKNOWN_ST', durationSeconds: 60, durationBasis: 'assumed' }]
  }, new Set(['ST1'])), /nieznane stanowisko 'UNKNOWN_ST'/);
});

test('7.3a: walidacja zleceń produkcyjnych — unikalne batchId, poprawne ilości i warianty', () => {
  const matrix: ChangeoverMatrix = {
    variants: [
      { id: 'v1', name: 'Wariant 1' },
      { id: 'v2', name: 'Wariant 2' }
    ],
    transitions: []
  };

  const validBatches: ProductionOrderBatch[] = [
    { batchId: 'B1', variantId: 'v1', quantity: 10, priority: 1, notes: 'Pierwsza partia' },
    { batchId: 'B2', variantId: 'v2', quantity: 5, priority: 2 }
  ];

  const parsed = validateProductionOrders(validBatches, matrix);
  assert.equal(parsed.length, 2);
  assert.equal(parsed[0].quantity, 10);

  // Nieznany wariant
  assert.throws(() => validateProductionOrders([
    { batchId: 'B1', variantId: 'v_unknown', quantity: 5 }
  ], matrix), /nieznany wariant 'v_unknown'/);

  // Niepoprawna ilość (< 1 lub niecałkowita)
  assert.throws(() => validateProductionOrders([
    { batchId: 'B1', variantId: 'v1', quantity: 0 }
  ], matrix), /quantity musi być dodatnią liczbą całkowitą/);

  // Powtórzone batchId
  assert.throws(() => validateProductionOrders([
    { batchId: 'B1', variantId: 'v1', quantity: 5 },
    { batchId: 'B1', variantId: 'v2', quantity: 10 }
  ], matrix), /powtórzone batchId/);
});

test('7.3a: resolveChangeover — hierarchia priorytetów i deterministyczne reguły przejść', () => {
  const matrix: ChangeoverMatrix = {
    variants: [
      { id: 'A', name: 'Produkt A' },
      { id: 'B', name: 'Produkt B' },
      { id: 'C', name: 'Produkt C' }
    ],
    transitions: [
      // 1. Dedykowana reguła dla stacji ST_PRESS: A -> B = 300s (measured, 2 osoby)
      { id: 't_press_ab', fromVariantId: 'A', toVariantId: 'B', stationId: 'ST_PRESS', durationSeconds: 300, durationBasis: 'measured', requiredWorkers: 2, cleanoutRequired: true },
      // 2. Dedykowana reguła wildcard dla stacji ST_PRESS: * -> C = 200s (assumed)
      { id: 't_press_any_c', fromVariantId: '*', toVariantId: 'C', stationId: 'ST_PRESS', durationSeconds: 200, durationBasis: 'assumed' },
      // 3. Ogólna reguła liniowa: A -> B = 120s (assumed)
      { id: 't_line_ab', fromVariantId: 'A', toVariantId: 'B', durationSeconds: 120, durationBasis: 'assumed' },
      // 4. Ogólna reguła liniowa wildcard: * -> C = 90s (assumed)
      { id: 't_line_any_c', fromVariantId: '*', toVariantId: 'C', durationSeconds: 90, durationBasis: 'assumed' }
    ],
    defaultDurationSeconds: 45,
    defaultDurationBasis: 'assumed'
  };

  // Ten sam wariant: zero sekund przezbrojenia
  const same = resolveChangeover(matrix, 'A', 'A', 'ST_PRESS');
  assert.equal(same.durationSeconds, 0);

  // Dedykowana stacja i dokładne dopasowanie A -> B na ST_PRESS: 300s
  const pressAB = resolveChangeover(matrix, 'A', 'B', 'ST_PRESS');
  assert.equal(pressAB.durationSeconds, 300);
  assert.equal(pressAB.durationBasis, 'measured');
  assert.equal(pressAB.requiredWorkers, 2);
  assert.equal(pressAB.cleanoutRequired, true);

  // Inna stacja A -> B (brak dedykowanej stacji, przejście do ogólnej liniowej): 120s
  const otherAB = resolveChangeover(matrix, 'A', 'B', 'ST_ASSEMBLY');
  assert.equal(otherAB.durationSeconds, 120);

  // Dedykowana stacja ST_PRESS i wildcard B -> C: 200s
  const pressBC = resolveChangeover(matrix, 'B', 'C', 'ST_PRESS');
  assert.equal(pressBC.durationSeconds, 200);

  // Inna stacja B -> C (ogólna liniowa wildcard * -> C): 90s
  const otherBC = resolveChangeover(matrix, 'B', 'C', 'ST_ASSEMBLY');
  assert.equal(otherBC.durationSeconds, 90);

  // Brak dopasowania reguł (np. C -> A): fallback do defaultDurationSeconds 45s
  const fallbackCA = resolveChangeover(matrix, 'C', 'A', 'ST_ASSEMBLY');
  assert.equal(fallbackCA.durationSeconds, 45);
});

test('7.3a: calculateSequenceChangeovers i strategie szeregowania partii orderBatches', () => {
  const matrix: ChangeoverMatrix = {
    variants: [
      { id: 'A', name: 'A' },
      { id: 'B', name: 'B' },
      { id: 'C', name: 'C' }
    ],
    transitions: [
      // A -> B: 100s, B -> A: 200s, B -> C: 50s, C -> A: 50s
      { id: 'ab', fromVariantId: 'A', toVariantId: 'B', durationSeconds: 100, durationBasis: 'assumed' },
      { id: 'ba', fromVariantId: 'B', toVariantId: 'A', durationSeconds: 200, durationBasis: 'assumed' },
      { id: 'bc', fromVariantId: 'B', toVariantId: 'C', durationSeconds: 50, durationBasis: 'assumed' },
      { id: 'ca', fromVariantId: 'C', toVariantId: 'A', durationSeconds: 50, durationBasis: 'assumed' }
    ],
    defaultDurationSeconds: 150
  };

  const orders: ProductionOrderBatch[] = [
    { batchId: 'O1', variantId: 'A', quantity: 10 },
    { batchId: 'O2', variantId: 'B', quantity: 5 },
    { batchId: 'O3', variantId: 'A', quantity: 8 },
    { batchId: 'O4', variantId: 'B', quantity: 6 }
  ];

  // 1. Obliczenie czasu w sekwencji deklarowanej:
  // O1(A) -> O2(B) = 100s
  // O2(B) -> O3(A) = 200s
  // O3(A) -> O4(B) = 100s
  // Suma = 400s
  const calcDeclared = calculateSequenceChangeovers(orders, matrix, ['ST1']);
  assert.equal(calcDeclared.totalChangeoverSeconds, 400);
  assert.equal(calcDeclared.transitionCount, 3);
  assert.equal(calcDeclared.transitionsList.length, 3);

  // 2. Optymalizacja greedy nearest neighbor (grupowanie partii o tym samym wariancie)
  const optimizedGreedy = orderBatches(orders, matrix, 'minimize-changeover-greedy', ['ST1']);
  // Powinno pogrupować A z A i B z B
  const calcGreedy = calculateSequenceChangeovers(optimizedGreedy, matrix, ['ST1']);
  // Tylko jedno przejście A -> B = 100s
  assert.equal(calcGreedy.totalChangeoverSeconds, 100);
  assert.equal(calcGreedy.transitionCount, 1);

  // 3. Poziomowanie Heijunka (przeplatanie wariantów)
  const heijunka = orderBatches(orders, matrix, 'heijunka-leveling');
  assert.equal(heijunka.length, 4);
  assert.equal(heijunka[0].variantId, 'A');
  assert.equal(heijunka[1].variantId, 'B');
  assert.equal(heijunka[2].variantId, 'A');
  assert.equal(heijunka[3].variantId, 'B');
});

test('7.3a: integracja ze schematem DomainProjectV6 — zapis, odczyt i kompatybilność wsteczna', () => {
  const migrated = prepareDomainMigration(previewDomainMigrationFromV4(JSON.stringify(motor))).project;
  const baseProject = {
    ...migrated,
    product: { id: 'PROD_1', name: 'Wyrób podstawowy' },
    changeoverMatrix: {
      variants: [
        { id: 'VAR_STD', name: 'Wariant Standard', code: 'STD' },
        { id: 'VAR_PRO', name: 'Wariant Pro', code: 'PRO' }
      ],
      defaultVariantId: 'VAR_STD',
      transitions: [
        {
          id: 'T1',
          fromVariantId: 'VAR_STD',
          toVariantId: 'VAR_PRO',
          durationSeconds: 150,
          durationBasis: 'measured' as const
        }
      ],
      defaultDurationSeconds: 60,
      defaultDurationBasis: 'assumed' as const
    },
    productionOrders: [
      { batchId: 'B_001', variantId: 'VAR_STD', quantity: 20 },
      { batchId: 'B_002', variantId: 'VAR_PRO', quantity: 15 }
    ]
  };

  const parsed = parseDomainProjectV6(JSON.stringify(baseProject));
  assert.ok(parsed.changeoverMatrix);
  assert.equal(parsed.changeoverMatrix.variants.length, 2);
  assert.equal(parsed.changeoverMatrix.transitions[0].durationSeconds, 150);
  assert.ok(parsed.productionOrders);
  assert.equal(parsed.productionOrders.length, 2);

  // Kompatybilność wsteczna: projekt bez changeoverMatrix i productionOrders
  const legacyProject = structuredClone(baseProject);
  delete (legacyProject as any).changeoverMatrix;
  delete (legacyProject as any).productionOrders;

  const parsedLegacy = parseDomainProjectV6(JSON.stringify(legacyProject));
  assert.equal(parsedLegacy.changeoverMatrix, undefined);
  assert.equal(parsedLegacy.productionOrders, undefined);
  assert.equal(parsedLegacy.name, migrated.name);
});

test('7.4: DeterministicRNG — powtarzalność ziarna, rozkłady i rozbieżność dla różnych ziaren', () => {
  const { DeterministicRNG, sampleDuration } = require('../src/core/stochasticSimulation');

  // 1. Ten sam seed daje 100% identyczną sekwencję losowań (Zasada 5 i Plan 7.4)
  const rng1 = new DeterministicRNG(12345);
  const rng2 = new DeterministicRNG(12345);
  const seq1 = Array.from({length: 20}, () => rng1.next());
  const seq2 = Array.from({length: 20}, () => rng2.next());
  assert.deepEqual(seq1, seq2, 'Ten sam seed musi generować identyczne liczby');

  // 2. Inny seed daje inną sekwencję
  const rng3 = new DeterministicRNG(54321);
  const seq3 = Array.from({length: 20}, () => rng3.next());
  assert.notDeepEqual(seq1, seq3, 'Różne seedy muszą dawać różne sekwencje');

  // 3. Rozkład normalny — średnia zbliżona do zadanej
  const rngNorm = new DeterministicRNG(42);
  const normalSamples = Array.from({length: 1000}, () => rngNorm.normal(100, 10));
  const meanNorm = normalSamples.reduce((a, b) => a + b, 0) / normalSamples.length;
  assert.ok(Math.abs(meanNorm - 100) < 1.5, `Średnia z rozkładu normalnego (${meanNorm}) powinna być bliska 100`);

  // 4. Rozkład trójkątny — wartości w granicach [min, max]
  const rngTri = new DeterministicRNG(42);
  const triSamples = Array.from({length: 500}, () => rngTri.triangular(50, 80, 120));
  assert.ok(triSamples.every(v => v >= 50 && v <= 120), 'Próbki trójkątne muszą mieścić się w [min, max]');

  // 5. Rozkład jednostajny — wartości w granicach [min, max]
  const rngUni = new DeterministicRNG(42);
  const uniSamples = Array.from({length: 500}, () => rngUni.uniform(10, 20));
  assert.ok(uniSamples.every(v => v >= 10 && v <= 20), 'Próbki jednostajne muszą mieścić się w [min, max]');

  // 6. sampleDuration zachowuje baseSeconds dla constant
  const constSample = sampleDuration(60, {distribution: 'constant'}, new DeterministicRNG(42));
  assert.equal(constSample, 60);

  // 7. sampleDuration z rozkładem trójkątnym
  const triSample = sampleDuration(100, {distribution: 'triangular', minMultiplier: 0.9, modeMultiplier: 1.0, maxMultiplier: 1.1}, new DeterministicRNG(42));
  assert.ok(triSample >= 90 && triSample <= 110, `Sample (${triSample}) powinien mieścić się w granicach [90, 110]`);
});

test('7.4: statystyki kwantylowe i raport podsumowania stochastycznego', () => {
  const { computePercentileStats, buildStochasticSummary } = require('../src/core/stochasticSimulation');

  // 1. computePercentileStats
  const values = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
  const stats = computePercentileStats(values);
  assert.equal(stats.min, 10);
  assert.equal(stats.max, 100);
  assert.equal(stats.mean, 55);
  assert.equal(stats.median, 55);
  assert.ok(stats.p10 <= stats.median && stats.median <= stats.p90);

  // 2. buildStochasticSummary
  const mockIterations = [
    { iterationIndex: 1, seed: 100, makespanSeconds: 200, throughputPerHour: 18, bottleneckStationId: 'ST-A', totalBreakdownSeconds: 0, totalWaitSeconds: 10 },
    { iterationIndex: 2, seed: 101, makespanSeconds: 250, throughputPerHour: 14.4, bottleneckStationId: 'ST-A', totalBreakdownSeconds: 20, totalWaitSeconds: 30 },
    { iterationIndex: 3, seed: 102, makespanSeconds: 220, throughputPerHour: 16.36, bottleneckStationId: 'ST-B', totalBreakdownSeconds: 0, totalWaitSeconds: 15 },
  ];
  const summary = buildStochasticSummary(mockIterations, 42);
  assert.equal(summary.iterationsCount, 3);
  assert.equal(summary.seed, 42);
  assert.equal(summary.bottleneckFrequency.length, 2);
  assert.equal(summary.bottleneckFrequency[0].stationId, 'ST-A');
  assert.equal(summary.bottleneckFrequency[0].count, 2);
  assert.equal(summary.bottleneckFrequency[0].percentage, 66.7);
  assert.equal(summary.bottleneckFrequency[1].stationId, 'ST-B');
  assert.equal(summary.bottleneckFrequency[1].count, 1);
  assert.equal(summary.bottleneckFrequency[1].percentage, 33.3);
});

test('7.4: walidacja i integracja konfiguracji stochastycznej w DomainProjectV6', () => {
  const { validateStochasticConfig } = require('../src/core/stochasticSimulation');
  const stationIds = new Set(['ST-1', 'ST-2']);
  const operationIds = new Set(['OP-1', 'OP-2']);

  // Poprawna konfiguracja
  const validConfig = {
    enabled: true,
    seed: 42,
    iterations: 20,
    defaultOperationVariability: {
      distribution: 'triangular',
      minMultiplier: 0.85,
      modeMultiplier: 1.0,
      maxMultiplier: 1.2
    },
    operationVariability: [
      {
        operationId: 'OP-1',
        config: {
          distribution: 'normal',
          relativeStdDev: 0.1
        }
      }
    ],
    breakdowns: [
      {
        stationId: 'ST-1',
        mtbfSeconds: 3600,
        mttrSeconds: 300,
        repairDistribution: 'exponential'
      }
    ]
  };

  const validated = validateStochasticConfig(validConfig, stationIds, operationIds);
  assert.equal(validated.enabled, true);
  assert.equal(validated.seed, 42);
  assert.equal(validated.iterations, 20);
  assert.equal(validated.operationVariability?.length, 1);
  assert.equal(validated.breakdowns?.length, 1);

  // Odrzucenie nieznanego stanowiska w awariach
  assert.throws(() => {
    validateStochasticConfig({
      ...validConfig,
      breakdowns: [{ stationId: 'ST-UNKNOWN', mtbfSeconds: 1000, mttrSeconds: 100, repairDistribution: 'exponential' }]
    }, stationIds, operationIds);
  }, /nieznane stanowisko 'ST-UNKNOWN'/);

  // Odrzucenie nieznanej operacji w zmienności
  assert.throws(() => {
    validateStochasticConfig({
      ...validConfig,
      operationVariability: [{ operationId: 'OP-UNKNOWN', config: { distribution: 'normal' } }]
    }, stationIds, operationIds);
  }, /nieznana operacja 'OP-UNKNOWN'/);

  // Zapis i odczyt projektu V6 z konfiguracją stochastyczną
  const migrated = prepareDomainMigration(previewDomainMigrationFromV4(JSON.stringify(motor))).project;
  const motorStationId = migrated.stations[0].id;
  const motorOpId = migrated.operations[0].id;
  const motorStochasticConfig = {
    ...validConfig,
    operationVariability: [
      {
        operationId: motorOpId,
        config: {
          distribution: 'normal' as const,
          relativeStdDev: 0.1
        }
      }
    ],
    breakdowns: [
      {
        stationId: motorStationId,
        mtbfSeconds: 3600,
        mttrSeconds: 300,
        repairDistribution: 'exponential' as const
      }
    ]
  };
  const projectWithStochastic = {
    ...migrated,
    stochasticConfig: motorStochasticConfig
  };
  const parsed = parseDomainProjectV6(JSON.stringify(projectWithStochastic));
  assert.ok(parsed.stochasticConfig);
  assert.equal(parsed.stochasticConfig.enabled, true);
  assert.equal(parsed.stochasticConfig.seed, 42);
  assert.equal(parsed.stochasticConfig.operationVariability?.[0].operationId, motorOpId);
});

test('7.5: dekompozycja strat OEE, wykrywanie ryzyka podwójnego naliczenia strat i skorygowany Takt Time', () => {
  const { analyzeExplicitProjectLosses, decomposeOee } = require('../src/core/oeeLossDecomposition');

  const demand = {
    yearlyDemand: 100000,
    workingDaysPerYear: 250,
    shiftsPerDay: 2,
    hoursPerShift: 8,
    plannedBreaksMinutesPerShift: 30,
    oeePercent: 80, // 20% ogólnej rezerwy OEE
  };

  // 1. Projekt bazowy bez awarii i przezbrojeń
  const emptyProject = {
    stations: [{ id: 'ST-1', name: 'Stanowisko 1', operationIds: ['OP-1'] }],
    operations: [{ id: 'OP-1', name: 'Operacja 1', standardTimeSeconds: 60 }],
  };

  const emptyLosses = analyzeExplicitProjectLosses(emptyProject as any, demand);
  assert.equal(emptyLosses.availability.breakdownPercent, 0);
  assert.equal(emptyLosses.availability.changeoverPercent, 0);
  // Przerwy z demand (30 min / 8h = 6.25% ~ 6.3%)
  assert.ok(emptyLosses.availability.calendarBreaksPercent > 5);

  const resEmpty = decomposeOee(demand, emptyLosses);
  assert.equal(resEmpty.lumpedOeePercent, 80);
  assert.ok(resEmpty.residualOeePercent > 80);

  // 2. Projekt ze szczegółowymi awariami MTBF/MTTR i przezbrojeniami
  const projectWithLosses = {
    stations: [{ id: 'ST-1', name: 'Gniazdo zrobotyzowane', operationIds: ['OP-1'] }],
    operations: [{ id: 'OP-1', name: 'Operacja 1', standardTimeSeconds: 60 }],
    stochasticConfig: {
      enabled: true,
      seed: 42,
      iterations: 20,
      breakdowns: [
        {
          stationId: 'ST-1',
          mtbfSeconds: 900,
          mttrSeconds: 100, // 100 / 1000 = 10% czasu to awarie!
          repairDistribution: 'exponential' as const,
        }
      ]
    },
    changeoverMatrix: {
      variants: [{ id: 'V1', name: 'Wariant 1' }, { id: 'V2', name: 'Wariant 2' }],
      defaultDurationSeconds: 1200, // 20 minut przezbrojenia
      defaultDurationBasis: 'assumed' as const,
    },
    productionOrders: [
      { batchId: 'B1', variantId: 'V1', quantity: 100, priority: 1 },
      { batchId: 'B2', variantId: 'V2', quantity: 100, priority: 2 },
    ]
  };

  const explicitLosses = analyzeExplicitProjectLosses(projectWithLosses as any, demand);
  assert.ok(explicitLosses.availability.breakdownPercent >= 9.0, 'Oczekiwano ok. 10% udziału awarii');
  assert.ok(explicitLosses.availability.changeoverPercent > 0, 'Oczekiwano dodatniego udziału przezbrojeń');
  assert.ok(explicitLosses.totalExplicitLossPercent >= 15.0, 'Łączne modelowane straty powinny wynosić >= 15%');

  // 3. Dekompozycja i ryzyko double-counting
  const res = decomposeOee(demand, explicitLosses);
  assert.equal(res.doubleCountingRisk, 'high', 'Oczekiwano wysokiego ryzyka podwójnego naliczenia strat');
  assert.ok(res.explanation.includes('Wykryto wysokie ryzyko podwójnego naliczenia strat'));
  assert.ok(res.recommendation.includes('Zalecenie Lean'));

  // 4. Porównanie Taksu
  // Nominalny takt z pełnym ryczałtem OEE 80% jest silnie obniżony
  assert.ok(res.taktComparison.nominalTaktSeconds < res.taktComparison.customerTaktSeconds);
  // Skorygowany takt (który nie dubluje jawnie symulowanych awarii) jest wyższy
  assert.ok(res.taktComparison.adjustedTaktSeconds > res.taktComparison.nominalTaktSeconds);
  assert.ok(res.taktComparison.deltaSeconds > 0);
});

test('7.6: tworzenie, walidacja integralności SHA-256 i odzyskiwanie pełnej kopii środowiska (Disaster Recovery)', () => {
  const {
    sha256Hex,
    createWorkspaceBackup,
    validateWorkspaceBackup,
    restoreWorkspaceBackup,
    inspectWorkspaceStorage,
    STORAGE_KEYS,
  } = require('../src/core/workspaceBackup');

  // 1. Sprawdzenie determinizmu SHA-256
  const emptyHash = sha256Hex('');
  assert.equal(emptyHash, 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');
  const testHash = sha256Hex('Layout Studio Pro 3D');
  assert.ok(testHash && testHash.length === 64);

  // 2. Symulacja pamięci lokalnej (StoragePort)
  const memoryStore: Record<string, string> = {
    [STORAGE_KEYS.v4Project]: JSON.stringify({
      project: {
        id: 'PRJ-V4',
        name: 'Linia Testowa V4',
        schemaVersion: 4,
        timeUnit: 's',
        targetLayoutType: 'Linear',
        demand: { yearlyDemand: 50000, workingDaysPerYear: 250, shiftsPerDay: 2, hoursPerShift: 8, plannedBreaksMinutesPerShift: 30, oeePercent: 85 },
        processSteps: [{ id: 'OP-1', name: 'Montaż', standardTimeSeconds: 45, vaTimeSeconds: 40, nvaTimeSeconds: 5, predecessorIds: [], sequenceNumber: 1 }],
        bom: [],
        layoutObjects: [],
        workstations: [],
        facility: { widthMm: 20000, lengthMm: 30000, heightMm: 6000, isConfirmed: true, gridSizeMm: 1000 },
      }
    }),
    [STORAGE_KEYS.v4Scenarios]: JSON.stringify([
      { id: 'SC-1', name: 'Wariant 1', at: '2026-10-18T10:00:00.000Z', project: {...structuredClone(motor),schemaVersion:4} }
    ])
  };

  const storagePort = {
    getItem: (key: string) => memoryStore[key] ?? null,
    setItem: (key: string, value: string) => { memoryStore[key] = value; },
    removeItem: (key: string) => { delete memoryStore[key]; },
  };

  // 3. Inspekcja stanu storage
  const summary = inspectWorkspaceStorage(storagePort);
  assert.equal(summary.hasActiveProjectV4, true, 'summary.hasActiveProjectV4');
  assert.equal(summary.activeProjectV4Name, 'Linia Testowa V4', 'summary.activeProjectV4Name');
  assert.equal(summary.scenariosV4Count, 1, 'summary.scenariosV4Count');
  assert.equal(summary.hasStationsProjectV5, false, 'summary.hasStationsProjectV5');

  // 4. Utworzenie pełnej kopii zapasowej
  const backup = createWorkspaceBackup(storagePort, '0.4.0');
  assert.equal(backup.format, 'layout-studio-workspace-backup', 'backup.format');
  assert.equal(backup.formatVersion, 1, 'backup.formatVersion');
  assert.equal(backup.appVersion, '0.4.0', 'backup.appVersion');
  assert.ok(backup.checksumSha256.length === 64, 'backup.checksumSha256 length 64');

  const backupJson = JSON.stringify(backup, null, 2);

  // 5. Walidacja poprawnej kopii
  const valResult = validateWorkspaceBackup(backupJson);
  assert.equal(valResult.valid, true, 'valResult.valid should be true: ' + valResult.error);
  assert.equal(valResult.checksumMatches, true, 'valResult.checksumMatches should be true');
  assert.equal(valResult.validatedProjectsCount, 1, 'valResult.validatedProjectsCount should be 1');

  // 6. Walidacja kopii ze sfałszowaną sumą kontrolną
  const tamperedJson = backupJson.replace(backup.checksumSha256, '0000000000000000000000000000000000000000000000000000000000000000');
  const tamperedResult = validateWorkspaceBackup(tamperedJson);
  assert.equal(tamperedResult.checksumMatches, false, 'tamperedResult.checksumMatches should be false');

  // 7. Walidacja kopii z uszkodzonym projektem
  const brokenProjectBackup = JSON.parse(backupJson);
  brokenProjectBackup.storage.v4ProjectRaw = JSON.stringify({ project: { id: 'BAD', schemaVersion: 999 } });
  brokenProjectBackup.checksumSha256 = sha256Hex(JSON.stringify(brokenProjectBackup.storage));
  const brokenResult = validateWorkspaceBackup(JSON.stringify(brokenProjectBackup));
  assert.equal(brokenResult.valid, false, 'brokenResult.valid should be false');
  assert.ok(brokenResult.error?.includes('Uszkodzony projekt v4'), 'brokenResult.error should mention uszkodzony projekt');

  // 8. Test procedury odzyskiwania (Disaster Recovery & Rollback)
  const targetMemory: Record<string, string> = {
    [STORAGE_KEYS.v4Project]: JSON.stringify({ project: { name: 'Dotychczasowy Projekt Do Zastąpienia', schemaVersion: 4 } })
  };
  const targetPort = {
    getItem: (key: string) => targetMemory[key] ?? null,
    setItem: (key: string, value: string) => { targetMemory[key] = value; },
    removeItem: (key: string) => { delete targetMemory[key]; },
  };

  const restoreResult = restoreWorkspaceBackup(targetPort, valResult.payload!);
  assert.equal(restoreResult.success, true, 'restoreResult.success should be true');
  assert.ok(restoreResult.restoredKeys.includes(STORAGE_KEYS.v4Project), 'restoredKeys has v4Project');
  assert.ok(restoreResult.restoredKeys.includes(STORAGE_KEYS.v4Scenarios), 'restoredKeys has v4Scenarios');

  // Sprawdzenie, czy utworzono rollback snapshot dotychczasowego stanu
  const rollbackObj = JSON.parse(restoreResult.rollbackSnapshot);
  assert.ok(rollbackObj.storage.v4ProjectRaw.includes('Dotychczasowy Projekt Do Zastąpienia'), 'rollback snapshot has old project');

  // Sprawdzenie, czy nowy stan w targetPort to stan z kopii
  assert.ok(targetMemory[STORAGE_KEYS.v4Project].includes('Linia Testowa V4'), 'target has new project');
});

test('7.7: weryfikacja licencji zależności produkcyjnych, modeli 3D i niezmienników bezpieczeństwa', () => {
  // 1. Zależności produkcyjne czasu wykonania (Runtime dependencies)
  // Wszystkie biblioteki ładowane do przeglądarki klienta muszą posiadać licencje permisywne (MIT / Apache-2.0 / ISC)
  const ALLOWED_RUNTIME_LICENSES = ['MIT', 'Apache-2.0', 'ISC', '0BSD', 'BSD-2-Clause', 'BSD-3-Clause'];

  // Odczyt package.json i sprawdzenie deklaracji zależności
  const pkgJsonPath = resolve('./package.json');
  const pkgData = JSON.parse(readFileSync(pkgJsonPath, 'utf8'));
  const prodDeps = Object.keys(pkgData.dependencies || {});

  assert.ok(prodDeps.includes('three'), 'three is in prod dependencies');
  assert.ok(prodDeps.includes('react'), 'react is in prod dependencies');
  assert.ok(prodDeps.includes('react-dom'), 'react-dom is in prod dependencies');
  assert.ok(prodDeps.includes('lucide-react'), 'lucide-react is in prod dependencies');
  assert.ok(prodDeps.includes('xlsx'), 'xlsx is in prod dependencies');

  // Sprawdzenie licencji zainstalowanych pakietów produkcyjnych
  for (const depName of prodDeps) {
    const depPkgPath = resolve('./node_modules', depName, 'package.json');
    if (existsSync(depPkgPath)) {
      const depPkg = JSON.parse(readFileSync(depPkgPath, 'utf8'));
      const lic = depPkg.license || (depPkg.licenses && depPkg.licenses[0]?.type) || 'UNKNOWN';
      const isAllowed = ALLOWED_RUNTIME_LICENSES.some(allowed => typeof lic === 'string' && lic.includes(allowed));
      assert.ok(isAllowed, `Pakiet produkcyjny ${depName} musi mieć dozwoloną licencję komercyjną. Wykryto: ${lic}`);
    }
  }

  // 2. Weryfikacja metadanych i licencji modeli wyposażenia przemysłowego (Plan 6.1)
  const specKeys = Object.keys(DEFAULT_EQUIPMENT_SPECS);
  assert.ok(specKeys.length >= 15, `Oczekiwano co najmniej 15 specyfikacji wyposażenia, znaleziono: ${specKeys.length}`);

  for (const key of specKeys) {
    const spec = (DEFAULT_EQUIPMENT_SPECS as Record<string, any>)[key];
    assert.equal(spec.metadata.license, 'MIT', `Specyfikacja ${key} musi posiadać licencję MIT`);
    assert.equal(spec.metadata.isCertifiedTechnologicalCapacity, false, `Specyfikacja ${key} nie może symulować certyfikatu BHP bez podstawy`);
    assert.ok(spec.metadata.polygonCountLimit > 0, `Specyfikacja ${key} musi mieć określony budżet wielokątów`);
  }

  // 3. Weryfikacja modeli konceptów wizualnych (Plan 6.4)
  for (const model of EQUIPMENT_VISUAL_MODELS) {
    const assetPath = resolve('./src/core/equipment/visualAssets', `${model.id}.json`);
    assert.ok(existsSync(assetPath), `Asset konceptu ${model.id} musi istnieć w visualAssets`);
    const assetJson = JSON.parse(readFileSync(assetPath, 'utf8'));
    assert.ok(assetJson.object, `Asset ${model.id} musi być poprawną sceną Three.js ObjectLoader`);
  }
});

test('7.10a: zdolność nominalna wynika z cyklu, uwzględnia kopie i jawny czas zespołu, nie popyt ani ponowne OEE',()=>{
  const {project}=derive({...structuredClone(motor),algorithm:'RPW'});
  const b=project.balancing!;
  assert.equal(nominalReportCapacity(b),3600/127);
  assert.notEqual(nominalReportCapacity(b),calculateTaktTime(project.demand).requiredPartsPerHour);
  const changedDemand=calculateTaktTime({...project.demand,yearlyDemand:project.demand.yearlyDemand*2,oeePercent:50});
  assert.notEqual(changedDemand.requiredPartsPerHour,calculateTaktTime(project.demand).requiredPartsPerHour);
  assert.equal(nominalReportCapacity(b),3600/127);
  const station={...b.workstations[0],cycleTimeSeconds:120,parallelStations:2,effectiveCycleSeconds:60};
  assert.equal(nominalReportCapacity({...b,workstations:[station]}),60);
  assert.equal(nominalReportCapacity({...b,workstations:[{...station,operators:3}]}),60,'worker count alone must not shorten time');
  assert.equal(nominalReportCapacity({...b,workstations:[{...station,cycleTimeSeconds:90,effectiveCycleSeconds:45}]}),80);
  assert.equal(nominalReportCapacity(undefined),null);
  assert.equal(nominalReportCapacity({...b,workstations:[]}),null);
  for(const value of [0,-1,NaN,Infinity])assert.equal(nominalReportCapacity({...b,workstations:[{...station,effectiveCycleSeconds:value}]}),null);
  assert.equal(nominalReportCapacity({...b,workstations:[station,{...station,assignedStepIds:[],effectiveCycleSeconds:0}]}),60);
});

test('7.10: weryfikacja spójności danych raportu inżynierskiego PDF dla krótkiego i długiego projektu', () => {
  // 1. Krótki projekt: Motor EV
  const { project: motorProj, issues: motorIssues } = derive(motor);
  const motorTakt = calculateTaktTime(motorProj.demand);
  assert.ok(motorTakt.taktTimeSeconds > 0, 'motor taktTimeSeconds > 0');
  assert.equal(motorProj.processSteps.length, 6, 'motor has 6 process steps');
  assert.equal(motorProj.bom.length, 5, 'motor has 5 bom items');
  assert.ok(motorProj.balancing, 'motor balancing exists');
  assert.equal(motorProj.balancing?.workstations.length, 2, 'motor has 2 workstations');
  const motorTotalWork = motorProj.processSteps.reduce((acc, s) => acc + s.standardTimeSeconds, 0);
  assert.equal(motorProj.balancing?.totalWorkContentSeconds, motorTotalWork, 'motor totalWorkContent matches steps sum');

  // 2. Długi projekt: Eko (z pliku fixtures/qa)
  const ekoRaw = JSON.parse(readFileSync(resolve('./tests/qa/Eko_D5c_original_v4.json'), 'utf8'));
  const { project: ekoProj, issues: ekoIssues } = derive(ekoRaw);
  const ekoTakt = calculateTaktTime(ekoProj.demand);
  assert.ok(ekoTakt.taktTimeSeconds > 0, 'eko taktTimeSeconds > 0');
  assert.equal(ekoProj.processSteps.length, 16, 'eko has 16 process steps');
  assert.equal(ekoProj.bom.length, 60, 'eko has 60 bom items');
  assert.ok(ekoProj.balancing, 'eko balancing exists');
  assert.equal(ekoProj.balancing?.workstations.length, 16, 'eko has 16 workstations');

  // Weryfikacja kosztów BOM w raporcie:
  const ekoBOMCost = ekoProj.bom.reduce((sum, b) => sum + b.unitCost * b.quantityPerUnit, 0);
  assert.ok(ekoBOMCost > 0, 'eko BOM cost > 0');

  // Sprawdzenie, czy raport inżynierski generuje poprawny tekst zawierający wszystkie stacje i brak błędów NaN
  const reportText = engineeringReport(ekoProj, ekoIssues);
  assert.ok(!reportText.includes('NaN'), 'reportText has no NaN');
  assert.ok(reportText.includes('OP10'), 'reportText has OP10');
  assert.ok(reportText.includes('OP21'), 'reportText has OP21');
});

test('7.11: odbiór uniwersalności na dwóch odmiennych procesach niezależnych od Eko (baterie EV i silniki EV)', () => {
  // 1. PROCES 1: Baterie EV — import z XLSX, walidacja, bilansowanie i eksport/import JSON
  const batProcBuf = readFileSync(resolve('./tests/fixtures/baterie_proces.xlsx'));
  const batBOMBuf = readFileSync(resolve('./tests/fixtures/baterie_bom.xlsx'));

  const batProcRes = importProcess(batProcBuf.buffer.slice(batProcBuf.byteOffset, batProcBuf.byteOffset + batProcBuf.byteLength));
  assert.equal(batProcRes.errors.length, 0, `Błędy importu procesu baterii: ${batProcRes.errors.join(', ')}`);
  assert.equal(batProcRes.items.length, 6, 'Baterie: zaimportowano 6 operacji');

  const batStepIds = new Set(batProcRes.items.map(s => s.id));
  const batBOMRes = importBOM(batBOMBuf.buffer.slice(batBOMBuf.byteOffset, batBOMBuf.byteOffset + batBOMBuf.byteLength), batStepIds);
  assert.equal(batBOMRes.errors.length, 0, `Błędy importu BOM baterii: ${batBOMRes.errors.join(', ')}`);
  assert.equal(batBOMRes.items.length, 6, 'Baterie: zaimportowano 6 pozycji BOM');

  // Tworzenie projektu baterii i weryfikacja braku założeń zakodowanych pod Eko
  const batteryProject = newProject();
  batteryProject.id = 'PROJ-BATTERY-711';
  batteryProject.name = 'Nowa Linia Produkcyjna Pakietów Baterii EV';
  batteryProject.currency = 'EUR';
  batteryProject.targetLayoutType = 'Linear';
  batteryProject.demand = {
    yearlyDemand: 40000,
    workingDaysPerYear: 250,
    shiftsPerDay: 2,
    hoursPerShift: 8,
    plannedBreaksMinutesPerShift: 30,
    oeePercent: 85
  };
  batteryProject.processSteps = batProcRes.items;
  batteryProject.bom = batBOMRes.items;

  // Baseline: one operation per station. Same demand and times for the reorganized variant.
  batteryProject.algorithm = 'Manual';
  batteryProject.processSteps=batteryProject.processSteps.map((s,i)=>({...s,assignedWorkstationId:`WS-${i+1}`}));
  const { project: batBaseDerived, issues: batBaseIssues } = derive(batteryProject);
  assert.ok(batBaseDerived.balancing, 'Baterie baza: bilansowanie wyliczone');
  assert.ok(batBaseDerived.layoutObjects.length > 0, 'Baterie baza: layout wygenerowany automatycznie');
  assert.ok(batBaseDerived.layoutObjects.every(o => o.isVisualAssumption), 'Baterie baza: obiekty oznaczone jako założenia wizualne');
  const batTakt = calculateTaktTime(batBaseDerived.demand).taktTimeSeconds;
  assert.ok(batTakt > 0, 'Baterie: takt poprawny');

  // Reorganized variant: fewer stations at the unchanged cycle target, not a throughput claim.
  const batteryImproved = structuredClone(batteryProject);
  batteryImproved.id = 'PROJ-BATTERY-711-IMP';
  batteryImproved.name = 'Przeorganizowana Linia Baterii EV (ten sam popyt)';
  batteryImproved.algorithm = 'RPW';
  const { project: batImpDerived, issues: batImpIssues } = derive(batteryImproved);
  assert.ok(batImpDerived.balancing, 'Baterie usprawnione: bilansowanie wyliczone');
  assert.deepEqual(batteryImproved.demand,batteryProject.demand);
  assert.equal(batImpDerived.balancing.taktTimeSeconds,batBaseDerived.balancing!.taktTimeSeconds);
  assert.ok(batImpDerived.balancing.workstations.length < batBaseDerived.balancing!.workstations.length);
  assert.ok(batImpDerived.balancing.workstations.every(s=>!s.isBottleneck));

  // Eksport i re-import projektu baterii w formacie JSON
  const batJson = JSON.stringify(batBaseDerived);
  const batReimported = parseProject(batJson);
  assert.equal(batReimported.id, 'PROJ-BATTERY-711');
  assert.equal(batReimported.processSteps.length, 6);
  assert.equal(batReimported.bom.length, 6);
  assert.equal(batReimported.currency, 'EUR');

  // 2. PROCES 2: Silniki elektryczne EV — import z XLSX, walidacja, bilansowanie i eksport/import JSON
  const motProcBuf = readFileSync(resolve('./tests/fixtures/silniki_proces.xlsx'));
  const motBOMBuf = readFileSync(resolve('./tests/fixtures/silniki_bom.xlsx'));

  const motProcRes = importProcess(motProcBuf.buffer.slice(motProcBuf.byteOffset, motProcBuf.byteOffset + motProcBuf.byteLength));
  assert.equal(motProcRes.errors.length, 0, `Błędy importu procesu silników: ${motProcRes.errors.join(', ')}`);
  assert.equal(motProcRes.items.length, 6, 'Silniki: zaimportowano 6 operacji');

  const motStepIds = new Set(motProcRes.items.map(s => s.id));
  const motBOMRes = importBOM(motBOMBuf.buffer.slice(motBOMBuf.byteOffset, motBOMBuf.byteOffset + motBOMBuf.byteLength), motStepIds);
  assert.equal(motBOMRes.errors.length, 0, `Błędy importu BOM silników: ${motBOMRes.errors.join(', ')}`);
  assert.equal(motBOMRes.items.length, 5, 'Silniki: zaimportowano 5 pozycji BOM');

  // Tworzenie projektu silników i weryfikacja
  const motorProject = newProject();
  motorProject.id = 'PROJ-MOTOR-711';
  motorProject.name = 'Nowa Linia Silników Trakcyjnych EV (Układ U)';
  motorProject.currency = 'USD';
  motorProject.targetLayoutType = 'UShape';
  motorProject.demand = {
    yearlyDemand: 80000,
    workingDaysPerYear: 250,
    shiftsPerDay: 2,
    hoursPerShift: 8,
    plannedBreaksMinutesPerShift: 20,
    oeePercent: 92
  };
  motorProject.processSteps = motProcRes.items;
  motorProject.bom = motBOMRes.items;

  // Wariant bazowy silników
  motorProject.algorithm = 'RPW';
  const { project: motBaseDerived, issues: motBaseIssues } = derive(motorProject);
  assert.ok(motBaseDerived.balancing, 'Silniki baza: bilansowanie wyliczone');
  assert.ok(motBaseDerived.layoutObjects.length > 0, 'Silniki baza: layout wygenerowany');

  // Eksport i re-import projektu silników w formacie JSON
  const motJson = JSON.stringify(motBaseDerived);
  const motReimported = parseProject(motJson);
  assert.equal(motReimported.id, 'PROJ-MOTOR-711');
  assert.equal(motReimported.processSteps.length, 6);
  assert.equal(motReimported.bom.length, 5);
  assert.equal(motReimported.currency, 'USD');

  // 3. Weryfikacja separacji danych: obiekty i id nie przenikają między projektami
  assert.notEqual(batReimported.id, motReimported.id);
  assert.notEqual(batReimported.currency, motReimported.currency);
  assert.ok(batReimported.processSteps.every(s => s.id.startsWith('OP-BAT')));
  assert.ok(motReimported.processSteps.every(s => s.id.startsWith('OP-MOT')));

  // 4. Jawne wskazywanie brakujących danych (np. brak wymiarów hali / isConfirmed = false)
  assert.ok(!batBaseDerived.facility.isConfirmed, 'Baterie: brak potwierdzonych wymiarów hali jest jawnie odnotowany');
  assert.ok(!motBaseDerived.facility.isConfirmed, 'Silniki: brak potwierdzonych wymiarów hali jest jawnie odnotowany');
});







function workspaceRestoreFixture() {
  const api = require('../src/core/workspaceBackup');
  const domain = require('../src/core/domainDraftStorage');
  const variants = require('../src/core/domainVariantComparison');
  const at = '2026-10-19T00:00:00.000Z';
  const source = JSON.stringify({...structuredClone(motor),schemaVersion:4});
  const v5 = prepareStationMigration(previewStationMigration(source));
  const prepared = prepareDomainMigration(previewDomainMigrationFromV4(source));
  const values: Record<string,string> = {};
  const port = {getItem:(key:string)=>values[key]??null,setItem:(key:string,value:string)=>{values[key]=value;},removeItem:(key:string)=>{delete values[key];}};
  port.setItem(api.STORAGE_KEYS.v4Project,JSON.stringify({project:JSON.parse(source),at,importSourceBase64:''}));
  port.setItem(api.STORAGE_KEYS.v4Scenarios,JSON.stringify([{id:'SC-1',name:'Baza',at,project:JSON.parse(source)}]));
  port.setItem(api.STORAGE_KEYS.v5Stations,JSON.stringify({project:v5.project,originalJson:source,importSourceBase64:'',at}));
  domain.saveDomainDraft(port,prepared,null,at);
  variants.saveDomainVariant(port,{id:'VAR-1',name:'Baza 6',category:'baseline',project:prepared.project,originalJson:source,at},null);
  const backup = api.createWorkspaceBackup(port,'0.4.0',at);
  return {api,values,port,backup,at,source};
}

test('7.6a: walidacja wszystkich slotów, sumy, otoczek i bibliotek; podsumowanie pochodzi z danych',()=>{
  const {api,backup}=workspaceRestoreFixture();
  const original=JSON.stringify(backup),valid=api.validateWorkspaceBackup(original);
  assert.equal(valid.valid,true,valid.error);assert.equal(valid.validatedProjectsCount,3);
  assert.equal(valid.payload.summary.variantsV6Count,1);assert.equal(valid.payload.summary.scenariosV4Count,1);
  for(const key of Object.keys(backup.storage)){
    for(const value of [42,{},[],undefined,'','not-json']){
      const bad=structuredClone(backup);bad.storage[key]=value;bad.checksumSha256=api.sha256Hex(JSON.stringify(bad.storage));
      assert.equal(api.validateWorkspaceBackup(JSON.stringify(bad)).valid,false,`${key}: ${JSON.stringify(value)}`);
    }
  }
  const checksum=structuredClone(backup);checksum.checksumSha256='0'.repeat(64);
  assert.equal(api.validateWorkspaceBackup(JSON.stringify(checksum)).valid,false);
  const draftEnvelope=structuredClone(backup);draftEnvelope.storage.v6DomainDraftRaw=JSON.stringify(JSON.parse(backup.storage.v6DomainDraftRaw).project);
  draftEnvelope.checksumSha256=api.sha256Hex(JSON.stringify(draftEnvelope.storage));assert.equal(api.validateWorkspaceBackup(JSON.stringify(draftEnvelope)).valid,false);
  const variants=structuredClone(backup),library=JSON.parse(variants.storage.v6VariantsRaw);
  library.variants[0].sourceSchemaVersion=5;variants.storage.v6VariantsRaw=JSON.stringify(library);variants.checksumSha256=api.sha256Hex(JSON.stringify(variants.storage));
  assert.equal(api.validateWorkspaceBackup(JSON.stringify(variants)).valid,false);
  const duplicate=structuredClone(backup),list=JSON.parse(duplicate.storage.v4ScenariosRaw);list.push(list[0]);duplicate.storage.v4ScenariosRaw=JSON.stringify(list);duplicate.checksumSha256=api.sha256Hex(JSON.stringify(duplicate.storage));assert.equal(api.validateWorkspaceBackup(JSON.stringify(duplicate)).valid,false);
  const forged=structuredClone(backup);forged.summary={variantsV6Count:999};assert.equal(api.validateWorkspaceBackup(JSON.stringify(forged)).payload.summary.variantsV6Count,1);
  const future=structuredClone(backup);future.formatVersion=2;assert.equal(api.validateWorkspaceBackup(JSON.stringify(future)).valid,false);
  assert.equal(JSON.stringify(backup),original,'validation must not normalize or mutate source bytes');
});

test('7.6a: poprawne stare kopie v1 i niezależne źródła obszarów pozostają obsługiwane',()=>{
  const {api,backup,port}=workspaceRestoreFixture();
  const other={...structuredClone(motor),schemaVersion:4,id:'OTHER',name:'Inny aktywny projekt'};
  port.setItem(api.STORAGE_KEYS.v4Project,JSON.stringify({project:other}));
  const independent=api.createWorkspaceBackup(port);assert.equal(api.validateWorkspaceBackup(JSON.stringify(independent)).valid,true);
  const minimal=structuredClone(backup);minimal.storage.v5StationsRaw=JSON.stringify({project:JSON.parse(minimal.storage.v5StationsRaw).project});minimal.checksumSha256=api.sha256Hex(JSON.stringify(minimal.storage));
  assert.equal(api.validateWorkspaceBackup(JSON.stringify(minimal)).valid,true,'compatible old v5 envelope without optional metadata');
  const legacy=structuredClone(backup),draft=JSON.parse(legacy.storage.v6DomainDraftRaw);draft.version=99;legacy.storage.v6DomainDraftRaw=JSON.stringify(draft);legacy.checksumSha256=api.sha256Hex(JSON.stringify(legacy.storage));assert.equal(api.validateWorkspaceBackup(JSON.stringify(legacy)).valid,false);
});

test('7.6a: pełne odtworzenie usuwa null, zachowuje obce klucze, ponownie waliduje i chroni przed nieaktualną kopią ratunkową',()=>{
  const {api,backup,port,values}=workspaceRestoreFixture();
  const before=api.createWorkspaceBackup(port);values['unrelated']='keep';
  const empty=api.createWorkspaceBackup({getItem:()=>null});
  let snapshot='';api.restoreWorkspaceBackup(port,empty,{expectedCurrentSnapshot:JSON.stringify(before),beforeWrite:(raw:string)=>{snapshot=raw;assert.ok(values[api.STORAGE_KEYS.v4Project]);}});
  assert.deepEqual(values,{unrelated:'keep'});assert.deepEqual(JSON.parse(snapshot).storage,before.storage);
  api.restoreWorkspaceBackup(port,backup);assert.equal(api.validateWorkspaceBackup(JSON.stringify(api.createWorkspaceBackup(port))).valid,true);
  const previous=JSON.stringify(values),invalid=structuredClone(backup);invalid.checksumSha256='bad';
  assert.throws(()=>api.restoreWorkspaceBackup(port,invalid),/SHA-256/);assert.equal(JSON.stringify(values),previous);
  assert.throws(()=>api.restoreWorkspaceBackup(port,backup,{expectedCurrentSnapshot:JSON.stringify({...JSON.parse(snapshot),storage:{...JSON.parse(snapshot).storage,v4ProjectRaw:'changed'}})}),/zmienił się/);assert.equal(JSON.stringify(values),previous);
  let writes=0;assert.throws(()=>api.restoreWorkspaceBackup({...port,setItem:()=>{writes++;}},empty,{beforeWrite:()=>{throw new Error('copy not available');}}),/copy not available/);assert.equal(writes,0);assert.equal(JSON.stringify(values),previous);
});

test('7.6a: błąd każdego zapisu i usunięcia wycofuje dokładny poprzedni stan, także po częściowej mutacji',()=>{
  const {api,backup}=workspaceRestoreFixture();
  for(const mode of ['set','remove'])for(const failingKey of Object.values(api.STORAGE_KEYS) as string[])for(const mutateFirst of [false,true]){
    const old:Record<string,string>={unrelated:'keep'};
    if(mode==='remove')for(const key of Object.values(api.STORAGE_KEYS) as string[])old[key]='previous raw '+key;
    const values={...old};let failed=false;
    const port={getItem:(key:string)=>values[key]??null,setItem:(key:string,value:string)=>{
      if(mode==='set'&&key===failingKey&&!failed){failed=true;if(mutateFirst)values[key]=value;throw new Error('quota');}values[key]=value;
    },removeItem:(key:string)=>{
      if(mode==='remove'&&key===failingKey&&!failed){failed=true;if(mutateFirst)delete values[key];throw new Error('remove unavailable');}delete values[key];
    }};
    const payload=mode==='set'?backup:api.createWorkspaceBackup({getItem:()=>null});
    assert.throws(()=>api.restoreWorkspaceBackup(port,payload),(error:any)=>{
      assert.ok(error instanceof api.WorkspaceRestoreError);assert.deepEqual(error.rollbackErrors,[]);assert.ok(error.rollbackSnapshot);return true;
    });assert.deepEqual(values,old,`${mode} ${failingKey} mutate=${mutateFirst}`);
  }
});

test('7.6a: awaria wycofania jest jawna i nadal udostępnia kopię ratunkową',()=>{
  const {api,backup}=workspaceRestoreFixture(),key=api.STORAGE_KEYS.v4Project;
  const values:Record<string,string>={[key]:'previous raw'};let calls=0;
  const port={getItem:(name:string)=>values[name]??null,removeItem:(name:string)=>{delete values[name];},setItem:(name:string,value:string)=>{
    if(name===key){if(++calls===1)values[name]=value;throw new Error('persistent failure');}values[name]=value;
  }};
  assert.throws(()=>api.restoreWorkspaceBackup(port,backup),(error:any)=>{
    assert.ok(error instanceof api.WorkspaceRestoreError);assert.ok(error.rollbackErrors.length>0);assert.equal(JSON.parse(error.rollbackSnapshot).storage.v4ProjectRaw,'previous raw');assert.match(error.message,/nie jest potwierdzone/);return true;
  });
});
