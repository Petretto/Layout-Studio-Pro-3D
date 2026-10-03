import {useState} from 'react';
import type {ProjectData} from '../../core/models/types';
import type {StationProjectV5} from '../../core/stationMigration';
import {previewDomainMigrationFromV4, previewDomainMigrationFromV5,
  type DomainGap, type DomainMigrationPreview} from '../../core/domainMigrationPreview';
import {prepareDomainMigration} from '../../core/domainProject';
import {readDomainDraft, saveDomainDraft} from '../../core/domainDraftStorage';
import {download} from '../../core/project';

const gapLabels: Record<DomainGap, string> = {
  'worker-identities': 'Tożsamość pracowników',
  'worker-pools': 'Pule pracowników',
  'equipment-capabilities': 'Możliwości technologiczne wyposażenia',
  'product-definition': 'Definicja wyrobu',
  'subassembly-definitions': 'Definicje podzespołów',
  'manual-automatic-time-split': 'Podział czasu ręcznego i automatycznego',
  'operator-presence-rules': 'Reguły obecności operatora',
  'station-assignment': 'Przypisanie wszystkich operacji do stanowisk',
};

export function DomainDraftPanel({legacyProject, stationProject}: {
  legacyProject: ProjectData; stationProject: StationProjectV5 | null;
}) {
  const [draft, setDraft] = useState(() => readDomainDraft(localStorage));
  const [preview, setPreview] = useState<DomainMigrationPreview | null>(null);
  const [reviewed, setReviewed] = useState(false);
  const [message, setMessage] = useState('');
  const stale = !!preview && (preview.sourceSchemaVersion === 5
    ? JSON.stringify(stationProject) !== preview.originalJson
    : JSON.stringify(legacyProject) !== preview.originalJson);

  const inspect = (version: 4 | 5) => {
    setReviewed(false);
    setPreview(null);
    try {
      const next = version === 5
        ? previewDomainMigrationFromV5(JSON.stringify(stationProject))
        : previewDomainMigrationFromV4(JSON.stringify(legacyProject));
      setPreview(next);
      setMessage('Podgląd gotowy. Sprawdź powiązania i braki danych przed zapisem szkicu.');
    } catch (error) { setMessage(`Podgląd odrzucony: ${(error as Error).message}`); }
  };

  const save = () => {
    if (!preview || stale || !reviewed || draft.status !== 'empty') return;
    try {
      const prepared = prepareDomainMigration(preview);
      saveDomainDraft(localStorage, prepared, null);
      setDraft(readDomainDraft(localStorage));
      setPreview(null);
      setReviewed(false);
      setMessage('Niekompletny szkic 6 zapisano osobno. Aktywny projekt i symulacja nie zostały zmienione.');
    } catch (error) {
      setDraft(readDomainDraft(localStorage));
      setMessage(`Nie zapisano szkicu: ${(error as Error).message}`);
    }
  };

  return <section className="panel" aria-label="Podgląd modelu procesu v6">
    <h2>Model procesu — szkic schematu 6</h2>
    <p className="muted">Podgląd pokazuje oddzielne operacje i stanowiska oraz dane, których obecny projekt nie zawiera. Szkic jest niekompletny i nie jest używany przez bilans ani symulację. Zapisuje się pod osobnym kluczem przeglądarki.</p>
    <div className="toolbar">
      <button onClick={() => inspect(4)}>Podgląd z bieżącego projektu 4</button>
      <button disabled={!stationProject} onClick={() => inspect(5)}>Podgląd z warsztatu 5</button>
    </div>
    {draft.status === 'empty' && <p>Brak zapisanego szkicu 6.</p>}
    {draft.status === 'unavailable' && <p className="error" role="alert">Pamięć przeglądarki jest niedostępna: {draft.error}. Nie można zapisać szkicu.</p>}
    {draft.status === 'corrupt' && <div className="notice" role="alert"><p>Istniejący szkic jest uszkodzony: {draft.error}. Zachowano go bez zmian; nowy zapis jest zablokowany.</p><button onClick={() => download(draft.raw, 'Odzyskiwanie_szkicu_v6.json', 'application/json')}>Pobierz surową kopię szkicu</button></div>}
    {draft.status === 'valid' && <div className="notice"><p>Zapisany szkic: {draft.saved.project.name} · źródło v{draft.saved.sourceSchemaVersion} · {draft.saved.project.operations.length} operacji · {draft.saved.project.stations.length} stanowisk · {new Date(draft.saved.at).toLocaleString('pl-PL')}. Status: niekompletny.</p><div className="toolbar"><button onClick={() => download(draft.raw, 'Szkic_modelu_v6_z_oryginalem.json', 'application/json')}>Pobierz szkic z oryginałem</button><button onClick={() => download(draft.saved.originalJson, `Oryginalny_projekt_v${draft.saved.sourceSchemaVersion}.json`, 'application/json')}>Pobierz źródło</button></div></div>}
    {preview && <div className="panel">
      <h3>Podgląd źródła v{preview.sourceSchemaVersion}</h3>
      <p>{preview.stationProject.processSteps.length} operacji · {preview.stationProject.stations.length} stanowisk · {preview.stationProject.bom.length} pozycji BOM · {preview.visualBindings.length} obiektów geometrii.</p>
      <p>Nieprzypisane operacje: {preview.unassignedOperationIds.length ? preview.unassignedOperationIds.join(', ') : 'brak'}.</p>
      <h4>Dane wymagające uzupełnienia</h4>
      <ul>{preview.unresolved.map(gap => <li key={gap}>{gapLabels[gap]}</li>)}</ul>
      <details><summary>Powiązania operacji i obsada stanowisk</summary>
        <div className="table-wrap"><table><thead><tr><th>Stanowisko</th><th>Operacje</th><th>Osób na kopię</th><th>Kopie</th><th>Jawny cykl zespołu [s]</th></tr></thead><tbody>{preview.stationProject.stations.map(station => {
          const staffing = preview.stationStaffing.find(item => item.stationId === station.id);
          return <tr key={station.id}><td>{station.name} · {station.id}</td><td>{station.operationIds.join(', ') || 'Puste'}</td><td>{staffing?.operatorsPerCopy ?? 'brak danych'}</td><td>{staffing?.parallelCopies ?? 'brak danych'}</td><td>{staffing?.assistedCycleSeconds ?? 'brak danych'}</td></tr>;
        })}</tbody></table></div>
      </details>
      {stale && <p className="error" role="alert">Źródło zmieniło się po przygotowaniu podglądu. Przygotuj podgląd ponownie.</p>}
      {draft.status !== 'empty' && <p className="muted">Istnieje już zapis szkicu. Ten podgląd nie zastąpi go automatycznie.</p>}
      <label><input type="checkbox" checked={reviewed} onChange={event => setReviewed(event.target.checked)} /> Rozumiem, że brakujące dane pozostaną nieuzupełnione.</label>
      <div className="toolbar"><button disabled={!reviewed || stale || draft.status !== 'empty'} onClick={save}>Zapisz niekompletny szkic 6</button></div>
    </div>}
    {message && <p role="status" className={message.includes('odrzucon') || message.includes('Nie zapisano') ? 'error' : 'muted'}>{message}</p>}
  </section>;
}
