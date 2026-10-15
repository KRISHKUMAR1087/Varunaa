import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import {
  Ship, Anchor, ArrowRight, Shield, BarChart3, CloudCog,
  CheckCircle2, Zap, Globe, Brain, Users, Lock, TrendingUp,
  Clock, AlertTriangle, Activity, ChevronDown, Star, Building2,
  Container, Navigation, Waves
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { GoogleSignInButton } from '../components/auth/GoogleSignInButton';
import { RoleSelector } from '../components/auth/RoleSelector';
import { AuthErrorAlert } from '../components/auth/AuthErrorAlert';
import { ThemeToggleButton } from '../components/common/ThemeToggleButton';
import { MusicButton } from '../components/common/MusicButton';
import { UserRole } from '../types/auth';
import { motion } from 'framer-motion';

const backgroundVideo = '/generate_a_video_for_a_port_ma.mp4';

const fadeUp: any = {
  hidden: { opacity: 0, y: 28 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.7, ease: 'easeOut' } }
};

const stagger = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.13 } }
};

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { loginAsDemo, loginWithGoogleToken, confirmRoleSelection } = useAuth();

  const [isLoginMode, setIsLoginMode] = useState(true);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [showRoleSelector, setShowRoleSelector] = useState(false);
  const [googleError, setGoogleError] = useState<string | null>(null);

  const getRedirectPath = (role: UserRole) => {
    const state = location.state as { from?: { pathname: string } } | null;
    const from = state?.from?.pathname;
    if (from && from !== '/login') {
      if (role === 'admin' && !from.startsWith('/shipping')) return from;
      if (role === 'ship-agent' && from.startsWith('/shipping')) return from;
    }
    return role === 'admin' ? '/dashboard' : '/shipping/dashboard';
  };

  const handleDemoLogin = async (role: UserRole) => {
    const user = await loginAsDemo(role);
    navigate(getRedirectPath(user.role), { replace: true });
  };

  const handleGoogleSignIn = async (idToken: string) => {
    setIsGoogleLoading(true);
    setGoogleError(null);
    try {
      const pendingRole = localStorage.getItem('pending_google_role') as UserRole | null;
      const result = await loginWithGoogleToken(idToken);
      
      if (pendingRole && (pendingRole === 'admin' || pendingRole === 'ship-agent')) {
        localStorage.removeItem('pending_google_role');
        const confirmed = await confirmRoleSelection(pendingRole);
        navigate(getRedirectPath(confirmed.role), { replace: true });
      } else if (result.needsRoleSelection && result.tempUser) {
        setShowRoleSelector(true);
      } else if (result.tempUser) {
        navigate(getRedirectPath(result.tempUser.role), { replace: true });
      }
    } catch (e: any) {
      console.error('Google sign in error:', e);
      setGoogleError(e.message || 'Google sign-in failed. Please try again.');
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const handleRoleSelected = async (role: UserRole) => {
    const confirmed = await confirmRoleSelection(role);
    setShowRoleSelector(false);
    navigate(getRedirectPath(confirmed.role), { replace: true });
  };

  return (
    <div className="min-h-screen bg-canvas font-sans text-text-main selection:bg-brand-teal selection:text-white">

      {/* ─── 1. HERO ─────────────────────────────────────────────────────── */}
      <section className="relative min-h-screen flex flex-col overflow-hidden bg-black">
        {/* Background Video */}
        <div className="absolute inset-0 z-0 pointer-events-none">
          <video
            autoPlay
            loop
            muted
            playsInline
            className="absolute inset-0 w-full h-full object-cover object-center scale-[1.35] opacity-80"
            src={backgroundVideo}
          />

          <div className="absolute inset-0 bg-black/80" />
        </div>
        {/* Header Nav */}
        <div className="w-full max-w-7xl mx-auto px-6 z-20 flex flex-col min-h-screen">
          <header className="flex items-center justify-between py-6">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-brand-teal text-white shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
                <Ship className="w-5 h-5" />
              </div>
              <span className="text-2xl font-bold tracking-tight text-white drop-shadow-md">PortPilot</span>
            </div>
            <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-white/80">
              <a href="#features" className="hover:text-white transition-colors">Features</a>
              <a href="#how-it-works" className="hover:text-white transition-colors">How It Works</a>
              <a href="#roles" className="hover:text-white transition-colors">Portals</a>
              <a href="#testimonials" className="hover:text-white transition-colors">Testimonials</a>
            </nav>
            <div className="flex items-center gap-3">
              <MusicButton className="bg-white/10 text-white border-white/20 hover:bg-white/20 hover:text-white" />
              <ThemeToggleButton className="bg-white/10 text-white border-white/20 hover:bg-white/20 hover:text-white" />
              <a
                href="/auth/signup"
                className="hidden md:flex items-center gap-2 px-4 py-2 rounded-lg bg-brand-teal text-white text-sm font-semibold hover:bg-teal-600 transition-colors shadow"
              >
                Get Access <ArrowRight className="w-4 h-4" />
              </a>
            </div>
          </header>

          {/* Hero Content */}
          <div className="flex-1 flex flex-col lg:flex-row items-center justify-center gap-12 pb-16">
            {/* Left — headline */}
            <motion.div
              initial="hidden" animate="visible" variants={stagger}
              className="flex-1 max-w-2xl"
            >
              <motion.div variants={fadeUp}>
                
              </motion.div>
              <motion.h1 variants={fadeUp} className="text-5xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-white leading-tight drop-shadow-lg">
                Navigate the<br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-teal to-blue-400">
                  future of shipping.
                </span>
              </motion.h1>
              <motion.p variants={fadeUp} className="text-lg sm:text-xl text-white/85 leading-relaxed mt-5 font-medium max-w-xl">
                PortPilot is the AI-driven operating system for modern maritime terminals. Eliminate congestion, optimize berth allocations, and track turnaround times in real-time.
              </motion.p>
              <motion.div variants={fadeUp} className="flex flex-wrap gap-4 mt-8">
                <a href="/auth/signup"
                  className="flex items-center gap-2 px-6 py-3 rounded-xl bg-brand-teal text-white font-bold hover:bg-teal-600 transition-colors shadow-lg text-sm"
                >
                  Start Free Trial <ArrowRight className="w-4 h-4" />
                </a>
                <a href="#features"
                  className="flex items-center gap-2 px-6 py-3 rounded-xl bg-white/10 backdrop-blur-sm border border-white/20 text-white font-semibold hover:bg-white/20 transition-colors text-sm"
                >
                  Explore Features <ChevronDown className="w-4 h-4" />
                </a>
              </motion.div>
              {/* Trust badges */}
              <motion.div variants={fadeUp} className="flex flex-wrap items-center gap-5 mt-10 text-white/60 text-xs font-semibold uppercase tracking-wide">
                <span className="flex items-center gap-1.5"><Lock className="w-3.5 h-3.5" /> SOC 2 Certified</span>
                <span className="flex items-center gap-1.5"><Globe className="w-3.5 h-3.5" /> 30+ Ports Globally</span>
                <span className="flex items-center gap-1.5"><Activity className="w-3.5 h-3.5" /> 99.9% Uptime SLA</span>
              </motion.div>
            </motion.div>

            {/* Right — Login Card */}
            <motion.div
              id="login-panel"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.35, type: 'spring' }}
              className="w-full max-w-md"
            >
              <div className="bg-white/96 backdrop-blur-xl border border-white/20 rounded-2xl p-6 relative overflow-hidden shadow-modal">

                <div className="flex bg-slate-100/90 p-1.5 rounded-xl border border-slate-200/80 mb-6 shadow-inner">
                  <button
                    type="button"
                    onClick={() => setIsLoginMode(true)}
                    className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-all duration-200 text-center ${
                      isLoginMode
                        ? 'bg-white shadow-sm text-brand-teal'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    Log In
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsLoginMode(false)}
                    className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-all duration-200 text-center ${
                      !isLoginMode
                        ? 'bg-white shadow-sm text-brand-teal'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    Sign Up
                  </button>
                </div>

                <div className="space-y-3">
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-2">Select your portal</p>

                  <button
                    onClick={() => navigate(isLoginMode ? '/auth/login?role=admin' : '/auth/signup?role=admin')}
                    className="w-full p-4 rounded-xl border border-slate-200/90 hover:border-brand-teal/80 bg-white hover:bg-teal-50/20 transition-all duration-200 group flex items-center justify-between text-left shadow-xs hover:shadow-md cursor-pointer active:scale-[0.99]"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-teal-50 text-brand-teal flex items-center justify-center shrink-0 group-hover:bg-brand-teal group-hover:text-white group-hover:shadow-sm transition-all duration-200">
                        <Shield className="w-6 h-6" />
                      </div>
                      <div>
                        <div className="font-bold text-slate-900 group-hover:text-brand-teal transition-colors text-sm">Port Admin</div>
                        <div className="text-xs text-slate-500 mt-0.5 font-medium">Full terminal & AI control</div>
                      </div>
                    </div>
                    <ArrowRight className="w-5 h-5 text-slate-400 group-hover:text-brand-teal transition-transform duration-200 group-hover:translate-x-1.5" />
                  </button>

                  <button
                    onClick={() => navigate(isLoginMode ? '/auth/login?role=ship-agent' : '/auth/signup?role=ship-agent')}
                    className="w-full p-4 rounded-xl border border-slate-200/90 hover:border-brand-blue/80 bg-white hover:bg-blue-50/20 transition-all duration-200 group flex items-center justify-between text-left shadow-xs hover:shadow-md cursor-pointer active:scale-[0.99]"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-blue-50 text-brand-blue flex items-center justify-center shrink-0 group-hover:bg-brand-blue group-hover:text-white group-hover:shadow-sm transition-all duration-200">
                        <Anchor className="w-6 h-6" />
                      </div>
                      <div>
                        <div className="font-bold text-slate-900 group-hover:text-brand-blue transition-colors text-sm">Ship Agent</div>
                        <div className="text-xs text-slate-500 mt-0.5 font-medium">Schedules & berth requests</div>
                      </div>
                    </div>
                    <ArrowRight className="w-5 h-5 text-slate-400 group-hover:text-brand-blue transition-transform duration-200 group-hover:translate-x-1.5" />
                  </button>

                  <div className="relative flex py-3 items-center">
                    <div className="flex-grow border-t border-slate-200" />
                    <span className="flex-shrink mx-4 text-[10px] uppercase tracking-widest text-slate-400 font-bold">or continue with</span>
                    <div className="flex-grow border-t border-slate-200" />
                  </div>

                  {googleError && (
                    <div className="mb-3">
                      <AuthErrorAlert message={googleError} onDismiss={() => setGoogleError(null)} />
                    </div>
                  )}

                  <GoogleSignInButton
                    onSuccess={(idToken) => handleGoogleSignIn(idToken)}
                    onError={(err) => setGoogleError(err?.message || 'Failed to initiate Google sign-in. Please try again.')}
                    isLoading={isGoogleLoading}
                  />

                  <p className="text-center text-[11px] text-slate-400 mt-3 leading-relaxed">
                    By signing in you agree to our{' '}
                    <a href="#" className="text-brand-teal hover:underline font-semibold">Terms of Service</a> and{' '}
                    <a href="#" className="text-brand-teal hover:underline font-semibold">Privacy Policy</a>.
                  </p>
                </div>
              </div>
            </motion.div>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center gap-2 text-white/50 text-xs">
          <ChevronDown className="w-5 h-5 animate-bounce" />
        </div>
      </section>

      {/* ─── 2. STATS BAR ─────────────────────────────────────────────────── */}
      <section className="bg-white border-y border-border-subtle relative z-20">
        <div className="max-w-7xl mx-auto px-6 py-10">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 divide-x divide-border-subtle">
            {[
              { value: '40%', label: 'Wait Time Reduction', icon: Clock },
              { value: '10K+', label: 'Vessels Managed', icon: Ship },
              { value: '99.9%', label: 'System Uptime', icon: Activity },
              { value: '$2M+', label: 'Demurrage Saved', icon: TrendingUp },
            ].map(({ value, label, icon: Icon }) => (
              <div key={label} className="text-center px-4 flex flex-col items-center gap-2">
                <Icon className="w-6 h-6 text-brand-teal mb-1" />
                <div className="text-4xl font-extrabold text-text-main">{value}</div>
                <div className="text-xs font-semibold text-text-muted uppercase tracking-wide">{label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── 3. FEATURES ──────────────────────────────────────────────────── */}
      <section id="features" className="py-28 bg-canvas relative z-20">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <span className="inline-block text-xs font-bold uppercase tracking-widest text-brand-teal mb-3">Core Platform</span>
            <h2 className="text-3xl sm:text-4xl font-bold text-text-main tracking-tight">Intelligence at every dock.</h2>
            <p className="text-text-muted mt-4 text-lg leading-relaxed">PortPilot replaces whiteboards and spreadsheets with predictive AI, giving port authorities complete visibility over every operation.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                icon: BarChart3,
                color: 'teal',
                bg: 'bg-teal-50', fg: 'text-brand-teal', hbg: 'group-hover:bg-brand-teal',
                title: 'Predictive Forecasting',
                desc: 'ML models predict berth congestion up to 72 hours ahead, letting you intercept bottlenecks before they happen and pre-position resources intelligently.',
                checks: ['72-hour congestion horizon', 'Bottleneck driver analysis', 'Weather-aware modelling'],
              },
              {
                icon: CloudCog,
                color: 'blue',
                bg: 'bg-blue-50', fg: 'text-brand-blue', hbg: 'group-hover:bg-brand-blue',
                title: 'What-If Simulator',
                desc: 'Simulate disasters like crane failures or extreme weather. The AI instantly generates recovery plans to minimise operational impact and financial loss.',
                checks: ['Instant impact projection', 'Autonomous recovery plans', 'Multi-scenario comparison'],
              },
              {
                icon: Zap,
                color: 'emerald',
                bg: 'bg-emerald-50', fg: 'text-emerald-600', hbg: 'group-hover:bg-emerald-600',
                title: 'AI Berth Optimizer',
                desc: 'OR-Tools optimizer instantly calculates the best configuration of cranes and berths, slashing wait times and maximising throughput per tide window.',
                checks: ['Dynamic crane reallocation', 'Demurrage cost savings', 'Tide-aware scheduling'],
              },
              {
                icon: Brain,
                color: 'purple',
                bg: 'bg-purple-50', fg: 'text-purple-600', hbg: 'group-hover:bg-purple-600',
                title: 'AI Copilot',
                desc: 'Ask questions in natural language and get instant answers about vessel ETAs, berth status, crane availability, and port KPIs — no dashboards needed.',
                checks: ['Natural language queries', 'Live data answers', 'Proactive anomaly alerts'],
              },
              {
                icon: Navigation,
                color: 'orange',
                bg: 'bg-orange-50', fg: 'text-orange-600', hbg: 'group-hover:bg-orange-600',
                title: 'Route Intelligence',
                desc: 'Track inbound and outbound vessel routes in real-time. Auto-flag late arrivals and reroute berth assignments before downstream disruptions cascade.',
                checks: ['AIS live tracking', 'ETA recalculation engine', 'Auto berth re-assignment'],
              },
              {
                icon: AlertTriangle,
                color: 'red',
                bg: 'bg-red-50', fg: 'text-op-red', hbg: 'group-hover:bg-op-red',
                title: 'Smart Alerts',
                desc: 'Context-aware alert engine sends proactive notifications with severity triage, reducing alert fatigue and ensuring the right people act at the right time.',
                checks: ['Severity auto-triage', 'Role-based routing', 'Escalation workflows'],
              },
            ].map(({ icon: Icon, bg, fg, hbg, title, desc, checks }) => (
              <motion.div
                key={title}
                whileHover={{ y: -4 }}
                className="group bg-white p-7 rounded-2xl border border-border-subtle shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-elevated transition-all"
              >
                <div className={`w-14 h-14 ${bg} ${fg} rounded-xl flex items-center justify-center mb-5 transition-colors ${hbg} group-hover:text-white`}>
                  <Icon className="w-7 h-7" />
                </div>
                <h3 className="text-lg font-bold text-text-main mb-3">{title}</h3>
                <p className="text-text-muted leading-relaxed text-sm mb-5">{desc}</p>
                <ul className="space-y-2">
                  {checks.map(c => (
                    <li key={c} className="flex items-center gap-2 text-sm font-medium text-text-main">
                      <CheckCircle2 className={`w-4 h-4 ${fg} shrink-0`} /> {c}
                    </li>
                  ))}
                </ul>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── 4. HOW IT WORKS ──────────────────────────────────────────────── */}
      <section id="how-it-works" className="py-28 bg-white border-t border-border-subtle relative z-20">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <span className="inline-block text-xs font-bold uppercase tracking-widest text-brand-teal mb-3">Process</span>
            <h2 className="text-3xl sm:text-4xl font-bold text-text-main tracking-tight">From vessel to berth in minutes.</h2>
            <p className="text-text-muted mt-4 text-lg">A seamless, intelligent workflow that connects every stakeholder.</p>
          </div>

          <div className="relative">
            {/* Connector line desktop */}
            <div className="hidden md:block absolute top-10 left-[12.5%] right-[12.5%] h-0.5 bg-gradient-to-r from-brand-teal via-brand-blue to-emerald-500 z-0" />

            <div className="grid grid-cols-1 md:grid-cols-4 gap-8 relative z-10">
              {[
                { step: '01', icon: Waves, title: 'Vessel Approach', desc: 'AIS data feeds vessel position and ETA in real-time as ships enter port waters.' },
                { step: '02', icon: Container, title: 'Berth Request', desc: 'Ship agents submit berth requests with cargo manifests through the self-service portal.' },
                { step: '03', icon: Brain, title: 'AI Allocation', desc: 'The optimizer calculates the ideal berth, crane configuration, and time slot in seconds.' },
                { step: '04', icon: CheckCircle2, title: 'Departure', desc: 'All parties notified. Real-time updates throughout, with KPIs captured for analytics.' },
              ].map(({ step, icon: Icon, title, desc }) => (
                <div key={step} className="flex flex-col items-center text-center">
                  <div className="w-20 h-20 rounded-full bg-canvas border-2 border-brand-teal flex flex-col items-center justify-center mb-5 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
                    <Icon className="w-7 h-7 text-brand-teal" />
                  </div>
                  <span className="text-xs font-bold text-brand-teal uppercase tracking-widest mb-1">{step}</span>
                  <h4 className="text-base font-bold text-text-main mb-2">{title}</h4>
                  <p className="text-sm text-text-muted leading-relaxed">{desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ─── 5. DUAL PORTALS ──────────────────────────────────────────────── */}
      <section id="roles" className="py-28 bg-canvas border-t border-border-subtle relative z-20">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <span className="inline-block text-xs font-bold uppercase tracking-widest text-brand-teal mb-3">Two Portals</span>
            <h2 className="text-3xl sm:text-4xl font-bold text-text-main tracking-tight">Built for every stakeholder.</h2>
            <p className="text-text-muted mt-4 text-lg">Dedicated interfaces for port authorities and shipping agencies — with role-based access, data visibility, and workflows.</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Port Admin Card */}
            <div className="bg-white rounded-2xl border border-border-subtle shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden">
              <div className="h-2 bg-gradient-to-r from-brand-teal to-teal-400" />
              <div className="p-8">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-14 h-14 rounded-xl bg-teal-50 text-brand-teal flex items-center justify-center">
                    <Building2 className="w-7 h-7" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-text-main">Port Authority Portal</h3>
                    <p className="text-sm text-text-muted font-medium">Full operational control</p>
                  </div>
                </div>
                <ul className="space-y-3 mb-8">
                  {[
                    'Real-time berth occupancy dashboard',
                    'AI optimizer & what-if simulator',
                    'Crane and yard equipment management',
                    'Predictive 72-hour congestion forecast',
                    'Full analytics & KPI reporting',
                    'Alert management & escalation tools',
                    'AI Copilot for instant insights',
                  ].map(item => (
                    <li key={item} className="flex items-start gap-3 text-sm text-text-main">
                      <CheckCircle2 className="w-4 h-4 text-brand-teal mt-0.5 shrink-0" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
                <button
                  onClick={() => handleDemoLogin('admin')}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-brand-teal text-white font-bold hover:bg-teal-600 transition-colors text-sm shadow cursor-pointer"
                >
                  Enter Port Admin Demo <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Ship Agent Card */}
            <div className="bg-white rounded-2xl border border-border-subtle shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden">
              <div className="h-2 bg-gradient-to-r from-brand-blue to-blue-400" />
              <div className="p-8">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-14 h-14 rounded-xl bg-blue-50 text-brand-blue flex items-center justify-center">
                    <Ship className="w-7 h-7" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-text-main">Ship Agent Portal</h3>
                    <p className="text-sm text-text-muted font-medium">Self-service vessel management</p>
                  </div>
                </div>
                <ul className="space-y-3 mb-8">
                  {[
                    'Submit & track berth requests online',
                    'Real-time vessel arrival & departure schedule',
                    'Cargo manifest & documentation upload',
                    'Automated status notifications',
                    'Berth allocation status & ETA updates',
                    'Direct messaging with port authority',
                    'AI Copilot for schedule queries',
                  ].map(item => (
                    <li key={item} className="flex items-start gap-3 text-sm text-text-main">
                      <CheckCircle2 className="w-4 h-4 text-brand-blue mt-0.5 shrink-0" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
                <button
                  onClick={() => handleDemoLogin('ship-agent')}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-brand-blue text-white font-bold hover:bg-blue-600 transition-colors text-sm shadow cursor-pointer"
                >
                  Enter Ship Agent Demo <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── 6. TESTIMONIALS ──────────────────────────────────────────────── */}
      <section id="testimonials" className="py-28 bg-white border-t border-border-subtle relative z-20">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <span className="inline-block text-xs font-bold uppercase tracking-widest text-brand-teal mb-3">Testimonials</span>
            <h2 className="text-3xl sm:text-4xl font-bold text-text-main tracking-tight">Trusted by terminal operators.</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                quote: 'PortPilot reduced our average vessel turnaround by 38%. The AI optimizer alone paid for the annual subscription in the first month.',
                name: 'James Harrington',
                role: 'Director of Operations, Meridian Terminals',
              },
              {
                quote: 'The berth request portal is a game-changer. We no longer waste hours on phone calls — everything is tracked and confirmed digitally.',
                name: 'Priya Nair',
                role: 'Senior Ship Agent, BlueSea Logistics',
              },
              {
                quote: 'The congestion forecasting has transformed how we staff the yard. We now pre-position crews 48 hours ahead with confidence.',
                name: 'Carlos Mendes',
                role: 'Port Operations Manager, Atlantic Gateway',
              },
            ].map(({ quote, name, role }) => (
              <div key={name} className="bg-canvas p-7 rounded-2xl border border-border-subtle shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex flex-col gap-5">
                <div className="flex gap-1">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />
                  ))}
                </div>
                <p className="text-sm text-text-muted leading-relaxed flex-1">"{quote}"</p>
                <div>
                  <div className="font-bold text-text-main text-sm">{name}</div>
                  <div className="text-xs text-text-caption mt-0.5">{role}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── 7. ENTERPRISE / SECURITY ─────────────────────────────────────── */}
      <section className="py-24 bg-canvas border-t border-border-subtle relative z-20">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div>
              <span className="inline-block text-xs font-bold uppercase tracking-widest text-brand-teal mb-4">Enterprise Grade</span>
              <h2 className="text-3xl sm:text-4xl font-bold text-text-main tracking-tight mb-6">Security and compliance you can trust.</h2>
              <p className="text-text-muted leading-relaxed mb-8 text-base">
                PortPilot is built on ISO 27001 and SOC 2 Type II certified infrastructure. Your operational data is encrypted at rest and in transit, with fine-grained role-based access control across every module.
              </p>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { icon: Lock, label: 'AES-256 Encryption' },
                  { icon: Shield, label: 'SOC 2 Type II' },
                  { icon: Users, label: 'Role-Based Access' },
                  { icon: Globe, label: 'GDPR Compliant' },
                  { icon: Activity, label: '99.9% SLA Uptime' },
                  { icon: Clock, label: '24/7 Support Desk' },
                ].map(({ icon: Icon, label }) => (
                  <div key={label} className="flex items-center gap-3 bg-white rounded-xl border border-border-subtle p-4 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
                    <Icon className="w-5 h-5 text-brand-teal shrink-0" />
                    <span className="text-sm font-semibold text-text-main">{label}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {[
                { metric: '< 200ms', label: 'Average API Response', sub: 'p95 latency globally' },
                { metric: '72 hrs', label: 'Forecast Horizon', sub: 'ML congestion prediction' },
                { metric: '30+', label: 'Active Port Terminals', sub: 'across 4 continents' },
                { metric: '100%', label: 'Data Sovereignty', sub: 'Regional data residency options' },
              ].map(({ metric, label, sub }) => (
                <div key={label} className="bg-white rounded-2xl border border-border-subtle p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
                  <div className="text-3xl font-extrabold text-text-main mb-1">{metric}</div>
                  <div className="text-sm font-bold text-text-main">{label}</div>
                  <div className="text-xs text-text-muted mt-1">{sub}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ─── 8. CTA BANNER ────────────────────────────────────────────────── */}
      <section className="py-24 bg-gradient-to-br from-[#0EA5A8] to-[#3478C9] relative z-20 overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 left-0 w-96 h-96 rounded-full bg-white blur-3xl -translate-x-1/2 -translate-y-1/2" />
          <div className="absolute bottom-0 right-0 w-96 h-96 rounded-full bg-white blur-3xl translate-x-1/2 translate-y-1/2" />
        </div>
        <div className="max-w-3xl mx-auto px-6 text-center relative z-10">
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight mb-5">
            Ready to modernise your port operations?
          </h2>
          <p className="text-white/85 text-lg leading-relaxed mb-8">
            Join 30+ terminals worldwide using PortPilot to reduce congestion, save millions in demurrage, and give every stakeholder real-time visibility.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={() => handleDemoLogin('admin')}
              className="flex items-center gap-2 px-8 py-3.5 rounded-xl bg-white text-brand-teal font-bold hover:bg-slate-50 transition-colors shadow-lg text-sm cursor-pointer"
            >
              Try Port Admin Demo <ArrowRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => handleDemoLogin('ship-agent')}
              className="flex items-center gap-2 px-8 py-3.5 rounded-xl bg-white/15 border border-white/30 text-white font-bold hover:bg-white/25 transition-colors text-sm cursor-pointer"
            >
              Try Ship Agent Demo <Anchor className="w-4 h-4" />
            </button>
          </div>
        </div>
      </section>

      {/* ─── 9. FOOTER ────────────────────────────────────────────────────── */}
      <footer className="bg-white border-t border-border-subtle py-14 relative z-20">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-10 mb-10">
            <div className="md:col-span-1">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-9 h-9 rounded-lg bg-brand-teal flex items-center justify-center">
                  <Ship className="w-4 h-4 text-white" />
                </div>
                <span className="font-bold text-text-main text-lg tracking-tight">PortPilot</span>
              </div>
              <p className="text-sm text-text-muted leading-relaxed">The AI-powered operating system for modern maritime terminals.</p>
            </div>

            {[
              {
                heading: 'Platform',
                links: [
                  { label: 'Dashboard', href: '#' },
                  { label: 'Berth Optimizer', href: '#' },
                  { label: 'Forecast', href: '#' },
                  { label: 'Simulator', href: '#' },
                  { label: 'AI Copilot', href: '#' },
                  { label: 'Analytics', href: '#' },
                ],
              },
              {
                heading: 'Company',
                links: [
                  { label: 'About Us', href: '#' },
                  { label: 'Careers', href: '#' },
                  { label: 'Blog', href: '#' },
                  { label: 'Press', href: '#' },
                  { label: 'Partners', href: '#' },
                ],
              },
              {
                heading: 'Administration',
                links: [
                  { label: 'Super Admin Portal', href: '/super-admin' },
                  { label: 'Privacy Policy', href: '#' },
                  { label: 'Terms of Service', href: '#' },
                  { label: 'Security', href: '#' },
                ],
              },
            ].map(({ heading, links }) => (
              <div key={heading}>
                <h5 className="text-xs font-bold uppercase tracking-widest text-text-caption mb-4">{heading}</h5>
                <ul className="space-y-2">
                  {links.map(link => (
                    <li key={link.label}>
                      {link.href.startsWith('/') ? (
                        <Link to={link.href} className="text-sm text-text-muted hover:text-brand-teal transition-colors font-medium">
                          {link.label}
                        </Link>
                      ) : (
                        <a href={link.href} className="text-sm text-text-muted hover:text-brand-teal transition-colors font-medium">
                          {link.label}
                        </a>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="border-t border-border-subtle pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-sm text-text-muted font-medium">
              &copy; {new Date().getFullYear()} PortPilot Systems. All rights reserved.
            </div>
            <div className="flex items-center gap-6 text-sm font-medium text-text-muted">
              <a href="#" className="hover:text-brand-teal transition-colors">Privacy</a>
              <a href="#" className="hover:text-brand-teal transition-colors">Terms</a>
              <a href="#" className="hover:text-brand-teal transition-colors">Support</a>
            </div>
          </div>
        </div>
      </footer>

      {/* Role Selection Modal */}
      {showRoleSelector && (
        <RoleSelector
          onSelectRole={handleRoleSelected}
        />
      )}
    </div>
  );
};
