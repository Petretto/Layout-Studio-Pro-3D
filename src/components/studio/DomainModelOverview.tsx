import {useMemo} from 'react';
import type {DomainProjectV6} from '../../core/domainProject';
import {buildDomainModelView,domainModelViewReport} from '../../core/domainModelView';
import {download} from '../../core/project';

export function DomainModelOverview({project}:{project:DomainProjectV6}){
  const view=useMemo(()=>buildDomainModelView(project),[project]);
  const number=(n:number|null)=>n===null?'brak':Number(n.toFixed(3));
  const points=view.geometry.flatMap(o=>o.points);
  const minX=Math.min(0,...points.map(p=>p.x),...view.obstacles.map(o=>o.xMm));
  const minY=Math.min(0,...points.map(p=>p.y),...view.obstacles.map(o=>o.yMm));
  const maxX=Math.max(view.facility.widthMm,...points.map(p=>p.x),...view.obstacles.map(o=>o.xMm+o.widthMm));
  const maxY=Math.max(view.facility.lengthMm,...points.map(p=>p.y),...view.obstacles.map(o=>o.yMm+o.lengthMm));
  return <section className="panel" aria-label="Spójny widok aktywnego szkicu 6" data-model-sha={view.signatureSha256}>
    <h3>Aktywny szkic 6 — przydziały, rzut i raport</h3>
    <p><strong>{view.name}</strong> · ID {view.projectId} · model 6 · SHA-256 <code style={{wordBreak:'break-all'}}>{view.signatureSha256}</code></p>
    <p className="muted">Wszystkie elementy tego panelu dotyczą tego samego aktywnego szkicu, także po Wczytaj/Cofnij/Ponów. Odczyt nie bilansuje ponownie i nie zmienia danych. Raport statyczny nie jest wynikiem symulacji.</p>
    <p>Takt klienta: {number(view.customerTaktSeconds)} s · cel po OEE: {number(view.targetSeconds)} s · suma wybranych czasów operacji: {number(view.selectedWorkSeconds)} s/szt. · skład: {view.selectedWorkers?.join(', ')??'brak wyboru'}</p>
    <p>Statyczny pułap jawnych kopii: <strong>{number(view.staticCapacityPerHour)} szt./h</strong>. Nie uwzględnia współdzielenia osób, kalendarzy ani transportu — sprawdź harmonogram. Alternatywne dopuszczenia pozostają nierozstrzygnięte.</p>
    {view.warnings.map(w=><p key={w} className="notice">{w}</p>)}
    <div className="table-wrap"><table aria-label="Przydziały aktywnego modelu 6"><thead><tr><th>Stanowisko</th><th>Operacje wg rejestru</th><th>Suma czasów [s/szt.]</th><th>Kopie</th></tr></thead><tbody>{view.stations.map(s=><tr key={s.id} data-station-id={s.id}><td>{s.name} · {s.id}</td><td>{s.operationIds.join(', ')||'rezerwa'}</td><td>{number(s.assignedSeconds)}</td><td>{s.copies??'brak'}</td></tr>)}</tbody></table></div>
    <div className="table-wrap"><table aria-label="Wybrane czasy i dopuszczenia modelu 6"><thead><tr><th>Operacja</th><th>Czas [s]</th><th>Pochodzenie</th><th>Obsada</th><th>Dopuszczone kopie</th></tr></thead><tbody>{view.operations.map(o=><tr key={o.id}><td>{o.name} · {o.id}</td><td>{number(o.durationSeconds)}</td><td>{o.basis==='assumed'?'założenie':o.basis==='measured'?'pomiar':'brak'}</td><td>{o.workerCount??'brak'}</td><td>{o.candidates.map(c=>`${c.stationId}#${c.copy}`).join(', ')||'brak'}</td></tr>)}</tbody></table></div>
    <h4>Rzut geometrii aktywnego szkicu 6 — mm</h4>
    <p className="muted">Istniejące obrysy i przypisania, bez podkładu i tras. Rzut służy do odczytu, bez tworzenia stołów lub zdolności. Geometria koncepcyjna nie potwierdza bezpieczeństwa hali.</p>
    {!view.geometry.length&&<p>Brak zapisanej geometrii w tym szkicu.</p>}
    <svg role="img" aria-label="Rzut aktywnego modelu 6" viewBox={`${minX-200} ${minY-200} ${maxX-minX+400} ${maxY-minY+400}`} style={{width:'100%',maxHeight:420,background:'#0b1220'}}>
      <rect x={0} y={0} width={view.facility.widthMm} height={view.facility.lengthMm} fill="#102033" stroke="#94a3b8" strokeWidth={20}/>
      {view.obstacles.map(o=><rect key={o.id} x={o.xMm} y={o.yMm} width={o.widthMm} height={o.lengthMm} fill="#78350f"><title>{o.name} · {o.id}</title></rect>)}
      {view.geometry.map(o=><g key={o.id} data-object-id={o.id} data-station-id={o.workstationId} data-x-mm={o.xMm} data-y-mm={o.yMm}>
        <polygon points={o.points.map(p=>`${p.x},${p.y}`).join(' ')} fill={o.colorHex} stroke="#cbd5e1" strokeWidth={15}><title>{o.name} · {o.id} · {o.widthMm}×{o.lengthMm} mm · {o.rotationDeg}°</title></polygon>
        <text x={o.xMm+30} y={o.yMm+160} fontSize={120} fill="white">{o.workstationId??o.id}</text>
      </g>)}
    </svg>
    <button onClick={()=>download(domainModelViewReport(view),'Aktywny_szkic_6_raport_statyczny.md')}>Pobierz raport statyczny aktywnego szkicu 6 (.md)</button>
    <p className="notice">Harmonogram i porównanie poniżej korzystają z tego samego szkicu, lecz wymagają jawnych warunków przebiegu. Główne widoki, raport A4 i animacja projektu 4 pozostają oddzielne. Widok 3D i animacja szkicu 6 wymagają dalszej integracji.</p>
  </section>;
}
