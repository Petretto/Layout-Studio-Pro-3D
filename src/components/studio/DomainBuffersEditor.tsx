import {useState} from 'react';
import type {DomainProjectV6} from '../../core/domainProject';
import {validateStationBuffers, type StationBuffersV6, type StationBufferConfig, type BlockingPolicy} from '../../core/stationBuffers';

export function DomainBuffersEditor({project, onApply, onUndo, onRedo, canUndo, canRedo}: {
  project: DomainProjectV6;
  onApply: (buffers: StationBuffersV6 | undefined) => boolean;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
}) {
  const initial = () => structuredClone(project.stationBuffers?.buffers ?? []);
  const [buffers, setBuffers] = useState<StationBufferConfig[]>(initial);
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState('');

  const change = (next: StationBufferConfig[]) => {
    setBuffers(next);
    setDirty(true);
    setError('');
  };

  const update = (index: number, next: StationBufferConfig) => change(buffers.map((item, i) => i === index ? next : item));

  const save = () => {
    try {
      const validated = validateStationBuffers(project, {buffers});
      if (onApply(validated)) {
        setDirty(false);
      }
    } catch (failure) {
      setError((failure as Error).message);
    }
  };

  return (
    <div className="panel" aria-label="Bufory stanowisk szkicu 6">
      <h3>Bufory stanowisk — pojemności i reguły blokowania</h3>
      <p className="muted">
        Zadeklaruj pojemności buforów wejściowych i wyjściowych stanowisk. Pojemność 0 na wejściu oznacza bezpośredni odbiór bez składowania (wymaga zabezpieczenia odbiorcy przed wyjazdem). Pojemność 0 na wyjściu utrzymuje korpus na stanowisku do rzeczywistego wyjazdu.
      </p>
      <p className="muted">
        Konfiguracja „Wszystkie kopie osobno (copy=null)” stosuje zadeklarowaną pojemność do każdej kopii oddzielnie, a nie jako wspólną pulę. Pełne wyjście blokuje po zakończeniu przetwarzania: korpus, stanowisko i wyposażenie pozostają zajęte, a polityka operatora rozstrzyga o zatrzymaniu lub zwolnieniu osoby.
      </p>
      <div className="toolbar">
        <button disabled={!canUndo} onClick={onUndo}>Cofnij dane szkicu</button>
        <button disabled={!canRedo} onClick={onRedo}>Ponów dane szkicu</button>
      </div>

      {!project.stations.length && (
        <p className="notice">Brak stanowisk w projekcie. Najpierw dodaj stanowiska, aby móc skonfigurować ich bufory.</p>
      )}

      {buffers.map((buffer, index) => {
        const label = `Bufor ${index + 1}`;
        const parallel = project.stationSettings[buffer.stationId]?.parallelStations ?? 1;

        return (
          <fieldset key={index}>
            <legend>{label}</legend>
            <div className="form-grid">
              <label className="field">
                Stanowisko
                <select
                  aria-label={`${label} stanowisko`}
                  value={buffer.stationId}
                  onChange={e => {
                    const newStationId = e.target.value;
                    update(index, {
                      ...buffer,
                      stationId: newStationId,
                      copy: null,
                    });
                  }}
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
                Zakres kopii
                <select
                  aria-label={`${label} kopia`}
                  value={buffer.copy === null ? 'all' : String(buffer.copy)}
                  onChange={e => {
                    const val = e.target.value;
                    update(index, {
                      ...buffer,
                      copy: val === 'all' ? null : Number(val),
                    });
                  }}
                >
                  <option value="all">Wszystkie kopie osobno (copy=null)</option>
                  {Array.from({length: parallel}, (_, i) => i + 1).map(copyNum => (
                    <option key={copyNum} value={String(copyNum)}>
                      Kopia {copyNum}
                    </option>
                  ))}
                </select>
              </label>

              <div className="field">
                <span>Pojemność wejściowa</span>
                <label>
                  <input
                    type="checkbox"
                    aria-label={`${label} wejście bez limitu`}
                    checked={buffer.inputCapacity === null}
                    onChange={e => {
                      update(index, {
                        ...buffer,
                        inputCapacity: e.target.checked ? null : 0,
                      });
                    }}
                  />
                  Bez limitu (nieskończona)
                </label>
                {buffer.inputCapacity !== null && (
                  <input
                    type="number"
                    min={0}
                    step={1}
                    aria-label={`${label} pojemność wejściowa`}
                    value={Number.isFinite(buffer.inputCapacity) ? buffer.inputCapacity : ''}
                    onChange={e => {
                      const val = e.target.value === '' ? NaN : Number(e.target.value);
                      update(index, {
                        ...buffer,
                        inputCapacity: val,
                      });
                    }}
                  />
                )}
              </div>

              <div className="field">
                <span>Pojemność wyjściowa</span>
                <label>
                  <input
                    type="checkbox"
                    aria-label={`${label} wyjście bez limitu`}
                    checked={buffer.outputCapacity === null}
                    onChange={e => {
                      update(index, {
                        ...buffer,
                        outputCapacity: e.target.checked ? null : 0,
                      });
                    }}
                  />
                  Bez limitu (nieskończona)
                </label>
                {buffer.outputCapacity !== null && (
                  <input
                    type="number"
                    min={0}
                    step={1}
                    aria-label={`${label} pojemność wyjściowa`}
                    value={Number.isFinite(buffer.outputCapacity) ? buffer.outputCapacity : ''}
                    onChange={e => {
                      const val = e.target.value === '' ? NaN : Number(e.target.value);
                      update(index, {
                        ...buffer,
                        outputCapacity: val,
                      });
                    }}
                  />
                )}
              </div>

              <label className="field">
                Reguła blokowania wyjścia (polityka operatora)
                <select
                  aria-label={`${label} polityka operatora`}
                  value={buffer.blockingPolicy ?? 'bbas'}
                  onChange={e => {
                    update(index, {
                      ...buffer,
                      blockingPolicy: e.target.value as BlockingPolicy,
                    });
                  }}
                >
                  <option value="bbas">bbas — zatrzymanie operatora do zwolnienia wyjścia</option>
                  <option value="bbas-worker-released">bbas-worker-released — zwolnienie operatora po zakończeniu przetwarzania</option>
                </select>
              </label>
            </div>
            <button onClick={() => change(buffers.filter((_, i) => i !== index))}>
              Usuń bufor {index + 1}
            </button>
          </fieldset>
        );
      })}

      <div className="toolbar">
        <button
          disabled={buffers.length >= 500 || !project.stations.length}
          onClick={() => {
            const firstStationId = project.stations[0]?.id ?? '';
            change([
              ...buffers,
              {
                stationId: firstStationId,
                copy: null,
                inputCapacity: null,
                outputCapacity: null,
                blockingPolicy: 'bbas',
              },
            ]);
          }}
        >
          Dodaj bufor stanowiska
        </button>
        <button onClick={save}>Zapisz bufory stanowisk</button>
        <button
          disabled={!dirty}
          onClick={() => {
            setBuffers(initial());
            setDirty(false);
            setError('');
          }}
        >
          Odrzuć zmiany buforów
        </button>
        <button
          disabled={!project.stationBuffers}
          onClick={() => onApply(undefined)}
        >
          Usuń konfigurację buforów
        </button>
      </div>

      {dirty && <p role="status">Zmiany buforów wymagają zapisu.</p>}
      {error && <p className="error" role="alert">Nie zapisano buforów: {error}</p>}
    </div>
  );
}
