import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  ThumbsUp, 
  ThumbsDown, 
  MessageCircle, 
  Star, 
  PartyPopper, 
  ChevronRight,
  Loader2,
  Send
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { base44, type Party, type Fraternity, type PartyRating, type ReputationRating, type PartyComment, type FraternityComment } from '@/api/base44Client';
import { formatDistanceToNow } from 'date-fns';
import { getScoreColor, createPageUrl } from '@/utils';
import { toast } from '@/hooks/use-toast';

type ActivityType = 'party_rating' | 'frat_rating' | 'party_comment' | 'frat_comment';

interface ActivityItem {
  id: string;
  type: ActivityType;
  created_date: string;
  // For ratings
  score?: number;
  vibe?: number;
  music?: number;
  execution?: number;
  brotherhood?: number;
  reputation?: number;
  community?: number;
  // For comments
  text?: string;
  upvotes?: number;
  downvotes?: number;
  // References
  party?: Party;
  fraternity?: Fraternity;
  // For voting/replies
  userVote?: 1 | -1 | null;
  replies?: ActivityItem[];
  parent_comment_id?: string | null;
}

export default function Activity() {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [submittingReply, setSubmittingReply] = useState(false);

  useEffect(() => {
    loadActivity();
  }, []);

  const loadActivity = async () => {
    try {
      const [parties, fraternities, partyRatings, fratRatings, partyComments, fratComments] = await Promise.all([
        base44.entities.Party.list(),
        base44.entities.Fraternity.list(),
        base44.entities.PartyRating.list(),
        base44.entities.ReputationRating.list(),
        base44.entities.PartyComment.list(),
        base44.entities.FraternityComment.list(),
      ]);

      const partyMap = new Map(parties.map(p => [p.id, p]));
      const fratMap = new Map(fraternities.map(f => [f.id, f]));

      const user = await base44.auth.me();
      
      // Load user's votes
      let userPartyCommentVotes: any[] = [];
      let userFratCommentVotes: any[] = [];
      if (user) {
        [userPartyCommentVotes, userFratCommentVotes] = await Promise.all([
          base44.entities.PartyCommentVote.filter({ user_id: user.id }),
          base44.entities.FraternityCommentVote.filter({ user_id: user.id }),
        ]);
      }

      const partyVoteMap = new Map(userPartyCommentVotes.map(v => [v.comment_id, v.value]));
      const fratVoteMap = new Map(userFratCommentVotes.map(v => [v.comment_id, v.value]));

      const items: ActivityItem[] = [];

      // Add party ratings
      for (const rating of partyRatings) {
        const party = partyMap.get(rating.party_id);
        if (party) {
          items.push({
            id: rating.id,
            type: 'party_rating',
            created_date: rating.created_date,
            score: rating.party_quality_score,
            vibe: rating.vibe_score,
            music: rating.music_score,
            execution: rating.execution_score,
            party,
            fraternity: fratMap.get(party.fraternity_id),
          });
        }
      }

      // Add frat ratings
      for (const rating of fratRatings) {
        const fraternity = fratMap.get(rating.fraternity_id);
        if (fraternity) {
          items.push({
            id: rating.id,
            type: 'frat_rating',
            created_date: rating.created_date,
            score: rating.combined_score,
            brotherhood: rating.brotherhood_score,
            reputation: rating.reputation_score,
            community: rating.community_score,
            fraternity,
          });
        }
      }

      // Add party comments (only top-level)
      for (const comment of partyComments.filter(c => !c.parent_comment_id)) {
        const party = partyMap.get(comment.party_id);
        if (party) {
          const replies = partyComments
            .filter(c => c.parent_comment_id === comment.id)
            .map(c => ({
              id: c.id,
              type: 'party_comment' as ActivityType,
              created_date: c.created_date,
              text: c.text,
              upvotes: c.upvotes,
              downvotes: c.downvotes,
              party,
              fraternity: fratMap.get(party.fraternity_id),
              userVote: partyVoteMap.get(c.id) || null,
            }));

          items.push({
            id: comment.id,
            type: 'party_comment',
            created_date: comment.created_date,
            text: comment.text,
            upvotes: comment.upvotes,
            downvotes: comment.downvotes,
            party,
            fraternity: fratMap.get(party.fraternity_id),
            userVote: partyVoteMap.get(comment.id) || null,
            replies,
          });
        }
      }

      // Add frat comments (only top-level)
      for (const comment of fratComments.filter(c => !c.parent_comment_id)) {
        const fraternity = fratMap.get(comment.fraternity_id);
        if (fraternity) {
          const replies = fratComments
            .filter(c => c.parent_comment_id === comment.id)
            .map(c => ({
              id: c.id,
              type: 'frat_comment' as ActivityType,
              created_date: c.created_date,
              text: c.text,
              upvotes: c.upvotes,
              downvotes: c.downvotes,
              fraternity,
              userVote: fratVoteMap.get(c.id) || null,
            }));

          items.push({
            id: comment.id,
            type: 'frat_comment',
            created_date: comment.created_date,
            text: comment.text,
            upvotes: comment.upvotes,
            downvotes: comment.downvotes,
            fraternity,
            userVote: fratVoteMap.get(comment.id) || null,
            replies,
          });
        }
      }

      // Sort by date, newest first
      items.sort((a, b) => new Date(b.created_date).getTime() - new Date(a.created_date).getTime());

      setActivities(items);
    } catch (error) {
      console.error('Failed to load activity:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleVote = async (item: ActivityItem, value: 1 | -1) => {
    const user = await base44.auth.me();
    if (!user) {
      toast({ title: 'Please sign in to vote', variant: 'destructive' });
      return;
    }

    try {
      const isPartyComment = item.type === 'party_comment';
      const VoteEntity = isPartyComment 
        ? base44.entities.PartyCommentVote 
        : base44.entities.FraternityCommentVote;
      const CommentEntity = isPartyComment
        ? base44.entities.PartyComment
        : base44.entities.FraternityComment;

      // Check existing vote
      const existingVotes = await VoteEntity.filter({
        comment_id: item.id,
        user_id: user.id,
      });

      let upvoteDelta = 0;
      let downvoteDelta = 0;

      if (existingVotes.length > 0) {
        const existingVote = existingVotes[0];
        if (existingVote.value === value) {
          // Remove vote
          await VoteEntity.delete(existingVote.id);
          if (value === 1) upvoteDelta = -1;
          else downvoteDelta = -1;
        } else {
          // Change vote
          await VoteEntity.update(existingVote.id, { value });
          if (value === 1) {
            upvoteDelta = 1;
            downvoteDelta = -1;
          } else {
            upvoteDelta = -1;
            downvoteDelta = 1;
          }
        }
      } else {
        // New vote
        const voteData: any = {
          comment_id: item.id,
          user_id: user.id,
          value,
        };
        if (isPartyComment) {
          voteData.party_id = item.party?.id;
        } else {
          voteData.fraternity_id = item.fraternity?.id;
        }
        await VoteEntity.create(voteData);
        if (value === 1) upvoteDelta = 1;
        else downvoteDelta = 1;
      }

      // Update comment vote counts
      await CommentEntity.update(item.id, {
        upvotes: (item.upvotes || 0) + upvoteDelta,
        downvotes: (item.downvotes || 0) + downvoteDelta,
      });

      await loadActivity();
    } catch (error) {
      console.error('Failed to vote:', error);
      toast({ title: 'Failed to vote', variant: 'destructive' });
    }
  };

  const handleReply = async (item: ActivityItem) => {
    if (!replyText.trim()) return;

    const user = await base44.auth.me();
    if (!user) {
      toast({ title: 'Please sign in to reply', variant: 'destructive' });
      return;
    }

    setSubmittingReply(true);
    try {
      const isPartyComment = item.type === 'party_comment';
      const CommentEntity = isPartyComment
        ? base44.entities.PartyComment
        : base44.entities.FraternityComment;

      const commentData: any = {
        user_id: user.id,
        parent_comment_id: item.id,
        text: replyText.trim(),
        sentiment_score: 0,
        toxicity_label: 'safe',
        upvotes: 0,
        downvotes: 0,
        moderated: false,
      };

      if (isPartyComment) {
        commentData.party_id = item.party?.id;
      } else {
        commentData.fraternity_id = item.fraternity?.id;
      }

      await CommentEntity.create(commentData);
      setReplyText('');
      setReplyingTo(null);
      toast({ title: 'Reply posted!' });
      await loadActivity();
    } catch (error) {
      console.error('Failed to post reply:', error);
      toast({ title: 'Failed to post reply', variant: 'destructive' });
    } finally {
      setSubmittingReply(false);
    }
  };

  const getActivityIcon = (type: ActivityType) => {
    switch (type) {
      case 'party_rating':
        return <PartyPopper className="h-4 w-4" />;
      case 'frat_rating':
        return <Star className="h-4 w-4" />;
      case 'party_comment':
      case 'frat_comment':
        return <MessageCircle className="h-4 w-4" />;
    }
  };

  const getActivityLabel = (type: ActivityType) => {
    switch (type) {
      case 'party_rating':
        return 'rated a party';
      case 'frat_rating':
        return 'rated a fraternity';
      case 'party_comment':
        return 'commented on a party';
      case 'frat_comment':
        return 'commented on a fraternity';
    }
  };

  const getTargetLink = (item: ActivityItem) => {
    if (item.party) {
      return createPageUrl(`Party?id=${item.party.id}`);
    }
    if (item.fraternity) {
      return createPageUrl(`Fraternity?id=${item.fraternity.id}`);
    }
    return '#';
  };

  const getTargetName = (item: ActivityItem) => {
    if (item.type === 'party_rating' || item.type === 'party_comment') {
      return item.party?.title || 'Unknown Party';
    }
    return item.fraternity?.name || 'Unknown Fraternity';
  };

  const renderRatingDetails = (item: ActivityItem) => {
    if (item.type === 'party_rating') {
      return (
        <div className="flex gap-3 text-xs text-muted-foreground mt-2">
          <span>Vibe: <span className={getScoreColor(item.vibe || 0)}>{item.vibe?.toFixed(1)}</span></span>
          <span>Music: <span className={getScoreColor(item.music || 0)}>{item.music?.toFixed(1)}</span></span>
          <span>Execution: <span className={getScoreColor(item.execution || 0)}>{item.execution?.toFixed(1)}</span></span>
        </div>
      );
    }
    if (item.type === 'frat_rating') {
      return (
        <div className="flex gap-3 text-xs text-muted-foreground mt-2">
          <span>Brotherhood: <span className={getScoreColor(item.brotherhood || 0)}>{item.brotherhood?.toFixed(1)}</span></span>
          <span>Rep: <span className={getScoreColor(item.reputation || 0)}>{item.reputation?.toFixed(1)}</span></span>
          <span>Community: <span className={getScoreColor(item.community || 0)}>{item.community?.toFixed(1)}</span></span>
        </div>
      );
    }
    return null;
  };

  const renderCommentActions = (item: ActivityItem, isReply = false) => {
    if (item.type !== 'party_comment' && item.type !== 'frat_comment') return null;

    const netVotes = (item.upvotes || 0) - (item.downvotes || 0);

    return (
      <div className="flex items-center gap-3 mt-3">
        <button
          onClick={(e) => { e.preventDefault(); handleVote(item, 1); }}
          className={`flex items-center gap-1 text-sm transition-colors ${
            item.userVote === 1 ? 'text-emerald-500' : 'text-muted-foreground hover:text-emerald-500'
          }`}
        >
          <ThumbsUp className="h-4 w-4" />
        </button>
        <span className={`text-sm font-medium ${
          netVotes > 0 ? 'text-emerald-500' : netVotes < 0 ? 'text-red-500' : 'text-muted-foreground'
        }`}>
          {netVotes}
        </span>
        <button
          onClick={(e) => { e.preventDefault(); handleVote(item, -1); }}
          className={`flex items-center gap-1 text-sm transition-colors ${
            item.userVote === -1 ? 'text-red-500' : 'text-muted-foreground hover:text-red-500'
          }`}
        >
          <ThumbsDown className="h-4 w-4" />
        </button>
        {!isReply && (
          <button
            onClick={(e) => { e.preventDefault(); setReplyingTo(replyingTo === item.id ? null : item.id); }}
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-primary transition-colors ml-2"
          >
            <MessageCircle className="h-4 w-4" />
            <span>Reply</span>
          </button>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">Activity</h1>
        {[1, 2, 3, 4, 5].map((i) => (
          <Skeleton key={i} className="h-32 rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Activity</h1>
      <p className="text-muted-foreground text-sm">See what's happening on campus</p>

      {activities.length === 0 ? (
        <Card className="p-8 text-center">
          <PartyPopper className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
          <p className="font-medium">No activity yet</p>
          <p className="text-sm text-muted-foreground">Be the first to rate a party or frat!</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {activities.map((item) => (
            <Card key={item.id} className="p-4 glass">
              {/* Header */}
              <div className="flex items-center gap-2 mb-3">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-primary/10 text-primary text-xs">
                    {getActivityIcon(item.type)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm">
                    <span className="text-muted-foreground">Someone </span>
                    <span className="font-medium">{getActivityLabel(item.type)}</span>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(item.created_date), { addSuffix: true })}
                  </p>
                </div>
                {(item.type === 'party_rating' || item.type === 'frat_rating') && item.score && (
                  <Badge variant="secondary" className={`${getScoreColor(item.score)} font-bold`}>
                    {item.score.toFixed(1)}
                  </Badge>
                )}
              </div>

              {/* Target Link */}
              <Link 
                to={getTargetLink(item)}
                className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors mb-2"
              >
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                    {item.type.includes('party') ? (
                      <PartyPopper className="h-4 w-4 text-primary" />
                    ) : (
                      <Star className="h-4 w-4 text-amber-500" />
                    )}
                  </div>
                  <div>
                    <p className="font-medium text-sm">{getTargetName(item)}</p>
                    {item.fraternity && item.type.includes('party') && (
                      <p className="text-xs text-muted-foreground">{item.fraternity.name}</p>
                    )}
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </Link>

              {/* Rating Details */}
              {renderRatingDetails(item)}

              {/* Comment Text */}
              {item.text && (
                <p className="text-sm mt-2 p-3 bg-muted/30 rounded-lg">{item.text}</p>
              )}

              {/* Comment Actions */}
              {renderCommentActions(item)}

              {/* Reply Input */}
              {replyingTo === item.id && (
                <div className="mt-3 flex gap-2">
                  <Textarea
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder="Write a reply..."
                    className="min-h-[60px] text-sm"
                  />
                  <Button
                    size="icon"
                    onClick={() => handleReply(item)}
                    disabled={submittingReply || !replyText.trim()}
                  >
                    {submittingReply ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              )}

              {/* Replies */}
              {item.replies && item.replies.length > 0 && (
                <div className="mt-3 pl-4 border-l-2 border-muted space-y-3">
                  {item.replies.map((reply) => (
                    <div key={reply.id} className="text-sm">
                      <p className="text-xs text-muted-foreground mb-1">
                        {formatDistanceToNow(new Date(reply.created_date), { addSuffix: true })}
                      </p>
                      <p className="p-2 bg-muted/30 rounded-lg">{reply.text}</p>
                      {renderCommentActions(reply, true)}
                    </div>
                  ))}
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
