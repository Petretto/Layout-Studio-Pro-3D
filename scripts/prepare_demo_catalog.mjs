// Ship demos as external files, never import production data into the JS bundle.
import {readFile,mkdir,writeFile,readdir,lstat,mkdtemp,rename} from 'node:fs/promises';
import {resolve,relative} from 'node:path';
import {createHash} from 'node:crypto';
const root=resolve(import.meta.dirname,'..'),destination=resolve(root,'public/demo-projects');
const check=process.argv.includes('--check');
const allowed=['01_zestaw_montazowy','02_wozek_warsztatowy','03_modul_urzadzenia'];
const legacyAssets=new Set(['04_eko.project.json','04_eko.zip']);
const digest=buffer=>createHash('sha256').update(buffer).digest('hex');
function crc32(bytes){let c=0xffffffff;for(const b of bytes){c^=b;for(let k=0;k<8;k++)c=(c>>>1)^((c&1)?0xedb88320:0);}return (c^0xffffffff)>>>0;}
// Deterministic, uncompressed ZIP, UTF-8 filenames, fixed DOS date 1980-01-01.
function zip(files){
  const local=[],central=[];let offset=0;
  for(const [path,bytes] of files){
    const name=Buffer.from(path),crc=crc32(bytes),header=Buffer.alloc(30),entry=Buffer.alloc(46);
    header.writeUInt32LE(0x04034b50);header.writeUInt16LE(20,4);header.writeUInt16LE(0x800,6);header.writeUInt16LE(33,12);header.writeUInt32LE(crc,14);header.writeUInt32LE(bytes.length,18);header.writeUInt32LE(bytes.length,22);header.writeUInt16LE(name.length,26);
    entry.writeUInt32LE(0x02014b50);entry.writeUInt16LE(20,4);entry.writeUInt16LE(20,6);entry.writeUInt16LE(0x800,8);entry.writeUInt16LE(33,14);entry.writeUInt32LE(crc,16);entry.writeUInt32LE(bytes.length,20);entry.writeUInt32LE(bytes.length,24);entry.writeUInt16LE(name.length,28);entry.writeUInt32LE(offset,42);
    local.push(header,name,bytes);central.push(entry,name);offset+=header.length+name.length+bytes.length;
  }
  const directory=Buffer.concat(central),end=Buffer.alloc(22);end.writeUInt32LE(0x06054b50);end.writeUInt16LE(files.length,8);end.writeUInt16LE(files.length,10);end.writeUInt32LE(directory.length,12);end.writeUInt32LE(offset,16);
  return Buffer.concat([...local,directory,end]);
}
async function walk(directory,prefix=''){const result=[];for(const item of (await readdir(directory,{withFileTypes:true})).sort((a,b)=>a.name.localeCompare(b.name,'en'))){const path=prefix+item.name;if(item.isDirectory())result.push(...await walk(resolve(directory,item.name),path+'/'));else if(item.isFile())result.push([path,await readFile(resolve(directory,item.name))]);else throw new Error(`Unsupported asset: ${path}`);}return result;}
const source=JSON.parse(await readFile(resolve(root,'przyklady/katalog.json'),'utf8'));
if(source.formatVersion!==1||!Array.isArray(source.projects))throw new Error('Unsupported catalog');
if(source.projects.length!==allowed.length||source.projects.some((item,index)=>item.directory!==allowed[index]))throw new Error('Public demo catalog must contain only the approved packages in order');
const outputs=new Map(),projects=[],ids=new Set();
for(const item of source.projects){
  if(!/^[0-9]{2}_[a-z0-9_]+$/.test(item.directory)||ids.has(item.directory))throw new Error('Invalid or duplicate demo directory');
  ids.add(item.directory);
  const files=await walk(resolve(root,'przyklady',item.directory)),map=new Map(files),manifest=JSON.parse(map.get('manifest.json').toString());
  for(const file of manifest.files){const bytes=map.get(file.path);if(!bytes||bytes.length!==file.bytes||digest(bytes)!==file.sha256.toLowerCase())throw new Error(`Manifest mismatch: ${item.directory}/${file.path}`);}
  const packageBytes=map.get(manifest.entryFile);if(!packageBytes)throw new Error('Missing demo entry file');
  const archive=zip(files.map(([path,bytes])=>[`${item.directory}/${path}`,bytes]));
  const jsonPath=`${item.directory}.project.json`,zipPath=`${item.directory}.zip`;
  outputs.set(jsonPath,packageBytes);outputs.set(zipPath,archive);
  projects.push({id:item.directory,title:manifest.title,level:manifest.level,dataOrigin:manifest.dataOrigin,summary:item.summary,scope:item.scope,version:manifest.packageVersion,fileCount:files.length,packagePath:jsonPath,archivePath:zipPath,archiveBytes:archive.length,packageSha256:digest(packageBytes),archiveSha256:digest(archive)});
}
outputs.set('index.json',Buffer.from(JSON.stringify({formatVersion:1,projects},null,2)+'\n'));
let existing=[];
try{
  const directory=await lstat(destination);
  if(!directory.isDirectory()||directory.isSymbolicLink())throw new Error('Demo catalog destination must be a real directory');
  existing=await readdir(destination,{withFileTypes:true});
}catch(error){if(error.code!=='ENOENT')throw error;}
for(const item of existing){
  if(!item.isFile()||(!outputs.has(item.name)&&!(legacyAssets.has(item.name)&&!check)))throw new Error(`Unexpected catalog asset: ${item.name}`);
}
let matches=existing.length===outputs.size;
for(const [path,bytes] of outputs){
  try{if(!(await readFile(resolve(destination,path))).equals(bytes))matches=false;}
  catch(error){if(error.code==='ENOENT')matches=false;else throw error;}
}
if(check&&!matches)throw new Error('Outdated or incomplete demo catalog');
if(!check&&!matches){
  const backupRoot=resolve(root,'outputs/qa/p4b_catalog_backups');
  await mkdir(backupRoot,{recursive:true});
  const stage=await mkdtemp(resolve(backupRoot,'stage-'));
  for(const [path,bytes] of outputs)await writeFile(resolve(stage,path),bytes);
  let previous;
  if(await lstat(destination).catch(error=>error.code==='ENOENT'?null:Promise.reject(error))){
    previous=resolve(await mkdtemp(resolve(backupRoot,'run-')),'demo-projects');
    await rename(destination,previous);
  }
  try{await rename(stage,destination);}
  catch(error){if(previous)await rename(previous,destination);throw error;}
  if(previous)console.log(`Previous catalog retained locally: ${relative(root,previous)}`);
}
console.log(`${check?'PASS':'Prepared'} external demo catalog: ${projects.length} projects, ${outputs.size} assets; source manifests verified`);
