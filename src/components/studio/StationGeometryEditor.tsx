import {useState} from 'react';
import type {LayoutObject} from '../../core/models/types';
import type {StationProjectV5} from '../../core/stationMigration';
import {corners} from '../../core/algorithms/layoutEngine';
import {addStationEquipment, removeStationEquipment, updateStationEquipment,
  type StationEquipmentType, type StationGeometry} from '../../core/stationGeometry';

const fields = [
  ['xMm', 'X [mm]'], ['yMm', 'Y [mm]'], ['zMm', 'Z [mm]'],
  ['widthMm', 'Szerokość [mm]'], ['lengthMm', 'Głębokość [mm]'],
  ['heightMm', 'Wysokość [mm]'], ['rotationDeg', 'Obrót [°]'],
] as const;

function GeometryForm({stationId, object, apply, cancel}: {
  stationId: string; object?: LayoutObject; apply: (type: StationEquipmentType, geometry: StationGeometry) => boolean; cancel: () => void;
}) {
  const [type, setType] = useState<StationEquipmentType>('TableESD');
  const [name, setName] = useState(object?.name ?? '');
  const [values, setValues] = useState<Record<typeof fields[number][0], string>>({
    xMm: String(object?.xMm ?? ''), yMm: String(object?.yMm ?? ''), zMm: String(object?.zMm ?? ''),
    widthMm: String(object?.widthMm ?? ''), lengthMm: String(object?.lengthMm ?? ''),
    heightMm: String(object?.heightMm ?? ''), rotationDeg: String(object?.rotationDeg ?? ''),
  });
  const [error, setError] = useState('');
  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!name.trim() || Object.values(values).some(value => !value.trim())) {
      setError('Podaj nazwę, położenie, wymiary i obrót w milimetrach.'); return;
    }
    const numeric = Object.fromEntries(Object.entries(values).map(([key, value]) => [key, Number(value)])) as Omit<StationGeometry, 'name'>;
    if (Object.values(numeric).some(value => !Number.isFinite(value)) ||
        numeric.widthMm <= 0 || numeric.lengthMm <= 0 || numeric.heightMm <= 0) {
      setError('Współrzędne i obrót muszą być liczbami, a wymiary dodatnie.'); return;
    }
    if (apply(type, {name: name.trim(), ...numeric})) {setError(''); if (!object) cancel();}
  };
  return <form className="panel" onSubmit={submit}>
    <h3>{object ? `Edytuj obiekt ${object.id}` : 'Dodaj wyposażenie stanowiska'}</h3>
    <p className="muted">Powiązane stanowisko: {stationId}. {object ? `Typ: ${object.type}. ID i powiązanie pozostają stałe.` : 'Wprowadź zmierzone lub świadomie przyjęte wymiary i położenie; formularz niczego nie wylicza.'}</p>
    <div className="form-grid">
      {!object && <label className="field">Typ wyposażenia<select value={type} onChange={event => setType(event.target.value as StationEquipmentType)}><option value="TableESD">Stół ESD</option><option value="FlowRackFIFO3Tier">Regał FIFO</option><option value="OperatorErgoMat">Strefa operatora</option></select></label>}
      <label className="field">Nazwa obiektu<input value={name} onChange={event => setName(event.target.value)} /></label>
      {fields.map(([key, label]) => <label className="field" key={key}>{label}<input type="number" step="any" value={values[key]} onChange={event => setValues(current => ({...current, [key]: event.target.value}))} /></label>)}
    </div>
    {error && <p className="error" role="alert">{error}</p>}
    <div className="toolbar"><button type="submit">{object ? 'Zapisz geometrię ID' : 'Dodaj obiekt do ID'}</button><button type="button" onClick={cancel}>Anuluj</button></div>
  </form>;
}

