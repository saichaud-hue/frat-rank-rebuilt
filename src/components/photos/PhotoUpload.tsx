import { useState, useRef } from 'react';
import { Upload, Image, Loader2, CheckCircle2, AlertCircle, X } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { base44 } from '@/api/base44Client';

interface PhotoUploadProps {
  partyId: string;
  onUploadComplete: () => void;
}

export default function PhotoUpload({ partyId, onUploadComplete }: PhotoUploadProps) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [caption, setCaption] = useState('');
  const [consentVerified, setConsentVerified] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setError(null);

    if (!selectedFile.type.startsWith('image/')) {
      setError('Please select an image file');
      return;
    }
    if (selectedFile.size > 10 * 1024 * 1024) {
      setError('File must be less than 10MB');
      return;
    }

    setFile(selectedFile);
    setPreview(URL.createObjectURL(selectedFile));
  };

  const clearFile = () => {
    if (preview) URL.revokeObjectURL(preview);
    setFile(null);
    setPreview(null);
    setCaption('');
  };

  const handleUpload = async () => {
    if (!consentVerified) {
      setError('Please verify consent before uploading');
      return;
    }
    if (!file) {
      setError('Please select a photo');
      return;
    }

    setUploading(true);
    setError(null);

    try {
      const user = await base44.auth.me();
      if (!user) {
        setError('Please sign in to upload photos');
        return;
      }

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

      // Update user points
      await base44.auth.updateMe({ points: (user.points || 0) + 5 });

      clearFile();
      onUploadComplete();
    } catch (err) {
      console.error('Upload failed:', err);
      setError('Failed to upload photo. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <Card className="glass p-4 space-y-4">
      <h3 className="font-semibold flex items-center gap-2">
        <Upload className="h-5 w-5 text-primary" />
        Upload Photo
      </h3>

      {preview ? (
        <div className="space-y-3">
          <div className="relative aspect-video rounded-lg overflow-hidden">
            <img src={preview} alt="Preview" className="w-full h-full object-cover" />
            <Button
              variant="destructive"
              size="icon"
              className="absolute top-2 right-2"
              onClick={clearFile}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <Input
            placeholder="Add a caption..."
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
          />
        </div>
      ) : (
        <div 
          className="border-2 border-dashed border-muted-foreground/25 rounded-xl p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
          onClick={() => fileInputRef.current?.click()}
        >
          <Image className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
          <p className="text-sm text-muted-foreground">Click to select a photo</p>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
          />
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 text-destructive bg-destructive/10 p-3 rounded-lg">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          <p className="text-sm">{error}</p>
        </div>
      )}

      <div className="flex items-start gap-2">
        <Checkbox
          id="consent-single"
          checked={consentVerified}
          onCheckedChange={(checked) => setConsentVerified(checked === true)}
        />
        <Label htmlFor="consent-single" className="text-sm cursor-pointer">
          I have consent from all individuals in this photo
        </Label>
      </div>

      <Button 
        onClick={handleUpload}
        disabled={uploading || !file}
        className="w-full gradient-primary text-white"
      >
        {uploading ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Uploading...
          </>
        ) : (
          <>
            <CheckCircle2 className="h-4 w-4 mr-2" />
            Upload Photo
          </>
        )}
      </Button>
    </Card>
  );
}
