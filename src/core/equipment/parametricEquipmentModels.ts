/**
 * Parametric 3D Equipment Models (Plan Rozwoju ID 6.2)
 *
 * Implements procedural, parametric 3D visual models for industrial factory line equipment:
 * - Workbenches & Assembly Tables (Table, TableESD, TestStationBench)
 * - Racks & Flow Racks (FlowRackFIFO3Tier, ShelvingUnitBulk)
 * - Pallets & Floor Storage (PalletEuroFloorMark, PalletEuroStack)
 * - Containers & KLT Boxes (KltBoxStack, MaterialIn, FinishedGoods)
 * - Transport Carts & Mobile Robots (CartTuggerPlatform, AGVMiniLifter)
 * - Conveyors (ConveyorRollerSegment)
 * - Ergonomics & Signage (OperatorErgoMat, AndonBoard)
 *
 * Adheres to:
 * - Rule 6 / Plan 6.4: Visual representation is completely decoupled from technological simulation truth.
 * - Plan 6.1 Standard: Scale (1 Three.js unit = 1 m = 1000 mm), floor contact at Z=0, front-facing orientation.
 * - Clean disposal to prevent WebGL GPU memory leaks.
 */

import * as THREE from 'three';
import { LayoutObject, ObjectType } from '../models/types';
import {
  DEFAULT_EQUIPMENT_SPECS,
  EquipmentStandardSpec,
  EquipmentServiceZone,
  EquipmentTransportPort,
  MM_TO_M,
  mmToWorld,
} from './equipmentStandard';

export interface ParametricModelOptions {
  /** If true, renders the operator service zone footprint in 3D. */
  showServiceZone?: boolean;
  /** If true, renders the 3D collision clearance envelope. */
  showCollisionEnvelope?: boolean;
  /** If true, renders material transport docking ports with direction markers. */
  showTransportPorts?: boolean;
  /** If true, renders wireframe models instead of solid PBR meshes (useful for performance / debug). */
  wireframe?: boolean;
  /** Custom base color override (hex string, e.g. '#2563eb'). */
  colorHex?: string;
}

// ============================================================================
// SHARED MATERIALS CACHE (Performance Optimization)
// ============================================================================

interface MaterialPalette {
  steelDark: THREE.MeshStandardMaterial;
  steelGalvanized: THREE.MeshStandardMaterial;
  steelChrome: THREE.MeshStandardMaterial;
  aluminumProfile: THREE.MeshStandardMaterial;
  woodPine: THREE.MeshStandardMaterial;
  woodDark: THREE.MeshStandardMaterial;
  rubberBlack: THREE.MeshStandardMaterial;
  polypropyleneBlue: THREE.MeshStandardMaterial;
  polypropyleneRed: THREE.MeshStandardMaterial;
  polypropyleneGrey: THREE.MeshStandardMaterial;
  polypropyleneAmber: THREE.MeshStandardMaterial;
  safetyYellow: THREE.MeshStandardMaterial;
  safetyGreen: THREE.MeshStandardMaterial;
  safetyRed: THREE.MeshStandardMaterial;
  safetyCyan: THREE.MeshStandardMaterial;
  esdMat: THREE.MeshStandardMaterial;
}

let sharedPalette: MaterialPalette | null = null;

function getMaterialPalette(wireframe = false): MaterialPalette {
  if (sharedPalette && sharedPalette.steelDark.wireframe === wireframe) {
    return sharedPalette;
  }

  sharedPalette = {
    steelDark: new THREE.MeshStandardMaterial({
      color: 0x334155,
      metalness: 0.8,
      roughness: 0.35,
      wireframe,
    }),
    steelGalvanized: new THREE.MeshStandardMaterial({
      color: 0x94a3b8,
      metalness: 0.85,
      roughness: 0.25,
      wireframe,
    }),
    steelChrome: new THREE.MeshStandardMaterial({
      color: 0xcfd8dc,
      metalness: 0.95,
      roughness: 0.15,
      wireframe,
    }),
    aluminumProfile: new THREE.MeshStandardMaterial({
      color: 0xa0aec0,
      metalness: 0.75,
      roughness: 0.4,
      wireframe,
    }),
    woodPine: new THREE.MeshStandardMaterial({
      color: 0xc89f68,
      roughness: 0.8,
      metalness: 0.05,
      wireframe,
    }),
    woodDark: new THREE.MeshStandardMaterial({
      color: 0x8b5a2b,
      roughness: 0.85,
      metalness: 0.05,
      wireframe,
    }),
    rubberBlack: new THREE.MeshStandardMaterial({
      color: 0x1f2937,
      roughness: 0.9,
      metalness: 0.1,
      wireframe,
    }),
    polypropyleneBlue: new THREE.MeshStandardMaterial({
      color: 0x2563eb,
      roughness: 0.45,
      metalness: 0.15,
      wireframe,
    }),
    polypropyleneRed: new THREE.MeshStandardMaterial({
      color: 0xdc2626,
      roughness: 0.45,
      metalness: 0.15,
      wireframe,
    }),
    polypropyleneGrey: new THREE.MeshStandardMaterial({
      color: 0x64748b,
      roughness: 0.5,
      metalness: 0.2,
      wireframe,
    }),
    polypropyleneAmber: new THREE.MeshStandardMaterial({
      color: 0xd97706,
      roughness: 0.45,
      metalness: 0.15,
      wireframe,
    }),
    safetyYellow: new THREE.MeshStandardMaterial({
      color: 0xfacc15,
      roughness: 0.4,
      metalness: 0.1,
      wireframe,
    }),
    safetyGreen: new THREE.MeshStandardMaterial({
      color: 0x16a34a,
      roughness: 0.4,
      metalness: 0.1,
      wireframe,
    }),
    safetyRed: new THREE.MeshStandardMaterial({
      color: 0xef4444,
      roughness: 0.4,
      metalness: 0.1,
      wireframe,
    }),
    safetyCyan: new THREE.MeshStandardMaterial({
      color: 0x06b6d4,
      roughness: 0.3,
      metalness: 0.2,
      wireframe,
    }),
    esdMat: new THREE.MeshStandardMaterial({
      color: 0x1e3a8a,
      roughness: 0.6,
      metalness: 0.1,
      wireframe,
    }),
  };

  return sharedPalette;
}

