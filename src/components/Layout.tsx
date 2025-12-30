import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Trophy, PartyPopper, User } from 'lucide-react';
import touseLogo from '@/assets/taus-logo.jpg';
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
  { title: 'Leaderboard', url: '/Leaderboard', icon: Trophy },
  { title: 'Parties', url: '/Parties', icon: PartyPopper },
  { title: 'Profile', url: '/Profile', icon: User },
];

export default function Layout({ children }: LayoutProps) {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showTutorial, setShowTutorial] = useState(false);
  const location = useLocation();

  useEffect(() => {
    loadUser();
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
      <div className="min-h-screen flex flex-col w-full bg-gradient-to-br from-slate-50 to-indigo-50">
        {/* Mobile Header - iPhone optimized */}
        <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-slate-200/50 px-4 py-3 pt-safe flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <img src={touseLogo} alt="Touse" className="h-9 w-9 rounded-xl object-cover" />
            <span className="text-lg font-bold text-foreground">Touse</span>
          </Link>
          {loading ? (
            <Skeleton className="h-9 w-9 rounded-full" />
          ) : user ? (
            <Avatar className="h-9 w-9">
              <AvatarImage src={user.avatar_url} />
              <AvatarFallback className="bg-gradient-to-br from-indigo-500 to-purple-500 text-white text-sm">
                {user.name?.charAt(0) || 'U'}
              </AvatarFallback>
            </Avatar>
          ) : (
            <Button onClick={handleLogin} size="sm" className="gradient-primary text-white h-9 px-3 text-sm">
              Sign in
            </Button>
          )}
        </header>

        {/* Main Content - iPhone optimized with generous spacing */}
        <main className="flex-1 px-4 py-5 pb-28 overflow-y-auto">
          {children}
        </main>

        {/* Mobile Bottom Nav - iPhone safe area */}
        <nav className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-slate-200/50 z-40" style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 8px)' }}>
          <div className="grid grid-cols-3 gap-1 px-2 pt-2">
            {navItems.map((item) => {
              const active = isActive(item.url);
              return (
                <Link
                  key={item.title}
                  to={item.url}
                  className={`flex flex-col items-center justify-center gap-1 py-2 min-h-[52px] rounded-xl transition-all active:scale-95 ${
                    active
                      ? 'text-primary bg-primary/10'
                      : 'text-muted-foreground active:bg-muted/50'
                  }`}
                >
                  <item.icon className="h-6 w-6" fill={active ? 'currentColor' : 'none'} />
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
