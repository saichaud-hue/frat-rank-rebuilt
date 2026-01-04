import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Trash2, Loader2, ThumbsUp, ThumbsDown, Mail, Eye, EyeOff, Lock, Unlock } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { UserActionSheet } from "./UserActionSheet";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

type Post = {
  id: string;
  text: string;
  created_at: string | null;
  upvotes: number | null;
  downvotes: number | null;
  user_id: string;
  deleted_at: string | null;
  deleted_by: string | null;
  locked: boolean | null;
};

type Profile = {
  id: string;
  email: string | null;
};

async function fetchAdminPosts() {
  // Note: new columns (deleted_at, deleted_by, locked) may not be in types yet
  const { data, error } = await supabase
    .from("chat_messages")
    .select("id,text,created_at,upvotes,downvotes,user_id,deleted_at,deleted_by,locked" as any)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) throw error;

  const posts = (data ?? []) as unknown as Post[];

  // Get user emails
  const userIds = [...new Set(posts.map((p) => p.user_id))];
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

  return { posts, emails: emailMap };
}

export function AdminPosts() {
  const queryClient = useQueryClient();
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<{
    userId: string;
    email: string;
    contentId: string;
  } | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ["admin", "posts"],
    queryFn: fetchAdminPosts,
    staleTime: 30000,
    refetchOnWindowFocus: true,
  });

  const logAuditAction = async (action: string, targetId: string) => {
    const { data: userData } = await supabase.auth.getUser();
    if (userData.user) {
      await (supabase.from as any)("audit_logs").insert({
        actor_id: userData.user.id,
        action,
        target_type: "chat_message",
        target_id: targetId,
      });
    }
  };

  const softDeletePost = async (id: string, isDeleted: boolean) => {
    setActionLoading(id);
    try {
      const { data: userData } = await supabase.auth.getUser();
      
      // Note: new columns may not be in types yet
      const { error } = await (supabase.from("chat_messages") as any)
        .update({
          deleted_at: isDeleted ? null : new Date().toISOString(),
          deleted_by: isDeleted ? null : userData.user?.id,
        })
        .eq("id", id);

      if (error) throw error;

      await logAuditAction(isDeleted ? "restore" : "soft_delete", id);
      toast({
        title: isDeleted ? "Post restored" : "Post hidden",
        description: isDeleted ? "The post is now visible again." : "The post is now hidden from users.",
      });
      
      await queryClient.invalidateQueries({ queryKey: ["admin", "posts"] });
    } catch (err) {
      console.error("Failed to update post:", err);
      toast({ title: "Action failed", variant: "destructive" });
    } finally {
      setActionLoading(null);
    }
  };

  const toggleLock = async (id: string, isLocked: boolean) => {
    setActionLoading(id);
    try {
      const { data: userData } = await supabase.auth.getUser();
      // Note: new column may not be in types yet
      const { error } = await (supabase.from("chat_messages") as any)
        .update({ 
          locked: !isLocked,
          locked_by: !isLocked ? userData.user?.id : null,
          locked_at: !isLocked ? new Date().toISOString() : null,
        })
        .eq("id", id);

      if (error) throw error;

      await logAuditAction(isLocked ? "unlock_thread" : "lock_thread", id);
      toast({
        title: isLocked ? "Thread unlocked" : "Thread locked",
        description: isLocked ? "Users can now reply to this thread." : "Users can no longer reply to this thread.",
      });
      
      await queryClient.invalidateQueries({ queryKey: ["admin", "posts"] });
    } catch (err) {
      console.error("Failed to toggle lock:", err);
      toast({ title: "Action failed", variant: "destructive" });
    } finally {
      setActionLoading(null);
    }
  };

  const hardDeletePost = async (id: string) => {
    setActionLoading(id);
    try {
      const { error } = await supabase.from("chat_messages").delete().eq("id", id);
      if (error) throw error;

      await logAuditAction("hard_delete", id);
      toast({ title: "Post permanently deleted" });
      
      await queryClient.invalidateQueries({ queryKey: ["admin", "posts"] });
    } catch (err) {
      console.error("Failed to delete post:", err);
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
        Failed to load posts.
      </div>
    );
  }

  const { posts: items = [], emails = {} } = data ?? {};

  if (!items.length) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No posts to moderate.
      </div>
    );
  }

  return (
    <>
      <div className="space-y-3">
        {items.map((p) => {
          const userEmail = emails[p.user_id];
          const isDeleted = !!p.deleted_at;
          const isLocked = !!p.locked;
          
          return (
            <div 
              key={p.id} 
              className={cn(
                "p-4 rounded-xl border bg-card cursor-pointer hover:bg-accent/50 transition-colors",
                isDeleted && "opacity-60 bg-muted/30"
              )}
              onClick={() => setSelectedUser({
                userId: p.user_id,
                email: userEmail || "Unknown",
                contentId: p.id,
              })}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    {isDeleted && (
                      <Badge variant="outline" className="text-xs bg-yellow-500/10 text-yellow-600">
                        <EyeOff className="h-3 w-3 mr-1" />
                        Hidden
                      </Badge>
                    )}
                    {isLocked && (
                      <Badge variant="outline" className="text-xs bg-orange-500/10 text-orange-600">
                        <Lock className="h-3 w-3 mr-1" />
                        Locked
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm line-clamp-3">{p.text}</p>
                  <div className="flex items-center gap-3 mt-2 flex-wrap">
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <ThumbsUp className="h-3 w-3" />
                      {p.upvotes ?? 0}
                    </span>
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <ThumbsDown className="h-3 w-3" />
                      {p.downvotes ?? 0}
                    </span>
                    <span className="flex items-center gap-1 text-xs text-primary">
                      <Mail className="h-3 w-3" />
                      {userEmail || "Unknown user"}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {p.created_at
                        ? formatDistanceToNow(new Date(p.created_at), { addSuffix: true })
                        : "Unknown time"}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  {/* Lock/Unlock */}
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 w-8 p-0"
                    disabled={actionLoading === p.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleLock(p.id, isLocked);
                    }}
                    title={isLocked ? "Unlock thread" : "Lock thread"}
                  >
                    {isLocked ? (
                      <Unlock className="h-4 w-4 text-orange-600" />
                    ) : (
                      <Lock className="h-4 w-4 text-muted-foreground" />
                    )}
                  </Button>

                  {/* Hide/Show */}
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 w-8 p-0"
                    disabled={actionLoading === p.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      softDeletePost(p.id, isDeleted);
                    }}
                    title={isDeleted ? "Show post" : "Hide post"}
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
                    disabled={actionLoading === p.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm("Permanently delete this post? This cannot be undone.")) {
                        hardDeletePost(p.id);
                      }
                    }}
                    title="Delete permanently"
                  >
                    {actionLoading === p.id ? (
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
        contentType="post"
      />
    </>
  );
}
