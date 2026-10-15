import {useState, useRef, useEffect} from 'react';
import type {DomainProjectV6} from '../../core/domainProject';
import type {WorkerScheduleResult, WorkerScheduleRun} from '../../core/workerSchedule';
import {startScheduleTask, type ScheduleProgress} from '../../core/scheduleTask';
import {matchingConcurrencyGroup} from '../../core/physicalConcurrency';
import {calculateScheduleStateMetrics} from '../../core/scheduleStateMetrics';

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
  buffer: 'oczekiwanie na miejsce w buforze',
  material: 'oczekiwanie na materiał',
  subassembly: 'oczekiwanie na wytworzenie lub dostarczenie podzespołu',
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
  const [justInTime,setJustInTime]=useState(false);
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
      cancelRef.current = startScheduleTask({project, batch: count, arrivalIntervalSeconds: Number(arrivalInterval),transportMode:justInTime?'just-in-time':'configured'}, {
        progress: setProgress,
        result: value => {cancelRef.current = null;setProgress(null);setResult(value);},
        error: value => {cancelRef.current = null;setProgress(null);setError(value);},
      }, () => new Worker(new URL('../../core/schedule.worker.ts', import.meta.url), {type: 'module'}));
    } catch (failure) { setError((failure as Error).message); }
  };
  const runs = result?.runs ?? [];
  const totalWait = runs.reduce((sum, run) => sum + run.waitSeconds, 0);
  const concurrentPeriods = simultaneousPeriods(runs);
  const stateMetrics = result ? calculateScheduleStateMetrics(project, result) : null;
  return <div className="panel" aria-label="Harmonogram zespołu szkicu 6">
    <h3>Harmonogram zespołu — szkic 6</h3>
    <p className="muted">Podgląd wymaga zapisanego składu i wyborów operacji. Równoległość wymaga zapisanej grupy obejmującej wszystkie trwające czynności.</p>
    {!justInTime&&<p className="muted">Praca na korpusie wymaga ról wszystkich operacji oraz jawnych instancji i przypisań; wspólny korpus zachowuje jedną lokalizację. Przewóz wykorzystuje wpisany czas trasy i zajmuje cel od wyjazdu do końca pracy. {project.assemblyTransport ? 'Przewóz uwzględnia zapisane zasoby montażu; dojazdy i zadeklarowane powroty są osobnymi ruchami. Bufory pozostają poza zakresem.' : 'Brak kontraktu zasobów transportu — przewóz nie uwzględnia dostępności osób ani urządzeń transportowych. Bufory pozostają poza zakresem.'}</p>}
    <label className="toolbar"><input type="checkbox" aria-label="Symulacja bez transportu — just in time" checked={justInTime}
      onChange={e=>{cancel();setMessage('');setJustInTime(e.target.checked);setResult(null);setError('');}}/>Symulacja bez transportu — wszystko dostępne just in time</label>
    {justInTime&&<p className="notice">Włączono symulację samego procesu: bez czasów, tras i zasobów transportu oraz śledzenia fizycznych lokalizacji korpusów. Zachowane są zależności operacji, pracownicy, stanowiska, wyposażenie operacji i ich kalendarze. Dostępność materiałów jest założona. Opcja dotyczy tego podglądu i nie zmienia zapisanej konfiguracji.</p>}
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
      {result.transportMode==='just-in-time'&&<p aria-label="Tryb transportu wyniku">JUST IN TIME — symulacja procesu bez transportu; dostępność materiałów założona, fizyczne lokalizacje korpusów nie są obliczane.</p>}
      <p>{result.mode === 'calendar' ? 'Przebieg kalendarzowy' : 'Podgląd logiczny bez kalendarza'} · {result.jobs.length} szt. · {runs.length} wykonań · koniec ostatniej sztuki: {Math.max(...result.jobs.map(job => job.finish))} s · suma oczekiwania operacji: {totalWait} s.</p>
      {stateMetrics && <div className="state-metrics-summary" aria-label="Podsumowanie stanów procesu i czasów trwania">
        <h4>Stany procesu i czasy trwania</h4>
        <div className="metrics">
          <div className="metric">
            <span>Czas partii (makespan)</span>
            <strong>{stateMetrics.makespanSeconds} s</strong>
            <small>Koniec ostatniej sztuki</small>
          </div>
          <div className="metric">
            <span>Czas pracy operacji</span>
            <strong>{stateMetrics.totalWorkSeconds} s</strong>
            <small>Suma czasów trwania operacji</small>
          </div>
          <div className="metric">
            <span>Czas oczekiwania</span>
            <strong>{stateMetrics.totalWaitSeconds} s</strong>
            <small>Suma opóźnień przed startem</small>
          </div>
          <div className="metric">
            <span>Blokady i oczekiwanie</span>
            <strong>{Math.round((stateMetrics.totalBlockedSeconds + stateMetrics.totalContinuationWaitSeconds) * 1000) / 1000} s</strong>
            <small>Blokady wyjścia: {stateMetrics.totalBlockedSeconds} s · lokalne: {stateMetrics.totalContinuationWaitSeconds} s</small>
          </div>
          <div className="metric">
            <span>Transport montażu</span>
            <strong>{stateMetrics.transportMetrics.totalTransportDurationSeconds} s</strong>
            <small>Ruchów: {stateMetrics.transportMetrics.totalMovementsCount} · przewozy: {stateMetrics.transportMetrics.transferTimeSeconds} s</small>
          </div>
        </div>
        <div className="notice" aria-label="Zestawienie przyczyn oczekiwania">
          <strong>Rozbicie przyczyn oczekiwania operacji (partycjonowane, suma: {stateMetrics.totalWaitSeconds} s):</strong>
          <ul style={{margin: '6px 0 0 16px', padding: 0}}>
            <li>Pracownicy (brak dostępności osób): <strong>{stateMetrics.waitBreakdownPartitioned.workers} s</strong>{stateMetrics.waitBreakdownPresence.workers !== stateMetrics.waitBreakdownPartitioned.workers && <span className="muted"> (wystąpiło przy {stateMetrics.waitBreakdownPresence.workers} s oczekiwań)</span>}</li>
            <li>Materiały i podzespoły (brak zapasu/partii): <strong>{stateMetrics.waitBreakdownPartitioned.material} s</strong>{stateMetrics.waitBreakdownPresence.material !== stateMetrics.waitBreakdownPartitioned.material && <span className="muted"> (wystąpiło przy {stateMetrics.waitBreakdownPresence.material} s oczekiwań)</span>}</li>
            <li>Transport montażu (dojazdy/dostępność wózków): <strong>{stateMetrics.waitBreakdownPartitioned.transport} s</strong>{stateMetrics.waitBreakdownPresence.transport !== stateMetrics.waitBreakdownPartitioned.transport && <span className="muted"> (wystąpiło przy {stateMetrics.waitBreakdownPresence.transport} s oczekiwań)</span>}</li>
            <li>Bufory (brak miejsca na wyjściu/wejściu): <strong>{stateMetrics.waitBreakdownPartitioned.buffer} s</strong>{stateMetrics.waitBreakdownPresence.buffer !== stateMetrics.waitBreakdownPartitioned.buffer && <span className="muted"> (wystąpiło przy {stateMetrics.waitBreakdownPresence.buffer} s oczekiwań)</span>}</li>
            <li>Stanowiska, korpusy i wyposażenie: <strong>{stateMetrics.waitBreakdownPartitioned.station} s</strong>{stateMetrics.waitBreakdownPresence.station !== stateMetrics.waitBreakdownPartitioned.station && <span className="muted"> (wystąpiło przy {stateMetrics.waitBreakdownPresence.station} s oczekiwań)</span>}</li>
            <li>Kalendarz (brak wspólnego okna pracy): <strong>{stateMetrics.waitBreakdownPartitioned.calendar} s</strong>{stateMetrics.waitBreakdownPresence.calendar !== stateMetrics.waitBreakdownPartitioned.calendar && <span className="muted"> (wystąpiło przy {stateMetrics.waitBreakdownPresence.calendar} s oczekiwań)</span>}</li>
          </ul>
          {stateMetrics.transportMetrics.totalMovementsCount > 0 && <div style={{marginTop: '8px'}}>
            <strong>Struktura transportu montażu:</strong> przewozy z ładunkiem: {stateMetrics.transportMetrics.transferTimeSeconds} s · dojazdy bez ładunku: {stateMetrics.transportMetrics.approachTimeSeconds} s · powroty bez ładunku: {stateMetrics.transportMetrics.returnTimeSeconds} s.
          </div>}
        </div>
      </div>}
      <p className="muted">Przyczyna oczekiwania jest zapisana dla operacji, która musiała czekać. Przy kilku przyczynach w czasie oczekiwania pokazane są wszystkie.</p>
      <div className="table-wrap"><table><thead><tr><th>Sztuka</th><th>Operacja</th><th>Stanowisko / kopia</th><th>Pracownicy</th><th>Gotowa [s]</th><th>Start [s]</th><th>Koniec [s]</th><th>Czas pracy [s]</th><th>Oczekiwanie [s]</th><th>Blokada [s]</th><th>Przyczyna</th></tr></thead>
        <tbody>{runs.slice(0, 100).map(run => <tr key={`${run.job}:${run.operationId}`}>
          <td>{run.job}</td><td>{run.operationId}</td><td>{run.stationId} / {run.copy}</td>
          <td>{run.workerIds.join(', ')}
            {run.stationReleaseSeconds!==undefined&&<div>{run.continuationWaitSeconds!==undefined?`Przekazanie do kolejnej operacji: ${run.stationReleaseSeconds} s · oczekiwanie lokalne: ${run.continuationWaitSeconds} s`:`Zwolnienie stanowiska: ${run.stationReleaseSeconds} s · blokada po pracy: ${run.blockedSeconds} s`}</div>}
            {run.bodyId && <div>Korpus: {run.bodyId} · cel zarezerwowany [s]: {run.stationReserveStartSeconds??run.startSeconds}–{run.stationReleaseSeconds??run.endSeconds}</div>}
            {project.operations.find(operation => operation.id === run.operationId)?.physicalRole?.kind === 'subassembly-preparation' && <div>Przygotowanie podzespołów — bez zajęcia korpusu</div>}
            {run.transport?.workerIds && <div>Osoby transportu: {run.transport.workerIds.join(', ') || 'jawnie bez osób'} · urządzenia: {run.transport.equipmentIds?.join(', ') || 'jawnie bez urządzeń'}</div>}
            {run.transport && <div>Transport korpusu: {run.transport.routeId} · {run.transport.startSeconds}–{run.transport.endSeconds} s · {run.transport.basis === 'measured' ? 'zmierzony' : 'założony'}</div>}
            {run.equipmentIds && <div>Wyposażenie: {run.equipmentIds.length ? run.equipmentIds.join(', ') : 'jawnie bez wymagań'}</div>}
            {run.selectionRouteId && <div>Planowana następna trasa: {run.selectionRouteId} · {run.selectionDistanceMm} mm</div>}
            {run.arrivalRouteId && <div>Wybrana trasa z poprzedniej operacji: {run.arrivalRouteId} · {run.arrivalDistanceMm} mm</div>}
          </td><td>{run.readySeconds}</td><td>{run.startSeconds}</td>
          <td>{run.endSeconds}</td>
          <td>{Math.round((run.endSeconds - run.startSeconds) * 1000) / 1000}{run.pauses.length > 0 && <div><small>netto: {Math.round(run.workWindows.reduce((s, w) => s + (w.endSeconds - w.startSeconds), 0) * 1000) / 1000} s</small></div>}</td>
          <td>{run.waitSeconds}</td>
          <td>{run.blockedSeconds ? `${run.blockedSeconds} s` : run.continuationWaitSeconds !== undefined ? `${run.continuationWaitSeconds} s (lokalne)` : '—'}</td>
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
            <td>{movement.purpose==='approach'?'Dojazd bez ładunku':movement.purpose==='return'?'Powrót bez ładunku':movement.lotId?'Przewóz podzespołu':'Przewóz korpusu'}{movement.lotId&&` · partia ${movement.lotId}`}</td>
            <td>{movement.routeId}</td><td>{movement.startSeconds}–{movement.endSeconds}</td>
            <td>{movement.workerIds.join(', ')||(project.assemblyTransport?'jawnie bez osób':'zasoby nie modelowane')}</td><td>{movement.equipmentIds.join(', ')||(project.assemblyTransport?'jawnie bez urządzeń':'zasoby nie modelowane')}</td>
          </tr>)}</tbody></table></div>
        {result.transportMovements.length>100&&<p>Pokazano pierwsze 100 ruchów.</p>}
        <p>Końcowe położenie wózków: {result.cartBook?.carts.map(c=>`${c.equipmentId}: ${c.location?`${c.location.stationId} / ${c.location.copy}`:'w ruchu'}`).join('; ')||'brak zadeklarowanych wózków'}.</p>
      </details>}
      {result.bufferBook&&<details aria-label={result.transportMode==='just-in-time'?'Inspekcja buforów procesu JIT':'Inspekcja buforów i transportu'}><summary>Bufory i zwalnianie stanowisk</summary>
        <p>{result.transportMode==='just-in-time'?'Podgląd logiczny JIT: jeden ciąg operacji i jedna kopia dla każdej operacji, bez fizycznego transportu. Pojemność 0 wymaga gotowej operacji do przekazania bez oczekiwania.':'Przebieg fizyczny: jeden ciąg operacji i jedna kopia dla każdej operacji. Miejsce docelowe jest rezerwowane przed wyjazdem, a wejście zwalnia się przy starcie operacji. Przy wejściu 0 zasoby odbiorcy są rezerwowane przed wyjazdem, a operacja rusza dokładnie przy przyjeździe. Przy wyjściu 0 korpus pozostaje na stanowisku do wyjazdu.'} Zakończenie pracy i zwolnienie stanowiska są odrębne. Kolejne operacje tej samej kopii zachowują korpus na stanowisku; bufory dotyczą wyjścia do innej kopii.</p>
        <ol>{result.bufferEvents?.slice(0,500).map((event,index)=><li key={index}>{event.atSeconds} s · sztuka {event.job} · {event.stationId} / {event.copy} · {event.kind==='local-wait'?'Korpus pozostaje na stanowisku':event.kind==='local-start'?'Kontynuacja na tej samej kopii':event.kind==='blocked'?'Blokada po zakończeniu':event.kind==='released'?'Zwolnienie stanowiska':event.kind==='handoff'?(result.transportMode==='just-in-time'?'Przekazanie bez transportu':'Przekazanie bez oczekiwania'):event.kind==='input'?'Bufor wejściowy':'Bufor wyjściowy'}</li>)}</ol>
        {(result.bufferEvents?.length??0)>500&&<p>Pokazano pierwsze 500 zdarzeń.</p>}
      </details>}
      {result.materialStocks&&<details aria-label="Inspekcja zapasów materiałowych"><summary>Zaopatrzenie i zapas materiałów ({result.materialStocks.length})</summary>
        <p>Zapas przy zadeklarowanym stanowisku jest wspólny dla jego kopii. Pobranie następuje przy faktycznym starcie operacji; dostawa w tym samym czasie jest obsługiwana wcześniej. Nie liczymy pracy magazynierów ani pojemności składowania. Stan obejmuje dostawy do końca produkcji.</p>
        <div className="table-wrap"><table><thead><tr><th>Zaopatrzenie / materiał</th><th>Stanowisko</th><th>Jednostka</th><th>Zapas początkowy</th><th>Dostarczono</th><th>Pobrano</th><th>Zapas końcowy</th></tr></thead>
          <tbody>{result.materialStocks.slice(0,100).map(stock=><tr key={stock.supplyId}><td>{stock.supplyId} / {stock.componentId}</td><td>{stock.stationId}</td><td>{stock.unit}</td><td>{stock.initialStock}</td><td>{stock.delivered}</td><td>{stock.consumed}</td><td>{stock.stock}</td></tr>)}</tbody></table></div>
        {result.materialStocks.length>100&&<p>Pokazano pierwsze 100 pozycji zapasu.</p>}
        <ol>{result.materialEvents?.slice(0,500).map((event,index)=><li key={index}>{event.atSeconds} s · {event.supplyId} · {event.kind==='consumption'?`Pobranie przez ${event.job}:${event.operationId}`:
          (event.deliveryCount??0)>1?`Dostawy cykliczne: ${event.deliveryCount}, od ${event.firstDeliverySeconds} do ${event.atSeconds} s`:'Dostawa'} · {event.quantity} {result.materialStocks!.find(stock=>stock.supplyId===event.supplyId)!.unit}</li>)}</ol>
        {(result.materialEvents?.length??0)>500&&<p>Pokazano pierwsze 500 zdarzeń lub grup dostaw. Dostawy cykliczne między zdarzeniami procesu są grupowane; ilości obejmują wszystkie terminy według zapisanego harmonogramu.</p>}
      </details>}
      {result.subassemblyLots&&<details aria-label="Inspekcja partii podzespołów"><summary>Partie podzespołów ({result.subassemblyLots.length})</summary>
        <p>Cała partia jest dostępna po zakończeniu przygotowania. Przypisana ilość jest pobierana przy starcie odbiorcy. Pojemność buforów i wykorzystanie pozostałej ilości nie są modelowane.</p>
        <ul>{result.subassemblyLots.slice(0,100).map(lot=><li key={lot.declaration.id}>{lot.declaration.id} · {lot.declaration.subassemblyId} · {lot.declaration.producer.job}:{lot.declaration.producer.operationId} → {lot.declaration.consumer.job}:{lot.declaration.consumer.operationId} · pobrano {lot.declaration.consumptionQuantity} / {lot.declaration.quantity} {lot.declaration.unit} · pozostało bez dalszego przypisania: {lot.remainingQuantity} {lot.declaration.unit}</li>)}</ul>
        {result.subassemblyLots.length>100&&<p>Pokazano pierwsze 100 partii.</p>}
        <ol>{result.subassemblyEvents?.slice(0,500).map((event,index)=><li key={index}>{event.atSeconds} s · {event.lotId} · {event.kind==='produced'?'Wytworzenie':event.kind==='start-transfer'?'Wyjazd':event.kind==='arrived'?'Przyjazd':'Pobranie'} · {event.location.stationId} / {event.location.copy} · {event.quantity} {result.subassemblyLots!.find(lot=>lot.declaration.id===event.lotId)!.declaration.unit}</li>)}</ol>
        {(result.subassemblyEvents?.length??0)>500&&<p>Pokazano pierwsze 500 zdarzeń.</p>}
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
      {stateMetrics && <details aria-label="Inspekcja wykorzystania i stanów stanowisk"><summary>Stany i wykorzystanie stanowisk ({stateMetrics.stations.length})</summary>
        <p className="muted">Zestawienie czasów przetwarzania, blokad po zakończeniu operacji (brak miejsca w buforze wyjściowym) oraz oczekiwania na lokalną kontynuację na tej samej kopii. Wskaźnik zajęcia uwzględnia łączny czas obecności korpusu na stanowisku w odniesieniu do czasu trwania partii.</p>
        <div className="table-wrap"><table><thead><tr><th>Stanowisko / kopia</th><th>Operacje</th><th>Przetwarzanie [s]</th><th>Blokada wyjścia [s]</th><th>Oczekiwanie lokalne [s]</th><th>Łączne zajęcie [s]</th><th>Bezczynność [s]</th><th>Wskaźnik zajęcia</th><th>Wskaźnik pracy</th></tr></thead>
          <tbody>{stateMetrics.stations.slice(0, 100).map(st => <tr key={`${st.stationId}:${st.copy}`}>
            <td>{st.stationName ? `${st.stationName} (${st.stationId})` : st.stationId} / kopia {st.copy}</td>
            <td>{st.operationsCount}</td>
            <td>{st.processingTimeSeconds}</td>
            <td>{st.blockedTimeSeconds}</td>
            <td>{st.continuationWaitTimeSeconds}</td>
            <td>{st.totalOccupiedTimeSeconds}</td>
            <td>{st.idleTimeSeconds}</td>
            <td>{(st.occupancyRatio * 100).toFixed(1)}%</td>
            <td>{(st.processingRatio * 100).toFixed(1)}%</td>
          </tr>)}</tbody></table></div>
        {stateMetrics.stations.length > 100 && <p className="muted">Pokazano pierwsze 100 stanowisk.</p>}
      </details>}
      {stateMetrics && <details aria-label="Inspekcja aktywności i stanów pracowników"><summary>Stany i aktywność pracowników ({stateMetrics.workers.length})</summary>
        <p className="muted">Zestawienie czasów montażu, transportu, przetrzymania w blokadzie bufora wyjściowego (polityka bbas ze wstrzymaniem operatora) oraz przerw kalendarzowych. Wskaźnik aktywności odnosi łączny czas zaangażowania do czasu trwania partii.</p>
        <div className="table-wrap"><table><thead><tr><th>Pracownik</th><th>Operacje</th><th>Montaż [s]</th><th>Transport [s]</th><th>Zatrzymanie w blokadzie [s]</th><th>Pauzy [s]</th><th>Łączny czas aktywny [s]</th><th>Bezczynność [s]</th><th>Wskaźnik aktywności</th></tr></thead>
          <tbody>{stateMetrics.workers.slice(0, 100).map(w => <tr key={w.workerId}>
            <td>{w.workerName ? `${w.workerName} (${w.workerId})` : w.workerId}</td>
            <td>{w.operationsCount}</td>
            <td>{w.workTimeSeconds}</td>
            <td>{w.transportTimeSeconds}</td>
            <td>{w.heldBlockTimeSeconds}</td>
            <td>{w.pauseTimeSeconds}</td>
            <td>{w.totalActiveTimeSeconds}</td>
            <td>{w.idleTimeSeconds}</td>
            <td>{(w.activityRatio * 100).toFixed(1)}%</td>
          </tr>)}</tbody></table></div>
        {stateMetrics.workers.length > 100 && <p className="muted">Pokazano pierwszych 100 pracowników.</p>}
      </details>}
    </div>}
  </div>;
}
