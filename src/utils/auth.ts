// Supabase-based auth utilities
// Note: For components, use useAuth() hook directly instead of this file

import { supabase } from '@/integrations/supabase/client';

export interface AuthUser {
  id: string;
  email: string | null;
  full_name: string | null;
  avatar_url: string | null;
}

/**
 * Get current user from Supabase auth session.
 * For React components, prefer using the useAuth() hook instead.
 */
export async function getCurrentUser(): Promise<AuthUser | null> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return null;
    
    return {
      id: session.user.id,
      email: session.user.email ?? null,
      full_name: session.user.user_metadata?.full_name ?? session.user.user_metadata?.name ?? null,
      avatar_url: session.user.user_metadata?.avatar_url ?? session.user.user_metadata?.picture ?? null,
    };
  } catch (error) {
    console.error('Auth check failed:', error);
    return null;
  }
}

/**
 * @deprecated Use useAuth() hook and navigate('/auth') instead
 */
export async function ensureAuthed(): Promise<AuthUser | null> {
  return getCurrentUser();
}
