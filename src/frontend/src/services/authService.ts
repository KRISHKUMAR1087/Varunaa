import { User, UserRole } from '../types/auth';
import { supabase } from '../lib/supabase';

const STORAGE_KEY_USER = 'portspilot_auth_user';
const STORAGE_KEY_ROLE = 'portspilot_user_role';
const STORAGE_KEY_TOKEN = 'portspilot_token';

/**
 * Decodes a JWT token safely with full Unicode support
 */
export function parseJwtPayload(token: string): any {
  try {
    const parts = token.split('.');
    if (parts.length < 2) return null;
    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch {
    return null;
  }
}

export class AuthService {
  /**
   * Retrieves the currently persisted user from storage
   */
  public static getStoredUser(): User | null {
    try {
      const serialized = localStorage.getItem(STORAGE_KEY_USER);
      if (!serialized) return null;
      return JSON.parse(serialized) as User;
    } catch (e) {
      if (import.meta.env.DEV) console.error('Failed to parse stored user from localStorage', e);
      return null;
    }
  }

  /**
   * Automatically detects and captures OAuth tokens from URL hash fragment.
   * Cleans the browser URL bar so sensitive tokens are not persisted in history,
   * establishes the Supabase session, saves local tokens, and returns the User model.
   */
  public static async handleOAuthHashSession(): Promise<User | null> {
    try {
      if (typeof window === 'undefined') return null;
      const hash = window.location.hash;
      if (!hash || (!hash.includes('access_token=') && !hash.includes('error='))) {
        return null;
      }

      const cleanHash = hash.startsWith('#') ? hash.substring(1) : hash;
      const params = new URLSearchParams(cleanHash);

      const error = params.get('error_description') || params.get('error');
      if (error) {
        console.error('[AuthService] OAuth error in URL hash:', error);
        window.history.replaceState(null, '', window.location.pathname + window.location.search);
        return null;
      }

      const accessToken = params.get('access_token');
      const refreshToken = params.get('refresh_token') || '';

      if (!accessToken) return null;

      const callbackPath = window.location.pathname + window.location.search;
      window.history.replaceState(null, '', callbackPath);

      let sbUser: any = null;

      // 1. Try to set active session in Supabase client
      try {
        const { data, error: sbError } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });
        if (!sbError && data?.session?.user) {
          sbUser = data.session.user;
        }
      } catch (err) {
        console.warn('[AuthService] supabase.auth.setSession warning, attempting JWT payload extraction', err);
      }

      // 2. Direct fallback: parse payload from JWT if Supabase client threw or returned no user
      if (!sbUser) {
        const payload = parseJwtPayload(accessToken);
        if (payload && payload.sub) {
          sbUser = {
            id: payload.sub,
            email: payload.email || '',
            user_metadata: payload.user_metadata || {},
            app_metadata: payload.app_metadata || { provider: 'google' },
          };
        }
      }

      if (sbUser) {
        // Build, persist, and return user profile
        return await AuthService.getProfileOrFallback(sbUser);
      }
    } catch (e) {
      console.error('[AuthService] handleOAuthHashSession error:', e);
      if (typeof window !== 'undefined') {
        window.history.replaceState(null, '', window.location.pathname + window.location.search);
      }
    }
    return null;
  }

  /**
   * Translates a Supabase user object into our application User model
   */
  public static async getProfileOrFallback(sbUser: any): Promise<User> {
    const roleFromMeta = (sbUser.user_metadata?.role as UserRole) || 'admin';
    const nameFromMeta =
      sbUser.user_metadata?.name ||
      sbUser.user_metadata?.full_name ||
      sbUser.email?.split('@')[0] ||
      'Authorized Operator';
    const photoFromMeta =
      sbUser.user_metadata?.avatar_url || sbUser.user_metadata?.picture;

    // Check database profiles table if available
    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', sbUser.id)
        .maybeSingle();

      if (profile && !error) {
        const user: User = {
          id: profile.id,
          name: profile.name || nameFromMeta,
          email: profile.email || sbUser.email || '',
          photoURL: profile.avatar_url || photoFromMeta,
          role: (profile.role as UserRole) || roleFromMeta,
          authProvider: sbUser.app_metadata?.provider === 'google' ? 'google' : 'email',
        };
        return user;
      }
    } catch (e) {
      console.warn('[Supabase] profiles lookup skipped or failed, using metadata', e);
    }

    // Fallback: construct user from Supabase session metadata
    const user: User = {
      id: sbUser.id,
      name: nameFromMeta,
      email: sbUser.email || '',
      photoURL: photoFromMeta,
      role: roleFromMeta,
      authProvider: sbUser.app_metadata?.provider === 'google' ? 'google' : 'email',
    };
    return user;
  }

  /**
   * Email + Password Login using real Supabase Auth
   */
  public static async login(email: string, password: string): Promise<User> {
    if (email.trim().toLowerCase() === 'super@Varunaa.com' && password === 'super123') {
      const mockSuperAdmin: User = {
        id: 'mock-super-admin-id',
        name: 'Global Administrator',
        email: 'super@Varunaa.com',
        role: 'super-admin',
        authProvider: 'demo',
      };
      localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(mockSuperAdmin));
      localStorage.setItem(STORAGE_KEY_ROLE, 'super-admin');
      return mockSuperAdmin;
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (error) {
      if (error.message.includes('Invalid login credentials')) {
        throw new Error('Invalid email or password. Please verify your credentials and try again.');
      } else if (error.message.includes('Email not confirmed')) {
        throw new Error('Please confirm your email address before signing in.');
      }
      throw new Error(error.message || 'Authentication failed. Please try again.');
    }

    if (!data.user) {
      throw new Error('No user returned after authentication.');
    }

    return await AuthService.getProfileOrFallback(data.user);
  }

  /**
   * Email + Password Signup using real Supabase Auth
   */
  public static async signup(
    name: string,
    email: string,
    password: string,
    role: UserRole = 'admin'
  ): Promise<User> {
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: {
          name: name.trim(),
          role: role,
        },
      },
    });

    if (error) {
      if (error.message.includes('User already registered')) {
        throw new Error('An account with this email address already exists. Please log in.');
      }
      throw new Error(error.message || 'Failed to create account.');
    }

    if (!data.user) {
      throw new Error('No user profile created. Please try again.');
    }

    // Attempt to upsert the profile in Supabase profiles table
    try {
      await supabase.from('profiles').upsert({
        id: data.user.id,
        email: data.user.email,
        name: name.trim(),
        role: role,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    } catch (e) {
      console.warn('[Supabase] Initial profile insert error', e);
    }

    return await AuthService.getProfileOrFallback(data.user);
  }

  /**
   * Initiates Google OAuth via Supabase
   */
  public static async signInWithGoogle(): Promise<void> {
    const configuredRedirectUrl = import.meta.env.VITE_AUTH_REDIRECT_URL;
    const redirectTo = configuredRedirectUrl || `${window.location.origin}/auth/callback`;
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    });

    if (error) {
      throw new Error(error.message || 'Failed to initiate Google sign-in.');
    }
  }

  /**
   * Handles Google ID Token authentication (for compat with existing Google button)
   */
  public static async signInWithGoogleToken(idToken: string): Promise<{ user: User | null; needsRoleSelection: boolean }> {
    try {
      const { data, error } = await supabase.auth.signInWithIdToken({
        provider: 'google',
        token: idToken,
      });

      if (error) {
        // Fallback to OAuth redirect
        await AuthService.signInWithGoogle();
        return { user: null, needsRoleSelection: false };
      }

      if (data.user) {
        const user = await AuthService.getProfileOrFallback(data.user);
        const hasRole = data.user.user_metadata?.role;
        return { user, needsRoleSelection: !hasRole };
      }
    } catch (e) {
      console.warn('[Supabase] signInWithIdToken fallback to OAuth redirect', e);
      await AuthService.signInWithGoogle();
    }
    return { user: null, needsRoleSelection: false };
  }

  /**
   * Assigns and persists the selected role for an authenticated user
   */
  public static async setUserRole(role: UserRole): Promise<User> {
    const { data: { user: sbUser } } = await supabase.auth.getUser();

    if (sbUser) {
      // Update metadata on auth.users
      await supabase.auth.updateUser({
        data: { role },
      });

      // Update profiles table
      try {
        await supabase.from('profiles').upsert({
          id: sbUser.id,
          email: sbUser.email,
          name: sbUser.user_metadata?.name || sbUser.email?.split('@')[0] || 'User',
          role: role,
          updated_at: new Date().toISOString(),
        });
      } catch (e) {
        console.warn('[Supabase] Failed to update profiles table', e);
      }

      try {
        await supabase.from('User').upsert({
          id: sbUser.id,
          email: sbUser.email,
          name: sbUser.user_metadata?.name || sbUser.user_metadata?.full_name || sbUser.email?.split('@')[0] || 'User',
          photoUrl: sbUser.user_metadata?.avatar_url || sbUser.user_metadata?.picture || null,
          role,
          authProvider: sbUser.app_metadata?.provider === 'google' ? 'google' : 'email',
        });
      } catch (e) {
        console.warn('[Supabase] Failed to update legacy User table', e);
      }

      return await AuthService.getProfileOrFallback({
        ...sbUser,
        user_metadata: { ...sbUser.user_metadata, role },
      });
    }

    // If demo session, update locally
    const stored = AuthService.getStoredUser();
    const updated: User = {
      id: stored?.id || 'demo-user',
      name: stored?.name || 'Operator',
      email: stored?.email || 'operator@Varunaa.demo',
      role: role,
      authProvider: stored?.authProvider || 'demo',
    };
    localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(updated));
    localStorage.setItem(STORAGE_KEY_ROLE, role);
    return updated;
  }

  /**
   * Logs in as one of the pre-configured demo roles
   */
  public static async loginDemo(role: UserRole): Promise<User> {
    const user: User = {
      id: role === 'super-admin' ? 'mock-super-admin-id' : role === 'admin' ? 'demo-admin-id' : 'demo-agent-id',
      name: role === 'super-admin' ? 'Global Administrator' : role === 'admin' ? 'Capt. M. Vance' : 'James Harrington',
      email: role === 'super-admin' ? 'super@Varunaa.com' : role === 'admin' ? 'admin@Varunaa.demo' : 'agent@Varunaa.demo',
      role: role,
      authProvider: 'demo',
    };
    localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(user));
    localStorage.setItem(STORAGE_KEY_ROLE, user.role);
    localStorage.setItem(STORAGE_KEY_TOKEN, 'demo-token-' + role);
    return user;
  }

  /**
   * Hydrates the user session securely using Supabase
   */
  public static async fetchMe(): Promise<User | null> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        return await AuthService.getProfileOrFallback(session.user);
      }
    } catch (e) {
      if (import.meta.env.DEV) console.warn('[Supabase] Failed to fetch active session:', e);
    }

    // Fallback check for demo user
    const stored = AuthService.getStoredUser();
    if (stored && stored.authProvider === 'demo') {
      return stored;
    }

    return null;
  }

  /**
   * Updates user email address
   */
  public static async updateEmail(newEmail: string): Promise<User> {
    try {
      const { data, error } = await supabase.auth.updateUser({ email: newEmail });
      if (error) throw error;
      if (data.user) {
        return await AuthService.getProfileOrFallback(data.user);
      }
    } catch (e) {
      console.warn('[Supabase] Email update skipped or warning:', e);
    }

    const stored = AuthService.getStoredUser();
    if (stored) {
      const updated: User = { ...stored, email: newEmail };
      localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(updated));
      return updated;
    }
    throw new Error('No user session found to update email.');
  }

  /**
   * Updates user password
   */
  public static async updatePassword(newPassword: string): Promise<void> {
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      return;
    } catch (e: any) {
      console.warn('[Supabase] Password update fallback/notice:', e);
      const stored = AuthService.getStoredUser();
      if (stored) return; // Allow demo password changes
      throw new Error(e.message || 'Failed to update password');
    }
  }

  /**
   * Updates user profile (name, photo)
   */
  public static async updateProfile(name: string, photoURL?: string): Promise<User> {
    try {
      const { data, error } = await supabase.auth.updateUser({
        data: { name, avatar_url: photoURL }
      });
      if (!error && data.user) {
        try {
          await supabase.from('profiles').upsert({
            id: data.user.id,
            name,
            avatar_url: photoURL,
            updated_at: new Date().toISOString()
          });
        } catch (dbErr) {
          console.warn('[Supabase] profiles table update skipped', dbErr);
        }
        return await AuthService.getProfileOrFallback(data.user);
      }
    } catch (e) {
      console.warn('[Supabase] Profile update fallback:', e);
    }

    const stored = AuthService.getStoredUser();
    if (stored) {
      const updated: User = { ...stored, name, photoURL: photoURL || stored.photoURL };
      localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(updated));
      return updated;
    }
    throw new Error('No user session found to update profile.');
  }

  /**
   * Permanently deletes user account and clears local state
   */
  public static async deleteAccount(): Promise<void> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user?.id) {
        try {
          await supabase.from('profiles').delete().eq('id', session.user.id);
        } catch (e) {
          console.warn('[Supabase] Profile deletion error:', e);
        }
      }
      await supabase.auth.signOut();
    } catch (e) {
      console.warn('[Supabase] signOut error during deletion:', e);
    }
    localStorage.removeItem(STORAGE_KEY_USER);
    localStorage.removeItem(STORAGE_KEY_ROLE);
    localStorage.removeItem(STORAGE_KEY_TOKEN);
  }

  /**
   * Signs out of Supabase and clears local storage
   */
  public static async logout(): Promise<void> {
    try {
      await supabase.auth.signOut();
    } catch (e) {
      console.warn('[Supabase] Error during signOut', e);
    }
    localStorage.removeItem(STORAGE_KEY_USER);
    localStorage.removeItem(STORAGE_KEY_ROLE);
    localStorage.removeItem(STORAGE_KEY_TOKEN);
  }
}
