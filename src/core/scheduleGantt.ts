import type {DomainProjectV6} from './domainProject';
import type {WorkerScheduleResult, WorkerScheduleRun, AssemblyTransportMovement} from './workerSchedule';

export type GanttViewMode = 'operations' | 'stations' | 'workers';

export type GanttBarKind =
  | 'work'               // Praca netto / okno wykonania operacji
  | 'pause'              // Pauza kalendarzowa w trakcie trwania operacji
  | 'wait'               // Oczekiwanie na zasoby przed startem operacji
  | 'blocked'            // Blokada wyjścia po zakończeniu obróbki (bbas)
  | 'local-wait'         // Oczekiwanie na kontynuację na tej samej kopii
  | 'transport-transfer' // Przewóz korpusu lub partii podzespołów
  | 'transport-empty'    // Dojazd lub powrót wózka/osoby bez ładunku
  | 'reserve'           // Wyprzedzająca rezerwacja celu transportu
  | 'changeover';        // Przezbrojenie stanowiska między wariantami

export interface GanttBar {
  id: string;
  startSeconds: number;
  endSeconds: number;
  durationSeconds: number;
  kind: GanttBarKind;
  label: string;
  tooltip: string;
  job?: number;
  operationId?: string;
  stationId?: string;
  copy?: number;
  workerIds?: readonly string[];
  equipmentIds?: readonly string[];
  routeId?: string;
}

export interface GanttRow {
  id: string;
  label: string;
  sublabel?: string;
  category: 'operation' | 'station' | 'worker';
  targetObjectId: string;
  targetCopy?: number;
  targetJob?: number;
  bars: GanttBar[];
  totalActiveSeconds: number;
}

export interface GanttTimeGrid {
  majorStep: number;
  minorStep: number;
  majorTicks: number[];
  minorTicks: number[];
}

export interface GanttChartModel {
  viewMode: GanttViewMode;
  totalDurationSeconds: number;
  rows: GanttRow[];
  timeGrid: GanttTimeGrid;
}

export interface GanttSelectionTarget {
  category: 'operation' | 'station' | 'worker';
  id: string;
  job?: number;
  copy?: number;
}

/** Round float to 3 decimal places for seconds stability */
function r3(v: number): number {
  return Math.round(v * 1000) / 1000;
}

/** Calculates human-friendly time grid intervals based on total schedule makespan */
export function calculateGanttTimeGrid(totalSeconds: number): GanttTimeGrid {
  if (totalSeconds <= 0) {
    return {majorStep: 10, minorStep: 2, majorTicks: [0], minorTicks: [0]};
  }
  const roughMajor = totalSeconds / 8;
  const magnitude = Math.pow(10, Math.floor(Math.log10(roughMajor)));
  const normalized = roughMajor / magnitude;
  let majorStep = magnitude;
  if (normalized >= 5) majorStep = 5 * magnitude;
  else if (normalized >= 2) majorStep = 2 * magnitude;
  else majorStep = magnitude;

  if (majorStep < 1) majorStep = 1;
  const minorStep = Math.max(1, majorStep / 5);

  const majorTicks: number[] = [];
  for (let t = 0; t <= totalSeconds + majorStep * 0.01; t += majorStep) {
    majorTicks.push(r3(t));
  }
  const minorTicks: number[] = [];
  for (let t = 0; t <= totalSeconds + minorStep * 0.01; t += minorStep) {
    minorTicks.push(r3(t));
  }
  return {majorStep, minorStep, majorTicks, minorTicks};
}

/**
 * Builds Gantt rows for the Operations view (grouped by job and operation).
 */
