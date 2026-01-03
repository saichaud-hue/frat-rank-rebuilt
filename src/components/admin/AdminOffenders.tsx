import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Unlock, AlertTriangle, Mail } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";

type BlockedUser = {
  id: string;
  user_id: string;
  reason: string | null;
  blocked_at: string;
  expires_at: string | null;
  email?: string;
};

type Offense = {
  id: string;
  user_id: string;
  offense_type: string;
  description: string | null;
  content_type: string | null;
  created_at: string;
  email?: string;
};

type OffenderSummary = {
  user_id: string;
  email: string;
  offense_count: number;
  offenses: Offense[];
  is_blocked: boolean;
};

async function fetchOffenderData() {
  // Get blocked users
  const { data: blockedData, error: blockedError } = await supabase
    .from("blocked_users")
    .select("*")
    .order("blocked_at", { ascending: false });

  if (blockedError) throw blockedError;

  // Get all offenses
  const { data: offensesData, error: offensesError } = await supabase
    .from("user_offenses")
    .select("*")
    .order("created_at", { ascending: false });

  if (offensesError) throw offensesError;

  // Get user emails from profiles
  const userIds = [
    ...new Set([
      ...(blockedData ?? []).map((b: BlockedUser) => b.user_id),
      ...(offensesData ?? []).map((o: Offense) => o.user_id),
    ]),
  ];

  let emailMap: Record<string, string> = {};
  if (userIds.length > 0) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, email")
      .in("id", userIds);
    
    (profiles ?? []).forEach((p: { id: string; email: string | null }) => {
      if (p.email) emailMap[p.id] = p.email;
    });
  }

  // Build offender summaries
  const offenderMap: Record<string, OffenderSummary> = {};
  const blockedUserIds = new Set((blockedData ?? []).map((b: BlockedUser) => b.user_id));

  (offensesData ?? []).forEach((o: Offense) => {
    if (!offenderMap[o.user_id]) {
      offenderMap[o.user_id] = {
        user_id: o.user_id,
        email: emailMap[o.user_id] || "Unknown",
        offense_count: 0,
        offenses: [],
        is_blocked: blockedUserIds.has(o.user_id),
      };
    }
    offenderMap[o.user_id].offense_count++;
    offenderMap[o.user_id].offenses.push(o);
  });

  // Sort by offense count
  const offenders = Object.values(offenderMap).sort(
    (a, b) => b.offense_count - a.offense_count
  );

  return {
    blockedUsers: (blockedData ?? []).map((b: BlockedUser) => ({
      ...b,
      email: emailMap[b.user_id] || "Unknown",
    })),
    offenders,
  };
}

export function AdminOffenders() {
  const queryClient = useQueryClient();
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ["admin", "offenders"],
    queryFn: fetchOffenderData,
    staleTime: 30000,
    refetchOnWindowFocus: true,
  });

  const unblockUser = async (userId: string) => {
    setActionLoading(userId);
    const { error } = await supabase
      .from("blocked_users")
      .delete()
      .eq("user_id", userId);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to unblock user",
        variant: "destructive",
      });
    } else {
      toast({ title: "User unblocked" });
    }
    await queryClient.invalidateQueries({ queryKey: ["admin", "offenders"] });
    setActionLoading(null);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Failed to load offender data.
      </div>
    );
  }

  const { blockedUsers = [], offenders = [] } = data ?? {};

  return (
    <div className="space-y-6">
      {/* Blocked Users Section */}
      <div>
        <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-red-500" />
          Blocked Users ({blockedUsers.length})
        </h3>
        {blockedUsers.length === 0 ? (
          <p className="text-sm text-muted-foreground">No blocked users.</p>
        ) : (
          <div className="space-y-2">
            {blockedUsers.map((user: BlockedUser & { email: string }) => (
              <div
                key={user.id}
                className="p-3 rounded-lg border bg-red-50 dark:bg-red-950/20"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <a
                      href={`mailto:${user.email}`}
                      className="flex items-center gap-1 text-sm font-medium text-red-700 dark:text-red-400 hover:underline"
                    >
                      <Mail className="h-3 w-3" />
                      {user.email}
                    </a>
                    {user.reason && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {user.reason}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">
                      Blocked{" "}
                      {formatDistanceToNow(new Date(user.blocked_at), {
                        addSuffix: true,
                      })}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8"
                    disabled={actionLoading === user.user_id}
                    onClick={() => unblockUser(user.user_id)}
                  >
                    {actionLoading === user.user_id ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <>
                        <Unlock className="h-3 w-3 mr-1" />
                        Unblock
                      </>
                    )}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Repeat Offenders Section */}
      <div>
        <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-amber-500" />
          Repeat Offenders ({offenders.length})
        </h3>
        {offenders.length === 0 ? (
          <p className="text-sm text-muted-foreground">No recorded offenses.</p>
        ) : (
          <div className="space-y-2">
            {offenders.map((offender: OffenderSummary) => (
              <div
                key={offender.user_id}
                className="p-3 rounded-lg border bg-card"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <a
                        href={`mailto:${offender.email}`}
                        className="flex items-center gap-1 text-sm font-medium hover:underline"
                      >
                        <Mail className="h-3 w-3" />
                        {offender.email}
                      </a>
                      <Badge variant="secondary" className="text-xs">
                        {offender.offense_count} offense
                        {offender.offense_count !== 1 ? "s" : ""}
                      </Badge>
                      {offender.is_blocked && (
                        <Badge variant="destructive" className="text-xs">
                          Blocked
                        </Badge>
                      )}
                    </div>
                    <div className="mt-2 space-y-1">
                      {offender.offenses.slice(0, 3).map((offense) => (
                        <div
                          key={offense.id}
                          className="text-xs text-muted-foreground"
                        >
                          <span className="font-medium capitalize">
                            {offense.offense_type.replace("_", " ")}
                          </span>
                          {offense.description && ` - ${offense.description}`}
                          <span className="opacity-60">
                            {" "}
                            ({formatDistanceToNow(new Date(offense.created_at), { addSuffix: true })})
                          </span>
                        </div>
                      ))}
                      {offender.offenses.length > 3 && (
                        <p className="text-xs text-muted-foreground opacity-60">
                          +{offender.offenses.length - 3} more
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}