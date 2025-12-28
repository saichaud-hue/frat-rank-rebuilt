import { useState, useEffect } from 'react';
import { MessageSquare, ThumbsUp, Reply, Send, Smile, Meh, Frown, X } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { base44, type PartyComment } from '@/api/base44Client';
import { formatTimeAgo } from '@/utils';

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
  // Remove @<uuid> patterns (UUID format: 8-4-4-4-12 hex chars)
  return text.replace(/@[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\s*/gi, '').trim();
};

export default function CommentSection({ partyId }: CommentSectionProps) {
  const [comments, setComments] = useState<PartyComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [replyingTo, setReplyingTo] = useState<ReplyingTo | null>(null);

  useEffect(() => {
    loadComments();
  }, [partyId]);

  const loadComments = async () => {
    try {
      const data = await base44.entities.PartyComment.filter(
        { party_id: partyId },
        'created_date'
      );
      setComments(data);
    } catch (error) {
      console.error('Failed to load comments:', error);
    } finally {
      setLoading(false);
    }
  };

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
        moderated: false,
      });

      // Update user points
      await base44.auth.updateMe({ points: (user.points || 0) + 2 });

      // Recalculate party scores
      const allComments = await base44.entities.PartyComment.filter({ party_id: partyId });
      const avgSentiment = allComments.reduce((sum, c) => sum + (c.sentiment_score ?? 0), 0) / allComments.length;
      const unquantifiableScore = Math.max(0, Math.min(10, 5 + avgSentiment * 5));
      
      const party = await base44.entities.Party.get(partyId);
      if (party) {
        const newPerformanceScore = ((party.quantifiable_score ?? 5) * 0.5) + (unquantifiableScore * 0.5);
        await base44.entities.Party.update(partyId, {
          unquantifiable_score: unquantifiableScore,
          performance_score: newPerformanceScore,
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

  const handleUpvote = async (commentId: string) => {
    const comment = comments.find(c => c.id === commentId);
    if (!comment) return;

    await base44.entities.PartyComment.update(commentId, {
      upvotes: (comment.upvotes ?? 0) + 1,
    });
    await loadComments();
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

  const renderComment = (comment: PartyComment, isReply = false) => {
    const replies = repliesByParent[comment.id] || [];
    const displayText = sanitizeCommentText(comment.text ?? '');

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
            {getSentimentBadge(comment.sentiment_score ?? 0)}
          </div>

          <p className="text-sm mt-2">{displayText}</p>

          <div className="flex items-center gap-4 mt-2">
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => handleUpvote(comment.id)}
              className="h-8 text-xs"
            >
              <ThumbsUp className="h-3.5 w-3.5 mr-1" />
              {comment.upvotes ?? 0}
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
