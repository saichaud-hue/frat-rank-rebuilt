
-- Drop the profiles_id_fkey constraint so we can have fake profiles
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_id_fkey;

-- Create an updated admin_seed_chat_message function that also creates a fake profile
CREATE OR REPLACE FUNCTION public.admin_seed_chat_message_with_username(p_text text, p_username text, p_upvotes integer DEFAULT 0, p_downvotes integer DEFAULT 0)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_id uuid;
  v_fake_user_id uuid;
BEGIN
  -- Generate a fake user_id
  v_fake_user_id := gen_random_uuid();
  
  -- Create a fake profile for this user
  INSERT INTO profiles (id, full_name, email)
  VALUES (v_fake_user_id, p_username, p_username || '@seed.local')
  ON CONFLICT (id) DO NOTHING;
  
  -- Insert message with the fake user and specified vote counts
  INSERT INTO chat_messages (text, user_id, upvotes, downvotes, created_at)
  VALUES (p_text, v_fake_user_id, p_upvotes, p_downvotes, now() - interval '3 hours')
  RETURNING id INTO v_id;
  
  RETURN v_id;
END;
$function$;
