import { LayoutObject, ProjectData, ProcessStep } from '../models/types';
import { NetworkResult, OperationRun } from './networkSimulation';
import { Job } from './simulation';

export type JobPhase =
  | 'not_arrived'
  | 'entering'
  | 'processing'
  | 'waiting_local'
  | 'in_transit'
  | 'waiting_queue'
  | 'finished';

export interface AnimatedJobItem {
  jobId: number;
  phase: JobPhase;
  stepId?: string;
  stepName?: string;
  stationId?: string;
  copy?: number;
  workstationName?: string;
  sourceStationId?: string;
  targetStationId?: string;
  sourceObjectId?: string;
  targetObjectId?: string;
  progress: number; // 0 to 1
  positionMm: { xMm: number; yMm: number; zMm: number }; // xMm (X on floor), yMm (Y on floor / Z in 3D), zMm (elevation / Y in 3D)
  carrierType: 'table' | 'cart' | 'conveyor' | 'pallet' | 'floor';
  carrierObjectId?: string;
  currentRun?: OperationRun;
  nextRun?: OperationRun;
  transitAlpha?: number;
  bomComponents: string[];
  statusLabel: string;
  detailText: string;
}

export interface AnimatedVehicleItem {
  id: string;
  name: string;
  type: string;
  positionMm: { xMm: number; yMm: number; zMm: number };
  rotationDeg: number;
  isMoving: boolean;
  carryingJobId?: number;
  statusLabel: string;
}

export interface SimulationAnimationSnapshot {
  time: number;
  batchSize: number;
  activeJobsCount: number;
  completedJobsCount: number;
  inTransitCount: number;
  processingCount: number;
  inQueueCount: number;
  jobs: AnimatedJobItem[];
  vehicles: AnimatedVehicleItem[];
  stationActiveMap: Record<string, { activeRun?: OperationRun; progress: number; currentJobId?: number }>;
}

export interface JobInspectionDetails {
  jobId: number;
  phase: JobPhase;
  statusLabel: string;
  stepId?: string;
  stepName?: string;
  stationId?: string;
  copy?: number;
  workstationName?: string;
  sourceStationName?: string;
  targetStationName?: string;
  progressPercent: number;
  runStartTime?: number;
  runEndTime?: number;
  runDuration?: number;
  timeRemaining?: number;
  arrivalTime: number;
  finishTime?: number;
  totalCycleTimeSoFar: number;
  carrierType: string;
  bomComponents: string[];
}

/**
 * Finds the primary Table layout object representing a workstation copy.
 */
export function findStationTableObject(
  project: ProjectData,
  stationId: string,
  copy = 1
): LayoutObject | undefined {
  const stationTables = project.layoutObjects.filter(
    (o) => o.type.includes('Table') && o.workstationId === stationId
  );
  if (!stationTables.length) return undefined;
  const index = Math.max(0, Math.min(stationTables.length - 1, copy - 1));
  return stationTables[index];
}

/**
 * Finds buffer or staging objects for a station (FIFO rack, pallet, material in).
 */
export function findStationBufferObject(
  project: ProjectData,
  stationId: string
): LayoutObject | undefined {
  return project.layoutObjects.find(
    (o) =>
      o.workstationId === stationId &&
      (o.type.includes('FlowRack') || o.type.includes('Pallet') || o.type.includes('Shelving'))
  );
}

/**
 * Computes coordinates of a layout object center on floor and top surface.
 */
export function getObjectSurfaceCoords(obj: LayoutObject): { xMm: number; yMm: number; zMm: number } {
  return {
    xMm: obj.xMm + obj.widthMm / 2,
    yMm: obj.yMm + obj.lengthMm / 2, // floor Z in Three.js
    zMm: obj.zMm + obj.heightMm + 40, // elevation above working surface
  };
}

/**
 * Pure deterministic calculation of simulation animation snapshot at time `t`.
 */
