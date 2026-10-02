import { LayoutObject, SpaghettiMetrics } from '../models/types';

export function calculateSpaghettiDiagram(
  layoutObjects: LayoutObject[],
  dailyDemand: number,
  shiftsPerDay: number,
  workingDaysPerYear = 250
): SpaghettiMetrics {
  const waypoints: { x: number; y: number; label: string }[] = [];

  // Sequence: MaterialIn -> Tables (in order) -> FinishedGoods
  const matIn = layoutObjects.find(o => o.type === 'MaterialIn');
  if (matIn) waypoints.push({ x: (matIn.xMm + matIn.widthMm/2) / 1000, y: (matIn.yMm + matIn.lengthMm/2) / 1000, label: 'Magazyn Wejściowy' });

  const tables = layoutObjects.filter(o => o.type === 'TableESD' || o.type === 'Table');
  tables.forEach(tbl => {
    waypoints.push({ x: (tbl.xMm + tbl.widthMm/2) / 1000, y: (tbl.yMm + tbl.lengthMm/2) / 1000, label: tbl.name });
  });

  const finGoods = layoutObjects.find(o => o.type === 'FinishedGoods');
  if (finGoods) waypoints.push({ x: (finGoods.xMm + finGoods.widthMm/2) / 1000, y: (finGoods.yMm + finGoods.lengthMm/2) / 1000, label: 'Wyrób Gotowy' });

  let cycleDistanceMeters = 0;
  for (let i = 0; i < waypoints.length - 1; i++) {
    const dx = waypoints[i + 1].x - waypoints[i].x;
    const dy = waypoints[i + 1].y - waypoints[i].y;
    cycleDistanceMeters += Math.sqrt(dx * dx + dy * dy);
  }

  // Geometric path only; no arbitrary multiplier or return-loop assumption.

  const partsPerShift = dailyDemand / Math.max(1, shiftsPerDay);
  const shiftDistanceKm = (cycleDistanceMeters * partsPerShift) / 1000.0;
  const annualDistanceKm = shiftDistanceKm * shiftsPerDay * workingDaysPerYear;

  let mudaRating: 'Doskonały' | 'Umiarkowany' | 'Wysoki Koszt Strat' = 'Doskonały';
  if (shiftDistanceKm > 8.0) mudaRating = 'Wysoki Koszt Strat';
  else if (shiftDistanceKm > 4.0) mudaRating = 'Umiarkowany';

  return {
    cycleDistanceMeters: Number(cycleDistanceMeters.toFixed(1)),
    shiftDistanceKm: Number(shiftDistanceKm.toFixed(2)),
    annualDistanceKm: Number(annualDistanceKm.toFixed(0)),
    mudaRating,
    waypoints
  };
}
