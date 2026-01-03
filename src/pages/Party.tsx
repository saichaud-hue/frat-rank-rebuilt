import { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { ArrowLeft, Calendar, Clock, MapPin, Users, Star, Camera, MessageCircle, Trophy, Zap, Lock, Globe, Check, X } from 'lucide-react';
import { 
  partyQueries, 
  fraternityQueries, 
  partyRatingQueries,
  partyAttendanceQueries,
  getCurrentUser,
  type Party,
  type Fraternity,
  type PartyRating,
} from '@/lib/supabase-data';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import PhotoBulletin from '@/components/photos/PhotoBulletin';
import RatingHistory from '@/components/party/RatingHistory';
import CommentSection from '@/components/comments/CommentSection';
import PartyRatingForm from '@/components/rate/PartyRatingForm';
import { createPageUrl, getScoreColor, getFratShorthand } from '@/utils';
import { format } from 'date-fns';
import { computeRawPartyQuality, getPartyConfidenceLevel } from '@/utils/scoring';
import { ensureAuthed } from '@/utils/auth';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

// Adapter to convert Supabase types to scoring types
const adaptPartyRatingForScoring = (r: PartyRating): any => ({
  ...r,
  created_date: r.created_at,
});

// Demo party data for tutorial
const DEMO_PARTY: Party = {
  id: 'demo',
  title: 'Spring Formal',
  theme: 'formal',
  starts_at: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days from now
  ends_at: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000 + 5 * 60 * 60 * 1000).toISOString(),
  venue: 'Chapter House',
  access_type: 'open',
  status: 'active',
  fraternity_id: null,
  user_id: null,
  created_at: new Date().toISOString(),
  display_photo_url: null,
  tags: null,
  performance_score: null,
  quantifiable_score: null,
  unquantifiable_score: null,
  total_ratings: null,
};

const DEMO_FRATERNITY: Fraternity = {
  id: 'demo-frat',
  name: 'Sigma Alpha Epsilon',
  chapter: 'SAE',
  description: null,
  logo_url: null,
  founded_year: null,
  campus_id: null,
  created_at: new Date().toISOString(),
  base_score: null,
  display_score: null,
  historical_party_score: null,
  momentum: null,
  reputation_score: null,
  status: 'active',
};

