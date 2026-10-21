import {build} from 'esbuild';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {createHash} from 'node:crypto';
import XLSX from 'xlsx';
process.on('uncaughtException',error=>{console.error(error.message);process.exitCode=1;});

// Authoring of synthetic demo data only. No scheduler is called to create a reference.
const bundle=await build({stdin:{contents:`export * from './src/core/validation';export * from './src/core/domainProject';export * from './src/core/domainMigrationPreview';export * from './src/core/domainDraftStorage';export * from './src/core/domainVariantComparison';export * from './src/core/projectPackage';export * from './src/core/export/excelImporter';`,resolveDir:process.cwd()},bundle:true,platform:'node',format:'esm',write:false});
const api=await import('data:text/javascript;base64,'+Buffer.from(bundle.outputFiles[0].text).toString('base64'));
const out=resolve('przyklady/01_zestaw_montazowy'),check=process.argv.includes('--check');
const at='2026-10-21T00:00:00.000Z',projectId='DEMO-ZESTAW-MONTAZOWY-1';
const stations=['ST-ZM-1','ST-ZM-2','ST-ZM-3'];
const ids=['ZM-OP10','ZM-OP20','ZM-OP30'];
const durations=[20,30,40],va=[16,25,34];
const names=['Przygotowanie podstawy','Montaż uchwytu i pokręteł','Kontrola i opakowanie zestawu'];
const source4=api.parseProject(JSON.stringify({schemaVersion:4,id:projectId,name:'Zestaw uchwytu montażowego — DEMO syntetyczne',createdAt:at,updatedAt:at,
  timeUnit:'s',algorithm:'Manual',currency:'PLN',targetLayoutType:'Linear',layoutMode:'manual',
  layoutSettings:{tableWidthMm:1200,tableLengthMm:800,spacingMm:800,aisleMm:1500},
  facility:{widthMm:8000,lengthMm:6000,heightMm:3000,gridSizeMm:100,isConfirmed:false},obstacles:[],
  demand:{yearlyDemand:120000,workingDaysPerYear:250,shiftsPerDay:1,hoursPerShift:8,plannedBreaksMinutesPerShift:0,oeePercent:100},
  processSteps:ids.map((id,i)=>({id,name:names[i],standardTimeSeconds:durations[i],vaTimeSeconds:va[i],nvaTimeSeconds:durations[i]-va[i],sequenceNumber:i+1,predecessorIds:i?[ids[i-1]]:[],assignedWorkstationId:`WS-${i+1}`})),
  workstationSettings:Object.fromEntries(ids.map(id=>[JSON.stringify([id]),{operators:1,parallelStations:1}])),
  bom:[['ZM-POD','Podstawa uchwytu',1,'BoxKLT',20,ids[0],8],['ZM-UCH','Uchwyt',1,'BoxKLT',20,ids[1],12],['ZM-POK','Pokrętło ręczne',2,'BoxKLT',100,ids[1],1.5],['ZM-OPAK','Opakowanie zestawu',1,'Carton',20,ids[2],2]].map((b,i)=>({id:`BOM-${i+1}`,partNumber:b[0],name:b[1],quantityPerUnit:b[2],container:b[3],packageQuantity:b[4],associatedProcessStepId:b[5],unitCost:b[6]})),
  layoutObjects:ids.map((_,i)=>({id:`ZM-TABLE-${i+1}`,name:`Stół S${i+1} — geometria koncepcyjna`,type:'Table',workstationId:`WS-${i+1}`,xMm:1000+i*2000,yMm:2000,zMm:0,widthMm:1200,lengthMm:800,heightMm:900,rotationDeg:0,colorHex:'#3979a8',isVisualAssumption:true}))}));
