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
  Send,
  Home,
  MessagesSquare,
  AtSign,
  X
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Sheet, 
  SheetContent, 
  SheetHeader, 
  SheetTitle 
} from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  base44, 
  type Party, 
  type Fraternity, 
  type ChatMessage 
} from '@/api/base44Client';
import { formatDistanceToNow } from 'date-fns';
import { getScoreColor, createPageUrl } from '@/utils';
import { toast } from '@/hooks/use-toast';

type ActivityType = 'party_rating' | 'frat_rating' | 'party_comment' | 'frat_comment';

interface ActivityItem {
  id: string;
  type: ActivityType;
  created_date: string;
  score?: number;
  vibe?: number;
  music?: number;
  execution?: number;
  brotherhood?: number;
  reputation?: number;
  community?: number;
  text?: string;
  upvotes?: number;
  downvotes?: number;
  party?: Party;
  fraternity?: Fraternity;
  userVote?: 1 | -1 | null;
  replies?: ActivityItem[];
  parent_comment_id?: string | null;
}

interface ChatItem {
  id: string;
  text: string;
  upvotes: number;
  downvotes: number;
  created_date: string;
  mentionedFraternity?: Fraternity;
  mentionedParty?: Party;
  userVote?: 1 | -1 | null;
  replies?: ChatItem[];
  parent_message_id?: string | null;
}

