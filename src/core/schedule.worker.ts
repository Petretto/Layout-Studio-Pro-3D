import {executeScheduleRequest} from './scheduleWorkerRequest';
import type {ScheduleRequest, ScheduleReply} from './scheduleTask';

const scope = self as unknown as {onmessage: (event: MessageEvent<ScheduleRequest>) => void; postMessage: (reply: ScheduleReply) => void};
scope.onmessage = event => executeScheduleRequest(event.data, reply => scope.postMessage(reply));
