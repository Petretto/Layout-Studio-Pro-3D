import {parseProject} from './validation';
import {parseStationProjectV5} from './stationProject';
import {parseDomainProjectV6, type DomainProjectV6} from './domainProject';
import {scheduleWorkerRun, type TransportSimulationMode, type WorkerScheduleResult} from './workerSchedule';
import {explainThroughput} from './throughputExplanation';
import {calculateScheduleStateMetrics} from './scheduleStateMetrics';
import type {DomainDraftStoragePort} from './domainDraftStorage';

/** Isolated from active v4/v5 storage and the single active schema-6 draft key. */
export const DOMAIN_VARIANTS_STORAGE_KEY = 'layout-studio-domain-v6-variants-v1';
export const MAX_DOMAIN_VARIANTS = 20;

export type DomainVariantCategory = 'baseline' | 'additional-worker' | 'additional-station' | 'changed-layout';

export const domainVariantCategoryLabels: Record<DomainVariantCategory, string> = {
  baseline: 'Wariant bazowy',
  'additional-worker': 'Dodatkowy pracownik',
  'additional-station': 'Dodatkowe stanowisko',
  'changed-layout': 'Zmieniony layout',
};

export interface SavedDomainVariant {
  id: string;
  name: string;
  category: DomainVariantCategory;
  at: string;
  sourceSchemaVersion: 4 | 5;
  originalJson: string;
  project: DomainProjectV6;
}

export interface DomainVariantLibrarySave {
  kind: 'domain-variant-library';
  version: 1;
  variants: SavedDomainVariant[];
}

export type DomainVariantLibraryRead =
  | {status: 'empty'}
  | {status: 'valid'; raw: string; saved: DomainVariantLibrarySave}
  | {status: 'corrupt'; raw: string; error: string}
  | {status: 'unavailable'; error: string};

export type VariantCostCurrency = 'PLN' | 'EUR' | 'USD';
export type VariantCostBasis = 'confirmed' | 'assumed';
export type VariantCostAccountingMode = 'committed-makespan' | 'active-time';

export interface VariantCostAssumptions {
  currency: VariantCostCurrency;
  basis: VariantCostBasis;
  source: string;
  accountingMode?: VariantCostAccountingMode;
  operatorHourlyRate?: number | null;
  stationHourlyRate?: number | null;
  floorSqmRate?: number | null;
}

export interface VariantExperimentConditions {
  batch: number;
  arrivalIntervalSeconds: number;
  transportMode: TransportSimulationMode;
  costAssumptions?: VariantCostAssumptions | null;
}

export type VariantFactorDimension = 'process' | 'workers' | 'stations' | 'layout';

export interface VariantFactorDiff {
  changedDimensions: VariantFactorDimension[];
  summary: string[];
  comparabilityWarnings: string[];
}

export interface StaticVariantSummary {
  definedWorkersCount: number;
  teamWorkersCount: number;
  activeStationsCount: number;
  totalStationsCount: number;
  activeCopiesCount: number;
  totalCopiesCount: number;
  selectedWorkContentSeconds: number | null;
  maxStaticCopyLoadSeconds: number | null;
  staticCapacityPerHour: number | null;
  staticLoadBasis: string;
  declaredRoutesCount: number;
  totalRouteDistanceMm: number;
  targetLayoutType: DomainProjectV6['targetLayoutType'];
  layoutObjectsCount: number;
  hasLayoutObjects: boolean;
  facilityAreaSqm: number;
  objectsFootprintSqm: number;
  boundingBoxAreaSqm: number | null;
  deltaObjectsFootprintSqm: number | null;
  bomItemsCount: number;
  bomUnitCost: number | null;
  timeBasis: 'measured' | 'assumed' | 'mixed' | 'missing';
}

export interface VariantSingleCauseWaits {
  workers: number;
  transport: number;
  blocking: number;
  material: number;
  calendar: number;
  other: number;
  totalSingleCause: number;
}

export interface VariantCostEvaluation {
  currency: VariantCostCurrency;
  basis: VariantCostBasis;
  source: string;
  accountingMode: VariantCostAccountingMode;
  laborActiveHours: number;
  laborCommittedHours: number;
  laborActiveCost: number | null;
  laborCommittedCost: number | null;
  selectedLaborCost: number | null;
  stationOccupiedHours: number;
  stationCommittedHours: number;
  stationOccupiedCost: number | null;
  stationCommittedCost: number | null;
  selectedStationCost: number | null;
  batchOperatingCost: number | null;
  unitOperatingCost: number | null;
  deltaBatchOperatingCost: number | null;
  deltaUnitOperatingCost: number | null;
  objectsFootprintCost: number | null;
  deltaObjectsFootprintCost: number | null;
  facilityFloorCost: number | null;
  bomUnitCost: number | null;
  bomBatchCost: number | null;
}

export interface VariantDynamicCompleted {
  status: 'completed';
  makespanSeconds: number;
  deltaMakespanSeconds: number | null;
  throughputPerHour: number;
  deltaThroughputPerHour: number | null;
  averageLeadTimeSeconds: number;
  minLeadTimeSeconds: number;
  maxLeadTimeSeconds: number;
  deltaAverageLeadTimeSeconds: number | null;
  averageProcessingSpanSeconds: number;
  minProcessingSpanSeconds: number;
  maxProcessingSpanSeconds: number;
  deltaAverageProcessingSpanSeconds: number | null;
  netProcessingSeconds: number;
  netProcessingPerPieceSeconds: number;
  flowEfficiencyRatio: number;
  averageActiveWipPieces: number;
  maxActiveWipPieces: number;
  deltaAverageActiveWipPieces: number | null;
  averageSystemWipPieces: number;
  maxSystemWipPieces: number;
  deltaAverageSystemWipPieces: number | null;
  workerActiveSeconds: number;
  averageTeamWorkerUtilization: number;
  maxTeamWorkerUtilization: number;
  stationOccupiedSeconds: number;
  averageActiveCopyOccupancy: number;
  maxActiveCopyOccupancy: number;
  busiestCopy: {stationId: string; copy: number; seconds: number; share: number} | null;
  singleCauseWaitSeconds: VariantSingleCauseWaits;
  mixedWaitSeconds: number;
  unclassifiedWaitSeconds: number;
  blockedHoldSeconds: number;
  transportMovementsSeconds: number;
  transportMovementsCount: number;
  costEvaluation: VariantCostEvaluation | null;
  assumptions: string[];
}

export type VariantDynamicOutcome =
  | VariantDynamicCompleted
  | {status: 'error'; error: string};

export interface VariantComparisonRow {
  variantId: string;
  name: string;
  category: DomainVariantCategory;
  isBaseline: boolean;
  savedAt: string;
  staticSummary: StaticVariantSummary;
  factorDiff: VariantFactorDiff;
  dynamic: VariantDynamicOutcome;
}

export interface VariantComparisonReport {
  baselineVariantId: string;
  conditions: VariantExperimentConditions;
  rows: VariantComparisonRow[];
}

export type VariantScheduleOutcomeInput =
  | {status: 'completed'; result: WorkerScheduleResult}
  | {status: 'error'; error: string};

const round = (value: number) => Math.round((value + Number.EPSILON) * 1000) / 1000;
const roundCost = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;

function isCategory(value: unknown): value is DomainVariantCategory {
  return value === 'baseline' || value === 'additional-worker' || value === 'additional-station' || value === 'changed-layout';
}

function sourceVersion(originalJson: string): 4 | 5 {
  const raw: unknown = JSON.parse(originalJson);
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new Error('Niepoprawne źródło wariantu.');
  const version = (raw as {schemaVersion?: unknown}).schemaVersion;
  if (version === 4) parseProject(originalJson);
  else if (version === 5) parseStationProjectV5(originalJson);
  else throw new Error('Źródło wariantu musi mieć schemat 4 albo 5.');
  return version;
}

