import { useState } from 'react';
import { ChevronRight, Sparkles, Star, PartyPopper, Users } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';

interface TutorialProps {
  onComplete: (neverShowAgain: boolean) => void;
}

const steps = [
  {
    icon: Sparkles,
    title: 'Welcome to taus',
    description: 'The definitive ranking platform for Greek life at your campus.',
    color: 'from-primary to-secondary',
  },
  {
    icon: Star,
    title: 'Rate Fraternities',
    description: 'Share your honest experiences and help others make informed decisions.',
    color: 'from-amber-500 to-orange-500',
  },
  {
    icon: PartyPopper,
    title: 'Review Parties',
    description: 'Rate parties on music, drinks, and fun. Upload photos to share the vibes.',
    color: 'from-pink-500 to-rose-500',
  },
  {
    icon: Users,
    title: 'Build Community',
    description: 'Your ratings contribute to a transparent Greek life ecosystem.',
    color: 'from-emerald-500 to-teal-500',
  },
];

export default function Tutorial({ onComplete }: TutorialProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [neverShowAgain, setNeverShowAgain] = useState(false);

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onComplete(neverShowAgain);
    }
  };

  const step = steps[currentStep];
  const Icon = step.icon;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <Card className="max-w-md w-full p-8 animate-scale-in">
        <div className="text-center space-y-6">
          {/* Progress dots */}
          <div className="flex justify-center gap-2">
            {steps.map((_, i) => (
              <div
                key={i}
                className={`w-2 h-2 rounded-full transition-colors ${
                  i === currentStep ? 'bg-primary' : 'bg-muted'
                }`}
              />
            ))}
          </div>

          {/* Icon */}
          <div className={`mx-auto w-20 h-20 rounded-2xl bg-gradient-to-br ${step.color} flex items-center justify-center`}>
            <Icon className="h-10 w-10 text-white" />
          </div>

          {/* Content */}
          <div className="space-y-2">
            <h2 className="text-2xl font-bold">{step.title}</h2>
            <p className="text-muted-foreground">{step.description}</p>
          </div>

          {/* Checkbox - only on last step */}
          {currentStep === steps.length - 1 && (
            <div className="flex items-center justify-center gap-2">
              <Checkbox 
                id="never-show" 
                checked={neverShowAgain}
                onCheckedChange={(checked) => setNeverShowAgain(checked === true)}
              />
              <Label htmlFor="never-show" className="text-sm text-muted-foreground cursor-pointer">
                Don't show me this again
              </Label>
            </div>
          )}

          {/* Button */}
          <Button 
            onClick={handleNext} 
            className="w-full gradient-primary text-white py-6"
          >
            {currentStep < steps.length - 1 ? (
              <>
                Next
                <ChevronRight className="h-5 w-5 ml-1" />
              </>
            ) : (
              "Get Started"
            )}
          </Button>
        </div>
      </Card>
    </div>
  );
}