export function computeSimulationAnimationSnapshot(
  project: ProjectData,
  result: NetworkResult,
  time: number
): SimulationAnimationSnapshot {
  const jobs: AnimatedJobItem[] = [];
  const stationActiveMap: Record<string, { activeRun?: OperationRun; progress: number; currentJobId?: number }> = {};

  const processStepsMap = new Map<string, ProcessStep>();
  project.processSteps.forEach((s) => processStepsMap.set(s.id, s));

  const workstationsMap = new Map<string, { name: string; cycleTimeSeconds: number }>();
  project.balancing?.workstations.forEach((w) => {
    workstationsMap.set(w.id, { name: w.name, cycleTimeSeconds: w.cycleTimeSeconds });
  });

  const bomList = project.bom ?? [];

  const matInObj = project.layoutObjects.find((o) => o.type === 'MaterialIn');
  const matInCoords = matInObj
    ? getObjectSurfaceCoords(matInObj)
    : { xMm: 1000, yMm: 1000, zMm: 200 };

  const finGoodsObj = project.layoutObjects.find((o) => o.type === 'FinishedGoods');
  const finGoodsCoords = finGoodsObj
    ? getObjectSurfaceCoords(finGoodsObj)
    : { xMm: Math.max(1000, project.facility.widthMm - 1500), yMm: Math.max(1000, project.facility.lengthMm - 1500), zMm: 200 };

  // Identify transport vehicles in the layout
  const cartObjects = project.layoutObjects.filter(
    (o) => (o.type as string) === 'CartTuggerPlatform' || (o.type as string) === 'AGVMiniLifter'
  );

  let activeJobsCount = 0;
  let completedJobsCount = 0;
  let inTransitCount = 0;
  let processingCount = 0;
  let inQueueCount = 0;

  // Track vehicles assigned to active transports
  const vehicleStates: AnimatedVehicleItem[] = cartObjects.map((cart) => ({
    id: cart.id,
    name: cart.name,
    type: cart.type,
    positionMm: { xMm: cart.xMm + cart.widthMm / 2, yMm: cart.yMm + cart.lengthMm / 2, zMm: 0 },
    rotationDeg: cart.rotationDeg || 0,
    isMoving: false,
    statusLabel: 'Gotowy do transportu',
  }));

  let vehicleAssignIndex = 0;

  for (let jobId = 1; jobId <= result.jobs.length; jobId++) {
    const job = result.jobs[jobId - 1];
    const arrival = job.arrival;
    const finish = job.finish;

    // Filter and sort runs for this job
    const jobRuns = result.runs
      .filter((r) => r.job === jobId)
      .sort((a, b) => a.start - b.start);

    // 1. Not arrived yet
    if (time < arrival) {
      continue;
    }

    // 2. Finished
    if (time >= finish && Number.isFinite(finish)) {
      completedJobsCount++;
      const lastRun = jobRuns[jobRuns.length - 1];
      const step = lastRun ? processStepsMap.get(lastRun.stepId) : undefined;
      const boms = bomList
        .filter((c) => c.associatedProcessStepId === lastRun?.stepId)
        .map((c) => c.partNumber);

      jobs.push({
        jobId,
        phase: 'finished',
        stepId: lastRun?.stepId,
        stepName: step?.name,
        stationId: lastRun?.stationId,
        copy: lastRun?.copy,
        workstationName: lastRun ? workstationsMap.get(lastRun.stationId)?.name : 'Wyjście',
        progress: 1,
        positionMm: finGoodsCoords,
        carrierType: 'pallet',
        carrierObjectId: finGoodsObj?.id,
        bomComponents: boms,
        statusLabel: 'Ukończono',
        detailText: `Partia zakończona w czasie ${finish.toFixed(1)} s`,
      });
      continue;
    }

    activeJobsCount++;

    // 3. Entering factory (between arrival and first operation start)
    if (jobRuns.length > 0 && time < jobRuns[0].start) {
      const firstRun = jobRuns[0];
      const firstTable = findStationTableObject(project, firstRun.stationId, firstRun.copy);
      const firstBuffer = findStationBufferObject(project, firstRun.stationId);
      const targetCoords = firstBuffer
        ? getObjectSurfaceCoords(firstBuffer)
        : firstTable
        ? getObjectSurfaceCoords(firstTable)
        : { xMm: 2000, yMm: 2000, zMm: 850 + 40 };

      const enterDuration = Math.max(0.1, firstRun.start - arrival);
      const alpha = Math.min(1, Math.max(0, (time - arrival) / enterDuration));

      const posX = matInCoords.xMm + (targetCoords.xMm - matInCoords.xMm) * alpha;
      const posY = matInCoords.yMm + (targetCoords.yMm - matInCoords.yMm) * alpha;
      const posZ = alpha >= 0.95 ? targetCoords.zMm : 300; // on cart/floor elevation during entry

      inTransitCount++;
      jobs.push({
        jobId,
        phase: 'entering',
        stepId: firstRun.stepId,
        stepName: processStepsMap.get(firstRun.stepId)?.name,
        stationId: firstRun.stationId,
        copy: firstRun.copy,
        workstationName: workstationsMap.get(firstRun.stationId)?.name,
        sourceStationId: 'MaterialIn',
        targetStationId: firstRun.stationId,
        sourceObjectId: matInObj?.id,
        targetObjectId: firstTable?.id,
        progress: alpha,
        positionMm: { xMm: posX, yMm: posY, zMm: posZ },
        carrierType: 'cart',
        nextRun: firstRun,
        transitAlpha: alpha,
        bomComponents: bomList
          .filter((c) => c.associatedProcessStepId === firstRun.stepId)
          .map((c) => c.partNumber),
        statusLabel: 'Wprowadzanie na linię',
        detailText: `Dojazd z wejścia do ${workstationsMap.get(firstRun.stationId)?.name ?? firstRun.stationId}`,
      });
      continue;
    }

    // 4. Check if currently executing an operation run
    const currentRun = jobRuns.find((r) => r.start <= time && r.end > time);
    if (currentRun) {
      processingCount++;
      const step = processStepsMap.get(currentRun.stepId);
      const wsInfo = workstationsMap.get(currentRun.stationId);
      const table = findStationTableObject(project, currentRun.stationId, currentRun.copy);
      const tableCoords = table
        ? getObjectSurfaceCoords(table)
        : { xMm: 2000, yMm: 2000, zMm: 850 + 40 };

      const duration = Math.max(0.001, currentRun.end - currentRun.start);
      const progress = Math.min(1, Math.max(0, (time - currentRun.start) / duration));

      stationActiveMap[`${currentRun.stationId}-${currentRun.copy}`] = {
        activeRun: currentRun,
        progress,
        currentJobId: jobId,
      };

      const boms = bomList
        .filter((c) => c.associatedProcessStepId === currentRun.stepId)
        .map((c) => c.partNumber);

      jobs.push({
        jobId,
        phase: 'processing',
        stepId: currentRun.stepId,
        stepName: step?.name,
        stationId: currentRun.stationId,
        copy: currentRun.copy,
        workstationName: wsInfo?.name,
        progress,
        positionMm: tableCoords,
        carrierType: 'table',
        carrierObjectId: table?.id,
        currentRun,
        bomComponents: boms,
        statusLabel: `W toku: ${step?.name ?? currentRun.stepId}`,
        detailText: `Stanowisko ${wsInfo?.name ?? currentRun.stationId} (Kopia ${currentRun.copy}), postęp ${Math.round(progress * 100)}%`,
      });
      continue;
    }

    // 5. Between two operation runs (waiting local, in transit, or waiting in queue)
    let prevRun: OperationRun | undefined;
    let nextRun: OperationRun | undefined;

    for (let i = 0; i < jobRuns.length - 1; i++) {
      if (jobRuns[i].end <= time && jobRuns[i + 1].start > time) {
        prevRun = jobRuns[i];
        nextRun = jobRuns[i + 1];
        break;
      }
    }

    if (prevRun && nextRun) {
      const isSameStationCopy =
        prevRun.stationId === nextRun.stationId && prevRun.copy === nextRun.copy;

      const prevTable = findStationTableObject(project, prevRun.stationId, prevRun.copy);
      const nextTable = findStationTableObject(project, nextRun.stationId, nextRun.copy);
      const nextBuffer = findStationBufferObject(project, nextRun.stationId);

      const prevCoords = prevTable ? getObjectSurfaceCoords(prevTable) : matInCoords;
      const nextCoords = nextTable ? getObjectSurfaceCoords(nextTable) : matInCoords;
      const bufferCoords = nextBuffer ? getObjectSurfaceCoords(nextBuffer) : nextCoords;

      if (isSameStationCopy) {
        // Same-copy continuation: product stays on the same station copy!
        inQueueCount++;
        const nextStep = processStepsMap.get(nextRun.stepId);
        jobs.push({
          jobId,
          phase: 'waiting_local',
          stepId: nextRun.stepId,
          stepName: nextStep?.name,
          stationId: prevRun.stationId,
          copy: prevRun.copy,
          workstationName: workstationsMap.get(prevRun.stationId)?.name,
          progress: 0,
          positionMm: prevCoords,
          carrierType: 'table',
          carrierObjectId: prevTable?.id,
          currentRun: prevRun,
          nextRun,
          bomComponents: bomList
            .filter((c) => c.associatedProcessStepId === nextRun?.stepId)
            .map((c) => c.partNumber),
          statusLabel: 'Oczekiwanie lokalne',
          detailText: `Korpus pozostaje na kopii ${prevRun.copy} przed ${nextStep?.name ?? nextRun.stepId}`,
        });
      } else {
        // Inter-station transfer
        const readyTime = nextRun.ready;
        const departureTime = prevRun.end;
        const startTime = nextRun.start;

        let isInTransit = false;
        let transitAlpha = 0;

        if (readyTime > departureTime) {
          // Explicit transit time in schedule
          if (time < readyTime) {
            isInTransit = true;
            transitAlpha = Math.min(1, Math.max(0, (time - departureTime) / Math.max(0.01, readyTime - departureTime)));
          }
        } else {
          // Zero model transport duration: use smooth visual transit for animation
          const visualTransitDuration = Math.min(2.5, Math.max(0.1, (startTime - departureTime) * 0.6));
          if (time < departureTime + visualTransitDuration) {
            isInTransit = true;
            transitAlpha = Math.min(1, Math.max(0, (time - departureTime) / visualTransitDuration));
          }
        }

        if (isInTransit) {
          inTransitCount++;
          const posX = prevCoords.xMm + (nextCoords.xMm - prevCoords.xMm) * transitAlpha;
          const posY = prevCoords.yMm + (nextCoords.yMm - prevCoords.yMm) * transitAlpha;
          const posZ = 280; // carried on cart height

          // Animate an available cart if present
          if (vehicleStates.length > 0) {
            const vehicle = vehicleStates[vehicleAssignIndex % vehicleStates.length];
            vehicleAssignIndex++;
            vehicle.isMoving = true;
            vehicle.carryingJobId = jobId;
            vehicle.positionMm = { xMm: posX, yMm: posY, zMm: 0 };
            const dx = nextCoords.xMm - prevCoords.xMm;
            const dy = nextCoords.yMm - prevCoords.yMm;
            vehicle.rotationDeg = Math.round((Math.atan2(dx, dy) * 180) / Math.PI);
            vehicle.statusLabel = `Przewóz sztuki #${jobId} do ${workstationsMap.get(nextRun.stationId)?.name ?? nextRun.stationId}`;
          }

          const nextStep = processStepsMap.get(nextRun.stepId);
          jobs.push({
            jobId,
            phase: 'in_transit',
            stepId: nextRun.stepId,
            stepName: nextStep?.name,
            stationId: nextRun.stationId,
            copy: nextRun.copy,
            workstationName: workstationsMap.get(nextRun.stationId)?.name,
            sourceStationId: prevRun.stationId,
            targetStationId: nextRun.stationId,
            sourceObjectId: prevTable?.id,
            targetObjectId: nextTable?.id,
            progress: transitAlpha,
            positionMm: { xMm: posX, yMm: posY, zMm: posZ },
            carrierType: 'cart',
            currentRun: prevRun,
            nextRun,
            transitAlpha,
            bomComponents: bomList
              .filter((c) => c.associatedProcessStepId === nextRun.stepId)
              .map((c) => c.partNumber),
            statusLabel: 'Transport',
            detailText: `Przejazd z ${workstationsMap.get(prevRun.stationId)?.name ?? prevRun.stationId} do ${workstationsMap.get(nextRun.stationId)?.name ?? nextRun.stationId}`,
          });
        } else {
          // Waiting in destination buffer / queue
          inQueueCount++;
          const nextStep = processStepsMap.get(nextRun.stepId);
          jobs.push({
            jobId,
            phase: 'waiting_queue',
            stepId: nextRun.stepId,
            stepName: nextStep?.name,
            stationId: nextRun.stationId,
            copy: nextRun.copy,
            workstationName: workstationsMap.get(nextRun.stationId)?.name,
            progress: 0,
            positionMm: bufferCoords,
            carrierType: nextBuffer ? 'pallet' : 'table',
            carrierObjectId: nextBuffer?.id || nextTable?.id,
            currentRun: prevRun,
            nextRun,
            bomComponents: bomList
              .filter((c) => c.associatedProcessStepId === nextRun.stepId)
              .map((c) => c.partNumber),
            statusLabel: 'Kolejka / Bufor',
            detailText: `Oczekiwanie w buforze stacji ${workstationsMap.get(nextRun.stationId)?.name ?? nextRun.stationId} przed ${nextStep?.name ?? nextRun.stepId}`,
          });
        }
      }
    }
  }

  return {
    time,
    batchSize: result.jobs.length,
    activeJobsCount,
    completedJobsCount,
    inTransitCount,
    processingCount,
    inQueueCount,
    jobs,
    vehicles: vehicleStates,
    stationActiveMap,
  };
}

