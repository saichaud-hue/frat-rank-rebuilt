-- Create user_streaks table to track activity streaks
CREATE TABLE public.user_streaks (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL UNIQUE,
  current_streak integer NOT NULL DEFAULT 0,
  longest_streak integer NOT NULL DEFAULT 0,
  last_activity_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_streaks ENABLE ROW LEVEL SECURITY;

-- Users can view their own streak
CREATE POLICY "Users can view their own streak" 
  ON public.user_streaks FOR SELECT 
  USING (auth.uid() = user_id);

-- Users can insert their own streak record
CREATE POLICY "Users can insert their own streak" 
  ON public.user_streaks FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own streak
CREATE POLICY "Users can update their own streak" 
  ON public.user_streaks FOR UPDATE 
  USING (auth.uid() = user_id);

-- Admins can view all streaks
CREATE POLICY "Admins can view all streaks" 
  ON public.user_streaks FOR SELECT 
  USING (is_admin());

-- Create trigger for updated_at
CREATE TRIGGER update_user_streaks_updated_at
  BEFORE UPDATE ON public.user_streaks
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Function to update user streak when they perform an action
CREATE OR REPLACE FUNCTION public.update_user_streak(p_user_id uuid)
RETURNS TABLE(new_streak integer, is_new_day boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_last_activity timestamp with time zone;
  v_current_streak integer;
  v_longest_streak integer;
  v_hours_since_activity numeric;
  v_is_new_day boolean := false;
BEGIN
  -- Get current streak data
  SELECT last_activity_at, current_streak, longest_streak
  INTO v_last_activity, v_current_streak, v_longest_streak
  FROM user_streaks
  WHERE user_id = p_user_id;
  
  -- If no record exists, create one
  IF NOT FOUND THEN
    INSERT INTO user_streaks (user_id, current_streak, longest_streak, last_activity_at)
    VALUES (p_user_id, 1, 1, now());
    
    RETURN QUERY SELECT 1, true;
    RETURN;
  END IF;
  
  -- Calculate hours since last activity
  v_hours_since_activity := EXTRACT(EPOCH FROM (now() - v_last_activity)) / 3600;
  
  -- If more than 48 hours (missed a full day), reset streak
  IF v_hours_since_activity > 48 THEN
    UPDATE user_streaks
    SET current_streak = 1, last_activity_at = now()
    WHERE user_id = p_user_id;
    
    RETURN QUERY SELECT 1, true;
    
  -- If between 24-48 hours, increment streak (new day)
  ELSIF v_hours_since_activity >= 24 THEN
    v_current_streak := v_current_streak + 1;
    v_is_new_day := true;
    
    -- Update longest streak if needed
    IF v_current_streak > v_longest_streak THEN
      v_longest_streak := v_current_streak;
    END IF;
    
    UPDATE user_streaks
    SET current_streak = v_current_streak, 
        longest_streak = v_longest_streak,
        last_activity_at = now()
    WHERE user_id = p_user_id;
    
    RETURN QUERY SELECT v_current_streak, v_is_new_day;
    
  -- If less than 24 hours, just update last_activity_at (same day)
  ELSE
    UPDATE user_streaks
    SET last_activity_at = now()
    WHERE user_id = p_user_id;
    
    RETURN QUERY SELECT v_current_streak, false;
  END IF;
END;
$$;

-- Function to check if streak is still valid (not expired)
CREATE OR REPLACE FUNCTION public.get_user_streak(p_user_id uuid)
RETURNS TABLE(current_streak integer, longest_streak integer, last_activity_at timestamp with time zone, streak_expires_at timestamp with time zone)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_last_activity timestamp with time zone;
  v_current_streak integer;
  v_longest_streak integer;
  v_hours_since_activity numeric;
BEGIN
  SELECT us.last_activity_at, us.current_streak, us.longest_streak
  INTO v_last_activity, v_current_streak, v_longest_streak
  FROM user_streaks us
  WHERE us.user_id = p_user_id;
  
  -- If no record, return 0
  IF NOT FOUND THEN
    RETURN QUERY SELECT 0, 0, NULL::timestamp with time zone, NULL::timestamp with time zone;
    RETURN;
  END IF;
  
  -- Calculate hours since last activity
  v_hours_since_activity := EXTRACT(EPOCH FROM (now() - v_last_activity)) / 3600;
  
  -- If more than 48 hours, streak has expired
  IF v_hours_since_activity > 48 THEN
    RETURN QUERY SELECT 0, v_longest_streak, v_last_activity, NULL::timestamp with time zone;
  ELSE
    -- Streak expires 48 hours after last activity
    RETURN QUERY SELECT v_current_streak, v_longest_streak, v_last_activity, v_last_activity + interval '48 hours';
  END IF;
END;
$$;