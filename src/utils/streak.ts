import { supabase } from '@/integrations/supabase/client';
import { base44 } from '@/api/base44Client';

const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;

// Get current Supabase user ID
async function getSupabaseUserId(): Promise<string | null> {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.user?.id ?? null;
}

// Get/create base44 user data linked to Supabase user
async function getOrCreateBase44User() {
  const supabaseUserId = await getSupabaseUserId();
  if (!supabaseUserId) return null;
  
  // Check if we already have user data in localStorage with this Supabase ID
  const storageKey = `fratrank_user_${supabaseUserId}`;
  const existingData = localStorage.getItem(storageKey);
  
  if (existingData) {
    return JSON.parse(existingData);
  }
  
  // Create new user data linked to Supabase ID
  const newUserData = {
    id: supabaseUserId,
    points: 0,
    streak: 0,
    last_action_at: null as string | null,
  };
  localStorage.setItem(storageKey, JSON.stringify(newUserData));
  return newUserData;
}

async function updateBase44User(updates: Partial<{ points: number; streak: number; last_action_at: string }>) {
  const supabaseUserId = await getSupabaseUserId();
  if (!supabaseUserId) return;
  
  const storageKey = `fratrank_user_${supabaseUserId}`;
  const existingData = localStorage.getItem(storageKey);
  const userData = existingData ? JSON.parse(existingData) : { id: supabaseUserId, points: 0, streak: 0 };
  
  const updatedData = { ...userData, ...updates };
  localStorage.setItem(storageKey, JSON.stringify(updatedData));
}

/**
 * Updates the user's streak when they perform an action.
 * - If last action was within 24 hours: streak stays the same (already counted for today)
 * - If last action was between 24-48 hours ago: streak increments by 1
 * - If last action was more than 48 hours ago: streak resets to 1
 */
export async function recordUserAction(): Promise<void> {
  const user = await getOrCreateBase44User();
  if (!user) return;

  const now = new Date();
  const lastActionAt = user.last_action_at ? new Date(user.last_action_at) : null;
  
  let newStreak = user.streak || 0;
  
  if (!lastActionAt) {
    // First action ever
    newStreak = 1;
  } else {
    const timeSinceLastAction = now.getTime() - lastActionAt.getTime();
    
    if (timeSinceLastAction < TWENTY_FOUR_HOURS_MS) {
      // Already performed an action today, streak doesn't change
      // But we still update the last_action_at to keep the window fresh
      newStreak = Math.max(1, user.streak || 0);
    } else if (timeSinceLastAction < TWENTY_FOUR_HOURS_MS * 2) {
      // Between 24-48 hours - they're continuing their streak!
      newStreak = (user.streak || 0) + 1;
    } else {
      // More than 48 hours - streak resets
      newStreak = 1;
    }
  }
  
  await updateBase44User({
    streak: newStreak,
    last_action_at: now.toISOString(),
  });
}

/**
 * Checks if the user's streak should be reset due to inactivity.
 * Call this on app load to reset streak if needed.
 */
export async function checkStreakStatus(): Promise<void> {
  const user = await getOrCreateBase44User();
  if (!user || !user.last_action_at) return;

  const now = new Date();
  const lastActionAt = new Date(user.last_action_at);
  const timeSinceLastAction = now.getTime() - lastActionAt.getTime();
  
  // If more than 48 hours have passed, reset the streak
  if (timeSinceLastAction > TWENTY_FOUR_HOURS_MS * 2) {
    await updateBase44User({
      streak: 0,
    });
  }
}

/**
 * Add points to the user's data
 */
export async function addUserPoints(points: number): Promise<void> {
  const user = await getOrCreateBase44User();
  if (!user) return;
  
  await updateBase44User({
    points: (user.points || 0) + points,
  });
}

/**
 * Get current user's streak and points data
 */
export async function getUserStreakData(): Promise<{ streak: number; points: number; last_action_at: string | null } | null> {
  const user = await getOrCreateBase44User();
  if (!user) return null;
  return {
    streak: user.streak || 0,
    points: user.points || 0,
    last_action_at: user.last_action_at || null,
  };
}
