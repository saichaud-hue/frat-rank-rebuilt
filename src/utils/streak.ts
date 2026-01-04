import { supabase } from '@/integrations/supabase/client';

/**
 * Updates the user's streak when they perform an action.
 * Uses database function for proper persistence.
 * - If last action was within 24 hours: streak stays the same (already counted for today)
 * - If last action was between 24-48 hours ago: streak increments by 1
 * - If last action was more than 48 hours ago: streak resets to 1
 */
export async function recordUserAction(): Promise<{ newStreak: number; isNewDay: boolean } | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase.rpc('update_user_streak', {
    p_user_id: user.id
  });

  if (error) {
    console.error('Failed to update streak:', error);
    return null;
  }

  // The RPC returns an array with one row
  if (data && data.length > 0) {
    return {
      newStreak: data[0].new_streak,
      isNewDay: data[0].is_new_day
    };
  }

  return null;
}

/**
 * Get current user's streak data from database
 */
export async function getUserStreakData(): Promise<{
  currentStreak: number;
  longestStreak: number;
  lastActivityAt: string | null;
  streakExpiresAt: string | null;
} | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase.rpc('get_user_streak', {
    p_user_id: user.id
  });

  if (error) {
    console.error('Failed to get streak:', error);
    return null;
  }

  // The RPC returns an array with one row
  if (data && data.length > 0) {
    return {
      currentStreak: data[0].current_streak,
      longestStreak: data[0].longest_streak,
      lastActivityAt: data[0].last_activity_at,
      streakExpiresAt: data[0].streak_expires_at
    };
  }

  return null;
}

/**
 * Calculate hours remaining until streak expires
 */
export function getHoursUntilStreakExpires(streakExpiresAt: string | null): number | null {
  if (!streakExpiresAt) return null;
  
  const expiresAt = new Date(streakExpiresAt);
  const now = new Date();
  const hoursRemaining = (expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60);
  
  return Math.max(0, hoursRemaining);
}

/**
 * Check streak status on app load - no-op now since database handles expiration
 * @deprecated Streak expiration is now handled by the database function
 */
export async function checkStreakStatus(): Promise<void> {
  // Database function get_user_streak handles expiration check automatically
  // This is kept for backwards compatibility
}

/**
 * Add points to the user - placeholder for future points system
 * @deprecated Points system not yet implemented in database
 */
export async function addUserPoints(_points: number): Promise<void> {
  // Points system can be implemented in the database later
  // This is kept for backwards compatibility
}
