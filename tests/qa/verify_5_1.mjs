import {spawn} from 'node:child_process';
import {existsSync,mkdtempSync,mkdirSync,writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {ok,strictEqual} from 'node:assert';
const port=9489,sleep=ms=>new Promise(r=>setTimeout(r,ms));
const edge=['C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe','C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe'].find(existsSync);
if(!edge)throw new Error('Brak Edge');
const browser=spawn(edge,[`--remote-debugging-port=${port}`,`--user-data-dir=${mkdtempSync(join(tmpdir(),'layout-qa-5-1-'))}`,'--headless=new','--no-first-run','--disable-gpu','about:blank'],{stdio:'ignore',windowsHide:true});
let ws;
try{
  let target;
  for(let i=0;i<40;i++){try{target=(await(await fetch(`http://127.0.0.1:${port}/json/list`,{signal:AbortSignal.timeout(1000)})).json()).find(t=>t.type==='page');if(target)break;}catch{}await sleep(200);}
  if(!target)throw new Error('Brak CDP');
  ws=new WebSocket(target.webSocketDebuggerUrl);await new Promise((resolve,reject)=>{ws.onopen=resolve;ws.onerror=reject;});
  let id=0;const pending=new Map(),errors=[];
  ws.onmessage=e=>{const m=JSON.parse(e.data);if(m.method==='Runtime.exceptionThrown')errors.push(m.params.exceptionDetails.text);if(pending.has(m.id)){const p=pending.get(m.id);pending.delete(m.id);m.error?p.reject(new Error(m.error.message)):p.resolve(m.result);}};
  const send=(method,params={})=>new Promise((resolve,reject)=>{const next=++id;const timer=setTimeout(()=>{pending.delete(next);reject(new Error('Timeout '+method));},10000);pending.set(next,{resolve:r=>{clearTimeout(timer);resolve(r);},reject:e=>{clearTimeout(timer);reject(e);}});ws.send(JSON.stringify({id:next,method,params}));});
  const evaluate=async expression=>{const r=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw new Error(r.exceptionDetails.exception?.description??r.exceptionDetails.text);return r.result.value;};
  await send('Page.enable');await send('Runtime.enable');
  await send('Page.navigate',{url:pathToFileURL(resolve('PROPOZYCJE_UI_5_1.html')).href});await sleep(500);
  const viewport=async width=>{await send('Emulation.setDeviceMetricsOverride',{width,height:1000,deviceScaleFactor:1,mobile:false});await sleep(100);};
  const screenshot=async name=>{mkdirSync('outputs/qa',{recursive:true});writeFileSync(`outputs/qa/${name}.png`,Buffer.from((await send('Page.captureScreenshot',{format:'png'})).data,'base64'));};
  const noOverflow=()=>evaluate('document.documentElement.scrollWidth<=innerWidth');
  await viewport(1440);strictEqual(await evaluate('document.getElementById("choose-a").getAttribute("aria-pressed")'),'true');
  await evaluate(`document.querySelector('.station[data-id="ST-B"]').dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true}))`);
  ok((await evaluate('document.getElementById("selected").textContent')).includes('ST-B'));
  strictEqual(await evaluate('document.getElementById("bottom-id").textContent'),'ST-B');
  const oldWidth=await evaluate('document.querySelector(".canvas").getBoundingClientRect().width');
  await evaluate('document.getElementById("inspector-close").click()');
  ok(await evaluate(`document.querySelector('.canvas').getBoundingClientRect().width>${oldWidth}`));
  await evaluate('document.getElementById("inspector-toggle").click()');ok(await noOverflow());await screenshot('verify_5_1_a');
  await evaluate('document.getElementById("choose-b").click()');ok(await evaluate('getComputedStyle(document.getElementById("tree")).display==="none"'));
  await evaluate(`document.querySelector('.station[data-id="ST-C"]').dispatchEvent(new MouseEvent('click',{bubbles:true}))`);
  ok((await evaluate('document.getElementById("selected").textContent')).includes('ST-C'));ok(await noOverflow());await screenshot('verify_5_1_b');
  for(const width of [960,600]){
    await viewport(width);
    for(const choice of ['a','b']){
      await evaluate(`document.getElementById('choose-${choice}').click();document.getElementById('tree-toggle').click()`);
      strictEqual(await evaluate('document.getElementById("tree-toggle").getAttribute("aria-expanded")'),'true');
      await evaluate(`document.querySelector('#tree [data-id="ST-A"]').click()`);
      strictEqual(await evaluate('document.getElementById("inspector-toggle").getAttribute("aria-expanded")'),'true');
      ok(await noOverflow(),`Przepełnienie ${width} ${choice}`);
      ok(await evaluate(`getComputedStyle(document.getElementById('inspector')).overflowY==='auto'`),'Inspektor musi przewijać długie właściwości wewnątrz panelu');
      if(width===600)await screenshot(`verify_5_1_${choice}_600`);
    }
  }
  ok(!errors.length,errors.join('; '));
  console.log('PASS 5.1: dwa układy, wybór myszą/klawiaturą, wspólne zaznaczenie, zwijanie i ponowne otwarcie, 1440/960/600 px bez poziomego przepełnienia. Podgląd nie uruchamia aplikacji ani jej zapisu.');
}finally{ws?.close();browser.kill();}
