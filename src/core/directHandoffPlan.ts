import type {DomainProjectV6} from './domainProject';
import type {PlannedWorkerOperation} from './workerRunPlan';
import type {StationCandidate} from './stationRouting';
import type {WorkerReservationBook} from './workerReservations';
import {sharedAvailability} from './resourceCalendar';
import {projectWork} from './workProjection';
import {teamCoversCompetencies} from './competencies';

export interface BufferedOperationChoice {
  workers:string[]; projection:NonNullable<ReturnType<typeof projectWork>>; from:number; until:number;
}

/** Exact arrival admission. A later window only suggests a new departure, never an arrival wait.
 * Unknown worker blocking ends are excluded by the caller; all failed choices remain immutable. */
export function planDirectOperation(project:DomainProjectV6,operation:PlannedWorkerOperation,target:StationCandidate,
  at:number,book:WorkerReservationBook,blockedWorkers:ReadonlySet<string>,mayHoldWorkers=false):{choice?:BufferedOperationChoice;retryAt?:number;cause?:'calendar'|'workers'} {
  let choice:BufferedOperationChoice|undefined,retryAt=Infinity,cause:'calendar'|'workers'|undefined,combinations=0;
  const choose=(workers:string[],from:number)=>{
    if(choice)return;
    if(workers.length<operation.workerCount){
      for(let i=from;i<=operation.eligibleWorkerIds.length-(operation.workerCount-workers.length);i++)choose([...workers,operation.eligibleWorkerIds[i]],i+1);
      return;
    }
    if(++combinations>10000)throw new Error('Przekazanie: zbyt wiele kombinacji pracowników.');
    if(!teamCoversCompetencies(project,operation.operationId,workers))return;
    if(workers.some(id=>blockedWorkers.has(id))){cause='workers';return;}
    const windows=project.resourceCalendars?sharedAvailability(project.resourceCalendars,target.stationId,workers):[{startSeconds:0,endSeconds:Number.MAX_VALUE}];
    const window=windows.find(window=>window.endSeconds>at);
    if(!window)return;
    if(window.startSeconds>at){retryAt=Math.min(retryAt,window.startSeconds);cause='calendar';return;}
    const projection=projectWork(windows,at,operation.durationSeconds);
    if(!projection)return;
    const start=projection.atOffset(operation.reserveFromSeconds,false),end=projection.atOffset(operation.reserveUntilSeconds,true);
    // A possible unknown hold must not grow into an already promised future presence.
    const conflicts=book.reservations.filter(reservation=>(mayHoldWorkers||reservation.startSeconds<end)&&start<reservation.endSeconds&&reservation.workerIds.some(id=>workers.includes(id)));
    if(conflicts.length){retryAt=Math.min(retryAt,Math.max(...conflicts.map(conflict=>conflict.endSeconds)));cause='workers';return;}
    choice={workers,projection,from:start,until:end};
  };
  choose([],0);
  return {choice,...(Number.isFinite(retryAt)?{retryAt}:{}),cause};
}
