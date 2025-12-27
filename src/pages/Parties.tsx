import { useState, useEffect } from 'react';
import { PartyPopper } from 'lucide-react';
import { base44, seedInitialData, type Party, type Fraternity } from '@/api/base44Client';
import PartyCard from '@/components/parties/PartyCard';
import PartyFilters from '@/components/parties/PartyFilters';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';

interface Filters {
  fraternity: string;
  theme: string;
  timeframe: string;
}

export default function Parties() {
  const [parties, setParties] = useState<Party[]>([]);
  const [fraternities, setFraternities] = useState<Fraternity[]>([]);
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
    await Promise.all([loadParties(), loadFraternities()]);
    setLoading(false);
  };

  const loadParties = async () => {
    try {
      const data = await base44.entities.Party.list('starts_at');
      setParties(data);
    } catch (error) {
      console.error('Failed to load parties:', error);
    }
  };

  const loadFraternities = async () => {
    try {
      const data = await base44.entities.Fraternity.list();
      setFraternities(data);
    } catch (error) {
      console.error('Failed to load fraternities:', error);
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

      // Timeframe filter
      if (filters.timeframe !== 'all') {
        const partyDate = new Date(party.starts_at);
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const weekFromNow = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
        const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

        switch (filters.timeframe) {
          case 'today':
            const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);
            if (partyDate < today || partyDate >= tomorrow) return false;
            break;
          case 'week':
            if (partyDate < today || partyDate > weekFromNow) return false;
            break;
          case 'month':
            if (partyDate < today || partyDate > monthEnd) return false;
            break;
        }
      }

      return true;
    });
  };

  const filteredParties = filterParties(parties);
  const liveParties = filteredParties.filter(p => isLive(p));
  const upcomingParties = filteredParties.filter(p => !isLive(p) && p.status === 'upcoming');
  const completedParties = filteredParties.filter(p => p.status === 'completed');

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
