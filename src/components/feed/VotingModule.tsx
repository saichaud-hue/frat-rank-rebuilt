import { useState, useEffect } from 'react';
import { Check, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { fraternityQueries } from '@/lib/supabase-data';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

interface VoteOption {
  id: string;
  name: string;
  votes: number;
  userVoted: boolean;
}

export default function VotingModule() {
  const { user } = useAuth();
  const [options, setOptions] = useState<VoteOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasVoted, setHasVoted] = useState(false);

  useEffect(() => {
    loadVotingOptions();
  }, [user]);

  const loadVotingOptions = async () => {
    try {
      const frats = await fraternityQueries.listActive();
      const today = new Date().toISOString().split('T')[0];
      
      // Fetch today's votes from database
      const { data: votes, error } = await supabase
        .from('move_votes')
        .select('option_id, user_id')
        .eq('vote_date', today);
      
      if (error) throw error;

      // Count votes per option
      const voteCounts: Record<string, number> = {};
      let userVotedOptionId: string | null = null;
      
      (votes || []).forEach(vote => {
        voteCounts[vote.option_id] = (voteCounts[vote.option_id] || 0) + 1;
        if (user && vote.user_id === user.id) {
          userVotedOptionId = vote.option_id;
        }
      });

      const votingOptions: VoteOption[] = frats.slice(0, 6).map((f) => ({
        id: f.id,
        name: f.name,
        votes: voteCounts[f.id] || 0,
        userVoted: f.id === userVotedOptionId,
      }));
      
      setOptions(votingOptions);
      setHasVoted(!!userVotedOptionId);
    } catch (error) {
      console.error('Failed to load voting options:', error);
    } finally {
      setLoading(false);
    }
  };

  const totalVotes = options.reduce((sum, o) => sum + o.votes, 0);

  const handleVote = async (optionId: string) => {
    if (hasVoted || !user) return;
    
    const option = options.find(o => o.id === optionId);
    if (!option) return;

    // Optimistically update UI
    setOptions(prev => prev.map(o => ({
      ...o,
      votes: o.id === optionId ? o.votes + 1 : o.votes,
      userVoted: o.id === optionId,
    })));
    setHasVoted(true);

    try {
      const { error } = await supabase
        .from('move_votes')
        .insert({
          user_id: user.id,
          option_id: optionId,
          option_name: option.name,
        });

      if (error) {
        console.error('Failed to save vote:', error);
        // Revert on error
        loadVotingOptions();
      }
    } catch (error) {
      console.error('Failed to save vote:', error);
      loadVotingOptions();
    }
  };

  if (loading) {
    return (
      <div className="bg-card rounded-2xl p-4 animate-pulse">
        <div className="h-5 bg-muted rounded w-48 mb-3" />
        <div className="grid grid-cols-2 gap-2">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-10 bg-muted rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-2xl p-4 shadow-duke">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-bold text-foreground">Where are we going tonight?</h3>
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Users className="h-3 w-3" />
          <span>{totalVotes} vote{totalVotes !== 1 ? 's' : ''}</span>
        </div>
      </div>

      {!user && (
        <p className="text-xs text-muted-foreground mb-3">Sign in to vote</p>
      )}

      <div className="grid grid-cols-2 gap-2">
        {options.map(option => {
          const percentage = totalVotes > 0 ? Math.round((option.votes / totalVotes) * 100) : 0;
          const isLeading = option.votes === Math.max(...options.map(o => o.votes)) && option.votes > 0;
          
          return (
            <button
              key={option.id}
              onClick={() => handleVote(option.id)}
              disabled={hasVoted || !user}
              className={cn(
                "relative overflow-hidden rounded-xl px-3 py-2.5 text-left transition-all",
                "border",
                option.userVoted 
                  ? "border-primary bg-primary/10" 
                  : hasVoted 
                    ? "border-border bg-muted/50" 
                    : "border-border bg-background hover:border-primary/50 active:scale-[0.98]",
                isLeading && hasVoted && "border-primary",
                !user && "opacity-60"
              )}
            >
              {/* Progress bar background */}
              {hasVoted && (
                <div 
                  className={cn(
                    "absolute inset-0 transition-all duration-500",
                    isLeading ? "bg-primary/15" : "bg-muted/50"
                  )}
                  style={{ width: `${percentage}%` }}
                />
              )}
              
              <div className="relative flex items-center justify-between gap-2">
                <span className={cn(
                  "text-xs font-medium truncate",
                  option.userVoted ? "text-primary" : "text-foreground"
                )}>
                  {option.name}
                </span>
                <div className="flex items-center gap-1 shrink-0">
                  {option.userVoted && <Check className="h-3 w-3 text-primary" />}
                  {hasVoted && (
                    <span className={cn(
                      "text-xs font-bold tabular-nums",
                      isLeading ? "text-primary" : "text-muted-foreground"
                    )}>
                      {percentage}%
                    </span>
                  )}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
