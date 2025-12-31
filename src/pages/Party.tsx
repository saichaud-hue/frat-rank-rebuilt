import { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { ArrowLeft, Calendar, Clock, MapPin, Users, Star, Radio, Camera, MessageCircle, Trophy, Sparkles, TrendingUp, Zap } from 'lucide-react';
import { base44, type Party, type Fraternity, type PartyRating } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import PhotoBulletin from '@/components/photos/PhotoBulletin';
import RatingHistory from '@/components/party/RatingHistory';
import CommentSection from '@/components/comments/CommentSection';
import PartyRatingForm from '@/components/rate/PartyRatingForm';
import { createPageUrl, getScoreColor, getFratShorthand } from '@/utils';
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
        <Skeleton className="h-64 rounded-3xl" />
        <Skeleton className="h-48 rounded-xl" />
        <Skeleton className="h-48 rounded-xl" />
      </div>
    );
  }

  if (!party) {
    return (
      <div className="max-w-2xl mx-auto text-center py-12">
        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-muted flex items-center justify-center">
          <Star className="h-8 w-8 text-muted-foreground/50" />
        </div>
        <p className="text-muted-foreground font-medium">Party not found</p>
        <Button asChild variant="link" className="mt-4">
          <Link to={createPageUrl('Parties')}>Back to Parties</Link>
        </Button>
      </div>
    );
  }

  const startDate = new Date(party.starts_at);
  const partyQuality = computeRawPartyQuality(partyRatings);
  const confidence = getPartyConfidenceLevel(partyRatings.length);
  const status = getPartyStatus();

  // Status styling
  const statusConfig = {
    live: { gradient: 'from-red-500 to-orange-500', badge: 'bg-red-500', text: 'LIVE NOW', icon: Radio },
    upcoming: { gradient: 'from-emerald-500 to-teal-500', badge: 'bg-emerald-500', text: 'UPCOMING', icon: Calendar },
    completed: { gradient: 'from-violet-600 to-purple-600', badge: 'bg-violet-600', text: 'COMPLETED', icon: Trophy },
  };
  const config = statusConfig[status];

  return (
    <div className="max-w-2xl mx-auto space-y-5 pb-20">
      {/* Back Button */}
      <Button asChild variant="ghost" className="px-0 -mb-2">
        <Link to={createPageUrl('Parties')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Parties
        </Link>
      </Button>

      {/* HERO SECTION */}
      <div className={`relative overflow-hidden rounded-3xl bg-gradient-to-br ${config.gradient} p-6 text-white shadow-xl`}>
        {/* Background Effects */}
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-0 right-0 w-40 h-40 bg-white/30 rounded-full blur-3xl translate-x-10 -translate-y-10" />
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/30 rounded-full blur-3xl -translate-x-10 translate-y-10" />
        </div>

        {/* Status Badge */}
        <div className="relative flex justify-between items-start mb-4">
          <Badge className={`${config.badge} text-white border-0 px-3 py-1 ${status === 'live' ? 'animate-pulse' : ''}`}>
            <config.icon className="h-3 w-3 mr-1" />
            {config.text}
          </Badge>
          {party.theme && (
            <Badge className="bg-white/20 text-white border-white/30 capitalize">
              {party.theme}
            </Badge>
          )}
        </div>

        {/* Party Info */}
        <div className="relative">
          <h1 className="text-2xl font-bold mb-2">{party.title}</h1>
          {fraternity && (
            <Link 
              to={createPageUrl(`Fraternity?id=${fraternity.id}`)}
              className="inline-flex items-center gap-2 text-white/90 hover:text-white transition-colors"
            >
              <span className="px-2 py-0.5 rounded-full bg-white/20 text-sm font-medium">
                {getFratShorthand(fraternity.name)}
              </span>
              <span className="text-sm">{fraternity.name}</span>
            </Link>
          )}
        </div>

        {/* Event Details */}
        <div className="relative flex flex-wrap gap-3 mt-4 text-sm text-white/90">
          <span className="flex items-center gap-1.5 bg-white/10 px-3 py-1.5 rounded-full">
            <Calendar className="h-4 w-4" />
            {format(startDate, 'MMM d, yyyy')}
          </span>
          <span className="flex items-center gap-1.5 bg-white/10 px-3 py-1.5 rounded-full">
            <Clock className="h-4 w-4" />
            {format(startDate, 'h:mm a')}
          </span>
          {party.venue && (
            <span className="flex items-center gap-1.5 bg-white/10 px-3 py-1.5 rounded-full">
              <MapPin className="h-4 w-4" />
              {party.venue}
            </span>
          )}
        </div>

        {/* Quick Stats */}
        <div className="relative grid grid-cols-3 gap-3 mt-5">
          <div className="text-center p-3 rounded-xl bg-white/10 backdrop-blur-sm">
            <Users className="h-5 w-5 mx-auto mb-1 opacity-80" />
            <p className="text-2xl font-bold">{partyRatings.length}</p>
            <p className="text-xs opacity-80">Ratings</p>
          </div>
          <div className="text-center p-3 rounded-xl bg-white/10 backdrop-blur-sm">
            <Star className="h-5 w-5 mx-auto mb-1 opacity-80" />
            <p className="text-2xl font-bold">{partyQuality !== null ? partyQuality.toFixed(1) : '—'}</p>
            <p className="text-xs opacity-80">Quality</p>
          </div>
          <div className="text-center p-3 rounded-xl bg-white/10 backdrop-blur-sm">
            <Zap className="h-5 w-5 mx-auto mb-1 opacity-80" />
            <p className="text-2xl font-bold">{confidence.percentage}%</p>
            <p className="text-xs opacity-80">Confidence</p>
          </div>
        </div>
      </div>

      {/* SCORE CARD - Only for completed parties with ratings */}
      {status === 'completed' && partyQuality !== null && (
        <Card className="glass p-5 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-full blur-2xl" />
          <div className="relative flex items-center justify-between">
            <div className="flex items-center gap-4">
              {/* Circular Score Display */}
              <div className="relative">
                <svg className="w-20 h-20 -rotate-90">
                  <circle
                    cx="40"
                    cy="40"
                    r="36"
                    stroke="currentColor"
                    strokeWidth="6"
                    fill="none"
                    className="text-muted"
                  />
                  <circle
                    cx="40"
                    cy="40"
                    r="36"
                    stroke="currentColor"
                    strokeWidth="6"
                    fill="none"
                    strokeDasharray={`${(partyQuality / 10) * 226} 226`}
                    strokeLinecap="round"
                    className="text-primary transition-all duration-1000"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className={`text-2xl font-bold ${getScoreColor(partyQuality)}`}>
                    {partyQuality.toFixed(1)}
                  </span>
                </div>
              </div>
              <div>
                <p className="text-sm text-muted-foreground font-medium">Party Quality</p>
                <p className={`text-xs mt-0.5 ${
                  confidence.level === 'low' ? 'text-amber-600' : 
                  confidence.level === 'medium' ? 'text-blue-600' : 
                  'text-emerald-600'
                }`}>
                  {confidence.label}
                </p>
              </div>
            </div>
            
            {partyQuality >= 8 && (
              <div className="px-3 py-1.5 rounded-full text-sm font-semibold bg-amber-100 text-amber-700">
                🏆 Top Rated
              </div>
            )}
          </div>
        </Card>
      )}

      {/* RATE BUTTON or STATUS MESSAGE */}
      <Card className="glass overflow-hidden">
        {canRate() ? (
          <div className="bg-gradient-to-r from-amber-500 to-orange-500 p-4">
            <Button 
              onClick={handleRateClick}
              className="w-full bg-white text-amber-600 hover:bg-white/90 font-semibold"
              size="lg"
            >
              <Star className="h-5 w-5 mr-2" />
              Rate This Party
            </Button>
          </div>
        ) : (
          <div className={`bg-gradient-to-r ${status === 'live' ? 'from-red-500/10 to-orange-500/10' : 'from-emerald-500/10 to-teal-500/10'} p-4 text-center`}>
            <div className="flex items-center justify-center gap-2 text-muted-foreground">
              {status === 'live' ? (
                <>
                  <Radio className="h-4 w-4 animate-pulse text-red-500" />
                  <span>Rating opens after the party ends</span>
                </>
              ) : (
                <>
                  <Clock className="h-4 w-4 text-emerald-500" />
                  <span>Ratings open after the party</span>
                </>
              )}
            </div>
          </div>
        )}
      </Card>

      {/* PHOTOS SECTION - Gamified */}
      <Card className="glass overflow-hidden">
        <div className="bg-gradient-to-r from-pink-500 to-rose-500 p-4 flex items-center justify-between text-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
              <Camera className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-semibold">Photos</h2>
              <p className="text-xs opacity-80">Captured moments</p>
            </div>
          </div>
          <Badge className="bg-white/20 text-white border-white/30">
            📸 Share yours
          </Badge>
        </div>
        <div className="p-4">
          <PhotoBulletin partyId={party.id} partyStatus={getPartyStatus()} />
        </div>
      </Card>

      {/* RATINGS SECTION - Gamified */}
      <Card className="glass overflow-hidden">
        <div className="bg-gradient-to-r from-cyan-500 to-blue-500 p-4 flex items-center justify-between text-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
              <TrendingUp className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-semibold">Individual Ratings</h2>
              <p className="text-xs opacity-80">{partyRatings.length} {partyRatings.length === 1 ? 'review' : 'reviews'}</p>
            </div>
          </div>
          {partyRatings.length > 0 && (
            <div className="text-right">
              <p className="text-lg font-bold">{partyQuality?.toFixed(1) ?? '—'}</p>
              <p className="text-xs opacity-80">Average</p>
            </div>
          )}
        </div>
        <div className="p-4">
          <RatingHistory partyId={party.id} refreshKey={ratingsRefreshKey} />
        </div>
      </Card>

      {/* COMMENTS SECTION - Gamified */}
      <Card className="glass overflow-hidden">
        <div className="bg-gradient-to-r from-indigo-500 to-purple-500 p-4 flex items-center justify-between text-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
              <MessageCircle className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-semibold">Discussion</h2>
              <p className="text-xs opacity-80">Share your experience</p>
            </div>
          </div>
          <Badge className="bg-white/20 text-white border-white/30">
            💬 Join in
          </Badge>
        </div>
        <div className="p-4">
          <CommentSection entityId={party.id} entityType="party" />
        </div>
      </Card>

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