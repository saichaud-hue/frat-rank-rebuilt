import { useState, useEffect } from 'react';
import { base44, seedInitialData, type Fraternity, type ReputationRating } from '@/api/base44Client';
import { clamp } from '@/utils';
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
  const [existingScore, setExistingScore] = useState<number | undefined>();

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
    const sorted = [...frats];
    switch (f) {
      case 'overall':
        return sorted.sort((a, b) => {
          const scoreA = a.display_score ?? 5;
          const scoreB = b.display_score ?? 5;
          if (scoreB !== scoreA) return scoreB - scoreA;
          return (b.momentum ?? 0) - (a.momentum ?? 0);
        });
      case 'reputation':
        return sorted.sort((a, b) => (b.reputation_score ?? 5) - (a.reputation_score ?? 5));
      case 'party':
        return sorted.sort((a, b) => (b.historical_party_score ?? 5) - (a.historical_party_score ?? 5));
      case 'trending':
        return sorted.sort((a, b) => {
          const momA = a.momentum ?? 0;
          const momB = b.momentum ?? 0;
          if (momB !== momA) return momB - momA;
          return (b.display_score ?? 5) - (a.display_score ?? 5);
        });
      default:
        return sorted;
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

    setExistingScore(existingRatings.length > 0 ? existingRatings[0].score : undefined);
    setSelectedFrat(fraternity);
  };

  const handleRateSubmit = async (score: number) => {
    if (!selectedFrat) return;

    const user = await base44.auth.me();
    if (!user) return;

    // Check for existing rating
    const existingRatings = await base44.entities.ReputationRating.filter({
      fraternity_id: selectedFrat.id,
      user_id: user.id,
    });

    if (existingRatings.length > 0) {
      await base44.entities.ReputationRating.update(existingRatings[0].id, { score });
    } else {
      await base44.entities.ReputationRating.create({
        fraternity_id: selectedFrat.id,
        user_id: user.id,
        score,
        weight: 1,
        semester: 'Fall 2024',
      });
    }

    // Recalculate fraternity scores
    const allRatings = await base44.entities.ReputationRating.filter({
      fraternity_id: selectedFrat.id,
    });

    const reputationScore = allRatings.length > 0
      ? allRatings.reduce((sum, r) => sum + (r.score ?? 5), 0) / allRatings.length
      : 5;

    const baseScore = (0.5 * reputationScore) + (0.5 * (selectedFrat.historical_party_score ?? 5));

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
        existingScore={existingScore}
      />
    </div>
  );
}
