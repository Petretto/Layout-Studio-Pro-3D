import React from 'react';
import { ProjectData } from '../../core/models/types';
import { calculateTaktTime } from '../../core/algorithms/taktCalculator';
import { Clock, TrendingUp, Calendar, Zap, AlertCircle, ArrowRight } from 'lucide-react';

interface DemandWizardViewProps {
  project: ProjectData;
  setProject: React.Dispatch<React.SetStateAction<ProjectData>>;
  onNext: () => void;
}

export const DemandWizardView: React.FC<DemandWizardViewProps> = ({ project, setProject, onNext }) => {
  const { demand } = project;
  const taktResult = calculateTaktTime(demand);

  const updateDemand = (partial: Partial<typeof demand>) => {
    setProject((prev) => ({
      ...prev,
      demand: { ...prev.demand, ...partial },
    }));
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 overflow-y-auto h-[calc(100vh-8rem)]">
      {/* Title & Introduction */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-100 flex items-center space-x-2">
            <Clock className="w-6 h-6 text-blue-400" />
            <span>Kalkulator Zapotrzebowania & Czas Taktu (Takt Time)</span>
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            Zdefiniuj roczny lub dzienny popyt klienta oraz parametry pracy. Takt Time określa wymagane tempo schodzenia wyrobu z linii.
          </p>
        </div>

        <button
          onClick={onNext}
          className="flex items-center space-x-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white px-5 py-2.5 rounded-xl text-sm font-semibold shadow-lg shadow-blue-500/20 transition transform hover:-translate-y-0.5"
        >
          <span>Krok 2: Proces Technologiczny</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      {/* Main Grid: Inputs vs Results */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Editable Parameters (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Card 1: Customer Demand */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
            <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider flex items-center space-x-2">
              <TrendingUp className="w-4 h-4 text-emerald-400" />
              <span>1. Popyt Klienta (Dwukierunkowe Przeliczanie)</span>
            </h3>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                  Popyt Roczny [szt./rok]
                </label>
                <input
                  type="number"
                  value={demand.yearlyDemand}
                  onChange={(e) => updateDemand({ yearlyDemand: Math.max(1, Number(e.target.value)) })}
                  className="w-full bg-slate-800/80 border border-slate-700 rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-100 focus:outline-none focus:border-blue-500 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                  Dni Roboczych w Roku [dni]
                </label>
                <input
                  type="number"
                  value={demand.workingDaysPerYear}
                  onChange={(e) => updateDemand({ workingDaysPerYear: Math.max(1, Number(e.target.value)) })}
                  className="w-full bg-slate-800/80 border border-slate-700 rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-100 focus:outline-none focus:border-blue-500 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                  Średni Popyt Miesięczny [szt./mc]
                </label>
                <div className="w-full bg-slate-800/40 border border-slate-800 rounded-xl px-4 py-2.5 text-sm font-medium text-slate-400">
                  {taktResult.monthlyDemand.toLocaleString()} szt.
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                  Średni Popyt Dzienny [szt./dzień]
                </label>
                <div className="w-full bg-slate-800/40 border border-slate-800 rounded-xl px-4 py-2.5 text-sm font-bold text-blue-400">
                  {taktResult.dailyDemand.toLocaleString()} szt.
                </div>
              </div>
            </div>
          </div>

          {/* Card 2: Shift Pattern & OEE */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
            <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider flex items-center space-x-2">
              <Calendar className="w-4 h-4 text-amber-400" />
              <span>2. Organizacja Pracy & Efektywność (OEE)</span>
            </h3>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                  Liczba Zmian Roboczych
                </label>
                <select
                  value={demand.shiftsPerDay}
                  onChange={(e) => updateDemand({ shiftsPerDay: Number(e.target.value) })}
                  className="w-full bg-slate-800/80 border border-slate-700 rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-100 focus:outline-none focus:border-blue-500 transition"
                >
                  <option value={1}>1 Zmiana (8h)</option>
                  <option value={2}>2 Zmiany (16h)</option>
                  <option value={3}>3 Zmiany (24h - Ciągły)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                  Czas Zmiany [godziny]
                </label>
                <input
                  type="number"
                  step="0.5"
                  value={demand.hoursPerShift}
                  onChange={(e) => updateDemand({ hoursPerShift: Number(e.target.value) })}
                  className="w-full bg-slate-800/80 border border-slate-700 rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-100 focus:outline-none focus:border-blue-500 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                  Planowane Przerwy na Zmianę [minuty]
                </label>
                <input
                  type="number"
                  value={demand.plannedBreaksMinutesPerShift}
                  onChange={(e) => updateDemand({ plannedBreaksMinutesPerShift: Number(e.target.value) })}
                  className="w-full bg-slate-800/80 border border-slate-700 rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-100 focus:outline-none focus:border-blue-500 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                  Wskaźnik OEE / Dostępności [%]: <span className="text-blue-400 font-bold">{demand.oeePercent}%</span>
                </label>
                <input
                  type="range"
                  min="50"
                  max="100"
                  value={demand.oeePercent}
                  onChange={(e) => updateDemand({ oeePercent: Number(e.target.value) })}
                  className="w-full accent-blue-500 mt-2"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Calculated Results & Big Cards (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Glowing Takt Time Card */}
          <div className="bg-gradient-to-br from-blue-900/40 via-slate-900/90 to-slate-900 border border-blue-500/40 rounded-3xl p-8 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 transform translate-x-4 -translate-y-4 w-32 h-32 bg-blue-500/10 rounded-full blur-2xl" />

            <div className="flex items-center space-x-3 mb-4">
              <div className="p-2.5 bg-blue-500/20 text-blue-400 rounded-xl">
                <Zap className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-blue-400 uppercase tracking-widest">Kluczowy Wskaźnik Lean</h4>
                <h3 className="text-lg font-bold text-slate-100">Wymagany Czas Taktu</h3>
              </div>
            </div>

            <div className="my-6">
              <div className="text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-200 to-emerald-400 tracking-tight">
                {taktResult.taktTimeSeconds} <span className="text-2xl text-slate-400 font-normal">sek./szt.</span>
              </div>
              <p className="text-xs text-slate-400 mt-2">
                Co tyle sekund linia musi ukończyć 1 gotowy produkt, aby zaspokoić popyt.
              </p>
            </div>

            {/* Sub metrics grid */}
            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-800/80">
              <div className="bg-slate-800/60 p-3.5 rounded-xl border border-slate-700/40">
                <span className="text-[11px] text-slate-400 block font-medium">Tempo Godzinowe</span>
                <span className="text-lg font-bold text-emerald-400">{taktResult.requiredPartsPerHour} szt./h</span>
              </div>

              <div className="bg-slate-800/60 p-3.5 rounded-xl border border-slate-700/40">
                <span className="text-[11px] text-slate-400 block font-medium">Tempo Minutowe</span>
                <span className="text-lg font-bold text-indigo-400">{taktResult.requiredPartsPerMinute} szt./min</span>
              </div>
            </div>
          </div>

          {/* Lean Insights Alert */}
          <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-6 flex items-start space-x-3 text-xs text-slate-300">
            <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <span className="font-semibold text-amber-300">Wskazówka Projektowa Lean:</span>
              <p className="text-slate-400 leading-relaxed">
                Jeśli czas cyklu dowolnej pojedynczej stacji montażowej przekroczy <strong>{taktResult.taktTimeSeconds}s</strong>, stanie się ona <em>Wąskim Gardłem (Bottleneck)</em> i linia nie zrealizuje planu.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
