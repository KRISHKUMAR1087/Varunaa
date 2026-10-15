import React, { useState } from 'react';
import {
  ArrowRight,
  Zap,
} from 'lucide-react';
import { useOperations } from '../context/OperationsContext';
import { UtilizationBar } from '../components/common/UtilizationBar';
import { RiskBadge } from '../components/common/RiskBadge';
import { Drawer } from '../components/common/Drawer';
import { YardBlock } from '../types/operations';

export const YardPage: React.FC = () => {
  const { yardBlocks, redistributeYardBlock } = useOperations();
  const [selectedBlock, setSelectedBlock] = useState<YardBlock | null>(null);

  const totalInbound = yardBlocks.reduce((acc, y) => acc + y.inboundTeu24h, 0);
  const totalOutbound = yardBlocks.reduce((acc, y) => acc + y.outboundTeu24h, 0);
  const avgDwell = (
    yardBlocks.reduce((acc, y) => acc + y.dwellTimeDays, 0) / yardBlocks.length
  ).toFixed(1);

  const handleApplyRedistribution = (block: YardBlock) => {
    if (block.suggestedRedistribution) {
      redistributeYardBlock(
        block.id,
        block.suggestedRedistribution.targetBlockId,
        block.suggestedRedistribution.amountTeu
      );
    }
    setSelectedBlock(null);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-main tracking-tight">
            Terminal Yard Capacity & Flow
          </h1>
          <p className="text-sm text-text-muted mt-1">
            Real-time stacking density, dwell times, and overflow redistribution across container blocks CY-01 to CY-04.
          </p>
        </div>

        <div className="flex items-center gap-3 text-xs text-text-muted">
          <div className="bg-surface px-3 py-1.5 rounded-xl border border-border-subtle shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
            Dwell Average: <strong className="text-text-main">{avgDwell} days</strong>
          </div>
          <div className="bg-surface px-3 py-1.5 rounded-xl border border-border-subtle shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
            Net Flow: <strong className="text-text-main">+{totalInbound - totalOutbound} TEU/24h</strong>
          </div>
        </div>
      </div>

      {/* Yard Blocks Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {yardBlocks.map(block => {
          const isHighRisk = block.congestionRisk === 'High' || block.utilizationPercent >= 85;

          return (
            <div
              key={block.id}
              onClick={() => setSelectedBlock(block)}
              className={`bg-surface rounded-3xl p-5 border cursor-pointer transition-all hover:shadow-elevated flex flex-col justify-between space-y-4 shadow-[0_8px_30px_rgb(0,0,0,0.04)] ${
                isHighRisk
                  ? 'border-amber-300 ring-1 ring-amber-200'
                  : 'border-border-subtle hover:border-slate-300'
              }`}
            >
              <div>
                {/* Block Header */}
                <div className="flex items-center justify-between border-b border-border-subtle pb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-surface-subtle border border-border-subtle flex items-center justify-center font-semibold text-xs text-text-main">
                      {block.id.split('-')[1]}
                    </div>
                    <div>
                      <h3 className="text-xs font-semibold text-text-main">{block.name.split('(')[0]}</h3>
                      <span className="text-[11px] text-text-caption">{block.category} Stacking</span>
                    </div>
                  </div>
                  <RiskBadge level={block.congestionRisk} size="sm" />
                </div>

                {/* Utilization */}
                <div className="mt-4 space-y-2">
                  <div className="flex items-baseline justify-between text-xs">
                    <span className="text-text-muted">Occupancy:</span>
                    <span
                      className={`font-semibold ${
                        isHighRisk ? 'text-amber-800 font-bold' : 'text-text-main'
                      }`}
                    >
                      {block.utilizationPercent}%
                    </span>
                  </div>
                  <UtilizationBar
                    percentage={block.utilizationPercent}
                    threshold={85}
                    height="h-2"
                  />
                  <div className="text-[11px] text-text-caption text-right pt-0.5">
                    {block.occupiedTeu.toLocaleString()} / {block.totalTeu.toLocaleString()} TEU
                  </div>
                </div>

                {/* Telemetry data */}
                <div className="mt-4 p-3.5 rounded-lg bg-surface-subtle border border-border-subtle space-y-1.5 text-xs">
                  <div className="flex justify-between">
                    <span className="text-text-muted">Average Dwell Time:</span>
                    <span className="font-semibold text-text-main">{block.dwellTimeDays} days</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-muted">Inbound 24h:</span>
                    <span className="font-medium text-text-main">+{block.inboundTeu24h} TEU</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-muted">Outbound Gate/Rail:</span>
                    <span className="font-medium text-text-main">-{block.outboundTeu24h} TEU</span>
                  </div>
                </div>
              </div>

              {/* Action Link */}
              <div className="pt-3 border-t border-border-subtle flex items-center justify-between text-xs text-brand-teal hover:underline font-medium">
                <span>View Details</span>
                <ArrowRight className="w-3 h-3" />
              </div>
            </div>
          );
        })}
      </div>

      {/* Yard Block Detail Drawer */}
      <Drawer
        isOpen={!!selectedBlock}
        onClose={() => setSelectedBlock(null)}
        title={selectedBlock?.name || 'Yard Block'}
        subtitle={`Terminal Stacking Capacity & Flow (${selectedBlock?.id})`}
      >
        {selectedBlock && (
          <div className="space-y-6 text-xs">
            <div className="bg-surface-subtle p-4 rounded-lg border border-border-subtle flex items-center justify-between">
              <div>
                <span className="text-text-muted text-xs">Congestion Profile</span>
                <div className="font-semibold text-text-main text-sm mt-0.5">
                  {selectedBlock.utilizationPercent}% Density
                </div>
              </div>
              <RiskBadge level={selectedBlock.congestionRisk} />
            </div>

            {/* Block Capacities */}
            <div className="bg-surface p-4 rounded-lg border border-border-subtle space-y-2.5">
              <h4 className="text-xs font-semibold text-text-main uppercase tracking-wider">
                Capacity Metrics
              </h4>
              <div className="flex justify-between py-1 border-b border-border-subtle">
                <span className="text-text-muted">Nominal Block Capacity:</span>
                <span className="font-semibold text-text-main">
                  {selectedBlock.totalTeu.toLocaleString()} TEU
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-border-subtle">
                <span className="text-text-muted">Current Slots Occupied:</span>
                <span className="font-semibold text-text-main">
                  {selectedBlock.occupiedTeu.toLocaleString()} TEU
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-border-subtle">
                <span className="text-text-muted">Available Free Slots:</span>
                <span className="font-semibold text-text-main">
                  {(selectedBlock.totalTeu - selectedBlock.occupiedTeu).toLocaleString()} TEU
                </span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-text-muted">Average Dwell Time:</span>
                <span className="font-semibold text-text-main">{selectedBlock.dwellTimeDays} days</span>
              </div>
            </div>

            {/* AI Redistribution Rationale */}
            {selectedBlock.suggestedRedistribution && (
              <div className="bg-surface p-5 rounded-lg border border-teal-200 bg-teal-50/20 space-y-3">
                <div className="flex items-center gap-2 text-teal-950 font-semibold text-xs">
                  <Zap className="w-3.5 h-3.5 text-brand-teal" />
                  <span>Redistribution Recommendation</span>
                </div>
                <p className="text-text-muted leading-relaxed text-xs">
                  {selectedBlock.suggestedRedistribution.rationale}
                </p>
                <div className="pt-2 flex items-center justify-between">
                  <span className="text-text-main font-semibold text-xs">
                    Transfer: {selectedBlock.suggestedRedistribution.amountTeu} TEU →{' '}
                    {selectedBlock.suggestedRedistribution.targetBlockId}
                  </span>
                  <button
                    onClick={() => handleApplyRedistribution(selectedBlock)}
                    className="px-3.5 py-1.5 rounded-xl text-xs font-semibold text-white bg-brand-teal hover:bg-teal-700 transition-all shadow-[0_8px_30px_rgb(0,0,0,0.04)]"
                  >
                    Execute Transfer
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </Drawer>
    </div>
  );
};

