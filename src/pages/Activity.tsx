import { useState, useEffect, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { 
  ThumbsUp, 
  ThumbsDown, 
  MessageCircle, 
  Send,
  Flame,
  TrendingDown,
  Eye,
  MessageSquare,
  Trophy,
  ChevronDown,
  ChevronUp,
  X,
  Swords
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import { differenceInSeconds, differenceInMinutes, differenceInHours, differenceInDays } from 'date-fns';
import { createPageUrl } from '@/utils';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { recordUserAction } from '@/utils/streak';

// Pulse-style time formatter
const formatPulseTime = (date: Date) => {
  const now = new Date();
  const seconds = differenceInSeconds(now, date);
  const minutes = differenceInMinutes(now, date);
  const hours = differenceInHours(now, date);
  
  if (seconds < 60) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 6) return `${hours}h ago`;
  if (hours < 24) return 'earlier tonight';
  return 'yesterday';
};

interface PulseItem {
  id: string;
  type: 'heating_up' | 'mixed_reactions' | 'slipping' | 'talking_about' | 'rising';
  entityName: string;
  entityId: string;
  entityType: 'fraternity' | 'party';
  count?: number;
  delta?: number;
  timestamp: Date;
  comments?: Array<{ id: string; text: string; upvotes: number; created_date: string }>;
}

interface HighlightItem {
  id: string;
  type: 'viral_comment' | 'hot_take' | 'battle' | 'ranking_snapshot';
  content: string;
  entityName?: string;
  entityId?: string;
  entityType?: 'fraternity' | 'party';
  upvotes?: number;
  fratA?: { name: string; id: string; score: number };
  fratB?: { name: string; id: string; score: number };
}

export default function Activity() {
  const [loading, setLoading] = useState(true);
  const [fraternities, setFraternities] = useState<Fraternity[]>([]);
  const [parties, setParties] = useState<Party[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  
  // Quick comment
  const [quickComment, setQuickComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  
  // Move poll state
  const [pollCollapsed, setPollCollapsed] = useState(false);
  const [userId] = useState<string>(() => {
    const existing = localStorage.getItem('touse_user_id');
    if (existing) return existing;
    const newId = `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    localStorage.setItem('touse_user_id', newId);
    return newId;
  });
  
  const [allUserVotes, setAllUserVotes] = useState<Record<string, string>>(() => {
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
  
  const userMoveVote = allUserVotes[userId] || null;
  
  const moveVotes = useMemo(() => {
    const counts: Record<string, number> = {};
    Object.values(allUserVotes).forEach(optionId => {
      counts[optionId] = (counts[optionId] || 0) + 1;
    });
    return counts;
  }, [allUserVotes]);
  
  const totalMoveVotes = Object.keys(allUserVotes).length;
  
  // Pulse items sheet
  const [expandedPulse, setExpandedPulse] = useState<PulseItem | null>(null);
  
  // Ratings and comments data for pulse generation
  const [partyRatings, setPartyRatings] = useState<any[]>([]);
  const [fratRatings, setFratRatings] = useState<any[]>([]);
  const [partyComments, setPartyComments] = useState<any[]>([]);
  const [fratComments, setFratComments] = useState<any[]>([]);

  useEffect(() => {
    loadData();
  }, []);
  
  // Clear notification when visiting
  useEffect(() => {
    if (!loading) {
      const count = chatMessages.length + partyRatings.length + fratRatings.length;
      localStorage.setItem('touse_last_seen_feed_count', count.toString());
      localStorage.setItem('touse_current_feed_count', count.toString());
    }
  }, [loading, chatMessages.length, partyRatings.length, fratRatings.length]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [partiesData, fraternitiesData, messages, pRatings, fRatings, pComments, fComments] = await Promise.all([
        base44.entities.Party.list(),
        base44.entities.Fraternity.list(),
        base44.entities.ChatMessage.list(),
        base44.entities.PartyRating.list(),
        base44.entities.ReputationRating.list(),
        base44.entities.PartyComment.list(),
        base44.entities.FraternityComment.list(),
      ]);
      setParties(partiesData);
      setFraternities(fraternitiesData);
      setChatMessages(messages);
      setPartyRatings(pRatings);
      setFratRatings(fRatings);
      setPartyComments(pComments);
      setFratComments(fComments);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Generate pulse items from activity data
  const pulseItems = useMemo((): PulseItem[] => {
    const items: PulseItem[] = [];
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    
    // Count recent ratings per fraternity
    const fratRatingCounts: Record<string, { count: number; recent: any[] }> = {};
    
    fratRatings.forEach(r => {
      const frat = fraternities.find(f => f.id === r.fraternity_id);
      if (!frat) return;
      
      if (!fratRatingCounts[frat.id]) {
        fratRatingCounts[frat.id] = { count: 0, recent: [] };
      }
      
      const ratingDate = new Date(r.created_date);
      if (ratingDate >= oneHourAgo) {
        fratRatingCounts[frat.id].count++;
        fratRatingCounts[frat.id].recent.push(r);
      }
    });
    
    // "Heating up" - frats with 3+ ratings in last hour
    Object.entries(fratRatingCounts).forEach(([fratId, data]) => {
      if (data.count >= 3) {
        const frat = fraternities.find(f => f.id === fratId);
        if (frat) {
          items.push({
            id: `heating-${fratId}`,
            type: 'heating_up',
            entityName: frat.name,
            entityId: fratId,
            entityType: 'fraternity',
            count: data.count,
            timestamp: new Date(data.recent[0]?.created_date || now),
          });
        }
      }
    });
    
    // "Mixed reactions" - frats with varied recent ratings
    fratRatings.forEach(r => {
      const frat = fraternities.find(f => f.id === r.fraternity_id);
      if (!frat) return;
      
      const recentForFrat = fratRatings.filter(
        fr => fr.fraternity_id === r.fraternity_id && 
        new Date(fr.created_date) >= oneDayAgo
      );
      
      if (recentForFrat.length >= 2) {
        const scores = recentForFrat.map(fr => fr.combined_score || 0);
        const variance = Math.max(...scores) - Math.min(...scores);
        
        if (variance >= 3 && !items.find(i => i.id === `mixed-${frat.id}`)) {
          items.push({
            id: `mixed-${frat.id}`,
            type: 'mixed_reactions',
            entityName: frat.name,
            entityId: frat.id,
            entityType: 'fraternity',
            timestamp: new Date(recentForFrat[0]?.created_date || now),
          });
        }
      }
    });
    
    // "People talking about" - frats/parties with recent comments
    const commentCounts: Record<string, number> = {};
    
    [...fratComments, ...partyComments].forEach(c => {
      const commentDate = new Date(c.created_date);
      if (commentDate >= oneDayAgo) {
        const key = c.fraternity_id || c.party_id;
        commentCounts[key] = (commentCounts[key] || 0) + 1;
      }
    });
    
    Object.entries(commentCounts).forEach(([entityId, count]) => {
      if (count >= 2) {
        const frat = fraternities.find(f => f.id === entityId);
        const party = parties.find(p => p.id === entityId);
        
        if (frat && !items.find(i => i.entityId === entityId)) {
          const recentComments = fratComments
            .filter(c => c.fraternity_id === entityId)
            .sort((a, b) => new Date(b.created_date).getTime() - new Date(a.created_date).getTime())
            .slice(0, 5);
          
          items.push({
            id: `talking-${entityId}`,
            type: 'talking_about',
            entityName: frat.name,
            entityId: entityId,
            entityType: 'fraternity',
            count,
            timestamp: new Date(recentComments[0]?.created_date || now),
            comments: recentComments,
          });
        } else if (party && !items.find(i => i.entityId === entityId)) {
          items.push({
            id: `talking-${entityId}`,
            type: 'talking_about',
            entityName: party.title,
            entityId: entityId,
            entityType: 'party',
            count,
            timestamp: new Date(),
          });
        }
      }
    });
    
    // Sort by timestamp and limit
    return items
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, 7);
  }, [fraternities, parties, fratRatings, partyRatings, fratComments, partyComments]);

  // Generate highlight item
  const highlightItem = useMemo((): HighlightItem | null => {
    // Find viral comment (most upvotes in last 24h)
    const allComments = [
      ...fratComments.map(c => ({ ...c, entityType: 'fraternity' as const })),
      ...partyComments.map(c => ({ ...c, entityType: 'party' as const })),
    ];
    
    const sortedByUpvotes = allComments
      .filter(c => c.upvotes > 0)
      .sort((a, b) => (b.upvotes || 0) - (a.upvotes || 0));
    
    if (sortedByUpvotes.length > 0) {
      const top = sortedByUpvotes[0];
      const frat = fraternities.find(f => f.id === top.fraternity_id);
      const party = parties.find(p => p.id === top.party_id);
      const entityName = top.entityType === 'fraternity' ? frat?.name : party?.title;
      
      return {
        id: `viral-${top.id}`,
        type: 'viral_comment',
        content: top.text,
        entityName,
        entityId: top.fraternity_id || top.party_id,
        entityType: top.entityType,
        upvotes: top.upvotes,
      };
    }
    
    // Fallback: Battle between top 2 frats
    if (fraternities.length >= 2) {
      const sorted = [...fraternities].sort((a, b) => (b.display_score || 0) - (a.display_score || 0));
      return {
        id: 'battle-top2',
        type: 'battle',
        content: 'Who runs campus?',
        fratA: { name: sorted[0].name, id: sorted[0].id, score: sorted[0].display_score || 0 },
        fratB: { name: sorted[1].name, id: sorted[1].id, score: sorted[1].display_score || 0 },
      };
    }
    
    return null;
  }, [fratComments, partyComments, fraternities, parties]);

  // Default move options
  const moveOptions = [
    { id: 'going_out', label: 'Going out' },
    { id: 'staying_in', label: 'Staying in' },
    { id: 'studying', label: 'Studying' },
    { id: 'undecided', label: 'Undecided' },
  ];

  const handleMoveVote = (optionId: string) => {
    const newVotes = { ...allUserVotes };
    if (userMoveVote === optionId) {
      delete newVotes[userId];
    } else {
      newVotes[userId] = optionId;
    }
    setAllUserVotes(newVotes);
    localStorage.setItem('touse_all_user_votes', JSON.stringify(newVotes));
    
    // Collapse after voting
    if (!userMoveVote) {
      setTimeout(() => setPollCollapsed(true), 300);
    }
  };

  const handleQuickComment = async () => {
    if (!quickComment.trim()) return;
    
    const user = await base44.auth.me();
    if (!user) {
      toast({ title: 'Please sign in to post', variant: 'destructive' });
      return;
    }
    
    setSubmitting(true);
    try {
      await base44.entities.ChatMessage.create({
        user_id: user.id,
        text: quickComment.trim(),
        upvotes: 0,
        downvotes: 0,
      });
      await recordUserAction();
      setQuickComment('');
      await loadData();
      toast({ title: 'Posted!' });
    } catch (error) {
      console.error('Failed to post:', error);
      toast({ title: 'Failed to post', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  const getPulseIcon = (type: PulseItem['type']) => {
    switch (type) {
      case 'heating_up': return <Flame className="h-4 w-4" />;
      case 'mixed_reactions': return <Eye className="h-4 w-4" />;
      case 'slipping': return <TrendingDown className="h-4 w-4" />;
      case 'talking_about': return <MessageSquare className="h-4 w-4" />;
      case 'rising': return <Trophy className="h-4 w-4" />;
    }
  };

  const getPulseMessage = (item: PulseItem) => {
    switch (item.type) {
      case 'heating_up': 
        return `${item.entityName} is heating up — ${item.count} ratings in the last hour`;
      case 'mixed_reactions': 
        return `${item.entityName} getting mixed reactions tonight`;
      case 'slipping': 
        return `${item.entityName} slipping — down ${item.delta} spots since yesterday`;
      case 'talking_about': 
        return `People are talking about ${item.entityName} right now`;
      case 'rising': 
        return `${item.entityName} climbing the ranks`;
    }
  };

  const getPulseBgColor = (type: PulseItem['type']) => {
    switch (type) {
      case 'heating_up': return 'bg-orange-500/10';
      case 'mixed_reactions': return 'bg-yellow-500/10';
      case 'slipping': return 'bg-red-500/10';
      case 'talking_about': return 'bg-blue-500/10';
      case 'rising': return 'bg-emerald-500/10';
    }
  };

  const getPulseIconColor = (type: PulseItem['type']) => {
    switch (type) {
      case 'heating_up': return 'text-orange-500';
      case 'mixed_reactions': return 'text-yellow-500';
      case 'slipping': return 'text-red-500';
      case 'talking_about': return 'text-blue-500';
      case 'rising': return 'text-emerald-500';
    }
  };

  if (loading) {
    return (
      <div className="space-y-4 pb-24">
        <Skeleton className="h-32 rounded-2xl" />
        <Skeleton className="h-12 rounded-xl" />
        <div className="space-y-2">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-16 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-24">
      {/* 1. Sticky Top: What's the move tonight? */}
      <div className="sticky top-0 z-40 -mx-4 px-4 pt-2 pb-3 bg-background/95 backdrop-blur-sm">
        {pollCollapsed && userMoveVote ? (
          // Collapsed compact bar
          <button
            onClick={() => setPollCollapsed(false)}
            className="w-full flex items-center justify-between p-3 rounded-2xl bg-card border"
          >
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium">Tonight:</span>
              <span className="text-sm font-semibold text-primary">
                {moveOptions.find(o => o.id === userMoveVote)?.label || userMoveVote}
              </span>
              <span className="text-xs text-muted-foreground">
                {totalMoveVotes} voting
              </span>
            </div>
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          </button>
        ) : (
          // Expanded poll
          <div className="rounded-2xl bg-card border p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-bold">What's the move tonight?</h2>
              {userMoveVote && (
                <button
                  onClick={() => setPollCollapsed(true)}
                  className="p-1 hover:bg-muted rounded-full"
                >
                  <ChevronUp className="h-4 w-4 text-muted-foreground" />
                </button>
              )}
            </div>
            
            <div className="grid grid-cols-2 gap-2">
              {moveOptions.map((option) => {
                const votes = moveVotes[option.id] || 0;
                const percentage = totalMoveVotes > 0 ? (votes / totalMoveVotes) * 100 : 0;
                const isSelected = userMoveVote === option.id;
                
                return (
                  <button
                    key={option.id}
                    onClick={() => handleMoveVote(option.id)}
                    className={cn(
                      "relative p-4 rounded-xl text-left transition-all active:scale-[0.98] overflow-hidden",
                      isSelected 
                        ? "bg-primary text-primary-foreground" 
                        : "bg-muted hover:bg-muted/80"
                    )}
                  >
                    {userMoveVote && !isSelected && (
                      <div 
                        className="absolute inset-y-0 left-0 bg-primary/10 transition-all duration-500"
                        style={{ width: `${percentage}%` }}
                      />
                    )}
                    <div className="relative">
                      <p className="font-semibold text-sm">{option.label}</p>
                      {userMoveVote && (
                        <p className={cn(
                          "text-xs mt-1",
                          isSelected ? "text-primary-foreground/80" : "text-muted-foreground"
                        )}>
                          {percentage.toFixed(0)}% ({votes})
                        </p>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
            
            {totalMoveVotes > 0 && (
              <p className="text-xs text-muted-foreground text-center mt-3">
                {totalMoveVotes} {totalMoveVotes === 1 ? 'person' : 'people'} voting
              </p>
            )}
          </div>
        )}
      </div>

      {/* 2. Quick Comment Bar */}
      <div className="flex gap-2">
        <Input
          value={quickComment}
          onChange={(e) => setQuickComment(e.target.value)}
          placeholder="Say something..."
          className="flex-1 h-12 rounded-xl bg-card border text-sm"
          onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleQuickComment()}
        />
        <Button
          onClick={handleQuickComment}
          disabled={!quickComment.trim() || submitting}
          size="icon"
          className="h-12 w-12 rounded-xl"
        >
          <Send className="h-5 w-5" />
        </Button>
      </div>

      {/* 3. Campus Pulse */}
      <div className="space-y-2">
        {pulseItems.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <p className="text-sm">No activity yet tonight</p>
          </div>
        ) : (
          pulseItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setExpandedPulse(item)}
              className={cn(
                "w-full p-3 rounded-xl text-left transition-all active:scale-[0.99]",
                getPulseBgColor(item.type)
              )}
            >
              <div className="flex items-center gap-3">
                <span className={getPulseIconColor(item.type)}>
                  {getPulseIcon(item.type)}
                </span>
                <p className="flex-1 text-sm font-medium">
                  {getPulseMessage(item)}
                </p>
                <span className="text-xs text-muted-foreground shrink-0">
                  {formatPulseTime(item.timestamp)}
                </span>
              </div>
            </button>
          ))
        )}
      </div>

      {/* 4. Highlight Slot */}
      {highlightItem && (
        <div className="rounded-2xl bg-card border-2 border-primary/20 p-5">
          {highlightItem.type === 'viral_comment' && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Flame className="h-4 w-4 text-orange-500" />
                <span className="text-xs font-medium text-orange-500 uppercase tracking-wide">Hot Take</span>
              </div>
              <p className="text-lg font-medium leading-snug">"{highlightItem.content}"</p>
              {highlightItem.entityName && (
                <Link 
                  to={createPageUrl(`${highlightItem.entityType === 'fraternity' ? 'Fraternity' : 'Party'}?id=${highlightItem.entityId}`)}
                  className="text-sm text-primary hover:underline"
                >
                  on {highlightItem.entityName}
                </Link>
              )}
              <div className="flex items-center gap-4 pt-2">
                <button className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500/10 text-emerald-600 font-medium text-sm hover:bg-emerald-500/20 transition-all">
                  <ThumbsUp className="h-4 w-4" />
                  Agree ({highlightItem.upvotes || 0})
                </button>
                <button className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-500/10 text-red-500 font-medium text-sm hover:bg-red-500/20 transition-all">
                  <ThumbsDown className="h-4 w-4" />
                  Disagree
                </button>
              </div>
            </div>
          )}
          
          {highlightItem.type === 'battle' && highlightItem.fratA && highlightItem.fratB && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 justify-center">
                <Swords className="h-4 w-4 text-primary" />
                <span className="text-xs font-medium text-primary uppercase tracking-wide">Battle</span>
              </div>
              <p className="text-center text-lg font-bold">{highlightItem.content}</p>
              <div className="grid grid-cols-2 gap-3">
                <Link
                  to={createPageUrl(`Fraternity?id=${highlightItem.fratA.id}`)}
                  className="p-4 rounded-xl bg-muted hover:bg-primary hover:text-primary-foreground transition-all text-center group"
                >
                  <p className="font-bold text-base">{highlightItem.fratA.name}</p>
                  <p className="text-xs text-muted-foreground group-hover:text-primary-foreground/70 mt-1">
                    {highlightItem.fratA.score.toFixed(1)} score
                  </p>
                </Link>
                <Link
                  to={createPageUrl(`Fraternity?id=${highlightItem.fratB.id}`)}
                  className="p-4 rounded-xl bg-muted hover:bg-primary hover:text-primary-foreground transition-all text-center group"
                >
                  <p className="font-bold text-base">{highlightItem.fratB.name}</p>
                  <p className="text-xs text-muted-foreground group-hover:text-primary-foreground/70 mt-1">
                    {highlightItem.fratB.score.toFixed(1)} score
                  </p>
                </Link>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Pulse Expansion Sheet */}
      <Sheet open={!!expandedPulse} onOpenChange={(open) => !open && setExpandedPulse(null)}>
        <SheetContent side="bottom" className="rounded-t-3xl max-h-[70vh]">
          {expandedPulse && (
            <>
              <SheetHeader className="pb-4">
                <div className="flex items-center gap-3">
                  <span className={getPulseIconColor(expandedPulse.type)}>
                    {getPulseIcon(expandedPulse.type)}
                  </span>
                  <SheetTitle className="text-lg">
                    {expandedPulse.entityName}
                  </SheetTitle>
                </div>
              </SheetHeader>
              
              <ScrollArea className="max-h-[50vh]">
                <div className="space-y-3 pb-4">
                  <Link
                    to={createPageUrl(`${expandedPulse.entityType === 'fraternity' ? 'Fraternity' : 'Party'}?id=${expandedPulse.entityId}`)}
                    className="block p-3 rounded-xl bg-primary/10 text-primary text-sm font-medium hover:bg-primary/20 transition-all"
                  >
                    View {expandedPulse.entityType === 'fraternity' ? 'fraternity' : 'party'} page
                  </Link>
                  
                  {expandedPulse.comments && expandedPulse.comments.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Recent comments</p>
                      {expandedPulse.comments.map((comment) => (
                        <div key={comment.id} className="p-3 rounded-xl bg-muted">
                          <p className="text-sm">{comment.text}</p>
                          <div className="flex items-center gap-2 mt-2">
                            <ThumbsUp className="h-3 w-3 text-muted-foreground" />
                            <span className="text-xs text-muted-foreground">{comment.upvotes}</span>
                            <span className="text-xs text-muted-foreground ml-auto">
                              {formatPulseTime(new Date(comment.created_date))}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </ScrollArea>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* Floating Action Button */}
      <button
        onClick={() => document.querySelector<HTMLInputElement>('input[placeholder="Say something..."]')?.focus()}
        className="fixed bottom-24 right-4 z-50 px-5 py-3 rounded-full bg-foreground text-background shadow-lg active:scale-95 transition-transform hover:shadow-xl font-bold text-sm"
        style={{ marginBottom: 'env(safe-area-inset-bottom)' }}
      >
        Say something
      </button>
    </div>
  );
}
