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
  const NEUTRAL_PRIOR = 5.5;
  const MIN_RATINGS_THRESHOLD = 30;
  const MIN_PARTIES_THRESHOLD = 10;

  let weightedSum = 0;
  let totalWeight = 0;
  let totalRatings = 0;
  let ratedPartyCount = 0;

  for (const { party, ratings } of allPartiesWithRatings) {
    const n_p = ratings.length;
    if (n_p === 0) continue;

    ratedPartyCount++;
    totalRatings += n_p;

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

  // Minimum data threshold: use neutral prior if insufficient data
  if (totalWeight === 0 || totalRatings < MIN_RATINGS_THRESHOLD || ratedPartyCount < MIN_PARTIES_THRESHOLD) {
    if (import.meta.env.DEV) {
      console.log('═══════════════════════════════════════════════════════════');
      console.log('[CAMPUS BASELINE] Insufficient data - using neutral prior');
      console.log('═══════════════════════════════════════════════════════════');
      console.log(`  Total parties in system: ${allPartiesWithRatings.length}`);
      console.log(`  Parties with ratings: ${ratedPartyCount} (threshold: ${MIN_PARTIES_THRESHOLD})`);
      console.log(`  Total ratings: ${totalRatings} (threshold: ${MIN_RATINGS_THRESHOLD})`);
      console.log(`  B_campus: ${NEUTRAL_PRIOR} (neutral prior)`);
      console.log('═══════════════════════════════════════════════════════════');
    }
    return NEUTRAL_PRIOR;
  }

  const baseline = Math.max(0, Math.min(10, weightedSum / totalWeight));

  if (import.meta.env.DEV) {
    console.log('═══════════════════════════════════════════════════════════');
    console.log('[CAMPUS BASELINE] B_campus Computation');
    console.log('═══════════════════════════════════════════════════════════');
    console.log(`  Total parties in system: ${allPartiesWithRatings.length}`);
    console.log(`  Parties with ratings: ${ratedPartyCount}`);
    console.log(`  Total ratings across all parties: ${totalRatings}`);
    console.log(`  B_campus (weighted avg): ${baseline.toFixed(4)}`);
    console.log('═══════════════════════════════════════════════════════════');
  }

  return baseline;
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
// RAW PARTY QUALITY (FOR DISPLAY - Element 1)
// ============================================

/**
 * Compute raw party quality Q_p (for display purposes - NOT for ranking)
 * Q_p = 0.5*avgVibe + 0.3*avgMusic + 0.2*avgExecution
 * Returns null if no ratings
 */
export function computeRawPartyQuality(partyRatings: PartyRating[]): number | null {
  const n_p = partyRatings.length;
  if (n_p === 0) return null;

  const avgVibe = partyRatings.reduce((sum, r) => sum + (r.vibe_score ?? 5), 0) / n_p;
  const avgMusic = partyRatings.reduce((sum, r) => sum + (r.music_score ?? 5), 0) / n_p;
  const avgExecution = partyRatings.reduce((sum, r) => sum + (r.execution_score ?? 5), 0) / n_p;

  return 0.5 * avgVibe + 0.3 * avgMusic + 0.2 * avgExecution;
}

/**
 * Get confidence level based on rating count (for display)
 */
export function getPartyConfidenceLevel(ratingCount: number): {
  level: 'none' | 'low' | 'medium' | 'high';
  label: string;
  percentage: number;
} {
  if (ratingCount === 0) return { level: 'none', label: 'No ratings yet', percentage: 0 };
  if (ratingCount <= 2) return { level: 'low', label: `${ratingCount} rating${ratingCount > 1 ? 's' : ''} - Low confidence`, percentage: 25 };
  if (ratingCount <= 10) return { level: 'medium', label: `${ratingCount} ratings - Medium confidence`, percentage: 60 };
  return { level: 'high', label: `${ratingCount} ratings - High confidence`, percentage: 100 };
}

/**
 * Compute stabilized party score S_p (for ranking/Element 2 input)
 * S_p = c(n_p) * Q_p + (1 - c(n_p)) * B_f
 * where c(n) = n / (n + k)
 */
export function computeStabilizedPartyScore(
  partyRatings: PartyRating[],
  fraternityBaseline: number,
  k: number = 10
): number {
  const n_p = partyRatings.length;
  if (n_p === 0) return fraternityBaseline;

  const Q_p = computeRawPartyQuality(partyRatings)!;
  const c_n = n_p / (n_p + k);
  
  return c_n * Q_p + (1 - c_n) * fraternityBaseline;
}

// ============================================
// INDIVIDUAL PARTY SCORE (LEGACY - for internal use)
// ============================================

/**
 * Element 1: Compute individual party score (PartyScore_p)
 * 
 * NOTE: This is the LEGACY blended score formula.
 * For display, use computeRawPartyQuality() instead.
 * For ranking, use computeStabilizedPartyScore() instead.
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
    if (import.meta.env.DEV) {
      console.log('[FRAT BASELINE] No rated parties - falling back to B_campus:', campusBaseline.toFixed(4));
    }
    return campusBaseline;
  }

  // Compute weighted average of raw party qualities
  let weightedSum = 0;
  let totalWeight = 0;

  const partyDetails: Array<{ title: string; n_p: number; Q_p: number; w_p: number }> = [];

  for (const { party, ratings } of ratedParties) {
    const n_p = ratings.length;
    const avgVibe = ratings.reduce((sum, r) => sum + (r.vibe_score ?? 5), 0) / n_p;
    const avgMusic = ratings.reduce((sum, r) => sum + (r.music_score ?? 5), 0) / n_p;
    const avgExecution = ratings.reduce((sum, r) => sum + (r.execution_score ?? 5), 0) / n_p;
    const Q_p = 0.50 * avgVibe + 0.30 * avgMusic + 0.20 * avgExecution;

    const w_p = Math.log(1 + n_p);
    weightedSum += Q_p * w_p;
    totalWeight += w_p;

    partyDetails.push({ title: party.title, n_p, Q_p, w_p });
  }

  if (totalWeight === 0) return campusBaseline;
  
  const baseline = Math.max(0, Math.min(10, weightedSum / totalWeight));

  if (import.meta.env.DEV) {
    console.log('───────────────────────────────────────────────────────────');
    console.log('[FRAT BASELINE] B_f Computation');
    console.log('───────────────────────────────────────────────────────────');
    console.log(`  Rated parties used for B_f: ${ratedParties.length}`);
    for (const p of partyDetails) {
      console.log(`    "${p.title}": n_p=${p.n_p}, Q_p=${p.Q_p.toFixed(4)}, w_p=${p.w_p.toFixed(4)}`);
    }
    console.log(`  B_f (weighted avg of prior Q_p): ${baseline.toFixed(4)}`);
    console.log(`  B_campus (fallback if no data): ${campusBaseline.toFixed(4)}`);
    console.log('───────────────────────────────────────────────────────────');
  }

  return baseline;
}

/**
 * Helper: Compute baseline from a set of parties (for leave-one-out)
 * Returns weighted average of Q_p values, or 5.5 if no data
 */
function computeFraternityBaselineFromParties(
  partiesWithRatings: PartyWithRatings[]
): number {
  const ratedParties = partiesWithRatings.filter(pwr => pwr.ratings.length > 0);
  if (ratedParties.length === 0) return 5.5;

  let weightedSum = 0;
  let totalWeight = 0;

  for (const { ratings } of ratedParties) {
    const n_p = ratings.length;
    const avgVibe = ratings.reduce((sum, r) => sum + (r.vibe_score ?? 5), 0) / n_p;
    const avgMusic = ratings.reduce((sum, r) => sum + (r.music_score ?? 5), 0) / n_p;
    const avgExecution = ratings.reduce((sum, r) => sum + (r.execution_score ?? 5), 0) / n_p;
    const Q_p = 0.50 * avgVibe + 0.30 * avgMusic + 0.20 * avgExecution;

    const w_p = Math.log(1 + n_p);
    weightedSum += Q_p * w_p;
    totalWeight += w_p;
  }

  if (totalWeight === 0) return 5.5;
  return Math.max(0, Math.min(10, weightedSum / totalWeight));
}

// ============================================
// ELEMENT 2: SEMESTER FRATERNITY PARTY SCORE
// ============================================

/**
 * Result type for Element 2 computation
 * hasData = true only when the fraternity has at least one rated party
 */
export type SemesterPartyScoreResult = {
  score: number | null;
  hasData: boolean;
  avg: number | null;
  hostBonus: number;
};

/**
 * Element 2: Compute semester fraternity party score (SemesterPartyScore_f)
 * 
 * Step 1: Participation weight per party
 *   w_p = ln(1 + n_p)
 * 
 * Step 2: Weighted semester average
 *   SemesterPartyAvg_f = Σ(PartyScore_p * w_p) / Σ(w_p)
 *   If no rated parties: return null (NO DATA state)
 * 
 * Step 3: Hosting bonus (diminishing returns, caps ~4-5 parties)
 *   HostBonus_f = 1 + alpha * (1 - exp(-m_f / t))
 *   alpha = 0.08 (max +8%)
 *   t = 2.0
 * 
 * Step 4: Final score
 *   SemesterPartyScore_f = SemesterPartyAvg_f * HostBonus_f
 * 
 * IMPORTANT: If a frat has zero rated parties, we return null for score/avg.
 * Hosting bonus is NOT applied without ratings data.
 */
export function computeSemesterPartyScore(
  partiesWithRatings: PartyWithRatings[],
  campusBaseline: number
): SemesterPartyScoreResult {
  const alpha = 0.08; // Max hosting bonus (+8%)
  const t = 2.0;      // Hosting bonus saturation rate
  const k = 10;       // Confidence constant for S_p stabilization

  const MIN_PARTY_RATINGS_FOR_PARTY_SCORE = 5;
  
  // Filter to only parties with at least 1 rating (hasData is about RATED parties)
  const ratedParties = partiesWithRatings.filter(pwr => pwr.ratings.length > 0);
  const totalPartyRatings = ratedParties.reduce((sum, pwr) => sum + pwr.ratings.length, 0);
  
  // NO DATA: If no rated parties OR insufficient total ratings
  if (ratedParties.length === 0 || totalPartyRatings < MIN_PARTY_RATINGS_FOR_PARTY_SCORE) {
    if (import.meta.env.DEV) {
      console.log(`[Element 2] No Data: ${ratedParties.length} rated parties, ${totalPartyRatings} total ratings (need ${MIN_PARTY_RATINGS_FOR_PARTY_SCORE})`);
    }
    return { score: null, hasData: false, avg: null, hostBonus: 1 };
  }

  const m_f = partiesWithRatings.length; // Number of parties hosted (for hosting bonus)

  // Step 1 & 2: Weighted average of STABILIZED S_p values (only from rated parties)
  // IMPORTANT: Use leave-one-out baseline to prevent B_f leakage
  let weightedSum = 0;
  let totalWeight = 0;

  // Debug: collect per-party details
  const partyDebugInfo: Array<{
    partyId: string;
    partyTitle: string;
    n_p: number;
    Q_p: number;
    B_f: number;
    c_n: number;
    S_p: number;
    w_p: number;
    baselineSource: string;
  }> = [];

  for (const { party, ratings } of ratedParties) {
    const n_p = ratings.length;

    // Compute raw Q_p for this party
    const Q_p = computeRawPartyQuality(ratings)!;
    
    // LEAVE-ONE-OUT: Compute B_f from other parties (excluding this one)
    const otherParties = partiesWithRatings.filter(pwr => pwr.party.id !== party.id);
    const otherRatedParties = otherParties.filter(pwr => pwr.ratings.length > 0);
    
    let B_f: number;
    let baselineSource: string;
    
    if (otherRatedParties.length > 0) {
      // Compute baseline from other rated parties
      B_f = computeFraternityBaselineFromParties(otherRatedParties);
      baselineSource = `other ${otherRatedParties.length} rated parties`;
    } else {
      // No other rated parties - use campus baseline (neutral prior)
      B_f = campusBaseline;
      baselineSource = 'campus baseline (no other rated parties)';
    }
    
    // Confidence factor c(n_p) = n_p / (n_p + k)
    const c_n = n_p / (n_p + k);

    // Use STABILIZED party score: S_p = c(n_p) * Q_p + (1 - c(n_p)) * B_f
    const S_p = c_n * Q_p + (1 - c_n) * B_f;

    // Participation weight
    const w_p = Math.log(1 + n_p);

    weightedSum += S_p * w_p;
    totalWeight += w_p;

    // Collect debug info
    partyDebugInfo.push({
      partyId: party.id,
      partyTitle: party.title,
      n_p,
      Q_p,
      B_f,
      c_n,
      S_p,
      w_p,
      baselineSource,
    });
  }

  const avg = weightedSum / totalWeight;

  // Step 3: Hosting bonus
  const hostBonus = 1 + alpha * (1 - Math.exp(-m_f / t));

  // Step 4: Final score
  const score = avg * hostBonus;

  if (import.meta.env.DEV) {
    console.log('═══════════════════════════════════════════════════════════');
    console.log('[Element 2] SEMESTER PARTY SCORE CALCULATION');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('Inputs:');
    console.log(`  m_f (parties hosted): ${m_f}`);
    console.log(`  Rated parties: ${ratedParties.length}`);
    console.log(`  Campus baseline (neutral prior): ${campusBaseline.toFixed(4)}`);
    console.log(`  k (confidence constant): ${k}`);
    console.log('───────────────────────────────────────────────────────────');
    console.log('Per-party breakdown (LEAVE-ONE-OUT baseline):');
    for (const info of partyDebugInfo) {
      console.log(`  Party: "${info.partyTitle}" (${info.partyId.slice(0, 8)}...)`);
      console.log(`    n_p (rating count): ${info.n_p}`);
      console.log(`    Q_p (raw quality): ${info.Q_p.toFixed(4)}`);
      console.log(`    B_f source: ${info.baselineSource}`);
      console.log(`    B_f value: ${info.B_f.toFixed(4)}`);
      console.log(`    c(n_p) = ${info.n_p}/(${info.n_p}+${k}) = ${info.c_n.toFixed(4)}`);
      console.log(`    S_p = ${info.c_n.toFixed(4)}*${info.Q_p.toFixed(2)} + ${(1 - info.c_n).toFixed(4)}*${info.B_f.toFixed(2)} = ${info.S_p.toFixed(4)}`);
      console.log(`    w_p = ln(1+${info.n_p}) = ${info.w_p.toFixed(4)}`);
    }
    console.log('───────────────────────────────────────────────────────────');
    console.log('Aggregation:');
    console.log(`  SemesterPartyAvg = Σ(S_p * w_p) / Σ(w_p) = ${avg.toFixed(4)}`);
    console.log(`  HostBonus = 1 + 0.08*(1 - exp(-${m_f}/2)) = ${hostBonus.toFixed(4)}`);
    console.log(`  SemesterPartyScore = ${avg.toFixed(4)} * ${hostBonus.toFixed(4)} = ${score.toFixed(4)}`);
    console.log('═══════════════════════════════════════════════════════════');
  }

  return {
    score: Math.max(0, Math.min(10, score)),
    hasData: true,
    avg: Math.max(0, Math.min(10, avg)),
    hostBonus,
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
): number | null {
  const { score } = computeSemesterPartyScore(partiesWithRatings, campusBaseline);
  return score;
}

// ============================================
// FULL SCORE COMPUTATION FOR A FRATERNITY
// ============================================

// Minimum thresholds for Overall score computation
export const MIN_REP_RATINGS_FOR_OVERALL = 3;
export const MIN_PARTY_RATINGS_FOR_OVERALL = 5;
export const MIN_RATED_PARTIES_FOR_OVERALL = 2;

export interface FraternityScores {
  rawReputation: number;
  repAdj: number;
  partyIndex: number;
  partyAdj: number;
  partyScore: number | null;        // Now uses Element 2: Semester Party Score (null if no data)
  semesterPartyScore: number | null; // Element 2: SemesterPartyScore_f (null if no rated parties)
  semesterPartyAvg: number | null;   // Element 2: SemesterPartyAvg_f (null if no rated parties)
  hostingBonus: number;              // Element 2: HostBonus_f
  hasPartyScoreData: boolean;        // true only if frat has >= 1 rated party
  hasRepData: boolean;               // true only if numRepRatings >= MIN_REP_RATINGS_FOR_OVERALL
  hasOverallData: boolean;           // true only if both rep and party thresholds are met
  overall: number | null;            // null if hasOverallData is false
  trending: number;
  activityTrending: number;
  numRepRatings: number;
  numPartyRatings: number;
  ratedPartiesCount: number;         // Number of parties with at least 1 rating
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
  
  // Element 2: Semester Party Score (for Parties leaderboard)
  const semesterResult = computeSemesterPartyScore(partiesWithRatings, baseline);
  const { score: semesterPartyScore, hasData: hasPartyScoreData, avg: semesterPartyAvg, hostBonus: hostingBonus } = semesterResult;
  
  // Count rated parties
  const ratedPartiesCount = partiesWithRatings.filter(pwr => pwr.ratings.length > 0).length;
  
  // Formula D: PartyAdj (used for Overall score - keep legacy behavior)
  const partyAdj = computePartyAdj(partyIndex, numPartyRatings, campusPartyAvg);
  
  // partyScore now uses Element 2 (null if no data)
  const partyScore = semesterPartyScore;
  
  // Formula E: RepAdj
  const repAdj = computeRepAdj(rawReputation, numRepRatings, campusRepAvg);
  
  // Determine data sufficiency flags
  const hasRepData = numRepRatings >= MIN_REP_RATINGS_FOR_OVERALL;
  const hasOverallData = hasRepData && (numPartyRatings >= MIN_PARTY_RATINGS_FOR_OVERALL || ratedPartiesCount >= MIN_RATED_PARTIES_FOR_OVERALL);
  
  // Formula F: Overall (null if insufficient data)
  const overall = hasOverallData ? computeOverall(repAdj, partyAdj) : null;
  
  // Trending
  const trending = computeTrending(partiesWithRatings);
  const activityTrending = activityData 
    ? computeActivityTrending(activityData)
    : 0;

  // DEV debug logging
  if (import.meta.env.DEV) {
    console.log(`[DEBUG] Fraternity: ${fraternity.name}`, {
      nP_f: numPartyRatings,
      ratedPartiesCount,
      partyIndex: partyIndex.toFixed(2),
      partyAdj: partyAdj.toFixed(2),
      hasPartyScoreData,
      hasRepData,
      hasOverallData,
      semesterPartyScore: semesterPartyScore?.toFixed(2) ?? 'null',
      semesterPartyAvg: semesterPartyAvg?.toFixed(2) ?? 'null',
      hostingBonus: hostingBonus.toFixed(4),
      nR_f: numRepRatings,
      rawRep: rawReputation.toFixed(2),
      repAdj: repAdj.toFixed(2),
      overall: overall?.toFixed(2) ?? 'null (insufficient data)',
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
    hasPartyScoreData,
    hasRepData,
    hasOverallData,
    overall,
    trending,
    activityTrending,
    numRepRatings,
    numPartyRatings,
    ratedPartiesCount,
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
    const aHasData = a.computedScores?.hasOverallData ?? false;
    const bHasData = b.computedScores?.hasOverallData ?? false;
    
    // Frats with data go first
    if (aHasData && !bHasData) return -1;
    if (!aHasData && bHasData) return 1;
    if (!aHasData && !bHasData) return (a.chapter ?? '').localeCompare(b.chapter ?? '');
    
    // Both have data, sort by overall descending
    const overallA = a.computedScores?.overall ?? 0;
    const overallB = b.computedScores?.overall ?? 0;
    if (overallB !== overallA) return overallB - overallA;
    return (a.chapter ?? '').localeCompare(b.chapter ?? '');
  });
}

export function sortFraternitiesByReputation(frats: FraternityWithScores[]): FraternityWithScores[] {
  return [...frats].sort((a, b) => {
    const aHasData = a.computedScores?.hasRepData ?? false;
    const bHasData = b.computedScores?.hasRepData ?? false;
    
    // Frats with sufficient rep data go first
    if (aHasData && !bHasData) return -1;
    if (!aHasData && bHasData) return 1;
    if (!aHasData && !bHasData) return (a.chapter ?? '').localeCompare(b.chapter ?? '');
    
    // Both have data, sort by repAdj descending
    const repA = a.computedScores?.repAdj ?? 5;
    const repB = b.computedScores?.repAdj ?? 5;
    if (repB !== repA) return repB - repA;
    return (a.chapter ?? '').localeCompare(b.chapter ?? '');
  });
}

export function sortFraternitiesByParty(frats: FraternityWithScores[]): FraternityWithScores[] {
  return [...frats].sort((a, b) => {
    // Frats with hasPartyScoreData === true go first, sorted by semesterPartyScore desc
    // Frats with hasPartyScoreData === false go to bottom
    const aHasData = a.computedScores?.hasPartyScoreData ?? false;
    const bHasData = b.computedScores?.hasPartyScoreData ?? false;
    
    if (aHasData && !bHasData) return -1; // a goes first
    if (!aHasData && bHasData) return 1;  // b goes first
    if (!aHasData && !bHasData) return (a.chapter ?? '').localeCompare(b.chapter ?? ''); // both no data
    
    // Both have data, sort by semesterPartyScore descending
    const partyA = a.computedScores?.semesterPartyScore ?? 0;
    const partyB = b.computedScores?.semesterPartyScore ?? 0;
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