// ============================================================================
// PRIMITIVE HELPER BUILDERS
// ============================================================================

function addBox(
  parent: THREE.Group,
  width: number,
  height: number,
  depth: number,
  x: number,
  y: number,
  z: number,
  material: THREE.Material,
  castShadow = true,
  receiveShadow = true
): THREE.Mesh {
  const geo = new THREE.BoxGeometry(width, height, depth);
  const mesh = new THREE.Mesh(geo, material);
  mesh.position.set(x, y, z);
  mesh.castShadow = castShadow;
  mesh.receiveShadow = receiveShadow;
  parent.add(mesh);
  return mesh;
}

function addCylinder(
  parent: THREE.Group,
  radiusTop: number,
  radiusBottom: number,
  height: number,
  radialSegments: number,
  x: number,
  y: number,
  z: number,
  rotationX = 0,
  rotationZ = 0,
  material: THREE.Material = getMaterialPalette().steelGalvanized
): THREE.Mesh {
  const geo = new THREE.CylinderGeometry(radiusTop, radiusBottom, height, radialSegments);
  const mesh = new THREE.Mesh(geo, material);
  mesh.position.set(x, y, z);
  if (rotationX !== 0) mesh.rotation.x = rotationX;
  if (rotationZ !== 0) mesh.rotation.z = rotationZ;
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

// ============================================================================
// 1. WORKBENCHES AND TABLES
// ============================================================================

export function buildParametricTable(
  parent: THREE.Group,
  w: number,
  l: number,
  h: number,
  colorHex?: string,
  isESD = false,
  isTestStation = false,
  wireframe = false
): void {
  const pal = getMaterialPalette(wireframe);
  const tableColor = colorHex ? new THREE.Color(colorHex) : isESD ? 0x1e3a8a : 0x334155;
  const topMat = new THREE.MeshStandardMaterial({
    color: tableColor,
    roughness: isESD ? 0.65 : 0.4,
    metalness: 0.15,
    wireframe,
  });

  // Tabletop slab (thickness 50mm)
  const topThickness = 0.05;
  addBox(parent, w, topThickness, l, 0, h - topThickness / 2, 0, topMat);

  // ESD mat overlay (if ESD table)
  if (isESD) {
    const matThickness = 0.005;
    const esdSurfaceMat = new THREE.MeshStandardMaterial({
      color: 0x1d4ed8,
      roughness: 0.8,
      metalness: 0.05,
      wireframe,
    });
    addBox(parent, w * 0.94, matThickness, l * 0.92, 0, h + matThickness / 2, 0, esdSurfaceMat);
  }

  // 4 Legs (aluminum profile 60x60mm)
  const legSize = 0.06;
  const legH = h - topThickness;
  const legOffsetW = (w - legSize) / 2 - 0.04;
  const legOffsetL = (l - legSize) / 2 - 0.04;

  const legPositions = [
    [-legOffsetW, -legOffsetL],
    [legOffsetW, -legOffsetL],
    [-legOffsetW, legOffsetL],
    [legOffsetW, legOffsetL],
  ];

  legPositions.forEach(([lx, lz]) => {
    // Main structural leg
    addBox(parent, legSize, legH, legSize, lx, legH / 2, lz, pal.aluminumProfile);
    // Leveler footpad on floor Z=0
    addCylinder(parent, 0.035, 0.035, 0.02, 12, lx, 0.01, lz, 0, 0, pal.steelDark);
  });

  // Longitudinal & lateral under-frame cross rails (40x40mm)
  const railH = 0.04;
  const railY = h - topThickness - railH / 2;
  // Left/Right rails
  addBox(parent, legSize * 0.7, railH, l - 0.14, -legOffsetW, railY, 0, pal.aluminumProfile);
  addBox(parent, legSize * 0.7, railH, l - 0.14, legOffsetW, railY, 0, pal.aluminumProfile);
  // Front/Back rails
  addBox(parent, w - 0.14, railH, legSize * 0.7, 0, railY, -legOffsetL, pal.aluminumProfile);
  addBox(parent, w - 0.14, railH, legSize * 0.7, 0, railY, legOffsetL, pal.aluminumProfile);

  // Bottom footrest crossbar (elevation 150mm)
  addBox(parent, w - 0.16, 0.03, 0.05, 0, 0.15, -legOffsetL * 0.4, pal.steelDark);

  // Rear uprights and accessories (extending above table)
  const uprightH = Math.min(1.2, Math.max(0.7, h * 0.9));
  const uprightY = h + uprightH / 2;
  const rearZ = -l / 2 + 0.04;

  [-w / 2 + 0.08, w / 2 - 0.08].forEach((ux) => {
    addBox(parent, 0.04, uprightH, 0.04, ux, uprightY, rearZ, pal.steelDark);
  });

  // Top cantilevered shelf (depth 300mm)
  const shelfDepth = Math.min(0.35, l * 0.45);
  const shelfY = h + uprightH - 0.02;
  addBox(parent, w - 0.06, 0.025, shelfDepth, 0, shelfY, rearZ + shelfDepth / 2 - 0.02, pal.aluminumProfile);

  // Perforated tool back panel (between uprights)
  const panelH = uprightH * 0.55;
  const panelY = h + panelH / 2 + 0.05;
  const panelMat = new THREE.MeshStandardMaterial({
    color: 0x475569,
    metalness: 0.6,
    roughness: 0.4,
    wireframe,
  });
  addBox(parent, w - 0.14, panelH, 0.015, 0, panelY, rearZ + 0.01, panelMat);

  // Overhead LED light bar / tool suspension rail
  addBox(parent, w - 0.1, 0.03, 0.05, 0, h + uprightH + 0.02, rearZ + shelfDepth * 0.6, pal.steelChrome);

  // Special test station accessories (for TestStationBench)
  if (isTestStation) {
    // Electrical power channel duct with outlets
    addBox(parent, w - 0.12, 0.08, 0.05, 0, h + 0.06, rearZ + 0.04, pal.steelGalvanized);
    // Monitor screen mount arm
    const screenMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.2, wireframe });
    addBox(parent, 0.45, 0.28, 0.025, 0, h + 0.45, rearZ + 0.12, screenMat);
    // Instrument box (oscilloscope/multimeter on upper shelf)
    const instMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.3, wireframe });
    addBox(parent, 0.35, 0.15, 0.25, -w * 0.2, shelfY + 0.08, rearZ + shelfDepth * 0.5, instMat);
  }
}

