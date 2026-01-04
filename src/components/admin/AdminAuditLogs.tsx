import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDistanceToNow } from "date-fns";
import { History, AlertTriangle, Shield, Trash2, Eye, Lock, Check, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface AuditLog {
  id: string;
  actor_id: string;
  action: string;
  target_type: string;
  target_id: string | null;
  old_data: Record<string, unknown> | null;
  new_data: Record<string, unknown> | null;
  created_at: string;
}

interface Profile {
  id: string;
  email: string | null;
}

const ACTION_CONFIG: Record<string, { icon: typeof History; color: string; label: string }> = {
  soft_delete: { icon: Eye, color: "text-yellow-600", label: "Hidden" },
  hard_delete: { icon: Trash2, color: "text-red-600", label: "Deleted" },
  lock_thread: { icon: Lock, color: "text-orange-600", label: "Locked" },
  unlock_thread: { icon: Lock, color: "text-green-600", label: "Unlocked" },
  approve_party: { icon: Check, color: "text-green-600", label: "Approved" },
  reject_party: { icon: X, color: "text-red-600", label: "Rejected" },
  resolve_report: { icon: Check, color: "text-green-600", label: "Resolved Report" },
  dismiss_report: { icon: X, color: "text-muted-foreground", label: "Dismissed Report" },
  block_user: { icon: Shield, color: "text-red-600", label: "Blocked User" },
  unblock_user: { icon: Shield, color: "text-green-600", label: "Unblocked User" },
};

async function fetchAuditLogs(): Promise<{ logs: AuditLog[]; profiles: Record<string, string> }> {
  // Type not yet generated for new table
  const { data: logs, error } = await (supabase.from as any)("audit_logs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) throw error;

  // Fetch actor emails
  const actorIds = [...new Set((logs || []).map((l: AuditLog) => l.actor_id))] as string[];
  const profiles: Record<string, string> = {};

  if (actorIds.length > 0) {
    const { data: profilesData } = await supabase
      .from("profiles")
      .select("id, email")
      .in("id", actorIds);

    (profilesData || []).forEach((p: Profile) => {
      if (p.email) profiles[p.id] = p.email;
    });
  }

  return { logs: (logs || []) as AuditLog[], profiles };
}

export function AdminAuditLogs() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["admin", "audit-logs"],
    queryFn: fetchAuditLogs,
  });

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3, 4, 5].map((i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8 text-destructive">
        <AlertTriangle className="h-8 w-8 mx-auto mb-2" />
        <p>Failed to load audit logs</p>
      </div>
    );
  }

  const { logs, profiles } = data || { logs: [], profiles: {} };

  if (logs.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <History className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p className="font-medium">No activity yet</p>
        <p className="text-sm mt-1">Admin and moderator actions will appear here</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <h4 className="text-sm font-semibold flex items-center gap-2 mb-4">
        <History className="h-4 w-4" />
        Recent Activity
      </h4>

      {logs.map((log) => {
        const config = ACTION_CONFIG[log.action] || {
          icon: History,
          color: "text-muted-foreground",
          label: log.action.replace("_", " "),
        };
        const Icon = config.icon;
        const actorEmail = profiles[log.actor_id] || "Unknown";

        return (
          <div
            key={log.id}
            className="p-3 rounded-lg border bg-card flex items-start gap-3"
          >
            <div className={cn("p-2 rounded-lg bg-muted", config.color)}>
              <Icon className="h-4 w-4" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-medium text-sm truncate">{actorEmail.split("@")[0]}</span>
                <Badge variant="outline" className="text-xs">
                  {config.label}
                </Badge>
                <Badge variant="outline" className="text-xs capitalize">
                  {log.target_type.replace("_", " ")}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
