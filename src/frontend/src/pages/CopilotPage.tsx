import React from 'react';
import { Sparkles, Terminal } from 'lucide-react';
import { CopilotChat } from '../components/copilot/CopilotChat';
import { useOperations } from '../context/OperationsContext';

export const CopilotPage: React.FC = () => {
  const { isOptimizationApplied, isRecoveryPlanApplied, berths } = useOperations();
  const b04 = berths.find(b => b.id === 'B04');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-text-main tracking-tight">
              Varunaa Copilot
            </h1>
            <span className="px-2 py-0.5 rounded text-xs font-semibold bg-teal-50 text-teal-800 border border-teal-200 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-brand-teal" />
              Operational Decision Support
            </span>
          </div>
          <p className="text-sm text-text-muted mt-1">
            Ask about the port. Understand the risk. Explore the next move.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs text-text-muted">
          <span className="w-2 h-2 rounded-full bg-emerald-500" />
          <span>Gemini 1.5 Pro • Telemetry Synced</span>
        </div>
      </div>

      {/* Main Container: Chat on Left, Context Monitor on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 min-h-[65vh] lg:h-[calc(100vh-210px)]">
        {/* Left 3 Cols: Copilot Conversation */}
        <div className="lg:col-span-3 h-[60vh] lg:h-full">
          <CopilotChat embedded={true} />
        </div>

        {/* Right 1 Col: Operational Context Inspector */}
        <div className="bg-surface rounded-3xl border border-border-subtle shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-5 flex flex-col justify-between space-y-4 text-xs overflow-y-auto">
          <div>
            <div className="flex items-center gap-2 border-b border-border-subtle pb-3 text-text-muted text-xs font-semibold uppercase tracking-wider">
              <Terminal className="w-3.5 h-3.5 text-brand-teal" />
              <span>Operational Context</span>
            </div>

            <div className="mt-4 space-y-3">
              <div className="p-3 rounded-lg bg-surface-subtle border border-border-subtle">
                <span className="text-[11px] text-text-muted">Berth B04 State</span>
                <div className="text-base font-bold text-text-main mt-0.5">
                  {b04?.predictedUtilization}% Predicted
                </div>
                <div
                  className={`text-[11px] mt-1 font-medium ${
                    isOptimizationApplied ? 'text-emerald-700' : 'text-rose-600'
                  }`}
                >
                  {isOptimizationApplied ? '✓ Mitigated to B02' : '⚠ High Bottleneck in 24h'}
                </div>
              </div>

              <div className="p-3 rounded-lg bg-surface-subtle border border-border-subtle">
                <span className="text-[11px] text-text-muted">Crane C03 Status</span>
                <div className="text-sm font-semibold text-rose-700 mt-0.5">
                  Unavailable (8h Outage)
                </div>
                <div className="text-[11px] text-text-muted mt-1">
                  {isRecoveryPlanApplied ? '✓ C05 mobilized to cover' : 'Waiting supervisor action'}
                </div>
              </div>

              <div className="p-3 rounded-lg bg-surface-subtle border border-border-subtle">
                <span className="text-[11px] text-text-muted">Available Tools</span>
                <ul className="text-xs text-text-muted mt-1.5 space-y-1 font-mono text-[11px] list-disc list-inside">
                  <li>getPortStatus()</li>
                  <li>getCongestionForecast()</li>
                  <li>getVesselDetails()</li>
                  <li>getBerthStatus()</li>
                  <li>runOptimization()</li>
                  <li>runSimulation()</li>
                  <li>compareRoutes()</li>
                  <li>generate72HourPlan()</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="p-3 rounded-lg bg-surface-subtle text-[11px] text-text-caption leading-relaxed border border-border-subtle">
            Copilot queries real-time port telemetry and recommends actionable decisions with full human oversight.
          </div>
        </div>
      </div>
    </div>
  );
};

