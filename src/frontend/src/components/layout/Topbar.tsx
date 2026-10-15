import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Search,
  Bell,
  Sparkles,
  Menu,
  LogOut,
  Settings as SettingsIcon,
  ShieldCheck,
  User as UserIcon,
  Database,
} from 'lucide-react';
import { useOperations } from '../../context/OperationsContext';
import { useAuth } from '../../context/AuthContext';
import { MusicButton } from '../common/MusicButton';
import { ThemeToggleButton } from '../common/ThemeToggleButton';
import { TimezoneClock } from '../common/TimezoneClock';
import { CsvImportModal } from '../operations/CsvImportModal';

interface TopbarProps {
  isCollapsed: boolean;
  setIsMobileMenuOpen: (open: boolean) => void;
}

export const Topbar: React.FC<TopbarProps> = ({ isCollapsed, setIsMobileMenuOpen }) => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { alerts, setIsCopilotOpen, isCopilotOpen, searchQuery, setSearchQuery } = useOperations();
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState<boolean>(false);
  const [isCsvModalOpen, setIsCsvModalOpen] = useState<boolean>(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsProfileMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const unreadAlerts = alerts.filter(a => !a.isResolved).length;

  const handleLogout = () => {
    setIsProfileMenuOpen(false);
    logout();
    navigate('/', { replace: true });
  };

  const getUserInitials = () => {
    if (!user?.name) return 'MV';
    const parts = user.name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return user.name.slice(0, 2).toUpperCase();
  };

  return (
    <header
      className={`fixed top-0 right-0 z-50 h-16 bg-surface/80 backdrop-blur-md border-b border-border-subtle transition-all duration-200 flex items-center justify-between px-3 sm:px-4 lg:px-6 left-0 ${
        isCollapsed ? 'md:left-16' : 'md:left-64'
      }`}
    >
      {/* Left: Mobile Toggle + Breadcrumb */}
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        {/* Hamburger Menu Button: visible only on mobile (< 768px) */}
        <button
          onClick={() => setIsMobileMenuOpen(true)}
          className="p-2 rounded-full text-text-muted hover:text-text-main hover:bg-surface-subtle md:hidden shrink-0"
          aria-label="Open navigation menu"
          title="Open Menu"
        >
          <Menu className="w-5 h-5" />
        </button>
      </div>

      {/* Right Actions & Utilities */}
      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        {/* Global Search: visible on larger screens */}
        <div className="relative hidden xl:block">
          <div className="flex items-center bg-surface-subtle border border-border-subtle rounded-full px-3 py-1.5 w-48 lg:w-60 focus-within:border-brand-teal focus-within:ring-2 focus-within:ring-brand-teal/20 focus-within:w-68 transition-all">
            <Search className="w-3.5 h-3.5 text-text-caption mr-2 shrink-0" />
            <input
              type="text"
              placeholder="Search vessel, berth, IMO..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full bg-transparent text-xs text-text-main placeholder-text-caption focus:outline-hidden"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="text-text-caption hover:text-text-main text-[10px] ml-1 shrink-0 bg-surface-subtle px-1.5 rounded-full"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Live Port Clock with Timezone Switcher */}
        <TimezoneClock className="hidden sm:block" />

        {/* AIS Status: hidden below 1280px */}
        <div className="hidden 2xl:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-surface-subtle border border-border-subtle text-xs shrink-0 shadow-xs">
          <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
          <span className="text-text-muted">AIS:</span>
          <span className="text-text-main font-medium">Online</span>
        </div>

        {/* Alerts Bell */}
        <button
          onClick={() => navigate('/alerts')}
          className="relative p-2 sm:p-2.5 rounded-full text-text-muted hover:text-text-main hover:bg-surface-subtle border border-transparent hover:border-border-subtle transition-all duration-150 shrink-0 cursor-pointer shadow-xs"
          title={`${unreadAlerts} Active Operational Alerts`}
        >
          <Bell className="w-4 h-4" />
          {unreadAlerts > 0 && (
            <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 rounded-full bg-rose-500 ring-2 ring-white shadow-[0_0_8px_rgba(244,63,94,0.5)]" />
          )}
        </button>

        {/* CSV Ingestion Button */}
        <button
          onClick={() => setIsCsvModalOpen(true)}
          className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold text-text-main bg-surface-subtle hover:bg-surface border border-border-subtle hover:border-brand-teal/50 transition-all cursor-pointer shadow-xs"
          title="Import Operations CSV"
        >
          <Database className="w-3.5 h-3.5 text-brand-teal" />
          <span>Import CSV</span>
        </button>

        {/* Ambient Background Music Toggle */}
        <MusicButton />

        {/* Day / Night Theme Switcher */}
        <ThemeToggleButton />

        {/* Copilot Trigger Button */}
        <button
          onClick={() => setIsCopilotOpen(!isCopilotOpen)}
          className={`p-2 rounded-full text-xs font-semibold transition-all duration-200 border shrink-0 cursor-pointer shadow-xs ${
            isCopilotOpen
              ? 'bg-brand-teal text-white border-brand-teal shadow-[0_4px_12px_rgba(20,184,166,0.3)]'
              : 'bg-surface text-brand-teal border-border-subtle hover:bg-teal-50/30 hover:border-brand-teal/50 shadow-[0_2px_8px_rgba(0,0,0,0.04)]'
          }`}
          title="Open Gemini Operational Copilot"
          aria-label="Open Gemini Operational Copilot"
        >
          <Sparkles className="w-4 h-4 shrink-0" />
        </button>

        {/* Supervisor Profile Dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
            className="flex items-center gap-2 p-1 rounded-full hover:bg-surface-subtle transition-colors border border-transparent hover:border-border-subtle cursor-pointer shadow-xs"
            aria-label="User profile menu"
            aria-expanded={isProfileMenuOpen}
          >
            {user?.photoURL ? (
              <img
                src={user.photoURL}
                alt={user.name}
                className="w-9 h-9 rounded-full object-cover border border-border-subtle shrink-0 shadow-xs"
              />
            ) : (
              <div
                className="w-9 h-9 rounded-full bg-surface-subtle border border-border-subtle flex items-center justify-center text-xs font-semibold text-text-main shrink-0 shadow-xs"
              >
                {getUserInitials()}
              </div>
            )}
            <div className="hidden xl:block text-left pr-2">
              <div className="text-xs font-semibold text-text-main leading-tight truncate max-w-[120px]">
                {user?.name || 'Capt. M. Vance'}
              </div>
              <div className="text-[10px] text-text-muted leading-tight">
                Port Operations
              </div>
            </div>
          </button>

          {/* Profile Dropdown Menu */}
          {isProfileMenuOpen && (
            <div className="absolute right-0 mt-3 w-64 rounded-2xl bg-surface backdrop-blur-xl border border-border-subtle shadow-[0_8px_30px_rgb(0,0,0,0.12)] py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
              {/* User Identity Header */}
              <div className="px-4 py-3 border-b border-border-subtle">
                <div className="text-sm font-semibold text-text-main truncate">
                  {user?.name || 'Capt. M. Vance'}
                </div>
                <div className="text-xs text-text-muted truncate mt-0.5">
                  {user?.email || 'admin@varunaa.demo'}
                </div>
                <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  Role: Port Operations Admin
                </div>
              </div>

              {/* Menu Links */}
              <div className="py-1.5 px-2 space-y-1">
                <Link
                  to="/settings?tab=profile"
                  onClick={() => setIsProfileMenuOpen(false)}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-text-main hover:bg-surface-subtle transition-colors"
                >
                  <UserIcon className="w-4 h-4 text-brand-teal" />
                  <span>Admin & User Profile</span>
                </Link>
                <Link
                  to="/settings?tab=port"
                  onClick={() => setIsProfileMenuOpen(false)}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-text-main hover:bg-surface-subtle transition-colors"
                >
                  <SettingsIcon className="w-4 h-4 text-text-caption" />
                  <span>Port Settings</span>
                </Link>
              </div>

              {/* Sign Out Divider & Button */}
              <div className="border-t border-border-subtle pt-1.5 mt-1 px-2">
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium text-rose-700 hover:bg-rose-50 transition-colors text-left cursor-pointer"
                >
                  <LogOut className="w-4 h-4 text-rose-600" />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* CSV Ingestion Modal */}
      <CsvImportModal
        isOpen={isCsvModalOpen}
        onClose={() => setIsCsvModalOpen(false)}
      />
    </header>
  );
};
