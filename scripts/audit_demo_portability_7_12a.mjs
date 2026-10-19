import {build} from 'esbuild';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {resolve} from 'node:path';
import {strict as assert} from 'node:assert';
import {createHash} from 'node:crypto';
import XLSX from 'xlsx';
// Do not dump the bundled data URL in an error stack.
process.on('uncaughtException',error=>{console.error(error.message);process.exitCode=1;});

// Capability probes only: synthetic one-operation input, not a complete demonstration project.
const paths=['src/core/project.ts','src/core/validation.ts','src/core/stationMigration.ts','src/core/stationProject.ts','src/core/domainProject.ts','src/core/domainMigrationPreview.ts','src/core/domainDraftStorage.ts','src/core/domainVariantComparison.ts','src/core/portableArchive.ts','src/core/workspaceBackup.ts','src/core/export/excelImporter.ts','src/App.tsx','src/components/studio/StationWorkspace.tsx','src/components/studio/DomainDraftPanel.tsx','src/components/studio/DomainVariantComparisonPanel.tsx','src/components/studio/WorkspaceBackupModal.tsx'];
const exports={project:['newProject','derive'],validation:['parseProject'],stationMigration:['previewStationMigration','prepareStationMigration'],stationProject:['parseStationProjectV5'],domainProject:['prepareDomainMigration','parseDomainProjectV6'],domainMigrationPreview:['previewDomainMigrationFromV4'],domainDraftStorage:['saveDomainDraft','readDomainDraft','DOMAIN_DRAFT_STORAGE_KEY'],domainVariantComparison:['saveDomainVariant','readDomainVariants','DOMAIN_VARIANTS_STORAGE_KEY'],portableArchive:['makePortableArchive','readPortableArchive'],workspaceBackup:['createWorkspaceBackup','validateWorkspaceBackup','restoreWorkspaceBackup','STORAGE_KEYS']};
const contents=Object.entries(exports).map(([file,names])=>`export {${names.join(',')}} from './src/core/${file}';`).join('\n')+`\nexport {processRows,bomRows,importProcess,importBOM} from './src/core/export/excelImporter';`;
const result=await build({stdin:{contents,resolveDir:process.cwd()},bundle:true,platform:'node',format:'esm',write:false});
const api=await import('data:text/javascript;base64,'+Buffer.from(result.outputFiles[0].text).toString('base64'));
const fixed=process.argv.includes('--recovery-fixed');
const out=resolve(fixed?'outputs/qa/7_6a':'outputs/qa/7_12a');mkdirSync(out,{recursive:true});
const at='2026-10-19T00:00:00.000Z',memory=()=>{
  const values={};return {values,getItem:key=>values[key]??null,setItem:(key,value)=>{values[key]=value;},removeItem:key=>{delete values[key];}};
};
const input={...api.newProject(),id:'AUDIT-7-12A',name:'AUDYT 7.12.A — syntetyczna próba przenośności',createdAt:at,updatedAt:at,
  demand:{yearlyDemand:25000,workingDaysPerYear:250,shiftsPerDay:1,hoursPerShift:8,plannedBreaksMinutesPerShift:0,oeePercent:100},
  facility:{widthMm:10000,lengthMm:10000,heightMm:3000,gridSizeMm:1000,isConfirmed:false},
  processSteps:[{id:'A-OP1',name:'Syntetyczna operacja audytowa',standardTimeSeconds:60,vaTimeSeconds:50,nvaTimeSeconds:10,sequenceNumber:1,predecessorIds:[]}],
  bom:[{id:'BOM-1',partNumber:'AUDIT-P1',name:'Syntetyczny komponent',quantityPerUnit:1,container:'BoxKLT',packageQuantity:10,associatedProcessStepId:'A-OP1',unitCost:0}]};
