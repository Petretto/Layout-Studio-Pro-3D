import { parseProject } from './validation';
import { parseStationProjectV5 } from './stationProject';
import { parseDomainProjectV6 } from './domainProject';

export const WORKSPACE_BACKUP_FORMAT = 'layout-studio-workspace-backup';
export const WORKSPACE_BACKUP_VERSION = 1;
export const APP_VERSION = '0.4.0';

export const STORAGE_KEYS = {
  v4Project: 'layout-studio-v3',
  v4Scenarios: 'layout-studio-scenarios-v3',
  v5Stations: 'layout-studio-stations-v5',
  v6DomainDraft: 'layout-studio-domain-v6-draft-v1',
  v6Variants: 'layout-studio-domain-v6-variants-v1',
} as const;

export interface WorkspaceBackupSummary {
  hasActiveProjectV4: boolean;
  activeProjectV4Name?: string;
  hasStationsProjectV5: boolean;
  stationsProjectV5Name?: string;
  hasDomainDraftV6: boolean;
  domainDraftV6Name?: string;
  scenariosV4Count: number;
  variantsV6Count: number;
  totalStorageBytes: number;
}

export interface WorkspaceBackupPayload {
  format: typeof WORKSPACE_BACKUP_FORMAT;
  formatVersion: typeof WORKSPACE_BACKUP_VERSION;
  appVersion: string;
  createdAt: string;
  checksumSha256: string;
  summary: WorkspaceBackupSummary;
  storage: {
    v4ProjectRaw: string | null;
    v4ScenariosRaw: string | null;
    v5StationsRaw: string | null;
    v6DomainDraftRaw: string | null;
    v6VariantsRaw: string | null;
  };
}

export interface StoragePort {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem?(key: string): void;
}

/**
 * Pure TypeScript SHA-256 implementation (FIPS 180-4 compliant).
 * Runs synchronously in any browser, web worker, or Node.js environment without external dependencies.
 */
export function sha256Hex(ascii: string): string {
  const K = [
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
  ];
  let H = [
    0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a,
    0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19,
  ];

  const utf8Bytes: number[] = [];
  for (let i = 0; i < ascii.length; i++) {
    let c = ascii.charCodeAt(i);
    if (c < 0x80) {
      utf8Bytes.push(c);
    } else if (c < 0x800) {
      utf8Bytes.push(0xc0 | (c >> 6), 0x80 | (c & 0x3f));
    } else if (c < 0xd800 || c >= 0xe000) {
      utf8Bytes.push(0xe0 | (c >> 12), 0x80 | ((c >> 6) & 0x3f), 0x80 | (c & 0x3f));
    } else {
      i++;
      c = 0x10000 + (((c & 0x3ff) << 10) | (ascii.charCodeAt(i) & 0x3ff));
      utf8Bytes.push(
        0xf0 | (c >> 18),
        0x80 | ((c >> 12) & 0x3f),
        0x80 | ((c >> 6) & 0x3f),
        0x80 | (c & 0x3f)
      );
    }
  }

  const len = utf8Bytes.length;
  utf8Bytes.push(0x80);
  while (utf8Bytes.length % 64 !== 56) utf8Bytes.push(0);

  const bitLenHi = Math.floor(len / 0x20000000);
  const bitLenLo = (len * 8) >>> 0;
  for (let shift = 24; shift >= 0; shift -= 8) utf8Bytes.push((bitLenHi >> shift) & 0xff);
  for (let shift = 24; shift >= 0; shift -= 8) utf8Bytes.push((bitLenLo >> shift) & 0xff);

  const W = new Uint32Array(64);
  const numBlocks = utf8Bytes.length / 64;

  for (let b = 0; b < numBlocks; b++) {
    for (let t = 0; t < 16; t++) {
      const offset = b * 64 + t * 4;
      W[t] =
        ((utf8Bytes[offset] << 24) |
          (utf8Bytes[offset + 1] << 16) |
          (utf8Bytes[offset + 2] << 8) |
          utf8Bytes[offset + 3]) >>>
        0;
    }
    for (let t = 16; t < 64; t++) {
      const s0 =
        (((W[t - 15] >>> 7) | (W[t - 15] << 25)) ^
          ((W[t - 15] >>> 18) | (W[t - 15] << 14)) ^
          (W[t - 15] >>> 3)) >>>
        0;
      const s1 =
        (((W[t - 2] >>> 17) | (W[t - 2] << 15)) ^
          ((W[t - 2] >>> 19) | (W[t - 2] << 13)) ^
          (W[t - 2] >>> 10)) >>>
        0;
      W[t] = (W[t - 16] + s0 + W[t - 7] + s1) >>> 0;
    }

    let [a, b_, c, d, e, f, g, h] = H;

    for (let t = 0; t < 64; t++) {
      const S1 =
        (((e >>> 6) | (e << 26)) ^
          ((e >>> 11) | (e << 21)) ^
          ((e >>> 25) | (e << 7))) >>>
        0;
      const ch = ((e & f) ^ (~e & g)) >>> 0;
      const temp1 = (h + S1 + ch + K[t] + W[t]) >>> 0;
      const S0 =
        (((a >>> 2) | (a << 30)) ^
          ((a >>> 13) | (a << 19)) ^
          ((a >>> 22) | (a << 10))) >>>
        0;
      const maj = ((a & b_) ^ (a & c) ^ (b_ & c)) >>> 0;
      const temp2 = (S0 + maj) >>> 0;

      h = g;
      g = f;
      f = e;
      e = (d + temp1) >>> 0;
      d = c;
      c = b_;
      b_ = a;
      a = (temp1 + temp2) >>> 0;
    }

    H[0] = (H[0] + a) >>> 0;
    H[1] = (H[1] + b_) >>> 0;
    H[2] = (H[2] + c) >>> 0;
    H[3] = (H[3] + d) >>> 0;
    H[4] = (H[4] + e) >>> 0;
    H[5] = (H[5] + f) >>> 0;
    H[6] = (H[6] + g) >>> 0;
    H[7] = (H[7] + h) >>> 0;
  }

  return Array.from(H)
    .map((x) => x.toString(16).padStart(8, '0'))
    .join('');
}

