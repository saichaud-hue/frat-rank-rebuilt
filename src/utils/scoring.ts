import type { Fraternity, Party, PartyRating, ReputationRating, PartyComment, FraternityComment } from '@/api/base44Client';

// ============================================
// B) PER-RATING PARTY QUALITY FORMULA
// ============================================

/**
 * Formula B: Compute party_quality_score from slider values
 * party_quality_score = 0.50*vibe + 0.30*music + 0.20*execution
 * Clamped to [0,10]
 */
export function computePartyQuality(
  vibe: number,
  music: number,
  execution: number
): number {
  const quality = 0.50 * vibe + 0.30 * music + 0.20 * execution;
  return Math.max(0, Math.min(10, quality));
}

/**
 * Compute combined reputation from 3 slider values (for ReputationRating)
 * 0.30*brotherhood + 0.60*reputation + 0.10*community
 */
export function computeCombinedReputation(
  brotherhood: number,
  reputation: number,
  community: number
): number {
  const combined = 0.30 * brotherhood + 0.60 * reputation + 0.10 * community;
  return Math.max(0, Math.min(10, combined));
}

// ============================================
// HELPER INTERFACES
// ============================================

export interface PartyWithRatings {
  party: Party;
  ratings: PartyRating[];
}

export interface ActivityData {
  repRatings: ReputationRating[];
  partyRatings: PartyRating[];
  parties: Party[];
  partyComments: PartyComment[];
  fratComments: FraternityComment[];
}

// ============================================
// C) PARTYINDEX FOR A FRATERNITY
// ============================================

/**
 * Formula C: Compute PartyIndex for a fraternity
 * 
 * For each party p:
 *   n_p = number of PartyRating rows for party p
 *   d_p = days since party (referenceDate - party.starts_at)
 *   avg_p = average of party_quality_score across ratings for party p
 *   w_p = ln(1 + n_p) * exp(-d_p / 30)
 * 
 * PartyIndex_f = Σ(avg_p * w_p) / Σ(w_p)
 * If Σ(w_p) = 0, default PartyIndex_f = 5.0
 */
export function computePartyIndex(
  partiesWithRatings: PartyWithRatings[],
  referenceDate: Date = new Date()
): number {
  if (partiesWithRatings.length === 0) return 5.0;

  let weightedSum = 0;
  let totalWeight = 0;

  for (const { party, ratings } of partiesWithRatings) {
    const n_p = ratings.length;
    if (n_p === 0) continue;

    // avg_p: average party_quality_score for this party
    const avg_p = ratings.reduce((sum, r) => sum + (r.party_quality_score ?? computePartyQuality(
      r.vibe_score ?? 5, r.music_score ?? 5, r.execution_score ?? 5
    )), 0) / n_p;

    // d_p: days since party
    const partyDate = new Date(party.starts_at);
    const d_p = Math.max(0, (referenceDate.getTime() - partyDate.getTime()) / (1000 * 60 * 60 * 24));

    // w_p: participation * time decay
    const w_p = Math.log(1 + n_p) * Math.exp(-d_p / 30);

    weightedSum += avg_p * w_p;
    totalWeight += w_p;
  }

  if (totalWeight === 0) return 5.0;
  return Math.max(0, Math.min(10, weightedSum / totalWeight));
}

// ============================================
// CAMPUS AVERAGES
// ============================================

/**
 * Compute campus-wide party average from ALL PartyRating rows
 * campusPartyAvg = average of party_quality_score across ALL PartyRating records
 */
export function computeCampusPartyAvg(allPartyRatings: PartyRating[]): number {
  if (allPartyRatings.length === 0) return 5.0;
  const sum = allPartyRatings.reduce((acc, r) => acc + (r.party_quality_score ?? computePartyQuality(
    r.vibe_score ?? 5, r.music_score ?? 5, r.execution_score ?? 5
  )), 0);
  return sum / allPartyRatings.length;
}

/**
 * Compute campus-wide reputation average from all fraternities
 */
export function computeCampusRepAvg(fraternities: Fraternity[]): number {
  if (fraternities.length === 0) return 5.0;
  const sum = fraternities.reduce((acc, f) => acc + (f.reputation_score ?? 5), 0);
  return sum / fraternities.length;
}

/**
 * Compute campus-wide reputation average from ALL ReputationRating rows
 */
export function computeCampusRepAvgFromRatings(allRepRatings: ReputationRating[]): number {
  if (allRepRatings.length === 0) return 5.0;
  const sum = allRepRatings.reduce((acc, r) => acc + (r.combined_score ?? 5), 0);
  return sum / allRepRatings.length;
}

// ============================================
// D) CONFIDENCE ADJUSTMENT FOR FRATERNITY PARTY SCORE
// ============================================

