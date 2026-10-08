import type {DomainProjectV6} from './domainProject';
import {validateStationRouting, type StationCopyRef, type DeclaredTransportRoute} from './stationRouting';
import {validateTransportTiming,resolveTransportTime,type TransportCalculation} from './transportTime';

interface PointBase {id:string; name:string; direction:'input'|'output'|'both'}
export type MaterialPoint = PointBase & ({kind:'station'; stationId:string; copy:number}|{kind:'external'});
interface RouteBase {id:string; fromPointId:string; toPointId:string}
export type MaterialRoute = RouteBase & (
  {kind:'station-route'; stationRouteId:string} |
  {kind:'declared'; distanceMm:number; basis:'confirmed'; source:string; transportTime?:DeclaredTransportRoute['transportTime']; transportCalculation?:TransportCalculation}
);
/** Definitions of material flow. External points do not become body locations or schedule events. */
export interface MaterialNetworkV6 {points:MaterialPoint[]; routes:MaterialRoute[]}
export type DistanceUnit = 'mm'|'m';
type RouteData = Pick<DeclaredTransportRoute,'distanceMm'|'basis'|'source'|'transportTime'>;

function object(value:unknown,keys:readonly string[],label:string):Record<string,unknown>{
  if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).some(key=>!keys.includes(key)))throw new Error(`${label}: niepoprawne pola.`);
  return value as Record<string,unknown>;
}
function list(value:unknown,label:string):unknown[]{
  if(!Array.isArray(value)||value.length>5000)throw new Error(`${label}: wymagana lista, maks. 5000 wpisów.`);
  return value;
}
function text(value:unknown,label:string):string{
  if(typeof value!=='string'||!value.trim())throw new Error(`${label}: wymagany tekst.`);
  return value;
}
function unique(value:unknown,seen:Set<string>,label:string):string{
  const id=text(value,label);if(seen.has(id))throw new Error(`${label}: powtórzone ID.`);seen.add(id);return id;
}
function distance(value:unknown):number{
  if(typeof value!=='number'||!Number.isFinite(value)||value<0)throw new Error('Długość trasy: wymagana nieujemna, skończona liczba.');
  return value;
}
export function distanceToMm(value:number,unit:DistanceUnit):number{
  if(unit!=='mm'&&unit!=='m')throw new Error('Nieznana jednostka długości.');
  return distance(distance(value)*(unit==='m'?1000:1));
}
export function distanceFromMm(value:number,unit:DistanceUnit):number{
  if(unit!=='mm'&&unit!=='m')throw new Error('Nieznana jednostka długości.');
  return distance(value)/(unit==='m'?1000:1);
}
const sameCopy=(a:StationCopyRef,b:StationCopyRef)=>a.stationId===b.stationId&&a.copy===b.copy;

