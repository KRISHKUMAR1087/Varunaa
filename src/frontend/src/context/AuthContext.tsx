import React, { createContext, useContext, useState, useEffect } from 'react';
import type { AuthChangeEvent, Session } from '@supabase/supabase-js';
import { User, UserRole } from '../types/auth';
import { AuthService } from '../services/authService';
import { supabase } from '../lib/supabase';

interface AuthContextValue {
  user: User | null;
  isAuthenticated: boolean;
  isDemoUser: boolean;
  isLoading: boolean;
  loginAsDemo: (role: UserRole) => Promise<User>;
  signInWithGoogle: () => Promise<void>;
  loginWithGoogleToken: (idToken: string) => Promise<{ needsRoleSelection: boolean; tempUser: User | null }>;
  confirmRoleSelection: (role: UserRole) => Promise<User>;
  login: (email: string, password: string) => Promise<User>;
  signup: (name: string, email: string, password: string, role: UserRole) => Promise<User>;
  updateEmail: (newEmail: string) => Promise<User>;
  updatePassword: (newPassword: string) => Promise<void>;
  updateProfile: (name: string, photoURL?: string) => Promise<User>;
  deleteAccount: () => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Hydrate authenticated user session and subscribe to Supabase auth events
  useEffect(() => {
    let isMounted = true;

    const initAuth = async () => {
      try {
        // Priority 1: Check for OAuth tokens in URL hash (e.g. Google OAuth redirect)
        const oAuthUser = await AuthService.handleOAuthHashSession();
        if (oAuthUser) {
          if (isMounted) {
            setUser(oAuthUser);
            setIsLoading(false);
          }
          return;
        }

        // Priority 2: Check active Supabase session
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          const profile = await AuthService.getProfileOrFallback(session.user);
          if (isMounted) setUser(profile);
        } else {
          // Priority 3: Check demo session or stored user
          const stored = AuthService.getStoredUser();
          if (stored) {
            if (isMounted) setUser(stored);
          } else {
            if (isMounted) setUser(null);
          }
        }
      } catch (e) {
        console.error('Auth hydration error:', e);
        const stored = AuthService.getStoredUser();
        if (stored && isMounted) setUser(stored);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    initAuth();

    // Supabase auth state change listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event: AuthChangeEvent, session: Session | null) => {
        if (!isMounted) return;

        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
          if (session?.user) {
            const profile = await AuthService.getProfileOrFallback(session.user);
            if (isMounted) {
              setUser(profile);
              setIsLoading(false);
            }
          }
        } else if (event === 'SIGNED_OUT') {
          if (isMounted) {
            setUser(null);
            setIsLoading(false);
          }
        }
      }
    );

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const loginAsDemo = async (role: UserRole): Promise<User> => {
    setIsLoading(true);
    try {
      const loggedInUser = await AuthService.loginDemo(role);
      setUser(loggedInUser);
      return loggedInUser;
    } finally {
      setIsLoading(false);
    }
  };

  const signInWithGoogle = async (): Promise<void> => {
    await AuthService.signInWithGoogle();
  };

  const loginWithGoogleToken = async (idToken: string): Promise<{ needsRoleSelection: boolean; tempUser: User | null }> => {
    setIsLoading(true);
    try {
      const result = await AuthService.signInWithGoogleToken(idToken);
      if (!result.needsRoleSelection && result.user) {
        setUser(result.user);
        return { needsRoleSelection: false, tempUser: null };
      }
      return { needsRoleSelection: true, tempUser: result.user };
    } finally {
      setIsLoading(false);
    }
  };

  const confirmRoleSelection = async (role: UserRole): Promise<User> => {
    setIsLoading(true);
    try {
      const confirmedUser = await AuthService.setUserRole(role);
      setUser(confirmedUser);
      return confirmedUser;
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email: string, password: string): Promise<User> => {
    setIsLoading(true);
    try {
      const loggedInUser = await AuthService.login(email, password);
      setUser(loggedInUser);
      return loggedInUser;
    } finally {
      setIsLoading(false);
    }
  };

  const signup = async (name: string, email: string, password: string, role: UserRole): Promise<User> => {
    setIsLoading(true);
    try {
      const newUser = await AuthService.signup(name, email, password, role);
      setUser(newUser);
      return newUser;
    } finally {
      setIsLoading(false);
    }
  };

  const updateEmail = async (newEmail: string): Promise<User> => {
    const updated = await AuthService.updateEmail(newEmail);
    setUser(updated);
    return updated;
  };

  const updatePassword = async (newPassword: string): Promise<void> => {
    await AuthService.updatePassword(newPassword);
  };

  const updateProfile = async (name: string, photoURL?: string): Promise<User> => {
    const updated = await AuthService.updateProfile(name, photoURL);
    setUser(updated);
    return updated;
  };

  const deleteAccount = async (): Promise<void> => {
    await AuthService.deleteAccount();
    setUser(null);
  };

  const logout = () => {
    AuthService.logout();
    setUser(null);
  };

  const isDemoUser = user?.authProvider === 'demo' || user?.email?.toLowerCase() === 'Varunaa.admin@gmail.com';

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isDemoUser,
        isLoading,
        loginAsDemo,
        signInWithGoogle,
        loginWithGoogleToken,
        confirmRoleSelection,
        login,
        signup,
        updateEmail,
        updatePassword,
        updateProfile,
        deleteAccount,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextValue => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

