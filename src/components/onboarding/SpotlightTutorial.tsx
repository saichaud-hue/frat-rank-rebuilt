import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Zap, 
  Trophy, 
  Star, 
  PartyPopper, 
  Newspaper,
  Sparkles,
  ChevronRight,
  ChevronLeft,
  X,
  Plus,
  Home,
  User,
  Clock,
  MessageCircle,
  ThumbsUp,
  Calendar
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';

interface TutorialStep {
  id: string;
  title: string;
  description: string;
  icon: React.ElementType;
  route: string;
  highlightSelector?: string;
  position: 'center' | 'top' | 'bottom';
  tip?: string;
  interactive?: boolean;
  actionHint?: string;
  completionEvent?: string;
}

const tutorialSteps: TutorialStep[] = [
  {
    id: 'welcome',
    title: 'Welcome to Touse!',
    description: 'Your campus nightlife companion. Let\'s show you around — it\'ll only take a minute!',
    icon: Sparkles,
    route: '/Activity',
    position: 'center',
  },
  {
    id: 'where-going',
    title: 'Where We Going Tonight?',
    description: 'Vote on tonight\'s move! See what everyone else is doing and join the consensus.',
    icon: Zap,
    route: '/Activity',
    highlightSelector: '[data-tutorial="where-going"]',
    position: 'bottom',
    tip: 'Voting resets daily at 5 AM',
    interactive: true,
    actionHint: 'Tap any option to cast your vote',
  },
  {
    id: 'add-option',
    title: 'Add Your Own Option',
    description: 'Don\'t see what you\'re looking for? Add a custom suggestion for others to vote on.',
    icon: Plus,
    route: '/Activity',
    highlightSelector: '[data-tutorial="add-option"]',
    position: 'bottom',
    tip: 'Great for promoting parties or new spots',
  },
  {
    id: 'nav-rankings',
    title: 'Bottom Navigation',
    description: 'Use these tabs to jump between sections: Feed, Rankings, Parties, Posts, and your Profile.',
    icon: Home,
    route: '/Activity',
    highlightSelector: '[data-tutorial="nav-rankings"]',
    position: 'top',
  },
  {
    id: 'leaderboard',
    title: 'Frat Rankings',
    description: 'The leaderboard shows which houses are on top this semester based on parties and reputation.',
    icon: Trophy,
    route: '/Leaderboard',
    highlightSelector: '[data-tutorial="leaderboard-podium"]',
    position: 'bottom',
    tip: 'Rankings update in real-time based on ratings',
  },
  {
    id: 'rate-frat',
    title: 'Rate Your First Frat',
    description: 'We will open the rating form for you. Adjust the sliders and hit Submit!',
    icon: Star,
    route: '/Leaderboard',
    position: 'center',
    interactive: true,
    completionEvent: 'touse:tutorial:frat-rated',
    actionHint: 'Adjust sliders, then Submit Rating',
  },
  {
    id: 'filters',
    title: 'Filter Rankings',
    description: 'Switch between Overall, Reputation, Party Score, or Trending to see different leaderboards.',
    icon: Trophy,
    route: '/Leaderboard',
    highlightSelector: '[data-tutorial="leaderboard-filters"]',
    position: 'bottom',
  },
  {
    id: 'parties',
    title: 'Party Calendar',
    description: 'Browse all upcoming and past parties. See what\'s live now and plan your weekends.',
    icon: PartyPopper,
    route: '/Parties',
    highlightSelector: '[data-tutorial="party-list"]',
    position: 'bottom',
  },
  {
    id: 'posts',
    title: 'Anonymous Posts',
    description: 'See what campus is buzzing about. All posts are completely anonymous.',
    icon: Newspaper,
    route: '/Posts',
    highlightSelector: '[data-tutorial="post-area"]',
    position: 'bottom',
  },
  {
    id: 'post-sort',
    title: 'Sort Posts',
    description: 'Switch between Hot (trending), New (latest), or Top (most upvoted) posts.',
    icon: ThumbsUp,
    route: '/Posts',
    highlightSelector: '[data-tutorial="post-sort"]',
    position: 'bottom',
  },
  {
    id: 'create-post',
    title: 'Create a Post',
    description: 'Share your thoughts, ask questions, or start a discussion. Everything is anonymous!',
    icon: MessageCircle,
    route: '/Posts',
    highlightSelector: '[data-tutorial="create-post"]',
    position: 'top',
    tip: 'Hot posts get seen by everyone',
  },
  {
    id: 'profile',
    title: 'Your Profile',
    description: 'View your rating history, see parties you\'ve attended, and manage your account.',
    icon: User,
    route: '/Profile',
    highlightSelector: '[data-tutorial="profile-section"]',
    position: 'bottom',
  },
  {
    id: 'done',
    title: 'You\'re All Set!',
    description: 'Explore, rate, vote, and discover the best of campus nightlife. Have fun!',
    icon: Sparkles,
    route: '/Activity',
    position: 'center',
  },
];

