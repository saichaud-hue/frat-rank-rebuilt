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
// CAMPUS-WIDE BASELINE (ELEMENT 1 DEPENDENCY)
// ============================================

/**
 * Compute campus-wide baseline party quality B_campus
 * 
 * For all parties p in current semester with at least 1 rating:
 *   PartyQuality_p = 0.50*avgVibe + 0.30*avgMusic + 0.20*avgExecution
 *   w_p = ln(1 + n_p)
 * 
 * B_campus = Σ(PartyQuality_p * w_p) / Σ(w_p)
 * Fallback: 5.5 if no rated parties
 *//**
 * Computes the campus-wide baseline party score.
 * Uses weighted average of party quality.
 * Fallback = 5.5 if no rated parties exist.
 */
export function computeCampusBaseline(
  allPartiesWithRatings: PartyWithRatings[]
): number {
  let weightedSum = 0;
  let totalWeight = 0;

  for (const { ratings } of allPartiesWithRatings) {
    const n_p = ratings.length;
    if (n_p === 0) continue;

    const avgVibe =
      ratings.reduce((sum, r) => sum + (r.vibe_score ?? 5), 0) / n_p;
    const avgMusic =
      ratings.reduce((sum, r) => sum + (r.music_score ?? 5), 0) / n_p;
    const avgExecution =
      ratings.reduce((sum, r) => sum + (r.execution_score ?? 5), 0) / n_p;

    const Q_p = 0.5 * avgVibe + 0.3 * avgMusic + 0.2 * avgExecution;
    const w_p = Math.log(1 + n_p);

    weightedSum += Q_p * w_p;
    totalWeight += w_p;
  }

  if (totalWeight === 0) return 5.5;

  return Math.max(0, Math.min(10, weightedSum / totalWeight));
}

/**
 * Cached campus baseline to prevent global jumps when a single party is rated.
 */
export function getCachedCampusBaseline(
  allPartiesWithRatings: PartyWithRatings[],
  options?: { cacheKey?: string; ttlHours?: number; fallback?: number }
): number {
  const cacheKey = options?.cacheKey ?? "fratrank_campusBaseline_v1";
  const ttlHours = options?.ttlHours ?? 24;
  const fallback = options?.fallback ?? 5.5;

  // SSR safety
  if (typeof window === "undefined") {
    return allPartiesWithRatings.length
      ? computeCampusBaseline(allPartiesWithRatings)
      : fallback;
  }

  try {
    const raw = window.localStorage.getItem(cacheKey);
    if (raw) {
      const parsed = JSON.parse(raw) as { value: number; computedAt: string };
      const ageMs = Date.now() - new Date(parsed.computedAt).getTime();
      const ttlMs = ttlHours * 60 * 60 * 1000;

      if (Number.isFinite(parsed.value) && ageMs >= 0 && ageMs < ttlMs) {
        return parsed.value;
      }
    }
  } catch {
    // ignore cache read errors
  }

  const value =
    allPartiesWithRatings.length > 0
      ? computeCampusBaseline(allPartiesWithRatings)
      : fallback;

  try {
    window.localStorage.setItem(
      cacheKey,
      JSON.stringify({ value, computedAt: new Date().toISOString() })
    );
  } catch {
    // ignore cache write errors
  }

  return value;
}
// ============================================
// ELEMENT 1: INDIVIDUAL PARTY SCORE
// ============================================

/**
 * Element 1: Compute individual party score (PartyScore_p)
 * 
 * Step 1: Raw party quality
 *   Q_p = 0.50*avgVibe + 0.30*avgMusic + 0.20*avgExecution
 * 
 * Step 2: Party rating confidence (k=10)
 *   c_p = 1 - exp(-n_p / 10)
 * 
 * Step 3: Fraternity stability confidence (h=2)
 *   s_f = 1 - exp(-m_f / 2)
 *   where m_f = number of parties hosted by fraternity this semester
 * 
 * Step 4: Determine baseline B_f
 *   If frat has prior rated parties: B_f = avg of prior PartyScore values
 *   Else: B_f = B_campus (or 5.5 fallback)
 * 
 * Step 5: Blended score
 *   blend = c_p * s_f
 *   PartyScore_p = blend * Q_p + (1 - blend) * B_f
 */
