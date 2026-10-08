import {useState} from 'react';
import type {DomainProjectV6} from '../../core/domainProject';
import {validatePhysicalConcurrency, type PhysicalConcurrency, type PhysicalConcurrencyGroup} from '../../core/physicalConcurrency';

export function DomainConcurrencyEditor({project, onApply, onUndo, onRedo, canUndo, canRedo}: {
  project: DomainProjectV6; onApply: (policy: PhysicalConcurrency | undefined) => boolean;
  onUndo: () => void; onRedo: () => void; canUndo: boolean; canRedo: boolean;
}) {
  const [groups, setGroups] = useState<PhysicalConcurrencyGroup[]>(() =>
    project.physicalConcurrency?.groups.map(group => ({...group, operationIds: [...group.operationIds]})) ?? []);
  const [error, setError] = useState('');
  const change = (index: number, group: PhysicalConcurrencyGroup) => {
    setGroups(groups.map((old, i) => i === index ? group : old));setError('');
  };
  return <div className="panel" aria-label="Grupy równoległości szkicu 6">
    <h3>Grupy dopuszczonej równoległości — szkic 6</h3>
    <p className="muted">Cały równoczesny zestaw musi mieścić się w jednej zapisanej grupie. Grupy A+B i B+C nie dopuszczają A+B+C ani A+C. Zależności, kalendarze i wyłączność pracowników oraz wyposażenia nadal obowiązują. Wspólna praca na korpusie wymaga tej samej kopii i jednej lokalizacji.</p>
    <p>{project.physicalConcurrency ? `Zapisane grupy: ${project.physicalConcurrency.groups.length}.` : 'Brak zapisanych reguł — obowiązuje dotychczasowy przebieg sekwencyjny.'}</p>
    {project.operations.some(operation => !operation.physicalRole) && <p className="notice">Przed zapisem reguł określ role fizyczne wszystkich operacji w edytorze korpusu powyżej.</p>}
    <div className="toolbar"><button disabled={!canUndo} onClick={onUndo}>Cofnij dane szkicu</button><button disabled={!canRedo} onClick={onRedo}>Ponów dane szkicu</button></div>
    {groups.map((group, index) => <fieldset key={index}><legend>Grupa {index + 1}</legend>
      <label className="field">ID grupy<input aria-label={`Grupa ${index + 1} ID`} value={group.id}
        onChange={event => change(index, {...group, id: event.target.value})} /></label>
      <p className="muted">Wskaż co najmniej dwie operacje, dla których dopuszczasz równoległość.</p>
      {project.operations.map(operation => <label className="toolbar" key={operation.id}>
        <input type="checkbox" aria-label={`Grupa ${index + 1} operacja ${operation.id}`} checked={group.operationIds.includes(operation.id)}
          onChange={event => change(index, {...group, operationIds: event.target.checked ? [...group.operationIds, operation.id] : group.operationIds.filter(id => id !== operation.id)})} />
        {operation.id} · {operation.name} · {operation.physicalRole?.kind === 'body-work' ? 'korpus' : operation.physicalRole?.kind === 'subassembly-preparation' ? 'przygotowanie podzespołów' : 'rola nieokreślona'}
      </label>)}
      <button onClick={() => {setGroups(groups.filter((_, i) => i !== index));setError('');}}>Usuń grupę {index + 1}</button>
    </fieldset>)}
    <div className="toolbar">
      <button disabled={groups.length >= 500} onClick={() => {setGroups([...groups, {id: '', operationIds: []}]);setError('');}}>Dodaj grupę równoległości</button>
      <button onClick={() => {
        setError('');try {onApply(validatePhysicalConcurrency(project, {groups}));}
        catch (failure) {setError((failure as Error).message);}
      }}>Zapisz grupy równoległości</button>
      <button disabled={!project.physicalConcurrency} onClick={() => onApply(undefined)}>Usuń zapis reguł równoległości</button>
    </div>
    <p className="muted">Zapis pustej listy oznacza jawne wykluczenie równoległości, z obsługą tras gałęzi. Usunięcie zapisu przywraca starszy tryb bez reguł; rozgałęziony przebieg z trasami może wtedy odmówić wyniku. Dodawanie i usuwanie grup w formularzu wymaga zapisu.</p>
    {error && <p className="error" role="alert">Nie zapisano grup: {error}</p>}
  </div>;
}