function parseVariantRecord(raw: unknown): SavedDomainVariant {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new Error('Niepoprawny rekord wariantu szkicu 6.');
  const item = raw as Record<string, unknown>;
  if (Object.keys(item).some(key => !['id', 'name', 'category', 'at', 'sourceSchemaVersion', 'originalJson', 'project'].includes(key))) {
    throw new Error('Rekord wariantu zawiera nieznane pole.');
  }
  if (typeof item.id !== 'string' || !item.id.trim() || typeof item.name !== 'string' || !item.name.trim() ||
      !isCategory(item.category) || typeof item.at !== 'string' || !Number.isFinite(Date.parse(item.at)) ||
      typeof item.originalJson !== 'string' || !item.project || typeof item.project !== 'object') {
    throw new Error('Niekompletny lub uszkodzony rekord wariantu szkicu 6.');
  }
  const version = sourceVersion(item.originalJson);
  if (item.sourceSchemaVersion !== version) throw new Error('Wersja źródła wariantu nie zgadza się z plikiem źródłowym.');
  return {
    id: item.id.trim(),
    name: item.name.trim(),
    category: item.category,
    at: item.at,
    sourceSchemaVersion: version,
    originalJson: item.originalJson,
    project: parseDomainProjectV6(JSON.stringify(item.project)),
  };
}

export function parseDomainVariantLibrary(raw: string): DomainVariantLibrarySave {
  const value: unknown = JSON.parse(raw);
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Niepoprawny zapis biblioteki wariantów.');
  const record = value as Record<string, unknown>;
  if (Object.keys(record).some(key => !['kind', 'version', 'variants'].includes(key)) ||
      record.kind !== 'domain-variant-library' || record.version !== 1 || !Array.isArray(record.variants) ||
      record.variants.length > MAX_DOMAIN_VARIANTS) {
    throw new Error('Nieznany format lub przekroczony limit 20 wariantów szkicu 6.');
  }
  const seen = new Set<string>();
  const variants = record.variants.map(entry => {
    const parsed = parseVariantRecord(entry);
    if (seen.has(parsed.id)) throw new Error(`Powtórzone ID wariantu: ${parsed.id}.`);
    seen.add(parsed.id);
    return parsed;
  });
  return {kind: 'domain-variant-library', version: 1, variants};
}

export function readDomainVariants(storage: Pick<DomainDraftStoragePort, 'getItem'>): DomainVariantLibraryRead {
  let raw: string | null;
  try { raw = storage.getItem(DOMAIN_VARIANTS_STORAGE_KEY); }
  catch (error) { return {status: 'unavailable', error: (error as Error).message}; }
  if (raw === null) return {status: 'empty'};
  try { return {status: 'valid', raw, saved: parseDomainVariantLibrary(raw)}; }
  catch (error) { return {status: 'corrupt', raw, error: (error as Error).message}; }
}

export function saveDomainVariant(
  storage: DomainDraftStoragePort,
  input: {
    id?: string;
    name: string;
    category: DomainVariantCategory;
    originalJson: string;
    project: DomainProjectV6;
    at?: string;
  },
  expectedRaw: string | null,
): {raw: string; saved: DomainVariantLibrarySave; variant: SavedDomainVariant} {
  const current = storage.getItem(DOMAIN_VARIANTS_STORAGE_KEY);
  if (current !== expectedRaw) {
    throw new Error('Biblioteka wariantów zmieniła się od ostatniego odczytu. Odśwież listę przed zapisem.');
  }
  const existing = current === null ? [] : parseDomainVariantLibrary(current).variants;
  if (existing.length >= MAX_DOMAIN_VARIANTS) {
    throw new Error(`Limit biblioteki wynosi ${MAX_DOMAIN_VARIANTS} wariantów.`);
  }
  const sourceSchemaVersion = sourceVersion(input.originalJson);
  const candidate = parseVariantRecord({
    id: input.id?.trim() || `VAR-${ existing.length + 1 }-${Date.now().toString(36)}`,
    name: input.name,
    category: input.category,
    at: input.at ?? new Date().toISOString(),
    sourceSchemaVersion,
    originalJson: input.originalJson,
    project: input.project,
  });
  if (existing.some(item => item.id === candidate.id)) {
    throw new Error(`Wariant o ID ${candidate.id} już istnieje.`);
  }
  if (existing.length > 0 && existing[0].originalJson !== candidate.originalJson) {
    throw new Error('Zapisane warianty należą do innego projektu źródłowego 4/5. Wyeksportuj i wyczyść bibliotekę przed zapisem wariantów nowego projektu.');
  }
  const saved = parseDomainVariantLibrary(JSON.stringify({
    kind: 'domain-variant-library',
    version: 1,
    variants: [...existing, candidate],
  }));
  const raw = JSON.stringify(saved);
  storage.setItem(DOMAIN_VARIANTS_STORAGE_KEY, raw);
  return {raw, saved, variant: saved.variants[saved.variants.length - 1]};
}

export function deleteDomainVariant(
  storage: DomainDraftStoragePort,
  variantId: string,
  expectedRaw: string,
): {raw: string; saved: DomainVariantLibrarySave} {
  const current = storage.getItem(DOMAIN_VARIANTS_STORAGE_KEY);
  if (current === null || current !== expectedRaw) {
    throw new Error('Biblioteka wariantów zmieniła się od ostatniego odczytu. Odśwież listę przed usunięciem.');
  }
  const existing = parseDomainVariantLibrary(current).variants;
  const filtered = existing.filter(item => item.id !== variantId);
  if (filtered.length === existing.length) {
    throw new Error(`Nie znaleziono wariantu ${variantId}.`);
  }
  const saved = parseDomainVariantLibrary(JSON.stringify({
    kind: 'domain-variant-library',
    version: 1,
    variants: filtered,
  }));
  const raw = JSON.stringify(saved);
  storage.setItem(DOMAIN_VARIANTS_STORAGE_KEY, raw);
  return {raw, saved};
}

export function replaceDomainVariants(
  storage: DomainDraftStoragePort,
  variants: SavedDomainVariant[],
  expectedRaw: string,
): {raw: string; saved: DomainVariantLibrarySave} {
  const current = storage.getItem(DOMAIN_VARIANTS_STORAGE_KEY);
  if (current === null || current !== expectedRaw) {
    throw new Error('Zapis biblioteki wariantów zmienił się od pobrania kopii odzyskiwania.');
  }
  const saved = parseDomainVariantLibrary(JSON.stringify({
    kind: 'domain-variant-library',
    version: 1,
    variants,
  }));
  const raw = JSON.stringify(saved);
  storage.setItem(DOMAIN_VARIANTS_STORAGE_KEY, raw);
  return {raw, saved};
}

/** Verify source identity before restoring a variant snapshot into the active draft. */
export function prepareVariantForDraftRestore(variant: SavedDomainVariant, currentOriginalJson: string): DomainProjectV6 {
  if (variant.originalJson !== currentOriginalJson) {
    throw new Error('Wariant pochodzi z innego źródła 4/5 niż aktywny szkic 6. Nie można połączyć niezgodnych projektów.');
  }
  return parseDomainProjectV6(JSON.stringify(variant.project));
}

function computeLayoutSurfaceMetrics(project: DomainProjectV6): {
  hasLayoutObjects: boolean;
  facilityAreaSqm: number;
  objectsFootprintSqm: number;
  boundingBoxAreaSqm: number | null;
} {
  const facilityAreaSqm = round((project.facility.widthMm * project.facility.lengthMm) / 1_000_000);
  const objects = project.layoutObjects;
  if (objects.length === 0) {
    return {
      hasLayoutObjects: false,
      facilityAreaSqm,
      objectsFootprintSqm: 0,
      boundingBoxAreaSqm: null,
    };
  }
  let footprintMm2 = 0;
  let minX = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;
  for (const obj of objects) {
    footprintMm2 += obj.widthMm * obj.lengthMm;
    const rad = (Math.abs(obj.rotationDeg || 0) * Math.PI) / 180;
    const cos = Math.abs(Math.cos(rad));
    const sin = Math.abs(Math.sin(rad));
    const halfSpanX = (obj.widthMm * cos + obj.lengthMm * sin) / 2;
    const halfSpanY = (obj.widthMm * sin + obj.lengthMm * cos) / 2;
    minX = Math.min(minX, obj.xMm - halfSpanX);
    maxX = Math.max(maxX, obj.xMm + halfSpanX);
    minY = Math.min(minY, obj.yMm - halfSpanY);
    maxY = Math.max(maxY, obj.yMm + halfSpanY);
  }
  return {
    hasLayoutObjects: true,
    facilityAreaSqm,
    objectsFootprintSqm: round(footprintMm2 / 1_000_000),
    boundingBoxAreaSqm: round(((maxX - minX) * (maxY - minY)) / 1_000_000),
  };
}

