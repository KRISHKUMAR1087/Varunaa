import React, { useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  Activity,
  Ship,
  Anchor,
  Cpu,
  Warehouse,
  Calendar,
  ChartNoAxesCombined,
  Sparkles,
  Route,
  Zap,
  RefreshCw,
  Clock,
  BarChart3,
  Bell,
  Settings,
  RotateCcw,
  X,
  LogOut,
  Pin,
  Search,
  Navigation,
  CheckCircle2,
} from 'lucide-react';
import { useOperations } from '../../context/OperationsContext';
import { useAuth } from '../../context/AuthContext';

interface SidebarProps {
  isCollapsed?: boolean;
  setIsCollapsed?: (collapsed: boolean) => void;
  isPinned?: boolean;
  setIsPinned?: (pinned: boolean) => void;
  isMobileDrawer?: boolean;
  onCloseMobileDrawer?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  setIsCollapsed,
  isPinned = false,
  setIsPinned,
  isMobileDrawer = false,
  onCloseMobileDrawer,
}) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { alerts, isOptimizationApplied, resetToDefault } = useOperations();
  const { user, logout, isDemoUser } = useAuth();
  const unreadAlerts = alerts.filter(a => !a.isResolved).length;

  const [isHovered, setIsHovered] = useState<boolean>(false);

  // Effective expanded state: mobile drawer open OR pinned OR currently hovered
  const isExpanded = isMobileDrawer || isPinned || isHovered;
  const isCollapsed = !isExpanded;

  const togglePin = () => {
    const nextPinned = !isPinned;
    if (setIsPinned) {
      setIsPinned(nextPinned);
    }
    if (setIsCollapsed) {
      setIsCollapsed(!nextPinned);
    }
  };

  const getUserInitials = () => {
    if (!user?.name) return 'MV';
    const parts = user.name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return user.name.slice(0, 2).toUpperCase();
  };

  const handleLogout = () => {
    if (onCloseMobileDrawer) onCloseMobileDrawer();
    logout();
    navigate('/', { replace: true });
  };

  const navSections = [
    {
      label: 'Overview',
      items: [
        { name: 'Command Center', path: '/dashboard', icon: Activity },
      ],
    },
    {
      label: 'Operations',
      items: [
        { name: 'Vessels', path: '/operations/vessels', icon: Ship },
        { name: 'Berths', path: '/operations/berths', icon: Anchor },
        { name: 'Cranes', path: '/operations/cranes', icon: Cpu },
        { name: 'Yard', path: '/operations/yard', icon: Warehouse },
        { name: 'Operations Board', path: '/operations', icon: Calendar },
      ],
    },
    {
      label: 'Intelligence',
      items: [
        { name: 'Delay Investigation Lab', path: '/intelligence/delays', icon: Search },
        { name: 'Voyage Digital Twin', path: '/intelligence/voyage-twin', icon: Navigation },
        { name: 'Route Matrix', path: '/intelligence/routes', icon: Route },
        { name: 'Congestion Forecast', path: '/intelligence/forecast', icon: ChartNoAxesCombined },
        { name: 'AI Copilot', path: '/copilot', icon: Sparkles },
      ],
    },
    {
      label: 'Decision Support',
      items: [
        { name: 'Optimizer', path: '/decision/optimizer', icon: Zap },
        { name: 'What-If Simulator', path: '/decision/simulator', icon: RefreshCw },
        { name: '72-Hour Planner', path: '/decision/planner', icon: Clock },
        { name: 'Scenarios Verification', path: '/decision/verification', icon: CheckCircle2 },
      ],
    },
    {
      label: 'Analytics',
      items: [
        { name: 'Analytics', path: '/analytics', icon: BarChart3 },
      ],
    },
    {
      label: 'System',
      items: [
        {
          name: 'Alerts',
          path: '/alerts',
          icon: Bell,
          badge: unreadAlerts > 0 ? unreadAlerts : undefined,
          badgeColor: 'bg-rose-100 text-rose-700 font-semibold',
        },
        { name: 'Settings', path: '/settings', icon: Settings },
      ],
    },
  ];

  const handleNavClick = () => {
    if (isMobileDrawer && onCloseMobileDrawer) {
      onCloseMobileDrawer();
    }
  };

  const containerClasses = isMobileDrawer
    ? 'fixed bottom-0 left-0 right-0 h-16 bg-surface/90 backdrop-blur-xl border-t border-border-subtle flex flex-row items-center justify-around z-50 shadow-modal md:hidden'
    : `fixed top-0 bottom-0 left-0 z-[60] bg-surface/95 backdrop-blur-xl border-r border-border-subtle hidden md:flex flex-col transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] ${
        isExpanded ? 'w-64 shadow-2xl' : 'w-16 shadow-sm'
      }`;

  if (isMobileDrawer) {
    return (
      <nav className={containerClasses}>
        {navSections.flatMap(s => s.items).slice(0, 5).map(item => {
          const Icon = item.icon;
          const isActive = item.path === '/operations' ? location.pathname === '/operations' : location.pathname.startsWith(item.path);
          return (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={handleNavClick}
              className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${isActive ? 'text-brand-blue' : 'text-text-muted'}`}
            >
              <Icon className={`w-5 h-5 ${isActive ? 'text-brand-blue fill-brand-blue/20' : ''}`} />
              <span className="text-[10px] font-medium">{item.name.split(' ')[0]}</span>
            </NavLink>
          );
        })}
      </nav>
    );
  }

  return (
    <aside
      onMouseEnter={() => !isMobileDrawer && setIsHovered(true)}
      onMouseLeave={() => !isMobileDrawer && setIsHovered(false)}
      className={containerClasses}
    >
      {/* Brand Header */}
      <div
        className={`h-[4.5rem] border-b border-border-subtle bg-surface/80 backdrop-blur-md shrink-0 flex items-center ${
          isCollapsed ? 'justify-center px-2' : 'justify-between px-4'
        }`}
      >
        {!isCollapsed || isMobileDrawer ? (
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className="w-9 h-9 rounded-xl bg-brand-teal text-white flex items-center justify-center shrink-0 shadow-subtle">
              <Ship className="w-5 h-5 shrink-0" />
            </div>
            <div className="min-w-0 flex-1 flex flex-col justify-center">
              <span className="font-bold text-sm tracking-tight text-text-main truncate leading-none mb-1">
                Varunaa
              </span>
              <span className="text-xs font-medium text-text-muted truncate leading-none">
                Port Disruption & Recovery
              </span>
            </div>
          </div>
        ) : (
          <div className="w-9 h-9 rounded-xl bg-brand-teal text-white flex items-center justify-center mx-auto shadow-subtle shrink-0">
            <Ship className="w-5 h-5 shrink-0" />
          </div>
        )}

        {/* Desktop pin button */}
        {!isMobileDrawer && (
          <button
            onClick={togglePin}
            className={`p-1.5 rounded-lg transition-all duration-200 flex items-center justify-center cursor-pointer ${
              isPinned
                ? 'bg-brand-teal text-white shadow-xs'
                : 'text-text-caption hover:text-text-main hover:bg-surface-subtle'
            }`}
            title={isPinned ? 'Unpin sidebar (collapse to hover mode)' : 'Pin sidebar open'}
            aria-label={isPinned ? 'Unpin sidebar' : 'Pin sidebar'}
          >
            <Pin className={`w-4 h-4 transition-transform duration-200 ${isPinned ? 'rotate-45' : ''}`} />
          </button>
        )}

        {/* Mobile close */}
        {isMobileDrawer && (
          <button
            onClick={onCloseMobileDrawer}
            className="p-1.5 rounded-full text-text-muted hover:text-text-main hover:bg-surface-subtle transition-colors"
            title="Close menu"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Port Operational Status Ribbon */}
      {(!isCollapsed || isMobileDrawer) && (
        <div className="px-4 py-2 border-b border-border-subtle bg-surface-subtle/60 shrink-0">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <span
                className={`w-2 h-2 rounded-full shrink-0 ${
                  isOptimizationApplied ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]'
                }`}
              />
              <span className="text-xs font-medium text-text-main truncate">
                {isOptimizationApplied ? 'Port: Balanced' : 'Risk Detected'}
              </span>
            </div>
            <span
              className={`text-[10px] font-medium px-2 py-0.5 rounded-full border shrink-0 ${
                isOptimizationApplied
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  : 'bg-amber-50 text-amber-800 border-amber-200'
              }`}
            >
              {isOptimizationApplied ? 'Optimized' : 'B04 Warning'}
            </span>
          </div>
        </div>
      )}

      {/* Navigation List */}
      <div className="flex-1 overflow-y-auto py-4 px-3 space-y-5">
        {navSections.map((section, idx) => (
          <div key={idx} className="space-y-1">
            {(!isCollapsed || isMobileDrawer) && (
              <h3 className="px-3 pb-1 text-[11px] font-semibold text-text-caption uppercase tracking-wider">
                {section.label}
              </h3>
            )}
            <div className="space-y-1">
              {section.items.map(item => {
                const Icon = item.icon;
                const isActive =
                  item.path === '/operations'
                    ? location.pathname === '/operations'
                    : location.pathname.startsWith(item.path);

                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    onClick={handleNavClick}
                    title={isCollapsed && !isMobileDrawer ? item.name : undefined}
                    className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm transition-all duration-200 ease-out min-w-0 ${
                      isActive
                        ? 'bg-brand-teal/10 text-brand-teal font-semibold'
                        : 'text-text-muted hover:text-text-main hover:bg-surface-subtle'
                    } ${isCollapsed && !isMobileDrawer ? 'justify-center px-0 mx-2' : ''}`}
                  >
                    <Icon
                      className={`w-4 h-4 shrink-0 transition-colors ${
                        isActive ? 'text-brand-teal' : 'text-text-caption'
                      }`}
                    />
                    {(!isCollapsed || isMobileDrawer) && <span className="truncate flex-1">{item.name}</span>}
                    {(!isCollapsed || isMobileDrawer) && item.badge && (
                      <span
                        className={`ml-auto px-2 py-0.5 rounded-full text-[10px] shrink-0 ${item.badgeColor} shadow-xs`}
                      >
                        {item.badge}
                      </span>
                    )}
                  </NavLink>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Footer / Demo Reset & Profile */}
      <div className="p-4 border-t border-border-subtle bg-surface/80 backdrop-blur-md space-y-3 shrink-0">
        {!isCollapsed || isMobileDrawer ? (
          <>
            {isDemoUser && (
              <button
                onClick={resetToDefault}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-medium text-text-main bg-surface hover:bg-surface-subtle border border-border-subtle transition-all shadow-[0_2px_8px_rgba(0,0,0,0.04)] active:scale-95"
                title="Reset simulation to initial state"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset Demo State</span>
              </button>
            )}
            <div className="flex items-center gap-3 pt-2 px-1">
              {user?.photoURL ? (
                <img src={user.photoURL} alt={user.name} className="w-8 h-8 rounded-full object-cover shrink-0 border border-border-subtle shadow-xs" />
              ) : (
                <div className="w-8 h-8 rounded-full bg-surface-subtle border border-border-subtle flex items-center justify-center text-xs font-semibold text-text-main shrink-0 shadow-xs">
                  {getUserInitials()}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <div className="text-xs font-semibold text-text-main truncate" title={user?.name || 'Capt. M. Vance'}>{user?.name || 'Capt. M. Vance'}</div>
                <div className="text-[11px] text-text-muted truncate">Port Supervisor</div>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 mt-2 rounded-xl text-xs font-medium text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition-colors shadow-xs"
              title="Logout"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Logout</span>
            </button>
          </>
        ) : (
          <div className="space-y-3 flex flex-col items-center">
            {isDemoUser && (
              <button
                onClick={resetToDefault}
                className="w-full flex items-center justify-center p-2 rounded-xl text-text-caption hover:text-text-main hover:bg-surface-subtle transition-colors shadow-xs active:scale-95"
                title="Reset Demo State"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center p-2 rounded-xl text-rose-600 hover:text-rose-700 hover:bg-rose-50 transition-colors shadow-xs active:scale-95"
              title="Logout"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </aside>
  );
};
