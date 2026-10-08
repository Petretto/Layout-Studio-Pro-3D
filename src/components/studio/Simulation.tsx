import React,{useState,useEffect,useRef} from 'react';
import { ProjectData } from '../../core/models/types';
import { simulationAt, SIMULATION_SPEEDS, stepSimulationTime, SimulationSpeed } from '../../core/algorithms/simulation';
import type { NetworkResult, OperationRun } from '../../core/algorithms/networkSimulation';
import {startBackgroundTask, type CalculationProgress} from '../../core/backgroundTask';
import type {NetworkRequest} from '../../core/networkWorkerRequest';
import { spreadsheet } from '../../core/export/excelImporter';
import { NumberField,TimeField,Metric,fmt,formatTimeValue,formatTimeWithUnit } from './Fields';
export { SIMULATION_SPEEDS };
export type { SimulationSpeed };
const EMPTY_RESULT: NetworkResult = {jobs:[],runs:[],stepIds:[]};
export function Simulation({project:p,notify,onActive,exportedResultKey,onExportResult,initialBatch=30,showStableIds=false}:{project:ProjectData;notify:(m:string)=>void;onActive:(runs:OperationRun[])=>void;exportedResultKey:string|null;onExportResult:(key:string)=>void;initialBatch?:number;showStableIds?:boolean}){
  const unit=p.timeUnit??'s';
  const [batch,setBatch]=useState(initialBatch),[interval,setIntervalValue]=useState(p.balancing?.taktTimeSeconds??60),[speed,setSpeed]=useState(10),[time,setTime]=useState(0),[running,setRunning]=useState(false);
  const timeRef=useRef(0),last=useRef(0);
  const cycles=p.balancing?.workstations.map(s=>s.cycleTimeSeconds)??[];
  const resultKey=JSON.stringify([p.processSteps,p.balancing,interval,batch]);
  const [calculation,setCalculation]=useState<{key:string;status:'computing'|'ready'|'cancelled'|'error';result?:NetworkResult;progress?:CalculationProgress;error?:string}>({key:resultKey,status:'computing'});
  const cancelRef=useRef<()=>void>(()=>{});
  const [retry,setRetry]=useState(0);
  useEffect(()=>{
    setCalculation({key:resultKey,status:'computing'});
    const cancel=startBackgroundTask<NetworkRequest,NetworkResult>({project:p,interval,batch},{
      progress:progress=>setCalculation({key:resultKey,status:'computing',progress}),
      result:result=>setCalculation({key:resultKey,status:'ready',result}),
      error:error=>setCalculation({key:resultKey,status:'error',error})
    },()=>new Worker(new URL('../../core/network.worker.ts',import.meta.url),{type:'module'}));
    cancelRef.current=cancel;
    return cancel;
  },[resultKey,retry]);
  // Hide the previous input's result before the replacement effect starts.
  const current=calculation.key===resultKey?calculation:undefined;
  const result=current?.status==='ready'?current.result!:EMPTY_RESULT;
  const computing=!current||current.status==='computing';
  const end=Math.max(0,...result.jobs.map(j=>j.finish));
  useEffect(()=>{setRunning(false);setTime(0);timeRef.current=0;},[result,resultKey,retry]);
  useEffect(()=>{if(!running)return;last.current=performance.now();let frame=0;const tick=(now:number)=>{const deltaSeconds=(now-last.current)/1000;last.current=now;timeRef.current=stepSimulationTime(timeRef.current,deltaSeconds,speed,end);setTime(timeRef.current);if(timeRef.current>=end)setRunning(false);else frame=requestAnimationFrame(tick);};frame=requestAnimationFrame(tick);return()=>cancelAnimationFrame(frame);},[running,speed,end]);
  useEffect(()=>{onActive(result.runs.filter(r=>r.start<=time&&r.end>time));},[result,time,onActive]);
  const stats=simulationAt(result.jobs,time);
  const exportCSV=()=>{spreadsheet(result.jobs.map(j=>({'Sztuka':j.id,'Wejście [s]':j.arrival,'Wyjście [s]':j.finish,'Przejście [s]':j.finish-j.arrival,...Object.fromEntries(j.starts.flatMap((s,i)=>[[`${result.stepIds[i]} start [s]`,s],[`${result.stepIds[i]} koniec [s]`,j.ends[i]]]))})),'Symulacja_partii','csv');onExportResult(resultKey);notify('Przekazano Symulacja_partii.csv do pobrania.');};
  return <div className="panel"><h2>Symulacja przepływu produkcji</h2><p className="muted">Model grafowy: gałęzie wykonują się równolegle, operacja czeka na wszystkich poprzedników tej samej sztuki. Każda kopia stanowiska wykonuje jedną operację naraz. Kolejki bez limitu, kolejność gotowości (remisy: numer sztuki i sekwencja). Cykl zespołu skaluje czasy jego operacji proporcjonalnie. Zerowy czas transportu; operatorzy są dedykowani, bez współdzielenia między stanowiskami. OEE służy do wyznaczenia celu cyklu i nie jest ponownie odejmowane w symulacji. Parametry opisują założenia, a nie prognozę awarii.</p><div className="form-grid"><NumberField label="Cel partii [szt.]" min={1} max={10000} step="1" value={batch} onChange={setBatch}/><TimeField label="Odstęp uruchamiania sztuk" min={.001} seconds={interval} unit={unit} onChange={setIntervalValue}/><label className="field">Szybkość odtwarzania<select aria-label="Szybkość odtwarzania" value={speed} onChange={e=>setSpeed(Number(e.target.value))}>{SIMULATION_SPEEDS.map(v=><option key={v} value={v}>{v}×</option>)}</select></label></div>{current?.error&&<p role="alert" className="error">{current.error}</p>}
  {computing&&<p role="status">Obliczanie partii: {current?.progress?.completed??0} / {current?.progress?.total??p.processSteps.length*batch} wykonań operacji.</p>}
  {current?.status==='cancelled'&&<p role="status">Obliczenia symulacji anulowane.</p>}
  <div className="toolbar">{computing?<button onClick={()=>{cancelRef.current();setCalculation({key:resultKey,status:'cancelled'});}}>Anuluj obliczenia symulacji</button>:<button onClick={()=>setRetry(value=>value+1)}>Oblicz ponownie symulację</button>}</div>
  <div className="toolbar"><button className="primary" disabled={!end||time>=end} onClick={()=>setRunning(!running)}>{running?'Pauza':time>0?'Wznów':'Start symulacji'}</button><button onClick={()=>{setRunning(false);timeRef.current=0;setTime(0);}}>Reset symulacji</button><button disabled={!end} onClick={()=>{setRunning(false);timeRef.current=end;setTime(end);}}>Oblicz całą partię</button><button disabled={!end} onClick={exportCSV}>Raport symulacji CSV</button></div>
  {exportedResultKey!==null&&<p role="status" className={exportedResultKey===resultKey?'success':'error'}>{exportedResultKey===resultKey?'Raport CSV odpowiada bieżącej partii i odstępowi.':'Raport CSV jest nieaktualny po zmianie danych symulacji. Pobierz go ponownie.'}</p>}
  <div className="metrics"><Metric label="Czas symulowany" value={`${formatTimeValue(time, unit)} / ${formatTimeWithUnit(end, unit)}`}/><Metric label="Wyprodukowano" value={`${stats.completed} / ${batch}`}/><Metric label="WIP w systemie" value={`${stats.wip} szt.`} hint="Sztuki rozpoczęte, jeszcze nieukończone"/><Metric label="Średnia wydajność" value={`${fmt(stats.throughput)} szt./h`} hint="Od rozpoczęcia partii, z rozruchem linii"/></div>
  <label className="field">Oś czasu<input aria-label="Oś czasu symulacji" type="range" min={0} max={end||1} step="0.01" value={time} disabled={!end} onChange={e=>{setRunning(false);timeRef.current=Number(e.target.value);setTime(timeRef.current);}}/></label>
  {time>=end&&end>0&&<p role="status" className="success">Partia ukończona. Czas: {formatTimeWithUnit(end, unit)}; średnio {fmt(batch/end*3600)} szt./h.</p>}
  <div className="station-strip">{cycles.map((c,i)=>{const station=p.balancing!.workstations[i];const active=result.runs.filter(r=>r.stationId===station.id&&r.start<=time&&r.end>time);const queue=result.runs.filter(r=>r.stationId===station.id&&r.ready<=time&&r.start>time).length;return <div className="station" key={station.id}><strong>{showStableIds?`${station.name} · ${station.id}`:`WS-${i+1}`}</strong><p>{active.length?active.map(r=>`Szt. ${r.job} / ${r.stepId} / kopia ${r.copy}`).join(', '):'Wolne'}</p><progress max={c} value={active.length?time-active[0].start:0}/><small>Kolejka: {queue} · Cykl {formatTimeWithUnit(c, unit)}</small></div>;})}</div>
  </div>;
}
