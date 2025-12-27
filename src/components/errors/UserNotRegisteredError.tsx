import { AlertTriangle, LogIn } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { base44 } from '@/api/base44Client';

export default function UserNotRegisteredError() {
  const handleLogin = () => {
    base44.auth.redirectToLogin(window.location.origin);
  };

  return (
    <div className="min-h-screen gradient-background flex items-center justify-center p-4">
      <Card className="max-w-md w-full p-8 text-center space-y-6">
        <div className="w-16 h-16 mx-auto rounded-full bg-amber-100 flex items-center justify-center">
          <AlertTriangle className="h-8 w-8 text-amber-600" />
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-bold">Not Registered</h1>
          <p className="text-muted-foreground">
            Your account is not registered to use FratRank. Please sign in with a valid Duke University email address.
          </p>
        </div>

        <Button onClick={handleLogin} className="w-full gradient-primary text-white">
          <LogIn className="h-4 w-4 mr-2" />
          Sign In with Duke Email
        </Button>

        <p className="text-xs text-muted-foreground">
          Only students with a valid @duke.edu email can access this platform.
        </p>
      </Card>
    </div>
  );
}
