import { useState, useEffect } from 'react';
import { Star, PartyPopper, ChevronLeft, Calendar, Clock } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { base44, type Party } from '@/api/base44Client';
import { format } from 'date-fns';
import { getScoreColor } from '@/utils';

interface Fraternity {
  id: string;
  name: string;
  letters?: string;
  logo_url?: string;
}

type Step = 'choose-action' | 'choose-frat' | 'choose-party';
type ActionType = 'rate' | 'parties';

interface RateActionSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onRateFrat: (fraternity: Fraternity) => void;
  onRateParty: (party: Party) => void;
  fraternities: Fraternity[];
  initialAction?: 'rate' | 'parties';
}

export default function RateActionSheet({ 
  isOpen, 
  onClose, 
  onRateFrat, 
  onRateParty,
  fraternities,
  initialAction
}: RateActionSheetProps) {
  const [step, setStep] = useState<Step>('choose-action');
  const [actionType, setActionType] = useState<ActionType | null>(null);
  const [selectedFrat, setSelectedFrat] = useState<Fraternity | null>(null);
  const [parties, setParties] = useState<Party[]>([]);
  const [loadingParties, setLoadingParties] = useState(false);

  // Reset state when sheet closes, or jump to frat selection if initialAction provided
  useEffect(() => {
    if (!isOpen) {
      setStep('choose-action');
      setActionType(null);
      setSelectedFrat(null);
      setParties([]);
    } else if (initialAction) {
      setActionType(initialAction);
      setStep('choose-frat');
    }
  }, [isOpen, initialAction]);

  const handleActionSelect = (action: ActionType) => {
    setActionType(action);
    setStep('choose-frat');
  };

  const handleFratSelect = async (frat: Fraternity) => {
    if (actionType === 'rate') {
      onClose();
      onRateFrat(frat);
    } else {
      setSelectedFrat(frat);
      setLoadingParties(true);
      try {
        const allParties = await base44.entities.Party.filter({ fraternity_id: frat.id });
        // Filter to only past/completed parties
        const now = new Date();
        const pastParties = allParties.filter(p => new Date(p.ends_at) < now);
        // Sort by date, most recent first
        pastParties.sort((a, b) => new Date(b.starts_at).getTime() - new Date(a.starts_at).getTime());
        setParties(pastParties);
        setStep('choose-party');
      } catch (error) {
        console.error('Failed to load parties:', error);
      } finally {
        setLoadingParties(false);
      }
    }
  };

  const handlePartySelect = (party: Party) => {
    onClose();
    onRateParty(party);
  };

  const handleBack = () => {
    if (step === 'choose-party') {
      setStep('choose-frat');
      setSelectedFrat(null);
      setParties([]);
    } else if (step === 'choose-frat') {
      setStep('choose-action');
      setActionType(null);
    }
  };

  const getPartyStatus = (party: Party): 'live' | 'upcoming' | 'completed' => {
    const now = new Date();
    const start = new Date(party.starts_at);
    const end = new Date(party.ends_at);
    if (now >= start && now <= end) return 'live';
    if (now > end) return 'completed';
    return 'upcoming';
  };

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent 
        side="bottom" 
        className="rounded-t-3xl h-[70vh]" 
        style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 24px)' }}
      >
        <SheetHeader className="text-left pb-4">
          <div className="flex items-center gap-2">
            {step !== 'choose-action' && (
              <button
                onClick={handleBack}
                className="p-2 -ml-2 rounded-full hover:bg-muted transition-colors"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
            )}
            <div>
              <SheetTitle className="text-xl">
                {step === 'choose-action' && 'What would you like to rate?'}
                {step === 'choose-frat' && (actionType === 'rate' ? 'Choose a Frat to Rate' : 'Choose a Frat')}
                {step === 'choose-party' && `${selectedFrat?.name}'s Parties`}
              </SheetTitle>
              <p className="text-sm text-muted-foreground mt-0.5">
                {step === 'choose-action' && 'Select an option to continue'}
                {step === 'choose-frat' && 'Tap to select'}
                {step === 'choose-party' && 'Select a party to rate'}
              </p>
            </div>
          </div>
        </SheetHeader>

        <ScrollArea className="h-[calc(70vh-120px)] -mx-2 px-2">
          {/* Step 1: Choose Action */}
          {step === 'choose-action' && (
            <div className="space-y-3 pb-4">
              <button
                onClick={() => handleActionSelect('rate')}
                className="w-full flex items-center gap-4 p-4 rounded-2xl bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/20 hover:border-amber-500/40 active:scale-[0.98] transition-all text-left"
              >
                <div className="w-14 h-14 rounded-xl bg-amber-500 flex items-center justify-center">
                  <Star className="h-7 w-7 text-white" fill="white" />
                </div>
                <div className="flex-1">
                  <p className="font-bold text-lg">Rate a Frat</p>
                  <p className="text-sm text-muted-foreground">Rate brotherhood, reputation & community</p>
                </div>
              </button>

              <button
                onClick={() => handleActionSelect('parties')}
                className="w-full flex items-center gap-4 p-4 rounded-2xl bg-gradient-to-r from-primary/10 to-indigo-500/10 border border-primary/20 hover:border-primary/40 active:scale-[0.98] transition-all text-left"
              >
                <div className="w-14 h-14 rounded-xl bg-primary flex items-center justify-center">
                  <PartyPopper className="h-7 w-7 text-white" />
                </div>
                <div className="flex-1">
                  <p className="font-bold text-lg">Rate a Party</p>
                  <p className="text-sm text-muted-foreground">Rate past and present parties</p>
                </div>
              </button>
            </div>
          )}

          {/* Step 2: Choose Fraternity */}
          {step === 'choose-frat' && (
            <div className="space-y-2 pb-4">
              {fraternities.map((frat) => (
                <button
                  key={frat.id}
                  onClick={() => handleFratSelect(frat)}
                  className="w-full flex items-center gap-3 p-3 rounded-xl bg-muted/50 hover:bg-muted active:scale-[0.98] transition-all text-left"
                >
                  <Avatar className="h-12 w-12 rounded-xl">
                    <AvatarImage src={frat.logo_url} alt={frat.name} />
                    <AvatarFallback className="rounded-xl bg-primary/10 text-primary font-bold">
                      {frat.letters?.substring(0, 2) || frat.name.substring(0, 2)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold truncate">{frat.name}</p>
                    {frat.letters && (
                      <p className="text-sm text-muted-foreground">{frat.letters}</p>
                    )}
                  </div>
                  {actionType === 'rate' ? (
                    <Star className="h-5 w-5 text-amber-500" />
                  ) : (
                    <PartyPopper className="h-5 w-5 text-primary" />
                  )}
                </button>
              ))}
            </div>
          )}

          {/* Step 3: Choose Party */}
          {step === 'choose-party' && (
            <div className="space-y-2 pb-4">
              {loadingParties ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : parties.length === 0 ? (
                <div className="text-center py-12">
                  <PartyPopper className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
                  <p className="text-muted-foreground font-medium">No past parties yet</p>
                  <p className="text-sm text-muted-foreground/70">Check back after they host one!</p>
                </div>
              ) : (
                parties.map((party) => {
                  const status = getPartyStatus(party);
                  const startDate = new Date(party.starts_at);
                  
                  return (
                    <button
                      key={party.id}
                      onClick={() => handlePartySelect(party)}
                      className="w-full flex items-center gap-3 p-3 rounded-xl bg-muted/50 hover:bg-muted active:scale-[0.98] transition-all text-left"
                    >
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center overflow-hidden flex-shrink-0">
                        {party.display_photo_url ? (
                          <img src={party.display_photo_url} alt={party.title} className="w-full h-full object-cover" />
                        ) : (
                          <PartyPopper className="h-5 w-5 text-muted-foreground/50" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold truncate">{party.title}</p>
                          <Badge 
                            variant={status === 'live' ? 'default' : status === 'completed' ? 'secondary' : 'outline'}
                            className={status === 'live' ? 'bg-red-500 text-white text-[10px] px-1.5' : 'text-[10px] px-1.5'}
                          >
                            {status === 'live' ? 'LIVE' : status === 'completed' ? 'Past' : 'Soon'}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {format(startDate, 'MMM d')}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {format(startDate, 'h:mm a')}
                          </span>
                        </div>
                      </div>
                      {party.performance_score > 0 && (
                        <span className={`font-bold ${getScoreColor(party.performance_score)}`}>
                          {party.performance_score.toFixed(1)}
                        </span>
                      )}
                    </button>
                  );
                })
              )}
            </div>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
