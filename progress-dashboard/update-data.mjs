import {writeFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {resolve,dirname} from 'node:path';
import './plan-parser.js';
import {readDashboard} from './sources.mjs';
export const parsePlan = globalThis.ProgressDashboard.parsePlan;
export function updateSnapshot() {
  const data=readDashboard();
  writeFileSync(new URL('./data.js',import.meta.url),'// Generated snapshot; refresh with node progress-dashboard/update-data.mjs\nwindow.PLAN_DATA = '+JSON.stringify(data,null,2)+';\n');
  return data;
}
if(process.argv[1] && resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  const data=updateSnapshot();
  console.log(JSON.stringify({overall:data.overall,firstRelease:data.firstRelease,remediationAvailable:data.remediation.available}));
}
