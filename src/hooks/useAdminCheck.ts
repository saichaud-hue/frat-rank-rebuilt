import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export function useAdminCheck() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;

    const run = async () => {
      setLoading(true);

      const { data: userRes } = await supabase.auth.getUser();
      if (!userRes?.user) {
        if (alive) {
          setIsAdmin(false);
          setLoading(false);
        }
        return;
      }

      const { data, error } = await supabase.rpc("is_admin");
      if (!alive) return;

      if (error) {
        console.error("is_admin error:", error);
        setIsAdmin(false);
      } else {
        setIsAdmin(Boolean(data));
      }
      setLoading(false);
    };

    run();
    const { data: sub } = supabase.auth.onAuthStateChange(() => run());

    return () => {
      alive = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  return { isAdmin, loading };
}
