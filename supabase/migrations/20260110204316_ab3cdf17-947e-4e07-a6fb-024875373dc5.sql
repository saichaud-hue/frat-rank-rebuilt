-- Update RPC to skip admin check (edge function already verifies admin)
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
  -- Note: Admin check is done in the edge function before calling this
  -- The SECURITY DEFINER + service role key allows this to bypass RLS
  
  -- Generate a fake user_id
  v_fake_user_id := gen_random_uuid();
  
  -- Insert message with the fake user
  INSERT INTO chat_messages (text, user_id)
  VALUES (p_text, v_fake_user_id)
  RETURNING id INTO v_id;
  
  RETURN v_id;
END;
$$;