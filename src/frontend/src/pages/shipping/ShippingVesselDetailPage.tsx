import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Ship,
  Anchor,
  Clock,
  Layers,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Compass,
  Edit2,
  FileText,
  MessageSquare,
  X,
  Send
} from 'lucide-react';
import { useOperations } from '../../context/OperationsContext';
import { StatusBadge } from '../../components/common/StatusBadge';
import { RiskBadge } from '../../components/common/RiskBadge';
import { MetricCard } from '../../components/common/MetricCard';

export const ShippingVesselDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const {
    vessels,
    isOptimizationApplied,
    updateVesselEta,
    updateVessel,
    showToast,
  } = useOperations();

  const vessel = vessels.find(v => v.id === id || v.imo === id) || vessels[0];
  const isOceanStar = vessel.id === 'VES-01';

  // Modals state
  const [isEtaModalOpen, setIsEtaModalOpen] = useState(false);
  const [newEta, setNewEta] = useState(vessel.eta);
  const [etaReason, setEtaReason] = useState('Weather');

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    name: vessel.name,
    voyageNumber: vessel.voyageNumber || '',
    shippingCompany: vessel.shippingCompany || '',
    flag: vessel.flag,
    callSign: vessel.callSign || '',
    destination: vessel.destination,
  });

  const [isContactModalOpen, setIsContactModalOpen] = useState(false);
  const [contactMessage, setContactMessage] = useState('');

  const waitTime = isOceanStar && isOptimizationApplied ? 6.8 : vessel.predictedWaitHours;
  const berthDisplay = isOceanStar && isOptimizationApplied ? 'B02' : (vessel.assignedBerth || vessel.requestedBerth || 'Unassigned');
  const riskDisplay = isOceanStar && isOptimizationApplied ? 'Low' : vessel.demurrageRisk;

  // Handle ETA Update
  const handleEtaSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEta.trim()) return;
    updateVesselEta(vessel.id, newEta.trim(), etaReason);
    setIsEtaModalOpen(false);
  };

  // Handle Edit Vessel
  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateVessel(vessel.id, {
      name: editForm.name,
      voyageNumber: editForm.voyageNumber,
      shippingCompany: editForm.shippingCompany,
      flag: editForm.flag,
      callSign: editForm.callSign,
      destination: editForm.destination,
    });
    setIsEditModalOpen(false);
  };

  // Handle Contact Dispatch
  const handleContactSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!contactMessage.trim()) return;
    showToast('success', 'Message Dispatched', `Direct message regarding ${vessel.name} sent to Port Operations Watchtower.`);
    setContactMessage('');
    setIsContactModalOpen(false);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 min-w-0">
      {/* 1. Header & Back Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-border-subtle">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/shipping/vessels')}
            className="p-2 rounded-xl bg-surface border border-border-subtle text-text-muted hover:text-text-main hover:bg-surface-subtle transition-colors shadow-[0_8px_30px_rgb(0,0,0,0.04)] cursor-pointer"
            title="Back to fleet"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-2xl font-bold tracking-tight text-text-main">
                {vessel.name}
              </h1>
              <StatusBadge status={vessel.status} />
              <RiskBadge risk={riskDisplay} />
            </div>
            <p className="text-xs text-text-muted mt-0.5">
              IMO {vessel.imo} • Voyage: {vessel.voyageNumber || 'APX-01'} • {vessel.shippingCompany || 'Apex Maritime Lines'}
            </p>
          </div>
        </div>

        {/* Action Buttons Toolbar */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setIsEditModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-surface hover:bg-surface-subtle border border-border-subtle text-xs font-medium text-text-main transition-colors shadow-[0_8px_30px_rgb(0,0,0,0.04)] cursor-pointer"
          >
            <Edit2 className="w-3.5 h-3.5 text-text-caption" />
            <span>Edit Vessel</span>
          </button>
          <button
            onClick={() => setIsEtaModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-sky-50 hover:bg-sky-100 border border-sky-200 text-xs font-semibold text-sky-900 transition-colors shadow-[0_8px_30px_rgb(0,0,0,0.04)] cursor-pointer"
          >
            <Clock className="w-3.5 h-3.5 text-sky-600" />
            <span>Update ETA</span>
          </button>
          <button
            onClick={() => navigate('/shipping/berth-requests')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-surface hover:bg-surface-subtle border border-border-subtle text-xs font-medium text-text-main transition-colors shadow-[0_8px_30px_rgb(0,0,0,0.04)] cursor-pointer"
          >
            <Anchor className="w-3.5 h-3.5 text-text-caption" />
            <span>Request Berth</span>
          </button>
          <button
            onClick={() => navigate('/shipping/documents')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-surface hover:bg-surface-subtle border border-border-subtle text-xs font-medium text-text-main transition-colors shadow-[0_8px_30px_rgb(0,0,0,0.04)] cursor-pointer"
          >
            <FileText className="w-3.5 h-3.5 text-text-caption" />
            <span>Upload Document</span>
          </button>
          <button
            onClick={() => setIsContactModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-surface hover:bg-surface-subtle border border-border-subtle text-xs font-medium text-text-main transition-colors shadow-[0_8px_30px_rgb(0,0,0,0.04)] cursor-pointer"
          >
            <MessageSquare className="w-3.5 h-3.5 text-text-caption" />
            <span>Contact Port Ops</span>
          </button>
        </div>
      </div>

      {/* 2. Key Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <MetricCard
          label="Assigned Berth"
          value={berthDisplay}
          subtext={
            isOceanStar && isOptimizationApplied
              ? 'Optimal Quayside (B02)'
              : isOceanStar
              ? 'Bottleneck Risk (B04)'
              : 'Assigned Quayside'
          }
          icon={Anchor}
          variant={isOceanStar && isOptimizationApplied ? 'cyan' : isOceanStar ? 'red' : 'default'}
        />
        <MetricCard
          label="Predicted Wait Time"
          value={waitTime}
          unit="hours"
          subtext={isOceanStar && isOptimizationApplied ? '-4.6h wait reduction' : 'Quayside queuing'}
          icon={Clock}
          variant={waitTime > 8 ? 'red' : 'default'}
          trend={{
            value: isOceanStar && isOptimizationApplied ? 'Optimized' : waitTime > 8 ? 'High Risk' : 'Normal',
            isPositive: !(waitTime > 8),
          }}
        />
        <MetricCard
          label="Cargo Progress"
          value={vessel.containersLoaded ? `${vessel.containersLoaded}/${vessel.containersTotal || vessel.cargoVolume}` : `${vessel.cargoVolume.toLocaleString()}`}
          unit="TEU"
          subtext={vessel.dangerousGoods ? '⚠️ Hazmat IMDG onboard' : 'Standard containerized'}
          icon={Layers}
        />
        <MetricCard
          label="Historical Turnaround"
          value={vessel.historicalTurnaroundHours}
          unit="hours"
          subtext="Port average benchmark"
          icon={Ship}
        />
      </div>

      {/* 3. Section: Vessel Overview & Port Call Details */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Vessel Overview */}
        <div className="p-5 rounded-lg bg-surface border border-border-subtle shadow-[0_8px_30px_rgb(0,0,0,0.04)] space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-border-subtle">
            <h2 className="text-xs font-bold text-text-main uppercase tracking-wider flex items-center gap-2">
              <Ship className="w-4 h-4 text-sky-600" />
              Vessel Overview & Specifications
            </h2>
            <span className="text-[10px] text-text-caption font-mono">IMO {vessel.imo}</span>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="p-2.5 rounded bg-surface-subtle border border-border-subtle">
              <span className="text-text-muted text-[10px] uppercase">Vessel Name</span>
              <div className="font-semibold text-text-main mt-0.5">{vessel.name}</div>
            </div>
            <div className="p-2.5 rounded bg-surface-subtle border border-border-subtle">
              <span className="text-text-muted text-[10px] uppercase">Shipping Company</span>
              <div className="font-semibold text-text-main mt-0.5">{vessel.shippingCompany || 'Apex Maritime Agency'}</div>
            </div>
            <div className="p-2.5 rounded bg-surface-subtle border border-border-subtle">
              <span className="text-text-muted text-[10px] uppercase">Vessel Class</span>
              <div className="font-medium text-text-main mt-0.5">{vessel.vesselType || 'Container Ship (ULCV)'}</div>
            </div>
            <div className="p-2.5 rounded bg-surface-subtle border border-border-subtle">
              <span className="text-text-muted text-[10px] uppercase">Flag & Call Sign</span>
              <div className="font-medium text-text-main mt-0.5">{vessel.flag} • {vessel.callSign || '3EFP7'}</div>
            </div>
            <div className="p-2.5 rounded bg-surface-subtle border border-border-subtle">
              <span className="text-text-muted text-[10px] uppercase">Length & Beam</span>
              <div className="font-medium text-text-main mt-0.5">{vessel.lengthMeters}m LOA</div>
            </div>
            <div className="p-2.5 rounded bg-surface-subtle border border-border-subtle">
              <span className="text-text-muted text-[10px] uppercase">Max Draught</span>
              <div className="font-medium text-text-main mt-0.5">{vessel.draughtMeters}m</div>
            </div>
            <div className="p-2.5 rounded bg-surface-subtle border border-border-subtle col-span-2">
              <span className="text-text-muted text-[10px] uppercase">Total Capacity</span>
              <div className="font-medium text-text-main mt-0.5">{vessel.teuCapacity.toLocaleString()} TEU nominal slots</div>
            </div>
          </div>
        </div>

        {/* Port Call & Schedule */}
        <div className="p-5 rounded-lg bg-surface border border-border-subtle shadow-[0_8px_30px_rgb(0,0,0,0.04)] space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-border-subtle">
            <h2 className="text-xs font-bold text-text-main uppercase tracking-wider flex items-center gap-2">
              <Compass className="w-4 h-4 text-sky-600" />
              Port Call & Schedule
            </h2>
            <button
              onClick={() => setIsEtaModalOpen(true)}
              className="text-xs font-medium text-sky-600 hover:text-sky-700 cursor-pointer"
            >
              Update ETA
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="p-2.5 rounded bg-surface-subtle border border-border-subtle">
              <span className="text-text-muted text-[10px] uppercase">Voyage Rotation</span>
              <div className="font-semibold text-text-main mt-0.5">{vessel.origin} → {vessel.destination}</div>
            </div>
            <div className="p-2.5 rounded bg-surface-subtle border border-border-subtle">
              <span className="text-text-muted text-[10px] uppercase">Current Status</span>
              <div className="mt-0.5"><StatusBadge status={vessel.status} /></div>
            </div>
            <div className="p-2.5 rounded bg-surface-subtle border border-border-subtle">
              <span className="text-text-muted text-[10px] uppercase">Estimated Arrival (ETA)</span>
              <div className="font-semibold text-sky-900 mt-0.5">{vessel.eta}</div>
            </div>
            <div className="p-2.5 rounded bg-surface-subtle border border-border-subtle">
              <span className="text-text-muted text-[10px] uppercase">Estimated Departure (ETD)</span>
              <div className="font-medium text-text-main mt-0.5">{vessel.etd}</div>
            </div>
            <div className="p-2.5 rounded bg-surface-subtle border border-border-subtle">
              <span className="text-text-muted text-[10px] uppercase">Assigned Berth</span>
              <div className="font-semibold font-mono text-text-main mt-0.5">{berthDisplay}</div>
            </div>
            <div className="p-2.5 rounded bg-surface-subtle border border-border-subtle">
              <span className="text-text-muted text-[10px] uppercase">Requested Berth</span>
              <div className="font-medium font-mono text-text-muted mt-0.5">{vessel.requestedBerth || 'B04'}</div>
            </div>
            <div className="p-2.5 rounded bg-surface-subtle border border-border-subtle col-span-2">
              <span className="text-text-muted text-[10px] uppercase">Expected Quayside Turnaround</span>
              <div className="font-medium text-text-main mt-0.5">
                {vessel.berthDurationHours || 24} hours total berth duration • {waitTime} hours anchorage wait
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 4. Turnaround Timeline Stepper */}
      <div className="p-5 rounded-lg bg-surface border border-border-subtle shadow-[0_8px_30px_rgb(0,0,0,0.04)] space-y-4">
        <h2 className="text-xs font-bold text-text-main uppercase tracking-wider flex items-center gap-2 border-b border-border-subtle pb-2">
          <Clock className="w-4 h-4 text-sky-600" />
          Turnaround Timeline & Milestone Progression
        </h2>

        <div className="relative pt-3 pb-2">
          {/* Stepper Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-6 gap-3 text-center">
            {[
              { title: '1. Arrival Notice', desc: 'Pilot window filed', status: 'completed' },
              { title: '2. Anchorage', desc: `${waitTime}h expected wait`, status: vessel.status === 'Arriving' ? 'current' : 'completed' },
              { title: '3. Berth Assignment', desc: `Assigned: ${berthDisplay}`, status: isOptimizationApplied ? 'completed' : 'completed' },
              { title: '4. Berthing', desc: 'Mooring & Tugs', status: vessel.status === 'Berthing' ? 'current' : 'scheduled' },
              { title: '5. Cargo Operations', desc: 'STS Crane Gangs', status: vessel.status === 'Loading' ? 'current' : 'scheduled' },
              { title: '6. Departure', desc: vessel.etd, status: 'scheduled' },
            ].map((step, idx) => (
              <div
                key={idx}
                className={`p-3 rounded-lg border text-xs flex flex-col items-center justify-between min-h-[90px] ${
                  step.status === 'completed'
                    ? 'bg-emerald-50/60 border-emerald-200 text-emerald-950'
                    : step.status === 'current'
                    ? 'bg-sky-50 border-sky-300 text-sky-950 ring-1 ring-sky-300'
                    : 'bg-surface-subtle/50 border-border-subtle text-text-muted'
                }`}
              >
                <div className="flex items-center justify-center w-6 h-6 rounded-full mb-1 text-[11px] font-bold">
                  {step.status === 'completed' ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  ) : step.status === 'current' ? (
                    <div className="w-3 h-3 rounded-full bg-sky-600 animate-ping" />
                  ) : (
                    <span className="text-text-caption font-mono">{idx + 1}</span>
                  )}
                </div>
                <div className="font-semibold text-[11px]">{step.title}</div>
                <div className="text-[10px] text-text-muted mt-0.5">{step.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 5. AI Turnaround Explanation Card */}
      <div className="bg-surface rounded-3xl border border-border-subtle shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-5 space-y-3">
        <div className="flex items-center justify-between border-b border-border-subtle pb-2">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-brand-teal" />
            <h2 className="text-xs font-bold text-text-main uppercase tracking-wider">
              Varunaa AI Turnaround Analysis
            </h2>
          </div>
          <span className="text-[11px] text-text-caption">Grounded in Live AIS & Telemetry</span>
        </div>

        {isOceanStar ? (
          isOptimizationApplied ? (
            <div className="p-4 rounded-lg bg-emerald-50/70 border border-emerald-200 space-y-2">
              <div className="flex items-center gap-2 text-emerald-950 font-semibold text-xs">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Berth Optimization Confirmed: Reallocated to Berth B02</span>
              </div>
              <p className="text-xs text-text-main leading-relaxed">
                Port Operations executed a quayside rebalance. MV Ocean Star was reassigned from congested Berth B04 to <strong>Berth B02</strong> with <strong>4 STS Cranes</strong>. Projected turnaround wait reduced from <strong>11.4 hours to 6.8 hours</strong>, averting an estimated <strong>$148,000</strong> in demurrage exposure.
              </p>
            </div>
          ) : (
            <div className="p-4 rounded-lg bg-rose-50/70 border border-rose-200 space-y-2">
              <div className="flex items-center gap-2 text-rose-950 font-semibold text-xs">
                <AlertTriangle className="w-4 h-4 text-rose-600" />
                <span>Bottleneck Advisory for Requested Berth B04</span>
              </div>
              <p className="text-xs text-text-main leading-relaxed">
                MV Ocean Star is projected to encounter an extended wait of <strong>11.4 hours</strong> if berthed at requested B04, owing to STS C03 electrical drive maintenance and concurrent arrivals. The port authority has generated an optimization recommendation to divert to Berth B02.
              </p>
            </div>
          )
        ) : (
          <div className="p-4 rounded-lg bg-surface-subtle border border-border-subtle space-y-2">
            <div className="flex items-center gap-2 text-text-main font-semibold text-xs">
              <CheckCircle2 className="w-4 h-4 text-brand-teal" />
              <span>Normal Operational Turnaround Schedule</span>
            </div>
            <p className="text-xs text-text-muted leading-relaxed">
              {vessel.name} is proceeding on schedule with nominal pilotage boarding windows. Quayside crane gang allocations at {berthDisplay} are confirmed with standard cargo discharge throughput of ~28 moves/hour.
            </p>
          </div>
        )}
      </div>

      {/* ================================================= */}
      {/* MODAL 1: UPDATE ETA */}
      {/* ================================================= */}
      {isEtaModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-surface rounded-xl border border-border-subtle shadow-modal max-w-md w-full p-5 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-border-subtle">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-sky-600" />
                <h3 className="text-sm font-semibold text-text-main">Update Vessel ETA</h3>
              </div>
              <button
                onClick={() => setIsEtaModalOpen(false)}
                className="p-1 rounded-xl text-text-caption hover:text-text-main cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleEtaSubmit} className="space-y-3 text-xs">
              <div>
                <label className="text-text-muted">Current ETA</label>
                <div className="p-2 rounded bg-surface-subtle border border-border-subtle font-mono text-text-main mt-1">
                  {vessel.eta}
                </div>
              </div>

              <div>
                <label className="font-semibold text-text-main">New ETA (Estimated Time of Arrival)</label>
                <input
                  type="text"
                  placeholder="e.g. Today, 21:00 UTC"
                  value={newEta}
                  onChange={e => setNewEta(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-surface-subtle border border-border-subtle text-text-main text-xs focus:outline-hidden focus:border-sky-500 mt-1"
                  required
                />
              </div>

              <div>
                <label className="font-semibold text-text-main">Reason for Schedule Adjustment</label>
                <select
                  value={etaReason}
                  onChange={e => setEtaReason(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-surface-subtle border border-border-subtle text-text-main text-xs focus:outline-hidden focus:border-sky-500 mt-1"
                >
                  <option value="Weather & Heavy Seas">Adverse Weather / Squalls</option>
                  <option value="Mechanical / Propulsion Issue">Engine / Technical Inspection</option>
                  <option value="Previous Port Delay">Delay at Prior Port Call</option>
                  <option value="Cargo Stowing Delay">Cargo Restow Delay</option>
                  <option value="Pilotage / Fairway Window">Pilotage / Navigation Window Adjustment</option>
                  <option value="Other">Other Operational Reason</option>
                </select>
              </div>

              <div className="p-3 rounded bg-amber-50/70 border border-amber-200 text-amber-900 text-[11px] leading-relaxed">
                Notice: Updating this ETA will notify Port Operations watchtower and recalculate downstream berthing forecast curves.
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-border-subtle">
                <button
                  type="button"
                  onClick={() => setIsEtaModalOpen(false)}
                  className="px-3 py-1.5 rounded-xl bg-surface hover:bg-surface-subtle border border-border-subtle text-text-main cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-semibold cursor-pointer shadow-[0_8px_30px_rgb(0,0,0,0.04)]"
                >
                  Submit Updated ETA
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================================================= */}
      {/* MODAL 2: EDIT VESSEL */}
      {/* ================================================= */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-surface rounded-xl border border-border-subtle shadow-modal max-w-md w-full p-5 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-border-subtle">
              <div className="flex items-center gap-2">
                <Edit2 className="w-4 h-4 text-sky-600" />
                <h3 className="text-sm font-semibold text-text-main">Edit Vessel Record</h3>
              </div>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="p-1 rounded-xl text-text-caption hover:text-text-main cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-text-main">Vessel Name</label>
                <input
                  type="text"
                  value={editForm.name}
                  onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-surface-subtle border border-border-subtle text-text-main text-xs focus:outline-hidden focus:border-sky-500 mt-1"
                  required
                />
              </div>

              <div>
                <label className="font-semibold text-text-main">Voyage Number</label>
                <input
                  type="text"
                  value={editForm.voyageNumber}
                  onChange={e => setEditForm({ ...editForm, voyageNumber: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-surface-subtle border border-border-subtle text-text-main text-xs font-mono uppercase focus:outline-hidden focus:border-sky-500 mt-1"
                />
              </div>

              <div>
                <label className="font-semibold text-text-main">Shipping Agency / Owner</label>
                <input
                  type="text"
                  value={editForm.shippingCompany}
                  onChange={e => setEditForm({ ...editForm, shippingCompany: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-surface-subtle border border-border-subtle text-text-main text-xs focus:outline-hidden focus:border-sky-500 mt-1"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-text-main">Flag</label>
                  <input
                    type="text"
                    value={editForm.flag}
                    onChange={e => setEditForm({ ...editForm, flag: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-surface-subtle border border-border-subtle text-text-main text-xs focus:outline-hidden focus:border-sky-500 mt-1"
                  />
                </div>
                <div>
                  <label className="font-semibold text-text-main">Call Sign</label>
                  <input
                    type="text"
                    value={editForm.callSign}
                    onChange={e => setEditForm({ ...editForm, callSign: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-surface-subtle border border-border-subtle text-text-main text-xs font-mono uppercase focus:outline-hidden focus:border-sky-500 mt-1"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-text-main">Next Destination Port</label>
                <input
                  type="text"
                  value={editForm.destination}
                  onChange={e => setEditForm({ ...editForm, destination: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-surface-subtle border border-border-subtle text-text-main text-xs focus:outline-hidden focus:border-sky-500 mt-1"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-border-subtle">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-3 py-1.5 rounded-xl bg-surface hover:bg-surface-subtle border border-border-subtle text-text-main cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-semibold cursor-pointer shadow-[0_8px_30px_rgb(0,0,0,0.04)]"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================================================= */}
      {/* MODAL 3: CONTACT PORT OPERATIONS */}
      {/* ================================================= */}
      {isContactModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-surface rounded-xl border border-border-subtle shadow-modal max-w-md w-full p-5 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-border-subtle">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-sky-600" />
                <h3 className="text-sm font-semibold text-text-main">Contact Port Watchtower</h3>
              </div>
              <button
                onClick={() => setIsContactModalOpen(false)}
                className="p-1 rounded-xl text-text-caption hover:text-text-main cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleContactSubmit} className="space-y-3 text-xs">
              <div className="p-2 rounded bg-surface-subtle border border-border-subtle">
                <span className="text-text-muted">Target Entity:</span>
                <span className="font-semibold text-text-main ml-1.5">{vessel.name} (Berth {berthDisplay})</span>
              </div>

              <div>
                <label className="font-semibold text-text-main">Dispatch Priority</label>
                <select className="w-full px-3 py-2 rounded-xl bg-surface-subtle border border-border-subtle text-text-main text-xs focus:outline-hidden focus:border-sky-500 mt-1">
                  <option value="Urgent">Urgent — Quayside Action Requested</option>
                  <option value="Standard">Standard Operational Inquiry</option>
                  <option value="Customs">Customs / Regulatory Clearance Inquiry</option>
                </select>
              </div>

              <div>
                <label className="font-semibold text-text-main">Message to Terminal Supervisor</label>
                <textarea
                  rows={3}
                  placeholder="Type your message regarding tug availability, bunkering, or crane allocations..."
                  value={contactMessage}
                  onChange={e => setContactMessage(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-surface-subtle border border-border-subtle text-text-main text-xs focus:outline-hidden focus:border-sky-500 mt-1 resize-none"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-border-subtle">
                <button
                  type="button"
                  onClick={() => setIsContactModalOpen(false)}
                  className="px-3 py-1.5 rounded-xl bg-surface hover:bg-surface-subtle border border-border-subtle text-text-main cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-semibold cursor-pointer shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex items-center gap-1.5"
                >
                  <Send className="w-3 h-3" />
                  <span>Send Notice</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

