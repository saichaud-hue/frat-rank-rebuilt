import { useState, useEffect } from 'react';
import { 
  fraternityQueries, 
  partyQueries, 
  partyRatingQueries, 
  reputationRatingQueries,
  partyCommentQueries,
  fraternityCommentQueries,
  getCurrentUser,
  type Fraternity,
  type Party,
  type PartyRating,
  type ReputationRating,
  type PartyComment,
  type FraternityComment,
} from '@/lib/supabase-data';
import { recordUserAction } from '@/utils/streak';
import { 
  computeFullFraternityScores, 
  computeCampusRepAvg, 
  computeCampusPartyAvg,
  sortFraternitiesByOverall,
  sortFraternitiesByReputation,
  sortFraternitiesByParty,
  sortFraternitiesByTrending,
  type FraternityWithScores,
  type PartyWithRatings,
  type ActivityData,
  getCachedCampusBaseline,
} from '@/utils/scoring';
import LeaderboardHeader from '@/components/leaderboard/LeaderboardHeader';
import LeaderboardRow from '@/components/leaderboard/LeaderboardRow';
import RateFratSheet from '@/components/leaderboard/RateFratSheet';
import RateActionSheet from '@/components/leaderboard/RateActionSheet';
import LeaderboardIntro from '@/components/onboarding/LeaderboardIntro';
import PartyRatingForm from '@/components/rate/PartyRatingForm';
import { Skeleton } from '@/components/ui/skeleton';
import { clamp } from '@/utils';
import { ensureAuthed } from '@/utils/auth';
import { Star, PartyPopper, X, Plus, ArrowUpDown, Search } from 'lucide-react';

type FilterType = 'overall' | 'reputation' | 'party' | 'trending';
type DisplayMode = 'rank' | 'classification';

// Tier classifications based on rank (1-10 tiers) - with color blocks
const getTierFromRank = (rank: number, total: number): { name: string; abbrev: string; color: string; bgColor: string; rankBg: string; rowBg: string } => {
  const percentile = (rank - 1) / Math.max(total - 1, 1);
  
  if (percentile < 0.1) return { name: 'Upper Touse', abbrev: 'UT', color: 'text-primary', bgColor: 'bg-primary/10 border-primary/30', rankBg: 'bg-emerald-500 text-white', rowBg: 'bg-emerald-50' };
  if (percentile < 0.2) return { name: 'Touse', abbrev: 'T', color: 'text-primary/80', bgColor: 'bg-primary/8 border-primary/20', rankBg: 'bg-emerald-400 text-white', rowBg: 'bg-emerald-50/70' };
  if (percentile < 0.3) return { name: 'Lower Touse', abbrev: 'LT', color: 'text-primary/70', bgColor: 'bg-primary/5 border-primary/15', rankBg: 'bg-green-400 text-white', rowBg: 'bg-green-50/60' };
  if (percentile < 0.4) return { name: 'Upper Mouse', abbrev: 'UM', color: 'text-foreground/80', bgColor: 'bg-muted border-border', rankBg: 'bg-lime-400 text-white', rowBg: 'bg-lime-50/50' };
  if (percentile < 0.5) return { name: 'Mouse', abbrev: 'M', color: 'text-foreground/70', bgColor: 'bg-muted/80 border-border/80', rankBg: 'bg-yellow-400 text-white', rowBg: 'bg-yellow-50/50' };
  if (percentile < 0.6) return { name: 'Lower Mouse', abbrev: 'LM', color: 'text-muted-foreground', bgColor: 'bg-muted/60 border-border/60', rankBg: 'bg-amber-300 text-amber-900', rowBg: 'bg-amber-50/40' };
  if (percentile < 0.7) return { name: 'Upper Bouse', abbrev: 'UB', color: 'text-muted-foreground/80', bgColor: 'bg-muted/40 border-border/40', rankBg: 'bg-orange-200 text-orange-800', rowBg: 'bg-orange-50/30' };
  if (percentile < 0.8) return { name: 'Bouse', abbrev: 'B', color: 'text-muted-foreground/70', bgColor: 'bg-muted/30 border-border/30', rankBg: 'bg-orange-100 text-orange-700', rowBg: 'bg-stone-50/30' };
  if (percentile < 0.9) return { name: 'Lower Bouse', abbrev: 'LB', color: 'text-muted-foreground/60', bgColor: 'bg-muted/20 border-border/20', rankBg: 'bg-stone-200 text-stone-600', rowBg: 'bg-stone-50/20' };
  return { name: 'The Pit', abbrev: '💀', color: 'text-muted-foreground/50', bgColor: 'bg-muted/10 border-border/10', rankBg: 'bg-stone-100 text-stone-500', rowBg: '' };
};

