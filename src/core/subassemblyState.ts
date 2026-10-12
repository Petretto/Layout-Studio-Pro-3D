import type {DomainProjectV6} from './domainProject';
import type {StationCopyRef} from './stationRouting';
import type {SubassemblyLot} from './subassemblyFlow';

export interface SubassemblyLotState {
  declaration: SubassemblyLot;
  status: 'pending' | 'available' | 'moving' | 'consumed';
  location?: StationCopyRef;
  destination?: StationCopyRef;
  arrivalSeconds?: number;
  remainingQuantity: number;
}
export interface SubassemblyEvent {
  kind: 'produced' | 'start-transfer' | 'arrived' | 'consumed';
  lotId: string;
  atSeconds: number;
  location: StationCopyRef;
  quantity: number;
}

/** Run-local ledger. A delivered lot cannot be redirected or consumed twice. */
export class SubassemblyRun {
  readonly lots: SubassemblyLotState[];
  readonly events: SubassemblyEvent[] = [];
  constructor(project: DomainProjectV6, batch: number) {
    this.lots = (project.subassemblyFlow?.lots ?? []).map(declaration => {
      if (declaration.producer.job > batch || declaration.consumer.job > batch) throw new Error('Partia podzespołu: wykonanie poza uruchomioną partią sztuk.');
      return {declaration, status: 'pending', remainingQuantity: declaration.quantity};
    });
    for (const definition of project.subassemblies) {
      const producer = project.operations.find(operation => operation.id === definition.producerOperationId);
      if (producer?.physicalRole?.kind !== 'subassembly-preparation' || !producer.physicalRole.subassemblyIds.includes(definition.id)) continue;
      for (let job = 1; job <= batch; job++) for (const operationId of definition.consumerOperationIds) {
        if (!this.lots.some(lot => lot.declaration.subassemblyId === definition.id && lot.declaration.consumer.job === job && lot.declaration.consumer.operationId === operationId)) {
          throw new Error(`Podzespół ${definition.id}: brak jawnej partii dla odbiorcy ${job}:${operationId}.`);
        }
      }
    }
  }
  incoming(job: number, operationId: string) {
    return this.lots.filter(lot => lot.declaration.consumer.job === job && lot.declaration.consumer.operationId === operationId);
  }
  produce(job: number, operationId: string, location: StationCopyRef, at: number) {
    for (const lot of this.lots.filter(lot => lot.declaration.producer.job === job && lot.declaration.producer.operationId === operationId)) {
      if (lot.status !== 'pending') throw new Error('Podzespół: powtórzone wytworzenie partii.');
      lot.status = 'available';lot.location = {...location};
      this.events.push({kind: 'produced', lotId: lot.declaration.id, atSeconds: at, location: {...location}, quantity: lot.declaration.quantity});
    }
  }
  start(lot: SubassemblyLotState, to: StationCopyRef, at: number, end: number) {
    if (lot.status !== 'available' || !lot.location || !Number.isFinite(end) || end <= at) throw new Error('Podzespół: niepoprawny start przewozu.');
    lot.status = 'moving';lot.location = undefined;lot.destination = {...to};lot.arrivalSeconds = end;
    this.events.push({kind: 'start-transfer', lotId: lot.declaration.id, atSeconds: at, location: {...to}, quantity: lot.declaration.quantity});
  }
  arrive(id: string, at: number) {
    const lot = this.lots.find(lot => lot.declaration.id === id)!;
    if (lot.status !== 'moving' || lot.arrivalSeconds !== at || !lot.destination) throw new Error('Podzespół: niezgodny przyjazd partii.');
    lot.status = 'available';lot.location = lot.destination;lot.destination = undefined;
    this.events.push({kind: 'arrived', lotId: id, atSeconds: at, location: {...lot.location}, quantity: lot.declaration.quantity});
  }
  consume(job: number, operationId: string, location: StationCopyRef, at: number) {
    const lots = this.incoming(job, operationId);
    if (lots.some(lot => lot.status !== 'available' || lot.location?.stationId !== location.stationId || lot.location.copy !== location.copy)) {
      throw new Error('Podzespół: odbiorca nie ma wszystkich partii w swojej kopii.');
    }
    for (const lot of lots) {
      lot.status = 'consumed';lot.remainingQuantity -= lot.declaration.consumptionQuantity;
      this.events.push({kind: 'consumed', lotId: lot.declaration.id, atSeconds: at, location: {...location}, quantity: lot.declaration.consumptionQuantity});
    }
  }
}
