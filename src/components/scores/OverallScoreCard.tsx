import { Users, Shield, Heart, Zap, Music, Settings } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import TrendIndicator from '@/components/leaderboard/TrendIndicator';
import ConfidenceBar from './ConfidenceBar';
import { getScoreColor } from '@/utils';
import type { FraternityScores } from '@/utils/scoring';

interface OverallScoreCardProps {
  scores: FraternityScores;
  showConfidence?: boolean;
  showTrending?: boolean;
  showReputationBreakdown?: boolean;
  showPartyBreakdown?: boolean;
}

/**
 * READ-ONLY display of all fraternity scores.
 * Shows Overall, Reputation (with 3 sub-categories), Party Quality (with 3 sub-categories), Confidence, and Trending.
 * Never includes interactive elements - this is display only.
 */
export default function OverallScoreCard({ 
  scores, 
  showConfidence = true,
  showTrending = true,
  showReputationBreakdown = true,
  showPartyBreakdown = true
}: OverallScoreCardProps) {
  const { 
    overall, repAdj, partyAdj, trending, 
    confidenceOverall, numRepRatings, numPartyRatings,
    avgBrotherhood, avgReputation, avgCommunity,
    avgVibe, avgMusic, avgExecution
  } = scores;

  const reputationBreakdown = [
    {
      key: 'brotherhood',
      label: 'Brotherhood',
      helper: 'Member quality and cohesion',
      icon: Users,
      value: avgBrotherhood,
      color: 'text-blue-500'
    },
    {
      key: 'reputation',
      label: 'Reputation',
      helper: 'Campus perception and overall standing',
      icon: Shield,
      value: avgReputation,
      color: 'text-primary'
    },
    {
      key: 'community',
      label: 'Community',
      helper: 'Welcoming, respectful, positive presence',
      icon: Heart,
      value: avgCommunity,
      color: 'text-rose-500'
    },
  ];

  const partyBreakdown = [
    {
      key: 'vibe',
      label: 'Vibe',
      helper: 'Energy and atmosphere',
      icon: Zap,
      value: avgVibe,
      color: 'text-amber-500'
    },
    {
      key: 'music',
      label: 'Music',
      helper: 'DJ, playlist quality',
      icon: Music,
      value: avgMusic,
      color: 'text-blue-500'
    },
    {
      key: 'execution',
      label: 'Execution',
      helper: 'Organization and logistics',
      icon: Settings,
      value: avgExecution,
      color: 'text-green-500'
    },
  ];

  return (
    <div className="space-y-4">
      {/* Overall Score - Big Display */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground mb-1">Overall Score</p>
            <div className="text-4xl font-bold text-foreground">
              {overall.toFixed(1)}
            </div>
          </div>
          {showTrending && (
            <div className="flex items-center gap-2">
              <TrendIndicator momentum={trending} showLabel />
              <Badge variant="outline">
                {trending >= 0 ? '+' : ''}{trending.toFixed(2)}
              </Badge>
            </div>
          )}
        </div>
        
        {/* Overall Score Progress Bar */}
        <div className="w-full bg-muted rounded-full h-3 overflow-hidden">
          <div 
            className="h-full bg-primary transition-all duration-500 rounded-full"
            style={{ width: `${(overall / 10) * 100}%` }}
          />
        </div>
      </div>

      {/* Reputation Breakdown - 3 sub-categories (READ-ONLY) */}
      {showReputationBreakdown && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">Reputation Breakdown</p>
            <span className={`text-sm font-bold ${getScoreColor(repAdj)}`}>{repAdj.toFixed(1)}</span>
          </div>
          
          {reputationBreakdown.map(({ key, label, helper, icon: Icon, value, color }) => (
            <div key={key} className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full bg-muted flex items-center justify-center ${color}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">{label}</p>
                    <p className="text-xs text-muted-foreground">{helper}</p>
                  </div>
                </div>
                <p className={`text-lg font-bold ${getScoreColor(value)}`}>{value.toFixed(1)}</p>
              </div>
              <Progress value={value * 10} className="h-2" />
            </div>
          ))}
        </div>
      )}

      {/* Party Quality Breakdown - 3 sub-categories (READ-ONLY) */}
      {showPartyBreakdown && (
        <div className="space-y-4 pt-2 border-t">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">Party Quality Breakdown</p>
            <span className={`text-sm font-bold ${getScoreColor(partyAdj)}`}>{partyAdj.toFixed(1)}</span>
          </div>
          
          {partyBreakdown.map(({ key, label, helper, icon: Icon, value, color }) => (
            <div key={key} className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full bg-muted flex items-center justify-center ${color}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">{label}</p>
                    <p className="text-xs text-muted-foreground">{helper}</p>
                  </div>
                </div>
                <p className={`text-lg font-bold ${getScoreColor(value)}`}>{value.toFixed(1)}</p>
              </div>
              <Progress value={value * 10} className="h-2" />
            </div>
          ))}
        </div>
      )}

      {/* Confidence Indicator */}
      {showConfidence && (
        <ConfidenceBar 
          confidence={confidenceOverall}
          repRatings={numRepRatings}
          partyRatings={numPartyRatings}
        />
      )}
    </div>
  );
}
