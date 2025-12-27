import { Crown, Trophy, Star, Calendar } from 'lucide-react';
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
}

export default function FraternityCard({ fraternity, rank, onRate, filter = 'overall' }: FraternityCardProps) {
  const RankIcon = rank === 1 ? Crown : rank <= 3 ? Trophy : null;
  const scores = fraternity.computedScores;
  
  // Get the score to display based on current filter
  const getDisplayScore = (): number => {
    if (!scores) {
      return fraternity.reputation_score ?? 5;
    }
    switch (filter) {
      case 'overall':
        return scores.overall;
      case 'reputation':
        return scores.repAdj;
      case 'party':
        return scores.partyAdj;
      case 'trending':
        return scores.overall; // Show overall, but sort by trending
      default:
        return scores.overall;
    }
  };

  const getScoreLabel = (): string => {
    switch (filter) {
      case 'overall':
        return 'Overall Score';
      case 'reputation':
        return 'Reputation';
      case 'party':
        return 'Party Score';
      case 'trending':
        return 'Overall Score';
      default:
        return 'Overall Score';
    }
  };
  
  const handleRateClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onRate(fraternity);
  };

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
                <div className="text-2xl font-bold text-foreground">
                  {getDisplayScore().toFixed(1)}
                </div>
                <p className="text-xs text-muted-foreground">{getScoreLabel()}</p>
                <TrendIndicator momentum={trending} />
              </div>
            </div>

            {fraternity.description && (
              <p className="text-sm text-muted-foreground line-clamp-2">
                {fraternity.description}
              </p>
            )}

            <ScoreBreakdown 
              reputationScore={scores?.repAdj ?? fraternity.reputation_score ?? 5} 
              partyScore={scores?.partyAdj ?? fraternity.historical_party_score ?? 5} 
            />

            <div className="flex items-center justify-between pt-2">
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
