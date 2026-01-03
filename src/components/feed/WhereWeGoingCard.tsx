import { useState, useMemo } from 'react';
import { Check, Plus, Zap, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { format } from 'date-fns';
import type { Party, Fraternity } from '@/lib/supabase-data';

interface WhereWeGoingCardProps {
  todaysParties: Party[];
  fraternities: Fraternity[];
  allUserVotes: Record<string, string>;
  userId: string;
  onVote: (optionId: string) => void;
  onCustomVote: (optionId: string) => void;
  onAddSuggestion: (text: string) => void;
  customSuggestions: { id: string; text: string }[];
}

// Core options that always show (even with 0 votes)
const CORE_OPTIONS = ['devines', 'shooters', 'stay_in'];
const MAX_VISIBLE_OPTIONS = 6;

const defaultMoveOptions = [
  { id: 'devines', label: 'Devines' },
  { id: 'shooters', label: 'Shooters' },
  { id: 'stay_in', label: 'Stay In' },
];

// Dot indicator component
function DotIndicator({ percentage, isLeader }: { percentage: number; isLeader: boolean }) {
  const totalDots = 10;
  const filledDots = Math.round((percentage / 100) * totalDots);
  
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: totalDots }).map((_, i) => (
        <div
          key={i}
          className={cn(
            "w-1.5 h-1.5 rounded-full transition-colors",
            i < filledDots
              ? isLeader ? "bg-primary" : "bg-muted-foreground/50"
              : "bg-muted-foreground/20"
          )}
        />
      ))}
    </div>
  );
}

