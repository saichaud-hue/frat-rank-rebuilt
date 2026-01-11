-- Add public SELECT policies for ratings tables so everyone can see all ratings

-- Allow anyone to view all party ratings (for aggregation and display)
CREATE POLICY "Anyone can view party ratings"
ON public.party_ratings
FOR SELECT
TO public
USING (true);

-- Allow anyone to view all reputation ratings (for aggregation and display)
CREATE POLICY "Anyone can view reputation ratings"
ON public.reputation_ratings
FOR SELECT
TO public
USING (true);

-- Drop the restrictive policies that only allowed viewing own ratings
DROP POLICY IF EXISTS "Users can view their own party ratings" ON public.party_ratings;
DROP POLICY IF EXISTS "Users can view their own reputation ratings" ON public.reputation_ratings;
DROP POLICY IF EXISTS "Admins can view all party ratings" ON public.party_ratings;
DROP POLICY IF EXISTS "Admins can view all reputation ratings" ON public.reputation_ratings;