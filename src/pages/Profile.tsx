import { useState, useEffect } from 'react';
import { User, Trophy, PartyPopper, Star, LogIn, Award, ChevronDown, ChevronUp } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { base44 } from '@/api/base44Client';
import { format } from 'date-fns';

export default function Profile() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ partyRatings: 0, repRatings: 0, comments: 0 });
  const [partyRatingsData, setPartyRatingsData] = useState<any[]>([]);
  const [repRatingsData, setRepRatingsData] = useState<any[]>([]);
  const [commentsData, setCommentsData] = useState<any[]>([]);
  const [expandedSection, setExpandedSection] = useState<string | null>(null);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const userData = await base44.auth.me();
      setUser(userData);

      if (userData) {
        const [partyRatings, repRatings, partyComments, fratComments, parties, fraternities] = await Promise.all([
          base44.entities.PartyRating.filter({ user_id: userData.id }),
          base44.entities.ReputationRating.filter({ user_id: userData.id }),
          base44.entities.PartyComment.filter({ user_id: userData.id }),
          base44.entities.FraternityComment.filter({ user_id: userData.id }),
          base44.entities.Party.list(),
          base44.entities.Fraternity.list(),
        ]);

        // Enrich party ratings with party/fraternity names
        const enrichedPartyRatings = partyRatings.map((r: any) => {
          const party = parties.find((p: any) => p.id === r.party_id);
          const frat = party ? fraternities.find((f: any) => f.id === party.fraternity_id) : null;
          return { ...r, partyName: party?.title || 'Unknown Party', fratName: frat?.name || '' };
        });

        // Enrich rep ratings with fraternity names
        const enrichedRepRatings = repRatings.map((r: any) => {
          const frat = fraternities.find((f: any) => f.id === r.fraternity_id);
          return { ...r, fratName: frat?.name || 'Unknown Fraternity' };
        });

        // Enrich comments with entity names
        const enrichedPartyComments = partyComments.map((c: any) => {
          const party = parties.find((p: any) => p.id === c.party_id);
          return { ...c, entityName: party?.title || 'Unknown Party', type: 'party' };
        });
        const enrichedFratComments = fratComments.map((c: any) => {
          const frat = fraternities.find((f: any) => f.id === c.fraternity_id);
          return { ...c, entityName: frat?.name || 'Unknown Fraternity', type: 'fraternity' };
        });

        setPartyRatingsData(enrichedPartyRatings);
        setRepRatingsData(enrichedRepRatings);
        setCommentsData([...enrichedPartyComments, ...enrichedFratComments].sort((a, b) => 
          new Date(b.created_date).getTime() - new Date(a.created_date).getTime()
        ));

        setStats({
          partyRatings: partyRatings.length,
          repRatings: repRatings.length,
          comments: partyComments.length + fratComments.length,
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
        <h1 className="text-2xl font-bold text-foreground">Profile</h1>
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

      {/* Stats - Expandable */}
      <div className="space-y-3">
        {/* Party Ratings */}
        <Collapsible open={expandedSection === 'partyRatings'} onOpenChange={(open) => setExpandedSection(open ? 'partyRatings' : null)}>
          <CollapsibleTrigger asChild>
            <Card className="glass p-4 cursor-pointer hover:bg-muted/50 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <PartyPopper className="h-6 w-6 text-pink-500" />
                  <div>
                    <p className="text-2xl font-bold">{stats.partyRatings}</p>
                    <p className="text-xs text-muted-foreground">Party Ratings</p>
                  </div>
                </div>
                {expandedSection === 'partyRatings' ? <ChevronUp className="h-5 w-5 text-muted-foreground" /> : <ChevronDown className="h-5 w-5 text-muted-foreground" />}
              </div>
            </Card>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <Card className="glass mt-2 p-4 space-y-3">
              {partyRatingsData.length === 0 ? (
                <p className="text-muted-foreground text-sm text-center py-4">No party ratings yet</p>
              ) : (
                partyRatingsData.map((rating) => (
                  <div key={rating.id} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
                    <div>
                      <p className="font-medium">{rating.partyName}</p>
                      <p className="text-xs text-muted-foreground">{rating.fratName} • {format(new Date(rating.created_date), 'MMM d, yyyy')}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-primary">{((rating.vibe_score + rating.music_score + rating.execution_score + rating.party_quality_score) / 4).toFixed(1)}</p>
                      <p className="text-xs text-muted-foreground">avg score</p>
                    </div>
                  </div>
                ))
              )}
            </Card>
          </CollapsibleContent>
        </Collapsible>

        {/* Frat Ratings */}
        <Collapsible open={expandedSection === 'repRatings'} onOpenChange={(open) => setExpandedSection(open ? 'repRatings' : null)}>
          <CollapsibleTrigger asChild>
            <Card className="glass p-4 cursor-pointer hover:bg-muted/50 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Trophy className="h-6 w-6 text-amber-500" />
                  <div>
                    <p className="text-2xl font-bold">{stats.repRatings}</p>
                    <p className="text-xs text-muted-foreground">Frat Ratings</p>
                  </div>
                </div>
                {expandedSection === 'repRatings' ? <ChevronUp className="h-5 w-5 text-muted-foreground" /> : <ChevronDown className="h-5 w-5 text-muted-foreground" />}
              </div>
            </Card>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <Card className="glass mt-2 p-4 space-y-3">
              {repRatingsData.length === 0 ? (
                <p className="text-muted-foreground text-sm text-center py-4">No frat ratings yet</p>
              ) : (
                repRatingsData.map((rating) => (
                  <div key={rating.id} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
                    <div>
                      <p className="font-medium">{rating.fratName}</p>
                      <p className="text-xs text-muted-foreground">{format(new Date(rating.created_date), 'MMM d, yyyy')}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-primary">{((rating.vibes_score + rating.safety_score + rating.respect_score + rating.inclusivity_score) / 4).toFixed(1)}</p>
                      <p className="text-xs text-muted-foreground">avg score</p>
                    </div>
                  </div>
                ))
              )}
            </Card>
          </CollapsibleContent>
        </Collapsible>

        {/* Comments */}
        <Collapsible open={expandedSection === 'comments'} onOpenChange={(open) => setExpandedSection(open ? 'comments' : null)}>
          <CollapsibleTrigger asChild>
            <Card className="glass p-4 cursor-pointer hover:bg-muted/50 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Star className="h-6 w-6 text-purple-500" />
                  <div>
                    <p className="text-2xl font-bold">{stats.comments}</p>
                    <p className="text-xs text-muted-foreground">Comments</p>
                  </div>
                </div>
                {expandedSection === 'comments' ? <ChevronUp className="h-5 w-5 text-muted-foreground" /> : <ChevronDown className="h-5 w-5 text-muted-foreground" />}
              </div>
            </Card>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <Card className="glass mt-2 p-4 space-y-3">
              {commentsData.length === 0 ? (
                <p className="text-muted-foreground text-sm text-center py-4">No comments yet</p>
              ) : (
                commentsData.map((comment) => (
                  <div key={comment.id} className="py-2 border-b border-border/50 last:border-0">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-sm font-medium">{comment.entityName}</p>
                      <Badge variant="outline" className="text-xs">{comment.type}</Badge>
                    </div>
                    <p className="text-sm text-foreground line-clamp-2">{comment.text}</p>
                    <p className="text-xs text-muted-foreground mt-1">{format(new Date(comment.created_date), 'MMM d, yyyy')}</p>
                  </div>
                ))
              )}
            </Card>
          </CollapsibleContent>
        </Collapsible>
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
