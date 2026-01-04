import { useState, useEffect } from 'react';
import { ChevronUp, ChevronDown, MessageCircle, Flame, Clock, TrendingUp, Flag, MoreHorizontal, Trophy, Crown, ChevronRight } from 'lucide-react';
import PollCard, { parsePollFromText } from '@/components/activity/PollCard';
import UserLevelBadge from '@/components/feed/UserLevelBadge';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import ReportContentDialog from '@/components/moderation/ReportContentDialog';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface Post {
  id: string;
  text: string;
  anonymous_name: string;
  user_id: string;
  user_points?: number;
  upvotes: number;
  downvotes: number;
  comment_count: number;
  created_date: string;
  user_vote?: 1 | -1 | null;
  is_hot?: boolean;
}

interface PostCardProps {
  post: Post;
  onUpvote: () => void;
  onDownvote: () => void;
  onOpenThread: () => void;
  isLeading?: boolean;
}

// Generate consistent anonymous name from post id
const getAnonymousColor = (name: string) => {
  const colors = [
    'from-blue-500 to-indigo-600',
    'from-purple-500 to-pink-600',
    'from-emerald-500 to-teal-600',
    'from-orange-500 to-red-600',
    'from-cyan-500 to-blue-600',
    'from-rose-500 to-pink-600',
    'from-amber-500 to-orange-600',
    'from-lime-500 to-green-600',
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
};

// Tier colors for ranking graphic
const TIER_COLORS = [
  { bg: 'bg-gradient-to-r from-amber-400 to-amber-500', text: 'text-amber-900' }, // 1st - Gold
  { bg: 'bg-gradient-to-r from-slate-300 to-slate-400', text: 'text-slate-800' }, // 2nd - Silver
  { bg: 'bg-gradient-to-r from-amber-600 to-amber-700', text: 'text-amber-100' }, // 3rd - Bronze
  { bg: 'bg-gradient-to-r from-emerald-500 to-emerald-600', text: 'text-white' }, // 4th
  { bg: 'bg-gradient-to-r from-blue-500 to-blue-600', text: 'text-white' }, // 5th
];

// Parse ranking post text
const parseRankingPost = (text: string): { tier: string; frat: string }[] | null => {
  if (!text.includes('🏆') && !text.toLowerCase().includes('my frat ranking')) return null;
  
  const lines = text.split('\n').slice(1); // Skip the header line
  const rankings: { tier: string; frat: string }[] = [];
  
  for (const line of lines) {
    const match = line.match(/^(.+?):\s*(.+)$/);
    if (match) {
      rankings.push({ tier: match[1].trim(), frat: match[2].trim() });
    }
  }
  
  return rankings.length > 0 ? rankings : null;
};

export default function PostCard({ post, onUpvote, onDownvote, onOpenThread, isLeading }: PostCardProps) {
  const { user } = useAuth();
  const [showReportDialog, setShowReportDialog] = useState(false);
  const [showAllRankings, setShowAllRankings] = useState(false);
  const [pollUserVote, setPollUserVote] = useState<number | null>(null);
  const [pollVoteCounts, setPollVoteCounts] = useState<Record<number, number>>({});
  const netVotes = post.upvotes - post.downvotes;
  const isHot = post.is_hot || netVotes >= 5;
  const colorGradient = getAnonymousColor(post.anonymous_name);
  
  // Check if this is a ranking post
  const rankings = parseRankingPost(post.text);
  const isRankingPost = rankings && rankings.length > 0;
  const displayedRankings = showAllRankings ? rankings : rankings?.slice(0, 5);
  
  // Check if this is a poll post
  const pollData = parsePollFromText(post.text);
  const isPollPost = pollData !== null;

  // Fetch poll votes
  useEffect(() => {
    if (!isPollPost) return;

    const fetchPollVotes = async () => {
      // Fetch all votes for this poll
      const { data: votes } = await supabase
        .from('poll_votes')
        .select('option_index, user_id')
        .eq('message_id', post.id);

      if (votes) {
        // Calculate vote counts
        const counts: Record<number, number> = {};
        votes.forEach(vote => {
          counts[vote.option_index] = (counts[vote.option_index] || 0) + 1;
        });
        setPollVoteCounts(counts);

        // Check if current user voted
        if (user) {
          const userVote = votes.find(v => v.user_id === user.id);
          setPollUserVote(userVote ? userVote.option_index : null);
        }
      }
    };

    fetchPollVotes();

    // Subscribe to realtime updates
    const channel = supabase
      .channel(`poll-votes-${post.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'poll_votes',
          filter: `message_id=eq.${post.id}`
        },
        () => {
          // Refetch votes on any change
          fetchPollVotes();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [post.id, isPollPost, user]);

  const handlePollVote = async (optionIndex: number) => {
    if (!user) {
      toast.error('Sign in to vote');
      return;
    }

    // If clicking the same option, remove vote
    if (pollUserVote === optionIndex) {
      setPollVoteCounts(prev => ({
        ...prev,
        [optionIndex]: Math.max(0, (prev[optionIndex] || 0) - 1)
      }));
      setPollUserVote(null);

      const { error } = await supabase
        .from('poll_votes')
        .delete()
        .eq('message_id', post.id)
        .eq('user_id', user.id);

      if (error) {
        toast.error('Failed to remove vote');
      }
      return;
    }

    // If changing vote, update counts optimistically
    if (pollUserVote !== null) {
      setPollVoteCounts(prev => ({
        ...prev,
        [pollUserVote]: Math.max(0, (prev[pollUserVote] || 0) - 1),
        [optionIndex]: (prev[optionIndex] || 0) + 1
      }));
    } else {
      setPollVoteCounts(prev => ({
        ...prev,
        [optionIndex]: (prev[optionIndex] || 0) + 1
      }));
    }
    setPollUserVote(optionIndex);

    if (pollUserVote !== null) {
      // Update existing vote
      const { error } = await supabase
        .from('poll_votes')
        .update({ option_index: optionIndex })
        .eq('message_id', post.id)
        .eq('user_id', user.id);

      if (error) {
        toast.error('Failed to change vote');
      }
    } else {
      // Insert new vote
      const { error } = await supabase
        .from('poll_votes')
        .insert({
          message_id: post.id,
          user_id: user.id,
          option_index: optionIndex
        });

      if (error) {
        if (error.code === '23505') {
          toast.error('You already voted on this poll');
        } else {
          toast.error('Failed to vote');
        }
      }
    }
  };
  
  return (
    <>
    <button
      onClick={onOpenThread}
      className={cn(
        "w-full text-left rounded-2xl bg-card p-4 transition-all duration-200",
        "active:scale-[0.98] hover:shadow-xl",
        isLeading && "animate-float shadow-2xl",
        isHot ? "shadow-lg" : "shadow-duke"
      )}
    >
      <div className="flex gap-3">
        {/* Vote column */}
        <div className="flex flex-col items-center gap-1 shrink-0">
          <button
            onClick={(e) => { e.stopPropagation(); onUpvote(); }}
            className={cn(
              "w-10 h-10 rounded-xl flex items-center justify-center transition-all active:scale-90",
              post.user_vote === 1 
                ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/30" 
                : "bg-muted hover:bg-emerald-500/20 text-muted-foreground hover:text-emerald-500"
            )}
          >
            <ChevronUp className="h-5 w-5" />
          </button>
          <span className={cn(
            "text-sm font-bold tabular-nums min-w-[24px] text-center",
            netVotes > 0 ? "text-emerald-500" : netVotes < 0 ? "text-red-500" : "text-muted-foreground"
          )}>
            {netVotes}
          </span>
          <button
            onClick={(e) => { e.stopPropagation(); onDownvote(); }}
            className={cn(
              "w-10 h-10 rounded-xl flex items-center justify-center transition-all active:scale-90",
              post.user_vote === -1 
                ? "bg-red-500 text-white shadow-lg shadow-red-500/30" 
                : "bg-muted hover:bg-red-500/20 text-muted-foreground hover:text-red-500"
            )}
          >
            <ChevronDown className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Anonymous name + badges */}
          <div className="flex items-center gap-2 mb-2">
            <div className={cn("w-6 h-6 rounded-full bg-gradient-to-br flex items-center justify-center text-white text-xs font-bold", colorGradient)}>
              {post.anonymous_name.charAt(0).toUpperCase()}
            </div>
            <span className="text-sm font-medium text-foreground">{post.anonymous_name}</span>
            <span className="text-xs text-muted-foreground">•</span>
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {formatDistanceToNow(new Date(post.created_date), { addSuffix: false })}
            </span>
            {isHot && (
              <span className="ml-auto flex items-center gap-1 text-xs font-semibold text-orange-500 animate-pulse-subtle">
                <Flame className="h-3.5 w-3.5" />
                Hot
              </span>
            )}
            {isLeading && !isHot && (
              <span className="ml-auto flex items-center gap-1 text-xs font-semibold text-primary animate-pulse-subtle">
                <TrendingUp className="h-3.5 w-3.5" />
                Trending
              </span>
            )}
          </div>

          {/* Ranking Post Graphic */}
          {isRankingPost && displayedRankings ? (
            <div className="mb-3">
              {/* Ranking Header */}
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center">
                  <Trophy className="h-4 w-4 text-white" />
                </div>
                <span className="font-bold text-sm">Frat Ranking</span>
              </div>
              
              {/* Ranking List */}
              <div className="space-y-1.5">
                {displayedRankings.map((item, idx) => {
                  const tierColor = TIER_COLORS[idx] || { bg: 'bg-muted', text: 'text-foreground' };
                  return (
                    <div 
                      key={idx}
                      className={cn(
                        "flex items-center gap-2 p-2 rounded-lg",
                        tierColor.bg
                      )}
                    >
                      <div className={cn(
                        "w-6 h-6 rounded-full bg-white/20 flex items-center justify-center font-bold text-xs",
                        tierColor.text
                      )}>
                        {idx === 0 ? <Crown className="h-3.5 w-3.5" /> : idx + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={cn("font-semibold text-sm truncate", tierColor.text)}>
                          {item.frat}
                        </p>
                        <p className={cn("text-xs opacity-80", tierColor.text)}>
                          {item.tier}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
              
              {/* See All Button */}
              {rankings && rankings.length > 5 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowAllRankings(!showAllRankings);
                  }}
                  className="w-full mt-2 py-2 text-sm font-medium text-primary hover:bg-primary/5 rounded-lg flex items-center justify-center gap-1 transition-colors"
                >
                  {showAllRankings ? 'Show Less' : `See All ${rankings.length} Rankings`}
                  <ChevronRight className={cn("h-4 w-4 transition-transform", showAllRankings && "rotate-90")} />
                </button>
              )}
            </div>
          ) : isPollPost && pollData ? (
            /* Poll Post Graphic */
            <div className="mb-3" onClick={(e) => e.stopPropagation()}>
              <PollCard
                question={pollData.question}
                options={pollData.options}
                userVote={pollUserVote}
                voteCounts={pollVoteCounts}
                onVote={handlePollVote}
                compact
              />
            </div>
          ) : (
            /* Regular Post text */
            <p className="text-[15px] leading-relaxed text-foreground line-clamp-4 mb-3">
              {post.text}
            </p>
          )}

          {/* Comment count and actions */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 text-muted-foreground">
              <div className="flex items-center gap-2">
                <MessageCircle className="h-4 w-4" />
                <span className="text-sm font-medium">
                  {post.comment_count} {post.comment_count === 1 ? 'comment' : 'comments'}
                </span>
              </div>
              <UserLevelBadge points={post.user_points || 0} compact />
            </div>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button 
                  onClick={(e) => e.stopPropagation()}
                  className="p-1.5 rounded-lg hover:bg-muted transition-colors"
                >
                  <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                <DropdownMenuItem 
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowReportDialog(true);
                  }}
                  className="text-destructive focus:text-destructive"
                >
                  <Flag className="h-4 w-4 mr-2" />
                  Report
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </button>

    <ReportContentDialog
      open={showReportDialog}
      onOpenChange={setShowReportDialog}
      contentType="chat_message"
      contentId={post.id}
      contentPreview={post.text.slice(0, 100)}
    />
    </>
  );
}
