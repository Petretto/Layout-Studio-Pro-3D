import type {StationProjectV5} from './stationMigration';
import {prepareStationMigration, previewStationMigration} from './stationMigration';
import {parseStationProjectV5} from './stationProject';

/** A review artifact only. It is never written as a project or used by balancing/simulation. */
export interface DomainMigrationPreview {
  kind: 'domain-migration-preview';
  version: 1;
  sourceSchemaVersion: 4 | 5;
  originalJson: string;
  stationProject: StationProjectV5;
  operationStations: {operationId: string; stationId: string | null}[];
  stationStaffing: {
    stationId: string;
    operatorsPerCopy: number | null;
    parallelCopies: number | null;
    assistedCycleSeconds: number | null;
  }[];
  visualBindings: {objectId: string; stationId: string | null}[];
  unassignedOperationIds: string[];
  unresolved: DomainGap[];
}

export type DomainGap =
  | 'worker-identities'
  | 'worker-pools'
  | 'equipment-capabilities'
  | 'product-definition'
  | 'subassembly-definitions'
  | 'manual-automatic-time-split'
  | 'operator-presence-rules'
  | 'station-assignment';

const legacyGaps: DomainGap[] = [
  'worker-identities', 'worker-pools', 'equipment-capabilities', 'product-definition',
  'subassembly-definitions', 'manual-automatic-time-split', 'operator-presence-rules',
];

function buildPreview(originalJson: string, sourceSchemaVersion: 4 | 5, stationProject: StationProjectV5): DomainMigrationPreview {
  const owner = new Map(stationProject.stations.flatMap(station =>
    station.operationIds.map(operationId => [operationId, station.id] as const)));
  const operationStations = stationProject.processSteps.map(step => ({
    operationId: step.id, stationId: owner.get(step.id) ?? null,
  }));
  const unassignedOperationIds = operationStations.filter(link => link.stationId === null).map(link => link.operationId);
  const stationStaffing = stationProject.stations.map(station => {
    const settings = stationProject.workstationSettings[station.id];
    return {stationId: station.id, operatorsPerCopy: settings?.operators ?? null,
      parallelCopies: settings?.parallelStations ?? null,
      assistedCycleSeconds: settings?.assistedCycleSeconds ?? null};
  });
  return {kind: 'domain-migration-preview', version: 1, sourceSchemaVersion, originalJson,
    stationProject, operationStations, stationStaffing,
    visualBindings: stationProject.layoutObjects.map(object => ({objectId: object.id, stationId: object.workstationId ?? null})),
    unassignedOperationIds,
    unresolved: [...legacyGaps, ...(unassignedOperationIds.length ? ['station-assignment' as const] : [])]};
}

/** Preserve every source byte and use the reviewed v4 → v5 station migration. */
export function previewDomainMigrationFromV4(originalJson: string, allocateId?: () => string): DomainMigrationPreview {
  const stationPreview = previewStationMigration(originalJson, allocateId);
  const stationProject = prepareStationMigration(stationPreview).project;
  return buildPreview(originalJson, 4, stationProject);
}

/** Use saved v5 station IDs and geometry without generating domain workers or equipment capabilities. */
export function previewDomainMigrationFromV5(originalJson: string): DomainMigrationPreview {
  return buildPreview(originalJson, 5, parseStationProjectV5(originalJson));
}

/** Reject edited/stale preview data before it can be used by a later migration step. */
export function verifyDomainMigrationPreview(preview: DomainMigrationPreview): DomainMigrationPreview {
  if (!preview || preview.kind !== 'domain-migration-preview' || preview.version !== 1 ||
      ![4, 5].includes(preview.sourceSchemaVersion) || typeof preview.originalJson !== 'string') {
    throw new Error('Nieznany format podglądu modelu procesu.');
  }
  let expected: DomainMigrationPreview;
  if (preview.sourceSchemaVersion === 4) {
    let index = 0;
    expected = previewDomainMigrationFromV4(preview.originalJson, () => preview.stationProject?.stations?.[index++]?.id ?? '');
  } else expected = previewDomainMigrationFromV5(preview.originalJson);
  if (JSON.stringify(expected) !== JSON.stringify(preview)) {
    throw new Error('Podgląd modelu procesu jest nieaktualny lub zmieniony. Przygotuj go ponownie.');
  }
  return expected;
}
