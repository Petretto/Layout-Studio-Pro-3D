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
    const lockedSteps = steps.filter(s => Boolean(s.lockedWorkstation));
    if (!lockedSteps.length) {
      const assigned=new Set<string>();
      while(assigned.size<steps.length){const ids:string[]=[];let time=0;while(true){const s=ordered.find(s=>!assigned.has(s.id)&&s.predecessorIds.every(id=>assigned.has(id))&&(ids.length===0||time+s.standardTimeSeconds<=target+1e-9));if(!s)break;ids.push(s.id);time+=s.standardTimeSeconds;assigned.add(s.id);}if(!ids.length)throw new Error('Nie można przypisać pozostałych operacji.');add(ids);}
    } else {
      const lockedStations = new Map<string, number>();
      for (const s of lockedSteps) {
        const n = Number(s.assignedWorkstationId?.replace('WS-', ''));
        if (!Number.isInteger(n) || n < 1 || n > steps.length) {
          throw new Error(`${s.id}: zablokowany przydział wymaga numeru stanowiska 1–${steps.length}.`);
        }
        lockedStations.set(s.id, n);
      }

      const ancestorsMap = new Map<string, Set<string>>();
      for (const s of steps) {
        const anc = new Set<string>();
        const queue = [...s.predecessorIds];
        while (queue.length) {
          const p = queue.pop()!;
          if (!anc.has(p)) {
            anc.add(p);
            const parent = steps.find(x => x.id === p);
            if (parent) queue.push(...parent.predecessorIds);
          }
        }
        ancestorsMap.set(s.id, anc);
      }

      for (const s of lockedSteps) {
        const sWs = lockedStations.get(s.id)!;
        const anc = ancestorsMap.get(s.id)!;
        for (const aId of anc) {
          const aWs = lockedStations.get(aId);
          if (aWs !== undefined && aWs > sWs) {
            throw new Error(`Operacja ${s.id} (WS-${sWs}): poprzednik ${aId} jest zablokowany na późniejszym stanowisku (WS-${aWs}).`);
          }
        }
      }

      const assigned = new Set<string>();
      let stationIndex = 1;
      const highestLockedStation = Math.max(...lockedStations.values());

      while (assigned.size < steps.length) {
        const currentStationIndex = stationIndex;
        const lockedHere = lockedSteps.filter(s => lockedStations.get(s.id) === currentStationIndex);
        
        const mustBeHere = new Set<string>();
        for (const l of lockedHere) {
          if (!assigned.has(l.id)) {
            mustBeHere.add(l.id);
            for (const ancId of ancestorsMap.get(l.id)!) {
              if (!assigned.has(ancId)) {
                mustBeHere.add(ancId);
              }
            }
          }
        }

        const ids: string[] = [];
        let time = 0;

        while (true) {
          const remainingMustTime = [...mustBeHere]
            .filter(id => !assigned.has(id))
            .reduce((sum, id) => sum + steps.find(x => x.id === id)!.standardTimeSeconds, 0);

          const candidate = ordered.find(s => {
            if (assigned.has(s.id)) return false;
            if (!s.predecessorIds.every(id => assigned.has(id))) return false;
            
            if (s.lockedWorkstation) {
              return lockedStations.get(s.id) === currentStationIndex;
            }

            if (mustBeHere.has(s.id)) {
              return true;
            }

            if (ids.length === 0 && remainingMustTime === 0) {
              return true;
            }
            return time + s.standardTimeSeconds + remainingMustTime <= target + 1e-9;
          });

          if (!candidate) break;

          ids.push(candidate.id);
          time += candidate.standardTimeSeconds;
          assigned.add(candidate.id);
        }

        if (!ids.length) {
          if (currentStationIndex < highestLockedStation) {
            throw new Error(`Brak operacji dla stanowiska WS-${currentStationIndex}. Numeruj stanowiska kolejno od 1, bez luk.`);
          } else {
            throw new Error('Nie można przypisać pozostałych operacji.');
          }
        }

        add(ids);
        stationIndex++;
      }
    }
  }
  const max=Math.max(0,...stations.map(s=>s.cycleTimeSeconds));const efficiency=stations.length?total/(stations.length*Math.max(target,max))*100:0;
  return {taktTimeSeconds:target,totalWorkContentSeconds:total,theoreticalMinWorkstations:Math.ceil(total/target),actualWorkstationsCount:stations.length,lineEfficiencyPercent:efficiency,balanceDelayPercent:stations.length?100-efficiency:0,bottleneckStationName:stations.find(s=>s.cycleTimeSeconds===max)?.name??'Brak',bottleneckCycleTimeSeconds:max,workstations:stations};
}
