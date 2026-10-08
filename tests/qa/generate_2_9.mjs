import {build} from 'esbuild';
const bundle=await build({stdin:{contents:`
import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import {createEkoTestScenario} from './tests/fixtures/ekoDomainScenarios';
import {scheduleWorkerRun} from './src/core/workerSchedule';
const originalJson=readFileSync('tests/qa/Eko_D5_actual_export_v5.json','utf8');
const path='outputs/scenarios/eko_2_9';mkdirSync(path,{recursive:true});
for(const variant of ['parallel','sequential','shared-worker']){
  const prepared=createEkoTestScenario(originalJson,variant);
  writeFileSync(path+'/'+variant+'.json',JSON.stringify({kind:'domain-draft-save',version:1,sourceSchemaVersion:5,
    originalJson:prepared.originalJson,project:prepared.project,at:'2026-10-08T00:00:00Z'},null,2)+'\\n');
  const result=scheduleWorkerRun(prepared.project,1,1,prepared.project.bodyRunInput);
  writeFileSync(path+'/'+variant+'.result.json',JSON.stringify({notice:'TYLKO TEST: pełna założona obecność jednej osoby, brak przewozu, rama już na wejściu montażu. Nie jest to wydajność produkcyjna.',
    arrivalIntervalSeconds:1,finishSeconds:result.jobs[0].finish,runs:result.runs,bodyEvents:result.bodyEvents},null,2)+'\\n');
}
console.log('Zapisano trzy wyłącznie testowe scenariusze Eko w '+path);
`,resolveDir:process.cwd()},bundle:true,platform:'node',format:'esm',write:false});
await import('data:text/javascript;base64,'+Buffer.from(bundle.outputFiles[0].text).toString('base64'));
