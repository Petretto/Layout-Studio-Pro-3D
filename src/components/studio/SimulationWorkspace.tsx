import {useRef,useState,type ReactNode} from 'react';
import {Maximize2,Minimize2} from 'lucide-react';
import './SimulationWorkspace.css';

/** Presentation only: toggling focus keeps both Scene and Simulation mounted. */
export function SimulationWorkspace({children,actions}:{children:ReactNode;actions?:ReactNode}){
  const [focused,setFocused]=useState(false);
  const root=useRef<HTMLElement>(null),toggle=useRef<HTMLButtonElement>(null);
  return <section ref={root} className={`page simulation-workspace ${focused?'simulation-focused':''}`} role={focused?'dialog':undefined} aria-modal={focused?true:undefined} aria-label={focused?'Hala 3D — tryb skupienia':undefined} onKeyDown={e=>{
    if(e.key==='Escape'){
      const open=root.current?.querySelector<HTMLDetailsElement>('details[open]');
      if(open){e.preventDefault();e.stopPropagation();open.open=false;open.querySelector('summary')?.focus();return;}
      if(focused){e.preventDefault();e.stopPropagation();setFocused(false);toggle.current?.focus();}
    }
    if(!focused||e.key!=='Tab')return;
    const items=Array.from(root.current?.querySelectorAll<HTMLElement>('button:not(:disabled),input:not(:disabled),select:not(:disabled),summary,[tabindex="0"]')??[]).filter(el=>{
      if(!el.getClientRects().length)return false;
      // Chromium may report rectangles for controls inside closed disclosures.
      // Only the direct summary remains a tab stop in each closed ancestor.
      for(let parent=el.parentElement;parent;parent=parent.parentElement){
        if(parent.tagName==='DETAILS'&&!(parent as HTMLDetailsElement).open&&parent.querySelector(':scope > summary')!==el)return false;
      }
      return true;
    });
    const first=items[0],last=items[items.length-1],active=root.current?.ownerDocument.activeElement;
    if(e.shiftKey&&active===first){e.preventDefault();last?.focus();}
    else if(!e.shiftKey&&active===last){e.preventDefault();first?.focus();}
  }}>
    <div className="simulation-workspace-title"><h1>Hala 3D i symulacja</h1><div>{actions}<button ref={toggle} type="button" aria-pressed={focused} onClick={()=>setFocused(!focused)}>{focused?<Minimize2 size={16} aria-hidden="true"/>:<Maximize2 size={16} aria-hidden="true"/>}{focused?'Opuść tryb skupienia 3D':'Tryb skupienia 3D'}</button></div></div>
    {children}
  </section>;
}
