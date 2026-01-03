import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Calendar, ChevronRight, Star, Clock, PartyPopper, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { format, isToday, isTomorrow, isThisWeek, addDays, startOfDay, endOfDay } from 'date-fns';
import type { Party, Fraternity } from '@/lib/supabase-data';

interface PlanningWindowProps {
  parties: Party[];
  fraternities: Fraternity[];
}

interface TimeWindow {
  label: string;
  parties: Party[];
}

export default function PlanningWindow({ parties, fraternities }: PlanningWindowProps) {
  const timeWindows = useMemo(() => {
    const now = new Date();
    const windows: TimeWindow[] = [];
    
    // Filter to upcoming parties only
    const upcomingParties = parties
      .filter(p => new Date(p.starts_at) > now && p.status !== 'cancelled')
      .sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime());

    // Tonight (today after 5pm)
    const tonight = upcomingParties.filter(p => isToday(new Date(p.starts_at)));
    if (tonight.length > 0) {
      windows.push({ label: 'Tonight', parties: tonight.slice(0, 2) });
    }

    // Tomorrow
    const tomorrow = upcomingParties.filter(p => isTomorrow(new Date(p.starts_at)));
    if (tomorrow.length > 0) {
      windows.push({ label: 'Tomorrow', parties: tomorrow.slice(0, 2) });
    }

    // This Weekend (Fri-Sun, if not already covered)
    const friday = addDays(startOfDay(now), (5 - now.getDay() + 7) % 7 || 7);
    const sunday = endOfDay(addDays(friday, 2));
    const weekend = upcomingParties.filter(p => {
      const partyDate = new Date(p.starts_at);
      return partyDate >= friday && partyDate <= sunday && !isToday(partyDate) && !isTomorrow(partyDate);
    });
    if (weekend.length > 0) {
      windows.push({ label: 'This Weekend', parties: weekend.slice(0, 2) });
    }

    // Next Week (if we have few options above)
    if (windows.length < 2) {
      const nextWeek = upcomingParties.filter(p => {
        const partyDate = new Date(p.starts_at);
        return partyDate > sunday && partyDate <= addDays(now, 14);
      });
      if (nextWeek.length > 0) {
        windows.push({ label: 'Next Week', parties: nextWeek.slice(0, 2) });
      }
    }

    return windows;
  }, [parties]);

  if (timeWindows.length === 0) {
    return (
      <div className="rounded-2xl bg-card border p-6 text-center">
        <div className="w-14 h-14 mx-auto rounded-full bg-muted flex items-center justify-center mb-3">
          <Calendar className="h-7 w-7 text-muted-foreground" />
        </div>
        <p className="font-semibold text-foreground mb-1">No upcoming parties</p>
        <p className="text-sm text-muted-foreground">Check back later for new events</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Section Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-bold text-foreground uppercase tracking-wide">Planning Your Week</h3>
        </div>
        <Link to="/Parties" className="text-xs font-semibold text-primary hover:underline">
          View all
        </Link>
      </div>

      {/* Time Windows */}
      <div className="space-y-4">
        {timeWindows.map((window) => (
          <div key={window.label} className="space-y-2">
            {/* Window Label */}
            <div className="flex items-center gap-2">
              <Badge 
                variant="secondary" 
                className={cn(
                  "text-xs px-2.5 py-1 font-semibold",
                  window.label === 'Tonight' && "bg-primary/15 text-primary border-primary/30",
                  window.label === 'Tomorrow' && "bg-amber-500/15 text-amber-600 border-amber-500/30"
                )}
              >
                {window.label}
              </Badge>
              <span className="text-xs text-muted-foreground">{window.parties.length} {window.parties.length === 1 ? 'event' : 'events'}</span>
            </div>

            {/* Party Cards */}
            <div className="space-y-2">
              {window.parties.map((party) => {
                const frat = fraternities.find(f => f.id === party.fraternity_id);
                const fratScore = frat?.display_score || 0;
                const hasMomentum = frat?.momentum && frat.momentum > 0.1;
                const partyDate = new Date(party.starts_at);

                return (
                  <Link
                    key={party.id}
                    to={`/Party?id=${party.id}`}
                    className="block rounded-xl bg-card border hover:border-primary/50 transition-all overflow-hidden group"
                  >
                    <div className="flex items-stretch">
                      {/* Party Image */}
                      <div className="w-20 h-20 bg-primary/10 relative shrink-0">
                        {party.display_photo_url ? (
                          <img 
                            src={party.display_photo_url} 
                            alt={party.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center gradient-primary">
                            <PartyPopper className="h-6 w-6 text-white" />
                          </div>
                        )}
                        {hasMomentum && (
                          <div className="absolute top-1.5 left-1.5 w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center">
                            <TrendingUp className="h-3 w-3 text-white" />
                          </div>
                        )}
                      </div>

                      {/* Party Details */}
                      <div className="flex-1 p-3 flex flex-col justify-center min-w-0">
                        <p className="font-semibold text-sm truncate">{party.title}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xs text-muted-foreground truncate">{frat?.chapter}</span>
                          <span className="text-xs text-muted-foreground">·</span>
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {format(partyDate, 'h:mm a')}
                          </span>
                        </div>
                        {fratScore > 0 && (
                          <div className="flex items-center gap-1 mt-1.5">
                            {[...Array(5)].map((_, i) => (
                              <Star
                                key={i}
                                className={cn(
                                  "h-3 w-3",
                                  i < Math.floor(fratScore / 2) 
                                    ? "text-amber-400 fill-amber-400" 
                                    : "text-muted-foreground/30"
                                )}
                              />
                            ))}
                            <span className="text-xs font-semibold text-muted-foreground ml-1">{fratScore.toFixed(1)}</span>
                          </div>
                        )}
                      </div>

                      {/* Arrow */}
                      <div className="flex items-center pr-3">
                        <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
