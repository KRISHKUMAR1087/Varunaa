import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Zap,
  RefreshCw,
  Sparkles,
  ArrowRight,
  ChevronRight,
  AlertTriangle,
  CheckCircle2,
  Ship,
  Anchor,
  Layers,
  ExternalLink,
  Search,
  Navigation,
} from 'lucide-react';
import { useOperations } from '../context/OperationsContext';
import { useAuth } from '../context/AuthContext';
import { RiskBadge } from '../components/common/RiskBadge';
import { CongestionChart } from '../components/operations/CongestionChart';
import { Port3DOverview } from '../components/common/Port3DOverview';

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { isDemoUser } = useAuth();
  const {
    vessels,
    berths,
    cranes,
    yardBlocks,
    forecast,
    alerts,
    isOptimizationApplied,
    setIsCopilotOpen,
    sendCopilotMessage,
  } = useOperations();
  const [selectedBerth, setSelectedBerth] = useState<string | undefined>(undefined);

  // Aggregated Operational Figures for Snapshot
  const vesselsInPort = vessels.filter(v => ['Berthing', 'Loading'].includes(v.status)).length;
  const arrivingVessels = vessels.filter(v => v.status === 'Arriving');
  const avgBerthUtil = berths.length > 0
    ? Math.round(berths.reduce((acc, b) => acc + b.currentUtilization, 0) / berths.length)
    : 0;
  const activeCranes = cranes.filter(c => c.status === 'ACTIVE').length;
  const totalOccupiedYard = yardBlocks.reduce((acc, y) => acc + y.occupiedTeu, 0);
  const totalYardCap = yardBlocks.reduce((acc, y) => acc + y.totalTeu, 0);
  const yardUtil = totalYardCap > 0 ? Math.round((totalOccupiedYard / totalYardCap) * 100) : 0;
  const activeAlertsList = alerts.filter(a => !a.isResolved);

  const b04 = berths.find(b => b.id === 'B04');
  const hasActiveIncident = isDemoUser || (forecast !== null && !!forecast.riskBottleneckBerth) || activeAlertsList.length > 0;

  const handleAskGeminiWhy = async () => {
    setIsCopilotOpen(true);
    await sendCopilotMessage('Why will Berth B04 become congested and what are the primary bottleneck drivers?');
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-8">
      {/* 1. OPERATIONAL HEADER (Calm, spacious, minimal status) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-border-subtle">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-text-main">
              Port Operations Command Center
            </h1>
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                !hasActiveIncident || isOptimizationApplied
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  : 'bg-rose-50 text-rose-800 border-rose-200'
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  !hasActiveIncident || isOptimizationApplied ? 'bg-emerald-600' : 'bg-rose-600 animate-pulse'
                }`}
              />
              {!hasActiveIncident
                ? 'Port Operations Normal'
                : isOptimizationApplied
                ? 'Operational Flow Optimized'
                : 'Attention Required: Berth Bottleneck'}
            </span>
          </div>
          <p className="text-xs text-text-muted mt-1">
            Predictive maritime operations for the next 6–72 hours • Port Sector Alpha • Shift 2 (14:00 – 22:00)
          </p>
        </div>

        {/* Quick action tools */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => navigate('/intelligence/delays')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 transition-colors shadow-xs"
          >
            <Search className="w-3.5 h-3.5" />
            <span>Delay Lab (90d)</span>
          </button>
          <button
            onClick={() => navigate('/intelligence/voyage-twin')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold text-white bg-brand-teal hover:bg-teal-700 transition-colors shadow-xs"
          >
            <Navigation className="w-3.5 h-3.5" />
            <span>Voyage Digital Twin</span>
          </button>
          <button
            onClick={() => navigate('/decision/simulator')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium text-text-main bg-surface hover:bg-surface-subtle border border-border-subtle transition-colors shadow-xs"
          >
            <RefreshCw className="w-3.5 h-3.5 text-text-muted" />
            <span>What-If Simulator</span>
          </button>
          <button
            onClick={() => navigate('/decision/verification')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium text-text-main bg-surface hover:bg-surface-subtle border border-border-subtle transition-colors shadow-xs"
          >
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>10 Scenarios</span>
          </button>
        </div>
      </div>

      {/* 2. PRIMARY OPERATIONAL EVENT (Dominant Incident Briefing Panel) */}
      {!hasActiveIncident ? (
        <div className="bg-surface rounded-3xl border border-emerald-200/80 shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-6 transition-all">
          <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6">
            <div className="space-y-4 max-w-3xl">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-100 shadow-xs">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2.5">
                    <h2 className="text-lg font-bold text-text-main">
                      Port Operations Normal — All Systems Nominal
                    </h2>
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                      Optimal
                    </span>
                  </div>
                  <p className="text-xs text-text-muted mt-0.5">
                    Real-time Telemetry Active • No bottleneck risks detected across port sectors
                  </p>
                </div>
              </div>

              <p className="text-sm text-text-main leading-relaxed">
                All vessel operations, quay berths, and container yard channels are running smoothly. Predictive AI models continuously monitor traffic flow and berth allocation to maintain peak efficiency.
              </p>

              <div className="flex items-center gap-4 text-xs pt-2">
                <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold bg-emerald-50 px-2.5 py-1 rounded border border-emerald-100">
                  ✓ System Baseline Nominal
                </span>
                <span className="inline-flex items-center gap-1 text-text-muted">
                  ✓ Active Vessels: {vessels.length}
                </span>
                <span className="inline-flex items-center gap-1 text-text-muted">
                  ✓ Active Alerts: {activeAlertsList.length}
                </span>
              </div>
            </div>

            <div className="lg:w-80 flex flex-col justify-between bg-surface-subtle/50 p-5 rounded-2xl border border-border-subtle space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-[11px] font-medium text-text-muted">Avg Berth Util</div>
                  <div className="text-2xl font-bold text-text-main mt-0.5">
                    {isNaN(avgBerthUtil) ? 0 : avgBerthUtil}%
                  </div>
                  <div className="text-[10px] text-text-caption">Operating baseline</div>
                </div>
                <div>
                  <div className="text-[11px] font-medium text-text-muted">Yard Util</div>
                  <div className="text-2xl font-bold text-emerald-600 mt-0.5">
                    {isNaN(yardUtil) ? 0 : yardUtil}%
                  </div>
                  <div className="text-[10px] text-emerald-600 font-medium">Nominal</div>
                </div>
                <div>
                  <div className="text-[11px] font-medium text-text-muted">In-Port Vessels</div>
                  <div className="flex items-baseline gap-1 mt-0.5">
                    <span className="text-2xl font-bold text-text-main">{vesselsInPort}</span>
                    <span className="text-sm font-semibold text-text-main">vessels</span>
                  </div>
                  <div className="text-[10px] text-text-caption">At berths</div>
                </div>
                <div>
                  <div className="text-[11px] font-medium text-text-muted">Active Cranes</div>
                  <div className="text-2xl font-bold text-emerald-600 mt-0.5">{activeCranes}</div>
                  <div className="text-[10px] text-text-caption">Available</div>
                </div>
              </div>

              <div className="pt-3 border-t border-border-subtle">
                <button
                  onClick={() => navigate('/operations/berths')}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-full text-xs font-semibold text-white bg-brand-teal hover:bg-teal-700 transition-all shadow-[0_4px_12px_rgba(20,184,166,0.3)]"
                >
                  <Anchor className="w-4 h-4" />
                  <span>Manage Berths</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : !isOptimizationApplied ? (
        <div className="bg-surface rounded-3xl border-2 border-rose-200/80 shadow-[0_8px_30px_rgb(0,0,0,0.06)] p-6 transition-all">
          <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6">
            <div className="space-y-4 max-w-3xl">
              {/* Event Badge & Title */}
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-2xl bg-rose-50 text-rose-600 border border-rose-100 shadow-xs">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2.5">
                    <h2 className="text-lg font-bold text-text-main">
                      Berth B04 requires operational intervention
                    </h2>
                    <RiskBadge level="HIGH" size="sm" />
                  </div>
                  <p className="text-xs text-text-muted mt-0.5">
                    Bottleneck projected to peak at T+24h • Exceeds 85% safety threshold
                  </p>
                </div>
              </div>

              {/* Operational Rationale / Context */}
              <p className="text-sm text-text-main leading-relaxed">
                Vessel arrival bunching (<strong className="font-semibold">MV Ocean Star</strong> and <strong className="font-semibold">Ever Forward</strong>) combined with reduced STS crane availability is projected to push Berth B04 utilization to <strong className="text-rose-600 font-semibold">94%</strong>. Without intervention, anchorage waiting times will escalate from 4.2h to 11.4h with significant demurrage exposure.
              </p>

              {/* Machine Learning Drivers Breakdown */}
              <div className="bg-surface-subtle/80 rounded-2xl p-4 border border-border-subtle">
                <div className="text-xs font-semibold text-text-main mb-2">
                  Contributing Factors (ML Attribution):
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  {(forecast?.drivers || []).map((d, idx) => (
                    <div key={idx} className="bg-surface p-2.5 rounded-xl border border-border-subtle space-y-1 shadow-xs">
                      <div className="flex items-center justify-between text-text-muted">
                        <span>Factor 0{idx + 1}</span>
                        <span className="font-semibold text-text-main">{d.percentage}%</span>
                      </div>
                      <div className="font-medium text-text-main truncate" title={d.factor}>
                        {d.factor}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Impact Metrics & Primary Actions */}
            <div className="lg:w-80 flex flex-col justify-between bg-surface-subtle/50 p-5 rounded-2xl border border-border-subtle space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-[11px] font-medium text-text-muted">Current Util</div>
                  <div className="text-2xl font-bold text-text-main mt-0.5">
                    {b04?.currentUtilization || 82}%
                  </div>
                  <div className="text-[10px] text-text-caption">Operating baseline</div>
                </div>
                <div>
                  <div className="text-[11px] font-medium text-text-muted">Predicted Peak</div>
                  <div className="text-2xl font-bold text-rose-600 mt-0.5">94%</div>
                  <div className="text-[10px] text-rose-600 font-medium">Critical (+24h)</div>
                </div>
                <div>
                  <div className="text-[11px] font-medium text-text-muted">Queue Count</div>
                  <div className="flex items-baseline gap-1 mt-0.5">
                    <span className="text-2xl font-bold text-text-main">7</span>
                    <span className="text-sm font-semibold text-text-main">vessels</span>
                  </div>
                  <div className="text-[10px] text-text-caption">In roadstead</div>
                </div>
                <div>
                  <div className="text-[11px] font-medium text-text-muted">Expected Wait</div>
                  <div className="text-2xl font-bold text-rose-600 mt-0.5">11.4h</div>
                  <div className="text-[10px] text-text-caption">+$182k demurrage</div>
                </div>
              </div>

              <div className="space-y-2.5 pt-3 border-t border-border-subtle">
                <button
                  onClick={() => navigate('/decision/optimizer')}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-full text-xs font-semibold text-white bg-brand-teal hover:bg-teal-700 transition-all shadow-[0_4px_12px_rgba(20,184,166,0.3)] group"
                >
                  <Zap className="w-4 h-4" />
                  <span>Optimize Berth B04</span>
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                </button>
                <button
                  onClick={handleAskGeminiWhy}
                  className="w-full flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-full text-xs font-semibold text-text-main bg-white hover:bg-surface border border-border-subtle transition-colors shadow-xs"
                >
                  <Sparkles className="w-3.5 h-3.5 text-brand-teal" />
                  <span>Ask Gemini Why</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Mitigated State Panel */
        <div className="bg-surface rounded-3xl border border-emerald-200 shadow-[0_8px_30px_rgb(0,0,0,0.06)] p-6 transition-all">
          <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6">
            <div className="space-y-4 max-w-3xl">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-100 shadow-xs">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2.5">
                    <h2 className="text-lg font-bold text-text-main">
                      Berth B04 Congestion Mitigated
                    </h2>
                    <RiskBadge level="LOW" size="sm" />
                  </div>
                  <p className="text-xs text-text-muted mt-0.5">
                    Optimization Plan Active • Peak utilization controlled at 78%
                  </p>
                </div>
              </div>

              <p className="text-sm text-text-main leading-relaxed">
                Recommendation applied: <strong className="font-semibold">MV Ocean Star</strong> re-allocated to Berth B02 with twin STS crane priority. Berth B04 peak queue has been reduced by 3 vessels, successfully avoiding operational saturation and saving an estimated 4.6 hours per vessel.
              </p>

              <div className="flex items-center gap-4 text-xs">
                <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold bg-emerald-50 px-2.5 py-1 rounded border border-emerald-100">
                  ✓ Demurrage Saved: $148,000
                </span>
                <span className="inline-flex items-center gap-1 text-text-muted">
                  ✓ Turnaround Time: -4.6 hours
                </span>
                <span className="inline-flex items-center gap-1 text-text-muted">
                  ✓ Crane Efficiency: +18.4%
                </span>
              </div>
            </div>

            {/* Impact Metrics & Primary Actions */}
            <div className="lg:w-80 flex flex-col justify-between bg-surface-subtle/50 p-5 rounded-2xl border border-border-subtle space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-[11px] font-medium text-text-muted">Current Util</div>
                  <div className="text-2xl font-bold text-text-main mt-0.5">64%</div>
                  <div className="text-[10px] text-text-caption">Controlled</div>
                </div>
                <div>
                  <div className="text-[11px] font-medium text-text-muted">Predicted Peak</div>
                  <div className="text-2xl font-bold text-emerald-700 mt-0.5">78%</div>
                  <div className="text-[10px] text-emerald-700 font-medium">Safe (&lt;85%)</div>
                </div>
                <div>
                  <div className="text-[11px] font-medium text-text-muted">Queue Count</div>
                  <div className="flex items-baseline gap-1 mt-0.5">
                    <span className="text-2xl font-bold text-text-main">4</span>
                    <span className="text-sm font-semibold text-text-main">vessels</span>
                  </div>
                  <div className="text-[10px] text-text-caption">-3 vessels diverted</div>
                </div>
                <div>
                  <div className="text-[11px] font-medium text-text-muted">Expected Wait</div>
                  <div className="text-2xl font-bold text-emerald-700 mt-0.5">6.8h</div>
                  <div className="text-[10px] text-emerald-700 font-medium">-4.6h wait time</div>
                </div>
              </div>

              <div className="space-y-2.5 pt-3 border-t border-border-subtle">
                <button
                  onClick={() => navigate('/decision/optimizer')}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-full text-xs font-semibold text-white bg-brand-teal hover:bg-teal-700 transition-all shadow-[0_4px_12px_rgba(20,184,166,0.3)]"
                >
                  <span>Review Applied Plan</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => navigate('/operations')}
                  className="w-full flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-full text-xs font-semibold text-text-main bg-white hover:bg-surface border border-border-subtle transition-colors shadow-xs"
                >
                  <span>View Operations Gantt</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. PORT FLOW FORECAST (Large, Clean, Uncramped Trajectory Chart) */}
      <div className="bg-surface rounded-3xl border border-border-subtle p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border-subtle pb-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-semibold text-text-main">
                Port Congestion & Flow Trajectory
              </h2>
              <span className="text-xs text-text-caption">
                (When will the port become constrained?)
              </span>
            </div>
            <p className="text-xs text-text-muted mt-0.5">
              Simulated quayside capacity over the next 72 hours across berths B01 through B06.
            </p>
          </div>

          <button
            onClick={() => navigate('/intelligence/forecast')}
            className="inline-flex items-center gap-1.5 text-xs text-brand-teal hover:underline font-medium self-start sm:self-auto"
          >
            <span>View Full Deep-Dive Analysis</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Expansive Chart */}
        <div className="pt-2">
          <CongestionChart
            selectedBerth={selectedBerth}
            onSelectBerth={setSelectedBerth}
            height={320}
          />
        </div>

        {/* Narrative Flow Summary */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-border-subtle text-xs text-text-muted bg-surface-subtle/50 px-4 py-3 rounded-lg">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-text-main">Operational Insight:</span>
            <span>
              Peak constraint interval is between <strong className="text-text-main">T+18h and T+30h</strong> (tomorrow afternoon shift). Berth B04 reaches critical threshold while berths B01 (68%) and B02 ({isOptimizationApplied ? '74%' : '65%'}) maintain available buffer capacity.
            </span>
          </div>
          <div className="shrink-0 text-text-caption font-mono">
            Model Confidence: 91.4%
          </div>
        </div>
      </div>

      {/* 4. 3D PORT TERMINAL & MEGA-SHIP OVERVIEW */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-brand-teal animate-pulse" />
            <h2 className="text-base font-semibold text-text-main">
              Port Sector Alpha — 3D Terminal & Mega-Ship Visualizer
            </h2>
            <span className="text-xs text-text-caption hidden md:inline">
              (Interactive Quayside Berths B01–B06, STS Gantry Cranes & Container Yard)
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-text-muted font-medium hidden sm:inline">
              Drag to Orbit • Scroll to Zoom
            </span>
          </div>
        </div>

        <Port3DOverview />
      </div>

      {/* 5. OPERATIONAL SNAPSHOT (Quiet, compact horizontal status strip as supporting context) */}
      <div className="bg-surface rounded-3xl border border-border-subtle shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-1.5 overflow-hidden">
        <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 divide-y sm:divide-y-0 sm:divide-x divide-border-subtle">
          {/* Vessels Cell */}
          <div
            onClick={() => navigate('/operations/vessels')}
            className="p-4 sm:p-3.5 hover:bg-surface-subtle/70 sm:rounded-2xl cursor-pointer transition-colors group"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-text-muted">
                <Ship className="w-4 h-4 text-text-muted group-hover:text-brand-teal transition-colors" />
                <span>Vessels</span>
              </div>
              <ChevronRight className="w-4 h-4 text-text-caption group-hover:text-text-main group-hover:translate-x-0.5 transition-all" />
            </div>
            <div className="text-xl font-bold text-text-main mt-1.5">{vesselsInPort} in port</div>
            <div className="text-[11px] text-text-caption mt-0.5">
              {arrivingVessels.length} arriving in 24h
            </div>
          </div>

          {/* Berths Cell */}
          <div
            onClick={() => navigate('/operations/berths')}
            className="p-4 sm:p-3.5 hover:bg-surface-subtle/70 sm:rounded-2xl cursor-pointer transition-colors group"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-text-muted">
                <Anchor className="w-4 h-4 text-text-muted group-hover:text-brand-teal transition-colors" />
                <span>Berths</span>
              </div>
              <ChevronRight className="w-4 h-4 text-text-caption group-hover:text-text-main group-hover:translate-x-0.5 transition-all" />
            </div>
            <div className="text-xl font-bold text-text-main mt-1.5">{avgBerthUtil}% avg</div>
            <div className="text-[11px] text-text-caption mt-0.5">
              6 commercial quays
            </div>
          </div>

          {/* Cranes Cell */}
          <div
            onClick={() => navigate('/operations/cranes')}
            className="p-4 sm:p-3.5 hover:bg-surface-subtle/70 sm:rounded-2xl cursor-pointer transition-colors group"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-text-muted">
                <Zap className="w-4 h-4 text-text-muted group-hover:text-brand-teal transition-colors" />
                <span>Cranes</span>
              </div>
              <ChevronRight className="w-4 h-4 text-text-caption group-hover:text-text-main group-hover:translate-x-0.5 transition-all" />
            </div>
            <div className="text-xl font-bold text-text-main mt-1.5">
              {activeCranes}/{cranes.length} active
            </div>
            <div className="text-[11px] text-text-caption mt-0.5">
              Crane C03 in maintenance
            </div>
          </div>

          {/* Yard Cell */}
          <div
            onClick={() => navigate('/operations/yard')}
            className="p-4 sm:p-3.5 hover:bg-surface-subtle/70 sm:rounded-2xl cursor-pointer transition-colors group"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-text-muted">
                <Layers className="w-4 h-4 text-text-muted group-hover:text-brand-teal transition-colors" />
                <span>Yard</span>
              </div>
              <ChevronRight className="w-4 h-4 text-text-caption group-hover:text-text-main group-hover:translate-x-0.5 transition-all" />
            </div>
            <div className="text-xl font-bold text-text-main mt-1.5">{yardUtil}% capacity</div>
            <div className="text-[11px] text-text-caption mt-0.5">
              34k / 50k TEU staged
            </div>
          </div>

          {/* Queue & Alerts Cell */}
          <div
            onClick={() => navigate('/alerts')}
            className="p-4 sm:p-3.5 hover:bg-surface-subtle/70 sm:rounded-2xl cursor-pointer transition-colors group"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-text-muted">
                <AlertTriangle className="w-4 h-4 text-text-muted group-hover:text-brand-teal transition-colors" />
                <span>Active Alerts</span>
              </div>
              <ChevronRight className="w-4 h-4 text-text-caption group-hover:text-text-main group-hover:translate-x-0.5 transition-all" />
            </div>
            <div className="text-xl font-bold text-text-main mt-1.5">
              {activeAlertsList.length} operational
            </div>
            <div className="text-[11px] text-rose-600 font-medium mt-0.5">
              {isOptimizationApplied ? 'All critical cleared' : '1 High priority (B04)'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
