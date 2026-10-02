import { applyResources } from './resources';
import { DEFAULT_MOTOR_PROJECT } from './models/defaultProjects';
import { ProjectData } from './models/types';
import { validateProject, Issue } from './validation';
import { calculateTaktTime } from './algorithms/taktCalculator';
import { runLineBalancing } from './algorithms/lineBalancingEngine';
import { defaultLayoutSettings, generate3DLayout, layoutWarnings } from './algorithms/layoutEngine';
export function newProject():ProjectData{return {...structuredClone(DEFAULT_MOTOR_PROJECT),id:crypto.randomUUID(),name:'Nowy projekt linii',schemaVersion:4,algorithm:'RPW',currency:'PLN',layoutMode:'auto',layoutSettings:{...defaultLayoutSettings},processSteps:[],bom:[],obstacles:[],layoutObjects:[],createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()};}
export function derive(p:ProjectData){
  const issues=validateProject(p);let project={...p,balancing:undefined} as ProjectData;
  if(!issues.some(i=>i.area==='demand'||i.area==='process'))try{
    project.balancing=applyResources(runLineBalancing(p.processSteps,calculateTaktTime(p.demand).taktTimeSeconds,p.algorithm??'RPW'),p.workstationSettings);
  }catch(e){issues.push({area:'process',severity:'error',message:String((e as Error).message)});}
  if(p.layoutMode!=='manual')project.layoutObjects=project.balancing&&!issues.some(i=>i.area==='facility')?generate3DLayout(project.balancing.workstations,p.targetLayoutType,p.facility,p.layoutSettings??defaultLayoutSettings,p.processSteps):[];
  if(p.layoutMode==='manual'&&project.balancing){const expected=new Set(project.balancing.workstations.map(s=>s.id));const actual=project.layoutObjects.filter(o=>o.type.includes('Table')).map(o=>o.workstationId);if(actual.some(id=>!id||!expected.has(id))||project.balancing.workstations.some(s=>actual.filter(id=>id===s.id).length!==(s.parallelStations??1)))issues.push({area:'layout',severity:'error',message:'Ręczny layout nie odpowiada stanowiskom. Wygeneruj layout ponownie.'});}
  layoutWarnings(project).forEach(message=>issues.push({area:'layout',severity:'warning',message}));
  return {project,issues};
}
export function download(content:string|Blob,name:string,mime='text/plain;charset=utf-8'){
  const url=URL.createObjectURL(new Blob([content],{type:mime})),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
export const filename=(p:ProjectData)=>p.name.replace(/[<>:"/\\|?*\x00-\x1f]/g,'_').trim().slice(0,100)||'Projekt';
export function engineeringReport(p:ProjectData,issues:Issue[]){
  const t=calculateTaktTime(p.demand),b=p.balancing;
  return `# ${p.name}\n\nRaport wygenerowany: ${new Date().toLocaleString('pl-PL')}\n\n## Założenia\n\nPopyt: ${p.demand.yearlyDemand} szt./rok; ${p.demand.workingDaysPerYear} dni; ${p.demand.shiftsPerDay} zmian po ${p.demand.hoursPerShift} h; przerwy ${p.demand.plannedBreaksMinutesPerShift} min; OEE ${p.demand.oeePercent}%.\n\nTakt klienta: ${t.customerTaktSeconds.toFixed(2)} s. Cel cyklu po OEE: ${t.taktTimeSeconds.toFixed(2)} s. Algorytm: ${p.algorithm??'RPW'}.\n\n## Bilans\n\nStanowiska: ${b?.actualWorkstationsCount??0}. Wykorzystanie kopii względem max(cel, odstęp zdolności): ${b?.lineEfficiencyPercent.toFixed(2)??'brak'}%.\n\n${b?.workstations.map(s=>`- ${s.name}: ${s.cycleTimeSeconds.toFixed(2)} s/szt.; ${s.parallelStations??1} kopii × ${s.operators??1} operatorów; odstęp zdolności ${(s.effectiveCycleSeconds??s.cycleTimeSeconds).toFixed(2)} s; operacje ${s.assignedStepIds.join(', ')}; ${s.isBottleneck?'PRZEKROCZENIE':'w normie'}`).join('\n')??'Brak poprawnego bilansu.'}\n\n## BOM\n\nKoszt materiałów: ${p.bom.reduce((n,b)=>n+b.unitCost*b.quantityPerUnit,0).toFixed(2)} ${p.currency??'USD'}/szt.\n\n## Hala\n\n${p.facility.widthMm} × ${p.facility.lengthMm} × ${p.facility.heightMm} mm. Układ ${p.targetLayoutType}. Tryb ${p.layoutMode??'auto'}.\n\n## Kontrola\n\n${issues.length?issues.map(i=>`- ${i.severity}: ${i.message}`).join('\n'):'Brak wykrytych błędów i kolizji.'}\n\n## Model\n\nZasoby: obsada na każdą kopię stanowiska, równoległe kopie; cykl zespołu podawany jawnie. Symulacja grafu operacji z synchronizacją wszystkich poprzedników, bez ograniczeń buforów, transportu i awarii. OEE jest rezerwą doboru cyklu, nie losowym modelem awarii. Geometria i kolizje są kontrolą rzutu, nie weryfikacją BHP.\n`;
}
