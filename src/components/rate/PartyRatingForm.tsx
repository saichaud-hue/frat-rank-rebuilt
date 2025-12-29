import { useState, useEffect } from 'react';
import { X, Loader2, Zap, Music, Settings, Star } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { base44, type Party, type Fraternity, type PartyRating } from '@/api/base44Client';
import { clamp, getScoreColor } from '@/utils';
import { computePartyQuality } from '@/utils/scoring';

interface PartyRatingFormProps {
  party: Party;
  fraternity?: Fraternity;
  onClose: () => void;
  onSubmit: (partyId: string, ratings: { vibe: number; music: number; execution: number; partyQuality: number }) => void;
}

export default function PartyRatingForm({ party, fraternity, onClose, onSubmit }: PartyRatingFormProps) {
  const [vibe, setVibe] = useState(5);
  const [music, setMusic] = useState(5);
  const [execution, setExecution] = useState(5);
  const [submitting, setSubmitting] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [existingRating, setExistingRating] = useState<PartyRating | null>(null);

  useEffect(() => {
    loadExistingRating();
  }, [party.id]);

  const loadExistingRating = async () => {
    try {
      const user = await base44.auth.me();
      if (!user) {
        onClose();
        return;
      }

      const ratings = await base44.entities.PartyRating.filter({
        party_id: party.id,
        user_id: user.id,
      });

      if (ratings.length > 0) {
        const rating = ratings[0];
        setExistingRating(rating);
        setVibe(rating.vibe_score ?? 5);
        setMusic(rating.music_score ?? 5);
        setExecution(rating.execution_score ?? 5);
      }
    } catch (error) {
      console.error('Failed to load existing rating:', error);
    } finally {
      setHasLoaded(true);
    }
  };

  const partyQualityScore = computePartyQuality(vibe, music, execution);

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const user = await base44.auth.me();
      if (!user) return;

      const ratingData = {
        party_id: party.id,
        user_id: user.id,
        vibe_score: clamp(vibe, 0, 10),
        music_score: clamp(music, 0, 10),
        execution_score: clamp(execution, 0, 10),
        party_quality_score: clamp(partyQualityScore, 0, 10),
        weight: 1,
      };

      if (existingRating) {
        await base44.entities.PartyRating.update(existingRating.id, ratingData);
      } else {
        await base44.entities.PartyRating.create(ratingData);
      }

      // Recalculate party total ratings (keep PartyRating.party_quality_score as raw user score)
      const allRatings = await base44.entities.PartyRating.filter({ party_id: party.id });
      const totalRatingsCount = allRatings.length;

      // IMPORTANT: Do NOT write any user-derived or aggregated scores back onto Party.
      // Party list displays must be derived from PartyRating aggregation only.
      await base44.entities.Party.update(party.id, {
        total_ratings: totalRatingsCount,
      });

      onSubmit(party.id, { vibe, music, execution, partyQuality: partyQualityScore });
    } catch (error) {
      console.error('Failed to submit rating:', error);
    } finally {
      setSubmitting(false);
    }
  };

  if (!hasLoaded) {
    return (
      <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center">
        <Card className="p-8">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
          <p className="text-center mt-4 text-muted-foreground">Loading...</p>
        </Card>
      </div>
    );
  }

  const categories = [
    { 
      key: 'vibe', 
      label: 'Vibe', 
      icon: Zap, 
      color: 'text-amber-500',
      value: vibe, 
      setValue: setVibe,
      description: 'Energy and atmosphere'
    },
    { 
      key: 'music', 
      label: 'Music', 
      icon: Music, 
      color: 'text-blue-500',
      value: music, 
      setValue: setMusic,
      description: 'DJ, playlist quality'
    },
    { 
      key: 'execution', 
      label: 'Execution', 
      icon: Settings, 
      color: 'text-green-500',
      value: execution, 
      setValue: setExecution,
      description: 'Organization and logistics'
    },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <Card className="w-full max-w-lg max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-card p-4 border-b flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold">{party.title}</h2>
            {fraternity && (
              <p className="text-sm text-muted-foreground">
                {fraternity.name} • {fraternity.chapter}
              </p>
            )}
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Party Quality Score */}
        <div className="p-6 text-center border-b">
          <p className="text-sm text-muted-foreground mb-2">Party Quality</p>
          <div className={`text-5xl font-bold ${getScoreColor(partyQualityScore)}`}>
            {partyQualityScore.toFixed(1)}
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
            disabled={submitting}
            className="flex-1 gradient-primary text-white"
          >
            {submitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <Star className="h-4 w-4 mr-2" />
                {existingRating ? 'Update Rating' : 'Submit Rating'}
              </>
            )}
          </Button>
        </div>
      </Card>
    </div>
  );
}