import {parseProject} from './validation';
import {derive} from './project';
import {resourceKey} from './resources';
import {reviseStations, StationRecord} from './stationRegistry';
import {ProjectData} from './models/types';
import {parseStationProjectV5} from './stationProject';

/** Review-only migration. This is deliberately not a loadable schema-5 project.
 * No storage writes and no mutation of legacy references occur here.
 */
export interface StationMigrationPreview {
  kind: 'station-migration-preview';
  version: 1;
  originalJson: string;
  legacyProject: ProjectData;
  stations: StationRecord[];
  legacyToStableId: Record<string, string>;
  layoutBindings: {objectId: string; stationId: string}[];
  resourceBindings: {stationId: string; settings: NonNullable<ProjectData['workstationSettings']>[string]}[];
  unboundResourceKeys: string[];
}

/** A schema-5 payload prepared for review. The application must not load it until
 * balancing, editors and persistence all consume stable station IDs.
 */
export interface StationProjectV5 extends Omit<ProjectData, 'schemaVersion' | 'balancing' | 'spaghetti'> {
  schemaVersion: 5;
  stations: StationRecord[];
  workstationSettings: NonNullable<ProjectData['workstationSettings']>;
}

export interface PreparedStationMigration {
  kind: 'prepared-station-migration';
  originalJson: string;
  project: StationProjectV5;
}

export function previewStationMigration(
  originalJson: string,
  allocateId?: () => string,
): StationMigrationPreview {
  // parseProject creates a fresh object; originalJson is kept byte-for-byte.
  const legacyProject = parseProject(originalJson);
  const result = derive(legacyProject);
  const errors = result.issues.filter(issue => issue.severity === 'error');
  if (errors.length) throw new Error(`Migracja wymaga poprawnego projektu: ${errors.map(e=>e.message).join('\n')}`);
  const balance = result.project.balancing;
  if (!balance) throw new Error('Nie można wyznaczyć stanowisk do migracji.');
  // Ignore a serialized balancing cache; derive() recomputes it from source data.
  const stations = reviseStations([], balance.workstations.map(ws => ({
    name: ws.name, operationIds: ws.assignedStepIds,
  })), legacyProject.processSteps.map(s => s.id), allocateId).stations;
  const legacyToStableId = Object.fromEntries(balance.workstations.map((ws,i) => [ws.id, stations[i].id]));
  const layoutBindings: StationMigrationPreview['layoutBindings'] = [];
  // Preserve all saved layout objects, including auto-mode objects; don't silently
  // replace their geometry while assigning identity. Unknown bindings need review.
  for (const object of legacyProject.layoutObjects) {
    if (!object.workstationId) continue;
    const stationId = Object.prototype.hasOwnProperty.call(legacyToStableId, object.workstationId) ? legacyToStableId[object.workstationId] : undefined;
    if (!stationId) throw new Error(`Obiekt ${object.id}: nieznane stanowisko ${object.workstationId}. Nie można bezpiecznie migrować geometrii.`);
    layoutBindings.push({objectId: object.id, stationId});
  }
  const settings = legacyProject.workstationSettings ?? {};
  const usedKeys = new Set<string>();
  const resourceBindings: StationMigrationPreview['resourceBindings'] = [];
  balance.workstations.forEach((ws,i) => {
    const key = resourceKey(ws.assignedStepIds);
    if (Object.prototype.hasOwnProperty.call(settings,key)) {
      usedKeys.add(key);
      resourceBindings.push({stationId: stations[i].id, settings: {...settings[key]}});
    }
  });
  return {kind:'station-migration-preview', version:1, originalJson, legacyProject,
    stations, legacyToStableId, layoutBindings, resourceBindings,
    unboundResourceKeys: Object.keys(settings).filter(key=>!usedKeys.has(key))};
}

/** Materialize a reviewed preview without changing the active schema-4 project.
 * Unbound resource settings require an explicit decision in a later UI step.
 */
export function prepareStationMigration(preview: StationMigrationPreview): PreparedStationMigration {
  if (preview.kind !== 'station-migration-preview' || preview.version !== 1) throw new Error('Nieznany format podglądu migracji.');
  if (preview.unboundResourceKeys.length) throw new Error(`Osierocone ustawienia zasobów: ${preview.unboundResourceKeys.join(', ')}. Rozstrzygnij je przed migracją.`);
  // Recheck source and every binding. A stale or modified preview must not
  // silently attach equipment or resources to another physical station.
  let index = 0;
  const expected = previewStationMigration(preview.originalJson, () => preview.stations[index++]?.id ?? '');
  if (JSON.stringify(expected) !== JSON.stringify(preview)) throw new Error('Podgląd migracji jest nieaktualny lub zmieniony. Przygotuj go ponownie.');
  const legacy = expected.legacyProject;
  const layoutByObject = new Map(expected.layoutBindings.map(b => [b.objectId, b.stationId]));
  const settings = Object.fromEntries(expected.resourceBindings.map(b => [b.stationId, {...b.settings}]));
  const {balancing: _balancing, spaghetti: _spaghetti, ...source} = legacy;
  const processSteps = source.processSteps.map(step => {
    const {assignedWorkstationId, ...rest} = step;
    if (source.algorithm !== 'Manual') return rest;
    const id = assignedWorkstationId && expected.legacyToStableId[assignedWorkstationId];
    if (!id) throw new Error(`${step.id}: nieznane przypisanie stanowiska.`);
    return {...rest, assignedWorkstationId: id};
  });
  const layoutObjects = source.layoutObjects.map(object => ({...object,
    ...(object.workstationId ? {workstationId: layoutByObject.get(object.id)!} : {}),
  }));
  const project: StationProjectV5 = {...source, schemaVersion: 5, processSteps, layoutObjects,
      stations: expected.stations.map(s => ({...s, operationIds: [...s.operationIds]})),
      workstationSettings: settings};
  return {kind: 'prepared-station-migration', originalJson: preview.originalJson,
    project: parseStationProjectV5(JSON.stringify(project))};
}
