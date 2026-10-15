from typing import List, Optional, Literal, Dict, Any
from pydantic import BaseModel, Field

# --- Vessel Models ---
VesselStatus = Literal['Arriving', 'At Anchor', 'Berthing', 'Loading', 'Delayed', 'Completed']
PriorityLevel = Literal['Standard', 'Priority', 'Critical', 'Urgent']

class VesselTimelineEvent(BaseModel):
    stage: str
    time: str
    status: Literal['completed', 'current', 'scheduled']

class Vessel(BaseModel):
    id: str
    name: str
    imo: str
    flag: str
    lengthMeters: float
    draughtMeters: float
    teuCapacity: int
    cargoVolume: int
    origin: str
    destination: str
    eta: str
    etd: Optional[str] = None
    estimatedEtd: Optional[str] = None
    isEstimatedEtd: Optional[bool] = None
    status: VesselStatus
    priority: PriorityLevel
    currentBerth: Optional[str] = None
    assignedBerth: str
    predictedWaitHours: float
    demurrageRisk: Literal['Low', 'Medium', 'High']
    historicalTurnaroundHours: float
    timelineEvents: List[VesselTimelineEvent] = []
    recommendedAction: Optional[str] = None

# --- Berth Models ---
BerthStatus = Literal['Occupied', 'Available', 'Congested', 'Maintenance']

class BerthHourlyForecast(BaseModel):
    hour: str
    utilization: int

class Berth(BaseModel):
    id: str
    name: str
    lengthMeters: float
    depthMeters: float
    maxDraftMeters: float
    status: BerthStatus
    currentUtilization: int
    predictedUtilization: int
    queueCount: int
    availableCranes: int
    maxCranes: int
    currentVesselId: Optional[str] = None
    nextVesselId: Optional[str] = None
    assignedCraneIds: List[str] = []
    hourlyForecast: List[BerthHourlyForecast] = []
    riskLevel: Literal['LOW', 'MEDIUM', 'HIGH']

# --- Crane Models ---
CraneStatus = Literal['ACTIVE', 'IDLE', 'MAINTENANCE', 'FAILED']

class Crane(BaseModel):
    id: str
    name: str
    type: Literal['STS', 'Yard', 'Mobile']
    status: CraneStatus
    berthId: str
    movesPerHour: int
    utilizationPercent: int
    failureDurationHours: Optional[int] = None
    impactSeverity: Optional[Literal['Low', 'Medium', 'High', 'Critical']] = None
    assignedVesselId: Optional[str] = None
    lastMaintenance: str
    nextMaintenance: str

# --- Yard Models ---
class YardRedistribution(BaseModel):
    targetBlockId: str
    amountTeu: int
    rationale: str

class YardBlock(BaseModel):
    id: str
    name: str
    category: Literal['Dry', 'Reefer', 'Hazmat', 'Empty']
    totalTeu: int
    occupiedTeu: int
    utilizationPercent: int
    dwellTimeDays: float
    inboundTeu24h: int
    outboundTeu24h: int
    congestionRisk: Literal['Normal', 'Moderate', 'High', 'Severe']
    suggestedRedistribution: Optional[YardRedistribution] = None

# --- Congestion Forecast Models ---
class ForecastDriver(BaseModel):
    factor: str
    percentage: int
    impact: Literal['High', 'Medium', 'Low']
    detail: str

class ForecastPoint(BaseModel):
    hour: str
    B01: int
    B02: int
    B03: int
    B04: int
    B05: int
    B06: int
    threshold: int = 85

class CongestionForecastData(BaseModel):
    timeHorizon: Literal['6h', '12h', '24h', '48h', '72h']
    overallCongestionPercent: int
    riskBottleneckBerth: str
    bottleneckConfidence: int
    drivers: List[ForecastDriver]
    points: List[ForecastPoint]

# --- Optimization Models ---
class OptimizationPlanDetail(BaseModel):
    vesselId: str
    vesselName: str
    berthId: str
    cranesAssigned: int
    expectedWaitHours: float
    berthUtilizationPercent: int

class OptimizationResult(BaseModel):
    id: str
    timestamp: str
    isApplied: bool
    targetVesselId: str
    currentPlan: OptimizationPlanDetail
    optimizedPlan: OptimizationPlanDetail
    waitTimeDeltaHours: float
    waitTimeReductionPercent: float
    queueReductionCount: int
    savingsEstimateUsd: float
    rationale: str

class OptimizationRequest(BaseModel):
    vesselId: Optional[str] = None
    prioritizeDemurrage: bool = True

# --- Disruption Simulation Models ---
class SimulationScenario(BaseModel):
    id: str
    type: Literal['crane_failure', 'berth_closure', 'vessel_surge', 'vessel_delay', 'yard_capacity_reduction']
    targetEntityId: str
    targetEntityName: str
    durationHours: int
    description: str

class SimulationStepAction(BaseModel):
    order: int
    title: str
    detail: str
    targetEntity: str

class SimulationMetrics(BaseModel):
    queueCount: int
    avgWaitHours: float
    berthUtilizationPercent: int

class SimulationRecoveryPlan(BaseModel):
    id: str
    steps: List[SimulationStepAction]
    isApplied: bool
    expectedRecoveryHours: float

class SimulationResult(BaseModel):
    id: str
    scenario: SimulationScenario
    before: SimulationMetrics
    after: SimulationMetrics
    recoveryPlan: SimulationRecoveryPlan

# --- Route Models ---
class RouteCoordinates(BaseModel):
    x: float
    y: float

class RouteOption(BaseModel):
    portCode: str
    portName: str
    country: str
    distanceNm: int
    eta: str
    delayHours: float
    extraCostUsd: int
    riskLevel: Literal['Low', 'Medium', 'High', 'Critical']
    isRecommended: bool
    congestionScore: int
    rationale: str
    coordinates: RouteCoordinates

# --- Shift Planner Models ---
class ShiftPlanItem(BaseModel):
    id: str
    dayOffset: int
    shift: Literal['06-14', '14-22', '22-06']
    berthId: str
    vesselId: Optional[str] = None
    vesselName: Optional[str] = None
    assignedCranes: List[str] = []
    status: Literal['Scheduled', 'Conflict', 'Optimized', 'Maintenance']
    conflictReason: Optional[str] = None

# --- Alert Models ---
class AlertEntity(BaseModel):
    type: Literal['berth', 'vessel', 'crane', 'yard']
    id: str
    name: str

class OperationalAlert(BaseModel):
    id: str
    timestamp: str
    severity: Literal['CRITICAL', 'HIGH', 'MEDIUM', 'INFO']
    title: str
    description: str
    relatedEntity: AlertEntity
    isResolved: bool
    actionRoute: str
    actionLabel: str

# --- Port Status Summary ---
class PortStatusSummary(BaseModel):
    vesselsInPort: int
    vesselsArriving: int
    activeBerthUtilization: int
    craneAvailability: int
    yardUtilization: int
    currentQueue: int
    predictedCongestion: Literal['NORMAL', 'HIGH', 'CRITICAL']
    highRiskBerth: str
    highRiskBerthUtilization: int
    highRiskBerthPredicted: int
