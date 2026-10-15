import React, { useState } from 'react';
import { ProjectData } from '../../core/models/types';
import { moveOperation } from '../../core/editing';
import { OperationInspector } from './OperationInspector';
import { effectiveCycle } from '../../core/resources';
import { fmt, formatTimeValue, formatTimeWithUnit } from './Fields';
import { calculateStaticWorkload } from '../../core/workloadBalancing';

const colors = ['#2563eb', '#087f8c', '#7c3aed', '#b45309', '#be185d', '#047857'];
export function BalancingBoard({ project: p, change }: { project: ProjectData; change: (p: ProjectData) => void }) {
  const [selected, setSelected] = useState(''), [target, setTarget] = useState('1'), [message, setMessage] = useState('');
  const [scale, setScale] = useState(1), [hover, setHover] = useState<number | null>(null);
  const dragging = React.useRef<string>('');
  const b = p.balancing;
  if (!b?.workstations.length) return null;
  const max = Math.max(b.taktTimeSeconds, b.bottleneckCycleTimeSeconds) * 1.15;
  const current = p.processSteps.find(s => s.id === selected);
  const move = (id: string, station: number) => {
    try { change(moveOperation(p, id, station)); setMessage(`Przeniesiono ${id}. Włączono bilans ręczny; puste stacje usunięto i uporządkowano numerację.`); }
    catch (error) { setMessage(`Nie przeniesiono: ${(error as Error).message}`); }
    setHover(null); dragging.current = '';
  };
  const drop = (e: React.DragEvent, station: number) => { e.preventDefault(); const id = dragging.current || e.dataTransfer.getData('text/plain'); if (id) move(id, station); };
    const unit = p.timeUnit ?? 's';
    return <section className="balance-editor">
    <h2>Dynamiczny Yamazumi</h2>
    <p className="muted">Wysokość słupka to odstęp zdolności (cykl zespołu / kopie). Segmenty skalowane proporcjonalnie do czasów bazowych; etykiety pokazują czas bazowy operacji. Przeciągnij segment na inne stanowisko lub wybierz operację i cel poniżej. Zmiany przeliczają bilans, layout automatyczny i symulację. Przekroczenie celu jest dozwolone i oznaczone; naruszenie zależności jest blokowane.</p>
    <div className="toolbar">
      <button onClick={() => setScale(s => Math.min(2, s + .25))}>Powiększ wykres</button>
      <button onClick={() => setScale(s => Math.max(.5, s - .25))}>Pomniejsz wykres</button>
      <button onClick={() => setScale(1)}>Skala wykresu 100%</button>
      <span>Linia przerywana: cel {formatTimeWithUnit(b.taktTimeSeconds, unit)} · Tryb: {p.algorithm ?? 'RPW'}</span>
    </div>
    {message && <p className="notice" role="status">{message}</p>}
    <div className="balance-scroll">
      <div className="balance-columns" style={{ width: Math.max(600, b.workstations.length * 180 * scale + 160), height: 365 * scale + 110 }}>
        {b.workstations.map(ws => <div key={ws.id} className={`balance-column ${hover === ws.sequenceIndex ? 'drop-active' : ''}`} onDragOver={e => { e.preventDefault(); setHover(ws.sequenceIndex); }} onDrop={e => drop(e, ws.sequenceIndex)}>
          <div className="balance-plot" style={{ height: 300 * scale }}>
            <div className="balance-target" style={{ bottom: `${b.taktTimeSeconds / max * 100}%` }}><span>{formatTimeWithUnit(b.taktTimeSeconds, unit)}</span></div>
            <div className="balance-stack">
              {ws.assignedStepIds.map(id => {
                const s = p.processSteps.find(step => step.id === id)!;
                return <button key={id} draggable aria-label={`Edytuj ${id} na ${ws.id}`} aria-pressed={selected === id} className="operation-segment" title={`${id}: ${s.name} — ${formatTimeWithUnit(s.standardTimeSeconds, unit)}`}
                  style={{ height: `${s.standardTimeSeconds / (ws.baseCycleSeconds??ws.cycleTimeSeconds) * effectiveCycle(ws) / max * 300 * scale}px`, background: colors[p.processSteps.indexOf(s) % colors.length] }}
                  onDragStart={e => { dragging.current = id; e.dataTransfer.setData('text/plain', id); e.dataTransfer.effectAllowed = 'move'; setSelected(id); }} onDragEnd={() => { setHover(null); dragging.current = ''; }} onClick={() => { setSelected(id); setTarget(String(ws.sequenceIndex)); }}>
                  {id} · {formatTimeWithUnit(s.standardTimeSeconds, unit)}
                </button>;
              })}
            </div>
          </div>
          <strong>{ws.id} × {ws.parallelStations??1} · {formatTimeWithUnit(effectiveCycle(ws), unit)}</strong>
          <span className={ws.isBottleneck ? 'bad' : 'good'}>{fmt(effectiveCycle(ws) / b.taktTimeSeconds * 100)}% · {ws.isBottleneck ? 'Przekroczenie' : 'W normie'}</span>
          <small>VA {formatTimeWithUnit(ws.assignedStepIds.reduce((sum, id) => sum + p.processSteps.find(s => s.id === id)!.vaTimeSeconds, 0), unit)}</small>
        </div>)}
        <div className={`new-station-drop ${hover === b.workstations.length + 1 ? 'drop-active' : ''}`} onDragOver={e => { e.preventDefault(); setHover(b.workstations.length + 1); }} onDrop={e => drop(e, b.workstations.length + 1)}>Nowe stanowisko na końcu<br /><small>Upuść operację tutaj</small></div>
      </div>
    </div>
    <div className="panel">
      <div className="toolbar">
        <label className="field">Operacja do przeniesienia<select value={selected} onChange={e => setSelected(e.target.value)}><option value="">Wybierz operację</option>{p.processSteps.map(s => <option key={s.id} value={s.id}>{s.id} — {s.name}</option>)}</select></label>
        <label className="field">Stanowisko docelowe<select value={target} onChange={e => setTarget(e.target.value)}>{b.workstations.map(ws => <option key={ws.id} value={ws.sequenceIndex}>{ws.id}</option>)}<option value={b.workstations.length + 1}>Nowe stanowisko na końcu</option></select></label>
        <button disabled={!current} onClick={() => move(selected, Number(target))}>Przenieś operację</button>
      </div>
      <p className="muted">Dla bardzo krótkich operacji użyj listy wyboru. Puste stanowisko jest usuwane automatycznie. Przestawienie operacji nie usuwa jej materiałów.</p>
      {current && <OperationInspector key={`${current.id}/${current.name}/${current.standardTimeSeconds}/${current.vaTimeSeconds}`} project={p} step={current} change={change} report={setMessage} />}
    </div>
    <div className="panel" aria-label="Oddzielne obciążenie stanowisk, maszyn i operatorów">
      <h3>Oddzielne obciążenie stanowisk, maszyn i operatorów oraz mianowniki wskaźników</h3>
      <p className="muted">Każdy wskaźnik podaje dokładny licznik, mianownik i formułę matematyczną. Mianownik czasu taktu ({formatTimeWithUnit(b.taktTimeSeconds, unit)}) jest skalowany przez liczbę równoległych kopii (dla stanowisk i maszyn) lub łączną obsadę (dla operatorów).</p>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Stanowisko</th>
              <th>Kopie / Obsada</th>
              <th>Obciążenie stanowiska [%]</th>
              <th>Mianownik stanowiska</th>
              <th>Obciążenie operatorów [%]</th>
              <th>Mianownik operatorów</th>
              <th>Obciążenie maszyn [%]</th>
              <th>Mianownik maszyn</th>
            </tr>
          </thead>
          <tbody>
            {b.workstations.map(ws => {
              const wl = calculateStaticWorkload(ws, b.taktTimeSeconds, p.processSteps, p.workstationSettings?.[ws.id]);
              return <tr key={ws.id}>
                <td><strong>{ws.name} ({ws.id})</strong></td>
                <td>{wl.copies} {wl.copies === 1 ? 'kopia' : 'kopie'} · {wl.totalOperators} {wl.totalOperators === 1 ? 'operator' : 'operatorów'}</td>
                <td><strong className={wl.stationWorkloadPercent > 100 ? 'bad' : 'good'}>{wl.stationWorkloadPercent}%</strong><div><small>{wl.stationFormula}</small></div></td>
                <td><small>{wl.stationDenominatorDescription}</small></td>
                <td><strong className={wl.operatorWorkloadPercent > 100 ? 'bad' : 'good'}>{wl.operatorWorkloadPercent}%</strong><div><small>{wl.operatorFormula}</small></div></td>
                <td><small>{wl.operatorDenominatorDescription}</small></td>
                <td><strong className={wl.machineWorkloadPercent > 100 ? 'bad' : 'good'}>{wl.machineWorkloadPercent}%</strong><div><small>{wl.machineFormula}</small></div></td>
                <td><small>{wl.machineDenominatorDescription}</small></td>
              </tr>;
            })}
          </tbody>
        </table>
      </div>
    </div>
  </section>;
}
