import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Ship,
  ArrowLeft,
  Anchor,
  Compass,
  Layers,
  CheckCircle2,
  AlertCircle,
  Sparkles,
} from 'lucide-react';
import { useOperations } from '../../context/OperationsContext';
import { useAuth } from '../../context/AuthContext';
import { EtdEstimator } from '../../services/etdEstimator';

export const ShippingAddVesselPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { addVessel, berths } = useOperations();

  // Form State
  const [formData, setFormData] = useState({
    // Section 1: Vessel Information
    name: '',
    imo: '',
    vesselType: 'Container Ship (ULCV)',
    flag: 'Panama',
    callSign: '',
    shippingCompany: 'Apex Maritime Agency',
    lengthMeters: '366',
    draughtMeters: '15.2',
    teuCapacity: '15000',

    // Section 2: Voyage Information
    voyageNumber: '',
    origin: 'Singapore (SGSIN)',
    destination: 'Rotterdam (NLRTM)',
    previousPort: 'Port Klang (MYPKG)',
    nextPort: 'Hamburg (DEHAM)',
    eta: '',
    etd: '',

    // Section 3: Port Call Information
    requestedArrivalTime: '',
    berthDurationHours: '24',
    cargoOperationType: 'Discharge & Load',
    requestedBerth: 'B02',
    requestedCranes: '3',
    specialHandling: '',

    // Section 4: Cargo Information
    cargoType: 'General Manufactured Goods & Containers',
    cargoQuantity: '1,200 TEU',
    containersTotal: '1200',
    dangerousGoods: false,
    specialNotes: '',
  });

  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  // Auto-estimate departure using operational variables if ETD is not provided
  const autoEstimate = useMemo(() => {
    if (!formData.eta.trim()) return null;
    const targetBerth = berths.find(b => b.id === formData.requestedBerth);
    return EtdEstimator.estimateDeparture({
      eta: formData.eta.trim(),
      containerVolume: Number(formData.containersTotal) || 1200,
      assignedBerth: formData.requestedBerth || 'B02',
      berthUtilization: targetBerth?.currentUtilization || 65,
      queueCount: targetBerth?.queueCount || 1,
      cranesCount: Number(formData.requestedCranes) || 3,
      craneMovesPerHour: 30,
      weatherSeverity: 'Calm',
      historicalTurnaroundHours: Number(formData.berthDurationHours) || 22,
    });
  }, [formData.eta, formData.containersTotal, formData.requestedBerth, formData.requestedCranes, formData.berthDurationHours, berths]);

  const validate = () => {
    const errs: { [key: string]: string } = {};
    if (!formData.name.trim()) errs.name = 'Vessel name is required';
    if (!formData.imo.trim()) {
      errs.imo = 'IMO number is required';
    } else if (!/^\d{7}$/.test(formData.imo.trim())) {
      errs.imo = 'IMO must be a valid 7-digit number';
    }
    if (!formData.eta.trim()) errs.eta = 'Estimated Time of Arrival (ETA) is required';
    // ETD is an optional operational input: estimated automatically by the system if omitted.

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSave = (andContinue = false) => {
    if (!validate()) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    const hasUserEtd = Boolean(formData.etd && formData.etd.trim());
    const finalEtd = hasUserEtd 
      ? formData.etd.trim() 
      : (autoEstimate?.estimatedEtd || '+2 Days, 18:00 UTC (Est.)');

    const newVessel = addVessel({
      name: formData.name.trim(),
      imo: formData.imo.trim(),
      flag: formData.flag,
      lengthMeters: Number(formData.lengthMeters) || 350,
      draughtMeters: Number(formData.draughtMeters) || 14.5,
      teuCapacity: Number(formData.teuCapacity) || 14000,
      cargoVolume: Number(formData.containersTotal) || 8000,
      origin: formData.origin || 'Singapore (SGSIN)',
      destination: formData.destination || 'Rotterdam (NLRTM)',
      eta: formData.eta,
      etd: finalEtd,
      estimatedEtd: autoEstimate?.estimatedEtd,
      isEstimatedEtd: !hasUserEtd,
      etdRationale: !hasUserEtd ? autoEstimate?.rationale : undefined,
      status: 'Arriving',
      priority: 'Standard',
      currentBerth: null,
      assignedBerth: formData.requestedBerth || 'B02',
      predictedWaitHours: autoEstimate?.waitingHours || 3.2,
      demurrageRisk: 'Low',
      historicalTurnaroundHours: autoEstimate?.turnaroundHours || 22,
      recommendedAction: 'Registered by agent. Quayside berthing review in progress.',
      ownerId: user?.id || 'demo-agent',
      shippingCompany: formData.shippingCompany,
      callSign: formData.callSign || 'CALL-REG',
      vesselType: formData.vesselType,
      voyageNumber: formData.voyageNumber || `APX-${Date.now().toString().slice(-4)}`,
      previousPort: formData.previousPort,
      nextPort: formData.nextPort,
      requestedBerth: formData.requestedBerth,
      requestedArrivalTime: formData.requestedArrivalTime || formData.eta,
      berthDurationHours: Number(formData.berthDurationHours) || 24,
      requestedCranes: Number(formData.requestedCranes) || 3,
      cargoType: formData.cargoType,
      cargoQuantity: formData.cargoQuantity,
      containersLoaded: 0,
      containersTotal: Number(formData.containersTotal) || 1200,
      dangerousGoods: formData.dangerousGoods,
      specialNotes: formData.specialNotes,
    });

    if (andContinue) {
      navigate(`/shipping/vessels/${newVessel.id}`);
    } else {
      navigate('/shipping/vessels');
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12 min-w-0">
      {/* Back Button & Header */}
      <div>
        <button
          onClick={() => navigate('/shipping/vessels')}
          className="inline-flex items-center gap-1.5 text-xs text-text-muted hover:text-text-main transition-colors mb-2 cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to My Vessels</span>
        </button>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-text-main">
              Register New Vessel Call
            </h1>
            <p className="text-xs text-text-muted mt-1">
              File vessel specifications, voyage routing, and port call requirements with PortsPilot.
            </p>
          </div>
        </div>
      </div>

      {/* Validation Error Banner */}
      {Object.keys(errors).length > 0 && (
        <div className="p-3.5 rounded-lg bg-rose-50 border border-rose-200 flex items-start gap-2.5 text-rose-800 text-xs">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold">Please correct the highlighted fields:</span>
            <ul className="list-disc list-inside mt-1 text-[11px] space-y-0.5">
              {Object.values(errors).map((err, idx) => (
                <li key={idx}>{err}</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Form Container */}
      <div className="space-y-6">
        {/* Section 1: Vessel Information */}
        <div className="p-5 rounded-lg bg-surface border border-border-subtle shadow-[0_8px_30px_rgb(0,0,0,0.04)] space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-border-subtle">
            <div className="flex items-center gap-2">
              <Ship className="w-4 h-4 text-sky-600" />
              <h2 className="text-sm font-semibold text-text-main">1. Vessel Information</h2>
            </div>
            <span className="text-[10px] text-text-caption font-medium">Core Ship Specifications</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div className="space-y-1 sm:col-span-2">
              <label className="font-medium text-text-main flex items-center justify-between">
                <span>Vessel Name</span>
                <span className="text-[10px] text-rose-600 font-semibold bg-rose-50 px-1.5 py-0.2 rounded border border-rose-200">Required</span>
              </label>
              <input
                type="text"
                placeholder="e.g. Pacific Pioneer"
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                className={`w-full px-3 py-2 rounded-xl bg-surface-subtle border text-text-main text-xs focus:outline-hidden focus:border-sky-500 transition-colors ${
                  errors.name ? 'border-rose-400 bg-rose-50/30' : 'border-border-subtle'
                }`}
              />
              {errors.name && <p className="text-[10px] text-rose-600">{errors.name}</p>}
            </div>

            <div className="space-y-1">
              <label className="font-medium text-text-main flex items-center justify-between">
                <span>IMO Number</span>
                <span className="text-[10px] text-rose-600 font-semibold bg-rose-50 px-1.5 py-0.2 rounded border border-rose-200">Required</span>
              </label>
              <input
                type="text"
                maxLength={7}
                placeholder="7 digits e.g. 9845214"
                value={formData.imo}
                onChange={e => setFormData({ ...formData, imo: e.target.value.replace(/\D/g, '') })}
                className={`w-full px-3 py-2 rounded-xl bg-surface-subtle border text-text-main text-xs font-mono focus:outline-hidden focus:border-sky-500 transition-colors ${
                  errors.imo ? 'border-rose-400 bg-rose-50/30' : 'border-border-subtle'
                }`}
              />
              {errors.imo && <p className="text-[10px] text-rose-600">{errors.imo}</p>}
            </div>

            <div className="space-y-1">
              <label className="font-medium text-text-main flex items-center justify-between">
                <span>Vessel Type</span>
                <span className="text-[10px] text-text-caption">Optional</span>
              </label>
              <select
                value={formData.vesselType}
                onChange={e => setFormData({ ...formData, vesselType: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-surface-subtle border border-border-subtle text-text-main text-xs focus:outline-hidden focus:border-sky-500"
              >
                <option value="Container Ship (ULCV)">Container Ship (ULCV)</option>
                <option value="Container Ship (Neo-Panamax)">Container Ship (Neo-Panamax)</option>
                <option value="Container Ship (Feedermax)">Container Ship (Feedermax)</option>
                <option value="Bulk Carrier">Bulk Carrier</option>
                <option value="General Cargo">General Cargo</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="font-medium text-text-main flex items-center justify-between">
                <span>Flag State</span>
                <span className="text-[10px] text-text-caption">Optional</span>
              </label>
              <input
                type="text"
                placeholder="e.g. Panama"
                value={formData.flag}
                onChange={e => setFormData({ ...formData, flag: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-surface-subtle border border-border-subtle text-text-main text-xs focus:outline-hidden focus:border-sky-500"
              >
              </input>
            </div>

            <div className="space-y-1">
              <label className="font-medium text-text-main flex items-center justify-between">
                <span>Call Sign</span>
                <span className="text-[10px] text-text-caption">Optional</span>
              </label>
              <input
                type="text"
                placeholder="e.g. 3EFP7"
                value={formData.callSign}
                onChange={e => setFormData({ ...formData, callSign: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-surface-subtle border border-border-subtle text-text-main text-xs font-mono uppercase focus:outline-hidden focus:border-sky-500"
              />
            </div>

            <div className="space-y-1">
              <label className="font-medium text-text-main flex items-center justify-between">
                <span>Shipping Company</span>
                <span className="text-[10px] text-text-caption">Optional</span>
              </label>
              <input
                type="text"
                value={formData.shippingCompany}
                onChange={e => setFormData({ ...formData, shippingCompany: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-surface-subtle border border-border-subtle text-text-main text-xs focus:outline-hidden focus:border-sky-500"
              />
            </div>

            <div className="space-y-1">
              <label className="font-medium text-text-main flex items-center justify-between">
                <span>Length (Meters)</span>
                <span className="text-[10px] text-text-caption">Optional</span>
              </label>
              <input
                type="number"
                placeholder="366"
                value={formData.lengthMeters}
                onChange={e => setFormData({ ...formData, lengthMeters: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-surface-subtle border border-border-subtle text-text-main text-xs focus:outline-hidden focus:border-sky-500"
              />
            </div>

            <div className="space-y-1">
              <label className="font-medium text-text-main flex items-center justify-between">
                <span>Draft (Meters)</span>
                <span className="text-[10px] text-text-caption">Optional</span>
              </label>
              <input
                type="number"
                step="0.1"
                placeholder="15.2"
                value={formData.draughtMeters}
                onChange={e => setFormData({ ...formData, draughtMeters: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-surface-subtle border border-border-subtle text-text-main text-xs focus:outline-hidden focus:border-sky-500"
              />
            </div>

            <div className="space-y-1">
              <label className="font-medium text-text-main flex items-center justify-between">
                <span>Capacity (TEU)</span>
                <span className="text-[10px] text-text-caption">Optional</span>
              </label>
              <input
                type="number"
                placeholder="15000"
                value={formData.teuCapacity}
                onChange={e => setFormData({ ...formData, teuCapacity: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-surface-subtle border border-border-subtle text-text-main text-xs focus:outline-hidden focus:border-sky-500"
              />
            </div>
          </div>
        </div>

        {/* Section 2: Voyage Information */}
        <div className="p-5 rounded-lg bg-surface border border-border-subtle shadow-[0_8px_30px_rgb(0,0,0,0.04)] space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-border-subtle">
            <div className="flex items-center gap-2">
              <Compass className="w-4 h-4 text-sky-600" />
              <h2 className="text-sm font-semibold text-text-main">2. Voyage Information</h2>
            </div>
            <span className="text-[10px] text-text-caption font-medium">Routing & Port Rotation</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div className="space-y-1">
              <label className="font-medium text-text-main flex items-center justify-between">
                <span>Voyage Number</span>
                <span className="text-[10px] text-text-caption">Optional</span>
              </label>
              <input
                type="text"
                placeholder="e.g. APX-2026-10W"
                value={formData.voyageNumber}
                onChange={e => setFormData({ ...formData, voyageNumber: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-surface-subtle border border-border-subtle text-text-main text-xs font-mono uppercase focus:outline-hidden focus:border-sky-500"
              />
            </div>

            <div className="space-y-1">
              <label className="font-medium text-text-main flex items-center justify-between">
                <span>Origin Port</span>
                <span className="text-[10px] text-text-caption">Optional</span>
              </label>
              <input
                type="text"
                placeholder="e.g. Singapore (SGSIN)"
                value={formData.origin}
                onChange={e => setFormData({ ...formData, origin: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-surface-subtle border border-border-subtle text-text-main text-xs focus:outline-hidden focus:border-sky-500"
              />
            </div>

            <div className="space-y-1">
              <label className="font-medium text-text-main flex items-center justify-between">
                <span>Destination Port</span>
                <span className="text-[10px] text-text-caption">Optional</span>
              </label>
              <input
                type="text"
                placeholder="e.g. Rotterdam (NLRTM)"
                value={formData.destination}
                onChange={e => setFormData({ ...formData, destination: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-surface-subtle border border-border-subtle text-text-main text-xs focus:outline-hidden focus:border-sky-500"
              />
            </div>

            <div className="space-y-1">
              <label className="font-medium text-text-main flex items-center justify-between">
                <span>Previous Port Call</span>
                <span className="text-[10px] text-text-caption">Optional</span>
              </label>
              <input
                type="text"
                placeholder="e.g. Port Klang (MYPKG)"
                value={formData.previousPort}
                onChange={e => setFormData({ ...formData, previousPort: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-surface-subtle border border-border-subtle text-text-main text-xs focus:outline-hidden focus:border-sky-500"
              />
            </div>

            <div className="space-y-1">
              <label className="font-medium text-text-main flex items-center justify-between">
                <span>Next Port Call</span>
                <span className="text-[10px] text-text-caption">Optional</span>
              </label>
              <input
                type="text"
                placeholder="e.g. Hamburg (DEHAM)"
                value={formData.nextPort}
                onChange={e => setFormData({ ...formData, nextPort: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-surface-subtle border border-border-subtle text-text-main text-xs focus:outline-hidden focus:border-sky-500"
              />
            </div>

            <div className="space-y-1">
              <label className="font-medium text-text-main flex items-center justify-between">
                <span>ETA (Estimated Arrival)</span>
                <span className="text-[10px] text-rose-600 font-semibold bg-rose-50 px-1.5 py-0.2 rounded border border-rose-200">Required</span>
              </label>
              <input
                type="text"
                placeholder="e.g. Tomorrow, 16:30 UTC"
                value={formData.eta}
                onChange={e => setFormData({ ...formData, eta: e.target.value })}
                className={`w-full px-3 py-2 rounded-xl bg-surface-subtle border text-text-main text-xs focus:outline-hidden focus:border-sky-500 ${
                  errors.eta ? 'border-rose-400 bg-rose-50/30' : 'border-border-subtle'
                }`}
              />
              {errors.eta && <p className="text-[10px] text-rose-600">{errors.eta}</p>}
            </div>

            <div className="space-y-1">
              <label className="font-medium text-text-main flex items-center justify-between">
                <span>ETD (Estimated Departure)</span>
                <span className="text-[10px] text-teal-800 font-semibold bg-teal-50 px-1.5 py-0.5 rounded border border-teal-200">
                  Optional • Auto-Calculated
                </span>
              </label>
              <input
                type="text"
                placeholder={autoEstimate ? `Auto: ${autoEstimate.estimatedEtd}` : "e.g. +2 Days, 18:00 UTC (or leave blank)"}
                value={formData.etd}
                onChange={e => setFormData({ ...formData, etd: e.target.value })}
                className={`w-full px-3 py-2 rounded-xl bg-surface-subtle border text-text-main text-xs focus:outline-hidden focus:border-sky-500 ${
                  errors.etd ? 'border-rose-400 bg-rose-50/30' : 'border-border-subtle'
                }`}
              />
              {autoEstimate && (
                <div className="mt-1.5 p-2.5 rounded-xl bg-teal-50/60 border border-teal-200/80 text-[11px] text-teal-950 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-teal-900 flex items-center gap-1">
                      <Sparkles className="w-3.5 h-3.5 text-brand-teal" />
                      <span>System Est. ETD: {autoEstimate.estimatedEtd}</span>
                    </span>
                    {!formData.etd ? (
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, etd: autoEstimate.estimatedEtd })}
                        className="text-[10px] text-teal-800 hover:text-teal-950 font-bold underline cursor-pointer"
                      >
                        Apply to Input
                      </button>
                    ) : (
                      <span className="text-[10px] text-teal-800 bg-teal-100/60 px-1.5 py-0.2 rounded font-medium">
                        Custom override active
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-text-muted leading-tight">
                    {autoEstimate.rationale}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Section 3: Port Call Information */}
        <div className="p-5 rounded-lg bg-surface border border-border-subtle shadow-[0_8px_30px_rgb(0,0,0,0.04)] space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-border-subtle">
            <div className="flex items-center gap-2">
              <Anchor className="w-4 h-4 text-sky-600" />
              <h2 className="text-sm font-semibold text-text-main">3. Port Call Requirements</h2>
            </div>
            <span className="text-[10px] text-text-caption font-medium">Berthing Preferences</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div className="space-y-1">
              <label className="font-medium text-text-main flex items-center justify-between">
                <span>Preferred Berth</span>
                <span className="text-[10px] text-text-caption">Optional</span>
              </label>
              <select
                value={formData.requestedBerth}
                onChange={e => setFormData({ ...formData, requestedBerth: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-surface-subtle border border-border-subtle text-text-main text-xs focus:outline-hidden focus:border-sky-500"
              >
                {berths.map(b => (
                  <option key={b.id} value={b.id}>
                    {b.id} ({b.name}) - Depth {b.depthMeters}m
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="font-medium text-text-main flex items-center justify-between">
                <span>Estimated Berth Duration (Hours)</span>
                <span className="text-[10px] text-text-caption">Optional</span>
              </label>
              <input
                type="number"
                placeholder="24"
                value={formData.berthDurationHours}
                onChange={e => setFormData({ ...formData, berthDurationHours: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-surface-subtle border border-border-subtle text-text-main text-xs focus:outline-hidden focus:border-sky-500"
              />
            </div>

            <div className="space-y-1">
              <label className="font-medium text-text-main flex items-center justify-between">
                <span>Cranes Requested</span>
                <span className="text-[10px] text-text-caption">Optional</span>
              </label>
              <select
                value={formData.requestedCranes}
                onChange={e => setFormData({ ...formData, requestedCranes: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-surface-subtle border border-border-subtle text-text-main text-xs focus:outline-hidden focus:border-sky-500"
              >
                <option value="1">1 STS Crane</option>
                <option value="2">2 STS Cranes</option>
                <option value="3">3 STS Cranes</option>
                <option value="4">4 STS Cranes</option>
                <option value="5">5 STS Cranes (Priority)</option>
              </select>
            </div>

            <div className="space-y-1 sm:col-span-3">
              <label className="font-medium text-text-main flex items-center justify-between">
                <span>Special Handling & Mooring Requirements</span>
                <span className="text-[10px] text-text-caption">Optional</span>
              </label>
              <input
                type="text"
                placeholder="e.g. Tug escort required at channel fairway, shore power cold-ironing hookup"
                value={formData.specialHandling}
                onChange={e => setFormData({ ...formData, specialHandling: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-surface-subtle border border-border-subtle text-text-main text-xs focus:outline-hidden focus:border-sky-500"
              />
            </div>
          </div>
        </div>

        {/* Section 4: Cargo Information */}
        <div className="p-5 rounded-lg bg-surface border border-border-subtle shadow-[0_8px_30px_rgb(0,0,0,0.04)] space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-border-subtle">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-sky-600" />
              <h2 className="text-sm font-semibold text-text-main">4. Cargo Information</h2>
            </div>
            <span className="text-[10px] text-text-caption font-medium">Manifest & Safety Attributes</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div className="space-y-1 sm:col-span-2">
              <label className="font-medium text-text-main flex items-center justify-between">
                <span>Cargo Description / Category</span>
                <span className="text-[10px] text-text-caption">Optional</span>
              </label>
              <input
                type="text"
                placeholder="e.g. Consumer Electronics, Machinery, Reefers"
                value={formData.cargoType}
                onChange={e => setFormData({ ...formData, cargoType: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-surface-subtle border border-border-subtle text-text-main text-xs focus:outline-hidden focus:border-sky-500"
              />
            </div>

            <div className="space-y-1">
              <label className="font-medium text-text-main flex items-center justify-between">
                <span>Container Count (TEU)</span>
                <span className="text-[10px] text-text-caption">Optional</span>
              </label>
              <input
                type="number"
                placeholder="1200"
                value={formData.containersTotal}
                onChange={e => setFormData({ ...formData, containersTotal: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-surface-subtle border border-border-subtle text-text-main text-xs focus:outline-hidden focus:border-sky-500"
              />
            </div>

            <div className="space-y-1 sm:col-span-3">
              <label className="flex items-center gap-2 p-3 rounded-xl bg-surface-subtle border border-border-subtle cursor-pointer hover:border-border-muted transition-colors">
                <input
                  type="checkbox"
                  checked={formData.dangerousGoods}
                  onChange={e => setFormData({ ...formData, dangerousGoods: e.target.checked })}
                  className="rounded text-sky-600 focus:ring-sky-500 h-4 w-4"
                />
                <div>
                  <div className="font-medium text-text-main">Dangerous Goods (IMDG Code) Onboard</div>
                  <div className="text-[11px] text-text-muted">
                    Check if vessel carries Class 1-9 hazardous containers requiring designated yard segregation.
                  </div>
                </div>
              </label>
            </div>

            <div className="space-y-1 sm:col-span-3">
              <label className="font-medium text-text-main flex items-center justify-between">
                <span>Special Cargo Notes</span>
                <span className="text-[10px] text-text-caption">Optional</span>
              </label>
              <textarea
                rows={2}
                placeholder="Additional notes for terminal supervisor..."
                value={formData.specialNotes}
                onChange={e => setFormData({ ...formData, specialNotes: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-surface-subtle border border-border-subtle text-text-main text-xs focus:outline-hidden focus:border-sky-500 resize-none"
              />
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-4 border-t border-border-subtle flex-wrap gap-3">
          <button
            type="button"
            onClick={() => navigate('/shipping/vessels')}
            className="px-4 py-2 rounded-xl bg-surface hover:bg-surface-subtle border border-border-subtle text-xs font-medium text-text-main transition-colors cursor-pointer"
          >
            Cancel
          </button>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => handleSave(false)}
              className="px-4 py-2 rounded-xl bg-surface-subtle hover:bg-slate-200 border border-border-subtle text-xs font-semibold text-text-main transition-colors cursor-pointer"
            >
              Save Vessel
            </button>
            <button
              type="button"
              onClick={() => handleSave(true)}
              className="px-5 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-xs font-semibold text-white transition-all shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex items-center gap-1.5 cursor-pointer"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Save & Continue</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
