import {useMemo} from 'react';
import type {DomainProjectV6} from '../../core/domainProject';
import type {WorkerScheduleResult} from '../../core/workerSchedule';
import {explainThroughput} from '../../core/throughputExplanation';

export function ThroughputExplanationPanel({project, result, onSelectOperation}: {
  project: DomainProjectV6; result: WorkerScheduleResult; onSelectOperation: (id: string, job: number) => void;
}) {
  const report=useMemo(()=>explainThroughput(result),[result]);
  const metricLabel={processing:'Suma pracy technologicznej netto',workers:'Czas działań',transport:'Suma czasów ruchów',blocking:'Suma blokad po pracy',material:'Czas działań',calendar:'Suma przerw podczas realizacji',other:'Suma lokalnego oczekiwania'};
  const busiest=report.processingByCopy[0];
  const basisLabel=(operationId:string)=>{
    const count=project.workerRunSelection?.operations.find(item=>item.operationId===operationId)?.workerCount;
    const basis=project.operations.find(item=>item.id===operationId)?.staffing?.timeVariants.find(item=>item.workerCount===count)?.timeProfile.durationBasis;
    return basis==='measured'?'pomiar':basis==='assumed'?'założenie':'brak danych';
  };
  return <section className="panel" aria-label="Wyjaśnienie ograniczeń przepustowości">
    <h4>Co ogranicza przebieg — dowody z harmonogramu</h4>
    <p>Horyzont: 0–{report.horizonSeconds} s · {result.jobs.length} ukończonych sztuk. Obserwacje wskazują, co zajmowało zasoby lub opóźniało wykonania. Potwierdzenie wpływu zmiany na przepustowość wymaga porównania przebiegów przy tych samych warunkach.</p>
    {result.transportMode==='just-in-time' && <p className="notice">JIT: transport i dostępność materiału są założone. Brak oczekiwania na materiał lub transport nie potwierdza braku tych ograniczeń w rzeczywistym procesie.</p>}
    <p className="muted">Czasy są sumami dla wykonań lub ruchów, które mogą zachodzić równocześnie. Nie sumuj kategorii do czasu partii ani nie traktuj ich jako możliwego skrócenia partii. Nie wyznaczamy jednej głównej przyczyny z największej sumy.</p>
    <p>Oczekiwanie z kilkoma zapisanymi przyczynami: <strong>{report.mixedWaitSeconds} s</strong> — bez podziału na przyczyny. Oczekiwanie bez zapisanej przyczyny: <strong>{report.unclassifiedWaitSeconds} s</strong>.</p>
    {busiest && <p>Najdłużej pracująca kopia (netto, suma rozłącznych przedziałów): <strong>{busiest.stationId} / {busiest.copy}</strong> · {busiest.seconds} s / {report.horizonSeconds} s = {(busiest.share*100).toFixed(1)}%. To kandydat do analizy obciążenia, nie potwierdzone wąskie gardło. Przy remisie tabela pokazuje wszystkie kopie.</p>}
    <div className="table-wrap"><table><thead><tr><th>Kopia</th><th>Praca netto bez podwójnego naliczania [s]</th></tr></thead><tbody>{report.processingByCopy.map(copy=><tr key={JSON.stringify([copy.stationId,copy.copy])}><td>{copy.stationId} / {copy.copy}</td><td>{copy.seconds}</td></tr>)}</tbody></table></div>
    {report.signals.map(signal=><details key={signal.category} aria-label={`Ograniczenie ${signal.category}`}>
      <summary>{signal.label} · oczekiwania z jedną zapisaną przyczyną: {signal.singleCauseWaitSeconds} s · wykonania z mieszanymi przyczynami: {signal.mixedWaitCount}</summary>
      <p>{signal.explanation}</p>
      {signal.workSeconds>0 && <p>{metricLabel[signal.category]}: <strong>{signal.workSeconds} s</strong>{signal.category==='transport'?` · ${report.transportCount} ruchów`:''}.</p>}
      {!signal.evidence.length && signal.workSeconds===0 && <p>Brak zarejestrowanego sygnału tej kategorii w tym przebiegu.</p>}
      <p><strong>Co sprawdzić:</strong> {signal.nextStep}</p>
      {!!signal.evidence.length && <div className="table-wrap"><table><thead><tr><th>Wykonanie</th><th>Kopia</th><th>Zaobserwowano</th><th>Czas obserwacji [s]</th><th>Inspekcja</th></tr></thead><tbody>{signal.evidence.slice(0,50).map((item,index)=><tr key={index}>
        <td>{item.job} · {item.operationId}<small>Źródło czasu operacji: {basisLabel(item.operationId)}</small></td><td>{item.stationId} / {item.copy}</td><td>{item.detail}</td><td>{item.seconds}{item.mixed?' (całe oczekiwanie; udział przyczyny nieznany)':''}</td>
        <td><button onClick={()=>onSelectOperation(item.operationId,item.job)}>Pokaż wykonanie {item.job} · {item.operationId}</button></td>
      </tr>)}</tbody></table></div>}
      {signal.evidence.length>50&&<p>Pokazano 50 z {signal.evidence.length} obserwacji; podsumowanie obejmuje wszystkie wykonania.</p>}
    </details>)}
  </section>;
}
