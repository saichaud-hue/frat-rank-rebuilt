-- Update admin_seed_party_rating to create a fake profile first
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
  
  -- Generate a fake user_id and create a profile for it
  v_fake_user_id := gen_random_uuid();
  
  -- Insert fake profile (to satisfy FK constraint)
  INSERT INTO profiles (id, email, full_name)
  VALUES (v_fake_user_id, 'seed_' || v_fake_user_id || '@fake.local', 'Seeded User')
  ON CONFLICT (id) DO NOTHING;
  
  -- Insert rating with the fake user
  INSERT INTO party_ratings (party_id, user_id, vibe_score, music_score, execution_score, party_quality_score)
  VALUES (p_party_id, v_fake_user_id, p_vibe, p_music, p_execution, p_party_quality)
  RETURNING id INTO v_id;
  
  RETURN v_id;
END;
$$;

-- Update admin_seed_reputation_rating to create a fake profile first
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
  
  -- Generate a fake user_id and create a profile for it
  v_fake_user_id := gen_random_uuid();
  
  -- Insert fake profile (to satisfy FK constraint)
  INSERT INTO profiles (id, email, full_name)
  VALUES (v_fake_user_id, 'seed_' || v_fake_user_id || '@fake.local', 'Seeded User')
  ON CONFLICT (id) DO NOTHING;
  
  -- Insert rating with the fake user (unique per fraternity+user now)
  INSERT INTO reputation_ratings (fraternity_id, user_id, brotherhood_score, community_score, reputation_score, combined_score)
  VALUES (p_fraternity_id, v_fake_user_id, p_brotherhood, p_community, p_reputation, p_combined)
  RETURNING id INTO v_id;
  
  RETURN v_id;
END;
$$;