/**
 * PortsPilot AI - Operational Disruption & What-If Simulation Engine
 *
 * Answers: "What happens if I change this operational decision?"
 *
 * Simulates adjustments across:
 * - STS Cranes (+/-)
 * - Truck Flow & Gate Velocity (trucks/hr)
 * - Container Volume Multiplier (%)
 * - Berth Reallocation (Diverting bottleneck vessels)
 * - Stevedore Shift Gangs (Single vs Double shift)
 * - Vessel Arrival Surges / Delays
 * - Weather & Sea-State Friction
 *
 * Produces genuine mathematically calculated Before vs After metrics,
 * exact deltas, financial demurrage impact, and tailored recovery action steps.
 */

export interface SimulationParams {
  // Operational Levers
  craneAdjustment: number;             // -3 to +3 cranes
  truckFlowPerHour: number;            // 20 to 120 trucks/hour (60 baseline)
  containerVolumeMultiplier: number;   // 0.7 to 1.5 (1.0 = 100%)
  reallocateBottleneckVessel: boolean; // Divert Ocean Star from B04 to B02
  doubleShiftGangs: boolean;           // Deploy double stevedore gangs
  vesselSurgeCount: number;            // -2 to +4 arrivals
  weatherSeverity: 'Calm' | 'Moderate' | 'Severe';

  // Presets
  scenarioPreset?: 'custom' | 'crane_failure' | 'berth_closure' | 'vessel_surge' | 'yard_capacity_reduction';
  durationHours?: number;              // Outage or simulation duration (hours)
}

export interface SimulationMetricComparison {
  queueCount: number;
  avgWaitHours: number;
  berthUtilizationPercent: number;
  overallCongestionPercent: number;
  demurrageExposureUsd: number;
}

export interface SimulationStepAction {
  order: number;
  title: string;
  detail: string;
  targetEntity: string;
}

export interface SimulationExecutionResult {
  scenarioName: string;
  durationHours: number;
  before: SimulationMetricComparison;
  after: SimulationMetricComparison;
  deltas: {
    queueDelta: number;
    waitHoursDelta: number;
    berthUtilDelta: number;
    congestionDelta: number;
    demurrageDeltaUsd: number;
    isImprovement: boolean;
  };
  operationalRationale: string;
  recoveryPlan: {
    id: string;
    expectedRecoveryHours: number;
    steps: SimulationStepAction[];
    isApplied: boolean;
  };
}

export class SimulationEngine {
  /**
   * Baseline state representing current normal/strained port baseline.
   */
  public static getBaseline(isOptimized = false): SimulationMetricComparison {
    if (isOptimized) {
      return {
        queueCount: 4,
        avgWaitHours: 6.8,
        berthUtilizationPercent: 74,
        overallCongestionPercent: 62,
        demurrageExposureUsd: 62000,
      };
    }

    return {
      queueCount: 7,
      avgWaitHours: 11.4,
      berthUtilizationPercent: 82,
      overallCongestionPercent: 74,
      demurrageExposureUsd: 185000,
    };
  }

