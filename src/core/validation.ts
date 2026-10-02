import { ProcessStep, ProjectData } from './models/types';
export interface Issue { area: 'demand'|'process'|'bom'|'facility'|'layout'; message: string; severity: 'error'|'warning' }
const finite=(v:unknown,min=0)=>typeof v==='number'&&Number.isFinite(v)&&v>=min;
export function processErrors(steps:ProcessStep[]):string[] {
  const errors:string[]=[],ids=new Set<string>();
  for(const s of steps){
    if(!s.id?.trim()||ids.has(s.id))errors.push(`Puste lub powtórzone ID operacji: ${s.id}`);
    ids.add(s.id);
    if(s.flowPosition&&(!Number.isFinite(s.flowPosition.x)||!Number.isFinite(s.flowPosition.y)||Math.abs(s.flowPosition.x)>100000||Math.abs(s.flowPosition.y)>100000))errors.push(`${s.id}: niepoprawna pozycja na diagramie.`);
    if(!s.name?.trim())errors.push(`${s.id}: podaj nazwę operacji.`);
    if(!finite(s.standardTimeSeconds,0.001))errors.push(`${s.id}: czas musi być dodatni.`);
    if(!finite(s.vaTimeSeconds)||!finite(s.nvaTimeSeconds)||Math.abs(s.vaTimeSeconds+s.nvaTimeSeconds-s.standardTimeSeconds)>0.02)errors.push(`${s.id}: VA + NVA musi być równe czasowi standardowemu.`);
    if(Array.isArray(s.predecessorIds)&&new Set(s.predecessorIds).size!==s.predecessorIds.length)errors.push(`${s.id}: powtórzony poprzednik.`);
    if(!Array.isArray(s.predecessorIds))errors.push(`${s.id}: poprzednicy muszą być listą.`);
  }
  for(const s of steps)for(const id of s.predecessorIds??[]){
    if(!ids.has(id))errors.push(`${s.id}: nie istnieje poprzednik ${id}.`);
    if(id===s.id)errors.push(`${s.id}: operacja nie może poprzedzać samej siebie.`);
  }
  if(errors.length)return errors;
  const done=new Set<string>();
  for(let pass=0;pass<steps.length;pass++){
    const next=steps.filter(s=>!done.has(s.id)&&s.predecessorIds.every(p=>done.has(p)));
    if(!next.length)break; next.forEach(s=>done.add(s.id));
  }
  if(done.size!==steps.length)errors.push(`Cykl zależności blokuje operacje: ${steps.filter(s=>!done.has(s.id)).map(s=>s.id).join(', ')}.`);
  return errors;
}
export function topologicalSort(steps:ProcessStep[]):ProcessStep[]{
  const errors=processErrors(steps);if(errors.length)throw new Error(errors.join('\n'));
  const done=new Set<string>(),result:ProcessStep[]=[];
  while(result.length<steps.length){const s=steps.filter(s=>!done.has(s.id)&&s.predecessorIds.every(p=>done.has(p))).sort((a,b)=>a.sequenceNumber-b.sequenceNumber)[0];result.push({...s,sequenceNumber:result.length+1});done.add(s.id);}
  return result;
}
export function validateProject(p:ProjectData):Issue[]{
  const issues:Issue[]=[];const error=(area:Issue['area'],message:string)=>issues.push({area,message,severity:'error'});
  const d=p.demand;
  if(p.workstationSettings){
    if(typeof p.workstationSettings!=='object'||Array.isArray(p.workstationSettings)||Object.keys(p.workstationSettings).length>500)error('process','Niepoprawne ustawienia zasobów.');
    else for(const config of Object.values(p.workstationSettings)) if(!config||!Number.isInteger(config.operators)||config.operators<1||config.operators>20||!Number.isInteger(config.parallelStations)||config.parallelStations<1||config.parallelStations>20||(config.assistedCycleSeconds!==undefined&&!finite(config.assistedCycleSeconds,0.001)))error('process','Zasoby: obsada i kopie 1–20, czas zespołu dodatni.');
  }
  if(!p.name.trim())error('process','Podaj nazwę projektu.');
  if(p.processSteps.length>500||p.bom.length>5000||p.obstacles.length>500||p.layoutObjects.length>5000)error('process','Przekroczono limit rozmiaru projektu.');
  if(!finite(d.yearlyDemand,1))error('demand','Popyt roczny musi wynosić co najmniej 1 szt.');
  if(!Number.isInteger(d.workingDaysPerYear)||d.workingDaysPerYear<1||d.workingDaysPerYear>366)error('demand','Dni robocze: liczba całkowita od 1 do 366.');
  if(![1,2,3].includes(d.shiftsPerDay))error('demand','Liczba zmian: 1, 2 lub 3.');
  if(!finite(d.hoursPerShift,0.01)||d.hoursPerShift*d.shiftsPerDay>24)error('demand','Łączna długość zmian musi mieścić się w 24 godzinach.');
  if(!finite(d.plannedBreaksMinutesPerShift)||d.plannedBreaksMinutesPerShift>=d.hoursPerShift*60)error('demand','Przerwy muszą być nieujemne i krótsze od zmiany.');
  if(!finite(d.oeePercent,0.01)||d.oeePercent>100)error('demand','OEE musi być większe od 0 i nie większe od 100%.');
  processErrors(p.processSteps).forEach(m=>error('process',m));
  const ids=new Set(p.processSteps.map(s=>s.id)),bomIds=new Set<string>();
  p.bom.forEach(b=>{
    if(!b.id||bomIds.has(b.id))error('bom',`Powtórzone lub puste ID BOM: ${b.id}`);bomIds.add(b.id);
    if(!b.name?.trim()||!b.partNumber?.trim())error('bom',`${b.id}: uzupełnij nazwę i numer części.`);
    if(!ids.has(b.associatedProcessStepId))error('bom',`${b.partNumber}: brak operacji ${b.associatedProcessStepId}.`);
    if(!finite(b.quantityPerUnit,0.0001)||!Number.isInteger(b.packageQuantity)||b.packageQuantity<1||!finite(b.unitCost))error('bom',`${b.partNumber}: ilość > 0, opakowanie całkowite ≥ 1, koszt ≥ 0.`);
    if(!['BoxKLT','Pallet','Tray','Carton'].includes(b.container))error('bom',`${b.partNumber}: nieznany pojemnik.`);
  });
  const f=p.facility;
  if(![f.widthMm,f.lengthMm,f.heightMm].every(v=>finite(v,100)&&v<=500000)||!finite(f.gridSizeMm,100)||f.gridSizeMm>Math.min(f.widthMm,f.lengthMm))error('facility','Wymiary hali: 100–500000 mm; siatka ≥ 100 mm i nie większa od hali.');
  if(p.layoutSettings&&![p.layoutSettings.tableWidthMm,p.layoutSettings.tableLengthMm,p.layoutSettings.spacingMm,p.layoutSettings.aisleMm].every(v=>finite(v,100)&&v<=50000))error('facility','Wymiary wyposażenia i odstępy: 100–50000 mm.');
  const obsIds=new Set<string>();
  p.obstacles.forEach(o=>{
    if(!o.id||obsIds.has(o.id))error('facility',`Powtórzone ID przeszkody ${o.id}.`);obsIds.add(o.id);
    if(![o.xMm,o.yMm].every(v=>finite(v))||![o.widthMm,o.lengthMm,o.heightMm].every(v=>finite(v,1))||o.xMm+o.widthMm>f.widthMm||o.yMm+o.lengthMm>f.lengthMm||o.heightMm>f.heightMm)error('facility',`${o.name}: niepoprawne wymiary lub przeszkoda poza halą.`);
  });
  const objectIds=new Set<string>();
  for(const o of p.layoutObjects){
    if(!o.id||objectIds.has(o.id))error('layout',`Powtórzone lub puste ID obiektu ${o.id}.`);objectIds.add(o.id);
    if(![o.xMm,o.yMm,o.zMm,o.rotationDeg].every(Number.isFinite)||![o.widthMm,o.lengthMm,o.heightMm].every(v=>finite(v,1)))error('layout',`${o.name}: niepoprawna geometria.`);
  }
  return issues;
}
export function parseProject(text:string):ProjectData{
  const p=JSON.parse(text);
  if(!p||typeof p!=='object'||typeof p.name!=='string'||!p.name.trim()||!p.demand||!p.facility||!Array.isArray(p.processSteps)||!Array.isArray(p.bom))throw new Error('Niepoprawny JSON: wymagane nazwa, popyt, hala, operacje i BOM.');
  if(p.schemaVersion&&p.schemaVersion>4)throw new Error('Nieobsługiwana nowsza wersja projektu.');
  if(!['UShape','Linear','LShape','ProcessFlow'].includes(p.targetLayoutType))throw new Error('Nieznany typ layoutu.');
  p.obstacles??=[];p.layoutObjects??=[];
  if(!Array.isArray(p.obstacles)||!Array.isArray(p.layoutObjects)||[...p.processSteps,...p.bom,...p.obstacles,...p.layoutObjects].some(x=>!x||typeof x!=='object'))throw new Error('Niepoprawne listy obiektów.');
  if(p.processSteps.length>500||p.bom.length>5000||p.layoutObjects.length>5000||p.obstacles.length>500)throw new Error('Limit projektu: 500 operacji, 5000 materiałów/obiektów i 500 przeszkód.');
  for(const s of p.processSteps)if(typeof s.id!=='string'||typeof s.name!=='string'||!Array.isArray(s.predecessorIds)||s.predecessorIds.some((id:unknown)=>typeof id!=='string'))throw new Error('Niepoprawna struktura operacji.');
  for(const b of p.bom)if([b.id,b.name,b.partNumber,b.associatedProcessStepId].some(v=>typeof v!=='string'))throw new Error('Niepoprawna struktura BOM.');
  for(const o of p.obstacles)if(typeof o.id!=='string'||typeof o.name!=='string')throw new Error('Niepoprawna struktura przeszkody.');
  if(p.timeUnit!==undefined&&!['s','min','h'].includes(p.timeUnit))throw new Error('Nieznana jednostka czasu.');
  p.id=typeof p.id==='string'?p.id:crypto.randomUUID();p.timeUnit=p.timeUnit??'s';p.algorithm=['RPW','LCR','Manual'].includes(p.algorithm)?p.algorithm:'RPW';p.currency=['PLN','EUR','USD'].includes(p.currency)?p.currency:'USD';p.layoutMode=p.layoutMode==='manual'?'manual':'auto';p.schemaVersion=4;
  const errors=validateProject(p);if(errors.length)throw new Error(errors.map(i=>i.message).join('\n'));
  for(const o of p.layoutObjects)if(typeof o.id!=='string'||typeof o.type!=='string'||typeof o.name!=='string'||![o.xMm,o.yMm,o.zMm,o.rotationDeg].every(Number.isFinite)||![o.widthMm,o.lengthMm,o.heightMm].every(v=>finite(v,1)))throw new Error('Niepoprawne współrzędne layoutu.');
  return p as ProjectData;
}
