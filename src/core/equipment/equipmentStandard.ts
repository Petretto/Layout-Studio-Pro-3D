/**
 * Equipment Standard Specification (Plan Rozwoju ID 6.1)
 *
 * Establishes formal standards for industrial line equipment:
 * - Scale & Units: mm (geometry, positions), deg (rotations), kg (mass/load), Three.js 1 unit = 1m = 1000mm.
 * - Insertion / Origin Point: elevation (floor z=0), horizontal anchor (footprint-center or bounding-box-min), front-facing vector.
 * - Collision Boundary: 2D footprint & 3D bounding box with explicit clearance margin.
 * - Service & Operator Zones: standing/seated operator envelope, maintenance clearance, ergonomic guideline notes (ISO 14738).
 * - Material Transport Points: I/O docking ports (approach direction, transfer height, carrier types: cart, roller, agv, forklift).
 * - Source & License Metadata: vendor, license (MIT, CC-BY-4.0, CC0, Commercial), version, geometry budget.
 * - Visual Model vs Technological Independence: Visual model never dictates operation duration, cycle capability or line balance (Rule 6.4).
 */

import { ObjectType, LayoutObject, Obstacle } from '../models/types';

// ============================================================================
// 1. SCALE AND UNITS
// ============================================================================

/** Conversion constant: 1000 mm in 1 meter (Three.js world coordinate unit). */
export const MM_TO_M = 0.001;
export const M_TO_MM = 1000;

export function mmToWorld(mm: number): number {
  return mm * MM_TO_M;
}

export function worldToMm(worldUnits: number): number {
  return Math.round(worldUnits * M_TO_MM);
}

export interface Vector3Mm {
  x: number;
  y: number;
  z: number;
}

export function vectorMmToWorld(v: Vector3Mm): { x: number; y: number; z: number } {
  return {
    x: v.x * MM_TO_M,
    y: v.z * MM_TO_M, // Three.js Y is vertical elevation
    z: v.y * MM_TO_M, // Three.js Z is depth (hall Y)
  };
}

// ============================================================================
// 2. INSERTION AND ORIGIN POINT
// ============================================================================

export type InsertionAnchor = 'footprint-center' | 'bottom-left' | 'top-left';
export type ElevationReference = 'floor' | 'suspended' | 'tabletop';
export type FacingDirection = 'front-positive-y' | 'front-positive-x' | 'custom';

export interface EquipmentInsertionPoint {
  /** Reference anchor in horizontal plane (XY). Default: 'footprint-center'. */
  anchor: InsertionAnchor;
  /** Vertical placement reference. Equipment resting on floor has elevation 'floor' (Z=0). */
  elevation: ElevationReference;
  /** Base facing direction when rotationDeg = 0. Default: 'front-positive-y'. */
  facing: FacingDirection;
  /** Height of the contact plane above floor in mm (usually 0 for floor-standing equipment). */
  groundContactZMm: number;
}

// ============================================================================
// 3. COLLISION ENVELOPE
// ============================================================================

export interface EquipmentCollisionEnvelope {
  /** Width along local X axis in mm. */
  widthMm: number;
  /** Length/depth along local Y axis in mm. */
  lengthMm: number;
  /** Height along vertical axis in mm. */
  heightMm: number;
  /** Additional safety clearance margin in mm (e.g. 50-100 mm). */
  clearanceMarginMm: number;
  /** True if the object represents a solid rigid physical obstacle for workers and carts. */
  isSolidObstacle: boolean;
  /** Optional custom 2D polygon vertices in mm relative to local origin (for non-rectangular machinery). */
  polygon2DMm?: Array<{ x: number; y: number }>;
}

// ============================================================================
// 4. SERVICE AND OPERATOR ZONE
// ============================================================================

export type ServiceZoneType =
  | 'operator-standing'
  | 'operator-seated'
  | 'maintenance-access'
  | 'loading-unloading';

export interface EquipmentServiceZone {
  id: string;
  name: string;
  type: ServiceZoneType;
  /** Offset of service zone center relative to equipment local origin in mm. */
  offsetMm: { x: number; y: number; z: number };
  /** Width of the service area in mm (minimum 800 mm recommended for standing worker). */
  widthMm: number;
  /** Depth of the service area in mm (minimum 800-1000 mm recommended per ISO 14738). */
  depthMm: number;
  /** Height clearance required for the zone in mm (typically 2000 mm for standing workers). */
  heightMm: number;
  /** Explicit reminder: geometric zones are layout guidelines and do not replace certified OHS/BHP compliance. */
  isErgonomicGuidelineOnly: true;
}

// ============================================================================
// 5. MATERIAL TRANSPORT POINTS (DOCKING / I/O PORTS)
// ============================================================================

export type TransportPortType = 'input' | 'output' | 'bidirectional';

export type TransportCarrierType =
  | 'cart'
  | 'roller'
  | 'forklift'
  | 'manual-carry'
  | 'agv'
  | 'klt-box'
  | 'pallet';

export interface EquipmentTransportPort {
  id: string;
  name: string;
  type: TransportPortType;
  /** Position of docking/transfer point in equipment local coordinate system (mm). */
  relativePositionMm: { x: number; y: number; z: number };
  /** Direction from which the cart/worker approaches the port in degrees (0° = +Y, 90° = +X, 180° = -Y, 270° = -X). */
  approachDirectionDeg: number;
  /** Working height above floor for material handoff in mm (e.g. 850mm for table, 200mm for pallet). */
  transferElevationMm: number;
  /** Supported carrier/handling methods. */
  allowedCarriers: TransportCarrierType[];
  /** Clear docking envelope required in mm. */
  dockingClearanceMm: { widthMm: number; depthMm: number };
}

// ============================================================================
// 6. SOURCE AND LICENSE METADATA
// ============================================================================

