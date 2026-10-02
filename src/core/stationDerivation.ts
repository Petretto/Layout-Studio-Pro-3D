import type {Issue} from './validation';
import type {StationProjectV5} from './stationMigration';
import {parseStationProjectV5} from './stationProject';
import {runStationBalancing} from './stationBalancing';
import {applyStationResources} from './resources';
import {calculateTaktTime} from './algorithms/taktCalculator';
import {layoutWarnings} from './algorithms/layoutEngine';

/** Compute schema-5 results without replacing saved equipment or geometry.
 * Missing copies are reported so the editor can request an explicit decision.
 */
export function deriveStationProject(input: StationProjectV5) {
  const source = parseStationProjectV5(JSON.stringify(input));
  const target = calculateTaktTime(source.demand).taktTimeSeconds;
  const balancing = applyStationResources(runStationBalancing(source, target), source.workstationSettings);
  const layoutObjects = source.layoutObjects;
  const project = {...source, balancing, layoutObjects};
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
