import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2 } from 'lucide-react';
import touseLogo from '@/assets/touse-logo.png';
import { toast } from '@/hooks/use-toast';

export default function Auth() {
  const { user, loading, signIn, signUp } = useAuth();
  const navigate = useNavigate();
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && user) {
      navigate('/Activity', { replace: true });
    }
  }, [user, loading, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password) {
      toast({ title: 'Please fill in all fields', variant: 'destructive' });
      return;
    }

    if (password.length < 6) {
      toast({ title: 'Password must be at least 6 characters', variant: 'destructive' });
      return;
    }

    setIsSubmitting(true);

    if (isSignUp) {
      const { error } = await signUp(email, password);
      if (error) {
        toast({ title: 'Sign up failed', description: error, variant: 'destructive' });
      } else {
        toast({ title: 'Account created!', description: 'You are now signed in.' });
      }
    } else {
      const { error } = await signIn(email, password);
      if (error) {
        toast({ title: 'Sign in failed', description: error, variant: 'destructive' });
      }
    }

    setIsSubmitting(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen gradient-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen gradient-background flex flex-col items-center justify-center px-6 pt-safe pb-safe">
      {/* Logo and branding */}
      <div className="flex flex-col items-center mb-8">
        <img 
          src={touseLogo} 
          alt="Touse" 
          className="w-24 h-24 rounded-3xl shadow-lg mb-6"
        />
        <h1 className="text-3xl font-bold text-foreground mb-2">Touse</h1>
        <p className="text-muted-foreground text-center text-base">
          Rate parties. Rank frats. Stay anonymous.
        </p>
      </div>

      {/* Auth form */}
      <form onSubmit={handleSubmit} className="w-full max-w-[320px] space-y-4">
        <Input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="h-12 text-base"
          autoComplete="email"
        />
        <Input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="h-12 text-base"
          autoComplete={isSignUp ? 'new-password' : 'current-password'}
        />
        <Button
          type="submit"
          disabled={isSubmitting}
          className="w-full h-14 text-base font-semibold rounded-xl gradient-primary text-white shadow-lg active:scale-[0.98] transition-transform disabled:opacity-70"
        >
          {isSubmitting ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : isSignUp ? (
            'Create Account'
          ) : (
            'Sign In'
          )}
        </Button>
      </form>

      {/* Toggle between sign in and sign up */}
      <button
        type="button"
        onClick={() => setIsSignUp(!isSignUp)}
        className="mt-6 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        {isSignUp ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
      </button>

      {/* Footer info */}
      <p className="mt-6 text-xs text-muted-foreground text-center max-w-[280px]">
        Your ratings stay anonymous. We'll remember your device so you stay signed in.
      </p>
    </div>
  );
}
