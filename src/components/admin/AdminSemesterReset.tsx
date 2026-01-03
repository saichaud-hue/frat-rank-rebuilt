import { useState } from 'react';
import { AlertTriangle, RotateCcw, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { AdminSemesterWarning } from './AdminSemesterWarning';

export function AdminSemesterReset() {
  const [isResetting, setIsResetting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const handleReset = async () => {
    setIsResetting(true);
    try {
      const { data, error } = await supabase.functions.invoke('semester-reset', {
        body: { confirm: true },
      });

      if (error) {
        throw error;
      }

      if (data?.success) {
        setShowSuccess(true);
        toast.success('Semester reset completed successfully!');
      } else {
        throw new Error(data?.error || 'Reset failed');
      }
    } catch (error: any) {
      console.error('Semester reset error:', error);
      toast.error(error.message || 'Failed to reset semester');
    } finally {
      setIsResetting(false);
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
            <h3 className="font-semibold text-lg">Semester Reset Complete</h3>
            <p className="text-sm text-muted-foreground">
              All ratings, parties, photos, comments, and chat have been cleared. 
              Fraternity scores have been reset to defaults.
            </p>
            <Button 
              variant="outline" 
              className="mt-2"
              onClick={() => setShowSuccess(false)}
            >
              Done
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Warning Notification Section */}
      <AdminSemesterWarning />

      {/* Danger Zone */}
      <div className="space-y-4">
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Danger Zone</AlertTitle>
        <AlertDescription>
          This action is irreversible. All data will be permanently deleted.
        </AlertDescription>
      </Alert>

      <Card className="border-destructive/50">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <RotateCcw className="h-4 w-4" />
            Semester Reset
          </CardTitle>
          <CardDescription>
            Reset the app to a fresh state for the new semester. This will delete:
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
            <li>All party ratings</li>
            <li>All reputation ratings</li>
            <li>All parties (past, upcoming, live)</li>
            <li>All party photos</li>
            <li>All party comments</li>
            <li>All fraternity comments</li>
            <li>All chat messages & votes</li>
            <li>All move votes</li>
            <li>All attendance records</li>
          </ul>

          <div className="pt-2 border-t">
            <p className="text-sm text-muted-foreground mb-1">
              Fraternity scores will be reset to defaults (5.0).
            </p>
            <p className="text-sm font-medium text-foreground">
              User accounts will be preserved.
            </p>
          </div>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="destructive"
                className="w-full"
                disabled={isResetting}
              >
                {isResetting ? (
                  <>
                    <RotateCcw className="h-4 w-4 mr-2 animate-spin" />
                    Resetting...
                  </>
                ) : (
                  <>
                    <RotateCcw className="h-4 w-4 mr-2" />
                    Reset Semester
                  </>
                )}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Confirm semester reset</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently delete this semester’s parties, ratings, photos, comments, chat, votes, and attendance.
                  User accounts will remain.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={isResetting}>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleReset}
                  disabled={isResetting}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Yes, reset now
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardContent>
      </Card>
      </div>
    </div>
  );
}
