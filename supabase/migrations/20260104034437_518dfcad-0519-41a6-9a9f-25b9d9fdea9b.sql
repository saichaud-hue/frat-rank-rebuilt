-- 1. Create is_moderator() function
CREATE OR REPLACE FUNCTION public.is_moderator()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = auth.uid()
      AND role IN ('admin', 'moderator')
  );
$$;

-- Lock down function execution
REVOKE EXECUTE ON FUNCTION public.is_moderator() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_moderator() TO authenticated;

-- 2. Create content_reports table
CREATE TABLE public.content_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id uuid NOT NULL,
  content_type text NOT NULL CHECK (content_type IN ('chat_message', 'party_comment', 'fraternity_comment', 'party_photo', 'party')),
  content_id uuid NOT NULL,
  reason text NOT NULL CHECK (reason IN ('spam', 'harassment', 'inappropriate', 'misinformation', 'other')),
  description text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'resolved', 'dismissed')),
  reviewed_by uuid,
  reviewed_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.content_reports ENABLE ROW LEVEL SECURITY;

-- Reports policies
CREATE POLICY "Authenticated users can create reports"
ON public.content_reports FOR INSERT
WITH CHECK (auth.uid() = reporter_id);

CREATE POLICY "Users can view their own reports"
ON public.content_reports FOR SELECT
USING (auth.uid() = reporter_id);

CREATE POLICY "Moderators can view all reports"
ON public.content_reports FOR SELECT
USING (is_moderator());

CREATE POLICY "Moderators can update reports"
ON public.content_reports FOR UPDATE
USING (is_moderator());

-- 3. Create audit_logs table
CREATE TABLE public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid NOT NULL,
  action text NOT NULL,
  target_type text NOT NULL,
  target_id uuid,
  details jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view audit logs"
ON public.audit_logs FOR SELECT
USING (is_admin());

CREATE POLICY "Moderators can create audit logs"
ON public.audit_logs FOR INSERT
WITH CHECK (is_moderator() AND auth.uid() = actor_id);

-- 4. Create rate_limits table and functions
CREATE TABLE public.rate_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  action_type text NOT NULL,
  window_start timestamp with time zone NOT NULL DEFAULT now(),
  count integer NOT NULL DEFAULT 1
);

ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own rate limits"
ON public.rate_limits FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own rate limits"
ON public.rate_limits FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own rate limits"
ON public.rate_limits FOR UPDATE
USING (auth.uid() = user_id);

-- Rate limit check function
CREATE OR REPLACE FUNCTION public.check_rate_limit(
  p_action_type text,
  p_limit integer,
  p_window_minutes integer
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer;
  v_window_start timestamp with time zone;
BEGIN
  v_window_start := now() - (p_window_minutes || ' minutes')::interval;
  
  SELECT COALESCE(SUM(count), 0) INTO v_count
  FROM public.rate_limits
  WHERE user_id = auth.uid()
    AND action_type = p_action_type
    AND window_start >= v_window_start;
  
  RETURN v_count < p_limit;
END;
$$;

-- Record rate limit function
CREATE OR REPLACE FUNCTION public.record_rate_limit(p_action_type text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.rate_limits (user_id, action_type, window_start, count)
  VALUES (auth.uid(), p_action_type, now(), 1);
END;
$$;

-- Lock down rate limit functions
REVOKE EXECUTE ON FUNCTION public.check_rate_limit FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.record_rate_limit FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.check_rate_limit TO authenticated;
GRANT EXECUTE ON FUNCTION public.record_rate_limit TO authenticated;

-- 5. Create allowed_file_types table
CREATE TABLE public.allowed_file_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mime_type text NOT NULL UNIQUE,
  extension text NOT NULL,
  max_size_bytes bigint NOT NULL,
  enabled boolean NOT NULL DEFAULT true
);

ALTER TABLE public.allowed_file_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view allowed file types"
ON public.allowed_file_types FOR SELECT
USING (true);

-- Populate allowed file types
INSERT INTO public.allowed_file_types (mime_type, extension, max_size_bytes) VALUES
  ('image/jpeg', 'jpg', 10485760),
  ('image/png', 'png', 10485760),
  ('image/webp', 'webp', 10485760),
  ('image/gif', 'gif', 5242880),
  ('image/heic', 'heic', 10485760);

-- 6. Add soft-delete columns to content tables
ALTER TABLE public.chat_messages 
  ADD COLUMN IF NOT EXISTS deleted_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS deleted_by uuid;

ALTER TABLE public.party_comments 
  ADD COLUMN IF NOT EXISTS deleted_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS deleted_by uuid;

ALTER TABLE public.fraternity_comments 
  ADD COLUMN IF NOT EXISTS deleted_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS deleted_by uuid;

ALTER TABLE public.party_photos 
  ADD COLUMN IF NOT EXISTS deleted_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS deleted_by uuid;

ALTER TABLE public.parties 
  ADD COLUMN IF NOT EXISTS deleted_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS deleted_by uuid;

-- Add locked column to chat_messages for thread locking
ALTER TABLE public.chat_messages 
  ADD COLUMN IF NOT EXISTS locked boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS locked_by uuid,
  ADD COLUMN IF NOT EXISTS locked_at timestamp with time zone;

-- 7. Update SELECT policies to filter soft-deleted content (drop and recreate)
DROP POLICY IF EXISTS "Anyone can view chat messages" ON public.chat_messages;
CREATE POLICY "Anyone can view chat messages"
ON public.chat_messages FOR SELECT
USING (deleted_at IS NULL OR is_moderator());

DROP POLICY IF EXISTS "Anyone can view party comments" ON public.party_comments;
CREATE POLICY "Anyone can view party comments"
ON public.party_comments FOR SELECT
USING (deleted_at IS NULL OR is_moderator());

DROP POLICY IF EXISTS "Anyone can view fraternity comments" ON public.fraternity_comments;
CREATE POLICY "Anyone can view fraternity comments"
ON public.fraternity_comments FOR SELECT
USING (deleted_at IS NULL OR is_moderator());

DROP POLICY IF EXISTS "Anyone can view party photos" ON public.party_photos;
CREATE POLICY "Anyone can view party photos"
ON public.party_photos FOR SELECT
USING (deleted_at IS NULL OR is_moderator());

-- 8. Add moderator UPDATE policies for soft-delete
CREATE POLICY "Moderators can soft-delete chat messages"
ON public.chat_messages FOR UPDATE
USING (is_moderator());

CREATE POLICY "Moderators can soft-delete party comments"
ON public.party_comments FOR UPDATE
USING (is_moderator());

CREATE POLICY "Moderators can soft-delete fraternity comments"
ON public.fraternity_comments FOR UPDATE
USING (is_moderator());

CREATE POLICY "Moderators can soft-delete party photos"
ON public.party_photos FOR UPDATE
USING (is_moderator());

CREATE POLICY "Moderators can soft-delete parties"
ON public.parties FOR UPDATE
USING (is_moderator());