import {useState} from 'react';
import type {DomainProjectV6} from '../../core/domainProject';
import {validateSubassemblyFlow, type SubassemblyFlow, type SubassemblyLot} from '../../core/subassemblyFlow';

export function DomainSubassemblyEditor({project,onApply,onUndo,onRedo,canUndo,canRedo}:{
  project:DomainProjectV6;onApply:(flow:SubassemblyFlow|undefined)=>boolean;
  onUndo:()=>void;onRedo:()=>void;canUndo:boolean;canRedo:boolean;
}){
  const initial=()=>structuredClone(project.subassemblyFlow?.lots??[]);
  const [lots,setLots]=useState<SubassemblyLot[]>(initial);
  const [dirty,setDirty]=useState(false),[error,setError]=useState('');
  const change=(next:SubassemblyLot[])=>{setLots(next);setDirty(true);setError('');};
  const update=(index:number,next:SubassemblyLot)=>change(lots.map((lot,i)=>i===index?next:lot));
  const text=(label:string,value:string,onChange:(value:string)=>void)=><label className="field">{label}
    <input aria-label={label} value={value} onChange={e=>onChange(e.target.value)}/></label>;
  const number=(label:string,value:number,onChange:(value:number)=>void,integer=false)=><label className="field">{label}
    <input aria-label={label} type="number" min={integer?1:undefined} max={integer?10000:undefined} step={integer?1:'any'}
      value={Number.isFinite(value)?value:''} onChange={e=>onChange(e.target.value===''?NaN:Number(e.target.value))}/></label>;
  const save=()=>{
    try{
      const flow=validateSubassemblyFlow(project,{availability:'producer-finish',consumption:'consumer-start',lots});
      if(onApply(flow))setDirty(false);
    }catch(failure){setError((failure as Error).message);}
  };
  return <div className="panel" aria-label="Partie podzespołów szkicu 6">
    <h3>Partie podzespołów — przygotowanie i pobranie</h3>
    <p className="muted">Cała partia jest dostępna po zakończeniu przygotowania; przypisana ilość jest pobierana przy starcie odbiorcy. Wpisz ilości, jednostkę, źródło i konkretne wykonania. Dane nie są uzupełniane z BOM. Każde wykonanie odbiorcy wymaga własnych partii. Miejsce wynika z dopuszczeń operacji; trasy i zasoby ustawisz w panelach transportu.</p>
    <p className="muted">Jedna partia ma jednego odbiorcę. Pojemność buforów, dzielenie partii i ponowne wykorzystanie pozostałej ilości nie są modelowane. Podgląd wielu kopii dopuszcza do 64 kombinacji przypisań. JIT jawnie pomija fizyczny przepływ partii.</p>
    <div className="toolbar"><button disabled={!canUndo} onClick={onUndo}>Cofnij dane szkicu</button>
      <button disabled={!canRedo} onClick={onRedo}>Ponów dane szkicu</button></div>
    {!project.subassemblies.length&&<p className="notice">Najpierw dodaj definicje podzespołów, ich producentów i odbiorców oraz role przygotowania operacji.</p>}
    {lots.map((lot,index)=>{
      const label=`Partia ${index+1}`,definition=project.subassemblies.find(item=>item.id===lot.subassemblyId);
      return <fieldset key={index}><legend>{label}</legend><div className="form-grid">
        {text(`${label} ID`,lot.id,id=>update(index,{...lot,id}))}
        <label className="field">Podzespół<select aria-label={`${label} podzespół`} value={lot.subassemblyId} onChange={e=>update(index,{...lot,subassemblyId:e.target.value,
          producer:{...lot.producer,operationId:''},consumer:{...lot.consumer,operationId:''}})}><option value="">Wybierz podzespół</option>
          {project.subassemblies.map(item=><option key={item.id} value={item.id}>{item.name} · {item.id}</option>)}</select></label>
        {number(`${label} ilość wytworzona`,lot.quantity,quantity=>update(index,{...lot,quantity}))}
        {number(`${label} ilość pobierana`,lot.consumptionQuantity,consumptionQuantity=>update(index,{...lot,consumptionQuantity}))}
        {text(`${label} jednostka`,lot.unit,unit=>update(index,{...lot,unit}))}
        {text(`${label} źródło`,lot.source,source=>update(index,{...lot,source}))}
        {number(`${label} sztuka producenta`,lot.producer.job,job=>update(index,{...lot,producer:{...lot.producer,job}}),true)}
        <label className="field">Operacja przygotowania<select aria-label={`${label} producent`} value={lot.producer.operationId}
          onChange={e=>update(index,{...lot,producer:{...lot.producer,operationId:e.target.value}})}><option value="">Wybierz przygotowanie</option>
          {project.operations.filter(operation=>operation.id===definition?.producerOperationId).map(operation=><option key={operation.id} value={operation.id}>{operation.name} · {operation.id}</option>)}</select></label>
        {number(`${label} sztuka odbiorcy`,lot.consumer.job,job=>update(index,{...lot,consumer:{...lot.consumer,job}}),true)}
        <label className="field">Operacja odbiorcy<select aria-label={`${label} odbiorca`} value={lot.consumer.operationId}
          onChange={e=>update(index,{...lot,consumer:{...lot.consumer,operationId:e.target.value}})}><option value="">Wybierz odbiorcę</option>
          {project.operations.filter(operation=>definition?.consumerOperationIds.includes(operation.id)).map(operation=><option key={operation.id} value={operation.id}>{operation.name} · {operation.id}</option>)}</select></label>
      </div><button onClick={()=>change(lots.filter((_,i)=>i!==index))}>Usuń partię {index+1}</button></fieldset>;
    })}
    <div className="toolbar"><button disabled={lots.length>=5000||!project.subassemblies.length} onClick={()=>change([...lots,{id:'',subassemblyId:'',quantity:NaN,consumptionQuantity:NaN,unit:'',source:'',producer:{job:NaN,operationId:''},consumer:{job:NaN,operationId:''}}])}>Dodaj partię podzespołu</button>
      <button onClick={save}>Zapisz partie podzespołów</button>
      <button disabled={!dirty} onClick={()=>{setLots(initial());setDirty(false);setError('');}}>Odrzuć zmiany partii</button>
      <button disabled={!project.subassemblyFlow} onClick={()=>onApply(undefined)}>Usuń konfigurację partii</button></div>
    {dirty&&<p role="status">Zmiany partii wymagają zapisu.</p>}
    {error&&<p className="error" role="alert">Nie zapisano partii: {error}</p>}
  </div>;
}
