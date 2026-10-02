import React, { useEffect, useRef, useState } from 'react';
import { ProjectData } from '../../core/models/types';
import { Compass, ZoomIn, ZoomOut, Download, Maximize2, Layers } from 'lucide-react';
import { exportToDxf } from '../../core/export/dxfExporter';

interface Cad2DViewProps {
  project: ProjectData;
}

export const Cad2DView: React.FC<Cad2DViewProps> = ({ project }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [scale, setScale] = useState(0.035); // pixels per mm
  const [offset, setOffset] = useState({ x: 80, y: 80 });
  const [isPanning, setIsPanning] = useState(false);
  const [startPan, setStartPan] = useState({ x: 0, y: 0 });

  const facility = project.facility;
  const objects = project.layoutObjects;
  const obstacles = project.obstacles;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Resize canvas
    canvas.width = canvas.parentElement?.clientWidth || 1000;
    canvas.height = canvas.parentElement?.clientHeight || 600;

    // Clear background
    ctx.fillStyle = '#0a0e17';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw Grid (1000mm = 1m grid)
    const gridSizePx = 1000 * scale;
    ctx.strokeStyle = '#172033';
    ctx.lineWidth = 1;

    for (let x = offset.x % gridSizePx; x < canvas.width; x += gridSizePx) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvas.height);
      ctx.stroke();
    }

    for (let y = offset.y % gridSizePx; y < canvas.height; y += gridSizePx) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvas.width, y);
      ctx.stroke();
    }

    // Draw Facility Outer Walls
    const fw = facility.widthMm * scale;
    const fl = facility.lengthMm * scale;
    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 2.5;
    ctx.strokeRect(offset.x, offset.y, fw, fl);

    // Draw Obstacles (Columns)
    obstacles.forEach((obs) => {
      const ox = offset.x + obs.xMm * scale;
      const oy = offset.y + obs.yMm * scale;
      const ow = obs.widthMm * scale;
      const ol = obs.lengthMm * scale;

      ctx.fillStyle = '#dc2626';
      ctx.fillRect(ox, oy, ow, ol);
      ctx.strokeStyle = '#f87171';
      ctx.strokeRect(ox, oy, ow, ol);

      ctx.fillStyle = '#ffffff';
      ctx.font = '10px Inter';
      ctx.fillText(obs.name, ox + ow + 5, oy + ol / 2);
    });

    // Draw Layout Objects
    objects.forEach((obj) => {
      const ox = offset.x + obj.xMm * scale;
      const oy = offset.y + obj.yMm * scale;
      const ow = obj.widthMm * scale;
      const ol = obj.lengthMm * scale;

      ctx.fillStyle = obj.colorHex || '#3b82f6';
      ctx.fillRect(ox, oy, ow, ol);

      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1;
      ctx.strokeRect(ox, oy, ow, ol);

      // Object label & dimensions
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 11px Inter';
      ctx.fillText(obj.name.split('(')[0], ox + 4, oy + 14);

      ctx.fillStyle = '#94a3b8';
      ctx.font = '10px JetBrains Mono';
      ctx.fillText(`${obj.widthMm}x${obj.lengthMm}mm`, ox + 4, oy + ol - 6);
    });

    // Draw Dimension Lines for Facility
    ctx.strokeStyle = '#64748b';
    ctx.fillStyle = '#94a3b8';
    ctx.font = '11px JetBrains Mono';
    ctx.fillText(`↔ Szerokość: ${facility.widthMm / 1000} m (${facility.widthMm} mm)`, offset.x + fw / 2 - 80, offset.y - 12);
    ctx.fillText(`↕ Długość: ${facility.lengthMm / 1000} m (${facility.lengthMm} mm)`, offset.x - 14, offset.y + fl / 2);
  }, [project, scale, offset]);

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsPanning(true);
    setStartPan({ x: e.clientX - offset.x, y: e.clientY - offset.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isPanning) return;
    setOffset({ x: e.clientX - startPan.x, y: e.clientY - startPan.y });
  };

  const handleMouseUp = () => {
    setIsPanning(false);
  };

  const handleExportDxf = () => {
    const dxfContent = exportToDxf(facility, objects, project.name);
    const dataStr = 'data:application/dxf;charset=utf-8,' + encodeURIComponent(dxfContent);
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `${project.name.replace(/\s+/g, '_')}_CAD2D.dxf`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className="relative w-full h-[calc(100vh-8rem)] bg-slate-950 overflow-hidden">
      {/* 2D CAD Canvas */}
      <canvas
        ref={canvasRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        className="w-full h-full cursor-crosshair"
      />

      {/* Floating Toolbar */}
      <div className="absolute top-6 left-6 flex items-center space-x-2 bg-slate-900/90 backdrop-blur border border-slate-700/80 p-2 rounded-2xl shadow-2xl">
        <button
          onClick={() => setScale((s) => Math.min(0.09, s * 1.25))}
          className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl transition"
          title="Przybliż"
        >
          <ZoomIn className="w-4 h-4" />
        </button>

        <button
          onClick={() => setScale((s) => Math.max(0.01, s * 0.8))}
          className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl transition"
          title="Oddal"
        >
          <ZoomOut className="w-4 h-4" />
        </button>

        <button
          onClick={() => {
            setScale(0.035);
            setOffset({ x: 80, y: 80 });
          }}
          className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl transition"
          title="Resetuj widok"
        >
          <Maximize2 className="w-4 h-4" />
        </button>

        <div className="h-5 w-px bg-slate-700 mx-1" />

        <button
          onClick={handleExportDxf}
          className="flex items-center space-x-1.5 bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-lg shadow-emerald-500/20 transition"
        >
          <Download className="w-4 h-4" />
          <span>Eksportuj DXF CAD</span>
        </button>
      </div>

      {/* Bottom Hint */}
      <div className="absolute bottom-4 left-6 text-xs text-slate-400 bg-slate-900/80 px-3.5 py-1.5 rounded-lg border border-slate-800 pointer-events-none">
        📐 Rzut CAD 2D: Skala {(scale * 1000).toFixed(1)} px/metr • Przeciągnij myszą, aby przesuwać rzut
      </div>
    </div>
  );
};
