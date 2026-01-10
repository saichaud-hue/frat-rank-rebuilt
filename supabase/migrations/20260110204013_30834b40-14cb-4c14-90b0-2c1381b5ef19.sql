-- Drop FK constraint on chat_messages.user_id to allow seeding with random user IDs
ALTER TABLE public.chat_messages DROP CONSTRAINT IF EXISTS chat_messages_user_id_fkey;

-- Create RPC function for admin chat seeding with random user IDs
CREATE OR REPLACE FUNCTION public.admin_seed_chat_message(
  p_text text
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
    RAISE EXCEPTION 'Only admins can seed chat messages';
  END IF;
  
  -- Generate a fake user_id
  v_fake_user_id := gen_random_uuid();
  
  -- Insert message with the fake user
  INSERT INTO chat_messages (text, user_id)
  VALUES (p_text, v_fake_user_id)
  RETURNING id INTO v_id;
  
  RETURN v_id;
END;
$$;