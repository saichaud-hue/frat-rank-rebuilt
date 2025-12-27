import { useState, useEffect } from 'react';
import { User, Trophy, PartyPopper, Star, LogIn, Award } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { base44 } from '@/api/base44Client';

export default function Profile() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ partyRatings: 0, repRatings: 0, comments: 0 });

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const userData = await base44.auth.me();
      setUser(userData);

      if (userData) {
        const [partyRatings, repRatings, comments] = await Promise.all([
          base44.entities.PartyRating.filter({ user_id: userData.id }),
          base44.entities.ReputationRating.filter({ user_id: userData.id }),
          base44.entities.PartyComment.filter({ user_id: userData.id }),
        ]);

        setStats({
          partyRatings: partyRatings.length,
          repRatings: repRatings.length,
          comments: comments.length,
        });
      }
    } catch (error) {
      console.error('Failed to load profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = () => {
    base44.auth.redirectToLogin(window.location.href);
  };

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <Skeleton className="h-48 rounded-xl" />
        <div className="grid grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="max-w-2xl mx-auto">
        <Card className="glass p-8 text-center space-y-6">
          <div className="w-20 h-20 mx-auto rounded-full bg-muted flex items-center justify-center">
            <User className="h-10 w-10 text-muted-foreground" />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-bold">Welcome to FratRank</h1>
            <p className="text-muted-foreground">
              Sign in to track your ratings and earn points
            </p>
          </div>
          <Button onClick={handleLogin} className="gradient-primary text-white">
            <LogIn className="h-4 w-4 mr-2" />
            Sign in with Google
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-2">
        <User className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold gradient-text">Profile</h1>
      </div>

      {/* Profile Card */}
      <Card className="glass p-6 space-y-4">
        <div className="flex items-center gap-4">
          <Avatar className="h-16 w-16">
            <AvatarImage src={user.avatar_url} />
            <AvatarFallback className="bg-gradient-to-br from-indigo-500 to-purple-500 text-white text-xl">
              {user.name?.charAt(0) || 'U'}
            </AvatarFallback>
          </Avatar>
          <div>
            <h2 className="text-xl font-bold">{user.name}</h2>
            <p className="text-muted-foreground">{user.email}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Award className="h-5 w-5 text-amber-500" />
          <span className="font-medium">{user.points || 0} points</span>
          <Badge variant="secondary">Duke Student</Badge>
        </div>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="glass p-4 text-center">
          <PartyPopper className="h-6 w-6 mx-auto text-pink-500 mb-2" />
          <p className="text-2xl font-bold">{stats.partyRatings}</p>
          <p className="text-xs text-muted-foreground">Party Ratings</p>
        </Card>
        <Card className="glass p-4 text-center">
          <Trophy className="h-6 w-6 mx-auto text-amber-500 mb-2" />
          <p className="text-2xl font-bold">{stats.repRatings}</p>
          <p className="text-xs text-muted-foreground">Frat Ratings</p>
        </Card>
        <Card className="glass p-4 text-center">
          <Star className="h-6 w-6 mx-auto text-purple-500 mb-2" />
          <p className="text-2xl font-bold">{stats.comments}</p>
          <p className="text-xs text-muted-foreground">Comments</p>
        </Card>
      </div>

      {/* Achievements placeholder */}
      <Card className="glass p-6">
        <h3 className="font-semibold mb-4 flex items-center gap-2">
          <Award className="h-5 w-5 text-primary" />
          Achievements
        </h3>
        <div className="text-center py-8 text-muted-foreground">
          <p>Keep rating to unlock achievements!</p>
        </div>
      </Card>
    </div>
  );
}
