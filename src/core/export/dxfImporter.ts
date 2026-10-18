import { FacilityConfig, LayoutObject, Obstacle } from '../models/types';

export type DxfUnit = 'mm' | 'cm' | 'm' | 'in' | 'ft';
export type DxfUnitSelection = 'auto' | DxfUnit;
export type DxfImportScope = 'facility-and-obstacles' | 'obstacles-only' | 'full-cad';

export interface DxfSkippedGroup {
  type: string;
  layer: string;
  reason: string;
  count: number;
}

export interface DxfImportOptions {
  unitSelection?: DxfUnitSelection;
  fallbackUnit?: DxfUnit;
  replaceObstacles?: boolean;
}

export interface DxfImportReport {
  detectedInsunitsCode: number | null;
  detectedUnit: DxfUnit | null;
  effectiveUnit: DxfUnit;
  mmPerUnit: number;
  requiresUnitConfirmation: boolean;
  unitSummary: string;
  unitWarning?: string;
  importedFacility?: {
    widthMm: number;
    lengthMm: number;
    layer: string;
    label?: string;
  };
  importedObstacles: Obstacle[];
  importedVisualObjects: LayoutObject[];
  supportedCounts: Record<string, number>;
  skippedEntities: DxfSkippedGroup[];
  totalSupportedCount: number;
  totalSkippedCount: number;
  warnings: string[];
}

export const DXF_UNITS: readonly { value: DxfUnit; label: string; mmPerUnit: number }[] = [
  { value: 'mm', label: 'Milimetry (mm, ×1)', mmPerUnit: 1 },
  { value: 'cm', label: 'Centymetry (cm, ×10 mm)', mmPerUnit: 10 },
  { value: 'm', label: 'Metry (m, ×1000 mm)', mmPerUnit: 1000 },
  { value: 'in', label: 'Cale (in, ×25,4 mm)', mmPerUnit: 25.4 },
  { value: 'ft', label: 'Stopy (ft, ×304,8 mm)', mmPerUnit: 304.8 },
];

const INSUNITS_TO_UNIT: Record<number, DxfUnit> = {
  1: 'in',
  2: 'ft',
  4: 'mm',
  5: 'cm',
  6: 'm',
};

const SUPPORTED_ENTITY_DESCRIPTION =
  'Obsługiwany podzbiór DXF (5.8): zamknięte obrysy LWPOLYLINE/POLYLINE (prostokąty i wielokąty 2D), CIRCLE (słupy kołowe), osiowe odcinki LINE na warstwach hali/ścian oraz etykiety TEXT/MTEXT.';

const UNSUPPORTED_REASONS: Record<string, string> = {
  INSERT: 'Referencje bloków (INSERT) wymagają rozbicia (EXPLODE) w programie CAD przed importem.',
  SPLINE: 'Krzywe SPLINE nie są obsługiwane w siatce kolizji 2D — zamień na polilinię.',
  ARC: 'Otwarte łuki (ARC) nie tworzą zamkniętego obrysu przeszkody lub hali.',
  ELLIPSE: 'Elipsy (ELLIPSE) nie są obsługiwane — zamień na zamkniętą polilinię.',
  HATCH: 'Kreskowania (HATCH) są pomijane jako warstwa dekoracyjna.',
  DIMENSION: 'Wymiary CAD (DIMENSION) są pomijane — użyj wymiarowania w edytorze hali.',
  LEADER: 'Linie odniesienia (LEADER/MLEADER) są pomijane.',
  MLEADER: 'Linie odniesienia (LEADER/MLEADER) są pomijane.',
  SOLID: 'Wypełnienia SOLID/3DFACE nie są obsługiwane.',
  '3DFACE': 'Siatki 3DFACE/MESH nie są obsługiwane w rzucie 2D.',
  MESH: 'Siatki 3DFACE/MESH nie są obsługiwane w rzucie 2D.',
  POINT: 'Punkty konstrukcyjne (POINT) są pomijane.',
  VIEWPORT: 'Rzutnie arkusza (VIEWPORT) są pomijane.',
  ATTDEF: 'Definicje atrybutów bloków (ATTDEF/ATTRIB) są pomijane.',
  ATTRIB: 'Definicje atrybutów bloków (ATTDEF/ATTRIB) są pomijane.',
};

