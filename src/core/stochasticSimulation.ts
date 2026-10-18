import type {DomainProjectV6, DomainTimeInterval, DomainTimeProfile} from './domainProject';
import type {ResourceCalendarsV6, ResourceCalendar, DeclaredCalendarWindow} from './resourceCalendar';
import {scheduleWorkerRun, type TransportSimulationMode} from './workerSchedule';

/**
 * Pseudo-random number generator (PRNG) with deterministic seed support.
 * Uses SplitMix32 / Mulberry32 algorithm for fast, high-quality, reproducible pseudo-random numbers.
 */
export class DeterministicRNG {
  private state: number;

  constructor(seed: number) {
    if (!Number.isFinite(seed)) throw new Error('Ziarno losowości musi być skończoną liczbą.');
    // Ensure 32-bit unsigned integer
    this.state = (Math.floor(seed) >>> 0) || 0x12345678;
  }

  /** Returns pseudo-random float in [0, 1) */
  next(): number {
    this.state = (this.state + 0x6D2B79F5) | 0;
    let t = Math.imul(this.state ^ (this.state >>> 15), 1 | this.state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /** Uniform real in range [min, max] */
  uniform(min: number, max: number): number {
    if (min >= max) return min;
    return min + (max - min) * this.next();
  }

  /** Normal distribution using Box-Muller transform */
  normal(mean: number, stdDev: number): number {
    if (stdDev <= 0) return mean;
    let u1 = this.next();
    let u2 = this.next();
    while (u1 <= 1e-15) u1 = this.next(); // avoid log(0)
    const z0 = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
    return mean + z0 * stdDev;
  }

  /** Triangular distribution */
  triangular(min: number, mode: number, max: number): number {
    if (min >= max) return mode;
    const u = this.next();
    const c = (mode - min) / (max - min);
    if (u <= c) {
      return min + Math.sqrt(u * (max - min) * (mode - min));
    } else {
      return max - Math.sqrt((1 - u) * (max - min) * (max - mode));
    }
  }

  /** Exponential distribution with mean (lambda = 1 / mean) */
  exponential(mean: number): number {
    if (mean <= 0) return 0;
    let u = this.next();
    while (u <= 1e-15) u = this.next();
    return -mean * Math.log(u);
  }

  /** Log-normal distribution with given mean and stdDev of the underlying normal */
  logNormal(mean: number, stdDev: number): number {
    return Math.exp(this.normal(mean, stdDev));
  }
}

/**
 * Probability distribution model for process duration variability.
 */
export type VariabilityDistributionType = 'constant' | 'normal' | 'triangular' | 'uniform' | 'lognormal';

export interface DurationVariabilityConfig {
  distribution: VariabilityDistributionType;
  /** Coefficient of variation (CV = stdDev / mean) or relative spread */
  relativeStdDev?: number;
  /** Parameters for triangular or uniform: [minRelative, modeRelative, maxRelative] e.g. [0.8, 1.0, 1.3] */
  minMultiplier?: number;
  maxMultiplier?: number;
  modeMultiplier?: number;
}

/**
 * Machine / equipment breakdown model (MTBF / MTTR).
 */
export interface EquipmentBreakdownModel {
  equipmentId?: string;
  stationId?: string;
  /** Mean Time Between Failures in seconds (operating time) */
  mtbfSeconds: number;
  /** Mean Time To Repair in seconds */
  mttrSeconds: number;
  /** Distribution of repair time: exponential or normal */
  repairDistribution: 'exponential' | 'normal' | 'constant';
  repairStdDevSeconds?: number;
}

/**
 * Overall stochastic configuration for simulation runs.
 */
export interface StochasticSimulationConfig {
  enabled: boolean;
  /** Random seed (e.g. 42). Identical seed guarantees bit-exact reproducible results */
  seed: number;
  /** Number of replications in Monte Carlo trial (e.g. 10 to 1000) */
  iterations: number;
  /** Process duration variability per operation */
  operationVariability?: {
    operationId: string;
    config: DurationVariabilityConfig;
  }[];
  /** Global default variability for all operations if not specified */
  defaultOperationVariability?: DurationVariabilityConfig;
  /** Machine / equipment breakdown declarations */
  breakdowns?: EquipmentBreakdownModel[];
}

/**
 * Result of a single Monte Carlo trial replication.
 */
export interface StochasticIterationResult {
  iterationIndex: number;
  seed: number;
  makespanSeconds: number;
  throughputPerHour: number;
  bottleneckStationId: string;
  totalBreakdownSeconds: number;
  totalWaitSeconds: number;
}

/**
 * Aggregated statistical summary across Monte Carlo trial replications.
 */
export interface StochasticSummaryReport {
  iterationsCount: number;
  seed: number;
  makespan: {
    min: number;
    max: number;
    mean: number;
    median: number;
    stdDev: number;
    p10: number;
    p90: number;
    p95: number;
  };
  throughputPerHour: {
    min: number;
    max: number;
    mean: number;
    median: number;
    stdDev: number;
    p10: number;
    p90: number;
  };
  bottleneckFrequency: {
    stationId: string;
    count: number;
    percentage: number;
  }[];
  iterations: StochasticIterationResult[];
}

/**
 * Validates stochastic simulation configuration.
 */
export function validateStochasticConfig(
  value: unknown,
  stationIds: Set<string>,
  operationIds: Set<string>
): StochasticSimulationConfig {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('Konfiguracja stochastyczna: wymagany obiekt konfiguracji.');
  }
  const raw = value as Record<string, unknown>;

  const enabled = raw.enabled === true;
  const seed = typeof raw.seed === 'number' && Number.isFinite(raw.seed) ? Math.floor(raw.seed) : 42;

  let iterations = 10;
  if (raw.iterations !== undefined) {
    if (typeof raw.iterations !== 'number' || !Number.isInteger(raw.iterations) || raw.iterations < 1 || raw.iterations > 2000) {
      throw new Error('Liczba replikacji Monte Carlo musi być liczbą całkowitą od 1 do 2000.');
    }
    iterations = raw.iterations;
  }

  // Validate operation variability
  let operationVariability: StochasticSimulationConfig['operationVariability'] = undefined;
  if (raw.operationVariability !== undefined) {
    if (!Array.isArray(raw.operationVariability)) throw new Error('operationVariability musi być listą.');
    operationVariability = raw.operationVariability.map((item, idx) => {
      if (!item || typeof item !== 'object') throw new Error(`operationVariability[${idx}]: wymagany obiekt.`);
      const opId = String(item.operationId || '').trim();
      if (!opId || !operationIds.has(opId)) {
        throw new Error(`operationVariability[${idx}]: nieznana operacja '${opId}'.`);
      }
      return {
        operationId: opId,
        config: validateDurationVariability(item.config, `Operacja ${opId}`)
      };
    });
  }

  let defaultOperationVariability: DurationVariabilityConfig | undefined = undefined;
  if (raw.defaultOperationVariability !== undefined) {
    defaultOperationVariability = validateDurationVariability(raw.defaultOperationVariability, 'Domyślna zmienność operacji');
  }

  let breakdowns: EquipmentBreakdownModel[] | undefined = undefined;
  if (raw.breakdowns !== undefined) {
    if (!Array.isArray(raw.breakdowns)) throw new Error('breakdowns musi być listą.');
    breakdowns = raw.breakdowns.map((item, idx) => {
      if (!item || typeof item !== 'object') throw new Error(`breakdowns[${idx}]: wymagany obiekt.`);
      const b = item as Record<string, unknown>;
      const stationId = b.stationId !== undefined ? String(b.stationId).trim() : undefined;
      if (stationId && !stationIds.has(stationId)) {
        throw new Error(`Awaria [${idx}]: nieznane stanowisko '${stationId}'.`);
      }
      const mtbf = Number(b.mtbfSeconds);
      if (!Number.isFinite(mtbf) || mtbf <= 0) {
        throw new Error(`Awaria [${idx}]: MTBF musi być dodatnią liczbą sekund.`);
      }
      const mttr = Number(b.mttrSeconds);
      if (!Number.isFinite(mttr) || mttr <= 0) {
        throw new Error(`Awaria [${idx}]: MTTR musi być dodatnią liczbą sekund.`);
      }
      const repairDist = b.repairDistribution;
      if (repairDist !== 'exponential' && repairDist !== 'normal' && repairDist !== 'constant') {
        throw new Error(`Awaria [${idx}]: niepoprawny rozkład czasu naprawy (dozwolone: exponential, normal, constant).`);
      }
      const repairStdDev = b.repairStdDevSeconds !== undefined ? Number(b.repairStdDevSeconds) : undefined;
      return {
        ...(stationId ? {stationId} : {}),
        mtbfSeconds: mtbf,
        mttrSeconds: mttr,
        repairDistribution: repairDist,
        ...(repairStdDev !== undefined ? {repairStdDevSeconds: repairStdDev} : {})
      };
    });
  }

  return {
    enabled,
    seed,
    iterations,
    ...(operationVariability ? {operationVariability} : {}),
    ...(defaultOperationVariability ? {defaultOperationVariability} : {}),
    ...(breakdowns ? {breakdowns} : {})
  };
}

function validateDurationVariability(value: unknown, label: string): DurationVariabilityConfig {
  if (!value || typeof value !== 'object') throw new Error(`${label}: wymagany obiekt konfiguracji zmienności.`);
  const v = value as Record<string, unknown>;
  const dist = v.distribution;
  if (dist !== 'constant' && dist !== 'normal' && dist !== 'triangular' && dist !== 'uniform' && dist !== 'lognormal') {
    throw new Error(`${label}: niepoprawny rozkład (dozwolone: constant, normal, triangular, uniform, lognormal).`);
  }
  return {
    distribution: dist,
    relativeStdDev: v.relativeStdDev !== undefined ? Number(v.relativeStdDev) : undefined,
    minMultiplier: v.minMultiplier !== undefined ? Number(v.minMultiplier) : undefined,
    maxMultiplier: v.maxMultiplier !== undefined ? Number(v.maxMultiplier) : undefined,
    modeMultiplier: v.modeMultiplier !== undefined ? Number(v.modeMultiplier) : undefined,
  };
}

/**
 * Samples a duration multiplier from a given variability configuration.
 */
export function sampleDuration(baseSeconds: number, config: DurationVariabilityConfig, rng: DeterministicRNG): number {
  if (config.distribution === 'constant' || baseSeconds <= 0) return baseSeconds;

  let sampled = baseSeconds;
  if (config.distribution === 'normal') {
    const cv = config.relativeStdDev ?? 0.1;
    const stdDev = baseSeconds * cv;
    sampled = Math.max(0.001, rng.normal(baseSeconds, stdDev));
  } else if (config.distribution === 'triangular') {
    const minM = config.minMultiplier ?? 0.85;
    const modeM = config.modeMultiplier ?? 1.0;
    const maxM = config.maxMultiplier ?? 1.25;
    sampled = rng.triangular(baseSeconds * minM, baseSeconds * modeM, baseSeconds * maxM);
  } else if (config.distribution === 'uniform') {
    const minM = config.minMultiplier ?? 0.85;
    const maxM = config.maxMultiplier ?? 1.15;
    sampled = rng.uniform(baseSeconds * minM, baseSeconds * maxM);
  } else if (config.distribution === 'lognormal') {
    const cv = config.relativeStdDev ?? 0.1;
    const sigma2 = Math.log(1 + cv * cv);
    const sigma = Math.sqrt(sigma2);
    const mu = Math.log(baseSeconds) - 0.5 * sigma2;
    sampled = Math.max(0.001, rng.logNormal(mu, sigma));
  }

  return Math.max(0.001, Number(sampled.toFixed(3)));
}

/**
 * Computes descriptive statistics (quantiles, mean, stdDev) for a numeric series.
 */
export function computePercentileStats(values: number[]): {
  min: number;
  max: number;
  mean: number;
  median: number;
  stdDev: number;
  p10: number;
  p90: number;
  p95: number;
} {
  if (!values.length) {
    return {min: 0, max: 0, mean: 0, median: 0, stdDev: 0, p10: 0, p90: 0, p95: 0};
  }
  const sorted = [...values].sort((a, b) => a - b);
  const n = sorted.length;
  const min = sorted[0];
  const max = sorted[n - 1];
  const sum = sorted.reduce((acc, v) => acc + v, 0);
  const mean = sum / n;
  const variance = sorted.reduce((acc, v) => acc + (v - mean) ** 2, 0) / (n > 1 ? n - 1 : 1);
  const stdDev = Math.sqrt(variance);

  const getPercentile = (p: number) => {
    const idx = (n - 1) * p;
    const lower = Math.floor(idx);
    const upper = Math.ceil(idx);
    const weight = idx - lower;
    return sorted[lower] * (1 - weight) + sorted[upper] * weight;
  };

  return {
    min: Number(min.toFixed(2)),
    max: Number(max.toFixed(2)),
    mean: Number(mean.toFixed(2)),
    median: Number(getPercentile(0.5).toFixed(2)),
    stdDev: Number(stdDev.toFixed(2)),
    p10: Number(getPercentile(0.1).toFixed(2)),
    p90: Number(getPercentile(0.9).toFixed(2)),
    p95: Number(getPercentile(0.95).toFixed(2)),
  };
}

/**
 * Aggregates multiple replication runs into a comprehensive summary report.
 */
export function buildStochasticSummary(
  iterations: StochasticIterationResult[],
  seed: number
): StochasticSummaryReport {
  const makespans = iterations.map(it => it.makespanSeconds);
  const throughputs = iterations.map(it => it.throughputPerHour);

  const bottleneckCounts = new Map<string, number>();
  for (const it of iterations) {
    bottleneckCounts.set(it.bottleneckStationId, (bottleneckCounts.get(it.bottleneckStationId) ?? 0) + 1);
  }

  const bottleneckFrequency = Array.from(bottleneckCounts.entries())
    .map(([stationId, count]) => ({
      stationId,
      count,
      percentage: Number(((count / iterations.length) * 100).toFixed(1))
    }))
    .sort((a, b) => b.count - a.count);

  const makespanStats = computePercentileStats(makespans);
  const thStats = computePercentileStats(throughputs);

  return {
    iterationsCount: iterations.length,
    seed,
    makespan: makespanStats,
    throughputPerHour: {
      min: thStats.min,
      max: thStats.max,
      mean: thStats.mean,
      median: thStats.median,
      stdDev: thStats.stdDev,
      p10: thStats.p10,
      p90: thStats.p90
    },
    bottleneckFrequency,
    iterations
  };
}

/**
 * Perturbs a project's operation durations and station calendars (for breakdowns)
 * deterministically for a single replication iteration.
 */
export function perturbProjectForIteration(
  project: DomainProjectV6,
  config: StochasticSimulationConfig,
  iterationIndex: number
): {
  project: DomainProjectV6;
  seed: number;
  totalBreakdownSeconds: number;
} {
  const iterationSeed = (config.seed + iterationIndex * 1013904223) >>> 0;
  const rng = new DeterministicRNG(iterationSeed);

  // Map of specific operation configs
  const opConfigMap = new Map<string, DurationVariabilityConfig>();
  if (config.operationVariability) {
    for (const item of config.operationVariability) {
      opConfigMap.set(item.operationId, item.config);
    }
  }

  // Deep copy operations with perturbed time profiles
  const perturbedOperations = project.operations.map(op => {
    const varConfig = opConfigMap.get(op.id) ?? config.defaultOperationVariability;
    if (!varConfig || varConfig.distribution === 'constant') {
      return op;
    }

    const scaleProfile = (profile: DomainTimeProfile): DomainTimeProfile => {
      const origDuration = profile.durationSeconds;
      const sampled = sampleDuration(origDuration, varConfig, rng);
      const ratio = origDuration > 0 ? sampled / origDuration : 1.0;

      const scaleIntervals = (intervals: DomainTimeInterval[]): DomainTimeInterval[] => {
        let prevEnd = 0;
        return intervals.map(int => {
          const start = Math.max(prevEnd, Number((int.startSeconds * ratio).toFixed(3)));
          const end = Math.max(start + 0.001, Number((int.endSeconds * ratio).toFixed(3)));
          prevEnd = end;
          return {
            startSeconds: start,
            endSeconds: Math.min(sampled, end),
            basis: int.basis
          };
        });
      };

      const manualWork = scaleIntervals(profile.manualWork);
      const machineRun = scaleIntervals(profile.machineRun);
      const operatorPresence = scaleIntervals(profile.operatorPresence);

      // Ensure manual work is fully covered by operator presence
      for (const m of manualWork) {
        if (!operatorPresence.some(p => p.startSeconds <= m.startSeconds && p.endSeconds >= m.endSeconds)) {
          // If rounding caused slight drift, adjust operatorPresence
          operatorPresence.push({
            startSeconds: m.startSeconds,
            endSeconds: m.endSeconds,
            basis: m.basis
          });
        }
      }

      return {
        durationSeconds: sampled,
        durationBasis: profile.durationBasis,
        manualWork,
        machineRun,
        operatorPresence
      };
    };

    const newTimeProfile = op.timeProfile ? scaleProfile(op.timeProfile) : undefined;
    const newStaffing = op.staffing ? {
      ...op.staffing,
      timeVariants: op.staffing.timeVariants.map(v => ({
        workerCount: v.workerCount,
        timeProfile: scaleProfile(v.timeProfile)
      }))
    } : undefined;

    return {
      ...op,
      ...(newTimeProfile ? {timeProfile: newTimeProfile} : {}),
      ...(newStaffing ? {staffing: newStaffing} : {})
    };
  });

  // Handle machine / equipment breakdowns by inserting calendar breaks into station calendars
  let totalBreakdownSeconds = 0;
  let newCalendars: ResourceCalendarsV6 | undefined = project.resourceCalendars
    ? JSON.parse(JSON.stringify(project.resourceCalendars))
    : undefined;

  if (config.breakdowns && config.breakdowns.length > 0) {
    if (!newCalendars) {
      newCalendars = {
        workers: {},
        stations: {}
      };
    }

    // Ensure all workers have explicit calendar if calendars are activated
    for (const w of project.workers) {
      if (!newCalendars.workers[w.id]) {
        newCalendars.workers[w.id] = {
          shifts: [{startSeconds: 0, endSeconds: 86400, basis: 'assumed'}],
          breaks: []
        };
      }
    }

    // Ensure all stations have explicit calendar
    for (const s of project.stations) {
      if (!newCalendars.stations[s.id]) {
        newCalendars.stations[s.id] = {
          shifts: [{startSeconds: 0, endSeconds: 86400, basis: 'assumed'}],
          breaks: []
        };
      }
    }

    for (const b of config.breakdowns) {
      const targetStationIds = b.stationId
        ? [b.stationId]
        : project.stations.map(s => s.id);

      for (const stId of targetStationIds) {
        const stationCal: ResourceCalendar | undefined = newCalendars.stations[stId];
        if (!stationCal) continue;

        // Sample failure occurrences along simulation horizon (reasonable horizon, e.g. 7200s or shift end)
        const maxTime = Math.min(7200, Math.max(3600, ...stationCal.shifts.map((s: DeclaredCalendarWindow) => s.endSeconds)));
        let currentTime = 0;

        while (currentTime < maxTime && stationCal.breaks.length < 500) {
          // Time to next failure (exponential based on MTBF)
          const timeToFailure = Math.max(10, rng.exponential(b.mtbfSeconds));
          currentTime += timeToFailure;
          if (currentTime >= maxTime) break;

          // Repair duration
          let repairDuration = b.mttrSeconds;
          if (b.repairDistribution === 'exponential') {
            repairDuration = Math.max(1, rng.exponential(b.mttrSeconds));
          } else if (b.repairDistribution === 'normal') {
            const std = b.repairStdDevSeconds ?? (b.mttrSeconds * 0.2);
            repairDuration = Math.max(1, rng.normal(b.mttrSeconds, std));
          }

          const breakStart = Math.round(currentTime);
          const breakEnd = Math.round(currentTime + repairDuration);
          totalBreakdownSeconds += repairDuration;

          // Add to station calendar breaks within matching shift
          const shift = stationCal.shifts.find((s: DeclaredCalendarWindow) => s.startSeconds <= breakStart && breakEnd <= s.endSeconds);
          if (shift) {
            stationCal.breaks.push({
              startSeconds: breakStart,
              endSeconds: breakEnd,
              basis: 'assumed'
            });
          }

          currentTime += repairDuration;
        }

        // Sort breaks and remove overlaps
        stationCal.breaks.sort((x: DeclaredCalendarWindow, y: DeclaredCalendarWindow) => x.startSeconds - y.startSeconds);
        const mergedBreaks: DeclaredCalendarWindow[] = [];
        for (const brk of stationCal.breaks) {
          if (!mergedBreaks.length) {
            mergedBreaks.push(brk);
          } else {
            const last = mergedBreaks[mergedBreaks.length - 1];
            if (brk.startSeconds <= last.endSeconds) {
              last.endSeconds = Math.max(last.endSeconds, brk.endSeconds);
            } else {
              mergedBreaks.push(brk);
            }
          }
        }
        stationCal.breaks = mergedBreaks;
      }
    }
  }

  const perturbedProject: DomainProjectV6 = {
    ...project,
    operations: perturbedOperations,
    ...(newCalendars ? {resourceCalendars: newCalendars} : {})
  };

  return {
    project: perturbedProject,
    seed: iterationSeed,
    totalBreakdownSeconds: Number(totalBreakdownSeconds.toFixed(2))
  };
}

/**
 * Runs a multi-replication Monte Carlo simulation experiment using deterministic seeds.
 */
export function runMonteCarloSimulation(
  project: DomainProjectV6,
  batch: number,
  arrivalIntervalSeconds: number,
  options: {
    transportMode?: TransportSimulationMode;
    onIterationProgress?: (completed: number, total: number) => void;
  } = {}
): StochasticSummaryReport {
  const config = project.stochasticConfig;
  if (!config || !config.enabled) {
    throw new Error('Symulacja stochastyczna: konfiguracja stochastyczna nie jest włączona w projekcie.');
  }

  const totalIterations = config.iterations;
  const iterationResults: StochasticIterationResult[] = [];

  for (let i = 0; i < totalIterations; i++) {
    const {project: perturbed, seed: itSeed, totalBreakdownSeconds} = perturbProjectForIteration(project, config, i);

    // Run standard worker schedule simulation on perturbed model
    const scheduleResult = scheduleWorkerRun(
      perturbed,
      arrivalIntervalSeconds,
      batch,
      perturbed.bodyRunInput,
      undefined,
      {transportMode: options.transportMode}
    );

    const makespan = Math.max(0, ...scheduleResult.jobs.map(j => j.finish));
    const throughputPerHour = makespan > 0 ? Number(((batch / makespan) * 3600).toFixed(2)) : 0;

    // Detect bottleneck station from run durations
    const stationOccupancy = new Map<string, number>();
    for (const run of scheduleResult.runs) {
      const occ = (run.endSeconds - run.startSeconds) + (run.blockedSeconds ?? 0) + (run.continuationWaitSeconds ?? 0);
      stationOccupancy.set(run.stationId, (stationOccupancy.get(run.stationId) ?? 0) + occ);
    }

    let maxOccupancy = -1;
    let bottleneckStationId = project.stations[0]?.id ?? 'unknown';
    for (const [stId, occ] of stationOccupancy.entries()) {
      if (occ > maxOccupancy) {
        maxOccupancy = occ;
        bottleneckStationId = stId;
      }
    }

    const totalWaitSeconds = scheduleResult.runs.reduce((sum, r) => sum + r.waitSeconds, 0);

    iterationResults.push({
      iterationIndex: i + 1,
      seed: itSeed,
      makespanSeconds: Number(makespan.toFixed(2)),
      throughputPerHour,
      bottleneckStationId,
      totalBreakdownSeconds,
      totalWaitSeconds: Number(totalWaitSeconds.toFixed(2))
    });

    options.onIterationProgress?.(i + 1, totalIterations);
  }

  return buildStochasticSummary(iterationResults, config.seed);
}
