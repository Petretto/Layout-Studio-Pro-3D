import React, { useMemo, useRef, useState } from 'react';
import { ProjectData } from '../../core/models/types';
import { addOperation, connectOperations, disconnectOperations, flowPositions, removeOperation, updateProcess } from '../../core/editing';
import { OperationInspector } from './OperationInspector';
import { fmt, formatTimeWithUnit } from './Fields';

type Point = { x: number; y: number };
type Props = { project: ProjectData; change: (p: ProjectData) => void; confirm: (message: string, action: () => void) => void };
export function ProcessFlow({ project: p, change, confirm }: Props) {
  const unit = p.timeUnit ?? 's';
  const svg = useRef<SVGSVGElement>(null);
  const [selected, setSelected] = useState(''), [from, setFrom] = useState(''), [to, setTo] = useState('');
  const [message, setMessage] = useState(''), [linkSource, setLinkSource] = useState('');
  const [snap, setSnap] = useState(true), [view, setView] = useState<{ x: number; y: number; scale: number } | null>(null);
  const [preview, setPreview] = useState<{ id: string; pos: Point } | null>(null);
  const drag = useRef<{ id?: string; start: Point; origin: Point; view?: { x: number; y: number; scale: number } } | null>(null);
  const layout = useMemo(() => {
    try { return { positions: flowPositions(p.processSteps), error: '' }; }
    catch (error) { return { positions: new Map<string, Point>(), error: (error as Error).message }; }
  }, [p.processSteps]);
  const positions = new Map(layout.positions);
  if (preview) positions.set(preview.id, preview.pos);
  const points = [...layout.positions.values()];
  const minX = Math.min(0, ...points.map(q => q.x)) - 30, minY = Math.min(0, ...points.map(q => q.y)) - 30;
  const width = Math.max(800, Math.max(0, ...points.map(q => q.x + 250)) - minX + 40);
  const height = Math.max(450, Math.max(0, ...points.map(q => q.y + 130)) - minY + 40);
  const baseScale = Math.max(width / 1000, height / 550);
  const camera = view ?? { x: minX, y: minY, scale: baseScale };
  const current = p.processSteps.find(s => s.id === selected);
  const act = (fn: () => ProjectData, success: string) => {
    try { change(fn()); setMessage(success); return true; }
    catch (error) { setMessage((error as Error).message); return false; }
  };
  const point = (e: React.PointerEvent): Point => {
    const pt = svg.current!.createSVGPoint(); pt.x = e.clientX; pt.y = e.clientY;
    return pt.matrixTransform(svg.current!.getScreenCTM()!.inverse());
  };
  const connect = (source: string, target: string) => {
    act(() => connectOperations(p, source, target), `Połączono ${source} → ${target}.`);
    setLinkSource('');
  };
  const choose = (id: string) => { if (linkSource) connect(linkSource, id); else setSelected(id); };
  const add = (after?: string) => {
    try { const result = addOperation(p, after); change(result.project); setSelected(result.id); setView(null); setMessage(`Dodano ${result.id}.`); }
    catch (error) { setMessage((error as Error).message); }
  };
  return <section className="flow-editor">
    <h2>Edytowalny przepływ procesu</h2>
    <p className="muted">Przeciągaj kafelki. Tło przesuwa widok. Port „+” rozpoczyna połączenie — następnie wybierz operację docelową. Pozycje nie zmieniają kolejności technologicznej: decydują strzałki.</p>
    <div className="toolbar">
      <button onClick={() => add()}>Dodaj operację do diagramu</button>
      <button onClick={() => setView({ ...camera, scale: Math.max(.15, camera.scale / 1.3) })}>Przybliż przepływ +</button>
      <button onClick={() => setView({ ...camera, scale: Math.min(300, camera.scale * 1.3) })}>Oddal przepływ −</button>
      <button onClick={() => setView(null)}>Dopasuj przepływ</button>
      <button onClick={() => confirm('Ułożyć diagram według zależności? Zastąpi to ręczne pozycje kafelków. Dostępne Cofnij.', () => {
        if (act(() => { const automatic = flowPositions(p.processSteps, true); return updateProcess(p, p.processSteps.map(s => ({ ...s, flowPosition: automatic.get(s.id) }))); }, 'Ułożono diagram.')) setView(null);
      })}>Ułóż według zależności</button>
      <label><input type="checkbox" checked={snap} onChange={e => setSnap(e.target.checked)} /> Siatka diagramu 20 px</label>
    </div>
    <div className="toolbar flow-connect">
      <label className="field">Połączenie od<select value={from} onChange={e => setFrom(e.target.value)}><option value="">Wybierz źródło</option>{p.processSteps.map(s => <option key={s.id} value={s.id}>{s.id} — {s.name}</option>)}</select></label>
      <label className="field">Połączenie do<select value={to} onChange={e => setTo(e.target.value)}><option value="">Wybierz cel</option>{p.processSteps.map(s => <option key={s.id} value={s.id}>{s.id} — {s.name}</option>)}</select></label>
      <button disabled={!from || !to} onClick={() => connect(from, to)}>Połącz operacje</button>
      {linkSource && <button onClick={() => setLinkSource('')}>Anuluj łączenie od {linkSource}</button>}
    </div>
    {message && <p role="status" className="notice">{message}</p>}
    {layout.error ? <p role="alert" className="error">{layout.error} Popraw dane w tabeli procesu.</p> : <div className="visual-editor-grid">
      <div>
        <svg ref={svg} className="flow-canvas" aria-label="Dynamiczny diagram procesu" viewBox={`${camera.x} ${camera.y} ${1000 * camera.scale} ${550 * camera.scale}`}
          onPointerDown={e => {
            if (e.button !== 0) return;
            drag.current = { start: point(e), origin: { x: e.clientX, y: e.clientY }, view: { ...camera } };
            svg.current!.setPointerCapture(e.pointerId);
          }}
          onPointerMove={e => {
            const d = drag.current; if (!d) return;
            if (d.id) {
              const q = point(e), grid = snap ? 20 : 1;
              const clamp = (n: number) => Math.max(-100000, Math.min(100000, Math.round(n / grid) * grid));
              setPreview({ id: d.id, pos: { x: clamp(d.origin.x + q.x - d.start.x), y: clamp(d.origin.y + q.y - d.start.y) } });
            } else if (d.view) {
              const rect = svg.current!.getBoundingClientRect(), ratio = Math.max(1000 * d.view.scale / rect.width, 550 * d.view.scale / rect.height);
              setView({ ...d.view, x: d.view.x - (e.clientX - d.origin.x) * ratio, y: d.view.y - (e.clientY - d.origin.y) * ratio });
            }
          }}
          onPointerUp={e => {
            if (drag.current?.id && preview && (preview.pos.x !== drag.current.origin.x || preview.pos.y !== drag.current.origin.y)) {
              act(() => updateProcess(p, p.processSteps.map(s => s.id === preview.id ? { ...s, flowPosition: preview.pos } : s)), 'Zapisano pozycję kafelka.');
            }
            drag.current = null; setPreview(null);
            if (svg.current?.hasPointerCapture(e.pointerId)) svg.current.releasePointerCapture(e.pointerId);
          }} onPointerCancel={() => { drag.current = null; setPreview(null); }}>
          <defs><marker id="studio-flow-arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8Z" fill="#7dd3fc" /></marker></defs>
          {p.processSteps.flatMap(s => s.predecessorIds.map(pred => {
            const a = positions.get(pred), b = positions.get(s.id); if (!a || !b) return null;
            const bend = Math.max(60, Math.abs(b.x - a.x - 240) / 2);
            return <path key={`${pred}/${s.id}`} d={`M${a.x + 240},${a.y + 60} C${a.x + 240 + bend},${a.y + 60} ${b.x - bend},${b.y + 60} ${b.x},${b.y + 60}`} fill="none" stroke={s.id === selected || pred === selected ? '#fbbf24' : '#7dd3fc'} strokeWidth="2.5" markerEnd="url(#studio-flow-arrow)"><title>{pred} → {s.id}</title></path>;
          }))}
          {p.processSteps.map(s => {
            const q = positions.get(s.id)!;
            const count = p.bom.filter(b => b.associatedProcessStepId === s.id).length;
            return <g key={s.id} transform={`translate(${q.x} ${q.y})`}>
              <g role="button" tabIndex={0} aria-label={`Operacja ${s.id}: ${s.name}`} className="flow-node" onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); choose(s.id); } }}
                onPointerDown={e => {
                  if (e.button !== 0) return; e.stopPropagation();
                  if (linkSource) { connect(linkSource, s.id); return; }
                  setSelected(s.id); setView({ ...camera });
                  drag.current = { id: s.id, start: point(e), origin: q };
                  svg.current!.setPointerCapture(e.pointerId);
                }}>
                <rect width="240" height="120" rx="10" fill={selected === s.id ? '#214365' : '#13243b'} stroke={selected === s.id ? '#fbbf24' : '#507596'} strokeWidth="2" />
                <text x="12" y="22" fill="#7dd3fc" fontSize="13" fontWeight="bold">{s.id} · {formatTimeWithUnit(s.standardTimeSeconds, unit)}</text>
                <foreignObject x="12" y="30" width="216" height="46"><div className="flow-node-title">{s.name}</div></foreignObject>
                <text x="12" y="91" fill="#a7f3d0" fontSize="12">VA {formatTimeWithUnit(s.vaTimeSeconds, unit)} · BOM {count}</text>
                <rect x="12" y="103" width="216" height="5" fill="#37465a" rx="2" />
                <rect x="12" y="103" width={216 * Math.min(1, s.vaTimeSeconds / s.standardTimeSeconds)} height="5" fill="#34d399" rx="2" />
              </g>
              <g role="button" tabIndex={0} aria-label={`Połącz od ${s.id}`} onPointerDown={e => e.stopPropagation()} onClick={() => { setLinkSource(s.id); setMessage(`Wybierz następną operację po ${s.id}.`); }} onKeyDown={e => { if (e.key === 'Enter') { setLinkSource(s.id); setMessage(`Wybierz następną operację po ${s.id}.`); } }} className="flow-port"><circle cx="240" cy="60" r="12" fill="#2563eb" /><text x="240" y="65" textAnchor="middle" fill="white">+</text></g>
            </g>;
          })}
          {!p.processSteps.length && <text x="80" y="120" fill="#b4c4d9">Dodaj pierwszą operację przyciskiem nad diagramem.</text>}
        </svg>
        <p className="legend">Niebieskie strzałki: zależności. Żółty: wybrana operacja i jej połączenia. Zoom i przesuwanie widoku nie zmieniają danych.</p>
      </div>
      <aside className="editor-inspector">{current ? <>
        <OperationInspector key={`${current.id}/${current.name}/${current.standardTimeSeconds}/${current.vaTimeSeconds}`} project={p} step={current} change={change} report={setMessage} />
        <div className="toolbar"><button onClick={() => add(current.id)}>Dodaj następnika</button><button className="danger" onClick={() => confirm(`Usunąć ${current.id} i jego połączenia? Powiązane materiały zostaną zachowane do ponownego przypisania w BOM. Możesz użyć Cofnij.`, () => { if (act(() => removeOperation(p, current.id, false), 'Usunięto operację. Sprawdź powiązania BOM.')) setSelected(''); })}>Usuń wybraną operację</button></div>
        <h3>Połączenia operacji</h3>
        <ul className="edge-list">{p.processSteps.flatMap(s => s.predecessorIds.filter(pred => s.id === selected || pred === selected).map(pred => <li key={`${pred}/${s.id}`}><span>{pred} → {s.id}</span><button aria-label={`Usuń połączenie ${pred} do ${s.id}`} onClick={() => act(() => disconnectOperations(p, pred, s.id), 'Usunięto połączenie. Dostępne Cofnij.')}>Rozłącz</button></li>))}</ul>
      </> : <p className="muted">Wybierz kafelek, aby edytować czas, nazwę i połączenia oraz zobaczyć materiały.</p>}</aside>
    </div>}
  </section>;
}
