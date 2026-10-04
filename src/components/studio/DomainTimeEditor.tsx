import {useEffect, useState} from 'react';
import type {TimeUnit} from '../../core/models/types';
import type {DomainProjectV6, DomainTimeBasis, DomainTimeInterval, DomainTimeProfile} from '../../core/domainProject';
import type {DomainTimeChange} from '../../core/domainTimeEditing';
import {fromSeconds, toSeconds, formatTimeWithUnit, TIME_UNITS} from './Fields';

type Category = 'manualWork' | 'machineRun' | 'operatorPresence';
type EditableInterval = {startSeconds?: number; endSeconds?: number; basis: DomainTimeBasis | ''};
type EditableProfile = {
  durationSeconds?: number;
  durationBasis: DomainTimeBasis | '';
  manualWork: EditableInterval[];
  machineRun: EditableInterval[];
  operatorPresence: EditableInterval[];
};
const categories: {key: Category; label: string}[] = [
  {key: 'manualWork', label: 'Praca ręczna'},
  {key: 'machineRun', label: 'Praca maszyny'},
  {key: 'operatorPresence', label: 'Obecność operatora'},
];
const blank = (): EditableProfile => ({durationBasis: '', manualWork: [], machineRun: [], operatorPresence: []});
const editable = (profile?: DomainTimeProfile): EditableProfile => profile
  ? {durationSeconds: profile.durationSeconds, durationBasis: profile.durationBasis,
    manualWork: profile.manualWork.map(item => ({...item})), machineRun: profile.machineRun.map(item => ({...item})),
    operatorPresence: profile.operatorPresence.map(item => ({...item}))}
  : blank();

