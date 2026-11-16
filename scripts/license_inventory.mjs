import {readFileSync} from 'node:fs';
import {join,resolve} from 'node:path';

// npm's nested node_modules search, including scoped package names.
export function resolveLockedPackage(packages,from,name){
  let current=from;
  while(true){
    const key=(current?current+'/':'')+'node_modules/'+name;
    if(packages[key])return key;
    if(!current)return null;
    const pos=current.lastIndexOf('node_modules/');
    current=pos<0?'':current.slice(0,pos).replace(/\/$/,'');
  }
}

export function inventoryLock(lock,readInstalled){
  if(lock.lockfileVersion!==3||!lock.packages?.[''])throw new Error('Wymagany package-lock v3 z katalogiem pakietów.');
  const packages=lock.packages,root=packages[''],issues=[],flags=new Map();
  const walk=(scope,initial)=>{
    const queue=Object.entries(initial).map(([name,optional])=>({from:'',name,optional}));
    const seen=new Set();
    while(queue.length){
      const {from,name,optional}=queue.shift();
      const key=resolveLockedPackage(packages,from,name);
      if(!key){if(!optional)issues.push({type:'unresolved_dependency',scope,from,name});continue;}
      const state=flags.get(key)??new Set();state.add(scope);flags.set(key,state);
      if(seen.has(key))continue;seen.add(key);
      const entry=packages[key];
      if(entry.link){issues.push({type:'unsupported_link',scope,path:key});continue;}
      const opts=entry.optionalDependencies??{};
      const bundleField=entry.bundleDependencies??entry.bundledDependencies;
      const bundled=new Set(bundleField===true?Object.keys(entry.dependencies??{}):Array.isArray(bundleField)?bundleField:[]);
      for(const dep of Object.keys(entry.dependencies??{})){
        if(bundled.has(dep))issues.push({type:'bundled_dependency_not_inspected',scope,from:key,name:dep});
        else queue.push({from:key,name:dep,optional:dep in opts});
      }
      for(const dep of Object.keys(opts))if(!(dep in (entry.dependencies??{})))queue.push({from:key,name:dep,optional:true});
      for(const dep of Object.keys(entry.peerDependencies??{}))queue.push({from:key,name:dep,optional:!!entry.peerDependenciesMeta?.[dep]?.optional});
    }
  };
  const required=Object.fromEntries(Object.keys(root.dependencies??{}).map(name=>[name,false]));
  const optional=Object.fromEntries(Object.keys(root.optionalDependencies??{}).map(name=>[name,true]));
  walk('runtime',{...required,...optional});
  walk('build',Object.fromEntries(Object.keys(root.devDependencies??{}).map(name=>[name,false])));
  const inventory=[];
  for(const [path,scopes] of [...flags].sort(([a],[b])=>a.localeCompare(b))){
    const entry=packages[path],name=path.slice(path.lastIndexOf('node_modules/')+'node_modules/'.length);
    let installed=null;
    try{installed=readInstalled(path);}catch(error){
      if(!entry.optional)issues.push({type:'missing_or_unreadable_install',path,detail:error.code??'error'});
    }
    if(installed&&(installed.name!==name||installed.version!==entry.version))issues.push({type:'installed_identity_mismatch',path});
    const license=entry.license??installed?.license??null;
    if(!license||typeof license!=='string')issues.push({type:'license_missing_or_complex',path});
    if(installed&&entry.license&&installed.license&&entry.license!==installed.license)issues.push({type:'license_mismatch',path});
    if(!entry.integrity&&!entry.link)issues.push({type:'missing_integrity',path});
    inventory.push({path,name,version:entry.version??null,scopes:[...scopes].sort(),optional:!!entry.optional,installed:!!installed,license,resolved:entry.resolved??null,integrity:entry.integrity??null});
  }
  return {inventory,issues};
}

export function manifestMismatches(manifest,lock){
  const issues=[];
  for(const key of ['dependencies','devDependencies','optionalDependencies']){
    const actual=manifest[key]??{},locked=lock.packages[''][key]??{};
    if(JSON.stringify(Object.entries(actual).sort())!==JSON.stringify(Object.entries(locked).sort()))issues.push({type:'manifest_lock_mismatch',section:key});
  }
  return issues;
}
export function readInventory(rootDir){
  const lock=JSON.parse(readFileSync(join(rootDir,'package-lock.json'),'utf8'));
  const manifest=JSON.parse(readFileSync(join(rootDir,'package.json'),'utf8'));
  const result=inventoryLock(lock,path=>JSON.parse(readFileSync(resolve(rootDir,path,'package.json'),'utf8')));
  result.issues.push(...manifestMismatches(manifest,lock));
  return result;
}
