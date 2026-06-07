import { Session } from '@supabase/supabase-js';
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { AppState } from 'react-native';
import { getProfile } from './db/queries';
import type { Profile } from './db/types';
import { supabase } from './supabase';

type AuthState = {
  session: Session | null;
  loading: boolean;
  profile: Profile | null;
  /** True while we're still fetching the profile for a signed-in user. */
  profileLoading: boolean;
  /** Signed in but hasn't completed first-time onboarding (no name yet). */
  needsOnboarding: boolean;
  refreshProfile: () => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthState>({
  session: null,
  loading: true,
  profile: null,
  profileLoading: false,
  needsOnboarding: false,
  refreshProfile: async () => {},
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [profileLoaded, setProfileLoaded] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
    });

    // Refresh on app foreground — keeps tokens fresh without polling.
    const appStateSub = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        supabase.auth.startAutoRefresh();
      } else {
        supabase.auth.stopAutoRefresh();
      }
    });

    return () => {
      sub.subscription.unsubscribe();
      appStateSub.remove();
    };
  }, []);

  const refreshProfile = useCallback(async () => {
    try {
      const p = await getProfile();
      setProfile(p);
    } catch (e) {
      console.warn(e);
    } finally {
      setProfileLoaded(true);
    }
  }, []);

  // Load the profile whenever the signed-in user changes.
  const userId = session?.user?.id;
  useEffect(() => {
    if (userId) {
      setProfileLoaded(false);
      void refreshProfile();
    } else {
      setProfile(null);
      setProfileLoaded(false);
    }
  }, [userId, refreshProfile]);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const profileLoading = !!session && !profileLoaded;
  const needsOnboarding = !!session && profileLoaded && !profile?.display_name?.trim();

  return (
    <AuthContext.Provider
      value={{ session, loading, profile, profileLoading, needsOnboarding, refreshProfile, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
