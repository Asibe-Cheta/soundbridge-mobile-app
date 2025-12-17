export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          username: string
          email?: string | null
          display_name: string | null
          avatar_url: string | null
          banner_url: string | null
          bio: string | null
          role: string | null
          country: string | null
          location: string | null
          city: string | null
          genre: string | null
          genres: string[] | null
          onboarding_completed: boolean | null
          verified: boolean | null
          followers_count: number | null
          following_count: number | null
          total_plays: number | null
          total_likes: number | null
          total_events: number | null
          last_active: string | null
          expo_push_token: string | null
          created_at: string
          updated_at: string | null
        }
        Insert: {
          id: string
          username: string
          email?: string | null
          display_name?: string | null
          avatar_url?: string | null
          banner_url?: string | null
          bio?: string | null
          role?: string | null
          country?: string | null
          location?: string | null
          city?: string | null
          genre?: string | null
          genres?: string[] | null
          onboarding_completed?: boolean | null
          verified?: boolean | null
          followers_count?: number | null
          following_count?: number | null
          total_plays?: number | null
          total_likes?: number | null
          total_events?: number | null
          last_active?: string | null
          created_at?: string
          updated_at?: string | null
        }
        Update: {
          id?: string
          username?: string
          email?: string | null
          display_name?: string | null
          avatar_url?: string | null
          banner_url?: string | null
          bio?: string | null
          role?: string | null
          country?: string | null
          location?: string | null
          city?: string | null
          genre?: string | null
          genres?: string[] | null
          onboarding_completed?: boolean | null
          verified?: boolean | null
          followers_count?: number | null
          following_count?: number | null
          total_plays?: number | null
          total_likes?: number | null
          total_events?: number | null
          last_active?: string | null
          created_at?: string
          updated_at?: string | null
        }
      }
      audio_tracks: {
        Row: {
          id: string
          title: string
          creator_id: string
          description: string | null
          genre: string | null
          duration: number | null
          file_url: string | null
          cover_art_url: string | null
          artwork_url: string | null
          play_count: number | null
          likes_count: number | null
          comments_count: number | null
          shares_count: number | null
          is_public: boolean | null
          is_explicit: boolean | null
          is_featured: boolean | null
          tags: string[] | null
          metadata: Json | null
          lyrics: string | null
          lyrics_language: string | null
          has_lyrics: boolean | null
          // Moderation fields
          moderation_status: 'pending_check' | 'checking' | 'clean' | 'flagged' | 'approved' | 'rejected' | 'appealed'
          moderation_flagged: boolean | null
          flag_reasons: string[] | null
          moderation_confidence: number | null
          transcription: string | null
          moderation_checked_at: string | null
          reviewed_by: string | null
          reviewed_at: string | null
          file_hash: string | null
          appeal_text: string | null
          created_at: string
          updated_at: string | null
          deleted_at: string | null
        }
        Insert: {
          id?: string
          title: string
          creator_id: string
          description?: string | null
          genre?: string | null
          duration?: number | null
          file_url?: string | null
          cover_art_url?: string | null
          artwork_url?: string | null
          play_count?: number | null
          likes_count?: number | null
          comments_count?: number | null
          shares_count?: number | null
          is_public?: boolean | null
          is_explicit?: boolean | null
          is_featured?: boolean | null
          tags?: string[] | null
          metadata?: Json | null
          lyrics?: string | null
          lyrics_language?: string | null
          has_lyrics?: boolean | null
          created_at?: string
          updated_at?: string | null
          deleted_at?: string | null
        }
        Update: {
          id?: string
          title?: string
          creator_id?: string
          description?: string | null
          genre?: string | null
          duration?: number | null
          file_url?: string | null
          cover_art_url?: string | null
          artwork_url?: string | null
          play_count?: number | null
          likes_count?: number | null
          comments_count?: number | null
          shares_count?: number | null
          is_public?: boolean | null
          is_explicit?: boolean | null
          is_featured?: boolean | null
          tags?: string[] | null
          metadata?: Json | null
          lyrics?: string | null
          lyrics_language?: string | null
          has_lyrics?: boolean | null
          created_at?: string
          updated_at?: string | null
          deleted_at?: string | null
        }
      }
      events: {
        Row: {
          id: string
          title: string
          creator_id: string
          description: string | null
          event_date: string
          location: string | null
          venue: string | null
          latitude: number | null
          longitude: number | null
          category: string | null
          country: string | null
          ticket_price: number | null
          tickets_available: number | null
          image_url: string | null
          is_public: boolean | null
          created_at: string
          updated_at: string | null
        }
        Insert: {
          id?: string
          title: string
          creator_id: string
          description?: string | null
          event_date: string
          location?: string | null
          venue?: string | null
          latitude?: number | null
          longitude?: number | null
          category?: string | null
          country?: string | null
          ticket_price?: number | null
          tickets_available?: number | null
          image_url?: string | null
          is_public?: boolean | null
          created_at?: string
          updated_at?: string | null
        }
        Update: {
          id?: string
          title?: string
          creator_id?: string
          description?: string | null
          event_date?: string
          location?: string | null
          venue?: string | null
          latitude?: number | null
          longitude?: number | null
          category?: string | null
          country?: string | null
          ticket_price?: number | null
          tickets_available?: number | null
          image_url?: string | null
          is_public?: boolean | null
          created_at?: string
          updated_at?: string | null
        }
      }
      creator_type_lookup: {
        Row: {
          id: CreatorType
          label: string | null
          description: string | null
          created_at: string
        }
        Insert: {
          id: CreatorType
          label?: string | null
          description?: string | null
          created_at?: string
        }
        Update: {
          id?: CreatorType
          label?: string | null
          description?: string | null
          created_at?: string
        }
      }
      user_creator_types: {
        Row: {
          user_id: string
          creator_type: CreatorType
          created_at: string
        }
        Insert: {
          user_id: string
          creator_type: CreatorType
          created_at?: string
        }
        Update: {
          user_id?: string
          creator_type?: CreatorType
          created_at?: string
        }
      }
      service_provider_profiles: {
        Row: {
          user_id: string
          display_name: string | null
          headline: string | null
          bio: string | null
          categories: ServiceCategory[] | null
          default_rate: number | null
          rate_currency: string | null
          status: ServiceProviderStatus
          is_verified: boolean
          verification_status: ServiceVerificationStatus
          verification_requested_at: string | null
          verification_reviewed_at: string | null
          verification_reviewer_id: string | null
          id_verified: boolean | null
          average_rating: number | null
          review_count: number | null
          badge_tier: ProviderBadgeTier | null
          badge_updated_at: string | null
          completed_booking_count: number | null
          show_payment_protection: boolean | null
          first_booking_discount_enabled: boolean | null
          first_booking_discount_percent: number | null
          created_at: string
          updated_at: string | null
        }
        Insert: {
          user_id: string
          display_name?: string | null
          headline?: string | null
          bio?: string | null
          categories?: ServiceCategory[] | null
          default_rate?: number | null
          rate_currency?: string | null
          status?: ServiceProviderStatus
          is_verified?: boolean
          verification_status?: ServiceVerificationStatus
          verification_requested_at?: string | null
          verification_reviewed_at?: string | null
          verification_reviewer_id?: string | null
          id_verified?: boolean | null
          average_rating?: number | null
          review_count?: number | null
          badge_tier?: ProviderBadgeTier | null
          badge_updated_at?: string | null
          completed_booking_count?: number | null
          show_payment_protection?: boolean | null
          first_booking_discount_enabled?: boolean | null
          first_booking_discount_percent?: number | null
          created_at?: string
          updated_at?: string | null
        }
        Update: {
          user_id?: string
          display_name?: string | null
          headline?: string | null
          bio?: string | null
          categories?: ServiceCategory[] | null
          default_rate?: number | null
          rate_currency?: string | null
          status?: ServiceProviderStatus
          is_verified?: boolean
          verification_status?: ServiceVerificationStatus
          verification_requested_at?: string | null
          verification_reviewed_at?: string | null
          verification_reviewer_id?: string | null
          id_verified?: boolean | null
          average_rating?: number | null
          review_count?: number | null
          badge_tier?: ProviderBadgeTier | null
          badge_updated_at?: string | null
          completed_booking_count?: number | null
          show_payment_protection?: boolean | null
          first_booking_discount_enabled?: boolean | null
          first_booking_discount_percent?: number | null
          created_at?: string
          updated_at?: string | null
        }
      }
      service_offerings: {
        Row: {
          id: string
          provider_id: string
          title: string
          description: string | null
          category: ServiceCategory
          rate: number
          rate_currency: string
          unit: string
          is_active: boolean
          created_at: string
          updated_at: string | null
        }
        Insert: {
          id?: string
          provider_id: string
          title: string
          description?: string | null
          category: ServiceCategory
          rate: number
          rate_currency: string
          unit: string
          is_active?: boolean
          created_at?: string
          updated_at?: string | null
        }
        Update: {
          id?: string
          provider_id?: string
          title?: string
          description?: string | null
          category?: ServiceCategory
          rate?: number
          rate_currency?: string
          unit?: string
          is_active?: boolean
          created_at?: string
          updated_at?: string | null
        }
      }
      service_portfolio_items: {
        Row: {
          id: string
          provider_id: string
          media_url: string
          thumbnail_url: string | null
          caption: string | null
          sort_order: number | null
          created_at: string
        }
        Insert: {
          id?: string
          provider_id: string
          media_url: string
          thumbnail_url?: string | null
          caption?: string | null
          sort_order?: number | null
          created_at?: string
        }
        Update: {
          id?: string
          provider_id?: string
          media_url?: string
          thumbnail_url?: string | null
          caption?: string | null
          sort_order?: number | null
          created_at?: string
        }
      }
      service_provider_availability: {
        Row: {
          id: string
          provider_id: string
          start_at: string
          end_at: string
          recurrence_rule: string | null
          timezone: string | null
          is_bookable: boolean
          created_at: string
          updated_at: string | null
        }
        Insert: {
          id?: string
          provider_id: string
          start_at: string
          end_at: string
          recurrence_rule?: string | null
          timezone?: string | null
          is_bookable?: boolean
          created_at?: string
          updated_at?: string | null
        }
        Update: {
          id?: string
          provider_id?: string
          start_at?: string
          end_at?: string
          recurrence_rule?: string | null
          timezone?: string | null
          is_bookable?: boolean
          created_at?: string
          updated_at?: string | null
        }
      }
      service_reviews: {
        Row: {
          id: string
          provider_id: string
          booking_id: string | null
          reviewer_id: string
          rating: number
          comment: string | null
          status: ServiceReviewStatus
          created_at: string
          updated_at: string | null
          published_at: string | null
        }
        Insert: {
          id?: string
          provider_id: string
          booking_id?: string | null
          reviewer_id: string
          rating: number
          comment?: string | null
          status?: ServiceReviewStatus
          created_at?: string
          updated_at?: string | null
          published_at?: string | null
        }
        Update: {
          id?: string
          provider_id?: string
          booking_id?: string | null
          reviewer_id?: string
          rating?: number
          comment?: string | null
          status?: ServiceReviewStatus
          created_at?: string
          updated_at?: string | null
          published_at?: string | null
        }
      }
      provider_badge_history: {
        Row: {
          id: string
          provider_id: string
          previous_badge: ProviderBadgeTier | null
          new_badge: ProviderBadgeTier
          changed_at: string
          context: Json | null
        }
        Insert: {
          id?: string
          provider_id: string
          previous_badge?: ProviderBadgeTier | null
          new_badge: ProviderBadgeTier
          changed_at?: string
          context?: Json | null
        }
        Update: {
          id?: string
          provider_id?: string
          previous_badge?: ProviderBadgeTier | null
          new_badge?: ProviderBadgeTier
          changed_at?: string
          context?: Json | null
        }
      }
      service_bookings: {
        Row: {
          id: string
          provider_id: string
          booker_id: string
          offering_id: string | null
          status: ServiceBookingStatus
          scheduled_start: string | null
          scheduled_end: string | null
          timezone: string | null
          price_subtotal: number | null
          price_fees: number | null
          price_total: number | null
          currency: string | null
          notes: string | null
          dispute_reason: string | null
          created_at: string
          updated_at: string | null
          confirmed_at: string | null
          paid_at: string | null
          completed_at: string | null
          cancelled_at: string | null
          disputed_at: string | null
        }
        Insert: {
          id?: string
          provider_id: string
          booker_id: string
          offering_id?: string | null
          status?: ServiceBookingStatus
          scheduled_start?: string | null
          scheduled_end?: string | null
          timezone?: string | null
          price_subtotal?: number | null
          price_fees?: number | null
          price_total?: number | null
          currency?: string | null
          notes?: string | null
          dispute_reason?: string | null
          created_at?: string
          updated_at?: string | null
          confirmed_at?: string | null
          paid_at?: string | null
          completed_at?: string | null
          cancelled_at?: string | null
          disputed_at?: string | null
        }
        Update: {
          id?: string
          provider_id?: string
          booker_id?: string
          offering_id?: string | null
          status?: ServiceBookingStatus
          scheduled_start?: string | null
          scheduled_end?: string | null
          timezone?: string | null
          price_subtotal?: number | null
          price_fees?: number | null
          price_total?: number | null
          currency?: string | null
          notes?: string | null
          dispute_reason?: string | null
          created_at?: string
          updated_at?: string | null
          confirmed_at?: string | null
          paid_at?: string | null
          completed_at?: string | null
          cancelled_at?: string | null
          disputed_at?: string | null
        }
      }
      booking_activity: {
        Row: {
          id: string
          booking_id: string
          actor_id: string
          action: string
          metadata: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          booking_id: string
          actor_id: string
          action: string
          metadata?: Json | null
          created_at?: string
        }
        Update: {
          id?: string
          booking_id?: string
          actor_id?: string
          action?: string
          metadata?: Json | null
          created_at?: string
        }
      }
      booking_ledger: {
        Row: {
          id: string
          booking_id: string
          entry_type: string
          amount: number
          currency: string
          direction: 'debit' | 'credit'
          metadata: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          booking_id: string
          entry_type: string
          amount: number
          currency: string
          direction: 'debit' | 'credit'
          metadata?: Json | null
          created_at?: string
        }
        Update: {
          id?: string
          booking_id?: string
          entry_type?: string
          amount?: number
          currency?: string
          direction?: 'debit' | 'credit'
          metadata?: Json | null
          created_at?: string
        }
      }
      booking_notifications: {
        Row: {
          id: string
          booking_id: string
          recipient_id: string
          notification_type: string
          delivery_channel: string
          status: string
          template_id: string | null
          sent_at: string | null
          metadata: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          booking_id: string
          recipient_id: string
          notification_type: string
          delivery_channel: string
          status?: string
          template_id?: string | null
          sent_at?: string | null
          metadata?: Json | null
          created_at?: string
        }
        Update: {
          id?: string
          booking_id?: string
          recipient_id?: string
          notification_type?: string
          delivery_channel?: string
          status?: string
          template_id?: string | null
          sent_at?: string | null
          metadata?: Json | null
          created_at?: string
        }
      }
      provider_connect_accounts: {
        Row: {
          id: string
          provider_id: string
          stripe_account_id: string
          status: string
          requirements_due_at: string | null
          created_at: string
          updated_at: string | null
        }
        Insert: {
          id?: string
          provider_id: string
          stripe_account_id: string
          status?: string
          requirements_due_at?: string | null
          created_at?: string
          updated_at?: string | null
        }
        Update: {
          id?: string
          provider_id?: string
          stripe_account_id?: string
          status?: string
          requirements_due_at?: string | null
          created_at?: string
          updated_at?: string | null
        }
      }
      venues: {
        Row: {
          id: string
          owner_id: string
          name: string
          description: string | null
          address_line1: string | null
          address_line2: string | null
          city: string | null
          state: string | null
          country: string | null
          postal_code: string | null
          latitude: number | null
          longitude: number | null
          status: string | null
          created_at: string
          updated_at: string | null
        }
        Insert: {
          id?: string
          owner_id: string
          name: string
          description?: string | null
          address_line1?: string | null
          address_line2?: string | null
          city?: string | null
          state?: string | null
          country?: string | null
          postal_code?: string | null
          latitude?: number | null
          longitude?: number | null
          status?: string | null
          created_at?: string
          updated_at?: string | null
        }
        Update: {
          id?: string
          owner_id?: string
          name?: string
          description?: string | null
          address_line1?: string | null
          address_line2?: string | null
          city?: string | null
          state?: string | null
          country?: string | null
          postal_code?: string | null
          latitude?: number | null
          longitude?: number | null
          status?: string | null
          created_at?: string
          updated_at?: string | null
        }
      }
    }
    Views: {
      trending_tracks: {
        Row: {
          id: string
          title: string
          creator_id: string
          play_count: number | null
          like_count: number | null
          artwork_url: string | null
          created_at: string
        }
      }
      discover_feed_v1: {
        Row: {
          id: string
          item_type: 'track' | 'event' | 'service' | 'playlist'
          score: number
          payload: Json
          created_at: string
        }
      }
      search_content_v1: {
        Row: {
          id: string
          content_type: 'track' | 'artist' | 'event' | 'service' | 'playlist'
          title: string
          description: string | null
          image_url: string | null
          metadata: Json | null
        }
      }
    }
    Functions: {
      get_personalized_events: {
        Args: {
          p_user_id: string
          p_limit?: number
          p_offset?: number
        }
        Returns: Json[]
      }
    }
    Enums: {
      creator_type: CreatorType
      service_category: ServiceCategory
      provider_badge_tier: ProviderBadgeTier
      service_booking_status: ServiceBookingStatus
      service_review_status: ServiceReviewStatus
      service_provider_status: ServiceProviderStatus
      service_verification_status: ServiceVerificationStatus
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

export type CreatorType =
  | 'musician'
  | 'podcaster'
  | 'dj'
  | 'event_organizer'
  | 'service_provider'
  | 'venue_owner'

// Valid categories as per web app team confirmation (WEB_TEAM_SERVICE_CATEGORIES_RESPONSE.md)
// Complete list of 9 categories - API will reject any other category
export type ServiceCategory =
  | 'sound_engineering'
  | 'music_lessons'
  | 'mixing_mastering'
  | 'session_musician'
  | 'photography'
  | 'videography'
  | 'lighting'
  | 'event_management'
  | 'other'

export type ProviderBadgeTier = 'new_provider' | 'rising_star' | 'established' | 'top_rated'

export type ServiceProviderStatus = 'draft' | 'pending_review' | 'active' | 'suspended'

export type ServiceVerificationStatus = 'not_requested' | 'pending' | 'approved' | 'rejected'

export type ServiceReviewStatus = 'pending' | 'published' | 'hidden'

export type ServiceBookingStatus =
  | 'pending'
  | 'confirmed_awaiting_payment'
  | 'paid'
  | 'completed'
  | 'cancelled'
  | 'disputed'

// Alias for convenience
export type BookingStatus = ServiceBookingStatus

// Type aliases for easier use
export type PublicProfile = Database['public']['Tables']['profiles']['Row']
export type AudioTrack = Database['public']['Tables']['audio_tracks']['Row']
export type Event = Database['public']['Tables']['events']['Row']
export type TrendingTrack = Database['public']['Views']['trending_tracks']['Row']
export type ServiceProviderProfile = Database['public']['Tables']['service_provider_profiles']['Row']
export type ServiceOffering = Database['public']['Tables']['service_offerings']['Row']
export type ServiceAvailability = Database['public']['Tables']['service_provider_availability']['Row']
export type ServiceReview = Database['public']['Tables']['service_reviews']['Row']
export type ServiceBooking = Database['public']['Tables']['service_bookings']['Row']
export type Venue = Database['public']['Tables']['venues']['Row']
