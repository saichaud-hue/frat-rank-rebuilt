import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Check, X, Loader2, Mail } from "lucide-react";
import { format } from "date-fns";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { UserActionSheet } from "./UserActionSheet";

type Party = {
  id: string;
  title: string | null;
  starts_at: string | null;
  status: string | null;
  fraternity_id: string | null;
  contact_email: string | null;
  user_id: string | null;
};

type Fraternity = {
  id: string;
  name: string;
};

type Profile = {
  id: string;
  email: string | null;
};

async function fetchAdminParties() {
  const [partiesRes, fratsRes] = await Promise.all([
    supabase
      .from("parties")
      .select("id,title,starts_at,status,fraternity_id,contact_email,user_id")
      .eq("status", "pending")
      .order("starts_at", { ascending: true }),
    supabase.from("fraternities").select("id,name"),
  ]);

  if (partiesRes.error) throw partiesRes.error;
  if (fratsRes.error) throw fratsRes.error;

  const fratMap: Record<string, string> = {};
  (fratsRes.data ?? []).forEach((f: Fraternity) => {
    fratMap[f.id] = f.name;
  });

  // Get user emails
  const userIds = (partiesRes.data ?? [])
    .map((p) => p.user_id)
    .filter((id): id is string => !!id);

  let emailMap: Record<string, string> = {};
  if (userIds.length > 0) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, email")
      .in("id", userIds);
    
    (profiles ?? []).forEach((p: Profile) => {
      if (p.email) emailMap[p.id] = p.email;
    });
  }

  return {
    parties: (partiesRes.data as Party[]) ?? [],
    fraternities: fratMap,
    emails: emailMap,
  };
}

export function AdminParties() {
  const queryClient = useQueryClient();
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<{
    userId: string;
    email: string;
    contentId: string;
  } | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ["admin", "parties"],
    queryFn: fetchAdminParties,
    staleTime: 30000,
    refetchOnWindowFocus: true,
  });

  const setStatus = async (id: string, status: "upcoming" | "rejected") => {
    setActionLoading(id);
    const { error } = await supabase.from("parties").update({ status }).eq("id", id);
    if (error) console.error(error);
    await queryClient.invalidateQueries({ queryKey: ["admin", "parties"] });
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
        Failed to load parties.
      </div>
    );
  }

  const { parties, fraternities, emails } = data ?? { parties: [], fraternities: {}, emails: {} };

  if (!parties.length) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No pending parties.
      </div>
    );
  }

  return (
    <>
      <div className="space-y-3">
        {parties.map((p) => {
          const userEmail = p.user_id ? emails[p.user_id] : p.contact_email;
          
          return (
            <div 
              key={p.id} 
              className="p-4 rounded-xl border bg-card cursor-pointer hover:bg-accent/50 transition-colors"
              onClick={() => {
                if (p.user_id) {
                  setSelectedUser({
                    userId: p.user_id,
                    email: userEmail || "Unknown",
                    contentId: p.id,
                  });
                }
              }}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold truncate">{p.title ?? "Untitled party"}</p>
                  {p.fraternity_id && fraternities[p.fraternity_id] && (
                    <p className="text-sm text-muted-foreground">
                      {fraternities[p.fraternity_id]}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">
                    {p.starts_at
                      ? format(new Date(p.starts_at), "MMM d, yyyy 'at' h:mm a")
                      : "No time set"}
                  </p>
                  
                  <div className="flex items-center gap-1 mt-2 text-xs text-primary">
                    <Mail className="h-3 w-3" />
                    {userEmail || "Unknown user"}
                  </div>
                </div>

                <div className="flex gap-2 shrink-0">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-9 w-9 p-0"
                    disabled={actionLoading === p.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      setStatus(p.id, "upcoming");
                    }}
                    title="Approve"
                  >
                    {actionLoading === p.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Check className="h-4 w-4 text-green-600" />
                    )}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-9 w-9 p-0"
                    disabled={actionLoading === p.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      setStatus(p.id, "rejected");
                    }}
                    title="Reject"
                  >
                    <X className="h-4 w-4 text-red-600" />
                  </Button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <UserActionSheet
        open={!!selectedUser}
        onOpenChange={(open) => !open && setSelectedUser(null)}
        userId={selectedUser?.userId || ""}
        userEmail={selectedUser?.email || ""}
        contentId={selectedUser?.contentId}
        contentType="party"
      />
    </>
  );
}