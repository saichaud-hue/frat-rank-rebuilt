import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import touseLogo from '@/assets/touse-logo.png';

export default function AuthCallback() {
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const handleCallback = async () => {
      const params = new URLSearchParams(window.location.search);
      const code = params.get('code');
      const errorParam = params.get('error');
      const errorDescription = params.get('error_description');

      // Case 1: OAuth returned an error
      if (errorParam) {
        console.error('OAuth error:', errorParam, errorDescription);
        toast({
          title: 'Sign in failed',
          description: errorDescription || errorParam || 'Authentication was cancelled or failed.',
          variant: 'destructive',
        });
        navigate('/auth', { replace: true });
        return;
      }

      // Case 2: No code parameter - check for existing session only
      if (!code) {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          navigate('/Activity', { replace: true });
        } else {
          navigate('/auth', { replace: true });
        }
        return;
      }

      // Case 3: Code exists - exchange for session
      try {
        const { error } = await supabase.auth.exchangeCodeForSession(window.location.href);
        
        if (error) {
          console.error('Auth callback error:', error);
          toast({
            title: 'Sign in failed',
            description: error.message || 'Unable to complete sign in. Please try again.',
            variant: 'destructive',
          });
          navigate('/auth', { replace: true });
          return;
        }

        // Verify session was created
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          toast({
            title: 'Sign in failed',
            description: 'Session could not be established. Please try again.',
            variant: 'destructive',
          });
          navigate('/auth', { replace: true });
          return;
        }
        
        navigate('/Activity', { replace: true });
      } catch (err) {
        console.error('Unexpected auth error:', err);
        toast({
          title: 'Sign in failed',
          description: 'An unexpected error occurred. Please try again.',
          variant: 'destructive',
        });
        navigate('/auth', { replace: true });
      }
    };

    handleCallback();
  }, [navigate, toast]);

  return (
    <div className="fixed inset-0 z-50 gradient-background flex flex-col items-center justify-center px-6">
      <div className="flex flex-col items-center animate-fade-in">
        <img 
          src={touseLogo} 
          alt="Touse" 
          className="w-20 h-20 rounded-2xl shadow-lg mb-6 animate-pulse"
        />
        <h2 className="text-xl font-semibold text-foreground mb-2">Finishing sign-in...</h2>
        <p className="text-muted-foreground text-center text-sm mb-6 max-w-[260px]">
          Just a moment while we set up your account.
        </p>
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    </div>
  );
}
