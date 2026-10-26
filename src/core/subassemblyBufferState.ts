import type {BufferRef} from './bufferState';
import type {BlockingPolicy} from './stationBuffers';

/** Run-local capacity contract only; not a saved-project schema or scheduler. */
export interface SubassemblyBufferPlace extends BufferRef {
  capacity: number | null;
  subassemblyId: string;
  unit: string;
  blockingPolicy?: BlockingPolicy;
}
export interface BufferedSubassemblyLot {
  id: string;
  subassemblyId: string;
  unit: string;
  quantity: number;
}
export interface SubassemblyBufferToken extends BufferedSubassemblyLot {
  remainingQuantity: number;
  location?: BufferRef;
  destination?: BufferRef;
  moving?: true;
  consumed?: true;
  residual?: true;
  handoff?: {to: BufferRef; atSeconds: number};
}
export interface SubassemblyBufferBook {
  places: readonly SubassemblyBufferPlace[];
  tokens: readonly SubassemblyBufferToken[];
  atSeconds: number;
}
export type SubassemblyBufferEvent =
  | {kind: 'reserve'; lot: BufferedSubassemblyLot; to: BufferRef; atSeconds: number}
  | {kind: 'depart-direct'; lot: BufferedSubassemblyLot; to: BufferRef; arrivalSeconds: number; atSeconds: number}
  | {kind: 'consume-direct'; id: string; quantity: number; at: BufferRef; atSeconds: number}
  | {kind: 'consume-local-direct'; lot: BufferedSubassemblyLot; quantity: number; at: BufferRef; atSeconds: number}
  | {kind: 'depart' | 'arrive' | 'cancel'; id: string; atSeconds: number}
  | {kind: 'consume'; id: string; quantity: number; at: BufferRef; atSeconds: number};

const key = (ref: BufferRef) => JSON.stringify([ref.stationId, ref.copy, ref.side]);
const cloneRef = (ref: BufferRef): BufferRef => ({stationId: ref.stationId, copy: ref.copy, side: ref.side});
function text(value: string) {
  if (typeof value !== 'string' || !value.trim()) throw new Error('Bufor podmontaży: wymagany jawny identyfikator/jednostka.');
}
function pieces(value: number) {
  if (!Number.isSafeInteger(value) || value <= 0) throw new Error('Bufor podmontaży: ilość w sztukach musi być dodatnią bezpieczną liczbą całkowitą.');
}
function refValid(ref: BufferRef) {
  text(ref.stationId);
  if (!Number.isSafeInteger(ref.copy) || ref.copy < 1 || !['input', 'output'].includes(ref.side)) {
    throw new Error('Bufor podmontaży: wymagana konkretna kopia i strona.');
  }
}
function placeAt(book: SubassemblyBufferBook, ref: BufferRef) {
  refValid(ref);
  const place = book.places.find(place => key(place) === key(ref));
  if (!place) throw new Error('Bufor podmontaży: nieznane miejsce.');
  return place;
}

/** Caller must explicitly expand copy=null and declare compatible component/unit scopes. */
export function createSubassemblyBufferBook(places: readonly SubassemblyBufferPlace[]): SubassemblyBufferBook {
  const seen = new Set<string>();
  for (const place of places) {
    refValid(place); text(place.subassemblyId); text(place.unit);
    if (place.capacity !== null && (!Number.isSafeInteger(place.capacity) || place.capacity < 0)) {
      throw new Error('Bufor podmontaży: niepoprawna pojemność.');
    }
    if (seen.has(key(place))) throw new Error('Bufor podmontaży: nakładające się miejsca lub jednostki.');
    seen.add(key(place));
  }
  return {places: places.map(place => ({...place})), tokens: [], atSeconds: 0};
}

export function subassemblyBufferLoad(book: SubassemblyBufferBook, ref: BufferRef) {
  placeAt(book, ref);
  let occupied = 0, reserved = 0;
  for (const token of book.tokens) {
    if (token.location && key(token.location) === key(ref)) occupied += token.remainingQuantity;
    if (token.destination && key(token.destination) === key(ref)) reserved += token.remainingQuantity;
  }
  if (!Number.isSafeInteger(occupied + reserved)) throw new Error('Bufor podmontaży: przekroczony bezpieczny zakres ilości.');
  return {occupied, reserved, total: occupied + reserved};
}

