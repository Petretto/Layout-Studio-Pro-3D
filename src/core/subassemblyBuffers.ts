import type {DomainProjectV6} from './domainProject';
import type {StationBufferConfig} from './stationBuffers';

export interface SubassemblyBufferConfig extends StationBufferConfig {subassemblyId: string; unit: string}
export interface SubassemblyBuffers {buffers: SubassemblyBufferConfig[]}

function object(value: unknown, keys: string[]): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value) || Object.keys(value).some(key => !keys.includes(key))) {
    throw new Error('Bufory podmontaży: niepoprawne pola.');
  }
  return value as Record<string, unknown>;
}
function text(value: unknown): string {
  if (typeof value !== 'string' || !value.trim()) throw new Error('Bufory podmontaży: wymagane jawne ID/jednostka.');
  return value;
}
function capacity(value: unknown): number | null {
  if (value === null) return null;
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 0) throw new Error('Bufory podmontaży: pojemność musi być jawna, całkowita i nieujemna albo null.');
  return value;
}

/** Separate capacities per component and copy. Never reinterpret body buffer declarations. */
export function validateSubassemblyBuffers(project: DomainProjectV6, value: unknown): SubassemblyBuffers {
  const raw = object(value, ['buffers']);
  if (!Array.isArray(raw.buffers) || raw.buffers.length > 1000) throw new Error('Bufory podmontaży: wymagana lista do 1000 wpisów.');
  const scopes = new Set<string>();
  const buffers = raw.buffers.map(entry => {
    const item = object(entry, ['subassemblyId','unit','stationId','copy','inputCapacity','outputCapacity','blockingPolicy']);
    const subassemblyId = text(item.subassemblyId), unit = text(item.unit), stationId = text(item.stationId);
    const definition = project.subassemblies.find(item => item.id === subassemblyId);
    if (!definition || !project.stations.some(station => station.id === stationId)) throw new Error('Bufory podmontaży: nieznany podzespół lub stanowisko.');
    const count = project.stationSettings[stationId]?.parallelStations;
    if (!Number.isSafeInteger(count) || !count || count < 1) throw new Error('Bufory podmontaży: brak jawnej liczby kopii.');
    const copy = item.copy;
    if (copy !== null && (typeof copy !== 'number' || !Number.isSafeInteger(copy) || copy < 1 || copy > count)) {
      throw new Error('Bufory podmontaży: niepoprawna kopia.');
    }
    for (const index of copy === null ? Array.from({length:count}, (_, i) => i + 1) : [copy as number]) {
      const key = JSON.stringify([subassemblyId,stationId,index]);
      if (scopes.has(key)) throw new Error('Bufory podmontaży: nakładające się konfiguracje kopii.');
      scopes.add(key);
    }
    const inputCapacity = capacity(item.inputCapacity), outputCapacity = capacity(item.outputCapacity);
    if (!['bbas','bbas-worker-released'].includes(item.blockingPolicy as string)) throw new Error('Bufory podmontaży: wymagana jawna polityka operatora.');
    const operationIds = [definition.producerOperationId,...definition.consumerOperationIds].filter((id): id is string => id !== undefined);
    const relevant = operationIds.some(id => {
      const routing = project.stationRouting?.operations.find(operation => operation.operationId === id);
      return routing ? routing.candidates.some(candidate => candidate.stationId === stationId && (copy === null || candidate.copy === copy))
        : project.stations.some(station => station.id === stationId && station.operationIds.includes(id));
    });
    if (!relevant) throw new Error('Bufory podmontaży: stanowisko/kopia poza dopuszczeniami producenta i odbiorców.');
    for (const lot of project.subassemblyFlow?.lots.filter(lot => lot.subassemblyId === subassemblyId) ?? []) {
      if (lot.unit !== unit || !Number.isSafeInteger(lot.quantity) || !Number.isSafeInteger(lot.consumptionQuantity)) {
        throw new Error('Bufory podmontaży: wymagane zgodne jawne jednostki i całkowite ilości w sztukach.');
      }
    }
    return {subassemblyId,unit,stationId,copy:copy as number | null,inputCapacity,outputCapacity,
      blockingPolicy:item.blockingPolicy as SubassemblyBufferConfig['blockingPolicy']};
  });
  for (const config of buffers) if (buffers.some(other => other.subassemblyId === config.subassemblyId && other.unit !== config.unit)) {
    throw new Error('Bufory podmontaży: różne jednostki tego samego podzespołu.');
  }
  return {buffers};
}
