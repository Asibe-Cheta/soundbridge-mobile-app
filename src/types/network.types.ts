export type ConnectionStatus = 'pending' | 'accepted' | 'rejected';

export interface ConnectionRequest {
  id: string;
  from_user_id: string;
  to_user_id: string;
  message?: string;
  status: ConnectionStatus;
  created_at: string;
  from_user: {
    id: string;
    username: string;
    display_name: string;
    avatar_url?: string;
    headline?: string;
  };
}

export interface Connection {
  id: string;
  user_id: string;
  connected_user_id: string;
  connected_at: string;
  user: {
    id: string;
    username: string;
    display_name: string;
    avatar_url?: string;
    headline?: string;
  };
}

export interface ConnectionSuggestion {
  id: string;
  username: string;
  display_name: string;
  avatar_url?: string;
  headline?: string;
  mutual_connections: number;
  reason: string; // e.g., "Works in Gospel Music"
}

