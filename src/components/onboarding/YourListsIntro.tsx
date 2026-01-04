import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ListOrdered, Trophy, PartyPopper, Star, ChevronLeft, Lock, CheckCircle2, BarChart3, Heart } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { getFratGreek } from '@/utils';

interface Fraternity {
  id: string;
  name: string;
  chapter?: string;
  logo_url?: string;
}

interface Party {
  id: string;
  title: string;
  fraternity_id?: string;
}

interface YourListsIntroProps {
  onComplete: (neverShowAgain: boolean) => void;
  onRateFrat: (fraternity: Fraternity, fromIntro: boolean) => void;
  onRateParty: (party: Party, fromIntro: boolean) => void;
  onSwitchToPartiesTab?: () => void;
  fraternities: Fraternity[];
  parties: Party[];
  ratedFratCount: number;
  ratedPartyCount: number;
  totalFratCount: number;
  ratedFratIds?: string[];
  ratedPartyIds?: string[];
  initialStep?: IntroStep;
}

type IntroStep = 'main' | 'frats' | 'parties' | 'frat-list' | 'party-list';

export default function YourListsIntro({ 
  onComplete, 
  onRateFrat, 
  onRateParty,
  onSwitchToPartiesTab,
  fraternities, 
  parties,
  ratedFratCount,
  ratedPartyCount,
  totalFratCount,
  ratedFratIds = [],
  ratedPartyIds = [],
  initialStep = 'main',
}: YourListsIntroProps) {
  const navigate = useNavigate();
  const [neverShowAgain, setNeverShowAgain] = useState(false);
  const [step, setStep] = useState<IntroStep>(initialStep);

  // Don't show if main tutorial is active
  const tutorialActive = sessionStorage.getItem('touse_tutorial_active') === 'true';
  if (tutorialActive) {
    return null;
  }

  const FRAT_UNLOCK_THRESHOLD = 5;
  const fratUnlocked = ratedFratCount >= FRAT_UNLOCK_THRESHOLD;
  const partyUnlocked = ratedPartyCount >= 3;
  const fratsRemaining = Math.max(0, FRAT_UNLOCK_THRESHOLD - ratedFratCount);
  const partiesRemaining = Math.max(0, 3 - ratedPartyCount);

  const handleSelectFrat = (frat: Fraternity) => {
    onComplete(neverShowAgain);
    onRateFrat(frat, true);
  };

  const handleSelectParty = (party: Party) => {
    onComplete(neverShowAgain);
    onRateParty(party, true);
  };

  const handleViewFrats = () => {
    if (fratUnlocked) {
      onComplete(neverShowAgain);
    } else {
      setStep('frats');
    }
  };

  const handleViewParties = () => {
    if (partyUnlocked) {
      onComplete(neverShowAgain);
      onSwitchToPartiesTab?.();
    } else {
      setStep('parties');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <Card 
        className="w-full sm:max-w-md max-h-[80vh] overflow-y-auto rounded-2xl p-4 animate-scale-in" 
        style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 16px)' }}
      >
        {step === 'main' && (
          <div className="space-y-3">
            {/* Icon - smaller */}
            <div className="mx-auto w-14 h-14 rounded-xl bg-primary flex items-center justify-center">
              <ListOrdered className="h-7 w-7 text-primary-foreground" />
            </div>

            {/* Content - more compact */}
            <div className="text-center space-y-1">
              <h2 className="text-xl font-bold">My Lists</h2>
              <p className="text-muted-foreground text-sm">
                Your personal tier list
              </p>
            </div>

            {/* Features - compact grid */}
            <div className="grid grid-cols-2 gap-2">
              <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/50">
                <div className="w-6 h-6 rounded-full bg-blue-500/10 flex items-center justify-center shrink-0">
                  <Trophy className="h-3 w-3 text-blue-500" />
                </div>
                <span className="text-xs">
                  <span className="font-semibold">Frats</span> — {fratUnlocked ? 'Unlocked' : `${ratedFratCount}/5`}
                </span>
              </div>
              <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/50">
                <div className="w-6 h-6 rounded-full bg-purple-500/10 flex items-center justify-center shrink-0">
                  <PartyPopper className="h-3 w-3 text-purple-500" />
                </div>
                <span className="text-xs">
                  <span className="font-semibold">Parties</span> — {partyUnlocked ? 'Unlocked' : `${ratedPartyCount}/3`}
                </span>
              </div>
              <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/50">
                <div className="w-6 h-6 rounded-full bg-pink-500/10 flex items-center justify-center shrink-0">
                  <BarChart3 className="h-3 w-3 text-pink-500" />
                </div>
                <span className="text-xs"><span className="font-semibold">Ranked</span> — By you</span>
              </div>
              <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/50">
                <div className="w-6 h-6 rounded-full bg-orange-500/10 flex items-center justify-center shrink-0">
                  <Heart className="h-3 w-3 text-orange-500" />
                </div>
                <span className="text-xs"><span className="font-semibold">Private</span> — Only you</span>
              </div>
            </div>

            {/* Tip */}
            <p className="text-center text-xs text-muted-foreground">
              <Star className="h-3 w-3 inline mr-1 text-amber-500" />
              Rate more to unlock your lists
            </p>

            {/* Checkbox */}
            <div className="flex items-center justify-center gap-2">
              <Checkbox 
                id="never-show-lists" 
                checked={neverShowAgain}
                onCheckedChange={(checked) => setNeverShowAgain(checked === true)}
                className="h-4 w-4"
              />
              <Label htmlFor="never-show-lists" className="text-xs text-muted-foreground cursor-pointer">
                Don't show again
              </Label>
            </div>

            {/* Buttons - horizontal layout */}
            <div className="flex gap-2">
              <Button 
                onClick={() => onComplete(neverShowAgain)} 
                variant="outline"
                className="flex-1 h-11 text-sm font-medium active:scale-[0.98] transition-transform"
              >
                {fratUnlocked && partyUnlocked ? 'Close' : 'Skip'}
              </Button>
              {fratUnlocked && partyUnlocked ? (
                <Button 
                  onClick={() => onComplete(neverShowAgain)} 
                  className="flex-1 h-11 text-sm font-semibold gradient-primary text-white active:scale-[0.98] transition-all"
                >
                  View Rankings
                </Button>
              ) : (
                <Button 
                  onClick={() => setStep('frat-list')} 
                  className="flex-1 h-11 text-sm font-semibold gradient-primary text-white active:scale-[0.98] transition-transform"
                >
                  Start Rating
                </Button>
              )}
            </div>
          </div>
        )}

        {step === 'frats' && (
          <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center gap-2">
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => setStep('main')}
                className="h-8 w-8 rounded-full"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div>
                <h2 className="text-lg font-bold">
                  {ratedFratCount >= totalFratCount ? 'All Frats Rated!' : 'Unlock Frat List'}
                </h2>
                <p className="text-xs text-muted-foreground">
                  {ratedFratCount >= totalFratCount ? 'Your list is ready' : 'Rate all fraternities'}
                </p>
              </div>
            </div>

            {/* Progress */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Progress</span>
                <span className="font-semibold">{ratedFratCount} / {totalFratCount}</span>
              </div>
              <Progress value={(ratedFratCount / totalFratCount) * 100} className="h-2" />
            </div>

            {/* Icon */}
            <div className={`mx-auto w-12 h-12 rounded-full flex items-center justify-center ${
              ratedFratCount >= totalFratCount ? 'bg-green-500/10' : 'bg-primary/10'
            }`}>
              {ratedFratCount >= totalFratCount ? (
                <Trophy className="h-6 w-6 text-green-500" />
              ) : (
                <Lock className="h-6 w-6 text-primary" />
              )}
            </div>

            {/* Action */}
            {ratedFratCount >= totalFratCount ? (
              <Button 
                onClick={() => onComplete(neverShowAgain)} 
                className="w-full h-11 text-sm font-semibold bg-green-500 hover:bg-green-600 text-white"
              >
                <Trophy className="h-4 w-4 mr-2" />
                View My List
              </Button>
            ) : (
              <Button 
                onClick={() => setStep('frat-list')} 
                className="w-full h-11 text-sm font-semibold gradient-primary text-white"
              >
                <Star className="h-4 w-4 mr-2" />
                Rate a Frat
              </Button>
            )}
          </div>
        )}

        {step === 'parties' && (
          <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center gap-2">
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => setStep('main')}
                className="h-8 w-8 rounded-full"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div>
                <h2 className="text-lg font-bold">Unlock Party List</h2>
                <p className="text-xs text-muted-foreground">Rate 3 parties</p>
              </div>
            </div>

            {/* Progress */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Progress</span>
                <span className="font-semibold">{ratedPartyCount} / 3</span>
              </div>
              <Progress value={Math.min((ratedPartyCount / 3) * 100, 100)} className="h-2" />
            </div>

            {/* Icon */}
            <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <Lock className="h-6 w-6 text-primary" />
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <Button 
                onClick={() => {
                  onComplete(neverShowAgain);
                  onSwitchToPartiesTab?.();
                }} 
                variant="outline"
                className="flex-1 h-11 text-sm font-medium"
              >
                Browse
              </Button>
              <Button 
                onClick={() => setStep('party-list')} 
                className="flex-1 h-11 text-sm font-semibold gradient-primary text-white"
              >
                Rate Party
              </Button>
            </div>
          </div>
        )}

        {step === 'frat-list' && (
          <div className="space-y-3">
            {/* Header */}
            <div className="flex items-center gap-2">
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => setStep('frats')}
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
                {fraternities.map((frat) => {
                  const isRated = ratedFratIds.includes(frat.id);
                  return (
                    <button
                      key={frat.id}
                      onClick={() => handleSelectFrat(frat)}
                      className={`w-full flex items-center gap-2.5 p-2.5 rounded-xl active:scale-[0.98] transition-all text-left ${
                        isRated 
                          ? 'bg-green-500/10 border border-green-500/30' 
                          : 'bg-muted/50 hover:bg-muted'
                      }`}
                    >
                      <Avatar className="h-10 w-10 rounded-lg">
                        <AvatarImage src={frat.logo_url} alt={frat.name} />
                        <AvatarFallback className={`rounded-lg font-bold text-xs ${
                          isRated ? 'bg-green-500/20 text-green-600' : 'bg-primary/10 text-primary'
                        }`}>
                          {getFratGreek(frat.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm truncate">{frat.name}</p>
                        {frat.chapter && (
                          <p className="text-xs text-muted-foreground truncate">{frat.chapter}</p>
                        )}
                      </div>
                      {isRated ? (
                        <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
                      ) : (
                        <Star className="h-4 w-4 text-primary shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>
            </ScrollArea>
          </div>
        )}

        {step === 'party-list' && (
          <div className="space-y-3">
            {/* Header */}
            <div className="flex items-center gap-2">
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => setStep('parties')}
                className="h-8 w-8 rounded-full"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div>
                <h2 className="text-lg font-bold">Rate a Party</h2>
                <p className="text-xs text-muted-foreground">Tap to select</p>
              </div>
            </div>

            {/* Party List */}
            <ScrollArea className="h-[280px] -mx-2 px-2">
              <div className="space-y-1.5">
                {parties.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <PartyPopper className="h-10 w-10 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No parties available yet</p>
                  </div>
                ) : (
                  parties.map((party) => {
                    const isRated = ratedPartyIds.includes(party.id);
                    return (
                      <button
                        key={party.id}
                        onClick={() => handleSelectParty(party)}
                        className={`w-full flex items-center gap-2.5 p-2.5 rounded-xl active:scale-[0.98] transition-all text-left ${
                          isRated 
                            ? 'bg-green-500/10 border border-green-500/30' 
                            : 'bg-muted/50 hover:bg-muted'
                        }`}
                      >
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
                          isRated ? 'bg-green-500/20' : 'bg-primary/10'
                        }`}>
                          <PartyPopper className={`h-5 w-5 ${isRated ? 'text-green-600' : 'text-primary'}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm truncate">{party.title}</p>
                        </div>
                        {isRated ? (
                          <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
                        ) : (
                          <Star className="h-4 w-4 text-primary shrink-0" />
                        )}
                      </button>
                    );
                  })
                )}
              </div>
            </ScrollArea>
          </div>
        )}
      </Card>
    </div>
  );
}
