import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { getScoreColor } from '@/utils';

interface ScoreDisplayProps {
  label: string;
  score: number;
  weight?: string;
  showBar?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

/**
 * READ-ONLY score display component.
 * Never use sliders here - this is for displaying computed scores only.
 */
export default function ScoreDisplay({ 
  label, 
  score, 
  weight, 
  showBar = true,
  size = 'md' 
}: ScoreDisplayProps) {
  const scoreValue = score ?? 5;
  
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={`text-muted-foreground ${size === 'sm' ? 'text-xs' : 'text-sm'}`}>
            {label}
          </span>
          {weight && (
            <Badge variant="outline" className="text-xs">{weight}</Badge>
          )}
        </div>
        <span className={`font-semibold ${getScoreColor(scoreValue)} ${
          size === 'lg' ? 'text-lg' : size === 'sm' ? 'text-sm' : ''
        }`}>
          {scoreValue.toFixed(1)}
        </span>
      </div>
      {showBar && (
        <Progress value={scoreValue * 10} className={size === 'sm' ? 'h-1.5' : 'h-2'} />
      )}
    </div>
  );
}
