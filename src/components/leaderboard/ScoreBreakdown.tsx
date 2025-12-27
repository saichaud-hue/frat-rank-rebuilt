import { Progress } from '@/components/ui/progress';

interface ScoreBreakdownProps {
  reputationScore: number;
  partyScore: number;
}

export default function ScoreBreakdown({ reputationScore, partyScore }: ScoreBreakdownProps) {
  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Reputation</span>
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
