export type PostType = 'update' | 'opportunity' | 'achievement' | 'collaboration' | 'event' | 'headline';
export type PostVisibility = 'public' | 'connections';

export interface PostAuthor {
  id: string;
  username: string;
  display_name: string;
  avatar_url?: string;
  role?: string;
  headline?: string;
  bio?: string;
  subscription_tier?: 'free' | 'premium' | 'unlimited' | null;
  is_verified?: boolean;
}

export interface Post {
  id: string;
  author: PostAuthor;
  content: string; // max 3000 chars
  post_type: PostType;
  visibility: PostVisibility;
  image_url?: string;
  image_urls?: string[]; // multiple images — populated when backend returns image_urls array
  audio_url?: string; // short preview clips
  event_id?: string;
  reactions_count: {
    support: number;
    love: number;
    fire: number;
    congrats: number;
  };
  comments_count: number;
  shares_count?: number; // Total reposts/shares count
  user_reaction?: 'support' | 'love' | 'fire' | 'congrats' | null;
  user_reposted?: boolean; // NEW: true if current user has reposted this post
  user_repost_id?: string; // NEW: ID of user's repost post (for DELETE)
  reposted_from_id?: string; // UUID of original post if this is a repost
  reposted_from?: Post; // Original post data (if loaded)
  // Headline Post fields (post_type === 'headline' only)
  headline?: string;
  gradient_preset?: number; // 1-5, maps to HEADLINE_GRADIENT_PRESETS
  created_at: string;
  updated_at: string;
}

export interface Comment {
  id: string;
  post_id: string;
  user: PostAuthor;
  content: string;
  image_url?: string;
  likes_count: number;
  user_liked: boolean;
  replies_count: number;
  created_at: string;
}

export interface CreatePostDto {
  content: string;
  post_type: PostType;
  visibility: PostVisibility;
  // Note: image_url and audio_url are NOT accepted in post creation
  // Attachments are uploaded separately using /api/posts/upload-image or /api/posts/upload-audio
  event_id?: string;
  // Headline Post fields — patched directly on Supabase after API creation
  headline?: string;
  gradient_preset?: number;
}

export interface RepostRequest {
  with_comment: boolean;
  comment?: string; // Required if with_comment is true, max 500 chars
}

export interface RepostResponse {
  success: boolean;
  data?: {
    id: string;
    content: string;
    user_id: string;
    created_at: string;
    reposted_from_id: string;
    author: {
      id: string;
      name: string;
      username: string;
    };
  };
  error?: string;
  details?: string;
}

