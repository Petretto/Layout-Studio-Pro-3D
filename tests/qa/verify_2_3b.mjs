import {spawn} from 'node:child_process';
import {mkdtempSync, rmSync, mkdirSync, readFileSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {basename, dirname, join, resolve} from 'node:path';

const PORT = 5199, CDP_PORT = 9339;
const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const fixture = readFileSync('tests/qa/Eko_D5_actual_export_v5.json', 'utf8');
const userData = mkdtempSync(join(tmpdir(), 'layout-staffing-qa-'));
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
  const pending = new Map();
  const errors = [];
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
    const result = await send('Runtime.evaluate', {expression, returnByValue: true, awaitPromise: true});
    if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text);
    return result.result.value;
  };
  const click = async label => {
    await evaluate(`(() => {
      const scope = document.querySelector('section[aria-label="Podgląd modelu procesu v6"]') || document;
      const button = [...scope.querySelectorAll('button')].find(item => item.textContent.trim() === ${JSON.stringify(label)});
      if (!button || button.disabled) throw new Error('Brak aktywnego przycisku: ' + ${JSON.stringify(label)});
      button.click();
    })()`);
    await sleep(80);
  };
  const setInput = async (label, value) => {
    await evaluate(`(() => {
      const input = document.querySelector('input[aria-label=' + JSON.stringify(${JSON.stringify(label)}) + ']');
      if (!input) throw new Error('Brak pola: ' + ${JSON.stringify(label)});
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
      setter.call(input, ${JSON.stringify(value)});
      input.dispatchEvent(new Event('input', {bubbles: true}));
    })()`);
    await sleep(60);
  };
  const choose = async (label, value) => {
    await evaluate(`(() => {
      const select = document.querySelector('select[aria-label=' + JSON.stringify(${JSON.stringify(label)}) + ']');
      if (!select) throw new Error('Brak listy: ' + ${JSON.stringify(label)});
      select.value = ${JSON.stringify(value)};
      select.dispatchEvent(new Event('change', {bubbles: true}));
    })()`);
    await sleep(60);
  };
  const draft = () => evaluate(`JSON.parse(localStorage.getItem('layout-studio-domain-v6-draft-v1'))`);
  const op = async id => (await draft()).project.operations.find(item => item.id === id);
  await send('Page.enable');
  await send('Runtime.enable');
  await send('Emulation.setDeviceMetricsOverride', {width: 1440, height: 1100, deviceScaleFactor: 1, mobile: false});
  await send('Page.navigate', {url: `http://127.0.0.1:${PORT}/`});
  await sleep(900);
  await evaluate(`localStorage.setItem('layout-studio-stations-v5', JSON.stringify({project: JSON.parse(${JSON.stringify(fixture)}), originalJson: '', at: '2026-10-04T20:00:00.000Z'}))`);
  await send('Page.reload');
  await sleep(900);
  const openStations = async () => {
    await evaluate(`[...document.querySelectorAll('.studio-nav button')].find(item => item.textContent.includes('Stanowiska v5')).click()`);
    await sleep(300);
  };
  await openStations();
  const v4Before = await evaluate(`localStorage.getItem('layout-studio-v3')`);
  const v5Before = await evaluate(`localStorage.getItem('layout-studio-stations-v5')`);
  await click('Podgląd z warsztatu 5');
  await evaluate(`document.querySelector('section[aria-label="Podgląd modelu procesu v6"] input[type="checkbox"]').click()`);
  await click('Zapisz niekompletny szkic 6');
  const sourceBefore = (await draft()).originalJson;
  await choose('Operacja profilu czasu', 'OP10');
  await choose('Jednostka profilu czasu', 'min');
  await setInput('Minimalna liczba pracowników operacji', '2');
  await click('Zapisz minimalną obsadę');
  if ((await op('OP10')).staffing?.requiredWorkers !== 2) throw new Error('Nie zapisano minimalnej obsady.');
  await choose('Edytowany profil operacji', 'variant');
  await setInput('Liczba pracowników wariantu', '2');
  await setInput('Czas całkowity profilu', '2');
  await choose('Pochodzenie czasu całkowitego', 'measured');
  await click('Dodaj przedział praca ręczna');
  await setInput('Praca ręczna początek 1', '0');
  await setInput('Praca ręczna koniec 1', '0.5');
  await choose('Praca ręczna pochodzenie 1', 'measured');
  await click('Dodaj przedział obecność operatora');
  await setInput('Obecność operatora początek 1', '0');
  await setInput('Obecność operatora koniec 1', '0.5');
  await choose('Obecność operatora pochodzenie 1', 'measured');
  await click('Zapisz wariant czasu');
  if ((await op('OP10')).staffing?.timeVariants[0]?.timeProfile.durationSeconds !== 120) throw new Error('Nie zapisano profilu dla 2 osób.');
  await setInput('Liczba pracowników wariantu', '3');
  await setInput('Czas całkowity profilu', '1.75');
  await choose('Pochodzenie czasu całkowitego', 'assumed');
  await click('Zapisz wariant czasu');
  let operation = await op('OP10');
  if (JSON.stringify(operation.staffing?.timeVariants.map(item => item.timeProfile.durationSeconds)) !== JSON.stringify([120, 105]) ||
      operation.timeProfile !== undefined || (await op('OP11')).staffing !== undefined) throw new Error('Warianty zmieniły profil referencyjny lub inną operację.');
  const beforeInvalid = await evaluate(`localStorage.getItem('layout-studio-domain-v6-draft-v1')`);
  await setInput('Minimalna liczba pracowników operacji', '4');
  await click('Zapisz minimalną obsadę');
  if (await evaluate(`localStorage.getItem('layout-studio-domain-v6-draft-v1')`) !== beforeInvalid) throw new Error('Błędne minimum nadpisało szkic.');
  await click('Cofnij dane szkicu');
  if ((await op('OP10')).staffing?.timeVariants.length !== 1) throw new Error('Cofnij nie usunęło ostatniego wariantu.');
  await click('Ponów dane szkicu');
  if ((await op('OP10')).staffing?.timeVariants.length !== 2) throw new Error('Ponów nie przywróciło wariantu.');
  await click('Usuń wariant 3 osób');
  if ((await op('OP10')).staffing?.timeVariants.length !== 1) throw new Error('Nie usunięto wariantu.');
  await click('Cofnij dane szkicu');
  if ((await op('OP10')).staffing?.timeVariants.length !== 2) throw new Error('Nie przywrócono usuniętego wariantu.');
  await send('Page.reload');
  await sleep(900);
  await openStations();
  operation = await op('OP10');
  const checks = {
    variants: JSON.stringify(operation.staffing?.timeVariants.map(item => item.timeProfile.durationSeconds)) === JSON.stringify([120, 105]),
    source: (await draft()).originalJson === sourceBefore,
    activeV4: JSON.stringify(JSON.parse(await evaluate(`localStorage.getItem('layout-studio-v3')`)).project) === JSON.stringify(JSON.parse(v4Before).project),
    activeV5: await evaluate(`localStorage.getItem('layout-studio-stations-v5')`) === v5Before,
  };
  if (Object.values(checks).some(value => !value)) throw new Error(`Ponowny odczyt lub źródło aktywne zmieniło się: ${JSON.stringify(checks)}`);
  await choose('Edytowany profil operacji', 'variant');
  await setInput('Liczba pracowników wariantu', '3');
  if (await evaluate(`document.querySelector('input[aria-label="Czas całkowity profilu"]').value`) !== '105') throw new Error('Edytor nie odczytał wariantu po przeładowaniu.');
  await evaluate(`document.querySelector('[aria-label="Edytor profilu czasu szkicu 6"]').scrollIntoView()`);
  mkdirSync('outputs/qa', {recursive: true});
  const shot = await send('Page.captureScreenshot', {format: 'png'});
  writeFileSync('outputs/qa/verify_2_3b_staffing.png', Buffer.from(shot.data, 'base64'));
  await click('Usuń obsadę i warianty');
  if ((await op('OP10')).staffing !== undefined) throw new Error('Nie usunięto obsady.');
  await click('Cofnij dane szkicu');
  if ((await op('OP10')).staffing?.timeVariants.length !== 2) throw new Error('Cofnij nie przywróciło obsady.');
  if (errors.length) throw new Error(`Błędy konsoli: ${errors.join('; ')}`);
  console.log('PASS: Eko v5, minimum, dwa warianty, odmowa błędu, Cofnij/Ponów, usunięcie, ponowny odczyt i izolacja v4/v5.');
} finally {
  if (ws) ws.close();
  browser.kill();
  server.kill();
  const temporaryProfile = resolve(userData);
  if (dirname(temporaryProfile) === resolve(tmpdir()) && basename(temporaryProfile).startsWith('layout-staffing-qa-')) {
    try {rmSync(temporaryProfile, {recursive: true, force: true});} catch {}
  }
}
