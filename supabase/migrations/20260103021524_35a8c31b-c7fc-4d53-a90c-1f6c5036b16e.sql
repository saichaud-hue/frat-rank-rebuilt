-- Ensure RLS is enabled on all moderation tables
ALTER TABLE public.parties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.party_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fraternity_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- 1) PARTIES: Remove ALL existing SELECT policies safely
DO $$
DECLARE pol record;
BEGIN
  FOR pol IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'parties'
      AND cmd = 'SELECT'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.parties;', pol.policyname);
  END LOOP;
END $$;

-- Recreate one clean SELECT policy for parties
CREATE POLICY "Parties: view based on status or ownership"
ON public.parties
FOR SELECT
TO authenticated
USING (
  public.is_admin()
  OR status IN ('upcoming', 'live', 'completed')
  OR (user_id IS NOT NULL AND user_id = auth.uid())
);

-- 2) PARTIES: Admin moderation policies
DROP POLICY IF EXISTS "Admins can update any party" ON public.parties;
CREATE POLICY "Admins can update any party"
ON public.parties FOR UPDATE
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admins can delete any party" ON public.parties;
CREATE POLICY "Admins can delete any party"
ON public.parties FOR DELETE
TO authenticated
USING (public.is_admin());

-- 3) PARTY COMMENTS: Admin moderation
DROP POLICY IF EXISTS "Admins can update any party comment" ON public.party_comments;
CREATE POLICY "Admins can update any party comment"
ON public.party_comments FOR UPDATE
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admins can delete any party comment" ON public.party_comments;
CREATE POLICY "Admins can delete any party comment"
ON public.party_comments FOR DELETE
TO authenticated
USING (public.is_admin());

-- 4) FRATERNITY COMMENTS: Admin moderation
DROP POLICY IF EXISTS "Admins can update any fraternity comment" ON public.fraternity_comments;
CREATE POLICY "Admins can update any fraternity comment"
ON public.fraternity_comments FOR UPDATE
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admins can delete any fraternity comment" ON public.fraternity_comments;
CREATE POLICY "Admins can delete any fraternity comment"
ON public.fraternity_comments FOR DELETE
TO authenticated
USING (public.is_admin());

-- 5) CHAT MESSAGES: Admin moderation
DROP POLICY IF EXISTS "Admins can update any chat message" ON public.chat_messages;
CREATE POLICY "Admins can update any chat message"
ON public.chat_messages FOR UPDATE
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admins can delete any chat message" ON public.chat_messages;
CREATE POLICY "Admins can delete any chat message"
ON public.chat_messages FOR DELETE
TO authenticated
USING (public.is_admin());