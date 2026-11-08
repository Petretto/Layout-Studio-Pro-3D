import {test} from 'node:test';
import {strict as assert} from 'node:assert';
import {readFileSync} from 'node:fs';

// T07: the RC1 inventory remains explicit; Eko is internal and A1 has staged fault injection.
const scripts=[
  '7_12a1','7_12a2a','7_12a2b1','7_12b',
  '7_12c2_b2a','7_12c2_b2b','7_12c2_b3a','7_12c2_b3b',
  '7_12c2_b3c','7_12c2_b3d','7_12c2_b3e','7_12c2_b3f','7_12c2_b3_ui',
  '7_12d','7_13_eko','7_9_pilot',
];
test('T07: 16 zmapowanych skryptów korzysta ze wspólnego bezpiecznego importu',()=>{
  assert.equal(new Set(scripts).size,16);
  for(const script of scripts){
    const source=readFileSync(`tests/qa/verify_${script}.mjs`,'utf8');
    const helper=script==='7_12a1'?'prepareProjectImportUi':'importProjectPackageUi';
    assert.match(source,new RegExp(`\\b${helper}\\b`),script);
    for(const obsolete of ['Pobierz kopię ratunkową przed importem','Wczytaj pakiet i przeładuj'])
      assert.ok(!source.includes(obsolete),`${script}: stara etykieta ${obsolete}`);
  }
});
