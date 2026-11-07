import {test} from 'node:test';
import {strict as assert} from 'node:assert';
import {assertComparisonRows} from './packageImport.mjs';
const expected=[{name:'Baza',baseline:true,seconds:170},{name:'Wariant',baseline:false,seconds:190}];
const valid=[{name:'Baza',baseline:true,visible:true,makespan:'170 s'},{name:'Wariant',baseline:false,visible:true,makespan:'190 s'}];
test('porównanie wiąże widoczny wynik z wariantem i bazą',()=>{assert.doesNotThrow(()=>assertComparisonRows(valid,expected));});
test('odrzuca brak, ukrycie, zamienione wyniki i częściowe dopasowanie liczb',()=>{
 for(const rows of [valid.slice(0,1),[valid[0],{...valid[1],visible:false}],[{...valid[0],makespan:'190 s'},{...valid[1],makespan:'170 s'}],[{...valid[0],makespan:'1170 s'},valid[1]]])assert.throws(()=>assertComparisonRows(rows,expected));
});
