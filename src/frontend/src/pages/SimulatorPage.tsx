import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  RefreshCw,
  Zap,
  CheckCircle2,
  SlidersHorizontal,
  Sparkles,
  ArrowRight,
  Truck,
  Layers,
  CloudSun,
  RotateCcw,
} from 'lucide-react';
import { useOperations } from '../context/OperationsContext';
import { BeforeAfterCard } from '../components/operations/BeforeAfterCard';
import {
  SimulationEngine,
  SimulationParams,
  SimulationExecutionResult,
} from '../services/simulationEngine';

export const SimulatorPage: React.FC = () => {
  const navigate = useNavigate();
  const {
    isOptimizationApplied,
    isRecoveryPlanApplied,
    applyRecoveryPlan,
    showToast,
    setIsCopilotOpen,
    sendCopilotMessage,
  } = useOperations();

  // Simulation Controls State
  const [selectedPreset, setSelectedPreset] = useState<'custom' | 'crane_failure' | 'berth_closure' | 'vessel_surge'>('crane_failure');
  const [craneAdjustment, setCraneAdjustment] = useState<number>(-1);
  const [truckFlowPerHour, setTruckFlowPerHour] = useState<number>(50);
  const [containerVolumeMultiplier, setContainerVolumeMultiplier] = useState<number>(1.0);
  const [reallocateBottleneckVessel, setReallocateBottleneckVessel] = useState<boolean>(false);
  const [doubleShiftGangs, setDoubleShiftGangs] = useState<boolean>(false);
  const [vesselSurgeCount, setVesselSurgeCount] = useState<number>(1);
  const [weatherSeverity, setWeatherSeverity] = useState<'Calm' | 'Moderate' | 'Severe'>('Calm');
  const [durationHours, setDurationHours] = useState<number>(8);
  const [isSimulating, setIsSimulating] = useState<boolean>(false);

  // Execution Result (initialized with default Crane Failure scenario)
  const [simResult, setSimResult] = useState<SimulationExecutionResult>(() =>
    SimulationEngine.runSimulation(
      {
        craneAdjustment: -1,
        truckFlowPerHour: 50,
        containerVolumeMultiplier: 1.0,
        reallocateBottleneckVessel: false,
        doubleShiftGangs: false,
        vesselSurgeCount: 1,
        weatherSeverity: 'Calm',
        scenarioPreset: 'crane_failure',
        durationHours: 8,
      },
      isOptimizationApplied
    )
  );

  // Handle Preset Selection
  const handlePresetChange = (preset: 'custom' | 'crane_failure' | 'berth_closure' | 'vessel_surge') => {
    setSelectedPreset(preset);
    if (preset === 'crane_failure') {
      setCraneAdjustment(-1);
      setReallocateBottleneckVessel(false);
      setVesselSurgeCount(1);
      setDurationHours(8);
      setWeatherSeverity('Calm');
    } else if (preset === 'berth_closure') {
      setCraneAdjustment(-2);
      setReallocateBottleneckVessel(false);
      setVesselSurgeCount(0);
      setDurationHours(12);
      setWeatherSeverity('Calm');
    } else if (preset === 'vessel_surge') {
      setCraneAdjustment(0);
      setVesselSurgeCount(3);
      setContainerVolumeMultiplier(1.3);
      setDurationHours(16);
      setWeatherSeverity('Moderate');
    } else if (preset === 'custom') {
      // Keep existing manual levers
    }
  };

  const handleSimulate = async () => {
    setIsSimulating(true);
    await new Promise(r => setTimeout(r, 400));

    const params: SimulationParams = {
      craneAdjustment,
      truckFlowPerHour,
      containerVolumeMultiplier,
      reallocateBottleneckVessel,
      doubleShiftGangs,
      vesselSurgeCount,
      weatherSeverity,
      scenarioPreset: selectedPreset,
      durationHours,
    };

    const result = SimulationEngine.runSimulation(params, isOptimizationApplied);
    setSimResult(result);
    setIsSimulating(false);

    showToast(
      result.deltas.isImprovement ? 'success' : 'warning',
      'Simulation Completed',
      result.deltas.isImprovement
        ? `Projected optimization: Wait reduced by ${Math.abs(result.deltas.waitHoursDelta)}h, saving $${Math.abs(result.deltas.demurrageDeltaUsd).toLocaleString()}.`
        : `Projected disruption: Queue expanded to ${result.after.queueCount} vessels, wait increased by +${result.deltas.waitHoursDelta}h.`
    );
  };

  const handleReset = () => {
    handlePresetChange('crane_failure');
    const result = SimulationEngine.runSimulation(
      {
        craneAdjustment: -1,
        truckFlowPerHour: 50,
        containerVolumeMultiplier: 1.0,
        reallocateBottleneckVessel: false,
        doubleShiftGangs: false,
        vesselSurgeCount: 1,
        weatherSeverity: 'Calm',
        scenarioPreset: 'crane_failure',
        durationHours: 8,
      },
      isOptimizationApplied
    );
    setSimResult(result);
    showToast('info', 'Simulation Reset', 'Parameters returned to default baseline outage scenario.');
  };

  const handleAskCopilot = async () => {
    setIsCopilotOpen(true);
    await sendCopilotMessage(
      `Analyze the simulation result for: ${simResult.scenarioName} (${durationHours}h). ` +
      `Before: ${simResult.before.queueCount} vessels, ${simResult.before.avgWaitHours}h wait. ` +
      `After: ${simResult.after.queueCount} vessels, ${simResult.after.avgWaitHours}h wait.`
    );
  };

  const handleApplyRecovery = () => {
    applyRecoveryPlan();
    // After recovery plan is applied, update simulation view
    const recovered = SimulationEngine.runSimulation(
      {
        craneAdjustment: 1,
        truckFlowPerHour: 80,
        containerVolumeMultiplier: 1.0,
        reallocateBottleneckVessel: true,
        doubleShiftGangs: true,
        vesselSurgeCount: 0,
        weatherSeverity: 'Calm',
        scenarioPreset: 'custom',
        durationHours,
      },
      true
    );
    setSimResult(recovered);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-text-main tracking-tight">
              Operational Disruption & What-If Simulator
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-teal-50 text-teal-800 border border-teal-200">
              Interactive Policy Sandbox
            </span>
          </div>
          <p className="text-sm text-text-muted mt-1">
            Simulate equipment outages, surge arrivals, and tactical reallocation decisions. Calculate exact Before vs After operational impact.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleReset}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium text-text-muted hover:text-text-main bg-surface hover:bg-surface-subtle border border-border-subtle transition-colors shadow-xs"
            title="Reset parameters to baseline"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset</span>
          </button>
          <button
            onClick={handleAskCopilot}
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-medium text-text-main bg-surface hover:bg-surface-subtle border border-border-subtle transition-colors shadow-xs"
          >
            <Sparkles className="w-3.5 h-3.5 text-brand-teal" />
            <span>Consult Copilot</span>
          </button>
          <button
            onClick={handleSimulate}
            disabled={isSimulating}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-brand-teal hover:bg-teal-700 disabled:opacity-50 transition-all shadow-xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSimulating ? 'animate-spin' : ''}`} />
            <span>{isSimulating ? 'Computing Dynamics...' : 'Run Simulation'}</span>
          </button>
        </div>
      </div>

      {/* Main Grid: Controls on Left (1 col), Results on Right (2 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Stage 1: Operational Levers Panel */}
        <div className="bg-surface p-6 rounded-3xl border border-border-subtle shadow-[0_8px_30px_rgb(0,0,0,0.04)] space-y-4">
          <div className="flex items-center justify-between border-b border-border-subtle pb-3">
            <h2 className="text-sm font-semibold text-text-main flex items-center gap-2">
              <SlidersHorizontal className="w-4 h-4 text-brand-teal" />
              <span>1. Operational Levers</span>
            </h2>
            <span className="text-xs text-text-caption font-medium">What-If Input</span>
          </div>

          <div className="space-y-4 text-xs">
            {/* Scenario Presets */}
            <div>
              <label className="text-text-muted block mb-1.5 font-medium">Scenario Preset:</label>
              <select
                value={selectedPreset}
                onChange={e => handlePresetChange(e.target.value as any)}
                className="w-full bg-surface-subtle border border-border-subtle rounded-xl px-3 py-2 text-xs text-text-main focus:outline-hidden focus:border-brand-teal"
              >
                <option value="crane_failure">Crane Equipment Outage (STS C03 Down)</option>
                <option value="berth_closure">Unscheduled Berth Closure (B04 Depth Silt)</option>
                <option value="vessel_surge">Tidal Arrival Surge (+3 ULCVs entering)</option>
                <option value="custom">Custom What-If Operational Policy</option>
              </select>
            </div>

            {/* Crane Allocation Slider */}
            <div>
              <div className="flex justify-between text-text-muted mb-1">
                <span className="flex items-center gap-1">
                  <span>STS Cranes Adjustment:</span>
                </span>
                <span className={`font-semibold ${craneAdjustment > 0 ? 'text-emerald-700' : craneAdjustment < 0 ? 'text-rose-600' : 'text-text-main'}`}>
                  {craneAdjustment > 0 ? `+${craneAdjustment} Cranes` : craneAdjustment < 0 ? `${craneAdjustment} Crane Outage` : 'Baseline (4 Cranes)'}
                </span>
              </div>
              <input
                type="range"
                min="-2"
                max="2"
                step="1"
                value={craneAdjustment}
                onChange={e => {
                  setCraneAdjustment(Number(e.target.value));
                  setSelectedPreset('custom');
                }}
                className="w-full accent-brand-teal cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-text-caption mt-0.5">
                <span>-2 (Severe Failure)</span>
                <span>0 (Normal)</span>
                <span>+2 (Reinforced)</span>
              </div>
            </div>

            {/* Truck Flow Throughput */}
            <div>
              <div className="flex justify-between text-text-muted mb-1">
                <span className="flex items-center gap-1">
                  <Truck className="w-3.5 h-3.5 text-text-caption" />
                  <span>Terminal Gate Flow:</span>
                </span>
                <span className="font-semibold text-text-main">{truckFlowPerHour} trucks/hr</span>
              </div>
              <input
                type="range"
                min="20"
                max="120"
                step="10"
                value={truckFlowPerHour}
                onChange={e => {
                  setTruckFlowPerHour(Number(e.target.value));
                  setSelectedPreset('custom');
                }}
                className="w-full accent-brand-teal cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-text-caption mt-0.5">
                <span>20 (Gate Congestion)</span>
                <span>60 (Normal)</span>
                <span>120 (Express OCR)</span>
              </div>
            </div>

            {/* Container Volume Multiplier */}
            <div>
              <div className="flex justify-between text-text-muted mb-1">
                <span className="flex items-center gap-1">
                  <Layers className="w-3.5 h-3.5 text-text-caption" />
                  <span>Container Volume Load:</span>
                </span>
                <span className="font-semibold text-text-main">{Math.round(containerVolumeMultiplier * 100)}% TEU</span>
              </div>
              <input
                type="range"
                min="0.7"
                max="1.5"
                step="0.1"
                value={containerVolumeMultiplier}
                onChange={e => {
                  setContainerVolumeMultiplier(Number(e.target.value));
                  setSelectedPreset('custom');
                }}
                className="w-full accent-brand-teal cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-text-caption mt-0.5">
                <span>70% (Light)</span>
                <span>100% (Standard)</span>
                <span>150% (Peak Peak)</span>
              </div>
            </div>

            {/* Weather Severity */}
            <div>
              <label className="text-text-muted block mb-1 font-medium flex items-center gap-1">
                <CloudSun className="w-3.5 h-3.5 text-text-caption" />
                <span>Weather & Sea State:</span>
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                {(['Calm', 'Moderate', 'Severe'] as const).map(w => (
                  <button
                    key={w}
                    type="button"
                    onClick={() => {
                      setWeatherSeverity(w);
                      setSelectedPreset('custom');
                    }}
                    className={`py-1.5 text-xs rounded-xl font-medium border transition-colors ${
                      weatherSeverity === w
                        ? 'bg-brand-teal text-white border-brand-teal font-semibold'
                        : 'bg-surface-subtle text-text-muted border-border-subtle hover:text-text-main'
                    }`}
                  >
                    {w}
                  </button>
                ))}
              </div>
            </div>

            {/* Tactical Checkbox Toggles */}
            <div className="p-3 rounded-2xl bg-surface-subtle border border-border-subtle space-y-2">
              <label className="flex items-start gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={reallocateBottleneckVessel}
                  onChange={e => {
                    setReallocateBottleneckVessel(e.target.checked);
                    setSelectedPreset('custom');
                  }}
                  className="rounded mt-0.5 accent-brand-teal"
                />
                <span className="text-[11px] text-text-main">
                  <strong>Reallocate Ocean Star to Berth B02</strong> (Bypasses B04 crane deficit)
                </span>
              </label>

              <label className="flex items-start gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={doubleShiftGangs}
                  onChange={e => {
                    setDoubleShiftGangs(e.target.checked);
                    setSelectedPreset('custom');
                  }}
                  className="rounded mt-0.5 accent-brand-teal"
                />
                <span className="text-[11px] text-text-main">
                  <strong>Double Stevedore Gangs</strong> (+35% handling pace during night shifts)
                </span>
              </label>
            </div>

            {/* Duration Slider */}
            <div>
              <div className="flex justify-between text-text-muted mb-1">
                <span>Simulation Time Window:</span>
                <span className="font-semibold text-text-main">{durationHours} hours</span>
              </div>
              <input
                type="range"
                min="2"
                max="24"
                step="2"
                value={durationHours}
                onChange={e => setDurationHours(Number(e.target.value))}
                className="w-full accent-brand-teal cursor-pointer"
              />
            </div>

            <button
              onClick={handleSimulate}
              disabled={isSimulating}
              className="w-full py-2.5 rounded-xl text-xs font-semibold text-white bg-brand-teal hover:bg-teal-700 transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSimulating ? 'animate-spin' : ''}`} />
              <span>{isSimulating ? 'Calculating Impact...' : 'Run Simulation'}</span>
            </button>
          </div>
        </div>

        {/* Stage 2 & Stage 3: Results & AI Recovery Plan */}
        <div className="lg:col-span-2 space-y-6">
          {/* Stage 2: Simulated Impact (Before vs After) */}
          <BeforeAfterCard
            title={`2. Simulated Disruption Impact: ${simResult.scenarioName}`}
            beforeTitle="Current Baseline (Before)"
            afterTitle="Projected Outcome (After)"
            beforeDetails={{
              berth: 'Berth B04 (High Risk)',
              vessel: 'ULCV Ocean Star (14,500 TEU)',
              cranes: 2,
              status: 'Constrained by C03 hoist drive fault; 7 vessels in anchorage backlog.',
            }}
            afterDetails={{
              berth: reallocateBottleneckVessel ? 'Berth B02 (Diverted)' : 'Berth B04 (Active)',
              vessel: 'ULCV Ocean Star (14,500 TEU)',
              cranes: Math.max(1, 2 + craneAdjustment),
              status: simResult.deltas.isImprovement
                ? 'Operational bottleneck resolved; flow cleared with increased crane density.'
                : 'Elevated queue pressure; prolonged waiting time on commercial vessels.',
            }}
            metrics={[
              {
                label: 'Anchorage Queue',
                before: `${simResult.before.queueCount} vessels`,
                after: `${simResult.after.queueCount} vessels`,
                delta: simResult.deltas.queueDelta !== 0
                  ? `${simResult.deltas.queueDelta > 0 ? '+' : ''}${simResult.deltas.queueDelta} vessels`
                  : 'No change',
                isPositive: simResult.deltas.queueDelta <= 0,
              },
              {
                label: 'Average Wait Time',
                before: `${simResult.before.avgWaitHours}h`,
                after: `${simResult.after.avgWaitHours}h`,
                delta: simResult.deltas.waitHoursDelta !== 0
                  ? `${simResult.deltas.waitHoursDelta > 0 ? '+' : ''}${simResult.deltas.waitHoursDelta}h`
                  : 'Stable',
                isPositive: simResult.deltas.waitHoursDelta <= 0,
              },
              {
                label: 'Berth Saturation',
                before: `${simResult.before.berthUtilizationPercent}%`,
                after: `${simResult.after.berthUtilizationPercent}%`,
                delta: simResult.deltas.berthUtilDelta !== 0
                  ? `${simResult.deltas.berthUtilDelta > 0 ? '+' : ''}${simResult.deltas.berthUtilDelta}%`
                  : 'Balanced',
                isPositive: simResult.deltas.berthUtilDelta <= 0,
              },
              {
                label: 'Demurrage Exposure',
                before: `$${simResult.before.demurrageExposureUsd.toLocaleString()}`,
                after: `$${simResult.after.demurrageExposureUsd.toLocaleString()}`,
                delta: simResult.deltas.demurrageDeltaUsd !== 0
                  ? `${simResult.deltas.demurrageDeltaUsd > 0 ? '+$' : '-$'}${Math.abs(simResult.deltas.demurrageDeltaUsd).toLocaleString()}`
                  : 'Neutral',
                isPositive: simResult.deltas.demurrageDeltaUsd <= 0,
              },
            ]}
          />

          {/* Operational Rationale Card */}
          <div className="bg-surface p-5 rounded-3xl border border-border-subtle shadow-[0_8px_30px_rgb(0,0,0,0.04)] space-y-2">
            <h3 className="text-xs font-bold text-text-main uppercase tracking-wider flex items-center gap-2">
              <Zap className="w-3.5 h-3.5 text-brand-teal" />
              <span>Operational Simulation Rationale</span>
            </h3>
            <p className="text-xs text-text-muted leading-relaxed">
              {simResult.operationalRationale}
            </p>
          </div>

          {/* Stage 3: AI Recovery Plan */}
          <div className="bg-surface p-6 rounded-3xl border border-emerald-200 shadow-[0_8px_30px_rgb(0,0,0,0.04)] space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border-subtle pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold text-emerald-950 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>3. AI Recovery Plan</span>
                  </h3>
                  <span className="text-xs text-emerald-800 font-medium px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200">
                    Est. Recovery: {simResult.recoveryPlan.expectedRecoveryHours}h
                  </span>
                </div>
                <p className="text-xs text-text-muted mt-0.5">
                  Automated operational re-allocation protocol formulated for the simulated scenario.
                </p>
              </div>

              {!isRecoveryPlanApplied ? (
                <button
                  onClick={handleApplyRecovery}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 transition-all shadow-xs cursor-pointer"
                >
                  <Zap className="w-4 h-4" />
                  <span>Apply Recovery Plan</span>
                </button>
              ) : (
                <span className="text-xs font-semibold text-emerald-800 px-3 py-1.5 rounded-xl bg-emerald-100 border border-emerald-200 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Recovery Plan Deployed</span>
                </span>
              )}
            </div>

            {/* 3 Step Actions */}
            <div className="space-y-3 text-xs">
              {simResult.recoveryPlan.steps.map(step => (
                <div
                  key={step.order}
                  className="p-3.5 rounded-xl bg-surface-subtle border border-border-subtle flex items-start gap-3.5"
                >
                  <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-800 font-semibold flex items-center justify-center shrink-0 mt-0.5 text-xs">
                    {step.order}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-text-main text-xs">{step.title}</span>
                      <span className="text-[10px] text-text-muted bg-surface px-2 py-0.5 rounded border border-border-subtle">
                        {step.targetEntity}
                      </span>
                    </div>
                    <p className="text-text-muted mt-1 text-xs leading-relaxed">
                      {step.detail}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Post-Recovery Action Links */}
            <div className="pt-2 border-t border-border-subtle flex items-center justify-between text-xs">
              <span className="text-text-muted">
                {isRecoveryPlanApplied
                  ? 'Recovery actions active across 72-Hour Planner and Operations Board.'
                  : 'Click Apply Recovery Plan to deploy changes to live operations.'}
              </span>
              <button
                onClick={() => navigate('/decision/planner')}
                className="text-brand-teal hover:underline font-medium flex items-center gap-1 cursor-pointer"
              >
                <span>View 72-Hour Planner</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
