import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Ban, AlertTriangle, Mail } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

interface UserActionSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  userEmail: string;
  contentId?: string;
  contentType?: "party" | "comment" | "post";
}

export function UserActionSheet({
  open,
  onOpenChange,
  userId,
  userEmail,
  contentId,
  contentType,
}: UserActionSheetProps) {
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [blockReason, setBlockReason] = useState("");
  const [offenseType, setOffenseType] = useState("");
  const [offenseDescription, setOffenseDescription] = useState("");

  const handleBlock = async () => {
    if (!userId) return;
    setLoading(true);

    const { data: user } = await supabase.auth.getUser();
    if (!user.user) {
      toast({ title: "Error", description: "Not authenticated", variant: "destructive" });
      setLoading(false);
      return;
    }

    const { error } = await supabase.from("blocked_users").insert({
      user_id: userId,
      blocked_by: user.user.id,
      reason: blockReason || null,
    });

    if (error) {
      if (error.code === "23505") {
        toast({ title: "User already blocked", variant: "destructive" });
      } else {
        toast({ title: "Error blocking user", description: error.message, variant: "destructive" });
      }
    } else {
      toast({ title: "User blocked successfully" });
      await queryClient.invalidateQueries({ queryKey: ["admin"] });
      onOpenChange(false);
    }
    setLoading(false);
  };

  const handleRecordOffense = async () => {
    if (!userId || !offenseType) return;
    setLoading(true);

    const { data: user } = await supabase.auth.getUser();
    if (!user.user) {
      toast({ title: "Error", description: "Not authenticated", variant: "destructive" });
      setLoading(false);
      return;
    }

    const { error } = await supabase.from("user_offenses").insert({
      user_id: userId,
      offense_type: offenseType,
      description: offenseDescription || null,
      content_id: contentId || null,
      content_type: contentType || null,
      recorded_by: user.user.id,
    });

    if (error) {
      toast({ title: "Error recording offense", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Offense recorded" });
      await queryClient.invalidateQueries({ queryKey: ["admin"] });
      setOffenseType("");
      setOffenseDescription("");
    }
    setLoading(false);
  };

  const handleBlockAndRecord = async () => {
    if (!offenseType) {
      toast({ title: "Please select an offense type", variant: "destructive" });
      return;
    }
    await handleRecordOffense();
    await handleBlock();
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[80vh] overflow-y-auto">
        <SheetHeader className="text-left">
          <SheetTitle className="flex items-center gap-2">
            <Mail className="h-4 w-4" />
            User Actions
          </SheetTitle>
          <SheetDescription>
            {userEmail}
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Record Offense */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              <Label className="font-semibold">Record Offense</Label>
            </div>
            <Select value={offenseType} onValueChange={setOffenseType}>
              <SelectTrigger>
                <SelectValue placeholder="Select offense type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="fake_party">Fake Party</SelectItem>
                <SelectItem value="inappropriate_comment">Inappropriate Comment</SelectItem>
                <SelectItem value="inappropriate_post">Inappropriate Post</SelectItem>
                <SelectItem value="spam">Spam</SelectItem>
                <SelectItem value="harassment">Harassment</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
            <Input
              placeholder="Description (optional)"
              value={offenseDescription}
              onChange={(e) => setOffenseDescription(e.target.value)}
            />
            <Button
              variant="outline"
              className="w-full"
              onClick={handleRecordOffense}
              disabled={loading || !offenseType}
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Record Offense Only
            </Button>
          </div>

          {/* Block User */}
          <div className="space-y-3 pt-3 border-t">
            <div className="flex items-center gap-2">
              <Ban className="h-4 w-4 text-red-500" />
              <Label className="font-semibold">Block User</Label>
            </div>
            <Input
              placeholder="Block reason (optional)"
              value={blockReason}
              onChange={(e) => setBlockReason(e.target.value)}
            />
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={handleBlock}
                disabled={loading}
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Block Only
              </Button>
              <Button
                variant="destructive"
                className="flex-1"
                onClick={handleBlockAndRecord}
                disabled={loading || !offenseType}
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Record & Block
              </Button>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}