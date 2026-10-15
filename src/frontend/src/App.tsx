import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { OperationsProvider } from './context/OperationsContext';
import { MusicProvider } from './context/MusicContext';
import { ThemeProvider } from './context/ThemeContext';
import { TimezoneProvider } from './context/TimezoneContext';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { AppShell } from './components/layout/AppShell';
import { ShippingAppShell } from './components/layout/ShippingAppShell';
import { RoleProtectedRoute } from './components/auth/RoleProtectedRoute';

// Port Operations / Admin Pages
const LoginPage = React.lazy(() => import('./pages/LoginPage').then(m => ({ default: m.LoginPage })));
const AuthPage = React.lazy(() => import('./pages/AuthPage').then(m => ({ default: m.AuthPage })));
const AuthCallbackPage = React.lazy(() => import('./pages/AuthCallbackPage').then(m => ({ default: m.AuthCallbackPage })));
const DashboardPage = React.lazy(() => import('./pages/DashboardPage').then(m => ({ default: m.DashboardPage })));
const VesselsPage = React.lazy(() => import('./pages/VesselsPage').then(m => ({ default: m.VesselsPage })));
const VesselDetailPage = React.lazy(() => import('./pages/VesselDetailPage').then(m => ({ default: m.VesselDetailPage })));
const BerthsPage = React.lazy(() => import('./pages/BerthsPage').then(m => ({ default: m.BerthsPage })));
const CranesPage = React.lazy(() => import('./pages/CranesPage').then(m => ({ default: m.CranesPage })));
const YardPage = React.lazy(() => import('./pages/YardPage').then(m => ({ default: m.YardPage })));
const OperationsBoardPage = React.lazy(() => import('./pages/OperationsBoardPage').then(m => ({ default: m.OperationsBoardPage })));
const ForecastPage = React.lazy(() => import('./pages/ForecastPage').then(m => ({ default: m.ForecastPage })));
const OptimizerPage = React.lazy(() => import('./pages/OptimizerPage').then(m => ({ default: m.OptimizerPage })));
const SimulatorPage = React.lazy(() => import('./pages/SimulatorPage').then(m => ({ default: m.SimulatorPage })));
const PlannerPage = React.lazy(() => import('./pages/PlannerPage').then(m => ({ default: m.PlannerPage })));
const RoutesPage = React.lazy(() => import('./pages/RoutesPage').then(m => ({ default: m.RoutesPage })));
const CopilotPage = React.lazy(() => import('./pages/CopilotPage').then(m => ({ default: m.CopilotPage })));
const AnalyticsPage = React.lazy(() => import('./pages/AnalyticsPage').then(m => ({ default: m.AnalyticsPage })));
const AlertsPage = React.lazy(() => import('./pages/AlertsPage').then(m => ({ default: m.AlertsPage })));
const SettingsPage = React.lazy(() => import('./pages/SettingsPage').then(m => ({ default: m.SettingsPage })));
const PortAdminSetupPage = React.lazy(() => import('./pages/PortAdminSetupPage').then(m => ({ default: m.PortAdminSetupPage })));
const SuperAdminPortalPage = React.lazy(() => import('./pages/SuperAdminPortalPage').then(m => ({ default: m.SuperAdminPortalPage })));
const DelayLabPage = React.lazy(() => import('./pages/DelayLabPage').then(m => ({ default: m.DelayLabPage })));
const VoyageTwinPage = React.lazy(() => import('./pages/VoyageTwinPage').then(m => ({ default: m.VoyageTwinPage })));
const ScenarioVerificationPage = React.lazy(() => import('./pages/ScenarioVerificationPage').then(m => ({ default: m.ScenarioVerificationPage })));

