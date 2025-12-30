import { useState } from 'react';
import { Crown, Trophy, Medal, User, Star, ChevronRight } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { type FraternityWithScores } from '@/utils/scoring';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';

type FilterType = 'overall' | 'reputation' | 'party' | 'trending';

interface LeaderboardPodiumProps {
  topThree: FraternityWithScores[];
  ranks?: number[];
  filter?: FilterType;
  onRate: (frat: FraternityWithScores) => void;
}

export default function LeaderboardPodium({ topThree, ranks = [1, 2, 3], filter = 'overall', onRate }: LeaderboardPodiumProps) {
  const [selectedFrat, setSelectedFrat] = useState<FraternityWithScores | null>(null);
  const navigate = useNavigate();

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
        return 'Semester Score';
      case 'reputation':
        return 'Frat Score';
      case 'party':
        return 'Party Score';
      case 'trending':
        return 'Trending';
      default:
        return 'Score';
    }
  };

  const getTrendingRankDisplay = (rank: number, isTied: boolean): string => {
    const prefix = isTied ? 'T-' : '';
    if (rank === 1) return `${prefix}#1`;
    if (rank === 2) return `${prefix}#2`;
    if (rank === 3) return `${prefix}#3`;
    return `${prefix}#${rank}`;
  };

  const needsMoreRatings = (frat: FraternityWithScores): boolean => {
    const scores = frat.computedScores;
    if (!scores) return true;
    if (filter === 'overall') return !scores.hasOverallData;
    if (filter === 'reputation') return !scores.hasRepData;
    if (filter === 'party') return !scores.hasPartyScoreData;
    return false;
  };

  const handleCardTap = (frat: FraternityWithScores) => {
    setSelectedFrat(frat);
  };

  const handleViewProfile = () => {
    if (selectedFrat) {
      navigate(createPageUrl(`Fraternity?id=${selectedFrat.id}`));
      setSelectedFrat(null);
    }
  };

  const handleRateClick = () => {
    if (selectedFrat) {
      setSelectedFrat(null);
      onRate(selectedFrat);
    }
  };

  const getColor = (rank: number, isTied: boolean) => {
    if (isTied) return 'from-slate-400 to-slate-500';
    if (rank === 1) return 'from-amber-400 to-yellow-500';
    if (rank === 2) return 'from-slate-300 to-slate-400';
    return 'from-amber-600 to-amber-700';
  };

  const getBgColor = (rank: number, isTied: boolean) => {
    if (isTied) return 'bg-gradient-to-br from-slate-50 to-gray-50 border-slate-200/50';
    if (rank === 1) return 'bg-gradient-to-br from-amber-50 to-yellow-50 border-amber-200/50';
    if (rank === 2) return 'bg-gradient-to-br from-slate-50 to-gray-50 border-slate-200/50';
    return 'bg-gradient-to-br from-orange-50 to-amber-50 border-amber-200/50';
  };

  // Featured #1 Card
  const FeaturedCard = ({ frat, rank }: { frat: FraternityWithScores; rank: number }) => {
    const isTied = ranks.filter(r => r === rank).length > 1;
    
    return (
      <Card 
        className={`relative overflow-hidden ${getBgColor(rank, isTied)} p-5 active:scale-[0.98] transition-transform`}
        onClick={() => handleCardTap(frat)}
      >
        <div className={`absolute top-3 right-3 p-2 rounded-full bg-gradient-to-br ${getColor(rank, isTied)}`}>
          <Crown className="h-5 w-5 text-white" />
        </div>
        
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl gradient-primary flex items-center justify-center text-white font-bold text-2xl shrink-0">
            {frat.chapter.charAt(0)}
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Badge variant="secondary" className="text-xs bg-amber-100 text-amber-700 border-amber-200">
                #1 {filter === 'trending' ? 'Trending' : 'Ranked'}
              </Badge>
            </div>
            <h3 className="font-bold text-lg leading-tight truncate">{frat.name}</h3>
            <p className="text-sm text-muted-foreground truncate">{frat.chapter}</p>
          </div>
          
          <div className="text-right shrink-0">
            <div className="font-bold text-2xl text-foreground">
              {filter === 'trending' 
                ? getTrendingRankDisplay(rank, isTied)
                : getDisplayScore(frat)?.toFixed(1) ?? '—'}
            </div>
            <p className="text-xs text-muted-foreground">{getScoreLabel()}</p>
            {needsMoreRatings(frat) && (
              <Badge variant="outline" className="text-[10px] mt-1">Needs ratings</Badge>
            )}
          </div>
        </div>
        
        <div className="flex items-center justify-center mt-3 pt-3 border-t border-slate-200/50">
          <span className="text-sm text-muted-foreground">Tap for actions</span>
          <ChevronRight className="h-4 w-4 text-muted-foreground ml-1" />
        </div>
      </Card>
    );
  };

  // Stacked List Item for #2 and #3
  const ListItem = ({ frat, rank }: { frat: FraternityWithScores; rank: number }) => {
    const isTied = ranks.filter(r => r === rank).length > 1;
    const Icon = rank === 2 ? Trophy : Medal;
    
    return (
      <Card 
        className={`relative overflow-hidden ${getBgColor(rank, isTied)} p-4 active:scale-[0.98] transition-transform`}
        onClick={() => handleCardTap(frat)}
      >
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${getColor(rank, isTied)} flex items-center justify-center shrink-0`}>
            <Icon className="h-5 w-5 text-white" />
          </div>
          
          <div className="w-11 h-11 rounded-xl gradient-primary flex items-center justify-center text-white font-bold text-lg shrink-0">
            {frat.chapter.charAt(0)}
          </div>
          
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-base leading-tight truncate">{frat.name}</h3>
            <p className="text-sm text-muted-foreground truncate">{frat.chapter}</p>
          </div>
          
          <div className="text-right shrink-0">
            <div className="font-bold text-xl text-foreground">
              {filter === 'trending' 
                ? getTrendingRankDisplay(rank, isTied)
                : getDisplayScore(frat)?.toFixed(1) ?? '—'}
            </div>
            <p className="text-xs text-muted-foreground">{getScoreLabel()}</p>
          </div>
          
          <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
        </div>
      </Card>
    );
  };

  return (
    <>
      <div className="space-y-3">
        {/* Featured #1 Card */}
        <FeaturedCard frat={first} rank={rank1} />
        
        {/* Stacked #2 and #3 */}
        <ListItem frat={second} rank={rank2} />
        <ListItem frat={third} rank={rank3} />
      </div>

      {/* Action Sheet */}
      <Sheet open={!!selectedFrat} onOpenChange={() => setSelectedFrat(null)}>
        <SheetContent side="bottom" className="rounded-t-3xl pb-safe">
          <SheetHeader className="pb-4">
            <SheetTitle className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center text-white font-bold text-lg">
                {selectedFrat?.chapter.charAt(0)}
              </div>
              <div className="min-w-0 flex-1 text-left">
                <p className="font-bold text-lg truncate">{selectedFrat?.name}</p>
                <p className="text-sm text-muted-foreground">{selectedFrat?.chapter}</p>
              </div>
            </SheetTitle>
          </SheetHeader>
          
          <div className="space-y-3 pt-2">
            <Button 
              className="w-full h-14 text-base justify-start gap-3"
              variant="outline"
              onClick={handleViewProfile}
            >
              <User className="h-5 w-5" />
              View Profile
            </Button>
            <Button 
              className="w-full h-14 text-base justify-start gap-3 gradient-primary text-white"
              onClick={handleRateClick}
            >
              <Star className="h-5 w-5" />
              Rate This Fraternity
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
