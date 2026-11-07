import {strict as assert} from 'node:assert';
export function assertScheduleResult(text,seconds){
  assert.equal(typeof text,'string','Brak wyniku harmonogramu');
  const match=text.match(/koniec ostatniej sztuki:\s*(\d+)\s*s/);
  assert.ok(match,'Brak obliczonego wyniku harmonogramu');
  assert.equal(Number(match[1]),seconds,'Niepoprawny koniec partii');
}
export function assertReopenedDraft(actual,expected){assert.deepEqual(actual,expected,'Otwarty ponownie szkic różni się od eksportu');}

export function readScheduleWindows(evaluate) {
  return evaluate(`(() => {
    const result = document.querySelector('[aria-label="Wynik harmonogramu szkicu 6"]');
    const table = [...result.querySelectorAll('table')].find(table =>
      table.tHead?.rows[0]?.cells[0]?.textContent === 'Sztuka' &&
      table.tHead.rows[0].cells[5]?.textContent === 'Start [s]' &&
      table.tHead.rows[0].cells[6]?.textContent === 'Koniec [s]');
    if (!table) throw Error('Brak tabeli okien operacji');
    return [...table.tBodies[0].rows].map(({cells}) => [
      Number(cells[0].textContent), cells[1].textContent,
      Number(cells[5].textContent), Number(cells[6].textContent),
    ]);
  })()`);
}

export function assertOperationWindows(actual, expected, toleranceSeconds) {
  const byJobAndOperation = ([jobA, operationA], [jobB, operationB]) =>
    jobA - jobB || operationA.localeCompare(operationB);
  const observed = [...actual].sort(byJobAndOperation);
  const reference = [...expected].sort(byJobAndOperation);
  assert.equal(observed.length, reference.length, 'Liczba wykonań operacji');
  reference.forEach(([job, operation, start, finish], index) => {
    const [actualJob, actualOperation, actualStart, actualFinish] = observed[index];
    assert.deepEqual([actualJob, actualOperation], [job, operation]);
    assert.ok(Math.abs(actualStart - start) <= toleranceSeconds, `Start ${job}/${operation}: ${actualStart} s zamiast ${start} s`);
    assert.ok(Math.abs(actualFinish - finish) <= toleranceSeconds, `Koniec ${job}/${operation}: ${actualFinish} s zamiast ${finish} s`);
  });
}
