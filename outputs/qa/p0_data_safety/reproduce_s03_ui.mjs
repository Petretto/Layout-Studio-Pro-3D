import {withBrowser,sleep} from '../../../tests/qa/browserHarness.mjs';
import {writeFileSync} from 'node:fs';
import assert from 'node:assert/strict';
await withBrowser(async({evaluate,navigate,until,click,screenshot,errors,dialogs})=>{
  await evaluate(`(async()=>{localStorage.clear();const pkg=await(await fetch('/demo-projects/01_zestaw_montazowy.project.json')).json();const project=JSON.parse(pkg.data.source4Json);project.name='S03_SYNTHETIC_WORK_BEFORE';localStorage.setItem('layout-studio-v3',JSON.stringify({project,at:new Date().toISOString(),importSourceBase64:''}));localStorage.setItem('layout-studio-domain-v6-draft-v1',pkg.data.draftRaw);localStorage.setItem('layout-studio-domain-v6-variants-v1',pkg.data.variantsRaw);})()`);
  await navigate();await sleep(1000);await screenshot('outputs/qa/p0_data_safety/00_before.png');
  const before=await evaluate(`localStorage.getItem('layout-studio-v3').includes('S03_SYNTHETIC_WORK_BEFORE')`);assert.equal(before,true);
  await click('.demo-catalog summary');await until(`document.querySelectorAll('.demo-catalog-grid article').length>0`);
  await click('.demo-catalog-grid article button.primary');
  await until(`!localStorage.getItem('layout-studio-v3').includes('S03_SYNTHETIC_WORK_BEFORE')`);await sleep(1000);
  const retained=await evaluate(`Object.values(localStorage).some(v=>v.includes('S03_SYNTHETIC_WORK_BEFORE'))`);
  assert.equal(retained,false);assert.deepEqual(errors,[]);
  await screenshot('outputs/qa/p0_data_safety/01_reproduced.png');
  writeFileSync('outputs/qa/p0_data_safety/reproduce_ui.result.json',JSON.stringify({finding:'S-03',reproduced:true,syntheticProfile:true,previousDataPersisted:retained,packageDialogShown:false,browserDialogs:dialogs.map(x=>x.type),errors},null,2)+'\n');
  console.log('S-03 browser reproduction confirmed: previous synthetic work not retained.');
});
