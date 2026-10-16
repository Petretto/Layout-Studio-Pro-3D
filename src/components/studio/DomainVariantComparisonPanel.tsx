import {useEffect, useMemo, useRef, useState} from 'react';
import type {DomainProjectV6} from '../../core/domainProject';
import {download} from '../../core/project';
import {startScheduleTask, type ScheduleProgress} from '../../core/scheduleTask';
import {
  buildVariantComparisonReport,
  deleteDomainVariant,
  domainVariantCategoryLabels,
  inspectVariantFactors,
  prepareVariantForDraftRestore,
  readDomainVariants,
  replaceDomainVariants,
  saveDomainVariant,
  summarizeStaticVariant,
  validateExperimentConditions,
  type DomainVariantCategory,
  type SavedDomainVariant,
  type VariantComparisonReport,
  type VariantScheduleOutcomeInput,
} from '../../core/domainVariantComparison';

const basisLabel = {
  measured: 'pomiar',
  assumed: 'założenie',
  mixed: 'mieszane (pomiar + założenie)',
  missing: 'brak wyboru obsady',
} as const;

function formatDelta(value: number | null, unit: string): string {
  if (value === null) return '—';
  if (value === 0) return `0 ${unit}`;
  return `${value > 0 ? '+' : ''}${value} ${unit}`;
}

