import {lazy, Suspense, useMemo, useRef, useState} from 'react';
import type {ProjectData, Workstation} from '../../core/models/types';
import type {StationProjectV5} from '../../core/stationMigration';
import {previewStationMigration, prepareStationMigration} from '../../core/stationMigration';
import {parseStationProjectV5} from '../../core/stationProject';
import {deriveStationProject} from '../../core/stationDerivation';
import {moveStationOperation} from '../../core/stationBalancing';
import {reviseStationProject, splitStationProject, mergeStationProject, removeStationOperation} from '../../core/stationRevision';
import type {OperationRun} from '../../core/algorithms/networkSimulation';
import {defaultLayoutSettings, generate3DLayout} from '../../core/algorithms/layoutEngine';
import {download, filename} from '../../core/project';
import {archivedImportBlob} from '../../core/importArchive';
import {makePortableArchive, MAX_ARCHIVE_BYTES, readPortableArchive} from '../../core/portableArchive';
import {parseProject} from '../../core/validation';
import {fmt} from './Fields';
import {StationGeometryEditor} from './StationGeometryEditor';
import {Simulation} from './Simulation';

const Scene = lazy(() => import('./Scene').then(module => ({default: module.Scene})));

const STORAGE = 'layout-studio-stations-v5';
type Saved = {project: StationProjectV5; originalJson: string; importSourceBase64?: string; at: string};
type Initial = {saved: Saved | null; warning: string};
type Settings = StationProjectV5['workstationSettings'][string];
const exportLabels = {json: 'projekt 5 JSON', archive: 'archiwum v5', original: 'oryginał 4', import: 'pierwotny import'} as const;
export type StationExportKind = keyof typeof exportLabels;
export type StationExportSnapshot = {projectSignature: string; originalJson: string; importSourceBase64: string};

function describeSettings(settings?: Settings) {
  if (!settings) return 'brak osobnych ustawień';
  return `${settings.operators} os. × ${settings.parallelStations} kopii${settings.assistedCycleSeconds !== undefined ? `, cykl zespołu ${fmt(settings.assistedCycleSeconds)} s` : ''}`;
}

function StationResourceEditor({station, settings, tableCount, onApply, onRemove}: {
  station: Workstation; settings?: Settings; tableCount: number;
  onApply: (next: Settings) => boolean; onRemove: () => boolean;
}) {
  const [operators, setOperators] = useState(String(settings?.operators ?? 1));
  const [copies, setCopies] = useState(String(settings?.parallelStations ?? 1));
  const [cycle, setCycle] = useState(String(settings?.assistedCycleSeconds ?? ''));
  const [error, setError] = useState('');
  const saveSettings = () => {
    const nextOperators = Number(operators), nextCopies = Number(copies);
    const explicitCycle = cycle.trim() ? Number(cycle) : undefined;
    if (!Number.isInteger(nextOperators) || nextOperators < 1 || nextOperators > 20 ||
        !Number.isInteger(nextCopies) || nextCopies < 1 || nextCopies > 20 ||
        (explicitCycle !== undefined && (!Number.isFinite(explicitCycle) || explicitCycle < 0.001))) {
      setError('Obsada i kopie muszą być liczbami całkowitymi 1–20, a jawny cykl zespołu musi wynosić co najmniej 0,001 s.');
      return;
    }
    const next = {operators: nextOperators, parallelStations: nextCopies, ...(explicitCycle !== undefined ? {assistedCycleSeconds: explicitCycle} : {})};
    if (onApply(next)) setError('');
  };
  return <>
    <p>Wybrane: {station.name} · {station.id}. Zapisane ustawienia: {describeSettings(settings)}.</p>
    <div className="toolbar">
      <label className="field">Operatorzy na kopię<input type="number" min="1" max="20" step="1" value={operators} onChange={e => setOperators(e.target.value)} /></label>
      <label className="field">Równoległe kopie<input type="number" min="1" max="20" step="1" value={copies} onChange={e => setCopies(e.target.value)} /></label>
      <label className="field">Jawny cykl zespołu [s]<input type="number" min="0.001" step="any" placeholder="bez nadpisania" value={cycle} onChange={e => setCycle(e.target.value)} /></label>
      <button onClick={saveSettings}>Zapisz zasoby ID</button>
      <button disabled={!settings} onClick={onRemove}>Przywróć domyślne zasoby ID</button>
    </div>
    {error && <p className="error" role="alert">{error}</p>}
    <p>Bazowy cykl: {fmt(station.baseCycleSeconds ?? station.cycleTimeSeconds)} s · cykl zespołu: {fmt(station.cycleTimeSeconds)} s · odstęp zdolności: {fmt(station.effectiveCycleSeconds ?? station.cycleTimeSeconds)} s/szt. · obsada łącznie: {(station.operators ?? 1) * (station.parallelStations ?? 1)}. Zapisane stoły: {tableCount}.</p>
    <p className="muted">Więcej operatorów nie skraca cyklu automatycznie. Jawny cykl zespołu wymaga danych procesu. Zmiana liczby kopii nie tworzy stołów; niezgodność geometrii pojawi się w kontroli layoutu i zablokuje symulację. Puste stanowisko zachowuje ustawienia, ale ma cykl 0 do chwili przydzielenia operacji. Przywrócenie domyślnych zasobów można cofnąć.</p>
  </>;
}