// Shipping Agency Pages
const ShippingDashboardPage = React.lazy(() => import('./pages/shipping/ShippingDashboardPage').then(m => ({ default: m.ShippingDashboardPage })));
const ShippingVesselsPage = React.lazy(() => import('./pages/shipping/ShippingVesselsPage').then(m => ({ default: m.ShippingVesselsPage })));
const ShippingAddVesselPage = React.lazy(() => import('./pages/shipping/ShippingAddVesselPage').then(m => ({ default: m.ShippingAddVesselPage })));
const ShippingVesselDetailPage = React.lazy(() => import('./pages/shipping/ShippingVesselDetailPage').then(m => ({ default: m.ShippingVesselDetailPage })));
const ShippingBerthRequestsPage = React.lazy(() => import('./pages/shipping/ShippingBerthRequestsPage').then(m => ({ default: m.ShippingBerthRequestsPage })));
const ShippingSchedulesPage = React.lazy(() => import('./pages/shipping/ShippingSchedulesPage').then(m => ({ default: m.ShippingSchedulesPage })));
const ShippingCargoPage = React.lazy(() => import('./pages/shipping/ShippingCargoPage').then(m => ({ default: m.ShippingCargoPage })));
const ShippingDocumentsPage = React.lazy(() => import('./pages/shipping/ShippingDocumentsPage').then(m => ({ default: m.ShippingDocumentsPage })));
const ShippingAlertsPage = React.lazy(() => import('./pages/shipping/ShippingAlertsPage').then(m => ({ default: m.ShippingAlertsPage })));
const ShippingCopilotPage = React.lazy(() => import('./pages/shipping/ShippingCopilotPage').then(m => ({ default: m.ShippingCopilotPage })));
const ShippingProfilePage = React.lazy(() => import('./pages/shipping/ShippingProfilePage').then(m => ({ default: m.ShippingProfilePage })));

/**
 * Directs authenticated users to their designated role portal home,
 * or unauthenticated users to /login.
 */
