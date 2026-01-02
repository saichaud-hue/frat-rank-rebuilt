import { useEffect, useRef, useState } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Trophy, Send } from 'lucide-react';
import { chatMessageQueries, getCurrentUser } from '@/lib/supabase-data';
import { useToast } from '@/hooks/use-toast';

interface BattleRankingItem {
  fratId: string;
  fratName: string;
  tier: string;
  wins: number;
}

interface ShareBattleDialogProps {
  isOpen: boolean;
  onClose: () => void;
  ranking: BattleRankingItem[];
}

const getTierTone = (tier: string) => {
  // Use semantic tokens (no hard-coded colors)
  if (tier.includes('Touse')) return 'text-primary';
  if (tier.includes('Mouse')) return 'text-muted-foreground';
  if (tier.includes('Bouse')) return 'text-destructive';
  return 'text-muted-foreground';
};

export default function ShareBattleDialog({ isOpen, onClose, ranking }: ShareBattleDialogProps) {
  const [step, setStep] = useState<'confirm' | 'form'>('confirm');
  const [comment, setComment] = useState('');
  const [isPosting, setIsPosting] = useState(false);
  const ignoreNextConfirmCloseRef = useRef(false);
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen) {
      setStep('confirm');
      setComment('');
      ignoreNextConfirmCloseRef.current = false;
    }
  }, [isOpen]);

  const handleConfirmShare = () => {
    // Radix AlertDialog will close itself; ignore that close and transition to the sheet.
    ignoreNextConfirmCloseRef.current = true;
    setStep('form');
  };

  const handleCancel = () => {
    onClose();
  };

  const handlePost = async () => {
    setIsPosting(true);
    try {
      const userData = await getCurrentUser();
      if (!userData) {
        toast({ title: 'Please sign in to share', variant: 'destructive' });
        return;
      }

      const tierLines = ranking.map((r) => {
        const displayTier = r.tier === 'Mouse 1' || r.tier === 'Mouse 2' ? 'Mouse' : r.tier;
        return `${displayTier}: ${r.fratName}`;
      });

      let message = `🎮 Frat Battle Results\n\n${tierLines.join('\n')}`;
      if (comment.trim()) {
        message += `\n\n💬 ${comment.trim()}`;
      }

      await chatMessageQueries.create({
        user_id: userData.id,
        text: message,
        upvotes: 0,
        downvotes: 0,
        parent_message_id: null,
        mentioned_fraternity_id: null,
        mentioned_party_id: null,
      });

      toast({ title: 'Shared to Feed!' });
      onClose();
    } catch {
      toast({ title: 'Failed to share', variant: 'destructive' });
    } finally {
      setIsPosting(false);
    }
  };

  const groupedByTier = ranking.reduce(
    (acc, item) => {
      const displayTier = item.tier === 'Mouse 1' || item.tier === 'Mouse 2' ? 'Mouse' : item.tier;
      if (!acc[displayTier]) acc[displayTier] = [];
      acc[displayTier].push(item);
      return acc;
    },
    {} as Record<string, BattleRankingItem[]>
  );

  const tierOrder = [
    'Upper Touse',
    'Touse',
    'Lower Touse',
    'Upper Mouse',
    'Mouse',
    'Lower Mouse',
    'Upper Bouse',
    'Bouse',
    'Lower Bouse',
  ];
  const orderedTiers = tierOrder.filter((t) => groupedByTier[t]);

  return (
    <>
      <AlertDialog
        open={isOpen && step === 'confirm'}
        onOpenChange={(open) => {
          if (open) return;
          if (ignoreNextConfirmCloseRef.current) {
            ignoreNextConfirmCloseRef.current = false;
            return;
          }
          handleCancel();
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Share to Feed?</AlertDialogTitle>
            <AlertDialogDescription>
              Your frat battle ranking will be posted to the Activity feed for others to see.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancel}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmShare}>Yes, Share</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Sheet open={isOpen && step === 'form'} onOpenChange={(open) => !open && handleCancel()}>
        <SheetContent side="bottom" className="max-h-[85vh] rounded-t-3xl">
          <SheetHeader className="pb-3">
            <SheetTitle>Share Frat Ranking</SheetTitle>
          </SheetHeader>

          <div className="space-y-4">
            <section className="rounded-xl border border-border bg-muted/40 p-4">
              <div className="mb-3 flex items-center gap-2">
                <Trophy className="h-5 w-5 text-primary" />
                <span className="text-sm font-semibold">Frat Ranking Post</span>
              </div>

              <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm">
                {orderedTiers.flatMap((tier) =>
                  groupedByTier[tier].map((item, idx) => (
                    <div key={`${tier}-${idx}`} className="flex gap-1">
                      <span className={`font-medium ${getTierTone(tier)}`}>{tier}:</span>
                      <span className="text-foreground">{item.fratName}</span>
                    </div>
                  ))
                )}
              </div>
            </section>

            <Textarea
              placeholder="Add a comment to your ranking (optional)..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              className="min-h-[96px] resize-none"
              maxLength={500}
            />

            <Button onClick={handlePost} disabled={isPosting} className="w-full">
              <Send className="mr-2 h-4 w-4" />
              {isPosting ? 'Posting...' : 'Post'}
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
