import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { PartyPopper, AlertTriangle, Download, Camera, Trophy } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface Announcement {
  id: string;
  type: 'reset_complete' | 'reset_warning';
  title: string;
  message: string;
  semester_name: string;
  created_at: string;
  expires_at: string | null;
}

export function SemesterAnnouncementPopup() {
  const { user } = useAuth();
  const [announcement, setAnnouncement] = useState<Announcement | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (user) {
      checkForAnnouncements();
    }
  }, [user]);

  const checkForAnnouncements = async () => {
    if (!user) return;

    try {
      // Get all active announcements
      const { data: announcements, error: announcementsError } = await supabase
        .from('semester_announcements')
        .select('*')
        .or('expires_at.is.null,expires_at.gt.now()')
        .order('created_at', { ascending: false });

      if (announcementsError) {
        console.error('Error fetching announcements:', announcementsError);
        return;
      }

      if (!announcements || announcements.length === 0) return;

      // Get user's dismissed announcements
      const { data: dismissals, error: dismissalsError } = await supabase
        .from('user_dismissed_announcements')
        .select('announcement_id')
        .eq('user_id', user.id);

      if (dismissalsError) {
        console.error('Error fetching dismissals:', dismissalsError);
        return;
      }

      const dismissedIds = new Set(dismissals?.map(d => d.announcement_id) || []);

      // Find first non-dismissed announcement (prioritize reset_complete over warnings)
      const undismissed = announcements
        .filter(a => !dismissedIds.has(a.id))
        .sort((a, b) => {
          // Prioritize reset_complete
          if (a.type === 'reset_complete' && b.type !== 'reset_complete') return -1;
          if (b.type === 'reset_complete' && a.type !== 'reset_complete') return 1;
          return 0;
        });

      if (undismissed.length > 0) {
        setAnnouncement(undismissed[0] as Announcement);
        setOpen(true);
      }
    } catch (error) {
      console.error('Error checking announcements:', error);
    }
  };

  const handleDismiss = async () => {
    if (!user || !announcement) return;

    try {
      await supabase
        .from('user_dismissed_announcements')
        .insert({
          user_id: user.id,
          announcement_id: announcement.id
        });
    } catch (error) {
      console.error('Error dismissing announcement:', error);
    }

    setOpen(false);
    setAnnouncement(null);
  };

  if (!announcement) return null;

  const isResetComplete = announcement.type === 'reset_complete';

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleDismiss()}>
      <DialogContent className={`sm:max-w-md ${isResetComplete ? 'border-emerald-500/50' : 'border-amber-500/50'}`}>
        <DialogHeader className="text-center">
          <div className={`mx-auto mb-4 h-16 w-16 rounded-full flex items-center justify-center ${
            isResetComplete 
              ? 'bg-gradient-to-br from-emerald-500 to-teal-500' 
              : 'bg-gradient-to-br from-amber-500 to-orange-500'
          }`}>
            {isResetComplete ? (
              <PartyPopper className="h-8 w-8 text-white" />
            ) : (
              <AlertTriangle className="h-8 w-8 text-white" />
            )}
          </div>
          <DialogTitle className="text-xl">
            {announcement.title}
          </DialogTitle>
          <DialogDescription className="text-base pt-2">
            {announcement.message}
          </DialogDescription>
        </DialogHeader>

        {isResetComplete ? (
          <div className="space-y-3 py-4">
            <p className="text-sm text-muted-foreground text-center">
              All ratings, parties, photos, and comments have been cleared. 
              Fraternity scores are back to baseline.
            </p>
            <div className="bg-muted/50 rounded-lg p-4 text-center">
              <p className="text-sm font-medium">Ready to make new memories? 🎉</p>
              <p className="text-xs text-muted-foreground mt-1">
                Start rating parties and fraternities to build this semester's rankings!
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-3 py-4">
            <p className="text-sm font-medium text-center text-amber-600 dark:text-amber-400">
              Save your data before the reset!
            </p>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="bg-muted/50 rounded-lg p-3">
                <Camera className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
                <p className="text-xs">Screenshots</p>
              </div>
              <div className="bg-muted/50 rounded-lg p-3">
                <Trophy className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
                <p className="text-xs">Rankings</p>
              </div>
              <div className="bg-muted/50 rounded-lg p-3">
                <Download className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
                <p className="text-xs">Photos</p>
              </div>
            </div>
            <p className="text-xs text-muted-foreground text-center">
              Take screenshots of your favorite rankings and download any photos you want to keep.
            </p>
          </div>
        )}

        <DialogFooter>
          <Button 
            onClick={handleDismiss} 
            className={`w-full ${
              isResetComplete 
                ? 'bg-emerald-500 hover:bg-emerald-600' 
                : 'bg-amber-500 hover:bg-amber-600'
            }`}
          >
            {isResetComplete ? "Let's Go!" : "Got it, thanks!"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
