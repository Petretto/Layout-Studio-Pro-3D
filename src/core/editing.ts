import { ProcessStep, ProjectData } from './models/types';
import { processErrors, topologicalSort } from './validation';
import { runLineBalancing } from './algorithms/lineBalancingEngine';
import { calculateTaktTime } from './algorithms/taktCalculator';

export const successorsOf = (steps: ProcessStep[], id: string) => steps.filter(s=>s.predecessorIds.includes(id)).map(s=>s.id);
export function replaceImportedProcess(p:ProjectData,steps:ProcessStep[]){
  return updateProcess({...p,algorithm:'RPW',workstationSettings:{}},steps);
}
export function setOperationLinks(steps: ProcessStep[], id: string, predecessors: string[], successors: string[]) {
  const ids = new Set(steps.map(s=>s.id));
  if (!ids.has(id)) throw new Error('Operacja już nie istnieje.');
  for (const link of [...predecessors,...successors]) if(!ids.has(link)) throw new Error(`Nie istnieje operacja ${link}.`);
  if(successors.includes(id)||predecessors.includes(id)) throw new Error('Operacja nie może łączyć się sama ze sobą.');
  const next = steps.map(s=>({...s,predecessorIds:s.id===id?[...new Set(predecessors)]:
    [...new Set([...s.predecessorIds.filter(x=>x!==id),...(successors.includes(s.id)?[id]:[])])]}));
  const errors=processErrors(next);if(errors.length)throw new Error(errors.join('\n'));
  return next;
}

// All editors use the same process model. Derived results are never edited directly.
export function updateProcess(p: ProjectData, steps: ProcessStep[]): ProjectData {
  if (steps.length > 500) throw new Error('Limit: 500 operacji.');
  const errors = processErrors(steps);
  if (errors.length) throw new Error(errors.join('\n'));
  if (p.algorithm === 'Manual') {
    runLineBalancing(steps, calculateTaktTime(p.demand).taktTimeSeconds, 'Manual');
  }
  return { ...p, processSteps: steps };
}

export function editOperation(p: ProjectData, id: string, name: string, time: number, va: number) {
  if (!p.processSteps.some(s => s.id === id)) throw new Error('Operacja już nie istnieje.');
  return updateProcess(p, p.processSteps.map(s => s.id === id ? {
    ...s, name: name.trim(), standardTimeSeconds: time, vaTimeSeconds: va,
    nvaTimeSeconds: Number((time - va).toFixed(6)),
  } : s));
}

export function connectOperations(p: ProjectData, from: string, to: string) {
  if (!p.processSteps.some(s => s.id === from) || !p.processSteps.some(s => s.id === to)) {
    throw new Error('Wybierz dwie istniejące operacje.');
  }
  if (p.processSteps.find(s => s.id === to)!.predecessorIds.includes(from)) {
    throw new Error('To połączenie już istnieje.');
  }
  return updateProcess(p, p.processSteps.map(s => s.id === to ? { ...s, predecessorIds: [...s.predecessorIds, from] } : s));
}

export function disconnectOperations(p: ProjectData, from: string, to: string) {
  return updateProcess(p, p.processSteps.map(s => s.id === to ? { ...s, predecessorIds: s.predecessorIds.filter(id => id !== from) } : s));
}

export function addOperation(p: ProjectData, after?: string) {
  const ids = new Set(p.processSteps.map(s => s.id));
  let n = 10;
  while (ids.has(`OP${n}`)) n++;
  const parent = p.processSteps.find(s => s.id === after);
  if (after && !parent) throw new Error('Operacja źródłowa już nie istnieje.');
  const lastStation = Math.max(1, ...p.processSteps.map(s => Number(s.assignedWorkstationId?.replace('WS-', '')) || 1));
  const step: ProcessStep = {
    id: `OP${n}`, name: 'Nowa operacja', standardTimeSeconds: 40, vaTimeSeconds: 34, nvaTimeSeconds: 6,
    sequenceNumber: p.processSteps.length + 1, predecessorIds: parent ? [parent.id] : [],
    ...(p.algorithm === 'Manual' ? { assignedWorkstationId: parent?.assignedWorkstationId ?? `WS-${lastStation}` } : {}),
  };
  return { project: updateProcess(p, [...p.processSteps, step]), id: step.id };
}

export function moveOperation(p: ProjectData, id: string, target: number) {
  const result = runLineBalancing(p.processSteps, calculateTaktTime(p.demand).taktTimeSeconds, p.algorithm ?? 'RPW');
  if (!p.processSteps.some(s => s.id === id)) throw new Error('Nieznana operacja.');
  if (!Number.isInteger(target) || target < 1 || target > result.workstations.length + 1) throw new Error('Niepoprawne stanowisko docelowe.');
  const assignment = new Map(result.workstations.flatMap(ws => ws.assignedStepIds.map(step => [step, ws.sequenceIndex] as const)));
  assignment.set(id, target);
  // Empty stations disappear; relative order of occupied stations remains unchanged.
  const occupied = [...new Set(assignment.values())].sort((a, b) => a - b);
  const steps = p.processSteps.map(s => ({ ...s, assignedWorkstationId: `WS-${occupied.indexOf(assignment.get(s.id)!) + 1}` }));
  return updateProcess({ ...p, algorithm: 'Manual' }, steps);
}

export function removeOperation(p: ProjectData, id: string, removeMaterials: boolean) {
  if (!p.processSteps.some(s => s.id === id)) throw new Error('Operacja już nie istnieje.');
  let steps = p.processSteps.filter(s => s.id !== id).map(s => ({ ...s, predecessorIds: s.predecessorIds.filter(pred => pred !== id) }));
  if (p.algorithm === 'Manual') {
    const occupied = [...new Set(steps.map(s => Number(s.assignedWorkstationId?.replace('WS-', ''))))].sort((a, b) => a - b);
    steps = steps.map(s => ({ ...s, assignedWorkstationId: `WS-${occupied.indexOf(Number(s.assignedWorkstationId?.replace('WS-', ''))) + 1}` }));
  }
  return updateProcess({ ...p, bom: removeMaterials ? p.bom.filter(b => b.associatedProcessStepId !== id) : p.bom }, steps);
}

export function flowPositions(steps: ProcessStep[], automatic = false) {
  const levels = new Map<string, number>(), rows = new Map<number, number>();
  const positions = new Map<string, { x: number; y: number }>();
  for (const s of topologicalSort(steps)) {
    const level = Math.max(-1, ...s.predecessorIds.map(id => levels.get(id)!)) + 1;
    levels.set(s.id, level);
    const row = rows.get(level) ?? 0;
    positions.set(s.id, !automatic && s.flowPosition ? s.flowPosition : { x: 40 + level * 310, y: 50 + row * 165 });
    rows.set(level, row + 1);
  }
  return positions;
}
