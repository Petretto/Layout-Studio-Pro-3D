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
      if(original){setSource4(text);setMessage(`Dołączono oryginał 4: ${file.name}. Zostanie sprawdzony przy eksporcie.`);}
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
      <h2 className="text-lg font-bold">Pakiet projektu</h2>
      <p>Jeden plik: źródło 4, opcjonalne stanowiska 5, zapisany szkic 6 i jego warianty. Eksport dotyczy rodziny zapisanego szkicu 6. Biblioteka scenariuszy 4 pozostaje bez zmian.</p>
      <p className="text-amber-300">Szkic może wymagać uzupełnienia przed symulacją. Ustawienia sesji (np. partia i tryb JIT) ustaw ponownie jawnie. Główne widoki 4 i szkic 6 pozostają odrębnymi modelami — integracja widoków jest w planie A2.</p>
      {unsavedChanges&&<p role="alert">Zachowaj niezapisane zmiany przez zapis lub eksport JSON przed importem.</p>}
      {locked&&<p role="alert">Wycofanie nie zostało potwierdzone. Edycja i zamknięcie pozostają zablokowane. Pobierz stan sprzed błędu; po usunięciu przyczyny odtwórz pełną kopię ratunkową lub wczytaj poprawny pakiet.</p>}
      {recovery&&<button onClick={()=>download(recovery,'Stan_przed_bledem_pakietu.lsbackup.json','application/json')}>Pobierz stan sprzed błędu</button>}
      {locked&&<button onClick={()=>setRecoveryMode(true)}>Odtwórz pełną kopię ratunkową</button>}
      {message&&<p role="status" className="border border-slate-600 rounded p-3">{message}</p>}
      <section className="space-y-3 border-t border-slate-700 pt-3"><h3>Eksport zapisanego projektu</h3>
        <label className="block">Pochodzenie danych <select aria-label="Pochodzenie danych" value={origin} onChange={e=>setOrigin(e.target.value as PackageOrigin)}>
          <option value="unspecified">Nieokreślone</option><option value="synthetic">Syntetyczne / pokazowe</option><option value="user">Dane użytkownika</option><option value="mixed">Mieszane</option>
        </select></label>
        <label className="block">Oryginalny plik 4 (tylko gdy brakuje go dla źródła 5)<input aria-label="Oryginał 4 do pakietu" type="file" accept=".json" disabled={busy||locked} onChange={e=>void read(e,true)}/></label>
        <button disabled={busy||locked} onClick={exportPackage}>Pobierz pakiet projektu</button>
      </section>
      <section className="space-y-3 border-t border-slate-700 pt-3"><h3>Import z podglądem</h3>
        <label className="block">Plik pakietu (do 25 MB)<input aria-label="Plik pakietu projektu" type="file" accept=".json,.project.json" disabled={busy} onChange={e=>void read(e)}/></label>
        {info&&pkg&&<div className="space-y-3"><p><strong>{info.name}</strong> · ID: {info.id}<br/>Źródło: {info.sourceSchemaVersion} · Operacje: {info.operations} · Stanowiska: {info.stations} · Osoby: {info.workers} · Warianty: {info.variants}<br/>Pochodzenie: {info.dataOrigin} · Schemat szkicu: 6</p>
          <p className="text-amber-300">Import zastąpi projekt 4, warsztat 5, szkic 6 i bibliotekę wariantów 6. {pkg.data.source5Json===null?'Brak źródła 5: poprzedni warsztat 5 zostanie usunięty. ':''}{pkg.data.variantsRaw===null?'Brak biblioteki 6: poprzednie warianty 6 zostaną usunięte.':''} Scenariusze 4 i pozostałe dane przeglądarki pozostaną zachowane. Aplikacja przeładuje się; Cofnij nie odwraca importu — służy do tego kopia ratunkowa.</p>
          <button disabled={busy} onClick={rescue}>Pobierz kopię ratunkową przed importem</button>
          <label className="flex gap-2"><input type="checkbox" checked={confirmed} disabled={!snapshot||busy} onChange={e=>setConfirmed(e.target.checked)}/>Potwierdzam zapisanie kopii ratunkowej i zastąpienie czterech obszarów projektu.</label>
          <button disabled={!snapshot||!confirmed||busy||unsavedChanges} onClick={accept}>Wczytaj pakiet i przeładuj</button>
        </div>}
      </section>
      <button disabled={locked||busy} onClick={onClose}>Zamknij pakiet projektu</button>
    </div>
  </div>;
}
