export function createPageUrl(page: string): string {
  // Handle pages with query params
  if (page.includes('?')) {
    const [pageName, queryString] = page.split('?');
    return `/${pageName}?${queryString}`;
  }
  return `/${page}`;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function getScoreColor(score: number): string {
  if (score >= 8) return 'text-emerald-600';
  if (score >= 6) return 'text-blue-600';
  if (score >= 4) return 'text-amber-600';
  return 'text-red-600';
}

export function getScoreBgColor(score: number): string {
  if (score >= 8) return 'bg-emerald-500';
  if (score >= 6) return 'bg-blue-500';
  if (score >= 4) return 'bg-amber-500';
  return 'bg-red-500';
}

export function formatTimeAgo(date: Date | string): string {
  const now = new Date();
  const past = new Date(date);
  const diffMs = now.getTime() - past.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffDays > 0) return `${diffDays}d ago`;
  if (diffHours > 0) return `${diffHours}h ago`;
  if (diffMins > 0) return `${diffMins}m ago`;
  return 'Just now';
}

// Greek letter mapping for fraternity abbreviations
const greekLetterMap: Record<string, string> = {
  'A': 'Α', // Alpha
  'B': 'Β', // Beta
  'G': 'Γ', // Gamma
  'D': 'Δ', // Delta
  'E': 'Ε', // Epsilon
  'Z': 'Ζ', // Zeta
  'H': 'Η', // Eta
  'TH': 'Θ', // Theta
  'I': 'Ι', // Iota
  'K': 'Κ', // Kappa
  'L': 'Λ', // Lambda
  'M': 'Μ', // Mu
  'N': 'Ν', // Nu
  'X': 'Ξ', // Xi
  'O': 'Ο', // Omicron
  'P': 'Π', // Pi
  'R': 'Ρ', // Rho
  'S': 'Σ', // Sigma
  'T': 'Τ', // Tau
  'U': 'Υ', // Upsilon
  'PH': 'Φ', // Phi
  'CH': 'Χ', // Chi
  'PS': 'Ψ', // Psi
  'W': 'Ω', // Omega
};

export function toGreekLetters(abbrev: string): string {
  if (!abbrev) return '';
  
  let result = '';
  let i = 0;
  const upper = abbrev.toUpperCase();
  
  while (i < upper.length) {
    // Check for two-letter combinations first
    if (i < upper.length - 1) {
      const twoChar = upper.substring(i, i + 2);
      if (greekLetterMap[twoChar]) {
        result += greekLetterMap[twoChar];
        i += 2;
        continue;
      }
    }
    // Single letter
    const oneChar = upper[i];
    result += greekLetterMap[oneChar] || oneChar;
    i++;
  }
  
  return result;
}
