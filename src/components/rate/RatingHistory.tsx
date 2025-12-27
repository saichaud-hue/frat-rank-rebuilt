import { useState, useEffect } from 'react';
import { Clock, Star, PartyPopper, Zap, Music, Settings, Pencil, Users, Shield, Heart } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { base44, type PartyRating, type ReputationRating, type Party, type Fraternity } from '@/api/base44Client';
import { formatTimeAgo, getScoreBgColor } from '@/utils';
import PartyRatingForm from './PartyRatingForm';
import RateFratSheet from '@/components/leaderboard/RateFratSheet';

export default function RatingHistory() {
  const [partyRatings, setPartyRatings] = useState<(PartyRating & { party?: Party; fraternity?: Fraternity })[]>([]);
  const [reputationRatings, setReputationRatings] = useState<(ReputationRating & { fraternity?: Fraternity })[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Edit state
  const [editingPartyRating, setEditingPartyRating] = useState<(PartyRating & { party?: Party; fraternity?: Fraternity }) | null>(null);
  const [editingRepRating, setEditingRepRating] = useState<(ReputationRating & { fraternity?: Fraternity }) | null>(null);

  useEffect(() => {
    loadRatings();
  }, []);

  const loadRatings = async () => {
    try {
      const user = await base44.auth.me();
      if (!user) {
        setLoading(false);
        return;
      }

      // Load party ratings
      const pRatings = await base44.entities.PartyRating.filter(
        { user_id: user.id },
        '-created_date'
      );

      // Load related parties and fraternities
      const enrichedPartyRatings = await Promise.all(
        pRatings.map(async (rating) => {
          const party = await base44.entities.Party.get(rating.party_id);
          let fraternity: Fraternity | undefined;
          if (party?.fraternity_id) {
            fraternity = (await base44.entities.Fraternity.get(party.fraternity_id)) ?? undefined;
          }
          return { ...rating, party: party ?? undefined, fraternity };
        })
      );
      setPartyRatings(enrichedPartyRatings);

      // Load reputation ratings
      const rRatings = await base44.entities.ReputationRating.filter(
        { user_id: user.id },
        '-created_date'
      );

      const enrichedRepRatings = await Promise.all(
        rRatings.map(async (rating) => {
          const fraternity = await base44.entities.Fraternity.get(rating.fraternity_id);
          return { ...rating, fraternity: fraternity ?? undefined };
        })
      );
      setReputationRatings(enrichedRepRatings);
    } catch (error) {
      console.error('Failed to load ratings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePartyRatingSubmit = () => {
    setEditingPartyRating(null);
    loadRatings();
  };

  const handleRepRatingSubmit = async (scores: { brotherhood: number; reputation: number; community: number; combined: number }) => {
    if (!editingRepRating) return;
    
    try {
      await base44.entities.ReputationRating.update(editingRepRating.id, {
        brotherhood_score: scores.brotherhood,
        reputation_score: scores.reputation,
        community_score: scores.community,
        combined_score: scores.combined,
      });
      
      // Recalculate fraternity reputation score
      if (editingRepRating.fraternity_id) {
        const allRepRatings = await base44.entities.ReputationRating.filter({
          fraternity_id: editingRepRating.fraternity_id
        });
        
        const avgReputation = allRepRatings.length > 0
          ? allRepRatings.reduce((sum, r) => sum + (r.combined_score ?? 5), 0) / allRepRatings.length
          : 5;
        
        await base44.entities.Fraternity.update(editingRepRating.fraternity_id, {
          reputation_score: Math.min(10, Math.max(0, avgReputation)),
        });
      }
      
      loadRatings();
    } catch (error) {
      console.error('Failed to update reputation rating:', error);
    }
  };

  if (loading) {
    return (
      <Card className="glass p-4 space-y-4">
        <div className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          <h3 className="font-semibold">My Ratings</h3>
        </div>
        {[1, 2, 3].map((i) => (
          <div key={i} className="space-y-2 p-3 rounded-lg bg-muted/30">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-full" />
          </div>
        ))}
      </Card>
    );
  }

  const hasNoRatings = partyRatings.length === 0 && reputationRatings.length === 0;

  return (
    <>
      <Card className="glass p-4 space-y-4">
        <div className="flex items-center gap-2">
          <Star className="h-5 w-5 text-primary" />
          <h3 className="font-semibold">My Ratings</h3>
        </div>

        {hasNoRatings ? (
          <div className="text-center py-12 space-y-2">
            <Star className="h-12 w-12 mx-auto text-muted-foreground/50" />
            <p className="text-muted-foreground">No ratings yet</p>
            <p className="text-sm text-muted-foreground">
              Start rating parties and fraternities to see your history here
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Party Ratings */}
            {partyRatings.map((rating) => (
              <div key={rating.id} className="p-3 rounded-lg bg-muted/30 space-y-2">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <PartyPopper className="h-4 w-4 text-primary" />
                      <span className="font-medium">{rating.party?.title || 'Party'}</span>
                    </div>
                    {rating.fraternity && (
                      <p className="text-sm text-muted-foreground">
                        {rating.fraternity.name} • {rating.fraternity.chapter}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={`${getScoreBgColor(rating.party_quality_score ?? 0)} text-white`}>
                      {(rating.party_quality_score ?? 0).toFixed(1)}
                    </Badge>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8"
                      onClick={() => setEditingPartyRating(rating)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1 text-xs">
                    <Zap className="h-3.5 w-3.5 text-amber-500" />
                    <span>{(rating.vibe_score ?? 0).toFixed(1)}</span>
                  </div>
                  <div className="flex items-center gap-1 text-xs">
                    <Music className="h-3.5 w-3.5 text-blue-500" />
                    <span>{(rating.music_score ?? 0).toFixed(1)}</span>
                  </div>
                  <div className="flex items-center gap-1 text-xs">
                    <Settings className="h-3.5 w-3.5 text-green-500" />
                    <span>{(rating.execution_score ?? 0).toFixed(1)}</span>
                  </div>
                </div>

                <p className="text-xs text-muted-foreground">
                  {formatTimeAgo(rating.created_date)}
                </p>
              </div>
            ))}

            {/* Reputation Ratings */}
            {reputationRatings.map((rating) => (
              <div key={rating.id} className="p-3 rounded-lg bg-muted/30 space-y-2">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">Reputation Rating</p>
                    {rating.fraternity && (
                      <p className="font-medium">
                        {rating.fraternity.name} • {rating.fraternity.chapter}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={`${getScoreBgColor(rating.combined_score ?? 0)} text-white`}>
                      {(rating.combined_score ?? 0).toFixed(1)}
                    </Badge>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8"
                      onClick={() => setEditingRepRating(rating)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* Show individual scores */}
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1 text-xs">
                    <Users className="h-3.5 w-3.5 text-blue-500" />
                    <span>{(rating.brotherhood_score ?? 0).toFixed(1)}</span>
                  </div>
                  <div className="flex items-center gap-1 text-xs">
                    <Shield className="h-3.5 w-3.5 text-primary" />
                    <span>{(rating.reputation_score ?? 0).toFixed(1)}</span>
                  </div>
                  <div className="flex items-center gap-1 text-xs">
                    <Heart className="h-3.5 w-3.5 text-rose-500" />
                    <span>{(rating.community_score ?? 0).toFixed(1)}</span>
                  </div>
                </div>

                <p className="text-xs text-muted-foreground">
                  {formatTimeAgo(rating.created_date)}
                </p>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Party Rating Edit Modal */}
      {editingPartyRating && editingPartyRating.party && (
        <PartyRatingForm
          party={editingPartyRating.party}
          fraternity={editingPartyRating.fraternity}
          onClose={() => setEditingPartyRating(null)}
          onSubmit={handlePartyRatingSubmit}
        />
      )}

      {/* Reputation Rating Edit Sheet */}
      {editingRepRating && editingRepRating.fraternity && (
        <RateFratSheet
          fraternity={editingRepRating.fraternity}
          isOpen={!!editingRepRating}
          onClose={() => setEditingRepRating(null)}
          onSubmit={handleRepRatingSubmit}
          existingScores={{
            brotherhood: editingRepRating.brotherhood_score ?? 5,
            reputation: editingRepRating.reputation_score ?? 5,
            community: editingRepRating.community_score ?? 5,
          }}
        />
      )}
    </>
  );
}
