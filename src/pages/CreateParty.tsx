import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Calendar, MapPin, Tag, Loader2 } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { base44, type Fraternity } from '@/api/base44Client';
import { createPageUrl } from '@/utils';

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
    theme: '',
  });

  useEffect(() => {
    loadFraternities();
  }, []);

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
        ...formData,
        tags: formData.theme ? [formData.theme] : [],
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

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Plus className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold gradient-text">Create Party</h1>
      </div>

      <Card className="glass p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Fraternity */}
          <div className="space-y-2">
            <Label htmlFor="fraternity">Fraternity *</Label>
            <Select
              value={formData.fraternity_id}
              onValueChange={(value) => setFormData(prev => ({ ...prev, fraternity_id: value }))}
            >
              <SelectTrigger>
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

          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Party Title *</Label>
            <Input
              id="title"
              placeholder="e.g., Spring Formal 2024"
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              required
            />
          </div>

          {/* Date/Time */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="starts_at">Start Date/Time *</Label>
              <Input
                id="starts_at"
                type="datetime-local"
                value={formData.starts_at}
                onChange={(e) => setFormData(prev => ({ ...prev, starts_at: e.target.value }))}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ends_at">End Date/Time</Label>
              <Input
                id="ends_at"
                type="datetime-local"
                value={formData.ends_at}
                onChange={(e) => setFormData(prev => ({ ...prev, ends_at: e.target.value }))}
              />
            </div>
          </div>

          {/* Venue */}
          <div className="space-y-2">
            <Label htmlFor="venue">Venue</Label>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="venue"
                className="pl-10"
                placeholder="e.g., Chapter House"
                value={formData.venue}
                onChange={(e) => setFormData(prev => ({ ...prev, venue: e.target.value }))}
              />
            </div>
          </div>

          {/* Theme */}
          <div className="space-y-2">
            <Label htmlFor="theme">Theme</Label>
            <Select
              value={formData.theme}
              onValueChange={(value) => setFormData(prev => ({ ...prev, theme: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select theme" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="formal">Formal</SelectItem>
                <SelectItem value="casual">Casual</SelectItem>
                <SelectItem value="themed">Themed</SelectItem>
                <SelectItem value="mixer">Mixer</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Submit */}
          <Button 
            type="submit" 
            disabled={loading || !formData.fraternity_id || !formData.title || !formData.starts_at}
            className="w-full gradient-primary text-white"
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
