import type {LayoutObject,Obstacle} from '../models/types';
import {corners} from './layoutEngine';

export type Alignment = 'left'|'right'|'top'|'bottom';
export type SnapSource = 'none'|'grid'|'edge'|'connection';
export interface SnapOptions{grid?:boolean;edges?:boolean;connections?:boolean;gridSizeMm?:number;thresholdMm?:number;}
export interface ConnectionPoint{objectId:string;kind:'center'|'left'|'right'|'top'|'bottom';x:number;y:number;}
export interface SnapGuide{kind:'edge'|'connection';axis:'x'|'y'|'point';x1:number;y1:number;x2:number;y2:number;targetId:string;}
export interface SnapResult{xMm:number;yMm:number;dx:number;dy:number;snappedX:SnapSource;snappedY:SnapSource;guides:SnapGuide[];}
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
export function objectConnectionPoints(o:Pick<LayoutObject,'id'|'xMm'|'yMm'|'widthMm'|'lengthMm'|'rotationDeg'>):ConnectionPoint[]{
  const c=corners(o),mid=(a:{x:number;y:number},b:{x:number;y:number})=>({x:(a.x+b.x)/2,y:(a.y+b.y)/2});
  const top=mid(c[0],c[1]),right=mid(c[1],c[2]),bottom=mid(c[2],c[3]),left=mid(c[3],c[0]);
  return [
    {objectId:o.id,kind:'center',x:o.xMm+o.widthMm/2,y:o.yMm+o.lengthMm/2},
    {objectId:o.id,kind:'left',x:left.x,y:left.y},
    {objectId:o.id,kind:'right',x:right.x,y:right.y},
    {objectId:o.id,kind:'top',x:top.x,y:top.y},
    {objectId:o.id,kind:'bottom',x:bottom.x,y:bottom.y},
  ];
}
export function snapLayoutTranslation(objects:LayoutObject[],obstacles:Obstacle[],movedIds:string[],anchorId:string,rawDx:number,rawDy:number,options:SnapOptions={}):SnapResult{
  const anchor=objects.find(o=>o.id===anchorId);
  if(!anchor||!Number.isFinite(rawDx)||!Number.isFinite(rawDy))throw new Error('Nieprawidłowe dane przyciągania obiektu');
  const moved=new Set(movedIds.length?movedIds:[anchorId]);moved.add(anchorId);
  const stationaryObjects=objects.filter(o=>!moved.has(o.id));
  const threshold=Math.max(1,options.thresholdMm??120);
  const gridStep=options.grid&&(options.gridSizeMm??0)>1?options.gridSizeMm!:1;
  const rawAnchor:LayoutObject={...anchor,xMm:anchor.xMm+rawDx,yMm:anchor.yMm+rawDy};
  let dx=rawDx,dy=rawDy,snappedX:SnapSource='none',snappedY:SnapSource='none';
  const guides:SnapGuide[]=[];
  if(options.connections){
    const movingPts=objectConnectionPoints(rawAnchor),stationaryPts=stationaryObjects.flatMap(o=>objectConnectionPoints(o));
    let bestDist=threshold+1,bestPair:{m:ConnectionPoint;s:ConnectionPoint}|null=null;
    for(const m of movingPts)for(const s of stationaryPts){
      const dist=Math.hypot(s.x-m.x,s.y-m.y);
      if(dist<=threshold&&dist<bestDist){bestDist=dist;bestPair={m,s};}
    }
    if(bestPair){
      dx=Math.round(rawDx+(bestPair.s.x-bestPair.m.x));dy=Math.round(rawDy+(bestPair.s.y-bestPair.m.y));
      snappedX='connection';snappedY='connection';
      guides.push({kind:'connection',axis:'point',x1:bestPair.s.x,y1:bestPair.s.y,x2:bestPair.s.x,y2:bestPair.s.y,targetId:bestPair.s.objectId});
    }else{
      const mCenter=movingPts[0],sCenters=stationaryPts.filter(p=>p.kind==='center');
      let bestX=threshold+1,hitX:ConnectionPoint|null=null,bestY=threshold+1,hitY:ConnectionPoint|null=null;
      for(const s of sCenters){
        const distX=Math.abs(s.x-mCenter.x),distY=Math.abs(s.y-mCenter.y);
        if(distX<=threshold&&distX<bestX){bestX=distX;hitX=s;}
        if(distY<=threshold&&distY<bestY){bestY=distY;hitY=s;}
      }
      if(hitX){dx=Math.round(rawDx+(hitX.x-mCenter.x));snappedX='connection';guides.push({kind:'connection',axis:'x',x1:hitX.x,y1:mCenter.y+(dy-rawDy),x2:hitX.x,y2:hitX.y,targetId:hitX.objectId});}
      if(hitY){dy=Math.round(rawDy+(hitY.y-mCenter.y));snappedY='connection';guides.push({kind:'connection',axis:'y',x1:mCenter.x+(dx-rawDx),y1:hitY.y,x2:hitY.x,y2:hitY.y,targetId:hitY.objectId});}
    }
  }
  if(options.edges&&(snappedX==='none'||snappedY==='none')){
    const mCorners=corners(rawAnchor),mXs=mCorners.map(c=>c.x),mYs=mCorners.map(c=>c.y);
    const mBounds={minX:Math.min(...mXs),maxX:Math.max(...mXs),minY:Math.min(...mYs),maxY:Math.max(...mYs)};
    let bestEdgeX=threshold+1,edgeGuideX:SnapGuide|null=null,edgeDx=dx;
    let bestEdgeY=threshold+1,edgeGuideY:SnapGuide|null=null,edgeDy=dy;
    for(const item of [...stationaryObjects,...obstacles]){
      const sCorners=corners(item),sXs=sCorners.map(c=>c.x),sYs=sCorners.map(c=>c.y);
      const sBounds={minX:Math.min(...sXs),maxX:Math.max(...sXs),minY:Math.min(...sYs),maxY:Math.max(...sYs)};
      if(snappedX==='none'){
        for(const mEdge of [mBounds.minX,mBounds.maxX])for(const sEdge of [sBounds.minX,sBounds.maxX]){
          const dist=Math.abs(sEdge-mEdge);
          if(dist<=threshold&&dist<bestEdgeX){
            bestEdgeX=dist;edgeDx=Math.round(rawDx+(sEdge-mEdge));
            edgeGuideX={kind:'edge',axis:'x',x1:sEdge,y1:Math.min(mBounds.minY,sBounds.minY),x2:sEdge,y2:Math.max(mBounds.maxY,sBounds.maxY),targetId:item.id};
          }
        }
      }
      if(snappedY==='none'){
        for(const mEdge of [mBounds.minY,mBounds.maxY])for(const sEdge of [sBounds.minY,sBounds.maxY]){
          const dist=Math.abs(sEdge-mEdge);
          if(dist<=threshold&&dist<bestEdgeY){
            bestEdgeY=dist;edgeDy=Math.round(rawDy+(sEdge-mEdge));
            edgeGuideY={kind:'edge',axis:'y',x1:Math.min(mBounds.minX,sBounds.minX),y1:sEdge,x2:Math.max(mBounds.maxX,sBounds.maxX),y2:sEdge,targetId:item.id};
          }
        }
      }
    }
    if(edgeGuideX){dx=edgeDx;snappedX='edge';guides.push(edgeGuideX);}
    if(edgeGuideY){dy=edgeDy;snappedY='edge';guides.push(edgeGuideY);}
  }
  if(snappedX==='none'){
    if(options.grid&&gridStep>1){const x=Math.round((anchor.xMm+rawDx)/gridStep)*gridStep;dx=x-anchor.xMm;snappedX='grid';}
    else dx=Math.round(rawDx);
  }
  if(snappedY==='none'){
    if(options.grid&&gridStep>1){const y=Math.round((anchor.yMm+rawDy)/gridStep)*gridStep;dy=y-anchor.yMm;snappedY='grid';}
    else dy=Math.round(rawDy);
  }
  return {xMm:anchor.xMm+dx,yMm:anchor.yMm+dy,dx,dy,snappedX,snappedY,guides};
}