/**
 * Formula D: Adjusted party score for fraternity
 * 
 * nP_f = total number of PartyRating rows for frat f
 * cP_f = 1 - exp(-nP_f / 40)
 * PartyAdj_f = cP_f * PartyIndex_f + (1 - cP_f) * campusPartyAvg
 */
export function computePartyAdj(
  partyIndex: number,
  totalPartyRatings: number,
  campusPartyAvg: number
): number {
  const cP_f = 1 - Math.exp(-totalPartyRatings / 40);
  const partyAdj = cP_f * partyIndex + (1 - cP_f) * campusPartyAvg;
  return Math.max(0, Math.min(10, partyAdj));
}

// ============================================
// E) REPUTATION CONFIDENCE ADJUSTMENT
// ============================================

/**
 * Formula E: Adjusted reputation score for fraternity
 * 
 * R_f = average combined reputation rating
 * nR_f = number of ReputationRating rows for frat f
 * cR_f = 1 - exp(-nR_f / 25)
 * RepAdj_f = cR_f * R_f + (1 - cR_f) * campusRepAvg
 */
export function computeRepAdj(
  rawReputation: number,
  numRepRatings: number,
  campusRepAvg: number
): number {
  const cR_f = 1 - Math.exp(-numRepRatings / 25);
  const repAdj = cR_f * rawReputation + (1 - cR_f) * campusRepAvg;
  return Math.max(0, Math.min(10, repAdj));
}

// ============================================
// F) FINAL OVERALL FRATERNITY SCORE
// ============================================

/**
 * Formula F: Final Overall score
 * Overall_f = 0.65 * RepAdj_f + 0.35 * PartyAdj_f
 */
export function computeOverall(repAdj: number, partyAdj: number): number {
  const overall = 0.65 * repAdj + 0.35 * partyAdj;
  return Math.max(0, Math.min(10, overall));
}

// ============================================
// G) PER-PARTY OVERALL QUALITY DISPLAY
// ============================================

/**
 * Formula G: Per-party "Overall Party Quality" for display on PartyCard
 * 
 * For each party p in frat f:
 *   avg_p = average party_quality_score for party p
 *   n_p = number of ratings for party p
 *   baseline_f_excluding_p = average party_quality_score across frat f EXCLUDING party p
 *     If no remaining rows, baseline = 5.0
 *   c_p = 1 - exp(-n_p / 40)
 *   PartyOverall_p = c_p * avg_p + (1 - c_p) * baseline_f_excluding_p
 * 
 * IMPORTANT: Never uses campus-wide averages, only fraternity-scoped.
 */
export function computePartyOverallQuality(
  partyRatings: PartyRating[],
  fratRatingsExcludingParty: PartyRating[]
): number {
  const n_p = partyRatings.length;
  
  // If no ratings, return fraternity baseline or 5.0
  if (n_p === 0) {
    if (fratRatingsExcludingParty.length === 0) return 5.0;
    return fratRatingsExcludingParty.reduce((sum, r) => sum + (r.party_quality_score ?? computePartyQuality(
      r.vibe_score ?? 5, r.music_score ?? 5, r.execution_score ?? 5
    )), 0) / fratRatingsExcludingParty.length;
  }

  // avg_p: average party_quality_score for this party
  const avg_p = partyRatings.reduce((sum, r) => sum + (r.party_quality_score ?? computePartyQuality(
    r.vibe_score ?? 5, r.music_score ?? 5, r.execution_score ?? 5
  )), 0) / n_p;

  // baseline_f_excluding_p
  let baseline: number;
  if (fratRatingsExcludingParty.length === 0) {
    baseline = 5.0;
  } else {
    baseline = fratRatingsExcludingParty.reduce((sum, r) => sum + (r.party_quality_score ?? computePartyQuality(
      r.vibe_score ?? 5, r.music_score ?? 5, r.execution_score ?? 5
    )), 0) / fratRatingsExcludingParty.length;
  }

  // c_p: party confidence
  const c_p = 1 - Math.exp(-n_p / 40);

  // PartyOverall_p
  const partyOverall = c_p * avg_p + (1 - c_p) * baseline;

  // DEV debug logging
  if (import.meta.env.DEV) {
    console.log('[DEBUG G] PartyOverall:', {
      n_p,
      avg_p: avg_p.toFixed(2),
      baseline: baseline.toFixed(2),
      c_p: c_p.toFixed(4),
      partyOverall: partyOverall.toFixed(2),
    });
  }

  return Math.max(0, Math.min(10, partyOverall));
}

// ============================================
// TRENDING CALCULATION (Activity-Based)
// ============================================

