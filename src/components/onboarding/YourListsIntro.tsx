import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ListOrdered, Trophy, PartyPopper, Star, ChevronLeft, Lock, CheckCircle2, Sparkles } from 'lucide-react';
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
}: YourListsIntroProps) {
  const navigate = useNavigate();
  const [neverShowAgain, setNeverShowAgain] = useState(false);
  const [step, setStep] = useState<IntroStep>('main');

  const fratUnlocked = ratedFratCount >= totalFratCount && totalFratCount > 0;
  const partyUnlocked = ratedPartyCount >= 3;
  const fratsRemaining = totalFratCount - ratedFratCount;
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
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center">
      <Card 
        className="w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl p-6 pb-8 animate-slide-up sm:animate-scale-in" 
        style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 32px)' }}
      >
        {step === 'main' && (
          <div className="space-y-6">
            {/* Icon */}
            <div className="mx-auto w-20 h-20 rounded-2xl bg-primary flex items-center justify-center">
              <ListOrdered className="h-10 w-10 text-primary-foreground" />
            </div>

            {/* Content */}
            <div className="text-center space-y-3">
              <h2 className="text-2xl font-bold">Your Personal Rankings</h2>
              <p className="text-muted-foreground text-lg">
                See your own list of favorites
              </p>
            </div>

            {/* Options */}
            <div className="space-y-3">
              <button
                onClick={handleViewFrats}
                className="w-full flex items-center gap-4 p-4 rounded-xl bg-muted/50 hover:bg-muted active:scale-[0.98] transition-all text-left"
              >
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Trophy className="h-6 w-6 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold">Your Fraternities</p>
                  <p className="text-sm text-muted-foreground">
                    {fratUnlocked 
                      ? `${ratedFratCount} rated` 
                      : `Rate all ${totalFratCount} to unlock`}
                  </p>
                </div>
                {fratUnlocked ? (
                  <CheckCircle2 className="h-6 w-6 text-green-500" />
                ) : (
                  <Lock className="h-5 w-5 text-muted-foreground" />
                )}
              </button>

              <button
                onClick={handleViewParties}
                className="w-full flex items-center gap-4 p-4 rounded-xl bg-muted/50 hover:bg-muted active:scale-[0.98] transition-all text-left"
              >
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                  <PartyPopper className="h-6 w-6 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold">Your Parties</p>
                  <p className="text-sm text-muted-foreground">
                    {partyUnlocked 
                      ? `${ratedPartyCount} rated` 
                      : `Rate 3 parties to unlock`}
                  </p>
                </div>
                {partyUnlocked ? (
                  <CheckCircle2 className="h-6 w-6 text-green-500" />
                ) : (
                  <Lock className="h-5 w-5 text-muted-foreground" />
                )}
              </button>
            </div>

            {/* Checkbox */}
            <div className="flex items-center justify-center gap-2">
              <Checkbox 
                id="never-show-lists" 
                checked={neverShowAgain}
                onCheckedChange={(checked) => setNeverShowAgain(checked === true)}
              />
              <Label htmlFor="never-show-lists" className="text-sm text-muted-foreground cursor-pointer">
                Don't show this again
              </Label>
            </div>

            {/* Skip or View Rankings button */}
            {fratUnlocked && partyUnlocked ? (
              <Button 
                onClick={() => onComplete(neverShowAgain)} 
                className="w-full min-h-[52px] text-base font-semibold bg-primary hover:bg-primary/90 text-primary-foreground active:scale-[0.98] transition-all shadow-lg"
              >
                <Sparkles className="h-5 w-5 mr-2" />
                View Your Rankings!
              </Button>
            ) : (
              <Button 
                onClick={() => onComplete(neverShowAgain)} 
                variant="outline"
                className="w-full min-h-[52px] text-base font-medium active:scale-[0.98] transition-transform"
              >
                Skip for Now
              </Button>
            )}
          </div>
        )}

        {step === 'frats' && (
          <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center gap-3">
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => setStep('main')}
                className="h-10 w-10 rounded-full"
              >
                <ChevronLeft className="h-5 w-5" />
              </Button>
              <div>
                <h2 className="text-xl font-bold">Unlock Your Frat List</h2>
                <p className="text-sm text-muted-foreground">Rate all fraternities first</p>
              </div>
            </div>

            {/* Progress */}
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Progress</span>
                <span className="font-semibold">{ratedFratCount} / {totalFratCount}</span>
              </div>
              <Progress value={(ratedFratCount / totalFratCount) * 100} className="h-3" />
              <p className="text-center text-muted-foreground">
                {fratsRemaining} more {fratsRemaining === 1 ? 'fraternity' : 'fraternities'} to go!
              </p>
            </div>

            {/* Icon */}
            <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <Lock className="h-8 w-8 text-primary" />
            </div>

            {/* Message */}
            <p className="text-center text-muted-foreground">
              Rate every fraternity to see your personalized ranking from #1 to #{totalFratCount}
            </p>

            {/* Action */}
            <Button 
              onClick={() => setStep('frat-list')} 
              className="w-full min-h-[52px] text-base font-semibold bg-primary hover:bg-primary/90 text-primary-foreground active:scale-[0.98] transition-transform"
            >
              <Star className="h-5 w-5 mr-2" />
              Rate a Fraternity
            </Button>
          </div>
        )}

        {step === 'parties' && (
          <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center gap-3">
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => setStep('main')}
                className="h-10 w-10 rounded-full"
              >
                <ChevronLeft className="h-5 w-5" />
              </Button>
              <div>
                <h2 className="text-xl font-bold">Unlock Your Party List</h2>
                <p className="text-sm text-muted-foreground">Rate at least 3 parties</p>
              </div>
            </div>

            {/* Progress */}
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Progress</span>
                <span className="font-semibold">{ratedPartyCount} / 3</span>
              </div>
              <Progress value={Math.min((ratedPartyCount / 3) * 100, 100)} className="h-3" />
              <p className="text-center text-muted-foreground">
                {partiesRemaining > 0 
                  ? `${partiesRemaining} more ${partiesRemaining === 1 ? 'party' : 'parties'} to go!`
                  : 'Almost there!'}
              </p>
            </div>

            {/* Icon */}
            <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <Lock className="h-8 w-8 text-primary" />
            </div>

            {/* Message */}
            <p className="text-center text-muted-foreground">
              Rate at least 3 parties to see your personalized party ranking
            </p>

            {/* Actions */}
            <div className="space-y-3">
              <Button 
                onClick={() => setStep('party-list')} 
                className="w-full min-h-[52px] text-base font-semibold bg-primary hover:bg-primary/90 text-primary-foreground active:scale-[0.98] transition-transform"
              >
                <Star className="h-5 w-5 mr-2" />
                Rate a Party
              </Button>
              <Button 
                onClick={() => {
                  onComplete(neverShowAgain);
                  onSwitchToPartiesTab?.();
                }} 
                variant="outline"
                className="w-full min-h-[52px] text-base font-medium active:scale-[0.98] transition-transform"
              >
                Browse Parties
              </Button>
            </div>
          </div>
        )}

        {step === 'frat-list' && (
          <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center gap-3">
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => setStep('frats')}
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
                {fraternities.map((frat) => {
                  const isRated = ratedFratIds.includes(frat.id);
                  return (
                    <button
                      key={frat.id}
                      onClick={() => handleSelectFrat(frat)}
                      className={`w-full flex items-center gap-3 p-3 rounded-xl active:scale-[0.98] transition-all text-left ${
                        isRated 
                          ? 'bg-green-500/10 border border-green-500/30 hover:bg-green-500/20' 
                          : 'bg-muted/50 hover:bg-muted'
                      }`}
                    >
                      <Avatar className="h-12 w-12 rounded-xl">
                        <AvatarImage src={frat.logo_url} alt={frat.name} />
                        <AvatarFallback className={`rounded-xl font-bold text-xs ${
                          isRated ? 'bg-green-500/20 text-green-600' : 'bg-primary/10 text-primary'
                        }`}>
                          {getFratGreek(frat.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold truncate">{frat.name}</p>
                        {frat.chapter && (
                          <p className="text-sm text-muted-foreground">{frat.chapter}</p>
                        )}
                      </div>
                      {isRated ? (
                        <CheckCircle2 className="h-5 w-5 text-green-500" />
                      ) : (
                        <Star className="h-5 w-5 text-primary" />
                      )}
                    </button>
                  );
                })}
              </div>
            </ScrollArea>
          </div>
        )}

        {step === 'party-list' && (
          <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center gap-3">
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => setStep('parties')}
                className="h-10 w-10 rounded-full"
              >
                <ChevronLeft className="h-5 w-5" />
              </Button>
              <div>
                <h2 className="text-xl font-bold">Choose a Party to Rate</h2>
                <p className="text-sm text-muted-foreground">Tap to select</p>
              </div>
            </div>

            {/* Party List */}
            <ScrollArea className="h-[320px] -mx-2 px-2">
              <div className="space-y-2">
                {parties.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <PartyPopper className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>No past parties available yet</p>
                  </div>
                ) : (
                  parties.map((party) => {
                    const isRated = ratedPartyIds.includes(party.id);
                    return (
                      <button
                        key={party.id}
                        onClick={() => handleSelectParty(party)}
                        className={`w-full flex items-center gap-3 p-3 rounded-xl active:scale-[0.98] transition-all text-left ${
                          isRated 
                            ? 'bg-green-500/10 border border-green-500/30 hover:bg-green-500/20' 
                            : 'bg-muted/50 hover:bg-muted'
                        }`}
                      >
                        <div className={`h-12 w-12 rounded-xl flex items-center justify-center ${
                          isRated 
                            ? 'bg-green-500/20' 
                            : 'bg-primary/10'
                        }`}>
                          <PartyPopper className={`h-6 w-6 ${isRated ? 'text-green-600' : 'text-primary'}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold truncate">{party.title}</p>
                        </div>
                        {isRated ? (
                          <CheckCircle2 className="h-5 w-5 text-green-500" />
                        ) : (
                          <Star className="h-5 w-5 text-primary" />
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
