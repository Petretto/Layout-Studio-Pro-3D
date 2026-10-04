import {parseDomainProjectV6, type DomainEquipment, type DomainProjectV6} from './domainProject';

export type DomainEquipmentChange =
  | {kind: 'add-equipment'; id: string; name: string; stationId?: string; layoutObjectId?: string}
  | {kind: 'edit-equipment'; id: string; name: string; stationId?: string; layoutObjectId?: string}
  | {kind: 'remove-equipment'; id: string};

function required(value: string, label: string): string {
  const trimmed = value.trim();
  if (!trimmed) throw new Error(`${label}: wymagana wartość.`);
  return trimmed;
}

function equipment(change: Extract<DomainEquipmentChange, {kind: 'add-equipment' | 'edit-equipment'}>): DomainEquipment {
  return {id: required(change.id, 'ID wyposażenia'), name: required(change.name, 'Nazwa wyposażenia'),
    ...(change.stationId ? {stationId: change.stationId} : {}),
    ...(change.layoutObjectId ? {layoutObjectId: change.layoutObjectId} : {})};
}

/** Explicit draft identities and bindings; geometry never implies a technological capability. */
export function editDomainEquipment(project: DomainProjectV6, change: DomainEquipmentChange): DomainProjectV6 {
  const current = parseDomainProjectV6(JSON.stringify(project));
  let next: DomainProjectV6;
  switch (change.kind) {
    case 'add-equipment': {
      const item = equipment(change);
      if (current.equipment.some(existing => existing.id === item.id)) throw new Error(`Wyposażenie ${item.id} już istnieje.`);
      next = {...current, equipment: [...current.equipment, item]};
      break;
    }
    case 'edit-equipment': {
      if (!current.equipment.some(existing => existing.id === change.id)) throw new Error(`Wyposażenie ${change.id} nie istnieje.`);
      const item = equipment(change);
      next = {...current, equipment: current.equipment.map(existing => existing.id === change.id ? item : existing)};
      break;
    }
    case 'remove-equipment': {
      if (!current.equipment.some(existing => existing.id === change.id)) throw new Error(`Wyposażenie ${change.id} nie istnieje.`);
      next = {...current, equipment: current.equipment.filter(existing => existing.id !== change.id)};
      break;
    }
  }
  return parseDomainProjectV6(JSON.stringify(next));
}
