import {parseDomainProjectV6, domainOperationOrder, type DomainProjectV6} from './domainProject';
import {proposeDomainBalance, applyDomainBalance} from './domainBalancing';
import {teamCoversCompetencies, assertCompetentTeamExists} from './competencies';
import {explainThroughput, type ThroughputExplanation} from './throughputExplanation';
import {scheduleWorkerRun, type WorkerScheduleResult} from './workerSchedule';
import {
  type DomainVariantCategory,
  type SavedDomainVariant,
  type StaticVariantSummary,
  type VariantComparisonRow,
  type VariantDynamicOutcome,
  type VariantExperimentConditions,
  type VariantFactorDiff,
  type VariantScheduleOutcomeInput,
  buildVariantComparisonReport,
  domainVariantCategoryLabels,
  inspectVariantFactors,
  summarizeStaticVariant,
  validateExperimentConditions,
} from './domainVariantComparison';

export const NON_OPTIMUM_DISCLAIMER =
  'Propozycje zmian są generowane heurystycznie wyłącznie na podstawie jawnie zadeklarowanych zasobów, wariantów czasu, kompetencji, kopii stanowisk i buforów w szkicu 6 oraz obserwowanych dowodów z harmonogramu. Wynik sprawdzenia w symulacji weryfikuje wykonalność i efekt dla zadanych warunków eksperymentu — nie stanowi deklaracji ani dowodu gwarantowanego optimum globalnego.';

export type DomainProposalKind =
  | 'add-team-worker'
  | 'expand-worker-eligibility'
  | 'change-staffing-variant'
  | 'activate-station-copy'
  | 'rebalance-work'
  | 'release-blocked-worker'
  | 'saved-variant';

export const domainProposalKindLabels: Record<DomainProposalKind, string> = {
  'add-team-worker': 'Dodanie zadeklarowanego pracownika do obsady przebiegu',
  'expand-worker-eligibility': 'Rozszerzenie dopuszczenia członka zespołu do operacji',
  'change-staffing-variant': 'Zmiana jawnego wariantu obsady operacji',
  'activate-station-copy': 'Włączenie / dopuszczenie dodatkowej kopii stanowiska',
  'rebalance-work': 'Reorganizacja przydziału operacji (bilans RPW / LCR)',
  'release-blocked-worker': 'Zwolnienie operatora przy blokadzie wyjścia bufora',
  'saved-variant': 'Zapisany wariant porównawczy z biblioteki szkicu 6',
};

export type DomainProposalVerificationStatus = 'improved' | 'unchanged' | 'regressed' | 'refused';

export const domainProposalVerificationLabels: Record<DomainProposalVerificationStatus, string> = {
  improved: 'Poprawa w symulacji',
  unchanged: 'Brak zmiany czasu przejścia / makespanu',
  regressed: 'Pogorszenie w symulacji',
  refused: 'Odmowa / niewykonalność dynamiczna',
};

export interface DomainImprovementProposalCandidate {
  id: string;
  kind: DomainProposalKind;
  variantCategory: DomainVariantCategory;
  title: string;
  targetSummary: string;
  rationale: string;
  evidenceSignals: string[];
  proposedProject: DomainProjectV6;
  factorDiff: VariantFactorDiff;
  staticBaseline: StaticVariantSummary;
  staticProposed: StaticVariantSummary;
}

export interface VerifiedDomainImprovementProposal extends DomainImprovementProposalCandidate {
  verificationStatus: DomainProposalVerificationStatus;
  verificationSummary: string;
  staticVsDynamicNote: string;
  baselineDynamic: VariantDynamicOutcome;
  proposedDynamic: VariantDynamicOutcome;
  nonOptimumDisclaimer: string;
}

export interface DomainImprovementProposalsReport {
  generatedAt: string;
  dataVersion: {
    draftSchemaVersion: 6;
    sourceSchemaVersion: 4 | 5;
  };
  conditions: VariantExperimentConditions;
  nonOptimumDisclaimer: string;
  baselineStatic: StaticVariantSummary;
  baselineDynamic: VariantDynamicOutcome;
  proposals: VerifiedDomainImprovementProposal[];
  skippedReasons: string[];
}

const round = (value: number) => Math.round(value * 1000) / 1000;

function cloneProject(project: DomainProjectV6): DomainProjectV6 {
  return parseDomainProjectV6(JSON.stringify(project));
}

function collectBaselineEvidence(
  project: DomainProjectV6,
  baselineResult?: WorkerScheduleResult | null,
): {
  explanation: ThroughputExplanation | null;
  staticSummary: StaticVariantSummary;
  workerWaitSeconds: number;
  workerMixedCount: number;
  blockingHoldSeconds: number;
  blockingWaitSeconds: number;
  transportWaitSeconds: number;
  busiestCopy: {stationId: string; copy: number; seconds: number; share: number} | null;
} {
  const staticSummary = summarizeStaticVariant(project);
  if (!baselineResult) {
    return {
      explanation: null,
      staticSummary,
      workerWaitSeconds: 0,
      workerMixedCount: 0,
      blockingHoldSeconds: 0,
      blockingWaitSeconds: 0,
      transportWaitSeconds: 0,
      busiestCopy: null,
    };
  }
  const explanation = explainThroughput(baselineResult);
  const byCategory = new Map(explanation.signals.map(s => [s.category, s]));
  return {
    explanation,
    staticSummary,
    workerWaitSeconds: byCategory.get('workers')?.singleCauseWaitSeconds ?? 0,
    workerMixedCount: byCategory.get('workers')?.mixedWaitCount ?? 0,
    blockingHoldSeconds: byCategory.get('blocking')?.workSeconds ?? 0,
    blockingWaitSeconds: byCategory.get('blocking')?.singleCauseWaitSeconds ?? 0,
    transportWaitSeconds: byCategory.get('transport')?.singleCauseWaitSeconds ?? 0,
    busiestCopy: explanation.processingByCopy[0] ?? null,
  };
}

function copyHasRequiredEquipment(
  project: DomainProjectV6,
  stationId: string,
  copy: number,
  requiredEquipmentIds: readonly string[],
): boolean {
  if (!requiredEquipmentIds.length) return true;
  const placements = project.stationRouting?.equipmentPlacements ?? [];
  const availableOnCopy = new Set(
    placements
      .filter(p => p.stationId === stationId && p.copy === copy)
      .map(p => p.equipmentId),
  );
  return requiredEquipmentIds.every(eqId => availableOnCopy.has(eqId));
}

