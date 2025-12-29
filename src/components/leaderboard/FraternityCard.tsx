import { Crown, Trophy, Star, Calendar, PartyPopper, MessageCircle, ThumbsUp } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { type FraternityWithScores } from '@/utils/scoring';
import TrendIndicator from './TrendIndicator';
import ScoreBreakdown from './ScoreBreakdown';

type FilterType = 'overall' | 'reputation' | 'party' | 'trending';

interface FraternityCardProps {
  fraternity: FraternityWithScores;
  rank: number;
  onRate: (fraternity: FraternityWithScores) => void;
  filter?: FilterType;
  isTied?: boolean;
}

export default function FraternityCard({ fraternity, rank, onRate, filter = 'overall', isTied = false }: FraternityCardProps) {
  const RankIcon = rank === 1 ? Crown : rank <= 3 ? Trophy : null;
  const scores = fraternity.computedScores;
  
  // Get the score to display based on current filter
  // Returns null when data is insufficient
  const getDisplayScore = (): number | null => {
    if (!scores) {
      return fraternity.reputation_score ?? 5;
    }
    switch (filter) {
      case 'overall':
        // Return null if insufficient data for overall
        return scores.hasOverallData ? scores.overall : null;
      case 'reputation':
        // Return null if insufficient rep data
        return scores.hasRepData ? scores.repAdj : null;
      case 'party':
        // Return null if no party data (will show "—")
        return scores.hasPartyScoreData ? scores.semesterPartyScore : null;
      case 'trending':
        return scores.activityTrending; // Show activity score for trending
      default:
        return scores.hasOverallData ? scores.overall : null;
    }
  };

  const getScoreLabel = (): string => {
    switch (filter) {
      case 'overall':
        return 'Semester Frat Score';
      case 'reputation':
        return 'Semester Frat Score';
      case 'party':
        return 'Semester Party Score';
      case 'trending':
        return 'Trending Rank';
      default:
        return 'Overall Score';
    }
  };

  // Get trending rank display text
  const getTrendingRankDisplay = (): string => {
    const prefix = isTied ? 'Tied ' : '';
    if (rank === 1) return `${prefix}#1 Most Trending`;
    if (rank === 2) return `${prefix}#2`;
    if (rank === 3) return `${prefix}#3`;
    const s = ['th', 'st', 'nd', 'rd'];
    const v = rank % 100;
    const ordinal = rank + (s[(v - 20) % 10] || s[v] || s[0]);
    return `${prefix}${ordinal}`;
  };

  const hasPartyData = scores?.hasPartyScoreData ?? false;
  const hasOverallData = scores?.hasOverallData ?? false;
  const hasRepData = scores?.hasRepData ?? false;
  
  const handleRateClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onRate(fraternity);
  };

  const activityScore = scores?.activityTrending ?? 0;
  const trending = scores?.trending ?? (fraternity.momentum ?? 0);

  return (
    <Link to={createPageUrl(`Fraternity?id=${fraternity.id}`)}>
      <Card className="glass p-4 hover:shadow-lg transition-all hover:scale-[1.01] cursor-pointer">
        <div className="flex items-start gap-4">
          {/* Rank Badge */}
          <div className={`flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center font-bold text-white ${
            rank === 1 ? 'bg-gradient-to-br from-amber-400 to-yellow-500' :
            rank === 2 ? 'bg-gradient-to-br from-slate-300 to-slate-400' :
            rank === 3 ? 'bg-gradient-to-br from-amber-600 to-amber-700' :
            'bg-gradient-to-br from-slate-500 to-slate-600'
          }`}>
            {RankIcon ? <RankIcon className="h-5 w-5" /> : <span>{rank}</span>}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0 space-y-3">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-bold text-lg leading-tight">{fraternity.name}</h3>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="secondary" className="text-xs">
                    {fraternity.chapter}
                  </Badge>
                  {fraternity.founded_year && (
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      Est. {fraternity.founded_year}
                    </span>
                  )}
                </div>
              </div>

              <div className="text-right">
                <div className={`font-bold text-foreground ${filter === 'trending' ? 'text-lg' : 'text-2xl'}`}>
                  {filter === 'trending'
                    ? getTrendingRankDisplay()
                    : getDisplayScore() === null 
                      ? '—' 
                      : getDisplayScore()?.toFixed(1)}
                </div>
                <p className="text-xs text-muted-foreground">{getScoreLabel()}</p>
                {filter === 'overall' && !hasOverallData && (
                  <Badge variant="outline" className="text-[10px] mt-1 text-muted-foreground">
                    Needs more ratings
                  </Badge>
                )}
                {filter === 'reputation' && !hasRepData && (
                  <Badge variant="outline" className="text-[10px] mt-1 text-muted-foreground">
                    Needs more ratings
                  </Badge>
                )}
                {filter === 'party' && !hasPartyData && (
                  <Badge variant="outline" className="text-[10px] mt-1 text-muted-foreground">
                    Needs more ratings
                  </Badge>
                )}
                {filter === 'party' && hasPartyData && (
                  <p className="text-[10px] text-muted-foreground/70 mt-0.5">Weighted avg of all parties</p>
                )}
                {filter !== 'trending' && <TrendIndicator momentum={trending} />}
              </div>
            </div>

            {fraternity.description && (
              <p className="text-sm text-muted-foreground line-clamp-2">
                {fraternity.description}
              </p>
            )}

            {/* Activity Counter for Trending Filter */}
            {filter === 'trending' && (
              <div className="bg-muted/50 rounded-lg px-3 py-2">
                <p className="text-xs text-muted-foreground mb-1.5">This semester:</p>
                <div className="flex items-center gap-4 text-sm">
                  <div className="flex items-center gap-1.5">
                    <PartyPopper className="h-4 w-4 text-primary" />
                    <span className="font-medium">{scores?.numPartiesHosted ?? 0}</span>
                    <span className="text-muted-foreground text-xs">parties</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <ThumbsUp className="h-4 w-4 text-primary" />
                    <span className="font-medium">{(scores?.numRepRatings ?? 0) + (scores?.numPartyRatings ?? 0)}</span>
                    <span className="text-muted-foreground text-xs">ratings</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <MessageCircle className="h-4 w-4 text-primary" />
                    <span className="font-medium">{(scores?.numPartyComments ?? 0) + (scores?.numFratComments ?? 0)}</span>
                    <span className="text-muted-foreground text-xs">comments</span>
                  </div>
                </div>
              </div>
            )}

            <ScoreBreakdown
              reputationScore={scores?.repAdj ?? fraternity.reputation_score ?? 5} 
              partyScore={scores?.partyAdj ?? fraternity.historical_party_score ?? 5}
              mode={filter === 'party' ? 'party' : filter === 'reputation' ? 'reputation' : 'overall'}
              hasOverallData={hasOverallData}
              avgVibe={scores?.avgVibe ?? 5}
              avgMusic={scores?.avgMusic ?? 5}
              avgExecution={scores?.avgExecution ?? 5}
              avgBrotherhood={scores?.avgBrotherhood ?? 5}
              avgReputation={scores?.avgReputation ?? 5}
              avgCommunity={scores?.avgCommunity ?? 5}
            />

            <div className="flex items-center justify-between pt-2">
              {filter !== 'trending' && (
                <Badge 
                  variant="outline" 
                  className={`${
                    trending > 0.5 ? 'text-emerald-600 border-emerald-200 bg-emerald-50' :
                    trending < -0.5 ? 'text-red-500 border-red-200 bg-red-50' :
                    'text-muted-foreground'
                  }`}
                >
                  {trending >= 0 ? '+' : ''}{trending.toFixed(2)} trending
                </Badge>
              )}
              {filter === 'trending' && <div />}
              
              <Button 
                size="sm" 
                className="gradient-primary text-white"
                onClick={handleRateClick}
              >
                <Star className="h-4 w-4 mr-1" />
                Rate
              </Button>
            </div>
          </div>
        </div>
      </Card>
    </Link>
  );
}
