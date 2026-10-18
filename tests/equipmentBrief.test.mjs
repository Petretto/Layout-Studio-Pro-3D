import {test} from 'node:test';
import {strict as assert} from 'node:assert';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
const context={};
runInNewContext(readFileSync('tools/equipment-editor/catalog.js','utf8'),context);
runInNewContext(readFileSync('tools/equipment-editor/brief.js','utf8'),context);
const api=context.EquipmentBrief,catalog=context.EquipmentCatalog;
test('6.3a: pusty szablon zachowuje nieznane dane, bez wymiarów i zdolności z katalogu',()=>{
  const b=api.blank();assert.equal(b.dimensionsMm.width.value,null);assert.equal(b.coordinates.groundContactZMm.value,null);assert.equal(b.equipment.objectType,null);
  assert.equal(JSON.stringify(api.validate(b,catalog)),JSON.stringify(b));assert.ok(api.missing(b).length>0);assert.ok(catalog.length>=15);assert.ok(catalog.every(t=>Object.keys(t).length===2));
});
test('6.3a: roundtrip danych, źródeł i referencji; potwierdzone zero podstawy i oznaczone założenia',()=>{
  const b=api.blank();b.equipment={id:'QA',name:'Test syntetyczny',objectType:'TableESD',manufacturer:'',model:''};
  for(const [key,value] of [['width',1200],['length',800],['height',850]])b.dimensionsMm[key]={value,basis:'assumed',source:'Syntetyczne dane QA, nie pomiar'};
  b.coordinates.anchor='footprint-center';b.coordinates.groundContactZMm={value:0,basis:'confirmed',source:'Syntetyczny test'};b.appearance.distinctiveFeatures='Przód +Y, syntetyczny stół';b.references=[{kind:'drawing',location:'QA/rysunek.png',description:'Syntetyczna referencja'}];b.rights.permissionNotes='Dane własne testu';
  assert.equal(api.missing(b).length,0);assert.equal(JSON.stringify(api.validate(JSON.parse(JSON.stringify(b)),catalog)),JSON.stringify(b));
});
test('6.3a: odmowy uszkodzonych, obcych i nieobsługiwanych plików bez modyfikacji wejścia',()=>{
  const b=api.blank(),original=JSON.stringify(b);
  for(const mutate of [x=>x.version=2,x=>x.kind='project',x=>x.coordinates.units='cm',x=>x.dimensionsMm.width.value=-1,x=>x.dimensionsMm.height.value=0,x=>x.coordinates.groundContactZMm.value=-1,x=>x.equipment.objectType='Invented',x=>x.dimensionsMm.width.basis='measured-ish',x=>x.unrecognized='preserve me',x=>x.modeling.triangleBudget=1.5,x=>x.references=[{kind:'photo',location:'x'}]]){
    const invalid=JSON.parse(original);mutate(invalid);const snapshot=JSON.stringify(invalid);assert.throws(()=>api.validate(invalid,catalog));assert.equal(JSON.stringify(invalid),snapshot);
  }
  assert.equal(JSON.stringify(b),original);
});
