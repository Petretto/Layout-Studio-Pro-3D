import {parseProject} from './validation';
import {reviseStations, type StationRecord} from './stationRegistry';
import type {StationProjectV5} from './stationMigration';
import type {ProjectData} from './models/types';

/** Validate a prepared schema-5 project without enabling it in the active app.
 * Station records are the authority; manual step pointers must agree with them.
 */
export function parseStationProjectV5(text: string): StationProjectV5 {
  const raw = JSON.parse(text);
  if (!raw || typeof raw !== 'object' || raw.schemaVersion !== 5) throw new Error('Wymagany schemat projektu 5.');
  if (!Array.isArray(raw.stations) || raw.stations.length > 500 || raw.stations.some((s:unknown) =>
    !s || typeof s !== 'object' || typeof (s as StationRecord).id !== 'string' ||
    typeof (s as StationRecord).name !== 'string' || !Array.isArray((s as StationRecord).operationIds) ||
    (s as StationRecord).operationIds.some(id => typeof id !== 'string'))) {
    throw new Error('Niepoprawny rejestr stanowisk.');
  }
  // Reuse base validation on a fresh object; schema 4's active parser remains closed to v5.
  const base = parseProject(JSON.stringify({...raw, schemaVersion: 4})) as ProjectData & {stations?: StationRecord[]};
  const stations = reviseStations(raw.stations, raw.stations, base.processSteps.map(s => s.id)).stations;
  const ids = new Set(stations.map(s => s.id));
  if (stations.some(s => !s.id.startsWith('ST-'))) throw new Error('Trwałe ID stanowiska musi zaczynać się od ST-.');
  const owner = new Map(stations.flatMap(s => s.operationIds.map(id => [id, s.id] as const)));
  const position = new Map(stations.map((s, i) => [s.id, i]));
  for (const step of base.processSteps) {
    if (base.algorithm === 'Manual') {
      if (!owner.has(step.id) || step.assignedWorkstationId !== owner.get(step.id)) {
        throw new Error(`${step.id}: przypisanie ręczne nie zgadza się z rejestrem stanowisk.`);
      }
      if (step.predecessorIds.some(id => position.get(owner.get(id)!)! > position.get(owner.get(step.id)!)!)) {
        throw new Error(`${step.id}: poprzednik jest na późniejszym stanowisku.`);
      }
    } else if (step.assignedWorkstationId !== undefined) {
      throw new Error(`${step.id}: automatyczny bilans nie może mieć ręcznego przypisania.`);
    }
  }
  for (const id of Object.keys(base.workstationSettings ?? {})) {
    if (!ids.has(id)) throw new Error(`Ustawienia zasobów wskazują nieznane stanowisko: ${id}.`);
  }
  for (const object of base.layoutObjects) {
    if (object.workstationId && !ids.has(object.workstationId)) {
      throw new Error(`Obiekt ${object.id}: nieznane stanowisko ${object.workstationId}.`);
    }
  }
  const {stations: _stations, balancing: _balancing, spaghetti: _spaghetti, ...source} = base;
  return {...source, schemaVersion: 5, stations,
    workstationSettings: {...(source.workstationSettings ?? {})}};
}
