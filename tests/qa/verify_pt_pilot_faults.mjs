import {spawnSync} from 'node:child_process';
import {mkdirSync,mkdtempSync,writeFileSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {strict as assert} from 'node:assert';

// Faults affect only the isolated browser's displayed result or its synthetic imported draft.
const root=resolve('outputs/qa/pt_e2e/pilot_faults');mkdirSync(root,{recursive:true});
const out=mkdtempSync(join(root,'run_'));console.log('Evidence:',out);
for(const [fault,expected] of [['missing-result','Brak wyniku harmonogramu'],['incorrect-result','Niepoprawny koniec partii'],['hidden-comparison','Ukryty wynik'],['missing-reopened-draft','Otwarty ponownie szkic różni się od eksportu']]){
  const run=spawnSync(process.execPath,['tests/qa/verify_7_9_pilot.mjs'],{env:{...process.env,PT_TEST_FAULT:fault},encoding:'utf8',windowsHide:true,timeout:180000});
  const log=(run.stdout??'')+(run.stderr??'');writeFileSync(join(out,`${fault}.log`),log);
  assert.ifError(run.error);
  assert.notEqual(run.status,0,`${fault}: pilot błędnie zakończył się PASS`);
  assert.ok(log.includes(`PT fault injected: ${fault}`),`${fault}: iniekcja nie została osiągnięta`);
  assert.ok(log.includes(expected),`${fault}: niewłaściwa przyczyna błędu`);
  assert.ok(log.includes('NOT_VERIFIED: wymagany test obliczeń'),`${fault}: pilot nie przekazał błędu scenariusza`);
  assert.ok(!log.includes('PASS automatyczny pilot:'),`${fault}: pilot podał PASS`);
  console.log(`PASS negative harness: ${fault} rejected by pilot`);
}