// ============================================================================
// 2. RACKS AND SHELVING
// ============================================================================

export function buildParametricFlowRack(
  parent: THREE.Group,
  w: number,
  l: number,
  h: number,
  colorHex?: string,
  wireframe = false
): void {
  const pal = getMaterialPalette(wireframe);
  const frameColor = colorHex ? new THREE.Color(colorHex) : 0xd97706; // standard FIFO industrial amber
  const frameMat = new THREE.MeshStandardMaterial({
    color: frameColor,
    metalness: 0.4,
    roughness: 0.4,
    wireframe,
  });

  // 4 Main corner upright tubular legs (diameter 30mm or 40x40mm)
  const legSize = 0.045;
  const halfW = (w - legSize) / 2;
  const halfL = (l - legSize) / 2;

  [
    [-halfW, -halfL],
    [halfW, -halfL],
    [-halfW, halfL],
    [halfW, halfL],
  ].forEach(([lx, lz]) => {
    addBox(parent, legSize, h, legSize, lx, h / 2, lz, frameMat);
    addCylinder(parent, 0.03, 0.03, 0.02, 10, lx, 0.01, lz, 0, 0, pal.steelDark);
  });

  // Lateral and diagonal sway braces
  addBox(parent, legSize * 0.8, 0.03, l - 0.06, -halfW, 0.15, 0, frameMat);
  addBox(parent, legSize * 0.8, 0.03, l - 0.06, halfW, 0.15, 0, frameMat);
  addBox(parent, legSize * 0.8, 0.03, l - 0.06, -halfW, h - 0.1, 0, frameMat);
  addBox(parent, legSize * 0.8, 0.03, l - 0.06, halfW, h - 0.1, 0, frameMat);

  // 3 Inclined roller tracks (tiers) tilted towards front pick side (positive Z)
  const tierHeights = [h * 0.3, h * 0.6, h * 0.88];
  const tiltRad = 0.06; // ~3.5 degrees decline from rear (-Z) to front (+Z)

  tierHeights.forEach((tierY, tierIdx) => {
    const tierGroup = new THREE.Group();
    tierGroup.position.set(0, tierY, 0);
    tierGroup.rotation.x = tiltRad;

    // Shelf frame bed
    const bedThickness = 0.025;
    addBox(tierGroup, w - 0.06, bedThickness, l - 0.04, 0, 0, 0, pal.aluminumProfile);

    // Front pick-stop lip
    addBox(tierGroup, w - 0.06, 0.05, 0.02, 0, 0.03, (l - 0.04) / 2, pal.steelGalvanized);

    // Parallel roller lanes (3 lanes across width)
    const laneCount = Math.max(2, Math.floor(w / 0.35));
    const laneSpacing = (w - 0.1) / laneCount;

    for (let i = 0; i < laneCount; i++) {
      const laneX = -((laneCount - 1) * laneSpacing) / 2 + i * laneSpacing;
      // Guide divider profile
      addBox(tierGroup, 0.015, 0.035, l - 0.06, laneX - laneSpacing / 2 + 0.01, 0.025, 0, pal.steelGalvanized);

      // KLT box sitting on this lane
      const kltW = Math.min(0.32, laneSpacing * 0.85);
      const kltL = Math.min(0.42, (l - 0.1) * 0.45);
      const kltH = 0.18;
      const kltMat =
        tierIdx === 0
          ? pal.polypropyleneBlue
          : tierIdx === 1
          ? pal.polypropyleneAmber
          : pal.polypropyleneRed;

      // Position box near front pick stop
      addBox(tierGroup, kltW, kltH, kltL, laneX, kltH / 2 + bedThickness / 2, l * 0.2, kltMat);
      // Optional second box in lane queue (if depth permits)
      if (l > 1.0) {
        addBox(tierGroup, kltW, kltH, kltL, laneX, kltH / 2 + bedThickness / 2, -l * 0.25, kltMat);
      }
    }

    parent.add(tierGroup);
  });

  // Bottom return shelf for empty containers (inclined in reverse direction towards rear)
  const returnGroup = new THREE.Group();
  returnGroup.position.set(0, 0.22, 0);
  returnGroup.rotation.x = -tiltRad;
  addBox(returnGroup, w - 0.06, 0.025, l - 0.04, 0, 0, 0, pal.steelGalvanized);
  addBox(returnGroup, w - 0.06, 0.05, 0.02, 0, 0.03, -(l - 0.04) / 2, pal.steelGalvanized);
  parent.add(returnGroup);
}

export function buildParametricShelvingUnit(
  parent: THREE.Group,
  w: number,
  l: number,
  h: number,
  colorHex?: string,
  wireframe = false
): void {
  const pal = getMaterialPalette(wireframe);
  const rackColor = colorHex ? new THREE.Color(colorHex) : 0x1e3a8a; // Industrial blue frame
  const frameMat = new THREE.MeshStandardMaterial({
    color: rackColor,
    metalness: 0.6,
    roughness: 0.4,
    wireframe,
  });

  const beamMat = new THREE.MeshStandardMaterial({
    color: 0xea580c, // Safety orange horizontal step beams
    metalness: 0.5,
    roughness: 0.35,
    wireframe,
  });

  // 4 Slotted corner upright columns (70x50mm profile)
  const colW = 0.07;
  const colD = 0.05;
  const halfW = (w - colW) / 2;
  const halfL = (l - colD) / 2;

  [
    [-halfW, -halfL],
    [halfW, -halfL],
    [-halfW, halfL],
    [halfW, halfL],
  ].forEach(([cx, cz]) => {
    addBox(parent, colW, h, colD, cx, h / 2, cz, frameMat);
    // Heavy base anchor plate
    addBox(parent, 0.12, 0.015, 0.12, cx, 0.008, cz, pal.steelDark);
  });

  // Horizontal shelf levels (4-5 levels based on height)
  const levels = Math.max(3, Math.min(6, Math.floor(h / 0.55)));
  const shelfStep = (h - 0.2) / (levels - 1);

  for (let i = 0; i < levels; i++) {
    const shelfY = 0.15 + i * shelfStep;

    // Front and rear step beams
    const beamH = 0.06;
    const beamD = 0.035;
    addBox(parent, w, beamH, beamD, 0, shelfY, -halfL, beamMat);
    addBox(parent, w, beamH, beamD, 0, shelfY, halfL, beamMat);

    // Wire mesh / steel shelf deck
    addBox(parent, w - 0.08, 0.015, l - 0.06, 0, shelfY + beamH / 2, 0, pal.steelGalvanized);

    // Stored warehouse goods (cartons / tote containers on shelves)
    if (i < levels - 1) {
      const boxCount = Math.max(2, Math.floor(w / 0.5));
      const boxSpacing = (w - 0.2) / boxCount;
      const boxH = Math.min(shelfStep * 0.7, 0.35);

      for (let b = 0; b < boxCount; b++) {
        const bx = -((boxCount - 1) * boxSpacing) / 2 + b * boxSpacing;
        const boxMat = b % 2 === 0 ? pal.woodDark : pal.polypropyleneGrey;
        addBox(
          parent,
          boxSpacing * 0.82,
          boxH,
          (l - 0.12) * 0.85,
          bx,
          shelfY + beamH / 2 + boxH / 2 + 0.01,
          0,
          boxMat
        );
      }
    }
  }
}