function maxConcurrentIntervals(intervals: readonly {start: number; end: number}[]): number {
  const events: {t: number; delta: number}[] = [];
  for (const item of intervals) {
    if (item.end > item.start) {
      events.push({t: item.start, delta: 1});
      events.push({t: item.end, delta: -1});
    }
  }
  events.sort((a, b) => (a.t !== b.t ? a.t - b.t : a.delta - b.delta));
  let current = 0;
  let max = 0;
  for (const ev of events) {
    current += ev.delta;
    if (current > max) max = current;
  }
  return max;
}

export function summarizeStaticVariant(project: DomainProjectV6): StaticVariantSummary {
  const definedWorkersCount = project.workers.length;
  const teamWorkersCount = project.workerRunSelection?.teamWorkerIds.length ?? 0;
  const totalStationsCount = project.stations.length;
  const routedStations = new Set(
    (project.stationRouting?.operations ?? []).flatMap(op => op.candidates.map(c => c.stationId)),
  );
  const assignedStations = new Set(
    project.stations.filter(s => s.operationIds.length > 0).map(s => s.id),
  );
  const activeStationIds = assignedStations.size > 0 ? assignedStations : routedStations;
  const activeStationsCount = activeStationIds.size;
  const copiesOf = (stationId: string) => project.stationSettings[stationId]?.parallelStations ?? 1;
  const totalCopiesCount = project.stations.reduce((sum, s) => sum + copiesOf(s.id), 0);
  const activeCopiesCount = [...activeStationIds].reduce((sum, id) => sum + copiesOf(id), 0);

  let selectedWorkContentSeconds: number | null = 0;
  const bases = new Set<'measured' | 'assumed'>();
  const durationByOp = new Map<string, number>();

  for (const op of project.operations) {
    const choice = project.workerRunSelection?.operations.find(item => item.operationId === op.id);
    const variant = choice
      ? op.staffing?.timeVariants.find(item => item.workerCount === choice.workerCount)
      : undefined;
    if (!variant) {
      selectedWorkContentSeconds = null;
      continue;
    }
    if (selectedWorkContentSeconds !== null) {
      selectedWorkContentSeconds = round(selectedWorkContentSeconds + variant.timeProfile.durationSeconds);
    }
    durationByOp.set(op.id, variant.timeProfile.durationSeconds);
    bases.add(variant.timeProfile.durationBasis);
  }

  let maxStaticCopyLoadSeconds: number | null = null;
  let staticCapacityPerHour: number | null = null;
  let staticLoadBasis = 'Brak pełnego wyboru wariantów obsady.';
  if (selectedWorkContentSeconds !== null) {
    const copyLoads = new Map<string, number>();
    let hasMultipleCandidates = false;
    for (const op of project.operations) {
      const duration = durationByOp.get(op.id)!;
      const routed = project.stationRouting?.operations.find(item => item.operationId === op.id)?.candidates;
      if (routed && routed.length > 0) {
        if (routed.length > 1) hasMultipleCandidates = true;
        const first = routed[0];
        const key = `${first.stationId}:${first.copy}`;
        copyLoads.set(key, round((copyLoads.get(key) ?? 0) + duration));
      } else {
        const station = project.stations.find(item => item.operationIds.includes(op.id));
        if (station) {
          const copies = copiesOf(station.id);
          if (copies > 1) hasMultipleCandidates = true;
          const key = `${station.id}:1`;
          copyLoads.set(key, round((copyLoads.get(key) ?? 0) + round(duration / copies)));
        }
      }
    }
    maxStaticCopyLoadSeconds = copyLoads.size > 0 ? Math.max(...copyLoads.values()) : 0;
    staticCapacityPerHour = maxStaticCopyLoadSeconds !== null && maxStaticCopyLoadSeconds > 0
      ? round(3600 / maxStaticCopyLoadSeconds)
      : null;
    staticLoadBasis = hasMultipleCandidates
      ? 'Wiele dopuszczonych kopii — rzeczywisty podział wyznacza harmonogram.'
      : 'Statyczna suma czasów technologicznych na kopię [s/szt.] — nie jest dowodem przepustowości.';
  }

  const routes = project.stationRouting?.routes ?? [];
  const declaredRoutesCount = routes.length;
  const totalRouteDistanceMm = round(routes.reduce((sum, r) => sum + r.distanceMm, 0));
  const timeBasis = bases.size === 0 ? 'missing' : bases.size === 1 ? [...bases][0] : 'mixed';
  const surface = computeLayoutSurfaceMetrics(project);
  const bomItemsCount = project.bom.length;
  const bomUnitCost = bomItemsCount > 0
    ? roundCost(project.bom.reduce((sum, item) => sum + item.quantityPerUnit * item.unitCost, 0))
    : null;

  return {
    definedWorkersCount,
    teamWorkersCount,
    activeStationsCount,
    totalStationsCount,
    activeCopiesCount,
    totalCopiesCount,
    selectedWorkContentSeconds,
    maxStaticCopyLoadSeconds,
    staticCapacityPerHour,
    staticLoadBasis,
    declaredRoutesCount,
    totalRouteDistanceMm,
    targetLayoutType: project.targetLayoutType,
    layoutObjectsCount: project.layoutObjects.length,
    hasLayoutObjects: surface.hasLayoutObjects,
    facilityAreaSqm: surface.facilityAreaSqm,
    objectsFootprintSqm: surface.objectsFootprintSqm,
    boundingBoxAreaSqm: surface.boundingBoxAreaSqm,
    deltaObjectsFootprintSqm: null,
    bomItemsCount,
    bomUnitCost,
    timeBasis,
  };
}

