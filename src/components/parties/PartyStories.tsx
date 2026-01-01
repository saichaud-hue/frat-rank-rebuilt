import { Link } from 'react-router-dom';
import { PartyPopper } from 'lucide-react';
import { createPageUrl, getFratShorthand } from '@/utils';
import { format } from 'date-fns';
import type { Party, Fraternity } from '@/api/base44Client';
import { cn } from '@/lib/utils';

interface PartyStoriesProps {
  parties: Party[];
  fraternities: Fraternity[];
  className?: string;
}

export default function PartyStories({ parties, fraternities, className }: PartyStoriesProps) {
  const getFraternityName = (id: string) => {
    const frat = fraternities.find(f => f.id === id);
    return frat ? frat.chapter : 'Unknown';
  };

  const getFraternityChapter = (id: string) => {
    const frat = fraternities.find(f => f.id === id);
    return frat ? frat.chapter || getFratShorthand(frat.name) : '?';
  };

  // Only show parties with cover photos, prioritize upcoming/live
  const storiesParties = parties
    .filter(p => p.display_photo_url)
    .slice(0, 10);

  if (storiesParties.length === 0) return null;

  return (
    <div className={cn("", className)}>
      <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar px-1">
        {storiesParties.map((party) => {
          const startDate = new Date(party.starts_at);
          const dayOfWeek = format(startDate, 'EEE');
          const fratName = getFraternityName(party.fraternity_id);
          
          return (
            <Link
              key={party.id}
              to={createPageUrl(`Party?id=${party.id}`)}
              className="flex-shrink-0 group"
            >
              <div className="relative w-[72px] flex flex-col items-center">
                {/* Story Ring */}
                <div className="relative">
                  <div className="w-16 h-16 rounded-2xl p-[2px] bg-gradient-to-br from-primary via-pink-500 to-amber-500">
                    <div className="w-full h-full rounded-[14px] overflow-hidden bg-background">
                      {party.display_photo_url ? (
                        <img 
                          src={party.display_photo_url} 
                          alt={party.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-muted">
                          <PartyPopper className="h-6 w-6 text-muted-foreground" />
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Day Badge */}
                  <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold shadow-md">
                    {dayOfWeek}
                  </div>
                </div>
                
                {/* Frat Name */}
                <p className="mt-2.5 text-xs font-medium text-center truncate w-full">
                  {getFraternityChapter(party.fraternity_id)}
                </p>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}