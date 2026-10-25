import React,{useState} from 'react';
import {download} from '../../core/project';
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
    <summary>Przykłady do pobrania</summary>
    <p>Pobierz plik projektu lub komplet plików ZIP. Następnie wybierz „Wczytaj pakiet projektu” i wskaż pobrany JSON. ZIP rozpakuj, aby użyć arkuszy i instrukcji. Pobranie nie zmienia Twojego projektu.</p>
    <p className="muted">Pliki są częścią dystrybucji aplikacji i działają z lokalnego serwera bez internetu. Na stronie internetowej wymagają połączenia; zachowaj pobrany komplet do pracy offline.</p>
    {busy&&<p role="status">Odczytywanie katalogu…</p>}
    {error&&<div role="alert"><p>{error}</p><button onClick={()=>void load()}>Ponów odczyt katalogu</button></div>}
    {downloadMessage&&<p role="status">{downloadMessage}</p>}
    {projects&&<div className="demo-catalog-grid">{projects.map(project=><article key={project.id}>
      <h3>{project.title}</h3>
      <p className="muted">{({basic:'Podstawowy',intermediate:'Średni',advanced:'Zaawansowany'} as Record<string,string>)[project.level]??'Dodatkowy'} · {project.dataOrigin==='synthetic'?'Dane syntetyczne':'Dane mieszane: pomiary i założenia'} · v{project.version}</p>
      <p>{project.summary}</p><details><summary>Warunki i ograniczenia</summary><p>{project.scope}</p></details>
      <div className="demo-catalog-actions"><button disabled={!!downloading} onClick={()=>void save(project,false)}>Pobierz projekt JSON<span className="sr-only"> — {project.title}</span></button><button disabled={!!downloading} onClick={()=>void save(project,true)}>Pobierz komplet ZIP<span className="sr-only"> — {project.title}</span></button></div>
      <small>{project.fileCount} plików · ZIP {Math.ceil(project.archiveBytes/1024)} KB · arkusze procesu i BOM, warianty, referencje, instrukcja i manifest SHA-256</small>
    </article>)}</div>}
    <button onClick={onImport}>Wczytaj pobrany pakiet</button>
  </details>;
}