export function inspectVariantFactors(
  baseline: DomainProjectV6,
  candidate: DomainProjectV6,
  category: DomainVariantCategory,
  isBaseline: boolean,
): VariantFactorDiff {
  const changedDimensions: VariantFactorDimension[] = [];
  const summary: string[] = [];
  const comparabilityWarnings: string[] = [];

  // 1. Process definition & demand (operation graph, timeVariants, product/subassemblies, demand)
  const processSignature = (p: DomainProjectV6) => JSON.stringify({
    demand: p.demand,
    product: p.product,
    subassemblies: p.subassemblies,
    operations: p.operations.map(op => ({
      id: op.id,
      standardTimeSeconds: op.standardTimeSeconds,
      vaTimeSeconds: op.vaTimeSeconds,
      nvaTimeSeconds: op.nvaTimeSeconds,
      predecessorIds: op.predecessorIds,
      timeProfile: op.timeProfile,
      staffing: op.staffing,
      physicalRole: op.physicalRole,
    })),
  });
  if (processSignature(baseline) !== processSignature(candidate)) {
    changedDimensions.push('process');
    summary.push('Zmieniono definicję operacji, wariantów czasu, ról fizycznych lub popytu');
    comparabilityWarnings.push(
      'Zmieniono definicję procesu, zadeklarowane warianty czasu lub popyt względem wariantu bazowego.',
    );
  }

  // 2. Workers & staffing selections
  const workersSignature = (p: DomainProjectV6) => JSON.stringify({
    workers: p.workers,
    workerPools: p.workerPools,
    workerRunSelection: p.workerRunSelection,
    competencyRequirements: p.competencyRequirements,
    workerCalendars: p.resourceCalendars?.workers,
  });
  if (workersSignature(baseline) !== workersSignature(candidate)) {
    changedDimensions.push('workers');
    const baseTeam = baseline.workerRunSelection?.teamWorkerIds ?? [];
    const candTeam = candidate.workerRunSelection?.teamWorkerIds ?? [];
    if (JSON.stringify(baseTeam) !== JSON.stringify(candTeam) || baseline.workers.length !== candidate.workers.length) {
      summary.push(`Obsada zespołu: ${baseTeam.length} → ${candTeam.length} osób (rejestr: ${baseline.workers.length} → ${candidate.workers.length})`);
    }
    const baseOpChoices = JSON.stringify(baseline.workerRunSelection?.operations ?? []);
    const candOpChoices = JSON.stringify(candidate.workerRunSelection?.operations ?? []);
    if (baseOpChoices !== candOpChoices) {
      summary.push('Zmieniono wybraną liczebność lub listę dopuszczonych osób dla operacji');
    }
    if (JSON.stringify(baseline.competencyRequirements) !== JSON.stringify(candidate.competencyRequirements)) {
      summary.push('Zmieniono wymagania lub przypisania kompetencji');
    }
    if (JSON.stringify(baseline.resourceCalendars?.workers) !== JSON.stringify(candidate.resourceCalendars?.workers)) {
      summary.push('Zmieniono kalendarze pracowników');
    }
  }

  const copySet = (p: DomainProjectV6) => {
    const set = new Set<string>();
    for (const st of p.stations) {
      const count = p.stationSettings[st.id]?.parallelStations ?? 1;
      for (let c = 1; c <= count; c++) set.add(`${st.id}:${c}`);
    }
    return set;
  };
  const baseCopies = copySet(baseline);
  const candCopies = copySet(candidate);
  const isSharedCopyRoute = (r: NonNullable<DomainProjectV6['stationRouting']>['routes'][number]) => {
    const fromKey = `${r.from.stationId}:${r.from.copy}`;
    const toKey = `${r.to.stationId}:${r.to.copy}`;
    return baseCopies.has(fromKey) && baseCopies.has(toKey) && candCopies.has(fromKey) && candCopies.has(toKey);
  };

  // 3. Stations, parallel copies, candidate assignments, equipment & buffers
  const stationsSignature = (p: DomainProjectV6) => JSON.stringify({
    stations: p.stations,
    stationSettings: p.stationSettings,
    operationLock: p.operations.map(op => ({id: op.id, lockedWorkstation: op.lockedWorkstation})),
    routingOperations: p.stationRouting?.operations,
    equipment: p.equipment,
    equipmentPlacements: p.stationRouting?.equipmentPlacements,
    stationBuffers: p.stationBuffers,
    stationCalendars: p.resourceCalendars?.stations,
  });
  if (stationsSignature(baseline) !== stationsSignature(candidate)) {
    changedDimensions.push('stations');
    const baseStatic = summarizeStaticVariant(baseline);
    const candStatic = summarizeStaticVariant(candidate);
    if (baseStatic.totalStationsCount !== candStatic.totalStationsCount ||
        baseStatic.activeStationsCount !== candStatic.activeStationsCount ||
        baseStatic.totalCopiesCount !== candStatic.totalCopiesCount) {
      summary.push(
        `Stanowiska aktywne: ${baseStatic.activeStationsCount}/${baseStatic.totalStationsCount} → ${candStatic.activeStationsCount}/${candStatic.totalStationsCount}, kopie: ${baseStatic.totalCopiesCount} → ${candStatic.totalCopiesCount}`,
      );
    }
    if (JSON.stringify(baseline.stations) !== JSON.stringify(candidate.stations) ||
        JSON.stringify(baseline.stationRouting?.operations) !== JSON.stringify(candidate.stationRouting?.operations)) {
      summary.push('Zmieniono przypisania operacji lub dopuszczone kopie stanowisk');
    }
    if (JSON.stringify(baseline.equipment) !== JSON.stringify(candidate.equipment) ||
        JSON.stringify(baseline.stationRouting?.equipmentPlacements) !== JSON.stringify(candidate.stationRouting?.equipmentPlacements)) {
      summary.push('Zmieniono wyposażenie technologiczne lub jego rozmieszczenie na kopiach');
    }
    if (JSON.stringify(baseline.stationBuffers) !== JSON.stringify(candidate.stationBuffers)) {
      summary.push('Zmieniono pojemności lub polityki buforów stanowisk');
    }
    if (JSON.stringify(baseline.resourceCalendars?.stations) !== JSON.stringify(candidate.resourceCalendars?.stations)) {
      summary.push('Zmieniono kalendarze stanowisk');
    }
  }

  // 4. Layout, routes, transport & supply
  const layoutSignature = (p: DomainProjectV6) => JSON.stringify({
    targetLayoutType: p.targetLayoutType,
    facility: p.facility,
    obstacles: p.obstacles,
    layoutObjects: p.layoutObjects,
    routes: (p.stationRouting?.routes ?? []).filter(isSharedCopyRoute),
    selectionRule: p.stationRouting?.selectionRule,
    assemblyTransport: p.assemblyTransport,
    materialNetwork: p.materialNetwork,
    materialSupply: p.materialSupply,
    subassemblyFlow: p.subassemblyFlow,
    bodyRunInput: p.bodyRunInput,
  });
  if (layoutSignature(baseline) !== layoutSignature(candidate)) {
    changedDimensions.push('layout');
    const baseRoutes = (baseline.stationRouting?.routes ?? []).filter(isSharedCopyRoute);
    const candRoutes = (candidate.stationRouting?.routes ?? []).filter(isSharedCopyRoute);
    if (JSON.stringify(baseRoutes) !== JSON.stringify(candRoutes)) {
      const baseDist = round(baseRoutes.reduce((s, r) => s + r.distanceMm, 0));
      const candDist = round(candRoutes.reduce((s, r) => s + r.distanceMm, 0));
      summary.push(`Trasy transportowe: ${baseRoutes.length} (${baseDist} mm) → ${candRoutes.length} (${candDist} mm)`);
    }
    if (baseline.targetLayoutType !== candidate.targetLayoutType ||
        JSON.stringify(baseline.layoutObjects) !== JSON.stringify(candidate.layoutObjects) ||
        JSON.stringify(baseline.facility) !== JSON.stringify(candidate.facility)) {
      summary.push(`Układ hali / obiekty: ${baseline.targetLayoutType} (${baseline.layoutObjects.length} ob.) → ${candidate.targetLayoutType} (${candidate.layoutObjects.length} ob.)`);
    }
    if (JSON.stringify(baseline.assemblyTransport) !== JSON.stringify(candidate.assemblyTransport)) {
      summary.push('Zmieniono zasoby lub puste trasy transportu montażowego');
    }
    if (JSON.stringify(baseline.materialSupply) !== JSON.stringify(candidate.materialSupply) ||
        JSON.stringify(baseline.subassemblyFlow) !== JSON.stringify(candidate.subassemblyFlow)) {
      summary.push('Zmieniono harmonogram zaopatrzenia lub przepływ partii podzespołów');
    }
    if (JSON.stringify(baseline.bodyRunInput) !== JSON.stringify(candidate.bodyRunInput)) {
      summary.push('Zmieniono początkową konfigurację korpusów przebiegu');
    }
  }

  if (isBaseline) {
    return {
      changedDimensions,
      summary: ['Punkt odniesienia porównania (wariant bazowy)'],
      comparabilityWarnings,
    };
  }

  if (changedDimensions.length === 0) {
    summary.push('Brak różnic w zapisanych danych względem wariantu bazowego');
    comparabilityWarnings.push('Wariant ma identyczne dane jak wariant bazowy.');
    return {changedDimensions, summary, comparabilityWarnings};
  }

  const expectedByCategory: Partial<Record<DomainVariantCategory, VariantFactorDimension>> = {
    'additional-worker': 'workers',
    'additional-station': 'stations',
    'changed-layout': 'layout',
  };
  const expected = expectedByCategory[category];
  if (expected && !changedDimensions.includes(expected)) {
    comparabilityWarnings.push(
      `Wariant oznaczono jako „${domainVariantCategoryLabels[category]}”, ale nie wykryto zmiany w tym obszarze względem bazy.`,
    );
  }
  const extraDimensions = changedDimensions.filter(dim => dim !== expected && dim !== 'process');
  if (expected && extraDimensions.length > 0) {
    const labels: Record<VariantFactorDimension, string> = {
      process: 'proces/czasy',
      workers: 'obsada/pracownicy',
      stations: 'stanowiska/kopie',
      layout: 'layout/trasy/transport',
    };
    comparabilityWarnings.push(
      `Poza deklarowanym czynnikiem („${domainVariantCategoryLabels[category]}”) zmieniono także: ${extraDimensions.map(d => labels[d]).join(', ')}.`,
    );
  }

  return {changedDimensions, summary, comparabilityWarnings};
}

