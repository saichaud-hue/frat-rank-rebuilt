import { Star, PartyPopper, MessageCircle, ThumbsUp } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { type FraternityWithScores } from '@/utils/scoring';
import TrendIndicator from './TrendIndicator';

type FilterType = 'overall' | 'reputation' | 'party' | 'trending';

interface FraternityCardProps {
  fraternity: FraternityWithScores;
  rank: number;
  onRate: (fraternity: FraternityWithScores) => void;
  filter?: FilterType;
  isTied?: boolean;
}

export default function FraternityCard({ fraternity, rank, onRate, filter = 'overall', isTied = false }: FraternityCardProps) {
  // FraternityCard is used for positions 4+ (rest list), so no special rank icons needed
  const RankIcon = null;
  const scores = fraternity.computedScores;

  const formatCount = (num: number): string => {
    if (num >= 1000) {
      return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'k';
    }
    return num.toString();
  };
  
  const getDisplayScore = (): number | null => {
    if (!scores) {
      return fraternity.reputation_score ?? 5;
    }
    switch (filter) {
      case 'overall':
        return scores.hasOverallData ? scores.overall : null;
      case 'reputation':
        return scores.hasRepData ? scores.repAdj : null;
      case 'party':
        return scores.hasPartyScoreData ? scores.semesterPartyScore : null;
      case 'trending':
        return scores.activityTrending;
      default:
        return scores.hasOverallData ? scores.overall : null;
    }
  };

  const getScoreLabel = (): string => {
    switch (filter) {
      case 'overall':
        return 'Score';
      case 'reputation':
        return 'Frat';
      case 'party':
        return 'Party';
      case 'trending':
        return 'Trend';
      default:
        return 'Score';
    }
  };

  const getTrendingRankDisplay = (): string => {
    const prefix = isTied ? 'T-' : '';
    return `${prefix}#${rank}`;
  };

  const hasPartyData = scores?.hasPartyScoreData ?? false;
  const hasOverallData = scores?.hasOverallData ?? false;
  const hasRepData = scores?.hasRepData ?? false;
  
  const handleRateClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onRate(fraternity);
  };

  const trending = scores?.trending ?? (fraternity.momentum ?? 0);

  return (
    <Link to={createPageUrl(`Fraternity?id=${fraternity.id}`)}>
      <Card className="glass p-4 active:scale-[0.98] transition-transform">
        <div className="flex items-center gap-3">
          {/* Rank Number */}
          <div className="shrink-0 w-10 h-10 rounded-xl flex items-center justify-center font-bold text-white bg-gradient-to-br from-slate-500 to-slate-600">
            <span className="text-sm">{rank}</span>
          </div>

          {/* Avatar */}
          <div className="shrink-0 w-11 h-11 rounded-xl gradient-primary flex items-center justify-center text-white font-bold text-lg">
            {fraternity.chapter.charAt(0)}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-base leading-tight truncate">{fraternity.chapter}</h3>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-sm text-muted-foreground truncate">{fraternity.name}</span>
              {filter !== 'trending' && <TrendIndicator momentum={trending} compact />}
            </div>
          </div>

          {/* Score */}
          <div className="text-right shrink-0">
            <div className="font-bold text-xl text-foreground">
              {filter === 'trending'
                ? getTrendingRankDisplay()
                : getDisplayScore() === null 
                  ? '—' 
                  : getDisplayScore()?.toFixed(1)}
            </div>
            <p className="text-xs text-muted-foreground">{getScoreLabel()}</p>
          </div>

          {/* Rate Button */}
          <Button 
            size="icon"
            className="shrink-0 h-11 w-11 rounded-xl gradient-primary text-white"
            onClick={handleRateClick}
          >
            <Star className="h-5 w-5" />
          </Button>
        </div>

        {/* Trending Activity Stats */}
        {filter === 'trending' && (
          <div className="mt-3 pt-3 border-t border-slate-200/50">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 text-sm">
                <PartyPopper className="h-4 w-4 text-primary" />
                <span className="font-medium">{formatCount(scores?.numPartiesHosted ?? 0)}</span>
                <span className="text-muted-foreground">parties</span>
              </div>
              <div className="flex items-center gap-1.5 text-sm">
                <ThumbsUp className="h-4 w-4 text-primary" />
                <span className="font-medium">{formatCount((scores?.numRepRatings ?? 0) + (scores?.numPartyRatings ?? 0))}</span>
                <span className="text-muted-foreground">ratings</span>
              </div>
              <div className="flex items-center gap-1.5 text-sm">
                <MessageCircle className="h-4 w-4 text-primary" />
                <span className="font-medium">{formatCount((scores?.numPartyComments ?? 0) + (scores?.numFratComments ?? 0))}</span>
                <span className="text-muted-foreground">comments</span>
              </div>
            </div>
          </div>
        )}

        {/* Needs More Ratings Badges */}
        {((filter === 'overall' && !hasOverallData) || 
          (filter === 'reputation' && !hasRepData) || 
          (filter === 'party' && !hasPartyData)) && (
          <div className="mt-2">
            <Badge variant="outline" className="text-xs text-muted-foreground">
              Needs more ratings
            </Badge>
          </div>
        )}
      </Card>
    </Link>
  );
}
