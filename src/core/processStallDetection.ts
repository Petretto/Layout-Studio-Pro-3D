import type {DomainProjectV6} from './domainProject';
import type {BufferBook} from './bufferState';
import type {BodyBook} from './bodyState';
import type {WorkerReservationBook} from './workerReservations';
import type {MaterialStockRun} from './materialStock';

export type ProcessStallType =
  | 'buffer-deadlock'
  | 'worker-deadlock'
  | 'material-starvation'
  | 'subassembly-starvation'
  | 'calendar-exhaustion'
  | 'transport-deadlock'
  | 'process-stall';

export interface StalledOperationDetail {
  job: number;
  operationId: string;
  operationName: string;
  stationId: string;
  copy: number;
  status: 'waiting' | 'blocked' | 'local-wait' | 'transport-wait';
  waitCauses: string[];
  missingResourceExplanation: string;
}

export interface BlockedStationDetail {
  stationId: string;
  stationName: string;
  copy: number;
  heldBodyId?: string;
  blockedByJob?: number;
  blockedByOperationId?: string;
  holdingWorkerIds?: string[];
  waitingForStationId?: string;
  blockingPolicy?: 'bbas' | 'bbas-worker-released';
}

export interface ProcessStallDiagnostic {
  type: ProcessStallType;
  atSeconds: number;
  title: string;
  summary: string;
  stalledOperations: StalledOperationDetail[];
  blockedStations: BlockedStationDetail[];
  recommendation: string;
}

const DIAGNOSTIC_PREFIX = '<!--DIAGNOSTIC:';
const DIAGNOSTIC_SUFFIX = '-->';

export function formatProcessStallMessage(diagnostic: ProcessStallDiagnostic): string {
  const json = JSON.stringify(diagnostic);
  const prefix = 'Zatrzymanie lub zakleszczenie procesu';
  return `${prefix} (${diagnostic.title}) w chwili ${diagnostic.atSeconds} s: ${diagnostic.summary}. Zalecenie: ${diagnostic.recommendation} ${DIAGNOSTIC_PREFIX}${json}${DIAGNOSTIC_SUFFIX}`;
}

export function parseProcessStallDiagnostic(errorOrMessage: unknown): ProcessStallDiagnostic | null {
  if (!errorOrMessage) return null;
  if (typeof errorOrMessage === 'object' && 'diagnostic' in (errorOrMessage as any)) {
    return (errorOrMessage as any).diagnostic as ProcessStallDiagnostic;
  }
  const str = typeof errorOrMessage === 'string' ? errorOrMessage : (errorOrMessage as Error).message;
  if (!str) return null;
  const start = str.indexOf(DIAGNOSTIC_PREFIX);
  const end = str.lastIndexOf(DIAGNOSTIC_SUFFIX);
  if (start !== -1 && end !== -1 && end > start) {
    const raw = str.slice(start + DIAGNOSTIC_PREFIX.length, end);
    try {
      return JSON.parse(raw) as ProcessStallDiagnostic;
    } catch {
      return null;
    }
  }
  return null;
}

export class ProcessStallError extends Error {
  readonly diagnostic: ProcessStallDiagnostic;
  constructor(diagnostic: ProcessStallDiagnostic) {
    super(formatProcessStallMessage(diagnostic));
    this.name = 'ProcessStallError';
    this.diagnostic = diagnostic;
  }
}

export interface BufferedStallContext {
  now: number;
  stages: Array<{
    job: number;
    step: number;
    status: 'outside' | 'input' | 'processing' | 'blocked' | 'output' | 'moving' | 'finished' | 'local';
    causes: Set<string>;
    ready?: number;
    run?: number;
  }>;
  steps: Array<{id: string; name?: string; assignedWorkstationId?: string}>;
  project: DomainProjectV6;
  buffers: BufferBook | null;
  bodyBook?: BodyBook | null;
  stock?: MaterialStockRun | null;
  book: WorkerReservationBook;
  transportFailure: string | null;
  activeRunsCount: number;
  returnsCount: number;
  returnLocksCount: number;
  mayHoldWorkers: (stepIndex: number) => boolean;
  targetOf: (stepIndex: number) => {stationId: string; copy: number};
}

