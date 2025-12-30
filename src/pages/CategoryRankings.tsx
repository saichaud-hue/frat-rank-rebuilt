import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { ChevronLeft, Crown, Star, PartyPopper, TrendingUp, type LucideIcon } from 'lucide-react';
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
import FraternityCard from '@/components/leaderboard/FraternityCard';
import RateFratSheet from '@/components/leaderboard/RateFratSheet';
import Podium from '@/components/leaderboard/Podium';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { clamp, createPageUrl } from '@/utils';
import { ensureAuthed } from '@/utils/auth';

type CategoryType = 'overall' | 'reputation' | 'party' | 'trending';

const categoryConfig: Record<CategoryType, { title: string; subtitle: string; icon: LucideIcon }> = {
  overall: {
    title: 'Overall Rankings',
    subtitle: 'Combined performance across all metrics',
    icon: Crown,
  },
  reputation: {
    title: 'Fraternity Rankings',
    subtitle: 'Based on brotherhood, reputation & community',
    icon: Star,
  },
  party: {
    title: 'Party Rankings',
    subtitle: 'Best party hosts on campus',
    icon: PartyPopper,
  },
  trending: {
    title: 'Trending Now',
    subtitle: 'Most active fraternities this week',
    icon: TrendingUp,
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
  const rest = fraternities.slice(3);
  const restRanks = ranks.slice(3);

  if (loading) {
    return (
      <div className="space-y-5">
        <Skeleton className="h-12 w-48" />
        <Skeleton className="h-40 w-full rounded-2xl" />
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-20 rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-5">
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
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-yellow-500 flex items-center justify-center shadow-lg">
            <Icon className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold">{config.title}</h1>
            <p className="text-xs text-muted-foreground">{config.subtitle}</p>
          </div>
        </div>
      </div>

      {/* Full Podium */}
      {topThree.length >= 3 && (
        <div className="relative rounded-2xl p-5 bg-gradient-to-br from-slate-800 via-slate-900 to-slate-800 overflow-hidden">
          {/* Decorative elements */}
          <div className="absolute inset-0 bg-black/10" />
          <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-amber-500/10 rounded-full blur-2xl" />
          
          <div className="relative">
            <Podium topThree={topThree} variant="detail" getScore={getScore} />
          </div>
        </div>
      )}

      {/* Full List */}
      {rest.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Full Rankings</h3>
          {rest.map((frat, index) => {
            const fratRank = restRanks[index];
            const isTied = restRanks.filter(r => r === fratRank).length > 1;
            return (
              <FraternityCard
                key={frat.id}
                fraternity={frat}
                rank={fratRank}
                onRate={handleRate}
                filter={category}
                isTied={isTied}
              />
            );
          })}
        </div>
      )}

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
