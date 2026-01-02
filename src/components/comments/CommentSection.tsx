import { useCallback, useEffect, useMemo, useState } from 'react';
import { MessageSquare, ThumbsUp, ThumbsDown, Reply, Send, Smile, Meh, Frown, X } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { formatTimeAgo } from '@/utils';
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
    if (!newComment.trim()) return;

    setSubmitting(true);
    try {
      const user = await getCurrentUser();
      if (!user) return;

      const sentimentScore = analyzeSentiment(newComment);

      if (entityType === 'party') {
        await partyCommentQueries.create({
          party_id: entityId,
          user_id: user.id,
          text: newComment.trim(),
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
          text: newComment.trim(),
          parent_comment_id: replyingTo?.commentId || null,
          sentiment_score: sentimentScore,
          toxicity_label: 'safe',
          upvotes: 0,
          downvotes: 0,
          moderated: false,
        });
      }

      setNewComment('');
      setReplyingTo(null);
      await loadComments();
    } catch (error) {
      console.error('Failed to submit comment:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleVote = useCallback(async (commentId: string, value: 1 | -1) => {
    try {
      const user = await getCurrentUser();
      if (!user) return;

      const currentVote = myVotesByCommentId[commentId];
      const newVote = currentVote === value ? 0 : value;

      await voteQueries.upsert(user.id, commentId, newVote);

      if (newVote === 0) {
        setMyVotesByCommentId((prev) => {
          const next = { ...prev };
          delete next[commentId];
          return next;
        });
      } else {
        setMyVotesByCommentId((prev) => ({ ...prev, [commentId]: newVote as 1 | -1 }));
      }

      // Update comment counts
      const comment = comments.find(c => c.id === commentId);
      if (comment) {
        let upvotes = comment.upvotes ?? 0;
        let downvotes = comment.downvotes ?? 0;
        
        if (currentVote === 1) upvotes--;
        if (currentVote === -1) downvotes--;
        if (newVote === 1) upvotes++;
        if (newVote === -1) downvotes++;

        await commentQueries.update(commentId, { upvotes, downvotes });
      }

      await loadComments();
    } catch (error) {
      console.error('Failed to vote:', error);
    }
  }, [comments, myVotesByCommentId, voteQueries, commentQueries, loadComments]);

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

          <div className="flex items-center gap-2 mt-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleVote(comment.id, 1)}
              className={`h-8 text-xs ${myVote === 1 ? 'text-emerald-600 bg-emerald-50' : ''}`}
            >
              <ThumbsUp className="h-3.5 w-3.5 mr-1" />
              {upvotes}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleVote(comment.id, -1)}
              className={`h-8 text-xs ${myVote === -1 ? 'text-red-500 bg-red-50' : ''}`}
            >
              <ThumbsDown className="h-3.5 w-3.5 mr-1" />
              {downvotes}
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleStartReply(comment)}
              className="h-8 text-xs"
            >
              <Reply className="h-3.5 w-3.5 mr-1" />
              Reply
            </Button>
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
  );
}
