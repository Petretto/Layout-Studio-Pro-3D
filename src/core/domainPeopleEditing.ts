import {parseDomainProjectV6, type DomainProjectV6} from './domainProject';

export type DomainPeopleChange =
  | {kind: 'add-worker'; id: string; name: string}
  | {kind: 'rename-worker'; id: string; name: string}
  | {kind: 'remove-worker'; id: string}
  | {kind: 'add-pool'; id: string; name: string; workerIds: string[]}
  | {kind: 'edit-pool'; id: string; name: string; workerIds: string[]}
  | {kind: 'remove-pool'; id: string};

function required(value: string, label: string): string {
  const trimmed = value.trim();
  if (!trimmed) throw new Error(`${label}: wymagana wartość.`);
  return trimmed;
}

/** Edit draft-only identities. A person referenced by a pool must first be removed from that pool. */
export function editDomainPeople(project: DomainProjectV6, change: DomainPeopleChange): DomainProjectV6 {
  const current = parseDomainProjectV6(JSON.stringify(project));
  let next: DomainProjectV6;
  switch (change.kind) {
    case 'add-worker': {
      const id = required(change.id, 'ID pracownika');
      if (current.workers.some(worker => worker.id === id)) throw new Error(`Pracownik ${id} już istnieje.`);
      next = {...current, workers: [...current.workers, {id, name: required(change.name, 'Nazwa pracownika')}]};
      break;
    }
    case 'rename-worker': {
      if (!current.workers.some(worker => worker.id === change.id)) throw new Error(`Pracownik ${change.id} nie istnieje.`);
      next = {...current, workers: current.workers.map(worker => worker.id === change.id
        ? {...worker, name: required(change.name, 'Nazwa pracownika')} : worker)};
      break;
    }
    case 'remove-worker': {
      if (!current.workers.some(worker => worker.id === change.id)) throw new Error(`Pracownik ${change.id} nie istnieje.`);
      if (current.workerPools.some(pool => pool.workerIds.includes(change.id))) {
        throw new Error(`Pracownik ${change.id} należy do puli. Najpierw zmień członkostwo.`);
      }
      next = {...current, workers: current.workers.filter(worker => worker.id !== change.id)};
      break;
    }
    case 'add-pool': {
      const id = required(change.id, 'ID puli');
      if (current.workerPools.some(pool => pool.id === id)) throw new Error(`Pula ${id} już istnieje.`);
      next = {...current, workerPools: [...current.workerPools,
        {id, name: required(change.name, 'Nazwa puli'), workerIds: [...change.workerIds]}]};
      break;
    }
    case 'edit-pool': {
      if (!current.workerPools.some(pool => pool.id === change.id)) throw new Error(`Pula ${change.id} nie istnieje.`);
      next = {...current, workerPools: current.workerPools.map(pool => pool.id === change.id
        ? {...pool, name: required(change.name, 'Nazwa puli'), workerIds: [...change.workerIds]} : pool)};
      break;
    }
    case 'remove-pool': {
      if (!current.workerPools.some(pool => pool.id === change.id)) throw new Error(`Pula ${change.id} nie istnieje.`);
      next = {...current, workerPools: current.workerPools.filter(pool => pool.id !== change.id)};
      break;
    }
  }
  return parseDomainProjectV6(JSON.stringify(next));
}
