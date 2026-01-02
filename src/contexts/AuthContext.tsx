import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

const ALLOWED_AUTH_HOSTS = ['tousefrat.com', 'www.tousefrat.com'];
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
  signInWithGoogle: () => Promise<void>;
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
      full_name: authUser.user_metadata?.full_name ?? authUser.user_metadata?.name ?? null,
      avatar_url: authUser.user_metadata?.avatar_url ?? authUser.user_metadata?.picture ?? null,
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
        const name = authUser.user_metadata?.full_name ?? authUser.user_metadata?.name ?? 'User';
        const avatar_url = authUser.user_metadata?.avatar_url ?? authUser.user_metadata?.picture;

        const perUserKey = `fratrank_user_${id}`;
        const existingPerUser = localStorage.getItem(perUserKey);
        const existingMeta = existingPerUser ? JSON.parse(existingPerUser) : null;

        const points = typeof existingMeta?.points === 'number' ? existingMeta.points : 0;
        const streak = typeof existingMeta?.streak === 'number' ? existingMeta.streak : 0;
        const last_action_at = typeof existingMeta?.last_action_at === 'string' ? existingMeta.last_action_at : null;

        // Legacy (base44) user object used across the app
        localStorage.setItem(
          'fratrank_user',
          JSON.stringify({
            id,
            email,
            name,
            avatar_url,
            points,
            streak,
            last_action_at,
            created_at: new Date().toISOString(),
          })
        );

        // Also keep the per-user streak/points record in sync
        localStorage.setItem(perUserKey, JSON.stringify({ id, points, streak, last_action_at }));
      } catch {
        // no-op: don't block auth flow on localStorage issues
      }
    };

    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, currentSession) => {
      setSession(currentSession);
      setUser(currentSession?.user ?? null);
      setLoading(false);

      syncLegacyLocalUser(currentSession?.user ?? null);

      // Fetch/create profile when user changes (deferred to avoid deadlock)
      if (currentSession?.user) {
        setTimeout(() => {
          fetchOrCreateProfile(currentSession.user);
        }, 0);
      } else {
        setProfile(null);
      }
    });

    // THEN check for existing session
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

  const signInWithGoogle = async () => {
    const currentHost = window.location.hostname;
    
    // Block OAuth on non-production domains
    if (!ALLOWED_AUTH_HOSTS.includes(currentHost)) {
      toast({
        title: 'Sign-in unavailable',
        description: 'Google sign-in is only available on tousefrat.com. Sessions don\'t carry over to preview links.',
        variant: 'destructive',
      });
      return;
    }

    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        queryParams: { prompt: 'select_account' }
      }
    });
  };

  const signOut = async () => {
    setProfile(null);
    localStorage.removeItem('fratrank_user');
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, session, profile, loading, signInWithGoogle, signOut, refreshProfile }}>
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
