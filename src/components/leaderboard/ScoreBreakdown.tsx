import { Progress } from '@/components/ui/progress';
import { Zap, Music, Settings, Users, Shield, Heart } from 'lucide-react';
import { getScoreColor } from '@/utils';

type BreakdownMode = 'overall' | 'reputation' | 'party';

interface ScoreBreakdownProps {
  reputationScore: number;
  partyScore: number;
  mode?: BreakdownMode;
  // Party breakdown scores
  avgVibe?: number;
  avgMusic?: number;
  avgExecution?: number;
  // Reputation breakdown scores
  avgBrotherhood?: number;
  avgReputation?: number;
  avgCommunity?: number;
}

export default function ScoreBreakdown({ 
  reputationScore, 
  partyScore,
  mode = 'overall',
  avgVibe = 5,
  avgMusic = 5,
  avgExecution = 5,
  avgBrotherhood = 5,
  avgReputation = 5,
  avgCommunity = 5,
}: ScoreBreakdownProps) {
  
  if (mode === 'party') {
    // Show Vibe, Music, Execution breakdown for party mode
    const partyBreakdown = [
      { key: 'vibe', label: 'Vibe', icon: Zap, value: avgVibe, color: 'text-amber-500' },
      { key: 'music', label: 'Music', icon: Music, value: avgMusic, color: 'text-blue-500' },
      { key: 'execution', label: 'Execution', icon: Settings, value: avgExecution, color: 'text-green-500' },
    ];

    return (
      <div className="space-y-3">
        {partyBreakdown.map(({ key, label, icon: Icon, value, color }) => (
          <div key={key} className="space-y-1.5">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <Icon className={`h-3.5 w-3.5 ${color}`} />
                <span className="text-muted-foreground">{label}</span>
              </div>
              <span className={`font-semibold ${getScoreColor(value)}`}>{value.toFixed(1)}</span>
            </div>
            <Progress value={value * 10} className="h-2" />
          </div>
        ))}
      </div>
    );
  }

  if (mode === 'reputation') {
    // Show Brotherhood, Reputation, Community breakdown for reputation mode
    const reputationBreakdown = [
      { key: 'brotherhood', label: 'Brotherhood', icon: Users, value: avgBrotherhood, color: 'text-blue-500' },
      { key: 'reputation', label: 'Reputation', icon: Shield, value: avgReputation, color: 'text-primary' },
      { key: 'community', label: 'Community', icon: Heart, value: avgCommunity, color: 'text-rose-500' },
    ];

    return (
      <div className="space-y-3">
        {reputationBreakdown.map(({ key, label, icon: Icon, value, color }) => (
          <div key={key} className="space-y-1.5">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <Icon className={`h-3.5 w-3.5 ${color}`} />
                <span className="text-muted-foreground">{label}</span>
              </div>
              <span className={`font-semibold ${getScoreColor(value)}`}>{value.toFixed(1)}</span>
            </div>
            <Progress value={value * 10} className="h-2" />
          </div>
        ))}
      </div>
    );
  }

  // Default (overall/trending): show Reputation/Party Quality summary
  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Overall Frat Rating</span>
          <span className="font-semibold">{reputationScore.toFixed(1)}</span>
        </div>
        <Progress value={reputationScore * 10} className="h-2" />
      </div>
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Party Quality</span>
          <span className="font-semibold">{partyScore.toFixed(1)}</span>
        </div>
        <Progress value={partyScore * 10} className="h-2" />
      </div>
    </div>
  );
}
