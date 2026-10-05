/** Explicit availability on the run timeline. Intervals are half-open [startSeconds, endSeconds). */
export interface CalendarWindow {startSeconds: number; endSeconds: number}
export interface DeclaredCalendarWindow extends CalendarWindow {basis: 'confirmed' | 'assumed'}
export interface ResourceCalendar {shifts: DeclaredCalendarWindow[]; breaks: DeclaredCalendarWindow[]}
export interface ResourceCalendarsV6 {
  workers: Record<string, ResourceCalendar>;
  stations: Record<string, ResourceCalendar>;
}

const record = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === 'object' && !Array.isArray(value);

function windows(value: unknown, label: string): DeclaredCalendarWindow[] {
  if (!Array.isArray(value) || value.length > 1000) throw new Error(`${label}: wymagana lista przedziałów (maks. 1000).`);
  let lastEnd = 0;
  return value.map((item, index) => {
    if (!record(item) || Object.keys(item).some(key => !['startSeconds', 'endSeconds', 'basis'].includes(key)) ||
        typeof item.startSeconds !== 'number' || !Number.isFinite(item.startSeconds) ||
        typeof item.endSeconds !== 'number' || !Number.isFinite(item.endSeconds) ||
        item.startSeconds < 0 || item.startSeconds < lastEnd || item.endSeconds <= item.startSeconds ||
        !['confirmed', 'assumed'].includes(item.basis as string)) {
      throw new Error(`${label}: przedziały muszą być dodatnie, uporządkowane, bez nakładania i z jawnym pochodzeniem (${index + 1}).`);
    }
    lastEnd = item.endSeconds;
    return {startSeconds: item.startSeconds, endSeconds: item.endSeconds,
      basis: item.basis as DeclaredCalendarWindow['basis']};
  });
}

function calendar(value: unknown, label: string): ResourceCalendar {
  if (!record(value) || Object.keys(value).some(key => !['shifts', 'breaks'].includes(key))) {
    throw new Error(`${label}: wymagane jawne zmiany i przerwy.`);
  }
  const shifts = windows(value.shifts, `${label} — zmiany`);
  const breaks = windows(value.breaks, `${label} — przerwy`);
  for (const pause of breaks) if (!shifts.some(shift =>
    shift.startSeconds <= pause.startSeconds && pause.endSeconds <= shift.endSeconds)) {
    throw new Error(`${label}: przerwa musi mieścić się w jednej jawnej zmianie.`);
  }
  return {shifts, breaks};
}

/** A partial draft is allowed, but every entered resource and interval must be valid. */
export function validateResourceCalendars(value: unknown, workerIds: ReadonlySet<string>,
  stationIds: ReadonlySet<string>): ResourceCalendarsV6 {
  if (!record(value) || Object.keys(value).some(key => !['workers', 'stations'].includes(key)) ||
      !record(value.workers) || !record(value.stations)) {
    throw new Error('Kalendarze wymagają jawnych map pracowników i stanowisk.');
  }
  const parseMap = (items: Record<string, unknown>, known: ReadonlySet<string>, label: string) => {
    if (Object.keys(items).length > 500) throw new Error(`${label}: za dużo zasobów.`);
    return Object.fromEntries(Object.entries(items).map(([id, item]) => {
      if (!known.has(id)) throw new Error(`${label}: nieznany zasób ${id}.`);
      return [id, calendar(item, `${label} ${id}`)];
    }));
  };
  return {workers: parseMap(value.workers, workerIds, 'Pracownik'),
    stations: parseMap(value.stations, stationIds, 'Stanowisko')};
}

/** Remove explicit breaks; no working time is invented outside shifts. */
export function availableWindows(value: ResourceCalendar): CalendarWindow[] {
  const result: CalendarWindow[] = [];
  let breakIndex = 0;
  for (const shift of value.shifts) {
    let cursor = shift.startSeconds;
    while (breakIndex < value.breaks.length && value.breaks[breakIndex].endSeconds <= shift.startSeconds) breakIndex++;
    let index = breakIndex;
    while (index < value.breaks.length && value.breaks[index].startSeconds < shift.endSeconds) {
      const pause = value.breaks[index];
      if (cursor < pause.startSeconds) result.push({startSeconds: cursor, endSeconds: pause.startSeconds});
      cursor = pause.endSeconds;
      index++;
    }
    if (cursor < shift.endSeconds) result.push({startSeconds: cursor, endSeconds: shift.endSeconds});
  }
  return result;
}

/** Intersection for a fixed worker team and a station; future scheduling consumes these windows. */
export function intersectWindows(left: readonly CalendarWindow[], right: readonly CalendarWindow[]): CalendarWindow[] {
  const result: CalendarWindow[] = [];
  let i = 0, j = 0;
  while (i < left.length && j < right.length) {
    const startSeconds = Math.max(left[i].startSeconds, right[j].startSeconds);
    const endSeconds = Math.min(left[i].endSeconds, right[j].endSeconds);
    if (startSeconds < endSeconds) result.push({startSeconds, endSeconds});
    if (left[i].endSeconds <= right[j].endSeconds) i++; else j++;
  }
  return result;
}

export function sharedAvailability(calendars: ResourceCalendarsV6, stationId: string,
  workerIds: readonly string[]): CalendarWindow[] {
  const station = calendars.stations[stationId];
  if (!station) throw new Error(`Stanowisko ${stationId}: brak jawnego kalendarza.`);
  let common = availableWindows(station);
  for (const workerId of workerIds) {
    const worker = calendars.workers[workerId];
    if (!worker) throw new Error(`Pracownik ${workerId}: brak jawnego kalendarza.`);
    common = intersectWindows(common, availableWindows(worker));
  }
  return common;
}