export function buildOperationsGantt(project: DomainProjectV6, result: WorkerScheduleResult): GanttRow[] {
  const rows: GanttRow[] = [];
  const runs = result.runs;
  const opMap = new Map(project.operations.map(op => [op.id, op.name || op.id]));

  // Sort runs deterministically: job ascending, startSeconds ascending
  const sortedRuns = [...runs].sort((a, b) => a.job !== b.job ? a.job - b.job : a.startSeconds - b.startSeconds);

  for (const run of sortedRuns) {
    const opName = opMap.get(run.operationId) ?? run.operationId;
    const rowId = `op-${run.job}-${run.operationId}`;
    const bars: GanttBar[] = [];

    // 1. Wait bar before start (if readySeconds < startSeconds)
    if (run.readySeconds < run.startSeconds) {
      const waitDur = r3(run.startSeconds - run.readySeconds);
      if (waitDur > 0) {
        bars.push({
          id: `${rowId}-wait`,
          startSeconds: run.readySeconds,
          endSeconds: run.startSeconds,
          durationSeconds: waitDur,
          kind: 'wait',
          label: `Oczekiwanie ${waitDur} s`,
          tooltip: `Sztuka ${run.job} · ${opName} (${run.operationId}): oczekiwanie ${waitDur} s (${run.waitCauses.length ? run.waitCauses.join(', ') : 'brak zadeklarowanych przyczyn'})`,
          job: run.job,
          operationId: run.operationId,
          stationId: run.stationId,
          copy: run.copy,
          workerIds: run.workerIds,
        });
      }
    }

    // 2. Work windows
    if (run.workWindows && run.workWindows.length > 0) {
      run.workWindows.forEach((win, idx) => {
        const dur = r3(win.endSeconds - win.startSeconds);
        if (dur > 0) {
          bars.push({
            id: `${rowId}-work-${idx}`,
            startSeconds: win.startSeconds,
            endSeconds: win.endSeconds,
            durationSeconds: dur,
            kind: 'work',
            label: run.workWindows.length > 1 ? `Praca (${idx + 1})` : 'Praca',
            tooltip: `Sztuka ${run.job} · ${opName} (${run.operationId}): praca ${win.startSeconds}–${win.endSeconds} s (${dur} s) na stacji ${run.stationId} / kopia ${run.copy}, pracownicy: ${run.workerIds.join(', ')}`,
            job: run.job,
            operationId: run.operationId,
            stationId: run.stationId,
            copy: run.copy,
            workerIds: run.workerIds,
          });
        }
      });
    } else {
      const dur = r3(run.endSeconds - run.startSeconds);
      if (dur > 0) {
        bars.push({
          id: `${rowId}-work`,
          startSeconds: run.startSeconds,
          endSeconds: run.endSeconds,
          durationSeconds: dur,
          kind: 'work',
          label: 'Praca',
          tooltip: `Sztuka ${run.job} · ${opName} (${run.operationId}): praca ${run.startSeconds}–${run.endSeconds} s (${dur} s) na stacji ${run.stationId} / kopia ${run.copy}, pracownicy: ${run.workerIds.join(', ')}`,
          job: run.job,
          operationId: run.operationId,
          stationId: run.stationId,
          copy: run.copy,
          workerIds: run.workerIds,
        });
      }
    }

    // 3. Pauses (calendar gaps during work)
    if (run.pauses && run.pauses.length > 0) {
      run.pauses.forEach((pause, idx) => {
        const dur = r3(pause.endSeconds - pause.startSeconds);
        if (dur > 0) {
          bars.push({
            id: `${rowId}-pause-${idx}`,
            startSeconds: pause.startSeconds,
            endSeconds: pause.endSeconds,
            durationSeconds: dur,
            kind: 'pause',
            label: 'Pauza',
            tooltip: `Sztuka ${run.job} · ${opName} (${run.operationId}): pauza kalendarzowa ${pause.startSeconds}–${pause.endSeconds} s (${dur} s)`,
            job: run.job,
            operationId: run.operationId,
            stationId: run.stationId,
            copy: run.copy,
          });
        }
      });
    }

    // 4. Output buffer blockage (blockedSeconds > 0)
    if (run.blockedSeconds && run.blockedSeconds > 0) {
      const blockEnd = run.stationReleaseSeconds !== undefined && run.stationReleaseSeconds > run.endSeconds
        ? run.stationReleaseSeconds
        : r3(run.endSeconds + run.blockedSeconds);
      bars.push({
        id: `${rowId}-blocked`,
        startSeconds: run.endSeconds,
        endSeconds: blockEnd,
        durationSeconds: run.blockedSeconds,
        kind: 'blocked',
        label: `Blokada ${run.blockedSeconds} s`,
        tooltip: `Sztuka ${run.job} · ${opName} (${run.operationId}): blokada wyjścia stacji ${run.stationId} przez ${run.blockedSeconds} s (zwolnienie: ${blockEnd} s)`,
        job: run.job,
        operationId: run.operationId,
        stationId: run.stationId,
        copy: run.copy,
      });
    }

    // 5. Continuation wait on same station copy
    if (run.continuationWaitSeconds && run.continuationWaitSeconds > 0) {
      const waitEnd = run.stationReleaseSeconds !== undefined && run.stationReleaseSeconds > run.endSeconds
        ? run.stationReleaseSeconds
        : r3(run.endSeconds + run.continuationWaitSeconds);
      bars.push({
        id: `${rowId}-localwait`,
        startSeconds: run.endSeconds,
        endSeconds: waitEnd,
        durationSeconds: run.continuationWaitSeconds,
        kind: 'local-wait',
        label: `Oczekiwanie lokalne ${run.continuationWaitSeconds} s`,
        tooltip: `Sztuka ${run.job} · ${opName} (${run.operationId}): oczekiwanie korpusu na kontynuację na stacji ${run.stationId} / kopia ${run.copy} (${run.continuationWaitSeconds} s)`,
        job: run.job,
        operationId: run.operationId,
        stationId: run.stationId,
        copy: run.copy,
      });
    }

    const totalActive = r3(bars.reduce((sum, b) => b.kind === 'work' ? sum + b.durationSeconds : sum, 0));

    rows.push({
      id: rowId,
      label: `Sztuka ${run.job} — ${opName}`,
      sublabel: `${run.operationId} na ${run.stationId} / k.${run.copy}`,
      category: 'operation',
      targetObjectId: run.operationId,
      targetJob: run.job,
      targetCopy: run.copy,
      bars,
      totalActiveSeconds: totalActive,
    });
  }

  return rows;
}

