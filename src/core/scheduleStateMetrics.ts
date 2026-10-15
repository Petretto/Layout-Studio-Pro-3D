import type {DomainProjectV6} from './domainProject';
import type {WorkerScheduleResult, WorkerScheduleRun, AssemblyTransportMovement} from './workerSchedule';

export interface WaitCausesBreakdown {
  workers: number;
  material: number;
  transport: number;
  buffer: number;
  station: number;
  calendar: number;
}

export interface RunStateDurations {
  job: number;
  operationId: string;
  stationId: string;
  copy: number;
  workerIds: readonly string[];
  workDuration: number;
  netWorkDuration: number;
  pauseDuration: number;
  waitDuration: number;
  waitCauses: readonly string[];
  blockedDuration: number;
  continuationWaitDuration: number;
  transportDuration: number;
  totalStationOccupiedDuration: number;
}

export interface StationStateMetrics {
  stationId: string;
  stationName: string;
  copy: number;
  operationsCount: number;
  processingTimeSeconds: number;
  blockedTimeSeconds: number;
  continuationWaitTimeSeconds: number;
  totalOccupiedTimeSeconds: number;
  idleTimeSeconds: number;
  occupancyRatio: number;
  processingRatio: number;
  denominatorSeconds: number;
  denominatorBasis: string;
  occupancyFormula: string;
  processingFormula: string;
}

export interface EquipmentStateMetrics {
  equipmentId: string;
  equipmentName: string;
  stationId?: string;
  operationsCount: number;
  runTimeSeconds: number;
  transportTimeSeconds: number;
  totalActiveTimeSeconds: number;
  idleTimeSeconds: number;
  utilizationRatio: number;
  denominatorSeconds: number;
  denominatorBasis: string;
  formula: string;
}

export interface WorkerStateMetrics {
  workerId: string;
  workerName: string;
  operationsCount: number;
  workTimeSeconds: number;
  heldBlockTimeSeconds: number;
  transportTimeSeconds: number;
  pauseTimeSeconds: number;
  totalActiveTimeSeconds: number;
  idleTimeSeconds: number;
  activityRatio: number;
  denominatorSeconds: number;
  denominatorBasis: string;
  activityFormula: string;
}

export interface TransportStateMetrics {
  totalMovementsCount: number;
  transferTimeSeconds: number;
  approachTimeSeconds: number;
  returnTimeSeconds: number;
  totalTransportDurationSeconds: number;
}

export interface ScheduleStateSummary {
  makespanSeconds: number;
  totalWorkSeconds: number;
  totalWaitSeconds: number;
  waitBreakdownPartitioned: WaitCausesBreakdown;
  waitBreakdownPresence: WaitCausesBreakdown;
  totalBlockedSeconds: number;
  totalContinuationWaitSeconds: number;
  transportMetrics: TransportStateMetrics;
  stations: StationStateMetrics[];
  equipment: EquipmentStateMetrics[];
  workers: WorkerStateMetrics[];
  runs: RunStateDurations[];
}

function round3(value: number): number {
  return Math.round((value + Number.EPSILON) * 1000) / 1000;
}

export function classifyWaitCause(cause: string): keyof WaitCausesBreakdown {
  switch (cause) {
    case 'workers':
      return 'workers';
    case 'material':
    case 'subassembly':
      return 'material';
    case 'transport':
      return 'transport';
    case 'buffer':
      return 'buffer';
    case 'calendar':
      return 'calendar';
    case 'station':
    case 'same-job':
    case 'equipment':
    case 'body':
    default:
      return 'station';
  }
}

