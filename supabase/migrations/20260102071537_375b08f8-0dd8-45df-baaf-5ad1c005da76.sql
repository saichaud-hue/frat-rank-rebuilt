
-- =============================================
-- PHASE 1: CORE TABLES
-- =============================================

-- 1.1 Campuses Table
CREATE TABLE public.campuses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  domain TEXT NOT NULL,
  location TEXT,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 1.2 Fraternities Table
CREATE TABLE public.fraternities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campus_id UUID REFERENCES public.campuses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  chapter TEXT,
  description TEXT,
  logo_url TEXT,
  founded_year INTEGER,
  base_score DECIMAL DEFAULT 5.0,
  reputation_score DECIMAL DEFAULT 5.0,
  historical_party_score DECIMAL DEFAULT 5.0,
  momentum DECIMAL DEFAULT 0,
  display_score DECIMAL DEFAULT 5.0,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 1.3 Parties Table
CREATE TABLE public.parties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fraternity_id UUID REFERENCES public.fraternities(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id),
  title TEXT NOT NULL,
  starts_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ,
  venue TEXT,
  theme TEXT,
  access_type TEXT DEFAULT 'open',
  tags TEXT[],
  display_photo_url TEXT,
  performance_score DECIMAL DEFAULT 0,
  quantifiable_score DECIMAL DEFAULT 0,
  unquantifiable_score DECIMAL DEFAULT 5,
  total_ratings INTEGER DEFAULT 0,
  status TEXT DEFAULT 'upcoming',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================
-- PHASE 2: RATING TABLES
-- =============================================

-- 2.1 Party Ratings
CREATE TABLE public.party_ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  party_id UUID REFERENCES public.parties(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.profiles(id) NOT NULL,
  vibe_score DECIMAL,
  music_score DECIMAL,
  execution_score DECIMAL,
  party_quality_score DECIMAL,
  weight DECIMAL DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(party_id, user_id)
);