/**
 * Summarizes the contents found in storage.
 */
export function inspectWorkspaceStorage(storage: StoragePort): WorkspaceBackupSummary {
  const v4Raw = storage.getItem(STORAGE_KEYS.v4Project);
  const v4ScenariosRaw = storage.getItem(STORAGE_KEYS.v4Scenarios);
  const v5Raw = storage.getItem(STORAGE_KEYS.v5Stations);
  const v6DraftRaw = storage.getItem(STORAGE_KEYS.v6DomainDraft);
  const v6VariantsRaw = storage.getItem(STORAGE_KEYS.v6Variants);

  let activeProjectV4Name: string | undefined;
  let stationsProjectV5Name: string | undefined;
  let domainDraftV6Name: string | undefined;
  let scenariosV4Count = 0;
  let variantsV6Count = 0;

  if (v4Raw) {
    try {
      const parsed = JSON.parse(v4Raw);
      const project = parsed?.project ?? parsed;
      activeProjectV4Name = typeof project?.name === 'string' ? project.name : undefined;
    } catch {
      activeProjectV4Name = '(uszkodzony projekt v4)';
    }
  }

  if (v4ScenariosRaw) {
    try {
      const parsed = JSON.parse(v4ScenariosRaw);
      if (Array.isArray(parsed)) scenariosV4Count = parsed.length;
    } catch {
      scenariosV4Count = 0;
    }
  }

  if (v5Raw) {
    try {
      const parsed = JSON.parse(v5Raw);
      const project = parsed?.project ?? parsed;
      stationsProjectV5Name = typeof project?.name === 'string' ? project.name : undefined;
    } catch {
      stationsProjectV5Name = '(uszkodzony projekt v5)';
    }
  }

  if (v6DraftRaw) {
    try {
      const parsed = JSON.parse(v6DraftRaw);
      const project = parsed?.project ?? parsed;
      domainDraftV6Name = typeof project?.name === 'string' ? project.name : undefined;
    } catch {
      domainDraftV6Name = '(uszkodzony szkic v6)';
    }
  }

  if (v6VariantsRaw) {
    try {
      const parsed = JSON.parse(v6VariantsRaw);
      if (Array.isArray(parsed)) variantsV6Count = parsed.length;
    } catch {
      variantsV6Count = 0;
    }
  }

  const totalBytes =
    (v4Raw?.length ?? 0) +
    (v4ScenariosRaw?.length ?? 0) +
    (v5Raw?.length ?? 0) +
    (v6DraftRaw?.length ?? 0) +
    (v6VariantsRaw?.length ?? 0);

  return {
    hasActiveProjectV4: Boolean(v4Raw),
    activeProjectV4Name,
    hasStationsProjectV5: Boolean(v5Raw),
    stationsProjectV5Name,
    hasDomainDraftV6: Boolean(v6DraftRaw),
    domainDraftV6Name,
    scenariosV4Count,
    variantsV6Count,
    totalStorageBytes: totalBytes,
  };
}

