import {useState} from 'react';
import {parseDomainProjectV6, type DomainProjectV6} from '../../core/domainProject';
import type {DeclaredCalendarWindow, ResourceCalendarsV6} from '../../core/resourceCalendar';

export function DomainCalendarEditor({project, onApply, onUndo, onRedo, canUndo, canRedo}: {
  project: DomainProjectV6; onApply: (calendars: ResourceCalendarsV6 | undefined) => boolean;
  onUndo: () => void; onRedo: () => void; canUndo: boolean; canRedo: boolean;
}) {
  const [kind, setKind] = useState<'workers' | 'stations'>('workers');
  const [id, setId] = useState('');
  const [shifts, setShifts] = useState<DeclaredCalendarWindow[]>([]);
  const [breaks, setBreaks] = useState<DeclaredCalendarWindow[]>([]);
  const [error, setError] = useState('');
  const resources = kind === 'workers' ? project.workers : project.stations;
  const select = (nextKind: typeof kind, nextId: string) => {
    setKind(nextKind); setId(nextId); setError('');
    const saved = project.resourceCalendars?.[nextKind][nextId];
    setShifts(saved?.shifts ?? []); setBreaks(saved?.breaks ?? []);
  };
  const save = (remove = false) => {
    try {
      if (!id) throw new Error('Wybierz zasób.');
      const calendars = project.resourceCalendars ?? {workers: {}, stations: {}};
      const entries = {...calendars[kind]};
      if (remove) delete entries[id]; else entries[id] = {shifts, breaks};
      const next = {...calendars, [kind]: entries};
      parseDomainProjectV6(JSON.stringify({...project, resourceCalendars: next}));
      onApply(next);
    } catch (failure) {setError((failure as Error).message);}
  };
  const intervals = (label: string, rows: DeclaredCalendarWindow[], update: (rows: DeclaredCalendarWindow[]) => void) =>
    <fieldset><legend>{label} [s od początku przebiegu]</legend>
      {rows.map((row, index) => <div className="form-grid" key={index}>
        <label className="field">Początek<input aria-label={`${label} ${index + 1} początek`} type="number" min="0" step="any" value={Number.isNaN(row.startSeconds) ? '' : row.startSeconds}
          onChange={event => update(rows.map((item, i) => i === index ? {...item, startSeconds: event.target.value === '' ? NaN : Number(event.target.value)} : item))} /></label>
        <label className="field">Koniec<input aria-label={`${label} ${index + 1} koniec`} type="number" min="0" step="any" value={Number.isNaN(row.endSeconds) ? '' : row.endSeconds}
          onChange={event => update(rows.map((item, i) => i === index ? {...item, endSeconds: event.target.value === '' ? NaN : Number(event.target.value)} : item))} /></label>
        <label className="field">Pochodzenie<select aria-label={`${label} ${index + 1} pochodzenie`} value={row.basis}
          onChange={event => update(rows.map((item, i) => i === index ? {...item, basis: event.target.value as DeclaredCalendarWindow['basis']} : item))}>
          <option value="assumed">Założone</option><option value="confirmed">Potwierdzone</option></select></label>
        <button onClick={() => update(rows.filter((_, i) => i !== index))}>Usuń {label.toLowerCase()} {index + 1}</button>
      </div>)}
      <button onClick={() => update([...rows, {startSeconds: NaN, endSeconds: NaN, basis: 'assumed'}])}>Dodaj {label.toLowerCase()}</button>
    </fieldset>;
  return <div className="panel" aria-label="Kalendarze zasobów szkicu 6">
    <h3>Kalendarze zasobów — szkic 6</h3>
    <p className="muted">Podaj jawne zmiany i przerwy w kolejności czasu. Brak kalendarza nie oznacza ciągłej dostępności. Te same osoby i kopia stanowiska pozostają przypisane podczas pauzy. Edycja formularza wymaga zapisu.</p>
    <p>Zapisane kalendarze: {Object.keys(project.resourceCalendars?.workers ?? {}).length} osób, {Object.keys(project.resourceCalendars?.stations ?? {}).length} stanowisk. {project.resourceCalendars ? 'Tryb kalendarzowy.' : 'Podgląd logiczny bez kalendarzy.'}</p>
    <div className="toolbar"><button disabled={!canUndo} onClick={onUndo}>Cofnij dane szkicu</button><button disabled={!canRedo} onClick={onRedo}>Ponów dane szkicu</button></div>
    <label className="field">Rodzaj zasobu<select aria-label="Rodzaj zasobu kalendarza" value={kind} onChange={event => select(event.target.value as typeof kind, '')}><option value="workers">Pracownik</option><option value="stations">Stanowisko</option></select></label>
    <label className="field">Zasób<select aria-label="Zasób kalendarza" value={id} onChange={event => select(kind, event.target.value)}><option value="">Wybierz zasób</option>{resources.map(resource => <option key={resource.id} value={resource.id}>{resource.id} · {resource.name}{project.resourceCalendars?.[kind][resource.id] ? ' · zapisany' : ' · brak kalendarza'}</option>)}</select></label>
    {id && <>{intervals('Zmiana', shifts, setShifts)}{intervals('Przerwa', breaks, setBreaks)}</>}
    <div className="toolbar"><button disabled={!id} onClick={() => save()}>Zapisz kalendarz zasobu</button><button disabled={!id || !project.resourceCalendars?.[kind][id]} onClick={() => save(true)}>Usuń kalendarz zasobu</button></div>
    {project.resourceCalendars && <button onClick={() => onApply(undefined)}>Usuń wszystkie kalendarze — podgląd logiczny</button>}
    {error && <p className="error" role="alert">Nie zapisano kalendarza: {error}</p>}
  </div>;
}
