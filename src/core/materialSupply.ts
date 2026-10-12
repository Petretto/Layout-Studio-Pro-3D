import type {DomainProjectV6} from './domainProject';

export interface PeriodicSupplySchedule {
  kind: 'periodic';
  batchQuantity: number;
  intervalSeconds: number;
  firstDeliverySeconds?: number;
}

export interface ExplicitSupplyDelivery {
  deliveryTimeSeconds: number;
  quantity: number;
}

export interface ExplicitSupplySchedule {
  kind: 'explicit-deliveries';
  deliveries: ExplicitSupplyDelivery[];
}

export type SupplySchedule = PeriodicSupplySchedule | ExplicitSupplySchedule;

export interface MaterialSupplyItem {
  id: string;
  componentId: string;
  targetStationId: string;
  initialStock: number;
  unit: string;
  schedule: SupplySchedule;
  source: string;
}

export interface MaterialSupplyV6 {
  items: MaterialSupplyItem[];
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

function nonNegativeNumber(value: unknown, label: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
    throw new Error(`${label}: wymagana nieujemna liczba.`);
  }
  return value;
}

function positiveNumber(value: unknown, label: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
    throw new Error(`${label}: wymagana dodatnia liczba.`);
  }
  return value;
}

function validateSchedule(value: unknown): SupplySchedule {
  if (!value || typeof value !== 'object') {
    throw new Error('Harmonogram dostaw: wymagany obiekt.');
  }
  const raw = value as Record<string, unknown>;
  if (raw.kind === 'periodic') {
    object(raw, ['kind', 'batchQuantity', 'intervalSeconds', 'firstDeliverySeconds'], 'Harmonogram cykliczny');
    const batchQuantity = positiveNumber(raw.batchQuantity, 'Wielkość partii dostawy');
    const intervalSeconds = positiveNumber(raw.intervalSeconds, 'Częstotliwość dostaw');
    const firstDeliverySeconds = raw.firstDeliverySeconds !== undefined
      ? nonNegativeNumber(raw.firstDeliverySeconds, 'Czas pierwszej dostawy')
      : 0;
    return {
      kind: 'periodic',
      batchQuantity,
      intervalSeconds,
      firstDeliverySeconds,
    };
  } else if (raw.kind === 'explicit-deliveries') {
    object(raw, ['kind', 'deliveries'], 'Harmonogram jawny');
    if (!Array.isArray(raw.deliveries) || raw.deliveries.length > 1000) {
      throw new Error('Harmonogram jawny: wymagana lista do 1000 dostaw.');
    }
    const deliveries = raw.deliveries.map(d => {
      const item = object(d, ['deliveryTimeSeconds', 'quantity'], 'Dostawa');
      return {
        deliveryTimeSeconds: nonNegativeNumber(item.deliveryTimeSeconds, 'Czas dostawy'),
        quantity: positiveNumber(item.quantity, 'Ilość dostawy'),
      };
    });
    return {
      kind: 'explicit-deliveries',
      deliveries,
    };
  }
  throw new Error('Harmonogram dostaw: nieznany rodzaj.');
}

export function validateMaterialSupply(project: DomainProjectV6, value: unknown): MaterialSupplyV6 {
  const raw = object(value, ['items'], 'Zaopatrzenie materiałowe');
  if (!Array.isArray(raw.items) || raw.items.length > 500) {
    throw new Error('Zaopatrzenie materiałowe: wymagana lista do 500 wpisów.');
  }

  const stations = new Set(project.stations.map(s => s.id));
  const ids = new Set<string>();

  const items = raw.items.map(entry => {
    const item = object(entry, ['id', 'componentId', 'targetStationId', 'initialStock', 'unit', 'schedule', 'source'], 'Pozycja zaopatrzenia');
    const id = text(item.id, 'ID zaopatrzenia');
    if (ids.has(id)) throw new Error(`Zaopatrzenie: powtórzone ID ${id}.`);
    ids.add(id);

    const componentId = text(item.componentId, 'Identyfikator komponentu');
    const targetStationId = text(item.targetStationId, 'Stanowisko docelowe');
    if (!stations.has(targetStationId)) {
      throw new Error(`Zaopatrzenie: nieznane stanowisko docelowe ${targetStationId}.`);
    }

    const initialStock = nonNegativeNumber(item.initialStock, 'Zapas początkowy');
    const unit = text(item.unit, 'Jednostka miary');
    const schedule = validateSchedule(item.schedule);
    const source = text(item.source, 'Źródło danych zaopatrzenia');

    return {
      id,
      componentId,
      targetStationId,
      initialStock,
      unit,
      schedule,
      source,
    };
  });

  return {items};
}