interface DxfPair {
  code: number;
  value: string;
}

function toPairs(text: string): DxfPair[] {
  const rawLines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
  const pairs: DxfPair[] = [];
  for (let i = 0; i + 1 < rawLines.length; i += 2) {
    const codeStr = rawLines[i].trim();
    if (!codeStr) continue;
    const code = Number.parseInt(codeStr, 10);
    if (Number.isNaN(code)) throw new Error(`Nieprawidłowy kod grupy DXF w linii ${i + 1}: "${codeStr}"`);
    pairs.push({ code, value: rawLines[i + 1].trim() });
  }
  if (!pairs.length) throw new Error('Pusty lub nieprawidłowy plik DXF.');
  return pairs;
}

function classifyLayerRole(layerRaw: string): 'facility' | 'obstacle' | 'equipment' | 'logistics' | 'operators' | 'unknown' {
  const u = layerRaw.trim().toUpperCase();
  if (['FACILITY', 'HALA', 'HALL', 'BUDYNEK', 'BOUNDARY', 'OBRYS_HALI', 'WALL_OUTER'].includes(u)) return 'facility';
  if (['OBSTACLES', 'OBSTACLE', 'PRZESZKODY', 'PRZESZKODA', 'COLUMNS', 'COLUMN', 'SLUPY', 'SŁUPY', 'WALLS', 'SCIANY', 'ŚCIANY', 'FILARY'].includes(u)) return 'obstacle';
  if (['LOGISTICS', 'FIFO', 'BUFORY', 'BUFFERS'].includes(u)) return 'logistics';
  if (['OPERATORS', 'OPERATOR', 'MATY'].includes(u)) return 'operators';
  if (['EQUIPMENT', 'WYPOSAZENIE', 'WYPOSAŻENIE', 'STANOWISKA', 'TABLES'].includes(u)) return 'equipment';
  return 'unknown';
}

function cleanDxfText(raw: string): string {
  return raw
    .replace(/\\P/g, ' ')
    .replace(/\\[A-Za-z][^;]*;/g, '')
    .replace(/[{}]/g, '')
    .replace(/\s+\d+x\d+\s*mm$/i, '')
    .trim();
}

interface RawBoxEntity {
  kind: 'poly' | 'circle' | 'line';
  layer: string;
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  rotationDeg: number;
}

interface RawTextEntity {
  layer: string;
  x: number;
  y: number;
  text: string;
}

