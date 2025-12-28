import { Crown, Trophy, Medal } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { type FraternityWithScores } from '@/utils/scoring';

type FilterType = 'overall' | 'reputation' | 'party' | 'trending';

interface LeaderboardPodiumProps {
  topThree: FraternityWithScores[];
  ranks?: number[];
  filter?: FilterType;
}

export default function LeaderboardPodium({ topThree, ranks = [1, 2, 3], filter = 'overall' }: LeaderboardPodiumProps) {
  if (topThree.length < 3) return null;

  const [first, second, third] = topThree;
  const [rank1, rank2, rank3] = ranks;

  const getDisplayScore = (frat: FraternityWithScores): number | null => {
    const scores = frat.computedScores;
    if (!scores) {
      return frat.reputation_score ?? 5;
    }
    switch (filter) {
      case 'overall':
        return scores.hasOverallData ? scores.overall : null;
      case 'reputation':
        return scores.hasRepData ? scores.repAdj : null;
      case 'party':
        // Return null if no party data (will show "—")
        return scores.hasPartyScoreData ? scores.semesterPartyScore : null;
      case 'trending':
        return scores.hasOverallData ? scores.overall : null;
      default:
        return scores.hasOverallData ? scores.overall : null;
    }
  };

  const getScoreLabel = (): string => {
    switch (filter) {
      case 'overall':
        return 'Overall Score';
      case 'reputation':
        return 'Reputation';
      case 'party':
        return 'Semester Party Score';
      case 'trending':
        return 'Overall Score';
      default:
        return 'Overall Score';
    }
  };

  const hasPartyData = (frat: FraternityWithScores): boolean => {
    return frat.computedScores?.hasPartyScoreData ?? false;
  };

  const hasOverallData = (frat: FraternityWithScores): boolean => {
    return frat.computedScores?.hasOverallData ?? false;
  };

  const hasRepData = (frat: FraternityWithScores): boolean => {
    return frat.computedScores?.hasRepData ?? false;
  };

  const needsMoreRatings = (frat: FraternityWithScores): boolean => {
    if (filter === 'overall') return !hasOverallData(frat);
    if (filter === 'reputation') return !hasRepData(frat);
    if (filter === 'party') return !hasPartyData(frat);
    if (filter === 'trending') return !hasOverallData(frat);
    return false;
  };

  const PodiumCard = ({ 
    frat, 
    rank, 
    size 
  }: { 
    frat: FraternityWithScores; 
    rank: number; 
    size: 'lg' | 'md' 
  }) => {
    // For ties (all same rank), use a neutral styling
    const isTied = rank === rank1 && rank1 === rank2 && rank2 === rank3;
    const Icon = isTied ? Medal : (rank === 1 ? Crown : rank === 2 ? Trophy : Medal);
    
    const getColor = () => {
      if (isTied) return 'from-slate-400 to-slate-500';
      if (rank === 1) return 'from-amber-400 to-yellow-500';
      if (rank === 2) return 'from-slate-300 to-slate-400';
      return 'from-amber-600 to-amber-700';
    };
    
    const getBgColor = () => {
      if (isTied) return 'bg-gradient-to-br from-slate-50 to-gray-50 border-slate-200/50';
      if (rank === 1) return 'bg-gradient-to-br from-amber-50 to-yellow-50 border-amber-200/50';
      if (rank === 2) return 'bg-gradient-to-br from-slate-50 to-gray-50 border-slate-200/50';
      return 'bg-gradient-to-br from-orange-50 to-amber-50 border-amber-200/50';
    };

    return (
      <Link to={createPageUrl(`Fraternity?id=${frat.id}`)}>
        <Card 
          className={`relative overflow-hidden ${getBgColor()} ${
            size === 'lg' ? 'p-4 sm:p-6' : 'p-3 sm:p-4'
          } transition-all hover:scale-[1.02] hover:shadow-lg cursor-pointer`}
        >
          <div className={`absolute top-2 right-2 p-1.5 rounded-full bg-gradient-to-br ${getColor()}`}>
            <Icon className={`${size === 'lg' ? 'h-5 w-5' : 'h-4 w-4'} text-white`} />
          </div>
          
          <div className="text-center space-y-2">
            <div 
              className={`mx-auto rounded-xl gradient-primary flex items-center justify-center text-white font-bold ${
                size === 'lg' ? 'w-14 h-14 text-xl' : 'w-10 h-10 text-lg'
              }`}
            >
              {frat.chapter.charAt(0)}
            </div>
            
            <div>
              <h3 className={`font-bold truncate ${size === 'lg' ? 'text-lg' : 'text-sm'}`}>
                {frat.name}
              </h3>
              <Badge variant="outline" className="text-xs mt-1">
                {frat.chapter}
              </Badge>
            </div>

            <div className={`font-bold ${size === 'lg' ? 'text-2xl' : 'text-xl'} text-foreground`}>
              {getDisplayScore(frat)?.toFixed(1) ?? '—'}
            </div>
            <p className="text-xs text-muted-foreground">{getScoreLabel()}</p>
            {needsMoreRatings(frat) && (
              <Badge variant="outline" className="text-[9px] mt-1 text-muted-foreground">
                Needs more ratings
              </Badge>
            )}
            {filter === 'party' && hasPartyData(frat) && (
              <p className="text-[9px] text-muted-foreground/70">Weighted avg</p>
            )}
          </div>
        </Card>
      </Link>
    );
  };

  return (
    <div className="grid grid-cols-3 gap-2 sm:gap-4 items-end">
      <div className="order-1">
        <PodiumCard frat={second} rank={rank2} size="md" />
      </div>
      <div className="order-2 transform translate-y-[-8px]">
        <PodiumCard frat={first} rank={rank1} size="lg" />
      </div>
      <div className="order-3">
        <PodiumCard frat={third} rank={rank3} size="md" />
      </div>
    </div>
  );
}
