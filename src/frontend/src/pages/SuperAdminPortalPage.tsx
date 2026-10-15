import React, { useState } from 'react';
import {
  ShieldAlert,
  Globe,
  Server,
  Users,
  Activity,
  BarChart3,
  LogOut,
  RefreshCw,
  Search,
  Lock,
  UserCheck,
  Clock,
  Database,
  X
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useOperations } from '../context/OperationsContext';
import { useTimezone } from '../context/TimezoneContext';

// Monitored Global Terminals
const INITIAL_PORTS = [
  { id: 'port-1', name: 'Port Sector Alpha (Live Terminal)', region: 'Europe / North Sea', status: 'Healthy', activeAgents: 142, load: '78%', capacityTeu: '4.5M TEU', latLong: '51.95°N, 4.14°E', systemHealth: '99.9%' },
  { id: 'port-2', name: 'Port of Rotterdam', region: 'Europe', status: 'Healthy', activeAgents: 310, load: '84%', capacityTeu: '14.8M TEU', latLong: '51.92°N, 4.47°E', systemHealth: '100%' },
  { id: 'port-3', name: 'Port of Singapore', region: 'Asia Pacific', status: 'Warning', activeAgents: 520, load: '92%', capacityTeu: '37.5M TEU', latLong: '1.29°N, 103.85°E', systemHealth: '98.4%' },
  { id: 'port-4', name: 'Port of Los Angeles', region: 'Americas', status: 'Healthy', activeAgents: 285, load: '65%', capacityTeu: '10.6M TEU', latLong: '33.74°N, 118.27°W', systemHealth: '99.9%' },
  { id: 'port-5', name: 'Jebel Ali Port', region: 'Middle East', status: 'Critical', activeAgents: 195, load: '98%', capacityTeu: '19.3M TEU', latLong: '24.98°N, 55.06°E', systemHealth: '94.2%' },
  { id: 'port-6', name: 'Port of Busan', region: 'East Asia', status: 'Healthy', activeAgents: 240, load: '72%', capacityTeu: '22.0M TEU', latLong: '35.10°N, 129.04°E', systemHealth: '99.8%' },
  { id: 'port-7', name: 'Port of Hamburg', region: 'Europe', status: 'Healthy', activeAgents: 180, load: '68%', capacityTeu: '8.7M TEU', latLong: '53.54°N, 9.99°E', systemHealth: '99.7%' },
];

// System Users Directory
const INITIAL_USERS = [
  { id: 'USR-001', name: 'KRISHKUMAR DARJI', email: 'Varunaa.admin@gmail.com', role: 'admin', provider: 'google', status: 'Active', joined: '2026-09-10', lastActive: '2 mins ago' },
  { id: 'USR-002', name: 'Capt. M. Vance', email: 'admin@Varunaa.demo', role: 'admin', provider: 'demo', status: 'Active', joined: '2026-08-15', lastActive: 'Just now' },
  { id: 'USR-003', name: 'James Harrington', email: 'agent@Varunaa.demo', role: 'ship-agent', provider: 'demo', status: 'Active', joined: '2026-08-15', lastActive: '5 mins ago' },
  { id: 'USR-004', name: 'Global Administrator', email: 'super@Varunaa.com', role: 'super-admin', provider: 'demo', status: 'Active', joined: '2026-01-01', lastActive: 'Active Now' },
  { id: 'USR-005', name: 'Sarah Chen (Apex Maritime)', email: 'sarah.chen@apex-maritime.com', role: 'ship-agent', provider: 'email', status: 'Active', joined: '2026-09-01', lastActive: '1 hour ago' },
  { id: 'USR-006', name: 'Marcus Brody (Maersk Agency)', email: 'm.brody@maersk-agents.org', role: 'ship-agent', provider: 'email', status: 'Suspended', joined: '2026-08-20', lastActive: '3 days ago' },
  { id: 'USR-007', name: 'Elena Rostova (Evergreen)', email: 'elena.r@evergreen-marine.com', role: 'ship-agent', provider: 'google', status: 'Active', joined: '2026-09-05', lastActive: '12 mins ago' },
];