export type EquipmentSourceKind = 'built-in' | 'catalog' | 'custom-import' | 'user-defined';
export type EquipmentLicense = 'MIT' | 'CC-BY-4.0' | 'CC0' | 'Commercial-Proprietary' | 'Custom';

export interface EquipmentMetadata {
  /** Origin/source of the equipment definition. */
  source: EquipmentSourceKind;
  /** Author or design organization. */
  author: string;
  /** Vendor / manufacturer name if standard catalog item. */
  vendor?: string;
  /** Catalog or part reference number. */
  catalogNumber?: string;
  /** License governing 3D model geometry and CAD assets. */
  license: EquipmentLicense;
  /** URL or reference to license terms. */
  licenseUrl?: string;
  /** Model / specification version. */
  version: string;
  /** Polygon budget: maximum vertex/triangle count to prevent 3D scene slowdowns. */
  polygonCountLimit?: number;
  /** External CAD/GLTF asset reference path if available. */
  assetRef?: string;
  /**
   * Domain invariant: Visual models must NEVER be certified as technological process capacity.
   * True capacity is owned exclusively by process operations and machine specifications.
   */
  isCertifiedTechnologicalCapacity: false;
}

// ============================================================================
// 7. COMPLETE EQUIPMENT STANDARD SPECIFICATION
// ============================================================================

export interface EquipmentStandardSpec {
  /** Unique standard equipment specification ID (e.g. 'table-standard-1500x800'). */
  id: string;
  /** Human-readable equipment name. */
  name: string;
  /** Standard object type matching Layout Studio CAD classification. */
  objectType: ObjectType;
  /** Insertion & origin point definition. */
  insertion: EquipmentInsertionPoint;
  /** Collision and physical footprint boundary. */
  collision: EquipmentCollisionEnvelope;
  /** Defined operator work and maintenance zones. */
  serviceZones: EquipmentServiceZone[];
  /** Material input/output transfer ports. */
  transportPorts: EquipmentTransportPort[];
  /** Provenance, copyright and license metadata. */
  metadata: EquipmentMetadata;
  /** Visual appearance settings (pure visual, decoupled from technological capabilities). */
  visual: {
    defaultColorHex: string;
    description: string;
  };
}

// ============================================================================
// 8. BUILT-IN STANDARD SPECIFICATIONS REGISTRY
// ============================================================================

