import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { ChevronLeft, Crown, Star, PartyPopper, TrendingUp, Trophy, Medal, X, Flame, Sparkles, type LucideIcon } from 'lucide-react';
import { base44, seedInitialData, type Fraternity, type Party, type PartyRating, type ReputationRating, type PartyComment, type FraternityComment } from '@/api/base44Client';
import { recordUserAction } from '@/utils/streak';
import { 
  computeFullFraternityScores, 
  computeCampusRepAvg, 
  computeCampusPartyAvg,
  sortFraternitiesByOverall,
  sortFraternitiesByReputation,
  sortFraternitiesByParty,
  sortFraternitiesByTrending,
  type FraternityWithScores,
  type PartyWithRatings,
  type ActivityData,
  getCachedCampusBaseline,
} from '@/utils/scoring';
import RateFratSheet from '@/components/leaderboard/RateFratSheet';
import RateActionSheet from '@/components/leaderboard/RateActionSheet';
import PartyRatingForm from '@/components/rate/PartyRatingForm';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { clamp, createPageUrl, getScoreColor, getScoreBgColor, getFratGreek, getFratShorthand } from '@/utils';
import { ensureAuthed } from '@/utils/auth';
import { cn } from '@/lib/utils';

type CategoryType = 'overall' | 'reputation' | 'party' | 'trending';

const categoryConfig: Record<CategoryType, { 
  title: string; 
  subtitle: string; 
  icon: LucideIcon;
  iconBg: string;
  headerGradient: string;
}> = {
  overall: {
    title: 'Overall Rankings',
    subtitle: 'Combined performance across all metrics',
    icon: Crown,
    iconBg: 'bg-gradient-to-br from-amber-400 to-yellow-500',
    headerGradient: 'from-amber-500 via-orange-500 to-red-500',
  },
  reputation: {
    title: 'Fraternity Rankings',
    subtitle: 'Based on brotherhood, reputation & community',
    icon: Star,
    iconBg: 'bg-gradient-to-br from-violet-500 to-purple-600',
    headerGradient: 'from-violet-500 via-purple-500 to-fuchsia-500',
  },
  party: {
    title: 'Party Rankings',
    subtitle: 'Best party hosts on campus',
    icon: PartyPopper,
    iconBg: 'bg-gradient-to-br from-pink-500 to-rose-500',
    headerGradient: 'from-pink-500 via-rose-500 to-red-500',
  },
  trending: {
    title: 'Trending Now',
    subtitle: 'Most active fraternities this week',
    icon: TrendingUp,
    iconBg: 'bg-gradient-to-br from-emerald-500 to-teal-500',
    headerGradient: 'from-emerald-500 via-teal-500 to-cyan-500',
  },
};

