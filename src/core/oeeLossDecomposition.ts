import type {DemandConfig, ProjectData} from './models/types';
import type {DomainProjectV6} from './domainProject';
import {calculateTaktTime} from './algorithms/taktCalculator';

/**
 * Breakdown of operational losses that are explicitly modelled in the simulation engine.
 */
export interface ExplicitModelLosses {
  availability: {
    breakdownPercent: number;
    changeoverPercent: number;
    calendarBreaksPercent: number;
    totalAvailabilityLossPercent: number;
  };
  performance: {
    variabilitySlowdownPercent: number;
    transportDelayPercent: number;
    bufferBlockagePercent: number;
    totalPerformanceLossPercent: number;
  };
  quality: {
    scrapReworkPercent: number;
    totalQualityLossPercent: number;
  };
  totalExplicitLossPercent: number;
}

/**
 * Result of OEE loss decomposition and double-counting risk assessment.
 */
export interface OeeDecompositionResult {
  /** The overall static OEE reserve entered in Demand (e.g. 85%). */
  lumpedOeePercent: number;
  /** Losses explicitly captured in dynamic model/simulation. */
  explicitLosses: ExplicitModelLosses;
  /**
   * The residual unmodelled OEE reserve.
   * If explicit losses are 12% and lumped loss is 15%, residual loss is ~3% (Residual OEE ~97%).
   */
  residualOeePercent: number;
  /** Risk level of double-counting operational losses. */
  doubleCountingRisk: 'none' | 'moderate' | 'high';
  /** Human-readable explanation of the breakdown. */
  explanation: string;
  /** Lean industrial engineering recommendation. */
  recommendation: string;
  /** Comparison of takt times across approaches. */
  taktComparison: {
    /** Pure customer takt (time available / demand, without any loss deductions). */
    customerTaktSeconds: number;
    /** Standard takt with full lumped OEE reserve (risk of double counting if simulation also adds losses). */
    nominalTaktSeconds: number;
    /** Adjusted takt deducting only residual unmodelled losses. */
    adjustedTaktSeconds: number;
    /** Difference in required cycle / takt time [s]. */
    deltaSeconds: number;
  };
}

/**
 * Analyzes a domain project (V6 or legacy ProjectData) to quantify explicit losses modelled in simulation.
 */
