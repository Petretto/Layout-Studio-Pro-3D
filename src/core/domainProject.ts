import type {ProcessStep, ProjectData} from './models/types';
import type {StationRecord} from './stationRegistry';
import type {StationProjectV5} from './stationMigration';
import type {DomainMigrationPreview} from './domainMigrationPreview';
import {verifyDomainMigrationPreview} from './domainMigrationPreview';
import {parseStationProjectV5} from './stationProject';

export type DomainTimeBasis = 'measured' | 'assumed';
export interface DomainTimeInterval {startSeconds: number; endSeconds: number; basis: DomainTimeBasis}
export interface DomainTimeProfile {
  durationSeconds: number;
  durationBasis: DomainTimeBasis;
  manualWork: DomainTimeInterval[];
  machineRun: DomainTimeInterval[];
  operatorPresence: DomainTimeInterval[];
}
export interface DomainStaffingTimeVariant {workerCount: number; timeProfile: DomainTimeProfile}
export interface DomainOperationStaffing {
  requiredWorkers: number;
  timeVariants: DomainStaffingTimeVariant[];
}
export type DomainOperation = Omit<ProcessStep, 'assignedWorkstationId'> & {
  timeProfile?: DomainTimeProfile;
  staffing?: DomainOperationStaffing;
};
export interface DomainWorker {id: string; name: string}
export interface DomainWorkerPool {id: string; name: string; workerIds: string[]}
export interface DomainEquipment {id: string; name: string; stationId?: string; layoutObjectId?: string; capableOperationIds?: string[]}
export interface DomainProduct {id: string; name: string}
export interface DomainSubassembly {id: string; name: string; producerOperationId?: string; consumerOperationIds: string[]}

/** Inactive draft schema. Station records alone own operation assignment. */
export interface DomainProjectV6 extends Omit<StationProjectV5,
  'schemaVersion' | 'processSteps' | 'stations' | 'workstationSettings'> {
  schemaVersion: 6;
  modelStatus: 'incomplete';
  operations: DomainOperation[];
  stations: StationRecord[];
  stationSettings: NonNullable<ProjectData['workstationSettings']>;
  workers: DomainWorker[];
  workerPools: DomainWorkerPool[];
  equipment: DomainEquipment[];
  product: DomainProduct | null;
  subassemblies: DomainSubassembly[];
}

export interface PreparedDomainMigration {
  kind: 'prepared-domain-migration';
  originalJson: string;
  project: DomainProjectV6;
}

const record = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === 'object' && !Array.isArray(value);
const has = (value: Record<string, unknown>, key: string) => Object.prototype.hasOwnProperty.call(value, key);
function entries(value: unknown, label: string, max = 500): Record<string, unknown>[] {
  if (!Array.isArray(value) || value.length > max || value.some(item => !record(item))) {
    throw new Error(`${label}: wymagana lista obiektów.`);
  }
  return value;
}
function ids(items: Record<string, unknown>[], label: string): Set<string> {
  const result = new Set<string>();
  for (const item of items) {
    if (typeof item.id !== 'string' || !item.id.trim() || result.has(item.id)) {
      throw new Error(`${label}: puste lub powtórzone ID.`);
    }
    result.add(item.id);
  }
  return result;
}
function named(items: Record<string, unknown>[], label: string) {
  for (const item of items) if (typeof item.name !== 'string' || !item.name.trim()) {
    throw new Error(`${label}: wymagana nazwa.`);
  }
}

