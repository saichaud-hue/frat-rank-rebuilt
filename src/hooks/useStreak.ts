import { useState, useEffect, useCallback } from 'react';
import { getUserStreakData, getHoursUntilStreakExpires } from '@/utils/streak';
import { getLevelInfo } from '@/utils/points';
import { supabase } from '@/integrations/supabase/client';

interface StreakData {
  currentStreak: number;
  longestStreak: number;
  lastActivityAt: string | null;
  streakExpiresAt: string | null;
  hoursRemaining: number | null;
  totalPoints: number;
}

export function useStreak() {
  const [streakData, setStreakData] = useState<StreakData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchStreak = useCallback(async () => {
    try {
      const data = await getUserStreakData();
      if (data) {
        setStreakData({
          currentStreak: data.currentStreak,
          longestStreak: data.longestStreak,
          lastActivityAt: data.lastActivityAt,
          streakExpiresAt: data.streakExpiresAt,
          hoursRemaining: getHoursUntilStreakExpires(data.streakExpiresAt),
          totalPoints: data.totalPoints
        });
      } else {
        setStreakData({
          currentStreak: 0,
          longestStreak: 0,
          lastActivityAt: null,
          streakExpiresAt: null,
          hoursRemaining: null,
          totalPoints: 0
        });
      }
    } catch (error) {
      console.error('Failed to fetch streak:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStreak();

    // Listen for auth changes to refetch
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      fetchStreak();
    });

    return () => subscription.unsubscribe();
  }, [fetchStreak]);

  const points = streakData?.totalPoints ?? 0;
  const levelInfo = getLevelInfo(points);

  return {
    streak: streakData?.currentStreak ?? 0,
    longestStreak: streakData?.longestStreak ?? 0,
    lastActivityAt: streakData?.lastActivityAt,
    streakExpiresAt: streakData?.streakExpiresAt,
    hoursRemaining: streakData?.hoursRemaining,
    points,
    levelInfo,
    loading,
    refetch: fetchStreak
  };
}
