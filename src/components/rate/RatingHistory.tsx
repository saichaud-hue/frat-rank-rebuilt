import { useState, useEffect } from 'react';
import { Clock, Star, PartyPopper, Zap, Music, Settings, Pencil, Users, Shield, Heart } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { formatTimeAgo, getScoreBgColor } from '@/utils';
import PartyRatingForm from './PartyRatingForm';
import RateFratSheet from '@/components/leaderboard/RateFratSheet';
import { 
  partyRatingQueries, 
  reputationRatingQueries, 
  partyQueries, 
  fraternityQueries,
  getCurrentUser,
  type PartyRating,
  type ReputationRating,
  type Party,
  type Fraternity
} from '@/lib/supabase-data';

type EnrichedPartyRating = PartyRating & { party?: Party; fraternity?: Fraternity };
type EnrichedRepRating = ReputationRating & { fraternity?: Fraternity };

export default function RatingHistory() {
  const [partyRatings, setPartyRatings] = useState<EnrichedPartyRating[]>([]);
  const [reputationRatings, setReputationRatings] = useState<EnrichedRepRating[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [editingPartyRating, setEditingPartyRating] = useState<EnrichedPartyRating | null>(null);
  const [editingRepRating, setEditingRepRating] = useState<EnrichedRepRating | null>(null);

  useEffect(() => {
    loadRatings();
  }, []);

  const loadRatings = async () => {
    try {
      const user = await getCurrentUser();
      if (!user) {
        setLoading(false);
        return;
      }

      const [pRatings, rRatings, parties, fraternities] = await Promise.all([
        partyRatingQueries.list(),
        reputationRatingQueries.list(),
        partyQueries.list(),
        fraternityQueries.list(),
      ]);

      const partyMap = new Map(parties.map(p => [p.id, p]));
      const fratMap = new Map(fraternities.map(f => [f.id, f]));

      const userPartyRatings = pRatings.filter(r => r.user_id === user.id);
      const enrichedPartyRatings: EnrichedPartyRating[] = userPartyRatings.map(rating => {
        const party = partyMap.get(rating.party_id);
        const fraternity = party?.fraternity_id ? fratMap.get(party.fraternity_id) : undefined;
        return { ...rating, party, fraternity };
      });
      setPartyRatings(enrichedPartyRatings);

      const userRepRatings = rRatings.filter(r => r.user_id === user.id);
      const enrichedRepRatings: EnrichedRepRating[] = userRepRatings.map(rating => {
        const fraternity = fratMap.get(rating.fraternity_id);
        return { ...rating, fraternity };
      });
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
      await reputationRatingQueries.update(editingRepRating.id, {
        brotherhood_score: scores.brotherhood,
        reputation_score: scores.reputation,
        community_score: scores.community,
        combined_score: scores.combined,
      });
      
      if (editingRepRating.fraternity_id) {
        const allRepRatings = await reputationRatingQueries.listByFraternity(editingRepRating.fraternity_id);
        
        const avgReputation = allRepRatings.length > 0
          ? allRepRatings.reduce((sum, r) => sum + (r.combined_score ?? 5), 0) / allRepRatings.length
          : 5;
        
        await fraternityQueries.update(editingRepRating.fraternity_id, {
          reputation_score: Math.min(10, Math.max(0, avgReputation)),
        });
      }
      
      setEditingRepRating(null);
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
                        {rating.fraternity.chapter} • {rating.fraternity.name}
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
                  {formatTimeAgo(rating.created_at || '')}
                </p>
              </div>
            ))}

            {reputationRatings.map((rating) => (
              <div key={rating.id} className="p-3 rounded-lg bg-muted/30 space-y-2">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">Reputation Rating</p>
                    {rating.fraternity && (
                      <p className="font-medium">
                        {rating.fraternity.chapter} • {rating.fraternity.name}
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
                  {formatTimeAgo(rating.created_at || '')}
                </p>
              </div>
            ))}
          </div>
        )}
      </Card>

      {editingPartyRating && editingPartyRating.party && (
        <PartyRatingForm
          party={editingPartyRating.party}
          fraternity={editingPartyRating.fraternity}
          onClose={() => setEditingPartyRating(null)}
          onSubmit={handlePartyRatingSubmit}
        />
      )}

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
