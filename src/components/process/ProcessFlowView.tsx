import React, { useState, useRef } from 'react';
import { ProjectData, ProcessStep } from '../../core/models/types';
import { VisualProcessDiagram } from './VisualProcessDiagram';
import { parseProcessStepsFile, exportProcessStepsToExcel } from '../../core/export/excelImporter';
import {
  GitCommit,
  Plus,
  Trash2,
  ArrowRight,
  Upload,
  Download,
  FileSpreadsheet,
  Layers,
  Table as TableIcon,
} from 'lucide-react';

interface ProcessFlowViewProps {
  project: ProjectData;
  setProject: React.Dispatch<React.SetStateAction<ProjectData>>;
  onNext: () => void;
}

export const ProcessFlowView: React.FC<ProcessFlowViewProps> = ({ project, setProject, onNext }) => {
  const [viewMode, setViewMode] = useState<'diagram' | 'table'>('diagram');
  const [newId, setNewId] = useState('');
  const [newName, setNewName] = useState('');
  const [newTime, setNewTime] = useState(40);
  const [newPred, setNewPred] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const steps = project.processSteps;
  const totalStandardTime = steps.reduce((sum, s) => sum + s.standardTimeSeconds, 0);
  const totalVATime = steps.reduce((sum, s) => sum + s.vaTimeSeconds, 0);

  const handleAddStep = (stepToAdd?: ProcessStep) => {
    if (stepToAdd) {
      setProject((prev) => ({
        ...prev,
        processSteps: [...prev.processSteps, stepToAdd],
      }));
      return;
    }

    if (!newName.trim()) return;

    const id = newId.trim() || `${steps.length + 1}`;
    if (steps.some((step) => step.id === id)) {
      alert(`Krok o ID „${id}” już istnieje. Użyj innego ID.`);
      return;
    }
    const preds = newPred
      ? newPred.split(',').map((p) => p.trim()).filter(Boolean)
      : [];

    const newStep: ProcessStep = {
      id,
      name: newName.trim(),
      standardTimeSeconds: Number(newTime),
      vaTimeSeconds: Math.round(Number(newTime) * 0.85),
      nvaTimeSeconds: Math.round(Number(newTime) * 0.15),
      sequenceNumber: steps.length + 1,
      predecessorIds: preds,
    };

    setProject((prev) => ({
      ...prev,
      processSteps: [...prev.processSteps, newStep],
    }));

    setNewId('');
    setNewName('');
    setNewTime(35);
    setNewPred('');
  };

  const handleDeleteStep = (id: string) => {
    setProject((prev) => ({
      ...prev,
      processSteps: prev.processSteps
        .filter((s) => s.id !== id)
        .map((s) => ({ ...s, predecessorIds: s.predecessorIds.filter((predecessorId) => predecessorId !== id) })),
    }));
  };

  const handleUpdateStep = (id: string, field: keyof ProcessStep, value: any) => {
    setProject((prev) => ({
      ...prev,
      processSteps: prev.processSteps.map((s) => {
        if (s.id === id) {
          const updated = { ...s, [field]: value };
          if (field === 'standardTimeSeconds') {
            updated.vaTimeSeconds = Math.round(Number(value) * 0.85);
            updated.nvaTimeSeconds = Math.round(Number(value) * 0.15);
          }
          return updated;
        }
        return s;
      }),
    }));
  };

  // Import Excel/CSV file (.xlsx / .csv)
  const handleImportExcel = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const buffer = event.target?.result as ArrayBuffer;
        const importedSteps = parseProcessStepsFile(buffer);
        if (importedSteps.length > 0) {
          setProject((prev) => ({
            ...prev,
            processSteps: importedSteps,
          }));
          alert(`Pomyślnie zaimportowano ${importedSteps.length} kroków procesu!`);
        } else {
          alert('Nie znaleziono poprawnych wierszy procesu w pliku Excel/CSV.');
        }
      } catch (err) {
        alert('Błąd odczytu pliku: ' + err);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-7xl mx-auto p-6 space-y-5">
      {/* Hidden File Input for Excel/CSV Import */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleImportExcel}
        accept=".xlsx, .xls, .csv"
        className="hidden"
      />

      {/* Top Title & Header Actions */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-100 flex items-center space-x-2">
            <GitCommit className="w-6 h-6 text-blue-400" />
            <span>Kroki Procesu Technologicznego (Process Flow)</span>
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            Buduj zależności między operacjami. Diagram automatycznie układa kolejne poziomy procesu.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          {/* View Mode Toggle */}
          <div className="flex items-center bg-slate-800/80 p-1 rounded-xl border border-slate-700 text-xs">
            <button
              onClick={() => setViewMode('diagram')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg font-semibold transition ${
                viewMode === 'diagram' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Diagram Wizualny</span>
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg font-semibold transition ${
                viewMode === 'table' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <TableIcon className="w-3.5 h-3.5" />
              <span>Tabela Danych</span>
            </button>
          </div>

          {/* Import Excel Button */}
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center space-x-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 px-3.5 py-2 rounded-xl text-xs font-semibold transition"
            title="Importuj z pliku Excel (.xlsx) lub CSV"
          >
            <Upload className="w-3.5 h-3.5 text-emerald-400" />
            <span>Import Excel/CSV</span>
          </button>

          {/* Export Excel Button */}
          <button
            onClick={() => exportProcessStepsToExcel(steps, project.name)}
            className="flex items-center space-x-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 px-3.5 py-2 rounded-xl text-xs font-semibold transition"
            title="Eksportuj do pliku Excel (.xlsx)"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-blue-400" />
            <span>Eksport Excel</span>
          </button>

          {/* Next Step Button */}
          <button
            onClick={onNext}
            className="flex items-center space-x-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white px-5 py-2 rounded-xl text-xs font-semibold shadow-lg shadow-blue-500/20 transition transform hover:-translate-y-0.5"
          >
            <span>Krok 3: Materiały BOM</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-2xl">
          <span className="text-xs font-semibold text-slate-400 block">Liczba Operacji</span>
          <span className="text-2xl font-bold text-slate-100">{steps.length} kroków</span>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-2xl">
          <span className="text-xs font-semibold text-slate-400 block">Łączny Czas Pracy (Work Content)</span>
          <span className="text-2xl font-bold text-blue-400">{totalStandardTime} s / wyrób</span>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-2xl">
          <span className="text-xs font-semibold text-slate-400 block">Wskaźnik Wartości Dodanej (VA %)</span>
          <span className="text-2xl font-bold text-emerald-400">
            {totalStandardTime > 0 ? Math.round((totalVATime / totalStandardTime) * 100) : 0}%
          </span>
        </div>
      </div>

      {/* VIEW 1: Visual Interactive Node Diagram */}
      {viewMode === 'diagram' && (
        <div className="space-y-4">
          <VisualProcessDiagram
            steps={steps}
            onAddStep={handleAddStep}
            onUpdateStep={handleUpdateStep}
            onDeleteStep={handleDeleteStep}
          />
        </div>
      )}

      {/* VIEW 2: Data Table & Quick Add */}
      {viewMode === 'table' && (
        <div className="space-y-6">
          {/* Add New Step Form Card */}
          <div className="bg-slate-900/90 border border-blue-500/30 rounded-2xl p-5 shadow-lg shadow-blue-500/5 space-y-3">
            <h4 className="text-xs font-bold text-blue-400 uppercase tracking-wider flex items-center space-x-2">
              <Plus className="w-4 h-4" />
              <span>Szybkie Dodawanie Nowej Operacji</span>
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
              <div className="md:col-span-2">
                <input
                  type="text"
                  placeholder="ID np. 1.2"
                  value={newId}
                  onChange={(e) => setNewId(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs font-mono text-slate-100 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="md:col-span-5">
                <input
                  type="text"
                  placeholder="Nazwa operacji montażowej..."
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs font-medium text-slate-100 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="md:col-span-2">
                <input
                  type="number"
                  placeholder="Czas [s]"
                  value={newTime}
                  onChange={(e) => setNewTime(Number(e.target.value))}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold text-slate-100 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="md:col-span-2">
                <input
                  type="text"
                  placeholder="Poprzednik (np. 1)"
                  value={newPred}
                  onChange={(e) => setNewPred(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs font-mono text-slate-100 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="md:col-span-1">
                <button
                  onClick={() => handleAddStep()}
                  className="w-full bg-blue-600 hover:bg-blue-500 text-white py-2 rounded-xl text-xs font-bold transition flex items-center justify-center space-x-1 shadow-md shadow-blue-500/20"
                >
                  <Plus className="w-4 h-4" />
                  <span>Dodaj</span>
                </button>
              </div>
            </div>
          </div>

          {/* Main Process Table */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-800/80 text-slate-400 font-semibold border-b border-slate-700/60 uppercase tracking-wider">
                  <th className="py-3.5 px-4 w-24">ID Kroku</th>
                  <th className="py-3.5 px-4">Nazwa Operacji</th>
                  <th className="py-3.5 px-4 w-28">Czas Std [s]</th>
                  <th className="py-3.5 px-4 w-28">Wartość (VA)</th>
                  <th className="py-3.5 px-4 w-28">Strata (NVA)</th>
                  <th className="py-3.5 px-4 w-36">Poprzednicy</th>
                  <th className="py-3.5 px-4 w-20 text-center">Usuń</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {steps.map((step) => (
                  <tr key={step.id} className="hover:bg-slate-800/40 transition group">
                    <td className="py-3 px-4 font-mono font-bold text-blue-400">{step.id}</td>
                    <td className="py-3 px-4">
                      <input
                        type="text"
                        value={step.name}
                        onChange={(e) => handleUpdateStep(step.id, 'name', e.target.value)}
                        className="w-full bg-transparent hover:bg-slate-800 focus:bg-slate-800 px-2 py-1 rounded text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </td>
                    <td className="py-3 px-4">
                      <input
                        type="number"
                        value={step.standardTimeSeconds}
                        onChange={(e) => handleUpdateStep(step.id, 'standardTimeSeconds', Number(e.target.value))}
                        className="w-20 bg-transparent hover:bg-slate-800 focus:bg-slate-800 px-2 py-1 rounded font-bold text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </td>
                    <td className="py-3 px-4 text-emerald-400 font-medium">{step.vaTimeSeconds}s</td>
                    <td className="py-3 px-4 text-amber-400 font-medium">{step.nvaTimeSeconds}s</td>
                    <td className="py-3 px-4 font-mono text-slate-400">
                      {step.predecessorIds.length > 0 ? step.predecessorIds.join(', ') : '—'}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => handleDeleteStep(step.id)}
                        className="text-slate-500 hover:text-red-400 p-1 rounded transition opacity-60 group-hover:opacity-100"
                        title="Usuń krok operacji"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      </div>
    </div>
  );
};
