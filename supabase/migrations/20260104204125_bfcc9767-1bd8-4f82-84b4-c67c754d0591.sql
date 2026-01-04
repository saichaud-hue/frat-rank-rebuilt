-- Create poll_votes table for storing user votes on polls
CREATE TABLE public.poll_votes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  message_id UUID NOT NULL REFERENCES public.chat_messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  option_index INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(message_id, user_id)
);

-- Enable RLS
ALTER TABLE public.poll_votes ENABLE ROW LEVEL SECURITY;

-- Anyone can view poll votes (to show results)
CREATE POLICY "Poll votes are viewable by everyone"
ON public.poll_votes
FOR SELECT
USING (true);

-- Authenticated users can insert their own vote
CREATE POLICY "Authenticated users can vote on polls"
ON public.poll_votes
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users cannot change their vote
-- (no UPDATE policy)

-- Enable realtime for poll_votes
ALTER PUBLICATION supabase_realtime ADD TABLE public.poll_votes;