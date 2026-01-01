import { useState, useEffect } from 'react';
import { Loader2, Users, Shield, Heart, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerFooter } from '@/components/ui/drawer';
import type { Fraternity } from '@/api/base44Client';
import { computeCombinedReputation } from '@/utils/scoring';
import { getScoreColor, clamp } from '@/utils';

interface RateFratSheetProps {
  fraternity: Fraternity | null;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (scores: { brotherhood: number; reputation: number; community: number; combined: number }) => Promise<void>;
  existingScores?: { brotherhood: number; reputation: number; community: number };
}

export default function RateFratSheet({ 
  fraternity, 
  isOpen, 
  onClose, 
  onSubmit,
  existingScores 
}: RateFratSheetProps) {
  const [brotherhood, setBrotherhood] = useState(existingScores?.brotherhood ?? 5);
  const [reputation, setReputation] = useState(existingScores?.reputation ?? 5);
  const [community, setCommunity] = useState(existingScores?.community ?? 5);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reset values when fraternity or existingScores changes
  useEffect(() => {
    if (fraternity) {
      setBrotherhood(existingScores?.brotherhood ?? 5);
      setReputation(existingScores?.reputation ?? 5);
      setCommunity(existingScores?.community ?? 5);
    }
  }, [fraternity?.id, existingScores]);

  const combinedScore = computeCombinedReputation(brotherhood, reputation, community);

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      await onSubmit({ brotherhood, reputation, community, combined: combinedScore });
      onClose();
    } catch (error) {
      console.error('Failed to submit rating:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!fraternity || !isOpen) return null;

  const categories = [
    {
      key: 'brotherhood',
      label: 'Brotherhood',
      icon: Users,
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10',
      value: brotherhood,
      setValue: setBrotherhood,
      description: 'Member quality and cohesion'
    },
    {
      key: 'reputation',
      label: 'Reputation',
      icon: Shield,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
      value: reputation,
      setValue: setReputation,
      description: 'Campus perception and standing'
    },
    {
      key: 'community',
      label: 'Community',
      icon: Heart,
      color: 'text-rose-500',
      bgColor: 'bg-rose-500/10',
      value: community,
      setValue: setCommunity,
      description: 'Welcoming and respectful'
    },
  ];

  return (
    <Drawer open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DrawerContent className="h-[95vh] max-h-[95vh] flex flex-col">
        {/* Drag Handle */}
        <div className="flex justify-center pt-2 pb-1">
          <div className="w-12 h-1.5 rounded-full bg-muted-foreground/30" />
        </div>

        {/* Header */}
        <DrawerHeader className="px-6 pt-2 pb-4 border-b border-border">
          <DrawerTitle className="text-left">
            <h2 className="text-2xl font-bold text-foreground">{fraternity.chapter}</h2>
            <p className="text-sm text-muted-foreground mt-1">{fraternity.name}</p>
          </DrawerTitle>
        </DrawerHeader>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {/* Combined Score */}
          <div className="px-6 py-8 text-center bg-muted/30">
            <p className="text-sm text-muted-foreground mb-3">Reputation Score</p>
            <div className={`text-6xl font-bold ${getScoreColor(combinedScore)}`}>
              {combinedScore.toFixed(1)}
            </div>
          </div>

          {/* Categories */}
          <div className="px-6 py-6 space-y-8">
            {categories.map(({ key, label, icon: Icon, color, bgColor, value, setValue, description }) => (
              <div key={key} className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 rounded-xl ${bgColor} flex items-center justify-center`}>
                      <Icon className={`h-6 w-6 ${color}`} />
                    </div>
                    <div>
                      <p className="text-lg font-semibold text-foreground">{label}</p>
                      <p className="text-sm text-muted-foreground">{description}</p>
                    </div>
                  </div>
                  <p className={`text-2xl font-bold ${getScoreColor(value)}`}>{value.toFixed(1)}</p>
                </div>
                <Slider
                  value={[value]}
                  onValueChange={([v]) => setValue(clamp(v, 0, 10))}
                  min={0}
                  max={10}
                  step={0.1}
                  className="w-full"
                />
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <DrawerFooter className="px-6 py-4 border-t border-border">
          <div className="flex gap-3 w-full">
            <Button variant="outline" onClick={onClose} className="flex-1 h-12">
              Cancel
            </Button>
            <Button 
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="flex-1 h-12 gradient-primary text-white"
            >
              {isSubmitting ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <>
                  <Star className="h-5 w-5 mr-2" />
                  {existingScores ? 'Update Rating' : 'Submit Rating'}
                </>
              )}
            </Button>
          </div>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}