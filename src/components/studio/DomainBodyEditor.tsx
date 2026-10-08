import {useState} from 'react';
import type {DomainProjectV6, DomainPhysicalRole} from '../../core/domainProject';
import {validateBodyRunInput, type BodyRunInput} from '../../core/bodyRunInput';

interface Row {job: number; id: string; productId: string; stationId: string; copy: number}
export function DomainBodyEditor({project, onRole, onInput, onUndo, onRedo, canUndo, canRedo}: {
  project: DomainProjectV6; onRole: (id: string, role: DomainPhysicalRole | null) => boolean;
  onInput: (input: BodyRunInput | undefined) => boolean;
  onUndo: () => void; onRedo: () => void; canUndo: boolean; canRedo: boolean;
}) {
  const [operationId, setOperationId] = useState('');
  const [kind, setKind] = useState('');
  const [parts, setParts] = useState<string[]>([]);
  const [rows, setRows] = useState<Row[]>(() => project.bodyRunInput?.jobs.map(job => {
    const body = project.bodyRunInput!.bodies.find(body => body.id === job.bodyId)!;
    const location = body.location;
    return {job: job.job, id: body.id, productId: body.productId,
      stationId: location.kind === 'station' ? location.stationId : '', copy: location.kind === 'station' ? location.copy : NaN};
  }) ?? []);
  const [error, setError] = useState('');
  const attempt = (action: () => void) => {setError(''); try {action();} catch (failure) {setError((failure as Error).message);}};
  const changeRow = (index: number, change: Partial<Row>) => {setRows(rows.map((row, i) => i === index ? {...row, ...change} : row)); setError('');};
  return <div className="panel" aria-label="Korpus i role szkicu 6">
    <h3>Korpus i role operacji — szkic 6</h3>
    <p className="muted">Wprowadź role operacji i jawne instancje do przebiegu. Położenie początkowe jest danymi procesu. Nowy przebieg zaczyna od tych deklaracji; wynik nie zastępuje ich stanem końcowym.</p>
    <div className="toolbar"><button disabled={!canUndo} onClick={onUndo}>Cofnij dane szkicu</button><button disabled={!canRedo} onClick={onRedo}>Ponów dane szkicu</button></div>
    <fieldset><legend>Rola operacji</legend>
      <div className="form-grid">
        <label className="field">Operacja<select aria-label="Operacja roli fizycznej" value={operationId} onChange={event => {
          const id = event.target.value, role = project.operations.find(operation => operation.id === id)?.physicalRole;
          setOperationId(id); setKind(role?.kind ?? ''); setParts(role?.kind === 'subassembly-preparation' ? [...role.subassemblyIds] : []); setError('');
        }}><option value="">Wybierz operację</option>{project.operations.map(operation => <option key={operation.id} value={operation.id}>{operation.id} · {operation.name}</option>)}</select></label>
        <label className="field">Rola<select aria-label="Rodzaj roli fizycznej" value={kind} onChange={event => {setKind(event.target.value); setParts([]);}}>
          <option value="">Nieokreślona</option><option value="subassembly-preparation">Przygotowanie podzespołów</option><option value="body-work">Praca na korpusie</option>
        </select></label>
      </div>
      {kind === 'subassembly-preparation' && <div>{project.subassemblies.map(part => <label className="toolbar" key={part.id}>
        <input type="checkbox" aria-label={`Rola przygotowuje ${part.id}`} checked={parts.includes(part.id)} onChange={event => setParts(event.target.checked ? [...parts, part.id] : parts.filter(id => id !== part.id))} />
        {part.name} · {part.id} · producent: {part.producerOperationId ?? 'brak danych'}
      </label>)}<p className="muted">Wskazane podzespoły muszą mieć tę operację jako jawnego producenta w definicjach powyżej.</p></div>}
      <button disabled={!operationId} onClick={() => attempt(() => {
        onRole(operationId, kind === '' ? null : kind === 'body-work' ? {kind: 'body-work'} : {kind: 'subassembly-preparation', subassemblyIds: parts});
      })}>Zapisz rolę operacji</button>
      <ul>{project.operations.map(operation => <li key={operation.id}>{operation.id}: {operation.physicalRole?.kind === 'body-work' ? 'praca na korpusie' :
        operation.physicalRole?.kind === 'subassembly-preparation' ? `przygotowanie: ${operation.physicalRole.subassemblyIds.join(', ')}` : 'rola nieokreślona'}</li>)}</ul>
    </fieldset>
    <fieldset><legend>Jawne korpusy i przypisania do sztuk</legend>
      <p className="muted">Numery sztuk muszą obejmować 1…liczbę wpisanych korpusów. Każda sztuka ma własne wskazane ID korpusu. Brak wpisów nie tworzy instancji automatycznie.</p>
      {rows.map((row, index) => <div className="panel" key={index}><div className="form-grid">
        <label className="field">Sztuka<input aria-label={`Korpus ${index + 1} sztuka`} type="number" min="1" step="1" value={Number.isNaN(row.job) ? '' : row.job} onChange={event => changeRow(index, {job: event.target.value === '' ? NaN : Number(event.target.value)})} /></label>
        <label className="field">ID korpusu<input aria-label={`Korpus ${index + 1} ID`} value={row.id} onChange={event => changeRow(index, {id: event.target.value})} /></label>
        <label className="field">Wyrób<select aria-label={`Korpus ${index + 1} wyrób`} value={row.productId} onChange={event => changeRow(index, {productId: event.target.value})}><option value="">Wybierz wyrób</option>{project.product && <option value={project.product.id}>{project.product.name} · {project.product.id}</option>}</select></label>
        <label className="field">Stanowisko początkowe<select aria-label={`Korpus ${index + 1} stanowisko`} value={row.stationId} onChange={event => changeRow(index, {stationId: event.target.value, copy: NaN})}><option value="">Wybierz stanowisko</option>{project.stations.map(station => <option key={station.id} value={station.id}>{station.name} · {station.id}</option>)}</select></label>
        <label className="field">Kopia<input aria-label={`Korpus ${index + 1} kopia`} type="number" min="1" step="1" max={project.stationSettings[row.stationId]?.parallelStations} value={Number.isNaN(row.copy) ? '' : row.copy} onChange={event => changeRow(index, {copy: event.target.value === '' ? NaN : Number(event.target.value)})} /></label>
      </div><button onClick={() => setRows(rows.filter((_, i) => i !== index))}>Usuń korpus {index + 1}</button></div>)}
      <div className="toolbar"><button onClick={() => setRows([...rows, {job: NaN, id: '', productId: '', stationId: '', copy: NaN}])}>Dodaj jawny korpus</button>
        <button onClick={() => attempt(() => {
          const input: BodyRunInput = {bodies: rows.map(row => ({id: row.id, productId: row.productId, location: {kind: 'station', stationId: row.stationId, copy: row.copy}})),
            jobs: rows.map(row => ({job: row.job, bodyId: row.id}))};
          onInput(validateBodyRunInput(project, input));
        })}>Zapisz korpusy przebiegu</button>
        <button disabled={!project.bodyRunInput} onClick={() => onInput(undefined)}>Usuń zapis korpusów przebiegu</button>
      </div>
    </fieldset>
    {error && <p role="alert" className="error">Nie zapisano korpusów: {error}</p>}
  </div>;
}
