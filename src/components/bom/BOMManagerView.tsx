import React, { useState, useRef } from 'react';
import { ProjectData, BOMComponent, ContainerType } from '../../core/models/types';
import { parseBOMFile, exportBOMToExcel } from '../../core/export/excelImporter';
import { Box, Plus, Trash2, ArrowRight, Upload, FileSpreadsheet, Layers } from 'lucide-react';

interface BOMManagerViewProps {
  project: ProjectData;
  setProject: React.Dispatch<React.SetStateAction<ProjectData>>;
  onNext: () => void;
}

export const BOMManagerView: React.FC<BOMManagerViewProps> = ({ project, setProject, onNext }) => {
  const [partNumber, setPartNumber] = useState('');
  const [name, setName] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [container, setContainer] = useState<ContainerType>('BoxKLT');
  const [pkgQty, setPkgQty] = useState(20);
  const [stepId, setStepId] = useState('1');
  const [cost, setCost] = useState(10);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const bom = project.bom;
  const totalBOMCost = bom.reduce((sum, item) => sum + item.unitCost * item.quantityPerUnit, 0);

  const handleAddBOM = () => {
    if (!name.trim()) return;

    const newItem: BOMComponent = {
      id: `BOM-${Date.now()}`,
      partNumber: partNumber.trim() || `PART-${String(bom.length + 1).padStart(3, '0')}`,
      name: name.trim(),
      quantityPerUnit: Number(quantity),
      container,
      packageQuantity: Number(pkgQty),
      associatedProcessStepId: stepId.trim() || '1',
      unitCost: Number(cost),
    };

    setProject((prev) => ({
      ...prev,
      bom: [...prev.bom, newItem],
    }));

    setPartNumber('');
    setName('');
    setQuantity(1);
    setCost(10);
  };

  const handleDeleteBOM = (id: string) => {
    setProject((prev) => ({
      ...prev,
      bom: prev.bom.filter((item) => item.id !== id),
    }));
  };

  // Import Excel/CSV (.xlsx / .csv)
  const handleImportExcel = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const buffer = event.target?.result as ArrayBuffer;
        const importedBOM = parseBOMFile(buffer);
        if (importedBOM.length > 0) {
          setProject((prev) => ({
            ...prev,
            bom: importedBOM,
          }));
          alert(`Pomyślnie zaimportowano ${importedBOM.length} komponentów BOM!`);
        } else {
          alert('Nie znaleziono poprawnych wierszy BOM w pliku Excel/CSV.');
        }
      } catch (err) {
        alert('Błąd odczytu pliku: ' + err);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 overflow-y-auto h-[calc(100vh-8rem)]">
      {/* Hidden File Input for Excel/CSV Import */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleImportExcel}
        accept=".xlsx, .xls, .csv"
        className="hidden"
      />

      {/* Top Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-100 flex items-center space-x-2">
            <Box className="w-6 h-6 text-blue-400" />
            <span>Zarządzanie Materiałami BOM (Bill of Materials)</span>
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            Przypisz komponenty i pojemniki logistyczne (KLT, Palety EUR) do poszczególnych kroków procesu produkcyjnego.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          {/* Import Excel */}
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center space-x-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 px-3.5 py-2 rounded-xl text-xs font-semibold transition"
            title="Importuj zestawienie BOM z pliku Excel (.xlsx) lub CSV"
          >
            <Upload className="w-3.5 h-3.5 text-emerald-400" />
            <span>Import Excel/CSV</span>
          </button>

          {/* Export Excel */}
          <button
            onClick={() => exportBOMToExcel(bom, project.name)}
            className="flex items-center space-x-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 px-3.5 py-2 rounded-xl text-xs font-semibold transition"
            title="Eksportuj do pliku Excel (.xlsx)"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-blue-400" />
            <span>Eksport Excel</span>
          </button>

          {/* Next Button */}
          <button
            onClick={onNext}
            className="flex items-center space-x-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white px-5 py-2.5 rounded-xl text-sm font-semibold shadow-lg shadow-blue-500/20 transition transform hover:-translate-y-0.5"
          >
            <span>Krok 4: Balans Linii (Yamazumi)</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-3 gap-6">
        <div className="bg-slate-900/80 border border-slate-800 p-5 rounded-2xl">
          <span className="text-xs font-semibold text-slate-400 block">Pozycje w BOM</span>
          <span className="text-2xl font-bold text-slate-100">{bom.length} komponentów</span>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 p-5 rounded-2xl">
          <span className="text-xs font-semibold text-slate-400 block">Łączny Koszt Materiałowy na Wyrób</span>
          <span className="text-2xl font-bold text-emerald-400">${totalBOMCost.toFixed(2)} / szt.</span>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 p-5 rounded-2xl">
          <span className="text-xs font-semibold text-slate-400 block">Pojemniki KLT / Palety</span>
          <span className="text-2xl font-bold text-indigo-400">
            {bom.filter((b) => b.container === 'BoxKLT').length} KLT / {bom.filter((b) => b.container === 'Pallet').length} Palet
          </span>
        </div>
      </div>

      {/* Add BOM Item Form */}
      <div className="bg-slate-900/90 border border-blue-500/30 rounded-2xl p-5 shadow-lg space-y-3">
        <h4 className="text-xs font-bold text-blue-400 uppercase tracking-wider flex items-center space-x-2">
          <Plus className="w-4 h-4" />
          <span>Dodaj Nowy Komponent Materiałowy</span>
        </h4>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
          <div className="md:col-span-2">
            <input
              type="text"
              placeholder="Nr Części (Part No)"
              value={partNumber}
              onChange={(e) => setPartNumber(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs font-mono text-slate-100 focus:outline-none focus:border-blue-500"
            />
          </div>

          <div className="md:col-span-3">
            <input
              type="text"
              placeholder="Nazwa komponentu..."
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs font-medium text-slate-100 focus:outline-none focus:border-blue-500"
            />
          </div>

          <div className="md:col-span-1">
            <input
              type="number"
              placeholder="Ilość"
              value={quantity}
              onChange={(e) => setQuantity(Number(e.target.value))}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold text-slate-100 focus:outline-none focus:border-blue-500"
            />
          </div>

          <div className="md:col-span-2">
            <select
              value={container}
              onChange={(e) => setContainer(e.target.value as ContainerType)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs font-medium text-slate-100 focus:outline-none focus:border-blue-500"
            >
              <option value="BoxKLT">Pojemnik KLT</option>
              <option value="Pallet">Paleta EUR</option>
              <option value="Tray">Tacka ESD</option>
              <option value="Carton">Karton</option>
            </select>
          </div>

          <div className="md:col-span-1">
            <input
              type="text"
              placeholder="ID Kroku"
              value={stepId}
              onChange={(e) => setStepId(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs font-mono text-slate-100 focus:outline-none focus:border-blue-500"
            />
          </div>

          <div className="md:col-span-2">
            <input
              type="number"
              placeholder="Koszt [$]"
              value={cost}
              onChange={(e) => setCost(Number(e.target.value))}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold text-emerald-400 focus:outline-none focus:border-blue-500"
            />
          </div>

          <div className="md:col-span-1">
            <button
              onClick={handleAddBOM}
              className="w-full bg-blue-600 hover:bg-blue-500 text-white py-2 rounded-xl text-xs font-bold transition flex items-center justify-center space-x-1 shadow-md shadow-blue-500/20"
            >
              <Plus className="w-4 h-4" />
              <span>Dodaj</span>
            </button>
          </div>
        </div>
      </div>

      {/* BOM Table */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-slate-800/80 text-slate-400 font-semibold border-b border-slate-700/60 uppercase tracking-wider">
              <th className="py-3.5 px-4 w-36">Nr Części</th>
              <th className="py-3.5 px-4">Nazwa Materiału</th>
              <th className="py-3.5 px-4 w-28">Ilość/Wyrób</th>
              <th className="py-3.5 px-4 w-36">Typ Kontenera</th>
              <th className="py-3.5 px-4 w-32">Wielkość Opak.</th>
              <th className="py-3.5 px-4 w-32">Krok Operacji</th>
              <th className="py-3.5 px-4 w-28">Koszt Jedn.</th>
              <th className="py-3.5 px-4 w-16 text-center">Usuń</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {bom.map((item) => (
              <tr key={item.id} className="hover:bg-slate-800/40 transition group">
                <td className="py-3 px-4 font-mono font-bold text-indigo-300">{item.partNumber}</td>
                <td className="py-3 px-4 font-medium text-slate-200">{item.name}</td>
                <td className="py-3 px-4 font-bold text-slate-100">{item.quantityPerUnit} szt.</td>
                <td className="py-3 px-4">
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                      item.container === 'BoxKLT'
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                        : 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                    }`}
                  >
                    {item.container === 'BoxKLT' ? '📦 KLT' : '🪵 Paleta EUR'}
                  </span>
                </td>
                <td className="py-3 px-4 text-slate-400">{item.packageQuantity} szt./opak.</td>
                <td className="py-3 px-4 font-mono text-blue-400">Krok: {item.associatedProcessStepId}</td>
                <td className="py-3 px-4 font-semibold text-emerald-400">${item.unitCost.toFixed(2)}</td>
                <td className="py-3 px-4 text-center">
                  <button
                    onClick={() => handleDeleteBOM(item.id)}
                    className="text-slate-500 hover:text-red-400 p-1 rounded transition opacity-60 group-hover:opacity-100"
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
  );
};