export function DomainTimeEditor({project, onApply, onUndo, onRedo, canUndo, canRedo}: {
  project: DomainProjectV6;
  onApply: (change: DomainTimeChange) => boolean;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
}) {
  const [selected, setSelected] = useState(project.operations[0]?.id ?? '');
  const [unit, setUnit] = useState<TimeUnit>(project.timeUnit ?? 's');
  const [form, setForm] = useState<EditableProfile>(() => editable(project.operations[0]?.timeProfile));
  const [error, setError] = useState('');
  const operation = project.operations.find(item => item.id === selected);
  useEffect(() => {
    setForm(editable(project.operations.find(item => item.id === selected)?.timeProfile));
    setError('');
  }, [project, selected]);

  const numeric = (value: string) => value.trim() === '' || !Number.isFinite(Number(value))
    ? undefined : toSeconds(Number(value), unit);
  const display = (seconds?: number) => seconds === undefined ? '' : String(fromSeconds(seconds, unit));
  const updateInterval = (category: Category, index: number, change: Partial<EditableInterval>) =>
    setForm(current => ({...current, [category]: current[category].map((item, i) => i === index ? {...item, ...change} : item)}));
  const complete = (items: EditableInterval[]): DomainTimeInterval[] | null => items.some(item =>
    item.startSeconds === undefined || item.endSeconds === undefined || !item.basis)
    ? null : items.map(item => ({startSeconds: item.startSeconds!, endSeconds: item.endSeconds!, basis: item.basis as DomainTimeBasis}));
  const save = () => {
    if (!operation) return;
    const manualWork = complete(form.manualWork);
    const machineRun = complete(form.machineRun);
    const operatorPresence = complete(form.operatorPresence);
    if (form.durationSeconds === undefined || !form.durationBasis || !manualWork || !machineRun || !operatorPresence) {
      setError('Uzupełnij czas całkowity, pochodzenie i wszystkie pola dodanych przedziałów.');
      return;
    }
    const profile: DomainTimeProfile = {durationSeconds: form.durationSeconds, durationBasis: form.durationBasis,
      manualWork, machineRun, operatorPresence};
    if (onApply({kind: 'set-time-profile', operationId: operation.id, profile})) setError('');
  };
  const intervalFields = ({key, label}: {key: Category; label: string}) =>
    <fieldset key={key} aria-label={label}>
      <legend>{label}</legend>
      {form[key].map((item, index) => <div className="toolbar" key={`${key}-${index}`}>
        <label className="field">Początek [{unit}]<input type="number" step="any" min="0"
          aria-label={`${label} początek ${index + 1}`} value={display(item.startSeconds)}
          onChange={event => updateInterval(key, index, {startSeconds: numeric(event.target.value)})} /></label>
        <label className="field">Koniec [{unit}]<input type="number" step="any" min="0"
          aria-label={`${label} koniec ${index + 1}`} value={display(item.endSeconds)}
          onChange={event => updateInterval(key, index, {endSeconds: numeric(event.target.value)})} /></label>
        <label className="field">Pochodzenie<select aria-label={`${label} pochodzenie ${index + 1}`}
          value={item.basis} onChange={event => updateInterval(key, index, {basis: event.target.value as EditableInterval['basis']})}>
          <option value="">Wybierz</option><option value="measured">Pomierzony</option><option value="assumed">Założony</option>
        </select></label>
        <button onClick={() => setForm(current => ({...current, [key]: current[key].filter((_, i) => i !== index)}))}>Usuń przedział {label.toLowerCase()} {index + 1}</button>
      </div>)}
      <button onClick={() => setForm(current => ({...current, [key]: [...current[key], {basis: ''}]}))}>Dodaj przedział {label.toLowerCase()}</button>
    </fieldset>;

  return <div className="panel" aria-label="Edytor profilu czasu szkicu 6">
    <h3>Profil czasu operacji — szkic 6</h3>
    <p className="muted">Wpisz potwierdzone czasy względem początku operacji. Brak profilu oznacza brak podziału; nie wyliczamy go ze starego czasu standardowego. Przedziały różnych kategorii mogą się nakładać, a praca ręczna wymaga obecności operatora. Profil nie steruje jeszcze symulacją.</p>
    <div className="toolbar"><button disabled={!canUndo} onClick={onUndo}>Cofnij dane szkicu</button><button disabled={!canRedo} onClick={onRedo}>Ponów dane szkicu</button></div>
    <div className="toolbar">
      <label className="field">Operacja<select aria-label="Operacja profilu czasu" value={selected}
        onChange={event => setSelected(event.target.value)}>{project.operations.map(item =>
          <option key={item.id} value={item.id}>{item.name} · {item.id}</option>)}</select></label>
      <label className="field">Jednostka prezentacji<select aria-label="Jednostka profilu czasu" value={unit}
        onChange={event => setUnit(event.target.value as TimeUnit)}>{TIME_UNITS.map(item =>
          <option key={item.value} value={item.value}>{item.full}</option>)}</select></label>
    </div>
    {operation && <>
      <p>Stary czas standardowy: {formatTimeWithUnit(operation.standardTimeSeconds, unit)} · Profil: {operation.timeProfile ? 'jawnie zapisany' : 'brak danych'}.</p>
      <div className="toolbar">
        <label className="field">Czas całkowity [{unit}]<input type="number" step="any" min="0"
          aria-label="Czas całkowity profilu" value={display(form.durationSeconds)}
          onChange={event => setForm(current => ({...current, durationSeconds: numeric(event.target.value)}))} /></label>
        <label className="field">Pochodzenie czasu całkowitego<select aria-label="Pochodzenie czasu całkowitego"
          value={form.durationBasis} onChange={event => setForm(current => ({...current, durationBasis: event.target.value as EditableProfile['durationBasis']}))}>
          <option value="">Wybierz</option><option value="measured">Pomierzony</option><option value="assumed">Założony</option>
        </select></label>
      </div>
      {categories.map(intervalFields)}
      <div className="toolbar"><button onClick={save}>Zapisz profil czasu</button>
        {operation.timeProfile && <button className="danger" onClick={() => onApply({kind: 'clear-time-profile', operationId: operation.id})}>Usuń profil czasu</button>}
      </div>
    </>}
    {error && <p className="error" role="alert">{error}</p>}
  </div>;
}
