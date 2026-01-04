import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { PartyPopper, X, ChevronRight } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

const LAST_VISIT_KEY = "frat_rank_last_visit";

type NewParty = {
  id: string;
  title: string | null;
  starts_at: string | null;
  fraternity_name: string | null;
};

export function NewPartiesNotification() {
  const [open, setOpen] = useState(false);
  const [newParties, setNewParties] = useState<NewParty[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    const checkNewParties = async () => {
      // Get last visit timestamp
      const lastVisit = localStorage.getItem(LAST_VISIT_KEY);
      const now = new Date().toISOString();

      // Update last visit immediately
      localStorage.setItem(LAST_VISIT_KEY, now);

      // If no last visit, this is first time - don't show notification
      if (!lastVisit) {
        return;
      }

      try {
        // Fetch parties created after last visit that are upcoming or live
        const { data: parties, error } = await supabase
          .from("parties")
          .select("id, title, starts_at, fraternity_id")
          .in("status", ["upcoming", "live"])
          .gt("created_at", lastVisit)
          .order("starts_at", { ascending: true })
          .limit(10);

        if (error) {
          console.error("Error fetching new parties:", error);
          return;
        }

        if (!parties || parties.length === 0) {
          return;
        }

        // Get fraternity names
        const fratIds = parties
          .map((p) => p.fraternity_id)
          .filter((id): id is string => !!id);

        let fratMap: Record<string, string> = {};
        if (fratIds.length > 0) {
          const { data: frats } = await supabase
            .from("fraternities")
            .select("id, name")
            .in("id", fratIds);

          (frats ?? []).forEach((f) => {
            fratMap[f.id] = f.name;
          });
        }

        const partiesWithNames = parties.map((p) => ({
          id: p.id,
          title: p.title,
          starts_at: p.starts_at,
          fraternity_name: p.fraternity_id ? fratMap[p.fraternity_id] || null : null,
        }));

        setNewParties(partiesWithNames);
        setOpen(true);
      } catch (err) {
        console.error("Error checking new parties:", err);
      }
    };

    // Small delay to let the app load first
    const timer = setTimeout(checkNewParties, 1000);
    return () => clearTimeout(timer);
  }, []);

  const handleViewParty = (partyId: string) => {
    setOpen(false);
    navigate(`/party/${partyId}`);
  };

  const handleViewAll = () => {
    setOpen(false);
    navigate("/parties");
  };

  if (newParties.length === 0) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PartyPopper className="h-5 w-5 text-primary" />
            {newParties.length === 1
              ? "New Party Added!"
              : `${newParties.length} New Parties!`}
          </DialogTitle>
        </DialogHeader>

        <p className="text-sm text-muted-foreground">
          Since you were last here, {newParties.length === 1 ? "a new party has" : "new parties have"} been added:
        </p>

        <ScrollArea className="max-h-64">
          <div className="space-y-2">
            {newParties.map((party) => (
              <button
                key={party.id}
                onClick={() => handleViewParty(party.id)}
                className="w-full p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors text-left flex items-center justify-between gap-2"
              >
                <div className="min-w-0 flex-1">
                  <p className="font-medium truncate">
                    {party.title || "Untitled Party"}
                  </p>
                  {party.fraternity_name && (
                    <p className="text-xs text-muted-foreground truncate">
                      {party.fraternity_name}
                    </p>
                  )}
                  {party.starts_at && (
                    <p className="text-xs text-primary mt-0.5">
                      {format(new Date(party.starts_at), "EEE, MMM d 'at' h:mm a")}
                    </p>
                  )}
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
              </button>
            ))}
          </div>
        </ScrollArea>

        <div className="flex gap-2 pt-2">
          <Button variant="outline" className="flex-1" onClick={() => setOpen(false)}>
            Dismiss
          </Button>
          <Button className="flex-1" onClick={handleViewAll}>
            View All Parties
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
