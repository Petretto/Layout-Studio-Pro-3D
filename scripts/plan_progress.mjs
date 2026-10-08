import {readFileSync} from 'node:fs';

const plan=readFileSync(new URL('../PLAN_ROZWOJU.md',import.meta.url),'utf8');
// Count main IDs only: a parent and its implementation packages must not count twice.
const rows=[...plan.matchAll(/^\| (\d+)\.(\d+) \|[^\n]*?\| (wdrożone|w trakcie|nierozpoczęte) \|\s*$/gm)]
  .map(match=>({id:`${match[1]}.${match[2]}`,stage:Number(match[1]),status:match[3]}));
if(!rows.length||new Set(rows.map(row=>row.id)).size!==rows.length)throw new Error('Brak głównych ID albo powtórzone ID planu.');
function show(label,list){
  const done=list.filter(row=>row.status==='wdrożone').length;
  console.log(`${label}: ${done}/${list.length} = ${(100*done/list.length).toFixed(1).replace('.',',')}% (w trakcie: ${list.filter(row=>row.status==='w trakcie').length})`);
}
show('Cały plan',rows);
show('Pierwsze wydanie (etapy 1–7)',rows.filter(row=>row.stage<=7));
for(const stage of [...new Set(rows.map(row=>row.stage))].sort((a,b)=>a-b))show(`Etap ${stage}`,rows.filter(row=>row.stage===stage));
