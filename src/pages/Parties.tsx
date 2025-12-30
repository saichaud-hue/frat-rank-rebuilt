import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { PartyPopper, Plus, Flame, Calendar, Trophy, Sparkles, TrendingUp, Clock } from 'lucide-react';
import { base44, seedInitialData, type Party, type Fraternity, type PartyRating } from '@/api/base44Client';
import PartyCard from '@/components/parties/PartyCard';
import PartyFilters from '@/components/parties/PartyFilters';
import PartiesIntro from '@/components/onboarding/PartiesIntro';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
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

      // Compute per-party RAW quality Q_p for display (no baseline blending)
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

      // Type filter
      if (filters.type !== 'all' && party.theme?.toLowerCase() !== filters.type.toLowerCase()) {
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

  // Stats
  const totalRatings = Array.from(partyRatingCounts.values()).reduce((a, b) => a + b, 0);
  const avgScore = partyScores.size > 0 
    ? Array.from(partyScores.values()).reduce((a, b) => a + b, 0) / partyScores.size 
    : 0;

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <Skeleton className="h-48 w-full rounded-3xl" />
        <Skeleton className="h-10 w-full rounded-lg" />
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-32 rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-5 pb-20">
      {/* HERO HEADER */}
      <div className="relative overflow-hidden rounded-3xl gradient-primary p-6 text-primary-foreground shadow-xl">
        {/* Background Effects */}
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-0 right-0 w-40 h-40 bg-white/30 rounded-full blur-3xl translate-x-10 -translate-y-10" />
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/30 rounded-full blur-3xl -translate-x-10 translate-y-10" />
        </div>
        
        <div className="relative">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
              <PartyPopper className="h-7 w-7" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Campus Parties</h1>
              <p className="text-primary-foreground/80 text-sm">Discover and rate the best events</p>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-3 gap-3 mt-4">
            <div className="text-center p-3 rounded-xl bg-white/10 backdrop-blur-sm">
              <Sparkles className="h-5 w-5 mx-auto mb-1 opacity-80" />
              <p className="text-2xl font-bold">{parties.length}</p>
              <p className="text-xs opacity-80">Total Events</p>
            </div>
            <div className="text-center p-3 rounded-xl bg-white/10 backdrop-blur-sm">
              <TrendingUp className="h-5 w-5 mx-auto mb-1 opacity-80" />
              <p className="text-2xl font-bold">{totalRatings}</p>
              <p className="text-xs opacity-80">Ratings</p>
            </div>
            <div className="text-center p-3 rounded-xl bg-white/10 backdrop-blur-sm">
              <Trophy className="h-5 w-5 mx-auto mb-1 opacity-80" />
              <p className="text-2xl font-bold">{avgScore > 0 ? avgScore.toFixed(1) : '—'}</p>
              <p className="text-xs opacity-80">Avg Score</p>
            </div>
          </div>
        </div>
      </div>

      {/* FILTERS - Styled Card */}
      <Card className="bg-card border-border p-4">
        <PartyFilters
          filters={filters}
          onFiltersChange={setFilters}
          fraternities={fraternities}
        />
      </Card>

      {/* LIVE PARTIES - Urgent Section */}
      {liveParties.length > 0 && (
        <Card className="bg-card border-border overflow-hidden">
          <div className="gradient-primary p-4 flex items-center justify-between text-primary-foreground">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center animate-pulse">
                <Flame className="h-5 w-5" />
              </div>
              <div>
                <h2 className="font-semibold flex items-center gap-2">
                  LIVE NOW
                  <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
                </h2>
                <p className="text-xs opacity-80">Happening right now!</p>
              </div>
            </div>
            <Badge className="bg-white/20 text-primary-foreground border-white/30 animate-pulse">
              🔥 Don't miss out!
            </Badge>
          </div>
          <div className="p-4 space-y-3 bg-card">
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
          </div>
        </Card>
      )}

      {/* UPCOMING PARTIES */}
      {upcomingParties.length > 0 && (
        <Card className="bg-card border-border overflow-hidden">
          <div className="gradient-secondary p-4 flex items-center justify-between text-primary-foreground">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                <Calendar className="h-5 w-5" />
              </div>
              <div>
                <h2 className="font-semibold">Upcoming Events</h2>
                <p className="text-xs opacity-80">{upcomingParties.length} {upcomingParties.length === 1 ? 'party' : 'parties'} scheduled</p>
              </div>
            </div>
            <Badge className="bg-white/20 text-primary-foreground border-white/30">
              📅 Mark your calendar
            </Badge>
          </div>
          <div className="p-4 space-y-3 bg-card">
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
          </div>
        </Card>
      )}

      {/* COMPLETED/PAST PARTIES */}
      {completedParties.length > 0 && (
        <Card className="bg-card border-border overflow-hidden">
          <div className="bg-secondary p-4 flex items-center justify-between text-secondary-foreground">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                <Clock className="h-5 w-5" />
              </div>
              <div>
                <h2 className="font-semibold">Party History</h2>
                <p className="text-xs opacity-80">{completedParties.length} completed {completedParties.length === 1 ? 'event' : 'events'}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-lg font-bold">{partyScores.size}</p>
              <p className="text-xs opacity-80">Rated</p>
            </div>
          </div>
          <div className="p-4 space-y-3 bg-card">
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
          </div>
        </Card>
      )}

      {filteredParties.length === 0 && (
        <Card className="bg-card border-border p-8 text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-muted flex items-center justify-center">
            <PartyPopper className="h-8 w-8 text-muted-foreground/50" />
          </div>
          <p className="font-medium text-muted-foreground">No parties found</p>
          <p className="text-sm text-muted-foreground/70 mt-1">Try adjusting your filters</p>
        </Card>
      )}

      {/* Floating Host Button */}
      {!showIntro && (
        <Link
          to="/CreateParty"
          className="fixed bottom-24 right-4 z-50 flex items-center gap-2 px-5 py-3 rounded-full gradient-primary text-primary-foreground shadow-lg active:scale-95 transition-transform"
          style={{ marginBottom: 'env(safe-area-inset-bottom)' }}
        >
          <Plus className="h-5 w-5" />
          <span className="font-semibold">Host</span>
        </Link>
      )}

      {/* Intro Modal */}
      {showIntro && (
        <PartiesIntro 
          onComplete={(neverShowAgain) => {
            if (neverShowAgain) {
              localStorage.setItem('fratrank_parties_intro_never_show', 'true');
            }
            setShowIntro(false);
          }} 
        />
      )}
    </div>
  );
}