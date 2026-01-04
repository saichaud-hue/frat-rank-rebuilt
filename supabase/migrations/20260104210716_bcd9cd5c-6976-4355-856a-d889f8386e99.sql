-- PHASE 1: Create aggregated views for public consumption

-- 1. Party Ratings Aggregated View (hides user_id)
CREATE OR REPLACE VIEW public.party_ratings_aggregated AS
SELECT 
  party_id,
  COUNT(*) as total_ratings,
  AVG(vibe_score) as avg_vibe,
  AVG(music_score) as avg_music,
  AVG(execution_score) as avg_execution,
  AVG(party_quality_score) as avg_party_quality
FROM public.party_ratings
GROUP BY party_id;

-- 2. Reputation Ratings Aggregated View (hides user_id)
CREATE OR REPLACE VIEW public.reputation_ratings_aggregated AS
SELECT 
  fraternity_id,
  COUNT(*) as total_ratings,
  AVG(brotherhood_score) as avg_brotherhood,
  AVG(community_score) as avg_community,
  AVG(reputation_score) as avg_reputation,
  AVG(combined_score) as avg_combined
FROM public.reputation_ratings
GROUP BY fraternity_id;

-- 3. Poll Votes Aggregated View (hides user_id, shows only counts)
CREATE OR REPLACE VIEW public.poll_votes_aggregated AS
SELECT 
  message_id,
  option_index,
  COUNT(*) as vote_count
FROM public.poll_votes
GROUP BY message_id, option_index;

-- 4. Move Votes Aggregated View (hides user_id)
CREATE OR REPLACE VIEW public.move_votes_aggregated AS
SELECT 
  option_id,
  option_name,
  vote_date,
  COUNT(*) as vote_count
FROM public.move_votes
GROUP BY option_id, option_name, vote_date;

-- 5. Party Attendance Aggregated View (hides user_id)
CREATE OR REPLACE VIEW public.party_attendance_aggregated AS
SELECT 
  party_id,
  COUNT(*) FILTER (WHERE is_going = true) as going_count
FROM public.party_attendance
GROUP BY party_id;

-- 6. Chat Message Votes Aggregated View (hides user_id)
CREATE OR REPLACE VIEW public.chat_message_votes_aggregated AS
SELECT 
  message_id,
  SUM(CASE WHEN value = 1 THEN 1 ELSE 0 END) as upvote_count,
  SUM(CASE WHEN value = -1 THEN 1 ELSE 0 END) as downvote_count
FROM public.chat_message_votes
GROUP BY message_id;

-- PHASE 2: Update RLS policies to be more restrictive

-- Update party_ratings: users can only see their own ratings, admins see all
DROP POLICY IF EXISTS "Anyone can view party ratings" ON public.party_ratings;

CREATE POLICY "Users can view their own party ratings" 
  ON public.party_ratings FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all party ratings" 
  ON public.party_ratings FOR SELECT 
  USING (is_admin());

-- Update reputation_ratings: users can only see their own, admins see all
DROP POLICY IF EXISTS "Anyone can view reputation ratings" ON public.reputation_ratings;

CREATE POLICY "Users can view their own reputation ratings" 
  ON public.reputation_ratings FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all reputation ratings" 
  ON public.reputation_ratings FOR SELECT 
  USING (is_admin());

-- Update poll_votes: users can only see their own vote, admins see all
DROP POLICY IF EXISTS "Poll votes are viewable by everyone" ON public.poll_votes;

CREATE POLICY "Users can view their own poll votes" 
  ON public.poll_votes FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all poll votes" 
  ON public.poll_votes FOR SELECT 
  USING (is_admin());

-- Update move_votes: users can only see their own, admins see all
DROP POLICY IF EXISTS "Anyone can view move votes" ON public.move_votes;

CREATE POLICY "Users can view their own move votes" 
  ON public.move_votes FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all move votes" 
  ON public.move_votes FOR SELECT 
  USING (is_admin());

-- Update party_attendance: users see their own, admins see all
DROP POLICY IF EXISTS "Anyone can view attendance counts" ON public.party_attendance;

CREATE POLICY "Users can view their own attendance" 
  ON public.party_attendance FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all attendance" 
  ON public.party_attendance FOR SELECT 
  USING (is_admin());

-- Update chat_message_votes: users see their own, admins see all
DROP POLICY IF EXISTS "Anyone can view chat message votes" ON public.chat_message_votes;

CREATE POLICY "Users can view their own chat message votes" 
  ON public.chat_message_votes FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all chat message votes" 
  ON public.chat_message_votes FOR SELECT 
  USING (is_admin());

-- PHASE 3: Restrict file types to authenticated users only
DROP POLICY IF EXISTS "Anyone can view allowed file types" ON public.allowed_file_types;

CREATE POLICY "Authenticated users can view allowed file types" 
  ON public.allowed_file_types FOR SELECT 
  TO authenticated
  USING (true);

-- PHASE 4: Hide announcement creator IDs from non-admins
DROP POLICY IF EXISTS "Anyone can view announcements" ON public.semester_announcements;

CREATE POLICY "Anyone can view announcements" 
  ON public.semester_announcements FOR SELECT 
  USING (true);

-- Note: The created_by column will still be in the table, but we'll handle hiding it in the frontend
-- by only selecting non-sensitive columns in queries