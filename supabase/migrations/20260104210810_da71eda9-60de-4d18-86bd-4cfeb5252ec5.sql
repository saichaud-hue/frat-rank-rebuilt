-- Fix SECURITY DEFINER views by recreating with SECURITY INVOKER

-- Drop and recreate all views with explicit SECURITY INVOKER
DROP VIEW IF EXISTS public.party_ratings_aggregated;
CREATE VIEW public.party_ratings_aggregated 
WITH (security_invoker = true) AS
SELECT 
  party_id,
  COUNT(*) as total_ratings,
  AVG(vibe_score) as avg_vibe,
  AVG(music_score) as avg_music,
  AVG(execution_score) as avg_execution,
  AVG(party_quality_score) as avg_party_quality
FROM public.party_ratings
GROUP BY party_id;

DROP VIEW IF EXISTS public.reputation_ratings_aggregated;
CREATE VIEW public.reputation_ratings_aggregated 
WITH (security_invoker = true) AS
SELECT 
  fraternity_id,
  COUNT(*) as total_ratings,
  AVG(brotherhood_score) as avg_brotherhood,
  AVG(community_score) as avg_community,
  AVG(reputation_score) as avg_reputation,
  AVG(combined_score) as avg_combined
FROM public.reputation_ratings
GROUP BY fraternity_id;

DROP VIEW IF EXISTS public.poll_votes_aggregated;
CREATE VIEW public.poll_votes_aggregated 
WITH (security_invoker = true) AS
SELECT 
  message_id,
  option_index,
  COUNT(*) as vote_count
FROM public.poll_votes
GROUP BY message_id, option_index;

DROP VIEW IF EXISTS public.move_votes_aggregated;
CREATE VIEW public.move_votes_aggregated 
WITH (security_invoker = true) AS
SELECT 
  option_id,
  option_name,
  vote_date,
  COUNT(*) as vote_count
FROM public.move_votes
GROUP BY option_id, option_name, vote_date;

DROP VIEW IF EXISTS public.party_attendance_aggregated;
CREATE VIEW public.party_attendance_aggregated 
WITH (security_invoker = true) AS
SELECT 
  party_id,
  COUNT(*) FILTER (WHERE is_going = true) as going_count
FROM public.party_attendance
GROUP BY party_id;

DROP VIEW IF EXISTS public.chat_message_votes_aggregated;
CREATE VIEW public.chat_message_votes_aggregated 
WITH (security_invoker = true) AS
SELECT 
  message_id,
  SUM(CASE WHEN value = 1 THEN 1 ELSE 0 END) as upvote_count,
  SUM(CASE WHEN value = -1 THEN 1 ELSE 0 END) as downvote_count
FROM public.chat_message_votes
GROUP BY message_id;

-- Grant SELECT on views to authenticated and anon roles
GRANT SELECT ON public.party_ratings_aggregated TO authenticated, anon;
GRANT SELECT ON public.reputation_ratings_aggregated TO authenticated, anon;
GRANT SELECT ON public.poll_votes_aggregated TO authenticated, anon;
GRANT SELECT ON public.move_votes_aggregated TO authenticated, anon;
GRANT SELECT ON public.party_attendance_aggregated TO authenticated, anon;
GRANT SELECT ON public.chat_message_votes_aggregated TO authenticated, anon;