import {useId,useLayoutEffect,useRef,useSyncExternalStore} from 'react';
type Pending={id:string;label:string;scope:string};
const pending=new Map<string,Pending>(),listeners=new Set<()=>void>();
let revision=0;
const emit=()=>{revision++;listeners.forEach(notify=>notify());};
export const getPendingDrafts=(scope?:string)=>[...pending.values()].filter(item=>!scope||item.scope===scope);
export function usePendingDraft(label:string,dirty:boolean,scope='domain'){
  const id=useId();
  useLayoutEffect(()=>{
    if(dirty){pending.set(id,{id,label,scope});emit();}
    return()=>{if(pending.delete(id))emit();};
  },[id,label,scope,dirty]);
}
export function useInitialPendingDraft(label:string,value:unknown,scope='domain'){
  const signature=JSON.stringify(value),initial=useRef(signature);
  usePendingDraft(label,signature!==initial.current,scope);
}
export function usePendingDrafts(){
  useSyncExternalStore(notify=>{listeners.add(notify);return()=>{listeners.delete(notify);};},()=>revision);
  return getPendingDrafts();
}
