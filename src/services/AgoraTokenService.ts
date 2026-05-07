/**
 * Agora Token Service
 * Handles token generation from server API
 */

import { supabase } from '../lib/supabase';
import { AgoraTokenResponse } from '../types/liveSession';
import { config } from '../config/environment';

const TOKEN_API_URL = `${config.apiUrl}/live-sessions/generate-token`;

/**
 * Generate Agora token for joining a live session
 * @param sessionId UUID of the live session
 * @param role 'audience' for listeners, 'broadcaster' for speakers/host
 * @returns Token response with token, channelName, uid, and expiry
 */
export async function generateAgoraToken(
  sessionId: string,
  role: 'audience' | 'broadcaster'
): Promise<AgoraTokenResponse> {
  try {
    console.log('🔑 [TOKEN SERVICE] Generating Agora token...', { sessionId, role });
    
    // Get current user's session
    const { data: { session }, error: authError } = await supabase.auth.getSession();
    
    console.log('🔐 [TOKEN SERVICE] Auth check:', { 
      hasSession: !!session, 
      hasAccessToken: !!session?.access_token,
      authError: authError?.message 
    });
    
    if (authError || !session) {
      console.error('❌ [TOKEN SERVICE] User not authenticated:', authError);
      return {
        success: false,
        error: `Authentication failed: ${authError?.message || 'No session found'}`,
      };
    }

    console.log('📡 [TOKEN SERVICE] Calling token API:', TOKEN_API_URL);

    // Call token generation API
    const response = await fetch(TOKEN_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sessionId,
        role,
      }),
    });

    console.log('📥 [TOKEN SERVICE] API response status:', response.status);

    // Check HTTP status before parsing
    if (!response.ok) {
      console.error('❌ [TOKEN SERVICE] Token API HTTP error:', {
        status: response.status,
        statusText: response.statusText,
      });

      // Try to parse error body safely
      let errorMessage = 'Unable to connect to the live session service';
      try {
        const errorData = await response.json();
        if (errorData?.error) errorMessage = errorData.error;
      } catch {
        // Response body was empty or not JSON — use default message
      }

      return {
        success: false,
        error: errorMessage,
      };
    }

    // Parse response safely
    let data: AgoraTokenResponse;
    try {
      data = await response.json();
    } catch {
      console.error('❌ [TOKEN SERVICE] Failed to parse response');
      return {
        success: false,
        error: 'Received an invalid response from the server',
      };
    }

    console.log('📦 [TOKEN SERVICE] API response data:', {
      success: data.success,
      hasToken: !!data.token,
      error: data.error,
    });

    // Handle unsuccessful response
    if (!data.success) {
      console.error('❌ [TOKEN SERVICE] Token generation failed:', data.error);
      return {
        success: false,
        error: data.error || 'Failed to generate token',
      };
    }

    console.log('✅ [TOKEN SERVICE] Token generated successfully!', {
      channelName: data.channelName,
      uid: data.uid,
      expiresAt: data.expiresAt,
    });

    return data;

  } catch (error) {
    console.error('❌ [TOKEN SERVICE] Exception occurred:', error);
    return {
      success: false,
      error: 'Something went wrong while connecting to the live session. Please check your internet connection and try again.',
    };
  }
}

/**
 * Generate token with retry logic
 * @param sessionId UUID of the live session
 * @param role 'audience' or 'broadcaster'
 * @param maxRetries Maximum number of retry attempts
 * @returns Token response
 */
export async function generateAgoraTokenWithRetry(
  sessionId: string,
  role: 'audience' | 'broadcaster',
  maxRetries: number = 3
): Promise<AgoraTokenResponse> {
  let lastError: string | undefined;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    console.log(`🔄 Token generation attempt ${attempt}/${maxRetries}`);
    
    const result = await generateAgoraToken(sessionId, role);
    
    if (result.success) {
      return result;
    }

    lastError = result.error;

    // Don't retry on authentication or permission errors
    if (
      result.error?.includes('authenticated') ||
      result.error?.includes('permission') ||
      result.error?.includes('not found') ||
      result.error?.includes('creator')
    ) {
      console.log('⚠️ Not retrying due to auth/permission error');
      return result;
    }

    // Wait before retry (exponential backoff)
    if (attempt < maxRetries) {
      const delay = Math.pow(2, attempt - 1) * 1000; // 1s, 2s, 4s
      console.log(`⏳ Waiting ${delay}ms before retry...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  return {
    success: false,
    error: lastError || 'Failed after multiple retries',
  };
}

/**
 * Token Manager - Caches and refreshes tokens automatically
 */
export class AgoraTokenManager {
  private token: string | null = null;
  private tokenExpiresAt: Date | null = null;
  private sessionId: string;
  private role: 'audience' | 'broadcaster';
  private channelName: string | null = null;
  private uid: number | null = null;

  constructor(sessionId: string, role: 'audience' | 'broadcaster') {
    this.sessionId = sessionId;
    this.role = role;
  }

  /**
   * Get valid token (generates new one if expired)
   */
  async getToken(): Promise<{ token: string; channelName: string; uid: number }> {
    // Check if token is still valid (refresh 5 minutes before expiry)
    if (this.token && this.tokenExpiresAt && this.channelName && this.uid) {
      const fiveMinutesFromNow = new Date(Date.now() + 5 * 60 * 1000);
      if (this.tokenExpiresAt > fiveMinutesFromNow) {
        console.log('✅ Using cached token');
        return {
          token: this.token,
          channelName: this.channelName,
          uid: this.uid,
        };
      }
    }

    // Generate new token
    console.log('🔄 Token expired or not cached, generating new token...');
    const result = await generateAgoraTokenWithRetry(this.sessionId, this.role);
    
    if (!result.success || !result.token || !result.channelName || !result.uid) {
      throw new Error(result.error || 'Failed to generate token');
    }

    // Cache token
    this.token = result.token;
    this.channelName = result.channelName;
    this.uid = result.uid;
    this.tokenExpiresAt = new Date(result.expiresAt!);

    return {
      token: this.token,
      channelName: this.channelName,
      uid: this.uid,
    };
  }

  /**
   * Force refresh token
   */
  async refreshToken(): Promise<void> {
    console.log('🔄 Force refreshing token...');
    this.token = null; // Clear cache
    await this.getToken();
  }

  /**
   * Clear cached token
   */
  clearCache(): void {
    this.token = null;
    this.channelName = null;
    this.uid = null;
    this.tokenExpiresAt = null;
  }
}

