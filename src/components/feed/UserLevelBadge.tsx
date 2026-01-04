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
        "text-xs text-muted-foreground",
        className
      )}>
        Lvl {level.level} · {level.name}
      </span>
    );
  }
  
  return (
    <span className={cn(
      "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium text-white",
      level.color,
      className
    )}>
      Lvl {level.level} · {level.name}
    </span>
  );
}

export { getLevelForPoints };
