import { DemandConfig } from '../models/types';
export function calculateTaktTime(d:DemandConfig){
  const dailyDemand=d.yearlyDemand/d.workingDaysPerYear;
  const available=(d.hoursPerShift*3600-d.plannedBreaksMinutesPerShift*60)*d.shiftsPerDay;
  const effective=available*d.oeePercent/100, target=effective/dailyDemand;
  return {dailyDemand,monthlyDemand:d.yearlyDemand/12,weeklyDemand:dailyDemand*5,netOperatingSecondsPerShift:effective/d.shiftsPerDay,netOperatingSecondsPerDay:effective,customerTaktSeconds:available/dailyDemand,taktTimeSeconds:target,requiredPartsPerHour:target>0?3600/target:0,requiredPartsPerMinute:target>0?60/target:0};
}