/**
 * Extracts complete inspection details for a selected Job.
 * Supports both:
 * 1. (project, result, jobId, time)
 * 2. (snapshot, jobId, project)
 */
export function getJobInspectionDetails(
  arg1: ProjectData | SimulationAnimationSnapshot,
  arg2: NetworkResult | number,
  arg3: number | ProjectData,
  arg4?: number
): JobInspectionDetails | undefined {
  let snapshot: SimulationAnimationSnapshot;
  let jobId: number;
  let project: ProjectData;

  if ('jobs' in arg1 && Array.isArray((arg1 as any).jobs) && 'stationActiveMap' in arg1) {
    // Called as (snapshot, jobId, project)
    snapshot = arg1 as SimulationAnimationSnapshot;
    jobId = arg2 as number;
    project = arg3 as ProjectData;
  } else {
    // Called as (project, result, jobId, time)
    project = arg1 as ProjectData;
    const result = arg2 as NetworkResult;
    jobId = arg3 as number;
    const time = arg4 ?? 0;
    snapshot = computeSimulationAnimationSnapshot(project, result, time);
  }

  const item = snapshot.jobs.find((j) => j.jobId === jobId);
  if (!item) return undefined;

  const step = item.stepId ? project.processSteps.find((s) => s.id === item.stepId) : undefined;
  const ws = item.stationId ? project.balancing?.workstations.find((w) => w.id === item.stationId) : undefined;
  const sourceWs = item.sourceStationId ? project.balancing?.workstations.find((w) => w.id === item.sourceStationId) : undefined;
  const targetWs = item.targetStationId ? project.balancing?.workstations.find((w) => w.id === item.targetStationId) : undefined;

  let runStartTime: number | undefined;
  let runEndTime: number | undefined;
  let runDuration: number | undefined;
  let timeRemaining: number | undefined;

  if (item.currentRun && item.phase === 'processing') {
    runStartTime = item.currentRun.start;
    runEndTime = item.currentRun.end;
    runDuration = item.currentRun.end - item.currentRun.start;
    timeRemaining = Math.max(0, item.currentRun.end - snapshot.time);
  }

  return {
    jobId,
    phase: item.phase,
    statusLabel: item.statusLabel,
    stepId: item.stepId,
    stepName: step?.name,
    stationId: item.stationId,
    copy: item.copy,
    workstationName: ws?.name,
    sourceStationName: sourceWs?.name || item.sourceStationId,
    targetStationName: targetWs?.name || item.targetStationId,
    progressPercent: Math.round(item.progress * 100),
    runStartTime,
    runEndTime,
    runDuration,
    timeRemaining,
    arrivalTime: 0,
    totalCycleTimeSoFar: snapshot.time,
    carrierType: item.carrierType,
    bomComponents: item.bomComponents,
  };
}
