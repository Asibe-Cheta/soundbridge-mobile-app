// src/types/index.ts
export interface Creator {
  id: string;
  username: string;
  display_name: string;
  bio?: string;
  avatar_url?: string;
  banner_url?: string;
  location?: string;
  country?: string;
  genre?: string;
  role: 'creator' | 'artist' | 'musician' | 'listener';
  followers: number;
  tracks_count: number;
  created_at: string;
  updated_at: string;
}

export interface AudioTrack {
  id: string;
  title: string;
  description?: string;
  creator_id: string;
  file_url: string;
  cover_art_url?: string;
  duration: number;
  genre?: string;
  play_count: number;
  likes_count: number;
  comments_count: number;
  is_public: boolean;
  created_at: string;
}

export interface Event {
  id: string;
  title: string;
  description?: string;
  creator_id: string;
  event_date: string;
  location: string;
  venue?: string;
  category: 'Christian' | 'Secular' | 'Carnival' | 'Gospel' | 'Hip-Hop' | 'Afrobeat' | 'Jazz' | 'Classical' | 'Rock' | 'Pop' | 'Other';
  price_gbp?: number;
  price_ngn?: number;
  max_attendees?: number;
  current_attendees: number;
  likes_count: number;
  image_url?: string;
  created_at: string;
}

export interface Follow {
  follower_id: string;
  following_id: string;
  created_at: string;
}
