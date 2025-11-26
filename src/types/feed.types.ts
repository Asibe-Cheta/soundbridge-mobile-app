export type PostType = 'update' | 'opportunity' | 'achievement' | 'collaboration' | 'event';
export type PostVisibility = 'public' | 'connections';

export interface PostAuthor {
  id: string;
  username: string;
  display_name: string;
  avatar_url?: string;
  headline?: string;
  role?: string;
}

export interface Post {
  id: string;
  author: PostAuthor;
  content: string; // max 500 chars
  post_type: PostType;
  visibility: PostVisibility;
  image_url?: string;
  audio_url?: string; // short preview clips
  event_id?: string;
  reactions_count: {
    support: number;
    love: number;
    fire: number;
    congrats: number;
  };
  comments_count: number;
  user_reaction?: 'support' | 'love' | 'fire' | 'congrats' | null;
  created_at: string;
  updated_at: string;
}

export interface Comment {
  id: string;
  post_id: string;
  user: PostAuthor;
  content: string;
  likes_count: number;
  user_liked: boolean;
  replies_count: number;
  created_at: string;
}

export interface CreatePostDto {
  content: string;
  post_type: PostType;
  visibility: PostVisibility;
  image_url?: string;
  audio_url?: string;
  event_id?: string;
}

