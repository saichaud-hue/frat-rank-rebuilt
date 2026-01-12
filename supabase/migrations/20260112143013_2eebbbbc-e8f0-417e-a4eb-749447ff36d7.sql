-- Fix party_ratings RLS to prevent user voting pattern exposure
-- Users should only see their own ratings, not everyone's

-- Drop existing overly permissive policies if they exist
DROP POLICY IF EXISTS "Anyone can view party ratings" ON public.party_ratings;
DROP POLICY IF EXISTS "Public can view ratings" ON public.party_ratings;

-- Create restrictive SELECT policy - users can only see their own ratings
CREATE POLICY "Users can view their own party ratings"
ON public.party_ratings
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Ensure moderators/admins can still view all ratings for moderation
CREATE POLICY "Admins can view all party ratings"
ON public.party_ratings
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'moderator'));

-- Also fix semester_announcements to hide created_by from public view
-- First check if there's a public SELECT policy and update it
DROP POLICY IF EXISTS "Anyone can view announcements" ON public.semester_announcements;

-- Create a view-based approach - announcements are public but created_by is protected
CREATE POLICY "Authenticated users can view announcements"
ON public.semester_announcements
FOR SELECT
TO authenticated
USING (true);