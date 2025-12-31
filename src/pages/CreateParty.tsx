import { useState, useEffect, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Plus, MapPin, Loader2, CalendarDays, AlertCircle, PartyPopper, Sparkles, ArrowLeft, Clock, Users, Music, Lock, Globe } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Badge } from '@/components/ui/badge';
import { base44, type Fraternity } from '@/api/base44Client';
import { createPageUrl, getFratShorthand } from '@/utils';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

export default function CreateParty() {
  const navigate = useNavigate();
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
  });

  // Date/time state
  const [startDate, setStartDate] = useState<Date | undefined>();
  const [startTime, setStartTime] = useState('20:00');
  const [endDate, setEndDate] = useState<Date | undefined>();
  const [endTime, setEndTime] = useState('23:00');

  useEffect(() => {
    loadFraternities();
  }, []);

  // Sync date/time to formData
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

  // Validation logic
  const { isEndValid, endError, isFormValid, completedSteps } = useMemo(() => {
    // Build start timestamp
    let startTimestamp: number | null = null;
    if (startDate) {
      const [h, m] = startTime.split(':').map(Number);
      const dt = new Date(startDate);
      dt.setHours(h, m, 0, 0);
      startTimestamp = dt.getTime();
    }

    // Build end timestamp
    let endTimestamp: number | null = null;
    if (endDate) {
      const [h, m] = endTime.split(':').map(Number);
      const dt = new Date(endDate);
      dt.setHours(h, m, 0, 0);
      endTimestamp = dt.getTime();
    }

    // Determine end validity and error message
    let isEndValid = true;
    let endError = '';

    if (!endDate) {
      isEndValid = false;
      endError = 'End date/time is required.';
    } else if (startTimestamp !== null && endTimestamp !== null && endTimestamp <= startTimestamp) {
      isEndValid = false;
      endError = 'Party end date must be after party start date.';
    }

    // Count completed steps for progress
    let completedSteps = 0;
    if (formData.fraternity_id) completedSteps++;
    if (formData.title.trim()) completedSteps++;
    if (startDate) completedSteps++;
    if (endDate && isEndValid) completedSteps++;

    // Form is valid if all required fields are present and end is valid
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
        tags: [formData.type, formData.invite_only ? 'invite_only' : 'open'].filter(Boolean),
        display_photo_url: '',
        performance_score: 0,
        quantifiable_score: 0,
        unquantifiable_score: 5,
        total_ratings: 0,
        status: 'upcoming',
      });

      navigate(createPageUrl('Parties'));
    } catch (error) {
      console.error('Failed to create party:', error);
    } finally {
      setLoading(false);
    }
  };

  const displayTitle = formData.title.trim() || 'Your Next Event';
  const selectedFrat = fraternities.find(f => f.id === formData.fraternity_id);

  return (
    <div className="max-w-2xl mx-auto space-y-5 pb-20">
      {/* Back Button */}
      <Button asChild variant="ghost" className="px-0 -mb-2">
        <Link 
          to={createPageUrl('Parties')}
          onClick={() => sessionStorage.setItem('fratrank_came_from_create_party', 'true')}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Parties
        </Link>
      </Button>

      {/* HERO HEADER */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-pink-500 via-rose-500 to-orange-500 p-6 text-white shadow-xl">
        {/* Background Effects */}
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-0 right-0 w-40 h-40 bg-white/30 rounded-full blur-3xl translate-x-10 -translate-y-10" />
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/30 rounded-full blur-3xl -translate-x-10 translate-y-10" />
        </div>
        
        <div className="relative">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
              <PartyPopper className="h-7 w-7" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Host a Party</h1>
              <p className="text-white/80 text-sm">Create an unforgettable event</p>
            </div>
          </div>

          {/* Progress Indicator */}
          <div className="mt-4 bg-white/10 rounded-xl p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Setup Progress</span>
              <span className="text-sm font-bold">{completedSteps}/4</span>
            </div>
            <div className="h-2 bg-white/20 rounded-full overflow-hidden">
              <div 
                className="h-full bg-white rounded-full transition-all duration-500"
                style={{ width: `${(completedSteps / 4) * 100}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* LIVE PREVIEW CARD */}
      <Card className="glass overflow-hidden">
        <div className="bg-gradient-to-r from-violet-600 to-purple-600 p-4 flex items-center gap-3 text-white">
          <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <h2 className="font-semibold">Live Preview</h2>
            <p className="text-xs opacity-80">See how your party will appear</p>
          </div>
        </div>
        <div className="p-5">
          <div className="flex items-start justify-between mb-3">
            <div>
              <h3 className="text-xl font-bold">{displayTitle}</h3>
              {selectedFrat && (
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="secondary" className="text-xs">
                    {getFratShorthand(selectedFrat.name)}
                  </Badge>
                  <span className="text-sm text-muted-foreground">{selectedFrat.name}</span>
                </div>
              )}
            </div>
            <Badge variant="outline" className="bg-emerald-50 text-emerald-600 border-emerald-200">
              Upcoming
            </Badge>
          </div>
          
          <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
            {startDate && (
              <span className="flex items-center gap-1.5 bg-muted px-3 py-1.5 rounded-full">
                <CalendarDays className="h-3.5 w-3.5" />
                {format(startDate, 'MMM d, yyyy')}
              </span>
            )}
            {startDate && (
              <span className="flex items-center gap-1.5 bg-muted px-3 py-1.5 rounded-full">
                <Clock className="h-3.5 w-3.5" />
                {startTime}
              </span>
            )}
            {formData.venue && (
              <span className="flex items-center gap-1.5 bg-muted px-3 py-1.5 rounded-full">
                <MapPin className="h-3.5 w-3.5" />
                {formData.venue}
              </span>
            )}
          </div>
          
          <div className="flex gap-2 mt-3">
            {formData.type && (
              <Badge variant="outline" className="capitalize">{formData.type}</Badge>
            )}
            <Badge 
              variant="outline" 
              className={formData.invite_only 
                ? "border-amber-500/50 text-amber-600 bg-amber-50" 
                : "border-emerald-500/50 text-emerald-600 bg-emerald-50"
              }
            >
              {formData.invite_only ? 'Invite Only' : 'Open'}
            </Badge>
          </div>
        </div>
      </Card>

      {/* FORM SECTIONS */}
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Section 1: Host */}
        <Card className="glass overflow-hidden">
          <div className="bg-gradient-to-r from-blue-500 to-cyan-500 p-4 flex items-center gap-3 text-white">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-semibold">Host Organization</h2>
              <p className="text-xs opacity-80">Select the hosting fraternity</p>
            </div>
            {formData.fraternity_id && (
              <Badge className="ml-auto bg-white/20 text-white border-white/30">✓</Badge>
            )}
          </div>
          <div className="p-5">
            <Select
              value={formData.fraternity_id}
              onValueChange={(value) => setFormData(prev => ({ ...prev, fraternity_id: value }))}
            >
              <SelectTrigger className="h-12 text-base">
                <SelectValue placeholder="Choose a fraternity" />
              </SelectTrigger>
              <SelectContent>
                {fraternities.map((frat) => (
                  <SelectItem key={frat.id} value={frat.id}>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{frat.name}</span>
                      <span className="text-muted-foreground">({frat.chapter})</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </Card>

        {/* Section 2: Event Details */}
        <Card className="glass overflow-hidden">
          <div className="bg-gradient-to-r from-amber-500 to-orange-500 p-4 flex items-center gap-3 text-white">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
              <Music className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-semibold">Event Details</h2>
              <p className="text-xs opacity-80">Name and describe your party</p>
            </div>
            {formData.title.trim() && (
              <Badge className="ml-auto bg-white/20 text-white border-white/30">✓</Badge>
            )}
          </div>
          <div className="p-5 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title" className="text-sm font-medium">
                Party Name<span className="text-destructive ml-0.5">*</span>
              </Label>
              <Input
                id="title"
                placeholder="e.g., Spring Fling, Winter Formal..."
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                className="h-12 text-base"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="venue" className="text-sm font-medium">
                Venue
              </Label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="venue"
                  className="pl-10 h-12 text-base"
                  placeholder="e.g., Chapter House, Rooftop Bar..."
                  value={formData.venue}
                  onChange={(e) => setFormData(prev => ({ ...prev, venue: e.target.value }))}
                />
              </div>
            </div>
          </div>
        </Card>

        {/* Section 3: Date & Time */}
        <Card className="glass overflow-hidden">
          <div className="bg-gradient-to-r from-emerald-500 to-teal-500 p-4 flex items-center gap-3 text-white">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
              <CalendarDays className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-semibold">Date & Time</h2>
              <p className="text-xs opacity-80">When is the party?</p>
            </div>
            {startDate && endDate && isEndValid && (
              <Badge className="ml-auto bg-white/20 text-white border-white/30">✓</Badge>
            )}
          </div>
          <div className="p-5 space-y-4">
            {/* Start */}
            <div className="space-y-2">
              <Label className="text-sm font-medium flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center text-xs font-bold">1</span>
                Start<span className="text-destructive ml-0.5">*</span>
              </Label>
              <div className="flex gap-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      type="button"
                      className={cn(
                        "flex-1 justify-start text-left font-normal h-12 text-base",
                        !startDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarDays className="h-4 w-4 mr-2 text-muted-foreground" />
                      {startDate ? format(startDate, "EEE, MMM d, yyyy") : "Select date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 bg-popover" align="start">
                    <Calendar
                      mode="single"
                      selected={startDate}
                      onSelect={setStartDate}
                      initialFocus
                      className="p-3 pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
                
                <div className="relative">
                  <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="w-32 h-12 pl-10 text-base"
                  />
                </div>
              </div>
            </div>

            {/* End */}
            <div className="space-y-2">
              <Label className="text-sm font-medium flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center text-xs font-bold">2</span>
                End<span className="text-destructive ml-0.5">*</span>
              </Label>
              <div className="flex gap-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      type="button"
                      className={cn(
                        "flex-1 justify-start text-left font-normal h-12 text-base",
                        !endDate && "text-muted-foreground",
                        !isEndValid && endDate && "border-destructive"
                      )}
                    >
                      <CalendarDays className="h-4 w-4 mr-2 text-muted-foreground" />
                      {endDate ? format(endDate, "EEE, MMM d, yyyy") : "Select date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 bg-popover" align="start">
                    <Calendar
                      mode="single"
                      selected={endDate}
                      onSelect={setEndDate}
                      initialFocus
                      className="p-3 pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
                
                <div className="relative">
                  <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className={cn(
                      "w-32 h-12 pl-10 text-base",
                      !isEndValid && endDate && "border-destructive"
                    )}
                  />
                </div>
              </div>
              
              {!isEndValid && endError && (
                <div className="flex items-center gap-1.5 text-destructive">
                  <AlertCircle className="h-3.5 w-3.5" />
                  <span className="text-sm">{endError}</span>
                </div>
              )}
            </div>
          </div>
        </Card>

        {/* Section 4: Party Style */}
        <Card className="glass overflow-hidden">
          <div className="bg-gradient-to-r from-violet-500 to-purple-500 p-4 flex items-center gap-3 text-white">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-semibold">Party Style</h2>
              <p className="text-xs opacity-80">Theme and access settings</p>
            </div>
          </div>
          <div className="p-5 space-y-4">
            {/* Type Selection */}
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
                      "p-4 rounded-xl border-2 transition-all text-center",
                      formData.type === value
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-muted-foreground/50"
                    )}
                  >
                    <span className="text-2xl block mb-1">{icon}</span>
                    <span className="text-sm font-medium">{label}</span>
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
                    "p-4 rounded-xl border-2 transition-all flex items-center gap-3",
                    !formData.invite_only
                      ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30"
                      : "border-border hover:border-muted-foreground/50"
                  )}
                >
                  <div className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center",
                    !formData.invite_only ? "bg-emerald-100 text-emerald-600" : "bg-muted text-muted-foreground"
                  )}>
                    <Globe className="h-5 w-5" />
                  </div>
                  <div className="text-left">
                    <p className="font-medium">Open</p>
                    <p className="text-xs text-muted-foreground">Anyone can attend</p>
                  </div>
                </button>
                
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, invite_only: true }))}
                  className={cn(
                    "p-4 rounded-xl border-2 transition-all flex items-center gap-3",
                    formData.invite_only
                      ? "border-amber-500 bg-amber-50 dark:bg-amber-950/30"
                      : "border-border hover:border-muted-foreground/50"
                  )}
                >
                  <div className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center",
                    formData.invite_only ? "bg-amber-100 text-amber-600" : "bg-muted text-muted-foreground"
                  )}>
                    <Lock className="h-5 w-5" />
                  </div>
                  <div className="text-left">
                    <p className="font-medium">Invite Only</p>
                    <p className="text-xs text-muted-foreground">Exclusive event</p>
                  </div>
                </button>
              </div>
            </div>
          </div>
        </Card>

        {/* Submit Button */}
        <Card className="glass overflow-hidden">
          <div className={cn(
            "p-4 transition-all",
            isFormValid 
              ? "bg-gradient-to-r from-pink-500 via-rose-500 to-orange-500" 
              : "bg-muted"
          )}>
            <Button 
              type="submit" 
              disabled={loading || !isFormValid}
              className={cn(
                "w-full h-14 text-lg font-semibold rounded-xl transition-all",
                isFormValid 
                  ? "bg-white text-rose-600 hover:bg-white/90 shadow-lg" 
                  : "bg-muted-foreground/20 text-muted-foreground"
              )}
            >
              {loading ? (
                <>
                  <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                  Creating Your Party...
                </>
              ) : (
                <>
                  <PartyPopper className="h-5 w-5 mr-2" />
                  {isFormValid ? "Launch Party!" : "Complete All Fields"}
                </>
              )}
            </Button>
            {!isFormValid && (
              <p className="text-center text-sm text-muted-foreground mt-2">
                Fill in all required fields to create your party
              </p>
            )}
          </div>
        </Card>
      </form>
    </div>
  );
}