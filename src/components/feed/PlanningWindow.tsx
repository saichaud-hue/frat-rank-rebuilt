import { useState, useEffect, useMemo } from 'react';
import { Calendar, Clock, Star, Users, ChevronRight, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { partyQueries, fraternityQueries, partyRatingQueries } from '@/lib/supabase-data';
import { format, isToday, isTomorrow, isThisWeek, addDays, isBefore, isAfter, startOfDay } from 'date-fns';
import { useNavigate } from 'react-router-dom';

interface Party {
  id: string;
  title: string;
  fraternity_name: string;
  fraternity_id: string;
  starts_at: Date;
  theme?: string;
  rating_count: number;
  avg_score: number;
}

interface TimeWindow {
  label: string;
  sublabel?: string;
  parties: Party[];
}

export default function PlanningWindow() {
  const navigate = useNavigate();
  const [parties, setParties] = useState<Party[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadParties();
  }, []);

  const loadParties = async () => {
    try {
      const [allParties, frats, ratings] = await Promise.all([
        partyQueries.list(),
        fraternityQueries.listActive(),
        partyRatingQueries.list(),
      ]);

      const fratMap = new Map(frats.map(f => [f.id, f.name]));
      
      // Calculate ratings per party
      const ratingsByParty = new Map<string, { count: number; sum: number }>();
      ratings.forEach(r => {
        const existing = ratingsByParty.get(r.party_id) || { count: 0, sum: 0 };
        const score = r.party_quality_score || r.vibe_score || 5;
        ratingsByParty.set(r.party_id, {
          count: existing.count + 1,
          sum: existing.sum + score,
        });
      });

      const now = new Date();
      const upcoming = allParties
        .filter(p => p.starts_at && new Date(p.starts_at) >= startOfDay(now))
        .map(p => {
          const partyRatings = ratingsByParty.get(p.id);
          return {
            id: p.id,
            title: p.title,
            fraternity_name: fratMap.get(p.fraternity_id || '') || 'TBA',
            fraternity_id: p.fraternity_id || '',
            starts_at: new Date(p.starts_at!),
            theme: p.theme || undefined,
            rating_count: partyRatings?.count || 0,
            avg_score: partyRatings ? partyRatings.sum / partyRatings.count : 0,
          };
        })
        .sort((a, b) => a.starts_at.getTime() - b.starts_at.getTime());

      setParties(upcoming);
    } catch (error) {
      console.error('Failed to load parties:', error);
    } finally {
      setLoading(false);
    }
  };

  const timeWindows = useMemo<TimeWindow[]>(() => {
    const now = new Date();
    const weekendStart = addDays(startOfDay(now), (6 - now.getDay()) % 7);
    const weekendEnd = addDays(weekendStart, 2);

    const windows: TimeWindow[] = [];

    // Tonight
    const tonightParties = parties.filter(p => isToday(p.starts_at));
    if (tonightParties.length > 0 || parties.length === 0) {
      windows.push({
        label: 'Tonight',
        sublabel: format(now, 'EEEE'),
        parties: tonightParties.slice(0, 2),
      });
    }

    // Tomorrow
    const tomorrowParties = parties.filter(p => isTomorrow(p.starts_at));
    if (tomorrowParties.length > 0) {
      windows.push({
        label: 'Tomorrow',
        sublabel: format(addDays(now, 1), 'EEEE'),
        parties: tomorrowParties.slice(0, 2),
      });
    }

    // This Weekend (if not already covered)
    const weekendParties = parties.filter(p => 
      isAfter(p.starts_at, weekendStart) && 
      isBefore(p.starts_at, weekendEnd) &&
      !isToday(p.starts_at) && 
      !isTomorrow(p.starts_at)
    );
    if (weekendParties.length > 0) {
      windows.push({
        label: 'This Weekend',
        sublabel: `${format(weekendStart, 'MMM d')} - ${format(addDays(weekendStart, 1), 'd')}`,
        parties: weekendParties.slice(0, 2),
      });
    }

    // Next Week
    const nextWeekParties = parties.filter(p => 
      isAfter(p.starts_at, weekendEnd) &&
      isBefore(p.starts_at, addDays(now, 10))
    );
    if (nextWeekParties.length > 0) {
      windows.push({
        label: 'Coming Up',
        sublabel: 'Next 7 days',
        parties: nextWeekParties.slice(0, 2),
      });
    }

    return windows;
  }, [parties]);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-6 bg-muted rounded w-32 animate-pulse" />
        {[1, 2].map(i => (
          <div key={i} className="bg-card rounded-2xl p-4 animate-pulse">
            <div className="h-4 bg-muted rounded w-24 mb-3" />
            <div className="space-y-3">
              <div className="h-16 bg-muted rounded-xl" />
              <div className="h-16 bg-muted rounded-xl" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-primary" />
          <h2 className="text-base font-bold text-foreground">Planning Window</h2>
        </div>
        <button 
          onClick={() => navigate('/Parties')}
          className="text-xs text-primary font-medium flex items-center gap-0.5 hover:underline"
        >
          See all <ChevronRight className="h-3 w-3" />
        </button>
      </div>

      {timeWindows.length === 0 ? (
        <div className="bg-card rounded-2xl p-6 text-center">
          <div className="w-12 h-12 mx-auto rounded-xl bg-muted flex items-center justify-center mb-3">
            <Sparkles className="h-6 w-6 text-muted-foreground" />
          </div>
          <p className="text-sm font-medium text-foreground mb-1">Nothing planned yet</p>
          <p className="text-xs text-muted-foreground">Check back soon for upcoming events</p>
        </div>
      ) : (
        <div className="space-y-3">
          {timeWindows.map((window, idx) => (
            <div key={window.label} className="bg-card rounded-2xl p-4 shadow-duke">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="text-sm font-bold text-foreground">{window.label}</h3>
                  {window.sublabel && (
                    <p className="text-xs text-muted-foreground">{window.sublabel}</p>
                  )}
                </div>
                {window.parties.length > 0 && (
                  <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                    {window.parties.length} event{window.parties.length !== 1 ? 's' : ''}
                  </span>
                )}
              </div>

              {window.parties.length === 0 ? (
                <div className="py-4 text-center text-xs text-muted-foreground">
                  No events scheduled
                </div>
              ) : (
                <div className="space-y-2">
                  {window.parties.map(party => (
                    <button
                      key={party.id}
                      onClick={() => navigate(`/Party?id=${party.id}`)}
                      className={cn(
                        "w-full flex items-center gap-3 p-3 rounded-xl transition-all",
                        "bg-background border border-border hover:border-primary/50 active:scale-[0.98]"
                      )}
                    >
                      <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center shrink-0">
                        <span className="text-lg">🎉</span>
                      </div>
                      <div className="flex-1 min-w-0 text-left">
                        <p className="text-sm font-semibold text-foreground truncate">{party.title}</p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span className="truncate">{party.fraternity_name}</span>
                          <span>•</span>
                          <span className="flex items-center gap-0.5">
                            <Clock className="h-3 w-3" />
                            {format(party.starts_at, 'h:mm a')}
                          </span>
                        </div>
                      </div>
                      {party.rating_count > 0 && (
                        <div className="flex items-center gap-1 shrink-0">
                          <Star className="h-3 w-3 text-amber-500 fill-amber-500" />
                          <span className="text-xs font-bold text-foreground">
                            {party.avg_score.toFixed(1)}
                          </span>
                        </div>
                      )}
                      <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
