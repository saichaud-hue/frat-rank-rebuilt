import { Crown, Trophy, Star, Calendar } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import TrendIndicator from './TrendIndicator';
import ScoreBreakdown from './ScoreBreakdown';
import type { Fraternity } from '@/api/base44Client';

interface FraternityCardProps {
  fraternity: Fraternity;
  rank: number;
  onRate: (fraternity: Fraternity) => void;
}

export default function FraternityCard({ fraternity, rank, onRate }: FraternityCardProps) {
  const RankIcon = rank === 1 ? Crown : rank <= 3 ? Trophy : null;
  
  const handleRateClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onRate(fraternity);
  };

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
                  {(fraternity.historical_party_score ?? 5.0).toFixed(1)}
                </div>
                <p className="text-xs text-muted-foreground">Party Score</p>
                <TrendIndicator momentum={fraternity.momentum ?? 0} />
              </div>
            </div>

            {fraternity.description && (
              <p className="text-sm text-muted-foreground line-clamp-2">
                {fraternity.description}
              </p>
            )}

            <ScoreBreakdown 
              reputationScore={fraternity.reputation_score ?? 5} 
              partyScore={fraternity.historical_party_score ?? 5} 
            />

            <div className="flex items-center justify-between pt-2">
              <Badge 
                variant="outline" 
                className={`${
                  (fraternity.momentum ?? 0) > 0.5 ? 'text-emerald-600 border-emerald-200 bg-emerald-50' :
                  (fraternity.momentum ?? 0) < -0.5 ? 'text-red-500 border-red-200 bg-red-50' :
                  'text-muted-foreground'
                }`}
              >
                {(fraternity.momentum ?? 0) >= 0 ? '+' : ''}{(fraternity.momentum ?? 0).toFixed(2)} momentum
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