// ============================================================================
// 3. PALLETS AND FLOOR MARKINGS
// ============================================================================

export function buildParametricPallet(
  parent: THREE.Group,
  w: number,
  l: number,
  h: number,
  isFloorMark = false,
  isStack = false,
  colorHex?: string,
  wireframe = false
): void {
  const pal = getMaterialPalette(wireframe);

  // Floor marking outline (for PalletEuroFloorMark)
  if (isFloorMark) {
    const lineThickness = 0.005;
    const lineWidth = 0.08;
    const stripeMat = new THREE.MeshStandardMaterial({
      color: 0xfacc15, // High-visibility safety yellow border
      roughness: 0.6,
      metalness: 0.05,
      wireframe,
    });

    // 4 Border floor strips
    addBox(parent, w, lineThickness, lineWidth, 0, 0.002, -l / 2 + lineWidth / 2, stripeMat);
    addBox(parent, w, lineThickness, lineWidth, 0, 0.002, l / 2 - lineWidth / 2, stripeMat);
    addBox(parent, lineWidth, lineThickness, l, -w / 2 + lineWidth / 2, 0.002, 0, stripeMat);
    addBox(parent, lineWidth, lineThickness, l, w / 2 - lineWidth / 2, 0.002, 0, stripeMat);

    // 4 L-shaped corner alignment brackets
    const bracketMat = new THREE.MeshStandardMaterial({ color: 0xef4444, metalness: 0.5, wireframe });
    const bracketSize = 0.14;
    [
      [-w / 2 + bracketSize / 2, -l / 2 + bracketSize / 2],
      [w / 2 - bracketSize / 2, -l / 2 + bracketSize / 2],
      [-w / 2 + bracketSize / 2, l / 2 - bracketSize / 2],
      [w / 2 - bracketSize / 2, l / 2 - bracketSize / 2],
    ].forEach(([cx, cz]) => {
      addBox(parent, bracketSize, 0.03, bracketSize, cx, 0.015, cz, bracketMat);
    });
  }

  // Realistic EPAL Euro-pallet geometry (144mm standard thickness)
  const singlePalletH = 0.144;
  const stackCount = isStack ? Math.max(2, Math.min(6, Math.round(h / singlePalletH))) : 1;

  for (let s = 0; s < stackCount; s++) {
    const palletBaseY = s * singlePalletH;
    const palletGroup = new THREE.Group();
    palletGroup.position.set(0, palletBaseY, 0);

    // 1. 3 Bottom deck skids (running along length L, thickness 22mm, width 145mm)
    const boardThick = 0.022;
    const skidW = Math.min(0.145, w * 0.15);
    const skidPositionsX = [-w / 2 + skidW / 2, 0, w / 2 - skidW / 2];

    skidPositionsX.forEach((sx) => {
      addBox(palletGroup, skidW, boardThick, l, sx, boardThick / 2, 0, pal.woodPine);
    });

    // 2. 9 Solid spacer blocks (corners, side-middles, center; height 78mm)
    const blockH = 0.078;
    const blockL = Math.min(0.145, l * 0.15);
    const blockY = boardThick + blockH / 2;
    const blockPositionsZ = [-l / 2 + blockL / 2, 0, l / 2 - blockL / 2];

    skidPositionsX.forEach((bx) => {
      blockPositionsZ.forEach((bz) => {
        addBox(palletGroup, skidW, blockH, blockL, bx, blockY, bz, pal.woodDark);
      });
    });

    // 3. 3 Cross stringer boards (running along width W, thickness 22mm, width 145mm)
    const crossY = boardThick + blockH + boardThick / 2;
    blockPositionsZ.forEach((cz) => {
      addBox(palletGroup, w, boardThick, blockL, 0, crossY, cz, pal.woodPine);
    });

    // 4. 5 Top deckboards (running along length L, thickness 22mm)
    const topBoardY = boardThick + blockH + boardThick + boardThick / 2;
    // 3 wide boards (145mm) + 2 intermediate boards (100mm)
    const wideW = skidW;
    const narrowW = Math.min(0.1, w * 0.1);
    const innerOffset = (w / 2 - wideW) / 2;

    addBox(palletGroup, wideW, boardThick, l, -w / 2 + wideW / 2, topBoardY, 0, pal.woodPine);
    addBox(palletGroup, wideW, boardThick, l, 0, topBoardY, 0, pal.woodPine);
    addBox(palletGroup, wideW, boardThick, l, w / 2 - wideW / 2, topBoardY, 0, pal.woodPine);
    addBox(palletGroup, narrowW, boardThick, l, -innerOffset, topBoardY, 0, pal.woodPine);
    addBox(palletGroup, narrowW, boardThick, l, innerOffset, topBoardY, 0, pal.woodPine);

    parent.add(palletGroup);
  }
}

