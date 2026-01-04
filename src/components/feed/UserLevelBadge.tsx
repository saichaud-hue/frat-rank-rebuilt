import { cn } from '@/lib/utils';
import { LEVELS } from '@/utils/points';

interface UserLevelBadgeProps {
  points: number;
  compact?: boolean;
  className?: string;
}

/**
 * Get level info for a given point total
 */
function getLevelForPoints(points: number) {
  return LEVELS.find(l => points >= l.minPoints && points <= l.maxPoints) || LEVELS[0];
}

export default function UserLevelBadge({ points, compact = false, className }: UserLevelBadgeProps) {
  const level = getLevelForPoints(points);
  
  if (compact) {
    return (
      <span className={cn(
        "text-xs text-muted-foreground italic",
        className
      )}>
        {level.name}
      </span>
    );
  }
  
  return (
    <span className={cn(
      "px-2 py-0.5 rounded-md text-xs font-medium bg-muted/60 text-muted-foreground border border-border/50",
      className
    )}>
      {level.name}
    </span>
  );
}

export { getLevelForPoints };
