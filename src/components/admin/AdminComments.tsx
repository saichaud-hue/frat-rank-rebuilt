import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EyeOff, Trash2, Loader2, Mail } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { UserActionSheet } from "./UserActionSheet";

type Comment = {
  id: string;
  text: string;
  created_at: string | null;
  toxicity_label: string | null;
  moderated: boolean | null;
  user_id: string;
  type: "party" | "fraternity";
};

type Profile = {
  id: string;
  email: string | null;
};

async function fetchAdminComments() {
  const [partyRes, fratRes] = await Promise.all([
    supabase
      .from("party_comments")
      .select("id,text,created_at,toxicity_label,moderated,user_id")
      .eq("moderated", false)
      .order("created_at", { ascending: false })
      .limit(50),
    supabase
      .from("fraternity_comments")
      .select("id,text,created_at,toxicity_label,moderated,user_id")
      .eq("moderated", false)
      .order("created_at", { ascending: false })
      .limit(50),
  ]);

  if (partyRes.error) throw partyRes.error;
  if (fratRes.error) throw fratRes.error;

  const partyComments: Comment[] = (partyRes.data ?? []).map((c) => ({
    ...c,
    type: "party" as const,
  }));
  const fratComments: Comment[] = (fratRes.data ?? []).map((c) => ({
    ...c,
    type: "fraternity" as const,
  }));

  const allComments = [...partyComments, ...fratComments].sort((a, b) => {
    const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
    const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
    return dateB - dateA;
  });

  // Get user emails
  const userIds = [...new Set(allComments.map((c) => c.user_id))];
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

  return { comments: allComments, emails: emailMap };
}

export function AdminComments() {
  const queryClient = useQueryClient();
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<{
    userId: string;
    email: string;
    contentId: string;
    contentType: "comment";
  } | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ["admin", "comments"],
    queryFn: fetchAdminComments,
    staleTime: 30000,
    refetchOnWindowFocus: true,
  });

  const hideComment = async (id: string, type: "party" | "fraternity") => {
    setActionLoading(id);
    const table = type === "party" ? "party_comments" : "fraternity_comments";
    const { error } = await supabase.from(table).update({ moderated: true }).eq("id", id);
    if (error) console.error(error);
    await queryClient.invalidateQueries({ queryKey: ["admin", "comments"] });
    setActionLoading(null);
  };

  const deleteComment = async (id: string, type: "party" | "fraternity") => {
    setActionLoading(id);
    const table = type === "party" ? "party_comments" : "fraternity_comments";
    const { error } = await supabase.from(table).delete().eq("id", id);
    if (error) console.error(error);
    await queryClient.invalidateQueries({ queryKey: ["admin", "comments"] });
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
        Failed to load comments.
      </div>
    );
  }

  const { comments: items = [], emails = {} } = data ?? {};

  if (!items.length) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No comments to moderate.
      </div>
    );
  }

  return (
    <>
      <div className="space-y-3">
        {items.map((c) => {
          const userEmail = emails[c.user_id];
          
          return (
            <div 
              key={`${c.type}-${c.id}`} 
              className="p-4 rounded-xl border bg-card cursor-pointer hover:bg-accent/50 transition-colors"
              onClick={() => setSelectedUser({
                userId: c.user_id,
                email: userEmail || "Unknown",
                contentId: c.id,
                contentType: "comment",
              })}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
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
                  
                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    <span className="flex items-center gap-1 text-xs text-primary">
                      <Mail className="h-3 w-3" />
                      {userEmail || "Unknown user"}
                    </span>
                    <span className="text-xs text-muted-foreground">•</span>
                    <span className="text-xs text-muted-foreground">
                      {c.created_at
                        ? formatDistanceToNow(new Date(c.created_at), { addSuffix: true })
                        : "Unknown time"}
                    </span>
                  </div>
                </div>

                <div className="flex gap-2 shrink-0">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-9 w-9 p-0"
                    disabled={actionLoading === c.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      hideComment(c.id, c.type);
                    }}
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
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteComment(c.id, c.type);
                    }}
                    title="Delete comment"
                  >
                    <Trash2 className="h-4 w-4 text-red-600" />
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
        contentType="comment"
      />
    </>
  );
}