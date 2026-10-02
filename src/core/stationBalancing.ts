import type {LineBalancingResult, Workstation} from './models/types';
import type {StationProjectV5} from './stationMigration';
import {parseStationProjectV5} from './stationProject';
import {runLineBalancing} from './algorithms/lineBalancingEngine';
import {topologicalSort} from './validation';

/** Balance schema 5 using the saved station registry as the identity source.
 * Automatic regrouping requires an explicit identity decision before deriving.
 */
export function runStationBalancing(input: StationProjectV5, target: number): LineBalancingResult {
  if (!Number.isFinite(target) || target <= 0) throw new Error('Docelowy czas cyklu musi być dodatni.');
  const project = parseStationProjectV5(JSON.stringify(input));
  const steps = topologicalSort(project.processSteps);
  const stations = project.stations;
  if (project.algorithm !== 'Manual') {
    const proposal = runLineBalancing(project.processSteps, target, project.algorithm ?? 'RPW');
    const active = stations.filter(s => s.operationIds.length);
    const sameGroups = active.length === proposal.workstations.length && active.every((station, index) => {
      const proposed = proposal.workstations[index].assignedStepIds;
      return station.operationIds.length === proposed.length &&
        station.operationIds.every(id => proposed.includes(id));
    });
    if (!sameGroups) throw new Error('Automatyczny bilans zmienił grupowanie. Uzgodnij jawnie tożsamość stanowisk przed zapisem.');
  }
  const byId = new Map(steps.map(s => [s.id, s]));
  const workstations: Workstation[] = stations.map((station, index) => {
    const assignedStepIds = steps.filter(s => station.operationIds.includes(s.id)).map(s => s.id);
    const cycleTimeSeconds = assignedStepIds.reduce((sum, id) => sum + byId.get(id)!.standardTimeSeconds, 0);
    return {id: station.id, name: station.name, sequenceIndex: index + 1,
      assignedStepIds, cycleTimeSeconds, isBottleneck: cycleTimeSeconds > target + 1e-9,
      xMm: 0, yMm: 0};
  });
  const totalWorkContentSeconds = steps.reduce((sum, step) => sum + step.standardTimeSeconds, 0);
  const bottleneckCycleTimeSeconds = Math.max(0, ...workstations.map(s => s.cycleTimeSeconds));
  const lineEfficiencyPercent = workstations.length ?
    totalWorkContentSeconds / (workstations.length * Math.max(target, bottleneckCycleTimeSeconds)) * 100 : 0;
  return {taktTimeSeconds: target, totalWorkContentSeconds,
    theoreticalMinWorkstations: Math.ceil(totalWorkContentSeconds / target),
    actualWorkstationsCount: workstations.length, lineEfficiencyPercent,
    balanceDelayPercent: workstations.length ? 100 - lineEfficiencyPercent : 0,
    bottleneckStationName: workstations.find(s => s.cycleTimeSeconds === bottleneckCycleTimeSeconds)?.name ?? 'Brak',
    bottleneckCycleTimeSeconds, workstations};
}

/** Move to an existing physical station and preserve an empty source station. */
export function moveStationOperation(input: StationProjectV5, operationId: string, targetStationId: string): StationProjectV5 {
  const project = parseStationProjectV5(JSON.stringify(input));
  if (!project.processSteps.some(s => s.id === operationId)) throw new Error(`Nieznana operacja: ${operationId}.`);
  if (!project.stations.some(s => s.id === targetStationId)) throw new Error(`Nieznane stanowisko: ${targetStationId}.`);
  const stations = project.stations.map(s => ({...s,
    operationIds: [...s.operationIds.filter(id => id !== operationId), ...(s.id === targetStationId ? [operationId] : [])]}));
  const owner = new Map(stations.flatMap(s => s.operationIds.map(id => [id, s.id] as const)));
  const processSteps = project.processSteps.map(s => ({...s, assignedWorkstationId: owner.get(s.id)}));
  return parseStationProjectV5(JSON.stringify({...project, algorithm: 'Manual', stations, processSteps}));
}
