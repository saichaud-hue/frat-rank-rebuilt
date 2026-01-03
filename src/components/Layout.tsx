import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Home, Trophy, PartyPopper, User, ChevronRight, Newspaper } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/contexts/AuthContext';
import { base44, type Party, type Fraternity } from '@/api/base44Client';
import Tutorial from '@/components/onboarding/Tutorial';
import NewPostsPopup from '@/components/NewPostsPopup';
import touseLogo from '@/assets/touse-logo.png';

interface LayoutProps {
  children: React.ReactNode;
}

const navItems = [
  { title: 'Feed', url: '/Activity', icon: Home, hasNotification: true },
  { title: 'Rankings', url: '/Leaderboard', icon: Trophy },
  { title: 'Parties', url: '/Parties', icon: PartyPopper },
  { title: 'Post', url: '/Posts', icon: Newspaper },
  { title: 'You', url: '/Profile', icon: User },
];

// Check if there are unread feed items
const getHasUnreadFeed = () => {
  const lastSeenCount = parseInt(localStorage.getItem('touse_last_seen_feed_count') || '0');
  const currentCount = parseInt(localStorage.getItem('touse_current_feed_count') || '0');
  return currentCount > lastSeenCount;
};

// Get the count of new posts
const getNewPostsCount = () => {
  const lastSeenCount = parseInt(localStorage.getItem('touse_last_seen_feed_count') || '0');
  const currentCount = parseInt(localStorage.getItem('touse_current_feed_count') || '0');
  return Math.max(0, currentCount - lastSeenCount);
};

