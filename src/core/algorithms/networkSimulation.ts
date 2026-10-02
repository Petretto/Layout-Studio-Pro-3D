import {ProjectData} from '../models/types';
import {topologicalSort} from '../validation';
import {Job} from './simulation';
export interface OperationRun {job:number;stepId:string;stationId:string;copy:number;ready:number;start:number;end:number}
export function simulateNetwork(p:ProjectData,interval:number,batch:number){
  if(!Number.isFinite(interval)||interval<=0||!Number.isInteger(batch)||batch<1||batch>10000)throw new Error('Partia: 1–10000; odstęp musi być dodatni.');
  const steps=topologicalSort(p.processSteps),stations=p.balancing?.workstations??[];
  if(!steps.length||!stations.length)throw new Error('Brak procesu lub bilansu.');
  if(steps.length*batch>200000)throw new Error('Limit symulacji: 200000 wykonań operacji. Zmniejsz partię.');
  const owners=steps.map(s=>stations.findIndex(w=>w.assignedStepIds.includes(s.id)));
  if(owners.some(i=>i<0))throw new Error('Operacja bez stanowiska.');
  const durations=steps.map((s,i)=>s.standardTimeSeconds*stations[owners[i]].cycleTimeSeconds/(stations[owners[i]].baseCycleSeconds??stations[owners[i]].cycleTimeSeconds));
  const successors=steps.map(s=>steps.flatMap((x,i)=>x.predecessorIds.includes(s.id)?[i]:[]));
  const jobs:Job[]=Array.from({length:batch},(_,i)=>({id:i+1,arrival:i*interval,starts:Array(steps.length).fill(Infinity),ends:Array(steps.length).fill(Infinity),finish:Infinity}));
  const remaining=jobs.map(()=>steps.map(s=>s.predecessorIds.length));
  const queues=stations.map(()=>[] as {job:number;step:number;ready:number}[]);
  const free=stations.map(s=>Array(s.parallelStations??1).fill(true) as boolean[]);
  type Event={at:number;job:number;step:number;copy:number};
  const heap:Event[]=[];
  const push=(event:Event)=>{heap.push(event);let i=heap.length-1;while(i){const parent=(i-1)>>1;if(heap[parent].at<=event.at)break;heap[i]=heap[parent];i=parent;}heap[i]=event;};
  const pop=()=>{const first=heap[0],last=heap.pop()!;if(heap.length){let i=0;while(i*2+1<heap.length){let child=i*2+1;if(child+1<heap.length&&heap[child+1].at<heap[child].at)child++;if(heap[child].at>=last.at)break;heap[i]=heap[child];i=child;}heap[i]=last;}return first;};
  jobs.forEach((j,i)=>push({at:j.arrival,job:i,step:-1,copy:-1}));
  const runs:OperationRun[]=[];
  const enqueue=(job:number,step:number,ready:number)=>queues[owners[step]].push({job,step,ready});
  while(heap.length){
    const now=heap[0].at;
    while(heap.length&&heap[0].at===now){
      const event=pop();
      if(event.step<0)steps.forEach((s,i)=>{if(!s.predecessorIds.length)enqueue(event.job,i,now);});
      else{
        free[owners[event.step]][event.copy]=true;
        for(const next of successors[event.step])if(--remaining[event.job][next]===0)enqueue(event.job,next,now);
      }
    }
    stations.forEach((ws,i)=>{
      const queue=queues[i];queue.sort((a,b)=>a.ready-b.ready||a.job-b.job||a.step-b.step);
      for(let copy=0;copy<free[i].length&&queue.length;copy++)if(free[i][copy]){
        const task=queue.shift()!,end=now+durations[task.step];free[i][copy]=false;
        jobs[task.job].starts[task.step]=now;jobs[task.job].ends[task.step]=end;
        runs.push({job:task.job+1,stepId:steps[task.step].id,stationId:ws.id,copy:copy+1,ready:task.ready,start:now,end});
        push({at:end,job:task.job,step:task.step,copy});
      }
    });
  }
  jobs.forEach(j=>{j.finish=Math.max(...j.ends);});
  if(jobs.some(j=>!Number.isFinite(j.finish)))throw new Error('Proces nie został ukończony.');
  return {jobs,runs,stepIds:steps.map(s=>s.id)};
}
