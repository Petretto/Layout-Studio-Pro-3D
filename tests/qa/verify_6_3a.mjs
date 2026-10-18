import {spawn} from 'node:child_process';
import {existsSync,mkdtempSync,mkdirSync,writeFileSync,readFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {ok,strictEqual} from 'node:assert';
const port=9491,sleep=ms=>new Promise(r=>setTimeout(r,ms));
const edge=['C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe','C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe'].find(existsSync);
if(!edge)throw new Error('Brak Edge');
const browser=spawn(edge,[`--remote-debugging-port=${port}`,`--user-data-dir=${mkdtempSync(join(tmpdir(),'layout-qa-equipment-brief-'))}`,'--headless=new','--no-first-run','--disable-gpu','about:blank'],{stdio:'ignore',windowsHide:true});
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
  await send('Page.navigate',{url:pathToFileURL(resolve('tools/equipment-editor/index.html')).href});await sleep(500);
  const viewport=async width=>{await send('Emulation.setDeviceMetricsOverride',{width,height:1000,deviceScaleFactor:1,mobile:false});await sleep(100);};
  const screenshot=async name=>{mkdirSync('outputs/qa',{recursive:true});writeFileSync(`outputs/qa/${name}.png`,Buffer.from((await send('Page.captureScreenshot',{format:'png'})).data,'base64'));};
  const noOverflow=()=>evaluate('document.documentElement.scrollWidth<=innerWidth');
  const until=async fn=>{for(let i=0;i<50;i++){if(await fn())return;await sleep(100);}throw new Error('Timeout UI/download');};
  const set=async(path,value)=>{await evaluate(`(()=>{const el=document.querySelector('[data-path="'+${JSON.stringify(path)}+'"]');const prototype=el.tagName==='SELECT'?HTMLSelectElement.prototype:el.tagName==='TEXTAREA'?HTMLTextAreaElement.prototype:HTMLInputElement.prototype;Object.getOwnPropertyDescriptor(prototype,'value').set.call(el,${JSON.stringify(value)});el.dispatchEvent(new Event(el.tagName==='SELECT'?'change':'input',{bubbles:true}));})()`);};
  const click=selector=>evaluate(`document.querySelector(${JSON.stringify(selector)}).click()`);
  const model=()=>evaluate(`JSON.parse(document.getElementById('json-preview').textContent)`);
  const downloads=mkdtempSync(join(tmpdir(),'layout-brief-downloads-'));
  await send('Browser.setDownloadBehavior',{behavior:'allow',downloadPath:downloads});
  await viewport(1440);
  strictEqual((await model()).dimensionsMm.width.value,null);strictEqual((await model()).coordinates.groundContactZMm.value,null);
  await set('equipment.objectType','TableESD');strictEqual((await model()).dimensionsMm.width.value,null,'Typ wstawił fikcyjne wymiary');
  await set('equipment.id','QA-CARD');await set('equipment.name','Syntetyczne wyposażenie QA');
  for(const [key,value] of [['width','1200'],['length','800'],['height','850']]){await set(`dimensionsMm.${key}.value`,value);await set(`dimensionsMm.${key}.basis`,'assumed');await set(`dimensionsMm.${key}.source`,'Dane testowe — nie pomiar');}
  await set('coordinates.anchor','footprint-center');await set('coordinates.groundContactZMm.value','0');await set('coordinates.groundContactZMm.basis','confirmed');await set('coordinates.groundContactZMm.source','Syntetyczny test');
  await set('appearance.distinctiveFeatures','Przód +Y; testowa rama. Dane ilustracyjne.');await set('rights.permissionNotes','Własne dane QA');
  await click('#add-reference');await evaluate(`(()=>{const el=document.querySelector('#references input');el.value='QA/rysunek.png';el.dispatchEvent(new Event('input',{bubbles:true}));})()`);
  strictEqual(await evaluate(`document.querySelectorAll('#missing li').length`),0);
  const expected=await model();
  await click('#export');const file=join(downloads,'QA-CARD_karta.json');await until(()=>existsSync(file));strictEqual(JSON.stringify(JSON.parse(readFileSync(file,'utf8'))),JSON.stringify(expected));
  // Native browser download of the blank template must not replace the filled form.
  await click('#template');await until(()=>existsSync(join(downloads,'szablon_wyposazenia.json')));strictEqual((await model()).equipment.name,expected.equipment.name);
  const upload=async path=>{const doc=await send('DOM.getDocument');const q=await send('DOM.querySelector',{nodeId:doc.root.nodeId,selector:'#import-file'});await send('DOM.setFileInputFiles',{nodeId:q.nodeId,files:[path]});await sleep(150);};
  const invalid=join(downloads,'invalid.json');writeFileSync(invalid,JSON.stringify({...expected,version:99}));await upload(invalid);
  ok((await evaluate(`document.getElementById('message').textContent`)).includes('Nie wczytano'));strictEqual(JSON.stringify(await model()),JSON.stringify(expected));
  await set('equipment.name','Niezapisana zmiana');await upload(file);await send('Page.handleJavaScriptDialog',{accept:false});await sleep(100);strictEqual((await model()).equipment.name,'Niezapisana zmiana');
  await upload(file);await send('Page.handleJavaScriptDialog',{accept:true});await sleep(100);strictEqual(JSON.stringify(await model()),JSON.stringify(expected));
  await set('dimensionsMm.width.value','-3');await click('#export');ok((await evaluate(`document.getElementById('message').textContent`)).includes('Popraw'));await set('dimensionsMm.width.value','1200');
  for(const width of [1440,600]){await viewport(width);ok(await noOverflow());await evaluate(`window.scrollTo(0,0)`);await screenshot(`verify_6_3a_${width}`);}
  ok(!errors.length,errors.join('; '));
  console.log('PASS 6.3a: lokalny file://, brak domyślnych wymiarów, formularz/kompletność, pobrany JSON/szablon, import roundtrip, odmowa złej wersji, anulowanie zastąpienia, walidacja liczb, 1440/600 px.');
}finally{ws?.close();browser.kill();}
