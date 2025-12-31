import { useState } from 'react';
import { Trophy, Crown, ChevronDown, ChevronUp } from 'lucide-react';
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
  'Upper Touse': { color: 'text-emerald-600', bgColor: 'bg-emerald-500/20 border-emerald-500/40', icon: <Crown className="h-3 w-3" />, rank: 1 },
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
  const tierPatterns = ['Upper Touse', 'Touse', 'Lower Touse', 'Upper Mouse', 'Mouse', 'Lower Mouse', 'Upper Bouse', 'Bouse', 'Lower Bouse'];
  const rankings: RankingEntry[] = [];
  let remainingText = text;
  
  remainingText = remainingText.replace(/^[🎮🏆]\s*(Frat Battle Results|My Frat Ranking)?\s*\n*/i, '');
  
  for (const tier of tierPatterns) {
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
  
  const comment = remainingText
    .replace(/\n+/g, ' ')
    .replace(/Frat Battle Results/gi, '')
    .replace(/My Frat Ranking/gi, '')
    .trim();
  
  return { rankings, comment };
}

export default function RankingPostCard({ rankings }: RankingPostCardProps) {
  const [expanded, setExpanded] = useState(false);

  // Sort rankings by tier order
  const sortedRankings = [...rankings].sort((a, b) => {
    const aRank = TIER_CONFIG[a.tier]?.rank || 99;
    const bRank = TIER_CONFIG[b.tier]?.rank || 99;
    return aRank - bRank;
  });

  // Get key rankings for collapsed view: #1 (Upper Touse), #5 (Mouse), #10 (Lower Bouse)
  const keyRankings = sortedRankings.filter(r => 
    r.tier === 'Upper Touse' || 
    r.tier === 'Mouse' || 
    r.tier === 'Mouse 1' || 
    r.tier === 'Lower Bouse'
  );

  const displayRankings = expanded ? sortedRankings : keyRankings;
  const hasMoreRankings = sortedRankings.length > keyRankings.length;

  const renderRankingRow = (r: RankingEntry, idx: number) => {
    const config = TIER_CONFIG[r.tier];
    const isTop = r.tier === 'Upper Touse';
    const isMid = r.tier.includes('Mouse');
    const isBottom = r.tier.includes('Bouse');
    
    return (
      <div
        key={`${r.tier}-${idx}`}
        className={cn(
          "flex items-center gap-2 px-2.5 py-1.5 rounded-lg border",
          config?.bgColor || "bg-muted"
        )}
      >
        <div className={cn(
          "w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white",
          isTop && "bg-emerald-500",
          isMid && "bg-amber-500",
          isBottom && "bg-red-500"
        )}>
          {config?.icon || config?.rank}
        </div>
        <p className="flex-1 font-medium text-xs truncate">{r.fratName}</p>
        <span className={cn("text-[10px] font-medium", config?.color)}>
          {r.tier === 'Mouse 1' || r.tier === 'Mouse 2' ? 'Mouse' : r.tier}
        </span>
      </div>
    );
  };

  return (
    <div className="rounded-xl overflow-hidden border border-amber-500/30 bg-gradient-to-br from-amber-500/5 via-transparent to-orange-500/5">
      {/* Header */}
      <div className="px-3 py-2 bg-gradient-to-r from-amber-500/20 to-orange-500/20 border-b border-amber-500/20 flex items-center gap-2">
        <Trophy className="h-4 w-4 text-amber-500" />
        <span className="font-bold text-xs">Frat Ranking</span>
      </div>
      
      {/* Rankings */}
      <div className="p-2 space-y-1">
        {displayRankings.map((r, idx) => renderRankingRow(r, idx))}
        
        {/* Expand/Collapse button */}
        {hasMoreRankings && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="w-full flex items-center justify-center gap-1 py-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            {expanded ? (
              <>
                <ChevronUp className="h-3 w-3" />
                Show less
              </>
            ) : (
              <>
                <ChevronDown className="h-3 w-3" />
                View all {sortedRankings.length} rankings
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}