const v4=api.derive(api.parseProject(JSON.stringify(input))).project,source=JSON.stringify(v4);
assert.deepEqual(api.parseProject(source),api.parseProject(JSON.stringify(api.parseProject(source))));
for(const [rows,read,expected] of [[api.processRows(v4.processSteps),api.importProcess,v4.processSteps],[api.bomRows(v4.bom),bytes=>api.importBOM(bytes,new Set(['A-OP1'])),v4.bom]]){
  const book=XLSX.utils.book_new();XLSX.utils.book_append_sheet(book,XLSX.utils.json_to_sheet(rows),'Dane');
  const imported=read(XLSX.write(book,{type:'array',bookType:'xlsx'}));assert.deepEqual(imported.errors,[]);assert.equal(imported.items.length,expected.length);
}
assert.deepEqual(api.parseProject(JSON.stringify(api.readPortableArchive(api.makePortableArchive(4,v4,''),4).project)),api.parseProject(source));
const v5=api.prepareStationMigration(api.previewStationMigration(source,()=> 'ST-AUDIT-1')).project;
assert.deepEqual(api.parseStationProjectV5(JSON.stringify(api.readPortableArchive(api.makePortableArchive(5,v5,'',source),5).project)),api.parseStationProjectV5(JSON.stringify(v5)));
const prepared=api.prepareDomainMigration(api.previewDomainMigrationFromV4(source,()=> 'ST-AUDIT-1'));
const draft=memory();api.saveDomainDraft(draft,prepared,null,at);assert.equal(api.readDomainDraft(draft).status,'valid');
const raw=draft.getItem(api.DOMAIN_DRAFT_STORAGE_KEY);assert.equal(JSON.parse(raw).originalJson,source);
api.saveDomainVariant(draft,{id:'AUDIT-VAR1',name:'Audytowa baza',category:'baseline',originalJson:source,project:prepared.project,at},null);
assert.equal(api.readDomainVariants(draft).status,'valid');
assert.throws(()=>api.parseProject(JSON.stringify(prepared.project)));
assert.throws(()=>api.parseProject(raw));
assert.throws(()=>api.readPortableArchive(JSON.stringify({format:'layout-studio-portable-archive',formatVersion:1,schemaVersion:6,project:prepared.project}),4));
draft.setItem(api.STORAGE_KEYS.v4Project,JSON.stringify({project:v4,at,importSourceBase64:''}));
const backup=api.createWorkspaceBackup(draft,'0.4.0',at),valid=api.validateWorkspaceBackup(JSON.stringify(backup));assert.equal(valid.valid,true);assert.equal(valid.checksumMatches,true);
if(fixed){const historical=api.validateWorkspaceBackup(readFileSync('outputs/qa/7_12a/probe_workspace.lsbackup.json','utf8'));assert.equal(historical.valid,true);assert.equal(historical.payload.summary.variantsV6Count,1);}
assert.equal(backup.summary.variantsV6Count,fixed?1:0);assert.equal(api.readDomainVariants(draft).saved.variants.length,1);
const fresh=memory();api.restoreWorkspaceBackup(fresh,valid.payload);assert.equal(api.readDomainDraft(fresh).status,'valid');assert.equal(api.readDomainVariants(fresh).status,'valid');assert.deepEqual(fresh.values,draft.values);
// Capture actual limitations. PASS below means these observations are reproducible, not accepted behavior.
const checksum=structuredClone(backup);checksum.checksumSha256='0'.repeat(64);const checksumResult=api.validateWorkspaceBackup(JSON.stringify(checksum));assert.equal(checksumResult.valid,!fixed);assert.equal(checksumResult.checksumMatches,false);
const dirty=memory();dirty.setItem(api.STORAGE_KEYS.v6DomainDraft,JSON.stringify(prepared.project));dirty.setItem(api.STORAGE_KEYS.v6Variants,'not-json');
const malformedBackup=api.createWorkspaceBackup(dirty,'0.4.0',at);assert.equal(api.validateWorkspaceBackup(JSON.stringify(malformedBackup)).valid,!fixed);
const brokenRestore=memory();if(fixed){assert.throws(()=>api.restoreWorkspaceBackup(brokenRestore,malformedBackup));assert.deepEqual(brokenRestore.values,{});}else{api.restoreWorkspaceBackup(brokenRestore,malformedBackup);assert.equal(api.readDomainDraft(brokenRestore).status,'corrupt');assert.equal(api.readDomainVariants(brokenRestore).status,'corrupt');}
const target=memory();target.setItem(api.STORAGE_KEYS.v5Stations,'previous unrelated slot');api.restoreWorkspaceBackup(target,backup);assert.equal(target.getItem(api.STORAGE_KEYS.v5Stations),fixed?null:'previous unrelated slot');
const partial=memory();partial.setItem(api.STORAGE_KEYS.v4Project,'old');partial.setItem(api.STORAGE_KEYS.v6DomainDraft,'old draft');
assert.throws(()=>api.restoreWorkspaceBackup({...partial,setItem:(key,value)=>{if(key===api.STORAGE_KEYS.v6DomainDraft)throw new Error('simulated quota');partial.setItem(key,value);}},backup),/simulated quota/);
if(fixed)assert.equal(partial.getItem(api.STORAGE_KEYS.v4Project),'old');else assert.notEqual(partial.getItem(api.STORAGE_KEYS.v4Project),'old');assert.equal(partial.getItem(api.STORAGE_KEYS.v6DomainDraft),'old draft');
writeFileSync(resolve(out,'probe_v4.json'),JSON.stringify(v4,null,2));writeFileSync(resolve(out,'probe_v5.json'),JSON.stringify(v5,null,2));writeFileSync(resolve(out,'probe_v6_save.json'),raw);writeFileSync(resolve(out,'probe_workspace.lsbackup.json'),JSON.stringify(backup,null,2));
const report={at:new Date().toISOString(),scope:fixed?'7.6a recovery regression of 7.12.A probes':'7.12.A historical capability audit; use --recovery-fixed after 7.6a',positive:{xlsxProcessAndBom:true,jsonV4AndV5Archives:true,domainDraftLocalRoundTrip:true,domainVariantLocalRoundTrip:true,workspaceFreshMemoryRoundTrip:true},gaps:{mainImportRejectsV6:true,checksumMismatchStillValid:!fixed,backupAcceptsInvalidDraftEnvelopeAndVariantLibrary:!fixed,nullSlotsDoNotClearPreviousData:!fixed,writeFailureCanLeavePartialRestore:!fixed,v6VariantSummaryZeroForOneSavedVariant:!fixed},sources:paths.map(path=>({path,sha256:createHash('sha256').update(readFileSync(path)).digest('hex')}))};
writeFileSync(resolve(out,'capabilities.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({audit:'PASS',positive:report.positive,gaps:report.gaps}));
