import {ProcessStep,ProjectData,Workstation} from '../models/types';
export function stationEdges(steps:ProcessStep[],stations:Workstation[]){
  const owner=new Map(stations.flatMap(s=>s.assignedStepIds.map(id=>[id,s.id] as const)));
  const seen=new Set<string>();const edges:{from:string;to:string}[]=[];
  for(const step of steps)for(const id of step.predecessorIds){
    const from=owner.get(id),to=owner.get(step.id),key=JSON.stringify([from,to]);
    if(from&&to&&from!==to&&!seen.has(key)){edges.push({from,to});seen.add(key);}
  }return edges;
}
export function layoutRoutes(p:ProjectData){
  const tables=p.layoutObjects.filter(o=>o.type.includes('Table'));
  // All physical alternatives shown; these are dependencies, not traffic counts.
  return stationEdges(p.processSteps,p.balancing?.workstations??[]).flatMap(e=>
    tables.filter(o=>o.workstationId===e.from).flatMap(a=>tables.filter(o=>o.workstationId===e.to).map(b=>({a,b}))));
}
export function graphPositions(steps:ProcessStep[],stations:Workstation[],pitch:number,rowPitch:number){
  const edges=stationEdges(steps,stations),level=new Map<string,number>(),score=new Map<string,number>(),parent=new Map<string,string>();
  const pending=[...stations],ordered:Workstation[]=[];
  while(pending.length){const i=pending.findIndex(s=>edges.filter(e=>e.to===s.id).every(e=>level.has(e.from)));if(i<0)throw new Error('Zgrupowanie stanowisk tworzy cykl. Rozdziel operacje.');
    const s=pending.splice(i,1)[0],pred=edges.filter(e=>e.to===s.id).map(e=>e.from);
    level.set(s.id,Math.max(-1,...pred.map(id=>level.get(id)!))+1);
    const best=pred.sort((a,b)=>score.get(b)!-score.get(a)!)[0];if(best)parent.set(s.id,best);
    score.set(s.id,(best?score.get(best)!:0)+(s.baseCycleSeconds??s.cycleTimeSeconds));ordered.push(s);
  }
  const spine=new Set<string>();let tail=[...ordered].sort((a,b)=>score.get(b.id)!-score.get(a.id)!)[0]?.id;
  while(tail){spine.add(tail);tail=parent.get(tail)!;}
  const occupied=new Map<number,number>(),result=new Map<string,{x:number;y:number}>();
  for(const s of ordered){const column=level.get(s.id)!,row=occupied.get(column)??1;let y=0;
    if(!spine.has(s.id)){y=(row%2?1:-1)*Math.ceil(row/2)*rowPitch;occupied.set(column,row+Math.max(1,s.parallelStations??1));}
    result.set(s.id,{x:column*pitch,y});
  }
  return result;
}
