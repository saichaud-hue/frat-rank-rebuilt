import { Badge } from '@/components/ui/badge';
import TrendIndicator from '@/components/leaderboard/TrendIndicator';
import ScoreDisplay from './ScoreDisplay';
import ConfidenceBar from './ConfidenceBar';
import type { FraternityScores } from '@/utils/scoring';

interface OverallScoreCardProps {
  scores: FraternityScores;
  showConfidence?: boolean;
  showTrending?: boolean;
}

/**
 * READ-ONLY display of all fraternity scores.
 * Shows Overall, Reputation, Party Quality, Confidence, and Trending.
 * Never includes interactive elements - this is display only.
 */
export default function OverallScoreCard({ 
  scores, 
  showConfidence = true,
  showTrending = true 
}: OverallScoreCardProps) {
  const { overall, repAdj, partyAdj, trending, confidenceOverall, numRepRatings, numPartyRatings } = scores;

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
            <p className="text-xs text-muted-foreground mt-1">
              65% Reputation • 35% Party
            </p>
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

      {/* Reputation & Party Breakdown */}
      <div className="space-y-3">
        <ScoreDisplay 
          label="Reputation" 
          score={repAdj} 
          weight="65%"
        />
        <ScoreDisplay 
          label="Party Quality" 
          score={partyAdj} 
          weight="35%"
        />
      </div>

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
