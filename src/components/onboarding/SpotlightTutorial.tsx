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
  X
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
}

const tutorialSteps: TutorialStep[] = [
  {
    id: 'welcome',
    title: 'Welcome to Touse! 🎉',
    description: 'Your campus nightlife companion. Let\'s show you around in 30 seconds.',
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
  },
  {
    id: 'leaderboard',
    title: 'Frat Rankings',
    description: 'See which houses are on top this semester based on parties and reputation.',
    icon: Trophy,
    route: '/Leaderboard',
    highlightSelector: '[data-tutorial="leaderboard-podium"]',
    position: 'bottom',
    tip: 'Rankings update in real-time based on ratings',
  },
  {
    id: 'rate',
    title: 'Rate Fraternities',
    description: 'Tap any frat to rate them. Your anonymous ratings shape the leaderboard.',
    icon: Star,
    route: '/Leaderboard',
    highlightSelector: '[data-tutorial="rate-action"]',
    position: 'top',
    tip: 'Be honest — all ratings are anonymous',
  },
  {
    id: 'parties',
    title: 'Party Calendar',
    description: 'Browse upcoming parties, see what\'s live now, and plan your weekends.',
    icon: PartyPopper,
    route: '/Parties',
    highlightSelector: '[data-tutorial="party-list"]',
    position: 'bottom',
    tip: 'Rate parties after attending to help others',
  },
  {
    id: 'posts',
    title: 'Anonymous Posts',
    description: 'Share thoughts, ask questions, and see what campus is buzzing about.',
    icon: Newspaper,
    route: '/Posts',
    highlightSelector: '[data-tutorial="post-area"]',
    position: 'bottom',
    tip: 'Everything is anonymous — speak freely',
  },
  {
    id: 'done',
    title: 'You\'re All Set!',
    description: 'Explore, rate, and discover the best of campus nightlife.',
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
  const navigate = useNavigate();
  const location = useLocation();
  const observerRef = useRef<MutationObserver | null>(null);

  const step = tutorialSteps[currentStep];
  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === tutorialSteps.length - 1;
  const isCenteredStep = step.position === 'center';

  // Find and highlight element
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
      
      // Scroll element into view if needed
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } else {
      setHighlightRect(null);
    }
  }, [step.highlightSelector]);

  // Navigate to step route and find element
  useEffect(() => {
    if (step.route && location.pathname !== step.route) {
      setIsNavigating(true);
      navigate(step.route);
    } else {
      // Wait for DOM to settle then find element
      const timeout = setTimeout(findAndHighlight, 300);
      return () => clearTimeout(timeout);
    }
  }, [step.route, location.pathname, navigate, findAndHighlight]);

  // Watch for DOM changes to find element after navigation
  useEffect(() => {
    if (!step.highlightSelector) return;

    // Set up mutation observer to watch for element appearing
    observerRef.current = new MutationObserver(() => {
      findAndHighlight();
    });

    observerRef.current.observe(document.body, {
      childList: true,
      subtree: true,
    });

    // Also check periodically for first few seconds
    const intervals = [100, 300, 500, 1000, 1500];
    const timeouts = intervals.map(delay => 
      setTimeout(findAndHighlight, delay)
    );

    return () => {
      observerRef.current?.disconnect();
      timeouts.forEach(clearTimeout);
    };
  }, [step.highlightSelector, findAndHighlight]);

  // Handle window resize
  useEffect(() => {
    const handleResize = () => findAndHighlight();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [findAndHighlight]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
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
  }, [currentStep]);

  const handleNext = () => {
    if (isLastStep) {
      onComplete(neverShowAgain);
    } else {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handlePrev = () => {
    if (!isFirstStep) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleSkip = () => {
    onComplete(neverShowAgain);
  };

  const handleDotClick = (index: number) => {
    setCurrentStep(index);
  };

  const Icon = step.icon;

  return (
    <div className="fixed inset-0 z-[100] overflow-hidden">
      {/* Overlay with spotlight cutout */}
      <AnimatePresence mode="wait">
        <motion.div
          key={step.id}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0"
        >
          {isCenteredStep || !highlightRect ? (
            // Full overlay for centered steps
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
          ) : (
            // Spotlight overlay with cutout
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

      {/* Highlight border pulse */}
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
          <div className="w-full h-full rounded-2xl border-2 border-primary animate-pulse shadow-[0_0_30px_rgba(var(--primary),0.4)]" />
        </motion.div>
      )}

      {/* Tutorial card - always centered for simplicity and visibility */}
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
            {/* Skip button */}
            <button
              onClick={handleSkip}
              className="absolute top-3 right-3 p-2 rounded-full hover:bg-muted transition-colors"
            >
              <X className="h-4 w-4 text-muted-foreground" />
            </button>

            {/* Progress bar */}
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

            {/* Icon */}
            <div className="w-14 h-14 rounded-2xl gradient-primary flex items-center justify-center mb-4 mx-auto">
              <Icon className="h-7 w-7 text-white" />
            </div>

            {/* Content */}
            <div className="text-center space-y-2 mb-4">
              <h2 className="text-xl font-bold font-display">{step.title}</h2>
              <p className="text-muted-foreground text-sm leading-relaxed">
                {step.description}
              </p>
              {step.tip && (
                <div className="inline-block px-3 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-medium">
                  💡 {step.tip}
                </div>
              )}
            </div>

            {/* Never show again checkbox on last step */}
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

            {/* Navigation */}
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
              <Button
                onClick={handleNext}
                size="sm"
                className={`flex-1 ${isFirstStep ? 'w-full' : ''}`}
              >
                {isLastStep ? 'Get Started' : isFirstStep ? 'Let\'s Go' : 'Next'}
                {!isLastStep && <ChevronRight className="h-4 w-4 ml-1" />}
              </Button>
            </div>

            {/* Step counter */}
            <p className="text-center text-xs text-muted-foreground mt-3">
              {currentStep + 1} of {tutorialSteps.length}
            </p>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
