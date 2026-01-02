// Supabase Data Access Layer
// Replaces the localStorage-based base44Client with real Supabase queries

import { supabase } from '@/integrations/supabase/client';

// ==========================================
// TYPE DEFINITIONS
// ==========================================

export interface Campus {
  id: string;
  name: string;
  domain: string;
  location: string | null;
  active: boolean | null;
  created_at: string;
}

export interface Fraternity {
  id: string;
  campus_id: string | null;
  name: string;
  chapter: string | null;
  description: string | null;
  logo_url: string | null;
  founded_year: number | null;
  base_score: number | null;
  reputation_score: number | null;
  historical_party_score: number | null;
  momentum: number | null;
  display_score: number | null;
  status: string | null;
  created_at: string;
}

export interface Party {
  id: string;
  fraternity_id: string | null;
  user_id: string | null;
  title: string;
  starts_at: string | null;
  ends_at: string | null;
  venue: string | null;
  theme: string | null;
  access_type: string | null;
  tags: string[] | null;
  display_photo_url: string | null;
  performance_score: number | null;
  quantifiable_score: number | null;
  unquantifiable_score: number | null;
  total_ratings: number | null;
  status: string | null;
  created_at: string;
}

export interface PartyRating {
  id: string;
  party_id: string;
  user_id: string;
  vibe_score: number | null;
  music_score: number | null;
  execution_score: number | null;
  party_quality_score: number | null;
  weight: number | null;
  created_at: string;
}

export interface ReputationRating {
  id: string;
  fraternity_id: string;
  user_id: string;
  brotherhood_score: number | null;
  reputation_score: number | null;
  community_score: number | null;
  combined_score: number | null;
  weight: number | null;
  semester: string | null;
  created_at: string;
}

export interface PartyComment {
  id: string;
  party_id: string;
  user_id: string;
  parent_comment_id: string | null;
  text: string;
  sentiment_score: number | null;
  toxicity_label: string | null;
  upvotes: number | null;
  downvotes: number | null;
  moderated: boolean | null;
  created_at: string;
}

export interface FraternityComment {
  id: string;
  fraternity_id: string;
  user_id: string;
  parent_comment_id: string | null;
  text: string;
  sentiment_score: number | null;
  toxicity_label: string | null;
  upvotes: number | null;
  downvotes: number | null;
  moderated: boolean | null;
  created_at: string;
}

export interface ChatMessage {
  id: string;
  user_id: string;
  parent_message_id: string | null;
  text: string;
  mentioned_fraternity_id: string | null;
  mentioned_party_id: string | null;
  upvotes: number | null;
  downvotes: number | null;
  created_at: string;
}

export interface PartyPhoto {
  id: string;
  party_id: string;
  user_id: string;
  url: string;
  caption: string | null;
  likes: number | null;
  dislikes: number | null;
  consent_verified: boolean | null;
  moderation_status: string | null;
  visibility: string | null;
  shared_to_feed: boolean | null;
  created_at: string;
}

// ==========================================
// CAMPUS QUERIES
// ==========================================

export const campusQueries = {
  async list(): Promise<Campus[]> {
    const { data, error } = await supabase
      .from('campuses')
      .select('*')
      .order('name');
    if (error) throw error;
    return data || [];
  },

  async get(id: string): Promise<Campus | null> {
    const { data, error } = await supabase
      .from('campuses')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (error) throw error;
    return data;
  },
};

// ==========================================
// FRATERNITY QUERIES
// ==========================================

