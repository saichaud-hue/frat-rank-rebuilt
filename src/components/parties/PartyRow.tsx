import { Link } from 'react-router-dom';
import { createPageUrl, getScoreColor } from '@/utils';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { Radio, Camera } from 'lucide-react';
import type { Party } from '@/api/base44Client';
import { getPartyConfidenceLevel } from '@/utils/scoring';

interface PartyRowProps {
  party: Party;
  fraternityName: string;
  isLive?: boolean;
  computedStatus?: 'live' | 'upcoming' | 'completed';
  overallPartyQuality?: number;
  ratingCount?: number;
}

export default function PartyRow({
  party,
  fraternityName,
  isLive = false,
  computedStatus,
  overallPartyQuality,
  ratingCount,
}: PartyRowProps) {
  const startDate = new Date(party.starts_at);
  const isCompleted = computedStatus === 'completed' || party.status === 'completed';
  const actualRatingCount = ratingCount ?? party.total_ratings ?? 0;
  const hasScore = isCompleted && overallPartyQuality !== undefined && actualRatingCount > 0;

  const getScoreColorClass = (score: number | null): string => {
    if (score === null) return 'text-muted-foreground border-muted';
    if (score >= 8.5) return 'text-emerald-600 border-emerald-200 bg-emerald-50 dark:bg-emerald-950/30';
    if (score >= 7) return 'text-primary border-primary/20 bg-primary/5';
    if (score >= 5) return 'text-amber-600 border-amber-200 bg-amber-50 dark:bg-amber-950/30';
    return 'text-muted-foreground border-muted bg-muted/50';
  };

  return (
    <Link 
      to={createPageUrl(`Party?id=${party.id}`)}
      className="block"
    >
      <div className="flex items-center gap-3 py-3 px-1 active:bg-muted/30 transition-colors">
        {/* Image */}
        <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center overflow-hidden shrink-0">
          {party.display_photo_url ? (
            <img 
              src={party.display_photo_url} 
              alt={party.title}
              className="w-full h-full object-cover"
            />
          ) : (
            <Camera className="h-5 w-5 text-muted-foreground/50" />
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-sm text-foreground leading-tight truncate">
              {party.title}
            </h3>
            {isLive && (
              <span className="flex items-center gap-1 text-[10px] font-medium text-red-500 animate-pulse">
                <Radio className="h-2.5 w-2.5" />
                LIVE
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5 truncate">
            {fraternityName} • {format(startDate, 'MMM d, h:mm a')}
          </p>
          {isCompleted && !hasScore && (
            <p className="text-[10px] text-muted-foreground/70 mt-0.5">No ratings yet</p>
          )}
          {hasScore && (
            <p className={cn(
              "text-[10px] mt-0.5",
              getPartyConfidenceLevel(actualRatingCount).level === 'low' ? 'text-amber-600' : 
              getPartyConfidenceLevel(actualRatingCount).level === 'medium' ? 'text-blue-600' : 
              'text-muted-foreground'
            )}>
              {getPartyConfidenceLevel(actualRatingCount).label}
            </p>
          )}
        </div>

        {/* Score Badge or Status */}
        {hasScore ? (
          <div className={cn(
            "flex items-center justify-center w-11 h-11 rounded-full border-2 font-bold text-sm",
            getScoreColorClass(overallPartyQuality ?? null)
          )}>
            {overallPartyQuality?.toFixed(1)}
          </div>
        ) : (
          <span className={cn(
            "text-[10px] font-medium px-2 py-1 rounded-full",
            isLive ? "bg-red-500/10 text-red-500" :
            computedStatus === 'upcoming' ? "bg-primary/10 text-primary" :
            "bg-muted text-muted-foreground"
          )}>
            {isLive ? 'Live' : computedStatus === 'upcoming' ? 'Soon' : 'Past'}
          </span>
        )}
      </div>
    </Link>
  );
}
