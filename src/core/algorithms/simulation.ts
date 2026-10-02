export interface Job { id:number; arrival:number; starts:number[]; ends:number[]; finish:number }
/** Deterministic serial stations, one operator/server per station, infinite FIFO buffers, zero transfer time. */
export function simulate(cycles:number[],arrivalInterval:number,batch:number):Job[]{
  if(!cycles.length||cycles.some(c=>!Number.isFinite(c)||c<=0)||!Number.isFinite(arrivalInterval)||arrivalInterval<=0||!Number.isInteger(batch)||batch<1||batch>10000)throw new Error('Niepoprawne parametry symulacji (partia 1–10000).');
  const available=cycles.map(()=>0),jobs:Job[]=[];
  for(let i=0;i<batch;i++){const arrival=i*arrivalInterval,starts:number[]=[],ends:number[]=[];let time=arrival;cycles.forEach((c,k)=>{const start=Math.max(time,available[k]);starts.push(start);time=start+c;ends.push(time);available[k]=time;});jobs.push({id:i+1,arrival,starts,ends,finish:time});}return jobs;
}
export function simulationAt(jobs:Job[],time:number){const completed=jobs.filter(j=>j.finish<=time+1e-8).length;return {completed,wip:jobs.filter(j=>j.arrival<=time&&j.finish>time+1e-8).length,throughput:time>0?completed/time*3600:0};}

export const SIMULATION_SPEEDS = [1, 2, 5, 10, 20, 50, 100, 200, 500, 1000, 2000, 5000] as const;
export type SimulationSpeed = typeof SIMULATION_SPEEDS[number];

export function stepSimulationTime(currentTime: number, deltaRealSeconds: number, speed: number, endTime: number): number {
  const clampedDelta = Math.max(0, Math.min(deltaRealSeconds, 0.25));
  return Math.min(endTime, currentTime + clampedDelta * speed);
}
