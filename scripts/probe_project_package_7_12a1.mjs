import {build} from 'esbuild';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {resolve} from 'node:path';
import {strict as assert} from 'node:assert';
process.on('uncaughtException',error=>{console.error(error.message);process.exitCode=1;});
const result=await build({stdin:{contents:`export * from './src/core/projectPackage';export * from './src/core/workspaceBackup';export * from './src/core/domainProject';export * from './src/core/domainMigrationPreview';export * from './src/core/domainDraftStorage';export * from './src/core/domainVariantComparison';`,resolveDir:process.cwd()},bundle:true,platform:'node',format:'esm',write:false});
const api=await import('data:text/javascript;base64,'+Buffer.from(result.outputFiles[0].text).toString('base64'));
const out=resolve('outputs/qa/7_12a1');mkdirSync(out,{recursive:true});
// These tiny synthetic capability probes are deliberately NOT complete demonstration projects.
const old=JSON.parse(readFileSync('outputs/qa/7_6a/probe_workspace.lsbackup.json','utf8'));
const map={};const port={getItem:k=>map[k]??null,setItem:(k,v)=>{map[k]=v;},removeItem:k=>{delete map[k];}};
api.restoreWorkspaceBackup(port,old);
const source4=api.makeProjectPackage(port,{dataOrigin:'synthetic'});
writeFileSync(resolve(out,'source4.project.json'),JSON.stringify(source4,null,2));
const source5=readFileSync('outputs/qa/7_6a/probe_v5.json','utf8');
port.setItem(api.STORAGE_KEYS.v5Stations,JSON.stringify({project:JSON.parse(source5),originalJson:source4.data.source4Json}));
port.removeItem(api.STORAGE_KEYS.v6DomainDraft);port.removeItem(api.STORAGE_KEYS.v6Variants);
const migrated=api.prepareDomainMigration(api.previewDomainMigrationFromV5(source5));
api.saveDomainDraft(port,migrated,null);
api.saveDomainVariant(port,{id:'PACKAGE-V5-BASE',name:'Syntetyczna baza ze źródła 5',category:'baseline',project:migrated.project,originalJson:source5,at:new Date().toISOString()},null);
const package5=api.makeProjectPackage(port,{dataOrigin:'synthetic'});
writeFileSync(resolve(out,'source5.project.json'),JSON.stringify(package5,null,2));
port.setItem(api.STORAGE_KEYS.v4Scenarios,JSON.stringify([{id:'KEEP-4',name:'Niezależny scenariusz 4',at:new Date().toISOString(),project:JSON.parse(source4.data.source4Json)}]));
writeFileSync(resolve(out,'seed.lsbackup.json'),JSON.stringify(api.createWorkspaceBackup(port),null,2));
writeFileSync(resolve(out,'original4.json'),source4.data.source4Json);
port.setItem(api.STORAGE_KEYS.v4Scenarios,'foreign bytes');port.setItem('unrelated','keep');
for(const pkg of [source4,package5]){
  api.importProjectPackage(port,pkg,JSON.stringify(api.createWorkspaceBackup(port)));
  assert.equal(map[api.STORAGE_KEYS.v4Scenarios],'foreign bytes');assert.equal(map.unrelated,'keep');
  assert.deepEqual(api.makeProjectPackage(port,{dataOrigin:'synthetic'}).data,pkg.data);
}
const bad=structuredClone(source4);bad.checksumSha256='0'.repeat(64);writeFileSync(resolve(out,'bad_checksum.project.json'),JSON.stringify(bad,null,2));
writeFileSync(resolve(out,'report.json'),JSON.stringify({at:new Date().toISOString(),result:'PASS',scope:'synthetic capability probes, not demo datasets',source4:api.describeProjectPackage(source4),source5:api.describeProjectPackage(package5),exactFamilyRoundTrip:true,preservedIndependentLibrary:true},null,2));
console.log('PASS 7.12.A1: source 4 and 5 exact family round trips, preserved independent library');