/**
 * Generate concrete, non-invented change candidates from an active Draft 6 project
 * and optional baseline schedule result + saved variant library.
 */
export function generateDomainImprovementCandidates(
  inputProject: DomainProjectV6,
  baselineResult?: WorkerScheduleResult | null,
  savedVariants?: readonly SavedDomainVariant[],
): {candidates: DomainImprovementProposalCandidate[]; skippedReasons: string[]} {
  const project = cloneProject(inputProject);
  const baselineJson = JSON.stringify(project);
  const seenProjects = new Set<string>([baselineJson]);
  const candidates: DomainImprovementProposalCandidate[] = [];
  const skippedReasons: string[] = [];

  const ev = collectBaselineEvidence(project, baselineResult);
  const staticBaseline = ev.staticSummary;

  const pushCandidate = (
    id: string,
    kind: DomainProposalKind,
    variantCategory: DomainVariantCategory,
    title: string,
    targetSummary: string,
    rationale: string,
    evidenceSignals: string[],
    proposedRaw: DomainProjectV6,
  ) => {
    try {
      const validated = cloneProject(proposedRaw);
      const serialized = JSON.stringify(validated);
      if (seenProjects.has(serialized)) return;
      seenProjects.add(serialized);
      const staticProposed = summarizeStaticVariant(validated);
      const factorDiff = inspectVariantFactors(project, validated, variantCategory, false);
      candidates.push({
        id,
        kind,
        variantCategory,
        title,
        targetSummary,
        rationale,
        evidenceSignals,
        proposedProject: validated,
        factorDiff,
        staticBaseline,
        staticProposed,
      });
    } catch {
      // Candidate violates domain validation — never emit invalid proposals
    }
  };

  // 1. Additional worker from declared project.workers not yet in workerRunSelection.teamWorkerIds
  if (project.workerRunSelection) {
    const teamSet = new Set(project.workerRunSelection.teamWorkerIds);
    const unusedWorkers = project.workers.filter(w => !teamSet.has(w.id));
    if (unusedWorkers.length === 0) {
      skippedReasons.push(
        `Dodanie pracownika z rejestru: wszyscy zadeklarowani pracownicy (${project.workers.length}) należą już do aktywnego składu przebiegu (teamWorkerIds). Program nie dopowiada fikcyjnych osób.`,
      );
    }
    for (const worker of unusedWorkers) {
      const nextTeam = [...project.workerRunSelection.teamWorkerIds, worker.id];
      const eligibleOps: string[] = [];
      const nextOperations = project.workerRunSelection.operations.map(opChoice => {
        if (opChoice.eligibleWorkerIds.includes(worker.id)) {
          eligibleOps.push(opChoice.operationId);
          return opChoice;
        }
        // Check if adding worker.id keeps competency rules valid and worker contributes competencies or op has no competency restriction
        const reqs = project.competencyRequirements?.operations.find(
          item => item.operationId === opChoice.operationId,
        )?.requiredCompetencyIds ?? [];
        const workerComps = new Set(
          project.competencyRequirements?.workers.find(w => w.workerId === worker.id)?.competencyIds ?? [],
        );
        const canParticipate =
          reqs.length === 0 ||
          teamCoversCompetencies(project, opChoice.operationId, [worker.id]) ||
          (opChoice.workerCount > 1 && reqs.some(r => workerComps.has(r)));
        if (!canParticipate) return opChoice;
        const expanded = [...opChoice.eligibleWorkerIds, worker.id];
        try {
          assertCompetentTeamExists(project, opChoice.operationId, expanded, opChoice.workerCount);
          eligibleOps.push(opChoice.operationId);
          return {...opChoice, eligibleWorkerIds: expanded};
        } catch {
          return opChoice;
        }
      });

      const signals: string[] = [
        `Obsada bazowa: ${project.workerRunSelection.teamWorkerIds.length}/${project.workers.length} zadeklarowanych pracowników (${project.workerRunSelection.teamWorkerIds.join(', ')}).`,
      ];
      if (ev.workerWaitSeconds > 0 || ev.workerMixedCount > 0) {
        signals.push(
          `W harmonogramie bazowym odnotowano oczekiwanie jednoprzyczynowe na obsadę (workers): ${ev.workerWaitSeconds} s oraz ${ev.workerMixedCount} wystąpień w oczekiwaniach mieszanych.`,
        );
      } else {
        signals.push(
          'W harmonogramie bazowym czas jednoprzyczynowego oczekiwania na obsadę wyniósł 0 s; sprawdzenie w symulacji pokaże, czy dodatkowa osoba skraca oczekiwania mieszane lub czas przejścia.',
        );
      }
      if (eligibleOps.length > 0) {
        signals.push(`Pracownik ${worker.id} spełnia wymogi dopuszczenia dla operacji: ${eligibleOps.join(', ')}.`);
      }

      const rationale =
        ev.workerWaitSeconds > 0 || ev.workerMixedCount > 0
          ? `Harmonogram bazowy wykazuje oczekiwania związane z dostępnością obsady (${ev.workerWaitSeconds} s jednoprzyczynowo, ${ev.workerMixedCount} wystąpień mieszanych). Dołączenie zadeklarowanego pracownika ${worker.name} (${worker.id}) do składu przebiegu bez zmiany czasów technologicznych pozwala zweryfikować w symulacji rzeczywisty wpływ na makespan i przepustowość.`
          : `Pracownik ${worker.name} (${worker.id}) jest zadeklarowany w rejestrze projektu, ale nie należy do aktywnego składu przebiegu. Dołączenie go do zespołu pozwala sprawdzić w symulacji wpływ większej obsady przy tych samych warunkach eksperymentu.`;

      pushCandidate(
        `prop-add-worker-${worker.id}`,
        'add-team-worker',
        'additional-worker',
        `Dodaj zadeklarowanego pracownika ${worker.name} (${worker.id}) do składu przebiegu`,
        `teamWorkerIds: +${worker.id} (${project.workerRunSelection.teamWorkerIds.length} → ${nextTeam.length} os.); dopuszczenia operacji: ${eligibleOps.length ? eligibleOps.join(', ') : 'bez zmian'}`,
        rationale,
        signals,
        {
          ...project,
          workerRunSelection: {
            teamWorkerIds: nextTeam,
            operations: nextOperations,
          },
        },
      );
    }

    // 1b. Expand operation eligibility for an existing team member who is not yet in eligibleWorkerIds
    for (const opChoice of project.workerRunSelection.operations) {
      const missingTeamMembers = project.workerRunSelection.teamWorkerIds.filter(
        wId => !opChoice.eligibleWorkerIds.includes(wId),
      );
      for (const wId of missingTeamMembers) {
        const reqs = project.competencyRequirements?.operations.find(
          item => item.operationId === opChoice.operationId,
        )?.requiredCompetencyIds ?? [];
        const workerComps = new Set(
          project.competencyRequirements?.workers.find(w => w.workerId === wId)?.competencyIds ?? [],
        );
        const canParticipate =
          reqs.length === 0 ||
          teamCoversCompetencies(project, opChoice.operationId, [wId]) ||
          (opChoice.workerCount > 1 && reqs.some(r => workerComps.has(r)));
        if (!canParticipate) continue;
        const expanded = [...opChoice.eligibleWorkerIds, wId];
        try {
          assertCompetentTeamExists(project, opChoice.operationId, expanded, opChoice.workerCount);
        } catch {
          continue;
        }
        const workerName = project.workers.find(w => w.id === wId)?.name ?? wId;
        pushCandidate(
          `prop-expand-elig-${opChoice.operationId}-${wId}`,
          'expand-worker-eligibility',
          'additional-worker',
          `Dopuść członka zespołu ${workerName} (${wId}) do operacji ${opChoice.operationId}`,
          `Operacja ${opChoice.operationId}: eligibleWorkerIds [${opChoice.eligibleWorkerIds.join(', ')}] → [${expanded.join(', ')}]`,
          `Pracownik ${workerName} (${wId}) należy już do składu przebiegu i posiada wymagane kompetencje dla operacji ${opChoice.operationId}, lecz był pominięty na liście dopuszczonych wykonawców tej operacji.`,
          [
            `Skład zespołu pozostaje bez zmian (${project.workerRunSelection.teamWorkerIds.length} os.).`,
            `Operacja ${opChoice.operationId} zyskuje dodatkowego dopuszczonego wykonawcę (${wId}).`,
          ],
          {
            ...project,
            workerRunSelection: {
              ...project.workerRunSelection,
              operations: project.workerRunSelection.operations.map(item =>
                item.operationId === opChoice.operationId
                  ? {...item, eligibleWorkerIds: expanded}
                  : item,
              ),
            },
          },
        );
      }
    }

    // 2. Alternative declared staffing time variants (e.g., 1-person vs 2-person explicit variant)
    let foundAltVariants = 0;
    for (const op of project.operations) {
      const variants = op.staffing?.timeVariants ?? [];
      if (variants.length <= 1) continue;
      const currentChoice = project.workerRunSelection.operations.find(item => item.operationId === op.id);
      if (!currentChoice) continue;
      const currentVariant = variants.find(v => v.workerCount === currentChoice.workerCount);
      for (const alt of variants) {
        if (alt.workerCount === currentChoice.workerCount) continue;
        let eligible = [...currentChoice.eligibleWorkerIds];
        let team = [...project.workerRunSelection.teamWorkerIds];
        if (eligible.length < alt.workerCount) {
          // Check other existing team members first
          for (const wId of team) {
            if (!eligible.includes(wId)) eligible.push(wId);
          }
          // If still below alt.workerCount, check declared project.workers
          if (eligible.length < alt.workerCount) {
            for (const w of project.workers) {
              if (!eligible.includes(w.id)) {
                eligible.push(w.id);
                if (!team.includes(w.id)) team.push(w.id);
              }
            }
          }
        }
        if (eligible.length < alt.workerCount) continue;
        try {
          assertCompetentTeamExists(project, op.id, eligible, alt.workerCount);
        } catch {
          continue;
        }
        foundAltVariants++;
        const curDur = currentVariant?.timeProfile.durationSeconds ?? op.standardTimeSeconds;
        const altDur = alt.timeProfile.durationSeconds;
        pushCandidate(
          `prop-staff-variant-${op.id}-${alt.workerCount}`,
          'change-staffing-variant',
          'additional-worker',
          `Zmień jawny wariant obsady operacji ${op.id}: ${currentChoice.workerCount} os. (${curDur} s) → ${alt.workerCount} os. (${altDur} s)`,
          `Operacja ${op.id}: workerCount ${currentChoice.workerCount} → ${alt.workerCount}, czas technologiczny ${curDur} s → ${altDur} s (${alt.timeProfile.durationBasis})`,
          `Operacja ${op.id} posiada jawnie zadeklarowany alternatywny wariant obsady (${alt.workerCount} os., czas ${altDur} s, pochodzenie: ${alt.timeProfile.durationBasis}). Zmiana czasu operacji zmienia obciążenie statyczne stanowiska, lecz wymaga jednoczesnej dostępności ${alt.workerCount} dopuszczonych osób — rzeczywisty efekt weryfikuje symulacja.`,
          [
            `Jawny czas operacji ${op.id}: ${curDur} s (${currentChoice.workerCount} os.) → ${altDur} s (${alt.workerCount} os.).`,
            `Dopuszczeni pracownicy operacji ${op.id}: ${eligible.join(', ')}.`,
          ],
          {
            ...project,
            workerRunSelection: {
              teamWorkerIds: team,
              operations: project.workerRunSelection.operations.map(item =>
                item.operationId === op.id
                  ? {...item, workerCount: alt.workerCount, eligibleWorkerIds: eligible}
                  : item,
              ),
            },
          },
        );
      }
    }
    if (foundAltVariants === 0) {
      skippedReasons.push(
        'Zmiana wariantu obsady operacji: brak innych wykonalnych, jawnie zadeklarowanych wariantów liczebności obsady (timeVariants) dla bieżącego składu zespołu.',
      );
    }
  }

  // 3. Activate or shift to an existing parallel station copy (activate-station-copy)
  const hasBuffers = (project.stationBuffers?.buffers.length ?? 0) > 0;
  let foundCopyActivations = 0;
  if (project.stationRouting) {
    for (const st of project.stations) {
      const parallelCopies = project.stationSettings[st.id]?.parallelStations ?? 1;
      if (parallelCopies < 2) continue;
      const stOps = project.stationRouting.operations.filter(opRoute =>
        opRoute.candidates.some(c => c.stationId === st.id),
      );
      for (const opRoute of stOps) {
        const refCandidate = opRoute.candidates.find(c => c.stationId === st.id)!;
        const usedCopies = new Set(
          opRoute.candidates.filter(c => c.stationId === st.id).map(c => c.copy),
        );
        for (let copy = 1; copy <= parallelCopies; copy++) {
          if (usedCopies.has(copy)) continue;
          if (!copyHasRequiredEquipment(project, st.id, copy, refCandidate.requiredEquipmentIds)) {
            continue;
          }
          // Option A: If unbuffered, we can add copy to candidates so the scheduler chooses earliest available copy
          if (!hasBuffers) {
            foundCopyActivations++;
            const nextCandidates = [
              ...opRoute.candidates,
              {
                stationId: st.id,
                copy,
                requiredEquipmentIds: [...refCandidate.requiredEquipmentIds],
              },
            ];
            pushCandidate(
              `prop-add-copy-${opRoute.operationId}-${st.id}-c${copy}`,
              'activate-station-copy',
              'additional-station',
              `Dopuść istniejącą kopię ${st.id}#${copy} dla operacji ${opRoute.operationId}`,
              `Operacja ${opRoute.operationId}: dopuszczone kopie ${opRoute.candidates.map(c => `${c.stationId}#${c.copy}`).join(', ')} → +${st.id}#${copy}`,
              `Stanowisko ${st.name} (${st.id}) ma zadeklarowane ${parallelCopies} kopie równoległe, a kopia #${copy} posiada wymagane wyposażenie, lecz nie była dopuszczona dla operacji ${opRoute.operationId}. Rozszerzenie dopuszczenia umożliwia równoległą pracę kopii bez tworzenia nieistniejących stanowisk.`,
              [
                ev.busiestCopy
                  ? `Najdłużej pracująca kopia w bazie: ${ev.busiestCopy.stationId}#${ev.busiestCopy.copy} (${ev.busiestCopy.seconds} s, ${(ev.busiestCopy.share * 100).toFixed(1)}% makespanu).`
                  : `Zadeklarowana liczba kopii stanowiska ${st.id}: ${parallelCopies}.`,
                `Kopia ${st.id}#${copy} istnieje w modelu i spełnia wymagania wyposażenia (${refCandidate.requiredEquipmentIds.join(', ') || 'brak wymagań'}).`,
              ],
              {
                ...project,
                stationRouting: {
                  ...project.stationRouting,
                  operations: project.stationRouting.operations.map(item =>
                    item.operationId === opRoute.operationId
                      ? {...item, candidates: nextCandidates}
                      : item,
                  ),
                },
              },
            );
          }
          // Option B: When multiple operations share st#1, reassign this operation to st#copy (works in both buffered and unbuffered modes if routes exist)
          if (stOps.length >= 2) {
            foundCopyActivations++;
            const switchedCandidates = [
              {
                stationId: st.id,
                copy,
                requiredEquipmentIds: [...refCandidate.requiredEquipmentIds],
              },
            ];
            pushCandidate(
              `prop-shift-copy-${opRoute.operationId}-${st.id}-c${copy}`,
              'activate-station-copy',
              'additional-station',
              `Przenieś operację ${opRoute.operationId} na istniejącą kopię ${st.id}#${copy}`,
              `Operacja ${opRoute.operationId}: przydział kopii → wyłącznie ${st.id}#${copy}`,
              `Na stanowisku ${st.id} zadeklarowano ${parallelCopies} kopie i wiele operacji (${stOps.map(o => o.operationId).join(', ')}). Przeniesienie operacji ${opRoute.operationId} na kopię ${st.id}#${copy} rozdziela obciążenie między fizyczne kopie stanowiska.`,
              [
                `Operacje powiązane ze stanowiskiem ${st.id}: ${stOps.map(o => o.operationId).join(', ')}.`,
                `Obciążenie statyczne maks. kopii w bazie: ${staticBaseline.maxStaticCopyLoadSeconds ?? 'n/d'} s/szt.`,
              ],
              {
                ...project,
                stationRouting: {
                  ...project.stationRouting,
                  operations: project.stationRouting.operations.map(item =>
                    item.operationId === opRoute.operationId
                      ? {...item, candidates: switchedCandidates}
                      : item,
                  ),
                },
              },
            );
          }
        }
      }
    }
  }
  if (foundCopyActivations === 0) {
    skippedReasons.push(
      'Włączenie dodatkowej kopii stanowiska z bieżącego szkicu: brak nieużywanych zadeklarowanych kopii równoległych (parallelStations >= 2) z kompletem wyposażenia. Program nie tworzy samowolnie nowych stanowisk ani nie zgaduje ich wymiarów czy tras.',
    );
  }

  // 4. Work reorganization via RPW / LCR balancing on explicitly permitted copies (4.3 engine)
  let foundRebalances = 0;
  if (project.workerRunSelection && project.stationRouting && staticBaseline.selectedWorkContentSeconds !== null) {
    const orderedOps = domainOperationOrder(project);
    const opDurations = orderedOps.map(op => {
      const choice = project.workerRunSelection!.operations.find(c => c.operationId === op.id);
      const variant = choice ? op.staffing?.timeVariants.find(v => v.workerCount === choice.workerCount) : undefined;
      return variant?.timeProfile.durationSeconds ?? op.standardTimeSeconds;
    });
    const maxSingle = Math.max(1, ...opDurations);
    const totalWork = opDurations.reduce((s, v) => s + v, 0);
    const baseMaxLoad = staticBaseline.maxStaticCopyLoadSeconds ?? totalWork;

    // Candidate target loads to probe in ascending order
    const targetLoads = [...new Set([
      maxSingle,
      Math.ceil(totalWork / Math.max(1, staticBaseline.totalCopiesCount)),
      Math.ceil(totalWork / Math.max(1, staticBaseline.activeCopiesCount)),
      ...opDurations.map(d => maxSingle + d),
      baseMaxLoad,
      totalWork,
    ])]
      .filter(v => Number.isFinite(v) && v >= maxSingle && v <= totalWork)
      .sort((a, b) => a - b);

    for (const alg of ['RPW', 'LCR'] as const) {
      for (const target of targetLoads) {
        try {
          const bal = proposeDomainBalance(project, target, alg);
          if (bal.kind !== 'proposal') continue;
          const applied = applyDomainBalance(project, bal);
          if (JSON.stringify(applied) === baselineJson) continue;
          foundRebalances++;
          const maxAssignedLoad = bal.loads.length > 0 ? Math.max(...bal.loads.map(l => l.seconds)) : target;
          const assignmentSummary = bal.assignments
            .map(a => `${a.operationId}→${a.stationId}#${a.copy}`)
            .join(', ');
          pushCandidate(
            `prop-rebalance-${alg.toLowerCase()}-${target}`,
            'rebalance-work',
            'additional-station',
            `Reorganizacja pracy (${alg}, limit ${round(maxAssignedLoad)} s/szt. na kopię)`,
            `Przydział operacji (${alg}): ${assignmentSummary}`,
            `Heurystyka bilansowania ${alg} znalazła dopuszczalny przydział operacji do istniejących kopii stanowisk przy limicie ${round(maxAssignedLoad)} s/szt. (wobec bazowego maks. obciążenia statycznego ${baseMaxLoad} s/szt.). Ponieważ bilans statyczny nie uwzględnia kolizji czasu pracowników ani transportu, propozycja jest weryfikowana pełnym przebiegiem symulacji.`,
            [
              `Maks. obciążenie statyczne kopii: ${baseMaxLoad} s/szt. → ${round(maxAssignedLoad)} s/szt.`,
              `Zdolność statyczna [szt./h]: ${staticBaseline.staticCapacityPerHour ?? 'n/d'} → ${maxAssignedLoad > 0 ? round(3600 / maxAssignedLoad) : 'n/d'} szt./h.`,
              `Przydziały mieszczą się w jawnie dopuszczonych kopiach, blokadach stanowisk i kompetencjach obsady.`,
            ],
            applied,
          );
          break; // Take the tightest feasible target load for each heuristic (RPW, LCR)
        } catch {
          // Ignore if balance cannot be computed
        }
      }
    }
  }
  if (foundRebalances === 0) {
    skippedReasons.push(
      'Reorganizacja przydziału operacji (RPW / LCR): bieżący przydział operacji na dopuszczonych kopiach jest już jedynym lub najniższym statycznie dopuszczalnym rozkładem dla zadeklarowanych ograniczeń.',
    );
  }

  // 5. Release operator during output buffer blocking (bbas -> bbas-worker-released)
  const bbasBuffers = (project.stationBuffers?.buffers ?? []).filter(
    b => (b.blockingPolicy ?? 'bbas') === 'bbas',
  );
  if (bbasBuffers.length > 0) {
    const affectedLabels = bbasBuffers.map(
      b => `${b.stationId}${b.copy !== null ? `#${b.copy}` : ' (wszystkie kopie)'}`,
    );
    const updatedBuffers = project.stationBuffers!.buffers.map(b =>
      (b.blockingPolicy ?? 'bbas') === 'bbas'
        ? {...b, blockingPolicy: 'bbas-worker-released' as const}
        : b,
    );
    const rationale =
      ev.blockingHoldSeconds > 0
        ? `W harmonogramie bazowym odnotowano ${ev.blockingHoldSeconds} s przetrzymania na zablokowanym wyjściu stanowiska przy polityce zatrzymującej operatora (bbas). Zmiana polityki na jawne zwolnienie operatora po zakończeniu obróbki (bbas-worker-released) utrzymuje blokadę stanowiska i korpusu, ale pozwala operatorowi przejść do innych operacji lub transportu.`
        : `W buforach stanowisk (${affectedLabels.join(', ')}) ustawiono politykę zatrzymania operatora podczas blokady wyjścia (bbas). Przełączenie na bbas-worker-released sprawdza w symulacji, czy zwolnienie operatora po zakończeniu obróbki poprawia wykorzystanie obsady.`;
    pushCandidate(
      'prop-buffer-release-worker',
      'release-blocked-worker',
      'changed-layout',
      'Zwolnij operatora podczas blokady wyjścia bufora (bbas → bbas-worker-released)',
      `Bufory stanowisk (${affectedLabels.join(', ')}): blockingPolicy bbas → bbas-worker-released`,
      rationale,
      [
        `Czas przetrzymania na zablokowanym wyjściu w bazie: ${ev.blockingHoldSeconds} s.`,
        `Oczekiwanie jednoprzyczynowe na bufor/blokadę w bazie: ${ev.blockingWaitSeconds} s.`,
      ],
      {
        ...project,
        stationBuffers: {
          buffers: updatedBuffers,
        },
      },
    );
  }

  // 6. Include user-saved variants from the 4.5 library (from the same source project) if not already identical
  if (savedVariants && savedVariants.length > 0) {
    for (const saved of savedVariants) {
      if (JSON.stringify(saved.project) === baselineJson) continue;
      const diff = inspectVariantFactors(project, saved.project, saved.category, false);
      const catLabel = domainVariantCategoryLabels[saved.category];
      pushCandidate(
        `prop-saved-${saved.id}`,
        'saved-variant',
        saved.category,
        `Zapisany wariant z biblioteki: ${saved.name} (${catLabel})`,
        diff.summary.join('; ') || `Kategoria: ${catLabel}`,
        `Wariant „${saved.name}” został jawnie skonfigurowany i zapisany w bibliotece wariantów szkicu 6 jako „${catLabel}”. Weryfikacja w symulacji porównuje jego rzeczywisty harmonogram z wariantem odniesienia przy tych samych warunkach eksperymentu.`,
        [
          `Zapisana kategoria: ${catLabel} (${saved.id}).`,
          `Zmienione wymiary względem bazy: ${diff.changedDimensions.join(', ') || 'brak'}.`,
        ],
        saved.project,
      );
    }
  }

  return {candidates, skippedReasons};
}

