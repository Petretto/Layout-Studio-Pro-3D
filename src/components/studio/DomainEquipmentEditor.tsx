import {useState} from 'react';
import type {DomainProjectV6} from '../../core/domainProject';
import type {DomainEquipmentChange} from '../../core/domainEquipmentEditing';

export function DomainEquipmentEditor({project, onApply, onUndo, onRedo, canUndo, canRedo}: {
  project: DomainProjectV6;
  onApply: (change: DomainEquipmentChange) => boolean;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
}) {
  const [selected, setSelected] = useState('');
  const [id, setId] = useState('');
  const [name, setName] = useState('');
  const [stationId, setStationId] = useState('');
  const [layoutObjectId, setLayoutObjectId] = useState('');

  const chooseEquipment = (value: string) => {
    const item = project.equipment.find(equipment => equipment.id === value);
    setSelected(value);
    setId(value);
    setName(item?.name ?? '');
    setStationId(item?.stationId ?? '');
    setLayoutObjectId(item?.layoutObjectId ?? '');
  };
  const saveEquipment = () => onApply({kind: selected ? 'edit-equipment' : 'add-equipment',
    id: selected || id, name, ...(stationId ? {stationId} : {}),
    ...(layoutObjectId ? {layoutObjectId} : {})});

  return <div className="panel" aria-label="Edytor wyposażenia szkicu 6">
    <h3>Wyposażenie technologiczne — szkic 6</h3>
    <p className="muted">Podaj potwierdzone wyposażenie ręcznie. Powiązanie ze stanowiskiem lub obiektem layoutu jest opcjonalne i nie oznacza, że urządzenie może wykonać daną operację. Obiekt 2D/3D nie tworzy wyposażenia automatycznie; jeden obiekt może wskazywać tylko jedno wyposażenie.</p>
    <div className="toolbar"><button disabled={!canUndo} onClick={onUndo}>Cofnij dane szkicu</button><button disabled={!canRedo} onClick={onRedo}>Ponów dane szkicu</button></div>
    <div className="toolbar">
      <label className="field">Wyposażenie do edycji<select aria-label="Wyposażenie do edycji" value={selected} onChange={event => chooseEquipment(event.target.value)}><option value="">Nowe wyposażenie</option>{project.equipment.map(item => <option key={item.id} value={item.id}>{item.name} · {item.id}</option>)}</select></label>
      <label className="field">ID wyposażenia<input aria-label="ID wyposażenia" value={id} disabled={!!selected} onChange={event => setId(event.target.value)} /></label>
      <label className="field">Nazwa wyposażenia<input aria-label="Nazwa wyposażenia" value={name} onChange={event => setName(event.target.value)} /></label>
      <label className="field">Stanowisko wyposażenia<select aria-label="Stanowisko wyposażenia" value={stationId} onChange={event => setStationId(event.target.value)}><option value="">Nie określono</option>{project.stations.map(station => <option key={station.id} value={station.id}>{station.name} · {station.id}</option>)}</select></label>
      <label className="field">Obiekt layoutu wyposażenia<select aria-label="Obiekt layoutu wyposażenia" value={layoutObjectId} onChange={event => setLayoutObjectId(event.target.value)}><option value="">Nie określono</option>{project.layoutObjects.map(object => <option key={object.id} value={object.id}>{object.name} · {object.id}</option>)}</select></label>
    </div>
    <div className="toolbar"><button onClick={saveEquipment}>{selected ? 'Zapisz wyposażenie' : 'Dodaj wyposażenie'}</button>
      {selected && <button className="danger" onClick={() => onApply({kind: 'remove-equipment', id: selected})}>Usuń wyposażenie</button>}
    </div>
    <div className="table-wrap"><table><thead><tr><th>ID wyposażenia</th><th>Nazwa</th><th>Stanowisko</th><th>Obiekt layoutu</th></tr></thead><tbody>{project.equipment.map(item => <tr key={item.id}><td>{item.id}</td><td>{item.name}</td><td>{item.stationId || 'Nie określono'}</td><td>{item.layoutObjectId || 'Nie określono'}</td></tr>)}</tbody></table></div>
  </div>;
}
