import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, Trophy, ListOrdered, PartyPopper, User } from 'lucide-react';
import touseLogo from '@/assets/touse-logo.png';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Card } from '@/components/ui/card';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from '@/components/ui/sidebar';
import { base44 } from '@/api/base44Client';
import Tutorial from '@/components/onboarding/Tutorial';
import { createPageUrl } from '@/utils';

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

export default function Layout({ children }: LayoutProps) {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showTutorial, setShowTutorial] = useState(false);
  const [hasUnreadFeed, setHasUnreadFeed] = useState(getHasUnreadFeed());
  const location = useLocation();

  useEffect(() => {
    loadUser();
  }, []);

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
    // Also check periodically for same-tab updates
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
      
      // Show tutorial if: not permanently opted out AND not already shown this session
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

  const handleLogin = () => {
    base44.auth.redirectToLogin(window.location.href);
  };

  const handleLogout = () => {
    base44.auth.logout();
    setUser(null);
    window.location.reload();
  };

  const handleTutorialComplete = (neverShowAgain: boolean) => {
    // Always mark as shown for this session
    sessionStorage.setItem('touse_tutorial_shown_this_session', 'true');
    
    // If user checked "Don't show again", set permanent opt-out
    if (neverShowAgain) {
      localStorage.setItem('touse_tutorial_never_show', 'true');
    }
    
    setShowTutorial(false);
  };

  const isActive = (path: string) => location.pathname === path;

  return (
    <SidebarProvider>
      <div className="min-h-screen flex flex-col w-full bg-background">
        {/* Mobile Header - iPhone optimized */}
        <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-md border-b border-border/50 px-4 py-3 pt-safe flex items-center justify-between">
          <Link to="/" className="flex items-center">
            <img src={touseLogo} alt="Frapp" className="h-8 object-contain" />
          </Link>
          {loading ? (
            <Skeleton className="h-9 w-9 rounded-full" />
          ) : user ? (
            <Avatar className="h-9 w-9">
              <AvatarImage src={user.avatar_url} />
              <AvatarFallback className="gradient-primary text-primary-foreground text-sm">
                {user.name?.charAt(0) || 'U'}
              </AvatarFallback>
            </Avatar>
          ) : (
            <Button onClick={handleLogin} size="sm" className="gradient-primary text-primary-foreground h-9 px-3 text-sm">
              Sign in
            </Button>
          )}
        </header>

        {/* Main Content - iPhone optimized with generous spacing */}
        <main className="flex-1 px-4 py-5 pb-28 overflow-y-auto">
          {children}
        </main>

        {/* Mobile Bottom Nav - iPhone safe area */}
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
                    {item.title === 'Leaderboard' ? (
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="24"
                        height="24"
                        viewBox="0 0 24 24"
                        fill={active ? 'currentColor' : 'none'}
                        stroke="currentColor"
                        strokeWidth={active ? 1.5 : 2}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className={`h-6 w-6 transition-all duration-200 ${active ? 'scale-110' : 'scale-100'}`}
                      >
                        <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
                        <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
                        <path d="M4 22h16" />
                        <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
                        <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
                        <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
                      </svg>
                    ) : (
                      <item.icon 
                        className={`h-6 w-6 transition-all duration-200 ${active ? 'scale-110' : 'scale-100'}`} 
                        fill={active ? 'currentColor' : 'none'} 
                        strokeWidth={active ? 1.5 : 2} 
                      />
                    )}
                    {showBadge && (
                      <span className="absolute -top-1 -right-1 h-2.5 w-2.5 bg-red-500 rounded-full animate-pulse" />
                    )}
                  </div>
                  <span className="text-xs font-medium">{item.title}</span>
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
    </SidebarProvider>
  );
}
