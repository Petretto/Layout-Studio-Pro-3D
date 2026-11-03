import {withBrowser} from '../../../tests/qa/browserHarness.mjs';
import {pathToFileURL} from 'node:url';
import {resolve} from 'node:path';
import {writeFileSync} from 'node:fs';
import assert from 'node:assert/strict';
await withBrowser(async({send,evaluate,until,screenshot,errors})=>{
 await send('Page.navigate',{url:pathToFileURL(resolve('progress-dashboard/index.html')).href});
 await until(`document.querySelectorAll('#remediationPackages article').length===12`);
 assert.equal(await evaluate(`document.querySelector('#kpiCurrentPackage').textContent`),'PT');
 assert.equal(await evaluate(`window.PLAN_DATA.remediation.stats.done`),1);
 assert.equal(await evaluate(`window.PLAN_DATA.remediation.packages.find(p=>p.id==='P0').status`),'wdrożone');
 assert.equal(await evaluate(`window.PLAN_DATA.remediation.gates.find(g=>g.id==='G1').status`),'otwarta');
 assert.equal(await evaluate(`window.PLAN_DATA.remediation.gates.find(g=>g.id==='G2').status`),'otwarta');
 assert.equal(await evaluate(`document.querySelector('#kpiPlanPercent').textContent`),'84,7%');
 assert.match(await evaluate(`document.querySelector('#releaseStatus').textContent`),/V1 nie jest odebrane/);
 assert.deepEqual(errors,[]);await screenshot('outputs/qa/p0_data_safety/06_dashboard.png');
 writeFileSync('outputs/qa/p0_data_safety/dashboard-ui.result.json',JSON.stringify({result:'PASS',scope:'embedded snapshot in actual browser',completedRemediationPackages:1,next:'PT',G1:'otwarta',G2:'otwarta',productReady:false,errors},null,2)+'\n');console.log('PASS dashboard snapshot: P0 done, next PT, G1/G2 open, V1 not accepted');
},{port:5302,cdp:9402});
