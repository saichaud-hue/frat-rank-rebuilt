import { useState, useEffect } from 'react';
import { Clock, Zap, Music, Settings } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { base44, type PartyRating } from '@/api/base44Client';
import { formatTimeAgo, getScoreBgColor } from '@/utils';

interface RatingHistoryProps {
  partyId: string;
  refreshKey?: number;
}

export default function RatingHistory({ partyId, refreshKey = 0 }: RatingHistoryProps) {
  const [ratings, setRatings] = useState<PartyRating[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRatings();
  }, [partyId, refreshKey]);

  const loadRatings = async () => {
    try {
      const data = await base44.entities.PartyRating.filter(
        { party_id: partyId },
        '-created_date'
      );
      setRatings(data.slice(0, 20));
    } catch (error) {
      console.error('Failed to load ratings:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card className="glass p-4 space-y-4">
        <h3 className="font-semibold flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Recent Ratings
        </h3>
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-3">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="flex-1 space-y-1">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-24" />
            </div>
            <Skeleton className="h-8 w-16 rounded-full" />
          </div>
        ))}
      </Card>
    );
  }

  return (
    <Card className="glass p-4 space-y-4">
      <h3 className="font-semibold flex items-center gap-2">
        <Clock className="h-5 w-5 text-primary" />
        Recent Ratings ({ratings.length})
      </h3>

      {ratings.length === 0 ? (
        <p className="text-center text-muted-foreground py-8">
          No ratings yet. Be the first to rate this party!
        </p>
      ) : (
        <div className="space-y-3">
          {ratings.map((rating) => (
            <div key={rating.id} className="flex items-start gap-3 p-3 rounded-lg bg-muted/30">
              <Avatar className="h-10 w-10">
                <AvatarFallback className="bg-gradient-to-br from-indigo-500 to-purple-500 text-white text-sm">
                  DS
                </AvatarFallback>
              </Avatar>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-medium text-sm">Anonymous Duke Student</p>
                  <Badge className={`${getScoreBgColor(rating.party_quality_score ?? 0)} text-white`}>
                    {(rating.party_quality_score ?? 0).toFixed(1)}
                  </Badge>
                </div>
                
                <p className="text-xs text-muted-foreground mt-0.5">
                  {formatTimeAgo(rating.created_date)}
                </p>

                <div className="flex items-center gap-4 mt-2">
                  <div className="flex items-center gap-1 text-xs">
                    <Zap className="h-3.5 w-3.5 text-amber-500" />
                    <span className="font-medium">{(rating.vibe_score ?? 0).toFixed(1)}</span>
                  </div>
                  <div className="flex items-center gap-1 text-xs">
                    <Music className="h-3.5 w-3.5 text-blue-500" />
                    <span className="font-medium">{(rating.music_score ?? 0).toFixed(1)}</span>
                  </div>
                  <div className="flex items-center gap-1 text-xs">
                    <Settings className="h-3.5 w-3.5 text-green-500" />
                    <span className="font-medium">{(rating.execution_score ?? 0).toFixed(1)}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}