export function parseDxfImport(text: string, options: DxfImportOptions = {}): DxfImportReport {
  const pairs = toPairs(text);
  let detectedInsunitsCode: number | null = null;
  let section = '';

  const supportedCounts: Record<string, number> = {};
  const skippedMap = new Map<string, DxfSkippedGroup>();
  const warnings: string[] = [];

  const addSkipped = (type: string, layer: string, reason: string) => {
    const cleanLayer = layer || '0';
    const key = `${type}||${cleanLayer}||${reason}`;
    const existing = skippedMap.get(key);
    if (existing) existing.count += 1;
    else skippedMap.set(key, { type, layer: cleanLayer, reason, count: 1 });
  };

  const incSupported = (type: string) => {
    supportedCounts[type] = (supportedCounts[type] ?? 0) + 1;
  };

  const rawBoxes: RawBoxEntity[] = [];
  const rawTexts: RawTextEntity[] = [];

  // 1. Scan HEADER and ENTITIES sections
  let i = 0;
  while (i < pairs.length) {
    const p = pairs[i];
    if (p.code === 0 && p.value === 'SECTION') {
      const next = pairs[i + 1];
      section = next && next.code === 2 ? next.value.toUpperCase() : '';
      i += 2;
      continue;
    }
    if (p.code === 0 && p.value === 'ENDSEC') {
      section = '';
      i += 1;
      continue;
    }
    if (section === 'HEADER') {
      if (p.code === 9 && p.value === '$INSUNITS') {
        for (let j = i + 1; j < Math.min(i + 6, pairs.length); j++) {
          if (pairs[j].code === 9 || pairs[j].code === 0) break;
          if (pairs[j].code === 70) {
            const codeVal = Number.parseInt(pairs[j].value, 10);
            if (Number.isFinite(codeVal)) detectedInsunitsCode = codeVal;
            break;
          }
        }
      }
      i += 1;
      continue;
    }
    if (section !== 'ENTITIES') {
      i += 1;
      continue;
    }

    if (p.code !== 0) {
      i += 1;
      continue;
    }

    const entityType = p.value.toUpperCase();
    if (entityType === 'EOF') break;

    // Collect pairs belonging to this entity until next code === 0
    const entityPairs: DxfPair[] = [];
    i += 1;
    while (i < pairs.length && pairs[i].code !== 0) {
      entityPairs.push(pairs[i]);
      i += 1;
    }

    const layer = entityPairs.find(ep => ep.code === 8)?.value || '0';

    if (entityType === 'LWPOLYLINE') {
      const pts: { x: number; y: number }[] = [];
      let curX: number | null = null;
      let hasBulge = false;
      for (const ep of entityPairs) {
        if (ep.code === 10) {
          curX = Number.parseFloat(ep.value);
        } else if (ep.code === 20 && curX !== null) {
          const curY = Number.parseFloat(ep.value);
          if (Number.isFinite(curX) && Number.isFinite(curY)) pts.push({ x: curX, y: curY });
          curX = null;
        } else if (ep.code === 42 && Math.abs(Number.parseFloat(ep.value) || 0) > 1e-4) {
          hasBulge = true;
        }
      }
      if (hasBulge) {
        addSkipped('LWPOLYLINE (łuk/bulge)', layer, 'Pominięto krzywiznę łuku polilinii — użyto cięciwy wierzchołków.');
      }
      if (pts.length < 3) {
        addSkipped('LWPOLYLINE', layer, 'Polilinia ma mniej niż 3 wierzchołki (brak zamkniętego obrysu 2D).');
        continue;
      }
      const xs = pts.map(pt => pt.x);
      const ys = pts.map(pt => pt.y);
      const minX = Math.min(...xs), maxX = Math.max(...xs);
      const minY = Math.min(...ys), maxY = Math.max(...ys);
      if (maxX - minX < 1e-6 || maxY - minY < 1e-6) {
        addSkipped('LWPOLYLINE', layer, 'Zdegenerowana polilinia o zerowej szerokości lub głębokości.');
        continue;
      }
      rawBoxes.push({ kind: 'poly', layer, minX, maxX, minY, maxY, rotationDeg: 0 });
      incSupported('LWPOLYLINE');
      continue;
    }

    if (entityType === 'POLYLINE') {
      const flag70 = Number.parseInt(entityPairs.find(ep => ep.code === 70)?.value ?? '0', 10) || 0;
      const isMesh = (flag70 & 16) !== 0 || (flag70 & 64) !== 0;
      const pts: { x: number; y: number }[] = [];
      while (i < pairs.length) {
        const sub = pairs[i];
        if (sub.code === 0 && sub.value.toUpperCase() === 'SEQEND') {
          i += 1;
          while (i < pairs.length && pairs[i].code !== 0) i += 1;
          break;
        }
        if (sub.code === 0 && sub.value.toUpperCase() === 'VERTEX') {
          i += 1;
          let vx: number | null = null, vy: number | null = null;
          while (i < pairs.length && pairs[i].code !== 0) {
            if (pairs[i].code === 10) vx = Number.parseFloat(pairs[i].value);
            if (pairs[i].code === 20) vy = Number.parseFloat(pairs[i].value);
            i += 1;
          }
          if (vx !== null && vy !== null && Number.isFinite(vx) && Number.isFinite(vy)) {
            pts.push({ x: vx, y: vy });
          }
          continue;
        }
        break;
      }
      if (isMesh) {
        addSkipped('POLYLINE (siatka 3D)', layer, 'Siatki 3D / Polyface Mesh nie są obsługiwane w rzucie 2D.');
        continue;
      }
      if (pts.length < 3) {
        addSkipped('POLYLINE', layer, 'Polilinia ma mniej niż 3 wierzchołki.');
        continue;
      }
      const xs = pts.map(pt => pt.x), ys = pts.map(pt => pt.y);
      const minX = Math.min(...xs), maxX = Math.max(...xs);
      const minY = Math.min(...ys), maxY = Math.max(...ys);
      if (maxX - minX < 1e-6 || maxY - minY < 1e-6) {
        addSkipped('POLYLINE', layer, 'Zdegenerowana polilinia o zerowym obrysie.');
        continue;
      }
      rawBoxes.push({ kind: 'poly', layer, minX, maxX, minY, maxY, rotationDeg: 0 });
      incSupported('POLYLINE');
      continue;
    }

    if (entityType === 'CIRCLE') {
      const cx = Number.parseFloat(entityPairs.find(ep => ep.code === 10)?.value ?? '');
      const cy = Number.parseFloat(entityPairs.find(ep => ep.code === 20)?.value ?? '');
      const r = Number.parseFloat(entityPairs.find(ep => ep.code === 40)?.value ?? '');
      if (!Number.isFinite(cx) || !Number.isFinite(cy) || !Number.isFinite(r) || r <= 0) {
        addSkipped('CIRCLE', layer, 'Okrąg o niepoprawnym środku lub promieniu <= 0.');
        continue;
      }
      rawBoxes.push({ kind: 'circle', layer, minX: cx - r, maxX: cx + r, minY: cy - r, maxY: cy + r, rotationDeg: 0 });
      incSupported('CIRCLE');
      continue;
    }

    if (entityType === 'LINE') {
      const x1 = Number.parseFloat(entityPairs.find(ep => ep.code === 10)?.value ?? '');
      const y1 = Number.parseFloat(entityPairs.find(ep => ep.code === 20)?.value ?? '');
      const x2 = Number.parseFloat(entityPairs.find(ep => ep.code === 11)?.value ?? '');
      const y2 = Number.parseFloat(entityPairs.find(ep => ep.code === 21)?.value ?? '');
      const role = classifyLayerRole(layer);
      if (!Number.isFinite(x1) || !Number.isFinite(y1) || !Number.isFinite(x2) || !Number.isFinite(y2) || Math.hypot(x2 - x1, y2 - y1) < 1e-6) {
        addSkipped('LINE', layer, 'Zerowy lub niepoprawny odcinek LINE.');
        continue;
      }
      const isAxisAligned = Math.abs(x2 - x1) < 1e-4 || Math.abs(y2 - y1) < 1e-4;
      if ((role === 'facility' || role === 'obstacle') && isAxisAligned) {
        rawBoxes.push({
          kind: 'line',
          layer,
          minX: Math.min(x1, x2),
          maxX: Math.max(x1, x2),
          minY: Math.min(y1, y2),
          maxY: Math.max(y1, y2),
          rotationDeg: 0,
        });
        incSupported('LINE');
      } else {
        addSkipped('LINE', layer, 'Pojedynczy odcinek LINE poza obrysem osiowym hali/przeszkód — wymagana zamknięta polilinia LWPOLYLINE.');
      }
      continue;
    }

    if (entityType === 'TEXT' || entityType === 'MTEXT') {
      const tx = Number.parseFloat(entityPairs.find(ep => ep.code === 10)?.value ?? '');
      const ty = Number.parseFloat(entityPairs.find(ep => ep.code === 20)?.value ?? '');
      const str = cleanDxfText(entityPairs.filter(ep => ep.code === 1 || ep.code === 3).map(ep => ep.value).join(''));
      if (Number.isFinite(tx) && Number.isFinite(ty) && str) {
        rawTexts.push({ layer, x: tx, y: ty, text: str });
        incSupported(entityType);
      } else {
        addSkipped(entityType, layer, 'Pusta lub niepoprawna etykieta tekstowa.');
      }
      continue;
    }

    const reason = UNSUPPORTED_REASONS[entityType] ?? `Nieobsługiwany typ encji CAD (${entityType}). ${SUPPORTED_ENTITY_DESCRIPTION}`;
    addSkipped(entityType, layer, reason);
  }

  // 2. Resolve units
  const detectedUnit: DxfUnit | null = detectedInsunitsCode !== null ? (INSUNITS_TO_UNIT[detectedInsunitsCode] ?? null) : null;
  const selection = options.unitSelection ?? 'auto';
  const fallbackUnit = options.fallbackUnit ?? 'mm';
  let effectiveUnit: DxfUnit;
  let requiresUnitConfirmation = false;
  let unitSummary = '';
  let unitWarning: string | undefined;

  if (selection === 'auto') {
    if (detectedUnit) {
      effectiveUnit = detectedUnit;
      const meta = DXF_UNITS.find(u => u.value === detectedUnit)!;
      unitSummary = `Wykryto z nagłówka $INSUNITS=${detectedInsunitsCode}: ${meta.label}`;
    } else {
      effectiveUnit = fallbackUnit;
      requiresUnitConfirmation = true;
      const codeDesc = detectedInsunitsCode === null ? 'brak zmiennej $INSUNITS' : `$INSUNITS=${detectedInsunitsCode} (bezjednostkowy / nieznany)`;
      unitSummary = `Nieokreślona jednostka w pliku (${codeDesc}) — użyto domyślnej: ${effectiveUnit}`;
      unitWarning = `Plik DXF nie deklaruje jednoznacznej jednostki miary (${codeDesc}). Sprawdź wymiary i jawnie wybierz jednostkę pliku (mm, cm, m, in, ft).`;
      warnings.push(unitWarning);
    }
  } else {
    effectiveUnit = selection;
    const meta = DXF_UNITS.find(u => u.value === effectiveUnit)!;
    if (detectedUnit && detectedUnit !== effectiveUnit) {
      unitSummary = `Wymuszono jednostkę: ${meta.label} (w nagłówku pliku było $INSUNITS=${detectedInsunitsCode}: ${detectedUnit})`;
      unitWarning = `Wybrana jednostka (${effectiveUnit}) różni się od jednostki zadeklarowanej w nagłówku DXF (${detectedUnit}, $INSUNITS=${detectedInsunitsCode}).`;
      warnings.push(unitWarning);
    } else {
      unitSummary = `Wybrana jednostka: ${meta.label}${detectedUnit ? ` (zgodna z $INSUNITS=${detectedInsunitsCode})` : ''}`;
    }
  }

  const mmPerUnit = DXF_UNITS.find(u => u.value === effectiveUnit)!.mmPerUnit;

  // 3. Convert coordinates to mm and handle Y-axis orientation
  // Note: exportToDxf writes Y coordinates as -yMm (all Y <= 0).
  const allNonPositiveY = rawBoxes.length > 0 && rawBoxes.every(b => b.maxY <= 1e-4);
  const convertBox = (b: RawBoxEntity) => {
    const x1 = b.minX * mmPerUnit;
    const x2 = b.maxX * mmPerUnit;
    const y1 = allNonPositiveY ? -b.maxY * mmPerUnit : b.minY * mmPerUnit;
    const y2 = allNonPositiveY ? -b.minY * mmPerUnit : b.maxY * mmPerUnit;
    return {
      kind: b.kind,
      layer: b.layer,
      xMm: Math.round(Math.min(x1, x2)),
      yMm: Math.round(Math.min(y1, y2)),
      widthMm: Math.round(Math.abs(x2 - x1)),
      lengthMm: Math.round(Math.abs(y2 - y1)),
    };
  };

  const convertedTexts = rawTexts.map(t => ({
    layer: t.layer,
    xMm: Math.round(t.x * mmPerUnit),
    yMm: Math.round((allNonPositiveY ? -t.y : t.y) * mmPerUnit),
    text: t.text,
  }));

  const findMatchingLabel = (layer: string, xMm: number, yMm: number, widthMm: number, lengthMm: number): string | undefined => {
    let best: { text: string; dist: number } | undefined;
    for (const t of convertedTexts) {
      if (t.layer.toUpperCase() !== layer.toUpperCase()) continue;
      const distCorner = Math.hypot(t.xMm - xMm, t.yMm - yMm);
      const distCenter = Math.hypot(t.xMm - (xMm + widthMm / 2), t.yMm - (yMm + lengthMm / 2));
      const d = Math.min(distCorner, distCenter);
      if (d <= Math.max(600, Math.min(widthMm, lengthMm)) && (!best || d < best.dist)) {
        best = { text: t.text, dist: d };
      }
    }
    return best?.text;
  };

  const scaledBoxes = rawBoxes.map(convertBox);

  // Separate facility candidates vs obstacle/equipment boxes
  const facilityBoxes = scaledBoxes.filter(b => classifyLayerRole(b.layer) === 'facility');
  let importedFacility: DxfImportReport['importedFacility'];
  let originShiftX = 0;
  let originShiftY = 0;

  if (facilityBoxes.length > 0) {
    const fMinX = Math.min(...facilityBoxes.map(b => b.xMm));
    const fMinY = Math.min(...facilityBoxes.map(b => b.yMm));
    const fMaxX = Math.max(...facilityBoxes.map(b => b.xMm + b.widthMm));
    const fMaxY = Math.max(...facilityBoxes.map(b => b.yMm + b.lengthMm));
    const wMm = fMaxX - fMinX;
    const lMm = fMaxY - fMinY;
    if (wMm >= 100 && lMm >= 100) {
      originShiftX = fMinX;
      originShiftY = fMinY;
      const label = findMatchingLabel(facilityBoxes[0].layer, fMinX, fMinY, wMm, lMm);
      importedFacility = {
        widthMm: Math.min(500000, wMm),
        lengthMm: Math.min(500000, lMm),
        layer: facilityBoxes[0].layer,
        label,
      };
    } else {
      addSkipped('LWPOLYLINE/LINE', facilityBoxes[0].layer, 'Obrys hali na warstwie FACILITY jest mniejszy niż minimalne 100 × 100 mm.');
    }
  } else if (scaledBoxes.length > 0) {
    // Check if any coordinates are negative; if so, shift minimum to 0
    const minX = Math.min(...scaledBoxes.map(b => b.xMm));
    const minY = Math.min(...scaledBoxes.map(b => b.yMm));
    if (minX < 0) originShiftX = minX;
    if (minY < 0) originShiftY = minY;
  }

  const importedObstacles: Obstacle[] = [];
  const importedVisualObjects: LayoutObject[] = [];
  let obsSeq = 0;
  let eqSeq = 0;

  for (const b of scaledBoxes) {
    const role = classifyLayerRole(b.layer);
    if (role === 'facility') continue;

    let wMm = b.widthMm;
    let lMm = b.lengthMm;
    if (b.kind === 'line') {
      // Axis-aligned wall line on obstacle layer gets a nominal 200 mm wall thickness
      if (wMm < 1) wMm = 200;
      if (lMm < 1) lMm = 200;
    }
    if (wMm < 1 || lMm < 1) {
      addSkipped(b.kind.toUpperCase(), b.layer, 'Obiekt po przeskalowaniu do mm ma wymiar < 1 mm.');
      continue;
    }

    const xMm = Math.max(0, b.xMm - originShiftX);
    const yMm = Math.max(0, b.yMm - originShiftY);
    const matchedLabel = findMatchingLabel(b.layer, b.xMm, b.yMm, b.widthMm, b.lengthMm);

    if (role === 'equipment' || role === 'logistics' || role === 'operators') {
      eqSeq += 1;
      const type = role === 'logistics' ? 'FlowRackFIFO3Tier' : role === 'operators' ? 'OperatorErgoMat' : 'QualityGate';
      const colorHex = role === 'logistics' ? '#f97316' : role === 'operators' ? '#22c55e' : '#3b82f6';
      importedVisualObjects.push({
        id: `DXF-EQ-${eqSeq}`,
        name: matchedLabel || `Obiekt DXF ${eqSeq} (${b.layer})`,
        type,
        xMm,
        yMm,
        zMm: 0,
        widthMm: Math.min(500000, wMm),
        lengthMm: Math.min(500000, lMm),
        heightMm: role === 'operators' ? 20 : 1200,
        rotationDeg: 0,
        colorHex,
      });
    } else {
      obsSeq += 1;
      importedObstacles.push({
        id: `DXF-OBS-${obsSeq}`,
        name: matchedLabel || (b.kind === 'circle' ? `Słup DXF ${obsSeq} (${b.layer})` : `Przeszkoda DXF ${obsSeq} (${b.layer})`),
        xMm,
        yMm,
        widthMm: Math.min(500000, wMm),
        lengthMm: Math.min(500000, lMm),
        heightMm: 3000,
      });
    }
  }

  const skippedEntities = [...skippedMap.values()];
  const totalSupportedCount = Object.values(supportedCounts).reduce((a, b) => a + b, 0);
  const totalSkippedCount = skippedEntities.reduce((a, b) => a + b.count, 0);

  if (!importedFacility && !importedObstacles.length && !importedVisualObjects.length) {
    warnings.push(`Nie znaleziono obsługiwanej geometrii obrysów 2D w sekcji ENTITIES. ${SUPPORTED_ENTITY_DESCRIPTION}`);
  }

  return {
    detectedInsunitsCode,
    detectedUnit,
    effectiveUnit,
    mmPerUnit,
    requiresUnitConfirmation,
    unitSummary,
    unitWarning,
    importedFacility,
    importedObstacles,
    importedVisualObjects,
    supportedCounts,
    skippedEntities,
    totalSupportedCount,
    totalSkippedCount,
    warnings,
  };
}

