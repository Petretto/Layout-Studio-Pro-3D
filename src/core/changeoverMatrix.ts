import type {DomainTimeBasis} from './domainProject';

export interface ProductVariant {
  id: string;
  name: string;
  code?: string;
  color?: string;
  description?: string;
}

export interface ChangeoverTransition {
  id: string;
  fromVariantId: string; // variant ID or '*' for wildcard
  toVariantId: string;   // variant ID or '*' for wildcard
  stationId?: string;    // specific station ID or undefined / '*' for line-wide
  durationSeconds: number;
  durationBasis: DomainTimeBasis;
  requiredWorkers?: number;
  cleanoutRequired?: boolean;
  description?: string;
}

export interface ChangeoverMatrix {
  variants: ProductVariant[];
  defaultVariantId?: string;
  transitions: ChangeoverTransition[];
  defaultDurationSeconds?: number;
  defaultDurationBasis?: DomainTimeBasis;
}

export interface ChangeoverRun {
  stationId: string;
  copy: number;
  fromVariantId: string;
  toVariantId: string;
  startSeconds: number;
  endSeconds: number;
  durationSeconds: number;
  durationBasis: DomainTimeBasis;
  workerIds: readonly string[];
  cleanoutRequired: boolean;
  afterJob: number;
  beforeJob: number;
}

export interface ProductionOrderBatch {
  batchId: string;
  variantId: string;
  quantity: number;
  priority?: number;
  notes?: string;
}

export type BatchSequenceStrategy = 'as-declared' | 'minimize-changeover-greedy' | 'heijunka-leveling';

