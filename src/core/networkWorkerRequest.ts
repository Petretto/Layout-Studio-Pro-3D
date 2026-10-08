import type {ProjectData} from './models/types';
import {simulateNetwork, type NetworkResult} from './algorithms/networkSimulation';
import type {CalculationReply} from './backgroundTask';

export interface NetworkRequest {project: ProjectData; interval: number; batch: number}
export type NetworkReply = CalculationReply<NetworkResult>;
export function executeNetworkRequest(request: NetworkRequest, send: (reply: NetworkReply) => void) {
  try {
    let lastPercent = -1;
    const result = simulateNetwork(request.project, request.interval, request.batch, (completed, total) => {
      const percent = Math.floor(completed * 100 / total);
      if (percent !== lastPercent) {lastPercent = percent;send({kind:'progress',progress:{completed,total}});}
    });
    send({kind:'result',result});
  } catch (failure) {send({kind:'error',message:(failure as Error).message});}
}
