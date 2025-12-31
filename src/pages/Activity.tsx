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
  Coffee,
  Swords
} from 'lucide-react';
import FratBattleGame from '@/components/activity/FratBattleGame';
import RankingPostCard, { parseRankingFromText } from '@/components/activity/RankingPostCard';
import { recordUserAction } from '@/utils/streak';
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
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
  const [commentsSheetItem, setCommentsSheetItem] = useState<ChatItem | null>(null);
  
  // Chat composer
  const [showChatComposer, setShowChatComposer] = useState(false);
  const [chatText, setChatText] = useState('');
  const [submittingChat, setSubmittingChat] = useState(false);
  const [showMentionPicker, setShowMentionPicker] = useState(false);
  const [mentionType, setMentionType] = useState<'frat' | 'party' | null>(null);
  const [selectedMention, setSelectedMention] = useState<{ type: 'frat' | 'party'; id: string; name: string } | null>(null);
  const [chatInputEnabled, setChatInputEnabled] = useState(false);
  
  // Frat ranking post mode
  const [showFratRankingPicker, setShowFratRankingPicker] = useState(false);
  const [showFratBattleGame, setShowFratBattleGame] = useState(false);
  const [showManualPicker, setShowManualPicker] = useState(false);
  const [expandedTiers, setExpandedTiers] = useState<Record<string, boolean>>({});
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

  // Generate/retrieve unique user ID for individual voting
  const [userId] = useState<string>(() => {
    const existing = localStorage.getItem('touse_user_id');
    if (existing) return existing;
    const newId = `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    localStorage.setItem('touse_user_id', newId);
    return newId;
  });

  // What's the move tonight - voting (stores all user votes)
  const [allUserVotes, setAllUserVotes] = useState<Record<string, string>>(() => {
    // Check if we need to reset (daily at 5 AM)
    const now = new Date();
    const today5AM = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 5, 0, 0);
    const lastReset = localStorage.getItem('touse_move_last_reset');
    const lastResetDate = lastReset ? new Date(lastReset) : null;
    
    if (now >= today5AM && (!lastResetDate || lastResetDate < today5AM)) {
      localStorage.removeItem('touse_all_user_votes');
      localStorage.setItem('touse_move_last_reset', now.toISOString());
      return {};
    }
    
    const saved = localStorage.getItem('touse_all_user_votes');
    return saved ? JSON.parse(saved) : {};
  });
  
  const [showSuggestionInput, setShowSuggestionInput] = useState(false);
  const [showAllMoveOptions, setShowAllMoveOptions] = useState(false);
  const [suggestionText, setSuggestionText] = useState('');
  const [customSuggestions, setCustomSuggestions] = useState<{ id: string; text: string }[]>(() => {
    // Check if we need to reset (daily at 5 AM)
    const now = new Date();
    const today5AM = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 5, 0, 0);
    const lastReset = localStorage.getItem('touse_move_last_reset');
    const lastResetDate = lastReset ? new Date(lastReset) : null;
    
    // If current time is past 5 AM and last reset was before today's 5 AM, clear suggestions
    if (now >= today5AM && (!lastResetDate || lastResetDate < today5AM)) {
      localStorage.removeItem('touse_custom_move_suggestions');
      localStorage.setItem('touse_move_last_reset', now.toISOString());
      return [];
    }
    
    const saved = localStorage.getItem('touse_custom_move_suggestions');
    return saved ? JSON.parse(saved) : [];
  });
  
  // Derive current user's vote from allUserVotes
  const userMoveVote = allUserVotes[userId] || null;
  
  // Calculate vote counts from all user votes
  const moveVotes = useMemo(() => {
    const counts: Record<string, number> = {};
    Object.values(allUserVotes).forEach(optionId => {
      counts[optionId] = (counts[optionId] || 0) + 1;
    });
    return counts;
  }, [allUserVotes]);
  
  // Countdown timer
  const [countdownTime, setCountdownTime] = useState<{ days: number; hours: number; minutes: number; seconds: number } | null>(null);
  
  // Unread notification state - track count of new items
  const [newPostsCount, setNewPostsCount] = useState(0);
  const [lastSeenFeedCount, setLastSeenFeedCount] = useState(() => {
    const saved = localStorage.getItem('touse_last_seen_feed_count');
    return saved ? parseInt(saved, 10) : 0;
  });
  
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

  // Get next upcoming party - based on time, not stored status
  const nextParty = useMemo(() => {
    const now = new Date();
    const upcomingParties = parties
      .filter(p => new Date(p.starts_at) > now && p.status !== 'cancelled')
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
      await recordUserAction();
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
      await recordUserAction();
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
  // Helper to update votes and persist to localStorage
  const updateUserVote = (optionId: string | null) => {
    const newVotes = { ...allUserVotes };
    if (optionId === null) {
      delete newVotes[userId];
    } else {
      newVotes[userId] = optionId;
    }
    setAllUserVotes(newVotes);
    localStorage.setItem('touse_all_user_votes', JSON.stringify(newVotes));
  };

  const handleMoveVote = async (optionId: string) => {
    const user = await base44.auth.me();
    if (!user) {
      toast({ title: 'Please sign in to vote', variant: 'destructive' });
      return;
    }

    if (userMoveVote === optionId) {
      // Unvote
      updateUserVote(null);
    } else {
      // Vote for this option
      updateUserVote(optionId);
    }
  };

  const handleCustomSuggestionVote = (suggestionId: string) => {
    if (userMoveVote === suggestionId) {
      // Unvote
      updateUserVote(null);
    } else {
      // Vote for this suggestion
      updateUserVote(suggestionId);
    }
  };

  // Normalize text for comparison (lowercase, trim, remove extra spaces, limit repeated chars to 3)
  const normalizeText = (text: string) => {
    return text
      .toLowerCase()
      .trim()
      .replace(/\s+/g, ' ')
      .replace(/(.)\1{2,}/g, '$1$1$1'); // Collapse 3+ repeated chars to max 3
  };

  const handleAddSuggestion = () => {
    if (!suggestionText.trim()) return;
    
    const normalizedInput = normalizeText(suggestionText);
    
    // Check if a similar suggestion already exists
    const existingIndex = customSuggestions.findIndex(s => normalizeText(s.text) === normalizedInput);
    
    let updatedSuggestions: typeof customSuggestions;
    let selectedId: string;
    
    if (existingIndex !== -1) {
      // Merge with existing - vote for the existing suggestion
      selectedId = customSuggestions[existingIndex].id;
      updatedSuggestions = customSuggestions;
      toast({ title: 'Vote added to existing suggestion!' });
    } else {
      // Create new suggestion
      const newSuggestion = {
        id: `custom-${Date.now()}`,
        text: suggestionText.trim()
      };
      updatedSuggestions = [...customSuggestions, newSuggestion];
      selectedId = newSuggestion.id;
      toast({ title: 'Suggestion added!' });
    }
    
    setCustomSuggestions(updatedSuggestions);
    localStorage.setItem('touse_custom_move_suggestions', JSON.stringify(updatedSuggestions));
    updateUserVote(selectedId);
    setSuggestionText('');
    setShowSuggestionInput(false);
  };

  const totalMoveVotes = useMemo(() => {
    return Object.keys(allUserVotes).length;
  }, [allUserVotes]);

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
      setNewPostsCount(0);
      setLastSeenFeedCount(feedItems.length);
      localStorage.setItem('touse_last_seen_feed_count', feedItems.length.toString());
    }
  }, [feedItemsLast24h.length, caughtUpClaimed]);
  
  useEffect(() => {
    const observer = new IntersectionObserver(handleFeedEndVisible, { threshold: 0.1 });
    if (feedEndRef.current) {
      observer.observe(feedEndRef.current);
    }
    return () => observer.disconnect();
  }, [handleFeedEndVisible]);
  
  // Track new posts count when feed items change and store current count for Layout
  useEffect(() => {
    // Always store current feed count so Layout can calculate new posts
    localStorage.setItem('touse_current_feed_count', feedItems.length.toString());
    
    if (feedItems.length > lastSeenFeedCount && lastSeenFeedCount > 0) {
      setNewPostsCount(feedItems.length - lastSeenFeedCount);
      setShowCaughtUp(false);
    }
  }, [feedItems.length, lastSeenFeedCount]);
  
  // Clear unread when user clicks the notification (called from Layout via storage event)
  const handleClearUnread = () => {
    setNewPostsCount(0);
    setLastSeenFeedCount(feedItems.length);
    localStorage.setItem('touse_last_seen_feed_count', feedItems.length.toString());
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  
  // Update last seen count when user scrolls to top or on initial load
  useEffect(() => {
    if (!loading && feedItems.length > 0 && lastSeenFeedCount === 0) {
      setLastSeenFeedCount(feedItems.length);
      localStorage.setItem('touse_last_seen_feed_count', feedItems.length.toString());
      localStorage.setItem('touse_current_feed_count', feedItems.length.toString());
    }
  }, [loading, feedItems.length, lastSeenFeedCount]);
  
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
                  <div className="absolute inset-0 bg-primary" />
                  <div className="absolute inset-0 flex flex-col items-center justify-center p-2 text-white">
                    <Radio className="h-8 w-8 text-white animate-pulse mb-1" />
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
                  <div className="absolute inset-0 bg-primary" />
                  <div className="absolute inset-0 flex flex-col items-center justify-center p-2 text-white">
                    <PartyPopper className="h-8 w-8 text-white mb-1" />
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

      {/* What's the move tonight? - Shows top 3 options */}
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
          
          {/* Build sorted options list */}
          {(() => {
            // Combine all options with their vote counts
            const allOptions: { id: string; type: 'party' | 'default' | 'custom'; label: string; subLabel?: string; votes: number; icon?: any; party?: typeof tonightsParties[0] }[] = [];
            
            // Add tonight's parties
            tonightsParties.forEach(party => {
              const frat = fraternities.find(f => f.id === party.fraternity_id);
              allOptions.push({
                id: party.id,
                type: 'party',
                label: party.title,
                subLabel: `${frat?.name} · ${format(new Date(party.starts_at), 'h:mm a')}`,
                votes: moveVotes[party.id] || 0,
                party
              });
            });
            
            // Add default options
            defaultMoveOptions.forEach(option => {
              allOptions.push({
                id: option.id,
                type: 'default',
                label: option.label,
                votes: moveVotes[option.id] || 0,
                icon: option.icon
              });
            });
            
            // Add custom suggestions
            customSuggestions.forEach(suggestion => {
              allOptions.push({
                id: suggestion.id,
                type: 'custom',
                label: suggestion.text,
                votes: moveVotes[suggestion.id] || 0
              });
            });
            
            // Sort by votes descending
            allOptions.sort((a, b) => b.votes - a.votes);
            
            // Get top 3
            const top3 = allOptions.slice(0, 3);
            const hasMore = allOptions.length > 3;
            
            const renderOption = (option: typeof allOptions[0], index: number) => {
              const percentage = totalMoveVotes > 0 ? (option.votes / totalMoveVotes) * 100 : 0;
              const isSelected = userMoveVote === option.id;
              const Icon = option.icon || (option.type === 'custom' ? Sparkles : PartyPopper);
              
              const borderColor = option.type === 'party' ? 'violet' : option.type === 'default' ? 'fuchsia' : 'pink';
              const bgColor = option.type === 'party' ? 'from-violet-500 to-fuchsia-500' : option.type === 'default' ? 'from-fuchsia-500 to-pink-500' : 'from-pink-500 to-rose-500';
              
              return (
                <button
                  key={option.id}
                  onClick={() => option.type === 'custom' ? handleCustomSuggestionVote(option.id) : handleMoveVote(option.id)}
                  className={cn(
                    "w-full min-h-[52px] p-3 rounded-2xl border-2 transition-all text-left relative overflow-hidden active:scale-[0.98]",
                    isSelected 
                      ? `border-${borderColor}-500 bg-${borderColor}-500/10` 
                      : `border-border hover:border-${borderColor}-500/50`
                  )}
                  style={isSelected ? { borderColor: `hsl(var(--${borderColor === 'violet' ? 'primary' : 'accent'}))`, backgroundColor: `hsl(var(--${borderColor === 'violet' ? 'primary' : 'accent'}) / 0.1)` } : {}}
                >
                  {userMoveVote && (
                    <div 
                      className={`absolute inset-0 bg-gradient-to-r ${bgColor.replace('from-', 'from-').replace('to-', 'to-')}/20 to-transparent transition-all duration-500`}
                      style={{ width: `${percentage}%`, background: `linear-gradient(to right, hsl(280 70% 50% / 0.2), transparent)` }}
                    />
                  )}
                  <div className="relative flex items-center gap-3">
                    <div className={cn(
                      "w-9 h-9 rounded-xl flex items-center justify-center shrink-0",
                      isSelected 
                        ? `bg-gradient-to-br ${bgColor} text-white` 
                        : "bg-muted text-muted-foreground"
                    )}>
                      {isSelected ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm truncate">{option.label}</p>
                      {option.subLabel && (
                        <p className="text-xs text-muted-foreground truncate">{option.subLabel}</p>
                      )}
                    </div>
                    {userMoveVote && (
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold">{percentage.toFixed(0)}%</span>
                        <Badge variant="secondary" className="text-xs">{option.votes}</Badge>
                      </div>
                    )}
                  </div>
                </button>
              );
            };
            
            return (
              <div className="space-y-2">
                {top3.map((option, index) => renderOption(option, index))}
                
                {/* Something else / View all button */}
                <button
                  onClick={() => setShowAllMoveOptions(true)}
                  className="w-full min-h-[44px] p-3 rounded-2xl border-2 border-dashed border-muted-foreground/30 flex items-center justify-center gap-2 text-muted-foreground hover:border-fuchsia-500 hover:text-fuchsia-500 transition-all active:scale-[0.98]"
                >
                  <Plus className="h-4 w-4" />
                  <span className="font-medium text-sm">
                    {hasMore ? `View all options (${allOptions.length})` : 'Something else'}
                  </span>
                </button>
              </div>
            );
          })()}
        </div>
      </div>

      {/* All Move Options Sheet */}
      <Sheet open={showAllMoveOptions} onOpenChange={setShowAllMoveOptions}>
        <SheetContent side="bottom" className="rounded-t-3xl h-[85vh] flex flex-col" style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 16px)' }}>
          <SheetHeader className="pb-4 text-left shrink-0">
            <SheetTitle>What's the move tonight?</SheetTitle>
          </SheetHeader>
          
          <ScrollArea className="flex-1 -mx-6 px-6 overflow-y-auto">
            <div className="space-y-2 pb-4">
              {/* Tonight's parties */}
              {tonightsParties.map((party) => {
                const frat = fraternities.find(f => f.id === party.fraternity_id);
                const votes = moveVotes[party.id] || 0;
                const percentage = totalMoveVotes > 0 ? (votes / totalMoveVotes) * 100 : 0;
                const isSelected = userMoveVote === party.id;
                
                return (
                  <button
                    key={party.id}
                    onClick={() => { handleMoveVote(party.id); setShowAllMoveOptions(false); }}
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
              
              {/* Default options */}
              {defaultMoveOptions.map((option) => {
                const votes = moveVotes[option.id] || 0;
                const percentage = totalMoveVotes > 0 ? (votes / totalMoveVotes) * 100 : 0;
                const isSelected = userMoveVote === option.id;
                const Icon = option.icon;
                
                return (
                  <button
                    key={option.id}
                    onClick={() => { handleMoveVote(option.id); setShowAllMoveOptions(false); }}
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
                const votes = moveVotes[suggestion.id] || 0;
                const percentage = totalMoveVotes > 0 ? (votes / totalMoveVotes) * 100 : 0;
                const isSelected = userMoveVote === suggestion.id;
                
                return (
                  <button
                    key={suggestion.id}
                    onClick={() => { handleCustomSuggestionVote(suggestion.id); setShowAllMoveOptions(false); }}
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
          </ScrollArea>
        </SheetContent>
      </Sheet>


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
                      {/* Check if this is a ranking post */}
                      {(() => {
                        const parsedRanking = parseRankingFromText(chatItem.text);
                        if (parsedRanking && parsedRanking.rankings.length >= 3) {
                          return (
                            <div className="mb-3">
                              <RankingPostCard 
                                rankings={parsedRanking.rankings} 
                                comment={parsedRanking.comment} 
                              />
                            </div>
                          );
                        }
                        return <p className="text-base leading-relaxed mb-3">{chatItem.text}</p>;
                      })()}
                      
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
                          onClick={() => setCommentsSheetItem(chatItem)}
                          className="min-h-[44px] min-w-[44px] flex items-center justify-center gap-2 px-4 rounded-full text-sm font-medium bg-muted hover:bg-primary/20 text-muted-foreground hover:text-primary transition-all active:scale-95 ml-auto"
                        >
                          <MessageCircle className="h-5 w-5" />
                          {chatItem.replies && chatItem.replies.length > 0 && (
                            <span>{chatItem.replies.length}</span>
                          )}
                        </button>
                      </div>
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
          // Reset states when closing
          setChatInputEnabled(false);
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
        <SheetContent side="bottom" className="rounded-t-3xl" style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 16px)' }}>
          <SheetHeader className="pb-4 text-left">
            <SheetTitle className="text-lg">
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
              readOnly={!chatInputEnabled}
              onClick={() => {
                if (!chatInputEnabled) {
                  setChatInputEnabled(true);
                }
              }}
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
      <Sheet open={showFratRankingPicker} onOpenChange={(open) => {
        setShowFratRankingPicker(open);
        if (!open) {
          setShowFratBattleGame(false);
          setShowManualPicker(false);
          setExpandedTiers({});
        }
      }}>
        <SheetContent side="bottom" className="rounded-t-3xl max-h-[85vh]" style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 16px)' }}>
          {showFratBattleGame ? (
            <FratBattleGame
              fraternities={fraternities}
              onComplete={(ranking) => {
                const fullRanking: Record<string, Fraternity | null> = {
                  'Upper Touse': ranking['Upper Touse'] || null,
                  'Touse': ranking['Touse'] || null,
                  'Lower Touse': ranking['Lower Touse'] || null,
                  'Upper Mouse': ranking['Upper Mouse'] || null,
                  'Mouse 1': ranking['Mouse 1'] || null,
                  'Mouse 2': ranking['Mouse 2'] || null,
                  'Lower Mouse': ranking['Lower Mouse'] || null,
                  'Upper Bouse': ranking['Upper Bouse'] || null,
                  'Bouse': ranking['Bouse'] || null,
                  'Lower Bouse': ranking['Lower Bouse'] || null,
                };
                setFratRanking(fullRanking);
                setShowFratBattleGame(false);
                setShowFratRankingPicker(false);
                setShowChatComposer(true);
              }}
              onShare={(rankingData) => {
                const fullRanking: Record<string, Fraternity | null> = {
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
                };
                rankingData.forEach(r => {
                  const frat = fraternities.find(f => f.name === r.fratName);
                  if (frat && r.tier in fullRanking) {
                    fullRanking[r.tier] = frat;
                  }
                });
                setFratRanking(fullRanking);
                setShowFratBattleGame(false);
                setShowFratRankingPicker(false);
                setShowChatComposer(true);
              }}
              onSave={(rankingData) => {
                const savedRankings = JSON.parse(localStorage.getItem('touse_saved_battle_rankings') || '[]');
                const newRanking = {
                  id: `battle-${Date.now()}`,
                  date: new Date().toISOString(),
                  ranking: rankingData,
                };
                const updated = [newRanking, ...savedRankings].slice(0, 3);
                localStorage.setItem('touse_saved_battle_rankings', JSON.stringify(updated));
                
                toast({ title: "Saved!", description: "Check 'Your Lists' to see your saved rankings" });
              }}
              onClose={() => setShowFratBattleGame(false)}
            />
          ) : showManualPicker ? (
            <div className="flex flex-col h-full overflow-hidden">
              <SheetHeader className="pb-4 shrink-0 text-left">
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => setShowManualPicker(false)}
                    className="p-1 hover:bg-muted rounded-full"
                  >
                    <ChevronRight className="h-5 w-5 rotate-180" />
                  </button>
                  <SheetTitle className="flex items-center gap-2">
                    <Trophy className="h-5 w-5 text-amber-500" />
                    Pick Manually
                  </SheetTitle>
                </div>
                <p className="text-sm text-muted-foreground pl-8">Select a frat for each tier position</p>
              </SheetHeader>
              
              <ScrollArea className="flex-1 -mx-6 px-6">
                <div className="space-y-3 pb-4">
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
                    const isExpanded = expandedTiers[tier] || false;
                    const displayedFrats = isExpanded ? availableFrats : availableFrats.slice(0, 5);
                    const hasMore = availableFrats.length > 5;
                    
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
                            {displayedFrats.map(frat => (
                              <button
                                key={frat.id}
                                onClick={() => setFratRanking(prev => ({ ...prev, [tier]: frat }))}
                                className="px-3 py-1.5 text-sm rounded-lg bg-background/50 hover:bg-background border border-border transition-all"
                              >
                                {frat.name}
                              </button>
                            ))}
                            {hasMore && !isExpanded && (
                              <button
                                onClick={() => setExpandedTiers(prev => ({ ...prev, [tier]: true }))}
                                className="px-3 py-1.5 text-sm rounded-lg bg-primary/10 hover:bg-primary/20 text-primary border border-primary/30 transition-all font-medium"
                              >
                                +{availableFrats.length - 5} more
                              </button>
                            )}
                            {hasMore && isExpanded && (
                              <button
                                onClick={() => setExpandedTiers(prev => ({ ...prev, [tier]: false }))}
                                className="px-3 py-1.5 text-sm rounded-lg bg-muted hover:bg-muted/80 text-muted-foreground border border-border transition-all"
                              >
                                Show less
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
              <div className="pt-4 border-t shrink-0">
                <Button 
                  onClick={() => {
                    setShowFratRankingPicker(false);
                    setShowChatComposer(true);
                  }}
                  className="w-full rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white"
                  disabled={!Object.values(fratRanking).some(Boolean)}
                >
                  <Check className="h-5 w-5 mr-2" />
                  Continue to Post
                </Button>
              </div>
            </div>
          ) : (
            (() => {
              const savedBattleRankings = JSON.parse(localStorage.getItem('touse_saved_battle_rankings') || '[]');
              const savedManualRankings = JSON.parse(localStorage.getItem('touse_saved_manual_rankings') || '[]');
              
              return (
                <>
                  <SheetHeader className="pb-4 border-b border-border text-left">
                    <SheetTitle className="text-lg font-semibold">Create Frat Ranking</SheetTitle>
                    <p className="text-sm text-muted-foreground">
                      Fill in your tier list - this is just for sharing, doesn't affect ratings
                    </p>
                  </SheetHeader>
                  
                  <div className="divide-y divide-border">
                    {/* Battle Game Row */}
                    <button
                      onClick={() => setShowFratBattleGame(true)}
                      className="w-full py-4 flex items-center gap-4 text-left hover:bg-muted/50 transition-colors active:bg-muted"
                    >
                      <div className="w-10 h-10 rounded-full bg-amber-500 flex items-center justify-center text-white shrink-0">
                        <Swords className="h-5 w-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-foreground">Play Frat Battle</p>
                        <p className="text-sm text-muted-foreground">10 head-to-head matchups generate your ranking</p>
                      </div>
                      <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
                    </button>
                    
                    {/* Past Battles */}
                    {savedBattleRankings.slice(0, 3).map((saved: { id: string; date: string; ranking: { tier: string; fratName: string; wins: number }[] }) => (
                      <div key={saved.id} className="py-3 flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-amber-500/10 flex items-center justify-center shrink-0">
                          <Swords className="h-4 w-4 text-amber-500" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground leading-snug">
                            {saved.ranking.slice(0, 3).map(r => r.fratName).join(' → ')}...
                          </p>
                          <p className="text-xs text-muted-foreground">{format(new Date(saved.date), 'MMM d, h:mm a')}</p>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="shrink-0 text-amber-600 hover:text-amber-700 hover:bg-amber-500/10"
                          onClick={() => {
                            const fullRanking: Record<string, Fraternity | null> = {
                              'Upper Touse': null, 'Touse': null, 'Lower Touse': null,
                              'Upper Mouse': null, 'Mouse 1': null, 'Mouse 2': null, 'Lower Mouse': null,
                              'Upper Bouse': null, 'Bouse': null, 'Lower Bouse': null,
                            };
                            saved.ranking.forEach((r: { tier: string; fratName: string }) => {
                              const frat = fraternities.find(f => f.name === r.fratName);
                              if (frat && r.tier in fullRanking) {
                                fullRanking[r.tier] = frat;
                              }
                            });
                            setFratRanking(fullRanking);
                            setShowFratRankingPicker(false);
                            setShowChatComposer(true);
                          }}
                        >
                          <Send className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                    
                    {/* Pick Manually Row */}
                    <button
                      onClick={() => setShowManualPicker(true)}
                      className="w-full py-4 flex items-center gap-4 text-left hover:bg-muted/50 transition-colors active:bg-muted"
                    >
                      <div className="w-10 h-10 rounded-full bg-emerald-500 flex items-center justify-center text-white shrink-0">
                        <Trophy className="h-5 w-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-foreground">Pick Manually</p>
                        <p className="text-sm text-muted-foreground">Select a frat for each tier position</p>
                      </div>
                      <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
                    </button>
                    
                    {/* Past Manual Choices */}
                    {savedManualRankings.slice(0, 3).map((saved: { id: string; date: string; ranking: { tier: string; fratName: string }[] }) => (
                      <div key={saved.id} className="py-3 flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center shrink-0">
                          <Trophy className="h-4 w-4 text-emerald-500" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground leading-snug">
                            {saved.ranking.slice(0, 3).map(r => r.fratName).join(' → ')}...
                          </p>
                          <p className="text-xs text-muted-foreground">{format(new Date(saved.date), 'MMM d, h:mm a')}</p>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="shrink-0 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-500/10"
                          onClick={() => {
                            const fullRanking: Record<string, Fraternity | null> = {
                              'Upper Touse': null, 'Touse': null, 'Lower Touse': null,
                              'Upper Mouse': null, 'Mouse 1': null, 'Mouse 2': null, 'Lower Mouse': null,
                              'Upper Bouse': null, 'Bouse': null, 'Lower Bouse': null,
                            };
                            saved.ranking.forEach((r: { tier: string; fratName: string }) => {
                              const frat = fraternities.find(f => f.name === r.fratName);
                              if (frat && r.tier in fullRanking) {
                                fullRanking[r.tier] = frat;
                              }
                            });
                            setFratRanking(fullRanking);
                            setShowFratRankingPicker(false);
                            setShowChatComposer(true);
                          }}
                        >
                          <Send className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </>
              );
            })()
          )}
        </SheetContent>
      </Sheet>

      {/* Mention Picker Sheet */}
      <Sheet open={showMentionPicker} onOpenChange={setShowMentionPicker}>
        <SheetContent side="bottom" className="rounded-t-3xl max-h-[70vh]" style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 16px)' }}>
          <SheetHeader className="pb-4 text-left">
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
          <ScrollArea className="h-[calc(70vh-160px)]">
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
              {mentionType === 'party' && (() => {
                const now = new Date();
                const upcomingParties = parties
                  .filter(p => new Date(p.starts_at) >= now)
                  .sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime())
                  .slice(0, 5);
                const pastParties = parties
                  .filter(p => new Date(p.starts_at) < now)
                  .sort((a, b) => new Date(b.starts_at).getTime() - new Date(a.starts_at).getTime())
                  .slice(0, 5);
                
                return (
                  <>
                    {upcomingParties.length > 0 && (
                      <>
                        <p className="text-sm font-medium text-muted-foreground px-1">Upcoming Parties</p>
                        {upcomingParties.map((party) => (
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
                      </>
                    )}
                    {pastParties.length > 0 && (
                      <>
                        <p className="text-sm font-medium text-muted-foreground px-1 mt-2">Past Parties</p>
                        {pastParties.map((party) => (
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
                      </>
                    )}
                  </>
                );
              })()}
            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>

      {/* Comments Sheet */}
      <Sheet open={!!commentsSheetItem} onOpenChange={(open) => {
        if (!open) {
          setCommentsSheetItem(null);
          setReplyText('');
        }
      }}>
        <SheetContent side="bottom" className="rounded-t-3xl max-h-[75vh]" style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 16px)' }}>
          <SheetHeader className="pb-4 shrink-0 text-left">
            <SheetTitle className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5" />
              Comments
              {commentsSheetItem?.replies && commentsSheetItem.replies.length > 0 && (
                <Badge variant="secondary">{commentsSheetItem.replies.length}</Badge>
              )}
            </SheetTitle>
          </SheetHeader>
          
          {/* Original message preview */}
          {commentsSheetItem && (
            <div className="px-4 py-3 rounded-xl bg-muted/50 border mb-4 shrink-0">
              <p className="text-sm text-muted-foreground mb-1">
                {formatDistanceToNow(new Date(commentsSheetItem.created_date), { addSuffix: true })}
              </p>
              <p className="text-sm line-clamp-2">{commentsSheetItem.text}</p>
            </div>
          )}
          
          {/* Comments list */}
          <ScrollArea className="h-[calc(75vh-280px)] -mx-6 px-6">
            <div className="space-y-3 pb-4">
              {commentsSheetItem?.replies && commentsSheetItem.replies.length > 0 ? (
                commentsSheetItem.replies.map((reply) => (
                  <div key={reply.id} className="p-4 rounded-xl bg-card border">
                    <div className="flex items-start gap-3">
                      <Avatar className="h-8 w-8 shrink-0">
                        <AvatarFallback className="bg-gradient-to-br from-violet-500 to-purple-500 text-white text-xs">
                          <MessagesSquare className="h-4 w-4" />
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-muted-foreground mb-1">
                          {formatDistanceToNow(new Date(reply.created_date), { addSuffix: true })}
                        </p>
                        <p className="text-sm">{reply.text}</p>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8">
                  <div className="w-12 h-12 mx-auto rounded-full bg-muted flex items-center justify-center mb-3">
                    <MessageCircle className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <p className="text-sm text-muted-foreground">No comments yet</p>
                  <p className="text-xs text-muted-foreground mt-1">Be the first to comment!</p>
                </div>
              )}
            </div>
          </ScrollArea>
          
          {/* Reply input */}
          <div className="pt-4 border-t shrink-0 flex gap-2">
            <Textarea
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              placeholder="Write a comment..."
              className="min-h-[50px] max-h-[100px] text-base rounded-xl resize-none flex-1"
            />
            <Button
              onClick={async () => {
                if (commentsSheetItem) {
                  await handleChatReply(commentsSheetItem.id);
                  const updatedMessage = chatMessages.find(m => m.id === commentsSheetItem.id);
                  if (updatedMessage) {
                    setCommentsSheetItem(updatedMessage);
                  }
                }
              }}
              disabled={submittingReply || !replyText.trim()}
              className="h-auto rounded-xl bg-gradient-to-r from-violet-500 to-purple-500 px-4"
            >
              {submittingReply ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Send className="h-5 w-5" />
              )}
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
