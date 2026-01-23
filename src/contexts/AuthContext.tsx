import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface Profile {
  id: string;
  email: string | null;
  full_name: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string) => Promise<{ error: string | null }>;
  resetPassword: (email: string) => Promise<{ error: string | null }>;
  updatePassword: (newPassword: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchOrCreateProfile = useCallback(async (authUser: User) => {
    // Try to fetch existing profile
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', authUser.id)
      .maybeSingle();
    
    if (error) {
      console.error('Error fetching profile:', error);
      return;
    }

    if (data) {
      setProfile(data);
      return;
    }

    // Profile doesn't exist, create it (upsert)
    const newProfile = {
      id: authUser.id,
      email: authUser.email ?? null,
      full_name: null,
      avatar_url: null,
    };

    const { data: upsertedProfile, error: upsertError } = await supabase
      .from('profiles')
      .upsert(newProfile, { onConflict: 'id' })
      .select()
      .maybeSingle();

    if (upsertError) {
      console.error('Error creating profile:', upsertError);
      return;
    }

    if (upsertedProfile) {
      setProfile(upsertedProfile);
    }
  }, []);

  const refreshProfile = useCallback(async () => {
    if (user) {
      await fetchOrCreateProfile(user);
    }
  }, [user, fetchOrCreateProfile]);

  useEffect(() => {
    const syncLegacyLocalUser = (authUser: User | null) => {
      try {
        if (!authUser) {
          localStorage.removeItem('fratrank_user');
          return;
        }

        const id = authUser.id;
        const email = authUser.email ?? '';
        const name = 'User';

        const perUserKey = `fratrank_user_${id}`;
        const existingPerUser = localStorage.getItem(perUserKey);
        const existingMeta = existingPerUser ? JSON.parse(existingPerUser) : null;

        const points = typeof existingMeta?.points === 'number' ? existingMeta.points : 0;
        const streak = typeof existingMeta?.streak === 'number' ? existingMeta.streak : 0;
        const last_action_at = typeof existingMeta?.last_action_at === 'string' ? existingMeta.last_action_at : null;

        localStorage.setItem(
          'fratrank_user',
          JSON.stringify({
            id,
            email,
            name,
            points,
            streak,
            last_action_at,
            created_at: new Date().toISOString(),
          })
        );

        localStorage.setItem(perUserKey, JSON.stringify({ id, points, streak, last_action_at }));
      } catch {
        // no-op
      }
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, currentSession) => {
      setSession(currentSession);
      setUser(currentSession?.user ?? null);
      setLoading(false);

      syncLegacyLocalUser(currentSession?.user ?? null);

      if (currentSession?.user) {
        setTimeout(() => {
          fetchOrCreateProfile(currentSession.user);
        }, 0);
      } else {
        setProfile(null);
      }
    });

    supabase.auth.getSession().then(({ data: { session: existingSession } }) => {
      setSession(existingSession);
      setUser(existingSession?.user ?? null);
      setLoading(false);

      syncLegacyLocalUser(existingSession?.user ?? null);

      if (existingSession?.user) {
        fetchOrCreateProfile(existingSession.user);
      }
    });

    return () => subscription.unsubscribe();
  }, [fetchOrCreateProfile]);

  const signIn = async (email: string, password: string): Promise<{ error: string | null }> => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      return { error: error.message };
    }
    return { error: null };
  };

  const signUp = async (email: string, password: string): Promise<{ error: string | null }> => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: window.location.origin,
      },
    });
    if (error) {
      return { error: error.message };
    }
    return { error: null };
  };

  const resetPassword = async (email: string): Promise<{ error: string | null }> => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth?reset=true`,
    });
    if (error) {
      return { error: error.message };
    }
    return { error: null };
  };

  const updatePassword = async (newPassword: string): Promise<{ error: string | null }> => {
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) {
      return { error: error.message };
    }
    return { error: null };
  };

  const signOut = async () => {
    setProfile(null);
    localStorage.removeItem('fratrank_user');
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, session, profile, loading, signIn, signUp, resetPassword, updatePassword, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