export const DEFAULT_EQUIPMENT_SPECS: Record<ObjectType, EquipmentStandardSpec> = {
  Table: {
    id: 'spec-table-std-1500x800',
    name: 'Stół montażowy standardowy',
    objectType: 'Table',
    insertion: {
      anchor: 'footprint-center',
      elevation: 'floor',
      facing: 'front-positive-y',
      groundContactZMm: 0,
    },
    collision: {
      widthMm: 1500,
      lengthMm: 800,
      heightMm: 850,
      clearanceMarginMm: 50,
      isSolidObstacle: true,
    },
    serviceZones: [
      {
        id: 'sz-table-operator',
        name: 'Strefa obsługi operatora',
        type: 'operator-standing',
        offsetMm: { x: 0, y: 800, z: 0 },
        widthMm: 1500,
        depthMm: 800,
        heightMm: 2000,
        isErgonomicGuidelineOnly: true,
      },
    ],
    transportPorts: [
      {
        id: 'port-table-in',
        name: 'Podanie materiału (lewe)',
        type: 'input',
        relativePositionMm: { x: -750, y: 0, z: 850 },
        approachDirectionDeg: 270,
        transferElevationMm: 850,
        allowedCarriers: ['cart', 'manual-carry', 'klt-box'],
        dockingClearanceMm: { widthMm: 600, depthMm: 800 },
      },
      {
        id: 'port-table-out',
        name: 'Odbiór wyrobu (prawe)',
        type: 'output',
        relativePositionMm: { x: 750, y: 0, z: 850 },
        approachDirectionDeg: 90,
        transferElevationMm: 850,
        allowedCarriers: ['cart', 'manual-carry', 'klt-box'],
        dockingClearanceMm: { widthMm: 600, depthMm: 800 },
      },
    ],
    metadata: {
      source: 'built-in',
      author: 'Layout Studio Pro Standard',
      license: 'MIT',
      version: '1.0.0',
      polygonCountLimit: 1200,
      isCertifiedTechnologicalCapacity: false,
    },
    visual: {
      defaultColorHex: '#3b82f6',
      description: 'Ergonomiczny stół montażowy ze stalowym stelażem i blatem roboczym.',
    },
  },

  TableESD: {
    id: 'spec-table-esd-1500x800',
    name: 'Stół montażowy ESD',
    objectType: 'TableESD',
    insertion: {
      anchor: 'footprint-center',
      elevation: 'floor',
      facing: 'front-positive-y',
      groundContactZMm: 0,
    },
    collision: {
      widthMm: 1500,
      lengthMm: 800,
      heightMm: 850,
      clearanceMarginMm: 50,
      isSolidObstacle: true,
    },
    serviceZones: [
      {
        id: 'sz-table-esd-operator',
        name: 'Strefa obsługi ESD',
        type: 'operator-standing',
        offsetMm: { x: 0, y: 800, z: 0 },
        widthMm: 1500,
        depthMm: 800,
        heightMm: 2000,
        isErgonomicGuidelineOnly: true,
      },
    ],
    transportPorts: [
      {
        id: 'port-esd-in',
        name: 'Dojście komponentów ESD',
        type: 'input',
        relativePositionMm: { x: -750, y: 0, z: 850 },
        approachDirectionDeg: 270,
        transferElevationMm: 850,
        allowedCarriers: ['cart', 'manual-carry', 'klt-box'],
        dockingClearanceMm: { widthMm: 600, depthMm: 800 },
      },
      {
        id: 'port-esd-out',
        name: 'Zejście podzespołów ESD',
        type: 'output',
        relativePositionMm: { x: 750, y: 0, z: 850 },
        approachDirectionDeg: 90,
        transferElevationMm: 850,
        allowedCarriers: ['cart', 'manual-carry', 'klt-box'],
        dockingClearanceMm: { widthMm: 600, depthMm: 800 },
      },
    ],
    metadata: {
      source: 'built-in',
      author: 'Layout Studio Pro Standard',
      license: 'MIT',
      version: '1.0.0',
      polygonCountLimit: 1400,
      isCertifiedTechnologicalCapacity: false,
    },
    visual: {
      defaultColorHex: '#6366f1',
      description: 'Stół z blatem rozpraszającym ładunki elektrostatyczne (ESD) z uziemieniem.',
    },
  },

  TableToolRail: {
    id: 'spec-table-toolrail-1500x800',
    name: 'Stół z szyną narzędziową',
    objectType: 'TableToolRail',
    insertion: {
      anchor: 'footprint-center',
      elevation: 'floor',
      facing: 'front-positive-y',
      groundContactZMm: 0,
    },
    collision: {
      widthMm: 1500,
      lengthMm: 800,
      heightMm: 2000,
      clearanceMarginMm: 50,
      isSolidObstacle: true,
    },
    serviceZones: [
      {
        id: 'sz-table-toolrail-operator',
        name: 'Strefa obsługi z balanserami narzędzi',
        type: 'operator-standing',
        offsetMm: { x: 0, y: 800, z: 0 },
        widthMm: 1500,
        depthMm: 800,
        heightMm: 2000,
        isErgonomicGuidelineOnly: true,
      },
    ],
    transportPorts: [
      {
        id: 'port-toolrail-in',
        name: 'Podanie detali',
        type: 'input',
        relativePositionMm: { x: -750, y: 0, z: 850 },
        approachDirectionDeg: 270,
        transferElevationMm: 850,
        allowedCarriers: ['cart', 'manual-carry', 'klt-box'],
        dockingClearanceMm: { widthMm: 600, depthMm: 800 },
      },
    ],
    metadata: {
      source: 'built-in',
      author: 'Layout Studio Pro Standard',
      license: 'MIT',
      version: '1.0.0',
      polygonCountLimit: 1800,
      isCertifiedTechnologicalCapacity: false,
    },
    visual: {
      defaultColorHex: '#2563eb',
      description: 'Stół montażowy z nadbudową i szyną suwnicową pod wkrętaki pneumatyczne i elektryczne.',
    },
  },

  QualityGate: {
    id: 'spec-quality-gate-1800x900',
    name: 'Bramka kontroli jakości',
    objectType: 'QualityGate',
    insertion: {
      anchor: 'footprint-center',
      elevation: 'floor',
      facing: 'front-positive-y',
      groundContactZMm: 0,
    },
    collision: {
      widthMm: 1800,
      lengthMm: 900,
      heightMm: 2100,
      clearanceMarginMm: 80,
      isSolidObstacle: true,
    },
    serviceZones: [
      {
        id: 'sz-qgate-inspector',
        name: 'Strefa kontrolera jakości',
        type: 'operator-standing',
        offsetMm: { x: 0, y: 850, z: 0 },
        widthMm: 1800,
        depthMm: 900,
        heightMm: 2000,
        isErgonomicGuidelineOnly: true,
      },
    ],
    transportPorts: [
      {
        id: 'port-qgate-in',
        name: 'Wejście z linii',
        type: 'input',
        relativePositionMm: { x: -900, y: 0, z: 900 },
        approachDirectionDeg: 270,
        transferElevationMm: 900,
        allowedCarriers: ['roller', 'cart', 'manual-carry'],
        dockingClearanceMm: { widthMm: 800, depthMm: 900 },
      },
      {
        id: 'port-qgate-out',
        name: 'Wyjście po zatwierdzeniu (OK)',
        type: 'output',
        relativePositionMm: { x: 900, y: 0, z: 900 },
        approachDirectionDeg: 90,
        transferElevationMm: 900,
        allowedCarriers: ['roller', 'cart', 'manual-carry'],
        dockingClearanceMm: { widthMm: 800, depthMm: 900 },
      },
    ],
    metadata: {
      source: 'built-in',
      author: 'Layout Studio Pro Standard',
      license: 'MIT',
      version: '1.0.0',
      polygonCountLimit: 2200,
      isCertifiedTechnologicalCapacity: false,
    },
    visual: {
      defaultColorHex: '#10b981',
      description: 'Stanowisko inspekcji ze specjalistycznym oświetleniem cieniowym i panelem wizyjnym.',
    },
  },

  ReworkStation: {
    id: 'spec-rework-station-1500x800',
    name: 'Stanowisko naprawcze (Rework)',
    objectType: 'ReworkStation',
    insertion: {
      anchor: 'footprint-center',
      elevation: 'floor',
      facing: 'front-positive-y',
      groundContactZMm: 0,
    },
    collision: {
      widthMm: 1500,
      lengthMm: 800,
      heightMm: 1900,
      clearanceMarginMm: 60,
      isSolidObstacle: true,
    },
    serviceZones: [
      {
        id: 'sz-rework-operator',
        name: 'Strefa technika napraw',
        type: 'operator-standing',
        offsetMm: { x: 0, y: 800, z: 0 },
        widthMm: 1500,
        depthMm: 800,
        heightMm: 2000,
        isErgonomicGuidelineOnly: true,
      },
    ],
    transportPorts: [
      {
        id: 'port-rework-in',
        name: 'Przyjęcie detali niezgodnych (NOK)',
        type: 'input',
        relativePositionMm: { x: 0, y: -400, z: 850 },
        approachDirectionDeg: 180,
        transferElevationMm: 850,
        allowedCarriers: ['cart', 'klt-box', 'manual-carry'],
        dockingClearanceMm: { widthMm: 600, depthMm: 600 },
      },
    ],
    metadata: {
      source: 'built-in',
      author: 'Layout Studio Pro Standard',
      license: 'MIT',
      version: '1.0.0',
      polygonCountLimit: 1600,
      isCertifiedTechnologicalCapacity: false,
    },
    visual: {
      defaultColorHex: '#f59e0b',
      description: 'Wydzielone stanowisko do diagnozy i naprawy komponentów niezgodnych.',
    },
  },

  FlowRackFIFO2Tier: {
    id: 'spec-fifo-2tier-1200x1000',
    name: 'Regał przepływowy FIFO (2 półki)',
    objectType: 'FlowRackFIFO2Tier',
    insertion: {
      anchor: 'footprint-center',
      elevation: 'floor',
      facing: 'front-positive-y',
      groundContactZMm: 0,
    },
    collision: {
      widthMm: 1200,
      lengthMm: 1000,
      heightMm: 1400,
      clearanceMarginMm: 50,
      isSolidObstacle: true,
    },
    serviceZones: [
      {
        id: 'sz-fifo2-picking',
        name: 'Strefa pobierania przez operatora',
        type: 'operator-standing',
        offsetMm: { x: 0, y: 700, z: 0 },
        widthMm: 1200,
        depthMm: 600,
        heightMm: 2000,
        isErgonomicGuidelineOnly: true,
      },
      {
        id: 'sz-fifo2-replenish',
        name: 'Strefa załadunku logistyki',
        type: 'loading-unloading',
        offsetMm: { x: 0, y: -700, z: 0 },
        widthMm: 1200,
        depthMm: 800,
        heightMm: 2000,
        isErgonomicGuidelineOnly: true,
      },
    ],
    transportPorts: [
      {
        id: 'port-fifo2-loading',
        name: 'Port załadunku FIFO (tył)',
        type: 'input',
        relativePositionMm: { x: 0, y: -500, z: 1000 },
        approachDirectionDeg: 180,
        transferElevationMm: 1000,
        allowedCarriers: ['cart', 'agv', 'klt-box'],
        dockingClearanceMm: { widthMm: 1200, depthMm: 800 },
      },
      {
        id: 'port-fifo2-pick',
        name: 'Port pobierania FIFO (przód)',
        type: 'output',
        relativePositionMm: { x: 0, y: 500, z: 800 },
        approachDirectionDeg: 0,
        transferElevationMm: 800,
        allowedCarriers: ['manual-carry', 'klt-box'],
        dockingClearanceMm: { widthMm: 1200, depthMm: 600 },
      },
    ],
    metadata: {
      source: 'built-in',
      author: 'Layout Studio Pro Standard',
      license: 'MIT',
      version: '1.0.0',
      polygonCountLimit: 1500,
      isCertifiedTechnologicalCapacity: false,
    },
    visual: {
      defaultColorHex: '#0ea5e9',
      description: 'Grawitacyjny regał przepływowy rolkowy FIFO o 2 poziomach składowania KLT.',
    },
  },

  FlowRackFIFO3Tier: {
    id: 'spec-fifo-3tier-1200x1000',
    name: 'Regał przepływowy FIFO (3 półki)',
    objectType: 'FlowRackFIFO3Tier',
    insertion: {
      anchor: 'footprint-center',
      elevation: 'floor',
      facing: 'front-positive-y',
      groundContactZMm: 0,
    },
    collision: {
      widthMm: 1200,
      lengthMm: 1000,
      heightMm: 1700,
      clearanceMarginMm: 50,
      isSolidObstacle: true,
    },
    serviceZones: [
      {
        id: 'sz-fifo3-picking',
        name: 'Strefa pobierania',
        type: 'operator-standing',
        offsetMm: { x: 0, y: 700, z: 0 },
        widthMm: 1200,
        depthMm: 600,
        heightMm: 2000,
        isErgonomicGuidelineOnly: true,
      },
      {
        id: 'sz-fifo3-replenish',
        name: 'Strefa zatowarowania',
        type: 'loading-unloading',
        offsetMm: { x: 0, y: -700, z: 0 },
        widthMm: 1200,
        depthMm: 800,
        heightMm: 2000,
        isErgonomicGuidelineOnly: true,
      },
    ],
    transportPorts: [
      {
        id: 'port-fifo3-loading',
        name: 'Port zasilania (tył)',
        type: 'input',
        relativePositionMm: { x: 0, y: -500, z: 1200 },
        approachDirectionDeg: 180,
        transferElevationMm: 1200,
        allowedCarriers: ['cart', 'agv', 'klt-box'],
        dockingClearanceMm: { widthMm: 1200, depthMm: 800 },
      },
      {
        id: 'port-fifo3-pick',
        name: 'Port odbioru (przód)',
        type: 'output',
        relativePositionMm: { x: 0, y: 500, z: 750 },
        approachDirectionDeg: 0,
        transferElevationMm: 750,
        allowedCarriers: ['manual-carry', 'klt-box'],
        dockingClearanceMm: { widthMm: 1200, depthMm: 600 },
      },
    ],
    metadata: {
      source: 'built-in',
      author: 'Layout Studio Pro Standard',
      license: 'MIT',
      version: '1.0.0',
      polygonCountLimit: 1900,
      isCertifiedTechnologicalCapacity: false,
    },
    visual: {
      defaultColorHex: '#0284c7',
      description: 'Grawitacyjny regał przepływowy rolkowy FIFO o 3 poziomach na pojemniki KLT.',
    },
  },

  RollerConveyorGravity: {
    id: 'spec-roller-gravity-2000x600',
    name: 'Przenośnik rolkowy grawitacyjny',
    objectType: 'RollerConveyorGravity',
    insertion: {
      anchor: 'footprint-center',
      elevation: 'floor',
      facing: 'front-positive-x',
      groundContactZMm: 0,
    },
    collision: {
      widthMm: 2000,
      lengthMm: 600,
      heightMm: 800,
      clearanceMarginMm: 60,
      isSolidObstacle: true,
    },
    serviceZones: [],
    transportPorts: [
      {
        id: 'port-roller-in',
        name: 'Wlot przenośnika',
        type: 'input',
        relativePositionMm: { x: -1000, y: 0, z: 800 },
        approachDirectionDeg: 270,
        transferElevationMm: 800,
        allowedCarriers: ['roller', 'manual-carry', 'klt-box'],
        dockingClearanceMm: { widthMm: 600, depthMm: 600 },
      },
      {
        id: 'port-roller-out',
        name: 'Wylot przenośnika',
        type: 'output',
        relativePositionMm: { x: 1000, y: 0, z: 750 },
        approachDirectionDeg: 90,
        transferElevationMm: 750,
        allowedCarriers: ['roller', 'manual-carry', 'klt-box'],
        dockingClearanceMm: { widthMm: 600, depthMm: 600 },
      },
    ],
    metadata: {
      source: 'built-in',
      author: 'Layout Studio Pro Standard',
      license: 'MIT',
      version: '1.0.0',
      polygonCountLimit: 2500,
      isCertifiedTechnologicalCapacity: false,
    },
    visual: {
      defaultColorHex: '#64748b',
      description: 'Segment przenośnika nienapędzanego ze stalowymi rolkami i spadkiem grawitacyjnym.',
    },
  },

  RollerConveyorMotorized: {
    id: 'spec-roller-motorized-2000x600',
    name: 'Przenośnik rolkowy napędzany',
    objectType: 'RollerConveyorMotorized',
    insertion: {
      anchor: 'footprint-center',
      elevation: 'floor',
      facing: 'front-positive-x',
      groundContactZMm: 0,
    },
    collision: {
      widthMm: 2000,
      lengthMm: 600,
      heightMm: 800,
      clearanceMarginMm: 70,
      isSolidObstacle: true,
    },
    serviceZones: [
      {
        id: 'sz-motor-maintenance',
        name: 'Dojście serwisowe napędu',
        type: 'maintenance-access',
        offsetMm: { x: 0, y: 500, z: 0 },
        widthMm: 800,
        depthMm: 600,
        heightMm: 1800,
        isErgonomicGuidelineOnly: true,
      },
    ],
    transportPorts: [
      {
        id: 'port-motor-in',
        name: 'Wlot napędzany',
        type: 'input',
        relativePositionMm: { x: -1000, y: 0, z: 800 },
        approachDirectionDeg: 270,
        transferElevationMm: 800,
        allowedCarriers: ['roller', 'agv', 'klt-box'],
        dockingClearanceMm: { widthMm: 600, depthMm: 600 },
      },
      {
        id: 'port-motor-out',
        name: 'Wylot napędzany',
        type: 'output',
        relativePositionMm: { x: 1000, y: 0, z: 800 },
        approachDirectionDeg: 90,
        transferElevationMm: 800,
        allowedCarriers: ['roller', 'agv', 'klt-box'],
        dockingClearanceMm: { widthMm: 600, depthMm: 600 },
      },
    ],
    metadata: {
      source: 'built-in',
      author: 'Layout Studio Pro Standard',
      license: 'MIT',
      version: '1.0.0',
      polygonCountLimit: 2800,
      isCertifiedTechnologicalCapacity: false,
    },
    visual: {
      defaultColorHex: '#475569',
      description: 'Elektryczny segment rolkowy z elektrobębnem i fotokomórkami obecności detalu.',
    },
  },

  PalletEuroFloorMark: {
    id: 'spec-pallet-euro-1200x800',
    name: 'Pole odkładcze palety EUR (posadzkowe)',
    objectType: 'PalletEuroFloorMark',
    insertion: {
      anchor: 'footprint-center',
      elevation: 'floor',
      facing: 'front-positive-y',
      groundContactZMm: 0,
    },
    collision: {
      widthMm: 1200,
      lengthMm: 800,
      heightMm: 144,
      clearanceMarginMm: 100,
      isSolidObstacle: true,
    },
    serviceZones: [],
    transportPorts: [
      {
        id: 'port-pallet-fork',
        name: 'Dojazd wózkiem paletowym / widłowym',
        type: 'bidirectional',
        relativePositionMm: { x: 0, y: 500, z: 144 },
        approachDirectionDeg: 0,
        transferElevationMm: 144,
        allowedCarriers: ['forklift', 'cart', 'pallet', 'agv'],
        dockingClearanceMm: { widthMm: 1400, depthMm: 1600 },
      },
    ],
    metadata: {
      source: 'built-in',
      author: 'Layout Studio Pro Standard',
      license: 'MIT',
      version: '1.0.0',
      polygonCountLimit: 800,
      isCertifiedTechnologicalCapacity: false,
    },
    visual: {
      defaultColorHex: '#d97706',
      description: 'Wyznaczone żółto-czarną taśmą miejsce odkładcze na standardową europaletę 1200x800 mm.',
    },
  },

  OperatorErgoMat: {
    id: 'spec-ergo-mat-900x600',
    name: 'Mata ergonomiczna operatora',
    objectType: 'OperatorErgoMat',
    insertion: {
      anchor: 'footprint-center',
      elevation: 'floor',
      facing: 'front-positive-y',
      groundContactZMm: 0,
    },
    collision: {
      widthMm: 900,
      lengthMm: 600,
      heightMm: 15,
      clearanceMarginMm: 0,
      isSolidObstacle: false, // Walkable floor mat
    },
    serviceZones: [
      {
        id: 'sz-ergo-mat-standing',
        name: 'Obszar stania pracownika',
        type: 'operator-standing',
        offsetMm: { x: 0, y: 0, z: 0 },
        widthMm: 900,
        depthMm: 600,
        heightMm: 2000,
        isErgonomicGuidelineOnly: true,
      },
    ],
    transportPorts: [],
    metadata: {
      source: 'built-in',
      author: 'Layout Studio Pro Standard',
      license: 'MIT',
      version: '1.0.0',
      polygonCountLimit: 400,
      isCertifiedTechnologicalCapacity: false,
    },
    visual: {
      defaultColorHex: '#334155',
      description: 'Poliuretanowa mata antyzmęczeniowa poprawiająca komfort wielogodzinnej pracy stojącej.',
    },
  },

  Shadowboard5S: {
    id: 'spec-shadowboard-1000x300',
    name: 'Tablica cieni 5S na narzędzia',
    objectType: 'Shadowboard5S',
    insertion: {
      anchor: 'footprint-center',
      elevation: 'floor',
      facing: 'front-positive-y',
      groundContactZMm: 0,
    },
    collision: {
      widthMm: 1000,
      lengthMm: 300,
      heightMm: 1800,
      clearanceMarginMm: 50,
      isSolidObstacle: true,
    },
    serviceZones: [
      {
        id: 'sz-shadowboard-reach',
        name: 'Strefa sięgania po narzędzia',
        type: 'operator-standing',
        offsetMm: { x: 0, y: 400, z: 0 },
        widthMm: 1000,
        depthMm: 500,
        heightMm: 2000,
        isErgonomicGuidelineOnly: true,
      },
    ],
    transportPorts: [],
    metadata: {
      source: 'built-in',
      author: 'Layout Studio Pro Standard',
      license: 'MIT',
      version: '1.0.0',
      polygonCountLimit: 1100,
      isCertifiedTechnologicalCapacity: false,
    },
    visual: {
      defaultColorHex: '#64748b',
      description: 'Mobilna lub wolnostojąca tablica cieniowa 5S organizująca narzędzia i przyrządy montażowe.',
    },
  },

  AndonBoard: {
    id: 'spec-andon-board-1200x200',
    name: 'Tablica świetlna Andon (sygnalizator)',
    objectType: 'AndonBoard',
    insertion: {
      anchor: 'footprint-center',
      elevation: 'suspended',
      facing: 'front-positive-y',
      groundContactZMm: 2200,
    },
    collision: {
      widthMm: 1200,
      lengthMm: 200,
      heightMm: 600,
      clearanceMarginMm: 20,
      isSolidObstacle: false, // Suspended above head
    },
    serviceZones: [],
    transportPorts: [],
    metadata: {
      source: 'built-in',
      author: 'Layout Studio Pro Standard',
      license: 'MIT',
      version: '1.0.0',
      polygonCountLimit: 600,
      isCertifiedTechnologicalCapacity: false,
    },
    visual: {
      defaultColorHex: '#ef4444',
      description: 'Elektroniczna tablica informacyjna LED prezentująca stan linii i wezwania pomocy.',
    },
  },

  MaterialIn: {
    id: 'spec-material-in-2000x1500',
    name: 'Strefa wejścia materiału (Material In)',
    objectType: 'MaterialIn',
    insertion: {
      anchor: 'footprint-center',
      elevation: 'floor',
      facing: 'front-positive-y',
      groundContactZMm: 0,
    },
    collision: {
      widthMm: 2000,
      lengthMm: 1500,
      heightMm: 200,
      clearanceMarginMm: 100,
      isSolidObstacle: false,
    },
    serviceZones: [
      {
        id: 'sz-matin-unloading',
        name: 'Strefa rozładunku dostaw',
        type: 'loading-unloading',
        offsetMm: { x: 0, y: 0, z: 0 },
        widthMm: 2000,
        depthMm: 1500,
        heightMm: 2400,
        isErgonomicGuidelineOnly: true,
      },
    ],
    transportPorts: [
      {
        id: 'port-matin-entry',
        name: 'Wjazd logistyki magazynowej',
        type: 'bidirectional',
        relativePositionMm: { x: 0, y: -750, z: 0 },
        approachDirectionDeg: 180,
        transferElevationMm: 0,
        allowedCarriers: ['forklift', 'cart', 'agv', 'pallet'],
        dockingClearanceMm: { widthMm: 2000, depthMm: 2000 },
      },
    ],
    metadata: {
      source: 'built-in',
      author: 'Layout Studio Pro Standard',
      license: 'MIT',
      version: '1.0.0',
      polygonCountLimit: 500,
      isCertifiedTechnologicalCapacity: false,
    },
    visual: {
      defaultColorHex: '#10b981',
      description: 'Obszar buforowy przyjęcia komponentów, pojemników i palet z magazynu do linii.',
    },
  },

  FinishedGoods: {
    id: 'spec-finished-goods-2000x1500',
    name: 'Strefa wyrobów gotowych (Finished Goods)',
    objectType: 'FinishedGoods',
    insertion: {
      anchor: 'footprint-center',
      elevation: 'floor',
      facing: 'front-positive-y',
      groundContactZMm: 0,
    },
    collision: {
      widthMm: 2000,
      lengthMm: 1500,
      heightMm: 200,
      clearanceMarginMm: 100,
      isSolidObstacle: false,
    },
    serviceZones: [
      {
        id: 'sz-fg-loading',
        name: 'Strefa odbioru przez transport wyrobów',
        type: 'loading-unloading',
        offsetMm: { x: 0, y: 0, z: 0 },
        widthMm: 2000,
        depthMm: 1500,
        heightMm: 2400,
        isErgonomicGuidelineOnly: true,
      },
    ],
    transportPorts: [
      {
        id: 'port-fg-pickup',
        name: 'Odbiór palet wyrobu gotowego',
        type: 'output',
        relativePositionMm: { x: 0, y: 750, z: 0 },
        approachDirectionDeg: 0,
        transferElevationMm: 0,
        allowedCarriers: ['forklift', 'cart', 'agv', 'pallet'],
        dockingClearanceMm: { widthMm: 2000, depthMm: 2000 },
      },
    ],
    metadata: {
      source: 'built-in',
      author: 'Layout Studio Pro Standard',
      license: 'MIT',
      version: '1.0.0',
      polygonCountLimit: 500,
      isCertifiedTechnologicalCapacity: false,
    },
    visual: {
      defaultColorHex: '#8b5cf6',
      description: 'Wyznaczona strefa buforowa do odkładania przetestowanych i spakowanych wyrobów gotowych.',
    },
  },
};