function classifyVerification(
  staticBaseline: StaticVariantSummary,
  staticProposed: StaticVariantSummary,
  baselineDynamic: VariantDynamicOutcome,
  proposedDynamic: VariantDynamicOutcome,
): {
  status: DomainProposalVerificationStatus;
  summary: string;
  staticVsDynamicNote: string;
} {
  const baseStatCap = staticBaseline.staticCapacityPerHour !== null
    ? `${staticBaseline.staticCapacityPerHour} szt./h (maks. kopia ${staticBaseline.maxStaticCopyLoadSeconds} s/szt.)`
    : 'brak szacunku statycznego';
  const propStatCap = staticProposed.staticCapacityPerHour !== null
    ? `${staticProposed.staticCapacityPerHour} szt./h (maks. kopia ${staticProposed.maxStaticCopyLoadSeconds} s/szt.)`
    : 'brak szacunku statycznego';

  if (proposedDynamic.status === 'error') {
    return {
      status: 'refused',
      summary: `Symulacja odrzuciła propozycję: ${proposedDynamic.error}`,
      staticVsDynamicNote: `Szacunek zdolności statycznej: ${baseStatCap} → ${propStatCap}. Symulacja odrzuciła propozycję: ${proposedDynamic.error}.`,
    };
  }
  if (baselineDynamic.status === 'error') {
    return {
      status: 'improved',
      summary: `Wariant bazowy był niewykonalny (${baselineDynamic.error}), natomiast proponowana zmiana kończy symulację z makespanem ${proposedDynamic.makespanSeconds} s i przepustowością ${proposedDynamic.throughputPerHour} szt./h.`,
      staticVsDynamicNote: `Szacunek zdolności statycznej: ${propStatCap} vs rzeczywista przepustowość symulacji: ${proposedDynamic.throughputPerHour} szt./h.`,
    };
  }

  const deltaMk = proposedDynamic.deltaMakespanSeconds ?? round(proposedDynamic.makespanSeconds - baselineDynamic.makespanSeconds);
  const deltaThr = proposedDynamic.deltaThroughputPerHour ?? round(proposedDynamic.throughputPerHour - baselineDynamic.throughputPerHour);
  const deltaLt = proposedDynamic.deltaAverageLeadTimeSeconds ?? round(proposedDynamic.averageLeadTimeSeconds - baselineDynamic.averageLeadTimeSeconds);
  const statChanged = staticBaseline.staticCapacityPerHour !== staticProposed.staticCapacityPerHour;

  const staticVsDynamicNote =
    `Szacunek zdolności statycznej: ${baseStatCap} → ${propStatCap}. ` +
    `Rzeczywisty wynik symulacji: przepustowość ${baselineDynamic.throughputPerHour} → ${proposedDynamic.throughputPerHour} szt./h ` +
    `(${deltaThr > 0 ? `+${deltaThr}` : deltaThr} szt./h), makespan ${baselineDynamic.makespanSeconds} → ${proposedDynamic.makespanSeconds} s ` +
    `(${deltaMk > 0 ? `+${deltaMk}` : deltaMk} s).`;

  if (deltaMk < 0 || (deltaMk === 0 && deltaLt < 0)) {
    const details: string[] = [];
    if (deltaMk < 0) {
      details.push(`skrócenie makespanu o ${Math.abs(deltaMk)} s (${baselineDynamic.makespanSeconds} → ${proposedDynamic.makespanSeconds} s)`);
      details.push(`wzrost przepustowości o +${deltaThr} szt./h (${baselineDynamic.throughputPerHour} → ${proposedDynamic.throughputPerHour} szt./h)`);
    }
    if (deltaLt < 0) {
      details.push(`skrócenie śr. czasu przejścia wyrobu o ${Math.abs(deltaLt)} s (${baselineDynamic.averageLeadTimeSeconds} → ${proposedDynamic.averageLeadTimeSeconds} s)`);
    }
    return {
      status: 'improved',
      summary: `Potwierdzona poprawa w symulacji: ${details.join(', ')}.`,
      staticVsDynamicNote,
    };
  }

  if (deltaMk === 0 && deltaLt === 0) {
    const extra = statChanged
      ? ' Mimo zmiany szacunku statycznego ograniczenia zasobowe/transportowe w harmonogramie utrzymały ten sam czas realizacji partii.'
      : '';
    return {
      status: 'unchanged',
      summary: `Brak poprawy czasu realizacji w symulacji: makespan (${proposedDynamic.makespanSeconds} s) oraz śr. czas przejścia (${proposedDynamic.averageLeadTimeSeconds} s) pozostały bez zmian.${extra}`,
      staticVsDynamicNote,
    };
  }

  return {
    status: 'regressed',
    summary: `Pogorszenie wyniku w symulacji: makespan zmienił się o ${deltaMk > 0 ? `+${deltaMk}` : deltaMk} s (${baselineDynamic.makespanSeconds} → ${proposedDynamic.makespanSeconds} s), a śr. czas przejścia o ${deltaLt > 0 ? `+${deltaLt}` : deltaLt} s.`,
    staticVsDynamicNote,
  };
}

