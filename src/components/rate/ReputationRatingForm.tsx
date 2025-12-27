import { useState } from 'react';
import { X, Star, Users, PartyPopper, Trophy, Heart } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Textarea } from '@/components/ui/textarea';
import { clamp, getScoreColor } from '@/utils';
import type { Fraternity } from '@/api/base44Client';

interface ReputationRatingFormProps {
  fraternity: Fraternity;
  onClose: () => void;
  onSubmit: (fratId: string, score: number) => Promise<void>;
  existingScore?: number;
}

const factors = [
  { icon: Users, label: 'Brotherhood culture' },
  { icon: PartyPopper, label: 'Social events quality' },
  { icon: Trophy, label: 'Campus reputation' },
  { icon: Heart, label: 'Community involvement' },
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
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        {/* Header */}
        <div className="p-4 border-b flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold">Rate {fraternity.name}</h2>
            <p className="text-sm text-muted-foreground">{fraternity.chapter}</p>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Score */}
        <div className="p-6 text-center space-y-4">
          <div className={`text-5xl font-bold ${getScoreColor(score)}`}>
            {score.toFixed(1)}
          </div>
          <Slider
            value={[score]}
            onValueChange={([v]) => setScore(clamp(v, 1, 10))}
            min={1}
            max={10}
            step={0.5}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>1</span>
            <span>5</span>
            <span>10</span>
          </div>
        </div>

        {/* Factors */}
        <div className="px-4 pb-4">
          <p className="text-sm text-muted-foreground mb-3">Consider these factors:</p>
          <div className="grid grid-cols-2 gap-2">
            {factors.map(({ icon: Icon, label }) => (
              <div key={label} className="flex items-center gap-2 text-sm p-2 rounded-lg bg-muted/50">
                <Icon className="h-4 w-4 text-primary" />
                <span>{label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Feedback */}
        <div className="px-4 pb-4">
          <Textarea
            placeholder="Additional feedback (optional)..."
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            className="resize-none"
            rows={3}
          />
        </div>

        {/* Footer */}
        <div className="p-4 border-t flex gap-2">
          <Button variant="outline" onClick={onClose} className="flex-1">
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit}
            disabled={submitting}
            className="flex-1 gradient-primary text-white"
          >
            <Star className="h-4 w-4 mr-2" />
            {submitting ? 'Submitting...' : 'Submit Rating'}
          </Button>
        </div>
      </Card>
    </div>
  );
}
