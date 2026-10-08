import {spawn} from 'node:child_process';
import {mkdtempSync,rmSync,readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve,dirname,basename} from 'node:path';
const PORT=Number(process.env.LAYOUT_QA_PORT??5212),CDP=Number(process.env.LAYOUT_QA_CDP??9352);
const acceptance=process.argv.includes('--acceptance');
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
import {build} from 'esbuild';
const bundled=await build({stdin:{contents:"export {derive} from './src/core/project';export {parseProject} from './src/core/validation';export {deriveStationProject} from './src/core/stationDerivation';export {parseStationProjectV5} from './src/core/stationProject';export {simulateNetwork} from './src/core/algorithms/networkSimulation';",resolveDir:process.cwd()},bundle:true,write:false,platform:'node',format:'esm'});
const core=await import('data:text/javascript;base64,'+Buffer.from(bundled.outputFiles[0].text).toString('base64'));
const original4=readFileSync('tests/qa/Eko_B_export_20260930_183858.json','utf8'),original5=readFileSync('tests/qa/Eko_D5_actual_export_v5.json','utf8');
const userData=mkdtempSync(join(tmpdir(),'layout-body-qa-'));
const server=spawn('node',['scripts/serve.mjs'],{env:{...process.env,PORT:String(PORT)},stdio:'ignore'});
const browser=spawn('C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',[
  `--remote-debugging-port=${CDP}`,'--headless=new','--disable-gpu','--no-first-run','--no-default-browser-check',
  `--user-data-dir=${userData}`,'about:blank'],{stdio:'ignore'});
