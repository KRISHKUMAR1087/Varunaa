import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Anchor,
  Clock,
  Zap,
  Layers,
  TrendingDown,
  Sparkles,
} from 'lucide-react';
import { useOperations } from '../context/OperationsContext';
import { StatusBadge } from '../components/common/StatusBadge';
import { RiskBadge } from '../components/common/RiskBadge';
import { MetricCard } from '../components/common/MetricCard';
import { Vessel3DViewer } from '../components/common/Vessel3DViewer';

export const VesselDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { vessels, isOptimizationApplied, setIsCopilotOpen, sendCopilotMessage } = useOperations();

  const vessel = vessels.find(v => v.id === id || v.imo === id) || vessels[0];

  const handleAskCopilot = async () => {
    setIsCopilotOpen(true);
    await sendCopilotMessage(`What is the operational status and risk profile of vessel ${vessel.name}?`);
  };

  return (
    <div className="space-y-6">
      {/* Back Navigation & Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/operations/vessels')}
            className="p-2 rounded-xl bg-surface border border-border-subtle text-text-muted hover:text-text-main hover:bg-surface-subtle transition-colors shadow-[0_8px_30px_rgb(0,0,0,0.04)]"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-2xl font-bold text-text-main tracking-tight">
                {vessel.name}
              </h1>
              <StatusBadge status={vessel.status} />
              <RiskBadge level={vessel.demurrageRisk === 'High' ? 'HIGH' : 'LOW'} size="sm" />
            </div>
            <p className="text-xs text-text-muted mt-0.5">
              IMO {vessel.imo} • Flag: {vessel.flag} • Route: {vessel.origin} → {vessel.destination}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleAskCopilot}
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-medium text-text-main bg-surface hover:bg-surface-subtle border border-border-subtle transition-colors shadow-[0_8px_30px_rgb(0,0,0,0.04)]"
          >
            <Sparkles className="w-3.5 h-3.5 text-brand-teal" />
            <span>Consult Copilot</span>
          </button>
          <button
            onClick={() => navigate('/decision/optimizer')}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-brand-teal hover:bg-teal-700 transition-all shadow-[0_8px_30px_rgb(0,0,0,0.04)]"
          >
            <Zap className="w-3.5 h-3.5" />
            <span>Optimize Assignment</span>
          </button>
        </div>
      </div>

      {/* KPI Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <MetricCard
          label="Assigned Berth"
          value={vessel.assignedBerth}
          subtext={vessel.assignedBerth === 'B04' ? 'Congestion Warning' : 'Optimal Depth'}
          icon={Anchor}
          variant={vessel.assignedBerth === 'B04' && !isOptimizationApplied ? 'red' : 'default'}
        />
        <MetricCard
          label="Predicted Turnaround Wait"
          value={vessel.predictedWaitHours}
          unit="hours"
          subtext="Demurrage SLA"
          icon={Clock}
          variant={vessel.predictedWaitHours > 8 ? 'amber' : 'default'}
          trend={{ value: isOptimizationApplied ? '-4.6h saved' : 'SLA at Risk', isPositive: isOptimizationApplied }}
        />
        <MetricCard
          label="Cargo Volume"
          value={vessel.cargoVolume.toLocaleString()}
          unit="TEU"
          subtext={`Cap: ${vessel.teuCapacity.toLocaleString()} TEU`}
          icon={Layers}
        />
        <MetricCard
          label="Historical Turnaround"
          value={vessel.historicalTurnaroundHours}
          unit="hours"
          subtext="Fleet benchmark avg"
          icon={TrendingDown}
        />
      </div>

      {/* Recommended Action Advisory Banner */}
      {vessel.recommendedAction && (
        <div className="bg-surface p-5 rounded-3xl border border-teal-200 bg-teal-50/20 shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-teal-50 border border-teal-200 text-brand-teal flex items-center justify-center shrink-0 mt-0.5">
              <Zap className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-semibold text-teal-950 uppercase tracking-wider">
                Optimization Recommendation
              </h4>
              <p className="text-xs text-text-muted mt-1 leading-relaxed max-w-2xl">
                {vessel.recommendedAction}
              </p>
            </div>
          </div>
          <button
            onClick={() => navigate('/decision/optimizer')}
            className="px-3.5 py-1.5 rounded-xl text-xs font-semibold text-white bg-brand-teal hover:bg-teal-700 shrink-0 shadow-[0_8px_30px_rgb(0,0,0,0.04)]"
          >
            Apply in Optimizer
          </button>
        </div>
      )}

      {/* 3D Vessel Digital Twin Model */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-brand-teal animate-pulse" />
          <h3 className="text-sm font-semibold text-text-main">
            3D Vessel Hull & Digital Twin Visualizer
          </h3>
          <span className="text-xs text-text-caption">
            (Interactive 360° Inspection & Deck Telemetry)
          </span>
        </div>
        <Vessel3DViewer
          vesselName={vessel.name}
          imo={vessel.imo}
          loa={vessel.lengthMeters}
          draught={vessel.draughtMeters}
          teu={vessel.teuCapacity}
          berth={vessel.assignedBerth}
          status={vessel.status}
        />
      </div>

      {/* Technical Specs & Timeline Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Specs */}
        <div className="bg-surface p-6 rounded-3xl border border-border-subtle shadow-[0_8px_30px_rgb(0,0,0,0.04)] space-y-4">
          <h3 className="text-sm font-semibold text-text-main border-b border-border-subtle pb-3">
            Technical Specifications
          </h3>

          <div className="space-y-3 text-xs">
            <div className="flex justify-between py-1 border-b border-border-subtle">
              <span className="text-text-muted">Length Overall (LOA):</span>
              <span className="font-semibold text-text-main">{vessel.lengthMeters} meters</span>
            </div>
            <div className="flex justify-between py-1 border-b border-border-subtle">
              <span className="text-text-muted">Maximum Draught:</span>
              <span className="font-semibold text-text-main">{vessel.draughtMeters} meters</span>
            </div>
            <div className="flex justify-between py-1 border-b border-border-subtle">
              <span className="text-text-muted">Nominal Capacity:</span>
              <span className="font-semibold text-text-main">{vessel.teuCapacity.toLocaleString()} TEU</span>
            </div>
            <div className="flex justify-between py-1 border-b border-border-subtle">
              <span className="text-text-muted">Discharge / Load TEU:</span>
              <span className="font-semibold text-text-main">{vessel.cargoVolume.toLocaleString()} TEU</span>
            </div>
            <div className="flex justify-between py-1 border-b border-border-subtle">
              <span className="text-text-muted">Port of Origin:</span>
              <span className="text-text-main">{vessel.origin}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-border-subtle">
              <span className="text-text-muted">Next Destination:</span>
              <span className="text-text-main">{vessel.destination}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-border-subtle">
              <span className="text-text-muted">Estimated Arrival (ETA):</span>
              <span className="font-semibold text-text-main">{vessel.eta}</span>
            </div>
            <div className="flex justify-between items-center py-1 border-b border-border-subtle">
              <span className="text-text-muted">Estimated Departure (ETD):</span>
              <div className="flex items-center gap-1.5">
                <span className="font-semibold text-text-main">{vessel.etd}</span>
                {vessel.isEstimatedEtd || (vessel.etd && vessel.etd.includes('(Est.)')) ? (
                  <span
                    className="text-[10px] px-1.5 py-0.2 rounded font-semibold bg-sky-50 text-sky-800 border border-sky-200"
                    title={vessel.etdRationale || "Calculated by system from operational turnaround"}
                  >
                    System Est.
                  </span>
                ) : (
                  <span
                    className="text-[10px] px-1.5 py-0.2 rounded font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200"
                    title="Confirmed carrier departure time"
                  >
                    Actual
                  </span>
                )}
              </div>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-text-muted">Priority Tier:</span>
              <span className="font-semibold text-text-main">{vessel.priority}</span>
            </div>
          </div>
        </div>

        {/* Timeline */}
        <div className="lg:col-span-2 bg-surface p-6 rounded-3xl border border-border-subtle shadow-[0_8px_30px_rgb(0,0,0,0.04)] space-y-4">
          <h3 className="text-sm font-semibold text-text-main border-b border-border-subtle pb-3">
            Operational Approach & Milestones
          </h3>

          <div className="relative pl-6 space-y-5 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-border-subtle">
            {vessel.timelineEvents.map((evt, idx) => (
              <div key={idx} className="relative flex items-start gap-3">
                <div
                  className={`absolute -left-6 top-1 w-3.5 h-3.5 rounded-full border-2 ${
                    evt.status === 'completed'
                      ? 'bg-emerald-500 border-emerald-500'
                      : evt.status === 'current'
                      ? 'bg-brand-teal border-brand-teal'
                      : 'bg-surface border-slate-300'
                  }`}
                />
                <div className="bg-surface-subtle p-3.5 rounded-lg border border-border-subtle flex-1 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-semibold text-text-main">
                      {evt.stage}
                    </span>
                    <div className="text-[11px] text-text-muted mt-0.5">
                      Target Window: {evt.time}
                    </div>
                  </div>
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded font-medium ${
                      evt.status === 'completed'
                        ? 'bg-emerald-50 text-emerald-800'
                        : evt.status === 'current'
                        ? 'bg-teal-50 text-teal-800 border border-teal-200'
                        : 'bg-surface text-text-muted'
                    }`}
                  >
                    {evt.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

