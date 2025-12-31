import { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { ArrowLeft, Calendar, Star, PartyPopper, Users, Shield, Heart, Music, Info, ThumbsUp, MessageCircle, X, Trophy, TrendingUp, Flame, Crown, Sparkles, Zap } from 'lucide-react';
import { base44, type Fraternity as FraternityType, type Party, type PartyRating, type ReputationRating, type PartyComment, type FraternityComment } from '@/api/base44Client';
import { recordUserAction } from '@/utils/streak';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import PartyCard from '@/components/parties/PartyCard';
import RateFratSheet from '@/components/leaderboard/RateFratSheet';
import RateActionSheet from '@/components/leaderboard/RateActionSheet';
import PartyRatingForm from '@/components/rate/PartyRatingForm';
import CommentSection from '@/components/comments/CommentSection';
import TrendIndicator from '@/components/leaderboard/TrendIndicator';
import ConfidenceBar from '@/components/scores/ConfidenceBar';
import { createPageUrl, clamp, getScoreColor, getScoreBgColor, getFratGreek, getFratShorthand } from '@/utils';
import { 
  computeFullFraternityScores, 
  computeCampusRepAvg, 
  computeCampusPartyAvg,
  computeCombinedReputation,
  computeRawPartyQuality,
  computeCampusBaseline,
  type FraternityScores,
  type PartyWithRatings,
  type ActivityData
} from '@/utils/scoring';

// Per-party computed scores (overall party quality for each party)
interface PartyScoreData {
  partyId: string;
  overallQuality: number; // Confidence-adjusted overall party quality for this specific party
}

export default function FraternityPage() {
  const [searchParams] = useSearchParams();
  const fratId = searchParams.get('id');
  
  const [fraternity, setFraternity] = useState<FraternityType | null>(null);
  const [parties, setParties] = useState<Party[]>([]);
  const [loading, setLoading] = useState(true);
  const [showRateSheet, setShowRateSheet] = useState(false);
  const [existingScores, setExistingScores] = useState<{ brotherhood: number; reputation: number; community: number } | undefined>();
  const [computedScores, setComputedScores] = useState<FraternityScores | null>(null);
  const [userRating, setUserRating] = useState<{ brotherhood: number; reputation: number; community: number } | null>(null);
  const [userPartyRatings, setUserPartyRatings] = useState<PartyRating[]>([]);
  const [partyScores, setPartyScores] = useState<Map<string, number>>(new Map());
  const [allFraternities, setAllFraternities] = useState<FraternityType[]>([]);
  const [showRateAction, setShowRateAction] = useState<'rate' | 'parties' | false>(false);
  const [rateExpanded, setRateExpanded] = useState(false);
  const [selectedParty, setSelectedParty] = useState<Party | null>(null);

  useEffect(() => {
    if (fratId) loadData();
  }, [fratId]);

  const loadData = async () => {
    try {
      const [fratData, partiesData, allFrats, allParties, allPartyRatings, repRatings, partyComments, fratComments] = await Promise.all([
        base44.entities.Fraternity.get(fratId!),
        base44.entities.Party.filter({ fraternity_id: fratId! }, '-starts_at'),
        base44.entities.Fraternity.filter({ status: 'active' }),
        base44.entities.Party.list(),
        base44.entities.PartyRating.list(),
        base44.entities.ReputationRating.filter({ fraternity_id: fratId! }),
        base44.entities.PartyComment.list(),
        base44.entities.FraternityComment.filter({ fraternity_id: fratId! }),
      ]);
      
      setFraternity(fratData);
      setParties(partiesData);
      setAllFraternities(allFrats);

      // Compute campus averages (stable party baseline derived from ratings, not Party fields)
      const campusRepAvg = computeCampusRepAvg(allFrats);
      const campusPartyAvg = computeCampusPartyAvg(allPartyRatings);

      // Get party ratings for this fraternity's parties
      const fratPartyRatings = allPartyRatings.filter(
        r => partiesData.some(p => p.id === r.party_id)
      );
      
      const partyRatingsMap = new Map<string, PartyRating[]>();
      for (const rating of fratPartyRatings) {
        if (rating.party_id) {
          const existing = partyRatingsMap.get(rating.party_id) || [];
          existing.push(rating);
          partyRatingsMap.set(rating.party_id, existing);
        }
      }

      const partiesWithRatings: PartyWithRatings[] = partiesData.map(party => ({
        party,
        ratings: partyRatingsMap.get(party.id) || [],
      }));

      // Build all parties with ratings for campus baseline
      const allPartiesWithRatings: PartyWithRatings[] = allParties.map(party => ({
        party,
        ratings: allPartyRatings.filter(r => r.party_id === party.id),
      }));
      
      // Compute campus baseline B_campus for full scores computation
      const campusBaseline = computeCampusBaseline(allPartiesWithRatings);

      // Compute per-party RAW quality Q_p for display (no baseline blending)
      const perPartyScores = new Map<string, number>();
      for (const { party, ratings } of partiesWithRatings) {
        const rawQuality = computeRawPartyQuality(ratings);
        if (rawQuality !== null) {
          perPartyScores.set(party.id, rawQuality);
        }
      }
      setPartyScores(perPartyScores);

      // Get party comments for this fraternity's parties
      const fratPartyComments = partyComments.filter(
        c => partiesData.some(p => p.id === c.party_id)
      );

      // Build activity data
      const activityData: ActivityData = {
        repRatings,
        partyRatings: fratPartyRatings,
        parties: partiesData,
        partyComments: fratPartyComments,
        fratComments,
      };

      // Compute full scores
      const scores = await computeFullFraternityScores(
        fratData,
        repRatings,
        partiesWithRatings,
        campusRepAvg,
        campusPartyAvg,
        activityData,
        campusBaseline // Pass the computed baseline number
      );
      setComputedScores(scores);

    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Load user's own frat rating and party ratings
  const loadUserRatings = async () => {
    try {
      const user = await base44.auth.me();
      if (!user || !fratId) return;
      
      // Load user's frat rating
      const existingRatings = await base44.entities.ReputationRating.filter({
        fraternity_id: fratId,
        user_id: user.id,
      });

      if (existingRatings.length > 0) {
        const rating = existingRatings[0];
        setUserRating({
          brotherhood: rating.brotherhood_score ?? 5,
          reputation: rating.reputation_score ?? 5,
          community: rating.community_score ?? 5,
        });
      } else {
        setUserRating(null);
      }

      // Load user's party ratings for this fraternity's parties
      const allUserPartyRatings = await base44.entities.PartyRating.filter({
        user_id: user.id,
      });
      
      // Get this frat's party IDs
      const fratParties = await base44.entities.Party.filter({ fraternity_id: fratId });
      const fratPartyIds = new Set(fratParties.map(p => p.id));
      
      // Filter to only ratings for this frat's parties
      const userFratPartyRatings = allUserPartyRatings.filter(r => fratPartyIds.has(r.party_id));
      setUserPartyRatings(userFratPartyRatings);
      
    } catch (error) {
      console.error('Failed to load user ratings:', error);
    }
  };

  useEffect(() => {
    loadUserRatings();
  }, [fratId]);

  const handleRate = async () => {
    const user = await base44.auth.me();
    if (!user) {
      base44.auth.redirectToLogin(window.location.href);
      return;
    }

    if (userRating) {
      setExistingScores(userRating);
    } else {
      setExistingScores(undefined);
    }
    setShowRateSheet(true);
  };

  const handleRateSubmit = async (scores: { brotherhood: number; reputation: number; community: number; combined: number }) => {
    if (!fraternity) return;

    const user = await base44.auth.me();
    if (!user) return;

    const existingRatings = await base44.entities.ReputationRating.filter({
      fraternity_id: fraternity.id,
      user_id: user.id,
    });

    const ratingData = {
      brotherhood_score: scores.brotherhood,
      reputation_score: scores.reputation,
      community_score: scores.community,
      combined_score: scores.combined,
    };

    if (existingRatings.length > 0) {
      await base44.entities.ReputationRating.update(existingRatings[0].id, ratingData);
    } else {
      await base44.entities.ReputationRating.create({
        fraternity_id: fraternity.id,
        user_id: user.id,
        ...ratingData,
        weight: 1,
        semester: 'Fall 2024',
      });
    }

    // Recalculate fraternity reputation score from all ratings
    const allRatings = await base44.entities.ReputationRating.filter({
      fraternity_id: fraternity.id,
    });

    const reputationScore = allRatings.length > 0
      ? allRatings.reduce((sum, r) => sum + (r.combined_score ?? 5), 0) / allRatings.length
      : 5;

    await base44.entities.Fraternity.update(fraternity.id, {
      reputation_score: clamp(reputationScore, 0, 10),
    });

    await recordUserAction();
    await loadData();
    await loadUserRatings();
  };

  // Handler for rating a frat from the floating button
  const handleRateFratFromSheet = async (frat: FraternityType) => {
    setShowRateAction(false);
    const user = await base44.auth.me();
    if (!user) {
      base44.auth.redirectToLogin(window.location.href);
      return;
    }

    const existingRatings = await base44.entities.ReputationRating.filter({
      fraternity_id: frat.id,
      user_id: user.id,
    });

    if (existingRatings.length > 0) {
      const rating = existingRatings[0];
      setExistingScores({
        brotherhood: rating.brotherhood_score ?? 5,
        reputation: rating.reputation_score ?? 5,
        community: rating.community_score ?? 5,
      });
    } else {
      setExistingScores(undefined);
    }
    setFraternity(frat as any);
    setShowRateSheet(true);
  };

  // Handler for rating a party from the floating button
  const handleRatePartyFromSheet = (party: Party) => {
    setShowRateAction(false);
    setSelectedParty(party);
  };

  const handlePartyRatingSubmit = async () => {
    setSelectedParty(null);
    await loadData();
  };

  // Determine party status based on current time, not stored status
  const getPartyStatus = (party: typeof parties[0]): 'live' | 'upcoming' | 'completed' => {
    const now = new Date();
    const start = new Date(party.starts_at);
    const end = party.ends_at ? new Date(party.ends_at) : new Date(start.getTime() + 5 * 60 * 60 * 1000);
    
    if (now >= start && now <= end) {
      return 'live';
    } else if (now < start) {
      return 'upcoming';
    } else {
      return 'completed';
    }
  };

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <Skeleton className="h-10 w-32" />
        <Skeleton className="h-48 rounded-xl" />
        <Skeleton className="h-32 rounded-xl" />
        <Skeleton className="h-32 rounded-xl" />
      </div>
    );
  }

  if (!fraternity) {
    return (
      <div className="max-w-2xl mx-auto text-center py-12">
        <p className="text-muted-foreground">Fraternity not found</p>
        <Button asChild variant="link" className="mt-4">
          <Link to={createPageUrl('Leaderboard')}>Back to Leaderboard</Link>
        </Button>
      </div>
    );
  }

  const upcomingParties = parties.filter(p => {
    const status = getPartyStatus(p);
    return status === 'upcoming' || status === 'live';
  });
  const pastParties = parties.filter(p => getPartyStatus(p) === 'completed');
  
  // Find completed parties that have ratings (at least one rating)
  const ratedPastParties = pastParties.filter(p => {
    const score = partyScores.get(p.id);
    return score !== undefined && p.total_ratings > 0;
  });

  // For header "Overall Party Quality": Use Element 2 (semesterPartyScore) when available
  // Falls back to partyAdj for display if no rated parties (hasPartyScoreData === false)
  const headerPartyQuality = computedScores?.hasPartyScoreData 
    ? computedScores.semesterPartyScore 
    : null;

  // DEBUG: Log displayed value vs computed scores
  if (import.meta.env.DEV && computedScores && fraternity) {
    console.log('═══════════════════════════════════════════════════════════');
    console.log(`[FRAT PROFILE PAGE] ${fraternity.name} - Display Values`);
    console.log('═══════════════════════════════════════════════════════════');
    console.log('Computed Scores (from computeFullFraternityScores):');
    console.log(`  hasPartyScoreData: ${computedScores.hasPartyScoreData}`);
    console.log(`  semesterPartyScore (Element 2): ${computedScores.semesterPartyScore?.toFixed(4) ?? 'null'}`);
    console.log(`  semesterPartyAvg: ${computedScores.semesterPartyAvg?.toFixed(4) ?? 'null'}`);
    console.log(`  hostingBonus: ${computedScores.hostingBonus.toFixed(4)}`);
    console.log(`  partyAdj (legacy): ${computedScores.partyAdj.toFixed(4)}`);
    console.log(`  partyIndex (legacy): ${computedScores.partyIndex.toFixed(4)}`);
    console.log('───────────────────────────────────────────────────────────');
    console.log('UI Display:');
    console.log(`  "Overall Party Quality" displays: ${headerPartyQuality?.toFixed(4) ?? '— (null)'}`);
    console.log(`  Source: ${computedScores.hasPartyScoreData ? 'semesterPartyScore (Element 2)' : 'null (no data)'}`);
    console.log('───────────────────────────────────────────────────────────');
    console.log('Raw Q_p values in partyScores Map (for party cards only):');
    partyScores.forEach((score, partyId) => {
      const party = parties.find(p => p.id === partyId);
      console.log(`  "${party?.title ?? partyId}": Q_p = ${score.toFixed(4)}`);
    });
    console.log('═══════════════════════════════════════════════════════════');
  }

  // Calculate user's combined scores if they have rated
  const userFratScore = userRating 
    ? computeCombinedReputation(userRating.brotherhood, userRating.reputation, userRating.community)
    : null;

  return (
    <div className="max-w-2xl mx-auto space-y-5 pb-20">
      {/* Back Button */}
      <Button asChild variant="ghost" className="px-0 -mb-2">
        <Link to={createPageUrl('Leaderboard')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Leaderboard
        </Link>
      </Button>

      {/* HERO SECTION - Gamified Header */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary/90 via-primary to-violet-600 p-6 text-white shadow-xl">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 right-0 w-40 h-40 bg-white/20 rounded-full blur-3xl translate-x-10 -translate-y-10" />
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/20 rounded-full blur-3xl -translate-x-10 translate-y-10" />
        </div>
        
        <div className="relative flex items-start gap-5">
          {/* Greek Letter Avatar */}
          <div className="relative">
            <div className="w-20 h-20 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center text-3xl font-bold ring-4 ring-white/30 shadow-lg">
              {getFratGreek(fraternity.name)}
            </div>
            {computedScores?.hasOverallData && computedScores.overall !== null && computedScores.overall >= 8 && (
              <div className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-amber-400 flex items-center justify-center shadow-lg animate-pulse">
                <Crown className="h-4 w-4 text-amber-900" />
              </div>
            )}
          </div>
          
          {/* Info */}
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold truncate drop-shadow-sm">{fraternity.name}</h1>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <span className="px-3 py-1 rounded-full bg-white/20 text-sm font-medium backdrop-blur-sm">
                {getFratShorthand(fraternity.name)}
              </span>
              {fraternity.founded_year && (
                <span className="text-white/80 text-sm flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  Est. {fraternity.founded_year}
                </span>
              )}
            </div>
            {fraternity.description && (
              <p className="text-white/80 text-sm mt-3 line-clamp-2">{fraternity.description}</p>
            )}
          </div>
        </div>

        {/* Quick Stats Row */}
        <div className="relative grid grid-cols-3 gap-3 mt-5">
          <div className="text-center p-3 rounded-xl bg-white/10 backdrop-blur-sm">
            <PartyPopper className="h-5 w-5 mx-auto mb-1 opacity-80" />
            <p className="text-2xl font-bold">{computedScores?.numPartiesHosted ?? 0}</p>
            <p className="text-xs opacity-80">Parties</p>
          </div>
          <div className="text-center p-3 rounded-xl bg-white/10 backdrop-blur-sm">
            <ThumbsUp className="h-5 w-5 mx-auto mb-1 opacity-80" />
            <p className="text-2xl font-bold">{(computedScores?.numRepRatings ?? 0) + (computedScores?.numPartyRatings ?? 0)}</p>
            <p className="text-xs opacity-80">Ratings</p>
          </div>
          <div className="text-center p-3 rounded-xl bg-white/10 backdrop-blur-sm">
            <MessageCircle className="h-5 w-5 mx-auto mb-1 opacity-80" />
            <p className="text-2xl font-bold">{(computedScores?.numPartyComments ?? 0) + (computedScores?.numFratComments ?? 0)}</p>
            <p className="text-xs opacity-80">Comments</p>
          </div>
        </div>
      </div>

      {/* SCORE CARDS - Gamified */}
      {computedScores && (
        <div className="grid grid-cols-3 gap-3">
          {/* Overall Score - Big Card */}
          <Card className="col-span-3 glass p-5 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-full blur-2xl" />
            <div className="relative flex items-center justify-between">
              <div className="flex items-center gap-4">
                {/* Circular Score Display */}
                <div className="relative">
                  <svg className="w-20 h-20 -rotate-90">
                    <circle
                      cx="40"
                      cy="40"
                      r="36"
                      stroke="currentColor"
                      strokeWidth="6"
                      fill="none"
                      className="text-muted"
                    />
                    <circle
                      cx="40"
                      cy="40"
                      r="36"
                      stroke="currentColor"
                      strokeWidth="6"
                      fill="none"
                      strokeDasharray={`${((computedScores.overall ?? 0) / 10) * 226} 226`}
                      strokeLinecap="round"
                      className={`${computedScores.hasOverallData ? 'text-primary' : 'text-muted-foreground'} transition-all duration-1000`}
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    {computedScores.hasOverallData && computedScores.overall !== null ? (
                      <span className="text-2xl font-bold">{computedScores.overall.toFixed(1)}</span>
                    ) : (
                      <span className="text-xl font-bold text-muted-foreground">—</span>
                    )}
                  </div>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground font-medium">Overall Score</p>
                  {!computedScores.hasOverallData ? (
                    <p className="text-xs text-muted-foreground">Needs more ratings</p>
                  ) : (
                    <div className="flex items-center gap-2 mt-1">
                      <TrendIndicator momentum={computedScores.trending} showLabel />
                    </div>
                  )}
                </div>
              </div>
              
              {computedScores.trending !== 0 && (
                <div className={`px-3 py-1.5 rounded-full text-sm font-semibold ${
                  computedScores.trending > 0 
                    ? 'bg-emerald-100 text-emerald-700' 
                    : 'bg-red-100 text-red-700'
                }`}>
                  {computedScores.trending > 0 ? '+' : ''}{computedScores.trending.toFixed(2)}
                </div>
              )}
            </div>
          </Card>

          {/* Frat Rating Card */}
          <Card className="glass p-4 space-y-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-violet-100 flex items-center justify-center">
                <Star className="h-4 w-4 text-violet-600" />
              </div>
            </div>
            {computedScores.hasRepData ? (
              <>
                <p className={`text-2xl font-bold ${getScoreColor(computedScores.repAdj)}`}>
                  {computedScores.repAdj.toFixed(1)}
                </p>
                <p className="text-xs text-muted-foreground">Frat Rating</p>
              </>
            ) : (
              <>
                <p className="text-2xl font-bold text-muted-foreground">—</p>
                <p className="text-xs text-muted-foreground">Frat Rating</p>
              </>
            )}
          </Card>

          {/* Party Quality Card */}
          <Card className="glass p-4 space-y-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-pink-100 flex items-center justify-center">
                <PartyPopper className="h-4 w-4 text-pink-600" />
              </div>
            </div>
            {headerPartyQuality !== null ? (
              <>
                <p className={`text-2xl font-bold ${getScoreColor(headerPartyQuality)}`}>
                  {headerPartyQuality.toFixed(1)}
                </p>
                <p className="text-xs text-muted-foreground">Party Score</p>
              </>
            ) : (
              <>
                <p className="text-2xl font-bold text-muted-foreground">—</p>
                <p className="text-xs text-muted-foreground">Party Score</p>
              </>
            )}
          </Card>

          {/* Trending Card */}
          <Card className="glass p-4 space-y-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center">
                <Flame className="h-4 w-4 text-emerald-600" />
              </div>
            </div>
            <p className={`text-2xl font-bold ${computedScores.activityTrending > 0 ? 'text-emerald-600' : 'text-muted-foreground'}`}>
              {computedScores.activityTrending > 0 ? '+' : ''}{computedScores.activityTrending.toFixed(1)}
            </p>
            <p className="text-xs text-muted-foreground">Activity</p>
          </Card>
        </div>
      )}

      {/* CATEGORY BREAKDOWN - Visual */}
      {computedScores && computedScores.hasRepData && (
        <Card className="glass p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold flex items-center gap-2">
              <Trophy className="h-5 w-5 text-amber-500" />
              Rating Breakdown
            </h3>
            <span className="text-xs text-muted-foreground">
              {computedScores.numRepRatings} {computedScores.numRepRatings === 1 ? 'rating' : 'ratings'}
            </span>
          </div>
          
          <div className="space-y-4">
            {[
              { label: 'Brotherhood', icon: Users, value: computedScores.avgBrotherhood, color: 'bg-blue-500', bgColor: 'bg-blue-100', iconColor: 'text-blue-600' },
              { label: 'Reputation', icon: Shield, value: computedScores.avgReputation, color: 'bg-violet-500', bgColor: 'bg-violet-100', iconColor: 'text-violet-600' },
              { label: 'Community', icon: Heart, value: computedScores.avgCommunity, color: 'bg-rose-500', bgColor: 'bg-rose-100', iconColor: 'text-rose-600' },
            ].map(({ label, icon: Icon, value, color, bgColor, iconColor }) => (
              <div key={label} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-xl ${bgColor} flex items-center justify-center`}>
                      <Icon className={`h-4 w-4 ${iconColor}`} />
                    </div>
                    <span className="font-medium text-sm">{label}</span>
                  </div>
                  <span className={`text-lg font-bold ${getScoreColor(value)}`}>{value.toFixed(1)}</span>
                </div>
                <div className="h-2.5 rounded-full bg-muted overflow-hidden">
                  <div 
                    className={`h-full rounded-full ${color} transition-all duration-700`}
                    style={{ width: `${value * 10}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* YOUR RATINGS Section - Enhanced */}
      <Card className="glass overflow-hidden">
        {/* Header with gradient */}
        <div className="bg-gradient-to-r from-amber-500 to-orange-500 p-4 flex items-center justify-between">
          <div className="flex items-center gap-3 text-white">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-semibold">Your Rating</h2>
              <p className="text-xs opacity-80">Personal score for this frat</p>
            </div>
          </div>
          <Button onClick={handleRate} size="sm" variant="secondary" className="shadow-md">
            <Star className="h-4 w-4 mr-1" />
            {userRating ? 'Update' : 'Rate'}
          </Button>
        </div>
        
        <div className="p-5 space-y-5">
          {/* Overall Personal Score */}
          {userFratScore !== null ? (
            <div className="flex items-center justify-between p-4 rounded-2xl bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200/50">
              <div>
                <p className="text-sm text-muted-foreground">Your Overall Score</p>
                <p className="text-xs text-muted-foreground mt-0.5">Based on your ratings</p>
              </div>
              <div className={`text-3xl font-bold ${getScoreColor(userFratScore)}`}>
                {userFratScore.toFixed(1)}
              </div>
            </div>
          ) : (
            <div className="text-center py-6 text-muted-foreground">
              <Star className="h-10 w-10 mx-auto mb-2 opacity-30" />
              <p className="font-medium">You haven't rated this frat yet</p>
              <p className="text-sm">Tap the Rate button to add your score</p>
            </div>
          )}
          
          {/* Category Ratings */}
          {userRating && (
            <div className="space-y-4">
              {[
                { label: 'Brotherhood', icon: Users, value: userRating.brotherhood, color: 'bg-blue-500', bgColor: 'bg-blue-100', iconColor: 'text-blue-600' },
                { label: 'Reputation', icon: Shield, value: userRating.reputation, color: 'bg-violet-500', bgColor: 'bg-violet-100', iconColor: 'text-violet-600' },
                { label: 'Community', icon: Heart, value: userRating.community, color: 'bg-rose-500', bgColor: 'bg-rose-100', iconColor: 'text-rose-600' },
              ].map(({ label, icon: Icon, value, color, bgColor, iconColor }) => (
                <div key={label} className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-xl ${bgColor} flex items-center justify-center flex-shrink-0`}>
                    <Icon className={`h-5 w-5 ${iconColor}`} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-sm font-medium">{label}</span>
                      <span className={`font-bold ${getScoreColor(value)}`}>{value.toFixed(1)}</span>
                    </div>
                    <div className="h-2 rounded-full bg-muted overflow-hidden">
                      <div 
                        className={`h-full rounded-full ${color} transition-all duration-500`}
                        style={{ width: `${value * 10}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Your Party Ratings */}
          {userPartyRatings.length > 0 && (
            <div className="pt-4 border-t space-y-3">
              <div className="flex items-center gap-2">
                <Music className="h-5 w-5 text-pink-500" />
                <p className="text-sm font-medium">Your Party Ratings</p>
              </div>
              <div className="space-y-2">
                {userPartyRatings.map((rating) => {
                  const party = parties.find(p => p.id === rating.party_id);
                  if (!party) return null;
                  return (
                    <Link key={rating.id} to={createPageUrl(`Party?id=${party.id}`)}>
                      <div className="flex items-center justify-between p-3 rounded-xl bg-muted/50 hover:bg-muted transition-colors">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-lg bg-pink-100 flex items-center justify-center">
                            <PartyPopper className="h-4 w-4 text-pink-600" />
                          </div>
                          <div>
                            <p className="font-medium text-sm">{party.title}</p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(party.starts_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                            </p>
                          </div>
                        </div>
                        <span className={`text-lg font-bold ${getScoreColor(rating.party_quality_score)}`}>
                          {rating.party_quality_score.toFixed(1)}
                        </span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* CONFIDENCE - Gamified */}
      {computedScores && (
        <Card className="glass overflow-hidden">
          <div className="bg-gradient-to-r from-cyan-500 to-blue-500 p-4 flex items-center gap-3 text-white">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
              <Zap className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-semibold">Data Confidence</h2>
              <p className="text-xs opacity-80">How reliable is this score?</p>
            </div>
          </div>
          <div className="p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className={`text-4xl font-bold ${
                  computedScores.confidenceOverall >= 0.7 ? 'text-emerald-500' :
                  computedScores.confidenceOverall >= 0.4 ? 'text-amber-500' : 'text-red-500'
                }`}>
                  {Math.round(computedScores.confidenceOverall * 100)}%
                </div>
                <Badge className={`${
                  computedScores.confidenceOverall >= 0.7 ? 'bg-emerald-100 text-emerald-700' :
                  computedScores.confidenceOverall >= 0.4 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'
                }`}>
                  {computedScores.confidenceOverall >= 0.7 ? 'High' :
                   computedScores.confidenceOverall >= 0.4 ? 'Moderate' : 'Low Data'}
                </Badge>
              </div>
            </div>
            
            {/* Confidence bar */}
            <div className="h-3 rounded-full bg-muted overflow-hidden mb-4">
              <div 
                className={`h-full rounded-full transition-all duration-700 ${
                  computedScores.confidenceOverall >= 0.7 ? 'bg-emerald-500' :
                  computedScores.confidenceOverall >= 0.4 ? 'bg-amber-500' : 'bg-red-500'
                }`}
                style={{ width: `${computedScores.confidenceOverall * 100}%` }}
              />
            </div>
            
            {/* Stats breakdown */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-xl bg-violet-50 dark:bg-violet-950/30 border border-violet-200/50 dark:border-violet-800/50">
                <div className="flex items-center gap-2 mb-1">
                  <Star className="h-4 w-4 text-violet-500" />
                  <span className="text-xs text-muted-foreground">Frat Ratings</span>
                </div>
                <p className="text-2xl font-bold text-violet-600 dark:text-violet-400">{computedScores.numRepRatings}</p>
              </div>
              <div className="p-3 rounded-xl bg-pink-50 dark:bg-pink-950/30 border border-pink-200/50 dark:border-pink-800/50">
                <div className="flex items-center gap-2 mb-1">
                  <PartyPopper className="h-4 w-4 text-pink-500" />
                  <span className="text-xs text-muted-foreground">Party Ratings</span>
                </div>
                <p className="text-2xl font-bold text-pink-600 dark:text-pink-400">{computedScores.numPartyRatings}</p>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* UPCOMING PARTIES - Gamified */}
      {upcomingParties.length > 0 && (
        <Card className="glass overflow-hidden">
          <div className="bg-gradient-to-r from-emerald-500 to-teal-500 p-4 flex items-center justify-between text-white">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center animate-pulse">
                <PartyPopper className="h-5 w-5" />
              </div>
              <div>
                <h2 className="font-semibold">Upcoming Events</h2>
                <p className="text-xs opacity-80">{upcomingParties.length} {upcomingParties.length === 1 ? 'party' : 'parties'} scheduled</p>
              </div>
            </div>
            <Badge className="bg-white/20 text-white border-white/30">
              🔥 Don't miss out!
            </Badge>
          </div>
          <div className="p-4 space-y-3">
            {upcomingParties.map(party => (
              <PartyCard
                key={party.id}
                party={party}
                fraternityName={fraternity.name}
              />
            ))}
          </div>
        </Card>
      )}

      {/* PAST PARTIES - Gamified */}
      {pastParties.length > 0 && (
        <Card className="glass overflow-hidden">
          <div className="bg-gradient-to-r from-slate-600 to-slate-700 p-4 flex items-center justify-between text-white">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                <Calendar className="h-5 w-5" />
              </div>
              <div>
                <h2 className="font-semibold">Party History</h2>
                <p className="text-xs opacity-80">{pastParties.length} completed {pastParties.length === 1 ? 'event' : 'events'}</p>
              </div>
            </div>
            {ratedPastParties.length > 0 && (
              <div className="text-right">
                <p className="text-lg font-bold">
                  {ratedPastParties.length}/{pastParties.length}
                </p>
                <p className="text-xs opacity-80">Rated</p>
              </div>
            )}
          </div>
          <div className="p-4 space-y-3">
            {pastParties.map(party => {
              const score = partyScores.get(party.id);
              return (
                <PartyCard
                  key={party.id}
                  party={party}
                  fraternityName={fraternity.name}
                  overallPartyQuality={score}
                />
              );
            })}
          </div>
        </Card>
      )}

      {parties.length === 0 && (
        <Card className="glass p-8 text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-muted flex items-center justify-center">
            <PartyPopper className="h-8 w-8 text-muted-foreground/50" />
          </div>
          <p className="font-medium text-muted-foreground">No parties scheduled yet</p>
          <p className="text-sm text-muted-foreground/70 mt-1">Check back soon for upcoming events!</p>
        </Card>
      )}

      {/* COMMENTS SECTION - Gamified wrapper */}
      <Card className="glass overflow-hidden">
        <div className="bg-gradient-to-r from-indigo-500 to-purple-500 p-4 flex items-center justify-between text-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
              <MessageCircle className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-semibold">Community Discussion</h2>
              <p className="text-xs opacity-80">Share your experience</p>
            </div>
          </div>
          <Badge className="bg-white/20 text-white border-white/30">
            💬 Join the convo
          </Badge>
        </div>
        <div className="p-4">
          <CommentSection entityId={fraternity.id} entityType="fraternity" />
        </div>
      </Card>

      {/* Rate Sheet */}
      <RateFratSheet
        fraternity={showRateSheet ? fraternity : null}
        isOpen={showRateSheet}
        onClose={() => setShowRateSheet(false)}
        onSubmit={handleRateSubmit}
        existingScores={existingScores}
      />

      <RateActionSheet
        isOpen={showRateAction !== false}
        onClose={() => setShowRateAction(false)}
        onRateFrat={handleRateFratFromSheet}
        onRateParty={handleRatePartyFromSheet}
        fraternities={allFraternities}
        initialAction={showRateAction || undefined}
      />

      {selectedParty && (
        <PartyRatingForm
          party={selectedParty}
          onClose={() => setSelectedParty(null)}
          onSubmit={handlePartyRatingSubmit}
        />
      )}

      {/* Floating Rate Buttons */}
      {!showRateSheet && !selectedParty && showRateAction === false && (
        <div 
          className="fixed bottom-24 right-4 z-50 flex items-center gap-2"
          style={{ marginBottom: 'env(safe-area-inset-bottom)' }}
        >
          {rateExpanded ? (
            <>
              <button
                onClick={() => { setShowRateAction('parties'); setRateExpanded(false); }}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-full bg-primary text-white shadow-lg active:scale-95 transition-all animate-scale-in"
              >
                <PartyPopper className="h-4 w-4" />
                <span className="font-medium text-sm">Party</span>
              </button>
              <button
                onClick={() => { setShowRateAction('rate'); setRateExpanded(false); }}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-full bg-amber-500 text-white shadow-lg active:scale-95 transition-all animate-scale-in"
              >
                <Star className="h-4 w-4" />
                <span className="font-medium text-sm">Frat</span>
              </button>
              <button
                onClick={() => setRateExpanded(false)}
                className="flex items-center justify-center w-10 h-10 rounded-full bg-muted text-muted-foreground shadow-lg active:scale-95 transition-all"
              >
                <X className="h-5 w-5" />
              </button>
            </>
          ) : (
            <button
              onClick={() => setRateExpanded(true)}
              className="flex items-center gap-2 px-5 py-3 rounded-full bg-amber-500 text-white shadow-lg active:scale-95 transition-transform"
            >
              <Star className="h-5 w-5" />
              <span className="font-semibold">Rate</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}
