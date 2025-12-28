import { useState, useEffect } from 'react';
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
  type FraternityScores,
  type PartyWithRatings,
  type ActivityData
} from '@/utils/scoring';
import LeaderboardHeader from '@/components/leaderboard/LeaderboardHeader';
import LeaderboardPodium from '@/components/leaderboard/LeaderboardPodium';
import FraternityCard from '@/components/leaderboard/FraternityCard';
import RateFratSheet from '@/components/leaderboard/RateFratSheet';
import { Skeleton } from '@/components/ui/skeleton';
import { clamp } from '@/utils';

type FilterType = 'overall' | 'reputation' | 'party' | 'trending';

export default function Leaderboard() {
  const [fraternities, setFraternities] = useState<FraternityWithScores[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterType>('overall');
  const [selectedFrat, setSelectedFrat] = useState<Fraternity | null>(null);
  const [existingScores, setExistingScores] = useState<{ brotherhood: number; reputation: number; community: number } | undefined>();

  useEffect(() => {
    initAndLoad();
  }, []);

  useEffect(() => {
    if (fraternities.length > 0) {
      sortFraternities();
    }
  }, [filter]);

  const initAndLoad = async () => {
    await seedInitialData();
    await loadFraternities();
  };

  const loadFraternities = async () => {
    try {
      // Load all data needed for scoring including comments for activity trending
      const [fratsData, partiesData, allPartyRatings, allRepRatings, allPartyComments, allFratComments] = await Promise.all([
        base44.entities.Fraternity.filter({ status: 'active' }),
        base44.entities.Party.list(),
        base44.entities.PartyRating.list(),
        base44.entities.ReputationRating.list(),
        base44.entities.PartyComment.list(),
        base44.entities.FraternityComment.list(),
      ]);

      // Compute campus averages
      const campusRepAvg = computeCampusRepAvg(fratsData);
      const campusPartyAvg = computeCampusPartyAvg(partiesData);

      // Group parties and ratings by fraternity
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

      // Group comments by party
      const partyCommentsByParty = new Map<string, PartyComment[]>();
      for (const comment of allPartyComments) {
        if (comment.party_id) {
          const existing = partyCommentsByParty.get(comment.party_id) || [];
          existing.push(comment);
          partyCommentsByParty.set(comment.party_id, existing);
        }
      }

      // Group fraternity comments by fraternity
      const fratCommentsByFrat = new Map<string, FraternityComment[]>();
      for (const comment of allFratComments) {
        if (comment.fraternity_id) {
          const existing = fratCommentsByFrat.get(comment.fraternity_id) || [];
          existing.push(comment);
          fratCommentsByFrat.set(comment.fraternity_id, existing);
        }
      }

      // Compute full scores for each fraternity
      const fratsWithScores: FraternityWithScores[] = await Promise.all(
        fratsData.map(async (frat) => {
          const fratParties = partiesByFrat.get(frat.id) || [];
          const partiesWithRatings: PartyWithRatings[] = fratParties.map(party => ({
            party,
            ratings: partyRatingsMap.get(party.id) || [],
          }));
          const repRatings = repRatingsByFrat.get(frat.id) || [];
          
          // Get all party ratings for this frat's parties
          const fratPartyRatings = fratParties.flatMap(p => partyRatingsMap.get(p.id) || []);
          
          // Get all party comments for this frat's parties
          const fratPartyComments = fratParties.flatMap(p => partyCommentsByParty.get(p.id) || []);
          
          // Build activity data for trending calculation
          const activityData: ActivityData = {
            repRatings,
            partyRatings: fratPartyRatings,
            parties: fratParties,
            partyComments: fratPartyComments,
            fratComments: fratCommentsByFrat.get(frat.id) || [],
          };

          const scores = await computeFullFraternityScores(
            frat,
            repRatings,
            partiesWithRatings,
            campusRepAvg,
            campusPartyAvg,
            activityData
          );

          return {
            ...frat,
            computedScores: scores,
          };
        })
      );

      setFraternities(sortByFilter(fratsWithScores, filter));
    } catch (error) {
      console.error('Failed to load fraternities:', error);
    } finally {
      setLoading(false);
    }
  };

  const sortByFilter = (frats: FraternityWithScores[], f: FilterType): FraternityWithScores[] => {
    switch (f) {
      case 'overall':
        return sortFraternitiesByOverall(frats);
      case 'reputation':
        return sortFraternitiesByReputation(frats);
      case 'party':
        return sortFraternitiesByParty(frats);
      case 'trending':
        return sortFraternitiesByTrending(frats);
      default:
        return sortFraternitiesByOverall(frats);
    }
  };

  const sortFraternities = () => {
    setFraternities(prev => sortByFilter(prev, filter));
  };

  const handleRate = async (fraternity: Fraternity) => {
    const user = await base44.auth.me();
    if (!user) {
      base44.auth.redirectToLogin(window.location.href);
      return;
    }

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
      await base44.entities.ReputationRating.update(existingRatings[0].id, ratingData);
    } else {
      await base44.entities.ReputationRating.create({
        fraternity_id: selectedFrat.id,
        user_id: user.id,
        ...ratingData,
        weight: 1,
        semester: 'Fall 2024',
      });
    }

    // Recalculate fraternity scores
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

  // Compute ranks with ties (same score = same rank)
  const computeRanks = (frats: FraternityWithScores[]): number[] => {
    if (frats.length === 0) return [];
    
    const getScore = (f: FraternityWithScores): number => {
      const s = f.computedScores;
      if (!s) return 5;
      switch (filter) {
        case 'overall': return s.overall;
        case 'reputation': return s.repAdj;
        case 'party': return s.partyAdj;
        case 'trending': return s.trending;
        default: return s.overall;
      }
    };
    
    const ranks: number[] = [];
    let currentRank = 1;
    
    for (let i = 0; i < frats.length; i++) {
      if (i === 0) {
        ranks.push(1);
      } else {
        const prevScore = getScore(frats[i - 1]);
        const currScore = getScore(frats[i]);
        // If scores are equal (within tolerance), assign same rank
        if (Math.abs(prevScore - currScore) < 0.01) {
          ranks.push(ranks[i - 1]);
        } else {
          ranks.push(i + 1);
        }
      }
    }
    return ranks;
  };

  const ranks = computeRanks(fraternities);
  const topThree = fraternities.slice(0, 3);
  const topThreeRanks = ranks.slice(0, 3);
  const rest = fraternities.slice(3);
  const restRanks = ranks.slice(3);

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <Skeleton className="h-24 w-full rounded-xl" />
        <div className="grid grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-40 rounded-xl" />
          ))}
        </div>
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-32 rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <LeaderboardHeader 
        filter={filter} 
        onFilterChange={setFilter} 
      />

      {topThree.length >= 3 && (
        <LeaderboardPodium topThree={topThree} ranks={topThreeRanks} filter={filter} />
      )}

      <div className="space-y-3">
        {rest.map((frat, index) => (
          <FraternityCard
            key={frat.id}
            fraternity={frat}
            rank={restRanks[index]}
            onRate={handleRate}
            filter={filter}
          />
        ))}
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
