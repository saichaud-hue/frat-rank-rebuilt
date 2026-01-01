import { useState } from 'react';
import { Star, Users, PartyPopper, Trophy, Heart, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Textarea } from '@/components/ui/textarea';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerFooter } from '@/components/ui/drawer';
import { clamp, getScoreColor } from '@/utils';
import type { Fraternity } from '@/api/base44Client';

interface ReputationRatingFormProps {
  fraternity: Fraternity;
  onClose: () => void;
  onSubmit: (fratId: string, score: number) => Promise<void>;
  existingScore?: number;
}

const factors = [
  { icon: Users, label: 'Brotherhood culture', color: 'text-blue-500', bgColor: 'bg-blue-500/10' },
  { icon: PartyPopper, label: 'Social events quality', color: 'text-amber-500', bgColor: 'bg-amber-500/10' },
  { icon: Trophy, label: 'Campus reputation', color: 'text-purple-500', bgColor: 'bg-purple-500/10' },
  { icon: Heart, label: 'Community involvement', color: 'text-rose-500', bgColor: 'bg-rose-500/10' },
];

export default function ReputationRatingForm({ 
  fraternity, 
  onClose, 
  onSubmit,
  existingScore 
}: ReputationRatingFormProps) {
  const [score, setScore] = useState(existingScore ?? 5);
  const [feedback, setFeedback] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      await onSubmit(fraternity.id, score);
      onClose();
    } catch (error) {
      console.error('Failed to submit rating:', error);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Drawer open={true} onOpenChange={(open) => !open && onClose()}>
      <DrawerContent className="h-[95vh] max-h-[95vh] flex flex-col">
        {/* Drag Handle */}
        <div className="flex justify-center pt-2 pb-1">
          <div className="w-12 h-1.5 rounded-full bg-muted-foreground/30" />
        </div>

        {/* Header */}
        <DrawerHeader className="px-6 pt-2 pb-4 border-b border-border">
          <DrawerTitle className="text-left">
            <h2 className="text-2xl font-bold text-foreground">Rate {fraternity.chapter}</h2>
            <p className="text-sm text-muted-foreground mt-1">{fraternity.name}</p>
          </DrawerTitle>
        </DrawerHeader>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {/* Score Display */}
          <div className="px-6 py-8 text-center bg-muted/30">
            <p className="text-sm text-muted-foreground mb-3">Overall Rating</p>
            <div className={`text-6xl font-bold ${getScoreColor(score)}`}>
              {score.toFixed(1)}
            </div>
          </div>

          {/* Slider */}
          <div className="px-6 py-6 space-y-4">
            <Slider
              value={[score]}
              onValueChange={([v]) => setScore(clamp(v, 1, 10))}
              min={1}
              max={10}
              step={0.5}
              className="w-full"
            />
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>1</span>
              <span>5</span>
              <span>10</span>
            </div>
          </div>

          {/* Factors */}
          <div className="px-6 pb-6">
            <p className="text-sm font-medium text-muted-foreground mb-4">Consider these factors:</p>
            <div className="grid grid-cols-1 gap-3">
              {factors.map(({ icon: Icon, label, color, bgColor }) => (
                <div 
                  key={label} 
                  className="flex items-center gap-3 p-4 rounded-xl bg-muted/50"
                >
                  <div className={`w-10 h-10 rounded-lg ${bgColor} flex items-center justify-center`}>
                    <Icon className={`h-5 w-5 ${color}`} />
                  </div>
                  <span className="text-foreground font-medium">{label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Feedback */}
          <div className="px-6 pb-6">
            <Textarea
              placeholder="Additional feedback (optional)..."
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              className="resize-none min-h-[100px]"
              rows={4}
            />
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
              disabled={submitting}
              className="flex-1 h-12 gradient-primary text-white"
            >
              {submitting ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <>
                  <Star className="h-5 w-5 mr-2" />
                  Submit Rating
                </>
              )}
            </Button>
          </div>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}