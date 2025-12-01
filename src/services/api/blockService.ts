import { Session } from '@supabase/supabase-js';
import { supabase } from '../../lib/supabase';
import { apiFetch } from '../../lib/apiClient';
import type {
  BlockResponse,
  UnblockResponse,
  BlockStatus,
  BlockedUsersListResponse,
} from '../../types/block.types';

export class BlockService {
  private baseUrl = '/api/users/block';

  /**
   * Block a user
   */
  async blockUser(
    blockedUserId: string,
    reason?: string,
    session?: Session | null
  ): Promise<BlockResponse> {
    try {
      const currentSession = session || (await supabase.auth.getSession()).data.session;
      if (!currentSession) {
        throw new Error('Authentication required');
      }

      const response = await apiFetch<BlockResponse>(
        this.baseUrl,
        {
          method: 'POST',
          session: currentSession,
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            blockedUserId,
            reason: reason?.trim() || undefined,
          }),
        } as any
      );

      return response;
    } catch (error: any) {
      console.error('BlockService.blockUser:', error);
      
      // Handle specific error cases
      if (error.status === 401) {
        throw new Error('Please log in to block users');
      } else if (error.status === 400) {
        const errorBody = error.body as any;
        if (errorBody?.error?.includes('cannot block yourself')) {
          throw new Error('You cannot block yourself');
        }
        throw new Error(errorBody?.error || 'Invalid request. Please try again.');
      } else if (error.status === 404) {
        throw new Error('User not found');
      } else if (error.status === 409) {
        throw new Error('This user is already blocked');
      } else if (error.status === 500) {
        throw new Error('Something went wrong. Please try again.');
      } else if (error.message) {
        throw error;
      } else {
        throw new Error('Failed to block user. Please try again.');
      }
    }
  }

  /**
   * Unblock a user
   */
  async unblockUser(
    userId: string,
    session?: Session | null
  ): Promise<UnblockResponse> {
    try {
      const currentSession = session || (await supabase.auth.getSession()).data.session;
      if (!currentSession) {
        throw new Error('Authentication required');
      }

      const response = await apiFetch<UnblockResponse>(
        `${this.baseUrl}?userId=${userId}`,
        {
          method: 'DELETE',
          session: currentSession,
        }
      );

      return response;
    } catch (error: any) {
      console.error('BlockService.unblockUser:', error);
      
      if (error.status === 401) {
        throw new Error('Please log in to unblock users');
      } else if (error.status === 400) {
        throw new Error('User ID is required');
      } else if (error.status === 404) {
        throw new Error('This user is not blocked');
      } else if (error.status === 500) {
        throw new Error('Something went wrong. Please try again.');
      } else if (error.message) {
        throw error;
      } else {
        throw new Error('Failed to unblock user. Please try again.');
      }
    }
  }

  /**
   * Check block status between current user and another user
   */
  async checkBlockStatus(
    userId: string,
    session?: Session | null
  ): Promise<BlockStatus> {
    try {
      const currentSession = session || (await supabase.auth.getSession()).data.session;
      if (!currentSession) {
        throw new Error('Authentication required');
      }

      const response = await apiFetch<BlockStatus>(
        `${this.baseUrl}?checkUserId=${userId}`,
        {
          method: 'GET',
          session: currentSession,
        }
      );

      return response;
    } catch (error: any) {
      console.error('BlockService.checkBlockStatus:', error);
      // Return default status on error
      return {
        success: false,
        isBlocked: false,
        isBlockedBy: false,
        isBlocking: false,
      };
    }
  }

  /**
   * Get list of blocked users
   */
  async getBlockedUsers(
    list: 'blocked' | 'blockers' = 'blocked',
    session?: Session | null
  ): Promise<BlockedUsersListResponse> {
    try {
      const currentSession = session || (await supabase.auth.getSession()).data.session;
      if (!currentSession) {
        throw new Error('Authentication required');
      }

      const response = await apiFetch<BlockedUsersListResponse>(
        `${this.baseUrl}?list=${list}`,
        {
          method: 'GET',
          session: currentSession,
        }
      );

      return response;
    } catch (error: any) {
      console.error('BlockService.getBlockedUsers:', error);
      throw new Error('Failed to fetch blocked users');
    }
  }
}

export const blockService = new BlockService();