// ============================================================================
// 4. CONTAINERS AND KLT BOXES
// ============================================================================

export function buildParametricKltBoxStack(
  parent: THREE.Group,
  w: number,
  l: number,
  h: number,
  colorHex?: string,
  isMaterialIn = false,
  isFinishedGoods = false,
  wireframe = false
): void {
  const pal = getMaterialPalette(wireframe);
  const defaultColor = isMaterialIn ? 0x16a34a : isFinishedGoods ? 0x2563eb : 0x475569;
  const boxColor = colorHex ? new THREE.Color(colorHex) : defaultColor;

  const boxMat = new THREE.MeshStandardMaterial({
    color: boxColor,
    roughness: 0.45,
    metalness: 0.15,
    wireframe,
  });

  const rimMat = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    roughness: 0.5,
    metalness: 0.2,
    wireframe,
  });

  // Standard VDA KLT modular box sizes: ~400x300x147mm or 600x400x280mm
  const singleBoxH = Math.min(0.28, Math.max(0.14, h * 0.5));
  const stackLayers = Math.max(1, Math.round(h / singleBoxH));
  const cols = Math.max(1, Math.floor(w / 0.35));
  const rows = Math.max(1, Math.floor(l / 0.45));

  const boxW = (w - 0.04) / cols;
  const boxL = (l - 0.04) / rows;

  for (let layer = 0; layer < stackLayers; layer++) {
    const layerY = layer * singleBoxH;

    for (let c = 0; c < cols; c++) {
      for (let r = 0; r < rows; r++) {
        const bx = -((cols - 1) * boxW) / 2 + c * boxW;
        const bz = -((rows - 1) * boxL) / 2 + r * boxL;

        const kltGroup = new THREE.Group();
        kltGroup.position.set(bx, layerY, bz);

        // Main container body (walls)
        const wallH = singleBoxH * 0.9;
        const wallW = boxW * 0.95;
        const wallL = boxL * 0.95;
        addBox(kltGroup, wallW, wallH, wallL, 0, wallH / 2, 0, boxMat);

        // Top interlocking stacking rim
        addBox(kltGroup, wallW + 0.015, 0.02, wallL + 0.015, 0, wallH, 0, rimMat);

        // Recessed ergonomic handle shell pockets (front and back)
        const handleMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.8, wireframe });
        addBox(kltGroup, wallW * 0.3, 0.04, 0.01, 0, wallH * 0.75, -wallL / 2 + 0.005, handleMat);
        addBox(kltGroup, wallW * 0.3, 0.04, 0.01, 0, wallH * 0.75, wallL / 2 - 0.005, handleMat);

        // White document/barcode label card clip
        const labelMat = new THREE.MeshBasicMaterial({ color: 0xffffff, wireframe });
        addBox(kltGroup, wallW * 0.25, 0.05, 0.005, wallW * 0.25, wallH * 0.45, wallL / 2 + 0.002, labelMat);

        parent.add(kltGroup);
      }
    }
  }
}

// ============================================================================
// 5. TRANSPORT CARTS AND MOBILE ROBOTS (AGV / AMR)
// ============================================================================

export function buildParametricTuggerCart(
  parent: THREE.Group,
  w: number,
  l: number,
  h: number,
  colorHex?: string,
  wireframe = false
): void {
  const pal = getMaterialPalette(wireframe);
  const cartColor = colorHex ? new THREE.Color(colorHex) : 0x1d4ed8;
  const frameMat = new THREE.MeshStandardMaterial({
    color: cartColor,
    metalness: 0.65,
    roughness: 0.35,
    wireframe,
  });

  // 4 Industrial caster wheels (diameter 150mm, height 180mm with bracket)
  const wheelRadius = 0.075;
  const casterY = wheelRadius;
  const casterOffsetW = (w - 0.12) / 2;
  const casterOffsetL = (l - 0.16) / 2;

  const casterCoords = [
    [-casterOffsetW, -casterOffsetL],
    [casterOffsetW, -casterOffsetL],
    [-casterOffsetW, casterOffsetL],
    [casterOffsetW, casterOffsetL],
  ];

  casterCoords.forEach(([cx, cz]) => {
    // Wheel tire
    addCylinder(parent, wheelRadius, wheelRadius, 0.04, 14, cx, casterY, cz, 0, Math.PI / 2, pal.rubberBlack);
    // Steel wheel bracket fork
    addBox(parent, 0.06, 0.08, 0.08, cx, casterY + 0.05, cz, pal.steelGalvanized);
  });

  // Welded chassis perimeter frame
  const deckElevation = 0.22;
  const frameH = 0.06;
  addBox(parent, w, frameH, l, 0, deckElevation + frameH / 2, 0, frameMat);

  // Flat heavy-duty load deck plate
  const deckPlateMat = new THREE.MeshStandardMaterial({
    color: 0x475569,
    metalness: 0.7,
    roughness: 0.3,
    wireframe,
  });
  addBox(parent, w - 0.04, 0.02, l - 0.04, 0, deckElevation + frameH + 0.01, 0, deckPlateMat);

  // Perimeter retaining lips / corner guide chocks (to secure pallets/trolleys)
  const lipH = 0.04;
  addBox(parent, w, lipH, 0.025, 0, deckElevation + frameH + lipH / 2, -l / 2 + 0.015, pal.safetyYellow);
  addBox(parent, w, lipH, 0.025, 0, deckElevation + frameH + lipH / 2, l / 2 - 0.015, pal.safetyYellow);
  addBox(parent, 0.025, lipH, l, -w / 2 + 0.015, deckElevation + frameH + lipH / 2, 0, pal.safetyYellow);
  addBox(parent, 0.025, lipH, l, w / 2 - 0.015, deckElevation + frameH + lipH / 2, 0, pal.safetyYellow);

  // Ergonomic push handle / towbar drawbar
  const handleH = Math.min(1.0, Math.max(0.7, h));
  const rearL = -l / 2 - 0.04;

  // Upright handle tubes
  [-w / 2 + 0.08, w / 2 - 0.08].forEach((hx) => {
    addCylinder(parent, 0.018, 0.018, handleH - deckElevation, 10, hx, (handleH + deckElevation) / 2, rearL, 0, 0, pal.steelChrome);
  });
  // Cross grip handle
  addCylinder(parent, 0.02, 0.02, w - 0.14, 10, 0, handleH, rearL, 0, Math.PI / 2, pal.rubberBlack);

  // Front towbar tongue with hitch pin (at +Z)
  const towbarL = 0.25;
  addBox(parent, 0.06, 0.03, towbarL, 0, deckElevation, l / 2 + towbarL / 2, pal.steelGalvanized);
  addCylinder(parent, 0.015, 0.015, 0.08, 10, 0, deckElevation + 0.03, l / 2 + towbarL - 0.03, 0, 0, pal.safetyYellow);
}

