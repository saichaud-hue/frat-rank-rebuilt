import { useState, useEffect } from 'react';
import { Clock, Star, PartyPopper, Sparkles, Music, Wine } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { base44, type PartyRating, type ReputationRating, type Party, type Fraternity } from '@/api/base44Client';
import { formatTimeAgo, getScoreBgColor } from '@/utils';

export default function RatingHistory() {
  const [partyRatings, setPartyRatings] = useState<(PartyRating & { party?: Party; fraternity?: Fraternity })[]>([]);
  const [reputationRatings, setReputationRatings] = useState<(ReputationRating & { fraternity?: Fraternity })[]>([]);
  const [loading, setLoading] = useState(true);

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
                <Badge className={`${getScoreBgColor(rating.overall_score ?? 0)} text-white`}>
                  {(rating.overall_score ?? 0).toFixed(1)}
                </Badge>
              </div>

              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1 text-xs">
                  <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                  <span>{(rating.fun_score ?? 0).toFixed(1)}</span>
                </div>
                <div className="flex items-center gap-1 text-xs">
                  <Music className="h-3.5 w-3.5 text-blue-500" />
                  <span>{(rating.music_score ?? 0).toFixed(1)}</span>
                </div>
                <div className="flex items-center gap-1 text-xs">
                  <Wine className="h-3.5 w-3.5 text-purple-500" />
                  <span>{(rating.alcohol_score ?? 0).toFixed(1)}</span>
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
                <Badge className={`${getScoreBgColor(rating.score ?? 0)} text-white`}>
                  {(rating.score ?? 0).toFixed(1)}
                </Badge>
              </div>

              <p className="text-xs text-muted-foreground">
                {formatTimeAgo(rating.created_date)}
              </p>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
