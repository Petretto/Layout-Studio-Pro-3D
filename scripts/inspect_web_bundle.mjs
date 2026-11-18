import {build} from 'vite';
import {createHash} from 'node:crypto';
import {existsSync,mkdtempSync,mkdirSync,readFileSync,readdirSync,writeFileSync} from 'node:fs';
import {join,relative,resolve} from 'node:path';

const root=resolve('.'), chunks=new Map(),outputs=new Map();
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const asBytes=value=>Buffer.isBuffer(value)?value:Buffer.from(value);
function lockedPath(moduleId){
  const clean=moduleId.replace(/^\0/,'').split('?')[0];
  const path=relative(root,clean).replace(/\\/g,'/');
  return path.match(/^(node_modules\/(?:(?:@[^/]+\/)?[^/]+\/node_modules\/)*(?:@[^/]+\/)?[^/]+)/)?.[1]??null;
}
function collector(kind){
  return {name:'p4a-bundle-inventory-'+kind,enforce:'post',generateBundle:{order:'post',handler(_options,bundle){
    for(const [file,item] of Object.entries(bundle)){
      if(item.type==='chunk'){
        const modules=Object.entries(item.modules).filter(([,m])=>m.renderedLength>0).map(([id])=>lockedPath(id)).filter(Boolean);
        chunks.set(file,{kind,file,packages:[...new Set(modules)].sort()});
      }
      const sha256=hash(asBytes(item.type==='chunk'?item.code:item.source));
      if(outputs.has(file)&&outputs.get(file).sha256!==sha256)throw new Error('Niespójny wynik builda: '+file);
      outputs.set(file,{file,sha256});
    }
  }}};
}
await build({configFile:join(root,'vite.config.ts'),build:{write:false,emptyOutDir:false},plugins:[collector('app')],worker:{plugins:()=>[collector('worker')]},logLevel:'warn'});
if(!chunks.size)throw new Error('Nie zebrano modułów buildu. Raport nieważny.');
const lock=JSON.parse(readFileSync(join(root,'package-lock.json'),'utf8'));
const jsPaths=new Set([...chunks.values()].flatMap(c=>c.packages));
const cssImport=/^@import\s+["']tailwindcss["']\s*;/m.test(readFileSync(join(root,'src','index.css'),'utf8'));
const cssPaths=cssImport&&[...outputs.keys()].some(file=>file.endsWith('.css'))?['node_modules/tailwindcss']:[];
const paths=[...new Set([...jsPaths,...cssPaths])].sort();
const packages=paths.map(path=>{
  const entry=lock.packages[path],folder=join(root,path);
  const meta=existsSync(join(folder,'package.json'))?JSON.parse(readFileSync(join(folder,'package.json'),'utf8')):null;
  const files=existsSync(folder)?readdirSync(folder).filter(name=>/^(license|licence|notice|copyright)(\.|$)/i.test(name)).sort():[];
  return {path,name:meta?.name??null,version:meta?.version??null,declaredLicense:meta?.license??null,lockVersion:entry?.version??null,licenseFiles:files,source:jsPaths.has(path)?'rendered JS':'CSS import'};
});
const compared=[...outputs.values()].map(item=>{
  const file=join(root,'dist',item.file);
  return {...item,dist:existsSync(file)?(hash(readFileSync(file))===item.sha256?'MATCH':'DIFFERENT'):'MISSING'};
});
const distTop=existsSync(join(root,'dist'))?readdirSync(join(root,'dist')):[];
const noticeRoot=join(root,'dist','third-party-licenses');
const manifest=JSON.parse(readFileSync(join(noticeRoot,'manifest.json'),'utf8'));
const index=readFileSync(join(noticeRoot,'index.html'),'utf8');
const noticeIssues=[];
for(const pkg of packages){
  const rows=manifest.filter(row=>row.name===pkg.name);
  const row=rows[0];
  if(rows.length!==1||row.version!==pkg.version||row.license!==pkg.declaredLicense||!/^[-a-z0-9]+\.txt$/.test(row.file)){
    noticeIssues.push({package:pkg.name,reason:'manifest mismatch'});
    continue;
  }
  const published=join(noticeRoot,row.file), upstream=join(root,pkg.path,'LICENSE');
  if(!existsSync(published)||!existsSync(upstream)||!readFileSync(published).equals(readFileSync(upstream))){
    noticeIssues.push({package:pkg.name,reason:'LICENSE text missing or different'});
  }
  if(!index.includes(`href="/third-party-licenses/${row.file}"`)||!index.includes(pkg.version)){
    noticeIssues.push({package:pkg.name,reason:'index link or version missing'});
  }
}
for(const row of manifest)if(!packages.some(pkg=>pkg.name===row.name))noticeIssues.push({package:row.name,reason:'not identified in measured bundle'});
const report={
  method:'Vite build write:false, rendered JS module IDs including workers, explicit Tailwind CSS import, LICENSE files compared with installed packages',
  packages,chunks:[...chunks.values()],compared,distTop,noticeIssues,
  unmatchedPackages:packages.filter(p=>!p.name||!p.lockVersion||p.version!==p.lockVersion).map(p=>p.path)
};
const parent=join(root,'outputs','qa','p4a_bundle');mkdirSync(parent,{recursive:true});
const dir=mkdtempSync(join(parent,'run_'));writeFileSync(join(dir,'report.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({report:relative(root,join(dir,'report.json')),packages:packages.length,chunks:chunks.size,distMatches:compared.filter(x=>x.dist==='MATCH').length,distDifferent:compared.filter(x=>x.dist==='DIFFERENT').length,distMissing:compared.filter(x=>x.dist==='MISSING').length,unmatched:report.unmatchedPackages,noticeIssues}));
if(noticeIssues.length||report.unmatchedPackages.length||compared.some(x=>x.dist!=='MATCH'))process.exitCode=1;
