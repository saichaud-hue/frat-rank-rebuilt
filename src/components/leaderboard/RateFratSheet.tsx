import { useState, useEffect } from 'react';
import { X, Loader2, Users, Shield, Heart, Star } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
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

  // Reset values when existingScores changes
  useEffect(() => {
    setBrotherhood(existingScores?.brotherhood ?? 5);
    setReputation(existingScores?.reputation ?? 5);
    setCommunity(existingScores?.community ?? 5);
  }, [existingScores]);

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
      value: brotherhood,
      setValue: setBrotherhood,
      description: 'Member quality and cohesion'
    },
    {
      key: 'reputation',
      label: 'Reputation',
      icon: Shield,
      color: 'text-primary',
      value: reputation,
      setValue: setReputation,
      description: 'Campus perception and standing'
    },
    {
      key: 'community',
      label: 'Community',
      icon: Heart,
      color: 'text-rose-500',
      value: community,
      setValue: setCommunity,
      description: 'Welcoming and respectful'
    },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <Card className="w-full max-w-lg max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-card p-4 border-b flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold">{fraternity.name}</h2>
            {fraternity.chapter && (
              <p className="text-sm text-muted-foreground">{fraternity.chapter}</p>
            )}
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Combined Score */}
        <div className="p-6 text-center border-b">
          <p className="text-sm text-muted-foreground mb-2">Reputation Score</p>
          <div className={`text-5xl font-bold ${getScoreColor(combinedScore)}`}>
            {combinedScore.toFixed(1)}
          </div>
        </div>

        {/* Categories */}
        <div className="p-4 space-y-6">
          {categories.map(({ key, label, icon: Icon, color, value, setValue, description }) => (
            <div key={key} className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full bg-muted flex items-center justify-center ${color}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-medium">{label}</p>
                    <p className="text-xs text-muted-foreground">{description}</p>
                  </div>
                </div>
                <p className={`text-xl font-bold ${getScoreColor(value)}`}>{value.toFixed(1)}</p>
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

        {/* Footer */}
        <div className="sticky bottom-0 bg-card p-4 border-t flex gap-2">
          <Button variant="outline" onClick={onClose} className="flex-1">
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="flex-1 gradient-primary text-white"
          >
            {isSubmitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <Star className="h-4 w-4 mr-2" />
                {existingScores ? 'Update Rating' : 'Submit Rating'}
              </>
            )}
          </Button>
        </div>
      </Card>
    </div>
  );
}