  /**
   * Executes the full operational simulation and calculates Before vs After.
   */
  public static runSimulation(params: SimulationParams, isCurrentlyOptimized = false): SimulationExecutionResult {
    const before = this.getBaseline(isCurrentlyOptimized);

    // 1. Calculate Capacity Adjustment Multiplier
    // Baseline: 4 active STS cranes at target quays.
    // Each crane adds ~22% capacity.
    const craneFactor = 1.0 + (params.craneAdjustment * 0.22);

    // Stevedore Gangs: double gangs increase handling pace by +35%
    const gangFactor = params.doubleShiftGangs ? 1.35 : 1.0;

    // Gate & Trucking Flow:
    // 60 trucks/hr is 1.0. Lower rates create yard bottlenecking; higher rates accelerate evacuation.
    const truckFactor = Math.max(0.75, Math.min(1.25, 0.75 + (params.truckFlowPerHour / 120)));

    // Weather impact on crane cycles:
    const weatherFactor = params.weatherSeverity === 'Severe' ? 0.70 : params.weatherSeverity === 'Moderate' ? 0.85 : 1.0;

    // Effective processing capacity multiplier
    const effectiveCapacity = Math.max(0.4, craneFactor * gangFactor * truckFactor * weatherFactor);

    // 2. Calculate Workload Pressure Multiplier
    const volumeFactor = Math.max(0.5, params.containerVolumeMultiplier);
    const surgePressure = params.vesselSurgeCount * 1.5;

    // 3. Berth Reallocation Credit
    // If Ocean Star (14,500 TEU) is diverted from B04 to B02:
    const reallocationWaitCredit = params.reallocateBottleneckVessel ? -4.6 : 0;
    const reallocationUtilCredit = params.reallocateBottleneckVessel ? -14 : 0;
    const reallocationQueueCredit = params.reallocateBottleneckVessel ? -3 : 0;

    // 4. Calculate Projected After Queue
    const netQueueChange = Math.round(
      surgePressure +
      ((volumeFactor - 1.0) * 8) -
      (params.craneAdjustment * 1.5) -
      (params.doubleShiftGangs ? 1.5 : 0) +
      (params.weatherSeverity === 'Severe' ? 3 : params.weatherSeverity === 'Moderate' ? 1 : 0) +
      reallocationQueueCredit
    );

    const afterQueue = Math.max(0, Math.min(22, before.queueCount + netQueueChange));

    // 5. Calculate Projected After Wait Time
    // Wait scales with queue length divided by effective handling capacity
    const queueRatio = before.queueCount > 0 ? (afterQueue / before.queueCount) : 1;
    const rawWait = (before.avgWaitHours * queueRatio) / effectiveCapacity + reallocationWaitCredit;
    const afterWait = Number(Math.max(1.5, Math.min(36, rawWait)).toFixed(1));

    // 6. Calculate Projected After Berth Utilization
    const utilChange = (netQueueChange * 2.5) + ((1 / effectiveCapacity - 1) * 15) + reallocationUtilCredit;
    const afterBerthUtil = Math.round(Math.max(35, Math.min(99, before.berthUtilizationPercent + utilChange)));

    // 7. Calculate Projected Overall Congestion %
    const afterCongestion = Math.round(Math.max(30, Math.min(98, (afterBerthUtil * 0.7) + (afterQueue * 3.5))));

    // 8. Calculate Demurrage Exposure ($2,400/hr per delayed vessel)
    const afterDemurrage = Math.round(afterQueue * afterWait * 2400);

    // Deltas
    const queueDelta = afterQueue - before.queueCount;
    const waitHoursDelta = Number((afterWait - before.avgWaitHours).toFixed(1));
    const berthUtilDelta = afterBerthUtil - before.berthUtilizationPercent;
    const congestionDelta = afterCongestion - before.overallCongestionPercent;
    const demurrageDeltaUsd = afterDemurrage - before.demurrageExposureUsd;
    const isImprovement = waitHoursDelta < 0 || queueDelta < 0;

    // Build Operational Rationale
    let rationale = '';
    if (params.craneAdjustment > 0 && params.reallocateBottleneckVessel) {
      rationale = `Adding ${params.craneAdjustment} STS cranes and reallocating peak ULCV vessel to Berth B02 increases handling velocity by +${Math.round((effectiveCapacity - 1) * 100)}%, reducing anchorage wait by ${Math.abs(waitHoursDelta)}h and preventing $${Math.abs(demurrageDeltaUsd).toLocaleString()} in demurrage fees.`;
    } else if (params.craneAdjustment < 0 || params.weatherSeverity === 'Severe') {
      rationale = `Equipment deficit (${params.craneAdjustment} cranes) combined with ${params.weatherSeverity.toLowerCase()} sea-state reduces quayside hoist speeds by ${Math.round((1 - effectiveCapacity) * 100)}%, escalating anchorage queue from ${before.queueCount} to ${afterQueue} vessels with a ${waitHoursDelta}h delay surge.`;
    } else if (isImprovement) {
      rationale = `Simulated operational configuration clears backlog ${Math.abs(waitHoursDelta)}h faster, reducing quayside saturation by ${Math.abs(berthUtilDelta)}% and saving $${Math.abs(demurrageDeltaUsd).toLocaleString()} in charter penalties.`;
    } else {
      rationale = `Simulated volume and resource constraints increase queue by +${queueDelta} vessels, extending average turn time to ${afterWait}h.`;
    }

    // Dynamic AI Recovery Plan Steps
    const steps: SimulationStepAction[] = [];
    if (params.reallocateBottleneckVessel) {
      steps.push({
        order: 1,
        title: 'Execute Berth Reallocation',
        detail: 'Divert approaching ULCV Ocean Star from Berth B04 to Berth B02 to utilize high-speed STS cranes C04 and C06.',
        targetEntity: 'Vessel Ocean Star',
      });
    } else {
      steps.push({
        order: 1,
        title: 'Activate Quayside Gang Reinforcement',
        detail: `Deploy ${Math.max(1, params.craneAdjustment + 1)} additional STS crane crews to accelerate discharge at bottleneck quay.`,
        targetEntity: 'STS Crane Fleet',
      });
    }

    if (params.truckFlowPerHour < 60) {
      steps.push({
        order: 2,
        title: 'Open Fast-Track Terminal Gates',
        detail: `Increase gate interchange lanes from ${params.truckFlowPerHour} to 90 trucks/hour to prevent quayside straddle carrier blockage.`,
        targetEntity: 'Gate Intermodal OCR Lanes',
      });
    } else {
      steps.push({
        order: 2,
        title: 'Re-sequence Yard Dwell Buffer',
        detail: 'Pre-marshall inbound containers to buffer yard CY-04 to maintain continuous dual-cycling gantry flow.',
        targetEntity: 'Yard Block CY-04',
      });
    }

    steps.push({
      order: 3,
      title: 'Broadcast Revised Pilot Windows',
      detail: `Issue updated pilot boarding notices (+${Math.max(1, Math.round(afterWait / 2))}h buffer) to coordinate tug assists and pilotage.`,
      targetEntity: 'Harbor Pilot Station',
    });

    const scenarioName = params.scenarioPreset === 'crane_failure'
      ? 'STS Crane Equipment Outage'
      : params.scenarioPreset === 'berth_closure'
      ? 'Unscheduled Berth Closure'
      : params.scenarioPreset === 'vessel_surge'
      ? 'Tidal Arrival Surge (3+ ULCVs)'
      : 'Custom Operational Policy Simulation';

    return {
      scenarioName,
      durationHours: params.durationHours || 8,
      before,
      after: {
        queueCount: afterQueue,
        avgWaitHours: afterWait,
        berthUtilizationPercent: afterBerthUtil,
        overallCongestionPercent: afterCongestion,
        demurrageExposureUsd: afterDemurrage,
      },
      deltas: {
        queueDelta,
        waitHoursDelta,
        berthUtilDelta,
        congestionDelta,
        demurrageDeltaUsd,
        isImprovement,
      },
      operationalRationale: rationale,
      recoveryPlan: {
        id: `REC-SIM-${Date.now().toString().slice(-4)}`,
        expectedRecoveryHours: Number((afterWait * 0.45).toFixed(1)),
        steps,
        isApplied: false,
      },
    };
  }
}
