import { useState, useRef, useCallback, useEffect } from 'react';
import { X, Upload, Image, Loader2, CheckCircle2, AlertCircle, Lock, Globe, Share2 } from 'lucide-react';
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
import { cn } from '@/lib/utils';
import { validateFile, stripExifData, getAllowedFileTypes, getAcceptString, type AllowedFileType } from '@/lib/fileValidation';

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

type UploadMode = 'select' | 'private' | 'public';

export default function GlobalPhotoUpload({ partyId, onClose, onUploadSuccess }: GlobalPhotoUploadProps) {
  const [mode, setMode] = useState<UploadMode>('select');
  const [files, setFiles] = useState<PreviewFile[]>([]);
  const [consentVerified, setConsentVerified] = useState(false);
  const [shareToFeed, setShareToFeed] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [allowedTypes, setAllowedTypes] = useState<AllowedFileType[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch allowed file types on mount
  useEffect(() => {
    getAllowedFileTypes().then(setAllowedTypes);
  }, []);

  const processFiles = useCallback(async (selectedFiles: File[]) => {
    setError(null);
    const validFiles: PreviewFile[] = [];
    const errors: string[] = [];

    for (const file of selectedFiles) {
      // Validate against database rules
      const validation = await validateFile(file);
      if (!validation.valid) {
        errors.push(`${file.name}: ${validation.error}`);
        continue;
      }
      
      validFiles.push({
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        file,
        preview: URL.createObjectURL(file),
        caption: '',
      });
    }

    if (errors.length > 0) {
      setError(errors.join('. '));
    }

    if (validFiles.length > 0) {
      setFiles((prev) => [...prev, ...validFiles]);
    }
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    processFiles(selectedFiles);
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
    setShareToFeed(false);
    setMode('select');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleClose = () => {
    resetSelection();
    onClose();
  };

  const handleUpload = async () => {
    if (mode === 'public' && !consentVerified) {
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
      let storageError = false;
      
      for (const { file, caption } of files) {
        try {
          // Strip EXIF data before upload
          const cleanedFile = await stripExifData(file);
          const { url } = await base44.integrations.Core.UploadFile({ file: cleanedFile });

          await base44.entities.PartyPhoto.create({
            party_id: partyId,
            user_id: user.id,
            url,
            caption,
            consent_verified: mode === 'public',
            likes: 0,
            dislikes: 0,
            moderation_status: 'approved',
            faces_detected: 0,
            faces_blurred: false,
            visibility: mode === 'private' ? 'private' : 'public',
            shared_to_feed: mode === 'public' && shareToFeed,
          });
          
          successCount++;
        } catch (fileError: any) {
          console.error('Failed to upload file:', fileError);
          if (fileError?.name === 'QuotaExceededError' || fileError?.message?.includes('quota')) {
            storageError = true;
            break;
          }
        }
      }

      if (storageError) {
        setError('Storage limit reached. Please clear some browser data or try again later.');
        setUploading(false);
        return;
      }

      if (successCount === 0) {
        setError('Failed to upload photos. Please try again.');
        setUploading(false);
        return;
      }

      if (mode === 'public') {
        await recomputePartyCoverPhoto(partyId);
      }

      const locationText = mode === 'private' ? 'Your Profile' : 'party photos';
      toast({
        title: 'Photos uploaded!',
        description: `${successCount} photo${successCount !== 1 ? 's' : ''} saved to ${locationText}.`,
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

  // Mode selection screen
  if (mode === 'select') {
    return (
      <Sheet open={true} onOpenChange={(open) => !open && handleClose()}>
        <SheetContent side="bottom" className="h-auto max-h-[85vh] flex flex-col rounded-t-3xl">
          <SheetHeader className="pb-4 border-b">
            <SheetTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5 text-primary" />
              Upload Photos
            </SheetTitle>
          </SheetHeader>

          <div className="py-6 space-y-4">
            <p className="text-sm text-muted-foreground text-center mb-6">
              How would you like to save these photos?
            </p>

            {/* Private option */}
            <button
              onClick={() => setMode('private')}
              className="w-full p-4 rounded-2xl border-2 border-border hover:border-primary/50 transition-all text-left group"
            >
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                  <Lock className="h-6 w-6 text-muted-foreground group-hover:text-primary" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold mb-1">Save for Yourself</h3>
                  <p className="text-sm text-muted-foreground">
                    Private photos only you can see. Access them anytime in your Profile.
                  </p>
                </div>
              </div>
            </button>

            {/* Public option */}
            <button
              onClick={() => setMode('public')}
              className="w-full p-4 rounded-2xl border-2 border-border hover:border-primary/50 transition-all text-left group"
            >
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                  <Globe className="h-6 w-6 text-muted-foreground group-hover:text-primary" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold mb-1">Share with Everyone</h3>
                  <p className="text-sm text-muted-foreground">
                    Add to the party's photo collection. Others can view and vote on your photos.
                  </p>
                </div>
              </div>
            </button>
          </div>

          <SheetFooter className="pt-4 border-t">
            <Button variant="outline" onClick={handleClose} className="w-full">
              Cancel
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    );
  }

  // Upload screen (private or public)
  return (
    <Sheet open={true} onOpenChange={(open) => !open && handleClose()}>
      <SheetContent side="bottom" className="h-[85vh] flex flex-col rounded-t-3xl">
        <SheetHeader className="pb-4 border-b">
          <SheetTitle className="flex items-center gap-2">
            {mode === 'private' ? (
              <>
                <Lock className="h-5 w-5 text-primary" />
                Save Private Photos
              </>
            ) : (
              <>
                <Globe className="h-5 w-5 text-primary" />
                Share Photos
              </>
            )}
          </SheetTitle>
        </SheetHeader>

        {/* Content */}
        <div className="flex-1 overflow-y-auto py-4 space-y-4">
          {/* Mode indicator */}
          <div className={cn(
            "p-3 rounded-xl text-sm flex items-center gap-2",
            mode === 'private' 
              ? "bg-muted text-muted-foreground" 
              : "bg-primary/10 text-primary"
          )}>
            {mode === 'private' ? (
              <>
                <Lock className="h-4 w-4" />
                These photos will only be visible to you in your Profile
              </>
            ) : (
              <>
                <Globe className="h-4 w-4" />
                These photos will be visible to everyone on this party's page
              </>
            )}
          </div>

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
              accept={allowedTypes.length > 0 ? getAcceptString(allowedTypes) : "image/*"}
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
          {mode === 'public' && (
            <>
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

              <div className="flex items-start gap-2 w-full p-3 rounded-xl bg-muted/50">
                <Checkbox
                  id="shareToFeed"
                  checked={shareToFeed}
                  onCheckedChange={(checked) => setShareToFeed(checked === true)}
                />
                <Label htmlFor="shareToFeed" className="text-sm leading-relaxed cursor-pointer">
                  <span className="flex items-center gap-1">
                    <Share2 className="h-3.5 w-3.5" />
                    Also share to the main Feed
                  </span>
                  <span className="text-xs text-muted-foreground block mt-0.5">
                    Your photo will appear in everyone's activity feed
                  </span>
                </Label>
              </div>
            </>
          )}

          <div className="flex gap-2 w-full">
            <Button variant="outline" onClick={() => setMode('select')} className="flex-1">
              Back
            </Button>
            <Button 
              onClick={handleUpload}
              disabled={uploading || files.length === 0 || (mode === 'public' && !consentVerified)}
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
                  {mode === 'private' ? 'Save' : 'Upload'} {files.length} Photo{files.length !== 1 ? 's' : ''}
                </>
              )}
            </Button>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