function timeBasis(value: unknown): value is DomainTimeBasis {
  return value === 'measured' || value === 'assumed';
}
function validateTimeIntervals(value: unknown, label: string, duration: number): DomainTimeInterval[] {
  if (!Array.isArray(value) || value.length > 500) throw new Error(`${label}: wymagana lista przedziałów.`);
  let previousEnd = 0;
  for (const interval of value) {
    if (!record(interval) || Object.keys(interval).some(key => !['startSeconds', 'endSeconds', 'basis'].includes(key)) ||
        typeof interval.startSeconds !== 'number' || !Number.isFinite(interval.startSeconds) ||
        typeof interval.endSeconds !== 'number' || !Number.isFinite(interval.endSeconds) ||
        interval.startSeconds < previousEnd || interval.startSeconds < 0 ||
        interval.endSeconds <= interval.startSeconds || interval.endSeconds > duration || !timeBasis(interval.basis)) {
      throw new Error(`${label}: przedziały muszą być uporządkowane, niepokrywające się, w granicach czasu operacji i z jawnym pochodzeniem.`);
    }
    previousEnd = interval.endSeconds;
  }
  return value as DomainTimeInterval[];
}
function validateTimeProfile(value: unknown, operationId: string) {
  const label = `Operacja ${operationId}: profil czasu`;
  if (!record(value) || Object.keys(value).some(key => ![
    'durationSeconds', 'durationBasis', 'manualWork', 'machineRun', 'operatorPresence',
  ].includes(key)) || typeof value.durationSeconds !== 'number' ||
      !Number.isFinite(value.durationSeconds) || value.durationSeconds <= 0 ||
      !timeBasis(value.durationBasis)) {
    throw new Error(`${label}: wymagany dodatni czas całkowity i jawne pochodzenie.`);
  }
  const manual = validateTimeIntervals(value.manualWork, `${label} — praca ręczna`, value.durationSeconds);
  validateTimeIntervals(value.machineRun, `${label} — praca maszyny`, value.durationSeconds);
  const presence = validateTimeIntervals(value.operatorPresence, `${label} — obecność operatora`, value.durationSeconds);
  for (const interval of manual) if (!presence.some(item =>
    item.startSeconds <= interval.startSeconds && item.endSeconds >= interval.endSeconds)) {
    throw new Error(`${label}: praca ręczna wymaga obecności operatora przez cały przedział.`);
  }
}
function validateStaffing(value: unknown, operationId: string) {
  const label = `Operacja ${operationId}: obsada`;
  if (!record(value) || Object.keys(value).some(key => !['requiredWorkers', 'timeVariants'].includes(key)) ||
      !Number.isSafeInteger(value.requiredWorkers) || (value.requiredWorkers as number) < 1 ||
      !Array.isArray(value.timeVariants) || value.timeVariants.length > 500) {
    throw new Error(`${label}: wymagana dodatnia liczba pracowników i lista wariantów.`);
  }
  const seen = new Set<number>();
  for (const variant of value.timeVariants) {
    if (!record(variant) || Object.keys(variant).some(key => !['workerCount', 'timeProfile'].includes(key)) ||
        !Number.isSafeInteger(variant.workerCount) || (variant.workerCount as number) < (value.requiredWorkers as number) ||
        seen.has(variant.workerCount as number)) {
      throw new Error(`${label}: wariant wymaga unikalnej liczby pracowników nie mniejszej od minimum.`);
    }
    seen.add(variant.workerCount as number);
    validateTimeProfile(variant.timeProfile, `${operationId}, wariant ${variant.workerCount} osób`);
  }
}

