import { Trophy, Crown, Medal, Award } from 'lucide-react';
import { cn } from '@/lib/utils';

interface RankingEntry {
  tier: string;
  fratName: string;
}

interface RankingPostCardProps {
  rankings: RankingEntry[];
  comment?: string;
}

const TIER_CONFIG: Record<string, { color: string; bgColor: string; icon?: React.ReactNode; rank: number }> = {
  'Upper Touse': { color: 'text-emerald-600', bgColor: 'bg-emerald-500/20 border-emerald-500/40', icon: <Crown className="h-3.5 w-3.5" />, rank: 1 },
  'Touse': { color: 'text-emerald-500', bgColor: 'bg-emerald-500/15 border-emerald-500/30', rank: 2 },
  'Lower Touse': { color: 'text-emerald-400', bgColor: 'bg-emerald-500/10 border-emerald-500/20', rank: 3 },
  'Upper Mouse': { color: 'text-amber-500', bgColor: 'bg-amber-500/15 border-amber-500/30', rank: 4 },
  'Mouse': { color: 'text-amber-400', bgColor: 'bg-amber-500/10 border-amber-500/20', rank: 5 },
  'Mouse 1': { color: 'text-amber-400', bgColor: 'bg-amber-500/10 border-amber-500/20', rank: 5 },
  'Mouse 2': { color: 'text-amber-400', bgColor: 'bg-amber-500/10 border-amber-500/20', rank: 6 },
  'Lower Mouse': { color: 'text-orange-500', bgColor: 'bg-orange-500/15 border-orange-500/30', rank: 7 },
  'Upper Bouse': { color: 'text-red-400', bgColor: 'bg-red-500/10 border-red-500/20', rank: 8 },
  'Bouse': { color: 'text-red-500', bgColor: 'bg-red-500/15 border-red-500/30', rank: 9 },
  'Lower Bouse': { color: 'text-red-600', bgColor: 'bg-red-500/20 border-red-500/40', rank: 10 },
};

export function parseRankingFromText(text: string): { rankings: RankingEntry[]; comment: string } | null {
  // Check for ranking patterns in text
  const tierPatterns = ['Upper Touse', 'Touse', 'Lower Touse', 'Upper Mouse', 'Mouse', 'Lower Mouse', 'Upper Bouse', 'Bouse', 'Lower Bouse'];
  const rankings: RankingEntry[] = [];
  let remainingText = text;
  
  // Remove emoji prefixes like 🎮 or 🏆
  remainingText = remainingText.replace(/^[🎮🏆]\s*(Frat Battle Results|My Frat Ranking)?\s*\n*/i, '');
  
  for (const tier of tierPatterns) {
    // Match patterns like "Upper Touse: Alpha Delta Phi" or "Touse: Sigma Nu"
    const regex = new RegExp(`${tier}:\\s*([^\\n:]+)`, 'gi');
    const match = regex.exec(text);
    if (match) {
      rankings.push({
        tier: tier,
        fratName: match[1].trim()
      });
      remainingText = remainingText.replace(match[0], '').trim();
    }
  }
  
  if (rankings.length === 0) {
    return null;
  }
  
  // Clean up remaining text as comment
  const comment = remainingText
    .replace(/\n+/g, ' ')
    .replace(/Frat Battle Results/gi, '')
    .replace(/My Frat Ranking/gi, '')
    .trim();
  
  return { rankings, comment };
}

export default function RankingPostCard({ rankings, comment }: RankingPostCardProps) {
  // Sort rankings by tier order
  const sortedRankings = [...rankings].sort((a, b) => {
    const aRank = TIER_CONFIG[a.tier]?.rank || 99;
    const bRank = TIER_CONFIG[b.tier]?.rank || 99;
    return aRank - bRank;
  });

  // Group by tier category (Touse, Mouse, Bouse)
  const touseRankings = sortedRankings.filter(r => r.tier.includes('Touse'));
  const mouseRankings = sortedRankings.filter(r => r.tier.includes('Mouse'));
  const bouseRankings = sortedRankings.filter(r => r.tier.includes('Bouse'));

  return (
    <div className="rounded-xl overflow-hidden border border-amber-500/30 bg-gradient-to-br from-amber-500/5 via-transparent to-orange-500/5">
      {/* Header */}
      <div className="px-4 py-3 bg-gradient-to-r from-amber-500/20 to-orange-500/20 border-b border-amber-500/20 flex items-center gap-2">
        <Trophy className="h-5 w-5 text-amber-500" />
        <span className="font-bold text-sm">Frat Ranking</span>
      </div>
      
      {/* Comment if exists */}
      {comment && (
        <div className="px-4 py-3 border-b border-border/50">
          <p className="text-sm">{comment}</p>
        </div>
      )}
      
      {/* Rankings grid */}
      <div className="p-3 space-y-2">
        {/* Touse tier */}
        {touseRankings.length > 0 && (
          <div className="space-y-1">
            {touseRankings.map((r, idx) => {
              const config = TIER_CONFIG[r.tier];
              return (
                <div
                  key={`${r.tier}-${idx}`}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2 rounded-lg border",
                    config?.bgColor || "bg-muted"
                  )}
                >
                  <div className={cn(
                    "w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold",
                    "bg-emerald-500 text-white"
                  )}>
                    {config?.icon || config?.rank}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate">{r.fratName}</p>
                  </div>
                  <span className={cn("text-xs font-medium", config?.color)}>
                    {r.tier}
                  </span>
                </div>
              );
            })}
          </div>
        )}
        
        {/* Mouse tier */}
        {mouseRankings.length > 0 && (
          <div className="space-y-1">
            {mouseRankings.map((r, idx) => {
              const config = TIER_CONFIG[r.tier];
              return (
                <div
                  key={`${r.tier}-${idx}`}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2 rounded-lg border",
                    config?.bgColor || "bg-muted"
                  )}
                >
                  <div className={cn(
                    "w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold",
                    "bg-amber-500 text-white"
                  )}>
                    {config?.rank}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate">{r.fratName}</p>
                  </div>
                  <span className={cn("text-xs font-medium", config?.color)}>
                    {r.tier === 'Mouse 1' || r.tier === 'Mouse 2' ? 'Mouse' : r.tier}
                  </span>
                </div>
              );
            })}
          </div>
        )}
        
        {/* Bouse tier */}
        {bouseRankings.length > 0 && (
          <div className="space-y-1">
            {bouseRankings.map((r, idx) => {
              const config = TIER_CONFIG[r.tier];
              return (
                <div
                  key={`${r.tier}-${idx}`}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2 rounded-lg border",
                    config?.bgColor || "bg-muted"
                  )}
                >
                  <div className={cn(
                    "w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold",
                    "bg-red-500 text-white"
                  )}>
                    {config?.rank}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate">{r.fratName}</p>
                  </div>
                  <span className={cn("text-xs font-medium", config?.color)}>
                    {r.tier}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
