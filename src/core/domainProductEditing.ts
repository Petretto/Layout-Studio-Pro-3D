import {parseDomainProjectV6, type DomainProjectV6, type DomainSubassembly} from './domainProject';

export type DomainProductChange =
  | {kind: 'set-product'; id: string; name: string}
  | {kind: 'clear-product'}
  | {kind: 'add-subassembly'; id: string; name: string; producerOperationId?: string; consumerOperationIds: string[]}
  | {kind: 'edit-subassembly'; id: string; name: string; producerOperationId?: string; consumerOperationIds: string[]}
  | {kind: 'remove-subassembly'; id: string};

function required(value: string, label: string): string {
  const trimmed = value.trim();
  if (!trimmed) throw new Error(`${label}: wymagana wartość.`);
  return trimmed;
}

function assembly(change: Extract<DomainProductChange, {kind: 'add-subassembly' | 'edit-subassembly'}>): DomainSubassembly {
  return {id: required(change.id, 'ID podzespołu'), name: required(change.name, 'Nazwa podzespołu'),
    ...(change.producerOperationId ? {producerOperationId: change.producerOperationId} : {}),
    consumerOperationIds: [...change.consumerOperationIds]};
}

/** Edit only explicit draft definitions; operation links are checked by the v6 parser. */
export function editDomainProduct(project: DomainProjectV6, change: DomainProductChange): DomainProjectV6 {
  const current = parseDomainProjectV6(JSON.stringify(project));
  let next: DomainProjectV6;
  switch (change.kind) {
    case 'set-product': {
      const id = required(change.id, 'ID wyrobu');
      if (current.product && current.product.id !== id) throw new Error('ID wyrobu jest trwałe. Wyczyść definicję przed utworzeniem innego wyrobu.');
      next = {...current, product: {id, name: required(change.name, 'Nazwa wyrobu')}};
      break;
    }
    case 'clear-product': {
      if (!current.product) throw new Error('Brak definicji wyrobu.');
      next = {...current, product: null};
      break;
    }
    case 'add-subassembly': {
      const item = assembly(change);
      if (current.subassemblies.some(existing => existing.id === item.id)) throw new Error(`Podzespół ${item.id} już istnieje.`);
      next = {...current, subassemblies: [...current.subassemblies, item]};
      break;
    }
    case 'edit-subassembly': {
      if (!current.subassemblies.some(existing => existing.id === change.id)) throw new Error(`Podzespół ${change.id} nie istnieje.`);
      const item = assembly(change);
      next = {...current, subassemblies: current.subassemblies.map(existing => existing.id === change.id ? item : existing)};
      break;
    }
    case 'remove-subassembly': {
      if (!current.subassemblies.some(existing => existing.id === change.id)) throw new Error(`Podzespół ${change.id} nie istnieje.`);
      next = {...current, subassemblies: current.subassemblies.filter(existing => existing.id !== change.id)};
      break;
    }
  }
  return parseDomainProjectV6(JSON.stringify(next));
}
