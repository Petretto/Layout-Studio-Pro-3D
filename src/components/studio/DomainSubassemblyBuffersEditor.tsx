import {useState} from 'react';
import type {DomainProjectV6} from '../../core/domainProject';
import {validateSubassemblyBuffers, type SubassemblyBuffers, type SubassemblyBufferConfig} from '../../core/subassemblyBuffers';

type Row = {subassemblyId:string; unit:string; stationId:string; copy:string; inputMode:string; input:string; outputMode:string; output:string; policy:string};

function toRow(buffer: SubassemblyBufferConfig): Row {
  return {subassemblyId:buffer.subassemblyId, unit:buffer.unit, stationId:buffer.stationId,
    copy:buffer.copy === null ? 'all' : String(buffer.copy),
    inputMode:buffer.inputCapacity === null ? 'unlimited' : 'limited', input:buffer.inputCapacity === null ? '' : String(buffer.inputCapacity),
    outputMode:buffer.outputCapacity === null ? 'unlimited' : 'limited', output:buffer.outputCapacity === null ? '' : String(buffer.outputCapacity),
    policy:buffer.blockingPolicy ?? ''};
}

const blank = ():Row => ({subassemblyId:'',unit:'',stationId:'',copy:'',inputMode:'',input:'',outputMode:'',output:'',policy:''});
function numberCapacity(mode:string, value:string):number|null {
  if (mode === 'unlimited') return null;
  if (mode !== 'limited' || value.trim() === '') throw new Error('Wybierz pojemność i wpisz jej wartość.');
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 0) throw new Error('Pojemność musi być nieujemną liczbą całkowitą.');
  return parsed;
}

