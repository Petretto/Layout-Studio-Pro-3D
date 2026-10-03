import {parseProject} from './validation';
import {parseStationProjectV5} from './stationProject';
import {parseDomainProjectV6, type DomainProjectV6, type PreparedDomainMigration} from './domainProject';

/** Separate from the active v4 and v5 project keys. Schema 6 remains an incomplete draft. */
export const DOMAIN_DRAFT_STORAGE_KEY = 'layout-studio-domain-v6-draft-v1';

export interface DomainDraftSave {
  kind: 'domain-draft-save';
  version: 1;
  sourceSchemaVersion: 4 | 5;
  originalJson: string;
  project: DomainProjectV6;
  at: string;
}

export interface DomainDraftStoragePort {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export type DomainDraftRead =
  | {status: 'empty'}
  | {status: 'valid'; raw: string; saved: DomainDraftSave}
  | {status: 'corrupt'; raw: string; error: string}
  | {status: 'unavailable'; error: string};

function sourceVersion(originalJson: string): 4 | 5 {
  const raw: unknown = JSON.parse(originalJson);
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new Error('Niepoprawne źródło projektu.');
  const version = (raw as {schemaVersion?: unknown}).schemaVersion;
  if (version === 4) parseProject(originalJson);
  else if (version === 5) parseStationProjectV5(originalJson);
  else throw new Error('Źródło szkicu musi mieć schemat 4 albo 5.');
  return version;
}

function parseSave(raw: string): DomainDraftSave {
  const value: unknown = JSON.parse(raw);
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Niepoprawny zapis szkicu.');
  const saved = value as Record<string, unknown>;
  if (saved.kind !== 'domain-draft-save' || saved.version !== 1 ||
      typeof saved.originalJson !== 'string' || typeof saved.at !== 'string' ||
      !Number.isFinite(Date.parse(saved.at)) || !saved.project || typeof saved.project !== 'object') {
    throw new Error('Nieznany lub uszkodzony format zapisu szkicu.');
  }
  const version = sourceVersion(saved.originalJson);
  if (saved.sourceSchemaVersion !== version) throw new Error('Wersja źródła szkicu nie zgadza się z plikiem.');
  return {kind: 'domain-draft-save', version: 1, sourceSchemaVersion: version,
    originalJson: saved.originalJson, project: parseDomainProjectV6(JSON.stringify(saved.project)), at: saved.at};
}

/** Read without replacing damaged data. The raw value can be exported for recovery. */
export function readDomainDraft(storage: Pick<DomainDraftStoragePort, 'getItem'>): DomainDraftRead {
  let raw: string | null;
  try { raw = storage.getItem(DOMAIN_DRAFT_STORAGE_KEY); }
  catch (error) { return {status: 'unavailable', error: (error as Error).message}; }
  if (raw === null) return {status: 'empty'};
  try { return {status: 'valid', raw, saved: parseSave(raw)}; }
  catch (error) { return {status: 'corrupt', raw, error: (error as Error).message}; }
}

/** Caller passes the exact value last read (or null for an empty slot). No failure clears a previous save. */
export function saveDomainDraft(
  storage: DomainDraftStoragePort,
  draft: Pick<PreparedDomainMigration, 'originalJson' | 'project'>,
  expectedRaw: string | null,
  at = new Date().toISOString(),
): {raw: string; saved: DomainDraftSave} {
  const sourceSchemaVersion = sourceVersion(draft.originalJson);
  const project = parseDomainProjectV6(JSON.stringify(draft.project));
  const saved = parseSave(JSON.stringify({kind: 'domain-draft-save', version: 1, sourceSchemaVersion,
    originalJson: draft.originalJson, project, at}));
  const raw = JSON.stringify(saved);
  const current = storage.getItem(DOMAIN_DRAFT_STORAGE_KEY);
  if (current !== expectedRaw) {
    throw new Error('Zapis szkicu zmienił się od ostatniego odczytu. Wczytaj go ponownie przed zastąpieniem.');
  }
  if (current !== null && parseSave(current).originalJson !== draft.originalJson) {
    throw new Error('Źródło istniejącego szkicu jest inne. Zachowaj jego kopię przed rozpoczęciem nowej migracji.');
  }
  storage.setItem(DOMAIN_DRAFT_STORAGE_KEY, raw);
  return {raw, saved};
}