// ============================================================================
// 9. HELPER FUNCTIONS AND VALIDATION
// ============================================================================

/** Returns the standard specification for a given object type, or a generic fallback. */
export function getEquipmentStandardSpec(type: ObjectType): EquipmentStandardSpec {
  const spec = DEFAULT_EQUIPMENT_SPECS[type];
  if (spec) return spec;

  // Fallback specification
  return {
    id: `spec-generic-${type}`,
    name: `Wyposażenie ${type}`,
    objectType: type,
    insertion: {
      anchor: 'footprint-center',
      elevation: 'floor',
      facing: 'front-positive-y',
      groundContactZMm: 0,
    },
    collision: {
      widthMm: 1000,
      lengthMm: 1000,
      heightMm: 1000,
      clearanceMarginMm: 50,
      isSolidObstacle: true,
    },
    serviceZones: [],
    transportPorts: [],
    metadata: {
      source: 'built-in',
      author: 'Layout Studio Pro Standard',
      license: 'MIT',
      version: '1.0.0',
      isCertifiedTechnologicalCapacity: false,
    },
    visual: {
      defaultColorHex: '#64748b',
      description: `Domyślna specyfikacja wyposażenia typu ${type}`,
    },
  };
}

/**
 * Validates an EquipmentStandardSpec data object at runtime.
 * Ensures scale, units, collision envelopes and invariants are strictly followed.
 */
