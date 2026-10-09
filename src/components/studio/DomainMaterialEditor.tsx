import {TransportTimingEditor} from './TransportTimingEditor';
import {useState} from 'react';
import type {DomainProjectV6} from '../../core/domainProject';
import {validateMaterialNetwork,distanceToMm,distanceFromMm,materialRouteData,
  type MaterialNetworkV6,type MaterialPoint,type MaterialRoute,type DistanceUnit} from '../../core/materialNetwork';

export function DomainMaterialEditor({project,onApply,onUndo,onRedo,canUndo,canRedo}:{
  project:DomainProjectV6;onApply:(network:MaterialNetworkV6|undefined)=>boolean;
  onUndo:()=>void;onRedo:()=>void;canUndo:boolean;canRedo:boolean;
}){
  const [network,setNetwork]=useState<MaterialNetworkV6>(()=>structuredClone(project.materialNetwork??{points:[],routes:[]}));
  const [units,setUnits]=useState<DistanceUnit[]>(network.routes.map(()=>'mm'));
  const [confirmed,setConfirmed]=useState(network.routes.map(()=>true));
  const [error,setError]=useState(''),[dirty,setDirty]=useState(false);
  const change=(next:MaterialNetworkV6)=>{setNetwork(next);setDirty(true);setError('');};
  const pointChange=(index:number,point:MaterialPoint)=>change({...network,points:network.points.map((p,i)=>i===index?point:p)});
  const routeChange=(index:number,route:MaterialRoute)=>{
    change({...network,routes:network.routes.map((r,i)=>i===index?route:r)});
    setConfirmed(confirmed.map((value,i)=>i===index?false:value));
  };
  const textField=(label:string,value:string,update:(value:string)=>void)=><label className="field">{label}
    <input aria-label={label} value={value} onChange={e=>update(e.target.value)}/></label>;
  const pointSelect=(label:string,value:string,update:(value:string)=>void)=><label className="field">{label}
    <select aria-label={label} value={value} onChange={e=>update(e.target.value)}><option value="">Wybierz punkt</option>
      {network.points.map((p,i)=><option key={i} value={p.id}>{p.name||'Bez nazwy'} · {p.id||'Bez ID'}</option>)}</select></label>;
  const save=()=>{
    try{
      if(network.routes.some((r,i)=>r.kind==='declared'&&!confirmed[i]))throw new Error('Potwierdź długość i źródło każdego zmienionego połączenia zewnętrznego.');
      const checked=validateMaterialNetwork(project,network);
      if(onApply(checked))setDirty(false);
    }catch(failure){setError((failure as Error).message);}
  };
  return <div className="panel" aria-label="Sieć materiałowa szkicu 6">
    <h3>Punkty i połączenia materiałowe</h3>
    <p className="muted">Dodaj wejścia i wyjścia konkretnych kopii stanowisk oraz punkty zewnętrzne, np. magazyn.
      Połączenie stanowisk korzysta z istniejącej trasy używanej przez harmonogram.
      Połączenie z magazynem opisuje sieć materiałową; dostawa z magazynu nie jest jeszcze częścią przebiegu korpusu.</p>
    <div className="toolbar"><button disabled={!canUndo} onClick={onUndo}>Cofnij dane szkicu</button>
      <button disabled={!canRedo} onClick={onRedo}>Ponów dane szkicu</button></div>
    <h4>Punkty materiałowe ({network.points.length})</h4>
    {network.points.map((point,index)=>{
      const label=`Punkt ${index+1}`;
      return <fieldset key={index}><legend>{label}</legend><div className="form-grid">
        {textField(`${label} ID`,point.id,id=>pointChange(index,{...point,id}))}
        {textField(`${label} nazwa`,point.name,name=>pointChange(index,{...point,name}))}
        <label className="field">Rodzaj punktu<select aria-label={`${label} rodzaj`} value={point.kind} onChange={e=>{
          const base={id:point.id,name:point.name,direction:point.direction};
          pointChange(index,e.target.value==='station'?{...base,kind:'station',stationId:'',copy:NaN}:{...base,kind:'external'});
        }}><option value="external">Zewnętrzny (np. magazyn)</option><option value="station">Kopia stanowiska</option></select></label>
        <label className="field">Kierunek przepływu<select aria-label={`${label} kierunek`} value={point.direction}
          onChange={e=>pointChange(index,{...point,direction:e.target.value as MaterialPoint['direction']})}>
          <option value="input">Wejście</option><option value="output">Wyjście</option><option value="both">Wejście i wyjście</option></select></label>
        {point.kind==='station'&&<><label className="field">Stanowisko<select aria-label={`${label} stanowisko`} value={point.stationId}
          onChange={e=>pointChange(index,{...point,stationId:e.target.value,copy:NaN})}><option value="">Wybierz stanowisko</option>
          {project.stations.map(station=><option key={station.id} value={station.id}>{station.name} · {station.id}</option>)}</select></label>
          <label className="field">Kopia<input aria-label={`${label} kopia`} type="number" min="1" step="1"
            max={project.stationSettings[point.stationId]?.parallelStations} value={Number.isFinite(point.copy)?point.copy:''}
            onChange={e=>pointChange(index,{...point,copy:e.target.value===''?NaN:Number(e.target.value)})}/></label></>}
      </div><button onClick={()=>{
        if(network.routes.some(route=>route.fromPointId===point.id||route.toPointId===point.id)){setError('Najpierw usuń lub zmień połączenia korzystające z tego punktu.');return;}
        change({...network,points:network.points.filter((_,i)=>i!==index)});
      }}>Usuń punkt {index+1}</button></fieldset>;
    })}
    <button disabled={network.points.length>=5000} onClick={()=>change({...network,points:[...network.points,{id:'',name:'',kind:'external',direction:'input'}]})}>Dodaj punkt materiałowy</button>
    <h4>Skierowane połączenia ({network.routes.length})</h4>
    {network.routes.map((route,index)=>{
      const label=`Połączenie ${index+1}`,unit=units[index]??'mm';
      let linkedData:ReturnType<typeof materialRouteData>|undefined;
      if(route.kind==='station-route')try{linkedData=materialRouteData({...project,materialNetwork:network},route.id);}catch{}
      return <fieldset key={index}><legend>{label}</legend><div className="form-grid">
        {textField(`${label} ID`,route.id,id=>routeChange(index,{...route,id}))}
        {pointSelect(`${label} od`,route.fromPointId,fromPointId=>routeChange(index,{...route,fromPointId}))}
        {pointSelect(`${label} do`,route.toPointId,toPointId=>routeChange(index,{...route,toPointId}))}
        <label className="field">Rodzaj połączenia<select aria-label={`${label} rodzaj`} value={route.kind} onChange={e=>{
          const base={id:route.id,fromPointId:route.fromPointId,toPointId:route.toPointId};
          routeChange(index,e.target.value==='station-route'?{...base,kind:'station-route',stationRouteId:''}:
            {...base,kind:'declared',distanceMm:NaN,basis:'confirmed',source:''});
        }}><option value="declared">Z punktem zewnętrznym</option><option value="station-route">Istniejąca trasa stanowisk</option></select></label>
        {route.kind==='station-route'?<label className="field">Trasa stanowisk<select aria-label={`${label} trasa`} value={route.stationRouteId}
          onChange={e=>routeChange(index,{...route,stationRouteId:e.target.value})}><option value="">Wybierz trasę</option>
          {(project.stationRouting?.routes??[]).map(r=><option key={r.id} value={r.id}>{r.id} · {r.from.stationId}/{r.from.copy} → {r.to.stationId}/{r.to.copy}</option>)}</select></label>:
          <>{textField(`${label} źródło`,route.source,source=>routeChange(index,{...route,source}))}
          <label className="field">Długość [{unit}]<input aria-label={`${label} długość`} type="number" min="0" step="any"
            value={Number.isFinite(route.distanceMm)?distanceFromMm(route.distanceMm,unit):''} onChange={e=>{
              try{routeChange(index,{...route,distanceMm:e.target.value===''?NaN:distanceToMm(Number(e.target.value),unit)});}catch(failure){setError((failure as Error).message);}
            }}/></label>
          <label className="field">Jednostka długości<select aria-label={`${label} jednostka`} value={unit}
            onChange={e=>setUnits(units.map((u,i)=>i===index?e.target.value as DistanceUnit:u))}><option value="mm">mm</option><option value="m">m</option></select></label></>}
      </div>
      {route.kind==='declared'?<><label className="toolbar"><input type="checkbox" aria-label={`${label} potwierdzenie`} checked={confirmed[index]??false}
        onChange={e=>setConfirmed(confirmed.map((value,i)=>i===index?e.target.checked:value))}/>Potwierdzam długość i źródło tej trasy.</label>
        <TransportTimingEditor label={label} route={route} onChange={timing => {
          const {transportTime, transportCalculation, ...base} = route;
          change({...network, routes: network.routes.map((item, i) => i === index ? {...base, ...timing} : item)});
        }}/>
        <p className="muted">Definicja sieci; połączenie zewnętrzne nie uruchamia przewozu w harmonogramie.</p></>:
        <p aria-label={`${label} dane trasy`}>{linkedData?`Długość: ${linkedData.distanceMm} mm · źródło: ${linkedData.source}${linkedData.transportTime?` · czas: ${linkedData.transportTime.durationSeconds} s`:''}`:
          'Wybierz zgodną trasę i jej punkty końcowe, aby odczytać długość i czas.'} Dane tej drogi zmienisz w edytorze dopuszczeń i tras.</p>}
      <button onClick={()=>{change({...network,routes:network.routes.filter((_,i)=>i!==index)});setUnits(units.filter((_,i)=>i!==index));setConfirmed(confirmed.filter((_,i)=>i!==index));}}>Usuń połączenie {index+1}</button></fieldset>;
    })}
    <div className="toolbar"><button disabled={network.routes.length>=5000} onClick={()=>{
      change({...network,routes:[...network.routes,{id:'',fromPointId:'',toPointId:'',kind:'declared',distanceMm:NaN,basis:'confirmed',source:''}]});
      setUnits([...units,'mm']);setConfirmed([...confirmed,false]);
    }}>Dodaj połączenie materiałowe</button><button onClick={save}>Zapisz sieć materiałową</button>
      <button disabled={!project.materialNetwork} onClick={()=>onApply(undefined)}>Usuń zapis sieci materiałowej</button></div>
    {dirty&&<p role="status">Zmiany formularza wymagają zapisu sieci materiałowej.</p>}
    {error&&<p className="error" role="alert">Nie zapisano sieci: {error}</p>}
  </div>;
}
