import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44, seedInitialData, type Fraternity, type Party, type PartyRating, type ReputationRating, type PartyComment, type FraternityComment } from '@/api/base44Client';
import { 
  computeFullFraternityScores, 
  computeCampusRepAvg, 
  computeCampusPartyAvg,
  sortFraternitiesByOverall,
  sortFraternitiesByReputation,
  sortFraternitiesByParty,
  sortFraternitiesByTrending,
  type FraternityWithScores,
  type FraternityScores,
  type PartyWithRatings,
  type ActivityData
} from '@/utils/scoring';
import LeaderboardHeader from '@/components/leaderboard/LeaderboardHeader';
import LeaderboardPodium from '@/components/leaderboard/LeaderboardPodium';
import FraternityCard from '@/components/leaderboard/FraternityCard';
import RateFratSheet from '@/components/leaderboard/RateFratSheet';
import RateActionSheet from '@/components/leaderboard/RateActionSheet';
import LeaderboardIntro from '@/components/onboarding/LeaderboardIntro';
import PartyRatingForm from '@/components/rate/PartyRatingForm';
import { Skeleton } from '@/components/ui/skeleton';
import { clamp, createPageUrl } from '@/utils';
import { getCachedCampusBaseline } from "@/utils/scoring";
import { ensureAuthed } from '@/utils/auth';
import { Star, PartyPopper, X } from 'lucide-react';

type FilterType = 'overall' | 'reputation' | 'party' | 'trending';

