import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { ChevronLeft, Crown, Star, PartyPopper, TrendingUp, Trophy, Medal, type LucideIcon } from 'lucide-react';
import { base44, seedInitialData, type Fraternity, type Party, type PartyRating, type ReputationRating, type PartyComment, type FraternityComment } from '@/api/base44Client';
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
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { clamp, createPageUrl, getScoreColor, toGreekLetters } from '@/utils';
import { ensureAuthed } from '@/utils/auth';

type CategoryType = 'overall' | 'reputation' | 'party' | 'trending';

const categoryConfig: Record<CategoryType, { 
  title: string; 
  subtitle: string; 
  icon: LucideIcon;
  iconBg: string;
}> = {
  overall: {
    title: 'Overall Rankings',
    subtitle: 'Combined performance across all metrics',
    icon: Crown,
    iconBg: 'bg-amber-500',
  },
  reputation: {
    title: 'Fraternity Rankings',
    subtitle: 'Based on brotherhood, reputation & community',
    icon: Star,
    iconBg: 'bg-violet-500',
  },
  party: {
    title: 'Party Rankings',
    subtitle: 'Best party hosts on campus',
    icon: PartyPopper,
    iconBg: 'bg-rose-500',
  },
  trending: {
    title: 'Trending Now',
    subtitle: 'Most active fraternities this week',
    icon: TrendingUp,
    iconBg: 'bg-emerald-500',
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

  // Rank badge colors
  const getRankBadgeStyle = (rank: number) => {
    if (rank === 1) return 'bg-gradient-to-br from-amber-400 to-yellow-500 text-white';
    if (rank === 2) return 'bg-gradient-to-br from-slate-300 to-slate-400 text-white';
    if (rank === 3) return 'bg-gradient-to-br from-amber-600 to-amber-700 text-white';
    return 'bg-slate-100 text-slate-600';
  };

  if (loading) {
    return (
      <div className="space-y-5">
        <Skeleton className="h-12 w-48" />
        <Skeleton className="h-56 w-full rounded-2xl" />
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-20 rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-5 pb-24">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate('/Leaderboard')}
          className="shrink-0"
        >
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <div className="flex items-center gap-3">
          <div className={`w-11 h-11 rounded-2xl ${config.iconBg} flex items-center justify-center shadow-lg`}>
            <Icon className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold">{config.title}</h1>
            <p className="text-xs text-muted-foreground">{config.subtitle}</p>
          </div>
        </div>
      </div>

      {/* Clean Light Podium */}
      {topThree.length >= 3 && (
        <div className="py-6">
          <div className="flex items-end justify-center gap-3">
            {/* 2nd Place */}
            <Link to={createPageUrl(`Fraternity?id=${topThree[1].id}`)} className="flex flex-col items-center">
              <div className="bg-gradient-to-br from-slate-300 to-slate-400 w-10 h-10 rounded-xl flex items-center justify-center shadow-md mb-2">
                <Trophy className="h-5 w-5 text-white" />
              </div>
              <p className="font-bold text-lg text-slate-600">
                {toGreekLetters(topThree[1].chapter?.substring(0, 2) || topThree[1].name.substring(0, 2))}
              </p>
              <p className={`text-lg font-bold ${getScoreColor(getScore(topThree[1]) ?? 0)}`}>
                {getScore(topThree[1])?.toFixed(1) || '—'}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5 text-center max-w-[70px] truncate">
                {topThree[1].name}
              </p>
              <div className="w-20 h-24 bg-gradient-to-b from-slate-200 to-slate-300 rounded-t-xl mt-2 flex items-center justify-center">
                <span className="text-2xl font-bold text-slate-500">2</span>
              </div>
            </Link>

            {/* 1st Place */}
            <Link to={createPageUrl(`Fraternity?id=${topThree[0].id}`)} className="flex flex-col items-center -mt-4">
              <div className="bg-gradient-to-br from-amber-400 to-yellow-500 w-12 h-12 rounded-xl flex items-center justify-center shadow-lg mb-2">
                <Crown className="h-6 w-6 text-white" />
              </div>
              <p className="font-bold text-xl text-amber-600">
                {toGreekLetters(topThree[0].chapter?.substring(0, 2) || topThree[0].name.substring(0, 2))}
              </p>
              <p className={`text-xl font-bold ${getScoreColor(getScore(topThree[0]) ?? 0)}`}>
                {getScore(topThree[0])?.toFixed(1) || '—'}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5 text-center max-w-[80px] truncate">
                {topThree[0].name}
              </p>
              <div className="w-24 h-32 bg-gradient-to-b from-amber-300 to-amber-400 rounded-t-xl mt-2 flex items-center justify-center">
                <span className="text-3xl font-bold text-amber-600">1</span>
              </div>
            </Link>

            {/* 3rd Place */}
            <Link to={createPageUrl(`Fraternity?id=${topThree[2].id}`)} className="flex flex-col items-center">
              <div className="bg-gradient-to-br from-amber-600 to-amber-700 w-10 h-10 rounded-xl flex items-center justify-center shadow-md mb-2">
                <Medal className="h-5 w-5 text-white" />
              </div>
              <p className="font-bold text-lg text-amber-700">
                {toGreekLetters(topThree[2].chapter?.substring(0, 2) || topThree[2].name.substring(0, 2))}
              </p>
              <p className={`text-lg font-bold ${getScoreColor(getScore(topThree[2]) ?? 0)}`}>
                {getScore(topThree[2])?.toFixed(1) || '—'}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5 text-center max-w-[70px] truncate">
                {topThree[2].name}
              </p>
              <div className="w-20 h-20 bg-gradient-to-b from-amber-500 to-amber-600 rounded-t-xl mt-2 flex items-center justify-center">
                <span className="text-2xl font-bold text-amber-700">3</span>
              </div>
            </Link>
          </div>
        </div>
      )}

      {/* Full Rankings List */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Trophy className="h-4 w-4" />
          <h3 className="text-sm font-semibold">Full Rankings</h3>
        </div>
        
        {fraternities.map((frat, index) => {
          const rank = ranks[index];
          const score = getScore(frat);
          
          return (
            <Link key={frat.id} to={createPageUrl(`Fraternity?id=${frat.id}`)}>
              <Card className="p-4 bg-white border border-slate-100 shadow-sm hover:shadow-md active:scale-[0.98] transition-all">
                <div className="flex items-center gap-3">
                  {/* Rank Badge */}
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm ${getRankBadgeStyle(rank)}`}>
                    {rank}
                  </div>
                  
                  {/* Avatar */}
                  <Avatar className="h-11 w-11 ring-2 ring-slate-100">
                    <AvatarImage src={frat.logo_url} />
                    <AvatarFallback className="bg-primary/10 text-primary font-bold text-sm">
                      {toGreekLetters(frat.chapter?.substring(0, 2) || frat.name.substring(0, 2))}
                    </AvatarFallback>
                  </Avatar>
                  
                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-base truncate">{frat.name}</h3>
                    <p className="text-sm text-muted-foreground">{frat.chapter}</p>
                  </div>
                  
                  {/* Score */}
                  <p className={`text-2xl font-bold ${getScoreColor(score ?? 0)}`}>
                    {score?.toFixed(1) || '—'}
                  </p>
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
    </div>
  );
}
