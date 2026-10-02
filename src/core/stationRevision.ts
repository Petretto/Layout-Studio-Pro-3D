import type {StationProjectV5} from './stationMigration';
import {parseStationProjectV5} from './stationProject';
import {reviseStations, type StationPlan} from './stationRegistry';

/** Commit an explicit identity plan. Retirement is allowed only after all
 * equipment and resource bindings have been resolved by the caller.
 */
export function reviseStationProject(
  input: StationProjectV5,
  plan: readonly StationPlan[],
  allocateId?: () => string,
) {
  const project = parseStationProjectV5(JSON.stringify(input));
  const revision = reviseStations(project.stations, plan, project.processSteps.map(s => s.id), allocateId);
  const owner = new Map(revision.stations.flatMap(s => s.operationIds.map(id => [id, s.id] as const)));
  if (owner.size !== project.processSteps.length) throw new Error('Każda operacja musi mieć stanowisko przed zatwierdzeniem zmiany.');
  for (const id of revision.retiredIds) {
    const objects = project.layoutObjects.filter(o => o.workstationId === id);
    const hasResources = Object.prototype.hasOwnProperty.call(project.workstationSettings, id);
    if (objects.length || hasResources) throw new Error(`Stanowisko ${id} ma ${objects.length} powiązanych obiektów${hasResources ? ' i ustawienia zasobów' : ''}. Rozstrzygnij je jawnie przed wycofaniem ID.`);
  }
  const processSteps = project.processSteps.map(s => ({...s, assignedWorkstationId: owner.get(s.id)}));
  const result = parseStationProjectV5(JSON.stringify({...project, algorithm: 'Manual',
    stations: revision.stations, processSteps}));
  return {project: result, createdIds: revision.createdIds, retiredIds: revision.retiredIds};
}

/** Keep the source physical station and its bindings; the inserted station starts
 * with a new ID and no resource or layout bindings. */
export function splitStationProject(
  input: StationProjectV5,
  sourceId: string,
  movedOperationIds: readonly string[],
  newName: string,
  allocateId?: () => string,
) {
  const project = parseStationProjectV5(JSON.stringify(input));
  const index = project.stations.findIndex(s => s.id === sourceId);
  if (index < 0) throw new Error(`Nieznane stanowisko: ${sourceId}.`);
  const source = project.stations[index];
  const moved = new Set(movedOperationIds);
  if (!newName.trim()) throw new Error('Nowe stanowisko wymaga nazwy.');
  if (!moved.size || moved.size !== movedOperationIds.length || moved.size >= source.operationIds.length ||
      [...moved].some(id => !source.operationIds.includes(id))) {
    throw new Error('Wybierz część operacji istniejącego stanowiska do podziału.');
  }
  const plan: StationPlan[] = project.stations.map(s => ({...s, operationIds: [...s.operationIds]}));
  plan[index].operationIds = source.operationIds.filter(id => !moved.has(id));
  plan.splice(index + 1, 0, {name: newName.trim(), operationIds: source.operationIds.filter(id => moved.has(id))});
  return reviseStationProject(project, plan, allocateId);
}

export interface StationMergeDecision {
  keepId: string;
  retireId: string;
  /** Exact IDs of equipment intentionally removed with the retired station. */
  removeObjectIds: readonly string[];
  /** Explicit permission to remove settings held by the retired ID. */
  removeResourceSettings: boolean;
}

/** Merge assignments into the physical station selected to survive. Nothing
 * bound to the retired ID is reassigned by similarity or position. */
export function mergeStationProject(input: StationProjectV5, decision: StationMergeDecision) {
  const project = parseStationProjectV5(JSON.stringify(input));
  const keep = project.stations.find(s => s.id === decision.keepId);
  const retire = project.stations.find(s => s.id === decision.retireId);
  if (!keep || !retire || keep.id === retire.id) throw new Error('Wybierz dwa różne istniejące stanowiska.');
  const linked = project.layoutObjects.filter(o => o.workstationId === retire.id);
  const expected = new Set(linked.map(o => o.id));
  const approved = new Set(decision.removeObjectIds);
  if (approved.size !== decision.removeObjectIds.length || approved.size !== expected.size ||
      [...approved].some(id => !expected.has(id))) {
    throw new Error('Powiązane obiekty wycofywanego stanowiska wymagają dokładnej decyzji.');
  }
  const hasSettings = Object.prototype.hasOwnProperty.call(project.workstationSettings, retire.id);
  if (hasSettings && !decision.removeResourceSettings) {
    throw new Error('Ustawienia zasobów wycofywanego stanowiska wymagają jawnej decyzji.');
  }
  const workstationSettings = {...project.workstationSettings};
  if (decision.removeResourceSettings) delete workstationSettings[retire.id];
  const detached = parseStationProjectV5(JSON.stringify({...project, workstationSettings,
    layoutObjects: project.layoutObjects.filter(o => !approved.has(o.id)),
  }));
  const plan = detached.stations.filter(s => s.id !== retire.id).map(s => s.id === keep.id ?
    {...s, operationIds: [...keep.operationIds, ...retire.operationIds]} : s);
  return reviseStationProject(detached, plan);
}

/** Remove an operation from schema 5 without removing the physical station.
 * The containing station retains its stable ID, its equipment and its resource settings.
 * Predecessor references and associated BOM items are cleaned up.
 */
export function removeStationOperation(
  input: StationProjectV5,
  operationId: string,
): StationProjectV5 {
  const project = parseStationProjectV5(JSON.stringify(input));
  if (!project.processSteps.some(s => s.id === operationId)) {
    throw new Error(`Operacja ${operationId} nie istnieje.`);
  }
  const stations = project.stations.map(s => ({
    ...s,
    operationIds: s.operationIds.filter(id => id !== operationId),
  }));
  const owner = new Map(stations.flatMap(s => s.operationIds.map(id => [id, s.id] as const)));
  const processSteps = project.processSteps
    .filter(s => s.id !== operationId)
    .map(s => ({
      ...s,
      predecessorIds: s.predecessorIds.filter(id => id !== operationId),
      assignedWorkstationId: owner.get(s.id),
    }));
  const bom = project.bom.filter(b => b.associatedProcessStepId !== operationId);
  return parseStationProjectV5(JSON.stringify({
    ...project,
    algorithm: 'Manual',
    stations,
    processSteps,
    bom,
  }));
}
