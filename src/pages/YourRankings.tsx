import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ListOrdered, Trophy, PartyPopper, LogIn, ChevronRight, Lock, Star, Users, Shield, Heart, Sparkles, Music, Zap, CheckCircle2, Crown, Gift } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  const [activeTab, setActiveTab] = useState<'frats' | 'parties'>('frats');
  const [rankedFrats, setRankedFrats] = useState<RankedFrat[]>([]);
  const [rankedParties, setRankedParties] = useState<RankedParty[]>([]);
  
  // All data for intro
  const [allFraternities, setAllFraternities] = useState<Fraternity[]>([]);
  const [allParties, setAllParties] = useState<Party[]>([]);
  const [ratedFratCount, setRatedFratCount] = useState(0);
  const [ratedPartyCount, setRatedPartyCount] = useState(0);
  const [ratedFratIds, setRatedFratIds] = useState<string[]>([]);
  const [ratedPartyIds, setRatedPartyIds] = useState<string[]>([]);
  
  // Intro state - only show on first visit and if not permanently dismissed
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

  useEffect(() => {
    loadData();
  }, []);

  // Show intro only on mount if not dismissed (session or permanent)
  useEffect(() => {
    if (!introChecked && !loading && user) {
      const sessionDismissed = sessionStorage.getItem('touse_yourlists_intro_dismissed');
      const permanentDismissed = localStorage.getItem('touse_yourlists_intro_never_show');
      if (!sessionDismissed && !permanentDismissed) {
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
    // Always dismiss for this session
    sessionStorage.setItem('touse_yourlists_intro_dismissed', 'true');
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

    setSelectedFrat(null);
    await loadData();

    // If rating was initiated from intro, re-show the intro
    if (ratingFromIntro) {
      setShowIntro(true);
      setRatingFromIntro(false);
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
    await loadData();

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
    <div className="space-y-5">
      {/* Celebration Banner - shown when fully unlocked */}
      {isFullyUnlocked && (
        <div className="relative overflow-hidden rounded-3xl gradient-primary p-6 text-primary-foreground shadow-xl animate-scale-in">
          {/* Background sparkles */}
          <div className="absolute inset-0 opacity-30">
            <div className="absolute top-2 left-4 w-2 h-2 bg-white rounded-full animate-pulse" />
            <div className="absolute top-6 right-8 w-3 h-3 bg-white rounded-full animate-pulse" style={{ animationDelay: '0.3s' }} />
            <div className="absolute bottom-4 left-12 w-2 h-2 bg-white rounded-full animate-pulse" style={{ animationDelay: '0.6s' }} />
            <div className="absolute bottom-8 right-4 w-2 h-2 bg-white rounded-full animate-pulse" style={{ animationDelay: '0.9s' }} />
            <div className="absolute top-1/2 left-1/4 w-1.5 h-1.5 bg-white rounded-full animate-pulse" style={{ animationDelay: '0.2s' }} />
            <div className="absolute top-1/3 right-1/3 w-2 h-2 bg-white rounded-full animate-pulse" style={{ animationDelay: '0.5s' }} />
          </div>
          
          <div className="relative flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center animate-bounce-subtle">
              <Crown className="h-8 w-8" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h2 className="text-xl font-bold">Rankings Unlocked!</h2>
                <Gift className="h-5 w-5" />
              </div>
              <p className="text-primary-foreground/80 text-sm">
                You rated all {allFraternities.length} frats & {ratedPartyCount} parties. Your personal tier list is ready!
              </p>
            </div>
          </div>
          
          <div className="relative mt-4 flex gap-3">
            <div className="flex-1 text-center p-3 rounded-xl bg-white/10 backdrop-blur-sm">
              <Trophy className="h-5 w-5 mx-auto mb-1" />
              <p className="text-lg font-bold">{rankedFrats.length}</p>
              <p className="text-xs opacity-80">Frats Ranked</p>
            </div>
            <div className="flex-1 text-center p-3 rounded-xl bg-white/10 backdrop-blur-sm">
              <PartyPopper className="h-5 w-5 mx-auto mb-1" />
              <p className="text-lg font-bold">{rankedParties.length}</p>
              <p className="text-xs opacity-80">Parties Ranked</p>
            </div>
            <div className="flex-1 text-center p-3 rounded-xl bg-white/10 backdrop-blur-sm">
              <Sparkles className="h-5 w-5 mx-auto mb-1" />
              <p className="text-lg font-bold">100%</p>
              <p className="text-xs opacity-80">Complete</p>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center shadow-lg">
          <ListOrdered className="h-5 w-5 text-primary-foreground" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Your Rankings</h1>
          <p className="text-xs text-muted-foreground">Your personal scores</p>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'frats' | 'parties')}>
        <TabsList className="grid w-full grid-cols-2 h-12">
          <TabsTrigger value="frats" className="gap-2 text-sm">
            <Trophy className="h-4 w-4" />
            Fraternities
            {rankedFrats.length > 0 && (
              <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                {rankedFrats.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="parties" className="gap-2 text-sm">
            <PartyPopper className="h-4 w-4" />
            Parties
            {rankedParties.length > 0 && (
              <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                {rankedParties.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Fraternities Tab */}
        <TabsContent value="frats" className="mt-4 space-y-3">
          {ratedFratCount < allFraternities.length ? (
            // Locked state - show blurred preview with overlay
            <div className="relative min-h-[400px]">
              {/* Blurred background items */}
              <div className="blur-sm opacity-50 pointer-events-none space-y-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Card key={i} className="glass p-4">
                    <div className="flex items-center gap-4">
                      <div className="w-8 text-center">
                        <span className="text-lg font-bold text-muted-foreground">{i}.</span>
                      </div>
                      <div className="h-12 w-12 rounded-full bg-muted" />
                      <div className="flex-1 space-y-2">
                        <div className="h-4 w-32 bg-muted rounded" />
                        <div className="h-3 w-20 bg-muted rounded" />
                      </div>
                      <div className="h-7 w-12 bg-muted rounded-full" />
                    </div>
                  </Card>
                ))}
              </div>

              {/* Overlay - centered */}
              <div className="absolute inset-0 flex items-center justify-center pt-8">
                <Card className="glass p-6 text-center space-y-4 max-w-xs mx-4 shadow-xl">
                  <div className="w-16 h-16 mx-auto rounded-full bg-amber-500/10 flex items-center justify-center">
                    <Lock className="h-8 w-8 text-amber-500" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="font-bold text-lg">Unlock Your Frat List</h3>
                    <p className="text-sm text-muted-foreground">
                      Rate all {allFraternities.length} fraternities to see your personal rankings
                    </p>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Progress</span>
                      <span>{ratedFratCount} / {allFraternities.length}</span>
                    </div>
                    <Progress value={(ratedFratCount / allFraternities.length) * 100} className="h-2" />
                  </div>
                  <Button 
                    onClick={() => setShowFratPicker(true)} 
                    className="w-full bg-amber-500 hover:bg-amber-600 text-white"
                  >
                    <Star className="h-4 w-4 mr-2" />
                    Rate Fraternities
                  </Button>
                </Card>
              </div>
            </div>
          ) : rankedFrats.length === 0 ? (
            <Card className="glass p-8 text-center space-y-4">
              <Trophy className="h-12 w-12 mx-auto text-muted-foreground/50" />
              <div className="space-y-1">
                <h3 className="font-semibold">No fraternities rated yet</h3>
                <p className="text-sm text-muted-foreground">
                  Rate fraternities on the Leaderboard to build your personal list
                </p>
              </div>
              <Link to="/Leaderboard">
                <Button variant="outline" className="mt-2">
                  Go to Leaderboard
                </Button>
              </Link>
            </Card>
          ) : (
            rankedFrats.map((item) => (
              <Link key={item.fraternity.id} to={createPageUrl(`Fraternity?id=${item.fraternity.id}`)}>
                <Card className="glass p-4 active:scale-[0.98] transition-all hover:shadow-md group">
                  <div className="flex items-center gap-3">
                    {/* Rank */}
                    <div className="w-6 text-center flex-shrink-0">
                      <span className="text-lg font-bold text-muted-foreground">
                        {item.rank}.
                      </span>
                    </div>

                    {/* Avatar */}
                    <Avatar className="h-11 w-11 ring-2 ring-border flex-shrink-0">
                      <AvatarImage src={item.fraternity.logo_url} />
                      <AvatarFallback className="bg-primary/10 text-primary font-bold text-xs">
                        {getFratGreek(item.fraternity.name)}
                      </AvatarFallback>
                    </Avatar>

                    {/* Info + Category Scores */}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-sm truncate">{item.fraternity.name}</h3>
                      {/* Category breakdown */}
                      <div className="flex items-center gap-3 mt-1">
                        <div className="flex items-center gap-1">
                          <Users className="h-3 w-3 text-blue-500" />
                          <span className="text-xs font-medium text-muted-foreground">{item.brotherhood.toFixed(1)}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Shield className="h-3 w-3 text-primary" />
                          <span className="text-xs font-medium text-muted-foreground">{item.reputation.toFixed(1)}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Heart className="h-3 w-3 text-rose-500" />
                          <span className="text-xs font-medium text-muted-foreground">{item.community.toFixed(1)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Overall Score */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Badge className={`${getScoreBgColor(item.score)} text-white text-sm px-2.5 py-1`}>
                        {item.score.toFixed(1)}
                      </Badge>
                      <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>
                </Card>
              </Link>
            ))
          )}
        </TabsContent>

        {/* Parties Tab */}
        <TabsContent value="parties" className="mt-4 space-y-3">
          {ratedPartyCount < 3 ? (
            // Locked state - show blurred preview with overlay
            <div className="relative min-h-[400px]">
              {/* Blurred background items */}
              <div className="blur-sm opacity-50 pointer-events-none space-y-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Card key={i} className="glass p-4">
                    <div className="flex items-center gap-4">
                      <div className="w-8 text-center">
                        <span className="text-lg font-bold text-muted-foreground">{i}.</span>
                      </div>
                      <div className="h-12 w-12 rounded-xl bg-muted" />
                      <div className="flex-1 space-y-2">
                        <div className="h-4 w-32 bg-muted rounded" />
                        <div className="h-3 w-20 bg-muted rounded" />
                      </div>
                      <div className="h-7 w-12 bg-muted rounded-full" />
                    </div>
                  </Card>
                ))}
              </div>

              {/* Overlay - centered */}
              <div className="absolute inset-0 flex items-center justify-center pt-8">
                <Card className="glass p-6 text-center space-y-4 max-w-xs mx-4 shadow-xl">
                  <div className="w-16 h-16 mx-auto rounded-full bg-pink-500/10 flex items-center justify-center">
                    <Lock className="h-8 w-8 text-pink-500" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="font-bold text-lg">Unlock Your Party List</h3>
                    <p className="text-sm text-muted-foreground">
                      Rate at least 3 parties to see your personal rankings
                    </p>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Progress</span>
                      <span>{ratedPartyCount} / 3</span>
                    </div>
                    <Progress value={(ratedPartyCount / 3) * 100} className="h-2" />
                  </div>
                  <Button 
                    onClick={() => setShowPartyPicker(true)}
                    className="w-full bg-pink-500 hover:bg-pink-600 text-white"
                  >
                    <Star className="h-4 w-4 mr-2" />
                    Rate Parties
                  </Button>
                </Card>
              </div>
            </div>
          ) : rankedParties.length === 0 ? (
            <Card className="glass p-8 text-center space-y-4">
              <PartyPopper className="h-12 w-12 mx-auto text-muted-foreground/50" />
              <div className="space-y-1">
                <h3 className="font-semibold">No parties rated yet</h3>
                <p className="text-sm text-muted-foreground">
                  Rate parties to build your personal list
                </p>
              </div>
              <Button 
                onClick={() => setShowPartyPicker(true)}
                variant="outline" 
                className="mt-2"
              >
                Browse Parties
              </Button>
            </Card>
          ) : (
            rankedParties.map((item) => (
              <Link key={item.party.id} to={createPageUrl(`Party?id=${item.party.id}`)}>
                <Card className="glass p-4 active:scale-[0.98] transition-all hover:shadow-md group">
                  <div className="flex items-center gap-3">
                    {/* Rank */}
                    <div className="w-6 text-center flex-shrink-0">
                      <span className="text-lg font-bold text-muted-foreground">
                        {item.rank}.
                      </span>
                    </div>

                    {/* Avatar */}
                    <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-pink-500 to-rose-500 flex items-center justify-center flex-shrink-0">
                      <PartyPopper className="h-5 w-5 text-white" />
                    </div>

                    {/* Info + Category Scores */}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-sm truncate">{item.party.title}</h3>
                      {/* Category breakdown */}
                      <div className="flex items-center gap-3 mt-1">
                        <div className="flex items-center gap-1">
                          <Sparkles className="h-3 w-3 text-purple-500" />
                          <span className="text-xs font-medium text-muted-foreground">{item.vibe.toFixed(1)}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Music className="h-3 w-3 text-blue-500" />
                          <span className="text-xs font-medium text-muted-foreground">{item.music.toFixed(1)}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Zap className="h-3 w-3 text-amber-500" />
                          <span className="text-xs font-medium text-muted-foreground">{item.execution.toFixed(1)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Score */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Badge className={`${getScoreBgColor(item.score)} text-white text-sm px-2.5 py-1`}>
                        {item.score.toFixed(1)}
                      </Badge>
                      <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>
                </Card>
              </Link>
            ))
          )}
        </TabsContent>
      </Tabs>

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
    </div>
  );
}
