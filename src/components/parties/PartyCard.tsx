import { Calendar, Clock, MapPin, Radio } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Link } from 'react-router-dom';
import { createPageUrl, getScoreColor } from '@/utils';
import { format } from 'date-fns';
import type { Party } from '@/api/base44Client';
import { getPartyConfidenceLevel } from '@/utils/scoring';
import partyPlaceholder from '@/assets/party-placeholder.jpg';

interface PartyCardProps {
  party: Party;
  fraternityName: string;
  isLive?: boolean;
  computedStatus?: 'live' | 'upcoming' | 'completed'; // Time-based status from parent
  overallPartyQuality?: number; // Canonical overall confidence-adjusted
  userPartyQuality?: number; // Optional personal score (only render when explicitly passed)
  ratingCount?: number; // Number of ratings for this party
}

export default function PartyCard({
  party,
  fraternityName,
  isLive = false,
  computedStatus,
  overallPartyQuality,
  userPartyQuality,
  ratingCount,
}: PartyCardProps) {
  const startDate = new Date(party.starts_at);
  // Use computedStatus if provided, otherwise fall back to stored status
  const isCompleted = computedStatus === 'completed' || party.status === 'completed';
  // Use ratingCount prop if provided, otherwise fall back to party.total_ratings
  const actualRatingCount = ratingCount ?? party.total_ratings ?? 0;
  // Only show score if party has at least 1 rating
  const hasScore = isCompleted && overallPartyQuality !== undefined && actualRatingCount > 0;

  return (
    <Link to={createPageUrl(`Party?id=${party.id}`)}>
      <Card className="glass overflow-hidden hover:shadow-lg transition-all hover:scale-[1.01] cursor-pointer">
        <div className="flex">
          {/* Image */}
          <div className="w-24 sm:w-32 flex-shrink-0">
            <img 
              src={party.display_photo_url || partyPlaceholder} 
              alt={party.title}
              className="w-full h-full object-cover"
            />
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
                ) : isCompleted ? 'Completed' : 'Upcoming'}
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

            {isCompleted && (() => {
              const confidence = getPartyConfidenceLevel(actualRatingCount);
              return (
                <div className="flex flex-col gap-0.5 pt-1">
                  {hasScore ? (
                    <div className="flex flex-col gap-0.5">
                      <div className="flex items-center gap-2">
                        <span className={`text-lg font-bold ${getScoreColor(overallPartyQuality)}`}>
                          {overallPartyQuality.toFixed(1)}
                        </span>
                        <span className="text-xs text-muted-foreground">Party Quality</span>
                      </div>
                      <p className={`text-xs ${
                        confidence.level === 'low' ? 'text-amber-600' : 
                        confidence.level === 'medium' ? 'text-blue-600' : 
                        'text-muted-foreground'
                      }`}>
                        {confidence.label}
                      </p>
                    </div>
                  ) : (
                    <Badge variant="outline" className="text-xs text-muted-foreground">
                      No ratings yet
                    </Badge>
                  )}

                  {userPartyQuality !== undefined && (
                    <div className="flex items-center gap-2">
                      <span className={`text-sm font-semibold ${getScoreColor(userPartyQuality)}`}>
                        {userPartyQuality.toFixed(1)}
                      </span>
                      <span className="text-xs text-muted-foreground">Your Score</span>
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        </div>
      </Card>
    </Link>
  );
}