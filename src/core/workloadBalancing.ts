import type {ProcessStep, Workstation} from './models/types';
import type {DomainOperation} from './domainProject';

export interface StationWorkloadBreakdown {
  stationId: string;
  stationName: string;
  copies: number;
  operatorsPerCopy: number;
  totalOperators: number;

  // 1. Obciążenie stanowiska
  stationCycleSeconds: number;
  stationWorkloadPercent: number;
  stationDenominatorSeconds: number;
  stationDenominatorDescription: string;
  stationFormula: string;

  // 2. Obciążenie maszyn
  machineCycleSeconds: number;
  machineWorkloadPercent: number;
  machineDenominatorSeconds: number;
  machineDenominatorDescription: string;
  machineFormula: string;

  // 3. Obciążenie operatorów
  operatorCycleSeconds: number;
  operatorWorkloadPercent: number;
  operatorDenominatorSeconds: number;
  operatorDenominatorDescription: string;
  operatorFormula: string;
}

export function round3(val: number): number {
  return Math.round((val + Number.EPSILON) * 1000) / 1000;
}

export function calculateStaticWorkload(
  station: Workstation,
  taktTimeSeconds: number,
  steps: readonly (ProcessStep | DomainOperation)[],
  settings?: {operators?: number; parallelStations?: number},
): StationWorkloadBreakdown {
  const copies = Math.max(1, settings?.parallelStations ?? station.parallelStations ?? 1);
  const operatorsPerCopy = Math.max(1, settings?.operators ?? station.operators ?? 1);
  const totalOperators = copies * operatorsPerCopy;

  const stepsById = new Map(steps.map(s => [s.id, s]));
  let stationCycle = 0;
  let machineCycle = 0;
  let operatorCycle = 0;

  for (const stepId of station.assignedStepIds) {
    const step = stepsById.get(stepId);
    if (!step) continue;

    const standardTime = step.standardTimeSeconds;
    stationCycle += standardTime;

    // Sprawdzamy czy mamy rozbicie czasowe ze schematu 6
    const domainOp = step as DomainOperation;
    if (domainOp.timeProfile) {
      const machineTime = domainOp.timeProfile.machineRun?.reduce(
        (sum, int) => sum + Math.max(0, int.endSeconds - int.startSeconds),
        0,
      ) ?? 0;
      const manualTime = domainOp.timeProfile.manualWork?.reduce(
        (sum, int) => sum + Math.max(0, int.endSeconds - int.startSeconds),
        0,
      ) ?? 0;
      machineCycle += machineTime;
      operatorCycle += manualTime;
    } else {
      // W schematach bez podziału technologicznego praca manualna odpowiada standardTime
      operatorCycle += standardTime;
    }
  }

  const safeTakt = taktTimeSeconds > 0 ? taktTimeSeconds : 1;

  // 1. Stanowisko: mianownik = copies * taktTime
  const stationDenominator = round3(copies * safeTakt);
  const stationWorkloadPercent = round3((stationCycle / stationDenominator) * 100);
  const stationDenominatorDescription = `czas taktu (${round3(safeTakt)} s) × ${copies} ${copies === 1 ? 'kopia' : copies < 5 ? 'kopie' : 'kopii'} = ${stationDenominator} s`;
  const stationFormula = `${round3(stationCycle)} s / (${copies} × ${round3(safeTakt)} s) = ${stationWorkloadPercent.toFixed(1)}%`;

  // 2. Maszyna: mianownik = copies * taktTime
  const machineDenominator = round3(copies * safeTakt);
  const machineWorkloadPercent = round3((machineCycle / machineDenominator) * 100);
  const machineDenominatorDescription = `czas taktu (${round3(safeTakt)} s) × ${copies} ${copies === 1 ? 'kopia' : copies < 5 ? 'kopie' : 'kopii'} = ${machineDenominator} s`;
  const machineFormula = `${round3(machineCycle)} s / (${copies} × ${round3(safeTakt)} s) = ${machineWorkloadPercent.toFixed(1)}%`;

  // 3. Operatorzy: mianownik = totalOperators * taktTime
  const operatorDenominator = round3(totalOperators * safeTakt);
  const operatorWorkloadPercent = round3((operatorCycle / operatorDenominator) * 100);
  const operatorDenominatorDescription = `czas taktu (${round3(safeTakt)} s) × ${totalOperators} ${totalOperators === 1 ? 'operator' : 'operatorów'} = ${operatorDenominator} s`;
  const operatorFormula = `${round3(operatorCycle)} s / (${totalOperators} × ${round3(safeTakt)} s) = ${operatorWorkloadPercent.toFixed(1)}%`;

  return {
    stationId: station.id,
    stationName: station.name,
    copies,
    operatorsPerCopy,
    totalOperators,
    stationCycleSeconds: round3(stationCycle),
    stationWorkloadPercent,
    stationDenominatorSeconds: stationDenominator,
    stationDenominatorDescription,
    stationFormula,
    machineCycleSeconds: round3(machineCycle),
    machineWorkloadPercent,
    machineDenominatorSeconds: machineDenominator,
    machineDenominatorDescription,
    machineFormula,
    operatorCycleSeconds: round3(operatorCycle),
    operatorWorkloadPercent,
    operatorDenominatorSeconds: operatorDenominator,
    operatorDenominatorDescription,
    operatorFormula,
  };
}
