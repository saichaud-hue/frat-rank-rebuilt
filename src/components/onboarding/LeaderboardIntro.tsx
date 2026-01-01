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
      <Card className="w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl p-6 pb-8 animate-slide-up sm:animate-scale-in" style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 32px)' }}>
        {!showFratList ? (
          <div className="space-y-6">
            {/* Icon */}
            <div className="mx-auto w-20 h-20 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center">
              <Trophy className="h-10 w-10 text-white" />
            </div>

            {/* Content */}
            <div className="text-center space-y-3">
              <h2 className="text-2xl font-bold">See Who's On Top</h2>
              <p className="text-muted-foreground text-lg">
                Discover the top fraternities on campus
              </p>
            </div>

            {/* Features */}
            <div className="space-y-3 text-left">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                  <BarChart3 className="h-4 w-4 text-blue-500" />
                </div>
                <p className="text-sm text-muted-foreground pt-1">
                  <span className="font-semibold text-foreground">All</span> — Overall scores combining reputation + parties
                </p>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-purple-500/10 flex items-center justify-center flex-shrink-0">
                  <Users className="h-4 w-4 text-purple-500" />
                </div>
                <p className="text-sm text-muted-foreground pt-1">
                  <span className="font-semibold text-foreground">Frats</span> — Brotherhood, reputation & community ratings
                </p>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-pink-500/10 flex items-center justify-center flex-shrink-0">
                  <PartyPopper className="h-4 w-4 text-pink-500" />
                </div>
                <p className="text-sm text-muted-foreground pt-1">
                  <span className="font-semibold text-foreground">Parties</span> — Ranked by party quality scores
                </p>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-orange-500/10 flex items-center justify-center flex-shrink-0">
                  <Flame className="h-4 w-4 text-orange-500" />
                </div>
                <p className="text-sm text-muted-foreground pt-1">
                  <span className="font-semibold text-foreground">Hot</span> — Who's trending with recent activity
                </p>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-amber-500/10 flex items-center justify-center flex-shrink-0">
                  <Star className="h-4 w-4 text-amber-500" />
                </div>
                <p className="text-sm text-muted-foreground pt-1">
                  Tap any fraternity to <span className="font-semibold text-foreground">rate them</span>
                </p>
              </div>
            </div>

            {/* Checkbox */}
            <div className="flex items-center justify-center gap-2">
              <Checkbox 
                id="never-show-leaderboard" 
                checked={neverShowAgain}
                onCheckedChange={(checked) => setNeverShowAgain(checked === true)}
              />
              <Label htmlFor="never-show-leaderboard" className="text-sm text-muted-foreground cursor-pointer">
                Don't show this again
              </Label>
            </div>

            {/* Buttons */}
            <div className="space-y-3">
              <Button 
                onClick={handleExplore} 
                className="w-full min-h-[52px] text-base font-semibold gradient-primary text-white active:scale-[0.98] transition-transform"
              >
                Start Exploring
              </Button>
              <Button 
                onClick={handleShowFrats} 
                variant="outline"
                className="w-full min-h-[52px] text-base font-medium active:scale-[0.98] transition-transform"
              >
                Rate a Frat
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Header with back button */}
            <div className="flex items-center gap-3">
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={handleBack}
                className="h-10 w-10 rounded-full"
              >
                <ChevronLeft className="h-5 w-5" />
              </Button>
              <div>
                <h2 className="text-xl font-bold">Choose a Frat to Rate</h2>
                <p className="text-sm text-muted-foreground">Tap to select</p>
              </div>
            </div>

            {/* Fraternity List */}
            <ScrollArea className="h-[320px] -mx-2 px-2">
              <div className="space-y-2">
                {fraternities.map((frat) => (
                  <button
                    key={frat.id}
                    onClick={() => handleSelectFrat(frat)}
                    className="w-full flex items-center gap-3 p-3 rounded-xl bg-muted/50 hover:bg-muted active:scale-[0.98] transition-all text-left"
                  >
                    <Avatar className="h-12 w-12 rounded-xl">
                      <AvatarImage src={frat.logo_url} alt={frat.name} />
                      <AvatarFallback className="rounded-xl bg-primary/10 text-primary font-bold text-xs">
                        {getFratGreek(frat.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold truncate">{frat.chapter || getFratShorthand(frat.name)}</p>
                      <p className="text-sm text-muted-foreground">{frat.name}</p>
                    </div>
                    <Star className="h-5 w-5 text-amber-500" />
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