// Security Audit Log Stream
const AUDIT_LOGS = [
  { id: 'LOG-101', timestamp: '21:52:14 IST', event: 'Super Admin Session Authorized', user: 'super@Varunaa.com', ip: '182.74.55.12', status: 'SUCCESS' },
  { id: 'LOG-102', timestamp: '21:48:02 IST', event: 'Google OAuth Session Hydrated', user: 'Varunaa.admin@gmail.com', ip: '103.22.40.81', status: 'SUCCESS' },
  { id: 'LOG-103', timestamp: '21:30:19 IST', event: 'Supabase RLS Policy Evaluation', entity: 'vessels_table', ip: 'Internal Database Gateway', status: 'SUCCESS' },
  { id: 'LOG-104', timestamp: '21:15:44 IST', event: 'Berth Allocation Optimization Plan Execution', user: 'admin@Varunaa.demo', ip: '192.168.1.104', status: 'SUCCESS' },
  { id: 'LOG-105', timestamp: '20:58:10 IST', event: 'Failed Password Attempt (Block Triggered)', user: 'm.brody@maersk-agents.org', ip: '45.112.90.11', status: 'BLOCKED' },
];

export const SuperAdminPortalPage: React.FC = () => {
  const navigate = useNavigate();
  const { logout, user: authUser } = useAuth();
  const { vessels, berths } = useOperations();
  const { formatLiveTime } = useTimezone();

  const [activeTab, setActiveTab] = useState<'terminals' | 'users' | 'operations' | 'security'>('terminals');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<'ALL' | 'admin' | 'ship-agent' | 'super-admin'>('ALL');
  const [usersList, setUsersList] = useState(INITIAL_USERS);
  const [selectedPort, setSelectedPort] = useState<typeof INITIAL_PORTS[0] | null>(null);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => setIsRefreshing(false), 800);
  };

  const toggleUserStatus = (userId: string) => {
    setUsersList(prev => prev.map(u => {
      if (u.id === userId) {
        const nextStatus = u.status === 'Active' ? 'Suspended' : 'Active';
        return { ...u, status: nextStatus };
      }
      return u;
    }));
  };

  const filteredUsers = usersList.filter(u => {
    const matchesSearch = u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          u.id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter === 'ALL' || u.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  return (
    <div className="min-h-screen bg-canvas font-sans text-text-main pb-12">
      {/* 1. Global Super Admin Navigation Bar */}
      <header className="bg-slate-900 text-white shadow-lg sticky top-0 z-50 border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate('/')}>
            <div className="w-9 h-9 bg-brand-teal text-white rounded-xl flex items-center justify-center shadow-md">
              <ShieldAlert className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-bold text-lg leading-tight tracking-tight text-white">Varunaa</h1>
                <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-rose-500/20 text-rose-300 border border-rose-500/40 uppercase tracking-widest">
                  GLOBAL SUPER ADMIN
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-medium">System Control & Multi-Tenant Management Center</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden md:flex items-center gap-2 px-3 py-1 rounded-full bg-slate-800 border border-slate-700 text-xs text-slate-300">
              <Clock className="w-3.5 h-3.5 text-brand-teal" />
              <span className="font-mono text-[11px]">{formatLiveTime()}</span>
            </div>

            <button
              onClick={handleRefresh}
              className={`p-2 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800 transition-colors ${isRefreshing ? 'animate-spin' : ''}`}
              title="Refresh Global Telemetry"
            >
              <RefreshCw className="w-4 h-4" />
            </button>

            <div className="h-6 w-px bg-slate-800 hidden sm:block"></div>

            <div className="flex items-center gap-2">
              <div className="hidden sm:block text-right">
                <div className="text-xs font-semibold text-white">{authUser?.name || 'Global Administrator'}</div>
                <div className="text-[10px] text-slate-400">{authUser?.email || 'super@Varunaa.com'}</div>
              </div>
              <button
                onClick={handleLogout}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-rose-300 bg-rose-950/60 hover:bg-rose-900/60 border border-rose-800/80 transition-colors"
                title="Exit Super Admin Portal"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Exit</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* 2. Main Dashboard Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        {/* Top Summary Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-border-subtle">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-text-main flex items-center gap-2.5">
              <span>Global Multi-Terminal Control Center</span>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
                All Cloud Services Online
              </span>
            </h2>
            <p className="text-xs text-text-muted mt-1">
              Cross-terminal monitoring, database tenant isolation, role governance, and security audit log streams.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-text-muted bg-surface px-3 py-1.5 rounded-xl border border-border-subtle shadow-xs">
              Single Account Governance: <strong className="text-text-main">super@Varunaa.com</strong>
            </span>
          </div>
        </div>

        {/* Global KPIs Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-surface p-4 rounded-2xl border border-border-subtle shadow-xs space-y-1">
            <div className="flex items-center justify-between text-text-muted">
              <span className="text-[11px] font-bold uppercase tracking-wider">Monitored Terminals</span>
              <Globe className="w-4 h-4 text-brand-teal" />
            </div>
            <div className="text-2xl font-bold text-text-main">{INITIAL_PORTS.length}</div>
            <div className="text-[10px] text-emerald-600 font-medium">Global Network</div>
          </div>

          <div className="bg-surface p-4 rounded-2xl border border-border-subtle shadow-xs space-y-1">
            <div className="flex items-center justify-between text-text-muted">
              <span className="text-[11px] font-bold uppercase tracking-wider">System Users</span>
              <Users className="w-4 h-4 text-sky-600" />
            </div>
            <div className="text-2xl font-bold text-text-main">{usersList.length}</div>
            <div className="text-[10px] text-text-caption">Admins & Ship Agents</div>
          </div>

          <div className="bg-surface p-4 rounded-2xl border border-border-subtle shadow-xs space-y-1">
            <div className="flex items-center justify-between text-text-muted">
              <span className="text-[11px] font-bold uppercase tracking-wider">System Health</span>
              <Server className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="text-2xl font-bold text-emerald-600">99.98%</div>
            <div className="text-[10px] text-emerald-600 font-medium">Supabase DB & RLS Nominal</div>
          </div>

          <div className="bg-surface p-4 rounded-2xl border border-border-subtle shadow-xs space-y-1">
            <div className="flex items-center justify-between text-text-muted">
              <span className="text-[11px] font-bold uppercase tracking-wider">Security Audits</span>
              <ShieldAlert className="w-4 h-4 text-rose-600" />
            </div>
            <div className="text-2xl font-bold text-text-main">{AUDIT_LOGS.length}</div>
            <div className="text-[10px] text-text-caption">Logged Events Today</div>
          </div>
        </div>

        {/* Tab Selection Controls */}
        <div className="flex items-center gap-2 border-b border-border-subtle pb-2 overflow-x-auto">
          {[
            { id: 'terminals', label: 'Monitored Terminals', icon: Globe, count: INITIAL_PORTS.length },
            { id: 'users', label: 'Users & Roles', icon: Users, count: usersList.length },
            { id: 'operations', label: 'Live Operations Feed', icon: Activity, count: vessels.length },
            { id: 'security', label: 'Security & Audit Logs', icon: Database, count: AUDIT_LOGS.length },
          ].map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                  isActive
                    ? 'bg-brand-teal text-white shadow-md'
                    : 'bg-surface text-text-muted hover:text-text-main border border-border-subtle'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
                <span className={`px-2 py-0.2 rounded-full text-[10px] font-mono ${
                  isActive ? 'bg-white/20 text-white' : 'bg-surface-subtle text-text-muted'
                }`}>
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* TAB 1: MONITORED TERMINALS */}
        {activeTab === 'terminals' && (
          <div className="bg-surface rounded-2xl border border-border-subtle shadow-xs overflow-hidden">
            <div className="px-6 py-4 border-b border-border-subtle flex items-center justify-between bg-surface-subtle/50">
              <div>
                <h3 className="font-bold text-text-main text-sm flex items-center gap-2">
                  <Globe className="w-4 h-4 text-brand-teal" /> Global Terminal Network Status
                </h3>
                <p className="text-[11px] text-text-muted">Real-time status, active stevedore counts, and capacity utilization across global ports.</p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs whitespace-nowrap">
                <thead>
                  <tr className="bg-surface-subtle/70 text-text-muted font-bold uppercase tracking-wider border-b border-border-subtle">
                    <th className="px-6 py-3">Terminal Name</th>
                    <th className="px-6 py-3">Region</th>
                    <th className="px-6 py-3">Capacity</th>
                    <th className="px-6 py-3">Status</th>
                    <th className="px-6 py-3 text-right">Active Agents</th>
                    <th className="px-6 py-3 text-right">Load %</th>
                    <th className="px-6 py-3 text-right">Uptime</th>
                    <th className="px-6 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-subtle text-text-main">
                  {INITIAL_PORTS.map(port => (
                    <tr key={port.id} className="hover:bg-surface-subtle/60 transition-colors">
                      <td className="px-6 py-4 font-bold text-text-main">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-brand-teal" />
                          <span>{port.name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-text-muted">{port.region}</td>
                      <td className="px-6 py-4 font-mono text-text-muted">{port.capacityTeu}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${
                          port.status === 'Healthy' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                          port.status === 'Warning' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                          'bg-rose-50 text-rose-700 border border-rose-200'
                        }`}>
                          {port.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right font-mono font-semibold">{port.activeAgents}</td>
                      <td className="px-6 py-4 text-right font-mono font-bold text-text-main">{port.load}</td>
                      <td className="px-6 py-4 text-right font-mono text-emerald-600">{port.systemHealth}</td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => setSelectedPort(port)}
                          className="px-3 py-1 rounded-lg text-brand-teal bg-teal-50 hover:bg-teal-100 border border-teal-200 font-semibold text-[11px] transition-colors cursor-pointer"
                        >
                          Inspect
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 2: USERS & ROLES */}
        {activeTab === 'users' && (
          <div className="space-y-4">
            {/* Filter and Search Bar */}
            <div className="bg-surface p-4 rounded-2xl border border-border-subtle shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="relative w-full sm:w-80">
                <Search className="w-4 h-4 text-text-caption absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search user name, email, or ID..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-4 py-1.5 bg-surface-subtle border border-border-subtle rounded-xl text-xs text-text-main focus:outline-none focus:border-brand-teal"
                />
              </div>

              <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto">
                <span className="text-xs font-semibold text-text-muted">Filter Role:</span>
                {(['ALL', 'admin', 'ship-agent', 'super-admin'] as const).map(role => (
                  <button
                    key={role}
                    onClick={() => setRoleFilter(role)}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
                      roleFilter === role
                        ? 'bg-brand-teal text-white'
                        : 'bg-surface-subtle text-text-muted hover:text-text-main border border-border-subtle'
                    }`}
                  >
                    {role === 'ALL' ? 'All Roles' : role === 'admin' ? 'Port Admin' : role === 'ship-agent' ? 'Ship Agent' : 'Super Admin'}
                  </button>
                ))}
              </div>
            </div>

            {/* Users Table */}
            <div className="bg-surface rounded-2xl border border-border-subtle shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs whitespace-nowrap">
                  <thead>
                    <tr className="bg-surface-subtle/70 text-text-muted font-bold uppercase tracking-wider border-b border-border-subtle">
                      <th className="px-6 py-3">User ID & Name</th>
                      <th className="px-6 py-3">Email Address</th>
                      <th className="px-6 py-3">Assigned Role</th>
                      <th className="px-6 py-3">Auth Provider</th>
                      <th className="px-6 py-3">Account Status</th>
                      <th className="px-6 py-3 text-right">Joined</th>
                      <th className="px-6 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-subtle text-text-main">
                    {filteredUsers.map(userItem => (
                      <tr key={userItem.id} className="hover:bg-surface-subtle/60 transition-colors">
                        <td className="px-6 py-3.5 font-semibold">
                          <div>
                            <div className="text-text-main font-bold">{userItem.name}</div>
                            <div className="text-[10px] text-text-caption font-mono">{userItem.id}</div>
                          </div>
                        </td>

                        <td className="px-6 py-3.5 font-mono text-text-muted">{userItem.email}</td>

                        <td className="px-6 py-3.5">
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider border ${
                            userItem.role === 'super-admin'
                              ? 'bg-rose-50 text-rose-700 border-rose-200'
                              : userItem.role === 'admin'
                              ? 'bg-teal-50 text-teal-800 border-teal-200'
                              : 'bg-sky-50 text-sky-800 border-sky-200'
                          }`}>
                            {userItem.role === 'super-admin' ? 'Super Admin' : userItem.role === 'admin' ? 'Port Admin' : 'Ship Agent'}
                          </span>
                        </td>

                        <td className="px-6 py-3.5">
                          <span className="capitalize text-text-muted font-medium bg-surface-subtle px-2 py-0.5 rounded border border-border-subtle">
                            {userItem.provider}
                          </span>
                        </td>

                        <td className="px-6 py-3.5">
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            userItem.status === 'Active'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-rose-50 text-rose-700 border border-rose-200'
                          }`}>
                            {userItem.status}
                          </span>
                        </td>

                        <td className="px-6 py-3.5 text-right font-mono text-text-muted">
                          {userItem.joined}
                        </td>

                        <td className="px-6 py-3.5 text-right">
                          {userItem.role !== 'super-admin' ? (
                            <button
                              onClick={() => toggleUserStatus(userItem.id)}
                              className={`px-3 py-1 rounded-lg font-semibold text-[11px] transition-colors cursor-pointer ${
                                userItem.status === 'Active'
                                  ? 'bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100'
                                  : 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                              }`}
                            >
                              {userItem.status === 'Active' ? 'Suspend' : 'Activate'}
                            </button>
                          ) : (
                            <span className="text-[10px] text-text-caption italic">Protected</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: LIVE OPERATIONS FEED */}
        {activeTab === 'operations' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-surface p-5 rounded-2xl border border-border-subtle shadow-xs space-y-4">
              <h3 className="font-bold text-text-main text-sm flex items-center gap-2 border-b border-border-subtle pb-3">
                <Activity className="w-4 h-4 text-brand-teal" /> Active Vessel Telemetry Stream ({vessels.length})
              </h3>
              <div className="space-y-2.5">
                {vessels.map(v => (
                  <div key={v.id} className="p-3 rounded-xl bg-surface-subtle border border-border-subtle flex items-center justify-between">
                    <div>
                      <div className="font-bold text-xs text-text-main">{v.name} ({v.vesselType || 'ULCV'})</div>
                      <div className="text-[11px] text-text-muted">Assigned Berth: <strong className="text-brand-teal">{v.assignedBerth || 'B04'}</strong> • Flag: {v.flag}</div>
                    </div>
                    <div className="text-right">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-sky-50 text-sky-800 border border-sky-200">
                        {v.status}
                      </span>
                      <div className="text-[10px] font-mono text-text-caption mt-0.5">ETA: {v.eta}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-surface p-5 rounded-2xl border border-border-subtle shadow-xs space-y-4">
              <h3 className="font-bold text-text-main text-sm flex items-center gap-2 border-b border-border-subtle pb-3">
                <BarChart3 className="w-4 h-4 text-emerald-600" /> Terminal Quayside Occupancy
              </h3>
              <div className="space-y-3">
                {berths.map(b => (
                  <div key={b.id} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="font-bold text-text-main">{b.name} ({b.id})</span>
                      <span className="font-mono text-text-muted">{b.currentUtilization}% Utilized</span>
                    </div>
                    <div className="w-full bg-surface-subtle h-2 rounded-full overflow-hidden border border-border-subtle">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${
                          b.currentUtilization > 85 ? 'bg-rose-500' : b.currentUtilization > 70 ? 'bg-amber-500' : 'bg-emerald-500'
                        }`}
                        style={{ width: `${b.currentUtilization}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: SECURITY AUDIT LOGS */}
        {activeTab === 'security' && (
          <div className="bg-surface rounded-2xl border border-border-subtle shadow-xs overflow-hidden">
            <div className="px-6 py-4 border-b border-border-subtle flex items-center justify-between bg-surface-subtle/50">
              <div>
                <h3 className="font-bold text-text-main text-sm flex items-center gap-2">
                  <Database className="w-4 h-4 text-rose-600" /> Security Audit Stream & OAuth Event Logs
                </h3>
                <p className="text-[11px] text-text-muted">Immutable system activity logs, authentication triggers, and Supabase RLS security evaluations.</p>
              </div>
            </div>

            <div className="divide-y divide-border-subtle text-xs">
              {AUDIT_LOGS.map(log => (
                <div key={log.id} className="p-4 flex items-center justify-between hover:bg-surface-subtle/60 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-xl shrink-0 ${
                      log.status === 'SUCCESS' ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' : 'bg-rose-50 text-rose-600 border border-rose-200'
                    }`}>
                      {log.status === 'SUCCESS' ? <UserCheck className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                    </div>
                    <div>
                      <div className="font-bold text-text-main">{log.event}</div>
                      <div className="text-[11px] text-text-muted">Target: <span className="font-mono text-text-main">{log.user || log.entity}</span> • IP: <span className="font-mono">{log.ip}</span></div>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="font-mono text-text-caption text-[11px]">{log.timestamp}</span>
                    <div>
                      <span className={`text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded ${
                        log.status === 'SUCCESS' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                      }`}>
                        {log.status}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Port Inspection Modal */}
      {selectedPort && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-surface max-w-lg w-full rounded-3xl border border-border-subtle shadow-modal p-6 space-y-5">
            <div className="flex items-start justify-between border-b border-border-subtle pb-4">
              <div>
                <h3 className="text-lg font-bold text-text-main">{selectedPort.name}</h3>
                <p className="text-xs text-text-muted">{selectedPort.region} • Coordinates: {selectedPort.latLong}</p>
              </div>
              <button
                onClick={() => setSelectedPort(null)}
                className="p-1.5 rounded-full text-text-caption hover:text-text-main hover:bg-surface-subtle"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-surface-subtle rounded-xl border border-border-subtle">
                <div className="text-text-muted font-medium">Terminal Capacity</div>
                <div className="text-lg font-bold text-text-main mt-0.5">{selectedPort.capacityTeu}</div>
              </div>

              <div className="p-3 bg-surface-subtle rounded-xl border border-border-subtle">
                <div className="text-text-muted font-medium">Current Load</div>
                <div className="text-lg font-bold text-brand-teal mt-0.5">{selectedPort.load}</div>
              </div>

              <div className="p-3 bg-surface-subtle rounded-xl border border-border-subtle">
                <div className="text-text-muted font-medium">Active Agents</div>
                <div className="text-lg font-bold text-text-main mt-0.5">{selectedPort.activeAgents}</div>
              </div>

              <div className="p-3 bg-surface-subtle rounded-xl border border-border-subtle">
                <div className="text-text-muted font-medium">System Health</div>
                <div className="text-lg font-bold text-emerald-600 mt-0.5">{selectedPort.systemHealth}</div>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setSelectedPort(null)}
                className="px-4 py-2 rounded-xl bg-brand-teal text-white font-bold text-xs cursor-pointer shadow-subtle"
              >
                Close Inspection
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