export function StationGeometryEditor({project, change}: {
  project: StationProjectV5; change: (action: (current: StationProjectV5) => StationProjectV5) => boolean;
}) {
  const [stationId, setStationId] = useState('');
  const [objectId, setObjectId] = useState('');
  const [creating, setCreating] = useState(false);
  const [approveRemoval, setApproveRemoval] = useState(false);
  const station = project.stations.find(item => item.id === stationId);
  const objects = project.layoutObjects.filter(object => object.workstationId === stationId);
  const object = objects.find(item => item.id === objectId);
  const points = project.layoutObjects.flatMap(item => corners(item));
  const minX = Math.min(0, ...points.map(point => point.x)) - 1000;
  const minY = Math.min(0, ...points.map(point => point.y)) - 1000;
  const maxX = Math.max(project.facility.widthMm, ...points.map(point => point.x)) + 1000;
  const maxY = Math.max(project.facility.lengthMm, ...points.map(point => point.y)) + 1000;
  const tableCount = objects.filter(item => item.type.includes('Table')).length;
  const copies = project.workstationSettings[stationId]?.parallelStations ?? 1;
  return <div className="panel"><h2>Geometria 2D/3D stanowiska</h2>
    <p className="muted">Rzut i podgląd 3D korzystają z zapisanych obiektów schematu 5. Zmiana geometrii nie zmienia operacji ani ich czasów. Współrzędne i wymiary są w milimetrach; ostrzeżenia o kolizjach i wyjściu poza halę pojawiają się w kontroli layoutu.</p>
    <label className="field">Stanowisko geometrii<select value={station ? stationId : ''} onChange={event => {setStationId(event.target.value); setObjectId(''); setCreating(false); setApproveRemoval(false);}}><option value="">Wybierz</option>{project.stations.map(item => <option key={item.id} value={item.id}>{item.name} · {item.id}</option>)}</select></label>
    <svg role="img" aria-label="Rzut hali v5" className="cad-canvas" viewBox={`${minX} ${minY} ${maxX - minX} ${maxY - minY}`}>
      <rect x="0" y="0" width={project.facility.widthMm} height={project.facility.lengthMm} fill="#142238" stroke="#94a3b8" strokeWidth="35" />
      {project.layoutObjects.map(item => <g key={item.id}><polygon points={corners(item).map(point => `${point.x},${point.y}`).join(' ')} fill={item.colorHex} stroke={item.id === objectId ? '#fbbf24' : item.workstationId === stationId ? '#fff' : '#94a3b8'} strokeWidth={item.id === objectId ? 90 : 25} /><title>{item.name} · {item.workstationId ?? 'bez stanowiska'} · {item.xMm}, {item.yMm} mm</title></g>)}
    </svg>
    {station && <><p>{station.name} · {station.id}: {tableCount} stołów, wymagane {copies}; {objects.length} powiązanych obiektów.</p>
      <div className="toolbar"><button onClick={() => {setCreating(true); setObjectId(''); setApproveRemoval(false);}}>Dodaj wyposażenie do ID</button></div>
      <div className="table-wrap"><table><thead><tr><th>Obiekt</th><th>Typ</th><th>X / Y [mm]</th><th>Wymiary [mm]</th><th>Akcja</th></tr></thead><tbody>{objects.map(item => <tr key={item.id}><td>{item.name} · {item.id}</td><td>{item.type}</td><td>{item.xMm} / {item.yMm}</td><td>{item.widthMm} × {item.lengthMm} × {item.heightMm}</td><td><button onClick={() => {setObjectId(item.id); setCreating(false); setApproveRemoval(false);}}>Edytuj</button></td></tr>)}</tbody></table></div>
      {creating && <GeometryForm key={`${stationId}:new`} stationId={stationId} apply={(type, geometry) => change(current => addStationEquipment(current, stationId, type, geometry))} cancel={() => setCreating(false)} />}
      {object && !creating && <><GeometryForm key={`${object.id}:${JSON.stringify(object)}`} stationId={stationId} object={object} apply={(_, geometry) => change(current => updateStationEquipment(current, stationId, object.id, geometry))} cancel={() => setObjectId('')} />
        <label><input type="checkbox" checked={approveRemoval} onChange={event => setApproveRemoval(event.target.checked)} /> Potwierdzam usunięcie obiektu {object.id} z geometrii; można je cofnąć.</label>
        <div className="toolbar"><button className="danger" disabled={!approveRemoval} onClick={() => {if (change(current => removeStationEquipment(current, stationId, object.id))) {setObjectId(''); setApproveRemoval(false);}}}>Usuń obiekt ID</button></div>
      </>}
    </>}
  </div>;
}
