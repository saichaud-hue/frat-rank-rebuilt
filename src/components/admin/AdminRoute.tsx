import { Navigate } from "react-router-dom";
import { useAdminCheck } from "@/hooks/useAdminCheck";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useEffect, useRef } from "react";

export function AdminRoute({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, loading: adminLoading, refreshAdminStatus } = useAdminCheck();
  const { toast } = useToast();
  const hasShownToast = useRef(false);

  const loading = authLoading || adminLoading;

  // Refresh admin status when tab becomes visible
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        refreshAdminStatus();
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, [refreshAdminStatus]);

  useEffect(() => {
    if (!loading && user && !isAdmin && !hasShownToast.current) {
      hasShownToast.current = true;
      toast({
        title: "Access denied",
        description: "You don't have admin access.",
        variant: "destructive",
      });
    }
  }, [loading, user, isAdmin, toast]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user) return <Navigate to="/auth" replace />;
  if (!isAdmin) return <Navigate to="/Activity" replace />;

  return <>{children}</>;
}
