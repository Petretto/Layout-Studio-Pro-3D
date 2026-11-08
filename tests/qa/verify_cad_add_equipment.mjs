import {withBrowser,sleep} from './browserHarness.mjs';
import {mkdirSync,mkdtempSync,writeFileSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {strict as assert} from 'node:assert';

// Minimal user path: a clean project, navigate to the hall, and add equipment.
const root=resolve('outputs/qa/pt_e2e/cad_add');mkdirSync(root,{recursive:true});
const out=mkdtempSync(join(root,'run_'));console.log('Evidence:',out);
await withBrowser(async({evaluate,until,click,screenshot,errors})=>{
  await evaluate(`(()=>{const b=[...document.querySelectorAll('.studio-nav button,.shell-nav button,.shell-subnav button')].find(e=>e.textContent.includes('Hala i symulacja'));if(!b)throw Error('Brak nawigacji do hali');b.dataset.qaHall='1'})()`);
  await click('[data-qa-hall="1"]');await until(`!!document.querySelector('svg[aria-label="Rzut hali i wyposażenia"]')`);
  await evaluate(`(()=>{const b=[...document.querySelectorAll('.hall-workspace button')].find(e=>e.textContent.trim()==='Dodaj wyposażenie');if(!b)throw Error('Brak przycisku');b.dataset.qaAdd='1'})()`);
  await click('[data-qa-add="1"]');await sleep(500);
  const state=await evaluate(`(()=>({form:!![...document.querySelectorAll('.hall-workspace label')].find(e=>e.textContent==='Nazwa obiektu'),panel:document.querySelector('.hall-drawer')?.textContent,stored:localStorage.getItem('layout-studio-v3')}))()`);
  writeFileSync(join(out,'state.json'),JSON.stringify({state,errors},null,2));await screenshot(join(out,'after-add.png'));
  assert.ok(state.form,'Po Dodaj wyposażenie powinien być dostępny formularz nowego obiektu');
  assert.deepEqual(errors,[]);
  console.log('PASS CAD: formularz dodawania dostępny');
},{port:5561,cdp:9461});
