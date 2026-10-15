import {useState} from 'react';
import type {DomainProjectV6} from '../../core/domainProject';
import {
  validateMaterialSupply,
  type MaterialSupplyV6,
  type MaterialSupplyItem,
  type SupplySchedule,
  type ExplicitSupplyDelivery,
} from '../../core/materialSupply';

export function DomainSupplyEditor({
  project,
  onApply,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
}: {
  project: DomainProjectV6;
  onApply: (supply: MaterialSupplyV6 | undefined) => boolean;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
}) {
  const initialItems = (): MaterialSupplyItem[] =>
    structuredClone(project.materialSupply?.items ?? []);
  const initialConsumptions = (): NonNullable<MaterialSupplyV6['consumptions']> =>
    structuredClone(project.materialSupply?.consumptions ?? []);

  const [items, setItems] = useState<MaterialSupplyItem[]>(initialItems);
  const [consumptions, setConsumptions] = useState<NonNullable<MaterialSupplyV6['consumptions']>>(initialConsumptions);
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState('');

  const changeItems = (next: MaterialSupplyItem[]) => {
    setItems(next);
    setDirty(true);
    setError('');
  };

  const changeConsumptions = (next: NonNullable<MaterialSupplyV6['consumptions']>) => {
    setConsumptions(next);
    setDirty(true);
    setError('');
  };

  const updateItem = (index: number, next: MaterialSupplyItem) =>
    changeItems(items.map((item, i) => (i === index ? next : item)));

  const updateConsumption = (
    index: number,
    next: NonNullable<MaterialSupplyV6['consumptions']>[number],
  ) =>
    changeConsumptions(consumptions.map((item, i) => (i === index ? next : item)));

  const save = () => {
    try {
      const payload: MaterialSupplyV6 = {
        items,
        ...(consumptions.length > 0 ? {consumptions} : {}),
      };
      const validated = validateMaterialSupply(project, payload);
      if (onApply(validated)) {
        setDirty(false);
      }
    } catch (failure) {
      setError((failure as Error).message);
    }
  };

  return (
    <div className="panel" aria-label="Zaopatrzenie materiałowe montażu szkicu 6">
      <h3>Zaopatrzenie materiałowe montażu — zapasy i dostawy</h3>
      <p className="muted">
        Zadeklaruj zapasy początkowe, pozycje materiałowe przy stanowiskach montażowych oraz harmonogramy dostaw (cykliczne lub jawne terminy). Zapas jest dostępny dla kopii wskazanego stanowiska. Nie modelujemy czasu ani pracy magazynierów.
      </p>
      <p className="muted">
        Zużycie przypisz jawnie do operacji. Pobranie następuje atomowo przy rzeczywistym starcie operacji. Dostawy w tym samym czasie są realizowane przed pobraniem. Pierwszy termin dostawy cyklicznej musi być jawny.
      </p>
      <div className="toolbar">
        <button disabled={!canUndo} onClick={onUndo}>Cofnij dane szkicu</button>
        <button disabled={!canRedo} onClick={onRedo}>Ponów dane szkicu</button>
      </div>

      {!project.stations.length && (
        <p className="notice">Brak stanowisk w projekcie. Najpierw dodaj stanowiska, aby móc przypisać zaopatrzenie materiałowe.</p>
      )}

      {items.map((item, index) => {
        const label = `Pozycja zaopatrzenia ${index + 1}`;

        return (
          <fieldset key={index}>
            <legend>{item.id ? `${label} (${item.id})` : label}</legend>
            <div className="form-grid">
              <label className="field">
                ID pozycji zaopatrzenia
                <input
                  aria-label={`${label} ID`}
                  value={item.id}
                  onChange={e => updateItem(index, {...item, id: e.target.value})}
                />
              </label>

              <label className="field">
                Identyfikator komponentu / materiału
                <input
                  aria-label={`${label} komponent`}
                  value={item.componentId}
                  onChange={e => updateItem(index, {...item, componentId: e.target.value})}
                />
              </label>

              <label className="field">
                Stanowisko docelowe
                <select
                  aria-label={`${label} stanowisko`}
                  value={item.targetStationId}
                  onChange={e => updateItem(index, {...item, targetStationId: e.target.value})}
                >
                  <option value="">Wybierz stanowisko</option>
                  {project.stations.map(station => (
                    <option key={station.id} value={station.id}>
                      {station.name} · {station.id}
                    </option>
                  ))}
                </select>
              </label>

              <label className="field">
                Zapas początkowy
                <input
                  type="number"
                  min={0}
                  step="any"
                  aria-label={`${label} zapas początkowy`}
                  value={Number.isFinite(item.initialStock) ? item.initialStock : ''}
                  onChange={e =>
                    updateItem(index, {
                      ...item,
                      initialStock: e.target.value === '' ? NaN : Number(e.target.value),
                    })
                  }
                />
              </label>

              <label className="field">
                Jednostka miary
                <input
                  aria-label={`${label} jednostka`}
                  value={item.unit}
                  onChange={e => updateItem(index, {...item, unit: e.target.value})}
                />
              </label>

              <label className="field">
                Źródło danych zaopatrzenia
                <input
                  aria-label={`${label} źródło`}
                  value={item.source}
                  onChange={e => updateItem(index, {...item, source: e.target.value})}
                />
              </label>

              <label className="field">
                Rodzaj harmonogramu dostaw
                <select
                  aria-label={`${label} rodzaj harmonogramu`}
                  value={item.schedule.kind}
                  onChange={e => {
                    const nextKind = e.target.value as SupplySchedule['kind'];
                    if (nextKind === 'periodic') {
                      updateItem(index, {
                        ...item,
                        schedule: {
                          kind: 'periodic',
                          batchQuantity: 10,
                          intervalSeconds: 60,
                          firstDeliverySeconds: 0,
                        },
                      });
                    } else {
                      updateItem(index, {
                        ...item,
                        schedule: {
                          kind: 'explicit-deliveries',
                          deliveries: [],
                        },
                      });
                    }
                  }}
                >
                  <option value="periodic">Dostawy cykliczne (partia + interwał)</option>
                  <option value="explicit-deliveries">Dostawy jawne (lista terminów)</option>
                </select>
              </label>

              {item.schedule.kind === 'periodic' && (
                <>
                  <label className="field">
                    Wielkość partii dostawy
                    <input
                      type="number"
                      min={0.0001}
                      step="any"
                      aria-label={`${label} wielkość partii`}
                      value={Number.isFinite(item.schedule.batchQuantity) ? item.schedule.batchQuantity : ''}
                      onChange={e => {
                        const val = e.target.value === '' ? NaN : Number(e.target.value);
                        updateItem(index, {
                          ...item,
                          schedule: {
                            ...(item.schedule as {kind: 'periodic'; batchQuantity: number; intervalSeconds: number; firstDeliverySeconds?: number}),
                            batchQuantity: val,
                          },
                        });
                      }}
                    />
                  </label>

                  <label className="field">
                    Częstotliwość dostaw (interwał [s])
                    <input
                      type="number"
                      min={0.0001}
                      step="any"
                      aria-label={`${label} interwał dostaw`}
                      value={Number.isFinite(item.schedule.intervalSeconds) ? item.schedule.intervalSeconds : ''}
                      onChange={e => {
                        const val = e.target.value === '' ? NaN : Number(e.target.value);
                        updateItem(index, {
                          ...item,
                          schedule: {
                            ...(item.schedule as {kind: 'periodic'; batchQuantity: number; intervalSeconds: number; firstDeliverySeconds?: number}),
                            intervalSeconds: val,
                          },
                        });
                      }}
                    />
                  </label>

                  <div className="field">
                    <span>Czas pierwszej dostawy</span>
                    <label>
                      <input
                        type="checkbox"
                        aria-label={`${label} jawny czas pierwszej dostawy`}
                        checked={item.schedule.firstDeliverySeconds !== undefined}
                        onChange={e => {
                          const sched = item.schedule as {kind: 'periodic'; batchQuantity: number; intervalSeconds: number; firstDeliverySeconds?: number};
                          updateItem(index, {
                            ...item,
                            schedule: {
                              kind: 'periodic',
                              batchQuantity: sched.batchQuantity,
                              intervalSeconds: sched.intervalSeconds,
                              ...(e.target.checked ? {firstDeliverySeconds: 0} : {}),
                            },
                          });
                        }}
                      />
                      Zdefiniuj jawny czas pierwszej dostawy [s]
                    </label>
                    {item.schedule.firstDeliverySeconds !== undefined && (
                      <input
                        type="number"
                        min={0}
                        step="any"
                        aria-label={`${label} czas pierwszej dostawy`}
                        value={Number.isFinite(item.schedule.firstDeliverySeconds) ? item.schedule.firstDeliverySeconds : ''}
                        onChange={e => {
                          const val = e.target.value === '' ? NaN : Number(e.target.value);
                          const sched = item.schedule as {kind: 'periodic'; batchQuantity: number; intervalSeconds: number};
                          updateItem(index, {
                            ...item,
                            schedule: {
                              ...sched,
                              firstDeliverySeconds: val,
                            },
                          });
                        }}
                      />
                    )}
                  </div>
                </>
              )}
            </div>

            {item.schedule.kind === 'explicit-deliveries' && (
              <fieldset>
                <legend>Dostawy jawne ({item.schedule.deliveries.length})</legend>
                {item.schedule.deliveries.map((delivery, dIndex) => (
                  <div key={dIndex} className="form-grid">
                    <label className="field">
                      Termin dostawy [s]
                      <input
                        type="number"
                        min={0}
                        step="any"
                        aria-label={`${label} dostawa ${dIndex + 1} czas`}
                        value={Number.isFinite(delivery.deliveryTimeSeconds) ? delivery.deliveryTimeSeconds : ''}
                        onChange={e => {
                          const val = e.target.value === '' ? NaN : Number(e.target.value);
                          const currentSched = item.schedule as {kind: 'explicit-deliveries'; deliveries: ExplicitSupplyDelivery[]};
                          const nextDeliveries = currentSched.deliveries.map((d, i) =>
                            i === dIndex ? {...d, deliveryTimeSeconds: val} : d,
                          );
                          updateItem(index, {
                            ...item,
                            schedule: {
                              kind: 'explicit-deliveries',
                              deliveries: nextDeliveries,
                            },
                          });
                        }}
                      />
                    </label>

                    <label className="field">
                      Ilość dostawy
                      <input
                        type="number"
                        min={0.0001}
                        step="any"
                        aria-label={`${label} dostawa ${dIndex + 1} ilość`}
                        value={Number.isFinite(delivery.quantity) ? delivery.quantity : ''}
                        onChange={e => {
                          const val = e.target.value === '' ? NaN : Number(e.target.value);
                          const currentSched = item.schedule as {kind: 'explicit-deliveries'; deliveries: ExplicitSupplyDelivery[]};
                          const nextDeliveries = currentSched.deliveries.map((d, i) =>
                            i === dIndex ? {...d, quantity: val} : d,
                          );
                          updateItem(index, {
                            ...item,
                            schedule: {
                              kind: 'explicit-deliveries',
                              deliveries: nextDeliveries,
                            },
                          });
                        }}
                      />
                    </label>

                    <button
                      type="button"
                      onClick={() => {
                        const currentSched = item.schedule as {kind: 'explicit-deliveries'; deliveries: ExplicitSupplyDelivery[]};
                        updateItem(index, {
                          ...item,
                          schedule: {
                            kind: 'explicit-deliveries',
                            deliveries: currentSched.deliveries.filter((_, i) => i !== dIndex),
                          },
                        });
                      }}
                    >
                      Usuń dostawę {dIndex + 1}
                    </button>
                  </div>
                ))}

                <button
                  type="button"
                  disabled={item.schedule.deliveries.length >= 1000}
                  onClick={() => {
                    const currentSched = item.schedule as {kind: 'explicit-deliveries'; deliveries: ExplicitSupplyDelivery[]};
                    updateItem(index, {
                      ...item,
                      schedule: {
                        kind: 'explicit-deliveries',
                        deliveries: [
                          ...currentSched.deliveries,
                          {deliveryTimeSeconds: 0, quantity: 10},
                        ],
                      },
                    });
                  }}
                >
                  Dodaj termin dostawy
                </button>
              </fieldset>
            )}

            <button type="button" onClick={() => changeItems(items.filter((_, i) => i !== index))}>
              Usuń pozycję zaopatrzenia {index + 1}
            </button>
          </fieldset>
        );
      })}

      <div className="toolbar">
        <button
          disabled={items.length >= 500 || !project.stations.length}
          onClick={() => {
            const firstStationId = project.stations[0]?.id ?? '';
            const newId = `SUP-${items.length + 1}`;
            changeItems([
              ...items,
              {
                id: newId,
                componentId: `MAT-${items.length + 1}`,
                targetStationId: firstStationId,
                initialStock: 0,
                unit: 'szt.',
                schedule: {
                  kind: 'periodic',
                  batchQuantity: 10,
                  intervalSeconds: 60,
                  firstDeliverySeconds: 0,
                },
                source: 'deklaracja zaopatrzenia montażu',
              },
            ]);
          }}
        >
          Dodaj pozycję zaopatrzenia
        </button>
      </div>

      <h4>Przypisania zużycia materiałów do operacji ({consumptions.length})</h4>
      <p className="muted">
        Przypisanie określa, ile jednostek danej pozycji materiałowej pobiera operacja przy jej faktycznym starcie.
      </p>

      {consumptions.map((consumption, cIndex) => {
        const label = `Zużycie ${cIndex + 1}`;

        return (
          <fieldset key={cIndex}>
            <legend>{label}</legend>
            <div className="form-grid">
              <label className="field">
                Operacja zużywająca
                <select
                  aria-label={`${label} operacja`}
                  value={consumption.operationId}
                  onChange={e =>
                    updateConsumption(cIndex, {
                      ...consumption,
                      operationId: e.target.value,
                    })
                  }
                >
                  <option value="">Wybierz operację</option>
                  {project.operations.map(op => (
                    <option key={op.id} value={op.id}>
                      {op.name} · {op.id}
                    </option>
                  ))}
                </select>
              </label>

              <label className="field">
                Pozycja zaopatrzenia
                <select
                  aria-label={`${label} zaopatrzenie`}
                  value={consumption.supplyId}
                  onChange={e =>
                    updateConsumption(cIndex, {
                      ...consumption,
                      supplyId: e.target.value,
                    })
                  }
                >
                  <option value="">Wybierz pozycję zaopatrzenia</option>
                  {items.map(it => (
                    <option key={it.id} value={it.id}>
                      {it.id} ({it.componentId})
                    </option>
                  ))}
                </select>
              </label>

              <label className="field">
                Ilość zużycia na wykonanie operacji
                <input
                  type="number"
                  min={0.0001}
                  step="any"
                  aria-label={`${label} ilość`}
                  value={Number.isFinite(consumption.quantity) ? consumption.quantity : ''}
                  onChange={e =>
                    updateConsumption(cIndex, {
                      ...consumption,
                      quantity: e.target.value === '' ? NaN : Number(e.target.value),
                    })
                  }
                />
              </label>

              <label className="field">
                Źródło danych zużycia
                <input
                  aria-label={`${label} źródło`}
                  value={consumption.source}
                  onChange={e =>
                    updateConsumption(cIndex, {
                      ...consumption,
                      source: e.target.value,
                    })
                  }
                />
              </label>
            </div>
            <button
              type="button"
              onClick={() => changeConsumptions(consumptions.filter((_, i) => i !== cIndex))}
            >
              Usuń przypisanie zużycia {cIndex + 1}
            </button>
          </fieldset>
        );
      })}

      <div className="toolbar">
        <button
          disabled={consumptions.length >= 5000 || !project.operations.length || !items.length}
          onClick={() => {
            const firstOpId = project.operations[0]?.id ?? '';
            const firstSupplyId = items[0]?.id ?? '';
            changeConsumptions([
              ...consumptions,
              {
                operationId: firstOpId,
                supplyId: firstSupplyId,
                quantity: 1,
                source: 'zapotrzebowanie operacji',
              },
            ]);
          }}
        >
          Dodaj przypisanie zużycia
        </button>
      </div>

      <div className="toolbar">
        <button onClick={save}>Zapisz zaopatrzenie materiałowe</button>
        <button
          disabled={!dirty}
          onClick={() => {
            setItems(initialItems());
            setConsumptions(initialConsumptions());
            setDirty(false);
            setError('');
          }}
        >
          Odrzuć zmiany zaopatrzenia
        </button>
        <button
          disabled={!project.materialSupply}
          onClick={() => onApply(undefined)}
        >
          Usuń konfigurację zaopatrzenia
        </button>
      </div>

      {dirty && <p role="status">Zmiany zaopatrzenia wymagają zapisu.</p>}
      {error && <p className="error" role="alert">Nie zapisano zaopatrzenia: {error}</p>}
    </div>
  );
}
