import React,{useState} from 'react';
import {download} from '../../core/project';
import {parseProjectPackage,importProjectPackage} from '../../core/projectPackage';
import {createWorkspaceBackup} from '../../core/workspaceBackup';
import './DemoCatalog.css';
type Demo={id:string;title:string;level:string;dataOrigin:string;summary:string;scope:string;version:string;fileCount:number;packagePath:string;archivePath:string;archiveBytes:number;packageSha256:string;archiveSha256:string};
export function DemoCatalog({onImport}:{onImport:()=>void}){
  const [projects,setProjects]=useState<Demo[]|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState('');
  const [downloading,setDownloading]=useState(''),[downloadMessage,setDownloadMessage]=useState('');
  const base=`${import.meta.env.BASE_URL}demo-projects/`;
  async function load(){
    if(busy)return;setBusy(true);setError('');
    try{const response=await fetch(`${base}index.json`);if(!response.ok)throw new Error(`HTTP ${response.status}`);
      const data=await response.json();
      if(data.formatVersion!==1||!Array.isArray(data.projects)||!data.projects.length||data.projects.some((p:Demo)=>!p||typeof p.title!=='string'||typeof p.summary!=='string'||typeof p.scope!=='string'||!/^[0-9]{2}_[a-z0-9_]+\.project\.json$/.test(p.packagePath)||!/^[0-9]{2}_[a-z0-9_]+\.zip$/.test(p.archivePath)||!/^[a-f0-9]{64}$/.test(p.packageSha256)||!/^[a-f0-9]{64}$/.test(p.archiveSha256)))throw new Error('Nieprawidłowy katalog');
      setProjects(data.projects);
    }catch{setError('Nie udało się odczytać katalogu przykładów. Spróbuj ponownie lub wczytaj posiadany plik pakietu.');}finally{setBusy(false);}
  }
  async function loadDirect(project:Demo){
    if(downloading||busy)return;setDownloading(project.packagePath);setDownloadMessage(`Wczytywanie projektu „${project.title}”…`);
    try{
      const response=await fetch(`${base}${project.packagePath}`);
      if(!response.ok)throw new Error('Nie udało się pobrać pliku pakietu z serwera.');
      const text=await response.text();
      const pkg=parseProjectPackage(text);
      const snap=JSON.stringify(createWorkspaceBackup(localStorage),null,2);
      importProjectPackage(localStorage,pkg,snap);
      window.location.reload();
    }catch(e){setDownloadMessage(`Błąd wczytywania: ${(e as Error).message}`);setDownloading('');}
  }
  async function save(project:Demo,archive:boolean){
    if(downloading)return;const path=archive?project.archivePath:project.packagePath;setDownloading(path);setDownloadMessage('Pobieranie i sprawdzanie pliku…');
    try{const response=await fetch(`${base}${path}`);if(!response.ok)throw new Error('Brak pliku');const bytes=await response.arrayBuffer();
      const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),b=>b.toString(16).padStart(2,'0')).join('');
      if(hash!==(archive?project.archiveSha256:project.packageSha256))throw new Error('Niezgodna suma kontrolna');
      const mime=archive?'application/zip':'application/json';download(new Blob([bytes],{type:mime}),path,mime);
      setDownloadMessage(`Przekazano ${path} do pobrania. Integralność SHA-256 potwierdzona. Sprawdź zapisany plik.`);
    }catch{setDownloadMessage('Nie udało się pobrać poprawnego pliku. Spróbuj ponownie po sprawdzeniu połączenia. Bieżący projekt pozostaje zachowany.');}finally{setDownloading('');}
  }
  return <details className="demo-catalog" onToggle={event=>{if(event.currentTarget.open&&!projects&&!busy&&!error)void load();}}>
    <summary>Przykłady do pobrania (zewnętrzne pakiety pokazowe)</summary>
    <p>Możesz wczytać gotowy projekt bezpośrednio jednym kliknięciem lub pobrać pliki na dysk (JSON / ZIP). Wczytanie projektu automatycznie zabezpiecza Twój dotychczasowy stan w kopii ratunkowej.</p>
    <p className="muted">Pliki są częścią dystrybucji aplikacji i działają z lokalnego serwera bez internetu.</p>
    {busy&&<p role="status">Odczytywanie katalogu…</p>}
    {error&&<div role="alert"><p>{error}</p><button onClick={()=>void load()}>Ponów odczyt katalogu</button></div>}
    {downloadMessage&&<p role="status">{downloadMessage}</p>}
    {projects&&<div className="demo-catalog-grid">{projects.map(project=><article key={project.id}>
      <h3>{project.title}</h3>
      <p className="muted">{({basic:'Podstawowy',intermediate:'Średni',advanced:'Zaawansowany'} as Record<string,string>)[project.level]??'Dodatkowy'} · {project.dataOrigin==='synthetic'?'Dane syntetyczne':'Dane mieszane: pomiary i założenia'} · v{project.version}</p>
      <p>{project.summary}</p><details><summary>Warunki i ograniczenia</summary><p>{project.scope}</p></details>
      <div className="demo-catalog-actions">
        <button className="primary" style={{backgroundColor:'#2563eb',color:'#ffffff',fontWeight:600}} disabled={!!downloading||busy} onClick={()=>void loadDirect(project)}>Wczytaj ten projekt<span className="sr-only"> — {project.title}</span></button>
        <button disabled={!!downloading} onClick={()=>void save(project,false)}>Pobierz JSON<span className="sr-only"> — {project.title}</span></button>
        <button disabled={!!downloading} onClick={()=>void save(project,true)}>Pobierz ZIP<span className="sr-only"> — {project.title}</span></button>
      </div>
      <small>{project.fileCount} plików · ZIP {Math.ceil(project.archiveBytes/1024)} KB · arkusze procesu i BOM, warianty, referencje, instrukcja i manifest SHA-256</small>
    </article>)}</div>}
    <div style={{marginTop:'1rem',display:'flex',gap:'0.5rem',alignItems:'center'}}>
      <button onClick={onImport}>Otwórz zaawansowany kreator pakietu z pliku</button>
    </div>
  </details>;
}