function collectRunAssumptions(
  project: DomainProjectV6,
  result: WorkerScheduleResult,
  conditions: VariantExperimentConditions,
): string[] {
  const assumptions: string[] = [];
  if (conditions.transportMode === 'just-in-time' || result.transportMode === 'just-in-time') {
    assumptions.push('JIT: pominięto trasy i zasoby transportu oraz założono dostępność materiałów');
  }
  const hasAssumedOpTime = project.operations.some(op => {
    const choice = project.workerRunSelection?.operations.find(item => item.operationId === op.id);
    const variant = choice ? op.staffing?.timeVariants.find(v => v.workerCount === choice.workerCount) : undefined;
    return variant?.timeProfile.durationBasis === 'assumed';
  });
  if (hasAssumedOpTime) {
    assumptions.push('Czasy operacji zawierają wartości założone (niepomiarowe)');
  }
  if (conditions.transportMode === 'configured') {
    const hasAssumedTransport = result.runs.some(run => run.transport?.basis === 'assumed') ||
      (project.stationRouting?.routes ?? []).some(route =>
        route.transportTime?.basis === 'assumed' ||
        route.transportCalculation?.speed.basis === 'assumed' ||
        route.transportCalculation?.loading.basis === 'assumed' ||
        route.transportCalculation?.unloading.basis === 'assumed');
    if (hasAssumedTransport) {
      assumptions.push('Trasy lub czasy transportu zawierają wartości założone');
    }
  }
  if (project.resourceCalendars) {
    const allWindows = [
      ...Object.values(project.resourceCalendars.workers).flatMap(c => [...c.shifts, ...c.breaks]),
      ...Object.values(project.resourceCalendars.stations).flatMap(c => [...c.shifts, ...c.breaks]),
    ];
    if (allWindows.some(w => w.basis === 'assumed')) {
      assumptions.push('Kalendarze zmian/przerw zawierają przedziały założone');
    }
  }
  if (conditions.costAssumptions) {
    const ca = conditions.costAssumptions;
    const basisLabel = ca.basis === 'confirmed' ? 'potwierdzone' : 'założone';
    const modeLabel = (ca.accountingMode ?? 'committed-makespan') === 'committed-makespan'
      ? 'zaangażowanie zasobów w horyzoncie makespanu'
      : 'wyłącznie czas aktywnej pracy/zajętości';
    assumptions.push(`Stawki kosztowe (${ca.currency}, ${basisLabel}, ${modeLabel}): ${ca.source}`);
  }
  return assumptions;
}

export function validateCostAssumptions(cost?: VariantCostAssumptions | null): VariantCostAssumptions | null {
  if (!cost) return null;
  const hasOperatorRate = cost.operatorHourlyRate !== undefined && cost.operatorHourlyRate !== null;
  const hasStationRate = cost.stationHourlyRate !== undefined && cost.stationHourlyRate !== null;
  const hasFloorRate = cost.floorSqmRate !== undefined && cost.floorSqmRate !== null;
  const trimmedSource = typeof cost.source === 'string' ? cost.source.trim() : '';

  if (!hasOperatorRate && !hasStationRate && !hasFloorRate && !trimmedSource) {
    return null;
  }
  if (cost.currency !== 'PLN' && cost.currency !== 'EUR' && cost.currency !== 'USD') {
    throw new Error('Koszty wariantów: waluta musi być jedną z wartości PLN, EUR albo USD.');
  }
  if (cost.basis !== 'confirmed' && cost.basis !== 'assumed') {
    throw new Error('Koszty wariantów: podstawa stawek musi być określona jako confirmed albo assumed.');
  }
  const accountingMode: VariantCostAccountingMode = cost.accountingMode ?? 'committed-makespan';
  if (accountingMode !== 'committed-makespan' && accountingMode !== 'active-time') {
    throw new Error('Koszty wariantów: nieznany tryb rozliczania czasu zasobów.');
  }
  if (!hasOperatorRate && !hasStationRate && !hasFloorRate) {
    throw new Error('Koszty wariantów: podaj co najmniej jedną jawną stawkę (operatora, stanowiska lub powierzchni).');
  }
  if (!trimmedSource) {
    throw new Error('Koszty wariantów: podaj jawne źródło lub opis założeń dla wprowadzonych stawek kosztowych.');
  }
  const checkNonNegative = (val: number | null | undefined, label: string): number | null => {
    if (val === undefined || val === null) return null;
    if (!Number.isFinite(val) || val < 0) {
      throw new Error(`Koszty wariantów: stawka „${label}” musi być nieujemną liczbą skończoną.`);
    }
    return roundCost(val);
  };
  return {
    currency: cost.currency,
    basis: cost.basis,
    source: trimmedSource,
    accountingMode,
    operatorHourlyRate: checkNonNegative(cost.operatorHourlyRate, 'stawka godzinowa operatora'),
    stationHourlyRate: checkNonNegative(cost.stationHourlyRate, 'stawka godzinowa stanowiska'),
    floorSqmRate: checkNonNegative(cost.floorSqmRate, 'stawka powierzchni m²'),
  };
}

export function validateExperimentConditions(conditions: VariantExperimentConditions): VariantExperimentConditions {
  if (!Number.isSafeInteger(conditions.batch) || conditions.batch < 1 || conditions.batch > 10000) {
    throw new Error('Warunki eksperymentu: partia musi być liczbą całkowitą od 1 do 10000 sztuk.');
  }
  if (!Number.isFinite(conditions.arrivalIntervalSeconds) || conditions.arrivalIntervalSeconds <= 0) {
    throw new Error('Warunki eksperymentu: odstęp przybycia sztuk musi być dodatnią liczbą sekund.');
  }
  if (conditions.transportMode !== 'configured' && conditions.transportMode !== 'just-in-time') {
    throw new Error('Warunki eksperymentu: nieznany tryb transportu.');
  }
  const checkedCosts = validateCostAssumptions(conditions.costAssumptions);
  return {
    batch: conditions.batch,
    arrivalIntervalSeconds: conditions.arrivalIntervalSeconds,
    transportMode: conditions.transportMode,
    ...(checkedCosts ? {costAssumptions: checkedCosts} : {}),
  };
}

function evaluateVariantCosts(
  costAssumptions: VariantCostAssumptions | null,
  batch: number,
  makespanSeconds: number,
  staticSummary: StaticVariantSummary,
  workerActiveSeconds: number,
  stationOccupiedSeconds: number,
): VariantCostEvaluation | null {
  if (!costAssumptions) return null;
  const accountingMode: VariantCostAccountingMode = costAssumptions.accountingMode ?? 'committed-makespan';
  const makespanHours = makespanSeconds / 3600;
  const laborActiveHours = round(workerActiveSeconds / 3600);
  const laborCommittedHours = round(staticSummary.teamWorkersCount * makespanHours);
  const stationOccupiedHours = round(stationOccupiedSeconds / 3600);
  const stationCommittedHours = round(staticSummary.activeCopiesCount * makespanHours);

  const opRate = costAssumptions.operatorHourlyRate ?? null;
  const stRate = costAssumptions.stationHourlyRate ?? null;
  const sqRate = costAssumptions.floorSqmRate ?? null;

  const laborActiveCost = opRate !== null ? roundCost(laborActiveHours * opRate) : null;
  const laborCommittedCost = opRate !== null ? roundCost(laborCommittedHours * opRate) : null;
  const selectedLaborCost = accountingMode === 'committed-makespan' ? laborCommittedCost : laborActiveCost;

  const stationOccupiedCost = stRate !== null ? roundCost(stationOccupiedHours * stRate) : null;
  const stationCommittedCost = stRate !== null ? roundCost(stationCommittedHours * stRate) : null;
  const selectedStationCost = accountingMode === 'committed-makespan' ? stationCommittedCost : stationOccupiedCost;

  const hasOperatingRate = selectedLaborCost !== null || selectedStationCost !== null;
  const batchOperatingCost = hasOperatingRate
    ? roundCost((selectedLaborCost ?? 0) + (selectedStationCost ?? 0))
    : null;
  const unitOperatingCost = batchOperatingCost !== null && batch > 0
    ? roundCost(batchOperatingCost / batch)
    : null;

  const objectsFootprintCost = sqRate !== null && staticSummary.hasLayoutObjects
    ? roundCost(staticSummary.objectsFootprintSqm * sqRate)
    : null;
  const facilityFloorCost = sqRate !== null
    ? roundCost(staticSummary.facilityAreaSqm * sqRate)
    : null;

  const bomUnitCost = staticSummary.bomUnitCost;
  const bomBatchCost = bomUnitCost !== null ? roundCost(bomUnitCost * batch) : null;

  return {
    currency: costAssumptions.currency,
    basis: costAssumptions.basis,
    source: costAssumptions.source,
    accountingMode,
    laborActiveHours,
    laborCommittedHours,
    laborActiveCost,
    laborCommittedCost,
    selectedLaborCost,
    stationOccupiedHours,
    stationCommittedHours,
    stationOccupiedCost,
    stationCommittedCost,
    selectedStationCost,
    batchOperatingCost,
    unitOperatingCost,
    deltaBatchOperatingCost: null,
    deltaUnitOperatingCost: null,
    objectsFootprintCost,
    deltaObjectsFootprintCost: null,
    facilityFloorCost,
    bomUnitCost,
    bomBatchCost,
  };
}

