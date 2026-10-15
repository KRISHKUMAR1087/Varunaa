import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Clock,
  Anchor,
  Edit2,
  X,
  ArrowRight,
} from 'lucide-react';
import { useOperations } from '../../context/OperationsContext';
import { useAuth } from '../../context/AuthContext';
import { StatusBadge } from '../../components/common/StatusBadge';
import { RiskBadge } from '../../components/common/RiskBadge';

export const ShippingSchedulesPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { vessels, isOptimizationApplied, updateVesselEta, updateVessel } = useOperations();

  const [selectedVesselId, setSelectedVesselId] = useState<string | null>(null);
  const [newEta, setNewEta] = useState('');
  const [newEtd, setNewEtd] = useState('');
  const [reason, setReason] = useState('Weather & Sea State');

  // Filter agent vessels
  const agentVessels = vessels.filter(
    v => !v.ownerId || v.ownerId === user?.id || v.ownerId === 'demo-agent'
  );

  const handleOpenModal = (vesselId: string) => {
    const v = vessels.find(item => item.id === vesselId);
    if (v) {
      setSelectedVesselId(v.id);
      setNewEta(v.eta);
      setNewEtd(v.etd);
    }
  };

  const handleSaveSchedule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVesselId || !newEta.trim()) return;

    updateVesselEta(selectedVesselId, newEta.trim(), reason);
    if (newEtd.trim()) {
      updateVessel(selectedVesselId, { etd: newEtd.trim() });
    }
    setSelectedVesselId(null);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 min-w-0">
      {/* 1. Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-border-subtle">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-text-main">
            Schedules & Voyage Tracking
          </h1>
          <p className="text-xs text-text-muted mt-1">
            Monitor arrival windows, manage voyage timing, and receive predictive turn-time projections.
          </p>
        </div>
      </div>

      {/* 2. Schedule Advisory Banner */}
      <div className="p-4 rounded-lg bg-surface border border-border-subtle shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex items-start gap-3 text-xs">
        <Clock className="w-4 h-4 text-sky-600 shrink-0 mt-0.5" />
        <div className="text-text-muted leading-relaxed">
          <strong className="text-text-main">Schedule Synchronization Notice:</strong> When you adjust an ETA, the port authority’s predictive machine learning models immediately recalibrate berth queue times and fairway passage plans.
        </div>
      </div>

      {/* 3. Schedules Timeline Board */}
      <div className="space-y-4">
        {agentVessels.map(v => {
          const isOceanStar = v.id === 'VES-01';
          const waitTime = isOceanStar && isOptimizationApplied ? 6.8 : v.predictedWaitHours;
          const berthDisplay = isOceanStar && isOptimizationApplied ? 'B02' : (v.assignedBerth || v.requestedBerth || 'Unassigned');

          return (
            <div
              key={v.id}
              className="p-5 rounded-lg bg-surface border border-border-subtle shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:border-sky-300 transition-all flex flex-col lg:flex-row lg:items-center justify-between gap-4"
            >
              {/* Left Column: Vessel info & Route */}
              <div className="space-y-2 lg:w-1/3">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold text-sm text-text-main">{v.name}</span>
                  <StatusBadge status={v.status} />
                  <RiskBadge risk={isOceanStar && isOptimizationApplied ? 'Low' : v.demurrageRisk} />
                </div>
                <div className="text-xs text-text-muted">
                  Voyage <strong className="font-mono text-text-main">{v.voyageNumber || 'APX-01'}</strong> • IMO {v.imo}
                </div>
                <div className="text-xs text-text-muted flex items-center gap-1.5">
                  <span>{v.origin}</span>
                  <span>→</span>
                  <span className="font-medium text-text-main">{v.destination}</span>
                </div>
              </div>

              {/* Middle Column: Windows & Berthing */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs lg:w-1/2 border-t lg:border-t-0 lg:border-l border-border-subtle pt-3 lg:pt-0 lg:pl-6">
                <div>
                  <span className="text-[10px] text-text-muted uppercase font-semibold">Estimated Arrival (ETA)</span>
                  <div className="font-bold text-sky-900 mt-1">{v.eta}</div>
                  <div className="text-[10px] text-text-caption mt-0.5">Pilot Station Window</div>
                </div>

                <div>
                  <span className="text-[10px] text-text-muted uppercase font-semibold">Estimated Departure (ETD)</span>
                  <div className="font-medium text-text-main mt-1 flex items-center gap-1.5 flex-wrap">
                    <span>{v.etd}</span>
                    {v.isEstimatedEtd || (v.etd && v.etd.includes('(Est.)')) ? (
                      <span className="text-[9px] px-1.5 py-0.2 rounded font-semibold bg-sky-50 text-sky-800 border border-sky-200" title={v.etdRationale || "Calculated by system"}>
                        Est.
                      </span>
                    ) : (
                      <span className="text-[9px] px-1.5 py-0.2 rounded font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                        Actual
                      </span>
                    )}
                  </div>
                  <div className="text-[10px] text-text-caption mt-0.5">Unmooring Target</div>
                </div>

                <div>
                  <span className="text-[10px] text-text-muted uppercase font-semibold">Berth & Delay Projection</span>
                  <div className="flex items-center gap-1.5 font-mono text-xs font-semibold text-text-main mt-1">
                    <Anchor className="w-3.5 h-3.5 text-sky-600" />
                    <span>{berthDisplay}</span>
                    <span className="text-text-caption">({waitTime}h wait)</span>
                  </div>
                  <div className="text-[10px] text-text-caption mt-0.5">
                    {waitTime > 8 ? (
                      <span className="text-rose-600 font-medium">⚠️ Delay Risk</span>
                    ) : (
                      <span className="text-emerald-600 font-medium">On Schedule</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Right Column: Actions */}
              <div className="flex items-center gap-2 shrink-0 pt-2 lg:pt-0 border-t lg:border-t-0 border-border-subtle">
                <button
                  onClick={() => handleOpenModal(v.id)}
                  className="px-3.5 py-2 rounded-xl bg-sky-50 hover:bg-sky-100 border border-sky-200 text-sky-900 font-semibold text-xs transition-colors flex items-center gap-1.5 cursor-pointer shadow-[0_8px_30px_rgb(0,0,0,0.04)]"
                >
                  <Edit2 className="w-3 h-3 text-sky-600" />
                  <span>Update ETA</span>
                </button>
                <button
                  onClick={() => navigate(`/shipping/vessels/${v.id}`)}
                  className="p-2 rounded-xl bg-surface hover:bg-surface-subtle border border-border-subtle text-text-muted hover:text-text-main transition-colors cursor-pointer"
                  title="View Vessel Details"
                >
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* ================================================= */}
      {/* MODAL: UPDATE ETA / SCHEDULE */}
      {/* ================================================= */}
      {selectedVesselId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-surface rounded-xl border border-border-subtle shadow-modal max-w-md w-full p-5 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-border-subtle">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-sky-600" />
                <h3 className="text-sm font-semibold text-text-main">Update Voyage Schedule</h3>
              </div>
              <button
                onClick={() => setSelectedVesselId(null)}
                className="p-1 rounded-xl text-text-caption hover:text-text-main cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveSchedule} className="space-y-3.5 text-xs">
              <div>
                <label className="font-semibold text-text-main">New ETA (Estimated Time of Arrival)</label>
                <input
                  type="text"
                  placeholder="e.g. Tomorrow, 18:30 UTC"
                  value={newEta}
                  onChange={e => setNewEta(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-surface-subtle border border-border-subtle text-text-main text-xs focus:outline-hidden focus:border-sky-500 mt-1"
                  required
                />
              </div>

              <div>
                <label className="font-semibold text-text-main">New ETD (Estimated Time of Departure)</label>
                <input
                  type="text"
                  placeholder="e.g. +2 Days, 12:00 UTC"
                  value={newEtd}
                  onChange={e => setNewEtd(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-surface-subtle border border-border-subtle text-text-main text-xs focus:outline-hidden focus:border-sky-500 mt-1"
                />
              </div>

              <div>
                <label className="font-semibold text-text-main">Reason for Schedule Adjustment</label>
                <select
                  value={reason}
                  onChange={e => setReason(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-surface-subtle border border-border-subtle text-text-main text-xs focus:outline-hidden focus:border-sky-500 mt-1"
                >
                  <option value="Weather & Sea State">Adverse Weather / Offshore Sea State</option>
                  <option value="Mechanical / Engineering Maintenance">Machinery / Propulsion Inspection</option>
                  <option value="Previous Port Delay">Prior Port Congestion Delay</option>
                  <option value="Cargo Stowing Disruption">Discharge Operations Disruption</option>
                  <option value="Pilotage / Fairway Window">Pilotage / Tidal Window Shift</option>
                  <option value="Other">Other Operational Adjustment</option>
                </select>
              </div>

              <div className="p-3 rounded bg-sky-50/70 border border-sky-200 text-sky-900 text-[11px] leading-relaxed">
                Port operations watchtower will receive this update in real time. Congestion forecasts and quayside labor gangs will adjust automatically.
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-border-subtle">
                <button
                  type="button"
                  onClick={() => setSelectedVesselId(null)}
                  className="px-3 py-1.5 rounded-xl bg-surface hover:bg-surface-subtle border border-border-subtle text-text-main cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-semibold cursor-pointer shadow-[0_8px_30px_rgb(0,0,0,0.04)]"
                >
                  Confirm & Sync
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