export function computeActivityTrending(
  activityData: ActivityData,
  referenceDate: Date = new Date()
): number {
  const sevenDaysAgo = new Date(referenceDate.getTime() - 7 * 24 * 60 * 60 * 1000);
  
  const recentRepRatings = activityData.repRatings.filter(r => 
    new Date(r.created_date) >= sevenDaysAgo
  ).length;
  
  const recentPartyRatings = activityData.partyRatings.filter(r => 
    new Date(r.created_date) >= sevenDaysAgo
  ).length;
  
  const recentParties = activityData.parties.filter(p => 
    new Date(p.starts_at) >= sevenDaysAgo
  ).length;
  
  const recentPartyComments = activityData.partyComments.filter(c => 
    new Date(c.created_date) >= sevenDaysAgo
  ).length;
  
  const recentFratComments = activityData.fratComments.filter(c => 
    new Date(c.created_date) >= sevenDaysAgo
  ).length;
  
  const activityScore = 
    (recentParties * 3) + 
    (recentRepRatings * 2) + 
    (recentPartyRatings * 2) + 
    (recentPartyComments * 1) + 
    (recentFratComments * 1);
  
  return activityScore;
}

/**
 * Legacy trending calculation based on party index changes
 */
export function computeTrending(
  partiesWithRatings: PartyWithRatings[],
  referenceDate: Date = new Date()
): number {
  const index7 = computePartyIndexInWindow(partiesWithRatings, 7, referenceDate);
  const index60 = computePartyIndexInWindow(partiesWithRatings, 60, referenceDate);
  
  const sevenDaysAgo = new Date(referenceDate.getTime() - 7 * 24 * 60 * 60 * 1000);
  let recentRatings = 0;
  for (const { party, ratings } of partiesWithRatings) {
    const partyDate = new Date(party.starts_at);
    if (partyDate >= sevenDaysAgo) {
      recentRatings += ratings.length;
    }
  }
  
  const confidenceWeight = 1 - Math.exp(-recentRatings / 10);
  const rawTrending = index7 - index60;
  
  return rawTrending * confidenceWeight;
}

function computePartyIndexInWindow(
  partiesWithRatings: PartyWithRatings[],
  daysBack: number,
  referenceDate: Date = new Date()
): number {
  const windowStart = new Date(referenceDate.getTime() - daysBack * 24 * 60 * 60 * 1000);
  
  const filtered = partiesWithRatings.filter(({ party }) => {
    const partyDate = new Date(party.starts_at);
    return partyDate >= windowStart && partyDate <= referenceDate;
  });

  if (filtered.length === 0) return 5.0;
  return computePartyIndex(filtered, referenceDate);
}

// ============================================
// FULL SCORE COMPUTATION FOR A FRATERNITY
// ============================================

export interface FraternityScores {
  rawReputation: number;
  repAdj: number;
  partyIndex: number;
  partyAdj: number;
  overall: number;
  trending: number;
  activityTrending: number;
  numRepRatings: number;
  numPartyRatings: number;
  confidenceRep: number;
  confidenceParty: number;
  confidenceOverall: number;
  avgBrotherhood: number;
  avgReputation: number;
  avgCommunity: number;
  avgVibe: number;
  avgMusic: number;
  avgExecution: number;
}

/**
 * Compute all scores for a fraternity using exact formulas
 */