export function computeIndividualPartyScore(
  partyRatings: PartyRating[],
  fraternityHostCount: number,
  fraternityBaseline: number
): number {
  const n_p = partyRatings.length;
  const k = 10; // Party rating confidence constant
  const h = 2;  // Fraternity stability constant

  // Step 1: Raw party quality Q_p
  if (n_p === 0) {
    return fraternityBaseline; // No ratings = baseline
  }

  const avgVibe = partyRatings.reduce((sum, r) => sum + (r.vibe_score ?? 5), 0) / n_p;
  const avgMusic = partyRatings.reduce((sum, r) => sum + (r.music_score ?? 5), 0) / n_p;
  const avgExecution = partyRatings.reduce((sum, r) => sum + (r.execution_score ?? 5), 0) / n_p;
  const Q_p = 0.50 * avgVibe + 0.30 * avgMusic + 0.20 * avgExecution;

  // Step 2: Party rating confidence
  const c_p = 1 - Math.exp(-n_p / k);

  // Step 3: Fraternity stability confidence
  const m_f = Math.max(1, fraternityHostCount);
  const s_f = 1 - Math.exp(-m_f / h);

  // Step 5: Blended score
  const blend = c_p * s_f;
  const partyScore = blend * Q_p + (1 - blend) * fraternityBaseline;

  if (import.meta.env.DEV) {
    console.log('[Element 1] Individual Party Score:', {
      n_p,
      Q_p: Q_p.toFixed(2),
      c_p: c_p.toFixed(4),
      m_f,
      s_f: s_f.toFixed(4),
      blend: blend.toFixed(4),
      B_f: fraternityBaseline.toFixed(2),
      partyScore: partyScore.toFixed(2),
    });
  }

  return Math.max(0, Math.min(10, partyScore));
}

/**
 * Compute fraternity baseline B_f for Element 1
 * 
 * If fraternity has at least 1 prior party with ratings:
 *   B_f = weighted average of prior party scores (participation-weighted)
 * Else:
 *   B_f = B_campus (or 5.5 fallback)
 */
export function computeFraternityBaseline(
  priorPartiesWithRatings: PartyWithRatings[],
  campusBaseline: number
): number {
  const ratedParties = priorPartiesWithRatings.filter(pwr => pwr.ratings.length > 0);
  
  if (ratedParties.length === 0) {
    return campusBaseline;
  }

  // Compute weighted average of raw party qualities
  let weightedSum = 0;
  let totalWeight = 0;

  for (const { party, ratings } of ratedParties) {
    const n_p = ratings.length;
    const avgVibe = ratings.reduce((sum, r) => sum + (r.vibe_score ?? 5), 0) / n_p;
    const avgMusic = ratings.reduce((sum, r) => sum + (r.music_score ?? 5), 0) / n_p;
    const avgExecution = ratings.reduce((sum, r) => sum + (r.execution_score ?? 5), 0) / n_p;
    const Q_p = 0.50 * avgVibe + 0.30 * avgMusic + 0.20 * avgExecution;

    const w_p = Math.log(1 + n_p);
    weightedSum += Q_p * w_p;
    totalWeight += w_p;
  }

  if (totalWeight === 0) return campusBaseline;
  return Math.max(0, Math.min(10, weightedSum / totalWeight));
}

// ============================================
// ELEMENT 2: SEMESTER FRATERNITY PARTY SCORE
// ============================================

/**
 * Element 2: Compute semester fraternity party score (SemesterPartyScore_f)
 * 
 * Step 1: Participation weight per party
 *   w_p = ln(1 + n_p)
 * 
 * Step 2: Weighted semester average
 *   SemesterPartyAvg_f = Σ(PartyScore_p * w_p) / Σ(w_p)
 *   If no rated parties: SemesterPartyAvg_f = B_campus
 * 
 * Step 3: Hosting bonus (diminishing returns, caps ~4-5 parties)
 *   HostBonus_f = 1 + alpha * (1 - exp(-m_f / t))
 *   alpha = 0.08 (max +8%)
 *   t = 2.0
 * 
 * Step 4: Final score
 *   SemesterPartyScore_f = SemesterPartyAvg_f * HostBonus_f
 */
export function computeSemesterPartyScore(
  partiesWithRatings: PartyWithRatings[],
  campusBaseline: number
): { semesterPartyScore: number; semesterPartyAvg: number; hostingBonus: number } {
  const alpha = 0.08; // Max hosting bonus (+8%)
  const t = 2.0;      // Hosting bonus saturation rate

  const m_f = partiesWithRatings.length; // Number of parties hosted

  // Compute individual party scores first using fraternity baseline
  const fratBaseline = computeFraternityBaseline(partiesWithRatings, campusBaseline);
  
  // Step 1 & 2: Weighted average of PartyScore_p values
  let weightedSum = 0;
  let totalWeight = 0;

  for (const { party, ratings } of partiesWithRatings) {
    const n_p = ratings.length;
    if (n_p === 0) continue;

    // Compute this party's Element 1 score
    const partyScore_p = computeIndividualPartyScore(ratings, m_f, fratBaseline);

    // Participation weight
    const w_p = Math.log(1 + n_p);

    weightedSum += partyScore_p * w_p;
    totalWeight += w_p;
  }

  // If no rated parties, use campus baseline
  const semesterPartyAvg = totalWeight > 0 
    ? weightedSum / totalWeight 
    : campusBaseline;

  // Step 3: Hosting bonus
  const hostingBonus = 1 + alpha * (1 - Math.exp(-m_f / t));

  // Step 4: Final score
  const semesterPartyScore = semesterPartyAvg * hostingBonus;

  if (import.meta.env.DEV) {
    console.log('[Element 2] Semester Party Score:', {
      m_f,
      semesterPartyAvg: semesterPartyAvg.toFixed(2),
      hostingBonus: hostingBonus.toFixed(4),
      semesterPartyScore: semesterPartyScore.toFixed(2),
    });
  }

  return {
    semesterPartyScore: Math.max(0, Math.min(10, semesterPartyScore)),
    semesterPartyAvg: Math.max(0, Math.min(10, semesterPartyAvg)),
    hostingBonus,
  };
}

