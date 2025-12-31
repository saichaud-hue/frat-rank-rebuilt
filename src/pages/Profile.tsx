import { useState, useEffect } from 'react';
import { User, PartyPopper, Star, LogIn, Award, ChevronDown, ChevronUp, Pencil, Trash2, Zap, Music, Settings, Trophy, Users, Shield, Heart, Sparkles, TrendingUp, Crown, MessageCircle, Flame } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { base44, type PartyRating, type ReputationRating, type Party, type Fraternity } from '@/api/base44Client';
import { format } from 'date-fns';
import { formatTimeAgo, getScoreBgColor, getScoreColor } from '@/utils';
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
  
  // Delete state for comments
  const [deletingCommentId, setDeletingCommentId] = useState<string | null>(null);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const userData = await base44.auth.me();
      setUser(userData);

      if (userData) {
        const [partyRatings, repRatings, partyComments, fratComments, chatMessages, parties, fraternities] = await Promise.all([
          base44.entities.PartyRating.filter({ user_id: userData.id }, '-created_date'),
          base44.entities.ReputationRating.filter({ user_id: userData.id }, '-created_date'),
          base44.entities.PartyComment.filter({ user_id: userData.id }),
          base44.entities.FraternityComment.filter({ user_id: userData.id }),
          base44.entities.ChatMessage.filter({ user_id: userData.id }),
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
        const enrichedChatMessages = chatMessages.map((c: any) => {
          const mentionedParty = c.mentioned_party_id ? parties.find((p: any) => p.id === c.mentioned_party_id) : null;
          const mentionedFrat = c.mentioned_fraternity_id ? fraternities.find((f: any) => f.id === c.mentioned_fraternity_id) : null;
          const entityName = mentionedParty?.title || mentionedFrat?.name || 'Chat';
          return { ...c, entityName, type: 'chat' };
        });

        setPartyRatingsData(enrichedPartyRatings);
        setFratRatingsData(enrichedFratRatings);
        setCommentsData([...enrichedPartyComments, ...enrichedFratComments, ...enrichedChatMessages].sort((a, b) => 
          new Date(b.created_date).getTime() - new Date(a.created_date).getTime()
        ));

        setStats({
          partyRatings: partyRatings.length,
          fratRatings: repRatings.length,
          comments: partyComments.length + fratComments.length + chatMessages.length,
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

  const handleDeleteComment = async (comment: any) => {
    try {
      if (comment.type === 'party') {
        await base44.entities.PartyComment.delete(comment.id);
      } else if (comment.type === 'fraternity') {
        await base44.entities.FraternityComment.delete(comment.id);
      } else if (comment.type === 'chat') {
        await base44.entities.ChatMessage.delete(comment.id);
      }
      setCommentsData(prev => prev.filter(c => c.id !== comment.id));
      setStats(prev => ({ ...prev, comments: prev.comments - 1 }));
    } catch (error) {
      console.error('Failed to delete comment:', error);
    }
    setDeletingCommentId(null);
  };

  // Calculate level from points
  const getLevel = (points: number) => {
    if (points >= 500) return { level: 5, title: 'Legend', color: 'from-amber-400 to-yellow-500', next: null };
    if (points >= 200) return { level: 4, title: 'Expert', color: 'from-purple-500 to-violet-600', next: 500 };
    if (points >= 100) return { level: 3, title: 'Regular', color: 'from-blue-500 to-cyan-500', next: 200 };
    if (points >= 25) return { level: 2, title: 'Active', color: 'from-emerald-500 to-teal-500', next: 100 };
    return { level: 1, title: 'Newbie', color: 'from-slate-400 to-slate-500', next: 25 };
  };

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <Skeleton className="h-64 rounded-3xl" />
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
      <div className="max-w-2xl mx-auto space-y-5 pb-20">
        {/* Hero for logged out users */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-violet-600 via-purple-600 to-indigo-700 p-8 text-white shadow-xl">
          <div className="absolute inset-0 opacity-20">
            <div className="absolute top-0 right-0 w-40 h-40 bg-white/30 rounded-full blur-3xl translate-x-10 -translate-y-10" />
            <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/30 rounded-full blur-3xl -translate-x-10 translate-y-10" />
          </div>
          
          <div className="relative text-center space-y-6">
            <div className="w-24 h-24 mx-auto rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
              <User className="h-12 w-12" />
            </div>
            <div>
              <h1 className="text-3xl font-bold mb-2">Welcome to Touse</h1>
              <p className="text-white/80">Sign in to track your ratings, earn points, and level up!</p>
            </div>
            <Button onClick={handleLogin} size="lg" className="bg-white text-purple-600 hover:bg-white/90 font-semibold">
              <LogIn className="h-5 w-5 mr-2" />
              Sign in with Google
            </Button>
          </div>
        </div>

        {/* Features Preview */}
        <div className="grid grid-cols-3 gap-3">
          <Card className="glass p-4 text-center">
            <div className="w-12 h-12 mx-auto mb-2 rounded-xl bg-pink-100 flex items-center justify-center">
              <PartyPopper className="h-6 w-6 text-pink-600" />
            </div>
            <p className="text-sm font-medium">Rate Parties</p>
          </Card>
          <Card className="glass p-4 text-center">
            <div className="w-12 h-12 mx-auto mb-2 rounded-xl bg-amber-100 flex items-center justify-center">
              <Trophy className="h-6 w-6 text-amber-600" />
            </div>
            <p className="text-sm font-medium">Rate Frats</p>
          </Card>
          <Card className="glass p-4 text-center">
            <div className="w-12 h-12 mx-auto mb-2 rounded-xl bg-emerald-100 flex items-center justify-center">
              <Sparkles className="h-6 w-6 text-emerald-600" />
            </div>
            <p className="text-sm font-medium">Earn Points</p>
          </Card>
        </div>
      </div>
    );
  }

  const points = user.points || 0;
  const levelInfo = getLevel(points);
  const progressToNext = levelInfo.next ? (points / levelInfo.next) * 100 : 100;

  return (
    <div className="max-w-2xl mx-auto space-y-5 pb-20">
      {/* HERO PROFILE CARD */}
      <div className={`relative overflow-hidden rounded-3xl bg-gradient-to-br ${levelInfo.color} p-6 text-white shadow-xl`}>
        {/* Background Effects */}
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-0 right-0 w-40 h-40 bg-white/30 rounded-full blur-3xl translate-x-10 -translate-y-10" />
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/30 rounded-full blur-3xl -translate-x-10 translate-y-10" />
        </div>

        <div className="relative">
          {/* Profile Header */}
          <div className="flex items-start gap-4 mb-5">
            <div className="relative">
              <Avatar className="h-20 w-20 ring-4 ring-white/30">
                <AvatarImage src={user.avatar_url} />
                <AvatarFallback className="bg-white/20 text-white text-2xl font-bold">
                  {user.name?.charAt(0) || 'U'}
                </AvatarFallback>
              </Avatar>
              {levelInfo.level >= 4 && (
                <div className="absolute -top-1 -right-1 w-7 h-7 rounded-full bg-amber-400 flex items-center justify-center shadow-lg">
                  <Crown className="h-4 w-4 text-amber-900" />
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl font-bold truncate">{user.name}</h1>
              <p className="text-white/80 text-sm truncate">{user.email}</p>
              <div className="flex items-center gap-2 mt-2">
                <Badge className="bg-white/20 text-white border-white/30 font-semibold">
                  Lvl {levelInfo.level} • {levelInfo.title}
                </Badge>
              </div>
            </div>
          </div>

          {/* Points & Level Progress */}
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Award className="h-5 w-5" />
                <span className="font-bold text-lg">{points} points</span>
              </div>
              {levelInfo.next && (
                <span className="text-sm text-white/80">{levelInfo.next - points} to next level</span>
              )}
            </div>
            <div className="h-2.5 bg-white/20 rounded-full overflow-hidden">
              <div 
                className="h-full bg-white rounded-full transition-all duration-700"
                style={{ width: `${Math.min(progressToNext, 100)}%` }}
              />
            </div>
          </div>

          {/* Streak & Rank Stats */}
          <div className="grid grid-cols-2 gap-3 mt-4">
            <div className="p-4 rounded-xl bg-white/10 backdrop-blur-sm">
              <div className="flex items-center gap-2 mb-1">
                <Trophy className="h-4 w-4 opacity-80" />
                <span className="text-xs opacity-80">Rank on Touse</span>
              </div>
              <p className="text-2xl font-bold">#{user.rank || '—'}</p>
            </div>
            <div className="p-4 rounded-xl bg-white/10 backdrop-blur-sm">
              <div className="flex items-center gap-2 mb-1">
                <Flame className="h-4 w-4 opacity-80" />
                <span className="text-xs opacity-80">Current Streak</span>
              </div>
              <p className="text-2xl font-bold">{user.streak || 0} <span className="text-sm font-normal opacity-80">days</span></p>
            </div>
          </div>
        </div>
      </div>

      {/* ACTIVITY SECTIONS */}
      <div className="space-y-3">
        {/* Party Ratings Section */}
        <Collapsible open={expandedSection === 'partyRatings'} onOpenChange={(open) => setExpandedSection(open ? 'partyRatings' : null)}>
          <CollapsibleTrigger asChild>
            <Card className="glass overflow-hidden cursor-pointer hover:shadow-md transition-all">
              <div className="bg-gradient-to-r from-pink-500 to-rose-500 p-4 flex items-center justify-between text-white">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                    <PartyPopper className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{stats.partyRatings}</p>
                    <p className="text-xs opacity-80">Party Ratings</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {stats.partyRatings > 5 && (
                    <Badge className="bg-white/20 text-white border-white/30">🔥 Active Rater</Badge>
                  )}
                  {expandedSection === 'partyRatings' ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                </div>
              </div>
            </Card>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <Card className="glass mt-2 overflow-hidden">
              {partyRatingsData.length === 0 ? (
                <div className="p-8 text-center space-y-3">
                  <div className="w-16 h-16 mx-auto rounded-2xl bg-pink-100 flex items-center justify-center">
                    <PartyPopper className="h-8 w-8 text-pink-400" />
                  </div>
                  <p className="text-muted-foreground font-medium">No party ratings yet</p>
                  <p className="text-sm text-muted-foreground/70">Rate parties to see them here!</p>
                </div>
              ) : (
                <div className="divide-y divide-border/50">
                  {partyRatingsData.map((rating) => (
                    <div key={rating.id} className="p-4 hover:bg-muted/30 transition-colors">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-pink-100 to-rose-100 flex items-center justify-center flex-shrink-0">
                            <PartyPopper className="h-5 w-5 text-pink-600" />
                          </div>
                          <div>
                            <p className="font-semibold">{rating.party?.title || 'Party'}</p>
                            {rating.fraternity && (
                              <p className="text-sm text-muted-foreground">
                                {rating.fraternity.name} {rating.fraternity.chapter ? `• ${rating.fraternity.chapter}` : ''}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <Badge className={`${getScoreBgColor(rating.party_quality_score ?? 0)} text-white font-bold`}>
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
                            <AlertDialogContent className="bg-background">
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Rating?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete your rating for "{rating.party?.title || 'this party'}"?
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

                      <div className="flex items-center gap-4 ml-13">
                        <div className="flex items-center gap-1.5 text-sm">
                          <div className="w-6 h-6 rounded-full bg-amber-100 flex items-center justify-center">
                            <Zap className="h-3.5 w-3.5 text-amber-600" />
                          </div>
                          <span className={getScoreColor(rating.vibe_score ?? 0)}>{(rating.vibe_score ?? 0).toFixed(1)}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-sm">
                          <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center">
                            <Music className="h-3.5 w-3.5 text-blue-600" />
                          </div>
                          <span className={getScoreColor(rating.music_score ?? 0)}>{(rating.music_score ?? 0).toFixed(1)}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-sm">
                          <div className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center">
                            <Settings className="h-3.5 w-3.5 text-emerald-600" />
                          </div>
                          <span className={getScoreColor(rating.execution_score ?? 0)}>{(rating.execution_score ?? 0).toFixed(1)}</span>
                        </div>
                        <span className="text-xs text-muted-foreground ml-auto">
                          {formatTimeAgo(rating.created_date)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </CollapsibleContent>
        </Collapsible>

        {/* Frat Ratings Section */}
        <Collapsible open={expandedSection === 'fratRatings'} onOpenChange={(open) => setExpandedSection(open ? 'fratRatings' : null)}>
          <CollapsibleTrigger asChild>
            <Card className="glass overflow-hidden cursor-pointer hover:shadow-md transition-all">
              <div className="bg-gradient-to-r from-amber-500 to-orange-500 p-4 flex items-center justify-between text-white">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                    <Trophy className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{stats.fratRatings}</p>
                    <p className="text-xs opacity-80">Frat Ratings</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {stats.fratRatings >= 10 && (
                    <Badge className="bg-white/20 text-white border-white/30">👑 Expert</Badge>
                  )}
                  {expandedSection === 'fratRatings' ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                </div>
              </div>
            </Card>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <Card className="glass mt-2 overflow-hidden">
              {fratRatingsData.length === 0 ? (
                <div className="p-8 text-center space-y-3">
                  <div className="w-16 h-16 mx-auto rounded-2xl bg-amber-100 flex items-center justify-center">
                    <Trophy className="h-8 w-8 text-amber-400" />
                  </div>
                  <p className="text-muted-foreground font-medium">No frat ratings yet</p>
                  <p className="text-sm text-muted-foreground/70">Rate fraternities to see them here!</p>
                </div>
              ) : (
                <div className="divide-y divide-border/50">
                  {fratRatingsData.map((rating) => (
                    <div key={rating.id} className="p-4 hover:bg-muted/30 transition-colors">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-100 to-orange-100 flex items-center justify-center flex-shrink-0">
                            <Trophy className="h-5 w-5 text-amber-600" />
                          </div>
                          <div>
                            <p className="font-semibold">{rating.fraternity?.name || 'Fraternity'}</p>
                            {rating.fraternity?.chapter && (
                              <p className="text-sm text-muted-foreground">{rating.fraternity.chapter}</p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <Badge className={`${getScoreBgColor(rating.combined_score ?? 0)} text-white font-bold`}>
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
                            <AlertDialogContent className="bg-background">
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Rating?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete your rating for "{rating.fraternity?.name || 'this fraternity'}"?
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

                      <div className="flex items-center gap-4 ml-13">
                        <div className="flex items-center gap-1.5 text-sm">
                          <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center">
                            <Users className="h-3.5 w-3.5 text-blue-600" />
                          </div>
                          <span className={getScoreColor(rating.brotherhood_score ?? 0)}>{(rating.brotherhood_score ?? 0).toFixed(1)}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-sm">
                          <div className="w-6 h-6 rounded-full bg-violet-100 flex items-center justify-center">
                            <Shield className="h-3.5 w-3.5 text-violet-600" />
                          </div>
                          <span className={getScoreColor(rating.reputation_score ?? 0)}>{(rating.reputation_score ?? 0).toFixed(1)}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-sm">
                          <div className="w-6 h-6 rounded-full bg-rose-100 flex items-center justify-center">
                            <Heart className="h-3.5 w-3.5 text-rose-600" />
                          </div>
                          <span className={getScoreColor(rating.community_score ?? 0)}>{(rating.community_score ?? 0).toFixed(1)}</span>
                        </div>
                        <span className="text-xs text-muted-foreground ml-auto">
                          {formatTimeAgo(rating.created_date)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </CollapsibleContent>
        </Collapsible>

        {/* Comments Section */}
        <Collapsible open={expandedSection === 'comments'} onOpenChange={(open) => setExpandedSection(open ? 'comments' : null)}>
          <CollapsibleTrigger asChild>
            <Card className="glass overflow-hidden cursor-pointer hover:shadow-md transition-all">
              <div className="bg-gradient-to-r from-indigo-500 to-purple-500 p-4 flex items-center justify-between text-white">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                    <MessageCircle className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{stats.comments}</p>
                    <p className="text-xs opacity-80">Comments</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {stats.comments >= 10 && (
                    <Badge className="bg-white/20 text-white border-white/30">💬 Social</Badge>
                  )}
                  {expandedSection === 'comments' ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                </div>
              </div>
            </Card>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <Card className="glass mt-2 overflow-hidden">
              {commentsData.length === 0 ? (
                <div className="p-8 text-center space-y-3">
                  <div className="w-16 h-16 mx-auto rounded-2xl bg-indigo-100 flex items-center justify-center">
                    <MessageCircle className="h-8 w-8 text-indigo-400" />
                  </div>
                  <p className="text-muted-foreground font-medium">No comments yet</p>
                  <p className="text-sm text-muted-foreground/70">Join the conversation!</p>
                </div>
              ) : (
                <div className="divide-y divide-border/50">
                  {commentsData.map((comment) => (
                    <div key={comment.id} className="p-4 hover:bg-muted/30 transition-colors">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-start gap-3">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                            comment.type === 'party' ? 'bg-pink-100' : 
                            comment.type === 'fraternity' ? 'bg-amber-100' : 'bg-indigo-100'
                          }`}>
                            {comment.type === 'party' ? <PartyPopper className="h-5 w-5 text-pink-600" /> :
                             comment.type === 'fraternity' ? <Trophy className="h-5 w-5 text-amber-600" /> :
                             <MessageCircle className="h-5 w-5 text-indigo-600" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold truncate">{comment.entityName}</p>
                            <p className="text-sm text-foreground line-clamp-2 mt-0.5">{comment.text}</p>
                            <p className="text-xs text-muted-foreground mt-1">{format(new Date(comment.created_date), 'MMM d, yyyy')}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <Badge variant="outline" className={`text-xs capitalize ${
                            comment.type === 'party' ? 'border-pink-200 text-pink-600 bg-pink-50' : 
                            comment.type === 'fraternity' ? 'border-amber-200 text-amber-600 bg-amber-50' : 
                            'border-indigo-200 text-indigo-600 bg-indigo-50'
                          }`}>
                            {comment.type}
                          </Badge>
                          <AlertDialog open={deletingCommentId === comment.id} onOpenChange={(open) => setDeletingCommentId(open ? comment.id : null)}>
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
                            <AlertDialogContent className="bg-background">
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete this comment?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction 
                                  onClick={() => handleDeleteComment(comment)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
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