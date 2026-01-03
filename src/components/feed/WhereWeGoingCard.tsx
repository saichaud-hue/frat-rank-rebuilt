import { useState, useMemo } from 'react';
import { Check, Plus, X, Zap, Users, Beer, Coffee, Moon, Sparkles, PartyPopper } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
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
  const [showSuggestionInput, setShowSuggestionInput] = useState(false);
  const [suggestionText, setSuggestionText] = useState('');

  const userMoveVote = allUserVotes[userId] || null;
  
  const moveVotes = useMemo(() => {
    const counts: Record<string, number> = {};
    Object.values(allUserVotes).forEach(optionId => {
      counts[optionId] = (counts[optionId] || 0) + 1;
    });
    return counts;
  }, [allUserVotes]);

  const totalMoveVotes = Object.keys(allUserVotes).length;

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

    // Add custom suggestions
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

  const handleAddSuggestion = () => {
    if (!suggestionText.trim()) return;
    onAddSuggestion(suggestionText.trim());
    setSuggestionText('');
    setShowSuggestionInput(false);
  };

  const handleOptionVote = (option: typeof allOptions[0]) => {
    if (option.type === 'custom') {
      onCustomVote(option.id);
    } else {
      onVote(option.id);
    }
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
              {isToday(new Date()) && new Date().getHours() >= 17 ? 'Tonight' : 'Tonight'}
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

      {/* Options - compact list */}
      <div className="px-4 pb-4 space-y-2">
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
                "w-full min-h-[52px] px-3 py-2.5 rounded-xl text-left relative overflow-hidden transition-all duration-200",
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
              
              <div className="relative flex items-center gap-3">
                {/* Rank/Check indicator */}
                <div className={cn(
                  "w-10 h-10 rounded-lg flex items-center justify-center shrink-0 font-display font-bold text-sm",
                  isSelected 
                    ? "bg-white/20 text-white" 
                    : isLeading
                      ? "bg-primary text-white"
                      : "bg-background text-muted-foreground"
                )}>
                  {isSelected ? (
                    <Check className="h-5 w-5" strokeWidth={3} />
                  ) : option.type === 'party' ? (
                    <PartyPopper className="h-4 w-4" />
                  ) : Icon ? (
                    <Icon className="h-4 w-4" />
                  ) : option.type === 'custom' ? (
                    <Sparkles className="h-4 w-4" />
                  ) : (
                    index + 1
                  )}
                </div>
                
                <div className="flex-1 min-w-0">
                  <p className={cn(
                    "font-semibold text-sm truncate",
                    isSelected ? "text-white" : ""
                  )}>{option.label}</p>
                  {option.subLabel && (
                    <p className={cn(
                      "text-xs truncate",
                      isSelected ? "text-white/70" : "text-muted-foreground"
                    )}>{option.subLabel}</p>
                  )}
                </div>
                
                {/* Vote stats */}
                <span className={cn(
                  "text-lg font-display font-bold tabular-nums",
                  isSelected ? "text-white" : "text-foreground"
                )}>{percentage.toFixed(0)}%</span>
              </div>
            </button>
          );
        })}

        {/* Add custom suggestion */}
        {showSuggestionInput ? (
          <div className="flex gap-2">
            <Input
              value={suggestionText}
              onChange={(e) => setSuggestionText(e.target.value)}
              placeholder="Add your own..."
              className="flex-1 h-10 rounded-lg text-sm"
              onKeyDown={(e) => e.key === 'Enter' && handleAddSuggestion()}
              autoFocus
            />
            <Button
              onClick={handleAddSuggestion}
              disabled={!suggestionText.trim()}
              size="sm"
              className="h-10 w-10 rounded-lg gradient-primary"
            >
              <Check className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => { setShowSuggestionInput(false); setSuggestionText(''); }}
              className="h-10 w-10 rounded-lg"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <button
            onClick={() => setShowSuggestionInput(true)}
            className="w-full min-h-[44px] p-3 rounded-xl border-2 border-dashed border-muted-foreground/30 flex items-center justify-center gap-2 text-muted-foreground hover:border-primary hover:text-primary transition-all"
          >
            <Plus className="h-4 w-4" />
            <span className="font-medium text-sm">Add your own</span>
          </button>
        )}
      </div>
    </div>
  );
}
