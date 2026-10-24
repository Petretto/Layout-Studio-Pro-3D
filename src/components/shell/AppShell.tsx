import {useEffect,useId,useRef,useState,type ReactNode} from 'react';
import {ChevronDown,FolderOpen,Download,Undo2,Redo2,Save,Settings2,LayoutDashboard,Package,Workflow,ChartNoAxesCombined,Box,FileText,type LucideIcon} from 'lucide-react';
import {APP_AREAS,areaForView,areaDestination,type AreaId} from '../../core/uiNavigation';
import './AppShell.css';

export function IconButton({label,icon:Icon,onClick,disabled=false}:{label:string;icon:LucideIcon;onClick:()=>void;disabled?:boolean}){
  return <span className="shell-icon-wrap" data-tooltip={label}><button type="button" className="shell-icon" aria-label={label} disabled={disabled} onClick={onClick}><Icon size={18} aria-hidden="true"/></button></span>;
}
export interface ShellAction {label:string;onSelect:()=>void;disabled?:boolean}
/** Keyboard menu; closes on outside pointer/focus and restores focus on Escape/selection. */
function ActionMenu({label,icon:Icon,children,actions}:{label:string;icon:LucideIcon;children?:ReactNode;actions:ShellAction[]}){
  const [open,setOpen]=useState(false),id=useId(),root=useRef<HTMLDivElement>(null),trigger=useRef<HTMLButtonElement>(null),panel=useRef<HTMLDivElement>(null);
  const close=(restore=false)=>{setOpen(false);if(restore)trigger.current?.focus();};
  useEffect(()=>{
    if(!open)return;
    panel.current?.querySelector<HTMLButtonElement>('button:not(:disabled)')?.focus();
    const outside=(e:Event)=>{if(!root.current?.contains(e.target as Node))setOpen(false);};
    document.addEventListener('pointerdown',outside);document.addEventListener('focusin',outside);
    return()=>{document.removeEventListener('pointerdown',outside);document.removeEventListener('focusin',outside);};
  },[open]);
  return <div className="shell-menu" ref={root} onKeyDown={e=>{
    if(e.key==='Escape'&&open){e.stopPropagation();e.preventDefault();close(true);}
    if(['ArrowDown','ArrowUp','Home','End'].includes(e.key)){
      e.preventDefault();if(!open){setOpen(true);return;}
      const items=Array.from(panel.current?.querySelectorAll<HTMLButtonElement>('button:not(:disabled)')??[]),index=items.indexOf(document.activeElement as HTMLButtonElement);
      const next=e.key==='Home'?0:e.key==='End'?items.length-1:(index+(e.key==='ArrowDown'?1:-1)+items.length)%items.length;items[next]?.focus();
    }
  }}>
    <button type="button" className={`shell-menu-trigger ${children?'shell-project-trigger':''}`} aria-label={label} title={label} ref={trigger} aria-haspopup="menu" aria-expanded={open} aria-controls={id} onClick={()=>setOpen(v=>!v)}><Icon size={18} aria-hidden="true"/>{children??<span className="shell-menu-label">{label}</span>}<ChevronDown size={14} aria-hidden="true"/></button>
    {open&&<div className="shell-menu-panel" id={id} ref={panel} role="menu" aria-label={label}>{actions.map(action=><button type="button" role="menuitem" key={action.label} disabled={action.disabled} onClick={()=>{close(true);action.onSelect();}}>{action.label}</button>)}</div>}
  </div>;
}
export function AppHeader({name,canUndo,canRedo,onUndo,onRedo,onSave,projectActions,exportActions,settingsActions}:{name:string;canUndo:boolean;canRedo:boolean;onUndo:()=>void;onRedo:()=>void;onSave:()=>void;projectActions:ShellAction[];exportActions:ShellAction[];settingsActions:ShellAction[]}){
  return <header className="studio-header shell-header"><div className="shell-brand"><Box size={22} aria-hidden="true"/><span>LAYOUT STUDIO<small>PRO 3D · 0.4.0</small></span></div>
    <ActionMenu label="Menu projektu" icon={FolderOpen} actions={projectActions}><span className="shell-project-name" title={name}>{name}</span></ActionMenu>
    <div className="shell-header-actions"><IconButton label="Cofnij" icon={Undo2} disabled={!canUndo} onClick={onUndo}/><IconButton label="Ponów" icon={Redo2} disabled={!canRedo} onClick={onRedo}/><IconButton label="Zapisz lokalnie" icon={Save} onClick={onSave}/><ActionMenu label="Eksport" icon={Download} actions={exportActions}/><ActionMenu label="Ustawienia i pomoc" icon={Settings2} actions={settingsActions}/></div>
  </header>;
}
const areaIcons=[LayoutDashboard,Package,Workflow,ChartNoAxesCombined,Box,FileText];
export function AppNavigation({view,onChange,ready}:{view:string;onChange:(view:string)=>void;ready:Record<string,boolean>}){
  const area=areaForView(view),remembered=useRef<Partial<Record<AreaId,string>>>({});
  useEffect(()=>{remembered.current[area.id]=view;},[view,area.id]);
  return <>
    <nav className="studio-nav shell-nav" aria-label="Obszary projektu"><select className="shell-area-select" aria-label="Obszar pracy" value={area.id} onChange={e=>onChange(areaDestination(e.target.value as AreaId,view,remembered.current))}>{APP_AREAS.map(item=><option key={item.id} value={item.id}>{item.label}</option>)}</select>{APP_AREAS.map((item,i)=>{const Icon=areaIcons[i];return <button type="button" key={item.id} aria-current={area.id===item.id?'page':undefined} className={area.id===item.id?'active':''} onClick={()=>onChange(areaDestination(item.id,view,remembered.current))}><Icon size={17} aria-hidden="true"/>{item.label}</button>;})}</nav>
    {area.views.length>1&&<nav className="shell-subnav" aria-label={`Widoki: ${area.label}`}><select className="shell-view-select" aria-label="Widok obszaru" value={view} onChange={e=>onChange(e.target.value)}>{area.views.map(item=><option key={item.id} value={item.id}>{item.label}</option>)}</select>{area.views.map(item=><button type="button" key={item.id} data-view={item.id} aria-label={item.label} aria-description={item.id==='stations'?'Osobne dokumenty stanowisk i modelu domenowego':ready[item.id]?'Dane gotowe':'Wymaga danych lub kontroli'} aria-current={view===item.id?'page':undefined} onClick={()=>onChange(item.id)}>{item.label}{item.id!=='stations'&&<span aria-hidden="true" title={ready[item.id]?'Dane gotowe':'Wymaga danych lub kontroli'} className={ready[item.id]?'shell-dot ready':'shell-dot'}/>}</button>)}</nav>}
  </>;
}
