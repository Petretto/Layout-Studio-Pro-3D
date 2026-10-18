import type {Issue} from './validation';
import type {StationProjectV5} from './stationMigration';
import {parseStationProjectV5} from './stationProject';
import {runStationBalancing} from './stationBalancing';
import {applyStationResources} from './resources';
import {calculateTaktTime} from './algorithms/taktCalculator';
import {layoutWarnings, generate3DLayout, defaultLayoutSettings} from './algorithms/layoutEngine';

/** Compute schema-5 results without replacing saved equipment or geometry.
 * When no equipment exists yet, generate initial layout proposal automatically.
 * Missing copies in existing equipment are reported so the editor can request an explicit decision.
 */
export function deriveStationProject(input: StationProjectV5) {
  const source = parseStationProjectV5(JSON.stringify(input));
  const target = calculateTaktTime(source.demand).taktTimeSeconds;
  const balancing = applyStationResources(runStationBalancing(source, target), source.workstationSettings);
  let layoutObjects = source.layoutObjects;
  let layoutMode = source.layoutMode;
  if ((!layoutObjects || layoutObjects.length === 0) && balancing.workstations.length > 0 && source.id !== 'eko-demo-v04') {
    layoutObjects = generate3DLayout(
      balancing.workstations,
      source.targetLayoutType ?? 'ProcessFlow',
      source.facility,
      source.layoutSettings ?? defaultLayoutSettings,
      source.processSteps,
      source.bom
    );
    layoutMode = 'auto';
  }
  const project = {...source, balancing, layoutObjects, layoutMode};
  const issues: Issue[] = [];
  const tables = layoutObjects.filter(o => o.type.includes('Table'));
  for (const station of balancing.workstations) {
    const count = tables.filter(o => o.workstationId === station.id).length;
    if (count !== (station.parallelStations ?? 1)) issues.push({area: 'layout', severity: 'error',
      message: `${station.name}: layout ma ${count} stołów, wymagane ${station.parallelStations ?? 1}. Uzgodnij geometrię jawnie.`});
  }
  if (tables.some(o => !o.workstationId)) issues.push({area: 'layout', severity: 'error',
    message: 'Stół bez powiązania ze stanowiskiem.'});
  layoutWarnings(project).forEach(message => issues.push({area: 'layout', severity: 'warning', message}));
  return {project, issues};
}