// ============================================
// CAMPUS AVERAGES (for reputation)
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
// C) PARTYINDEX FOR A FRATERNITY (legacy - now uses Element 2)
// ============================================

/**
 * Formula C: Compute PartyIndex for a fraternity (LEGACY - kept for backward compatibility)
 * Now internally uses Element 2 computation
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
// G) PER-PARTY OVERALL QUALITY DISPLAY (for Party Cards)
// ============================================

/**
 * Formula G: Per-party "Overall Party Quality" for display on PartyCard
 * 
 * This is Element 1 - Individual Party Score
 * Uses fraternity baseline and campus baseline for stabilization
 */
export function computePartyOverallQuality(
  partyRatings: PartyRating[],
  fraternityHostCount: number = 1,
  fraternityBaseline: number = 5.5
): number {
  return computeIndividualPartyScore(partyRatings, fraternityHostCount, fraternityBaseline);
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
// H) FRATERNITY PARTY SCORE (for Parties Leaderboard)
// ============================================

/**
 * Formula H: Fraternity-level PartyScore for Parties leaderboard
 * 
 * This now uses Element 2: Semester Party Score
 * - Weighted average of Element 1 (individual party scores)
 * - Plus hosting bonus (capped at ~8%)
 */
export function computeFraternityPartyScore(
  partiesWithRatings: PartyWithRatings[],
  campusBaseline: number = 5.5,
  referenceDate: Date = new Date()
): number {
  const { semesterPartyScore } = computeSemesterPartyScore(partiesWithRatings, campusBaseline);
  return semesterPartyScore;
}

// ============================================
// FULL SCORE COMPUTATION FOR A FRATERNITY
// ============================================

export interface FraternityScores {
  rawReputation: number;
  repAdj: number;
  partyIndex: number;
  partyAdj: number;
  partyScore: number; // Now uses Element 2: Semester Party Score
  semesterPartyScore: number; // Element 2: SemesterPartyScore_f
  semesterPartyAvg: number;   // Element 2: SemesterPartyAvg_f (before hosting bonus)
  hostingBonus: number;       // Element 2: HostBonus_f
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
  activityData?: ActivityData,
  campusBaseline?: number
): Promise<FraternityScores> {

  const baseline = campusBaseline ?? 5.5;
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
  
  // Formula C: PartyIndex (legacy)
  const partyIndex = computePartyIndex(partiesWithRatings);
  
  // Total party ratings count (nP_f)
  const numPartyRatings = allPartyRatings.length;
  
  // Confidence values
  const confidenceRep = 1 - Math.exp(-numRepRatings / 25);
  const confidenceParty = 1 - Math.exp(-numPartyRatings / 40);
  const confidenceOverall = 0.65 * confidenceRep + 0.35 * confidenceParty;
  
  // Compute campus baseline for Element 2
  const campusBaseline = allPartiesWithRatings 
    ? computeCampusBaseline(allPartiesWithRatings)
    : 5.5;
  
  // Element 2: Semester Party Score (for Parties leaderboard)
  const { semesterPartyScore, semesterPartyAvg, hostingBonus } = computeSemesterPartyScore(
    partiesWithRatings,
    campusBaseline
  );
  
  // Formula D: PartyAdj (used for Overall score - keep legacy behavior)
  const partyAdj = computePartyAdj(partyIndex, numPartyRatings, campusPartyAvg);
  
  // partyScore now uses Element 2
  const partyScore = semesterPartyScore;
  
  // Formula E: RepAdj
  const repAdj = computeRepAdj(rawReputation, numRepRatings, campusRepAvg);
  
  // Formula F: Overall
  const overall = computeOverall(repAdj, partyAdj);
  
  // Trending
  const trending = computeTrending(partiesWithRatings);
  const activityTrending = activityData 
    ? computeActivityTrending(activityData)
    : 0;

  // DEV debug logging
  if (import.meta.env.DEV) {
    console.log(`[DEBUG] Fraternity: ${fraternity.name}`, {
      nP_f: numPartyRatings,
      partyIndex: partyIndex.toFixed(2),
      partyAdj: partyAdj.toFixed(2),
      semesterPartyScore: semesterPartyScore.toFixed(2),
      semesterPartyAvg: semesterPartyAvg.toFixed(2),
      hostingBonus: hostingBonus.toFixed(4),
      nR_f: numRepRatings,
      rawRep: rawReputation.toFixed(2),
      repAdj: repAdj.toFixed(2),
      overall: overall.toFixed(2),
    });
  }
  
  return {
    rawReputation,
    repAdj,
    partyIndex,
    partyAdj,
    partyScore,
    semesterPartyScore,
    semesterPartyAvg,
    hostingBonus,
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
    // Use Element 2: semesterPartyScore for Parties leaderboard
    const partyA = a.computedScores?.semesterPartyScore ?? 5;
    const partyB = b.computedScores?.semesterPartyScore ?? 5;
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