// Format countdown time with days support
const formatCountdown = (ms: number) => {
  const totalSeconds = Math.floor(ms / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return { days, hours, minutes, seconds };
};

export default function Layout({ children }: LayoutProps) {
  const { user, profile, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [showTutorial, setShowTutorial] = useState(false);
  const [hasUnreadFeed, setHasUnreadFeed] = useState(getHasUnreadFeed());
  const [nextParty, setNextParty] = useState<Party | null>(null);
  const [nextPartyFrat, setNextPartyFrat] = useState<Fraternity | null>(null);
  const [countdown, setCountdown] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  const [isLiveNow, setIsLiveNow] = useState(false);
  const [newPostsCount, setNewPostsCount] = useState(getNewPostsCount());
  const location = useLocation();

  useEffect(() => {
    loadNextParty();
    
    // Check tutorial status
    const permanentOptOut = localStorage.getItem('touse_tutorial_never_show');
    const shownThisSession = sessionStorage.getItem('touse_tutorial_shown_this_session');
    
    if (!permanentOptOut && !shownThisSession) {
      setShowTutorial(true);
    }
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
        setCountdown({ days: 0, hours: 0, minutes: 0, seconds: 0 });
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
      setNewPostsCount(getNewPostsCount());
    };
    window.addEventListener('storage', handleStorageChange);
    const interval = setInterval(handleStorageChange, 1000);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(interval);
    };
  }, []);

  const loadNextParty = async () => {
    try {
      const [parties, fraternities] = await Promise.all([
        base44.entities.Party.list('starts_at'),
        base44.entities.Fraternity.list(),
      ]);
      
      const now = new Date();
      
      // First check for live parties (started but not ended)
      const liveParties = parties.filter(p => {
        const startTime = new Date(p.starts_at);
        const endTime = p.ends_at ? new Date(p.ends_at) : new Date(startTime.getTime() + 4 * 60 * 60 * 1000); // Default 4 hours if no end time
        return startTime <= now && endTime >= now;
      });
      
      if (liveParties.length > 0) {
        // Show the first live party
        const liveParty = liveParties[0];
        setNextParty(liveParty);
        setIsLiveNow(true);
        const frat = fraternities.find(f => f.id === liveParty.fraternity_id);
        setNextPartyFrat(frat || null);
        return;
      }
      
      // Otherwise show the most upcoming party
      const upcoming = parties.filter(p => new Date(p.starts_at) > now);
      
      if (upcoming.length > 0) {
        const next = upcoming[0];
        setNextParty(next);
        setIsLiveNow(false);
        const frat = fraternities.find(f => f.id === next.fraternity_id);
        setNextPartyFrat(frat || null);
      } else {
        setNextParty(null);
        setIsLiveNow(false);
      }
    } catch (error) {
      console.error('Failed to load next party:', error);
    }
  };

  const handleLogin = () => {
    navigate('/auth');
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
      <div className="min-h-screen flex flex-col w-full max-w-[430px] mx-auto bg-background">
        {/* Mobile Header - Duke Blue Bold with safe area */}
        <header className="sticky top-0 z-40 gradient-primary pt-safe shadow-duke-lg">
          <div className="px-4 py-3 flex items-center justify-between gap-2">
            {/* Left: Touse logo */}
            <Link to="/" className="flex items-center gap-2 shrink-0 tap-bounce tap-target">
              <div className="w-8 h-8 rounded-xl overflow-hidden flex items-center justify-center">
                <img src={touseLogo} alt="Touse" className="w-full h-full object-cover" />
              </div>
              <span className="text-lg font-display font-bold text-white tracking-tight">Touse</span>
            </Link>
            
            {/* Center: Next Up Party - Bold countdown */}
            {nextParty && (
              <Link 
                to={`/Party?id=${nextParty.id}`}
                className="flex items-center gap-1 tap-bounce tap-target min-w-0 flex-1 justify-center"
              >
                <div className="flex items-center gap-1.5 px-2 py-1.5 rounded-full bg-white/15 backdrop-blur-sm min-w-0">
                  {isLiveNow ? (
                    <span className="px-1.5 py-0.5 rounded bg-red-500 text-[10px] text-white font-bold uppercase tracking-wider shrink-0 animate-pulse">NOW</span>
                  ) : (
                    <span className="px-1 py-0.5 rounded bg-white/20 text-[10px] text-white font-bold uppercase tracking-wider shrink-0">Next</span>
                  )}
                  <span className={`text-xs font-bold text-white truncate ${countdown.days > 0 ? 'max-w-[100px]' : 'max-w-[60px]'}`}>{nextParty.title}</span>
                  
                  {/* Countdown - only show if not live */}
                  {!isLiveNow && (
                    <div className="flex items-center gap-0.5 text-white font-display shrink-0">
                      {countdown.days > 0 ? (
                        <>
                          <span className="text-xs font-black tabular-nums">{countdown.days}</span>
                          <span className="text-[9px] opacity-70">d</span>
                        </>
                      ) : (
                        <>
                          <span className="text-xs font-black tabular-nums">{countdown.hours}</span>
                          <span className="text-[9px] opacity-70">h</span>
                          <span className="text-xs font-black tabular-nums">{countdown.minutes}</span>
                          <span className="text-[9px] opacity-70">m</span>
                        </>
                      )}
                    </div>
                  )}
                </div>
                <ChevronRight className="h-4 w-4 text-white/60 shrink-0" />
              </Link>
            )}
            
            {/* Right: Profile button - 44px tap target */}
            {authLoading ? (
              <Skeleton className="h-10 w-10 rounded-xl bg-white/20 shrink-0" />
            ) : user ? (
              <Link to="/Profile" className="shrink-0 tap-bounce tap-target flex items-center justify-center">
                <Avatar className="h-10 w-10 ring-2 ring-white/40 shadow-duke">
                  <AvatarImage src={profile?.avatar_url || user.user_metadata?.avatar_url} />
                  <AvatarFallback className="bg-white/20 text-white text-sm font-bold">
                    {profile?.full_name?.charAt(0) || user.email?.charAt(0) || 'U'}
                  </AvatarFallback>
                </Avatar>
              </Link>
            ) : (
              <Button onClick={handleLogin} size="sm" className="bg-white/20 text-white h-10 px-3 text-sm font-bold border-0 shrink-0 tap-target">
                Sign in
              </Button>
            )}
          </div>
        </header>

        {/* Main Content - pb-nav clears bottom nav */}
        <main className="flex-1 px-4 py-4 pb-nav overflow-y-auto overflow-x-hidden">
          {children}
        </main>

        {/* Mobile Bottom Nav - Fixed with safe area */}
        <nav 
          className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur-xl border-t border-border/50 z-40 shadow-duke-lg"
          style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
        >
          <div className="max-w-[430px] mx-auto grid grid-cols-5 gap-0.5 px-1 pt-1 pb-1">
            {navItems.map((item) => {
              const active = isActive(item.url);
              const showBadge = item.hasNotification && hasUnreadFeed && !active;
              
              return (
                <Link
                  key={item.title}
                  to={item.url}
                  className={`relative flex flex-col items-center justify-center gap-0.5 py-2 min-h-[52px] rounded-xl transition-all tap-bounce tap-target ${
                    active
                      ? 'text-primary'
                      : 'text-muted-foreground active:text-foreground active:bg-muted/50'
                  }`}
                >
                  <div className="relative">
                    <item.icon 
                      className={`h-5 w-5 transition-all duration-200 ${active ? 'animate-pop' : ''}`}
                      strokeWidth={active ? 2.5 : 2} 
                    />
                    {showBadge && (
                      <span className="absolute -top-1 -right-1 h-2.5 w-2.5 bg-red-500 rounded-full animate-pulse shadow-lg" />
                    )}
                  </div>
                  <span className={`text-[10px] tracking-tight ${active ? 'font-bold' : 'font-medium'}`}>{item.title}</span>
                </Link>
              );
            })}
          </div>
        </nav>
        
        {/* Global New Posts Popup */}
        <NewPostsPopup 
          count={newPostsCount} 
          onClear={() => {
            const currentCount = parseInt(localStorage.getItem('touse_current_feed_count') || '0');
            localStorage.setItem('touse_last_seen_feed_count', currentCount.toString());
            setNewPostsCount(0);
          }} 
        />
      </div>

      {/* Tutorial Overlay */}
      {showTutorial && (
        <Tutorial onComplete={handleTutorialComplete} />
      )}
    </>
  );
}
