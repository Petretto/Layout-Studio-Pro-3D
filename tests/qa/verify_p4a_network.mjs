import {strict as assert} from 'node:assert';
import {readFileSync} from 'node:fs';
import {withBrowser,sleep} from './browserHarness.mjs';

const sentinel='SENTINEL_P4A_PROJECT_7359';
const requests=[];
const containsSentinel=value=>JSON.stringify(value).includes(sentinel);
// A negative control demonstrates that the detector does not silently accept a leak.
assert.equal(containsSentinel({url:'https://example.invalid/?project='+sentinel}),true);
assert.equal(containsSentinel({postData:sentinel}),true);

await withBrowser(async ({send,evaluate,until,click,errors})=>{
  await click('button[aria-label="Menu projektu"]');
  await evaluate(`(()=>{const b=[...document.querySelectorAll('[role="menuitem"]')].find(e=>e.textContent.trim()==='Dane projektu i jednostki');if(!b)throw Error('Brak ustawień projektu');b.click()})()`);
  await until(`!!document.querySelector('input[aria-label="Nazwa projektu"]')`);
  await evaluate(`(()=>{const e=document.querySelector('input[aria-label="Nazwa projektu"]');Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(e,${JSON.stringify(sentinel)});e.dispatchEvent(new Event('input',{bubbles:true}))})()`);
  await until(`document.querySelector('input[aria-label="Nazwa projektu"]').value===${JSON.stringify(sentinel)}`);
  await evaluate(`document.querySelector('#project-settings-title').closest('dialog').close()`);
  await until(`document.querySelector('.shell-project-name')?.textContent.includes(${JSON.stringify(sentinel)})`);
  await click('.demo-catalog summary');
  await until(`document.querySelectorAll('.demo-catalog-grid article').length===3`);
  await click('button[aria-label="Menu projektu"]');
  await evaluate(`(()=>{const b=[...document.querySelectorAll('[role="menuitem"]')].find(e=>e.textContent.trim()==='Kopie i odzyskiwanie');if(!b)throw Error('Brak kopii');b.click()})()`);
  await until(`!!document.querySelector('[aria-label="Kopie i odzyskiwanie środowiska"]')`);
  assert.equal(await evaluate(`document.querySelector('[aria-label="Kopie i odzyskiwanie środowiska"]').textContent.includes('hosting może rejestrować dane techniczne')`),true);
  const licenseLink='[aria-label="Kopie i odzyskiwanie środowiska"] a[href="/third-party-licenses/index.html"]';
  const licenseUrl=await evaluate(`document.querySelector(${JSON.stringify(licenseLink)}).href`);
  await click(licenseLink);
  let licenseTarget;
  for(let attempt=0;attempt<40;attempt++){
    const targets=await send('Target.getTargets');
    licenseTarget=targets.targetInfos.find(t=>t.type==='page'&&t.url===licenseUrl);
    if(licenseTarget)break;
    await sleep(100);
  }
  assert.ok(licenseTarget,'Kliknięcie nie otworzyło strony licencji');
  const index=await fetch(licenseUrl);
  assert.equal(index.status,200);
  assert.match(index.headers.get('content-type'),/^text\/html/);
  const indexText=await index.text();
  const manifest=JSON.parse(readFileSync('dist/third-party-licenses/manifest.json','utf8'));
  for(const {name,file} of manifest){
    const path='/third-party-licenses/'+file;
    assert.ok(indexText.includes(`href="${path}"`),`Brak linku dla ${name}`);
    const response=await fetch(new URL(path,licenseUrl));
    assert.equal(response.status,200);
    assert.match(response.headers.get('content-type'),/^text\/plain/);
    assert.deepEqual(Buffer.from(await response.arrayBuffer()),readFileSync('node_modules/'+name+'/LICENSE'));
  }
  await send('Target.closeTarget',{targetId:licenseTarget.targetId});
  await sleep(1500);
  for(const request of requests){
    if(request.hasPostData&&!request.postData){
      try{request.postData=(await send('Network.getRequestPostData',{requestId:request.id})).postData;}
      catch{throw new Error('Nie można sprawdzić treści żądania POST');}
    }
  }
  assert.ok(requests.some(r=>r.url.includes('/demo-projects/index.json')),'Brak dowodu żądania katalogu');
  assert.ok(requests.some(r=>r.url.endsWith('/')),'Brak dowodu nawigacji');
  assert.equal(requests.some(containsSentinel),false,'Dane testowego projektu pojawiły się w żądaniu');
  assert.deepEqual(requests.filter(r=>r.method!=='GET').map(r=>r.method),[],'Nieoczekiwane żądanie zmieniające dane');
  const unexpected=requests.filter(r=>!r.url.startsWith('http://127.0.0.1:5301/'));
  assert.deepEqual(unexpected.map(r=>r.url),[],'Wykryto zewnętrzne żądania');
  assert.equal(requests.some(r=>/\/_vercel\/insights|analytics/i.test(r.url)),false,'Wykryto żądanie analityki');
  assert.deepEqual(errors,[]);
  console.log(`PASS P4a: ${requests.length} żądań; lokalny katalog, sentinel w UI, brak zewnętrznej analityki w tym scenariuszu`);
},{onEvent:event=>{
  if(event.method==='Network.requestWillBeSent'){
    const r=event.params.request;
    requests.push({id:event.params.requestId,url:r.url,method:r.method,headers:r.headers,hasPostData:r.hasPostData,postData:r.postData});
  }
}});
