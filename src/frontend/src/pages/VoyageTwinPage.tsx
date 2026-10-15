import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Ship,
  Navigation,
  Anchor,
  Clock,
  Fuel,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';
import {
  VoyageDigitalTwinService,
  VesselVoyageTwin,
} from '../services/voyageDigitalTwinService';
import { useOperations } from '../context/OperationsContext';

export const VoyageTwinPage: React.FC = () => {
  const navigate = useNavigate();
  const { showToast, setIsCopilotOpen, sendCopilotMessage } = useOperations();
  const [selectedVesselId] = useState<string>('VES-01');
  const [speedAdjustmentKnots, setSpeedAdjustmentKnots] = useState<number>(16.5);
  const [simulatedDepartureDelayHours] = useState<number>(4.5);

  const twin: VesselVoyageTwin = useMemo(() => {
    return VoyageDigitalTwinService.getVoyageTwin(selectedVesselId);
  }, [selectedVesselId]);

  // Recalculate downstream propagation based on simulated or actual departure delay
  const propagatedLegs = useMemo(() => {
    const baseOrig = '2026-10-16T13:00:00Z';
    const revised = new Date(new Date(baseOrig).getTime() + simulatedDepartureDelayHours * 3600 * 1000).toISOString();
    return VoyageDigitalTwinService.propagateDelay(baseOrig, revised, twin.downstreamLegs);
  }, [twin, simulatedDepartureDelayHours]);

  // Calculate bunker fuel trade-off:
  // Fuel consumption scales with speed cubed: P ~ v^3
  const baselineSpeed = 15.0;
  const speedRatio = speedAdjustmentKnots / baselineSpeed;
  const fuelMultiplier = Math.pow(speedRatio, 3);
  const additionalFuelTonsPerDay = Math.max(0, (fuelMultiplier - 1.0) * twin.bunkerConsumptionMtPerDay);
  const additionalBunkerCostUsd = Math.round(additionalFuelTonsPerDay * 620 * 1.5); // $620/mt VLSFO over 1.5 days transit

  const handleApplySpeedRecovery = () => {
    showToast(
      'success',
      'Engine Telegraph Speed Instruction Dispatched',
      `Voyage steaming speed updated to ${speedAdjustmentKnots} kts. Downstream delay reduced by 1.8h at Antwerp Gateway.`
    );
  };

  const handleAskCopilot = async () => {
    setIsCopilotOpen(true);
    await sendCopilotMessage(
      `Analyze voyage propagation for ${twin.vesselName} (${twin.currentVoyageNumber}). Rotterdam departure is delayed by ${simulatedDepartureDelayHours}h. What is the impact on Antwerp and Hamburg feeder transshipments?`
    );
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* 1. Header & Live Navigational State */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-border-subtle">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-text-main">
              Vessel Voyage Digital Twin
            </h1>
            <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-xs font-semibold bg-brand-teal/15 text-brand-teal border border-brand-teal/30">
              <span className="w-1.5 h-1.5 rounded-full bg-brand-teal animate-pulse" />
              AIS Live Telemetry
            </span>
          </div>
          <p className="text-xs sm:text-sm text-text-muted mt-1 max-w-4xl">
            Real-time geospatial tracking, waypoint progress, 11-stage port call execution, and downstream transshipment delay propagation.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-medium bg-surface hover:bg-surface-subtle border border-border-subtle text-text-main transition-colors shadow-xs"
          >
            <Anchor className="w-3.5 h-3.5 text-brand-teal" />
            <span>View 3D Port View</span>
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

      {/* 2. Vessel Profile & Navigational Ribbon */}
      <div className="bg-surface rounded-3xl border border-border-subtle p-6 shadow-xs space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-border-subtle">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-brand-teal text-white flex items-center justify-center font-bold text-lg shadow-sm">
              <Ship className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="text-lg font-bold text-text-main">
                  {twin.vesselName}
                </h2>
                <span className="text-xs px-2.5 py-0.5 rounded-full font-mono bg-surface-subtle border border-border-subtle text-text-muted">
                  IMO {twin.imo}
                </span>
                <span className="text-xs px-2.5 py-0.5 rounded-full font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                  {twin.currentLocation.navigationalStatus}
                </span>
              </div>
              <p className="text-xs text-text-muted mt-0.5">
                Voyage {twin.currentVoyageNumber} • Route: {twin.originPort.name} → {twin.destinationPort.name} • {twin.vesselType}
              </p>
            </div>
          </div>

          {/* Real-time telemetry badges */}
          <div className="flex items-center gap-4 text-xs font-mono">
            <div className="bg-surface-subtle px-3 py-2 rounded-xl border border-border-subtle text-center">
              <span className="text-[10px] text-text-caption block uppercase">Position</span>
              <span className="font-semibold text-text-main">51.95°N, 4.02°E</span>
            </div>
            <div className="bg-surface-subtle px-3 py-2 rounded-xl border border-border-subtle text-center">
              <span className="text-[10px] text-text-caption block uppercase">Heading / Speed</span>
              <span className="font-semibold text-text-main">{twin.currentLocation.headingDegrees}° • {twin.currentLocation.speedKnots} kts</span>
            </div>
            <div className="bg-surface-subtle px-3 py-2 rounded-xl border border-border-subtle text-center">
              <span className="text-[10px] text-text-caption block uppercase">Draught / LOA</span>
              <span className="font-semibold text-text-main">{twin.draughtMeters}m / {twin.lengthMeters}m</span>
            </div>
          </div>
        </div>

        {/* 3. Nautical Route Waypoints Strip */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold text-text-muted">
            <span className="flex items-center gap-1.5">
              <Navigation className="w-3.5 h-3.5 text-brand-teal" />
              Nautical Transit Corridor & Waypoint Progress
            </span>
            <span className="text-[11px] font-mono text-text-caption">
              Waypoints Passed: 4 / 7
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-7 gap-2">
            {twin.waypoints.map((wp, idx) => (
              <div
                key={idx}
                className={`p-3 rounded-2xl border text-xs space-y-1 transition-all ${
                  wp.status === 'CURRENT'
                    ? 'bg-brand-teal/10 border-brand-teal text-brand-teal shadow-xs'
                    : wp.status === 'PAST'
                    ? 'bg-surface-subtle border-border-subtle text-text-muted'
                    : 'bg-surface border-border-subtle/80 text-text-caption'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-[10px] uppercase tracking-wider">
                    WP {idx + 1}
                  </span>
                  {wp.status === 'CURRENT' ? (
                    <span className="w-2 h-2 rounded-full bg-brand-teal animate-pulse" />
                  ) : wp.status === 'PAST' ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                  ) : (
                    <Clock className="w-3.5 h-3.5 text-text-caption" />
                  )}
                </div>
                <div className="font-semibold text-text-main truncate" title={wp.name}>
                  {wp.name}
                </div>
                <div className="text-[10px] font-mono opacity-80">
                  {wp.timestamp ? wp.timestamp.split('T')[0] : wp.estimatedArrival?.split('T')[0] || 'TBD'}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 4. Two-Column Operational Layout: 11-Stage Port Timeline & Downstream Propagation */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: 11-Stage Chronological Port Call Timeline */}
        <div className="bg-surface rounded-3xl border border-border-subtle p-6 space-y-4 shadow-xs">
          <div className="flex items-center justify-between border-b border-border-subtle pb-3">
            <div>
              <h3 className="text-base font-bold text-text-main">
                Port Call Chronological Timeline (11 Stages)
              </h3>
              <p className="text-xs text-text-muted mt-0.5">
                Current Port Call: Port of Rotterdam (Maasvlakte Quay 04)
              </p>
            </div>
            <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-full bg-rose-50 text-rose-800 border border-rose-200">
              +{twin.delayHoursAtCurrentPort}h Call Variance
            </span>
          </div>

          <div className="space-y-2.5 max-h-[560px] overflow-y-auto pr-1">
            {twin.currentCallTimeline.map((step, idx) => (
              <div
                key={idx}
                className={`p-3.5 rounded-2xl border text-xs space-y-1 transition-all ${
                  step.status === 'DISRUPTED'
                    ? 'bg-rose-50/50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/40'
                    : step.status === 'RECOVERED'
                    ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/40'
                    : 'bg-surface-subtle/60 border-border-subtle'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-surface border border-border-subtle text-text-main font-bold text-[10px] flex items-center justify-center">
                      {idx + 1}
                    </span>
                    <span className="font-bold text-text-main">{step.label}</span>
                  </div>
                  <span
                    className={`font-semibold px-2 py-0.5 rounded text-[10px] ${
                      step.status === 'DISRUPTED'
                        ? 'bg-rose-100 text-rose-800'
                        : step.status === 'RECOVERED'
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-surface text-text-muted'
                    }`}
                  >
                    {step.status}
                  </span>
                </div>

                <p className="text-text-muted text-[11px] pl-7">
                  {step.description}
                </p>

                <div className="flex items-center justify-between text-[10px] font-mono text-text-caption pl-7 pt-1">
                  <span>Planned: {step.plannedTime.replace('Z', '').replace('T', ' ')}</span>
                  <span>{step.actualTime ? `Actual: ${step.actualTime.replace('Z', '').replace('T', ' ')}` : `Revised: ${step.revisedTime?.replace('Z', '').replace('T', ' ')}`}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Downstream Voyage Propagation & Transshipment Connections */}
        <div className="space-y-6">
          {/* Downstream Port Schedules & Connection Risk */}
          <div className="bg-surface rounded-3xl border border-border-subtle p-6 space-y-4 shadow-xs">
            <div className="flex items-center justify-between border-b border-border-subtle pb-3">
              <div>
                <h3 className="text-base font-bold text-text-main">
                  Downstream Schedule Propagation
                </h3>
                <p className="text-xs text-text-muted mt-0.5">
                  Recalculated impact on connecting feeder loops and cargo delivery deadlines
                </p>
              </div>
              <span className="text-xs font-mono font-medium text-brand-teal">
                Dynamic Recalculation
              </span>
            </div>

            <div className="space-y-3">
              {propagatedLegs.map((leg, idx) => (
                <div
                  key={idx}
                  className="p-4 rounded-2xl bg-surface-subtle border border-border-subtle space-y-2 text-xs"
                >
                  <div className="flex items-center justify-between">
                    <div className="font-bold text-text-main text-sm">
                      {leg.portName} ({leg.portCode})
                    </div>
                    <span
                      className={`font-bold font-mono px-2.5 py-0.5 rounded-full text-xs ${
                        leg.delayHours > 4.0
                          ? 'bg-rose-100 text-rose-800'
                          : 'bg-emerald-100 text-emerald-800'
                      }`}
                    >
                      +{leg.delayHours}h Delay
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[11px] font-mono text-text-muted py-1 border-y border-border-subtle/60">
                    <div>Original ETA: {leg.originalEta.replace('Z', '').replace('T', ' ')}</div>
                    <div className="text-rose-600 font-semibold">Propagated ETA: {leg.propagatedEta.replace('Z', '').replace('T', ' ')}</div>
                  </div>

                  <p className="text-text-muted text-xs leading-relaxed">
                    {leg.notes}
                  </p>

                  <div className="flex items-center justify-between text-[11px] pt-1">
                    <span className="text-text-caption">
                      Connecting Boxes At Risk: <strong className="text-text-main">{leg.connectingShipmentsAtRisk} TEU</strong>
                    </span>
                    <span className={`font-semibold ${leg.isFeederCatchable ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {leg.isFeederCatchable ? '✓ Transshipment Feeder Catchable' : '✗ Missed Connection Alert'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Interactive Speed & Bunker Fuel Trade-off Lever */}
          <div className="bg-surface rounded-3xl border border-border-subtle p-6 space-y-4 shadow-xs">
            <div className="flex items-center justify-between border-b border-border-subtle pb-3">
              <div className="flex items-center gap-2">
                <Fuel className="w-4 h-4 text-amber-500" />
                <h3 className="text-sm font-bold text-text-main">
                  Transit Speed Recovery & Bunker Trade-Off
                </h3>
              </div>
              <span className="text-xs font-mono text-text-muted">
                P ~ v³ Hydrodynamic Scaling
              </span>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-text-muted">Steaming Speed:</span>
                <span className="font-bold text-text-main text-sm">{speedAdjustmentKnots} kts</span>
              </div>
              <input
                type="range"
                min="13.0"
                max="20.5"
                step="0.5"
                value={speedAdjustmentKnots}
                onChange={(e) => setSpeedAdjustmentKnots(parseFloat(e.target.value))}
                className="w-full accent-brand-teal cursor-pointer"
              />

              <div className="grid grid-cols-2 gap-3 pt-2">
                <div className="p-3 rounded-xl bg-surface-subtle border border-border-subtle">
                  <span className="text-[10px] text-text-caption block uppercase">Recovered Time</span>
                  <span className="font-bold text-emerald-600 text-sm">
                    -{((speedAdjustmentKnots - 15.0) * 0.9).toFixed(1)} hours
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-surface-subtle border border-border-subtle">
                  <span className="text-[10px] text-text-caption block uppercase">Additional Bunker Cost</span>
                  <span className="font-bold text-amber-600 text-sm">
                    +${additionalBunkerCostUsd.toLocaleString()} USD
                  </span>
                </div>
              </div>

              <button
                onClick={handleApplySpeedRecovery}
                className="w-full py-2.5 px-4 rounded-xl text-xs font-semibold text-white bg-brand-teal hover:bg-teal-700 transition-colors shadow-xs"
              >
                Apply Steaming Speed Advisory
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