export default function WhereWeGoingCard({
  todaysParties,
  fraternities,
  allUserVotes,
  userId,
  onVote,
  onCustomVote,
  onAddSuggestion,
  customSuggestions,
}: WhereWeGoingCardProps) {
  const [showAddMenu, setShowAddMenu] = useState(false);
  const userMoveVote = allUserVotes[userId] || null;
  
  const moveVotes = useMemo(() => {
    const counts: Record<string, number> = {};
    Object.values(allUserVotes).forEach(optionId => {
      counts[optionId] = (counts[optionId] || 0) + 1;
    });
    return counts;
  }, [allUserVotes]);

  const totalMoveVotes = Object.keys(allUserVotes).length;

  // Build all options
  const allOptions = useMemo(() => {
    const options: { id: string; type: 'party' | 'default' | 'custom'; label: string; votes: number; isCore: boolean }[] = [];
    
    // Add today's parties
    todaysParties.forEach(party => {
      options.push({
        id: party.id,
        type: 'party',
        label: party.title,
        votes: moveVotes[party.id] || 0,
        isCore: false,
      });
    });

    // Add default options
    defaultMoveOptions.forEach(option => {
      options.push({
        id: option.id,
        type: 'default',
        label: option.label,
        votes: moveVotes[option.id] || 0,
        isCore: CORE_OPTIONS.includes(option.id),
      });
    });

    // Add custom suggestions (only if they have votes)
    customSuggestions.forEach(suggestion => {
      const votes = moveVotes[suggestion.id] || 0;
      // Only include custom options if they have votes (auto-prune rule)
      if (votes > 0) {
        options.push({
          id: suggestion.id,
          type: 'custom',
          label: suggestion.text,
          votes,
          isCore: false,
        });
      }
    });

    return options;
  }, [todaysParties, moveVotes, customSuggestions]);

  // Filter visible options: core always visible, others only if they have votes
  const visibleOptions = useMemo(() => {
    const filtered = allOptions.filter(opt => opt.isCore || opt.votes > 0);
    // Sort by votes descending
    const sorted = filtered.sort((a, b) => b.votes - a.votes);
    // Limit to max visible
    return sorted.slice(0, MAX_VISIBLE_OPTIONS);
  }, [allOptions]);

  // Hidden options (zero-vote non-core) for the "Add option" dropdown
  const hiddenOptions = useMemo(() => {
    return customSuggestions.filter(s => (moveVotes[s.id] || 0) === 0);
  }, [customSuggestions, moveVotes]);

  // Get available fraternities for dropdown
  const availableFrats = useMemo(() => {
    const addedFratIds = new Set(customSuggestions.map(s => s.id));
    return fraternities
      .filter(f => f.status === 'active' && !addedFratIds.has(`frat-${f.id}`))
      .slice(0, 8);
  }, [fraternities, customSuggestions]);

  const handleOptionVote = (option: typeof allOptions[0]) => {
    if (option.type === 'custom') {
      onCustomVote(option.id);
    } else {
      onVote(option.id);
    }
  };

  const handleAddFrat = (frat: Fraternity) => {
    onAddSuggestion(frat.chapter || frat.name);
  };

  const handleReinstateOption = (suggestion: { id: string; text: string }) => {
    // Vote for it to reinstate
    onCustomVote(suggestion.id);
  };

  const canShowAddButton = visibleOptions.length < MAX_VISIBLE_OPTIONS || hiddenOptions.length > 0 || availableFrats.length > 0;

  // Find leader
  const leaderId = visibleOptions.length > 0 && visibleOptions[0].votes > 0 ? visibleOptions[0].id : null;

  return (
    <div className="rounded-2xl bg-card border shadow-sm overflow-hidden">
      {/* Compact header - single line */}
      <div className="px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center">
            <Zap className="h-4 w-4 text-white" />
          </div>
          <div>
            <span className="font-display font-bold text-sm">Where we going?</span>
            <span className="text-muted-foreground text-xs ml-1.5">· Tonight</span>
          </div>
        </div>
        <span className="text-xs text-muted-foreground">
          <span className="font-semibold text-foreground">{totalMoveVotes}</span> {totalMoveVotes === 1 ? 'vote' : 'votes'}
        </span>
      </div>

      {/* 2-column grid options */}
      <div className="px-4 pb-4">
        <div className="grid grid-cols-2 gap-1.5">
          {visibleOptions.map((option) => {
            const percentage = totalMoveVotes > 0 ? (option.votes / totalMoveVotes) * 100 : 0;
            const isSelected = userMoveVote === option.id;
            const isLeader = option.id === leaderId;

            return (
              <button
                key={option.id}
                onClick={() => handleOptionVote(option)}
                className={cn(
                  "h-10 px-3 rounded-lg text-left transition-all duration-150 flex items-center justify-between gap-2",
                  isSelected 
                    ? "bg-primary text-primary-foreground" 
                    : isLeader
                      ? "bg-primary/10"
                      : "bg-muted/50 hover:bg-muted"
                )}
              >
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  {isSelected && (
                    <Check className="h-3.5 w-3.5 shrink-0" strokeWidth={3} />
                  )}
                  <span className={cn(
                    "text-sm truncate",
                    isSelected ? "font-semibold" : isLeader ? "font-medium text-foreground" : "text-muted-foreground"
                  )}>
                    {option.label}
                  </span>
                </div>
                
                {/* Show percentage or dots */}
                {userMoveVote ? (
                  <span className={cn(
                    "text-xs font-medium tabular-nums shrink-0",
                    isSelected ? "text-primary-foreground" : isLeader ? "text-primary" : "text-muted-foreground"
                  )}>
                    {percentage.toFixed(0)}%
                  </span>
                ) : (
                  option.votes > 0 && (
                    <DotIndicator percentage={percentage} isLeader={isLeader} />
                  )
                )}
              </button>
            );
          })}

          {/* Add option button - contextual */}
          {canShowAddButton && (
            <DropdownMenu open={showAddMenu} onOpenChange={setShowAddMenu}>
              <DropdownMenuTrigger asChild>
                <button
                  className="h-10 rounded-lg border border-dashed border-muted-foreground/30 flex items-center justify-center gap-1.5 text-muted-foreground hover:border-primary hover:text-primary transition-colors"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span className="text-xs font-medium">Add</span>
                  <ChevronDown className="h-3 w-3" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent 
                align="center" 
                className="w-48 bg-popover border shadow-lg z-50"
                sideOffset={4}
              >
                {/* Show hidden/pruned options as quick chips */}
                {hiddenOptions.length > 0 && (
                  <>
                    <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
                      Recent suggestions
                    </div>
                    {hiddenOptions.map((opt) => (
                      <DropdownMenuItem
                        key={opt.id}
                        onClick={() => handleReinstateOption(opt)}
                        className="cursor-pointer"
                      >
                        <span className="text-sm">{opt.text}</span>
                      </DropdownMenuItem>
                    ))}
                    <div className="border-t my-1" />
                  </>
                )}
                
                {/* Available fraternities */}
                {availableFrats.length > 0 && (
                  <>
                    <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
                      Add fraternity
                    </div>
                    {availableFrats.slice(0, 5).map((frat) => (
                      <DropdownMenuItem
                        key={frat.id}
                        onClick={() => handleAddFrat(frat)}
                        className="cursor-pointer"
                      >
                        <span className="text-sm">{frat.chapter || frat.name}</span>
                      </DropdownMenuItem>
                    ))}
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>
    </div>
  );
}
