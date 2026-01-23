import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2 } from 'lucide-react';
import touseLogo from '@/assets/touse-logo.png';
import { toast } from '@/hooks/use-toast';

type AuthMode = 'landing' | 'signin' | 'signup' | 'forgot' | 'reset';

export default function Auth() {
  const { user, loading, signIn, signUp, resetPassword, updatePassword } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  const isResetMode = searchParams.get('reset') === 'true';
  
  const [mode, setMode] = useState<AuthMode>(isResetMode ? 'reset' : 'landing');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && user && !isResetMode) {
      navigate('/Activity', { replace: true });
    }
  }, [user, loading, navigate, isResetMode]);

  useEffect(() => {
    if (isResetMode) {
      setMode('reset');
    }
  }, [isResetMode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (mode === 'forgot') {
      if (!email) {
        toast({ title: 'Please enter your email', variant: 'destructive' });
        return;
      }
      setIsSubmitting(true);
      const { error } = await resetPassword(email);
      if (error) {
        toast({ title: 'Failed to send reset email', description: error, variant: 'destructive' });
      } else {
        toast({ title: 'Check your email!', description: 'We sent you a password reset link.' });
        setMode('signin');
      }
      setIsSubmitting(false);
      return;
    }

    if (mode === 'reset') {
      if (!password || password.length < 6) {
        toast({ title: 'Password must be at least 6 characters', variant: 'destructive' });
        return;
      }
      if (password !== confirmPassword) {
        toast({ title: 'Passwords do not match', variant: 'destructive' });
        return;
      }
      setIsSubmitting(true);
      const { error } = await updatePassword(password);
      if (error) {
        toast({ title: 'Failed to update password', description: error, variant: 'destructive' });
      } else {
        toast({ title: 'Password updated!', description: 'You can now sign in with your new password.' });
        navigate('/Activity', { replace: true });
      }
      setIsSubmitting(false);
      return;
    }
    
    if (!email || !password) {
      toast({ title: 'Please fill in all fields', variant: 'destructive' });
      return;
    }

    if (password.length < 6) {
      toast({ title: 'Password must be at least 6 characters', variant: 'destructive' });
      return;
    }

    setIsSubmitting(true);

    if (mode === 'signup') {
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

  // Landing page with two options
  if (mode === 'landing') {
    return (
      <div className="min-h-screen gradient-background flex flex-col items-center justify-center px-6 pt-safe pb-safe">
        <div className="flex flex-col items-center mb-10">
          <img 
            src={touseLogo} 
            alt="Touse" 
            className="w-28 h-28 rounded-3xl shadow-xl mb-6"
          />
          <h1 className="text-4xl font-bold text-foreground mb-3">Touse</h1>
          <p className="text-muted-foreground text-center text-lg max-w-[280px]">
            Rate parties. Rank frats. Stay anonymous.
          </p>
        </div>

        <div className="w-full max-w-[320px] space-y-4">
          <Button
            onClick={() => setMode('signup')}
            className="w-full h-14 text-lg font-semibold rounded-xl gradient-primary text-white shadow-lg active:scale-[0.98] transition-transform"
          >
            Create Account
          </Button>
          
          <Button
            onClick={() => setMode('signin')}
            variant="outline"
            className="w-full h-12 text-base font-medium rounded-xl border-2 border-border hover:bg-muted/50 transition-colors"
          >
            Sign in to existing account
          </Button>
        </div>

        <p className="mt-10 text-xs text-muted-foreground text-center max-w-[280px]">
          Your ratings stay anonymous. We'll remember your device so you stay signed in.
        </p>
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
          className="w-20 h-20 rounded-2xl shadow-lg mb-4"
        />
        <h1 className="text-2xl font-bold text-foreground mb-1">
          {mode === 'signup' ? 'Create Account' : 
           mode === 'signin' ? 'Welcome Back' :
           mode === 'forgot' ? 'Reset Password' :
           'Set New Password'}
        </h1>
        <p className="text-muted-foreground text-center text-sm">
          {mode === 'signup' ? 'Join Touse and start rating' : 
           mode === 'signin' ? 'Sign in to continue' :
           mode === 'forgot' ? 'Enter your email to get a reset link' :
           'Choose a new password for your account'}
        </p>
      </div>

      {/* Auth form */}
      <form onSubmit={handleSubmit} className="w-full max-w-[320px] space-y-3">
        {mode !== 'reset' && (
          <Input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="h-12 text-base rounded-xl border-2 focus:border-primary"
            autoComplete="email"
          />
        )}
        
        {(mode === 'signin' || mode === 'signup' || mode === 'reset') && (
          <Input
            type="password"
            placeholder={mode === 'reset' ? 'New password' : 'Password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="h-12 text-base rounded-xl border-2 focus:border-primary"
            autoComplete={mode === 'signup' || mode === 'reset' ? 'new-password' : 'current-password'}
          />
        )}

        {mode === 'reset' && (
          <Input
            type="password"
            placeholder="Confirm new password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="h-12 text-base rounded-xl border-2 focus:border-primary"
            autoComplete="new-password"
          />
        )}

        <Button
          type="submit"
          disabled={isSubmitting}
          className="w-full h-13 text-base font-semibold rounded-xl gradient-primary text-white shadow-lg active:scale-[0.98] transition-transform disabled:opacity-70 mt-2"
        >
          {isSubmitting ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : mode === 'signup' ? (
            'Create Account'
          ) : mode === 'forgot' ? (
            'Send Reset Link'
          ) : mode === 'reset' ? (
            'Set New Password'
          ) : (
            'Sign In'
          )}
        </Button>
      </form>

      {/* Secondary actions */}
      <div className="flex flex-col items-center gap-3 mt-6">
        {mode === 'signin' && (
          <button
            type="button"
            onClick={() => setMode('forgot')}
            className="text-sm text-primary hover:underline"
          >
            Forgot password?
          </button>
        )}
        
        <button
          type="button"
          onClick={() => setMode('landing')}
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          ← Back
        </button>
      </div>
    </div>
  );
}
