import React, { useState } from 'react';
import { ProjectData } from '../../core/models/types';
import { calculateTaktTime } from '../../core/algorithms/taktCalculator';
import { runLineBalancing } from '../../core/algorithms/lineBalancingEngine';
import { generate3DLayout } from '../../core/algorithms/layoutEngine';
import { calculateSpaghettiDiagram } from '../../core/algorithms/spaghettiEngine';
import { BarChart3, AlertTriangle, CheckCircle2, ArrowRight, Zap, RefreshCw, Layers } from 'lucide-react';

interface YamazumiChartViewProps {
  project: ProjectData;
  setProject: React.Dispatch<React.SetStateAction<ProjectData>>;
  onGoTo3D: () => void;
}

export const YamazumiChartView: React.FC<YamazumiChartViewProps> = ({ project, setProject, onGoTo3D }) => {
  const [algorithm, setAlgorithm] = useState<'RPW' | 'LCR'>('RPW');

  const taktResult = calculateTaktTime(project.demand);
  const balancing = runLineBalancing(project.processSteps, taktResult.taktTimeSeconds, algorithm);

  const stepsMap = new Map(project.processSteps.map((s) => [s.id, s]));
  const maxCycle = Math.max(taktResult.taktTimeSeconds * 1.2, balancing.bottleneckCycleTimeSeconds * 1.15, 60);

  const handleApplyLayoutAndGo3D = () => {
    const layoutObjects = generate3DLayout(balancing.workstations, project.targetLayoutType, project.facility);
    const spaghetti = calculateSpaghettiDiagram(layoutObjects, taktResult.dailyDemand, project.demand.shiftsPerDay);

    setProject((prev) => ({
      ...prev,
      balancing,
      layoutObjects,
      spaghetti,
    }));

    onGoTo3D();
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 overflow-y-auto h-[calc(100vh-8rem)]">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-100 flex items-center space-x-2">
            <BarChart3 className="w-6 h-6 text-blue-400" />
            <span>Wykres Balansowania Linii Yamazumi & Obciążenie Stacji</span>
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            Wykres słupkowy obciążenia stanowisk z linią taktu. Kolor zielony to czas operacji dodającej wartość (VA), a żółty to strata (NVA).
          </p>
        </div>

        <div className="flex items-center space-x-3">
          {/* Algorithm Toggle */}
          <div className="flex items-center bg-slate-800/80 p-1 rounded-xl border border-slate-700 text-xs">
            <span className="text-slate-400 px-2 font-medium">Algorytm:</span>
            <button
              onClick={() => setAlgorithm('RPW')}
              className={`px-3 py-1 rounded-lg font-semibold transition ${
                algorithm === 'RPW' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              RPW (Ranked Positional Weight)
            </button>
            <button
              onClick={() => setAlgorithm('LCR')}
              className={`px-3 py-1 rounded-lg font-semibold transition ${
                algorithm === 'LCR' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              LCR (Largest Candidate Rule)
            </button>
          </div>

          <button
            onClick={handleApplyLayoutAndGo3D}
            className="flex items-center space-x-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white px-6 py-2.5 rounded-xl text-sm font-bold shadow-lg shadow-emerald-500/25 transition transform hover:-translate-y-0.5"
          >
            <Zap className="w-4 h-4" />
            <span>WYGENERUJ I PRZEJDŹ DO HALI 3D ➡</span>
          </button>
        </div>
      </div>

      {/* KPI Metrics */}
      <div className="grid grid-cols-4 gap-6">
        <div className="bg-slate-900/80 border border-slate-800 p-5 rounded-2xl">
          <span className="text-xs font-semibold text-slate-400 block">Wymagany Czas Taktu</span>
          <span className="text-2xl font-bold text-red-400">{taktResult.taktTimeSeconds} s</span>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 p-5 rounded-2xl">
          <span className="text-xs font-semibold text-slate-400 block">Liczba Stanowisk (N_akt / N_min)</span>
          <span className="text-2xl font-bold text-blue-400">
            {balancing.actualWorkstationsCount} / {balancing.theoreticalMinWorkstations} stacji
          </span>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 p-5 rounded-2xl">
          <span className="text-xs font-semibold text-slate-400 block">Efektywność Linii (Line Efficiency)</span>
          <span className="text-2xl font-bold text-emerald-400">{balancing.lineEfficiencyPercent}%</span>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 p-5 rounded-2xl">
          <span className="text-xs font-semibold text-slate-400 block">Wąskie Gardło (Bottleneck)</span>
          <span className="text-lg font-bold text-amber-400 truncate block">
            {balancing.bottleneckCycleTimeSeconds > taktResult.taktTimeSeconds ? '⚠️ ' : '✅ '}
            {balancing.bottleneckCycleTimeSeconds}s ({balancing.bottleneckStationName.split(' ')[0]} {balancing.bottleneckStationName.split(' ')[1]})
          </span>
        </div>
      </div>

      {/* Yamazumi Chart Container */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-8 shadow-2xl relative">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4 text-xs font-semibold">
            <div className="flex items-center space-x-1.5">
              <span className="w-3.5 h-3.5 rounded bg-emerald-500 inline-block" />
              <span className="text-slate-300">Wartość Dodana (VA)</span>
            </div>
            <div className="flex items-center space-x-1.5">
              <span className="w-3.5 h-3.5 rounded bg-amber-500 inline-block" />
              <span className="text-slate-300">Czynności Pomocnicze (NVA)</span>
            </div>
            <div className="flex items-center space-x-1.5">
              <span className="w-5 h-0.5 border-t-2 border-dashed border-red-500 inline-block" />
              <span className="text-red-400 font-bold">Linia Czasu Taktu ({taktResult.taktTimeSeconds}s)</span>
            </div>
          </div>

          <span className="text-xs text-slate-500 font-mono">Skala: 0 do {Math.round(maxCycle)}s</span>
        </div>

        {/* Chart Bars Area */}
        <div className="h-96 relative border-b border-l border-slate-700/80 flex items-end px-8 pt-6 pb-2 space-x-8">
          {/* Takt Line Overlay */}
          <div
            className="absolute left-0 right-0 border-t-2 border-dashed border-red-500 z-10 flex items-center justify-end pr-4 pointer-events-none"
            style={{
              bottom: `${(taktResult.taktTimeSeconds / maxCycle) * 100}%`,
            }}
          >
            <span className="bg-red-950/80 text-red-300 text-[10px] font-mono px-2 py-0.5 rounded border border-red-500/50 shadow">
              TAKT: {taktResult.taktTimeSeconds}s
            </span>
          </div>

          {/* Workstation Bars */}
          {balancing.workstations.map((ws, index) => {
            const heightPercent = (ws.cycleTimeSeconds / maxCycle) * 100;
            const isOverTakt = ws.cycleTimeSeconds > taktResult.taktTimeSeconds;

            return (
              <div key={ws.id} className="flex-1 flex flex-col items-center h-full justify-end group relative">
                {/* Total time badge */}
                <div
                  className={`text-xs font-mono font-bold mb-2 transition transform group-hover:-translate-y-1 ${
                    isOverTakt ? 'text-red-400 bg-red-950/80 px-2 py-0.5 rounded border border-red-500/40' : 'text-slate-200'
                  }`}
                >
                  {ws.cycleTimeSeconds}s
                </div>

                {/* Stacked Bar Container */}
                <div
                  className={`w-full max-w-[90px] rounded-t-xl overflow-hidden flex flex-col-reverse shadow-lg transition-all duration-300 group-hover:brightness-110 ${
                    isOverTakt ? 'ring-2 ring-red-500' : ''
                  }`}
                  style={{ height: `${heightPercent}%` }}
                >
                  {ws.assignedStepIds.map((stepId, sIdx) => {
                    const step = stepsMap.get(stepId);
                    if (!step) return null;
                    const stepHeightPercent = (step.standardTimeSeconds / ws.cycleTimeSeconds) * 100;

                    return (
                      <div
                        key={stepId}
                        className={`w-full flex items-center justify-center text-[10px] font-mono font-bold text-slate-900 border-t border-slate-900/30 transition ${
                          sIdx % 2 === 0 ? 'bg-emerald-500' : 'bg-emerald-400'
                        }`}
                        style={{ height: `${stepHeightPercent}%` }}
                        title={`[${step.id}] ${step.name} (${step.standardTimeSeconds}s)`}
                      >
                        {step.standardTimeSeconds >= 15 ? `${step.id} (${step.standardTimeSeconds}s)` : step.id}
                      </div>
                    );
                  })}
                </div>

                {/* Workstation Label */}
                <div className="mt-3 text-center">
                  <span className="text-xs font-bold text-slate-300 block">{ws.id}</span>
                  <span className="text-[10px] text-slate-500 block truncate max-w-[100px]">
                    {ws.assignedStepIds.length} zadań
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
