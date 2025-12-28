import type { Fraternity, Party, PartyRating, ReputationRating, PartyComment, FraternityComment } from '@/api/base44Client';

// ============================================
// COMPONENT SCORE FORMULAS
// ============================================

// Compute combined reputation from 3 slider values
export function computeCombinedReputation(
  brotherhood: number,
  reputation: number,
  community: number
): number {
  const combined = 0.30 * brotherhood + 0.60 * reputation + 0.10 * community;
  return Math.max(0, Math.min(10, combined));
}

// Compute party quality from 3 slider values: Vibe 50%, Music 30%, Execution 20%
export function computePartyQuality(
  vibe: number,
  music: number,
  execution: number
): number {
  const quality = 0.50 * vibe + 0.30 * music + 0.20 * execution;
  return Math.max(0, Math.min(10, quality));
}

// ============================================
// BASIC GETTERS (legacy compatibility)
// ============================================

export function getPartyQualityScore(party: Party): number {
  return party.performance_score ?? 5.0;
}

export function getReputationScore(frat: Fraternity): number {
  return frat.reputation_score ?? 5.0;
}

export function getPartyScore(frat: Fraternity): number {
  return frat.historical_party_score ?? 5.0;
}

// ============================================
// PARTY INDEX CALCULATION (Step A)
// ============================================

export interface PartyWithRatings {
  party: Party;
  ratings: PartyRating[];
}

/**
 * Compute PartyIndex for a fraternity using recency + participation weighting
 * weight_p = ln(1 + n_p) * exp(-d_p / 30)
 */
export function computePartyIndex(
  partiesWithRatings: PartyWithRatings[],
  referenceDate: Date = new Date()
): number {
  if (partiesWithRatings.length === 0) return 5.0;

  let weightedSum = 0;
  let totalWeight = 0;

  for (const { party, ratings } of partiesWithRatings) {
    if (ratings.length === 0) continue;

    const n_p = ratings.length;
    const partyDate = new Date(party.starts_at);
    const d_p = Math.max(0, (referenceDate.getTime() - partyDate.getTime()) / (1000 * 60 * 60 * 24));
    
    // weight_p = ln(1 + n_p) * exp(-d_p / 30)
    const weight_p = Math.log(1 + n_p) * Math.exp(-d_p / 30);
    
    // Average party quality score for this party
    const avgQuality = ratings.reduce((sum, r) => sum + (r.party_quality_score ?? 5), 0) / n_p;
    
    weightedSum += avgQuality * weight_p;
    totalWeight += weight_p;
  }

  if (totalWeight === 0) return 5.0;
  return Math.max(0, Math.min(10, weightedSum / totalWeight));
}

/**
 * Compute PartyIndex for a specific time window (for trending)
 */
