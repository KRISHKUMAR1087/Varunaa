import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { RoleSelector } from '../components/auth/RoleSelector';
import { UserRole } from '../types/auth';
import { AuthErrorAlert } from '../components/auth/AuthErrorAlert';
import { Ship } from 'lucide-react';

export const AuthCallbackPage: React.FC = () => {
  const navigate = useNavigate();
  const { confirmRoleSelection } = useAuth();

  const [, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showRoleSelector, setShowRoleSelector] = useState(false);
  const [userName, setUserName] = useState('');

  useEffect(() => {
    let mounted = true;

    const handleCallback = async () => {
      try {
        const params = new URLSearchParams(window.location.search);

        // Handle OAuth errors returned to the callback
        const oauthError = params.get('error');
        const oauthErrorDescription = params.get('error_description');

        if (oauthError) {
          throw new Error(
            oauthErrorDescription || oauthError
          );
        }

        // PKCE authorization code
        const code = params.get('code');

        
        if (code) {
          // Check whether Supabase has already established the session.
          const { data: initialSession } = await supabase.auth.getSession();

          if (!initialSession?.session?.user) {
            const { error: exchangeError } =
              await supabase.auth.exchangeCodeForSession(code);

            if (exchangeError) {
              // Another auth handler may have established the session meanwhile.
              const { data: checkSession } = await supabase.auth.getSession();

              if (!checkSession?.session?.user) {
                console.error(
                  'Supabase code exchange failed:',
                  exchangeError
                );

                throw exchangeError;
              }
            }
          }
        }
        // Get the authenticated session
        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession();

        if (sessionError) {
          throw sessionError;
        }

        if (!session?.user) {
          throw new Error(
            'Authentication session was not created.'
          );
        }

        if (!mounted) return;

        const user = session.user;

        const name =
          user.user_metadata?.full_name ||
          user.user_metadata?.name ||
          user.email?.split('@')[0] ||
          '';

        setUserName(name);

        // Check pending role selected before Google login
        const pendingRole =
          localStorage.getItem(
            'pending_google_role'
          ) as UserRole | null;

        if (
          pendingRole === 'admin' ||
          pendingRole === 'ship-agent'
        ) {
          localStorage.removeItem('pending_google_role');

          const confirmedUser =
            await confirmRoleSelection(pendingRole);

          if (!mounted) return;

          navigate(
            confirmedUser.role === 'admin'
              ? '/dashboard'
              : '/shipping/dashboard',
            { replace: true }
          );

          return;
        }

        // Check existing role in profile
        let role =
          user.user_metadata?.role as
            | UserRole
            | undefined;

        if (!role) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .maybeSingle();

          if (profile?.role) {
            role = profile.role as UserRole;
          }
        }

        if (
          role === 'admin' ||
          role === 'ship-agent'
        ) {
          navigate(
            role === 'admin'
              ? '/dashboard'
              : '/shipping/dashboard',
            { replace: true }
          );

          return;
        }

        // No role yet
        setLoading(false);
        setShowRoleSelector(true);

      } catch (err: any) {
        console.error(
          'OAuth callback failed:',
          err
        );

        if (!mounted) return;

        setError(
          err?.message ||
          'Failed to establish authentication session.'
        );

        setLoading(false);
      }
    };

    handleCallback();

    return () => {
      mounted = false;
    };
  }, [navigate, confirmRoleSelection]);

  const handleRoleSelected = async (
    role: UserRole
  ) => {
    try {
      setLoading(true);
      setShowRoleSelector(false);

      const updatedUser =
        await confirmRoleSelection(role);

      navigate(
        updatedUser.role === 'admin'
          ? '/dashboard'
          : '/shipping/dashboard',
        { replace: true }
      );

    } catch (err: any) {
      console.error(
        'Role assignment error:',
        err
      );

      setError(
        err?.message ||
        'Failed to set operational role.'
      );

      setLoading(false);
    }
  };

  if (error) {
    return (
      <div className="min-h-screen bg-canvas flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-surface border border-border-subtle rounded-2xl p-6 shadow-modal space-y-4">

          <div className="flex items-center gap-3 justify-center mb-2">
            <div className="w-10 h-10 rounded-xl bg-brand-teal flex items-center justify-center text-white">
              <Ship className="w-5 h-5" />
            </div>

            <span className="text-xl font-bold tracking-tight text-text-main">
              Varunaa
            </span>
          </div>

          <AuthErrorAlert
            message={error}
            onDismiss={() => setError(null)}
          />

          <button
            onClick={() =>
              navigate('/auth/login', {
                replace: true,
              })
            }
            className="w-full py-2.5 rounded-xl bg-brand-teal text-white font-semibold text-xs hover:bg-teal-600 transition shadow-sm cursor-pointer"
          >
            Return to Login
          </button>
        </div>
      </div>
    );
  }

  if (showRoleSelector) {
    return (
      <div className="min-h-screen bg-canvas flex items-center justify-center">
        <RoleSelector
          onSelectRole={handleRoleSelected}
          userName={userName}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-canvas flex items-center justify-center">
      <div className="flex flex-col items-center gap-3 text-xs text-text-muted">
        <div className="w-6 h-6 border-2 border-brand-teal border-t-transparent rounded-full animate-spin" />

        <span className="font-medium">
          Completing secure Google authentication...
        </span>
      </div>
    </div>
  );
};