-- 2.2 Reputation Ratings
CREATE TABLE public.reputation_ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fraternity_id UUID REFERENCES public.fraternities(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.profiles(id) NOT NULL,
  brotherhood_score DECIMAL,
  reputation_score DECIMAL,
  community_score DECIMAL,
  combined_score DECIMAL,
  weight DECIMAL DEFAULT 1,
  semester TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================
-- PHASE 3: COMMENTS SYSTEM
-- =============================================

-- 3.1 Party Comments
CREATE TABLE public.party_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  party_id UUID REFERENCES public.parties(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.profiles(id) NOT NULL,
  parent_comment_id UUID REFERENCES public.party_comments(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  sentiment_score DECIMAL DEFAULT 0,
  toxicity_label TEXT DEFAULT 'safe',
  upvotes INTEGER DEFAULT 0,
  downvotes INTEGER DEFAULT 0,
  moderated BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.party_comment_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id UUID REFERENCES public.party_comments(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.profiles(id) NOT NULL,
  value INTEGER CHECK (value IN (-1, 1)),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(comment_id, user_id)
);

-- 3.2 Fraternity Comments
CREATE TABLE public.fraternity_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fraternity_id UUID REFERENCES public.fraternities(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.profiles(id) NOT NULL,
  parent_comment_id UUID REFERENCES public.fraternity_comments(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  sentiment_score DECIMAL DEFAULT 0,
  toxicity_label TEXT DEFAULT 'safe',
  upvotes INTEGER DEFAULT 0,
  downvotes INTEGER DEFAULT 0,
  moderated BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.fraternity_comment_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id UUID REFERENCES public.fraternity_comments(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.profiles(id) NOT NULL,
  value INTEGER CHECK (value IN (-1, 1)),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(comment_id, user_id)
);

-- =============================================
-- PHASE 4: ACTIVITY FEED (CHAT MESSAGES)
-- =============================================

CREATE TABLE public.chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) NOT NULL,
  parent_message_id UUID REFERENCES public.chat_messages(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  mentioned_fraternity_id UUID REFERENCES public.fraternities(id),
  mentioned_party_id UUID REFERENCES public.parties(id),
  upvotes INTEGER DEFAULT 0,
  downvotes INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.chat_message_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID REFERENCES public.chat_messages(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.profiles(id) NOT NULL,
  value INTEGER CHECK (value IN (-1, 1)),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(message_id, user_id)
);

-- =============================================
-- PHASE 5: PARTY PHOTOS
-- =============================================

CREATE TABLE public.party_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  party_id UUID REFERENCES public.parties(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.profiles(id) NOT NULL,
  url TEXT NOT NULL,
  caption TEXT,
  likes INTEGER DEFAULT 0,
  dislikes INTEGER DEFAULT 0,
  consent_verified BOOLEAN DEFAULT false,
  moderation_status TEXT DEFAULT 'pending',
  visibility TEXT DEFAULT 'public',
  shared_to_feed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.party_photo_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  photo_id UUID REFERENCES public.party_photos(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.profiles(id) NOT NULL,
  value INTEGER CHECK (value IN (-1, 1)),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(photo_id, user_id)
);

-- =============================================
-- PHASE 6: ENABLE RLS ON ALL TABLES
-- =============================================

ALTER TABLE public.campuses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fraternities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.party_ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reputation_ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.party_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.party_comment_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fraternity_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fraternity_comment_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_message_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.party_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.party_photo_votes ENABLE ROW LEVEL SECURITY;

-- =============================================
-- PHASE 7: RLS POLICIES
-- =============================================

-- Campuses: Public read
CREATE POLICY "Anyone can view campuses" ON public.campuses FOR SELECT USING (true);

-- Fraternities: Public read
CREATE POLICY "Anyone can view fraternities" ON public.fraternities FOR SELECT USING (true);

-- Parties: Public read, authenticated create, owner update/delete
CREATE POLICY "Anyone can view parties" ON public.parties FOR SELECT USING (true);
CREATE POLICY "Authenticated users can create parties" ON public.parties FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own parties" ON public.parties FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own parties" ON public.parties FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Party Ratings: Public read, authenticated create own, owner update/delete
CREATE POLICY "Anyone can view party ratings" ON public.party_ratings FOR SELECT USING (true);
CREATE POLICY "Authenticated users can create their own ratings" ON public.party_ratings FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own ratings" ON public.party_ratings FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own ratings" ON public.party_ratings FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Reputation Ratings: Public read, authenticated create own
CREATE POLICY "Anyone can view reputation ratings" ON public.reputation_ratings FOR SELECT USING (true);
CREATE POLICY "Authenticated users can create reputation ratings" ON public.reputation_ratings FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own reputation ratings" ON public.reputation_ratings FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own reputation ratings" ON public.reputation_ratings FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Party Comments: Public read, authenticated create, owner update/delete
CREATE POLICY "Anyone can view party comments" ON public.party_comments FOR SELECT USING (true);
CREATE POLICY "Authenticated users can create party comments" ON public.party_comments FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own party comments" ON public.party_comments FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own party comments" ON public.party_comments FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Party Comment Votes: User can see own, authenticated create/update/delete own
CREATE POLICY "Users can view their own party comment votes" ON public.party_comment_votes FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Authenticated users can create party comment votes" ON public.party_comment_votes FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own party comment votes" ON public.party_comment_votes FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own party comment votes" ON public.party_comment_votes FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Fraternity Comments: Public read, authenticated create, owner update/delete
CREATE POLICY "Anyone can view fraternity comments" ON public.fraternity_comments FOR SELECT USING (true);
CREATE POLICY "Authenticated users can create fraternity comments" ON public.fraternity_comments FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own fraternity comments" ON public.fraternity_comments FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own fraternity comments" ON public.fraternity_comments FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Fraternity Comment Votes: User can see own, authenticated create/update/delete own
CREATE POLICY "Users can view their own fraternity comment votes" ON public.fraternity_comment_votes FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Authenticated users can create fraternity comment votes" ON public.fraternity_comment_votes FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own fraternity comment votes" ON public.fraternity_comment_votes FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own fraternity comment votes" ON public.fraternity_comment_votes FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Chat Messages: Public read, authenticated create, owner update/delete
CREATE POLICY "Anyone can view chat messages" ON public.chat_messages FOR SELECT USING (true);
CREATE POLICY "Authenticated users can create chat messages" ON public.chat_messages FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own chat messages" ON public.chat_messages FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own chat messages" ON public.chat_messages FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Chat Message Votes: User can see own, authenticated create/update/delete own
CREATE POLICY "Users can view their own chat message votes" ON public.chat_message_votes FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Authenticated users can create chat message votes" ON public.chat_message_votes FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own chat message votes" ON public.chat_message_votes FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own chat message votes" ON public.chat_message_votes FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Party Photos: Public read, authenticated create, owner update/delete
CREATE POLICY "Anyone can view party photos" ON public.party_photos FOR SELECT USING (true);
CREATE POLICY "Authenticated users can upload party photos" ON public.party_photos FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own party photos" ON public.party_photos FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own party photos" ON public.party_photos FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Party Photo Votes: User can see own, authenticated create/update/delete own
CREATE POLICY "Users can view their own party photo votes" ON public.party_photo_votes FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Authenticated users can create party photo votes" ON public.party_photo_votes FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own party photo votes" ON public.party_photo_votes FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own party photo votes" ON public.party_photo_votes FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- =============================================
-- PHASE 8: ENABLE REALTIME
-- =============================================

ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.party_comments;
ALTER PUBLICATION supabase_realtime ADD TABLE public.fraternity_comments;
