import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, Trophy, ListOrdered, PartyPopper, User, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { base44, type Party, type Fraternity } from '@/api/base44Client';
import Tutorial from '@/components/onboarding/Tutorial';

interface LayoutProps {
  children: React.ReactNode;
}

const navItems = [
  { title: 'Feed', url: '/Activity', icon: Home, hasNotification: true },
  { title: 'Leaderboard', url: '/Leaderboard', icon: Trophy },
  { title: 'Parties', url: '/Parties', icon: PartyPopper },
  { title: 'Your Lists', url: '/YourRankings', icon: ListOrdered },
  { title: 'Profile', url: '/Profile', icon: User },
];

// Check if there are unread feed items
const getHasUnreadFeed = () => {
  const lastSeenCount = parseInt(localStorage.getItem('touse_last_seen_feed_count') || '0');
  const currentCount = parseInt(localStorage.getItem('touse_current_feed_count') || '0');
  return currentCount > lastSeenCount;
};

// Format countdown time
const formatCountdown = (ms: number) => {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return { hours, minutes, seconds };
};

export default function Layout({ children }: LayoutProps) {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showTutorial, setShowTutorial] = useState(false);
  const [hasUnreadFeed, setHasUnreadFeed] = useState(getHasUnreadFeed());
  const [nextParty, setNextParty] = useState<Party | null>(null);
  const [nextPartyFrat, setNextPartyFrat] = useState<Fraternity | null>(null);
  const [countdown, setCountdown] = useState({ hours: 0, minutes: 0, seconds: 0 });
  const location = useLocation();

  useEffect(() => {
    loadUser();
    loadNextParty();
  }, []);

  // Update countdown every second
  useEffect(() => {
    if (!nextParty) return;
    
    const updateCountdown = () => {
      const now = new Date().getTime();
      const partyTime = new Date(nextParty.starts_at).getTime();
      const diff = partyTime - now;
      
      if (diff > 0) {
        setCountdown(formatCountdown(diff));
      } else {
        setCountdown({ hours: 0, minutes: 0, seconds: 0 });
      }
    };
    
    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [nextParty]);

  // Check for unread feed items whenever route changes
  useEffect(() => {
    setHasUnreadFeed(getHasUnreadFeed());
  }, [location.pathname]);

  // Listen for storage changes (when Activity page updates the count)
  useEffect(() => {
    const handleStorageChange = () => {
      setHasUnreadFeed(getHasUnreadFeed());
    };
    window.addEventListener('storage', handleStorageChange);
    const interval = setInterval(handleStorageChange, 1000);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(interval);
    };
  }, []);

  const loadUser = async () => {
    try {
      const userData = await base44.auth.me();
      setUser(userData);
      
      const permanentOptOut = localStorage.getItem('touse_tutorial_never_show');
      const shownThisSession = sessionStorage.getItem('touse_tutorial_shown_this_session');
      
      if (!permanentOptOut && !shownThisSession) {
        setShowTutorial(true);
      }
    } catch (error) {
      console.error('Failed to load user:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadNextParty = async () => {
    try {
      const [parties, fraternities] = await Promise.all([
        base44.entities.Party.list('starts_at'),
        base44.entities.Fraternity.list(),
      ]);
      
      const now = new Date();
      const upcoming = parties.filter(p => new Date(p.starts_at) > now);
      
      if (upcoming.length > 0) {
        const next = upcoming[0];
        setNextParty(next);
        const frat = fraternities.find(f => f.id === next.fraternity_id);
        setNextPartyFrat(frat || null);
      }
    } catch (error) {
      console.error('Failed to load next party:', error);
    }
  };

  const handleLogin = () => {
    base44.auth.redirectToLogin(window.location.href);
  };

  const handleTutorialComplete = (neverShowAgain: boolean) => {
    sessionStorage.setItem('touse_tutorial_shown_this_session', 'true');
    
    if (neverShowAgain) {
      localStorage.setItem('touse_tutorial_never_show', 'true');
    }
    
    setShowTutorial(false);
  };

  const isActive = (path: string) => location.pathname === path;

  return (
    <>
      <div className="min-h-screen flex flex-col w-full bg-background">
        {/* Mobile Header - Gradient background with inline Next Up Party */}
        <header className="sticky top-0 z-40 gradient-primary pt-safe">
          <div className="px-4 py-3 flex items-center justify-between gap-3">
            {/* Left: Touse text */}
            <Link to="/" className="flex items-center shrink-0">
              <span className="text-xl font-bold text-white">Touse</span>
            </Link>
            
            {/* Center: Next Up Party Banner - Black */}
            {nextParty && (
              <Link 
                to={`/Party?id=${nextParty.id}`}
                className="flex-1 min-w-0 rounded-xl overflow-hidden px-3 py-1.5 flex items-center justify-between gap-2 bg-black"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] text-white/80 font-medium uppercase tracking-wide leading-none">Next Up</p>
                  <p className="text-sm font-bold text-white truncate leading-tight">{nextParty.title}</p>
                </div>
                
                {/* Compact Countdown */}
                <div className="flex items-center gap-0.5 text-white shrink-0">
                  <span className="text-sm font-bold tabular-nums">{countdown.hours.toString().padStart(2, '0')}</span>
                  <span className="text-xs opacity-60">:</span>
                  <span className="text-sm font-bold tabular-nums">{countdown.minutes.toString().padStart(2, '0')}</span>
                  <span className="text-xs opacity-60">:</span>
                  <span className="text-sm font-bold tabular-nums">{countdown.seconds.toString().padStart(2, '0')}</span>
                </div>
              </Link>
            )}
            
            {/* Right: Profile button */}
            {loading ? (
              <Skeleton className="h-9 w-9 rounded-full bg-white/20 shrink-0" />
            ) : user ? (
              <Link to="/Profile" className="shrink-0">
                <Avatar className="h-9 w-9 border-2 border-white/30">
                  <AvatarImage src={user.avatar_url} />
                  <AvatarFallback className="bg-white/20 text-white text-sm">
                    {user.name?.charAt(0) || 'U'}
                  </AvatarFallback>
                </Avatar>
              </Link>
            ) : (
              <Button onClick={handleLogin} size="sm" className="bg-white/20 hover:bg-white/30 text-white h-9 px-3 text-sm shrink-0">
                Sign in
              </Button>
            )}
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 px-4 py-5 pb-28 overflow-y-auto">
          {children}
        </main>

        {/* Mobile Bottom Nav */}
        <nav className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur-md border-t border-border/50 z-40" style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 8px)' }}>
          <div className="grid grid-cols-5 gap-1 px-2 pt-2">
            {navItems.map((item) => {
              const active = isActive(item.url);
              const showBadge = item.hasNotification && hasUnreadFeed && !active;
              return (
                <Link
                  key={item.title}
                  to={item.url}
                  className={`relative flex flex-col items-center justify-center gap-1 py-2 min-h-[52px] rounded-xl transition-all active:scale-95 ${
                    active
                      ? 'text-primary bg-primary/10'
                      : 'text-muted-foreground active:bg-muted/50'
                  }`}
                >
                  <div className="relative">
                    <item.icon 
                      className="h-6 w-6 transition-all duration-200" 
                      fill="none" 
                      strokeWidth={active ? 2.75 : 1.75} 
                    />
                    {showBadge && (
                      <span className="absolute -top-1 -right-1 h-2.5 w-2.5 bg-red-500 rounded-full animate-pulse" />
                    )}
                  </div>
                  <span className={`text-xs ${active ? 'font-semibold' : 'font-medium'}`}>{item.title}</span>
                </Link>
              );
            })}
          </div>
        </nav>
      </div>

      {/* Tutorial Overlay */}
      {showTutorial && (
        <Tutorial onComplete={handleTutorialComplete} />
      )}
    </>
  );
}
