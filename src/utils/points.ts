import { supabase } from '@/integrations/supabase/client';

// Point values for different actions
export const POINT_VALUES = {
  // Rating actions (most valuable)
  rate_party: 10,
  rate_fraternity: 10,
  
  // Content creation
  create_comment: 5,
  create_post: 8,
  create_poll: 15,
  upload_photo: 5,
  
  // Engagement
  vote_on_post: 2,
  vote_on_comment: 1,
  vote_on_poll: 3,
  
  // Daily/streak bonuses
  daily_login: 5,
  streak_bonus_7: 25,   // 7 day streak
  streak_bonus_30: 100, // 30 day streak
  
  // Special actions
  complete_all_frat_ratings: 50,
  first_rating: 15,
  share_content: 3,
  mark_attendance: 3,
} as const;

// 9 levels from Lower Bouse to Upper Touse (darker colors at bottom, brighter at top)
export const LEVELS = [
  { level: 1, name: 'Lower Bouse', minPoints: 0, maxPoints: 24, color: 'bg-stone-600', textColor: 'text-stone-100' },
  { level: 2, name: 'Bouse', minPoints: 25, maxPoints: 74, color: 'bg-stone-500', textColor: 'text-stone-100' },
  { level: 3, name: 'Upper Bouse', minPoints: 75, maxPoints: 149, color: 'bg-amber-700', textColor: 'text-amber-100' },
  { level: 4, name: 'Lower Mouse', minPoints: 150, maxPoints: 299, color: 'bg-amber-500', textColor: 'text-amber-950' },
  { level: 5, name: 'Mouse', minPoints: 300, maxPoints: 499, color: 'bg-yellow-400', textColor: 'text-yellow-950' },
  { level: 6, name: 'Upper Mouse', minPoints: 500, maxPoints: 799, color: 'bg-emerald-500', textColor: 'text-emerald-950' },
  { level: 7, name: 'Lower Touse', minPoints: 800, maxPoints: 1199, color: 'bg-sky-500', textColor: 'text-sky-950' },
  { level: 8, name: 'Touse', minPoints: 1200, maxPoints: 1999, color: 'bg-violet-500', textColor: 'text-violet-100' },
  { level: 9, name: 'Upper Touse', minPoints: 2000, maxPoints: Infinity, color: 'bg-gradient-to-r from-amber-400 via-rose-500 to-violet-600', textColor: 'text-white' },
] as const;

export type ActionType = keyof typeof POINT_VALUES;

/**
 * Get level info for a given point total
 */
export function getLevelInfo(points: number) {
  const level = LEVELS.find(l => points >= l.minPoints && points <= l.maxPoints) || LEVELS[0];
  const nextLevel = LEVELS.find(l => l.level === level.level + 1);
  
  const progressToNext = nextLevel 
    ? ((points - level.minPoints) / (nextLevel.minPoints - level.minPoints)) * 100
    : 100;
  
  const pointsToNextLevel = nextLevel ? nextLevel.minPoints - points : 0;
  
  return {
    ...level,
    points,
    progressToNext: Math.min(100, Math.max(0, progressToNext)),
    pointsToNextLevel,
    nextLevel: nextLevel || null,
  };
}

/**
 * Award points to the current user for an action
 */
export async function awardPoints(
  actionType: ActionType,
  description?: string
): Promise<{ newTotal: number; pointsAwarded: number } | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const points = POINT_VALUES[actionType];
  
  const { data, error } = await supabase.rpc('award_points', {
    p_user_id: user.id,
    p_points: points,
    p_action_type: actionType,
    p_description: description || null
  });

  if (error) {
    console.error('Failed to award points:', error);
    return null;
  }

  if (data && data.length > 0) {
    return {
      newTotal: data[0].new_total,
      pointsAwarded: data[0].points_awarded
    };
  }

  return null;
}

/**
 * Get the current user's total points
 */
export async function getUserPoints(): Promise<number> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return 0;

  const { data, error } = await supabase.rpc('get_user_points', {
    p_user_id: user.id
  });

  if (error) {
    console.error('Failed to get points:', error);
    return 0;
  }

  return data || 0;
}
