import { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { ArrowLeft, Calendar, Clock, MapPin, Users, Star, Radio } from 'lucide-react';
import { base44, type Party, type Fraternity } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import PhotoBulletin from '@/components/photos/PhotoBulletin';
import RatingHistory from '@/components/party/RatingHistory';
import CommentSection from '@/components/party/CommentSection';
import PartyRatingForm from '@/components/rate/PartyRatingForm';
import { createPageUrl } from '@/utils';
import { format } from 'date-fns';

export default function PartyPage() {
  const [searchParams] = useSearchParams();
  const partyId = searchParams.get('id');
  
  const [party, setParty] = useState<Party | null>(null);
  const [fraternity, setFraternity] = useState<Fraternity | null>(null);
  const [loading, setLoading] = useState(true);
  const [showRatingForm, setShowRatingForm] = useState(false);

  useEffect(() => {
    if (partyId) loadParty();
  }, [partyId]);

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

  const isLive = () => {
    if (!party) return false;
    if (party.status === 'active') return true;
    const now = new Date();
    const start = new Date(party.starts_at);
    const end = party.ends_at ? new Date(party.ends_at) : new Date(start.getTime() + 5 * 60 * 60 * 1000);
    return now >= start && now <= end;
  };

  const handleRatingSubmit = () => {
    setShowRatingForm(false);
    loadParty();
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
            <Badge variant={party.status === 'completed' ? 'secondary' : 'outline'}>
              {party.status}
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

          {party.performance_score > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Performance:</span>
              <span className="text-2xl font-bold gradient-text">
                {party.performance_score.toFixed(1)}
              </span>
            </div>
          )}

          <Button 
            onClick={() => setShowRatingForm(true)}
            className="w-full gradient-primary text-white"
          >
            <Star className="h-4 w-4 mr-2" />
            Rate This Party
          </Button>
        </div>
      </Card>

      {/* Photos */}
      <PhotoBulletin partyId={party.id} />

      {/* Ratings */}
      <RatingHistory partyId={party.id} />

      {/* Comments */}
      <CommentSection partyId={party.id} />

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