/** Build a comparison report from variant snapshots and their schedule outcomes under shared conditions. */
export function buildVariantComparisonReport(
  variants: readonly SavedDomainVariant[],
  baselineVariantId: string,
  conditions: VariantExperimentConditions,
  outcomesByVariantId: ReadonlyMap<string, VariantScheduleOutcomeInput>,
): VariantComparisonReport {
  const checkedConditions = validateExperimentConditions(conditions);
  if (variants.length < 2) {
    throw new Error('Porównanie wymaga co najmniej dwóch zapisanych wariantów szkicu 6.');
  }
  const baseline = variants.find(item => item.id === baselineVariantId);
  if (!baseline) {
    throw new Error('Wskazany wariant bazowy nie należy do zestawu porównywanych wariantów.');
  }
  const sourceJson = baseline.originalJson;
  if (variants.some(item => item.originalJson !== sourceJson)) {
    throw new Error('Porównywane warianty muszą pochodzić z tego samego projektu źródłowego 4/5.');
  }

  const summarizeOutcome = (
    variant: SavedDomainVariant,
    staticSummary: StaticVariantSummary,
    outcome: VariantScheduleOutcomeInput,
  ): VariantDynamicOutcome => {
    if (outcome.status === 'error') {
      return {status: 'error', error: outcome.error};
    }
    const explanation = explainThroughput(outcome.result);
    const stateMetrics = calculateScheduleStateMetrics(variant.project, outcome.result);
    const byCategory = new Map(explanation.signals.map(s => [s.category, s]));
    const single = (cat: 'workers' | 'transport' | 'blocking' | 'material' | 'calendar' | 'other') =>
      byCategory.get(cat)?.singleCauseWaitSeconds ?? 0;
    const singleCauseWaitSeconds: VariantSingleCauseWaits = {
      workers: single('workers'),
      transport: single('transport'),
      blocking: single('blocking'),
      material: single('material'),
      calendar: single('calendar'),
      other: single('other'),
      totalSingleCause: round(
        single('workers') + single('transport') + single('blocking') +
        single('material') + single('calendar') + single('other'),
      ),
    };
    const makespanSeconds = explanation.horizonSeconds;
    const throughputPerHour = makespanSeconds > 0 ? round((checkedConditions.batch / makespanSeconds) * 3600) : 0;

    // Lead times & processing spans per piece (job)
    const jobs = outcome.result.jobs;
    const leadTimes = jobs.map(job => Math.max(0, job.finish - job.arrival));
    const averageLeadTimeSeconds = leadTimes.length > 0
      ? round(leadTimes.reduce((sum, v) => sum + v, 0) / leadTimes.length)
      : 0;
    const minLeadTimeSeconds = leadTimes.length > 0 ? round(Math.min(...leadTimes)) : 0;
    const maxLeadTimeSeconds = leadTimes.length > 0 ? round(Math.max(...leadTimes)) : 0;

    const activeIntervals: {start: number; end: number}[] = [];
    const systemIntervals: {start: number; end: number}[] = [];
    const processingSpans: number[] = [];

    for (const job of jobs) {
      const firstStart = job.starts.length > 0 ? Math.min(...job.starts) : job.arrival;
      const span = Math.max(0, job.finish - firstStart);
      processingSpans.push(span);
      activeIntervals.push({start: firstStart, end: job.finish});
      systemIntervals.push({start: job.arrival, end: job.finish});
    }

    const averageProcessingSpanSeconds = processingSpans.length > 0
      ? round(processingSpans.reduce((sum, v) => sum + v, 0) / processingSpans.length)
      : 0;
    const minProcessingSpanSeconds = processingSpans.length > 0 ? round(Math.min(...processingSpans)) : 0;
    const maxProcessingSpanSeconds = processingSpans.length > 0 ? round(Math.max(...processingSpans)) : 0;

    const netProcessingSeconds = byCategory.get('processing')?.workSeconds ?? 0;
    const netProcessingPerPieceSeconds = checkedConditions.batch > 0
      ? round(netProcessingSeconds / checkedConditions.batch)
      : 0;
    const flowEfficiencyRatio = averageProcessingSpanSeconds > 0
      ? round(Math.min(1, netProcessingPerPieceSeconds / averageProcessingSpanSeconds))
      : 0;

    // WIP (whole pieces in [0, makespanSeconds])
    const totalActivePieceSeconds = processingSpans.reduce((sum, v) => sum + v, 0);
    const totalSystemPieceSeconds = leadTimes.reduce((sum, v) => sum + v, 0);
    const averageActiveWipPieces = makespanSeconds > 0 ? round(totalActivePieceSeconds / makespanSeconds) : 0;
    const maxActiveWipPieces = maxConcurrentIntervals(activeIntervals);
    const averageSystemWipPieces = makespanSeconds > 0 ? round(totalSystemPieceSeconds / makespanSeconds) : 0;
    const maxSystemWipPieces = maxConcurrentIntervals(systemIntervals);

    // Staffing & Station Utilization from ScheduleStateSummary
    const teamWorkerIdSet = new Set(variant.project.workerRunSelection?.teamWorkerIds ?? []);
    const teamWorkerMetrics = teamWorkerIdSet.size > 0
      ? stateMetrics.workers.filter(w => teamWorkerIdSet.has(w.workerId))
      : stateMetrics.workers;
    const workerActiveSeconds = round(
      teamWorkerMetrics.reduce((sum, w) => sum + w.totalActiveTimeSeconds, 0),
    );
    const averageTeamWorkerUtilization = teamWorkerMetrics.length > 0 && makespanSeconds > 0
      ? round(Math.min(1, workerActiveSeconds / (teamWorkerMetrics.length * makespanSeconds)))
      : 0;
    const maxTeamWorkerUtilization = teamWorkerMetrics.length > 0
      ? round(Math.max(...teamWorkerMetrics.map(w => w.activityRatio)))
      : 0;

    const routedStationIds = new Set(
      (variant.project.stationRouting?.operations ?? []).flatMap(op => op.candidates.map(c => c.stationId)),
    );
    const assignedStationIds = new Set(
      variant.project.stations.filter(s => s.operationIds.length > 0).map(s => s.id),
    );
    const activeStationIdSet = assignedStationIds.size > 0 ? assignedStationIds : routedStationIds;
    const activeCopyMetrics = stateMetrics.stations.filter(
      st => activeStationIdSet.has(st.stationId) || st.operationsCount > 0,
    );
    const stationOccupiedSeconds = round(
      activeCopyMetrics.reduce((sum, st) => sum + st.totalOccupiedTimeSeconds, 0),
    );
    const averageActiveCopyOccupancy = activeCopyMetrics.length > 0 && makespanSeconds > 0
      ? round(Math.min(1, stationOccupiedSeconds / (activeCopyMetrics.length * makespanSeconds)))
      : 0;
    const maxActiveCopyOccupancy = activeCopyMetrics.length > 0
      ? round(Math.max(...activeCopyMetrics.map(st => st.occupancyRatio)))
      : 0;

    const costEvaluation = evaluateVariantCosts(
      checkedConditions.costAssumptions ?? null,
      checkedConditions.batch,
      makespanSeconds,
      staticSummary,
      workerActiveSeconds,
      stationOccupiedSeconds,
    );

    return {
      status: 'completed',
      makespanSeconds,
      deltaMakespanSeconds: null,
      throughputPerHour,
      deltaThroughputPerHour: null,
      averageLeadTimeSeconds,
      minLeadTimeSeconds,
      maxLeadTimeSeconds,
      deltaAverageLeadTimeSeconds: null,
      averageProcessingSpanSeconds,
      minProcessingSpanSeconds,
      maxProcessingSpanSeconds,
      deltaAverageProcessingSpanSeconds: null,
      netProcessingSeconds,
      netProcessingPerPieceSeconds,
      flowEfficiencyRatio,
      averageActiveWipPieces,
      maxActiveWipPieces,
      deltaAverageActiveWipPieces: null,
      averageSystemWipPieces,
      maxSystemWipPieces,
      deltaAverageSystemWipPieces: null,
      workerActiveSeconds,
      averageTeamWorkerUtilization,
      maxTeamWorkerUtilization,
      stationOccupiedSeconds,
      averageActiveCopyOccupancy,
      maxActiveCopyOccupancy,
      busiestCopy: explanation.processingByCopy[0] ?? null,
      singleCauseWaitSeconds,
      mixedWaitSeconds: explanation.mixedWaitSeconds,
      unclassifiedWaitSeconds: explanation.unclassifiedWaitSeconds,
      blockedHoldSeconds: byCategory.get('blocking')?.workSeconds ?? 0,
      transportMovementsSeconds: explanation.transportSeconds,
      transportMovementsCount: explanation.transportCount,
      costEvaluation,
      assumptions: collectRunAssumptions(variant.project, outcome.result, checkedConditions),
    };
  };

  const rawRows = variants.map(variant => {
    const outcome = outcomesByVariantId.get(variant.id);
    if (!outcome) throw new Error(`Brak wyniku harmonogramu dla wariantu ${variant.name} (${variant.id}).`);
    const isBaseline = variant.id === baseline.id;
    const staticSummary = summarizeStaticVariant(variant.project);
    return {
      variantId: variant.id,
      name: variant.name,
      category: variant.category,
      isBaseline,
      savedAt: variant.at,
      staticSummary,
      factorDiff: inspectVariantFactors(baseline.project, variant.project, variant.category, isBaseline),
      dynamic: summarizeOutcome(variant, staticSummary, outcome),
    } satisfies VariantComparisonRow;
  });

  const baselineRow = rawRows.find(row => row.isBaseline)!;
  const baselineDynamic = baselineRow.dynamic.status === 'completed' ? baselineRow.dynamic : null;

  const rows = rawRows.map(row => {
    const updatedStatic: StaticVariantSummary = {
      ...row.staticSummary,
      deltaObjectsFootprintSqm: round(
        row.staticSummary.objectsFootprintSqm - baselineRow.staticSummary.objectsFootprintSqm,
      ),
    };
    if (row.dynamic.status !== 'completed' || !baselineDynamic) {
      return {
        ...row,
        staticSummary: updatedStatic,
      };
    }
    const baseCost = baselineDynamic.costEvaluation;
    const rowCost = row.dynamic.costEvaluation;
    const updatedCost: VariantCostEvaluation | null = rowCost
      ? {
          ...rowCost,
          deltaBatchOperatingCost:
            rowCost.batchOperatingCost !== null && baseCost?.batchOperatingCost !== null && baseCost?.batchOperatingCost !== undefined
              ? roundCost(rowCost.batchOperatingCost - baseCost.batchOperatingCost)
              : null,
          deltaUnitOperatingCost:
            rowCost.unitOperatingCost !== null && baseCost?.unitOperatingCost !== null && baseCost?.unitOperatingCost !== undefined
              ? roundCost(rowCost.unitOperatingCost - baseCost.unitOperatingCost)
              : null,
          deltaObjectsFootprintCost:
            rowCost.objectsFootprintCost !== null && baseCost?.objectsFootprintCost !== null && baseCost?.objectsFootprintCost !== undefined
              ? roundCost(rowCost.objectsFootprintCost - baseCost.objectsFootprintCost)
              : null,
        }
      : null;

    return {
      ...row,
      staticSummary: updatedStatic,
      dynamic: {
        ...row.dynamic,
        deltaMakespanSeconds: round(row.dynamic.makespanSeconds - baselineDynamic.makespanSeconds),
        deltaThroughputPerHour: round(row.dynamic.throughputPerHour - baselineDynamic.throughputPerHour),
        deltaAverageLeadTimeSeconds: round(
          row.dynamic.averageLeadTimeSeconds - baselineDynamic.averageLeadTimeSeconds,
        ),
        deltaAverageProcessingSpanSeconds: round(
          row.dynamic.averageProcessingSpanSeconds - baselineDynamic.averageProcessingSpanSeconds,
        ),
        deltaAverageActiveWipPieces: round(
          row.dynamic.averageActiveWipPieces - baselineDynamic.averageActiveWipPieces,
        ),
        deltaAverageSystemWipPieces: round(
          row.dynamic.averageSystemWipPieces - baselineDynamic.averageSystemWipPieces,
        ),
        costEvaluation: updatedCost,
      },
    };
  });

  return {
    baselineVariantId: baseline.id,
    conditions: checkedConditions,
    rows,
  };
}

