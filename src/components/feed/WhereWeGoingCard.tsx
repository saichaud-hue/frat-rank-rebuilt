import { useState, useMemo } from 'react';
import { Check, Plus, Zap, Users, Beer, Coffee, Moon, Sparkles, PartyPopper, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { format, isToday } from 'date-fns';
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

const defaultMoveOptions = [
  { id: 'devines', label: 'Devines', icon: Coffee },
  { id: 'shooters', label: 'Shooters', icon: Beer },
  { id: 'stay_in', label: 'Stay In', icon: Moon },
];

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
  const userMoveVote = allUserVotes[userId] || null;
  
  const moveVotes = useMemo(() => {
    const counts: Record<string, number> = {};
    Object.values(allUserVotes).forEach(optionId => {
      counts[optionId] = (counts[optionId] || 0) + 1;
    });
    return counts;
  }, [allUserVotes]);

  const totalMoveVotes = Object.keys(allUserVotes).length;

  // Get active fraternities for the dropdown (filter out ones already added)
  const availableFrats = useMemo(() => {
    const addedFratIds = new Set(customSuggestions.map(s => s.id));
    return fraternities
      .filter(f => f.status === 'active' && !addedFratIds.has(`frat-${f.id}`))
      .slice(0, 10);
  }, [fraternities, customSuggestions]);

  // Build all options sorted by votes
  const allOptions = useMemo(() => {
    const options: { id: string; type: 'party' | 'default' | 'custom'; label: string; subLabel?: string; votes: number; icon?: any }[] = [];
    
    // Add today's parties
    todaysParties.forEach(party => {
      const frat = fraternities.find(f => f.id === party.fraternity_id);
      options.push({
        id: party.id,
        type: 'party',
        label: party.title,
        subLabel: frat?.chapter ? `${frat.chapter} · ${format(new Date(party.starts_at), 'h:mm a')}` : undefined,
        votes: moveVotes[party.id] || 0,
      });
    });

    // Add default options
    defaultMoveOptions.forEach(option => {
      options.push({
        id: option.id,
        type: 'default',
        label: option.label,
        votes: moveVotes[option.id] || 0,
        icon: option.icon
      });
    });

    // Add custom suggestions (frats added by users)
    customSuggestions.forEach(suggestion => {
      options.push({
        id: suggestion.id,
        type: 'custom',
        label: suggestion.text,
        votes: moveVotes[suggestion.id] || 0
      });
    });

    // Sort by votes descending
    return options.sort((a, b) => b.votes - a.votes);
  }, [todaysParties, fraternities, moveVotes, customSuggestions]);

  const handleOptionVote = (option: typeof allOptions[0]) => {
    if (option.type === 'custom') {
      onCustomVote(option.id);
    } else {
      onVote(option.id);
    }
  };

  const handleAddFrat = (frat: Fraternity) => {
    // Add frat as a custom suggestion with a prefixed ID
    onAddSuggestion(frat.chapter || frat.name);
  };

  return (
    <div className="rounded-2xl bg-card border shadow-sm overflow-hidden">
      {/* Header - compact */}
      <div className="p-4 pb-3 flex items-center gap-3">
        <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center shadow-duke shrink-0">
          <Zap className="h-6 w-6 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-display font-black tracking-tight">Where we going?</h2>
            <Badge variant="secondary" className="text-[10px] px-2 py-0.5 bg-primary/10 text-primary border-0">
              Tonight
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground flex items-center gap-1.5">
            <Users className="h-3 w-3" />
            <span className="font-semibold text-primary">{totalMoveVotes} {totalMoveVotes === 1 ? 'person' : 'people'}</span>
            <span>voted</span>
          </p>
        </div>
        {userMoveVote && (
          <div className="w-9 h-9 rounded-full bg-positive flex items-center justify-center text-white shadow-sm">
            <Check className="h-4 w-4" strokeWidth={3} />
          </div>
        )}
      </div>

      {/* Options - compact list with fixed height container */}
      <div className="px-4 pb-4 space-y-1.5 max-h-[320px] overflow-y-auto">
        {allOptions.map((option, index) => {
          const percentage = totalMoveVotes > 0 ? (option.votes / totalMoveVotes) * 100 : 0;
          const isSelected = userMoveVote === option.id;
          const isLeading = index === 0 && option.votes > 0;
          const Icon = option.icon;

          return (
            <button
              key={option.id}
              onClick={() => handleOptionVote(option)}
              className={cn(
                "w-full h-11 px-3 rounded-xl text-left relative overflow-hidden transition-all duration-200",
                isSelected 
                  ? "bg-primary text-white" 
                  : "bg-muted/50 hover:bg-muted"
              )}
            >
              {/* Vote percentage bar */}
              {userMoveVote && percentage > 0 && !isSelected && (
                <div 
                  className="absolute inset-y-0 left-0 bg-primary/15 transition-all duration-500"
                  style={{ width: `${percentage}%` }}
                />
              )}
              
              <div className="relative flex items-center gap-2.5 h-full">
                {/* Icon indicator */}
                <div className={cn(
                  "w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-xs font-bold",
                  isSelected 
                    ? "bg-white/20 text-white" 
                    : isLeading
                      ? "bg-primary text-white"
                      : "bg-background text-muted-foreground"
                )}>
                  {isSelected ? (
                    <Check className="h-4 w-4" strokeWidth={3} />
                  ) : option.type === 'party' ? (
                    <PartyPopper className="h-3.5 w-3.5" />
                  ) : Icon ? (
                    <Icon className="h-3.5 w-3.5" />
                  ) : option.type === 'custom' ? (
                    <Sparkles className="h-3.5 w-3.5" />
                  ) : (
                    index + 1
                  )}
                </div>
                
                <div className="flex-1 min-w-0">
                  <p className={cn(
                    "font-semibold text-sm truncate leading-tight",
                    isSelected ? "text-white" : ""
                  )}>{option.label}</p>
                </div>
                
                {/* Vote stats */}
                <span className={cn(
                  "text-base font-display font-bold tabular-nums",
                  isSelected ? "text-white" : "text-foreground"
                )}>{percentage.toFixed(0)}%</span>
              </div>
            </button>
          );
        })}

        {/* Add frat dropdown */}
        {availableFrats.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className="w-full h-10 rounded-xl border-2 border-dashed border-muted-foreground/30 flex items-center justify-center gap-2 text-muted-foreground hover:border-primary hover:text-primary transition-all"
              >
                <Plus className="h-4 w-4" />
                <span className="font-medium text-sm">Add your own</span>
                <ChevronDown className="h-3.5 w-3.5" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent 
              align="center" 
              className="w-56 bg-background border shadow-lg z-50"
              sideOffset={4}
            >
              {availableFrats.map((frat) => (
                <DropdownMenuItem
                  key={frat.id}
                  onClick={() => handleAddFrat(frat)}
                  className="flex items-center gap-2 cursor-pointer"
                >
                  <Sparkles className="h-4 w-4 text-primary" />
                  <span className="font-medium">{frat.chapter || frat.name}</span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </div>
  );
}
