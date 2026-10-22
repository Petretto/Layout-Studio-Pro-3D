import {lazy,Suspense,useEffect,useMemo,useState} from 'react';
import type {DomainProjectV6} from '../../core/domainProject';
import {domainModelSignature,domainPlaybackFrame,type DomainPlayback} from '../../core/domainPlayback';
import {SIMULATION_SPEEDS,stepSimulationTime} from '../../core/algorithms/simulation';
const View3D=lazy(()=>import('./DomainPlayback3D').then(m=>({default:m.DomainPlayback3D})));
const labels={work:'Praca', 'calendar-pause':'Przerwa kalendarza',held:'Zajęcie stanowiska po obróbce',waiting:'Oczekiwanie na start'};

export function DomainSchedulePlayback({project,playback}:{project:DomainProjectV6;playback:DomainPlayback|null}){
  const [show3D,setShow3D]=useState(false),[time,setTime]=useState(0),[playing,setPlaying]=useState(false),[speed,setSpeed]=useState(1),[selected,setSelected]=useState('');
  const signature=useMemo(()=>domainModelSignature(project),[project]);
  const valid=playback?.modelSignature===signature?playback:null;
  const frame=useMemo(()=>valid?domainPlaybackFrame(valid,time):null,[valid,time]);
  useEffect(()=>{setPlaying(false);setTime(0);setSelected('');},[playback,project]);
  useEffect(()=>{
    if(!playing||!valid)return;let last=performance.now(),raf=0;
    const tick=(now:number)=>{const delta=(now-last)/1000;last=now;setTime(t=>stepSimulationTime(t,delta,speed,valid.endSeconds));raf=requestAnimationFrame(tick);};raf=requestAnimationFrame(tick);return()=>cancelAnimationFrame(raf);
  },[playing,valid,speed]);
  useEffect(()=>{if(valid&&time>=valid.endSeconds)setPlaying(false);},[time,valid]);
  const seek=(n:number)=>{setPlaying(false);setTime(Math.min(valid?.endSeconds??0,Math.max(0,Number.isFinite(n)?n:0)));};
  return <section className="panel" aria-label="Odtwarzanie operacji projektu 3D" data-model-sha={signature} data-result-sha={valid?.resultSignature??''}>
    <h4>Widok 3D i odtwarzanie operacji projektu</h4>
    <p>Model: {project.name} · ID {project.id}. Geometria jest odczytywana z aktywnego projektu. Odtwarzanie korzysta wyłącznie z obliczonego harmonogramu; prędkość i kamera nie zmieniają wyniku.</p>
    <p className="notice">Znaczniki pokazują operacje na jawnie powiązanym wyposażeniu, nie fizyczne położenie wyrobu. Brak jednoznacznej geometrii oznacza brak znacznika. Przejazdy korpusów i wózków nie są w tym widoku animowane. W JIT ich lokalizacja nie jest obliczana.</p>
    <label><input aria-label="Pokaż 3D aktywnego projektu" type="checkbox" checked={show3D} onChange={e=>setShow3D(e.target.checked)}/>Pokaż geometrię 3D</label>
    {show3D&&<Suspense fallback={<p>Wczytywanie widoku 3D…</p>}><View3D project={project} playback={valid} frame={frame} selected={selected}/></Suspense>}
    {!valid&&<p role="status">Oblicz harmonogram dla bieżących danych i warunków, aby włączyć odtwarzanie. Po odświeżeniu trzeba go obliczyć ponownie.</p>}
    {valid&&frame&&<>
      <p>Warunki: {valid.conditions.batch} szt. · odstęp {valid.conditions.arrivalIntervalSeconds} s · {valid.conditions.transportMode==='just-in-time'?'JIT — założona dostępność materiałów':'skonfigurowany transport'}. Skrót wyniku: <code style={{wordBreak:'break-all'}}>{valid.resultSignature}</code></p>
      <div className="toolbar">
        <button onClick={()=>{if(time>=valid.endSeconds)setTime(0);setPlaying(p=>!p);}}>{playing?'Pauza odtwarzania':'Odtwarzaj harmonogram'}</button>
        <button onClick={()=>seek(time+1)}>Krok +1 s</button><button onClick={()=>seek(0)}>Początek odtwarzania</button><button onClick={()=>seek(valid.endSeconds)}>Koniec odtwarzania</button>
        <label>Prędkość <select aria-label="Prędkość odtwarzania operacji" value={speed} onChange={e=>setSpeed(Number(e.target.value))}>{SIMULATION_SPEEDS.map(s=><option key={s} value={s}>{s}×</option>)}</select></label>
        <label>Czas [s] <input aria-label="Czas odtwarzania operacji [s]" type="number" min={0} max={valid.endSeconds} step="any" value={Number(time.toFixed(3))} onChange={e=>seek(Number(e.target.value))}/></label>
      </div>
      <input style={{width:'100%'}} aria-label="Oś czasu odtwarzania operacji" type="range" min={0} max={valid.endSeconds} step="0.1" value={time} onChange={e=>seek(Number(e.target.value))}/>
      <p role="status" aria-label="Stan odtwarzania operacji">Czas: {Number(frame.timeSeconds.toFixed(3))} / {valid.endSeconds} s · ukończono {frame.completed}/{valid.jobs.length} szt. · przybyło {frame.arrived}. Zielony: praca, niebieski: przerwa, pomarańczowy: zajęcie po obróbce, żółty: wybrana operacja.</p>
      <label>Wybierz wykonanie <select aria-label="Wybrane wykonanie operacji 3D" value={selected} onChange={e=>setSelected(e.target.value)}><option value="">Brak wyboru</option>{valid.entries.map(e=><option key={e.id} value={e.id}>Szt. {e.job} · {e.operationName} · {e.stationId}#{e.copy} · {e.startSeconds}–{e.endSeconds} s</option>)}</select></label>
      <div className="table-wrap"><table aria-label="Stany operacji z harmonogramu"><thead><tr><th>Sztuka / operacja</th><th>Stanowisko / kopia</th><th>Stan</th><th>Znaczniki</th></tr></thead><tbody>{frame.states.slice(0,100).map(s=><tr key={s.id} data-run-id={s.id} data-state={s.state}><td><button onClick={()=>setSelected(s.id)}>{s.job} / {s.operationId}</button></td><td>{s.stationId}#{s.copy}</td><td>{labels[s.state]}</td><td>{s.anchors.map(a=>a.objectId).join(', ')||'brak — bez dopowiadania pozycji'}</td></tr>)}</tbody></table></div>
      {frame.states.length>100&&<p>Pokazano pierwszych 100 stanów operacji.</p>}
    </>}
  </section>;
}
