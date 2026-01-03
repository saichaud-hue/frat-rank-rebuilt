import { useEffect, useState, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

// Cache admin status to prevent repeated checks
let cachedAdminStatus: boolean | null = null;
let cachedUserId: string | null = null;

export function useAdminCheck() {
  const [isAdmin, setIsAdmin] = useState(cachedAdminStatus ?? false);
  const [loading, setLoading] = useState(cachedAdminStatus === null);
  const checkInProgress = useRef(false);

  const checkAdminStatus = useCallback(async (userId: string | undefined) => {
    if (!userId) {
      cachedAdminStatus = false;
      cachedUserId = null;
      setIsAdmin(false);
      setLoading(false);
      return;
    }

    // Use cache if same user
    if (cachedUserId === userId && cachedAdminStatus !== null) {
      setIsAdmin(cachedAdminStatus);
      setLoading(false);
      return;
    }

    // Prevent duplicate checks
    if (checkInProgress.current) return;
    checkInProgress.current = true;

    try {
      const { data, error } = await supabase.rpc("is_admin");
      if (error) {
        console.error("is_admin error:", error);
        cachedAdminStatus = false;
      } else {
        cachedAdminStatus = Boolean(data);
      }
      cachedUserId = userId;
      setIsAdmin(cachedAdminStatus);
    } catch (err) {
      console.error("Admin check failed:", err);
      cachedAdminStatus = false;
      setIsAdmin(false);
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
      await checkAdminStatus(userRes?.user?.id);
    };

    run();

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (!alive) return;
      // Clear cache on sign out
      if (event === "SIGNED_OUT") {
        cachedAdminStatus = null;
        cachedUserId = null;
        setIsAdmin(false);
        setLoading(false);
      } else if (session?.user?.id) {
        checkAdminStatus(session.user.id);
      }
    });

    return () => {
      alive = false;
      sub.subscription.unsubscribe();
    };
  }, [checkAdminStatus]);

  // Function to force refresh (useful for tab visibility changes)
  const refreshAdminStatus = useCallback(async () => {
    const { data: userRes } = await supabase.auth.getUser();
    if (userRes?.user?.id) {
      cachedUserId = null; // Force re-check
      await checkAdminStatus(userRes.user.id);
    }
  }, [checkAdminStatus]);

  return { isAdmin, loading, refreshAdminStatus };
}
