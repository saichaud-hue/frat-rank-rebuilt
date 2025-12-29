import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, MapPin, Loader2, CalendarDays } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { base44, type Fraternity } from '@/api/base44Client';
import { createPageUrl } from '@/utils';
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
    if (!formData.fraternity_id || !formData.title || !formData.starts_at) return;

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

  const displayTitle = formData.title.trim() || 'Untitled Party';

  // Format time for display
  const formatTimeDisplay = (time: string) => {
    const [h, m] = time.split(':').map(Number);
    const period = h >= 12 ? 'PM' : 'AM';
    const hour = h % 12 || 12;
    return `${hour}:${m.toString().padStart(2, '0')} ${period}`;
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Dynamic Header */}
      <div className="space-y-1">
        <h1 className="text-3xl font-semibold text-foreground tracking-tight transition-all duration-200">
          {displayTitle}
        </h1>
        <p className="text-sm text-muted-foreground">Create a new party proposal</p>
      </div>

      <Card className="glass p-6 space-y-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Fraternity */}
          <div className="space-y-2">
            <Label htmlFor="fraternity">Fraternity</Label>
            <Select
              value={formData.fraternity_id}
              onValueChange={(value) => setFormData(prev => ({ ...prev, fraternity_id: value }))}
            >
              <SelectTrigger className="h-11">
                <SelectValue placeholder="Select fraternity" />
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

          {/* Party Title - De-emphasized */}
          <div className="space-y-2">
            <Label htmlFor="title" className="text-muted-foreground text-sm">Party Title</Label>
            <Input
              id="title"
              placeholder="Enter party name..."
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              className="border-dashed border-muted-foreground/30 focus:border-primary bg-transparent"
            />
          </div>

          {/* Date/Time - Modern Grouped Design */}
          <div className="space-y-4">
            <Label className="text-sm">Date & Time</Label>
            
            <div className="rounded-xl border border-border/50 bg-card/50 p-4 space-y-4">
              {/* Start */}
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary">
                  <CalendarDays className="h-4 w-4" />
                </div>
                <div className="flex-1">
                  <p className="text-xs text-muted-foreground mb-1.5">Start</p>
                  <div className="flex gap-2">
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          type="button"
                          className={cn(
                            "flex-1 justify-start text-left font-normal h-10 rounded-full px-4",
                            !startDate && "text-muted-foreground"
                          )}
                        >
                          {startDate ? format(startDate, "EEE, MMM d") : "Select date"}
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
                    
                    <Input
                      type="time"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      className="w-28 h-10 rounded-full text-center"
                    />
                  </div>
                </div>
              </div>

              {/* Divider */}
              <div className="border-t border-border/30 mx-8" />

              {/* End */}
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-muted text-muted-foreground">
                  <CalendarDays className="h-4 w-4" />
                </div>
                <div className="flex-1">
                  <p className="text-xs text-muted-foreground mb-1.5">End</p>
                  <div className="flex gap-2">
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          type="button"
                          className={cn(
                            "flex-1 justify-start text-left font-normal h-10 rounded-full px-4",
                            !endDate && "text-muted-foreground"
                          )}
                        >
                          {endDate ? format(endDate, "EEE, MMM d") : "Select date"}
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
                    
                    <Input
                      type="time"
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                      className="w-28 h-10 rounded-full text-center"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Venue */}
          <div className="space-y-2">
            <Label htmlFor="venue">Venue</Label>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="venue"
                className="pl-10 h-11"
                placeholder="e.g., Chapter House"
                value={formData.venue}
                onChange={(e) => setFormData(prev => ({ ...prev, venue: e.target.value }))}
              />
            </div>
          </div>

          {/* Type & Invite Only Row */}
          <div className="grid grid-cols-2 gap-4">
            {/* Type */}
            <div className="space-y-2">
              <Label htmlFor="type">Type</Label>
              <Select
                value={formData.type}
                onValueChange={(value) => setFormData(prev => ({ ...prev, type: value }))}
              >
                <SelectTrigger className="h-11">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="themed">Themed</SelectItem>
                  <SelectItem value="formal">Formal</SelectItem>
                  <SelectItem value="mixer">Mixer</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Invite Only Checkbox */}
            <div className="space-y-2">
              <span className="text-sm font-medium opacity-0">Access</span>
              <Label 
                htmlFor="invite-only"
                className={cn(
                  "flex items-center gap-3 h-11 px-4 rounded-md border cursor-pointer transition-all",
                  formData.invite_only 
                    ? "border-primary bg-primary/5" 
                    : "border-border hover:border-muted-foreground/50"
                )}
              >
                <Checkbox 
                  id="invite-only"
                  checked={formData.invite_only}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, invite_only: checked === true }))}
                />
                <span className="text-sm font-medium">Invite only</span>
              </Label>
            </div>
          </div>

          {/* Submit */}
          <Button 
            type="submit" 
            disabled={loading || !formData.fraternity_id || !formData.title || !formData.starts_at}
            className="w-full h-12 text-base gradient-primary text-white rounded-xl"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <Plus className="h-4 w-4 mr-2" />
                Create Party
              </>
            )}
          </Button>
        </form>
      </Card>
    </div>
  );
}
