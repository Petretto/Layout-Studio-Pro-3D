import {useState, useRef, useEffect} from 'react';
import type {DomainProjectV6} from '../../core/domainProject';
import type {WorkerScheduleResult, WorkerScheduleRun} from '../../core/workerSchedule';
import {startScheduleTask, type ScheduleProgress} from '../../core/scheduleTask';
import {matchingConcurrencyGroup} from '../../core/physicalConcurrency';

/** Inspect full operation spans, including pauses; transport is listed separately in the result. */
function simultaneousPeriods(runs: readonly WorkerScheduleRun[]) {
  const byJob = new Map<number, WorkerScheduleRun[]>();
  runs.forEach(run => {const job = byJob.get(run.job) ?? [];job.push(run);byJob.set(run.job, job);});
  const periods: {job: number; start: number; end: number; runs: WorkerScheduleRun[]}[] = [];
  for (const [job, jobRuns] of byJob) {
    const events = jobRuns.flatMap(run => [{at: run.startSeconds, start: true, run}, {at: run.endSeconds, start: false, run}])
      .sort((a, b) => a.at - b.at);
    const active = new Set<WorkerScheduleRun>();
    let index = 0;
    while (index < events.length) {
      const at = events[index].at;
      while (index < events.length && events[index].at === at) {
        const event = events[index++];if (event.start) active.add(event.run);else active.delete(event.run);
      }
      if (active.size > 1 && index < events.length) periods.push({job, start: at, end: events[index].at, runs: [...active]});
    }
  }
  return periods;
}

const causeLabel = {
  transport: 'oczekiwanie na transport montażu',
  workers: 'oczekiwanie na pracowników',
  station: 'oczekiwanie na kopię stanowiska',
  'same-job': 'inna operacja tej samej sztuki bez dopuszczenia równoległości',
  calendar: 'oczekiwanie na wspólne okno kalendarzy',
  equipment: 'oczekiwanie na wyposażenie',
  body: 'oczekiwanie na korpus w wymaganym miejscu',
} as const;

