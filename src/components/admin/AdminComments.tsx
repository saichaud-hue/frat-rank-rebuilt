import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EyeOff, Eye, Trash2, Loader2, Mail } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { UserActionSheet } from "./UserActionSheet";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

type Comment = {
  id: string;
  text: string;
  created_at: string | null;
  toxicity_label: string | null;
  moderated: boolean | null;
  deleted_at: string | null;
  deleted_by: string | null;
  user_id: string;
  type: "party" | "fraternity";
};

type Profile = {
  id: string;
  email: string | null;
};

async function fetchAdminComments() {
  // Note: new columns may not be in types yet
  const [partyRes, fratRes] = await Promise.all([
    (supabase.from("party_comments") as any)
      .select("id,text,created_at,toxicity_label,moderated,user_id,deleted_at,deleted_by")
      .order("created_at", { ascending: false })
      .limit(50),
    (supabase.from("fraternity_comments") as any)
      .select("id,text,created_at,toxicity_label,moderated,user_id,deleted_at,deleted_by")
      .order("created_at", { ascending: false })
      .limit(50),
  ]);

  if (partyRes.error) throw partyRes.error;
  if (fratRes.error) throw fratRes.error;

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

  const logAuditAction = async (action: string, targetType: string, targetId: string) => {
    const { data: userData } = await supabase.auth.getUser();
    if (userData.user) {
      await (supabase.from as any)("audit_logs").insert({
        actor_id: userData.user.id,
        action,
        target_type: targetType,
        target_id: targetId,
      });
    }
  };

  const softDeleteComment = async (id: string, type: "party" | "fraternity", isDeleted: boolean) => {
    setActionLoading(id);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const table = type === "party" ? "party_comments" : "fraternity_comments";
      
      const { error } = await (supabase.from(table) as any)
        .update({
          deleted_at: isDeleted ? null : new Date().toISOString(),
          deleted_by: isDeleted ? null : userData.user?.id,
        })
        .eq("id", id);

      if (error) throw error;

      await logAuditAction(isDeleted ? "restore" : "soft_delete", `${type}_comment`, id);
      toast({
        title: isDeleted ? "Comment restored" : "Comment hidden",
        description: isDeleted ? "The comment is now visible again." : "The comment is now hidden from users.",
      });

      await queryClient.invalidateQueries({ queryKey: ["admin", "comments"] });
    } catch (err) {
      console.error("Failed to update comment:", err);
      toast({ title: "Action failed", variant: "destructive" });
    } finally {
      setActionLoading(null);
    }
  };

  const deleteComment = async (id: string, type: "party" | "fraternity") => {
    setActionLoading(id);
    try {
      const table = type === "party" ? "party_comments" : "fraternity_comments";
      const { error } = await supabase.from(table).delete().eq("id", id);
      if (error) throw error;

      await logAuditAction("hard_delete", `${type}_comment`, id);
      toast({ title: "Comment permanently deleted" });

      await queryClient.invalidateQueries({ queryKey: ["admin", "comments"] });
    } catch (err) {
      console.error("Failed to delete comment:", err);
      toast({ title: "Delete failed", variant: "destructive" });
    } finally {
      setActionLoading(null);
    }
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
          const isDeleted = !!c.deleted_at;
          
          return (
            <div 
              key={`${c.type}-${c.id}`} 
              className={cn(
                "p-4 rounded-xl border bg-card cursor-pointer hover:bg-accent/50 transition-colors",
                isDeleted && "opacity-60 bg-muted/30"
              )}
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
                    {isDeleted && (
                      <Badge variant="outline" className="text-xs bg-yellow-500/10 text-yellow-600">
                        <EyeOff className="h-3 w-3 mr-1" />
                        Hidden
                      </Badge>
                    )}
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

                <div className="flex gap-1 shrink-0">
                  {/* Hide/Show */}
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 w-8 p-0"
                    disabled={actionLoading === c.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      softDeleteComment(c.id, c.type, isDeleted);
                    }}
                    title={isDeleted ? "Show comment" : "Hide comment"}
                  >
                    {isDeleted ? (
                      <Eye className="h-4 w-4 text-emerald-600" />
                    ) : (
                      <EyeOff className="h-4 w-4 text-yellow-600" />
                    )}
                  </Button>
                  
                  {/* Hard Delete */}
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 w-8 p-0"
                    disabled={actionLoading === c.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm("Permanently delete this comment? This cannot be undone.")) {
                        deleteComment(c.id, c.type);
                      }
                    }}
                    title="Delete permanently"
                  >
                    {actionLoading === c.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4 text-red-600" />
                    )}
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