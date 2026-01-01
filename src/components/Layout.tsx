import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, Trophy, PartyPopper, User, ChevronRight, Zap, Newspaper } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { base44, type Party, type Fraternity } from '@/api/base44Client';
import Tutorial from '@/components/onboarding/Tutorial';
import NewPostsPopup from '@/components/NewPostsPopup';

interface LayoutProps {
  children: React.ReactNode;
}

const navItems = [
  { title: 'Feed', url: '/Activity', icon: Home, hasNotification: true },
  { title: 'Posts', url: '/Posts', icon: Newspaper },
  { title: 'Rankings', url: '/Leaderboard', icon: Trophy },
  { title: 'Parties', url: '/Parties', icon: PartyPopper },
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
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showTutorial, setShowTutorial] = useState(false);
  const [hasUnreadFeed, setHasUnreadFeed] = useState(getHasUnreadFeed());
  const [nextParty, setNextParty] = useState<Party | null>(null);
  const [nextPartyFrat, setNextPartyFrat] = useState<Fraternity | null>(null);
  const [countdown, setCountdown] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  const [newPostsCount, setNewPostsCount] = useState(getNewPostsCount());
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
        {/* Mobile Header - Duke Blue Bold */}
        <header className="sticky top-0 z-40 gradient-primary pt-safe shadow-duke-lg">
          <div className="px-4 py-3 flex items-center justify-between gap-3">
            {/* Left: Touse logo */}
            <Link to="/" className="flex items-center gap-2 shrink-0 group">
              <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center group-hover:bg-white/30 transition-colors">
                <Zap className="h-5 w-5 text-white" />
              </div>
              <span className="text-xl font-display font-bold text-white tracking-tight">Touse</span>
            </Link>
            
            {/* Center: Next Up Party - Bold countdown */}
            {nextParty && (
              <Link 
                to={`/Party?id=${nextParty.id}`}
                className="flex items-center gap-2 tap-bounce"
              >
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/15 backdrop-blur-sm">
                  <span className="px-1.5 py-0.5 rounded bg-white/20 text-[10px] text-white font-bold uppercase tracking-wider">Next</span>
                  <span className="text-sm font-bold text-white truncate max-w-[80px]">{nextParty.title}</span>
                  
                  {/* Countdown - bold numbers */}
                  <div className="flex items-center gap-0.5 text-white font-display">
                    {countdown.days > 0 && (
                      <>
                        <span className="text-sm font-black tabular-nums">{countdown.days}</span>
                        <span className="text-[10px] opacity-70 mr-0.5">d</span>
                      </>
                    )}
                    <span className="text-sm font-black tabular-nums">{countdown.hours}</span>
                    <span className="text-[10px] opacity-70 mr-0.5">h</span>
                    <span className="text-sm font-black tabular-nums">{countdown.minutes}</span>
                    <span className="text-[10px] opacity-70">m</span>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-white/60 shrink-0" />
              </Link>
            )}
            
            {/* Right: Profile button */}
            {loading ? (
              <Skeleton className="h-10 w-10 rounded-xl bg-white/20 shrink-0" />
            ) : user ? (
              <Link to="/Profile" className="shrink-0 tap-bounce">
                <Avatar className="h-10 w-10 ring-2 ring-white/40 hover:ring-white/60 transition-all shadow-duke">
                  <AvatarImage src={user.avatar_url} />
                  <AvatarFallback className="bg-white/20 text-white text-sm font-bold">
                    {user.name?.charAt(0) || 'U'}
                  </AvatarFallback>
                </Avatar>
              </Link>
            ) : (
              <Button onClick={handleLogin} size="sm" className="bg-white/20 hover:bg-white/30 text-white h-10 px-4 text-sm font-bold border-0 shrink-0">
                Sign in
              </Button>
            )}
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 px-4 py-5 pb-28 overflow-y-auto">
          {children}
        </main>

        {/* Mobile Bottom Nav - Bold and expressive */}
        <nav className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur-xl border-t-2 border-border/50 z-40 shadow-duke-lg" style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 8px)' }}>
          <div className="grid grid-cols-4 gap-1 px-3 pt-2">
            {navItems.map((item) => {
              const active = isActive(item.url);
              const showBadge = item.hasNotification && hasUnreadFeed && !active;
              return (
                <Link
                  key={item.title}
                  to={item.url}
                  className={`relative flex flex-col items-center justify-center gap-1 py-2.5 min-h-[56px] rounded-2xl transition-all tap-bounce ${
                    active
                      ? 'bg-primary text-primary-foreground shadow-duke'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                  }`}
                >
                  <div className="relative">
                    <item.icon 
                      className={`h-6 w-6 transition-all duration-200 ${active ? 'animate-pop' : ''}`}
                      fill={active ? "currentColor" : "none"} 
                      strokeWidth={active ? 2.5 : 2} 
                    />
                    {showBadge && (
                      <span className="absolute -top-1 -right-1 h-3 w-3 bg-red-500 rounded-full animate-pulse shadow-lg" />
                    )}
                  </div>
                  <span className={`text-xs font-bold tracking-tight ${active ? '' : 'font-semibold'}`}>{item.title}</span>
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
