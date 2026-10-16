import {parseDomainProjectV6, domainOperationOrder, type DomainProjectV6} from './domainProject';
import {createWorkerRunPlan} from './workerRunPlan';
import type {StationCandidate} from './stationRouting';

export interface DomainBalanceAssignment extends StationCandidate {operationId: string; durationSeconds: number}
export interface DomainBalanceProposal {
  kind: 'proposal'; sourceJson: string; algorithm: 'RPW' | 'LCR'; targetSeconds: number;
  assignments: DomainBalanceAssignment[];
  loads: {stationId: string; copy: number; seconds: number}[];
}
export type DomainBalanceResult = DomainBalanceProposal | {kind: 'infeasible' | 'limit'; message: string};
const copyKey = (item: {stationId: string; copy: number}) => JSON.stringify([item.stationId, item.copy]);

/** Static per-product work-content balance over declared physical copies. No resource time
 * reservations are made here: operational feasibility remains the scheduler's responsibility. */
export function proposeDomainBalance(input: DomainProjectV6, targetSeconds: number,
  algorithm: 'RPW' | 'LCR'): DomainBalanceResult {
  if (!Number.isFinite(targetSeconds) || targetSeconds <= 0) throw new Error('Bilans: wymagany dodatni limit obciążenia kopii [s/szt.].');
  if (algorithm !== 'RPW' && algorithm !== 'LCR') throw new Error('Bilans: nieznany algorytm.');
  const project = parseDomainProjectV6(JSON.stringify(input));
  if (!project.operations.length) throw new Error('Bilans: brak operacji.');
  if (!project.workerRunSelection) throw new Error('Bilans: zapisz wybór obsady i wariantów czasu.');
  if (!project.stationRouting) throw new Error('Bilans: wymagane jawne dopuszczenia kopii i wyposażenia dla wszystkich operacji.');
  const plan = createWorkerRunPlan(project, project.workerRunSelection.teamWorkerIds, project.workerRunSelection.operations);
  const duration = new Map(plan.operations.map(item => [item.operationId, item.durationSeconds]));
  const stationIndex = new Map(project.stations.map((station, index) => [station.id, index]));
  const owner = new Map(project.stations.flatMap(station => station.operationIds.map(id => [id, station.id] as const)));
  const candidates = new Map<string, StationCandidate[]>();
  for (const operation of project.operations) {
    const declared = project.stationRouting.operations.find(item => item.operationId === operation.id);
    if (!declared) throw new Error(`Operacja ${operation.id}: brak jawnych dopuszczeń kopii do bilansu.`);
    // Material locations are explicit. Never relocate supplies along with an operation.
    const supplies = project.materialSupply?.consumptions?.filter(item => item.operationId === operation.id)
      .map(item => project.materialSupply!.items.find(supply => supply.id === item.supplyId)!.targetStationId) ?? [];
    const permitted = declared.candidates.filter(item => (!operation.lockedWorkstation || owner.get(operation.id) === item.stationId) &&
      supplies.every(stationId => item.stationId === stationId));
    if (!permitted.length) return {kind: 'infeasible', message: `Operacja ${operation.id}: brak dopuszczonej kopii zgodnej z blokadą stanowiska i miejscem zaopatrzenia.`};
    candidates.set(operation.id, permitted);
  }
  if (!Number.isFinite([...duration.values()].reduce((sum, seconds) => sum + seconds, 0))) throw new Error('Bilans: suma czasów poza skończonym zakresem.');
  const steps = domainOperationOrder(project);
  const successors = new Map(steps.map(step => [step.id, steps.filter(other => other.predecessorIds.includes(step.id)).map(other => other.id)]));
  const weights = new Map(steps.map(step => {
    const seen = new Set<string>(), queue = [step.id];
    while (queue.length) {const id = queue.pop()!; if (seen.has(id)) continue; seen.add(id); queue.push(...successors.get(id)!);}
    return [step.id, [...seen].reduce((sum, id) => sum + duration.get(id)!, 0)];
  }));
  const priority = [...steps].sort((a, b) => (algorithm === 'RPW' ? weights.get(b.id)! - weights.get(a.id)! : duration.get(b.id)! - duration.get(a.id)!) ||
    a.sequenceNumber - b.sequenceNumber || a.id.localeCompare(b.id));
  // Select ready operations by RPW/LCR priority. Backtracking changes candidate copies,
  // never the process dependencies or the saved station identities/presentation order.
  const ordered: typeof steps = [], pending = new Set(steps.map(step => step.id));
  while (pending.size) {const next = priority.find(step => pending.has(step.id) && step.predecessorIds.every(id => !pending.has(id)))!; ordered.push(next); pending.delete(next.id);}
  const assigned = new Map<string, DomainBalanceAssignment>(), loads = new Map<string, number>();
  let attempts = 0, limited = false;
  const search = (index: number): boolean => {
    if (index === ordered.length) return true;
    const operation = ordered[index], seconds = duration.get(operation.id)!;
    const earliest = Math.max(-1, ...operation.predecessorIds.map(id => stationIndex.get(assigned.get(id)!.stationId)!));
    const options = [...candidates.get(operation.id)!].sort((a, b) => (loads.get(copyKey(a)) ?? 0) - (loads.get(copyKey(b)) ?? 0) ||
      a.stationId.localeCompare(b.stationId) || a.copy - b.copy);
    for (const candidate of options) {
      if (++attempts > 20000) {limited = true; return false;}
      const key = copyKey(candidate), previous = loads.get(key) ?? 0;
      if (stationIndex.get(candidate.stationId)! < earliest || previous + seconds > targetSeconds + 1e-9) continue;
      assigned.set(operation.id, {...candidate, requiredEquipmentIds: [...candidate.requiredEquipmentIds], operationId: operation.id, durationSeconds: seconds});
      loads.set(key, previous + seconds);
      if (search(index + 1)) return true;
      assigned.delete(operation.id); loads.set(key, previous);
      if (limited) return false;
    }
    return false;
  };
  if (!search(0)) return limited
    ? {kind: 'limit', message: 'Limit 20000 prób bilansu; wykonalność nierozstrzygnięta. Zawęź dopuszczenia lub zmień limit obciążenia.'}
    : {kind: 'infeasible', message: 'Brak przydziału spełniającego ten limit sumy czasów na kopię, kolejność stanowisk, blokady i jawne dopuszczenia. To wynik bilansu statycznego, nie dowód niewykonalności procesu.'};
  const assignments = steps.map(step => assigned.get(step.id)!);
  const occupied = new Map(assignments.map(item => [copyKey(item), item]));
  return {kind: 'proposal', sourceJson: JSON.stringify(project), algorithm, targetSeconds, assignments,
    loads: [...occupied].map(([key, item]) => ({stationId: item.stationId, copy: item.copy, seconds: loads.get(key)!}))};
}

/** Explicit approval narrows operation admissions to the reviewed copies. Routes, equipment,
 * station IDs, empty stations and geometry are preserved; normal draft history can restore alternatives. */
export function applyDomainBalance(input: DomainProjectV6, proposal: DomainBalanceProposal): DomainProjectV6 {
  const project = parseDomainProjectV6(JSON.stringify(input));
  if (JSON.stringify(project) !== proposal.sourceJson) throw new Error('Bilans jest nieaktualny. Oblicz propozycję ponownie.');
  const verified = proposeDomainBalance(project, proposal.targetSeconds, proposal.algorithm);
  if (verified.kind !== 'proposal' || JSON.stringify(verified.assignments) !== JSON.stringify(proposal.assignments)) {
    throw new Error('Propozycja bilansu została zmieniona. Oblicz ją ponownie.');
  }
  return parseDomainProjectV6(JSON.stringify({...project, algorithm: 'Manual',
    stations: project.stations.map(station => ({...station, operationIds: verified.assignments.filter(item => item.stationId === station.id).map(item => item.operationId)})),
    stationRouting: {...project.stationRouting!, operations: verified.assignments.map(({operationId, durationSeconds: _duration, ...candidate}) => ({operationId, candidates: [candidate]}))}}));
}
