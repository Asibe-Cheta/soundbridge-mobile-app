/**
 * TypeScript types for Live Audio Sessions
 * Based on database schema from web team
 */

export type SessionType = 'broadcast' | 'interactive';
export type SessionStatus = 'scheduled' | 'live' | 'ended' | 'cancelled';
export type ParticipantRole = 'host' | 'speaker' | 'listener';
export type CommentType = 'text' | 'emoji' | 'system';

export interface LiveSession {
  id: string;
  creator_id: string;
  title: string;
  description?: string;
  session_type: SessionType;
  status: SessionStatus;
  scheduled_start_time?: string;
  actual_start_time?: string;
  end_time?: string;
  max_speakers: number;
  allow_recording: boolean;
  recording_url?: string;
  peak_listener_count: number;
  total_tips_amount: number;
  total_comments_count: number;
  agora_channel_name?: string;
  agora_token?: string;
  created_at: string;
  updated_at: string;
  
  // Joined data
  creator?: {
    id: string;
    username: string;
    display_name: string;
    avatar_url?: string;
    role: string;
  };
}

export interface LiveSessionParticipant {
  id: string;
  session_id: string;
  user_id: string;
  role: ParticipantRole;
  is_speaking: boolean;
  is_muted: boolean;
  hand_raised: boolean;
  hand_raised_at?: string;
  total_tips_sent: number;
  comments_count: number;
  joined_at: string;
  left_at?: string;
  
  // Joined data
  user?: {
    id: string;
    username: string;
    display_name: string;
    avatar_url?: string;
    role: string;
  };
}

export interface LiveSessionComment {
  id: string;
  session_id: string;
  user_id: string;
  content: string;
  comment_type: CommentType;
  is_pinned: boolean;
  is_deleted: boolean;
  created_at: string;
  
  // Joined data
  user?: {
    id: string;
    username: string;
    display_name: string;
    avatar_url?: string;
  };
}

export interface LiveSessionTip {
  id: string;
  session_id: string;
  tipper_id: string;
  creator_id: string;
  amount: number;
  currency: string;
  platform_fee_percentage: number;
  platform_fee_amount: number;
  creator_amount: number;
  message?: string;
  stripe_payment_intent_id?: string;
  stripe_transfer_id?: string;
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  created_at: string;
  
  // Joined data
  tipper?: {
    id: string;
    username: string;
    display_name: string;
    avatar_url?: string;
  };
}

// Agora Token Response
export interface AgoraTokenResponse {
  success: boolean;
  token?: string;
  channelName?: string;
  uid?: number;
  expiresAt?: string;
  error?: string;
}

// UI State Types
export interface LiveSessionUIState {
  isLoading: boolean;
  isJoining: boolean;
  isInSession: boolean;
  error?: string;
}

export interface ParticipantUIState extends LiveSessionParticipant {
  isSpeaking: boolean; // Real-time speaking indicator from Agora
  volume: number; // Audio volume level (0-100)
}

