import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  Save,
  ShieldCheck,
  Cpu,
  Sliders,
  User,
  Palette,
  Sun,
  Moon,
  Laptop,
  Check,
  Mail,
  KeyRound,
  Trash2,
  AlertTriangle,
  Lock,
  Edit3,
  ShieldAlert,
  ExternalLink,
  Eye,
  EyeOff,
} from 'lucide-react';
import { useOperations } from '../context/OperationsContext';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';

export const SettingsPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { showToast } = useOperations();
  const { theme, setTheme } = useTheme();
  const { user, updateEmail, updatePassword, updateProfile, deleteAccount } = useAuth();

  // Tab State: Check URL param or default to 'port'
  const initialTab = (searchParams.get('tab') as 'profile' | 'port' | 'ml' | 'ai' | 'appearance') || 
    (window.location.pathname.includes('/profile') ? 'profile' : 'port');
  const [activeTab, setActiveTab] = useState<'profile' | 'port' | 'ml' | 'ai' | 'appearance'>(initialTab);

  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam && ['profile', 'port', 'ml', 'ai', 'appearance'].includes(tabParam)) {
      setActiveTab(tabParam as any);
    } else if (window.location.pathname.includes('/profile')) {
      setActiveTab('profile');
    }
  }, [searchParams]);

  // Port Configuration State
  const [portName, setPortName] = useState('Port of Euro-Transshipment Gateway');
  const [berthCount, setBerthCount] = useState(6);
  const [warningThreshold, setWarningThreshold] = useState(85);
  const [lookaheadHorizon, setLookaheadHorizon] = useState('72h');
  const [aiAutonomy, setAiAutonomy] = useState('recommend_only');
  const [geminiModel, setGeminiModel] = useState(() => {
    try {
      return localStorage.getItem('gemini_model') || 'gemini-2.5-flash-lite';
    } catch {
      return 'gemini-2.5-flash-lite';
    }
  });
  const [geminiApiKey, setGeminiApiKey] = useState(() => {
    try {
      const meta = import.meta as { env?: Record<string, string> };
      return (
        localStorage.getItem('gemini_api_key') ||
        meta?.env?.VITE_GEMINI_API_KEY ||
        meta?.env?.GEMINI_API_KEY ||
        ''
      );
    } catch {
      return '';
    }
  });
  const [showApiKey, setShowApiKey] = useState(false);

  const handleSaveAiSettings = () => {
    const trimmed = geminiApiKey.trim();
    if (trimmed) {
      if (trimmed.length < 15 || trimmed.includes('your-')) {
        showToast('error', 'Invalid API Key', 'Please enter a valid Google Gemini API key.');
        return;
      }
      localStorage.setItem('gemini_api_key', trimmed);
      localStorage.setItem('gemini_model', geminiModel);
      showToast('success', 'AI Settings Saved', `Google Gemini reasoning (${geminiModel}) is now active.`);
    } else {
      localStorage.removeItem('gemini_api_key');
      showToast('info', 'AI Settings Saved', 'Reverted to Varunaa local operational intelligence.');
    }
  };

  // User Profile Form States
  const [profileName, setProfileName] = useState(user?.name || '');
  const [emailInput, setEmailInput] = useState(user?.email || '');
  const [isUpdatingEmail, setIsUpdatingEmail] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);

  // Delete Account Modal State
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteConfirmationText, setDeleteConfirmationText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (user) {
      setProfileName(user.name || '');
      setEmailInput(user.email || '');
    }
  }, [user]);

  const handleSavePortSettings = () => {
    showToast('success', 'Settings Saved', 'Operational parameters updated across all telemetry services.');
  };

  const handleSaveProfileName = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profileName.trim()) {
      showToast('error', 'Validation Error', 'Name cannot be empty.');
      return;
    }
    setIsUpdatingProfile(true);
    try {
      await updateProfile(profileName.trim());
      showToast('success', 'Profile Updated', 'Your profile display name has been saved.');
    } catch (err: any) {
      showToast('error', 'Update Failed', err.message || 'Failed to update profile name.');
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  const handleUpdateEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailInput.trim() || !emailInput.includes('@')) {
      showToast('error', 'Validation Error', 'Please enter a valid email address.');
      return;
    }
    setIsUpdatingEmail(true);
    try {
      await updateEmail(emailInput.trim());
      showToast('success', 'Email Address Updated', `Your account email address is now set to ${emailInput}.`);
    } catch (err: any) {
      showToast('error', 'Email Update Failed', err.message || 'Could not update email address.');
    } finally {
      setIsUpdatingEmail(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword || newPassword.length < 6) {
      showToast('error', 'Validation Error', 'Password must be at least 6 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      showToast('error', 'Validation Error', 'New password and confirmation do not match.');
      return;
    }
    setIsUpdatingPassword(true);
    try {
      await updatePassword(newPassword);
      setNewPassword('');
      setConfirmPassword('');
      showToast('success', 'Password Changed', 'Your account password has been successfully updated.');
    } catch (err: any) {
      showToast('error', 'Password Change Failed', err.message || 'Could not update password.');
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  const handleDeleteAccountConfirm = async () => {
    if (deleteConfirmationText.trim().toUpperCase() !== 'DELETE') {
      showToast('error', 'Confirmation Error', 'Please type DELETE to confirm account removal.');
      return;
    }
    setIsDeleting(true);
    try {
      await deleteAccount();
      showToast('info', 'Account Deleted', 'Your account has been permanently removed.');
      navigate('/', { replace: true });
    } catch (err: any) {
      showToast('error', 'Deletion Error', err.message || 'Failed to delete account.');
      setIsDeleting(false);
    }
  };

  const getUserInitials = () => {
    const name = user?.name || profileName || 'Capt. M. Vance';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-main tracking-tight">
            {activeTab === 'profile' ? 'Admin & User Profile Settings' : 'Port Configuration & System Settings'}
          </h1>
          <p className="text-sm text-text-muted mt-1">
            {activeTab === 'profile'
              ? 'Manage your account security, update email address, change password, or configure supervisor settings.'
              : 'Configure berth capacity limits, ML saturation thresholds, and Gemini operational copilot guardrails.'}
          </p>
        </div>

        {activeTab !== 'profile' && (
          <button
            onClick={handleSavePortSettings}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-brand-teal hover:bg-teal-700 transition-all shadow-[0_8px_30px_rgb(0,0,0,0.04)] cursor-pointer"
          >
            <Save className="w-3.5 h-3.5" />
            <span>Save Settings</span>
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-border-subtle pb-3">
        {[
          { id: 'profile', label: 'Admin & User Profile', icon: User },
          { id: 'port', label: 'Port Configuration', icon: Sliders },
          { id: 'ml', label: 'Prediction Thresholds', icon: Cpu },
          { id: 'ai', label: 'Copilot Settings', icon: ShieldCheck },
          { id: 'appearance', label: 'Appearance', icon: Palette },
        ].map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs transition-colors border cursor-pointer ${
                activeTab === tab.id
                  ? 'bg-surface text-text-main font-semibold border-brand-teal text-brand-teal shadow-[0_4px_12px_rgba(20,184,166,0.1)]'
                  : 'bg-surface-subtle text-text-muted hover:text-text-main border-border-subtle'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab Contents */}
      <div className="bg-surface rounded-3xl border border-border-subtle shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-6 space-y-6 text-xs">
        
        {/* ADMIN & USER PROFILE TAB */}
        {activeTab === 'profile' && (
          <div className="space-y-8">
            {/* Identity Card */}
            <div className="p-5 rounded-2xl bg-surface-subtle border border-border-subtle flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                {user?.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt={user.name}
                    className="w-16 h-16 rounded-full object-cover border-2 border-brand-teal shadow-md"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-full bg-brand-teal/10 border-2 border-brand-teal text-brand-teal flex items-center justify-center text-xl font-bold">
                    {getUserInitials()}
                  </div>
                )}
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-bold text-text-main">
                      {user?.name || 'Capt. M. Vance'}
                    </h2>
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                      <ShieldCheck className="w-3 h-3 text-emerald-600" />
                      {user?.role === 'admin' ? 'Port Operations Admin' : 'Shipping Agent'}
                    </span>
                  </div>
                  <p className="text-text-muted text-xs mt-0.5">{user?.email || 'admin@Varunaa.demo'}</p>
                  <div className="flex items-center gap-3 text-[11px] text-text-caption mt-1.5">
                    <span>Provider: <strong className="text-text-main font-semibold capitalize">{user?.authProvider || 'Demo Session'}</strong></span>
                    <span>•</span>
                    <span>Status: <strong className="text-emerald-600 font-semibold">Active & Authorized</strong></span>
                  </div>
                </div>
              </div>
            </div>

            {/* Form 1: Edit Profile Name */}
            <form onSubmit={handleSaveProfileName} className="space-y-3 max-w-xl p-5 rounded-2xl border border-border-subtle bg-surface">
              <div className="flex items-center gap-2 text-sm font-semibold text-text-main">
                <Edit3 className="w-4 h-4 text-brand-teal" />
                <span>Edit Full Name</span>
              </div>
              <p className="text-text-muted text-xs">
                Update your display name across Port Operations logs, Copilot conversations, and audit reports.
              </p>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={profileName}
                  onChange={e => setProfileName(e.target.value)}
                  placeholder="Enter full name"
                  className="flex-1 bg-surface-subtle border border-border-subtle rounded-xl px-3.5 py-2 text-text-main focus:outline-hidden focus:border-brand-teal text-xs"
                />
                <button
                  type="submit"
                  disabled={isUpdatingProfile}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-brand-teal hover:bg-teal-700 transition-all disabled:opacity-50 cursor-pointer"
                >
                  {isUpdatingProfile ? 'Saving...' : 'Save Name'}
                </button>
              </div>
            </form>

            {/* Form 2: Edit Email Option */}
            <form onSubmit={handleUpdateEmail} className="space-y-3 max-w-xl p-5 rounded-2xl border border-border-subtle bg-surface">
              <div className="flex items-center gap-2 text-sm font-semibold text-text-main">
                <Mail className="w-4 h-4 text-sky-600" />
                <span>Edit Email Address</span>
              </div>
              <p className="text-text-muted text-xs">
                Update your primary email address used for system notifications and login authentication.
              </p>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <div className="relative flex-1">
                  <Mail className="w-4 h-4 text-text-caption absolute left-3 top-2.5" />
                  <input
                    type="email"
                    value={emailInput}
                    onChange={e => setEmailInput(e.target.value)}
                    placeholder="new.email@Varunaa.com"
                    className="w-full bg-surface-subtle border border-border-subtle rounded-xl pl-9 pr-3 py-2 text-text-main focus:outline-hidden focus:border-sky-500 text-xs"
                  />
                </div>
                <button
                  type="submit"
                  disabled={isUpdatingEmail}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-sky-600 hover:bg-sky-700 transition-all disabled:opacity-50 cursor-pointer"
                >
                  {isUpdatingEmail ? 'Updating Email...' : 'Update Email'}
                </button>
              </div>
            </form>

            {/* Form 3: Change Password Option */}
            <form onSubmit={handleChangePassword} className="space-y-4 max-w-xl p-5 rounded-2xl border border-border-subtle bg-surface">
              <div className="flex items-center gap-2 text-sm font-semibold text-text-main">
                <KeyRound className="w-4 h-4 text-amber-600" />
                <span>Change Password</span>
              </div>
              <p className="text-text-muted text-xs">
                Set a strong password for your Varunaa administrative console account.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-text-muted block mb-1 font-medium">New Password</label>
                  <div className="relative">
                    <Lock className="w-3.5 h-3.5 text-text-caption absolute left-3 top-2.5" />
                    <input
                      type="password"
                      value={newPassword}
                      onChange={e => setNewPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full bg-surface-subtle border border-border-subtle rounded-xl pl-8 pr-3 py-2 text-text-main focus:outline-hidden focus:border-amber-500 text-xs"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-text-muted block mb-1 font-medium">Confirm New Password</label>
                  <div className="relative">
                    <Lock className="w-3.5 h-3.5 text-text-caption absolute left-3 top-2.5" />
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={e => setConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full bg-surface-subtle border border-border-subtle rounded-xl pl-8 pr-3 py-2 text-text-main focus:outline-hidden focus:border-amber-500 text-xs"
                    />
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={isUpdatingPassword}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 transition-all disabled:opacity-50 cursor-pointer"
              >
                {isUpdatingPassword ? 'Updating Password...' : 'Change Password'}
              </button>
            </form>

            {/* Danger Zone: Delete Account */}
            <div className="max-w-xl p-5 rounded-2xl border border-rose-200 bg-rose-50/20 space-y-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-rose-700">
                <ShieldAlert className="w-4 h-4 text-rose-600" />
                <span>Delete Account & Revoke Access</span>
              </div>
              <p className="text-rose-900/80 text-xs leading-relaxed">
                Permanently delete your user profile and remove your credentials from Varunaa. This action cannot be undone.
              </p>

              <button
                type="button"
                onClick={() => {
                  setDeleteConfirmationText('');
                  setIsDeleteModalOpen(true);
                }}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 transition-all cursor-pointer shadow-xs"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Account</span>
              </button>
            </div>
          </div>
        )}

        {/* PORT CONFIGURATION TAB */}
        {activeTab === 'port' && (
          <div className="space-y-4 max-w-xl">
            <div>
              <label className="text-text-muted block mb-1.5 font-medium">Terminal Port Name</label>
              <input
                type="text"
                value={portName}
                onChange={e => setPortName(e.target.value)}
                className="w-full bg-surface-subtle border border-border-subtle rounded-xl px-3 py-2 text-text-main focus:outline-hidden focus:border-brand-teal"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-text-muted block mb-1.5 font-medium">Active Commercial Quays</label>
                <input
                  type="number"
                  value={berthCount}
                  onChange={e => setBerthCount(Number(e.target.value))}
                  className="w-full bg-surface-subtle border border-border-subtle rounded-xl px-3 py-2 text-text-main focus:outline-hidden focus:border-brand-teal"
                />
              </div>

              <div>
                <label className="text-text-muted block mb-1.5 font-medium">Total STS Cranes Fleet</label>
                <input
                  type="number"
                  disabled
                  value={8}
                  className="w-full bg-slate-100 border border-border-subtle rounded-xl px-3 py-2 text-text-caption cursor-not-allowed"
                />
              </div>
            </div>

            <div>
              <label className="text-text-muted block mb-1.5 font-medium">Daily Shift Windows</label>
              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                <div className="p-2.5 bg-surface-subtle rounded-xl border border-border-subtle text-text-main font-medium">
                  Shift 1: 06:00 – 14:00
                </div>
                <div className="p-2.5 bg-surface-subtle rounded-xl border border-border-subtle text-text-main font-medium">
                  Shift 2: 14:00 – 22:00
                </div>
                <div className="p-2.5 bg-surface-subtle rounded-xl border border-border-subtle text-text-main font-medium">
                  Shift 3: 22:00 – 06:00
                </div>
              </div>
            </div>
          </div>
        )}

        {/* PREDICTION THRESHOLDS TAB */}
        {activeTab === 'ml' && (
          <div className="space-y-4 max-w-xl">
            <div>
              <div className="flex justify-between text-text-muted mb-1 font-medium">
                <span>Critical Berth Congestion Alert Trigger:</span>
                <span className="text-rose-600 font-bold">{warningThreshold}%</span>
              </div>
              <input
                type="range"
                min="70"
                max="95"
                value={warningThreshold}
                onChange={e => setWarningThreshold(Number(e.target.value))}
                className="w-full accent-rose-600 cursor-pointer"
              />
              <div className="text-[11px] text-text-caption mt-1">
                Berths exceeding this threshold in the 24h horizon generate automatic high-severity bottleneck warnings.
              </div>
            </div>

            <div>
              <label className="text-text-muted block mb-1.5 font-medium">Default Lookahead Horizon</label>
              <select
                value={lookaheadHorizon}
                onChange={e => setLookaheadHorizon(e.target.value)}
                className="w-full bg-surface-subtle border border-border-subtle rounded-xl px-3 py-2 text-text-main focus:outline-hidden focus:border-brand-teal"
              >
                <option value="24h">24 Hours (Operational Shift)</option>
                <option value="48h">48 Hours (Tidal Cycle)</option>
                <option value="72h">72 Hours (Strategic Default)</option>
              </select>
            </div>
          </div>
        )}

        {/* COPILOT SETTINGS TAB */}
        {activeTab === 'ai' && (
          <div className="space-y-6 max-w-xl">
            {/* Status Card */}
            <div className={`p-4 rounded-2xl border flex items-center justify-between ${
              geminiApiKey.trim().length > 15 && !geminiApiKey.includes('your-')
                ? 'bg-emerald-500/10 border-emerald-500/30'
                : 'bg-surface-subtle border-border-subtle'
            }`}>
              <div className="flex items-center gap-3">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                  geminiApiKey.trim().length > 15 && !geminiApiKey.includes('your-')
                    ? 'bg-emerald-500 text-white'
                    : 'bg-brand-teal text-white'
                }`}>
                  <KeyRound className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-text-main">
                    {geminiApiKey.trim().length > 15 && !geminiApiKey.includes('your-')
                      ? 'Google Gemini Live Connected'
                      : 'Varunaa Local Telemetry Engine'}
                  </h4>
                  <p className="text-[11px] text-text-muted">
                    {geminiApiKey.trim().length > 15 && !geminiApiKey.includes('your-')
                      ? 'Live generative reasoning is enabled for all general and port inquiries.'
                      : 'Using built-in operational intelligence.'}
                  </p>
                </div>
              </div>
            </div>

            {/* API Key Input */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-text-muted block text-xs font-medium">Google Gemini API Key</label>
                <a
                  href="https://aistudio.google.com/apikey"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-brand-teal hover:underline text-[11px] flex items-center gap-1 font-medium"
                >
                  <span>Get free key</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
              <div className="relative flex items-center">
                <input
                  type={showApiKey ? 'text' : 'password'}
                  placeholder="Paste your Gemini API key (AQ... or AIza...)"
                  value={geminiApiKey}
                  onChange={e => setGeminiApiKey(e.target.value)}
                  className="w-full bg-surface-subtle border border-border-subtle rounded-xl px-3.5 py-2.5 text-xs text-text-main pr-10 focus:outline-hidden focus:border-brand-teal focus:ring-1 focus:ring-brand-teal"
                />
                <button
                  type="button"
                  onClick={() => setShowApiKey(!showApiKey)}
                  className="absolute right-3 text-text-muted hover:text-text-main transition-colors cursor-pointer"
                >
                  {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-[11px] text-text-muted">
                Your key enables open-domain natural conversational answers for all questions in the Copilot.
              </p>
            </div>

            <div>
              <label className="text-text-muted block mb-1.5 font-medium text-xs">Gemini Reasoning Engine</label>
              <select
                value={geminiModel}
                onChange={e => setGeminiModel(e.target.value)}
                className="w-full bg-surface-subtle border border-border-subtle rounded-xl px-3 py-2 text-xs text-text-main focus:outline-hidden focus:border-brand-teal"
              >
                <option value="gemini-2.5-flash-lite">Gemini 2.5 Flash-Lite (Recommended — Ultra Low-Latency Real-Time)</option>
                <option value="gemini-3.5-flash">Gemini 3.5 Flash (Advanced Real-Time Reasoning)</option>
                <option value="gemini-3.1-flash-lite">Gemini 3.1 Flash-Lite (High-Throughput Telemetry)</option>
                <option value="gemini-flash-latest">Gemini Flash Latest (Auto-Updated Live)</option>
              </select>
            </div>

            <div>
              <label className="text-text-muted block mb-1.5 font-medium text-xs">AI Autonomy Level</label>
              <select
                value={aiAutonomy}
                onChange={e => setAiAutonomy(e.target.value)}
                className="w-full bg-surface-subtle border border-border-subtle rounded-xl px-3 py-2 text-xs text-text-main focus:outline-hidden focus:border-brand-teal"
              >
                <option value="recommend_only">Human-in-the-Loop (Supervisor must approve every plan)</option>
                <option value="assisted">Assisted Automation (Auto-draft with timeout window)</option>
              </select>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={handleSaveAiSettings}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-brand-teal hover:bg-teal-700 text-white rounded-xl text-xs font-semibold transition-all shadow-[0_8px_30px_rgb(0,0,0,0.04)] cursor-pointer"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Save AI Configuration</span>
              </button>
            </div>
          </div>
        )}

        {/* APPEARANCE TAB */}
        {activeTab === 'appearance' && (
          <div className="space-y-6 max-w-2xl">
            <div>
              <h3 className="text-sm font-semibold text-text-main mb-1">
                Interface Theme
              </h3>
              <p className="text-text-muted text-xs">
                Select your preferred interface color mode across all Varunaa portals and operational views.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <button
                type="button"
                onClick={() => {
                  setTheme('light');
                  showToast('info', 'Theme Updated', 'Switched to Light mode.');
                }}
                className={`relative p-4 rounded-2xl border text-left transition-all cursor-pointer ${
                  theme === 'light'
                    ? 'border-brand-teal bg-teal-50/20 ring-2 ring-brand-teal/20 shadow-sm'
                    : 'border-border-subtle bg-surface-subtle hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                    theme === 'light' ? 'bg-brand-teal text-white' : 'bg-surface text-amber-500 border border-border-subtle'
                  }`}>
                    <Sun className="w-4 h-4" />
                  </div>
                  {theme === 'light' && (
                    <span className="w-5 h-5 rounded-full bg-brand-teal text-white flex items-center justify-center">
                      <Check className="w-3 h-3" />
                    </span>
                  )}
                </div>
                <div className="font-bold text-sm text-text-main">Light</div>
                <div className="text-[11px] text-text-muted mt-1 leading-relaxed">
                  Clean, high-contrast daylight theme for daytime terminal operations.
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setTheme('dark');
                  showToast('info', 'Theme Updated', 'Switched to Deep Ocean Dark mode.');
                }}
                className={`relative p-4 rounded-2xl border text-left transition-all cursor-pointer ${
                  theme === 'dark'
                    ? 'border-brand-teal bg-teal-50/20 ring-2 ring-brand-teal/20 shadow-sm'
                    : 'border-border-subtle bg-surface-subtle hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                    theme === 'dark' ? 'bg-brand-teal text-white' : 'bg-surface text-sky-400 border border-border-subtle'
                  }`}>
                    <Moon className="w-4 h-4" />
                  </div>
                  {theme === 'dark' && (
                    <span className="w-5 h-5 rounded-full bg-brand-teal text-white flex items-center justify-center">
                      <Check className="w-3 h-3" />
                    </span>
                  )}
                </div>
                <div className="font-bold text-sm text-text-main">Dark</div>
                <div className="text-[11px] text-text-muted mt-1 leading-relaxed">
                  Deep Ocean night theme designed for low-glare control center monitoring.
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setTheme('system');
                  showToast('info', 'Theme Updated', 'Theme is now synchronized with system preference.');
                }}
                className={`relative p-4 rounded-2xl border text-left transition-all cursor-pointer ${
                  theme === 'system'
                    ? 'border-brand-teal bg-teal-50/20 ring-2 ring-brand-teal/20 shadow-sm'
                    : 'border-border-subtle bg-surface-subtle hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                    theme === 'system' ? 'bg-brand-teal text-white' : 'bg-surface text-slate-500 border border-border-subtle'
                  }`}>
                    <Laptop className="w-4 h-4" />
                  </div>
                  {theme === 'system' && (
                    <span className="w-5 h-5 rounded-full bg-brand-teal text-white flex items-center justify-center">
                      <Check className="w-3 h-3" />
                    </span>
                  )}
                </div>
                <div className="font-bold text-sm text-text-main">System</div>
                <div className="text-[11px] text-text-muted mt-1 leading-relaxed">
                  Automatically sync with your operating system color scheme.
                </div>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Delete Account Confirmation Modal */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-surface rounded-2xl border border-rose-200 max-w-md w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="w-10 h-10 rounded-full bg-rose-100 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-rose-600" />
              </div>
              <div>
                <h3 className="text-base font-bold text-text-main">Confirm Account Deletion</h3>
                <p className="text-xs text-text-muted">This action is permanent and cannot be undone.</p>
              </div>
            </div>

            <p className="text-xs text-text-muted leading-relaxed">
              Deleting your account will remove your access permissions, active sessions, and personal supervisor profile preferences.
            </p>

            <div>
              <label className="text-text-main text-xs block mb-1 font-medium">
                Type <strong className="text-rose-600 font-bold">DELETE</strong> to confirm:
              </label>
              <input
                type="text"
                value={deleteConfirmationText}
                onChange={e => setDeleteConfirmationText(e.target.value)}
                placeholder="DELETE"
                className="w-full bg-surface-subtle border border-rose-300 rounded-xl px-3 py-2 text-text-main text-xs focus:outline-hidden focus:border-rose-600"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsDeleteModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-text-muted hover:text-text-main hover:bg-surface-subtle border border-border-subtle cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteAccountConfirm}
                disabled={deleteConfirmationText.trim().toUpperCase() !== 'DELETE' || isDeleting}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 disabled:opacity-40 transition-all cursor-pointer shadow-sm"
              >
                {isDeleting ? 'Deleting...' : 'Permanently Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