export default function Leaderboard() {
  const navigate = useNavigate();
  const [fraternities, setFraternities] = useState<FraternityWithScores[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterType>('overall');
  const [selectedFrat, setSelectedFrat] = useState<Fraternity | null>(null);
  const [existingScores, setExistingScores] = useState<{ brotherhood: number; reputation: number; community: number } | undefined>();
  const [showIntro, setShowIntro] = useState(() => {
    return !localStorage.getItem('fratrank_leaderboard_intro_never_show');
  });
  const [showRateAction, setShowRateAction] = useState<'rate' | 'parties' | false>(false);
  const [rateExpanded, setRateExpanded] = useState(false);
  const [selectedParty, setSelectedParty] = useState<Party | null>(null);

  const handleIntroComplete = (neverShowAgain: boolean) => {
    if (neverShowAgain) {
      localStorage.setItem('fratrank_leaderboard_intro_never_show', 'true');
    }
    setShowIntro(false);
  };

  const handleIntroRate = (fraternity: Fraternity) => {
    handleRate(fraternity);
  };

  useEffect(() => {
    initAndLoad();
  }, []);

  useEffect(() => {
    if (fraternities.length > 0) {
      sortFraternities();
    }
  }, [filter]);

  const initAndLoad = async () => {
    await seedInitialData();
    await loadFraternities();
  };

  const loadFraternities = async () => {
    try {
      // Load all data needed for scoring including comments for activity trending
      const [fratsData, partiesData, allPartyRatings, allRepRatings, allPartyComments, allFratComments] = await Promise.all([
        base44.entities.Fraternity.filter({ status: 'active' }),
        base44.entities.Party.list(),
        base44.entities.PartyRating.list(),
        base44.entities.ReputationRating.list(),
        base44.entities.PartyComment.list(),
        base44.entities.FraternityComment.list(),
      ]);

      // Compute campus averages
      const campusRepAvg = computeCampusRepAvg(fratsData);
      const campusPartyAvg = computeCampusPartyAvg(allPartyRatings);

      // Group parties and ratings by fraternity
      const partiesByFrat = new Map<string, Party[]>();
      for (const party of partiesData) {
        if (party.fraternity_id) {
          const existing = partiesByFrat.get(party.fraternity_id) || [];
          existing.push(party);
          partiesByFrat.set(party.fraternity_id, existing);
        }
      }

      const partyRatingsMap = new Map<string, PartyRating[]>();
      for (const rating of allPartyRatings) {
        if (rating.party_id) {
          const existing = partyRatingsMap.get(rating.party_id) || [];
          existing.push(rating);
          partyRatingsMap.set(rating.party_id, existing);
        }
      }

      const repRatingsByFrat = new Map<string, ReputationRating[]>();
      for (const rating of allRepRatings) {
        if (rating.fraternity_id) {
          const existing = repRatingsByFrat.get(rating.fraternity_id) || [];
          existing.push(rating);
          repRatingsByFrat.set(rating.fraternity_id, existing);
        }
      }

      // Group comments by party
      const partyCommentsByParty = new Map<string, PartyComment[]>();
      for (const comment of allPartyComments) {
        if (comment.party_id) {
          const existing = partyCommentsByParty.get(comment.party_id) || [];
          existing.push(comment);
          partyCommentsByParty.set(comment.party_id, existing);
        }
      }

      // Group fraternity comments by fraternity
      const fratCommentsByFrat = new Map<string, FraternityComment[]>();
      for (const comment of allFratComments) {
        if (comment.fraternity_id) {
          const existing = fratCommentsByFrat.get(comment.fraternity_id) || [];
          existing.push(comment);
          fratCommentsByFrat.set(comment.fraternity_id, existing);
        }
      }

      // Build all parties with ratings for campus baseline
      const allPartiesWithRatings: PartyWithRatings[] = partiesData.map(party => ({
        party,
        ratings: partyRatingsMap.get(party.id) || [],
      }));

      // Compute full scores for each fraternity
      const fratsWithScores: FraternityWithScores[] = await Promise.all(
        fratsData.map(async (frat) => {
          const fratParties = partiesByFrat.get(frat.id) || [];
          const partiesWithRatings: PartyWithRatings[] = fratParties.map(party => ({
            party,
            ratings: partyRatingsMap.get(party.id) || [],
          }));
          const repRatings = repRatingsByFrat.get(frat.id) || [];
          
          // Get all party ratings for this frat's parties
          const fratPartyRatings = fratParties.flatMap(p => partyRatingsMap.get(p.id) || []);
          
          // Get all party comments for this frat's parties
          const fratPartyComments = fratParties.flatMap(p => partyCommentsByParty.get(p.id) || []);
          
          // Build activity data for trending calculation
          const activityData: ActivityData = {
            repRatings,
            partyRatings: fratPartyRatings,
            parties: fratParties,
            partyComments: fratPartyComments,
            fratComments: fratCommentsByFrat.get(frat.id) || [],
          };

          const campusBaseline = getCachedCampusBaseline(allPartiesWithRatings);

          const scores = await computeFullFraternityScores(
            frat,
            repRatings,
            partiesWithRatings,
            campusRepAvg,
            campusPartyAvg,
            activityData,
            campusBaseline
          );

          return {
            ...frat,
            computedScores: scores,
          };
        })
      );

      setFraternities(sortByFilter(fratsWithScores, filter));
    } catch (error) {
      console.error('Failed to load fraternities:', error);
    } finally {
      setLoading(false);
    }
  };

  const sortByFilter = (frats: FraternityWithScores[], f: FilterType): FraternityWithScores[] => {
    switch (f) {
      case 'overall':
        return sortFraternitiesByOverall(frats);
      case 'reputation':
        return sortFraternitiesByReputation(frats);
      case 'party':
        return sortFraternitiesByParty(frats);
      case 'trending':
        return sortFraternitiesByTrending(frats);
      default:
        return sortFraternitiesByOverall(frats);
    }
  };

  const sortFraternities = () => {
    setFraternities(prev => sortByFilter(prev, filter));
  };

  const handleRate = async (fraternity: Fraternity) => {
    const user = await ensureAuthed();
    if (!user) return;

    const existingRatings = await base44.entities.ReputationRating.filter({
      fraternity_id: fraternity.id,
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
    setSelectedFrat(fraternity);
  };

  const handleRateSubmit = async (scores: { brotherhood: number; reputation: number; community: number; combined: number }) => {
    if (!selectedFrat) return;

    const user = await base44.auth.me();
    if (!user) return;

    const existingRatings = await base44.entities.ReputationRating.filter({
      fraternity_id: selectedFrat.id,
      user_id: user.id,
    });

    const ratingData = {
      brotherhood_score: scores.brotherhood,
      reputation_score: scores.reputation,
      community_score: scores.community,
      combined_score: scores.combined,
    };

    if (existingRatings.length > 0) {
      // Refresh created_date on updates so edits count as fresh activity for trending
      await base44.entities.ReputationRating.update(existingRatings[0].id, {
        ...ratingData,
        created_date: new Date().toISOString(),
      });
    } else {
      await base44.entities.ReputationRating.create({
        fraternity_id: selectedFrat.id,
        user_id: user.id,
        ...ratingData,
        weight: 1,
        semester: 'Fall 2024',
      });
    }

    // Recalculate fraternity scores
    const allRatings = await base44.entities.ReputationRating.filter({
      fraternity_id: selectedFrat.id,
    });

    const reputationScore = allRatings.length > 0
      ? allRatings.reduce((sum, r) => sum + (r.combined_score ?? 5), 0) / allRatings.length
      : 5;

    await base44.entities.Fraternity.update(selectedFrat.id, {
      reputation_score: clamp(reputationScore, 0, 10),
    });

    await loadFraternities();
  };

  const handleRateParty = async (party: Party) => {
    const user = await ensureAuthed();
    if (!user) return;
    setSelectedParty(party);
  };

  const handlePartyRatingSubmit = async () => {
    setSelectedParty(null);
    await loadFraternities();
  };

  // Compute ranks with ties (same score = same rank)
  const computeRanks = (frats: FraternityWithScores[]): number[] => {
    if (frats.length === 0) return [];
    
    const getScore = (f: FraternityWithScores): number | null => {
      const s = f.computedScores;
      if (!s) return 5;
      switch (filter) {
        case 'overall': return s.hasOverallData ? s.overall : null;
        case 'reputation': return s.hasRepData ? s.repAdj : null;
        case 'party': return s.hasPartyScoreData ? s.semesterPartyScore : null;
        case 'trending': return s.activityTrending;
        default: return s.hasOverallData ? s.overall : null;
      }
    };
    
    const ranks: number[] = [];
    let currentRank = 1;
    
    for (let i = 0; i < frats.length; i++) {
      const currScore = getScore(frats[i]);
      
      if (i === 0) {
        ranks.push(1);
      } else {
        const prevScore = getScore(frats[i - 1]);
        // If both have null scores (no data), assign same rank
        if (currScore === null && prevScore === null) {
          ranks.push(ranks[i - 1]);
        } else if (currScore === null || prevScore === null) {
          // One has data, one doesn't - different ranks
          ranks.push(i + 1);
        } else if (Math.abs(prevScore - currScore) < 0.01) {
          // If scores are equal (within tolerance), assign same rank
          ranks.push(ranks[i - 1]);
        } else {
          ranks.push(i + 1);
        }
      }
    }
    return ranks;
  };

  const ranks = computeRanks(fraternities);
  const topThree = fraternities.slice(0, 3);
  const topThreeRanks = ranks.slice(0, 3);
  const rest = fraternities.slice(3);
  const restRanks = ranks.slice(3);

  if (loading) {
    return (
      <div className="space-y-5">
        <Skeleton className="h-20 w-full rounded-xl" />
        <Skeleton className="h-32 w-full rounded-xl" />
        <Skeleton className="h-20 w-full rounded-xl" />
        <Skeleton className="h-20 w-full rounded-xl" />
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-20 rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <LeaderboardHeader 
        filter={filter} 
        onFilterChange={setFilter} 
      />

      {topThree.length >= 3 && (
        <LeaderboardPodium topThree={topThree} ranks={topThreeRanks} filter={filter} onRate={handleRate} />
      )}

      {rest.length > 0 && (
        <div className="space-y-3">
          {rest.map((frat, index) => {
            const fratRank = restRanks[index];
            const isTied = restRanks.filter(r => r === fratRank).length > 1;
            return (
              <FraternityCard
                key={frat.id}
                fraternity={frat}
                rank={fratRank}
                onRate={handleRate}
                filter={filter}
                isTied={isTied}
              />
            );
          })}
        </div>
      )}

      <RateFratSheet
        fraternity={selectedFrat}
        isOpen={!!selectedFrat}
        onClose={() => setSelectedFrat(null)}
        onSubmit={handleRateSubmit}
        existingScores={existingScores}
      />

      {/* Rate Action Sheet */}
      <RateActionSheet
        isOpen={showRateAction !== false}
        onClose={() => setShowRateAction(false)}
        onRateFrat={handleRate}
        onRateParty={handleRateParty}
        fraternities={fraternities}
        initialAction={showRateAction || undefined}
      />

      {/* Party Rating Form */}
      {selectedParty && (
        <PartyRatingForm
          party={selectedParty}
          onClose={() => setSelectedParty(null)}
          onSubmit={handlePartyRatingSubmit}
        />
      )}

      {/* Floating Rate Buttons - Hide when any modal is open */}
      {!showIntro && !selectedFrat && !selectedParty && showRateAction === false && (
        <div 
          className="fixed bottom-24 right-4 z-50 flex items-center gap-2"
          style={{ marginBottom: 'env(safe-area-inset-bottom)' }}
        >
          {rateExpanded ? (
            <>
              <button
                onClick={() => { setShowRateAction('parties'); setRateExpanded(false); }}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-full bg-primary text-white shadow-lg active:scale-95 transition-all animate-scale-in"
              >
                <PartyPopper className="h-4 w-4" />
                <span className="font-medium text-sm">Party</span>
              </button>
              <button
                onClick={() => { setShowRateAction('rate'); setRateExpanded(false); }}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-full bg-amber-500 text-white shadow-lg active:scale-95 transition-all animate-scale-in"
              >
                <Star className="h-4 w-4" />
                <span className="font-medium text-sm">Frat</span>
              </button>
              <button
                onClick={() => setRateExpanded(false)}
                className="flex items-center justify-center w-10 h-10 rounded-full bg-muted text-muted-foreground shadow-lg active:scale-95 transition-all"
              >
                <X className="h-5 w-5" />
              </button>
            </>
          ) : (
            <button
              onClick={() => setRateExpanded(true)}
              className="flex items-center gap-2 px-5 py-3 rounded-full bg-amber-500 text-white shadow-lg active:scale-95 transition-transform"
            >
              <Star className="h-5 w-5" />
              <span className="font-semibold">Rate</span>
            </button>
          )}
        </div>
      )}

      {/* Intro Modal */}
      {showIntro && (
        <LeaderboardIntro 
          onComplete={handleIntroComplete}
          onRate={handleIntroRate}
          fraternities={fraternities}
        />
      )}
    </div>
  );
}
