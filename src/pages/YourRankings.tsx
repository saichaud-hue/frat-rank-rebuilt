import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { ListOrdered, Trophy, PartyPopper, LogIn, ChevronRight, ChevronDown, Lock, Star, Users, Shield, Heart, Sparkles, Music, Zap, CheckCircle2, Loader2, Share2, Swords, Trash2 } from 'lucide-react';
import FratBattleGame from '@/components/activity/FratBattleGame';
import { toast } from '@/hooks/use-toast';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { base44, type Fraternity, type Party } from '@/api/base44Client';
import { createPageUrl, getScoreBgColor, clamp, getFratGreek, getFratShorthand } from '@/utils';
import { Progress } from '@/components/ui/progress';
import { ensureAuthed } from '@/utils/auth';
import YourListsIntro from '@/components/onboarding/YourListsIntro';
import RateFratSheet from '@/components/leaderboard/RateFratSheet';
import PartyRatingForm from '@/components/rate/PartyRatingForm';
import { Confetti } from '@/components/ui/confetti';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { format } from 'date-fns';
import { recordUserAction } from '@/utils/streak';
import ShareBattleDialog from '@/components/share/ShareBattleDialog';

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

export default function YourRankings() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'frats' | 'parties' | 'battles'>('frats');
  const [rankedFrats, setRankedFrats] = useState<RankedFrat[]>([]);
  const [rankedParties, setRankedParties] = useState<RankedParty[]>([]);
  const [savedBattleRankings, setSavedBattleRankings] = useState<SavedBattleRanking[]>([]);
  
  // All data for intro
  const [allFraternities, setAllFraternities] = useState<Fraternity[]>([]);
  const [allParties, setAllParties] = useState<Party[]>([]);
  const [ratedFratCount, setRatedFratCount] = useState(0);
  const [ratedPartyCount, setRatedPartyCount] = useState(0);
  const [ratedFratIds, setRatedFratIds] = useState<string[]>([]);
  const [ratedPartyIds, setRatedPartyIds] = useState<string[]>([]);
  
  // Intro state - show on every visit unless permanently dismissed with "Don't show again"
  const [showIntro, setShowIntro] = useState(false);
  const [introChecked, setIntroChecked] = useState(false);
  
  // Frat picker for direct rating (bypasses intro modal)
  const [showFratPicker, setShowFratPicker] = useState(false);
  
  // Rating sheets
  const [selectedFrat, setSelectedFrat] = useState<Fraternity | null>(null);
  const [existingFratScores, setExistingFratScores] = useState<{ brotherhood: number; reputation: number; community: number } | undefined>();
  const [selectedParty, setSelectedParty] = useState<Party | null>(null);
  const [ratingFromIntro, setRatingFromIntro] = useState(false);
  const [showPartyPicker, setShowPartyPicker] = useState(false);
  
  // Track if completion post was already sent
  const completionPostedRef = useRef(false);
  const partyCompletionPostedRef = useRef(false);
  
  // Confetti and share popup state
  const [showConfetti, setShowConfetti] = useState(false);
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [shareType, setShareType] = useState<'frats' | 'parties'>('frats');
  const [pendingShareUserId, setPendingShareUserId] = useState<string | null>(null);
  
  // Frat Battle game state
  const [showFratBattleGame, setShowFratBattleGame] = useState(false);
  const [expandedBattles, setExpandedBattles] = useState<Record<string, boolean>>({});
  
  // Battle share dialog state
  const [shareBattleDialogOpen, setShareBattleDialogOpen] = useState(false);
  const [battleToShare, setBattleToShare] = useState<SavedBattleRanking | null>(null);

  useEffect(() => {
    loadData();
    // Load saved battle rankings from localStorage
    const saved = localStorage.getItem('touse_saved_battle_rankings');
    if (saved) {
      setSavedBattleRankings(JSON.parse(saved));
    }
  }, []);

  // Show intro on every visit unless permanently dismissed
  useEffect(() => {
    if (!introChecked && !loading && user) {
      const permanentDismissed = localStorage.getItem('touse_yourlists_intro_never_show');
      if (!permanentDismissed) {
        setShowIntro(true);
      }
      setIntroChecked(true);
    }
  }, [loading, user, introChecked]);

  const loadData = async () => {
    try {
      const userData = await base44.auth.me();
      setUser(userData);

      const [fraternities, parties] = await Promise.all([
        base44.entities.Fraternity.filter({ status: 'active' }),
        base44.entities.Party.list(),
      ]);
      
      setAllFraternities(fraternities);
      
      // Filter to only past parties
      const now = new Date();
      const pastParties = parties.filter(p => {
        if (!p.ends_at) return false;
        return new Date(p.ends_at) < now;
      });
      setAllParties(pastParties);

      if (userData) {
        const [repRatings, partyRatings] = await Promise.all([
          base44.entities.ReputationRating.filter({ user_id: userData.id }),
          base44.entities.PartyRating.filter({ user_id: userData.id }),
        ]);

        setRatedFratCount(repRatings.length);
        setRatedPartyCount(partyRatings.length);
        setRatedFratIds(repRatings.map(r => r.fraternity_id).filter(Boolean) as string[]);
        setRatedPartyIds(partyRatings.map(r => r.party_id).filter(Boolean) as string[]);

        // Build frat rankings from user's reputation ratings
        const fratMap = new Map(fraternities.map(f => [f.id, f]));
        const partyMap = new Map(parties.map(p => [p.id, p]));

        const userFratScores: RankedFrat[] = repRatings
          .filter(r => r.fraternity_id && fratMap.has(r.fraternity_id))
          .map(r => ({
            fraternity: fratMap.get(r.fraternity_id!)!,
            score: r.combined_score ?? 5,
            rank: 0,
            brotherhood: r.brotherhood_score ?? 5,
            reputation: r.reputation_score ?? 5,
            community: r.community_score ?? 5,
          }))
          .sort((a, b) => b.score - a.score);

        // Assign ranks with ties
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

        // Build party rankings from user's party ratings
        const userPartyScores: RankedParty[] = partyRatings
          .filter(r => r.party_id && partyMap.has(r.party_id))
          .map(r => {
            const party = partyMap.get(r.party_id!)!;
            return {
              party,
              fraternity: party.fraternity_id ? fratMap.get(party.fraternity_id) : undefined,
              score: r.party_quality_score ?? 5,
              rank: 0,
              vibe: r.vibe_score ?? 5,
              music: r.music_score ?? 5,
              execution: r.execution_score ?? 5,
            };
          })
          .sort((a, b) => b.score - a.score);

        // Assign ranks with ties
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
      console.error('Failed to load rankings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = () => {
    base44.auth.redirectToLogin(window.location.href);
  };

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

    const existingRatings = await base44.entities.ReputationRating.filter({
      fraternity_id: fraternity.id,
      user_id: user.id,
    });

    if (existingRatings.length > 0) {
      const rating = existingRatings[0];
      setExistingFratScores({
        brotherhood: rating.brotherhood_score ?? 5,
        reputation: rating.reputation_score ?? 5,
        community: rating.community_score ?? 5,
      });
    } else {
      setExistingFratScores(undefined);
    }
    setSelectedFrat(fraternity);
  };

  const handleFratRatingSubmit = async (scores: { brotherhood: number; reputation: number; community: number; combined: number }) => {
    if (!selectedFrat) return;

    const user = await base44.auth.me();
    if (!user) return;

    const existingRatings = await base44.entities.ReputationRating.filter({
      fraternity_id: selectedFrat.id,
      user_id: user.id,
    });

    const ratingData = {
      brotherhood_score: scores.brotherhood,
      reputation_score: scores.reputation,
      community_score: scores.community,
      combined_score: scores.combined,
    };

    const isNewRating = existingRatings.length === 0;

    if (existingRatings.length > 0) {
      await base44.entities.ReputationRating.update(existingRatings[0].id, {
        ...ratingData,
        created_date: new Date().toISOString(),
      });
    } else {
      await base44.entities.ReputationRating.create({
        fraternity_id: selectedFrat.id,
        user_id: user.id,
        ...ratingData,
        weight: 1,
        semester: 'Fall 2024',
      });
    }

    // Update fraternity reputation score
    const allRatings = await base44.entities.ReputationRating.filter({
      fraternity_id: selectedFrat.id,
    });

    const reputationScore = allRatings.length > 0
      ? allRatings.reduce((sum, r) => sum + (r.combined_score ?? 5), 0) / allRatings.length
      : 5;

    await base44.entities.Fraternity.update(selectedFrat.id, {
      reputation_score: clamp(reputationScore, 0, 10),
    });

    // Record action for streak tracking
    await recordUserAction();

    setSelectedFrat(null);
    await loadData();

    // Check if user just completed all frat ratings
    const newRatedCount = isNewRating ? ratedFratCount + 1 : ratedFratCount;
    if (isNewRating && newRatedCount >= allFraternities.length && !completionPostedRef.current) {
      completionPostedRef.current = true;
      // Show confetti and share popup
      setShowConfetti(true);
      setShareType('frats');
      setPendingShareUserId(user.id);
      setShowShareDialog(true);
    }

    // If rating was initiated from intro, re-show the intro
    if (ratingFromIntro) {
      setShowIntro(true);
      setRatingFromIntro(false);
    }
  };

  const postCompletionToFeed = async (userId: string) => {
    try {
      // Build tier list from ranked frats (need fresh data after rating)
      const [repRatings, fraternities] = await Promise.all([
        base44.entities.ReputationRating.filter({ user_id: userId }),
        base44.entities.Fraternity.filter({ status: 'active' }),
      ]);
      
      const fratMap = new Map(fraternities.map(f => [f.id, f]));
      const sortedRatings = repRatings
        .filter(r => r.fraternity_id && fratMap.has(r.fraternity_id))
        .map(r => ({
          frat: fratMap.get(r.fraternity_id!)!,
          score: r.combined_score ?? 5,
        }))
        .sort((a, b) => b.score - a.score);
      
      // Build tier message - tiers in order from best to worst
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
      
      await base44.entities.ChatMessage.create({
        user_id: userId,
        text: message,
        upvotes: 0,
        downvotes: 0,
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

  const handlePartyRatingSubmit = async () => {
    setSelectedParty(null);
    
    // Get user for party completion check
    const user = await base44.auth.me();
    const prevPartyCount = ratedPartyCount;
    
    await loadData();
    
    // Check if user just completed party rating requirements (3+ parties)
    // We trigger on reaching exactly 3 for the first time
    if (user && prevPartyCount < 3 && ratedPartyCount + 1 >= 3 && !partyCompletionPostedRef.current) {
      partyCompletionPostedRef.current = true;
      setShowConfetti(true);
      toast({
        title: "Party Rankings Complete",
        description: "You've rated enough parties to unlock your party list!",
      });
    }

    // If rating was initiated from intro, re-show the intro
    if (ratingFromIntro) {
      setShowIntro(true);
      setRatingFromIntro(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-5">
        <div className="flex items-center gap-3">
          <Skeleton className="h-10 w-10 rounded-xl" />
          <Skeleton className="h-8 w-40" />
        </div>
        <Skeleton className="h-12 w-full rounded-lg" />
        {[1, 2, 3, 4, 5].map((i) => (
          <Skeleton key={i} className="h-20 rounded-xl" />
        ))}
      </div>
    );
  }

  if (!user) {
    return (
      <div className="space-y-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center shadow-lg">
            <ListOrdered className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Your Rankings</h1>
            <p className="text-xs text-muted-foreground">Your personal scores</p>
          </div>
        </div>

        <Card className="bg-card border-border p-8 text-center space-y-6">
          <div className="w-20 h-20 mx-auto rounded-full bg-muted flex items-center justify-center">
            <ListOrdered className="h-10 w-10 text-muted-foreground" />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-bold">Sign in to see your rankings</h2>
            <p className="text-muted-foreground text-sm">
              Rate fraternities and parties to build your personal list
            </p>
          </div>
          <Button onClick={handleLogin} className="gradient-primary text-primary-foreground">
            <LogIn className="h-4 w-4 mr-2" />
            Sign in with Google
          </Button>
        </Card>
      </div>
    );
  }

  // Check if user has completed all requirements
  const isFullyUnlocked = ratedFratCount >= allFraternities.length && ratedPartyCount >= 3;

  return (
    <div className="pb-28">
      {/* Header - Mimics Leaderboard */}
      <div className="px-4 pt-2 space-y-5">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            {isFullyUnlocked ? 'Rankings Unlocked' : 'Your Rankings'}
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {isFullyUnlocked 
              ? 'Your personal tier list is ready!' 
              : 'Your personal scores'}
          </p>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'frats' | 'parties' | 'battles')}>
          <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-4 px-4">
            <button
              onClick={() => setActiveTab('frats')}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all whitespace-nowrap flex items-center gap-1.5 ${
                activeTab === 'frats'
                  ? 'bg-foreground text-background'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              <Trophy className="h-4 w-4" />
              Frats
              {rankedFrats.length > 0 && (
                <span className="ml-0.5 text-xs opacity-80">({rankedFrats.length})</span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('parties')}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all whitespace-nowrap flex items-center gap-1.5 ${
                activeTab === 'parties'
                  ? 'bg-foreground text-background'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              <PartyPopper className="h-4 w-4" />
              Parties
              {rankedParties.length > 0 && (
                <span className="ml-0.5 text-xs opacity-80">({rankedParties.length})</span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('battles')}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all whitespace-nowrap flex items-center gap-1.5 ${
                activeTab === 'battles'
                  ? 'bg-foreground text-background'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              <Swords className="h-4 w-4" />
              Battles
              {savedBattleRankings.length > 0 && (
                <span className="ml-0.5 text-xs opacity-80">({savedBattleRankings.length})</span>
              )}
            </button>
          </div>
        </Tabs>
      </div>

      {/* Divider */}
      <div className="mx-4 mt-6 border-t border-border" />

      {/* Content */}
      <div className="px-4 mt-4">
        {/* Fraternities Tab */}
        {activeTab === 'frats' && (
          <>
            {ratedFratCount < allFraternities.length ? (
              <div className="py-12 text-center">
                <Lock className="h-8 w-8 mx-auto text-muted-foreground/50 mb-3" />
                <p className="font-medium text-muted-foreground">Frat list locked</p>
                <p className="text-sm text-muted-foreground/70 mt-1">
                  Rate all {allFraternities.length} fraternities to unlock ({ratedFratCount}/{allFraternities.length})
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
                  <Link to={createPageUrl(`Fraternity?id=${item.fraternity.id}`)}>
                    <div className="flex items-center gap-3 py-3 active:bg-muted/30 transition-colors">
                      {/* Rank */}
                      <div className="w-6 text-center flex-shrink-0">
                        <span className="text-sm font-semibold text-muted-foreground">
                          {item.rank}.
                        </span>
                      </div>

                      {/* Avatar */}
                      <Avatar className="h-10 w-10 flex-shrink-0">
                        <AvatarImage src={item.fraternity.logo_url} />
                        <AvatarFallback className="bg-muted text-muted-foreground font-semibold text-xs">
                          {getFratGreek(item.fraternity.name)}
                        </AvatarFallback>
                      </Avatar>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-sm truncate">{item.fraternity.name}</h3>
                        <div className="flex items-center gap-3 mt-0.5">
                          <div className="flex items-center gap-1">
                            <Users className="h-3 w-3 text-primary" />
                            <span className="text-xs text-muted-foreground">{item.brotherhood.toFixed(1)}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Shield className="h-3 w-3 text-primary" />
                            <span className="text-xs text-muted-foreground">{item.reputation.toFixed(1)}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Heart className="h-3 w-3 text-primary" />
                            <span className="text-xs text-muted-foreground">{item.community.toFixed(1)}</span>
                          </div>
                        </div>
                      </div>

                      {/* Score */}
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
          </>
        )}

        {/* Parties Tab */}
        {activeTab === 'parties' && (
          <>
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
                      {/* Rank */}
                      <div className="w-6 text-center flex-shrink-0">
                        <span className="text-sm font-semibold text-muted-foreground">
                          {item.rank}.
                        </span>
                      </div>

                      {/* Icon */}
                      <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <PartyPopper className="h-5 w-5 text-primary" />
                      </div>

                      {/* Info */}
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

                      {/* Score */}
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
          </>
        )}

        {/* Battles Tab */}
        {activeTab === 'battles' && (
          <>
            {showFratBattleGame ? (
              <FratBattleGame
                fraternities={allFraternities}
                existingRankings={rankedFrats.map(f => f.fraternity)}
                onComplete={async () => {
                  await recordUserAction();
                  setShowFratBattleGame(false);
                }}
                onShare={async (ranking) => {
                  const userData = await base44.auth.me();
                  if (!userData) {
                    toast({ title: "Please sign in to share", variant: "destructive" });
                    return;
                  }
                  const tierLines = ranking.map(r => {
                    const displayTier = r.tier === 'Mouse 1' || r.tier === 'Mouse 2' ? 'Mouse' : r.tier;
                    return `${displayTier}: ${r.fratName}`;
                  });
                  const message = `🎮 Frat Battle Results\n\n${tierLines.join('\n')}`;
                  await base44.entities.ChatMessage.create({
                    user_id: userData.id,
                    text: message,
                    upvotes: 0,
                    downvotes: 0,
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
                  toast({ title: "Saved!", description: "Check 'Your Lists' to see your saved rankings" });
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
                    {/* Header */}
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
                    
                    {/* Rankings list */}
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
                    
                    {/* View all button */}
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
          </>
        )}
      </div>

      {/* Intro Overlay */}
      {showIntro && user && (
        <YourListsIntro
          onComplete={handleIntroComplete}
          onRateFrat={handleRateFrat}
          onRateParty={handleRateParty}
          onSwitchToPartiesTab={() => setActiveTab('parties')}
          fraternities={allFraternities}
          parties={allParties}
          ratedFratCount={ratedFratCount}
          ratedPartyCount={ratedPartyCount}
          totalFratCount={allFraternities.length}
          ratedFratIds={ratedFratIds}
          ratedPartyIds={ratedPartyIds}
        />
      )}

      {/* Rate Frat Sheet */}
      <RateFratSheet
        fraternity={selectedFrat}
        isOpen={!!selectedFrat}
        onClose={() => setSelectedFrat(null)}
        onSubmit={handleFratRatingSubmit}
        existingScores={existingFratScores}
      />

      {/* Rate Party Form */}
      {selectedParty && (
        <PartyRatingForm
          party={selectedParty}
          onClose={() => setSelectedParty(null)}
          onSubmit={handlePartyRatingSubmit}
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
                            {frat.name} • {getFratShorthand(frat.name)}
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

      {/* Frat Picker Sheet (direct rating - bypasses intro) */}
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
                      <p className="font-semibold truncate">{frat.name}</p>
                      <p className="text-sm text-muted-foreground">{getFratShorthand(frat.name)}</p>
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
