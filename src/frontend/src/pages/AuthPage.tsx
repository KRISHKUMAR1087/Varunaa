import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import {
  Ship, Shield, Anchor, ArrowLeft,
  Eye, EyeOff, Mail, Lock, User as UserIcon
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { GoogleSignInButton } from '../components/auth/GoogleSignInButton';
import { RoleSelector } from '../components/auth/RoleSelector';
import { AuthErrorAlert } from '../components/auth/AuthErrorAlert';
import { ThemeToggleButton } from '../components/common/ThemeToggleButton';
import { MusicButton } from '../components/common/MusicButton';
import { UserRole } from '../types/auth';
import { motion } from 'framer-motion';

interface AuthPageProps {
  mode: 'login' | 'signup';
}

export const AuthPage: React.FC<AuthPageProps> = ({ mode }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { loginWithGoogleToken, confirmRoleSelection, login, signup, loginAsDemo } = useAuth();

  const isLogin = mode === 'login';

  // Role selection — default from URL or 'admin'
  const queryParams = new URLSearchParams(location.search);
  const initialRole = (queryParams.get('role') as UserRole) || 'admin';
  const [selectedRole, setSelectedRole] = useState<UserRole>(initialRole);
  const [error, setError] = useState('');

  // Login fields
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPw, setShowLoginPw] = useState(false);

  // Signup fields
  const [signupName, setSignupName] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [signupConfirm, setSignupConfirm] = useState('');
  const [showSignupPw, setShowSignupPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Google
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [showRoleSelector, setShowRoleSelector] = useState(false);

  // ─── helpers ────────────────────────────────────────────────────────────

  const getRedirectPath = (role: UserRole) => {
    const state = location.state as { from?: { pathname: string } } | null;
    const from = state?.from?.pathname;
    if (from && from !== '/' && from !== '/auth/login' && from !== '/auth/signup') {
      if (role === 'admin' && !from.startsWith('/shipping')) return from;
      if (role === 'ship-agent' && from.startsWith('/shipping')) return from;
    }
    return role === 'admin' ? '/dashboard' : '/shipping/dashboard';
  };


  const handleGoogleSignIn = async (idToken: string) => {
    setIsGoogleLoading(true);
    setError('');
    try {
      const pendingRole = localStorage.getItem('pending_google_role') as UserRole | null || selectedRole;
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
      setError(e.message || 'Google sign-in failed. Please try again.');
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const handleRoleSelected = async (role: UserRole) => {
    const confirmed = await confirmRoleSelection(role);
    setShowRoleSelector(false);
    if (confirmed.role === 'admin') {
      navigate('/onboarding', { replace: true });
    } else {
      navigate(getRedirectPath(confirmed.role), { replace: true });
    }
  };

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!isLogin) {
      if (!signupName.trim()) errs.name = 'Full name is required.';
      if (!signupEmail.trim()) errs.email = 'Email is required.';
      else if (!/\S+@\S+\.\S+/.test(signupEmail)) errs.email = 'Enter a valid email address.';
      if (!signupPassword) errs.password = 'Password is required.';
      else if (signupPassword.length < 8) errs.password = 'Minimum 8 characters.';
      if (!signupConfirm) errs.confirm = 'Please confirm your password.';
      else if (signupPassword !== signupConfirm) errs.confirm = 'Passwords do not match.';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    
    setError('');
    
    try {
      if (isLogin) {
        const user = await login(loginEmail, loginPassword);
        navigate(getRedirectPath(user.role), { replace: true });
      } else {
        const user = await signup(signupName, signupEmail, signupPassword, selectedRole);
        if (user.role === 'admin') {
          navigate('/onboarding', { replace: true });
        } else {
          navigate(getRedirectPath(user.role), { replace: true });
        }
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed');
    }
  };

  const handleDemoLogin = async () => {
    setError('');
    const demoUser = await loginAsDemo(selectedRole);
    navigate(getRedirectPath(demoUser.role), { replace: true });
  };

  // ─── derived ─────────────────────────────────────────────────────────────

  const isAdmin = selectedRole === 'admin';
  const roleLabel = isAdmin ? 'Port Admin' : 'Ship Agent';
  const accentBtn = isAdmin ? 'bg-brand-teal hover:bg-teal-600' : 'bg-brand-blue hover:bg-blue-600';
  const accentRing = isAdmin ? 'focus:ring-brand-teal/30' : 'focus:ring-brand-blue/30';

  // ─── render ──────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-canvas flex flex-col relative overflow-hidden">
      {/* Subtle ambient light gradient in background */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[90vw] max-w-[800px] h-[35vh] max-h-[350px] bg-gradient-to-b from-teal-500/5 via-blue-500/5 to-transparent blur-3xl pointer-events-none" />

      {/* Header */}
      <header className="w-full max-w-7xl mx-auto px-6 py-5 flex items-center justify-between shrink-0 relative z-10">
        <Link to="/" className="flex items-center gap-2.5 group">
          <div className="w-9 h-9 rounded-xl bg-brand-teal flex items-center justify-center shadow-[0_8px_30px_rgb(0,0,0,0.04)] group-hover:scale-105 transition-transform duration-200">
            <Ship className="w-4 h-4 text-white" />
          </div>
          <span className="text-xl font-bold tracking-tight text-text-main group-hover:text-brand-teal transition-colors">Varunaa</span>
        </Link>
        <div className="flex items-center gap-3">
          <MusicButton />
          <ThemeToggleButton />
          <Link
            to="/"
            className="flex items-center gap-1.5 text-sm font-semibold text-text-muted hover:text-brand-teal transition-colors px-3 py-1.5 rounded-lg hover:bg-surface-subtle"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Home
          </Link>
        </div>
      </header>

      {/* Body */}
      <div className="flex-1 flex items-center justify-center px-4 py-10 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
          className="w-full max-w-md"
        >
          {/* ── Role toggle — outside the card ── */}
          <div className="flex bg-surface-subtle rounded-2xl p-1.5 mb-5 border border-border-subtle shadow-xs">
            <button
              type="button"
              onClick={() => setSelectedRole('admin')}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-bold text-center rounded-xl transition-all duration-200 cursor-pointer ${
                isAdmin
                  ? 'bg-surface shadow-sm text-brand-teal'
                  : 'text-text-muted hover:text-text-main'
              }`}
            >
              <Shield className="w-4 h-4" />
              Port Admin
            </button>
            <button
              type="button"
              onClick={() => setSelectedRole('ship-agent')}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-bold text-center rounded-xl transition-all duration-200 cursor-pointer ${
                !isAdmin
                  ? 'bg-surface shadow-sm text-brand-blue'
                  : 'text-text-muted hover:text-text-main'
              }`}
            >
              <Anchor className="w-4 h-4" />
              Ship Agent
            </button>
          </div>

          {/* ── Card ── */}
          <div className="bg-surface rounded-2xl border border-border-subtle shadow-modal overflow-hidden">

            {/* ── Log In / Sign Up tabs ── */}
            <div className="flex border-b border-border-subtle bg-surface-subtle/50">
              <Link
                to="/auth/login"
                className={`flex-1 flex items-center justify-center gap-2 py-3.5 text-sm font-bold transition-all duration-200 border-b-2 -mb-px cursor-pointer ${
                  isLogin
                    ? (isAdmin ? 'border-brand-teal text-brand-teal bg-surface shadow-xs' : 'border-brand-blue text-brand-blue bg-surface shadow-xs')
                    : 'border-transparent text-text-muted hover:text-text-main bg-surface-subtle/70 hover:bg-surface-subtle'
                }`}
              >
                Log In
              </Link>
              <Link
                to="/auth/signup"
                className={`flex-1 flex items-center justify-center gap-2 py-3.5 text-sm font-bold transition-all duration-200 border-b-2 -mb-px cursor-pointer ${
                  !isLogin
                    ? (isAdmin ? 'border-brand-teal text-brand-teal bg-surface shadow-xs' : 'border-brand-blue text-brand-blue bg-surface shadow-xs')
                    : 'border-transparent text-text-muted hover:text-text-main bg-surface-subtle/70 hover:bg-surface-subtle'
                }`}
              >
                Sign Up
              </Link>
            </div>

            {/* ── Form ── */}
            <div className="p-7">

              <div className="mb-6">
                <h1 className="text-xl font-extrabold text-text-main tracking-tight">
                  {isLogin ? `Sign in as ${roleLabel}` : `Create ${roleLabel} account`}
                </h1>
                <p className="text-sm text-text-muted mt-1">
                  {isLogin
                    ? 'Enter your credentials to access your workspace.'
                    : 'Fill in the details below to get started.'}
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                {error && <AuthErrorAlert message={error} onDismiss={() => setError('')} />}

                {/* Full Name — signup only */}
                {!isLogin && (
                  <div>
                    <label className="block text-xs font-semibold text-text-main mb-1.5">Full Name</label>
                    <div className="relative">
                      <UserIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-caption pointer-events-none" />
                      <input
                        type="text"
                        autoComplete="name"
                        placeholder="e.g. James Harrington"
                        value={signupName}
                        onChange={e => setSignupName(e.target.value)}
                        className={`w-full pl-10 pr-4 py-2.5 rounded-xl border text-sm placeholder:text-text-caption bg-surface-subtle text-text-main focus:outline-none focus:ring-2 ${accentRing} transition ${
                          errors.name ? 'border-op-red' : 'border-border-subtle hover:border-border-hover'
                        }`}
                      />
                    </div>
                    {errors.name && <p className="text-xs text-op-red mt-1 font-medium">{errors.name}</p>}
                  </div>
                )}

                {/* Email */}
                <div>
                  <label className="block text-xs font-semibold text-text-main mb-1.5">Email Address</label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-caption pointer-events-none" />
                    <input
                      type="email"
                      autoComplete="email"
                      placeholder="you@company.com"
                      value={isLogin ? loginEmail : signupEmail}
                      onChange={e => isLogin ? setLoginEmail(e.target.value) : setSignupEmail(e.target.value)}
                      className={`w-full pl-10 pr-4 py-2.5 rounded-xl border text-sm placeholder:text-text-caption bg-surface-subtle text-text-main focus:outline-none focus:ring-2 ${accentRing} transition ${
                        errors.email ? 'border-op-red' : 'border-border-subtle hover:border-border-hover'
                      }`}
                    />
                  </div>
                  {errors.email && <p className="text-xs text-op-red mt-1 font-medium">{errors.email}</p>}
                </div>

                {/* Password */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-semibold text-text-main">Password</label>
                    {isLogin && (
                      <button type="button" className="text-xs text-brand-teal font-semibold hover:underline">
                        Forgot password?
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-caption pointer-events-none" />
                    <input
                      type={isLogin ? (showLoginPw ? 'text' : 'password') : (showSignupPw ? 'text' : 'password')}
                      autoComplete={isLogin ? 'current-password' : 'new-password'}
                      placeholder={isLogin ? 'Your password' : 'Min. 8 characters'}
                      value={isLogin ? loginPassword : signupPassword}
                      onChange={e => isLogin ? setLoginPassword(e.target.value) : setSignupPassword(e.target.value)}
                      className={`w-full pl-10 pr-10 py-2.5 rounded-xl border text-sm placeholder:text-text-caption bg-surface-subtle text-text-main focus:outline-none focus:ring-2 ${accentRing} transition ${
                        errors.password ? 'border-op-red' : 'border-border-subtle hover:border-border-hover'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => isLogin ? setShowLoginPw(v => !v) : setShowSignupPw(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-text-caption hover:text-text-main transition-colors"
                    >
                      {(isLogin ? showLoginPw : showSignupPw) ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {errors.password && <p className="text-xs text-op-red mt-1 font-medium">{errors.password}</p>}
                </div>

                {/* Confirm Password — signup only */}
                {!isLogin && (
                  <div>
                    <label className="block text-xs font-semibold text-text-main mb-1.5">Confirm Password</label>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-caption pointer-events-none" />
                      <input
                        type={showConfirmPw ? 'text' : 'password'}
                        autoComplete="new-password"
                        placeholder="Re-enter your password"
                        value={signupConfirm}
                        onChange={e => setSignupConfirm(e.target.value)}
                        className={`w-full pl-10 pr-10 py-2.5 rounded-xl border text-sm placeholder:text-text-caption bg-surface-subtle text-text-main focus:outline-none focus:ring-2 ${accentRing} transition ${
                          errors.confirm ? 'border-op-red' : 'border-border-subtle hover:border-border-hover'
                        }`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPw(v => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-text-caption hover:text-text-main transition-colors"
                      >
                        {showConfirmPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    {errors.confirm && <p className="text-xs text-op-red mt-1 font-medium">{errors.confirm}</p>}
                  </div>
                )}

                {/* Submit */}
                <button
                  type="submit"
                  className={`w-full py-3 rounded-xl font-bold text-sm text-white transition-all duration-200 shadow-sm hover:shadow-md cursor-pointer active:scale-[0.99] mt-2 ${accentBtn}`}
                >
                  {isLogin ? `Sign In as ${roleLabel}` : `Create ${roleLabel} Account`}
                </button>
              </form>

              {/* Divider */}
              <div className="relative flex items-center my-5">
                <div className="flex-grow border-t border-slate-200" />
                <span className="flex-shrink mx-4 text-[10px] uppercase tracking-widest text-slate-400 font-bold">or</span>
                <div className="flex-grow border-t border-slate-200" />
              </div>

              <GoogleSignInButton
                role={selectedRole}
                onSuccess={(idToken) => handleGoogleSignIn(idToken)}
                onError={(err) => setError(err?.message || 'Google sign-in failed. Please try again.')}
                isLoading={isGoogleLoading}
              />

              <button
                type="button"
                onClick={handleDemoLogin}
                className="w-full mt-3 py-2.5 px-4 rounded-xl text-xs font-semibold text-text-main bg-surface-subtle hover:bg-surface border border-border-subtle hover:border-slate-300 transition-all flex items-center justify-center gap-2 shadow-xs hover:shadow-sm cursor-pointer active:scale-[0.99]"
              >
                {isAdmin ? <Shield className="w-4 h-4" /> : <Anchor className="w-4 h-4" />}
                <span>Continue with {roleLabel} Demo Data</span>
              </button>

              <div className="mt-4 pt-3 border-t border-border-subtle text-center">
                <Link
                  to="/super-admin"
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-500 hover:text-amber-600 bg-amber-500/10 hover:bg-amber-500/20 px-3 py-1.5 rounded-lg transition-colors"
                >
                  <Shield className="w-3.5 h-3.5" />
                  Super Admin Portal (super@portspilot.com)
                </Link>
              </div>

              <p className="text-center text-xs text-text-muted mt-4">
                {isLogin ? (
                  <>Don't have an account?{' '}
                    <Link to="/auth/signup" className="text-brand-teal font-semibold hover:underline">Sign up free</Link>
                  </>
                ) : (
                  <>Already have an account?{' '}
                    <Link to="/auth/login" className="text-brand-teal font-semibold hover:underline">Log in</Link>
                  </>
                )}
              </p>

              <p className="text-center text-[11px] text-slate-400 mt-3 leading-relaxed">
                By continuing you agree to our{' '}
                <a href="#" className="text-brand-teal hover:underline font-semibold">Terms of Service</a> and{' '}
                <a href="#" className="text-brand-teal hover:underline font-semibold">Privacy Policy</a>.
              </p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Google role modal */}
      {showRoleSelector && (
        <RoleSelector onSelectRole={handleRoleSelected} />
      )}
    </div>
  );
};

