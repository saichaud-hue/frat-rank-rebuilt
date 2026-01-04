
-- Add unique constraint for reputation_ratings (now safe after cleanup)
CREATE UNIQUE INDEX IF NOT EXISTS reputation_ratings_fraternity_user_unique
ON public.reputation_ratings (fraternity_id, user_id);
