import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Sparkles,
  ArrowRight,
  Ship,
  Clock,
  DollarSign,
  TrendingDown,
  ShieldCheck,
  Fuel,
  Navigation
} from 'lucide-react';
import { useOperations } from '../context/OperationsContext';
import { RouteMapGraphic } from '../components/operations/RouteMapGraphic';
import { RiskBadge } from '../components/common/RiskBadge';

export const RoutesPage: React.FC = () => {
  const navigate = useNavigate();
  const { routes, setIsCopilotOpen, sendCopilotMessage, showToast, updateVessel, vessels } = useOperations();
  const [selectedPortCode, setSelectedPortCode] = useState<string>('PORT-B');

  const selectedPort = routes.find(r => r.portCode === selectedPortCode) || routes[1];

  const handleAskGemini = async () => {
    setIsCopilotOpen(true);
    await sendCopilotMessage(
      `Compare alternate routing economics between Rotterdam and ${selectedPort.portName}. Provide a commercial briefing with bunker fuel costs and demurrage exposure.`
    );
  };

  const handleExecuteDiversion = () => {
    const flagship = vessels[0];
    if (flagship) {
      updateVessel(flagship.id, {
        destination: selectedPort.portName,
        recommendedAction: `Diverted to ${selectedPort.portName} (${selectedPort.portCode}) to bypass quayside bottleneck.`,
        predictedWaitHours: Math.max(1.0, selectedPort.delayHours),
      });
    }
    showToast(
      'success',
      'Offshore Diversion Dispatched',
      `Voyage route amended to ${selectedPort.portName}. Estimated savings: ${selectedPort.delayHours < 15 ? '$148,000 USD demurrage' : 'avoided port gridlock'}.`
    );
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-8">
      {/* 1. Header with Breadcrumb & Action */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-2 border-b border-border-subtle">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold text-text-main tracking-tight">
              Route Intelligence & Alternate Port Matrix
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-brand-teal/15 text-brand-teal border border-brand-teal/30">
              Nautical AI Diversion
            </span>
          </div>
          <p className="text-xs sm:text-sm text-text-muted mt-1">
            Evaluate offshore diversion economics, bunker fuel trade-offs, and port turnaround SLA guarantees.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => navigate('/intelligence/voyage-twin')}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold text-text-main bg-surface hover:bg-surface-subtle border border-border-subtle transition-all shadow-xs cursor-pointer"
          >
            <Navigation className="w-3.5 h-3.5 text-brand-teal" />
            <span>Open Voyage Twin (AIS Live)</span>
          </button>
          <button
            onClick={handleAskGemini}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold text-white bg-gradient-to-r from-teal-500 to-cyan-600 hover:from-teal-600 hover:to-cyan-700 transition-all shadow-md shadow-teal-500/20 cursor-pointer active:scale-95"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Ask Gemini Copilot</span>
          </button>
        </div>
      </div>

      {/* 2. Responsive Vector Nautical Map Component */}
      <RouteMapGraphic
        routes={routes}
        selectedPortCode={selectedPortCode}
        onSelectPort={setSelectedPortCode}
      />

      {/* 3. Trade-Off Economics Highlight Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl glass-card space-y-1">
          <div className="flex items-center justify-between text-xs text-text-muted font-medium">
            <span>Turnaround Time Saved</span>
            <Clock className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
            -13.0 hrs
          </div>
          <div className="text-[11px] text-text-caption">
            Antwerp vs Rotterdam queue
          </div>
        </div>

        <div className="p-4 rounded-2xl glass-card space-y-1">
          <div className="flex items-center justify-between text-xs text-text-muted font-medium">
            <span>Demurrage Avoidance</span>
            <DollarSign className="w-4 h-4 text-brand-teal" />
          </div>
          <div className="text-2xl font-bold text-text-main">
            +$148,000
          </div>
          <div className="text-[11px] text-text-caption">
            Charter party penalty saved
          </div>
        </div>

        <div className="p-4 rounded-2xl glass-card space-y-1">
          <div className="flex items-center justify-between text-xs text-text-muted font-medium">
            <span>Bunker Steaming Delta</span>
            <Fuel className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">
            +$10,000
          </div>
          <div className="text-[11px] text-text-caption">
            +45 NM steaming at 16 kts
          </div>
        </div>

        <div className="p-4 rounded-2xl glass-card space-y-1">
          <div className="flex items-center justify-between text-xs text-text-muted font-medium">
            <span>Net Commercial ROI</span>
            <TrendingDown className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
            +$138,000 USD
          </div>
          <div className="text-[11px] text-emerald-600 font-semibold">
            High Commercial Benefit
          </div>
        </div>
      </div>

      {/* 4. Alternate Ports Comparison Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {routes.map((port) => {
          const isSelected = selectedPortCode === port.portCode;

          return (
            <div
              key={port.portCode}
              onClick={() => setSelectedPortCode(port.portCode)}
              className={`p-5 rounded-2xl border cursor-pointer transition-all duration-200 glass-card flex flex-col justify-between space-y-4 hover:shadow-xl ${
                port.isRecommended
                  ? 'border-emerald-400/80 ring-2 ring-emerald-400/20 bg-emerald-500/5'
                  : port.riskLevel === 'Critical'
                  ? 'border-rose-400/80 ring-2 ring-rose-400/20 bg-rose-500/5'
                  : 'border-border-subtle hover:border-brand-teal/60'
              } ${isSelected ? 'ring-3 ring-brand-teal scale-102 shadow-2xl' : ''}`}
            >
              <div className="space-y-4">
                {/* Port Card Header */}
                <div className="flex items-center justify-between border-b border-border-subtle/80 pb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-text-main">
                        {port.portName}
                      </span>
                    </div>
                    <span className="text-[11px] text-text-muted">
                      {port.country} • {port.distanceNm} NM from Waypoint
                    </span>
                  </div>

                  {port.isRecommended ? (
                    <span className="text-[10px] px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-bold border border-emerald-300/40">
                      RECOMMENDED
                    </span>
                  ) : (
                    <RiskBadge level={port.riskLevel} size="sm" />
                  )}
                </div>

                {/* Metrics Breakdown */}
                <div className="space-y-2.5 text-xs">
                  <div className="flex justify-between items-center py-1 border-b border-border-subtle/40">
                    <span className="text-text-muted flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-text-caption" />
                      Turnaround Delay:
                    </span>
                    <span
                      className={`font-bold ${
                        port.delayHours > 25 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'
                      }`}
                    >
                      {port.delayHours} hours
                    </span>
                  </div>

                  <div className="flex justify-between items-center py-1 border-b border-border-subtle/40">
                    <span className="text-text-muted flex items-center gap-1.5">
                      <Fuel className="w-3.5 h-3.5 text-text-caption" />
                      Bunker Steaming:
                    </span>
                    <span className="font-semibold text-text-main">
                      ${port.extraCostUsd.toLocaleString()} USD
                    </span>
                  </div>

                  <div className="flex justify-between items-center py-1 border-b border-border-subtle/40">
                    <span className="text-text-muted flex items-center gap-1.5">
                      <Navigation className="w-3.5 h-3.5 text-text-caption" />
                      Congestion Index:
                    </span>
                    <span className="font-bold text-text-main">
                      {port.congestionScore} / 100
                    </span>
                  </div>

                  <div className="flex justify-between items-center py-1">
                    <span className="text-text-muted flex items-center gap-1.5">
                      <Ship className="w-3.5 h-3.5 text-text-caption" />
                      Projected Port ETA:
                    </span>
                    <span className="text-text-main font-semibold">{port.eta}</span>
                  </div>
                </div>

                {/* Recommendation Rationale */}
                <div className="p-3.5 rounded-xl bg-surface-subtle/80 border border-border-subtle text-xs text-text-muted leading-relaxed">
                  {port.rationale}
                </div>
              </div>

              {/* Select CTA */}
              <div className="pt-3 border-t border-border-subtle/80 flex items-center justify-between text-xs text-brand-teal font-semibold">
                <span>{isSelected ? '✓ Selected Route' : 'Select Destination'}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </div>
            </div>
          );
        })}
      </div>

      {/* 5. Optimal Diversion Recommendation Banner */}
      <div className="p-6 rounded-2xl glass-card border border-teal-300/80 bg-gradient-to-r from-teal-500/10 via-cyan-500/5 to-emerald-500/10 shadow-elevated flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-teal-500 to-cyan-500 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-md shadow-teal-500/20">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-xs sm:text-sm font-bold text-text-main uppercase tracking-wider">
              Optimal Diversion Recommendation: Antwerp Gateway (PORT-B)
            </h3>
            <p className="text-xs text-text-muted mt-1 leading-relaxed max-w-3xl">
              An additional <strong>+$10,000 USD</strong> in steaming fuel avoids <strong>13.0 hours</strong> of waiting anchorage delay and clears the critical B04 bottleneck, preventing <strong className="text-emerald-600 font-bold">$148,000</strong> in demurrage exposure.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            onClick={handleExecuteDiversion}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 transition-all shadow-md shadow-emerald-600/20 shrink-0 cursor-pointer active:scale-95"
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Dispatch Diversion Order</span>
          </button>
          <button
            onClick={handleAskGemini}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold text-white bg-brand-teal hover:bg-teal-700 transition-all shadow-md shadow-teal-500/20 shrink-0 cursor-pointer active:scale-95"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Draft Advisory with Gemini</span>
          </button>
        </div>
      </div>
    </div>
  );
};
