import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, ChevronRight, ChevronLeft, Trophy, Calendar, 
  Camera, User, MessageCircle, Star, TrendingUp, PartyPopper
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate, useLocation } from 'react-router-dom';

interface TutorialStep {
  id: string;
  title: string;
  description: string;
  icon: React.ElementType;
  route?: string;
  highlight?: string; // CSS selector to highlight
  position: 'center' | 'bottom' | 'top';
}

const tutorialSteps: TutorialStep[] = [
  {
    id: 'welcome',
    title: 'Welcome to Touse! 🎉',
    description: 'Your go-to app for rating fraternities and parties on campus. Let\'s show you around!',
    icon: PartyPopper,
    position: 'center',
  },
  {
    id: 'feed',
    title: 'The Feed',
    description: 'This is where it all happens. See what\'s going on tonight, vote on where everyone\'s heading, and stay in the loop.',
    icon: MessageCircle,
    route: '/Activity',
    position: 'center',
  },
  {
    id: 'where-going',
    title: 'Where We Going?',
    description: 'Vote on tonight\'s move! See what parties or spots are trending and add your own suggestions.',
    icon: TrendingUp,
    route: '/Activity',
    position: 'top',
  },
  {
    id: 'rankings',
    title: 'Frat Rankings',
    description: 'See how fraternities stack up based on real student ratings. Tap any frat to see their full profile and rate them yourself.',
    icon: Trophy,
    route: '/Leaderboard',
    position: 'center',
  },
  {
    id: 'rate-frat',
    title: 'Rate Fraternities',
    description: 'Your ratings matter! Rate frats on reputation, brotherhood, and community. Be honest - it helps everyone.',
    icon: Star,
    route: '/Leaderboard',
    position: 'bottom',
  },
  {
    id: 'parties',
    title: 'Parties',
    description: 'Browse upcoming parties, RSVP to let people know you\'re going, and rate parties after they end.',
    icon: Calendar,
    route: '/Parties',
    position: 'center',
  },
  {
    id: 'photos',
    title: 'Post Photos',
    description: 'Share pics from last night! Photos reset each day so it\'s always fresh content.',
    icon: Camera,
    route: '/Posts',
    position: 'center',
  },
  {
    id: 'profile',
    title: 'Your Profile',
    description: 'Check your rating history, see your streak, and manage your account.',
    icon: User,
    route: '/Profile',
    position: 'center',
  },
  {
    id: 'done',
    title: 'You\'re All Set! 🔥',
    description: 'Start exploring, rating, and connecting. The more you participate, the better the rankings become for everyone!',
    icon: PartyPopper,
    position: 'center',
  },
];

interface AppTutorialProps {
  onComplete: () => void;
}

export function AppTutorial({ onComplete }: AppTutorialProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isVisible, setIsVisible] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();

  const step = tutorialSteps[currentStep];
  const isFirst = currentStep === 0;
  const isLast = currentStep === tutorialSteps.length - 1;
  const progress = ((currentStep + 1) / tutorialSteps.length) * 100;

  useEffect(() => {
    // Navigate to the step's route if specified
    if (step.route && location.pathname !== step.route) {
      navigate(step.route);
    }
  }, [currentStep, step.route, navigate, location.pathname]);

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
      onComplete();
    }, 300);
  };

  const Icon = step.icon;

  const getPositionClasses = () => {
    switch (step.position) {
      case 'top':
        return 'top-20';
      case 'bottom':
        return 'bottom-24';
      default:
        return 'top-1/2 -translate-y-1/2';
    }
  };

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
            onClick={handleSkip}
          />

          {/* Tutorial Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className={`fixed left-4 right-4 mx-auto max-w-sm z-[101] ${getPositionClasses()}`}
          >
            <div className="bg-card border border-border rounded-2xl shadow-2xl overflow-hidden">
              {/* Progress Bar */}
              <div className="h-1 bg-muted">
                <motion.div
                  className="h-full bg-primary"
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>

              {/* Skip Button */}
              <button
                onClick={handleSkip}
                className="absolute top-3 right-3 p-1.5 rounded-full hover:bg-muted transition-colors"
              >
                <X className="h-4 w-4 text-muted-foreground" />
              </button>

              {/* Content */}
              <div className="p-6 pt-8">
                {/* Icon */}
                <motion.div
                  key={step.id}
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: 'spring', damping: 15 }}
                  className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center"
                >
                  <Icon className="h-8 w-8 text-primary-foreground" />
                </motion.div>

                {/* Text */}
                <motion.div
                  key={`text-${step.id}`}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="text-center"
                >
                  <h2 className="text-xl font-bold mb-2">{step.title}</h2>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    {step.description}
                  </p>
                </motion.div>

                {/* Step Indicator */}
                <div className="flex justify-center gap-1.5 my-5">
                  {tutorialSteps.map((_, idx) => (
                    <button
                      key={idx}
                      onClick={() => setCurrentStep(idx)}
                      className={`h-1.5 rounded-full transition-all ${
                        idx === currentStep
                          ? 'w-6 bg-primary'
                          : idx < currentStep
                          ? 'w-1.5 bg-primary/50'
                          : 'w-1.5 bg-muted-foreground/30'
                      }`}
                    />
                  ))}
                </div>

                {/* Navigation */}
                <div className="flex gap-2">
                  {!isFirst && (
                    <Button
                      variant="outline"
                      onClick={handlePrev}
                      className="flex-1"
                    >
                      <ChevronLeft className="h-4 w-4 mr-1" />
                      Back
                    </Button>
                  )}
                  <Button
                    onClick={handleNext}
                    className="flex-1"
                  >
                    {isLast ? (
                      'Get Started'
                    ) : (
                      <>
                        Next
                        <ChevronRight className="h-4 w-4 ml-1" />
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
