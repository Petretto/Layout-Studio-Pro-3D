import {useEffect, useMemo, useRef, useState} from 'react';
import type {DomainProjectV6} from '../../core/domainProject';
import {download} from '../../core/project';
import {startScheduleTask, type ScheduleProgress} from '../../core/scheduleTask';
import {
  buildVariantComparisonMarkdownReport,
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
  type VariantCostAccountingMode,
  type VariantCostBasis,
  type VariantCostCurrency,
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
  const [costCurrency, setCostCurrency] = useState<VariantCostCurrency>('PLN');
  const [costBasis, setCostBasis] = useState<VariantCostBasis>('assumed');
  const [costAccountingMode, setCostAccountingMode] = useState<VariantCostAccountingMode>('committed-makespan');
  const [costSource, setCostSource] = useState('');
  const [operatorRateInput, setOperatorRateInput] = useState('');
  const [stationRateInput, setStationRateInput] = useState('');
  const [floorRateInput, setFloorRateInput] = useState('');
  const [showMarkdownPreview, setShowMarkdownPreview] = useState(false);
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

  const markdownReport = useMemo(
    () => (report ? buildVariantComparisonMarkdownReport(report) : ''),
    [report],
  );

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

  const parseOptionalRate = (raw: string): number | null => {
    const trimmed = raw.trim();
    if (!trimmed) return null;
    return Number(trimmed);
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
      const opRate = parseOptionalRate(operatorRateInput);
      const stRate = parseOptionalRate(stationRateInput);
      const sqRate = parseOptionalRate(floorRateInput);
      const hasAnyCostInput = opRate !== null || stRate !== null || sqRate !== null || costSource.trim().length > 0;
      checkedConditions = validateExperimentConditions({
        batch: count,
        arrivalIntervalSeconds: Number(arrivalInterval),
        transportMode: justInTime ? 'just-in-time' : 'configured',
        costAssumptions: hasAnyCostInput
          ? {
              currency: costCurrency,
              basis: costBasis,
              accountingMode: costAccountingMode,
              source: costSource,
              operatorHourlyRate: opRate,
              stationHourlyRate: stRate,
              floorSqmRate: sqRate,
            }
          : null,
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
        Szacunek statyczny (liczba zasobów i suma czasów technologicznych) jest prezentowany oddzielnie od wyniku dynamicznego harmonogramu. Oczekiwania mieszane są wykazane bez dzielenia czasu między przyczyny. Program nie dopowiada czasów, zasobów, zapasów, powierzchni ani stawek kosztowych.
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

          <div aria-label="Jawne stawki kosztowe porównania 4.6">
            <h5>Jawne stawki kosztowe i założenia porównania (opcjonalne — 4.6)</h5>
            <p className="muted">
              Stawki kosztowe nie są zgadywane ani uzupełniane domyślnie. Jeżeli wpiszesz dowolną stawkę, podaj również jej źródło/założenie.
            </p>
            <div className="toolbar">
              <label className="field">
                Waluta stawek
                <select
                  aria-label="Waluta stawek kosztowych wariantów"
                  value={costCurrency}
                  onChange={event => {
                    clearComparison();
                    setCostCurrency(event.target.value as VariantCostCurrency);
                  }}
                >
                  <option value="PLN">PLN</option>
                  <option value="EUR">EUR</option>
                  <option value="USD">USD</option>
                </select>
              </label>
              <label className="field">
                Podstawa stawek
                <select
                  aria-label="Podstawa stawek kosztowych wariantów"
                  value={costBasis}
                  onChange={event => {
                    clearComparison();
                    setCostBasis(event.target.value as VariantCostBasis);
                  }}
                >
                  <option value="assumed">założone (assumed)</option>
                  <option value="confirmed">potwierdzone (confirmed)</option>
                </select>
              </label>
              <label className="field">
                Rozliczanie czasu zasobów
                <select
                  aria-label="Rozliczanie czasu zasobów w kosztach wariantów"
                  value={costAccountingMode}
                  onChange={event => {
                    clearComparison();
                    setCostAccountingMode(event.target.value as VariantCostAccountingMode);
                  }}
                >
                  <option value="committed-makespan">zaangażowanie zespołu i kopii w horyzoncie makespanu</option>
                  <option value="active-time">wyłącznie czas aktywnej pracy / zajętości</option>
                </select>
              </label>
              <label className="field">
                Stawka operatora [/h]
                <input
                  aria-label="Jawna stawka godzinowa operatora"
                  type="number"
                  min="0"
                  step="any"
                  placeholder="brak"
                  value={operatorRateInput}
                  onChange={event => {
                    clearComparison();
                    setOperatorRateInput(event.target.value);
                  }}
                />
              </label>
              <label className="field">
                Stawka stanowiska [/h]
                <input
                  aria-label="Jawna stawka godzinowa stanowiska"
                  type="number"
                  min="0"
                  step="any"
                  placeholder="brak"
                  value={stationRateInput}
                  onChange={event => {
                    clearComparison();
                    setStationRateInput(event.target.value);
                  }}
                />
              </label>
              <label className="field">
                Stawka powierzchni [/m²]
                <input
                  aria-label="Jawna stawka powierzchni m2"
                  type="number"
                  min="0"
                  step="any"
                  placeholder="brak"
                  value={floorRateInput}
                  onChange={event => {
                    clearComparison();
                    setFloorRateInput(event.target.value);
                  }}
                />
              </label>
              <label className="field">
                Źródło i założenia stawek
                <input
                  aria-label="Źródło i założenia stawek kosztowych"
                  value={costSource}
                  placeholder="np. kalkulacja kontrolingu Q4 / założenie koncepcyjne"
                  onChange={event => {
                    clearComparison();
                    setCostSource(event.target.value);
                  }}
                />
              </label>
            </div>
          </div>

          <div className="table-wrap" aria-label="Zapisane warianty szkicu 6">
            <table>
              <thead>
                <tr>
                  <th>W porównaniu</th>
                  <th>Wariant i deklarowana rola</th>
                  <th>Szacunek statyczny (zasoby, suma czasów, trasy, powierzchnia)</th>
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
                        Zespół: {staticInfo.teamWorkersCount}/{staticInfo.definedWorkersCount} os. · Stanowiska: {staticInfo.activeStationsCount}/{staticInfo.totalStationsCount} (kopie: {staticInfo.totalCopiesCount}) · Suma czasów: {staticInfo.selectedWorkContentSeconds !== null ? `${staticInfo.selectedWorkContentSeconds} s/szt.` : 'brak wyboru'} ({basisLabel[staticInfo.timeBasis]}) · Trasy: {staticInfo.declaredRoutesCount} ({staticInfo.totalRouteDistanceMm} mm) · Układ: {staticInfo.targetLayoutType} ({staticInfo.layoutObjectsCount} ob., pow. ob.: {staticInfo.objectsFootprintSqm} m², hala: {staticInfo.facilityAreaSqm} m²)
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
            Wszystkie wiersze obliczono dla tych samych warunków eksperymentu. Szacunek statyczny [s/szt.] oraz statyczny pułap kopii [szt./h] opisują wyłącznie zapisane parametry i nie zastępują wyniku symulacji. Czasy oczekiwań jednoprzyczynowych i oczekiwań mieszanych są rozdzielone (bez dzielenia oczekiwań mieszanych na poszczególne przyczyny).
          </p>

          <div className="toolbar">
            <button
              onClick={() =>
                download(
                  markdownReport,
                  `Raport_porownania_wariantow_v6_${new Date().toISOString().slice(0, 10)}.md`,
                  'text/markdown;charset=utf-8',
                )
              }
            >
              Pobierz raport porównania (.md)
            </button>
            <button onClick={() => setShowMarkdownPreview(prev => !prev)}>
              {showMarkdownPreview ? 'Ukryj podgląd raportu (.md)' : 'Pokaż podgląd raportu (.md)'}
            </button>
          </div>

          {showMarkdownPreview && (
            <pre aria-label="Podgląd raportu Markdown porównania wariantów" style={{whiteSpace: 'pre-wrap', maxHeight: '280px', overflow: 'auto'}}>
              {markdownReport}
            </pre>
          )}

          <h5>Synteza wskaźników 4.6: wydajność, czas przejścia, WIP, obsada, powierzchnia i koszty</h5>
          <div className="table-wrap" aria-label="Tabela syntezy wskaźników 4.6">
            <table>
              <thead>
                <tr>
                  <th>Wariant (typ)</th>
                  <th>Wydajność: stat. pułap kopii vs dyn. harmonogram [szt./h]</th>
                  <th>Czas przejścia od przybycia / w procesie [s]</th>
                  <th>WIP w procesie i w systemie [szt.]</th>
                  <th>Obsada i stanowiska (wykorzystanie w makespanie)</th>
                  <th>Powierzchnia: obiekty / obrys / hala [m²]</th>
                  <th>Koszty przy jawnych stawkach i założeniach</th>
                </tr>
              </thead>
              <tbody>
                {report.rows.map(row => {
                  const st = row.staticSummary;
                  const dyn = row.dynamic;
                  return (
                    <tr key={`synth-${row.variantId}`} aria-label={`Synteza 4.6 ${row.name}`}>
                      <td>
                        <strong>{row.name}</strong>
                        <div><small>{domainVariantCategoryLabels[row.category]}{row.isBaseline ? ' · BAZA' : ''}</small></div>
                      </td>
                      {dyn.status === 'error' ? (
                        <td colSpan={6} className="error">
                          Odmowa / zatrzymanie przebiegu: {dyn.error}
                        </td>
                      ) : (
                        <>
                          <td>
                            <div>Dyn.: <strong>{dyn.throughputPerHour} szt./h</strong> ({row.isBaseline ? 'baza' : formatDelta(dyn.deltaThroughputPerHour, 'szt./h')})</div>
                            <div>Makespan: <strong>{dyn.makespanSeconds} s</strong> ({row.isBaseline ? 'baza' : formatDelta(dyn.deltaMakespanSeconds, 's')})</div>
                            <div><small>Stat. pułap kopii: {st.staticCapacityPerHour !== null ? `${st.staticCapacityPerHour} szt./h` : '—'} (maks. kopia: {st.maxStaticCopyLoadSeconds ?? '—'} s/szt.)</small></div>
                          </td>
                          <td>
                            <div>Od przybycia: <strong>{dyn.averageLeadTimeSeconds} s</strong> ({row.isBaseline ? 'baza' : formatDelta(dyn.deltaAverageLeadTimeSeconds, 's')})</div>
                            <div><small>zakres od przybycia: {dyn.minLeadTimeSeconds}–{dyn.maxLeadTimeSeconds} s</small></div>
                            <div>W procesie (od 1. op.): <strong>{dyn.averageProcessingSpanSeconds} s</strong> ({row.isBaseline ? 'baza' : formatDelta(dyn.deltaAverageProcessingSpanSeconds, 's')})</div>
                            <div><small>Praca netto/szt.: {dyn.netProcessingPerPieceSeconds} s · Sprawność przepływu: {(dyn.flowEfficiencyRatio * 100).toFixed(1)}%</small></div>
                          </td>
                          <td>
                            <div>W procesie śr.: <strong>{dyn.averageActiveWipPieces} szt.</strong> ({row.isBaseline ? 'baza' : formatDelta(dyn.deltaAverageActiveWipPieces, 'szt.')}) · maks.: <strong>{dyn.maxActiveWipPieces} szt.</strong></div>
                            <div><small>W systemie (od przybycia) śr.: {dyn.averageSystemWipPieces} szt. ({row.isBaseline ? 'baza' : formatDelta(dyn.deltaAverageSystemWipPieces, 'szt.')}) · maks.: {dyn.maxSystemWipPieces} szt.</small></div>
                          </td>
                          <td>
                            <div>Zespół: <strong>{st.teamWorkersCount}/{st.definedWorkersCount} os.</strong> · aktywność: {dyn.workerActiveSeconds} s</div>
                            <div><small>Wykorzystanie zespołu śr.: {(dyn.averageTeamWorkerUtilization * 100).toFixed(1)}% · maks. os.: {(dyn.maxTeamWorkerUtilization * 100).toFixed(1)}%</small></div>
                            <div>Stanowiska: <strong>{st.activeStationsCount}/{st.totalStationsCount}</strong> · kopie akt.: <strong>{st.activeCopiesCount}/{st.totalCopiesCount}</strong></div>
                            <div><small>Zajętość kopii śr.: {(dyn.averageActiveCopyOccupancy * 100).toFixed(1)}% · maks. kopii: {(dyn.maxActiveCopyOccupancy * 100).toFixed(1)}%</small></div>
                          </td>
                          <td>
                            <div>Obiekty ({st.layoutObjectsCount}): <strong>{st.objectsFootprintSqm} m²</strong> ({row.isBaseline ? 'baza' : formatDelta(st.deltaObjectsFootprintSqm, 'm²')})</div>
                            <div><small>Obrys zespołu ob.: {st.boundingBoxAreaSqm !== null ? `${st.boundingBoxAreaSqm} m²` : 'brak ob. layoutObjects'}</small></div>
                            <div><small>Hala: {st.facilityAreaSqm} m² · Trasy: {st.totalRouteDistanceMm} mm</small></div>
                          </td>
                          <td>
                            {dyn.costEvaluation ? (
                              <>
                                <div>
                                  Koszt oper. partii: <strong>{dyn.costEvaluation.batchOperatingCost !== null ? `${dyn.costEvaluation.batchOperatingCost} ${dyn.costEvaluation.currency}` : 'brak stawek h'}</strong>
                                  {dyn.costEvaluation.batchOperatingCost !== null && (
                                    <> ({row.isBaseline ? 'baza' : formatDelta(dyn.costEvaluation.deltaBatchOperatingCost, dyn.costEvaluation.currency)})</>
                                  )}
                                </div>
                                <div>
                                  Koszt oper./szt.: <strong>{dyn.costEvaluation.unitOperatingCost !== null ? `${dyn.costEvaluation.unitOperatingCost} ${dyn.costEvaluation.currency}/szt.` : '—'}</strong>
                                  {dyn.costEvaluation.unitOperatingCost !== null && (
                                    <> ({row.isBaseline ? 'baza' : formatDelta(dyn.costEvaluation.deltaUnitOperatingCost, `${dyn.costEvaluation.currency}/szt.`)})</>
                                  )}
                                </div>
                                <div>
                                  <small>
                                    Praca (akt./zaang.): {dyn.costEvaluation.laborActiveCost ?? '—'} / {dyn.costEvaluation.laborCommittedCost ?? '—'} {dyn.costEvaluation.currency} · Stanowiska (zaj./zaang.): {dyn.costEvaluation.stationOccupiedCost ?? '—'} / {dyn.costEvaluation.stationCommittedCost ?? '—'} {dyn.costEvaluation.currency}
                                  </small>
                                </div>
                                <div>
                                  <small>
                                    Pow. obiektów: {dyn.costEvaluation.objectsFootprintCost !== null ? `${dyn.costEvaluation.objectsFootprintCost} ${dyn.costEvaluation.currency}` : 'brak ob./stawki'} · Hala: {dyn.costEvaluation.facilityFloorCost !== null ? `${dyn.costEvaluation.facilityFloorCost} ${dyn.costEvaluation.currency}` : '—'} · BOM/szt.: {dyn.costEvaluation.bomUnitCost ?? 'brak BOM'}
                                  </small>
                                </div>
                                <div><small>Podstawa: {dyn.costEvaluation.basis === 'confirmed' ? 'potwierdzone' : 'założone'} ({dyn.costEvaluation.source})</small></div>
                              </>
                            ) : (
                              <div>
                                <small>Brak podanych stawek (koszty operacyjne i powierzchniowe nie są zgadywane). BOM/szt.: {st.bomUnitCost !== null ? `${st.bomUnitCost} (wg BOM)` : 'brak pozycji BOM'}.</small>
                              </div>
                            )}
                          </td>
                        </>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <h5>Szczegóły ograniczeń przepustowości (4.4) i kontroli czynników (4.5)</h5>
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