export function validateEquipmentStandardSpec(spec: unknown): EquipmentStandardSpec {
  if (!spec || typeof spec !== 'object') {
    throw new Error('EquipmentStandardSpec: wymagany obiekt specyfikacji.');
  }
  const s = spec as Record<string, any>;
  if (!s.id || typeof s.id !== 'string') throw new Error('EquipmentStandardSpec: brak poprawnego id.');
  if (!s.name || typeof s.name !== 'string') throw new Error('EquipmentStandardSpec: brak poprawnej nazwy.');
  if (!s.objectType || typeof s.objectType !== 'string') throw new Error('EquipmentStandardSpec: brak objectType.');

  // Validate insertion
  if (!s.insertion || typeof s.insertion !== 'object') throw new Error('EquipmentStandardSpec: brak punktu wstawienia (insertion).');
  if (!['footprint-center', 'bottom-left', 'top-left'].includes(s.insertion.anchor)) {
    throw new Error(`EquipmentStandardSpec: nieobsługiwany anchor '${s.insertion.anchor}'.`);
  }
  if (!['floor', 'suspended', 'tabletop'].includes(s.insertion.elevation)) {
    throw new Error(`EquipmentStandardSpec: nieobsługiwana elewacja '${s.insertion.elevation}'.`);
  }

  // Validate collision
  if (!s.collision || typeof s.collision !== 'object') throw new Error('EquipmentStandardSpec: brak obwiedni kolizji.');
  if (typeof s.collision.widthMm !== 'number' || s.collision.widthMm <= 0) {
    throw new Error('EquipmentStandardSpec: collision.widthMm musi być liczbą > 0.');
  }
  if (typeof s.collision.lengthMm !== 'number' || s.collision.lengthMm <= 0) {
    throw new Error('EquipmentStandardSpec: collision.lengthMm musi być liczbą > 0.');
  }
  if (typeof s.collision.heightMm !== 'number' || s.collision.heightMm <= 0) {
    throw new Error('EquipmentStandardSpec: collision.heightMm musi być liczbą > 0.');
  }

  // Validate metadata
  if (!s.metadata || typeof s.metadata !== 'object') throw new Error('EquipmentStandardSpec: brak metadanych.');
  if (!['built-in', 'catalog', 'custom-import', 'user-defined'].includes(s.metadata.source)) {
    throw new Error(`EquipmentStandardSpec: nieobsługiwane źródło '${s.metadata.source}'.`);
  }
  if (!['MIT', 'CC-BY-4.0', 'CC0', 'Commercial-Proprietary', 'Custom'].includes(s.metadata.license)) {
    throw new Error(`EquipmentStandardSpec: nieobsługiwana licencja '${s.metadata.license}'.`);
  }
  // Enforce technological independence invariant
  if (s.metadata.isCertifiedTechnologicalCapacity !== false) {
    throw new Error('EquipmentStandardSpec: isCertifiedTechnologicalCapacity musi być false (model wizualny nie deklaruje zdolności technologicznej).');
  }

  return s as EquipmentStandardSpec;
}

