import {parseProject} from './validation';
import {parseStationProjectV5} from './stationProject';
import {parseDomainProjectV6, type DomainProjectV6} from './domainProject';
import {scheduleWorkerRun, type TransportSimulationMode, type WorkerScheduleResult} from './workerSchedule';
import {explainThroughput} from './throughputExplanation';
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

export interface VariantExperimentConditions {
  batch: number;
  arrivalIntervalSeconds: number;
  transportMode: TransportSimulationMode;
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
  staticLoadBasis: string;
  declaredRoutesCount: number;
  totalRouteDistanceMm: number;
  targetLayoutType: DomainProjectV6['targetLayoutType'];
  layoutObjectsCount: number;
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

export interface VariantDynamicCompleted {
  status: 'completed';
  makespanSeconds: number;
  deltaMakespanSeconds: number | null;
  throughputPerHour: number;
  deltaThroughputPerHour: number | null;
  averageLeadTimeSeconds: number;
  netProcessingSeconds: number;
  busiestCopy: {stationId: string; copy: number; seconds: number; share: number} | null;
  singleCauseWaitSeconds: VariantSingleCauseWaits;
  mixedWaitSeconds: number;
  unclassifiedWaitSeconds: number;
  blockedHoldSeconds: number;
  transportMovementsSeconds: number;
  transportMovementsCount: number;
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
    staticLoadBasis = hasMultipleCandidates
      ? 'Wiele dopuszczonych kopii — rzeczywisty podział wyznacza harmonogram.'
      : 'Statyczna suma czasów technologicznych na kopię [s/szt.] — nie jest dowodem przepustowości.';
  }

  const routes = project.stationRouting?.routes ?? [];
  const declaredRoutesCount = routes.length;
  const totalRouteDistanceMm = round(routes.reduce((sum, r) => sum + r.distanceMm, 0));
  const timeBasis = bases.size === 0 ? 'missing' : bases.size === 1 ? [...bases][0] : 'mixed';

  return {
    definedWorkersCount,
    teamWorkersCount,
    activeStationsCount,
    totalStationsCount,
    activeCopiesCount,
    totalCopiesCount,
    selectedWorkContentSeconds,
    maxStaticCopyLoadSeconds,
    staticLoadBasis,
    declaredRoutesCount,
    totalRouteDistanceMm,
    targetLayoutType: project.targetLayoutType,
    layoutObjectsCount: project.layoutObjects.length,
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
  return assumptions;
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
  return {
    batch: conditions.batch,
    arrivalIntervalSeconds: conditions.arrivalIntervalSeconds,
    transportMode: conditions.transportMode,
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

  const summarizeOutcome = (variant: SavedDomainVariant, outcome: VariantScheduleOutcomeInput): VariantDynamicOutcome => {
    if (outcome.status === 'error') {
      return {status: 'error', error: outcome.error};
    }
    const explanation = explainThroughput(outcome.result);
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
    const leadTimes = outcome.result.jobs.map(job => job.finish - job.arrival);
    const averageLeadTimeSeconds = leadTimes.length > 0
      ? round(leadTimes.reduce((sum, v) => sum + v, 0) / leadTimes.length)
      : 0;
    return {
      status: 'completed',
      makespanSeconds,
      deltaMakespanSeconds: null,
      throughputPerHour,
      deltaThroughputPerHour: null,
      averageLeadTimeSeconds,
      netProcessingSeconds: byCategory.get('processing')?.workSeconds ?? 0,
      busiestCopy: explanation.processingByCopy[0] ?? null,
      singleCauseWaitSeconds,
      mixedWaitSeconds: explanation.mixedWaitSeconds,
      unclassifiedWaitSeconds: explanation.unclassifiedWaitSeconds,
      blockedHoldSeconds: byCategory.get('blocking')?.workSeconds ?? 0,
      transportMovementsSeconds: explanation.transportSeconds,
      transportMovementsCount: explanation.transportCount,
      assumptions: collectRunAssumptions(variant.project, outcome.result, checkedConditions),
    };
  };

  const rawRows = variants.map(variant => {
    const outcome = outcomesByVariantId.get(variant.id);
    if (!outcome) throw new Error(`Brak wyniku harmonogramu dla wariantu ${variant.name} (${variant.id}).`);
    const isBaseline = variant.id === baseline.id;
    return {
      variantId: variant.id,
      name: variant.name,
      category: variant.category,
      isBaseline,
      savedAt: variant.at,
      staticSummary: summarizeStaticVariant(variant.project),
      factorDiff: inspectVariantFactors(baseline.project, variant.project, variant.category, isBaseline),
      dynamic: summarizeOutcome(variant, outcome),
    } satisfies VariantComparisonRow;
  });

  const baselineRow = rawRows.find(row => row.isBaseline)!;
  const baselineDynamic = baselineRow.dynamic.status === 'completed' ? baselineRow.dynamic : null;

  const rows = rawRows.map(row => {
    if (row.dynamic.status !== 'completed' || !baselineDynamic) return row;
    return {
      ...row,
      dynamic: {
        ...row.dynamic,
        deltaMakespanSeconds: round(row.dynamic.makespanSeconds - baselineDynamic.makespanSeconds),
        deltaThroughputPerHour: round(row.dynamic.throughputPerHour - baselineDynamic.throughputPerHour),
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
