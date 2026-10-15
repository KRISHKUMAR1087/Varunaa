import React, { useState } from 'react';
import {
  Zap,
  Download,
  Send,
  AlertTriangle,
  CheckCircle2,
  Ship,
  Anchor,
  Cpu,
  Sparkles,
} from 'lucide-react';
import { useOperations } from '../context/OperationsContext';
import { MetricCard } from '../components/common/MetricCard';

export const PlannerPage: React.FC = () => {
  const {
    vessels,
    berths,
    cranes,
    shiftPlans,
    isOptimizationApplied,
    isRecoveryPlanApplied,
    applyOptimization,
    showToast,
    setIsCopilotOpen,
    sendCopilotMessage,
  } = useOperations();

  const [activeDayTab, setActiveDayTab] = useState<number>(0);

  const days = [
    { offset: 0, label: 'Today (Day 1)' },
    { offset: 1, label: 'Tomorrow (Day 2)' },
    { offset: 2, label: '+2 Days (Day 3)' },
    { offset: 3, label: '+3 Days (Day 4)' },
  ];

  const shifts: ('06-14' | '14-22' | '22-06')[] = ['06-14', '14-22', '22-06'];

  const isResolved = isOptimizationApplied || isRecoveryPlanApplied;

  const handleExportPlan = () => {
    const csvHeader = 'Shift,Berth,Vessel,Cranes,Status\n';
    const csvRows = shiftPlans
      .map(
        sp =>
          `${sp.shift},${sp.berthId},${sp.vesselName || 'Available'},${sp.assignedCranes.join(';')},${sp.status}`
      )
      .join('\n');
    const blob = new Blob([csvHeader + csvRows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `varunaa-72h-shift-plan-${Date.now()}.csv`;
    a.click();
    showToast('success', 'Plan Exported', '72-Hour operational CSV generated and downloaded.');
  };

  const handleSendToOps = () => {
    showToast(
      'success',
      'Dispatched to Operations',
      'Shift plan transmitted via EDI/VHF to stevedore superintendents and pilot station.'
    );
  };

  const handleOptimizeEntirePlan = () => {
    applyOptimization();
  };

  const handleAskCopilot = async () => {
    setIsCopilotOpen(true);
    await sendCopilotMessage('Generate tomorrow\'s shift plan and summarize resolved conflicts.');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-text-main tracking-tight">
              72-Hour Operations Plan
            </h1>
            <span className="px-2 py-0.5 rounded text-xs font-semibold bg-teal-50 text-teal-800 border border-teal-200">
              Stevedore & Quay Scheduling
            </span>
          </div>
          <p className="text-sm text-text-muted mt-1">
            Dynamic 3-day multi-shift operational schedule coordinating berth allocations, crane gangs, and labour teams.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleOptimizeEntirePlan}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold text-white bg-brand-teal hover:bg-teal-700 transition-all shadow-[0_8px_30px_rgb(0,0,0,0.04)]"
          >
            <Zap className="w-3.5 h-3.5" />
            <span>Optimize Entire Plan</span>
          </button>
          <button
            onClick={handleExportPlan}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-medium text-text-main bg-surface hover:bg-surface-subtle border border-border-subtle transition-colors shadow-[0_8px_30px_rgb(0,0,0,0.04)]"
          >
            <Download className="w-3.5 h-3.5 text-text-muted" />
            <span>Export Plan (CSV)</span>
          </button>
          <button
            onClick={handleSendToOps}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-medium text-text-main bg-surface hover:bg-surface-subtle border border-border-subtle transition-colors shadow-[0_8px_30px_rgb(0,0,0,0.04)]"
          >
            <Send className="w-3.5 h-3.5 text-emerald-600" />
            <span>Send to Operations</span>
          </button>
        </div>
      </div>

      {/* Top Operational Summary Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
        <MetricCard
          label="Vessel Movements"
          value={vessels.length}
          unit="movements"
          subtext="Quay arrivals & departures"
          icon={Ship}
        />
        <MetricCard
          label="Berth Assignments"
          value={berths.filter(b => b.status === 'Occupied').length}
          unit="windows"
          subtext="Quayside allocations"
          icon={Anchor}
        />
        <MetricCard
          label="Crane Allocations"
          value={cranes.filter(c => c.status === 'ACTIVE').length}
          unit="gangs"
          subtext="STS shifts deployed"
          icon={Cpu}
        />
        <MetricCard
          label="Predicted Conflicts"
          value={isResolved ? 0 : 3}
          subtext={isResolved ? '3 Resolved by AI' : 'Schedule overlap'}
          icon={AlertTriangle}
          variant={isResolved ? 'default' : 'red'}
          trend={{ value: isResolved ? 'Resolved' : 'Action Required', isPositive: isResolved }}
        />
        <MetricCard
          label="Plan Reliability"
          value={isResolved ? '98%' : '84%'}
          subtext="Weather verified"
          icon={CheckCircle2}
        />
      </div>

      {/* Day Selection Tabs */}
      <div className="flex items-center justify-between border-b border-border-subtle pb-3">
        <div className="flex items-center gap-2">
          {days.map(d => (
            <button
              key={d.offset}
              onClick={() => setActiveDayTab(d.offset)}
              className={`px-3 py-1.5 rounded-xl text-xs transition-colors border ${
                activeDayTab === d.offset
                  ? 'bg-surface text-text-main font-semibold border-slate-300 shadow-[0_8px_30px_rgb(0,0,0,0.04)]'
                  : 'bg-surface-subtle text-text-muted hover:text-text-main border-border-subtle'
              }`}
            >
              {d.label}
            </button>
          ))}
        </div>

        <button
          onClick={handleAskCopilot}
          className="flex items-center gap-1.5 text-xs text-brand-teal hover:underline font-medium"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Summarize with Copilot</span>
        </button>
      </div>

      {/* Shifts Planning Board */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {shifts.map(shift => {
          const shiftItems = shiftPlans.filter(
            sp => sp.dayOffset === activeDayTab && sp.shift === shift
          );

          const shiftTitle =
            shift === '06-14'
              ? 'Morning Shift (06:00 – 14:00)'
              : shift === '14-22'
              ? 'Afternoon Shift (14:00 – 22:00)'
              : 'Night Shift (22:00 – 06:00)';

          return (
            <div
              key={shift}
              className="bg-surface rounded-3xl border border-border-subtle p-5 shadow-[0_8px_30px_rgb(0,0,0,0.04)] space-y-4"
            >
              <div className="flex items-center justify-between border-b border-border-subtle pb-3">
                <div>
                  <h3 className="text-xs font-semibold text-text-main">{shiftTitle}</h3>
                  <span className="text-[11px] text-text-muted">
                    {shiftItems.length} Allocated Quays
                  </span>
                </div>
                <span className="text-[11px] px-2 py-0.5 rounded bg-surface-subtle text-text-main border border-border-subtle font-medium">
                  Shift {shift}
                </span>
              </div>

              {/* Shift Assignments List */}
              <div className="space-y-3">
                {shiftItems.map(item => {
                  const isConflict = item.status === 'Conflict';
                  const isOptimized = item.status === 'Optimized';

                  return (
                    <div
                      key={item.id}
                      className={`p-3.5 rounded-lg border text-xs space-y-1.5 transition-all ${
                        isConflict
                          ? 'bg-rose-50/50 border-rose-200'
                          : isOptimized
                          ? 'bg-emerald-50/40 border-emerald-200'
                          : 'bg-surface-subtle border-border-subtle'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-text-main">{item.berthId}</span>
                        <span
                          className={`text-[10px] font-medium px-1.5 py-0.2 rounded ${
                            isConflict
                              ? 'bg-rose-100 text-rose-700'
                              : isOptimized
                              ? 'bg-emerald-100 text-emerald-800 font-semibold'
                              : 'bg-surface text-text-muted border border-border-subtle'
                          }`}
                        >
                          {item.status}
                        </span>
                      </div>

                      <div className="text-text-main font-semibold truncate">
                        {item.vesselName || 'Available Quay Window'}
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-text-muted pt-0.5">
                        <span>Cranes: {item.assignedCranes.join(', ') || 'Standby'}</span>
                        {item.vesselId === 'VES-01' && (
                          <span className="text-emerald-700 font-medium">Priority ULCV</span>
                        )}
                      </div>

                      {item.conflictReason && (
                        <div className="p-2 rounded bg-rose-100 text-rose-800 text-[11px] leading-tight mt-1 border border-rose-200">
                          {item.conflictReason}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

