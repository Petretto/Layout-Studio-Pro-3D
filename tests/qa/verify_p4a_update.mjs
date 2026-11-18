import {strict as assert} from 'node:assert';
import {createHash} from 'node:crypto';
import {createServer} from 'node:http';
import {readFileSync,readdirSync,mkdtempSync,mkdirSync,writeFileSync} from 'node:fs';
import {join,extname,relative,resolve} from 'node:path';
import {withBrowser,sleep} from './browserHarness.mjs';

const [oldDist,newDist='dist']=process.argv.slice(2);
assert.ok(oldDist,'Podaj ścieżki do dwóch wcześniej zbudowanych katalogów dist');
const load=dist=>new Map(readdirSync(dist,{recursive:true,withFileTypes:true}).filter(e=>e.isFile()).map(e=>{
  const file=join(e.parentPath,e.name);
  return ['/'+relative(dist,file).replaceAll('\\','/'),readFileSync(file)];
}));
const builds={A:load(resolve(oldDist)),B:load(resolve(newDist))};
const entry=dist=>dist.get('/index.html').toString().match(/src="([^"]+\.js)"/)[1];
assert.notEqual(entry(builds.A),entry(builds.B),'Próba wymaga dwóch różnych artefaktów');
let active='A';
let withholdScene=false;
let holdNextWorker=false;
let resumeWorker;
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml'};
const listen=async()=>{
  const server=createServer((req,res)=>{
    const path=new URL(req.url,'http://127.0.0.1').pathname;
    const file=path==='/'?'/index.html':path;
    const bytes=withholdScene&&file.startsWith('/assets/Scene-')?undefined:builds[active].get(file);
    const respond=()=>{
      res.writeHead(bytes?200:404,{'Content-Type':mime[extname(file)]??'application/octet-stream','Cache-Control':'no-store'});
      res.end(bytes);
    };
    if(holdNextWorker&&file.startsWith('/assets/network.worker-')){
      holdNextWorker=false;
      resumeWorker=respond;
    }else respond();
  });
  await new Promise((ok,fail)=>server.once('error',fail).listen(0,'127.0.0.1',ok));
  return {server,origin:`http://127.0.0.1:${server.address().port}/`};
};
const primary=await listen(),secondary=await listen();
const evidence=resolve('outputs/qa/p4a_update');mkdirSync(evidence,{recursive:true});
const out=mkdtempSync(join(evidence,'run_'));
const key='layout-studio-v3';
const written=`localStorage.getItem('${key}')`;
const isTitle=name=>`document.querySelector('.shell-project-name')?.textContent===${JSON.stringify(name)}`;

