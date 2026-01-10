export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      allowed_file_types: {
        Row: {
          enabled: boolean
          extension: string
          id: string
          max_size_bytes: number
          mime_type: string
        }
        Insert: {
          enabled?: boolean
          extension: string
          id?: string
          max_size_bytes: number
          mime_type: string
        }
        Update: {
          enabled?: boolean
          extension?: string
          id?: string
          max_size_bytes?: number
          mime_type?: string
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          action: string
          actor_id: string
          created_at: string
          details: Json | null
          id: string
          target_id: string | null
          target_type: string
        }
        Insert: {
          action: string
          actor_id: string
          created_at?: string
          details?: Json | null
          id?: string
          target_id?: string | null
          target_type: string
        }
        Update: {
          action?: string
          actor_id?: string
          created_at?: string
          details?: Json | null
          id?: string
          target_id?: string | null
          target_type?: string
        }
        Relationships: []
      }
      blocked_users: {
        Row: {
          blocked_at: string
          blocked_by: string
          expires_at: string | null
          id: string
          reason: string | null
          user_id: string
        }
        Insert: {
          blocked_at?: string
          blocked_by: string
          expires_at?: string | null
          id?: string
          reason?: string | null
          user_id: string
        }
        Update: {
          blocked_at?: string
          blocked_by?: string
          expires_at?: string | null
          id?: string
          reason?: string | null
          user_id?: string
        }
        Relationships: []
      }
      campuses: {
        Row: {
          active: boolean | null
          created_at: string | null
          domain: string
          id: string
          location: string | null
          name: string
        }
        Insert: {
          active?: boolean | null
          created_at?: string | null
          domain: string
          id?: string
          location?: string | null
          name: string
        }
        Update: {
          active?: boolean | null
          created_at?: string | null
          domain?: string
          id?: string
          location?: string | null
          name?: string
        }
        Relationships: []
      }
      chat_message_votes: {
        Row: {
          created_at: string | null
          id: string
          message_id: string
          user_id: string
          value: number | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          message_id: string
          user_id: string
          value?: number | null
        }
        Update: {
          created_at?: string | null
          id?: string
          message_id?: string
          user_id?: string
          value?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "chat_message_votes_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "chat_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_message_votes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_messages: {
        Row: {
          created_at: string | null
          deleted_at: string | null
          deleted_by: string | null
          downvotes: number | null
          id: string
          locked: boolean | null
          locked_at: string | null
          locked_by: string | null
          mentioned_fraternity_id: string | null
          mentioned_party_id: string | null
          parent_message_id: string | null
          text: string
          upvotes: number | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          downvotes?: number | null
          id?: string
          locked?: boolean | null
          locked_at?: string | null
          locked_by?: string | null
          mentioned_fraternity_id?: string | null
          mentioned_party_id?: string | null
          parent_message_id?: string | null
          text: string
          upvotes?: number | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          downvotes?: number | null
          id?: string
          locked?: boolean | null
          locked_at?: string | null
          locked_by?: string | null
          mentioned_fraternity_id?: string | null
          mentioned_party_id?: string | null
          parent_message_id?: string | null
          text?: string
          upvotes?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_mentioned_fraternity_id_fkey"
            columns: ["mentioned_fraternity_id"]
            isOneToOne: false
            referencedRelation: "fraternities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_messages_mentioned_party_id_fkey"
            columns: ["mentioned_party_id"]
            isOneToOne: false
            referencedRelation: "parties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_messages_parent_message_id_fkey"
            columns: ["parent_message_id"]
            isOneToOne: false
            referencedRelation: "chat_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_messages_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      content_reports: {
        Row: {
          content_id: string
          content_type: string
          created_at: string
          description: string | null
          id: string
          reason: string
          reporter_id: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
        }
        Insert: {
          content_id: string
          content_type: string
          created_at?: string
          description?: string | null
          id?: string
          reason: string
          reporter_id: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
        }
        Update: {
          content_id?: string
          content_type?: string
          created_at?: string
          description?: string | null
          id?: string
          reason?: string
          reporter_id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
        }
        Relationships: []
      }
      fraternities: {
        Row: {
          base_score: number | null
          campus_id: string | null
          chapter: string | null
          created_at: string | null
          description: string | null
          display_score: number | null
          founded_year: number | null
          historical_party_score: number | null
          id: string
          logo_url: string | null
          momentum: number | null
          name: string
          reputation_score: number | null
          status: string | null
        }
        Insert: {
          base_score?: number | null
          campus_id?: string | null
          chapter?: string | null
          created_at?: string | null
          description?: string | null
          display_score?: number | null
          founded_year?: number | null
          historical_party_score?: number | null
          id?: string
          logo_url?: string | null
          momentum?: number | null
          name: string
          reputation_score?: number | null
          status?: string | null
        }
        Update: {
          base_score?: number | null
          campus_id?: string | null
          chapter?: string | null
          created_at?: string | null
          description?: string | null
          display_score?: number | null
          founded_year?: number | null
          historical_party_score?: number | null
          id?: string
          logo_url?: string | null
          momentum?: number | null
          name?: string
          reputation_score?: number | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fraternities_campus_id_fkey"
            columns: ["campus_id"]
            isOneToOne: false
            referencedRelation: "campuses"
            referencedColumns: ["id"]
          },
        ]
      }
      fraternity_comment_votes: {
        Row: {
          comment_id: string
          created_at: string | null
          id: string
          user_id: string
          value: number | null
        }
        Insert: {
          comment_id: string
          created_at?: string | null
          id?: string
          user_id: string
          value?: number | null
        }
        Update: {
          comment_id?: string
          created_at?: string | null
          id?: string
          user_id?: string
          value?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "fraternity_comment_votes_comment_id_fkey"
            columns: ["comment_id"]
            isOneToOne: false
            referencedRelation: "fraternity_comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fraternity_comment_votes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      fraternity_comments: {
        Row: {
          created_at: string | null
          deleted_at: string | null
          deleted_by: string | null
          downvotes: number | null
          fraternity_id: string
          id: string
          moderated: boolean | null
          parent_comment_id: string | null
          sentiment_score: number | null
          text: string
          toxicity_label: string | null
          upvotes: number | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          downvotes?: number | null
          fraternity_id: string
          id?: string
          moderated?: boolean | null
          parent_comment_id?: string | null
          sentiment_score?: number | null
          text: string
          toxicity_label?: string | null
          upvotes?: number | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          downvotes?: number | null
          fraternity_id?: string
          id?: string
          moderated?: boolean | null
          parent_comment_id?: string | null
          sentiment_score?: number | null
          text?: string
          toxicity_label?: string | null
          upvotes?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fraternity_comments_fraternity_id_fkey"
            columns: ["fraternity_id"]
            isOneToOne: false
            referencedRelation: "fraternities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fraternity_comments_parent_comment_id_fkey"
            columns: ["parent_comment_id"]
            isOneToOne: false
            referencedRelation: "fraternity_comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fraternity_comments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      move_votes: {
        Row: {
          created_at: string
          id: string
          option_id: string
          option_name: string
          user_id: string
          vote_date: string
        }
        Insert: {
          created_at?: string
          id?: string
          option_id: string
          option_name: string
          user_id: string
          vote_date?: string
        }
        Update: {
          created_at?: string
          id?: string
          option_id?: string
          option_name?: string
          user_id?: string
          vote_date?: string
        }
        Relationships: []
      }
      parties: {
        Row: {
          access_type: string | null
          contact_email: string | null
          created_at: string | null
          deleted_at: string | null
          deleted_by: string | null
          display_photo_url: string | null
          ends_at: string | null
          fraternity_id: string | null
          id: string
          performance_score: number | null
          quantifiable_score: number | null
          starts_at: string | null
          status: string | null
          tags: string[] | null
          theme: string | null
          title: string
          total_ratings: number | null
          unquantifiable_score: number | null
          user_id: string | null
          venue: string | null
        }
        Insert: {
          access_type?: string | null
          contact_email?: string | null
          created_at?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          display_photo_url?: string | null
          ends_at?: string | null
          fraternity_id?: string | null
          id?: string
          performance_score?: number | null
          quantifiable_score?: number | null
          starts_at?: string | null
          status?: string | null
          tags?: string[] | null
          theme?: string | null
          title: string
          total_ratings?: number | null
          unquantifiable_score?: number | null
          user_id?: string | null
          venue?: string | null
        }
        Update: {
          access_type?: string | null
          contact_email?: string | null
          created_at?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          display_photo_url?: string | null
          ends_at?: string | null
          fraternity_id?: string | null
          id?: string
          performance_score?: number | null
          quantifiable_score?: number | null
          starts_at?: string | null
          status?: string | null
          tags?: string[] | null
          theme?: string | null
          title?: string
          total_ratings?: number | null
          unquantifiable_score?: number | null
          user_id?: string | null
          venue?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "parties_fraternity_id_fkey"
            columns: ["fraternity_id"]
            isOneToOne: false
            referencedRelation: "fraternities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "parties_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      party_attendance: {
        Row: {
          created_at: string
          id: string
          is_going: boolean
          party_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_going?: boolean
          party_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_going?: boolean
          party_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "party_attendance_party_id_fkey"
            columns: ["party_id"]
            isOneToOne: false
            referencedRelation: "parties"
            referencedColumns: ["id"]
          },
        ]
      }
      party_comment_votes: {
        Row: {
          comment_id: string
          created_at: string | null
          id: string
          user_id: string
          value: number | null
        }
        Insert: {
          comment_id: string
          created_at?: string | null
          id?: string
          user_id: string
          value?: number | null
        }
        Update: {
          comment_id?: string
          created_at?: string | null
          id?: string
          user_id?: string
          value?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "party_comment_votes_comment_id_fkey"
            columns: ["comment_id"]
            isOneToOne: false
            referencedRelation: "party_comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "party_comment_votes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      party_comments: {
        Row: {
          created_at: string | null
          deleted_at: string | null
          deleted_by: string | null
          downvotes: number | null
          id: string
          moderated: boolean | null
          parent_comment_id: string | null
          party_id: string
          sentiment_score: number | null
          text: string
          toxicity_label: string | null
          upvotes: number | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          downvotes?: number | null
          id?: string
          moderated?: boolean | null
          parent_comment_id?: string | null
          party_id: string
          sentiment_score?: number | null
          text: string
          toxicity_label?: string | null
          upvotes?: number | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          downvotes?: number | null
          id?: string
          moderated?: boolean | null
          parent_comment_id?: string | null
          party_id?: string
          sentiment_score?: number | null
          text?: string
          toxicity_label?: string | null
          upvotes?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "party_comments_parent_comment_id_fkey"
            columns: ["parent_comment_id"]
            isOneToOne: false
            referencedRelation: "party_comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "party_comments_party_id_fkey"
            columns: ["party_id"]
            isOneToOne: false
            referencedRelation: "parties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "party_comments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      party_photo_votes: {
        Row: {
          created_at: string | null
          id: string
          photo_id: string
          user_id: string
          value: number | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          photo_id: string
          user_id: string
          value?: number | null
        }
        Update: {
          created_at?: string | null
          id?: string
          photo_id?: string
          user_id?: string
          value?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "party_photo_votes_photo_id_fkey"
            columns: ["photo_id"]
            isOneToOne: false
            referencedRelation: "party_photos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "party_photo_votes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      party_photos: {
        Row: {
          caption: string | null
          consent_verified: boolean | null
          created_at: string | null
          deleted_at: string | null
          deleted_by: string | null
          dislikes: number | null
          id: string
          likes: number | null
          moderation_status: string | null
          party_id: string
          shared_to_feed: boolean | null
          url: string
          user_id: string
          visibility: string | null
        }
        Insert: {
          caption?: string | null
          consent_verified?: boolean | null
          created_at?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          dislikes?: number | null
          id?: string
          likes?: number | null
          moderation_status?: string | null
          party_id: string
          shared_to_feed?: boolean | null
          url: string
          user_id: string
          visibility?: string | null
        }
        Update: {
          caption?: string | null
          consent_verified?: boolean | null
          created_at?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          dislikes?: number | null
          id?: string
          likes?: number | null
          moderation_status?: string | null
          party_id?: string
          shared_to_feed?: boolean | null
          url?: string
          user_id?: string
          visibility?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "party_photos_party_id_fkey"
            columns: ["party_id"]
            isOneToOne: false
            referencedRelation: "parties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "party_photos_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      party_ratings: {
        Row: {
          created_at: string | null
          execution_score: number | null
          id: string
          music_score: number | null
          party_id: string
          party_quality_score: number | null
          user_id: string
          vibe_score: number | null
          weight: number | null
        }
        Insert: {
          created_at?: string | null
          execution_score?: number | null
          id?: string
          music_score?: number | null
          party_id: string
          party_quality_score?: number | null
          user_id: string
          vibe_score?: number | null
          weight?: number | null
        }
        Update: {
          created_at?: string | null
          execution_score?: number | null
          id?: string
          music_score?: number | null
          party_id?: string
          party_quality_score?: number | null
          user_id?: string
          vibe_score?: number | null
          weight?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "party_ratings_party_id_fkey"
            columns: ["party_id"]
            isOneToOne: false
            referencedRelation: "parties"
            referencedColumns: ["id"]
          },
        ]
      }
      poll_votes: {
        Row: {
          created_at: string
          id: string
          message_id: string
          option_index: number
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message_id: string
          option_index: number
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message_id?: string
          option_index?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "poll_votes_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "chat_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "poll_votes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      rate_limits: {
        Row: {
          action_type: string
          count: number
          id: string
          user_id: string
          window_start: string
        }
        Insert: {
          action_type: string
          count?: number
          id?: string
          user_id: string
          window_start?: string
        }
        Update: {
          action_type?: string
          count?: number
          id?: string
          user_id?: string
          window_start?: string
        }
        Relationships: []
      }
      reputation_ratings: {
        Row: {
          brotherhood_score: number | null
          combined_score: number | null
          community_score: number | null
          created_at: string | null
          fraternity_id: string
          id: string
          reputation_score: number | null
          semester: string | null
          user_id: string
          weight: number | null
        }
        Insert: {
          brotherhood_score?: number | null
          combined_score?: number | null
          community_score?: number | null
          created_at?: string | null
          fraternity_id: string
          id?: string
          reputation_score?: number | null
          semester?: string | null
          user_id: string
          weight?: number | null
        }
        Update: {
          brotherhood_score?: number | null
          combined_score?: number | null
          community_score?: number | null
          created_at?: string | null
          fraternity_id?: string
          id?: string
          reputation_score?: number | null
          semester?: string | null
          user_id?: string
          weight?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "reputation_ratings_fraternity_id_fkey"
            columns: ["fraternity_id"]
            isOneToOne: false
            referencedRelation: "fraternities"
            referencedColumns: ["id"]
          },
        ]
      }
      semester_announcements: {
        Row: {
          created_at: string
          created_by: string | null
          expires_at: string | null
          id: string
          message: string
          semester_name: string
          title: string
          type: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          id?: string
          message: string
          semester_name: string
          title: string
          type: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          id?: string
          message?: string
          semester_name?: string
          title?: string
          type?: string
        }
        Relationships: []
      }
      user_dismissed_announcements: {
        Row: {
          announcement_id: string
          dismissed_at: string
          id: string
          user_id: string
        }
        Insert: {
          announcement_id: string
          dismissed_at?: string
          id?: string
          user_id: string
        }
        Update: {
          announcement_id?: string
          dismissed_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_dismissed_announcements_announcement_id_fkey"
            columns: ["announcement_id"]
            isOneToOne: false
            referencedRelation: "semester_announcements"
            referencedColumns: ["id"]
          },
        ]
      }
      user_offenses: {
        Row: {
          content_id: string | null
          content_type: string | null
          created_at: string
          description: string | null
          id: string
          offense_type: string
          recorded_by: string
          user_id: string
        }
        Insert: {
          content_id?: string | null
          content_type?: string | null
          created_at?: string
          description?: string | null
          id?: string
          offense_type: string
          recorded_by: string
          user_id: string
        }
        Update: {
          content_id?: string | null
          content_type?: string | null
          created_at?: string
          description?: string | null
          id?: string
          offense_type?: string
          recorded_by?: string
          user_id?: string
        }
        Relationships: []
      }
      user_points_history: {
        Row: {
          action_type: string
          created_at: string
          description: string | null
          id: string
          points: number
          user_id: string
        }
        Insert: {
          action_type: string
          created_at?: string
          description?: string | null
          id?: string
          points: number
          user_id: string
        }
        Update: {
          action_type?: string
          created_at?: string
          description?: string | null
          id?: string
          points?: number
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_streaks: {
        Row: {
          created_at: string
          current_streak: number
          id: string
          last_activity_at: string | null
          longest_streak: number
          total_points: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          current_streak?: number
          id?: string
          last_activity_at?: string | null
          longest_streak?: number
          total_points?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          current_streak?: number
          id?: string
          last_activity_at?: string | null
          longest_streak?: number
          total_points?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      chat_message_votes_aggregated: {
        Row: {
          downvote_count: number | null
          message_id: string | null
          upvote_count: number | null
        }
        Relationships: [
          {
            foreignKeyName: "chat_message_votes_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "chat_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      move_votes_aggregated: {
        Row: {
          option_id: string | null
          option_name: string | null
          vote_count: number | null
          vote_date: string | null
        }
        Relationships: []
      }
      party_attendance_aggregated: {
        Row: {
          going_count: number | null
          party_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "party_attendance_party_id_fkey"
            columns: ["party_id"]
            isOneToOne: false
            referencedRelation: "parties"
            referencedColumns: ["id"]
          },
        ]
      }
      party_ratings_aggregated: {
        Row: {
          avg_execution: number | null
          avg_music: number | null
          avg_party_quality: number | null
          avg_vibe: number | null
          party_id: string | null
          total_ratings: number | null
        }
        Relationships: [
          {
            foreignKeyName: "party_ratings_party_id_fkey"
            columns: ["party_id"]
            isOneToOne: false
            referencedRelation: "parties"
            referencedColumns: ["id"]
          },
        ]
      }
      poll_votes_aggregated: {
        Row: {
          message_id: string | null
          option_index: number | null
          vote_count: number | null
        }
        Relationships: [
          {
            foreignKeyName: "poll_votes_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "chat_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      reputation_ratings_aggregated: {
        Row: {
          avg_brotherhood: number | null
          avg_combined: number | null
          avg_community: number | null
          avg_reputation: number | null
          fraternity_id: string | null
          total_ratings: number | null
        }
        Relationships: [
          {
            foreignKeyName: "reputation_ratings_fraternity_id_fkey"
            columns: ["fraternity_id"]
            isOneToOne: false
            referencedRelation: "fraternities"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      admin_seed_party_rating: {
        Args: {
          p_execution: number
          p_music: number
          p_party_id: string
          p_party_quality: number
          p_vibe: number
        }
        Returns: string
      }
      admin_seed_reputation_rating: {
        Args: {
          p_brotherhood: number
          p_combined: number
          p_community: number
          p_fraternity_id: string
          p_reputation: number
        }
        Returns: string
      }
      award_points: {
        Args: {
          p_action_type: string
          p_description?: string
          p_points: number
          p_user_id: string
        }
        Returns: {
          new_total: number
          points_awarded: number
        }[]
      }
      check_rate_limit: {
        Args: {
          p_action_type: string
          p_limit: number
          p_window_minutes: number
        }
        Returns: boolean
      }
      get_user_points: { Args: { p_user_id: string }; Returns: number }
      get_user_streak: {
        Args: { p_user_id: string }
        Returns: {
          current_streak: number
          last_activity_at: string
          longest_streak: number
          streak_expires_at: string
          total_points: number
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: never; Returns: boolean }
      is_moderator: { Args: never; Returns: boolean }
      is_user_blocked: { Args: { check_user_id: string }; Returns: boolean }
      recalculate_message_votes: {
        Args: { p_message_id: string }
        Returns: {
          new_downvotes: number
          new_upvotes: number
        }[]
      }
      record_rate_limit: { Args: { p_action_type: string }; Returns: undefined }
      update_user_streak: {
        Args: { p_user_id: string }
        Returns: {
          is_new_day: boolean
          new_streak: number
        }[]
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "moderator", "user"],
    },
  },
} as const
