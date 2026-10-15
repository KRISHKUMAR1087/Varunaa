import React, { useState, useMemo } from 'react';
import {
  Filter,
  AlertTriangle,
  CheckCircle2,
  Clock,
  DollarSign,
  TrendingUp,
  Ship,
  FileText,
  ChevronRight,
  Layers,
  Download,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell,
} from 'recharts';
import {
  DelayInvestigationService,
  DelayInvestigationFilter,
} from '../services/delayInvestigationService';
import {
  DelayCategory,
  PortCallRecord,
  HistoricalDelayBottleneck,
} from '../types/operations';
import { useOperations } from '../context/OperationsContext';

const CATEGORY_COLORS: Record<DelayCategory, string> = {
  vessel_late_arrival: '#3B82F6',
  anchorage_bunching: '#06B6D4',
  berth_conflict: '#E11D48',
  crane_breakdown: '#F97316',
  low_productivity: '#F59E0B',
  yard_congestion: '#8B5CF6',
  inland_transport_shortage: '#10B981',
  customs_inspection_hold: '#6366F1',
  weather_restriction: '#64748B',
  carrier_schedule_revision: '#EC4899',
};

export const DelayLabPage: React.FC = () => {
  const { showToast, setIsCopilotOpen, sendCopilotMessage } = useOperations();
  const [dateRange, setDateRange] = useState<30 | 60 | 90 | 120>(90);
  const [selectedCategory, setSelectedCategory] = useState<DelayCategory | 'ALL'>('ALL');
  const [selectedRecord, setSelectedRecord] = useState<PortCallRecord | null>(null);
  const [activeTab, setActiveTab] = useState<'BOTTLENECKS' | 'STAGE_DECOMPOSITION' | 'EVENT_LEDGER' | 'CONTAINERS'>('BOTTLENECKS');

  const filter: DelayInvestigationFilter = useMemo(() => ({
    dateRangeDays: dateRange,
    categoryFilter: selectedCategory,
  }), [dateRange, selectedCategory]);

  const investigation = useMemo(() => {
    return DelayInvestigationService.investigateDelays(filter);
  }, [filter]);

  const allRecords = useMemo(() => {
    return DelayInvestigationService.getHistoricalRecords(dateRange);
  }, [dateRange]);

  const handleAskCopilotAboutBottleneck = async (b: HistoricalDelayBottleneck) => {
    setIsCopilotOpen(true);
    await sendCopilotMessage(
      `Investigate historical bottleneck "${b.categoryTitle}" (${b.dimensionValue}) over the last ${dateRange} days. Total delay: ${b.totalAccumulatedDelayHours}h across ${b.affectedShipmentsCount} calls. What operational interventions are feasible?`
    );
  };

  const handleApplyIntervention = (b: HistoricalDelayBottleneck) => {
    showToast(
      'success',
      'Intervention Queued for Port Approval',
      `Intervention "${b.recommendedIntervention}" queued. Estimated recoverable delay: ${b.estimatedRecoverableHours}h ($${(b.estimatedRecoverableHours * 2400).toLocaleString()} USD).`
    );
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* 1. Header with Breadcrumbs & Data Provenance Notice */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-border-subtle">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-text-main">
              Delay Investigation Lab
            </h1>
            <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-800 border border-rose-200">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-600 animate-pulse" />
              Rolling 90–120d Audit
            </span>
            <span className="text-xs px-2.5 py-0.5 rounded-full font-mono font-medium bg-surface-subtle text-text-muted border border-border-subtle">
              Evidence-Backed Root Cause Attribution
            </span>
          </div>
          <p className="text-xs sm:text-sm text-text-muted mt-1 max-w-4xl">
            Trace delays to their exact operational origination point without double-counting. Evaluate planned vs actual timestamps across berths, STS cranes, cargo manifests, drayage gates, and marine weather friction.
          </p>
        </div>

        {/* Date Horizon Selector & Quick Filters */}
        <div className="flex items-center gap-2 self-start lg:self-auto flex-wrap">
          <div className="inline-flex rounded-xl bg-surface-subtle p-1 border border-border-subtle text-xs">
            {([30, 60, 90, 120] as const).map(d => (
              <button
                key={d}
                onClick={() => setDateRange(d)}
                className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                  dateRange === d
                    ? 'bg-brand-teal text-white shadow-xs'
                    : 'text-text-muted hover:text-text-main'
                }`}
              >
                {d} Days
              </button>
            ))}
          </div>

          <button
            onClick={() => {
              showToast('info', 'Data Export Ready', 'Exported 115 verified operational port call records as CSV.');
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-surface hover:bg-surface-subtle border border-border-subtle text-text-main transition-colors shadow-xs"
          >
            <Download className="w-3.5 h-3.5 text-text-muted" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* 2. Top-Level Delay Intelligence KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-surface p-4 rounded-2xl border border-border-subtle shadow-xs space-y-1">
          <div className="flex items-center justify-between text-xs text-text-muted">
            <span>Analyzed Calls</span>
            <Ship className="w-4 h-4 text-brand-teal" />
          </div>
          <div className="text-2xl font-bold text-text-main">
            {investigation.totalAnalyzedShipments}
          </div>
          <div className="text-[11px] text-text-caption">
            Over trailing {dateRange} days
          </div>
        </div>

        <div className="bg-surface p-4 rounded-2xl border border-border-subtle shadow-xs space-y-1">
          <div className="flex items-center justify-between text-xs text-text-muted">
            <span>Accumulated Delay</span>
            <Clock className="w-4 h-4 text-rose-500" />
          </div>
          <div className="text-2xl font-bold text-rose-600">
            {investigation.totalAccumulatedDelayHours}h
          </div>
          <div className="text-[11px] text-text-caption">
            Median: {investigation.medianDelayHours}h • P90: {investigation.percentile90DelayHours}h
          </div>
        </div>

        <div className="bg-surface p-4 rounded-2xl border border-border-subtle shadow-xs space-y-1">
          <div className="flex items-center justify-between text-xs text-text-muted">
            <span>Recoverable Delay</span>
            <TrendingUp className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-bold text-emerald-600">
            {investigation.potentialRecoverableHours}h
          </div>
          <div className="text-[11px] text-emerald-700 font-semibold">
            {Math.round((investigation.potentialRecoverableHours / Math.max(1, investigation.totalAccumulatedDelayHours)) * 100)}% feasible recovery
          </div>
        </div>

        <div className="bg-surface p-4 rounded-2xl border border-border-subtle shadow-xs space-y-1">
          <div className="flex items-center justify-between text-xs text-text-muted">
            <span>Demurrage Saved</span>
            <DollarSign className="w-4 h-4 text-brand-teal" />
          </div>
          <div className="text-2xl font-bold text-text-main">
            ${(investigation.potentialDemurrageSavingsUsd / 1000).toFixed(0)}k
          </div>
          <div className="text-[11px] text-text-caption">
            From ${investigation.totalDemurrageExposureUsd.toLocaleString()} risk
          </div>
        </div>

        <div className="bg-surface p-4 rounded-2xl border border-border-subtle shadow-xs space-y-1 col-span-2 lg:col-span-1">
          <div className="flex items-center justify-between text-xs text-text-muted">
            <span>Evidence Coverage</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-bold text-emerald-600">
            {Math.round(investigation.confirmedEvidenceCoverageRatio * 100)}%
          </div>
          <div className="text-[11px] text-text-caption">
            AIS + SCADA + OCR confirmed
          </div>
        </div>
      </div>

      {/* 3. Operational Stage Filter & Category Bar */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        <span className="text-xs font-semibold text-text-muted shrink-0 flex items-center gap-1.5 mr-2">
          <Filter className="w-3.5 h-3.5" />
          Category Filter:
        </span>
        <button
          onClick={() => setSelectedCategory('ALL')}
          className={`px-3 py-1.5 rounded-full text-xs font-medium shrink-0 transition-colors ${
            selectedCategory === 'ALL'
              ? 'bg-text-main text-canvas shadow-xs font-bold'
              : 'bg-surface text-text-muted border border-border-subtle hover:bg-surface-subtle'
          }`}
        >
          All Stages ({allRecords.length})
        </button>
        {investigation.stageDecomposition.map(s => (
          <button
            key={s.category}
            onClick={() => setSelectedCategory(s.category)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium shrink-0 flex items-center gap-2 transition-colors ${
              selectedCategory === s.category
                ? 'bg-brand-teal text-white shadow-xs font-bold'
                : 'bg-surface text-text-muted border border-border-subtle hover:bg-surface-subtle'
            }`}
          >
            <span
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: CATEGORY_COLORS[s.category] }}
            />
            <span>{s.title}</span>
            <span className="text-[10px] opacity-75 font-mono">{s.totalHours}h</span>
          </button>
        ))}
      </div>

      {/* 4. Investigation Tab Bar */}
      <div className="border-b border-border-subtle flex items-center gap-6 text-sm font-semibold">
        <button
          onClick={() => setActiveTab('BOTTLENECKS')}
          className={`pb-3 border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === 'BOTTLENECKS'
              ? 'border-brand-teal text-brand-teal'
              : 'border-transparent text-text-muted hover:text-text-main'
          }`}
        >
          <AlertTriangle className="w-4 h-4" />
          <span>Recurring Operational Bottlenecks ({investigation.bottlenecks.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('STAGE_DECOMPOSITION')}
          className={`pb-3 border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === 'STAGE_DECOMPOSITION'
              ? 'border-brand-teal text-brand-teal'
              : 'border-transparent text-text-muted hover:text-text-main'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Non-Overlapping Delay Decomposition</span>
        </button>
        <button
          onClick={() => setActiveTab('EVENT_LEDGER')}
          className={`pb-3 border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === 'EVENT_LEDGER'
              ? 'border-brand-teal text-brand-teal'
              : 'border-transparent text-text-muted hover:text-text-main'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Audited Port Calls Ledger ({allRecords.length})</span>
        </button>
      </div>

      {/* 5. TAB CONTENT PANELS */}
      {activeTab === 'BOTTLENECKS' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {investigation.bottlenecks.map(b => (
              <div
                key={b.bottleneckId}
                className="bg-surface rounded-3xl border border-border-subtle p-6 shadow-xs hover:border-brand-teal/40 transition-all space-y-4 flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse" />
                      <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-surface-subtle text-text-muted border border-border-subtle">
                        {b.dimensionType.toUpperCase()}: {b.dimensionValue}
                      </span>
                    </div>
                    <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-800 border border-rose-200">
                      {b.totalAccumulatedDelayHours}h Delay
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-text-main leading-snug">
                    {b.categoryTitle}
                  </h3>

                  <p className="text-xs text-text-muted leading-relaxed">
                    {b.operationalEvidenceSummary}
                  </p>

                  {/* Operational Metrics Strip */}
                  <div className="grid grid-cols-3 gap-2 py-2 px-3 rounded-xl bg-surface-subtle/50 text-xs">
                    <div>
                      <span className="text-[10px] text-text-caption">Sample Size</span>
                      <div className="font-semibold text-text-main">{b.affectedShipmentsCount} calls</div>
                    </div>
                    <div>
                      <span className="text-[10px] text-text-caption">Median Delay</span>
                      <div className="font-semibold text-text-main">{b.medianDelayHours}h</div>
                    </div>
                    <div>
                      <span className="text-[10px] text-text-caption">90th %ile</span>
                      <div className="font-semibold text-rose-600">{b.percentile90DelayHours}h</div>
                    </div>
                  </div>

                  {/* Alternative Hypotheses Tested */}
                  <div className="space-y-1.5 pt-1">
                    <div className="text-[11px] font-semibold text-text-main">
                      Alternative Hypotheses Evaluated:
                    </div>
                    <ul className="text-xs text-text-muted space-y-1 list-disc pl-4">
                      {b.alternativeHypotheses.map((alt, idx) => (
                        <li key={idx}>{alt}</li>
                      ))}
                    </ul>
                  </div>

                  {/* Recommended Intervention Box */}
                  <div className="p-3.5 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/40 space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-emerald-900 dark:text-emerald-300">
                        Recommended Recovery Intervention:
                      </span>
                      <span className="font-semibold text-emerald-700 bg-emerald-100/60 dark:bg-emerald-900/60 px-2 py-0.5 rounded text-[10px]">
                        Recovers {b.estimatedRecoverableHours}h
                      </span>
                    </div>
                    <p className="text-xs text-emerald-800 dark:text-emerald-200 leading-relaxed">
                      {b.recommendedIntervention}
                    </p>
                    <div className="text-[11px] text-emerald-700/80 pt-1 flex justify-between">
                      <span>Intervention Cost: ${b.costUsd.toLocaleString()} USD</span>
                      <span>Feasibility: {b.feasibilityRating}</span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2.5 pt-2 border-t border-border-subtle">
                  <button
                    onClick={() => handleApplyIntervention(b)}
                    className="flex-1 py-2 px-3 rounded-xl text-xs font-semibold text-white bg-brand-teal hover:bg-teal-700 transition-colors shadow-xs"
                  >
                    Stage Intervention
                  </button>
                  <button
                    onClick={() => handleAskCopilotAboutBottleneck(b)}
                    className="py-2 px-3 rounded-xl text-xs font-medium text-text-main bg-surface hover:bg-surface-subtle border border-border-subtle transition-colors"
                  >
                    Ask Copilot
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* STAGE DECOMPOSITION VIEW */}
      {activeTab === 'STAGE_DECOMPOSITION' && (
        <div className="bg-surface p-6 rounded-3xl border border-border-subtle space-y-6">
          <div>
            <h3 className="text-base font-bold text-text-main">
              Disjoint Delay Decomposition (No Double-Counting)
            </h3>
            <p className="text-xs text-text-muted mt-0.5">
              Delay hours strictly partitioned by the initiating operational trigger. Overlapping waiting intervals are mathematically isolated to ensure transparency.
            </p>
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={investigation.stageDecomposition}
                layout="vertical"
                margin={{ top: 5, right: 30, left: 160, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis type="number" unit="h" />
                <YAxis dataKey="title" type="category" width={150} tick={{ fontSize: 11 }} />
                <Tooltip
                  formatter={(value: any) => [`${value} hours`, 'Accumulated Delay']}
                  labelFormatter={(name) => `Category: ${name}`}
                />
                <Bar dataKey="totalHours" fill="#0EA5A8" radius={[0, 6, 6, 0]}>
                  {investigation.stageDecomposition.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={CATEGORY_COLORS[entry.category] || '#0EA5A8'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="divide-y divide-border-subtle text-xs">
            {investigation.stageDecomposition.map(s => (
              <div key={s.category} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-0.5 max-w-xl">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: CATEGORY_COLORS[s.category] }}
                    />
                    <span className="font-bold text-text-main">{s.title}</span>
                    <span className="text-[10px] text-text-caption">
                      ({s.affectedVesselsCount} vessels affected)
                    </span>
                  </div>
                  <p className="text-text-muted text-[11px]">
                    Intervention: {s.primaryIntervention}
                  </p>
                </div>
                <div className="flex items-center gap-6 shrink-0 font-mono">
                  <div>
                    <span className="text-text-caption block text-[10px]">Net Delay</span>
                    <span className="font-bold text-text-main">{s.totalHours}h ({s.sharePercent}%)</span>
                  </div>
                  <div>
                    <span className="text-text-caption block text-[10px]">Avg / Call</span>
                    <span className="text-text-main">{s.averageDelayHours}h</span>
                  </div>
                  <div>
                    <span className="text-text-caption block text-[10px]">Telemetry Conf.</span>
                    <span className="text-emerald-600 font-semibold">{Math.round(s.evidenceConfidence * 100)}%</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* AUDITED PORT CALLS LEDGER */}
      {activeTab === 'EVENT_LEDGER' && (
        <div className="bg-surface rounded-3xl border border-border-subtle overflow-hidden shadow-xs space-y-4 p-6">
          <div>
            <h3 className="text-base font-bold text-text-main">
              Audited Vessel Calls & Event Timelines
            </h3>
            <p className="text-xs text-text-muted mt-0.5">
              Click any call to inspect its complete 11-stage chronological operational event sequence and container manifest.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-surface-subtle text-text-muted uppercase text-[10px] tracking-wider border-b border-border-subtle">
                <tr>
                  <th className="py-3 px-4">Call ID / Vessel</th>
                  <th className="py-3 px-4">Assigned Berth</th>
                  <th className="py-3 px-4">Planned Arrival</th>
                  <th className="py-3 px-4">Actual Departure</th>
                  <th className="py-3 px-4">Delay (h)</th>
                  <th className="py-3 px-4">Root Cause Category</th>
                  <th className="py-3 px-4 text-right">Inspect</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle text-text-main">
                {allRecords.slice(0, 15).map(call => (
                  <tr
                    key={call.id}
                    onClick={() => setSelectedRecord(call)}
                    className="hover:bg-surface-subtle/70 transition-colors cursor-pointer"
                  >
                    <td className="py-3 px-4">
                      <div className="font-bold">{call.vesselName}</div>
                      <div className="text-[10px] text-text-muted">{call.id} • {call.vesselType}</div>
                    </td>
                    <td className="py-3 px-4 font-mono font-medium">{call.assignedBerthId}</td>
                    <td className="py-3 px-4 text-text-muted">{call.plannedArrival.split('T')[0]}</td>
                    <td className="py-3 px-4 text-text-muted">{call.actualDeparture?.split('T')[0] || 'In Port'}</td>
                    <td className="py-3 px-4">
                      <span className={`font-mono font-bold ${call.netTotalDelayMinutes > 180 ? 'text-rose-600' : 'text-text-main'}`}>
                        +{(call.netTotalDelayMinutes / 60).toFixed(1)}h
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold"
                        style={{
                          backgroundColor: `${CATEGORY_COLORS[call.primaryCauseCategory]}15`,
                          color: CATEGORY_COLORS[call.primaryCauseCategory],
                        }}
                      >
                        {call.primaryCauseCategory.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <ChevronRight className="w-4 h-4 text-text-muted inline" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL: Record Detailed Event Inspection */}
      {selectedRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-surface w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-3xl border border-border-subtle p-6 space-y-6 shadow-2xl">
            <div className="flex items-start justify-between border-b border-border-subtle pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-bold text-text-main">
                    {selectedRecord.vesselName} ({selectedRecord.id})
                  </h2>
                  <span className="text-xs px-2.5 py-0.5 rounded-full font-semibold bg-rose-50 text-rose-800 border border-rose-200">
                    +{(selectedRecord.netTotalDelayMinutes / 60).toFixed(1)}h Delay
                  </span>
                </div>
                <p className="text-xs text-text-muted mt-1">
                  IMO {selectedRecord.imo} • Assigned Berth: {selectedRecord.assignedBerthId} • Total Cargo: {selectedRecord.totalManifestTeu.toLocaleString()} TEU
                </p>
              </div>
              <button
                onClick={() => setSelectedRecord(null)}
                className="p-2 rounded-xl text-text-muted hover:text-text-main hover:bg-surface-subtle"
              >
                ✕
              </button>
            </div>

            {/* 11-Stage Chronological Operational Timeline */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-text-muted">
                11-Stage Port Call Operational Timeline
              </h4>
              <div className="space-y-2">
                {selectedRecord.timeline.map((step, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-2xl bg-surface-subtle/60 border border-border-subtle flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-5 h-5 rounded-full bg-brand-teal/20 text-brand-teal flex items-center justify-center font-bold text-[10px]">
                        {idx + 1}
                      </span>
                      <div>
                        <div className="font-semibold text-text-main">{step.label}</div>
                        <div className="text-[11px] text-text-muted">{step.description}</div>
                      </div>
                    </div>
                    <div className="text-right text-[11px] font-mono shrink-0">
                      <div>Planned: {step.plannedTime.split('T')[1]?.replace('Z', '') || step.plannedTime}</div>
                      {step.actualTime && (
                        <div className="text-text-muted">Actual: {step.actualTime.split('T')[1]?.replace('Z', '')}</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Operational Delay Items with Evidence */}
            {selectedRecord.delays.length > 0 && (
              <div className="space-y-3 pt-2 border-t border-border-subtle">
                <h4 className="text-xs font-bold uppercase tracking-wider text-text-muted">
                  Evidence-Backed Root Cause Decomposition
                </h4>
                <div className="space-y-3">
                  {selectedRecord.delays.map(del => (
                    <div
                      key={del.id}
                      className="p-4 rounded-2xl bg-surface-subtle border border-border-subtle space-y-2 text-xs"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-text-main">{del.categoryTitle}</span>
                        <span className="font-bold text-rose-600 font-mono">+{del.delayMinutes} mins</span>
                      </div>
                      <div className="p-2.5 rounded-xl bg-surface border border-border-subtle space-y-1">
                        <div className="text-[10px] text-text-caption font-semibold flex justify-between">
                          <span>SOURCE: {del.evidence.telemetrySource}</span>
                          <span>CONFIDENCE: {Math.round(del.evidence.confidenceScore * 100)}%</span>
                        </div>
                        <div className="text-text-main">{del.evidence.rawObservation}</div>
                      </div>
                      <div className="text-emerald-700 dark:text-emerald-300 font-medium">
                        ✓ Actionable Intervention: {del.actionableIntervention}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
