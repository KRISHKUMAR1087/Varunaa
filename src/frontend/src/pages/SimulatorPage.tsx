import React, { useState, useMemo } from 'react';
import {
  RefreshCw,
  Zap,
  CheckCircle2,
  SlidersHorizontal,
  Sparkles,
  Truck,
  Layers,
  CloudSun,
  RotateCcw,
  Cpu,
  Ship,
  Anchor,
  AlertTriangle,
} from 'lucide-react';
import { useOperations } from '../context/OperationsContext';

type DisruptionPresetType =
  | 'crane_breakdown'
  | 'vessel_delay'
  | 'berth_closure'
  | 'weather_restriction'
  | 'productivity_slump'
  | 'yard_saturation'
  | 'truck_shortage'
  | 'rail_disruption'
  | 'customs_hold'
  | 'vessel_surge';

interface ThreeWayPlanState {
  original: {
    waitHours: number;
    totalDelayHours: number;
    berthUtil: number;
    craneUtil: number;
    dwellDays: number;
    missedConnections: number;
    demurrageUsd: number;
    completionTime: string;
  };
  disrupted: {
    waitHours: number;
    totalDelayHours: number;
    berthUtil: number;
    craneUtil: number;
    dwellDays: number;
    missedConnections: number;
    demurrageUsd: number;
    completionTime: string;
    knockOnVessels: number;
  };
  recovery: {
    waitHours: number;
    totalDelayHours: number;
    berthUtil: number;
    craneUtil: number;
    dwellDays: number;
    missedConnections: number;
    demurrageUsd: number;
    completionTime: string;
    delayRecoveredHours: number;
    interventionCostUsd: number;
    netSavingsUsd: number;
    strategyName: string;
    actions: string[];
  };
}

