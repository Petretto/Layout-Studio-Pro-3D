import {withBrowser} from './browserHarness.mjs';
import {strict as assert} from 'node:assert';

await withBrowser(async({evaluate,until,click,errors})=>{
  await evaluate(`(()=>{const original=window.fetch;window.fetch=async(input,...args)=>{const response=await original(input,...args);if(String(input).endsWith('/demo-projects/index.json')){const data=await response.json();data.projects.push({...data.projects[0],id:'04_eko',packagePath:'04_eko.project.json',archivePath:'04_eko.zip'});return new Response(JSON.stringify(data),{status:200,headers:{'content-type':'application/json'}});}return response;};})()`);
  await click('.demo-catalog summary');
  await until(`document.body.textContent.includes('Nie udało się odczytać katalogu przykładów')`);
  assert.equal(await evaluate(`document.querySelectorAll('.demo-catalog-grid article').length`),0);
  assert.deepEqual(errors,[]);
  console.log('PASS P4b UI: cached catalog with Eko is rejected');
},{port:5569,cdp:9469});
