import {useState} from 'react';
import type {DomainProjectV6} from '../../core/domainProject';
import type {DomainPeopleChange} from '../../core/domainPeopleEditing';

export function DomainPeopleEditor({project, onApply, onUndo, onRedo, canUndo, canRedo}: {
  project: DomainProjectV6;
  onApply: (change: DomainPeopleChange) => boolean;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
}) {
  const [selectedWorker, setSelectedWorker] = useState('');
  const [workerId, setWorkerId] = useState('');
  const [workerName, setWorkerName] = useState('');
  const [selectedPool, setSelectedPool] = useState('');
  const [poolId, setPoolId] = useState('');
  const [poolName, setPoolName] = useState('');
  const [members, setMembers] = useState<string[]>([]);

  const chooseWorker = (id: string) => {
    setSelectedWorker(id);
    setWorkerId(id);
    setWorkerName(project.workers.find(worker => worker.id === id)?.name ?? '');
  };
  const choosePool = (id: string) => {
    const pool = project.workerPools.find(item => item.id === id);
    setSelectedPool(id);
    setPoolId(id);
    setPoolName(pool?.name ?? '');
    setMembers(pool?.workerIds ?? []);
  };
  const toggleMember = (id: string) => setMembers(current => current.includes(id)
    ? current.filter(member => member !== id) : [...current, id]);

  return <div className="panel" aria-label="Edytor osób i pul szkicu 6">
    <h3>Osoby i pule — szkic 6</h3>
    <p className="muted">Wprowadź tylko znane osoby i ich pule. Są to definicje robocze; obecny bilans i symulacja nie korzystają z tej listy. ID pozostaje stałe po zmianie nazwy. Usunięcie osoby należącej do puli wymaga wcześniejszej zmiany członkostwa.</p>
    <div className="toolbar"><button disabled={!canUndo} onClick={onUndo}>Cofnij dane szkicu</button><button disabled={!canRedo} onClick={onRedo}>Ponów dane szkicu</button></div>
    <h4>Osoby</h4>
    <div className="toolbar">
      <label className="field">Osoba do edycji<select aria-label="Osoba do edycji" value={selectedWorker} onChange={event => chooseWorker(event.target.value)}><option value="">Nowa osoba</option>{project.workers.map(worker => <option key={worker.id} value={worker.id}>{worker.name} · {worker.id}</option>)}</select></label>
      <label className="field">ID osoby<input aria-label="ID osoby" value={workerId} disabled={!!selectedWorker} onChange={event => setWorkerId(event.target.value)} /></label>
      <label className="field">Nazwa osoby<input aria-label="Nazwa osoby" value={workerName} onChange={event => setWorkerName(event.target.value)} /></label>
      <button onClick={() => onApply(selectedWorker ? {kind: 'rename-worker', id: selectedWorker, name: workerName}
        : {kind: 'add-worker', id: workerId, name: workerName})}>{selectedWorker ? 'Zmień nazwę osoby' : 'Dodaj osobę'}</button>
      {selectedWorker && <button className="danger" onClick={() => onApply({kind: 'remove-worker', id: selectedWorker})}>Usuń osobę</button>}
    </div>
    <div className="table-wrap"><table><thead><tr><th>ID osoby</th><th>Nazwa</th><th>Pule</th></tr></thead><tbody>{project.workers.map(worker => <tr key={worker.id}><td>{worker.id}</td><td>{worker.name}</td><td>{project.workerPools.filter(pool => pool.workerIds.includes(worker.id)).map(pool => pool.name).join(', ') || '—'}</td></tr>)}</tbody></table></div>
    <h4>Pule osób</h4>
    <div className="toolbar">
      <label className="field">Pula do edycji<select aria-label="Pula do edycji" value={selectedPool} onChange={event => choosePool(event.target.value)}><option value="">Nowa pula</option>{project.workerPools.map(pool => <option key={pool.id} value={pool.id}>{pool.name} · {pool.id}</option>)}</select></label>
      <label className="field">ID puli<input aria-label="ID puli" value={poolId} disabled={!!selectedPool} onChange={event => setPoolId(event.target.value)} /></label>
      <label className="field">Nazwa puli<input aria-label="Nazwa puli" value={poolName} onChange={event => setPoolName(event.target.value)} /></label>
    </div>
    <fieldset><legend>Członkowie puli</legend><div className="toolbar">{project.workers.length
      ? project.workers.map(worker => <label key={worker.id}><input type="checkbox" checked={members.includes(worker.id)} onChange={() => toggleMember(worker.id)} /> {worker.name} · {worker.id}</label>)
      : <span className="muted">Najpierw dodaj osoby.</span>}</div></fieldset>
    <div className="toolbar"><button onClick={() => onApply(selectedPool ? {kind: 'edit-pool', id: selectedPool, name: poolName, workerIds: members}
      : {kind: 'add-pool', id: poolId, name: poolName, workerIds: members})}>{selectedPool ? 'Zapisz pulę' : 'Dodaj pulę'}</button>
      {selectedPool && <button className="danger" onClick={() => onApply({kind: 'remove-pool', id: selectedPool})}>Usuń pulę</button>}
    </div>
    <div className="table-wrap"><table><thead><tr><th>ID puli</th><th>Nazwa</th><th>Członkowie</th></tr></thead><tbody>{project.workerPools.map(pool => <tr key={pool.id}><td>{pool.id}</td><td>{pool.name}</td><td>{pool.workerIds.join(', ') || 'Brak'}</td></tr>)}</tbody></table></div>
  </div>;
}
