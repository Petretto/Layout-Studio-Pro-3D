import {parseDomainProjectV6,type DomainProjectV6} from './domainProject';
import type {TransportSimulationMode,WorkerScheduleResult} from './workerSchedule';
import {sha256Hex} from './workspaceBackup';

export type DomainPlaybackConditions={batch:number;arrivalIntervalSeconds:number;transportMode:TransportSimulationMode};
export type DomainPlaybackState='work'|'calendar-pause'|'held'|'waiting';
export function domainModelSignature(project:DomainProjectV6){return sha256Hex(JSON.stringify(project));}

/** Immutable read-side binding. No simulation, route or physical body location is generated here. */
export function prepareDomainPlayback(input:DomainProjectV6,result:WorkerScheduleResult,conditions:DomainPlaybackConditions){
  const project=parseDomainProjectV6(JSON.stringify(input));
  if(!Number.isSafeInteger(conditions.batch)||conditions.batch<1||!Number.isFinite(conditions.arrivalIntervalSeconds)||conditions.arrivalIntervalSeconds<=0||!['configured','just-in-time'].includes(conditions.transportMode))throw new Error('Niepoprawne warunki odtwarzania.');
  if((conditions.transportMode==='just-in-time')!==(result.transportMode==='just-in-time')||result.jobs.length!==conditions.batch)throw new Error('Wynik nie odpowiada warunkom odtwarzania.');
  const jobs=result.jobs.map(j=>({id:j.id,arrival:j.arrival,finish:j.finish}));
  if(jobs.some(j=>!Number.isFinite(j.arrival)||!Number.isFinite(j.finish)||j.arrival<0||j.finish<j.arrival))throw new Error('Niepoprawne czasy wyniku.');
  const entries=result.runs.map((run,index)=>{
    const operation=project.operations.find(o=>o.id===run.operationId);
    const copies=project.stationSettings[run.stationId]?.parallelStations;
    if(!operation||!project.stations.some(s=>s.id===run.stationId)||!jobs.some(j=>j.id===run.job)||!Number.isInteger(run.copy)||run.copy<1||(copies!==undefined&&run.copy>copies)||run.workerIds.some(id=>!project.workers.some(w=>w.id===id))||!Number.isFinite(run.readySeconds)||!Number.isFinite(run.startSeconds)||!Number.isFinite(run.endSeconds)||run.readySeconds>run.startSeconds||run.startSeconds<0||run.endSeconds<=run.startSeconds)throw new Error('Niepoprawne odniesienie operacji w wyniku.');
    const release=run.stationReleaseSeconds??run.endSeconds;
    if(!Number.isFinite(release)||release<run.endSeconds||run.workWindows.some(w=>!Number.isFinite(w.startSeconds)||!Number.isFinite(w.endSeconds)||w.startSeconds<run.startSeconds||w.endSeconds>run.endSeconds||w.endSeconds<=w.startSeconds))throw new Error('Niepoprawne okna pracy wyniku.');
    // Locate operation indicators only from explicit equipment bindings. For a single
    // copy, a unique station table is also unambiguous. Never choose table order for copies.
    const explicit=(run.equipmentIds??[]).flatMap(id=>{
      const eq=project.equipment.find(e=>e.id===id),placement=project.stationRouting?.equipmentPlacements.find(p=>p.equipmentId===id);
      return eq?.layoutObjectId&&placement?.stationId===run.stationId&&placement.copy===run.copy?[eq.layoutObjectId]:[];
    });
    const unique=project.layoutObjects.filter(o=>o.workstationId===run.stationId&&o.type.startsWith('Table'));
    const ids=explicit.length?new Set(explicit):new Set(project.stationSettings[run.stationId]?.parallelStations===1&&unique.length===1?[unique[0].id]:[]);
    const anchors=project.layoutObjects.filter(o=>ids.has(o.id)).map(o=>({objectId:o.id,xMm:o.xMm+o.widthMm/2,yMm:o.yMm+o.lengthMm/2,zMm:o.zMm+o.heightMm+180}));
    return {id:`run-${index}`,job:run.job,operationId:run.operationId,operationName:operation.name,stationId:run.stationId,copy:run.copy,workerIds:[...run.workerIds],readySeconds:run.readySeconds,startSeconds:run.startSeconds,endSeconds:run.endSeconds,releaseSeconds:release,workWindows:run.workWindows.map(w=>({...w})),anchors};
  });
  const modelSignature=domainModelSignature(project),resultSignature=sha256Hex(JSON.stringify({conditions,result}));
  return {modelSignature,resultSignature,conditions:{...conditions},entries,jobs,endSeconds:Math.max(0,...jobs.map(j=>j.finish),...entries.map(e=>e.releaseSeconds))};
}
export type DomainPlayback=ReturnType<typeof prepareDomainPlayback>;

export function domainPlaybackFrame(playback:DomainPlayback,time:number){
  const at=Math.max(0,Math.min(playback.endSeconds,Number.isFinite(time)?time:0));
  const states=playback.entries.flatMap(entry=>{
    let state:DomainPlaybackState;
    if(at>=entry.startSeconds&&at<entry.endSeconds)state=entry.workWindows.some(w=>w.startSeconds<=at&&at<w.endSeconds)?'work':'calendar-pause';
    else if(at>=entry.endSeconds&&at<entry.releaseSeconds)state='held';
    else if(at>=entry.readySeconds&&at<entry.startSeconds)state='waiting';else return [];
    return [{id:entry.id,job:entry.job,operationId:entry.operationId,stationId:entry.stationId,copy:entry.copy,state,
      anchors:state==='waiting'?[]:entry.anchors}];
  });
  return {timeSeconds:at,completed:playback.jobs.filter(j=>j.finish<=at).length,arrived:playback.jobs.filter(j=>j.arrival<=at).length,states};
}
