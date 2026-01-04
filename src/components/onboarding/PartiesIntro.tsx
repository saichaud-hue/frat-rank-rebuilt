import { useState } from 'react';
import { PartyPopper, Calendar, Star, Clock, MapPin } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';

interface PartiesIntroProps {
  onComplete: (neverShowAgain: boolean) => void;
  onSubmitParty: () => void;
}

export default function PartiesIntro({ onComplete, onSubmitParty }: PartiesIntroProps) {
  const [neverShowAgain, setNeverShowAgain] = useState(false);

  // Don't show if main tutorial is active
  const tutorialActive = sessionStorage.getItem('touse_tutorial_active') === 'true';
  if (tutorialActive) {
    return null;
  }

  const handleSubmitParty = () => {
    if (neverShowAgain) {
      localStorage.setItem('fratrank_parties_intro_never_show', 'true');
    }
    onSubmitParty();
  };

  const handleBrowse = () => {
    onComplete(neverShowAgain);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center">
      <Card className="w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl p-5 animate-slide-up sm:animate-scale-in" style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 20px)' }}>
        <div className="space-y-4">
          {/* Icon - smaller */}
          <div className="mx-auto w-14 h-14 rounded-xl bg-gradient-to-br from-primary to-pink-500 flex items-center justify-center">
            <PartyPopper className="h-7 w-7 text-white" />
          </div>

          {/* Content - more compact */}
          <div className="text-center space-y-1">
            <h2 className="text-xl font-bold">Party Central</h2>
            <p className="text-muted-foreground text-sm">
              See what is happening on campus
            </p>
          </div>

          {/* Features - compact grid */}
          <div className="grid grid-cols-2 gap-2">
            <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/50">
              <div className="w-6 h-6 rounded-full bg-blue-500/10 flex items-center justify-center shrink-0">
                <Clock className="h-3 w-3 text-blue-500" />
              </div>
              <span className="text-xs"><span className="font-semibold">Live</span> — Right now</span>
            </div>
            <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/50">
              <div className="w-6 h-6 rounded-full bg-purple-500/10 flex items-center justify-center shrink-0">
                <Calendar className="h-3 w-3 text-purple-500" />
              </div>
              <span className="text-xs"><span className="font-semibold">Upcoming</span> — This week</span>
            </div>
            <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/50">
              <div className="w-6 h-6 rounded-full bg-pink-500/10 flex items-center justify-center shrink-0">
                <Star className="h-3 w-3 text-pink-500" />
              </div>
              <span className="text-xs"><span className="font-semibold">Ratings</span> — Real reviews</span>
            </div>
            <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/50">
              <div className="w-6 h-6 rounded-full bg-orange-500/10 flex items-center justify-center shrink-0">
                <MapPin className="h-3 w-3 text-orange-500" />
              </div>
              <span className="text-xs"><span className="font-semibold">Details</span> — Full info</span>
            </div>
          </div>

          {/* Tip */}
          <p className="text-center text-xs text-muted-foreground">
            <Star className="h-3 w-3 inline mr-1 text-amber-500" />
            Rate parties after you go
          </p>

          {/* Checkbox */}
          <div className="flex items-center justify-center gap-2">
            <Checkbox 
              id="never-show-parties" 
              checked={neverShowAgain}
              onCheckedChange={(checked) => setNeverShowAgain(checked === true)}
              className="h-4 w-4"
            />
            <Label htmlFor="never-show-parties" className="text-xs text-muted-foreground cursor-pointer">
              Don't show again
            </Label>
          </div>

          {/* Buttons - horizontal layout */}
          <div className="flex gap-2">
            <Button 
              onClick={handleSubmitParty} 
              variant="outline"
              className="flex-1 h-11 text-sm font-medium active:scale-[0.98] transition-transform"
            >
              Submit Party
            </Button>
            <Button 
              onClick={handleBrowse} 
              className="flex-1 h-11 text-sm font-semibold gradient-primary text-white active:scale-[0.98] transition-transform"
            >
              Browse
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
