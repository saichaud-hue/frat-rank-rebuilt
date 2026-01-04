import { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import { MessageSquare, ChevronUp, ChevronDown, Reply, Send, Smile, Meh, Frown, X, CornerDownRight, Flag, MoreHorizontal } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import ReportContentDialog from '@/components/moderation/ReportContentDialog';
import { formatTimeAgo } from '@/utils';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useRateLimit } from '@/hooks/useRateLimit';
import { commentSchema, validateInput } from '@/lib/validationSchemas';
import { 
  partyCommentQueries, 
  fraternityCommentQueries, 
  partyCommentVoteQueries, 
  fraternityCommentVoteQueries,
  getCurrentUser,
  type PartyComment,
  type FraternityComment
} from '@/lib/supabase-data';

type Comment = PartyComment | FraternityComment;

interface CommentSectionProps {
  entityId: string;
  entityType: 'party' | 'fraternity';
}

interface ReplyingTo {
  commentId: string;
  authorName: string;
  snippet?: string;
}

const sanitizeCommentText = (text: string): string => {
  return text.replace(/@[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\s*/gi, '').trim();
};

const getLegacyParentId = (text?: string | null): string | null => {
  if (!text) return null;
  const m = text.match(/^@([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\b/i);
  return m?.[1] ?? null;
};

export default function CommentSection({ entityId, entityType }: CommentSectionProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [replyingTo, setReplyingTo] = useState<ReplyingTo | null>(null);
  const [myVotesByCommentId, setMyVotesByCommentId] = useState<Record<string, 1 | -1>>({});
  const [reportingComment, setReportingComment] = useState<{ id: string; text: string } | null>(null);
  const { withRateLimit } = useRateLimit();
  
  // Lock to prevent rapid clicking from causing duplicate votes
  const votingLock = useRef<Set<string>>(new Set());

  const commentQueries = entityType === 'party' ? partyCommentQueries : fraternityCommentQueries;
  const voteQueries = entityType === 'party' ? partyCommentVoteQueries : fraternityCommentVoteQueries;

  const computeScore = useCallback((c: any) => (c?.upvotes ?? 0) - (c?.downvotes ?? 0), []);

  const sortByScoreThenNewest = useCallback((list: Comment[]) => {
    return [...list].sort((a, b) => {
      const scoreA = computeScore(a);
      const scoreB = computeScore(b);
      if (scoreB !== scoreA) return scoreB - scoreA;
      return new Date(b.created_at || '').getTime() - new Date(a.created_at || '').getTime();
    });
  }, [computeScore]);

  const loadComments = useCallback(async () => {
    try {
      let data: Comment[];
      if (entityType === 'party') {
        data = await partyCommentQueries.listByParty(entityId);
      } else {
        data = await fraternityCommentQueries.listByFraternity(entityId);
      }

      const normalized = data.map((c) => ({
        ...c,
        upvotes: c.upvotes ?? 0,
        downvotes: c.downvotes ?? 0,
      }));

      setComments(sortByScoreThenNewest(normalized));
    } catch (error) {
      console.error('Failed to load comments:', error);
    } finally {
      setLoading(false);
    }
  }, [entityId, entityType, sortByScoreThenNewest]);

  const loadMyVotes = useCallback(async () => {
    try {
      const user = await getCurrentUser();
      if (!user) return;

      const votes = await voteQueries.listByUser(user.id);

      const map: Record<string, 1 | -1> = {};
      votes.forEach((v) => {
        if (v.value === 1 || v.value === -1) {
          map[v.comment_id] = v.value;
        }
      });
      setMyVotesByCommentId(map);
    } catch (error) {
      console.error('Failed to load comment votes:', error);
    }
  }, [voteQueries]);

  useEffect(() => {
    loadComments();
    loadMyVotes();
  }, [loadComments, loadMyVotes]);

  const analyzeSentiment = (text: string): number => {
    const positiveWords = ['great', 'awesome', 'amazing', 'love', 'best', 'fun', 'good', 'excellent', 'fantastic'];
    const negativeWords = ['bad', 'terrible', 'worst', 'hate', 'boring', 'awful', 'poor', 'disappointing'];

    const lowerText = text.toLowerCase();
    let score = 0;

    positiveWords.forEach((word) => {
      if (lowerText.includes(word)) score += 0.3;
    });
    negativeWords.forEach((word) => {
      if (lowerText.includes(word)) score -= 0.3;
    });

    return Math.max(-1, Math.min(1, score));
  };

  const handleSubmitComment = async () => {
    // Validate input
    const validation = validateInput(commentSchema, { 
      text: newComment, 
      parent_comment_id: replyingTo?.commentId || null 
    });
    if (!validation.success) {
      toast.error('error' in validation ? validation.error : 'Invalid comment');
      return;
    }

    setSubmitting(true);
    
    const result = await withRateLimit('comment', async () => {
      const user = await getCurrentUser();
      if (!user) {
        toast.error('Please sign in to comment');
        return null;
      }

      const sentimentScore = analyzeSentiment(validation.data.text);

      if (entityType === 'party') {
        await partyCommentQueries.create({
          party_id: entityId,
          user_id: user.id,
          text: validation.data.text,
          parent_comment_id: replyingTo?.commentId || null,
          sentiment_score: sentimentScore,
          toxicity_label: 'safe',
          upvotes: 0,
          downvotes: 0,
          moderated: false,
        });
      } else {
        await fraternityCommentQueries.create({
          fraternity_id: entityId,
          user_id: user.id,
          text: validation.data.text,
          parent_comment_id: replyingTo?.commentId || null,
          sentiment_score: sentimentScore,
          toxicity_label: 'safe',
          upvotes: 0,
          downvotes: 0,
          moderated: false,
        });
      }
      
      return true;
    });

    if (result) {
      setNewComment('');
      setReplyingTo(null);
      await loadComments();
    }
    
    setSubmitting(false);
  };

  const handleVote = useCallback(async (commentId: string, direction: 1 | -1) => {
    // Prevent rapid clicking
    if (votingLock.current.has(commentId)) {
      return;
    }

    const user = await getCurrentUser();
    if (!user) return;

    votingLock.current.add(commentId);

    const currentVote = myVotesByCommentId[commentId] || 0;
    
    // Determine next vote using deterministic state machine
    let nextVote: number;
    if (direction === 1) {
      nextVote = currentVote === 1 ? 0 : 1;
    } else {
      nextVote = currentVote === -1 ? 0 : -1;
    }

    // Calculate delta for upvotes and downvotes
    let upvoteDelta = 0;
    let downvoteDelta = 0;
    
    if (currentVote === 1) upvoteDelta -= 1;
    if (currentVote === -1) downvoteDelta -= 1;
    if (nextVote === 1) upvoteDelta += 1;
    if (nextVote === -1) downvoteDelta += 1;

    // Optimistic update
    setComments(prev => prev.map(c => {
      if (c.id !== commentId) return c;
      return {
        ...c,
        upvotes: Math.max(0, (c.upvotes ?? 0) + upvoteDelta),
        downvotes: Math.max(0, (c.downvotes ?? 0) + downvoteDelta),
      };
    }));

    if (nextVote === 0) {
      setMyVotesByCommentId(prev => {
        const next = { ...prev };
        delete next[commentId];
        return next;
      });
    } else {
      setMyVotesByCommentId(prev => ({ ...prev, [commentId]: nextVote as 1 | -1 }));
    }

    try {
      // Update vote in database
      await voteQueries.upsert(user.id, commentId, nextVote);

      // Update comment counts in database
      const comment = comments.find(c => c.id === commentId);
      if (comment) {
        const newUpvotes = Math.max(0, (comment.upvotes ?? 0) + upvoteDelta);
        const newDownvotes = Math.max(0, (comment.downvotes ?? 0) + downvoteDelta);
        await commentQueries.update(commentId, { upvotes: newUpvotes, downvotes: newDownvotes });
      }
    } catch (error) {
      console.error('Failed to vote:', error);
      // Revert on error
      await loadComments();
      await loadMyVotes();
    } finally {
      votingLock.current.delete(commentId);
    }
  }, [comments, myVotesByCommentId, voteQueries, commentQueries, loadComments, loadMyVotes]);

  const handleStartReply = (comment: Comment) => {
    const snippet = sanitizeCommentText(comment.text ?? '').slice(0, 50);
    setReplyingTo({
      commentId: comment.id,
      authorName: 'Anonymous Duke Student',
      snippet: snippet.length < (comment.text?.length ?? 0) ? `${snippet}...` : snippet,
    });
  };

  const handleCancelReply = () => {
    setReplyingTo(null);
  };

  const getSentimentBadge = (score: number) => {
    if (score >= 0.3) {
      return (
        <Badge variant="outline" className="text-emerald-600 border-emerald-200 bg-emerald-50">
          <Smile className="h-3 w-3 mr-1" />
          Positive
        </Badge>
      );
    }
    if (score <= -0.3) {
      return (
        <Badge variant="outline" className="text-red-500 border-red-200 bg-red-50">
          <Frown className="h-3 w-3 mr-1" />
          Critical
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="text-muted-foreground">
        <Meh className="h-3 w-3 mr-1" />
        Neutral
      </Badge>
    );
  };

  const repliesByParent = useMemo(() => {
    const acc: Record<string, Comment[]> = {};

    comments.forEach((c) => {
      const explicitParent = (c as any).parent_comment_id ?? null;
      const legacyParent = !explicitParent ? getLegacyParentId(c.text) : null;
      const parentId = explicitParent || legacyParent;
      if (!parentId) return;
      if (!acc[parentId]) acc[parentId] = [];
      acc[parentId].push(c);
    });

    Object.keys(acc).forEach((parentId) => {
      acc[parentId] = sortByScoreThenNewest(acc[parentId]);
    });

    return acc;
  }, [comments, sortByScoreThenNewest]);

  const topLevelComments = useMemo(() => {
    return sortByScoreThenNewest(
      comments.filter((c) => {
        const explicitParent = (c as any).parent_comment_id ?? null;
        const legacyParent = !explicitParent ? getLegacyParentId(c.text) : null;
        return !explicitParent && !legacyParent;
      })
    );
  }, [comments, sortByScoreThenNewest]);

  const renderComment = (comment: Comment, isReply = false) => {
    const replies = repliesByParent[comment.id] || [];
    const displayText = sanitizeCommentText(comment.text ?? '');

    const upvotes = comment.upvotes ?? 0;
    const downvotes = comment.downvotes ?? 0;
    const netScore = upvotes - downvotes;

    const myVote = myVotesByCommentId[comment.id];

    return (
      <div key={comment.id} className={`space-y-2 ${isReply ? 'ml-8 border-l-2 border-muted pl-4' : ''}`}>
        <div className="p-3 rounded-lg bg-muted/30">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-gradient-to-br from-indigo-500 to-purple-500 text-white text-xs">
                  DS
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="text-sm font-medium">Anonymous Duke Student</p>
                <p className="text-xs text-muted-foreground">{formatTimeAgo(comment.created_at || '')}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {netScore !== 0 && (
                <Badge variant={netScore > 0 ? 'default' : 'destructive'} className="text-xs">
                  {netScore > 0 ? '+' : ''}{netScore}
                </Badge>
              )}
              {getSentimentBadge((comment as any).sentiment_score ?? 0)}
            </div>
          </div>

          <p className="text-sm mt-2">{displayText}</p>

          {/* Vote controls - matching posts section style */}
          <div className="flex items-center gap-3 mt-2">
            <button
              onClick={() => handleVote(comment.id, 1)}
              className={cn(
                "flex items-center text-xs font-medium transition-all active:scale-90",
                myVote === 1 ? "text-emerald-500" : "text-muted-foreground hover:text-emerald-500"
              )}
            >
              <ChevronUp className="h-4 w-4" />
            </button>
            <span className={cn(
              "text-xs font-bold min-w-[20px] text-center",
              netScore > 0 ? "text-emerald-500" : netScore < 0 ? "text-red-500" : "text-muted-foreground"
            )}>
              {netScore > 0 ? `+${netScore}` : netScore}
            </span>
            <button
              onClick={() => handleVote(comment.id, -1)}
              className={cn(
                "flex items-center text-xs font-medium transition-all active:scale-90",
                myVote === -1 ? "text-red-500" : "text-muted-foreground hover:text-red-500"
              )}
            >
              <ChevronDown className="h-4 w-4" />
            </button>

            <button
              onClick={() => handleStartReply(comment)}
              className="flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-primary transition-all ml-2"
            >
              <CornerDownRight className="h-3 w-3" />
              Reply
            </button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="p-1 rounded hover:bg-muted transition-colors ml-auto">
                  <MoreHorizontal className="h-3.5 w-3.5 text-muted-foreground" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem 
                  onClick={() => setReportingComment({ id: comment.id, text: displayText })}
                  className="text-destructive focus:text-destructive"
                >
                  <Flag className="h-3.5 w-3.5 mr-2" />
                  Report
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {replies.map((reply) => renderComment(reply, true))}
      </div>
    );
  };

  if (loading) {
    return (
      <Card className="glass p-4 space-y-4">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          <h3 className="font-semibold">Comments</h3>
        </div>
        {[1, 2, 3].map((i) => (
          <div key={i} className="space-y-2">
            <div className="flex items-center gap-2">
              <Skeleton className="h-8 w-8 rounded-full" />
              <Skeleton className="h-4 w-32" />
            </div>
            <Skeleton className="h-16 w-full" />
          </div>
        ))}
      </Card>
    );
  }

  return (
    <>
    <Card className="glass p-4 space-y-4">
      <div className="flex items-center gap-2">
        <MessageSquare className="h-5 w-5 text-primary" />
        <h3 className="font-semibold">Comments ({comments.length})</h3>
      </div>

      <div className="space-y-2">
        {replyingTo && (
          <div className="flex items-center justify-between bg-muted/50 rounded-lg px-3 py-2 text-sm">
            <div className="flex items-center gap-2">
              <Reply className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Replying to</span>
              <span className="font-medium">{replyingTo.authorName}</span>
              {replyingTo.snippet && (
                <span className="text-muted-foreground truncate max-w-[200px]">"{replyingTo.snippet}"</span>
              )}
            </div>
            <Button variant="ghost" size="sm" onClick={handleCancelReply} className="h-6 w-6 p-0">
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}

        <Textarea
          placeholder={replyingTo ? 'Write your reply...' : 'Share your thoughts...'}
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          className="resize-none"
          rows={3}
        />
        <Button onClick={handleSubmitComment} disabled={!newComment.trim() || submitting} className="gradient-primary text-white">
          <Send className="h-4 w-4 mr-2" />
          {submitting ? 'Posting...' : replyingTo ? 'Post Reply' : 'Post Comment'}
        </Button>
      </div>

      <div className="space-y-4">
        {topLevelComments.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">No comments yet. Be the first to share your thoughts!</p>
        ) : (
          topLevelComments.map((comment) => renderComment(comment))
        )}
      </div>
    </Card>

    {reportingComment && (
      <ReportContentDialog
        open={!!reportingComment}
        onOpenChange={(open) => !open && setReportingComment(null)}
        contentType={entityType === 'party' ? 'party_comment' : 'fraternity_comment'}
        contentId={reportingComment.id}
        contentPreview={reportingComment.text.slice(0, 100)}
      />
    )}
    </>
  );
}
