import {useState} from 'react';
import type {DomainProjectV6} from '../../core/domainProject';
import {validateAssemblyTransport,type AssemblyTransport} from '../../core/assemblyTransport';

export function DomainTransportEditor({project,onApply,onUndo,onRedo,canUndo,canRedo}:{
  project:DomainProjectV6;onApply:(value:AssemblyTransport)=>boolean;
  onUndo:()=>void;onRedo:()=>void;canUndo:boolean;canRedo:boolean;
}) {
  const [transport,setTransport]=useState<AssemblyTransport>(()=>structuredClone(project.assemblyTransport??{
    scope:'assembly-only',carts:[],conveyors:[],emptyRoutes:[],routes:[]}));
  const [dirty,setDirty]=useState(false),[error,setError]=useState('');
  const initialChoices=()=>Object.fromEntries((project.assemblyTransport?.routes??[]).flatMap((r,i)=>r.alternatives.flatMap((a,j)=>[
    [`${i}:${j}:people`,a.workerIds.length===0],[`${i}:${j}:devices`,a.equipmentIds.length===0]])));
  const [emptyChoices,setEmptyChoices]=useState<Record<string,boolean>>(initialChoices);
  const change=(next:AssemblyTransport)=>{setTransport(next);setDirty(true);setError('');};
  const changeRule=(index:number,rule:AssemblyTransport['routes'][number])=>change({...transport,
    routes:transport.routes.map((r,i)=>i===index?rule:r)});
  const confirmEmpty=(key:string,value:boolean)=>{setEmptyChoices({...emptyChoices,[key]:value});setDirty(true);setError('');};
  const removeChoices=(ruleIndex:number,alternativeIndex?:number)=>setEmptyChoices(current=>Object.fromEntries(
    Object.entries(current).flatMap(([key,value])=>{
      const [rule,alternative,kind]=key.split(':'),i=Number(rule),j=Number(alternative);
      if(alternativeIndex===undefined){
        if(i===ruleIndex)return [];
        return [[`${i>ruleIndex?i-1:i}:${j}:${kind}`,value]];
      }
      if(i===ruleIndex&&j===alternativeIndex)return [];
      return [[`${i}:${i===ruleIndex&&j>alternativeIndex?j-1:j}:${kind}`,value]];
    })));
  const save=()=>{
    try {
      transport.routes.forEach((rule,i)=>rule.alternatives.forEach((a,j)=>{
        if(!a.workerIds.length&&!emptyChoices[`${i}:${j}:people`])throw new Error(`Trasa ${i+1}, zestaw ${j+1}: potwierdź brak osób.`);
        if(!a.equipmentIds.length&&!emptyChoices[`${i}:${j}:devices`])throw new Error(`Trasa ${i+1}, zestaw ${j+1}: potwierdź brak urządzeń.`);
      }));
      if(onApply(validateAssemblyTransport(project,transport)))setDirty(false);
    }catch(failure){setError((failure as Error).message);}
  };
  const devices=[...transport.carts,...transport.conveyors];
  return <div className="panel" aria-label="Transport montażu szkicu 6">
    <h3>Wymagania transportu międzyoperacyjnego</h3>
    <p className="muted">Wskaż osoby montażowe i konkretne urządzenia dla każdej używanej trasy. Osoby mają wspólne rezerwacje z montażem.
      Harmonogram wybiera najwcześniejszy wykonalny zestaw; przy remisie obowiązuje kolejność poniżej. Czas pracy magazynierów nie jest liczony.</p>
    <p className="muted">Ten formularz edytuje wymagania tras. Deklaracje wózków, przenośników, kalendarzy i pustych tras pozostają zachowane;
      ich formularze są jeszcze w przygotowaniu. Bez zadeklarowanych urządzeń można jawnie wybrać transport bez urządzenia.</p>
    <div className="toolbar"><button disabled={!canUndo} onClick={onUndo}>Cofnij dane szkicu</button>
      <button disabled={!canRedo} onClick={onRedo}>Ponów dane szkicu</button></div>
    {transport.routes.map((rule,i)=><fieldset key={i}><legend>Wymaganie trasy {i+1}</legend>
      <div className="form-grid"><label className="field">Trasa<select aria-label={`Transport ${i+1} trasa`} value={rule.stationRouteId}
        onChange={e=>changeRule(i,{...rule,stationRouteId:e.target.value})}><option value="">Wybierz trasę</option>
        {(project.stationRouting?.routes??[]).map(r=><option key={r.id} value={r.id}>{r.id} · {r.from.stationId}/{r.from.copy} → {r.to.stationId}/{r.to.copy}</option>)}</select></label>
      <label className="field">Źródło reguły<input aria-label={`Transport ${i+1} źródło`} value={rule.source}
        onChange={e=>changeRule(i,{...rule,source:e.target.value})}/></label></div>
      {rule.alternatives.map((a,j)=>{
        const label=`Transport ${i+1} zestaw ${j+1}`;
        const edit=(next:typeof a)=>{
          setEmptyChoices(current=>({...current,...(a.workerIds.length&& !next.workerIds.length?{[`${i}:${j}:people`]:false}:{}),
            ...(a.equipmentIds.length&& !next.equipmentIds.length?{[`${i}:${j}:devices`]:false}:{})}));
          changeRule(i,{...rule,alternatives:rule.alternatives.map((item,k)=>k===j?next:item)});
        };
        const toggle=(ids:string[],id:string,checked:boolean)=>checked?[...ids,id]:ids.filter(v=>v!==id);
        return <fieldset key={j}><legend>Zestaw {j+1}</legend>
          <p>Osoby montażowe</p><div className="toolbar">{project.workers.map(w=><label key={w.id}><input type="checkbox"
            aria-label={`${label} osoba ${w.id}`} checked={a.workerIds.includes(w.id)} onChange={e=>edit({...a,workerIds:toggle(a.workerIds,w.id,e.target.checked)})}/>{w.name} · {w.id}</label>)}</div>
          {!a.workerIds.length&&<label><input type="checkbox" aria-label={`${label} bez osób`}
            checked={emptyChoices[`${i}:${j}:people`]??false}
            onChange={e=>confirmEmpty(`${i}:${j}:people`,e.target.checked)}/>Jawnie bez osób transportujących</label>}
          <p>Urządzenia transportowe</p><div className="toolbar">{devices.map(d=><label key={d.equipmentId}><input type="checkbox"
            aria-label={`${label} urządzenie ${d.equipmentId}`} checked={a.equipmentIds.includes(d.equipmentId)} onChange={e=>edit({...a,equipmentIds:toggle(a.equipmentIds,d.equipmentId,e.target.checked)})}/>
            {project.equipment.find(e=>e.id===d.equipmentId)?.name} · {d.equipmentId}</label>)}</div>
          {!a.equipmentIds.length&&<label><input type="checkbox" aria-label={`${label} bez urządzeń`}
            checked={emptyChoices[`${i}:${j}:devices`]??false}
            onChange={e=>confirmEmpty(`${i}:${j}:devices`,e.target.checked)}/>Jawnie bez urządzenia transportowego</label>}
          <button onClick={()=>{changeRule(i,{...rule,alternatives:rule.alternatives.filter((_,k)=>k!==j)});removeChoices(i,j);}}>Usuń zestaw {i+1}/{j+1}</button>
        </fieldset>;
      })}
      <button onClick={()=>changeRule(i,{...rule,alternatives:[...rule.alternatives,{workerIds:[],equipmentIds:[]}]})}>Dodaj zestaw do trasy {i+1}</button>
      <button onClick={()=>{change({...transport,routes:transport.routes.filter((_,k)=>k!==i)});removeChoices(i);}}>Usuń wymaganie trasy {i+1}</button>
    </fieldset>)}
    {error&&<p role="alert">{error}</p>}
    <div className="toolbar"><button onClick={()=>change({...transport,routes:[...transport.routes,{stationRouteId:'',source:'',alternatives:[]}]})}>Dodaj wymaganie trasy</button>
      <button disabled={!dirty} onClick={save}>Zapisz wymagania transportu</button>
      <button disabled={!dirty} onClick={()=>{setTransport(structuredClone(project.assemblyTransport??{scope:'assembly-only',carts:[],conveyors:[],emptyRoutes:[],routes:[]}));setEmptyChoices(initialChoices());setDirty(false);setError('');}}>Odrzuć zmiany transportu</button></div>
  </div>;
}
