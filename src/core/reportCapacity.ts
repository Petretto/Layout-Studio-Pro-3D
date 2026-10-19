import type {LineBalancingResult} from './models/types';
import {effectiveCycle} from './resources';

/** Nominal static bound from configured station intervals; not simulated throughput or demand. */
export function nominalReportCapacity(balance:LineBalancingResult|undefined):number|null{
  const intervals=balance?.workstations.filter(s=>s.assignedStepIds.length>0).map(effectiveCycle)??[];
  if(!intervals.length||intervals.some(t=>!Number.isFinite(t)||t<=0))return null;
  return 3600/Math.max(...intervals);
}
