import React from 'react';
import { Home, Calculator, GitCommit, Box, BarChart3, Eye, Compass } from 'lucide-react';

interface TabsNavProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const TabsNav: React.FC<TabsNavProps> = ({ activeTab, setActiveTab }) => {
  const tabs = [
    { id: 'dashboard', label: '🏠 Pulpit Główny', icon: Home, desc: 'Projekty i Szablony' },
    { id: 'demand', label: '1. Popyt & Takt Time', icon: Calculator, desc: 'Kalkulator tempa' },
    { id: 'process', label: '2. Proces & Operacje', icon: GitCommit, desc: 'Hierarchia StepID' },
    { id: 'bom', label: '3. Materiały BOM', icon: Box, desc: 'Części i pojemniki KLT' },
    { id: 'yamazumi', label: '4. Balans Yamazumi', icon: BarChart3, desc: 'Obciążenie stacji' },
    { id: 'viewport3d', label: '5. Hala 3D & Symulacja', icon: Eye, desc: 'Wirtualna fabryka' },
    { id: 'cad2d', label: '6. Rzut 2D CAD', icon: Compass, desc: 'Wymiarowanie 2D' },
  ];

  return (
    <nav className="h-14 border-b border-slate-800/80 bg-slate-950/70 backdrop-blur px-6 flex items-center space-x-2 shrink-0 z-20 overflow-x-auto">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
              isActive
                ? 'bg-blue-600/20 text-blue-400 border border-blue-500/40 shadow-sm shadow-blue-500/10'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40 border border-transparent'
            }`}
          >
            <Icon className={`w-4 h-4 ${isActive ? 'text-blue-400' : 'text-slate-500'}`} />
            <span>{tab.label}</span>
          </button>
        );
      })}
    </nav>
  );
};
