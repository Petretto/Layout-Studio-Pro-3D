import {spawn} from 'node:child_process';
import {mkdtempSync, rmSync, readFileSync, mkdirSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {basename, dirname, join, resolve} from 'node:path';

const PORT = 5204, CDP_PORT = 9344;
const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
let originalJson = readFileSync('tests/qa/Eko_D5_actual_export_v5.json', 'utf8');
const source = JSON.parse(originalJson);
if (true) {
  source.id = 'QA-PACKING'; source.name = 'Pakowanie — syntetyczny proces testowy';
  source.algorithm = 'Manual'; source.layoutObjects = []; source.bom = [];
  source.processSteps = ['PREP', 'PACK'].map((id, index) => ({id, name: id,
    standardTimeSeconds: 120, vaTimeSeconds: 120, nvaTimeSeconds: 0,
    predecessorIds: index ? ['PREP'] : [], sequenceNumber: index + 1,
    assignedWorkstationId: `ST-PACK-${index}`}));
  source.stations = source.processSteps.map((operation, index) =>
    ({id: `ST-PACK-${index}`, name: `Pakowanie ${index}`, operationIds: [operation.id]}));
  source.workstationSettings = {};
  originalJson = JSON.stringify(source);
}
const {processSteps, workstationSettings: _settings, ...rest} = source;
const profile = {durationSeconds: 120, durationBasis: 'assumed', manualWork: [], machineRun: [],
  operatorPresence: [{startSeconds: 10, endSeconds: 20, basis: 'assumed'},
    {startSeconds: 70, endSeconds: 80, basis: 'assumed'}]};
const project = {...rest, schemaVersion: 6, modelStatus: 'incomplete',
  operations: processSteps.map(({assignedWorkstationId: _assignment, ...operation}) => ({...operation,
    staffing: {requiredWorkers: 1, timeVariants: [{workerCount: 1, timeProfile: profile}]}})),
  stationSettings: Object.fromEntries(source.stations.map(station =>
    [station.id, {operators: 1, parallelStations: 2}])),
  workers: [{id: 'W-A', name: 'Anna'}], workerPools: [], equipment: [],
  product: null, subassemblies: [],
  workerRunSelection: {teamWorkerIds: ['W-A'], operations: processSteps.map(operation =>
    ({operationId: operation.id, workerCount: 1, eligibleWorkerIds: ['W-A']}))}};
const firstStation = project.stations[0], nextStation = project.stations[1];
project.stations.push({id:'ST-ALT',name:'Alternatywne stanowisko',operationIds:[]});
project.stationSettings['ST-ALT']={operators:1,parallelStations:1};
project.equipment=[{id:'EQ-ALT',name:'Stały przyrząd testowy',stationId:'ST-ALT',capableOperationIds:[project.operations[0].id]}];
project.stationRouting={selectionRule:'earliest-start-then-shortest-route',
  equipmentPlacements:[{equipmentId:'EQ-ALT',stationId:'ST-ALT',copy:1}],
  operations:project.operations.map((operation,index)=>({operationId:operation.id,candidates:index===0?
    [{stationId:firstStation.id,copy:1,requiredEquipmentIds:[]},{stationId:'ST-ALT',copy:1,requiredEquipmentIds:['EQ-ALT']}]:
    [{stationId:project.stations[index].id,copy:1,requiredEquipmentIds:[]}]})),
  routes:[{id:'R-long',from:{stationId:firstStation.id,copy:1},to:{stationId:nextStation.id,copy:1},distanceMm:9000,basis:'confirmed',source:'Syntetyczny test'},
    {id:'R-short',from:{stationId:'ST-ALT',copy:1},to:{stationId:nextStation.id,copy:1},distanceMm:3000,basis:'confirmed',source:'Syntetyczny test'}]};
const draft = {kind: 'domain-draft-save', version: 1, sourceSchemaVersion: 5,
  originalJson, project, at: '2026-10-05T12:00:00.000Z'};
const userData = mkdtempSync(join(tmpdir(), 'layout-schedule-qa-'));
const server = spawn('node', ['scripts/serve.mjs'], {env: {...process.env, PORT: String(PORT)}, stdio: 'ignore'});
const browser = spawn(EDGE, [`--remote-debugging-port=${CDP_PORT}`, '--headless=new', '--disable-gpu',
  '--no-first-run', '--no-default-browser-check', '--disable-extensions',
  `--user-data-dir=${userData}`, 'about:blank'], {stdio: 'ignore'});
let ws;
try {
  let target;
  for (let i = 0; i < 30; i++) {
    await sleep(350);
    try {
      const response = await fetch(`http://127.0.0.1:${CDP_PORT}/json/list`);
      target = (await response.json()).find(item => item.type === 'page' && item.webSocketDebuggerUrl);
      if (target) break;
    } catch {}
  }
  if (!target) throw new Error('Nie udało się połączyć z Edge CDP.');
  ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {ws.onopen = resolve; ws.onerror = reject;});
  let id = 0;
  const pending = new Map(), errors = [];
  ws.onmessage = event => {
    const message = JSON.parse(event.data);
    if (message.method === 'Runtime.exceptionThrown') errors.push(message.params.exceptionDetails.text);
    if (message.id && pending.has(message.id)) {
      const {resolve, reject} = pending.get(message.id);
      pending.delete(message.id);
      message.error ? reject(new Error(message.error.message)) : resolve(message.result);
    }
  };
  const send = (method, params = {}) => new Promise((resolve, reject) => {
    const requestId = ++id;
    pending.set(requestId, {resolve, reject});
    ws.send(JSON.stringify({id: requestId, method, params}));
  });
  const evaluate = async expression => {
    const response = await send('Runtime.evaluate', {expression, returnByValue: true, awaitPromise: true});
    if (response.exceptionDetails) throw new Error(response.exceptionDetails.exception?.description || response.exceptionDetails.text);
    return response.result.value;
  };
  const field = async (label, value) => {
    await evaluate(`(() => {const input = document.querySelector('input[aria-label=' + JSON.stringify(${JSON.stringify(label)}) + ']');
      if (!input) throw new Error('Brak pola ' + ${JSON.stringify(label)});
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
      setter.call(input, ${JSON.stringify(value)}); input.dispatchEvent(new Event('input', {bubbles: true}));
    })()`);
    await sleep(60);
  };
  await send('Page.enable'); await send('Runtime.enable'); await send('Emulation.setDeviceMetricsOverride',{width:1500,height:1100,deviceScaleFactor:1,mobile:false});
  await send('Page.navigate', {url: `http://127.0.0.1:${PORT}/`});
  await sleep(900);
  await evaluate(`localStorage.setItem('layout-studio-stations-v5', JSON.stringify({project: JSON.parse(${JSON.stringify(originalJson)}), originalJson: '', at: '2026-10-05T12:00:00.000Z'}));
    localStorage.setItem('layout-studio-domain-v6-draft-v1', ${JSON.stringify(JSON.stringify(draft))})`);
  await send('Page.reload'); await sleep(900);
  await evaluate(`[...document.querySelectorAll('.studio-nav button')].find(item => item.textContent.includes('Stanowiska v5')).click()`);
  await sleep(300);
  const panel = '[aria-label="Kalendarze zasobów szkicu 6"]';
  const click = async text => {await evaluate(`(() => {const p=document.querySelector(${JSON.stringify(panel)}); const b=[...p.querySelectorAll('button')].find(b=>b.textContent===${JSON.stringify(text)}); if(!b || b.disabled) throw new Error('Brak przycisku '+${JSON.stringify(text)}); b.click();})()`); await sleep(100);};
  const select = async (label,value) => {await evaluate(`(() => {const e=document.querySelector('select[aria-label='+JSON.stringify(${JSON.stringify(label)})+']'); if(!e) throw new Error(document.body.innerText); Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype,'value').set.call(e,${JSON.stringify(value)}); e.dispatchEvent(new Event('change',{bubbles:true}));})()`); await sleep(80);};
  const saved = () => evaluate(`JSON.parse(localStorage.getItem('layout-studio-domain-v6-draft-v1')).project`);
  const legacy = await evaluate(`localStorage.getItem('layout-studio-stations-v5')`);
  const legacy4 = await evaluate(`JSON.stringify(JSON.parse(localStorage.getItem('layout-studio-v3')).project)`);
  await select('Zasób kalendarza','W-A');
  await click('Dodaj zmiana');
  await field('Zmiana 1 początek','0'); await field('Zmiana 1 koniec','100000');
  await click('Dodaj przerwa');
  await field('Przerwa 1 początek','40'); await field('Przerwa 1 koniec','70');
  await click('Zapisz kalendarz zasobu');
  if((await saved()).resourceCalendars.workers['W-A'].breaks[0].endSeconds!==70) throw new Error('Nie zapisano przerwy');
  await click('Cofnij dane szkicu');
  if((await saved()).resourceCalendars) throw new Error('Cofnij nie odtworzyło braku kalendarza');
  await click('Ponów dane szkicu');
  if(!(await saved()).resourceCalendars) throw new Error('Ponów nie odtworzyło kalendarza');
  await select('Zasób kalendarza','W-A');
  await field('Przerwa 1 koniec','100001');
  const validRaw=await evaluate(`localStorage.getItem('layout-studio-domain-v6-draft-v1')`);
  await click('Zapisz kalendarz zasobu');
  if(!await evaluate(`document.querySelector(${JSON.stringify(panel)}+' [role="alert"]')?.textContent.includes('przerwa')`)) throw new Error('Brak odmowy');
  if(validRaw!==await evaluate(`localStorage.getItem('layout-studio-domain-v6-draft-v1')`)) throw new Error('Błędny wpis zmienił zapis');
  await select('Rodzaj zasobu kalendarza','stations');
  for(const station of project.stations){
    await select('Zasób kalendarza',station.id); await click('Dodaj zmiana');
    await field('Zmiana 1 początek','0'); await field('Zmiana 1 koniec','100000'); await click('Zapisz kalendarz zasobu');
    await select('Rodzaj zasobu kalendarza','stations');
  }
  const full=await saved();
  await field('Liczba sztuk szkicu 6','2'); await field('Odstęp przybycia szkicu 6 [s]','1');
  await evaluate(`document.querySelector('[aria-label="Harmonogram zespołu szkicu 6"] button').click()`); await sleep(200);
  const result=await evaluate(`document.querySelector('[aria-label="Wynik harmonogramu szkicu 6"]')?.textContent`);
  if(!result?.includes('R-short · 3000 mm') || !result?.includes('Wyposażenie: EQ-ALT')) throw new Error('Nie pokazano wyboru trasy i wyposażenia '+result);
  if(!result?.includes('Przebieg kalendarzowy') || !result.includes('Pauzy [s]: 40–70')) throw new Error('Nie pokazano pauzy '+result);
  await evaluate(`document.querySelector('[aria-label="Harmonogram zespołu szkicu 6"]').scrollIntoView()`);
  const screenshot = await send('Page.captureScreenshot', {format: 'png'});
  mkdirSync('outputs/qa', {recursive: true});
  writeFileSync(`outputs/qa/verify_2_6c${'_packing'}.png`, Buffer.from(screenshot.data, 'base64'));
  await send('Page.reload'); await sleep(900);
  await evaluate(`[...document.querySelectorAll('.studio-nav button')].find(item=>item.textContent.includes('Stanowiska v5')).click()`); await sleep(200);
  if(JSON.stringify(await saved())!==JSON.stringify(full)) throw new Error('Zmiana po odczycie');
  await click('Usuń wszystkie kalendarze — podgląd logiczny');
  if((await saved()).resourceCalendars) throw new Error('Usunięcie nie przywróciło trybu logicznego');
  await click('Cofnij dane szkicu');
  if(JSON.stringify(await saved())!==JSON.stringify(full)) throw new Error('Cofnij usunięcia');
  if(legacy!==await evaluate(`localStorage.getItem('layout-studio-stations-v5')`)) throw new Error('Zmieniono v5');
  if(legacy4!==await evaluate(`JSON.stringify(JSON.parse(localStorage.getItem('layout-studio-v3')).project)`)) throw new Error('Zmieniono projekt v4');
  if(errors.length) throw new Error(errors.join('; '));
  console.log('PASS: wybór krótszej rzeczywistej trasy, stałe wyposażenie, edycja kalendarzy, pauza 40–70, walidacja, Cofnij/Ponów, odczyt, usuwanie i izolacja v5.');
} finally {
  if (ws) ws.close();
  browser.kill(); server.kill();
  const temporaryProfile = resolve(userData);
  if (dirname(temporaryProfile) === resolve(tmpdir()) && basename(temporaryProfile).startsWith('layout-schedule-qa-')) {
    try {rmSync(temporaryProfile, {recursive: true, force: true});} catch {}
  }
}




