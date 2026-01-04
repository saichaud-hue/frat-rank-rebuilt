import { useEffect, useState, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

// Cache role status to prevent repeated checks
let cachedIsAdmin: boolean | null = null;
let cachedIsModerator: boolean | null = null;
let cachedUserId: string | null = null;

export function useRoleCheck() {
  const [isAdmin, setIsAdmin] = useState(cachedIsAdmin ?? false);
  const [isModerator, setIsModerator] = useState(cachedIsModerator ?? false);
  const [loading, setLoading] = useState(cachedIsAdmin === null || cachedIsModerator === null);
  const checkInProgress = useRef(false);

  const checkRoles = useCallback(async (userId: string | undefined) => {
    if (!userId) {
      cachedIsAdmin = false;
      cachedIsModerator = false;
      cachedUserId = null;
      setIsAdmin(false);
      setIsModerator(false);
      setLoading(false);
      return;
    }

    // Use cache if same user
    if (cachedUserId === userId && cachedIsAdmin !== null && cachedIsModerator !== null) {
      setIsAdmin(cachedIsAdmin);
      setIsModerator(cachedIsModerator);
      setLoading(false);
      return;
    }

    // Prevent duplicate checks
    if (checkInProgress.current) return;
    checkInProgress.current = true;

    try {
      // Check both roles in parallel
      const [adminResult, modResult] = await Promise.all([
        supabase.rpc("is_admin"),
        supabase.rpc("is_moderator" as any) // Type not yet generated
      ]);

      if (adminResult.error) {
        console.error("is_admin error:", adminResult.error);
        cachedIsAdmin = false;
      } else {
        cachedIsAdmin = Boolean(adminResult.data);
      }

      if (modResult.error) {
        console.error("is_moderator error:", modResult.error);
        cachedIsModerator = false;
      } else {
        cachedIsModerator = Boolean(modResult.data);
      }

      cachedUserId = userId;
      setIsAdmin(cachedIsAdmin);
      setIsModerator(cachedIsModerator);
    } catch (err) {
      console.error("Role check failed:", err);
      cachedIsAdmin = false;
      cachedIsModerator = false;
      setIsAdmin(false);
      setIsModerator(false);
    } finally {
      checkInProgress.current = false;
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let alive = true;

    const run = async () => {
      const { data: userRes } = await supabase.auth.getUser();
      if (!alive) return;
      await checkRoles(userRes?.user?.id);
    };

    run();

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (!alive) return;
      // Clear cache on sign out
      if (event === "SIGNED_OUT") {
        cachedIsAdmin = null;
        cachedIsModerator = null;
        cachedUserId = null;
        setIsAdmin(false);
        setIsModerator(false);
        setLoading(false);
      } else if (session?.user?.id) {
        checkRoles(session.user.id);
      }
    });

    return () => {
      alive = false;
      sub.subscription.unsubscribe();
    };
  }, [checkRoles]);

  // Function to force refresh (useful for tab visibility changes)
  const refreshRoles = useCallback(async () => {
    const { data: userRes } = await supabase.auth.getUser();
    if (userRes?.user?.id) {
      cachedUserId = null; // Force re-check
      await checkRoles(userRes.user.id);
    }
  }, [checkRoles]);

  return { isAdmin, isModerator, loading, refreshRoles };
}
