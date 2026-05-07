import { Session } from '@supabase/supabase-js';
import { apiFetch } from '../lib/apiClient';
import { config } from '../config/environment';

const API_BASE_URL = config.apiUrl.replace(/\/api\/?$/, '');

/**
 * Profile Service - Handles all profile-related API calls
 * Implements the web team's profile feature API endpoints
 */
class ProfileService {
  private getAuthHeaders(session: Session) {
    return {
      'Authorization': `Bearer ${session.access_token}`,
      'Content-Type': 'application/json',
    };
  }

  private async makeRequest<T>(
    endpoint: string,
    session: Session,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;
    
    const config: RequestInit = {
      ...options,
      headers: {
        ...this.getAuthHeaders(session),
        ...options.headers,
      },
    };

    console.log(`🔗 ProfileService: ${options.method || 'GET'} ${url}`);
    
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        console.log(`⏰ ProfileService: Request timeout after 10s for ${url}`);
        controller.abort();
      }, 10000);
      
      const response = await fetch(url, {
        ...config,
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      
      const responseText = await response.text();
      console.log(`📡 ProfileService Response (${response.status}):`, responseText);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${responseText}`);
      }
      
      return JSON.parse(responseText);
    } catch (error) {
      console.error(`❌ ProfileService Error for ${url}:`, error);
      throw error;
    }
  }

  /**
   * Get user profile
   * GET /api/profile?user_id={userId}
   */
  async getProfile(userId: string, session: Session): Promise<{
    success: boolean;
    profile: {
      id: string;
      username: string;
      display_name: string;
      avatar_url: string;
      professional_headline?: string;
      location?: string;
      bio?: string;
      website?: string;
      phone?: string;
      genres?: string[];
      experience_level?: string;
    };
  }> {
    return this.makeRequest(`/api/profile?user_id=${userId}`, session);
  }

  /**
   * Update profile
   * POST /api/profile/update
   */
  async updateProfile(
    userId: string,
    updates: {
      display_name?: string;
      username?: string;
      avatar_url?: string;
      location?: string;
      bio?: string;
      genres?: string[];
      website?: string;
      phone?: string;
      experience_level?: string;
      profile_completed?: boolean;
    },
    session: Session
  ): Promise<{ success: boolean; message?: string; error?: string }> {
    return this.makeRequest('/api/profile/update', session, {
      method: 'POST',
      body: JSON.stringify({ userId, ...updates }),
    });
  }

  /**
   * Upload avatar
   * POST /api/upload/avatar
   */
  async uploadAvatar(
    userId: string,
    fileUri: string,
    session: Session
  ): Promise<{ success: boolean; message?: string; avatarUrl?: string; error?: string }> {
    // Create FormData for file upload
    const formData = new FormData();
    formData.append('file', {
      uri: fileUri,
      type: 'image/jpeg',
      name: 'avatar.jpg',
    } as any);
    formData.append('userId', userId);

    const url = `${API_BASE_URL}/api/upload/avatar`;
    
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          // Don't set Content-Type - let fetch set it with boundary for FormData
        },
        body: formData,
      });

      const responseText = await response.text();
      console.log(`📡 Avatar Upload Response (${response.status}):`, responseText);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${responseText}`);
      }

      const result = JSON.parse(responseText);

      // Map 'url' to 'avatarUrl' for consistency with expected interface
      return {
        success: result.success,
        avatarUrl: result.url,
        message: result.message,
        error: result.error,
      };
    } catch (error) {
      console.error(`❌ Avatar Upload Error:`, error);
      throw error;
    }
  }

  /**
   * Get professional headline
   * GET /api/profile/headline
   */
  async getHeadline(session: Session): Promise<{
    success: boolean;
    headline?: string;
  }> {
    return this.makeRequest('/api/profile/headline', session);
  }

  /**
   * Update professional headline
   * PUT /api/profile/headline
   */
  async updateHeadline(
    headline: string,
    session: Session
  ): Promise<{ success: boolean; message?: string; error?: string }> {
    return this.makeRequest('/api/profile/headline', session, {
      method: 'PUT',
      body: JSON.stringify({ headline }),
    });
  }

  /**
   * Get experience entries
   * GET /api/profile/experience?user_id={userId}
   */
  async getExperience(session: Session, userId?: string): Promise<{
    success: boolean;
    experience: Array<{
      id: string;
      user_id: string;
      title: string;
      company?: string;
      description?: string;
      start_date?: string;
      end_date?: string;
      is_current: boolean;
    }>;
  }> {
    const endpoint = userId ? `/api/profile/experience?user_id=${userId}` : '/api/profile/experience';
    const response = await this.makeRequest<any>(endpoint, session);
    const unwrapped = response?.success && response?.data ? response.data : response;
    return {
      success: unwrapped?.success ?? true,
      experience: unwrapped?.experience ?? [],
    };
  }

  /**
   * Add experience entry
   * POST /api/profile/experience
   */
  async addExperience(
    experience: {
      title: string;
      role?: string;
      company?: string;
      description?: string;
      start_date?: string;
      end_date?: string;
      is_current: boolean;
    },
    session: Session
  ): Promise<{ success: boolean; experience?: any; error?: string }> {
    return this.makeRequest('/api/profile/experience', session, {
      method: 'POST',
      body: JSON.stringify(experience),
    });
  }

  /**
   * Delete experience entry
   * DELETE /api/profile/experience
   */
  async deleteExperience(
    experienceId: string,
    session: Session
  ): Promise<{ success: boolean; message?: string; error?: string }> {
    return this.makeRequest('/api/profile/experience', session, {
      method: 'DELETE',
      body: JSON.stringify({ id: experienceId }),
    });
  }

  /**
   * Get skills
   * GET /api/profile/skills?user_id={userId}
   */
  async getSkills(session: Session, userId?: string): Promise<{
    success: boolean;
    skills: string[];
  }> {
    const endpoint = userId ? `/api/profile/skills?user_id=${userId}` : '/api/profile/skills';
    const response = await this.makeRequest<any>(endpoint, session);
    // Unwrap if API wraps response in { success, data: {...} }
    const unwrapped = response?.success && response?.data ? response.data : response;
    const raw: any[] = unwrapped?.skills ?? [];
    // Normalise: API may return strings OR objects like { skill: "..." } or { name: "..." }
    const skills = raw.map((item) => {
      if (typeof item === 'string') return item;
      if (typeof item === 'object' && item !== null) {
        return item.skill ?? item.name ?? item.title ?? String(item);
      }
      return String(item);
    }).filter(Boolean);
    return {
      success: unwrapped?.success ?? skills.length >= 0,
      skills,
    };
  }

  /**
   * Add skill
   * POST /api/profile/skills
   */
  async addSkill(
    skill: string,
    session: Session
  ): Promise<{ success: boolean; message?: string; error?: string }> {
    const response = await this.makeRequest<any>('/api/profile/skills', session, {
      method: 'POST',
      body: JSON.stringify({ skill }),
    });
    const outerSuccess = response?.success === true;
    const unwrapped = outerSuccess && response?.data ? response.data : response;
    return { success: outerSuccess || unwrapped?.success === true, ...unwrapped };
  }

  /**
   * Delete skill
   * DELETE /api/profile/skills
   */
  async deleteSkill(
    skill: string,
    session: Session
  ): Promise<{ success: boolean; message?: string; error?: string }> {
    const response = await this.makeRequest<any>('/api/profile/skills', session, {
      method: 'DELETE',
      body: JSON.stringify({ skill }),
    });
    const outerSuccess = response?.success === true;
    const unwrapped = outerSuccess && response?.data ? response.data : response;
    return { success: outerSuccess || unwrapped?.success === true, ...unwrapped };
  }

  /**
   * Get instruments
   * GET /api/profile/instruments?user_id={userId}
   */
  async getInstruments(session: Session, userId?: string): Promise<{
    success: boolean;
    instruments: string[];
  }> {
    const endpoint = userId ? `/api/profile/instruments?user_id=${userId}` : '/api/profile/instruments';
    const response = await this.makeRequest<any>(endpoint, session);
    const unwrapped = response?.success && response?.data ? response.data : response;
    const raw: any[] = unwrapped?.instruments ?? [];
    const instruments = raw.map((item) => {
      if (typeof item === 'string') return item;
      if (typeof item === 'object' && item !== null) {
        return item.instrument ?? item.name ?? item.title ?? String(item);
      }
      return String(item);
    }).filter(Boolean);
    return {
      success: unwrapped?.success ?? instruments.length >= 0,
      instruments,
    };
  }

  /**
   * Add instrument
   * POST /api/profile/instruments
   */
  async addInstrument(
    instrument: string,
    session: Session
  ): Promise<{ success: boolean; message?: string; error?: string }> {
    const response = await this.makeRequest<any>('/api/profile/instruments', session, {
      method: 'POST',
      body: JSON.stringify({ instrument }),
    });
    const outerSuccess = response?.success === true;
    const unwrapped = outerSuccess && response?.data ? response.data : response;
    return { success: outerSuccess || unwrapped?.success === true, ...unwrapped };
  }

  /**
   * Delete instrument
   * DELETE /api/profile/instruments
   */
  async deleteInstrument(
    instrument: string,
    session: Session
  ): Promise<{ success: boolean; message?: string; error?: string }> {
    const response = await this.makeRequest<any>('/api/profile/instruments', session, {
      method: 'DELETE',
      body: JSON.stringify({ instrument }),
    });
    const outerSuccess = response?.success === true;
    const unwrapped = outerSuccess && response?.data ? response.data : response;
    return { success: outerSuccess || unwrapped?.success === true, ...unwrapped };
  }

  /**
   * Get analytics data
   * GET /api/profile/analytics
   */
  async getAnalytics(session: Session): Promise<{
    success: boolean;
    analytics: {
      stats: {
        totalPlays: number;
        totalLikes: number;
        totalShares: number;
        totalDownloads: number;
        followers: number;
        following: number;
        tracks: number;
        events: number;
      };
      recentTracks: Array<{
        id: string;
        title: string;
        duration: string;
        plays: number;
        likes: number;
        uploadedAt: string;
        coverArt?: string;
      }>;
      recentEvents: Array<{
        id: string;
        title: string;
        date: string;
        attendees: number;
        location: string;
        status: 'upcoming' | 'past' | 'cancelled';
      }>;
      monthlyPlays: number;
      engagementRate: number;
      topGenre: string;
      monthlyPlaysChange: number;
      engagementRateChange: number;
    };
  }> {
    return this.makeRequest('/api/profile/analytics', session);
  }

  /**
   * Update privacy settings
   * PUT /api/profile/privacy
   */
  async updatePrivacy(
    settings: {
      profileVisibility: 'public' | 'private';
      showEmail: boolean;
      allowMessages: boolean;
    },
    session: Session
  ): Promise<{ success: boolean; message?: string; error?: string }> {
    return this.makeRequest('/api/profile/privacy', session, {
      method: 'PUT',
      body: JSON.stringify(settings),
    });
  }

  /**
   * Get followers list
   * GET /api/user/[userId]/followers
   */
  async getFollowers(userId: string, session?: Session): Promise<{
    success: boolean;
    followers: Array<{
      id: string;
      username: string;
      display_name: string;
      avatar_url: string;
      bio: string;
      is_verified: boolean;
      followed_at: string;
      is_following_back: boolean;
    }>;
    count: number;
  }> {
    const url = `${API_BASE_URL}/api/user/${userId}/followers`;
    const headers: Record<string, string> = {};
    
    if (session) {
      headers['Authorization'] = `Bearer ${session.access_token}`;
    }

    const response = await fetch(url, { headers });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    return response.json();
  }

  /**
   * Get following list
   * GET /api/user/[userId]/following
   */
  async getFollowing(userId: string, session?: Session): Promise<{
    success: boolean;
    following: Array<{
      id: string;
      username: string;
      display_name: string;
      avatar_url: string;
      bio: string;
      is_verified: boolean;
      followed_at: string;
    }>;
    count: number;
  }> {
    const url = `${API_BASE_URL}/api/user/${userId}/following`;
    const headers: Record<string, string> = {};
    
    if (session) {
      headers['Authorization'] = `Bearer ${session.access_token}`;
    }

    const response = await fetch(url, { headers });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    return response.json();
  }

  /**
   * Get user tracks
   * GET /api/user/[userId]/tracks
   */
  async getTracks(userId: string, session?: Session): Promise<{
    success: boolean;
    tracks: Array<{
      id: string;
      title: string;
      artist_name: string;
      audio_url: string;
      cover_image_url: string;
      duration: number;
      play_count: number;
      likes_count: number;
      genre: string;
      created_at: string;
      is_liked: boolean;
      is_owner: boolean;
    }>;
    count: number;
  }> {
    const url = `${API_BASE_URL}/api/user/${userId}/tracks`;
    const headers: Record<string, string> = {};
    
    if (session) {
      headers['Authorization'] = `Bearer ${session.access_token}`;
    }

    const response = await fetch(url, { headers });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    return response.json();
  }
}

export const profileService = new ProfileService();

