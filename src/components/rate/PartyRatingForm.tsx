import { useState, useEffect } from 'react';
import { Loader2, Zap, Music, Settings, Star, GripHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerFooter } from '@/components/ui/drawer';
import { base44, type Party, type Fraternity, type PartyRating } from '@/api/base44Client';
import { clamp, getScoreColor } from '@/utils';
import { computePartyQuality } from '@/utils/scoring';
import { recordUserAction } from '@/utils/streak';

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
      
      // Record action for streak tracking
      await recordUserAction();

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

  const categories = [
    { 
      key: 'vibe', 
      label: 'Vibe', 
      icon: Zap, 
      color: 'text-amber-500',
      bgColor: 'bg-amber-500/10',
      value: vibe, 
      setValue: setVibe,
      description: 'Energy and atmosphere'
    },
    { 
      key: 'music', 
      label: 'Music', 
      icon: Music, 
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10',
      value: music, 
      setValue: setMusic,
      description: 'DJ, playlist quality'
    },
    { 
      key: 'execution', 
      label: 'Execution', 
      icon: Settings, 
      color: 'text-emerald-500',
      bgColor: 'bg-emerald-500/10',
      value: execution, 
      setValue: setExecution,
      description: 'Organization and logistics'
    },
  ];

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
            <h2 className="text-2xl font-bold text-foreground">{party.title}</h2>
            {fraternity && (
              <p className="text-sm text-muted-foreground mt-1">
                {fraternity.chapter} • {fraternity.name}
              </p>
            )}
          </DrawerTitle>
        </DrawerHeader>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {!hasLoaded ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <>
              {/* Party Quality Score */}
              <div className="px-6 py-8 text-center bg-muted/30">
                <p className="text-sm text-muted-foreground mb-3">Party Quality</p>
                <div className={`text-6xl font-bold ${getScoreColor(partyQualityScore)}`}>
                  {partyQualityScore.toFixed(1)}
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
            </>
          )}
        </div>

        {/* Footer */}
        <DrawerFooter className="px-6 py-4 border-t border-border">
          <div className="flex gap-3 w-full">
            <Button variant="outline" onClick={onClose} className="flex-1 h-12">
              Cancel
            </Button>
            <Button 
              onClick={handleSubmit}
              disabled={submitting || !hasLoaded}
              className="flex-1 h-12 gradient-primary text-white"
            >
              {submitting ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <>
                  <Star className="h-5 w-5 mr-2" />
                  {existingRating ? 'Update Rating' : 'Submit Rating'}
                </>
              )}
            </Button>
          </div>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
