export type VesselStatus = 'Arriving' | 'At Anchor' | 'Berthing' | 'Loading' | 'Delayed' | 'Completed';
export type PriorityLevel = 'Standard' | 'Priority' | 'Critical' | 'Urgent';

export interface VesselTimelineEvent {
  stage: string;
  time: string;
  status: 'completed' | 'current' | 'scheduled';
}

export interface Vessel {
  id: string;
  name: string;
  imo: string;
  flag: string;
  lengthMeters: number;
  draughtMeters: number;
  teuCapacity: number;
  cargoVolume: number; // TEU currently loaded/discharging
  origin: string;
  destination: string;
  eta: string;
  etd: string;
  estimatedEtd?: string;
  isEstimatedEtd?: boolean;
  etdRationale?: string;
  status: VesselStatus;
  priority: PriorityLevel;
  currentBerth: string | null;
  assignedBerth: string;
  predictedWaitHours: number;
  demurrageRisk: 'Low' | 'Medium' | 'High';
  historicalTurnaroundHours: number;
  timelineEvents: VesselTimelineEvent[];
  recommendedAction?: string;
  // Ship Agent Ownership & Voyage Details
  ownerId?: string; // 'demo-agent' or other agency user id
  shippingCompany?: string; // e.g. 'Apex Maritime Lines'
  callSign?: string;
  vesselType?: string; // e.g. 'Container Ship (ULCV)', 'Panamax Feeder'
  voyageNumber?: string;
  previousPort?: string;
  nextPort?: string;
  requestedBerth?: string;
  requestedArrivalTime?: string;
  berthDurationHours?: number;
  requestedCranes?: number;
  cargoType?: string;
  cargoQuantity?: string;
  containersLoaded?: number;
  containersTotal?: number;
  dangerousGoods?: boolean;
  specialNotes?: string;
}

export type BerthStatus = 'Occupied' | 'Available' | 'Congested' | 'Maintenance';

export interface BerthHourlyForecast {
  hour: string;
  utilization: number;
}

export interface Berth {
  id: string;
  name: string;
  lengthMeters: number;
  depthMeters: number;
  maxDraftMeters: number;
  status: BerthStatus;
  currentUtilization: number;
  predictedUtilization: number;
  queueCount: number;
  availableCranes: number;
  maxCranes: number;
  currentVesselId: string | null;
  nextVesselId: string | null;
  assignedCraneIds: string[];
  hourlyForecast: BerthHourlyForecast[];
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
}

export type CraneStatus = 'ACTIVE' | 'IDLE' | 'MAINTENANCE' | 'FAILED';

export interface Crane {
  id: string;
  name: string;
  type: 'STS' | 'Yard' | 'Mobile';
  status: CraneStatus;
  berthId: string;
  movesPerHour: number;
  utilizationPercent: number;
  failureDurationHours?: number;
  impactSeverity?: 'Low' | 'Medium' | 'High' | 'Critical';
  assignedVesselId?: string | null;
  lastMaintenance: string;
  nextMaintenance: string;
}

export interface YardBlock {
  id: string;
  name: string;
  category: 'Dry' | 'Reefer' | 'Hazmat' | 'Empty';
  totalTeu: number;
  occupiedTeu: number;
  utilizationPercent: number;
  dwellTimeDays: number;
  inboundTeu24h: number;
  outboundTeu24h: number;
  congestionRisk: 'Normal' | 'Moderate' | 'High' | 'Severe';
  suggestedRedistribution?: {
    targetBlockId: string;
    amountTeu: number;
    rationale: string;
  };
}

export interface ForecastDriver {
  factor: string;
  percentage: number;
  impact: 'High' | 'Medium' | 'Low';
  detail: string;
}

export interface CongestionForecastData {
  timeHorizon: '6h' | '12h' | '24h' | '48h' | '72h';
  overallCongestionPercent: number;
  riskBottleneckBerth: string;
  bottleneckConfidence: number;
  drivers: ForecastDriver[];
  points: {
    hour: string;
    B01: number;
    B02: number;
    B03: number;
    B04: number;
    B05: number;
    B06: number;
    threshold: number;
  }[];
}

export interface OptimizationPlanDetail {
  vesselId: string;
  vesselName: string;
  berthId: string;
  cranesAssigned: number;
  expectedWaitHours: number;
  berthUtilizationPercent: number;
}

export interface OptimizationResult {
  id: string;
  timestamp: string;
  isApplied: boolean;
  targetVesselId: string;
  currentPlan: OptimizationPlanDetail;
  optimizedPlan: OptimizationPlanDetail;
  waitTimeDeltaHours: number;
  waitTimeReductionPercent: number;
  queueReductionCount: number;
  savingsEstimateUsd: number;
  rationale: string;
}

