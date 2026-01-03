import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, ChevronRight, ChevronLeft, Trophy, Calendar, 
  Camera, User, MessageCircle, Star, TrendingUp, PartyPopper,
  Sparkles, ThumbsUp, Clock, Zap
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';

interface TutorialStep {
  id: string;
  title: string;
  description: string;
  icon: React.ElementType;
  color: string;
  tip?: string;
}

const tutorialSteps: TutorialStep[] = [
  {
    id: 'welcome',
    title: 'Welcome to Touse! 🎉',
    description: 'Your go-to app for honest fraternity and party rankings on campus. Ready for a quick tour?',
    icon: Sparkles,
    color: 'from-primary to-primary/60',
  },
  {
    id: 'feed',
    title: 'The Feed',
    description: 'Your home base. See tonight\'s buzz, vote on where everyone\'s heading, and catch the latest party updates.',
    icon: MessageCircle,
    color: 'from-blue-500 to-cyan-500',
    tip: 'Check the Feed before going out to see what\'s popping!',
  },
  {
    id: 'where-going',
    title: 'Where We Going?',
    description: 'Cast your vote for tonight\'s move! The more votes, the clearer the vibe check. You can even add your own suggestions.',
    icon: TrendingUp,
    color: 'from-violet-500 to-purple-500',
    tip: 'Voting resets each day at 5 AM',
  },
  {
    id: 'rankings',
    title: 'Frat Rankings',
    description: 'Real rankings from real students. See how fraternities compare based on reputation, brotherhood, and community involvement.',
    icon: Trophy,
    color: 'from-amber-500 to-orange-500',
    tip: 'Tap any fraternity to see their full profile',
  },
  {
    id: 'rate-frat',
    title: 'Rate Fraternities',
    description: 'Your opinion matters! Rate on three categories and your scores contribute to the overall ranking. Be honest — it helps everyone.',
    icon: Star,
    color: 'from-yellow-500 to-amber-500',
    tip: 'You can rate each frat once per semester',
  },
  {
    id: 'parties',
    title: 'Parties',
    description: 'Browse upcoming events, RSVP to show you\'re going, and rate parties after they end. Your reviews help others find the best nights.',
    icon: Calendar,
    color: 'from-pink-500 to-rose-500',
    tip: 'RSVP before a party, rate after it ends',
  },
  {
    id: 'attendance',
    title: 'Are You Going?',
    description: 'Before a party starts, let people know if you\'re going! See how many others are planning to show up.',
    icon: ThumbsUp,
    color: 'from-emerald-500 to-green-500',
    tip: 'Attendance helps everyone gauge the turnout',
  },
  {
    id: 'photos',
    title: 'Post Section',
    description: 'Share pics from last night! Photos reset at 5 AM each day so there\'s always fresh content. Keep it fun and respectful.',
    icon: Camera,
    color: 'from-indigo-500 to-blue-500',
    tip: 'Photos are anonymous but be cool',
  },
  {
    id: 'timing',
    title: 'Perfect Timing',
    description: 'Rate parties AFTER they end for the most accurate reviews. The countdown in the header shows you when the next event starts.',
    icon: Clock,
    color: 'from-teal-500 to-cyan-500',
    tip: 'Check the header for live party updates',
  },
  {
    id: 'done',
    title: 'You\'re Ready! 🔥',
    description: 'Start exploring, rating, and connecting. The more you participate, the better the rankings become for everyone on campus!',
    icon: Zap,
    color: 'from-primary to-secondary',
  },
];

interface TutorialProps {
  onComplete: (neverShowAgain: boolean) => void;
}

