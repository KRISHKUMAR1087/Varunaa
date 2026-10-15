import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  ArrowUpDown,
  ChevronRight,
  Zap,
  Upload,
} from 'lucide-react';
import { useOperations } from '../context/OperationsContext';
import { StatusBadge } from '../components/common/StatusBadge';
import { CsvImportModal } from '../components/operations/CsvImportModal';

export const VesselsPage: React.FC = () => {
  const navigate = useNavigate();
  const { vessels, searchQuery, setSearchQuery, isOptimizationApplied } = useOperations();
  const [isCsvModalOpen, setIsCsvModalOpen] = useState<boolean>(false);

  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [priorityFilter, setPriorityFilter] = useState<string>('ALL');
  const [sortField, setSortField] = useState<'name' | 'eta' | 'wait' | 'teu'>('wait');
  const [sortAsc, setSortAsc] = useState<boolean>(false);

  const filteredVessels = vessels
    .filter(v => {
      const matchSearch =
        v.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        v.imo.includes(searchQuery) ||
        v.origin.toLowerCase().includes(searchQuery.toLowerCase()) ||
        v.assignedBerth.toLowerCase().includes(searchQuery.toLowerCase());
      const matchStatus = statusFilter === 'ALL' || v.status === statusFilter;
      const matchPriority = priorityFilter === 'ALL' || v.priority === priorityFilter;
      return matchSearch && matchStatus && matchPriority;
    })
    .sort((a, b) => {
      let comparison = 0;
      if (sortField === 'name') comparison = a.name.localeCompare(b.name);
      if (sortField === 'eta') comparison = a.eta.localeCompare(b.eta);
      if (sortField === 'wait') comparison = a.predictedWaitHours - b.predictedWaitHours;
      if (sortField === 'teu') comparison = a.teuCapacity - b.teuCapacity;
      return sortAsc ? comparison : -comparison;
    });

  const toggleSort = (field: 'name' | 'eta' | 'wait' | 'teu') => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-main tracking-tight">
            Vessel Traffic Management
          </h1>
          <p className="text-sm text-text-muted mt-1">
            Tracking {vessels.length} commercial vessels across anchorage and active quayside berths.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-xs text-text-muted">
            <span>In Queue:</span>
            <span className="px-2.5 py-1 rounded-xl bg-surface border border-border-subtle font-semibold text-text-main shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
              {vessels.filter(v => v.status === 'Arriving' || v.status === 'At Anchor').length} Vessels
            </span>
          </div>

          <button
            onClick={() => setIsCsvModalOpen(true)}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold text-white bg-brand-teal hover:bg-teal-700 transition-all shadow-md shadow-teal-500/20 active:scale-95 cursor-pointer"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Import Operations CSV</span>
          </button>
        </div>
      </div>

      {/* Filters & Search Toolbar */}
      <div className="bg-surface p-4 rounded-3xl border border-border-subtle shadow-[0_4px_20px_rgb(0,0,0,0.04)] flex flex-wrap items-center justify-between gap-3 min-w-0">
        <div className="flex flex-wrap items-center gap-3 flex-1 min-w-0 w-full sm:w-auto">
          {/* Search */}
          <div className="relative flex-1 min-w-[180px] max-w-sm w-full">
            <Search className="w-4 h-4 text-text-caption absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by vessel, IMO, or berth..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full bg-surface-subtle border border-border-subtle rounded-full pl-9 pr-4 py-2 text-sm text-text-main placeholder-text-caption focus:outline-hidden focus:border-brand-teal transition-colors"
            />
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="bg-surface-subtle border border-border-subtle rounded-full px-4 py-2 text-sm text-text-main focus:outline-hidden focus:border-brand-teal transition-colors appearance-none"
          >
            <option value="ALL">All Statuses</option>
            <option value="Arriving">Arriving</option>
            <option value="At Anchor">At Anchor</option>
            <option value="Berthing">Berthing</option>
            <option value="Loading">Loading</option>
            <option value="Delayed">Delayed</option>
            <option value="Completed">Completed</option>
          </select>

          {/* Priority Filter */}
          <select
            value={priorityFilter}
            onChange={e => setPriorityFilter(e.target.value)}
            className="bg-surface-subtle border border-border-subtle rounded-full px-4 py-2 text-sm text-text-main focus:outline-hidden focus:border-brand-teal transition-colors appearance-none"
          >
            <option value="ALL">All Priorities</option>
            <option value="Critical">Critical</option>
            <option value="Priority">Priority</option>
            <option value="Standard">Standard</option>
          </select>
        </div>

        <div className="text-xs text-text-muted">
          Showing <strong className="text-text-main">{filteredVessels.length}</strong> of {vessels.length} vessels
        </div>
      </div>

      {/* Operational Vessels Table */}
      <div className="bg-surface rounded-3xl border border-border-subtle shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden w-full min-w-0">
        <div className="overflow-x-auto w-full">
          <table className="w-full text-left text-sm font-sans min-w-[720px]">
            <thead className="bg-surface-subtle/50 border-b border-border-subtle text-text-muted font-semibold text-xs tracking-wider">
              <tr>
                <th
                  onClick={() => toggleSort('name')}
                  className="py-4 px-5 cursor-pointer hover:text-text-main transition-colors"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Vessel</span>
                    <ArrowUpDown className="w-3.5 h-3.5 text-text-caption" />
                  </div>
                </th>
                <th className="py-4 px-4">IMO</th>
                <th
                  onClick={() => toggleSort('eta')}
                  className="py-4 px-4 cursor-pointer hover:text-text-main transition-colors"
                >
                  <div className="flex items-center gap-1.5">
                    <span>ETA / ETD</span>
                    <ArrowUpDown className="w-3.5 h-3.5 text-text-caption" />
                  </div>
                </th>
                <th className="py-4 px-4">Current Berth</th>
                <th className="py-4 px-4">Assigned Berth</th>
                <th className="py-4 px-4">Priority</th>
                <th className="py-4 px-4">Status</th>
                <th
                  onClick={() => toggleSort('wait')}
                  className="py-4 px-4 cursor-pointer hover:text-text-main transition-colors"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Predicted Wait</span>
                    <ArrowUpDown className="w-3.5 h-3.5 text-text-caption" />
                  </div>
                </th>
                <th className="py-4 px-5 text-right">Action</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-border-subtle">
              {filteredVessels.map(v => (
                <tr
                  key={v.id}
                  className="hover:bg-surface-subtle/50 transition-colors"
                >
                  {/* Vessel Name & Flag */}
                  <td className="py-4 px-5">
                    <div
                      onClick={() => navigate(`/operations/vessels/${v.id}`)}
                      className="cursor-pointer font-bold text-text-main hover:text-brand-teal transition-colors"
                    >
                      {v.name}
                    </div>
                    <div className="text-xs text-text-caption mt-0.5">
                      {v.flag} • {v.lengthMeters}m • {v.teuCapacity.toLocaleString()} TEU
                    </div>
                  </td>

                  {/* IMO */}
                  <td className="py-4 px-4 text-text-muted font-mono text-xs">{v.imo}</td>

                  {/* ETA/ETD */}
                  <td className="py-4 px-4 text-sm">
                    <div className="text-text-main font-semibold">{v.eta}</div>
                    <div className="text-xs text-text-caption mt-0.5 flex items-center gap-1.5 flex-wrap">
                      <span>ETD: {v.etd}</span>
                      {v.isEstimatedEtd || (v.etd && v.etd.includes('(Est.)')) ? (
                        <span
                          className="text-[10px] px-1.5 py-0.2 rounded font-semibold bg-sky-50 text-sky-800 border border-sky-200"
                          title={v.etdRationale || "Calculated by system from operational turnaround parameters"}
                        >
                          Est.
                        </span>
                      ) : (
                        <span
                          className="text-[10px] px-1.5 py-0.2 rounded font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200"
                          title="Confirmed operational departure schedule"
                        >
                          Actual
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Current Berth */}
                  <td className="py-4 px-4 text-sm">
                    {v.currentBerth ? (
                      <span className="font-semibold text-text-main">{v.currentBerth}</span>
                    ) : (
                      <span className="text-text-caption">Anchorage</span>
                    )}
                  </td>

                  {/* Assigned Berth */}
                  <td className="py-4 px-4">
                    <span
                      className={`font-semibold px-2.5 py-1 rounded-full text-xs border ${
                        v.assignedBerth === 'B04' && !isOptimizationApplied
                          ? 'bg-rose-50 text-rose-700 border-rose-200'
                          : v.assignedBerth === 'B02' && isOptimizationApplied && v.id === 'VES-01'
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                          : 'bg-surface-subtle text-text-main border-border-subtle'
                      }`}
                    >
                      {v.assignedBerth}
                    </span>
                  </td>

                  {/* Priority */}
                  <td className="py-4 px-4">
                    <span
                      className={`text-xs font-semibold px-2.5 py-1 rounded-full border shadow-xs ${
                        v.priority === 'Critical'
                          ? 'bg-rose-50 text-rose-700 border-rose-200'
                          : v.priority === 'Priority'
                          ? 'bg-amber-50 text-amber-800 border-amber-200'
                          : 'bg-slate-50 text-slate-700 border-slate-200'
                      }`}
                    >
                      {v.priority}
                    </span>
                  </td>

                  {/* Status */}
                  <td className="py-4 px-4">
                    <StatusBadge status={v.status} />
                  </td>

                  {/* Predicted Wait */}
                  <td className="py-4 px-4">
                    <div className="font-bold text-text-main text-sm">
                      {v.predictedWaitHours}h
                    </div>
                    <div
                      className={`text-xs mt-0.5 ${
                        v.demurrageRisk === 'High'
                          ? 'text-rose-600 font-semibold'
                          : 'text-text-caption'
                      }`}
                    >
                      {v.demurrageRisk} Demurrage
                    </div>
                  </td>

                  {/* Action */}
                  <td className="py-4 px-5 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {v.id === 'VES-01' && (
                        <button
                          onClick={() => navigate('/decision/optimizer')}
                          className="px-3 py-1.5 rounded-full text-xs font-semibold text-white bg-brand-teal hover:bg-teal-700 transition-all shadow-[0_2px_8px_rgba(20,184,166,0.3)] flex items-center gap-1.5"
                        >
                          <Zap className="w-3.5 h-3.5" />
                          <span>Optimize</span>
                        </button>
                      )}
                      <button
                        onClick={() => navigate(`/operations/vessels/${v.id}`)}
                        className="p-2 rounded-full text-text-caption hover:text-text-main hover:bg-surface-subtle transition-colors"
                        title="View Vessel Profile"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* CSV Ingestion Modal */}
      <CsvImportModal
        isOpen={isCsvModalOpen}
        onClose={() => setIsCsvModalOpen(false)}
      />
    </div>
  );
};

