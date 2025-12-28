import { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { ArrowLeft, Calendar, Star, PartyPopper, Users, Shield, Heart, Music } from 'lucide-react';
import { base44, type Fraternity as FraternityType, type Party, type PartyRating, type ReputationRating, type PartyComment, type FraternityComment } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import PartyCard from '@/components/parties/PartyCard';
import RateFratSheet from '@/components/leaderboard/RateFratSheet';
import CommentSection from '@/components/comments/CommentSection';
import TrendIndicator from '@/components/leaderboard/TrendIndicator';
import ConfidenceBar from '@/components/scores/ConfidenceBar';
import { createPageUrl, clamp, getScoreColor } from '@/utils';
import { 
  computeFullFraternityScores, 
  computeCampusRepAvg, 
  computeCampusPartyAvg,
  computeCombinedReputation,
  computePartyOverallQuality,
  computeFraternityPartyBaseline,
  type FraternityScores,
  type PartyWithRatings,
  type ActivityData
} from '@/utils/scoring';

// Per-party computed scores (overall party quality for each party)
interface PartyScoreData {
  partyId: string;
  overallQuality: number; // Confidence-adjusted overall party quality for this specific party
}

export default function FraternityPage() {
  const [searchParams] = useSearchParams();
  const fratId = searchParams.get('id');
  
  const [fraternity, setFraternity] = useState<FraternityType | null>(null);
  const [parties, setParties] = useState<Party[]>([]);
  const [loading, setLoading] = useState(true);
  const [showRateSheet, setShowRateSheet] = useState(false);
  const [existingScores, setExistingScores] = useState<{ brotherhood: number; reputation: number; community: number } | undefined>();
  const [computedScores, setComputedScores] = useState<FraternityScores | null>(null);
  const [userRating, setUserRating] = useState<{ brotherhood: number; reputation: number; community: number } | null>(null);
  const [userPartyRatings, setUserPartyRatings] = useState<PartyRating[]>([]);
  const [partyScores, setPartyScores] = useState<Map<string, number>>(new Map());

  useEffect(() => {
    if (fratId) loadData();
  }, [fratId]);

  const loadData = async () => {
    try {
      const [fratData, partiesData, allFrats, allParties, allPartyRatings, repRatings, partyComments, fratComments] = await Promise.all([
        base44.entities.Fraternity.get(fratId!),
        base44.entities.Party.filter({ fraternity_id: fratId! }, '-starts_at'),
        base44.entities.Fraternity.filter({ status: 'active' }),
        base44.entities.Party.list(),
        base44.entities.PartyRating.list(),
        base44.entities.ReputationRating.filter({ fraternity_id: fratId! }),
        base44.entities.PartyComment.list(),
        base44.entities.FraternityComment.filter({ fraternity_id: fratId! }),
      ]);
      
      setFraternity(fratData);
      setParties(partiesData);

      // Compute campus averages
      const campusRepAvg = computeCampusRepAvg(allFrats);
      const campusPartyAvg = computeCampusPartyAvg(allParties);

      // Get party ratings for this fraternity's parties
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
        party,
        ratings: partyRatingsMap.get(party.id) || [],
      }));

      // Compute fraternity-scoped baseline (only affected by this frat's ratings)
      const fratBaseline = computeFraternityPartyBaseline(partiesWithRatings);

      // Compute per-party overall quality scores using the canonical utility function
      const perPartyScores = new Map<string, number>();
      for (const { party, ratings } of partiesWithRatings) {
        perPartyScores.set(party.id, computePartyOverallQuality(ratings, fratBaseline));
      }
      setPartyScores(perPartyScores);

      // Get party comments for this fraternity's parties
      const fratPartyComments = partyComments.filter(
        c => partiesData.some(p => p.id === c.party_id)
      );

      // Build activity data
      const activityData: ActivityData = {
        repRatings,
        partyRatings: fratPartyRatings,
        parties: partiesData,
        partyComments: fratPartyComments,
        fratComments,
      };

      // Compute full scores
      const scores = await computeFullFraternityScores(
        fratData,
        repRatings,
        partiesWithRatings,
        campusRepAvg,
        campusPartyAvg,
        activityData
      );
      setComputedScores(scores);

    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Load user's own frat rating and party ratings
  const loadUserRatings = async () => {
    try {
      const user = await base44.auth.me();
      if (!user || !fratId) return;
      
      // Load user's frat rating
      const existingRatings = await base44.entities.ReputationRating.filter({
        fraternity_id: fratId,
        user_id: user.id,
      });

      if (existingRatings.length > 0) {
        const rating = existingRatings[0];
        setUserRating({
          brotherhood: rating.brotherhood_score ?? 5,
          reputation: rating.reputation_score ?? 5,
          community: rating.community_score ?? 5,
        });
      } else {
        setUserRating(null);
      }

      // Load user's party ratings for this fraternity's parties
      const allUserPartyRatings = await base44.entities.PartyRating.filter({
        user_id: user.id,
      });
      
      // Get this frat's party IDs
      const fratParties = await base44.entities.Party.filter({ fraternity_id: fratId });
      const fratPartyIds = new Set(fratParties.map(p => p.id));
      
      // Filter to only ratings for this frat's parties
      const userFratPartyRatings = allUserPartyRatings.filter(r => fratPartyIds.has(r.party_id));
      setUserPartyRatings(userFratPartyRatings);
      
    } catch (error) {
      console.error('Failed to load user ratings:', error);
    }
  };

  useEffect(() => {
    loadUserRatings();
  }, [fratId]);

  const handleRate = async () => {
    const user = await base44.auth.me();
    if (!user) {
      base44.auth.redirectToLogin(window.location.href);
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
    if (!fraternity) return;

    const user = await base44.auth.me();
    if (!user) return;

    const existingRatings = await base44.entities.ReputationRating.filter({
      fraternity_id: fraternity.id,
      user_id: user.id,
    });

    const ratingData = {
      brotherhood_score: scores.brotherhood,
      reputation_score: scores.reputation,
      community_score: scores.community,
      combined_score: scores.combined,
    };

    if (existingRatings.length > 0) {
      await base44.entities.ReputationRating.update(existingRatings[0].id, ratingData);
    } else {
      await base44.entities.ReputationRating.create({
        fraternity_id: fraternity.id,
        user_id: user.id,
        ...ratingData,
        weight: 1,
        semester: 'Fall 2024',
      });
    }

    // Recalculate fraternity reputation score from all ratings
    const allRatings = await base44.entities.ReputationRating.filter({
      fraternity_id: fraternity.id,
    });

    const reputationScore = allRatings.length > 0
      ? allRatings.reduce((sum, r) => sum + (r.combined_score ?? 5), 0) / allRatings.length
      : 5;

    await base44.entities.Fraternity.update(fraternity.id, {
      reputation_score: clamp(reputationScore, 0, 10),
    });

    await loadData();
    await loadUserRatings();
  };

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <Skeleton className="h-10 w-32" />
        <Skeleton className="h-48 rounded-xl" />
        <Skeleton className="h-32 rounded-xl" />
        <Skeleton className="h-32 rounded-xl" />
      </div>
    );
  }

  if (!fraternity) {
    return (
      <div className="max-w-2xl mx-auto text-center py-12">
        <p className="text-muted-foreground">Fraternity not found</p>
        <Button asChild variant="link" className="mt-4">
          <Link to={createPageUrl('Leaderboard')}>Back to Leaderboard</Link>
        </Button>
      </div>
    );
  }

  const upcomingParties = parties.filter(p => p.status === 'upcoming' || p.status === 'active');
  const pastParties = parties.filter(p => p.status === 'completed');
  
  // Find completed parties that have ratings (at least one rating)
  const ratedPastParties = pastParties.filter(p => {
    const score = partyScores.get(p.id);
    return score !== undefined && p.total_ratings > 0;
  });

  // For header "Overall Party Quality": if exactly 1 rated party, use that party's canonical score
  // Otherwise use the fraternity-level partyAdj
  const headerPartyQuality = (() => {
    if (ratedPastParties.length === 1 && computedScores) {
      // Single rated party scenario: use the party's canonical overall quality
      return partyScores.get(ratedPastParties[0].id) ?? computedScores.partyAdj;
    }
    return computedScores?.partyAdj ?? 5;
  })();

  // Calculate user's combined scores if they have rated
  const userFratScore = userRating 
    ? computeCombinedReputation(userRating.brotherhood, userRating.reputation, userRating.community)
    : null;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Back Button */}
      <Button asChild variant="ghost" className="px-0">
        <Link to={createPageUrl('Leaderboard')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Leaderboard
        </Link>
      </Button>

      {/* Fraternity Header */}
      <Card className="glass p-6 space-y-4">
        <div className="flex items-start gap-4">
          <div className="w-16 h-16 rounded-2xl gradient-primary flex items-center justify-center text-white text-2xl font-bold flex-shrink-0">
            {fraternity.chapter.charAt(0)}
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold">{fraternity.name}</h1>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="secondary">{fraternity.chapter}</Badge>
              {fraternity.founded_year && (
                <span className="text-sm text-muted-foreground flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  Est. {fraternity.founded_year}
                </span>
              )}
            </div>
          </div>
        </div>

        {fraternity.description && (
          <p className="text-muted-foreground">{fraternity.description}</p>
        )}
      </Card>

      {/* A) SCORE SUMMARY - Overall scores at top */}
      {computedScores && (
        <Card className="glass p-6 space-y-4">
          {/* Overall Score - Big Display */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Overall Score</p>
                <div className="text-4xl font-bold text-foreground">
                  {computedScores.overall.toFixed(1)}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <TrendIndicator momentum={computedScores.trending} showLabel />
                <Badge variant="outline">
                  {computedScores.trending >= 0 ? '+' : ''}{computedScores.trending.toFixed(2)}
                </Badge>
              </div>
            </div>
            
            {/* Overall Score Progress Bar */}
            <div className="w-full bg-muted rounded-full h-3 overflow-hidden">
              <div 
                className="h-full bg-primary transition-all duration-500 rounded-full"
                style={{ width: `${(computedScores.overall / 10) * 100}%` }}
              />
            </div>
          </div>

          {/* Two KPI Cards: Overall Frat Rating + Overall Party Quality */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-muted/50 rounded-lg p-4 text-center">
              <p className="text-xs text-muted-foreground mb-1">Overall Frat Rating</p>
              <p className={`text-2xl font-bold ${getScoreColor(computedScores.repAdj)}`}>
                {computedScores.repAdj.toFixed(1)}
              </p>
            </div>
            <div className="bg-muted/50 rounded-lg p-4 text-center">
              <p className="text-xs text-muted-foreground mb-1">Overall Party Quality</p>
              <p className={`text-2xl font-bold ${getScoreColor(headerPartyQuality)}`}>
                {headerPartyQuality.toFixed(1)}
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* B) YOUR RATINGS Section */}
      <Card className="glass p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-lg">Your Ratings</h2>
          <Button onClick={handleRate} size="sm" className="gradient-primary text-white">
            <Star className="h-4 w-4 mr-2" />
            {userRating ? 'Update' : 'Rate'} {fraternity.name} Frat Rating
          </Button>
        </div>

        {/* Frat Rating (Your Score) */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">Frat Rating</p>
            {userFratScore !== null ? (
              <span className={`text-lg font-bold ${getScoreColor(userFratScore)}`}>
                {userFratScore.toFixed(1)}
              </span>
            ) : (
              <span className="text-sm text-muted-foreground italic">Not rated yet</span>
            )}
          </div>
          
          {userRating ? (
            <div className="space-y-3">
              {[
                { label: 'Brotherhood', helper: 'Member quality and cohesion', icon: Users, value: userRating.brotherhood, color: 'text-blue-500' },
                { label: 'Reputation', helper: 'Campus perception and overall standing', icon: Shield, value: userRating.reputation, color: 'text-primary' },
                { label: 'Community', helper: 'Welcoming, respectful, positive presence', icon: Heart, value: userRating.community, color: 'text-rose-500' },
              ].map(({ label, helper, icon: Icon, value, color }) => (
                <div key={label} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full bg-muted flex items-center justify-center ${color}`}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="font-medium text-sm">{label}</p>
                        <p className="text-xs text-muted-foreground">{helper}</p>
                      </div>
                    </div>
                    <p className={`text-lg font-bold ${getScoreColor(value)}`}>{value.toFixed(1)}</p>
                  </div>
                  <Progress value={value * 10} className="h-2" />
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Rate this fraternity to see your scores here.</p>
          )}
        </div>

        <div className="border-t pt-4" />

        {/* Your Party Ratings Section */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Music className="h-5 w-5 text-primary" />
            <p className="text-sm font-medium">Your Party Ratings</p>
          </div>
          <p className="text-xs text-muted-foreground">
            Parties you've rated for this fraternity (your personal scores).
          </p>
          
          {userPartyRatings.length > 0 ? (
            <div className="space-y-2">
              {userPartyRatings.map((rating) => {
                const party = parties.find(p => p.id === rating.party_id);
                if (!party) return null;
                return (
                  <Link key={rating.id} to={createPageUrl(`Party?id=${party.id}`)}>
                    <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg hover:bg-muted transition-colors">
                      <div>
                        <p className="font-medium text-sm">{party.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(party.starts_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </p>
                      </div>
                      <span className={`text-lg font-bold ${getScoreColor(rating.party_quality_score)}`}>
                        {rating.party_quality_score.toFixed(1)}
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground italic">
              You haven't rated any {fraternity.name} parties yet. Rate a party from the Parties tab.
            </p>
          )}
        </div>
      </Card>

      {/* C) CONFIDENCE - Below user ratings */}
      {computedScores && (
        <Card className="glass p-6">
          <ConfidenceBar 
            confidence={computedScores.confidenceOverall}
            repRatings={computedScores.numRepRatings}
            partyRatings={computedScores.numPartyRatings}
          />
        </Card>
      )}

      {/* Upcoming Parties */}
      {upcomingParties.length > 0 && (
        <section className="space-y-3">
          <h2 className="font-semibold flex items-center gap-2">
            <PartyPopper className="h-5 w-5 text-primary" />
            Upcoming Parties
          </h2>
          {upcomingParties.map(party => (
            <PartyCard
              key={party.id}
              party={party}
              fraternityName={fraternity.name}
            />
          ))}
        </section>
      )}

      {/* D) Past Parties - Show per-party overall quality (confidence-adjusted) */}
      {pastParties.length > 0 && (
        <section className="space-y-3">
          <h2 className="font-semibold text-muted-foreground">Past Parties</h2>
          {pastParties.map(party => (
            <PartyCard
              key={party.id}
              party={party}
              fraternityName={fraternity.name}
              overallPartyQuality={partyScores.get(party.id)}
            />
          ))}
        </section>
      )}

      {parties.length === 0 && (
        <Card className="glass p-8 text-center">
          <PartyPopper className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
          <p className="text-muted-foreground">No parties scheduled yet</p>
        </Card>
      )}

      {/* Comments Section */}
      <CommentSection entityId={fraternity.id} entityType="fraternity" />

      {/* Rate Sheet */}
      <RateFratSheet
        fraternity={showRateSheet ? fraternity : null}
        isOpen={showRateSheet}
        onClose={() => setShowRateSheet(false)}
        onSubmit={handleRateSubmit}
        existingScores={existingScores}
      />
    </div>
  );
}
