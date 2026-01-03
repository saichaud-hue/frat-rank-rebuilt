import { useState } from 'react';
import { PartyPopper, Megaphone, Users, Star, Calendar, Flame } from 'lucide-react';
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
      <Card className="w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl p-6 animate-slide-up sm:animate-scale-in" style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 32px)' }}>
        <div className="space-y-6">
          {/* Icon */}
          <div className="mx-auto w-20 h-20 rounded-2xl bg-gradient-to-br from-primary to-pink-500 flex items-center justify-center">
            <Megaphone className="h-10 w-10 text-white" />
          </div>

          {/* Content */}
          <div className="text-center space-y-3">
            <h2 className="text-2xl font-bold">Host Your Party</h2>
            <p className="text-muted-foreground text-lg">
              Are you in a fraternity? Get your party on the map!
            </p>
          </div>

          {/* Features - matching LeaderboardIntro style */}
          <div className="space-y-3 text-left">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                <PartyPopper className="h-4 w-4 text-blue-500" />
              </div>
              <p className="text-sm text-muted-foreground pt-1">
                <span className="font-semibold text-foreground">Submit</span> — Share your party details with campus
              </p>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-purple-500/10 flex items-center justify-center flex-shrink-0">
                <Users className="h-4 w-4 text-purple-500" />
              </div>
              <p className="text-sm text-muted-foreground pt-1">
                <span className="font-semibold text-foreground">Reputation</span> — Build your frat's image with great events
              </p>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-pink-500/10 flex items-center justify-center flex-shrink-0">
                <Star className="h-4 w-4 text-pink-500" />
              </div>
              <p className="text-sm text-muted-foreground pt-1">
                <span className="font-semibold text-foreground">Ratings</span> — Get feedback from party-goers
              </p>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-orange-500/10 flex items-center justify-center flex-shrink-0">
                <Calendar className="h-4 w-4 text-orange-500" />
              </div>
              <p className="text-sm text-muted-foreground pt-1">
                <span className="font-semibold text-foreground">Upcoming</span> — Let everyone know what's next
              </p>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-amber-500/10 flex items-center justify-center flex-shrink-0">
                <Flame className="h-4 w-4 text-amber-500" />
              </div>
              <p className="text-sm text-muted-foreground pt-1">
                Tap any party to <span className="font-semibold text-foreground">rate it</span>
              </p>
            </div>
          </div>

          {/* Checkbox */}
          <div className="flex items-center justify-center gap-2">
            <Checkbox 
              id="never-show-parties" 
              checked={neverShowAgain}
              onCheckedChange={(checked) => setNeverShowAgain(checked === true)}
            />
            <Label htmlFor="never-show-parties" className="text-sm text-muted-foreground cursor-pointer">
              Don't show this again
            </Label>
          </div>

          {/* Buttons */}
          <div className="space-y-3">
            <Button 
              onClick={handleSubmitParty} 
              className="w-full min-h-[52px] text-base font-semibold gradient-primary text-white active:scale-[0.98] transition-transform"
            >
              Submit a Party
            </Button>
            <Button 
              onClick={handleBrowse} 
              variant="outline"
              className="w-full min-h-[52px] text-base font-medium active:scale-[0.98] transition-transform"
            >
              Browse Parties
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
