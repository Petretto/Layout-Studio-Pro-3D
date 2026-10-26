import type {DomainProjectV6} from './domainProject';
import type {SubassemblyLotState} from './subassemblyState';
import type {StationCopyRef, StationCandidate} from './stationRouting';
import {validateSubassemblyBuffers} from './subassemblyBuffers';
import {createSubassemblyBufferBook, applySubassemblyBufferEvent, subassemblyBufferLoad,
  type SubassemblyBufferBook, type SubassemblyBufferPlace} from './subassemblyBufferState';
import type {BufferRef} from './bufferState';

/** Run-local adapter for positive, component-specific buffers. Body buffers remain independent. */
export class SubassemblyBufferRun {
  private books = new Map<string,SubassemblyBufferBook>();
  constructor(project: DomainProjectV6, candidates: ReadonlyMap<string, readonly StationCandidate[]>) {
    const configs = validateSubassemblyBuffers(project, project.subassemblyBuffers).buffers;
    if (configs.some(config => config.inputCapacity === 0 || config.outputCapacity === 0)) {
      throw new Error('C2-B2a: bufor podmontaży 0 wymaga integracji bezpośredniego przekazania; konfiguracja nie jest pomijana.');
    }
    if (configs.some(config => config.outputCapacity !== null && config.blockingPolicy !== 'bbas-worker-released')) {
      throw new Error('C2-B2a: zatrzymanie operatora bbas przy pełnym buforze podmontaży wymaga kolejnej integracji; jawnie wybierz bbas-worker-released.');
    }
    for (const definition of project.subassemblies) {
      const lots = project.subassemblyFlow?.lots.filter(lot => lot.subassemblyId === definition.id) ?? [];
      if (!lots.length) continue;
      const unit = lots[0].unit;
      if (lots.some(lot => lot.unit !== unit || !Number.isSafeInteger(lot.quantity) || !Number.isSafeInteger(lot.consumptionQuantity))) {
        throw new Error('C2-B2a: bufory podmontaży wymagają zgodnych jednostek i całkowitych ilości wszystkich partii.');
      }
      const places = new Map<string,SubassemblyBufferPlace>();
      for (const config of configs.filter(config=>config.subassemblyId===definition.id)) {
        const copies=config.copy===null?Array.from({length:project.stationSettings[config.stationId].parallelStations},(_,i)=>i+1):[config.copy];
        for(const copy of copies)for(const side of ['input','output'] as const){
          const ref={stationId:config.stationId,copy,side};
          places.set(JSON.stringify(ref),{...ref,subassemblyId:definition.id,unit,capacity:config[side==='input'?'inputCapacity':'outputCapacity']});
        }
      }
      for (const id of [definition.producerOperationId,...definition.consumerOperationIds].filter((id): id is string => id !== undefined)) for (const candidate of candidates.get(id) ?? []) {
        const config = configs.find(config => config.subassemblyId === definition.id && config.stationId === candidate.stationId && (config.copy === null || config.copy === candidate.copy));
        for (const side of ['input','output'] as const) {
          const ref = {stationId:candidate.stationId,copy:candidate.copy,side};
          if(!places.has(JSON.stringify(ref)))places.set(JSON.stringify(ref), {...ref, subassemblyId:definition.id,unit,capacity:config?.[side === 'input' ? 'inputCapacity' : 'outputCapacity'] ?? null});
        }
      }
      this.books.set(definition.id, createSubassemblyBufferBook([...places.values()]));
    }
  }
  snapshot() { return [...this.books.values()]; }
  private ref(location: StationCopyRef, side: 'input'|'output'): BufferRef {return {stationId:location.stationId,copy:location.copy,side};}
  private book(lot: SubassemblyLotState) {return this.books.get(lot.declaration.subassemblyId)!;}
  private lot(lot: SubassemblyLotState) {return {id:lot.declaration.id,subassemblyId:lot.declaration.subassemblyId,unit:lot.declaration.unit,quantity:lot.declaration.quantity};}
  private hasSpace(book: SubassemblyBufferBook, ref: BufferRef, quantity: number) {
    const place = book.places.find(place => place.stationId === ref.stationId && place.copy === ref.copy && place.side === ref.side)!;
    const total = subassemblyBufferLoad(book,ref).total + quantity;
    if (!Number.isSafeInteger(total)) throw new Error('Bufory podmontaży: przekroczony bezpieczny zakres ilości.');
    return place.capacity === null || total <= place.capacity;
  }
  /** Each whole lot enters output separately. Producer stays held until every lot has left its work position. */
  deposit(lots: readonly SubassemblyLotState[], location: StationCopyRef, at: number) {
    const trial = new Map(this.books), to = this.ref(location,'output');
    let complete=true;
    for (const lot of lots) {
      let book = trial.get(lot.declaration.subassemblyId)!;
      if(book.tokens.some(token=>token.id===lot.declaration.id))continue;
      if(lot.status!=='available'||lot.location?.stationId!==location.stationId||lot.location.copy!==location.copy)throw new Error('Bufor podmontaży: odłożenie wymaga wytworzonej partii na producencie.');
      if (!this.hasSpace(book,to,lot.declaration.quantity)) {complete=false;continue;}
      book = applySubassemblyBufferEvent(book,{kind:'reserve',lot:this.lot(lot),to,atSeconds:at});
      book = applySubassemblyBufferEvent(book,{kind:'depart',id:lot.declaration.id,atSeconds:at});
      book = applySubassemblyBufferEvent(book,{kind:'arrive',id:lot.declaration.id,atSeconds:at});
      trial.set(lot.declaration.subassemblyId,book);
    }
    this.books = trial; return complete;
  }
  canDepart(lot: SubassemblyLotState, to: StationCopyRef) {
    const book = this.book(lot), token = book.tokens.find(token => token.id === lot.declaration.id);
    return !!token?.location && token.location.side === 'output' && this.hasSpace(book,this.ref(to,'input'),lot.declaration.quantity);
  }
  depart(lot: SubassemblyLotState, to: StationCopyRef, at: number) {
    if (!this.canDepart(lot,to)) throw new Error('Bufor podmontaży: brak partii na wyjściu lub miejsca w celu.');
    let book = applySubassemblyBufferEvent(this.book(lot),{kind:'reserve',lot:this.lot(lot),to:this.ref(to,'input'),atSeconds:at});
    book = applySubassemblyBufferEvent(book,{kind:'depart',id:lot.declaration.id,atSeconds:at});
    this.books.set(lot.declaration.subassemblyId,book);
  }
  arrive(lot: SubassemblyLotState, at: number) {
    this.books.set(lot.declaration.subassemblyId,applySubassemblyBufferEvent(this.book(lot),{kind:'arrive',id:lot.declaration.id,atSeconds:at}));
  }
  /** Local handoff reserves input first; no physical transport event or duration is fabricated. */
  local(lots: readonly SubassemblyLotState[], location: StationCopyRef, at: number) {
    const original = this.books; this.books = new Map(original);
    try {
      for (const lot of lots) {
        const token = this.book(lot).tokens.find(token => token.id === lot.declaration.id);
        if (token?.location?.side === 'input') continue;
        if (!this.canDepart(lot,location)) {this.books=original;return false;}
        this.depart(lot,location,at);this.arrive(lot,at);
      }
      return true;
    } catch (error) {this.books=original;throw error;}
  }
  consume(lots: readonly SubassemblyLotState[], location: StationCopyRef, at: number) {
    const trial = new Map(this.books);
    for (const lot of lots) {
      const book = trial.get(lot.declaration.subassemblyId)!;
      trial.set(lot.declaration.subassemblyId,applySubassemblyBufferEvent(book,{kind:'consume',id:lot.declaration.id,quantity:lot.declaration.consumptionQuantity,at:this.ref(location,'input'),atSeconds:at}));
    }
    this.books = trial;
  }
}
