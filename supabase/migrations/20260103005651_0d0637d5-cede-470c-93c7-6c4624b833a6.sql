-- Create a table for "Where are we going tonight" votes
CREATE TABLE public.move_votes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  option_id UUID NOT NULL,
  option_name TEXT NOT NULL,
  vote_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.move_votes ENABLE ROW LEVEL SECURITY;

-- Create unique constraint so user can only vote once per day
CREATE UNIQUE INDEX move_votes_user_date_idx ON public.move_votes (user_id, vote_date);

-- Anyone can view vote counts (needed for displaying results)
CREATE POLICY "Anyone can view move votes" 
ON public.move_votes 
FOR SELECT 
USING (true);

-- Authenticated users can create their own votes
CREATE POLICY "Authenticated users can create move votes" 
ON public.move_votes 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Users can update their own votes
CREATE POLICY "Users can update their own move votes" 
ON public.move_votes 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Users can delete their own votes
CREATE POLICY "Users can delete their own move votes" 
ON public.move_votes 
FOR DELETE 
USING (auth.uid() = user_id);