/**
 * Build a verified 4.7 improvement proposals report from precomputed schedule outcomes
 * (used both by the UI Web Worker flow and by the synchronous runner).
 */
export function buildDomainImprovementProposalsReport(
  baselineProject: DomainProjectV6,
  sourceSchemaVersion: 4 | 5,
  originalJson: string,
  conditions: VariantExperimentConditions,
  baselineOutcome: VariantScheduleOutcomeInput,
  candidates: readonly DomainImprovementProposalCandidate[],
  outcomesByProposalId: ReadonlyMap<string, VariantScheduleOutcomeInput>,
  skippedReasons: readonly string[] = [],
  generatedAt = new Date().toISOString(),
): DomainImprovementProposalsReport {
  const checkedConditions = validateExperimentConditions(conditions);
  const validatedBaseline = cloneProject(baselineProject);
  const baselineStatic = summarizeStaticVariant(validatedBaseline);

  const baseSaved: SavedDomainVariant = {
    id: '__baseline__',
    name: 'Wariant odniesienia (baza)',
    category: 'baseline',
    at: generatedAt,
    sourceSchemaVersion,
    originalJson,
    project: validatedBaseline,
  };

  if (candidates.length === 0) {
    // Evaluate baseline alone via a dummy self-pair or direct summary
    const pairReport = buildVariantComparisonReport(
      [baseSaved, {...baseSaved, id: '__baseline_mirror__'}],
      '__baseline__',
      checkedConditions,
      new Map([
        ['__baseline__', baselineOutcome],
        ['__baseline_mirror__', baselineOutcome],
      ]),
    );
    const baseRow = pairReport.rows[0];
    return {
      generatedAt,
      dataVersion: {draftSchemaVersion: 6, sourceSchemaVersion},
      conditions: checkedConditions,
      nonOptimumDisclaimer: NON_OPTIMUM_DISCLAIMER,
      baselineStatic: baseRow.staticSummary,
      baselineDynamic: baseRow.dynamic,
      proposals: [],
      skippedReasons: [...skippedReasons],
    };
  }

  const syntheticVariants: SavedDomainVariant[] = [
    baseSaved,
    ...candidates.map(cand => ({
      id: cand.id,
      name: cand.title,
      category: cand.variantCategory,
      at: generatedAt,
      sourceSchemaVersion,
      originalJson,
      project: cand.proposedProject,
    })),
  ];

  const allOutcomes = new Map<string, VariantScheduleOutcomeInput>([
    ['__baseline__', baselineOutcome],
  ]);
  for (const cand of candidates) {
    const out = outcomesByProposalId.get(cand.id);
    if (!out) {
      throw new Error(`Brak wyniku weryfikacji symulacyjnej dla propozycji ${cand.id}.`);
    }
    allOutcomes.set(cand.id, out);
  }

  const comparison = buildVariantComparisonReport(
    syntheticVariants,
    '__baseline__',
    checkedConditions,
    allOutcomes,
  );
  const baseRow = comparison.rows.find(r => r.variantId === '__baseline__')!;
  const rowById = new Map<string, VariantComparisonRow>(
    comparison.rows.map(r => [r.variantId, r]),
  );

  const statusOrder: Record<DomainProposalVerificationStatus, number> = {
    improved: 0,
    unchanged: 1,
    regressed: 2,
    refused: 3,
  };

  const proposals: VerifiedDomainImprovementProposal[] = candidates
    .map(cand => {
      const row = rowById.get(cand.id)!;
      const classification = classifyVerification(
        baseRow.staticSummary,
        row.staticSummary,
        baseRow.dynamic,
        row.dynamic,
      );
      return {
        ...cand,
        staticBaseline: baseRow.staticSummary,
        staticProposed: row.staticSummary,
        factorDiff: row.factorDiff,
        verificationStatus: classification.status,
        verificationSummary: classification.summary,
        staticVsDynamicNote: classification.staticVsDynamicNote,
        baselineDynamic: baseRow.dynamic,
        proposedDynamic: row.dynamic,
        nonOptimumDisclaimer: NON_OPTIMUM_DISCLAIMER,
      };
    })
    .sort((a, b) => {
      const orderDiff = statusOrder[a.verificationStatus] - statusOrder[b.verificationStatus];
      if (orderDiff !== 0) return orderDiff;
      const aDelta = a.proposedDynamic.status === 'completed' ? (a.proposedDynamic.deltaMakespanSeconds ?? 0) : Infinity;
      const bDelta = b.proposedDynamic.status === 'completed' ? (b.proposedDynamic.deltaMakespanSeconds ?? 0) : Infinity;
      return aDelta - bDelta;
    });

  return {
    generatedAt,
    dataVersion: {draftSchemaVersion: 6, sourceSchemaVersion},
    conditions: checkedConditions,
    nonOptimumDisclaimer: NON_OPTIMUM_DISCLAIMER,
    baselineStatic: baseRow.staticSummary,
    baselineDynamic: baseRow.dynamic,
    proposals,
    skippedReasons: [...skippedReasons],
  };
}

