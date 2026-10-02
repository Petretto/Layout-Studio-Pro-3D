import React from 'react';
import { TimeUnit } from '../../core/models/types';
import { fromSeconds, toSeconds, formatTimeValue, formatTimeWithUnit, TIME_UNITS } from '../../core/time';
export { formatTimeValue, formatTimeWithUnit, fromSeconds, toSeconds, TIME_UNITS };

export function NumberField({label,value,onChange,min=0,max,step='any'}:{label:string;value:number;onChange:(v:number)=>void;min?:number;max?:number;step?:string}){return <label className="field">{label}<input type="number" required min={min} max={max} step={step} value={Number.isFinite(value)?value:''} onChange={e=>onChange(e.target.value===''?NaN:Number(e.target.value))}/></label>;}

export function TimeField({label,seconds,unit='s',onChange,min=0,max}:{label:string;seconds:number;unit?:TimeUnit;onChange:(seconds:number)=>void;min?:number;max?:number}){
  const displayVal = Number(fromSeconds(seconds, unit).toFixed(6));
  const minVal = min ? Number(fromSeconds(min, unit).toFixed(6)) : 0;
  const maxVal = max !== undefined ? Number(fromSeconds(max, unit).toFixed(6)) : undefined;
  return <label className="field">{label} [{unit}]<input type="number" required min={minVal} max={maxVal} step="any" value={Number.isFinite(displayVal)?displayVal:''} onChange={e=>{
    const v=e.target.value===''?NaN:Number(e.target.value);
    onChange(toSeconds(v,unit));
  }}/></label>;
}

export function TextField({label,value,onChange}:{label:string;value:string;onChange:(v:string)=>void}){return <label className="field">{label}<input required value={value} onChange={e=>onChange(e.target.value)}/></label>;}
export function Metric({label,value,hint}:{label:string;value:string;hint?:string}){return <div className="metric"><span>{label}</span><strong>{value}</strong>{hint&&<small>{hint}</small>}</div>;}
export const fmt=(n:number|undefined,d=2)=>Number.isFinite(n)?n!.toLocaleString('pl-PL',{maximumFractionDigits:d}):'—';
export function Alert({children}:{children:React.ReactNode}){return <div className="notice" role="status">{children}</div>;}