export function calculateWaitBreakdown(runs: readonly WorkerScheduleRun[]): {
  partitioned: WaitCausesBreakdown;
  presence: WaitCausesBreakdown;
} {
  const partitioned: WaitCausesBreakdown = {
    workers: 0,
    material: 0,
    transport: 0,
    buffer: 0,
    station: 0,
    calendar: 0,
  };
  const presence: WaitCausesBreakdown = {
    workers: 0,
    material: 0,
    transport: 0,
    buffer: 0,
    station: 0,
    calendar: 0,
  };

  for (const run of runs) {
    const wait = Math.max(0, run.waitSeconds);
    if (wait <= 0 || !run.waitCauses.length) continue;

    const classifiedUnique = Array.from(new Set(run.waitCauses.map(classifyWaitCause)));
    const part = wait / classifiedUnique.length;

    for (const key of classifiedUnique) {
      partitioned[key] += part;
      presence[key] += wait;
    }
  }

  return {
    partitioned: {
      workers: round3(partitioned.workers),
      material: round3(partitioned.material),
      transport: round3(partitioned.transport),
      buffer: round3(partitioned.buffer),
      station: round3(partitioned.station),
      calendar: round3(partitioned.calendar),
    },
    presence: {
      workers: round3(presence.workers),
      material: round3(presence.material),
      transport: round3(presence.transport),
      buffer: round3(presence.buffer),
      station: round3(presence.station),
      calendar: round3(presence.calendar),
    },
  };
}

export function calculateRunDurations(run: WorkerScheduleRun): RunStateDurations {
  const workDuration = Math.max(0, run.endSeconds - run.startSeconds);
  const pauseDuration = run.pauses?.reduce((sum, p) => sum + Math.max(0, p.endSeconds - p.startSeconds), 0) ?? 0;
  const netWorkDuration = run.workWindows?.length
    ? run.workWindows.reduce((sum, w) => sum + Math.max(0, w.endSeconds - w.startSeconds), 0)
    : Math.max(0, workDuration - pauseDuration);
  const waitDuration = Math.max(0, run.waitSeconds);
  const blockedDuration = Math.max(0, run.blockedSeconds ?? 0);
  const continuationWaitDuration = Math.max(0, run.continuationWaitSeconds ?? 0);
  const transportDuration = run.transport ? Math.max(0, run.transport.endSeconds - run.transport.startSeconds) : 0;
  const totalStationOccupiedDuration = round3(workDuration + blockedDuration + continuationWaitDuration);

  return {
    job: run.job,
    operationId: run.operationId,
    stationId: run.stationId,
    copy: run.copy,
    workerIds: run.workerIds,
    workDuration: round3(workDuration),
    netWorkDuration: round3(netWorkDuration),
    pauseDuration: round3(pauseDuration),
    waitDuration: round3(waitDuration),
    waitCauses: run.waitCauses,
    blockedDuration: round3(blockedDuration),
    continuationWaitDuration: round3(continuationWaitDuration),
    transportDuration: round3(transportDuration),
    totalStationOccupiedDuration,
  };
}

export function calculateTransportMetrics(
  movements?: readonly AssemblyTransportMovement[],
): TransportStateMetrics {
  if (!movements || !movements.length) {
    return {
      totalMovementsCount: 0,
      transferTimeSeconds: 0,
      approachTimeSeconds: 0,
      returnTimeSeconds: 0,
      totalTransportDurationSeconds: 0,
    };
  }

  let transferTime = 0;
  let approachTime = 0;
  let returnTime = 0;

  for (const m of movements) {
    const duration = Math.max(0, m.endSeconds - m.startSeconds);
    if (m.purpose === 'transfer') transferTime += duration;
    else if (m.purpose === 'approach') approachTime += duration;
    else if (m.purpose === 'return') returnTime += duration;
  }

  return {
    totalMovementsCount: movements.length,
    transferTimeSeconds: round3(transferTime),
    approachTimeSeconds: round3(approachTime),
    returnTimeSeconds: round3(returnTime),
    totalTransportDurationSeconds: round3(transferTime + approachTime + returnTime),
  };
}