try{
  await withBrowser(async ({send,evaluate,until,click,navigate,errors,dialogs})=>{
    const checkBuild=async expected=>assert.equal(await evaluate(`new URL(document.querySelector('script[type="module"][src]').src).pathname`),entry(builds[expected]));
    const openSettings=async()=>{
      await click('button[aria-label="Menu projektu"]');
      await evaluate(`[...document.querySelectorAll('[role="menuitem"]')].find(el=>el.textContent==='Dane projektu i jednostki').click()`);
      await until(`!!document.querySelector('dialog[open] input[aria-label="Nazwa projektu"]')`);
    };
    const rename=async name=>{
      await openSettings();
      await evaluate(`(()=>{const input=document.querySelector('input[aria-label="Nazwa projektu"]');Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(input,${JSON.stringify(name)});input.dispatchEvent(new Event('input',{bubbles:true}));input.closest('dialog').close()})()`);
      await until(isTitle(name));
    };
    await checkBuild('A');
    await rename('QA aktualizacja A');
    await click('button[aria-label="Zapisz lokalnie"]');
    await until(`JSON.parse(${written})?.project.name==='QA aktualizacja A'`);
    const savedA=await evaluate(written);
    const nameDraft='QA oczekująca zmiana';
    // Two distinct assets are served from the same origin. Existing tabs keep their loaded version.
    active='B';
    await checkBuild('A');
    await rename(nameDraft);
    assert.equal(await evaluate(`(()=>{const event=new Event('beforeunload',{cancelable:true});window.dispatchEvent(event);return event.defaultPrevented})()`),true,'Brak blokady przeładowania w trakcie oczekiwania na zapis');
    await evaluate(`setTimeout(()=>location.reload(),0)`);
    for(let attempt=0;!dialogs.some(d=>d.type==='beforeunload')&&attempt<25;attempt++)await sleep(100);
    assert.ok(dialogs.some(d=>d.type==='beforeunload'),'Edge nie pokazał ostrzeżenia przed przeładowaniem');
    await send('Page.handleJavaScriptDialog',{accept:false});
    await until(isTitle(nameDraft));
    await checkBuild('A');
    await until(`JSON.parse(${written})?.project.name===${JSON.stringify(nameDraft)}`);
    const savedBeforeUpdate=await evaluate(written);
    await navigate();
    await checkBuild('B');
    await until(isTitle(nameDraft));
    assert.equal(await evaluate(written),savedBeforeUpdate);
    assert.equal(JSON.parse(savedBeforeUpdate).project.id,JSON.parse(savedA).project.id);

    // A concurrent edit in a real second tab must survive an attempted overwrite in the stale tab.
    const {targetId}=await send('Target.createTarget',{url:primary.origin});
    const {sessionId}=await send('Target.attachToTarget',{targetId,flatten:true});
    await until(`!!document.querySelector('.studio')`,sessionId);
    await rename('QA zapis z pierwszej karty');
    await until(`JSON.parse(${written})?.project.name==='QA zapis z pierwszej karty'`);
    const savedB=await evaluate(written);
    await evaluate(`document.querySelector('button[aria-label="Menu projektu"]').click()`,sessionId);
    await evaluate(`[...document.querySelectorAll('[role="menuitem"]')].find(el=>el.textContent==='Dane projektu i jednostki').click()`,sessionId);
    await until(`!!document.querySelector('dialog[open] input[aria-label="Nazwa projektu"]')`,sessionId);
    await evaluate(`(()=>{const input=document.querySelector('input[aria-label="Nazwa projektu"]');Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(input,'QA próba nadpisania');input.dispatchEvent(new Event('input',{bubbles:true}));input.closest('dialog').close()})()`,sessionId);
    await until(`document.body.textContent.includes('Wykryto zmianę projektu w innym oknie')`,sessionId);
    assert.equal(await evaluate(written),savedB);
    assert.equal(await evaluate(`document.querySelector('.shell-project-name').textContent`,sessionId),'QA próba nadpisania');
    await send('Target.closeTarget',{targetId});

    active='A';
    await navigate();
    await checkBuild('A');
    await until(isTitle('QA zapis z pierwszej karty'));
    assert.equal(await evaluate(written),savedB);
    await send('Page.navigate',{url:secondary.origin});
    await until(`location.origin===${JSON.stringify(new URL(secondary.origin).origin)}&&!!document.querySelector('.studio')`);
    await until(isTitle('Nowy projekt linii'));
    assert.notEqual(await evaluate(written),savedB);
    await navigate();
    await until(isTitle('QA zapis z pierwszej karty'));
    assert.equal(await evaluate(written),savedB);

    const legacy=JSON.stringify({...JSON.parse(savedB),project:{...JSON.parse(savedB).project,schemaVersion:3,name:'QA starszy zapis'}});
    await evaluate(`localStorage.setItem('${key}',${JSON.stringify(legacy)})`);
    active='B';
    await navigate();
    await checkBuild('B');
    await until(isTitle('QA starszy zapis'));
    const recoveryButton='Potwierdź migrację i zapis';
    const buttonSelector=text=>`[...document.querySelectorAll('button')].find(b=>b.textContent===${JSON.stringify(text)})`;
    assert.equal(await evaluate(`${buttonSelector(recoveryButton)}.disabled`),true);
    assert.equal(await evaluate(written),legacy);
    await send('Browser.setDownloadBehavior',{behavior:'allow',downloadPath:out});
    await evaluate(`${buttonSelector('Pobierz starszy zapis')}.click()`);
    const download=join(out,'Starszy_zapis_lokalny.json');
    for(let attempt=0;!readdirSync(out).includes('Starszy_zapis_lokalny.json')&&attempt<40;attempt++)await sleep(100);
    assert.equal(readFileSync(download,'utf8'),legacy);
    await evaluate(`${buttonSelector(recoveryButton)}.click()`);
    await until(`!!document.querySelector('dialog[open] button.primary')`);
    await click('dialog[open] button.primary');
    await rename('QA zapis po migracji');
    await until(`JSON.parse(${written})?.project.schemaVersion===4&&JSON.parse(${written}).project.name==='QA zapis po migracji'`);
    const migrated=await evaluate(written);
    const secondaryOrigin=new URL(secondary.origin).origin;
    await send('Page.addScriptToEvaluateOnNewDocument',{source:
      `if(location.origin===${JSON.stringify(secondaryOrigin)})Object.defineProperty(window,'localStorage',{get(){throw new DOMException('QA: storage denied','SecurityError')}})`});
    await send('Page.navigate',{url:secondary.origin});
    await until(`location.origin===${JSON.stringify(secondaryOrigin)}&&!!document.querySelector('[aria-label="Kopie i odzyskiwanie środowiska"]')`);
    await until(`document.body.textContent.includes('Błąd zapisu lokalnego')`);
    await navigate();
    await until(isTitle('QA zapis po migracji'));
    assert.equal(await evaluate(written),migrated);

    // A missing lazy module must leave the main project and its export usable.
    const synthetic=JSON.parse(migrated);
    synthetic.project.processSteps=[{id:'QA-OP',name:'Operacja QA',standardTimeSeconds:30,vaTimeSeconds:24,nvaTimeSeconds:6,sequenceNumber:1,predecessorIds:[]}];
    await evaluate(`localStorage.setItem('${key}',${JSON.stringify(JSON.stringify(synthetic))})`);
    await navigate();
    await until(isTitle('QA zapis po migracji'));
    withholdScene=true;
    await evaluate(`[...document.querySelectorAll('nav button')].find(b=>b.textContent.trim()==='Hala i symulacja').click()`);
    await until(`!!document.querySelector('button[data-view="simulation"]')`);
    await click('button[data-view="simulation"]');
    await until(`[...document.querySelectorAll('[role="alert"]')].some(x=>x.textContent.includes('Nie udało się wczytać widoku 3D'))`);
    assert.equal(await evaluate(isTitle('QA zapis po migracji')),true);
    // Hold the request of a genuine worker from B while the origin is switched back to A.
    await evaluate(`document.querySelector('.simulation-details').open=true`);
    await until(`[...document.querySelectorAll('button')].some(b=>b.textContent==='Raport symulacji CSV'&&!b.disabled)`);
    holdNextWorker=true;
    await evaluate(`[...document.querySelectorAll('button')].find(b=>b.textContent==='Oblicz ponownie symulację').click()`);
    await until(`document.body.textContent.includes('Obliczanie partii:')`);
    for(let attempt=0;!resumeWorker&&attempt<40;attempt++)await sleep(100);
    assert.ok(resumeWorker,'Nie zatrzymano żądania pliku workera');
    active='A';
    resumeWorker();
    resumeWorker=undefined;
    await until(`[...document.querySelectorAll('button')].some(b=>b.textContent==='Raport symulacji CSV'&&!b.disabled)`);
    await checkBuild('B');
    await click('button[aria-label="Eksport"]');
    await evaluate(`[...document.querySelectorAll('[role="menuitem"]')].find(el=>el.textContent==='Eksport JSON').click()`);
    const exported=()=>readdirSync(out).find(name=>name.endsWith('.json')&&name!=='Starszy_zapis_lokalny.json');
    for(let attempt=0;!exported()&&attempt<40;attempt++)await sleep(100);
    const exportedName=exported();
    assert.ok(exportedName,'Brak eksportu po awarii widoku 3D');
    assert.equal(JSON.parse(readFileSync(join(out,exportedName),'utf8')).processSteps[0].id,'QA-OP');
    assert.deepEqual(errors,[]);
    const digest=bytes=>createHash('sha256').update(bytes).digest('hex');
    const report={status:'PASS',evidence:relative('.',out),entryA:entry(builds.A),entryB:entry(builds.B),htmlSha256A:digest(builds.A.get('/index.html')),htmlSha256B:digest(builds.B.get('/index.html')),checks:['dirty reload cancelled','A/B/A persistence','two-tab conflict','origin isolation','legacy download before migration','storage denied recovery screen','project export when lazy 3D module unavailable','worker request completed in open tab across artifact switch']};
    writeFileSync(join(out,'report.json'),JSON.stringify(report,null,2)+'\n');
    console.log(JSON.stringify(report));
  },{origin:primary.origin,cdp:9409,acceptDialogs:false});
}finally{
  resumeWorker?.();
  await Promise.all([primary,secondary].map(({server})=>new Promise(ok=>server.close(ok))));
}