export function applyDxfImportToProject(
  facility: FacilityConfig,
  existingObstacles: Obstacle[],
  existingObjects: LayoutObject[],
  report: DxfImportReport,
  scope: DxfImportScope,
  replaceObstacles = false,
): { facility: FacilityConfig; obstacles: Obstacle[]; layoutObjects: LayoutObject[] } {
  const nextObstacles = replaceObstacles
    ? [...report.importedObstacles]
    : [...existingObstacles, ...report.importedObstacles.map((o, idx) => ({ ...o, id: `DXF-OBS-${existingObstacles.length + idx + 1}` }))];

  const nextObjects =
    scope === 'full-cad'
      ? [
          ...existingObjects,
          ...report.importedVisualObjects.map((o, idx) => ({
            ...o,
            id: `DXF-EQ-${existingObjects.length + idx + 1}`,
          })),
        ]
      : existingObjects;

  let nextWidthMm = facility.widthMm;
  let nextLengthMm = facility.lengthMm;

  if (scope !== 'obstacles-only' && report.importedFacility) {
    nextWidthMm = report.importedFacility.widthMm;
    nextLengthMm = report.importedFacility.lengthMm;
  }

  // Ensure facility bounds enclose all obstacles so validateProject never fails on out-of-bounds obstacle
  for (const o of nextObstacles) {
    if (o.xMm + o.widthMm > nextWidthMm) nextWidthMm = Math.min(500000, o.xMm + o.widthMm);
    if (o.yMm + o.lengthMm > nextLengthMm) nextLengthMm = Math.min(500000, o.yMm + o.lengthMm);
  }

  return {
    facility: {
      ...facility,
      widthMm: nextWidthMm,
      lengthMm: nextLengthMm,
    },
    obstacles: nextObstacles,
    layoutObjects: nextObjects,
  };
}