export function calculateStationMetrics(
  project: DomainProjectV6,
  runs: readonly WorkerScheduleRun[],
  makespan: number,
): StationStateMetrics[] {
  const result: StationStateMetrics[] = [];
  const runsByStationCopy = new Map<string, WorkerScheduleRun[]>();

  for (const run of runs) {
    const key = `${run.stationId}:${run.copy}`;
    const list = runsByStationCopy.get(key) ?? [];
    list.push(run);
    runsByStationCopy.set(key, list);
  }

  for (const station of project.stations) {
    const parallel = project.stationSettings[station.id]?.parallelStations ?? 1;
    for (let copy = 1; copy <= parallel; copy++) {
      const key = `${station.id}:${copy}`;
      const stationRuns = runsByStationCopy.get(key) ?? [];

      let processing = 0;
      let blocked = 0;
      let continuation = 0;

      for (const r of stationRuns) {
        processing += Math.max(0, r.endSeconds - r.startSeconds);
        blocked += Math.max(0, r.blockedSeconds ?? 0);
        continuation += Math.max(0, r.continuationWaitSeconds ?? 0);
      }

      const totalOccupied = processing + blocked + continuation;
      const idle = Math.max(0, makespan - totalOccupied);
      const occupancyRatio = makespan > 0 ? Math.min(1, totalOccupied / makespan) : 0;
      const processingRatio = makespan > 0 ? Math.min(1, processing / makespan) : 0;
      const denominatorBasis = 'czas realizacji partii (makespan) dla danej kopii stanowiska';
      const occupancyFormula = makespan > 0
        ? `${round3(totalOccupied)} s / ${round3(makespan)} s = ${(occupancyRatio * 100).toFixed(1)}%`
        : '0.0%';
      const processingFormula = makespan > 0
        ? `${round3(processing)} s / ${round3(makespan)} s = ${(processingRatio * 100).toFixed(1)}%`
        : '0.0%';

      result.push({
        stationId: station.id,
        stationName: station.name,
        copy,
        operationsCount: stationRuns.length,
        processingTimeSeconds: round3(processing),
        blockedTimeSeconds: round3(blocked),
        continuationWaitTimeSeconds: round3(continuation),
        totalOccupiedTimeSeconds: round3(totalOccupied),
        idleTimeSeconds: round3(idle),
        occupancyRatio: round3(occupancyRatio),
        processingRatio: round3(processingRatio),
        denominatorSeconds: round3(makespan),
        denominatorBasis,
        occupancyFormula,
        processingFormula,
      });
    }
  }

  return result;
}

export function calculateEquipmentMetrics(
  project: DomainProjectV6,
  runs: readonly WorkerScheduleRun[],
  movements: readonly AssemblyTransportMovement[] | undefined,
  makespan: number,
): EquipmentStateMetrics[] {
  const result: EquipmentStateMetrics[] = [];
  const operationsById = new Map(project.operations.map(op => [op.id, op]));

  for (const eq of project.equipment) {
    let runTime = 0;
    let transportTime = 0;
    let operationsCount = 0;

    for (const run of runs) {
      const op = operationsById.get(run.operationId);
      const isUsedInRun = run.equipmentIds?.includes(eq.id);
      if (!isUsedInRun) continue;

      operationsCount++;
      if (op?.timeProfile?.machineRun?.length) {
        const machineDuration = op.timeProfile.machineRun.reduce(
          (sum, interval) => sum + Math.max(0, interval.endSeconds - interval.startSeconds),
          0,
        );
        runTime += machineDuration;
      } else {
        runTime += Math.max(0, run.endSeconds - run.startSeconds);
      }
    }

    if (movements?.length) {
      for (const m of movements) {
        if (m.equipmentIds.includes(eq.id)) {
          transportTime += Math.max(0, m.endSeconds - m.startSeconds);
        }
      }
    }

    const totalActiveTime = runTime + transportTime;
    const idleTime = Math.max(0, makespan - totalActiveTime);
    const utilizationRatio = makespan > 0 ? Math.min(1, totalActiveTime / makespan) : 0;
    const denominatorBasis = 'czas realizacji partii (makespan)';
    const formula = makespan > 0
      ? `${round3(totalActiveTime)} s / ${round3(makespan)} s = ${(utilizationRatio * 100).toFixed(1)}%`
      : '0.0%';

    result.push({
      equipmentId: eq.id,
      equipmentName: eq.name,
      stationId: eq.stationId,
      operationsCount,
      runTimeSeconds: round3(runTime),
      transportTimeSeconds: round3(transportTime),
      totalActiveTimeSeconds: round3(totalActiveTime),
      idleTimeSeconds: round3(idleTime),
      utilizationRatio: round3(utilizationRatio),
      denominatorSeconds: round3(makespan),
      denominatorBasis,
      formula,
    });
  }

  return result;
}

