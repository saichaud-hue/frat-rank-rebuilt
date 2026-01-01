import { useState, useEffect, useMemo, useRef } from 'react';
import { Plus, MapPin, Loader2, CalendarDays, AlertCircle, PartyPopper, Sparkles, Clock, Users, Music, Lock, Globe, ImageIcon, Upload, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Badge } from '@/components/ui/badge';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { base44, type Fraternity } from '@/api/base44Client';
import { getFratShorthand } from '@/utils';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface CreatePartySheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export default function CreatePartySheet({ open, onOpenChange, onSuccess }: CreatePartySheetProps) {
  const [fraternities, setFraternities] = useState<Fraternity[]>([]);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    fraternity_id: '',
    title: '',
    starts_at: '',
    ends_at: '',
    venue: '',
    type: '',
    invite_only: false,
    cover_photo_url: '',
  });

  const [startDate, setStartDate] = useState<Date | undefined>();
  const [startTime, setStartTime] = useState('20:00');
  const [endDate, setEndDate] = useState<Date | undefined>();
  const [endTime, setEndTime] = useState('23:00');
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      loadFraternities();
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

  const { isEndValid, endError, isFormValid, completedSteps } = useMemo(() => {
    let startTimestamp: number | null = null;
    if (startDate) {
      const [h, m] = startTime.split(':').map(Number);
      const dt = new Date(startDate);
      dt.setHours(h, m, 0, 0);
      startTimestamp = dt.getTime();
    }

    let endTimestamp: number | null = null;
    if (endDate) {
      const [h, m] = endTime.split(':').map(Number);
      const dt = new Date(endDate);
      dt.setHours(h, m, 0, 0);
      endTimestamp = dt.getTime();
    }

    let isEndValid = true;
    let endError = '';

    if (!endDate) {
      isEndValid = false;
      endError = 'End date/time is required.';
    } else if (startTimestamp !== null && endTimestamp !== null && endTimestamp <= startTimestamp) {
      isEndValid = false;
      endError = 'Party end must be after start.';
    }

    let completedSteps = 0;
    if (formData.fraternity_id) completedSteps++;
    if (formData.title.trim()) completedSteps++;
    if (startDate) completedSteps++;
    if (endDate && isEndValid) completedSteps++;

    const isFormValid = 
      !!formData.fraternity_id &&
      !!formData.title.trim() &&
      !!startDate &&
      !!endDate &&
      isEndValid;

    return { isEndValid, endError, isFormValid, completedSteps };
  }, [formData.fraternity_id, formData.title, startDate, startTime, endDate, endTime]);

  const loadFraternities = async () => {
    try {
      const data = await base44.entities.Fraternity.list();
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
    });
    setStartDate(undefined);
    setEndDate(undefined);
    setStartTime('20:00');
    setEndTime('23:00');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid) return;

    setLoading(true);
    try {
      await base44.entities.Party.create({
        fraternity_id: formData.fraternity_id,
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
        status: 'upcoming',
      });

      resetForm();
      onOpenChange(false);
      onSuccess();
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
                  <span className="text-sm font-bold">{completedSteps}/4</span>
                </div>
                <div className="h-2 bg-white/20 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-white rounded-full transition-all duration-500"
                    style={{ width: `${(completedSteps / 4) * 100}%` }}
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
              
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  
                  setUploadingPhoto(true);
                  try {
                    const { url } = await base44.integrations.Core.UploadFile({ file });
                    setFormData(prev => ({ ...prev, cover_photo_url: url }));
                  } catch (error) {
                    console.error('Failed to upload photo:', error);
                  } finally {
                    setUploadingPhoto(false);
                  }
                }}
              />
              
              {formData.cover_photo_url ? (
                <div className="relative w-full h-32 rounded-xl overflow-hidden border border-border">
                  <img 
                    src={formData.cover_photo_url} 
                    alt="Cover preview" 
                    className="w-full h-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, cover_photo_url: '' }))}
                    className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/60 flex items-center justify-center hover:bg-black/80 transition-colors"
                  >
                    <X className="h-4 w-4 text-white" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingPhoto}
                  className="w-full h-24 rounded-xl border-2 border-dashed border-border hover:border-primary/50 transition-colors flex flex-col items-center justify-center gap-2 text-muted-foreground hover:text-foreground"
                >
                  {uploadingPhoto ? (
                    <>
                      <Loader2 className="h-6 w-6 animate-spin" />
                      <span className="text-sm">Uploading...</span>
                    </>
                  ) : (
                    <>
                      <Upload className="h-6 w-6" />
                      <span className="text-sm font-medium">Upload Cover Photo</span>
                    </>
                  )}
                </button>
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
            
            {!isEndValid && endError && (
              <div className="flex items-center gap-1.5 text-destructive text-sm">
                <AlertCircle className="h-3.5 w-3.5" />
                <span>{endError}</span>
              </div>
            )}

            {/* Event Type */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Event Type</Label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { value: 'themed', label: 'Themed', icon: '🎭' },
                  { value: 'formal', label: 'Formal', icon: '🎩' },
                  { value: 'mixer', label: 'Mixer', icon: '🍹' },
                ].map(({ value, label, icon }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, type: value }))}
                    className={cn(
                      "p-3 rounded-xl border-2 transition-all text-center",
                      formData.type === value
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-muted-foreground/50"
                    )}
                  >
                    <span className="text-xl block">{icon}</span>
                    <span className="text-xs font-medium">{label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Access Type */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Access</Label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, invite_only: false }))}
                  className={cn(
                    "p-3 rounded-xl border-2 transition-all flex items-center gap-2",
                    !formData.invite_only
                      ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30"
                      : "border-border"
                  )}
                >
                  <Globe className={cn("h-5 w-5", !formData.invite_only ? "text-emerald-600" : "text-muted-foreground")} />
                  <span className="font-medium text-sm">Open</span>
                </button>
                
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, invite_only: true }))}
                  className={cn(
                    "p-3 rounded-xl border-2 transition-all flex items-center gap-2",
                    formData.invite_only
                      ? "border-amber-500 bg-amber-50 dark:bg-amber-950/30"
                      : "border-border"
                  )}
                >
                  <Lock className={cn("h-5 w-5", formData.invite_only ? "text-amber-600" : "text-muted-foreground")} />
                  <span className="font-medium text-sm">Invite Only</span>
                </button>
              </div>
            </div>

            {/* Submit */}
            <Button 
              type="submit" 
              disabled={loading || !isFormValid}
              className={cn(
                "w-full h-14 text-lg font-semibold rounded-xl",
                isFormValid 
                  ? "gradient-primary text-primary-foreground" 
                  : "bg-muted text-muted-foreground"
              )}
            >
              {loading ? (
                <>
                  <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <PartyPopper className="h-5 w-5 mr-2" />
                  {isFormValid ? "Launch Party!" : "Complete All Fields"}
                </>
              )}
            </Button>
          </form>
        </div>
      </DrawerContent>
    </Drawer>
  );
}