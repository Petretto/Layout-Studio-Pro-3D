// Test artifact only. Browser acceptance uses the ordinary file importer.
import {build} from 'esbuild';
import {mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {createRequire} from 'node:module';
const out=resolve('outputs/qa/7_12a2b2b_ui');await mkdir(out,{recursive:true});
const bundle=resolve(out,'fixture.cjs');
await build({entryPoints:['tests/fixtures/physicalPlaybackUi.ts'],bundle:true,platform:'node',format:'cjs',outfile:bundle});
const {physicalPlaybackUiPackage}=createRequire(import.meta.url)(bundle);
await writeFile(resolve(out,'physical-test.project.json'),JSON.stringify(physicalPlaybackUiPackage(),null,2));
console.log('Prepared synthetic UI acceptance package: production 22 s; cart return ends 27 s; no geometric route declared.');
