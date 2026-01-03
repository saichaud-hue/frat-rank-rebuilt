import { useState } from 'react';
import { Bell, Send, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export function AdminSemesterWarning() {
  const [title, setTitle] = useState('Semester Reset Coming Soon!');
  const [message, setMessage] = useState('The semester is ending soon. Make sure to screenshot your favorite rankings and download any photos you want to keep!');
  const [semesterName, setSemesterName] = useState(() => {
    const now = new Date();
    const month = now.getMonth();
    const year = now.getFullYear();
    const semester = month >= 0 && month <= 4 ? 'Spring' : 'Fall';
    return `${semester} ${year}`;
  });
  const [expiresInDays, setExpiresInDays] = useState(7);
  const [isSending, setIsSending] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const handleSendWarning = async () => {
    setIsSending(true);
    try {
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + expiresInDays);

      const { error } = await supabase
        .from('semester_announcements')
        .insert({
          type: 'reset_warning',
          title: title.trim(),
          message: message.trim(),
          semester_name: semesterName.trim(),
          expires_at: expiresAt.toISOString()
        });

      if (error) throw error;

      setShowSuccess(true);
      toast.success('Warning notification sent to all users!');
      
      // Reset form after a delay
      setTimeout(() => {
        setShowSuccess(false);
      }, 3000);
    } catch (error: any) {
      console.error('Error sending warning:', error);
      toast.error(error.message || 'Failed to send warning');
    } finally {
      setIsSending(false);
    }
  };

  if (showSuccess) {
    return (
      <Card className="border-emerald-500/50 bg-emerald-500/10">
        <CardContent className="pt-6">
          <div className="flex flex-col items-center gap-3 text-center">
            <div className="h-12 w-12 rounded-full bg-emerald-500 flex items-center justify-center">
              <Check className="h-6 w-6 text-white" />
            </div>
            <h3 className="font-semibold">Warning Sent!</h3>
            <p className="text-sm text-muted-foreground">
              All users will see this warning the next time they open the app.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Bell className="h-4 w-4" />
          Send Reset Warning
        </CardTitle>
        <CardDescription>
          Notify all users that a semester reset is coming so they can save their data.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="semester">Semester Name</Label>
          <Input
            id="semester"
            value={semesterName}
            onChange={(e) => setSemesterName(e.target.value)}
            placeholder="e.g., Spring 2026"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="title">Notification Title</Label>
          <Input
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Title..."
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="message">Message</Label>
          <Textarea
            id="message"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Message to users..."
            rows={3}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="expires">Expires in (days)</Label>
          <Input
            id="expires"
            type="number"
            min={1}
            max={30}
            value={expiresInDays}
            onChange={(e) => setExpiresInDays(parseInt(e.target.value) || 7)}
          />
          <p className="text-xs text-muted-foreground">
            Warning will auto-expire after this many days.
          </p>
        </div>

        <Button
          onClick={handleSendWarning}
          disabled={isSending || !title.trim() || !message.trim()}
          className="w-full"
        >
          {isSending ? (
            <>Sending...</>
          ) : (
            <>
              <Send className="h-4 w-4 mr-2" />
              Send Warning to All Users
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
