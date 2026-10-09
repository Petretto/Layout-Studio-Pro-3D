import type {DomainProjectV6} from './domainProject';
import type {StationCopyRef} from './stationRouting';
import {resolveTransportTime, type TransportTimedRoute} from './transportTime';
import {availableWindows, validateResourceCalendars, type ResourceCalendar} from './resourceCalendar';

export interface CartDeclaration {
  equipmentId: string;
  initialLocation: StationCopyRef;
  calendar: ResourceCalendar;
}
export interface CartMotionRoute extends TransportTimedRoute {
  id: string;
  equipmentId: string;
  from: StationCopyRef;
  to: StationCopyRef;
  source: string;
  basis: 'confirmed';
}
export interface CartMovement {
  kind: 'empty' | 'loaded';
  routeId: string;
  from: StationCopyRef;
  to: StationCopyRef;
  startSeconds: number;
  endSeconds: number;
}
export interface CartState {
  equipmentId: string;
  calendar: ResourceCalendar;
  location: StationCopyRef | null;
  movement: CartMovement | null;
}
export interface CartBook {atSeconds: number; carts: CartState[]}

const same = (a: StationCopyRef, b: StationCopyRef) => a.stationId === b.stationId && a.copy === b.copy;
function location(project: DomainProjectV6, value: StationCopyRef) {
  if(!value || Object.keys(value).some(key => !['stationId', 'copy'].includes(key)) ||
    !project.stations.some(station => station.id === value.stationId) || !Number.isSafeInteger(value.copy) ||
    value.copy < 1 || value.copy > (project.stationSettings[value.stationId]?.parallelStations ?? 0)) {
    throw new Error('Wózek: nieznana lokalizacja lub kopia.');
  }
}
function time(book: CartBook, at: number) {
  if(!Number.isFinite(at) || at < book.atSeconds) throw new Error('Wózek: niedozwolone cofanie czasu.');
}

/** Runtime-only state; original declarations and project data are never mutated. */
export function createCartBook(project: DomainProjectV6, declarations: readonly CartDeclaration[]): CartBook {
  if(!Array.isArray(declarations) || declarations.length > 500) throw new Error('Wózek: wymagana lista, maks. 500 egzemplarzy.');
  const seen = new Set<string>();
  const carts = declarations.map(declaration => {
    if(!declaration || Object.keys(declaration).some(key => !['equipmentId', 'initialLocation', 'calendar'].includes(key))) {
      throw new Error('Wózek: niepoprawne pola deklaracji.');
    }
    const equipment = project.equipment.find(item => item.id === declaration.equipmentId);
    if(!equipment || seen.has(declaration.equipmentId)) throw new Error('Wózek: nieznany lub powtórzony egzemplarz.');
    if(equipment.stationId !== undefined || equipment.capableOperationIds?.length ||
      project.stationRouting?.equipmentPlacements.some(item => item.equipmentId === equipment.id)) {
      throw new Error('Wózek: egzemplarz nie może równocześnie być wyposażeniem operacji lub stałej kopii.');
    }
    seen.add(declaration.equipmentId);
    location(project, declaration.initialLocation);
    const calendar = validateResourceCalendars({workers: {[equipment.id]: declaration.calendar}, stations: {}},
      new Set([equipment.id]), new Set()).workers[equipment.id];
    return {equipmentId: equipment.id, calendar,
      location: {...declaration.initialLocation}, movement: null};
  });
  return {atSeconds: 0, carts};
}

/** Begin only from the actual current location; no implicit reverse route or return movement. */
export function startCartMovement(project: DomainProjectV6, book: CartBook, route: CartMotionRoute,
  kind: CartMovement['kind'], at: number): CartBook {
  time(book, at);
  if(kind !== 'empty' && kind !== 'loaded') throw new Error('Wózek: nieznany rodzaj ruchu.');
  const cart = book.carts.find(item => item.equipmentId === route.equipmentId);
  if(!cart || cart.movement || !cart.location) throw new Error('Wózek: nieznany lub już zajęty egzemplarz.');
  location(project, route.from); location(project, route.to);
  if(!same(cart.location, route.from)) throw new Error('Wózek: trasa nie zaczyna się w aktualnej lokalizacji.');
  if(same(route.from, route.to) || typeof route.id !== 'string' || !route.id.trim() ||
    route.basis !== 'confirmed' || typeof route.source !== 'string' || !route.source.trim() ||
    !Number.isFinite(route.distanceMm) || route.distanceMm <= 0) throw new Error('Wózek: brak jawnej skierowanej drogi i źródła.');
  const timing = resolveTransportTime(route);
  if(!timing) throw new Error('Wózek: brak jawnego czasu ruchu.');
  const endSeconds = at + timing.durationSeconds;
  if(!Number.isFinite(endSeconds) || endSeconds <= at) throw new Error('Wózek: niepoprawny koniec ruchu.');
  if(!availableWindows(cart.calendar).some(window => window.startSeconds <= at && endSeconds <= window.endSeconds)) {
    throw new Error('Wózek: ruch nie mieści się w ciągłym oknie dostępności.');
  }
  return {atSeconds: at, carts: book.carts.map(item => item === cart ? {...item, location: null,
    movement: {kind, routeId: route.id, from: {...route.from}, to: {...route.to}, startSeconds: at, endSeconds}} : item)};
}

/** The cart stays at the declared destination; any subsequent movement needs its own event. */
export function finishCartMovement(book: CartBook, equipmentId: string, at: number): CartBook {
  time(book, at);
  const cart = book.carts.find(item => item.equipmentId === equipmentId);
  if(!cart?.movement || at !== cart.movement.endSeconds) throw new Error('Wózek: przyjazd wymaga zgodnego końca aktywnego ruchu.');
  return {atSeconds: at, carts: book.carts.map(item => item === cart ? {...item,
    location: {...cart.movement!.to}, movement: null} : item)};
}