/**
 * Calculates world-coordinate 2D footprint bounding box [minX, minY, maxX, maxY] in mm,
 * taking into account object position, dimensions and rotation.
 */
export function calculateEquipmentFootprint(
  obj: LayoutObject,
  spec?: EquipmentStandardSpec
): { minX: number; minY: number; maxX: number; maxY: number; centerX: number; centerY: number } {
  const width = obj.widthMm;
  const length = obj.lengthMm;
  const centerX = obj.xMm + width / 2;
  const centerY = obj.yMm + length / 2;

  // Simple AABB calculation accounting for rotation angle
  const rad = ((obj.rotationDeg || 0) * Math.PI) / 180;
  const cos = Math.abs(Math.cos(rad));
  const sin = Math.abs(Math.sin(rad));

  const bbWidth = width * cos + length * sin;
  const bbLength = width * sin + length * cos;

  return {
    minX: centerX - bbWidth / 2,
    minY: centerY - bbLength / 2,
    maxX: centerX + bbWidth / 2,
    maxY: centerY + bbLength / 2,
    centerX,
    centerY,
  };
}

/**
 * Checks 2D collision between two layout objects with safety clearance.
 * Non-solid objects (like floor mats, markings, suspended signs) do not trigger physical collisions.
 */
export function checkEquipmentCollision2D(
  objA: LayoutObject,
  objB: LayoutObject,
  specA: EquipmentStandardSpec = getEquipmentStandardSpec(objA.type),
  specB: EquipmentStandardSpec = getEquipmentStandardSpec(objB.type)
): boolean {
  if (objA.id === objB.id) return false;
  if (!specA.collision.isSolidObstacle || !specB.collision.isSolidObstacle) return false;

  const fpA = calculateEquipmentFootprint(objA, specA);
  const fpB = calculateEquipmentFootprint(objB, specB);

  const marginA = specA.collision.clearanceMarginMm;
  const marginB = specB.collision.clearanceMarginMm;
  const margin = Math.max(marginA, marginB);

  // Check overlap of bounding boxes with clearance
  const overlapX = fpA.minX < fpB.maxX + margin && fpA.maxX > fpB.minX - margin;
  const overlapY = fpA.minY < fpB.maxY + margin && fpA.maxY > fpB.minY - margin;

  return overlapX && overlapY;
}

