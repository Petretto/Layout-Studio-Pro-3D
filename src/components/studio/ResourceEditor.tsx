import React, {useState, useEffect} from 'react';
import {ProjectData, Workstation} from '../../core/models/types';
import {resourceKey, effectiveCycle} from '../../core/resources';
import {fromSeconds, toSeconds, formatTimeValue, formatTimeWithUnit} from './Fields';

function ResourceRow({ws,project:p,change}:{ws:Workstation;project:ProjectData;change:(p:ProjectData)=>void}){
  const unit = p.timeUnit ?? 's';
  const [operators,setOperators]=useState(String(ws.operators??1)),[copies,setCopies]=useState(String(ws.parallelStations??1));
  const key=resourceKey(ws.assignedStepIds);
  const existingCycleSec = p.workstationSettings?.[key]?.assistedCycleSeconds;
  const [cycle,setCycle]=useState(existingCycleSec!==undefined?String(Number(fromSeconds(existingCycleSec, unit).toFixed(6))):'');

  useEffect(()=>{
    if(existingCycleSec!==undefined) setCycle(String(Number(fromSeconds(existingCycleSec, unit).toFixed(6))));
    else setCycle('');
  },[existingCycleSec, unit]);

  return <form className="panel" onSubmit={e=>{
    e.preventDefault();
    const cycleSec = cycle.trim() ? toSeconds(Number(cycle), unit) : undefined;
    change({...p,workstationSettings:{...p.workstationSettings,[key]:{operators:Number(operators),parallelStations:Number(copies),...(cycleSec!==undefined?{assistedCycleSeconds:cycleSec}:{})}}});
  }}>
    <h3>{ws.id} — {ws.assignedStepIds.join(', ')}</h3>
    <div className="form-grid">
      <label className="field">Operatorzy na kopię {ws.id}<input required type="number" min="1" max="20" step="1" value={operators} onChange={e=>setOperators(e.target.value)}/></label>
      <label className="field">Równoległe kopie {ws.id}<input required type="number" min="1" max="20" step="1" value={copies} onChange={e=>setCopies(e.target.value)}/></label>
      <label className="field">Cykl zespołu {ws.id} [{unit}/szt.] — opcjonalny<input type="number" min="0.000001" step="any" placeholder={formatTimeValue(ws.baseCycleSeconds, unit)} value={cycle} onChange={e=>setCycle(e.target.value)}/></label>
    </div>
    <p>Bazowy: {formatTimeWithUnit(ws.baseCycleSeconds??ws.cycleTimeSeconds, unit)} · Zespół: {formatTimeWithUnit(ws.cycleTimeSeconds, unit)} · Odstęp zdolności: {formatTimeWithUnit(effectiveCycle(ws), unit)}/szt. · Obsada łącznie: {(ws.operators??1)*(ws.parallelStations??1)}</p>
    <button type="submit">Zastosuj zasoby {ws.id}</button>
  </form>;
}

export function ResourceEditor({project:p,change}:{project:ProjectData;change:(p:ProjectData)=>void}){
  return <details className="panel" open><summary>Obsada i równoległe stanowiska</summary>
    <p>Dodatkowy operator nie skraca automatycznie czasu. Wpisz zmierzony lub oszacowany cykl zespołu. Puste pole zachowuje sumę czasów operacji. Kopie stanowiska mają osobne, pełne obsady. Ustawienia dotyczą dokładnego zestawu operacji; po zmianie grupowania sprawdź je ponownie.</p>
    <p>Odstęp zdolności = cykl zespołu / liczba kopii. To nie czas przejścia pojedynczego wyrobu. Heurystyki RPW/LCR grupują operacje bazowe, a zasoby stosowane są potem.</p>
    {p.balancing?.workstations.map(ws=><ResourceRow key={resourceKey(ws.assignedStepIds)+JSON.stringify(p.workstationSettings)+p.timeUnit} ws={ws} project={p} change={change}/>)}
  </details>;
}
