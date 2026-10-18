import {useState} from 'react';
import type {DomainProjectV6} from '../../core/domainProject';
import {
  validateChangeoverMatrix,
  validateProductionOrders,
  orderBatches,
  type ChangeoverMatrix,
  type ProductVariant,
  type ChangeoverTransition,
  type ProductionOrderBatch,
  type BatchSequenceStrategy,
} from '../../core/changeoverMatrix';

export function DomainChangeoverEditor({
  project,
  onApply,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
}: {
  project: DomainProjectV6;
  onApply: (change: {changeoverMatrix?: ChangeoverMatrix; productionOrders?: ProductionOrderBatch[]}) => boolean;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
}) {
  const [variants, setVariants] = useState<ProductVariant[]>(() =>
    structuredClone(project.changeoverMatrix?.variants ?? [])
  );
  const [defaultDuration, setDefaultDuration] = useState<number>(() =>
    project.changeoverMatrix?.defaultDurationSeconds ?? 0
  );
  const [defaultBasis, setDefaultBasis] = useState<'measured' | 'assumed'>(() =>
    project.changeoverMatrix?.defaultDurationBasis ?? 'assumed'
  );
  const [transitions, setTransitions] = useState<ChangeoverTransition[]>(() =>
    structuredClone(project.changeoverMatrix?.transitions ?? [])
  );
  const [orders, setOrders] = useState<ProductionOrderBatch[]>(() =>
    structuredClone(project.productionOrders ?? [])
  );
  const [strategy, setStrategy] = useState<BatchSequenceStrategy>('as-declared');

  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState('');

  const markDirty = () => {
    setDirty(true);
    setError('');
  };

  // --- Warianty ---
  const addVariant = () => {
    const id = `VAR-${variants.length + 1}`;
    setVariants([...variants, {id, name: `Wariant ${variants.length + 1}`, color: '#2563eb'}]);
    markDirty();
  };

  const updateVariant = (index: number, patch: Partial<ProductVariant>) => {
    const next = [...variants];
    next[index] = {...next[index], ...patch};
    setVariants(next);
    markDirty();
  };

  const removeVariant = (index: number) => {
    const removedId = variants[index].id;
    setVariants(variants.filter((_, i) => i !== index));
    // Oczyszczanie powiązanych reguł i zleceń
    setTransitions(transitions.filter(t => t.fromVariantId !== removedId && t.toVariantId !== removedId));
    setOrders(orders.filter(o => o.variantId !== removedId));
    markDirty();
  };

  // --- Przezbrojenia (Przejścia) ---
  const addTransition = () => {
    const id = `TR-${transitions.length + 1}`;
    setTransitions([
      ...transitions,
      {
        id,
        fromVariantId: '*',
        toVariantId: '*',
        durationSeconds: 60,
        durationBasis: 'assumed',
        cleanoutRequired: false,
      },
    ]);
    markDirty();
  };

  const updateTransition = (index: number, patch: Partial<ChangeoverTransition>) => {
    const next = [...transitions];
    next[index] = {...next[index], ...patch};
    setTransitions(next);
    markDirty();
  };

  const removeTransition = (index: number) => {
    setTransitions(transitions.filter((_, i) => i !== index));
    markDirty();
  };

  // --- Zlecenia partii produkcyjnych ---
  const addOrder = () => {
    const batchId = `BATCH-${orders.length + 1}`;
    const firstVarId = variants[0]?.id ?? 'DEFAULT';
    setOrders([
      ...orders,
      {
        batchId,
        variantId: firstVarId,
        quantity: 1,
      },
    ]);
    markDirty();
  };

  const updateOrder = (index: number, patch: Partial<ProductionOrderBatch>) => {
    const next = [...orders];
    next[index] = {...next[index], ...patch};
    setOrders(next);
    markDirty();
  };

  const removeOrder = (index: number) => {
    setOrders(orders.filter((_, i) => i !== index));
    markDirty();
  };

  const applySequencingStrategy = (strat: BatchSequenceStrategy) => {
    setStrategy(strat);
    if (!orders.length) return;
    try {
      const matrixCandidate: ChangeoverMatrix = {
        variants,
        defaultDurationSeconds: defaultDuration,
        defaultDurationBasis: defaultBasis,
        transitions,
      };
      const ordered = orderBatches(orders, matrixCandidate, strat);
      setOrders([...ordered]);
      markDirty();
    } catch (err) {
      setError((err as Error).message);
    }
  };

  // --- Zapis ---
  const save = () => {
    setError('');
    try {
      let matrixPayload: ChangeoverMatrix | undefined = undefined;
      if (variants.length > 0 || transitions.length > 0 || defaultDuration > 0) {
        matrixPayload = {
          variants,
          defaultDurationSeconds: defaultDuration,
          defaultDurationBasis: defaultBasis,
          transitions,
        };
        const stationIds = new Set(project.stations.map(s => s.id));
        validateChangeoverMatrix(matrixPayload, stationIds);
      }

      let ordersPayload: ProductionOrderBatch[] | undefined = undefined;
      if (orders.length > 0) {
        ordersPayload = orders;
        validateProductionOrders(ordersPayload, matrixPayload);
      }

      const applied = onApply({
        changeoverMatrix: matrixPayload,
        productionOrders: ordersPayload,
      });

      if (applied) {
        setDirty(false);
      }
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const clearAll = () => {
    const applied = onApply({
      changeoverMatrix: undefined,
      productionOrders: undefined,
    });
    if (applied) {
      setVariants([]);
      setDefaultDuration(0);
      setDefaultBasis('assumed');
      setTransitions([]);
      setOrders([]);
      setDirty(false);
      setError('');
    }
  };

  return (
    <div className="panel" aria-label="Przezbrojenia i warianty produktów (ID 7.3)">
      <h3>Warianty produktów, macierz przezbrojeń i zlecenia partii (Plan 7.3)</h3>
      <p className="muted">
        Zdefiniuj warianty produktów, reguły czasów przezbrojeń między wariantami (na poziomie linii lub dedykowanych stanowisk)
        oraz zlecenia partii produkcyjnych z kolejnością wykonania. Czas przezbrojenia wymaga jawnego wskazania podstawy (pomiar / założenie).
      </p>
      <div className="toolbar">
        <button disabled={!canUndo} onClick={onUndo}>Cofnij dane szkicu</button>
        <button disabled={!canRedo} onClick={onRedo}>Ponów dane szkicu</button>
      </div>

      {/* Sekcja 1: Warianty produktów */}
      <h4>1. Warianty wyrobów ({variants.length})</h4>
      {variants.length === 0 ? (
        <p className="notice">Brak zdefiniowanych wariantów wyrobów (domyślnie linia produkuje jeden jednorodny wyrób).</p>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>ID wariantu</th>
                <th>Nazwa</th>
                <th>Kod / symbol</th>
                <th>Opis / uwagi</th>
                <th>Kolor</th>
                <th>Akcje</th>
              </tr>
            </thead>
            <tbody>
              {variants.map((v, i) => (
                <tr key={i}>
                  <td>
                    <input
                      aria-label={`ID wariantu ${i + 1}`}
                      value={v.id}
                      onChange={e => updateVariant(i, {id: e.target.value.trim()})}
                      style={{width: '120px'}}
                    />
                  </td>
                  <td>
                    <input
                      aria-label={`Nazwa wariantu ${i + 1}`}
                      value={v.name}
                      onChange={e => updateVariant(i, {name: e.target.value})}
                    />
                  </td>
                  <td>
                    <input
                      aria-label={`Kod wariantu ${i + 1}`}
                      value={v.code ?? ''}
                      placeholder="kod"
                      onChange={e => updateVariant(i, {code: e.target.value.trim()})}
                      style={{width: '90px'}}
                    />
                  </td>
                  <td>
                    <input
                      aria-label={`Opis wariantu ${i + 1}`}
                      value={v.description ?? ''}
                      placeholder="opcjonalnie"
                      onChange={e => updateVariant(i, {description: e.target.value})}
                    />
                  </td>
                  <td>
                    <input
                      type="color"
                      aria-label={`Kolor wariantu ${i + 1}`}
                      value={v.color ?? '#2563eb'}
                      onChange={e => updateVariant(i, {color: e.target.value})}
                      style={{width: '45px', height: '30px', padding: 0}}
                    />
                  </td>
                  <td>
                    <button className="danger" onClick={() => removeVariant(i)}>Usuń</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <div className="toolbar">
        <button onClick={addVariant}>Dodaj wariant</button>
      </div>

      {/* Sekcja 2: Ustawienia domyślne macierzy */}
      <h4>2. Domyślny czas przezbrojenia linii</h4>
      <div className="form-grid">
        <label className="field">
          Domyślny czas przezbrojenia [s]
          <input
            type="number"
            min="0"
            step="1"
            aria-label="Domyślny czas przezbrojenia"
            value={defaultDuration}
            onChange={e => {
              setDefaultDuration(Math.max(0, Number(e.target.value)));
              markDirty();
            }}
          />
        </label>
        <label className="field">
          Podstawa czasu domyślnego
          <select
            aria-label="Podstawa czasu domyślnego"
            value={defaultBasis}
            onChange={e => {
              setDefaultBasis(e.target.value as 'measured' | 'assumed');
              markDirty();
            }}
          >
            <option value="assumed">Założony / szacowany (assumed)</option>
            <option value="measured">Zmierzony / potwierdzony (measured)</option>
          </select>
        </label>
      </div>

      {/* Sekcja 3: Reguły przezbrojeń (przejścia) */}
      <h4>3. Dedykowane reguły przezbrojeń ({transitions.length})</h4>
      <p className="muted">
        Hierarchia dopasowania: 1) Stacja + z wariantu do wariantu, 2) Stacja + wildcard (*), 3) Ogólna reguła linii + para, 4) Ogólna + wildcard (*), 5) Czas domyślny.
      </p>
      {transitions.length === 0 ? (
        <p className="notice">Brak szczegółowych reguł przejść (obowiązuje czas domyślny).</p>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Stanowisko</th>
                <th>Z wariantu (From)</th>
                <th>Do wariantu (To)</th>
                <th>Czas [s]</th>
                <th>Podstawa czasu</th>
                <th>Czyszczenie / mycie</th>
                <th>Akcje</th>
              </tr>
            </thead>
            <tbody>
              {transitions.map((t, i) => (
                <tr key={i}>
                  <td>
                    <input
                      aria-label={`ID reguły ${i + 1}`}
                      value={t.id}
                      onChange={e => updateTransition(i, {id: e.target.value.trim()})}
                      style={{width: '70px'}}
                    />
                  </td>
                  <td>
                    <select
                      aria-label={`Stanowisko reguły ${i + 1}`}
                      value={t.stationId ?? ''}
                      onChange={e => updateTransition(i, {stationId: e.target.value || undefined})}
                    >
                      <option value="">Wszystkie stanowiska linii (ogólna)</option>
                      {project.stations.map(s => (
                        <option key={s.id} value={s.id}>{s.name} · {s.id}</option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <select
                      aria-label={`Z wariantu reguły ${i + 1}`}
                      value={t.fromVariantId}
                      onChange={e => updateTransition(i, {fromVariantId: e.target.value})}
                    >
                      <option value="*">* Dowolny wariant (*)</option>
                      {variants.map(v => (
                        <option key={v.id} value={v.id}>{v.name} ({v.id})</option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <select
                      aria-label={`Do wariantu reguły ${i + 1}`}
                      value={t.toVariantId}
                      onChange={e => updateTransition(i, {toVariantId: e.target.value})}
                    >
                      <option value="*">* Dowolny wariant (*)</option>
                      {variants.map(v => (
                        <option key={v.id} value={v.id}>{v.name} ({v.id})</option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      aria-label={`Czas reguły ${i + 1}`}
                      value={t.durationSeconds}
                      onChange={e => updateTransition(i, {durationSeconds: Math.max(0, Number(e.target.value))})}
                      style={{width: '80px'}}
                    />
                  </td>
                  <td>
                    <select
                      aria-label={`Podstawa czasu reguły ${i + 1}`}
                      value={t.durationBasis}
                      onChange={e => updateTransition(i, {durationBasis: e.target.value as 'measured' | 'assumed'})}
                    >
                      <option value="assumed">Założony</option>
                      <option value="measured">Zmierzony</option>
                    </select>
                  </td>
                  <td>
                    <label style={{display: 'flex', alignItems: 'center', gap: '0.4rem'}}>
                      <input
                        type="checkbox"
                        checked={t.cleanoutRequired ?? false}
                        onChange={e => updateTransition(i, {cleanoutRequired: e.target.checked})}
                      />
                      Wymagane
                    </label>
                  </td>
                  <td>
                    <button className="danger" onClick={() => removeTransition(i)}>Usuń</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <div className="toolbar">
        <button onClick={addTransition}>Dodaj regułę przezbrojenia</button>
      </div>

      {/* Sekcja 4: Zlecenia partii produkcyjnych */}
      <h4>4. Zlecenia partii produkcyjnych ({orders.length})</h4>
      <p className="muted">
        Zdefiniuj sekwencję zleceń partii produkcyjnych. Możesz zastosować algorytmy szeregowania sekwencji (minimalizacja przezbrojeń, Heijunka).
      </p>
      {orders.length === 0 ? (
        <p className="notice">Brak zleceń partii wielowariantowych (symulacja symuluje jednolitą partię o rozmiarze podanym w oknie symulacji).</p>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Lp.</th>
                <th>ID partii (Batch ID)</th>
                <th>Wariant wyrobu</th>
                <th>Wielkość partii [szt.]</th>
                <th>Priorytet</th>
                <th>Uwagi</th>
                <th>Akcje</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o, i) => (
                <tr key={i}>
                  <td>{i + 1}</td>
                  <td>
                    <input
                      aria-label={`ID partii ${i + 1}`}
                      value={o.batchId}
                      onChange={e => updateOrder(i, {batchId: e.target.value.trim()})}
                      style={{width: '120px'}}
                    />
                  </td>
                  <td>
                    <select
                      aria-label={`Wariant partii ${i + 1}`}
                      value={o.variantId}
                      onChange={e => updateOrder(i, {variantId: e.target.value})}
                    >
                      {variants.map(v => (
                        <option key={v.id} value={v.id}>{v.name} ({v.id})</option>
                      ))}
                      {!variants.some(v => v.id === o.variantId) && (
                        <option value={o.variantId}>{o.variantId}</option>
                      )}
                    </select>
                  </td>
                  <td>
                    <input
                      type="number"
                      min="1"
                      step="1"
                      aria-label={`Ilość partii ${i + 1}`}
                      value={o.quantity}
                      onChange={e => updateOrder(i, {quantity: Math.max(1, Math.floor(Number(e.target.value)))})}
                      style={{width: '90px'}}
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      aria-label={`Priorytet partii ${i + 1}`}
                      value={o.priority ?? 0}
                      onChange={e => updateOrder(i, {priority: Number(e.target.value)})}
                      style={{width: '60px'}}
                    />
                  </td>
                  <td>
                    <input
                      aria-label={`Uwagi partii ${i + 1}`}
                      value={o.notes ?? ''}
                      placeholder="opcjonalnie"
                      onChange={e => updateOrder(i, {notes: e.target.value})}
                    />
                  </td>
                  <td>
                    <button className="danger" onClick={() => removeOrder(i)}>Usuń</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <div className="toolbar" style={{alignItems: 'center', gap: '1rem'}}>
        <button onClick={addOrder}>Dodaj zlecenie partii</button>
        {orders.length > 1 && (
          <>
            <label className="field" style={{flexDirection: 'row', alignItems: 'center', gap: '0.5rem'}}>
              Strategia sekwencjonowania:
              <select
                aria-label="Strategia sekwencjonowania"
                value={strategy}
                onChange={e => applySequencingStrategy(e.target.value as BatchSequenceStrategy)}
              >
                <option value="as-declared">Zgodnie z deklaracją (kolejność tabeli)</option>
                <option value="minimize-changeover-greedy">Minimalizacja przezbrojeń (Grupowanie wariantów)</option>
                <option value="heijunka-leveling">Wyrównywanie Heijunka (Przeplatanie partii)</option>
              </select>
            </label>
          </>
        )}
      </div>

      {/* Przyciski operacyjne */}
      <div className="toolbar" style={{marginTop: '1.5rem'}}>
        <button className="primary" onClick={save}>Zapisz konfigurację wariantów i przezbrojeń</button>
        {(project.changeoverMatrix || project.productionOrders) && (
          <button className="danger" onClick={clearAll}>Wyczyść i usuń konfigurację</button>
        )}
      </div>

      {dirty && <p role="status">Wprowadzono zmiany — kliknij „Zapisz konfigurację”, aby zaktualizować model.</p>}
      {error && <pre className="error" role="alert">{error}</pre>}
    </div>
  );
}
