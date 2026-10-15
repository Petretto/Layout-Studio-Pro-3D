import React, {useState, useMemo} from 'react';
import type {DomainProjectV6} from '../../core/domainProject';
import type {WorkerScheduleResult} from '../../core/workerSchedule';
import {
  buildScheduleGanttChart,
  type GanttViewMode,
  type GanttBar,
  type GanttRow,
  type GanttSelectionTarget,
  type GanttBarKind,
} from '../../core/scheduleGantt';

interface ScheduleGanttChartProps {
  project: DomainProjectV6;
  result: WorkerScheduleResult;
  selectedTarget: GanttSelectionTarget | null;
  onSelectTarget: (target: GanttSelectionTarget | null) => void;
}

const KIND_COLORS: Record<GanttBarKind, {bg: string; border: string; label: string}> = {
  'work': {bg: '#10b981', border: '#059669', label: 'Praca netto'},
  'pause': {bg: '#64748b', border: '#475569', label: 'Pauza kalendarzowa'},
  'wait': {bg: '#f59e0b', border: '#d97706', label: 'Oczekiwanie na zasoby'},
  'blocked': {bg: '#ef4444', border: '#dc2626', label: 'Blokada wyjścia (bbas)'},
  'local-wait': {bg: '#8b5cf6', border: '#7c3aed', label: 'Oczekiwanie lokalne'},
  'transport-transfer': {bg: '#06b6d4', border: '#0891b2', label: 'Przewóz ładunku'},
  'transport-empty': {bg: '#38bdf8', border: '#0284c7', label: 'Dojazd / powrót'},
  'reserve': {bg: '#3b82f6', border: '#2563eb', label: 'Rezerwacja celu'},
};

