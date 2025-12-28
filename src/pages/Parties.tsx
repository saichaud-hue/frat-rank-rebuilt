import { useState, useEffect } from 'react';
import { PartyPopper } from 'lucide-react';
import { base44, seedInitialData, type Party, type Fraternity, type PartyRating } from '@/api/base44Client';
import PartyCard from '@/components/parties/PartyCard';
import PartyFilters from '@/components/parties/PartyFilters';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { subDays, addDays, startOfDay, endOfDay } from 'date-fns';
import { computePartyOverallQuality, type PartyWithRatings } from '@/utils/scoring';
interface Filters {
  fraternity: string;
  theme: string;
  timeframe: string;
}

export default function Parties() {
  const [parties, setParties] = useState<Party[]>([]);
  const [fraternities, setFraternities] = useState<Fraternity[]>([]);
  const [partyScores, setPartyScores] = useState<Map<string, number>>(new Map());
  const [partyRatingCounts, setPartyRatingCounts] = useState<Map<string, number>>(new Map());
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<Filters>({
    fraternity: 'all',
    theme: 'all',
    timeframe: 'all',
  });

  useEffect(() => {
    initAndLoad();
  }, []);

  const initAndLoad = async () => {
    await seedInitialData();
    await loadData();
    setLoading(false);
  };

  const loadData = async () => {
    try {
      const [partiesData, fraternityData, allPartyRatings] = await Promise.all([
        base44.entities.Party.list('starts_at'),
        base44.entities.Fraternity.list(),
        base44.entities.PartyRating.list(),
      ]);
      
      setParties(partiesData);
      setFraternities(fraternityData);

      // Group ratings by party and track counts
      const partyRatingsMap = new Map<string, PartyRating[]>();
      const ratingCountsMap = new Map<string, number>();
      for (const rating of allPartyRatings) {
        if (rating.party_id) {
          const existing = partyRatingsMap.get(rating.party_id) || [];
          existing.push(rating);
          partyRatingsMap.set(rating.party_id, existing);
          ratingCountsMap.set(rating.party_id, existing.length);
        }
      }
      setPartyRatingCounts(ratingCountsMap);

      // Group parties by fraternity for fraternity-scoped baselines
      const partiesByFrat = new Map<string, PartyWithRatings[]>();
      for (const party of partiesData) {
        const fratId = party.fraternity_id;
        const ratings = partyRatingsMap.get(party.id) || [];
        const existing = partiesByFrat.get(fratId) || [];
        existing.push({ party, ratings });
        partiesByFrat.set(fratId, existing);
      }

      // Compute per-party overall quality using Formula G
      // Each party uses fraternity baseline EXCLUDING that party's ratings
      const perPartyScores = new Map<string, number>();
      // Each party now uses fixed 5.0 baseline (independent scoring)
      for (const [fratId, fratPartiesWithRatings] of partiesByFrat) {
        for (const { party, ratings } of fratPartiesWithRatings) {
          const overall = computePartyOverallQuality(ratings);
          perPartyScores.set(party.id, overall);
        }
      }
      setPartyScores(perPartyScores);
    } catch (error) {
      console.error('Failed to load data:', error);
    }
  };

  const getFraternityName = (id: string) => {
    const frat = fraternities.find(f => f.id === id);
    return frat ? frat.name : 'Unknown';
  };

  // Determine party status based on current time, not stored status
  const getPartyStatus = (party: Party): 'live' | 'upcoming' | 'completed' => {
    const now = new Date();
    const start = new Date(party.starts_at);
    // Default party duration: 5 hours if no end time specified
    const end = party.ends_at ? new Date(party.ends_at) : new Date(start.getTime() + 5 * 60 * 60 * 1000);
    
    if (now >= start && now <= end) {
      return 'live';
    } else if (now < start) {
      return 'upcoming';
    } else {
      return 'completed';
    }
  };

  const filterParties = (partiesList: Party[]) => {
    return partiesList.filter(party => {
      // Fraternity filter
      if (filters.fraternity !== 'all' && party.fraternity_id !== filters.fraternity) {
        return false;
      }

      // Theme filter
      if (filters.theme !== 'all' && party.theme?.toLowerCase() !== filters.theme.toLowerCase()) {
        return false;
      }

      // Timeframe filter - rolling window around today (includes past + future)
      if (filters.timeframe !== 'all') {
        const partyDate = new Date(party.starts_at);
        const now = new Date();

        switch (filters.timeframe) {
          case 'today':
            // Today = within current local day
            const dayStart = startOfDay(now);
            const dayEnd = endOfDay(now);
            if (partyDate < dayStart || partyDate > dayEnd) return false;
            break;
          case 'week':
            // Week = ±7 days from now
            const weekStart = subDays(now, 7);
            const weekEnd = addDays(now, 7);
            if (partyDate < weekStart || partyDate > weekEnd) return false;
            break;
          case 'month':
            // Month = ±30 days from now
            const monthStart = subDays(now, 30);
            const monthEnd = addDays(now, 30);
            if (partyDate < monthStart || partyDate > monthEnd) return false;
            break;
        }
      }

      return true;
    });
  };

  const filteredParties = filterParties(parties);
  const liveParties = filteredParties.filter(p => getPartyStatus(p) === 'live');
  const upcomingParties = filteredParties.filter(p => getPartyStatus(p) === 'upcoming');
  // Sort completed parties by Overall Party Quality (confidence-adjusted) descending
  const completedParties = filteredParties
    .filter(p => getPartyStatus(p) === 'completed')
    .sort((a, b) => (partyScores.get(b.id) ?? 0) - (partyScores.get(a.id) ?? 0));

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <Skeleton className="h-12 w-full rounded-xl" />
        <Skeleton className="h-10 w-full rounded-lg" />
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-32 rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-2">
        <PartyPopper className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold text-foreground">Parties</h1>
      </div>

      {/* Filters */}
      <PartyFilters
        filters={filters}
        onFiltersChange={setFilters}
        fraternities={fraternities}
      />

      {/* Live Parties */}
      {liveParties.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <Badge className="bg-red-500 text-white animate-pulse-subtle">LIVE NOW</Badge>
          </div>
          {liveParties.map(party => (
            <PartyCard
              key={party.id}
              party={party}
              fraternityName={getFraternityName(party.fraternity_id)}
              isLive
              computedStatus="live"
              overallPartyQuality={partyScores.get(party.id)}
              ratingCount={partyRatingCounts.get(party.id) ?? 0}
            />
          ))}
        </section>
      )}

      {/* Upcoming Parties */}
      {upcomingParties.length > 0 && (
        <section className="space-y-3">
          <h2 className="font-semibold text-muted-foreground">Upcoming</h2>
          {upcomingParties.map(party => (
            <PartyCard
              key={party.id}
              party={party}
              fraternityName={getFraternityName(party.fraternity_id)}
              computedStatus="upcoming"
              overallPartyQuality={partyScores.get(party.id)}
              ratingCount={partyRatingCounts.get(party.id) ?? 0}
            />
          ))}
        </section>
      )}

      {/* Completed Parties */}
      {completedParties.length > 0 && (
        <section className="space-y-3">
          <h2 className="font-semibold text-muted-foreground">Past Parties</h2>
          {completedParties.map(party => (
            <PartyCard
              key={party.id}
              party={party}
              fraternityName={getFraternityName(party.fraternity_id)}
              computedStatus="completed"
              overallPartyQuality={partyScores.get(party.id)}
              ratingCount={partyRatingCounts.get(party.id) ?? 0}
            />
          ))}
        </section>
      )}

      {filteredParties.length === 0 && (
        <div className="text-center py-12 space-y-2">
          <PartyPopper className="h-12 w-12 mx-auto text-muted-foreground/50" />
          <p className="text-muted-foreground">No parties found</p>
          <p className="text-sm text-muted-foreground">Try adjusting your filters</p>
        </div>
      )}
    </div>
  );
}
