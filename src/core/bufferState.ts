import type {DomainProjectV6} from './domainProject';
import {validateStationBuffers, type BlockingPolicy} from './stationBuffers';
import type {StationCopyRef} from './stationRouting';

export interface BufferRef extends StationCopyRef {side: 'input' | 'output'}
export interface BufferPlace extends BufferRef {capacity: number | null; blockingPolicy?: BlockingPolicy}
export interface BufferToken {id: string; location?: BufferRef; destination?: BufferRef; moving?: true}
export interface BufferBook {places: readonly BufferPlace[]; tokens: readonly BufferToken[]; atSeconds: number}
export type BufferEvent =
  | {kind: 'reserve'; id: string; atSeconds: number; to: BufferRef}
  | {kind: 'depart'; id: string; atSeconds: number}
  | {kind: 'arrive'; id: string; atSeconds: number}
  | {kind: 'cancel'; id: string; atSeconds: number}
  | {kind: 'remove'; id: string; atSeconds: number};
const key = (ref: BufferRef) => JSON.stringify([ref.stationId,ref.copy,ref.side]);
const cloneRef = (ref: BufferRef): BufferRef => ({stationId:ref.stationId,copy:ref.copy,side:ref.side});

/** Empty run ledger. Initial bodies/stock are not invented or inserted by configuration. */
export function createBufferBook(project: DomainProjectV6): BufferBook {
  const raw = project.stationBuffers;
  if(!raw)return {places:[],tokens:[],atSeconds:0};
  validateStationBuffers(project,raw);
  const places: BufferPlace[] = [], scopes = new Set<string>();
  for(const config of raw.buffers){
    const count=project.stationSettings[config.stationId]?.parallelStations;
    if(!Number.isSafeInteger(count)||!count||count<1)throw new Error(`Bufory ${config.stationId}: brak jawnej liczby kopii.`);
    const copies=config.copy===null||config.copy===undefined?Array.from({length:count},(_,i)=>i+1):[config.copy];
    if(config.outputCapacity!==null&&config.outputCapacity!==undefined&&config.blockingPolicy===undefined)throw new Error('Bufor wyjściowy: wymagana jawna polityka operatora.');
    for(const copy of copies){
      const scope=JSON.stringify([config.stationId,copy]);
      if(scopes.has(scope))throw new Error('Bufory: nakładające się konfiguracje wszystkich i konkretnych kopii.');
      scopes.add(scope);
      places.push({stationId:config.stationId,copy,side:'input',capacity:config.inputCapacity??null});
      places.push({stationId:config.stationId,copy,side:'output',capacity:config.outputCapacity??null,
        ...(config.blockingPolicy!==undefined?{blockingPolicy:config.blockingPolicy}:{})});
    }
  }
  return {places,tokens:[],atSeconds:0};
}
function placeAt(book: BufferBook, ref: BufferRef) {
  const place=book.places.find(place=>key(place)===key(ref));
  if(!place)throw new Error('Bufor: nieznane miejsce oczekiwania.');
  return place;
}
/** Include in-flight promises so two transports cannot reserve the last slot. */
export function bufferLoad(book: BufferBook, ref: BufferRef) {
  placeAt(book,ref);
  return book.tokens.filter(token=>token.location&&key(token.location)===key(ref)||token.destination&&key(token.destination)===key(ref)).length;
}
export function bufferHasSpace(book: BufferBook, ref: BufferRef) {
  const place=placeAt(book,ref);
  return place.capacity===null||bufferLoad(book,ref)<place.capacity;
}
export function bufferCanAccept(book: BufferBook, ref: BufferRef, operationReady: boolean) {
  return placeAt(book,ref).capacity===0?operationReady:bufferHasSpace(book,ref);
}
export function outputBlock(book: BufferBook, ref: BufferRef, directOperationReady=false) {
  if(ref.side!=='output')throw new Error('Blokada po zakończeniu dotyczy bufora wyjściowego.');
  const place=placeAt(book,ref),blocked=!bufferCanAccept(book,ref,directOperationReady);
  if(blocked&&!place.blockingPolicy)throw new Error('Blokada wymaga jawnej polityki operatora.');
  return {blocked,holdStation:blocked,holdEquipment:blocked,holdWorkers:blocked&&place.blockingPolicy==='bbas'};
}

/** Pure chronological transitions. Reservation is a promise, never a second physical location. */
export function applyBufferEvent(book: BufferBook,event: BufferEvent): BufferBook {
  if(!Number.isFinite(event.atSeconds)||event.atSeconds<book.atSeconds||event.atSeconds<0)throw new Error('Bufor: zdarzenie cofa czas lub ma niepoprawny czas.');
  if(typeof event.id!=='string'||!event.id.trim())throw new Error('Bufor: wymagane jawne ID jednostki.');
  const previous=book.tokens.find(token=>token.id===event.id);
  let next: BufferToken|undefined;
  if(event.kind==='reserve'){
    placeAt(book,event.to);
    if(previous?.destination)throw new Error('Jednostka ma już rezerwację miejsca docelowego.');
    if(previous?.location&&key(previous.location)===key(event.to))throw new Error('Jednostka już zajmuje wskazane miejsce.');
    if(!bufferHasSpace(book,event.to))throw new Error('Bufor pełny lub pojemność 0: wymagane przekazanie bez oczekiwania do gotowej operacji.');
    next={id:event.id,...(previous?.location?{location:cloneRef(previous.location)}:{}),destination:cloneRef(event.to)};
  }else{
    if(!previous)throw new Error('Bufor: nieznana jednostka.');
    switch(event.kind){
      case 'depart':
        if(previous.moving||!previous.destination)throw new Error('Wyjazd wymaga rezerwacji celu i nie może być powtórzony.');
        next={id:event.id,destination:cloneRef(previous.destination),moving:true};break;
      case 'arrive':
        if(previous.location||!previous.destination)throw new Error('Przyjazd wymaga wolnej lokalizacji i istniejącej rezerwacji.');
        next={id:event.id,location:cloneRef(previous.destination)};break;
      case 'cancel':
        if(!previous.destination)throw new Error('Brak rezerwacji do anulowania.');
        // Cancellation in flight would lose the only reserved landing place.
        if(previous.moving)throw new Error('Nie anuluj miejsca docelowego jednostki w ruchu.');
        next=previous.location?{id:event.id,location:cloneRef(previous.location)}:undefined;break;
      case 'remove':
        if(!previous.location||previous.destination)throw new Error('Wyjście do operacji wymaga obecności w buforze bez aktywnego transportu.');
        break;
      default: throw new Error('Bufor: nieznany rodzaj zdarzenia.');
    }
  }
  return {places:book.places,tokens:[...book.tokens.filter(token=>token.id!==event.id),...(next?[next]:[])],atSeconds:event.atSeconds};
}
