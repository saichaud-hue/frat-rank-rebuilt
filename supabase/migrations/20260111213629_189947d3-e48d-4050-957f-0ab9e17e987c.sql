-- Allow anyone to view party attendance (so "X people going" is visible to all)
CREATE POLICY "Anyone can view party attendance"
ON public.party_attendance
FOR SELECT
TO public
USING (true);

-- Drop the restrictive policies
DROP POLICY IF EXISTS "Users can view their own attendance" ON public.party_attendance;
DROP POLICY IF EXISTS "Admins can view all attendance" ON public.party_attendance;