import { build } from 'esbuild';
import { spawnSync } from 'node:child_process';
import { mkdtempSync,rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
const temp=mkdtempSync(join(tmpdir(),'layout-studio-tests-'));
try{const out=join(temp,'core.test.js');await build({entryPoints:['tests/core.test.ts','tests/network.test.ts'],outdir:temp,bundle:true,platform:'node',format:'cjs',target:'node20'});const r=spawnSync(process.execPath,['--test',out,join(temp,'network.test.js')],{stdio:'inherit'});process.exitCode=r.status??1;}finally{rmSync(temp,{recursive:true,force:true});}