export interface SimulationScenario {
  id: string;
  type: 'crane_failure' | 'berth_closure' | 'vessel_surge' | 'vessel_delay' | 'yard_capacity_reduction';
  targetEntityId: string;
  targetEntityName: string;
  durationHours: number;
  description: string;
}

export interface SimulationStepAction {
  order: number;
  title: string;
  detail: string;
  targetEntity: string;
}

export interface SimulationResult {
  id: string;
  scenario: SimulationScenario;
  before: {
    queueCount: number;
    avgWaitHours: number;
    berthUtilizationPercent: number;
  };
  after: {
    queueCount: number;
    avgWaitHours: number;
    berthUtilizationPercent: number;
  };
  recoveryPlan: {
    id: string;
    steps: SimulationStepAction[];
    isApplied: boolean;
    expectedRecoveryHours: number;
  };
}

export interface RouteOption {
  portCode: string;
  portName: string;
  country: string;
  distanceNm: number;
  eta: string;
  delayHours: number;
  extraCostUsd: number;
  riskLevel: 'Low' | 'Medium' | 'High' | 'Critical';
  isRecommended: boolean;
  congestionScore: number;
  rationale: string;
  coordinates: { x: number; y: number };
}

export interface ShiftPlanItem {
  id: string;
  dayOffset: number; // 0 = Today, 1 = Tomorrow, 2 = +2 Days, 3 = +3 Days
  shift: '06-14' | '14-22' | '22-06';
  berthId: string;
  vesselId: string | null;
  vesselName: string | null;
  assignedCranes: string[];
  status: 'Scheduled' | 'Conflict' | 'Optimized' | 'Maintenance';
  conflictReason?: string;
}

export interface OperationalAlert {
  id: string;
  timestamp: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'INFO';
  title: string;
  description: string;
  relatedEntity: {
    type: 'berth' | 'vessel' | 'crane' | 'yard';
    id: string;
    name: string;
  };
  isResolved: boolean;
  actionRoute: string;
  actionLabel: string;
}

export interface CopilotTableBlock {
  title?: string;
  columns: string[];
  rows: (string | number)[][];
}

export interface CopilotChartBlock {
  chartType: 'bar' | 'line' | 'pie';
  title?: string;
  data: { name: string; value: number; [key: string]: any }[];
  dataKey?: string;
  categoryKey?: string;
}

export interface CopilotMetricItem {
  label: string;
  value: string | number;
  subtext?: string;
  isPositive?: boolean;
}

export interface CopilotStructuredBlock {
  type: 'table' | 'chart' | 'metrics';
  title?: string;
  columns?: string[];
  rows?: (string | number)[][];
  chartType?: 'bar' | 'line' | 'pie';
  data?: { name: string; value: number; [key: string]: any }[];
  metrics?: CopilotMetricItem[];
}

export interface CopilotStructuredResponse {
  message: string;
  blocks?: CopilotStructuredBlock[];
  suggestedActions?: {
    label: string;
    actionRoute?: string;
    prompt?: string;
    requiresConfirmation?: boolean;
  }[];
}

export interface CopilotMessage {
  id: string;
  sender: 'user' | 'gemini';
  text: string;
  timestamp: string;
  structured?: CopilotStructuredResponse;
  toolCalls?: {
    toolName: string;
    parameters?: Record<string, any>;
    resultSummary: string;
  }[];
  suggestedActions?: {
    label: string;
    actionRoute?: string;
    actionType?: string;
    payload?: any;
    prompt?: string;
    requiresConfirmation?: boolean;
  }[];
  isStreaming?: boolean;
}

export type BerthRequestStatus = 'Pending' | 'Under Review' | 'Approved' | 'Changed' | 'Rejected';

export interface BerthRequest {
  id: string;
  vesselId: string;
  vesselName: string;
  imo: string;
  requestedBerth: string;
  requestedArrivalTime: string;
  estimatedDurationHours: number;
  requestedCranes: number;
  cargoType: string;
  status: BerthRequestStatus;
  submittedAt: string;
  reviewedAt?: string;
  assignedBerth?: string;
  notes?: string;
  ownerId: string;
}

export type DocumentType =
  | 'Bill of Lading'
  | 'Cargo Manifest'
  | 'Vessel Declaration'
  | 'Arrival Notice'
  | 'Dangerous Goods Declaration'
  | 'Customs Clearance'
  | 'Crew List'
  | 'Other';

export interface ShippingDocument {
  id: string;
  name: string;
  vesselId: string;
  vesselName: string;
  type: DocumentType;
  status: 'Approved' | 'Under Review' | 'Required' | 'Draft';
  uploadedDate: string;
  fileSize: string;
  fileUrl?: string;
  ownerId: string;
}