export function analyzeExplicitProjectLosses(
  project: DomainProjectV6 | ProjectData,
  demand: DemandConfig
): ExplicitModelLosses {
  const hoursPerShift = demand.hoursPerShift || 8;
  const shiftSeconds = hoursPerShift * 3600;

  // 1. Breakdowns (MTBF / MTTR) from stochasticConfig
  let breakdownPercent = 0;
  const v6 = project as DomainProjectV6;
  if (v6.stochasticConfig?.enabled && v6.stochasticConfig.breakdowns?.length) {
    // Average station unavailability due to breakdowns: MTTR / (MTBF + MTTR)
    const breakdownRatios = v6.stochasticConfig.breakdowns.map(b => {
      const mtbf = Math.max(1, b.mtbfSeconds);
      const mttr = Math.max(0, b.mttrSeconds);
      return mttr / (mtbf + mttr);
    });
    // Peak or average across stations
    const avgRatio = breakdownRatios.reduce((sum, r) => sum + r, 0) / breakdownRatios.length;
    breakdownPercent = Math.min(50, Math.round(avgRatio * 1000) / 10);
  }

  // 2. Changeovers from changeoverMatrix & productionOrders
  let changeoverPercent = 0;
  if (v6.changeoverMatrix && (v6.productionOrders?.length ?? 0) > 1) {
    const orders = v6.productionOrders!;
    let totalChangeoverSeconds = 0;
    const defaultDuration = v6.changeoverMatrix.defaultDurationSeconds || 0;

    for (let i = 1; i < orders.length; i++) {
      const from = orders[i - 1].variantId;
      const to = orders[i].variantId;
      if (from !== to) {
        const trans = v6.changeoverMatrix.transitions?.find(
          t => (t.fromVariantId === from || t.fromVariantId === '*') && (t.toVariantId === to || t.toVariantId === '*')
        );
        totalChangeoverSeconds += trans ? trans.durationSeconds : defaultDuration;
      }
    }
    // Estimated per-shift changeover impact
    const totalBatchUnits = orders.reduce((sum, o) => sum + o.quantity, 0);
    const dailyDemand = demand.workingDaysPerYear > 0 ? demand.yearlyDemand / demand.workingDaysPerYear : 100;
    const shiftsPerBatch = dailyDemand > 0 ? Math.max(1, (totalBatchUnits / dailyDemand) * demand.shiftsPerDay) : 1;
    const changeoverPerShift = totalChangeoverSeconds / shiftsPerBatch;
    changeoverPercent = Math.min(30, Math.round((changeoverPerShift / shiftSeconds) * 1000) / 10);
  }

  // 3. Planned breaks from resourceCalendars
  let calendarBreaksPercent = 0;
  if (v6.resourceCalendars?.stations) {
    const stationCals = Object.values(v6.resourceCalendars.stations);
    if (stationCals.length > 0) {
      const totalPauseSec = stationCals.reduce((sum, c) => {
        const stPause = (c.breaks || []).reduce((pSum, b) => pSum + (b.endSeconds - b.startSeconds), 0);
        return sum + stPause;
      }, 0) / stationCals.length;
      calendarBreaksPercent = Math.min(40, Math.round((totalPauseSec / shiftSeconds) * 1000) / 10);
    }
  } else if (demand.plannedBreaksMinutesPerShift > 0) {
    // If entered in demand config
    calendarBreaksPercent = Math.round(((demand.plannedBreaksMinutesPerShift * 60) / shiftSeconds) * 1000) / 10;
  }

  const totalAvailabilityLossPercent = Math.min(80, breakdownPercent + changeoverPercent + calendarBreaksPercent);

  // 4. Performance losses: variability, transport, buffers
  let variabilitySlowdownPercent = 0;
  if (v6.stochasticConfig?.enabled && v6.stochasticConfig.defaultOperationVariability) {
    const v = v6.stochasticConfig.defaultOperationVariability;
    if (v.distribution === 'triangular' && v.modeMultiplier && v.modeMultiplier > 1.0) {
      variabilitySlowdownPercent = Math.round((v.modeMultiplier - 1.0) * 1000) / 10;
    } else if (v.relativeStdDev) {
      variabilitySlowdownPercent = Math.round(v.relativeStdDev * 200) / 10; // ~20% of stdDev as buffering loss
    }
  }

  let transportDelayPercent = 0;
  if (v6.assemblyTransport && v6.stationRouting?.routes?.length) {
    transportDelayPercent = 2.5; // Estimated transfer/approach overhead
  }

  let bufferBlockagePercent = 0;
  if (v6.stationBuffers?.buffers?.some(b => b.outputCapacity !== null && b.outputCapacity < 3)) {
    bufferBlockagePercent = 2.0; // Estimated BBAS blockage impact
  }

  const totalPerformanceLossPercent = Math.min(50, variabilitySlowdownPercent + transportDelayPercent + bufferBlockagePercent);

  // 5. Quality losses (default 0% unless specified)
  const scrapReworkPercent = 0;
  const totalQualityLossPercent = scrapReworkPercent;

  const totalExplicitLossPercent = Math.min(
    90,
    Math.round((totalAvailabilityLossPercent + totalPerformanceLossPercent + totalQualityLossPercent) * 10) / 10
  );

  return {
    availability: {
      breakdownPercent,
      changeoverPercent,
      calendarBreaksPercent,
      totalAvailabilityLossPercent,
    },
    performance: {
      variabilitySlowdownPercent,
      transportDelayPercent,
      bufferBlockagePercent,
      totalPerformanceLossPercent,
    },
    quality: {
      scrapReworkPercent,
      totalQualityLossPercent,
    },
    totalExplicitLossPercent,
  };
}

