import { useState, useEffect } from 'react';
import { ChevronUp, ChevronDown, MessageCircle, Send, X, CornerDownRight, Clock, MoreHorizontal, Flag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import ReportContentDialog from '@/components/moderation/ReportContentDialog';
import PollCard, { parsePollFromText } from '@/components/activity/PollCard';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import type { Post } from './PostCard';
export interface Comment {
  id: string;
  text: string;
  anonymous_name: string;
  upvotes: number;
  downvotes: number;
  created_date: string;
  user_vote?: 1 | -1 | null;
  parent_id?: string | null;
  replies?: Comment[];
}

interface ThreadViewProps {
  post: Post | null;
  comments: Comment[];
  open: boolean;
  onClose: () => void;
  onPostVote: (direction: 1 | -1) => void;
  onCommentVote: (commentId: string, direction: 1 | -1) => void;
  onAddComment: (text: string, parentId?: string) => void;
}

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

function CommentCard({ 
  comment, 
  onVote, 
  onReply, 
  onReport,
  isReply = false 
}: { 
  comment: Comment; 
  onVote: (direction: 1 | -1) => void; 
  onReply: () => void;
  onReport: () => void;
  isReply?: boolean;
}) {
  const netVotes = comment.upvotes - comment.downvotes;
  const colorGradient = getAnonymousColor(comment.anonymous_name);
  
  return (
    <div className={cn("py-3", isReply && "pl-6 border-l-2 border-muted ml-3")}>
      <div className="flex gap-3">
        <div className={cn("w-8 h-8 rounded-full bg-gradient-to-br flex items-center justify-center text-white text-xs font-bold shrink-0", colorGradient)}>
          {comment.anonymous_name.charAt(0).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-medium">{comment.anonymous_name}</span>
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {formatDistanceToNow(new Date(comment.created_date), { addSuffix: false })}
            </span>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="ml-auto p-1 rounded-full hover:bg-muted transition-colors text-muted-foreground hover:text-foreground">
                  <MoreHorizontal className="h-4 w-4" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={onReport} className="text-destructive focus:text-destructive">
                  <Flag className="h-4 w-4 mr-2" />
                  Report
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <p className="text-sm leading-relaxed text-foreground mb-2">{comment.text}</p>
          
          {/* Actions */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => onVote(1)}
              className={cn(
                "flex items-center text-xs font-medium transition-all active:scale-90",
                comment.user_vote === 1 ? "text-emerald-500" : "text-muted-foreground hover:text-emerald-500"
              )}
            >
              <ChevronUp className="h-4 w-4" />
            </button>
            <span className={cn(
              "text-xs font-bold min-w-[20px] text-center",
              netVotes > 0 ? "text-emerald-500" : netVotes < 0 ? "text-red-500" : "text-muted-foreground"
            )}>
              {netVotes > 0 ? `+${netVotes}` : netVotes}
            </span>
            <button
              onClick={() => onVote(-1)}
              className={cn(
                "flex items-center text-xs font-medium transition-all active:scale-90",
                comment.user_vote === -1 ? "text-red-500" : "text-muted-foreground hover:text-red-500"
              )}
            >
              <ChevronDown className="h-4 w-4" />
            </button>
            {!isReply && (
              <button
                onClick={onReply}
                className="flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-primary transition-all ml-2"
              >
                <CornerDownRight className="h-3 w-3" />
                Reply
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ThreadView({ 
  post, 
  comments, 
  open, 
  onClose, 
  onPostVote, 
  onCommentVote, 
  onAddComment 
}: ThreadViewProps) {
  const { user } = useAuth();
  const [commentText, setCommentText] = useState('');
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [reportingComment, setReportingComment] = useState<{ id: string; text: string } | null>(null);
  const [pollUserVote, setPollUserVote] = useState<number | null>(null);
  const [pollVoteCounts, setPollVoteCounts] = useState<Record<number, number>>({});
  
  // Check if this is a poll post
  const pollData = post ? parsePollFromText(post.text) : null;
  const isPollPost = pollData !== null;

  // Fetch poll votes
  useEffect(() => {
    if (!post || !isPollPost) return;

    const fetchPollVotes = async () => {
      const { data: votes } = await supabase
        .from('poll_votes')
        .select('option_index, user_id')
        .eq('message_id', post.id);

      if (votes) {
        const counts: Record<number, number> = {};
        votes.forEach(vote => {
          counts[vote.option_index] = (counts[vote.option_index] || 0) + 1;
        });
        setPollVoteCounts(counts);

        if (user) {
          const userVote = votes.find(v => v.user_id === user.id);
          setPollUserVote(userVote ? userVote.option_index : null);
        }
      }
    };

    fetchPollVotes();

    const channel = supabase
      .channel(`poll-votes-thread-${post.id}`)
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
  }, [post?.id, isPollPost, user]);

  const handlePollVote = async (optionIndex: number) => {
    if (!user) {
      toast.error('Sign in to vote');
      return;
    }
    if (!post) return;

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

  if (!post) return null;

  const netVotes = post.upvotes - post.downvotes;
  const colorGradient = getAnonymousColor(post.anonymous_name);

  const handleSubmit = async () => {
    if (!commentText.trim()) return;
    setSubmitting(true);
    await onAddComment(commentText.trim(), replyingTo || undefined);
    setCommentText('');
    setReplyingTo(null);
    setSubmitting(false);
  };

  // Organize comments into threads
  const topLevelComments = comments.filter(c => !c.parent_id);
  const repliesMap = new Map<string, Comment[]>();
  comments.filter(c => c.parent_id).forEach(c => {
    const existing = repliesMap.get(c.parent_id!) || [];
    existing.push(c);
    repliesMap.set(c.parent_id!, existing);
  });

  return (
    <Sheet open={open} onOpenChange={() => onClose()}>
      <SheetContent 
        side="bottom" 
        className="h-[95vh] rounded-t-3xl flex flex-col p-0"
        style={{ 
          paddingBottom: 'max(env(safe-area-inset-bottom), 0px)',
          touchAction: 'pan-y',
          overscrollBehavior: 'contain'
        }}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 bg-background border-b px-4 py-3 flex items-center gap-3 shrink-0">
          <button 
            onClick={onClose}
            className="p-2 -ml-2 rounded-full hover:bg-muted transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
          <h2 className="text-lg font-bold">Thread</h2>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-4 space-y-4">
            {/* Original post */}
            <div className="rounded-2xl bg-card p-4 shadow-duke">
              <div className="flex gap-3">
                {/* Vote column */}
                <div className="flex flex-col items-center gap-1 shrink-0">
                  <button
                    onClick={() => onPostVote(1)}
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
                    "text-sm font-bold tabular-nums",
                    netVotes > 0 ? "text-emerald-500" : netVotes < 0 ? "text-red-500" : "text-muted-foreground"
                  )}>
                    {netVotes}
                  </span>
                  <button
                    onClick={() => onPostVote(-1)}
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
                  <div className="flex items-center gap-2 mb-2">
                    <div className={cn("w-8 h-8 rounded-full bg-gradient-to-br flex items-center justify-center text-white text-sm font-bold", colorGradient)}>
                      {post.anonymous_name.charAt(0).toUpperCase()}
                    </div>
                    <span className="text-sm font-medium">{post.anonymous_name}</span>
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(post.created_date), { addSuffix: true })}
                    </span>
                  </div>
                  {isPollPost && pollData ? (
                    <div className="mt-2">
                      <PollCard
                        question={pollData.question}
                        options={pollData.options}
                        userVote={pollUserVote}
                        voteCounts={pollVoteCounts}
                        onVote={handlePollVote}
                      />
                    </div>
                  ) : (
                    <p className="text-[15px] leading-relaxed text-foreground">{post.text}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Comments section */}
            <div className="space-y-1">
              <h3 className="text-sm font-semibold text-muted-foreground px-1 mb-2">
                {comments.length} {comments.length === 1 ? 'Comment' : 'Comments'}
              </h3>
              
              {topLevelComments.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <MessageCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No comments yet. Be the first!</p>
                </div>
              ) : (
                <div className="divide-y divide-border/50">
                  {topLevelComments.map(comment => (
                    <div key={comment.id}>
                      <CommentCard
                        comment={comment}
                        onVote={(dir) => onCommentVote(comment.id, dir)}
                        onReply={() => setReplyingTo(comment.id)}
                        onReport={() => setReportingComment({ id: comment.id, text: comment.text })}
                      />
                      {/* Replies */}
                      {repliesMap.get(comment.id)?.map(reply => (
                        <CommentCard
                          key={reply.id}
                          comment={reply}
                          onVote={(dir) => onCommentVote(reply.id, dir)}
                          onReply={() => {}}
                          onReport={() => setReportingComment({ id: reply.id, text: reply.text })}
                          isReply
                        />
                      ))}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </ScrollArea>

        {/* Comment input */}
        <div className="sticky bottom-0 bg-background border-t p-4 shrink-0">
          {replyingTo && (
            <div className="flex items-center gap-2 mb-2 text-xs text-primary">
              <CornerDownRight className="h-3 w-3" />
              <span>Replying to comment</span>
              <button onClick={() => setReplyingTo(null)} className="ml-auto text-muted-foreground hover:text-foreground">
                <X className="h-3 w-3" />
              </button>
            </div>
          )}
          <div className="flex gap-2">
            <Textarea
              placeholder={replyingTo ? "Write a reply..." : "Add a comment..."}
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              className="min-h-[44px] max-h-32 resize-none rounded-xl"
              rows={1}
            />
            <Button
              onClick={handleSubmit}
              disabled={!commentText.trim() || submitting}
              size="icon"
              className="h-11 w-11 rounded-xl shrink-0 gradient-primary"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </SheetContent>

      {/* Report Dialog */}
      <ReportContentDialog
        open={!!reportingComment}
        onOpenChange={(open) => !open && setReportingComment(null)}
        contentType="chat_message"
        contentId={reportingComment?.id || ''}
        contentPreview={reportingComment?.text}
      />
    </Sheet>
  );
}
