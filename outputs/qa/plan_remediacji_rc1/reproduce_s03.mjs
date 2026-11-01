// Read-only reproduction against an isolated in-memory store; no browser data.
import {build} from 'esbuild';
import {spawnSync} from 'node:child_process';
import {resolve} from 'node:path';
import {writeFileSync,unlinkSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {randomUUID} from 'node:crypto';
const root=resolve(import.meta.dirname,'../../..');
const bundle=resolve(tmpdir(),`layout-s03-${randomUUID()}.cjs`);
await build({stdin:{loader:'ts',resolveDir:root,sourcefile:'s03-planning-reproduction.ts',contents:`
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {newProject} from './src/core/project';
import {parseProjectPackage,importProjectPackage} from './src/core/projectPackage';
import {createWorkspaceBackup,STORAGE_KEYS} from './src/core/workspaceBackup';
const client={...newProject(),name:'SYNTHETIC_CLIENT_BEFORE_S03'};
const oldRaw=JSON.stringify({project:client,at:'2026-11-01T10:00:00Z',importSourceBase64:''});
const slots=new Map<string,string>([[STORAGE_KEYS.v4Project,oldRaw]]);
const port={getItem:(k:string)=>slots.get(k)??null,setItem:(k:string,v:string)=>{slots.set(k,v)},removeItem:(k:string)=>{slots.delete(k)}};
const pkg=parseProjectPackage(readFileSync('przyklady/01_zestaw_montazowy/projekt-pokazowy.json','utf8'));
const before=JSON.stringify(createWorkspaceBackup(port),null,2);
const result=importProjectPackage(port,pkg,before);
assert.equal(result.success,true);
assert.notEqual(slots.get(STORAGE_KEYS.v4Project),oldRaw);
assert.equal([...slots.values()].some(v=>v.includes(client.name)),false);
assert.equal(typeof result.rollbackSnapshot,'string');
console.log(JSON.stringify({finding:'S-03',level:'API_ONLY',reproduced:true,syntheticStorageOnly:true,changedKeys:result.restoredKeys,previousDataPersisted:false,rollbackReturnedButNotPersisted:true,uiVerified:false},null,2));
`},outfile:bundle,bundle:true,platform:'node',format:'cjs',target:'node20'});
let result;
try {result=spawnSync(process.execPath,[bundle],{cwd:root,encoding:'utf8'});}
finally {unlinkSync(bundle);}
writeFileSync(resolve(import.meta.dirname,'reproduce_s03.result.json'),result.stdout||JSON.stringify({error:result.stderr}));
process.stdout.write(result.stdout);process.stderr.write(result.stderr);process.exitCode=result.status??1;
