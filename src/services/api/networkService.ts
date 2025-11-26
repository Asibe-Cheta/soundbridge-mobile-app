import { supabase } from '../../lib/supabase';
import { apiFetch } from '../../lib/apiClient';
import {
  Connection,
  ConnectionRequest,
  ConnectionSuggestion,
} from '../../types/network.types';

interface ConnectionsResponse {
  connections: Connection[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    has_more: boolean;
  };
}

interface SuggestionsResponse {
  suggestions: ConnectionSuggestion[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    has_more: boolean;
  };
}

interface RequestsResponse {
  requests: ConnectionRequest[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    has_more: boolean;
  };
}

export class NetworkService {
  /**
   * Get user's connections
   */
  async getConnections(page: number = 1, limit: number = 20): Promise<{
    connections: Connection[];
    hasMore: boolean;
  }> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Not authenticated');
      }

      const response = await apiFetch<ConnectionsResponse>(
        `/api/connections?page=${page}&limit=${limit}`,
        {
          method: 'GET',
          session,
        }
      );

      return {
        connections: response.connections || [],
        hasMore: response.pagination?.has_more || false,
      };
    } catch (error: any) {
      if (error?.status === 404) {
        console.warn('NetworkService.getConnections: API endpoint not available (404)');
        return { connections: [], hasMore: false };
      }
      console.error('NetworkService.getConnections:', error);
      throw error;
    }
  }

  /**
   * Get connection suggestions
   */
  async getSuggestions(page: number = 1, limit: number = 10): Promise<{
    suggestions: ConnectionSuggestion[];
    hasMore: boolean;
  }> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Not authenticated');
      }

      const response = await apiFetch<SuggestionsResponse>(
        `/api/connections/suggestions?page=${page}&limit=${limit}`,
        {
          method: 'GET',
          session,
        }
      );

      return {
        suggestions: response.suggestions || [],
        hasMore: response.pagination?.has_more || false,
      };
    } catch (error: any) {
      if (error?.status === 404) {
        console.warn('NetworkService.getSuggestions: API endpoint not available (404)');
        return { suggestions: [], hasMore: false };
      }
      console.error('NetworkService.getSuggestions:', error);
      throw error;
    }
  }

  /**
   * Get pending connection requests
   */
  async getPendingRequests(page: number = 1, limit: number = 20): Promise<{
    requests: ConnectionRequest[];
    hasMore: boolean;
  }> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Not authenticated');
      }

      const response = await apiFetch<RequestsResponse>(
        `/api/connections/requests/pending?page=${page}&limit=${limit}`,
        {
          method: 'GET',
          session,
        }
      );

      return {
        requests: response.requests || [],
        hasMore: response.pagination?.has_more || false,
      };
    } catch (error: any) {
      if (error?.status === 404) {
        console.warn('NetworkService.getPendingRequests: API endpoint not available (404)');
        return { requests: [], hasMore: false };
      }
      console.error('NetworkService.getPendingRequests:', error);
      throw error;
    }
  }

  /**
   * Send connection request
   */
  async sendConnectionRequest(userId: string, message?: string): Promise<void> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Not authenticated');
      }

      await apiFetch(
        '/api/connections/request',
        {
          method: 'POST',
          session,
          body: JSON.stringify({
            to_user_id: userId,
            message,
          }),
        }
      );
    } catch (error) {
      console.error('NetworkService.sendConnectionRequest:', error);
      throw error;
    }
  }

  /**
   * Accept connection request
   */
  async acceptConnectionRequest(requestId: string): Promise<void> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Not authenticated');
      }

      await apiFetch(
        `/api/connections/requests/${requestId}/accept`,
        {
          method: 'POST',
          session,
        }
      );
    } catch (error) {
      console.error('NetworkService.acceptConnectionRequest:', error);
      throw error;
    }
  }

  /**
   * Decline connection request
   */
  async declineConnectionRequest(requestId: string): Promise<void> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Not authenticated');
      }

      await apiFetch(
        `/api/connections/requests/${requestId}/decline`,
        {
          method: 'POST',
          session,
        }
      );
    } catch (error) {
      console.error('NetworkService.declineConnectionRequest:', error);
      throw error;
    }
  }

  /**
   * Remove connection
   */
  async removeConnection(connectionId: string): Promise<void> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Not authenticated');
      }

      await apiFetch(
        `/api/connections/${connectionId}`,
        {
          method: 'DELETE',
          session,
        }
      );
    } catch (error) {
      console.error('NetworkService.removeConnection:', error);
      throw error;
    }
  }

  /**
   * Dismiss connection suggestion
   */
  async dismissSuggestion(userId: string): Promise<void> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Not authenticated');
      }

      await apiFetch(
        `/api/connections/suggestions/${userId}/dismiss`,
        {
          method: 'POST',
          session,
        }
      );
    } catch (error) {
      console.error('NetworkService.dismissSuggestion:', error);
      throw error;
    }
  }
}

export const networkService = new NetworkService();

