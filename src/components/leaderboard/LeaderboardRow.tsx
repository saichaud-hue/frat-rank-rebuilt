import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { type FraternityWithScores } from '@/utils/scoring';
import { cn } from '@/lib/utils';

type FilterType = 'overall' | 'reputation' | 'party' | 'trending';
type DisplayMode = 'score' | 'vibes';

interface TierInfo {
  name: string;
  emoji: string;
  color: string;
}

interface LeaderboardRowProps {
  fraternity: FraternityWithScores;
  rank: number;
  filter?: FilterType;
  isTied?: boolean;
  displayMode?: DisplayMode;
  tierInfo?: TierInfo;
}

export default function LeaderboardRow({ 
  fraternity, 
  rank, 
  filter = 'overall', 
  isTied = false,
  displayMode = 'score',
  tierInfo 
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

  // Get tier badge colors for vibes mode
  const getTierBgColor = (tierName: string): string => {
    if (tierName.includes('Touse')) return 'bg-gradient-to-br from-amber-400 to-orange-500';
    if (tierName.includes('Mouse')) return 'bg-gradient-to-br from-emerald-400 to-teal-500';
    if (tierName.includes('Bouse')) return 'bg-gradient-to-br from-blue-400 to-indigo-500';
    return 'bg-gradient-to-br from-gray-400 to-gray-500';
  };

  return (
    <Link 
      to={createPageUrl(`Fraternity?id=${fraternity.id}`)}
      className="block"
    >
      <div className="flex items-center gap-4 py-4 px-1 active:bg-muted/30 transition-colors">
        {/* Rank */}
        <span className={cn(
          "w-6 text-sm font-medium tabular-nums",
          rank <= 3 ? "text-foreground" : "text-muted-foreground"
        )}>
          {isTied ? `T${rank}` : rank}.
        </span>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-base text-foreground leading-tight truncate">
            {fraternity.name}
          </h3>
          <p className={cn(
            "text-sm mt-0.5 truncate",
            displayMode === 'vibes' && tierInfo ? tierInfo.color : "text-muted-foreground"
          )}>
            {displayMode === 'vibes' && tierInfo ? (
              <span className="flex items-center gap-1">
                <span>{tierInfo.emoji}</span>
                <span className="font-medium">{tierInfo.name}</span>
              </span>
            ) : (
              fraternity.chapter
            )}
          </p>
        </div>

        {/* Score Badge or Vibes Badge */}
        {displayMode === 'vibes' && tierInfo ? (
          <div className={cn(
            "flex items-center justify-center w-12 h-12 rounded-full text-white text-xl",
            getTierBgColor(tierInfo.name)
          )}>
            {tierInfo.emoji}
          </div>
        ) : (
          <div className={cn(
            "flex items-center justify-center w-12 h-12 rounded-full border-2 font-bold text-base",
            getScoreColorClass(score)
          )}>
            {score !== null ? score.toFixed(1) : '—'}
          </div>
        )}
      </div>
    </Link>
  );
}
