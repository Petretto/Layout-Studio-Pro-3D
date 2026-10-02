export type LayoutType = 'UShape' | 'Linear' | 'LShape' | 'ProcessFlow';
export type TimeUnit = 's' | 'min' | 'h';
export type ContainerType = 'BoxKLT' | 'Pallet' | 'Tray' | 'Carton';
export type ObjectType = 
  | 'Table'
  | 'TableESD'
  | 'TableToolRail'
  | 'QualityGate'
  | 'ReworkStation'
  | 'FlowRackFIFO2Tier'
  | 'FlowRackFIFO3Tier'
  | 'RollerConveyorGravity'
  | 'RollerConveyorMotorized'
  | 'PalletEuroFloorMark'
  | 'OperatorErgoMat'
  | 'Shadowboard5S'
  | 'AndonBoard'
  | 'MaterialIn'
  | 'FinishedGoods';

export interface ProcessStep {
  flowPosition?: { x: number; y: number };
  id: string;
  name: string;
  standardTimeSeconds: number;
  vaTimeSeconds: number; // Value Added
  nvaTimeSeconds: number; // Non-Value Added
  sequenceNumber: number;
  predecessorIds: string[];
  assignedWorkstationId?: string;
}

export interface BOMComponent {
  id: string;
  partNumber: string;
  name: string;
  quantityPerUnit: number;
  container: ContainerType;
  packageQuantity: number;
  associatedProcessStepId: string;
  unitCost: number;
}

export interface Workstation {
  operators?: number;
  parallelStations?: number;
  baseCycleSeconds?: number;
  effectiveCycleSeconds?: number;
  id: string;
  name: string;
  sequenceIndex: number;
  assignedStepIds: string[];
  cycleTimeSeconds: number;
  isBottleneck: boolean;
  xMm: number;
  yMm: number;
}

export interface LayoutObject {
  id: string;
  name: string;
  type: ObjectType;
  xMm: number;
  yMm: number;
  zMm: number;
  widthMm: number;
  lengthMm: number;
  heightMm: number;
  rotationDeg: number;
  colorHex: string;
  workstationId?: string;
}

export interface FacilityConfig {
  widthMm: number;
  lengthMm: number;
  heightMm: number;
  gridSizeMm: number;
}

export interface Obstacle {
  id: string;
  name: string;
  xMm: number;
  yMm: number;
  widthMm: number;
  lengthMm: number;
  heightMm: number;
}

export interface DemandConfig {
  yearlyDemand: number;
  workingDaysPerYear: number;
  shiftsPerDay: number;
  hoursPerShift: number;
  plannedBreaksMinutesPerShift: number;
  oeePercent: number;
}

export interface LineBalancingResult {
  taktTimeSeconds: number;
  totalWorkContentSeconds: number;
  theoreticalMinWorkstations: number;
  actualWorkstationsCount: number;
  lineEfficiencyPercent: number;
  balanceDelayPercent: number;
  bottleneckStationName: string;
  bottleneckCycleTimeSeconds: number;
  workstations: Workstation[];
}

export interface SpaghettiMetrics {
  cycleDistanceMeters: number;
  shiftDistanceKm: number;
  annualDistanceKm: number;
  mudaRating: 'Doskonały' | 'Umiarkowany' | 'Wysoki Koszt Strat';
  waypoints: { x: number; y: number; label: string }[];
}

export interface ProjectData {
  workstationSettings?: Record<string, { operators: number; parallelStations: number; assistedCycleSeconds?: number }>;
  schemaVersion?: number;
  timeUnit?: TimeUnit;
  algorithm?: 'RPW' | 'LCR' | 'Manual';
  currency?: 'PLN' | 'EUR' | 'USD';
  layoutMode?: 'auto' | 'manual';
  layoutSettings?: { tableWidthMm: number; tableLengthMm: number; spacingMm: number; aisleMm: number };
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  targetLayoutType: LayoutType;
  facility: FacilityConfig;
  obstacles: Obstacle[];
  demand: DemandConfig;
  processSteps: ProcessStep[];
  bom: BOMComponent[];
  layoutObjects: LayoutObject[];
  balancing?: LineBalancingResult;
  spaghetti?: SpaghettiMetrics;
}
