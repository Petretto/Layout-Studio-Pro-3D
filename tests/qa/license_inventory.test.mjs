import {test} from 'node:test';
import assert from 'node:assert/strict';
import {inventoryLock,resolveLockedPackage,manifestMismatches,mergeBundledEvidence} from '../../scripts/license_inventory.mjs';

const pkg=(version,extra={})=>({version,license:'MIT',integrity:'sha512-test',...extra});
const fixture=()=>({lockfileVersion:3,packages:{
  '':{dependencies:{a:'1', '@scope/pkg':'1'},devDependencies:{tool:'1'}},
  'node_modules/a':pkg('1',{dependencies:{shared:'1',nested:'1'}}),
  'node_modules/@scope/pkg':pkg('1',{peerDependencies:{shared:'*',absent:'*'},peerDependenciesMeta:{absent:{optional:true}}}),
  'node_modules/shared':pkg('1'),
  'node_modules/a/node_modules/nested':pkg('2',{dependencies:{shared:'1'}}),
  'node_modules/tool':pkg('1',{dependencies:{shared:'1'},optionalDependencies:{missing:'1'}}),
}});
const read=(lock,path)=>({name:path.slice(path.lastIndexOf('node_modules/')+13),version:lock.packages[path].version,license:lock.packages[path].license});

test('Rozpoznaje zagnieżdżenie, zakresy npm i wspólne zależności runtime/build',()=>{
  const l=fixture(),r=inventoryLock(l,p=>read(l,p));
  assert.deepEqual(r.issues,[]);
  assert.equal(resolveLockedPackage(l.packages,'node_modules/a','nested'),'node_modules/a/node_modules/nested');
  assert.deepEqual(r.inventory.find(p=>p.name==='shared').scopes,['build','runtime']);
  assert.deepEqual(r.inventory.find(p=>p.name==='tool').scopes,['build']);
  assert.ok(r.inventory.some(p=>p.name==='@scope/pkg'));
});
test('Brak obowiązkowych zależności, instalacji i metadanych nie jest sukcesem',()=>{
  const l=fixture();l.packages['node_modules/a'].dependencies.bad='1';delete l.packages['node_modules/shared'].license;
  const r=inventoryLock(l,p=>{if(p==='node_modules/tool')throw Object.assign(new Error('missing'),{code:'ENOENT'});return read(l,p)});
  assert.ok(r.issues.some(i=>i.type==='unresolved_dependency'&&i.name==='bad'));
  assert.ok(r.issues.some(i=>i.type==='missing_or_unreadable_install'&&i.path==='node_modules/tool'));
  assert.ok(r.issues.some(i=>i.type==='license_missing_or_complex'&&i.path==='node_modules/shared'));
});
test('Rozbieżność wersji i link w lockfile wymagają ręcznego wyjaśnienia',()=>{
  const l=fixture();l.packages['node_modules/a'].link=true;
  const r=inventoryLock(l,p=>({...read(l,p),version:'different'}));
  assert.ok(r.issues.some(i=>i.type==='unsupported_link'));
  assert.ok(r.issues.some(i=>i.type==='installed_identity_mismatch'));
  assert.throws(()=>inventoryLock({lockfileVersion:2,packages:{}},()=>{}),/package-lock v3/);
});
test('Zależności dołączone do paczki są oznaczane jako niezweryfikowane',()=>{
  const l=fixture();l.packages['node_modules/tool'].dependencies.inside='1';l.packages['node_modules/tool'].bundleDependencies=['inside'];
  const r=inventoryLock(l,p=>read(l,p));
  assert.ok(r.issues.some(i=>i.type==='bundled_dependency_not_inspected'&&i.name==='inside'));
  assert.ok(!r.issues.some(i=>i.type==='unresolved_dependency'&&i.name==='inside'));
});
test('Rozbieżność manifestu i lockfile zostaje zgłoszona',()=>{
  const l=fixture();
  assert.deepEqual(manifestMismatches({dependencies:{a:'2','@scope/pkg':'1'},devDependencies:{tool:'1'}},l),[{type:'manifest_lock_mismatch',section:'dependencies'}]);
});
test('Dowód archiwum wyjaśnia tylko właściwe pakiety, brak pliku pozostaje otwarty',()=>{
  const input={inventory:[],issues:[{type:'bundled_dependency_not_inspected',from:'pkg',name:'one'},{type:'bundled_dependency_not_inspected',from:'pkg',name:'two'}]};
  const evidence={archiveIntegrityMatches:true,bundledPackages:[{name:'one',version:'1',declaredLicense:'MIT',licenseFilePresent:true},{name:'two',version:'1',declaredLicense:'MIT',licenseFilePresent:false}]};
  assert.deepEqual(mergeBundledEvidence(input,'pkg',evidence).issues,[{type:'bundled_license_file_missing',from:'pkg',name:'two'}]);
  assert.throws(()=>mergeBundledEvidence(input,'pkg',{...evidence,archiveIntegrityMatches:false}),/nie odpowiada/);
  assert.throws(()=>mergeBundledEvidence(input,'pkg',{...evidence,bundledPackages:evidence.bundledPackages.slice(0,1)}),/nie odpowiada/);
});
