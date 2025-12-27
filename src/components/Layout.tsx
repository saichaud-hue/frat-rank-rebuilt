import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Trophy, PartyPopper, Star, User, Plus, LogOut, LogIn, Menu } from 'lucide-react';
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
  { title: 'Rate', url: '/Rate', icon: Star },
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
      
      if (userData && !localStorage.getItem('fratrank_tutorial_seen')) {
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

  const handleTutorialComplete = () => {
    localStorage.setItem('fratrank_tutorial_seen', 'true');
    setShowTutorial(false);
  };

  const isActive = (path: string) => location.pathname === path;

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-gradient-to-br from-slate-50 to-indigo-50">
        {/* Desktop Sidebar */}
        <Sidebar className="hidden md:flex border-r bg-white/80 backdrop-blur-sm">
          <SidebarHeader className="p-4 border-b border-slate-200/50">
            <Link to="/" className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                <Trophy className="h-5 w-5 text-white" />
              </div>
              <span className="text-xl font-bold text-foreground">FratRank</span>
            </Link>
          </SidebarHeader>

          <SidebarContent className="p-2">
            <SidebarGroup>
              <SidebarGroupContent>
                <SidebarMenu>
                  {navItems.map((item) => (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton asChild>
                        <Link
                          to={item.url}
                          className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                            isActive(item.url)
                              ? 'bg-primary/10 text-primary font-medium'
                              : 'hover:bg-muted/50 text-muted-foreground'
                          }`}
                        >
                          <item.icon className="h-5 w-5" />
                          <span>{item.title}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>

            {/* Create Party CTA */}
            <Card className="mx-2 mt-4 p-4 gradient-primary text-white">
              <h3 className="font-semibold mb-2">Host a Party</h3>
              <p className="text-sm text-white/80 mb-3">Create an event for your fraternity</p>
              <Button asChild variant="secondary" className="w-full">
                <Link to={createPageUrl('CreateParty')}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Party
                </Link>
              </Button>
            </Card>
          </SidebarContent>

          <SidebarFooter className="p-4 border-t border-slate-200/50">
            {loading ? (
              <div className="flex items-center gap-3">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="flex-1">
                  <Skeleton className="h-4 w-24 mb-1" />
                  <Skeleton className="h-3 w-32" />
                </div>
              </div>
            ) : user ? (
              <div className="flex items-center gap-3">
                <Avatar>
                  <AvatarImage src={user.avatar_url} />
                  <AvatarFallback className="bg-gradient-to-br from-indigo-500 to-purple-500 text-white">
                    {user.name?.charAt(0) || 'U'}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{user.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                </div>
                <Button variant="ghost" size="icon" onClick={handleLogout}>
                  <LogOut className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <Button onClick={handleLogin} className="w-full gradient-primary text-white">
                <LogIn className="h-4 w-4 mr-2" />
                Sign in with Google
              </Button>
            )}
          </SidebarFooter>
        </Sidebar>

        <div className="flex-1 flex flex-col min-w-0">
          {/* Mobile Header */}
          <header className="md:hidden sticky top-0 z-40 bg-white/80 backdrop-blur-sm border-b border-slate-200/50 px-4 py-3 flex items-center justify-between">
            <Link to="/" className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                <Trophy className="h-4 w-4 text-white" />
              </div>
              <span className="text-lg font-bold text-foreground">FratRank</span>
            </Link>
            <SidebarTrigger className="md:hidden">
              <Menu className="h-5 w-5" />
            </SidebarTrigger>
          </header>

          {/* Main Content */}
          <main className="flex-1 p-4 pb-24 md:pb-4 overflow-y-auto">
            {children}
          </main>

          {/* Mobile Bottom Nav */}
          <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-sm border-t border-slate-200/50 px-2 py-2 z-40">
            <div className="grid grid-cols-4 gap-1">
              {navItems.map((item) => (
                <Link
                  key={item.title}
                  to={item.url}
                  className={`flex flex-col items-center gap-1 py-2 rounded-lg transition-colors ${
                    isActive(item.url)
                      ? 'text-primary bg-primary/10'
                      : 'text-muted-foreground'
                  }`}
                >
                  <item.icon className="h-5 w-5" />
                  <span className="text-xs font-medium">{item.title}</span>
                </Link>
              ))}
            </div>
          </nav>
        </div>
      </div>

      {/* Tutorial Overlay */}
      {showTutorial && user && (
        <Tutorial onComplete={handleTutorialComplete} />
      )}
    </SidebarProvider>
  );
}
