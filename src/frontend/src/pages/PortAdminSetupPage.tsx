import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Settings, Anchor, Zap, Database, ArrowRight, ShieldCheck } from 'lucide-react';
import { motion } from 'framer-motion';

export const PortAdminSetupPage: React.FC = () => {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form states
  const [portName, setPortName] = useState('Alpha Terminal Hub');
  const [portLocation, setPortLocation] = useState('Rotterdam, NL');
  const [nasdfModel, setNasdfModel] = useState('NASDF-V2-Premium');
  const [confidenceThreshold, setConfidenceThreshold] = useState('85');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    // Simulate API call for configuration save
    setTimeout(() => {
      setIsSubmitting(false);
      navigate('/dashboard', { replace: true });
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-canvas flex flex-col relative overflow-hidden">
      {/* Background Ambience */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[90vw] max-w-[800px] h-[35vh] max-h-[350px] bg-gradient-to-b from-teal-500/10 via-blue-500/5 to-transparent blur-3xl pointer-events-none" />

      {/* Header */}
      <header className="w-full max-w-4xl mx-auto px-6 py-5 flex items-center justify-between shrink-0 relative z-10">
        <div className="flex items-center gap-2.5 group">
          <div className="w-9 h-9 rounded-xl bg-brand-teal flex items-center justify-center shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
            <Anchor className="w-4 h-4 text-white" />
          </div>
          <span className="text-xl font-bold tracking-tight text-text-main">Varunaa Setup</span>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span className="text-xs font-semibold text-emerald-800">Admin Authenticated</span>
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 flex items-center justify-center px-4 py-8 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-xl bg-surface rounded-3xl border border-border-subtle shadow-modal overflow-hidden flex flex-col"
        >
          <div className="p-8 pb-6 border-b border-border-subtle bg-surface-subtle/50">
            <h1 className="text-2xl font-extrabold text-text-main tracking-tight">Configure Your Port Instance</h1>
            <p className="text-sm text-text-muted mt-2">
              Set up your terminal details and initialize the NASDF (Neural Allocation & Spatial Dispatch Framework) model parameters before entering the Command Center.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="p-8 space-y-6">
            
            {/* 1. Port Settings */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-border-subtle">
                <Settings className="w-4 h-4 text-brand-teal" />
                <h2 className="text-sm font-bold text-text-main">Terminal Configuration</h2>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-text-main mb-1.5">Port / Terminal Name</label>
                  <input
                    type="text"
                    required
                    value={portName}
                    onChange={e => setPortName(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-border-subtle bg-surface-subtle text-sm text-text-main focus:outline-none focus:ring-2 focus:ring-brand-teal/30 focus:border-brand-teal transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-text-main mb-1.5">Geographic Location</label>
                  <input
                    type="text"
                    required
                    value={portLocation}
                    onChange={e => setPortLocation(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-border-subtle bg-surface-subtle text-sm text-text-main focus:outline-none focus:ring-2 focus:ring-brand-teal/30 focus:border-brand-teal transition-all"
                  />
                </div>
              </div>
            </div>

            {/* 2. NASDF Model Settings */}
            <div className="space-y-4 pt-4">
              <div className="flex items-center gap-2 pb-2 border-b border-border-subtle">
                <Database className="w-4 h-4 text-brand-blue" />
                <h2 className="text-sm font-bold text-text-main">NASDF Model Initialization</h2>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-text-main mb-1.5">Predictive Model Version</label>
                  <select
                    value={nasdfModel}
                    onChange={e => setNasdfModel(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-border-subtle bg-surface-subtle text-sm text-text-main focus:outline-none focus:ring-2 focus:ring-brand-teal/30 focus:border-brand-teal transition-all"
                  >
                    <option value="NASDF-V1-Standard">NASDF V1 (Standard)</option>
                    <option value="NASDF-V2-Premium">NASDF V2 (Premium / High-Frequency)</option>
                    <option value="NASDF-V2-Ultra">NASDF V2 (Ultra / Deep-Reinforcement)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-text-main mb-1.5">Optimization Confidence Threshold</label>
                  <div className="relative">
                    <input
                      type="number"
                      min="50"
                      max="99"
                      value={confidenceThreshold}
                      onChange={e => setConfidenceThreshold(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl border border-border-subtle bg-surface-subtle text-sm text-text-main focus:outline-none focus:ring-2 focus:ring-brand-teal/30 focus:border-brand-teal transition-all pr-8"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-text-caption">%</span>
                  </div>
                </div>
              </div>
              <p className="text-[11px] text-text-caption leading-relaxed mt-1">
                The NASDF (Neural Allocation & Spatial Dispatch Framework) requires a minimum confidence score before auto-recommending berth reassignments. Higher thresholds mean fewer, but more certain, recommendations.
              </p>
            </div>

            {/* Action */}
            <div className="pt-6">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-bold text-sm text-white bg-brand-teal hover:bg-teal-600 transition-all shadow-[0_4px_12px_rgba(20,184,166,0.3)] hover:shadow-[0_6px_16px_rgba(20,184,166,0.4)] disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Initializing NASDF Core...</span>
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4" />
                    <span>Initialize Port & Enter Command Center</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </div>
  );
};