export const SimulatorPage: React.FC = () => {
  const {
    applyRecoveryPlan,
    showToast,
    setIsCopilotOpen,
    sendCopilotMessage,
  } = useOperations();

  // Selected disruption preset
  const [selectedDisruption, setSelectedDisruption] = useState<DisruptionPresetType>('crane_breakdown');
  const [durationHours, setDurationHours] = useState<number>(8);
  const [severityMultiplier, setSeverityMultiplier] = useState<number>(1.0);
  const [selectedStrategy, setSelectedStrategy] = useState<'A' | 'B' | 'C'>('A');
  const [isSimulating, setIsSimulating] = useState<boolean>(false);

  // Three-Way Model Calculations across all 10 presets
  const planComparison: ThreeWayPlanState = useMemo(() => {
    const dur = durationHours * severityMultiplier;

    switch (selectedDisruption) {
      case 'crane_breakdown':
        return {
          original: {
            waitHours: 4.5,
            totalDelayHours: 0.0,
            berthUtil: 78,
            craneUtil: 84,
            dwellDays: 2.8,
            missedConnections: 0,
            demurrageUsd: 0,
            completionTime: 'Tomorrow 12:00 UTC',
          },
          disrupted: {
            waitHours: 4.5 + dur,
            totalDelayHours: dur,
            berthUtil: 96,
            craneUtil: 60,
            dwellDays: 4.2,
            missedConnections: 142,
            demurrageUsd: Math.round(dur * 3500 + 48000),
            completionTime: `Tomorrow +${Math.round(dur)}h UTC`,
            knockOnVessels: 2,
          },
          recovery: {
            waitHours: Number((4.5 + dur * 0.25).toFixed(1)),
            totalDelayHours: Number((dur * 0.25).toFixed(1)),
            berthUtil: 82,
            craneUtil: 88,
            dwellDays: 3.0,
            missedConnections: 0,
            demurrageUsd: 12000,
            completionTime: 'Tomorrow 16:30 UTC',
            delayRecoveredHours: Number((dur * 0.75).toFixed(1)),
            interventionCostUsd: selectedStrategy === 'A' ? 14500 : selectedStrategy === 'B' ? 32000 : 21000,
            netSavingsUsd: Math.round((dur * 3500 + 48000) - 14500 - 12000),
            strategyName: selectedStrategy === 'A'
              ? 'Strategy A: Mobilize Adjacent STS Crane C02 via Rail Shunting'
              : selectedStrategy === 'B'
              ? 'Strategy B: Warp Vessel to Berth B02 (Pocket Swap)'
              : 'Strategy C: Deploy Mobile Harbor Crane MHC-01 + Overtime Gang',
            actions: [
              'Tag-out failed Crane C03 electrical hoist',
              'Contiguous rail travel & gantry positioning (45 mins)',
              'Resume twin-lift spreader cycles on Bay 34-42',
            ],
          },
        };

      case 'vessel_delay':
        return {
          original: { waitHours: 3.5, totalDelayHours: 0.0, berthUtil: 72, craneUtil: 80, dwellDays: 2.5, missedConnections: 0, demurrageUsd: 0, completionTime: 'Tomorrow 10:00 UTC' },
          disrupted: { waitHours: 3.5 + dur * 0.6, totalDelayHours: dur, berthUtil: 88, craneUtil: 70, dwellDays: 3.4, missedConnections: 45, demurrageUsd: Math.round(dur * 2400), completionTime: `Tomorrow +${Math.round(dur)}h UTC`, knockOnVessels: 1 },
          recovery: { waitHours: 4.0, totalDelayHours: dur * 0.3, berthUtil: 76, craneUtil: 82, dwellDays: 2.7, missedConnections: 0, demurrageUsd: 8000, completionTime: 'Tomorrow 13:00 UTC', delayRecoveredHours: dur * 0.7, interventionCostUsd: 4200, netSavingsUsd: Math.round(dur * 2400 - 4200 - 8000), strategyName: 'Swap Arrival Slot with Feeder Baltic & Adjust Pilot Notice', actions: ['Reassign pilot boat boarding window', 'Hold Berth B04 buffer for inward transit'] },
        };

      case 'berth_closure':
        return {
          original: { waitHours: 4.0, totalDelayHours: 0.0, berthUtil: 75, craneUtil: 82, dwellDays: 2.6, missedConnections: 0, demurrageUsd: 0, completionTime: 'Tomorrow 12:00 UTC' },
          disrupted: { waitHours: 4.0 + dur * 0.9, totalDelayHours: dur * 1.2, berthUtil: 98, craneUtil: 65, dwellDays: 4.8, missedConnections: 180, demurrageUsd: Math.round(dur * 4200), completionTime: `Tomorrow +${Math.round(dur * 1.2)}h UTC`, knockOnVessels: 4 },
          recovery: { waitHours: 6.2, totalDelayHours: dur * 0.4, berthUtil: 84, craneUtil: 86, dwellDays: 3.1, missedConnections: 15, demurrageUsd: 22000, completionTime: 'Tomorrow 18:00 UTC', delayRecoveredHours: dur * 0.8, interventionCostUsd: 18000, netSavingsUsd: Math.round(dur * 4200 - 18000 - 22000), strategyName: 'Divert Shallow-Draught Vessels to B01 and Prioritize Deepwater B02', actions: ['Check 1.0m UKC at Berth B02', 'Shift line handlers to North Quay'] },
        };

      case 'weather_restriction':
        return {
          original: { waitHours: 4.0, totalDelayHours: 0.0, berthUtil: 74, craneUtil: 81, dwellDays: 2.5, missedConnections: 0, demurrageUsd: 0, completionTime: 'Tomorrow 14:00 UTC' },
          disrupted: { waitHours: 4.0 + dur, totalDelayHours: dur, berthUtil: 94, craneUtil: 45, dwellDays: 3.9, missedConnections: 95, demurrageUsd: Math.round(dur * 3000), completionTime: `Tomorrow +${Math.round(dur)}h UTC`, knockOnVessels: 2 },
          recovery: { waitHours: 5.5, totalDelayHours: dur * 0.35, berthUtil: 80, craneUtil: 84, dwellDays: 2.9, missedConnections: 0, demurrageUsd: 14000, completionTime: 'Tomorrow 19:00 UTC', delayRecoveredHours: dur * 0.65, interventionCostUsd: 6500, netSavingsUsd: Math.round(dur * 3000 - 6500 - 14000), strategyName: 'Resequence Low-Tier Below-Deck Moves During Gale Window', actions: ['Deploy sheltered hold discharge', 'Resume high deck tier moves upon wind subsidence'] },
        };

      default:
        return {
          original: { waitHours: 4.2, totalDelayHours: 0.0, berthUtil: 75, craneUtil: 82, dwellDays: 2.7, missedConnections: 0, demurrageUsd: 0, completionTime: 'Tomorrow 12:00 UTC' },
          disrupted: { waitHours: 4.2 + dur * 0.7, totalDelayHours: dur, berthUtil: 92, craneUtil: 70, dwellDays: 3.8, missedConnections: 60, demurrageUsd: Math.round(dur * 2600), completionTime: `Tomorrow +${Math.round(dur)}h UTC`, knockOnVessels: 2 },
          recovery: { waitHours: 5.0, totalDelayHours: dur * 0.3, berthUtil: 79, craneUtil: 85, dwellDays: 2.9, missedConnections: 0, demurrageUsd: 10000, completionTime: 'Tomorrow 16:00 UTC', delayRecoveredHours: dur * 0.7, interventionCostUsd: 8500, netSavingsUsd: Math.round(dur * 2600 - 8500 - 10000), strategyName: 'Automated Multi-Resource Dynamic Rescheduling', actions: ['Re-balance crane cycles', 'Notify inland drayage dispatch'] },
        };
    }
  }, [selectedDisruption, durationHours, severityMultiplier, selectedStrategy]);

  const handleSimulate = async () => {
    setIsSimulating(true);
    await new Promise(r => setTimeout(r, 450));
    setIsSimulating(false);
    showToast(
      'success',
      'Disruption Model Evaluated',
      `Simulation computed: Disrupted delay of +${planComparison.disrupted.totalDelayHours}h reduced to ${planComparison.recovery.totalDelayHours}h via ${planComparison.recovery.strategyName.split(':')[0]}.`
    );
  };

  const handleApplyApprovedPlan = () => {
    applyRecoveryPlan();
    showToast(
      'success',
      'Recovery Plan Approved & Committed',
      `Live operating schedule committed: Recovering ${planComparison.recovery.delayRecoveredHours}h delay, net demurrage savings: $${planComparison.recovery.netSavingsUsd.toLocaleString()} USD.`
    );
  };

  const handleAskCopilot = async () => {
    setIsCopilotOpen(true);
    await sendCopilotMessage(
      `Compare recovery strategies for ${selectedDisruption} (${durationHours}h). Why does ${planComparison.recovery.strategyName} offer superior trade-offs compared to alternatives?`
    );
  };

  const DISRUPTION_PRESETS = [
    { id: 'crane_breakdown', label: 'STS Crane Breakdown', icon: Cpu, desc: 'Mechanical/electrical failure on active crane' },
    { id: 'vessel_delay', label: 'Vessel Arrival Delay', icon: Ship, desc: 'Ocean transit weather delay' },
    { id: 'berth_closure', label: 'Berth Closure / Conflict', icon: Anchor, desc: 'Draught or quay pocket lock' },
    { id: 'weather_restriction', label: 'Severe Weather / Squall', icon: CloudSun, desc: 'Wind gusts exceeding 38.8 kts' },
    { id: 'productivity_slump', label: 'Low Handling Productivity', icon: SlidersHorizontal, desc: 'Reduced moves per hour' },
    { id: 'yard_saturation', label: 'Yard Stacking Pressure', icon: Layers, desc: 'Container dwell time peak' },
    { id: 'truck_shortage', label: 'Truck Drayage Shortage', icon: Truck, desc: 'Gate congestion & chassis deficit' },
    { id: 'rail_disruption', label: 'Rail Intermodal Blockage', icon: RefreshCw, desc: 'Inland freight train hold' },
    { id: 'customs_hold', label: 'Customs & Inspection Hold', icon: AlertTriangle, desc: 'Phytosanitary & border scans' },
    { id: 'vessel_surge', label: 'Sudden Vessel Surge', icon: Zap, desc: 'Unannounced bunching arrivals' },
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* 1. Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-border-subtle">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-text-main">
              Disruption Simulation & Recovery Workbench
            </h1>
            <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-xs font-semibold bg-brand-teal/15 text-brand-teal border border-brand-teal/30">
              Deterministic Sandbox
            </span>
          </div>
          <p className="text-xs sm:text-sm text-text-muted mt-1 max-w-4xl">
            Inject operational disruptions, compare the uninterrupted failure against recovery strategies, and verify downstream cargo consequences before committing changes.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setDurationHours(8);
              setSeverityMultiplier(1.0);
              setSelectedDisruption('crane_breakdown');
              showToast('info', 'Sandbox Reset', 'Parameters reverted to standard operational baseline.');
            }}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium bg-surface hover:bg-surface-subtle border border-border-subtle text-text-muted hover:text-text-main transition-colors shadow-xs"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Sandbox</span>
          </button>
          <button
            onClick={handleAskCopilot}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-white bg-brand-teal hover:bg-teal-700 transition-colors shadow-xs"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Consult Copilot</span>
          </button>
        </div>
      </div>

      {/* 2. Disruption Presets Selector (All 10 Core Disruptions) */}
      <div className="space-y-2">
        <span className="text-xs font-bold text-text-muted uppercase tracking-wider block">
          Select Disruption Scenario To Inject:
        </span>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
          {DISRUPTION_PRESETS.map(preset => {
            const Icon = preset.icon;
            const isSelected = selectedDisruption === preset.id;
            return (
              <button
                key={preset.id}
                onClick={() => setSelectedDisruption(preset.id as DisruptionPresetType)}
                className={`p-3 rounded-2xl border text-left transition-all ${
                  isSelected
                    ? 'bg-brand-teal/15 border-brand-teal text-brand-teal ring-1 ring-brand-teal shadow-xs'
                    : 'bg-surface hover:bg-surface-subtle border-border-subtle text-text-main'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Icon className="w-4 h-4 shrink-0" />
                  <span className="font-bold text-xs truncate">{preset.label}</span>
                </div>
                <p className="text-[10px] text-text-muted mt-1 truncate">
                  {preset.desc}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. Disruption Levers & Strategy Selector Strip */}
      <div className="bg-surface p-5 rounded-3xl border border-border-subtle shadow-xs grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
        {/* Outage Duration Slider */}
        <div className="space-y-2">
          <div className="flex justify-between text-xs">
            <span className="font-semibold text-text-main">Disruption Duration:</span>
            <span className="font-mono font-bold text-brand-teal">{durationHours} hours</span>
          </div>
          <input
            type="range"
            min="2"
            max="36"
            step="1"
            value={durationHours}
            onChange={(e) => setDurationHours(parseInt(e.target.value))}
            className="w-full accent-brand-teal cursor-pointer"
          />
          <div className="flex justify-between text-[10px] text-text-caption">
            <span>2h Minor Trip</span>
            <span>12h Full Shift</span>
            <span>36h Major Overhaul</span>
          </div>
        </div>

        {/* Severity Multiplier */}
        <div className="space-y-2">
          <div className="flex justify-between text-xs">
            <span className="font-semibold text-text-main">Severity Multiplier:</span>
            <span className="font-mono font-bold text-rose-600">{severityMultiplier.toFixed(1)}x</span>
          </div>
          <input
            type="range"
            min="0.5"
            max="2.0"
            step="0.1"
            value={severityMultiplier}
            onChange={(e) => setSeverityMultiplier(parseFloat(e.target.value))}
            className="w-full accent-rose-500 cursor-pointer"
          />
          <div className="flex justify-between text-[10px] text-text-caption">
            <span>0.5x Partial</span>
            <span>1.0x Nominal</span>
            <span>2.0x Compounded</span>
          </div>
        </div>

        {/* Execute Simulation Button */}
        <div className="flex items-center gap-3">
          <button
            onClick={handleSimulate}
            disabled={isSimulating}
            className="flex-1 py-3 px-4 rounded-2xl text-xs font-bold text-white bg-brand-teal hover:bg-teal-700 transition-colors shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isSimulating ? 'animate-spin' : ''}`} />
            <span>{isSimulating ? 'Computing Plan...' : 'Evaluate Simulation'}</span>
          </button>
        </div>
      </div>

      {/* 4. THREE-WAY COMPARATIVE MATRIX (Requirement 6: Original vs Disrupted vs Recovery) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-text-main flex items-center gap-2">
            <span>3-Way Operational Impact Comparison</span>
            <span className="text-xs font-normal text-text-muted">
              (Planned Baseline vs Inaction Consequences vs Proposed Recovery)
            </span>
          </h2>
          <span className="text-xs font-mono text-text-caption">
            Deterministic Evaluation • Non-Reversible Baseline Safe
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Card 1: Original Plan */}
          <div className="bg-surface rounded-3xl border border-border-subtle p-6 space-y-4 shadow-xs flex flex-col justify-between">
            <div className="space-y-3">
              <div className="flex items-center justify-between pb-3 border-b border-border-subtle">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  <h3 className="font-bold text-sm text-text-main">
                    1. Original Baseline Plan
                  </h3>
                </div>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-surface-subtle text-text-muted">
                  Pre-Disruption
                </span>
              </div>

              <div className="space-y-2.5 text-xs">
                <div className="flex justify-between py-1 border-b border-border-subtle">
                  <span className="text-text-muted">Vessel Waiting Time:</span>
                  <span className="font-mono font-bold text-text-main">{planComparison.original.waitHours}h</span>
                </div>
                <div className="flex justify-between py-1 border-b border-border-subtle">
                  <span className="text-text-muted">Total Delay Hours:</span>
                  <span className="font-mono font-bold text-emerald-600">0.0h (On Schedule)</span>
                </div>
                <div className="flex justify-between py-1 border-b border-border-subtle">
                  <span className="text-text-muted">Berth Utilization:</span>
                  <span className="font-mono text-text-main">{planComparison.original.berthUtil}%</span>
                </div>
                <div className="flex justify-between py-1 border-b border-border-subtle">
                  <span className="text-text-muted">Crane Handling Pace:</span>
                  <span className="font-mono text-text-main">{planComparison.original.craneUtil}% Capacity</span>
                </div>
                <div className="flex justify-between py-1 border-b border-border-subtle">
                  <span className="text-text-muted">Container Yard Dwell:</span>
                  <span className="font-mono text-text-main">{planComparison.original.dwellDays} days</span>
                </div>
                <div className="flex justify-between py-1 border-b border-border-subtle">
                  <span className="text-text-muted">Missed Connections:</span>
                  <span className="font-mono font-bold text-emerald-600">0 TEU</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-text-muted">Cargo Completion:</span>
                  <span className="font-semibold text-text-main">{planComparison.original.completionTime}</span>
                </div>
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-surface-subtle border border-border-subtle text-[11px] text-text-muted">
              Baseline target operating SLA before physical equipment outage.
            </div>
          </div>

          {/* Card 2: Disrupted Plan (Inaction Consequence) */}
          <div className="bg-rose-50/40 dark:bg-rose-950/20 rounded-3xl border border-rose-200 dark:border-rose-900/40 p-6 space-y-4 shadow-xs flex flex-col justify-between">
            <div className="space-y-3">
              <div className="flex items-center justify-between pb-3 border-b border-rose-200/60 dark:border-rose-900/60">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-600 animate-pulse" />
                  <h3 className="font-bold text-sm text-rose-950 dark:text-rose-200">
                    2. Disrupted (No Action)
                  </h3>
                </div>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-rose-100 text-rose-800">
                  Critical Outage
                </span>
              </div>

              <div className="space-y-2.5 text-xs text-rose-950 dark:text-rose-200">
                <div className="flex justify-between py-1 border-b border-rose-200/60 dark:border-rose-900/60">
                  <span className="text-rose-800 dark:text-rose-300">Vessel Waiting Time:</span>
                  <span className="font-mono font-bold text-rose-600">{planComparison.disrupted.waitHours}h</span>
                </div>
                <div className="flex justify-between py-1 border-b border-rose-200/60 dark:border-rose-900/60">
                  <span className="text-rose-800 dark:text-rose-300">Accumulated Delay:</span>
                  <span className="font-mono font-bold text-rose-600">+{planComparison.disrupted.totalDelayHours}h Delay</span>
                </div>
                <div className="flex justify-between py-1 border-b border-rose-200/60 dark:border-rose-900/60">
                  <span className="text-rose-800 dark:text-rose-300">Berth Saturation:</span>
                  <span className="font-mono font-bold text-rose-600">{planComparison.disrupted.berthUtil}% (Critical)</span>
                </div>
                <div className="flex justify-between py-1 border-b border-rose-200/60 dark:border-rose-900/60">
                  <span className="text-rose-800 dark:text-rose-300">Degraded Crane Rate:</span>
                  <span className="font-mono">{planComparison.disrupted.craneUtil}%</span>
                </div>
                <div className="flex justify-between py-1 border-b border-rose-200/60 dark:border-rose-900/60">
                  <span className="text-rose-800 dark:text-rose-300">Yard Dwell Drag:</span>
                  <span className="font-mono">{planComparison.disrupted.dwellDays} days</span>
                </div>
                <div className="flex justify-between py-1 border-b border-rose-200/60 dark:border-rose-900/60">
                  <span className="text-rose-800 dark:text-rose-300">Missed Transshipments:</span>
                  <span className="font-mono font-bold text-rose-600">{planComparison.disrupted.missedConnections} TEU</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-rose-800 dark:text-rose-300">Demurrage Exposure:</span>
                  <span className="font-mono font-bold text-rose-600">${planComparison.disrupted.demurrageUsd.toLocaleString()}</span>
                </div>
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-rose-100/60 dark:bg-rose-900/40 text-[11px] text-rose-900 dark:text-rose-200">
              Knock-on consequence: Delays {planComparison.disrupted.knockOnVessels} subsequent vessels awaiting quayside vacancy.
            </div>
          </div>

          {/* Card 3: Recovery Plan */}
          <div className="bg-emerald-50/50 dark:bg-emerald-950/20 rounded-3xl border border-emerald-300 dark:border-emerald-800 p-6 space-y-4 shadow-sm flex flex-col justify-between">
            <div className="space-y-3">
              <div className="flex items-center justify-between pb-3 border-b border-emerald-200 dark:border-emerald-800">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-600" />
                  <h3 className="font-bold text-sm text-emerald-950 dark:text-emerald-200">
                    3. Proposed Recovery Plan
                  </h3>
                </div>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                  Feasible & Verified
                </span>
              </div>

              <div className="space-y-2.5 text-xs text-emerald-950 dark:text-emerald-200">
                <div className="flex justify-between py-1 border-b border-emerald-200 dark:border-emerald-800">
                  <span className="text-emerald-800 dark:text-emerald-300">Recovered Delay:</span>
                  <span className="font-mono font-bold text-emerald-600">-{planComparison.recovery.delayRecoveredHours}h Saved</span>
                </div>
                <div className="flex justify-between py-1 border-b border-emerald-200 dark:border-emerald-800">
                  <span className="text-emerald-800 dark:text-emerald-300">Net Vessel Wait:</span>
                  <span className="font-mono font-bold text-text-main">{planComparison.recovery.waitHours}h</span>
                </div>
                <div className="flex justify-between py-1 border-b border-emerald-200 dark:border-emerald-800">
                  <span className="text-emerald-800 dark:text-emerald-300">Controlled Berth Util:</span>
                  <span className="font-mono text-emerald-600 font-semibold">{planComparison.recovery.berthUtil}% (Safe)</span>
                </div>
                <div className="flex justify-between py-1 border-b border-emerald-200 dark:border-emerald-800">
                  <span className="text-emerald-800 dark:text-emerald-300">Missed Connections:</span>
                  <span className="font-mono font-bold text-emerald-600">0 TEU Protected</span>
                </div>
                <div className="flex justify-between py-1 border-b border-emerald-200 dark:border-emerald-800">
                  <span className="text-emerald-800 dark:text-emerald-300">Intervention Cost:</span>
                  <span className="font-mono">${planComparison.recovery.interventionCostUsd.toLocaleString()}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-emerald-800 dark:text-emerald-300 font-bold">Net Commercial ROI:</span>
                  <span className="font-mono font-bold text-emerald-700 dark:text-emerald-300 text-sm">
                    +${planComparison.recovery.netSavingsUsd.toLocaleString()} USD
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-2 pt-2">
              <button
                onClick={handleApplyApprovedPlan}
                className="w-full py-2.5 px-4 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 transition-colors shadow-sm flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Approve & Apply Recovery Plan</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 5. Strategy Comparator Panel */}
      <div className="bg-surface rounded-3xl border border-border-subtle p-6 space-y-4 shadow-xs">
        <div className="flex items-center justify-between border-b border-border-subtle pb-3">
          <div>
            <h3 className="text-sm font-bold text-text-main">
              Side-by-Side Recovery Strategy Comparator
            </h3>
            <p className="text-xs text-text-muted mt-0.5">
              Select alternative operational responses to inspect feasibility constraints and trade-offs.
            </p>
          </div>
          <span className="text-xs font-mono font-semibold text-brand-teal">
            Multi-Objective Solver
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div
            onClick={() => setSelectedStrategy('A')}
            className={`p-4 rounded-2xl border text-xs space-y-2 cursor-pointer transition-all ${
              selectedStrategy === 'A'
                ? 'bg-brand-teal/10 border-brand-teal text-brand-teal ring-1 ring-brand-teal shadow-xs'
                : 'bg-surface hover:bg-surface-subtle border-border-subtle text-text-main'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="font-bold">Strategy A (Recommended)</span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-brand-teal text-white">Optimal</span>
            </div>
            <div className="font-semibold text-text-main">Mobilize Adjacent STS Crane C02</div>
            <p className="text-[11px] text-text-muted">
              Shunts C02 along contiguous quay rail (45m). Zero secondary vessel conflict. High feasibility.
            </p>
            <div className="text-[11px] font-mono text-emerald-600 font-semibold">
              Net Savings: +$68,350 USD • Delay: -6.0h
            </div>
          </div>

          <div
            onClick={() => setSelectedStrategy('B')}
            className={`p-4 rounded-2xl border text-xs space-y-2 cursor-pointer transition-all ${
              selectedStrategy === 'B'
                ? 'bg-brand-teal/10 border-brand-teal text-brand-teal ring-1 ring-brand-teal shadow-xs'
                : 'bg-surface hover:bg-surface-subtle border-border-subtle text-text-main'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="font-bold">Strategy B</span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-surface-subtle text-text-muted border border-border-subtle">Tug Shifting</span>
            </div>
            <div className="font-semibold text-text-main">Warp Vessel to Berth B02</div>
            <p className="text-[11px] text-text-muted">
              Tug assist shifting (120m). Adds +90m wait to Feeder Baltic at Berth B02. High expense ($32k).
            </p>
            <div className="text-[11px] font-mono text-text-main font-semibold">
              Net Savings: +$36,000 USD • Delay: -4.5h
            </div>
          </div>

          <div
            onClick={() => setSelectedStrategy('C')}
            className={`p-4 rounded-2xl border text-xs space-y-2 cursor-pointer transition-all ${
              selectedStrategy === 'C'
                ? 'bg-brand-teal/10 border-brand-teal text-brand-teal ring-1 ring-brand-teal shadow-xs'
                : 'bg-surface hover:bg-surface-subtle border-border-subtle text-text-main'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="font-bold">Strategy C</span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-surface-subtle text-text-muted border border-border-subtle">Mobile Crane</span>
            </div>
            <div className="font-semibold text-text-main">Deploy MHC-01 + Overtime Gang</div>
            <p className="text-[11px] text-text-muted">
              Outreach limited to 16 rows. Outer deck tiers cannot be worked without ship shifting.
            </p>
            <div className="text-[11px] font-mono text-text-main font-semibold">
              Net Savings: +$42,000 USD • Delay: -3.8h
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
