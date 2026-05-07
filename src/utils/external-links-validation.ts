/**
 * External Links Validation Utility
 * CRITICAL: Must match web implementation validation rules exactly!
 */

import {
  PLATFORM_METADATA,
  BLOCKED_DOMAINS,
  SUSPICIOUS_PATTERNS,
  MAX_URL_LENGTH,
} from '../config/external-links-config';
import { PlatformType, ValidationResult } from '../types/external-links';

/**
 * Validate an external link URL
 * This function mirrors the web implementation validation logic
 *
 * @param platform - The platform type
 * @param url - The URL to validate
 * @returns ValidationResult with isValid, errors, and sanitizedUrl
 */
export function validateExternalLink(
  platform: PlatformType,
  url: string
): ValidationResult {
  const errors: string[] = [];
  const trimmedUrl = url.trim();

  // 1. Basic URL format check
  let urlObj: URL;
  try {
    urlObj = new URL(trimmedUrl);
  } catch {
    return {
      isValid: false,
      errors: ['Invalid URL format'],
    };
  }

  // 2. Protocol check (HTTP/HTTPS only)
  if (!['http:', 'https:'].includes(urlObj.protocol)) {
    errors.push('URL must use HTTP or HTTPS protocol');
  }

  // 3. HTTPS enforcement for personal websites
  if (platform === 'website' && urlObj.protocol !== 'https:') {
    errors.push('Personal websites must use HTTPS for security');
  }

  // 4. Check blocked platforms
  const hostname = urlObj.hostname.toLowerCase();
  for (const blocked of BLOCKED_DOMAINS) {
    if (hostname.includes(blocked)) {
      errors.push(
        `${blocked} is not supported. SoundBridge is your primary monetization hub.`
      );
      break;
    }
  }

  // 5. Platform-specific regex validation
  const metadata = PLATFORM_METADATA[platform];
  if (!metadata.pattern.test(trimmedUrl)) {
    errors.push(
      `URL does not match expected format for ${metadata.name}. Example: ${metadata.example}`
    );
  }

  // 6. Length check (prevent excessively long URLs)
  if (trimmedUrl.length > MAX_URL_LENGTH) {
    errors.push(`URL must be less than ${MAX_URL_LENGTH} characters`);
  }

  // 7. XSS prevention - check for suspicious patterns
  for (const pattern of SUSPICIOUS_PATTERNS) {
    if (pattern.test(trimmedUrl)) {
      errors.push('URL contains suspicious or unsafe patterns');
      break;
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    sanitizedUrl: errors.length === 0 ? trimmedUrl : undefined,
  };
}

/**
 * Check if user can add more links
 * @param currentLinkCount - Number of existing links
 * @returns true if user can add more links (< 2)
 */
export function canAddMoreLinks(currentLinkCount: number): boolean {
  return currentLinkCount < 2; // Maximum 2 links
}

/**
 * Quick validation for URL format only (for real-time feedback)
 * @param url - The URL to check
 * @returns true if URL has valid format
 */
export function isValidUrlFormat(url: string): boolean {
  try {
    new URL(url.trim());
    return true;
  } catch {
    return false;
  }
}

/**
 * Check if URL contains blocked domain
 * @param url - The URL to check
 * @returns Error message if blocked, null if allowed
 */
export function checkBlockedDomain(url: string): string | null {
  try {
    const urlObj = new URL(url.trim());
    const hostname = urlObj.hostname.toLowerCase();

    for (const blocked of BLOCKED_DOMAINS) {
      if (hostname.includes(blocked)) {
        return `${blocked} is not supported. SoundBridge is your primary monetization hub.`;
      }
    }

    return null;
  } catch {
    return 'Invalid URL format';
  }
}

/**
 * Get user-friendly error message for validation errors
 * @param errors - Array of error messages
 * @returns Single formatted error message
 */
export function formatValidationErrors(errors: string[]): string {
  if (errors.length === 0) return '';
  if (errors.length === 1) return errors[0];
  return `Please fix the following issues:\n${errors.map((e, i) => `${i + 1}. ${e}`).join('\n')}`;
}

/**
 * Extract platform type from URL (best guess)
 * Used for auto-detection when adding links
 * @param url - The URL to analyze
 * @returns Detected platform type or null
 */
export function detectPlatformFromUrl(url: string): PlatformType | null {
  try {
    const urlObj = new URL(url.trim());
    const hostname = urlObj.hostname.toLowerCase();

    if (hostname.includes('instagram.com') || hostname.includes('instagr.am')) {
      return 'instagram';
    }
    if (hostname.includes('youtube.com') || hostname.includes('youtu.be')) {
      return 'youtube';
    }
    if (hostname.includes('spotify.com')) {
      return 'spotify';
    }
    if (hostname.includes('music.apple.com')) {
      return 'apple_music';
    }
    if (hostname.includes('soundcloud.com')) {
      return 'soundcloud';
    }

    return 'website';
  } catch {
    return null;
  }
}
