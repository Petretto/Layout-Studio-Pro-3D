import { ProcessStep, Workstation, LineBalancingResult } from '../models/types';
import { processErrors, topologicalSort } from '../validation';
export function runLineBalancing(steps:ProcessStep[],target:number,algorithm:'RPW'|'LCR'|'Manual'='RPW'):LineBalancingResult{
  if(!Number.isFinite(target)||target<=0)throw new Error('Docelowy czas cyklu musi być dodatni.');
  const errors=processErrors(steps);if(errors.length)throw new Error(errors.join('\n'));
  const total=steps.reduce((n,s)=>n+s.standardTimeSeconds,0),stations:Workstation[]=[];
  const add=(ids:string[])=>{const time=ids.reduce((n,id)=>n+steps.find(s=>s.id===id)!.standardTimeSeconds,0);stations.push({id:`WS-${stations.length+1}`,name:`Stanowisko ${stations.length+1}`,sequenceIndex:stations.length+1,assignedStepIds:ids,cycleTimeSeconds:time,isBottleneck:time>target+1e-9,xMm:0,yMm:0});};
  if(algorithm==='Manual'){
    const assignment=new Map(steps.map(s=>[s.id,Number(s.assignedWorkstationId?.replace('WS-',''))]));
    for(const s of steps){const n=assignment.get(s.id)!;if(!Number.isInteger(n)||n<1||n>steps.length)throw new Error(`${s.id}: przypisz numer stanowiska 1–${steps.length}.`);if(s.predecessorIds.some(id=>assignment.get(id)!>n))throw new Error(`${s.id}: poprzednik jest na późniejszym stanowisku.`);}
    const groups=[...new Set(assignment.values())].sort((a,b)=>a-b);if(groups.some((n,i)=>n!==i+1))throw new Error('Numeruj stanowiska kolejno od 1, bez luk.');
    const ordered=topologicalSort(steps);groups.forEach(n=>add(ordered.filter(s=>assignment.get(s.id)===n).map(s=>s.id)));
  }else{
    const successors=new Map(steps.map(s=>[s.id,steps.filter(x=>x.predecessorIds.includes(s.id)).map(x=>x.id)]));
    const weights=new Map(steps.map(s=>{const seen=new Set<string>(),pending=[s.id];while(pending.length){const id=pending.pop()!;if(seen.has(id))continue;seen.add(id);pending.push(...successors.get(id)!);}return [s.id,steps.filter(x=>seen.has(x.id)).reduce((n,x)=>n+x.standardTimeSeconds,0)];}));
    const ordered=[...steps].sort((a,b)=>(algorithm==='RPW'?weights.get(b.id)!-weights.get(a.id)!:b.standardTimeSeconds-a.standardTimeSeconds)||a.sequenceNumber-b.sequenceNumber||a.id.localeCompare(b.id));
    const assigned=new Set<string>();
    while(assigned.size<steps.length){const ids:string[]=[];let time=0;while(true){const s=ordered.find(s=>!assigned.has(s.id)&&s.predecessorIds.every(id=>assigned.has(id))&&(ids.length===0||time+s.standardTimeSeconds<=target+1e-9));if(!s)break;ids.push(s.id);time+=s.standardTimeSeconds;assigned.add(s.id);}if(!ids.length)throw new Error('Nie można przypisać pozostałych operacji.');add(ids);}
  }
  const max=Math.max(0,...stations.map(s=>s.cycleTimeSeconds));const efficiency=stations.length?total/(stations.length*Math.max(target,max))*100:0;
  return {taktTimeSeconds:target,totalWorkContentSeconds:total,theoreticalMinWorkstations:Math.ceil(total/target),actualWorkstationsCount:stations.length,lineEfficiencyPercent:efficiency,balanceDelayPercent:stations.length?100-efficiency:0,bottleneckStationName:stations.find(s=>s.cycleTimeSeconds===max)?.name??'Brak',bottleneckCycleTimeSeconds:max,workstations:stations};
}