/** Validate references against the complete proposed project, including station route edits/deletions. */
export function validateMaterialNetwork(project:DomainProjectV6,value:unknown):MaterialNetworkV6{
  const raw=object(value,['points','routes'],'Sieć materiałowa'),ids=new Set<string>();
  const stations=new Set(project.stations.map(station=>station.id));
  const points=list(raw.points,'Punkty materiałowe').map(value=>{
    const p=object(value,['id','name','direction','kind','stationId','copy'],'Punkt materiałowy');
    const id=unique(p.id,ids,'Punkt materiałowy'),name=text(p.name,'Nazwa punktu');
    if(!['input','output','both'].includes(p.direction as string))throw new Error('Punkt materiałowy: nieznany kierunek przepływu.');
    const direction=p.direction as MaterialPoint['direction'];
    if(p.kind==='external'){
      if('stationId' in p||'copy' in p)throw new Error('Punkt zewnętrzny nie może wskazywać kopii stanowiska.');
      return {id,name,direction,kind:'external' as const};
    }
    if(p.kind!=='station'||typeof p.stationId!=='string'||!stations.has(p.stationId))throw new Error('Punkt materiałowy: nieznane stanowisko lub rodzaj.');
    const copies=project.stationSettings[p.stationId]?.parallelStations;
    if(!Number.isSafeInteger(copies)||!copies||typeof p.copy!=='number'||!Number.isSafeInteger(p.copy)||p.copy<1||p.copy>copies)throw new Error('Punkt materiałowy: brak poprawnej jawnej kopii stanowiska.');
    return {id,name,direction,kind:'station' as const,stationId:p.stationId,copy:p.copy};
  });
  const byId=new Map(points.map(point=>[point.id,point]));
  const stationRoutes=new Map((project.stationRouting?validateStationRouting(project,project.stationRouting).routes:[]).map(route=>[route.id,route]));
  const routeIds=new Set<string>(),pairs=new Set<string>(),linked=new Set<string>();
  const routes=list(raw.routes,'Połączenia materiałowe').map(value=>{
    const r=object(value,['id','fromPointId','toPointId','kind','stationRouteId','distanceMm','basis','source','transportTime','transportCalculation'],'Połączenie materiałowe');
    const id=unique(r.id,routeIds,'Połączenie materiałowe'),fromPointId=text(r.fromPointId,'Początek'),toPointId=text(r.toPointId,'Koniec');
    const from=byId.get(fromPointId),to=byId.get(toPointId);
    if(!from||!to)throw new Error('Połączenie materiałowe: nieznany punkt.');
    if(fromPointId===toPointId||from.direction==='input'||to.direction==='output')throw new Error('Połączenie materiałowe: niezgodne kierunki lub ten sam punkt.');
    const pair=JSON.stringify([fromPointId,toPointId]);if(pairs.has(pair))throw new Error('Powtórzone skierowane połączenie materiałowe.');pairs.add(pair);
    if(r.kind==='station-route'){
      if(['distanceMm','basis','source','transportTime','transportCalculation'].some(key=>key in r))throw new Error('Połączenie stanowisk korzysta z danych istniejącej trasy, bez drugiej długości lub czasu.');
      const stationRouteId=text(r.stationRouteId,'Trasa stanowisk'),route=stationRoutes.get(stationRouteId);
      if(!route||from.kind!=='station'||to.kind!=='station'||!sameCopy(from,route.from)||!sameCopy(to,route.to))throw new Error('Połączenie materiałowe: niezgodne końce lub nieznana trasa stanowisk.');
      if(linked.has(stationRouteId))throw new Error('Trasa stanowisk ma już przypisane punkty materiałowe.');linked.add(stationRouteId);
      return {id,fromPointId,toPointId,kind:'station-route' as const,stationRouteId};
    }
    if(r.kind!=='declared'||'stationRouteId' in r)throw new Error('Połączenie materiałowe: nieznany rodzaj lub sprzeczna referencja trasy.');
    if(from.kind==='station'&&to.kind==='station')throw new Error('Połączenie między kopiami musi wskazywać istniejącą trasę stanowisk.');
    const distanceMm=distance(r.distanceMm);
    if(r.basis!=='confirmed')throw new Error('Trasa materiałowa wymaga potwierdzenia długości.');
    const source=text(r.source,'Źródło długości');
    const timing=validateTransportTiming(r,distanceMm);
    return {id,fromPointId,toPointId,kind:'declared' as const,distanceMm,basis:'confirmed' as const,source,...timing};
  });
  return {points,routes};
}

/** Read through the reference so editing a station route never leaves a second stale value. */
export function materialRouteData(project:DomainProjectV6,routeId:string):RouteData{
  const network=validateMaterialNetwork(project,project.materialNetwork),route=network.routes.find(route=>route.id===routeId);
  if(!route)throw new Error('Nieznane połączenie materiałowe.');
  const data=route.kind==='declared'?route:project.stationRouting!.routes.find(item=>item.id===route.stationRouteId)!;
  const transportTime=resolveTransportTime(data);
  return {distanceMm:data.distanceMm,basis:data.basis,source:data.source,...(transportTime?{transportTime}:{})};
}
