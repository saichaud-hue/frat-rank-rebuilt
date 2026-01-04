import { Check, BarChart3 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PollCardProps {
  question: string;
  options: string[];
  userVote: number | null;
  voteCounts: Record<number, number>;
  onVote?: (optionIndex: number) => void;
  compact?: boolean;
}

export default function PollCard({ 
  question, 
  options, 
  userVote, 
  voteCounts, 
  onVote,
  compact = false 
}: PollCardProps) {
  const totalVotes = Object.values(voteCounts).reduce((a, b) => a + b, 0);
  const hasVoted = userVote !== null;

  return (
    <div className={cn(
      "rounded-xl border border-primary/20 overflow-hidden",
      compact ? "p-3" : "p-4"
    )}>
      {/* Poll Header */}
      <div className="flex items-center gap-2 mb-3">
        <div className={cn(
          "rounded-full bg-primary/10 flex items-center justify-center",
          compact ? "w-7 h-7" : "w-8 h-8"
        )}>
          <BarChart3 className={cn("text-primary", compact ? "h-3.5 w-3.5" : "h-4 w-4")} />
        </div>
        <p className={cn("font-semibold text-foreground", compact ? "text-sm" : "text-base")}>
          {question}
        </p>
      </div>

      {/* Poll Options */}
      <div className={cn("space-y-2", compact ? "space-y-1.5" : "space-y-2")}>
        {options.map((option, index) => {
          const voteCount = voteCounts[index] || 0;
          const percentage = totalVotes > 0 ? Math.round((voteCount / totalVotes) * 100) : 0;
          const isSelected = userVote === index;
          const isWinning = hasVoted && voteCount === Math.max(...Object.values(voteCounts)) && voteCount > 0;

          return (
            <button
              key={index}
              onClick={() => !hasVoted && onVote?.(index)}
              disabled={hasVoted || !onVote}
              className={cn(
                "w-full rounded-xl text-left transition-all relative overflow-hidden",
                compact ? "p-2.5" : "p-3",
                hasVoted 
                  ? "cursor-default" 
                  : onVote 
                    ? "hover:bg-primary/5 active:scale-[0.99] cursor-pointer" 
                    : "cursor-default",
                isSelected 
                  ? "border-2 border-primary bg-primary/5" 
                  : "border border-border/50 bg-muted/30"
              )}
            >
              {/* Progress Bar Background */}
              {hasVoted && (
                <div 
                  className={cn(
                    "absolute inset-y-0 left-0 transition-all duration-700 ease-out rounded-l-xl",
                    isWinning ? "bg-primary/20" : "bg-muted/50"
                  )}
                  style={{ width: `${percentage}%` }}
                />
              )}
              
              {/* Option Content */}
              <div className="relative flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {/* Selection indicator */}
                  <div className={cn(
                    "rounded-full flex items-center justify-center transition-all shrink-0",
                    compact ? "w-5 h-5" : "w-6 h-6",
                    isSelected 
                      ? "bg-primary text-white" 
                      : hasVoted 
                        ? "bg-muted/50 border border-border/50" 
                        : "bg-background border border-border"
                  )}>
                    {isSelected && <Check className={cn(compact ? "h-3 w-3" : "h-3.5 w-3.5")} />}
                  </div>
                  <span className={cn(
                    "font-medium",
                    compact ? "text-sm" : "text-sm",
                    isSelected ? "text-primary" : "text-foreground"
                  )}>
                    {option}
                  </span>
                </div>
                {hasVoted && (
                  <span className={cn(
                    "font-bold tabular-nums",
                    compact ? "text-sm" : "text-sm",
                    isWinning ? "text-primary" : "text-muted-foreground"
                  )}>
                    {percentage}%
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Vote Count */}
      <div className="flex items-center justify-between mt-3 pt-2 border-t border-border/30">
        <p className={cn("text-muted-foreground", compact ? "text-xs" : "text-xs")}>
          {totalVotes} {totalVotes === 1 ? 'vote' : 'votes'}
        </p>
        {!hasVoted && onVote && (
          <p className="text-xs text-primary font-medium">Tap to vote</p>
        )}
      </div>
    </div>
  );
}

// Helper function to parse poll text format
export function parsePollFromText(text: string): { question: string; options: string[] } | null {
  if (!text.includes('POLL:')) return null;
  
  // Handle both newline and space-separated formats
  // Format 1: "POLL:Question\nOPTION:A\nOPTION:B"
  // Format 2: "POLL:Question? OPTION:A OPTION:B"
  
  // First try newline format
  if (text.includes('\n')) {
    const lines = text.split('\n');
    const question = lines[0].replace('POLL:', '').trim();
    const options = lines.slice(1).filter(l => l.startsWith('OPTION:')).map(l => l.replace('OPTION:', '').trim());
    if (options.length >= 2) {
      return { question, options };
    }
  }
  
  // Try space-separated format: "POLL:Question? OPTION:A OPTION:B"
  const pollMatch = text.match(/POLL:([^O]+?)(?=\s+OPTION:|$)/);
  if (pollMatch) {
    const question = pollMatch[1].trim();
    const optionMatches = text.matchAll(/OPTION:([^O]+?)(?=\s+OPTION:|$)/g);
    const options = Array.from(optionMatches).map(m => m[1].trim());
    if (options.length >= 2) {
      return { question, options };
    }
  }
  
  return null;
}
