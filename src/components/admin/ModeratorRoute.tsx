import { Navigate } from "react-router-dom";
import { useRoleCheck } from "@/hooks/useRoleCheck";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useEffect, useRef } from "react";

export function ModeratorRoute({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const { isModerator, loading: roleLoading, refreshRoles } = useRoleCheck();
  const { toast } = useToast();
  const hasShownToast = useRef(false);

  const loading = authLoading || roleLoading;

  // Refresh role status when tab becomes visible
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        refreshRoles();
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, [refreshRoles]);

  useEffect(() => {
    if (!loading && user && !isModerator && !hasShownToast.current) {
      hasShownToast.current = true;
      toast({
        title: "Access denied",
        description: "You don't have moderator access.",
        variant: "destructive",
      });
    }
  }, [loading, user, isModerator, toast]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user) return <Navigate to="/auth" replace />;
  if (!isModerator) return <Navigate to="/Activity" replace />;

  return <>{children}</>;
}
