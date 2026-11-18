import {strict as assert} from 'node:assert';
import {mkdtempSync,mkdirSync,readdirSync,readFileSync,writeFileSync} from 'node:fs';
import {join,resolve} from 'node:path';
import * as XLSX from 'xlsx';
import {withBrowser,sleep} from './browserHarness.mjs';

const root=resolve('outputs/qa/p4a_xlsx');mkdirSync(root,{recursive:true});
const out=mkdtempSync(join(root,'run_'));
const requests=[];
const fileSentinel='QA_TEST_FILE_P4A.xlsx';
const urlSentinel='QA_TEST_URL_P4A';
const requestMarkers=['T-10','TEST-01',fileSentinel,urlSentinel];
const workbook=rows=>{const w=XLSX.utils.book_new();XLSX.utils.book_append_sheet(w,XLSX.utils.json_to_sheet(rows),'Dane');return Buffer.from(XLSX.write(w,{type:'array',bookType:'xlsx'})).toString('base64');};
const fixtures={
  process:workbook([{'ID Kroku':'T-10','Nazwa Operacji':'Operacja syntetyczna','Czas Standardowy [s]':12,'Wartość Dodana VA [s]':10,'Strata NVA [s]':2}]),
  bom:workbook([{'Nr Części (Part No)':'TEST-01','Nazwa Komponentu':'Materiał syntetyczny','Ilość na Wyrób':2,'Typ Pojemnika':'BoxKLT','Ilość w Opakowaniu':10,'Przypisany Krok':'T-10','Koszt Jednostkowy':3}]),
};
await withBrowser(async ({send,evaluate,until,click,errors})=>{
  await send('Browser.setDownloadBehavior',{behavior:'allow',downloadPath:out});
  await evaluate(`history.replaceState(null,'',location.pathname+'?qa='+${JSON.stringify(urlSentinel)})`);
  async function upload(base64,{reject=false}={}){
    await evaluate(`(()=>{const f=document.querySelector('input[accept=".xlsx,.csv"]');if(!f)throw Error('Brak wejścia XLSX');const s=atob(${JSON.stringify(base64)}),b=Uint8Array.from(s,c=>c.charCodeAt(0)),d=new DataTransfer();d.items.add(new File([b],${JSON.stringify(fileSentinel)},{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'}));f.files=d.files;f.dispatchEvent(new Event('change',{bubbles:true}))})()`);
    if(reject){
      await until(`document.body.textContent.includes('Import odrzucony.')`);
      assert.equal(await evaluate(`!!document.querySelector('dialog[open]')`),false);
      return;
    }
    await until(`!!document.querySelector('dialog[open]')`);
    await click('dialog[open] button.primary');
    await until(`document.body.textContent.includes('Import zakończony.')`);
  }
  async function download(label,filename){
    await evaluate(`(()=>{const b=[...document.querySelectorAll('.page .toolbar button')].find(x=>x.textContent.trim()===${JSON.stringify(label)});if(!b)throw Error('Brak przycisku '+${JSON.stringify(label)});b.click()})()`);
    for(let i=0;i<100&&!readdirSync(out).includes(filename);i++)await sleep(100);
    assert.ok(readdirSync(out).includes(filename),'Brak pobranego pliku '+filename);
    return XLSX.read(readFileSync(join(out,filename)),{type:'buffer'});
  }
  await evaluate(`(()=>{const b=[...document.querySelectorAll('nav button')].find(x=>x.textContent.trim()==='Proces i stanowiska');if(!b)throw Error('Brak obszaru procesu');b.click()})()`);
  await until(`document.body.textContent.includes('Proces i operacje')`);
  await upload(fixtures.process);
  await until(`document.body.textContent.includes('Operacja syntetyczna')`);
  const proc=await download('Eksport XLSX','Eksport_process.xlsx');
  const procRows=XLSX.utils.sheet_to_json(proc.Sheets[proc.SheetNames[0]]);
  assert.equal(procRows[0]['ID Kroku'],'T-10');assert.equal(procRows[0]['Czas Standardowy [s]'],12);
  const template=await download('Szablon XLSX','Szablon_process.xlsx');
  assert.deepEqual(template.SheetNames,['Dane','Opis kolumn']);
  await upload(workbook([{'Nieprawidłowy nagłówek':'Test'}]),{reject:true});
  assert.equal(await evaluate(`document.querySelector('.page').textContent.includes('Operacja syntetyczna')`),true);
  await evaluate(`(()=>{const b=[...document.querySelectorAll('nav button')].find(x=>x.textContent.trim()==='Popyt i materiały');if(!b)throw Error('Brak obszaru materiałów');b.click()})()`);
  await click('button[data-view="bom"]');
  await until(`document.body.textContent.includes('Materiały BOM')`);
  await upload(fixtures.bom);
  await until(`document.body.textContent.includes('Materiał syntetyczny')`);
  const bom=await download('Eksport XLSX','Eksport_bom.xlsx');
  const bomRows=XLSX.utils.sheet_to_json(bom.Sheets[bom.SheetNames[0]]);
  assert.equal(bomRows[0]['Nr Części (Part No)'],'TEST-01');assert.equal(bomRows[0]['Przypisany Krok'],'T-10');assert.equal(bomRows[0]['Ilość na Wyrób'],2);
  await evaluate(`[...document.querySelectorAll('nav button')].find(b=>b.textContent.trim()==='Hala i symulacja').click()`);
  await click('button[data-view="simulation"]');
  await until(`[...document.querySelectorAll('button')].some(b=>b.textContent==='Raport symulacji CSV'&&!b.disabled)`);
  await evaluate(`[...document.querySelectorAll('nav button')].find(b=>b.textContent.trim()==='Raporty i eksport').click()`);
  await until(`[...document.querySelectorAll('button')].some(b=>b.textContent==='Raport inżynierski MD')`);
  await evaluate(`[...document.querySelectorAll('button')].find(b=>b.textContent==='Raport inżynierski MD').click()`);
  const markdown=()=>readdirSync(out).find(name=>name.endsWith('_Raport.md'));
  for(let attempt=0;!markdown()&&attempt<40;attempt++)await sleep(100);
  assert.ok(markdown(),'Brak pobranego raportu Markdown');
  assert.match(readFileSync(join(out,markdown()),'utf8'),/T-10/);
  assert.deepEqual(errors,[]);
  assert.ok(requests.some(r=>r.url.includes('/assets/spreadsheets-')),'Nie odnotowano pobrania modułu arkuszy');
  assert.deepEqual(requests.filter(r=>!r.url.startsWith('http://127.0.0.1:5301/')).map(r=>r.url),[],'Nieoczekiwane zewnętrzne żądanie w ścieżce XLSX');
  assert.deepEqual(requests.filter(r=>r.method!=='GET').map(r=>r.method),[],'Nieoczekiwane wysłanie żądania z danymi');
  assert.equal(requests.some(r=>requestMarkers.some(marker=>JSON.stringify(r).includes(marker))),false,'Marker QA pojawił się w żądaniu');
  writeFileSync(join(out,'network-summary.json'),JSON.stringify(requests.map(r=>({
    path:new URL(r.url).pathname,method:r.method,hasReferrer:'Referer' in r.headers||'referer' in r.headers,hasBody:!!r.postData
  })),null,2)+'\n');
  console.log('PASS P4a XLSX, kontrolowany błąd importu, symulacja, raport i sieć: '+out);
},{onEvent:event=>{
  if(event.method==='Network.requestWillBeSent'){
    const r=event.params.request;requests.push({url:r.url,method:r.method,headers:r.headers,postData:r.postData});
  }
}});
