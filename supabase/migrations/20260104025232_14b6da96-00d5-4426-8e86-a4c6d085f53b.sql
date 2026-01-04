-- Allow admins to insert party ratings for any user
CREATE POLICY "Admins can create any party rating"
ON public.party_ratings
FOR INSERT
WITH CHECK (is_admin());

-- Allow admins to insert chat messages for any user
CREATE POLICY "Admins can create any chat message"
ON public.chat_messages
FOR INSERT
WITH CHECK (is_admin());

-- Allow admins to insert reputation ratings for any user
CREATE POLICY "Admins can create any reputation rating"
ON public.reputation_ratings
FOR INSERT
WITH CHECK (is_admin());