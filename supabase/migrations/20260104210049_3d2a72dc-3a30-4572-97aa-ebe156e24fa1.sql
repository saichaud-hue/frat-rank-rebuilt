-- Allow users to update their own poll votes
CREATE POLICY "Users can update their own poll votes"
ON public.poll_votes
FOR UPDATE
USING (auth.uid() = user_id);

-- Allow users to delete their own poll votes
CREATE POLICY "Users can delete their own poll votes"
ON public.poll_votes
FOR DELETE
USING (auth.uid() = user_id);