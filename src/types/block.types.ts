export interface BlockResponse {
  success: boolean;
  message: string;
  data: {
    id: string;
    blocker_id: string;
    blocked_id: string;
    reason?: string;
    created_at: string;
  };
}

export interface UnblockResponse {
  success: boolean;
  message: string;
}

export interface BlockStatus {
  success: boolean;
  isBlocked: boolean;
  isBlockedBy: boolean;
  isBlocking: boolean;
  block?: {
    id: string;
    reason?: string;
    created_at: string;
  };
}

export interface BlockedUser {
  id: string;
  reason?: string;
  created_at: string;
  blocked: {
    id: string;
    display_name: string;
    username: string;
    avatar_url?: string;
  };
}

export interface BlockedUsersListResponse {
  success: boolean;
  data: BlockedUser[];
  count: number;
}

