import { useState } from "react";
import { Flag, Loader2, AlertCircle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useRateLimit } from "@/hooks/useRateLimit";

export type ReportContentType = "party" | "party_comment" | "fraternity_comment" | "chat_message" | "photo";
export type ReportReason = "spam" | "harassment" | "inappropriate" | "misinformation" | "other";

interface ReportContentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contentType: ReportContentType;
  contentId: string;
  contentPreview?: string;
}

const REASON_LABELS: Record<ReportReason, { label: string; description: string }> = {
  spam: { label: "Spam", description: "Promotional content or repetitive messages" },
  harassment: { label: "Harassment", description: "Bullying, threats, or targeting individuals" },
  inappropriate: { label: "Inappropriate", description: "Offensive, explicit, or harmful content" },
  misinformation: { label: "Misinformation", description: "False or misleading information" },
  other: { label: "Other", description: "Something else not listed above" },
};

export default function ReportContentDialog({
  open,
  onOpenChange,
  contentType,
  contentId,
  contentPreview,
}: ReportContentDialogProps) {
  const [reason, setReason] = useState<ReportReason | null>(null);
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const { withRateLimit } = useRateLimit();

  const handleSubmit = async () => {
    if (!reason) {
      toast({
        title: "Select a reason",
        description: "Please select a reason for your report.",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);

    try {
      const result = await withRateLimit("report", async () => {
        const { data: userData } = await supabase.auth.getUser();
        if (!userData.user) {
          throw new Error("Not authenticated");
        }

        // Type not yet generated for new table
        const { error } = await (supabase.from as any)("content_reports").insert({
          reporter_id: userData.user.id,
          content_type: contentType,
          content_id: contentId,
          reason,
          description: description.trim() || null,
          status: "pending",
        });

        if (error) throw error;
        return true;
      });

      if (result) {
        toast({
          title: "Report submitted",
          description: "Thank you for helping keep our community safe. We'll review this shortly.",
        });
        onOpenChange(false);
        setReason(null);
        setDescription("");
      }
    } catch (error) {
      console.error("Failed to submit report:", error);
      toast({
        title: "Failed to submit report",
        description: "Please try again later.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Flag className="h-5 w-5 text-destructive" />
            Report Content
          </DialogTitle>
          <DialogDescription>
            Help us understand what's wrong with this content.
          </DialogDescription>
        </DialogHeader>

        {contentPreview && (
          <div className="p-3 rounded-lg bg-muted text-sm line-clamp-3">
            "{contentPreview}"
          </div>
        )}

        <div className="space-y-4">
          <div>
            <Label className="text-sm font-medium mb-3 block">Why are you reporting this?</Label>
            <RadioGroup value={reason || ""} onValueChange={(v) => setReason(v as ReportReason)}>
              {Object.entries(REASON_LABELS).map(([key, { label, description }]) => (
                <div
                  key={key}
                  className="flex items-start space-x-3 p-3 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                  onClick={() => setReason(key as ReportReason)}
                >
                  <RadioGroupItem value={key} id={key} className="mt-0.5" />
                  <div className="flex-1">
                    <Label htmlFor={key} className="font-medium cursor-pointer">
                      {label}
                    </Label>
                    <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
                  </div>
                </div>
              ))}
            </RadioGroup>
          </div>

          <div>
            <Label htmlFor="description" className="text-sm font-medium">
              Additional details (optional)
            </Label>
            <Textarea
              id="description"
              placeholder="Provide any additional context that might help us review this report..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="mt-2 resize-none"
              rows={3}
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!reason || submitting} variant="destructive">
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Submitting...
              </>
            ) : (
              <>
                <AlertCircle className="h-4 w-4 mr-2" />
                Submit Report
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
