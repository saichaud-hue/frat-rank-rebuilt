import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Trash2, Loader2, ThumbsUp, ThumbsDown, Mail } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { UserActionSheet } from "./UserActionSheet";

type Post = {
  id: string;
  text: string;
  created_at: string | null;
  upvotes: number | null;
  downvotes: number | null;
  user_id: string;
};

type Profile = {
  id: string;
  email: string | null;
};

async function fetchAdminPosts() {
  const { data, error } = await supabase
    .from("chat_messages")
    .select("id,text,created_at,upvotes,downvotes,user_id")
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) throw error;

  const posts = (data ?? []) as Post[];

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

  const deletePost = async (id: string) => {
    setActionLoading(id);
    const { error } = await supabase.from("chat_messages").delete().eq("id", id);
    if (error) console.error(error);
    await queryClient.invalidateQueries({ queryKey: ["admin", "posts"] });
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
          
          return (
            <div 
              key={p.id} 
              className="p-4 rounded-xl border bg-card cursor-pointer hover:bg-accent/50 transition-colors"
              onClick={() => setSelectedUser({
                userId: p.user_id,
                email: userEmail || "Unknown",
                contentId: p.id,
              })}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
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

                <Button
                  size="sm"
                  variant="outline"
                  className="h-9 w-9 p-0 shrink-0"
                  disabled={actionLoading === p.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    deletePost(p.id);
                  }}
                  title="Delete post"
                >
                  {actionLoading === p.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4 text-red-600" />
                  )}
                </Button>
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