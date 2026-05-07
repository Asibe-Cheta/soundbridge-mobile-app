/**
 * External Portfolio Links Types
 * Must match web implementation for consistency
 */

export type PlatformType =
  | 'instagram'
  | 'youtube'
  | 'spotify'
  | 'apple_music'
  | 'soundcloud'
  | 'website';

export interface ExternalLink {
  id: string;
  creator_id: string;
  platform_type: PlatformType;
  url: string;
  display_order: number;
  click_count: number;
  created_at: string;
  updated_at: string;
}

export interface PlatformMetadata {
  name: string;
  icon: string;
  pattern: RegExp;
  example: string;
  color: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  sanitizedUrl?: string;
}

export interface ExternalLinksState {
  links: ExternalLink[];
  isLoading: boolean;
  error: string | null;
  canAddMore: boolean;
}

export interface AddLinkRequest {
  platform_type: PlatformType;
  url: string;
  display_order?: number;
}

export interface UpdateLinkRequest {
  url?: string;
  display_order?: number;
}

export interface TrackClickRequest {
  linkId: string;
  sessionId?: string;
  deviceType: 'mobile' | 'tablet';
  platform: 'ios' | 'android';
}

export interface ExternalLinksResponse {
  success: boolean;
  data: {
    links: ExternalLink[];
  };
  error?: string;
}

export interface ExternalLinkResponse {
  success: boolean;
  data: {
    link: ExternalLink;
  };
  error?: string;
}
