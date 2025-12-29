import { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { ArrowLeft, Calendar, Clock, MapPin, Users, Star, Radio } from 'lucide-react';
import { base44, type Party, type Fraternity, type PartyRating } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import PhotoBulletin from '@/components/photos/PhotoBulletin';
import RatingHistory from '@/components/party/RatingHistory';
import CommentSection from '@/components/comments/CommentSection';
import PartyRatingForm from '@/components/rate/PartyRatingForm';
import { createPageUrl, getScoreBgColor } from '@/utils';
import { format } from 'date-fns';
import { computeRawPartyQuality, getPartyConfidenceLevel } from '@/utils/scoring';
import { ensureAuthed } from '@/utils/auth';

export default function PartyPage() {
  const [searchParams] = useSearchParams();
  const partyId = searchParams.get('id');
  
  const [party, setParty] = useState<Party | null>(null);
  const [fraternity, setFraternity] = useState<Fraternity | null>(null);
  const [loading, setLoading] = useState(true);
  const [showRatingForm, setShowRatingForm] = useState(false);
  const [ratingsRefreshKey, setRatingsRefreshKey] = useState(0);
  const [partyRatings, setPartyRatings] = useState<PartyRating[]>([]);

  useEffect(() => {
    if (partyId) {
      loadParty();
      loadPartyRatings();
    }
  }, [partyId]);

  // Reload ratings when refreshKey changes
  useEffect(() => {
    if (partyId && ratingsRefreshKey > 0) {
      loadPartyRatings();
    }
  }, [ratingsRefreshKey]);

  const loadPartyRatings = async () => {
    try {
      const ratings = await base44.entities.PartyRating.filter({ party_id: partyId! });
      setPartyRatings(ratings);
    } catch (error) {
      console.error('Failed to load party ratings:', error);
    }
  };

  const loadParty = async () => {
    try {
      const partyData = await base44.entities.Party.get(partyId!);
      setParty(partyData);

      if (partyData?.fraternity_id) {
        const fratData = await base44.entities.Fraternity.get(partyData.fraternity_id);
        setFraternity(fratData);
      }
    } catch (error) {
      console.error('Failed to load party:', error);
    } finally {
      setLoading(false);
    }
  };

  // Determine party status based on current time, not stored status
  const getPartyStatus = (): 'live' | 'upcoming' | 'completed' => {
    if (!party) return 'upcoming';
    const now = new Date();
    const start = new Date(party.starts_at);
    const end = party.ends_at ? new Date(party.ends_at) : new Date(start.getTime() + 5 * 60 * 60 * 1000);
    
    if (now >= start && now <= end) return 'live';
    if (now < start) return 'upcoming';
    return 'completed';
  };

  const isLive = () => getPartyStatus() === 'live';
  
  // Can only rate past parties (completed based on time)
  const canRate = () => getPartyStatus() === 'completed';

  const handleRatingSubmit = () => {
    setShowRatingForm(false);
    loadParty();
    setRatingsRefreshKey((k) => k + 1);
  };

  const handleRateClick = async () => {
    const user = await ensureAuthed();
    if (!user) return;
    setShowRatingForm(true);
  };

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <Skeleton className="h-10 w-32" />
        <Skeleton className="h-48 rounded-xl" />
        <Skeleton className="h-64 rounded-xl" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  if (!party) {
    return (
      <div className="max-w-2xl mx-auto text-center py-12">
        <p className="text-muted-foreground">Party not found</p>
        <Button asChild variant="link" className="mt-4">
          <Link to={createPageUrl('Parties')}>Back to Parties</Link>
        </Button>
      </div>
    );
  }

  const startDate = new Date(party.starts_at);

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Back Button */}
      <Button asChild variant="ghost" className="px-0">
        <Link to={createPageUrl('Parties')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Parties
        </Link>
      </Button>

      {/* Party Header */}
      <Card className="glass overflow-hidden">
        {party.display_photo_url && (
          <div className="aspect-video relative">
            <img 
              src={party.display_photo_url} 
              alt={party.title}
              className="w-full h-full object-cover"
            />
            {isLive() && (
              <Badge className="absolute top-4 left-4 bg-red-500 text-white animate-pulse-subtle">
                <Radio className="h-3 w-3 mr-1" />
                LIVE NOW
              </Badge>
            )}
          </div>
        )}
        
        <div className="p-4 space-y-4">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-bold">{party.title}</h1>
              {fraternity && (
                <Link 
                  to={createPageUrl(`Fraternity?id=${fraternity.id}`)}
                  className="text-muted-foreground hover:text-primary transition-colors"
                >
                  {fraternity.name} • {fraternity.chapter}
                </Link>
              )}
            </div>
            <Badge variant={getPartyStatus() === 'completed' ? 'secondary' : 'outline'}>
              {getPartyStatus()}
            </Badge>
          </div>

          <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              {format(startDate, 'EEEE, MMM d, yyyy')}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              {format(startDate, 'h:mm a')}
            </span>
            {party.venue && (
              <span className="flex items-center gap-1">
                <MapPin className="h-4 w-4" />
                {party.venue}
              </span>
            )}
            <span className="flex items-center gap-1">
              <Users className="h-4 w-4" />
              {party.total_ratings} ratings
            </span>
          </div>

          {party.theme && (
            <Badge variant="outline" className="capitalize">
              {party.theme}
            </Badge>
          )}

          {/* Party Quality Display - shows raw aggregate with confidence */}
          {(() => {
            const partyQuality = computeRawPartyQuality(partyRatings);
            const confidence = getPartyConfidenceLevel(partyRatings.length);
            
            if (partyQuality === null) return null;
            
            return (
              <div className="bg-muted/50 rounded-lg p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Party Quality</span>
                  <Badge className={`${getScoreBgColor(partyQuality)} text-white text-lg px-3`}>
                    {partyQuality.toFixed(1)}
                  </Badge>
                </div>
                <div className="space-y-1">
                  <Progress value={confidence.percentage} className="h-1.5" />
                  <p className="text-xs text-muted-foreground">{confidence.label}</p>
                </div>
              </div>
            );
          })()}

          {canRate() ? (
            <Button 
              onClick={handleRateClick}
              className="w-full gradient-primary text-white"
            >
              <Star className="h-4 w-4 mr-2" />
              Rate This Party
            </Button>
          ) : (
            <div className="text-sm text-muted-foreground text-center py-2 border border-dashed rounded-lg">
              {isLive() ? 'Rating opens after the party ends' : 'Ratings open after the party'}
            </div>
          )}
        </div>
      </Card>

      {/* Photos */}
      <PhotoBulletin partyId={party.id} />

      {/* Ratings */}
      <RatingHistory partyId={party.id} refreshKey={ratingsRefreshKey} />

      {/* Comments */}
      <CommentSection entityId={party.id} entityType="party" />

      {/* Rating Form Modal */}
      {showRatingForm && (
        <PartyRatingForm
          party={party}
          fraternity={fraternity || undefined}
          onClose={() => setShowRatingForm(false)}
          onSubmit={handleRatingSubmit}
        />
      )}
    </div>
  );
}
