import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,mkdtempSync,mkdirSync,copyFileSync,writeFileSync,readdirSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {resolve,join,dirname,relative,sep} from 'node:path';
import {spawn,execFileSync} from 'node:child_process';
import {runInNewContext} from 'node:vm';
import {readDashboard,readSources,sources} from './sources.mjs';
const {parsePlan,parseRemediation}=globalThis.ProgressDashboard;
const input=readSources().text;

test('Główne liczniki odpowiadają plan_progress; pakiety nie są dodatkowymi ID',()=>{
  const d=readDashboard(),cli=execFileSync(process.execPath,['scripts/plan_progress.mjs'],{encoding:'utf8'});
  assert.match(cli,new RegExp(`Cały plan: ${d.overall.done}/${d.overall.total}`));
  assert.deepEqual([d.overall.done,d.overall.total,d.overall.inProgress],[61,72,7]);
  assert.deepEqual([d.firstRelease.done,d.firstRelease.total],[61,68]);
  assert.equal(d.stages[6].status,'w trakcie');
  const registryRows=input.plan.split(/\r?\n/).filter(line=>/^\| \d+ \|/.test(line)).map(line=>line.split('|').map(cell=>cell.trim()));
  assert.equal(d.remediation.stats.total,12);assert.equal(d.remediation.stats.done,registryRows.filter(row=>row[3]==='wdrożone').length);
  assert.equal(d.remediation.findings.length,21);assert.equal(d.remediation.decisions.length,4);
  assert.equal(d.remediation.testIds.length,28);assert.equal(d.remediation.uiIds.length,12);
  assert.equal(d.remediation.gates.length,6);assert.equal(d.remediation.accepted,false);
  assert.equal(d.remediation.next.id,registryRows.find(row=>row[3]!=='wdrożone')[2].split(' — ')[0]);assert.equal(d.packages[0].historical,false);
  assert.ok(!d.packages[0].summary.includes('7.9 w pełni wdrożony'));
});
test('Nieaktualne podsumowanie wdrożone nie zamyka otwartych zadań etapu',()=>{
  const main=input.main.replace('| 7 | Walidacja różnych procesów i przygotowanie komercyjne | w trakcie |','| 7 | Walidacja różnych procesów i przygotowanie komercyjne | wdrożone |');
  assert.equal(parsePlan(main).stages[6].status,'w trakcie');
});
test('Brakujące i uszkodzone źródła nie dają gotowości wydania',()=>{
  assert.equal(parseRemediation({...input,matrix:''}).available,false);
  assert.equal(parseRemediation({...input,plan:input.plan.replace(/^\| G2 \|.*\n/m,'')}).available,false);
  assert.equal(parseRemediation({...input,plan:input.plan.replace('| P0, PT |','| NIEZNANY |')}).available,false);
  assert.throws(()=>parsePlan('Nie jest planem'),/głównych ID/);
});
test('Zamknięcie bramek bez ukończenia pakietów nadal nie odbiera V1',()=>{
  const source={...input,plan:input.plan.replace(/\| otwarta \|/g,'| zamknięta |')};
  assert.equal(parseRemediation(source).accepted,false);
});
test('Status, zależności i modele pochodzą z rejestru, nie ze snapshotu',()=>{
  const source={...input,plan:input.plan.replace(/^(\| 1 \| P0 [^|]+\| )[^|]+/m,'$1w trakcie ')};
  const r=parseRemediation(source);assert.equal(r.packages[0].status,'w trakcie');
  assert.equal(r.stats.inProgress,parseRemediation(input).stats.inProgress + (parseRemediation(input).packages[0].status === 'w trakcie' ? 0 : 1));assert.ok(r.packages[5].dependencies.includes('P1'));
  assert.match(r.packages[0].analysis,/Sol/);assert.match(r.packages[0].verification,/Opus/);
});
test('Przeglądarka i Node używają tego samego parsera, także po imporcie MD',()=>{
  const context={};runInNewContext(readFileSync(new URL('./plan-parser.js',import.meta.url),'utf8'),context);
  assert.equal(JSON.stringify(context.ProgressDashboard.parsePlan(input.main).overall),JSON.stringify(parsePlan(input.main).overall));
  assert.equal(context.ProgressDashboard.parseRemediation(input).findings.length,21);
});
test('HTTP reaguje na zmianę dodatkowego dokumentu i brak źródła; linki są ograniczone do dokumentów',async()=>{
  const temp=mkdtempSync(join(tmpdir(),'layout-dashboard-test-'));
  const dashboard=join(temp,'progress-dashboard');mkdirSync(dashboard);
  for(const name of readdirSync(new URL('./',import.meta.url)).filter(name=>/\.(mjs|js|html)$/.test(name)))copyFileSync(new URL(name,import.meta.url),join(dashboard,name));
  for(const source of sources){const dest=join(temp,source.path);mkdirSync(dirname(dest),{recursive:true});copyFileSync(source.url,dest);}
  const server=spawn(process.execPath,[join(dashboard,'server.mjs')],{env:{...process.env,PORT:'0',DASHBOARD_NO_OPEN:'1'},windowsHide:true,stdio:['ignore','pipe','pipe']});
  let log='';server.stdout.on('data',data=>{log+=data});server.stderr.on('data',data=>{log+=data});
  try {
    let url;
    for(let attempt=0;attempt<80;attempt++){url=log.match(/http:\/\/127\.0\.0\.1:\d+/)?.[0];if(url)break;await new Promise(r=>setTimeout(r,50));}
    assert.ok(url,log);
    const old=await(await fetch(url+'/api/status')).json();
    assert.equal((await(await fetch(url+'/api/dashboard')).json()).remediation.findings.length,21);
    const file=join(temp,'docs/plany/MACIERZ_AUDYT_REMEDIACJA.md');
    writeFileSync(file,readFileSync(file,'utf8').replace('| S-18 / niska |','| S-18 / niska — test zmiany źródła |'));
    const next=await(await fetch(url+'/api/status')).json();assert.notEqual(next.signature,old.signature);
    assert.match((await(await fetch(url+'/api/dashboard')).json()).remediation.findings.at(-1).label,/test zmiany źródła/);
    const architecture=join(temp,'docs/plany/ARCHITEKTURA_INTEGRACJI_MODELI_V1.md');writeFileSync(architecture,'');
    assert.equal((await(await fetch(url+'/api/dashboard')).json()).remediation.available,false);
    assert.equal((await fetch(url+'/documents/PLAN_TESTOW_RC2.md')).status,200);
    assert.equal((await fetch(url+'/server.mjs')).status,404);
  } finally {
    if(server.exitCode===null){const exit=new Promise(r=>server.once('exit',r));server.kill();await exit;}
    // Verify the only recursive cleanup target is the unique directory created by this test.
    const within=relative(resolve(tmpdir()),resolve(temp));
    assert.ok(within&&!within.startsWith('..')&&!within.includes(sep)&&within.startsWith('layout-dashboard-test-'));
    rmSync(temp,{recursive:true,force:true});
  }
});