/** Pure chronological transitions. No production, transport duration or resource rules inferred. */
export function applySubassemblyBufferEvent(book: SubassemblyBufferBook, event: SubassemblyBufferEvent): SubassemblyBufferBook {
  if (!Number.isFinite(event.atSeconds) || event.atSeconds < 0 || event.atSeconds < book.atSeconds) {
    throw new Error('Bufor podmontaży: niepoprawny czas lub cofnięcie czasu.');
  }
  const id = event.kind === 'reserve' || event.kind === 'depart-direct' || event.kind === 'consume-local-direct' ? event.lot.id : event.id;
  text(id);
  const previous = book.tokens.find(token => token.id === id);
  let next: SubassemblyBufferToken | undefined;
  if(event.kind==='consume-local-direct'){
    const {lot}=event,place=placeAt(book,event.at);pieces(lot.quantity);pieces(event.quantity);
    if(place.side!=='input'||place.capacity!==0||place.unit!==lot.unit||place.subassemblyId!==lot.subassemblyId||event.quantity!==lot.quantity)throw new Error('Lokalne wejście 0 wymaga pełnego zgodnego pobrania bez reszty.');
    if(previous&&(previous.consumed||previous.residual||previous.moving||previous.destination||previous.handoff||previous.quantity!==lot.quantity||previous.unit!==lot.unit||previous.subassemblyId!==lot.subassemblyId||previous.location?.side!=='output'||previous.location.stationId!==event.at.stationId||previous.location.copy!==event.at.copy))throw new Error('Lokalne przekazanie wymaga partii na wyjściu tej samej kopii.');
    next={id,subassemblyId:lot.subassemblyId,unit:lot.unit,quantity:lot.quantity,remainingQuantity:0,consumed:true};
  }else if(event.kind==='depart-direct'){
    const {lot}=event,place=placeAt(book,event.to);
    pieces(lot.quantity);text(lot.subassemblyId);text(lot.unit);
    if(place.side!=='input'||place.capacity!==0||place.unit!==lot.unit||place.subassemblyId!==lot.subassemblyId)throw new Error('Bezpośrednie przekazanie wymaga zgodnego wejścia 0.');
    if(!Number.isFinite(event.arrivalSeconds)||event.arrivalSeconds<=event.atSeconds)throw new Error('Bezpośrednie przekazanie wymaga jawnego przyszłego terminu odbioru.');
    if(previous&&(previous.consumed||previous.residual||previous.destination||previous.handoff||previous.moving||!previous.location||previous.quantity!==lot.quantity||previous.unit!==lot.unit||previous.subassemblyId!==lot.subassemblyId))throw new Error('Niepoprawna partia do bezpośredniego przekazania.');
    next={id,subassemblyId:lot.subassemblyId,unit:lot.unit,quantity:lot.quantity,remainingQuantity:lot.quantity,moving:true,handoff:{to:cloneRef(event.to),atSeconds:event.arrivalSeconds}};
  }else if(event.kind==='consume-direct'){
    pieces(event.quantity);placeAt(book,event.at);
    if(!previous?.moving||!previous.handoff||previous.handoff.atSeconds!==event.atSeconds||key(previous.handoff.to)!==key(event.at)||previous.remainingQuantity!==event.quantity)throw new Error('Wejście 0: pełne pobranie musi nastąpić dokładnie przy przyjeździe do zadeklarowanej kopii.');
    next={id:previous.id,subassemblyId:previous.subassemblyId,unit:previous.unit,quantity:previous.quantity,remainingQuantity:0,consumed:true};
  }else if (event.kind === 'reserve') {
    const {lot} = event, place = placeAt(book, event.to);
    pieces(lot.quantity); text(lot.subassemblyId); text(lot.unit);
    if (lot.subassemblyId !== place.subassemblyId || lot.unit !== place.unit) throw new Error('Bufor podmontaży: niezgodny podzespół lub jednostka.');
    if (previous && (previous.consumed || previous.residual || previous.destination || previous.moving ||
        previous.quantity !== lot.quantity || previous.unit !== lot.unit || previous.subassemblyId !== lot.subassemblyId)) {
      throw new Error('Bufor podmontaży: powtórzona rezerwacja, zużyte ID, nieprzypisana reszta lub zmiana partii.');
    }
    if (previous?.location && key(previous.location) === key(event.to)) throw new Error('Partia już zajmuje wskazane miejsce.');
    const total = subassemblyBufferLoad(book, event.to).total + lot.quantity;
    if (!Number.isSafeInteger(total)) throw new Error('Bufor podmontaży: przekroczony bezpieczny zakres ilości.');
    if (place.capacity === 0) throw new Error('Bufor podmontaży B1: pojemność 0 wymaga odrębnego kontraktu bezpośredniego przekazania.');
    if (place.capacity !== null && total > place.capacity) throw new Error('Bufor podmontaży pełny: brak miejsca na całą partię.');
    next = {id, subassemblyId: lot.subassemblyId, unit: lot.unit, quantity: lot.quantity, remainingQuantity: lot.quantity,
      ...(previous?.location ? {location: cloneRef(previous.location)} : {}), destination: cloneRef(event.to)};
  } else {
    if (!previous || previous.consumed || previous.residual) throw new Error('Bufor podmontaży: nieznana lub zużyta partia albo nieprzypisana reszta.');
    switch (event.kind) {
      case 'depart':
        if (!previous.destination || previous.moving) throw new Error('Wyjazd wymaga rezerwacji i nie może być powtórzony.');
        next = {...previous, location: undefined, moving: true}; break;
      case 'arrive':
        if (!previous.moving || !previous.destination || previous.location) throw new Error('Przyjazd wymaga rozpoczętego przewozu.');
        next = {...previous, location: cloneRef(previous.destination), destination: undefined, moving: undefined}; break;
      case 'cancel':
        if (!previous.destination || previous.moving) throw new Error('Nie można anulować nieistniejącej rezerwacji ani przewozu w ruchu.');
        next = previous.location ? {...previous, destination: undefined} : undefined; break;
      case 'consume':
        pieces(event.quantity); placeAt(book, event.at);
        if (!previous.location || key(previous.location) !== key(event.at) || previous.destination || previous.moving) {
          throw new Error('Zużycie wymaga obecności partii w kopii odbiorcy bez rezerwacji przewozu.');
        }
        if (event.quantity > previous.remainingQuantity) throw new Error('Pobranie przekracza pozostałą ilość partii.');
        // The assigned recipient consumes once. Unassigned remainder stays physically in this buffer.
        const remainingQuantity = previous.remainingQuantity - event.quantity;
        next = remainingQuantity > 0 ? {...previous, remainingQuantity, residual: true}
          : {...previous, remainingQuantity: 0, location: undefined, consumed: true}; break;
      default: throw new Error('Bufor podmontaży: nieznane zdarzenie.');
    }
  }
  return {places: book.places, tokens: [...book.tokens.filter(token => token.id !== id), ...(next ? [next] : [])], atSeconds: event.atSeconds};
}
