import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
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
  Vote,
  Plus,
  Check,
  MapPin,
  Radio,
  Bell,
  CheckCircle,
  Book,
  Moon,
  Beer,
  Coffee
} from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
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
  
  // Frat ranking post mode
  const [showFratRankingPicker, setShowFratRankingPicker] = useState(false);
  const [fratRanking, setFratRanking] = useState<Record<string, Fraternity | null>>({
    'Upper Touse': null,
    'Touse': null,
    'Lower Touse': null,
    'Upper Mouse': null,
    'Mouse 1': null,
    'Mouse 2': null,
    'Lower Mouse': null,
    'Upper Bouse': null,
    'Bouse': null,
    'Lower Bouse': null,
  });
  
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
  
  // Unread notification state
  const [hasUnread, setHasUnread] = useState(true);
  const [lastSeenFeedCount, setLastSeenFeedCount] = useState(0);
  
  // "All caught up" state
  const [showCaughtUp, setShowCaughtUp] = useState(false);
  const [caughtUpClaimed, setCaughtUpClaimed] = useState(false);
  const [userPoints, setUserPoints] = useState(() => {
    const saved = localStorage.getItem('userPoints');
    return saved ? parseInt(saved, 10) : 0;
  });
  const feedEndRef = useRef<HTMLDivElement>(null);
  
  // Default activity options for "What's the move"
  const defaultMoveOptions = [
    { id: 'shooters', label: 'Shooters', icon: Beer },
    { id: 'devines', label: 'Devines', icon: Coffee },
    { id: 'study', label: 'Study', icon: Book },
    { id: 'sleep', label: 'Sleep', icon: Moon },
  ];

  // Get live and upcoming parties for stories
  const liveParties = useMemo(() => {
    return parties.filter(p => (p.status as string) === 'active' || (p.status as string) === 'live');
  }, [parties]);

  const upcomingParties = useMemo(() => {
    const now = new Date();
    return parties
      .filter(p => p.status === 'upcoming' && new Date(p.starts_at) > now)
      .sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime())
      .slice(0, 6);
  }, [parties]);

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
    const tomorrowMorning = new Date(tonight.getTime() + 24 * 60 * 60 * 1000 + 6 * 60 * 60 * 1000);
    
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

  // Handle voting for "What's the move"
  const handleMoveVote = async (partyId: string) => {
    const user = await base44.auth.me();
    if (!user) {
      toast({ title: 'Please sign in to vote', variant: 'destructive' });
      return;
    }

    if (userMoveVote === partyId) {
      setUserMoveVote(null);
      setMoveVotes(prev => ({ ...prev, [partyId]: Math.max(0, (prev[partyId] || 1) - 1) }));
    } else {
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

  const totalMoveVotes = useMemo(() => {
    const partyVotes = Object.values(moveVotes).reduce((a, b) => a + b, 0);
    const suggestionVotes = customSuggestions.reduce((a, s) => a + s.votes, 0);
    return partyVotes + suggestionVotes;
  }, [moveVotes, customSuggestions]);

  // Combine all feed items (chat + activities) sorted by date
  const feedItems = useMemo(() => {
    const allItems: Array<{ type: 'chat' | 'activity'; item: ChatItem | ActivityItem; date: Date }> = [];
    
    chatMessages.forEach(msg => {
      allItems.push({ type: 'chat', item: msg, date: new Date(msg.created_date) });
    });
    
    activities.forEach(act => {
      allItems.push({ type: 'activity', item: act, date: new Date(act.created_date) });
    });
    
    return allItems.sort((a, b) => b.date.getTime() - a.date.getTime());
  }, [chatMessages, activities]);

  // Filter feed items to last 24 hours for "caught up" feature
  const feedItemsLast24h = useMemo(() => {
    const now = new Date();
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    return feedItems.filter(item => item.date >= yesterday);
  }, [feedItems]);
  
  // Handle "All caught up" detection via intersection observer
  const handleFeedEndVisible = useCallback((entries: IntersectionObserverEntry[]) => {
    const [entry] = entries;
    if (entry.isIntersecting && feedItemsLast24h.length > 0 && !caughtUpClaimed) {
      setShowCaughtUp(true);
      setHasUnread(false);
    }
  }, [feedItemsLast24h.length, caughtUpClaimed]);
  
  useEffect(() => {
    const observer = new IntersectionObserver(handleFeedEndVisible, { threshold: 0.1 });
    if (feedEndRef.current) {
      observer.observe(feedEndRef.current);
    }
    return () => observer.disconnect();
  }, [handleFeedEndVisible]);
  
  // Mark unread when new items appear
  useEffect(() => {
    if (feedItems.length > lastSeenFeedCount && lastSeenFeedCount > 0) {
      setHasUnread(true);
      setShowCaughtUp(false);
    }
    setLastSeenFeedCount(feedItems.length);
  }, [feedItems.length, lastSeenFeedCount]);
  
  // Clear unread when user clicks the notification
  const handleClearUnread = () => {
    setHasUnread(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  
  // Claim caught up points
  const handleClaimPoints = () => {
    const newPoints = userPoints + 10;
    setUserPoints(newPoints);
    localStorage.setItem('userPoints', newPoints.toString());
    setCaughtUpClaimed(true);
    toast({ 
      title: '+10 Points!', 
      description: "You're all caught up for today!",
    });
  };

  const getActivityIcon = (type: ActivityType) => {
    switch (type) {
      case 'party_rating':
        return <Star className="h-4 w-4" />;
      case 'frat_rating':
        return <Trophy className="h-4 w-4" />;
      case 'party_comment':
      case 'frat_comment':
        return <MessageCircle className="h-4 w-4" />;
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {/* Stories skeleton */}
        <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="w-20 h-24 rounded-2xl shrink-0" />
          ))}
        </div>
        {/* Feed skeleton */}
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-32 rounded-2xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-5 pb-24">
      {/* Stories-style horizontal scroll for live/upcoming */}
      {(liveParties.length > 0 || upcomingParties.length > 0) && (
        <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar -mx-4 px-4">
          {/* Live parties first */}
          {liveParties.map((party) => {
            const frat = fraternities.find(f => f.id === party.fraternity_id);
            return (
              <Link
                key={party.id}
                to={createPageUrl(`Party?id=${party.id}`)}
                className="shrink-0 group"
              >
                <div className="relative w-20 h-28 rounded-2xl overflow-hidden ring-[3px] ring-red-500 ring-offset-2 ring-offset-background">
                  <div className="absolute inset-0 bg-gradient-to-br from-red-500 via-pink-500 to-purple-600" />
                  <div className="absolute inset-0 flex flex-col items-center justify-center p-2 text-white">
                    <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur flex items-center justify-center mb-1">
                      <Radio className="h-5 w-5 animate-pulse" />
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-wide">LIVE</span>
                  </div>
                  <div className="absolute bottom-0 inset-x-0 p-1.5 bg-black/60 backdrop-blur-sm">
                    <p className="text-[10px] font-semibold text-white text-center truncate">{frat?.name || 'Party'}</p>
                  </div>
                </div>
              </Link>
            );
          })}
          
          {/* Upcoming parties */}
          {upcomingParties.map((party) => {
            const frat = fraternities.find(f => f.id === party.fraternity_id);
            const partyDate = new Date(party.starts_at);
            const isPartyToday = isToday(partyDate);
            const isPartyTomorrow = isTomorrow(partyDate);
            
            return (
              <Link
                key={party.id}
                to={createPageUrl(`Party?id=${party.id}`)}
                className="shrink-0 group"
              >
                <div className="relative w-20 h-28 rounded-2xl overflow-hidden ring-2 ring-border hover:ring-primary/50 transition-all">
                  <div className="absolute inset-0 bg-gradient-to-br from-violet-500 via-purple-500 to-fuchsia-500 opacity-80" />
                  <div className="absolute inset-0 flex flex-col items-center justify-center p-2 text-white">
                    <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur flex items-center justify-center mb-1">
                      <PartyPopper className="h-5 w-5" />
                    </div>
                    <span className="text-[10px] font-semibold text-center">
                      {isPartyToday ? 'Tonight' : isPartyTomorrow ? 'Tomorrow' : format(partyDate, 'EEE')}
                    </span>
                  </div>
                  <div className="absolute bottom-0 inset-x-0 p-1.5 bg-black/60 backdrop-blur-sm">
                    <p className="text-[10px] font-semibold text-white text-center truncate">{frat?.name || party.title}</p>
                  </div>
                </div>
              </Link>
            );
          })}
          
          {/* Add party CTA */}
          <Link to="/Parties" className="shrink-0">
            <div className="w-20 h-28 rounded-2xl border-2 border-dashed border-muted-foreground/30 flex flex-col items-center justify-center text-muted-foreground hover:border-primary hover:text-primary transition-all">
              <Plus className="h-6 w-6 mb-1" />
              <span className="text-[10px] font-medium">See all</span>
            </div>
          </Link>
        </div>
      )}

      {/* What's the move tonight? - Always visible poll */}
      <div className="rounded-3xl overflow-hidden bg-gradient-to-br from-violet-600 via-purple-600 to-fuchsia-600 p-[2px]">
        <div className="rounded-[22px] bg-card p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center text-white animate-pulse">
              <Vote className="h-6 w-6" />
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-bold">What's the move tonight?</h2>
              <p className="text-sm text-muted-foreground">
                {totalMoveVotes > 0 ? `${totalMoveVotes} votes · See what everyone's doing` : 'Vote and see what others are up to'}
              </p>
            </div>
            {userMoveVote && (
              <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center text-white">
                <Check className="h-4 w-4" />
              </div>
            )}
          </div>
          
          <div className="space-y-2">
            {/* Tonight's parties */}
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
                    "w-full min-h-[52px] p-3 rounded-2xl border-2 transition-all text-left relative overflow-hidden active:scale-[0.98]",
                    isSelected 
                      ? "border-violet-500 bg-violet-500/10" 
                      : "border-border hover:border-violet-500/50"
                  )}
                >
                  {userMoveVote && (
                    <div 
                      className="absolute inset-0 bg-gradient-to-r from-violet-500/20 to-transparent transition-all duration-500"
                      style={{ width: `${percentage}%` }}
                    />
                  )}
                  <div className="relative flex items-center gap-3">
                    <div className={cn(
                      "w-9 h-9 rounded-xl flex items-center justify-center shrink-0",
                      isSelected 
                        ? "bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white" 
                        : "bg-muted text-muted-foreground"
                    )}>
                      {isSelected ? <Check className="h-4 w-4" /> : <PartyPopper className="h-4 w-4" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm truncate">{party.title}</p>
                      <p className="text-xs text-muted-foreground truncate">{frat?.name} · {format(new Date(party.starts_at), 'h:mm a')}</p>
                    </div>
                    {userMoveVote && (
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold">{percentage.toFixed(0)}%</span>
                        <Badge variant="secondary" className="text-xs">{votes}</Badge>
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
            
            {/* Default options - Shooters, Devines, Study, Sleep */}
            {defaultMoveOptions.map((option) => {
              const votes = moveVotes[option.id] || 0;
              const percentage = totalMoveVotes > 0 ? (votes / totalMoveVotes) * 100 : 0;
              const isSelected = userMoveVote === option.id;
              const Icon = option.icon;
              
              return (
                <button
                  key={option.id}
                  onClick={() => handleMoveVote(option.id)}
                  className={cn(
                    "w-full min-h-[52px] p-3 rounded-2xl border-2 transition-all text-left relative overflow-hidden active:scale-[0.98]",
                    isSelected 
                      ? "border-fuchsia-500 bg-fuchsia-500/10" 
                      : "border-border hover:border-fuchsia-500/50"
                  )}
                >
                  {userMoveVote && (
                    <div 
                      className="absolute inset-0 bg-gradient-to-r from-fuchsia-500/20 to-transparent transition-all duration-500"
                      style={{ width: `${percentage}%` }}
                    />
                  )}
                  <div className="relative flex items-center gap-3">
                    <div className={cn(
                      "w-9 h-9 rounded-xl flex items-center justify-center shrink-0",
                      isSelected 
                        ? "bg-gradient-to-br from-fuchsia-500 to-pink-500 text-white" 
                        : "bg-muted text-muted-foreground"
                    )}>
                      {isSelected ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                    </div>
                    <p className="flex-1 font-semibold text-sm">{option.label}</p>
                    {userMoveVote && (
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold">{percentage.toFixed(0)}%</span>
                        <Badge variant="secondary" className="text-xs">{votes}</Badge>
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
            
            {/* Custom suggestions */}
            {customSuggestions.map((suggestion) => {
              const votes = suggestion.votes;
              const percentage = totalMoveVotes > 0 ? (votes / totalMoveVotes) * 100 : 0;
              const isSelected = userMoveVote === suggestion.id;
              
              return (
                <button
                  key={suggestion.id}
                  onClick={() => handleCustomSuggestionVote(suggestion.id)}
                  className={cn(
                    "w-full min-h-[52px] p-3 rounded-2xl border-2 transition-all text-left relative overflow-hidden active:scale-[0.98]",
                    isSelected 
                      ? "border-pink-500 bg-pink-500/10" 
                      : "border-border hover:border-pink-500/50"
                  )}
                >
                  {userMoveVote && (
                    <div 
                      className="absolute inset-0 bg-gradient-to-r from-pink-500/20 to-transparent transition-all duration-500"
                      style={{ width: `${percentage}%` }}
                    />
                  )}
                  <div className="relative flex items-center gap-3">
                    <div className={cn(
                      "w-9 h-9 rounded-xl flex items-center justify-center shrink-0",
                      isSelected 
                        ? "bg-gradient-to-br from-pink-500 to-rose-500 text-white" 
                        : "bg-muted text-muted-foreground"
                    )}>
                      {isSelected ? <Check className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />}
                    </div>
                    <p className="flex-1 font-semibold text-sm truncate">{suggestion.text}</p>
                    {userMoveVote && (
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold">{percentage.toFixed(0)}%</span>
                        <Badge variant="secondary" className="text-xs">{votes}</Badge>
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
            
            {/* Add custom suggestion */}
            {showSuggestionInput ? (
              <div className="flex gap-2">
                <Input
                  value={suggestionText}
                  onChange={(e) => setSuggestionText(e.target.value)}
                  placeholder="Something else?"
                  className="flex-1 h-11 rounded-xl text-sm"
                  onKeyDown={(e) => e.key === 'Enter' && handleAddSuggestion()}
                  autoFocus
                />
                <Button
                  onClick={handleAddSuggestion}
                  disabled={!suggestionText.trim()}
                  size="sm"
                  className="h-11 w-11 rounded-xl bg-gradient-to-r from-fuchsia-500 to-pink-500"
                >
                  <Check className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => { setShowSuggestionInput(false); setSuggestionText(''); }}
                  className="h-11 w-11 rounded-xl"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <button
                onClick={() => setShowSuggestionInput(true)}
                className="w-full min-h-[44px] p-3 rounded-2xl border-2 border-dashed border-muted-foreground/30 flex items-center justify-center gap-2 text-muted-foreground hover:border-fuchsia-500 hover:text-fuchsia-500 transition-all active:scale-[0.98]"
              >
                <Plus className="h-4 w-4" />
                <span className="font-medium text-sm">Something else</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Next party countdown - compact */}
      {nextParty && countdownTime && (
        <Link to={createPageUrl(`Party?id=${nextParty.id}`)}>
          <div className="rounded-2xl bg-gradient-to-r from-pink-500 via-rose-500 to-orange-500 p-4 text-white active:scale-[0.99] transition-transform">
            <div className="flex items-center gap-4">
              <div className="flex-1 min-w-0">
                <p className="text-xs uppercase tracking-wider text-white/80 mb-1">Next up</p>
                <p className="font-bold text-lg truncate">{nextParty.title}</p>
                <p className="text-sm text-white/80 truncate">{fraternities.find(f => f.id === nextParty.fraternity_id)?.name}</p>
              </div>
              <div className="flex items-center gap-2 text-right">
                <div className="text-center">
                  <p className="text-2xl font-black tabular-nums">{countdownTime.hours.toString().padStart(2, '0')}</p>
                  <p className="text-[10px] uppercase text-white/60">hr</p>
                </div>
                <span className="text-xl font-bold">:</span>
                <div className="text-center">
                  <p className="text-2xl font-black tabular-nums">{countdownTime.minutes.toString().padStart(2, '0')}</p>
                  <p className="text-[10px] uppercase text-white/60">min</p>
                </div>
                <span className="text-xl font-bold">:</span>
                <div className="text-center">
                  <p className="text-2xl font-black tabular-nums">{countdownTime.seconds.toString().padStart(2, '0')}</p>
                  <p className="text-[10px] uppercase text-white/60">sec</p>
                </div>
              </div>
            </div>
          </div>
        </Link>
      )}

      {/* Unified Feed */}
      <div className="space-y-4">
        {feedItems.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-20 h-20 mx-auto rounded-full bg-muted/50 flex items-center justify-center mb-4">
              <Sparkles className="h-10 w-10 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-bold mb-2">Nothing happening yet</h3>
            <p className="text-muted-foreground mb-6">Be the first to share what's going on!</p>
            <Button 
              onClick={() => setShowChatComposer(true)}
              size="lg"
              className="rounded-full px-8 bg-gradient-to-r from-violet-500 to-purple-500"
            >
              <Send className="h-5 w-5 mr-2" />
              Start the convo
            </Button>
          </div>
        ) : (
          feedItems.map(({ type, item }) => {
            if (type === 'chat') {
              const chatItem = item as ChatItem;
              const netVotes = chatItem.upvotes - chatItem.downvotes;
              const isHot = netVotes >= 5;
              
              return (
                <div 
                  key={`chat-${chatItem.id}`} 
                  className={cn(
                    "rounded-2xl bg-card p-5 border transition-all",
                    isHot && "border-orange-500/50 bg-gradient-to-br from-orange-500/5 to-transparent"
                  )}
                >
                  <div className="flex items-start gap-3">
                    <Avatar className={cn(
                      "h-11 w-11 ring-2 shrink-0",
                      isHot ? "ring-orange-500" : "ring-border"
                    )}>
                      <AvatarFallback className={cn(
                        "text-white font-bold",
                        isHot 
                          ? "bg-gradient-to-br from-orange-500 to-red-500" 
                          : "bg-gradient-to-br from-violet-500 to-purple-500"
                      )}>
                        {isHot ? <Flame className="h-5 w-5" /> : <MessagesSquare className="h-5 w-5" />}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <span className="text-sm text-muted-foreground">
                          {formatDistanceToNow(new Date(chatItem.created_date), { addSuffix: true })}
                        </span>
                        {isHot && (
                          <Badge className="bg-gradient-to-r from-orange-500 to-red-500 text-white text-xs px-2 py-0.5">
                            <Flame className="h-3 w-3 mr-1" />
                            Hot
                          </Badge>
                        )}
                      </div>
                      <p className="text-base leading-relaxed mb-3">{chatItem.text}</p>
                      
                      {(chatItem.mentionedFraternity || chatItem.mentionedParty) && (
                        <Link 
                          to={chatItem.mentionedFraternity 
                            ? createPageUrl(`Fraternity?id=${chatItem.mentionedFraternity.id}`)
                            : createPageUrl(`Party?id=${chatItem.mentionedParty?.id}`)
                          }
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium hover:bg-primary/20 transition-all mb-3"
                        >
                          <AtSign className="h-3.5 w-3.5" />
                          {chatItem.mentionedFraternity?.name || chatItem.mentionedParty?.title}
                        </Link>
                      )}
                      
                      {/* Vote actions - large tap targets */}
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => handleChatVote(chatItem, 1)}
                          className={cn(
                            "min-h-[44px] min-w-[44px] flex items-center justify-center gap-2 px-4 rounded-full text-sm font-medium transition-all active:scale-95",
                            chatItem.userVote === 1 
                              ? 'bg-emerald-500 text-white' 
                              : 'bg-muted hover:bg-emerald-500/20 text-muted-foreground hover:text-emerald-500'
                          )}
                        >
                          <ThumbsUp className="h-5 w-5" />
                          {chatItem.upvotes > 0 && <span>{chatItem.upvotes}</span>}
                        </button>
                        <button
                          onClick={() => handleChatVote(chatItem, -1)}
                          className={cn(
                            "min-h-[44px] min-w-[44px] flex items-center justify-center gap-2 px-4 rounded-full text-sm font-medium transition-all active:scale-95",
                            chatItem.userVote === -1 
                              ? 'bg-red-500 text-white' 
                              : 'bg-muted hover:bg-red-500/20 text-muted-foreground hover:text-red-500'
                          )}
                        >
                          <ThumbsDown className="h-5 w-5" />
                          {chatItem.downvotes > 0 && <span>{chatItem.downvotes}</span>}
                        </button>
                        <button
                          onClick={() => setReplyingTo(replyingTo === chatItem.id ? null : chatItem.id)}
                          className="min-h-[44px] min-w-[44px] flex items-center justify-center gap-2 px-4 rounded-full text-sm font-medium bg-muted hover:bg-primary/20 text-muted-foreground hover:text-primary transition-all active:scale-95 ml-auto"
                        >
                          <MessageCircle className="h-5 w-5" />
                          {chatItem.replies && chatItem.replies.length > 0 && (
                            <span>{chatItem.replies.length}</span>
                          )}
                        </button>
                      </div>
                      
                      {/* Reply input */}
                      {replyingTo === chatItem.id && (
                        <div className="mt-4 flex gap-2">
                          <Textarea
                            value={replyText}
                            onChange={(e) => setReplyText(e.target.value)}
                            placeholder="Write a reply..."
                            className="min-h-[60px] text-base rounded-xl"
                          />
                          <Button
                            onClick={() => handleChatReply(chatItem.id)}
                            disabled={submittingReply || !replyText.trim()}
                            className="h-auto rounded-xl bg-gradient-to-r from-violet-500 to-purple-500"
                          >
                            {submittingReply ? (
                              <Loader2 className="h-5 w-5 animate-spin" />
                            ) : (
                              <Send className="h-5 w-5" />
                            )}
                          </Button>
                        </div>
                      )}
                      
                      {/* Replies */}
                      {chatItem.replies && chatItem.replies.length > 0 && (
                        <div className="mt-4 pl-4 border-l-2 border-violet-500/30 space-y-3">
                          {chatItem.replies.map((reply) => (
                            <div key={reply.id} className="py-2">
                              <p className="text-sm text-muted-foreground mb-1">
                                {formatDistanceToNow(new Date(reply.created_date), { addSuffix: true })}
                              </p>
                              <p className="text-sm p-3 bg-muted/50 rounded-xl">{reply.text}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            } else {
              const activityItem = item as ActivityItem;
              const isRating = activityItem.type === 'party_rating' || activityItem.type === 'frat_rating';
              
              return (
                <Link 
                  key={`activity-${activityItem.id}`}
                  to={activityItem.party 
                    ? createPageUrl(`Party?id=${activityItem.party.id}`) 
                    : createPageUrl(`Fraternity?id=${activityItem.fraternity?.id}`)
                  }
                >
                  <div className="rounded-2xl bg-card p-5 border hover:border-primary/50 transition-all active:scale-[0.99]">
                    <div className="flex items-start gap-3">
                      <div className={cn(
                        "w-11 h-11 rounded-xl flex items-center justify-center text-white shrink-0",
                        activityItem.type === 'party_rating' && "bg-gradient-to-br from-pink-500 to-rose-500",
                        activityItem.type === 'frat_rating' && "bg-gradient-to-br from-amber-500 to-orange-500",
                        activityItem.type === 'party_comment' && "bg-gradient-to-br from-violet-500 to-purple-500",
                        activityItem.type === 'frat_comment' && "bg-gradient-to-br from-cyan-500 to-blue-500"
                      )}>
                        {getActivityIcon(activityItem.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm text-muted-foreground">
                            {formatDistanceToNow(new Date(activityItem.created_date), { addSuffix: true })}
                          </span>
                          {isRating && activityItem.score && (
                            <Badge className={cn(
                              "text-white font-bold",
                              getScoreBgColor(activityItem.score)
                            )}>
                              {activityItem.score.toFixed(1)}
                            </Badge>
                          )}
                        </div>
                        <p className="font-semibold text-base mb-1">
                          {activityItem.type.includes('party') ? activityItem.party?.title : activityItem.fraternity?.name}
                        </p>
                        {activityItem.fraternity && activityItem.type.includes('party') && (
                          <p className="text-sm text-muted-foreground">{activityItem.fraternity.name}</p>
                        )}
                        {activityItem.text && (
                          <p className="text-sm mt-2 text-muted-foreground line-clamp-2">{activityItem.text}</p>
                        )}
                        
                        {/* Score breakdown for ratings */}
                        {activityItem.type === 'party_rating' && (
                          <div className="flex items-center gap-4 mt-3 text-sm">
                            <div className="flex items-center gap-1">
                              <Zap className="h-4 w-4 text-pink-500" />
                              <span className="font-semibold">{activityItem.vibe?.toFixed(1)}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Star className="h-4 w-4 text-violet-500" />
                              <span className="font-semibold">{activityItem.music?.toFixed(1)}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <TrendingUp className="h-4 w-4 text-cyan-500" />
                              <span className="font-semibold">{activityItem.execution?.toFixed(1)}</span>
                            </div>
                          </div>
                        )}
                        
                        {activityItem.type === 'frat_rating' && (
                          <div className="flex items-center gap-4 mt-3 text-sm">
                            <div className="flex items-center gap-1">
                              <Users className="h-4 w-4 text-amber-500" />
                              <span className="font-semibold">{activityItem.brotherhood?.toFixed(1)}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Shield className="h-4 w-4 text-emerald-500" />
                              <span className="font-semibold">{activityItem.reputation?.toFixed(1)}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Heart className="h-4 w-4 text-rose-500" />
                              <span className="font-semibold">{activityItem.community?.toFixed(1)}</span>
                            </div>
                          </div>
                        )}
                      </div>
                      <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
                    </div>
                  </div>
                </Link>
              );
            }
          })
        )}
        
        {/* Feed end marker for intersection observer */}
        <div ref={feedEndRef} className="h-1" />
        
        {/* You're all caught up message */}
        {showCaughtUp && feedItemsLast24h.length > 0 && (
          <div className="text-center py-8">
            <div className="inline-flex flex-col items-center">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center mb-4 animate-scale-in">
                <CheckCircle className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-lg font-bold mb-1">You're all caught up!</h3>
              <p className="text-muted-foreground text-sm mb-4">You've seen all posts from the last 24 hours</p>
              {!caughtUpClaimed ? (
                <button
                  onClick={handleClaimPoints}
                  className="px-6 py-3 rounded-full bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 text-black font-bold text-lg shadow-lg shadow-amber-500/30 animate-pulse hover:scale-105 active:scale-95 transition-transform"
                >
                  <span className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5" />
                    Claim +10 Points
                    <Sparkles className="h-5 w-5" />
                  </span>
                </button>
              ) : (
                <div className="flex items-center gap-2 text-green-500 font-bold">
                  <Check className="h-5 w-5" />
                  <span>+10 Points Claimed!</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Unread notification badge */}
      {hasUnread && feedItems.length > 0 && (
        <button
          onClick={handleClearUnread}
          className="fixed top-20 right-4 flex items-center gap-2 px-4 py-2 rounded-full bg-red-500 text-white font-semibold shadow-lg shadow-red-500/30 animate-scale-in z-50 hover:scale-105 active:scale-95 transition-transform"
        >
          <Bell className="h-4 w-4" />
          <span>New posts</span>
          <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
        </button>
      )}

      {/* Floating compose button */}
      <button
        onClick={() => setShowChatComposer(true)}
        className="fixed bottom-24 right-4 w-14 h-14 rounded-full bg-gradient-to-r from-violet-500 to-purple-500 text-white shadow-lg shadow-violet-500/30 flex items-center justify-center hover:scale-105 active:scale-95 transition-transform z-40"
      >
        <Send className="h-6 w-6" />
      </button>

      {/* Chat Composer Sheet */}
      <Sheet open={showChatComposer} onOpenChange={(open) => {
        setShowChatComposer(open);
        if (!open) {
          // Reset frat ranking when closing
          setFratRanking({
            'Upper Touse': null,
            'Touse': null,
            'Lower Touse': null,
            'Upper Mouse': null,
            'Mouse 1': null,
            'Mouse 2': null,
            'Lower Mouse': null,
            'Upper Bouse': null,
            'Bouse': null,
            'Lower Bouse': null,
          });
        }
      }}>
        <SheetContent side="bottom" className="h-auto max-h-[80vh] rounded-t-3xl">
          <SheetHeader className="pb-4">
            <SheetTitle className="text-xl">
              {Object.values(fratRanking).some(Boolean) ? "Share Frat Ranking" : "What's on your mind?"}
            </SheetTitle>
          </SheetHeader>
          <div className="space-y-4">
            {/* Frat ranking display */}
            {Object.values(fratRanking).some(Boolean) && (
              <div className="space-y-2 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Trophy className="h-5 w-5 text-amber-500" />
                    <p className="font-medium text-sm">Frat Ranking Post</p>
                  </div>
                  <button 
                    onClick={() => setFratRanking({
                      'Upper Touse': null,
                      'Touse': null,
                      'Lower Touse': null,
                      'Upper Mouse': null,
                      'Mouse 1': null,
                      'Mouse 2': null,
                      'Lower Mouse': null,
                      'Upper Bouse': null,
                      'Bouse': null,
                      'Lower Bouse': null,
                    })} 
                    className="p-1 hover:bg-muted rounded-full"
                  >
                    <X className="h-4 w-4 text-muted-foreground" />
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-1 text-xs">
                  {['Upper Touse', 'Touse', 'Lower Touse', 'Upper Mouse', 'Mouse 1', 'Mouse 2', 'Lower Mouse', 'Upper Bouse', 'Bouse', 'Lower Bouse'].map(tier => {
                    const frat = fratRanking[tier];
                    if (!frat) return null;
                    const displayTier = tier === 'Mouse 1' || tier === 'Mouse 2' ? 'Mouse' : tier;
                    return (
                      <div key={tier} className="truncate">
                        <span className="text-muted-foreground">{displayTier}:</span> {frat.name}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            
            <Textarea
              value={chatText}
              onChange={(e) => setChatText(e.target.value)}
              placeholder={Object.values(fratRanking).some(Boolean) ? "Add a comment to your ranking (optional)..." : "Share what's happening..."}
              className="min-h-[120px] text-base rounded-xl resize-none"
              autoFocus
            />
            
            {selectedMention && !Object.values(fratRanking).some(Boolean) && (
              <div className="flex items-center gap-2">
                <Badge className="flex items-center gap-1 px-3 py-1.5">
                  <AtSign className="h-3 w-3" />
                  {selectedMention.name}
                  <button onClick={() => setSelectedMention(null)} className="ml-1">
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              </div>
            )}
            
            <div className="flex gap-2 flex-wrap">
              {!Object.values(fratRanking).some(Boolean) && (
                <>
                  <Button
                    variant="outline"
                    onClick={() => { setMentionType('frat'); setShowMentionPicker(true); }}
                    className="rounded-xl"
                  >
                    <AtSign className="h-4 w-4 mr-2" />
                    Mention
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setShowFratRankingPicker(true)}
                    className="rounded-xl border-amber-500/50 text-amber-600 hover:bg-amber-500/10"
                  >
                    <Trophy className="h-4 w-4 mr-2" />
                    Frat Ranking
                  </Button>
                </>
              )}
              <Button
                onClick={async () => {
                  // If frat ranking mode, post the ranking
                  if (Object.values(fratRanking).some(Boolean)) {
                    const user = await base44.auth.me();
                    if (!user) {
                      toast({ title: 'Please sign in to post', variant: 'destructive' });
                      return;
                    }
                    
                    setSubmittingChat(true);
                    try {
                      const tiers = ['Upper Touse', 'Touse', 'Lower Touse', 'Upper Mouse', 'Mouse 1', 'Mouse 2', 'Lower Mouse', 'Upper Bouse', 'Bouse', 'Lower Bouse'];
                      const tierLines = tiers
                        .map(tier => {
                          const frat = fratRanking[tier];
                          if (!frat) return null;
                          const displayTier = tier === 'Mouse 1' || tier === 'Mouse 2' ? 'Mouse' : tier;
                          return `${displayTier}: ${frat.name}`;
                        })
                        .filter(Boolean);
                      
                      let message = tierLines.join('\n');
                      if (chatText.trim()) {
                        message = `${chatText.trim()}\n\n${message}`;
                      }
                      
                      await base44.entities.ChatMessage.create({
                        user_id: user.id,
                        text: message,
                        upvotes: 0,
                        downvotes: 0,
                      });
                      
                      setChatText('');
                      setFratRanking({
                        'Upper Touse': null,
                        'Touse': null,
                        'Lower Touse': null,
                        'Upper Mouse': null,
                        'Mouse 1': null,
                        'Mouse 2': null,
                        'Lower Mouse': null,
                        'Upper Bouse': null,
                        'Bouse': null,
                        'Lower Bouse': null,
                      });
                      setShowChatComposer(false);
                      await loadChat();
                      toast({ title: 'Ranking posted!' });
                    } catch (error) {
                      console.error('Failed to post:', error);
                      toast({ title: 'Failed to post', variant: 'destructive' });
                    } finally {
                      setSubmittingChat(false);
                    }
                  } else {
                    handleSubmitChat();
                  }
                }}
                disabled={submittingChat || (!chatText.trim() && !Object.values(fratRanking).some(Boolean))}
                className="flex-1 rounded-xl bg-gradient-to-r from-violet-500 to-purple-500 text-white"
              >
                {submittingChat ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <>
                    <Send className="h-5 w-5 mr-2" />
                    Post
                  </>
                )}
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Frat Ranking Picker Sheet */}
      <Sheet open={showFratRankingPicker} onOpenChange={setShowFratRankingPicker}>
        <SheetContent side="bottom" className="h-[80vh] rounded-t-3xl">
          <SheetHeader className="pb-4">
            <SheetTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-amber-500" />
              Create Frat Ranking
            </SheetTitle>
            <p className="text-sm text-muted-foreground">
              Fill in your tier list - this is just for sharing, doesn't affect ratings
            </p>
          </SheetHeader>
          <ScrollArea className="h-[calc(100%-120px)]">
            <div className="space-y-3 pr-2">
              {[
                { tier: 'Upper Touse', label: 'Upper Touse (1st)', color: 'bg-green-500/20 border-green-500/40' },
                { tier: 'Touse', label: 'Touse (2nd)', color: 'bg-green-500/15 border-green-500/30' },
                { tier: 'Lower Touse', label: 'Lower Touse (3rd)', color: 'bg-green-500/10 border-green-500/20' },
                { tier: 'Upper Mouse', label: 'Upper Mouse (4th)', color: 'bg-yellow-500/15 border-yellow-500/30' },
                { tier: 'Mouse 1', label: 'Mouse (5th)', color: 'bg-yellow-500/10 border-yellow-500/20' },
                { tier: 'Mouse 2', label: 'Mouse (6th)', color: 'bg-yellow-500/10 border-yellow-500/20' },
                { tier: 'Lower Mouse', label: 'Lower Mouse (7th)', color: 'bg-orange-500/15 border-orange-500/30' },
                { tier: 'Upper Bouse', label: 'Upper Bouse (8th)', color: 'bg-red-500/10 border-red-500/20' },
                { tier: 'Bouse', label: 'Bouse (9th)', color: 'bg-red-500/15 border-red-500/30' },
                { tier: 'Lower Bouse', label: 'Lower Bouse (10th)', color: 'bg-red-500/20 border-red-500/40' },
              ].map(({ tier, label, color }) => {
                const selectedFrat = fratRanking[tier];
                const usedFratIds = Object.values(fratRanking).filter(Boolean).map(f => f!.id);
                const availableFrats = fraternities.filter(f => !usedFratIds.includes(f.id) || f.id === selectedFrat?.id);
                
                return (
                  <div key={tier} className={cn("p-3 rounded-xl border", color)}>
                    <p className="text-xs font-medium text-muted-foreground mb-2">{label}</p>
                    {selectedFrat ? (
                      <div className="flex items-center justify-between">
                        <p className="font-semibold">{selectedFrat.name}</p>
                        <button 
                          onClick={() => setFratRanking(prev => ({ ...prev, [tier]: null }))}
                          className="p-1 hover:bg-muted rounded-full"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex gap-2 flex-wrap">
                        {availableFrats.slice(0, 5).map(frat => (
                          <button
                            key={frat.id}
                            onClick={() => setFratRanking(prev => ({ ...prev, [tier]: frat }))}
                            className="px-3 py-1.5 text-sm rounded-lg bg-background/50 hover:bg-background border border-border transition-all"
                          >
                            {frat.name}
                          </button>
                        ))}
                        {availableFrats.length > 5 && (
                          <span className="text-xs text-muted-foreground self-center">+{availableFrats.length - 5} more</span>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </ScrollArea>
          <div className="pt-4 border-t">
            <Button 
              onClick={() => setShowFratRankingPicker(false)}
              className="w-full rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white"
              disabled={!Object.values(fratRanking).some(Boolean)}
            >
              <Check className="h-5 w-5 mr-2" />
              Continue to Post
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Mention Picker Sheet */}
      <Sheet open={showMentionPicker} onOpenChange={setShowMentionPicker}>
        <SheetContent side="bottom" className="h-[60vh] rounded-t-3xl">
          <SheetHeader className="pb-4">
            <SheetTitle>Tag something</SheetTitle>
          </SheetHeader>
          <div className="flex gap-2 mb-4">
            <Button
              variant={mentionType === 'frat' ? 'default' : 'outline'}
              onClick={() => setMentionType('frat')}
              className="rounded-full"
            >
              <Trophy className="h-4 w-4 mr-2" />
              Frats
            </Button>
            <Button
              variant={mentionType === 'party' ? 'default' : 'outline'}
              onClick={() => setMentionType('party')}
              className="rounded-full"
            >
              <PartyPopper className="h-4 w-4 mr-2" />
              Parties
            </Button>
          </div>
          <ScrollArea className="h-[calc(100%-100px)]">
            <div className="space-y-2">
              {mentionType === 'frat' && fraternities.map((frat) => (
                <button
                  key={frat.id}
                  onClick={() => {
                    setSelectedMention({ type: 'frat', id: frat.id, name: frat.name });
                    setShowMentionPicker(false);
                  }}
                  className="w-full p-4 rounded-xl bg-muted/50 hover:bg-muted text-left transition-all active:scale-[0.98]"
                >
                  <p className="font-semibold">{frat.name}</p>
                </button>
              ))}
              {mentionType === 'party' && parties.map((party) => (
                <button
                  key={party.id}
                  onClick={() => {
                    setSelectedMention({ type: 'party', id: party.id, name: party.title });
                    setShowMentionPicker(false);
                  }}
                  className="w-full p-4 rounded-xl bg-muted/50 hover:bg-muted text-left transition-all active:scale-[0.98]"
                >
                  <p className="font-semibold">{party.title}</p>
                  <p className="text-sm text-muted-foreground">{format(new Date(party.starts_at), 'MMM d, h:mm a')}</p>
                </button>
              ))}
            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>
    </div>
  );
}
