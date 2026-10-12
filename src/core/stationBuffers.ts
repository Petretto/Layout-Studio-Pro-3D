import type {DomainProjectV6} from './domainProject';

export type BlockingPolicy = 'bbas' | 'bbas-worker-released';

export interface StationBufferConfig {
  stationId: string;
  copy: number | null;
  inputCapacity: number | null;
  outputCapacity: number | null;
  blockingPolicy?: BlockingPolicy;
}

export interface StationBuffersV6 {
  buffers: StationBufferConfig[];
}

function object(value: unknown, keys: readonly string[], label: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value) ||
      Object.keys(value).some(key => !keys.includes(key))) {
    throw new Error(`${label}: niepoprawne pola.`);
  }
  return value as Record<string, unknown>;
}

function text(value: unknown, label: string): string {
  if (typeof value !== 'string' || !value.trim()) throw new Error(`${label}: wymagany tekst.`);
  return value;
}

function capacity(value: unknown, label: string): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 0) {
    throw new Error(`${label}: pojemność musi być nieujemną liczbą całkowitą lub null.`);
  }
  return value;
}

export function validateStationBuffers(project: DomainProjectV6, value: unknown): StationBuffersV6 {
  const raw = object(value, ['buffers'], 'Bufory stanowisk');
  if (!Array.isArray(raw.buffers) || raw.buffers.length > 500) {
    throw new Error('Bufory stanowisk: wymagana lista do 500 wpisów.');
  }

  const stations = new Set(project.stations.map(s => s.id));
  const seen = new Set<string>();

  const buffers = raw.buffers.map(entry => {
    const item = object(entry, ['stationId', 'copy', 'inputCapacity', 'outputCapacity', 'blockingPolicy'], 'Wpis bufora');
    const stationId = text(item.stationId, 'Stanowisko w buforze');
    if (!stations.has(stationId)) {
      throw new Error(`Bufory: nieznane stanowisko ${stationId}.`);
    }

    let copy: number | null = null;
    if (item.copy !== null && item.copy !== undefined) {
      if (typeof item.copy !== 'number' || !Number.isSafeInteger(item.copy)) {
        throw new Error('Bufory: niepoprawny numer kopii.');
      }
      const parallel = project.stationSettings[stationId]?.parallelStations ?? 1;
      if (item.copy < 1 || item.copy > parallel) {
        throw new Error(`Bufory: kopia ${item.copy} poza zakresem 1..${parallel} dla stanowiska ${stationId}.`);
      }
      copy = item.copy;
    }

    const key = `${stationId}:${copy ?? 'all'}`;
    if (seen.has(key)) {
      throw new Error(`Bufory: powtórzona konfiguracja dla ${key}.`);
    }
    seen.add(key);

    const inputCapacity = capacity(item.inputCapacity, 'Pojemność wejściowa');
    const outputCapacity = capacity(item.outputCapacity, 'Pojemność wyjściowa');

    let blockingPolicy: BlockingPolicy = 'bbas';
    if (item.blockingPolicy !== undefined) {
      if (item.blockingPolicy !== 'bbas' && item.blockingPolicy !== 'bbas-worker-released') {
        throw new Error('Bufory: nieznana reguła blokowania.');
      }
      blockingPolicy = item.blockingPolicy;
    }

    return {
      stationId,
      copy,
      inputCapacity,
      outputCapacity,
      blockingPolicy,
    };
  });

  return {buffers};
}