export function buildParametricAGV(
  parent: THREE.Group,
  w: number,
  l: number,
  h: number,
  colorHex?: string,
  wireframe = false
): void {
  const pal = getMaterialPalette(wireframe);
  const agvColor = colorHex ? new THREE.Color(colorHex) : 0x0284c7;
  const bodyMat = new THREE.MeshStandardMaterial({
    color: agvColor,
    metalness: 0.4,
    roughness: 0.35,
    wireframe,
  });

  // Low-profile aerodynamic chassis body (ground clearance 30mm, body height ~220mm)
  const groundClearance = 0.03;
  const bodyH = Math.min(h, 0.28);
  const bodyY = groundClearance + bodyH / 2;
  addBox(parent, w * 0.94, bodyH, l * 0.94, 0, bodyY, 0, bodyMat);

  // Lower bumper safety skirt with yellow/black hazard perimeter
  addBox(parent, w, 0.04, l, 0, groundClearance + 0.02, 0, pal.safetyYellow);

  // Diagonal Safety LIDAR Laser Scanner Cutouts (front-left and rear-right)
  const scannerMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.2, wireframe });
  addCylinder(parent, 0.045, 0.045, 0.04, 12, -w / 2 + 0.05, groundClearance + 0.05, l / 2 - 0.05, 0, 0, scannerMat);
  addCylinder(parent, 0.045, 0.045, 0.04, 12, w / 2 - 0.05, groundClearance + 0.05, -l / 2 + 0.05, 0, 0, scannerMat);

  // Top motorized scissor/pin lifter table
  const lifterMat = new THREE.MeshStandardMaterial({
    color: 0x334155,
    metalness: 0.8,
    roughness: 0.25,
    wireframe,
  });
  const lifterH = 0.04;
  addBox(parent, w * 0.8, lifterH, l * 0.8, 0, bodyY + bodyH / 2 + lifterH / 2, 0, lifterMat);

  // Docking centering pins
  [-w * 0.25, w * 0.25].forEach((px) => {
    addCylinder(parent, 0.02, 0.025, 0.05, 10, px, bodyY + bodyH / 2 + lifterH + 0.025, 0, 0, 0, pal.steelChrome);
  });

  // 360° Safety LED light band & status beacon
  const ledMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8, wireframe });
  addBox(parent, w * 0.96, 0.015, l * 0.96, 0, bodyY + bodyH / 2 - 0.02, 0, ledMat);
}

// ============================================================================
// 6. CONVEYORS
// ============================================================================

export function buildParametricConveyor(
  parent: THREE.Group,
  w: number,
  l: number,
  h: number,
  colorHex?: string,
  wireframe = false
): void {
  const pal = getMaterialPalette(wireframe);
  const frameColor = colorHex ? new THREE.Color(colorHex) : 0x475569;
  const frameMat = new THREE.MeshStandardMaterial({
    color: frameColor,
    metalness: 0.75,
    roughness: 0.35,
    wireframe,
  });

  // 2 Side C-channel guide rail frames (running along length L)
  const railH = 0.12;
  const railThick = 0.04;
  const railY = h - railH / 2;
  const halfW = (w - railThick) / 2;

  [-halfW, halfW].forEach((rx) => {
    addBox(parent, railThick, railH, l, rx, railY, 0, frameMat);
  });

  // Galvanized steel roller cylinders spaced along conveyor run
  const rollerRadius = 0.035;
  const rollerLength = w - railThick * 2 - 0.02;
  const rollerPitch = 0.1; // 100mm pitch
  const rollerCount = Math.max(3, Math.floor((l - 0.1) / rollerPitch));
  const rollerY = h - 0.01;

  for (let i = 0; i < rollerCount; i++) {
    const rz = -((rollerCount - 1) * rollerPitch) / 2 + i * rollerPitch;
    addCylinder(parent, rollerRadius, rollerRadius, rollerLength, 12, 0, rollerY, rz, 0, Math.PI / 2, pal.steelGalvanized);
  }

  // H-leg support stands (every 1.5 to 2.0 meters)
  const standCount = Math.max(2, Math.round(l / 1.5) + 1);
  const standStep = (l - 0.25) / (standCount - 1);
  const legSize = 0.05;
  const legH = h - railH;

  for (let s = 0; s < standCount; s++) {
    const sz = -((standCount - 1) * standStep) / 2 + s * standStep;

    // 2 Vertical leg columns
    [-halfW, halfW].forEach((lx) => {
      addBox(parent, legSize, legH, legSize, lx, legH / 2, sz, pal.aluminumProfile);
      // Floor anchor baseplate
      addBox(parent, 0.1, 0.012, 0.1, lx, 0.006, sz, pal.steelDark);
    });

    // Horizontal cross tie between legs
    addBox(parent, w - railThick * 2, 0.04, legSize, 0, legH * 0.35, sz, pal.aluminumProfile);
  }
}

// ============================================================================
// 7. ERGONOMIC MATS AND SIGNAGE
// ============================================================================

export function buildParametricErgoMat(
  parent: THREE.Group,
  w: number,
  l: number,
  h: number,
  colorHex?: string,
  wireframe = false
): void {
  const pal = getMaterialPalette(wireframe);
  const matColor = colorHex ? new THREE.Color(colorHex) : 0x059669;
  const matMat = new THREE.MeshStandardMaterial({
    color: matColor,
    roughness: 0.9,
    metalness: 0.05,
    wireframe,
  });

  const matThickness = Math.max(0.015, Math.min(0.03, h));
  // Main cushioned walking pad
  addBox(parent, w * 0.92, matThickness, l * 0.92, 0, matThickness / 2, 0, matMat);

  // Beveled high-visibility safety yellow boundary border
  addBox(parent, w, matThickness * 0.8, l, 0, (matThickness * 0.8) / 2, 0, pal.safetyYellow);
}

