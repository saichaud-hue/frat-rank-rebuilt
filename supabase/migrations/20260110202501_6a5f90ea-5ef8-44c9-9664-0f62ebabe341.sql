-- Drop FK constraints on ratings tables to allow seeding with fake user_ids
-- These tables don't need strict FK enforcement for seeding purposes

-- Drop the FK constraint on party_ratings.user_id
ALTER TABLE public.party_ratings DROP CONSTRAINT IF EXISTS party_ratings_user_id_fkey;

-- Drop the FK constraint on reputation_ratings.user_id  
ALTER TABLE public.reputation_ratings DROP CONSTRAINT IF EXISTS reputation_ratings_user_id_fkey;

-- Update admin_seed_party_rating to NOT create fake profiles (not needed now)
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
  v_fake_user_id uuid;
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Only admins can seed ratings';
  END IF;
  
  -- Generate a fake user_id (no FK constraint now, so this works)
  v_fake_user_id := gen_random_uuid();
  
  -- Insert rating with the fake user
  INSERT INTO party_ratings (party_id, user_id, vibe_score, music_score, execution_score, party_quality_score)
  VALUES (p_party_id, v_fake_user_id, p_vibe, p_music, p_execution, p_party_quality)
  RETURNING id INTO v_id;
  
  RETURN v_id;
END;
$$;

-- Update admin_seed_reputation_rating to NOT create fake profiles
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
  v_fake_user_id uuid;
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Only admins can seed ratings';
  END IF;
  
  -- Generate a fake user_id (no FK constraint now, so this works)
  v_fake_user_id := gen_random_uuid();
  
  -- Insert rating with the fake user
  INSERT INTO reputation_ratings (fraternity_id, user_id, brotherhood_score, community_score, reputation_score, combined_score)
  VALUES (p_fraternity_id, v_fake_user_id, p_brotherhood, p_community, p_reputation, p_combined)
  RETURNING id INTO v_id;
  
  RETURN v_id;
END;
$$;