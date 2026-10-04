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
  const [target, setTarget] = useState<'reference' | 'variant'>('reference');
  const [requiredWorkers, setRequiredWorkers] = useState('');
  const [variantCount, setVariantCount] = useState('');
  const [form, setForm] = useState<EditableProfile>(() => editable(project.operations[0]?.timeProfile));
  const [error, setError] = useState('');
  const operation = project.operations.find(item => item.id === selected);
  useEffect(() => setVariantCount(''), [selected]);
  useEffect(() => {
    setRequiredWorkers(operation?.staffing ? String(operation.staffing.requiredWorkers) : '');
  }, [project, selected]);
  useEffect(() => {
    const profile = target === 'reference' ? operation?.timeProfile
      : operation?.staffing?.timeVariants.find(item => String(item.workerCount) === variantCount)?.timeProfile;
    setForm(editable(profile));
    setError('');
  }, [project, selected, target, variantCount]);

  const existingVariant = operation?.staffing?.timeVariants.find(item => String(item.workerCount) === variantCount);

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
    if (target === 'variant') {
      const workerCount = Number(variantCount);
      if (!operation.staffing || !variantCount.trim() || !Number.isSafeInteger(workerCount) ||
          workerCount < operation.staffing.requiredWorkers) {
        setError('Najpierw zapisz minimalną obsadę, a potem podaj całkowitą liczbę osób nie mniejszą od minimum.');
        return;
      }
      if (onApply({kind: 'set-staffing-variant', operationId: operation.id, workerCount, profile})) setError('');
    } else if (onApply({kind: 'set-time-profile', operationId: operation.id, profile})) setError('');
  };
  const saveRequiredWorkers = () => {
    if (!operation) return;
    const count = Number(requiredWorkers);
    if (!requiredWorkers.trim() || !Number.isSafeInteger(count) || count < 1) {
      setError('Podaj dodatnią, całkowitą minimalną liczbę pracowników.');
      return;
    }
    if (onApply({kind: 'set-required-workers', operationId: operation.id, requiredWorkers: count})) setError('');
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
    <h3>Profil czasu i obsada operacji — szkic 6</h3>
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
      <fieldset aria-label="Obsada operacji">
        <legend>Wymagana obsada operacji</legend>
        <p className="muted">Podaj minimum dla tej operacji. Obsada stanowiska nie jest tu kopiowana; dodatkowe osoby nie skracają czasu bez jawnego wariantu.</p>
        <div className="toolbar">
          <label className="field">Minimalna liczba pracowników<input type="number" step="1" min="1"
            aria-label="Minimalna liczba pracowników operacji" value={requiredWorkers}
            onChange={event => setRequiredWorkers(event.target.value)} /></label>
          <button onClick={saveRequiredWorkers}>Zapisz minimalną obsadę</button>
          {operation.staffing && <button className="danger" onClick={() => onApply({kind: 'clear-staffing', operationId: operation.id})}>Usuń obsadę i warianty</button>}
        </div>
        <p>Warianty czasu: {operation.staffing?.timeVariants.length
          ? operation.staffing.timeVariants.map(item => `${item.workerCount} osób`).join(', ') : 'brak'}.</p>
      </fieldset>
      <div className="toolbar">
        <label className="field">Edytowany profil<select aria-label="Edytowany profil operacji" value={target}
          onChange={event => setTarget(event.target.value as 'reference' | 'variant')}>
          <option value="reference">Profil referencyjny (bez obsady)</option>
          <option value="variant">Wariant dla liczebności zespołu</option>
        </select></label>
        {target === 'variant' && <label className="field">Liczba pracowników wariantu<input type="number" step="1" min="1"
          aria-label="Liczba pracowników wariantu" value={variantCount}
          onChange={event => setVariantCount(event.target.value)} /></label>}
      </div>
      {target === 'variant' && <div className="toolbar">
        {operation.staffing?.timeVariants.map(item => <button key={item.workerCount}
          onClick={() => setVariantCount(String(item.workerCount))}>Edytuj wariant {item.workerCount} osób</button>)}
        <p className="muted">Wpisz nową liczbę osób, aby dodać kolejny wariant. Każdy wariant wymaga pełnego, jawnego profilu.</p>
      </div>}
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
      <div className="toolbar"><button onClick={save}>{target === 'reference' ? 'Zapisz profil czasu' : 'Zapisz wariant czasu'}</button>
        {target === 'reference' && operation.timeProfile && <button className="danger" onClick={() => onApply({kind: 'clear-time-profile', operationId: operation.id})}>Usuń profil czasu</button>}
        {target === 'variant' && existingVariant && <button className="danger" onClick={() => onApply({kind: 'clear-staffing-variant', operationId: operation.id, workerCount: existingVariant.workerCount})}>Usuń wariant {existingVariant.workerCount} osób</button>}
      </div>
    </>}
    {error && <p className="error" role="alert">{error}</p>}
  </div>;
}
