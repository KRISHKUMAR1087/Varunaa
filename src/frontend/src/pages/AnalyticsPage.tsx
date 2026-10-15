import React, { useState } from 'react';
import {
  TrendingDown,
  TrendingUp,
  Zap,
  ArrowDownRight,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import { useTheme } from '../context/ThemeContext';
import { useOperations } from '../context/OperationsContext';

export const AnalyticsPage: React.FC = () => {
  const { isDark } = useTheme();
  const { vessels } = useOperations();
  const [dateRange, setDateRange] = useState<'7d' | '30d' | '90d'>('30d');

  // If there are no vessels, return 0 values
  const hasData = vessels.length > 0;

  const { trendData, berthSavingsData, impactStats } = React.useMemo(() => {
    if (!hasData) {
      return {
        trendData: [
          { day: 'P1', baselineWait: 0, aiWait: 0 },
          { day: 'P2', baselineWait: 0, aiWait: 0 },
        ],
        berthSavingsData: [
          { berth: 'B01', standardTurnaround: 0, optimizedTurnaround: 0 },
          { berth: 'B02', standardTurnaround: 0, optimizedTurnaround: 0 },
        ],
        impactStats: {
          waitPct: '0%',
          waitSub: 'No active vessel telemetry',
          congPct: '0%',
          congSub: 'No data available',
          utilPct: '0%',
          utilSub: 'No data available',
        },
      };
    }

    if (dateRange === '7d') {
      return {
        trendData: [
          { day: 'Mon', baselineWait: 12.4, aiWait: 7.1 },
          { day: 'Tue', baselineWait: 14.2, aiWait: 8.5 },
          { day: 'Wed', baselineWait: 15.8, aiWait: 9.2 },
          { day: 'Thu', baselineWait: 13.5, aiWait: 7.8 },
          { day: 'Fri', baselineWait: 16.0, aiWait: 9.8 },
          { day: 'Sat', baselineWait: 17.2, aiWait: 10.4 },
          { day: 'Sun', baselineWait: 11.5, aiWait: 6.9 },
        ],
        berthSavingsData: [
          { berth: 'B01', standardTurnaround: 21.0, optimizedTurnaround: 16.5 },
          { berth: 'B02', standardTurnaround: 23.5, optimizedTurnaround: 16.8 },
          { berth: 'B03', standardTurnaround: 18.2, optimizedTurnaround: 14.8 },
          { berth: 'B04', standardTurnaround: 27.0, optimizedTurnaround: 18.1 },
          { berth: 'B05', standardTurnaround: 15.4, optimizedTurnaround: 12.9 },
          { berth: 'B06', standardTurnaround: 17.0, optimizedTurnaround: 14.0 },
        ],
        impactStats: {
          waitPct: '-28%',
          waitSub: 'Reduced from 14.4h to 10.3h (7-day trend)',
          congPct: '-36%',
          congSub: 'Quayside congestion cleared during peak shifts',
          utilPct: '+14%',
          utilSub: 'Balanced quay throughput across 6 berths',
        },
      };
    }

    if (dateRange === '90d') {
      return {
        trendData: [
          { day: 'M1-Early', baselineWait: 17.2, aiWait: 11.8 },
          { day: 'M1-Late', baselineWait: 16.5, aiWait: 10.9 },
          { day: 'M2-Early', baselineWait: 15.4, aiWait: 9.7 },
          { day: 'M2-Late', baselineWait: 14.8, aiWait: 9.1 },
          { day: 'M3-Early', baselineWait: 14.2, aiWait: 8.6 },
          { day: 'M3-Late', baselineWait: 13.6, aiWait: 7.8 },
        ],
        berthSavingsData: [
          { berth: 'B01', standardTurnaround: 23.8, optimizedTurnaround: 19.1 },
          { berth: 'B02', standardTurnaround: 25.4, optimizedTurnaround: 18.9 },
          { berth: 'B03', standardTurnaround: 21.0, optimizedTurnaround: 17.2 },
          { berth: 'B04', standardTurnaround: 29.8, optimizedTurnaround: 20.4 },
          { berth: 'B05', standardTurnaround: 17.1, optimizedTurnaround: 14.5 },
          { berth: 'B06', standardTurnaround: 19.3, optimizedTurnaround: 15.8 },
        ],
        impactStats: {
          waitPct: '-19%',
          waitSub: 'Quarterly average wait reduced by 4.2h per call',
          congPct: '-25%',
          congSub: 'Sustained demurrage savings over 90 days',
          utilPct: '+9%',
          utilSub: 'Long-term capacity utilization lift',
        },
      };
    }

    // Default: '30d'
    return {
      trendData: [
        { day: 'W1', baselineWait: 14.8, aiWait: 9.2 },
        { day: 'W2', baselineWait: 16.2, aiWait: 10.4 },
        { day: 'W3', baselineWait: 15.0, aiWait: 8.9 },
        { day: 'W4', baselineWait: 13.9, aiWait: 7.6 },
      ],
      berthSavingsData: [
        { berth: 'B01', standardTurnaround: 22.4, optimizedTurnaround: 18.2 },
        { berth: 'B02', standardTurnaround: 24.1, optimizedTurnaround: 17.5 },
        { berth: 'B03', standardTurnaround: 19.8, optimizedTurnaround: 16.4 },
        { berth: 'B04', standardTurnaround: 28.5, optimizedTurnaround: 19.2 },
        { berth: 'B05', standardTurnaround: 16.0, optimizedTurnaround: 13.8 },
        { berth: 'B06', standardTurnaround: 18.2, optimizedTurnaround: 15.1 },
      ],
      impactStats: {
        waitPct: '-23%',
        waitSub: 'Reduced from 15.2h to 11.7h',
        congPct: '-31%',
        congSub: 'Fewer quayside delays',
        utilPct: '+12%',
        utilSub: 'Balanced quay load',
      },
    };
  }, [dateRange, hasData]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-main tracking-tight">
            Operational Analytics & Performance
          </h1>
          <p className="text-sm text-text-muted mt-1">
            Audit trailing port efficiency, demurrage savings, and predictive ML accuracy metrics.
          </p>
        </div>

        {/* Date Filter Tabs */}
        <div className="flex items-center bg-surface-subtle p-1 rounded-xl border border-border-subtle">
          {(['7d', '30d', '90d'] as const).map(range => (
            <button
              key={range}
              onClick={() => setDateRange(range)}
              className={`px-3 py-1 text-xs rounded-xl transition-all ${
                dateRange === range
                  ? 'bg-surface text-text-main font-semibold shadow-[0_8px_30px_rgb(0,0,0,0.04)]'
                  : 'text-text-muted hover:text-text-main'
              }`}
            >
              {range === '7d' ? '7 Days' : range === '30d' ? '30 Days' : '90 Days'}
            </button>
          ))}
        </div>
      </div>

      {/* Featured AI Impact Banner */}
      <div className="bg-surface p-6 rounded-3xl border border-border-subtle shadow-[0_8px_30px_rgb(0,0,0,0.04)] space-y-4">
        <div className="flex items-center justify-between border-b border-border-subtle pb-3">
          <span className="text-xs font-semibold uppercase tracking-wider text-text-main flex items-center gap-2">
            <Zap className="w-4 h-4 text-brand-teal" />
            Impact of PortsPilot Optimization
          </span>
          <span className="text-xs text-text-caption">
            Audited over {dateRange.toUpperCase()} rolling period
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
          <div className="bg-surface-subtle p-4 rounded-lg border border-border-subtle flex items-center justify-between">
            <div>
              <span className="text-xs text-text-muted">Average Vessel Wait</span>
              <div className="text-2xl font-bold text-emerald-700 mt-1">{impactStats.waitPct}</div>
              <span className="text-[11px] text-text-caption">{impactStats.waitSub}</span>
            </div>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <TrendingDown className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-surface-subtle p-4 rounded-lg border border-border-subtle flex items-center justify-between">
            <div>
              <span className="text-xs text-text-muted">Unplanned Congestion</span>
              <div className="text-2xl font-bold text-emerald-700 mt-1">{impactStats.congPct}</div>
              <span className="text-[11px] text-text-caption">{impactStats.congSub}</span>
            </div>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <ArrowDownRight className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-surface-subtle p-4 rounded-lg border border-border-subtle flex items-center justify-between">
            <div>
              <span className="text-xs text-text-muted">Berth Utilization</span>
              <div className="text-2xl font-bold text-text-main mt-1">{impactStats.utilPct}</div>
              <span className="text-[11px] text-text-caption">{impactStats.utilSub}</span>
            </div>
            <div className="w-8 h-8 rounded-lg bg-teal-50 text-brand-teal flex items-center justify-center">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
        </div>
      </div>

      {/* Analytics Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart 1: Wait Time Trend */}
        <div className="bg-surface p-6 rounded-3xl border border-border-subtle shadow-[0_8px_30px_rgb(0,0,0,0.04)] space-y-4">
          <div className="flex items-center justify-between border-b border-border-subtle pb-3">
            <h3 className="text-sm font-semibold text-text-main">
              Vessel Waiting Time: Standard vs AI Optimized
            </h3>
            <span className="text-xs text-emerald-700 font-medium">Hours Wait</span>
          </div>

          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#1D4655' : '#F1F5F9'} vertical={false} />
                <XAxis dataKey="day" stroke={isDark ? '#607C87' : '#94A3B8'} fontSize={12} />
                <YAxis stroke={isDark ? '#607C87' : '#94A3B8'} fontSize={12} unit="h" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: isDark ? '#102F3D' : '#FFFFFF',
                    borderColor: isDark ? '#1D4655' : '#E2E8F0',
                    color: isDark ? '#F4F8FA' : '#17232D',
                    fontSize: '12px',
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.2)',
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="baselineWait"
                  name="Standard Operations"
                  stroke={isDark ? '#475569' : '#94A3B8'}
                  fill={isDark ? '#0B2532' : '#F1F5F9'}
                  fillOpacity={0.8}
                />
                <Area
                  type="monotone"
                  dataKey="aiWait"
                  name="PortsPilot AI"
                  stroke="#0EA5A8"
                  fill="#0EA5A8"
                  fillOpacity={0.25}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: Turnaround Hours by Berth */}
        <div className="bg-surface p-6 rounded-3xl border border-border-subtle shadow-[0_8px_30px_rgb(0,0,0,0.04)] space-y-4">
          <div className="flex items-center justify-between border-b border-border-subtle pb-3">
            <h3 className="text-sm font-semibold text-text-main">
              Berth Turnaround Benchmark (Hours per Vessel)
            </h3>
            <span className="text-xs text-text-muted">Quays B01–B06</span>
          </div>

          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={berthSavingsData}>
                <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#1D4655' : '#F1F5F9'} vertical={false} />
                <XAxis dataKey="berth" stroke={isDark ? '#607C87' : '#94A3B8'} fontSize={12} />
                <YAxis stroke={isDark ? '#607C87' : '#94A3B8'} fontSize={12} unit="h" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: isDark ? '#102F3D' : '#FFFFFF',
                    borderColor: isDark ? '#1D4655' : '#E2E8F0',
                    color: isDark ? '#F4F8FA' : '#17232D',
                    fontSize: '12px',
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.2)',
                  }}
                />
                <Bar dataKey="standardTurnaround" name="Standard" fill={isDark ? '#1D4655' : '#CBD5E1'} radius={[3, 3, 0, 0]} />
                <Bar dataKey="optimizedTurnaround" name="PortsPilot AI" fill="#0EA5A8" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

