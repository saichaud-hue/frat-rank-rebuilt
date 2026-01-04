import { Flame } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface StreakDisplayProps {
  streak: number;
  hoursRemaining?: number | null;
  longestStreak?: number;
  size?: 'sm' | 'md' | 'lg';
}

export default function StreakDisplay({ 
  streak, 
  hoursRemaining, 
  longestStreak,
  size = 'sm' 
}: StreakDisplayProps) {
  const isActive = streak > 0;
  const isUrgent = hoursRemaining !== null && hoursRemaining !== undefined && hoursRemaining < 6;
  
  const sizeClasses = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg font-semibold'
  };
  
  const iconSizes = {
    sm: 'h-4 w-4',
    md: 'h-5 w-5',
    lg: 'h-6 w-6'
  };

  const tooltipContent = () => {
    if (!isActive) {
      return "Start your streak by rating a party or fraternity today!";
    }
    
    let content = `${streak} day streak`;
    if (longestStreak && longestStreak > streak) {
      content += ` • Best: ${longestStreak}d`;
    }
    if (hoursRemaining !== null && hoursRemaining !== undefined) {
      const hours = Math.floor(hoursRemaining);
      const minutes = Math.floor((hoursRemaining - hours) * 60);
      content += ` • ${hours}h ${minutes}m to keep streak`;
    }
    return content;
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={`flex items-center gap-1 ${sizeClasses[size]} text-muted-foreground`}>
            <Flame 
              className={`${iconSizes[size]} transition-colors ${
                isActive 
                  ? isUrgent 
                    ? 'text-red-500 animate-pulse' 
                    : 'text-orange-500' 
                  : 'text-muted-foreground/50'
              }`} 
            />
            <span className={isActive ? 'text-foreground' : ''}>{streak}d</span>
          </div>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-[200px] text-center">
          <p>{tooltipContent()}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