// Adapter to convert Supabase types to scoring types
const adaptFraternityForScoring = (f: Fraternity): any => ({
  ...f,
  created_date: f.created_at,
});

const adaptPartyForScoring = (p: Party): any => ({
  ...p,
  created_date: p.created_at,
  fraternity_id: p.fraternity_id || '',
});

const adaptPartyRatingForScoring = (r: PartyRating): any => ({
  ...r,
  created_date: r.created_at,
});

const adaptReputationRatingForScoring = (r: ReputationRating): any => ({
  ...r,
  created_date: r.created_at,
});

const adaptPartyCommentForScoring = (c: PartyComment): any => ({
  ...c,
  created_date: c.created_at,
});

const adaptFraternityCommentForScoring = (c: FraternityComment): any => ({
  ...c,
  created_date: c.created_at,
});

export default function Leaderboard() {
  const [allFraternities, setAllFraternities] = useState<FraternityWithScores[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFrat, setSelectedFrat] = useState<Fraternity | null>(null);
  const [existingScores, setExistingScores] = useState<{ brotherhood: number; reputation: number; community: number } | undefined>();
  const [showIntro, setShowIntro] = useState(() => {
    return !localStorage.getItem('fratrank_leaderboard_intro_never_show');
  });
  const [showRateAction, setShowRateAction] = useState<'rate' | 'parties' | false>(false);
  const [rateExpanded, setRateExpanded] = useState(false);
  const [selectedParty, setSelectedParty] = useState<Party | null>(null);
  const [filter, setFilter] = useState<FilterType>('overall');
  const [displayMode, setDisplayMode] = useState<DisplayMode>('rank');

  const handleIntroComplete = (neverShowAgain: boolean) => {
    if (neverShowAgain) {
      localStorage.setItem('fratrank_leaderboard_intro_never_show', 'true');
    }
    setShowIntro(false);
  };

  const handleIntroRate = (fraternity: any) => {
    handleRate(fraternity);
  };

  useEffect(() => {
    loadFraternities();
  }, []);

  const loadFraternities = async () => {
    try {
      const [fratsData, partiesData, allPartyRatings, allRepRatings, allPartyComments, allFratComments] = await Promise.all([
        fraternityQueries.listActive(),
        partyQueries.list(),
        partyRatingQueries.list(),
        reputationRatingQueries.list(),
        partyCommentQueries.list(),
        fraternityCommentQueries.list(),
      ]);

      // Adapt data for scoring functions
      const adaptedFrats = fratsData.map(adaptFraternityForScoring);
      const adaptedPartyRatings = allPartyRatings.map(adaptPartyRatingForScoring);

      const campusRepAvg = computeCampusRepAvg(adaptedFrats);
      const campusPartyAvg = computeCampusPartyAvg(adaptedPartyRatings);

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

      const partyCommentsByParty = new Map<string, PartyComment[]>();
      for (const comment of allPartyComments) {
        if (comment.party_id) {
          const existing = partyCommentsByParty.get(comment.party_id) || [];
          existing.push(comment);
          partyCommentsByParty.set(comment.party_id, existing);
        }
      }

      const fratCommentsByFrat = new Map<string, FraternityComment[]>();
      for (const comment of allFratComments) {
        if (comment.fraternity_id) {
          const existing = fratCommentsByFrat.get(comment.fraternity_id) || [];
          existing.push(comment);
          fratCommentsByFrat.set(comment.fraternity_id, existing);
        }
      }

      const allPartiesWithRatings: PartyWithRatings[] = partiesData.map(party => ({
        party: adaptPartyForScoring(party),
        ratings: (partyRatingsMap.get(party.id) || []).map(adaptPartyRatingForScoring),
      }));

      const fratsWithScores: FraternityWithScores[] = await Promise.all(
        fratsData.map(async (frat) => {
          const fratParties = partiesByFrat.get(frat.id) || [];
          const partiesWithRatings: PartyWithRatings[] = fratParties.map(party => ({
            party: adaptPartyForScoring(party),
            ratings: (partyRatingsMap.get(party.id) || []).map(adaptPartyRatingForScoring),
          }));
          const repRatings = (repRatingsByFrat.get(frat.id) || []).map(adaptReputationRatingForScoring);
          const fratPartyRatings = fratParties.flatMap(p => (partyRatingsMap.get(p.id) || []).map(adaptPartyRatingForScoring));
          const fratPartyComments = fratParties.flatMap(p => (partyCommentsByParty.get(p.id) || []).map(adaptPartyCommentForScoring));
          
          const activityData: ActivityData = {
            repRatings,
            partyRatings: fratPartyRatings,
            parties: fratParties.map(adaptPartyForScoring),
            partyComments: fratPartyComments,
            fratComments: (fratCommentsByFrat.get(frat.id) || []).map(adaptFraternityCommentForScoring),
          };

          const campusBaseline = getCachedCampusBaseline(allPartiesWithRatings);

          const scores = await computeFullFraternityScores(
            adaptFraternityForScoring(frat),
            repRatings,
            partiesWithRatings,
            campusRepAvg,
            campusPartyAvg,
            activityData,
            campusBaseline
          );

          return { ...adaptFraternityForScoring(frat), computedScores: scores };
        })
      );

      setAllFraternities(fratsWithScores);
    } catch (error) {
      console.error('Failed to load fraternities:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRate = async (fraternity: any) => {
    const user = await ensureAuthed();
    if (!user) return;

    const existingRating = await reputationRatingQueries.getByUserAndFraternity(user.id, fraternity.id);

    if (existingRating) {
      setExistingScores({
        brotherhood: existingRating.brotherhood_score ?? 5,
        reputation: existingRating.reputation_score ?? 5,
        community: existingRating.community_score ?? 5,
      });
    } else {
      setExistingScores(undefined);
    }
    setSelectedFrat(fraternity);
  };

  const handleRateSubmit = async (scores: { brotherhood: number; reputation: number; community: number; combined: number }) => {
    if (!selectedFrat) return;

    const user = await getCurrentUser();
    if (!user) return;

    await reputationRatingQueries.upsert({
      fraternity_id: selectedFrat.id,
      user_id: user.id,
      brotherhood_score: scores.brotherhood,
      reputation_score: scores.reputation,
      community_score: scores.community,
      combined_score: scores.combined,
      weight: 1,
      semester: 'Fall 2024',
    });

    // Recalculate fraternity reputation score
    const allRatings = await reputationRatingQueries.listByFraternity(selectedFrat.id);
    const reputationScore = allRatings.length > 0
      ? allRatings.reduce((sum, r) => sum + (r.combined_score ?? 5), 0) / allRatings.length
      : 5;

    await fraternityQueries.update(selectedFrat.id, {
      reputation_score: clamp(reputationScore, 0, 10),
    });

    await recordUserAction();
    await loadFraternities();
  };

  const handleRateParty = async (party: any) => {
    const user = await ensureAuthed();
    if (!user) return;
    setSelectedParty(party);
  };

  const handlePartyRatingSubmit = async () => {
    setSelectedParty(null);
    await loadFraternities();
  };

  // Get sorted list based on current filter
  const getSortedFraternities = (): FraternityWithScores[] => {
    const copy = [...allFraternities];
    switch (filter) {
      case 'overall': return sortFraternitiesByOverall(copy);
      case 'reputation': return sortFraternitiesByReputation(copy);
      case 'party': return sortFraternitiesByParty(copy);
      case 'trending': return sortFraternitiesByTrending(copy);
      default: return copy;
    }
  };

  const sortedFraternities = getSortedFraternities();

  if (loading) {
    return (
      <div className="space-y-6 px-4">
        <div className="space-y-2">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-4 w-24" />
        </div>
        <div className="flex gap-2">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-9 w-16 rounded-full" />
          ))}
        </div>
        <div className="space-y-1">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="flex items-center gap-4 py-4">
              <Skeleton className="h-4 w-6" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-5 w-40" />
                <Skeleton className="h-4 w-24" />
              </div>
              <Skeleton className="h-12 w-12 rounded-full" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="pb-28">
      {/* Header */}
      <div className="px-4 pt-2">
        <LeaderboardHeader
          filter={filter}
          onFilterChange={setFilter}
          campusName="Duke University"
        />
      </div>

      {/* Sort indicator / Display mode toggle */}
      <div className="flex items-center justify-between px-4 mt-6 mb-2">
        <button 
          onClick={() => setDisplayMode(prev => prev === 'rank' ? 'classification' : 'rank')}
          className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-all active:scale-95"
        >
          <ArrowUpDown className="h-3.5 w-3.5" />
          <span>{displayMode === 'rank' ? 'Rank' : 'Classification'}</span>
          {displayMode === 'classification' && <span className="text-xs">✨</span>}
        </button>
        <button className="p-2 -mr-2 text-muted-foreground hover:text-foreground transition-colors">
          <Search className="h-4 w-4" />
        </button>
      </div>

      {/* Divider */}
      <div className="mx-4 border-t border-border" />

      {/* Leaderboard List */}
      <div className="px-4">
        {sortedFraternities.map((frat, index) => (
          <div key={frat.id}>
            <LeaderboardRow
              fraternity={frat}
              rank={index + 1}
              filter={filter}
              displayMode={displayMode === 'rank' ? 'score' : 'vibes'}
              tierInfo={displayMode === 'classification' ? getTierFromRank(index + 1, sortedFraternities.length) : undefined}
            />
            {index < sortedFraternities.length - 1 && (
              <div className="border-t border-border/50" />
            )}
          </div>
        ))}
      </div>

      <RateFratSheet
        fraternity={selectedFrat as any}
        isOpen={!!selectedFrat}
        onClose={() => setSelectedFrat(null)}
        onSubmit={handleRateSubmit}
        existingScores={existingScores}
      />

      <RateActionSheet
        isOpen={showRateAction !== false}
        onClose={() => setShowRateAction(false)}
        onRateFrat={handleRate}
        onRateParty={handleRateParty}
        fraternities={allFraternities}
        initialAction={showRateAction || undefined}
      />

      {selectedParty && (
        <PartyRatingForm
          party={selectedParty as any}
          onClose={() => setSelectedParty(null)}
          onSubmit={handlePartyRatingSubmit}
        />
      )}

      {/* Floating Rate Buttons */}
      {!showIntro && !selectedFrat && !selectedParty && showRateAction === false && (
        <div 
          className="fixed bottom-24 right-4 z-50 flex items-center gap-2"
          style={{ marginBottom: 'env(safe-area-inset-bottom)' }}
        >
          {rateExpanded ? (
            <>
              <button
                onClick={() => { setShowRateAction('parties'); setRateExpanded(false); }}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-full bg-foreground text-background shadow-lg active:scale-95 transition-all animate-scale-in"
              >
                <PartyPopper className="h-4 w-4" />
                <span className="font-medium text-sm">Party</span>
              </button>
              <button
                onClick={() => { setShowRateAction('rate'); setRateExpanded(false); }}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-full bg-foreground text-background shadow-lg active:scale-95 transition-all animate-scale-in"
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
              className="flex items-center gap-2 px-5 py-3 rounded-full bg-foreground text-background shadow-lg active:scale-95 transition-transform hover:shadow-xl"
            >
              <Plus className="h-5 w-5" />
              <span className="font-bold">Rate</span>
            </button>
          )}
        </div>
      )}

      {showIntro && (
        <LeaderboardIntro 
          onComplete={handleIntroComplete}
          onRate={handleIntroRate}
          fraternities={allFraternities}
        />
      )}
    </div>
  );
}
