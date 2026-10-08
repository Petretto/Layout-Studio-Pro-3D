import type {DomainProjectV6} from './domainProject';
import type {WorkerScheduleResult} from './workerSchedule';
import {startBackgroundTask, type WorkerPort, type CalculationProgress, type CalculationReply} from './backgroundTask';

export interface ScheduleRequest {project: DomainProjectV6; batch: number; arrivalIntervalSeconds: number}
export type ScheduleProgress = CalculationProgress;
export type ScheduleReply = CalculationReply<WorkerScheduleResult>;

/** Each calculation owns a worker; termination cancels even a synchronous calculation inside it. */
export function startScheduleTask(request: ScheduleRequest, callbacks: {
  progress: (progress: ScheduleProgress) => void;
  result: (result: WorkerScheduleResult) => void;
  error: (message: string) => void;
}, createWorker: () => WorkerPort): () => void {
  return startBackgroundTask<ScheduleRequest, WorkerScheduleResult>(request, callbacks, createWorker);
}
