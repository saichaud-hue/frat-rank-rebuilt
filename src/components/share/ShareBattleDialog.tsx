import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import { Trophy, X, Send } from 'lucide-react';
import { base44 } from '@/api/base44Client';
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

const getTierColor = (tier: string) => {
  if (tier.includes('Upper Touse')) return 'text-green-600';
  if (tier.includes('Lower Touse')) return 'text-green-500';
  if (tier === 'Touse') return 'text-green-600';
  if (tier.includes('Upper Mouse')) return 'text-amber-600';
  if (tier.includes('Lower Mouse') || tier === 'Mouse' || tier === 'Mouse 1' || tier === 'Mouse 2') return 'text-amber-500';
  if (tier.includes('Upper Bouse')) return 'text-red-500';
  if (tier.includes('Lower Bouse')) return 'text-red-600';
  if (tier === 'Bouse') return 'text-red-600';
  return 'text-muted-foreground';
};

export default function ShareBattleDialog({ isOpen, onClose, ranking }: ShareBattleDialogProps) {
  const [step, setStep] = useState<'confirm' | 'form'>('confirm');
  const [comment, setComment] = useState('');
  const [isPosting, setIsPosting] = useState(false);
  const { toast } = useToast();

  // Reset state when dialog opens
  useEffect(() => {
    if (isOpen) {
      setStep('confirm');
      setComment('');
    }
  }, [isOpen]);

  const handleConfirmShare = () => {
    setStep('form');
  };

  const handleCancel = () => {
    onClose();
  };

  const handlePost = async () => {
    setIsPosting(true);
    try {
      const userData = await base44.auth.me();
      if (!userData) {
        toast({ title: "Please sign in to share", variant: "destructive" });
        return;
      }

      const tierLines = ranking.map(r => {
        const displayTier = r.tier === 'Mouse 1' || r.tier === 'Mouse 2' ? 'Mouse' : r.tier;
        return `${displayTier}: ${r.fratName}`;
      });

      let message = `🎮 Frat Battle Results\n\n${tierLines.join('\n')}`;
      if (comment.trim()) {
        message += `\n\n💬 ${comment.trim()}`;
      }

      await base44.entities.ChatMessage.create({
        user_id: userData.id,
        text: message,
        upvotes: 0,
        downvotes: 0,
      });

      toast({ title: "Shared to Feed!" });
      onClose();
    } catch (error) {
      toast({ title: "Failed to share", variant: "destructive" });
    } finally {
      setIsPosting(false);
    }
  };

  // Group rankings by tier for display
  const groupedByTier = ranking.reduce((acc, item) => {
    const displayTier = item.tier === 'Mouse 1' || item.tier === 'Mouse 2' ? 'Mouse' : item.tier;
    if (!acc[displayTier]) acc[displayTier] = [];
    acc[displayTier].push(item);
    return acc;
  }, {} as Record<string, BattleRankingItem[]>);

  // Order tiers
  const tierOrder = ['Upper Touse', 'Touse', 'Lower Touse', 'Upper Mouse', 'Mouse', 'Lower Mouse', 'Upper Bouse', 'Bouse', 'Lower Bouse'];
  const orderedTiers = tierOrder.filter(t => groupedByTier[t]);

  return (
    <>
      {/* Confirmation Dialog */}
      <AlertDialog open={isOpen && step === 'confirm'} onOpenChange={(open) => !open && handleCancel()}>
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

      {/* Share Form Dialog */}
      <Dialog open={isOpen && step === 'form'} onOpenChange={(open) => !open && handleCancel()}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Share Frat Ranking</DialogTitle>
          </DialogHeader>

          {/* Ranking Preview Card */}
          <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-4 relative">
            <button
              onClick={() => {}}
              className="absolute top-2 right-2 text-muted-foreground hover:text-foreground"
              aria-label="Close preview"
            >
              <X className="h-4 w-4" />
            </button>
            
            <div className="flex items-center gap-2 mb-3">
              <Trophy className="h-5 w-5 text-amber-500" />
              <span className="font-semibold text-sm">Frat Ranking Post</span>
            </div>

            <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm">
              {orderedTiers.map(tier => (
                groupedByTier[tier].map((item, idx) => (
                  <div key={`${tier}-${idx}`} className="flex gap-1">
                    <span className={`font-medium ${getTierColor(tier)}`}>{tier}:</span>
                    <span className="text-foreground">{item.fratName}</span>
                  </div>
                ))
              ))}
            </div>
          </div>

          {/* Comment Input */}
          <Textarea
            placeholder="Add a comment to your ranking (optional)..."
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            className="min-h-[80px] resize-none"
            maxLength={500}
          />

          {/* Post Button */}
          <Button 
            onClick={handlePost} 
            disabled={isPosting}
            className="w-full bg-primary hover:bg-primary/90"
          >
            <Send className="h-4 w-4 mr-2" />
            {isPosting ? 'Posting...' : 'Post'}
          </Button>
        </DialogContent>
      </Dialog>
    </>
  );
}
