import type {DomainProjectV6} from '../../core/domainProject';
import type {AssemblyTransport,AssemblyCart} from '../../core/assemblyTransport';
import type {StationCopyRef} from '../../core/stationRouting';
import type {ResourceCalendar,DeclaredCalendarWindow} from '../../core/resourceCalendar';
import {TransportTimingEditor} from './TransportTimingEditor';

export function TransportResourceFields({project,value,onChange,confirmed,onConfirm}:{
  project:DomainProjectV6;value:AssemblyTransport;onChange:(next:AssemblyTransport)=>void;
  confirmed:Record<string,boolean>;onConfirm:(key:string,checked:boolean)=>void;
}) {
  const blankRef=():StationCopyRef=>({stationId:'',copy:NaN});
  const references=project.stations.flatMap(s=>Array.from({length:project.stationSettings[s.id]?.parallelStations??0},(_,i)=>({stationId:s.id,copy:i+1})));
  const text=(label:string,current:string,edit:(next:string)=>void)=><label className="field">{label}<input aria-label={label} value={current} onChange={e=>edit(e.target.value)}/></label>;
  const number=(label:string,current:number,edit:(next:number)=>void)=><label className="field">{label}<input type="number" min="0" step="any" aria-label={label} value={Number.isFinite(current)?current:''} onChange={e=>edit(e.target.value===''?NaN:Number(e.target.value))}/></label>;
  const reference=(label:string,current:StationCopyRef,edit:(next:StationCopyRef)=>void)=><label className="field">{label}
    <select aria-label={label} value={current.stationId?JSON.stringify(current):''} onChange={e=>edit(e.target.value?JSON.parse(e.target.value):blankRef())}><option value="">Wybierz kopię stanowiska</option>
      {references.map(r=><option key={JSON.stringify(r)} value={JSON.stringify(r)}>{r.stationId} / {r.copy}</option>)}</select></label>;
  const used=(id:string)=>!!id&&[...value.carts,...value.conveyors].filter(d=>d.equipmentId===id).length===1&&(value.routes.some(r=>r.alternatives.some(a=>a.equipmentIds.includes(id)))||value.emptyRoutes.some(r=>r.equipmentId===id));
  const equipment=(label:string,current:string,edit:(next:string)=>void)=><label className="field">{label}
    <select aria-label={label} disabled={used(current)} value={current} onChange={e=>edit(e.target.value)}><option value="">Wybierz istniejący egzemplarz</option>
      {project.equipment.map(e=><option key={e.id} value={e.id}>{e.name} · {e.id}</option>)}</select></label>;
  const calendar=(label:string,current:ResourceCalendar,edit:(next:ResourceCalendar)=>void)=>{
    const windows=(kind:'shifts'|'breaks',name:string)=> <fieldset><legend>{name} [s od początku przebiegu]</legend>
      {current[kind].map((w,i)=><div key={i} className="form-grid">
        {number(`${label} ${name} ${i+1} początek`,w.startSeconds,n=>edit({...current,[kind]:current[kind].map((item,j)=>j===i?{...item,startSeconds:n}:item)}))}
        {number(`${label} ${name} ${i+1} koniec`,w.endSeconds,n=>edit({...current,[kind]:current[kind].map((item,j)=>j===i?{...item,endSeconds:n}:item)}))}
        <label className="field">Pochodzenie<select aria-label={`${label} ${name} ${i+1} pochodzenie`} value={w.basis} onChange={e=>edit({...current,[kind]:current[kind].map((item,j)=>j===i?{...item,basis:e.target.value as DeclaredCalendarWindow['basis']}:item)})}>
          <option value="assumed">Założone</option><option value="confirmed">Potwierdzone</option></select></label>
        <button onClick={()=>edit({...current,[kind]:current[kind].filter((_,j)=>j!==i)})}>Usuń {label} {name} {i+1}</button>
      </div>)}
      <button onClick={()=>edit({...current,[kind]:[...current[kind],{startSeconds:NaN,endSeconds:NaN,basis:'assumed'}]})}>Dodaj {label} {name}</button>
    </fieldset>;
    return <>{windows('shifts','zmiana')}{windows('breaks','przerwa')}<p className="muted">Pusta lista zmian oznacza brak dostępnego czasu. Przerwy muszą mieścić się w zmianach.</p></>;
  };
  return <>
    <h4>Wózki i przenośniki</h4><p className="muted">Wybierz istniejące egzemplarze wyposażenia. Używany egzemplarz można zmienić lub usunąć po usunięciu jego przydziałów do tras i pustych ruchów.</p>
    {value.carts.map((cart,i)=>{
      const label=`Wózek ${i+1}`,edit=(next:typeof cart)=>onChange({...value,carts:value.carts.map((c,j)=>j===i?next:c)});
      return <fieldset key={i}><legend>{label}</legend><div className="form-grid">
        {equipment(`${label} egzemplarz`,cart.equipmentId,equipmentId=>edit({...cart,equipmentId}))}
        {reference(`${label} lokalizacja początkowa`,cart.initialLocation,initialLocation=>edit({...cart,initialLocation}))}
        <label className="field">Po rozładunku<select aria-label={`${label} po rozładunku`} value={cart.afterUnload} onChange={e=>edit({...cart,afterUnload:e.target.value as AssemblyCart['afterUnload']})}>
          <option value="">Wybierz regułę</option><option value="stay-at-destination">Pozostaje w celu</option><option value="return-to-initial">Wraca do lokalizacji początkowej</option></select></label>
        {text(`${label} źródło reguły`,cart.source,source=>edit({...cart,source}))}
      </div>{calendar(label,cart.calendar,next=>edit({...cart,calendar:next}))}
        <button disabled={used(cart.equipmentId)} onClick={()=>onChange({...value,carts:value.carts.filter((_,j)=>j!==i)})}>Usuń {label}</button>
      </fieldset>;
    })}
    <button onClick={()=>onChange({...value,carts:[...value.carts,{equipmentId:'',initialLocation:blankRef(),calendar:{shifts:[],breaks:[]},afterUnload:'' as AssemblyCart['afterUnload'],source:''}]})}>Dodaj wózek</button>
    {value.conveyors.map((conveyor,i)=>{
      const label=`Przenośnik ${i+1}`,edit=(next:typeof conveyor)=>onChange({...value,conveyors:value.conveyors.map((c,j)=>j===i?next:c)});
      return <fieldset key={i}><legend>{label}</legend><div className="form-grid">
        {equipment(`${label} egzemplarz`,conveyor.equipmentId,equipmentId=>edit({...conveyor,equipmentId}))}
        {reference(`${label} od`,conveyor.from,from=>edit({...conveyor,from}))}{reference(`${label} do`,conveyor.to,to=>edit({...conveyor,to}))}
      </div>{calendar(label,conveyor.calendar,next=>edit({...conveyor,calendar:next}))}
        <button disabled={used(conveyor.equipmentId)} onClick={()=>onChange({...value,conveyors:value.conveyors.filter((_,j)=>j!==i)})}>Usuń {label}</button>
      </fieldset>;
    })}
    <button onClick={()=>onChange({...value,conveyors:[...value.conveyors,{equipmentId:'',from:blankRef(),to:blankRef(),calendar:{shifts:[],breaks:[]}}]})}>Dodaj przenośnik</button>
    <h4>Puste trasy wózków</h4><p className="muted">Dojazd i powrót wymagają własnej skierowanej trasy, długości, czasu i obsady. Obsada nie jest dziedziczona z przewozu korpusu.</p>
    {value.emptyRoutes.map((route,i)=>{
      const label=`Pusta trasa ${i+1}`,edit=(next:typeof route)=>onChange({...value,emptyRoutes:value.emptyRoutes.map((r,j)=>j===i?next:r)});
      const assignment=route.workerAssignment??{workerIds:[],source:''};
      return <fieldset key={i}><legend>{label}</legend><div className="form-grid">
        {text(`${label} ID`,route.id,id=>edit({...route,id}))}
        <label className="field">Wózek<select aria-label={`${label} wózek`} value={route.equipmentId} onChange={e=>edit({...route,equipmentId:e.target.value})}><option value="">Wybierz wózek</option>
          {value.carts.map((c,j)=><option key={j} value={c.equipmentId}>{c.equipmentId||'Nieuzupełniony wózek'}</option>)}</select></label>
        {reference(`${label} od`,route.from,from=>{onConfirm(`${i}:geometry`,false);edit({...route,from});})}
        {reference(`${label} do`,route.to,to=>{onConfirm(`${i}:geometry`,false);edit({...route,to});})}
        {number(`${label} długość [mm]`,route.distanceMm,distanceMm=>{onConfirm(`${i}:geometry`,false);edit({...route,distanceMm});})}
        {text(`${label} źródło długości`,route.source,source=>{onConfirm(`${i}:geometry`,false);edit({...route,source});})}
      </div><label><input type="checkbox" aria-label={`${label} potwierdzenie drogi`} checked={confirmed[`${i}:geometry`]??false} onChange={e=>onConfirm(`${i}:geometry`,e.target.checked)}/>Potwierdzam kierunek, długość i źródło drogi.</label>
        <TransportTimingEditor label={label} route={route} onChange={timing=>{const {transportTime,transportCalculation,...rest}=route;edit({...rest,...timing});}}/>
        <p>Osoby pustego ruchu</p><div className="toolbar">{project.workers.map(w=><label key={w.id}><input type="checkbox" aria-label={`${label} osoba ${w.id}`} checked={assignment.workerIds.includes(w.id)} onChange={e=>{
          const workerIds=e.target.checked?[...assignment.workerIds,w.id]:assignment.workerIds.filter(id=>id!==w.id);
          if(!workerIds.length)onConfirm(`${i}:people`,false);edit({...route,workerAssignment:{...assignment,workerIds}});
        }}/>{w.name} · {w.id}</label>)}</div>
        {!assignment.workerIds.length&&<label><input type="checkbox" aria-label={`${label} bez osób`} checked={confirmed[`${i}:people`]??false} onChange={e=>{onConfirm(`${i}:people`,e.target.checked);edit({...route,workerAssignment:assignment});}}/>Jawnie bez osób dla tego pustego ruchu</label>}
        {text(`${label} źródło obsady`,assignment.source,source=>edit({...route,workerAssignment:{...assignment,source}}))}
        <button onClick={()=>{onChange({...value,emptyRoutes:value.emptyRoutes.filter((_,j)=>j!==i)});value.emptyRoutes.forEach((_,j)=>{if(j>=i){onConfirm(`${j}:geometry`,j+1<value.emptyRoutes.length?(confirmed[`${j+1}:geometry`]??false):false);onConfirm(`${j}:people`,j+1<value.emptyRoutes.length?(confirmed[`${j+1}:people`]??false):false);}});}}>Usuń {label}</button>
      </fieldset>;
    })}
    <button onClick={()=>onChange({...value,emptyRoutes:[...value.emptyRoutes,{id:'',equipmentId:'',from:blankRef(),to:blankRef(),distanceMm:NaN,basis:'confirmed',source:''}]})}>Dodaj pustą trasę</button>
  </>;
}
