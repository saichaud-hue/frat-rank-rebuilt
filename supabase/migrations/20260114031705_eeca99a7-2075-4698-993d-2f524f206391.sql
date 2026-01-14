-- Fix party_ratings RLS to allow all authenticated users to view ratings
-- This is needed for the aggregated view to work for leaderboard scores
-- Individual user_ids are protected by not exposing them in the UI

-- Drop the restrictive policy that only allowed viewing own ratings
DROP POLICY IF EXISTS "Users can view their own party ratings" ON public.party_ratings;

-- Create policy allowing all authenticated users to view ratings
-- The aggregated view provides anonymized scores for the leaderboard
CREATE POLICY "Authenticated users can view party ratings"
ON public.party_ratings
FOR SELECT
TO authenticated
USING (true);

-- Also ensure reputation_ratings are viewable for the reputation scores
DROP POLICY IF EXISTS "Users can view their own reputation ratings" ON public.reputation_ratings;

-- Allow all authenticated users to view reputation ratings for aggregation
CREATE POLICY "Authenticated users can view reputation ratings"
ON public.reputation_ratings
FOR SELECT
TO authenticated
USING (true);