export function diagnoseBufferedProcessStall(ctx: BufferedStallContext): ProcessStallDiagnostic {
  const {
    now,
    stages,
    steps,
    project,
    buffers,
    stock,
    transportFailure,
    mayHoldWorkers,
    targetOf,
  } = ctx;

  const getStationName = (id: string) => project.stations.find(s => s.id === id)?.name || id;
  const getOpName = (id: string) => steps.find(s => s.id === id)?.name || id;

  const incompleteStages = stages.filter(s => s.status !== 'finished');
  const blockedStages = stages.filter(s => s.status === 'blocked');

  const blockedStations: BlockedStationDetail[] = [];
  for (const bStage of blockedStages) {
    const blockedStepIdx = bStage.step > 0 ? bStage.step - 1 : 0;
    const st = targetOf(blockedStepIdx);
    const op = steps[blockedStepIdx];
    const bufferConfig = project.stationBuffers?.buffers.find(
      b => b.stationId === st.stationId && (b.copy === null || b.copy === st.copy)
    );
    const holdsWorkers = mayHoldWorkers(blockedStepIdx);
    const workerIds = holdsWorkers
      ? project.workerRunSelection?.operations.find(o => o.operationId === op.id)?.eligibleWorkerIds || []
      : [];
    const nextTarget = bStage.step < steps.length ? targetOf(bStage.step) : undefined;

    blockedStations.push({
      stationId: st.stationId,
      stationName: getStationName(st.stationId),
      copy: st.copy,
      blockedByJob: bStage.job,
      blockedByOperationId: op.id,
      holdingWorkerIds: holdsWorkers ? [...workerIds] : [],
      waitingForStationId: nextTarget?.stationId,
      blockingPolicy: bufferConfig?.blockingPolicy,
    });
  }

  // Check 1: Worker Deadlock under bbas policy
  // If an operation is blocked holding worker W, and downstream or another waiting stage requires worker W
  const workersHeld = new Set<string>();
  blockedStations.forEach(b => b.holdingWorkerIds?.forEach(w => workersHeld.add(w)));

  if (workersHeld.size > 0) {
    const waitingNeedingHeldWorker = incompleteStages.find(stage => {
      if (stage.status === 'blocked') return false;
      const opId = steps[stage.step].id;
      const eligible = project.workerRunSelection?.operations.find(o => o.operationId === opId)?.eligibleWorkerIds || [];
      return eligible.some(w => workersHeld.has(w));
    });

    if (waitingNeedingHeldWorker) {
      const neededOp = steps[waitingNeedingHeldWorker.step];
      const neededStation = targetOf(waitingNeedingHeldWorker.step);
      const blockingSt = blockedStations.find(b => b.holdingWorkerIds?.some(w => {
        const eligible = project.workerRunSelection?.operations.find(o => o.operationId === neededOp.id)?.eligibleWorkerIds || [];
        return eligible.includes(w);
      }))!;

      const heldWorker = blockingSt.holdingWorkerIds!.find(w => {
        const eligible = project.workerRunSelection?.operations.find(o => o.operationId === neededOp.id)?.eligibleWorkerIds || [];
        return eligible.includes(w);
      })!;
      const workerName = project.workers.find(w => w.id === heldWorker)?.name || heldWorker;

      const stalledOperations: StalledOperationDetail[] = incompleteStages.map(stg => {
        const stepIdx = stg.status === 'blocked' ? (stg.step > 0 ? stg.step - 1 : 0) : stg.step;
        const op = steps[stepIdx];
        const tgt = targetOf(stepIdx);
        return {
          job: stg.job,
          operationId: op.id,
          operationName: getOpName(op.id),
          stationId: tgt.stationId,
          copy: tgt.copy,
          status: stg.status === 'blocked' ? 'blocked' : stg.status === 'local' ? 'local-wait' : 'waiting',
          waitCauses: Array.from(stg.causes),
          missingResourceExplanation: stg === waitingNeedingHeldWorker
            ? `Wymagany pracownik ${workerName} (${heldWorker}) jest zablokowany na stanowisku ${blockingSt.stationName} (${blockingSt.stationId}) w polityce bbas.`
            : stg.status === 'blocked'
            ? `Stanowisko zablokowane po zakończeniu pracy z powodu braku miejsca u odbiorcy ${blockingSt.waitingForStationId || 'kolejnego stanowiska'}.`
            : 'Oczekiwanie na zasoby lub zakończenie poprzednich kroków.',
        };
      });

      return {
        type: 'worker-deadlock',
        atSeconds: now,
        title: 'Zakleszczenie operatora w blokadzie bufora (bbas)',
        summary: `Stanowisko ${blockingSt.stationName} (${blockingSt.stationId}) blokuje wyjście wyrobu ze sztuki ${blockingSt.blockedByJob} i przetrzymuje operatora ${workerName} (${heldWorker}). Ten sam pracownik jest wymagany do uruchomienia odbioru na stacji ${getStationName(neededStation.stationId)} (sztuka ${waitingNeedingHeldWorker.job}, operacja ${getOpName(neededOp.id)}).`,
        stalledOperations,
        blockedStations,
        recommendation: `Zmień politykę blokowania na stanowisku ${blockingSt.stationName} na 'bbas-worker-released' (zwolnienie operatora po zakończeniu obróbki) lub przypisz niezależnego pracownika do operacji ${getOpName(neededOp.id)}.`,
      };
    }
  }

  // Check 2: Buffer Deadlock / Capacity Saturation
  if (blockedStages.length > 0) {
    const firstBlocked = blockedStations[0];
    const stalledOperations: StalledOperationDetail[] = incompleteStages.map(stg => {
      const stepIdx = stg.status === 'blocked' ? (stg.step > 0 ? stg.step - 1 : 0) : stg.step;
      const op = steps[stepIdx];
      const tgt = targetOf(stepIdx);
      return {
        job: stg.job,
        operationId: op.id,
        operationName: getOpName(op.id),
        stationId: tgt.stationId,
        copy: tgt.copy,
        status: stg.status === 'blocked' ? 'blocked' : stg.status === 'local' ? 'local-wait' : 'waiting',
        waitCauses: Array.from(stg.causes),
        missingResourceExplanation: stg.status === 'blocked'
          ? `Brak wolnego miejsca w buforze wyjściowym stacji ${getStationName(tgt.stationId)} lub buforze wejściowym stacji docelowej.`
          : 'Oczekiwanie na zwolnienie gniazda lub transport.',
      };
    });

    return {
      type: 'buffer-deadlock',
      atSeconds: now,
      title: 'Zablokowanie przepływu przez ograniczony bufor',
      summary: `Stanowisko ${firstBlocked.stationName} / kopia ${firstBlocked.copy} zakończyło obróbkę sztuki ${firstBlocked.blockedByJob}, lecz nie może zwolnić gniazda z powodu braku miejsca w buforze wyjściowym lub na stacji docelowej ${firstBlocked.waitingForStationId ? getStationName(firstBlocked.waitingForStationId) : ''}.`,
      stalledOperations,
      blockedStations,
      recommendation: `Zwiększ zadeklarowaną pojemność bufora wyjściowego na stacji ${firstBlocked.stationName} lub wejściowego na stacji docelowej, albo skróć cykl na stacji odbiorczej.`,
    };
  }

  // Check 3: Material Starvation
  if (stock && incompleteStages.some(s => s.causes.has('material'))) {
    const matStage = incompleteStages.find(s => s.causes.has('material'))!;
    const op = steps[matStage.step];
    const tgt = targetOf(matStage.step);
    const consumption = project.materialSupply?.consumptions?.find(c => c.operationId === op.id);
    const supplyItem = consumption
      ? project.materialSupply?.items.find(i => i.id === consumption.supplyId)
      : undefined;

    const stalledOperations: StalledOperationDetail[] = incompleteStages.map(stg => {
      const stepObj = steps[stg.step];
      const target = targetOf(stg.step);
      return {
        job: stg.job,
        operationId: stepObj.id,
        operationName: getOpName(stepObj.id),
        stationId: target.stationId,
        copy: target.copy,
        status: stg.status === 'local' ? 'local-wait' : 'waiting',
        waitCauses: Array.from(stg.causes),
        missingResourceExplanation: stg === matStage
          ? `Brak wystarczającego zapasu materiału ${supplyItem?.componentId || 'komponentu'} przy stacji ${getStationName(tgt.stationId)} (wymagane: ${consumption?.quantity || 1} ${supplyItem?.unit || 'szt.'}).`
          : 'Oczekiwanie na realizację poprzednich kroków.',
      };
    });

    return {
      type: 'material-starvation',
      atSeconds: now,
      title: 'Zatrzymanie procesu z braku materiału',
      summary: `Operacja ${getOpName(op.id)} (sztuka ${matStage.job}) na stacji ${getStationName(tgt.stationId)} nie może wystartować z powodu braku materiału ${supplyItem?.componentId || 'komponentu'} (pozycja ${consumption?.supplyId}); brak wystarczającego zapasu i dalszych dostaw. Wszystkie zaplanowane dostawy zostały wyczerpane przed zaspokojeniem zapotrzebowania partii.`,
      stalledOperations,
      blockedStations,
      recommendation: `Dodaj kolejne dostawy w harmonogramie zaopatrzenia ${consumption?.supplyId} przy stacji ${getStationName(tgt.stationId)} lub zwiększ zapas początkowy.`,
    };
  }

  // Check 4: Transport Deadlock
  if (transportFailure || incompleteStages.some(s => s.causes.has('transport'))) {
    const stalledOperations: StalledOperationDetail[] = incompleteStages.map(stg => {
      const stepObj = steps[stg.step];
      const target = targetOf(stg.step);
      return {
        job: stg.job,
        operationId: stepObj.id,
        operationName: getOpName(stepObj.id),
        stationId: target.stationId,
        copy: target.copy,
        status: 'transport-wait',
        waitCauses: Array.from(stg.causes),
        missingResourceExplanation: transportFailure || 'Brak wolnego wózka transportowego lub trasy dojazdu.',
      };
    });

    return {
      type: 'transport-deadlock',
      atSeconds: now,
      title: 'Zatrzymanie transportu montażu',
      summary: transportFailure
        ? `Niemożliwy transport: ${transportFailure}`
        : 'Wszystkie wózki transportowe są zajęte, zablokowane na stacjach bez powrotu lub brak personelu transportowego.',
      stalledOperations,
      blockedStations,
      recommendation: 'Sprawdź konfigurację floty wózków, trasy powrotne po rozładunku oraz dostępność personelu transportu montażowego.',
    };
  }

  // Check 5: Calendar Exhaustion
  if (incompleteStages.some(s => s.causes.has('calendar'))) {
    const calStage = incompleteStages.find(s => s.causes.has('calendar'))!;
    const op = steps[calStage.step];
    const tgt = targetOf(calStage.step);
    const stalledOperations: StalledOperationDetail[] = incompleteStages.map(stg => {
      const stepObj = steps[stg.step];
      const target = targetOf(stg.step);
      return {
        job: stg.job,
        operationId: stepObj.id,
        operationName: getOpName(stepObj.id),
        stationId: target.stationId,
        copy: target.copy,
        status: 'waiting',
        waitCauses: Array.from(stg.causes),
        missingResourceExplanation: 'Brak wspólnego okna w kalendarzu stanowiska i zespołu pracowników po bieżącej chwili.',
      };
    });

    return {
      type: 'calendar-exhaustion',
      atSeconds: now,
      title: 'Wygaśnięcie okien kalendarza roboczego',
      summary: `Dla operacji ${getOpName(op.id)} (sztuka ${calStage.job}) na stacji ${getStationName(tgt.stationId)} kalendarz roboczy stanowiska lub przypisanych pracowników nie przewiduje dalszych zmian/okien pracy w horyzoncie symulacji.`,
      stalledOperations,
      blockedStations,
      recommendation: `Zwiększ liczbę zmian lub rozszerz godziny pracy w kalendarzu stanowiska ${getStationName(tgt.stationId)} lub przypisanych pracowników.`,
    };
  }

  // Fallback: General Process Stall
  const stalledOperations: StalledOperationDetail[] = incompleteStages.map(stg => {
    const stepObj = steps[stg.step];
    const target = targetOf(stg.step);
    return {
      job: stg.job,
      operationId: stepObj.id,
      operationName: getOpName(stepObj.id),
      stationId: target.stationId,
      copy: target.copy,
      status: 'waiting',
      waitCauses: Array.from(stg.causes),
      missingResourceExplanation: 'Nie można wyznaczyć zasobów ani dalszego kroku symulacji.',
    };
  });

  return {
    type: 'process-stall',
    atSeconds: now,
    title: 'Zatrzymanie symulacji procesu',
    summary: 'Kolejka zdarzeń symulacji została wyczerpana przed ukończeniem partii, a żadna z oczekujących operacji nie może rozpocząć pracy.',
    stalledOperations,
    blockedStations,
    recommendation: 'Sprawdź spójność kalendarzy, obsady, buforów oraz zaopatrzenia materiałowego dla operacji, które nie zostały ukończone.',
  };
}

