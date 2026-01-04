import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";
import { Flag, Check, X, Eye, AlertTriangle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface ContentReport {
  id: string;
  reporter_id: string;
  content_type: string;
  content_id: string;
  reason: string;
  description: string | null;
  status: string;
  created_at: string;
}

interface Profile {
  id: string;
  email: string | null;
}

const REASON_COLORS: Record<string, string> = {
  spam: "bg-yellow-500/10 text-yellow-600 border-yellow-200",
  harassment: "bg-red-500/10 text-red-600 border-red-200",
  inappropriate: "bg-orange-500/10 text-orange-600 border-orange-200",
  misinformation: "bg-purple-500/10 text-purple-600 border-purple-200",
  other: "bg-muted text-muted-foreground border-border",
};

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-500/10 text-yellow-600",
  reviewing: "bg-blue-500/10 text-blue-600",
  resolved: "bg-green-500/10 text-green-600",
  dismissed: "bg-muted text-muted-foreground",
};

async function fetchReports(): Promise<{ reports: ContentReport[]; profiles: Record<string, string> }> {
  // Type not yet generated for new table
  const { data: reports, error } = await (supabase.from as any)("content_reports")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) throw error;

  // Fetch reporter emails
  const reporterIds = [...new Set((reports || []).map((r: ContentReport) => r.reporter_id))] as string[];
  const profiles: Record<string, string> = {};

  if (reporterIds.length > 0) {
    const { data: profilesData } = await supabase
      .from("profiles")
      .select("id, email")
      .in("id", reporterIds);

    (profilesData || []).forEach((p: Profile) => {
      if (p.email) profiles[p.id] = p.email;
    });
  }

  return { reports: (reports || []) as ContentReport[], profiles };
}

export function AdminReports() {
  const queryClient = useQueryClient();
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ["admin", "reports"],
    queryFn: fetchReports,
  });

  const updateReportStatus = async (reportId: string, status: "resolved" | "dismissed") => {
    setUpdatingId(reportId);
    try {
      const { data: userData } = await supabase.auth.getUser();
      
      // Type not yet generated for new table
      const { error } = await (supabase.from as any)("content_reports")
        .update({
          status,
          reviewed_by: userData.user?.id,
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", reportId);

      if (error) throw error;

      // Log audit action - type not yet generated
      await (supabase.from as any)("audit_logs").insert({
        actor_id: userData.user?.id,
        action: status === "resolved" ? "resolve_report" : "dismiss_report",
        target_type: "content_report",
        target_id: reportId,
      });

      toast({
        title: status === "resolved" ? "Report resolved" : "Report dismissed",
        description: "The report has been updated.",
      });

      queryClient.invalidateQueries({ queryKey: ["admin", "reports"] });
    } catch (err) {
      console.error("Failed to update report:", err);
      toast({
        title: "Update failed",
        description: "Could not update the report.",
        variant: "destructive",
      });
    } finally {
      setUpdatingId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-24 w-full" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8 text-destructive">
        <AlertTriangle className="h-8 w-8 mx-auto mb-2" />
        <p>Failed to load reports</p>
      </div>
    );
  }

  const { reports, profiles } = data || { reports: [], profiles: {} };
  const pendingReports = reports.filter((r) => r.status === "pending" || r.status === "reviewing");
  const resolvedReports = reports.filter((r) => r.status === "resolved" || r.status === "dismissed");

  if (reports.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <Flag className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p className="font-medium">No reports yet</p>
        <p className="text-sm mt-1">Reports from users will appear here</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Pending Reports */}
      {pendingReports.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-sm font-semibold flex items-center gap-2">
            <Flag className="h-4 w-4 text-destructive" />
            Pending ({pendingReports.length})
          </h4>
          {pendingReports.map((report) => (
            <div
              key={report.id}
              className="p-4 rounded-xl border bg-card space-y-3"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="outline" className={cn("text-xs", REASON_COLORS[report.reason])}>
                      {report.reason}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      {report.content_type.replace("_", " ")}
                    </Badge>
                    <Badge variant="outline" className={cn("text-xs", STATUS_COLORS[report.status])}>
                      {report.status}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Reported by {profiles[report.reporter_id] || "Unknown"} •{" "}
                    {formatDistanceToNow(new Date(report.created_at), { addSuffix: true })}
                  </p>
                </div>
              </div>

              {report.description && (
                <p className="text-sm text-muted-foreground bg-muted/50 p-2 rounded-lg">
                  "{report.description}"
                </p>
              )}

              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => updateReportStatus(report.id, "resolved")}
                  disabled={updatingId === report.id}
                  className="flex-1"
                >
                  {updatingId === report.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <Check className="h-4 w-4 mr-1" />
                      Resolve
                    </>
                  )}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => updateReportStatus(report.id, "dismissed")}
                  disabled={updatingId === report.id}
                  className="flex-1"
                >
                  <X className="h-4 w-4 mr-1" />
                  Dismiss
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Resolved Reports */}
      {resolvedReports.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
            <Eye className="h-4 w-4" />
            Reviewed ({resolvedReports.length})
          </h4>
          {resolvedReports.slice(0, 10).map((report) => (
            <div
              key={report.id}
              className="p-3 rounded-lg border bg-muted/30 opacity-75"
            >
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="outline" className={cn("text-xs", REASON_COLORS[report.reason])}>
                  {report.reason}
                </Badge>
                <Badge variant="outline" className={cn("text-xs", STATUS_COLORS[report.status])}>
                  {report.status}
                </Badge>
                <span className="text-xs text-muted-foreground ml-auto">
                  {formatDistanceToNow(new Date(report.created_at), { addSuffix: true })}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
