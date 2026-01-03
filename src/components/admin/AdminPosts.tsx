import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Trash2, Loader2, ThumbsUp, ThumbsDown } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

type Post = {
  id: string;
  text: string;
  created_at: string | null;
  upvotes: number | null;
  downvotes: number | null;
};

export function AdminPosts() {
  const [items, setItems] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);

    const { data, error } = await supabase
      .from("chat_messages")
      .select("id,text,created_at,upvotes,downvotes")
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) console.error(error);
    setItems(data ?? []);
    setLoading(false);
  };

  const deletePost = async (id: string) => {
    setActionLoading(id);
    const { error } = await supabase.from("chat_messages").delete().eq("id", id);
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
        No posts to moderate.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {items.map((p) => (
        <div
          key={p.id}
          className="p-4 rounded-xl border bg-card"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <p className="text-sm line-clamp-3">{p.text}</p>
              <div className="flex items-center gap-3 mt-2">
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <ThumbsUp className="h-3 w-3" />
                  {p.upvotes ?? 0}
                </span>
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <ThumbsDown className="h-3 w-3" />
                  {p.downvotes ?? 0}
                </span>
                <span className="text-xs text-muted-foreground">
                  {p.created_at
                    ? formatDistanceToNow(new Date(p.created_at), { addSuffix: true })
                    : "Unknown time"}
                </span>
              </div>
            </div>

            <div className="shrink-0">
              <Button
                size="sm"
                variant="outline"
                className="h-9 w-9 p-0"
                disabled={actionLoading === p.id}
                onClick={() => deletePost(p.id)}
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
        </div>
      ))}
    </div>
  );
}