export interface UnbufferedStallContext {
  now: number;
  completed: number;
  total: number;
  waiting: Array<{
    job: number;
    step: number;
    ready: number;
    causes: Set<string>;
  }>;
  steps: Array<{id: string; name?: string; assignedWorkstationId?: string}>;
  project: DomainProjectV6;
  book: WorkerReservationBook;
  stockRun?: {stocks: any[]; events: any[]};
  lotRun?: {lots: Array<{status: string; declaration: {id: string; subassemblyId: string}}>; events: any[]};
  transportFailures?: string[];
  candidateOf: (stepId: string) => {stationId: string; copy: number};
}

export function diagnoseUnbufferedProcessStall(ctx: UnbufferedStallContext): ProcessStallDiagnostic {
  const {
    now,
    waiting,
    steps,
    project,
    lotRun,
    transportFailures,
    candidateOf,
  } = ctx;

  const getStationName = (id: string) => project.stations.find(s => s.id === id)?.name || id;
  const getOpName = (id: string) => steps.find(s => s.id === id)?.name || id;

  const stalledOperations: StalledOperationDetail[] = waiting.map(w => {
    const step = steps[w.step];
    const candidate = candidateOf(step.id);
    let explanation = 'Oczekiwanie na zasoby lub kalendarz.';
    if (w.causes.has('material')) explanation = 'Brak wymaganego materiału ze zadeklarowanego zaopatrzenia.';
    else if (w.causes.has('calendar')) explanation = 'Brak wspólnego okna w kalendarzu stanowiska i zespołu.';
    else if (w.causes.has('workers')) explanation = 'Brak wolnych uprawnionych pracowników w zespole.';
    else if (w.causes.has('transport')) explanation = 'Brak wózka lub trasy transportowej.';
    else if (w.causes.has('station')) explanation = 'Zajętość kopii stanowiska.';

    return {
      job: w.job,
      operationId: step.id,
      operationName: getOpName(step.id),
      stationId: candidate.stationId,
      copy: candidate.copy,
      status: 'waiting',
      waitCauses: Array.from(w.causes),
      missingResourceExplanation: explanation,
    };
  });

  // Check subassemblies
  if (lotRun?.lots.some(l => l.status !== 'consumed')) {
    const unconsumed = lotRun.lots.find(l => l.status !== 'consumed')!;
    return {
      type: 'subassembly-starvation',
      atSeconds: now,
      title: 'Nieukończone pobranie podzespołu',
      summary: `Harmonogram nie zakończył wszystkich operacji: partia podzespołu ${unconsumed.declaration.subassemblyId} (${unconsumed.declaration.id}) nie została pobrana przez odbiorcę.`,
      stalledOperations,
      blockedStations: [],
      recommendation: 'Sprawdź zależności technologiczne oraz przypisania sztuk i operacji producenta/odbiorcy partii.',
    };
  }

  // Check material
  if (waiting.some(w => w.causes.has('material'))) {
    const matWaiting = waiting.find(w => w.causes.has('material'))!;
    const op = steps[matWaiting.step];
    const st = candidateOf(op.id);
    return {
      type: 'material-starvation',
      atSeconds: now,
      title: 'Zatrzymanie procesu z braku materiału',
      summary: `Harmonogram nie zakończył wszystkich operacji: operacja ${getOpName(op.id)} (sztuka ${matWaiting.job}) na stacji ${getStationName(st.stationId)} nie otrzymała wymaganych materiałów; brak wystarczającego zapasu i dalszych dostaw.`,
      stalledOperations,
      blockedStations: [],
      recommendation: `Sprawdź harmonogram dostaw i zapas początkowy przy stanowisku ${getStationName(st.stationId)}.`,
    };
  }

  // Check calendar
  if (waiting.some(w => w.causes.has('calendar'))) {
    const calWaiting = waiting.find(w => w.causes.has('calendar'))!;
    const op = steps[calWaiting.step];
    const st = candidateOf(op.id);
    return {
      type: 'calendar-exhaustion',
      atSeconds: now,
      title: 'Brak okna kalendarza roboczego',
      summary: `Harmonogram nie zakończył wszystkich operacji: dla operacji ${getOpName(op.id)} (sztuka ${calWaiting.job}) na stacji ${getStationName(st.stationId)} brak wspólnego okna w kalendarzu stanowiska i pracowników w horyzoncie symulacji.`,
      stalledOperations,
      blockedStations: [],
      recommendation: 'Rozszerz godziny zmian lub dodaj kolejne okna pracy w kalendarzu zasobów.',
    };
  }

  // Check transport
  if (transportFailures?.length || waiting.some(w => w.causes.has('transport'))) {
    return {
      type: 'transport-deadlock',
      atSeconds: now,
      title: 'Zatrzymanie lub zakleszczenie transportu montażu',
      summary: `Harmonogram nie zakończył wszystkich operacji lub zakleszczenie: ${transportFailures?.join(' ') || 'brak wolnych wózków lub trasy transportowej'}.`,
      stalledOperations,
      blockedStations: [],
      recommendation: 'Sprawdź trasy, liczbę wózków oraz powroty po rozładunku w konfiguracji transportu montażu.',
    };
  }

  // Check workers
  if (waiting.some(w => w.causes.has('workers'))) {
    return {
      type: 'worker-deadlock',
      atSeconds: now,
      title: 'Brak dostępnych pracowników zespołu',
      summary: 'Harmonogram nie zakończył wszystkich operacji lub zakleszczenie: brak wolnych pracowników spełniających wymagania obsady operacji.',
      stalledOperations,
      blockedStations: [],
      recommendation: 'Zwiększ liczebność zespołu w wyborze stałego składu lub zmień przypisania pracowników do operacji.',
    };
  }

  return {
    type: 'process-stall',
    atSeconds: now,
    title: 'Zatrzymanie symulacji procesu',
    summary: 'Harmonogram nie zakończył wszystkich operacji lub rezerwacji; sprawdź jawne okna kalendarzy.',
    stalledOperations,
    blockedStations: [],
    recommendation: 'Sprawdź jawne kalendarze zasobów, dostępność stanowisk oraz zależności operacji.',
  };
}