/**
 * Builds Gantt rows for the Stations view (per station copy).
 */
export function buildStationsGantt(project: DomainProjectV6, result: WorkerScheduleResult): GanttRow[] {
  const rows: GanttRow[] = [];
  const runs = result.runs;
  const opMap = new Map(project.operations.map(op => [op.id, op.name || op.id]));

  // Collect all station copies from project and runs
  interface StationKey {
    stationId: string;
    stationName: string;
    copy: number;
  }
  const stationKeysMap = new Map<string, StationKey>();

  // Add all project stations
  for (const st of project.stations) {
    const setting = project.stationSettings ? project.stationSettings[st.id] : undefined;
    const copies = setting?.parallelStations ?? 1;
    for (let c = 1; c <= copies; c++) {
      const key = `${st.id}:${c}`;
      stationKeysMap.set(key, {stationId: st.id, stationName: st.name || st.id, copy: c});
    }
  }

  // Also ensure any station copies in runs are present
  for (const r of runs) {
    const key = `${r.stationId}:${r.copy}`;
    if (!stationKeysMap.has(key)) {
      const st = project.stations.find(s => s.id === r.stationId);
      stationKeysMap.set(key, {stationId: r.stationId, stationName: st?.name || r.stationId, copy: r.copy});
    }
  }

  // Deterministic order: stationId ascending, copy ascending
  const sortedKeys = Array.from(stationKeysMap.values()).sort((a, b) =>
    a.stationId !== b.stationId ? a.stationId.localeCompare(b.stationId) : a.copy - b.copy
  );

  for (const item of sortedKeys) {
    const rowId = `station-${item.stationId}-${item.copy}`;
    const stationRuns = runs.filter(r => r.stationId === item.stationId && r.copy === item.copy);
    const bars: GanttBar[] = [];

    for (const run of stationRuns) {
      const opName = opMap.get(run.operationId) ?? run.operationId;
      const baseBarId = `${rowId}-run-${run.job}-${run.operationId}`;

      // Advance reservation before arrival (if stationReserveStartSeconds < startSeconds)
      if (run.stationReserveStartSeconds !== undefined && run.stationReserveStartSeconds < run.startSeconds) {
        const resDur = r3(run.startSeconds - run.stationReserveStartSeconds);
        if (resDur > 0) {
          bars.push({
            id: `${baseBarId}-reserve`,
            startSeconds: run.stationReserveStartSeconds,
            endSeconds: run.startSeconds,
            durationSeconds: resDur,
            kind: 'reserve',
            label: `Rezerwacja celu (szt. ${run.job})`,
            tooltip: `${item.stationName} / kopia ${item.copy}: cel zarezerwowany dla sztuki ${run.job} (${resDur} s przed startem)`,
            job: run.job,
            operationId: run.operationId,
            stationId: item.stationId,
            copy: item.copy,
          });
        }
      }

      // Work windows
      if (run.workWindows && run.workWindows.length > 0) {
        run.workWindows.forEach((win, idx) => {
          const dur = r3(win.endSeconds - win.startSeconds);
          if (dur > 0) {
            bars.push({
              id: `${baseBarId}-work-${idx}`,
              startSeconds: win.startSeconds,
              endSeconds: win.endSeconds,
              durationSeconds: dur,
              kind: 'work',
              label: `Szt. ${run.job}: ${opName}`,
              tooltip: `${item.stationName} / kopia ${item.copy}: sztuka ${run.job} · ${opName} (${run.operationId}) praca ${win.startSeconds}–${win.endSeconds} s (${dur} s), obsada: ${run.workerIds.join(', ')}`,
              job: run.job,
              operationId: run.operationId,
              stationId: item.stationId,
              copy: item.copy,
              workerIds: run.workerIds,
            });
          }
        });
      } else {
        const dur = r3(run.endSeconds - run.startSeconds);
        if (dur > 0) {
          bars.push({
            id: `${baseBarId}-work`,
            startSeconds: run.startSeconds,
            endSeconds: run.endSeconds,
            durationSeconds: dur,
            kind: 'work',
            label: `Szt. ${run.job}: ${opName}`,
            tooltip: `${item.stationName} / kopia ${item.copy}: sztuka ${run.job} · ${opName} (${run.operationId}) praca ${run.startSeconds}–${run.endSeconds} s (${dur} s), obsada: ${run.workerIds.join(', ')}`,
            job: run.job,
            operationId: run.operationId,
            stationId: item.stationId,
            copy: item.copy,
            workerIds: run.workerIds,
          });
        }
      }

      // Pauses
      if (run.pauses && run.pauses.length > 0) {
        run.pauses.forEach((pause, idx) => {
          const dur = r3(pause.endSeconds - pause.startSeconds);
          if (dur > 0) {
            bars.push({
              id: `${baseBarId}-pause-${idx}`,
              startSeconds: pause.startSeconds,
              endSeconds: pause.endSeconds,
              durationSeconds: dur,
              kind: 'pause',
              label: `Pauza (szt. ${run.job})`,
              tooltip: `${item.stationName} / kopia ${item.copy}: pauza kalendarzowa przy operacji ${run.operationId} (szt. ${run.job}) ${pause.startSeconds}–${pause.endSeconds} s (${dur} s)`,
              job: run.job,
              operationId: run.operationId,
              stationId: item.stationId,
              copy: item.copy,
            });
          }
        });
      }

      // Blocked exit
      if (run.blockedSeconds && run.blockedSeconds > 0) {
        const blockEnd = run.stationReleaseSeconds !== undefined && run.stationReleaseSeconds > run.endSeconds
          ? run.stationReleaseSeconds
          : r3(run.endSeconds + run.blockedSeconds);
        bars.push({
          id: `${baseBarId}-blocked`,
          startSeconds: run.endSeconds,
          endSeconds: blockEnd,
          durationSeconds: run.blockedSeconds,
          kind: 'blocked',
          label: `Blokada wyjścia (szt. ${run.job})`,
          tooltip: `${item.stationName} / kopia ${item.copy}: stacja zablokowana przez korpus sztuki ${run.job} po zakończeniu ${run.operationId} (${run.blockedSeconds} s)`,
          job: run.job,
          operationId: run.operationId,
          stationId: item.stationId,
          copy: item.copy,
        });
      }

      // Local continuation wait
      if (run.continuationWaitSeconds && run.continuationWaitSeconds > 0) {
        const waitEnd = run.stationReleaseSeconds !== undefined && run.stationReleaseSeconds > run.endSeconds
          ? run.stationReleaseSeconds
          : r3(run.endSeconds + run.continuationWaitSeconds);
        bars.push({
          id: `${baseBarId}-localwait`,
          startSeconds: run.endSeconds,
          endSeconds: waitEnd,
          durationSeconds: run.continuationWaitSeconds,
          kind: 'local-wait',
          label: `Oczekiwanie lokalne (szt. ${run.job})`,
          tooltip: `${item.stationName} / kopia ${item.copy}: korpus sztuki ${run.job} oczekuje na kolejną operację na tym samym stanowisku (${run.continuationWaitSeconds} s)`,
          job: run.job,
          operationId: run.operationId,
          stationId: item.stationId,
          copy: item.copy,
        });
      }
    }

    // Changeover bars on station copy
    if (result.changeovers && result.changeovers.length > 0) {
      const stationChangeovers = result.changeovers.filter(c => c.stationId === item.stationId && c.copy === item.copy);
      for (const co of stationChangeovers) {
        bars.push({
          id: `${rowId}-changeover-${co.afterJob}-${co.beforeJob}-${co.startSeconds}`,
          startSeconds: co.startSeconds,
          endSeconds: co.endSeconds,
          durationSeconds: r3(co.endSeconds - co.startSeconds),
          kind: 'changeover',
          label: `Przezbrojenie: ${co.fromVariantId} → ${co.toVariantId}`,
          tooltip: `${item.stationName} / kopia ${item.copy}: przezbrojenie ${co.fromVariantId} → ${co.toVariantId} (${co.durationSeconds} s, ${co.durationBasis === 'measured' ? 'pomiar' : 'założenie'}) po szt. ${co.afterJob} przed szt. ${co.beforeJob}`,
          stationId: item.stationId,
          copy: item.copy,
          workerIds: co.workerIds,
        });
      }
    }

    // Sort bars by startSeconds
    bars.sort((a, b) => a.startSeconds !== b.startSeconds ? a.startSeconds - b.startSeconds : a.endSeconds - b.endSeconds);
    const totalActive = r3(bars.reduce((sum, b) => b.kind === 'work' || b.kind === 'changeover' ? sum + b.durationSeconds : sum, 0));

    rows.push({
      id: rowId,
      label: `${item.stationName} / k.${item.copy}`,
      sublabel: item.stationId,
      category: 'station',
      targetObjectId: item.stationId,
      targetCopy: item.copy,
      bars,
      totalActiveSeconds: totalActive,
    });
  }

  return rows;
}