export default function Activity() {
  const [activeTab, setActiveTab] = useState<'chat' | 'house'>('chat');
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [submittingReply, setSubmittingReply] = useState(false);
  
  // Chat composer
  const [showChatComposer, setShowChatComposer] = useState(false);
  const [chatText, setChatText] = useState('');
  const [submittingChat, setSubmittingChat] = useState(false);
  const [showMentionPicker, setShowMentionPicker] = useState(false);
  const [mentionType, setMentionType] = useState<'frat' | 'party' | null>(null);
  const [selectedMention, setSelectedMention] = useState<{ type: 'frat' | 'party'; id: string; name: string } | null>(null);
  
  // Data for mentions
  const [fraternities, setFraternities] = useState<Fraternity[]>([]);
  const [parties, setParties] = useState<Party[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [partiesData, fraternitiesData] = await Promise.all([
        base44.entities.Party.list(),
        base44.entities.Fraternity.list(),
      ]);
      setParties(partiesData);
      setFraternities(fraternitiesData);
      
      await Promise.all([loadActivity(), loadChat()]);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadActivity = async () => {
    try {
      const [partiesData, fraternitiesData, partyRatings, fratRatings, partyComments, fratComments] = await Promise.all([
        base44.entities.Party.list(),
        base44.entities.Fraternity.list(),
        base44.entities.PartyRating.list(),
        base44.entities.ReputationRating.list(),
        base44.entities.PartyComment.list(),
        base44.entities.FraternityComment.list(),
      ]);

      const partyMap = new Map(partiesData.map(p => [p.id, p]));
      const fratMap = new Map(fraternitiesData.map(f => [f.id, f]));

      const user = await base44.auth.me();
      
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

      items.sort((a, b) => new Date(b.created_date).getTime() - new Date(a.created_date).getTime());
      setActivities(items);
    } catch (error) {
      console.error('Failed to load activity:', error);
    }
  };

  const loadChat = async () => {
    try {
      const [messages, partiesData, fraternitiesData] = await Promise.all([
        base44.entities.ChatMessage.list(),
        base44.entities.Party.list(),
        base44.entities.Fraternity.list(),
      ]);

      const partyMap = new Map(partiesData.map(p => [p.id, p]));
      const fratMap = new Map(fraternitiesData.map(f => [f.id, f]));

      const user = await base44.auth.me();
      let userVotes: any[] = [];
      if (user) {
        userVotes = await base44.entities.ChatMessageVote.filter({ user_id: user.id });
      }
      const voteMap = new Map(userVotes.map(v => [v.message_id, v.value]));

      const topLevelMessages = messages.filter(m => !m.parent_message_id);
      
      const chatItems: ChatItem[] = topLevelMessages.map(msg => {
        const replies = messages
          .filter(m => m.parent_message_id === msg.id)
          .map(m => ({
            id: m.id,
            text: m.text,
            upvotes: m.upvotes,
            downvotes: m.downvotes,
            created_date: m.created_date,
            mentionedFraternity: m.mentioned_fraternity_id ? fratMap.get(m.mentioned_fraternity_id) : undefined,
            mentionedParty: m.mentioned_party_id ? partyMap.get(m.mentioned_party_id) : undefined,
            userVote: voteMap.get(m.id) || null,
          }));

        return {
          id: msg.id,
          text: msg.text,
          upvotes: msg.upvotes,
          downvotes: msg.downvotes,
          created_date: msg.created_date,
          mentionedFraternity: msg.mentioned_fraternity_id ? fratMap.get(msg.mentioned_fraternity_id) : undefined,
          mentionedParty: msg.mentioned_party_id ? partyMap.get(msg.mentioned_party_id) : undefined,
          userVote: voteMap.get(msg.id) || null,
          replies,
        };
      });

      chatItems.sort((a, b) => new Date(b.created_date).getTime() - new Date(a.created_date).getTime());
      setChatMessages(chatItems);
    } catch (error) {
      console.error('Failed to load chat:', error);
    }
  };

  const handleChatVote = async (item: ChatItem, value: 1 | -1) => {
    const user = await base44.auth.me();
    if (!user) {
      toast({ title: 'Please sign in to vote', variant: 'destructive' });
      return;
    }

    try {
      const existingVotes = await base44.entities.ChatMessageVote.filter({
        message_id: item.id,
        user_id: user.id,
      });

      let upvoteDelta = 0;
      let downvoteDelta = 0;

      if (existingVotes.length > 0) {
        const existingVote = existingVotes[0];
        if (existingVote.value === value) {
          await base44.entities.ChatMessageVote.delete(existingVote.id);
          if (value === 1) upvoteDelta = -1;
          else downvoteDelta = -1;
        } else {
          await base44.entities.ChatMessageVote.update(existingVote.id, { value });
          if (value === 1) {
            upvoteDelta = 1;
            downvoteDelta = -1;
          } else {
            upvoteDelta = -1;
            downvoteDelta = 1;
          }
        }
      } else {
        await base44.entities.ChatMessageVote.create({
          message_id: item.id,
          user_id: user.id,
          value,
        });
        if (value === 1) upvoteDelta = 1;
        else downvoteDelta = 1;
      }

      await base44.entities.ChatMessage.update(item.id, {
        upvotes: item.upvotes + upvoteDelta,
        downvotes: item.downvotes + downvoteDelta,
      });

      await loadChat();
    } catch (error) {
      console.error('Failed to vote:', error);
      toast({ title: 'Failed to vote', variant: 'destructive' });
    }
  };

  const handleChatReply = async (parentId: string) => {
    if (!replyText.trim()) return;

    const user = await base44.auth.me();
    if (!user) {
      toast({ title: 'Please sign in to reply', variant: 'destructive' });
      return;
    }

    setSubmittingReply(true);
    try {
      await base44.entities.ChatMessage.create({
        user_id: user.id,
        parent_message_id: parentId,
        text: replyText.trim(),
        upvotes: 0,
        downvotes: 0,
      });
      setReplyText('');
      setReplyingTo(null);
      toast({ title: 'Reply posted!' });
      await loadChat();
    } catch (error) {
      console.error('Failed to post reply:', error);
      toast({ title: 'Failed to post reply', variant: 'destructive' });
    } finally {
      setSubmittingReply(false);
    }
  };

  const handleSubmitChat = async () => {
    if (!chatText.trim()) return;

    const user = await base44.auth.me();
    if (!user) {
      toast({ title: 'Please sign in to chat', variant: 'destructive' });
      return;
    }

    setSubmittingChat(true);
    try {
      await base44.entities.ChatMessage.create({
        user_id: user.id,
        text: chatText.trim(),
        mentioned_fraternity_id: selectedMention?.type === 'frat' ? selectedMention.id : null,
        mentioned_party_id: selectedMention?.type === 'party' ? selectedMention.id : null,
        upvotes: 0,
        downvotes: 0,
      });
      setChatText('');
      setSelectedMention(null);
      setShowChatComposer(false);
      toast({ title: 'Posted!' });
      await loadChat();
    } catch (error) {
      console.error('Failed to post:', error);
      toast({ title: 'Failed to post', variant: 'destructive' });
    } finally {
      setSubmittingChat(false);
    }
  };

  const handleActivityVote = async (item: ActivityItem, value: 1 | -1) => {
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

      const existingVotes = await VoteEntity.filter({
        comment_id: item.id,
        user_id: user.id,
      });

      let upvoteDelta = 0;
      let downvoteDelta = 0;

      if (existingVotes.length > 0) {
        const existingVote = existingVotes[0];
        if (existingVote.value === value) {
          await VoteEntity.delete(existingVote.id);
          if (value === 1) upvoteDelta = -1;
          else downvoteDelta = -1;
        } else {
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

  const handleActivityReply = async (item: ActivityItem) => {
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

  const renderVoteActions = (item: ChatItem, isReply = false) => {
    const netVotes = item.upvotes - item.downvotes;
    return (
      <div className="flex items-center gap-3 mt-3">
        <button
          onClick={() => handleChatVote(item, 1)}
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
          onClick={() => handleChatVote(item, -1)}
          className={`flex items-center gap-1 text-sm transition-colors ${
            item.userVote === -1 ? 'text-red-500' : 'text-muted-foreground hover:text-red-500'
          }`}
        >
          <ThumbsDown className="h-4 w-4" />
        </button>
        {!isReply && (
          <button
            onClick={() => setReplyingTo(replyingTo === item.id ? null : item.id)}
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-primary transition-colors ml-2"
          >
            <MessageCircle className="h-4 w-4" />
            <span>Reply</span>
          </button>
        )}
      </div>
    );
  };

  const renderActivityVoteActions = (item: ActivityItem, isReply = false) => {
    if (item.type !== 'party_comment' && item.type !== 'frat_comment') return null;
    const netVotes = (item.upvotes || 0) - (item.downvotes || 0);
    return (
      <div className="flex items-center gap-3 mt-3">
        <button
          onClick={(e) => { e.preventDefault(); handleActivityVote(item, 1); }}
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
          onClick={(e) => { e.preventDefault(); handleActivityVote(item, -1); }}
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
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-12 w-full rounded-lg" />
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-32 rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-indigo-500 flex items-center justify-center shadow-lg">
          <Home className="h-5 w-5 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Home</h1>
          <p className="text-xs text-muted-foreground">See what's happening</p>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'chat' | 'house')}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="chat" className="flex items-center gap-2">
            <MessagesSquare className="h-4 w-4" />
            Chat
          </TabsTrigger>
          <TabsTrigger value="house" className="flex items-center gap-2">
            <Home className="h-4 w-4" />
            House
          </TabsTrigger>
        </TabsList>

        {/* Chat Tab */}
        <TabsContent value="chat" className="mt-4 space-y-3">
          {chatMessages.length === 0 ? (
            <Card className="p-8 text-center">
              <MessagesSquare className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
              <p className="font-medium">No messages yet</p>
              <p className="text-sm text-muted-foreground">Start the conversation!</p>
            </Card>
          ) : (
            chatMessages.map((msg) => (
              <Card key={msg.id} className="p-4 glass">
                <div className="flex items-start gap-3">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-primary/10 text-primary text-xs">
                      <MessagesSquare className="h-4 w-4" />
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-muted-foreground mb-1">
                      {formatDistanceToNow(new Date(msg.created_date), { addSuffix: true })}
                    </p>
                    <p className="text-sm">{msg.text}</p>
                    
                    {/* Mention badge */}
                    {(msg.mentionedFraternity || msg.mentionedParty) && (
                      <Link 
                        to={msg.mentionedFraternity 
                          ? createPageUrl(`Fraternity?id=${msg.mentionedFraternity.id}`)
                          : createPageUrl(`Party?id=${msg.mentionedParty?.id}`)
                        }
                        className="inline-flex items-center gap-1 mt-2 px-2 py-1 rounded-full bg-primary/10 text-primary text-xs hover:bg-primary/20 transition-colors"
                      >
                        <AtSign className="h-3 w-3" />
                        {msg.mentionedFraternity?.name || msg.mentionedParty?.title}
                      </Link>
                    )}

                    {renderVoteActions(msg)}

                    {/* Reply input */}
                    {replyingTo === msg.id && (
                      <div className="mt-3 flex gap-2">
                        <Textarea
                          value={replyText}
                          onChange={(e) => setReplyText(e.target.value)}
                          placeholder="Write a reply..."
                          className="min-h-[60px] text-sm"
                        />
                        <Button
                          size="icon"
                          onClick={() => handleChatReply(msg.id)}
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
                    {msg.replies && msg.replies.length > 0 && (
                      <div className="mt-3 pl-4 border-l-2 border-muted space-y-3">
                        {msg.replies.map((reply) => (
                          <div key={reply.id} className="text-sm">
                            <p className="text-xs text-muted-foreground mb-1">
                              {formatDistanceToNow(new Date(reply.created_date), { addSuffix: true })}
                            </p>
                            <p className="p-2 bg-muted/30 rounded-lg">{reply.text}</p>
                            {renderVoteActions(reply, true)}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            ))
          )}
        </TabsContent>

        {/* House Tab */}
        <TabsContent value="house" className="mt-4 space-y-3">
          {activities.length === 0 ? (
            <Card className="p-8 text-center">
              <PartyPopper className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
              <p className="font-medium">No activity yet</p>
              <p className="text-sm text-muted-foreground">Be the first to rate a party or frat!</p>
            </Card>
          ) : (
            activities.map((item) => (
              <Card key={item.id} className="p-4 glass">
                <div className="flex items-center gap-2 mb-3">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-primary/10 text-primary text-xs">
                      {item.type.includes('party') ? <PartyPopper className="h-4 w-4" /> : <Star className="h-4 w-4" />}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm">
                      <span className="text-muted-foreground">Someone </span>
                      <span className="font-medium">
                        {item.type === 'party_rating' && 'rated a party'}
                        {item.type === 'frat_rating' && 'rated a fraternity'}
                        {item.type === 'party_comment' && 'commented on a party'}
                        {item.type === 'frat_comment' && 'commented on a fraternity'}
                      </span>
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

                <Link 
                  to={item.party ? createPageUrl(`Party?id=${item.party.id}`) : createPageUrl(`Fraternity?id=${item.fraternity?.id}`)}
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
                      <p className="font-medium text-sm">
                        {item.type.includes('party') ? item.party?.title : item.fraternity?.name}
                      </p>
                      {item.fraternity && item.type.includes('party') && (
                        <p className="text-xs text-muted-foreground">{item.fraternity.name}</p>
                      )}
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </Link>

                {item.type === 'party_rating' && (
                  <div className="flex gap-3 text-xs text-muted-foreground mt-2">
                    <span>Vibe: <span className={getScoreColor(item.vibe || 0)}>{item.vibe?.toFixed(1)}</span></span>
                    <span>Music: <span className={getScoreColor(item.music || 0)}>{item.music?.toFixed(1)}</span></span>
                    <span>Execution: <span className={getScoreColor(item.execution || 0)}>{item.execution?.toFixed(1)}</span></span>
                  </div>
                )}

                {item.type === 'frat_rating' && (
                  <div className="flex gap-3 text-xs text-muted-foreground mt-2">
                    <span>Brotherhood: <span className={getScoreColor(item.brotherhood || 0)}>{item.brotherhood?.toFixed(1)}</span></span>
                    <span>Rep: <span className={getScoreColor(item.reputation || 0)}>{item.reputation?.toFixed(1)}</span></span>
                    <span>Community: <span className={getScoreColor(item.community || 0)}>{item.community?.toFixed(1)}</span></span>
                  </div>
                )}

                {item.text && (
                  <p className="text-sm mt-2 p-3 bg-muted/30 rounded-lg">{item.text}</p>
                )}

                {renderActivityVoteActions(item)}

                {replyingTo === item.id && (item.type === 'party_comment' || item.type === 'frat_comment') && (
                  <div className="mt-3 flex gap-2">
                    <Textarea
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      placeholder="Write a reply..."
                      className="min-h-[60px] text-sm"
                    />
                    <Button
                      size="icon"
                      onClick={() => handleActivityReply(item)}
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

                {item.replies && item.replies.length > 0 && (
                  <div className="mt-3 pl-4 border-l-2 border-muted space-y-3">
                    {item.replies.map((reply) => (
                      <div key={reply.id} className="text-sm">
                        <p className="text-xs text-muted-foreground mb-1">
                          {formatDistanceToNow(new Date(reply.created_date), { addSuffix: true })}
                        </p>
                        <p className="p-2 bg-muted/30 rounded-lg">{reply.text}</p>
                        {renderActivityVoteActions(reply, true)}
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>

      {/* Floating Chat Button - Only on Chat tab */}
      {activeTab === 'chat' && (
        <button
          onClick={() => setShowChatComposer(true)}
          className="fixed bottom-24 right-4 z-50 flex items-center gap-2 px-5 py-3 rounded-full bg-primary text-white shadow-lg active:scale-95 transition-transform"
          style={{ marginBottom: 'env(safe-area-inset-bottom)' }}
        >
          <MessagesSquare className="h-5 w-5" />
          <span className="font-semibold">Chat</span>
        </button>
      )}

      {/* Chat Composer Sheet */}
      <Sheet open={showChatComposer} onOpenChange={setShowChatComposer}>
        <SheetContent side="bottom" className="rounded-t-3xl h-[70vh]">
          <SheetHeader className="text-left pb-4">
            <SheetTitle>New Message</SheetTitle>
          </SheetHeader>

          <div className="space-y-4">
            <Textarea
              value={chatText}
              onChange={(e) => setChatText(e.target.value)}
              placeholder="What's on your mind?"
              className="min-h-[120px]"
            />

            {/* Selected mention */}
            {selectedMention && (
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="flex items-center gap-1">
                  <AtSign className="h-3 w-3" />
                  {selectedMention.name}
                  <button onClick={() => setSelectedMention(null)} className="ml-1">
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              </div>
            )}

            {/* Mention buttons */}
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => { setMentionType('frat'); setShowMentionPicker(true); }}
              >
                <AtSign className="h-4 w-4 mr-1" />
                Mention Frat
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => { setMentionType('party'); setShowMentionPicker(true); }}
              >
                <AtSign className="h-4 w-4 mr-1" />
                Mention Party
              </Button>
            </div>

            {/* Mention picker */}
            {showMentionPicker && (
              <Card className="p-2 max-h-40 overflow-y-auto">
                <div className="space-y-1">
                  {mentionType === 'frat' && fraternities.map((frat) => (
                    <button
                      key={frat.id}
                      onClick={() => {
                        setSelectedMention({ type: 'frat', id: frat.id, name: frat.name });
                        setShowMentionPicker(false);
                      }}
                      className="w-full text-left px-3 py-2 rounded-lg hover:bg-muted transition-colors text-sm"
                    >
                      {frat.name}
                    </button>
                  ))}
                  {mentionType === 'party' && parties.map((party) => (
                    <button
                      key={party.id}
                      onClick={() => {
                        setSelectedMention({ type: 'party', id: party.id, name: party.title });
                        setShowMentionPicker(false);
                      }}
                      className="w-full text-left px-3 py-2 rounded-lg hover:bg-muted transition-colors text-sm"
                    >
                      {party.title}
                    </button>
                  ))}
                </div>
              </Card>
            )}

            <Button
              className="w-full"
              onClick={handleSubmitChat}
              disabled={submittingChat || !chatText.trim()}
            >
              {submittingChat ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Post
                </>
              )}
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
