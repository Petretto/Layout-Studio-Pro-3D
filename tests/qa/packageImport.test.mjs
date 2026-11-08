import {test} from 'node:test';
import {strict as assert} from 'node:assert';
import {assertComparisonRows,importProjectPackageUi,prepareProjectImportUi} from './packageImport.mjs';
const expected=[{name:'Baza',baseline:true,seconds:170},{name:'Wariant',baseline:false,seconds:190}];
const valid=[{name:'Baza',baseline:true,visible:true,makespan:'170 s'},{name:'Wariant',baseline:false,visible:true,makespan:'190 s'}];
test('porównanie wiąże widoczny wynik z wariantem i bazą',()=>{assert.doesNotThrow(()=>assertComparisonRows(valid,expected));});
test('odrzuca brak, ukrycie, zamienione wyniki i częściowe dopasowanie liczb',()=>{
 for(const rows of [valid.slice(0,1),[valid[0],{...valid[1],visible:false}],[{...valid[0],makespan:'190 s'},{...valid[1],makespan:'170 s'}],[{...valid[0],makespan:'1170 s'},valid[1]]])assert.throws(()=>assertComparisonRows(rows,expected));
});
test('błąd pobrania kopii zatrzymuje potwierdzenie i wczytanie',async()=>{
 const calls=[];
 const api={open:async()=>calls.push('open'),upload:async()=>calls.push('upload'),until:async()=>calls.push('preview'),downloaded:async()=>{calls.push('backup');throw Error('brak kopii');},click:async()=>calls.push('click'),evaluate:async()=>calls.push('confirm'),reload:async()=>calls.push('reload')};
 await assert.rejects(importProjectPackageUi(api,'fixture.json'),/brak kopii/);
 assert.deepEqual(calls,['open','upload','preview','backup']);
});
test('przygotowanie zwraca ścieżkę kopii dla testów odzyskiwania',async()=>{
 const calls=[];
 const backup=await prepareProjectImportUi({downloaded:async action=>{await action();return 'kopia.json';},click:async text=>calls.push(text),evaluate:async()=>calls.push('confirm')});
 assert.equal(backup,'kopia.json');assert.deepEqual(calls,['Pobierz kopię ratunkową przed wczytaniem','confirm']);
});
