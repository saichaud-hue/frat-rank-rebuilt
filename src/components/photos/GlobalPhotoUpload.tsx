import { useState, useRef, useCallback } from 'react';
import { X, Upload, Image, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { 
  Sheet, 
  SheetContent, 
  SheetHeader, 
  SheetTitle,
  SheetFooter
} from '@/components/ui/sheet';
import { base44 } from '@/api/base44Client';
import { recomputePartyCoverPhoto } from './photoUtils';
import { toast } from '@/hooks/use-toast';

interface GlobalPhotoUploadProps {
  partyId: string;
  onClose: () => void;
  onUploadSuccess: () => void;
}

interface PreviewFile {
  id: string;
  file: File;
  preview: string;
  caption: string;
}

export default function GlobalPhotoUpload({ partyId, onClose, onUploadSuccess }: GlobalPhotoUploadProps) {
  const [files, setFiles] = useState<PreviewFile[]>([]);
  const [consentVerified, setConsentVerified] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFiles = useCallback((selectedFiles: File[]) => {
    setError(null);
    const validFiles: PreviewFile[] = [];

    for (const file of selectedFiles) {
      if (!file.type.startsWith('image/')) {
        setError('Please select only image files');
        continue;
      }
      if (file.size > 10 * 1024 * 1024) {
        setError('Each file must be less than 10MB');
        continue;
      }
      
      validFiles.push({
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        file,
        preview: URL.createObjectURL(file),
        caption: '',
      });
    }

    if (validFiles.length > 0) {
      setFiles((prev) => [...prev, ...validFiles]);
    }
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    processFiles(selectedFiles);
    // Reset input so same files can be selected again
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    
    const droppedFiles = Array.from(e.dataTransfer.files);
    processFiles(droppedFiles);
  }, [processFiles]);

  const removeFile = (id: string) => {
    setFiles(prev => {
      const fileToRemove = prev.find(f => f.id === id);
      if (fileToRemove) {
        URL.revokeObjectURL(fileToRemove.preview);
      }
      return prev.filter(f => f.id !== id);
    });
  };

  const updateCaption = (id: string, caption: string) => {
    setFiles((prev) => 
      prev.map(f => f.id === id ? { ...f, caption } : f)
    );
  };

  const resetSelection = () => {
    files.forEach((f) => URL.revokeObjectURL(f.preview));
    setFiles([]);
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

      let successCount = 0;
      
      // Upload all files sequentially to avoid race conditions
      for (const { file, caption } of files) {
        try {
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
          
          successCount++;
        } catch (fileError) {
          console.error('Failed to upload file:', fileError);
        }
      }

      if (successCount === 0) {
        setError('Failed to upload photos. Please try again.');
        setUploading(false);
        return;
      }

      // Recompute cover photo (picks highest voted or newest)
      await recomputePartyCoverPhoto(partyId);

      toast({
        title: 'Photos uploaded!',
        description: `Successfully uploaded ${successCount} photo${successCount !== 1 ? 's' : ''}.`,
      });

      onUploadSuccess();
      handleClose();
    } catch (err) {
      console.error('Upload failed:', err);
      setError('Failed to upload photos. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleClickDropZone = () => {
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
      fileInputRef.current.click();
    }
  };

  return (
    <Sheet open={true} onOpenChange={(open) => !open && handleClose()}>
      <SheetContent side="bottom" className="h-[85vh] flex flex-col rounded-t-3xl">
        <SheetHeader className="pb-4 border-b">
          <SheetTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5 text-primary" />
            Upload Photos
          </SheetTitle>
        </SheetHeader>

        {/* Content */}
        <div className="flex-1 overflow-y-auto py-4 space-y-4">
          {/* File Input / Drop Zone */}
          <div 
            className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
              isDragOver 
                ? 'border-primary bg-primary/10' 
                : 'border-muted-foreground/25 hover:border-primary/50'
            }`}
            onClick={handleClickDropZone}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <Image className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="font-medium text-foreground">Click to select photos or drag and drop</p>
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
              {files.map((file) => (
                <div key={file.id} className="relative space-y-2">
                  <div className="relative aspect-square rounded-lg overflow-hidden">
                    <img 
                      src={file.preview} 
                      alt="Preview"
                      className="w-full h-full object-cover"
                    />
                    <Button
                      variant="destructive"
                      size="icon"
                      className="absolute top-2 right-2 h-6 w-6"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeFile(file.id);
                      }}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  <Input
                    placeholder="Add caption..."
                    value={file.caption}
                    onChange={(e) => updateCaption(file.id, e.target.value)}
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
        <SheetFooter className="pt-4 border-t flex-col gap-4 sm:flex-col">
          <div className="flex items-start gap-2 w-full">
            <Checkbox
              id="consent"
              checked={consentVerified}
              onCheckedChange={(checked) => setConsentVerified(checked === true)}
            />
            <Label htmlFor="consent" className="text-sm leading-relaxed cursor-pointer">
              I confirm that I have consent from all individuals in these photos and that the content is appropriate.
            </Label>
          </div>

          <div className="flex gap-2 w-full">
            <Button variant="outline" onClick={handleClose} className="flex-1">
              Cancel
            </Button>
            <Button 
              onClick={handleUpload}
              disabled={uploading || files.length === 0 || !consentVerified}
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
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
