/**
 * Service Category Labels Utility
 * 
 * Centralized mapping of service category IDs to user-friendly display labels.
 * This ensures consistency across all screens that display service categories.
 * 
 * Valid categories as per web app team confirmation (WEB_TEAM_SERVICE_CATEGORIES_RESPONSE.md)
 */

import type { ServiceCategory } from '../types';

/**
 * User-friendly display labels for service categories
 */
export const SERVICE_CATEGORY_LABELS: Record<ServiceCategory, string> = {
  sound_engineering: 'Sound Engineering',
  music_lessons: 'Music & Vocal Lessons',
  mixing_mastering: 'Mixing & Mastering',
  session_musician: 'Session Musician',
  photography: 'Photography',
  videography: 'Videography',
  lighting: 'Lighting',
  event_management: 'Event Management',
  other: 'Other',
};

/**
 * Get user-friendly label for a service category
 * Falls back to formatted category name if label not found
 */
export function getServiceCategoryLabel(category: string): string {
  if (category in SERVICE_CATEGORY_LABELS) {
    return SERVICE_CATEGORY_LABELS[category as ServiceCategory];
  }
  // Fallback: format the category name
  return category.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
}

/**
 * Format multiple categories for display (e.g., "Sound Engineering, Music & Vocal Lessons")
 */
export function formatServiceCategories(categories: string[] | null | undefined): string {
  if (!categories || categories.length === 0) {
    return 'Service';
  }
  return categories.map(getServiceCategoryLabel).join(', ');
}

