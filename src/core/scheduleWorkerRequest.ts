import {scheduleWorkerRun} from './workerSchedule';
import type {ScheduleRequest, ScheduleReply} from './scheduleTask';

/** Same core as synchronous verification. Progress never participates in domain decisions. */
export function executeScheduleRequest(request: ScheduleRequest, send: (reply: ScheduleReply) => void) {
  try {
    let lastPercent = -1;
    const result = scheduleWorkerRun(request.project, request.arrivalIntervalSeconds, request.batch,
      request.project.bodyRunInput, (completed, total) => {
        const percent = Math.floor(completed * 100 / total);
        if (percent !== lastPercent) {lastPercent = percent;send({kind: 'progress', progress: {completed, total}});}
      });
    send({kind: 'result', result});
  } catch (failure) {send({kind: 'error', message: (failure as Error).message});}
}
