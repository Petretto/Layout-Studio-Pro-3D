import {spawn} from 'node:child_process';
import {existsSync,mkdtempSync,mkdirSync,writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {ok,strictEqual} from 'node:assert';

const port=5256,cdp=9396,sleep=ms=>new Promise(r=>setTimeout(r,ms));
const edge=['C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe','C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe'].find(existsSync);
if(!edge)throw new Error('Brak Edge');

const server=spawn('node',['scripts/serve.mjs'],{env:{...process.env,PORT:String(port)},stdio:'ignore',windowsHide:true});
const browser=spawn(edge,[`--remote-debugging-port=${cdp}`,`--user-data-dir=${mkdtempSync(join(tmpdir(),'layout-qa-6-6-'))}`,'--headless=new','--no-first-run','--disable-gpu','about:blank'],{stdio:'ignore',windowsHide:true});
let ws;

try{
  let target;
  for(let i=0;i<40;i++){
    try{
      target=(await(await fetch(`http://127.0.0.1:${cdp}/json/list`,{signal:AbortSignal.timeout(1000)})).json()).find(t=>t.type==='page');
      if(target)break;
    }catch{}
    await sleep(200);
  }
  if(!target)throw new Error('Brak CDP');

  ws=new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve,reject)=>{ws.onopen=resolve;ws.onerror=reject;});

  let id=0;const pending=new Map(),errors=[];
  ws.onmessage=e=>{
    const m=JSON.parse(e.data);
    if(m.method==='Runtime.exceptionThrown')errors.push(m.params.exceptionDetails.text);
    if(pending.has(m.id)){
      const p=pending.get(m.id);
      pending.delete(m.id);
      m.error?p.reject(new Error(m.error.message)):p.resolve(m.result);
    }
  };

  const send=(method,params={})=>new Promise((resolve,reject)=>{
    const next=++id;
    const timer=setTimeout(()=>{pending.delete(next);reject(new Error('Timeout '+method));},10000);
    pending.set(next,{resolve:r=>{clearTimeout(timer);resolve(r);},reject:e=>{clearTimeout(timer);reject(e);}});
    ws.send(JSON.stringify({id:next,method,params}));
  });

  const evaluate=async expression=>{
    const r=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});
    if(r.exceptionDetails)throw new Error(r.exceptionDetails.exception?.description??r.exceptionDetails.text);
    return r.result.value;
  };

  const until=async expression=>{
    for(let i=0;i<60;i++){
      if(await evaluate(expression))return;
      await sleep(100);
    }
    throw new Error('Timeout '+expression);
  };

  const click=async text=>{
    await evaluate(`(()=>{const b=[...document.querySelectorAll('button')].find(b=>b.textContent.trim().includes(${JSON.stringify(text)}));if(!b||b.disabled)throw new Error('Brak '+${JSON.stringify(text)});b.click()})()`);
    await sleep(150);
  };

  const viewport=async width=>{await send('Emulation.setDeviceMetricsOverride',{width,height:1050,deviceScaleFactor:1,mobile:false});await sleep(100);};
  const screenshot=async name=>{
    mkdirSync('outputs/qa',{recursive:true});
    writeFileSync(`outputs/qa/${name}.png`,Buffer.from((await send('Page.captureScreenshot',{format:'png'})).data,'base64'));
  };

  const openSimulation=async()=>{
    if(await evaluate(`!!document.querySelector('.shell-nav')`)){
      await click('Hala i symulacja');
      await until(`!!document.querySelector('button[data-view="simulation"]')`);
      await evaluate(`document.querySelector('button[data-view="simulation"]').click()`);
    }else await evaluate(`[...document.querySelectorAll('.studio-nav button')].find(b=>b.textContent.includes('6 3D i symulacja')).click()`);
  };

  await send('Runtime.enable');
  await send('Page.enable');
  await viewport(1440);

  // 1. Open app and navigate to 3D and simulation tab
  await send('Page.navigate',{url:`http://127.0.0.1:${port}/`});
  await until(`!!document.querySelector('.studio-nav')`);

  // Navigate to 6 3D i symulacja
  await openSimulation();
  await until(`!!document.querySelector('.scene canvas')`);
  await sleep(600);

  // Poczekaj na zakończenie obliczeń w tle (przycisk Start symulacji jest odblokowany)
  await until(`!document.querySelector('.sim-mini-playback-bar button')?.disabled`);
  await sleep(400);

  // Sprawdź czy pojawił się suwak czasu i odtwarzacz
  await screenshot('verify_6_6_simulation_tab_started');

  // Sprawdź obecność mini-paska sterowania odtwarzaniem w 3D
  const hasMiniBar = await evaluate(`!!document.querySelector('.sim-mini-playback-bar')`);
  ok(hasMiniBar, 'Mini-pasek odtwarzania .sim-mini-playback-bar powinien być widoczny w 3D');

  const miniBarText = await evaluate(`document.querySelector('.sim-mini-playback-bar').textContent`);
  ok(miniBarText.includes('Start') || miniBarText.includes('Pauza'), 'Mini pasek powinien zawierać przycisk odtwarzania');

  // Uruchom odtwarzanie przyciskiem w mini-pasku
  await evaluate(`(()=>{
    const bar = document.querySelector('.sim-mini-playback-bar');
    const playBtn = [...bar.querySelectorAll('button')].find(b=>b.textContent.includes('Start')||b.textContent.includes('▶'));
    if(playBtn) playBtn.click();
  })()`);
  await sleep(600);

  const playbackTime=()=>evaluate(`Number(document.querySelector('input[aria-label="Oś czasu symulacji"]').value)`);
  const startedTime=await playbackTime();
  ok(startedTime>1,'Start 3D powinien przesuwać czas przez wiele klatek, nie zatrzymać się po pierwszej');
  await sleep(250);
  ok(await playbackTime()>startedTime,'Odtwarzanie musi pozostać uruchomione');

  // Zapauzuj odtwarzanie
  await evaluate(`(()=>{
    const bar = document.querySelector('.sim-mini-playback-bar');
    const pauseBtn = [...bar.querySelectorAll('button')].find(b=>b.textContent.includes('Pauza')||b.textContent.includes('⏸'));
    if(pauseBtn) pauseBtn.click();
  })()`);
  await sleep(300);
  const pausedTime=await playbackTime();
  await sleep(250);
  strictEqual(await playbackTime(),pausedTime,'Pauza musi utrzymać stały czas');

  // Przesuń suwak czasu w mini-pasku
  await evaluate(`(()=>{
    const slider = document.querySelector('.sim-mini-playback-bar input[type="range"]');
    if(slider){
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(slider,'35');
      slider.dispatchEvent(new Event('input', { bubbles: true }));
      slider.dispatchEvent(new Event('change', { bubbles: true }));
    }
  })()`);
  await sleep(400);
  ok(Math.abs(await playbackTime()-35)<.01,'Suwak 3D ustawia właściwy czas');

  // A consumed reset/seek command must not freeze a later start from the main controls.
  await evaluate(`[...document.querySelector('.sim-mini-playback-bar').querySelectorAll('button')].find(b=>b.textContent.includes('Reset')).click()`);
  await sleep(100);
  strictEqual(await playbackTime(),0);
  await click('Start symulacji');
  await sleep(600);
  ok(await playbackTime()>1,'Dolny Start musi działać po resecie z paska 3D');
  await click('Pauza');
  const afterRestart=await playbackTime();await sleep(250);strictEqual(await playbackTime(),afterRestart);

  await screenshot('verify_6_6_3d_playback_scrubbed');

  // 3. Włącz inspekcję detalu przyciskiem "Inspekcja 3D"
  const hasInspectBtn = await evaluate(`!![...document.querySelectorAll('.sim-mini-playback-bar button')].find(b=>b.textContent.includes('Inspekcja'))`);
  ok(hasInspectBtn, 'Przycisk Inspekcja 3D powinien być dostępny w mini-pasku');
  await evaluate(`(()=>{
    const btn = [...document.querySelectorAll('.sim-mini-playback-bar button')].find(b=>b.textContent.includes('Inspekcja'));
    if(btn) btn.click();
  })()`);
  await sleep(400);

  // Sprawdź czy pojawiła się karta inspekcji .simulation-inspector-card
  const hasInspectorCard = await evaluate(`!!document.querySelector('.simulation-inspector-card')`);
  ok(hasInspectorCard, 'Karta inspekcji wyrobu .simulation-inspector-card powinna się wyświetlić');

  const inspectorText = await evaluate(`document.querySelector('.simulation-inspector-card').textContent`);
  ok(inspectorText.includes('Sztuka #1'), 'Karta powinna zawierać nagłówek sztuki Sztuka #1');
  ok(inspectorText.includes('Stanowisko:'), 'Karta powinna zawierać informację o stanowisku');
  ok(inspectorText.includes('Postęp etapu:'), 'Karta powinna zawierać wskaźnik postępu');
  ok(inspectorText.includes('BOM') || inspectorText.includes('Części z BOM:'), 'Karta powinna wyświetlać komponenty BOM');

  await screenshot('verify_6_6_inspection_card_3d');

  await click('Pulpit');
  await openSimulation();
  await until(`Number(document.querySelector('input[aria-label="Oś czasu symulacji"]')?.max)>0`);
  await sleep(200);
  strictEqual(await playbackTime(),0,'Powrót do zakładki nie wykonuje ponownie starego polecenia');
  await click('Start symulacji');await sleep(600);ok(await playbackTime()>1);
  await click('Pauza');

  // 4. Test Mobile Viewport (600px)
  await viewport(600);
  await sleep(300);
  ok(await evaluate(`document.documentElement.scrollWidth <= innerWidth`), 'Wykryto poziome przewijanie na 600px');
  await screenshot('verify_6_6_mobile_600');

  // Sprawdź brak krytycznych błędów konsoli
  ok(!errors.length, 'Błędy konsoli w trakcie testu: ' + errors.join('; '));

  console.log('PASS 6.6: Animacja 3D produktów i transportu, mini-pasek sterowania w 3D, suwak scrubbingu, karta inspekcji stanu .simulation-inspector-card z BOM i postępem, responsywność 1440/600px, brak błędów konsoli.');
} finally {
  ws?.close();
  browser.kill();
  server.kill();
}
