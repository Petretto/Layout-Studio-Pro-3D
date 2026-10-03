import {useState} from 'react';
import type {ProjectData} from '../../core/models/types';
import type {StationProjectV5} from '../../core/stationMigration';
import {previewDomainMigrationFromV4, previewDomainMigrationFromV5,
  type DomainGap, type DomainMigrationPreview} from '../../core/domainMigrationPreview';
import {prepareDomainMigration} from '../../core/domainProject';
import type {DomainProjectV6} from '../../core/domainProject';
import {editDomainPeople, type DomainPeopleChange} from '../../core/domainPeopleEditing';
import {editDomainProduct, type DomainProductChange} from '../../core/domainProductEditing';
import {readDomainDraft, replaceDomainDraft, saveDomainDraft} from '../../core/domainDraftStorage';
import {download} from '../../core/project';
import {DomainPeopleEditor} from './DomainPeopleEditor';
import {DomainProductEditor} from './DomainProductEditor';

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
  const [downloadedRaw, setDownloadedRaw] = useState<string | null>(null);
  const [confirmReplace, setConfirmReplace] = useState(false);
  const [past, setPast] = useState<DomainProjectV6[]>([]);
  const [future, setFuture] = useState<DomainProjectV6[]>([]);
  const stale = !!preview && (preview.sourceSchemaVersion === 5
    ? JSON.stringify(stationProject) !== preview.originalJson
    : JSON.stringify(legacyProject) !== preview.originalJson);

  const inspect = (version: 4 | 5) => {
    setReviewed(false);
    setPreview(null);
    setConfirmReplace(false);
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
      setPast([]); setFuture([]);
      setPreview(null);
      setReviewed(false);
      setMessage('Niekompletny szkic 6 zapisano osobno. Aktywny projekt i symulacja nie zostały zmienione.');
    } catch (error) {
      setDraft(readDomainDraft(localStorage));
      setPast([]); setFuture([]);
      setMessage(`Nie zapisano szkicu: ${(error as Error).message}`);
    }
  };

  const replace = () => {
    if (!preview || stale || !reviewed || !confirmReplace ||
        (draft.status !== 'valid' && draft.status !== 'corrupt') || downloadedRaw !== draft.raw) return;
    try {
      const prepared = prepareDomainMigration(preview);
      replaceDomainDraft(localStorage, prepared, draft.raw);
      setDraft(readDomainDraft(localStorage));
      setPast([]); setFuture([]);
      setPreview(null);
      setReviewed(false);
      setDownloadedRaw(null);
      setConfirmReplace(false);
      setMessage('Zastąpiono szkic 6 po pobraniu poprzedniej kopii. Aktywne projekty v4/v5 nie zostały zmienione.');
    } catch (error) {
      setDraft(readDomainDraft(localStorage));
      setPast([]); setFuture([]);
      setDownloadedRaw(null);
      setConfirmReplace(false);
      setMessage(`Nie zastąpiono szkicu: ${(error as Error).message}`);
    }
  };

  const applyDraftChange = (edit: (project: DomainProjectV6) => DomainProjectV6, successMessage: string): boolean => {
    if (draft.status !== 'valid') return false;
    let next: DomainProjectV6;
    try { next = edit(draft.saved.project); }
    catch (error) {
      setMessage(`Nie zmieniono danych szkicu: ${(error as Error).message}`);
      return false;
    }
    try {
      const written = saveDomainDraft(localStorage, {originalJson: draft.saved.originalJson, project: next}, draft.raw);
      setPast(history => [...history.slice(-39), draft.saved.project]);
      setFuture([]);
      setDraft({status: 'valid', ...written});
      setMessage(successMessage);
      return true;
    } catch (error) {
      setDraft(readDomainDraft(localStorage));
      setPast([]); setFuture([]);
      setMessage(`Nie zmieniono danych szkicu: ${(error as Error).message}`);
      return false;
    }
  };

  const applyPeople = (change: DomainPeopleChange) => applyDraftChange(
    project => editDomainPeople(project, change), 'Zapisano dane osób i pul w szkicu 6.');
  const applyProduct = (change: DomainProductChange) => applyDraftChange(
    project => editDomainProduct(project, change), 'Zapisano wyrób lub podzespół w szkicu 6.');

  const navigateDraftHistory = (direction: 'undo' | 'redo') => {
    if (draft.status !== 'valid') return;
    const source = direction === 'undo' ? past : future;
    const target = source[source.length - 1];
    if (!target) return;
    try {
      const written = saveDomainDraft(localStorage, {originalJson: draft.saved.originalJson, project: target}, draft.raw);
      if (direction === 'undo') {
        setPast(past.slice(0, -1));
        setFuture([...future, draft.saved.project]);
      } else {
        setFuture(future.slice(0, -1));
        setPast([...past, draft.saved.project]);
      }
      setDraft({status: 'valid', ...written});
      setMessage(direction === 'undo' ? 'Cofnięto zmianę danych szkicu.' : 'Ponowiono zmianę danych szkicu.');
    } catch (error) {
      setDraft(readDomainDraft(localStorage));
      setPast([]); setFuture([]);
      setMessage(`Nie zmieniono danych szkicu: ${(error as Error).message}`);
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
    {draft.status === 'corrupt' && <div className="notice" role="alert"><p>Istniejący szkic jest uszkodzony: {draft.error}. Zachowano go bez zmian; zastąpienie wymaga pobrania surowej kopii i potwierdzenia.</p><button onClick={() => {download(draft.raw, 'Odzyskiwanie_szkicu_v6.json', 'application/json'); setDownloadedRaw(draft.raw);}}>Pobierz surową kopię szkicu</button></div>}
    {draft.status === 'valid' && <div className="notice"><p>Zapisany szkic: {draft.saved.project.name} · źródło v{draft.saved.sourceSchemaVersion} · {draft.saved.project.operations.length} operacji · {draft.saved.project.stations.length} stanowisk · {new Date(draft.saved.at).toLocaleString('pl-PL')}. Status: niekompletny.</p><div className="toolbar"><button onClick={() => {download(draft.raw, 'Szkic_modelu_v6_z_oryginalem.json', 'application/json'); setDownloadedRaw(draft.raw);}}>Pobierz szkic z oryginałem</button><button onClick={() => download(draft.saved.originalJson, `Oryginalny_projekt_v${draft.saved.sourceSchemaVersion}.json`, 'application/json')}>Pobierz źródło</button></div></div>}
    {draft.status === 'valid' && <DomainPeopleEditor key={`people-${draft.raw}`} project={draft.saved.project} onApply={applyPeople}
      onUndo={() => navigateDraftHistory('undo')} onRedo={() => navigateDraftHistory('redo')}
      canUndo={past.length > 0} canRedo={future.length > 0} />}
    {draft.status === 'valid' && <DomainProductEditor key={`product-${draft.raw}`} project={draft.saved.project} onApply={applyProduct}
      onUndo={() => navigateDraftHistory('undo')} onRedo={() => navigateDraftHistory('redo')}
      canUndo={past.length > 0} canRedo={future.length > 0} />}
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
      {(draft.status === 'valid' || draft.status === 'corrupt') && <p className="muted">Istniejący szkic nie zostanie zastąpiony automatycznie. Pobierz jego pełną kopię powyżej; po zastąpieniu nowy szkic będzie miał wybrane źródło v{preview.sourceSchemaVersion}.</p>}
      <label><input type="checkbox" checked={reviewed} onChange={event => setReviewed(event.target.checked)} /> Rozumiem, że brakujące dane pozostaną nieuzupełnione.</label>
      <div className="toolbar"><button disabled={!reviewed || stale || draft.status !== 'empty'} onClick={save}>Zapisz niekompletny szkic 6</button>
        {(draft.status === 'valid' || draft.status === 'corrupt') && <button disabled={!reviewed || stale || downloadedRaw !== draft.raw} onClick={() => setConfirmReplace(true)}>Zastąp szkic 6</button>}
      </div>
      {confirmReplace && (draft.status === 'valid' || draft.status === 'corrupt') && <div className="notice" role="alertdialog" aria-label="Potwierdź zastąpienie szkicu 6"><p>Poprzedni szkic zostanie zastąpiony projektem z podglądu v{preview.sourceSchemaVersion}. Sprawdź, czy pobrana kopia jest dostępna.</p><div className="toolbar"><button onClick={() => setConfirmReplace(false)}>Anuluj zastąpienie</button><button onClick={replace}>Potwierdź zastąpienie szkicu 6</button></div></div>}
    </div>}
    {message && <p role="status" className={message.includes('odrzucon') || message.includes('Nie zapisano') || message.includes('Nie zastąpiono') || message.includes('Nie zmieniono') ? 'error' : 'muted'}>{message}</p>}
  </section>;
}