function loadWorkspace(): Initial {
  const text = localStorage.getItem(STORAGE);
  if (!text) return {saved: null, warning: ''};
  try {
    const saved = JSON.parse(text) as Saved;
    const project = parseStationProjectV5(JSON.stringify(saved.project));
    deriveStationProject(project);
    return {saved: {...saved, project, originalJson: typeof saved.originalJson === 'string' ? saved.originalJson : '', importSourceBase64: typeof saved.importSourceBase64 === 'string' ? saved.importSourceBase64 : ''}, warning: ''};
  } catch (error) {
    return {saved: null, warning: `Zapis stanowisk wymaga odzyskania: ${(error as Error).message}. Pobierz kopię przed zastąpieniem.`};
  }
}

export function StationWorkspace({legacyProject, legacyImportSourceBase64, simulationExportKey, onSimulationExport, exportSnapshots, onExportSnapshot}: {legacyProject: ProjectData; legacyImportSourceBase64: string; simulationExportKey: string | null; onSimulationExport: (key: string) => void; exportSnapshots: Partial<Record<StationExportKind, StationExportSnapshot>>; onExportSnapshot: (kind: StationExportKind, snapshot: StationExportSnapshot) => void}) {
  const [initial] = useState(loadWorkspace);
  const [project, setProject] = useState<StationProjectV5 | null>(initial.saved?.project ?? null);
  const [originalJson, setOriginalJson] = useState(initial.saved?.originalJson ?? '');
  const [importSourceBase64, setImportSourceBase64] = useState(initial.saved?.importSourceBase64 ?? '');
  const [savedAt, setSavedAt] = useState(initial.saved?.at ?? '');
  const [allowSave, setAllowSave] = useState(!initial.warning);
  const [confirmRecovery, setConfirmRecovery] = useState(false);
  const [message, setMessage] = useState(initial.warning);
  const [past, setPast] = useState<StationProjectV5[]>([]);
  const [future, setFuture] = useState<StationProjectV5[]>([]);
  const [operationId, setOperationId] = useState('');
  const [targetId, setTargetId] = useState('');
  const [removeOpId, setRemoveOpId] = useState('');
  const [splitId, setSplitId] = useState('');
  const [splitMoved, setSplitMoved] = useState<string[]>([]);
  const [splitName, setSplitName] = useState('');
  const [mergeKeepId, setMergeKeepId] = useState('');
  const [mergeRetireId, setMergeRetireId] = useState('');
  const [mergeApproved, setMergeApproved] = useState(false);
  const [resourceId, setResourceId] = useState('');
  const [showGeometry3D, setShowGeometry3D] = useState(false);
  const [activeRuns, setActiveRuns] = useState<OperationRun[]>([]);
  const [simulationEpoch, setSimulationEpoch] = useState(0);
  const file = useRef<HTMLInputElement>(null);
  const projectSignature = useMemo(() => project ? JSON.stringify(project) : '', [project]);
  const markExport = (kind: StationExportKind) => onExportSnapshot(kind, {projectSignature, originalJson, importSourceBase64});
  const isExportCurrent = (kind: StationExportKind) => {
    const snapshot = exportSnapshots[kind];
    if (!snapshot) return false;
    if (kind === 'original') return snapshot.originalJson === originalJson;
    if (kind === 'import') return snapshot.importSourceBase64 === importSourceBase64;
    return !!project && snapshot.projectSignature === projectSignature && (kind === 'json' || (snapshot.originalJson === originalJson && snapshot.importSourceBase64 === importSourceBase64));
  };
  const clearRevisionDraft = () => {
    setSplitId(''); setSplitMoved([]); setSplitName('');
    setMergeKeepId(''); setMergeRetireId(''); setMergeApproved(false);
    setRemoveOpId('');
  };
  const derived = useMemo(() => {
    if (!project) return null;
    try { return {value: deriveStationProject(project), error: ''}; }
    catch (error) { return {value: null, error: (error as Error).message}; }
  }, [project]);

  const save = (next: StationProjectV5 = project!) => {
    if (!allowSave) return false;
    try {
      const checked = parseStationProjectV5(JSON.stringify(next));
      deriveStationProject(checked);
      const at = new Date().toISOString();
      localStorage.setItem(STORAGE, JSON.stringify({project: checked, originalJson, importSourceBase64, at} satisfies Saved));
      setSavedAt(at); setMessage('Zapisano warsztat stanowisk lokalnie.');
      return true;
    } catch (error) { setMessage(`Nie zapisano: ${(error as Error).message}`); return false; }
  };

  const replace = (next: StationProjectV5, source: string, rawImport = '') => {
    if (!allowSave) { setMessage('Najpierw pobierz kopię odzyskiwania i włącz zastąpienie zapisu.'); return; }
    try {
      const checked = parseStationProjectV5(JSON.stringify(next));
      deriveStationProject(checked);
      if (project && !window.confirm('Zastąpić bieżący warsztat stanowisk? Wyeksportuj go wcześniej, jeśli chcesz zachować wariant.')) return;
      const at = new Date().toISOString();
      localStorage.setItem(STORAGE, JSON.stringify({project: checked, originalJson: source, importSourceBase64: rawImport, at} satisfies Saved));
      setProject(checked); setOriginalJson(source); setImportSourceBase64(rawImport); setSavedAt(at);
      setPast([]); setFuture([]); setActiveRuns([]); setSimulationEpoch(value => value + 1); clearRevisionDraft(); setMessage('Projekt stanowisk gotowy i zapisany lokalnie.');
    } catch (error) { setMessage(`Nie wczytano: ${(error as Error).message}`); }
  };
  const change = (action: (current: StationProjectV5) => StationProjectV5) => {
    if (!project) return false;
    try {
      const next = parseStationProjectV5(JSON.stringify(action(project)));
      deriveStationProject(next);
      if (!save(next)) return false;
      setPast(items => [...items.slice(-39), project]); setFuture([]); setProject(next);
      setActiveRuns([]); setSimulationEpoch(value => value + 1);
      return true;
    } catch (error) { setMessage(`Zmiana odrzucona: ${(error as Error).message}`); return false; }
  };
  const migrate = () => {
    try {
      const source = JSON.stringify(legacyProject);
      replace(prepareStationMigration(previewStationMigration(source)).project, source, legacyImportSourceBase64);
    } catch (error) { setMessage(`Migracja zatrzymana: ${(error as Error).message}`); }
  };
  const importV5 = async (selected: File) => {
    try {
      if (selected.size > MAX_ARCHIVE_BYTES) throw new Error('Maksymalny plik archiwum: 25 MB.');
      const text = await selected.text();
      const archive = readPortableArchive(text, 5);
      if (!archive && selected.size > 10 * 1024 * 1024) throw new Error('Maksymalny zwykły JSON: 10 MB.');
      if (archive?.originalJson) parseProject(archive.originalJson);
      if (archive?.importSourceBase64) parseProject(await archivedImportBlob(archive.importSourceBase64).text());
      replace(parseStationProjectV5(archive ? JSON.stringify(archive.project) : text), archive?.originalJson ?? '', archive?.importSourceBase64 ?? '');
    } catch (error) { setMessage(`Import odrzucony: ${(error as Error).message}`); }
  };
  const exportArchive = async () => {
    if (!project) return;
    try {
      const checked = parseStationProjectV5(JSON.stringify(project));
      if (originalJson) parseProject(originalJson);
      if (importSourceBase64) parseProject(await archivedImportBlob(importSourceBase64).text());
      download(makePortableArchive(5, checked, importSourceBase64, originalJson), `${filename(project)}_archiwum_v5.json`, 'application/json');
      markExport('archive');
      setMessage('Przekazano przenośne archiwum projektu 5 do pobrania.');
    } catch (error) { setMessage(`Nie utworzono archiwum: ${(error as Error).message}`); }
  };
  const undo = () => { if (!project || !past.length) return; const next = past[past.length - 1]; if (!save(next)) return; setFuture([project, ...future]); setProject(next); setPast(past.slice(0, -1)); setActiveRuns([]); setSimulationEpoch(value => value + 1); clearRevisionDraft(); };
  const redo = () => { if (!project || !future.length) return; const next = future[0]; if (!save(next)) return; setPast([...past, project]); setProject(next); setFuture(future.slice(1)); setActiveRuns([]); setSimulationEpoch(value => value + 1); clearRevisionDraft(); };
  const stations = derived?.value?.project.balancing.workstations ?? [];
  const splitSource = project?.stations.find(s => s.id === splitId);
  const splitSettings = splitId ? project?.workstationSettings[splitId] : undefined;
  const mergeKeep = project?.stations.find(s => s.id === mergeKeepId);
  const mergeKeepSettings = mergeKeepId ? project?.workstationSettings[mergeKeepId] : undefined;
  const mergeRetire = project?.stations.find(s => s.id === mergeRetireId);
  const retireObjects = project?.layoutObjects.filter(o => o.workstationId === mergeRetireId) ?? [];
  const retireHasSettings = !!project && Object.prototype.hasOwnProperty.call(project.workstationSettings, mergeRetireId);
  const retireSettings = mergeRetireId ? project?.workstationSettings[mergeRetireId] : undefined;
  const resourceStation = stations.find(s => s.id === resourceId);
  const resourceSettings = resourceId ? project?.workstationSettings[resourceId] : undefined;
  const downloadedExports = (Object.keys(exportLabels) as StationExportKind[]).filter(kind => exportSnapshots[kind]);
  return <section className="page" aria-label="Warsztat stanowisk v5">
    <h1>Warsztat stanowisk — schemat 5</h1>
    <p className="muted">Trwałe ID wiąże fizyczne stanowisko, jego zasoby i wyposażenie. Numer w tabeli oznacza tylko kolejność. Warsztat ma własny zapis; bieżący projekt schematu 4 pozostaje dostępny w pozostałych kartach.</p>
    <div className="toolbar">
      <button onClick={migrate}>Przygotuj z bieżącego projektu</button>
      <button onClick={() => file.current?.click()}>Importuj projekt 5 JSON lub archiwum</button>
      <button disabled={!project} onClick={() => save()}>Zapisz warsztat</button>
      <button disabled={!project} onClick={() => {if (!project) return; download(JSON.stringify(project, null, 2), `${filename(project)}_stanowiska_v5.json`, 'application/json'); markExport('json');}}>Eksport projektu 5 JSON</button>
      <button disabled={!project} onClick={exportArchive}>Eksport archiwum v5</button>
      <button disabled={!originalJson} onClick={() => {download(originalJson, 'Oryginalny_projekt_v4.json', 'application/json'); markExport('original');}}>Pobierz oryginał 4</button>
      <button disabled={!importSourceBase64} onClick={() => {download(archivedImportBlob(importSourceBase64), 'Pierwotnie_importowany_projekt.json'); markExport('import');}}>Pobierz pierwotny import</button>
    </div>
    {downloadedExports.length > 0 && <p className="muted" role="status">Pobrane w sesji: {downloadedExports.map((kind, index) => <span key={kind} className={isExportCurrent(kind) ? '' : 'bad'}>{index > 0 ? ' · ' : ''}{exportLabels[kind]}: {isExportCurrent(kind) ? 'aktualny' : 'nieaktualny — pobierz ponownie'}</span>)}</p>}
    <input ref={file} hidden type="file" accept=".json" onChange={event => {if (event.target.files?.[0]) void importV5(event.target.files[0]); event.target.value = '';}} />
    {!allowSave && <div className="notice"><button onClick={() => download(localStorage.getItem(STORAGE) ?? '', 'Odzyskiwanie_stanowisk_v5.json', 'application/json')}>Pobierz kopię odzyskiwania</button> <button onClick={() => setConfirmRecovery(true)}>Włącz zastąpienie</button></div>}
    {confirmRecovery && !allowSave && <div className="panel notice" role="alertdialog" aria-label="Potwierdź zastąpienie uszkodzonego zapisu"><p>Po odblokowaniu poprawny import lub migracja będzie mogła zastąpić uszkodzony zapis. Pobierz jego kopię przed kontynuowaniem.</p><div className="toolbar"><button onClick={() => setConfirmRecovery(false)}>Anuluj zastąpienie</button><button onClick={() => {setAllowSave(true); setConfirmRecovery(false); setMessage('Możesz teraz wczytać projekt lub przygotować migrację.');}}>Potwierdź zastąpienie zapisu</button></div></div>}
    <p className="muted">{project ? `Projekt: ${project.name} · ${stations.length} stanowisk · zapis: ${savedAt ? new Date(savedAt).toLocaleString('pl-PL') : 'oczekuje'}` : 'Wybierz migrację bieżącego projektu albo import projektu 5.'}</p>
    {message && <p className={message.includes('odrzucon') || message.includes('zatrzyman') || message.includes('Nie zapisano') ? 'error' : 'notice'} role="status">{message}</p>}
    {derived?.error && <p className="error">{derived.error}</p>}
    {project && derived?.value && <>
      <div className="toolbar"><button disabled={!past.length} onClick={undo}>Cofnij</button><button disabled={!future.length} onClick={redo}>Ponów</button><button onClick={() => change(current => reviseStationProject(current, [...current.stations, {name: 'Nowe stanowisko', operationIds: []}]).project)}>Dodaj puste stanowisko</button><button onClick={() => {if (window.confirm('Wygenerować layout od nowa? Zapisane pozycje i obiekty wyposażenia zostaną zastąpione.')) change(current => {const balance = deriveStationProject(current).project.balancing; return {...current, layoutMode: 'auto', layoutObjects: generate3DLayout(balance.workstations, current.targetLayoutType, current.facility, current.layoutSettings ?? defaultLayoutSettings, current.processSteps)};});}}>Wygeneruj layout od nowa</button></div>
      <div className="table-wrap"><table><thead><tr><th>Nr</th><th>Trwałe ID</th><th>Nazwa</th><th>Operacje</th><th>Cykl [s]</th><th>Zasoby</th><th>Kolejność</th></tr></thead><tbody>{stations.map((station, index) => <tr key={station.id}><td>{index + 1}</td><td>{station.id}</td><td>{station.name}</td><td>{station.assignedStepIds.join(', ') || 'Puste'}</td><td>{fmt(station.cycleTimeSeconds)}</td><td>{station.operators ?? 1} os. × {station.parallelStations ?? 1} kopii</td><td><button disabled={index === 0} aria-label={`Przesuń ${station.name} w górę`} onClick={() => change(current => {const plan = [...current.stations]; [plan[index - 1], plan[index]] = [plan[index], plan[index - 1]]; return reviseStationProject(current, plan).project;})}>↑</button> <button disabled={index === stations.length - 1} aria-label={`Przesuń ${station.name} w dół`} onClick={() => change(current => {const plan = [...current.stations]; [plan[index + 1], plan[index]] = [plan[index], plan[index + 1]]; return reviseStationProject(current, plan).project;})}>↓</button></td></tr>)}</tbody></table></div>
      <div className="panel"><h2>Przenieś operację do istniejącego stanowiska</h2><div className="toolbar"><label className="field">Operacja<select value={operationId} onChange={e => setOperationId(e.target.value)}><option value="">Wybierz</option>{project.processSteps.map(step => <option key={step.id} value={step.id}>{step.id} — {step.name}</option>)}</select></label><label className="field">Stanowisko docelowe<select value={targetId} onChange={e => setTargetId(e.target.value)}><option value="">Wybierz</option>{stations.map(station => <option key={station.id} value={station.id}>{station.name} · {station.id}</option>)}</select></label><button disabled={!operationId || !targetId} onClick={() => change(current => moveStationOperation(current, operationId, targetId))}>Przenieś operację</button></div></div>
      <div className="panel"><h2>Usuń operację ze stanowiska</h2>
        <p className="muted">Usunięcie operacji usuwa czynność z procesu, powiązania poprzedników i materiały BOM, ale fizyczne stanowisko zachowuje swoje trwałe ID, wyposażenie oraz ustawienia zasobów. Jeśli stanowisko stanie się puste, ma cykl 0 s.</p>
        <div className="toolbar">
          <label className="field">Operacja do usunięcia
            <select value={removeOpId} onChange={e => setRemoveOpId(e.target.value)}>
              <option value="">Wybierz</option>
              {project.processSteps.map(step => <option key={step.id} value={step.id}>{step.id} — {step.name}</option>)}
            </select>
          </label>
          <button disabled={!removeOpId} onClick={() => {
            const step = project.processSteps.find(s => s.id === removeOpId);
            const st = project.stations.find(s => s.operationIds.includes(removeOpId));
            if (!window.confirm(`Usunąć operację ${removeOpId} (${step?.name})? Stanowisko ${st?.name} (${st?.id}) zachowa ID, wyposażenie i zasoby. Zmianę można cofnąć.`)) return;
            if (change(current => removeStationOperation(current, removeOpId))) {
              setRemoveOpId('');
              if (operationId === removeOpId) setOperationId('');
            }
          }}>Usuń operację z zachowaniem stanowiska</button>
        </div>
      </div>
      <div className="panel"><h2>Podziel stanowisko</h2>
        <p className="muted">Wybrane stanowisko zachowa ID, ustawienia zasobów i obiekty layoutu. Przeniesione operacje utworzą nowe stanowisko bez tych powiązań.</p>
        <div className="toolbar"><label className="field">Stanowisko zachowujące ID<select value={splitId} onChange={e => {setSplitId(e.target.value); setSplitMoved([]);}}><option value="">Wybierz</option>{project.stations.filter(s => s.operationIds.length > 1).map(s => <option key={s.id} value={s.id}>{s.name} · {s.id}</option>)}</select></label><label className="field">Nazwa nowego stanowiska<input value={splitName} onChange={e => setSplitName(e.target.value)} placeholder="Nowe stanowisko" /></label></div>
        {splitSource && <><p>Operacje przenoszone do nowego stanowiska:</p><div className="toolbar">{splitSource.operationIds.map(id => <label key={id}><input type="checkbox" checked={splitMoved.includes(id)} onChange={e => setSplitMoved(items => e.target.checked ? [...items, id] : items.filter(item => item !== id))} /> {id} — {project.processSteps.find(s => s.id === id)?.name}</label>)}</div><p className="muted">Na ID {splitSource.id} pozostanie {splitSource.operationIds.length - splitMoved.length} operacji; zachowa ono {project.layoutObjects.filter(o => o.workstationId === splitSource.id).length} powiązanych obiektów i ustawienia: {describeSettings(splitSettings)}.</p></>}
        <button disabled={!splitSource || !splitName.trim() || !splitMoved.length || splitMoved.length >= splitSource.operationIds.length} onClick={() => {if (change(current => splitStationProject(current, splitId, splitMoved, splitName).project)) {setSplitId(''); setSplitMoved([]); setSplitName('');}}}>Podziel i utwórz nowe ID</button>
      </div>
      <div className="panel"><h2>Scal stanowiska</h2>
        <p className="muted">Wskaż fizyczne stanowisko, którego ID, zasoby i wyposażenie zostaną zachowane. Operacje drugiego stanowiska przejdą do niego. Powiązania wycofywanego ID trzeba rozstrzygnąć jawnie.</p>
        <div className="toolbar"><label className="field">Zachowaj stanowisko<select value={mergeKeepId} onChange={e => {setMergeKeepId(e.target.value); setMergeRetireId(''); setMergeApproved(false);}}><option value="">Wybierz</option>{project.stations.map(s => <option key={s.id} value={s.id}>{s.name} · {s.id}</option>)}</select></label><label className="field">Wycofaj stanowisko<select value={mergeRetireId} disabled={!mergeKeepId} onChange={e => {setMergeRetireId(e.target.value); setMergeApproved(false);}}><option value="">Wybierz</option>{project.stations.filter(s => s.id !== mergeKeepId).map(s => <option key={s.id} value={s.id}>{s.name} · {s.id}</option>)}</select></label></div>
        {mergeKeep && mergeRetire && <><p>Zachowane: {mergeKeep.name} · {mergeKeep.id}, {project.layoutObjects.filter(o => o.workstationId === mergeKeep.id).length} powiązanych obiektów; ustawienia: {describeSettings(mergeKeepSettings)}.</p><p>Wycofywane: {mergeRetire.name} · {mergeRetire.id}. Obiekty do usunięcia: {retireObjects.length ? retireObjects.map(o => `${o.name} (${o.id})`).join(', ') : 'brak'}. Ustawienia zasobów do usunięcia: {retireHasSettings ? describeSettings(retireSettings) : 'brak'}.</p><label><input type="checkbox" checked={mergeApproved} onChange={e => setMergeApproved(e.target.checked)} /> Potwierdzam wycofanie wskazanego ID i usunięcie wymienionych powiązań.</label><div className="toolbar"><button disabled={!mergeApproved} onClick={() => {if (!window.confirm(`Scalić stanowiska? Zachowane ID: ${mergeKeep.id}. Wycofane ID: ${mergeRetire.id}. Usunięte obiekty: ${retireObjects.length}; ustawienia zasobów: ${retireHasSettings ? 'tak' : 'nie'}.`)) return; if (change(current => mergeStationProject(current, {keepId: mergeKeep.id, retireId: mergeRetire.id, removeObjectIds: retireObjects.map(o => o.id), removeResourceSettings: retireHasSettings}).project)) clearRevisionDraft();}}>Scal z zachowaniem wybranego ID</button></div></>}
      </div>
      <div className="panel"><h2>Ustawienia zasobów stanowiska</h2>
        <label className="field">Stanowisko według trwałego ID<select value={resourceStation ? resourceId : ''} onChange={e => setResourceId(e.target.value)}><option value="">Wybierz</option>{stations.map(s => <option key={s.id} value={s.id}>{s.name} · {s.id}</option>)}</select></label>
        {resourceStation && <StationResourceEditor key={`${resourceId}:${JSON.stringify(resourceSettings)}`} station={resourceStation} settings={resourceSettings} tableCount={project.layoutObjects.filter(o => o.type.includes('Table') && o.workstationId === resourceId).length} onApply={settings => change(current => ({...current, workstationSettings: {...current.workstationSettings, [resourceId]: settings}}))} onRemove={() => change(current => {const workstationSettings = {...current.workstationSettings}; delete workstationSettings[resourceId]; return {...current, workstationSettings};})} />}
      </div>
      <StationGeometryEditor project={project} change={change} />
      <div className="panel"><h2>Podgląd geometrii 3D v5</h2><button onClick={() => setShowGeometry3D(value => !value)}>{showGeometry3D ? 'Ukryj podgląd 3D' : 'Pokaż podgląd 3D'}</button>{showGeometry3D && <Suspense fallback={<p>Ładowanie podglądu 3D…</p>}><Scene project={derived.value.project} change={() => {}} activeRuns={activeRuns} readOnly /></Suspense>}</div>
      {derived.value.issues.length > 0 && <div className="panel"><h2>Kontrola layoutu</h2>{derived.value.issues.map((issue, index) => <p key={index} className={issue.severity === 'error' ? 'error' : 'notice'}>{issue.message}</p>)}</div>}
      {derived.value.issues.some(issue => issue.severity === 'error')
        ? <div className="panel"><h2>Symulacja przepływu produkcji</h2><p className="error" role="alert">Popraw błędy layoutu przed symulacją.</p>{simulationExportKey && <p className="error" role="status">Nie można potwierdzić aktualności pobranego CSV symulacji. Po poprawieniu layoutu sprawdź wynik i pobierz raport ponownie.</p>}</div>
        : <Simulation key={simulationEpoch} project={derived.value.project} notify={setMessage} onActive={setActiveRuns} exportedResultKey={simulationExportKey} onExportResult={onSimulationExport} initialBatch={1} showStableIds />}
    </>}
  </section>;
}
