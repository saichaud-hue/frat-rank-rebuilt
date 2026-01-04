import { useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

// Rate limit configurations
export const RATE_LIMITS = {
  post: { max: 5, windowMinutes: 60, label: "posts" },
  comment: { max: 10, windowMinutes: 60, label: "comments" },
  vote: { max: 60, windowMinutes: 60, label: "votes" },
  report: { max: 5, windowMinutes: 60, label: "reports" },
} as const;

type RateLimitAction = keyof typeof RATE_LIMITS;

export function useRateLimit() {
  const checkLimit = useCallback(async (action: RateLimitAction): Promise<boolean> => {
    try {
      const config = RATE_LIMITS[action];
      // Type not yet generated for new RPC functions
      const { data, error } = await (supabase.rpc as any)("check_rate_limit", {
        p_action_type: action,
        p_limit: config.max,
        p_window_minutes: config.windowMinutes,
      });

      if (error) {
        console.error("Rate limit check error:", error);
        return true; // Allow on error
      }

      if (!data) {
        toast({
          title: "Slow down!",
          description: `You've reached the limit of ${config.max} ${config.label} per hour. Please try again later.`,
          variant: "destructive",
        });
        return false;
      }

      return true;
    } catch (err) {
      console.error("Rate limit check failed:", err);
      return true; // Allow on error
    }
  }, []);

  const recordAction = useCallback(async (action: RateLimitAction): Promise<void> => {
    try {
      // Type not yet generated for new RPC functions
      const { error } = await (supabase.rpc as any)("record_rate_limit", {
        p_action_type: action,
      });

      if (error) {
        console.error("Rate limit record error:", error);
      }
    } catch (err) {
      console.error("Rate limit record failed:", err);
    }
  }, []);

  const withRateLimit = useCallback(
    async <T>(action: RateLimitAction, fn: () => Promise<T>): Promise<T | null> => {
      const allowed = await checkLimit(action);
      if (!allowed) return null;

      const result = await fn();
      await recordAction(action);
      return result;
    },
    [checkLimit, recordAction]
  );

  return { checkLimit, recordAction, withRateLimit };
}
