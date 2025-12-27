import { useState, useEffect } from 'react';
import { Check, Star, Users, Shield, Heart } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import type { Fraternity } from '@/api/base44Client';
import { computeCombinedReputation } from '@/utils/scoring';
import { getScoreColor } from '@/utils';

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
  const [showSuccess, setShowSuccess] = useState(false);

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
      setShowSuccess(true);
      setTimeout(() => {
        setShowSuccess(false);
        onClose();
      }, 1500);
    } catch (error) {
      console.error('Failed to submit rating:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getScoreGradient = (s: number) => {
    if (s >= 8) return 'from-emerald-500 to-green-400';
    if (s >= 6) return 'from-blue-500 to-indigo-400';
    if (s >= 4) return 'from-amber-500 to-yellow-400';
    return 'from-red-500 to-orange-400';
  };

  if (!fraternity) return null;

  const sliders = [
    {
      key: 'brotherhood',
      label: 'Brotherhood',
      helper: 'Member quality and cohesion',
      icon: Users,
      value: brotherhood,
      setValue: setBrotherhood,
      color: 'text-blue-500'
    },
    {
      key: 'reputation',
      label: 'Reputation',
      helper: 'Campus perception and overall standing',
      icon: Shield,
      value: reputation,
      setValue: setReputation,
      color: 'text-primary'
    },
    {
      key: 'community',
      label: 'Community',
      helper: 'Welcoming, respectful, positive presence',
      icon: Heart,
      value: community,
      setValue: setCommunity,
      color: 'text-rose-500'
    },
  ];

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent side="bottom" className="rounded-t-3xl h-[85vh] overflow-y-auto">
        {showSuccess ? (
          <div className="flex flex-col items-center justify-center h-full space-y-4 animate-scale-in">
            <div className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center">
              <Check className="h-10 w-10 text-emerald-600" />
            </div>
            <h2 className="text-2xl font-bold">
              {existingScores ? 'Rating Updated!' : 'Rating Submitted!'}
            </h2>
            <p className="text-muted-foreground">Thank you for your feedback</p>
          </div>
        ) : (
          <>
            <SheetHeader className="pb-4">
              <SheetTitle className="text-center">
                Rate {fraternity.name}
              </SheetTitle>
            </SheetHeader>

            <div className="space-y-6 px-2">
              {/* Combined Score Display */}
              <div className="text-center space-y-2">
                <p className="text-sm text-muted-foreground">Combined Reputation Score</p>
                <div 
                  className={`inline-block px-6 py-2 rounded-full text-white font-bold text-3xl bg-gradient-to-r ${getScoreGradient(combinedScore)}`}
                >
                  {combinedScore.toFixed(1)}
                </div>
              </div>

              {/* Sliders */}
              <div className="space-y-5">
                {sliders.map(({ key, label, helper, icon: Icon, value, setValue, color }) => (
                  <div key={key} className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-full bg-muted flex items-center justify-center ${color}`}>
                          <Icon className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="font-medium text-sm">{label}</p>
                          <p className="text-xs text-muted-foreground">{helper}</p>
                        </div>
                      </div>
                      <p className={`text-lg font-bold ${getScoreColor(value)}`}>{value.toFixed(1)}</p>
                    </div>
                    <Slider
                      value={[value]}
                      onValueChange={([v]) => setValue(v)}
                      min={1}
                      max={10}
                      step={0.5}
                      className="w-full"
                    />
                  </div>
                ))}
              </div>

              {/* Submit Button */}
              <Button 
                className="w-full gradient-primary text-white py-6 text-lg"
                onClick={handleSubmit}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <span className="animate-pulse">Submitting...</span>
                ) : (
                  <>
                    <Star className="h-5 w-5 mr-2" />
                    Submit Rating
                  </>
                )}
              </Button>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}