export function buildParametricAndonBoard(
  parent: THREE.Group,
  w: number,
  l: number,
  h: number,
  colorHex?: string,
  wireframe = false
): void {
  const pal = getMaterialPalette(wireframe);
  const boardColor = colorHex ? new THREE.Color(colorHex) : 0x0f172a;
  const housingMat = new THREE.MeshStandardMaterial({
    color: boardColor,
    metalness: 0.8,
    roughness: 0.3,
    wireframe,
  });

  // Display housing enclosure
  addBox(parent, w, h, l, 0, h / 2, 0, housingMat);

  // High-contrast LED matrix display face
  const ledMat = new THREE.MeshBasicMaterial({ color: 0x22c55e, wireframe });
  addBox(parent, w * 0.88, h * 0.65, 0.005, 0, h * 0.5, l / 2 + 0.003, ledMat);

  // 3-Stack signal light tower (Red, Amber, Green)
  const towerMatRed = new THREE.MeshBasicMaterial({ color: 0xef4444, wireframe });
  const towerMatAmber = new THREE.MeshBasicMaterial({ color: 0xf59e0b, wireframe });
  const towerMatGreen = new THREE.MeshBasicMaterial({ color: 0x10b981, wireframe });

  const lightRadius = 0.03;
  const lightH = 0.04;
  addCylinder(parent, lightRadius, lightRadius, lightH, 12, w / 2 - 0.08, h + 0.12, 0, 0, 0, towerMatRed);
  addCylinder(parent, lightRadius, lightRadius, lightH, 12, w / 2 - 0.08, h + 0.07, 0, 0, 0, towerMatAmber);
  addCylinder(parent, lightRadius, lightRadius, lightH, 12, w / 2 - 0.08, h + 0.02, 0, 0, 0, towerMatGreen);
}

// ============================================================================
// AUXILIARY VISUAL OVERLAYS (Service Zones, Collisions, Transport Ports)
// ============================================================================

export function buildServiceZoneVisual(
  parent: THREE.Group,
  zone: EquipmentServiceZone,
  wireframe = false
): void {
  const zoneW = mmToWorld(zone.widthMm);
  const zoneD = mmToWorld(zone.depthMm);
  const zoneH = mmToWorld(zone.heightMm);
  const offX = mmToWorld(zone.offsetMm.x);
  const offY = mmToWorld(zone.offsetMm.z); // Three.js Y is elevation
  const offZ = mmToWorld(zone.offsetMm.y); // Three.js Z is depth

  const zoneMat = new THREE.MeshStandardMaterial({
    color: 0x38bdf8, // light blue translucent envelope
    transparent: true,
    opacity: 0.22,
    roughness: 0.3,
    depthWrite: false,
    wireframe,
  });

  const mesh = addBox(parent, zoneW, zoneH, zoneD, offX, offY + zoneH / 2, offZ, zoneMat, false, false);
  mesh.renderOrder = 500;

  // Dashed outline box helper
  const outline = new THREE.BoxHelper(mesh, 0x0284c7);
  (outline.material as THREE.Material).depthTest = false;
  outline.renderOrder = 501;
  parent.add(outline);
}

export function buildCollisionEnvelopeVisual(
  parent: THREE.Group,
  w: number,
  h: number,
  l: number,
  clearanceMm = 100
): void {
  const clearM = mmToWorld(clearanceMm);
  const totalW = w + clearM * 2;
  const totalH = h + clearM;
  const totalL = l + clearM * 2;

  const wireMat = new THREE.MeshBasicMaterial({
    color: 0xf59e0b, // amber clearance wireframe
    wireframe: true,
    transparent: true,
    opacity: 0.45,
  });

  addBox(parent, totalW, totalH, totalL, 0, totalH / 2, 0, wireMat, false, false);
}

export function buildTransportPortVisual(
  parent: THREE.Group,
  port: EquipmentTransportPort
): void {
  const px = mmToWorld(port.relativePositionMm.x);
  const py = mmToWorld(port.transferElevationMm ?? port.relativePositionMm.z);
  const pz = mmToWorld(port.relativePositionMm.y);

  const portColor =
    port.type === 'input' ? 0x22c55e : port.type === 'output' ? 0xef4444 : 0x3b82f6;

  const padMat = new THREE.MeshBasicMaterial({ color: portColor });
  // Docking pad plate
  addBox(parent, 0.15, 0.015, 0.15, px, py, pz, padMat, false, false);

  // Direction arrow indicator
  const arrowAngleRad = (port.approachDirectionDeg * Math.PI) / 180;
  const dirVector = new THREE.Vector3(Math.sin(arrowAngleRad), 0, Math.cos(arrowAngleRad));
  const arrowHelper = new THREE.ArrowHelper(dirVector, new THREE.Vector3(px, py + 0.05, pz), 0.25, portColor);
  parent.add(arrowHelper);
}

export function buildParametricShadowboard(
  parent: THREE.Group,
  w: number,
  l: number,
  h: number,
  colorHex?: string,
  wireframe = false
): void {
  const pal = getMaterialPalette(wireframe);
  const boardColor = colorHex ? new THREE.Color(colorHex) : 0x1e293b;
  const boardMat = new THREE.MeshStandardMaterial({
    color: boardColor,
    roughness: 0.5,
    metalness: 0.2,
    wireframe,
  });

  // Vertical perforated pegboard panel
  const panelH = h * 0.8;
  const panelThick = 0.03;
  addBox(parent, w, panelH, panelThick, 0, h / 2 + 0.1, 0, boardMat);

  // Mobile A-frame base with casters
  addBox(parent, w * 0.9, 0.04, l, 0, 0.06, 0, pal.aluminumProfile);
  for (const cx of [-w * 0.4, w * 0.4]) {
    for (const cz of [-l * 0.4, l * 0.4]) {
      addCylinder(parent, 0.03, 0.03, 0.02, 10, cx, 0.03, cz, 0, 0, pal.rubberBlack);
    }
  }

  // Visual tool shadow silhouettes on panel (wrench, hammer, screwdriver)
  const shadowMat = new THREE.MeshBasicMaterial({ color: 0xfacc15, wireframe });
  addBox(parent, 0.06, 0.35, 0.005, -w * 0.25, h * 0.55, panelThick / 2 + 0.003, shadowMat);
  addBox(parent, 0.12, 0.3, 0.005, 0, h * 0.6, panelThick / 2 + 0.003, shadowMat);
  addBox(parent, 0.04, 0.25, 0.005, w * 0.25, h * 0.52, panelThick / 2 + 0.003, shadowMat);
}

