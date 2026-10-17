import type {LayoutObject} from '../models/types';
import {corners} from './layoutEngine';

export type Alignment = 'left'|'right'|'top'|'bottom';
const copySuffix=(id:string)=>id.match(/-COPY-\d+$/)?.[0]??'';
export function expandVisualSelection(objects:LayoutObject[],id:string):string[]{
  const object=objects.find(o=>o.id===id);
  return object?.visualGroupId?objects.filter(o=>o.visualGroupId===object.visualGroupId).map(o=>o.id):object?[id]:[];
}
/** Return all layout objects belonging to the same workstation copy assembly (table + FIFO + operator zone). */
export function workstationAssemblyIds(objects:LayoutObject[],id:string):string[]{
  const object=objects.find(o=>o.id===id);
  if(!object)return [];
  if(!object.workstationId)return [id];
  const suffix=copySuffix(object.id);
  const candidates=objects.filter(o=>o.workstationId===object.workstationId&&copySuffix(o.id)===suffix);
  return candidates.filter(o=>o.type.includes('Table')).length>1?[id]:candidates.map(o=>o.id);
}
export function expandMoveSelection(objects:LayoutObject[],ids:string[],includeStationAssembly=true):string[]{
  const queue=[...new Set(ids)].filter(id=>objects.some(o=>o.id===id)),seen=new Set(queue);
  for(let i=0;i<queue.length;i++){
    const id=queue[i];
    const linked=[...expandVisualSelection(objects,id),...(includeStationAssembly?workstationAssemblyIds(objects,id):[])];
    for(const next of linked)if(!seen.has(next)){seen.add(next);queue.push(next);}
  }
  return queue;
}
export function moveLayoutObjects(objects:LayoutObject[],ids:string[],dx:number,dy:number,includeStationAssembly=true):LayoutObject[]{
  if(!Number.isFinite(dx)||!Number.isFinite(dy))throw new Error('Nieprawidłowe przesunięcie obiektów w mm');
  const moved=new Set(expandMoveSelection(objects,ids,includeStationAssembly));
  return objects.map(o=>moved.has(o.id)?{...o,xMm:o.xMm+dx,yMm:o.yMm+dy}:o);
}
export function groupLayoutObjects(objects:LayoutObject[],ids:string[],groupId:string|null):LayoutObject[]{
  const chosen=new Set(ids);
  return objects.map(o=>{if(!chosen.has(o.id))return o;const {visualGroupId:_,...rest}=o;return groupId?{...rest,visualGroupId:groupId}:rest;});
}
/** Copies are visual geometry, deliberately detached from production station bindings. */
export function copyLayoutObjects(objects:LayoutObject[],ids:string[],dx:number,dy:number,newId:()=>string):{objects:LayoutObject[];ids:string[]}{
  if(!Number.isFinite(dx)||!Number.isFinite(dy))throw new Error('Podaj jawne przesunięcie kopii w mm');
  const selected=[...new Set(ids)].map(id=>objects.find(o=>o.id===id)).filter((o):o is LayoutObject=>!!o);
  if(objects.length+selected.length>5000)throw new Error('Limit 5000 obiektów layoutu');
  const used=new Set(objects.flatMap(o=>o.visualGroupId?[o.id,o.visualGroupId]:[o.id])),groups=new Map<string,string>();
  const fresh=()=>{const id=newId();if(!id||used.has(id))throw new Error('Powtórzone ID kopii');used.add(id);return id;};
  const copies=selected.map(o=>{const {workstationId:_,visualGroupId:group,...geometry}=o;const copy={...geometry,id:fresh(),name:`${o.name} — kopia`,xMm:o.xMm+dx,yMm:o.yMm+dy};if(group){if(!groups.has(group))groups.set(group,fresh());return {...copy,visualGroupId:groups.get(group)!};}return copy;});
  return {objects:[...objects,...copies],ids:copies.map(o=>o.id)};
}
/** Align rotated visual outlines to the first selected object; retain all IDs, station assemblies and bindings. */
export function alignLayoutObjects(objects:LayoutObject[],ids:string[],alignment:Alignment,includeStationAssembly=true):LayoutObject[]{
  const selected=ids.map(id=>objects.find(o=>o.id===id)).filter((o):o is LayoutObject=>!!o);
  if(selected.length<2)return objects;
  const horizontal=alignment==='left'||alignment==='right';
  const stationKey=(o:LayoutObject)=>{
    if(o.visualGroupId)return `group:${o.visualGroupId}`;
    const assembly=workstationAssemblyIds(objects,o.id);
    return assembly.length>1?`station:${o.workstationId}${copySuffix(o.id)}`:`object:${o.id}`;
  };
  const useAssemblyUnits=includeStationAssembly&&new Set(selected.map(stationKey)).size>=2;
  const key=(o:LayoutObject)=>useAssemblyUnits?stationKey(o):(o.visualGroupId?`group:${o.visualGroupId}`:`object:${o.id}`);
  const units=new Map<string,LayoutObject[]>();
  for(const o of selected){const unit=units.get(key(o))??[];unit.push(o);units.set(key(o),unit);}
  if(units.size<2)return objects;
  const edge=(unit:LayoutObject[])=>{const values=unit.flatMap(o=>corners(o)).map(c=>horizontal?c.x:c.y);return alignment==='left'||alignment==='top'?Math.min(...values):Math.max(...values);};
  const target=edge(units.get(key(selected[0]))!);
  const objectOffsets=new Map<string,number>();
  for(const [,unit] of units){
    const offset=target-edge(unit);
    if(!Number.isFinite(offset))throw new Error('Nieprawidłowa geometria zaznaczenia');
    const unitIds=useAssemblyUnits?expandMoveSelection(objects,unit.map(o=>o.id),true):unit.map(o=>o.id);
    for(const id of unitIds)objectOffsets.set(id,offset);
  }
  if(!Number.isFinite(target))throw new Error('Nieprawidłowa geometria zaznaczenia');
  return objects.map(o=>objectOffsets.has(o.id)?{...o,[horizontal?'xMm':'yMm']:(horizontal?o.xMm:o.yMm)+objectOffsets.get(o.id)!}:o);
}
