import {useState} from 'react';
import type {DomainProjectV6} from '../../core/domainProject';
import {assertCompetentTeamExists, validateCompetencyRequirements, type CompetencyRequirements} from '../../core/competencies';

export function DomainCompetencyEditor({project, onApply, onUndo, onRedo, canUndo, canRedo}: {
  project: DomainProjectV6; onApply: (value: CompetencyRequirements | undefined) => boolean;
  onUndo: () => void; onRedo: () => void; canUndo: boolean; canRedo: boolean;
}) {
  const initial = (): CompetencyRequirements => structuredClone(project.competencyRequirements ?? {competencies: [], workers: [], operations: []});
  const [rules, setRules] = useState(initial), [dirty, setDirty] = useState(false), [error, setError] = useState('');
  const change = (next: CompetencyRequirements) => {setRules(next); setDirty(true); setError('');};
  const toggle = (ids: string[], id: string) => ids.includes(id) ? ids.filter(item => item !== id) : [...ids, id];
  const save = () => {
    try {if (onApply(validateCompetencyRequirements(project, rules))) setDirty(false);}
    catch (failure) {setError((failure as Error).message);}
  };
  const diagnostics = project.operations.map(operation => {
    const required = project.competencyRequirements?.operations.find(item => item.operationId === operation.id)?.requiredCompetencyIds ?? [];
    if (!required.length) return {operation, message: 'Brak zadeklarowanych wymagań kompetencji.'};
    const choice = project.workerRunSelection?.operations.find(item => item.operationId === operation.id);
    if (!choice) return {operation, message: 'Nie oceniono: wybierz obsadę i dopuszczone osoby w zespole przebiegu.'};
    try {
      assertCompetentTeamExists(project, operation.id, choice.eligibleWorkerIds, choice.workerCount);
      return {operation, message: `Istnieje obsada ${choice.workerCount} osób pokrywająca kompetencje. Dostępność sprawdza harmonogram.`};
    } catch (failure) {return {operation, message: (failure as Error).message};}
  });
  return <div className="panel" aria-label="Kompetencje obsady szkicu 6">
    <h3>Kompetencje obsady</h3>
    <p className="muted">Wprowadź znane kompetencje osób i wymagania operacji. Wybrana obsada pokrywa je łącznie — każda wymagana kompetencja musi wystąpić u co najmniej jednej osoby. Kompetencje nie zmieniają czasu ani liczebności obsady.</p>
    <div className="toolbar"><button disabled={!canUndo} onClick={onUndo}>Cofnij dane szkicu</button><button disabled={!canRedo} onClick={onRedo}>Ponów dane szkicu</button></div>
    <h4>Słownik kompetencji</h4>
    <p className="muted">ID zapisanej kompetencji jest stałe. Przed usunięciem odznacz jej przypisania i wymagania.</p>
    {rules.competencies.map((item, index) => {
      const used = rules.workers.some(worker => worker.competencyIds.includes(item.id)) || rules.operations.some(operation => operation.requiredCompetencyIds.includes(item.id));
      return <div className="toolbar" key={index}>
        <label className="field">ID kompetencji<input aria-label={`Kompetencja ${index + 1} ID`} value={item.id} disabled={project.competencyRequirements?.competencies.some(saved => saved.id === item.id) || used}
          onChange={event => change({...rules, competencies: rules.competencies.map((row, i) => i === index ? {...row, id: event.target.value} : row)})} /></label>
        <label className="field">Nazwa kompetencji<input aria-label={`Kompetencja ${index + 1} nazwa`} value={item.name}
          onChange={event => change({...rules, competencies: rules.competencies.map((row, i) => i === index ? {...row, name: event.target.value} : row)})} /></label>
        <button disabled={used} title={used ? 'Najpierw odznacz przypisania i wymagania tej kompetencji.' : undefined}
          onClick={() => change({...rules, competencies: rules.competencies.filter((_, i) => i !== index)})}>Usuń kompetencję {index + 1}</button>
      </div>;
    })}
    <button disabled={rules.competencies.length >= 5000} onClick={() => change({...rules, competencies: [...rules.competencies, {id: '', name: ''}]})}>Dodaj kompetencję</button>
    <h4>Kompetencje osób</h4>
    {!project.workers.length && <p>Najpierw dodaj osoby w edytorze osób i pul.</p>}
    {project.workers.map(worker => <fieldset key={worker.id}><legend>{worker.name} · {worker.id}</legend>
      {rules.competencies.filter(item => item.id.trim()).map((item, index) => <label key={index}>
        <input type="checkbox" aria-label={`Osoba ${worker.id} kompetencja ${item.id}`} checked={rules.workers.find(row => row.workerId === worker.id)?.competencyIds.includes(item.id) ?? false}
          onChange={() => {const ids = toggle(rules.workers.find(row => row.workerId === worker.id)?.competencyIds ?? [], item.id);
            change({...rules, workers: [...rules.workers.filter(row => row.workerId !== worker.id), {workerId: worker.id, competencyIds: ids}]});}} /> {item.name || item.id} · {item.id}{' '}
      </label>)}
    </fieldset>)}
    <h4>Wymagania operacji</h4>
    {project.operations.map(operation => <fieldset key={operation.id}><legend>{operation.name} · {operation.id}</legend>
      {rules.competencies.filter(item => item.id.trim()).map((item, index) => <label key={index}>
        <input type="checkbox" aria-label={`Operacja ${operation.id} wymaga ${item.id}`} checked={rules.operations.find(row => row.operationId === operation.id)?.requiredCompetencyIds.includes(item.id) ?? false}
          onChange={() => {const ids = toggle(rules.operations.find(row => row.operationId === operation.id)?.requiredCompetencyIds ?? [], item.id);
            change({...rules, operations: [...rules.operations.filter(row => row.operationId !== operation.id), {operationId: operation.id, requiredCompetencyIds: ids}]});}} /> {item.name || item.id} · {item.id}{' '}
      </label>)}
    </fieldset>)}
    <div className="toolbar"><button onClick={save}>Zapisz kompetencje</button>
      <button disabled={!dirty} onClick={() => {setRules(initial()); setDirty(false); setError('');}}>Odrzuć zmiany kompetencji</button>
      <button disabled={!project.competencyRequirements} onClick={() => onApply(undefined)}>Usuń konfigurację kompetencji</button></div>
    {dirty && <p role="status">Zmiany kompetencji wymagają zapisu. Ocena poniżej dotyczy zapisanych danych.</p>}
    {error && <p className="error" role="alert">Nie zapisano kompetencji: {error}</p>}
    <h4>Pokrycie kompetencji — zapisany wybór zespołu</h4>
    <p className="muted">To kontrola kompetencji. Kalendarze, zajętość osób, wyposażenie i pozostałe ograniczenia sprawdza harmonogram szkicu 6. Aktywny automatyczny bilans projektów 4/5 nie korzysta jeszcze z tych wymagań.</p>
    <div className="table-wrap"><table><thead><tr><th>Operacja</th><th>Ocena kompetencji</th></tr></thead><tbody>{diagnostics.map(({operation, message}) => <tr key={operation.id}><td>{operation.name} · {operation.id}</td><td>{message}</td></tr>)}</tbody></table></div>
  </div>;
}
