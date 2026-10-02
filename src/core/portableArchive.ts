const FORMAT = 'layout-studio-portable-archive';
const VERSION = 1;
const MAX_ORIGINAL_BYTES = 10 * 1024 * 1024;
export const MAX_ARCHIVE_BYTES = 25 * 1024 * 1024;

export type PortableArchive = {
  project: unknown;
  originalJson: string;
  importSourceBase64: string;
};

function checkedSource(value: unknown): string {
  if (typeof value !== 'string') throw new Error('Archiwum nie zawiera poprawnego pola pierwotnego importu.');
  if (!value) return '';
  if (value.length > Math.ceil(MAX_ORIGINAL_BYTES / 3) * 4) throw new Error('Pierwotny import przekracza 10 MB.');
  const padding = value.endsWith('==') ? 2 : value.endsWith('=') ? 1 : 0;
  if (value.length % 4 !== 0 || /[^A-Za-z0-9+/=]/.test(value) || value.indexOf('=') !== (padding ? value.length - padding : -1)) throw new Error('Niepoprawne kodowanie pierwotnego importu.');
  if (value.length / 4 * 3 - padding > MAX_ORIGINAL_BYTES) throw new Error('Pierwotny import przekracza 10 MB.');
  return value;
}

export function makePortableArchive(schemaVersion: 4 | 5, project: unknown, importSourceBase64: string, originalJson = ''): string {
  checkedSource(importSourceBase64);
  const archive = JSON.stringify({format: FORMAT, formatVersion: VERSION, schemaVersion, project, originalJson, importSourceBase64}, null, 2);
  if (new Blob([archive]).size > MAX_ARCHIVE_BYTES) throw new Error('Archiwum przekracza 25 MB.');
  return archive;
}

export function readPortableArchive(text: string, expectedSchema: 4 | 5): PortableArchive | null {
  const value = JSON.parse(text) as Record<string, unknown>;
  if (!value || typeof value !== 'object' || value.format !== FORMAT) return null;
  if (value.formatVersion !== VERSION) throw new Error(`Nieobsługiwana wersja archiwum: ${String(value.formatVersion)}.`);
  if (value.schemaVersion !== expectedSchema) throw new Error(`Archiwum zawiera projekt schematu ${String(value.schemaVersion)}, oczekiwano ${expectedSchema}.`);
  if (!value.project || typeof value.project !== 'object') throw new Error('Archiwum nie zawiera projektu.');
  if (typeof value.originalJson !== 'string') throw new Error('Archiwum nie zawiera poprawnej migawki źródłowej.');
  const importSourceBase64 = checkedSource(value.importSourceBase64);
  if (expectedSchema === 4 && value.originalJson) throw new Error('Archiwum projektu 4 ma nieoczekiwaną migawkę migracji.');
  if (expectedSchema === 5 && importSourceBase64 && !value.originalJson) throw new Error('Archiwum projektu 5 nie zawiera migawki migracji.');
  return {project: value.project, originalJson: value.originalJson, importSourceBase64};
}
