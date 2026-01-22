import { useState, useMemo } from 'react';
import { Check, Plus, Zap, ChevronDown, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import type { Party, Fraternity } from '@/lib/supabase-data';

interface WhereWeGoingCardProps {
  todaysParties: Party[];
  fraternities: Fraternity[];
  voteCounts: Record<string, number>;
  userVote: string | null;
  onVote: (optionId: string) => void;
  onCustomVote: (optionId: string) => void;
  onAddSuggestion: (text: string) => void;
  customSuggestions: { id: string; text: string }[];
}

// Core options that always show (even with 0 votes)
const CORE_OPTIONS = ['devines', 'shooters', 'stay_in'];
const MAX_COVER_OPTIONS = 4;

const defaultMoveOptions = [
  { id: 'devines', label: 'Devines' },
  { id: 'shooters', label: 'Shooters' },
  { id: 'stay_in', label: 'Stay In' },
];

export default function WhereWeGoingCard({
  todaysParties,
  fraternities,
  voteCounts,
  userVote,
  onVote,
  onCustomVote,
  onAddSuggestion,
  customSuggestions,
}: WhereWeGoingCardProps) {
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [showAllSheet, setShowAllSheet] = useState(false);
  const [customInput, setCustomInput] = useState('');
  const userMoveVote = userVote;
  
  const moveVotes = voteCounts;

  const totalMoveVotes = useMemo(() => {
    return Object.values(voteCounts).reduce((sum, count) => sum + count, 0);
  }, [voteCounts]);

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

    // Add custom suggestions
    customSuggestions.forEach(suggestion => {
      const votes = moveVotes[suggestion.id] || 0;
      options.push({
        id: suggestion.id,
        type: 'custom',
        label: suggestion.text,
        votes,
        isCore: false,
      });
    });

    return options;
  }, [todaysParties, moveVotes, customSuggestions]);

  // Get top 3 options by votes for cover display
  const coverOptions = useMemo(() => {
    const sorted = [...allOptions].sort((a, b) => b.votes - a.votes);
    // Always show core options if they have votes, or top voted ones
    const withVotes = sorted.filter(opt => opt.votes > 0);
    const coreWithNoVotes = allOptions.filter(opt => opt.isCore && opt.votes === 0);
    
    // If we have voted options, show top 3 by votes
    if (withVotes.length >= MAX_COVER_OPTIONS) {
      return withVotes.slice(0, MAX_COVER_OPTIONS);
    }
    
    // Otherwise fill with core options
    return [...withVotes, ...coreWithNoVotes].slice(0, MAX_COVER_OPTIONS);
  }, [allOptions]);

  // All options sorted by votes for the sheet
  const allOptionsSorted = useMemo(() => {
    return [...allOptions].sort((a, b) => b.votes - a.votes);
  }, [allOptions]);

  // Find leader
  const leaderId = coverOptions.length > 0 && coverOptions[0].votes > 0 ? coverOptions[0].id : null;

  const handleOptionVote = (option: typeof allOptions[0]) => {
    if (option.type === 'custom') {
      onCustomVote(option.id);
    } else {
      onVote(option.id);
    }
  };

  const handleAddCustom = () => {
    const trimmed = customInput.trim();
    if (trimmed && trimmed.length <= 50) {
      onAddSuggestion(trimmed);
      setCustomInput('');
      setShowAddMenu(false);
    }
  };

  const hasMoreOptions = allOptions.length > MAX_COVER_OPTIONS;

  return (
    <>
      <div data-tutorial="where-going" className="rounded-2xl bg-card border shadow-sm overflow-hidden">
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

        {/* Top 3 options */}
        <div className="px-4 pb-3">
          <div className="space-y-1.5">
            {coverOptions.map((option) => {
              const percentage = totalMoveVotes > 0 ? (option.votes / totalMoveVotes) * 100 : 0;
              const isSelected = userMoveVote === option.id;
              const isLeader = option.id === leaderId;

              return (
                <button
                  key={option.id}
                  onClick={() => handleOptionVote(option)}
                  className={cn(
                    "w-full h-11 px-4 rounded-xl text-left transition-all duration-150 flex items-center justify-between gap-2",
                    isSelected 
                      ? "bg-primary text-primary-foreground" 
                      : isLeader
                        ? "bg-primary/10"
                        : "bg-muted/50 hover:bg-muted"
                  )}
                >
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    {isSelected && (
                      <Check className="h-4 w-4 shrink-0" strokeWidth={3} />
                    )}
                    <span className={cn(
                      "text-sm truncate",
                      isSelected ? "font-semibold" : isLeader ? "font-medium text-foreground" : "text-muted-foreground"
                    )}>
                      {option.label}
                    </span>
                  </div>
                  
                  {userMoveVote && (
                    <span className={cn(
                      "text-xs font-medium tabular-nums shrink-0",
                      isSelected ? "text-primary-foreground" : isLeader ? "text-primary" : "text-muted-foreground"
                    )}>
                      {percentage.toFixed(0)}%
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Actions row */}
        <div className="px-4 pb-4 flex items-center gap-2">
          {/* Add custom option */}
          <DropdownMenu open={showAddMenu} onOpenChange={setShowAddMenu}>
            <DropdownMenuTrigger asChild>
              <button
                data-tutorial="add-option"
                className="flex-1 h-10 rounded-xl border border-dashed border-muted-foreground/30 flex items-center justify-center gap-1.5 text-muted-foreground hover:border-primary hover:text-primary transition-colors"
              >
                <Plus className="h-4 w-4" />
                <span className="text-xs font-medium">Add Option</span>
                <ChevronDown className="h-3 w-3" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent 
              align="center" 
              className="w-64 bg-popover border shadow-lg z-50 p-2"
              sideOffset={4}
            >
              <div className="space-y-2">
                <div className="text-xs font-medium text-muted-foreground px-1">
                  Add your own suggestion
                </div>
                <div className="flex gap-2">
                  <Input
                    placeholder="Where to?"
                    value={customInput}
                    onChange={(e) => setCustomInput(e.target.value.slice(0, 50))}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddCustom()}
                    className="h-9 text-sm"
                    maxLength={50}
                  />
                  <Button
                    size="sm"
                    onClick={handleAddCustom}
                    disabled={!customInput.trim()}
                    className="h-9 px-3"
                  >
                    Add
                  </Button>
                </div>
                <div className="text-[10px] text-muted-foreground px-1">
                  {customInput.length}/50 characters
                </div>
              </div>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* See All button */}
          {hasMoreOptions && (
            <button
              onClick={() => setShowAllSheet(true)}
              className="h-10 px-4 rounded-xl bg-muted/50 hover:bg-muted flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              See All
              <ChevronRight className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* See All Sheet */}
      <Sheet open={showAllSheet} onOpenChange={setShowAllSheet}>
        <SheetContent side="bottom" className="h-[80vh] rounded-t-3xl">
          <SheetHeader className="pb-4">
            <SheetTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-primary" />
              All Options Tonight
            </SheetTitle>
          </SheetHeader>
          
          <div className="space-y-2 overflow-y-auto max-h-[calc(80vh-100px)] pb-8">
            {allOptionsSorted.map((option, index) => {
              const percentage = totalMoveVotes > 0 ? (option.votes / totalMoveVotes) * 100 : 0;
              const isSelected = userMoveVote === option.id;
              const isLeader = index === 0 && option.votes > 0;

              return (
                <button
                  key={option.id}
                  onClick={() => {
                    handleOptionVote(option);
                  }}
                  className={cn(
                    "w-full h-14 px-4 rounded-xl text-left transition-all duration-150 flex items-center justify-between gap-3",
                    isSelected 
                      ? "bg-primary text-primary-foreground" 
                      : isLeader
                        ? "bg-primary/10 border-2 border-primary/30"
                        : "bg-muted/50 hover:bg-muted"
                  )}
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <span className={cn(
                      "text-xs font-bold w-6 text-center",
                      isSelected ? "text-primary-foreground" : "text-muted-foreground"
                    )}>
                      #{index + 1}
                    </span>
                    {isSelected && (
                      <Check className="h-4 w-4 shrink-0" strokeWidth={3} />
                    )}
                    <span className={cn(
                      "text-sm truncate",
                      isSelected ? "font-semibold" : isLeader ? "font-medium text-foreground" : ""
                    )}>
                      {option.label}
                    </span>
                    {option.type === 'custom' && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground shrink-0">
                        Custom
                      </span>
                    )}
                  </div>
                  
                  {userMoveVote && (
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={cn(
                        "text-xs font-medium",
                        isSelected ? "text-primary-foreground" : "text-muted-foreground"
                      )}>
                        {option.votes} {option.votes === 1 ? 'vote' : 'votes'}
                      </span>
                      <span className={cn(
                        "text-sm font-bold tabular-nums w-12 text-right",
                        isSelected ? "text-primary-foreground" : isLeader ? "text-primary" : "text-muted-foreground"
                      )}>
                        {percentage.toFixed(0)}%
                      </span>
                    </div>
                  )}
                </button>
              );
            })}

            {/* Add new in sheet */}
            <div className="pt-4 border-t border-border/50 mt-4">
              <div className="text-xs font-medium text-muted-foreground mb-2">
                Add your own suggestion
              </div>
              <div className="flex gap-2">
                <Input
                  placeholder="Where to?"
                  value={customInput}
                  onChange={(e) => setCustomInput(e.target.value.slice(0, 50))}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleAddCustom();
                      setShowAllSheet(false);
                    }
                  }}
                  className="h-11"
                  maxLength={50}
                />
                <Button
                  onClick={() => {
                    handleAddCustom();
                    setShowAllSheet(false);
                  }}
                  disabled={!customInput.trim()}
                  className="h-11 px-4"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add
                </Button>
              </div>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}

