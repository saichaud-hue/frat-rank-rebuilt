import { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Swords, Crown, ArrowRight, Sparkles, Flame, ChevronLeft, Share2, Save, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { type Fraternity } from '@/api/base44Client';
import { getFratGreek } from '@/utils';

interface SavedBattleRanking {
  id: string;
  date: string;
  ranking: Array<{ fratId: string; fratName: string; tier: string; wins: number }>;
}

interface FratBattleGameProps {
  fraternities: Fraternity[];
  onComplete: (ranking: Record<string, Fraternity>) => void;
  onClose: () => void;
  onShare?: (ranking: Array<{ fratId: string; fratName: string; tier: string; wins: number }>) => void;
  onSave?: (ranking: Array<{ fratId: string; fratName: string; tier: string; wins: number }>) => void;
  existingRankings?: Fraternity[]; // User's existing ranking from YourRankings page
}

interface Matchup {
  left: Fraternity;
  right: Fraternity;
}

interface EloScore {
  fratId: string;
  score: number;
  wins: number;
}

const TIERS = [
  { key: 'Upper Touse', label: 'Upper Touse (1st)', color: 'from-green-500 to-emerald-600' },
  { key: 'Touse', label: 'Touse (2nd)', color: 'from-green-400 to-emerald-500' },
  { key: 'Lower Touse', label: 'Lower Touse (3rd)', color: 'from-lime-500 to-green-500' },
  { key: 'Upper Mouse', label: 'Upper Mouse (4th)', color: 'from-yellow-400 to-amber-500' },
  { key: 'Mouse 1', label: 'Mouse (5th)', color: 'from-yellow-500 to-orange-400' },
  { key: 'Mouse 2', label: 'Mouse (6th)', color: 'from-orange-400 to-amber-500' },
  { key: 'Lower Mouse', label: 'Lower Mouse (7th)', color: 'from-orange-500 to-red-400' },
  { key: 'Upper Bouse', label: 'Upper Bouse (8th)', color: 'from-red-400 to-rose-500' },
  { key: 'Bouse', label: 'Bouse (9th)', color: 'from-red-500 to-rose-600' },
  { key: 'Lower Bouse', label: 'Lower Bouse (10th)', color: 'from-red-600 to-red-700' },
];

export default function FratBattleGame({ 
  fraternities, 
  onComplete, 
  onClose,
  onShare,
  onSave,
  existingRankings 
}: FratBattleGameProps) {
  const [currentMatchupIndex, setCurrentMatchupIndex] = useState(0);
  const [eloScores, setEloScores] = useState<Record<string, EloScore>>({});
  const [showResults, setShowResults] = useState(false);
  const [selectedWinner, setSelectedWinner] = useState<string | null>(null);
  const [animatingChoice, setAnimatingChoice] = useState(false);

  const TOTAL_MATCHUPS = 10;

  // Generate smart matchups based on existing rankings or randomly
  const matchups = useMemo(() => {
    const generated: Matchup[] = [];
    const frats = [...fraternities];
    
    if (frats.length < 2) return [];
    
    // Initialize Elo scores
    const initialElo: Record<string, EloScore> = {};
    frats.forEach((frat, idx) => {
      // If user has existing rankings, use that to seed initial Elo
      let startingScore = 1000;
      if (existingRankings && existingRankings.length > 0) {
        const rankIdx = existingRankings.findIndex(r => r.id === frat.id);
        if (rankIdx !== -1) {
          // Higher ranked = higher starting Elo
          startingScore = 1500 - (rankIdx * 50);
        }
      }
      initialElo[frat.id] = { fratId: frat.id, score: startingScore, wins: 0 };
    });
    
    // Generate matchups - mix of random and close-Elo matchups
    const usedPairs = new Set<string>();
    
    for (let i = 0; i < TOTAL_MATCHUPS; i++) {
      let attempts = 0;
      let left: Fraternity | null = null;
      let right: Fraternity | null = null;
      
      while (attempts < 50) {
        attempts++;
        
        if (existingRankings && existingRankings.length >= 2 && i < 6) {
          // For first 6 matchups, pick from close rankings for interesting battles
          const maxIdx = Math.min(existingRankings.length - 1, 9);
          const idx1 = Math.floor(Math.random() * (maxIdx + 1));
          let idx2 = idx1 + (Math.random() > 0.5 ? 1 : -1);
          if (idx2 < 0) idx2 = idx1 + 1;
          if (idx2 > maxIdx) idx2 = idx1 - 1;
          if (idx2 < 0 || idx2 > maxIdx) idx2 = Math.floor(Math.random() * (maxIdx + 1));
          
          if (idx1 !== idx2 && existingRankings[idx1] && existingRankings[idx2]) {
            left = existingRankings[idx1];
            right = existingRankings[idx2];
          }
        } else {
          // Random matchups
          const shuffled = [...frats].sort(() => Math.random() - 0.5);
          left = shuffled[0];
          right = shuffled[1];
        }
        
        if (left && right) {
          const pairKey = [left.id, right.id].sort().join('-');
          if (!usedPairs.has(pairKey)) {
            usedPairs.add(pairKey);
            break;
          }
        }
        left = null;
        right = null;
      }
      
      // Fallback to any random pair
      if (!left || !right) {
        const shuffled = [...frats].sort(() => Math.random() - 0.5);
        left = shuffled[0];
        right = shuffled[1];
      }
      
      generated.push({ left, right });
    }
    
    return generated;
  }, [fraternities, existingRankings]);

  // Initialize Elo scores
  useEffect(() => {
    const initialElo: Record<string, EloScore> = {};
    fraternities.forEach((frat, idx) => {
      let startingScore = 1000;
      if (existingRankings && existingRankings.length > 0) {
        const rankIdx = existingRankings.findIndex(r => r.id === frat.id);
        if (rankIdx !== -1) {
          startingScore = 1500 - (rankIdx * 50);
        }
      }
      initialElo[frat.id] = { fratId: frat.id, score: startingScore, wins: 0 };
    });
    setEloScores(initialElo);
  }, [fraternities, existingRankings]);

  const currentMatchup = matchups[currentMatchupIndex];
  const progress = ((currentMatchupIndex) / TOTAL_MATCHUPS) * 100;

  const handleChoice = (winnerId: string, loserId: string) => {
    if (animatingChoice) return;
    
    setSelectedWinner(winnerId);
    setAnimatingChoice(true);
    
    // Update Elo scores
    setEloScores(prev => {
      const winner = { ...prev[winnerId] };
      const loser = { ...prev[loserId] };
      
      // Elo calculation
      const K = 32;
      const expectedWin = 1 / (1 + Math.pow(10, (loser.score - winner.score) / 400));
      const scoreChange = Math.round(K * (1 - expectedWin));
      
      winner.score += scoreChange;
      winner.wins += 1;
      loser.score -= scoreChange;
      
      return {
        ...prev,
        [winnerId]: winner,
        [loserId]: loser,
      };
    });
    
    // Animate and move to next
    setTimeout(() => {
      setSelectedWinner(null);
      setAnimatingChoice(false);
      
      if (currentMatchupIndex + 1 >= TOTAL_MATCHUPS) {
        setShowResults(true);
      } else {
        setCurrentMatchupIndex(prev => prev + 1);
      }
    }, 600);
  };

  // Calculate final ranking
  const finalRanking = useMemo(() => {
    const sorted = Object.values(eloScores)
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);
    
    const ranking: Record<string, Fraternity> = {};
    sorted.forEach((elo, idx) => {
      const frat = fraternities.find(f => f.id === elo.fratId);
      if (frat && TIERS[idx]) {
        ranking[TIERS[idx].key] = frat;
      }
    });
    
    return ranking;
  }, [eloScores, fraternities]);

  const handleSubmitRanking = () => {
    onComplete(finalRanking);
  };

  if (matchups.length === 0) {
    return (
      <div className="p-8 text-center">
        <p className="text-muted-foreground">Not enough fraternities to create matchups</p>
        <Button onClick={onClose} className="mt-4">Go Back</Button>
      </div>
    );
  }

  if (showResults) {
    const sortedResults = Object.values(eloScores)
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);

    // Build ranking data for share/save
    const rankingData = sortedResults.map((elo, idx) => {
      const frat = fraternities.find(f => f.id === elo.fratId);
      const tier = TIERS[idx];
      return {
        fratId: elo.fratId,
        fratName: frat?.name || '',
        tier: tier?.key || '',
        wins: elo.wins,
      };
    }).filter(r => r.fratName);

    const handleShare = () => {
      if (onShare) {
        onShare(rankingData);
      }
    };

    const handleSave = () => {
      if (onSave) {
        onSave(rankingData);
      }
    };

    return (
      <div className="space-y-4">
        {/* Top action bar - Save left, Share right */}
        <div className="flex items-center justify-between">
          <Button 
            variant="ghost" 
            size="sm"
            onClick={handleSave}
            className="gap-2"
          >
            <Save className="h-4 w-4" />
            Save
          </Button>
          <Button 
            variant="ghost" 
            size="sm"
            onClick={handleShare}
            className="gap-2"
          >
            <Share2 className="h-4 w-4" />
            Share
          </Button>
        </div>

        <div className="text-center">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center"
          >
            <Trophy className="h-10 w-10 text-white" />
          </motion.div>
          <h2 className="text-2xl font-bold mb-2">Your Ranking!</h2>
          <p className="text-muted-foreground">Based on your {TOTAL_MATCHUPS} head-to-head picks</p>
        </div>

        <div className="space-y-2">
          {sortedResults.map((elo, idx) => {
            const frat = fraternities.find(f => f.id === elo.fratId);
            const tier = TIERS[idx];
            if (!frat || !tier) return null;

            return (
              <motion.div
                key={elo.fratId}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.1 }}
                className={cn(
                  "p-3 rounded-xl border flex items-center gap-3",
                  idx < 3 && "bg-green-500/10 border-green-500/30",
                  idx >= 3 && idx < 7 && "bg-yellow-500/10 border-yellow-500/30",
                  idx >= 7 && "bg-red-500/10 border-red-500/30"
                )}
              >
                <div className={cn(
                  "w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold bg-gradient-to-br",
                  tier.color
                )}>
                  {idx === 0 ? <Crown className="h-5 w-5" /> : idx + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold truncate">{frat.name}</p>
                  <p className="text-xs text-muted-foreground">{tier.label.replace(/\s*\(\d+\w+\)/, '')}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <span className="text-sm font-medium text-muted-foreground">
                    {elo.wins} {elo.wins === 1 ? 'win' : 'wins'}
                  </span>
                </div>
              </motion.div>
            );
          })}
        </div>

        <div className="flex gap-3 pt-2">
          <Button 
            variant="ghost" 
            onClick={onClose}
            className="flex-1 rounded-xl"
          >
            <ChevronLeft className="h-4 w-4 mr-2" />
            Cancel
          </Button>
          <Button 
            onClick={handleSubmitRanking}
            className="flex-1 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500"
          >
            <Sparkles className="h-4 w-4 mr-2" />
            Use This Ranking
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <div className="flex items-center justify-center gap-2 mb-2">
          <Swords className="h-6 w-6 text-amber-500" />
          <h2 className="text-xl font-bold">Frat Battle</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          Pick your winner! {currentMatchupIndex + 1} of {TOTAL_MATCHUPS}
        </p>
      </div>

      {/* Progress */}
      <div className="space-y-2">
        <Progress value={progress} className="h-2" />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>Start</span>
          <span>{Math.round(progress)}%</span>
          <span>Done</span>
        </div>
      </div>

      {/* Battle Arena */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentMatchupIndex}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="relative"
        >
          <div className="grid grid-cols-2 gap-4">
            {/* Left Frat */}
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => handleChoice(currentMatchup.left.id, currentMatchup.right.id)}
              disabled={animatingChoice}
              className={cn(
                "relative p-6 rounded-2xl border-2 transition-all min-h-[160px] flex flex-col items-center justify-center text-center",
                selectedWinner === currentMatchup.left.id
                  ? "border-green-500 bg-green-500/20 scale-105"
                  : selectedWinner === currentMatchup.right.id
                  ? "border-red-500/30 bg-red-500/10 opacity-50"
                  : "border-border hover:border-primary/50 bg-card"
              )}
            >
              {selectedWinner === currentMatchup.left.id && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute top-2 right-2"
                >
                  <Crown className="h-6 w-6 text-green-500" />
                </motion.div>
              )}
              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-violet-500 to-purple-500 flex items-center justify-center text-white font-bold text-lg mb-3">
                {getFratGreek(currentMatchup.left.name)}
              </div>
              <p className="font-bold text-lg">{currentMatchup.left.name}</p>
            </motion.button>

            {/* VS Badge */}
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center text-white font-black shadow-lg shadow-orange-500/30">
                VS
              </div>
            </div>

            {/* Right Frat */}
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => handleChoice(currentMatchup.right.id, currentMatchup.left.id)}
              disabled={animatingChoice}
              className={cn(
                "relative p-6 rounded-2xl border-2 transition-all min-h-[160px] flex flex-col items-center justify-center text-center",
                selectedWinner === currentMatchup.right.id
                  ? "border-green-500 bg-green-500/20 scale-105"
                  : selectedWinner === currentMatchup.left.id
                  ? "border-red-500/30 bg-red-500/10 opacity-50"
                  : "border-border hover:border-primary/50 bg-card"
              )}
            >
              {selectedWinner === currentMatchup.right.id && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute top-2 right-2"
                >
                  <Crown className="h-6 w-6 text-green-500" />
                </motion.div>
              )}
              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-pink-500 to-rose-500 flex items-center justify-center text-white font-bold text-lg mb-3">
                {getFratGreek(currentMatchup.right.name)}
              </div>
              <p className="font-bold text-lg">{currentMatchup.right.name}</p>
            </motion.button>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Hint */}
      <div className="text-center">
        <p className="text-xs text-muted-foreground flex items-center justify-center gap-1">
          <Flame className="h-3 w-3" />
          Tap the frat you prefer!
        </p>
      </div>

      {/* Cancel button */}
      <Button 
        variant="ghost" 
        onClick={onClose}
        className="w-full rounded-xl"
      >
        Cancel
      </Button>
    </div>
  );
}
