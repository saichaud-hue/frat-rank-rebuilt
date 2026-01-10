-- Drop existing functions
DROP FUNCTION IF EXISTS public.admin_seed_party_rating(uuid, numeric, numeric, numeric, numeric);
DROP FUNCTION IF EXISTS public.admin_seed_reputation_rating(uuid, numeric, numeric, numeric, numeric);

-- Recreate admin_seed_party_rating to use auth.uid() instead of random UUID
CREATE OR REPLACE FUNCTION public.admin_seed_party_rating(
  p_party_id uuid,
  p_vibe numeric,
  p_music numeric,
  p_execution numeric,
  p_party_quality numeric
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_id uuid;
  v_user_id uuid;
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Only admins can seed ratings';
  END IF;
  
  -- Use the admin's actual user_id to avoid FK violation
  v_user_id := auth.uid();
  
  -- Insert rating (allows duplicate user_id for seeding purposes)
  INSERT INTO party_ratings (party_id, user_id, vibe_score, music_score, execution_score, party_quality_score)
  VALUES (p_party_id, v_user_id, p_vibe, p_music, p_execution, p_party_quality)
  RETURNING id INTO v_id;
  
  RETURN v_id;
END;
$$;

-- Recreate admin_seed_reputation_rating to use auth.uid() instead of random UUID
CREATE OR REPLACE FUNCTION public.admin_seed_reputation_rating(
  p_fraternity_id uuid,
  p_brotherhood numeric,
  p_community numeric,
  p_reputation numeric,
  p_combined numeric
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_id uuid;
  v_user_id uuid;
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Only admins can seed ratings';
  END IF;
  
  -- Use the admin's actual user_id to avoid FK violation
  v_user_id := auth.uid();
  
  -- Insert rating (allows duplicate user_id for seeding purposes)
  INSERT INTO reputation_ratings (fraternity_id, user_id, brotherhood_score, community_score, reputation_score, combined_score)
  VALUES (p_fraternity_id, v_user_id, p_brotherhood, p_community, p_reputation, p_combined)
  RETURNING id INTO v_id;
  
  RETURN v_id;
END;
$$;