const RootRedirect: React.FC = () => {
  const { user, isAuthenticated, isLoading } = useAuth();
  const hasOAuthHash = typeof window !== 'undefined' && 
    Boolean(window.location.hash && (window.location.hash.includes('access_token=') || window.location.hash.includes('error=')));

  if (isLoading || hasOAuthHash) {
    return (
      <div className="min-h-screen bg-canvas flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-xs text-text-muted">
          <div className="w-5 h-5 border-2 border-brand-teal border-t-transparent rounded-full animate-spin" />
          <span>Verifying port authorization...</span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return <LoginPage />;
  }

  if (user.role === 'super-admin') {
    return <Navigate to="/super-admin" replace />;
  }

  if (user.role === 'ship-agent') {
    return <Navigate to="/shipping/dashboard" replace />;
  }

  return <Navigate to="/dashboard" replace />;
};

const SuperAdminGuard: React.FC = () => {
  const { user, loginAsDemo, isLoading } = useAuth();

  React.useEffect(() => {
    if (!isLoading && (!user || user.role !== 'super-admin')) {
      void loginAsDemo('super-admin');
    }
  }, [user, isLoading, loginAsDemo]);

  if (isLoading || !user || user.role !== 'super-admin') {
    return (
      <div className="min-h-screen bg-canvas flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-xs text-text-muted">
          <div className="w-5 h-5 border-2 border-brand-teal border-t-transparent rounded-full animate-spin" />
          <span>Opening Global Super Admin Portal...</span>
        </div>
      </div>
    );
  }

  return <SuperAdminPortalPage />;
};

/**
 * Catch-all fallback for undefined routes
 */
const CatchAllRedirect: React.FC = () => {
  const { user, isAuthenticated } = useAuth();

  if (!isAuthenticated || !user) {
    return <Navigate to="/" replace />;
  }

  if (user.role === 'super-admin') {
    return <Navigate to="/super-admin" replace />;
  }

  if (user.role === 'ship-agent') {
    return <Navigate to="/shipping/dashboard" replace />;
  }

  return <Navigate to="/dashboard" replace />;
};

export const App: React.FC = () => {
  return (
    <GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID || ''}>
      <ThemeProvider>
      <TimezoneProvider>
      <AuthProvider>
      <OperationsProvider>
        <MusicProvider>
          <BrowserRouter>
            <React.Suspense fallback={
              <div className="min-h-screen bg-canvas flex items-center justify-center">
                <div className="flex items-center gap-3 text-xs text-text-muted">
                  <div className="w-4 h-4 border-2 border-brand-teal border-t-transparent rounded-full animate-spin" />
                  <span>Loading...</span>
                </div>
              </div>
            }>
              <Routes>
                {/* Public Authentication Route */}
                <Route path="/login" element={<Navigate to="/" replace />} />
                <Route path="/auth/login" element={<AuthPage mode="login" />} />
                <Route path="/auth/signup" element={<AuthPage mode="signup" />} />
                <Route path="/auth/callback" element={<AuthCallbackPage />} />
                
                {/* Onboarding */}
                <Route element={<RoleProtectedRoute allowedRoles={['admin']} />}>
                  <Route path="/onboarding" element={<PortAdminSetupPage />} />
                </Route>
                
                {/* Super Admin Portal */}
                <Route path="/super-admin" element={<SuperAdminGuard />} />

                {/* Root Portal Router */}
                <Route path="/" element={<RootRedirect />} />

                {/* 1. PORT OPERATIONS ADMIN PORTAL */}
                <Route element={<RoleProtectedRoute allowedRoles={['admin']} />}>
                  <Route element={<AppShell />}>
                    <Route path="/dashboard" element={<DashboardPage />} />

                    {/* Operations Group */}
                    <Route path="/operations/vessels" element={<VesselsPage />} />
                    <Route path="/operations/vessels/:id" element={<VesselDetailPage />} />
                    <Route path="/operations/berths" element={<BerthsPage />} />
                    <Route path="/operations/cranes" element={<CranesPage />} />
                    <Route path="/operations/yard" element={<YardPage />} />
                    <Route path="/operations" element={<OperationsBoardPage />} />
                    <Route path="/operations/board" element={<OperationsBoardPage />} />

                    {/* Intelligence Group */}
                    <Route path="/intelligence/delays" element={<DelayLabPage />} />
                    <Route path="/intelligence/voyage-twin" element={<VoyageTwinPage />} />
                    <Route path="/intelligence/forecast" element={<ForecastPage />} />
                    <Route path="/copilot" element={<CopilotPage />} />
                    <Route path="/intelligence/routes" element={<RoutesPage />} />

                    {/* Decision Support Group */}
                    <Route path="/decision/optimizer" element={<OptimizerPage />} />
                    <Route path="/decision/simulator" element={<SimulatorPage />} />
                    <Route path="/decision/planner" element={<PlannerPage />} />
                    <Route path="/decision/verification" element={<ScenarioVerificationPage />} />

                    {/* Analytics */}
                    <Route path="/analytics" element={<AnalyticsPage />} />

                    {/* System */}
                    <Route path="/alerts" element={<AlertsPage />} />
                    <Route path="/settings" element={<SettingsPage />} />
                    <Route path="/profile" element={<SettingsPage />} />

                    {/* Admin Aliases */}
                    <Route path="/admin" element={<Navigate to="/dashboard" replace />} />
                    <Route path="/admin/dashboard" element={<DashboardPage />} />
                    <Route path="/admin/delays" element={<DelayLabPage />} />
                    <Route path="/admin/voyage-twin" element={<VoyageTwinPage />} />
                    <Route path="/admin/operations" element={<OperationsBoardPage />} />
                    <Route path="/admin/optimizer" element={<OptimizerPage />} />
                    <Route path="/admin/simulator" element={<SimulatorPage />} />
                    <Route path="/admin/planner" element={<PlannerPage />} />
                    <Route path="/admin/verification" element={<ScenarioVerificationPage />} />
                    <Route path="/admin/forecast" element={<ForecastPage />} />
                    <Route path="/admin/copilot" element={<CopilotPage />} />
                    <Route path="/admin/routes" element={<RoutesPage />} />
                    <Route path="/admin/analytics" element={<AnalyticsPage />} />
                    <Route path="/admin/alerts" element={<AlertsPage />} />
                    <Route path="/admin/settings" element={<SettingsPage />} />
                    <Route path="/admin/profile" element={<SettingsPage />} />
                  </Route>
                </Route>

                {/* 2. SHIPPING AGENCY PORTAL */}
                <Route element={<RoleProtectedRoute allowedRoles={['ship-agent']} />}>
                  <Route element={<ShippingAppShell />}>
                    <Route path="/shipping" element={<Navigate to="/shipping/dashboard" replace />} />
                    <Route path="/shipping/dashboard" element={<ShippingDashboardPage />} />
                    <Route path="/shipping/vessels" element={<ShippingVesselsPage />} />
                    <Route path="/shipping/vessels/add" element={<ShippingAddVesselPage />} />
                    <Route path="/shipping/vessels/:id" element={<ShippingVesselDetailPage />} />
                    <Route path="/shipping/berth-requests" element={<ShippingBerthRequestsPage />} />
                    <Route path="/shipping/schedules" element={<ShippingSchedulesPage />} />
                    <Route path="/shipping/cargo" element={<ShippingCargoPage />} />
                    <Route path="/shipping/documents" element={<ShippingDocumentsPage />} />
                    <Route path="/shipping/alerts" element={<ShippingAlertsPage />} />
                    <Route path="/shipping/copilot" element={<ShippingCopilotPage />} />
                    <Route path="/shipping/profile" element={<ShippingProfilePage />} />
                  </Route>
                </Route>

                {/* Fallback */}
                <Route path="*" element={<CatchAllRedirect />} />
              </Routes>
            </React.Suspense>
          </BrowserRouter>
        </MusicProvider>
      </OperationsProvider>
    </AuthProvider>
    </TimezoneProvider>
    </ThemeProvider>
    </GoogleOAuthProvider>
  );
};

export default App;