/**
 * Checks 3D collision between two layout objects, including elevation (Z axis).
 */
export function checkEquipmentCollision3D(
  objA: LayoutObject,
  objB: LayoutObject,
  specA: EquipmentStandardSpec = getEquipmentStandardSpec(objA.type),
  specB: EquipmentStandardSpec = getEquipmentStandardSpec(objB.type)
): boolean {
  if (!checkEquipmentCollision2D(objA, objB, specA, specB)) return false;

  // Check vertical Z collision
  const zMinA = objA.zMm;
  const zMaxA = objA.zMm + objA.heightMm;
  const zMinB = objB.zMm;
  const zMaxB = objB.zMm + objB.heightMm;

  return zMinA < zMaxB && zMaxA > zMinB;
}

/**
 * Checks collision between a layout object and a structural facility obstacle (e.g. pillar, wall).
 */
export function checkObstacleCollision(
  obj: LayoutObject,
  obstacle: Obstacle,
  spec: EquipmentStandardSpec = getEquipmentStandardSpec(obj.type)
): boolean {
  if (!spec.collision.isSolidObstacle) return false;

  const fp = calculateEquipmentFootprint(obj, spec);

  const obsMinX = obstacle.xMm;
  const obsMaxX = obstacle.xMm + obstacle.widthMm;
  const obsMinY = obstacle.yMm;
  const obsMaxY = obstacle.yMm + obstacle.lengthMm;

  const overlapX = fp.minX < obsMaxX && fp.maxX > obsMinX;
  const overlapY = fp.minY < obsMaxY && fp.maxY > obsMinY;

  return overlapX && overlapY;
}

