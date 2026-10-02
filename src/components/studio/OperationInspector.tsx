import React, { useState, useEffect } from 'react';
import { ProjectData, ProcessStep } from '../../core/models/types';
import { editOperation, setOperationLinks, successorsOf, updateProcess } from '../../core/editing';
import { fmt, fromSeconds, toSeconds, formatTimeWithUnit } from './Fields';

export function OperationInspector({ project, step, change, report }: {
  project: ProjectData; step: ProcessStep; change: (p: ProjectData) => void; report: (message: string) => void;
}) {
  const unit = project.timeUnit ?? 's';
  const [name, setName] = useState(step.name);
  const [time, setTime] = useState(String(fromSeconds(step.standardTimeSeconds, unit)));
  const [va, setVa] = useState(String(fromSeconds(step.vaTimeSeconds, unit)));
  const [pred, setPred] = useState(step.predecessorIds.join(', '));
  const [succ, setSucc] = useState(successorsOf(project.processSteps, step.id).join(', '));

  useEffect(() => {
    setName(step.name);
    setTime(String(Number(fromSeconds(step.standardTimeSeconds, unit).toFixed(6))));
    setVa(String(Number(fromSeconds(step.vaTimeSeconds, unit).toFixed(6))));
    setPred(step.predecessorIds.join(', '));
    setSucc(successorsOf(project.processSteps, step.id).join(', '));
  }, [step, project.processSteps, unit]);

  const materials = project.bom.filter(b => b.associatedProcessStepId === step.id);

  return <div className="operation-inspector">
    <h3>Operacja {step.id}</h3>
    <form onSubmit={e => {
      e.preventDefault();
      try {
        const secTime = toSeconds(Number(time), unit);
        const secVa = toSeconds(Number(va), unit);
        const edited = editOperation(project, step.id, name, secTime, secVa);
        change(updateProcess(edited, setOperationLinks(edited.processSteps, step.id, pred.split(/[,;]/).map(x => x.trim()).filter(Boolean), succ.split(/[,;]/).map(x => x.trim()).filter(Boolean))));
        report('Zapisano operację. Bilans i symulacja korzystają z nowych czasów.');
      }
      catch (error) { report((error as Error).message); }
    }}>
      <label className="field">Nazwa wybranej operacji<input required value={name} onChange={e => setName(e.target.value)} /></label>
      <label className="field">Czas wybranej operacji [{unit}]<input required type="number" min="0.000001" step="any" value={time} onChange={e => {
        const next = e.target.value, previous = Number(time);
        if (next !== '' && previous > 0) setVa(String(Number((Number(next) * Number(va) / previous).toFixed(6))));
        setTime(next);
      }} /></label>
      <label className="field">VA wybranej operacji [{unit}]<input required type="number" min="0" max={Number(time)} step="any" value={va} onChange={e => setVa(e.target.value)} /></label>
      <p>NVA: {formatTimeWithUnit(toSeconds(Math.max(0, Number(time) - Number(va)), unit), unit)}. Zmiana czasu zachowuje udział VA.</p>
      <label className="field">Poprzednicy (ID)<input value={pred} onChange={e => setPred(e.target.value)} /></label>
      <label className="field">Następnicy (ID)<input value={succ} onChange={e => setSucc(e.target.value)} /></label>
      <button className="primary" type="submit">Zapisz operację</button>
    </form>
    <h3>Materiały operacji ({materials.length})</h3>
    <p>Koszt: {fmt(materials.reduce((sum, b) => sum + b.unitCost * b.quantityPerUnit, 0))} {project.currency ?? 'USD'}/wyrób</p>
    <ul className="material-list">{materials.map(b => <li key={b.id}><strong>{b.partNumber}</strong><span>{b.name}</span><small>{fmt(b.quantityPerUnit)} szt./wyrób · {b.container}</small></li>)}</ul>
    {!materials.length && <p className="muted">Brak materiałów. Przypiszesz je w etapie 3 BOM.</p>}
  </div>;
}
