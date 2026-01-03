import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Check, X, Loader2, Mail } from "lucide-react";
import { format } from "date-fns";
import { useQuery, useQueryClient } from "@tanstack/react-query";

type Party = {
  id: string;
  title: string | null;
  starts_at: string | null;
  status: string | null;
  fraternity_id: string | null;
  contact_email: string | null;
};

type Fraternity = {
  id: string;
  name: string;
};

async function fetchAdminParties() {
  const [partiesRes, fratsRes] = await Promise.all([
    supabase
      .from("parties")
      .select("id,title,starts_at,status,fraternity_id,contact_email")
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

  return {
    parties: (partiesRes.data as Party[]) ?? [],
    fraternities: fratMap,
  };
}

export function AdminParties() {
  const queryClient = useQueryClient();
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ["admin", "parties"],
    queryFn: fetchAdminParties,
    staleTime: 30000, // 30 seconds
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

  const { parties, fraternities } = data ?? { parties: [], fraternities: {} };

  if (!parties.length) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No pending parties.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {parties.map((p) => (
        <div key={p.id} className="p-4 rounded-xl border bg-card">
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
              {p.contact_email && (
                <a
                  href={`mailto:${p.contact_email}`}
                  className="flex items-center gap-1 text-xs text-primary mt-1 hover:underline"
                >
                  <Mail className="h-3 w-3" />
                  {p.contact_email}
                </a>
              )}
            </div>

            <div className="flex gap-2 shrink-0">
              <Button
                size="sm"
                variant="outline"
                className="h-9 w-9 p-0"
                disabled={actionLoading === p.id}
                onClick={() => setStatus(p.id, "upcoming")}
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
                onClick={() => setStatus(p.id, "rejected")}
              >
                <X className="h-4 w-4 text-red-600" />
              </Button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
