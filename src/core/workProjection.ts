import type {CalendarWindow} from './resourceCalendar';

const EPSILON = 1e-9;

export function projectWork(windows: readonly CalendarWindow[], now: number, duration: number) {
  const workWindows: CalendarWindow[] = [];
  let remaining = duration;
  for (const window of windows) {
    if (window.endSeconds <= now) continue;
    const startSeconds = workWindows.length ? window.startSeconds : Math.max(now, window.startSeconds);
    if (startSeconds >= window.endSeconds) continue;
    const endSeconds = Math.min(window.endSeconds, startSeconds + remaining);
    workWindows.push({startSeconds, endSeconds});
    remaining -= endSeconds - startSeconds;
    if (remaining <= EPSILON) break;
  }
  if (remaining > EPSILON) return null;
  const pauses = workWindows.slice(1).map((window, i) => ({
    startSeconds: workWindows[i].endSeconds, endSeconds: window.startSeconds,
  })).filter(window => window.startSeconds < window.endSeconds);
  const atOffset = (offset: number, endBoundary: boolean) => {
    let progress = 0;
    for (const window of workWindows) {
      const next = progress + window.endSeconds - window.startSeconds;
      if (offset < next || (endBoundary && offset === next)) return window.startSeconds + offset - progress;
      progress = next;
    }
    return workWindows[workWindows.length - 1].endSeconds;
  };
  return {workWindows, pauses, end: workWindows[workWindows.length - 1].endSeconds, atOffset};
}

