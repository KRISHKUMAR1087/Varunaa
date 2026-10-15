import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Zap,
  Sparkles,
} from 'lucide-react';
import { useOperations } from '../context/OperationsContext';
import { CongestionChart } from '../components/operations/CongestionChart';
import { RiskBadge } from '../components/common/RiskBadge';

export const ForecastPage: React.FC = () => {
  const navigate = useNavigate();
  const {
    forecast,
    berths,
    isOptimizationApplied,
    setIsCopilotOpen,
    sendCopilotMessage,
  } = useOperations();

  const [selectedBerthId, setSelectedBerthId] = useState<string>('B04');
  const selectedBerth = berths.find(b => b.id === selectedBerthId) || berths[0] || {
    id: selectedBerthId,
    name: `Berth ${selectedBerthId}`,
    currentUtilization: 0,
    predictedUtilization: 0,
    riskLevel: 'LOW' as const,
  };

  const handleExplainWithGemini = async () => {
    setIsCopilotOpen(true);
    await sendCopilotMessage(`Explain the congestion forecast and bottleneck drivers for Berth ${selectedBerthId}.`);
  };

  if (!forecast) {
    return (
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-text-main tracking-tight">
              Congestion Forecast Engine
            </h1>
            <p className="text-sm text-text-muted mt-1">
              Predictive bottleneck neural model trained on historical AIS trajectories, gate transactions, and weather tides.
            </p>
          </div>
        </div>
        <div className="bg-surface rounded-3xl border border-border-subtle p-12 text-center space-y-3 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
          <Sparkles className="w-10 h-10 text-brand-teal mx-auto" />
          <h3 className="text-lg font-bold text-text-main">No congestion forecast data available</h3>
          <p className="text-sm text-text-muted max-w-md mx-auto">
            Congestion predictions will display here once operational data or vessel berth requests are submitted.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-text-main tracking-tight">
              Congestion Forecast Engine
            </h1>
            <span className="px-2 py-0.5 rounded text-xs font-semibold bg-teal-50 text-teal-800 border border-teal-200">
              6h–72h Predictive Horizon
            </span>
          </div>
          <p className="text-sm text-text-muted mt-1">
            Predictive bottleneck neural model trained on historical AIS trajectories, gate transactions, and weather tides.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleExplainWithGemini}
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-medium text-text-main bg-surface hover:bg-surface-subtle border border-border-subtle transition-colors shadow-[0_8px_30px_rgb(0,0,0,0.04)]"
          >
            <Sparkles className="w-3.5 h-3.5 text-brand-teal" />
            <span>Explain with Gemini</span>
          </button>
          <button
            onClick={() => navigate('/decision/optimizer')}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-brand-teal hover:bg-teal-700 transition-all shadow-[0_8px_30px_rgb(0,0,0,0.04)]"
          >
            <Zap className="w-3.5 h-3.5" />
            <span>Optimize {selectedBerthId}</span>
          </button>
        </div>
      </div>

      {/* Main Grid: Forecast Chart & Analysis Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 2 Cols: Interactive Recharts Visualization */}
        <div className="lg:col-span-2 bg-surface p-6 rounded-3xl border border-border-subtle shadow-[0_8px_30px_rgb(0,0,0,0.04)] space-y-4">
          <div className="flex items-center justify-between border-b border-border-subtle pb-3">
            <div>
              <h2 className="text-sm font-semibold text-text-main">
                Multi-Berth Saturation Curves (6h–72h)
              </h2>
              <span className="text-xs text-text-muted">
                Select any berth to inspect its predictive trajectory.
              </span>
            </div>
            <div className="text-xs text-text-caption">
              Updated: <strong className="text-text-main font-medium">Just now</strong>
            </div>
          </div>

          <CongestionChart
            selectedBerth={selectedBerthId}
            onSelectBerth={setSelectedBerthId}
            height={340}
          />

          {/* Quick Metrics of Selected Berth */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 pt-2">
            <div className="bg-surface-subtle p-3.5 rounded-lg border border-border-subtle">
              <span className="text-xs text-text-muted">Current Utilization</span>
              <div className="text-xl font-bold text-text-main mt-0.5">
                {selectedBerth.currentUtilization}%
              </div>
            </div>
            <div className="bg-surface-subtle p-3.5 rounded-lg border border-border-subtle">
              <span className="text-xs text-text-muted">Peak 24h Prediction</span>
              <div
                className={`text-xl font-bold mt-0.5 ${
                  selectedBerth.id === 'B04' && !isOptimizationApplied
                    ? 'text-rose-600'
                    : 'text-text-main'
                }`}
              >
                {selectedBerth.predictedUtilization}%
              </div>
            </div>
            <div className="bg-surface-subtle p-3.5 rounded-lg border border-border-subtle">
              <span className="text-xs text-text-muted">Model Confidence</span>
              <div className="text-xl font-bold text-emerald-700 mt-0.5">
                {forecast.bottleneckConfidence}%
              </div>
            </div>
          </div>
        </div>

        {/* Right 1 Col: Analysis Panel for Selected Berth */}
        <div className="bg-surface p-6 rounded-3xl border border-border-subtle shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex flex-col justify-between space-y-5">
          <div>
            <div className="flex items-center justify-between border-b border-border-subtle pb-3">
              <div>
                <span className="text-xs text-text-muted">Target Quay</span>
                <h3 className="text-base font-semibold text-text-main">
                  {selectedBerth.name}
                </h3>
              </div>
              <RiskBadge
                level={
                  selectedBerth.id === 'B04' && !isOptimizationApplied
                    ? 'HIGH'
                    : selectedBerth.riskLevel
                }
              />
            </div>

            {/* Dynamic Multi-Berth Trajectory Numbers */}
            {(() => {
              const bKey = selectedBerthId as keyof typeof forecast.points[0];
              const getVal = (hr: string) => {
                const pt = forecast.points.find(p => p.hour === hr);
                return pt && typeof pt[bKey] === 'number' ? (pt[bKey] as number) : 70;
              };
              const nowVal = getVal('Now');
              const sixH = getVal('+6h');
              const twelveH = getVal('+12h');
              const twentyFourH = getVal('+24h');
              const fortyEightH = getVal('+48h');
              const seventyTwoH = getVal('+72h');
              const isBottleneck = Math.max(nowVal, sixH, twelveH, twentyFourH, fortyEightH, seventyTwoH) >= 85;

              return (
                <div className="mt-4 p-4 rounded-xl bg-surface-subtle border border-border-subtle space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-text-main font-semibold flex items-center gap-1.5">
                      <span>{selectedBerthId} 72h Predictive Trajectory</span>
                      {isBottleneck && (
                        <span className="text-[10px] px-1.5 py-0.2 rounded font-bold bg-rose-50 text-rose-700 border border-rose-200">
                          Bottleneck Risk
                        </span>
                      )}
                    </span>
                    <span className="text-text-caption">0h → 72h Horizons</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center text-xs pt-1">
                    <div className="bg-surface p-2 rounded-lg border border-border-subtle">
                      <div className="text-[10px] text-text-caption uppercase font-medium">Now (0h)</div>
                      <div className="font-semibold text-text-main mt-0.5">{nowVal}%</div>
                    </div>
                    <div className="bg-surface p-2 rounded-lg border border-border-subtle">
                      <div className="text-[10px] text-text-caption uppercase font-medium">+6h</div>
                      <div className="font-semibold text-text-main mt-0.5">{sixH}%</div>
                    </div>
                    <div className="bg-surface p-2 rounded-lg border border-border-subtle">
                      <div className="text-[10px] text-text-caption uppercase font-medium">+12h</div>
                      <div className="font-semibold text-text-main mt-0.5">{twelveH}%</div>
                    </div>
                    <div className={`p-2 rounded-lg border ${twentyFourH >= 85 ? 'border-rose-200 bg-rose-50/50' : 'bg-surface border-border-subtle'}`}>
                      <div className={`text-[10px] font-medium uppercase ${twentyFourH >= 85 ? 'text-rose-700 font-bold' : 'text-text-caption'}`}>
                        +24h {twentyFourH >= 85 ? 'Peak' : ''}
                      </div>
                      <div className={`font-bold mt-0.5 ${twentyFourH >= 85 ? 'text-rose-700' : 'text-text-main'}`}>
                        {twentyFourH}%
                      </div>
                    </div>
                    <div className="bg-surface p-2 rounded-lg border border-border-subtle">
                      <div className="text-[10px] text-text-caption uppercase font-medium">+48h</div>
                      <div className="font-semibold text-text-main mt-0.5">{fortyEightH}%</div>
                    </div>
                    <div className="bg-surface p-2 rounded-lg border border-border-subtle">
                      <div className="text-[10px] text-text-caption uppercase font-medium">+72h</div>
                      <div className="font-semibold text-text-main mt-0.5">{seventyTwoH}%</div>
                    </div>
                  </div>
                  <div className="text-[10px] text-text-muted text-center pt-1">
                    Deterministic time-series model integrating active queue, TEU volume, and crane moves.
                  </div>
                </div>
              );
            })()}

            {/* Top Drivers */}
            <div className="mt-5 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-text-main font-semibold">Root Cause Drivers</span>
                <span className="text-text-caption">Weighting</span>
              </div>

              <div className="space-y-2 text-xs">
                {forecast.drivers.map((d, idx) => (
                  <div key={idx} className="p-2.5 rounded-xl bg-surface-subtle border border-border-subtle space-y-1">
                    <div className="flex justify-between">
                      <span className="text-text-main font-medium">{d.factor}</span>
                      <span className="font-semibold text-text-main">{d.percentage}%</span>
                    </div>
                    <p className="text-[11px] text-text-muted leading-relaxed">
                      {d.detail}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Action CTAs */}
          <div className="pt-4 border-t border-border-subtle space-y-2">
            <button
              onClick={() => navigate('/decision/optimizer')}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-semibold text-white bg-brand-teal hover:bg-teal-700 transition-all shadow-[0_8px_30px_rgb(0,0,0,0.04)]"
            >
              <Zap className="w-4 h-4" />
              <span>Optimize {selectedBerthId} Operations</span>
            </button>
            <button
              onClick={handleExplainWithGemini}
              className="w-full flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-medium text-text-main bg-surface hover:bg-surface-subtle border border-border-subtle transition-colors"
            >
              <Sparkles className="w-4 h-4 text-brand-teal" />
              <span>Explain with Gemini</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