export function ScheduleGanttChart({
  project,
  result,
  selectedTarget,
  onSelectTarget,
}: ScheduleGanttChartProps) {
  const [viewMode, setViewMode] = useState<GanttViewMode>('operations');
  const [zoomLevel, setZoomLevel] = useState<number>(100); // percentage: 100 = 100% width, 200 = 200% width
  const [filterText, setFilterText] = useState('');

  const chartModel = useMemo(
    () => buildScheduleGanttChart(project, result, viewMode),
    [project, result, viewMode]
  );

  const makespan = chartModel.totalDurationSeconds;

  const filteredRows = useMemo(() => {
    if (!filterText.trim()) return chartModel.rows;
    const lower = filterText.toLowerCase();
    return chartModel.rows.filter(
      r => r.label.toLowerCase().includes(lower) || (r.sublabel && r.sublabel.toLowerCase().includes(lower))
    );
  }, [chartModel.rows, filterText]);

  const handleBarClick = (bar: GanttBar, row: GanttRow) => {
    if (row.category === 'operation') {
      onSelectTarget({
        category: 'operation',
        id: bar.operationId ?? row.targetObjectId,
        job: bar.job ?? row.targetJob,
        copy: bar.copy ?? row.targetCopy,
      });
    } else if (row.category === 'station') {
      onSelectTarget({
        category: 'station',
        id: bar.stationId ?? row.targetObjectId,
        copy: bar.copy ?? row.targetCopy,
        job: bar.job,
      });
    } else if (row.category === 'worker') {
      onSelectTarget({
        category: 'worker',
        id: row.targetObjectId,
        job: bar.job,
      });
    }
  };

  const isRowSelected = (row: GanttRow): boolean => {
    if (!selectedTarget) return false;
    if (selectedTarget.category !== row.category) return false;
    if (selectedTarget.id !== row.targetObjectId) return false;
    if (selectedTarget.category === 'operation' && selectedTarget.job !== undefined) {
      return selectedTarget.job === row.targetJob;
    }
    if (selectedTarget.category === 'station' && selectedTarget.copy !== undefined) {
      return selectedTarget.copy === row.targetCopy;
    }
    return true;
  };

  const isBarSelected = (bar: GanttBar): boolean => {
    if (!selectedTarget) return false;
    if (selectedTarget.category === 'operation') {
      return bar.operationId === selectedTarget.id && (selectedTarget.job === undefined || bar.job === selectedTarget.job);
    }
    if (selectedTarget.category === 'station') {
      return bar.stationId === selectedTarget.id && (selectedTarget.copy === undefined || bar.copy === selectedTarget.copy);
    }
    if (selectedTarget.category === 'worker') {
      return (bar.workerIds ?? []).includes(selectedTarget.id);
    }
    return false;
  };

  if (makespan <= 0 || chartModel.rows.length === 0) {
    return (
      <div className="gantt-chart-empty" aria-label="Wykres Gantta pusty">
        <p className="muted">Brak danych harmonogramu do wygenerowania wykresu Gantta.</p>
      </div>
    );
  }

  return (
    <div className="schedule-gantt-panel" aria-label="Wykres Gantta harmonogramu">
      <div className="gantt-toolbar">
        <div className="gantt-view-switch" role="tablist" aria-label="Widok wykresu Gantta">
          <button
            type="button"
            role="tab"
            aria-selected={viewMode === 'operations'}
            className={`tab-btn ${viewMode === 'operations' ? 'active' : ''}`}
            onClick={() => setViewMode('operations')}
          >
            Operacje w partii ({chartModel.viewMode === 'operations' ? chartModel.rows.length : ''})
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={viewMode === 'stations'}
            className={`tab-btn ${viewMode === 'stations' ? 'active' : ''}`}
            onClick={() => setViewMode('stations')}
          >
            Stanowiska i kopie
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={viewMode === 'workers'}
            className={`tab-btn ${viewMode === 'workers' ? 'active' : ''}`}
            onClick={() => setViewMode('workers')}
          >
            Pracownicy
          </button>
        </div>

        <div className="gantt-controls">
          <label className="gantt-zoom-label">
            Skala osi:
            <select
              aria-label="Skala osi czasu"
              value={zoomLevel}
              onChange={e => setZoomLevel(Number(e.target.value))}
            >
              <option value={75}>75% (zwarty)</option>
              <option value={100}>100% (domyślny)</option>
              <option value={150}>150% (poszerzony)</option>
              <option value={200}>200% (dokładny)</option>
              <option value={300}>300% (duży)</option>
            </select>
          </label>

          <input
            type="search"
            aria-label="Filtruj wiersze wykresu Gantta"
            placeholder="Szukaj operacji, stanowiska lub osoby..."
            value={filterText}
            onChange={e => setFilterText(e.target.value)}
            className="gantt-filter-input"
          />

          {selectedTarget && (
            <button
              type="button"
              className="gantt-clear-selection-btn"
              onClick={() => onSelectTarget(null)}
              title="Wyczyść zaznaczenie"
            >
              Wyczyść zaznaczenie
            </button>
          )}
        </div>
      </div>

      {/* Legend */}
      <div className="gantt-legend" aria-label="Legenda stanów wykresu Gantta">
        {Object.entries(KIND_COLORS).map(([kind, conf]) => (
          <div key={kind} className="legend-item">
            <span
              className="legend-color-box"
              style={{backgroundColor: conf.bg, borderColor: conf.border}}
            />
            <span className="legend-label">{conf.label}</span>
          </div>
        ))}
      </div>

      {/* Gantt Interactive Board */}
      <div className="gantt-container">
        {/* Left Sticky Header Column */}
        <div className="gantt-left-column">
          <div className="gantt-corner-cell">
            {viewMode === 'operations' ? 'Sztuka / Operacja' : viewMode === 'stations' ? 'Stanowisko / Kopia' : 'Pracownik'}
          </div>
          <div className="gantt-row-headers">
            {filteredRows.map(row => {
              const selected = isRowSelected(row);
              return (
                <div
                  key={row.id}
                  className={`gantt-row-header ${selected ? 'selected' : ''}`}
                  onClick={() => onSelectTarget({
                    category: row.category,
                    id: row.targetObjectId,
                    job: row.targetJob,
                    copy: row.targetCopy,
                  })}
                  role="button"
                  tabIndex={0}
                  aria-pressed={selected}
                  title={`Kliknij, aby podświetlić i przejść do obiektu: ${row.label}`}
                >
                  <strong className="row-header-title">{row.label}</strong>
                  {row.sublabel && <small className="row-header-sub">{row.sublabel}</small>}
                  <span className="row-header-active-time">praca: {row.totalActiveSeconds} s</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Scrollable Timeline View */}
        <div className="gantt-timeline-scroll">
          <div
            className="gantt-timeline-canvas"
            style={{width: `${zoomLevel}%`, minWidth: '600px'}}
          >
            {/* Timeline Ruler */}
            <div className="gantt-ruler">
              {chartModel.timeGrid.majorTicks.map(tick => {
                const leftPercent = (tick / makespan) * 100;
                if (leftPercent > 100) return null;
                return (
                  <div
                    key={tick}
                    className="gantt-ruler-tick"
                    style={{left: `${leftPercent}%`}}
                  >
                    <span className="tick-label">{tick} s</span>
                    <div className="tick-line" />
                  </div>
                );
              })}
            </div>

            {/* Rows and Bars */}
            <div className="gantt-rows-body">
              {/* Background Grid Lines */}
              <div className="gantt-grid-overlay" aria-hidden="true">
                {chartModel.timeGrid.majorTicks.map(tick => {
                  const leftPercent = (tick / makespan) * 100;
                  if (leftPercent > 100) return null;
                  return (
                    <div
                      key={tick}
                      className="grid-vertical-line"
                      style={{left: `${leftPercent}%`}}
                    />
                  );
                })}
              </div>

              {filteredRows.map(row => {
                const selected = isRowSelected(row);
                return (
                  <div
                    key={row.id}
                    className={`gantt-row-lane ${selected ? 'selected-lane' : ''}`}
                  >
                    {row.bars.map(bar => {
                      const leftPercent = Math.max(0, (bar.startSeconds / makespan) * 100);
                      const widthPercent = Math.max(0.2, (bar.durationSeconds / makespan) * 100);
                      const barConf = KIND_COLORS[bar.kind] ?? KIND_COLORS.work;
                      const barSelected = isBarSelected(bar);

                      return (
                        <div
                          key={bar.id}
                          className={`gantt-bar kind-${bar.kind} ${barSelected ? 'selected-bar' : ''}`}
                          style={{
                            left: `${leftPercent}%`,
                            width: `${widthPercent}%`,
                            backgroundColor: barConf.bg,
                            borderColor: barSelected ? '#ffffff' : barConf.border,
                          }}
                          onClick={e => {
                            e.stopPropagation();
                            handleBarClick(bar, row);
                          }}
                          title={bar.tooltip}
                          role="button"
                          tabIndex={0}
                        >
                          <span className="gantt-bar-label">{bar.label}</span>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Selected Object Inspector Banner */}
      {selectedTarget && (
        <div className="gantt-selection-banner" aria-label="Wybrany obiekt harmonogramu">
          <div className="banner-info">
            <span className="banner-badge">
              {selectedTarget.category === 'operation' ? 'Wybrana operacja' :
               selectedTarget.category === 'station' ? 'Wybrane stanowisko' : 'Wybrany pracownik'}
            </span>
            <strong>
              {selectedTarget.category === 'operation' ? `Sztuka ${selectedTarget.job} — Operacja ${selectedTarget.id}` :
               selectedTarget.category === 'station' ? `Stanowisko ${selectedTarget.id}${selectedTarget.copy ? ` (kopia ${selectedTarget.copy})` : ''}` :
               `Pracownik ${selectedTarget.id}`}
            </strong>
          </div>
          <span className="banner-hint">
            Powiązany wiersz w tabeli wykonań i w inspekcjach poniżej został wyróżniony.
          </span>
        </div>
      )}
    </div>
  );
}