let ws;
try{
  let target;
  for(let i=0;i<30;i++){await sleep(350);try{target=(await(await fetch(`http://127.0.0.1:${CDP}/json/list`)).json()).find(t=>t.type==='page');if(target)break;}catch{}}
  if(!target)throw new Error('Brak Edge CDP.');
  ws=new WebSocket(target.webSocketDebuggerUrl);await new Promise((resolve,reject)=>{ws.onopen=resolve;ws.onerror=reject;});
  let sequence=0;const pending=new Map(),errors=[];
  ws.onmessage=event=>{const m=JSON.parse(event.data);if(m.method==='Runtime.exceptionThrown')errors.push(m.params.exceptionDetails.text);
    if(pending.has(m.id)){const p=pending.get(m.id);pending.delete(m.id);m.error?p.reject(new Error(m.error.message)):p.resolve(m.result);}};
  const send=(method,params={})=>new Promise((resolve,reject)=>{const id=++sequence;pending.set(id,{resolve,reject});ws.send(JSON.stringify({id,method,params}));});
  const evaluate=async expression=>{const r=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw new Error(r.exceptionDetails.exception?.description||r.exceptionDetails.text);return r.result.value;};
  const field=async(label,value)=>{await evaluate(`(()=>{const p=[...document.querySelectorAll('.panel')].find(p=>p.querySelector('h2')?.textContent==='Symulacja przepływu produkcji');const e=[...p.querySelectorAll('input,select')].find(e=>e.getAttribute('aria-label')===${JSON.stringify(label)}||e.closest('label')?.textContent.trim()===${JSON.stringify(label)});if(!e)throw new Error('Brak pola '+${JSON.stringify(label)});Object.getOwnPropertyDescriptor(e.tagName==='SELECT'?HTMLSelectElement.prototype:HTMLInputElement.prototype,'value').set.call(e,${JSON.stringify(value)});e.dispatchEvent(new Event(e.tagName==='SELECT'?'change':'input',{bubbles:true}));})()`);await sleep(70);};
  const check=async(label)=>{await evaluate(`document.querySelector('[aria-label='+JSON.stringify(${JSON.stringify(label)})+']').click()`);await sleep(70);};
  const click=async(text,panel='Korpus i role szkicu 6')=>{await evaluate(`(()=>{const p=document.querySelector('[aria-label='+JSON.stringify(${JSON.stringify(panel)})+']');const b=[...p.querySelectorAll('button')].find(b=>b.textContent===${JSON.stringify(text)});if(!b||b.disabled)throw new Error('Brak przycisku '+${JSON.stringify(text)});b.click();})()`);await sleep(120);};
  const saved=()=>evaluate(`JSON.parse(localStorage.getItem('layout-studio-domain-v6-draft-v1')).project`);
  const raw=()=>evaluate(`localStorage.getItem('layout-studio-domain-v6-draft-v1')`);
  await send('Page.enable');await send('Runtime.enable');await send('Emulation.setDeviceMetricsOverride',{width:1500,height:1100,deviceScaleFactor:1,mobile:false});
  await send('Page.navigate',{url:`http://127.0.0.1:${PORT}/`});
  for(let i=0;i<50;i++){await sleep(100);if(await evaluate(`location.origin==='http://127.0.0.1:${PORT}'&&!!document.querySelector('.studio-nav')`))break;}
  await evaluate(`localStorage.clear();localStorage.setItem('layout-studio-v3',JSON.stringify({project:JSON.parse(${JSON.stringify(original4)}),at:'2026-10-08T12:00:00Z',importSourceBase64:''}));localStorage.setItem('layout-studio-stations-v5',JSON.stringify({project:JSON.parse(${JSON.stringify(original5)}),originalJson:${JSON.stringify(original4)},at:'2026-10-08T12:00:00Z'}))`);
  const panel=`[...document.querySelectorAll('.panel')].find(p=>p.querySelector('h2')?.textContent==='Symulacja przepływu produkcji')`;
  const act=async text=>{await evaluate(`(()=>{const b=[...(${panel}).querySelectorAll('button')].find(b=>b.textContent===${JSON.stringify(text)});if(!b||b.disabled)throw new Error('Brak aktywnego przycisku '+${JSON.stringify(text)});b.click();})()`);await sleep(70);};
  const ready=async()=>{for(let i=0;i<100;i++){if(await evaluate(`!![...(${panel}).querySelectorAll('button')].find(b=>b.textContent==='Raport symulacji CSV'&&!b.disabled)`))return;await sleep(100);}throw new Error('Brak pełnego wyniku');};
  const end=()=>evaluate(`Number((${panel}).querySelector('[aria-label="Oś czasu symulacji"]').max)`);
  const values=()=>evaluate(`Object.fromEntries(['layout-studio-v3','layout-studio-stations-v5'].map(key=>[key,JSON.parse(localStorage.getItem(key)).project]))`);
  for(const version of [4,5]){
    await send('Page.reload');await sleep(1000);
    await evaluate(`window.taskStarts=0;window.taskStops=0;window.NativeWorker=Worker;window.Worker=class extends Worker{constructor(url,options){if(window.failStartup)throw new Error('TEST: start workera');super(window.failRuntime?new URL('/qa-missing-worker.js',location.href):url,options);window.taskStarts++;}terminate(){window.taskStops++;super.terminate();}};[...document.querySelectorAll('.studio-nav button')].find(b=>b.textContent.includes(${JSON.stringify(version===4?'6 3D i symulacja':'Stanowiska v5')})).click()`);
    await ready();await sleep(1000);const before=await values();
    await field('Cel partii [szt.]',3);await field('Odstęp uruchamiania sztuk [s]',4050);await ready();
    const project=version===4?core.derive(core.parseProject(original4)).project:core.deriveStationProject(core.parseStationProjectV5(original5)).project;
    const expected=Math.max(...core.simulateNetwork(project,4050,3).jobs.map(job=>job.finish));
    if(await end()!==expected)throw new Error('Inny koniec v'+version);
    const starts=await evaluate('window.taskStarts');
    await field('Szybkość odtwarzania',5000);await act('Start symulacji');await sleep(120);await act('Pauza');
    if(!await evaluate(`Number((${panel}).querySelector('[aria-label="Oś czasu symulacji"]').value)>0`))throw new Error('Animacja nie działa');
    await act('Reset symulacji');await field('Szybkość odtwarzania',1);await act('Oblicz całą partię');
    if(await evaluate('window.taskStarts')!==starts||await end()!==expected)throw new Error('Odtwarzanie zmienia obliczenia');
    await act('Raport symulacji CSV');await sleep(200);
    if(!await evaluate(`(${panel}).textContent.includes('Raport CSV odpowiada')`))throw new Error('Brak aktualności CSV');
    const cancelled=await evaluate(`(async()=>{
      const p=${panel},input=[...p.querySelectorAll('input')].find(e=>e.closest('label')?.childNodes[0]?.textContent.trim()==='Cel partii [szt.]');
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(input,'10000');input.dispatchEvent(new Event('input',{bubbles:true}));
      for(let i=0;i<30;i++){await new Promise(r=>setTimeout(r,0));if([...p.querySelectorAll('button')].some(b=>b.textContent==='Anuluj obliczenia symulacji'))break;}
      const button=[...p.querySelectorAll('button')].find(b=>b.textContent==='Anuluj obliczenia symulacji');
      if(!button||!p.textContent.includes('Obliczanie partii'))throw new Error('Brak postępu/anulowania');
      if([...p.querySelectorAll('button')].some(b=>b.textContent==='Raport symulacji CSV'&&!b.disabled))throw new Error('Stary wynik można eksportować');
      const start=performance.now();button.click();await new Promise(r=>setTimeout(r,0));return {durationMs:performance.now()-start,text:p.textContent};
    })()`);
    if(!cancelled.text.includes('Obliczenia symulacji anulowane')||cancelled.durationMs>1000)throw new Error('Brak responsywnego anulowania');
    await sleep(700);if(await end()!==1)throw new Error('Spóźniony wynik');
    if(!await evaluate(`(${panel}).textContent.includes('Raport CSV jest nieaktualny')`))throw new Error('Stary CSV nieoznaczony');
    await field('Cel partii [szt.]',3);await ready();if(await end()!==expected)throw new Error('Ponowny start zmienia wynik');
    await act('Oblicz ponownie symulację');await ready();if(await end()!==expected)throw new Error('Ręczne ponowienie zmienia wynik');
    if(acceptance){
      const waitFor=async expression=>{for(let i=0;i<100;i++){if(await evaluate(expression))return;await sleep(50);}throw new Error('Warunek odbioru: '+expression);};
      const beginLarge=async()=>evaluate(`(async()=>{
        const p=${panel},input=[...p.querySelectorAll('input')].find(e=>e.closest('label')?.textContent.trim()==='Cel partii [szt.]');
        Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(input,'10000');input.dispatchEvent(new Event('input',{bubbles:true}));
        for(let i=0;i<30;i++){await new Promise(r=>setTimeout(r,0));if(p.textContent.includes('Obliczanie partii'))break;}
        if(!p.textContent.includes('Obliczanie partii'))throw new Error('Zadanie nie trwa');return window.taskStops;
      })()`);
      const stopped=await beginLarge();await field('Cel partii [szt.]',2);await ready();
      const replacement=Math.max(...core.simulateNetwork(project,4050,2).jobs.map(job=>job.finish));
      await sleep(700);if(await end()!==replacement||!await evaluate(`window.taskStops>${stopped}`))throw new Error('Zmiana wejścia nie kończy starego zadania');
      const unmounted=await beginLarge();
      await evaluate(`[...document.querySelectorAll('.studio-nav button')].find(b=>b.textContent.includes('Pulpit')).click()`);await sleep(100);
      if(!await evaluate(`window.taskStops>${unmounted}`))throw new Error('Odmontowanie nie kończy workera');
      await evaluate(`[...document.querySelectorAll('.studio-nav button')].find(b=>b.textContent.includes(${JSON.stringify(version===4?'6 3D i symulacja':'Stanowiska v5')})).click()`);await ready();
      await field('Cel partii [szt.]',3);await field('Odstęp uruchamiania sztuk [s]',4050);await ready();if(await end()!==expected)throw new Error('Powrót panelu zmienia wynik');
      await field('Cel partii [szt.]',0);await waitFor(`!!(${panel}).querySelector('[role="alert"]')`);
      if(await end()!==1)throw new Error('Błąd wejścia pozostawia wynik');
      await field('Cel partii [szt.]',3);await ready();
      for(const flag of ['failStartup','failRuntime']){
        await evaluate(`window.${flag}=true`);await act('Oblicz ponownie symulację');
        await waitFor(`!!(${panel}).querySelector('[role="alert"]')`);
        if(await end()!==1||await evaluate(`(${panel}).textContent.includes('Obliczanie partii')`))throw new Error('Błąd workera pozostawia wynik/zadanie');
        await evaluate(`window.${flag}=false`);await act('Oblicz ponownie symulację');await ready();if(await end()!==expected)throw new Error('Brak odzyskania po błędzie');
      }
      console.log(`PASS 3.1c v${version}: zmiana wejścia w trwającym zadaniu, odmontowanie, niepoprawne wejście, błąd konstrukcji i rzeczywisty błąd ładowania workera, odzyskanie.`);
    }
    if(JSON.stringify(await values())!==JSON.stringify(before))throw new Error('Symulacja zmienia zapis');
    await evaluate(`(${panel}).scrollIntoView()`);mkdirSync('outputs/qa',{recursive:true});const shot=await send('Page.captureScreenshot',{format:'png'});writeFileSync(`outputs/qa/verify_3_1b_v${version}.png`,Buffer.from(shot.data,'base64'));
    console.log(`PASS 3.1b v${version}: koniec ${expected}s, rzeczywisty worker, odtwarzanie bez nowych obliczeń, CSV, anulowanie 160000 wykonań (${cancelled.durationMs.toFixed(1)} ms), nowy wynik i niezmienność zapisu.`);
  }
  if(errors.length)throw new Error(errors.join('; '));
}finally{
  ws?.close();browser.kill();server.kill();
  const profile=resolve(userData);if(dirname(profile)===resolve(tmpdir())&&basename(profile).startsWith('layout-body-qa-'))try{rmSync(profile,{recursive:true,force:true});}catch{}
}