// ============================================================================
// MAIN GENERATOR AND DISPOSAL ENTRY POINTS
// ============================================================================

/**
 * Creates a fully parametric, clean Three.js Group for any layout object based on its dimensions and standard specification.
 */
export function createParametricEquipmentGroup(
  object: LayoutObject,
  options: ParametricModelOptions = {}
): THREE.Group {
  const group = new THREE.Group();
  group.userData.id = object.id;
  group.userData.type = object.type;

  // Convert mm dimensions to Three.js meters (1m = 1000mm)
  const w = mmToWorld(object.widthMm);
  const l = mmToWorld(object.lengthMm);
  const h = mmToWorld(object.heightMm);
  const wire = !!options.wireframe;
  const colorHex = options.colorHex ?? object.colorHex;

  // Position & rotation: local origin corresponds to center of footprint on floor (Y=0 in Three.js)
  const posX = mmToWorld(object.xMm + object.widthMm / 2);
  const posY = mmToWorld(object.zMm);
  const posZ = mmToWorld(object.yMm + object.lengthMm / 2);

  group.position.set(posX, posY, posZ);
  group.rotation.y = (-object.rotationDeg * Math.PI) / 180;

  // Build the characteristic 3D visual equipment model
  switch (object.type as string) {
    case 'Table':
      buildParametricTable(group, w, l, h, colorHex, false, false, wire);
      break;

    case 'TableESD':
      buildParametricTable(group, w, l, h, colorHex, true, false, wire);
      break;

    case 'TableToolRail':
    case 'QualityGate':
      buildParametricTable(group, w, l, h, colorHex, false, true, wire);
      break;

    case 'ReworkStation':
    case 'TestStationBench':
      buildParametricTable(group, w, l, h, colorHex, true, true, wire);
      break;

    case 'FlowRackFIFO2Tier':
    case 'FlowRackFIFO3Tier':
      buildParametricFlowRack(group, w, l, h, colorHex, wire);
      break;

    case 'ShelvingUnitBulk':
      buildParametricShelvingUnit(group, w, l, h, colorHex, wire);
      break;

    case 'PalletEuroFloorMark':
      buildParametricPallet(group, w, l, h, true, false, colorHex, wire);
      break;

    case 'PalletEuroStack':
      buildParametricPallet(group, w, l, h, false, true, colorHex, wire);
      break;

    case 'KltBoxStack':
      buildParametricKltBoxStack(group, w, l, h, colorHex, false, false, wire);
      break;

    case 'MaterialIn':
      buildParametricKltBoxStack(group, w, l, h, colorHex, true, false, wire);
      break;

    case 'FinishedGoods':
      buildParametricKltBoxStack(group, w, l, h, colorHex, false, true, wire);
      break;

    case 'CartTuggerPlatform':
      buildParametricTuggerCart(group, w, l, h, colorHex, wire);
      break;

    case 'AGVMiniLifter':
      buildParametricAGV(group, w, l, h, colorHex, wire);
      break;

    case 'RollerConveyorGravity':
    case 'RollerConveyorMotorized':
    case 'ConveyorRollerSegment':
      buildParametricConveyor(group, w, l, h, colorHex, wire);
      break;

    case 'OperatorErgoMat':
      buildParametricErgoMat(group, w, l, h, colorHex, wire);
      break;

    case 'Shadowboard5S':
      buildParametricShadowboard(group, w, l, h, colorHex, wire);
      break;

    case 'AndonBoard':
      buildParametricAndonBoard(group, w, l, h, colorHex, wire);
      break;

    default: {
      // Fallback: clean beveled equipment cuboid with contrast top
      const pal = getMaterialPalette(wire);
      const fallbackMat = new THREE.MeshStandardMaterial({
        color: colorHex ? new THREE.Color(colorHex) : 0x3b82f6,
        roughness: 0.4,
        metalness: 0.2,
        wireframe: wire,
      });
      addBox(group, w, h, l, 0, h / 2, 0, fallbackMat);
      addBox(group, w * 0.92, 0.02, l * 0.92, 0, h + 0.01, 0, pal.aluminumProfile);
      break;
    }
  }

  // Optional Overlays based on 6.1 Equipment Specifications
  const spec = DEFAULT_EQUIPMENT_SPECS[object.type as ObjectType];
  if (spec) {
    if (options.showServiceZone && spec.serviceZones.length > 0) {
      spec.serviceZones.forEach((zone) => buildServiceZoneVisual(group, zone, wire));
    }

    if (options.showCollisionEnvelope) {
      const clearance = spec.collision?.clearanceMarginMm ?? 50;
      buildCollisionEnvelopeVisual(group, w, h, l, clearance);
    }

    if (options.showTransportPorts && spec.transportPorts.length > 0) {
      spec.transportPorts.forEach((port) => buildTransportPortVisual(group, port));
    }
  }

  return group;
}

/**
 * Cleanly disposes of all geometries and non-shared materials in a Three.js equipment group to prevent GPU memory leaks.
 */
export function disposeEquipmentGroup(group: THREE.Group): void {
  group.traverse((child) => {
    if ((child as THREE.Mesh).isMesh) {
      const mesh = child as THREE.Mesh;
      if (mesh.geometry) {
        mesh.geometry.dispose();
      }
      if (mesh.material) {
        const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
        mats.forEach((m) => {
          // Do not dispose palette shared materials, only local instances
          if (m && !isSharedPaletteMaterial(m)) {
            m.dispose();
          }
        });
      }
    }
  });
}

function isSharedPaletteMaterial(mat: THREE.Material): boolean {
  if (!sharedPalette) return false;
  return Object.values(sharedPalette).includes(mat as THREE.MeshStandardMaterial);
}
