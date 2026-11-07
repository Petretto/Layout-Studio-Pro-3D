const fs = require('node:fs');
const assert = require('node:assert/strict');

const folders = ['01_zestaw_montazowy', '02_wozek_warsztatowy', '03_modul_urzadzenia'];
const operationIds = [
  ['ZM-OP10', 'ZM-OP20', 'ZM-OP30'],
  ['WW-OP10', 'WW-OP20', 'WW-OP30', 'WW-OP40'],
  ['MU-OP10-A', 'MU-OP10-B', 'MU-OP10-M', 'MU-OP20-M', 'MU-OP30-M'],
];
const reference = folders.map(folder => JSON.parse(fs.readFileSync(
  `przyklady/${folder}/referencje/oczekiwane_wyniki.json`,
)));

// In R02 the same source worker processes, transfers, and returns before starting the next job.
function serial(durations, workerTail = 0, travel = 0) {
  const available = durations.map(() => 0);
  const windows = [];
  for (let job = 1; job <= 3; job++) {
    let ready = job - 1;
    for (let station = 0; station < durations.length; station++) {
      const start = Math.max(ready, available[station]);
      const finish = start + durations[station];
      windows.push([job, station, start, finish]);
      const transfers = station < durations.length - 1;
      available[station] = finish + (transfers ? workerTail : 0);
      ready = finish + (transfers ? travel : 0);
    }
  }
  return windows;
}

// In R01 the consolidated copy is occupied through both local operations.
const consolidated = serial([50, 40]).flatMap(([job, station, start, finish]) =>
  station === 0 ? [[job, 0, start, start + 20], [job, 1, start + 20, finish]]
    : [[job, 2, start, finish]]);

function branched(integrationDuration, physical) {
  const windows = [];
  let integrationFree = 0;
  let testFree = 0;
  for (let job = 1; job <= 3; job++) {
    const offset = job - 1;
    const arrival = physical ? 1000 * offset : offset;
    const preparationDurations = [50, 60, 40];
    const preparationStarts = preparationDurations.map(duration => physical ? arrival : duration * offset);
    const preparationFinishes = preparationStarts.map((start, index) => start + preparationDurations[index]);
    for (let station = 0; station < 3; station++) {
      windows.push([job, station, preparationStarts[station], preparationFinishes[station]]);
    }
    // R04 isolates jobs. The two lots travel at 60–70 and the body at 70–80 relative to arrival.
    const merge = physical ? arrival + 80 : Math.max(...preparationFinishes, integrationFree);
    integrationFree = merge + integrationDuration;
    const testStart = Math.max(integrationFree + (physical ? 10 : 0), testFree);
    testFree = testStart + 50;
    windows.push([job, 3, merge, integrationFree], [job, 4, testStart, testFree]);
  }
  return windows;
}

const scenarios = [
  ['R01', 0, reference[0].variants, [serial([20, 30, 40]), consolidated]],
  ['R02', 1, reference[1].physical.variants, [serial([60, 80, 50, 40], 20, 10), serial([60, 45, 50, 40], 20, 10)]],
  ['R03', 1, reference[1].variants, [serial([60, 80, 50, 40]), serial([60, 45, 50, 40])]],
  ['R04', 2, reference[2].physical.variants, [branched(70, true), branched(40, true)]],
  ['R05', 2, reference[2].variants, [branched(70, false), branched(40, false)]],
];
const sorted = rows => [...rows].sort((a, b) => a[0] - b[0] || a[1].localeCompare(b[1]));
const observed = scenarios.map(([refId, packageIndex, expected, schedules]) => {
  const variants = schedules.map((schedule, index) => {
    const variant = expected[index];
    const windows = schedule.map(([job, station, start, finish]) =>
      [job, operationIds[packageIndex][station], start, finish]);
    assert.deepEqual(sorted(windows), sorted(variant.operationWindows), `${refId} ${variant.id}`);
    const completionSeconds = [1, 2, 3].map(job =>
      Math.max(...windows.filter(row => row[0] === job).map(row => row[3])));
    assert.deepEqual(completionSeconds, variant.completionSeconds);
    return {variantId: variant.id, completionSeconds, windowsChecked: windows.length};
  });
  return {refId, variants};
});
const report = {
  method: 'Independent recurrences from operation durations, precedence, explicit transport returns, local continuation and isolated arrivals. No scheduler imports.',
  result: 'PASS',
  observed,
};
fs.writeFileSync('outputs/qa/pt_e2e/sol_reference/arithmetic.json', JSON.stringify(report, null, 2) + '\n');
for (const row of observed) console.log(row.refId, row.variants.map(v => v.completionSeconds.at(-1)).join(' / '));