/** Read-only preview of the separate schema-6 schedule. Remount on draft changes to drop stale results. */
export function DomainWorkerSchedulePanel({project}: {project: DomainProjectV6}) {
  const [batch, setBatch] = useState(String(project.bodyRunInput?.jobs.length ?? 1));
  const [arrivalInterval, setArrivalInterval] = useState('');
  const [result, setResult] = useState<WorkerScheduleResult | null>(null);
  const [error, setError] = useState('');
  const [progress, setProgress] = useState<ScheduleProgress | null>(null);
  const [message, setMessage] = useState('');
  const cancelRef = useRef<(() => void) | null>(null);
  useEffect(() => () => {cancelRef.current?.();}, []);
  const cancel = () => {cancelRef.current?.();cancelRef.current = null;setProgress(null);setMessage('Anulowano obliczenia.');};
  const calculate = () => {
    cancelRef.current?.();
    setResult(null);
    setError('');
    setMessage('');
    try {
      const count = Number(batch);
      if (!Number.isSafeInteger(count) || count < 1 || count > 100) {
        throw new Error('Podgląd dopuszcza partię od 1 do 100 sztuk.');
      }
      setProgress({completed: 0, total: project.operations.length * count});
      cancelRef.current = startScheduleTask({project, batch: count, arrivalIntervalSeconds: Number(arrivalInterval)}, {
        progress: setProgress,
        result: value => {cancelRef.current = null;setProgress(null);setResult(value);},
        error: value => {cancelRef.current = null;setProgress(null);setError(value);},
      }, () => new Worker(new URL('../../core/schedule.worker.ts', import.meta.url), {type: 'module'}));
    } catch (failure) { setError((failure as Error).message); }
  };
  const runs = result?.runs ?? [];
  const totalWait = runs.reduce((sum, run) => sum + run.waitSeconds, 0);
  const concurrentPeriods = simultaneousPeriods(runs);
  return <div className="panel" aria-label="Harmonogram zespołu szkicu 6">
    <h3>Harmonogram zespołu — szkic 6</h3>
    <p className="muted">Podgląd wymaga zapisanego składu i wyborów operacji. Praca na korpusie wymaga ról wszystkich operacji oraz jawnych instancji i przypisań. Równoległość wymaga zapisanej grupy obejmującej wszystkie trwające czynności; wspólny korpus zachowuje jedną lokalizację. Przewóz wykorzystuje wpisany czas trasy i zajmuje cel od wyjazdu do końca pracy. {project.assemblyTransport ? 'Przewóz uwzględnia zapisane zasoby montażu; dojazdy i zadeklarowane powroty są osobnymi ruchami. Bufory pozostają poza zakresem.' : 'Brak kontraktu zasobów transportu — przewóz nie uwzględnia dostępności osób ani urządzeń transportowych. Bufory pozostają poza zakresem.'}</p>
    {!project.workerRunSelection && <p className="notice">Najpierw zapisz stały skład i wybory dla wszystkich operacji.</p>}
    <div className="form-grid">
      <label className="field">Liczba sztuk w podglądzie<input aria-label="Liczba sztuk szkicu 6"
        type="number" min="1" max="100" step="1" value={batch}
        onChange={event => {cancel();setMessage('');setBatch(event.target.value); setResult(null); setError('');}} /></label>
      <label className="field">Odstęp przybycia sztuk [s]<input aria-label="Odstęp przybycia szkicu 6 [s]"
        type="number" min="0.001" step="any" value={arrivalInterval}
        onChange={event => {cancel();setMessage('');setArrivalInterval(event.target.value); setResult(null); setError('');}} /></label>
    </div>
    <div className="toolbar"><button disabled={!project.workerRunSelection || !!progress} onClick={calculate}>Oblicz harmonogram szkicu 6</button>
      {progress && <button onClick={cancel}>Anuluj obliczenia szkicu 6</button>}</div>
    {progress && <div role="status" aria-label="Postęp obliczeń szkicu 6"><progress max={progress.total} value={progress.completed} /> {progress.completed} / {progress.total} zakończonych operacji. Obliczenia w tle.</div>}
    {message && <p role="status">{message}</p>}
    {error && <p className="error" role="alert">Nie obliczono harmonogramu: {error}</p>}
    {result && <div role="status" aria-label="Wynik harmonogramu szkicu 6">
      <p>{result.mode === 'calendar' ? 'Przebieg kalendarzowy' : 'Podgląd logiczny bez kalendarza'} · {result.jobs.length} szt. · {runs.length} wykonań · koniec ostatniej sztuki: {Math.max(...result.jobs.map(job => job.finish))} s · suma oczekiwania operacji: {totalWait} s.</p>
      <p className="muted">Przyczyna oczekiwania jest zapisana dla operacji, która musiała czekać. Przy kilku przyczynach w czasie oczekiwania pokazane są wszystkie.</p>
      <div className="table-wrap"><table><thead><tr><th>Sztuka</th><th>Operacja</th><th>Stanowisko / kopia</th><th>Pracownicy</th><th>Gotowa [s]</th><th>Start [s]</th><th>Koniec [s]</th><th>Oczekiwanie [s]</th><th>Przyczyna</th></tr></thead>
        <tbody>{runs.slice(0, 100).map(run => <tr key={`${run.job}:${run.operationId}`}>
          <td>{run.job}</td><td>{run.operationId}</td><td>{run.stationId} / {run.copy}</td>
          <td>{run.workerIds.join(', ')}
            {run.bodyId && <div>Korpus: {run.bodyId} · cel zarezerwowany [s]: {run.stationReserveStartSeconds}–{run.endSeconds}</div>}
            {project.operations.find(operation => operation.id === run.operationId)?.physicalRole?.kind === 'subassembly-preparation' && <div>Przygotowanie podzespołów — bez zajęcia korpusu</div>}
            {run.transport?.workerIds && <div>Osoby transportu: {run.transport.workerIds.join(', ') || 'jawnie bez osób'} · urządzenia: {run.transport.equipmentIds?.join(', ') || 'jawnie bez urządzeń'}</div>}
            {run.transport && <div>Transport korpusu: {run.transport.routeId} · {run.transport.startSeconds}–{run.transport.endSeconds} s · {run.transport.basis === 'measured' ? 'zmierzony' : 'założony'}</div>}
            {run.equipmentIds && <div>Wyposażenie: {run.equipmentIds.length ? run.equipmentIds.join(', ') : 'jawnie bez wymagań'}</div>}
            {run.selectionRouteId && <div>Planowana następna trasa: {run.selectionRouteId} · {run.selectionDistanceMm} mm</div>}
            {run.arrivalRouteId && <div>Wybrana trasa z poprzedniej operacji: {run.arrivalRouteId} · {run.arrivalDistanceMm} mm</div>}
          </td><td>{run.readySeconds}</td><td>{run.startSeconds}</td>
          <td>{run.endSeconds}</td><td>{run.waitSeconds}</td>
          <td>{run.waitCauses.length ? run.waitCauses.map(cause => causeLabel[cause]).join(', ') : '—'}
            {result.mode === 'calendar' && <div>Praca [s]: {run.workWindows.map(window => `${window.startSeconds}–${window.endSeconds}`).join(', ')}<br />
              Pauzy [s]: {run.pauses.length ? run.pauses.map(window => `${window.startSeconds}–${window.endSeconds}`).join(', ') : 'brak'}<br />
              Rezerwacja osób [s]: {run.reserveStartSeconds}–{run.reserveEndSeconds}</div>}
          </td>
        </tr>)}</tbody></table></div>
      {runs.length > 100 && <p className="muted">Tabela pokazuje pierwsze 100 z {runs.length} wykonań. Podsumowanie obejmuje całą partię.</p>}
      <details aria-label="Inspekcja równoległości przebiegu"><summary>Równoległość na jednej sztuce ({concurrentPeriods.length} przedziałów)</summary>
        <p className="muted">Przedziały od startu do końca operacji obejmują także pauzy. Cały zestaw porównano z jedną zapisaną grupą. Dopuszczenie nie znosi zależności ani wyłączności zasobów; transport i rezerwacje przed startem pokazano w tabeli przebiegu.</p>
        {!concurrentPeriods.length && <p>Brak równocześnie trwających operacji na jednej sztuce. Przyczyny oczekiwania znajdują się w tabeli przebiegu.</p>}
        {!!concurrentPeriods.length && <div className="table-wrap"><table><thead><tr><th>Sztuka</th><th>Przedział [s]</th><th>Cały zestaw operacji</th><th>Grupa dopuszczająca</th><th>Miejsca i zasoby</th></tr></thead>
          <tbody>{concurrentPeriods.slice(0, 100).map((period, index) => <tr key={index}>
            <td>{period.job}</td><td>{period.start}–{period.end}</td><td>{period.runs.map(run => run.operationId).join(', ')}</td>
            <td>{matchingConcurrencyGroup(project.physicalConcurrency, period.runs.map(run => run.operationId)) ?? 'Brak grupy obejmującej cały zestaw'}</td>
            <td>{period.runs.map(run => <div key={run.operationId}>{run.operationId}: {run.bodyId ? `korpus ${run.bodyId}` : 'bez zajęcia korpusu'} · {run.stationId} / {run.copy} · osoby: {run.workerIds.join(', ')}{run.equipmentIds && ` · wyposażenie: ${run.equipmentIds.join(', ') || 'bez wymagań'}`}</div>)}</td>
          </tr>)}</tbody></table></div>}
        {concurrentPeriods.length > 100 && <p>Pokazano pierwsze 100 z {concurrentPeriods.length} przedziałów.</p>}
      </details>
      {result.transportMovements && <details aria-label="Inspekcja ruchów transportu montażu"><summary>Ruchy transportu montażu ({result.transportMovements.length})</summary>
        <p>Dojazd i powrót przemieszczają urządzenie bez korpusu. Przydziały osób są wspólne z montażem. Koniec produkcji i koniec powrotu urządzenia mogą mieć różne czasy.</p>
        <div className="table-wrap"><table><thead><tr><th>Ruch</th><th>Trasa</th><th>Przedział [s]</th><th>Osoby</th><th>Urządzenia</th></tr></thead>
          <tbody>{result.transportMovements.slice(0,100).map((movement,index)=><tr key={index}>
            <td>{movement.purpose==='approach'?'Dojazd bez ładunku':movement.purpose==='return'?'Powrót bez ładunku':'Przewóz korpusu'}</td>
            <td>{movement.routeId}</td><td>{movement.startSeconds}–{movement.endSeconds}</td>
            <td>{movement.workerIds.join(', ')||'jawnie bez osób'}</td><td>{movement.equipmentIds.join(', ')||'jawnie bez urządzeń'}</td>
          </tr>)}</tbody></table></div>
        {result.transportMovements.length>100&&<p>Pokazano pierwsze 100 ruchów.</p>}
        <p>Końcowe położenie wózków: {result.cartBook?.carts.map(c=>`${c.equipmentId}: ${c.location?`${c.location.stationId} / ${c.location.copy}`:'w ruchu'}`).join('; ')||'brak zadeklarowanych wózków'}.</p>
      </details>}
      {result.bodyBook && <div aria-label="Inspekcja korpusów przebiegu">
        <h4>Końcowe położenie korpusów</h4>
        <ul>{result.bodyBook.bodies.map(body => <li key={body.id}>{body.id} · {body.productId} · {body.status === 'available' ? 'dostępny' : body.status} · {body.location.kind === 'station' ? `${body.location.stationId} / ${body.location.copy}` : 'lokalizacja nieznana'}</li>)}</ul>
        <details><summary>Zdarzenia korpusów ({result.bodyEvents?.length ?? 0})</summary>
          <ol>{result.bodyEvents?.slice(0, 500).map((event, index) => <li key={index}>{event.atSeconds} s · {event.bodyId} · {
            event.kind === 'reserve' ? `zajęcie przez ${event.operationId} do ${event.endSeconds} s (${event.basis === 'confirmed' ? 'potwierdzony' : 'założony'})` :
            event.kind === 'release' ? `zwolnienie przez ${event.operationId}` :
            event.kind === 'start-transfer' ? `początek przewozu do ${event.to.stationId} / ${event.to.copy}, koniec ${event.endSeconds} s` :
            event.kind === 'finish-transfer' ? 'zakończenie przewozu' : 'ustalenie lokalizacji'
          }</li>)}</ol>
          {(result.bodyEvents?.length ?? 0) > 500 && <p>Pokazano pierwsze 500 zdarzeń.</p>}
        </details>
      </div>}
    </div>}
  </div>;
}