const originalJson=JSON.stringify(source4);
let index=0;
const base=api.prepareDomainMigration(api.previewDomainMigrationFromV4(originalJson,()=>stations[index++])).project;
base.workers=[{id:'ZM-W1',name:'Osoba 1 — przygotowanie/montaż'},{id:'ZM-W2',name:'Osoba 2 — montaż (rezerwa po konsolidacji)'},{id:'ZM-W3',name:'Osoba 3 — kontrola/pakowanie'}];
base.workerPools=[{id:'ZM-P-MONT',name:'Montaż',workerIds:['ZM-W1','ZM-W2']},{id:'ZM-P-QC',name:'Kontrola',workerIds:['ZM-W3']}];
base.product={id:'ZM-PRODUCT',name:'Zestaw uchwytu — wyrób syntetyczny'};
base.operations.forEach((op,i)=>{
  const profile={durationSeconds:durations[i],durationBasis:'assumed',manualWork:[{startSeconds:0,endSeconds:durations[i],basis:'assumed'}],machineRun:[],operatorPresence:[{startSeconds:0,endSeconds:durations[i],basis:'assumed'}]};
  op.timeProfile=structuredClone(profile);op.staffing={requiredWorkers:1,timeVariants:[{workerCount:1,timeProfile:profile}]};
});
base.stations.forEach((s,i)=>{s.name=`S${i+1} — ${names[i]}`;});
const calendar={shifts:[{startSeconds:0,endSeconds:28800,basis:'assumed'}],breaks:[]};
base.resourceCalendars={workers:Object.fromEntries(base.workers.map(w=>[w.id,structuredClone(calendar)])),stations:Object.fromEntries(stations.map(id=>[id,structuredClone(calendar)]))};
base.workerRunSelection={teamWorkerIds:base.workers.map(w=>w.id),operations:ids.map((id,i)=>({operationId:id,workerCount:1,eligibleWorkerIds:[`ZM-W${i+1}`]}))};
base.equipment=stations.map((stationId,i)=>({id:`ZM-EQ${i+1}`,name:`Stół manualny S${i+1}`,stationId,layoutObjectId:`ZM-TABLE-${i+1}`,capableOperationIds:i===0?[ids[0],ids[1]]:[ids[i]]}));
base.stationRouting={selectionRule:'earliest-start-then-shortest-route',equipmentPlacements:stations.map((stationId,i)=>({equipmentId:`ZM-EQ${i+1}`,stationId,copy:1})),operations:ids.map((operationId,i)=>({operationId,candidates:[{stationId:stations[i],copy:1,requiredEquipmentIds:[`ZM-EQ${i+1}`]}]})),routes:[]};
// Explicit linear buffered model preserves same-copy local continuation. Capacity 3
// suffices for this 3-piece batch; the final unbounded output is an explicit JIT model choice.
base.stationBuffers={buffers:stations.map((stationId,i)=>({stationId,copy:1,inputCapacity:3,outputCapacity:i===2?null:3,blockingPolicy:'bbas-worker-released'}))};
base.competencyRequirements={competencies:[{id:'ZM-C-MONT',name:'Montaż ręczny'},{id:'ZM-C-QC',name:'Kontrola i pakowanie'}],workers:base.workers.map((w,i)=>({workerId:w.id,competencyIds:[i===2?'ZM-C-QC':'ZM-C-MONT']})),operations:ids.map((operationId,i)=>({operationId,requiredCompetencyIds:[i===2?'ZM-C-QC':'ZM-C-MONT']}))};
api.parseDomainProjectV6(JSON.stringify(base));
const consolidated=structuredClone(base);
consolidated.stations[0].operationIds=[ids[0],ids[1]];consolidated.stations[1].operationIds=[];
consolidated.workerRunSelection.teamWorkerIds=['ZM-W1','ZM-W3'];
consolidated.workerRunSelection.operations[1].eligibleWorkerIds=['ZM-W1'];
consolidated.stationRouting.operations[1].candidates=[{stationId:stations[0],copy:1,requiredEquipmentIds:['ZM-EQ1']}];
// Keep the spare station and its identity/equipment. Moving its drawing creates no capacity.
consolidated.layoutObjects.find(o=>o.id==='ZM-TABLE-2').yMm=4000;
api.parseDomainProjectV6(JSON.stringify(consolidated));
const values={};const port={getItem:k=>values[k]??null,setItem:(k,v)=>{values[k]=v;},removeItem:k=>{delete values[k];}};
api.saveDomainDraft(port,{project:base,originalJson},null,at);
for(const [id,name,category,project] of [['BASIC-BASE','Baza — 3 stanowiska / 3 osoby','baseline',base],['BASIC-CONSOLIDATED','Konsolidacja — 2 aktywne stanowiska / 2 osoby','changed-layout',consolidated]])api.saveDomainVariant(port,{id,name,category,project,originalJson,at},port.getItem(api.DOMAIN_VARIANTS_STORAGE_KEY));
const pkg=api.makeProjectPackage(port,{dataOrigin:'synthetic',at});
const files=new Map();const json=(path,data)=>files.set(path,Buffer.from(JSON.stringify(data,null,2)+'\n'));
json('projekt-pokazowy.json',pkg);
json('dane/zrodlo4.json',source4);json('dane/szkic6.json',JSON.parse(pkg.data.draftRaw));json('dane/warianty6.json',JSON.parse(pkg.data.variantsRaw));
json('dane/warunki_eksperymentu.json',{dataOrigin:'synthetic',batch:3,arrivalIntervalSeconds:1,transportMode:'just-in-time',initialArrivalsSeconds:[0,1,2],materialAvailability:'assumed-available-at-operation-start',physicalBodyLocations:'not-modelled-in-explicit-JIT',transportRoutesAndDurations:'not-modelled-in-explicit-JIT',bufferModel:'explicit linear buffers, input=3, intermediate output=3, final output=null (unbounded); local continuation holds the same copy',materialDeliveries:'not-modelled-in-this-example',costAssumptions:null,stochasticConfig:null,calendarWindowSeconds:[0,28800],calendarBreaks:[],sourceOfProductionMeasurements:'none — designed teaching example',sessionSettingsMustBeSelectedInUI:true});
for(const [kind,rows,docs] of [['proces',api.processRows(base.operations),api.PROCESS_COLUMN_DOCS],['bom',api.bomRows(base.bom),api.BOM_COLUMN_DOCS]]){
  const book=XLSX.utils.book_new();book.Props={Title:`DEMO syntetyczne: ${kind}`,Author:'Layout Studio Pro',CreatedDate:new Date(at),ModifiedDate:new Date(at)};
  const sheet=XLSX.utils.json_to_sheet(rows);sheet['!cols']=Object.keys(rows[0]).map(key=>({wch:key.includes('Nazwa')?43:Math.max(key.length+2,18)}));sheet['!autofilter']={ref:sheet['!ref']};
  XLSX.utils.book_append_sheet(book,sheet,'Dane');XLSX.utils.book_append_sheet(book,XLSX.utils.json_to_sheet(docs),'Opis kolumn');
  XLSX.utils.book_append_sheet(book,XLSX.utils.json_to_sheet([{Pole:'Pochodzenie',Wartosc:'Dane syntetyczne, brak pomiarów produkcyjnych'},{Pole:'Jednostki',Wartosc:'Czas s, geometria mm, koszty PLN'},{Pole:'Pełny projekt',Wartosc:'Wczytaj projekt-pokazowy.json przez Pakiet projektu; sam arkusz nie odtwarza zasobów ani wariantów'}]),'Pochodzenie');
  files.set(`dane/${kind}.xlsx`,Buffer.from(XLSX.write(book,{type:'buffer',bookType:'xlsx',compression:true})));
}
for(const path of ['README.md','dane/slownik_pol.md','referencje/oczekiwane_wyniki.json','referencje/obliczenia.md'])files.set(path,Buffer.from(readFileSync(resolve(out,path),'utf8').replace(/\r\n/g,'\n')));
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const roles={'projekt-pokazowy.json':'entry-project-package','README.md':'instructions','dane/slownik_pol.md':'field-dictionary','referencje/oczekiwane_wyniki.json':'independent-reference','referencje/obliczenia.md':'independent-calculation','dane/warunki_eksperymentu.json':'session-settings-reference'};
json('manifest.json',{format:'layout-studio-demo-manifest',formatVersion:1,packageId:projectId,packageVersion:'1.0.0',title:source4.name,level:'basic',language:'pl',compatibleAppVersion:'0.4.0',importer:{format:api.PROJECT_PACKAGE_FORMAT,formatVersion:1},dataOrigin:'synthetic',units:{time:'s',geometry:'mm',currency:'PLN'},entryFile:'projekt-pokazowy.json',variants:['BASIC-BASE','BASIC-CONSOLIDATED'],assets:{externalFiles:[],appearance:'built-in Table geometry, synthetic dimensions; no external downloads'},files:[...files].map(([path,bytes])=>({path,role:roles[path]??(path.endsWith('.xlsx')?'spreadsheet-template':'data-projection'),format:path.split('.').pop(),bytes:bytes.length,sha256:hash(bytes)}))});
for(const [path,bytes] of files){const target=resolve(out,path);if(check){if(!readFileSync(target).equals(bytes))throw new Error(`Nieaktualny plik: ${path}`);}else {mkdirSync(dirname(target),{recursive:true});writeFileSync(target,bytes);}}
console.log(`${check?'PASS reproducibility':'Generated'} 7.12.B: ${files.size} files, synthetic basic example; independent references preserved, scheduler not invoked`);
