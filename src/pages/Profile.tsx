import { useState, useEffect } from 'react';
import { User, PartyPopper, Star, LogIn, Award, ChevronDown, ChevronUp, Pencil, Trash2, Zap, Music, Settings } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { base44, type PartyRating, type Party, type Fraternity } from '@/api/base44Client';
import { format } from 'date-fns';
import { formatTimeAgo, getScoreBgColor } from '@/utils';
import PartyRatingForm from '@/components/rate/PartyRatingForm';

type EnrichedPartyRating = PartyRating & { party?: Party; fraternity?: Fraternity };

export default function Profile() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ partyRatings: 0, comments: 0 });
  const [partyRatingsData, setPartyRatingsData] = useState<EnrichedPartyRating[]>([]);
  const [commentsData, setCommentsData] = useState<any[]>([]);
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  const [editingRating, setEditingRating] = useState<EnrichedPartyRating | null>(null);
  const [deletingRatingId, setDeletingRatingId] = useState<string | null>(null);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const userData = await base44.auth.me();
      setUser(userData);

      if (userData) {
        const [partyRatings, partyComments, fratComments, parties, fraternities] = await Promise.all([
          base44.entities.PartyRating.filter({ user_id: userData.id }, '-created_date'),
          base44.entities.PartyComment.filter({ user_id: userData.id }),
          base44.entities.FraternityComment.filter({ user_id: userData.id }),
          base44.entities.Party.list(),
          base44.entities.Fraternity.list(),
        ]);

        // Enrich party ratings with party/fraternity data
        const enrichedPartyRatings = partyRatings.map((r: any) => {
          const party = parties.find((p: any) => p.id === r.party_id);
          const fraternity = party ? fraternities.find((f: any) => f.id === party.fraternity_id) : null;
          return { ...r, party: party ?? undefined, fraternity: fraternity ?? undefined };
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
        setCommentsData([...enrichedPartyComments, ...enrichedFratComments].sort((a, b) => 
          new Date(b.created_date).getTime() - new Date(a.created_date).getTime()
        ));

        setStats({
          partyRatings: partyRatings.length,
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

  const handleRatingSubmit = () => {
    setEditingRating(null);
    loadProfile();
  };

  const handleDeleteRating = async (ratingId: string) => {
    try {
      await base44.entities.PartyRating.delete(ratingId);
      loadProfile();
    } catch (error) {
      console.error('Failed to delete rating:', error);
    }
    setDeletingRatingId(null);
  };

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <Skeleton className="h-48 rounded-xl" />
        <div className="grid grid-cols-2 gap-4">
          {[1, 2].map((i) => (
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
            <h1 className="text-2xl font-bold">Welcome to taus</h1>
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
                <div className="text-center py-8 space-y-2">
                  <PartyPopper className="h-12 w-12 mx-auto text-muted-foreground/50" />
                  <p className="text-muted-foreground">You haven't rated any parties yet.</p>
                </div>
              ) : (
                partyRatingsData.map((rating) => (
                  <div key={rating.id} className="p-3 rounded-lg bg-muted/30 space-y-2">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <PartyPopper className="h-4 w-4 text-primary" />
                          <span className="font-medium">{rating.party?.title || 'Party'}</span>
                        </div>
                        {rating.fraternity && (
                          <p className="text-sm text-muted-foreground">
                            {rating.fraternity.name} {rating.fraternity.chapter ? `• ${rating.fraternity.chapter}` : ''}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={`${getScoreBgColor(rating.party_quality_score ?? 0)} text-white`}>
                          {(rating.party_quality_score ?? 0).toFixed(1)}
                        </Badge>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8"
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingRating(rating);
                          }}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <AlertDialog open={deletingRatingId === rating.id} onOpenChange={(open) => setDeletingRatingId(open ? rating.id : null)}>
                          <AlertDialogTrigger asChild>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8 text-destructive hover:text-destructive"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Rating?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete your rating for "{rating.party?.title || 'this party'}"? This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction 
                                onClick={() => handleDeleteRating(rating.id)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-1 text-xs">
                        <Zap className="h-3.5 w-3.5 text-amber-500" />
                        <span>{(rating.vibe_score ?? 0).toFixed(1)}</span>
                      </div>
                      <div className="flex items-center gap-1 text-xs">
                        <Music className="h-3.5 w-3.5 text-blue-500" />
                        <span>{(rating.music_score ?? 0).toFixed(1)}</span>
                      </div>
                      <div className="flex items-center gap-1 text-xs">
                        <Settings className="h-3.5 w-3.5 text-green-500" />
                        <span>{(rating.execution_score ?? 0).toFixed(1)}</span>
                      </div>
                    </div>

                    <p className="text-xs text-muted-foreground">
                      {formatTimeAgo(rating.created_date)}
                    </p>
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

      {/* Party Rating Edit Modal */}
      {editingRating && editingRating.party && (
        <PartyRatingForm
          party={editingRating.party}
          fraternity={editingRating.fraternity}
          onClose={() => setEditingRating(null)}
          onSubmit={handleRatingSubmit}
        />
      )}
    </div>
  );
}