import { TimeUnit } from './models/types';

export const TIME_UNITS: { unit: TimeUnit; value: TimeUnit; label: string; full: string; factor: number }[] = [
  { unit: 's', value: 's', label: 's', full: 'sekundy (s)', factor: 1 },
  { unit: 'min', value: 'min', label: 'min', full: 'minuty (min)', factor: 60 },
  { unit: 'h', value: 'h', label: 'h', full: 'godziny (h)', factor: 3600 }
];

export function toSeconds(value: number, unit: TimeUnit = 's'): number {
  if (!Number.isFinite(value)) return 0;
  if (unit === 'min') return Number((value * 60).toFixed(6));
  if (unit === 'h') return Number((value * 3600).toFixed(6));
  return value;
}

export function fromSeconds(seconds: number, unit: TimeUnit = 's'): number {
  if (!Number.isFinite(seconds)) return 0;
  if (unit === 'min') return Number((seconds / 60).toFixed(6));
  if (unit === 'h') return Number((seconds / 3600).toFixed(6));
  return seconds;
}

export function convertTime(value: number, fromUnit: TimeUnit, toUnit: TimeUnit): number {
  if (fromUnit === toUnit) return value;
  const sec = toSeconds(value, fromUnit);
  return fromSeconds(sec, toUnit);
}

export function defaultDecimals(unit: TimeUnit = 's'): number {
  if (unit === 'h') return 4;
  if (unit === 'min') return 3;
  return 2;
}

export function formatTimeValue(seconds: number | undefined, unit: TimeUnit = 's', maxDecimals?: number): string {
  if (seconds === undefined || !Number.isFinite(seconds)) return '—';
  const val = fromSeconds(seconds, unit);
  const decimals = maxDecimals !== undefined ? maxDecimals : defaultDecimals(unit);
  return val.toLocaleString('pl-PL', { maximumFractionDigits: decimals });
}

export function formatTimeWithUnit(seconds: number | undefined, unit: TimeUnit = 's', maxDecimals?: number): string {
  if (seconds === undefined || !Number.isFinite(seconds)) return '—';
  return `${formatTimeValue(seconds, unit, maxDecimals)} ${unit}`;
}
