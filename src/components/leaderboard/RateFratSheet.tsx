import { useState } from 'react';
import { Check, Star } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import type { Fraternity } from '@/api/base44Client';

interface RateFratSheetProps {
  fraternity: Fraternity | null;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (score: number) => Promise<void>;
  existingScore?: number;
}

const emojis = ['😢', '😕', '😐', '🙂', '😊', '😄', '🤩', '🔥', '⭐', '👑'];

export default function RateFratSheet({ 
  fraternity, 
  isOpen, 
  onClose, 
  onSubmit,
  existingScore 
}: RateFratSheetProps) {
  const [score, setScore] = useState(existingScore ?? 5);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      await onSubmit(score);
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

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent side="bottom" className="rounded-t-3xl h-[60vh]">
        {showSuccess ? (
          <div className="flex flex-col items-center justify-center h-full space-y-4 animate-scale-in">
            <div className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center">
              <Check className="h-10 w-10 text-emerald-600" />
            </div>
            <h2 className="text-2xl font-bold">
              {existingScore !== undefined ? 'Rating Updated!' : 'Rating Submitted!'}
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

            <div className="space-y-8 px-2">
              {/* Score Display */}
              <div className="text-center space-y-2">
                <div className="text-6xl">{emojis[Math.round(score) - 1] || '😐'}</div>
                <div 
                  className={`inline-block px-6 py-2 rounded-full text-white font-bold text-3xl bg-gradient-to-r ${getScoreGradient(score)}`}
                >
                  {score.toFixed(1)}
                </div>
              </div>

              {/* Slider */}
              <div className="space-y-4">
                <Slider
                  value={[score]}
                  onValueChange={([v]) => setScore(v)}
                  min={1}
                  max={10}
                  step={1}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>1</span>
                  <span>5</span>
                  <span>10</span>
                </div>
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
