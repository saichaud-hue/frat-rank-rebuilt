import { useState, useEffect } from 'react';
import { PartyPopper } from 'lucide-react';
import { base44, seedInitialData, type Party, type Fraternity, type PartyRating } from '@/api/base44Client';
import PartyCard from '@/components/parties/PartyCard';
import PartyFilters from '@/components/parties/PartyFilters';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { subDays, addDays, startOfDay, endOfDay } from 'date-fns';
import { computePartyOverallQuality, computeFraternityPartyBaseline, type PartyWithRatings } from '@/utils/scoring';
interface Filters {
  fraternity: string;
  theme: string;
  timeframe: string;
}

export default function Parties() {
  const [parties, setParties] = useState<Party[]>([]);
  const [fraternities, setFraternities] = useState<Fraternity[]>([]);
  const [partyScores, setPartyScores] = useState<Map<string, number>>(new Map());
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

      // Group ratings by party
      const partyRatingsMap = new Map<string, PartyRating[]>();
      for (const rating of allPartyRatings) {
        if (rating.party_id) {
          const existing = partyRatingsMap.get(rating.party_id) || [];
          existing.push(rating);
          partyRatingsMap.set(rating.party_id, existing);
        }
      }

      // Group parties by fraternity for fraternity-scoped baselines
      const partiesByFrat = new Map<string, PartyWithRatings[]>();
      for (const party of partiesData) {
        const fratId = party.fraternity_id;
        const ratings = partyRatingsMap.get(party.id) || [];
        const existing = partiesByFrat.get(fratId) || [];
        existing.push({ party, ratings });
        partiesByFrat.set(fratId, existing);
      }

      // Compute per-party overall quality using confidence-adjusted formula.
      // Baseline is computed per-party, EXCLUDING that party's own ratings.
      const perPartyScores = new Map<string, number>();
      for (const [, partiesWithRatings] of partiesByFrat) {
        for (const { party, ratings } of partiesWithRatings) {
          // Exclude this party's ratings from the baseline calculation
          const perPartyBaseline = computeFraternityPartyBaseline(partiesWithRatings, party.id);
          const overall = computePartyOverallQuality(ratings, perPartyBaseline);
          perPartyScores.set(party.id, overall);

          // DEV DEBUG: Log Margaritaville calculations
          if (import.meta.env.DEV && party.title === 'Margaritaville') {
            const avgQuality = ratings.length > 0
              ? ratings.reduce((s, r) => s + (0.5 * (r.vibe_score ?? 5) + 0.3 * (r.music_score ?? 5) + 0.2 * (r.execution_score ?? 5)), 0) / ratings.length
              : 5;
            const confidence = 1 - Math.exp(-ratings.length / 10);
            console.log('[DEBUG Parties.tsx - Margaritaville]', {
              n: ratings.length,
              avgQuality: avgQuality.toFixed(2),
              baseline: perPartyBaseline.toFixed(2),
              confidence: confidence.toFixed(3),
              adjustedOverall: overall.toFixed(2),
              note: ratings.length === 1 ? 'With n=1, ~90% weight on baseline, so overall should be close to baseline' : ''
            });
          }
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

  const isLive = (party: Party) => {
    if (party.status === 'active') return true;
    const now = new Date();
    const start = new Date(party.starts_at);
    const end = party.ends_at ? new Date(party.ends_at) : new Date(start.getTime() + 5 * 60 * 60 * 1000);
    return now >= start && now <= end;
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
  const liveParties = filteredParties.filter(p => isLive(p));
  const upcomingParties = filteredParties.filter(p => !isLive(p) && p.status === 'upcoming');
  // Sort completed parties by Overall Party Quality (confidence-adjusted) descending
  const completedParties = filteredParties
    .filter(p => p.status === 'completed')
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
              overallPartyQuality={partyScores.get(party.id)}
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
              overallPartyQuality={partyScores.get(party.id)}
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
              overallPartyQuality={partyScores.get(party.id)}
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
