import { useState, useEffect, useMemo } from 'react';
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
  X,
  Flame,
  Trophy,
  Zap,
  TrendingUp,
  Sparkles,
  Crown,
  Users,
  Shield,
  Heart,
  Clock,
  Calendar,
  Vote,
  Plus,
  Check,
  MapPin
} from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
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
import { formatDistanceToNow, differenceInSeconds, differenceInMinutes, differenceInHours, differenceInDays, format, isToday, isTomorrow } from 'date-fns';
import { getScoreColor, getScoreBgColor, createPageUrl } from '@/utils';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

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

  // What's the move tonight - voting
  const [moveVotes, setMoveVotes] = useState<Record<string, number>>({});
  const [userMoveVote, setUserMoveVote] = useState<string | null>(null);
  const [showSuggestionInput, setShowSuggestionInput] = useState(false);
  const [suggestionText, setSuggestionText] = useState('');
  const [customSuggestions, setCustomSuggestions] = useState<{ id: string; text: string; votes: number }[]>([]);
  
  // Countdown timer
  const [countdownTime, setCountdownTime] = useState<{ days: number; hours: number; minutes: number; seconds: number } | null>(null);

  // Get next upcoming party
  const nextParty = useMemo(() => {
    const now = new Date();
    const upcomingParties = parties
      .filter(p => p.status === 'upcoming' && new Date(p.starts_at) > now)
      .sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime());
    return upcomingParties[0] || null;
  }, [parties]);

  // Get tonight's parties for "What's the move"
  const tonightsParties = useMemo(() => {
    const now = new Date();
    const tonight = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrowMorning = new Date(tonight.getTime() + 24 * 60 * 60 * 1000 + 6 * 60 * 60 * 1000); // 6am next day
    
    return parties.filter(p => {
      const partyDate = new Date(p.starts_at);
      return partyDate >= tonight && partyDate < tomorrowMorning && p.status !== 'cancelled';
    });
  }, [parties]);

  // Countdown effect
  useEffect(() => {
    if (!nextParty) {
      setCountdownTime(null);
      return;
    }

    const updateCountdown = () => {
      const now = new Date();
      const partyTime = new Date(nextParty.starts_at);
      const diffMs = partyTime.getTime() - now.getTime();
      
      if (diffMs <= 0) {
        setCountdownTime(null);
        return;
      }
      
      const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diffMs % (1000 * 60)) / 1000);
      
      setCountdownTime({ days, hours, minutes, seconds });
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [nextParty]);

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

  // Handle voting for "What's the move"
  const handleMoveVote = async (partyId: string) => {
    const user = await base44.auth.me();
    if (!user) {
      toast({ title: 'Please sign in to vote', variant: 'destructive' });
      return;
    }

    // Toggle vote
    if (userMoveVote === partyId) {
      setUserMoveVote(null);
      setMoveVotes(prev => ({ ...prev, [partyId]: Math.max(0, (prev[partyId] || 1) - 1) }));
    } else {
      // Remove previous vote if any
      if (userMoveVote) {
        setMoveVotes(prev => ({ ...prev, [userMoveVote!]: Math.max(0, (prev[userMoveVote!] || 1) - 1) }));
      }
      setUserMoveVote(partyId);
      setMoveVotes(prev => ({ ...prev, [partyId]: (prev[partyId] || 0) + 1 }));
    }
  };

  const handleCustomSuggestionVote = (suggestionId: string) => {
    if (userMoveVote === suggestionId) {
      setUserMoveVote(null);
      setCustomSuggestions(prev => prev.map(s => s.id === suggestionId ? { ...s, votes: Math.max(0, s.votes - 1) } : s));
    } else {
      if (userMoveVote) {
        // Remove vote from previous selection
        setMoveVotes(prev => ({ ...prev, [userMoveVote!]: Math.max(0, (prev[userMoveVote!] || 1) - 1) }));
        setCustomSuggestions(prev => prev.map(s => s.id === userMoveVote ? { ...s, votes: Math.max(0, s.votes - 1) } : s));
      }
      setUserMoveVote(suggestionId);
      setCustomSuggestions(prev => prev.map(s => s.id === suggestionId ? { ...s, votes: s.votes + 1 } : s));
    }
  };

  const handleAddSuggestion = () => {
    if (!suggestionText.trim()) return;
    const newSuggestion = {
      id: `custom-${Date.now()}`,
      text: suggestionText.trim(),
      votes: 1
    };
    setCustomSuggestions(prev => [...prev, newSuggestion]);
    setUserMoveVote(newSuggestion.id);
    setSuggestionText('');
    setShowSuggestionInput(false);
    toast({ title: 'Suggestion added!' });
  };

  // Get total votes for progress bars
  const totalMoveVotes = useMemo(() => {
    const partyVotes = Object.values(moveVotes).reduce((a, b) => a + b, 0);
    const suggestionVotes = customSuggestions.reduce((a, s) => a + s.votes, 0);
    return partyVotes + suggestionVotes;
  }, [moveVotes, customSuggestions]);

  // Get stats
  const totalMessages = chatMessages.length + chatMessages.reduce((acc, m) => acc + (m.replies?.length || 0), 0);
  const totalActivity = activities.length;
  const partyRatingsCount = activities.filter(a => a.type === 'party_rating').length;
  const fratRatingsCount = activities.filter(a => a.type === 'frat_rating').length;

  const renderVoteActions = (item: ChatItem, isReply = false) => {
    const netVotes = item.upvotes - item.downvotes;
    const isHot = netVotes >= 5;
    return (
      <div className="flex items-center gap-2 mt-3">
        <button
          onClick={() => handleChatVote(item, 1)}
          className={cn(
            "flex items-center gap-1 px-2 py-1 rounded-full text-sm transition-all",
            item.userVote === 1 
              ? 'bg-emerald-500/20 text-emerald-500' 
              : 'bg-muted/50 text-muted-foreground hover:bg-emerald-500/10 hover:text-emerald-500'
          )}
        >
          <ThumbsUp className="h-3.5 w-3.5" />
        </button>
        <span className={cn(
          "text-sm font-bold min-w-[24px] text-center",
          netVotes > 0 ? 'text-emerald-500' : netVotes < 0 ? 'text-red-500' : 'text-muted-foreground'
        )}>
          {netVotes}
        </span>
        <button
          onClick={() => handleChatVote(item, -1)}
          className={cn(
            "flex items-center gap-1 px-2 py-1 rounded-full text-sm transition-all",
            item.userVote === -1 
              ? 'bg-red-500/20 text-red-500' 
              : 'bg-muted/50 text-muted-foreground hover:bg-red-500/10 hover:text-red-500'
          )}
        >
          <ThumbsDown className="h-3.5 w-3.5" />
        </button>
        {isHot && (
          <Badge className="bg-gradient-to-r from-orange-500 to-red-500 text-white text-[10px] px-1.5 py-0">
            <Flame className="h-3 w-3 mr-0.5" />
            HOT
          </Badge>
        )}
        {!isReply && (
          <button
            onClick={() => setReplyingTo(replyingTo === item.id ? null : item.id)}
            className="flex items-center gap-1 px-2 py-1 rounded-full text-sm bg-muted/50 text-muted-foreground hover:bg-primary/10 hover:text-primary transition-all ml-auto"
          >
            <MessageCircle className="h-3.5 w-3.5" />
            <span className="text-xs">Reply</span>
          </button>
        )}
      </div>
    );
  };

  const renderActivityVoteActions = (item: ActivityItem, isReply = false) => {
    if (item.type !== 'party_comment' && item.type !== 'frat_comment') return null;
    const netVotes = (item.upvotes || 0) - (item.downvotes || 0);
    const isHot = netVotes >= 5;
    return (
      <div className="flex items-center gap-2 mt-3">
        <button
          onClick={(e) => { e.preventDefault(); handleActivityVote(item, 1); }}
          className={cn(
            "flex items-center gap-1 px-2 py-1 rounded-full text-sm transition-all",
            item.userVote === 1 
              ? 'bg-emerald-500/20 text-emerald-500' 
              : 'bg-muted/50 text-muted-foreground hover:bg-emerald-500/10 hover:text-emerald-500'
          )}
        >
          <ThumbsUp className="h-3.5 w-3.5" />
        </button>
        <span className={cn(
          "text-sm font-bold min-w-[24px] text-center",
          netVotes > 0 ? 'text-emerald-500' : netVotes < 0 ? 'text-red-500' : 'text-muted-foreground'
        )}>
          {netVotes}
        </span>
        <button
          onClick={(e) => { e.preventDefault(); handleActivityVote(item, -1); }}
          className={cn(
            "flex items-center gap-1 px-2 py-1 rounded-full text-sm transition-all",
            item.userVote === -1 
              ? 'bg-red-500/20 text-red-500' 
              : 'bg-muted/50 text-muted-foreground hover:bg-red-500/10 hover:text-red-500'
          )}
        >
          <ThumbsDown className="h-3.5 w-3.5" />
        </button>
        {isHot && (
          <Badge className="bg-gradient-to-r from-orange-500 to-red-500 text-white text-[10px] px-1.5 py-0">
            <Flame className="h-3 w-3 mr-0.5" />
            HOT
          </Badge>
        )}
        {!isReply && (
          <button
            onClick={(e) => { e.preventDefault(); setReplyingTo(replyingTo === item.id ? null : item.id); }}
            className="flex items-center gap-1 px-2 py-1 rounded-full text-sm bg-muted/50 text-muted-foreground hover:bg-primary/10 hover:text-primary transition-all ml-auto"
          >
            <MessageCircle className="h-3.5 w-3.5" />
            <span className="text-xs">Reply</span>
          </button>
        )}
      </div>
    );
  };

  const getActivityIcon = (type: ActivityType) => {
    switch (type) {
      case 'party_rating':
        return <PartyPopper className="h-4 w-4" />;
      case 'frat_rating':
        return <Trophy className="h-4 w-4" />;
      case 'party_comment':
        return <MessageCircle className="h-4 w-4" />;
      case 'frat_comment':
        return <MessageCircle className="h-4 w-4" />;
    }
  };

  const getActivityGradient = (type: ActivityType) => {
    switch (type) {
      case 'party_rating':
        return 'from-pink-500 to-rose-500';
      case 'frat_rating':
        return 'from-amber-500 to-orange-500';
      case 'party_comment':
        return 'from-violet-500 to-purple-500';
      case 'frat_comment':
        return 'from-cyan-500 to-blue-500';
    }
  };

  const getActivityLabel = (type: ActivityType) => {
    switch (type) {
      case 'party_rating':
        return 'Party Rating';
      case 'frat_rating':
        return 'Frat Rating';
      case 'party_comment':
        return 'Party Comment';
      case 'frat_comment':
        return 'Frat Comment';
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-32 rounded-2xl bg-gradient-to-r from-primary/20 to-purple-500/20 animate-pulse" />
        <div className="h-12 rounded-xl bg-muted animate-pulse" />
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-40 rounded-xl bg-muted/50 animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-8">
      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500 p-6 text-white">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZGVmcz48cGF0dGVybiBpZD0iZ3JpZCIgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiBwYXR0ZXJuVW5pdHM9InVzZXJTcGFjZU9uVXNlIj48cGF0aCBkPSJNIDQwIDAgTCAwIDAgMCA0MCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJ3aGl0ZSIgc3Ryb2tlLW9wYWNpdHk9IjAuMSIgc3Ryb2tlLXdpZHRoPSIxIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2dyaWQpIi8+PC9zdmc+')] opacity-30" />
        
        <div className="relative">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
              <Sparkles className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Activity Feed</h1>
              <p className="text-white/70 text-sm">What's happening on campus</p>
            </div>
          </div>
          
          {/* Quick Stats */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 text-center">
              <div className="flex items-center justify-center gap-1 mb-1">
                <MessagesSquare className="h-4 w-4" />
              </div>
              <p className="text-xl font-bold">{totalMessages}</p>
              <p className="text-[10px] text-white/70 uppercase tracking-wider">Messages</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 text-center">
              <div className="flex items-center justify-center gap-1 mb-1">
                <PartyPopper className="h-4 w-4" />
              </div>
              <p className="text-xl font-bold">{partyRatingsCount}</p>
              <p className="text-[10px] text-white/70 uppercase tracking-wider">Party Ratings</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 text-center">
              <div className="flex items-center justify-center gap-1 mb-1">
                <Trophy className="h-4 w-4" />
              </div>
              <p className="text-xl font-bold">{fratRatingsCount}</p>
              <p className="text-[10px] text-white/70 uppercase tracking-wider">Frat Ratings</p>
            </div>
          </div>
        </div>
      </div>

      {/* Party Countdown Section */}
      {nextParty && countdownTime && (
        <Card className="overflow-hidden border-2 border-pink-500/30">
          <div className="bg-gradient-to-r from-pink-500 via-rose-500 to-orange-500 p-4 text-white">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center animate-pulse">
                <Clock className="h-6 w-6" />
              </div>
              <div className="flex-1">
                <p className="text-xs uppercase tracking-wider text-white/80">Next Party In</p>
                <p className="font-bold text-lg">{nextParty.title}</p>
              </div>
              <Link to={createPageUrl(`Party?id=${nextParty.id}`)}>
                <Badge className="bg-white/20 hover:bg-white/30 transition-colors cursor-pointer">
                  <ChevronRight className="h-4 w-4" />
                </Badge>
              </Link>
            </div>
          </div>
          
          <div className="p-4 bg-gradient-to-b from-pink-500/5 to-transparent">
            {/* Countdown Timer */}
            <div className="grid grid-cols-4 gap-2 mb-4">
              <div className="text-center p-3 rounded-xl bg-gradient-to-br from-pink-500/10 to-rose-500/10 border border-pink-500/20">
                <p className="text-3xl font-black text-pink-500">{countdownTime.days}</p>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Days</p>
              </div>
              <div className="text-center p-3 rounded-xl bg-gradient-to-br from-rose-500/10 to-orange-500/10 border border-rose-500/20">
                <p className="text-3xl font-black text-rose-500">{countdownTime.hours.toString().padStart(2, '0')}</p>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Hours</p>
              </div>
              <div className="text-center p-3 rounded-xl bg-gradient-to-br from-orange-500/10 to-amber-500/10 border border-orange-500/20">
                <p className="text-3xl font-black text-orange-500">{countdownTime.minutes.toString().padStart(2, '0')}</p>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Mins</p>
              </div>
              <div className="text-center p-3 rounded-xl bg-gradient-to-br from-amber-500/10 to-yellow-500/10 border border-amber-500/20">
                <p className="text-3xl font-black text-amber-500 tabular-nums">{countdownTime.seconds.toString().padStart(2, '0')}</p>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Secs</p>
              </div>
            </div>
            
            {/* Party Info */}
            <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/50">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-pink-500 to-rose-500 flex items-center justify-center text-white">
                <PartyPopper className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate">{nextParty.theme || nextParty.title}</p>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <MapPin className="h-3 w-3" />
                  <span className="truncate">{nextParty.venue || 'TBA'}</span>
                  <span>•</span>
                  <Calendar className="h-3 w-3" />
                  <span>{format(new Date(nextParty.starts_at), 'EEE, MMM d @ h:mm a')}</span>
                </div>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* What's the Move Tonight Section */}
      <Card className="overflow-hidden border-2 border-violet-500/30">
        <div className="bg-gradient-to-r from-violet-600 via-purple-600 to-fuchsia-500 p-4 text-white">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
              <Vote className="h-6 w-6" />
            </div>
            <div className="flex-1">
              <p className="font-bold text-lg">What's the move tonight? 🎉</p>
              <p className="text-xs text-white/80">Vote for your pick or add a suggestion</p>
            </div>
            {totalMoveVotes > 0 && (
              <Badge className="bg-white/20">
                <Users className="h-3 w-3 mr-1" />
                {totalMoveVotes} votes
              </Badge>
            )}
          </div>
        </div>
        
        <div className="p-4 space-y-3">
          {/* Tonight's Parties */}
          {tonightsParties.length > 0 ? (
            <>
              {tonightsParties.map((party) => {
                const frat = fraternities.find(f => f.id === party.fraternity_id);
                const votes = moveVotes[party.id] || 0;
                const percentage = totalMoveVotes > 0 ? (votes / totalMoveVotes) * 100 : 0;
                const isSelected = userMoveVote === party.id;
                
                return (
                  <button
                    key={party.id}
                    onClick={() => handleMoveVote(party.id)}
                    className={cn(
                      "w-full p-4 rounded-xl border-2 transition-all text-left relative overflow-hidden group",
                      isSelected 
                        ? "border-violet-500 bg-violet-500/10 ring-2 ring-violet-500/30" 
                        : "border-muted hover:border-violet-500/50 hover:bg-muted/50"
                    )}
                  >
                    {/* Progress bar background */}
                    <div 
                      className={cn(
                        "absolute inset-0 transition-all duration-500",
                        isSelected 
                          ? "bg-gradient-to-r from-violet-500/20 to-purple-500/20" 
                          : "bg-gradient-to-r from-muted/50 to-transparent"
                      )}
                      style={{ width: `${percentage}%` }}
                    />
                    
                    <div className="relative flex items-center gap-3">
                      <div className={cn(
                        "w-10 h-10 rounded-lg flex items-center justify-center text-white transition-all",
                        isSelected 
                          ? "bg-gradient-to-br from-violet-500 to-purple-500 scale-110" 
                          : "bg-gradient-to-br from-pink-500 to-rose-500"
                      )}>
                        {isSelected ? <Check className="h-5 w-5" /> : <PartyPopper className="h-5 w-5" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={cn(
                          "font-bold text-sm transition-colors",
                          isSelected && "text-violet-600"
                        )}>
                          {party.title}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {frat?.name || 'TBA'} • {format(new Date(party.starts_at), 'h:mm a')}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className={cn(
                          "text-lg font-black",
                          isSelected ? "text-violet-500" : "text-muted-foreground"
                        )}>
                          {votes}
                        </p>
                        <p className="text-[10px] text-muted-foreground uppercase">votes</p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </>
          ) : (
            <div className="text-center py-6">
              <div className="w-16 h-16 mx-auto rounded-full bg-gradient-to-br from-violet-500/20 to-purple-500/20 flex items-center justify-center mb-3">
                <Calendar className="h-8 w-8 text-violet-500" />
              </div>
              <p className="font-semibold">No parties scheduled tonight</p>
              <p className="text-sm text-muted-foreground">Add your own suggestion below!</p>
            </div>
          )}

          {/* Custom Suggestions */}
          {customSuggestions.length > 0 && (
            <div className="space-y-2 pt-2 border-t border-muted">
              <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Suggestions</p>
              {customSuggestions.map((suggestion) => {
                const percentage = totalMoveVotes > 0 ? (suggestion.votes / totalMoveVotes) * 100 : 0;
                const isSelected = userMoveVote === suggestion.id;
                
                return (
                  <button
                    key={suggestion.id}
                    onClick={() => handleCustomSuggestionVote(suggestion.id)}
                    className={cn(
                      "w-full p-3 rounded-xl border-2 transition-all text-left relative overflow-hidden",
                      isSelected 
                        ? "border-fuchsia-500 bg-fuchsia-500/10 ring-2 ring-fuchsia-500/30" 
                        : "border-muted hover:border-fuchsia-500/50"
                    )}
                  >
                    <div 
                      className="absolute inset-0 bg-gradient-to-r from-fuchsia-500/10 to-transparent"
                      style={{ width: `${percentage}%` }}
                    />
                    <div className="relative flex items-center gap-3">
                      <div className={cn(
                        "w-8 h-8 rounded-lg flex items-center justify-center text-white",
                        isSelected 
                          ? "bg-gradient-to-br from-fuchsia-500 to-pink-500" 
                          : "bg-muted-foreground/20"
                      )}>
                        {isSelected ? <Check className="h-4 w-4" /> : <Sparkles className="h-4 w-4 text-muted-foreground" />}
                      </div>
                      <p className={cn(
                        "flex-1 font-medium text-sm",
                        isSelected && "text-fuchsia-600"
                      )}>
                        {suggestion.text}
                      </p>
                      <Badge variant={isSelected ? "default" : "secondary"} className={isSelected ? "bg-fuchsia-500" : ""}>
                        {suggestion.votes}
                      </Badge>
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {/* Add Suggestion */}
          {showSuggestionInput ? (
            <div className="flex gap-2 p-2 rounded-xl bg-muted/50">
              <Input
                value={suggestionText}
                onChange={(e) => setSuggestionText(e.target.value)}
                placeholder="Where are you going tonight?"
                className="flex-1 border-2 focus:border-fuchsia-500"
                onKeyDown={(e) => e.key === 'Enter' && handleAddSuggestion()}
              />
              <Button
                size="icon"
                onClick={handleAddSuggestion}
                disabled={!suggestionText.trim()}
                className="bg-gradient-to-r from-fuchsia-500 to-pink-500"
              >
                <Check className="h-4 w-4" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                onClick={() => { setShowSuggestionInput(false); setSuggestionText(''); }}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <Button
              variant="outline"
              className="w-full border-2 border-dashed border-fuchsia-500/50 text-fuchsia-600 hover:bg-fuchsia-500/10 hover:border-fuchsia-500"
              onClick={() => setShowSuggestionInput(true)}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add your own suggestion
            </Button>
          )}
        </div>
      </Card>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'chat' | 'house')}>
        <TabsList className="grid w-full grid-cols-2 h-14 p-1 bg-muted/50 rounded-xl">
          <TabsTrigger 
            value="chat" 
            className={cn(
              "flex items-center gap-2 rounded-lg h-full text-base font-semibold transition-all",
              activeTab === 'chat' && "bg-gradient-to-r from-violet-500 to-purple-500 text-white shadow-lg"
            )}
          >
            <MessagesSquare className="h-5 w-5" />
            Chat
            {chatMessages.length > 0 && (
              <Badge className="bg-white/20 text-white text-xs">{chatMessages.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger 
            value="house" 
            className={cn(
              "flex items-center gap-2 rounded-lg h-full text-base font-semibold transition-all",
              activeTab === 'house' && "bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg"
            )}
          >
            <Home className="h-5 w-5" />
            House
            {activities.length > 0 && (
              <Badge className="bg-white/20 text-white text-xs">{activities.length}</Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Chat Tab */}
        <TabsContent value="chat" className="mt-4 space-y-3">
          {chatMessages.length === 0 ? (
            <Card className="p-8 text-center border-2 border-dashed border-muted-foreground/20">
              <div className="w-16 h-16 mx-auto rounded-full bg-gradient-to-br from-violet-500/20 to-purple-500/20 flex items-center justify-center mb-4">
                <MessagesSquare className="h-8 w-8 text-violet-500" />
              </div>
              <p className="font-bold text-lg">No messages yet</p>
              <p className="text-sm text-muted-foreground mb-4">Be the first to start the conversation!</p>
              <Button 
                onClick={() => setShowChatComposer(true)}
                className="bg-gradient-to-r from-violet-500 to-purple-500 text-white"
              >
                <Send className="h-4 w-4 mr-2" />
                Start Chatting
              </Button>
            </Card>
          ) : (
            chatMessages.map((msg, index) => {
              const netVotes = msg.upvotes - msg.downvotes;
              const isTop = index === 0;
              const isHot = netVotes >= 5;
              
              return (
                <Card 
                  key={msg.id} 
                  className={cn(
                    "p-4 transition-all hover:shadow-md",
                    isTop && "border-l-4 border-l-violet-500",
                    isHot && "bg-gradient-to-r from-orange-500/5 to-transparent"
                  )}
                >
                  <div className="flex items-start gap-3">
                    <Avatar className={cn(
                      "h-10 w-10 ring-2",
                      isHot ? "ring-orange-500" : "ring-primary/20"
                    )}>
                      <AvatarFallback className={cn(
                        "text-white font-bold",
                        isHot 
                          ? "bg-gradient-to-br from-orange-500 to-red-500" 
                          : "bg-gradient-to-br from-violet-500 to-purple-500"
                      )}>
                        {isHot ? <Flame className="h-4 w-4" /> : <MessagesSquare className="h-4 w-4" />}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                          {formatDistanceToNow(new Date(msg.created_date), { addSuffix: true })}
                        </Badge>
                        {isTop && (
                          <Badge className="bg-gradient-to-r from-violet-500 to-purple-500 text-white text-[10px] px-1.5 py-0">
                            <Crown className="h-3 w-3 mr-0.5" />
                            Latest
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm leading-relaxed">{msg.text}</p>
                      
                      {/* Mention badge */}
                      {(msg.mentionedFraternity || msg.mentionedParty) && (
                        <Link 
                          to={msg.mentionedFraternity 
                            ? createPageUrl(`Fraternity?id=${msg.mentionedFraternity.id}`)
                            : createPageUrl(`Party?id=${msg.mentionedParty?.id}`)
                          }
                          className="inline-flex items-center gap-1 mt-2 px-3 py-1.5 rounded-full bg-gradient-to-r from-primary/10 to-purple-500/10 text-primary text-xs font-medium hover:from-primary/20 hover:to-purple-500/20 transition-all"
                        >
                          <AtSign className="h-3 w-3" />
                          {msg.mentionedFraternity?.name || msg.mentionedParty?.title}
                        </Link>
                      )}

                      {renderVoteActions(msg)}

                      {/* Reply input */}
                      {replyingTo === msg.id && (
                        <div className="mt-3 flex gap-2 p-3 rounded-lg bg-muted/30">
                          <Textarea
                            value={replyText}
                            onChange={(e) => setReplyText(e.target.value)}
                            placeholder="Write a reply..."
                            className="min-h-[60px] text-sm bg-background"
                          />
                          <Button
                            size="icon"
                            onClick={() => handleChatReply(msg.id)}
                            disabled={submittingReply || !replyText.trim()}
                            className="bg-gradient-to-r from-violet-500 to-purple-500"
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
                        <div className="mt-3 pl-4 border-l-2 border-violet-500/30 space-y-3">
                          {msg.replies.map((reply) => (
                            <div key={reply.id} className="text-sm">
                              <Badge variant="secondary" className="text-[10px] px-1.5 py-0 mb-1">
                                {formatDistanceToNow(new Date(reply.created_date), { addSuffix: true })}
                              </Badge>
                              <p className="p-3 bg-muted/30 rounded-lg">{reply.text}</p>
                              {renderVoteActions(reply, true)}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </Card>
              );
            })
          )}
        </TabsContent>

        {/* House Tab */}
        <TabsContent value="house" className="mt-4 space-y-3">
          {activities.length === 0 ? (
            <Card className="p-8 text-center border-2 border-dashed border-muted-foreground/20">
              <div className="w-16 h-16 mx-auto rounded-full bg-gradient-to-br from-amber-500/20 to-orange-500/20 flex items-center justify-center mb-4">
                <TrendingUp className="h-8 w-8 text-amber-500" />
              </div>
              <p className="font-bold text-lg">No activity yet</p>
              <p className="text-sm text-muted-foreground mb-4">Be the first to rate a party or frat!</p>
              <div className="flex gap-2 justify-center">
                <Button asChild variant="outline">
                  <Link to="/Parties">
                    <PartyPopper className="h-4 w-4 mr-2" />
                    Browse Parties
                  </Link>
                </Button>
                <Button asChild className="bg-gradient-to-r from-amber-500 to-orange-500 text-white">
                  <Link to="/Leaderboard">
                    <Trophy className="h-4 w-4 mr-2" />
                    View Frats
                  </Link>
                </Button>
              </div>
            </Card>
          ) : (
            activities.map((item, index) => {
              const isTop = index === 0;
              const gradient = getActivityGradient(item.type);
              
              return (
                <Card 
                  key={item.id} 
                  className={cn(
                    "overflow-hidden transition-all hover:shadow-md",
                    isTop && "ring-2 ring-amber-500/50"
                  )}
                >
                  {/* Activity Type Header */}
                  <div className={cn(
                    "px-4 py-2 flex items-center gap-2 text-white bg-gradient-to-r",
                    gradient
                  )}>
                    {getActivityIcon(item.type)}
                    <span className="font-semibold text-sm">{getActivityLabel(item.type)}</span>
                    <span className="text-white/70 text-xs ml-auto">
                      {formatDistanceToNow(new Date(item.created_date), { addSuffix: true })}
                    </span>
                    {(item.type === 'party_rating' || item.type === 'frat_rating') && item.score && (
                      <Badge className={cn(
                        "font-bold text-white",
                        getScoreBgColor(item.score)
                      )}>
                        {item.score.toFixed(1)}
                      </Badge>
                    )}
                  </div>
                  
                  <div className="p-4">
                    <Link 
                      to={item.party ? createPageUrl(`Party?id=${item.party.id}`) : createPageUrl(`Fraternity?id=${item.fraternity?.id}`)}
                      className="flex items-center justify-between p-3 rounded-xl bg-muted/50 hover:bg-muted transition-all mb-3 group"
                    >
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "w-10 h-10 rounded-xl flex items-center justify-center text-white bg-gradient-to-br",
                          gradient
                        )}>
                          {item.type.includes('party') ? (
                            <PartyPopper className="h-5 w-5" />
                          ) : (
                            <Trophy className="h-5 w-5" />
                          )}
                        </div>
                        <div>
                          <p className="font-bold text-sm group-hover:text-primary transition-colors">
                            {item.type.includes('party') ? item.party?.title : item.fraternity?.name}
                          </p>
                          {item.fraternity && item.type.includes('party') && (
                            <p className="text-xs text-muted-foreground">{item.fraternity.name}</p>
                          )}
                        </div>
                      </div>
                      <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                    </Link>

                    {item.type === 'party_rating' && (
                      <div className="grid grid-cols-3 gap-2 text-center">
                        <div className="p-2 rounded-lg bg-pink-500/10">
                          <Zap className="h-4 w-4 mx-auto text-pink-500 mb-1" />
                          <p className={cn("font-bold text-sm", getScoreColor(item.vibe || 0))}>{item.vibe?.toFixed(1)}</p>
                          <p className="text-[10px] text-muted-foreground uppercase">Vibe</p>
                        </div>
                        <div className="p-2 rounded-lg bg-violet-500/10">
                          <Star className="h-4 w-4 mx-auto text-violet-500 mb-1" />
                          <p className={cn("font-bold text-sm", getScoreColor(item.music || 0))}>{item.music?.toFixed(1)}</p>
                          <p className="text-[10px] text-muted-foreground uppercase">Music</p>
                        </div>
                        <div className="p-2 rounded-lg bg-cyan-500/10">
                          <TrendingUp className="h-4 w-4 mx-auto text-cyan-500 mb-1" />
                          <p className={cn("font-bold text-sm", getScoreColor(item.execution || 0))}>{item.execution?.toFixed(1)}</p>
                          <p className="text-[10px] text-muted-foreground uppercase">Execution</p>
                        </div>
                      </div>
                    )}

                    {item.type === 'frat_rating' && (
                      <div className="grid grid-cols-3 gap-2 text-center">
                        <div className="p-2 rounded-lg bg-amber-500/10">
                          <Users className="h-4 w-4 mx-auto text-amber-500 mb-1" />
                          <p className={cn("font-bold text-sm", getScoreColor(item.brotherhood || 0))}>{item.brotherhood?.toFixed(1)}</p>
                          <p className="text-[10px] text-muted-foreground uppercase">Brotherhood</p>
                        </div>
                        <div className="p-2 rounded-lg bg-emerald-500/10">
                          <Shield className="h-4 w-4 mx-auto text-emerald-500 mb-1" />
                          <p className={cn("font-bold text-sm", getScoreColor(item.reputation || 0))}>{item.reputation?.toFixed(1)}</p>
                          <p className="text-[10px] text-muted-foreground uppercase">Rep</p>
                        </div>
                        <div className="p-2 rounded-lg bg-rose-500/10">
                          <Heart className="h-4 w-4 mx-auto text-rose-500 mb-1" />
                          <p className={cn("font-bold text-sm", getScoreColor(item.community || 0))}>{item.community?.toFixed(1)}</p>
                          <p className="text-[10px] text-muted-foreground uppercase">Community</p>
                        </div>
                      </div>
                    )}

                    {item.text && (
                      <div className="mt-3 p-3 bg-muted/30 rounded-xl border-l-4 border-l-primary/50">
                        <p className="text-sm italic">"{item.text}"</p>
                      </div>
                    )}

                    {renderActivityVoteActions(item)}

                    {replyingTo === item.id && (item.type === 'party_comment' || item.type === 'frat_comment') && (
                      <div className="mt-3 flex gap-2 p-3 rounded-lg bg-muted/30">
                        <Textarea
                          value={replyText}
                          onChange={(e) => setReplyText(e.target.value)}
                          placeholder="Write a reply..."
                          className="min-h-[60px] text-sm bg-background"
                        />
                        <Button
                          size="icon"
                          onClick={() => handleActivityReply(item)}
                          disabled={submittingReply || !replyText.trim()}
                          className="bg-gradient-to-r from-amber-500 to-orange-500"
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
                      <div className="mt-3 pl-4 border-l-2 border-amber-500/30 space-y-3">
                        {item.replies.map((reply) => (
                          <div key={reply.id} className="text-sm">
                            <Badge variant="secondary" className="text-[10px] px-1.5 py-0 mb-1">
                              {formatDistanceToNow(new Date(reply.created_date), { addSuffix: true })}
                            </Badge>
                            <p className="p-3 bg-muted/30 rounded-lg">{reply.text}</p>
                            {renderActivityVoteActions(reply, true)}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </Card>
              );
            })
          )}
        </TabsContent>
      </Tabs>

      {/* Floating Chat Button - Only on Chat tab */}
      {activeTab === 'chat' && (
        <button
          onClick={() => setShowChatComposer(true)}
          className="fixed bottom-24 right-4 z-50 flex items-center gap-2 px-5 py-3 rounded-full bg-gradient-to-r from-violet-500 to-purple-500 text-white shadow-lg shadow-violet-500/30 active:scale-95 transition-transform hover:shadow-xl hover:shadow-violet-500/40"
          style={{ marginBottom: 'env(safe-area-inset-bottom)' }}
        >
          <Sparkles className="h-5 w-5" />
          <span className="font-bold">New Post</span>
        </button>
      )}

      {/* Chat Composer Sheet */}
      <Sheet open={showChatComposer} onOpenChange={setShowChatComposer}>
        <SheetContent side="bottom" className="rounded-t-3xl h-[70vh]">
          <SheetHeader className="text-left pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-500 flex items-center justify-center text-white">
                <Send className="h-5 w-5" />
              </div>
              <div>
                <SheetTitle className="text-xl">New Message</SheetTitle>
                <p className="text-xs text-muted-foreground">Share what's on your mind</p>
              </div>
            </div>
          </SheetHeader>

          <div className="space-y-4">
            <Textarea
              value={chatText}
              onChange={(e) => setChatText(e.target.value)}
              placeholder="What's on your mind?"
              className="min-h-[120px] text-base border-2 focus:border-violet-500 transition-colors"
            />

            {/* Selected mention */}
            {selectedMention && (
              <div className="flex items-center gap-2">
                <Badge className="flex items-center gap-1 bg-gradient-to-r from-primary/10 to-purple-500/10 text-primary border-0">
                  <AtSign className="h-3 w-3" />
                  {selectedMention.name}
                  <button onClick={() => setSelectedMention(null)} className="ml-1 hover:text-destructive">
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
                className="border-2 hover:border-amber-500 hover:text-amber-500 transition-colors"
              >
                <AtSign className="h-4 w-4 mr-1" />
                Mention Frat
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => { setMentionType('party'); setShowMentionPicker(true); }}
                className="border-2 hover:border-pink-500 hover:text-pink-500 transition-colors"
              >
                <AtSign className="h-4 w-4 mr-1" />
                Mention Party
              </Button>
            </div>

            {/* Mention picker */}
            {showMentionPicker && (
              <Card className="p-2 max-h-40 overflow-y-auto border-2">
                <div className="space-y-1">
                  {mentionType === 'frat' && fraternities.map((frat) => (
                    <button
                      key={frat.id}
                      onClick={() => {
                        setSelectedMention({ type: 'frat', id: frat.id, name: frat.name });
                        setShowMentionPicker(false);
                      }}
                      className="w-full text-left px-3 py-2 rounded-lg hover:bg-amber-500/10 hover:text-amber-600 transition-colors text-sm font-medium flex items-center gap-2"
                    >
                      <Trophy className="h-4 w-4 text-amber-500" />
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
                      className="w-full text-left px-3 py-2 rounded-lg hover:bg-pink-500/10 hover:text-pink-600 transition-colors text-sm font-medium flex items-center gap-2"
                    >
                      <PartyPopper className="h-4 w-4 text-pink-500" />
                      {party.title}
                    </button>
                  ))}
                </div>
              </Card>
            )}

            <Button
              className="w-full h-12 text-base font-bold bg-gradient-to-r from-violet-500 to-purple-500 hover:from-violet-600 hover:to-purple-600 transition-all shadow-lg shadow-violet-500/30"
              onClick={handleSubmitChat}
              disabled={submittingChat || !chatText.trim()}
            >
              {submittingChat ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <>
                  <Send className="h-5 w-5 mr-2" />
                  Post Message
                </>
              )}
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
