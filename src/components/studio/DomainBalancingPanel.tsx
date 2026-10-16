import {useState} from 'react';
import type {DomainProjectV6} from '../../core/domainProject';
import {applyDomainBalance, proposeDomainBalance, type DomainBalanceResult} from '../../core/domainBalancing';

export function DomainBalancingPanel({project, onApply, onUndo, onRedo, canUndo, canRedo}: {
  project: DomainProjectV6; onApply: (project: DomainProjectV6) => boolean;
  onUndo: () => void; onRedo: () => void; canUndo: boolean; canRedo: boolean;
}) {
  const [target, setTarget] = useState(''), [algorithm, setAlgorithm] = useState<'RPW' | 'LCR'>('RPW');
  const [result, setResult] = useState<DomainBalanceResult | null>(null), [error, setError] = useState(''), [reviewed, setReviewed] = useState(false);
  const reset = () => {setResult(null); setReviewed(false); setError('');};
  const calculate = () => {
    reset();
    try {setResult(proposeDomainBalance(project, Number(target), algorithm));}
    catch (failure) {setError((failure as Error).message);}
  };
  const apply = () => {
    if (result?.kind !== 'proposal' || !reviewed) return;
    try {if (onApply(applyDomainBalance(project, result))) reset();}
    catch (failure) {setError((failure as Error).message);}
  };
  return <div className="panel" aria-label="Bilans zasobów szkicu 6">
    <h3>Bilans z wyposażeniem i kompetencjami</h3>
    <p className="muted">Propozycja korzysta wyłącznie z istniejących, jawnie dopuszczonych kopii i wybranych wariantów czasu obsady. Wymagane wyposażenie musi należeć do wskazanej kopii, a obsada musi łącznie pokrywać kompetencje. Nie powstają nowe stanowiska.</p>
    <p className="muted">Limit dotyczy sumy czasów technologicznych na kopię na jedną sztukę, bez dzielenia przez liczbę osób. Kolejność stanowisk w zapisanym rejestrze musi zachować poprzedników, jak przy ręcznym przypisaniu. To bilans statyczny; wynik nie potwierdza przepustowości ani dostępności czasowej osób i urządzeń. Po zatwierdzeniu sprawdź harmonogram z kalendarzami, transportem, buforami i zaopatrzeniem.</p>
    <div className="toolbar">
      <label className="field">Limit obciążenia kopii [s/szt.]<input aria-label="Limit obciążenia kopii szkicu 6 [s/szt.]" type="number" min="0" step="any" value={target} onChange={event => {setTarget(event.target.value); reset();}} /></label>
      <label className="field">Priorytet operacji<select aria-label="Algorytm bilansu szkicu 6" value={algorithm} onChange={event => {setAlgorithm(event.target.value as 'RPW' | 'LCR'); reset();}}><option value="RPW">RPW</option><option value="LCR">LCR</option></select></label>
      <button onClick={calculate}>Oblicz propozycję bilansu szkicu 6</button>
      <button disabled={!canUndo} onClick={onUndo}>Cofnij dane szkicu</button><button disabled={!canRedo} onClick={onRedo}>Ponów dane szkicu</button>
    </div>
    {error && <p className="error" role="alert">Nie obliczono lub nie zapisano bilansu: {error}</p>}
    {result && result.kind !== 'proposal' && <p className="notice" role="status">{result.message}</p>}
    {result?.kind === 'proposal' && <div aria-label="Propozycja bilansu szkicu 6">
      <h4>Propozycja — {result.algorithm}, limit {result.targetSeconds} s/szt.</h4>
      <div className="table-wrap"><table><thead><tr><th>Operacja</th><th>Stanowisko / kopia</th><th>Wymagane wyposażenie</th><th>Czas wybranego wariantu [s]</th></tr></thead><tbody>{result.assignments.map(item => {
        const operation = project.operations.find(operation => operation.id === item.operationId)!;
        const choice = project.workerRunSelection!.operations.find(choice => choice.operationId === item.operationId)!;
        const basis = operation.staffing!.timeVariants.find(variant => variant.workerCount === choice.workerCount)!.timeProfile.durationBasis;
        return <tr key={item.operationId}><td>{operation.name} · {item.operationId}{operation.lockedWorkstation ? ' · blokada stanowiska' : ''}</td>
          <td>{project.stations.find(station => station.id === item.stationId)!.name} · {item.stationId} / {item.copy}</td>
          <td>{item.requiredEquipmentIds.map(id => `${project.equipment.find(equipment => equipment.id === id)!.name} · ${id}`).join(', ') || 'Brak wymagań w dopuszczeniu'}</td>
          <td>{item.durationSeconds} · {choice.workerCount} osób · {basis === 'measured' ? 'pomiar' : 'założenie'}</td></tr>;
      })}</tbody></table></div>
      <div className="table-wrap"><table><thead><tr><th>Kopia</th><th>Suma czasów technologicznych [s/szt.]</th></tr></thead><tbody>{result.loads.map(item => <tr key={JSON.stringify([item.stationId, item.copy])}><td>{item.stationId} / {item.copy}</td><td>{item.seconds}</td></tr>)}</tbody></table></div>
      <p className="notice">Zatwierdzenie zmieni przypisania operacji w szkicu i ograniczy dopuszczenia każdej operacji do pokazanej kopii. Dotychczasowe alternatywy przywrócisz przez Cofnij. ID stanowisk, puste stanowiska, wyposażenie, geometria i zapisane trasy pozostaną zachowane. Wynik harmonogramu zostanie unieważniony.</p>
      <label><input type="checkbox" aria-label="Akceptuję przydziały i ograniczenie dopuszczeń szkicu 6" checked={reviewed} onChange={event => setReviewed(event.target.checked)} /> Sprawdziłem przypisania i akceptuję ograniczenie dopuszczeń do pokazanych kopii.</label>
      <div className="toolbar"><button disabled={!reviewed} onClick={apply}>Zatwierdź przydziały bilansu szkicu 6</button></div>
    </div>}
  </div>;
}