/**
 * Creates a complete Workspace Backup payload from current storage.
 */
export function createWorkspaceBackup(
  storage: StoragePort,
  appVersion = APP_VERSION,
  createdAt = new Date().toISOString()
): WorkspaceBackupPayload {
  const summary = inspectWorkspaceStorage(storage);

  const storageData = {
    v4ProjectRaw: storage.getItem(STORAGE_KEYS.v4Project),
    v4ScenariosRaw: storage.getItem(STORAGE_KEYS.v4Scenarios),
    v5StationsRaw: storage.getItem(STORAGE_KEYS.v5Stations),
    v6DomainDraftRaw: storage.getItem(STORAGE_KEYS.v6DomainDraft),
    v6VariantsRaw: storage.getItem(STORAGE_KEYS.v6Variants),
  };

  // Compute canonical checksum of the payload data
  const canonicalString = JSON.stringify(storageData);
  const checksumSha256 = sha256Hex(canonicalString);

  return {
    format: WORKSPACE_BACKUP_FORMAT,
    formatVersion: WORKSPACE_BACKUP_VERSION,
    appVersion,
    createdAt,
    checksumSha256,
    summary,
    storage: storageData,
  };
}

export interface BackupValidationResult {
  valid: boolean;
  payload?: WorkspaceBackupPayload;
  error?: string;
  checksumMatches: boolean;
  validatedProjectsCount: number;
}

/**
 * Validates a workspace backup JSON string before attempting any restore.
 */
export function validateWorkspaceBackup(rawJson: string): BackupValidationResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawJson);
  } catch (e) {
    return {
      valid: false,
      error: `Niepoprawny format JSON pliku kopii: ${(e as Error).message}`,
      checksumMatches: false,
      validatedProjectsCount: 0,
    };
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return {
      valid: false,
      error: 'Plik kopii nie zawiera poprawnego obiektu JSON.',
      checksumMatches: false,
      validatedProjectsCount: 0,
    };
  }

  const data = parsed as Record<string, unknown>;

  if (data.format !== WORKSPACE_BACKUP_FORMAT) {
    return {
      valid: false,
      error: `Nieznany format kopii: "${String(data.format)}". Oczekiwano "${WORKSPACE_BACKUP_FORMAT}".`,
      checksumMatches: false,
      validatedProjectsCount: 0,
    };
  }

  if (data.formatVersion !== WORKSPACE_BACKUP_VERSION) {
    return {
      valid: false,
      error: `Nieobsługiwana wersja formatu kopii: ${String(data.formatVersion)}. Oczekiwano ${WORKSPACE_BACKUP_VERSION}.`,
      checksumMatches: false,
      validatedProjectsCount: 0,
    };
  }

  if (!data.storage || typeof data.storage !== 'object') {
    return {
      valid: false,
      error: 'Brak struktury storage w pliku kopii zapasowej.',
      checksumMatches: false,
      validatedProjectsCount: 0,
    };
  }

  const storage = data.storage as Record<string, unknown>;

  // Checksum verification
  const canonicalString = JSON.stringify({
    v4ProjectRaw: storage.v4ProjectRaw ?? null,
    v4ScenariosRaw: storage.v4ScenariosRaw ?? null,
    v5StationsRaw: storage.v5StationsRaw ?? null,
    v6DomainDraftRaw: storage.v6DomainDraftRaw ?? null,
    v6VariantsRaw: storage.v6VariantsRaw ?? null,
  });
  const expectedChecksum = sha256Hex(canonicalString);
  const checksumMatches = data.checksumSha256 === expectedChecksum;

  // Validate internal projects
  let validatedProjects = 0;

  if (typeof storage.v4ProjectRaw === 'string' && storage.v4ProjectRaw.trim()) {
    try {
      const v4Parsed = JSON.parse(storage.v4ProjectRaw);
      const project = v4Parsed?.project ?? v4Parsed;
      parseProject(JSON.stringify(project));
      validatedProjects++;
    } catch (e) {
      return {
        valid: false,
        error: `Uszkodzony projekt v4 w kopii: ${(e as Error).message}`,
        checksumMatches,
        validatedProjectsCount: validatedProjects,
      };
    }
  }

  if (typeof storage.v5StationsRaw === 'string' && storage.v5StationsRaw.trim()) {
    try {
      const v5Parsed = JSON.parse(storage.v5StationsRaw);
      const project = v5Parsed?.project ?? v5Parsed;
      parseStationProjectV5(JSON.stringify(project));
      validatedProjects++;
    } catch (e) {
      return {
        valid: false,
        error: `Uszkodzony projekt stanowisk v5 w kopii: ${(e as Error).message}`,
        checksumMatches,
        validatedProjectsCount: validatedProjects,
      };
    }
  }

  if (typeof storage.v6DomainDraftRaw === 'string' && storage.v6DomainDraftRaw.trim()) {
    try {
      const v6Parsed = JSON.parse(storage.v6DomainDraftRaw);
      const project = v6Parsed?.project ?? v6Parsed;
      parseDomainProjectV6(JSON.stringify(project));
      validatedProjects++;
    } catch (e) {
      return {
        valid: false,
        error: `Uszkodzony szkic domeny v6 w kopii: ${(e as Error).message}`,
        checksumMatches,
        validatedProjectsCount: validatedProjects,
      };
    }
  }

  const payload: WorkspaceBackupPayload = {
    format: WORKSPACE_BACKUP_FORMAT,
    formatVersion: WORKSPACE_BACKUP_VERSION,
    appVersion: String(data.appVersion ?? APP_VERSION),
    createdAt: String(data.createdAt ?? new Date().toISOString()),
    checksumSha256: String(data.checksumSha256 ?? expectedChecksum),
    summary: (data.summary as WorkspaceBackupSummary) ?? {
      hasActiveProjectV4: Boolean(storage.v4ProjectRaw),
      hasStationsProjectV5: Boolean(storage.v5StationsRaw),
      hasDomainDraftV6: Boolean(storage.v6DomainDraftRaw),
      scenariosV4Count: 0,
      variantsV6Count: 0,
      totalStorageBytes: 0,
    },
    storage: {
      v4ProjectRaw: (storage.v4ProjectRaw as string) ?? null,
      v4ScenariosRaw: (storage.v4ScenariosRaw as string) ?? null,
      v5StationsRaw: (storage.v5StationsRaw as string) ?? null,
      v6DomainDraftRaw: (storage.v6DomainDraftRaw as string) ?? null,
      v6VariantsRaw: (storage.v6VariantsRaw as string) ?? null,
    },
  };

  return {
    valid: true,
    payload,
    checksumMatches,
    validatedProjectsCount: validatedProjects,
  };
}

