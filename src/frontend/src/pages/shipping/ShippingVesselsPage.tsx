import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  PlusCircle,
  Trash2,
  Anchor,
} from 'lucide-react';
import { useOperations } from '../../context/OperationsContext';
import { useAuth } from '../../context/AuthContext';
import { StatusBadge } from '../../components/common/StatusBadge';
import { RiskBadge } from '../../components/common/RiskBadge';

export const ShippingVesselsPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { vessels, isOptimizationApplied, deleteVessel } = useOperations();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Filter vessels belonging to agency
  const agentVessels = vessels.filter(
    v => !v.ownerId || v.ownerId === user?.id || v.ownerId === 'demo-agent'
  );

  const filtered = agentVessels.filter(v => {
    const term = search.toLowerCase().trim();
    const matchSearch =
      !term ||
      v.name.toLowerCase().includes(term) ||
      v.imo.includes(term) ||
      (v.voyageNumber && v.voyageNumber.toLowerCase().includes(term)) ||
      v.origin.toLowerCase().includes(term);

    const matchStatus =
      statusFilter === 'ALL' ||
      (statusFilter === 'Arriving' && v.status === 'Arriving') ||
      (statusFilter === 'At Port' && ['Berthing', 'Loading'].includes(v.status)) ||
      (statusFilter === 'Delayed' && (v.status === 'Delayed' || v.demurrageRisk === 'High')) ||
      (statusFilter === 'Departed' && v.status === 'Completed');

    return matchSearch && matchStatus;
  });

  const handleDelete = (vesselId: string, vesselName: string, e: React.MouseEvent) => {
    e.stopPropagation();
    e.stopPropagation();
    if (window.confirm(`Are you sure you want to archive ${vesselName} from your active fleet?`)) {
      deleteVessel(vesselId);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-8 min-w-0">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-border-subtle">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-text-main">
            My Vessels
          </h1>
          <p className="text-xs text-text-muted mt-1">
            Fleet tracking, voyage rotations, and port call status for your shipping agency.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/shipping/vessels/add')}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-white bg-sky-600 hover:bg-sky-700 transition-all shadow-[0_8px_30px_rgb(0,0,0,0.04)] cursor-pointer"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>+ Add Vessel</span>
          </button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-surface p-4 rounded-3xl border border-border-subtle shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex flex-wrap items-center justify-between gap-3 min-w-0">
        <div className="flex flex-wrap items-center gap-3 flex-1 min-w-0 w-full sm:w-auto">
          {/* Search by Name, IMO, Voyage */}
          <div className="relative flex-1 min-w-[220px] max-w-sm w-full">
            <Search className="w-4 h-4 text-text-caption absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by vessel name, IMO, voyage..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full bg-surface-subtle border border-border-subtle rounded-xl pl-9 pr-3 py-1.5 text-xs text-text-main placeholder-text-caption focus:outline-hidden focus:border-sky-500"
            />
          </div>

          {/* Status Filter Tabs/Dropdown */}
          <div className="flex items-center gap-1 bg-surface-subtle p-0.5 rounded-xl border border-border-subtle text-xs">
            {['ALL', 'Arriving', 'At Port', 'Delayed', 'Departed'].map(status => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-3 py-1 rounded text-xs font-medium transition-colors cursor-pointer ${
                  statusFilter === status
                    ? 'bg-surface text-text-main font-semibold shadow-xs'
                    : 'text-text-muted hover:text-text-main'
                }`}
              >
                {status === 'ALL' ? 'All' : status}
              </button>
            ))}
          </div>
        </div>

        <div className="text-xs text-text-muted">
          Showing <strong className="text-text-main">{filtered.length}</strong> of {agentVessels.length} vessels
        </div>
      </div>

      {/* Vessels Table */}
      <div className="bg-surface rounded-3xl border border-border-subtle shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden w-full min-w-0">
        <div className="overflow-x-auto w-full">
          <table className="w-full text-left text-xs font-sans min-w-[850px]">
            <thead className="bg-surface-subtle border-b border-border-subtle text-text-muted font-medium text-[11px] uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Vessel</th>
                <th className="py-3 px-3">IMO / Voyage</th>
                <th className="py-3 px-3">ETA</th>
                <th className="py-3 px-3">ETD</th>
                <th className="py-3 px-3">Current Status</th>
                <th className="py-3 px-3">Assigned / Req. Berth</th>
                <th className="py-3 px-3">Expected Wait</th>
                <th className="py-3 px-3">Congestion Risk</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-text-muted text-xs">
                    No vessels found matching "{search}".
                  </td>
                </tr>
              ) : (
                filtered.map(vessel => {
                  const isOceanStar = vessel.id === 'VES-01';
                  const waitTime = isOceanStar && isOptimizationApplied ? 6.8 : vessel.predictedWaitHours;
                  const berthDisplay = isOceanStar && isOptimizationApplied ? 'B02' : (vessel.assignedBerth || vessel.requestedBerth || 'Unassigned');
                  const riskDisplay = isOceanStar && isOptimizationApplied ? 'Low' : vessel.demurrageRisk;

                  return (
                    <tr
                      key={vessel.id}
                      onClick={() => navigate(`/shipping/vessels/${vessel.id}`)}
                      className="hover:bg-surface-subtle/70 transition-colors cursor-pointer"
                    >
                      {/* Name + Spec */}
                      <td className="py-3.5 px-4 font-semibold text-text-main">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-xl bg-sky-50 text-sky-700 flex items-center justify-center font-bold text-[11px] shrink-0 border border-sky-100">
                            {vessel.name.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="font-semibold text-text-main">{vessel.name}</span>
                              {isOceanStar && isOptimizationApplied && (
                                <span className="text-[9px] px-1.5 py-0.2 rounded font-semibold bg-emerald-100 text-emerald-800">
                                  B02 Assigned
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] text-text-muted font-normal">
                              {vessel.flag} • {vessel.vesselType || 'Container Ship'}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* IMO / Voyage */}
                      <td className="py-3.5 px-3">
                        <div className="font-mono text-[11px] text-text-main">
                          {vessel.voyageNumber || 'APX-01'}
                        </div>
                        <div className="text-[10px] text-text-caption font-mono">
                          IMO {vessel.imo}
                        </div>
                      </td>

                      {/* ETA */}
                      <td className="py-3.5 px-3">
                        <div className="text-text-main font-medium">{vessel.eta}</div>
                        <div className="text-[10px] text-text-muted">{vessel.origin}</div>
                      </td>

                      {/* ETD */}
                      <td className="py-3.5 px-3">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-text-muted">{vessel.etd}</span>
                          {vessel.isEstimatedEtd || (vessel.etd && vessel.etd.includes('(Est.)')) ? (
                            <span className="text-[9px] px-1.5 py-0.2 rounded font-semibold bg-sky-50 text-sky-800 border border-sky-200">
                              Est.
                            </span>
                          ) : (
                            <span className="text-[9px] px-1.5 py-0.2 rounded font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                              Actual
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-text-caption mt-0.5">{vessel.destination}</div>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-3">
                        <StatusBadge status={vessel.status} />
                      </td>

                      {/* Berth */}
                      <td className="py-3.5 px-3">
                        <span
                          className={`inline-flex items-center gap-1 font-mono text-xs px-2 py-0.5 rounded font-medium ${
                            isOceanStar && isOptimizationApplied
                              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                              : 'bg-surface-subtle text-text-main border border-border-subtle'
                          }`}
                        >
                          <Anchor className="w-3 h-3 text-sky-600" />
                          {berthDisplay}
                        </span>
                      </td>

                      {/* Expected Wait */}
                      <td className="py-3.5 px-3 font-mono">
                        <span
                          className={`font-semibold ${
                            waitTime > 8 ? 'text-rose-600 font-bold' : waitTime > 4 ? 'text-amber-600' : 'text-emerald-600'
                          }`}
                        >
                          {waitTime}h
                        </span>
                      </td>

                      {/* Demurrage Risk */}
                      <td className="py-3.5 px-3">
                        <RiskBadge risk={riskDisplay} />
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={e => {
                              e.stopPropagation();
                              navigate(`/shipping/vessels/${vessel.id}`);
                            }}
                            className="px-2.5 py-1 rounded bg-surface-subtle hover:bg-sky-50 text-sky-800 hover:text-sky-900 border border-border-subtle font-medium text-[11px] transition-colors cursor-pointer"
                          >
                            Manage
                          </button>
                          <button
                            onClick={e => handleDelete(vessel.id, vessel.name, e)}
                            className="p-1 rounded text-text-caption hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                            title="Archive Vessel"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

