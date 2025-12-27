import { useState, useEffect } from 'react';
import { Image, Plus, Eye, X, Loader2 } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { base44, type PartyPhoto } from '@/api/base44Client';
import { formatTimeAgo } from '@/utils';
import GlobalPhotoUpload from './GlobalPhotoUpload';

interface PhotoBulletinProps {
  partyId: string;
}

export default function PhotoBulletin({ partyId }: PhotoBulletinProps) {
  const [photos, setPhotos] = useState<PartyPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [showUpload, setShowUpload] = useState(false);
  const [viewerPhoto, setViewerPhoto] = useState<PartyPhoto | null>(null);

  useEffect(() => {
    loadPhotos();
  }, [partyId]);

  const loadPhotos = async () => {
    try {
      const data = await base44.entities.PartyPhoto.filter(
        { party_id: partyId, moderation_status: 'approved' },
        '-created_date'
      );
      setPhotos(data);
    } catch (error) {
      console.error('Failed to load photos:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUploadSuccess = () => {
    loadPhotos();
  };

  return (
    <>
      <Card className="glass p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold flex items-center gap-2">
            <Image className="h-5 w-5 text-primary" />
            Photos ({photos.length})
          </h3>
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
          <div className="grid grid-cols-3 gap-2">
            {photos.map((photo) => (
              <div 
                key={photo.id}
                className="relative aspect-square rounded-lg overflow-hidden cursor-pointer group"
                onClick={() => setViewerPhoto(photo)}
              >
                <img 
                  src={photo.url} 
                  alt={photo.caption || 'Party photo'}
                  className="w-full h-full object-cover transition-transform group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                  <Eye className="h-6 w-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
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
          <img 
            src={viewerPhoto.url} 
            alt={viewerPhoto.caption || 'Party photo'}
            className="max-w-full max-h-full object-contain"
            onClick={(e) => e.stopPropagation()}
          />
          {(viewerPhoto.caption || viewerPhoto.created_date) && (
            <div className="absolute bottom-4 left-4 right-4 text-center text-white">
              {viewerPhoto.caption && <p className="font-medium">{viewerPhoto.caption}</p>}
              <p className="text-sm text-white/70">{formatTimeAgo(viewerPhoto.created_date)}</p>
            </div>
          )}
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