export function DomainVariantComparisonPanel({
  project,
  originalJson,
  onRestoreVariant,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
}: {
  project: DomainProjectV6;
  originalJson: string;
  onRestoreVariant: (next: DomainProjectV6, variantName: string) => boolean;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
}) {
  const [libraryState, setLibraryState] = useState(() => readDomainVariants(localStorage));
  const [variantName, setVariantName] = useState('');
  const [category, setCategory] = useState<DomainVariantCategory>('baseline');
  const [baselineId, setBaselineId] = useState('');
  const [excludedIds, setExcludedIds] = useState<string[]>([]);
  const [batch, setBatch] = useState(String(project.bodyRunInput?.jobs.length ?? 1));
  const [arrivalInterval, setArrivalInterval] = useState('1');
  const [justInTime, setJustInTime] = useState(false);
  const [report, setReport] = useState<VariantComparisonReport | null>(null);
  const [progress, setProgress] = useState<{variantIndex: number; variantCount: number; variantName: string; schedule: ScheduleProgress} | null>(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [downloadedRaw, setDownloadedRaw] = useState<string | null>(null);
  const cancelRef = useRef<(() => void) | null>(null);

  useEffect(() => () => {
    cancelRef.current?.();
  }, []);

  const cancelRunning = () => {
    cancelRef.current?.();
    cancelRef.current = null;
    setProgress(null);
  };

  const clearComparison = () => {
    cancelRunning();
    setReport(null);
    setError('');
  };

  useEffect(() => {
    cancelRunning();
    setReport(null);
  }, [project]);

  const variants = libraryState.status === 'valid' ? libraryState.saved.variants : [];
  const foreignSource = variants.length > 0 && variants[0].originalJson !== originalJson;
  const compatibleVariants = foreignSource ? [] : variants;

  const effectiveBaselineId = useMemo(() => {
    if (compatibleVariants.some(item => item.id === baselineId)) return baselineId;
    const explicitBaseline = compatibleVariants.find(item => item.category === 'baseline');
    return explicitBaseline?.id ?? compatibleVariants[0]?.id ?? '';
  }, [compatibleVariants, baselineId]);

  const selectedVariants = useMemo(
    () => compatibleVariants.filter(item => item.id === effectiveBaselineId || !excludedIds.includes(item.id)),
    [compatibleVariants, effectiveBaselineId, excludedIds],
  );

  const baselineVariant = useMemo(
    () => compatibleVariants.find(item => item.id === effectiveBaselineId) ?? null,
    [compatibleVariants, effectiveBaselineId],
  );

  const currentProjectSignature = useMemo(() => JSON.stringify(project), [project]);

  const handleSaveVariant = () => {
    clearComparison();
    setMessage('');
    if (libraryState.status !== 'empty' && libraryState.status !== 'valid') {
      setError('Biblioteka wariantów jest niedostępna lub wymaga odzyskania przed zapisem.');
      return;
    }
    try {
      const expectedRaw = libraryState.status === 'valid' ? libraryState.raw : null;
      const written = saveDomainVariant(
        localStorage,
        {
          name: variantName,
          category,
          originalJson,
          project,
        },
        expectedRaw,
      );
      setLibraryState({status: 'valid', raw: written.raw, saved: written.saved});
      if (!effectiveBaselineId || category === 'baseline') {
        setBaselineId(written.variant.id);
      }
      setVariantName('');
      setMessage(`Zapisano wariant szkicu 6 „${written.variant.name}” (${domainVariantCategoryLabels[written.variant.category]}).`);
    } catch (failure) {
      setLibraryState(readDomainVariants(localStorage));
      setError(`Nie zapisano wariantu: ${(failure as Error).message}`);
    }
  };

  const handleDeleteVariant = (variant: SavedDomainVariant) => {
    clearComparison();
    setMessage('');
    if (libraryState.status !== 'valid') return;
    try {
      const written = deleteDomainVariant(localStorage, variant.id, libraryState.raw);
      setLibraryState({status: 'valid', raw: written.raw, saved: written.saved});
      setExcludedIds(ids => ids.filter(id => id !== variant.id));
      setMessage(`Usunięto wariant „${variant.name}” z biblioteki szkicu 6.`);
    } catch (failure) {
      setLibraryState(readDomainVariants(localStorage));
      setError(`Nie usunięto wariantu: ${(failure as Error).message}`);
    }
  };

  const handleRestoreVariant = (variant: SavedDomainVariant) => {
    clearComparison();
    setMessage('');
    try {
      const next = prepareVariantForDraftRestore(variant, originalJson);
      if (onRestoreVariant(next, variant.name)) {
        setMessage(`Wczytano wariant „${variant.name}” do aktywnego szkicu 6. Możesz cofnąć zmianę przyciskiem Cofnij.`);
      }
    } catch (failure) {
      setError(`Nie wczytano wariantu: ${(failure as Error).message}`);
    }
  };

  const handleClearAfterExport = () => {
    clearComparison();
    setMessage('');
    if ((libraryState.status !== 'valid' && libraryState.status !== 'corrupt') || downloadedRaw !== libraryState.raw) return;
    try {
      const written = replaceDomainVariants(localStorage, [], libraryState.raw);
      setLibraryState({status: 'valid', raw: written.raw, saved: written.saved});
      setDownloadedRaw(null);
      setExcludedIds([]);
      setBaselineId('');
      setMessage('Wyczyszczono bibliotekę wariantów szkicu 6 po pobraniu kopii.');
    } catch (failure) {
      setLibraryState(readDomainVariants(localStorage));
      setError(`Nie wyczyszczono biblioteki: ${(failure as Error).message}`);
    }
  };

  const runComparison = () => {
    clearComparison();
    setMessage('');
    let checkedConditions;
    try {
      const count = Number(batch);
      if (!Number.isSafeInteger(count) || count < 1 || count > 100) {
        throw new Error('Porównanie w UI dopuszcza partię od 1 do 100 sztuk.');
      }
      checkedConditions = validateExperimentConditions({
        batch: count,
        arrivalIntervalSeconds: Number(arrivalInterval),
        transportMode: justInTime ? 'just-in-time' : 'configured',
      });
      if (selectedVariants.length < 2) {
        throw new Error('Wybierz co najmniej dwa zapisane warianty szkicu 6 do porównania.');
      }
      if (!effectiveBaselineId || !selectedVariants.some(v => v.id === effectiveBaselineId)) {
        throw new Error('Wskaż wariant bazowy spośród porównywanych wariantów.');
      }
    } catch (failure) {
      setError((failure as Error).message);
      return;
    }

    const queue = [...selectedVariants];
    const outcomes = new Map<string, VariantScheduleOutcomeInput>();
    let cancelled = false;

    const runNext = (index: number) => {
      if (cancelled) return;
      if (index >= queue.length) {
        cancelRef.current = null;
        setProgress(null);
        try {
          setReport(buildVariantComparisonReport(queue, effectiveBaselineId, checkedConditions, outcomes));
          setMessage(`Porównano ${queue.length} wariantów przy jednakowych warunkach eksperymentu.`);
        } catch (failure) {
          setError((failure as Error).message);
        }
        return;
      }
      const current = queue[index];
      const totalOps = current.project.operations.length * checkedConditions.batch;
      setProgress({
        variantIndex: index + 1,
        variantCount: queue.length,
        variantName: current.name,
        schedule: {completed: 0, total: totalOps},
      });
      const stopCurrent = startScheduleTask(
        {
          project: current.project,
          batch: checkedConditions.batch,
          arrivalIntervalSeconds: checkedConditions.arrivalIntervalSeconds,
          transportMode: checkedConditions.transportMode,
        },
        {
          progress: scheduleProgress => {
            if (cancelled) return;
            setProgress({
              variantIndex: index + 1,
              variantCount: queue.length,
              variantName: current.name,
              schedule: scheduleProgress,
            });
          },
          result: value => {
            if (cancelled) return;
            outcomes.set(current.id, {status: 'completed', result: value});
            runNext(index + 1);
          },
          error: errMessage => {
            if (cancelled) return;
            outcomes.set(current.id, {status: 'error', error: errMessage});
            runNext(index + 1);
          },
        },
        () => new Worker(new URL('../../core/schedule.worker.ts', import.meta.url), {type: 'module'}),
      );
      cancelRef.current = () => {
        cancelled = true;
        stopCurrent();
      };
    };

    runNext(0);
  };

  return (
    <div className="panel" aria-label="Porównanie wariantów szkicu 6">
      <h3>Porównywanie zapisanych wariantów — szkic 6</h3>
      <p className="muted">
        Zapisuj migawki szkicu 6 jako osobne warianty (bazowy, dodatkowy pracownik, dodatkowe stanowisko, zmieniony layout) i porównuj je przy dokładnie tych samych warunkach eksperymentu (wielkość partii, odstęp przybycia, tryb transportu). Biblioteka wariantów szkicu 6 jest odizolowana od projektów 4/5.
      </p>
      <p className="muted">
        Szacunek statyczny (liczba zasobów i suma czasów technologicznych) jest prezentowany oddzielnie od wyniku dynamicznego harmonogramu. Oczekiwania mieszane są wykazane bez dzielenia czasu między przyczyny. Program nie dopowiada czasów, zasobów, zapasów ani parametrów nowych stanowisk.
      </p>

      <div className="toolbar">
        <label className="field">
          Nazwa wariantu szkicu 6
          <input
            aria-label="Nazwa wariantu szkicu 6"
            value={variantName}
            placeholder="np. Wariant bazowy / +1 operator"
            onChange={event => {
              setVariantName(event.target.value);
              setError('');
            }}
          />
        </label>
        <label className="field">
          Typ porównywanego wariantu
          <select
            aria-label="Typ porównywanego wariantu"
            value={category}
            onChange={event => {
              setCategory(event.target.value as DomainVariantCategory);
              setError('');
            }}
          >
            {(Object.keys(domainVariantCategoryLabels) as DomainVariantCategory[]).map(key => (
              <option key={key} value={key}>
                {domainVariantCategoryLabels[key]}
              </option>
            ))}
          </select>
        </label>
        <button onClick={handleSaveVariant}>Zapisz wariant szkicu 6</button>
        <button disabled={!canUndo} onClick={() => {clearComparison(); onUndo();}}>Cofnij dane szkicu</button>
        <button disabled={!canRedo} onClick={() => {clearComparison(); onRedo();}}>Ponów dane szkicu</button>
      </div>

      {libraryState.status === 'unavailable' && (
        <p className="error" role="alert">
          Pamięć przeglądarki dla biblioteki wariantów jest niedostępna: {libraryState.error}
        </p>
      )}

      {libraryState.status === 'corrupt' && (
        <div className="notice" role="alert" aria-label="Odzyskiwanie uszkodzonej biblioteki wariantów szkicu 6">
          <p>
            Zapisana biblioteka wariantów szkicu 6 jest uszkodzona: {libraryState.error}. Nie została nadpisana. Pobierz surową kopię przed jej wyczyszczeniem.
          </p>
          <div className="toolbar">
            <button
              onClick={() => {
                download(libraryState.raw, 'Odzyskiwanie_wariantow_szkicu_v6.json', 'application/json');
                setDownloadedRaw(libraryState.raw);
              }}
            >
              Pobierz surową kopię biblioteki wariantów
            </button>
            <button disabled={downloadedRaw !== libraryState.raw} onClick={handleClearAfterExport}>
              Wyczyść uszkodzoną bibliotekę po pobraniu kopii
            </button>
          </div>
        </div>
      )}

      {foreignSource && libraryState.status === 'valid' && (
        <div className="notice" role="alert" aria-label="Niezgodne źródło zapisanych wariantów szkicu 6">
          <p>
            Zapisane warianty ({variants.length}) pochodzą z innego projektu źródłowego 4/5 niż aktywny szkic 6. Nie łączymy ich automatycznie. Pobierz kopię biblioteki, a następnie wyczyść ją przed zapisem wariantów bieżącego projektu.
          </p>
          <div className="toolbar">
            <button
              onClick={() => {
                download(libraryState.raw, 'Biblioteka_wariantow_szkicu_v6.json', 'application/json');
                setDownloadedRaw(libraryState.raw);
              }}
            >
              Pobierz bibliotekę wariantów JSON
            </button>
            <button disabled={downloadedRaw !== libraryState.raw} onClick={handleClearAfterExport}>
              Wyczyść bibliotekę poprzedniego źródła
            </button>
          </div>
        </div>
      )}

      {compatibleVariants.length === 0 && libraryState.status === 'valid' && !foreignSource && (
        <p className="muted">Brak zapisanych wariantów dla bieżącego źródła szkicu 6.</p>
      )}
      {libraryState.status === 'empty' && (
        <p className="muted">Brak zapisanych wariantów szkicu 6. Zapisz co najmniej dwa warianty (np. bazowy i usprawniony), aby uruchomić porównanie.</p>
      )}

      {compatibleVariants.length > 0 && (
        <>
          <div className="toolbar">
            <label className="field">
              Wariant bazowy odniesienia
              <select
                aria-label="Wariant bazowy odniesienia"
                value={effectiveBaselineId}
                onChange={event => {
                  clearComparison();
                  setBaselineId(event.target.value);
                }}
              >
                {compatibleVariants.map(item => (
                  <option key={item.id} value={item.id}>
                    {item.name} ({domainVariantCategoryLabels[item.category]})
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              Liczba sztuk w porównaniu
              <input
                aria-label="Liczba sztuk w porównaniu wariantów"
                type="number"
                min="1"
                max="100"
                step="1"
                value={batch}
                onChange={event => {
                  clearComparison();
                  setBatch(event.target.value);
                }}
              />
            </label>
            <label className="field">
              Odstęp przybycia sztuk [s]
              <input
                aria-label="Odstęp przybycia w porównaniu wariantów [s]"
                type="number"
                min="0.001"
                step="any"
                value={arrivalInterval}
                onChange={event => {
                  clearComparison();
                  setArrivalInterval(event.target.value);
                }}
              />
            </label>
          </div>

          <label className="toolbar">
            <input
              type="checkbox"
              aria-label="Symulacja porównania bez transportu — just in time"
              checked={justInTime}
              onChange={event => {
                clearComparison();
                setJustInTime(event.target.checked);
              }}
            />
            Symulacja porównania bez transportu — wszystko dostępne just in time (wspólny warunek dla wszystkich wariantów)
          </label>

          <div className="table-wrap" aria-label="Zapisane warianty szkicu 6">
            <table>
              <thead>
                <tr>
                  <th>W porównaniu</th>
                  <th>Wariant i deklarowana rola</th>
                  <th>Szacunek statyczny (zasoby, suma czasów, trasy)</th>
                  <th>Różnice względem wariantu bazowego</th>
                  <th>Akcje</th>
                </tr>
              </thead>
              <tbody>
                {compatibleVariants.map(item => {
                  const isBase = item.id === effectiveBaselineId;
                  const included = isBase || !excludedIds.includes(item.id);
                  const staticInfo = summarizeStaticVariant(item.project);
                  const diff = baselineVariant
                    ? inspectVariantFactors(baselineVariant.project, item.project, item.category, isBase)
                    : {changedDimensions: [], summary: [], comparabilityWarnings: []};
                  const matchesActiveDraft = JSON.stringify(item.project) === currentProjectSignature;
                  return (
                    <tr key={item.id}>
                      <td>
                        <input
                          type="checkbox"
                          aria-label={`Uwzględnij wariant ${item.name}`}
                          checked={included}
                          disabled={isBase}
                          onChange={event => {
                            clearComparison();
                            const checked = event.target.checked;
                            setExcludedIds(prev => (checked ? prev.filter(id => id !== item.id) : [...prev, item.id]));
                          }}
                        />
                      </td>
                      <td>
                        <strong>{item.name}</strong> · <span>{domainVariantCategoryLabels[item.category]}</span>
                        {isBase && <> · <strong>[BAZA]</strong></>}
                        {matchesActiveDraft && <> · <small>zgodny z aktywnym szkicem</small></>}
                        <div><small>{new Date(item.at).toLocaleString('pl-PL')} · ID: {item.id}</small></div>
                      </td>
                      <td>
                        Zespół: {staticInfo.teamWorkersCount}/{staticInfo.definedWorkersCount} os. · Stanowiska: {staticInfo.activeStationsCount}/{staticInfo.totalStationsCount} (kopie: {staticInfo.totalCopiesCount}) · Suma czasów: {staticInfo.selectedWorkContentSeconds !== null ? `${staticInfo.selectedWorkContentSeconds} s/szt.` : 'brak wyboru'} ({basisLabel[staticInfo.timeBasis]}) · Trasy: {staticInfo.declaredRoutesCount} ({staticInfo.totalRouteDistanceMm} mm) · Układ: {staticInfo.targetLayoutType} ({staticInfo.layoutObjectsCount} ob.)
                      </td>
                      <td>
                        <div>{diff.summary.join('; ') || '—'}</div>
                        {diff.comparabilityWarnings.map((warn, idx) => (
                          <div key={idx} className="warn"><small>Uwaga porównywalności: {warn}</small></div>
                        ))}
                      </td>
                      <td>
                        <button onClick={() => handleRestoreVariant(item)}>Wczytaj do szkicu 6</button>
                        <button
                          onClick={() =>
                            download(
                              JSON.stringify(item, null, 2),
                              `Wariant_v6_${item.name.replace(/[^\p{L}\p{N}_-]/gu, '_')}.json`,
                              'application/json',
                            )
                          }
                        >
                          JSON
                        </button>
                        <button className="danger" onClick={() => handleDeleteVariant(item)}>
                          Usuń
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="toolbar">
            <button disabled={selectedVariants.length < 2 || !!progress} onClick={runComparison}>
              Porównaj warianty w symulacji ({selectedVariants.length})
            </button>
            {progress && (
              <button onClick={() => {cancelRunning(); setMessage('Anulowano porównywanie wariantów.');}}>
                Anuluj porównanie wariantów
              </button>
            )}
          </div>
        </>
      )}

      {progress && (
        <div role="status" aria-label="Postęp porównania wariantów szkicu 6">
          <progress max={progress.schedule.total} value={progress.schedule.completed} /> Wariant {progress.variantIndex} z {progress.variantCount} ({progress.variantName}): {progress.schedule.completed} / {progress.schedule.total} operacji.
        </div>
      )}

      {message && <p role="status">{message}</p>}
      {error && <p className="error" role="alert">{error}</p>}

      {report && (
        <div aria-label="Wynik porównania wariantów szkicu 6">
          <h4>
            Zestawienie porównawcze — partia {report.conditions.batch} szt., odstęp przybycia {report.conditions.arrivalIntervalSeconds} s, tryb: {report.conditions.transportMode === 'just-in-time' ? 'just in time (bez transportu, założona dostępność materiałów)' : 'skonfigurowany (z transportem, korpusami i zaopatrzeniem)'}
          </h4>
          <p className="muted">
            Wszystkie wiersze obliczono dla tych samych warunków eksperymentu. Szacunek statyczny [s/szt.] opisuje wyłącznie zapisane parametry i nie zastępuje wyniku symulacji. Czasy oczekiwań jednoprzyczynowych i oczekiwań mieszanych są rozdzielone (bez dzielenia oczekiwań mieszanych na poszczególne przyczyny).
          </p>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Wariant (typ)</th>
                  <th>Zmieniony czynnik i kontrola warunków</th>
                  <th>Szacunek statyczny (zasoby i suma czasów [s/szt.])</th>
                  <th>Wynik symulacji: czas partii [s] (Δ vs baza)</th>
                  <th>Przepustowość śr. [szt./h] (Δ vs baza) i czas przejścia [s]</th>
                  <th>Praca netto [s] i najdłużej pracująca kopia (unia)</th>
                  <th>Oczekiwania jednoprzyczynowe [s]</th>
                  <th>Oczekiwania mieszane [s] / blokady wyjścia [s] / transport</th>
                  <th>Jawne założenia przebiegu</th>
                </tr>
              </thead>
              <tbody>
                {report.rows.map(row => {
                  const st = row.staticSummary;
                  const dyn = row.dynamic;
                  return (
                    <tr key={row.variantId} aria-label={`Wiersz porównania ${row.name}`}>
                      <td>
                        <strong>{row.name}</strong>
                        <div><small>{domainVariantCategoryLabels[row.category]}{row.isBaseline ? ' · BAZA' : ''}</small></div>
                      </td>
                      <td>
                        <div>{row.factorDiff.summary.join('; ')}</div>
                        {row.factorDiff.comparabilityWarnings.map((warn, idx) => (
                          <div key={idx} className="warn"><small>Uwaga: {warn}</small></div>
                        ))}
                      </td>
                      <td>
                        <div>Zespół: {st.teamWorkersCount} os. · Stacje: {st.activeStationsCount}/{st.totalStationsCount} · Kopie: {st.totalCopiesCount}</div>
                        <div>Suma pracy: {st.selectedWorkContentSeconds !== null ? `${st.selectedWorkContentSeconds} s/szt.` : '—'} · Maks. kopia stat.: {st.maxStaticCopyLoadSeconds !== null ? `${st.maxStaticCopyLoadSeconds} s/szt.` : '—'}</div>
                        <div><small>Pochodzenie czasów: {basisLabel[st.timeBasis]} · Trasy: {st.totalRouteDistanceMm} mm</small></div>
                      </td>
                      {dyn.status === 'error' ? (
                        <td colSpan={6} className="error">
                          Odmowa / zatrzymanie przebiegu: {dyn.error}
                        </td>
                      ) : (
                        <>
                          <td>
                            <strong>{dyn.makespanSeconds} s</strong>
                            <div><small>Δ vs baza: {row.isBaseline ? 'baza (0 s)' : formatDelta(dyn.deltaMakespanSeconds, 's')}</small></div>
                          </td>
                          <td>
                            <strong>{dyn.throughputPerHour} szt./h</strong>
                            <div><small>Δ vs baza: {row.isBaseline ? 'baza (0 szt./h)' : formatDelta(dyn.deltaThroughputPerHour, 'szt./h')}</small></div>
                            <div><small>Śr. czas przejścia: {dyn.averageLeadTimeSeconds} s</small></div>
                          </td>
                          <td>
                            <div>Praca netto: {dyn.netProcessingSeconds} s</div>
                            <div>
                              <small>
                                {dyn.busiestCopy
                                  ? `Maks. kopia: ${dyn.busiestCopy.stationId}/${dyn.busiestCopy.copy} — ${dyn.busiestCopy.seconds} s (${(dyn.busiestCopy.share * 100).toFixed(1)}%)`
                                  : 'Brak pracy kopii'}
                              </small>
                            </div>
                          </td>
                          <td>
                            <div>Razem jednoprzyczynowe: {dyn.singleCauseWaitSeconds.totalSingleCause} s</div>
                            <div>
                              <small>
                                obsada: {dyn.singleCauseWaitSeconds.workers} s · transport: {dyn.singleCauseWaitSeconds.transport} s · blokady/bufory: {dyn.singleCauseWaitSeconds.blocking} s · materiał/podzespoły: {dyn.singleCauseWaitSeconds.material} s · kalendarz: {dyn.singleCauseWaitSeconds.calendar} s · inne: {dyn.singleCauseWaitSeconds.other} s
                              </small>
                            </div>
                          </td>
                          <td>
                            <div>Mieszane (bez podziału): {dyn.mixedWaitSeconds} s</div>
                            {dyn.unclassifiedWaitSeconds > 0 && <div><small>Bez kodu: {dyn.unclassifiedWaitSeconds} s</small></div>}
                            <div>Blokady po pracy: {dyn.blockedHoldSeconds} s</div>
                            <div>
                              <small>
                                Transport: {report.conditions.transportMode === 'just-in-time'
                                  ? 'pominięty (JIT)'
                                  : `${dyn.transportMovementsSeconds} s (${dyn.transportMovementsCount} ruchów)`}
                              </small>
                            </div>
                          </td>
                          <td>
                            {dyn.assumptions.length > 0 ? dyn.assumptions.join('; ') : 'Pomiarowe czasy i skonfigurowany transport'}
                          </td>
                        </>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
