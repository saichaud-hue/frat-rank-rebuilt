import { useState, useEffect, useRef, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { User, PartyPopper, LogIn, Award, ChevronRight, Pencil, Trash2, Trophy, MessageCircle, Image, Lock, X, ListOrdered, Star, Users, Shield, Heart, Sparkles, Music, Zap, CheckCircle2, Loader2, Share2, Swords, ChevronDown, LogOut } from 'lucide-react';
import { cn } from '@/lib/utils';
import PollCard, { parsePollFromText } from '@/components/activity/PollCard';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { 
  partyRatingQueries, 
  reputationRatingQueries, 
  partyQueries, 
  fraternityQueries, 
  partyPhotoQueries,
  partyCommentQueries,
  fraternityCommentQueries,
  chatMessageQueries,
  getCurrentUser,
  type PartyRating, 
  type ReputationRating, 
  type Party, 
  type Fraternity, 
  type PartyPhoto 
} from '@/lib/supabase-data';
import { format } from 'date-fns';
import { formatTimeAgo, getScoreBgColor, createPageUrl, clamp, getFratGreek } from '@/utils';
import PartyRatingForm from '@/components/rate/PartyRatingForm';
import RateFratSheet from '@/components/leaderboard/RateFratSheet';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { toast } from '@/hooks/use-toast';
import { ensureAuthed } from '@/utils/auth';
import YourListsIntro from '@/components/onboarding/YourListsIntro';
import { Confetti } from '@/components/ui/confetti';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { recordUserAction } from '@/utils/streak';
import ShareBattleDialog from '@/components/share/ShareBattleDialog';
import FratBattleGame from '@/components/activity/FratBattleGame';
import { useAuth } from '@/contexts/AuthContext';
import { useAdminCheck } from '@/hooks/useAdminCheck';
import { useStreak } from '@/hooks/useStreak';
import StreakDisplay from '@/components/profile/StreakDisplay';
import { awardPoints } from '@/utils/points';

type EnrichedPartyRating = PartyRating & { party?: Party; fraternity?: Fraternity };
type EnrichedRepRating = ReputationRating & { fraternity?: Fraternity };
type EnrichedPhoto = PartyPhoto & { party?: Party; fraternity?: Fraternity };

interface SavedBattleRanking {
  id: string;
  date: string;
  ranking: Array<{ fratId: string; fratName: string; tier: string; wins: number }>;
}

interface RankedFrat {
  fraternity: Fraternity;
  score: number;
  rank: number;
  brotherhood: number;
  reputation: number;
  community: number;
}

interface RankedParty {
  party: Party;
  fraternity?: Fraternity;
  score: number;
  rank: number;
  vibe: number;
  music: number;
  execution: number;
}

export default function Profile() {
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const { isAdmin } = useAdminCheck();
  const { streak, longestStreak, hoursRemaining, points, levelInfo, refetch: refetchStreak } = useStreak();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ partyRatings: 0, fratRatings: 0, comments: 0, privatePhotos: 0 });
  const [partyRatingsData, setPartyRatingsData] = useState<EnrichedPartyRating[]>([]);
  const [fratRatingsData, setFratRatingsData] = useState<EnrichedRepRating[]>([]);
  const [commentsData, setCommentsData] = useState<any[]>([]);
  const [pollVotesData, setPollVotesData] = useState<Record<string, { userVote: number | null; voteCounts: Record<number, number> }>>({});
  const [privatePhotos, setPrivatePhotos] = useState<EnrichedPhoto[]>([]);
  const [activeTab, setActiveTab] = useState<'rankings' | 'history' | 'comments' | 'photos'>('rankings');
  const [viewingPhoto, setViewingPhoto] = useState<EnrichedPhoto | null>(null);
  const [deletingPhotoId, setDeletingPhotoId] = useState<string | null>(null);
  
  const [editingPartyRating, setEditingPartyRating] = useState<EnrichedPartyRating | null>(null);
  const [deletingPartyRatingId, setDeletingPartyRatingId] = useState<string | null>(null);
  const [editingFratRating, setEditingFratRating] = useState<EnrichedRepRating | null>(null);
  const [deletingFratRatingId, setDeletingFratRatingId] = useState<string | null>(null);
  const [deletingCommentId, setDeletingCommentId] = useState<string | null>(null);

  // Rankings state (from YourRankings)
  const [rankingsSubTab, setRankingsSubTab] = useState<'frats' | 'parties' | 'battles'>('frats');
  const [rankedFrats, setRankedFrats] = useState<RankedFrat[]>([]);
  const [rankedParties, setRankedParties] = useState<RankedParty[]>([]);
  const [savedBattleRankings, setSavedBattleRankings] = useState<SavedBattleRanking[]>([]);
  const [allFraternities, setAllFraternities] = useState<Fraternity[]>([]);
  const [allParties, setAllParties] = useState<Party[]>([]);
  const [ratedFratCount, setRatedFratCount] = useState(0);
  const [ratedPartyCount, setRatedPartyCount] = useState(0);
  const [ratedFratIds, setRatedFratIds] = useState<string[]>([]);
  const [ratedPartyIds, setRatedPartyIds] = useState<string[]>([]);
  
  // Intro state
  const [showIntro, setShowIntro] = useState(false);
  const [introChecked, setIntroChecked] = useState(false);
  
  // Frat/Party picker sheets
  const [showFratPicker, setShowFratPicker] = useState(false);
  const [showPartyPicker, setShowPartyPicker] = useState(false);
  
  // Rating sheets
  const [selectedFrat, setSelectedFrat] = useState<Fraternity | null>(null);
  const [existingFratScores, setExistingFratScores] = useState<{ brotherhood: number; reputation: number; community: number } | undefined>();
  const [selectedParty, setSelectedParty] = useState<Party | null>(null);
  const [ratingFromIntro, setRatingFromIntro] = useState(false);
  const [introReturnStep, setIntroReturnStep] = useState<'main' | 'frats' | 'parties' | 'frat-list' | 'party-list'>('main');
  
  // Confetti and share popup state
  const completionPostedRef = useRef(false);
  const partyCompletionPostedRef = useRef(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [shareType, setShareType] = useState<'frats' | 'parties'>('frats');
  const [pendingShareUserId, setPendingShareUserId] = useState<string | null>(null);
  
  // Frat Battle game state
  const [showFratBattleGame, setShowFratBattleGame] = useState(false);
  const [expandedBattles, setExpandedBattles] = useState<Record<string, boolean>>({});
  const [shareBattleDialogOpen, setShareBattleDialogOpen] = useState(false);
  const [battleToShare, setBattleToShare] = useState<SavedBattleRanking | null>(null);
  
  // Sign-out confirmation
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  useEffect(() => {
    loadProfile();
    // Load saved battle rankings from localStorage
    const saved = localStorage.getItem('touse_saved_battle_rankings');
    if (saved) {
      setSavedBattleRankings(JSON.parse(saved));
    }
  }, []);

  // Show intro on every visit unless permanently dismissed
  useEffect(() => {
    if (!introChecked && !loading && user && activeTab === 'rankings') {
      const permanentDismissed = localStorage.getItem('touse_yourlists_intro_never_show');
      if (!permanentDismissed) {
        setShowIntro(true);
      }
      setIntroChecked(true);
    }
  }, [loading, user, introChecked, activeTab]);

  const loadProfile = async () => {
    try {
      const userData = await getCurrentUser();
      setUser(userData);

      if (userData) {
        const [allPartyRatings, allRepRatings, allPartyComments, allFratComments, allChatMessages, parties, fraternities, allPhotos] = await Promise.all([
          partyRatingQueries.list(),
          reputationRatingQueries.list(),
          partyCommentQueries.list(),
          fraternityCommentQueries.list(),
          chatMessageQueries.list(),
          partyQueries.list(),
          fraternityQueries.list(),
          partyPhotoQueries.list(),
        ]);

        const partyRatings = allPartyRatings.filter(r => r.user_id === userData.id);
        const repRatings = allRepRatings.filter(r => r.user_id === userData.id);
        const partyComments = allPartyComments.filter(c => c.user_id === userData.id);
        const fratComments = allFratComments.filter(c => c.user_id === userData.id);
        const chatMessages = allChatMessages.filter(c => c.user_id === userData.id);
        const userPhotos = allPhotos.filter(p => p.user_id === userData.id);

        const activeFraternities = fraternities.filter(f => f.status === 'active');
        setAllFraternities(activeFraternities);
        
        const now = new Date();
        const pastParties = parties.filter(p => {
          if (!p.ends_at) return false;
          return new Date(p.ends_at) < now;
        });
        setAllParties(pastParties);

        const userPrivatePhotos = userPhotos.filter(p => p.visibility === 'private');
        const enrichedPrivatePhotos = userPrivatePhotos.map(photo => {
          const party = parties.find(p => p.id === photo.party_id);
          const fraternity = party ? fraternities.find(f => f.id === party.fraternity_id) : null;
          return { ...photo, party: party ?? undefined, fraternity: fraternity ?? undefined };
        });
        setPrivatePhotos(enrichedPrivatePhotos);

        const enrichedPartyRatings = partyRatings.map(r => {
          const party = parties.find(p => p.id === r.party_id);
          const fraternity = party ? fraternities.find(f => f.id === party.fraternity_id) : null;
          return { ...r, party: party ?? undefined, fraternity: fraternity ?? undefined };
        });

        const enrichedFratRatings = repRatings.map(r => {
          const fraternity = fraternities.find(f => f.id === r.fraternity_id);
          return { ...r, fraternity: fraternity ?? undefined };
        });

        const enrichedPartyComments = partyComments.map(c => {
          const party = parties.find(p => p.id === c.party_id);
          const frat = party?.fraternity_id ? fraternities.find(f => f.id === party.fraternity_id) : null;
          const entityName = frat ? `${frat.chapter} ${party?.title}` : (party?.title || 'Unknown Party');
          return { ...c, entityName, type: 'party' as const };
        });
        const enrichedFratComments = fratComments.map(c => {
          const frat = fraternities.find(f => f.id === c.fraternity_id);
          return { ...c, entityName: frat?.name || 'Unknown Fraternity', type: 'fraternity' as const };
        });
        const enrichedChatMessages = chatMessages.map(c => {
          const mentionedParty = c.mentioned_party_id ? parties.find(p => p.id === c.mentioned_party_id) : null;
          const mentionedFrat = c.mentioned_fraternity_id ? fraternities.find(f => f.id === c.mentioned_fraternity_id) : null;
          const partyFrat = mentionedParty?.fraternity_id ? fraternities.find(f => f.id === mentionedParty.fraternity_id) : null;
          const entityName = mentionedParty 
            ? (partyFrat ? `${partyFrat.chapter} ${mentionedParty.title}` : mentionedParty.title)
            : (mentionedFrat?.name || 'Chat');
          return { ...c, entityName, type: 'chat' as const };
        });

        setPartyRatingsData(enrichedPartyRatings);
        setFratRatingsData(enrichedFratRatings);
        
        const allUserComments = [...enrichedPartyComments, ...enrichedFratComments, ...enrichedChatMessages].sort((a, b) => 
          new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
        );
        setCommentsData(allUserComments);
        
        // Load poll votes for chat messages that are polls
        const pollMessageIds = enrichedChatMessages
          .filter(c => c.text && c.text.includes('POLL:'))
          .map(c => c.id);
        
        if (pollMessageIds.length > 0) {
          const { data: pollVotes } = await supabase
            .from('poll_votes')
            .select('*')
            .in('message_id', pollMessageIds);
          
          const pollVotesMap: Record<string, { userVote: number | null; voteCounts: Record<number, number> }> = {};
          
          pollMessageIds.forEach(msgId => {
            const msgVotes = pollVotes?.filter(v => v.message_id === msgId) || [];
            const voteCounts: Record<number, number> = {};
            let userVote: number | null = null;
            
            msgVotes.forEach(v => {
              voteCounts[v.option_index] = (voteCounts[v.option_index] || 0) + 1;
              if (v.user_id === userData.id) {
                userVote = v.option_index;
              }
            });
            
            pollVotesMap[msgId] = { userVote, voteCounts };
          });
          
          setPollVotesData(pollVotesMap);
        }

        setStats({
          partyRatings: partyRatings.length,
          fratRatings: repRatings.length,
          comments: partyComments.length + fratComments.length + chatMessages.length,
          privatePhotos: enrichedPrivatePhotos.length,
        });

        setRatedFratCount(repRatings.length);
        setRatedPartyCount(partyRatings.length);
        setRatedFratIds(repRatings.map(r => r.fraternity_id).filter(Boolean) as string[]);
        setRatedPartyIds(partyRatings.map(r => r.party_id).filter(Boolean) as string[]);

        const fratMap = new Map(fraternities.map(f => [f.id, f]));
        const partyMap = new Map(parties.map(p => [p.id, p]));

        const userFratScores: RankedFrat[] = repRatings
          .filter(r => r.fraternity_id && fratMap.has(r.fraternity_id))
          .map(r => ({
            fraternity: fratMap.get(r.fraternity_id!)!,
            score: Number(r.combined_score) ?? 5,
            rank: 0,
            brotherhood: Number(r.brotherhood_score) ?? 5,
            reputation: Number(r.reputation_score) ?? 5,
            community: Number(r.community_score) ?? 5,
          }))
          .sort((a, b) => b.score - a.score);

        userFratScores.forEach((item, index) => {
          if (index === 0) {
            item.rank = 1;
          } else if (Math.abs(item.score - userFratScores[index - 1].score) < 0.01) {
            item.rank = userFratScores[index - 1].rank;
          } else {
            item.rank = index + 1;
          }
        });
        setRankedFrats(userFratScores);

        const userPartyScores: RankedParty[] = partyRatings
          .filter(r => r.party_id && partyMap.has(r.party_id))
          .map(r => {
            const party = partyMap.get(r.party_id!)!;
            return {
              party,
              fraternity: party.fraternity_id ? fratMap.get(party.fraternity_id) : undefined,
              score: Number(r.party_quality_score) ?? 5,
              rank: 0,
              vibe: Number(r.vibe_score) ?? 5,
              music: Number(r.music_score) ?? 5,
              execution: Number(r.execution_score) ?? 5,
            };
          })
          .sort((a, b) => b.score - a.score);

        userPartyScores.forEach((item, index) => {
          if (index === 0) {
            item.rank = 1;
          } else if (Math.abs(item.score - userPartyScores[index - 1].score) < 0.01) {
            item.rank = userPartyScores[index - 1].rank;
          } else {
            item.rank = index + 1;
          }
        });
        setRankedParties(userPartyScores);
      }
    } catch (error) {
      console.error('Failed to load profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = () => {
    navigate('/auth');
  };

  const handleLogout = async () => {
    await signOut();
    navigate('/auth');
  };

  const handlePartyRatingSubmit = () => {
    setEditingPartyRating(null);
    loadProfile();
  };

  const handleDeletePartyRating = async (ratingId: string) => {
    try {
      await partyRatingQueries.delete(ratingId);
      loadProfile();
    } catch (error) {
      console.error('Failed to delete rating:', error);
    }
    setDeletingPartyRatingId(null);
  };

  const handleFratRatingSubmit = async (scores: { brotherhood: number; reputation: number; community: number; combined: number }) => {
    if (!editingFratRating) return;
    
    try {
      await reputationRatingQueries.update(editingFratRating.id, {
        brotherhood_score: scores.brotherhood,
        reputation_score: scores.reputation,
        community_score: scores.community,
        combined_score: scores.combined,
      });
      
      if (editingFratRating.fraternity_id) {
        const allRepRatings = await reputationRatingQueries.listByFraternity(editingFratRating.fraternity_id);
        
        const avgReputation = allRepRatings.length > 0
          ? allRepRatings.reduce((sum, r) => sum + (r.combined_score ?? 5), 0) / allRepRatings.length
          : 5;
        
        await fraternityQueries.update(editingFratRating.fraternity_id, {
          reputation_score: Math.min(10, Math.max(0, avgReputation)),
        });
      }
      
      setEditingFratRating(null);
      loadProfile();
    } catch (error) {
      console.error('Failed to update frat rating:', error);
    }
  };

  const handleDeleteFratRating = async (ratingId: string, fraternityId?: string) => {
    try {
      await reputationRatingQueries.delete(ratingId);
      
      if (fraternityId) {
        const allRepRatings = await reputationRatingQueries.listByFraternity(fraternityId);
        
        const avgReputation = allRepRatings.length > 0
          ? allRepRatings.reduce((sum, r) => sum + (r.combined_score ?? 5), 0) / allRepRatings.length
          : 5;
        
        await fraternityQueries.update(fraternityId, {
          reputation_score: Math.min(10, Math.max(0, avgReputation)),
        });
      }
      
      loadProfile();
    } catch (error) {
      console.error('Failed to delete frat rating:', error);
    }
    setDeletingFratRatingId(null);
  };

  const handleDeleteComment = async (comment: any) => {
    try {
      if (comment.type === 'party') {
        await partyCommentQueries.delete(comment.id);
      } else if (comment.type === 'fraternity') {
        await fraternityCommentQueries.delete(comment.id);
      } else if (comment.type === 'chat') {
        await chatMessageQueries.delete(comment.id);
      }
      setCommentsData(prev => prev.filter(c => c.id !== comment.id));
      setStats(prev => ({ ...prev, comments: prev.comments - 1 }));
    } catch (error) {
      console.error('Failed to delete comment:', error);
    }
    setDeletingCommentId(null);
  };

  // Rankings-specific handlers
  const handleIntroComplete = (neverShowAgain: boolean) => {
    if (neverShowAgain) {
      localStorage.setItem('touse_yourlists_intro_never_show', 'true');
    }
    setShowIntro(false);
  };

  const handleRateFrat = async (fraternity: Fraternity, fromIntro: boolean = false) => {
    const user = await ensureAuthed();
    if (!user) return;

    setRatingFromIntro(fromIntro);

    const existingRating = await reputationRatingQueries.getByUserAndFraternity(user.id, fraternity.id);

    if (existingRating) {
      setExistingFratScores({
        brotherhood: existingRating.brotherhood_score ?? 5,
        reputation: existingRating.reputation_score ?? 5,
        community: existingRating.community_score ?? 5,
      });
    } else {
      setExistingFratScores(undefined);
    }
    setSelectedFrat(fraternity);
  };

  const handleNewFratRatingSubmit = async (scores: { brotherhood: number; reputation: number; community: number; combined: number }) => {
    if (!selectedFrat) return;

    const user = await getCurrentUser();
    if (!user) return;

    const existingRating = await reputationRatingQueries.getByUserAndFraternity(user.id, selectedFrat.id);

    const ratingData = {
      brotherhood_score: scores.brotherhood,
      reputation_score: scores.reputation,
      community_score: scores.community,
      combined_score: scores.combined,
    };

    const isNewRating = !existingRating;

    if (existingRating) {
      await reputationRatingQueries.update(existingRating.id, ratingData);
    } else {
      await reputationRatingQueries.create({
        fraternity_id: selectedFrat.id,
        user_id: user.id,
        ...ratingData,
        weight: 1,
        semester: 'Fall 2024',
      });
    }

    // Update fraternity reputation score
    const allRatings = await reputationRatingQueries.listByFraternity(selectedFrat.id);

    const reputationScore = allRatings.length > 0
      ? allRatings.reduce((sum, r) => sum + (r.combined_score ?? 5), 0) / allRatings.length
      : 5;

    await fraternityQueries.update(selectedFrat.id, {
      reputation_score: clamp(reputationScore, 0, 10),
    });

    // Award points for rating
    if (isNewRating) {
      await awardPoints('rate_fraternity', `Rated ${selectedFrat.name}`);
    }
    await recordUserAction();
    refetchStreak();

    setSelectedFrat(null);
    await loadProfile();

    // Check if user just completed ALL frat ratings (show confetti/share)
    const newRatedCount = isNewRating ? ratedFratCount + 1 : ratedFratCount;
    const allFratsRated = newRatedCount >= allFraternities.length;
    
    // Only show confetti/share dialog when ALL frats are rated, not at 5
    if (allFratsRated && isNewRating && !completionPostedRef.current) {
      // User just rated all frats - show congratulations
      completionPostedRef.current = true;
      setShowConfetti(true);
      setShareType('frats');
      setPendingShareUserId(user.id);
      setShowShareDialog(true);
      setRatingFromIntro(false);
    } else if (ratingFromIntro) {
      // Return to frat-list (not frats progress screen) so user can continue rating
      setIntroReturnStep('frat-list');
      setShowIntro(true);
      setRatingFromIntro(false);
    }
  };

  const postCompletionToFeed = async (userId: string) => {
    try {
      const [repRatings, fraternities] = await Promise.all([
        reputationRatingQueries.list(),
        fraternityQueries.listActive(),
      ]);
      
      const userRepRatings = repRatings.filter(r => r.user_id === userId);
      const fratMap = new Map(fraternities.map(f => [f.id, f]));
      const sortedRatings = userRepRatings
        .filter(r => r.fraternity_id && fratMap.has(r.fraternity_id))
        .map(r => ({
          frat: fratMap.get(r.fraternity_id!)!,
          score: r.combined_score ?? 5,
        }))
        .sort((a, b) => b.score - a.score);
      
      const tiers = [
        { name: 'Upper Touse', ranks: [1] },
        { name: 'Touse', ranks: [2] },
        { name: 'Lower Touse', ranks: [3] },
        { name: 'Upper Mouse', ranks: [4] },
        { name: 'Mouse', ranks: [5, 6] },
        { name: 'Lower Mouse', ranks: [7] },
        { name: 'Upper Bouse', ranks: [8] },
        { name: 'Bouse', ranks: [9] },
        { name: 'Lower Bouse', ranks: [10] },
      ];
      
      const tierLines = tiers.map(tier => {
        const fratNames = tier.ranks
          .map(r => sortedRatings[r - 1]?.frat?.name)
          .filter(Boolean)
          .join(', ');
        return fratNames ? `${tier.name}: ${fratNames}` : null;
      }).filter(Boolean);
      
      const message = `Just completed ranking all ${fraternities.length} fraternities.\n\n${tierLines.join('\n')}`;
      
      await chatMessageQueries.create({
        user_id: userId,
        text: message,
        upvotes: 0,
        downvotes: 0,
        parent_message_id: null,
        mentioned_fraternity_id: null,
        mentioned_party_id: null,
      });
      
      toast({
        title: "Shared to Feed",
        description: "Your tier list is now visible to everyone!",
      });
    } catch (error) {
      console.error('Failed to post completion:', error);
    }
  };

  const handleRateParty = async (party: Party, fromIntro: boolean = false) => {
    const user = await ensureAuthed();
    if (!user) return;
    setRatingFromIntro(fromIntro);
    setSelectedParty(party);
  };

  const handleNewPartyRatingSubmit = async () => {
    setSelectedParty(null);
    
    const user = await getCurrentUser();
    const prevPartyCount = ratedPartyCount;
    
    await loadProfile();
    
    if (user && prevPartyCount < 3 && ratedPartyCount + 1 >= 3 && !partyCompletionPostedRef.current) {
      partyCompletionPostedRef.current = true;
      setShowConfetti(true);
      toast({
        title: "Party Rankings Complete",
        description: "You've rated enough parties to unlock your party list!",
      });
    }

    if (ratingFromIntro) {
      setShowIntro(true);
      setRatingFromIntro(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto space-y-4 p-4">
        <Skeleton className="h-40 rounded-2xl" />
        <div className="grid grid-cols-4 gap-2">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-16 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-64 rounded-2xl" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="max-w-md mx-auto p-4 space-y-6">
        <div className="text-center space-y-4 py-12">
          <div className="w-20 h-20 mx-auto rounded-full bg-muted flex items-center justify-center">
            <User className="h-10 w-10 text-muted-foreground" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Welcome to Touse</h1>
            <p className="text-muted-foreground mt-1">Sign in to track your ratings and earn points</p>
          </div>
          <Button onClick={handleLogin} size="lg" className="w-full">
            <LogIn className="h-5 w-5 mr-2" />
            Sign in with Google
          </Button>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="p-4 rounded-xl bg-muted text-center">
            <PartyPopper className="h-6 w-6 mx-auto mb-2 text-primary" />
            <p className="text-xs font-medium">Rate Parties</p>
          </div>
          <div className="p-4 rounded-xl bg-muted text-center">
            <Trophy className="h-6 w-6 mx-auto mb-2 text-primary" />
            <p className="text-xs font-medium">Rate Frats</p>
          </div>
          <div className="p-4 rounded-xl bg-muted text-center">
            <Award className="h-6 w-6 mx-auto mb-2 text-primary" />
            <p className="text-xs font-medium">Earn Points</p>
          </div>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: 'rankings', label: 'Rankings', icon: ListOrdered },
    { id: 'history', label: 'History', icon: Trophy },
    { id: 'comments', label: 'Comments', icon: MessageCircle },
    { id: 'photos', label: 'Photos', icon: Lock },
  ] as const;

  const FRAT_UNLOCK_THRESHOLD = 5;

  return (
    <div data-tutorial="profile-section" className="max-w-2xl mx-auto space-y-4 pb-20">
      {/* Profile Header */}
      <div className="p-5 rounded-2xl bg-muted/50">
        <div className="flex items-center gap-4">
          <Avatar className="h-16 w-16 ring-2 ring-border">
            <AvatarImage src={user.avatar_url} />
            <AvatarFallback className="text-xl font-bold bg-primary text-primary-foreground">
              {user.name?.charAt(0) || 'U'}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold truncate">{user.name}</h1>
            <p className="text-sm text-muted-foreground truncate">{user.email}</p>
            <div className="flex items-center gap-3 mt-2">
              <button
                onClick={() => {}}
                className={cn(
                  "px-3 py-1 rounded-full text-xs font-semibold shadow-md transition-all hover:scale-105",
                  levelInfo.color,
                  levelInfo.textColor
                )}
              >
                Lvl {levelInfo.level} · {levelInfo.name}
              </button>
              <StreakDisplay 
                streak={streak} 
                hoursRemaining={hoursRemaining} 
                longestStreak={longestStreak}
              />
            </div>
          </div>
          <AlertDialog open={showLogoutConfirm} onOpenChange={setShowLogoutConfirm}>
            <AlertDialogTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-11 w-11 rounded-xl text-muted-foreground"
              >
                <LogOut className="h-5 w-5" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Sign out?</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to sign out of your account?
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleLogout}>Sign out</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>

        {/* Points Progress */}
        <div className="mt-4 p-3 rounded-xl bg-background">
          <div className="flex items-center justify-between text-sm mb-2">
            <div className="flex items-center gap-2">
              <Award className="h-4 w-4 text-primary" />
              <span className="font-semibold">{points} pts</span>
            </div>
            {levelInfo.nextLevel && (
              <span className="text-muted-foreground">{levelInfo.pointsToNextLevel} to level up</span>
            )}
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div 
              className="h-full bg-primary rounded-full transition-all duration-500"
              style={{ width: `${levelInfo.progressToNext}%` }}
            />
          </div>
        </div>

        {/* Admin Dashboard Link */}
        {isAdmin && (
          <Link
            to="/Admin"
            className="mt-4 w-full h-12 rounded-xl border border-primary/30 bg-primary/5 flex items-center justify-center gap-2 text-sm font-semibold text-primary hover:bg-primary/10 transition-colors"
          >
            <Shield className="h-4 w-4" />
            Open Admin Dashboard
          </Link>
        )}
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-2 overflow-x-auto no-scrollbar">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap shrink-0 transition-all ${
              activeTab === tab.id 
                ? 'bg-primary text-primary-foreground' 
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
          >
            <tab.icon className="h-4 w-4 shrink-0" />
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Content Area */}
      <div className="rounded-2xl bg-muted/30 overflow-hidden">
        {/* Rankings Tab */}
        {activeTab === 'rankings' && (
          <div>
            {/* Sub-tabs for rankings */}
            <div className="flex gap-2 p-4 overflow-x-auto no-scrollbar border-b border-border/50">
              <button
                onClick={() => setRankingsSubTab('frats')}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
                  rankingsSubTab === 'frats'
                    ? 'bg-foreground text-background'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                }`}
              >
                <Trophy className="h-4 w-4 shrink-0" />
                Frats
                {rankedFrats.length > 0 && (
                  <span className="ml-0.5 text-xs opacity-80">({rankedFrats.length})</span>
                )}
              </button>
              <button
                onClick={() => setRankingsSubTab('parties')}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
                  rankingsSubTab === 'parties'
                    ? 'bg-foreground text-background'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                }`}
              >
                <PartyPopper className="h-4 w-4 shrink-0" />
                Parties
                {rankedParties.length > 0 && (
                  <span className="ml-0.5 text-xs opacity-80">({rankedParties.length})</span>
                )}
              </button>
              <button
                onClick={() => setRankingsSubTab('battles')}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
                  rankingsSubTab === 'battles'
                    ? 'bg-foreground text-background'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                }`}
              >
                <Swords className="h-4 w-4 shrink-0" />
                Battles
                {savedBattleRankings.length > 0 && (
                  <span className="ml-0.5 text-xs opacity-80">({savedBattleRankings.length})</span>
                )}
              </button>
            </div>

            {/* Frats Rankings */}
            {rankingsSubTab === 'frats' && (
              <div className="p-4">
                {ratedFratCount < FRAT_UNLOCK_THRESHOLD ? (
                  <div className="py-12 text-center">
                    <Lock className="h-8 w-8 mx-auto text-muted-foreground/50 mb-3" />
                    <p className="font-medium text-muted-foreground">Frat list locked</p>
                    <p className="text-sm text-muted-foreground/70 mt-1">
                      Rate at least 5 fraternities to unlock ({ratedFratCount}/5)
                    </p>
                    <Button 
                      onClick={() => setShowFratPicker(true)} 
                      className="mt-4 bg-primary hover:bg-primary/90 text-primary-foreground"
                    >
                      <Star className="h-4 w-4 mr-2" />
                      Rate Fraternities
                    </Button>
                  </div>
                ) : rankedFrats.length === 0 ? (
                  <div className="py-12 text-center">
                    <Trophy className="h-8 w-8 mx-auto text-muted-foreground/50 mb-3" />
                    <p className="font-medium text-muted-foreground">No fraternities rated yet</p>
                    <p className="text-sm text-muted-foreground/70 mt-1">Rate fraternities on the Leaderboard</p>
                    <Link to="/Leaderboard">
                      <Button variant="outline" className="mt-4">
                        Go to Leaderboard
                      </Button>
                    </Link>
                  </div>
                ) : (
                  rankedFrats.map((item, index) => (
                    <div key={item.fraternity.id}>
                      <Link to={`/Fraternity/${item.fraternity.id}`}>
                        <div className="flex items-center gap-3 py-3 active:bg-muted/30 transition-colors">
                          <div className="w-6 text-center flex-shrink-0">
                            <span className="text-sm font-semibold text-muted-foreground">
                              {item.rank}.
                            </span>
                          </div>
                          <Avatar className="h-10 w-10 flex-shrink-0">
                            <AvatarImage src={item.fraternity.logo_url} />
                            <AvatarFallback className="bg-muted text-muted-foreground font-semibold text-xs">
                              {getFratGreek(item.fraternity.name)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-sm truncate">{item.fraternity.chapter}</h3>
                            <p className="text-xs text-muted-foreground truncate">{item.fraternity.name}</p>
                          </div>
                          <Badge className={`${getScoreBgColor(item.score)} text-white text-sm px-2.5 py-1`}>
                            {item.score.toFixed(1)}
                          </Badge>
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        </div>
                      </Link>
                      {index < rankedFrats.length - 1 && (
                        <div className="border-t border-border/50" />
                      )}
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Parties Rankings */}
            {rankingsSubTab === 'parties' && (
              <div className="p-4">
                {ratedPartyCount < 3 ? (
                  <div className="py-12 text-center">
                    <Lock className="h-8 w-8 mx-auto text-muted-foreground/50 mb-3" />
                    <p className="font-medium text-muted-foreground">Party list locked</p>
                    <p className="text-sm text-muted-foreground/70 mt-1">
                      Rate at least 3 parties to unlock ({ratedPartyCount}/3)
                    </p>
                    <Button 
                      onClick={() => setShowPartyPicker(true)}
                      className="mt-4 bg-primary hover:bg-primary/90 text-primary-foreground"
                    >
                      <Star className="h-4 w-4 mr-2" />
                      Rate Parties
                    </Button>
                  </div>
                ) : rankedParties.length === 0 ? (
                  <div className="py-12 text-center">
                    <PartyPopper className="h-8 w-8 mx-auto text-muted-foreground/50 mb-3" />
                    <p className="font-medium text-muted-foreground">No parties rated yet</p>
                    <p className="text-sm text-muted-foreground/70 mt-1">Rate parties to build your personal list</p>
                    <Button 
                      onClick={() => setShowPartyPicker(true)}
                      variant="outline" 
                      className="mt-4"
                    >
                      Browse Parties
                    </Button>
                  </div>
                ) : (
                  rankedParties.map((item, index) => (
                    <div key={item.party.id}>
                      <Link to={createPageUrl(`Party?id=${item.party.id}`)}>
                        <div className="flex items-center gap-3 py-3 active:bg-muted/30 transition-colors">
                          <div className="w-6 text-center flex-shrink-0">
                            <span className="text-sm font-semibold text-muted-foreground">
                              {item.rank}.
                            </span>
                          </div>
                          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                            <PartyPopper className="h-5 w-5 text-primary" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-sm truncate">{item.party.title}</h3>
                            <div className="flex items-center gap-3 mt-0.5">
                              <div className="flex items-center gap-1">
                                <Sparkles className="h-3 w-3 text-primary" />
                                <span className="text-xs text-muted-foreground">{item.vibe.toFixed(1)}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <Music className="h-3 w-3 text-primary" />
                                <span className="text-xs text-muted-foreground">{item.music.toFixed(1)}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <Zap className="h-3 w-3 text-primary" />
                                <span className="text-xs text-muted-foreground">{item.execution.toFixed(1)}</span>
                              </div>
                            </div>
                          </div>
                          <Badge className={`${getScoreBgColor(item.score)} text-white text-sm px-2.5 py-1`}>
                            {item.score.toFixed(1)}
                          </Badge>
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        </div>
                      </Link>
                      {index < rankedParties.length - 1 && (
                        <div className="border-t border-border/50" />
                      )}
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Battles */}
            {rankingsSubTab === 'battles' && (
              <div className="p-4">
                {showFratBattleGame ? (
                  <FratBattleGame
                    fraternities={allFraternities}
                    existingRankings={rankedFrats.map(f => f.fraternity)}
                    onComplete={async () => {
                      await recordUserAction();
                      setShowFratBattleGame(false);
                    }}
                    onShare={async (ranking) => {
                      const userData = await getCurrentUser();
                      if (!userData) {
                        toast({ title: "Please sign in to share", variant: "destructive" });
                        return;
                      }
                      const tierLines = ranking.map(r => {
                        const displayTier = r.tier === 'Mouse 1' || r.tier === 'Mouse 2' ? 'Mouse' : r.tier;
                        return `${displayTier}: ${r.fratName}`;
                      });
                      const message = `🎮 Frat Battle Results\n\n${tierLines.join('\n')}`;
                      await chatMessageQueries.create({
                        user_id: userData.id,
                        text: message,
                        upvotes: 0,
                        downvotes: 0,
                        parent_message_id: null,
                        mentioned_fraternity_id: null,
                        mentioned_party_id: null,
                      });
                      toast({ title: "Shared to Feed!" });
                    }}
                    onSave={async (ranking) => {
                      const newRanking: SavedBattleRanking = {
                        id: Date.now().toString(),
                        date: new Date().toISOString(),
                        ranking: ranking.map(r => ({
                          fratId: r.fratId,
                          fratName: r.fratName,
                          tier: r.tier,
                          wins: r.wins,
                        })),
                      };
                      const updated = [newRanking, ...savedBattleRankings];
                      setSavedBattleRankings(updated);
                      localStorage.setItem('touse_saved_battle_rankings', JSON.stringify(updated));
                      await recordUserAction();
                      setShowFratBattleGame(false);
                      toast({ title: "Saved!", description: "Check your Rankings to see your saved rankings" });
                    }}
                    onClose={() => setShowFratBattleGame(false)}
                  />
                ) : savedBattleRankings.length === 0 ? (
                  <div className="py-12 text-center">
                    <Swords className="h-8 w-8 mx-auto text-muted-foreground/50 mb-3" />
                    <p className="font-medium text-muted-foreground">No saved battle rankings</p>
                    <p className="text-sm text-muted-foreground/70 mt-1">Play Frat Battle and save your results here</p>
                    <Button variant="outline" className="mt-4" onClick={() => setShowFratBattleGame(true)}>
                      <Swords className="h-4 w-4 mr-2" />
                      Play Frat Battle
                    </Button>
                  </div>
                ) : (
                  savedBattleRankings.map((battleRanking, index) => {
                    const isExpanded = expandedBattles[battleRanking.id];
                    const displayedRankings = isExpanded ? battleRanking.ranking : battleRanking.ranking.slice(0, 5);
                    
                    const getTierColor = (tier: string) => {
                      if (tier.includes('Touse')) return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
                      if (tier.includes('Mouse')) return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400';
                      if (tier.includes('Bouse')) return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
                      return 'bg-muted text-muted-foreground';
                    };
                    
                    return (
                      <div key={battleRanking.id} className="py-4">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                              <Trophy className="h-5 w-5 text-primary" />
                            </div>
                            <div>
                              <p className="font-semibold">Battle #{savedBattleRankings.length - index}</p>
                              <p className="text-xs text-muted-foreground">
                                {format(new Date(battleRanking.date), 'MMM d, yyyy')}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => {
                                setBattleToShare(battleRanking);
                                setShareBattleDialogOpen(true);
                              }}
                            >
                              <Share2 className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => {
                                const updated = savedBattleRankings.filter(r => r.id !== battleRanking.id);
                                setSavedBattleRankings(updated);
                                localStorage.setItem('touse_saved_battle_rankings', JSON.stringify(updated));
                                toast({ title: "Deleted" });
                              }}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </div>
                        
                        {displayedRankings.map((item, idx) => {
                          const displayTier = item.tier === 'Mouse 1' || item.tier === 'Mouse 2' ? 'Mouse' : item.tier;
                          return (
                            <div 
                              key={item.fratId} 
                              className="flex items-center justify-between py-2 border-b border-border/50 last:border-0"
                            >
                              <div className="flex items-center gap-3">
                                <span className="text-sm font-semibold text-muted-foreground w-6">{idx + 1}.</span>
                                <span className="font-medium text-sm">{item.fratName}</span>
                              </div>
                              <div className="flex items-center gap-3">
                                <span className={`text-xs font-medium px-2 py-0.5 rounded ${getTierColor(item.tier)}`}>
                                  {displayTier}
                                </span>
                                <span className="text-xs text-muted-foreground w-12 text-right">
                                  {item.wins} {item.wins === 1 ? 'win' : 'wins'}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                        
                        {battleRanking.ranking.length > 5 && (
                          <button
                            onClick={() => setExpandedBattles(prev => ({ ...prev, [battleRanking.id]: !prev[battleRanking.id] }))}
                            className="w-full flex items-center justify-center gap-1 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                          >
                            <ChevronDown className={`h-4 w-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                            {isExpanded ? 'Show less' : `View all ${battleRanking.ranking.length}`}
                          </button>
                        )}
                        
                        {index < savedBattleRankings.length - 1 && (
                          <div className="border-t border-border mt-4" />
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>
        )}

        {/* History Tab (was Frats and Parties tabs) */}
        {activeTab === 'history' && (
          <div>
            {/* Frat Ratings */}
            <div className="border-b border-border/50">
              <div className="px-4 py-3 flex items-center gap-2 bg-muted/50">
                <Trophy className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Frat Ratings ({stats.fratRatings})</span>
              </div>
              {fratRatingsData.length === 0 ? (
                <div className="p-6 text-center">
                  <p className="text-sm text-muted-foreground">No frat ratings yet</p>
                </div>
              ) : (
                <div className="divide-y divide-border/50">
                  {fratRatingsData.slice(0, 5).map((rating) => (
                    <div key={rating.id} className="p-4 flex items-center gap-3 hover:bg-muted/50 transition-colors">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{rating.fraternity?.name || 'Fraternity'}</p>
                        <p className="text-xs text-muted-foreground">
                          {rating.fraternity?.chapter} · {formatTimeAgo(rating.created_at)}
                        </p>
                      </div>
                      <Badge className={`${getScoreBgColor(rating.combined_score ?? 0)} text-white`}>
                        {(rating.combined_score ?? 0).toFixed(1)}
                      </Badge>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8"
                        onClick={() => setEditingFratRating(rating)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <AlertDialog open={deletingFratRatingId === rating.id} onOpenChange={(open) => setDeletingFratRatingId(open ? rating.id : null)}>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Rating?</AlertDialogTitle>
                            <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDeleteFratRating(rating.id, rating.fraternity_id)} className="bg-destructive text-destructive-foreground">
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Party Ratings */}
            <div>
              <div className="px-4 py-3 flex items-center gap-2 bg-muted/50">
                <PartyPopper className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Party Ratings ({stats.partyRatings})</span>
              </div>
              {partyRatingsData.length === 0 ? (
                <div className="p-6 text-center">
                  <p className="text-sm text-muted-foreground">No party ratings yet</p>
                </div>
              ) : (
                <div className="divide-y divide-border/50">
                  {partyRatingsData.slice(0, 5).map((rating) => (
                    <div key={rating.id} className="p-4 flex items-center gap-3 hover:bg-muted/50 transition-colors">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{rating.party?.title || 'Party'}</p>
                        <p className="text-xs text-muted-foreground">
                          {rating.fraternity?.name} · {formatTimeAgo(rating.created_at)}
                        </p>
                      </div>
                      <Badge className={`${getScoreBgColor(rating.party_quality_score ?? 0)} text-white`}>
                        {(rating.party_quality_score ?? 0).toFixed(1)}
                      </Badge>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8"
                        onClick={() => setEditingPartyRating(rating)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <AlertDialog open={deletingPartyRatingId === rating.id} onOpenChange={(open) => setDeletingPartyRatingId(open ? rating.id : null)}>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Rating?</AlertDialogTitle>
                            <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDeletePartyRating(rating.id)} className="bg-destructive text-destructive-foreground">
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Comments Tab */}
        {activeTab === 'comments' && (
          <div>
            {commentsData.length === 0 ? (
              <div className="p-8 text-center">
                <MessageCircle className="h-10 w-10 mx-auto mb-3 text-muted-foreground/50" />
                <p className="text-muted-foreground">No comments yet</p>
              </div>
            ) : (
              <div className="divide-y divide-border/50">
                {commentsData.map((comment) => {
                  // Determine navigation link based on comment type
                  const getCommentLink = () => {
                    if (comment.type === 'party' && comment.party_id) {
                      return `/Party?id=${comment.party_id}`;
                    } else if (comment.type === 'fraternity' && comment.fraternity_id) {
                      return `/Fraternity/${comment.fraternity_id}`;
                    } else if (comment.type === 'chat') {
                      if (comment.mentioned_party_id) {
                        return `/Party?id=${comment.mentioned_party_id}`;
                      } else if (comment.mentioned_fraternity_id) {
                        return `/Fraternity/${comment.mentioned_fraternity_id}`;
                      }
                      return '/Activity';
                    }
                    return null;
                  };
                  
                  const link = getCommentLink();
                  
                  // Check if this is a poll
                  const pollData = comment.type === 'chat' && comment.text ? parsePollFromText(comment.text) : null;
                  const pollVoteInfo = pollData ? pollVotesData[comment.id] : null;
                  
                  return (
                    <div key={comment.id} className="p-4 hover:bg-muted/50 transition-colors">
                      <div className="flex items-start gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="font-medium text-sm truncate">{comment.entityName}</p>
                            <Badge variant="outline" className="text-xs capitalize shrink-0">
                              {pollData ? 'Poll' : comment.type}
                            </Badge>
                          </div>
                          
                          {pollData ? (
                            <div className="mt-2">
                              <PollCard
                                question={pollData.question}
                                options={pollData.options}
                                userVote={pollVoteInfo?.userVote ?? null}
                                voteCounts={pollVoteInfo?.voteCounts ?? {}}
                                compact
                              />
                            </div>
                          ) : link ? (
                            <Link to={link} className="block cursor-pointer">
                              <p className="text-sm text-foreground mt-1 line-clamp-2 hover:text-primary transition-colors">{comment.text}</p>
                            </Link>
                          ) : (
                            <p className="text-sm text-foreground mt-1 line-clamp-2">{comment.text}</p>
                          )}
                          
                          <p className="text-xs text-muted-foreground mt-2">{format(new Date(comment.created_at || Date.now()), 'MMM d, yyyy')}</p>
                        </div>
                        
                        <AlertDialog open={deletingCommentId === comment.id} onOpenChange={(open) => setDeletingCommentId(open ? comment.id : null)}>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive shrink-0">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Comment?</AlertDialogTitle>
                              <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDeleteComment(comment)} className="bg-destructive text-destructive-foreground">
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Photos Tab */}
        {activeTab === 'photos' && (
          <div>
            {privatePhotos.length === 0 ? (
              <div className="p-8 text-center">
                <Image className="h-10 w-10 mx-auto mb-3 text-muted-foreground/50" />
                <p className="text-muted-foreground">No private photos yet</p>
              </div>
            ) : (
              <div className="p-4 space-y-6">
                {Object.entries(
                  privatePhotos.reduce((acc, photo) => {
                    const partyId = photo.party_id;
                    if (!acc[partyId]) {
                      acc[partyId] = { party: photo.party, fraternity: photo.fraternity, photos: [] };
                    }
                    acc[partyId].photos.push(photo);
                    return acc;
                  }, {} as Record<string, { party: any; fraternity: any; photos: typeof privatePhotos }>)
                ).map(([partyId, group]) => (
                  <div key={partyId} className="space-y-3">
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Associated Party</p>
                      <Link to={`/Party?id=${partyId}`} className="flex items-center gap-3 p-3 rounded-xl bg-background border border-border/50 hover:bg-muted/50 transition-colors">
                        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                          <PartyPopper className="h-5 w-5 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold truncate">{group.party?.title || 'Party'}</p>
                          <p className="text-xs text-muted-foreground">{group.fraternity?.name}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-muted-foreground">{group.photos.length} photo{group.photos.length !== 1 ? 's' : ''}</p>
                          <ChevronRight className="h-4 w-4 text-muted-foreground ml-auto" />
                        </div>
                      </Link>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      {group.photos.map((photo) => (
                        <div key={photo.id} className="relative aspect-square group">
                          <img 
                            src={photo.url} 
                            alt={photo.caption || 'Private photo'}
                            className="w-full h-full object-cover rounded-lg cursor-pointer"
                            onClick={() => setViewingPhoto(photo)}
                          />
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors rounded-lg pointer-events-none" />
                          <Button
                            variant="ghost"
                            size="icon"
                            className="absolute top-1 right-1 h-6 w-6 bg-black/50 text-white hover:bg-red-500/80 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeletingPhotoId(photo.id);
                            }}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Photo Viewer Modal */}
      {viewingPhoto && (
        <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4" onClick={() => setViewingPhoto(null)}>
          <Button variant="ghost" size="icon" className="absolute top-4 right-4 text-white hover:bg-white/20" onClick={() => setViewingPhoto(null)}>
            <X className="h-6 w-6" />
          </Button>
          <div className="flex flex-col items-center max-w-full max-h-full" onClick={(e) => e.stopPropagation()}>
            <img src={viewingPhoto.url} alt={viewingPhoto.caption || 'Photo'} className="max-w-full max-h-[70vh] object-contain rounded-lg" />
            <div className="mt-4 text-center text-white">
              <Link to={`/Party?id=${viewingPhoto.party_id}`} className="font-semibold hover:underline" onClick={() => setViewingPhoto(null)}>
                {viewingPhoto.party?.title || 'Party'}
              </Link>
              {viewingPhoto.fraternity && <p className="text-sm text-white/70">{viewingPhoto.fraternity.name}</p>}
              {viewingPhoto.caption && <p className="text-sm mt-2">{viewingPhoto.caption}</p>}
              <p className="text-xs text-white/50 mt-2">{formatTimeAgo(viewingPhoto.created_at)}</p>
            </div>
            <Button variant="outline" size="sm" className="mt-4 text-red-400 border-red-400/50 hover:bg-red-500/20" onClick={() => setDeletingPhotoId(viewingPhoto.id)}>
              <Trash2 className="h-4 w-4 mr-2" />
              Delete Photo
            </Button>
          </div>
        </div>
      )}

      {/* Delete Photo Confirmation */}
      <AlertDialog open={!!deletingPhotoId} onOpenChange={(open) => !open && setDeletingPhotoId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Photo?</AlertDialogTitle>
            <AlertDialogDescription>This photo will be permanently deleted.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground"
              onClick={async () => {
                if (deletingPhotoId) {
                  try {
                    await partyPhotoQueries.delete(deletingPhotoId);
                    setPrivatePhotos(prev => prev.filter(p => p.id !== deletingPhotoId));
                    setStats(prev => ({ ...prev, privatePhotos: prev.privatePhotos - 1 }));
                    if (viewingPhoto?.id === deletingPhotoId) setViewingPhoto(null);
                  } catch (error) {
                    console.error('Failed to delete photo:', error);
                  }
                }
                setDeletingPhotoId(null);
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Edit Modals */}
      {editingPartyRating && editingPartyRating.party && (
        <PartyRatingForm
          party={editingPartyRating.party}
          fraternity={editingPartyRating.fraternity}
          onClose={() => setEditingPartyRating(null)}
          onSubmit={handlePartyRatingSubmit}
        />
      )}

      {editingFratRating && editingFratRating.fraternity && (
        <RateFratSheet
          fraternity={editingFratRating.fraternity}
          isOpen={!!editingFratRating}
          onClose={() => setEditingFratRating(null)}
          onSubmit={handleFratRatingSubmit}
          existingScores={{
            brotherhood: editingFratRating.brotherhood_score ?? 5,
            reputation: editingFratRating.reputation_score ?? 5,
            community: editingFratRating.community_score ?? 5,
          }}
        />
      )}

      {/* Intro Overlay */}
      {showIntro && user && activeTab === 'rankings' && (
        <YourListsIntro
          onComplete={(neverShowAgain) => {
            handleIntroComplete(neverShowAgain);
            setIntroReturnStep('main'); // Reset for next time
          }}
          onRateFrat={handleRateFrat}
          onRateParty={handleRateParty}
          onSwitchToPartiesTab={() => setRankingsSubTab('parties')}
          fraternities={allFraternities}
          parties={allParties}
          ratedFratCount={ratedFratCount}
          ratedPartyCount={ratedPartyCount}
          totalFratCount={allFraternities.length}
          ratedFratIds={ratedFratIds}
          ratedPartyIds={ratedPartyIds}
          initialStep={introReturnStep}
        />
      )}

      {/* Rate Frat Sheet */}
      <RateFratSheet
        fraternity={selectedFrat}
        isOpen={!!selectedFrat}
        onClose={() => setSelectedFrat(null)}
        onSubmit={handleNewFratRatingSubmit}
        existingScores={existingFratScores}
      />

      {/* Rate Party Form */}
      {selectedParty && (
        <PartyRatingForm
          party={selectedParty}
          onClose={() => setSelectedParty(null)}
          onSubmit={handleNewPartyRatingSubmit}
        />
      )}

      {/* Party Picker Sheet */}
      <Sheet open={showPartyPicker} onOpenChange={setShowPartyPicker}>
        <SheetContent side="bottom" className="h-[70vh] rounded-t-3xl">
          <SheetHeader className="pb-4">
            <SheetTitle>Choose a Party to Rate</SheetTitle>
          </SheetHeader>
          <ScrollArea className="h-[calc(100%-60px)]">
            <div className="space-y-2 pr-4">
              {allParties.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <PartyPopper className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>No past parties available yet</p>
                </div>
              ) : (
                allParties.map((party) => {
                  const isRated = ratedPartyIds.includes(party.id);
                  const frat = allFraternities.find(f => f.id === party.fraternity_id);
                  return (
                    <button
                      key={party.id}
                      onClick={() => {
                        setShowPartyPicker(false);
                        handleRateParty(party, false);
                      }}
                      className={`w-full flex items-center gap-3 p-3 rounded-xl active:scale-[0.98] transition-all text-left ${
                        isRated 
                          ? 'bg-green-500/10 border border-green-500/30 hover:bg-green-500/20' 
                          : 'bg-muted/50 hover:bg-muted'
                      }`}
                    >
                      <div className={`h-12 w-12 rounded-xl flex items-center justify-center ${
                        isRated 
                          ? 'bg-green-500/20' 
                          : 'bg-gradient-to-br from-pink-500 to-rose-500'
                      }`}>
                        <PartyPopper className={`h-6 w-6 ${isRated ? 'text-green-600' : 'text-white'}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold truncate">{party.title}</p>
                        {frat && (
                          <p className="text-sm text-muted-foreground truncate">
                            {frat.chapter} • {frat.name}
                          </p>
                        )}
                      </div>
                      {isRated ? (
                        <CheckCircle2 className="h-5 w-5 text-green-500" />
                      ) : (
                        <Star className="h-5 w-5 text-pink-500" />
                      )}
                    </button>
                  );
                })
              )}
            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>

      {/* Frat Picker Sheet */}
      <Sheet open={showFratPicker} onOpenChange={setShowFratPicker}>
        <SheetContent side="bottom" className="h-[70vh] rounded-t-3xl">
          <SheetHeader className="pb-4">
            <SheetTitle>Choose a Fraternity to Rate</SheetTitle>
          </SheetHeader>
          <ScrollArea className="h-[calc(100%-60px)]">
            <div className="space-y-2 pr-4">
              {allFraternities.map((frat) => {
                const isRated = ratedFratIds.includes(frat.id);
                return (
                  <button
                    key={frat.id}
                    onClick={() => {
                      setShowFratPicker(false);
                      handleRateFrat(frat, false);
                    }}
                    className={`w-full flex items-center gap-3 p-3 rounded-xl active:scale-[0.98] transition-all text-left ${
                      isRated 
                        ? 'bg-green-500/10 border border-green-500/30 hover:bg-green-500/20' 
                        : 'bg-muted/50 hover:bg-muted'
                    }`}
                  >
                    <Avatar className="h-12 w-12 rounded-xl">
                      <AvatarImage src={frat.logo_url} alt={frat.name} />
                      <AvatarFallback className={`rounded-xl font-bold text-xs ${
                        isRated ? 'bg-green-500/20 text-green-600' : 'bg-primary/10 text-primary'
                      }`}>
                        {getFratGreek(frat.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold truncate">{frat.chapter}</p>
                      <p className="text-sm text-muted-foreground">{frat.name}</p>
                    </div>
                    {isRated ? (
                      <CheckCircle2 className="h-5 w-5 text-green-500" />
                    ) : (
                      <Star className="h-5 w-5 text-amber-500" />
                    )}
                  </button>
                );
              })}
            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>
      
      {/* Confetti Animation */}
      <Confetti 
        active={showConfetti} 
        onComplete={() => setShowConfetti(false)} 
      />
      
      {/* Share to Feed Dialog */}
      <Dialog open={showShareDialog} onOpenChange={setShowShareDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="mx-auto w-16 h-16 rounded-full gradient-primary flex items-center justify-center mb-2">
              <Trophy className="h-8 w-8 text-primary-foreground" />
            </div>
            <DialogTitle className="text-center text-xl">
              {shareType === 'frats' ? 'Frat Rankings Complete!' : 'Party Rankings Complete!'}
            </DialogTitle>
            <DialogDescription className="text-center">
              {shareType === 'frats' 
                ? `You've ranked all ${allFraternities.length} fraternities! Share your tier list with the community?`
                : `You've completed your party rankings! Share with the community?`
              }
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col gap-2 sm:flex-col">
            <Button 
              className="w-full gradient-primary text-primary-foreground"
              onClick={async () => {
                if (pendingShareUserId) {
                  await postCompletionToFeed(pendingShareUserId);
                }
                setShowShareDialog(false);
                setPendingShareUserId(null);
              }}
            >
              <Share2 className="h-4 w-4 mr-2" />
              Share to Feed
            </Button>
            <Button 
              variant="outline" 
              className="w-full"
              onClick={() => {
                setShowShareDialog(false);
                setPendingShareUserId(null);
                toast({
                  title: "Rankings Saved",
                  description: "Your rankings are saved. You can share them anytime from the Activity feed.",
                });
              }}
            >
              Maybe Later
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Share Battle Dialog */}
      {battleToShare && (
        <ShareBattleDialog
          isOpen={shareBattleDialogOpen}
          onClose={() => {
            setShareBattleDialogOpen(false);
            setBattleToShare(null);
          }}
          ranking={battleToShare.ranking}
        />
      )}
    </div>
  );
}
