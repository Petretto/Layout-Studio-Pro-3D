import {spawn} from 'node:child_process';
import {mkdtempSync, rmSync, mkdirSync, readFileSync, writeFileSync, existsSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';

const PORT = 5198, CDP_PORT = 9338;
const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const fixture = readFileSync('tests/qa/Eko_D5_actual_export_v5.json', 'utf8');
const userData = mkdtempSync(join(tmpdir(), 'layout-domain-qa-'));
const downloads = mkdtempSync(join(tmpdir(), 'layout-domain-downloads-'));
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
    if (result.exceptionDetails) throw new Error(result.exceptionDetails.text);
    return result.result.value;
  };
  const click = label => evaluate(`(() => {
    const scope = document.querySelector('section[aria-label="Podgląd modelu procesu v6"]') || document;
    const button = [...scope.querySelectorAll('button')].find(item => item.textContent.trim() === ${JSON.stringify(label)});
    if (!button) throw new Error('Brak przycisku: ' + ${JSON.stringify(label)});
    if (button.disabled) throw new Error('Przycisk jest zablokowany: ' + ${JSON.stringify(label)});
    button.click();
  })()`);
  const openStations = async () => {
    await evaluate(`[...document.querySelectorAll('.studio-nav button')].find(item => item.textContent.includes('Stanowiska v5')).click()`);
    await sleep(300);
  };
  await send('Page.enable');
  await send('Runtime.enable');
  await send('Emulation.setDeviceMetricsOverride', {width: 1440, height: 900, deviceScaleFactor: 1, mobile: false});
  await send('Page.setDownloadBehavior', {behavior: 'allow', downloadPath: downloads});
  await send('Page.navigate', {url: `http://127.0.0.1:${PORT}/`});
  await sleep(900);
  await evaluate(`localStorage.setItem('layout-studio-stations-v5', JSON.stringify({project: JSON.parse(${JSON.stringify(fixture)}), originalJson: '', at: '2026-10-03T08:00:00.000Z'}))`);
  await send('Page.reload');
  await sleep(900);
  await openStations();
  const v4Before = await evaluate(`localStorage.getItem('layout-studio-v3')`);
  const v5Before = await evaluate(`localStorage.getItem('layout-studio-stations-v5')`);
  await click('Podgląd z bieżącego projektu 4');
  await evaluate(`(() => {
    const input = document.querySelector('input[aria-label="Nazwa projektu"]');
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
    setter.call(input, 'Zmiana do kontroli podglądu');
    input.dispatchEvent(new Event('input', {bubbles: true}));
  })()`);
  await sleep(200);
  const staleText = await evaluate(`document.querySelector('section[aria-label="Podgląd modelu procesu v6"]')?.innerText`);
  if (!staleText.includes('Źródło zmieniło się po przygotowaniu podglądu')) throw new Error('Nie wykryto nieaktualnego podglądu.');
  await evaluate(`document.querySelector('.studio-header button')?.click()`);
  await sleep(150);
  await click('Podgląd z warsztatu 5');
  await sleep(250);
  const review = await evaluate(`document.querySelector('section[aria-label="Podgląd modelu procesu v6"]')?.innerText`);
  if (!review.includes('16 operacji · 17 stanowisk') || !review.includes('Tożsamość pracowników')) throw new Error('Niekompletny podgląd Eko v5.');
  await evaluate(`document.querySelector('section[aria-label="Podgląd modelu procesu v6"] input[type="checkbox"]').click()`);
  await click('Zapisz niekompletny szkic 6');
  await sleep(250);
  const saved = await evaluate(`JSON.parse(localStorage.getItem('layout-studio-domain-v6-draft-v1'))`);
  if (saved.kind !== 'domain-draft-save' || saved.project.schemaVersion !== 6 || saved.project.modelStatus !== 'incomplete' ||
      saved.project.operations.length !== 16 || saved.project.stations.length !== 17 ||
      JSON.parse(saved.originalJson).schemaVersion !== 5 || JSON.parse(saved.originalJson).processSteps.length !== 16 ||
      JSON.parse(saved.originalJson).stations.length !== 17) {
    throw new Error('Zapis szkicu nie zachował projektu i źródła.');
  }
  const v4After = await evaluate(`localStorage.getItem('layout-studio-v3')`);
  const v5After = await evaluate(`localStorage.getItem('layout-studio-stations-v5')`);
  if (JSON.stringify(JSON.parse(v4After).project) !== JSON.stringify(JSON.parse(v4Before).project) ||
      v5After !== v5Before) throw new Error('Zmieniono aktywny projekt v4 lub zapis v5.');
  await send('Page.reload');
  await sleep(900);
  await openStations();
  const reopened = await evaluate(`document.querySelector('section[aria-label="Podgląd modelu procesu v6"]')?.innerText`);
  if (!reopened.includes('Zapisany szkic:') || !reopened.includes('16 operacji · 17 stanowisk')) throw new Error('Szkic nie otworzył się po przeładowaniu.');
  mkdirSync('outputs/qa', {recursive: true});
  await evaluate(`document.querySelector('section[aria-label="Podgląd modelu procesu v6"]').scrollIntoView()`);
  const savedShot = await send('Page.captureScreenshot', {format: 'png'});
  writeFileSync('outputs/qa/verify_2_1e_saved.png', Buffer.from(savedShot.data, 'base64'));
  const originalRaw = await evaluate(`localStorage.getItem('layout-studio-domain-v6-draft-v1')`);
  await evaluate(`localStorage.setItem('layout-studio-domain-v6-draft-v1', '{uszkodzony')`);
  await send('Page.reload');
  await sleep(900);
  await openStations();
  const corrupt = await evaluate(`document.querySelector('section[aria-label="Podgląd modelu procesu v6"]')?.innerText`);
  if (!corrupt.includes('Istniejący szkic jest uszkodzony')) throw new Error('Brak ostrzeżenia o uszkodzonym szkicu.');
  await click('Pobierz surową kopię szkicu');
  await sleep(800);
  const recoveredFile = join(downloads, 'Odzyskiwanie_szkicu_v6.json');
  if (!existsSync(recoveredFile) || readFileSync(recoveredFile, 'utf8') !== '{uszkodzony') throw new Error('Nie pobrano surowej kopii szkicu.');
  if (await evaluate(`localStorage.getItem('layout-studio-domain-v6-draft-v1')`) !== '{uszkodzony') throw new Error('Uszkodzony zapis został zastąpiony.');
  await click('Podgląd z bieżącego projektu 4');
  await sleep(250);
  const v4Review = await evaluate(`document.querySelector('section[aria-label="Podgląd modelu procesu v6"]')?.innerText`);
  if (!v4Review.includes('Podgląd źródła v4')) throw new Error('Brak podglądu źródła v4.');
  if (JSON.stringify(JSON.parse(await evaluate(`localStorage.getItem('layout-studio-v3')`)).project) !== JSON.stringify(JSON.parse(v4Before).project) ||
      await evaluate(`localStorage.getItem('layout-studio-stations-v5')`) !== v5Before) throw new Error('Regresja aktywnych zapisów.');
  await evaluate(`document.querySelector('section[aria-label="Podgląd modelu procesu v6"]').scrollIntoView()`);
  const shot = await send('Page.captureScreenshot', {format: 'png'});
  writeFileSync('outputs/qa/verify_2_1e.png', Buffer.from(shot.data, 'base64'));

  // 2.1f: the downloaded damaged value can be replaced only after a separate confirmation.
  await evaluate(`document.querySelector('section[aria-label="Podgląd modelu procesu v6"] input[type="checkbox"]').click()`);
  await click('Zastąp szkic 6');
  await click('Potwierdź zastąpienie szkicu 6');
  await sleep(250);
  const recovered = await evaluate(`JSON.parse(localStorage.getItem('layout-studio-domain-v6-draft-v1'))`);
  if (recovered.sourceSchemaVersion !== 4 || recovered.project.schemaVersion !== 6 || recovered.project.modelStatus !== 'incomplete') {
    throw new Error('Nie zastąpiono uszkodzonego szkicu projektem v4.');
  }
  await send('Page.reload');
  await sleep(900);
  await openStations();
  const recoveryView = await evaluate(`document.querySelector('section[aria-label="Podgląd modelu procesu v6"]')?.innerText`);
  if (!recoveryView.includes('Zapisany szkic:') || !recoveryView.includes('źródło v4')) throw new Error('Odzyskany szkic nie otworzył się po przeładowaniu.');
  await evaluate(`document.querySelector('section[aria-label="Podgląd modelu procesu v6"]').scrollIntoView()`);
  const recoveryShot = await send('Page.captureScreenshot', {format: 'png'});
  writeFileSync('outputs/qa/verify_2_1f_recovered.png', Buffer.from(recoveryShot.data, 'base64'));

  // A valid sketch from another source also requires its complete envelope as a backup.
  const v4DraftRaw = await evaluate(`localStorage.getItem('layout-studio-domain-v6-draft-v1')`);
  await click('Pobierz szkic z oryginałem');
  await sleep(650);
  const previousFile = join(downloads, 'Szkic_modelu_v6_z_oryginalem.json');
  if (!existsSync(previousFile) || readFileSync(previousFile, 'utf8') !== v4DraftRaw) throw new Error('Nie pobrano poprzedniego poprawnego szkicu.');
  await click('Podgląd z warsztatu 5');
  await evaluate(`document.querySelector('section[aria-label="Podgląd modelu procesu v6"] input[type="checkbox"]').click()`);
  await click('Zastąp szkic 6');
  await click('Potwierdź zastąpienie szkicu 6');
  const replacedValid = await evaluate(`JSON.parse(localStorage.getItem('layout-studio-domain-v6-draft-v1'))`);
  if (replacedValid.sourceSchemaVersion !== 5 || replacedValid.project.operations.length !== 16) throw new Error('Nie zastąpiono poprawnego szkicu źródłem v5.');

  // Simulate an external tab changing the value after the copy was downloaded.
  await click('Pobierz szkic z oryginałem');
  await click('Podgląd z bieżącego projektu 4');
  await evaluate(`document.querySelector('section[aria-label="Podgląd modelu procesu v6"] input[type="checkbox"]').click()`);
  await click('Zastąp szkic 6');
  await evaluate(`localStorage.setItem('layout-studio-domain-v6-draft-v1', '{zmiana-zewnetrzna')`);
  await click('Potwierdź zastąpienie szkicu 6');
  const conflictText = await evaluate(`document.querySelector('section[aria-label="Podgląd modelu procesu v6"]')?.innerText`);
  if (!conflictText.includes('Nie zastąpiono szkicu') || await evaluate(`localStorage.getItem('layout-studio-domain-v6-draft-v1')`) !== '{zmiana-zewnetrzna') {
    throw new Error('Konflikt zapisu zastąpił nowszą wartość.');
  }

  // A quota error must leave the previous raw value intact.
  await click('Pobierz surową kopię szkicu');
  await click('Podgląd z warsztatu 5');
  await evaluate(`document.querySelector('section[aria-label="Podgląd modelu procesu v6"] input[type="checkbox"]').click()`);
  await click('Zastąp szkic 6');
  await evaluate(`(() => {window.__qaSetItem = Storage.prototype.setItem; Storage.prototype.setItem = function(key, value) {if (key === 'layout-studio-domain-v6-draft-v1') throw new Error('quota-qa'); return window.__qaSetItem.call(this, key, value);};})()`);
  await click('Potwierdź zastąpienie szkicu 6');
  await evaluate(`Storage.prototype.setItem = window.__qaSetItem`);
  const quotaText = await evaluate(`document.querySelector('section[aria-label="Podgląd modelu procesu v6"]')?.innerText`);
  if (!quotaText.includes('Nie zastąpiono szkicu: quota-qa') || await evaluate(`localStorage.getItem('layout-studio-domain-v6-draft-v1')`) !== '{zmiana-zewnetrzna') {
    throw new Error('Błąd pamięci zmienił poprzedni szkic.');
  }
  await evaluate(`localStorage.setItem('layout-studio-domain-v6-draft-v1', ${JSON.stringify(originalRaw)})`);
  if (JSON.stringify(JSON.parse(await evaluate(`localStorage.getItem('layout-studio-v3')`)).project) !== JSON.stringify(JSON.parse(v4Before).project) ||
      await evaluate(`localStorage.getItem('layout-studio-stations-v5')`) !== v5Before) throw new Error('Zastąpienie szkicu zmieniło aktywny projekt v4/v5.');
  if (errors.length) throw new Error(`Błędy konsoli: ${errors.join('; ')}`);
  console.log('PASS: podgląd, zapis, odzyskanie uszkodzonego szkicu, jawne zastąpienie, konflikt i limit pamięci.');
} finally {
  if (ws) ws.close();
  browser.kill();
  server.kill();
  try {rmSync(userData, {recursive: true, force: true});} catch {}
  try {rmSync(downloads, {recursive: true, force: true});} catch {}
}
