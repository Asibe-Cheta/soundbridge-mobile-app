/**
 * Creator Type Labels Utility
 *
 * Centralized mapping of CreatorType IDs to user-friendly display labels
 * and icons, mirroring the pattern in serviceCategoryLabels.ts.
 */

import type { CreatorType } from '../types';

export const CREATOR_TYPE_LABELS: Record<CreatorType, string> = {
  musician: 'Musician',
  podcaster: 'Podcaster',
  dj: 'DJ',
  event_organizer: 'Event Organizer',
  service_provider: 'Service Provider',
  venue_owner: 'Venue Owner',
};

export const CREATOR_TYPE_ICONS: Record<CreatorType, string> = {
  musician: 'musical-notes-outline',
  podcaster: 'mic-outline',
  dj: 'disc-outline',
  event_organizer: 'calendar-outline',
  service_provider: 'briefcase-outline',
  venue_owner: 'business-outline',
};

export function getCreatorTypeLabel(type: string): string {
  if (type in CREATOR_TYPE_LABELS) {
    return CREATOR_TYPE_LABELS[type as CreatorType];
  }
  return type.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
}
