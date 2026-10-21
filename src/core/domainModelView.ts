import {parseDomainProjectV6,type DomainProjectV6} from './domainProject';
import {calculateTaktTime} from './algorithms/taktCalculator';
import {corners} from './algorithms/layoutEngine';
import {sha256Hex} from './workspaceBackup';

/** Read projection only: never derive/balance a v4 project or assign missing resources. */
export function buildDomainModelView(input:DomainProjectV6){
  const project=parseDomainProjectV6(JSON.stringify(input));
  const owner=new Map(project.stations.flatMap(s=>s.operationIds.map(id=>[id,s.id] as const)));
  const operations=project.operations.map(op=>{
    const choice=project.workerRunSelection?.operations.find(c=>c.operationId===op.id);
    const profile=op.staffing?.timeVariants.find(v=>v.workerCount===choice?.workerCount)?.timeProfile;
    return {id:op.id,name:op.name,stationId:owner.get(op.id)??null,durationSeconds:profile?.durationSeconds??null,
      basis:profile?.durationBasis??null,workerCount:choice?.workerCount??null,
      eligibleWorkerIds:choice?[...choice.eligibleWorkerIds]:[],
      candidates:project.stationRouting?.operations.find(r=>r.operationId===op.id)?.candidates??[]};
  });
  const completeTimes=operations.every(op=>op.durationSeconds!==null);
  // Multiple candidate copies are alternatives; the view must not pick the first or divide times.
  const fixedLoads=operations.length>0&&completeTimes&&operations.every(op=>op.candidates.length===1);
  const stations=project.stations.map(station=>({id:station.id,name:station.name,operationIds:[...station.operationIds],
    assignedSeconds:station.operationIds.every(id=>operations.find(o=>o.id===id)?.durationSeconds!=null)
      ?station.operationIds.reduce((sum,id)=>sum+operations.find(o=>o.id===id)!.durationSeconds!,0):null,
    copies:project.stationSettings[station.id]?.parallelStations??null}));
  const copies=stations.flatMap(station=>station.copies===null?[]:Array.from({length:station.copies},(_,i)=>{
    const operationIds=operations.filter(op=>op.candidates.length===1&&op.candidates[0].stationId===station.id&&op.candidates[0].copy===i+1).map(op=>op.id);
    return {stationId:station.id,copy:i+1,operationIds,loadSeconds:fixedLoads?operationIds.reduce((s,id)=>s+operations.find(o=>o.id===id)!.durationSeconds!,0):null};
  }));
  const maxLoad=fixedLoads&&copies.length?Math.max(...copies.map(c=>c.loadSeconds!)):null;
  const takt=calculateTaktTime(project.demand);
  const positive=(n:number)=>Number.isFinite(n)&&n>0?n:null;
  return {projectId:project.id,name:project.name,modelSchemaVersion:6 as const,signatureSha256:sha256Hex(JSON.stringify(project)),
    operations,stations,copies,selectedWorkers:project.workerRunSelection?[...project.workerRunSelection.teamWorkerIds]:null,
    customerTaktSeconds:positive(takt.customerTaktSeconds),targetSeconds:positive(takt.taktTimeSeconds),
    selectedWorkSeconds:completeTimes?operations.reduce((s,o)=>s+o.durationSeconds!,0):null,
    maxCopyLoadSeconds:maxLoad,staticCapacityPerHour:maxLoad!==null&&maxLoad>0?3600/maxLoad:null,
    facility:{...project.facility},obstacles:project.obstacles.map(o=>({...o})),
    geometry:project.layoutObjects.map(object=>({...object,points:corners(object)})),
    warnings:[...(!completeTimes?['Brak pełnego wyboru wariantów czasu obsady — nie zastąpiono go czasem standardowym.']:[]),
      ...(!fixedLoads?['Brak pojedynczej jawnie dopuszczonej kopii dla każdej operacji — pułap kopii pozostaje nieokreślony.']:[]),
      ...(!project.facility.isConfirmed?['Wymiary hali są niepotwierdzone.']:[])]};
}
export type DomainModelView=ReturnType<typeof buildDomainModelView>;
const cell=(s:unknown)=>String(s??'brak').replace(/\|/g,'\\|').replace(/[\r\n]+/g,' ');

export function domainModelViewReport(view:DomainModelView){
  return `# Widok aktywnego szkicu 6 — ${cell(view.name)}

Projekt: ${cell(view.projectId)} · Schemat: 6
SHA-256 modelu: ${view.signatureSha256}

To raport statycznego stanu tego modelu, bez uruchamiania symulacji ani konwersji do projektu 4. Nie potwierdza przepustowości dynamicznej, kompletności kalendarzy/transportu ani wykonalności obsady. Wyniki harmonogramu i porównania pobieraj z ich paneli dla tych samych danych i jawnych warunków.

Takt klienta: ${cell(view.customerTaktSeconds)} s/szt.; cel po OEE: ${cell(view.targetSeconds)} s/szt.
Wybrana suma czasów operacji: ${cell(view.selectedWorkSeconds)} s/szt. To suma czasów trwania operacji, nie automatycznie suma osobosekund.
Skład przebiegu: ${view.selectedWorkers?.map(cell).join(', ')??'brak wyboru'}.
Statyczny pułap jawnych kopii: ${cell(view.staticCapacityPerHour)} szt./h; maksymalna suma na kopię: ${cell(view.maxCopyLoadSeconds)} s/szt. Alternatywne dopuszczenia nie są arbitralnie rozdzielane.

| Stanowisko | ID | Operacje wg rejestru | Suma wybranych czasów [s/szt.] | Zadeklarowane kopie |
| --- | --- | --- | --- | --- |
${view.stations.map(s=>`| ${cell(s.name)} | ${cell(s.id)} | ${s.operationIds.map(cell).join(', ')||'rezerwa'} | ${cell(s.assignedSeconds)} | ${cell(s.copies)} |`).join('\n')}

| Operacja | Stanowisko wg rejestru | Wybrany czas [s] | Pochodzenie | Obsada | Dopuszczone kopie |
| --- | --- | --- | --- | --- | --- |
${view.operations.map(o=>`| ${cell(o.id)} — ${cell(o.name)} | ${cell(o.stationId)} | ${cell(o.durationSeconds)} | ${o.basis==='assumed'?'założenie':o.basis==='measured'?'pomiar':'brak'} | ${cell(o.workerCount)} | ${o.candidates.map(c=>`${cell(c.stationId)}#${c.copy}`).join(', ')||'brak'} |`).join('\n')}

## Geometria tego samego modelu

Hala [mm]: ${view.facility.widthMm} × ${view.facility.lengthMm} × ${view.facility.heightMm}. Potwierdzona: ${view.facility.isConfirmed?'tak':'nie'}.

| Obiekt | Stanowisko | X/Y/Z [mm] | Wymiary [mm] | Obrót [°] |
| --- | --- | --- | --- | --- |
${view.geometry.map(o=>`| ${cell(o.id)} | ${cell(o.workstationId)} | ${o.xMm}/${o.yMm}/${o.zMm} | ${o.widthMm}×${o.lengthMm}×${o.heightMm} | ${o.rotationDeg} |`).join('\n')}

${view.warnings.map(w=>`- ${w}`).join('\n')}

Rzut jest odczytem istniejącej geometrii; brak stołu nie tworzy go automatycznie. Obrys nie jest certyfikacją BHP ani kształtem dokładnego modelu CAD. Widok 3D i animacja szkicu 6 pozostają do odrębnej integracji; główna animacja/raport 4 nie przedstawiają automatycznie tego modelu.
`;
}
