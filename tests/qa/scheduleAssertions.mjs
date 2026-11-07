import {strict as assert} from 'node:assert';
export function assertScheduleResult(text,seconds){
  assert.equal(typeof text,'string','Brak wyniku harmonogramu');
  const match=text.match(/koniec ostatniej sztuki:\s*(\d+)\s*s/);
  assert.ok(match,'Brak obliczonego wyniku harmonogramu');
  assert.equal(Number(match[1]),seconds,'Niepoprawny koniec partii');
}
export function assertReopenedDraft(actual,expected){assert.deepEqual(actual,expected,'Otwarty ponownie szkic różni się od eksportu');}