export function calculateWorkerMetrics(
  project: DomainProjectV6,
  runs: readonly WorkerScheduleRun[],
  movements: readonly AssemblyTransportMovement[] | undefined,
  makespan: number,
): WorkerStateMetrics[] {
  const result: WorkerStateMetrics[] = [];
  const allWorkers = project.workers;

  for (const worker of allWorkers) {
    const workerRuns = runs.filter(r => r.workerIds.includes(worker.id));
    let workTime = 0;
    let heldBlockTime = 0;
    let pauseTime = 0;

    for (const r of workerRuns) {
      workTime += Math.max(0, r.endSeconds - r.startSeconds);
      if (r.reserveEndSeconds > r.endSeconds) {
        heldBlockTime += Math.max(0, r.reserveEndSeconds - r.endSeconds);
      }
      if (r.pauses?.length) {
        pauseTime += r.pauses.reduce((sum, p) => sum + Math.max(0, p.endSeconds - p.startSeconds), 0);
      }
    }

    let transportTime = 0;
    if (movements?.length) {
      for (const m of movements) {
        if (m.workerIds.includes(worker.id)) {
          transportTime += Math.max(0, m.endSeconds - m.startSeconds);
        }
      }
    }

    const totalActiveTime = workTime + heldBlockTime + transportTime;
    const idleTime = Math.max(0, makespan - totalActiveTime - pauseTime);
    const activityRatio = makespan > 0 ? Math.min(1, totalActiveTime / makespan) : 0;
    const denominatorBasis = 'czas realizacji partii (makespan) dostępny dla operatora';
    const activityFormula = makespan > 0
      ? `${round3(totalActiveTime)} s / ${round3(makespan)} s = ${(activityRatio * 100).toFixed(1)}%`
      : '0.0%';

    result.push({
      workerId: worker.id,
      workerName: worker.name,
      operationsCount: workerRuns.length,
      workTimeSeconds: round3(workTime),
      heldBlockTimeSeconds: round3(heldBlockTime),
      transportTimeSeconds: round3(transportTime),
      pauseTimeSeconds: round3(pauseTime),
      totalActiveTimeSeconds: round3(totalActiveTime),
      idleTimeSeconds: round3(idleTime),
      activityRatio: round3(activityRatio),
      denominatorSeconds: round3(makespan),
      denominatorBasis,
      activityFormula,
    });
  }

  return result;
}

export function calculateScheduleStateMetrics(
  project: DomainProjectV6,
  result: WorkerScheduleResult,
): ScheduleStateSummary {
  const runs = result.runs ?? [];
  const movements = result.transportMovements ?? [];

  const maxJobFinish = result.jobs?.length ? Math.max(...result.jobs.map(j => j.finish)) : 0;
  const maxRelease = runs.length ? Math.max(...runs.map(r => r.stationReleaseSeconds ?? r.endSeconds)) : 0;
  const maxMovement = movements.length ? Math.max(...movements.map(m => m.endSeconds)) : 0;
  const makespanSeconds = round3(Math.max(maxJobFinish, maxRelease, maxMovement, 0));

  const runDurations = runs.map(calculateRunDurations);
  const totalWorkSeconds = round3(runDurations.reduce((sum, r) => sum + r.workDuration, 0));
  const totalWaitSeconds = round3(runDurations.reduce((sum, r) => sum + r.waitDuration, 0));
  const totalBlockedSeconds = round3(runDurations.reduce((sum, r) => sum + r.blockedDuration, 0));
  const totalContinuationWaitSeconds = round3(
    runDurations.reduce((sum, r) => sum + r.continuationWaitDuration, 0),
  );

  const {partitioned: waitBreakdownPartitioned, presence: waitBreakdownPresence} = calculateWaitBreakdown(runs);
  const transportMetrics = calculateTransportMetrics(movements);
  const stations = calculateStationMetrics(project, runs, makespanSeconds);
  const equipment = calculateEquipmentMetrics(project, runs, movements, makespanSeconds);
  const workers = calculateWorkerMetrics(project, runs, movements, makespanSeconds);

  return {
    makespanSeconds,
    totalWorkSeconds,
    totalWaitSeconds,
    waitBreakdownPartitioned,
    waitBreakdownPresence,
    totalBlockedSeconds,
    totalContinuationWaitSeconds,
    transportMetrics,
    stations,
    equipment,
    workers,
    runs: runDurations,
  };
}
