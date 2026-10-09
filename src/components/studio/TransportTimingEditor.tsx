import {useState} from 'react';
import {resolveTransportTime, type TransportTimedRoute, type TransportParameter} from '../../core/transportTime';

/** Units are presentation only. Stored speed is mm/s and all stored times are seconds. */
export function TransportTimingEditor({label, route, onChange}: {
  label: string; route: TransportTimedRoute;
  onChange: (timing: Pick<TransportTimedRoute, 'transportTime' | 'transportCalculation'>) => void;
}) {
  const [speedUnit, setSpeedUnit] = useState('mm/s');
  const [timeUnit, setTimeUnit] = useState('s');
  const speedFactor = speedUnit === 'm/s' ? 1000 : speedUnit === 'm/min' ? 1000 / 60 : 1;
  const timeFactor = timeUnit === 'min' ? 60 : 1;
  const mode = route.transportCalculation ? 'calculated' : route.transportTime ? 'direct' : 'none';
  const blank = (): TransportParameter => ({value: NaN, basis: 'assumed', source: ''});
  let result, error = '';
  try {result = resolveTransportTime(route);} catch (failure) {error = (failure as Error).message;}
  const fields = (name: string, parameter: TransportParameter, factor: number, unit: string,
    change: (next: TransportParameter) => void) => <div className="form-grid">
    <label className="field">{name} [{unit}]<input type="number" min="0" step="any" aria-label={`${label} ${name}`}
      value={Number.isFinite(parameter.value) ? (unit === 'm/min' ? parameter.value / 1000 * 60 : parameter.value / factor) : ''}
      onChange={e => change({...parameter, value: e.target.value === '' ? NaN :
        unit === 'm/min' ? Number(e.target.value) * 1000 / 60 : Number(e.target.value) * factor})}/></label>
    <label className="field">Pochodzenie<select aria-label={`${label} ${name} pochodzenie`} value={parameter.basis}
      onChange={e => change({...parameter, basis: e.target.value as TransportParameter['basis']})}>
      <option value="assumed">Założone</option><option value="measured">Zmierzone</option></select></label>
    <label className="field">Źródło<input aria-label={`${label} ${name} źródło`} value={parameter.source}
      onChange={e => change({...parameter, source: e.target.value})}/></label>
  </div>;
  return <fieldset><legend>Czas transportu</legend>
    <label className="field">Tryb czasu<select aria-label={`${label} tryb czasu`} value={mode} onChange={e => {
      if(e.target.value === 'none') onChange({});
      else if(e.target.value === 'direct') onChange({transportTime: {durationSeconds: NaN, basis: 'assumed', source: ''}});
      else onChange({transportCalculation: {speed: blank(), loading: blank(), unloading: blank()}});
    }}><option value="none">Brak danych czasu</option><option value="direct">Wpisany czas</option>
      <option value="calculated">Wyliczenie z długości i parametrów</option></select></label>
    {mode !== 'none' && <label className="field">Jednostka czasu<select aria-label={`${label} jednostka czasu`} value={timeUnit}
      onChange={e => setTimeUnit(e.target.value)}><option value="s">s</option><option value="min">min</option></select></label>}
    {route.transportTime && fields('Czas transportu', {value: route.transportTime.durationSeconds, basis: route.transportTime.basis, source: route.transportTime.source},
      timeFactor, timeUnit, p => onChange({transportTime: {durationSeconds: p.value, basis: p.basis, source: p.source}}))}
    {route.transportCalculation && <>
      <label className="field">Jednostka prędkości<select aria-label={`${label} jednostka prędkości`} value={speedUnit}
        onChange={e => setSpeedUnit(e.target.value)}><option value="mm/s">mm/s</option><option value="m/s">m/s</option><option value="m/min">m/min</option></select></label>
      {(['speed', 'loading', 'unloading'] as const).map((key, i) => <div key={key}>
        {fields(['Prędkość', 'Załadunek', 'Rozładunek'][i], route.transportCalculation![key], key === 'speed' ? speedFactor : timeFactor,
          key === 'speed' ? speedUnit : timeUnit, p => onChange({transportCalculation: {...route.transportCalculation!, [key]: p}}))}
      </div>)}
      <p className="muted">Czas = załadunek + długość / prędkość + rozładunek. Wpisz jawnie także zerowe czasy obsługi i ich źródła. Wynik wyliczenia jest założony.</p>
    </>}
    {result && <p aria-label={`${label} wynik czasu`}>Czas: {result.durationSeconds} s ({result.basis === 'measured' ? 'zmierzony' : 'założony'}).
      {result.breakdown && <> Załadunek: {result.breakdown.loadingSeconds} s · jazda: {result.breakdown.travelSeconds} s · rozładunek: {result.breakdown.unloadingSeconds} s.</>}
      {' '}Źródło: {result.source}</p>}
    {error && <p role="status">Uzupełnij dane czasu: {error}</p>}
  </fieldset>;
}
