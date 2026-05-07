/**
 * External Portfolio Links Configuration
 * CRITICAL: Must match web implementation exactly for consistency!
 * Colors, patterns, and validation rules must be identical.
 */

import { PlatformType, PlatformMetadata } from '../types/external-links';

/**
 * Platform metadata with exact colors from web implementation
 * IMPORTANT: These hex colors must match exactly!
 */
export const PLATFORM_METADATA: Record<PlatformType, PlatformMetadata> = {
  instagram: {
    name: 'Instagram',
    icon: 'logo-instagram', // Ionicons name
    pattern: /^https?:\/\/(www\.)?(instagram\.com|instagr\.am)\/.+$/i,
    example: 'https://instagram.com/username',
    color: '#E4405F', // EXACT match with web
  },
  youtube: {
    name: 'YouTube',
    icon: 'logo-youtube',
    pattern: /^https?:\/\/(www\.)?(youtube\.com|youtu\.be)\/.+$/i,
    example: 'https://youtube.com/@username or https://youtu.be/videoId',
    color: '#FF0000', // EXACT match with web
  },
  spotify: {
    name: 'Spotify',
    icon: 'musical-notes',
    pattern: /^https?:\/\/open\.spotify\.com\/(artist|album|track|playlist)\/.+$/i,
    example: 'https://open.spotify.com/artist/...',
    color: '#1DB954', // EXACT match with web
  },
  apple_music: {
    name: 'Apple Music',
    icon: 'musical-notes',
    pattern: /^https?:\/\/music\.apple\.com\/.+$/i,
    example: 'https://music.apple.com/us/artist/...',
    color: '#FA243C', // EXACT match with web
  },
  soundcloud: {
    name: 'SoundCloud',
    icon: 'cloud',
    pattern: /^https?:\/\/(www\.)?soundcloud\.com\/.+$/i,
    example: 'https://soundcloud.com/username',
    color: '#FF5500', // EXACT match with web
  },
  website: {
    name: 'Website',
    icon: 'globe',
    pattern: /^https:\/\/.+\..+$/i, // HTTPS only!
    example: 'https://yourwebsite.com',
    color: '#6B7280', // EXACT match with web
  },
};

/**
 * Blocked platforms (competing monetization platforms)
 * These domains are not allowed as external links
 */
export const BLOCKED_DOMAINS = [
  'tiktok.com',
  'patreon.com',
  'onlyfans.com',
  'twitch.tv',
  'ko-fi.com',
  'buymeacoffee.com',
  'gofundme.com',
  'kickstarter.com',
];

/**
 * Suspicious URL patterns that could indicate XSS or phishing attempts
 */
export const SUSPICIOUS_PATTERNS = [
  /javascript:/i,
  /data:/i,
  /vbscript:/i,
  /<script/i,
  /on\w+=/i, // onclick=, onerror=, etc.
];

/**
 * Maximum number of external links per creator
 */
export const MAX_EXTERNAL_LINKS = 2;

/**
 * Maximum URL length
 */
export const MAX_URL_LENGTH = 500;

/**
 * Get all supported platform types
 */
export function getSupportedPlatforms(): PlatformType[] {
  return Object.keys(PLATFORM_METADATA) as PlatformType[];
}

/**
 * Get platform metadata by type
 */
export function getPlatformMetadata(platform: PlatformType): PlatformMetadata {
  return PLATFORM_METADATA[platform];
}

/**
 * Check if a platform is supported
 */
export function isSupportedPlatform(platform: string): platform is PlatformType {
  return platform in PLATFORM_METADATA;
}
