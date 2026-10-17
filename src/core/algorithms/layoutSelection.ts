import type {LayoutObject} from '../models/types';
import {corners} from './layoutEngine';

export type Alignment = 'left'|'right'|'top'|'bottom';
export function expandVisualSelection(objects:LayoutObject[],id:string):string[]{
  const object=objects.find(o=>o.id===id);
  return object?.visualGroupId?objects.filter(o=>o.visualGroupId===object.visualGroupId).map(o=>o.id):object?[id]:[];
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
/** Align rotated visual outlines to the first selected object; retain all IDs and bindings. */
export function alignLayoutObjects(objects:LayoutObject[],ids:string[],alignment:Alignment):LayoutObject[]{
  const selected=ids.map(id=>objects.find(o=>o.id===id)).filter((o):o is LayoutObject=>!!o);
  if(selected.length<2)return objects;
  const horizontal=alignment==='left'||alignment==='right';
  const units=new Map<string,LayoutObject[]>();
  const key=(o:LayoutObject)=>o.visualGroupId?`group:${o.visualGroupId}`:`object:${o.id}`;
  for(const o of selected){const unit=units.get(key(o))??[];unit.push(o);units.set(key(o),unit);}
  if(units.size<2)return objects;
  const edge=(unit:LayoutObject[])=>{const values=unit.flatMap(o=>corners(o)).map(c=>horizontal?c.x:c.y);return alignment==='left'||alignment==='top'?Math.min(...values):Math.max(...values);};
  const target=edge(units.get(key(selected[0]))!);
  const offsets=new Map([...units].map(([id,unit])=>[id,target-edge(unit)]));
  if(!Number.isFinite(target)||[...offsets.values()].some(v=>!Number.isFinite(v)))throw new Error('Nieprawidłowa geometria zaznaczenia');
  const chosen=new Set(ids);
  return objects.map(o=>chosen.has(o.id)?{...o,[horizontal?'xMm':'yMm']:(horizontal?o.xMm:o.yMm)+offsets.get(key(o))!}:o);
}
