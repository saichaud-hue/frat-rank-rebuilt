import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { format } from "date-fns";
import { Users, Mail, Calendar } from "lucide-react";

interface Profile {
  id: string;
  email: string | null;
  full_name: string | null;
  avatar_url: string | null;
  created_at: string;
}

export function AdminUsers() {
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

      <div className="space-y-2 max-h-[400px] overflow-y-auto">
        {realUsers.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            No users have signed up yet.
          </p>
        ) : (
          realUsers.map((user) => (
            <div
              key={user.id}
              className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 border"
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
              
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Calendar className="h-3 w-3" />
                <span>{format(new Date(user.created_at), "MMM d")}</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