/** Synchronous comparison runner using the exact same scheduleWorkerRun engine and conditions for every variant. */
export function compareDomainVariants(
  variants: readonly SavedDomainVariant[],
  baselineVariantId: string,
  conditions: VariantExperimentConditions,
): VariantComparisonReport {
  const checkedConditions = validateExperimentConditions(conditions);
  const outcomes = new Map<string, VariantScheduleOutcomeInput>();
  for (const variant of variants) {
    try {
      const cloned = parseDomainProjectV6(JSON.stringify(variant.project));
      const bodyInput = checkedConditions.transportMode === 'just-in-time' ? undefined : cloned.bodyRunInput;
      const result = scheduleWorkerRun(
        cloned,
        checkedConditions.arrivalIntervalSeconds,
        checkedConditions.batch,
        bodyInput,
        undefined,
        {transportMode: checkedConditions.transportMode},
      );
      outcomes.set(variant.id, {status: 'completed', result});
    } catch (error) {
      outcomes.set(variant.id, {status: 'error', error: (error as Error).message});
    }
  }
  return buildVariantComparisonReport(variants, baselineVariantId, checkedConditions, outcomes);
}

const fmtDelta = (val: number | null, unit = ''): string => {
  if (val === null) return '—';
  const sign = val > 0 ? '+' : '';
  return `${sign}${val}${unit ? ` ${unit}` : ''}`;
};

