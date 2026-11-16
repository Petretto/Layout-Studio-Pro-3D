import {mkdtempSync,mkdirSync,writeFileSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {spawnSync} from 'node:child_process';
import {readInventory,mergeBundledEvidence} from './license_inventory.mjs';

const root=resolve('.');
let results=readInventory(root);
const args=process.argv.slice(2);
if(args.length){
  if(args.length!==4||args[0]!=='--package'||args[2]!=='--archive')throw new Error('Użycie: npm run audit:licenses -- --package <klucz-lockfile> --archive <plik.tgz>');
  const proc=spawnSync(process.env.PYTHON||'python',[join(root,'scripts','inspect_bundled_licenses.py'),join(root,'package-lock.json'),args[1],resolve(args[3])],{encoding:'utf8'});
  if(proc.error||proc.status!==0)throw new Error('Nie udało się zweryfikować archiwum: '+(proc.error?.message||proc.stderr));
  results=mergeBundledEvidence(results,args[1],JSON.parse(proc.stdout));
}
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
