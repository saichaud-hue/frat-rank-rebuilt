import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { type FraternityWithScores } from '@/utils/scoring';
import { cn } from '@/lib/utils';
import { ArrowUp, ArrowDown, Minus } from 'lucide-react';

type FilterType = 'overall' | 'reputation' | 'party' | 'trending';
type DisplayMode = 'score' | 'vibes';

interface TierInfo {
  name: string;
  abbrev: string;
  color: string;
  bgColor: string;
  rankBg: string;
  rowBg: string;
}

interface LeaderboardRowProps {
  fraternity: FraternityWithScores;
  rank: number;
  filter?: FilterType;
  isTied?: boolean;
  displayMode?: DisplayMode;
  tierInfo?: TierInfo;
  rankChange?: number;
}

export default function LeaderboardRow({ 
  fraternity, 
  rank, 
  filter = 'overall', 
  isTied = false,
  displayMode = 'score',
  tierInfo,
  rankChange 
}: LeaderboardRowProps) {
  const scores = fraternity.computedScores;

  const getDisplayScore = (): number | null => {
    if (!scores) return fraternity.reputation_score ?? null;
    switch (filter) {
      case 'overall': return scores.hasOverallData ? scores.overall : null;
      case 'reputation': return scores.hasRepData ? scores.repAdj : null;
      case 'party': return scores.hasPartyScoreData ? scores.semesterPartyScore : null;
      case 'trending': return scores.activityTrending;
      default: return scores.hasOverallData ? scores.overall : null;
    }
  };

  const score = getDisplayScore();
  
  // Score color based on value
  const getScoreColorClass = (score: number | null): string => {
    if (score === null) return 'text-muted-foreground border-muted';
    if (score >= 8.5) return 'text-emerald-600 border-emerald-200 bg-emerald-50';
    if (score >= 7) return 'text-primary border-primary/20 bg-primary/5';
    if (score >= 5) return 'text-amber-600 border-amber-200 bg-amber-50';
    return 'text-muted-foreground border-muted bg-muted/50';
  };

  // Render rank change indicator for trending filter
  const renderRankChange = () => {
    if (rankChange === undefined || rankChange === 0) {
      return (
        <div className="flex items-center justify-center w-12 h-12 rounded-full border-2 border-muted bg-muted/30">
          <Minus className="h-4 w-4 text-muted-foreground" />
        </div>
      );
    }
    
    const isPositive = rankChange > 0;
    return (
      <div className={cn(
        "flex items-center justify-center gap-0.5 w-12 h-12 rounded-full border-2 font-bold text-sm",
        isPositive 
          ? "text-emerald-600 border-emerald-200 bg-emerald-50" 
          : "text-red-600 border-red-200 bg-red-50"
      )}>
        {isPositive ? (
          <ArrowUp className="h-3.5 w-3.5" />
        ) : (
          <ArrowDown className="h-3.5 w-3.5" />
        )}
        <span>{Math.abs(rankChange)}</span>
      </div>
    );
  };

  return (
    <Link 
      to={`/Fraternity/${fraternity.id}`}
      className="block"
    >
      <div className={cn(
        "flex items-center gap-3 py-3 px-2 transition-colors rounded-xl",
        displayMode === 'vibes' && tierInfo?.rowBg ? tierInfo.rowBg : "active:bg-muted/30"
      )}>
        {/* Rank - colored circle in vibes mode */}
        {displayMode === 'vibes' && tierInfo ? (
          <div className={cn(
            "w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0",
            tierInfo.rankBg
          )}>
            {rank}
          </div>
        ) : (
          <span className={cn(
            "w-6 text-sm font-medium tabular-nums",
            rank <= 3 ? "text-foreground" : "text-muted-foreground"
          )}>
            {isTied ? `T${rank}` : rank}.
          </span>
        )}

        {/* Content */}
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-base text-foreground leading-tight truncate">
            {fraternity.chapter}
          </h3>
          <p className={cn(
            "text-sm mt-0.5 truncate",
            displayMode === 'vibes' && tierInfo ? tierInfo.color : "text-muted-foreground"
          )}>
            {displayMode === 'vibes' && tierInfo ? tierInfo.name : fraternity.name}
          </p>
        </div>

        {/* Score Badge or Rank Change */}
        {displayMode === 'score' && (
          filter === 'trending' ? (
            renderRankChange()
          ) : (
            <div className={cn(
              "flex items-center justify-center w-12 h-12 rounded-full border-2 font-bold text-base",
              getScoreColorClass(score)
            )}>
              {score !== null ? score.toFixed(1) : '—'}
            </div>
          )
        )}
      </div>
    </Link>
  );
}
