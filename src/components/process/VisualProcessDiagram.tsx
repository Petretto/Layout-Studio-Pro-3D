import React, { useMemo, useState } from 'react';
import { CheckCircle2, Clock, GitBranch, Plus, Trash2 } from 'lucide-react';
import { ProcessStep } from '../../core/models/types';

interface VisualProcessDiagramProps { steps: ProcessStep[]; onAddStep: (step: ProcessStep) => void; onUpdateStep: (id: string, field: keyof ProcessStep, value: any) => void; onDeleteStep: (id: string) => void; }
type Position = { x: number; y: number };
const nodeWidth = 248, nodeHeight = 118, gapX = 92, gapY = 38;

export const VisualProcessDiagram: React.FC<VisualProcessDiagramProps> = ({ steps, onAddStep, onUpdateStep, onDeleteStep }) => {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const layout = useMemo(() => {
    const ids = new Set(steps.map(s => s.id)), levels = new Map<string, number>(), invalid = new Set<string>();
    const level = (id: string, visiting = new Set<string>()): number => {
      if (levels.has(id)) return levels.get(id)!; if (visiting.has(id)) return 0;
      const step = steps.find(s => s.id === id); if (!step) return 0;
      const next = new Set(visiting).add(id), preds = step.predecessorIds.filter(p => ids.has(p));
      step.predecessorIds.filter(p => !ids.has(p)).forEach(p => invalid.add(`${p} → ${id}`));
      const value = preds.length ? Math.max(...preds.map(p => level(p, next))) + 1 : 0; levels.set(id, value); return value;
    };
    steps.forEach(s => level(s.id));
    const columns = new Map<number, ProcessStep[]>();
    steps.forEach(s => { const l = levels.get(s.id) ?? 0; columns.set(l, [...(columns.get(l) ?? []), s]); });
    const positions = new Map<string, Position>();
    columns.forEach((column, l) => column.forEach((s, row) => positions.set(s.id, { x: 44 + l * (nodeWidth + gapX), y: 44 + row * (nodeHeight + gapY) })));
    const maxLevel = Math.max(0, ...columns.keys()), maxRows = Math.max(1, ...[...columns.values()].map(c => c.length));
    return { positions, invalid: [...invalid], width: Math.max(760, 88 + (maxLevel + 1) * nodeWidth + maxLevel * gapX), height: Math.max(360, 88 + maxRows * nodeHeight + Math.max(0, maxRows - 1) * gapY) };
  }, [steps]);
  const selected = steps.find(s => s.id === selectedId);
  const addAfter = (step: ProcessStep) => {
    const numbers = steps.map(s => Number(s.id)).filter(Number.isFinite), id = String(Math.max(0, ...numbers) + 1);
    onAddStep({ id, name: 'Nowa operacja', standardTimeSeconds: 40, vaTimeSeconds: 34, nvaTimeSeconds: 6, sequenceNumber: steps.length + 1, predecessorIds: [step.id] }); setSelectedId(id);
  };
  return <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-950 shadow-xl">
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 bg-slate-900/80 px-4 py-3 text-xs"><span className="text-slate-400">Strzałka wskazuje następstwo operacji. Kolumny wynikają z zależności, nie z formatu ID.</span><span className="flex items-center gap-1.5 text-slate-500"><GitBranch className="h-3.5 w-3.5 text-violet-400" /> kliknij kafelek, aby edytować</span></div>
    {layout.invalid.length > 0 && <div className="border-b border-amber-500/20 bg-amber-500/10 px-4 py-2 text-xs text-amber-300">Nierozpoznane zależności: {layout.invalid.join(', ')}</div>}
    <div className="grid min-h-[500px] grid-cols-1 xl:grid-cols-[1fr_272px]"><div className="overflow-auto p-4"><div className="relative rounded-xl border border-slate-800/80 bg-[radial-gradient(circle_at_1px_1px,rgba(71,85,105,.35)_1px,transparent_0)] [background-size:20px_20px]" style={{ width: layout.width, height: layout.height }}>
      <svg className="absolute inset-0 overflow-visible" width={layout.width} height={layout.height} aria-hidden="true"><defs><marker id="flow-arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="#60a5fa" /></marker></defs>{steps.flatMap(step => step.predecessorIds.map(pred => { const from = layout.positions.get(pred), to = layout.positions.get(step.id); if (!from || !to) return null; const sx = from.x + nodeWidth, sy = from.y + nodeHeight / 2, ex = to.x, ey = to.y + nodeHeight / 2, bend = Math.max(44, (ex - sx) / 2); return <path key={`${pred}-${step.id}`} d={`M ${sx} ${sy} C ${sx + bend} ${sy}, ${ex - bend} ${ey}, ${ex} ${ey}`} fill="none" stroke="#60a5fa" strokeWidth="2" markerEnd="url(#flow-arrow)" />; }))}</svg>
      {steps.map(step => { const pos = layout.positions.get(step.id)!, active = selectedId === step.id, va = Math.min(100, Math.round(step.vaTimeSeconds / Math.max(1, step.standardTimeSeconds) * 100)); return <button key={step.id} onClick={() => setSelectedId(step.id)} style={{ left: pos.x, top: pos.y, width: nodeWidth, height: nodeHeight }} className={`absolute rounded-xl border p-3 text-left shadow-lg transition ${active ? 'border-blue-400 bg-slate-800 ring-2 ring-blue-500/30' : 'border-slate-700 bg-slate-900 hover:border-blue-500/70 hover:bg-slate-800'}`}><div className="flex items-center justify-between"><span className="rounded bg-blue-500/15 px-1.5 py-0.5 font-mono text-[10px] font-bold text-blue-300">{step.id}</span><span className="flex items-center gap-1 text-[10px] text-slate-400"><Clock className="h-3 w-3" /> {step.standardTimeSeconds}s</span></div><p className="mt-2 line-clamp-2 text-xs font-semibold leading-4 text-slate-100">{step.name}</p><div className="mt-2 flex items-center gap-2"><div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-700"><div className="h-full bg-emerald-400" style={{ width: `${va}%` }} /></div><span className="text-[10px] text-emerald-400">VA {va}%</span></div></button>; })}
      {!steps.length && <div className="absolute inset-0 grid place-items-center text-sm text-slate-500">Dodaj pierwszą operację w widoku tabeli.</div>}
    </div></div><aside className="border-t border-slate-800 bg-slate-900/70 p-4 xl:border-l xl:border-t-0">{selected ? <div className="space-y-4"><div><p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Wybrana operacja</p><p className="mt-1 font-mono text-sm font-bold text-blue-300">Krok {selected.id}</p></div><label className="block text-xs text-slate-400">Nazwa<input value={selected.name} onChange={e => onUpdateStep(selected.id, 'name', e.target.value)} className="mt-1.5 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 outline-none focus:border-blue-500" /></label><label className="block text-xs text-slate-400">Czas standardowy [s]<input type="number" min="0" value={selected.standardTimeSeconds} onChange={e => onUpdateStep(selected.id, 'standardTimeSeconds', Number(e.target.value))} className="mt-1.5 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 outline-none focus:border-blue-500" /></label><div className="rounded-lg bg-slate-800/80 p-3 text-xs text-slate-400">Poprzednicy: <span className="font-mono text-slate-200">{selected.predecessorIds.join(', ') || 'brak'}</span></div><button onClick={() => addAfter(selected)} className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-blue-600 py-2 text-xs font-semibold text-white hover:bg-blue-500"><Plus className="h-3.5 w-3.5" /> Dodaj po tej operacji</button><button onClick={() => { onDeleteStep(selected.id); setSelectedId(null); }} className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-red-500/30 py-2 text-xs font-semibold text-red-300 hover:bg-red-500/10"><Trash2 className="h-3.5 w-3.5" /> Usuń operację</button></div> : <div className="grid h-full place-items-center text-center text-sm text-slate-500"><div><CheckCircle2 className="mx-auto mb-2 h-5 w-5 text-slate-600" />Wybierz operację,<br />aby ją edytować.</div></div>}</aside></div>
  </div>;
};
