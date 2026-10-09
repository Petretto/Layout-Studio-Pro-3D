import type {DomainProjectV6} from './domainProject';
import {createCartBook, type CartDeclaration, type CartMotionRoute} from './transportState';
import {validateStationRouting, type StationCopyRef} from './stationRouting';
import {validateResourceCalendars, type ResourceCalendar} from './resourceCalendar';
import {resolveTransportTime} from './transportTime';

export interface AssemblyCart extends CartDeclaration {
  afterUnload: 'stay-at-destination' | 'return-to-initial';
  source: string;
}
export interface AssemblyConveyor {
  equipmentId: string; from: StationCopyRef; to: StationCopyRef; calendar: ResourceCalendar;
}
export interface AssemblyTransport {
  scope: 'assembly-only';
  carts: AssemblyCart[];
  conveyors: AssemblyConveyor[];
  emptyRoutes: CartMotionRoute[];
  routes: {stationRouteId: string; source: string; alternatives: {workerIds: string[]; equipmentIds: string[]}[]}[];
}

function object(value: unknown, keys: readonly string[], label: string): Record<string, unknown> {
  if(!value || typeof value !== 'object' || Array.isArray(value) || Object.keys(value).some(key => !keys.includes(key))) {
    throw new Error(`Transport montażu ${label}: niepoprawne pola.`);
  }
  return value as Record<string, unknown>;
}
function list(value: unknown): unknown[] {
  if(!Array.isArray(value) || value.length > 500) throw new Error('Transport montażu: wymagana lista, maks. 500 wpisów.');
  return value;
}
function text(value: unknown): string {
  if(typeof value !== 'string' || !value.trim()) throw new Error('Transport montażu: wymagane ID lub źródło.');
  return value;
}
const key = (value: StationCopyRef) => JSON.stringify([value.stationId, value.copy]);

