import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EyeOff, Trash2, Loader2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

type Comment = {
  id: string;
  text: string;
  created_at: string | null;
  toxicity_label: string | null;
  moderated: boolean | null;
  type: "party" | "fraternity";
};

export function AdminComments() {
  const [items, setItems] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);

    const [partyRes, fratRes] = await Promise.all([
      supabase
        .from("party_comments")
        .select("id,text,created_at,toxicity_label,moderated")
        .eq("moderated", false)
        .order("created_at", { ascending: false })
        .limit(50),
      supabase
        .from("fraternity_comments")
        .select("id,text,created_at,toxicity_label,moderated")
        .eq("moderated", false)
        .order("created_at", { ascending: false })
        .limit(50),
    ]);

    if (partyRes.error) console.error(partyRes.error);
    if (fratRes.error) console.error(fratRes.error);

    const partyComments: Comment[] = (partyRes.data ?? []).map((c) => ({
      ...c,
      type: "party" as const,
    }));
    const fratComments: Comment[] = (fratRes.data ?? []).map((c) => ({
      ...c,
      type: "fraternity" as const,
    }));

    // Merge and sort by date
    const all = [...partyComments, ...fratComments].sort((a, b) => {
      const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
      const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
      return dateB - dateA;
    });

    setItems(all);
    setLoading(false);
  };

  const hideComment = async (id: string, type: "party" | "fraternity") => {
    setActionLoading(id);
    const table = type === "party" ? "party_comments" : "fraternity_comments";
    const { error } = await supabase.from(table).update({ moderated: true }).eq("id", id);
    if (error) console.error(error);
    await load();
    setActionLoading(null);
  };

  const deleteComment = async (id: string, type: "party" | "fraternity") => {
    setActionLoading(id);
    const table = type === "party" ? "party_comments" : "fraternity_comments";
    const { error } = await supabase.from(table).delete().eq("id", id);
    if (error) console.error(error);
    await load();
    setActionLoading(null);
  };

  useEffect(() => {
    load();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!items.length) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No comments to moderate.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {items.map((c) => (
        <div
          key={`${c.type}-${c.id}`}
          className="p-4 rounded-xl border bg-card"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <Badge variant="outline" className="text-xs">
                  {c.type === "party" ? "Party" : "Frat"}
                </Badge>
                {c.toxicity_label && c.toxicity_label !== "safe" && (
                  <Badge variant="destructive" className="text-xs">
                    {c.toxicity_label}
                  </Badge>
                )}
              </div>
              <p className="text-sm line-clamp-3">{c.text}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {c.created_at
                  ? formatDistanceToNow(new Date(c.created_at), { addSuffix: true })
                  : "Unknown time"}
              </p>
            </div>

            <div className="flex gap-2 shrink-0">
              <Button
                size="sm"
                variant="outline"
                className="h-9 w-9 p-0"
                disabled={actionLoading === c.id}
                onClick={() => hideComment(c.id, c.type)}
                title="Hide comment"
              >
                {actionLoading === c.id ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <EyeOff className="h-4 w-4" />
                )}
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="h-9 w-9 p-0"
                disabled={actionLoading === c.id}
                onClick={() => deleteComment(c.id, c.type)}
                title="Delete comment"
              >
                <Trash2 className="h-4 w-4 text-red-600" />
              </Button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
