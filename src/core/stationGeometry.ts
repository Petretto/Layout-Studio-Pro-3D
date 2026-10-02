import type {LayoutObject} from './models/types';
import type {StationProjectV5} from './stationMigration';
import {parseStationProjectV5} from './stationProject';

export type StationEquipmentType = 'TableESD' | 'FlowRackFIFO3Tier' | 'OperatorErgoMat';
export type StationGeometry = Pick<LayoutObject, 'name' | 'xMm' | 'yMm' | 'zMm' | 'widthMm' | 'lengthMm' | 'heightMm' | 'rotationDeg'>;

const colors: Record<StationEquipmentType, string> = {
  TableESD: '#2563eb', FlowRackFIFO3Tier: '#d97706', OperatorErgoMat: '#059669',
};

function assertStation(project: StationProjectV5, stationId: string) {
  if (!project.stations.some(station => station.id === stationId)) throw new Error(`Nieznane stanowisko: ${stationId}.`);
}

function assertGeometry(geometry: StationGeometry) {
  if (!geometry.name.trim() || ![geometry.xMm, geometry.yMm, geometry.zMm, geometry.widthMm,
    geometry.lengthMm, geometry.heightMm, geometry.rotationDeg].every(Number.isFinite) ||
    [geometry.widthMm, geometry.lengthMm, geometry.heightMm].some(value => value <= 0)) {
    throw new Error('Podaj nazwę, skończone współrzędne i dodatnie wymiary wyposażenia.');
  }
}

export function addStationEquipment(project: StationProjectV5, stationId: string, type: StationEquipmentType,
  geometry: StationGeometry, nextId = () => `EQ-${crypto.randomUUID()}`): StationProjectV5 {
  assertStation(project, stationId); assertGeometry(geometry);
  if (!Object.prototype.hasOwnProperty.call(colors, type)) throw new Error('Nieobsługiwany typ wyposażenia stanowiska.');
  if (type === 'TableESD') {
    const count = project.layoutObjects.filter(object => object.workstationId === stationId && object.type.includes('Table')).length;
    const required = project.workstationSettings[stationId]?.parallelStations ?? 1;
    if (count >= required) throw new Error(`Stanowisko ${stationId} ma już ${count} stołów przy ${required} kopiach.`);
  }
  const object: LayoutObject = {id: nextId(), type, workstationId: stationId, colorHex: colors[type], ...geometry, name: geometry.name.trim()};
  return parseStationProjectV5(JSON.stringify({...project, layoutMode: 'manual', layoutObjects: [...project.layoutObjects, object]}));
}

export function updateStationEquipment(project: StationProjectV5, stationId: string, objectId: string,
  geometry: StationGeometry): StationProjectV5 {
  assertStation(project, stationId); assertGeometry(geometry);
  const current = project.layoutObjects.find(object => object.id === objectId && object.workstationId === stationId);
  if (!current) throw new Error(`Obiekt ${objectId} nie jest powiązany ze stanowiskiem ${stationId}.`);
  return parseStationProjectV5(JSON.stringify({...project, layoutMode: 'manual', layoutObjects: project.layoutObjects.map(object =>
    object.id === objectId ? {...object, ...geometry, name: geometry.name.trim()} : object)}));
}

export function removeStationEquipment(project: StationProjectV5, stationId: string, objectId: string): StationProjectV5 {
  assertStation(project, stationId);
  if (!project.layoutObjects.some(object => object.id === objectId && object.workstationId === stationId)) {
    throw new Error(`Obiekt ${objectId} nie jest powiązany ze stanowiskiem ${stationId}.`);
  }
  return parseStationProjectV5(JSON.stringify({...project, layoutMode: 'manual', layoutObjects: project.layoutObjects.filter(object => object.id !== objectId)}));
}
