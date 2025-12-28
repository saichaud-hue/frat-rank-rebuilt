import { Calendar, Clock, MapPin, Camera, Music, Zap, Settings, Radio } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Link } from 'react-router-dom';
import { createPageUrl, getScoreColor } from '@/utils';
import { format } from 'date-fns';
import type { Party } from '@/api/base44Client';

interface PartyCardProps {
  party: Party;
  fraternityName: string;
  isLive?: boolean;
  overallPartyQuality?: number; // Confidence-adjusted overall party quality from fraternity
}

export default function PartyCard({ party, fraternityName, isLive = false, overallPartyQuality }: PartyCardProps) {
  const startDate = new Date(party.starts_at);
  const isCompleted = party.status === 'completed';
  // Use overallPartyQuality (confidence-adjusted) if provided, otherwise fall back to party's own score
  const displayScore = overallPartyQuality ?? party.performance_score ?? 0;

  return (
    <Link to={createPageUrl(`Party?id=${party.id}`)}>
      <Card className="glass overflow-hidden hover:shadow-lg transition-all hover:scale-[1.01] cursor-pointer">
        <div className="flex">
          {/* Image */}
          <div className="w-24 sm:w-32 flex-shrink-0 bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center">
            {party.display_photo_url ? (
              <img 
                src={party.display_photo_url} 
                alt={party.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <Camera className="h-8 w-8 text-muted-foreground/50" />
            )}
          </div>

          {/* Content */}
          <div className="flex-1 p-3 sm:p-4 space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <h3 className="font-bold text-base sm:text-lg truncate">{party.title}</h3>
                <p className="text-sm text-muted-foreground truncate">{fraternityName}</p>
              </div>
              <Badge 
                variant={isLive ? 'default' : isCompleted ? 'secondary' : 'outline'}
                className={isLive ? 'bg-red-500 text-white animate-pulse-subtle' : ''}
              >
                {isLive ? (
                  <span className="flex items-center gap-1">
                    <Radio className="h-3 w-3" />
                    LIVE
                  </span>
                ) : party.status === 'completed' ? 'Completed' : 'Upcoming'}
              </Badge>
            </div>

            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs sm:text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" />
                {format(startDate, 'MMM d')}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" />
                {format(startDate, 'h:mm a')}
              </span>
              {party.venue && (
                <span className="flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5" />
                  {party.venue}
                </span>
              )}
            </div>

            {party.theme && (
              <Badge variant="outline" className="capitalize text-xs">
                {party.theme}
              </Badge>
            )}

            {isCompleted && (party.total_ratings > 0 || overallPartyQuality !== undefined) && (
              <div className="flex items-center gap-2 pt-1">
                <span className={`text-lg font-bold ${getScoreColor(displayScore)}`}>
                  {displayScore.toFixed(1)}
                </span>
                <span className="text-xs text-muted-foreground">Overall Party Quality</span>
              </div>
            )}

            <p className="text-xs text-muted-foreground">
              {party.total_ratings} {party.total_ratings === 1 ? 'rating' : 'ratings'}
            </p>
          </div>
        </div>
      </Card>
    </Link>
  );
}