/**
 * Builds Gantt rows for the Workers view (per worker).
 */
export function buildWorkersGantt(project: DomainProjectV6, result: WorkerScheduleResult): GanttRow[] {
  const rows: GanttRow[] = [];
  const runs = result.runs;
  const opMap = new Map(project.operations.map(op => [op.id, op.name || op.id]));
  const transportMovements = result.transportMovements ?? [];

  // Collect all workers from project and runs
  interface WorkerKey {
    workerId: string;
    workerName: string;
  }
  const workerKeysMap = new Map<string, WorkerKey>();

  if (project.workers) {
    for (const w of project.workers) {
      workerKeysMap.set(w.id, {workerId: w.id, workerName: w.name || w.id});
    }
  }

  for (const r of runs) {
    for (const wid of r.workerIds) {
      if (!workerKeysMap.has(wid)) {
        workerKeysMap.set(wid, {workerId: wid, workerName: wid});
      }
    }
    if (r.transport?.workerIds) {
      for (const wid of r.transport.workerIds) {
        if (!workerKeysMap.has(wid)) {
          workerKeysMap.set(wid, {workerId: wid, workerName: wid});
        }
      }
    }
  }

  for (const mov of transportMovements) {
    for (const wid of mov.workerIds) {
      if (!workerKeysMap.has(wid)) {
        workerKeysMap.set(wid, {workerId: wid, workerName: wid});
      }
    }
  }

  const sortedWorkers = Array.from(workerKeysMap.values()).sort((a, b) => a.workerId.localeCompare(b.workerId));

  for (const worker of sortedWorkers) {
    const rowId = `worker-${worker.workerId}`;
    const bars: GanttBar[] = [];

    // 1. Operation work windows
    for (const run of runs) {
      if (!run.workerIds.includes(worker.workerId)) continue;
      const opName = opMap.get(run.operationId) ?? run.operationId;
      const baseBarId = `${rowId}-run-${run.job}-${run.operationId}`;

      if (run.workWindows && run.workWindows.length > 0) {
        run.workWindows.forEach((win, idx) => {
          const dur = r3(win.endSeconds - win.startSeconds);
          if (dur > 0) {
            bars.push({
              id: `${baseBarId}-work-${idx}`,
              startSeconds: win.startSeconds,
              endSeconds: win.endSeconds,
              durationSeconds: dur,
              kind: 'work',
              label: `Szt. ${run.job}: ${opName}`,
              tooltip: `${worker.workerName} (${worker.workerId}): montaż sztuki ${run.job} · ${opName} (${run.operationId}) na stacji ${run.stationId} / kopia ${run.copy} (${dur} s)`,
              job: run.job,
              operationId: run.operationId,
              stationId: run.stationId,
              copy: run.copy,
              workerIds: run.workerIds,
            });
          }
        });
      } else {
        const dur = r3(run.endSeconds - run.startSeconds);
        if (dur > 0) {
          bars.push({
            id: `${baseBarId}-work`,
            startSeconds: run.startSeconds,
            endSeconds: run.endSeconds,
            durationSeconds: dur,
            kind: 'work',
            label: `Szt. ${run.job}: ${opName}`,
            tooltip: `${worker.workerName} (${worker.workerId}): montaż sztuki ${run.job} · ${opName} (${run.operationId}) na stacji ${run.stationId} / kopia ${run.copy} (${dur} s)`,
            job: run.job,
            operationId: run.operationId,
            stationId: run.stationId,
            copy: run.copy,
            workerIds: run.workerIds,
          });
        }
      }

      // Worker held in blockage (under bbas policy without worker release)
      if (run.blockedSeconds && run.blockedSeconds > 0 && run.stationReleaseSeconds !== undefined) {
        const bufConfig = project.stationBuffers?.buffers?.find(b => b.stationId === run.stationId && (b.copy === null || b.copy === run.copy));
        const policy = bufConfig?.blockingPolicy ?? 'bbas';
        if (policy === 'bbas') {
          bars.push({
            id: `${baseBarId}-held`,
            startSeconds: run.endSeconds,
            endSeconds: run.stationReleaseSeconds,
            durationSeconds: run.blockedSeconds,
            kind: 'blocked',
            label: `Zatrzymanie (szt. ${run.job})`,
            tooltip: `${worker.workerName} (${worker.workerId}): zatrzymany przy zablokowanym stanowisku ${run.stationId} (polityka bbas, ${run.blockedSeconds} s)`,
            job: run.job,
            operationId: run.operationId,
            stationId: run.stationId,
            copy: run.copy,
            workerIds: [worker.workerId],
          });
        }
      }

      // Pauses
      if (run.pauses && run.pauses.length > 0) {
        run.pauses.forEach((pause, idx) => {
          const dur = r3(pause.endSeconds - pause.startSeconds);
          if (dur > 0) {
            bars.push({
              id: `${baseBarId}-pause-${idx}`,
              startSeconds: pause.startSeconds,
              endSeconds: pause.endSeconds,
              durationSeconds: dur,
              kind: 'pause',
              label: 'Przerwa',
              tooltip: `${worker.workerName} (${worker.workerId}): przerwa w pracy przy operacji ${run.operationId} (szt. ${run.job}) ${pause.startSeconds}–${pause.endSeconds} s (${dur} s)`,
              job: run.job,
              operationId: run.operationId,
              stationId: run.stationId,
              copy: run.copy,
            });
          }
        });
      }
    }

    // 2. Transport movements assigned to this worker
    transportMovements.forEach((mov, idx) => {
      if (!mov.workerIds.includes(worker.workerId)) return;
      const dur = r3(mov.endSeconds - mov.startSeconds);
      if (dur <= 0) return;
      const isTransfer = mov.purpose === 'transfer';
      const kind: GanttBarKind = isTransfer ? 'transport-transfer' : 'transport-empty';
      const purposeLabel = mov.purpose === 'approach' ? 'Dojazd' : mov.purpose === 'return' ? 'Powrót' : 'Przewóz';
      bars.push({
        id: `${rowId}-mov-${idx}`,
        startSeconds: mov.startSeconds,
        endSeconds: mov.endSeconds,
        durationSeconds: dur,
        kind,
        label: `${purposeLabel}: ${mov.routeId}`,
        tooltip: `${worker.workerName} (${worker.workerId}): ${purposeLabel} trasą ${mov.routeId} (${dur} s)${mov.lotId ? `, partia: ${mov.lotId}` : ''}`,
        routeId: mov.routeId,
        workerIds: mov.workerIds,
        equipmentIds: mov.equipmentIds,
      });
    });

    // 3. Changeover tasks assigned to this worker
    if (result.changeovers && result.changeovers.length > 0) {
      const workerChangeovers = result.changeovers.filter(c => c.workerIds.includes(worker.workerId));
      for (const co of workerChangeovers) {
        bars.push({
          id: `${rowId}-changeover-${co.stationId}-${co.copy}-${co.startSeconds}`,
          startSeconds: co.startSeconds,
          endSeconds: co.endSeconds,
          durationSeconds: r3(co.endSeconds - co.startSeconds),
          kind: 'changeover',
          label: `Przezbrojenie: ${co.stationId}`,
          tooltip: `${worker.workerName} (${worker.workerId}): udział w przezbrojeniu stanowiska ${co.stationId} (kopia ${co.copy}) ${co.fromVariantId} → ${co.toVariantId} (${co.durationSeconds} s)`,
          stationId: co.stationId,
          copy: co.copy,
          workerIds: co.workerIds,
        });
      }
    }

    bars.sort((a, b) => a.startSeconds !== b.startSeconds ? a.startSeconds - b.startSeconds : a.endSeconds - b.endSeconds);
    const totalActive = r3(bars.reduce((sum, b) => b.kind === 'work' || b.kind === 'changeover' || b.kind === 'transport-transfer' || b.kind === 'transport-empty' ? sum + b.durationSeconds : sum, 0));

    rows.push({
      id: rowId,
      label: worker.workerName,
      sublabel: worker.workerId,
      category: 'worker',
      targetObjectId: worker.workerId,
      bars,
      totalActiveSeconds: totalActive,
    });
  }

  return rows;
}

/**
 * Main builder function for the complete Gantt Chart Model.
 */
export function buildScheduleGanttChart(
  project: DomainProjectV6,
  result: WorkerScheduleResult,
  viewMode: GanttViewMode = 'operations'
): GanttChartModel {
  const makespan = result.jobs.length > 0 ? Math.max(...result.jobs.map(j => j.finish), 0) : 0;
  const timeGrid = calculateGanttTimeGrid(makespan);

  let rows: GanttRow[] = [];
  if (viewMode === 'operations') {
    rows = buildOperationsGantt(project, result);
  } else if (viewMode === 'stations') {
    rows = buildStationsGantt(project, result);
  } else if (viewMode === 'workers') {
    rows = buildWorkersGantt(project, result);
  }

  return {
    viewMode,
    totalDurationSeconds: makespan,
    rows,
    timeGrid,
  };
}
