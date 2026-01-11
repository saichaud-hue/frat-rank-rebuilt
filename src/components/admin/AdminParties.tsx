import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Check, X, Loader2, Mail, Trash2, Pencil, Save } from "lucide-react";
import { format } from "date-fns";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { UserActionSheet } from "./UserActionSheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type Party = {
  id: string;
  title: string | null;
  starts_at: string | null;
  ends_at: string | null;
  status: string | null;
  fraternity_id: string | null;
  contact_email: string | null;
  user_id: string | null;
  venue: string | null;
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
      .select("id,title,starts_at,ends_at,status,fraternity_id,contact_email,user_id,venue")
      .in("status", ["pending", "upcoming", "live", "completed"])
      .order("starts_at", { ascending: false }),
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
  const [editingParty, setEditingParty] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editVenue, setEditVenue] = useState("");
  const [editStartsAt, setEditStartsAt] = useState("");
  const [editEndsAt, setEditEndsAt] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState<Party | null>(null);

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

  const deleteParty = async (id: string) => {
    setActionLoading(id);
    const { error } = await supabase.from("parties").delete().eq("id", id);
    if (error) console.error(error);
    await queryClient.invalidateQueries({ queryKey: ["admin", "parties"] });
    setActionLoading(null);
    setDeleteConfirm(null);
  };

  const startEditing = (party: Party) => {
    setEditingParty(party.id);
    setEditTitle(party.title || "");
    setEditVenue(party.venue || "");
    // Format datetime for input (YYYY-MM-DDTHH:mm)
    setEditStartsAt(party.starts_at ? new Date(party.starts_at).toISOString().slice(0, 16) : "");
    setEditEndsAt(party.ends_at ? new Date(party.ends_at).toISOString().slice(0, 16) : "");
  };

  const saveEdit = async (id: string) => {
    setActionLoading(id);
    const updateData: Record<string, any> = { 
      title: editTitle, 
      venue: editVenue 
    };
    if (editStartsAt) updateData.starts_at = new Date(editStartsAt).toISOString();
    if (editEndsAt) updateData.ends_at = new Date(editEndsAt).toISOString();
    
    const { error } = await supabase
      .from("parties")
      .update(updateData)
      .eq("id", id);
    if (error) console.error(error);
    await queryClient.invalidateQueries({ queryKey: ["admin", "parties"] });
    setActionLoading(null);
    setEditingParty(null);
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
  
  const pendingParties = parties.filter((p) => p.status === "pending");
  const acceptedParties = parties.filter((p) => ["upcoming", "live", "completed"].includes(p.status || ""));

  const renderPartyCard = (p: Party, showEditDelete: boolean) => {
    const userEmail = p.user_id ? emails[p.user_id] : p.contact_email;
    const isEditing = editingParty === p.id;

    return (
      <div 
        key={p.id} 
        className="p-4 rounded-xl border bg-card cursor-pointer hover:bg-accent/50 transition-colors"
        onClick={() => {
          if (p.user_id && !isEditing) {
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
            {isEditing ? (
              <div className="space-y-2" onClick={(e) => e.stopPropagation()}>
                <Input
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  placeholder="Party title"
                  className="h-8"
                />
                <Input
                  value={editVenue}
                  onChange={(e) => setEditVenue(e.target.value)}
                  placeholder="Venue"
                  className="h-8"
                />
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs text-muted-foreground block mb-1">Start</label>
                    <input
                      type="datetime-local"
                      value={editStartsAt}
                      onChange={(e) => setEditStartsAt(e.target.value)}
                      className="h-8 text-xs w-full rounded-md border border-input bg-background px-2 py-1"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground block mb-1">End</label>
                    <input
                      type="datetime-local"
                      value={editEndsAt}
                      onChange={(e) => setEditEndsAt(e.target.value)}
                      className="h-8 text-xs w-full rounded-md border border-input bg-background px-2 py-1"
                    />
                  </div>
                </div>
              </div>
            ) : (
              <>
                <p className="font-semibold truncate">{p.title ?? "Untitled party"}</p>
                {p.venue && (
                  <p className="text-sm text-muted-foreground">{p.venue}</p>
                )}
              </>
            )}
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
            
            {showEditDelete && (
              <span className={`text-xs px-2 py-0.5 rounded-full mt-1 inline-block ${
                p.status === "live" ? "bg-green-500/20 text-green-600" :
                p.status === "upcoming" ? "bg-blue-500/20 text-blue-600" :
                "bg-muted text-muted-foreground"
              }`}>
                {p.status}
              </span>
            )}
            
            <div className="flex items-center gap-1 mt-2 text-xs text-primary">
              <Mail className="h-3 w-3" />
              {userEmail || "Unknown user"}
            </div>
          </div>

          <div className="flex gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
            {showEditDelete ? (
              isEditing ? (
                <>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-9 w-9 p-0"
                    disabled={actionLoading === p.id}
                    onClick={() => saveEdit(p.id)}
                    title="Save"
                  >
                    {actionLoading === p.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4 text-green-600" />
                    )}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-9 w-9 p-0"
                    onClick={() => setEditingParty(null)}
                    title="Cancel"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-9 w-9 p-0"
                    onClick={() => startEditing(p)}
                    title="Edit"
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-9 w-9 p-0"
                    onClick={() => setDeleteConfirm(p)}
                    title="Delete"
                  >
                    <Trash2 className="h-4 w-4 text-red-600" />
                  </Button>
                </>
              )
            ) : (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-9 w-9 p-0"
                  disabled={actionLoading === p.id}
                  onClick={() => setStatus(p.id, "upcoming")}
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
                  onClick={() => setStatus(p.id, "rejected")}
                  title="Reject"
                >
                  <X className="h-4 w-4 text-red-600" />
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <>
      <Tabs defaultValue="pending" className="w-full">
        <TabsList className="w-full grid grid-cols-2 mb-4">
          <TabsTrigger value="pending">
            Pending {pendingParties.length > 0 && `(${pendingParties.length})`}
          </TabsTrigger>
          <TabsTrigger value="accepted">
            Accepted {acceptedParties.length > 0 && `(${acceptedParties.length})`}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending">
          {pendingParties.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No pending parties.
            </div>
          ) : (
            <div className="space-y-3">
              {pendingParties.map((p) => renderPartyCard(p, false))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="accepted">
          {acceptedParties.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No accepted parties.
            </div>
          ) : (
            <div className="space-y-3">
              {acceptedParties.map((p) => renderPartyCard(p, true))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <UserActionSheet
        open={!!selectedUser}
        onOpenChange={(open) => !open && setSelectedUser(null)}
        userId={selectedUser?.userId || ""}
        userEmail={selectedUser?.email || ""}
        contentId={selectedUser?.contentId}
        contentType="party"
      />

      <AlertDialog open={!!deleteConfirm} onOpenChange={(open) => !open && setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Party</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deleteConfirm?.title}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteConfirm && deleteParty(deleteConfirm.id)}
            >
              {actionLoading === deleteConfirm?.id ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Delete"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
