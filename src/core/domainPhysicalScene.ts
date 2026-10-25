import type {DomainProjectV6} from './domainProject';
import {domainModelSignature} from './domainPlayback';
import type {DomainPhysicalPlayback,domainPhysicalPlaybackFrame} from './domainPhysicalPlayback';
import type {StationCopyRef} from './stationRouting';
type Anchor={objectId:string;xMm:number;yMm:number;zMm:number};
const key=(ref:StationCopyRef)=>JSON.stringify([ref.stationId,ref.copy]);
/** Symbolic station reference points, never product dimensions or geometric travel paths. */
export function prepareDomainPhysicalScene(project:DomainProjectV6,history:DomainPhysicalPlayback){
  if(history.modelSignature!==domainModelSignature(project))throw new Error('Geometria nie odpowiada historii fizycznej.');
  const anchors=new Map<string,Anchor>();
  for(const station of project.stations){
    const count=project.stationSettings[station.id]?.parallelStations??0;
    for(let copy=1;copy<=count;copy++){
      const explicit=new Set((project.stationRouting?.equipmentPlacements??[]).filter(p=>p.stationId===station.id&&p.copy===copy)
        .flatMap(p=>{const id=project.equipment.find(e=>e.id===p.equipmentId)?.layoutObjectId;return id?[id]:[];}));
      const objects=explicit.size?project.layoutObjects.filter(o=>explicit.has(o.id)):
        count===1?project.layoutObjects.filter(o=>o.workstationId===station.id&&o.type.startsWith('Table')):[];
      if(explicit.size>1||objects.length!==1)continue;
      const o=objects[0];anchors.set(key({stationId:station.id,copy}),{objectId:o.id,xMm:o.xMm+o.widthMm/2,yMm:o.yMm+o.lengthMm/2,zMm:o.zMm+o.heightMm+400});
    }
  }
  // Do not leave the cart at its editor position while the ledger says it has left.
  const hiddenObjectIds=[...new Set(history.carts.flatMap(c=>{
    const id=project.equipment.find(e=>e.id===c.id)?.layoutObjectId;return id?[id]:[];
  }))];
  return {anchors,hiddenObjectIds};
}
export type DomainPhysicalScene=ReturnType<typeof prepareDomainPhysicalScene>;
export function domainPhysicalSceneFrame(scene:DomainPhysicalScene,frame:ReturnType<typeof domainPhysicalPlaybackFrame>){
  const point=(location:StationCopyRef|null)=>location?scene.anchors.get(key(location))??null:null;
  const bodies=frame.bodies.map(body=>({kind:'body' as const,id:body.id,state:body.status,
    location:body.location.kind==='station'?{stationId:body.location.stationId,copy:body.location.copy}:null,
    movement:body.status==='moving'?{...body.transfer,kind:'loaded' as const}:null}));
  const carts=frame.carts.map(cart=>({kind:'cart' as const,id:cart.equipmentId,state:cart.movement?'moving':'available',location:cart.location,movement:cart.movement}));
  return [...bodies,...carts].map(item=>({...item,anchor:item.movement||!point(item.location)?null:{...point(item.location)!},
    reason:item.movement?'Brak geometrycznego przebiegu trasy — pozycja w przejeździe nieznana.':!item.location?'Lokalizacja nieznana.':!point(item.location)?'Brak jednoznacznej geometrii kopii stanowiska.':'Symboliczny punkt odniesienia stanowiska; nie gabaryt wyrobu ani pozycja dokowania wózka.',
    progress:item.movement?Math.max(0,Math.min(1,(frame.timeSeconds-item.movement.startSeconds)/(item.movement.endSeconds-item.movement.startSeconds))):null}));
}
