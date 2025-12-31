import { base44 } from '@/api/base44Client';

const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;

/**
 * Updates the user's streak when they perform an action.
 * - If last action was within 24 hours: streak stays the same (already counted for today)
 * - If last action was between 24-48 hours ago: streak increments by 1
 * - If last action was more than 48 hours ago: streak resets to 1
 */
export async function recordUserAction(): Promise<void> {
  const user = await base44.auth.me();
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
  
  await base44.auth.updateMe({
    streak: newStreak,
    last_action_at: now.toISOString(),
  });
}

/**
 * Checks if the user's streak should be reset due to inactivity.
 * Call this on app load to reset streak if needed.
 */
export async function checkStreakStatus(): Promise<void> {
  const user = await base44.auth.me();
  if (!user || !user.last_action_at) return;

  const now = new Date();
  const lastActionAt = new Date(user.last_action_at);
  const timeSinceLastAction = now.getTime() - lastActionAt.getTime();
  
  // If more than 48 hours have passed, reset the streak
  if (timeSinceLastAction > TWENTY_FOUR_HOURS_MS * 2) {
    await base44.auth.updateMe({
      streak: 0,
    });
  }
}
