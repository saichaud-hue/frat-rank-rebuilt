-- Create blocked_users table to track banned users
CREATE TABLE public.blocked_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  blocked_by UUID NOT NULL,
  reason TEXT,
  blocked_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(user_id)
);

-- Create user_offenses table to track repeat offenders
CREATE TABLE public.user_offenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  offense_type TEXT NOT NULL, -- 'fake_party', 'inappropriate_comment', 'inappropriate_post', 'other'
  description TEXT,
  content_id UUID, -- reference to the offending content
  content_type TEXT, -- 'party', 'comment', 'post'
  recorded_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.blocked_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_offenses ENABLE ROW LEVEL SECURITY;

-- RLS policies for blocked_users - only admins can manage
CREATE POLICY "Admins can view blocked users"
ON public.blocked_users FOR SELECT
USING (public.is_admin());

CREATE POLICY "Admins can block users"
ON public.blocked_users FOR INSERT
WITH CHECK (public.is_admin());

CREATE POLICY "Admins can update blocked users"
ON public.blocked_users FOR UPDATE
USING (public.is_admin());

CREATE POLICY "Admins can unblock users"
ON public.blocked_users FOR DELETE
USING (public.is_admin());

-- RLS policies for user_offenses - only admins can manage
CREATE POLICY "Admins can view user offenses"
ON public.user_offenses FOR SELECT
USING (public.is_admin());

CREATE POLICY "Admins can record offenses"
ON public.user_offenses FOR INSERT
WITH CHECK (public.is_admin());

CREATE POLICY "Admins can update offenses"
ON public.user_offenses FOR UPDATE
USING (public.is_admin());

CREATE POLICY "Admins can delete offenses"
ON public.user_offenses FOR DELETE
USING (public.is_admin());

-- Create a function to check if a user is blocked
CREATE OR REPLACE FUNCTION public.is_user_blocked(check_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.blocked_users
    WHERE user_id = check_user_id
    AND (expires_at IS NULL OR expires_at > now())
  );
$$;