/**
 * Synchronous generator & simulation verifier for 4.7 improvement proposals.
 */
export function proposeAndVerifyDomainImprovements(
  project: DomainProjectV6,
  conditions: VariantExperimentConditions,
  options?: {
    sourceSchemaVersion?: 4 | 5;
    originalJson?: string;
    savedVariants?: readonly SavedDomainVariant[];
    generatedAt?: string;
  },
): DomainImprovementProposalsReport {
  const checkedConditions = validateExperimentConditions(conditions);
  const validatedBaseline = cloneProject(project);
  const sourceSchemaVersion = options?.sourceSchemaVersion ?? 5;
  const originalJson = options?.originalJson ?? JSON.stringify({schemaVersion: sourceSchemaVersion});

  let baselineOutcome: VariantScheduleOutcomeInput;
  let baselineResult: WorkerScheduleResult | null = null;
  try {
    const bodyInput = checkedConditions.transportMode === 'just-in-time' ? undefined : validatedBaseline.bodyRunInput;
    baselineResult = scheduleWorkerRun(
      validatedBaseline,
      checkedConditions.arrivalIntervalSeconds,
      checkedConditions.batch,
      bodyInput,
      undefined,
      {transportMode: checkedConditions.transportMode},
    );
    baselineOutcome = {status: 'completed', result: baselineResult};
  } catch (error) {
    baselineOutcome = {status: 'error', error: (error as Error).message};
  }

  const {candidates, skippedReasons} = generateDomainImprovementCandidates(
    validatedBaseline,
    baselineResult,
    options?.savedVariants,
  );

  const outcomesByProposalId = new Map<string, VariantScheduleOutcomeInput>();
  for (const cand of candidates) {
    try {
      const cloned = cloneProject(cand.proposedProject);
      const bodyInput = checkedConditions.transportMode === 'just-in-time' ? undefined : cloned.bodyRunInput;
      const result = scheduleWorkerRun(
        cloned,
        checkedConditions.arrivalIntervalSeconds,
        checkedConditions.batch,
        bodyInput,
        undefined,
        {transportMode: checkedConditions.transportMode},
      );
      outcomesByProposalId.set(cand.id, {status: 'completed', result});
    } catch (error) {
      outcomesByProposalId.set(cand.id, {status: 'error', error: (error as Error).message});
    }
  }

  return buildDomainImprovementProposalsReport(
    validatedBaseline,
    sourceSchemaVersion,
    originalJson,
    checkedConditions,
    baselineOutcome,
    candidates,
    outcomesByProposalId,
    skippedReasons,
    options?.generatedAt,
  );
}

