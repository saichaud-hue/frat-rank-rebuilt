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
import { fraternityQueries, partyQueries, getCurrentUser, type Fraternity } from '@/lib/supabase-data';
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
    });
    setStartDate(undefined);
    setEndDate(undefined);
    setStartTime('20:00');
    setEndTime('23:00');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid) return;

    const user = await getCurrentUser();
    if (!user) return;

    setLoading(true);
    try {
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
      });

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

            {/* Cover Photo Upload - simplified without file upload for now */}
            <div className="space-y-2">
              <Label className="text-sm font-medium flex items-center gap-2">
                <ImageIcon className="h-4 w-4 text-primary" />
                Cover Photo URL
              </Label>
              <Input
                placeholder="https://example.com/image.jpg"
                value={formData.cover_photo_url}
                onChange={(e) => setFormData(prev => ({ ...prev, cover_photo_url: e.target.value }))}
                className="h-12"
              />
              <p className="text-xs text-muted-foreground">
                Add a photo URL to make your party stand out in the feed
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
                  <SelectItem value="casual">Casual</SelectItem>
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

            {/* Submit Button */}
            <Button
              type="submit"
              disabled={!isFormValid || loading}
              className="w-full h-12 text-base font-semibold"
            >
              {loading ? (
                <>
                  <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <PartyPopper className="h-5 w-5 mr-2" />
                  Host Party
                </>
              )}
            </Button>
          </form>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
