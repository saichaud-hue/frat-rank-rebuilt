import { Loader2 } from 'lucide-react';
import touseLogo from '@/assets/touse-logo.png';

export default function OAuthLoadingScreen() {
  return (
    <div className="fixed inset-0 z-50 gradient-background flex flex-col items-center justify-center px-6">
      <div className="flex flex-col items-center animate-fade-in">
        <img 
          src={touseLogo} 
          alt="Touse" 
          className="w-20 h-20 rounded-2xl shadow-lg mb-6 animate-pulse"
        />
        <h2 className="text-xl font-semibold text-foreground mb-2">Connecting securely...</h2>
        <p className="text-muted-foreground text-center text-sm mb-6 max-w-[260px]">
          You'll be redirected to Google to sign in, then brought right back.
        </p>
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    </div>
  );
}
