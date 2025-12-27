import { useState, useEffect } from 'react';
import { X, Loader2, Sparkles, Music, Wine, Star } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { base44, type Party, type Fraternity, type PartyRating } from '@/api/base44Client';
import { clamp, getScoreColor } from '@/utils';

interface PartyRatingFormProps {
  party: Party;
  fraternity?: Fraternity;
  onClose: () => void;
  onSubmit: (partyId: string, ratings: { fun: number; music: number; alcohol: number; overall: number }) => void;
}

export default function PartyRatingForm({ party, fraternity, onClose, onSubmit }: PartyRatingFormProps) {
  const [fun, setFun] = useState(5);
  const [music, setMusic] = useState(5);
  const [alcohol, setAlcohol] = useState(5);
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
        setHasLoaded(true);
        return;
      }

      const ratings = await base44.entities.PartyRating.filter({
        party_id: party.id,
        user_id: user.id,
      });

      if (ratings.length > 0) {
        const rating = ratings[0];
        setExistingRating(rating);
        setFun(rating.fun_score ?? 5);
        setMusic(rating.music_score ?? 5);
        setAlcohol(rating.alcohol_score ?? 5);
      }
    } catch (error) {
      console.error('Failed to load existing rating:', error);
    } finally {
      setHasLoaded(true);
    }
  };

  const overallScore = fun * 0.66 + music * 0.17 + alcohol * 0.17;

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const user = await base44.auth.me();
      if (!user) return;

      const ratingData = {
        party_id: party.id,
        user_id: user.id,
        fun_score: clamp(fun, 0, 10),
        music_score: clamp(music, 0, 10),
        alcohol_score: clamp(alcohol, 0, 10),
        overall_score: clamp(overallScore, 0, 10),
        weight: 1,
      };

      if (existingRating) {
        await base44.entities.PartyRating.update(existingRating.id, ratingData);
      } else {
        await base44.entities.PartyRating.create(ratingData);
      }

      // Recalculate party scores
      const allRatings = await base44.entities.PartyRating.filter({ party_id: party.id });
      const totalRatingsCount = allRatings.length;
      
      const avgFun = allRatings.reduce((sum, r) => sum + (r.fun_score ?? 0), 0) / totalRatingsCount;
      const avgMusic = allRatings.reduce((sum, r) => sum + (r.music_score ?? 0), 0) / totalRatingsCount;
      const avgAlcohol = allRatings.reduce((sum, r) => sum + (r.alcohol_score ?? 0), 0) / totalRatingsCount;
      const performanceScore = avgFun * 0.66 + avgMusic * 0.17 + avgAlcohol * 0.17;

      await base44.entities.Party.update(party.id, {
        performance_score: clamp(performanceScore, 0, 10),
        total_ratings: totalRatingsCount,
      });

      // Update fraternity scores if applicable
      if (party.fraternity_id) {
        const fratRecords = await base44.entities.Fraternity.filter({ id: party.fraternity_id });
        if (fratRecords.length > 0) {
          const currentFrat = fratRecords[0];
          
          const fratParties = await base44.entities.Party.filter({ 
            fraternity_id: party.fraternity_id,
            status: 'completed' 
          });
          
          const partyBaseScore = fratParties.length > 0
            ? fratParties.reduce((sum, p) => sum + (p.performance_score ?? 5), 0) / fratParties.length
            : 5;

          const reputationRatings = await base44.entities.ReputationRating.filter({
            fraternity_id: party.fraternity_id
          });
          
          const reputationScore = reputationRatings.length > 0
            ? reputationRatings.reduce((sum, r) => sum + (r.score ?? 5), 0) / reputationRatings.length
            : 5;

          const overallScoreBase = (0.5 * reputationScore) + (0.5 * partyBaseScore);
          const prevOverall = currentFrat.display_score ?? overallScoreBase;
          const newOverall = (prevOverall * 0.8) + (performanceScore * 0.2);
          const momentum = performanceScore - overallScoreBase;

          await base44.entities.Fraternity.update(party.fraternity_id, {
            reputation_score: clamp(reputationScore, 0, 10),
            historical_party_score: clamp(partyBaseScore, 0, 10),
            base_score: clamp(overallScoreBase, 0, 10),
            display_score: clamp(newOverall, 0, 10),
            momentum: clamp(momentum, -2, 2),
          });
        }
      }

      onSubmit(party.id, { fun, music, alcohol, overall: overallScore });
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
      key: 'fun', 
      label: 'Fun Factor', 
      icon: Sparkles, 
      color: 'text-amber-500',
      value: fun, 
      setValue: setFun,
      description: 'Overall vibe and energy',
      weight: '66%'
    },
    { 
      key: 'music', 
      label: 'Music', 
      icon: Music, 
      color: 'text-blue-500',
      value: music, 
      setValue: setMusic,
      description: 'DJ, playlist quality',
      weight: '17%'
    },
    { 
      key: 'alcohol', 
      label: 'Drinks', 
      icon: Wine, 
      color: 'text-purple-500',
      value: alcohol, 
      setValue: setAlcohol,
      description: 'Drink selection and availability',
      weight: '17%'
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

        {/* Overall Score */}
        <div className="p-6 text-center border-b">
          <p className="text-sm text-muted-foreground mb-2">Overall Score</p>
          <div className={`text-5xl font-bold ${getScoreColor(overallScore)}`}>
            {overallScore.toFixed(1)}
          </div>
        </div>

        {/* Categories */}
        <div className="p-4 space-y-6">
          {categories.map(({ key, label, icon: Icon, color, value, setValue, description, weight }) => (
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
                <div className="text-right">
                  <p className={`text-xl font-bold ${getScoreColor(value)}`}>{value.toFixed(1)}</p>
                  <Badge variant="outline" className="text-xs">{weight}</Badge>
                </div>
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
