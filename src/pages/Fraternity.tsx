import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Calendar, Star, PartyPopper, Users, Shield, Heart, MessageCircle, Trophy, Zap } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { 
  fraternityQueries, 
  partyQueries, 
  partyRatingQueries, 
  reputationRatingQueries, 
  partyCommentQueries, 
  fraternityCommentQueries,
  type Fraternity as FraternityType, 
  type Party, 
  type PartyRating, 
  type ReputationRating 
} from '@/lib/supabase-data';
import { recordUserAction } from '@/utils/streak';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import PartyCard from '@/components/parties/PartyCard';
import RateFratSheet from '@/components/leaderboard/RateFratSheet';
import PartyRatingForm from '@/components/rate/PartyRatingForm';
import CommentSection from '@/components/comments/CommentSection';
import { createPageUrl, clamp, getScoreColor, getFratGreek, getFratShorthand } from '@/utils';
import { 
  computeFullFraternityScores, 
  computeCampusRepAvg, 
  computeCampusPartyAvg,
  computeCombinedReputation,
  computeRawPartyQuality,
  computeCampusBaseline,
  type FraternityScores,
  type PartyWithRatings,
  type ActivityData
} from '@/utils/scoring';

export default function FraternityPage() {
  const { id: fratId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [fraternity, setFraternity] = useState<FraternityType | null>(null);
  const [parties, setParties] = useState<Party[]>([]);
  const [loading, setLoading] = useState(true);
  const [showRateSheet, setShowRateSheet] = useState(false);
  const [existingScores, setExistingScores] = useState<{ brotherhood: number; reputation: number; community: number } | undefined>();
  const [computedScores, setComputedScores] = useState<FraternityScores | null>(null);
  const [userRating, setUserRating] = useState<{ brotherhood: number; reputation: number; community: number } | null>(null);
  const [partyScores, setPartyScores] = useState<Map<string, number>>(new Map());
  const [selectedParty, setSelectedParty] = useState<Party | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'parties' | 'comments'>('overview');

  useEffect(() => {
    if (fratId) loadData();
  }, [fratId]);

  const loadData = async () => {
    try {
      const [allFrats, allParties, allPartyRatings, allRepRatings, allPartyComments, allFratComments] = await Promise.all([
        fraternityQueries.list(),
        partyQueries.list(),
        partyRatingQueries.list(),
        reputationRatingQueries.list(),
        partyCommentQueries.list(),
        fraternityCommentQueries.list(),
      ]);

      const fratData = allFrats.find(f => f.id === fratId);
      if (!fratData) {
        setLoading(false);
        return;
      }

      const partiesData = allParties.filter(p => p.fraternity_id === fratId);
      // Sort by starts_at descending
      partiesData.sort((a, b) => new Date(b.starts_at || 0).getTime() - new Date(a.starts_at || 0).getTime());
      
      setFraternity(fratData);
      setParties(partiesData);

      const activeFrats = allFrats.filter(f => f.status === 'active');
      const campusRepAvg = computeCampusRepAvg(activeFrats as any);
      const campusPartyAvg = computeCampusPartyAvg(allPartyRatings as any);

      const fratPartyRatings = allPartyRatings.filter(
        r => partiesData.some(p => p.id === r.party_id)
      );
      
      const partyRatingsMap = new Map<string, PartyRating[]>();
      for (const rating of fratPartyRatings) {
        if (rating.party_id) {
          const existing = partyRatingsMap.get(rating.party_id) || [];
          existing.push(rating);
          partyRatingsMap.set(rating.party_id, existing);
        }
      }

      const partiesWithRatings: PartyWithRatings[] = partiesData.map(party => ({
        party: party as any,
        ratings: (partyRatingsMap.get(party.id) || []) as any,
      }));

      const allPartiesWithRatings: PartyWithRatings[] = allParties.map(party => ({
        party: party as any,
        ratings: (allPartyRatings.filter(r => r.party_id === party.id)) as any,
      }));
      
      const campusBaseline = computeCampusBaseline(allPartiesWithRatings);

      const perPartyScores = new Map<string, number>();
      for (const { party, ratings } of partiesWithRatings) {
        const rawQuality = computeRawPartyQuality(ratings);
        if (rawQuality !== null) {
          perPartyScores.set(party.id, rawQuality);
        }
      }
      setPartyScores(perPartyScores);

      const fratPartyComments = allPartyComments.filter(
        c => partiesData.some(p => p.id === c.party_id)
      );

      const repRatings = allRepRatings.filter(r => r.fraternity_id === fratId);
      const fratComments = allFratComments.filter(c => c.fraternity_id === fratId);

      const activityData: ActivityData = {
        repRatings: repRatings as any,
        partyRatings: fratPartyRatings as any,
        parties: partiesData as any,
        partyComments: fratPartyComments as any,
        fratComments: fratComments as any,
      };

      const scores = await computeFullFraternityScores(
        fratData as any,
        repRatings as any,
        partiesWithRatings,
        campusRepAvg,
        campusPartyAvg,
        activityData,
        campusBaseline
      );
      setComputedScores(scores);

    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadUserRatings = async () => {
    try {
      if (!user || !fratId) return;
      
      const allRatings = await reputationRatingQueries.list();
      const existingRatings = allRatings.filter(
        r => r.fraternity_id === fratId && r.user_id === user.id
      );

      if (existingRatings.length > 0) {
        const rating = existingRatings[0];
        setUserRating({
          brotherhood: Number(rating.brotherhood_score) ?? 5,
          reputation: Number(rating.reputation_score) ?? 5,
          community: Number(rating.community_score) ?? 5,
        });
      } else {
        setUserRating(null);
      }
    } catch (error) {
      console.error('Failed to load user ratings:', error);
    }
  };

  useEffect(() => {
    if (user) loadUserRatings();
  }, [fratId, user]);

  const handleRate = async () => {
    if (!user) {
      navigate('/auth');
      return;
    }

    if (userRating) {
      setExistingScores(userRating);
    } else {
      setExistingScores(undefined);
    }
    setShowRateSheet(true);
  };

  const handleRateSubmit = async (scores: { brotherhood: number; reputation: number; community: number; combined: number }) => {
    if (!fraternity || !user) return;

    const allRatings = await reputationRatingQueries.list();
    const existingRatings = allRatings.filter(
      r => r.fraternity_id === fraternity.id && r.user_id === user.id
    );

    const ratingData = {
      brotherhood_score: scores.brotherhood,
      reputation_score: scores.reputation,
      community_score: scores.community,
      combined_score: scores.combined,
    };

    if (existingRatings.length > 0) {
      await reputationRatingQueries.update(existingRatings[0].id, ratingData);
    } else {
      await reputationRatingQueries.create({
        fraternity_id: fraternity.id,
        user_id: user.id,
        ...ratingData,
        weight: 1,
        semester: 'Fall 2024',
      });
    }

    const fratRatings = allRatings.filter(r => r.fraternity_id === fraternity.id);
    const reputationScore = fratRatings.length > 0
      ? fratRatings.reduce((sum, r) => sum + (Number(r.combined_score) ?? 5), 0) / fratRatings.length
      : 5;

    await fraternityQueries.update(fraternity.id, {
      reputation_score: clamp(reputationScore, 0, 10),
    });

    await recordUserAction();
    await loadData();
    await loadUserRatings();
  };

  const handlePartyRatingSubmit = async () => {
    setSelectedParty(null);
    await loadData();
  };

  const getPartyStatus = (party: typeof parties[0]): 'live' | 'upcoming' | 'completed' => {
    const now = new Date();
    const start = new Date(party.starts_at);
    const end = party.ends_at ? new Date(party.ends_at) : new Date(start.getTime() + 5 * 60 * 60 * 1000);
    
    if (now >= start && now <= end) return 'live';
    if (now < start) return 'upcoming';
    return 'completed';
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

  if (!fraternity) {
    return (
      <div className="max-w-2xl mx-auto text-center py-12 p-4">
        <Trophy className="h-10 w-10 mx-auto mb-3 text-muted-foreground/50" />
        <p className="text-muted-foreground">Fraternity not found</p>
        <Button asChild variant="link" className="mt-4">
          <Link to={createPageUrl('Leaderboard')}>Back to Leaderboard</Link>
        </Button>
      </div>
    );
  }

  const upcomingParties = parties.filter(p => {
    const status = getPartyStatus(p);
    return status === 'upcoming' || status === 'live';
  });
  const pastParties = parties.filter(p => getPartyStatus(p) === 'completed');

  const headerPartyQuality = computedScores?.hasPartyScoreData 
    ? computedScores.semesterPartyScore 
    : null;

  const userFratScore = userRating 
    ? computeCombinedReputation(userRating.brotherhood, userRating.reputation, userRating.community)
    : null;

  const tabs: { id: 'overview' | 'parties' | 'comments'; label: string; icon: typeof Star; count?: number }[] = [
    { id: 'overview', label: 'Overview', icon: Star },
    { id: 'parties', label: 'Parties', icon: PartyPopper, count: parties.length },
    { id: 'comments', label: 'Chat', icon: MessageCircle },
  ];

  return (
    <div className="max-w-2xl mx-auto space-y-4 pb-20">
      {/* Back Button */}
      <Button asChild variant="ghost" size="sm" className="px-0">
        <Link to={createPageUrl('Leaderboard')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Leaderboard
        </Link>
      </Button>

      {/* Header Card */}
      <div className="rounded-2xl bg-primary p-5 text-primary-foreground">
        <div className="flex items-start gap-4">
          {/* Greek Letter */}
          <div className="w-16 h-16 rounded-xl bg-primary-foreground/20 flex items-center justify-center text-2xl font-bold shrink-0">
            {getFratGreek(fraternity.name)}
          </div>
          
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold truncate">{fraternity.chapter}</h1>
            <p className="text-primary-foreground/80 text-sm mt-0.5">{fraternity.name}</p>
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              {fraternity.founded_year && (
                <span className="text-primary-foreground/70 text-xs flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  Est. {fraternity.founded_year}
                </span>
              )}
            </div>
            {fraternity.description && (
              <p className="text-primary-foreground/70 text-xs mt-2 line-clamp-2">{fraternity.description}</p>
            )}
          </div>
        </div>

        {/* Stats Row - Overall score + counts */}
        <div className="grid grid-cols-3 gap-2 mt-4">
          <div className="text-center p-3 rounded-xl bg-primary-foreground/15">
            <Trophy className="h-4 w-4 mx-auto mb-1 opacity-80" />
            <p className="text-xl font-bold">
              {computedScores?.hasOverallData ? computedScores.overall.toFixed(1) : '—'}
            </p>
            <p className="text-xs opacity-70">Overall</p>
          </div>
          <div className="text-center p-3 rounded-xl bg-primary-foreground/15">
            <PartyPopper className="h-4 w-4 mx-auto mb-1 opacity-80" />
            <p className="text-xl font-bold">{computedScores?.numPartiesHosted ?? 0}</p>
            <p className="text-xs opacity-70">Parties</p>
          </div>
          <div className="text-center p-3 rounded-xl bg-primary-foreground/15">
            <Star className="h-4 w-4 mx-auto mb-1 opacity-80" />
            <p className="text-xl font-bold">{(computedScores?.numRepRatings ?? 0) + (computedScores?.numPartyRatings ?? 0)}</p>
            <p className="text-xs opacity-70">Ratings</p>
          </div>
        </div>
      </div>

      {/* Rate Button */}
      <Button onClick={handleRate} className="w-full" size="lg">
        <Star className="h-5 w-5 mr-2" />
        {userRating ? 'Update Your Rating' : 'Rate This Frat'}
      </Button>

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
      <div className="rounded-2xl bg-muted/30 overflow-hidden border border-primary/20">
        {/* Overview Tab */}
        {activeTab === 'overview' && computedScores && (
          <div className="p-4 space-y-4">
            {/* Overall Score */}
            <div className="flex items-center gap-4 p-4 rounded-xl bg-background border border-primary/30">
              <div className="relative w-16 h-16">
                <svg className="w-16 h-16 -rotate-90">
                  <circle cx="32" cy="32" r="28" stroke="currentColor" strokeWidth="4" fill="none" className="text-muted" />
                  <circle 
                    cx="32" cy="32" r="28" 
                    stroke="currentColor" strokeWidth="4" fill="none" 
                    strokeDasharray={`${((computedScores.overall ?? 0) / 10) * 176} 176`} 
                    strokeLinecap="round" 
                    className={computedScores.hasOverallData ? 'text-primary' : 'text-muted'}
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-lg font-bold">
                    {computedScores.hasOverallData ? computedScores.overall?.toFixed(1) : '—'}
                  </span>
                </div>
              </div>
              <div className="flex-1">
                <p className="font-medium">Overall Score</p>
                <p className="text-xs text-muted-foreground">
                  {computedScores.hasOverallData ? `Based on ${computedScores.numRepRatings + computedScores.numPartyRatings} ratings` : 'Needs more ratings'}
                </p>
              </div>
              {computedScores.trending !== 0 && (
                <Badge className={computedScores.trending > 0 ? 'bg-emerald-100 text-emerald-700 border-0' : 'bg-red-100 text-red-700 border-0'}>
                  {computedScores.trending > 0 ? '+' : ''}{computedScores.trending.toFixed(1)}
                </Badge>
              )}
            </div>

            {/* Score Grid */}
            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 rounded-xl bg-background border border-primary/30 text-center">
                <Star className="h-4 w-4 mx-auto mb-1 text-violet-500" />
                <p className={`text-xl font-bold ${computedScores.hasRepData ? getScoreColor(computedScores.repAdj) : 'text-muted-foreground'}`}>
                  {computedScores.hasRepData ? computedScores.repAdj.toFixed(1) : '—'}
                </p>
                <p className="text-xs text-muted-foreground">Frat Rating</p>
              </div>
              <div className="p-3 rounded-xl bg-background border border-primary/30 text-center">
                <PartyPopper className="h-4 w-4 mx-auto mb-1 text-pink-500" />
                <p className={`text-xl font-bold ${headerPartyQuality !== null ? getScoreColor(headerPartyQuality) : 'text-muted-foreground'}`}>
                  {headerPartyQuality !== null ? headerPartyQuality.toFixed(1) : '—'}
                </p>
                <p className="text-xs text-muted-foreground">Party Score</p>
              </div>
              <div className="p-3 rounded-xl bg-background border border-primary/30 text-center">
                <Zap className="h-4 w-4 mx-auto mb-1 text-emerald-500" />
                <p className={`text-xl font-bold ${computedScores.activityTrending > 0 ? 'text-emerald-600' : 'text-muted-foreground'}`}>
                  {computedScores.activityTrending > 0 ? '+' : ''}{computedScores.activityTrending.toFixed(1)}
                </p>
                <p className="text-xs text-muted-foreground">Activity</p>
              </div>
            </div>

            {/* Category Breakdown */}
            {computedScores.hasRepData && (
              <div className="p-4 rounded-xl bg-background border border-primary/30 space-y-4">
                <p className="font-medium text-sm">Rating Breakdown</p>
                {[
                  { label: 'Brotherhood', icon: Users, value: computedScores.avgBrotherhood, color: 'bg-blue-500' },
                  { label: 'Reputation', icon: Shield, value: computedScores.avgReputation, color: 'bg-violet-500' },
                  { label: 'Community', icon: Heart, value: computedScores.avgCommunity, color: 'bg-rose-500' },
                ].map(({ label, icon: Icon, value, color }) => (
                  <div key={label} className="space-y-1.5">
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <Icon className="h-4 w-4 text-muted-foreground" />
                        <span>{label}</span>
                      </div>
                      <span className={`font-bold ${getScoreColor(value)}`}>{value.toFixed(1)}</span>
                    </div>
                    <div className="h-2 rounded-full bg-muted overflow-hidden">
                      <div className={`h-full rounded-full ${color}`} style={{ width: `${value * 10}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Your Rating */}
            <div className="p-4 rounded-xl bg-background border border-primary/30">
              <div className="flex items-center justify-between mb-3">
                <p className="font-medium text-sm">Your Rating</p>
                <Button onClick={handleRate} variant="outline" size="sm">
                  {userRating ? 'Edit' : 'Add'}
                </Button>
              </div>
              {userFratScore !== null ? (
                <div className="flex items-center justify-between p-3 rounded-lg bg-primary/10">
                  <span className="text-sm text-muted-foreground">Your Score</span>
                  <span className={`text-2xl font-bold ${getScoreColor(userFratScore)}`}>{userFratScore.toFixed(1)}</span>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">You haven't rated this frat yet</p>
              )}
            </div>

            {/* Confidence */}
            <div className="p-4 rounded-xl bg-background border border-primary/30">
              <div className="flex items-center justify-between mb-2">
                <p className="font-medium text-sm">Data Confidence</p>
                <Badge className={
                  computedScores.confidenceOverall >= 0.7 ? 'bg-emerald-100 text-emerald-700 border-0' :
                  computedScores.confidenceOverall >= 0.4 ? 'bg-amber-100 text-amber-700 border-0' : 
                  'bg-red-100 text-red-700 border-0'
                }>
                  {Math.round(computedScores.confidenceOverall * 100)}%
                </Badge>
              </div>
              <div className="h-2 rounded-full bg-muted overflow-hidden">
                <div 
                  className={`h-full rounded-full ${
                    computedScores.confidenceOverall >= 0.7 ? 'bg-emerald-500' :
                    computedScores.confidenceOverall >= 0.4 ? 'bg-amber-500' : 'bg-red-500'
                  }`}
                  style={{ width: `${computedScores.confidenceOverall * 100}%` }}
                />
              </div>
              <div className="grid grid-cols-2 gap-2 mt-3">
                <div className="p-2 rounded-lg bg-muted/50 text-center">
                  <p className="text-lg font-bold">{computedScores.numRepRatings}</p>
                  <p className="text-xs text-muted-foreground">Frat Ratings</p>
                </div>
                <div className="p-2 rounded-lg bg-muted/50 text-center">
                  <p className="text-lg font-bold">{computedScores.numPartyRatings}</p>
                  <p className="text-xs text-muted-foreground">Party Ratings</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Parties Tab */}
        {activeTab === 'parties' && (
          <div className="p-4 space-y-4">
            {upcomingParties.length > 0 && (
              <div className="space-y-3">
                <p className="text-sm font-medium text-muted-foreground">Upcoming</p>
                {upcomingParties.map(party => (
                  <PartyCard 
                    key={party.id} 
                    party={party} 
                    fraternityName={fraternity.name}
                    overallPartyQuality={partyScores.get(party.id)}
                    computedStatus={getPartyStatus(party)}
                  />
                ))}
              </div>
            )}
            
            {pastParties.length > 0 && (
              <div className="space-y-3">
                <p className="text-sm font-medium text-muted-foreground">Past Events</p>
                {pastParties.slice(0, 5).map(party => (
                  <PartyCard 
                    key={party.id} 
                    party={party} 
                    fraternityName={fraternity.name}
                    overallPartyQuality={partyScores.get(party.id)}
                    computedStatus="completed"
                  />
                ))}
              </div>
            )}

            {parties.length === 0 && (
              <div className="text-center py-8">
                <PartyPopper className="h-10 w-10 mx-auto mb-3 text-muted-foreground/50" />
                <p className="text-muted-foreground">No parties yet</p>
              </div>
            )}
          </div>
        )}

        {/* Comments Tab */}
        {activeTab === 'comments' && (
          <div className="p-4">
            <CommentSection entityId={fraternity.id} entityType="fraternity" />
          </div>
        )}
      </div>

      {/* Rate Sheet */}
      {showRateSheet && (
        <RateFratSheet
          fraternity={fraternity}
          isOpen={showRateSheet}
          onClose={() => setShowRateSheet(false)}
          onSubmit={handleRateSubmit}
          existingScores={existingScores}
        />
      )}

      {/* Party Rating Form */}
      {selectedParty && (
        <PartyRatingForm
          party={selectedParty}
          fraternity={fraternity}
          onClose={() => setSelectedParty(null)}
          onSubmit={handlePartyRatingSubmit}
        />
      )}
    </div>
  );
}