interface SpotlightTutorialProps {
  onComplete: (neverShowAgain: boolean) => void;
}

export default function SpotlightTutorial({ onComplete }: SpotlightTutorialProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [highlightRect, setHighlightRect] = useState<DOMRect | null>(null);
  const [neverShowAgain, setNeverShowAgain] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);
  const [interactionMode, setInteractionMode] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const observerRef = useRef<MutationObserver | null>(null);
  const previousPathRef = useRef(location.pathname);
  const interactionEnteredAtRef = useRef(0);

  useEffect(() => {
    sessionStorage.setItem('touse_tutorial_active', 'true');
    return () => {
      sessionStorage.removeItem('touse_tutorial_active');
    };
  }, []);

  const step = tutorialSteps[currentStep];
  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === tutorialSteps.length - 1;
  const isCenteredStep = step.position === 'center';
  const isInteractiveStep = step.interactive === true;

  useEffect(() => {
    if (!interactionMode) return;

    const prevBodyPE = document.body.style.pointerEvents;
    const prevHtmlPE = document.documentElement.style.pointerEvents;

    document.body.style.pointerEvents = 'auto';
    document.documentElement.style.pointerEvents = 'auto';

    const prevChildPE = new Map<Element, string>();
    Array.from(document.body.children).forEach((el) => {
      prevChildPE.set(el, (el as HTMLElement).style.pointerEvents);
      (el as HTMLElement).style.pointerEvents = 'auto';
      (el as HTMLElement).removeAttribute('inert');
    });

    return () => {
      document.body.style.pointerEvents = prevBodyPE === 'none' ? 'auto' : prevBodyPE;
      document.documentElement.style.pointerEvents = prevHtmlPE === 'none' ? 'auto' : prevHtmlPE;

      prevChildPE.forEach((val, el) => {
        (el as HTMLElement).style.pointerEvents = val === 'none' ? 'auto' : val;
      });
    };
  }, [interactionMode]);

  const findAndHighlight = useCallback(() => {
    if (!step.highlightSelector) {
      setHighlightRect(null);
      return;
    }

    const element = document.querySelector(step.highlightSelector);
    if (element) {
      const rect = element.getBoundingClientRect();
      setHighlightRect(rect);
      setIsNavigating(false);
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } else {
      setHighlightRect(null);
    }
  }, [step.highlightSelector]);

  useEffect(() => {
    if (step.route && location.pathname !== step.route) {
      setIsNavigating(true);
      navigate(step.route);
    } else {
      const timeout = setTimeout(findAndHighlight, 300);
      return () => clearTimeout(timeout);
    }
  }, [step.route, location.pathname, navigate, findAndHighlight]);

  useEffect(() => {
    if (!step.highlightSelector) return;

    observerRef.current = new MutationObserver(() => {
      findAndHighlight();
    });

    observerRef.current.observe(document.body, {
      childList: true,
      subtree: true,
    });

    const intervals = [100, 300, 500, 1000, 1500];
    const timeouts = intervals.map(delay => 
      setTimeout(findAndHighlight, delay)
    );

    return () => {
      observerRef.current?.disconnect();
      timeouts.forEach(clearTimeout);
    };
  }, [step.highlightSelector, findAndHighlight]);

  useEffect(() => {
    const handleResize = () => findAndHighlight();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [findAndHighlight]);

  useEffect(() => {
    if (!interactionMode) return;

    if (step.completionEvent) {
      const handler = () => {
        setInteractionMode(false);
        setCurrentStep(prev => prev + 1);
      };
      window.addEventListener(step.completionEvent, handler as EventListener, { once: true });
      return () => window.removeEventListener(step.completionEvent!, handler as EventListener);
    }

    if (!step.highlightSelector) return;

    const delay = Math.max(0, 350 - (Date.now() - interactionEnteredAtRef.current));

    const timeout = window.setTimeout(() => {
      const el = document.querySelector(step.highlightSelector) as HTMLElement | null;
      if (!el) return;

      const handleInteract = () => {
        setTimeout(() => {
          setInteractionMode(false);
          setCurrentStep(prev => prev + 1);
        }, 250);
      };

      el.addEventListener('click', handleInteract, { once: true });
    }, delay);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [interactionMode, step.highlightSelector, step.completionEvent]);

  useEffect(() => {
    if (interactionMode && location.pathname !== previousPathRef.current) {
      if (!step.completionEvent) {
        setInteractionMode(false);
        setCurrentStep(prev => prev + 1);
      }
    }
    previousPathRef.current = location.pathname;
  }, [location.pathname, interactionMode, step.completionEvent]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (interactionMode) return;
      if (e.key === 'ArrowRight' || e.key === 'Enter') {
        handleNext();
      } else if (e.key === 'ArrowLeft') {
        handlePrev();
      } else if (e.key === 'Escape') {
        handleSkip();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentStep, interactionMode]);

  const handleNext = () => {
    if (isLastStep) {
      onComplete(neverShowAgain);
    } else {
      setCurrentStep(prev => prev + 1);
      setInteractionMode(false);
    }
  };

  const handlePrev = () => {
    if (!isFirstStep) {
      setCurrentStep(prev => prev - 1);
      setInteractionMode(false);
    }
  };

  const handleSkip = () => {
    onComplete(neverShowAgain);
  };

  const handleDotClick = (index: number) => {
    setCurrentStep(index);
    setInteractionMode(false);
  };

  const handleStartInteraction = (e?: React.MouseEvent) => {
    e?.preventDefault();
    e?.stopPropagation();
    interactionEnteredAtRef.current = Date.now();
    
    if (step.id === 'rate-frat') {
      window.dispatchEvent(new CustomEvent('touse:tutorial:open-frat-rating'));
    }

    setInteractionMode(true);
  };

  const handleContinueTutorial = () => {
    setInteractionMode(false);
    setCurrentStep(prev => prev + 1);
  };

  const Icon = step.icon;

  // During interaction mode with completionEvent, show minimal floating pill
  if (interactionMode) {
    if (step.completionEvent) {
      // Minimal pill - hidden until needed, just shows skip option
      return (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[100]"
          style={{ marginBottom: 'env(safe-area-inset-bottom)' }}
        >
          <div className="flex items-center gap-2 bg-card/95 backdrop-blur-sm border shadow-lg rounded-full px-2 py-1.5">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setInteractionMode(false)} 
              className="h-7 px-3 text-xs rounded-full"
            >
              <ChevronLeft className="h-3 w-3 mr-1" />
              Back
            </Button>
            <div className="w-px h-4 bg-border" />
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleContinueTutorial} 
              className="h-7 px-3 text-xs rounded-full text-muted-foreground"
            >
              Skip
            </Button>
          </div>
        </motion.div>
      );
    }

    // For non-completion interactive steps, show fuller card
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[100] w-[min(92vw,420px)]"
        style={{ marginBottom: 'env(safe-area-inset-bottom)' }}
      >
        <div className="bg-card border shadow-2xl rounded-2xl p-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary text-primary-foreground flex items-center justify-center flex-shrink-0">
              <Icon className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold leading-tight">{step.title}</p>
              <p className="text-sm text-muted-foreground mt-1">
                {step.actionHint || 'Try it out — we will continue when you are done.'}
              </p>
            </div>
          </div>

          <div className="mt-3 flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setInteractionMode(false)} className="flex-1">
              Back
            </Button>
            <Button size="sm" onClick={handleContinueTutorial} className="flex-1">
              Continue
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <div className="fixed inset-0 z-[100] overflow-hidden">
      <AnimatePresence mode="wait">
        <motion.div
          key={step.id}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0"
        >
          {isCenteredStep || !highlightRect ? (
            <div className="absolute inset-0 bg-foreground/55" />
          ) : (
            <svg className="absolute inset-0 w-full h-full">
              <defs>
                <mask id="spotlight-mask">
                  <rect width="100%" height="100%" fill="white" />
                  <rect
                    x={highlightRect.left - 8}
                    y={highlightRect.top - 8}
                    width={highlightRect.width + 16}
                    height={highlightRect.height + 16}
                    rx="16"
                    fill="black"
                  />
                </mask>
              </defs>
              <rect
                width="100%"
                height="100%"
                fill="rgba(0,0,0,0.8)"
                mask="url(#spotlight-mask)"
              />
            </svg>
          )}
        </motion.div>
      </AnimatePresence>

      {highlightRect && !isCenteredStep && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="absolute pointer-events-none"
          style={{
            left: highlightRect.left - 8,
            top: highlightRect.top - 8,
            width: highlightRect.width + 16,
            height: highlightRect.height + 16,
          }}
        >
          <div className="w-full h-full rounded-2xl border-2 border-primary animate-pulse shadow-[0_0_30px_hsl(var(--primary)/0.35)]" />
        </motion.div>
      )}

      <AnimatePresence mode="wait">
        <motion.div
          key={step.id}
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.95 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="absolute inset-x-4 top-1/2 -translate-y-1/2"
        >
          <div className="bg-card border shadow-2xl rounded-2xl p-5 max-w-md mx-auto">
            <button
              onClick={handleSkip}
              className="absolute top-3 right-3 p-2 rounded-full hover:bg-muted transition-colors"
            >
              <X className="h-4 w-4 text-muted-foreground" />
            </button>

            <div className="flex gap-1 mb-4">
              {tutorialSteps.map((_, index) => (
                <button
                  key={index}
                  onClick={() => handleDotClick(index)}
                  className={`h-1 flex-1 rounded-full transition-all ${
                    index === currentStep 
                      ? 'bg-primary' 
                      : index < currentStep 
                        ? 'bg-primary/50' 
                        : 'bg-muted'
                  }`}
                />
              ))}
            </div>

            <div className="w-14 h-14 rounded-2xl gradient-primary flex items-center justify-center mb-4 mx-auto">
              <Icon className="h-7 w-7 text-white" />
            </div>

            <div className="text-center space-y-2 mb-4">
              <h2 className="text-xl font-bold font-display">{step.title}</h2>
              <p className="text-muted-foreground text-sm leading-relaxed">
                {step.description}
              </p>
              {step.tip && !isInteractiveStep && (
                <div className="inline-block px-3 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-medium">
                  {step.tip}
                </div>
              )}
            </div>

            {isLastStep && (
              <div className="flex items-center justify-center gap-2 mb-4">
                <Checkbox
                  id="never-show"
                  checked={neverShowAgain}
                  onCheckedChange={(checked) => setNeverShowAgain(checked as boolean)}
                />
                <label 
                  htmlFor="never-show" 
                  className="text-sm text-muted-foreground cursor-pointer"
                >
                  Don't show this again
                </label>
              </div>
            )}

            <div className="flex items-center gap-3">
              {!isFirstStep && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePrev}
                  className="flex-1"
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Back
                </Button>
              )}
              
              {isInteractiveStep ? (
                <>
                  <Button
                    onClick={(e) => handleStartInteraction(e)}
                    size="sm"
                    className="flex-1"
                  >
                    Try It
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleNext}
                  >
                    Skip
                  </Button>
                </>
              ) : (
                <Button
                  onClick={handleNext}
                  size="sm"
                  className={`flex-1 ${isFirstStep ? 'w-full' : ''}`}
                >
                  {isLastStep ? 'Get Started' : isFirstStep ? 'Let\'s Go' : 'Next'}
                  {!isLastStep && <ChevronRight className="h-4 w-4 ml-1" />}
                </Button>
              )}
            </div>

            <p className="text-center text-xs text-muted-foreground mt-3">
              {currentStep + 1} of {tutorialSteps.length}
            </p>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
