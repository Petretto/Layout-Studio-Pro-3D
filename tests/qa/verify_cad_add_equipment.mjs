import {withBrowser,sleep} from './browserHarness.mjs';
import {importProjectPackageUi} from './packageImport.mjs';
import {mkdirSync,mkdtempSync,readdirSync,writeFileSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {strict as assert} from 'node:assert';

// A clean project exercises the original failure and the complete lifecycle of a new visual object.
const root=resolve('outputs/qa/pt_e2e/cad_add');mkdirSync(root,{recursive:true});
const out=mkdtempSync(join(root,'run_'));console.log('Evidence:',out);
await withBrowser(async({send,evaluate,until,click,navigate,screenshot,errors})=>{
  const savedProject=`JSON.parse(localStorage.getItem('layout-studio-v3'))?.project`;
  const form='[data-qa-equipment-form="1"]';
  const openHall=async()=>{
    await evaluate(`(()=>{const b=[...document.querySelectorAll('.studio-nav button,.shell-nav button,.shell-subnav button')].find(e=>e.textContent.includes('Hala i symulacja'));if(!b)throw Error('Brak nawigacji do hali');b.dataset.qaHall='1'})()`);
    await click('[data-qa-hall="1"]');await until(`!!document.querySelector('svg[aria-label="Rzut hali i wyposażenia"]')`);
  };
  const clickText=async(scope,label)=>{
    await evaluate(`(()=>{const b=[...document.querySelectorAll(${JSON.stringify(scope)}+' button')].find(e=>e.textContent.trim()===${JSON.stringify(label)});if(!b)throw Error('Brak przycisku '+${JSON.stringify(label)});b.dataset.qaCadAction='1'})()`);
    await click('[data-qa-cad-action="1"]');
    await evaluate(`document.querySelector('[data-qa-cad-action="1"]')?.removeAttribute('data-qa-cad-action')`);
  };
  const equipmentForm=`[...document.querySelectorAll('.hall-workspace label')].find(e=>e.textContent==='Nazwa obiektu')?.closest('form')`;
  const add=async()=>{
    await clickText('.hall-workspace','Dodaj wyposażenie');
    await sleep(500);
    assert.ok(await evaluate(`!!(${equipmentForm})`),'Po Dodaj wyposażenie powinien być dostępny formularz nowego obiektu');
    await evaluate(`(${equipmentForm}).dataset.qaEquipmentForm='1'`);
  };
  const save=async()=>{await click('[aria-label="Zapisz lokalnie"]');return evaluate(savedProject);};
  const selectEquipment=async(name)=>{
    await clickText('.hall-workspace','Biblioteka i drzewo');
    const treeItem=`[...document.querySelectorAll('.hall-tree li')].find(li=>li.querySelector('input')?.getAttribute('aria-label')===${JSON.stringify('Zaznacz '+name)})?.querySelector('button')`;
    await evaluate(`(${treeItem}).dataset.qaCadSelection='1'`);
    await click('[data-qa-cad-selection="1"]');
    await until(`!!(${equipmentForm})`);
  };

  await openHall();
  await until(`!!(${savedProject})`);
  const before=await evaluate(savedProject);
  assert.deepEqual(before.layoutObjects,[]);
  await add();
  await screenshot(join(out,'after-add.png'));
  await clickText(form,'Zamknij');
  await until(`!(${equipmentForm})`);
  assert.deepEqual(await evaluate(savedProject),before,'Anulowanie nie zmienia zapisu');
  assert.equal(await evaluate(`document.querySelector('[aria-label="Cofnij"]').disabled`),true);

  await add();
  await clickText(form,'Zapisz obiekt');
  const saved=await save();
  assert.equal(saved.layoutObjects.length,1);
  const [object]=saved.layoutObjects;
  assert.equal(object.name,'Dodatkowe wyposażenie');
  assert.equal(saved.layoutMode,'manual');
  assert.equal(object.workstationId,undefined);
  for(const key of ['processSteps','bom','demand','workstationSettings','facility','obstacles']){
    assert.deepEqual(saved[key],before[key],`Dodanie zmienia wyłącznie geometrię: ${key}`);
  }
  const cadObject=`document.querySelector('[data-object-id="${object.id}"]')`;
  await until(`!!${cadObject}`);

  await click('[aria-label="Cofnij"]');
  await until(`!${cadObject}`);
  assert.deepEqual((await save()).layoutObjects,before.layoutObjects);
  await click('[aria-label="Ponów"]');
  await until(`!!${cadObject}`);
  assert.deepEqual((await save()).layoutObjects,[object],'Ponów przywraca dokładnie ten sam obiekt');

  await selectEquipment(object.name);
  await add();
  await clickText(form,'Zamknij');
  assert.deepEqual((await save()).layoutObjects,[object],'Anulowanie z zaznaczonego obiektu nie nadpisuje geometrii');
  await navigate();
  await openHall();
  await until(`!!${cadObject}`);
  assert.deepEqual((await evaluate(savedProject)).layoutObjects,[object],'Ponowne otwarcie przywraca zapisaną geometrię i tożsamość');
  await screenshot(join(out,'reopened-cad.png'));

  // The 3D view requires a project with a process and balanced stations.
  const downloads=mkdtempSync(join(out,'downloads_'));
  await send('Browser.setDownloadBehavior',{behavior:'allow',downloadPath:downloads});
  await importProjectPackageUi({
    open:async()=>{await click('[aria-label="Menu projektu"]');await clickText('[aria-label="Menu projektu"][role="menu"]','Pakiet projektu');},
    upload:async(selector,file)=>{
      const {root}=await send('DOM.getDocument');
      const {nodeId}=await send('DOM.querySelector',{nodeId:root.nodeId,selector});
      assert.ok(nodeId,'Pole pliku pakietu');
      await send('DOM.setFileInputFiles',{nodeId,files:[resolve(file)]});
    },
    until,evaluate,
    click:label=>clickText('[aria-label="Pakiet projektu"]',label),
    downloaded:async action=>{
      await action();
      for(let i=0;i<100;i++){
        const name=readdirSync(downloads).find(file=>file.endsWith('.json'));
        if(name)return join(downloads,name);
        await sleep(100);
      }
      throw Error('Nie pobrano kopii ratunkowej');
    },
    reload:()=>until(`!!document.querySelector('.studio')&&!document.querySelector('[aria-label="Pakiet projektu"]')`),
  },'przyklady/01_zestaw_montazowy/projekt-pokazowy.json');
  await openHall();
  const processProject=await evaluate(savedProject);
  assert.ok(processProject.processSteps.length);
  await selectEquipment(processProject.layoutObjects[0].name);
  await add();
  await clickText(form,'Zapisz obiekt');
  const processSaved=await save();
  assert.deepEqual(processSaved.layoutObjects.slice(0,-1),processProject.layoutObjects);
  const visualObject=processSaved.layoutObjects.at(-1);
  assert.equal(visualObject.workstationId,undefined);
  for(const key of ['processSteps','bom','demand','workstationSettings']){
    assert.deepEqual(processSaved[key],processProject[key],`Projekt z procesem: ${key}`);
  }
  await selectEquipment(visualObject.name);
  await click('[data-view="simulation"]');
  await until(`!!document.querySelector('[aria-label="Widok hali 3D"] canvas')`);
  await until(`[...document.querySelectorAll('h3')].some(h=>h.textContent==='Edycja 3D: '+${JSON.stringify(visualObject.name)})`);
  const selected3dId=await evaluate(`[...document.querySelectorAll('label')].find(label=>label.firstChild?.textContent.trim()==='Wybierz wyposażenie')?.querySelector('select')?.value`);
  assert.equal(selected3dId,visualObject.id,'3D odczytuje to samo ID wybrane w CAD');
  await screenshot(join(out,'selected-in-3d.png'));
  assert.deepEqual(errors,[]);
  writeFileSync(join(out,'result.json'),JSON.stringify({result:'PASS',object,visualObject,undoRedo:true,reopen:true,shared3DSelection:true,errors},null,2));
  console.log('PASS CAD: add/cancel, save, undo/redo, shared 3D selection, reopen');
},{port:5561,cdp:9461});
