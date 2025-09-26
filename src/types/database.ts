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
          display_name: string
          avatar_url: string | null
          bio: string | null
          location: string | null
          city: string | null
          country: string | null
          genre: string | null
          role: string
          verified: boolean
          followers_count: number
          following_count: number
          total_plays: number
          total_likes: number
          total_events: number
          last_active: string
          created_at: string
          updated_at: string | null
        }
        Insert: {
          id: string
          username: string
          display_name: string
          avatar_url?: string | null
          bio?: string | null
          location?: string | null
          city?: string | null
          country?: string | null
          genre?: string | null
          role?: string
          verified?: boolean
          followers_count?: number
          following_count?: number
          total_plays?: number
          total_likes?: number
          total_events?: number
          last_active?: string
          created_at?: string
          updated_at?: string | null
        }
        Update: {
          id?: string
          username?: string
          display_name?: string
          avatar_url?: string | null
          bio?: string | null
          location?: string | null
          city?: string | null
          country?: string | null
          genre?: string | null
          role?: string
          verified?: boolean
          followers_count?: number
          following_count?: number
          total_plays?: number
          total_likes?: number
          total_events?: number
          last_active?: string
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
          sub_genre: string | null
          duration: number | null
          file_url: string | null
          artwork_url: string | null
          waveform_url: string | null
          share_count: number
          comment_count: number
          is_public: boolean
          play_count: number
          like_count: number
          download_count: number
          is_explicit: boolean
          is_featured: boolean
          tags: string[] | null
          metadata: Json | null
          created_at: string
          updated_at: string
          deleted_at: string | null
        }
        Insert: {
          id?: string
          title: string
          creator_id: string
          description?: string | null
          genre?: string | null
          sub_genre?: string | null
          duration?: number | null
          file_url?: string | null
          artwork_url?: string | null
          waveform_url?: string | null
          share_count?: number
          comment_count?: number
          is_public?: boolean
          play_count?: number
          like_count?: number
          download_count?: number
          is_explicit?: boolean
          is_featured?: boolean
          tags?: string[] | null
          metadata?: Json | null
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
        Update: {
          id?: string
          title?: string
          creator_id?: string
          description?: string | null
          genre?: string | null
          sub_genre?: string | null
          duration?: number | null
          file_url?: string | null
          artwork_url?: string | null
          waveform_url?: string | null
          share_count?: number
          comment_count?: number
          is_public?: boolean
          play_count?: number
          like_count?: number
          download_count?: number
          is_explicit?: boolean
          is_featured?: boolean
          tags?: string[] | null
          metadata?: Json | null
          created_at?: string
          updated_at?: string
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
          price_gbp: number | null
          price_ngn: number | null
          max_attendees: number | null
          current_attendees: number
          image_url: string | null
          is_public: boolean
          created_at: string
          updated_at: string
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
          price_gbp?: number | null
          price_ngn?: number | null
          max_attendees?: number | null
          current_attendees?: number
          image_url?: string | null
          is_public?: boolean
          created_at?: string
          updated_at?: string
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
          price_gbp?: number | null
          price_ngn?: number | null
          max_attendees?: number | null
          current_attendees?: number
          image_url?: string | null
          is_public?: boolean
          created_at?: string
          updated_at?: string
        }
      }
    }
    Views: {
      trending_tracks: {
        Row: {
          id: string
          title: string
          creator_id: string
          play_count: number
          like_count: number
          artwork_url: string | null
          created_at: string
        }
      }
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

// Type aliases for easier use
export type PublicProfile = Database['public']['Tables']['profiles']['Row']
export type AudioTrack = Database['public']['Tables']['audio_tracks']['Row']
export type Event = Database['public']['Tables']['events']['Row']
export type TrendingTrack = Database['public']['Views']['trending_tracks']['Row']