export default function PartyPage() {
  const [searchParams] = useSearchParams();
  const partyId = searchParams.get('id');
  const isDemo = searchParams.get('demo') === 'true';
  
  const [party, setParty] = useState<Party | null>(isDemo ? DEMO_PARTY : null);
  const [fraternity, setFraternity] = useState<Fraternity | null>(isDemo ? DEMO_FRATERNITY : null);
  const [loading, setLoading] = useState(!isDemo);
  const [showRatingForm, setShowRatingForm] = useState(false);
  const [ratingsRefreshKey, setRatingsRefreshKey] = useState(0);
  const [partyRatings, setPartyRatings] = useState<PartyRating[]>([]);
  const [activeTab, setActiveTab] = useState<'photos' | 'ratings' | 'comments'>('photos');
  
  // Attendance states
  const [attendanceCounts, setAttendanceCounts] = useState<{ going: number; notGoing: number }>(
    isDemo ? { going: 47, notGoing: 12 } : { going: 0, notGoing: 0 }
  );
  const [userAttendance, setUserAttendance] = useState<boolean | null>(null);
  const [attendanceLoading, setAttendanceLoading] = useState(false);

  useEffect(() => {
    if (partyId && !isDemo) {
      loadParty();
      loadPartyRatings();
      loadAttendance();
    }
  }, [partyId, isDemo]);

  const loadAttendance = async () => {
    if (!partyId) return;
    try {
      const counts = await partyAttendanceQueries.getCounts(partyId);
      setAttendanceCounts(counts);
      
      const user = await getCurrentUser();
      if (user) {
        const attendance = await partyAttendanceQueries.getUserAttendance(partyId, user.id);
        setUserAttendance(attendance);
      }
    } catch (error) {
      console.error('Failed to load attendance:', error);
    }
  };

  const handleAttendanceVote = async (isGoing: boolean) => {
    const user = await getCurrentUser();
    if (!user) {
      toast.error('Please sign in to RSVP');
      return;
    }
    
    setAttendanceLoading(true);
    try {
      // Toggle off if clicking the same button
      if (userAttendance === isGoing) {
        await partyAttendanceQueries.removeAttendance(partyId!, user.id);
        setUserAttendance(null);
      } else {
        await partyAttendanceQueries.setAttendance(partyId!, user.id, isGoing);
        setUserAttendance(isGoing);
      }
      await loadAttendance();
    } catch (error) {
      console.error('Failed to update attendance:', error);
      toast.error('Failed to update RSVP');
    } finally {
      setAttendanceLoading(false);
    }
  };

  useEffect(() => {
    if (partyId && ratingsRefreshKey > 0) {
      loadPartyRatings();
    }
  }, [ratingsRefreshKey]);

  const loadPartyRatings = async () => {
    try {
      const ratings = await partyRatingQueries.listByParty(partyId!);
      setPartyRatings(ratings);
    } catch (error) {
      console.error('Failed to load party ratings:', error);
    }
  };

  const loadParty = async () => {
    try {
      const partyData = await partyQueries.get(partyId!);
      setParty(partyData);

      if (partyData?.fraternity_id) {
        const fratData = await fraternityQueries.get(partyData.fraternity_id);
        setFraternity(fratData);
      }
    } catch (error) {
      console.error('Failed to load party:', error);
    } finally {
      setLoading(false);
    }
  };

  const getPartyStatus = (): 'live' | 'upcoming' | 'completed' => {
    if (!party) return 'upcoming';
    const now = new Date();
    const start = party.starts_at ? new Date(party.starts_at) : now;
    const end = party.ends_at ? new Date(party.ends_at) : new Date(start.getTime() + 5 * 60 * 60 * 1000);
    
    if (now >= start && now <= end) return 'live';
    if (now < start) return 'upcoming';
    return 'completed';
  };

  const canRate = () => getPartyStatus() === 'completed';

  const handleRatingSubmit = () => {
    setShowRatingForm(false);
    loadParty();
    setRatingsRefreshKey((k) => k + 1);
    window.dispatchEvent(new CustomEvent('touse:tutorial:party-rated'));
  };

  const handleRateClick = async () => {
    const user = await ensureAuthed();
    if (!user) return;
    setShowRatingForm(true);
  };

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto space-y-4 p-4">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-48 rounded-2xl" />
        <Skeleton className="h-12 rounded-xl" />
        <Skeleton className="h-64 rounded-2xl" />
      </div>
    );
  }

  if (!party) {
    return (
      <div className="max-w-2xl mx-auto text-center py-12 p-4">
        <Star className="h-10 w-10 mx-auto mb-3 text-muted-foreground/50" />
        <p className="text-muted-foreground">Party not found</p>
        <Button asChild variant="link" className="mt-4">
          <Link to={createPageUrl('Parties')}>Back to Parties</Link>
        </Button>
      </div>
    );
  }

  const startDate = party.starts_at ? new Date(party.starts_at) : new Date();
  const adaptedRatings = partyRatings.map(adaptPartyRatingForScoring);
  const partyQuality = computeRawPartyQuality(adaptedRatings);
  const confidence = getPartyConfidenceLevel(partyRatings.length);
  const status = getPartyStatus();

  const statusConfig = {
    live: { bg: 'bg-red-500', text: 'Live Now', headerBg: 'bg-gradient-to-br from-red-500 to-orange-500', textColor: 'text-white' },
    upcoming: { bg: 'bg-emerald-500', text: 'Upcoming', headerBg: 'bg-gradient-to-br from-emerald-500 to-teal-500', textColor: 'text-white' },
    completed: { bg: 'bg-primary', text: 'Completed', headerBg: 'gradient-primary', textColor: 'text-primary-foreground' },
  };
  const config = statusConfig[status];

  const tabs: { id: 'photos' | 'ratings' | 'comments'; label: string; icon: typeof Camera; count?: number }[] = [
    { id: 'photos', label: 'Photos', icon: Camera },
    { id: 'ratings', label: 'Ratings', icon: Star, count: partyRatings.length },
    { id: 'comments', label: 'Chat', icon: MessageCircle },
  ];

  return (
    <div className="max-w-2xl mx-auto space-y-4 pb-20">
      {/* Back Button */}
      <Button asChild variant="ghost" size="sm" className="px-0">
        <Link to={createPageUrl('Parties')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Parties
        </Link>
      </Button>

      {/* Header Card */}
      <div className={`rounded-2xl ${config.headerBg} p-5 relative overflow-hidden`}>
        {/* Dark overlay for text visibility */}
        <div className="absolute inset-0 bg-black/40" />
        <div className="relative z-10 text-white">
        {/* Status & Theme Badges */}
        <div className="flex items-center justify-between mb-3">
          <Badge className={`${config.bg} text-white border-0 ${status === 'live' ? 'animate-pulse' : ''}`}>
            <Calendar className="h-3 w-3 mr-1" />
            {status === 'live' ? 'LIVE' : status === 'upcoming' ? 'UPCOMING' : 'COMPLETED'}
          </Badge>
          <div className="flex items-center gap-2">
            {party.theme && (
              <Badge className="bg-white/20 text-white border-0 capitalize">
                {party.theme}
              </Badge>
            )}
            <Badge className="bg-white/20 text-white border-0">
              {party.access_type === 'invite_only' ? 'Invite Only' : 'Open'}
            </Badge>
          </div>
        </div>

        {/* Title & Frat */}
        <h1 className="text-2xl font-bold mb-1">{party.title}</h1>
        {fraternity && (
          <Link 
            to={createPageUrl(`Fraternity?id=${fraternity.id}`)}
            className="inline-flex items-center gap-2 text-white/80 hover:text-white"
          >
            <span className="text-sm font-medium">{fraternity.chapter}</span>
            <span className="text-xs text-white/60">({fraternity.name})</span>
          </Link>
        )}

        {/* Event Details */}
        <div className="flex flex-wrap gap-2 mt-4 text-sm">
          <span className="flex items-center gap-1.5 bg-white/15 px-3 py-1.5 rounded-full">
            <Calendar className="h-3.5 w-3.5" />
            {format(startDate, 'MMM d, yyyy')}
          </span>
          <span className="flex items-center gap-1.5 bg-white/15 px-3 py-1.5 rounded-full">
            <Clock className="h-3.5 w-3.5" />
            {format(startDate, 'h:mm a')}
          </span>
          {party.venue && (
            <span className="flex items-center gap-1.5 bg-white/15 px-3 py-1.5 rounded-full">
              <MapPin className="h-3.5 w-3.5" />
              {party.venue}
            </span>
          )}
        </div>

        {/* Stats Row - Show attendance before party, stats after */}
        {status === 'completed' ? (
          // After party: Show ratings stats
          <div className="grid grid-cols-3 gap-2 mt-4">
            <div className="text-center p-3 rounded-xl bg-white/15">
              <Users className="h-4 w-4 mx-auto mb-1 opacity-80" />
              <p className="text-xl font-bold">{partyRatings.length}</p>
              <p className="text-xs opacity-70">Ratings</p>
            </div>
            <div className="text-center p-3 rounded-xl bg-white/15">
              <Star className="h-4 w-4 mx-auto mb-1 opacity-80" />
              <p className="text-xl font-bold">{partyQuality !== null ? partyQuality.toFixed(1) : '—'}</p>
              <p className="text-xs opacity-70">Quality</p>
            </div>
            <div className="text-center p-3 rounded-xl bg-white/15">
              <Zap className="h-4 w-4 mx-auto mb-1 opacity-80" />
              <p className="text-xl font-bold">{confidence.percentage}%</p>
              <p className="text-xs opacity-70">Confidence</p>
            </div>
          </div>
        ) : (
          // Before/during party: Show "Are you going?" buttons
          <div className="mt-5 space-y-3">
            <p className="text-base text-center font-semibold">Are you going?</p>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => handleAttendanceVote(true)}
                disabled={attendanceLoading}
                className={cn(
                  "flex flex-col items-center gap-1 p-4 rounded-xl transition-all active:scale-95 shadow-lg",
                  userAttendance === true 
                    ? "bg-emerald-500 text-white ring-2 ring-white" 
                    : "bg-white text-emerald-600 hover:bg-emerald-50"
                )}
              >
                <Check className="h-6 w-6" />
                <span className="text-2xl font-bold">{attendanceCounts.going}</span>
                <span className="text-xs font-medium">Yes</span>
              </button>
              <button
                onClick={() => handleAttendanceVote(false)}
                disabled={attendanceLoading}
                className={cn(
                  "flex flex-col items-center gap-1 p-4 rounded-xl transition-all active:scale-95 shadow-lg",
                  userAttendance === false 
                    ? "bg-rose-500 text-white ring-2 ring-white" 
                    : "bg-white text-rose-500 hover:bg-rose-50"
                )}
              >
                <X className="h-6 w-6" />
                <span className="text-2xl font-bold">{attendanceCounts.notGoing}</span>
                <span className="text-xs font-medium">No</span>
              </button>
            </div>
          </div>
        )}
        </div>
      </div>

      {/* Rate Button / Status */}
      {canRate() ? (
        <Button onClick={handleRateClick} className="w-full" size="lg">
          <Star className="h-5 w-5 mr-2" />
          Rate This Party
        </Button>
      ) : (
        <div className="p-3 rounded-xl bg-muted text-center text-sm text-muted-foreground">
          <Clock className="h-4 w-4 inline mr-2" />
          Ratings open after the party
        </div>
      )}

      {/* Tab Navigation */}
      <div className="flex gap-2">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
              activeTab === tab.id 
                ? 'bg-primary text-primary-foreground' 
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
          >
            <tab.icon className="h-4 w-4" />
            <span>{tab.label}</span>
            {tab.count !== undefined && tab.count > 0 && (
              <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                activeTab === tab.id ? 'bg-primary-foreground/20' : 'bg-background'
              }`}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Content Area */}
      <div className="rounded-2xl bg-muted/30 overflow-hidden min-h-[200px]">
        {activeTab === 'photos' && (
          <div className="p-4">
            <PhotoBulletin partyId={party.id} partyStatus={getPartyStatus()} />
          </div>
        )}

        {activeTab === 'ratings' && (
          <div className="p-4">
            {partyQuality !== null && (
              <div className="flex items-center gap-4 p-4 mb-4 rounded-xl bg-background">
                <div className="relative w-16 h-16">
                  <svg className="w-16 h-16 -rotate-90">
                    <circle cx="32" cy="32" r="28" stroke="currentColor" strokeWidth="4" fill="none" className="text-muted" />
                    <circle cx="32" cy="32" r="28" stroke="currentColor" strokeWidth="4" fill="none" strokeDasharray={`${(partyQuality / 10) * 176} 176`} strokeLinecap="round" className="text-primary" />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className={`text-lg font-bold ${getScoreColor(partyQuality)}`}>{partyQuality.toFixed(1)}</span>
                  </div>
                </div>
                <div>
                  <p className="font-medium">Average Score</p>
                  <p className="text-xs text-muted-foreground">{confidence.label}</p>
                </div>
                {partyQuality >= 8 && (
                  <Badge className="ml-auto bg-amber-100 text-amber-700 border-0">
                    <Trophy className="h-3 w-3 mr-1" />
                    Top Rated
                  </Badge>
                )}
              </div>
            )}
            <RatingHistory partyId={party.id} refreshKey={ratingsRefreshKey} />
          </div>
        )}

        {activeTab === 'comments' && (
          <div className="p-4">
            <CommentSection entityId={party.id} entityType="party" />
          </div>
        )}
      </div>

      {/* Rating Form Modal */}
      {showRatingForm && (
        <PartyRatingForm
          party={party as any}
          fraternity={fraternity as any}
          onClose={() => setShowRatingForm(false)}
          onSubmit={handleRatingSubmit}
        />
      )}
    </div>
  );
}