export function computePartyIndexInWindow(
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
// CONFIDENCE STABILIZATION (Step B)
// ============================================

/**
 * Apply confidence stabilization to reputation score
 * cR = 1 - exp(-nR_f / 25)
 * RepAdj_f = (cR * R_f) + ((1-cR) * campusRepAvg)
 */
export function computeAdjustedReputation(
  rawReputation: number,
  numRatings: number,
  campusRepAvg: number
): number {
  const cR = 1 - Math.exp(-numRatings / 25);
  const repAdj = cR * rawReputation + (1 - cR) * campusRepAvg;
  return Math.max(0, Math.min(10, repAdj));
}

/**
 * Apply confidence stabilization to party index
 * cP = 1 - exp(-nP_f / 40)
 * PartyAdj_f = (cP * PartyIndex_f) + ((1-cP) * campusPartyAvg)
 */
export function computeAdjustedPartyIndex(
  partyIndex: number,
  totalPartyRatings: number,
  campusPartyAvg: number
): number {
  const cP = 1 - Math.exp(-totalPartyRatings / 40);
  const partyAdj = cP * partyIndex + (1 - cP) * campusPartyAvg;
  return Math.max(0, Math.min(10, partyAdj));
}

// ============================================
// FINAL OVERALL SCORE (Step C)
// ============================================

/**
 * Compute final overall score
 * Overall_f = 0.65 * RepAdj_f + 0.35 * PartyAdj_f
 */
export function computeFinalOverall(
  repAdj: number,
  partyAdj: number
): number {
  const overall = 0.65 * repAdj + 0.35 * partyAdj;
  return Math.max(0, Math.min(10, overall));
}

// ============================================
// TRENDING CALCULATION (Step E) - Activity-Based
// ============================================

export interface ActivityData {
  repRatings: ReputationRating[];
  partyRatings: PartyRating[];
  parties: Party[];
  partyComments: PartyComment[];
  fratComments: FraternityComment[];
}

/**
 * Compute trending score based on recent activity
 * Counts all activity in the last 7 days:
 * - Reputation ratings
 * - Party ratings  
 * - Parties created
 * - Party comments
 * - Fraternity comments
 */
export function computeActivityTrending(
  activityData: ActivityData,
  referenceDate: Date = new Date()
): number {
  const sevenDaysAgo = new Date(referenceDate.getTime() - 7 * 24 * 60 * 60 * 1000);
  
  // Count reputation ratings in last 7 days
  const recentRepRatings = activityData.repRatings.filter(r => 
    new Date(r.created_date) >= sevenDaysAgo
  ).length;
  
  // Count party ratings in last 7 days
  const recentPartyRatings = activityData.partyRatings.filter(r => 
    new Date(r.created_date) >= sevenDaysAgo
  ).length;
  
  // Count parties in last 7 days
  const recentParties = activityData.parties.filter(p => 
    new Date(p.starts_at) >= sevenDaysAgo
  ).length;
  
  // Count party comments in last 7 days
  const recentPartyComments = activityData.partyComments.filter(c => 
    new Date(c.created_date) >= sevenDaysAgo
  ).length;
  
  // Count fraternity comments in last 7 days
  const recentFratComments = activityData.fratComments.filter(c => 
    new Date(c.created_date) >= sevenDaysAgo
  ).length;
  
  // Total activity score (weighted)
  // Parties: 3 points each (big events)
  // Ratings: 2 points each (engagement)
  // Comments: 1 point each (discussion)
  const activityScore = 
    (recentParties * 3) + 
    (recentRepRatings * 2) + 
    (recentPartyRatings * 2) + 
    (recentPartyComments * 1) + 
    (recentFratComments * 1);
  
  return activityScore;
}

/**
 * Legacy trending calculation for backward compatibility
 * Trending_f = PartyIndex_7days - PartyIndex_60days
 */
export function computeTrending(
  partiesWithRatings: PartyWithRatings[],
  referenceDate: Date = new Date()
): number {
  const index7 = computePartyIndexInWindow(partiesWithRatings, 7, referenceDate);
  const index60 = computePartyIndexInWindow(partiesWithRatings, 60, referenceDate);
  
  // Count ratings in last 7 days for confidence weighting
  const sevenDaysAgo = new Date(referenceDate.getTime() - 7 * 24 * 60 * 60 * 1000);
  let recentRatings = 0;
  for (const { party, ratings } of partiesWithRatings) {
    const partyDate = new Date(party.starts_at);
    if (partyDate >= sevenDaysAgo) {
      recentRatings += ratings.length;
    }
  }
  
  // Confidence weight: more ratings = more confident in trending
  const confidenceWeight = 1 - Math.exp(-recentRatings / 10);
  const rawTrending = index7 - index60;
  
  return rawTrending * confidenceWeight;
}

// ============================================
// CAMPUS AVERAGES
// ============================================

export function computeCampusRepAvg(fraternities: Fraternity[]): number {
  if (fraternities.length === 0) return 5.0;
  const sum = fraternities.reduce((acc, f) => acc + (f.reputation_score ?? 5), 0);
  return sum / fraternities.length;
}

export function computeCampusPartyAvg(parties: Party[]): number {
  // Deprecated for scoring baselines: Party.performance_score may be user/feature-updated.
  // Kept for backward compatibility, but prefer computeCampusPartyAvgFromRatings.
  if (parties.length === 0) return 5.0;
  const sum = parties.reduce((acc, p) => acc + (p.performance_score ?? 5), 0);
  return sum / parties.length;
}

/**
 * Stable campus party baseline derived from ALL PartyRating records.
 * This avoids pollution from any cached Party score fields.
 */
export function computeCampusPartyAvgFromRatings(allPartyRatings: PartyRating[]): number {
  if (allPartyRatings.length === 0) return 5.0;
  const sum = allPartyRatings.reduce((acc, r) => acc + (r.party_quality_score ?? 5), 0);
  return sum / allPartyRatings.length;
}

// ============================================
// PER-PARTY OVERALL QUALITY (Single Source of Truth)
// ============================================

/**
 * Compute the fraternity-scoped baseline for party quality.
 * This baseline is ONLY influenced by ratings within this fraternity's parties.
 * 
 * @param partiesWithRatings - All parties with their ratings for a single fraternity
 * @returns Baseline score (average of party_quality_score, or 5.0 if no ratings)
 */
export function computeFraternityPartyBaseline(
  partiesWithRatings: PartyWithRatings[],
  excludePartyId?: string
): number {
  // Collect all party ratings for this fraternity (optionally excluding a single party)
  const allRatings: PartyRating[] = [];
  for (const { party, ratings } of partiesWithRatings) {
    if (excludePartyId && party.id === excludePartyId) continue;
    allRatings.push(...ratings);
  }
  
  if (allRatings.length === 0) {
    return 5.0; // Neutral default when no baseline ratings exist
  }
  
  // Simple average of party quality scores for this fraternity
  const sum = allRatings.reduce((acc, r) => acc + (r.party_quality_score ?? 5), 0);
  return sum / allRatings.length;
}

/**
 * Compute the confidence-adjusted overall party quality for a single party.
 * This is the CANONICAL function - use this everywhere party quality is displayed.
 * 
 * Formula: cP = 1 - exp(-n/40), then adjustedQuality = cP * avgQuality + (1-cP) * fratBaseline
 * Uses the SAME confidence denominator (/40) as computeAdjustedPartyIndex for consistency.
 * 
 * IMPORTANT: Uses fraternity-scoped baseline, NOT campus-wide average.
 * This ensures rating one fraternity's party doesn't affect other fraternities' scores.
 * 
 * @param ratings - All ratings for this party
 * @param fratBaseline - Fraternity-specific baseline (from computeFraternityPartyBaseline)
 * @returns Confidence-adjusted overall party quality score
 */
export function computePartyOverallQuality(
  ratings: PartyRating[],
  fratBaseline: number
): number {
  if (ratings.length === 0) {
    return fratBaseline;
  }
  
  // Average party quality from all ratings for this party
  const avgQuality = ratings.reduce((sum, r) => sum + (r.party_quality_score ?? 5), 0) / ratings.length;
  
  // Apply confidence adjustment: cP = 1 - exp(-n/40) - SAME denominator as fraternity-level party index
  const confidence = 1 - Math.exp(-ratings.length / 40);
  const adjustedQuality = confidence * avgQuality + (1 - confidence) * fratBaseline;
  
  return Math.max(0, Math.min(10, adjustedQuality));
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
  activityTrending: number; // New activity-based trending
  numRepRatings: number;
  numPartyRatings: number;
  confidenceRep: number;
  confidenceParty: number;
  confidenceOverall: number;
  // Individual reputation sub-scores (averages)
  avgBrotherhood: number;
  avgReputation: number;
  avgCommunity: number;
  // Individual party sub-scores (averages)
  avgVibe: number;
  avgMusic: number;
  avgExecution: number;
}

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

  // Raw reputation from combined scores
  const rawReputation = repRatings.length > 0
    ? repRatings.reduce((sum, r) => sum + (r.combined_score ?? 5), 0) / repRatings.length
    : 5.0;
  
  const numRepRatings = repRatings.length;
  
  // Party index with recency weighting
  const partyIndex = computePartyIndex(partiesWithRatings);
  
  // Total party ratings count
  const numPartyRatings = partiesWithRatings.reduce(
    (sum, pwr) => sum + pwr.ratings.length, 
    0
  );
  
  // Confidence values
  const confidenceRep = 1 - Math.exp(-numRepRatings / 25);
  const confidenceParty = 1 - Math.exp(-numPartyRatings / 40);
  const confidenceOverall = 0.65 * confidenceRep + 0.35 * confidenceParty;
  
  // Apply confidence stabilization
  const repAdj = computeAdjustedReputation(rawReputation, numRepRatings, campusRepAvg);
  const partyAdj = computeAdjustedPartyIndex(partyIndex, numPartyRatings, campusPartyAvg);
  
  // Final overall
  const overall = computeFinalOverall(repAdj, partyAdj);
  
  // Trending (legacy)
  const trending = computeTrending(partiesWithRatings);
  
  // Activity-based trending (new)
  const activityTrending = activityData 
    ? computeActivityTrending(activityData)
    : 0;
  
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
// LEGACY SIMPLE GETTERS (for backward compat)
// ============================================

export function getOverallScore(frat: Fraternity): number {
  // Legacy: use stored scores if available
  const reputation = getReputationScore(frat);
  const party = getPartyScore(frat);
  const overall = 0.65 * reputation + 0.35 * party;
  return Math.max(0, Math.min(10, overall));
}

// ============================================
// SORTING UTILITIES
// ============================================

export interface FraternityWithScores extends Fraternity {
  computedScores?: FraternityScores;
}

export function sortFraternitiesByOverall(frats: FraternityWithScores[]): FraternityWithScores[] {
  return [...frats].sort((a, b) => {
    const overallA = a.computedScores?.overall ?? getOverallScore(a);
    const overallB = b.computedScores?.overall ?? getOverallScore(b);
    if (overallB !== overallA) return overallB - overallA;
    return (a.chapter ?? '').localeCompare(b.chapter ?? '');
  });
}

export function sortFraternitiesByReputation(frats: FraternityWithScores[]): FraternityWithScores[] {
  return [...frats].sort((a, b) => {
    const repA = a.computedScores?.repAdj ?? getReputationScore(a);
    const repB = b.computedScores?.repAdj ?? getReputationScore(b);
    if (repB !== repA) return repB - repA;
    return (a.chapter ?? '').localeCompare(b.chapter ?? '');
  });
}

export function sortFraternitiesByParty(frats: FraternityWithScores[]): FraternityWithScores[] {
  return [...frats].sort((a, b) => {
    const partyA = a.computedScores?.partyAdj ?? getPartyScore(a);
    const partyB = b.computedScores?.partyAdj ?? getPartyScore(b);
    if (partyB !== partyA) return partyB - partyA;
    return (a.chapter ?? '').localeCompare(b.chapter ?? '');
  });
}

export function sortFraternitiesByTrending(frats: FraternityWithScores[]): FraternityWithScores[] {
  return [...frats].sort((a, b) => {
    // Use activity-based trending for sorting
    const trendA = a.computedScores?.activityTrending ?? 0;
    const trendB = b.computedScores?.activityTrending ?? 0;
    if (trendB !== trendA) return trendB - trendA;
    // Tiebreaker: overall score
    const overallA = a.computedScores?.overall ?? getOverallScore(a);
    const overallB = b.computedScores?.overall ?? getOverallScore(b);
    return overallB - overallA;
  });
}

export function sortPartiesByQuality(parties: Party[]): Party[] {
  return [...parties].sort((a, b) => {
    const qualityA = getPartyQualityScore(a);
    const qualityB = getPartyQualityScore(b);
    return qualityB - qualityA;
  });
}