const fmtDelta = (val: number | null, unit = ''): string => {
  if (val === null) return '—';
  const sign = val > 0 ? '+' : '';
  return `${sign}${val}${unit ? ` ${unit}` : ''}`;
};

/**
 * Build a Markdown report section / document for 4.7 verified improvement proposals.
 */
export function buildImprovementProposalsMarkdownReport(
  report: DomainImprovementProposalsReport,
): string {
  const {conditions, dataVersion, baselineStatic, baselineDynamic, proposals, skippedReasons} = report;
  const transportLabel = conditions.transportMode === 'just-in-time'
    ? 'Tylko proces (just-in-time, pominięty transport i założona dostępność materiałów)'
    : 'Skonfigurowany (jawne trasy, wózki, bufory i zaopatrzenie)';
  const ca = conditions.costAssumptions ?? null;

  const lines: string[] = [
    '# Raport propozycji zmian i weryfikacji symulacyjnej szkicu 6 (4.7)',
    '',
    `> **Zastrzeżenie metodologiczne (brak deklaracji optimum):** ${report.nonOptimumDisclaimer}`,
    '',
    '## 1. Wersja danych, warunki eksperymentu i założenia kosztowe',
    `- **Wersja danych:** schemat roboczy szkicu \`v${dataVersion.draftSchemaVersion}\` (projekt źródłowy \`v${dataVersion.sourceSchemaVersion}\`)`,
    `- **Data wygenerowania:** \`${report.generatedAt}\``,
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
      `  - Stawka godzinowa operatora: ${ca.operatorHourlyRate ?? 'nie podano'}`,
      `  - Stawka godzinowa stanowiska: ${ca.stationHourlyRate ?? 'nie podano'}`,
      `  - Stawka powierzchni: ${ca.floorSqmRate ?? 'nie podano'}`,
    );
  } else {
    lines.push('- **Stawki kosztowe:** nie podano jawnych stawek kosztowych (brak domysłów kosztowych).');
  }

  const baseStatCap = baselineStatic.staticCapacityPerHour !== null ? `${baselineStatic.staticCapacityPerHour} szt./h` : 'n/d';
  if (baselineDynamic.status === 'completed') {
    lines.push(
      `- **Punkt odniesienia (baza):** zdolność statyczna ${baseStatCap} (maks. kopia ${baselineStatic.maxStaticCopyLoadSeconds ?? 'n/d'} s/szt.), przepustowość symulacji **${baselineDynamic.throughputPerHour} szt./h**, makespan **${baselineDynamic.makespanSeconds} s**, śr. czas przejścia **${baselineDynamic.averageLeadTimeSeconds} s**, WIP aktywny śr. **${baselineDynamic.averageActiveWipPieces} szt.**`,
    );
  } else {
    lines.push(`- **Punkt odniesienia (baza):** BŁĄD harmonogramu — ${baselineDynamic.error}`);
  }

  lines.push(
    '',
    '## 2. Zestawienie zweryfikowanych propozycji zmian (szacunek statyczny vs wynik symulacji)',
    '',
  );

  if (proposals.length === 0) {
    lines.push('*Brak wygenerowanych propozycji zmian dla bieżących zasobów szkicu 6.*');
  } else {
    lines.push(
      '| Propozycja zmiany | Rodzaj zmiany | Status weryfikacji | Zdolność stat. [szt./h] (maks. kopia [s/szt.]) | Przepustowość sym. [szt./h] (Δ) | Makespan [s] (Δ) | Czas przejścia śr. [s] (Δ) | WIP aktywny śr. [szt.] (Δ) | Koszt oper. partii (Δ) |',
      '| --- | --- | --- | --- | --- | --- | --- | --- | --- |',
    );
    for (const p of proposals) {
      const kindLabel = domainProposalKindLabels[p.kind];
      const statusLabel = domainProposalVerificationLabels[p.verificationStatus];
      const statCell = `${p.staticProposed.staticCapacityPerHour ?? 'n/d'} (${p.staticProposed.maxStaticCopyLoadSeconds ?? 'n/d'} s)`;
      if (p.proposedDynamic.status === 'error') {
        lines.push(
          `| **${p.title}** | ${kindLabel} | ${statusLabel} | ${statCell} | BŁĄD | ${p.proposedDynamic.error} | — | — | — |`,
        );
        continue;
      }
      const d = p.proposedDynamic;
      const thrCell = `**${d.throughputPerHour}** (${fmtDelta(d.deltaThroughputPerHour, 'szt./h')})`;
      const mkCell = `**${d.makespanSeconds}** (${fmtDelta(d.deltaMakespanSeconds, 's')})`;
      const ltCell = `${d.averageLeadTimeSeconds} (${fmtDelta(d.deltaAverageLeadTimeSeconds, 's')})`;
      const wipCell = `${d.averageActiveWipPieces} (${fmtDelta(d.deltaAverageActiveWipPieces)})`;
      const costCell =
        d.costEvaluation && d.costEvaluation.batchOperatingCost !== null
          ? `${d.costEvaluation.batchOperatingCost} ${d.costEvaluation.currency} (${fmtDelta(d.costEvaluation.deltaBatchOperatingCost, d.costEvaluation.currency)})`
          : 'brak stawek';
      lines.push(
        `| **${p.title}** | ${kindLabel} | **${statusLabel}** | ${statCell} | ${thrCell} | ${mkCell} | ${ltCell} | ${wipCell} | ${costCell} |`,
      );
    }

    lines.push('', '## 3. Uzasadnienie techniczne, dowody z harmonogramu i ocena symulacyjna', '');
    for (const p of proposals) {
      lines.push(
        `### ${p.title} (${domainProposalVerificationLabels[p.verificationStatus]})`,
        `- **Zakres zmiany:** ${p.targetSummary}`,
        `- **Uzasadnienie:** ${p.rationale}`,
        `- **Dowody wejściowe:** ${p.evidenceSignals.join(' | ')}`,
        `- **Szacunek zdolności vs wynik symulacji:** ${p.staticVsDynamicNote}`,
        `- **Wniosek z weryfikacji w symulacji:** ${p.verificationSummary}`,
        '',
      );
    }
  }

  if (skippedReasons.length > 0) {
    lines.push('## 4. Pominięte kategorie zmian (ochrona przed dopowiadaniem danych)', '');
    for (const reason of skippedReasons) {
      lines.push(`- ${reason}`);
    }
    lines.push('');
  }

  return lines.join('\n');
}
