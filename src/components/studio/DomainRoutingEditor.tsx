import {TransportTimingEditor} from './TransportTimingEditor';
import {useState} from 'react';
import {parseDomainProjectV6, type DomainProjectV6} from '../../core/domainProject';
import type {StationRoutingV6, StationCopyRef, DeclaredTransportRoute} from '../../core/stationRouting';

export function DomainRoutingEditor({project, onApply, onUndo, onRedo, canUndo, canRedo}: {
  project: DomainProjectV6; onApply: (routing: StationRoutingV6 | undefined) => boolean;
  onUndo: () => void; onRedo: () => void; canUndo: boolean; canRedo: boolean;
}) {
  const [routing, setRouting] = useState<StationRoutingV6>(() => structuredClone(project.stationRouting ?? {
    selectionRule: 'earliest-start-then-shortest-route', equipmentPlacements: [], operations: [], routes: [],
  }));
  const [confirmed, setConfirmed] = useState<boolean[]>(routing.routes.map(() => true));
  const [operationId, setOperationId] = useState('');
  const [error, setError] = useState('');
  const [dirty, setDirty] = useState(false);
  const update = (next: StationRoutingV6) => {setRouting(next); setDirty(true); setError('');};
  const emptyRef = (): StationCopyRef => ({stationId: '', copy: NaN});
  const refFields = (label: string, value: StationCopyRef, change: (value: StationCopyRef) => void) => <>
    <label className="field">{label} — stanowisko<select aria-label={`${label} stanowisko`} value={value.stationId}
      onChange={event => change({stationId: event.target.value, copy: NaN})}>
      <option value="">Wybierz stanowisko</option>{project.stations.map(station => <option key={station.id} value={station.id}>{station.name} · {station.id}</option>)}
    </select></label>
    <label className="field">{label} — kopia<input aria-label={`${label} kopia`} type="number" min="1" step="1"
      max={project.stationSettings[value.stationId]?.parallelStations} value={Number.isNaN(value.copy) ? '' : value.copy}
      onChange={event => change({...value, copy: event.target.value === '' ? NaN : Number(event.target.value)})} /></label>
  </>;
  const save = () => {
    try {
      if (confirmed.some(value => !value)) throw new Error('Potwierdź każdą wpisaną długość rzeczywistej trasy.');
      parseDomainProjectV6(JSON.stringify({...project, stationRouting: routing}));
      if (onApply(routing)) setDirty(false);
    } catch (failure) {setError((failure as Error).message);}
  };
  const operation = routing.operations.find(item => item.operationId === operationId);
  const setCandidates = (candidates: NonNullable<typeof operation>['candidates']) => update({...routing,
    operations: operation ? routing.operations.map(item => item.operationId === operationId ? {...item, candidates} : item) :
      [...routing.operations, {operationId, candidates}]});
  const changeRoute = (index: number, change: Partial<DeclaredTransportRoute>) => {
    update({...routing, routes: routing.routes.map((route, i) => i === index ? {...route, ...change} : route)});
    setConfirmed(confirmed.map((value, i) => i === index ? false : value));
  };
  return <div className="panel" aria-label="Dopuszczenia i trasy szkicu 6">
    <h3>Dopuszczalne stanowiska i rzeczywiste trasy — szkic 6</h3>
    <p className="muted">Najwcześniejszy start ma pierwszeństwo, krótsza rzeczywista trasa rozstrzyga remis. Podaj długość drogi uwzględniającej przejścia i przeszkody oraz źródło dla każdej pary dopuszczonych kopii kolejnych operacji. Dalsza trasa jest wybierana automatycznie w jednym ciągu operacji. Przewóz korpusu wymaga dodatkowo jawnego czasu trasy; cel jest zajęty od wyjazdu do końca operacji.</p>
    <p>{project.stationRouting ? `Zapisano dopuszczenia ${project.stationRouting.operations.length} z ${project.operations.length} operacji.` : 'Brak zapisanych dopuszczeń — obowiązuje dotychczasowe przypisanie bazowe.'} {dirty && 'Zmiany formularza nie są zapisane.'}</p>
    <div className="toolbar"><button disabled={!canUndo} onClick={onUndo}>Cofnij dane szkicu</button><button disabled={!canRedo} onClick={onRedo}>Ponów dane szkicu</button></div>
    <fieldset><legend>Stałe wyposażenie konkretnej kopii</legend>
      <p className="muted">Jeden egzemplarz może należeć do jednej kopii. Najpierw określ stanowisko i możliwości egzemplarza w edytorze wyposażenia.</p>
      {routing.equipmentPlacements.map((placement, index) => <div className="form-grid" key={index}>
        <label className="field">Egzemplarz<select aria-label={`Wyposażenie ${index + 1} egzemplarz`} value={placement.equipmentId}
          onChange={event => update({...routing, equipmentPlacements: routing.equipmentPlacements.map((item, i) => i === index ? {...item, equipmentId: event.target.value} : item)})}>
          <option value="">Wybierz wyposażenie</option>{project.equipment.map(item => <option key={item.id} value={item.id}>{item.name} · {item.id}</option>)}
        </select></label>
        {refFields(`Wyposażenie ${index + 1}`, placement, value => update({...routing, equipmentPlacements: routing.equipmentPlacements.map((item, i) => i === index ? {...item, ...value} : item)}))}
        <button onClick={() => update({...routing, equipmentPlacements: routing.equipmentPlacements.filter((_, i) => i !== index)})}>Usuń przypisanie {index + 1}</button>
      </div>)}
      <button onClick={() => update({...routing, equipmentPlacements: [...routing.equipmentPlacements, {...emptyRef(), equipmentId: ''}]})}>Dodaj przypisanie wyposażenia</button>
    </fieldset>
    <fieldset><legend>Dopuszczenia operacji</legend>
      <p className="muted">Kolejność kopii rozstrzyga dopiero remis czasu startu i długości drogi.</p>
      <label className="field">Operacja<select aria-label="Operacja dopuszczeń" value={operationId} onChange={event => setOperationId(event.target.value)}>
        <option value="">Wybierz operację</option>{project.operations.map(item => <option key={item.id} value={item.id}>{item.id} · {item.name} · {routing.operations.find(choice => choice.operationId === item.id) ? 'określono' : 'brak'}</option>)}
      </select></label>
      {operation?.candidates.map((candidate, index) => <div className="panel" key={index}>
        <div className="form-grid">{refFields(`Dopuszczenie ${index + 1}`, candidate, value => setCandidates(operation.candidates.map((item, i) => i === index ? {...item, ...value} : item)))}</div>
        <p>Wymagane egzemplarze: {candidate.requiredEquipmentIds.length ? candidate.requiredEquipmentIds.join(', ') : 'jawnie bez wymagań wyposażenia'}.</p>
        {project.equipment.map(item => <label className="toolbar" key={item.id}><input type="checkbox" aria-label={`Dopuszczenie ${index + 1} wymaga ${item.id}`}
          checked={candidate.requiredEquipmentIds.includes(item.id)} onChange={event => setCandidates(operation.candidates.map((choice, i) => i !== index ? choice : {...choice,
            requiredEquipmentIds: event.target.checked ? [...choice.requiredEquipmentIds, item.id] : choice.requiredEquipmentIds.filter(id => id !== item.id)}))} />{item.name} · {item.id}</label>)}
        <button onClick={() => setCandidates(operation.candidates.filter((_, i) => i !== index))}>Usuń dopuszczenie {index + 1}</button>
        <button disabled={index === 0} onClick={() => {
          const candidates = [...operation.candidates];
          [candidates[index - 1], candidates[index]] = [candidates[index], candidates[index - 1]];
          setCandidates(candidates);
        }}>Przesuń dopuszczenie {index + 1} wyżej</button>
      </div>)}
      <button disabled={!operationId} onClick={() => setCandidates([...(operation?.candidates ?? []), {...emptyRef(), requiredEquipmentIds: []}])}>Dodaj dopuszczoną kopię</button>
      {operation && <button onClick={() => update({...routing, operations: routing.operations.filter(item => item.operationId !== operationId)})}>Usuń dopuszczenia operacji</button>}
    </fieldset>
    <fieldset><legend>Skierowane rzeczywiste trasy transportowe</legend>
      {routing.routes.map((route, index) => <div className="panel" key={index}>
        <div className="form-grid">
          <label className="field">ID trasy<input aria-label={`Trasa ${index + 1} ID`} value={route.id} onChange={event => changeRoute(index, {id: event.target.value})} /></label>
          {refFields(`Trasa ${index + 1} początek`, route.from, from => changeRoute(index, {from}))}
          {refFields(`Trasa ${index + 1} koniec`, route.to, to => changeRoute(index, {to}))}
          <label className="field">Długość rzeczywistej drogi [mm]<input aria-label={`Trasa ${index + 1} długość [mm]`} type="number" min="0" step="any" value={Number.isNaN(route.distanceMm) ? '' : route.distanceMm}
            onChange={event => changeRoute(index, {distanceMm: event.target.value === '' ? NaN : Number(event.target.value)})} /></label>
          <label className="field">Źródło długości<input aria-label={`Trasa ${index + 1} źródło`} value={route.source} onChange={event => changeRoute(index, {source: event.target.value})} /></label>
        </div>
        <TransportTimingEditor label={`Trasa ${index + 1}`} route={route} onChange={timing => {
          const {transportTime, transportCalculation, ...base} = route;
          update({...routing, routes: routing.routes.map((item, i) => i === index ? {...base, ...timing} : item)});
        }}/>
        <label className="toolbar"><input type="checkbox" aria-label={`Trasa ${index + 1} potwierdzona`} checked={confirmed[index]}
          onChange={event => {setConfirmed(confirmed.map((value, i) => i === index ? event.target.checked : value)); setDirty(true); setError('');}} />Potwierdzam długość rzeczywistej trasy według wskazanego źródła.</label>
        <button onClick={() => {update({...routing, routes: routing.routes.filter((_, i) => i !== index)}); setConfirmed(confirmed.filter((_, i) => i !== index));}}>Usuń trasę {index + 1}</button>
      </div>)}
      <button onClick={() => {update({...routing, routes: [...routing.routes, {id: '', from: emptyRef(), to: emptyRef(), distanceMm: NaN, basis: 'confirmed', source: ''}]});setConfirmed([...confirmed, false]);}}>Dodaj rzeczywistą trasę</button>
    </fieldset>
    <div className="toolbar"><button onClick={save}>Zapisz dopuszczenia i trasy</button>
      <button disabled={!project.stationRouting} onClick={() => onApply(undefined)}>Usuń dopuszczenia i trasy — przypisanie bazowe</button></div>
    {error && <p className="error" role="alert">Nie zapisano dopuszczeń: {error}</p>}
  </div>;
}

