export interface TransportParameter {value:number; basis:'measured'|'assumed'; source:string}
/** Speed in mm/s, loading/unloading in seconds; zero handling is an explicit value. */
export interface TransportCalculation {speed:TransportParameter; loading:TransportParameter; unloading:TransportParameter}
export interface TransportBreakdown {loadingSeconds:number; travelSeconds:number; unloadingSeconds:number}
export interface DirectTransportTime {durationSeconds:number; basis:'measured'|'assumed'; source:string}
export interface ResolvedTransportTime extends DirectTransportTime {breakdown?:TransportBreakdown}
export interface TransportTimedRoute {distanceMm:number; transportTime?:DirectTransportTime; transportCalculation?:TransportCalculation}

function object(value:unknown,keys:readonly string[],label:string):Record<string,unknown>{
  if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).some(key=>!keys.includes(key)))throw new Error(`${label}: niepoprawne pola.`);
  return value as Record<string,unknown>;
}
function parameter(value:unknown,positive:boolean,label:string):TransportParameter{
  const p=object(value,['value','basis','source'],label);
  if(typeof p.value!=='number'||!Number.isFinite(p.value)||(positive?p.value<=0:p.value<0)||
    !['measured','assumed'].includes(p.basis as string)||typeof p.source!=='string'||!p.source.trim()){
    throw new Error(`${label}: wymagana ${positive?'dodatnia':'nieujemna'} liczba, pochodzenie i źródło.`);
  }
  return {value:p.value,basis:p.basis as TransportParameter['basis'],source:p.source};
}
export function validateTransportCalculation(value:unknown):TransportCalculation{
  const raw=object(value,['speed','loading','unloading'],'Wyliczenie transportu');
  return {speed:parameter(raw.speed,true,'Prędkość [mm/s]'),loading:parameter(raw.loading,false,'Załadunek [s]'),unloading:parameter(raw.unloading,false,'Rozładunek [s]')};
}
export function calculateTransportTime(distanceMm:number,calculation:TransportCalculation):ResolvedTransportTime{
  if(typeof distanceMm!=='number'||!Number.isFinite(distanceMm)||distanceMm<0)throw new Error('Wyliczenie transportu: niepoprawna długość [mm].');
  const checked=validateTransportCalculation(calculation);
  const breakdown={loadingSeconds:checked.loading.value,travelSeconds:distanceMm/checked.speed.value,unloadingSeconds:checked.unloading.value};
  const durationSeconds=breakdown.loadingSeconds+breakdown.travelSeconds+breakdown.unloadingSeconds;
  if(!Number.isFinite(durationSeconds)||durationSeconds<=0)throw new Error('Wyliczony czas transportu musi być dodatni i skończony.');
  // A calculated duration is an estimate even when all parameters were measured.
  return {durationSeconds,basis:'assumed',source:`Wyliczenie: prędkość — ${checked.speed.source}; załadunek — ${checked.loading.source}; rozładunek — ${checked.unloading.source}`,breakdown};
}
/** Validate the mutually exclusive stored modes; never persist a calculated duration cache. */
export function validateTransportTiming(value:Record<string,unknown>,distanceMm:number):Pick<TransportTimedRoute,'transportTime'|'transportCalculation'>{
  const hasTime=Object.prototype.hasOwnProperty.call(value,'transportTime'),hasCalculation=Object.prototype.hasOwnProperty.call(value,'transportCalculation');
  if(hasTime&&hasCalculation)throw new Error('Trasa wymaga jednego trybu czasu: wpisanego albo wyliczanego.');
  if(hasCalculation){const transportCalculation=validateTransportCalculation(value.transportCalculation);calculateTransportTime(distanceMm,transportCalculation);return {transportCalculation};}
  if(!hasTime)return {};
  const t=object(value.transportTime,['durationSeconds','basis','source'],'Czas transportu');
  if(typeof t.durationSeconds!=='number'||!Number.isFinite(t.durationSeconds)||t.durationSeconds<=0||
    !['measured','assumed'].includes(t.basis as string)||typeof t.source!=='string'||!t.source.trim())throw new Error('Czas transportu wymaga dodatniej liczby sekund, pochodzenia i źródła.');
  return {transportTime:{durationSeconds:t.durationSeconds,basis:t.basis as DirectTransportTime['basis'],source:t.source}};
}
export function resolveTransportTime(route:TransportTimedRoute):ResolvedTransportTime|undefined{
  const timing=validateTransportTiming(route as unknown as Record<string,unknown>,route.distanceMm);
  return timing.transportCalculation?calculateTransportTime(route.distanceMm,timing.transportCalculation):timing.transportTime;
}
