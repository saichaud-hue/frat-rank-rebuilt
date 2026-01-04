-- Add points column to user_streaks table (reusing it for both streak and points)
ALTER TABLE public.user_streaks 
ADD COLUMN IF NOT EXISTS total_points integer NOT NULL DEFAULT 0;

-- Create points history table to track point transactions
CREATE TABLE public.user_points_history (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  points integer NOT NULL,
  action_type text NOT NULL,
  description text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_points_history ENABLE ROW LEVEL SECURITY;

-- Users can view their own points history
CREATE POLICY "Users can view their own points history" 
  ON public.user_points_history FOR SELECT 
  USING (auth.uid() = user_id);

-- System can insert points (via function)
CREATE POLICY "Users can insert their own points" 
  ON public.user_points_history FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

-- Admins can view all
CREATE POLICY "Admins can view all points history" 
  ON public.user_points_history FOR SELECT 
  USING (is_admin());

-- Create index for faster queries
CREATE INDEX idx_user_points_history_user_id ON public.user_points_history(user_id);
CREATE INDEX idx_user_points_history_created_at ON public.user_points_history(created_at DESC);

-- Function to award points to a user
CREATE OR REPLACE FUNCTION public.award_points(
  p_user_id uuid,
  p_points integer,
  p_action_type text,
  p_description text DEFAULT NULL
)
RETURNS TABLE(new_total integer, points_awarded integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_new_total integer;
BEGIN
  -- Ensure user has a streak record (creates one if not exists)
  INSERT INTO user_streaks (user_id, current_streak, longest_streak, total_points)
  VALUES (p_user_id, 0, 0, 0)
  ON CONFLICT (user_id) DO NOTHING;
  
  -- Add points to user's total
  UPDATE user_streaks
  SET total_points = total_points + p_points
  WHERE user_id = p_user_id
  RETURNING total_points INTO v_new_total;
  
  -- Record the transaction
  INSERT INTO user_points_history (user_id, points, action_type, description)
  VALUES (p_user_id, p_points, p_action_type, p_description);
  
  RETURN QUERY SELECT v_new_total, p_points;
END;
$$;

-- Function to get user's total points
CREATE OR REPLACE FUNCTION public.get_user_points(p_user_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_points integer;
BEGIN
  SELECT total_points INTO v_points
  FROM user_streaks
  WHERE user_id = p_user_id;
  
  RETURN COALESCE(v_points, 0);
END;
$$;

-- Update get_user_streak to also return points
DROP FUNCTION IF EXISTS public.get_user_streak(uuid);
CREATE OR REPLACE FUNCTION public.get_user_streak(p_user_id uuid)
RETURNS TABLE(
  current_streak integer, 
  longest_streak integer, 
  last_activity_at timestamp with time zone, 
  streak_expires_at timestamp with time zone,
  total_points integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_last_activity timestamp with time zone;
  v_current_streak integer;
  v_longest_streak integer;
  v_total_points integer;
  v_hours_since_activity numeric;
BEGIN
  SELECT us.last_activity_at, us.current_streak, us.longest_streak, us.total_points
  INTO v_last_activity, v_current_streak, v_longest_streak, v_total_points
  FROM user_streaks us
  WHERE us.user_id = p_user_id;
  
  -- If no record, return 0s
  IF NOT FOUND THEN
    RETURN QUERY SELECT 0, 0, NULL::timestamp with time zone, NULL::timestamp with time zone, 0;
    RETURN;
  END IF;
  
  -- Calculate hours since last activity
  v_hours_since_activity := EXTRACT(EPOCH FROM (now() - v_last_activity)) / 3600;
  
  -- If more than 48 hours, streak has expired
  IF v_hours_since_activity > 48 THEN
    RETURN QUERY SELECT 0, v_longest_streak, v_last_activity, NULL::timestamp with time zone, v_total_points;
  ELSE
    -- Streak expires 48 hours after last activity
    RETURN QUERY SELECT v_current_streak, v_longest_streak, v_last_activity, v_last_activity + interval '48 hours', v_total_points;
  END IF;
END;
$$;