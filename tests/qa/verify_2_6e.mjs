import {spawn} from 'node:child_process';
import {mkdtempSync, rmSync, readFileSync, mkdirSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {basename, dirname, join, resolve} from 'node:path';

const PORT = 5206, CDP_PORT = 9346;
const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
let originalJson = readFileSync('tests/qa/Eko_D5_actual_export_v5.json', 'utf8');
const source = JSON.parse(originalJson);
if (true) {
  source.id = 'QA-PACKING'; source.name = 'Pakowanie — syntetyczny proces testowy';
  source.algorithm = 'Manual'; source.layoutObjects = []; source.bom = [];
  const operationIds = ['PREP', 'PACK'];
  if (operationIds.length === 3) source.name = 'Obróbka i montaż — syntetyczny proces testowy';
  source.processSteps = operationIds.map((id, index) => ({id, name: id,
    standardTimeSeconds: 120, vaTimeSeconds: 120, nvaTimeSeconds: 0,
    predecessorIds: index ? [operationIds[index - 1]] : [], sequenceNumber: index + 1,
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
project.stations.push({id:'ST-FUTURE',name:'Alternatywne następne stanowisko',operationIds:[]});
project.stationSettings['ST-FUTURE']={operators:1,parallelStations:1};
project.stationRouting.operations[1].candidates.push({stationId:'ST-FUTURE',copy:1,requiredEquipmentIds:[]});
project.stationRouting.routes.push(...[[firstStation.id,5000,'R-future-long'],['ST-ALT',2000,'R-future-short']].map(([stationId,distanceMm,id])=>
  ({id,from:{stationId,copy:1},to:{stationId:'ST-FUTURE',copy:1},distanceMm,basis:'confirmed',source:'Syntetyczny test wielu przyszłych kopii'})));
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
  const routingPanel='[aria-label="Dopuszczenia i trasy szkicu 6"]';
  const routingClick=async text=>{await evaluate(`(() => {const b=[...document.querySelector(${JSON.stringify(routingPanel)}).querySelectorAll('button')].find(e=>e.textContent===${JSON.stringify(text)});if(!b||b.disabled)throw new Error('Brak przycisku '+${JSON.stringify(text)});b.click();})()`);await sleep(100);};
  const checkbox=async label=>{await evaluate(`document.querySelector('input[aria-label='+JSON.stringify(${JSON.stringify(label)})+']').click()`);await sleep(80);};
  await routingClick('Usuń dopuszczenia i trasy — przypisanie bazowe');
  if((await saved()).stationRouting)throw new Error('Nie usunięto dopuszczeń');
  await routingClick('Cofnij dane szkicu');
  if(!(await saved()).stationRouting)throw new Error('Nie cofnięto usunięcia');
  await routingClick('Ponów dane szkicu');
  if((await saved()).stationRouting)throw new Error('Nie ponowiono usunięcia');
  await routingClick('Dodaj przypisanie wyposażenia');
  await select('Wyposażenie 1 egzemplarz','EQ-ALT');await select('Wyposażenie 1 stanowisko','ST-ALT');await field('Wyposażenie 1 kopia','1');
  await select('Operacja dopuszczeń',project.operations[0].id);
  await routingClick('Dodaj dopuszczoną kopię');await select('Dopuszczenie 1 stanowisko',firstStation.id);await field('Dopuszczenie 1 kopia','1');
  await routingClick('Dodaj dopuszczoną kopię');await select('Dopuszczenie 2 stanowisko','ST-ALT');await field('Dopuszczenie 2 kopia','1');
  await checkbox('Dopuszczenie 2 wymaga EQ-ALT');
  await routingClick('Przesuń dopuszczenie 2 wyżej');
  if(await evaluate(`document.querySelector('select[aria-label="Dopuszczenie 1 stanowisko"]').value`)!=='ST-ALT')throw new Error('Nie zmieniono kolejności dopuszczeń');
  await routingClick('Przesuń dopuszczenie 2 wyżej');
  for(let i=1;i<project.operations.length;i++){
    await select('Operacja dopuszczeń',project.operations[i].id);await routingClick('Dodaj dopuszczoną kopię');
    await select('Dopuszczenie 1 stanowisko',project.stations[i].id);await field('Dopuszczenie 1 kopia','1');
  }
  await select('Operacja dopuszczeń',project.operations[1].id);await routingClick('Dodaj dopuszczoną kopię');
  await select('Dopuszczenie 2 stanowisko','ST-FUTURE');await field('Dopuszczenie 2 kopia','1');
  const routeForms=[[1,firstStation.id,9000,nextStation.id,'R-long'],[2,'ST-ALT',3000,nextStation.id,'R-short']];
  if(project.operations.length===3)routeForms.push([3,nextStation.id,5000,project.stations[2].id,'R-next']);
  routeForms.push([3,firstStation.id,5000,'ST-FUTURE','R-future-long'],[4,'ST-ALT',2000,'ST-FUTURE','R-future-short']);
  for(const [index,start,distance,target,routeId] of routeForms){
    await routingClick('Dodaj rzeczywistą trasę');await field(`Trasa ${index} ID`,routeId);
    await select(`Trasa ${index} początek stanowisko`,start);await field(`Trasa ${index} początek kopia`,'1');
    await select(`Trasa ${index} koniec stanowisko`,target);await field(`Trasa ${index} koniec kopia`,'1');
    await field(`Trasa ${index} długość [mm]`,String(distance));await field(`Trasa ${index} źródło`,'Syntetyczny scenariusz odbioru UI');
  }
  const noRoutingRaw=await evaluate(`localStorage.getItem('layout-studio-domain-v6-draft-v1')`);
  await routingClick('Zapisz dopuszczenia i trasy');
  if(!await evaluate(`document.querySelector(${JSON.stringify(routingPanel)}+' [role="alert"]')?.textContent.includes('Potwierdź')`))throw new Error('Brak odmowy niepotwierdzonych tras');
  if(noRoutingRaw!==await evaluate(`localStorage.getItem('layout-studio-domain-v6-draft-v1')`))throw new Error('Odmowa zmieniła zapis');
  for(let index=1;index<=routeForms.length;index++)await checkbox(`Trasa ${index} potwierdzona`);
  await routingClick('Zapisz dopuszczenia i trasy');
  const completeRouting=(await saved()).stationRouting;
  if(!completeRouting||completeRouting.operations.length!==project.operations.length)throw new Error('Nie zapisano formularza');
  await routingClick('Cofnij dane szkicu');if((await saved()).stationRouting)throw new Error('Cofnij utworzenia');
  await routingClick('Ponów dane szkicu');if(JSON.stringify((await saved()).stationRouting)!==JSON.stringify(completeRouting))throw new Error('Ponów utworzenia');
  await field('Trasa 1 długość [mm]','10000');await checkbox('Trasa 1 potwierdzona');await routingClick('Zapisz dopuszczenia i trasy');
  if((await saved()).stationRouting.routes[0].distanceMm!==10000)throw new Error('Nie zapisano edycji długości');
  await routingClick('Cofnij dane szkicu');
  if((await saved()).stationRouting.routes[0].distanceMm!==9000)throw new Error('Nie cofnięto edycji długości');
  const completeRaw=await evaluate(`localStorage.getItem('layout-studio-domain-v6-draft-v1')`);
  await field('Trasa 1 długość [mm]','-1');await checkbox('Trasa 1 potwierdzona');await routingClick('Zapisz dopuszczenia i trasy');
  if(!await evaluate(`document.querySelector(${JSON.stringify(routingPanel)}+' [role="alert"]')?.textContent.includes('długości')`))throw new Error('Brak odmowy ujemnej drogi');
  if(completeRaw!==await evaluate(`localStorage.getItem('layout-studio-domain-v6-draft-v1')`))throw new Error('Ujemna droga zmieniła zapis');
  await field('Trasa 1 długość [mm]','9000');await checkbox('Trasa 1 potwierdzona');
  await evaluate(`document.querySelector(${JSON.stringify(routingPanel)}).querySelectorAll('fieldset')[2].scrollIntoView()`);
  const editorShot=await send('Page.captureScreenshot',{format:'png'});mkdirSync('outputs/qa',{recursive:true});writeFileSync('outputs/qa/verify_2_6e_editor.png',Buffer.from(editorShot.data,'base64'));
  await routingClick('Usuń trasę 1');await routingClick('Zapisz dopuszczenia i trasy');
  if((await saved()).stationRouting.routes.length!==completeRouting.routes.length-1)throw new Error('Nie usunięto trasy');
  await routingClick('Cofnij dane szkicu');if(JSON.stringify((await saved()).stationRouting)!==JSON.stringify(completeRouting))throw new Error('Nie cofnięto usunięcia trasy');
  const full=await saved();
  await field('Liczba sztuk szkicu 6','2'); await field('Odstęp przybycia szkicu 6 [s]','1');
  await evaluate(`document.querySelector('[aria-label="Harmonogram zespołu szkicu 6"] button').click()`); await sleep(200);
  const result=await evaluate(`document.querySelector('[aria-label="Wynik harmonogramu szkicu 6"]')?.textContent`);
  if(!result?.includes('R-future-short · 2000 mm') || !result?.includes('Wyposażenie: EQ-ALT')) throw new Error('Nie pokazano wyboru trasy i wyposażenia '+result);
  if(!result?.includes('Wybrana trasa z poprzedniej operacji: R-future-short · 2000 mm'))throw new Error('Nie pokazano faktycznie wybranej trasy '+result);
  if(!result?.includes('Przebieg kalendarzowy') || !result.includes('Pauzy [s]: 40–70')) throw new Error('Nie pokazano pauzy '+result);
  await evaluate(`document.querySelector('[aria-label="Harmonogram zespołu szkicu 6"]').scrollIntoView()`);
  const screenshot = await send('Page.captureScreenshot', {format: 'png'});
  mkdirSync('outputs/qa', {recursive: true});
  writeFileSync(`outputs/qa/verify_2_6e${'_packing'}.png`, Buffer.from(screenshot.data, 'base64'));
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
  console.log('PASS: utworzenie dopuszczeń i tras od zera, potwierdzenie, odmowa błędów, historia i usuwanie; wybór krótszej rzeczywistej trasy, stałe wyposażenie, edycja kalendarzy, pauza 40–70, walidacja, Cofnij/Ponów, odczyt, usuwanie i izolacja v5.');
} finally {
  if (ws) ws.close();
  browser.kill(); server.kill();
  const temporaryProfile = resolve(userData);
  if (dirname(temporaryProfile) === resolve(tmpdir()) && basename(temporaryProfile).startsWith('layout-schedule-qa-')) {
    try {rmSync(temporaryProfile, {recursive: true, force: true});} catch {}
  }
}






