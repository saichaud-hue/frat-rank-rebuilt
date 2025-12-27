import { useState, useEffect } from 'react';
import { base44, seedInitialData, type Fraternity } from '@/api/base44Client';
import { clamp } from '@/utils';
import { getOverallScore, getPartyScore, getReputationScore, sortFraternitiesByOverall } from '@/utils/scoring';
import LeaderboardHeader from '@/components/leaderboard/LeaderboardHeader';
import LeaderboardPodium from '@/components/leaderboard/LeaderboardPodium';
import FraternityCard from '@/components/leaderboard/FraternityCard';
import RateFratSheet from '@/components/leaderboard/RateFratSheet';
import { Skeleton } from '@/components/ui/skeleton';

type FilterType = 'overall' | 'reputation' | 'party' | 'trending';

export default function Leaderboard() {
  const [fraternities, setFraternities] = useState<Fraternity[]>([]);
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
      const data = await base44.entities.Fraternity.filter({ status: 'active' });
      setFraternities(sortByFilter(data, filter));
    } catch (error) {
      console.error('Failed to load fraternities:', error);
    } finally {
      setLoading(false);
    }
  };

  const sortByFilter = (frats: Fraternity[], f: FilterType): Fraternity[] => {
    switch (f) {
      case 'overall':
        return sortFraternitiesByOverall(frats);
      case 'reputation':
        return [...frats].sort((a, b) => {
          const repA = getReputationScore(a);
          const repB = getReputationScore(b);
          if (repB !== repA) return repB - repA;
          return (a.chapter ?? '').localeCompare(b.chapter ?? '');
        });
      case 'party':
        return [...frats].sort((a, b) => {
          const partyA = getPartyScore(a);
          const partyB = getPartyScore(b);
          if (partyB !== partyA) return partyB - partyA;
          return (a.chapter ?? '').localeCompare(b.chapter ?? '');
        });
      case 'trending':
        return [...frats].sort((a, b) => {
          const momA = a.momentum ?? 0;
          const momB = b.momentum ?? 0;
          if (momB !== momA) return momB - momA;
          return getOverallScore(b) - getOverallScore(a);
        });
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

    // Check for existing rating
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

    // Check for existing rating
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

    const baseScore = (0.7 * reputationScore) + (0.3 * (selectedFrat.historical_party_score ?? 5));

    await base44.entities.Fraternity.update(selectedFrat.id, {
      reputation_score: clamp(reputationScore, 0, 10),
      base_score: clamp(baseScore, 0, 10),
      display_score: clamp(baseScore, 0, 10),
    });

    await loadFraternities();
  };

  const topThree = fraternities.slice(0, 3);
  const rest = fraternities.slice(3);

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
        <LeaderboardPodium topThree={topThree} />
      )}

      <div className="space-y-3">
        {rest.map((frat, index) => (
          <FraternityCard
            key={frat.id}
            fraternity={frat}
            rank={index + 4}
            onRate={handleRate}
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