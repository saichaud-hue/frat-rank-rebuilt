import { useState, useEffect } from 'react';
import { Image, Plus, Loader2, ThumbsUp, ThumbsDown, Trash2 } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { base44, type PartyPhoto, type PartyPhotoVote } from '@/api/base44Client';
import GlobalPhotoUpload from './GlobalPhotoUpload';
import PhotoGallery from './PhotoGallery';
import { recomputePartyCoverPhoto, recalculatePhotoVotes } from './photoUtils';
import { toast } from '@/hooks/use-toast';

interface PhotoBulletinProps {
  partyId: string;
}

interface PhotoWithVote extends PartyPhoto {
  userVote?: 1 | -1 | null;
}

export default function PhotoBulletin({ partyId }: PhotoBulletinProps) {
  const [photos, setPhotos] = useState<PhotoWithVote[]>([]);
  const [loading, setLoading] = useState(true);
  const [showUpload, setShowUpload] = useState(false);
  const [showGallery, setShowGallery] = useState(false);
  const [galleryStartIndex, setGalleryStartIndex] = useState(0);
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

  const loadPhotos = async (userId?: string | null) => {
    try {
      const data = await base44.entities.PartyPhoto.filter(
        { party_id: partyId, moderation_status: 'approved' },
        '-created_date'
      );

      // Get user's votes for these photos
      let userVotes: PartyPhotoVote[] = [];
      if (userId) {
        userVotes = await base44.entities.PartyPhotoVote.filter({
          party_id: partyId,
          user_id: userId,
        });
      }

      // Merge user votes into photos
      const photosWithVotes: PhotoWithVote[] = data.map(photo => ({
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

  const handlePhotosUpdated = () => {
    loadPhotos(currentUserId);
  };

  const handleVote = async (photo: PhotoWithVote, voteValue: 1 | -1) => {
    if (!currentUserId) {
      return;
    }

    setVotingPhotoId(photo.id);

    try {
      const existingVotes = await base44.entities.PartyPhotoVote.filter({
        party_photo_id: photo.id,
        user_id: currentUserId,
      });
      const existingVote = existingVotes[0];

      if (existingVote) {
        if (existingVote.value === voteValue) {
          await base44.entities.PartyPhotoVote.delete(existingVote.id);
        } else {
          await base44.entities.PartyPhotoVote.update(existingVote.id, { value: voteValue });
        }
      } else {
        await base44.entities.PartyPhotoVote.create({
          party_photo_id: photo.id,
          party_id: partyId,
          user_id: currentUserId,
          value: voteValue,
        });
      }

      await recalculatePhotoVotes(photo.id);
      await recomputePartyCoverPhoto(partyId);
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
      const votes = await base44.entities.PartyPhotoVote.filter({ party_photo_id: photo.id });
      for (const vote of votes) {
        await base44.entities.PartyPhotoVote.delete(vote.id);
      }

      await base44.entities.PartyPhoto.delete(photo.id);
      await recomputePartyCoverPhoto(partyId);

      toast({
        title: 'Photo deleted',
        description: 'Your photo has been removed.',
      });

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

  const openGallery = (index: number) => {
    setGalleryStartIndex(index);
    setShowGallery(true);
  };

  return (
    <>
      <Card className="glass p-4 space-y-4">
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            className="font-semibold flex items-center gap-2 px-0 hover:bg-transparent hover:text-primary"
            onClick={() => photos.length > 0 && openGallery(0)}
            disabled={photos.length === 0}
          >
            <Image className="h-5 w-5 text-primary" />
            Photos ({photos.length})
          </Button>
          <Button 
            size="sm"
            onClick={() => setShowUpload(true)}
            className="gradient-primary text-white"
          >
            <Plus className="h-4 w-4 mr-1" />
            Add Photos
          </Button>
        </div>

        {loading ? (
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
            {photos.map((photo, index) => (
              <div 
                key={photo.id}
                className="relative aspect-square rounded-lg overflow-hidden group"
              >
                <img 
                  src={photo.url} 
                  alt={photo.caption || 'Party photo'}
                  className="w-full h-full object-cover cursor-pointer transition-transform group-hover:scale-105"
                  onClick={() => openGallery(index)}
                />
                
                <div 
                  className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors pointer-events-none"
                />

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
            ))}
          </div>
        )}
      </Card>

      {/* Photo Gallery */}
      {showGallery && (
        <PhotoGallery
          photos={photos}
          initialPhotoIndex={galleryStartIndex}
          partyId={partyId}
          currentUserId={currentUserId}
          onClose={() => setShowGallery(false)}
          onPhotosUpdated={handlePhotosUpdated}
        />
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