/** Generate a structured Markdown synthesis report for 4.5 / 4.6 variant comparison. */
export function buildVariantComparisonMarkdownReport(report: VariantComparisonReport): string {
  const {conditions, rows} = report;
  const baseline = rows.find(r => r.isBaseline) ?? rows[0];
  const transportLabel = conditions.transportMode === 'just-in-time'
    ? 'Tylko proces (just-in-time, pominięty transport i założona dostępność materiałów)'
    : 'Skonfigurowany (jawne trasy, wózki, bufory i zaopatrzenie)';
  const ca = conditions.costAssumptions ?? null;

  const lines: string[] = [
    '# Raport porównania wariantów szkicu 6 (4.5 / 4.6)',
    '',
    '## 1. Wspólne warunki eksperymentu',
    `- **Wariant bazowy:** ${baseline.name} (\`${baseline.variantId}\`)`,
    `- **Wielkość partii:** ${conditions.batch} szt.`,
    `- **Odstęp przybycia sztuk:** ${conditions.arrivalIntervalSeconds} s`,
    `- **Tryb transportu:** ${transportLabel}`,
  ];

  if (ca) {
    const basisLabel = ca.basis === 'confirmed' ? 'potwierdzone (confirmed)' : 'założone (assumed)';
    const modeLabel = (ca.accountingMode ?? 'committed-makespan') === 'committed-makespan'
      ? 'zaangażowanie zasobów w horyzoncie makespanu'
      : 'wyłącznie czas aktywnej pracy/zajętości';
    lines.push(
      `- **Jawne stawki kosztowe (${ca.currency}, ${basisLabel}):** źródło/założenia: *${ca.source}*; tryb rozliczenia: *${modeLabel}*`,
      `  - Stawka godzinowa operatora: ${ca.operatorHourlyRate !== null && ca.operatorHourlyRate !== undefined ? `${ca.operatorHourlyRate} ${ca.currency}/h` : 'nie podano (brak obliczeń kosztu pracy)'}`,
      `  - Stawka godzinowa stanowiska: ${ca.stationHourlyRate !== null && ca.stationHourlyRate !== undefined ? `${ca.stationHourlyRate} ${ca.currency}/h` : 'nie podano (brak obliczeń kosztu stanowisk)'}`,
      `  - Stawka powierzchni: ${ca.floorSqmRate !== null && ca.floorSqmRate !== undefined ? `${ca.floorSqmRate} ${ca.currency}/m²` : 'nie podano (brak obliczeń kosztu powierzchni)'}`,
    );
  } else {
    lines.push(
      '- **Stawki kosztowe:** nie podano jawnych stawek godzinowych ani powierzchniowych — koszty operacyjne i powierzchniowe nie są zgadywane.',
    );
  }

  lines.push(
    '',
    '## 2. Zestawienie wskaźników: wydajność, czas przejścia, WIP, obsada, powierzchnia i koszty (4.6)',
    '',
    '| Wariant | Kategoria | Wydajność stat. / dyn. [szt./h] | Makespan [s] (Δ) | Czas przejścia śr. od przybycia / w procesie [s] | WIP śr. / maks. w procesie (w systemie) [szt.] | Obsada (wykorzystanie śr./maks.) | Stanowiska i kopie (zajętość śr./maks.) | Powierzchnia ob. / obrys / hala [m²] | Koszt oper. partii / jedn. (Δ) |',
    '| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |',
  );

  for (const row of rows) {
    const st = row.staticSummary;
    const catLabel = domainVariantCategoryLabels[row.category];
    const statCap = st.staticCapacityPerHour !== null ? `${st.staticCapacityPerHour}` : 'n/d';
    const bboxLabel = st.boundingBoxAreaSqm !== null ? `${st.boundingBoxAreaSqm}` : 'brak ob.';
    const surfaceCell = `${st.objectsFootprintSqm} (${fmtDelta(st.deltaObjectsFootprintSqm, 'm²')}) / ${bboxLabel} / ${st.facilityAreaSqm}`;

    if (row.dynamic.status === 'error') {
      lines.push(
        `| **${row.name}** | ${catLabel} | stat. ${statCap} / BŁĄD | BŁĄD: ${row.dynamic.error} | — | — | ${st.teamWorkersCount}/${st.definedWorkersCount} os. | ${st.activeStationsCount}/${st.totalStationsCount} st. (${st.activeCopiesCount}/${st.totalCopiesCount} kopii) | ${surfaceCell} | — |`,
      );
      continue;
    }

    const d = row.dynamic;
    const thrCell = `stat. ${statCap} / **${d.throughputPerHour}** (${fmtDelta(d.deltaThroughputPerHour, 'szt./h')})`;
    const mkCell = `**${d.makespanSeconds}** (${fmtDelta(d.deltaMakespanSeconds, 's')})`;
    const ltCell = `${d.averageLeadTimeSeconds} (${fmtDelta(d.deltaAverageLeadTimeSeconds, 's')}) / ${d.averageProcessingSpanSeconds} (${fmtDelta(d.deltaAverageProcessingSpanSeconds, 's')})`;
    const wipCell = `${d.averageActiveWipPieces} (${fmtDelta(d.deltaAverageActiveWipPieces)}) / ${d.maxActiveWipPieces} (sys: ${d.averageSystemWipPieces} / ${d.maxSystemWipPieces})`;
    const staffCell = `${st.teamWorkersCount}/${st.definedWorkersCount} os. (${(d.averageTeamWorkerUtilization * 100).toFixed(1)}% / ${(d.maxTeamWorkerUtilization * 100).toFixed(1)}%)`;
    const copyCell = `${st.activeStationsCount}/${st.totalStationsCount} st., ${st.activeCopiesCount}/${st.totalCopiesCount} kopii (${(d.averageActiveCopyOccupancy * 100).toFixed(1)}% / ${(d.maxActiveCopyOccupancy * 100).toFixed(1)}%)`;

    let costCell = 'brak jawnych stawek';
    if (d.costEvaluation) {
      const ce = d.costEvaluation;
      if (ce.batchOperatingCost !== null && ce.unitOperatingCost !== null) {
        costCell = `**${ce.batchOperatingCost} ${ce.currency}** (${fmtDelta(ce.deltaBatchOperatingCost, ce.currency)}) / **${ce.unitOperatingCost} ${ce.currency}/szt.**`;
      } else if (ce.objectsFootprintCost !== null) {
        costCell = `pow. ob.: ${ce.objectsFootprintCost} ${ce.currency}`;
      }
    }

    lines.push(
      `| **${row.name}**${row.isBaseline ? ' *(baza)*' : ''} | ${catLabel} | ${thrCell} | ${mkCell} | ${ltCell} | ${wipCell} | ${staffCell} | ${copyCell} | ${surfaceCell} | ${costCell} |`,
    );
  }

  lines.push('', '## 3. Ograniczenia przepustowości (4.4), czynniki zmian i założenia wariantów', '');
  for (const row of rows) {
    lines.push(`### ${row.name} (${domainVariantCategoryLabels[row.category]})${row.isBaseline ? ' — Wariant bazowy' : ''}`);
    lines.push(`- **Zmienione czynniki względem bazy:** ${row.factorDiff.summary.join('; ')}`);
    if (row.factorDiff.comparabilityWarnings.length > 0) {
      for (const warn of row.factorDiff.comparabilityWarnings) {
        lines.push(`- **Ostrzeżenie porównywalności:** ${warn}`);
      }
    }
    if (row.dynamic.status === 'error') {
      lines.push(`- **Status harmonogramu:** BŁĄD — ${row.dynamic.error}`, '');
      continue;
    }
    const d = row.dynamic;
    const busiest = d.busiestCopy
      ? `${d.busiestCopy.stationId}#${d.busiestCopy.copy} (${d.busiestCopy.seconds} s, ${(d.busiestCopy.share * 100).toFixed(1)}% makespanu)`
      : 'brak';
    lines.push(
      `- **Najbardziej obciążona kopia stanowiska:** ${busiest}`,
      `- **Oczekiwania jednoprzyczynowe łącznie:** ${d.singleCauseWaitSeconds.totalSingleCause} s (pracownicy: ${d.singleCauseWaitSeconds.workers} s, transport: ${d.singleCauseWaitSeconds.transport} s, blokady/kolejki: ${d.singleCauseWaitSeconds.blocking} s, materiał/podzespoły: ${d.singleCauseWaitSeconds.material} s, kalendarz: ${d.singleCauseWaitSeconds.calendar} s, inne: ${d.singleCauseWaitSeconds.other} s)`,
      `- **Oczekiwania wieloprzyczynowe (nierozdzielane arbitralnie):** ${d.mixedWaitSeconds} s`,
      `- **Przetrzymanie na zablokowanym wyjściu / kontynuacji:** ${d.blockedHoldSeconds} s`,
      `- **Ruchy transportowe:** ${d.transportMovementsCount} (${d.transportMovementsSeconds} s)`,
    );
    if (d.costEvaluation) {
      const ce = d.costEvaluation;
      lines.push(
        `- **Rozbicie kosztów (${ce.currency}, stawki ${ce.basis === 'confirmed' ? 'potwierdzone' : 'założone'}, źródło: ${ce.source}):** ` +
        `praca aktywna=${ce.laborActiveCost ?? 'n/d'} (${ce.laborActiveHours} h), praca zaangażowana=${ce.laborCommittedCost ?? 'n/d'} (${ce.laborCommittedHours} h), ` +
        `stanowiska zajęte=${ce.stationOccupiedCost ?? 'n/d'} (${ce.stationOccupiedHours} h), stanowiska zaangażowane=${ce.stationCommittedCost ?? 'n/d'} (${ce.stationCommittedHours} h), ` +
        `powierzchnia obiektów=${ce.objectsFootprintCost ?? 'n/d'}, powierzchnia hali=${ce.facilityFloorCost ?? 'n/d'}, BOM/szt.=${ce.bomUnitCost ?? 'n/d'}`,
      );
    }
    if (d.assumptions.length > 0) {
      lines.push(`- **Założenia przebiegu:** ${d.assumptions.join('; ')}`);
    }
    lines.push('');
  }

  return lines.join('\n');
}

