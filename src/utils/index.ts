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

// Fraternity name to Greek letters and shorthand mapping
const fraternityMap: Record<string, { greek: string; shorthand: string }> = {
  'Alpha Delta Phi': { greek: 'ΑΔΦ', shorthand: 'ADPhi' },
  'Alpha Tau Omega': { greek: 'ΑΤΩ', shorthand: 'ATO' },
  'Alpha Epsilon Pi': { greek: 'ΑΕΠ', shorthand: 'AEPi' },
  'Sigma Chi': { greek: 'ΣΧ', shorthand: 'SigChi' },
  'Kappa Alpha Order': { greek: 'ΚΑ', shorthand: 'KA' },
  'Pi Kappa Phi': { greek: 'ΠΚΦ', shorthand: 'PiKapp' },
  'Wayne Manor': { greek: 'WM', shorthand: 'WM' },
  'Theta Chi': { greek: 'ΘΧ', shorthand: 'ThetaChi' },
  'Sigma Nu': { greek: 'ΣΝ', shorthand: 'SigNu' },
  'Pi Kappa Alpha': { greek: 'ΠΚΑ', shorthand: 'Pike' },
  'Delta Tau Delta': { greek: 'ΔΤΔ', shorthand: 'Delt' },
  'Phi Delta Theta': { greek: 'ΦΔΘ', shorthand: 'PhiDelt' },
  'Sigma Alpha Epsilon': { greek: 'ΣΑΕ', shorthand: 'SAE' },
  'Beta Theta Pi': { greek: 'ΒΘΠ', shorthand: 'Beta' },
  'Lambda Chi Alpha': { greek: 'ΛΧΑ', shorthand: 'Lambda' },
  'Phi Gamma Delta': { greek: 'ΦΓΔ', shorthand: 'Fiji' },
  'Zeta Beta Tau': { greek: 'ΖΒΤ', shorthand: 'ZBT' },
  'Tau Kappa Epsilon': { greek: 'ΤΚΕ', shorthand: 'TKE' },
  'Kappa Sigma': { greek: 'ΚΣ', shorthand: 'KappaSig' },
  'Chi Phi': { greek: 'ΧΦ', shorthand: 'ChiPhi' },
  'Alpha Sigma Phi': { greek: 'ΑΣΦ', shorthand: 'AlphaSig' },
};

// Get Greek letters for a fraternity name
export function getFratGreek(name: string): string {
  const mapping = fraternityMap[name];
  if (mapping) return mapping.greek;
  
  // Fallback: try to generate from first letters of each word
  const words = name.split(' ');
  if (words.length >= 2) {
    return words.map(w => toGreekLetter(w[0])).join('');
  }
  return name.substring(0, 2).toUpperCase();
}

// Get shorthand for a fraternity name  
export function getFratShorthand(name: string): string {
  const mapping = fraternityMap[name];
  if (mapping) return mapping.shorthand;
  
  // Fallback: use first word or abbreviation
  const words = name.split(' ');
  if (words.length === 1) return name;
  return words.map(w => w[0]).join('');
}

// Convert single letter to Greek
function toGreekLetter(letter: string): string {
  const greekMap: Record<string, string> = {
    'A': 'Α', 'B': 'Β', 'G': 'Γ', 'D': 'Δ', 'E': 'Ε',
    'Z': 'Ζ', 'H': 'Η', 'I': 'Ι', 'K': 'Κ', 'L': 'Λ',
    'M': 'Μ', 'N': 'Ν', 'O': 'Ο', 'P': 'Π', 'R': 'Ρ',
    'S': 'Σ', 'T': 'Τ', 'U': 'Υ', 'W': 'Ω', 'X': 'Ξ',
  };
  return greekMap[letter.toUpperCase()] || letter;
}

// Legacy function - now uses the proper mapping
export function toGreekLetters(abbrev: string): string {
  if (!abbrev) return '';
  return abbrev.split('').map(c => toGreekLetter(c)).join('');
}
