import type {FacilityConfig,FacilityUnderlay,LayoutObject,Obstacle} from '../models/types';
import {corners} from './layoutEngine';

export type Alignment = 'left'|'right'|'top'|'bottom';
export type SnapSource = 'none'|'grid'|'edge'|'connection';
export type LayoutLayerId = 'underlay'|'functionalZones'|'stations'|'buffers'|'operators'|'routes'|'obstacles'|'dimensions';
export type FunctionalZoneKind = 'service'|'staging'|'communication';
export interface FunctionalZone{id:string;kind:FunctionalZoneKind;label:string;xMm:number;yMm:number;widthMm:number;lengthMm:number;sourceObjectId?:string;workstationId?:string;}
export type GeometricWarningKind = 'hall-boundary'|'obstacle-collision'|'object-collision'|'zone-obstruction'|'narrow-aisle';
export interface GeometricLayoutWarning{id:string;kind:GeometricWarningKind;scopeLabel:'Geometria rzutu (nie BHP)';message:string;objectIds:string[];obstacleIds?:string[];measuredMm?:number;thresholdMm?:number;}
export interface GeometricWarningReport{disclaimer:string;safeStateNote:string;zones:FunctionalZone[];warnings:GeometricLayoutWarning[];affectedObjectIds:string[];}
export const BHP_GEOMETRY_DISCLAIMER = 'Kontrola ma wyłącznie charakter geometryczny (obrysy 2D, granice hali, kolizje prostokątów i zadane prześwity modelowe w mm) i NIE stanowi oceny zgodności z przepisami BHP, ergonomii, ochrony przeciwpożarowej ani dopuszczenia stanowisk do eksploatacji.';
export const BHP_SAFE_STATE_NOTE = 'Brak ostrzeżeń geometrycznych oznacza wyłącznie brak nakładania się prostokątnych obrysów 2D i zachowanie zadanych prześwitów modelowych — nie potwierdza spełnienia wymogów BHP ani dopuszczenia stanowisk do eksploatacji.';
export interface SnapOptions{grid?:boolean;edges?:boolean;connections?:boolean;gridSizeMm?:number;thresholdMm?:number;}
export interface ConnectionPoint{objectId:string;kind:'center'|'left'|'right'|'top'|'bottom';x:number;y:number;}
export interface SnapGuide{kind:'edge'|'connection';axis:'x'|'y'|'point';x1:number;y1:number;x2:number;y2:number;targetId:string;}
export interface SnapResult{xMm:number;yMm:number;dx:number;dy:number;snappedX:SnapSource;snappedY:SnapSource;guides:SnapGuide[];}
export interface DistanceMeasurement{fromId:string;toId:string;centerDistanceMm:number;dxCenterMm:number;dyCenterMm:number;edgeGapMm:number;gapXMm:number;gapYMm:number;c1:{x:number;y:number};c2:{x:number;y:number};p1:{x:number;y:number};p2:{x:number;y:number};}
export interface PointDistanceMeasurement{x1:number;y1:number;x2:number;y2:number;dxMm:number;dyMm:number;distanceMm:number;}
const copySuffix=(id:string)=>id.match(/-COPY-\d+$/)?.[0]??'';
export function classifyLayoutObjectLayer(o:Pick<LayoutObject,'type'>):'stations'|'buffers'|'operators'{
  if(o.type==='OperatorErgoMat')return 'operators';
  if(o.type==='Table'||o.type==='TableESD'||o.type==='TableToolRail'||o.type==='QualityGate'||o.type==='ReworkStation')return 'stations';
  return 'buffers';
}
export function lockLayoutObjects(objects:LayoutObject[],ids:string[],locked:boolean):LayoutObject[]{
  const chosen=new Set(ids);
  return objects.map(o=>{if(!chosen.has(o.id))return o;const {locked:_,...rest}=o;return locked?{...rest,locked:true}:rest;});
}
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
  return objects.map(o=>moved.has(o.id)&&!o.locked?{...o,xMm:o.xMm+dx,yMm:o.yMm+dy}:o);
}
export function groupLayoutObjects(objects:LayoutObject[],ids:string[],groupId:string|null):LayoutObject[]{
  const chosen=new Set(ids);
  return objects.map(o=>{if(!chosen.has(o.id))return o;const {visualGroupId:_,...rest}=o;return groupId?{...rest,visualGroupId:groupId}:rest;});
}
/** Copies are visual geometry, deliberately detached from production station bindings and unlocked by default. */
export function copyLayoutObjects(objects:LayoutObject[],ids:string[],dx:number,dy:number,newId:()=>string):{objects:LayoutObject[];ids:string[]}{
  if(!Number.isFinite(dx)||!Number.isFinite(dy))throw new Error('Podaj jawne przesunięcie kopii w mm');
  const selected=[...new Set(ids)].map(id=>objects.find(o=>o.id===id)).filter((o):o is LayoutObject=>!!o);
  if(objects.length+selected.length>5000)throw new Error('Limit 5000 obiektów layoutu');
  const used=new Set(objects.flatMap(o=>o.visualGroupId?[o.id,o.visualGroupId]:[o.id])),groups=new Map<string,string>();
  const fresh=()=>{const id=newId();if(!id||used.has(id))throw new Error('Powtórzone ID kopii');used.add(id);return id;};
  const copies=selected.map(o=>{const {workstationId:_,visualGroupId:group,locked:_locked,...geometry}=o;const copy={...geometry,id:fresh(),name:`${o.name} — kopia`,xMm:o.xMm+dx,yMm:o.yMm+dy};if(group){if(!groups.has(group))groups.set(group,fresh());return {...copy,visualGroupId:groups.get(group)!};}return copy;});
  return {objects:[...objects,...copies],ids:copies.map(o=>o.id)};
}
/** Align rotated visual outlines to the first selected object; retain all IDs, station assemblies and bindings. Locked units do not move. */
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
    if(unitIds.some(id=>objects.find(o=>o.id===id)?.locked))continue;
    for(const id of unitIds)objectOffsets.set(id,offset);
  }
  if(!Number.isFinite(target))throw new Error('Nieprawidłowa geometria zaznaczenia');
  return objects.map(o=>objectOffsets.has(o.id)&&!o.locked?{...o,[horizontal?'xMm':'yMm']:(horizontal?o.xMm:o.yMm)+objectOffsets.get(o.id)!}:o);
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
function closestPointOnSegment(p:{x:number;y:number},a:{x:number;y:number},b:{x:number;y:number}):{x:number;y:number}{
  const vx=b.x-a.x,vy=b.y-a.y,lenSq=vx*vx+vy*vy;
  if(lenSq<=1e-9)return a;
  const t=Math.max(0,Math.min(1,((p.x-a.x)*vx+(p.y-a.y)*vy)/lenSq));
  return {x:a.x+t*vx,y:a.y+t*vy};
}
function polygonsOverlap(a:ReturnType<typeof corners>,b:ReturnType<typeof corners>):boolean{
  for(const poly of [a,b])for(let i=0;i<4;i++){
    const p=poly[i],q=poly[(i+1)%4],axis={x:-(q.y-p.y),y:q.x-p.x};
    const pa=a.map(v=>v.x*axis.x+v.y*axis.y),pb=b.map(v=>v.x*axis.x+v.y*axis.y);
    if(Math.max(...pa)<=Math.min(...pb)+0.01||Math.max(...pb)<=Math.min(...pa)+0.01)return false;
  }
  return true;
}
export function measureObjectsDistance(a:LayoutObject,b:LayoutObject):DistanceMeasurement{
  const c1={x:Math.round(a.xMm+a.widthMm/2),y:Math.round(a.yMm+a.lengthMm/2)};
  const c2={x:Math.round(b.xMm+b.widthMm/2),y:Math.round(b.yMm+b.lengthMm/2)};
  const dxCenterMm=Math.round((b.xMm+b.widthMm/2)-(a.xMm+a.widthMm/2));
  const dyCenterMm=Math.round((b.yMm+b.lengthMm/2)-(a.yMm+a.lengthMm/2));
  const centerDistanceMm=Math.round(Math.hypot(dxCenterMm,dyCenterMm));
  const polyA=corners(a),polyB=corners(b);
  const xsA=polyA.map(v=>v.x),ysA=polyA.map(v=>v.y),xsB=polyB.map(v=>v.x),ysB=polyB.map(v=>v.y);
  const gapXMm=Math.round(Math.max(0,Math.max(Math.min(...xsA)-Math.max(...xsB),Math.min(...xsB)-Math.max(...xsA))));
  const gapYMm=Math.round(Math.max(0,Math.max(Math.min(...ysA)-Math.max(...ysB),Math.min(...ysB)-Math.max(...ysA))));
  if(polygonsOverlap(polyA,polyB)){
    return {fromId:a.id,toId:b.id,centerDistanceMm,dxCenterMm,dyCenterMm,edgeGapMm:0,gapXMm,gapYMm,c1,c2,p1:c1,p2:c2};
  }
  let bestDist=Infinity,bestP1=c1,bestP2=c2;
  for(const va of polyA)for(let i=0;i<4;i++){
    const qb=closestPointOnSegment(va,polyB[i],polyB[(i+1)%4]);
    const d=Math.hypot(qb.x-va.x,qb.y-va.y);
    if(d<bestDist){bestDist=d;bestP1=va;bestP2=qb;}
  }
  for(const vb of polyB)for(let i=0;i<4;i++){
    const qa=closestPointOnSegment(vb,polyA[i],polyA[(i+1)%4]);
    const d=Math.hypot(vb.x-qa.x,vb.y-qa.y);
    if(d<bestDist){bestDist=d;bestP1=qa;bestP2=vb;}
  }
  return {
    fromId:a.id,toId:b.id,centerDistanceMm,dxCenterMm,dyCenterMm,
    edgeGapMm:Math.round(bestDist),gapXMm,gapYMm,c1,c2,
    p1:{x:Math.round(bestP1.x),y:Math.round(bestP1.y)},
    p2:{x:Math.round(bestP2.x),y:Math.round(bestP2.y)},
  };
}
export function measurePointsDistance(a:{x:number;y:number},b:{x:number;y:number}):PointDistanceMeasurement{
  const x1=Math.round(a.x),y1=Math.round(a.y),x2=Math.round(b.x),y2=Math.round(b.y);
  const dxMm=x2-x1,dyMm=y2-y1,distanceMm=Math.round(Math.hypot(dxMm,dyMm));
  return {x1,y1,x2,y2,dxMm,dyMm,distanceMm};
}
export function underlayDimensionsMm(u:Pick<FacilityUnderlay,'imageWidthPx'|'imageHeightPx'|'mmPerPixel'>):{widthMm:number;lengthMm:number}{
  if(!Number.isFinite(u.imageWidthPx)||u.imageWidthPx<1||!Number.isFinite(u.imageHeightPx)||u.imageHeightPx<1||!Number.isFinite(u.mmPerPixel)||u.mmPerPixel<0.01)throw new Error('Nieprawidłowe parametry wymiarowe podkładu hali');
  return {widthMm:Math.max(1,Math.round(u.imageWidthPx*u.mmPerPixel)),lengthMm:Math.max(1,Math.round(u.imageHeightPx*u.mmPerPixel))};
}
export function calibrateUnderlayScale(u:FacilityUnderlay,p1Mm:{x:number;y:number},p2Mm:{x:number;y:number},actualDistanceMm:number):FacilityUnderlay{
  if(!Number.isFinite(actualDistanceMm)||actualDistanceMm<=0)throw new Error('Rzeczywista odległość kalibracji musi być dodatnia [mm]');
  if(!Number.isFinite(u.mmPerPixel)||u.mmPerPixel<0.01)throw new Error('Nieprawidłowa bieżąca skala podkładu');
  const canvasDistMm=Math.hypot(p2Mm.x-p1Mm.x,p2Mm.y-p1Mm.y);
  const spanPx=canvasDistMm/u.mmPerPixel;
  if(!Number.isFinite(spanPx)||spanPx<1)throw new Error('Wskaż dwa różne punkty na podkładzie (odległość ≥ 1 px)');
  const nextMmPerPixel=Number((actualDistanceMm/spanPx).toFixed(6));
  if(nextMmPerPixel<0.01||nextMmPerPixel>10000)throw new Error('Skala podkładu poza zakresem 0,01–10000 mm/px');
  return {...u,mmPerPixel:nextMmPerPixel,calibratedDistanceMm:Math.round(actualDistanceMm),calibratedSpanPx:Number(spanPx.toFixed(2))};
}
function objectBoundingBox(o:{xMm:number;yMm:number;widthMm:number;lengthMm:number;rotationDeg?:number}){
  const pts=corners(o);
  const xs=pts.map(p=>p.x),ys=pts.map(p=>p.y);
  const minX=Math.round(Math.min(...xs)),maxX=Math.round(Math.max(...xs));
  const minY=Math.round(Math.min(...ys)),maxY=Math.round(Math.max(...ys));
  return {xMm:minX,yMm:minY,widthMm:Math.max(1,maxX-minX),lengthMm:Math.max(1,maxY-minY)};
}
export function computeFunctionalZones(objects:LayoutObject[],facility:FacilityConfig,aisleMm=2000):FunctionalZone[]{
  const zones:FunctionalZone[]=[];
  const hallW=Math.max(1000,facility.widthMm||10000),hallL=Math.max(1000,facility.lengthMm||10000);
  const stationsWithMat=new Set<string>();
  for(const o of objects){
    if(o.type==='OperatorErgoMat'){
      const box=objectBoundingBox(o);
      const pad=150;
      const xMm=Math.max(0,box.xMm-pad),yMm=Math.max(0,box.yMm-pad);
      const widthMm=Math.min(hallW-xMm,box.widthMm+2*pad),lengthMm=Math.min(hallL-yMm,box.lengthMm+2*pad);
      const suffix=copySuffix(o.id);
      if(o.workstationId)stationsWithMat.add(`${o.workstationId}${suffix}`);
      zones.push({
        id:`ZONE-SRV-${o.id}`,
        kind:'service',
        label:`Strefa obsługi (${o.workstationId??o.name})`,
        xMm,yMm,widthMm,lengthMm,
        sourceObjectId:o.id,
        workstationId:o.workstationId,
      });
    } else if(classifyLayoutObjectLayer(o)==='buffers'){
      const box=objectBoundingBox(o);
      const pad=140;
      const xMm=Math.max(0,box.xMm-pad),yMm=Math.max(0,box.yMm-pad);
      const widthMm=Math.min(hallW-xMm,box.widthMm+2*pad),lengthMm=Math.min(hallL-yMm,box.lengthMm+2*pad);
      zones.push({
        id:`ZONE-STG-${o.id}`,
        kind:'staging',
        label:`Strefa odkładania (${o.workstationId?`FIFO ${o.workstationId}`:o.name})`,
        xMm,yMm,widthMm,lengthMm,
        sourceObjectId:o.id,
        workstationId:o.workstationId,
      });
    }
  }
  for(const o of objects){
    if(classifyLayoutObjectLayer(o)==='stations'){
      const suffix=copySuffix(o.id);
      if(o.workstationId&&stationsWithMat.has(`${o.workstationId}${suffix}`))continue;
      const box=objectBoundingBox(o);
      const depth=800;
      const xMm=box.xMm,yMm=Math.min(hallL-depth,box.yMm+box.lengthMm+80);
      zones.push({
        id:`ZONE-SRV-${o.id}`,
        kind:'service',
        label:`Strefa obsługi (${o.workstationId??o.name})`,
        xMm,yMm,widthMm:box.widthMm,lengthMm:depth,
        sourceObjectId:o.id,
        workstationId:o.workstationId,
      });
    }
  }
  if(objects.length>0){
    const boxes=objects.map(objectBoundingBox);
    const minX=Math.max(0,Math.min(...boxes.map(b=>b.xMm))-300);
    const maxX=Math.min(hallW,Math.max(...boxes.map(b=>b.xMm+b.widthMm))+300);
    const corridorWidth=Math.max(800,Math.min(3600,Math.round(aisleMm||2000)));
    const tables=objects.filter(o=>classifyLayoutObjectLayer(o)==='stations').map(objectBoundingBox).sort((a,b)=>a.yMm-b.yMm);
    let addedInterRow=false;
    for(let i=0;i+1<tables.length;i++){
      const gapStart=tables[i].yMm+tables[i].lengthMm+950;
      const gapEnd=tables[i+1].yMm-1450;
      if(gapEnd-gapStart>=700){
        zones.push({
          id:`ZONE-COM-ROW-${i+1}`,
          kind:'communication',
          label:`Strefa komunikacji międzyrzędowej (${gapEnd-gapStart} mm)`,
          xMm:minX,
          yMm:gapStart,
          widthMm:Math.max(1000,maxX-minX),
          lengthMm:gapEnd-gapStart,
        });
        addedInterRow=true;
        break;
      }
    }
    if(!addedInterRow){
      const maxY=Math.max(...boxes.map(b=>b.yMm+b.lengthMm));
      const minY=Math.min(...boxes.map(b=>b.yMm));
      const frontY=maxY+250+corridorWidth<=hallL?maxY+250:Math.max(0,minY-corridorWidth-250);
      zones.push({
        id:'ZONE-COM-MAIN',
        kind:'communication',
        label:`Strefa komunikacji wzdłuż linii (${corridorWidth} mm)`,
        xMm:minX,
        yMm:Math.max(0,Math.min(hallL-corridorWidth,frontY)),
        widthMm:Math.max(1000,maxX-minX),
        lengthMm:Math.min(corridorWidth,hallL),
      });
    }
  }
  return zones;
}
export function analyzeGeometricLayoutWarnings(
  objects:LayoutObject[],
  obstacles:Obstacle[],
  facility:FacilityConfig,
  settings:{spacingMm?:number;aisleMm?:number}={spacingMm:700,aisleMm:2000}
):GeometricWarningReport{
  const zones=computeFunctionalZones(objects,facility,settings.aisleMm??2000);
  const warnings:GeometricLayoutWarning[]=[];
  const affected=new Set<string>();
  const minClearanceMm=Math.max(200,Math.min(600,Math.round(settings.spacingMm??700)));

  objects.forEach((o,i)=>{
    const c=corners(o);
    if(c.some(v=>v.x<0||v.y<0||v.x>facility.widthMm||v.y>facility.lengthMm)||o.zMm<0||o.zMm+o.heightMm>facility.heightMm){
      affected.add(o.id);
      warnings.push({
        id:`WARN-BND-${o.id}`,
        kind:'hall-boundary',
        scopeLabel:'Geometria rzutu (nie BHP)',
        message:`[Geometria rzutu — nie BHP] ${o.name}: obrys wykracza poza granice modelu hali (${facility.widthMm} × ${facility.lengthMm} × ${facility.heightMm} mm).`,
        objectIds:[o.id],
      });
    }
    obstacles.forEach(b=>{
      if(polygonsOverlap(c,corners(b))){
        affected.add(o.id);
        warnings.push({
          id:`WARN-OBS-${o.id}-${b.id}`,
          kind:'obstacle-collision',
          scopeLabel:'Geometria rzutu (nie BHP)',
          message:`[Geometria rzutu — nie BHP] ${o.name}: nakładanie obrysu 2D z przeszkodą „${b.name}”.`,
          objectIds:[o.id],
          obstacleIds:[b.id],
          measuredMm:0,
        });
      }
    });
    objects.slice(i+1).forEach(b=>{
      if(polygonsOverlap(c,corners(b))){
        affected.add(o.id);affected.add(b.id);
        warnings.push({
          id:`WARN-OBJ-${o.id}-${b.id}`,
          kind:'object-collision',
          scopeLabel:'Geometria rzutu (nie BHP)',
          message:`[Geometria rzutu — nie BHP] ${o.name} ↔ ${b.name}: wzajemne nakładanie obrysów 2D (prześwit 0 mm).`,
          objectIds:[o.id,b.id],
          measuredMm:0,
        });
      } else if(classifyLayoutObjectLayer(o)==='stations'&&classifyLayoutObjectLayer(b)==='stations'){
        const dist=measureObjectsDistance(o,b);
        if(dist.edgeGapMm>0&&dist.edgeGapMm<minClearanceMm){
          affected.add(o.id);affected.add(b.id);
          warnings.push({
            id:`WARN-GAP-${o.id}-${b.id}`,
            kind:'narrow-aisle',
            scopeLabel:'Geometria rzutu (nie BHP)',
            message:`[Geometria rzutu — nie BHP] ${o.name} ↔ ${b.name}: prześwit geometryczny między stołami wynosi ${dist.edgeGapMm} mm (poniżej progu kontrolnego ${minClearanceMm} mm).`,
            objectIds:[o.id,b.id],
            measuredMm:dist.edgeGapMm,
            thresholdMm:minClearanceMm,
          });
        }
      }
    });
  });

  for(const z of zones){
    const zPoly=corners(z);
    for(const b of obstacles){
      if(polygonsOverlap(zPoly,corners(b))){
        if(z.sourceObjectId)affected.add(z.sourceObjectId);
        warnings.push({
          id:`WARN-ZONE-${z.id}-${b.id}`,
          kind:'zone-obstruction',
          scopeLabel:'Geometria rzutu (nie BHP)',
          message:`[Geometria rzutu — nie BHP] ${z.label}: w obrysie strefy znajduje się przeszkoda „${b.name}”.`,
          objectIds:z.sourceObjectId?[z.sourceObjectId]:[],
          obstacleIds:[b.id],
        });
      }
    }
  }

  return {
    disclaimer:BHP_GEOMETRY_DISCLAIMER,
    safeStateNote:BHP_SAFE_STATE_NOTE,
    zones,
    warnings,
    affectedObjectIds:[...affected],
  };
}


