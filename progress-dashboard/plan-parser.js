// Shared by the browser and Node; imports never write files.
(function(root) {
'use strict';
function parsePlan(planContent) {
  // 1. Metadata
  const createdMatch = planContent.match(/Data utworzenia:\s*([^\n]+)/);
  const updatedMatch = planContent.match(/Ostatnia aktualizacja:\s*([^\n]+)/);
  const baseVersionMatch = planContent.match(/Wersja bazowa:\s*([^\n]+)/);
  const hostingMatch = planContent.match(/Adres aplikacji[^:]*:\s*(https?:\/\/[^\s\)\],]+)/);
  const repoMatch = planContent.match(/Repozytorium:\s*(https?:\/\/[^\s\)\],]+)/);

  // 2. Stage summaries
  const stagesSummary = [...planContent.matchAll(/^\| (\d+) \| ([^\|]+) \| (wdrożone|w trakcie|nierozpoczęte) \| ([^\|]+) \|\s*$/gm)]
    .map(m => ({
      stage: Number(m[1]),
      name: m[2].trim(),
      status: m[3].trim(),
      dependencies: m[4].trim()
    }));

  // 3. Stage criteria descriptions
  const stageCriteria = {};
  for (let s = 1; s <= 8; s++) {
    const stageRegex = new RegExp(`## Etap ${s}[^\\n]*([\\s\\S]*?)(?=## Etap|## Dane i decyzje|## Rejestr|$)`);
    const match = planContent.match(stageRegex);
    if (match) {
      const criteriaMatch = match[1].match(/\*\*Odbiór etapu:\*\*\s*([^\n]+(?:\n[^\n#]+)*)/);
      if (criteriaMatch) {
        stageCriteria[s] = criteriaMatch[1].trim().replace(/\n+/g, ' ');
      }
    }
  }

  // 4. Main tasks
  const mainRows = [...planContent.matchAll(/^\| (\d+)\.(\d+) \|([^\n]*?)\| (wdrożone|w trakcie|nierozpoczęte) \|\s*$/gm)]
    .map(m => ({
      id: `${m[1]}.${m[2]}`,
      stage: Number(m[1]),
      step: Number(m[2]),
      title: m[3].trim(),
      status: m[4].trim()
    }));

  if (!mainRows.length || new Set(mainRows.map(row => row.id)).size !== mainRows.length) {
    throw new Error('Plan nie zawiera poprawnej, unikalnej listy głównych ID. Poprzedni widok zachowany.');
  }
  // 5. Sub-tasks
  const subRows = [...planContent.matchAll(/^\| (\d+)\.(\d+)\.(\d+(?:\.\d+)?) \|([^\n]*?)\| (wdrożone|w trakcie|nierozpoczęte) \|\s*$/gm)]
    .map(m => ({
      id: `${m[1]}.${m[2]}.${m[3]}`,
      parentId: `${m[1]}.${m[2]}`,
      stage: Number(m[1]),
      step: Number(m[2]),
      subStep: m[3],
      title: m[4].trim(),
      status: m[5].trim()
    }));

  // Map subtasks into main tasks
  const subTasksByParent = {};
  for (const sub of subRows) {
    if (!subTasksByParent[sub.parentId]) {
      subTasksByParent[sub.parentId] = [];
    }
    subTasksByParent[sub.parentId].push(sub);
  }

  const tasksWithSubs = mainRows.map(task => ({
    ...task,
    subtasks: subTasksByParent[task.id] || []
  }));

  // 6. Stages structure
  const stageNames = {
    1: 'Stabilizacja i bezpieczeństwo projektu',
    2: 'Dokładniejszy model procesu i zasobów',
    3: 'Symulacja powiązana z rzeczywistym layoutem',
    4: 'Balansowanie i porównywanie wariantów',
    5: 'Wygodny edytor hali i spójny interfejs',
    6: 'Biblioteka wyposażenia i czytelne 3D',
    7: 'Walidacja różnych procesów i przygotowanie komercyjne',
    8: 'VSM i A3 w kolejnej wersji'
  };

  const stages = [];
  for (let s = 1; s <= 8; s++) {
    const stageTasks = tasksWithSubs.filter(t => t.stage === s);
    const summary = stagesSummary.find(sm => sm.stage === s);
    const doneCount = stageTasks.filter(t => t.status === 'wdrożone').length;
    const inProgressCount = stageTasks.filter(t => t.status === 'w trakcie').length;
    const pendingCount = stageTasks.filter(t => t.status === 'nierozpoczęte').length;
    const totalCount = stageTasks.length;
    const percent = totalCount > 0 ? (100 * doneCount / totalCount) : 0;

    const stageStatus = totalCount > 0 && doneCount === totalCount ? 'wdrożone'
      : doneCount > 0 || inProgressCount > 0 ? 'w trakcie' : 'nierozpoczęte';

    stages.push({
      stage: s,
      name: summary ? summary.name : stageNames[s] || `Etap ${s}`,
      status: stageStatus,
      dependencies: summary ? summary.dependencies : '',
      criteria: stageCriteria[s] || '',
      tasks: stageTasks,
      stats: {
        total: totalCount,
        done: doneCount,
        inProgress: inProgressCount,
        pending: pendingCount,
        percent: Number(percent.toFixed(1))
      }
    });
  }

  // 7. Overall Stats
  const totalMain = mainRows.length;
  const totalDone = mainRows.filter(t => t.status === 'wdrożone').length;
  const totalInProgress = mainRows.filter(t => t.status === 'w trakcie').length;
  const totalPending = mainRows.filter(t => t.status === 'nierozpoczęte').length;
  const totalPercent = totalMain > 0 ? Number(((100 * totalDone) / totalMain).toFixed(1)) : 0;

  // First release stats (stages 1-7)
  const firstReleaseTasks = mainRows.filter(t => t.stage <= 7);
  const firstReleaseTotal = firstReleaseTasks.length;
  const firstReleaseDone = firstReleaseTasks.filter(t => t.status === 'wdrożone').length;
  const firstReleaseInProgress = firstReleaseTasks.filter(t => t.status === 'w trakcie').length;
  const firstReleasePending = firstReleaseTasks.filter(t => t.status === 'nierozpoczęte').length;
  const firstReleasePercent = firstReleaseTotal > 0 ? Number(((100 * firstReleaseDone) / firstReleaseTotal).toFixed(1)) : 0;

  // Keep the active section separate from historical acceptance claims.
  const packages = [...planContent.matchAll(/^## (Bieżący pakiet|Historyczny pakiet)([^\n]*)\n([\s\S]*?)(?=^## |$(?![\s\S]))/gm)]
    .flatMap(match => match[3].trim().split(/\n\n(?=\d+\.\d+)/).filter(Boolean).map(block => ({
      tag: match[1] === 'Bieżący pakiet' ? 'Bieżący pakiet' : (block.match(/^([^:]+):/)?.[1] || 'Historia'),
      date: match[2].match(/\d{4}-\d{2}-\d{2}/)?.[0] || '',
      historical: match[1] === 'Historyczny pakiet', summary: block
    })));

  // 9. Changelog table entries
  const changelog = [...planContent.matchAll(/^\| (\d{4}-\d{2}-\d{2}) \| ([^\|]+) \| ([^\|]+) \| ([^\|]+) \|\s*$/gm)]
    .map(m => ({
      date: m[1].trim(),
      id: m[2].trim(),
      change: m[3].trim(),
      notes: m[4].trim()
    }));

  // 10. Open decisions / Data gaps
  const decisionsSection = planContent.match(/## Dane i decyzje do uzupełnienia([\s\S]*?)(?=## Rejestr)/)?.[1] || '';
  const decisions = [...decisionsSection.matchAll(/^\| ([^\|]+) \| ([^\|]+) \| ([^\|]+) \|\s*$/gm)]
    .filter(m => !m[1].includes('Temat') && !m[1].includes('---'))
    .map(m => ({
      topic: m[1].trim(),
      infoNeeded: m[2].trim(),
      status: m[3].trim()
    }));

  return {
    meta: {
      title: 'Layout Studio Pro — Plan Rozwoju i Postęp',
      createdAt: createdMatch ? createdMatch[1].trim() : '2026-09-29',
      lastUpdated: updatedMatch ? updatedMatch[1].trim() : '2026-10-12',
      baseVersion: baseVersionMatch ? baseVersionMatch[1].trim() : 'Layout Studio Pro 3D 0.4.0',
      hostingUrl: hostingMatch ? hostingMatch[1] : 'https://layout-studio-pro-3d.vercel.app/',
      repoUrl: repoMatch ? repoMatch[1].replace(/[.,;]+$/, '') : 'https://github.com/Petretto/Layout-Studio-Pro-3D',
      extractedAt: new Date().toISOString()
    },
    overall: {
      total: totalMain,
      done: totalDone,
      inProgress: totalInProgress,
      pending: totalPending,
      percent: totalPercent
    },
    firstRelease: {
      total: firstReleaseTotal,
      done: firstReleaseDone,
      inProgress: firstReleaseInProgress,
      pending: firstReleasePending,
      percent: firstReleasePercent
    },
    stages,
    packages,
    changelog,
    decisions
  };
}


function plain(value) { return String(value ?? '').replace(/\*\*|`/g, '').trim(); }
function table(text, header) {
  const lines=String(text ?? '').replace(/\r/g,'').split('\n');
  const start=lines.findIndex(line=>line.startsWith(`| ${header} |`));
  if(start<0)return [];
  const rows=[];
  for(const line of lines.slice(start+2)) {
    if(!line.startsWith('|'))break;
    rows.push(line.split('|').slice(1,-1).map(plain));
  }
  return rows;
}
function parseRemediation(sources) {
  const missing=['plan','architecture','scope','matrix','tests'].filter(key=>!sources[key]);
  if(missing.length)return {available:false,reason:`Brak źródeł remediacji: ${missing.join(', ')}. Nie można ocenić bramek wydania.`};
  const models=table(sources.plan,'Pakiet');
  const packages=table(sources.plan,'Kolejność').map(([order,label='',status,dependencies='',condition])=>{
    const [id,...name]=label.split(' — ');
    const model=models.find(entry=>entry[0]===id);
    return {order:Number(order),id,name:name.join(' — '),status,dependencies:dependencies==='—'?[]:dependencies.split(',').map(x=>x.trim()),condition,
      analysis:model?.[1]??'Nie określono',implementation:model?.[2]??'Nie określono',verification:model?.[3]??'Nie określono'};
  });
  const gates=table(sources.plan,'Bramka').map(([id,condition,status,evidence])=>({id,condition,status,evidence}));
  const decisions=table(sources.plan,'Decyzja').map(([id,requirement,acceptance])=>({id,requirement,acceptance}));
  const findings=table(sources.matrix,'ID / waga').map(([label,status,evidence,packages,test,closure])=>({id:label.match(/^(BL-\d+|S-\d+)/)?.[0],label,status,evidence,packages,test,closure}));
  const testIds=[...sources.tests.matchAll(/^\| (T\d{2}) /gm)].map(x=>x[1]);
  const uiIds=[...sources.tests.matchAll(/^\| (U\d{2}) /gm)].map(x=>x[1]);
  const unique=items=>new Set(items).size===items.length;
  const includesAll=(items,required)=>required.every(id=>items.includes(id));
  if(!packages.length||!gates.length||!decisions.length||!findings.length||
    !unique(packages.map(x=>x.id))||!unique(gates.map(x=>x.id))||!unique(findings.map(x=>x.id))||
    packages.some(x=>!['wdrożone','w trakcie','nierozpoczęte'].includes(x.status)||!Number.isFinite(x.order))||
    gates.some(x=>!['otwarta','zamknięta'].includes(x.status))||
    packages.some(x=>x.dependencies.some(id=>!packages.some(p=>p.id===id)))||
    !includesAll(packages.map(x=>x.id),['P0','PT','P1','P4b','P4a','P2a','P2b','P2c','P2d','P3','P4c','P5'])||
    !includesAll(gates.map(x=>x.id),['G0','G1','G2','G3','G4','G5'])||
    !includesAll(decisions.map(x=>x.id),['A-01','A-02','A-03','A-04'])||
    !includesAll(findings.map(x=>x.id),['BL-01','BL-02','BL-03',...Array.from({length:18},(_,i)=>'S-'+String(i+1).padStart(2,'0'))])||
    !includesAll(testIds,Array.from({length:28},(_,i)=>'T'+String(i+1).padStart(2,'0')))||
    !includesAll(uiIds,Array.from({length:12},(_,i)=>'U'+String(i+1).padStart(2,'0')))) {
    return {available:false,reason:'Niekompletny lub nieprawidłowy rejestr remediacji. Sprawdź statusy, ID i zależności w dokumentach.'};
  }
  const done=packages.filter(x=>x.status==='wdrożone').length;
  return {available:true,packages,decisions,gates,findings,testIds,uiIds,
    stats:{total:packages.length,done,inProgress:packages.filter(x=>x.status==='w trakcie').length,pending:packages.filter(x=>x.status==='nierozpoczęte').length},
    accepted:gates.every(x=>x.status==='zamknięta')&&done===packages.length,
    next:packages.find(x=>x.status!=='wdrożone')??null};
}
root.ProgressDashboard = {parsePlan,parseRemediation};
})(globalThis);