export default function Tutorial({ onComplete }: TutorialProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [neverShowAgain, setNeverShowAgain] = useState(false);
  const [isVisible, setIsVisible] = useState(true);

  const step = tutorialSteps[currentStep];
  const isFirst = currentStep === 0;
  const isLast = currentStep === tutorialSteps.length - 1;
  const progress = ((currentStep + 1) / tutorialSteps.length) * 100;

  const handleNext = () => {
    if (isLast) {
      handleComplete();
    } else {
      setCurrentStep((prev) => prev + 1);
    }
  };

  const handlePrev = () => {
    if (!isFirst) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  const handleSkip = () => {
    handleComplete();
  };

  const handleComplete = () => {
    setIsVisible(false);
    setTimeout(() => {
      onComplete(neverShowAgain);
    }, 300);
  };

  const Icon = step.icon;

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

  return (
    <AnimatePresence>
      {isVisible && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 z-[100] backdrop-blur-sm"
          />

          {/* Tutorial Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 50 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 50 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed inset-x-4 bottom-4 top-auto sm:inset-auto sm:left-1/2 sm:top-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 sm:max-w-md sm:w-full z-[101]"
            style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
          >
            <div className="bg-card border border-border rounded-2xl shadow-2xl overflow-hidden">
              {/* Progress Bar */}
              <div className="h-1.5 bg-muted">
                <motion.div
                  className="h-full bg-gradient-to-r from-primary to-secondary"
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>

              {/* Skip Button */}
              <button
                onClick={handleSkip}
                className="absolute top-3 right-3 p-2 rounded-full hover:bg-muted transition-colors z-10"
              >
                <X className="h-4 w-4 text-muted-foreground" />
              </button>

              {/* Content */}
              <div className="p-6 pt-10">
                {/* Icon */}
                <motion.div
                  key={step.id}
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: 'spring', damping: 12, stiffness: 200 }}
                  className={`w-20 h-20 mx-auto mb-5 rounded-2xl bg-gradient-to-br ${step.color} flex items-center justify-center shadow-lg`}
                >
                  <Icon className="h-10 w-10 text-white" />
                </motion.div>

                {/* Text */}
                <motion.div
                  key={`text-${step.id}`}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="text-center"
                >
                  <h2 className="text-2xl font-bold mb-3">{step.title}</h2>
                  <p className="text-muted-foreground leading-relaxed">
                    {step.description}
                  </p>
                  
                  {/* Pro Tip */}
                  {step.tip && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.2 }}
                      className="mt-4 px-4 py-2.5 bg-primary/10 rounded-xl border border-primary/20"
                    >
                      <p className="text-sm text-primary font-medium">
                        💡 {step.tip}
                      </p>
                    </motion.div>
                  )}
                </motion.div>

                {/* Step Indicator */}
                <div className="flex justify-center gap-1.5 my-6">
                  {tutorialSteps.map((_, idx) => (
                    <button
                      key={idx}
                      onClick={() => setCurrentStep(idx)}
                      className={`h-2 rounded-full transition-all ${
                        idx === currentStep
                          ? 'w-8 bg-primary'
                          : idx < currentStep
                          ? 'w-2 bg-primary/50'
                          : 'w-2 bg-muted-foreground/30'
                      }`}
                    />
                  ))}
                </div>

                {/* Checkbox - only on last step */}
                {isLast && (
                  <div className="flex items-center justify-center gap-2 mb-4">
                    <Checkbox 
                      id="never-show" 
                      checked={neverShowAgain}
                      onCheckedChange={(checked) => setNeverShowAgain(checked === true)}
                    />
                    <Label htmlFor="never-show" className="text-sm text-muted-foreground cursor-pointer">
                      Don't show this again
                    </Label>
                  </div>
                )}

                {/* Navigation */}
                <div className="flex gap-2">
                  {!isFirst && (
                    <Button
                      variant="outline"
                      onClick={handlePrev}
                      className="flex-1 h-12"
                    >
                      <ChevronLeft className="h-4 w-4 mr-1" />
                      Back
                    </Button>
                  )}
                  <Button
                    onClick={handleNext}
                    className={`flex-1 h-12 ${isFirst ? 'w-full' : ''}`}
                  >
                    {isLast ? (
                      "Let's Go! 🚀"
                    ) : isFirst ? (
                      "Show Me Around"
                    ) : (
                      <>
                        Next
                        <ChevronRight className="h-4 w-4 ml-1" />
                      </>
                    )}
                  </Button>
                </div>

                {/* Step Counter */}
                <p className="text-center text-xs text-muted-foreground mt-4">
                  Step {currentStep + 1} of {tutorialSteps.length}
                </p>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
