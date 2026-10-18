import React, { useState } from 'react';
import { ProjectData, Workstation, BOMComponent, ProcessStep } from '../../core/models/types';
import { Issue } from '../../core/validation';
import { calculateTaktTime } from '../../core/algorithms/taktCalculator';
import './EngineeringReportView.css';

interface EngineeringReportViewProps {
  project: ProjectData;
  issues: Issue[];
  rawMarkdown: string;
}

export const EngineeringReportView: React.FC<EngineeringReportViewProps> = ({
  project,
  issues,
  rawMarkdown
}) => {
  const [viewMode, setViewMode] = useState<'document' | 'markdown'>('document');

  const demand = project.demand;
  const takt = calculateTaktTime(demand);
  const balancing = project.balancing;
  const currency = project.currency ?? 'PLN';

  // Obliczenia podsumowujące
  const totalBOMCost = project.bom.reduce((sum: number, item: BOMComponent) => sum + (item.unitCost * item.quantityPerUnit), 0);
  const totalOperators = balancing?.workstations.reduce((sum: number, ws: Workstation) => sum + ((ws.parallelStations ?? 1) * (ws.operators ?? 1)), 0) ?? 0;
  const totalParallelStations = balancing?.workstations.reduce((sum: number, ws: Workstation) => sum + (ws.parallelStations ?? 1), 0) ?? 0;
  const hallAreaM2 = ((project.facility.widthMm / 1000) * (project.facility.lengthMm / 1000)).toFixed(1);

  const errorCount = issues.filter(i => i.severity === 'error').length;
  const warningCount = issues.filter(i => i.severity === 'warning').length;

  // Skalowanie wykresu Yamazumi
  const maxCycle = Math.max(
    takt.taktTimeSeconds * 1.25,
    ...(balancing?.workstations.map((ws: Workstation) => ws.effectiveCycleSeconds ?? ws.cycleTimeSeconds) ?? [1])
  );

  return (
    <div className="engineering-report-container">
      {/* Pasek przełączania widoku (tylko na ekranie) */}
      <div className="report-view-mode-bar">
        <span className="eyebrow">Widok Raportu Inżynierskiego</span>
        <div className="view-toggles">
          <button
            className={viewMode === 'document' ? 'active' : ''}
            onClick={() => setViewMode('document')}
          >
            📄 Profesjonalny Raport A4
          </button>
          <button
            className={viewMode === 'markdown' ? 'active' : ''}
            onClick={() => setViewMode('markdown')}
          >
            📝 Źródło Markdown
          </button>
        </div>
      </div>

      {viewMode === 'markdown' ? (
        <pre className="report-preview raw-markdown-preview">{rawMarkdown}</pre>
      ) : (
        <article className="engineering-report-document" id="printable-engineering-report">
          {/* NAGŁÓWEK DOKUMENTU */}
          <header className="report-doc-header">
            <div className="report-doc-brand">
              <div>
                <div className="report-logo-text">LAYOUT STUDIO PRO 3D</div>
                <div className="report-logo-sub">Raport Technologiczno-Inżynierski Linii Produkcyjnej</div>
              </div>
              <div>
                {errorCount > 0 ? (
                  <span className="report-status-badge bad">❌ Błędy projektu ({errorCount})</span>
                ) : warningCount > 0 ? (
                  <span className="report-status-badge warn">⚠️ Ostrzeżenia ({warningCount})</span>
                ) : (
                  <span className="report-status-badge ok">✓ Projekt poprawny i spójny</span>
                )}
              </div>
            </div>

            <div className="report-title-block">
              <h1>{project.name}</h1>
              <div className="report-metadata-grid">
                <span>Identyfikator projektu: <strong>{project.id}</strong></span>
                <span>Data generowania: <strong>{new Date().toLocaleString('pl-PL')}</strong></span>
                <span>Wersja aplikacji: <strong>v0.4.0 (Schema {project.schemaVersion ?? 4})</strong></span>
                <span>Waluta rozliczeniowa: <strong>{currency}</strong></span>
              </div>
            </div>
          </header>

          {/* SEKCJA 1: EXECUTIVE SUMMARY / KARTY KPI */}
          <section className="report-section print-avoid-break">
            <div className="report-section-title">
              <span className="report-section-number">1</span>
              <span>Podsumowanie Zarządcze i Kluczowe Wskaźniki Linii (KPI)</span>
            </div>

            <div className="report-kpi-grid">
              <div className="report-kpi-card">
                <span className="report-kpi-label">Czas Taksu (Takt Time)</span>
                <span className="report-kpi-value">{takt.taktTimeSeconds.toFixed(1)} s</span>
                <span className="report-kpi-sub">Takt klienta: {takt.customerTaktSeconds.toFixed(1)} s (OEE {demand.oeePercent}%)</span>
              </div>

              <div className="report-kpi-card">
                <span className="report-kpi-label">Wąskie Gardło Cyklu</span>
                <span className="report-kpi-value">{balancing?.bottleneckCycleTimeSeconds?.toFixed(1) ?? '—'} s</span>
                <span className="report-kpi-sub">{balancing?.bottleneckStationName ?? 'Brak wąskich gardeł'}</span>
              </div>

              <div className="report-kpi-card">
                <span className="report-kpi-label">Liczba Stanowisk</span>
                <span className="report-kpi-value">{balancing?.actualWorkstationsCount ?? 0}</span>
                <span className="report-kpi-sub">Łącznie {totalParallelStations} fizycznych gniazd/kopii</span>
              </div>

              <div className="report-kpi-card">
                <span className="report-kpi-label">Obsada Operatorów</span>
                <span className="report-kpi-value">{totalOperators} osób</span>
                <span className="report-kpi-sub">Na jedną zmianę roboczą</span>
              </div>

              <div className="report-kpi-card">
                <span className="report-kpi-label">Efektywność Linii</span>
                <span className="report-kpi-value">{balancing?.lineEfficiencyPercent?.toFixed(1) ?? '—'}%</span>
                <span className="report-kpi-sub">Strata balansu: {balancing?.balanceDelayPercent?.toFixed(1) ?? '—'}%</span>
              </div>

              <div className="report-kpi-card">
                <span className="report-kpi-label">Zdolność Produkcyjna</span>
                <span className="report-kpi-value">
                  {takt.requiredPartsPerHour > 0 ? Math.round(takt.requiredPartsPerHour) : 0} szt./h
                </span>
                <span className="report-kpi-sub">
                  {Math.round(takt.dailyDemand / demand.shiftsPerDay)} szt. na zmianę
                </span>
              </div>
            </div>
          </section>

          {/* SEKCJA 2: ZAŁOŻENIA PRODUKCYJNE I POPYT */}
          <section className="report-section print-avoid-break">
            <div className="report-section-title">
              <span className="report-section-number">2</span>
              <span>Parametry Wejściowe Popytu i Organizacji Pracy</span>
            </div>

            <div className="report-table-wrapper">
              <table className="report-table">
                <thead>
                  <tr>
                    <th>Parametr Organizacyjny</th>
                    <th>Wartość Przyjęta w Projekcie</th>
                    <th>Jednostka</th>
                    <th>Uwagi Inżynierskie</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>Roczny popyt na wyrób (Yearly Demand)</td>
                    <td><strong>{demand.yearlyDemand.toLocaleString('pl-PL')}</strong></td>
                    <td>szt./rok</td>
                    <td>Popyt rynkowy klienta</td>
                  </tr>
                  <tr>
                    <td>Dni robocze w roku</td>
                    <td><strong>{demand.workingDaysPerYear}</strong></td>
                    <td>dni/rok</td>
                    <td>Kalendarz zakładowy</td>
                  </tr>
                  <tr>
                    <td>System zmianowy</td>
                    <td><strong>{demand.shiftsPerDay}</strong></td>
                    <td>zmiany/dzień</td>
                    <td>{demand.hoursPerShift} godz. roboczych na zmianę</td>
                  </tr>
                  <tr>
                    <td>Planowane przerwy technologiczne / posiłkowe</td>
                    <td><strong>{demand.plannedBreaksMinutesPerShift}</strong></td>
                    <td>min/zmianę</td>
                    <td>Czas potrącany z dostępności brutto</td>
                  </tr>
                  <tr>
                    <td>Wskaźnik OEE linii produkcyjnej</td>
                    <td><strong>{demand.oeePercent}%</strong></td>
                    <td>%</td>
                    <td>Dostępność × Wydajność × Jakość</td>
                  </tr>
                  <tr>
                    <td>Czas operacyjny netto (Net Operating Time)</td>
                    <td><strong>{(takt.netOperatingSecondsPerShift / 3600).toFixed(2)}</strong></td>
                    <td>h/zmianę</td>
                    <td>{(takt.netOperatingSecondsPerDay / 3600).toFixed(2)} h na dzień operacyjny</td>
                  </tr>
                  <tr>
                    <td>Algorytm bilansowania linii</td>
                    <td><strong>{project.algorithm ?? 'RPW'}</strong></td>
                    <td>—</td>
                    <td>Ranked Positional Weight (RPW) / Largest Candidate Rule (LCR)</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          {/* SEKCJA 3: WYKRES YAMAZUMI I SZCZEGÓŁOWY BILANS STANOWISK */}
          <section className="report-section print-break-before">
            <div className="report-section-title">
              <span className="report-section-number">3</span>
              <span>Bilansowanie Linii i Wykres Obciążenia Stanowisk (Yamazumi)</span>
            </div>

            {/* Wizualny wykres Yamazumi */}
            <div className="report-yamazumi-container">
              <div className="report-yamazumi-header">
                <span>Wykres czasu cyklu stanowisk względem Taksu (Takt Time = <strong>{takt.taktTimeSeconds.toFixed(1)} s</strong>)</span>
                <span className="report-yamazumi-legend">
                  <span style={{ color: '#10b981', marginRight: 12 }}>■ Cykl w normie</span>
                  <span style={{ color: '#ef4444', marginRight: 12 }}>■ Przekroczenie Taksu</span>
                  <span style={{ color: '#fbbf24' }}>-- Linia Taksu</span>
                </span>
              </div>

              <div className="report-yamazumi-bars">
                {balancing?.workstations.map((ws: Workstation, idx: number) => {
                  const cycle = ws.effectiveCycleSeconds ?? ws.cycleTimeSeconds;
                  const isOver = cycle > takt.taktTimeSeconds;
                  const barWidthPercent = Math.min(100, (cycle / maxCycle) * 100);
                  const taktLinePercent = Math.min(100, (takt.taktTimeSeconds / maxCycle) * 100);

                  return (
                    <div key={ws.id ?? idx} className="report-yamazumi-row">
                      <div className="report-yamazumi-label" title={ws.name}>
                        {ws.name}
                      </div>
                      <div className="report-yamazumi-track">
                        <div
                          className={`report-yamazumi-bar ${isOver ? 'over' : ''}`}
                          style={{ width: `${barWidthPercent}%` }}
                        />
                        <div
                          className="report-yamazumi-takt-line"
                          style={{ left: `${taktLinePercent}%` }}
                        />
                      </div>
                      <div className="report-yamazumi-val">
                        {cycle.toFixed(1)} s
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Tabela szczegółowa stanowisk */}
            <div className="report-table-wrapper">
              <table className="report-table">
                <thead>
                  <tr>
                    <th>Lp.</th>
                    <th>Stanowisko</th>
                    <th>Przypisane operacje</th>
                    <th>Czas cyklu [s]</th>
                    <th>Kopie</th>
                    <th>Obsada [os.]</th>
                    <th>Odstęp zdolności [s]</th>
                    <th>Obciążenie (%)</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {balancing?.workstations.map((ws: Workstation, idx: number) => {
                    const cycle = ws.effectiveCycleSeconds ?? ws.cycleTimeSeconds;
                    const workloadPercent = takt.taktTimeSeconds > 0 ? (cycle / takt.taktTimeSeconds) * 100 : 0;
                    return (
                      <tr key={ws.id ?? idx} className={ws.isBottleneck ? 'bottleneck' : ''}>
                        <td>{idx + 1}</td>
                        <td><strong>{ws.name}</strong></td>
                        <td>{ws.assignedStepIds.join(', ')}</td>
                        <td>{ws.cycleTimeSeconds.toFixed(1)}</td>
                        <td>{ws.parallelStations ?? 1}</td>
                        <td>{ws.operators ?? 1}</td>
                        <td><strong>{cycle.toFixed(1)}</strong></td>
                        <td>{workloadPercent.toFixed(1)}%</td>
                        <td>
                          {ws.isBottleneck ? (
                            <span style={{ color: '#ef4444', fontWeight: 700 }}>WĄSKIE GARDŁO</span>
                          ) : cycle > takt.taktTimeSeconds ? (
                            <span style={{ color: '#f59e0b', fontWeight: 600 }}>Przekroczenie</span>
                          ) : (
                            <span style={{ color: '#10b981' }}>W normie</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                  <tr className="summary-row">
                    <td colSpan={3}><strong>SUMA / ŚREDNIA LINII</strong></td>
                    <td><strong>{balancing?.totalWorkContentSeconds?.toFixed(1) ?? '—'}</strong></td>
                    <td><strong>{totalParallelStations}</strong></td>
                    <td><strong>{totalOperators}</strong></td>
                    <td>—</td>
                    <td><strong>{balancing?.lineEfficiencyPercent?.toFixed(1) ?? '—'}%</strong></td>
                    <td>{balancing?.bottleneckStationName ? 'Zbilansowana' : '—'}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          {/* SEKCJA 4: WYKAZ OPERACJI PROCESU */}
          <section className="report-section print-avoid-break">
            <div className="report-section-title">
              <span className="report-section-number">4</span>
              <span>Struktura Operacji Procesu Technologicznego ({project.processSteps.length} operacji)</span>
            </div>

            <div className="report-table-wrapper">
              <table className="report-table">
                <thead>
                  <tr>
                    <th>Lp.</th>
                    <th>ID</th>
                    <th>Nazwa Operacji</th>
                    <th>Czas Standard [s]</th>
                    <th>VA [s]</th>
                    <th>NVA [s]</th>
                    <th>Poprzednicy</th>
                    <th>Przypisane Stanowisko</th>
                  </tr>
                </thead>
                <tbody>
                  {project.processSteps.map((step: ProcessStep, idx: number) => {
                    const assignedWs = balancing?.workstations.find((ws: Workstation) => ws.assignedStepIds.includes(step.id));
                    return (
                      <tr key={step.id}>
                        <td>{idx + 1}</td>
                        <td><code>{step.id}</code></td>
                        <td><strong>{step.name}</strong></td>
                        <td>{step.standardTimeSeconds.toFixed(1)}</td>
                        <td style={{ color: '#10b981' }}>{step.vaTimeSeconds.toFixed(1)}</td>
                        <td style={{ color: '#94a3b8' }}>{step.nvaTimeSeconds.toFixed(1)}</td>
                        <td>{step.predecessorIds?.length ? step.predecessorIds.join(', ') : '—'}</td>
                        <td>{assignedWs ? assignedWs.name : '—'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>

          {/* SEKCJA 5: ZESTAWIENIE MATERIAŁOWE (BOM) */}
          <section className="report-section print-avoid-break">
            <div className="report-section-title">
              <span className="report-section-number">5</span>
              <span>Zestawienie Komponentów Materiałowych (BOM — Koszt wyrobu: {totalBOMCost.toFixed(2)} {currency})</span>
            </div>

            <div className="report-table-wrapper">
              <table className="report-table">
                <thead>
                  <tr>
                    <th>Lp.</th>
                    <th>ID</th>
                    <th>Numer Części (Part Number)</th>
                    <th>Nazwa Komponentu</th>
                    <th>Ilość/szt.</th>
                    <th>Nośnik</th>
                    <th>Szt./opak.</th>
                    <th>Operacja</th>
                    <th>Koszt jedn. [{currency}]</th>
                    <th>Koszt/wyrób [{currency}]</th>
                  </tr>
                </thead>
                <tbody>
                  {project.bom.map((item: BOMComponent, idx: number) => (
                    <tr key={item.id ?? idx}>
                      <td>{idx + 1}</td>
                      <td><code>{item.id}</code></td>
                      <td><strong>{item.partNumber}</strong></td>
                      <td>{item.name}</td>
                      <td>{item.quantityPerUnit}</td>
                      <td>{item.container}</td>
                      <td>{item.packageQuantity}</td>
                      <td><code>{item.associatedProcessStepId}</code></td>
                      <td>{item.unitCost.toFixed(2)}</td>
                      <td><strong>{(item.unitCost * item.quantityPerUnit).toFixed(2)}</strong></td>
                    </tr>
                  ))}
                  <tr className="summary-row">
                    <td colSpan={9}><strong>ŁĄCZNY KOSZT MATERIAŁOWY NA SZTUKĘ WYROBU</strong></td>
                    <td><strong>{totalBOMCost.toFixed(2)} {currency}</strong></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          {/* SEKCJA 6: GEOMETRIA HALI I ROZMIESZCZENIE (LAYOUT & FACILITY) */}
          <section className="report-section print-avoid-break">
            <div className="report-section-title">
              <span className="report-section-number">6</span>
              <span>Parametry Hali i Przestrzennego Rozmieszczenia (Facility & Layout)</span>
            </div>

            <div className="report-table-wrapper">
              <table className="report-table">
                <thead>
                  <tr>
                    <th>Cecha Przestrzenna</th>
                    <th>Wartość</th>
                    <th>Jednostka</th>
                    <th>Szczegóły</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>Gabaryty hali produkcyjnej</td>
                    <td>
                      <strong>
                        {(project.facility.widthMm / 1000).toFixed(1)} × {(project.facility.lengthMm / 1000).toFixed(1)} × {(project.facility.heightMm / 1000).toFixed(1)}
                      </strong>
                    </td>
                    <td>m (szer. × dł. × wys.)</td>
                    <td>Powierzchnia: <strong>{hallAreaM2} m²</strong></td>
                  </tr>
                  <tr>
                    <td>Typ układu technologicznego</td>
                    <td><strong>{project.targetLayoutType}</strong></td>
                    <td>—</td>
                    <td>U-Shape / Linear / Modular / Hybrid</td>
                  </tr>
                  <tr>
                    <td>Tryb pozycjonowania layoutu</td>
                    <td><strong>{project.layoutMode === 'manual' ? 'Ręczny CAD' : 'Automatyczny algorytmiczny'}</strong></td>
                    <td>—</td>
                    <td>Siatka projektowa: {project.facility.gridSizeMm} mm</td>
                  </tr>
                  <tr>
                    <td>Liczba obiektów layoutu</td>
                    <td><strong>{project.layoutObjects.length}</strong></td>
                    <td>obiektów</td>
                    <td>Stoły montażowe, regały FIFO, bufory, wózki i przenośniki</td>
                  </tr>
                  <tr>
                    <td>Przeszkody budowlane hali</td>
                    <td><strong>{project.obstacles.length}</strong></td>
                    <td>przeszkód</td>
                    <td>Słupy nośne i wyłączenia technologiczne</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          {/* SEKCJA 7: KONTROLA JAKOŚCI I AUDYT PROJEKTU (ISSUES) */}
          <section className="report-section print-avoid-break">
            <div className="report-section-title">
              <span className="report-section-number">7</span>
              <span>Audyt Jakościowy i Zgodność Technologiczna (Quality Gate)</span>
            </div>

            {issues.length === 0 ? (
              <div style={{ background: '#064e3b', border: '1px solid #059669', color: '#a7f3d0', padding: '12px 16px', borderRadius: 6, fontSize: 13 }}>
                ✓ Wszystkie reguły technologiczne, popytu i geometrii zostały spełnione. Brak błędów i kolizji przestrzennych.
              </div>
            ) : (
              <div className="report-table-wrapper">
                <table className="report-table">
                  <thead>
                    <tr>
                      <th>Poziom</th>
                      <th>Obszar</th>
                      <th>Opis Ostrzeżenia / Błędu</th>
                    </tr>
                  </thead>
                  <tbody>
                    {issues.map((issue, idx) => (
                      <tr key={idx} style={{ color: issue.severity === 'error' ? '#fda4af' : '#fde68a' }}>
                        <td><strong>{issue.severity.toUpperCase()}</strong></td>
                        <td><code>{issue.area}</code></td>
                        <td>{issue.message}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* SEKCJA 8: KLAUZULA INŻYNIERSKA I PODPIS */}
          <section className="report-section print-avoid-break">
            <div className="report-disclaimer-note">
              <strong>Klauzula poprawności metodologicznej (Lean & Industrial Engineering Standards):</strong><br />
              1. <em>Niezmiennik Zasady 5:</em> Obliczenia czasu taktu i bilansu bazują wyłącznie na zadeklarowanych w projekcie czasach operacji i popycie. Brak zmyślania pomiarów.<br />
              2. <em>Niezmiennik Zasady 6:</em> Trójwymiarowa wizualizacja i animacja 3D nie wpływają na wyniki obliczeń bilansowania linii i symulacji.<br />
              3. <em>Bezpieczeństwo pracy:</em> Sprawdzenia odległości na rzucie stanowią geometryczną kontrolę kolizji, a nie certyfikację BHP stanowiska w rozumieniu prawnym.
            </div>

            <div className="report-signoff-grid">
              <div className="report-signoff-box">
                <span>Opracował: Inżynier Procesu / Projektant Linii</span>
                <span style={{ height: 30 }} />
                <span>Data: ........................................ Podpis: ........................................</span>
              </div>
              <div className="report-signoff-box">
                <span>Zatwierdził: Kierownik Produkcji / Lean Champion</span>
                <span style={{ height: 30 }} />
                <span>Data: ........................................ Podpis: ........................................</span>
              </div>
            </div>
          </section>
        </article>
      )}
    </div>
  );
};
