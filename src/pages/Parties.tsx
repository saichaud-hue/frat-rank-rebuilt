import { useState, useEffect } from 'react';
import { PartyPopper, Plus, Flame, Calendar, Clock } from 'lucide-react';
import { base44, seedInitialData, type Party, type Fraternity, type PartyRating } from '@/api/base44Client';
import PartyRow from '@/components/parties/PartyRow';
import PartyFilters from '@/components/parties/PartyFilters';
import PartiesIntro from '@/components/onboarding/PartiesIntro';
import CreatePartySheet from '@/components/parties/CreatePartySheet';
import { Skeleton } from '@/components/ui/skeleton';
import { subDays, addDays, startOfDay, endOfDay } from 'date-fns';
import { computeRawPartyQuality } from '@/utils/scoring';

interface Filters {
  fraternity: string;
  type: string;
  timeframe: string;
}

export default function Parties() {
  const [parties, setParties] = useState<Party[]>([]);
  const [fraternities, setFraternities] = useState<Fraternity[]>([]);
  const [partyScores, setPartyScores] = useState<Map<string, number>>(new Map());
  const [partyRatingCounts, setPartyRatingCounts] = useState<Map<string, number>>(new Map());
  const [loading, setLoading] = useState(true);
  const [showIntro, setShowIntro] = useState(() => {
    return !localStorage.getItem('fratrank_parties_intro_never_show');
  });
  const [introShownThisVisit, setIntroShownThisVisit] = useState(false);
  const [showCreateSheet, setShowCreateSheet] = useState(false);
  const [filters, setFilters] = useState<Filters>({
    fraternity: 'all',
    type: 'all',
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

      const perPartyScores = new Map<string, number>();
      for (const party of partiesData) {
        const ratings = partyRatingsMap.get(party.id) || [];
        const rawQuality = computeRawPartyQuality(ratings);
        if (rawQuality !== null) {
          perPartyScores.set(party.id, rawQuality);
        }
      }
      setPartyScores(perPartyScores);
    } catch (error) {
      console.error('Failed to load data:', error);
    }
  };

  const getFraternityName = (id: string) => {
    const frat = fraternities.find(f => f.id === id);
    return frat ? frat.chapter : 'Unknown';
  };

  const getPartyStatus = (party: Party): 'live' | 'upcoming' | 'completed' => {
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

  const filterParties = (partiesList: Party[]) => {
    return partiesList.filter(party => {
      if (filters.fraternity !== 'all' && party.fraternity_id !== filters.fraternity) {
        return false;
      }

      if (filters.type !== 'all' && party.theme?.toLowerCase() !== filters.type.toLowerCase()) {
        return false;
      }

      if (filters.timeframe !== 'all') {
        const partyDate = new Date(party.starts_at);
        const now = new Date();

        switch (filters.timeframe) {
          case 'today':
            const dayStart = startOfDay(now);
            const dayEnd = endOfDay(now);
            if (partyDate < dayStart || partyDate > dayEnd) return false;
            break;
          case 'week':
            const weekStart = subDays(now, 7);
            const weekEnd = addDays(now, 7);
            if (partyDate < weekStart || partyDate > weekEnd) return false;
            break;
          case 'month':
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
  const completedParties = filteredParties
    .filter(p => getPartyStatus(p) === 'completed')
    .sort((a, b) => (partyScores.get(b.id) ?? 0) - (partyScores.get(a.id) ?? 0));

  const totalRatings = Array.from(partyRatingCounts.values()).reduce((a, b) => a + b, 0);
  const avgScore = partyScores.size > 0 
    ? Array.from(partyScores.values()).reduce((a, b) => a + b, 0) / partyScores.size 
    : 0;

  if (loading) {
    return (
      <div className="space-y-6 px-4">
        <div className="space-y-2">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-4 w-24" />
        </div>
        <div className="flex gap-2">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-9 w-16 rounded-full" />
          ))}
        </div>
        <div className="space-y-1">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="flex items-center gap-4 py-4">
              <Skeleton className="h-12 w-12 rounded-lg" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-3 w-24" />
              </div>
              <Skeleton className="h-11 w-11 rounded-full" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="pb-28">
      {/* Header - Mimics Leaderboard */}
      <div className="px-4 pt-2 space-y-5">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Campus Parties</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Duke University</p>
        </div>

        {/* Filters */}
        <PartyFilters
          filters={filters}
          onFiltersChange={setFilters}
          fraternities={fraternities}
        />
      </div>

      {/* Divider */}
      <div className="mx-4 mt-6 border-t border-border" />

      {/* LIVE PARTIES */}
      {liveParties.length > 0 && (
        <div className="px-4">
          <div className="flex items-center gap-2 py-3">
            <Flame className="h-4 w-4 text-red-500" />
            <span className="text-sm font-semibold text-red-500">LIVE NOW</span>
            <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
          </div>
          {liveParties.map((party, index) => (
            <div key={party.id}>
              <PartyRow
                party={party}
                fraternityName={getFraternityName(party.fraternity_id)}
                isLive
                computedStatus="live"
                overallPartyQuality={partyScores.get(party.id)}
                ratingCount={partyRatingCounts.get(party.id) ?? 0}
              />
              {index < liveParties.length - 1 && (
                <div className="border-t border-border/50" />
              )}
            </div>
          ))}
          <div className="border-t border-border mt-2" />
        </div>
      )}

      {/* UPCOMING PARTIES */}
      {upcomingParties.length > 0 && (
        <div className="px-4">
          <div className="flex items-center gap-2 py-3">
            <Calendar className="h-4 w-4 text-primary" />
            <span className="text-sm font-semibold">Upcoming</span>
            <span className="text-xs text-muted-foreground">({upcomingParties.length})</span>
          </div>
          {upcomingParties.map((party, index) => (
            <div key={party.id}>
              <PartyRow
                party={party}
                fraternityName={getFraternityName(party.fraternity_id)}
                computedStatus="upcoming"
                overallPartyQuality={partyScores.get(party.id)}
                ratingCount={partyRatingCounts.get(party.id) ?? 0}
              />
              {index < upcomingParties.length - 1 && (
                <div className="border-t border-border/50" />
              )}
            </div>
          ))}
          <div className="border-t border-border mt-2" />
        </div>
      )}

      {/* COMPLETED PARTIES */}
      {completedParties.length > 0 && (
        <div className="px-4">
          <div className="flex items-center gap-2 py-3">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-semibold">Past Events</span>
            <span className="text-xs text-muted-foreground">({completedParties.length})</span>
          </div>
          {completedParties.map((party, index) => (
            <div key={party.id}>
              <PartyRow
                party={party}
                fraternityName={getFraternityName(party.fraternity_id)}
                computedStatus="completed"
                overallPartyQuality={partyScores.get(party.id)}
                ratingCount={partyRatingCounts.get(party.id) ?? 0}
              />
              {index < completedParties.length - 1 && (
                <div className="border-t border-border/50" />
              )}
            </div>
          ))}
        </div>
      )}

      {filteredParties.length === 0 && (
        <div className="px-4 py-12 text-center">
          <PartyPopper className="h-8 w-8 mx-auto text-muted-foreground/50 mb-3" />
          <p className="font-medium text-muted-foreground">No parties found</p>
          <p className="text-sm text-muted-foreground/70 mt-1">Try adjusting your filters</p>
        </div>
      )}

      {/* Floating Host Button */}
      {!(showIntro && !introShownThisVisit) && (
        <button
          onClick={() => setShowCreateSheet(true)}
          className="fixed bottom-24 right-4 z-50 flex items-center gap-2 px-5 py-3 rounded-full bg-foreground text-background shadow-lg active:scale-95 transition-transform hover:shadow-xl"
          style={{ marginBottom: 'env(safe-area-inset-bottom)' }}
        >
          <Plus className="h-5 w-5" />
          <span className="font-bold">Host</span>
        </button>
      )}

      {/* Create Party Sheet */}
      <CreatePartySheet 
        open={showCreateSheet} 
        onOpenChange={setShowCreateSheet}
        onSuccess={loadData}
      />

      {/* Intro Modal */}
      {showIntro && !introShownThisVisit && (
        <PartiesIntro 
          onComplete={(neverShowAgain) => {
            setIntroShownThisVisit(true);
            if (neverShowAgain) {
              localStorage.setItem('fratrank_parties_intro_never_show', 'true');
              setShowIntro(false);
            }
          }}
          onSubmitParty={() => {
            setIntroShownThisVisit(true);
            setShowCreateSheet(true);
          }}
        />
      )}
    </div>
  );
}