import {SimulationWorkspace} from './components/studio/SimulationWorkspace';
import React,{useState,useMemo,useEffect,useRef,lazy,Suspense} from 'react';
import './studio.css';
import {AppHeader,AppNavigation} from './components/shell/AppShell';
import './components/studio/visualEditors.css';
import { ProjectData, TimeUnit } from './core/models/types';
import { parseProject } from './core/validation';
import { derive,newProject,download,filename,engineeringReport } from './core/project';
import { calculateTaktTime } from './core/algorithms/taktCalculator';
import { runLineBalancing } from './core/algorithms/lineBalancingEngine';
import { exportToDxf } from './core/export/dxfExporter';
import { spreadsheet,processRows,bomRows } from './core/export/excelImporter';
import { ProcessFlow } from './components/studio/ProcessFlow';
import { OperationRun } from './core/algorithms/networkSimulation';
import { ResourceEditor } from './components/studio/ResourceEditor';
import { topologicalSort } from './core/validation';
import { effectiveCycle } from './core/resources';
import { BalancingBoard } from './components/studio/BalancingBoard';
import { DataEditor } from './components/studio/DataEditors';
import { LayoutEditor } from './components/studio/LayoutEditor';
import { Simulation, type SimulationPlaybackState, type SimulationControlCommand } from './components/studio/Simulation';
import { NumberField,Metric,fmt,formatTimeValue,formatTimeWithUnit,TIME_UNITS } from './components/studio/Fields';
import { StationWorkspace } from './components/studio/StationWorkspace';
import type { StationExportKind, StationExportSnapshot } from './components/studio/StationWorkspace';
import {archivedImportBlob, encodeImport} from './core/importArchive';
import {makePortableArchive, MAX_ARCHIVE_BYTES, readPortableArchive} from './core/portableArchive';
import { PopoutWindow } from './components/studio/PopoutWindow';
import { WorkspaceBackupModal } from './components/studio/WorkspaceBackupModal';
import { ProjectPackageModal } from './components/studio/ProjectPackageModal';
import { DemoCatalog } from './components/studio/DemoCatalog';
import { EngineeringReportView } from './components/report/EngineeringReportView';
import { TutorialOverlay } from './components/tutorial/TutorialOverlay';
import { loadTutorialProgress, saveTutorialProgress, type TutorialProgress } from './core/tutorial';
import { createWorkspaceBackup, restoreWorkspaceBackup, type WorkspaceBackupPayload } from './core/workspaceBackup';
import { importProjectPackage, parseProjectPackage } from './core/projectPackage';
const Scene=lazy(()=>import('./components/studio/Scene').then(m=>({default:m.Scene})));
const KEY='layout-studio-v3',LIBRARY='layout-studio-scenarios-v3';
type Saved={id:string;name:string;at:string;project:ProjectData};
type HistoryEntry={project:ProjectData; importSourceBase64:string};
const exportLabels={archive:'archiwum v4',dxf:'DXF',balance:'bilans CSV',report:'raport MD',processXlsx:'proces XLSX',processCsv:'proces CSV',bomXlsx:'BOM XLSX',bomCsv:'BOM CSV'} as const;
type ExportKind='json'|keyof typeof exportLabels;
type DataExportKind='processXlsx'|'processCsv'|'bomXlsx'|'bomCsv';
type ExportRecord={project:ProjectData;source:string;at:string;dataSignature?:string};
const dataExportSignature=(kind:DataExportKind,project:ProjectData)=>JSON.stringify(kind.startsWith('process')?processRows(project.processSteps):bomRows(project.bom));
const dataExportKind=(kind:'process'|'bom',format:'xlsx'|'csv'):DataExportKind=>`${kind}${format==='xlsx'?'Xlsx':'Csv'}` as DataExportKind;
function load(){try{const raw=localStorage.getItem(KEY);if(raw){const v=JSON.parse(raw);const legacy=v.project?.schemaVersion!==4;return {project:parseProject(JSON.stringify(v.project)),at:v.at as string,importSourceBase64:typeof v.importSourceBase64==='string'?v.importSourceBase64:'',warning:legacy?'Wykryto starszy zapis lokalny. Pobierz jego surową kopię, a następnie potwierdź migrację przed zapisaniem projektu w schemacie 4.':'',recoveryKind:legacy?'legacy' as const:null};}}catch(e){return {project:newProject(),at:'',importSourceBase64:'',warning:`Błąd zapisu lokalnego: ${(e as Error).message}. Pobierz kopię odzyskiwania przed zastąpieniem.`,recoveryKind:'corrupt' as const};}return {project:newProject(),at:'',importSourceBase64:'',warning:'',recoveryKind:null};}
const tabs=[['dashboard','Pulpit'],['demand','1 Popyt i takt'],['process','2 Proces'],['flow','2a Przepływ'],['bom','3 BOM'],['balance','4 Bilans'],['layout','5 Hala i CAD'],['simulation','6 3D i symulacja'],['report','7 Raport'],['stations','Stanowiska v5']] as const;
const help=[['Takt klienta','Dostępny czas po przerwach / dzienne zapotrzebowanie.'],['Cel cyklu po OEE','Takt klienta × OEE. Rezerwa na straty używana przy bilansowaniu.'],['VA / NVA','Czas dodający wartość / pozostały czas. Suma to czas standardowy.'],['RPW','Priorytet według czasu operacji oraz wszystkich unikalnych następców.'],['LCR','Priorytet według malejącego czasu operacji, z zachowaniem zależności.'],['WIP','Sztuki w systemie, które weszły do linii i nie ukończyły ostatniej stacji.'],['Spaghetti','Łamana między środkami stanowisk, bez omijania przeszkód.']];
export function App(){
  const [initial]=useState(load),[raw,setRaw]=useState(initial.project),[importSourceBase64,setImportSourceBase64]=useState(initial.importSourceBase64),[tab,setTab]=useState<string>('dashboard'),[message,setMessage]=useState(initial.warning),[savedAt,setSavedAt]=useState(initial.at),[saveError,setSaveError]=useState(initial.warning),[allowSave,setAllowSave]=useState(!initial.warning),[recoveryDownloaded,setRecoveryDownloaded]=useState(false),[dirty,setDirty]=useState(false),[exportRecords,setExportRecords]=useState<Partial<Record<ExportKind,ExportRecord>>>({});
  const [past,setPast]=useState<HistoryEntry[]>([]),[future,setFuture]=useState<HistoryEntry[]>([]),[modal,setModal]=useState<{message:string;action:()=>void}|null>(null),[library,setLibrary]=useState<Saved[]>(()=>{try{const v=JSON.parse(localStorage.getItem(LIBRARY)??'[]');return Array.isArray(v)?v:[];}catch{return [];}}),[scenarioName,setScenarioName]=useState('Wariant 1'),[scenarioExportIds,setScenarioExportIds]=useState<string[]>([]);
  const [settingsOpen,setSettingsOpen]=useState(false);
  const settingsDialog=useRef<HTMLDialogElement>(null);
  useEffect(()=>{if(settingsOpen)settingsDialog.current?.showModal();else settingsDialog.current?.close();},[settingsOpen]);
  const [activeRuns,setActiveRuns]=useState<OperationRun[]>([]);
  const [simulationPlayback,setSimulationPlayback]=useState<SimulationPlaybackState|null>(null);
  const [simulationCommand,setSimulationCommand]=useState<SimulationControlCommand|null>(null);
  const [simulationExportKey,setSimulationExportKey]=useState<string|null>(null);
  const [stationSimulationExportKey,setStationSimulationExportKey]=useState<string|null>(null);
  const [stationExportSnapshots,setStationExportSnapshots]=useState<Partial<Record<StationExportKind,StationExportSnapshot>>>({});
  const [printRequest,setPrintRequest]=useState<{project:ProjectData;at:string}|null>(null);
  const [selectedLayoutObjectIds,setSelectedLayoutObjectIds]=useState<string[]>([]);
  const [popoutView,setPopoutView]=useState<'flow'|'layout'|'simulation'|null>(null);
  const [isBackupModalOpen,setIsBackupModalOpen]=useState(false);
  const [isPackageModalOpen,setIsPackageModalOpen]=useState(false);
  const [tutorialProgress,setTutorialProgress]=useState<TutorialProgress>(()=>loadTutorialProgress());
  const workspaceDialogOpen=isBackupModalOpen||isPackageModalOpen;
  const file=useRef<HTMLInputElement>(null),dialog=useRef<HTMLDialogElement>(null),autosaveTimer=useRef<number|undefined>(undefined),workspaceRestored=useRef(false);
  const {project:p,issues}=useMemo(()=>derive(raw),[raw]);const t=calculateTaktTime(p.demand),b=p.balancing;const unit=p.timeUnit??'s';
  useEffect(()=>{setSelectedLayoutObjectIds(ids=>ids.filter(id=>p.layoutObjects.some(o=>o.id===id)));},[p.layoutObjects]);
  const notify=(m:string)=>setMessage(m);
  const markExport=(kind:ExportKind)=>setExportRecords(records=>({...records,[kind]:{project:raw,source:importSourceBase64,at:new Date().toISOString(),dataSignature:kind==='processXlsx'||kind==='processCsv'||kind==='bomXlsx'||kind==='bomCsv'?dataExportSignature(kind,p):undefined}}));
  const markStationExport=(kind:StationExportKind,snapshot:StationExportSnapshot)=>setStationExportSnapshots(records=>({...records,[kind]:snapshot}));
  const isExportCurrent=(kind:ExportKind)=>{
    const record=exportRecords[kind];if(!record)return false;
    if(kind==='processXlsx'||kind==='processCsv'||kind==='bomXlsx'||kind==='bomCsv')return record.dataSignature===dataExportSignature(kind,p);
    return record.project===raw&&(kind!=='archive'||record.source===importSourceBase64);
  };
  const dataExportStatus=(kind:'process'|'bom',format:'xlsx'|'csv')=>{const key=dataExportKind(kind,format);return exportRecords[key]?isExportCurrent(key)?'aktualny':'nieaktualny — pobierz ponownie':'—';};
  const printReport=()=>{try{window.print();setPrintRequest({project:raw,at:new Date().toISOString()});}catch(e){notify(`Nie otwarto drukowania: ${(e as Error).message}`);}};
  const change=(next:ProjectData,nextImportSourceBase64=importSourceBase64)=>{setPast(h=>[...h.slice(-39),{project:raw,importSourceBase64}]);setFuture([]);setRaw({...next,updatedAt:new Date().toISOString()});setImportSourceBase64(nextImportSourceBase64);setDirty(true);};
  const confirm=(message:string,action:()=>void)=>setModal({message,action});
  useEffect(()=>{if(modal)dialog.current?.showModal();else dialog.current?.close();},[modal]);
  const writeSave=(project:ProjectData,source=importSourceBase64,reportFailure=true)=>{if(!allowSave)return false;try{parseProject(JSON.stringify(project));}catch{if(reportFailure)setSaveError('Błędy danych: popraw je, aby zapisać. Poprzedni poprawny zapis zachowany.');return false;}try{const at=new Date().toISOString();localStorage.setItem(KEY,JSON.stringify({project,at,importSourceBase64:source}));setSavedAt(at);setDirty(false);setSaveError('');return true;}catch{if(reportFailure)setSaveError(source?'Brak miejsca lub dostępu do pamięci przeglądarki. Pobierz pierwotny import i wyeksportuj projekt JSON.':'Brak miejsca lub dostępu do pamięci przeglądarki. Wyeksportuj JSON.');return false;}};
  useEffect(()=>{if(!allowSave||workspaceDialogOpen)return;setDirty(true);const id=window.setTimeout(()=>writeSave(raw),700);autosaveTimer.current=id;return()=>{window.clearTimeout(id);if(autosaveTimer.current===id)autosaveTimer.current=undefined;};},[raw,importSourceBase64,allowSave,workspaceDialogOpen]);
  useEffect(()=>{const h=(e:BeforeUnloadEvent)=>{if(!workspaceRestored.current&&(dirty||saveError)){e.preventDefault();e.returnValue='';}};window.addEventListener('beforeunload',h);return()=>window.removeEventListener('beforeunload',h);},[dirty,saveError]);
  const replace=(project:ProjectData)=>confirm('Zastąpić bieżący projekt? Możesz wrócić przyciskiem Cofnij. Warto wcześniej wyeksportować JSON.',()=>{change({...structuredClone(project),id:crypto.randomUUID()},'');setTab('demand');notify('Projekt gotowy. Kopię przenośną zachowasz przyciskiem Eksport JSON.');});
  const json=()=>{download(JSON.stringify({...p,schemaVersion:4},null,2),`${filename(p)}.json`,'application/json');markExport('json');notify(`Przekazano ${filename(p)}.json do pobrania. Sprawdź folder pobierania w przeglądarce.`);};
  const portableJson=async()=>{try{const checked=parseProject(JSON.stringify({...p,schemaVersion:4}));if(importSourceBase64)parseProject(await archivedImportBlob(importSourceBase64).text());download(makePortableArchive(4,checked,importSourceBase64),`${filename(p)}_archiwum_v4.json`,'application/json');markExport('archive');notify('Przekazano przenośne archiwum projektu 4 do pobrania.');}catch(e){notify(`Nie utworzono archiwum: ${(e as Error).message}`);}};
  const dxf=()=>{const perform=()=>{download(exportToDxf(p.facility,p.layoutObjects,p.name,p.obstacles),`${filename(p)}.dxf`,'application/dxf');markExport('dxf');notify(`Przekazano ${filename(p)}.dxf do pobrania. Jednostki: mm, przeszkody: warstwa OBSTACLES.`);};if(issues.length)confirm('Projekt ma błędy lub kolizje. Wyeksportować roboczy DXF mimo uwag?',perform);else perform();};
  const importJson=async(f:File)=>{try{if(f.size>MAX_ARCHIVE_BYTES)throw new Error('Maksymalny plik archiwum: 25 MB.');const bytes=new Uint8Array(await f.arrayBuffer());const text=new TextDecoder().decode(bytes);const archive=readPortableArchive(text,4);if(!archive&&f.size>10*1024*1024)throw new Error('Maksymalny zwykły JSON: 10 MB.');const candidate=parseProject(archive?JSON.stringify(archive.project):text);if(archive?.importSourceBase64)parseProject(await archivedImportBlob(archive.importSourceBase64).text());const source=archive?archive.importSourceBase64:encodeImport(bytes);confirm(`Wczytać projekt „${candidate.name}”? Bieżący projekt możesz przywrócić przez Cofnij.`,()=>{if(!allowSave){notify('Import nie zastąpił projektu. Najpierw pobierz kopię odzyskiwania i włącz zapis.');return;}const next={...candidate,updatedAt:new Date().toISOString()};if(!writeSave(next,source,false)){notify('Import nie zastąpił bieżącego projektu: brak miejsca lub dostępu do pamięci przeglądarki. Zwolnij miejsce lub wybierz mniejszy plik.');return;}window.clearTimeout(autosaveTimer.current);setPast(h=>[...h.slice(-39),{project:raw,importSourceBase64}]);setFuture([]);setRaw(next);setImportSourceBase64(source);setTab('dashboard');notify(archive?'Wczytano i zapisano przenośne archiwum projektu.':'Wczytano i zapisano projekt oraz pierwotny plik.');});}catch(e){notify(`Import odrzucony: ${(e as Error).message}`);}};
  const saveScenario=()=>{if(!scenarioName.trim()){notify('Podaj nazwę wariantu.');return;}try{parseProject(JSON.stringify(p));const list=[...library,{id:crypto.randomUUID(),name:scenarioName.trim(),at:new Date().toISOString(),project:structuredClone(p)}];if(list.length>20)throw new Error('Limit: 20 wariantów.');localStorage.setItem(LIBRARY,JSON.stringify(list));setLibrary(list);notify('Zapisano wariant w tej przeglądarce.');}catch(e){notify(`Nie zapisano wariantu: ${(e as Error).message}`);}};
  const exportScenario=(s:Saved)=>{download(JSON.stringify(s.project,null,2),`${s.name.replace(/[^\p{L}\p{N}_-]/gu,'_')}.json`,'application/json');setScenarioExportIds(ids=>ids.includes(s.id)?ids:[...ids,s.id]);notify(`Przekazano JSON wariantu „${s.name}” do pobrania. Sprawdź folder pobierania.`);};
  const undo=()=>{if(!past.length)return;setFuture([{project:raw,importSourceBase64},...future]);setRaw(past[past.length-1].project);setImportSourceBase64(past[past.length-1].importSourceBase64);setPast(past.slice(0,-1));};
  const redo=()=>{if(!future.length)return;setPast([...past,{project:raw,importSourceBase64}]);setRaw(future[0].project);setImportSourceBase64(future[0].importSourceBase64);setFuture(future.slice(1));};
  const startTutorial=()=>{
    const launch=async()=>{
      try{
        const snap=JSON.stringify(createWorkspaceBackup(localStorage));
        if(!p.processSteps.some(s=>s.id.startsWith('ZM-'))){
          try{
            const res=await fetch(`${import.meta.env.BASE_URL}demo-projects/01_zestaw_montazowy.project.json`);
            if(res.ok){
              const pkg=parseProjectPackage(await res.text());
              importProjectPackage(localStorage,pkg,snap);
              const next:TutorialProgress={version:1,active:true,currentStepIndex:0,completedStepIds:[],savedAt:new Date().toISOString(),previousWorkspaceSnapshot:snap};
              saveTutorialProgress(next);
              window.location.reload();
              return;
            }
          }catch{}
        }
        const next:TutorialProgress={...tutorialProgress,active:true,currentStepIndex:0,savedAt:new Date().toISOString(),previousWorkspaceSnapshot:snap};
        setTutorialProgress(next);
        saveTutorialProgress(next);
        setTab('dashboard');
        notify('Uruchomiono interaktywny tutorial. Postępuj zgodnie ze wskazówkami na dolnym pasku.');
      }catch(e){notify(`Nie udało się uruchomić tutorialu: ${(e as Error).message}`);}
    };
    if(p.processSteps.length>0&&!p.processSteps.some(s=>s.id.startsWith('ZM-'))){
      confirm('Rozpocząć interaktywny tutorial? Bieżący stan projektu zostanie zabezpieczony w kopii ratunkowej i wczytany zostanie wzorcowy projekt zestawu montażowego.',()=>void launch());
    }else{void launch();}
  };
  const exitTutorial=()=>{
    const close=()=>{
      const next:TutorialProgress={...tutorialProgress,active:false};
      setTutorialProgress(next);
      saveTutorialProgress(next);
      notify('Zakończono interaktywny tutorial.');
    };
    if(tutorialProgress.previousWorkspaceSnapshot){
      confirm('Czy chcesz przywrócić stan projektu sprzed rozpoczęcia tutorialu?',()=>{
        try{
          const payload:WorkspaceBackupPayload=JSON.parse(tutorialProgress.previousWorkspaceSnapshot!);
          restoreWorkspaceBackup(localStorage,payload);
          const next:TutorialProgress={...tutorialProgress,active:false,previousWorkspaceSnapshot:null};
          saveTutorialProgress(next);
          window.location.reload();
        }catch{close();}
      });
    }else{close();}
  };
  const handleGlobalShortcuts=(e:KeyboardEvent|React.KeyboardEvent<HTMLDivElement>)=>{
      if(e.defaultPrevented)return;
      if(workspaceDialogOpen){if((e.ctrlKey||e.metaKey)&&['s','z','y'].includes(e.key.toLowerCase()))e.preventDefault();return;}
      const isCtrlOrMeta=e.ctrlKey||e.metaKey;
      if(!isCtrlOrMeta)return;
      const key=e.key.toLowerCase();
      const active=e.target as HTMLElement;
      const isInput=active&&(active.tagName==='INPUT'||active.tagName==='TEXTAREA'||active.tagName==='SELECT'||active.isContentEditable);
      if(key==='z'&&!e.shiftKey){
        if(!isInput){e.preventDefault();undo();}
      }else if(key==='y'||(key==='z'&&e.shiftKey)){
        if(!isInput){e.preventDefault();redo();}
      }else if(key==='s'){
        e.preventDefault();
        if(writeSave(raw))notify('Zapisano lokalnie. JSON pozwala przenieść projekt.');
      }
    };
  useEffect(()=>{
    // Portals bubble through React. Retain global shortcuts when the main document body has focus.
    const handleOutsideRoot=(e:KeyboardEvent)=>{
      if(e.target instanceof Node&&document.getElementById('root')?.contains(e.target))return;
      handleGlobalShortcuts(e);
    };
    window.addEventListener('keydown',handleOutsideRoot);
    return()=>window.removeEventListener('keydown',handleOutsideRoot);
  },[raw,past,future,allowSave,importSourceBase64,workspaceDialogOpen]);
  useEffect(()=>{
    const surfaces=document.querySelectorAll<HTMLElement>('.studio > header, .studio > nav, .studio > main, .studio > .save-bar, .studio > .notice');
    surfaces.forEach(surface=>{surface.inert=workspaceDialogOpen;});
    return()=>surfaces.forEach(surface=>{surface.inert=false;});
  },[workspaceDialogOpen]);
  const errorArea=(areas:string[])=>issues.some(i=>i.severity==='error'&&areas.includes(i.area));
  const ready:Record<string,boolean>={demand:!errorArea(['demand']),process:!!p.processSteps.length&&!errorArea(['process']),flow:!!p.processSteps.length&&!errorArea(['process']),bom:!errorArea(['bom']),balance:!!b?.workstations.length&&!b.workstations.some(s=>s.isBottleneck),layout:!!p.layoutObjects.length&&!issues.some(i=>['facility','layout'].includes(i.area)),simulation:!!b?.workstations.length,report:!!b?.workstations.length&&!issues.length};
  const exportBalance=()=>{if(!b)return;spreadsheet(b.workstations.map(s=>({'Stanowisko':s.id,'Operacje':s.assignedStepIds.join(', '),'Cykl zespołu [s]':s.cycleTimeSeconds,'Kopie':s.parallelStations??1,'Obsada na kopię':s.operators??1,'Odstęp zdolności [s]':effectiveCycle(s),'Cel [s]':b.taktTimeSeconds,'Obciążenie [%]':effectiveCycle(s)/b.taktTimeSeconds*100,'Status':s.isBottleneck?'PRZEKROCZENIE':'W NORMIE'})),`${filename(p)}_Bilans`,'csv');markExport('balance');notify('Przekazano raport bilansu CSV do pobrania.');};
  const staleExports=(Object.keys(exportLabels) as (keyof typeof exportLabels)[]).filter(kind=>exportRecords[kind]&&!isExportCurrent(kind)).map(kind=>exportLabels[kind]);
  return <div className="studio" onKeyDown={handleGlobalShortcuts}>
  <AppHeader name={raw.name} canUndo={!!past.length} canRedo={!!future.length} onUndo={undo} onRedo={redo}
    onSave={()=>{if(writeSave(raw))notify('Zapisano lokalnie. JSON pozwala przenieść projekt.');}}
    projectActions={[
      {label:'Dane projektu i jednostki',onSelect:()=>setSettingsOpen(true)},
      {label:'Nowy projekt',onSelect:()=>replace(newProject())},
      {label:'Otwórz projekt JSON lub archiwum',onSelect:()=>file.current?.click()},
      {label:'Pakiet projektu',onSelect:()=>{if(allowSave)writeSave(raw,importSourceBase64);setIsPackageModalOpen(true);}},
      {label:'Kopie i odzyskiwanie',onSelect:()=>{if(allowSave)writeSave(raw,importSourceBase64);setIsBackupModalOpen(true);}},
      {label:'Warianty projektu głównego',onSelect:()=>setTab('dashboard')},
    ]}
    exportActions={[
      {label:'Eksport JSON',onSelect:json},
      {label:'Eksport archiwum v4',onSelect:portableJson},
      {label:'Pobierz pierwotny import',disabled:!importSourceBase64,onSelect:()=>download(archivedImportBlob(importSourceBase64),'Pierwotnie_importowany_projekt.json')},
      {label:'Eksport DXF',disabled:!p.layoutObjects.length,onSelect:dxf},
    ]}
    settingsActions={[
      {label:'Dane projektu i jednostki',onSelect:()=>setSettingsOpen(true)},
      {label:'Interaktywny tutorial',onSelect:startTutorial},
      {label:'Słownik i założenia',onSelect:()=>{setTab('dashboard');requestAnimationFrame(()=>document.getElementById('project-glossary')?.scrollIntoView({block:'start'}));}},
      {label:'Raport projektu głównego',onSelect:()=>setTab('report')},
    ]}/>

  <div className="save-bar"><span className={saveError?'shell-save-error':''}>{saveError||(dirty?'Niezapisane zmiany…':'Zapisano lokalnie')}</span><span className="shell-source">{tab==='stations'?'Obszar stanowisk — osobne dokumenty i wyniki':'Źródło widoku: projekt główny'}</span><details><summary>Szczegóły zapisu i eksportów</summary><p>{savedAt?'Zapis lokalny: '+new Date(savedAt).toLocaleString('pl-PL'):'Oczekiwanie na zapis'}</p><span className={exportRecords.json&&!isExportCurrent('json')?'bad':''}>Eksport JSON w sesji: {exportRecords.json?`${new Date(exportRecords.json.at).toLocaleTimeString('pl-PL')} · ${isExportCurrent('json')?'aktualny':'nieaktualny — pobierz ponownie'}`:'—'}</span></details>{staleExports.length>0&&<span className="bad">Pobierz ponownie: {staleExports.join(', ')}</span>}{printRequest&&printRequest.project!==raw&&<span className="bad">Dane zmienione od ostatniego wywołania drukowania — uruchom druk ponownie.</span>}</div>
  {!allowSave&&<div className="notice"><button onClick={()=>{const original=localStorage.getItem(KEY);if(original===null){notify('Nie znaleziono zapisu do pobrania.');return;}download(original,initial.recoveryKind==='legacy'?'Starszy_zapis_lokalny.json':'Odzyskiwanie_zapisu.json','application/json');setRecoveryDownloaded(true);}}>{initial.recoveryKind==='legacy'?'Pobierz starszy zapis':'Pobierz kopię odzyskiwania'}</button><button disabled={initial.recoveryKind==='legacy'&&!recoveryDownloaded} onClick={()=>confirm(initial.recoveryKind==='legacy'?'Zastąpić starszy zapis lokalny projektem w schemacie 4? Upewnij się, że pobrana kopia jest dostępna.':'Zezwolić na zastąpienie uszkodzonego zapisu bieżącym projektem?',()=>setAllowSave(true))}>{initial.recoveryKind==='legacy'?'Potwierdź migrację i zapis':'Włącz zapis'}</button></div>}
  <AppNavigation view={tab} onChange={setTab} ready={ready}/>
  {message&&<div className="message" role="status"><span>{message}</span><button aria-label="Zamknij komunikat" onClick={()=>setMessage('')}>×</button></div>}
  <main>
  {tab==='dashboard'&&<section className="page"><p className="eyebrow">PROJEKTOWANIE LINII PRODUKCYJNYCH</p><h1>{p.name}</h1><p className="muted">Od popytu do bilansu operacji, planu hali i symulacji partii.</p>{!p.processSteps.length&&<p className="notice" role="note">Projekt jest pusty. Wczytaj pakiet pokazowy lub własne pliki procesu i BOM. Początkowe parametry hali i popytu są ustawieniami domyślnymi — sprawdź je przed analizą.</p>}<div className="cards"><button className="action-card tutorial-action-card" onClick={startTutorial} style={{borderLeft: '4px solid #3b82f6'}}><strong>Rozpocznij interaktywny tutorial</strong><span>Krok po kroku: od popytu i bilansu do symulacji i raportu.</span></button><button className="action-card" onClick={()=>replace(newProject())}><strong>Rozpocznij od zera</strong><span>Pusty proces i BOM, własne założenia.</span></button><button className="action-card" onClick={()=>{if(allowSave)writeSave(raw,importSourceBase64);setIsPackageModalOpen(true);}}><strong>Wczytaj pakiet projektu</strong><span>Własny projekt lub zewnętrzny przykład z wariantami.</span></button><button className="action-card" onClick={()=>file.current?.click()}><strong>Importuj projekt JSON lub archiwum v4</strong><span>Wczytaj kopię przenośną z walidacją.</span></button><button className="action-card" onClick={()=>setIsBackupModalOpen(true)}><strong>Kopia i odzyskiwanie (.lsbackup)</strong><span>Utwórz pełny backup środowiska lub odzyskaj stan po awarii.</span></button></div>
  <div className="metrics"><Metric label="Operacje" value={String(p.processSteps.length)}/><Metric label="Pracochłonność" value={`${formatTimeWithUnit(b?.totalWorkContentSeconds, unit)}/szt.`}/><Metric label="Stanowiska" value={String(b?.actualWorkstationsCount??0)}/><Metric label="Materiały" value={String(p.bom.length)}/></div>
  <DemoCatalog onImport={()=>{if(allowSave)writeSave(raw,importSourceBase64);setIsPackageModalOpen(true);}}/><h2>Warianty projektu</h2><p className="muted">Zapisuj wariant przed zmianą popytu lub organizacji linii. Warianty pozostają w tej przeglądarce; JSON służy do archiwizacji. Zapisany wariant jest osobną migawką — późniejsze zmiany bieżącego projektu nie zmieniają jego JSON.</p><div className="toolbar"><input aria-label="Nazwa wariantu" value={scenarioName} onChange={e=>setScenarioName(e.target.value)}/><button onClick={saveScenario}>Zapisz wariant</button></div><div className="table-wrap"><table><thead><tr><th>Wariant</th><th>Cel cyklu [{unit}]</th><th>Stacje</th><th>Sprawność</th><th>Układ</th><th>Akcje</th></tr></thead><tbody>{library.map(s=>{let q:ProjectData|undefined;try{q=derive(s.project).project;}catch{}return <tr key={s.id}><td>{s.name}<small>{new Date(s.at).toLocaleString('pl-PL')}</small></td><td>{formatTimeValue(q?.balancing?.taktTimeSeconds, unit)}</td><td>{q?.balancing?.actualWorkstationsCount??'—'}</td><td>{fmt(q?.balancing?.lineEfficiencyPercent)}%</td><td>{q?.targetLayoutType}</td><td><button onClick={()=>{try{replace(parseProject(JSON.stringify(s.project)));}catch(e){notify((e as Error).message);}}}>Wczytaj</button><button onClick={()=>exportScenario(s)}>JSON</button><button className="danger" onClick={()=>confirm(`Usunąć wariant ${s.name}?`,()=>{try{const next=library.filter(x=>x.id!==s.id);localStorage.setItem(LIBRARY,JSON.stringify(next));setLibrary(next);}catch{notify('Błąd pamięci lokalnej.');}})}>Usuń</button>{scenarioExportIds.includes(s.id)&&<small role="status">JSON przekazany do pobrania w tej sesji · migawka wariantu</small>}</td></tr>;})}</tbody></table></div>
  <h2 id="project-glossary">Słownik i założenia</h2><div className="help-grid">{help.map(([term,desc])=><details key={term}><summary>{term}</summary><p>{desc}</p></details>)}</div></section>}
  {tab==='demand'&&<section className="page"><h1>Popyt i organizacja pracy</h1><p className="muted">Ustal wymagania klienta, dostępny czas pracy i rezerwę OEE.</p><div className="panel form-grid">{([['yearlyDemand','Popyt roczny [szt.]',1,1000000000],['workingDaysPerYear','Dni robocze w roku',1,366],['shiftsPerDay','Liczba zmian na dobę',1,3],['hoursPerShift','Godziny na zmianę',.01,24],['plannedBreaksMinutesPerShift','Przerwy na zmianę [min]',0,1440],['oeePercent','OEE / dostępność [%]',.01,100]] as const).map(([key,label,min,max])=><NumberField key={key} label={label} min={min} max={max} step={key==='workingDaysPerYear'||key==='shiftsPerDay'?'1':'any'} value={p.demand[key]} onChange={v=>change({...p,demand:{...p.demand,[key]:v}})}/>)}</div><div className="metrics"><Metric label="Popyt dzienny" value={`${fmt(t.dailyDemand)} szt.`}/><Metric label="Takt klienta" value={`${formatTimeWithUnit(t.customerTaktSeconds, unit)}/szt.`} hint="Czas po przerwach / popyt"/><Metric label="Cel cyklu po OEE" value={`${formatTimeWithUnit(t.taktTimeSeconds, unit)}/szt.`} hint="Takt × OEE; cel bilansu"/><Metric label="Tempo efektywne" value={`${fmt(t.requiredPartsPerHour)} szt./h`}/></div><div style={{display:'flex',gap:'1rem',alignItems:'flex-end'}}><label className="field">Waluta kosztów BOM<select value={p.currency??'USD'} onChange={e=>change({...p,currency:e.target.value as ProjectData['currency']})}>{['PLN','EUR','USD'].map(v=><option key={v}>{v}</option>)}</select></label><label className="field">Jednostka czasu prezentacji<select aria-label="Jednostka czasu prezentacji" value={p.timeUnit??'s'} onChange={e=>change({...p,timeUnit:e.target.value as TimeUnit})}>{TIME_UNITS.map(u=><option key={u.value} value={u.value}>{u.label}</option>)}</select></label></div><p className="muted">Zmiana waluty zmienia oznaczenie, nie przelicza cen. Zmiana jednostki czasu przelicza pola i wskaźniki bez modyfikacji bazowych sekund w modelu. OEE jest założeniem planistycznym.</p></section>}
  {(tab==='process'||tab==='bom')&&<DataEditor key={`${tab}-${p.id}`} kind={tab} project={p} change={change} notify={notify} confirm={confirm} onExport={format=>markExport(dataExportKind(tab,format))} exportStatus={{xlsx:dataExportStatus(tab,'xlsx'),csv:dataExportStatus(tab,'csv')}}/>}
  {tab==='flow'&&<section className="page"><div className="toolbar" style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}><h1>Przepływ procesu</h1><button onClick={()=>setPopoutView('flow')} title="Otwórz diagram przepływu procesu w osobnym oknie monitora (Plan 6.7)">⧉ Otwórz w osobnym oknie</button></div>{popoutView==='flow'?<div className="panel" style={{textAlign:'center',padding:'2rem'}}><p>Widok przepływu procesu jest otwarty w osobnym oknie monitora.</p><button className="primary" onClick={()=>setPopoutView(null)}>Przywróć do okna głównego</button></div>:<ProcessFlow project={p} change={change} confirm={confirm}/>}</section>}
  {tab==='balance'&&<section className="page"><h1>Bilansowanie i Yamazumi</h1><p className="muted">Obsada i równoległe kopie są edytowalne. Operacje niepodzielne. Heurystyki respektują zależności, lecz nie gwarantują minimum globalnego.</p><div className="toolbar"><label>Metoda <select aria-label="Metoda bilansowania" value={p.algorithm??'RPW'} onChange={e=>{const algorithm=e.target.value as ProjectData['algorithm'];const steps=algorithm==='Manual'?p.processSteps.map(s=>({...s,assignedWorkstationId:b?.workstations.find(w=>w.assignedStepIds.includes(s.id))?.id??s.assignedWorkstationId})):p.processSteps;change({...p,algorithm,processSteps:steps});}}><option value="RPW">RPW — wagi pozycyjne</option><option value="LCR">LCR — najdłuższe operacje</option><option value="Manual">Ręczne przypisanie</option></select></label><button disabled={!b} onClick={exportBalance}>Eksport bilansu CSV</button></div>
  {p.algorithm==='Manual'&&<details className="panel"><summary>Zaawansowane przypisania ręczne</summary><p>Stanowiska od 1, bez luk. Poprzednik nie może być na późniejszej stacji.</p><div className="form-grid">{p.processSteps.map(s=><NumberField key={s.id} label={`${s.id} — ${s.name}`} min={1} max={p.processSteps.length} step="1" value={Number(s.assignedWorkstationId?.replace('WS-',''))||1} onChange={v=>change({...p,processSteps:p.processSteps.map(x=>x.id===s.id?{...x,assignedWorkstationId:`WS-${v}`} :x)})}/>)}</div></details>}
  {!b?.workstations.length?<p className="empty">Dodaj poprawne operacje i ustaw popyt. Błędy znajdziesz poniżej.</p>:<><div className="metrics"><Metric label="Stanowiska" value={String(b.actualWorkstationsCount)} hint={`Obsada: ${b.workstations.reduce((n,s)=>n+(s.operators??1)*(s.parallelStations??1),0)} osób. Minimum bazowe: ${b.theoreticalMinWorkstations}`}/><Metric label="Sprawność bilansu" value={`${fmt(b.lineEfficiencyPercent)}%`} hint="Suma cykli zespołów / (kopie × max(cel, odstęp zdolności))"/><Metric label="Odstęp wąskiego gardła" value={formatTimeWithUnit(b.bottleneckCycleTimeSeconds, unit)}/><Metric label="Zdolność efektywna" value={`${fmt(t.netOperatingSecondsPerDay/b.bottleneckCycleTimeSeconds)} szt./dzień`}/></div>
  <button onClick={()=>confirm("Przypisać każdą operację do osobnego stanowiska? Dotychczasowe grupowanie zostanie zastąpione.",()=>change({...p,algorithm:"Manual",processSteps:topologicalSort(p.processSteps).map((s,i)=>({...s,assignedWorkstationId:`WS-${i+1}`}))}))}>Każda operacja osobno — zachowaj gałęzie</button><BalancingBoard project={p} change={change}/><ResourceEditor project={p} change={change}/>
  <h2>Wąskie gardła</h2>{b.workstations.some(s=>s.isBottleneck)?b.workstations.filter(s=>s.isBottleneck).map(s=><p className="error" key={s.id}>{s.name}: +{formatTimeWithUnit(effectiveCycle(s)-b.taktTimeSeconds, unit)} ponad cel. Zmniejsz czas, rozdziel operację technologicznie lub przeanalizuj obsadę.</p>):<p className="success">Każde stanowisko mieści się w docelowym cyklu.</p>}
  <details><summary>Porównaj RPW i LCR</summary><div className="metrics">{(['RPW','LCR'] as const).map(a=>{try{const r=runLineBalancing(p.processSteps,t.taktTimeSeconds,a);return <Metric key={a} label={a} value={`${r.actualWorkstationsCount} stacji`} hint={`Sprawność ${fmt(r.lineEfficiencyPercent)}%`}/>;}catch{return null;}})}</div></details></>}
  </section>}
  {tab==='layout'&&<><div className="layout-choice" style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}><label>Typ układu <select aria-label="Typ układu" value={p.targetLayoutType} onChange={e=>{const targetLayoutType=e.target.value as ProjectData['targetLayoutType'];if(p.layoutMode==='manual')confirm('Zmiana typu zastąpi ręczne pozycje. Kontynuować?',()=>change({...p,targetLayoutType,layoutMode:'auto'}));else change({...p,targetLayoutType});}}><option value="ProcessFlow">Z procesu — gałęzie / rybia ość</option><option value="UShape">U-Shape</option><option value="Linear">Liniowy</option><option value="LShape">L-Shape</option></select></label><button onClick={()=>setPopoutView('layout')} title="Otwórz edytor CAD hali w osobnym oknie monitora (Plan 6.7)">⧉ Otwórz CAD w osobnym oknie</button></div>{popoutView==='layout'?<div className="panel" style={{textAlign:'center',padding:'2rem'}}><p>Edytor CAD hali jest otwarty w osobnym oknie monitora.</p><button className="primary" onClick={()=>setPopoutView(null)}>Przywróć do okna głównego</button></div>:<LayoutEditor project={p} change={change} confirm={confirm} selectedIds={selectedLayoutObjectIds} onSelect={setSelectedLayoutObjectIds} simulation={errorArea(['demand','process','facility','layout'])||!b?.workstations.length?undefined:<Simulation key={JSON.stringify([p.processSteps,p.demand,p.algorithm,p.workstationSettings])} project={p} notify={notify} onActive={setActiveRuns} onPlaybackChange={setSimulationPlayback} controlCommand={simulationCommand} exportedResultKey={simulationExportKey} onExportResult={setSimulationExportKey}/>}/>}</>}
  {tab==='simulation'&&<SimulationWorkspace actions={(!errorArea(['demand','process','facility','layout'])&&!!b?.workstations.length)&&<button onClick={()=>setPopoutView('simulation')} title="Otwórz widok 3D i symulację w osobnym oknie monitora (Plan 6.7)">⧉ Otwórz 3D w osobnym oknie</button>}>{errorArea(['demand','process','facility','layout'])||!b?.workstations.length?<><p className="empty">Najpierw popraw proces, popyt i halę. Symulacja wymaga poprawnego bilansu.</p>{simulationExportKey&&<p className="error" role="status">Nie można potwierdzić aktualności pobranego CSV symulacji. Po poprawieniu danych sprawdź wynik i pobierz raport ponownie.</p>}</>:<>{popoutView==='simulation'?<div className="panel" style={{textAlign:'center',padding:'2rem'}}><p>Widok hali 3D i symulacja są otwarte w osobnym oknie monitora.</p><button className="primary" onClick={()=>setPopoutView(null)}>Przywróć do okna głównego</button></div>:<><Suspense fallback={<p>Wczytywanie 3D…</p>}><Scene project={p} change={change} activeRuns={activeRuns} selectedIds={selectedLayoutObjectIds} onSelect={setSelectedLayoutObjectIds} simulationPlayback={simulationPlayback} onSimulationCommand={setSimulationCommand}/></Suspense><Simulation compact key={JSON.stringify([p.processSteps,p.demand,p.algorithm,p.workstationSettings])} project={p} notify={notify} onActive={setActiveRuns} onPlaybackChange={setSimulationPlayback} controlCommand={simulationCommand} exportedResultKey={simulationExportKey} onExportResult={setSimulationExportKey}/></>}</>}</SimulationWorkspace>}
  {popoutView==='flow'&&(
    <PopoutWindow title="Przepływ procesu" onClose={()=>setPopoutView(null)}>
      <div style={{height:'100%',padding:'1rem',boxSizing:'border-box',overflow:'auto'}}>
        <ProcessFlow project={p} change={change} confirm={confirm}/>
      </div>
    </PopoutWindow>
  )}
  {popoutView==='layout'&&(
    <PopoutWindow title="Hala i CAD 2D" onClose={()=>setPopoutView(null)}>
      <div style={{height:'100%',display:'flex',flexDirection:'column'}}>
        <LayoutEditor project={p} change={change} confirm={confirm} selectedIds={selectedLayoutObjectIds} onSelect={setSelectedLayoutObjectIds}/>
      </div>
    </PopoutWindow>
  )}
  {popoutView==='simulation'&&(
    <PopoutWindow title="Hala 3D i Symulacja" onClose={()=>setPopoutView(null)}>
      <SimulationWorkspace>
        <Suspense fallback={<p>Wczytywanie 3D…</p>}>
          <Scene project={p} change={change} activeRuns={activeRuns} selectedIds={selectedLayoutObjectIds} onSelect={setSelectedLayoutObjectIds} simulationPlayback={simulationPlayback} onSimulationCommand={setSimulationCommand}/>
        </Suspense>
        <Simulation compact key={JSON.stringify([p.processSteps,p.demand,p.algorithm,p.workstationSettings])} project={p} notify={notify} onActive={setActiveRuns} onPlaybackChange={setSimulationPlayback} controlCommand={simulationCommand} exportedResultKey={simulationExportKey} onExportResult={setSimulationExportKey}/>
      </SimulationWorkspace>
    </PopoutWindow>
  )}
  {tab==='report'&&<section className="page"><div className="report-header-toolbar"><h1>Raport i przekazanie projektu</h1><p>Sprawdź kontrolę projektu poniżej. JSON zachowuje dane i ustawienia, DXF zawiera geometrię w mm wraz z przeszkodami.</p><div className="toolbar"><button onClick={json}>Kompletny projekt JSON</button><button disabled={!p.layoutObjects.length} onClick={dxf}>Rzut DXF</button><button disabled={!b} onClick={exportBalance}>Bilans CSV</button><button onClick={()=>{download(engineeringReport(p,issues),`${filename(p)}_Raport.md`);markExport('report');notify('Przekazano edytowalny raport Markdown do pobrania.');}}>Raport inżynierski MD</button><button className="primary" onClick={printReport}>Drukuj / zapisz PDF</button></div>{printRequest&&<p role="status" className={printRequest.project===raw?'muted':'bad'}>{printRequest.project===raw?`Wywołano drukowanie dla tej wersji o ${new Date(printRequest.at).toLocaleTimeString('pl-PL')}. Sprawdź w przeglądarce, czy PDF został zapisany.`:'Dane zmieniły się od ostatniego wywołania drukowania. Drukuj ponownie i sprawdź zapis PDF.'}</p>}</div><EngineeringReportView project={p} issues={issues} rawMarkdown={engineeringReport(p,issues)} /></section>}
  {tab==='stations'&&<StationWorkspace legacyProject={raw} legacyImportSourceBase64={importSourceBase64} simulationExportKey={stationSimulationExportKey} onSimulationExport={setStationSimulationExportKey} exportSnapshots={stationExportSnapshots} onExportSnapshot={markStationExport}/>}
  {tab!=='stations'&&<section className="validation"><details open={issues.some(i=>i.severity==='error')}><summary>Kontrola projektu — {issues.filter(i=>i.severity==='error').length} błędów, {issues.filter(i=>i.severity==='warning').length} ostrzeżeń</summary>{!issues.length?<p className="success">Nie wykryto błędów danych ani kolizji wyposażenia.</p>:<ul>{issues.map((i,n)=><li key={n} className={i.severity==='error'?'bad':'warn'}>{i.message}</li>)}</ul>}</details></section>}
  {tab!=='stations'&&<div className="footer-nav">{tab!=='dashboard'&&<button onClick={()=>setTab(tabs[Math.max(0,tabs.findIndex(t=>t[0]===tab)-1)][0])}>← Poprzedni etap</button>}{tab!=='report'&&<button className="primary" onClick={()=>setTab(tabs[tabs.findIndex(t=>t[0]===tab)+1][0])}>Następny etap →</button>}</div>}
  </main><input ref={file} hidden type="file" accept=".json" onChange={e=>{if(e.target.files?.[0])void importJson(e.target.files[0]);e.target.value='';}}/>
  <dialog ref={dialog} onCancel={()=>setModal(null)} aria-labelledby="confirm-title"><h2 id="confirm-title">Potwierdź zmianę</h2><p>{modal?.message}</p><div className="toolbar"><button autoFocus onClick={()=>setModal(null)}>Anuluj</button><button className="primary" onClick={()=>{const action=modal?.action;setModal(null);action?.();}}>Potwierdź</button></div></dialog>
  <dialog ref={settingsDialog} className="shell-settings" aria-labelledby="project-settings-title" onCancel={()=>setSettingsOpen(false)} onClose={()=>setSettingsOpen(false)}>
    <h2 id="project-settings-title">Dane projektu głównego</h2><small>Te ustawienia dotyczą projektu głównego. Dokumenty stanowisk i warianty mają własne dane.</small>
    <label>Nazwa projektu<input aria-label="Nazwa projektu" value={raw.name} onChange={e=>change({...raw,name:e.target.value})}/></label>
    <label>Jednostka czasu<select aria-label="Jednostka czasu" value={p.timeUnit??'s'} onChange={e=>change({...p,timeUnit:e.target.value as TimeUnit})}>{TIME_UNITS.map(u=><option key={u.value} value={u.value}>{u.label}</option>)}</select></label>
    <div className="toolbar"><button onClick={()=>setSettingsOpen(false)}>Zamknij ustawienia</button></div>
  </dialog>
  <ProjectPackageModal unsavedChanges={(dirty||!!saveError)&&!isExportCurrent('json')} isOpen={isPackageModalOpen} onClose={()=>setIsPackageModalOpen(false)} onImported={()=>{workspaceRestored.current=true;}} />
  <WorkspaceBackupModal unsavedChanges={(dirty||!!saveError)&&!isExportCurrent('json')} isOpen={isBackupModalOpen} onClose={()=>setIsBackupModalOpen(false)} onRestored={()=>{workspaceRestored.current=true;}} />
  <TutorialOverlay
    progress={tutorialProgress}
    onChangeProgress={setTutorialProgress}
    currentTab={tab}
    onNavigateTab={setTab}
    onExitTutorial={exitTutorial}
  />
  </div>;
}
export default App;
