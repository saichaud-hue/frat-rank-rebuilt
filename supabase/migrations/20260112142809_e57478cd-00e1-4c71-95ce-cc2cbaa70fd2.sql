-- Add explicit RLS policies to aggregated views for public read access
-- These views only show aggregate statistics without user identification

-- Enable RLS on aggregated views and add public SELECT policies
ALTER VIEW public.chat_message_votes_aggregated SET (security_invoker = on);
ALTER VIEW public.move_votes_aggregated SET (security_invoker = on);
ALTER VIEW public.party_attendance_aggregated SET (security_invoker = on);
ALTER VIEW public.party_ratings_aggregated SET (security_invoker = on);
ALTER VIEW public.poll_votes_aggregated SET (security_invoker = on);
ALTER VIEW public.reputation_ratings_aggregated SET (security_invoker = on);

-- Grant SELECT to authenticated and anon roles for these statistics views
GRANT SELECT ON public.chat_message_votes_aggregated TO authenticated, anon;
GRANT SELECT ON public.move_votes_aggregated TO authenticated, anon;
GRANT SELECT ON public.party_attendance_aggregated TO authenticated, anon;
GRANT SELECT ON public.party_ratings_aggregated TO authenticated, anon;
GRANT SELECT ON public.poll_votes_aggregated TO authenticated, anon;
GRANT SELECT ON public.reputation_ratings_aggregated TO authenticated, anon;