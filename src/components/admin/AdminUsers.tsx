import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { format } from "date-fns";
import { Users, Mail, Calendar, ChevronDown, ChevronUp, MessageSquare, Star, MapPin } from "lucide-react";

interface Profile {
  id: string;
  email: string | null;
  full_name: string | null;
  avatar_url: string | null;
  created_at: string;
}

interface UserActivity {
  posts: number;
  partyComments: number;
  fratComments: number;
  partyRatings: number;
  repRatings: number;
  moveVotes: number;
}

function UserActivityPanel({ userId }: { userId: string }) {
  const { data: activity, isLoading } = useQuery({
    queryKey: ["admin", "user-activity", userId],
    queryFn: async () => {
      const [posts, partyComments, fratComments, partyRatings, repRatings, moveVotes] = await Promise.all([
        supabase.from("chat_messages").select("id", { count: "exact", head: true }).eq("user_id", userId),
        supabase.from("party_comments").select("id", { count: "exact", head: true }).eq("user_id", userId),
        supabase.from("fraternity_comments").select("id", { count: "exact", head: true }).eq("user_id", userId),
        supabase.from("party_ratings").select("id", { count: "exact", head: true }).eq("user_id", userId),
        supabase.from("reputation_ratings").select("id", { count: "exact", head: true }).eq("user_id", userId),
        supabase.from("move_votes").select("id", { count: "exact", head: true }).eq("user_id", userId),
      ]);

      return {
        posts: posts.count || 0,
        partyComments: partyComments.count || 0,
        fratComments: fratComments.count || 0,
        partyRatings: partyRatings.count || 0,
        repRatings: repRatings.count || 0,
        moveVotes: moveVotes.count || 0,
      } as UserActivity;
    },
  });

  if (isLoading) {
    return <Skeleton className="h-16 w-full mx-3 mb-3" />;
  }

  const stats = [
    { label: "Posts", value: activity?.posts || 0, icon: MessageSquare },
    { label: "Party Comments", value: activity?.partyComments || 0, icon: MessageSquare },
    { label: "Frat Comments", value: activity?.fratComments || 0, icon: MessageSquare },
    { label: "Party Ratings", value: activity?.partyRatings || 0, icon: Star },
    { label: "Rep Ratings", value: activity?.repRatings || 0, icon: Star },
    { label: "Move Votes", value: activity?.moveVotes || 0, icon: MapPin },
  ];

  const totalActivity = stats.reduce((sum, s) => sum + s.value, 0);

  return (
    <div className="mx-3 mb-3 p-3 bg-background rounded-lg border">
      <p className="text-xs font-medium mb-2">Total Activity: {totalActivity}</p>
      <div className="grid grid-cols-2 gap-2">
        {stats.map((stat) => (
          <div key={stat.label} className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <stat.icon className="h-3 w-3 flex-shrink-0" />
            <span>{stat.value} {stat.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function AdminUsers() {
  const [expandedUser, setExpandedUser] = useState<string | null>(null);

  const { data: users, isLoading } = useQuery({
    queryKey: ["admin", "users"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, email, full_name, avatar_url, created_at")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as Profile[];
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );
  }

  const realUsers = users?.filter(u => !u.email?.endsWith("@seed.local")) || [];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Users className="h-4 w-4" />
        <span>{realUsers.length} registered users</span>
      </div>

      <div className="space-y-2 max-h-[500px] overflow-y-auto">
        {realUsers.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            No users have signed up yet.
          </p>
        ) : (
          realUsers.map((user) => {
            const isExpanded = expandedUser === user.id;
            return (
              <div key={user.id} className="rounded-lg bg-muted/50 border">
                <button
                  onClick={() => setExpandedUser(isExpanded ? null : user.id)}
                  className="w-full flex items-center gap-3 p-3 text-left"
                >
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={user.avatar_url || undefined} />
                    <AvatarFallback>
                      {user.full_name?.charAt(0) || user.email?.charAt(0) || "?"}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {user.full_name || "Anonymous"}
                    </p>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Mail className="h-3 w-3" />
                      <span className="truncate">{user.email || "No email"}</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      <span>{format(new Date(user.created_at), "MMM d")}</span>
                    </div>
                    {isExpanded ? (
                      <ChevronUp className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                </button>
                
                {isExpanded && <UserActivityPanel userId={user.id} />}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
