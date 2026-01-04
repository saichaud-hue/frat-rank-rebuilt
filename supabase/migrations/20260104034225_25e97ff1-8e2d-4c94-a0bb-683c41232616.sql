-- Create admin seeding function for party ratings
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
SET search_path = public
AS $$
DECLARE
  v_id uuid;
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Only admins can seed ratings';
  END IF;
  
  INSERT INTO party_ratings (party_id, user_id, vibe_score, music_score, execution_score, party_quality_score)
  VALUES (p_party_id, gen_random_uuid(), p_vibe, p_music, p_execution, p_party_quality)
  RETURNING id INTO v_id;
  
  RETURN v_id;
END;
$$;

-- Create admin seeding function for reputation ratings
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
SET search_path = public
AS $$
DECLARE
  v_id uuid;
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Only admins can seed ratings';
  END IF;
  
  INSERT INTO reputation_ratings (fraternity_id, user_id, brotherhood_score, community_score, reputation_score, combined_score)
  VALUES (p_fraternity_id, gen_random_uuid(), p_brotherhood, p_community, p_reputation, p_combined)
  RETURNING id INTO v_id;
  
  RETURN v_id;
END;
$$;

-- Lock down function execution to authenticated users only
REVOKE EXECUTE ON FUNCTION public.admin_seed_party_rating FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.admin_seed_reputation_rating FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_seed_party_rating TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_seed_reputation_rating TO authenticated;