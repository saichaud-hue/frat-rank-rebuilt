import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { User, PartyPopper, LogIn, Award, ChevronRight, Pencil, Trash2, Trophy, MessageCircle, Flame, Image, Lock, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { base44, type PartyRating, type ReputationRating, type Party, type Fraternity, type PartyPhoto } from '@/api/base44Client';
import { format } from 'date-fns';
import { formatTimeAgo, getScoreBgColor } from '@/utils';
import PartyRatingForm from '@/components/rate/PartyRatingForm';
import RateFratSheet from '@/components/leaderboard/RateFratSheet';

type EnrichedPartyRating = PartyRating & { party?: Party; fraternity?: Fraternity };
type EnrichedRepRating = ReputationRating & { fraternity?: Fraternity };
type EnrichedPhoto = PartyPhoto & { party?: Party; fraternity?: Fraternity };

export default function Profile() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ partyRatings: 0, fratRatings: 0, comments: 0, privatePhotos: 0 });
  const [partyRatingsData, setPartyRatingsData] = useState<EnrichedPartyRating[]>([]);
  const [fratRatingsData, setFratRatingsData] = useState<EnrichedRepRating[]>([]);
  const [commentsData, setCommentsData] = useState<any[]>([]);
  const [privatePhotos, setPrivatePhotos] = useState<EnrichedPhoto[]>([]);
  const [activeTab, setActiveTab] = useState<'parties' | 'frats' | 'comments' | 'photos'>('parties');
  const [viewingPhoto, setViewingPhoto] = useState<EnrichedPhoto | null>(null);
  const [deletingPhotoId, setDeletingPhotoId] = useState<string | null>(null);
  
  const [editingPartyRating, setEditingPartyRating] = useState<EnrichedPartyRating | null>(null);
  const [deletingPartyRatingId, setDeletingPartyRatingId] = useState<string | null>(null);
  const [editingFratRating, setEditingFratRating] = useState<EnrichedRepRating | null>(null);
  const [deletingFratRatingId, setDeletingFratRatingId] = useState<string | null>(null);
  const [deletingCommentId, setDeletingCommentId] = useState<string | null>(null);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const userData = await base44.auth.me();
      setUser(userData);

      if (userData) {
        const [partyRatings, repRatings, partyComments, fratComments, chatMessages, parties, fraternities, allPhotos] = await Promise.all([
          base44.entities.PartyRating.filter({ user_id: userData.id }, '-created_date'),
          base44.entities.ReputationRating.filter({ user_id: userData.id }, '-created_date'),
          base44.entities.PartyComment.filter({ user_id: userData.id }),
          base44.entities.FraternityComment.filter({ user_id: userData.id }),
          base44.entities.ChatMessage.filter({ user_id: userData.id }),
          base44.entities.Party.list(),
          base44.entities.Fraternity.list(),
          base44.entities.PartyPhoto.filter({ user_id: userData.id }, '-created_date'),
        ]);

        const userPrivatePhotos = allPhotos.filter((p: any) => p.visibility === 'private');
        const enrichedPrivatePhotos = userPrivatePhotos.map((photo: any) => {
          const party = parties.find((p: any) => p.id === photo.party_id);
          const fraternity = party ? fraternities.find((f: any) => f.id === party.fraternity_id) : null;
          return { ...photo, party: party ?? undefined, fraternity: fraternity ?? undefined };
        });
        setPrivatePhotos(enrichedPrivatePhotos);

        const enrichedPartyRatings = partyRatings.map((r: any) => {
          const party = parties.find((p: any) => p.id === r.party_id);
          const fraternity = party ? fraternities.find((f: any) => f.id === party.fraternity_id) : null;
          return { ...r, party: party ?? undefined, fraternity: fraternity ?? undefined };
        });

        const enrichedFratRatings = repRatings.map((r: any) => {
          const fraternity = fraternities.find((f: any) => f.id === r.fraternity_id);
          return { ...r, fraternity: fraternity ?? undefined };
        });

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
          privatePhotos: enrichedPrivatePhotos.length,
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

  const getLevel = (points: number) => {
    if (points >= 500) return { level: 5, title: 'Legend', next: null };
    if (points >= 200) return { level: 4, title: 'Expert', next: 500 };
    if (points >= 100) return { level: 3, title: 'Regular', next: 200 };
    if (points >= 25) return { level: 2, title: 'Active', next: 100 };
    return { level: 1, title: 'Newbie', next: 25 };
  };

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto space-y-4 p-4">
        <Skeleton className="h-40 rounded-2xl" />
        <div className="grid grid-cols-4 gap-2">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-16 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-64 rounded-2xl" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="max-w-md mx-auto p-4 space-y-6">
        <div className="text-center space-y-4 py-12">
          <div className="w-20 h-20 mx-auto rounded-full bg-muted flex items-center justify-center">
            <User className="h-10 w-10 text-muted-foreground" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Welcome to Touse</h1>
            <p className="text-muted-foreground mt-1">Sign in to track your ratings and earn points</p>
          </div>
          <Button onClick={handleLogin} size="lg" className="w-full">
            <LogIn className="h-5 w-5 mr-2" />
            Sign in with Google
          </Button>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="p-4 rounded-xl bg-muted text-center">
            <PartyPopper className="h-6 w-6 mx-auto mb-2 text-primary" />
            <p className="text-xs font-medium">Rate Parties</p>
          </div>
          <div className="p-4 rounded-xl bg-muted text-center">
            <Trophy className="h-6 w-6 mx-auto mb-2 text-primary" />
            <p className="text-xs font-medium">Rate Frats</p>
          </div>
          <div className="p-4 rounded-xl bg-muted text-center">
            <Award className="h-6 w-6 mx-auto mb-2 text-primary" />
            <p className="text-xs font-medium">Earn Points</p>
          </div>
        </div>
      </div>
    );
  }

  const points = user.points || 0;
  const levelInfo = getLevel(points);
  const progressToNext = levelInfo.next ? (points / levelInfo.next) * 100 : 100;

  const tabs = [
    { id: 'parties', label: 'Parties', count: stats.partyRatings, icon: PartyPopper },
    { id: 'frats', label: 'Frats', count: stats.fratRatings, icon: Trophy },
    { id: 'comments', label: 'Comments', count: stats.comments, icon: MessageCircle },
    { id: 'photos', label: 'Photos', count: stats.privatePhotos, icon: Lock },
  ] as const;

  return (
    <div className="max-w-2xl mx-auto space-y-4 pb-20">
      {/* Profile Header */}
      <div className="p-5 rounded-2xl bg-muted/50">
        <div className="flex items-center gap-4">
          <Avatar className="h-16 w-16 ring-2 ring-border">
            <AvatarImage src={user.avatar_url} />
            <AvatarFallback className="text-xl font-bold bg-primary text-primary-foreground">
              {user.name?.charAt(0) || 'U'}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold truncate">{user.name}</h1>
            <p className="text-sm text-muted-foreground truncate">{user.email}</p>
            <div className="flex items-center gap-3 mt-2">
              <Badge variant="secondary" className="font-medium">
                Lvl {levelInfo.level} · {levelInfo.title}
              </Badge>
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <Flame className="h-4 w-4 text-orange-500" />
                <span>{user.streak || 0}d</span>
              </div>
            </div>
          </div>
        </div>

        {/* Points Progress */}
        <div className="mt-4 p-3 rounded-xl bg-background">
          <div className="flex items-center justify-between text-sm mb-2">
            <div className="flex items-center gap-2">
              <Award className="h-4 w-4 text-primary" />
              <span className="font-semibold">{points} pts</span>
            </div>
            {levelInfo.next && (
              <span className="text-muted-foreground">{levelInfo.next - points} to level up</span>
            )}
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div 
              className="h-full bg-primary rounded-full transition-all duration-500"
              style={{ width: `${Math.min(progressToNext, 100)}%` }}
            />
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-2 overflow-x-auto no-scrollbar">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
              activeTab === tab.id 
                ? 'bg-primary text-primary-foreground' 
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
          >
            <tab.icon className="h-4 w-4" />
            <span>{tab.label}</span>
            <span className={`text-xs px-1.5 py-0.5 rounded-full ${
              activeTab === tab.id ? 'bg-primary-foreground/20' : 'bg-background'
            }`}>
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Content Area */}
      <div className="rounded-2xl bg-muted/30 overflow-hidden">
        {/* Party Ratings Tab */}
        {activeTab === 'parties' && (
          <div>
            {partyRatingsData.length === 0 ? (
              <div className="p-8 text-center">
                <PartyPopper className="h-10 w-10 mx-auto mb-3 text-muted-foreground/50" />
                <p className="text-muted-foreground">No party ratings yet</p>
              </div>
            ) : (
              <div className="divide-y divide-border/50">
                {partyRatingsData.map((rating) => (
                  <div key={rating.id} className="p-4 flex items-center gap-3 hover:bg-muted/50 transition-colors">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{rating.party?.title || 'Party'}</p>
                      <p className="text-xs text-muted-foreground">
                        {rating.fraternity?.name} · {formatTimeAgo(rating.created_date)}
                      </p>
                    </div>
                    <Badge className={`${getScoreBgColor(rating.party_quality_score ?? 0)} text-white`}>
                      {(rating.party_quality_score ?? 0).toFixed(1)}
                    </Badge>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8"
                      onClick={() => setEditingPartyRating(rating)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <AlertDialog open={deletingPartyRatingId === rating.id} onOpenChange={(open) => setDeletingPartyRatingId(open ? rating.id : null)}>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Rating?</AlertDialogTitle>
                          <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDeletePartyRating(rating.id)} className="bg-destructive text-destructive-foreground">
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Frat Ratings Tab */}
        {activeTab === 'frats' && (
          <div>
            {fratRatingsData.length === 0 ? (
              <div className="p-8 text-center">
                <Trophy className="h-10 w-10 mx-auto mb-3 text-muted-foreground/50" />
                <p className="text-muted-foreground">No frat ratings yet</p>
              </div>
            ) : (
              <div className="divide-y divide-border/50">
                {fratRatingsData.map((rating) => (
                  <div key={rating.id} className="p-4 flex items-center gap-3 hover:bg-muted/50 transition-colors">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{rating.fraternity?.name || 'Fraternity'}</p>
                      <p className="text-xs text-muted-foreground">
                        {rating.fraternity?.chapter} · {formatTimeAgo(rating.created_date)}
                      </p>
                    </div>
                    <Badge className={`${getScoreBgColor(rating.combined_score ?? 0)} text-white`}>
                      {(rating.combined_score ?? 0).toFixed(1)}
                    </Badge>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8"
                      onClick={() => setEditingFratRating(rating)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <AlertDialog open={deletingFratRatingId === rating.id} onOpenChange={(open) => setDeletingFratRatingId(open ? rating.id : null)}>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Rating?</AlertDialogTitle>
                          <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDeleteFratRating(rating.id, rating.fraternity_id)} className="bg-destructive text-destructive-foreground">
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Comments Tab */}
        {activeTab === 'comments' && (
          <div>
            {commentsData.length === 0 ? (
              <div className="p-8 text-center">
                <MessageCircle className="h-10 w-10 mx-auto mb-3 text-muted-foreground/50" />
                <p className="text-muted-foreground">No comments yet</p>
              </div>
            ) : (
              <div className="divide-y divide-border/50">
                {commentsData.map((comment) => (
                  <div key={comment.id} className="p-4 hover:bg-muted/50 transition-colors">
                    <div className="flex items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{comment.entityName}</p>
                        <p className="text-sm text-foreground mt-1 line-clamp-2">{comment.text}</p>
                        <p className="text-xs text-muted-foreground mt-1">{format(new Date(comment.created_date), 'MMM d, yyyy')}</p>
                      </div>
                      <Badge variant="outline" className="text-xs capitalize shrink-0">
                        {comment.type}
                      </Badge>
                      <AlertDialog open={deletingCommentId === comment.id} onOpenChange={(open) => setDeletingCommentId(open ? comment.id : null)}>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive shrink-0">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Comment?</AlertDialogTitle>
                            <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDeleteComment(comment)} className="bg-destructive text-destructive-foreground">
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Photos Tab */}
        {activeTab === 'photos' && (
          <div>
            {privatePhotos.length === 0 ? (
              <div className="p-8 text-center">
                <Image className="h-10 w-10 mx-auto mb-3 text-muted-foreground/50" />
                <p className="text-muted-foreground">No private photos yet</p>
              </div>
            ) : (
              <div className="p-4 space-y-4">
                {Object.entries(
                  privatePhotos.reduce((acc, photo) => {
                    const partyId = photo.party_id;
                    if (!acc[partyId]) {
                      acc[partyId] = { party: photo.party, fraternity: photo.fraternity, photos: [] };
                    }
                    acc[partyId].photos.push(photo);
                    return acc;
                  }, {} as Record<string, { party: any; fraternity: any; photos: typeof privatePhotos }>)
                ).map(([partyId, group]) => (
                  <div key={partyId} className="space-y-2">
                    <Link to={`/Party?id=${partyId}`} className="flex items-center gap-3 p-3 rounded-xl bg-background hover:bg-muted/50 transition-colors">
                      <Image className="h-5 w-5 text-muted-foreground" />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{group.party?.title || 'Party'}</p>
                        <p className="text-xs text-muted-foreground">{group.fraternity?.name} · {group.photos.length} photo{group.photos.length !== 1 ? 's' : ''}</p>
                      </div>
                      <ChevronRight className="h-5 w-5 text-muted-foreground" />
                    </Link>
                    <div className="grid grid-cols-3 gap-2">
                      {group.photos.map((photo) => (
                        <div key={photo.id} className="relative aspect-square group">
                          <img 
                            src={photo.url} 
                            alt={photo.caption || 'Private photo'}
                            className="w-full h-full object-cover rounded-lg cursor-pointer"
                            onClick={() => setViewingPhoto(photo)}
                          />
                          <Button
                            variant="ghost"
                            size="icon"
                            className="absolute top-1 right-1 h-6 w-6 bg-black/50 text-white hover:bg-red-500/80 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeletingPhotoId(photo.id);
                            }}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Photo Viewer Modal */}
      {viewingPhoto && (
        <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4" onClick={() => setViewingPhoto(null)}>
          <Button variant="ghost" size="icon" className="absolute top-4 right-4 text-white hover:bg-white/20" onClick={() => setViewingPhoto(null)}>
            <X className="h-6 w-6" />
          </Button>
          <div className="flex flex-col items-center max-w-full max-h-full" onClick={(e) => e.stopPropagation()}>
            <img src={viewingPhoto.url} alt={viewingPhoto.caption || 'Photo'} className="max-w-full max-h-[70vh] object-contain rounded-lg" />
            <div className="mt-4 text-center text-white">
              <Link to={`/Party?id=${viewingPhoto.party_id}`} className="font-semibold hover:underline" onClick={() => setViewingPhoto(null)}>
                {viewingPhoto.party?.title || 'Party'}
              </Link>
              {viewingPhoto.fraternity && <p className="text-sm text-white/70">{viewingPhoto.fraternity.name}</p>}
              {viewingPhoto.caption && <p className="text-sm mt-2">{viewingPhoto.caption}</p>}
              <p className="text-xs text-white/50 mt-2">{formatTimeAgo(viewingPhoto.created_date)}</p>
            </div>
            <Button variant="outline" size="sm" className="mt-4 text-red-400 border-red-400/50 hover:bg-red-500/20" onClick={() => setDeletingPhotoId(viewingPhoto.id)}>
              <Trash2 className="h-4 w-4 mr-2" />
              Delete Photo
            </Button>
          </div>
        </div>
      )}

      {/* Delete Photo Confirmation */}
      <AlertDialog open={!!deletingPhotoId} onOpenChange={(open) => !open && setDeletingPhotoId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Photo?</AlertDialogTitle>
            <AlertDialogDescription>This photo will be permanently deleted.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground"
              onClick={async () => {
                if (deletingPhotoId) {
                  try {
                    await base44.entities.PartyPhoto.delete(deletingPhotoId);
                    setPrivatePhotos(prev => prev.filter(p => p.id !== deletingPhotoId));
                    setStats(prev => ({ ...prev, privatePhotos: prev.privatePhotos - 1 }));
                    if (viewingPhoto?.id === deletingPhotoId) setViewingPhoto(null);
                  } catch (error) {
                    console.error('Failed to delete photo:', error);
                  }
                }
                setDeletingPhotoId(null);
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Edit Modals */}
      {editingPartyRating && editingPartyRating.party && (
        <PartyRatingForm
          party={editingPartyRating.party}
          fraternity={editingPartyRating.fraternity}
          onClose={() => setEditingPartyRating(null)}
          onSubmit={handlePartyRatingSubmit}
        />
      )}

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