/**
 * Calculates absolute world coordinates (X, Y, Z in mm) of an equipment transport port.
 */
export function getTransportPortWorldPosition(
  obj: LayoutObject,
  port: EquipmentTransportPort
): { xMm: number; yMm: number; zMm: number; absoluteApproachDeg: number } {
  const rad = ((obj.rotationDeg || 0) * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);

  const localX = port.relativePositionMm.x;
  const localY = port.relativePositionMm.y;

  // Rotate local offset
  const rotX = localX * cos - localY * sin;
  const rotY = localX * sin + localY * cos;

  const centerX = obj.xMm + obj.widthMm / 2;
  const centerY = obj.yMm + obj.lengthMm / 2;

  const absoluteApproachDeg = ((port.approachDirectionDeg + (obj.rotationDeg || 0)) % 360 + 360) % 360;

  return {
    xMm: Math.round(centerX + rotX),
    yMm: Math.round(centerY + rotY),
    zMm: obj.zMm + port.relativePositionMm.z,
    absoluteApproachDeg,
  };
}

/**
 * Invariant verification: asserts that visual properties (geometry, color, 3D model)
 * are completely independent of technological capabilities and times.
 */
export function assertVisualModelIndependence(
  technologicalParamsBefore: { cycleTimeSeconds?: number; standardTimeSeconds?: number; capableOperationIds?: string[] },
  technologicalParamsAfter: { cycleTimeSeconds?: number; standardTimeSeconds?: number; capableOperationIds?: string[] }
): void {
  if (technologicalParamsBefore.cycleTimeSeconds !== technologicalParamsAfter.cycleTimeSeconds) {
    throw new Error('Naruszenie niezmiennika: zmiana modelu wizualnego nie może modyfikować czasu cyklu!');
  }
  if (technologicalParamsBefore.standardTimeSeconds !== technologicalParamsAfter.standardTimeSeconds) {
    throw new Error('Naruszenie niezmiennika: zmiana modelu wizualnego nie może modyfikować czasu standardowego!');
  }
  const opsBefore = technologicalParamsBefore.capableOperationIds || [];
  const opsAfter = technologicalParamsAfter.capableOperationIds || [];
  if (opsBefore.length !== opsAfter.length || opsBefore.some((op, i) => op !== opsAfter[i])) {
    throw new Error('Naruszenie niezmiennika: zmiana modelu wizualnego nie może modyfikować zdolności operacyjnych wyposażenia!');
  }
}
