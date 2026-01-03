-- Create a function to recalculate vote counts from the actual votes table
-- This function runs with SECURITY DEFINER to bypass RLS and get accurate counts
CREATE OR REPLACE FUNCTION public.recalculate_message_votes(p_message_id uuid)
RETURNS TABLE(new_upvotes integer, new_downvotes integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_upvotes integer;
  v_downvotes integer;
BEGIN
  -- Count all upvotes (value = 1) for this message
  SELECT COUNT(*) INTO v_upvotes
  FROM chat_message_votes
  WHERE message_id = p_message_id AND value = 1;
  
  -- Count all downvotes (value = -1) for this message
  SELECT COUNT(*) INTO v_downvotes
  FROM chat_message_votes
  WHERE message_id = p_message_id AND value = -1;
  
  -- Update the chat_messages table with accurate counts
  UPDATE chat_messages
  SET upvotes = v_upvotes, downvotes = v_downvotes
  WHERE id = p_message_id;
  
  RETURN QUERY SELECT v_upvotes, v_downvotes;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.recalculate_message_votes(uuid) TO authenticated;

-- Also update RLS policy to allow anyone to view all votes (needed for accurate counts)
DROP POLICY IF EXISTS "Users can view their own chat message votes" ON chat_message_votes;
CREATE POLICY "Anyone can view chat message votes" 
ON chat_message_votes 
FOR SELECT 
USING (true);