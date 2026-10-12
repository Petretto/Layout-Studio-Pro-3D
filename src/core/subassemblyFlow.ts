import type {DomainProjectV6} from './domainProject';

export interface OperationExecutionRef {job: number; operationId: string}
/** One explicitly declared lot for one recipient. No stock or BOM-derived quantities. */
export interface SubassemblyLot {
  id: string;
  subassemblyId: string;
  quantity: number;
  unit: string;
  producer: OperationExecutionRef;
  consumer: OperationExecutionRef;
  consumptionQuantity: number;
  source: string;
}
export interface SubassemblyFlow {
  availability: 'producer-finish';
  consumption: 'consumer-start';
  lots: SubassemblyLot[];
}

function object(value: unknown, keys: readonly string[], label: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value) ||
      Object.keys(value).some(key => !keys.includes(key))) throw new Error(`${label}: niepoprawne pola.`);
  return value as Record<string, unknown>;
}
function text(value: unknown, label: string): string {
  if (typeof value !== 'string' || !value.trim()) throw new Error(`${label}: wymagany tekst.`);
  return value;
}
function quantity(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
    throw new Error('Partia podzespołu: ilość musi być dodatnia i skończona.');
  }
  return value;
}
function execution(value: unknown, project: DomainProjectV6): OperationExecutionRef {
  const ref = object(value, ['job', 'operationId'], 'Wykonanie partii');
  if (!Number.isSafeInteger(ref.job) || (ref.job as number) < 1 || (ref.job as number) > 10000) {
    throw new Error('Wykonanie partii: numer sztuki 1–10000.');
  }
  const operationId = text(ref.operationId, 'Operacja partii');
  if (!project.operations.some(operation => operation.id === operationId)) throw new Error('Partia: nieznana operacja.');
  return {job: ref.job as number, operationId};
}

export function validateSubassemblyFlow(project: DomainProjectV6, value: unknown): SubassemblyFlow {
  const raw = object(value, ['availability', 'consumption', 'lots'], 'Przepływ podzespołów');
  if (raw.availability !== 'producer-finish' || raw.consumption !== 'consumer-start') {
    throw new Error('Podzespoły: dostępność po końcu przygotowania i pobranie przy starcie odbiorcy.');
  }
  if (!Array.isArray(raw.lots) || !raw.lots.length || raw.lots.length > 5000) {
    throw new Error('Podzespoły: wymagana niepusta lista partii, maks. 5000.');
  }
  const ids = new Set<string>();
  const lots = raw.lots.map(value => {
    const lot = object(value, ['id', 'subassemblyId', 'quantity', 'unit', 'producer', 'consumer',
      'consumptionQuantity', 'source'], 'Partia podzespołu');
    const id = text(lot.id, 'ID partii');
    if (ids.has(id)) throw new Error('Partia podzespołu: powtórzone ID.');
    ids.add(id);
    const subassemblyId = text(lot.subassemblyId, 'Podzespół partii');
    const definition = project.subassemblies.find(item => item.id === subassemblyId);
    if (!definition) throw new Error('Partia: nieznany podzespół.');
    const producer = execution(lot.producer, project), consumer = execution(lot.consumer, project);
    const role = project.operations.find(operation => operation.id === producer.operationId)!.physicalRole;
    if (definition.producerOperationId !== producer.operationId || role?.kind !== 'subassembly-preparation' ||
        !role.subassemblyIds.includes(subassemblyId)) throw new Error('Partia: niezgodna operacja przygotowania.');
    if (!definition.consumerOperationIds.includes(consumer.operationId) || producer.operationId === consumer.operationId) {
      throw new Error('Partia: niezgodna operacja odbiorcy.');
    }
    const produced = quantity(lot.quantity), consumed = quantity(lot.consumptionQuantity);
    if (consumed > produced) throw new Error('Partia: pobranie przekracza wyprodukowaną ilość.');
    return {id, subassemblyId, quantity: produced, unit: text(lot.unit, 'Jednostka partii'), producer, consumer,
      consumptionQuantity: consumed, source: text(lot.source, 'Źródło partii')};
  });
  return {availability: 'producer-finish', consumption: 'consumer-start', lots};
}
