import { build } from 'esbuild';
import { spawnSync } from 'node:child_process';
import { mkdtempSync,rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
const temp=mkdtempSync(join(tmpdir(),'layout-studio-tests-'));
try{
  const args=process.argv.slice(2),nodeArgs=[];
  let suite='all';
  for(let i=0;i<args.length;i++){
    const arg=args[i];
    if(arg==='--run')continue; // Preserve the existing command's compatibility.
    if(arg.startsWith('--suite='))suite=arg.slice('--suite='.length);
    else if(arg.startsWith('--test-name-pattern='))nodeArgs.push(arg);
    else if(arg==='--test-name-pattern'&&args[i+1])nodeArgs.push(arg,args[++i]);
    else throw new Error(`Unknown test option: ${arg}. Use --suite=core|network|all and --test-name-pattern=...`);
  }
  if(!['core','network','all'].includes(suite))throw new Error(`Unknown suite: ${suite}`);
  const names=suite==='all'?['core','network']:[suite];
  await build({entryPoints:names.map(name=>`tests/${name}.test.ts`),outdir:temp,bundle:true,platform:'node',format:'cjs',target:'node20'});
  const r=spawnSync(process.execPath,['--test',...nodeArgs,...names.map(name=>join(temp,`${name}.test.js`))],{stdio:'inherit'});
  process.exitCode=r.status??1;
}finally{rmSync(temp,{recursive:true,force:true});}
