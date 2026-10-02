import { LayoutObject, LayoutType, Workstation, FacilityConfig, ProjectData, ProcessStep } from '../models/types';
import { graphPositions } from './routing';
export const defaultLayoutSettings={tableWidthMm:1800,tableLengthMm:900,spacingMm:700,aisleMm:2000};
export function generate3DLayout(stations:Workstation[],type:LayoutType,facility:FacilityConfig,settings=defaultLayoutSettings,steps:ProcessStep[]=[]):LayoutObject[]{
  if(!stations.length)return [];
  const {tableWidthMm:w,tableLengthMm:l,spacingMm:gap,aisleMm:aisle}=settings;
  const pitch=Math.max(w,1400)+gap,n=stations.length,half=Math.ceil(n/2),objects:LayoutObject[]=[];
  const add=(id:string,name:string,type:LayoutObject['type'],x:number,y:number,width:number,length:number,height:number,color:string,ws?:string)=>objects.push({id,name,type,xMm:x,yMm:y,zMm:0,widthMm:width,lengthMm:length,heightMm:height,rotationDeg:0,colorHex:color,workstationId:ws});
  const rowPitch=l+2400+gap+aisle,maxCopies=Math.max(...stations.map(s=>s.parallelStations??1));
  const graph=type==='ProcessFlow'?graphPositions(steps,stations,pitch,rowPitch*maxCopies):new Map<string,{x:number;y:number}>();
  stations.forEach((s,i)=>{
    let x=i*pitch,y=0;
    if(type==='UShape'&&i>=half){x=(n-i-1)*pitch;y=rowPitch;}
    else if(type==='UShape')x=i*pitch;
    if(type==='LShape'&&i>=half){x=(half-1)*pitch;y=(i-half+1)*rowPitch;}
    y*=maxCopies;
    if(type==='ProcessFlow'){x=graph.get(s.id)!.x;y=graph.get(s.id)!.y;}
    for(let copy=0;copy<(s.parallelStations??1);copy++){
    const suffix=copy?'-COPY-'+(copy+1):'',yy=y+copy*rowPitch;
    add(`TBL-${s.id}${suffix}`,s.name+(copy?' / kopia '+(copy+1):''),'TableESD',x,yy,w,l,850,'#2563eb',s.id);
    add(`FIFO-${s.id}${suffix}`,`FIFO ${s.id}`,'FlowRackFIFO3Tier',x,yy-1400,Math.min(1400,w),1200,1600,'#d97706',s.id);
    add(`MAT-${s.id}${suffix}`,`Obsada ${s.operators??1} · ${s.id}`,'OperatorErgoMat',x,yy+l+200,Math.min(1200,w),800,25,'#059669',s.id);
    }
  });
  const tables=objects.filter(o=>o.type==='TableESD'),first=tables[0],last=tables[tables.length-1];
  add('MAT-IN','Wejście materiału','MaterialIn',first.xMm-2400-gap,first.yMm,2400,1600,100,'#7c3aed');
  add('FINISHED-GOODS','Wyroby gotowe','FinishedGoods',type==='UShape'&&n>1?last.xMm-2400-gap:last.xMm+w+gap,last.yMm,2400,1600,100,'#10b981');
  const minX=Math.min(...objects.map(o=>o.xMm)),minY=Math.min(...objects.map(o=>o.yMm));
  const maxX=Math.max(...objects.map(o=>o.xMm+o.widthMm)),maxY=Math.max(...objects.map(o=>o.yMm+o.lengthMm));
  const dx=(facility.widthMm-(maxX-minX))/2-minX,dy=(facility.lengthMm-(maxY-minY))/2-minY;
  return objects.map(o=>({...o,xMm:o.xMm+dx,yMm:o.yMm+dy}));
}
export function corners(o:{xMm:number;yMm:number;widthMm:number;lengthMm:number;rotationDeg?:number}){
  const cx=o.xMm+o.widthMm/2,cy=o.yMm+o.lengthMm/2,a=(o.rotationDeg??0)*Math.PI/180;
  return [[-1,-1],[1,-1],[1,1],[-1,1]].map(([x,y])=>({x:cx+x*o.widthMm/2*Math.cos(a)-y*o.lengthMm/2*Math.sin(a),y:cy+x*o.widthMm/2*Math.sin(a)+y*o.lengthMm/2*Math.cos(a)}));
}
function overlaps(a:ReturnType<typeof corners>,b:ReturnType<typeof corners>){
  for(const poly of [a,b])for(let i=0;i<4;i++){const p=poly[i],q=poly[(i+1)%4],axis={x:-(q.y-p.y),y:q.x-p.x};const pa=a.map(v=>v.x*axis.x+v.y*axis.y),pb=b.map(v=>v.x*axis.x+v.y*axis.y);if(Math.max(...pa)<=Math.min(...pb)+0.01||Math.max(...pb)<=Math.min(...pa)+0.01)return false;}return true;
}
export function layoutWarnings(p:ProjectData):string[]{
  const warnings:string[]=[];
  p.layoutObjects.forEach((o,i)=>{
    const c=corners(o);
    if(c.some(v=>v.x<0||v.y<0||v.x>p.facility.widthMm||v.y>p.facility.lengthMm)||o.zMm<0||o.zMm+o.heightMm>p.facility.heightMm)warnings.push(`${o.name}: poza granicą hali.`);
    p.obstacles.forEach(b=>{if(overlaps(c,corners(b)))warnings.push(`${o.name}: kolizja z ${b.name}.`);});
    p.layoutObjects.slice(i+1).forEach(b=>{if(overlaps(c,corners(b)))warnings.push(`${o.name}: kolizja z ${b.name}.`);});
  });return warnings;
}
