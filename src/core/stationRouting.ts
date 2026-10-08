import type {DomainProjectV6} from './domainProject';
import {validateTransportTiming,type TransportCalculation,type DirectTransportTime} from './transportTime';

export interface StationCopyRef {stationId: string; copy: number}
export interface FixedEquipmentPlacement extends StationCopyRef {equipmentId: string}
export interface StationCandidate extends StationCopyRef {requiredEquipmentIds: string[]}
export interface DeclaredTransportRoute {
  id: string;
  from: StationCopyRef;
  to: StationCopyRef;
  distanceMm: number;
  basis: 'confirmed';
  source: string;
  transportTime?: DirectTransportTime;
  transportCalculation?: TransportCalculation;
}
/** Explicit draft data; absence never creates capabilities, routes or equipment copies. */
export interface StationRoutingV6 {
  selectionRule: 'earliest-start-then-shortest-route';
  equipmentPlacements: FixedEquipmentPlacement[];
  operations: {operationId: string; candidates: StationCandidate[]}[];
  routes: DeclaredTransportRoute[];
}

function object(value: unknown, keys: readonly string[], label: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value) ||
      Object.keys(value).some(key => !keys.includes(key))) throw new Error(`${label}: niepoprawne pola.`);
  return value as Record<string, unknown>;
}
function list(value: unknown, label: string): unknown[] {
  if (!Array.isArray(value) || value.length > 5000) throw new Error(`${label}: wymagana lista, maks. 5000 wpisów.`);
  return value;
}
const copyKey = (ref: StationCopyRef) => JSON.stringify([ref.stationId, ref.copy]);

/** Partial drafts are permitted; every entered reference and requirement must be consistent. */
export function validateStationRouting(project: DomainProjectV6, value: unknown): StationRoutingV6 {
  const raw = object(value, ['selectionRule', 'equipmentPlacements', 'operations', 'routes'], 'Dopuszczenia');
  if (raw.selectionRule !== 'earliest-start-then-shortest-route') throw new Error('Nieznana reguła wyboru stanowiska.');
  const stationIds = new Set(project.stations.map(station => station.id));
  const operationIds = new Set(project.operations.map(operation => operation.id));
  const equipment = new Map(project.equipment.map(item => [item.id, item]));
  const ref = (item: Record<string, unknown>, label: string): StationCopyRef => {
    const stationId = item.stationId;
    if (typeof stationId !== 'string' || !stationIds.has(stationId)) throw new Error(`${label}: nieznane stanowisko.`);
    const count = project.stationSettings[stationId]?.parallelStations;
    if (!Number.isSafeInteger(count) || !count || count < 1 ||
        typeof item.copy !== 'number' || !Number.isSafeInteger(item.copy) || item.copy < 1 || item.copy > count) {
      throw new Error(`${label}: brak jawnej lub poprawnej kopii stanowiska.`);
    }
    return {stationId, copy: item.copy};
  };
  const placements = new Map<string, StationCopyRef>();
  const equipmentPlacements = list(raw.equipmentPlacements, 'Wyposażenie kopii').map(value => {
    const item = object(value, ['equipmentId', 'stationId', 'copy'], 'Wyposażenie kopii');
    const target = ref(item, 'Wyposażenie kopii');
    if (typeof item.equipmentId !== 'string' || !equipment.has(item.equipmentId)) throw new Error('Nieznane wyposażenie kopii.');
    if (placements.has(item.equipmentId)) throw new Error('Ten sam egzemplarz wyposażenia przypisano więcej niż raz.');
    if (equipment.get(item.equipmentId)!.stationId !== target.stationId) throw new Error('Wyposażenie: wymagane zgodne jawne stanowisko.');
    placements.set(item.equipmentId, target);
    return {...target, equipmentId: item.equipmentId};
  });
  const seenOperations = new Set<string>();
  const operations = list(raw.operations, 'Dopuszczenia operacji').map(value => {
    const item = object(value, ['operationId', 'candidates'], 'Dopuszczenie operacji');
    if (typeof item.operationId !== 'string' || !operationIds.has(item.operationId) || seenOperations.has(item.operationId)) {
      throw new Error('Nieznana lub powtórzona operacja dopuszczenia.');
    }
    const operationId = item.operationId;
    seenOperations.add(operationId);
    const seenCopies = new Set<string>();
    const candidates = list(item.candidates, 'Dopuszczone kopie').map(value => {
      const candidate = object(value, ['stationId', 'copy', 'requiredEquipmentIds'], 'Dopuszczona kopia');
      const target = ref(candidate, 'Dopuszczona kopia');
      const key = copyKey(target);
      if (seenCopies.has(key)) throw new Error('Powtórzona dopuszczona kopia.');
      seenCopies.add(key);
      const seenEquipment = new Set<string>();
      const requiredEquipmentIds = list(candidate.requiredEquipmentIds, 'Wymagane wyposażenie').map(id => {
        if (typeof id !== 'string' || !equipment.has(id) || seenEquipment.has(id)) throw new Error('Nieznane lub powtórzone wymagane wyposażenie.');
        seenEquipment.add(id);
        const placement = placements.get(id);
        if (!placement || copyKey(placement) !== key) throw new Error('Wymagane wyposażenie nie należy do wskazanej kopii.');
        if (!equipment.get(id)!.capableOperationIds?.includes(operationId)) throw new Error('Wyposażenie nie ma jawnej możliwości wykonania operacji.');
        return id;
      });
      return {...target, requiredEquipmentIds};
    });
    if (!candidates.length) throw new Error('Operacja wymaga co najmniej jednej dopuszczonej kopii.');
    return {operationId, candidates};
  });
  const routeIds = new Set<string>(), routePairs = new Set<string>();
  const routes = list(raw.routes, 'Trasy transportowe').map(value => {
    const item = object(value, ['id', 'from', 'to', 'distanceMm', 'basis', 'source', 'transportTime', 'transportCalculation'], 'Trasa');
    if (typeof item.id !== 'string' || !item.id.trim() || routeIds.has(item.id)) throw new Error('Niepoprawne lub powtórzone ID trasy.');
    routeIds.add(item.id);
    const from = ref(object(item.from, ['stationId', 'copy'], 'Początek trasy'), 'Początek trasy');
    const to = ref(object(item.to, ['stationId', 'copy'], 'Koniec trasy'), 'Koniec trasy');
    const pair = JSON.stringify([copyKey(from), copyKey(to)]);
    if (routePairs.has(pair)) throw new Error('Powtórzona skierowana trasa między kopiami.');
    routePairs.add(pair);
    if (typeof item.distanceMm !== 'number' || !Number.isFinite(item.distanceMm) || item.distanceMm < 0 ||
        (copyKey(from) !== copyKey(to) && item.distanceMm === 0) || item.basis !== 'confirmed' ||
        typeof item.source !== 'string' || !item.source.trim()) {
      throw new Error('Trasa wymaga rzeczywistej długości w mm, potwierdzenia i źródła.');
    }
    const timing=validateTransportTiming(item,item.distanceMm);
    return {id:item.id,from,to,distanceMm:item.distanceMm,basis:'confirmed' as const,source:item.source,...timing};
  });
  return {selectionRule: raw.selectionRule, equipmentPlacements, operations, routes};
}
