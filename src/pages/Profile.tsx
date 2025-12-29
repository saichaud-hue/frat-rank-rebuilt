import { useState, useEffect } from 'react';
import { User, PartyPopper, Star, LogIn, Award, ChevronDown, ChevronUp, Pencil, Trash2, Zap, Music, Settings, Trophy, Users, Shield, Heart } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { base44, type PartyRating, type ReputationRating, type Party, type Fraternity } from '@/api/base44Client';
import { format } from 'date-fns';
import { formatTimeAgo, getScoreBgColor } from '@/utils';
import PartyRatingForm from '@/components/rate/PartyRatingForm';
import RateFratSheet from '@/components/leaderboard/RateFratSheet';

type EnrichedPartyRating = PartyRating & { party?: Party; fraternity?: Fraternity };
type EnrichedRepRating = ReputationRating & { fraternity?: Fraternity };

export default function Profile() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ partyRatings: 0, fratRatings: 0, comments: 0 });
  const [partyRatingsData, setPartyRatingsData] = useState<EnrichedPartyRating[]>([]);
  const [fratRatingsData, setFratRatingsData] = useState<EnrichedRepRating[]>([]);
  const [commentsData, setCommentsData] = useState<any[]>([]);
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  
  // Edit/Delete state for party ratings
  const [editingPartyRating, setEditingPartyRating] = useState<EnrichedPartyRating | null>(null);
  const [deletingPartyRatingId, setDeletingPartyRatingId] = useState<string | null>(null);
  
  // Edit/Delete state for frat ratings
  const [editingFratRating, setEditingFratRating] = useState<EnrichedRepRating | null>(null);
  const [deletingFratRatingId, setDeletingFratRatingId] = useState<string | null>(null);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const userData = await base44.auth.me();
      setUser(userData);

      if (userData) {
        const [partyRatings, repRatings, partyComments, fratComments, parties, fraternities] = await Promise.all([
          base44.entities.PartyRating.filter({ user_id: userData.id }, '-created_date'),
          base44.entities.ReputationRating.filter({ user_id: userData.id }, '-created_date'),
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

        // Enrich frat ratings with fraternity data
        const enrichedFratRatings = repRatings.map((r: any) => {
          const fraternity = fraternities.find((f: any) => f.id === r.fraternity_id);
          return { ...r, fraternity: fraternity ?? undefined };
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
        setFratRatingsData(enrichedFratRatings);
        setCommentsData([...enrichedPartyComments, ...enrichedFratComments].sort((a, b) => 
          new Date(b.created_date).getTime() - new Date(a.created_date).getTime()
        ));

        setStats({
          partyRatings: partyRatings.length,
          fratRatings: repRatings.length,
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

  const handlePartyRatingSubmit = () => {
    setEditingPartyRating(null);
    loadProfile();
  };

  const handleDeletePartyRating = async (ratingId: string) => {
    try {
      await base44.entities.PartyRating.delete(ratingId);
      loadProfile();
    } catch (error) {
      console.error('Failed to delete rating:', error);
    }
    setDeletingPartyRatingId(null);
  };

  const handleFratRatingSubmit = async (scores: { brotherhood: number; reputation: number; community: number; combined: number }) => {
    if (!editingFratRating) return;
    
    try {
      await base44.entities.ReputationRating.update(editingFratRating.id, {
        brotherhood_score: scores.brotherhood,
        reputation_score: scores.reputation,
        community_score: scores.community,
        combined_score: scores.combined,
      });
      
      // Recalculate fraternity reputation score
      if (editingFratRating.fraternity_id) {
        const allRepRatings = await base44.entities.ReputationRating.filter({
          fraternity_id: editingFratRating.fraternity_id
        });
        
        const avgReputation = allRepRatings.length > 0
          ? allRepRatings.reduce((sum, r) => sum + (r.combined_score ?? 5), 0) / allRepRatings.length
          : 5;
        
        await base44.entities.Fraternity.update(editingFratRating.fraternity_id, {
          reputation_score: Math.min(10, Math.max(0, avgReputation)),
        });
      }
      
      setEditingFratRating(null);
      loadProfile();
    } catch (error) {
      console.error('Failed to update frat rating:', error);
    }
  };

  const handleDeleteFratRating = async (ratingId: string, fraternityId?: string) => {
    try {
      await base44.entities.ReputationRating.delete(ratingId);
      
      // Recalculate fraternity reputation score after deletion
      if (fraternityId) {
        const allRepRatings = await base44.entities.ReputationRating.filter({
          fraternity_id: fraternityId
        });
        
        const avgReputation = allRepRatings.length > 0
          ? allRepRatings.reduce((sum, r) => sum + (r.combined_score ?? 5), 0) / allRepRatings.length
          : 5;
        
        await base44.entities.Fraternity.update(fraternityId, {
          reputation_score: Math.min(10, Math.max(0, avgReputation)),
        });
      }
      
      loadProfile();
    } catch (error) {
      console.error('Failed to delete frat rating:', error);
    }
    setDeletingFratRatingId(null);
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
                            setEditingPartyRating(rating);
                          }}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <AlertDialog open={deletingPartyRatingId === rating.id} onOpenChange={(open) => setDeletingPartyRatingId(open ? rating.id : null)}>
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
                                onClick={() => handleDeletePartyRating(rating.id)}
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

        {/* Frat Ratings */}
        <Collapsible open={expandedSection === 'fratRatings'} onOpenChange={(open) => setExpandedSection(open ? 'fratRatings' : null)}>
          <CollapsibleTrigger asChild>
            <Card className="glass p-4 cursor-pointer hover:bg-muted/50 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Trophy className="h-6 w-6 text-amber-500" />
                  <div>
                    <p className="text-2xl font-bold">{stats.fratRatings}</p>
                    <p className="text-xs text-muted-foreground">Frat Ratings</p>
                  </div>
                </div>
                {expandedSection === 'fratRatings' ? <ChevronUp className="h-5 w-5 text-muted-foreground" /> : <ChevronDown className="h-5 w-5 text-muted-foreground" />}
              </div>
            </Card>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <Card className="glass mt-2 p-4 space-y-3">
              {fratRatingsData.length === 0 ? (
                <div className="text-center py-8 space-y-2">
                  <Trophy className="h-12 w-12 mx-auto text-muted-foreground/50" />
                  <p className="text-muted-foreground">You haven't rated any fraternities yet.</p>
                </div>
              ) : (
                fratRatingsData.map((rating) => (
                  <div key={rating.id} className="p-3 rounded-lg bg-muted/30 space-y-2">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <Trophy className="h-4 w-4 text-amber-500" />
                          <span className="font-medium">{rating.fraternity?.name || 'Fraternity'}</span>
                        </div>
                        {rating.fraternity?.chapter && (
                          <p className="text-sm text-muted-foreground">
                            {rating.fraternity.chapter}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={`${getScoreBgColor(rating.combined_score ?? 0)} text-white`}>
                          {(rating.combined_score ?? 0).toFixed(1)}
                        </Badge>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8"
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingFratRating(rating);
                          }}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <AlertDialog open={deletingFratRatingId === rating.id} onOpenChange={(open) => setDeletingFratRatingId(open ? rating.id : null)}>
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
                                Are you sure you want to delete your rating for "{rating.fraternity?.name || 'this fraternity'}"? This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction 
                                onClick={() => handleDeleteFratRating(rating.id, rating.fraternity_id)}
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
                        <Users className="h-3.5 w-3.5 text-blue-500" />
                        <span>{(rating.brotherhood_score ?? 0).toFixed(1)}</span>
                      </div>
                      <div className="flex items-center gap-1 text-xs">
                        <Shield className="h-3.5 w-3.5 text-primary" />
                        <span>{(rating.reputation_score ?? 0).toFixed(1)}</span>
                      </div>
                      <div className="flex items-center gap-1 text-xs">
                        <Heart className="h-3.5 w-3.5 text-rose-500" />
                        <span>{(rating.community_score ?? 0).toFixed(1)}</span>
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

      {/* Party Rating Edit Modal */}
      {editingPartyRating && editingPartyRating.party && (
        <PartyRatingForm
          party={editingPartyRating.party}
          fraternity={editingPartyRating.fraternity}
          onClose={() => setEditingPartyRating(null)}
          onSubmit={handlePartyRatingSubmit}
        />
      )}

      {/* Frat Rating Edit Sheet */}
      {editingFratRating && editingFratRating.fraternity && (
        <RateFratSheet
          fraternity={editingFratRating.fraternity}
          isOpen={!!editingFratRating}
          onClose={() => setEditingFratRating(null)}
          onSubmit={handleFratRatingSubmit}
          existingScores={{
            brotherhood: editingFratRating.brotherhood_score ?? 5,
            reputation: editingFratRating.reputation_score ?? 5,
            community: editingFratRating.community_score ?? 5,
          }}
        />
      )}
    </div>
  );
}