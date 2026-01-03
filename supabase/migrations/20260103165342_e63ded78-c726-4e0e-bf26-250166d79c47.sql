-- Table to store semester-wide announcements
CREATE TABLE public.semester_announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL CHECK (type IN ('reset_complete', 'reset_warning')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  semester_name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.semester_announcements ENABLE ROW LEVEL SECURITY;

-- Anyone can view active announcements
CREATE POLICY "Anyone can view announcements"
ON public.semester_announcements
FOR SELECT
USING (true);

-- Only admins can create announcements
CREATE POLICY "Admins can create announcements"
ON public.semester_announcements
FOR INSERT
WITH CHECK (is_admin());

-- Only admins can delete announcements
CREATE POLICY "Admins can delete announcements"
ON public.semester_announcements
FOR DELETE
USING (is_admin());

-- Table to track which users have dismissed which announcements
CREATE TABLE public.user_dismissed_announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  announcement_id UUID NOT NULL REFERENCES public.semester_announcements(id) ON DELETE CASCADE,
  dismissed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, announcement_id)
);

-- Enable RLS
ALTER TABLE public.user_dismissed_announcements ENABLE ROW LEVEL SECURITY;

-- Users can view their own dismissals
CREATE POLICY "Users can view their own dismissals"
ON public.user_dismissed_announcements
FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert their own dismissals
CREATE POLICY "Users can dismiss announcements"
ON public.user_dismissed_announcements
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can delete their own dismissals (in case we need to re-show)
CREATE POLICY "Users can delete their own dismissals"
ON public.user_dismissed_announcements
FOR DELETE
USING (auth.uid() = user_id);