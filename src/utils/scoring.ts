import type { Fraternity } from '@/api/base44Client';

export function getReputationScore(frat: Fraternity): number {
  return frat.reputation_score ?? 5.0;
}

export function getPartyScore(frat: Fraternity): number {
  return frat.historical_party_score ?? 5.0;
}

export function getOverallScore(frat: Fraternity): number {
  const reputation = getReputationScore(frat);
  const party = getPartyScore(frat);
  const overall = 0.7 * reputation + 0.3 * party;
  return Math.max(0, Math.min(10, overall));
}

export function sortFraternitiesByOverall(frats: Fraternity[]): Fraternity[] {
  return [...frats].sort((a, b) => {
    const overallA = getOverallScore(a);
    const overallB = getOverallScore(b);
    if (overallB !== overallA) return overallB - overallA;
    
    const partyA = getPartyScore(a);
    const partyB = getPartyScore(b);
    if (partyB !== partyA) return partyB - partyA;
    
    return (a.chapter ?? '').localeCompare(b.chapter ?? '');
  });
}
