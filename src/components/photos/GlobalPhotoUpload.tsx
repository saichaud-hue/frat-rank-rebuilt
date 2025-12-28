import { useState, useRef } from 'react';
import { X, Upload, Image, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { base44 } from '@/api/base44Client';
import { recomputePartyCoverPhoto } from './photoUtils';

interface GlobalPhotoUploadProps {
  partyId: string;
  onClose: () => void;
  onUploadSuccess: () => void;
}

interface PreviewFile {
  file: File;
  preview: string;
  caption: string;
}

export default function GlobalPhotoUpload({ partyId, onClose, onUploadSuccess }: GlobalPhotoUploadProps) {
  const [files, setFiles] = useState<PreviewFile[]>([]);
  const [consentVerified, setConsentVerified] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    setError(null);

    for (const file of selectedFiles) {
      if (!file.type.startsWith('image/')) {
        setError('Please select only image files');
        e.target.value = '';
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        setError('Each file must be less than 10MB');
        e.target.value = '';
        return;
      }
    }

    const newFiles = selectedFiles.map((file) => ({
      file,
      preview: URL.createObjectURL(file),
      caption: '',
    }));

    setFiles((prev) => [...prev, ...newFiles]);

    // Critical: reset the input so selecting the same file(s) later still triggers onChange.
    e.target.value = '';
  };

  const removeFile = (index: number) => {
    setFiles(prev => {
      const newFiles = [...prev];
      URL.revokeObjectURL(newFiles[index].preview);
      newFiles.splice(index, 1);
      return newFiles;
    });
  };

  const updateCaption = (index: number, caption: string) => {
    setFiles((prev) => {
      const newFiles = [...prev];
      newFiles[index].caption = caption;
      return newFiles;
    });
  };

  const resetSelection = () => {
    setFiles((prev) => {
      prev.forEach((f) => URL.revokeObjectURL(f.preview));
      return [];
    });
    setError(null);
    setConsentVerified(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleClose = () => {
    resetSelection();
    onClose();
  };

  const handleUpload = async () => {
    if (!consentVerified) {
      setError('Please verify consent before uploading');
      return;
    }
    if (files.length === 0) {
      setError('Please select at least one photo');
      return;
    }

    setUploading(true);
    setError(null);

    try {
      const user = await base44.auth.me();
      if (!user) {
        setError('Please sign in to upload photos');
        setUploading(false);
        return;
      }

      // Upload all files
      for (const { file, caption } of files) {
        const { url } = await base44.integrations.Core.UploadFile({ file });

        await base44.entities.PartyPhoto.create({
          party_id: partyId,
          user_id: user.id,
          url,
          caption,
          consent_verified: true,
          likes: 0,
          dislikes: 0,
          moderation_status: 'approved',
          faces_detected: 0,
          faces_blurred: false,
        });
      }

      // Recompute cover photo (picks highest voted or newest)
      await recomputePartyCoverPhoto(partyId);

      onUploadSuccess();
      handleClose();
    } catch (err) {
      console.error('Upload failed:', err);
      setError('Failed to upload photos. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
      <Card className="w-full max-w-3xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="sticky top-0 bg-card p-4 border-b flex items-center justify-between">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Upload className="h-5 w-5 text-primary" />
            Upload Photos
          </h2>
          <Button variant="ghost" size="icon" onClick={handleClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* File Input */}
          <div 
            className="border-2 border-dashed border-muted-foreground/25 rounded-xl p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
            onClick={() => {
              if (fileInputRef.current) fileInputRef.current.value = '';
              fileInputRef.current?.click();
            }}
          >
            <Image className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Click to select photos or drag and drop</p>
            <p className="text-xs text-muted-foreground mt-2">Max 10MB per file</p>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleFileSelect}
              className="hidden"
            />
          </div>

          {/* Previews */}
          {files.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {files.map((file, index) => (
                <div key={index} className="relative space-y-2">
                  <div className="relative aspect-square rounded-lg overflow-hidden">
                    <img 
                      src={file.preview} 
                      alt={`Preview ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                    <Button
                      variant="destructive"
                      size="icon"
                      className="absolute top-2 right-2 h-6 w-6"
                      onClick={() => removeFile(index)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  <Input
                    placeholder="Add caption..."
                    value={file.caption}
                    onChange={(e) => updateCaption(index, e.target.value)}
                    className="text-sm"
                  />
                </div>
              ))}
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 text-destructive bg-destructive/10 p-3 rounded-lg">
              <AlertCircle className="h-5 w-5 flex-shrink-0" />
              <p className="text-sm">{error}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-card p-4 border-t space-y-4">
          <div className="flex items-start gap-2">
            <Checkbox
              id="consent"
              checked={consentVerified}
              onCheckedChange={(checked) => setConsentVerified(checked === true)}
            />
            <Label htmlFor="consent" className="text-sm leading-relaxed cursor-pointer">
              I confirm that I have consent from all individuals in these photos and that the content is appropriate.
            </Label>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" onClick={handleClose} className="flex-1">
              Cancel
            </Button>
            <Button 
              onClick={handleUpload}
              disabled={uploading || files.length === 0}
              className="flex-1 gradient-primary text-white"
            >
              {uploading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Upload {files.length} Photo{files.length !== 1 ? 's' : ''}
                </>
              )}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
