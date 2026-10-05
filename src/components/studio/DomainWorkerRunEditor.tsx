import {useState} from 'react';
import type {DomainProjectV6} from '../../core/domainProject';
import type {DomainWorkerRunChange} from '../../core/domainWorkerRunEditing';
import {validateWorkerRunSelection} from '../../core/workerRunSelection';

interface OperationForm {workerCount: string; eligibleWorkerIds: string[]}

export function DomainWorkerRunEditor({project, onApply, onUndo, onRedo, canUndo, canRedo}: {
  project: DomainProjectV6;
  onApply: (change: DomainWorkerRunChange) => boolean;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
}) {
  const [team, setTeam] = useState<string[]>(project.workerRunSelection?.teamWorkerIds ?? []);
  const [choices, setChoices] = useState<Record<string, OperationForm>>(() =>
    Object.fromEntries(project.operations.map(operation => {
      const saved = project.workerRunSelection?.operations.find(item => item.operationId === operation.id);
      return [operation.id, {workerCount: saved ? String(saved.workerCount) : '',
        eligibleWorkerIds: [...(saved?.eligibleWorkerIds ?? [])]}];
    })));
  const [error, setError] = useState('');
  const saved = project.workerRunSelection;
  const changed = !!saved && (JSON.stringify(team) !== JSON.stringify(saved.teamWorkerIds) ||
    project.operations.some(operation => {
      const choice = choices[operation.id];
      const previous = saved.operations.find(item => item.operationId === operation.id);
      return !previous || choice.workerCount !== String(previous.workerCount) ||
        JSON.stringify(choice.eligibleWorkerIds) !== JSON.stringify(previous.eligibleWorkerIds);
    }));

  const toggleTeam = (workerId: string) => {
    const next = team.includes(workerId) ? team.filter(id => id !== workerId) : [...team, workerId];
    setTeam(next);
    if (!next.includes(workerId)) setChoices(current => Object.fromEntries(Object.entries(current).map(([id, choice]) =>
      [id, {...choice, eligibleWorkerIds: choice.eligibleWorkerIds.filter(member => member !== workerId)}])));
    setError('');
  };
  const changeChoice = (operationId: string, update: Partial<OperationForm>) => {
    setChoices(current => ({...current, [operationId]: {...current[operationId], ...update}}));
    setError('');
  };
  const toggleEligible = (operationId: string, workerId: string) => {
    const current = choices[operationId].eligibleWorkerIds;
    changeChoice(operationId, {eligibleWorkerIds: current.includes(workerId)
      ? current.filter(id => id !== workerId) : [...current, workerId]});
  };
  const save = () => {
    try {
      const selection = validateWorkerRunSelection(project, {teamWorkerIds: team,
        operations: project.operations.map(operation => ({operationId: operation.id,
          workerCount: Number(choices[operation.id].workerCount),
          eligibleWorkerIds: choices[operation.id].eligibleWorkerIds}))});
      if (onApply({kind: 'set-worker-run-selection', selection})) setError('');
    } catch (failure) { setError((failure as Error).message); }
  };

  return <div className="panel" aria-label="Plan zespołu przebiegu szkicu 6">
    <h3>Stały zespół przebiegu — szkic 6</h3>
    <p className="muted">Wskaż skład przed przebiegiem, potem wariant czasu i osoby dopuszczone do każdej operacji. Harmonogram nie dobierze nikogo spoza składu. Lista dopuszczonych nie oznacza jeszcze przydziału konkretnej podgrupy; planowanie i oczekiwanie na wolne osoby będą dodane w 2.4.3.</p>
    <p>Zapisany wybór: {project.workerRunSelection ? 'kompletny' : 'brak'}.</p>
    {changed && <p className="muted">Zmiany formularza nie są jeszcze zapisane.</p>}
    <div className="toolbar"><button disabled={!canUndo} onClick={onUndo}>Cofnij dane szkicu</button>
      <button disabled={!canRedo} onClick={onRedo}>Ponów dane szkicu</button></div>
    <fieldset aria-label="Stały skład przebiegu"><legend>Stały skład przebiegu</legend>
      <div className="toolbar">{project.workers.length ? project.workers.map(worker =>
        <label key={worker.id}><input type="checkbox" checked={team.includes(worker.id)}
          onChange={() => toggleTeam(worker.id)} /> {worker.name} · {worker.id}</label>)
        : <span className="muted">Najpierw dodaj osoby do szkicu.</span>}</div>
    </fieldset>
    {project.operations.map(operation => {
      const choice = choices[operation.id];
      return <fieldset key={operation.id} aria-label={`Wybór przebiegu ${operation.id}`}>
        <legend>{operation.name} · {operation.id}</legend>
        <label className="field">Wariant liczby pracowników<select
          aria-label={`Wariant przebiegu ${operation.id}`} value={choice.workerCount}
          onChange={event => changeChoice(operation.id, {workerCount: event.target.value})}>
          <option value="">Wybierz wariant</option>
          {operation.staffing?.timeVariants.map(variant =>
            <option key={variant.workerCount} value={variant.workerCount}>{variant.workerCount} osób · {variant.timeProfile.durationSeconds} s</option>)}
        </select></label>
        {!operation.staffing?.timeVariants.length && <p className="muted">Brak wariantu czasu. Uzupełnij obsadę i profil czasu operacji.</p>}
        <div className="toolbar">{team.map(workerId => {
          const worker = project.workers.find(item => item.id === workerId)!;
          return <label key={workerId}><input type="checkbox" checked={choice.eligibleWorkerIds.includes(workerId)}
            onChange={() => toggleEligible(operation.id, workerId)} /> Dopuszczony: {worker.name} · {workerId}</label>;
        })}</div>
      </fieldset>;
    })}
    <div className="toolbar"><button onClick={save}>Zapisz wybór zespołu przebiegu</button>
      {project.workerRunSelection && <button className="danger" onClick={() => onApply({kind: 'clear-worker-run-selection'})}>Usuń wybór przebiegu</button>}
    </div>
    {error && <p className="error" role="alert">{error}</p>}
  </div>;
}