export const fraternityQueries = {
  async list(): Promise<Fraternity[]> {
    const { data, error } = await supabase
      .from('fraternities')
      .select('*')
      .order('display_score', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  async listActive(): Promise<Fraternity[]> {
    const { data, error } = await supabase
      .from('fraternities')
      .select('*')
      .eq('status', 'active')
      .order('display_score', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  async get(id: string): Promise<Fraternity | null> {
    const { data, error } = await supabase
      .from('fraternities')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (error) throw error;
    return data;
  },

  async update(id: string, updates: Partial<Fraternity>): Promise<Fraternity | null> {
    const { data, error } = await supabase
      .from('fraternities')
      .update(updates)
      .eq('id', id)
      .select()
      .maybeSingle();
    if (error) throw error;
    return data;
  },
};

// ==========================================
// PARTY QUERIES
// ==========================================

export const partyQueries = {
  async list(): Promise<Party[]> {
    const { data, error } = await supabase
      .from('parties')
      .select('*')
      .order('starts_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  async listByStartDate(): Promise<Party[]> {
    const { data, error } = await supabase
      .from('parties')
      .select('*')
      .order('starts_at', { ascending: true });
    if (error) throw error;
    return data || [];
  },

  async get(id: string): Promise<Party | null> {
    const { data, error } = await supabase
      .from('parties')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (error) throw error;
    return data;
  },

  async create(party: Omit<Party, 'id' | 'created_at'>): Promise<Party> {
    const { data, error } = await supabase
      .from('parties')
      .insert(party)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async update(id: string, updates: Partial<Party>): Promise<Party | null> {
    const { data, error } = await supabase
      .from('parties')
      .update(updates)
      .eq('id', id)
      .select()
      .maybeSingle();
    if (error) throw error;
    return data;
  },

  async listByFraternity(fraternityId: string): Promise<Party[]> {
    const { data, error } = await supabase
      .from('parties')
      .select('*')
      .eq('fraternity_id', fraternityId)
      .order('starts_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },
};

// ==========================================
// PARTY RATING QUERIES
// ==========================================

export const partyRatingQueries = {
  async list(): Promise<PartyRating[]> {
    const { data, error } = await supabase
      .from('party_ratings')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  async listByParty(partyId: string): Promise<PartyRating[]> {
    const { data, error } = await supabase
      .from('party_ratings')
      .select('*')
      .eq('party_id', partyId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  async getByUserAndParty(userId: string, partyId: string): Promise<PartyRating | null> {
    const { data, error } = await supabase
      .from('party_ratings')
      .select('*')
      .eq('user_id', userId)
      .eq('party_id', partyId)
      .maybeSingle();
    if (error) throw error;
    return data;
  },

  async create(rating: Omit<PartyRating, 'id' | 'created_at'>): Promise<PartyRating> {
    const { data, error } = await supabase
      .from('party_ratings')
      .insert(rating)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async update(id: string, updates: Partial<PartyRating>): Promise<PartyRating | null> {
    const { data, error } = await supabase
      .from('party_ratings')
      .update(updates)
      .eq('id', id)
      .select()
      .maybeSingle();
    if (error) throw error;
    return data;
  },

  async delete(id: string): Promise<boolean> {
    const { error } = await supabase
      .from('party_ratings')
      .delete()
      .eq('id', id);
    if (error) throw error;
    return true;
  },

  async upsert(rating: Omit<PartyRating, 'id' | 'created_at'>): Promise<PartyRating> {
    const existing = await this.getByUserAndParty(rating.user_id, rating.party_id);
    if (existing) {
      const updated = await this.update(existing.id, rating);
      return updated!;
    }
    return this.create(rating);
  },
};

// ==========================================
// REPUTATION RATING QUERIES
// ==========================================

export const reputationRatingQueries = {
  async list(): Promise<ReputationRating[]> {
    const { data, error } = await supabase
      .from('reputation_ratings')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  async listByFraternity(fraternityId: string): Promise<ReputationRating[]> {
    const { data, error } = await supabase
      .from('reputation_ratings')
      .select('*')
      .eq('fraternity_id', fraternityId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  async getByUserAndFraternity(userId: string, fraternityId: string): Promise<ReputationRating | null> {
    const { data, error } = await supabase
      .from('reputation_ratings')
      .select('*')
      .eq('user_id', userId)
      .eq('fraternity_id', fraternityId)
      .maybeSingle();
    if (error) throw error;
    return data;
  },

  async create(rating: Omit<ReputationRating, 'id' | 'created_at'>): Promise<ReputationRating> {
    const { data, error } = await supabase
      .from('reputation_ratings')
      .insert(rating)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async update(id: string, updates: Partial<ReputationRating>): Promise<ReputationRating | null> {
    const { data, error } = await supabase
      .from('reputation_ratings')
      .update(updates)
      .eq('id', id)
      .select()
      .maybeSingle();
    if (error) throw error;
    return data;
  },

  async delete(id: string): Promise<boolean> {
    const { error } = await supabase
      .from('reputation_ratings')
      .delete()
      .eq('id', id);
    if (error) throw error;
    return true;
  },

  async upsert(rating: Omit<ReputationRating, 'id' | 'created_at'>): Promise<ReputationRating> {
    const existing = await this.getByUserAndFraternity(rating.user_id, rating.fraternity_id);
    if (existing) {
      const updated = await this.update(existing.id, rating);
      return updated!;
    }
    return this.create(rating);
  },
};

// ==========================================
// PARTY COMMENT QUERIES
// ==========================================

export const partyCommentQueries = {
  async list(): Promise<PartyComment[]> {
    const { data, error } = await supabase
      .from('party_comments')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  async listByParty(partyId: string): Promise<PartyComment[]> {
    const { data, error } = await supabase
      .from('party_comments')
      .select('*')
      .eq('party_id', partyId)
      .order('created_at', { ascending: true });
    if (error) throw error;
    return data || [];
  },

  async create(comment: Omit<PartyComment, 'id' | 'created_at'>): Promise<PartyComment> {
    const { data, error } = await supabase
      .from('party_comments')
      .insert(comment)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async update(id: string, updates: Partial<PartyComment>): Promise<PartyComment | null> {
    const { data, error } = await supabase
      .from('party_comments')
      .update(updates)
      .eq('id', id)
      .select()
      .maybeSingle();
    if (error) throw error;
    return data;
  },

  async delete(id: string): Promise<boolean> {
    const { error } = await supabase
      .from('party_comments')
      .delete()
      .eq('id', id);
    if (error) throw error;
    return true;
  },
};

// ==========================================
// FRATERNITY COMMENT QUERIES
// ==========================================

export const fraternityCommentQueries = {
  async list(): Promise<FraternityComment[]> {
    const { data, error } = await supabase
      .from('fraternity_comments')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  async listByFraternity(fraternityId: string): Promise<FraternityComment[]> {
    const { data, error } = await supabase
      .from('fraternity_comments')
      .select('*')
      .eq('fraternity_id', fraternityId)
      .order('created_at', { ascending: true });
    if (error) throw error;
    return data || [];
  },

  async create(comment: Omit<FraternityComment, 'id' | 'created_at'>): Promise<FraternityComment> {
    const { data, error } = await supabase
      .from('fraternity_comments')
      .insert(comment)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async update(id: string, updates: Partial<FraternityComment>): Promise<FraternityComment | null> {
    const { data, error } = await supabase
      .from('fraternity_comments')
      .update(updates)
      .eq('id', id)
      .select()
      .maybeSingle();
    if (error) throw error;
    return data;
  },

  async delete(id: string): Promise<boolean> {
    const { error } = await supabase
      .from('fraternity_comments')
      .delete()
      .eq('id', id);
    if (error) throw error;
    return true;
  },
};

// ==========================================
// CHAT MESSAGE QUERIES
// ==========================================

export const chatMessageQueries = {
  async list(): Promise<ChatMessage[]> {
    const { data, error } = await supabase
      .from('chat_messages')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  async create(message: Omit<ChatMessage, 'id' | 'created_at'>): Promise<ChatMessage> {
    const { data, error } = await supabase
      .from('chat_messages')
      .insert(message)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async update(id: string, updates: Partial<ChatMessage>): Promise<ChatMessage | null> {
    const { data, error } = await supabase
      .from('chat_messages')
      .update(updates)
      .eq('id', id)
      .select()
      .maybeSingle();
    if (error) throw error;
    return data;
  },

  async delete(id: string): Promise<boolean> {
    const { error } = await supabase
      .from('chat_messages')
      .delete()
      .eq('id', id);
    if (error) throw error;
    return true;
  },
};

// ==========================================
// CHAT MESSAGE VOTE QUERIES
// ==========================================

export const chatMessageVoteQueries = {
  async getByUserAndMessage(userId: string, messageId: string): Promise<{ id: string; value: number } | null> {
    const { data, error } = await supabase
      .from('chat_message_votes')
      .select('id, value')
      .eq('user_id', userId)
      .eq('message_id', messageId)
      .maybeSingle();
    if (error) throw error;
    return data;
  },

  async listByUser(userId: string): Promise<{ message_id: string; value: number }[]> {
    const { data, error } = await supabase
      .from('chat_message_votes')
      .select('message_id, value')
      .eq('user_id', userId);
    if (error) throw error;
    return data || [];
  },

  async upsert(userId: string, messageId: string, value: number): Promise<void> {
    const existing = await this.getByUserAndMessage(userId, messageId);
    if (existing) {
      await supabase
        .from('chat_message_votes')
        .update({ value })
        .eq('id', existing.id);
    } else {
      await supabase
        .from('chat_message_votes')
        .insert({ user_id: userId, message_id: messageId, value });
    }
  },

  async delete(userId: string, messageId: string): Promise<void> {
    await supabase
      .from('chat_message_votes')
      .delete()
      .eq('user_id', userId)
      .eq('message_id', messageId);
  },
};

// ==========================================
// PARTY PHOTO QUERIES
// ==========================================

export const partyPhotoQueries = {
  async list(): Promise<PartyPhoto[]> {
    const { data, error } = await supabase
      .from('party_photos')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  async listByParty(partyId: string): Promise<PartyPhoto[]> {
    const { data, error } = await supabase
      .from('party_photos')
      .select('*')
      .eq('party_id', partyId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  async create(photo: Omit<PartyPhoto, 'id' | 'created_at'>): Promise<PartyPhoto> {
    const { data, error } = await supabase
      .from('party_photos')
      .insert(photo)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async update(id: string, updates: Partial<PartyPhoto>): Promise<PartyPhoto | null> {
    const { data, error } = await supabase
      .from('party_photos')
      .update(updates)
      .eq('id', id)
      .select()
      .maybeSingle();
    if (error) throw error;
    return data;
  },

  async delete(id: string): Promise<boolean> {
    const { error } = await supabase
      .from('party_photos')
      .delete()
      .eq('id', id);
    if (error) throw error;
    return true;
  },
};

// ==========================================
// COMMENT VOTE QUERIES
// ==========================================

export const partyCommentVoteQueries = {
  async listByUser(userId: string): Promise<{ comment_id: string; value: number }[]> {
    const { data, error } = await supabase
      .from('party_comment_votes')
      .select('comment_id, value')
      .eq('user_id', userId);
    if (error) throw error;
    return data || [];
  },

  async upsert(userId: string, commentId: string, value: number): Promise<void> {
    const { data: existing } = await supabase
      .from('party_comment_votes')
      .select('id')
      .eq('user_id', userId)
      .eq('comment_id', commentId)
      .maybeSingle();

    if (existing) {
      await supabase
        .from('party_comment_votes')
        .update({ value })
        .eq('id', existing.id);
    } else {
      await supabase
        .from('party_comment_votes')
        .insert({ user_id: userId, comment_id: commentId, value });
    }
  },
};

export const fraternityCommentVoteQueries = {
  async listByUser(userId: string): Promise<{ comment_id: string; value: number }[]> {
    const { data, error } = await supabase
      .from('fraternity_comment_votes')
      .select('comment_id, value')
      .eq('user_id', userId);
    if (error) throw error;
    return data || [];
  },

  async upsert(userId: string, commentId: string, value: number): Promise<void> {
    const { data: existing } = await supabase
      .from('fraternity_comment_votes')
      .select('id')
      .eq('user_id', userId)
      .eq('comment_id', commentId)
      .maybeSingle();

    if (existing) {
      await supabase
        .from('fraternity_comment_votes')
        .update({ value })
        .eq('id', existing.id);
    } else {
      await supabase
        .from('fraternity_comment_votes')
        .insert({ user_id: userId, comment_id: commentId, value });
    }
  },
};

// ==========================================
// HELPER: Get current user
// ==========================================

export async function getCurrentUser() {
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}
