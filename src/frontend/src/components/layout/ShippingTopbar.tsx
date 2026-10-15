import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Bell,
  Menu,
  LogOut,
  User as UserIcon,
  Ship,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useOperations } from '../../context/OperationsContext';
import { MusicButton } from '../common/MusicButton';
import { ThemeToggleButton } from '../common/ThemeToggleButton';
import { TimezoneClock } from '../common/TimezoneClock';

interface ShippingTopbarProps {
  isCollapsed: boolean;
  setIsMobileMenuOpen: (open: boolean) => void;
}

export const ShippingTopbar: React.FC<ShippingTopbarProps> = ({
  isCollapsed,
  setIsMobileMenuOpen,
}) => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { unreadAgentAlertsCount } = useOperations();
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState<boolean>(false);
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



  const handleLogout = () => {
    setIsProfileMenuOpen(false);
    logout();
    navigate('/', { replace: true });
  };

  return (
    <header
      className={`fixed top-0 right-0 z-50 h-16 bg-surface border-b border-border-subtle transition-all duration-200 flex items-center justify-between px-3 sm:px-4 lg:px-6 left-0 ${
        isCollapsed ? 'md:left-16' : 'md:left-64'
      }`}
    >
      {/* Left: Mobile Toggle + Breadcrumb */}
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        {/* Hamburger Menu: visible only on mobile (< 768px) */}
        <button
          onClick={() => setIsMobileMenuOpen(true)}
          className="p-1.5 rounded-xl text-text-muted hover:text-text-main hover:bg-surface-subtle md:hidden shrink-0"
          aria-label="Open navigation menu"
          title="Open Menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex items-center text-text-main font-bold truncate text-sm sm:text-base">
          Apex Maritime Agency
        </div>
      </div>

      {/* Right Actions & Utilities */}
      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        {/* Live Port Clock with Timezone Switcher */}
        <TimezoneClock className="hidden sm:block" />

        {/* Shipping Advisories Bell */}
        <button
          onClick={() => navigate('/shipping/alerts')}
          className="relative p-1.5 sm:p-2 rounded-xl text-text-muted hover:text-text-main hover:bg-surface-subtle border border-transparent hover:border-border-subtle transition-colors shrink-0"
          title={unreadAgentAlertsCount > 0 ? `${unreadAgentAlertsCount} Unread fleet advisories` : 'All schedules normal'}
        >
          <Bell className="w-4 h-4" />
          {unreadAgentAlertsCount > 0 && (
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
          )}
        </button>

        {/* Ambient Background Music Toggle */}
        <MusicButton />

        {/* Day / Night Theme Switcher */}
        <ThemeToggleButton />

        {/* Agent Profile Dropdown Container */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
            className="flex items-center gap-2 p-1 rounded-full sm:rounded-xl hover:bg-surface-subtle transition-colors border border-transparent hover:border-border-subtle cursor-pointer"
            aria-label="User profile menu"
            aria-expanded={isProfileMenuOpen}
          >
            {user?.photoURL ? (
              <img
                src={user.photoURL}
                alt={user.name}
                className="w-8 h-8 rounded-full object-cover border border-border-subtle shrink-0"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-sky-100 border border-sky-200 text-sky-800 flex items-center justify-center font-bold text-xs shrink-0">
                {user?.name ? user.name.slice(0, 2).toUpperCase() : 'SA'}
              </div>
            )}
            <div className="hidden sm:block text-left pr-1">
              <div className="text-xs font-semibold text-text-main leading-tight truncate max-w-[120px]">
                {user?.name || 'Shipping Agent'}
              </div>
              <div className="text-[10px] text-text-muted leading-tight">
                Ship Agent
              </div>
            </div>
          </button>

          {/* Profile Dropdown Menu */}
          {isProfileMenuOpen && (
            <div className="absolute right-0 mt-2 w-64 rounded-xl bg-surface border border-border-subtle shadow-modal py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
              {/* User Identity Header */}
              <div className="px-4 py-2.5 border-b border-border-subtle">
                <div className="text-xs font-semibold text-text-main truncate">
                  {user?.name || 'Shipping Agent'}
                </div>
                <div className="text-[11px] text-text-muted truncate mt-0.5">
                  {user?.email || 'agent@varunaa.demo'}
                </div>
                <div className="mt-2 inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-semibold bg-sky-50 text-sky-800 border border-sky-200">
                  <Ship className="w-3 h-3 text-sky-600" />
                  Role: Ship Agent
                </div>
              </div>

              {/* Menu Links */}
              <div className="py-1">
                <Link
                  to="/shipping/profile"
                  onClick={() => setIsProfileMenuOpen(false)}
                  className="flex items-center gap-2 px-4 py-2 text-xs text-text-main hover:bg-surface-subtle transition-colors"
                >
                  <UserIcon className="w-3.5 h-3.5 text-text-caption" />
                  <span>Agency Profile & Settings</span>
                </Link>

              </div>

              {/* Sign Out Divider & Button */}
              <div className="border-t border-border-subtle pt-1 mt-1 px-2">
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium text-rose-700 hover:bg-rose-50 transition-colors text-left cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5 text-rose-600" />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

