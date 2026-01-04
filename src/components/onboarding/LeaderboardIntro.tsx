import { useState } from 'react';
import { Trophy, BarChart3, Users, PartyPopper, Flame, Star, ChevronLeft } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { getFratGreek, getFratShorthand } from '@/utils';

interface Fraternity {
  id: string;
  name: string;
  chapter?: string;
  letters?: string;
  logo_url?: string;
}

interface LeaderboardIntroProps {
  onComplete: (neverShowAgain: boolean) => void;
  onRate: (fraternity: Fraternity) => void;
  fraternities: Fraternity[];
}

export default function LeaderboardIntro({ onComplete, onRate, fraternities }: LeaderboardIntroProps) {
  const [neverShowAgain, setNeverShowAgain] = useState(false);
  const [showFratList, setShowFratList] = useState(false);

  // Don't show if main tutorial is active
  const tutorialActive = sessionStorage.getItem('touse_tutorial_active') === 'true';
  if (tutorialActive) {
    return null;
  }

  const handleExplore = () => {
    onComplete(neverShowAgain);
  };

  const handleShowFrats = () => {
    setShowFratList(true);
  };

  const handleSelectFrat = (frat: Fraternity) => {
    onComplete(neverShowAgain);
    onRate(frat);
  };

  const handleBack = () => {
    setShowFratList(false);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center">
      <Card className="w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl p-5 animate-slide-up sm:animate-scale-in" style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 20px)' }}>
        {!showFratList ? (
          <div className="space-y-4">
            {/* Icon - smaller */}
            <div className="mx-auto w-14 h-14 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center">
              <Trophy className="h-7 w-7 text-white" />
            </div>

            {/* Content - more compact */}
            <div className="text-center space-y-1">
              <h2 className="text-xl font-bold">Frat Leaderboard</h2>
              <p className="text-muted-foreground text-sm">
                Who runs campus? You decide.
              </p>
            </div>

            {/* Features - compact grid */}
            <div className="grid grid-cols-2 gap-2">
              <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/50">
                <div className="w-6 h-6 rounded-full bg-blue-500/10 flex items-center justify-center shrink-0">
                  <BarChart3 className="h-3 w-3 text-blue-500" />
                </div>
                <span className="text-xs"><span className="font-semibold">All</span> — Full rankings</span>
              </div>
              <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/50">
                <div className="w-6 h-6 rounded-full bg-purple-500/10 flex items-center justify-center shrink-0">
                  <Users className="h-3 w-3 text-purple-500" />
                </div>
                <span className="text-xs"><span className="font-semibold">Frats</span> — Reputation</span>
              </div>
              <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/50">
                <div className="w-6 h-6 rounded-full bg-pink-500/10 flex items-center justify-center shrink-0">
                  <PartyPopper className="h-3 w-3 text-pink-500" />
                </div>
                <span className="text-xs"><span className="font-semibold">Parties</span> — Best events</span>
              </div>
              <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/50">
                <div className="w-6 h-6 rounded-full bg-orange-500/10 flex items-center justify-center shrink-0">
                  <Flame className="h-3 w-3 text-orange-500" />
                </div>
                <span className="text-xs"><span className="font-semibold">Hot</span> — Rising now</span>
              </div>
            </div>

            {/* Tip */}
            <p className="text-center text-xs text-muted-foreground">
              <Star className="h-3 w-3 inline mr-1 text-amber-500" />
              Rate any house to influence the rankings
            </p>

            {/* Checkbox */}
            <div className="flex items-center justify-center gap-2">
              <Checkbox 
                id="never-show-leaderboard" 
                checked={neverShowAgain}
                onCheckedChange={(checked) => setNeverShowAgain(checked === true)}
                className="h-4 w-4"
              />
              <Label htmlFor="never-show-leaderboard" className="text-xs text-muted-foreground cursor-pointer">
                Don't show again
              </Label>
            </div>

            {/* Buttons - horizontal layout */}
            <div className="flex gap-2">
              <Button 
                onClick={handleShowFrats} 
                variant="outline"
                className="flex-1 h-11 text-sm font-medium active:scale-[0.98] transition-transform"
              >
                Rate a Frat
              </Button>
              <Button 
                onClick={handleExplore} 
                className="flex-1 h-11 text-sm font-semibold gradient-primary text-white active:scale-[0.98] transition-transform"
              >
                Explore
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Header with back button */}
            <div className="flex items-center gap-2">
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={handleBack}
                className="h-8 w-8 rounded-full"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div>
                <h2 className="text-lg font-bold">Rate a Frat</h2>
                <p className="text-xs text-muted-foreground">Tap to select</p>
              </div>
            </div>

            {/* Fraternity List */}
            <ScrollArea className="h-[280px] -mx-2 px-2">
              <div className="space-y-1.5">
                {fraternities.map((frat) => (
                  <button
                    key={frat.id}
                    onClick={() => handleSelectFrat(frat)}
                    className="w-full flex items-center gap-2.5 p-2.5 rounded-xl bg-muted/50 hover:bg-muted active:scale-[0.98] transition-all text-left"
                  >
                    <Avatar className="h-10 w-10 rounded-lg">
                      <AvatarImage src={frat.logo_url} alt={frat.name} />
                      <AvatarFallback className="rounded-lg bg-primary/10 text-primary font-bold text-xs">
                        {getFratGreek(frat.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm truncate">{frat.chapter || getFratShorthand(frat.name)}</p>
                      <p className="text-xs text-muted-foreground truncate">{frat.name}</p>
                    </div>
                    <Star className="h-4 w-4 text-amber-500 shrink-0" />
                  </button>
                ))}
              </div>
            </ScrollArea>
          </div>
        )}
      </Card>
    </div>
  );
}
