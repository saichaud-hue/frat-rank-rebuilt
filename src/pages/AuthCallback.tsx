import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function AuthCallback() {
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const handleCallback = async () => {
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
    <div className="min-h-screen gradient-background flex flex-col items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
      <p className="text-muted-foreground">Signing you in…</p>
    </div>
  );
}
