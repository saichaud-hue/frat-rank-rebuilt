import { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, Minus, Zap, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { fraternityQueries } from '@/lib/supabase-data';
import { useNavigate } from 'react-router-dom';

interface MomentumItem {
  id: string;
  name: string;
  momentum: number;
  score: number;
  trend: 'rising' | 'falling' | 'stable';
}

export default function MomentumSnapshot() {
  const navigate = useNavigate();
  const [items, setItems] = useState<MomentumItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMomentumData();
  }, []);

  const loadMomentumData = async () => {
    try {
      const frats = await fraternityQueries.listActive();
      
      // Transform and sort by momentum (absolute value for most movement)
      const momentumItems: MomentumItem[] = frats.map(f => {
        const momentum = f.momentum || 0;
        let trend: 'rising' | 'falling' | 'stable' = 'stable';
        if (momentum > 0.1) trend = 'rising';
        if (momentum < -0.1) trend = 'falling';
        
        return {
          id: f.id,
          name: f.name,
          momentum,
          score: f.display_score || 5,
          trend,
        };
      });

      // Get 2-3 items showing the most movement (rising first, then falling)
      const rising = momentumItems.filter(i => i.trend === 'rising').slice(0, 2);
      const falling = momentumItems.filter(i => i.trend === 'falling').slice(0, 1);
      const stable = momentumItems.filter(i => i.trend === 'stable').slice(0, 1);
      
      // Combine with priority: rising, falling, stable - max 3
      const combined = [...rising, ...falling, ...stable].slice(0, 3);
      
      // If no movement data, show top 3 with stable indicator
      if (combined.length === 0) {
        setItems(momentumItems.slice(0, 3));
      } else {
        setItems(combined);
      }
    } catch (error) {
      console.error('Failed to load momentum data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getTrendIcon = (trend: 'rising' | 'falling' | 'stable') => {
    switch (trend) {
      case 'rising':
        return <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />;
      case 'falling':
        return <TrendingDown className="h-3.5 w-3.5 text-red-500" />;
      default:
        return <Minus className="h-3.5 w-3.5 text-muted-foreground" />;
    }
  };

  const getTrendLabel = (trend: 'rising' | 'falling' | 'stable') => {
    switch (trend) {
      case 'rising':
        return { text: 'Rising', color: 'text-emerald-500' };
      case 'falling':
        return { text: 'Falling', color: 'text-red-500' };
      default:
        return { text: 'Stable', color: 'text-muted-foreground' };
    }
  };

  if (loading) {
    return (
      <div className="bg-card rounded-2xl p-4 animate-pulse">
        <div className="h-5 bg-muted rounded w-36 mb-3" />
        <div className="space-y-2">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-12 bg-muted rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-2xl p-4 shadow-duke">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Zap className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-bold text-foreground">Momentum</h3>
        </div>
        <button 
          onClick={() => navigate('/Leaderboard')}
          className="text-xs text-primary font-medium flex items-center gap-0.5 hover:underline"
        >
          Rankings <ChevronRight className="h-3 w-3" />
        </button>
      </div>

      <div className="space-y-2">
        {items.map(item => {
          const trendLabel = getTrendLabel(item.trend);
          
          return (
            <button
              key={item.id}
              onClick={() => navigate(`/Fraternity/${item.id}`)}
              className={cn(
                "w-full flex items-center gap-3 p-2.5 rounded-xl transition-all",
                "bg-background border border-border hover:border-primary/50 active:scale-[0.98]"
              )}
            >
              <div className={cn(
                "w-8 h-8 rounded-lg flex items-center justify-center shrink-0",
                item.trend === 'rising' && "bg-emerald-500/10",
                item.trend === 'falling' && "bg-red-500/10",
                item.trend === 'stable' && "bg-muted"
              )}>
                {getTrendIcon(item.trend)}
              </div>
              
              <div className="flex-1 min-w-0 text-left">
                <p className="text-sm font-medium text-foreground truncate">{item.name}</p>
                <p className={cn("text-xs font-medium", trendLabel.color)}>
                  {trendLabel.text}
                </p>
              </div>

              <div className="text-right shrink-0">
                <p className="text-sm font-bold text-foreground tabular-nums">
                  {item.score.toFixed(1)}
                </p>
                <p className="text-xs text-muted-foreground">score</p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
