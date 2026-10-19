import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {ok,deepStrictEqual} from 'node:assert';
import XLSX from 'xlsx';
import {build} from 'esbuild';

// Audit existing evidence only. Never modifies source workbooks, project files or collection forms.
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const processPath='tests/Test Eko.xlsx',bomPath='tests/Test Eko BOM.xlsx';
const confirmationPath='dane/eko/7_1/potwierdzenia_zrodel.json';
const evidence=JSON.parse(readFileSync(resolve(root,confirmationPath),'utf8'));
const confirmation=evidence.confirmations.find(c=>c.id==='EKO-U1');
ok(confirmation?.sourceIsRealProductionData&&confirmation.measurementPeriod&&confirmation.frameVariant,'Missing explicit user confirmation');
const syntheticConfirmation=evidence.confirmations.find(c=>c.id==='EKO-U2');
ok(syntheticConfirmation?.timeEvidence==='synthetic-test'&&evidence.clarifications.find(c=>c.id==='EKO-C1')?.resolution==='remain-synthetic','Recheck synthetic operation confirmation');
const staffingConfirmation=evidence.confirmations.find(c=>c.id==='EKO-U4');
ok(staffingConfirmation?.personCountScope==='whole-process'&&staffingConfirmation.totalProcessPersonCount===13,'Recheck process staffing confirmation');
const manualConfirmation=evidence.confirmations.find(c=>c.id==='EKO-U5');
ok(manualConfirmation?.scope==='whole-process'&&manualConfirmation.workMode==='manual-only'&&manualConfirmation.hasMachinesOrAutomation===false,'Recheck explicit manual-only process confirmation');
ok(manualConfirmation.packaging?.operationId==='OP21'&&manualConfirmation.packaging.workerCount===2&&manualConfirmation.packaging.presenceCoverage==='entire-operation','Recheck continuous two-person packaging');
const sourcePaths=[processPath,bomPath,'src/core/models/ekoProject.ts','tests/qa/Eko_D5_actual_export_v5.json','tests/fixtures/ekoDomainScenarios.ts','WERYFIKACJA_EKO_2_9.md',confirmationPath];
const sources=sourcePaths.map((path,index)=>{
  const bytes=readFileSync(resolve(root,path));
  const confirmed=confirmation.sourcePaths.includes(path);
  return {id:`EKO-S${index+1}`,path,bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex'),measurementPeriod:path===processPath?confirmation.measurementPeriod:null,productionConfirmation:confirmed?confirmation.id:null};
});
const readSheet=(path,expectedSheet)=>{
  const book=XLSX.read(readFileSync(resolve(root,path)),{type:'buffer'});
  ok(book.Sheets[expectedSheet],`Missing sheet ${expectedSheet}`);
  return XLSX.utils.sheet_to_json(book.Sheets[expectedSheet],{header:1,defval:null,blankrows:true});
};
const processRows=readSheet(processPath,'Dane'),bomRows=readSheet(bomPath,'BOM');
const col=(headers,name)=>{const i=headers.indexOf(name);ok(i>=0,`Missing column ${name}`);return i;};
const ph=processRows[0],bh=bomRows[0];
const idCol=col(ph,'ID Kroku'),nameCol=col(ph,'Nazwa Operacji'),timeCol=col(ph,'Czas Standardowy [s]');
const testIds=new Set(['OP22','OP23','OP24','OP25']);
deepStrictEqual([...syntheticConfirmation.operationIds].sort(),[...testIds].sort(),'Synthetic source confirmation has different IDs');
ok(processRows.flat().some(v=>typeof v==='string'&&v.includes('syntetyczne czasy testowe')),'Recheck source assumptions before classifying test rows');
const operations=processRows.slice(1).flatMap((r,index)=>!r[idCol]?[]:[{
  operationId:String(r[idCol]),name:r[nameCol],declaredStandardTimeSeconds:r[timeCol],
  evidenceClass:testIds.has(String(r[idCol]))?'synthetic-test':'user-confirmed-real-source',
  source:{id:'EKO-S1',sheet:'Dane',row:index+2,cell:XLSX.utils.encode_cell({r:index+1,c:timeCol})},
  rawObservedDurationSeconds:null,manualIntervalsSeconds:null,machineIntervalsSeconds:[],operatorPresenceIntervalsSeconds:null,
  workMode:'manual-only',workModeConfirmation:manualConfirmation.id,
  crewPresenceRequirement:String(r[idCol])==='OP21'?{workerCount:2,coverage:'entire-operation',workerIds:null,confirmation:manualConfirmation.id}:null,
  crewIds:null,measurementPeriod:testIds.has(String(r[idCol]))?null:confirmation.measurementPeriod,method:null,
  measuredCrewWorkerCount:staffingConfirmation.operationWorkerCounts[String(r[idCol])]??null,
  crewCountConfirmation:staffingConfirmation.operationWorkerCounts[String(r[idCol])]===undefined?null:staffingConfirmation.id,
  confirmation:testIds.has(String(r[idCol]))?syntheticConfirmation.id:confirmation.id,
}]);
ok(new Set(operations.map(o=>o.operationId)).size===operations.length,'Duplicate operation IDs');
ok(operations.every(o=>Number.isFinite(o.declaredStandardTimeSeconds)&&o.declaredStandardTimeSeconds>0),'Nonpositive/non-numeric declared time');
ok(operations.filter(o=>o.evidenceClass==='synthetic-test').length===4,'Recheck synthetic operation list');
deepStrictEqual(Object.keys(staffingConfirmation.operationWorkerCounts).sort(),operations.filter(o=>o.evidenceClass==='user-confirmed-real-source').map(o=>o.operationId).sort(),'Crew counts must cover measured operations only');
ok(operations.filter(o=>o.operationId!=='OP21'&&o.evidenceClass==='user-confirmed-real-source').every(o=>o.measuredCrewWorkerCount===1),'Recheck single-worker operations');
ok(operations.find(o=>o.operationId==='OP21')?.measuredCrewWorkerCount===2,'Recheck two-worker packaging');
const bundle=await build({stdin:{contents:"export {DEFAULT_EKO_PROJECT} from './src/core/models/ekoProject';",resolveDir:root},bundle:true,platform:'node',format:'esm',write:false});
const {DEFAULT_EKO_PROJECT:example}=await import('data:text/javascript;base64,'+Buffer.from(bundle.outputFiles[0].text).toString('base64'));
const workbookTimes=operations.map(o=>[o.operationId,o.declaredStandardTimeSeconds]).sort((a,b)=>a[0].localeCompare(b[0]));
const appTimes=example.processSteps.map(o=>[o.id,o.standardTimeSeconds]).sort((a,b)=>a[0].localeCompare(b[0]));
deepStrictEqual(workbookTimes,appTimes,'Workbook vs built-in example time mismatch');
const bomItems=bomRows.slice(1).filter(r=>r[col(bh,'Nr Części (Part No)')]);
ok(bomItems.every(r=>operations.some(o=>o.operationId===r[col(bh,'Przypisany Krok')])),'BOM references an unknown operation');
ok(bomItems.length===example.bom.length,'Workbook vs built-in BOM count mismatch');
const report={kind:'eko-source-audit-not-an-application-project',auditVersion:2,auditedAt:new Date().toISOString(),
  productionDataAccepted:false,notice:'User confirms real source, July 2026, frame variant 1.4. Four synthetic times remain examples per explicit clarification. Complete production model not accepted.',sources,
  userConfirmations:evidence.confirmations,clarifications:evidence.clarifications,
  staffing:{confirmationId:staffingConfirmation.id,totalProcessPersonCount:13,operationWorkerCounts:staffingConfirmation.operationWorkerCounts,workerIdentitiesAndSharing:null,simultaneousAvailabilityInferred:false,timeScalingApplied:false},
  workMode:{confirmationId:manualConfirmation.id,mode:'manual-only',hasMachinesOrAutomation:false,packagingPresence:manualConfirmation.packaging,manualPhaseIntervalsKnown:false},
  process:{sourceId:'EKO-S1',sheet:'Dane',operations:operations.length,userConfirmedSourceValues:operations.filter(o=>o.evidenceClass==='user-confirmed-real-source').length,syntheticTestValues:4,items:operations},
  bom:{sourceId:'EKO-S2',sheet:'BOM',items:bomItems.length,productionConfirmation:confirmation.id,stockOrConsumptionInferred:false},
  builtInExample:{sourceId:'EKO-S3',sameOperationIdsAndDeclaredTimes:true,sameBomCount:true,facilityAndDemand:'demonstration-assumptions'},
  testFixture:{sourceId:'EKO-S5',workersAndRoles:'test-assumptions',bodyInitiallyPresent:'test-assumption'},
  remainingEvidence:['measurement-method-and-sample-detail','manual-phase-and-other-operator-presence-profiles','actual-crews-and-competencies','concurrency-approval','station-copies-and-equipment','measured-geometry-and-directed-routes','buffer-capacity-and-operator-blocking','calendar-and-initial-state','explicit-material-consumption-and-deliveries','observed-production-events-and-losses','comparison-conditions-and-tolerances-for-7.2','measured-replacements-for-OP22-OP25'],
};
// Keep the historical audit and any local changes to it intact.
const output=resolve(root,'outputs/data_audit/eko_7_1c.json');mkdirSync(dirname(output),{recursive:true});writeFileSync(output,JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({output,operations:operations.length,userConfirmed:report.process.userConfirmedSourceValues,synthetic:4,frameVariant:confirmation.frameVariant,measurementPeriod:confirmation.measurementPeriod,bomItems:bomItems.length,sourceHashes:sources.length,workbookVsExample:'PASS',productionDataAccepted:false}));
