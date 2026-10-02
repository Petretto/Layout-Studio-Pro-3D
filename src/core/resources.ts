import { ProjectData, LineBalancingResult, Workstation } from './models/types';

// Bind resources to the exact group, never to a transient WS number.
export const resourceKey = (ids: string[]) => JSON.stringify([...ids].sort());
export const effectiveCycle = (ws: Workstation) => ws.effectiveCycleSeconds ?? ws.cycleTimeSeconds;
function applyConfiguredResources(balance: LineBalancingResult, configFor: (ws: Workstation) => NonNullable<ProjectData['workstationSettings']>[string] | undefined, preserveEmpty = false): LineBalancingResult {
  const workstations = balance.workstations.map(ws => {
    const config = configFor(ws);
    const operators = config?.operators ?? 1, parallelStations = config?.parallelStations ?? 1;
    const cycleTimeSeconds = preserveEmpty && !ws.assignedStepIds.length ? 0 : config?.assistedCycleSeconds ?? ws.cycleTimeSeconds;
    const effectiveCycleSeconds = cycleTimeSeconds / parallelStations;
    return {...ws, operators, parallelStations, baseCycleSeconds:ws.cycleTimeSeconds, cycleTimeSeconds, effectiveCycleSeconds,
      isBottleneck:effectiveCycleSeconds > balance.taktTimeSeconds + 1e-9};
  });
  const max = Math.max(0, ...workstations.map(effectiveCycle));
  const count = workstations.reduce((n,s)=>n+s.parallelStations!,0);
  if(count>1000)throw new Error('Limit: 1000 fizycznych stanowisk. Zmniejsz liczbę kopii.');
  const work = workstations.reduce((n,s)=>n+s.cycleTimeSeconds,0);
  const efficiency = count ? work/(count*Math.max(balance.taktTimeSeconds,max))*100 : 0;
  return {...balance, workstations, actualWorkstationsCount:count, lineEfficiencyPercent:efficiency,
    balanceDelayPercent:count?100-efficiency:0, bottleneckCycleTimeSeconds:max,
    bottleneckStationName:workstations.find(s=>effectiveCycle(s)===max)?.name??'Brak'};
}
export function applyResources(balance: LineBalancingResult, settings: ProjectData['workstationSettings'] = {}): LineBalancingResult {
  return applyConfiguredResources(balance, ws => settings?.[resourceKey(ws.assignedStepIds)]);
}
/** Schema 5 binds resources to the physical station, independent of operations. */
export function applyStationResources(balance: LineBalancingResult, settings: ProjectData['workstationSettings'] = {}): LineBalancingResult {
  return applyConfiguredResources(balance, ws => settings?.[ws.id], true);
}
