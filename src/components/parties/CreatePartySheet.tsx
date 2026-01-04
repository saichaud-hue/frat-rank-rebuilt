import { useState, useEffect, useMemo, useRef } from 'react';
import { Plus, MapPin, Loader2, CalendarDays, AlertCircle, PartyPopper, Sparkles, Clock, Users, Music, Lock, Globe, ImageIcon, Upload, X, Mail, CheckCircle2, ChevronRight, Info, Camera, Image } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Badge } from '@/components/ui/badge';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { fraternityQueries, partyQueries, getCurrentUser, type Fraternity } from '@/lib/supabase-data';
import { getFratShorthand } from '@/utils';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { validateFile, stripExifData } from '@/lib/fileValidation';

interface CreatePartySheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export default function CreatePartySheet({ open, onOpenChange, onSuccess }: CreatePartySheetProps) {
  const [fraternities, setFraternities] = useState<Fraternity[]>([]);
  const [loading, setLoading] = useState(false);
  const [showIntro, setShowIntro] = useState(true);
  const [formData, setFormData] = useState({
    fraternity_id: '',
    title: '',
    starts_at: '',
    ends_at: '',
    venue: '',
    type: '',
    invite_only: false,
    cover_photo_url: '',
    contact_email: '',
  });

  const [startDate, setStartDate] = useState<Date | undefined>();
  const [startTime, setStartTime] = useState('20:00');
  const [endDate, setEndDate] = useState<Date | undefined>();
  const [endTime, setEndTime] = useState('23:00');
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [emailError, setEmailError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      loadFraternities();
      setShowIntro(true);
    }
  }, [open]);

  useEffect(() => {
    if (startDate) {
      const [hours, minutes] = startTime.split(':').map(Number);
      const dt = new Date(startDate);
      dt.setHours(hours, minutes, 0, 0);
      setFormData(prev => ({ ...prev, starts_at: dt.toISOString() }));
    }
  }, [startDate, startTime]);

  useEffect(() => {
    if (endDate) {
      const [hours, minutes] = endTime.split(':').map(Number);
      const dt = new Date(endDate);
      dt.setHours(hours, minutes, 0, 0);
      setFormData(prev => ({ ...prev, ends_at: dt.toISOString() }));
    }
  }, [endDate, endTime]);

  function isValidEmail(email: string) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email.trim());
  }

  const handleEmailChange = (value: string) => {
    setFormData((prev) => ({ ...prev, contact_email: value }));
    if (value.trim() && !isValidEmail(value)) {
      setEmailError("Please enter a valid email address");
    } else {
      setEmailError("");
    }
  };

  const { isEndValid, endError, isFormValid, completedSteps } = useMemo(() => {
    let startTimestamp: number | null = null;
    if (startDate) {
      const [h, m] = startTime.split(":").map(Number);
      const dt = new Date(startDate);
      dt.setHours(h, m, 0, 0);
      startTimestamp = dt.getTime();
    }

    let endTimestamp: number | null = null;
    if (endDate) {
      const [h, m] = endTime.split(":").map(Number);
      const dt = new Date(endDate);
      dt.setHours(h, m, 0, 0);
      endTimestamp = dt.getTime();
    }

    let localIsEndValid = true;
    let localEndError = "";

    if (!endDate) {
      localIsEndValid = false;
      localEndError = "End date/time is required.";
    } else if (startTimestamp !== null && endTimestamp !== null && endTimestamp <= startTimestamp) {
      localIsEndValid = false;
      localEndError = "Party end must be after start.";
    }

    let localCompletedSteps = 0;
    if (formData.fraternity_id) localCompletedSteps++;
    if (formData.title.trim()) localCompletedSteps++;
    if (startDate) localCompletedSteps++;
    if (endDate && localIsEndValid) localCompletedSteps++;
    if (formData.contact_email.trim() && isValidEmail(formData.contact_email)) localCompletedSteps++;

    const localIsFormValid =
      !!formData.fraternity_id &&
      !!formData.title.trim() &&
      !!startDate &&
      !!endDate &&
      localIsEndValid &&
      !!formData.contact_email.trim() &&
      isValidEmail(formData.contact_email);

    return {
      isEndValid: localIsEndValid,
      endError: localEndError,
      isFormValid: localIsFormValid,
      completedSteps: localCompletedSteps,
    };
  }, [formData.fraternity_id, formData.title, formData.contact_email, startDate, startTime, endDate, endTime]);

  const loadFraternities = async () => {
    try {
      const data = await fraternityQueries.list();
      setFraternities(data);
    } catch (error) {
      console.error('Failed to load fraternities:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      fraternity_id: '',
      title: '',
      starts_at: '',
      ends_at: '',
      venue: '',
      type: '',
      invite_only: false,
      cover_photo_url: '',
      contact_email: '',
    });
    setStartDate(undefined);
    setEndDate(undefined);
    setStartTime('20:00');
    setEndTime('23:00');
    setEmailError('');
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const user = await getCurrentUser();
    if (!user) {
      const { toast } = await import('@/hooks/use-toast');
      toast({ title: "Please sign in to upload photos", variant: "destructive" });
      return;
    }

    // Validate file type and size
    const validation = await validateFile(file);
    if (!validation.valid) {
      const { toast } = await import('@/hooks/use-toast');
      toast({ title: validation.error || "Invalid file", variant: "destructive" });
      return;
    }

    setUploadingPhoto(true);
    try {
      // Strip EXIF data before upload
      const cleanedFile = await stripExifData(file);
      
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('party-covers')
        .upload(fileName, cleanedFile);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('party-covers')
        .getPublicUrl(fileName);

      setFormData(prev => ({ ...prev, cover_photo_url: publicUrl }));
    } catch (error) {
      console.error('Failed to upload photo:', error);
      const { toast } = await import('@/hooks/use-toast');
      toast({ title: "Failed to upload photo", variant: "destructive" });
    } finally {
      setUploadingPhoto(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid) return;

    const user = await getCurrentUser();
    if (!user) return;

    setLoading(true);
    try {
      // contact_email is a new column - using type assertion until types regenerate
      await partyQueries.create({
        fraternity_id: formData.fraternity_id,
        user_id: user.id,
        title: formData.title,
        starts_at: formData.starts_at,
        ends_at: formData.ends_at,
        venue: formData.venue,
        theme: formData.type,
        access_type: formData.invite_only ? 'invite_only' : 'open',
        tags: [formData.type, formData.invite_only ? 'invite_only' : 'open'].filter(Boolean),
        display_photo_url: formData.cover_photo_url,
        performance_score: 0,
        quantifiable_score: 0,
        unquantifiable_score: 5,
        total_ratings: 0,
        status: 'pending',
        contact_email: formData.contact_email.trim(),
      } as any);

      resetForm();
      onOpenChange(false);
      onSuccess();
      
      // Show toast about pending approval
      const { toast } = await import('@/hooks/use-toast');
      toast({
        title: "Party submitted for review",
        description: "You'll be notified when it's approved.",
      });
    } catch (error) {
      console.error('Failed to create party:', error);
    } finally {
      setLoading(false);
    }
  };

  const selectedFrat = fraternities.find(f => f.id === formData.fraternity_id);

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent 
        className="max-h-[90vh] border-0 bg-transparent"
        handleClassName="bg-white/40"
      >
        <div 
          className="overflow-y-auto overflow-x-hidden pb-8 bg-background rounded-t-[10px]"
          style={{ 
            touchAction: 'pan-y', 
            overscrollBehavior: 'contain',
            WebkitOverflowScrolling: 'touch'
          }}
        >
          {showIntro ? (
            /* Intro Screen */
            <div className="p-6 space-y-6">
              <div className="text-center space-y-3">
                <div className="w-16 h-16 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
                  <PartyPopper className="h-8 w-8 text-primary" />
                </div>
                <h2 className="text-xl font-bold">Host a Party</h2>
                <p className="text-muted-foreground text-sm">
                  Submit your event for review and get it listed on campus.
                </p>
              </div>

              {/* Requirements */}
              <div className="space-y-3">
                <div className="flex items-start gap-3 p-3 rounded-xl bg-muted/50">
                  <Users className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                  <div>
                    <p className="font-medium text-sm">Must be affiliated with a fraternity</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Only registered Greek organizations can host parties on Touse.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-xl bg-muted/50">
                  <Clock className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                  <div>
                    <p className="font-medium text-sm">Approval within 48 hours</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Our team reviews all submissions to ensure quality and safety.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-xl bg-muted/50">
                  <Mail className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                  <div>
                    <p className="font-medium text-sm">Contact email required</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      We need a way to reach you about your submission.
                    </p>
                  </div>
                </div>
              </div>

              {/* Info box */}
              <div className="flex items-start gap-2 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
                <Info className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                <p className="text-xs text-amber-700">
                  By submitting, you confirm you are authorized to host events for the selected fraternity and agree to our community guidelines.
                </p>
              </div>

              <Button
                onClick={() => setShowIntro(false)}
                className="w-full h-12"
              >
                Continue to Form
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          ) : (
            <>
              {/* Header */}
              <div className="gradient-primary p-4 pt-2 text-primary-foreground rounded-t-[10px]">
                <DrawerHeader className="p-0">
                  <DrawerTitle className="text-lg font-semibold text-primary-foreground text-center">
                    Host a Party
                  </DrawerTitle>
                  
                  {/* Progress */}
                  <div className="mt-3 bg-white/10 rounded-xl p-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">Progress</span>
                      <span className="text-sm font-bold">{completedSteps}/5</span>
                    </div>
                    <div className="h-2 bg-white/20 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-white rounded-full transition-all duration-500"
                        style={{ width: `${(completedSteps / 5) * 100}%` }}
                      />
                    </div>
                  </div>
                </DrawerHeader>
              </div>

          <form onSubmit={handleSubmit} className="p-4 space-y-4">
            {/* Live Preview */}
            {(formData.title || selectedFrat || startDate || formData.cover_photo_url) && (
              <div className="p-4 rounded-xl bg-muted/50 border border-border">
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  <span className="text-xs font-medium text-muted-foreground">Preview</span>
                </div>
                <div className="flex gap-3">
                  {/* Cover Photo Preview */}
                  <div className="w-16 h-16 rounded-lg bg-muted flex-shrink-0 overflow-hidden">
                    {formData.cover_photo_url ? (
                      <img 
                        src={formData.cover_photo_url} 
                        alt="Cover preview" 
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <ImageIcon className="h-6 w-6 text-muted-foreground/50" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold truncate">{formData.title || 'Your Event'}</h3>
                    {selectedFrat && (
                      <p className="text-sm text-muted-foreground truncate">{selectedFrat.name}</p>
                    )}
                    <div className="flex flex-wrap gap-1.5 mt-1.5">
                      {startDate && (
                        <Badge variant="secondary" className="text-xs">
                          {format(startDate, 'MMM d')} • {startTime}
                        </Badge>
                      )}
                      {formData.type && (
                        <Badge variant="outline" className="capitalize text-xs">{formData.type}</Badge>
                      )}
                      <Badge 
                        variant="outline" 
                        className={cn(
                          "text-xs",
                          formData.invite_only 
                            ? "border-amber-500/50 text-amber-600" 
                            : "border-emerald-500/50 text-emerald-600"
                        )}
                      >
                        {formData.invite_only ? 'Invite Only' : 'Open'}
                      </Badge>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Host Fraternity */}
            <div className="space-y-2">
              <Label className="text-sm font-medium flex items-center gap-2">
                <Users className="h-4 w-4 text-primary" />
                Host Fraternity<span className="text-destructive">*</span>
              </Label>
              <Select
                value={formData.fraternity_id}
                onValueChange={(value) => setFormData(prev => ({ ...prev, fraternity_id: value }))}
              >
                <SelectTrigger className="h-12">
                  <SelectValue placeholder="Choose a fraternity" />
                </SelectTrigger>
                <SelectContent>
                  {fraternities.map((frat) => (
                    <SelectItem key={frat.id} value={frat.id}>
                      {frat.name} ({frat.chapter})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Party Name */}
            <div className="space-y-2">
              <Label className="text-sm font-medium flex items-center gap-2">
                <Music className="h-4 w-4 text-primary" />
                Party Name<span className="text-destructive">*</span>
              </Label>
              <Input
                placeholder="e.g., Spring Fling, Winter Formal..."
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                className="h-12"
              />
            </div>

            {/* Venue */}
            <div className="space-y-2">
              <Label className="text-sm font-medium flex items-center gap-2">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                Venue
              </Label>
              <Input
                placeholder="e.g., Chapter House..."
                value={formData.venue}
                onChange={(e) => setFormData(prev => ({ ...prev, venue: e.target.value }))}
                className="h-12"
              />
            </div>

            {/* Cover Photo Upload */}
            <div className="space-y-2">
              <Label className="text-sm font-medium flex items-center gap-2">
                <ImageIcon className="h-4 w-4 text-primary" />
                Cover Photo
              </Label>
              
              {/* Hidden file inputs */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handlePhotoUpload}
                className="hidden"
              />
              <input
                ref={cameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handlePhotoUpload}
                className="hidden"
              />
              
              {formData.cover_photo_url ? (
                <div className="relative w-full h-32 rounded-xl overflow-hidden border border-border">
                  <img 
                    src={formData.cover_photo_url} 
                    alt="Cover preview" 
                    className="w-full h-full object-cover"
                  />
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    className="absolute top-2 right-2 h-8 w-8"
                    onClick={() => setFormData(prev => ({ ...prev, cover_photo_url: '' }))}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1 h-14 flex flex-col gap-1"
                    onClick={() => cameraInputRef.current?.click()}
                    disabled={uploadingPhoto}
                  >
                    {uploadingPhoto ? (
                      <Loader2 className="h-5 w-5 animate-spin text-primary" />
                    ) : (
                      <>
                        <Camera className="h-5 w-5 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">Take Photo</span>
                      </>
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1 h-14 flex flex-col gap-1"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingPhoto}
                  >
                    {uploadingPhoto ? (
                      <Loader2 className="h-5 w-5 animate-spin text-primary" />
                    ) : (
                      <>
                        <Image className="h-5 w-5 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">Photo Library</span>
                      </>
                    )}
                  </Button>
                </div>
              )}
              <p className="text-xs text-muted-foreground">
                Add a photo to make your party stand out in the feed
              </p>
            </div>

            {/* Date & Time */}
            <div className="grid grid-cols-2 gap-3">
              {/* Start */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Start<span className="text-destructive">*</span></Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      type="button"
                      className={cn(
                        "w-full justify-start text-left font-normal h-10",
                        !startDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarDays className="h-4 w-4 mr-2" />
                      {startDate ? format(startDate, "MMM d") : "Date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={startDate}
                      onSelect={setStartDate}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <Input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="h-10"
                />
              </div>

              {/* End */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">End<span className="text-destructive">*</span></Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      type="button"
                      className={cn(
                        "w-full justify-start text-left font-normal h-10",
                        !endDate && "text-muted-foreground",
                        !isEndValid && endDate && "border-destructive"
                      )}
                    >
                      <CalendarDays className="h-4 w-4 mr-2" />
                      {endDate ? format(endDate, "MMM d") : "Date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={endDate}
                      onSelect={setEndDate}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <Input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className={cn("h-10", !isEndValid && endDate && "border-destructive")}
                />
              </div>
            </div>

            {!isEndValid && endDate && (
              <div className="flex items-center gap-2 text-sm text-destructive">
                <AlertCircle className="h-4 w-4" />
                <span>{endError}</span>
              </div>
            )}

            {/* Party Type */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Party Type</Label>
              <Select
                value={formData.type}
                onValueChange={(value) => setFormData(prev => ({ ...prev, type: value }))}
              >
                <SelectTrigger className="h-12">
                  <SelectValue placeholder="Select type (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="late-night">Late Night</SelectItem>
                  <SelectItem value="themed">Themed</SelectItem>
                  <SelectItem value="formal">Formal</SelectItem>
                  <SelectItem value="mixer">Mixer</SelectItem>
                  <SelectItem value="darty">Darty</SelectItem>
                  <SelectItem value="tailgate">Tailgate</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Access Type Toggle */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Access</Label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, invite_only: false }))}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-2 p-3 rounded-xl border transition-all",
                    !formData.invite_only 
                      ? "border-emerald-500 bg-emerald-500/10 text-emerald-700" 
                      : "border-border text-muted-foreground hover:border-emerald-500/50"
                  )}
                >
                  <Globe className="h-4 w-4" />
                  <span className="font-medium">Open</span>
                </button>
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, invite_only: true }))}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-2 p-3 rounded-xl border transition-all",
                    formData.invite_only 
                      ? "border-amber-500 bg-amber-500/10 text-amber-700" 
                      : "border-border text-muted-foreground hover:border-amber-500/50"
                  )}
                >
                  <Lock className="h-4 w-4" />
                  <span className="font-medium">Invite Only</span>
                </button>
              </div>
            </div>

            {/* Contact Email */}
            <div className="space-y-2">
              <Label className="text-sm font-medium flex items-center gap-2">
                <Mail className="h-4 w-4 text-primary" />
                Contact Email<span className="text-destructive">*</span>
              </Label>
              <Input
                type="email"
                placeholder="your.email@duke.edu"
                value={formData.contact_email}
                onChange={(e) => handleEmailChange(e.target.value)}
                className={cn("h-12", emailError && "border-destructive")}
              />
              {emailError && (
                <p className="text-xs text-destructive flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {emailError}
                </p>
              )}
              <p className="text-xs text-muted-foreground">
                We will contact you at this email about your submission.
              </p>
            </div>

            {/* Submit Button */}
            <div className="pt-2 space-y-3">
              <Button
                type="submit"
                disabled={!isFormValid || loading}
                className="w-full h-12 text-base font-semibold"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <PartyPopper className="h-5 w-5 mr-2" />
                    Submit for Approval
                  </>
                )}
              </Button>
              <p className="text-xs text-center text-muted-foreground">
                Your party will be reviewed within 48 hours.
              </p>
            </div>
          </form>
            </>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
}
