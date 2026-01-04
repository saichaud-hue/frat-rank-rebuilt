import { useState } from 'react';
import { cn } from '@/lib/utils';
import { LEVELS } from '@/utils/points';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { CheckCircle2 } from 'lucide-react';

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
  const [showLevels, setShowLevels] = useState(false);
  const level = getLevelForPoints(points);
  
  if (compact) {
    return (
      <>
        <button
          onClick={() => setShowLevels(true)}
          className={cn(
            "px-1.5 py-0.5 rounded text-xs font-medium transition-opacity hover:opacity-80",
            level.color,
            level.textColor,
            className
          )}
        >
          {level.name}
        </button>
        <LevelsDialog open={showLevels} onOpenChange={setShowLevels} currentLevel={level.level} />
      </>
    );
  }
  
  return (
    <>
      <button
        onClick={() => setShowLevels(true)}
        className={cn(
          "px-2.5 py-1 rounded-lg text-xs font-semibold transition-all hover:scale-105 hover:shadow-md",
          level.color,
          level.textColor,
          className
        )}
      >
        {level.name}
      </button>
      <LevelsDialog open={showLevels} onOpenChange={setShowLevels} currentLevel={level.level} />
    </>
  );
}

function LevelsDialog({ open, onOpenChange, currentLevel }: { open: boolean; onOpenChange: (open: boolean) => void; currentLevel: number }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-center">Ranking Tiers</DialogTitle>
        </DialogHeader>
        <div className="space-y-2 py-4">
          {[...LEVELS].reverse().map((lvl) => (
            <div 
              key={lvl.level}
              className={cn(
                "flex items-center justify-between p-3 rounded-xl transition-all",
                lvl.color,
                lvl.textColor,
                currentLevel === lvl.level && "ring-2 ring-offset-2 ring-primary"
              )}
            >
              <div className="flex items-center gap-2">
                {currentLevel === lvl.level && (
                  <CheckCircle2 className="h-4 w-4" />
                )}
                <span className="font-semibold">{lvl.name}</span>
              </div>
              <span className="text-sm opacity-80">
                {lvl.maxPoints === Infinity ? `${lvl.minPoints}+` : `${lvl.minPoints}-${lvl.maxPoints}`} pts
              </span>
            </div>
          ))}
        </div>
        <p className="text-xs text-muted-foreground text-center">
          Earn points by rating, posting, and engaging!
        </p>
      </DialogContent>
    </Dialog>
  );
}

export { getLevelForPoints };
