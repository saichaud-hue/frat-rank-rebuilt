import { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { ArrowLeft, Calendar, Star, PartyPopper } from 'lucide-react';
import { base44, type Fraternity, type Party, type PartyRating, type ReputationRating } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import OverallScoreCard from '@/components/scores/OverallScoreCard';
import PartyCard from '@/components/parties/PartyCard';
import RateFratSheet from '@/components/leaderboard/RateFratSheet';
import { createPageUrl, clamp } from '@/utils';
import { 
  computeFullFraternityScores, 
  computeCampusRepAvg, 
  computeCampusPartyAvg,
  type FraternityScores,
  type PartyWithRatings
} from '@/utils/scoring';

export default function FraternityPage() {
  const [searchParams] = useSearchParams();
  const fratId = searchParams.get('id');
  
  const [fraternity, setFraternity] = useState<Fraternity | null>(null);
  const [parties, setParties] = useState<Party[]>([]);
  const [loading, setLoading] = useState(true);
  const [showRateSheet, setShowRateSheet] = useState(false);
  const [existingScores, setExistingScores] = useState<{ brotherhood: number; reputation: number; community: number } | undefined>();
  const [computedScores, setComputedScores] = useState<FraternityScores | null>(null);

  useEffect(() => {
    if (fratId) loadData();
  }, [fratId]);

  const loadData = async () => {
    try {
      const [fratData, partiesData, allFrats, allParties, allPartyRatings, repRatings] = await Promise.all([
        base44.entities.Fraternity.get(fratId!),
        base44.entities.Party.filter({ fraternity_id: fratId! }, '-starts_at'),
        base44.entities.Fraternity.filter({ status: 'active' }),
        base44.entities.Party.list(),
        base44.entities.PartyRating.list(),
        base44.entities.ReputationRating.filter({ fraternity_id: fratId! }),
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

      // Compute full scores
      const scores = await computeFullFraternityScores(
        fratData,
        repRatings,
        partiesWithRatings,
        campusRepAvg,
        campusPartyAvg
      );
      setComputedScores(scores);

    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRate = async () => {
    const user = await base44.auth.me();
    if (!user) {
      base44.auth.redirectToLogin(window.location.href);
      return;
    }

    const existingRatings = await base44.entities.ReputationRating.filter({
      fraternity_id: fratId!,
      user_id: user.id,
    });

    if (existingRatings.length > 0) {
      const rating = existingRatings[0];
      setExistingScores({
        brotherhood: rating.brotherhood_score ?? 5,
        reputation: rating.reputation_score ?? 5,
        community: rating.community_score ?? 5,
      });
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

        {/* READ-ONLY Score Display - Never includes sliders */}
        {computedScores && (
          <OverallScoreCard 
            scores={computedScores}
            showConfidence={true}
            showTrending={true}
            showPartyBreakdown={false}
          />
        )}

        <Button onClick={handleRate} className="w-full gradient-primary text-white">
          <Star className="h-4 w-4 mr-2" />
          Rate {fraternity.name}
        </Button>
      </Card>

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

      {/* Past Parties */}
      {pastParties.length > 0 && (
        <section className="space-y-3">
          <h2 className="font-semibold text-muted-foreground">Past Parties</h2>
          {pastParties.map(party => (
            <PartyCard
              key={party.id}
              party={party}
              fraternityName={fraternity.name}
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
