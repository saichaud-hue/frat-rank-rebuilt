import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { TrendingUp, TrendingDown, Minus, ChevronRight, Star, Trophy } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Fraternity } from '@/lib/supabase-data';

interface MomentumSnapshotProps {
  fraternities: Fraternity[];
}

type MomentumStatus = 'rising' | 'falling' | 'stable';

interface FratWithMomentum {
  frat: Fraternity;
  status: MomentumStatus;
  score: number;
}

export default function MomentumSnapshot({ fraternities }: MomentumSnapshotProps) {
  const momentumFrats = useMemo(() => {
    const fratsWithScores: FratWithMomentum[] = fraternities
      .filter(f => f.status === 'active' && f.display_score && f.display_score > 0)
      .map(frat => {
        const momentum = frat.momentum || 0;
        let status: MomentumStatus = 'stable';
        if (momentum > 0.15) status = 'rising';
        else if (momentum < -0.15) status = 'falling';
        
        return {
          frat,
          status,
          score: frat.display_score || 0,
        };
      });

    // Prioritize frats with momentum changes, then by score
    const rising = fratsWithScores.filter(f => f.status === 'rising').sort((a, b) => b.score - a.score);
    const falling = fratsWithScores.filter(f => f.status === 'falling').sort((a, b) => b.score - a.score);
    const stable = fratsWithScores.filter(f => f.status === 'stable').sort((a, b) => b.score - a.score);

    // Take 1 rising, 1 falling (if exists), 1 stable (or more of each)
    const result: FratWithMomentum[] = [];
    if (rising[0]) result.push(rising[0]);
    if (falling[0]) result.push(falling[0]);
    if (stable[0] && result.length < 3) result.push(stable[0]);
    if (rising[1] && result.length < 3) result.push(rising[1]);
    if (stable[1] && result.length < 3) result.push(stable[1]);

    return result.slice(0, 3);
  }, [fraternities]);

  if (momentumFrats.length === 0) {
    return null;
  }

  const getMomentumIcon = (status: MomentumStatus) => {
    switch (status) {
      case 'rising':
        return <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />;
      case 'falling':
        return <TrendingDown className="h-3.5 w-3.5 text-red-500" />;
      default:
        return <Minus className="h-3.5 w-3.5 text-muted-foreground" />;
    }
  };

  const getMomentumLabel = (status: MomentumStatus) => {
    switch (status) {
      case 'rising':
        return 'Rising';
      case 'falling':
        return 'Falling';
      default:
        return 'Stable';
    }
  };

  const getMomentumColor = (status: MomentumStatus) => {
    switch (status) {
      case 'rising':
        return 'text-emerald-600 bg-emerald-500/10';
      case 'falling':
        return 'text-red-600 bg-red-500/10';
      default:
        return 'text-muted-foreground bg-muted';
    }
  };

  return (
    <div className="space-y-3">
      {/* Section Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Trophy className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-bold text-foreground uppercase tracking-wide">Momentum</h3>
        </div>
        <Link to="/Leaderboard" className="text-xs font-semibold text-primary hover:underline">
          View all
        </Link>
      </div>

      {/* Momentum Cards */}
      <div className="rounded-2xl bg-card border overflow-hidden">
        {momentumFrats.map((item, index) => {
          const { frat, status, score } = item;
          const fullStars = Math.floor(score / 2);
          
          return (
            <Link
              key={frat.id}
              to={`/Fraternity/${frat.id}`}
              className={cn(
                "flex items-center gap-3 p-3 hover:bg-muted/50 transition-colors",
                index < momentumFrats.length - 1 && "border-b"
              )}
            >
              {/* Rank Badge */}
              <div className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0",
                index === 0 ? "bg-amber-500 text-white" : "bg-muted text-muted-foreground"
              )}>
                {index + 1}
              </div>

              {/* Frat Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-sm truncate">{frat.chapter}</p>
                  <span className={cn(
                    "inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold",
                    getMomentumColor(status)
                  )}>
                    {getMomentumIcon(status)}
                    {getMomentumLabel(status)}
                  </span>
                </div>
                <div className="flex items-center gap-1 mt-0.5">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className={cn(
                        "h-2.5 w-2.5",
                        i < fullStars 
                          ? "text-amber-400 fill-amber-400" 
                          : "text-muted-foreground/30"
                      )}
                    />
                  ))}
                  <span className="text-xs font-semibold text-muted-foreground ml-1">{score.toFixed(1)}</span>
                </div>
              </div>

              {/* Arrow */}
              <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
            </Link>
          );
        })}
      </div>
    </div>
  );
}