/** Optional draft contract; no warehouse workers, stock or implicit transport defaults. */
export function validateAssemblyTransport(project: DomainProjectV6, value: unknown): AssemblyTransport {
  const raw = object(value, ['scope', 'carts', 'conveyors', 'emptyRoutes', 'routes'], '');
  if(raw.scope !== 'assembly-only') throw new Error('Transport montażu: wymagany zakres assembly-only.');
  const devices = new Set<string>();
  const equipment = (id: unknown) => {
    const equipmentId = text(id), item = project.equipment.find(e => e.id === equipmentId);
    if(!item || devices.has(equipmentId)) throw new Error('Transport montażu: nieznany lub powtórzony egzemplarz.');
    if(item.capableOperationIds?.length || project.stationRouting?.equipmentPlacements.some(p => p.equipmentId === equipmentId)) {
      throw new Error('Transport montażu: egzemplarz jest wyposażeniem operacji lub stałej kopii.');
    }
    devices.add(equipmentId);return equipmentId;
  };
  const ref = (value: unknown): StationCopyRef => {
    const r = object(value, ['stationId', 'copy'], 'lokalizacja'), stationId = text(r.stationId);
    const count = project.stationSettings[stationId]?.parallelStations;
    if(!project.stations.some(s => s.id === stationId) || !Number.isSafeInteger(count) ||
      typeof r.copy !== 'number' || !Number.isSafeInteger(r.copy) || r.copy < 1 || r.copy > (count ?? 0)) {
      throw new Error('Transport montażu: nieznana lokalizacja lub kopia.');
    }
    return {stationId, copy: r.copy};
  };
  const calendar = (id: string, value: unknown) => validateResourceCalendars({workers: {[id]: value}, stations: {}},
    new Set([id]), new Set()).workers[id];
  const carts: AssemblyCart[] = list(raw.carts).map(value => {
    const c = object(value, ['equipmentId', 'initialLocation', 'calendar', 'afterUnload', 'source'], 'wózek');
    const equipmentId = equipment(c.equipmentId);
    if(c.afterUnload !== 'stay-at-destination' && c.afterUnload !== 'return-to-initial') {
      throw new Error('Transport montażu: wózek wymaga jawnej reguły po rozładunku.');
    }
    return {equipmentId, initialLocation: ref(c.initialLocation), calendar: calendar(equipmentId, c.calendar),
      afterUnload: c.afterUnload, source: text(c.source)};
  });
  createCartBook(project, carts.map(({afterUnload: _policy, source: _source, ...cart}) => cart));
  const conveyors = list(raw.conveyors).map(value => {
    const c = object(value, ['equipmentId', 'from', 'to', 'calendar'], 'przenośnik'), equipmentId = equipment(c.equipmentId);
    const from = ref(c.from), to = ref(c.to);
    if(key(from) === key(to)) throw new Error('Transport montażu: przenośnik wymaga różnych końców.');
    const stationId = project.equipment.find(e => e.id === equipmentId)!.stationId;
    if(stationId !== undefined && stationId !== from.stationId) throw new Error('Transport montażu: sprzeczne stanowisko przenośnika.');
    return {equipmentId, from, to, calendar: calendar(equipmentId, c.calendar)};
  });
  const cartIds = new Set(carts.map(c => c.equipmentId)), emptyIds = new Set<string>(), pairs = new Set<string>();
  const emptyRoutes = list(raw.emptyRoutes).map(value => {
    const r = object(value, ['id', 'equipmentId', 'from', 'to', 'distanceMm', 'basis', 'source', 'transportTime', 'transportCalculation', 'workerAssignment'], 'dojazd');
    const equipmentId = text(r.equipmentId), id = text(r.id), from = ref(r.from), to = ref(r.to);
    if(!cartIds.has(equipmentId) || emptyIds.has(id)) throw new Error('Transport montażu: nieznany wózek lub powtórzone ID dojazdu.');
    const pair = JSON.stringify([equipmentId, key(from), key(to)]);
    if(pairs.has(pair) || key(from) === key(to)) throw new Error('Transport montażu: powtórzony lub nieruchomy dojazd.');
    // Reuse the complete route/timing validator without inferring a loaded-route duration.
    const {equipmentId: _equipment, workerAssignment: _assignment, ...timedRoute} = r;
    const validated = validateStationRouting(project, {selectionRule: 'earliest-start-then-shortest-route',
      equipmentPlacements: [], operations: [], routes: [timedRoute]}).routes[0];
    if(!resolveTransportTime(validated)) throw new Error('Transport montażu: dojazd wymaga jawnego czasu.');
    emptyIds.add(id);pairs.add(pair);
    let workerAssignment: CartMotionRoute['workerAssignment'];
    if(Object.prototype.hasOwnProperty.call(r,'workerAssignment')) {
      const a = object(r.workerAssignment,['workerIds','source'],'obsada dojazdu');
      const workerIds = list(a.workerIds).map(text);
      if(new Set(workerIds).size !== workerIds.length || workerIds.some(id => !project.workers.some(w => w.id === id))) {
        throw new Error('Transport montażu: nieznane lub powtórzone osoby dojazdu.');
      }
      workerAssignment = {workerIds,source:text(a.source)};
    }
    return {...validated, equipmentId, ...(workerAssignment ? {workerAssignment} : {})};
  });
  const workerIds = new Set(project.workers.map(w => w.id)), routeIds = new Set<string>();
  const uniqueIds = (value: unknown, known: Set<string>) => {
    const result = list(value).map(text);
    if(new Set(result).size !== result.length || result.some(id => !known.has(id))) {
      throw new Error('Transport montażu: nieznane lub powtórzone wymagane zasoby.');
    }
    return result;
  };
  const routes = list(raw.routes).map(value => {
    const r = object(value, ['stationRouteId', 'source', 'alternatives'], 'wymaganie trasy'), stationRouteId = text(r.stationRouteId);
    const route = project.stationRouting?.routes.find(r => r.id === stationRouteId);
    if(!route || routeIds.has(stationRouteId) || key(route.from) === key(route.to)) throw new Error('Transport montażu: nieznana lub powtórzona trasa przewozu.');
    if(!resolveTransportTime(route)) throw new Error('Transport montażu: przewóz wymaga jawnego czasu.');
    routeIds.add(stationRouteId);
    const seen = new Set<string>();
    const alternatives = list(r.alternatives).map(value => {
      const a = object(value, ['workerIds', 'equipmentIds'], 'zestaw');
      const workers = uniqueIds(a.workerIds, workerIds), equipmentIds = uniqueIds(a.equipmentIds, devices);
      const signature = JSON.stringify([[...workers].sort(), [...equipmentIds].sort()]);
      if(seen.has(signature)) throw new Error('Transport montażu: powtórzony alternatywny zestaw.');
      seen.add(signature);
      for(const id of equipmentIds) {
        const conveyor = conveyors.find(c => c.equipmentId === id);
        if(conveyor && (key(conveyor.from) !== key(route.from) || key(conveyor.to) !== key(route.to))) {
          throw new Error('Transport montażu: przenośnik ma inne końce niż trasa.');
        }
      }
      return {workerIds: workers, equipmentIds};
    });
    if(!alternatives.length) throw new Error('Transport montażu: wymagany jawny zestaw, także dla braku ograniczeń.');
    return {stationRouteId, source: text(r.source), alternatives};
  });
  return {scope: 'assembly-only', carts, conveyors, emptyRoutes, routes};
}
