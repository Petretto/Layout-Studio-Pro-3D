import {useState} from 'react';
import type {DomainProjectV6} from '../../core/domainProject';
import type {DomainProductChange} from '../../core/domainProductEditing';

export function DomainProductEditor({project, onApply, onUndo, onRedo, canUndo, canRedo}: {
  project: DomainProjectV6;
  onApply: (change: DomainProductChange) => boolean;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
}) {
  const [productId, setProductId] = useState(project.product?.id ?? '');
  const [productName, setProductName] = useState(project.product?.name ?? '');
  const [selectedAssembly, setSelectedAssembly] = useState('');
  const [assemblyId, setAssemblyId] = useState('');
  const [assemblyName, setAssemblyName] = useState('');
  const [producer, setProducer] = useState('');
  const [consumers, setConsumers] = useState<string[]>([]);

  const chooseAssembly = (id: string) => {
    const assembly = project.subassemblies.find(item => item.id === id);
    setSelectedAssembly(id);
    setAssemblyId(id);
    setAssemblyName(assembly?.name ?? '');
    setProducer(assembly?.producerOperationId ?? '');
    setConsumers(assembly?.consumerOperationIds ?? []);
  };
  const toggleConsumer = (id: string) => setConsumers(current => current.includes(id)
    ? current.filter(value => value !== id) : [...current, id]);
  const saveAssembly = () => onApply({kind: selectedAssembly ? 'edit-subassembly' : 'add-subassembly',
    id: selectedAssembly || assemblyId, name: assemblyName,
    ...(producer ? {producerOperationId: producer} : {}), consumerOperationIds: consumers});

  return <div className="panel" aria-label="Edytor wyrobu i podzespołów szkicu 6">
    <h3>Wyrób i podzespoły — szkic 6</h3>
    <p className="muted">Wpisz potwierdzone definicje i wybierz znane operacje. Nic nie jest tworzone z BOM, nazw operacji ani geometrii. To dane robocze poza bieżącą symulacją. ID pozostaje stałe przy zmianie nazwy.</p>
    <div className="toolbar"><button disabled={!canUndo} onClick={onUndo}>Cofnij dane szkicu</button><button disabled={!canRedo} onClick={onRedo}>Ponów dane szkicu</button></div>
    <h4>Wyrób</h4>
    <div className="toolbar">
      <label className="field">ID wyrobu<input aria-label="ID wyrobu" value={productId} disabled={!!project.product} onChange={event => setProductId(event.target.value)} /></label>
      <label className="field">Nazwa wyrobu<input aria-label="Nazwa wyrobu" value={productName} onChange={event => setProductName(event.target.value)} /></label>
      <button onClick={() => onApply({kind: 'set-product', id: productId, name: productName})}>{project.product ? 'Zmień nazwę wyrobu' : 'Dodaj wyrób'}</button>
      {project.product && <button className="danger" onClick={() => onApply({kind: 'clear-product'})}>Usuń definicję wyrobu</button>}
    </div>
    <h4>Podzespoły</h4>
    <div className="toolbar">
      <label className="field">Podzespół do edycji<select aria-label="Podzespół do edycji" value={selectedAssembly} onChange={event => chooseAssembly(event.target.value)}><option value="">Nowy podzespół</option>{project.subassemblies.map(item => <option key={item.id} value={item.id}>{item.name} · {item.id}</option>)}</select></label>
      <label className="field">ID podzespołu<input aria-label="ID podzespołu" value={assemblyId} disabled={!!selectedAssembly} onChange={event => setAssemblyId(event.target.value)} /></label>
      <label className="field">Nazwa podzespołu<input aria-label="Nazwa podzespołu" value={assemblyName} onChange={event => setAssemblyName(event.target.value)} /></label>
      <label className="field">Operacja tworząca<select aria-label="Operacja tworząca" value={producer} onChange={event => setProducer(event.target.value)}><option value="">Nie określono</option>{project.operations.map(operation => <option key={operation.id} value={operation.id}>{operation.name} · {operation.id}</option>)}</select></label>
    </div>
    <fieldset aria-label="Operacje zużywające podzespół"><legend>Operacje zużywające</legend><div className="toolbar">{project.operations.map(operation => <label key={operation.id}><input type="checkbox" checked={consumers.includes(operation.id)} onChange={() => toggleConsumer(operation.id)} /> {operation.name} · {operation.id}</label>)}</div></fieldset>
    <div className="toolbar"><button onClick={saveAssembly}>{selectedAssembly ? 'Zapisz podzespół' : 'Dodaj podzespół'}</button>
      {selectedAssembly && <button className="danger" onClick={() => onApply({kind: 'remove-subassembly', id: selectedAssembly})}>Usuń podzespół</button>}
    </div>
    <div className="table-wrap"><table><thead><tr><th>ID podzespołu</th><th>Nazwa</th><th>Operacja tworząca</th><th>Operacje zużywające</th></tr></thead><tbody>{project.subassemblies.map(item => <tr key={item.id}><td>{item.id}</td><td>{item.name}</td><td>{item.producerOperationId || 'Nie określono'}</td><td>{item.consumerOperationIds.join(', ') || 'Nie określono'}</td></tr>)}</tbody></table></div>
  </div>;
}
