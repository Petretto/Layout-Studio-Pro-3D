import {useState} from 'react';
import type {DomainProjectV6} from '../../core/domainProject';
import {scheduleWorkerRun, type WorkerScheduleResult} from '../../core/workerSchedule';

const causeLabel = {
  workers: 'oczekiwanie na pracowników',
  station: 'oczekiwanie na kopię stanowiska',
  'same-job': 'inna operacja tej samej sztuki',
} as const;

/** Read-only preview of the separate schema-6 schedule. Remount on draft changes to drop stale results. */
export function DomainWorkerSchedulePanel({project}: {project: DomainProjectV6}) {
  const [batch, setBatch] = useState('1');
  const [arrivalInterval, setArrivalInterval] = useState('');
  const [result, setResult] = useState<WorkerScheduleResult | null>(null);
  const [error, setError] = useState('');
  const calculate = () => {
    setResult(null);
    setError('');
    try {
      const count = Number(batch);
      if (!Number.isSafeInteger(count) || count < 1 || count > 100) {
        throw new Error('Podgląd dopuszcza partię od 1 do 100 sztuk.');
      }
      setResult(scheduleWorkerRun(project, Number(arrivalInterval), count));
    } catch (failure) { setError((failure as Error).message); }
  };
  const runs = result?.runs ?? [];
  const totalWait = runs.reduce((sum, run) => sum + run.waitSeconds, 0);
  return <div className="panel" aria-label="Harmonogram zespołu szkicu 6">
    <h3>Harmonogram zespołu — szkic 6</h3>
    <p className="muted">Podgląd liczy tylko zapisany skład i wybory operacji szkicu 6. Nie zmienia aktywnej symulacji projektów 4/5. Podaj jawny odstęp przybycia; wynik nie modeluje jeszcze transportu, kalendarza, buforów ani fizycznej równoległości podzespołów.</p>
    {!project.workerRunSelection && <p className="notice">Najpierw zapisz stały skład i wybory dla wszystkich operacji.</p>}
    <div className="form-grid">
      <label className="field">Liczba sztuk w podglądzie<input aria-label="Liczba sztuk szkicu 6"
        type="number" min="1" max="100" step="1" value={batch}
        onChange={event => {setBatch(event.target.value); setResult(null); setError('');}} /></label>
      <label className="field">Odstęp przybycia sztuk [s]<input aria-label="Odstęp przybycia szkicu 6 [s]"
        type="number" min="0.001" step="any" value={arrivalInterval}
        onChange={event => {setArrivalInterval(event.target.value); setResult(null); setError('');}} /></label>
    </div>
    <div className="toolbar"><button disabled={!project.workerRunSelection} onClick={calculate}>Oblicz harmonogram szkicu 6</button></div>
    {error && <p className="error" role="alert">Nie obliczono harmonogramu: {error}</p>}
    {result && <div role="status" aria-label="Wynik harmonogramu szkicu 6">
      <p>{result.jobs.length} szt. · {runs.length} wykonań · koniec ostatniej sztuki: {Math.max(...result.jobs.map(job => job.finish))} s · suma oczekiwania operacji: {totalWait} s.</p>
      <p className="muted">Przyczyna oczekiwania jest zapisana dla operacji, która musiała czekać. Przy kilku przyczynach w czasie oczekiwania pokazane są wszystkie.</p>
      <div className="table-wrap"><table><thead><tr><th>Sztuka</th><th>Operacja</th><th>Stanowisko / kopia</th><th>Pracownicy</th><th>Gotowa [s]</th><th>Start [s]</th><th>Koniec [s]</th><th>Oczekiwanie [s]</th><th>Przyczyna</th></tr></thead>
        <tbody>{runs.slice(0, 100).map(run => <tr key={`${run.job}:${run.operationId}`}>
          <td>{run.job}</td><td>{run.operationId}</td><td>{run.stationId} / {run.copy}</td>
          <td>{run.workerIds.join(', ')}</td><td>{run.readySeconds}</td><td>{run.startSeconds}</td>
          <td>{run.endSeconds}</td><td>{run.waitSeconds}</td>
          <td>{run.waitCauses.length ? run.waitCauses.map(cause => causeLabel[cause]).join(', ') : '—'}</td>
        </tr>)}</tbody></table></div>
      {runs.length > 100 && <p className="muted">Tabela pokazuje pierwsze 100 z {runs.length} wykonań. Podsumowanie obejmuje całą partię.</p>}
    </div>}
  </div>;
}
