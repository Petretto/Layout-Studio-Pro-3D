import {test} from 'node:test';
import {strict as assert} from 'node:assert';
import {assertScheduleResult,assertReopenedDraft} from './scheduleAssertions.mjs';
test('harmonogram wymaga obliczonej dokładnej wartości',()=>{
 assert.doesNotThrow(()=>assertScheduleResult('koniec ostatniej sztuki: 170 s',170));
 for(const text of ['', 'ustawienie 170 s', 'koniec ostatniej sztuki: 1170 s'])assert.throws(()=>assertScheduleResult(text,170));
});
test('ponowne otwarcie wymaga identycznego szkicu',()=>{
 assert.doesNotThrow(()=>assertReopenedDraft({id:'p',operations:[{id:'a'}]},{id:'p',operations:[{id:'a'}]}));
 assert.throws(()=>assertReopenedDraft({id:'p',operations:[]},{id:'p',operations:[{id:'a'}]}));
});