export interface RestoreResult {
  success: boolean;
  restoredKeys: string[];
  rollbackSnapshot: string;
}

/**
 * Restores workspace backup to target storage.
 * Automatically takes a rollback snapshot of existing storage first!
 */
export function restoreWorkspaceBackup(
  storage: StoragePort,
  payload: WorkspaceBackupPayload
): RestoreResult {
  // 1. Take safety snapshot of current state before touching anything
  const currentBackup = createWorkspaceBackup(storage, APP_VERSION);
  const rollbackSnapshot = JSON.stringify(currentBackup, null, 2);

  const restoredKeys: string[] = [];

  // 2. Safely apply restored storage slots
  if (payload.storage.v4ProjectRaw !== null) {
    storage.setItem(STORAGE_KEYS.v4Project, payload.storage.v4ProjectRaw);
    restoredKeys.push(STORAGE_KEYS.v4Project);
  }

  if (payload.storage.v4ScenariosRaw !== null) {
    storage.setItem(STORAGE_KEYS.v4Scenarios, payload.storage.v4ScenariosRaw);
    restoredKeys.push(STORAGE_KEYS.v4Scenarios);
  }

  if (payload.storage.v5StationsRaw !== null) {
    storage.setItem(STORAGE_KEYS.v5Stations, payload.storage.v5StationsRaw);
    restoredKeys.push(STORAGE_KEYS.v5Stations);
  }

  if (payload.storage.v6DomainDraftRaw !== null) {
    storage.setItem(STORAGE_KEYS.v6DomainDraft, payload.storage.v6DomainDraftRaw);
    restoredKeys.push(STORAGE_KEYS.v6DomainDraft);
  }

  if (payload.storage.v6VariantsRaw !== null) {
    storage.setItem(STORAGE_KEYS.v6Variants, payload.storage.v6VariantsRaw);
    restoredKeys.push(STORAGE_KEYS.v6Variants);
  }

  return {
    success: true,
    restoredKeys,
    rollbackSnapshot,
  };
}
