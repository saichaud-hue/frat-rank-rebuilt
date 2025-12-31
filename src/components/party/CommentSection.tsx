import { useState, useEffect, useCallback } from 'react';
import { MessageSquare, ThumbsUp, ThumbsDown, Reply, Send, Smile, Meh, Frown, X } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { base44, type PartyComment, type PartyCommentVote } from '@/api/base44Client';
import { formatTimeAgo } from '@/utils';
import { recordUserAction } from '@/utils/streak';

interface CommentSectionProps {
  partyId: string;
}

interface ReplyingTo {
  commentId: string;
  authorName: string;
  snippet?: string;
}

// Strip any @<uuid> patterns from text (cleanup for legacy data)
const sanitizeCommentText = (text: string): string => {
  return text.replace(/@[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\s*/gi, '').trim();
};

export default function CommentSection({ partyId }: CommentSectionProps) {
  const [comments, setComments] = useState<PartyComment[]>([]);
  const [userVotes, setUserVotes] = useState<Record<string, 1 | -1>>({});
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [replyingTo, setReplyingTo] = useState<ReplyingTo | null>(null);

  const loadComments = useCallback(async () => {
    try {
      const data = await base44.entities.PartyComment.filter({ party_id: partyId });
      
      // Sort by score (upvotes - downvotes) desc, then by created_date desc
      const sorted = data.sort((a, b) => {
        const scoreA = (a.upvotes || 0) - (a.downvotes || 0);
        const scoreB = (b.upvotes || 0) - (b.downvotes || 0);
        if (scoreB !== scoreA) return scoreB - scoreA;
        return new Date(b.created_date).getTime() - new Date(a.created_date).getTime();
      });
      
      setComments(sorted);
    } catch (error) {
      console.error('Failed to load comments:', error);
    } finally {
      setLoading(false);
    }
  }, [partyId]);

  const loadUserVotes = useCallback(async () => {
    try {
      const user = await base44.auth.me();
      if (!user) return;

      const votes = await base44.entities.PartyCommentVote.filter({
        party_id: partyId,
        user_id: user.id,
      });

      const votesMap: Record<string, 1 | -1> = {};
      votes.forEach((vote) => {
        votesMap[vote.comment_id] = vote.value;
      });
      setUserVotes(votesMap);
    } catch (error) {
      console.error('Failed to load user votes:', error);
    }
  }, [partyId]);

  useEffect(() => {
    loadComments();
    loadUserVotes();
  }, [loadComments, loadUserVotes]);

  const analyzeSentiment = (text: string): number => {
    const positiveWords = ['great', 'awesome', 'amazing', 'love', 'best', 'fun', 'good', 'excellent', 'fantastic'];
    const negativeWords = ['bad', 'terrible', 'worst', 'hate', 'boring', 'awful', 'poor', 'disappointing'];
    
    const lowerText = text.toLowerCase();
    let score = 0;
    
    positiveWords.forEach(word => {
      if (lowerText.includes(word)) score += 0.3;
    });
    negativeWords.forEach(word => {
      if (lowerText.includes(word)) score -= 0.3;
    });
    
    return Math.max(-1, Math.min(1, score));
  };

  const handleSubmitComment = async () => {
    if (!newComment.trim()) return;
    
    setSubmitting(true);
    try {
      const user = await base44.auth.me();
      if (!user) return;

      const sentimentScore = analyzeSentiment(newComment);
      
      await base44.entities.PartyComment.create({
        party_id: partyId,
        user_id: user.id,
        text: newComment.trim(),
        parent_comment_id: replyingTo?.commentId || null,
        sentiment_score: sentimentScore,
        toxicity_label: 'safe',
        upvotes: 0,
        downvotes: 0,
        moderated: false,
      });

      // Update user points and streak
      await base44.auth.updateMe({ points: (user.points || 0) + 2 });
      await recordUserAction();

      // Recalculate comment-derived score (kept on Party as unquantifiable_score).
      // IMPORTANT: Do NOT update Party.performance_score here; party quality must be derived from PartyRating aggregation.
      const allComments = await base44.entities.PartyComment.filter({ party_id: partyId });
      const avgSentiment = allComments.reduce((sum, c) => sum + (c.sentiment_score ?? 0), 0) / allComments.length;
      const unquantifiableScore = Math.max(0, Math.min(10, 5 + avgSentiment * 5));

      await base44.entities.Party.update(partyId, {
        unquantifiable_score: unquantifiableScore,
      });

      setNewComment('');
      setReplyingTo(null);
      await loadComments();
    } catch (error) {
      console.error('Failed to submit comment:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const recalculateCommentVotes = async (commentId: string) => {
    const allVotes = await base44.entities.PartyCommentVote.filter({ comment_id: commentId });
    const upvotes = allVotes.filter(v => v.value === 1).length;
    const downvotes = allVotes.filter(v => v.value === -1).length;
    await base44.entities.PartyComment.update(commentId, { upvotes, downvotes });
  };

  const handleVote = async (commentId: string, value: 1 | -1) => {
    try {
      const user = await base44.auth.me();
      if (!user) return;

      // Find existing vote
      const existingVotes = await base44.entities.PartyCommentVote.filter({
        comment_id: commentId,
        user_id: user.id,
      });
      const existingVote = existingVotes[0] as PartyCommentVote | undefined;

      if (!existingVote) {
        // No vote exists - create new vote
        await base44.entities.PartyCommentVote.create({
          comment_id: commentId,
          party_id: partyId,
          user_id: user.id,
          value,
        });
        setUserVotes(prev => ({ ...prev, [commentId]: value }));
      } else if (existingVote.value === value) {
        // Same vote - toggle off (remove)
        await base44.entities.PartyCommentVote.delete(existingVote.id);
        setUserVotes(prev => {
          const updated = { ...prev };
          delete updated[commentId];
          return updated;
        });
      } else {
        // Different vote - switch
        await base44.entities.PartyCommentVote.update(existingVote.id, { value });
        setUserVotes(prev => ({ ...prev, [commentId]: value }));
      }

      // Recalculate from votes table
      await recalculateCommentVotes(commentId);
      await loadComments();
    } catch (error) {
      console.error('Failed to vote:', error);
    }
  };

  const handleStartReply = (comment: PartyComment) => {
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

  // Group comments: top-level and replies
  const topLevelComments = comments.filter(c => !c.parent_comment_id);
  const repliesByParent = comments.reduce((acc, c) => {
    if (c.parent_comment_id) {
      if (!acc[c.parent_comment_id]) acc[c.parent_comment_id] = [];
      acc[c.parent_comment_id].push(c);
    }
    return acc;
  }, {} as Record<string, PartyComment[]>);

  // Sort replies by score desc, then newest
  Object.keys(repliesByParent).forEach(parentId => {
    repliesByParent[parentId].sort((a, b) => {
      const scoreA = (a.upvotes || 0) - (a.downvotes || 0);
      const scoreB = (b.upvotes || 0) - (b.downvotes || 0);
      if (scoreB !== scoreA) return scoreB - scoreA;
      return new Date(b.created_date).getTime() - new Date(a.created_date).getTime();
    });
  });

  const renderComment = (comment: PartyComment, isReply = false) => {
    const replies = repliesByParent[comment.id] || [];
    const displayText = sanitizeCommentText(comment.text ?? '');
    const upvotes = comment.upvotes ?? 0;
    const downvotes = comment.downvotes ?? 0;
    const netScore = upvotes - downvotes;
    const userVote = userVotes[comment.id];

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
                <p className="text-xs text-muted-foreground">
                  {formatTimeAgo(comment.created_date)}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {netScore !== 0 && (
                <Badge variant={netScore > 0 ? 'default' : 'destructive'} className="text-xs">
                  {netScore > 0 ? '+' : ''}{netScore}
                </Badge>
              )}
              {getSentimentBadge(comment.sentiment_score ?? 0)}
            </div>
          </div>

          <p className="text-sm mt-2">{displayText}</p>

          <div className="flex items-center gap-2 mt-2">
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => handleVote(comment.id, 1)}
              className={`h-8 text-xs ${userVote === 1 ? 'text-emerald-600 bg-emerald-50' : ''}`}
            >
              <ThumbsUp className="h-3.5 w-3.5 mr-1" />
              {upvotes}
            </Button>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => handleVote(comment.id, -1)}
              className={`h-8 text-xs ${userVote === -1 ? 'text-red-500 bg-red-50' : ''}`}
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

        {/* Render replies */}
        {replies.map(reply => renderComment(reply, true))}
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

      {/* New Comment Input */}
      <div className="space-y-2">
        {/* Replying To Indicator */}
        {replyingTo && (
          <div className="flex items-center justify-between bg-muted/50 rounded-lg px-3 py-2 text-sm">
            <div className="flex items-center gap-2">
              <Reply className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Replying to</span>
              <span className="font-medium">{replyingTo.authorName}</span>
              {replyingTo.snippet && (
                <span className="text-muted-foreground truncate max-w-[200px]">
                  "{replyingTo.snippet}"
                </span>
              )}
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleCancelReply}
              className="h-6 w-6 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}
        
        <Textarea
          placeholder={replyingTo ? 'Write your reply...' : 'Share your experience...'}
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          className="resize-none"
          rows={3}
        />
        <Button 
          onClick={handleSubmitComment}
          disabled={!newComment.trim() || submitting}
          className="gradient-primary text-white"
        >
          <Send className="h-4 w-4 mr-2" />
          {submitting ? 'Posting...' : replyingTo ? 'Post Reply' : 'Post Comment'}
        </Button>
      </div>

      {/* Comments List - Threaded */}
      <div className="space-y-4">
        {topLevelComments.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            No comments yet. Be the first to share your experience!
          </p>
        ) : (
          topLevelComments.map((comment) => renderComment(comment))
        )}
      </div>
    </Card>
  );
}