export default function CategoryRankings() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const category = (searchParams.get('category') as CategoryType) || 'overall';
  
  const [fraternities, setFraternities] = useState<FraternityWithScores[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFrat, setSelectedFrat] = useState<Fraternity | null>(null);
  const [existingScores, setExistingScores] = useState<{ brotherhood: number; reputation: number; community: number } | undefined>();
  const [showRateAction, setShowRateAction] = useState<'rate' | 'parties' | false>(false);
  const [rateExpanded, setRateExpanded] = useState(false);
  const [selectedParty, setSelectedParty] = useState<Party | null>(null);

  const config = categoryConfig[category];
  const Icon = config.icon;

  useEffect(() => {
    loadFraternities();
  }, [category]);

  const loadFraternities = async () => {
    setLoading(true);
    try {
      await seedInitialData();
      
      const [fratsData, partiesData, allPartyRatings, allRepRatings, allPartyComments, allFratComments] = await Promise.all([
        base44.entities.Fraternity.filter({ status: 'active' }),
        base44.entities.Party.list(),
        base44.entities.PartyRating.list(),
        base44.entities.ReputationRating.list(),
        base44.entities.PartyComment.list(),
        base44.entities.FraternityComment.list(),
      ]);

      const campusRepAvg = computeCampusRepAvg(fratsData);
      const campusPartyAvg = computeCampusPartyAvg(allPartyRatings);

      const partiesByFrat = new Map<string, Party[]>();
      for (const party of partiesData) {
        if (party.fraternity_id) {
          const existing = partiesByFrat.get(party.fraternity_id) || [];
          existing.push(party);
          partiesByFrat.set(party.fraternity_id, existing);
        }
      }

      const partyRatingsMap = new Map<string, PartyRating[]>();
      for (const rating of allPartyRatings) {
        if (rating.party_id) {
          const existing = partyRatingsMap.get(rating.party_id) || [];
          existing.push(rating);
          partyRatingsMap.set(rating.party_id, existing);
        }
      }

      const repRatingsByFrat = new Map<string, ReputationRating[]>();
      for (const rating of allRepRatings) {
        if (rating.fraternity_id) {
          const existing = repRatingsByFrat.get(rating.fraternity_id) || [];
          existing.push(rating);
          repRatingsByFrat.set(rating.fraternity_id, existing);
        }
      }

      const partyCommentsByParty = new Map<string, PartyComment[]>();
      for (const comment of allPartyComments) {
        if (comment.party_id) {
          const existing = partyCommentsByParty.get(comment.party_id) || [];
          existing.push(comment);
          partyCommentsByParty.set(comment.party_id, existing);
        }
      }

      const fratCommentsByFrat = new Map<string, FraternityComment[]>();
      for (const comment of allFratComments) {
        if (comment.fraternity_id) {
          const existing = fratCommentsByFrat.get(comment.fraternity_id) || [];
          existing.push(comment);
          fratCommentsByFrat.set(comment.fraternity_id, existing);
        }
      }

      const allPartiesWithRatings: PartyWithRatings[] = partiesData.map(party => ({
        party,
        ratings: partyRatingsMap.get(party.id) || [],
      }));

      const fratsWithScores: FraternityWithScores[] = await Promise.all(
        fratsData.map(async (frat) => {
          const fratParties = partiesByFrat.get(frat.id) || [];
          const partiesWithRatings: PartyWithRatings[] = fratParties.map(party => ({
            party,
            ratings: partyRatingsMap.get(party.id) || [],
          }));
          const repRatings = repRatingsByFrat.get(frat.id) || [];
          const fratPartyRatings = fratParties.flatMap(p => partyRatingsMap.get(p.id) || []);
          const fratPartyComments = fratParties.flatMap(p => partyCommentsByParty.get(p.id) || []);
          
          const activityData: ActivityData = {
            repRatings,
            partyRatings: fratPartyRatings,
            parties: fratParties,
            partyComments: fratPartyComments,
            fratComments: fratCommentsByFrat.get(frat.id) || [],
          };

          const campusBaseline = getCachedCampusBaseline(allPartiesWithRatings);

          const scores = await computeFullFraternityScores(
            frat,
            repRatings,
            partiesWithRatings,
            campusRepAvg,
            campusPartyAvg,
            activityData,
            campusBaseline
          );

          return { ...frat, computedScores: scores };
        })
      );

      // Sort by category
      let sorted: FraternityWithScores[];
      switch (category) {
        case 'overall':
          sorted = sortFraternitiesByOverall(fratsWithScores);
          break;
        case 'reputation':
          sorted = sortFraternitiesByReputation(fratsWithScores);
          break;
        case 'party':
          sorted = sortFraternitiesByParty(fratsWithScores);
          break;
        case 'trending':
          sorted = sortFraternitiesByTrending(fratsWithScores);
          break;
        default:
          sorted = sortFraternitiesByOverall(fratsWithScores);
      }

      setFraternities(sorted);
    } catch (error) {
      console.error('Failed to load fraternities:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRate = async (fraternity: Fraternity) => {
    const user = await ensureAuthed();
    if (!user) return;

    const existingRatings = await base44.entities.ReputationRating.filter({
      fraternity_id: fraternity.id,
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
    setSelectedFrat(fraternity);
  };

  const handleRateSubmit = async (scores: { brotherhood: number; reputation: number; community: number; combined: number }) => {
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

    const allRatings = await base44.entities.ReputationRating.filter({
      fraternity_id: selectedFrat.id,
    });

    const reputationScore = allRatings.length > 0
      ? allRatings.reduce((sum, r) => sum + (r.combined_score ?? 5), 0) / allRatings.length
      : 5;

    await base44.entities.Fraternity.update(selectedFrat.id, {
      reputation_score: clamp(reputationScore, 0, 10),
    });

    await recordUserAction();
    await loadFraternities();
  };

  // Handler for rating a party from the floating button
  const handleRateParty = (party: Party) => {
    setShowRateAction(false);
    setSelectedParty(party);
  };

  const handlePartyRatingSubmit = async () => {
    setSelectedParty(null);
    await loadFraternities();
  };

  const getScore = (frat: FraternityWithScores): number | null => {
    const s = frat.computedScores;
    if (!s) return null;
    switch (category) {
      case 'overall': return s.hasOverallData ? s.overall : null;
      case 'reputation': return s.hasRepData ? s.repAdj : null;
      case 'party': return s.hasPartyScoreData ? s.semesterPartyScore : null;
      case 'trending': return s.activityTrending;
      default: return s.hasOverallData ? s.overall : null;
    }
  };

  const computeRanks = (): number[] => {
    if (fraternities.length === 0) return [];
    const ranks: number[] = [];
    for (let i = 0; i < fraternities.length; i++) {
      const currScore = getScore(fraternities[i]);
      if (i === 0) {
        ranks.push(1);
      } else {
        const prevScore = getScore(fraternities[i - 1]);
        if (currScore === null && prevScore === null) {
          ranks.push(ranks[i - 1]);
        } else if (currScore === null || prevScore === null) {
          ranks.push(i + 1);
        } else if (Math.abs(prevScore - currScore) < 0.01) {
          ranks.push(ranks[i - 1]);
        } else {
          ranks.push(i + 1);
        }
      }
    }
    return ranks;
  };

  const ranks = computeRanks();
  const topThree = fraternities.slice(0, 3);

  // Rank badge styles
  const getRankBadgeStyle = (rank: number) => {
    if (rank === 1) return 'bg-gradient-to-br from-amber-400 to-yellow-500 text-white shadow-lg shadow-amber-500/30';
    if (rank === 2) return 'bg-gradient-to-br from-slate-300 to-slate-400 text-white shadow-md';
    if (rank === 3) return 'bg-gradient-to-br from-amber-600 to-amber-700 text-white shadow-md';
    return 'bg-muted text-muted-foreground';
  };

  if (loading) {
    return (
      <div className="space-y-5">
        <div className="h-32 rounded-2xl bg-gradient-to-r from-primary/20 to-purple-500/20 animate-pulse" />
        <div className="h-56 rounded-2xl bg-muted/50 animate-pulse" />
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-20 rounded-xl bg-muted/30 animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-5 pb-24">
      {/* Hero Header */}
      <div className={cn(
        "relative overflow-hidden rounded-2xl p-6 text-white",
        `bg-gradient-to-r ${config.headerGradient}`
      )}>
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZGVmcz48cGF0dGVybiBpZD0iZ3JpZCIgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiBwYXR0ZXJuVW5pdHM9InVzZXJTcGFjZU9uVXNlIj48cGF0aCBkPSJNIDQwIDAgTCAwIDAgMCA0MCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJ3aGl0ZSIgc3Ryb2tlLW9wYWNpdHk9IjAuMSIgc3Ryb2tlLXdpZHRoPSIxIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2dyaWQpIi8+PC9zdmc+')] opacity-30" />
        
        <div className="relative">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/Leaderboard')}
            className="absolute -top-1 -left-1 text-white/80 hover:text-white hover:bg-white/20"
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
          
          <div className="flex items-center gap-3 ml-8">
            <div className={cn(
              "w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg",
              config.iconBg
            )}>
              <Icon className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">{config.title}</h1>
              <p className="text-white/80 text-sm">{config.subtitle}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Podium */}
      {topThree.length >= 3 && (
        <Card className="p-6 bg-gradient-to-br from-background to-muted/30 border-0 shadow-lg">
          <div className="flex items-end justify-center gap-4">
            {/* 2nd Place */}
            <Link to={createPageUrl(`Fraternity?id=${topThree[1].id}`)} className="flex flex-col items-center group">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-slate-300 to-slate-400 flex items-center justify-center shadow-lg mb-2">
                <Trophy className="h-5 w-5 text-white" />
              </div>
              <p className="font-bold text-xl text-slate-600 group-hover:text-primary transition-colors">
                {getFratGreek(topThree[1].name)}
              </p>
              <p className={cn("text-lg font-bold", getScoreColor(getScore(topThree[1]) ?? 0))}>
                {getScore(topThree[1])?.toFixed(1) || '—'}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5 text-center max-w-[70px] truncate">
                {getFratShorthand(topThree[1].name)}
              </p>
              <div className="w-20 h-24 bg-gradient-to-b from-slate-200 to-slate-300 rounded-t-xl mt-3 flex items-center justify-center shadow-inner">
                <span className="text-3xl font-bold text-slate-500">2</span>
              </div>
            </Link>

            {/* 1st Place */}
            <Link to={createPageUrl(`Fraternity?id=${topThree[0].id}`)} className="flex flex-col items-center -mt-6 group">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-400 to-yellow-500 flex items-center justify-center shadow-lg mb-2 animate-pulse">
                <Crown className="h-6 w-6 text-white" />
              </div>
              <p className="font-bold text-2xl text-amber-600 group-hover:text-amber-500 transition-colors">
                {getFratGreek(topThree[0].name)}
              </p>
              <p className={cn("text-xl font-bold", getScoreColor(getScore(topThree[0]) ?? 0))}>
                {getScore(topThree[0])?.toFixed(1) || '—'}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5 text-center max-w-[80px] truncate">
                {getFratShorthand(topThree[0].name)}
              </p>
              <div className="w-24 h-32 bg-gradient-to-b from-amber-300 to-amber-400 rounded-t-xl mt-3 flex items-center justify-center shadow-inner">
                <span className="text-4xl font-bold text-amber-600">1</span>
              </div>
            </Link>

            {/* 3rd Place */}
            <Link to={createPageUrl(`Fraternity?id=${topThree[2].id}`)} className="flex flex-col items-center group">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-600 to-amber-700 flex items-center justify-center shadow-lg mb-2">
                <Medal className="h-5 w-5 text-white" />
              </div>
              <p className="font-bold text-xl text-amber-700 group-hover:text-amber-600 transition-colors">
                {getFratGreek(topThree[2].name)}
              </p>
              <p className={cn("text-lg font-bold", getScoreColor(getScore(topThree[2]) ?? 0))}>
                {getScore(topThree[2])?.toFixed(1) || '—'}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5 text-center max-w-[70px] truncate">
                {getFratShorthand(topThree[2].name)}
              </p>
              <div className="w-20 h-20 bg-gradient-to-b from-amber-500 to-amber-600 rounded-t-xl mt-3 flex items-center justify-center shadow-inner">
                <span className="text-3xl font-bold text-amber-700">3</span>
              </div>
            </Link>
          </div>
        </Card>
      )}

      {/* Full Rankings List */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 px-1">
          <Trophy className="h-5 w-5 text-amber-500" />
          <h3 className="font-bold text-lg">Full Rankings</h3>
          <Badge variant="secondary" className="ml-auto">{fraternities.length} Frats</Badge>
        </div>
        
        {fraternities.map((frat, index) => {
          const rank = ranks[index];
          const score = getScore(frat);
          const isTop3 = rank <= 3;
          
          return (
            <Link key={frat.id} to={createPageUrl(`Fraternity?id=${frat.id}`)}>
              <Card className={cn(
                "p-4 transition-all hover:shadow-lg active:scale-[0.98]",
                isTop3 && "border-l-4",
                rank === 1 && "border-l-amber-500 bg-amber-50/50",
                rank === 2 && "border-l-slate-400 bg-slate-50/50",
                rank === 3 && "border-l-amber-600 bg-amber-50/30"
              )}>
                <div className="flex items-center gap-3">
                  {/* Rank Badge */}
                  <div className={cn(
                    "w-11 h-11 rounded-xl flex items-center justify-center font-bold text-sm",
                    getRankBadgeStyle(rank)
                  )}>
                    {rank}
                  </div>
                  
                  {/* Avatar */}
                  <Avatar className={cn(
                    "h-12 w-12 ring-2",
                    rank === 1 ? "ring-amber-400" : rank === 2 ? "ring-slate-300" : rank === 3 ? "ring-amber-600" : "ring-muted"
                  )}>
                    <AvatarImage src={frat.logo_url} />
                    <AvatarFallback className={cn(
                      "font-bold text-sm",
                      rank === 1 ? "bg-amber-100 text-amber-700" : "bg-primary/10 text-primary"
                    )}>
                      {getFratGreek(frat.name)}
                    </AvatarFallback>
                  </Avatar>
                  
                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-base truncate">{frat.name}</h3>
                    <p className="text-sm text-muted-foreground">{getFratShorthand(frat.name)}</p>
                  </div>
                  
                  {/* Score */}
                  <div className="text-right">
                    <p className={cn("text-2xl font-bold", getScoreColor(score ?? 0))}>
                      {score?.toFixed(1) || '—'}
                    </p>
                    {isTop3 && (
                      <Badge variant="secondary" className="text-[10px]">
                        {rank === 1 ? '🥇' : rank === 2 ? '🥈' : '🥉'}
                      </Badge>
                    )}
                  </div>
                </div>
              </Card>
            </Link>
          );
        })}
      </div>

      <RateFratSheet
        fraternity={selectedFrat}
        isOpen={!!selectedFrat}
        onClose={() => setSelectedFrat(null)}
        onSubmit={handleRateSubmit}
        existingScores={existingScores}
      />

      <RateActionSheet
        isOpen={showRateAction !== false}
        onClose={() => setShowRateAction(false)}
        onRateFrat={handleRate}
        onRateParty={handleRateParty}
        fraternities={fraternities}
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
      {!selectedFrat && !selectedParty && showRateAction === false && (
        <div 
          className="fixed bottom-24 right-4 z-50 flex items-center gap-2"
          style={{ marginBottom: 'env(safe-area-inset-bottom)' }}
        >
          {rateExpanded ? (
            <>
              <button
                onClick={() => { setShowRateAction('parties'); setRateExpanded(false); }}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-full bg-gradient-to-r from-pink-500 to-rose-500 text-white shadow-lg shadow-pink-500/30 active:scale-95 transition-all animate-scale-in"
              >
                <PartyPopper className="h-4 w-4" />
                <span className="font-medium text-sm">Party</span>
              </button>
              <button
                onClick={() => { setShowRateAction('rate'); setRateExpanded(false); }}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg shadow-amber-500/30 active:scale-95 transition-all animate-scale-in"
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
              className="flex items-center gap-2 px-5 py-3 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg shadow-amber-500/30 active:scale-95 transition-transform hover:shadow-xl"
            >
              <Sparkles className="h-5 w-5" />
              <span className="font-bold">Rate</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}