/**
 * Decomposes OEE into explicit simulation losses and residual unmodelled losses.
 * Protects against double counting of losses in line balancing and takt time.
 */
export function decomposeOee(
  demand: DemandConfig,
  explicitLosses: ExplicitModelLosses
): OeeDecompositionResult {
  const lumpedOee = Math.max(1, Math.min(100, demand.oeePercent || 85));
  const lumpedLoss = 100 - lumpedOee;

  // Total explicit losses modelled in simulation
  const explicitLoss = explicitLosses.totalExplicitLossPercent;

  // Residual loss: remaining unmodelled buffer
  // If lumped loss is 15% and explicit loss is 10%, residual loss is 5% -> residual OEE = 95%
  // If explicit loss >= lumped loss, residual loss is 0% (residual OEE = 100%)
  const residualLoss = Math.max(0, Math.round((lumpedLoss - explicitLoss) * 10) / 10);
  const residualOee = Math.min(100, Math.max(50, Math.round((100 - residualLoss) * 10) / 10));

  // Double counting risk evaluation
  let doubleCountingRisk: 'none' | 'moderate' | 'high' = 'none';
  if (explicitLoss >= 5 && lumpedLoss >= 10) {
    if (explicitLoss + lumpedLoss >= 25) {
      doubleCountingRisk = 'high';
    } else {
      doubleCountingRisk = 'moderate';
    }
  }

  // Takt time calculations
  const standardTakt = calculateTaktTime(demand);
  const customerTaktSeconds = standardTakt.customerTaktSeconds;
  const nominalTaktSeconds = standardTakt.taktTimeSeconds;

  // Adjusted takt: applies only residual unmodelled losses to customer takt,
  // because explicit losses (breakdowns, changeovers, transport) are already simulated dynamically.
  const adjustedTaktSeconds = Math.round((customerTaktSeconds * (residualOee / 100)) * 100) / 100;
  const deltaSeconds = Math.round((adjustedTaktSeconds - nominalTaktSeconds) * 100) / 100;

  // Explanations & recommendations
  let explanation = '';
  let recommendation = '';

  if (doubleCountingRisk === 'high') {
    explanation = `Wykryto wysokie ryzyko podwójnego naliczenia strat (${explicitLoss.toFixed(1)}% strat jawnie symulowanych vs ${lumpedLoss.toFixed(1)}% ryczałtowej rezerwy OEE w popycie). Przezbrojenia, awarie maszyn i transport są już symulowane dynamicznie na osi czasu.`;
    recommendation = `Zalecenie Lean: Skoryguj wskaźnik OEE w module Popytu do poziomu rezydualnego (${residualOee.toFixed(1)}%) lub użyj skorygowanego Taksu (${adjustedTaktSeconds} s zamiast ${nominalTaktSeconds} s). Unikniesz sztucznego zawyżenia wymaganej liczby stanowisk.`;
  } else if (doubleCountingRisk === 'moderate') {
    explanation = `Model zawiera jawne straty symulacyjne (${explicitLoss.toFixed(1)}%), które częściowo pokrywają się z rezerwą OEE (${lumpedLoss.toFixed(1)}%).`;
    recommendation = `Zalecenie Lean: Upewnij się, czy awarie i przezbrojenia nie są uwzględniane podwójnie w bilansie linii i w symulacji.`;
  } else {
    explanation = `Brak istotnego ryzyka podwójnego naliczania strat. Rezerwa OEE (${lumpedOee}%) odzwierciedla straty całościowe lub straty jawne są minimalne (${explicitLoss.toFixed(1)}%).`;
    recommendation = `Standardowy Takt Time (${nominalTaktSeconds} s) jest spójny z założeniami popytu.`;
  }

  return {
    lumpedOeePercent: lumpedOee,
    explicitLosses,
    residualOeePercent: residualOee,
    doubleCountingRisk,
    explanation,
    recommendation,
    taktComparison: {
      customerTaktSeconds,
      nominalTaktSeconds,
      adjustedTaktSeconds,
      deltaSeconds,
    },
  };
}