/** Validate a draft without enabling schema 6 in the active app or its storage. */
export function parseDomainProjectV6(text: string): DomainProjectV6 {
  const raw: unknown = JSON.parse(text);
  if (!record(raw) || raw.schemaVersion !== 6 || raw.modelStatus !== 'incomplete') {
    throw new Error('Wymagany niekompletny projekt schematu 6.');
  }
  if (['processSteps', 'workstationSettings', 'balancing', 'spaghetti'].some(key => has(raw, key))) {
    throw new Error('Schemat 6 nie może zawierać drugiego źródła operacji, obsady ani wyników.');
  }
  const operations = entries(raw.operations, 'Operacje');
  const stations = entries(raw.stations, 'Stanowiska');
  const workers = entries(raw.workers, 'Pracownicy');
  const pools = entries(raw.workerPools, 'Pule pracowników');
  const equipment = entries(raw.equipment, 'Wyposażenie', 5000);
  const subassemblies = entries(raw.subassemblies, 'Podzespoły');
  ids(operations, 'Operacje');
  ids(stations, 'Stanowiska');
  const workerIds = ids(workers, 'Pracownicy');
  ids(pools, 'Pule pracowników');
  ids(equipment, 'Wyposażenie');
  ids(subassemblies, 'Podzespoły');
  named(workers, 'Pracownicy');
  named(pools, 'Pule pracowników');
  named(equipment, 'Wyposażenie');
  named(subassemblies, 'Podzespoły');
  if (operations.some(operation => has(operation, 'assignedWorkstationId'))) {
    throw new Error('Przypisanie operacji należy wyłącznie do rejestru stanowisk.');
  }
  for (const operation of operations) if (has(operation, 'timeProfile')) {
    validateTimeProfile(operation.timeProfile, operation.id as string);
  }
  for (const operation of operations) if (has(operation, 'staffing')) {
    validateStaffing(operation.staffing, operation.id as string);
  }
  if (!record(raw.stationSettings)) throw new Error('Niepoprawne ustawienia stanowisk.');
  if (!Array.isArray(raw.layoutObjects)) throw new Error('Brak listy obiektów wizualnych.');
  const owner = new Map<string, string>();
  for (const station of stations) {
    if (!Array.isArray(station.operationIds)) throw new Error('Niepoprawne operacje stanowiska.');
    for (const operationId of station.operationIds) if (typeof operationId === 'string') owner.set(operationId, station.id as string);
  }
  const processSteps = operations.map(operation => ({...operation,
    ...(raw.algorithm === 'Manual' ? {assignedWorkstationId: owner.get(operation.id as string)} : {})}));
  // Reuse all v5 process, BOM, station, resource and layout reference checks.
  parseStationProjectV5(JSON.stringify({...raw, schemaVersion: 5, processSteps,
    workstationSettings: raw.stationSettings}));
  for (const pool of pools) {
    if (!Array.isArray(pool.workerIds) || pool.workerIds.some(id => typeof id !== 'string' || !workerIds.has(id)) ||
        new Set(pool.workerIds).size !== pool.workerIds.length) {
      throw new Error(`Pula ${pool.id}: nieznany lub powtórzony pracownik.`);
    }
  }
  const stationIds = new Set(stations.map(station => station.id));
  const operationIds = new Set(operations.map(operation => operation.id));
  const layoutObjects = raw.layoutObjects as {id: string; workstationId?: string}[];
  const layoutById = new Map(layoutObjects.map(object => [object.id, object]));
  const usedVisualIds = new Set<string>();
  for (const item of equipment) {
    if (item.capableOperationIds !== undefined && (!Array.isArray(item.capableOperationIds) ||
        item.capableOperationIds.length === 0 ||
        item.capableOperationIds.some(id => typeof id !== 'string' || !operationIds.has(id)) ||
        new Set(item.capableOperationIds).size !== item.capableOperationIds.length)) {
      throw new Error(`Wyposażenie ${item.id}: nieznana lub powtórzona operacja w możliwościach.`);
    }
    if (item.stationId !== undefined && (typeof item.stationId !== 'string' || !stationIds.has(item.stationId))) {
      throw new Error(`Wyposażenie ${item.id}: nieznane stanowisko.`);
    }
    if (item.layoutObjectId !== undefined) {
      if (typeof item.layoutObjectId !== 'string' || !layoutById.has(item.layoutObjectId)) {
        throw new Error(`Wyposażenie ${item.id}: nieznany obiekt wizualny.`);
      }
      if (usedVisualIds.has(item.layoutObjectId)) throw new Error(`Obiekt wizualny ${item.layoutObjectId} należy do więcej niż jednego wyposażenia.`);
      usedVisualIds.add(item.layoutObjectId);
      const visual = layoutById.get(item.layoutObjectId)!;
      if (item.stationId && visual.workstationId && item.stationId !== visual.workstationId) {
        throw new Error(`Wyposażenie ${item.id}: sprzeczne powiązanie stanowiska i geometrii.`);
      }
    }
  }
  if (raw.product !== null && (!record(raw.product) || typeof raw.product.id !== 'string' || !raw.product.id.trim() ||
      typeof raw.product.name !== 'string' || !raw.product.name.trim())) {
    throw new Error('Niepoprawna definicja wyrobu.');
  }
  for (const item of subassemblies) {
    if (item.producerOperationId !== undefined &&
        (typeof item.producerOperationId !== 'string' || !operationIds.has(item.producerOperationId))) {
      throw new Error(`Podzespół ${item.id}: nieznana operacja tworząca.`);
    }
    if (!Array.isArray(item.consumerOperationIds) || item.consumerOperationIds.some(id => typeof id !== 'string' || !operationIds.has(id)) ||
        new Set(item.consumerOperationIds).size !== item.consumerOperationIds.length) {
      throw new Error(`Podzespół ${item.id}: nieznana lub powtórzona operacja zużywająca.`);
    }
  }
  return raw as unknown as DomainProjectV6;
}

/** Convert only a verified review artifact; leave the exact source outside the new project. */
export function prepareDomainMigration(preview: DomainMigrationPreview): PreparedDomainMigration {
  const checked = verifyDomainMigrationPreview(preview);
  const {schemaVersion: _version, processSteps, workstationSettings, stations, ...source} = checked.stationProject;
  const operations = processSteps.map(step => {
    const {assignedWorkstationId: _assignment, timeProfile: _unsupportedProfile,
      staffing: _unsupportedStaffing, ...operation} =
      step as ProcessStep & {timeProfile?: unknown; staffing?: unknown};
    return operation;
  });
  const project: DomainProjectV6 = {...source, schemaVersion: 6, modelStatus: 'incomplete',
    operations, stations, stationSettings: workstationSettings, workers: [], workerPools: [],
    equipment: [], product: null, subassemblies: []};
  return {kind: 'prepared-domain-migration', originalJson: checked.originalJson,
    project: parseDomainProjectV6(JSON.stringify(project))};
}