function record(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function checkAllowedKeys(obj: Record<string, unknown>, allowed: string[], label: string) {
  for (const k of Object.keys(obj)) {
    if (!allowed.includes(k)) {
      throw new Error(`${label}: nieobsługiwane pole '${k}'.`);
    }
  }
}

/**
 * Validates the changeover matrix contract against domain requirements.
 * Throws explicit descriptive errors on malformed or contradictory entries.
 */
export function validateChangeoverMatrix(value: unknown, knownStationIds?: Set<string>): ChangeoverMatrix {
  if (!record(value)) {
    throw new Error('Przezbrojenia: wymagany obiekt macierzy przezbrojeń.');
  }
  checkAllowedKeys(value, ['variants', 'defaultVariantId', 'transitions', 'defaultDurationSeconds', 'defaultDurationBasis'], 'Przezbrojenia');

  if (!Array.isArray(value.variants) || value.variants.length > 500) {
    throw new Error('Przezbrojenia: wymagana lista wariantów (maks. 500).');
  }

  const variantIds = new Set<string>();
  const variants: ProductVariant[] = value.variants.map((v, index) => {
    if (!record(v)) throw new Error(`Wariant [${index}]: wymagany obiekt.`);
    checkAllowedKeys(v, ['id', 'name', 'code', 'color', 'description'], `Wariant [${index}]`);
    if (typeof v.id !== 'string' || !v.id.trim()) {
      throw new Error(`Wariant [${index}]: wymagane niepuste ID.`);
    }
    const id = v.id.trim();
    if (variantIds.has(id)) {
      throw new Error(`Wariant '${id}': powtórzone ID.`);
    }
    variantIds.add(id);

    if (typeof v.name !== 'string' || !v.name.trim()) {
      throw new Error(`Wariant '${id}': wymagana niepusta nazwa.`);
    }
    const name = v.name.trim();

    const code = v.code !== undefined ? String(v.code).trim() : undefined;
    const color = v.color !== undefined ? String(v.color).trim() : undefined;
    const description = v.description !== undefined ? String(v.description).trim() : undefined;

    return {id, name, ...(code ? {code} : {}), ...(color ? {color} : {}), ...(description ? {description} : {})};
  });

  let defaultVariantId: string | undefined = undefined;
  if (value.defaultVariantId !== undefined) {
    if (typeof value.defaultVariantId !== 'string' || !value.defaultVariantId.trim()) {
      throw new Error('Przezbrojenia: niepoprawne defaultVariantId.');
    }
    const defId = value.defaultVariantId.trim();
    if (!variantIds.has(defId)) {
      throw new Error(`Przezbrojenia: domyślny wariant '${defId}' nie istnieje w zdefiniowanych wariantach.`);
    }
    defaultVariantId = defId;
  } else if (variants.length > 0) {
    defaultVariantId = variants[0].id;
  }

  let defaultDurationSeconds: number | undefined = undefined;
  if (value.defaultDurationSeconds !== undefined) {
    if (typeof value.defaultDurationSeconds !== 'number' || !Number.isFinite(value.defaultDurationSeconds) || value.defaultDurationSeconds < 0) {
      throw new Error('Przezbrojenia: defaultDurationSeconds musi być liczbą nieujemną.');
    }
    defaultDurationSeconds = value.defaultDurationSeconds;
  }

  let defaultDurationBasis: DomainTimeBasis | undefined = undefined;
  if (value.defaultDurationBasis !== undefined) {
    if (value.defaultDurationBasis !== 'measured' && value.defaultDurationBasis !== 'assumed') {
      throw new Error("Przezbrojenia: defaultDurationBasis musi być 'measured' lub 'assumed'.");
    }
    defaultDurationBasis = value.defaultDurationBasis;
  }

  if (!Array.isArray(value.transitions) || value.transitions.length > 5000) {
    throw new Error('Przezbrojenia: wymagana lista reguł przejść (maks. 5000).');
  }

  const transitionIds = new Set<string>();
  const transitions: ChangeoverTransition[] = value.transitions.map((t, index) => {
    if (!record(t)) throw new Error(`Reguła przezbrojenia [${index}]: wymagany obiekt.`);
    checkAllowedKeys(t, [
      'id', 'fromVariantId', 'toVariantId', 'stationId', 'durationSeconds',
      'durationBasis', 'requiredWorkers', 'cleanoutRequired', 'description'
    ], `Reguła przezbrojenia [${index}]`);

    if (typeof t.id !== 'string' || !t.id.trim()) {
      throw new Error(`Reguła przezbrojenia [${index}]: wymagane unikalne ID.`);
    }
    const id = t.id.trim();
    if (transitionIds.has(id)) {
      throw new Error(`Reguła przezbrojenia '${id}': powtórzone ID.`);
    }
    transitionIds.add(id);

    if (typeof t.fromVariantId !== 'string' || !t.fromVariantId.trim()) {
      throw new Error(`Reguła przezbrojenia '${id}': wymagane fromVariantId.`);
    }
    const fromVariantId = t.fromVariantId.trim();
    if (fromVariantId !== '*' && !variantIds.has(fromVariantId)) {
      throw new Error(`Reguła przezbrojenia '${id}': nieznany wariant źródłowy '${fromVariantId}'.`);
    }

    if (typeof t.toVariantId !== 'string' || !t.toVariantId.trim()) {
      throw new Error(`Reguła przezbrojenia '${id}': wymagane toVariantId.`);
    }
    const toVariantId = t.toVariantId.trim();
    if (toVariantId !== '*' && !variantIds.has(toVariantId)) {
      throw new Error(`Reguła przezbrojenia '${id}': nieznany wariant docelowy '${toVariantId}'.`);
    }

    let stationId: string | undefined = undefined;
    if (t.stationId !== undefined) {
      if (typeof t.stationId !== 'string' || !t.stationId.trim()) {
        throw new Error(`Reguła przezbrojenia '${id}': niepoprawne stationId.`);
      }
      const stId = t.stationId.trim();
      if (stId !== '*' && knownStationIds && !knownStationIds.has(stId)) {
        throw new Error(`Reguła przezbrojenia '${id}': nieznane stanowisko '${stId}'.`);
      }
      stationId = stId === '*' ? undefined : stId;
    }

    if (typeof t.durationSeconds !== 'number' || !Number.isFinite(t.durationSeconds) || t.durationSeconds < 0) {
      throw new Error(`Reguła przezbrojenia '${id}': durationSeconds musi być liczbą nieujemną.`);
    }
    const durationSeconds = t.durationSeconds;

    if (t.durationBasis !== 'measured' && t.durationBasis !== 'assumed') {
      throw new Error(`Reguła przezbrojenia '${id}': durationBasis musi być 'measured' lub 'assumed'.`);
    }
    const durationBasis: DomainTimeBasis = t.durationBasis;

    let requiredWorkers: number | undefined = undefined;
    if (t.requiredWorkers !== undefined) {
      if (typeof t.requiredWorkers !== 'number' || !Number.isInteger(t.requiredWorkers) || t.requiredWorkers < 1) {
        throw new Error(`Reguła przezbrojenia '${id}': requiredWorkers musi być dodatnią liczbą całkowitą (>= 1).`);
      }
      requiredWorkers = t.requiredWorkers;
    }

    const cleanoutRequired = t.cleanoutRequired === true;
    const description = t.description !== undefined ? String(t.description).trim() : undefined;

    return {
      id,
      fromVariantId,
      toVariantId,
      ...(stationId ? {stationId} : {}),
      durationSeconds,
      durationBasis,
      ...(requiredWorkers !== undefined ? {requiredWorkers} : {}),
      ...(cleanoutRequired ? {cleanoutRequired} : {}),
      ...(description ? {description} : {})
    };
  });

  return {
    variants,
    ...(defaultVariantId ? {defaultVariantId} : {}),
    transitions,
    ...(defaultDurationSeconds !== undefined ? {defaultDurationSeconds} : {}),
    ...(defaultDurationBasis !== undefined ? {defaultDurationBasis} : {})
  };
}

/**
 * Validates a list of production order batches against declared variants.
 */
export function validateProductionOrders(value: unknown, matrix?: ChangeoverMatrix): ProductionOrderBatch[] {
  if (!Array.isArray(value) || value.length > 5000) {
    throw new Error('Zlecenia produkcyjne: wymagana lista zleceń (maks. 5000).');
  }
  const knownVariants = matrix ? new Set(matrix.variants.map(v => v.id)) : null;
  const batchIds = new Set<string>();

  return value.map((item, index) => {
    if (!record(item)) throw new Error(`Zlecenie [${index}]: wymagany obiekt.`);
    checkAllowedKeys(item, ['batchId', 'variantId', 'quantity', 'priority', 'notes'], `Zlecenie [${index}]`);

    if (typeof item.batchId !== 'string' || !item.batchId.trim()) {
      throw new Error(`Zlecenie [${index}]: wymagane unikalne batchId.`);
    }
    const batchId = item.batchId.trim();
    if (batchIds.has(batchId)) {
      throw new Error(`Zlecenie '${batchId}': powtórzone batchId.`);
    }
    batchIds.add(batchId);

    if (typeof item.variantId !== 'string' || !item.variantId.trim()) {
      throw new Error(`Zlecenie '${batchId}': wymagane variantId.`);
    }
    const variantId = item.variantId.trim();
    if (knownVariants && !knownVariants.has(variantId)) {
      throw new Error(`Zlecenie '${batchId}': nieznany wariant '${variantId}'.`);
    }

    if (typeof item.quantity !== 'number' || !Number.isInteger(item.quantity) || item.quantity < 1) {
      throw new Error(`Zlecenie '${batchId}': quantity musi być dodatnią liczbą całkowitą (>= 1).`);
    }
    const quantity = item.quantity;

    const priority = typeof item.priority === 'number' && Number.isFinite(item.priority) ? item.priority : undefined;
    const notes = item.notes !== undefined ? String(item.notes).trim() : undefined;

    return {
      batchId,
      variantId,
      quantity,
      ...(priority !== undefined ? {priority} : {}),
      ...(notes ? {notes} : {})
    };
  });
}

/**
 * Resolves the changeover duration, basis, and constraints for transitioning
 * between fromVariantId and toVariantId on a given station.
 */
export function resolveChangeover(
  matrix: ChangeoverMatrix | undefined,
  fromVariantId: string | undefined,
  toVariantId: string | undefined,
  stationId?: string
): {
  durationSeconds: number;
  durationBasis: DomainTimeBasis;
  requiredWorkers: number;
  cleanoutRequired: boolean;
} {
  // If either variant is undefined or they are identical, no changeover is incurred
  if (!fromVariantId || !toVariantId || fromVariantId === toVariantId || !matrix) {
    return {
      durationSeconds: 0,
      durationBasis: 'measured',
      requiredWorkers: 1,
      cleanoutRequired: false
    };
  }

  // 1. Station-specific exact match (from === fromVariantId, to === toVariantId, stationId === stationId)
  if (stationId) {
    const specificExact = matrix.transitions.find(t =>
      t.stationId === stationId && t.fromVariantId === fromVariantId && t.toVariantId === toVariantId
    );
    if (specificExact) {
      return {
        durationSeconds: specificExact.durationSeconds,
        durationBasis: specificExact.durationBasis,
        requiredWorkers: specificExact.requiredWorkers ?? 1,
        cleanoutRequired: specificExact.cleanoutRequired ?? false
      };
    }

    // 2. Station-specific wildcard matches
    const specificFromWild = matrix.transitions.find(t =>
      t.stationId === stationId && t.fromVariantId === '*' && t.toVariantId === toVariantId
    );
    if (specificFromWild) {
      return {
        durationSeconds: specificFromWild.durationSeconds,
        durationBasis: specificFromWild.durationBasis,
        requiredWorkers: specificFromWild.requiredWorkers ?? 1,
        cleanoutRequired: specificFromWild.cleanoutRequired ?? false
      };
    }

    const specificToWild = matrix.transitions.find(t =>
      t.stationId === stationId && t.fromVariantId === fromVariantId && t.toVariantId === '*'
    );
    if (specificToWild) {
      return {
        durationSeconds: specificToWild.durationSeconds,
        durationBasis: specificToWild.durationBasis,
        requiredWorkers: specificToWild.requiredWorkers ?? 1,
        cleanoutRequired: specificToWild.cleanoutRequired ?? false
      };
    }

    const specificAllWild = matrix.transitions.find(t =>
      t.stationId === stationId && t.fromVariantId === '*' && t.toVariantId === '*'
    );
    if (specificAllWild) {
      return {
        durationSeconds: specificAllWild.durationSeconds,
        durationBasis: specificAllWild.durationBasis,
        requiredWorkers: specificAllWild.requiredWorkers ?? 1,
        cleanoutRequired: specificAllWild.cleanoutRequired ?? false
      };
    }
  }

  // 3. Line-wide exact match (stationId is undefined / line-wide)
  const lineExact = matrix.transitions.find(t =>
    !t.stationId && t.fromVariantId === fromVariantId && t.toVariantId === toVariantId
  );
  if (lineExact) {
    return {
      durationSeconds: lineExact.durationSeconds,
      durationBasis: lineExact.durationBasis,
      requiredWorkers: lineExact.requiredWorkers ?? 1,
      cleanoutRequired: lineExact.cleanoutRequired ?? false
    };
  }

  // 4. Line-wide wildcard matches
  const lineFromWild = matrix.transitions.find(t =>
    !t.stationId && t.fromVariantId === '*' && t.toVariantId === toVariantId
  );
  if (lineFromWild) {
    return {
      durationSeconds: lineFromWild.durationSeconds,
      durationBasis: lineFromWild.durationBasis,
      requiredWorkers: lineFromWild.requiredWorkers ?? 1,
      cleanoutRequired: lineFromWild.cleanoutRequired ?? false
    };
  }

  const lineToWild = matrix.transitions.find(t =>
    !t.stationId && t.fromVariantId === fromVariantId && t.toVariantId === '*'
  );
  if (lineToWild) {
    return {
      durationSeconds: lineToWild.durationSeconds,
      durationBasis: lineToWild.durationBasis,
      requiredWorkers: lineToWild.requiredWorkers ?? 1,
      cleanoutRequired: lineToWild.cleanoutRequired ?? false
    };
  }

  const lineAllWild = matrix.transitions.find(t =>
    !t.stationId && t.fromVariantId === '*' && t.toVariantId === '*'
  );
  if (lineAllWild) {
    return {
      durationSeconds: lineAllWild.durationSeconds,
      durationBasis: lineAllWild.durationBasis,
      requiredWorkers: lineAllWild.requiredWorkers ?? 1,
      cleanoutRequired: lineAllWild.cleanoutRequired ?? false
    };
  }

  // 5. Default matrix duration
  if (matrix.defaultDurationSeconds !== undefined) {
    return {
      durationSeconds: matrix.defaultDurationSeconds,
      durationBasis: matrix.defaultDurationBasis ?? 'assumed',
      requiredWorkers: 1,
      cleanoutRequired: false
    };
  }

  // 6. No transition defined
  return {
    durationSeconds: 0,
    durationBasis: 'assumed',
    requiredWorkers: 1,
    cleanoutRequired: false
  };
}

/**
 * Calculates total changeovers and station breakdowns across a sequence of batches.
 */
export function calculateSequenceChangeovers(
  orders: ProductionOrderBatch[],
  matrix: ChangeoverMatrix | undefined,
  stationIds: string[] = []
): {
  totalChangeoverSeconds: number;
  transitionCount: number;
  stationBreakdowns: {stationId: string; seconds: number; count: number}[];
  transitionsList: {
    batchIndex: number;
    fromVariantId: string;
    toVariantId: string;
    stationId: string;
    durationSeconds: number;
    durationBasis: DomainTimeBasis;
  }[];
} {
  if (!orders.length || !matrix) {
    return {
      totalChangeoverSeconds: 0,
      transitionCount: 0,
      stationBreakdowns: stationIds.map(st => ({stationId: st, seconds: 0, count: 0})),
      transitionsList: []
    };
  }

  const stations = stationIds.length > 0 ? stationIds : ['LINE_DEFAULT'];
  const stationMap = new Map<string, {seconds: number; count: number}>();
  for (const st of stations) stationMap.set(st, {seconds: 0, count: 0});

  const transitionsList: {
    batchIndex: number;
    fromVariantId: string;
    toVariantId: string;
    stationId: string;
    durationSeconds: number;
    durationBasis: DomainTimeBasis;
  }[] = [];

  let totalChangeoverSeconds = 0;
  let transitionCount = 0;

  for (let i = 1; i < orders.length; i++) {
    const fromVariantId = orders[i - 1].variantId;
    const toVariantId = orders[i].variantId;
    if (fromVariantId !== toVariantId) {
      for (const st of stations) {
        const resolution = resolveChangeover(matrix, fromVariantId, toVariantId, st === 'LINE_DEFAULT' ? undefined : st);
        if (resolution.durationSeconds > 0) {
          totalChangeoverSeconds += resolution.durationSeconds;
          transitionCount++;
          const entry = stationMap.get(st) ?? {seconds: 0, count: 0};
          entry.seconds += resolution.durationSeconds;
          entry.count++;
          stationMap.set(st, entry);

          transitionsList.push({
            batchIndex: i,
            fromVariantId,
            toVariantId,
            stationId: st,
            durationSeconds: resolution.durationSeconds,
            durationBasis: resolution.durationBasis
          });
        }
      }
    }
  }

  return {
    totalChangeoverSeconds,
    transitionCount,
    stationBreakdowns: Array.from(stationMap.entries()).map(([stationId, val]) => ({
      stationId,
      seconds: val.seconds,
      count: val.count
    })),
    transitionsList
  };
}

/**
 * Optimizes or arranges the sequence of production batches according to the chosen strategy.
 * - 'as-declared': keeps the original sequence intact.
 * - 'minimize-changeover-greedy': sorts/chains batches to minimize transition times using nearest-neighbor heuristic.
 * - 'heijunka-leveling': interweaves variants proportionally to produce an even product mix.
 */
export function orderBatches(
  orders: ProductionOrderBatch[],
  matrix: ChangeoverMatrix | undefined,
  strategy: BatchSequenceStrategy = 'as-declared',
  stationIds: string[] = []
): ProductionOrderBatch[] {
  if (orders.length <= 1 || !matrix || strategy === 'as-declared') {
    return [...orders];
  }

  if (strategy === 'minimize-changeover-greedy') {
    // Greedy nearest neighbor chaining
    const remaining = [...orders];
    // Start with highest priority (or first) batch
    remaining.sort((a, b) => (a.priority ?? 0) - (b.priority ?? 0));
    const result: ProductionOrderBatch[] = [remaining.shift()!];

    while (remaining.length > 0) {
      const current = result[result.length - 1];
      let bestIndex = 0;
      let minCost = Infinity;

      for (let i = 0; i < remaining.length; i++) {
        const candidate = remaining[i];
        let cost = 0;
        if (candidate.variantId === current.variantId) {
          cost = 0; // Same variant has zero changeover
        } else {
          for (const st of (stationIds.length ? stationIds : ['*'])) {
            cost += resolveChangeover(matrix, current.variantId, candidate.variantId, st === '*' ? undefined : st).durationSeconds;
          }
        }
        // Incorporate priority penalty if defined
        const priorityPenalty = (candidate.priority ?? 0) * 0.001;
        if (cost + priorityPenalty < minCost) {
          minCost = cost + priorityPenalty;
          bestIndex = i;
        }
      }

      result.push(remaining.splice(bestIndex, 1)[0]);
    }
    return result;
  }

  if (strategy === 'heijunka-leveling') {
    // Round-robin leveling by variant groups
    const byVariant = new Map<string, ProductionOrderBatch[]>();
    for (const order of orders) {
      const list = byVariant.get(order.variantId) ?? [];
      list.push(order);
      byVariant.set(order.variantId, list);
    }

    const result: ProductionOrderBatch[] = [];
    let hasMore = true;
    while (hasMore) {
      hasMore = false;
      for (const list of byVariant.values()) {
        if (list.length > 0) {
          result.push(list.shift()!);
          if (list.length > 0) hasMore = true;
        }
      }
    }
    return result;
  }

  return [...orders];
}

/**
 * Maps a total batch count or declared production orders to an array of variant IDs per job index (1-based).
 */
export function buildJobVariantMap(
  project: {changeoverMatrix?: ChangeoverMatrix; productionOrders?: readonly ProductionOrderBatch[] | ProductionOrderBatch[]},
  totalJobs: number
): Map<number, string> {
  const result = new Map<number, string>();
  if (project.productionOrders && project.productionOrders.length > 0) {
    let currentJob = 1;
    for (const order of project.productionOrders) {
      for (let q = 0; q < order.quantity && currentJob <= totalJobs; q++) {
        result.set(currentJob, order.variantId);
        currentJob++;
      }
      if (currentJob > totalJobs) break;
    }
    const fallbackVariant = project.changeoverMatrix?.defaultVariantId ??
      project.changeoverMatrix?.variants[0]?.id ?? 'DEFAULT';
    while (currentJob <= totalJobs) {
      result.set(currentJob, fallbackVariant);
      currentJob++;
    }
  } else {
    const defaultVar = project.changeoverMatrix?.defaultVariantId ??
      project.changeoverMatrix?.variants[0]?.id ?? 'DEFAULT';
    for (let j = 1; j <= totalJobs; j++) {
      result.set(j, defaultVar);
    }
  }
  return result;
}

