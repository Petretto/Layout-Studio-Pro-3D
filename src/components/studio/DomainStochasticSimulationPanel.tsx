import {useState} from 'react';
import type {DomainProjectV6} from '../../core/domainProject';
import {
  runMonteCarloSimulation,
  validateStochasticConfig,
  type StochasticSimulationConfig,
  type StochasticSummaryReport,
  type DurationVariabilityConfig,
  type EquipmentBreakdownModel,
} from '../../core/stochasticSimulation';

export function DomainStochasticSimulationPanel({
  project,
  onApply,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
}: {
  project: DomainProjectV6;
  onApply: (config: StochasticSimulationConfig | undefined) => boolean;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
}) {
  const [enabled, setEnabled] = useState<boolean>(() => project.stochasticConfig?.enabled ?? false);
  const [seed, setSeed] = useState<number>(() => project.stochasticConfig?.seed ?? 42);
  const [iterations, setIterations] = useState<number>(() => project.stochasticConfig?.iterations ?? 15);

  const [distType, setDistType] = useState<DurationVariabilityConfig['distribution']>(() =>
    project.stochasticConfig?.defaultOperationVariability?.distribution ?? 'triangular'
  );
  const [minMult, setMinMult] = useState<number>(() =>
    project.stochasticConfig?.defaultOperationVariability?.minMultiplier ?? 0.85
  );
  const [modeMult, setModeMult] = useState<number>(() =>
    project.stochasticConfig?.defaultOperationVariability?.modeMultiplier ?? 1.0
  );
  const [maxMult, setMaxMult] = useState<number>(() =>
    project.stochasticConfig?.defaultOperationVariability?.maxMultiplier ?? 1.15
  );
  const [stdDevPercent, setStdDevPercent] = useState<number>(() => {
    const s = project.stochasticConfig?.defaultOperationVariability?.relativeStdDev;
    return s ? Math.round(s * 100) : 10;
  });

  const [breakdowns, setBreakdowns] = useState<EquipmentBreakdownModel[]>(() =>
    structuredClone(project.stochasticConfig?.breakdowns ?? [])
  );

  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  // Simulation execution state
  const [simBatch, setSimBatch] = useState<number>(() => project.bodyRunInput?.jobs.length ?? 4);
  const [simArrivalInterval, setSimArrivalInterval] = useState<number>(10);
  const [simJit, setSimJit] = useState<boolean>(true);
  const [running, setRunning] = useState<boolean>(false);
  const [progress, setProgress] = useState<{completed: number; total: number} | null>(null);
  const [summary, setSummary] = useState<StochasticSummaryReport | null>(null);

  const markDirty = () => {
    setDirty(true);
    setError('');
    setMessage('');
  };

  const handleRandomSeed = () => {
    const newSeed = Math.floor(Math.random() * 1000000) + 1;
    setSeed(newSeed);
    markDirty();
  };

  const addBreakdown = () => {
    const firstStation = project.stations[0]?.id;
    setBreakdowns([
      ...breakdowns,
      {
        stationId: firstStation,
        mtbfSeconds: 300,
        mttrSeconds: 30,
        repairDistribution: 'constant',
      },
    ]);
    markDirty();
  };

  const updateBreakdown = (index: number, patch: Partial<EquipmentBreakdownModel>) => {
    const next = [...breakdowns];
    next[index] = {...next[index], ...patch};
    setBreakdowns(next);
    markDirty();
  };

  const removeBreakdown = (index: number) => {
    setBreakdowns(breakdowns.filter((_, i) => i !== index));
    markDirty();
  };

  const buildCurrentConfig = (): StochasticSimulationConfig => {
    const defaultOperationVariability: DurationVariabilityConfig = {
      distribution: distType,
      ...(distType === 'triangular' ? {minMultiplier: minMult, modeMultiplier: modeMult, maxMultiplier: maxMult} : {}),
      ...(distType === 'uniform' ? {minMultiplier: minMult, maxMultiplier: maxMult} : {}),
      ...(distType === 'normal' || distType === 'lognormal' ? {relativeStdDev: stdDevPercent / 100} : {}),
    };

    return {
      enabled,
      seed,
      iterations,
      defaultOperationVariability,
      breakdowns,
    };
  };

  const handleSaveConfig = () => {
    try {
      const config = buildCurrentConfig();
      const stationIds = new Set(project.stations.map(s => s.id));
      const opIds = new Set(project.operations.map(o => o.id));
      validateStochasticConfig(config, stationIds, opIds);
      const ok = onApply(config);
      if (ok) {
        setDirty(false);
        setError('');
        setMessage('Zapisano konfigurację symulacji stochastycznej w szkicu 6.');
      }
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const handleDisableAndClear = () => {
    const ok = onApply(undefined);
    if (ok) {
      setEnabled(false);
      setBreakdowns([]);
      setDirty(false);
      setError('');
      setMessage('Usunięto konfigurację stochastyczną ze szkicu 6.');
    }
  };

  const runSimulation = () => {
    setError('');
    setMessage('');
    setRunning(true);
    setProgress({completed: 0, total: iterations});

    // Run in timeout to yield to React rendering
    setTimeout(() => {
      try {
        const config = buildCurrentConfig();
        const configuredProject: DomainProjectV6 = {
          ...project,
          stochasticConfig: config,
        };

        const result = runMonteCarloSimulation(configuredProject, simBatch, simArrivalInterval, {
          transportMode: simJit ? 'just-in-time' : 'configured',
          onIterationProgress: (completed, total) => {
            setProgress({completed, total});
          },
        });

        setSummary(result);
        setMessage(`Zakończono pomyślnie ${result.iterationsCount} replikacji Monte Carlo (ziarno: ${result.seed}).`);
      } catch (err) {
        setError(`Błąd symulacji stochastycznej: ${(err as Error).message}`);
      } finally {
        setRunning(false);
        setProgress(null);
      }
    }, 50);
  };

  return (
    <div className="panel" aria-label="Symulacja stochastyczna Monte Carlo (Plan 7.4)">
      <h3>🎲 Symulacja stochastyczna Monte Carlo (Plan 7.4)</h3>
      <p className="muted">
        Symulacja serii replikacji z losową zmiennością czasów operacji i awariami maszyn (MTBF/MTTR).
        Wszystkie przebiegi są w 100% deterministycznie powtarzalne dla danego ziarna losowego (Zasada 5).
      </p>

      {message && <p className="notice" role="status">{message}</p>}
      {error && <p className="error" role="alert">{error}</p>}

      <div className="toolbar" style={{marginBottom: '1rem'}}>
        <label style={{display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600}}>
          <input
            type="checkbox"
            checked={enabled}
            onChange={e => {
              setEnabled(e.target.checked);
              markDirty();
            }}
          />
          Aktywuj zmienność stochastyczną w symulacji
        </label>
      </div>

      <div className="form-grid" style={{marginBottom: '1rem'}}>
        <label className="field">
          Liczba powtórzeń (replikacji) Monte Carlo
          <input
            type="number"
            min="1"
            max="100"
            value={iterations}
            onChange={e => {
              setIterations(Math.max(1, Math.min(100, Number(e.target.value) || 1)));
              markDirty();
            }}
          />
        </label>

        <label className="field">
          Ziarno generatora PRNG (determinizm)
          <div style={{display: 'flex', gap: '0.5rem'}}>
            <input
              type="number"
              value={seed}
              onChange={e => {
                setSeed(Number(e.target.value) || 0);
                markDirty();
              }}
            />
            <button type="button" onClick={handleRandomSeed} title="Wylosuj nowe ziarno">
              🎲 Losuj
            </button>
          </div>
        </label>
      </div>

      <details open style={{marginBottom: '1rem'}}>
        <summary><strong>⏱️ Zmienność czasów trwania operacji</strong></summary>
        <div style={{padding: '0.5rem 0'}}>
          <div className="form-grid">
            <label className="field">
              Rozkład prawdopodobieństwa
              <select
                value={distType}
                onChange={e => {
                  setDistType(e.target.value as DurationVariabilityConfig['distribution']);
                  markDirty();
                }}
              >
                <option value="none">Brak (stałe czasy standardowe)</option>
                <option value="triangular">Trójkątny (min / dominanta / max)</option>
                <option value="normal">Normalny Gaussa (średnia i odchylenie)</option>
                <option value="uniform">Jednostajny (min / max)</option>
                <option value="lognormal">Lognormalny (asymetria prawostronna)</option>
              </select>
            </label>

            {distType === 'triangular' && (
              <>
                <label className="field">
                  Mnożnik minimalny (np. 0.85 = -15%)
                  <input
                    type="number"
                    step="0.05"
                    min="0.1"
                    max="1.0"
                    value={minMult}
                    onChange={e => {
                      setMinMult(Number(e.target.value));
                      markDirty();
                    }}
                  />
                </label>
                <label className="field">
                  Mnożnik modalny (np. 1.0)
                  <input
                    type="number"
                    step="0.05"
                    min="0.5"
                    max="2.0"
                    value={modeMult}
                    onChange={e => {
                      setModeMult(Number(e.target.value));
                      markDirty();
                    }}
                  />
                </label>
                <label className="field">
                  Mnożnik maksymalny (np. 1.15 = +15%)
                  <input
                    type="number"
                    step="0.05"
                    min="1.0"
                    max="3.0"
                    value={maxMult}
                    onChange={e => {
                      setMaxMult(Number(e.target.value));
                      markDirty();
                    }}
                  />
                </label>
              </>
            )}

            {distType === 'uniform' && (
              <>
                <label className="field">
                  Mnożnik minimalny (np. 0.9 = -10%)
                  <input
                    type="number"
                    step="0.05"
                    min="0.1"
                    max="1.0"
                    value={minMult}
                    onChange={e => {
                      setMinMult(Number(e.target.value));
                      markDirty();
                    }}
                  />
                </label>
                <label className="field">
                  Mnożnik maksymalny (np. 1.1 = +10%)
                  <input
                    type="number"
                    step="0.05"
                    min="1.0"
                    max="3.0"
                    value={maxMult}
                    onChange={e => {
                      setMaxMult(Number(e.target.value));
                      markDirty();
                    }}
                  />
                </label>
              </>
            )}

            {(distType === 'normal' || distType === 'lognormal') && (
              <label className="field">
                Odchylenie standardowe [% czasu nominalnego]
                <input
                  type="number"
                  step="1"
                  min="1"
                  max="50"
                  value={stdDevPercent}
                  onChange={e => {
                    setStdDevPercent(Number(e.target.value));
                    markDirty();
                  }}
                />
              </label>
            )}
          </div>
        </div>
      </details>

      <details open style={{marginBottom: '1rem'}}>
        <summary><strong>⚙️ Awarie maszyn i wyposażenia (MTBF / MTTR)</strong></summary>
        <div style={{padding: '0.5rem 0'}}>
          <div className="toolbar" style={{marginBottom: '0.5rem'}}>
            <button type="button" onClick={addBreakdown}>+ Dodaj model awarii stanowiska</button>
          </div>

          {breakdowns.length === 0 ? (
            <p className="muted">Brak skonfigurowanych awarii maszyn (stanowiska pracują bezawaryjnie).</p>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Stanowisko</th>
                    <th>MTBF (średni czas między awariami) [s]</th>
                    <th>MTTR (średni czas naprawy) [s]</th>
                    <th>Rozkład naprawy</th>
                    <th>Akcje</th>
                  </tr>
                </thead>
                <tbody>
                  {breakdowns.map((b, idx) => (
                    <tr key={idx}>
                      <td>
                        <select
                          value={b.stationId ?? ''}
                          onChange={e => updateBreakdown(idx, {stationId: e.target.value || undefined})}
                        >
                          <option value="">Wszystkie stanowiska</option>
                          {project.stations.map(st => (
                            <option key={st.id} value={st.id}>
                              {st.name} ({st.id})
                            </option>
                          ))}
                        </select>
                      </td>
                      <td>
                        <input
                          type="number"
                          min="10"
                          value={b.mtbfSeconds}
                          onChange={e => updateBreakdown(idx, {mtbfSeconds: Number(e.target.value) || 60})}
                          style={{width: '90px'}}
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          min="1"
                          value={b.mttrSeconds}
                          onChange={e => updateBreakdown(idx, {mttrSeconds: Number(e.target.value) || 10})}
                          style={{width: '80px'}}
                        />
                      </td>
                      <td>
                        <select
                          value={b.repairDistribution ?? 'constant'}
                          onChange={e => updateBreakdown(idx, {repairDistribution: e.target.value as any})}
                        >
                          <option value="constant">Stały</option>
                          <option value="exponential">Wykładniczy</option>
                          <option value="normal">Normalny</option>
                        </select>
                      </td>
                      <td>
                        <button type="button" onClick={() => removeBreakdown(idx)} className="danger">
                          Usuń
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </details>

      <div className="toolbar" style={{marginBottom: '1rem', borderTop: '1px solid #e5e7eb', paddingTop: '1rem'}}>
        <button type="button" onClick={handleSaveConfig} disabled={!dirty}>
          Zapisz konfigurację w szkicu 6
        </button>
        <button type="button" onClick={handleDisableAndClear} className="danger">
          Wyłącz zmienność i wyczyść
        </button>
        <button type="button" onClick={onUndo} disabled={!canUndo}>
          Cofnij
        </button>
        <button type="button" onClick={onRedo} disabled={!canRedo}>
          Ponów
        </button>
      </div>

      <div style={{background: '#f8fafc', padding: '1rem', borderRadius: '6px', border: '1px solid #cbd5e1', marginBottom: '1rem'}}>
        <h4 style={{marginTop: 0}}>🚀 Uruchomienie eksperymentu Monte Carlo</h4>
        <div className="form-grid" style={{marginBottom: '0.75rem'}}>
          <label className="field">
            Wielkość partii [szt.]
            <input
              type="number"
              min="1"
              max="50"
              value={simBatch}
              onChange={e => setSimBatch(Number(e.target.value) || 1)}
            />
          </label>
          <label className="field">
            Odstęp przybycia sztuk [s]
            <input
              type="number"
              min="0.1"
              value={simArrivalInterval}
              onChange={e => setSimArrivalInterval(Number(e.target.value) || 1)}
            />
          </label>
        </div>

        <label style={{display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem'}}>
          <input
            type="checkbox"
            checked={simJit}
            onChange={e => setSimJit(e.target.checked)}
          />
          Tryb just-in-time (szybka symulacja procesu bez modelowania dojazdów transportu)
        </label>

        <div className="toolbar">
          <button type="button" onClick={runSimulation} disabled={running}>
            {running ? '⏳ Wykonywanie replikacji...' : '▶️ Uruchom serię Monte Carlo'}
          </button>
        </div>

        {progress && (
          <div style={{marginTop: '0.75rem'}} role="status">
            <progress max={progress.total} value={progress.completed} style={{width: '100%'}} />
            <div style={{fontSize: '12px', color: '#64748b', marginTop: '0.25rem'}}>
              Replikacja {progress.completed} z {progress.total}...
            </div>
          </div>
        )}
      </div>

      {summary && (
        <div className="stochastic-results" style={{marginTop: '1.5rem'}} aria-label="Wyniki symulacji stochastycznej">
          <h4>📊 Wyniki statystyczne i przedziały niepewności (N = {summary.iterationsCount})</h4>

          <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem', marginBottom: '1.5rem'}}>
            <div style={{background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '1rem'}}>
              <h5 style={{marginTop: 0, color: '#1e293b'}}>Czas ukończenia partii (Makespan)</h5>
              <div style={{fontSize: '24px', fontWeight: 'bold', color: '#2563eb'}}>
                {summary.makespan.mean.toFixed(1)} s <span style={{fontSize: '14px', fontWeight: 'normal', color: '#64748b'}}>± {summary.makespan.stdDev.toFixed(1)} s</span>
              </div>
              <ul style={{fontSize: '13px', color: '#475569', paddingLeft: '1.25rem', marginTop: '0.5rem', marginBottom: 0}}>
                <li>Min / Max: <strong>{summary.makespan.min.toFixed(1)} s</strong> – <strong>{summary.makespan.max.toFixed(1)} s</strong></li>
                <li>Mediana: <strong>{summary.makespan.median.toFixed(1)} s</strong></li>
                <li>Przedział 90% [p10–p90]: <strong>{summary.makespan.p10.toFixed(1)} s</strong> – <strong>{summary.makespan.p90.toFixed(1)} s</strong></li>
                <li>Kwantyl p95 (95% pewności): <strong>≤ {summary.makespan.p95.toFixed(1)} s</strong></li>
              </ul>
            </div>

            <div style={{background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '1rem'}}>
              <h5 style={{marginTop: 0, color: '#1e293b'}}>Przepustowość linii (Throughput)</h5>
              <div style={{fontSize: '24px', fontWeight: 'bold', color: '#059669'}}>
                {summary.throughputPerHour.mean.toFixed(2)} szt./h <span style={{fontSize: '14px', fontWeight: 'normal', color: '#64748b'}}>± {summary.throughputPerHour.stdDev.toFixed(2)}</span>
              </div>
              <ul style={{fontSize: '13px', color: '#475569', paddingLeft: '1.25rem', marginTop: '0.5rem', marginBottom: 0}}>
                <li>Min / Max: <strong>{summary.throughputPerHour.min.toFixed(2)}</strong> – <strong>{summary.throughputPerHour.max.toFixed(2)} szt./h</strong></li>
                <li>Mediana: <strong>{summary.throughputPerHour.median.toFixed(2)} szt./h</strong></li>
                <li>Przedział 90% [p10–p90]: <strong>{summary.throughputPerHour.p10.toFixed(2)}</strong> – <strong>{summary.throughputPerHour.p90.toFixed(2)} szt./h</strong></li>
              </ul>
            </div>
          </div>

          <h5>⚠️ Częstotliwość występowania wąskich gardeł (Bottlenecks)</h5>
          <div className="table-wrap" style={{marginBottom: '1.5rem'}}>
            <table>
              <thead>
                <tr>
                  <th>Stanowisko / Zasób</th>
                  <th>Częstotliwość bycia głównym bottleneckiem</th>
                  <th>Udział w replikacjach</th>
                </tr>
              </thead>
              <tbody>
                {summary.bottleneckFrequency.map(bf => {
                  const stationName = project.stations.find(s => s.id === bf.stationId)?.name ?? bf.stationId;
                  return (
                    <tr key={bf.stationId}>
                      <td><strong>{stationName}</strong> ({bf.stationId})</td>
                      <td>{bf.count} z {summary.iterationsCount} replikacji</td>
                      <td>
                        <div style={{display: 'flex', alignItems: 'center', gap: '0.5rem'}}>
                          <div style={{background: '#e2e8f0', width: '100px', height: '10px', borderRadius: '5px', overflow: 'hidden'}}>
                            <div style={{background: '#dc2626', width: `${bf.percentage}%`, height: '100%'}} />
                          </div>
                          <span><strong>{bf.percentage.toFixed(1)}%</strong></span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <details>
            <summary><strong>📋 Szczegóły poszczególnych replikacji ({summary.iterations.length})</strong></summary>
            <div className="table-wrap" style={{marginTop: '0.5rem'}}>
              <table>
                <thead>
                  <tr>
                    <th>Replikacja #</th>
                    <th>Makespan [s]</th>
                    <th>Przepustowość [szt./h]</th>
                    <th>Awarie [s]</th>
                    <th>Główny bottleneck</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.iterations.map(it => (
                    <tr key={it.iterationIndex}>
                      <td>#{it.iterationIndex + 1}</td>
                      <td>{it.makespanSeconds.toFixed(1)}</td>
                      <td>{it.throughputPerHour.toFixed(2)}</td>
                      <td>{it.totalBreakdownSeconds.toFixed(1)}</td>
                      <td>{it.bottleneckStationId ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
        </div>
      )}
    </div>
  );
}