export async function computeFullFraternityScores(
  fraternity: Fraternity,
  repRatings: ReputationRating[],
  partiesWithRatings: PartyWithRatings[],
  campusRepAvg: number,
  campusPartyAvg: number,
  activityData?: ActivityData
): Promise<FraternityScores> {
  // Calculate individual reputation sub-score averages
  const avgBrotherhood = repRatings.length > 0
    ? repRatings.reduce((sum, r) => sum + (r.brotherhood_score ?? 5), 0) / repRatings.length
    : 5.0;
  const avgReputation = repRatings.length > 0
    ? repRatings.reduce((sum, r) => sum + (r.reputation_score ?? 5), 0) / repRatings.length
    : 5.0;
  const avgCommunity = repRatings.length > 0
    ? repRatings.reduce((sum, r) => sum + (r.community_score ?? 5), 0) / repRatings.length
    : 5.0;

  // Calculate individual party sub-score averages across all party ratings
  const allPartyRatings = partiesWithRatings.flatMap(pwr => pwr.ratings);
  const avgVibe = allPartyRatings.length > 0
    ? allPartyRatings.reduce((sum, r) => sum + (r.vibe_score ?? 5), 0) / allPartyRatings.length
    : 5.0;
  const avgMusic = allPartyRatings.length > 0
    ? allPartyRatings.reduce((sum, r) => sum + (r.music_score ?? 5), 0) / allPartyRatings.length
    : 5.0;
  const avgExecution = allPartyRatings.length > 0
    ? allPartyRatings.reduce((sum, r) => sum + (r.execution_score ?? 5), 0) / allPartyRatings.length
    : 5.0;

  // Raw reputation from combined scores (R_f)
  const rawReputation = repRatings.length > 0
    ? repRatings.reduce((sum, r) => sum + (r.combined_score ?? 5), 0) / repRatings.length
    : 5.0;
  
  const numRepRatings = repRatings.length;
  
  // Formula C: PartyIndex
  const partyIndex = computePartyIndex(partiesWithRatings);
  
  // Total party ratings count (nP_f)
  const numPartyRatings = allPartyRatings.length;
  
  // Confidence values
  const confidenceRep = 1 - Math.exp(-numRepRatings / 25);
  const confidenceParty = 1 - Math.exp(-numPartyRatings / 40);
  const confidenceOverall = 0.65 * confidenceRep + 0.35 * confidenceParty;
  
  // Formula D: PartyAdj
  const partyAdj = computePartyAdj(partyIndex, numPartyRatings, campusPartyAvg);
  
  // Formula E: RepAdj
  const repAdj = computeRepAdj(rawReputation, numRepRatings, campusRepAvg);
  
  // Formula F: Overall
  const overall = computeOverall(repAdj, partyAdj);
  
  // Trending
  const trending = computeTrending(partiesWithRatings);
  const activityTrending = activityData 
    ? computeActivityTrending(activityData)
    : 0;

  // DEV debug logging (Formula K)
  if (import.meta.env.DEV) {
    console.log(`[DEBUG D/F] Fraternity: ${fraternity.name}`, {
      nP_f: numPartyRatings,
      partyIndex: partyIndex.toFixed(2),
      campusPartyAvg: campusPartyAvg.toFixed(2),
      cP_f: confidenceParty.toFixed(4),
      partyAdj: partyAdj.toFixed(2),
      nR_f: numRepRatings,
      rawRep: rawReputation.toFixed(2),
      campusRepAvg: campusRepAvg.toFixed(2),
      cR_f: confidenceRep.toFixed(4),
      repAdj: repAdj.toFixed(2),
      overall: overall.toFixed(2),
    });
  }
  
  return {
    rawReputation,
    repAdj,
    partyIndex,
    partyAdj,
    overall,
    trending,
    activityTrending,
    numRepRatings,
    numPartyRatings,
    confidenceRep,
    confidenceParty,
    confidenceOverall,
    avgBrotherhood,
    avgReputation,
    avgCommunity,
    avgVibe,
    avgMusic,
    avgExecution,
  };
}

// ============================================
// SORTING UTILITIES
// ============================================

export interface FraternityWithScores extends Fraternity {
  computedScores?: FraternityScores;
}

export function sortFraternitiesByOverall(frats: FraternityWithScores[]): FraternityWithScores[] {
  return [...frats].sort((a, b) => {
    const overallA = a.computedScores?.overall ?? 5;
    const overallB = b.computedScores?.overall ?? 5;
    if (overallB !== overallA) return overallB - overallA;
    return (a.chapter ?? '').localeCompare(b.chapter ?? '');
  });
}

export function sortFraternitiesByReputation(frats: FraternityWithScores[]): FraternityWithScores[] {
  return [...frats].sort((a, b) => {
    const repA = a.computedScores?.repAdj ?? 5;
    const repB = b.computedScores?.repAdj ?? 5;
    if (repB !== repA) return repB - repA;
    return (a.chapter ?? '').localeCompare(b.chapter ?? '');
  });
}

export function sortFraternitiesByParty(frats: FraternityWithScores[]): FraternityWithScores[] {
  return [...frats].sort((a, b) => {
    const partyA = a.computedScores?.partyAdj ?? 5;
    const partyB = b.computedScores?.partyAdj ?? 5;
    if (partyB !== partyA) return partyB - partyA;
    return (a.chapter ?? '').localeCompare(b.chapter ?? '');
  });
}

export function sortFraternitiesByTrending(frats: FraternityWithScores[]): FraternityWithScores[] {
  return [...frats].sort((a, b) => {
    const trendA = a.computedScores?.activityTrending ?? 0;
    const trendB = b.computedScores?.activityTrending ?? 0;
    if (trendB !== trendA) return trendB - trendA;
    return (a.chapter ?? '').localeCompare(b.chapter ?? '');
  });
}

// ============================================
// LEGACY COMPATIBILITY (avoid breaking imports)
// ============================================

export function getReputationScore(frat: Fraternity): number {
  return frat.reputation_score ?? 5.0;
}

export function getPartyScore(frat: Fraternity): number {
  return frat.historical_party_score ?? 5.0;
}

// Alias for backward compatibility
export const computeCampusPartyAvgFromRatings = computeCampusPartyAvg;
