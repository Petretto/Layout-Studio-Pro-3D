import React,{useEffect,useRef,useState} from 'react';
import {download} from '../../core/project';
import {describeProjectPackage,importProjectPackage,makeProjectPackage,parseProjectPackage,MAX_PROJECT_PACKAGE_BYTES,type PackageOrigin,type ProjectPackage} from '../../core/projectPackage';
import {createWorkspaceBackup,WorkspaceRestoreError} from '../../core/workspaceBackup';
import {WorkspaceBackupModal} from './WorkspaceBackupModal';

export function ProjectPackageModal({isOpen,onClose,onImported,unsavedChanges=false}:{isOpen:boolean;onClose:()=>void;onImported:()=>void;unsavedChanges?:boolean}){
  const [origin,setOrigin]=useState<PackageOrigin>('unspecified'),[source4,setSource4]=useState<string>();
  const [pkg,setPkg]=useState<ProjectPackage|null>(null),[message,setMessage]=useState('');
  const [snapshot,setSnapshot]=useState<string|null>(null),[confirmed,setConfirmed]=useState(false);
  const [recovery,setRecovery]=useState<string|null>(null),[locked,setLocked]=useState(false),[busy,setBusy]=useState(false);
  const [recoveryMode,setRecoveryMode]=useState(false);
  const readId=useRef(0),sourceId=useRef(0),dialog=useRef<HTMLDivElement>(null);
  useEffect(()=>{
    readId.current++;sourceId.current++;
    if(isOpen){setOrigin('unspecified');setSource4(undefined);setPkg(null);setMessage('');setSnapshot(null);setConfirmed(false);setRecovery(null);setLocked(false);setBusy(false);setRecoveryMode(false);dialog.current?.focus();}
    return()=>{readId.current++;sourceId.current++;};
  },[isOpen]);
  if(!isOpen)return null;
  if(recoveryMode)return <WorkspaceBackupModal isOpen onClose={()=>setRecoveryMode(false)} onRestored={onImported}/>;
  const fail=(e:unknown)=>setMessage((e as Error).message);
  const read=async(event:React.ChangeEvent<HTMLInputElement>,original=false)=>{
    const file=event.target.files?.[0];event.target.value='';
    const token=original?++sourceId.current:++readId.current;
    if(original)setSource4(undefined);else {setPkg(null);setSnapshot(null);setConfirmed(false);}
    setMessage('');if(!file)return;
    try{
      if(file.size>MAX_PROJECT_PACKAGE_BYTES)throw new Error('Plik przekracza 25 MB.');
      const text=await file.text();
      if(token!==(original?sourceId.current:readId.current))return;
      if(original){setSource4(text);setMessage(`Dołączono oryginał: ${file.name}. Zostanie sprawdzony przy eksporcie.`);}
      else {setPkg(parseProjectPackage(text));setMessage('Pakiet poprawny. Integralność SHA-256 potwierdzona.');}
    }catch(e){if(token===(original?sourceId.current:readId.current))fail(e);}
  };
  const exportPackage=()=>{try{
    const value=makeProjectPackage(localStorage,{dataOrigin:origin,source4Json:source4});
    download(JSON.stringify(value),'Projekt_Layout_Studio.project.json','application/json');
    setMessage(`Przekazano pakiet „${describeProjectPackage(value).name}” do pobrania. Sprawdź zapisany plik.`);
  }catch(e){fail(e);}};
  const rescue=()=>{try{
    const value=JSON.stringify(createWorkspaceBackup(localStorage),null,2);
    download(value,`Przed_importem_pakietu_${Date.now()}.lsbackup.json`,'application/json');
    setSnapshot(value);setConfirmed(false);setMessage('Przekazano kopię ratunkową do pobrania. Sprawdź plik i potwierdź poniżej.');
  }catch(e){setSnapshot(null);setConfirmed(false);fail(e);}};
  const accept=()=>{
    if(!pkg||!snapshot||!confirmed||busy||unsavedChanges)return;
    setBusy(true);
    try{importProjectPackage(localStorage,pkg,snapshot);onImported();window.location.reload();}
    catch(e){if(e instanceof WorkspaceRestoreError){setRecovery(e.rollbackSnapshot);if(e.rollbackErrors.length)setLocked(true);}setSnapshot(null);setConfirmed(false);setBusy(false);fail(e);}
  };
  const info=pkg?describeProjectPackage(pkg):null;
  return <div ref={dialog} role="dialog" aria-modal="true" aria-label="Pakiet projektu" tabIndex={-1} className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4">
    <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-xl bg-slate-900 border border-slate-600 text-slate-100 p-6 space-y-4">
      <h2 className="text-lg font-bold">Wczytaj lub wyeksportuj pakiet projektu</h2>
      <p className="text-sm text-slate-300">Pakiet projektu (<code>.project.json</code>) zawiera kompletny model linii: operacje, czasy, relacje poprzedników, rozmieszczenie stanowisk na hali (CAD 2D i 3D) oraz warianty reorganizacji.</p>
      {unsavedChanges&&<p role="alert" className="text-amber-300 text-sm">Zachowaj niezapisane zmiany przez zapis lub eksport JSON przed wczytaniem nowego projektu.</p>}
      {locked&&<p role="alert">Wycofanie nie zostało potwierdzone. Edycja i zamknięcie pozostają zablokowane. Pobierz stan sprzed błędu; po usunięciu przyczyny odtwórz pełną kopię ratunkową lub wczytaj poprawny pakiet.</p>}
      {recovery&&<button onClick={()=>download(recovery,'Stan_przed_bledem_pakietu.lsbackup.json','application/json')}>Pobierz stan sprzed błędu</button>}
      {locked&&<button onClick={()=>setRecoveryMode(true)}>Odtwórz pełną kopię ratunkową</button>}
      {message&&<p role="status" className="border border-slate-600 rounded p-3 text-sm">{message}</p>}

      <section className="space-y-3 border-t border-slate-700 pt-3">
        <h3 className="font-semibold text-sky-400">1. Wczytaj pakiet z pliku</h3>
        <p className="text-xs text-slate-400">Wskaż plik <code>.project.json</code> pobrany z katalogu przykładów lub otrzymany od innego inżyniera.</p>
        <label className="block text-sm">Plik pakietu (do 25 MB)<input aria-label="Plik pakietu projektu" type="file" accept=".json,.project.json" disabled={busy} onChange={e=>void read(e)}/></label>
        {info&&pkg&&<div className="space-y-3 bg-slate-800/60 p-3 rounded-lg border border-slate-700">
          <p className="text-sm"><strong>{info.name}</strong> · ID: {info.id}<br/>Operacje: {info.operations} · Stanowiska: {info.stations} · Obsada: {info.workers} os. · Warianty: {info.variants}<br/>Kwalifikacja danych: {info.dataOrigin}</p>
          <p className="text-amber-300 text-xs">Wczytanie pakietu zastąpi bieżący projekt, stanowiska oraz warianty. Przed wczytaniem zostanie utworzona automatyczna kopia ratunkowa.</p>
          <button disabled={busy} onClick={rescue}>Pobierz kopię ratunkową przed wczytaniem</button>
          <label className="flex gap-2 text-xs items-center"><input type="checkbox" checked={confirmed} disabled={!snapshot||busy} onChange={e=>setConfirmed(e.target.checked)}/>Potwierdzam pobranie kopii i wczytanie wybranego pakietu.</label>
          <button className="primary" style={{backgroundColor:'#2563eb',color:'#ffffff',fontWeight:600}} disabled={!snapshot||!confirmed||busy||unsavedChanges} onClick={accept}>Wczytaj projekt i zastosuj</button>
        </div>}
      </section>

      <section className="space-y-3 border-t border-slate-700 pt-3">
        <h3 className="font-semibold text-slate-300">2. Eksportuj bieżący projekt jako pakiet</h3>
        <p className="text-xs text-slate-400">Pobierz aktualny stan projektu jako pojedynczy plik przenośny do późniejszego wczytania lub przesłania innemu użytkownikowi.</p>
        <label className="block text-sm">Kwalifikacja danych <select aria-label="Pochodzenie danych" value={origin} onChange={e=>setOrigin(e.target.value as PackageOrigin)}>
          <option value="unspecified">Nieokreślone</option><option value="synthetic">Syntetyczne / pokazowe</option><option value="user">Dane użytkownika / pomiary</option><option value="mixed">Mieszane</option>
        </select></label>
        <button disabled={busy||locked} onClick={exportPackage}>Pobierz pakiet projektu (.project.json)</button>
      </section>

      <div className="pt-2 border-t border-slate-700 flex justify-end">
        <button disabled={locked||busy} onClick={onClose}>Zamknij okno</button>
      </div>
    </div>
  </div>;
}
