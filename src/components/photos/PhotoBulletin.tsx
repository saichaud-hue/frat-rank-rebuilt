import { useState, useEffect } from 'react';
import { Image, Plus, Eye, X, Loader2, ThumbsUp, ThumbsDown, Trash2 } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { base44, type PartyPhoto, type PartyPhotoVote } from '@/api/base44Client';
import { formatTimeAgo } from '@/utils';
import GlobalPhotoUpload from './GlobalPhotoUpload';
import { recomputePartyCoverPhoto, recalculatePhotoVotes } from './photoUtils';
import { toast } from '@/hooks/use-toast';
interface PhotoBulletinProps {
  partyId: string;
  partyStatus?: 'upcoming' | 'live' | 'completed';
}

interface PhotoWithVote extends PartyPhoto {
  userVote?: 1 | -1 | null;
}

export default function PhotoBulletin({ partyId, partyStatus = 'completed' }: PhotoBulletinProps) {
  const [photos, setPhotos] = useState<PhotoWithVote[]>([]);
  const [loading, setLoading] = useState(true);
  const [showUpload, setShowUpload] = useState(false);
  const [viewerPhoto, setViewerPhoto] = useState<PhotoWithVote | null>(null);
  const [votingPhotoId, setVotingPhotoId] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [deletingPhotoId, setDeletingPhotoId] = useState<string | null>(null);

  useEffect(() => {
    loadUserAndPhotos();
  }, [partyId]);

  const loadUserAndPhotos = async () => {
    const user = await base44.auth.me();
    setCurrentUserId(user?.id || null);
    await loadPhotos(user?.id);
  };

  // Get the start of the current "party day" (resets at 5 AM)
  const getPartyDayStart = (): Date => {
    const now = new Date();
    const today5AM = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 5, 0, 0);
    // If current time is before 5 AM, use yesterday's 5 AM as start
    return now < today5AM 
      ? new Date(today5AM.getTime() - 24 * 60 * 60 * 1000) 
      : today5AM;
  };

  const loadPhotos = async (userId?: string | null) => {
    try {
      const allPhotos = await base44.entities.PartyPhoto.filter(
        { party_id: partyId, moderation_status: 'approved' },
        '-created_date'
      );
      
      // Only show public photos in the bulletin
      const publicPhotos = allPhotos.filter(p => p.visibility !== 'private');
      
      // Filter to only show photos from the current "party day" (since 5 AM)
      const partyDayStart = getPartyDayStart();
      const todaysPhotos = publicPhotos.filter(p => {
        const photoDate = new Date(p.created_date);
        return photoDate >= partyDayStart;
      });

      // Get user's votes for these photos
      let userVotes: PartyPhotoVote[] = [];
      if (userId) {
        userVotes = await base44.entities.PartyPhotoVote.filter({
          party_id: partyId,
          user_id: userId,
        });
      }

      // Merge user votes into photos
      const photosWithVotes: PhotoWithVote[] = todaysPhotos.map(photo => ({
        ...photo,
        userVote: userVotes.find(v => v.party_photo_id === photo.id)?.value || null,
      }));

      setPhotos(photosWithVotes);
    } catch (error) {
      console.error('Failed to load photos:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUploadSuccess = () => {
    loadPhotos(currentUserId);
  };

  const handleVote = async (photo: PhotoWithVote, voteValue: 1 | -1) => {
    if (!currentUserId) {
      return; // User must be logged in
    }

    setVotingPhotoId(photo.id);

    try {
      // Find existing vote
      const existingVotes = await base44.entities.PartyPhotoVote.filter({
        party_photo_id: photo.id,
        user_id: currentUserId,
      });
      const existingVote = existingVotes[0];

      if (existingVote) {
        if (existingVote.value === voteValue) {
          // Toggle off - remove vote
          await base44.entities.PartyPhotoVote.delete(existingVote.id);
        } else {
          // Change vote
          await base44.entities.PartyPhotoVote.update(existingVote.id, { value: voteValue });
        }
      } else {
        // Create new vote
        await base44.entities.PartyPhotoVote.create({
          party_photo_id: photo.id,
          party_id: partyId,
          user_id: currentUserId,
          value: voteValue,
        });
      }

      // Recalculate photo votes from database
      await recalculatePhotoVotes(photo.id);

      // Recompute cover photo
      await recomputePartyCoverPhoto(partyId);

      // Reload photos to get updated counts
      await loadPhotos(currentUserId);
    } catch (error) {
      console.error('Failed to vote:', error);
    } finally {
      setVotingPhotoId(null);
    }
  };

  const getNetScore = (photo: PhotoWithVote) => {
    return (photo.likes || 0) - (photo.dislikes || 0);
  };

  const handleDelete = async (photo: PhotoWithVote) => {
    if (!currentUserId || photo.user_id !== currentUserId) {
      return;
    }

    setDeletingPhotoId(photo.id);

    try {
      // Delete associated votes first
      const votes = await base44.entities.PartyPhotoVote.filter({ party_photo_id: photo.id });
      for (const vote of votes) {
        await base44.entities.PartyPhotoVote.delete(vote.id);
      }

      // Delete the photo
      await base44.entities.PartyPhoto.delete(photo.id);

      // Recompute cover photo
      await recomputePartyCoverPhoto(partyId);

      // Close viewer if viewing deleted photo
      if (viewerPhoto?.id === photo.id) {
        setViewerPhoto(null);
      }

      toast({
        title: 'Photo deleted',
        description: 'Your photo has been removed.',
      });

      // Reload photos
      await loadPhotos(currentUserId);
    } catch (error) {
      console.error('Failed to delete photo:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete photo. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setDeletingPhotoId(null);
    }
  };

  const canDelete = (photo: PhotoWithVote) => {
    return currentUserId && photo.user_id === currentUserId;
  };

  const isUpcoming = partyStatus === 'upcoming';

  return (
    <>
      <Card className="glass p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold flex items-center gap-2">
            <Image className="h-5 w-5 text-primary" />
            Photos {!isUpcoming && `(${photos.length})`}
          </h3>
          {!isUpcoming && (
            <Button 
              size="sm"
              onClick={() => setShowUpload(true)}
              className="gradient-primary text-white"
            >
              <Plus className="h-4 w-4 mr-1" />
              Add Photos
            </Button>
          )}
        </div>

        {isUpcoming ? (
          <div className="text-center py-12 space-y-4">
            <div className="w-16 h-16 mx-auto rounded-full bg-muted flex items-center justify-center">
              <Image className="h-8 w-8 text-muted-foreground" />
            </div>
            <div className="space-y-2">
              <p className="font-medium text-foreground">Photos coming soon!</p>
              <p className="text-sm text-muted-foreground max-w-xs mx-auto">
                Check back after the party to upload and see all your favorite moments in one spot.
              </p>
            </div>
          </div>
        ) : loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : photos.length === 0 ? (
          <div className="text-center py-12 space-y-4">
            <div className="w-16 h-16 mx-auto rounded-full bg-muted flex items-center justify-center">
              <Image className="h-8 w-8 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground">No photos yet</p>
            <Button onClick={() => setShowUpload(true)} variant="outline">
              <Plus className="h-4 w-4 mr-2" />
              Upload First Photo
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {photos.map((photo) => (
              <div key={photo.id} className="space-y-1">
                <div 
                  className="relative aspect-square rounded-lg overflow-hidden group"
                >
                  <img 
                    src={photo.url} 
                    alt={photo.caption || 'Party photo'}
                    className="w-full h-full object-cover cursor-pointer transition-transform group-hover:scale-105"
                    onClick={() => setViewerPhoto(photo)}
                  />
                  
                  {/* Overlay with view icon */}
                  <div 
                    className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors pointer-events-none"
                  />

                  {/* Delete button - only for own photos */}
                  {canDelete(photo) && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute top-2 right-2 h-7 w-7 bg-black/50 text-white hover:bg-red-500/80 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(photo);
                      }}
                      disabled={deletingPhotoId === photo.id}
                    >
                      {deletingPhotoId === photo.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </Button>
                  )}
                  
                  {/* Vote controls at bottom */}
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className={`h-7 px-2 text-white hover:bg-white/20 ${
                            photo.userVote === 1 ? 'bg-green-500/40' : ''
                          }`}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleVote(photo, 1);
                          }}
                          disabled={votingPhotoId === photo.id || !currentUserId}
                        >
                          <ThumbsUp className={`h-4 w-4 ${photo.userVote === 1 ? 'fill-current' : ''}`} />
                          <span className="ml-1 text-xs">{photo.likes || 0}</span>
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className={`h-7 px-2 text-white hover:bg-white/20 ${
                            photo.userVote === -1 ? 'bg-red-500/40' : ''
                          }`}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleVote(photo, -1);
                          }}
                          disabled={votingPhotoId === photo.id || !currentUserId}
                        >
                          <ThumbsDown className={`h-4 w-4 ${photo.userVote === -1 ? 'fill-current' : ''}`} />
                          <span className="ml-1 text-xs">{photo.dislikes || 0}</span>
                        </Button>
                      </div>
                      <span className={`text-xs font-medium px-2 py-0.5 rounded ${
                        getNetScore(photo) > 0 
                          ? 'bg-green-500/40 text-green-200' 
                          : getNetScore(photo) < 0 
                            ? 'bg-red-500/40 text-red-200' 
                            : 'bg-white/20 text-white'
                      }`}>
                        {getNetScore(photo) > 0 ? '+' : ''}{getNetScore(photo)}
                      </span>
                    </div>
                  </div>
                </div>
                {/* Caption below photo */}
                {photo.caption && (
                  <p className="text-xs text-muted-foreground px-1 line-clamp-2">{photo.caption}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Photo Viewer */}
      {viewerPhoto && (
        <div 
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setViewerPhoto(null)}
        >
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-4 right-4 text-white hover:bg-white/20"
            onClick={() => setViewerPhoto(null)}
          >
            <X className="h-6 w-6" />
          </Button>
          <div className="flex flex-col items-center max-w-full max-h-full">
            <img 
              src={viewerPhoto.url} 
              alt={viewerPhoto.caption || 'Party photo'}
              className="max-w-full max-h-[70vh] object-contain"
              onClick={(e) => e.stopPropagation()}
            />
            
            {/* Vote controls in viewer */}
            <div className="mt-4 flex items-center gap-4" onClick={(e) => e.stopPropagation()}>
              <Button
                variant="outline"
                size="sm"
                className={`text-white border-white/30 hover:bg-white/20 ${
                  viewerPhoto.userVote === 1 ? 'bg-green-500/40 border-green-500' : ''
                }`}
                onClick={() => handleVote(viewerPhoto, 1)}
                disabled={votingPhotoId === viewerPhoto.id || !currentUserId}
              >
                <ThumbsUp className={`h-4 w-4 mr-2 ${viewerPhoto.userVote === 1 ? 'fill-current' : ''}`} />
                {viewerPhoto.likes || 0}
              </Button>
              <span className={`text-lg font-bold ${
                getNetScore(viewerPhoto) > 0 
                  ? 'text-green-400' 
                  : getNetScore(viewerPhoto) < 0 
                    ? 'text-red-400' 
                    : 'text-white'
              }`}>
                {getNetScore(viewerPhoto) > 0 ? '+' : ''}{getNetScore(viewerPhoto)}
              </span>
              <Button
                variant="outline"
                size="sm"
                className={`text-white border-white/30 hover:bg-white/20 ${
                  viewerPhoto.userVote === -1 ? 'bg-red-500/40 border-red-500' : ''
                }`}
                onClick={() => handleVote(viewerPhoto, -1)}
                disabled={votingPhotoId === viewerPhoto.id || !currentUserId}
              >
                <ThumbsDown className={`h-4 w-4 mr-2 ${viewerPhoto.userVote === -1 ? 'fill-current' : ''}`} />
                {viewerPhoto.dislikes || 0}
              </Button>
            </div>

            {/* Delete button in viewer */}
            {canDelete(viewerPhoto) && (
              <Button
                variant="outline"
                size="sm"
                className="mt-4 text-red-400 border-red-400/50 hover:bg-red-500/20 hover:text-red-300"
                onClick={() => handleDelete(viewerPhoto)}
                disabled={deletingPhotoId === viewerPhoto.id}
              >
                {deletingPhotoId === viewerPhoto.id ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4 mr-2" />
                )}
                Delete Photo
              </Button>
            )}

            {(viewerPhoto.caption || viewerPhoto.created_date) && (
              <div className="mt-4 text-center text-white">
                {viewerPhoto.caption && <p className="font-medium">{viewerPhoto.caption}</p>}
                <p className="text-sm text-white/70">{formatTimeAgo(viewerPhoto.created_date)}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Upload Modal */}
      {showUpload && (
        <GlobalPhotoUpload
          partyId={partyId}
          onClose={() => setShowUpload(false)}
          onUploadSuccess={handleUploadSuccess}
        />
      )}
    </>
  );
}
