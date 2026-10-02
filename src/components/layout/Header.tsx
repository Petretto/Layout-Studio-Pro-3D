import React from 'react';
import { Factory, Sparkles, Download, FileCode, Layers, RotateCcw } from 'lucide-react';
import { ProjectData } from '../../core/models/types';
import { DEFAULT_MOTOR_PROJECT, DEFAULT_BATTERY_PROJECT } from '../../core/models/defaultProjects';
import { exportToDxf } from '../../core/export/dxfExporter';

interface HeaderProps {
  project: ProjectData;
  setProject: React.Dispatch<React.SetStateAction<ProjectData>>;
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const Header: React.FC<HeaderProps> = ({ project, setProject, activeTab, setActiveTab }) => {
  const handleExportJson = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(project, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `${project.name.replace(/\s+/g, '_')}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleExportDxf = () => {
    const dxfContent = exportToDxf(project.facility, project.layoutObjects, project.name);
    const dataStr = 'data:application/dxf;charset=utf-8,' + encodeURIComponent(dxfContent);
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `${project.name.replace(/\s+/g, '_')}.dxf`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <header className="h-16 border-b border-slate-800 bg-slate-900/90 backdrop-blur px-6 flex items-center justify-between shrink-0 z-30">
      {/* Brand & Project Title */}
      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-2 bg-gradient-to-r from-blue-600 to-indigo-600 px-3 py-1.5 rounded-lg shadow-lg shadow-blue-500/20">
          <Factory className="w-5 h-5 text-white" />
          <span className="font-bold text-white tracking-wide text-sm">LAYOUT GENERATOR PRO 3D</span>
          <span className="text-[10px] bg-blue-400/30 text-blue-200 px-1.5 py-0.5 rounded font-mono font-semibold">v0.2</span>
        </div>

        <input
          type="text"
          value={project.name}
          onChange={(e) => setProject({ ...project, name: e.target.value })}
          className="bg-slate-800/80 hover:bg-slate-800 focus:bg-slate-800 border border-slate-700/60 focus:border-blue-500 rounded-md px-3 py-1 text-sm font-medium text-slate-200 focus:outline-none transition w-80"
          title="Kliknij, aby zmienić nazwę projektu"
        />
      </div>

      {/* Templates & Quick Actions */}
      <div className="flex items-center space-x-3">
        <div className="flex items-center bg-slate-800/60 p-1 rounded-lg border border-slate-700/50 text-xs">
          <span className="text-slate-400 px-2 font-medium">Szablon:</span>
          <button
            onClick={() => setProject(JSON.parse(JSON.stringify(DEFAULT_MOTOR_PROJECT)))}
            className="px-2.5 py-1 rounded hover:bg-blue-600/30 hover:text-blue-300 text-slate-300 transition font-medium"
          >
            🚗 Silniki EV (U-Shape)
          </button>
          <button
            onClick={() => setProject(JSON.parse(JSON.stringify(DEFAULT_BATTERY_PROJECT)))}
            className="px-2.5 py-1 rounded hover:bg-blue-600/30 hover:text-blue-300 text-slate-300 transition font-medium"
          >
            🔋 Baterie EV (Linear)
          </button>
        </div>

        {/* Layout Selector */}
        <div className="flex items-center space-x-1 bg-slate-800/60 p-1 rounded-lg border border-slate-700/50 text-xs">
          <span className="text-slate-400 px-2 font-medium">Układ:</span>
          {(['UShape', 'Linear', 'LShape'] as const).map((type) => (
            <button
              key={type}
              onClick={() => setProject({ ...project, targetLayoutType: type })}
              className={`px-2.5 py-1 rounded transition font-medium ${
                project.targetLayoutType === type
                  ? 'bg-blue-600 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {type === 'UShape' ? 'U-Shape' : type === 'Linear' ? 'Liniowy' : 'L-Shape'}
            </button>
          ))}
        </div>

        {/* Export Buttons */}
        <button
          onClick={handleExportJson}
          className="flex items-center space-x-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 px-3 py-1.5 rounded-lg text-xs font-semibold transition"
          title="Eksportuj kompletny projekt do pliku JSON"
        >
          <FileCode className="w-3.5 h-3.5 text-blue-400" />
          <span>JSON</span>
        </button>

        <button
          onClick={handleExportDxf}
          className="flex items-center space-x-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 px-3 py-1.5 rounded-lg text-xs font-semibold transition"
          title="Eksportuj układ fabryki do CAD 2D DXF"
        >
          <Download className="w-3.5 h-3.5 text-emerald-400" />
          <span>DXF CAD</span>
        </button>
      </div>
    </header>
  );
};