export function DomainSubassemblyBuffersEditor({project,onApply,onUndo,onRedo,canUndo,canRedo}:{
  project:DomainProjectV6; onApply:(buffers:SubassemblyBuffers|undefined)=>boolean;
  onUndo:()=>void; onRedo:()=>void; canUndo:boolean; canRedo:boolean;
}) {
  const initial = () => (project.subassemblyBuffers?.buffers ?? []).map(toRow);
  const [rows,setRows] = useState<Row[]>(initial);
  const [dirty,setDirty] = useState(false);
  const [error,setError] = useState('');
  const change = (next:Row[]) => {setRows(next); setDirty(true); setError('');};
  const update = (index:number, patch:Partial<Row>) => change(rows.map((row,i)=>i===index ? {...row,...patch} : row));
  const save = () => {
    try {
      const buffers = rows.map(row => ({subassemblyId:row.subassemblyId,unit:row.unit,stationId:row.stationId,
        copy:row.copy === 'all' ? null : row.copy === '' ? undefined : Number(row.copy),
        inputCapacity:numberCapacity(row.inputMode,row.input),outputCapacity:numberCapacity(row.outputMode,row.output),blockingPolicy:row.policy}));
      const validated = validateSubassemblyBuffers(project,{buffers});
      if (onApply(validated)) {setDirty(false); setError('');}
    } catch (failure) {setError((failure as Error).message);}
  };
  return <div className="panel" aria-label="Bufory podmontaży szkicu 6">
    <h3>Bufory podmontaży — pojemności i reguły blokowania</h3>
    <p className="muted">Każdy podzespół i korpus mają osobne pojemności. Liczy się sztuki, nie partie: reszta nadal zajmuje miejsce. Wszystkie kopie oznaczają osobny limit na każdej kopii.</p>
    <p className="muted">Wejście 0 wymaga gotowego odbiorcy i pełnego pobrania bez reszty. Jedna partia bezpośrednia może być pobrana razem z partiami z osobnych dodatnich buforów, gdy korpus jest już w kopii. Dodatnie bufory korpusów w procesie z gałęziami obsługują osobną jawną ścieżkę i zwolnienie operatora po obróbce. Więcej niż jedna partia bezpośrednia i połączenie wejścia 0 podmontażu ze skończonymi buforami korpusu wymagają dalszej integracji.</p>
    <div className="toolbar"><button disabled={!canUndo} onClick={onUndo}>Cofnij dane szkicu</button><button disabled={!canRedo} onClick={onRedo}>Ponów dane szkicu</button></div>
    {(!project.subassemblies.length || !project.stations.length) && <p className="notice">Najpierw dodaj podzespoły i stanowiska.</p>}
    {rows.map((row,index)=>{
      const label=`Bufor podmontażu ${index+1}`;
      const count=project.stationSettings[row.stationId]?.parallelStations ?? 0;
      return <fieldset key={index}><legend>{label}</legend><div className="form-grid">
        <label className="field">Podzespół<select aria-label={`${label} podzespół`} value={row.subassemblyId} onChange={e=>update(index,{subassemblyId:e.target.value,unit:''})}>
          <option value="">Wybierz podzespół</option>{project.subassemblies.map(item=><option key={item.id} value={item.id}>{item.name} · {item.id}</option>)}
        </select></label>
        <label className="field">Jednostka<input aria-label={`${label} jednostka`} value={row.unit} onChange={e=>update(index,{unit:e.target.value})}/></label>
        <label className="field">Stanowisko<select aria-label={`${label} stanowisko`} value={row.stationId} onChange={e=>update(index,{stationId:e.target.value,copy:''})}>
          <option value="">Wybierz stanowisko</option>{project.stations.map(item=><option key={item.id} value={item.id}>{item.name} · {item.id}</option>)}
        </select></label>
        <label className="field">Zakres kopii<select aria-label={`${label} kopia`} value={row.copy} onChange={e=>update(index,{copy:e.target.value})}>
          <option value="">Wybierz zakres</option><option value="all">Wszystkie kopie osobno</option>{Array.from({length:count},(_,i)=>i+1).map(n=><option key={n} value={String(n)}>Kopia {n}</option>)}
        </select></label>
        {(['input','output'] as const).map(side=>{
          const title=side==='input'?'wejściowa':'wyjściowa', mode=side==='input'?row.inputMode:row.outputMode, value=side==='input'?row.input:row.output;
          return <div className="field" key={side}><label>Pojemność {title}<select aria-label={`${label} pojemność ${title} rodzaj`} value={mode} onChange={e=>update(index,side==='input'?{inputMode:e.target.value,input:''}:{outputMode:e.target.value,output:''})}>
            <option value="">Wybierz</option><option value="limited">Określona</option><option value="unlimited">Bez limitu</option>
          </select></label>{mode==='limited'&&<input type="number" min={0} step={1} aria-label={`${label} pojemność ${title}`} value={value} onChange={e=>update(index,side==='input'?{input:e.target.value}:{output:e.target.value})}/>}</div>;
        })}
        <label className="field">Operator przy blokadzie wyjścia<select aria-label={`${label} polityka operatora`} value={row.policy} onChange={e=>update(index,{policy:e.target.value})}>
          <option value="">Wybierz politykę</option><option value="bbas">Zatrzymany do zwolnienia wyjścia</option><option value="bbas-worker-released">Zwolniony po przetwarzaniu</option>
        </select></label>
      </div><button onClick={()=>change(rows.filter((_,i)=>i!==index))}>Usuń bufor podmontażu {index+1}</button></fieldset>;
    })}
    <div className="toolbar">
      <button disabled={rows.length>=1000 || !project.subassemblies.length || !project.stations.length} onClick={()=>change([...rows,blank()])}>Dodaj bufor podmontażu</button>
      <button onClick={save}>Zapisz bufory podmontaży</button>
      <button disabled={!dirty} onClick={()=>{setRows(initial());setDirty(false);setError('');}}>Odrzuć zmiany podmontaży</button>
      <button disabled={!project.subassemblyBuffers} onClick={()=>onApply(undefined)}>Usuń konfigurację buforów podmontaży</button>
    </div>
    {dirty&&<p role="status">Zmiany buforów podmontaży wymagają zapisu.</p>}
    {error&&<p className="error" role="alert">Nie zapisano buforów podmontaży: {error}</p>}
  </div>;
}
