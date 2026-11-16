import {mkdtempSync,mkdirSync,writeFileSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {readInventory} from './license_inventory.mjs';

const root=resolve('.');
const results=readInventory(root);
const parent=join(root,'outputs','qa','p4a_license');mkdirSync(parent,{recursive:true});
const dir=mkdtempSync(join(parent,'run_'));
const report={
  generatedAt:new Date().toISOString(),
  basis:'package-lock v3 and installed package metadata; dependency closure is not an asset or legal audit',
  ...results,
  checks:{npmAudit:'NOT_RUN',bundleAndNotices:'NOT_VERIFIED',assetsRights:'NOT_VERIFIED',hostingCsp:'NOT_VERIFIED',offline:'NOT_VERIFIED',legalReview:'NOT_VERIFIED'},
  releaseAcceptance:'NOT_VERIFIED',
};
writeFileSync(join(dir,'inventory.json'),JSON.stringify(report,null,2)+'\n','utf8');
const runtime=results.inventory.filter(x=>x.scopes.includes('runtime')).length;
const build=results.inventory.filter(x=>x.scopes.includes('build')).length;
console.log(`Inwentarz: runtime ${runtime}, build ${build}, unikalnych ${results.inventory.length}; uwagi ${results.issues.length}.`);
console.log(`Raport: ${join(dir,'inventory.json')}`);
console.log('Inwentarz nie potwierdza praw, zgodności komercyjnej, CSP ani bezpieczeństwa. npm audit nie został uruchomiony.');
if(results.issues.length){console.error(JSON.stringify(results.issues,null,2));process.exitCode=1;}
